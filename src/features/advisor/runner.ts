// Owner: advisor. The turn runner (ARCHITECTURE 9.1): one plain async function per message, holding its AbortController
// at module level. It writes to the stores and keeps going whatever mounts or unmounts (React Strict Mode runs effect
// cleanups on mount, so no cleanup may abort a turn); only «إيقاف» does.
//
// One turn: the user's bubble → «دليلك يفكّر…» → the status lines roll as the server names its tools → an `action`, if
// any, goes to the dispatcher and EVERY later event waits until the site has responded (5.5 rule 12, page-handoff) →
// the reply comes into focus: the receipt of what was done, the words, the cards, the chips.
import {
  THINKING_LINE,
  firstOpenMessage,
  applyAlreadyReply,
  applyInterruptedLine,
  applySentReply,
  applyStatusLine,
  applyStoppedLine,
  blockedActionReply,
  replyFailedLine,
  startCourseRefusedLine,
} from "@/lib/brain/advisor";
import { streamAdvisor } from "@/lib/brain/client";
import { LIMITS, PROTOCOL_VERSION, type AdvisorAction, type AdvisorRequest, type ProtocolMessage } from "@/lib/brain/protocol";
import { getJob } from "@/lib/data";
import { applicationStatus, makeClock } from "@/lib/engine";
import { sleep } from "@/lib/motion";
import { factsOf, selectCurrentUser, useAppStore, useUi } from "@/lib/store";
import type { AdvisorCard, AdvisorMessage, AdvisorOutgoing, Chip, Clock, CourseId, JobId, UserFacts } from "@/lib/types";

import { dispatchAction, type DispatchOutcome } from "./dispatcher";
import { useLive } from "./live";
import { pageContextNow } from "./page-context";
import { baseId, receiptFor, withReceipt, type ReceiptRef } from "./receipts";

// ── wiring from React (set by AdvisorRoot) ─────────────────────────────────────────────────────────────────────────

let navigator: ((href: string) => void) | null = null;

/** AdvisorRoot hands its useGo() here, so the dispatcher can move the page with the route transition. */
export function registerNavigator(go: (href: string) => void): () => void {
  navigator = go;
  return () => {
    if (navigator === go) navigator = null;
  };
}

function go(href: string): void {
  if (navigator) navigator(href);
  else window.location.assign(href);
}

const isPhoneNow = () => !window.matchMedia("(min-width: 1024px)").matches;
const instantNow = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.still !== undefined;

// ── ids ────────────────────────────────────────────────────────────────────────────────────────────────────────────

