// Owner: brain-advisor. SERVER-ONLY by placement, but with no SDK import: the provider runner is injected, so tests can
// drive a failing or slow "provider" and prove the silent fallback (spec 5.5 rule 11).
// One advisor turn (spec 5.5, 5.7, A3, A4):
// 1. routeAdvisorMessage(request). A "router" decision is emitted as is, in every mode (rule 1).
// 2. An "open" decision goes to the provider when the brain is online: the tool loop (≤ 4 rounds, rule 14), tools run by
//    runTool, state-changing calls turned into offers (5.4), navigation only on an open word (rule 7), the reply checked
//    (rules 8, 9, 17), cards from tool results (rule 10).
// 3. The provider must produce its first event within 2.5 s; on a timeout, an error, a refusal or an empty reply the
//    decision's `local` events are emitted and the cooldown starts (rule 11). Nothing but status lines is sent before
//    the model's reply has passed the checks, so the fallback never repeats or contradicts a sent answer.
// The generator never throws: its last event is `done` or `error` (or nothing, after a user abort).
import { STATE_CHANGING_TOOLS, isToolName } from "@/lib/ids";
import { TIMEOUTS_MS, LIMITS } from "@/lib/brain/protocol";
import type { AdvisorEvent, AdvisorRequest, BrainMode, BrainStatus, ProviderName, ReplySource, ToolParams, ToolResults } from "@/lib/brain/protocol";
import type { AdvisorCard, NavTarget, ToolName } from "@/lib/types";

import { AdvisorCtx } from "../advisor/context";
import { openChip, replyForTool, toEvents, type Reply } from "../advisor/replies";
import { routeAdvisorMessage, type RouterDecision } from "../advisor/router";
import { asksHowTo, asksToOpen, capReplyLength, claimsUndoneDeed, numbersAreGrounded } from "../advisor/rules";
import { DISCLOSE_JOBS, THINKING_LINE, TOOL_STATUS } from "../advisor/templates";
import { isToolError, navTargetFromParams, parseToolParams, runTool } from "../advisor/tools";
import { TOOL_DECLARATIONS, buildSystemPrompt, snapshotDigest, type ModelRunner, type ModelToolCall } from "./model-common";
import type { BrainFailure } from "./provider";

export interface TurnDeps {
  /** The brain status now (configured, provider, mode with the cooldown). */
  readonly status: () => BrainStatus;
  /** The provider runner, built only when a model turn is about to run (never in local mode: no client is made). */
  readonly runner: () => { readonly provider: ProviderName; readonly run: ModelRunner } | null;
  readonly markFailure: (failure: BrainFailure) => void;
  readonly classify: (error: unknown, signal: AbortSignal) => BrainFailure;
  /** Rule 11: the provider's first event (default TIMEOUTS_MS.advisorFirstEvent = 2.5 s). */
  readonly firstEventMs?: number;
  /** The whole model turn (default 12 s); then the local brain answers. */
  readonly turnMs?: number;
  /** One provider call (default 8 s). */
  readonly perCallMs?: number;
}

const DEFAULT_TURN_MS = 12_000;
const DEFAULT_PER_CALL_MS = 8_000;
/** More tool calls than this in one turn is a runaway loop: stop feeding results. */
const MAX_TOOL_CALLS = 8;

function done(mode: BrainMode, source: ReplySource): AdvisorEvent {
  return { type: "done", mode, source };
}

interface CallRecord {
  readonly name: ToolName;
  readonly params: ToolParams[ToolName];
  readonly result: ToolResults[ToolName];
}

function jobsTarget(params: ToolParams["search_jobs"]): NavTarget {
  return {
    screen: "jobs",
    ...(params.query ? { q: params.query } : {}),
    ...(params.city ? { city: params.city } : {}),
    ...(params.field ? { field: params.field } : {}),
    ...(params.skill ? { skill: params.skill } : {}),
  };
}

/** The pages a model's calls would open, in order (navigate, and search_jobs with show). */
function navigationsOf(calls: readonly CallRecord[]): NavTarget[] {
  const out: NavTarget[] = [];
  for (const call of calls) {
    if (call.name === "navigate") {
      const target = navTargetFromParams(call.params as ToolParams["navigate"]);
      if (!isToolError(target)) out.push(target);
    } else if (call.name === "search_jobs") {
      const params = call.params as ToolParams["search_jobs"];
      const result = call.result as ToolResults["search_jobs"];
      if (params.show && result.total > 0) out.push(jobsTarget(params));
    }
  }
  return out;
}

