// Owner: brain-advisor. SERVER-ONLY by placement, but with no SDK import: the provider runners are injected, so tests can
// drive failing or slow "providers" and prove the backup chain and the silent fallback (spec 5.5 rule 11, part 7).
// One advisor turn (spec 5.5, 5.7, A3, A4):
// 1. routeAdvisorMessage(request). A "router" decision is emitted as is, in every mode (rule 1).
// 2. An "open" decision goes to the provider chain (./chain.ts) when some slot is online: gemini-1 → gemini-2 →
//    anthropic, each with its own cooldown. One slot's tool loop (≤ 4 rounds, rule 14), tools run by runTool,
//    state-changing calls turned into offers (5.4), navigation only on an open word (rule 7), the reply checked
//    (rules 8, 9, 17), cards from tool results (rule 10).
// 3. Some slot must produce its first event within 6 s: a fast failure moves to the next slot at once, a slow one gets
//    only its share of that budget. When every slot failed or rested, the decision's `local` events are emitted (rule
//    11). Nothing but status lines is sent before the model's reply has passed the checks, so the fallback never
//    repeats or contradicts a sent answer.
// The generator never throws: its last event is `done` or `error` (or nothing, after a user abort).
import { STATE_CHANGING_TOOLS, isToolName } from "@/lib/ids";
import { TIMEOUTS_MS, LIMITS } from "@/lib/brain/protocol";
import type { AdvisorEvent, AdvisorRequest, BrainMode, ReplySource, ToolParams, ToolResults } from "@/lib/brain/protocol";
import type { AdvisorCard, NavTarget, ToolName } from "@/lib/types";

import { CAREER_TOOL, CAREER_TOOL_STATUS, runCareerTool } from "../advisor/careers";
import { AdvisorCtx } from "../advisor/context";
import { labourFiguresGrounded } from "../advisor/labour";
import { openChip, replyForTool, toEvents, type Reply } from "../advisor/replies";
import { routeAdvisorMessage, type RouterDecision } from "../advisor/router";
import {
  asksHowTo,
  asksToOpen,
  capReplyLength,
  claimsUndoneDeed,
  dialectSlip,
  namesAreGrounded,
  numbersAreGrounded,
  scrubIds,
  userFactsGrounded,
} from "../advisor/rules";
import { THINKING_LINE, TOOL_STATUS } from "../advisor/templates";
import { isToolError, navTargetFromParams, parseToolParams, runTool } from "../advisor/tools";
import { ProviderFailure, liveSlots, recordLocalOnly, runChain, type ChainHooks, type ChainResult, type ChainSlot } from "./chain";
import { TOOL_DECLARATIONS, buildSystemPrompt, snapshotDigest, type ModelRunner, type ModelToolCall } from "./model-common";

export interface TurnDeps {
  /** The configured slots of the chain, in order (product: chainSlots()). The chain skips the resting ones. */
  readonly slots: () => readonly ChainSlot[];
  /** The model runner of one slot, built only when that slot is about to be tried (no client is made otherwise). */
  readonly runner: (slot: ChainSlot) => ModelRunner | null;
  /** Cooldowns, error classes and the reply log (product: CHAIN_HOOKS). */
  readonly hooks: ChainHooks;
  /** Rule 11: some slot's first event (default TIMEOUTS_MS.advisorFirstEvent = 6 s), shared out along the chain. */
  readonly firstEventMs?: number;
  /** The whole model turn (default 9 s); then the local brain answers. */
  readonly turnMs?: number;
  /** One provider call (default 8 s). */
  readonly perCallMs?: number;
}

/** 9 s (was 12 s): the local answer always lands before the panel cuts a stalled request (client ADVISOR_STALL_MS, 10 s). */
const DEFAULT_TURN_MS = 9_000;
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

/** No internal id reaches the user, whoever wrote the text (21 Nov 2026): every text event goes through scrubIds. */
export function scrubEvents(events: readonly AdvisorEvent[]): AdvisorEvent[] {
  return events.map((e) => (e.type === "text" ? { ...e, text: scrubIds(e.text) } : e));
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
  /** get_career results of this turn (run outside runTool): their pay figures are grounded for rule 8. */
  careers: readonly unknown[] = [],
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

  const text = capReplyLength(scrubIds(rawText.trim()));
  const emitted = action ? ["navigate"] : [];
  const results = [snapshotDigest(ctx), ...calls.map((c) => c.result), ...careers];
  // Rule 8 (numbers), and since 21 Nov 2026: every Latin name (certificate, exam, company, tool) is in the app's data or
  // this turn's results, and nothing is said about the user (experience, a degree) that the snapshot does not hold.
  // Saudization / labour law: each rate, day count and riyal figure is that topic's own (a 30% elsewhere in the data does
  // not ground «التوطين في المحاسبة 30%»); and the reply stays in Najdi (no Persian / Fusha slip).
  const grounded =
    numbersAreGrounded(text, results, ctx.facts) &&
    namesAreGrounded(text, [...results, ctx.facts]) &&
    userFactsGrounded(text, ctx.facts) &&
    labourFiguresGrounded(text, message) &&
    !dialectSlip(text, results);
  if (text === "" || !grounded || claimsUndoneDeed(text, emitted)) {
    // Rules 8 and 9: not regenerated; the template for the tool that was called is sent at once.
    const last = [...calls].reverse().find((c) => c.name !== "navigate");
    const template = last ? replyForTool(ctx, last.name, last.params, last.result) : null;
    if (template) return toEvents({ ...withoutStatus(template), ...(action ? { action } : {}) });
    const localEvents = local.filter((e) => e.type !== "status");
    return action ? [{ type: "action", action }, ...localEvents.filter((e) => e.type !== "action")] : localEvents;
  }

  const cards = cardsOf(calls);
  return toEvents({
    tools: [],
    ...(action ? { action } : {}),
    text: [text],
    cards,
    chips: droppedNav ? [openChip(droppedNav)] : [],
  });
}