let seq = 0;
/** A thread message id (a handler, so the time is allowed): `u-…` for the user, `d-…` for «دليلك». */
export function messageId(prefix: "u" | "d"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

/** «أهلاً من جديد يا {name}…» when the thread is empty (first open after onboarding, and after «محادثة جديدة»). The store
 *  is read inside, so a second call (Strict Mode's second effect, or a turn that starts first) appends nothing. */
export function greetIfEmpty(): void {
  const app = useAppStore.getState();
  const user = selectCurrentUser(app);
  if (!user || user.advisor.messages.length > 0 || useLive.getState().turn !== null) return;
  app.appendAdvisorMessages([{ id: messageId("d"), from: "daleel", at: Date.now(), blocks: [firstOpenMessage(factsOf(user))], cards: [], chips: [] }]);
}

// ── pacing: the glyph and the status line are seen, never longer than the work needs ───────────────────────────────

/** «دليلك يفكّر…» stays at least this long before the first tool line rolls in. */
const FIRST_LINE_MS = 420;
/** Each tool line stays at least this long (the roll itself is 420 ms). */
const TOOL_LINE_MS = 560;
/**
 * An action's own line («أفتح الصفحة…», «أفتح نموذج التقديم…») is not held for its reading time before the page moves:
 * it IS the action's first step (7.4 step 1: the job page and the sheet open inside its 0.5 s) and it stays on screen
 * while the page responds. The page starts moving once the line is seen rolling in.
 */
const ACTION_LINE_MS = 140;
/** Phones: the sheet comes back (200 ms) before the reply comes into focus in it. */
const SHEET_BACK_MS = 260;

function pacer(instant: boolean) {
  let shownAt = performance.now();
  let thinking = true;
  let min = instant ? 0 : FIRST_LINE_MS;
  const until = async (ms: number) => {
    const wait = shownAt + ms - performance.now();
    if (wait > 0) await sleep(wait);
  };
  return {
    /** Before a new status line: the current one has been seen. */
    async next() {
      await until(min);
      shownAt = performance.now();
      thinking = false;
      min = instant ? 0 : TOOL_LINE_MS;
    },
    /** Before the action: «دليلك يفكّر…» has been seen; a tool line (the action's own) only has to be rolling in. */
    async act() {
      await until(thinking ? min : Math.min(min, instant ? 0 : ACTION_LINE_MS));
      min = 0;
    },
    /** Before the reply: the current line has been seen. */
    async settle() {
      await until(min);
      min = 0;
    },
  };
}

// ── building the request (spec 5.2) ────────────────────────────────────────────────────────────────────────────────

function toProtocol(message: AdvisorMessage): ProtocolMessage {
  return { role: message.from, text: message.blocks.join("\n\n").slice(0, 2_000) };
}

function lastCardIds(messages: readonly AdvisorMessage[]): { jobs: JobId[]; courses: CourseId[] } {
  const newest = [...messages].reverse().find((m) => m.from === "daleel");
  const jobs: JobId[] = [];
  const courses: CourseId[] = [];
  for (const card of newest?.cards ?? []) {
    if (card.kind === "course") courses.push(card.courseId);
    else if (card.kind !== "next-step" && !jobs.includes(card.jobId)) jobs.push(card.jobId);
  }
  return { jobs, courses };
}

// ── the outcome templates (ARCHITECTURE 9.1 step 3) ────────────────────────────────────────────────────────────────

const OPEN_APPLICATIONS: Chip = {
  slug: "open-applications",
  label: "افتح طلباتي",
  role: "chip",
  payload: { intent: "open", to: { screen: "applications" } },
};

function refusedReply(outcome: Extract<DispatchOutcome, { ok: false }>, action: AdvisorAction, facts: UserFacts, clock: Clock): { text: string; chips: readonly Chip[] } {
  switch (outcome.reason) {
    case "stopped":
      return { text: applyStoppedLine(), chips: [] };
    case "interrupted":
      return { text: applyInterruptedLine(), chips: [] };
    case "blocked":
      return blockedActionReply(action, facts);
    case "already_applied": {
      const jobId = action.type === "apply" ? action.jobId : null;
      const app = jobId ? facts.applications.find((a) => a.jobId === jobId) : undefined;
      return { text: applyAlreadyReply(app ? applicationStatus(app, clock.now) : "sent", jobId !== null && getJob(jobId).real), chips: [OPEN_APPLICATIONS] };
    }
    case "locked":
    case "credited":
    case "completed":
      return action.type === "start_course"
        ? { text: startCourseRefusedLine(outcome.reason, action.courseId, facts), chips: [] }
        : { text: replyFailedLine(), chips: [] };
    case "no_user":
      return { text: replyFailedLine(), chips: [] };
  }
}

// ── the turn ───────────────────────────────────────────────────────────────────────────────────────────────────────

let controller: AbortController | null = null;

/** Sends a message (typed, a chip or a page button) as the user. Ignored while «دليلك» is busy (5.5 rule 13). */
export function sendMessage(outgoing: AdvisorOutgoing): void {
  void runTurn(outgoing, { bubble: true, claimed: false });
}

/** «أعد المحاولة»: the same message again, without a second bubble. */
export function retryMessage(noteId: string, outgoing: AdvisorOutgoing): void {
  void noteId; // the error row is dropped when the turn starts
  void runTurn(outgoing, { bubble: false, claimed: false });
}

/** Resolves once the panel has arrived (its motion state is "entered"), or after a cap. */
async function panelIn(): Promise<void> {
  const t0 = performance.now();
  while (performance.now() - t0 < 1_500) {
    if (document.querySelector("[data-testid=advisor-panel][data-entered]")) return;
    await sleep(30);
  }
}

/** A page button asked (useUi.advisorRequest): mark busy at once (its buttons disable), then, once the panel is in, the
 *  user's bubble pops from the composer and the turn runs. */
export function sendRequest(outgoing: AdvisorOutgoing, settleMs: number): void {
  const ui = useUi.getState();
  if (ui.advisorBusy || useLive.getState().turn !== null) return;
  ui.setAdvisorBusy(true);
  void (async () => {
    await panelIn();
    await sleep(settleMs);
    await runTurn(outgoing, { bubble: true, claimed: true });
  })();
}

/** «إيقاف». During «دليلك»'s application it is the sheet's «إيقاف» (7.4); a page already changing cannot be stopped. */
export function stopTurn(): void {
  const ui = useUi.getState();
  const run = ui.applyRun;
  if (run !== null && run.result === null) {
    ui.requestApplyStop();
    return;
  }
  if (useLive.getState().turn?.acting) return;
  controller?.abort();
}

/** An account change or a seed: whatever was in flight belongs to someone else now. */
export function abandonTurn(): void {
  controller?.abort();
  controller = null;
  useLive.getState().reset();
}

async function runTurn(outgoing: AdvisorOutgoing, opts: { bubble: boolean; claimed: boolean }): Promise<void> {
  const ui = useUi.getState();
  const live = useLive.getState();
  if (live.turn !== null || (!opts.claimed && ui.advisorBusy)) return;
  const user = selectCurrentUser(useAppStore.getState());
  const text = outgoing.text.trim().slice(0, LIMITS.advisorMessageChars);
  if (user === null || text === "") {
    if (opts.claimed) ui.setAdvisorBusy(false);
    return;
  }
  ui.setAdvisorBusy(true);
  live.dropErrors();

  const instant = instantNow();
  const isPhone = isPhoneNow();
  const clock = makeClock();
  const messages = user.advisor.messages;
  // a retry resends the last user message: it is the message, not history
  const lastUser = messages.findLastIndex((m) => m.from === "user");
  const prior = opts.bubble || lastUser < 0 ? messages : messages.slice(0, lastUser);
  const cards = lastCardIds(prior);
  const request: AdvisorRequest = {
    v: PROTOCOL_VERSION,
    message: outgoing.chip ? { text, chip: outgoing.chip } : { text },
    history: prior.slice(-LIMITS.historyMessages).map(toProtocol),
    facts: factsOf(user),
    clock,
    page: pageContextNow(ui),
    thread: { jobsDisclosed: user.advisor.jobsDisclosed, lastJobIds: cards.jobs, lastCourseIds: cards.courses },
  };

  let userKey = lastUser >= 0 ? baseId(messages[lastUser]?.id ?? "") : "";
  if (opts.bubble) {
    greetIfEmpty(); // a page button opened an empty thread: «دليلك» greets before the request
    userKey = messageId("u");
    useAppStore.getState().appendAdvisorMessages([{ id: userKey, from: "user", at: clock.now, blocks: [text], cards: [], chips: [] }]);
  }

  const id = messageId("d");
  live.start({ id, startedAt: Date.now(), status: THINKING_LINE, activity: "thinking" });
  const ctl = new AbortController();
  controller = ctl;
  const pace = pacer(instant);

  const blocks: string[] = [];
  const replyCards: AdvisorCard[] = [];
  let chips: readonly Chip[] = [];
  let receipt: ReceiptRef | null = null;
  /** A client template that replaces the held events (the action was refused or stopped, or the record differs). */
  let replaced: { text: string; chips?: readonly Chip[]; keepCards: boolean } | null = null;
  let acted = false;
  let closedPanel = false;
  let end: "done" | "error" | "stopped" | null = null;

  try {
    for await (const event of streamAdvisor(request, ctl.signal)) {
      // «إيقاف»: the reader may still hold lines it already received, so the signal is checked between events too
      if (ctl.signal.aborted && !acted) break;
      if (event.type === "status") {
        if (acted) continue;
        await pace.next();
        if (ctl.signal.aborted) break;
        useLive.getState().setStatus(event.text, event.tool ? "working" : "thinking");
      } else if (event.type === "action") {
        if (acted) continue; // one state change per message (5.5 rule 3); the server never sends two
        await pace.act();
        if (ctl.signal.aborted) break; // stopped before the page was touched: nothing happens
        acted = true;
        useLive.getState().setActing(true);
        const outcome = await dispatchAction(event.action, {
          go,
          isPhone,
          onApplyStep: (step) => {
            // a real posting is prepared, never sent by «دليلك» (20 Nov 2026): step 5 says «أجهّز الطلب…»
            const line = applyStatusLine(step, event.action.type === "apply" && getJob(event.action.jobId).real);
            if (line) useLive.getState().setStatus(line, "working");
            // steps 2-4 share one line, step 6 has none: each still moves the work on (the elapsed seconds stay away)
            useLive.getState().progress();
          },
        });
        useLive.getState().setActing(false);
        closedPanel = outcome.closedPanel;
        const after = selectCurrentUser(useAppStore.getState());
        const facts = after ? factsOf(after) : request.facts;
        if (outcome.ok) {
          receipt = receiptFor(event.action);
          const record = outcome.application;
          if (event.action.type === "apply" && record && record.number !== event.action.expect.number) {
            replaced = { text: applySentReply(record), keepCards: true };
          }
        } else {
          const reply = refusedReply(outcome, event.action, facts, makeClock());
          replaced = { text: reply.text, chips: reply.chips, keepCards: false };
        }
      } else if (event.type === "text") {
        blocks.push(event.text);
      } else if (event.type === "card") {
        replyCards.push(event.card);
      } else if (event.type === "chips") {
        chips = event.chips;
      } else if (event.type === "done") {
        const brain = useUi.getState().brain;
        useUi.getState().setBrainStatus({ configured: brain?.configured ?? false, provider: brain?.provider ?? null, mode: event.mode });
        end = "done";
      } else if (event.type === "error") {
        end = "error";
      }
    }
    // a stream that ends without done/error is a failure, unless the deed was already done (then its reply stands)
    if (ctl.signal.aborted && !acted) end = "stopped";
    else if (end === null) end = acted ? "done" : "error";
  } catch {
    end = ctl.signal.aborted ? "stopped" : acted ? "done" : "error";
  } finally {
    if (controller === ctl) controller = null;
  }

  try {
    const liveNow = useLive.getState();
    if (liveNow.turn?.id !== id) return; // abandoned (an account change): nothing of it is shown

    if (end === "error" && !acted) {
      liveNow.end();
      liveNow.addNote({ id: `${id}-error`, kind: "error", afterId: userKey, outgoing });
      return;
    }

    if (end === "stopped" && !acted) {
      // the reply is revealed whole when it is complete, so nothing of it was on screen yet: the row says it stopped
      liveNow.addNote({ id: `${id}-stopped`, kind: "stopped", afterId: userKey });
      liveNow.end();
      return;
    }

    // the reply: on phones the sheet comes back first, so the words come into focus where the user can see them
    if (closedPanel || (isPhone && acted && !useUi.getState().advisorOpen)) {
      useUi.getState().openAdvisor();
      if (!instant) await sleep(SHEET_BACK_MS);
    }
    await pace.settle();
    if (ctl.signal.aborted && !acted) {
      // «إيقاف» while «دليلك» was still thinking: what arrived stays (nothing, with the local brain's held reply)
      useLive.getState().addNote({ id: `${id}-stopped`, kind: "stopped", afterId: userKey });
      useLive.getState().end();
      return;
    }

    const finalBlocks = replaced ? [replaced.text] : blocks.length > 0 ? blocks : [replyFailedLine()];
    const finalCards = replaced && !replaced.keepCards ? [] : replyCards;
    const finalChips = replaced?.chips ?? (replaced && !replaced.keepCards ? [] : chips);
    useAppStore.getState().appendAdvisorMessages([
      { id: withReceipt(id, receipt), from: "daleel", at: Date.now(), blocks: finalBlocks, cards: finalCards, chips: finalChips },
    ]);
    useLive.getState().end();
  } finally {
    if (useLive.getState().turn?.id === id) useLive.getState().end();
    useUi.getState().setAdvisorBusy(false);
  }
}