/** Cards from tool results (rule 10; spec 5.3 "What the user sees"), deduplicated, at most six. */
function cardsOf(calls: readonly CallRecord[]): AdvisorCard[] {
  const cards: AdvisorCard[] = [];
  const seen = new Set<string>();
  const add = (card: AdvisorCard, key: string): void => {
    if (seen.has(key) || cards.length >= 6) return;
    seen.add(key);
    cards.push(card);
  };
  for (const call of calls) {
    switch (call.name) {
      case "search_jobs":
        for (const job of (call.result as ToolResults["search_jobs"]).jobs.slice(0, 5)) add({ kind: "job", jobId: job.id }, `job:${job.id}`);
        break;
      case "get_job_gap": {
        const jobId = (call.result as ToolResults["get_job_gap"]).jobId;
        add({ kind: "gap", jobId }, `gap:${jobId}`);
        break;
      }
      case "recommend_next_step":
        add({ kind: "next-step" }, "next-step");
        break;
      case "list_courses":
        for (const course of (call.result as ToolResults["list_courses"]).courses.slice(0, 5)) {
          add({ kind: "course", courseId: course.id }, `course:${course.id}`);
        }
        break;
      case "get_course": {
        const courseId = (call.result as ToolResults["get_course"]).id;
        add({ kind: "course", courseId }, `course:${courseId}`);
        break;
      }
      case "list_applications":
        for (const app of (call.result as ToolResults["list_applications"]).applications) {
          add({ kind: "application", jobId: app.job_id }, `application:${app.job_id}`);
        }
        break;
      default:
        break;
    }
  }
  return cards;
}

function withoutStatus(r: Reply): Reply {
  return { ...r, tools: [] };
}

/**
 * The events of a model turn that finished with `rawText` (status lines were already sent). Applies rules 5.4 (offers),
 * 7 (navigation asked for), 8 (numbers grounded), 9 (no done-claim), 10 (cards from data), 17 (length) and the first
 * sample-data sentence (5.1).
 */
export function finishModelReply(
  ctx: AdvisorCtx,
  message: string,
  rawText: string,
  calls: readonly CallRecord[],
  local: readonly AdvisorEvent[],
): AdvisorEvent[] {
  // Rule 7: a page opens only when the message asks to open something, and never while a sheet is open or a show runs.
  const nav = navigationsOf(calls)[0] ?? null;
  // …or when it asks how / where to do something (the guide: the page where it is done opens with the answer)
  const action = nav && (asksToOpen(message) || asksHowTo(message)) && !ctx.blocked ? ({ type: "navigate", to: nav } as const) : undefined;
  const droppedNav = nav && !action ? nav : null;

  // 5.4: in a model turn the three state-changing tools never execute; the first such call becomes an offer.
  const stateCall = calls.find((c) => (STATE_CHANGING_TOOLS as readonly string[]).includes(c.name));
  if (stateCall) {
    const offer = replyForTool(ctx, stateCall.name, stateCall.params, stateCall.result);
    if (offer) return toEvents({ ...withoutStatus(offer), ...(action ? { action } : {}) });
  }

  const text = capReplyLength(rawText.trim());
  const emitted = action ? ["navigate"] : [];
  const grounded = numbersAreGrounded(text, [snapshotDigest(ctx), ...calls.map((c) => c.result)], ctx.facts);
  if (text === "" || !grounded || claimsUndoneDeed(text, emitted)) {
    // Rules 8 and 9: not regenerated; the template for the tool that was called is sent at once.
    const last = [...calls].reverse().find((c) => c.name !== "navigate");
    const template = last ? replyForTool(ctx, last.name, last.params, last.result) : null;
    if (template) return toEvents({ ...withoutStatus(template), ...(action ? { action } : {}) });
    const localEvents = local.filter((e) => e.type !== "status");
    return action ? [{ type: "action", action }, ...localEvents.filter((e) => e.type !== "action")] : localEvents;
  }

  const cards = cardsOf(calls);
  const disclose = !ctx.jobsDisclosed && cards.some((c) => c.kind === "job") && !text.includes("تجريبي");
  const paragraph = disclose ? `${text} ${DISCLOSE_JOBS}` : text;
  return toEvents({
    tools: [],
    ...(action ? { action } : {}),
    text: [paragraph],
    cards,
    chips: droppedNav ? [openChip(droppedNav)] : [],
  });
}

type Outcome = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly error: unknown };