export async function* runTurn(request: AdvisorRequest, signal: AbortSignal, deps: TurnDeps): AsyncGenerator<AdvisorEvent> {
  let decision: RouterDecision;
  try {
    decision = routeAdvisorMessage(request);
  } catch (error) {
    console.error("[brain] router failed", error);
    yield { type: "error", code: "brain_failed" };
    return;
  }

  const slots = deps.slots();
  const online = liveSlots(slots, deps.hooks.coolingDown).live.length > 0;
  const mode: BrainMode = online ? "online" : "local";
  if (decision.kind === "router") {
    yield* scrubEvents(decision.events);
    yield done(mode, "router");
    return;
  }

  if (!online) {
    recordLocalOnly("advisor", slots, deps.hooks);
    yield* scrubEvents(decision.local);
    yield done("local", "local");
    return;
  }

  // ── A model turn, along the chain ───────────────────────────────────────────────────────────────────────────────
  yield { type: "status", tool: null, text: THINKING_LINE };

  const ctx = AdvisorCtx.of(request);
  const queue: AdvisorEvent[] = [];
  // The tool calls of the slot being tried; a slot that takes over starts from an empty list (its cards, its numbers).
  const calls: CallRecord[] = [];
  // get_career results (read-only knowledge, no card, no action): only their numbers count for rule 8.
  const careers: unknown[] = [];
  let current = -1;
  const state: { outcome: ChainResult<string> | null; wake: (() => void) | null } = { outcome: null, wake: null };
  const push = (event: AdvisorEvent): void => {
    queue.push(event);
    state.wake?.();
  };

  // Aborted by «إيقاف», or when the browser goes away mid-turn (the finally below): releases the provider call.
  const chain = new AbortController();
  const onUserAbort = (): void => chain.abort();
  signal.addEventListener("abort", onUserAbort, { once: true });

  const toolCallFor =
    (index: number, attemptSignal: AbortSignal) =>
    (call: ModelToolCall): unknown => {
      // A slot that was cut off (its share ran out, or the next slot took over) adds nothing: no status line, no card.
      if (index !== current || attemptSignal.aborted) return { error: "not_allowed", detail: "this attempt has ended" };
      if (calls.length + careers.length >= MAX_TOOL_CALLS) return { error: "not_allowed", detail: "too many tool calls" };
      if (call.name === CAREER_TOOL) {
        const career = runCareerTool(call.args);
        if (isToolError(career)) return career;
        push({ type: "status", tool: null, text: CAREER_TOOL_STATUS });
        careers.push(career);
        return career;
      }
      if (!isToolName(call.name)) return { error: "not_allowed", detail: `unknown tool ${call.name}` };
      const name = call.name;
      const params = parseToolParams(name, call.args);
      if (isToolError(params)) return params;
      push({ type: "status", tool: name, text: TOOL_STATUS[name] });
      const result = runTool(name, params, { facts: ctx.facts, clock: ctx.clock, page: ctx.page });
      if (!isToolError(result)) calls.push({ name, params, result });
      return result;
    };

  const system = buildSystemPrompt(ctx);
  runChain<string>({
    task: "advisor",
    slots,
    signal: chain.signal,
    firstEventMs: deps.firstEventMs ?? TIMEOUTS_MS.advisorFirstEvent,
    totalMs: deps.turnMs ?? DEFAULT_TURN_MS,
    hooks: deps.hooks,
    attempt: (slot, attempt) => {
      const run = deps.runner(slot);
      if (!run) return Promise.reject(new ProviderFailure("auth", `${slot.id}: no client`));
      current = attempt.index;
      calls.length = 0;
      careers.length = 0;
      return run({
        system,
        history: request.history,
        message: request.message.text,
        tools: TOOL_DECLARATIONS,
        signal: attempt.signal,
        perCallTimeoutMs: deps.perCallMs ?? DEFAULT_PER_CALL_MS,
        maxRounds: LIMITS.toolRounds,
        onFirstEvent: attempt.firstEvent,
        onToolCall: toolCallFor(attempt.index, attempt.signal),
      });
    },
  }).then(
    (result) => {
      state.outcome = result;
      state.wake?.();
    },
    (error: unknown) => {
      // runChain does not throw; this keeps the turn alive if it ever did.
      console.error("[brain] provider chain failed", error);
      state.outcome = { ok: false, aborted: false, ms: 0, misses: [] };
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
    signal.removeEventListener("abort", onUserAbort);
    if (!state.outcome) chain.abort(); // the browser went away mid-turn: release the provider call
  }

  const outcome = state.outcome;
  if (!outcome) return;
  current = -1; // a slot still running after the chain moved on can add nothing now
  if (!outcome.ok) {
    if (outcome.aborted || signal.aborted) return; // «إيقاف»: what arrived stays; nothing more is sent
    yield* scrubEvents(decision.local);
    yield done("local", "local");
    return;
  }

  let events: AdvisorEvent[];
  try {
    events = finishModelReply(ctx, request.message.text, outcome.value, calls, decision.local, careers);
  } catch (error) {
    console.error("[brain] model reply could not be checked", error);
    events = [...decision.local];
  }
  yield* scrubEvents(events);
  yield done("online", outcome.slot.provider);
}