export async function* runTurn(request: AdvisorRequest, signal: AbortSignal, deps: TurnDeps): AsyncGenerator<AdvisorEvent> {
  let decision: RouterDecision;
  try {
    decision = routeAdvisorMessage(request);
  } catch (error) {
    console.error("[brain] router failed", error);
    yield { type: "error", code: "brain_failed" };
    return;
  }

  const status = deps.status();
  if (decision.kind === "router") {
    yield* decision.events;
    yield done(status.mode, "router");
    return;
  }

  const runner = status.mode === "online" ? deps.runner() : null;
  if (!runner) {
    yield* decision.local;
    yield done(status.mode, "local");
    return;
  }

  // ── A model turn ────────────────────────────────────────────────────────────────────────────────────────────────
  yield { type: "status", tool: null, text: THINKING_LINE };

  const ctx = AdvisorCtx.of(request);
  const queue: AdvisorEvent[] = [];
  const calls: CallRecord[] = [];
  const state: { outcome: Outcome | null; wake: (() => void) | null; first: boolean; deadline: "first" | "turn" | null } = {
    outcome: null,
    wake: null,
    first: false,
    deadline: null,
  };
  const push = (event: AdvisorEvent): void => {
    queue.push(event);
    state.wake?.();
  };

  const controller = new AbortController();
  const onUserAbort = (): void => controller.abort();
  signal.addEventListener("abort", onUserAbort, { once: true });
  const firstTimer = setTimeout(() => {
    if (!state.first) {
      state.deadline = "first";
      controller.abort();
    }
  }, deps.firstEventMs ?? TIMEOUTS_MS.advisorFirstEvent);
  const turnTimer = setTimeout(() => {
    state.deadline ??= "turn";
    controller.abort();
  }, deps.turnMs ?? DEFAULT_TURN_MS);

  const onToolCall = (call: ModelToolCall): unknown => {
    if (calls.length >= MAX_TOOL_CALLS) return { error: "not_allowed", detail: "too many tool calls" };
    if (!isToolName(call.name)) return { error: "not_allowed", detail: `unknown tool ${call.name}` };
    const name = call.name;
    const params = parseToolParams(name, call.args);
    if (isToolError(params)) return params;
    push({ type: "status", tool: name, text: TOOL_STATUS[name] });
    const result = runTool(name, params, { facts: ctx.facts, clock: ctx.clock, page: ctx.page });
    if (!isToolError(result)) calls.push({ name, params, result });
    return result;
  };

  let run: Promise<string>;
  try {
    run = runner.run({
      system: buildSystemPrompt(ctx),
      history: request.history,
      message: request.message.text,
      tools: TOOL_DECLARATIONS,
      signal: controller.signal,
      perCallTimeoutMs: deps.perCallMs ?? DEFAULT_PER_CALL_MS,
      maxRounds: LIMITS.toolRounds,
      onFirstEvent: () => {
        state.first = true;
        clearTimeout(firstTimer);
      },
      onToolCall,
    });
  } catch (error) {
    run = Promise.reject(error);
  }
  run.then(
    (text) => {
      state.outcome = { ok: true, text };
      state.wake?.();
    },
    (error: unknown) => {
      state.outcome = { ok: false, error };
      state.wake?.();
    },
  );

  try {
    for (;;) {
      while (queue.length > 0) {
        const event = queue.shift();
        if (event) yield event;
      }
      if (state.outcome) break;
      await new Promise<void>((resolve) => {
        state.wake = resolve;
      });
      state.wake = null;
    }
  } finally {
    clearTimeout(firstTimer);
    clearTimeout(turnTimer);
    signal.removeEventListener("abort", onUserAbort);
    if (!state.outcome) controller.abort(); // the browser went away mid-turn: release the provider call
  }

  const outcome = state.outcome;
  if (!outcome) return;
  if (!outcome.ok) {
    if (signal.aborted) return; // «إيقاف»: what arrived stays; nothing more is sent
    const failure: BrainFailure = state.deadline ? "timeout" : deps.classify(outcome.error, signal);
    deps.markFailure(failure === "aborted" ? "timeout" : failure);
    yield* decision.local;
    yield done("local", "local");
    return;
  }

  let events: AdvisorEvent[];
  try {
    events = finishModelReply(ctx, request.message.text, outcome.text, calls, decision.local);
  } catch (error) {
    console.error("[brain] model reply could not be checked", error);
    events = [...decision.local];
  }
  yield* events;
  yield done("online", runner.provider);
}
