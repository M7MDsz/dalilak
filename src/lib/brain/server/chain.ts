// Owner: brain-advisor. SERVER-ONLY by placement, but with no SDK import, so the turn runner and its tests stay light.
// The provider backup chain (owner's part 7): within ONE reply the slots are tried in order, gemini-1 → gemini-2 →
// anthropic, then the built-in brain. Which slots exist (keys, models, AI_PROVIDER) is read from env in ./provider.ts;
// this file is the engine every model call shares (advisor turns, the onboarding classification, the CV model call):
// - each slot has its OWN cooldown: one failing never switches off the others. A lone timeout does not cool a slot
//   down; a second one within 2 minutes does (the old global rule, now per slot).
// - the whole chain must start answering within the caller's budget (the advisor's 6 s first-event limit). A fast
//   failure (429, 5xx, a bad key, a bad request, no network) moves to the next slot at once; a slow slot gets only a
//   share of what is left (the first of three gets 60 %: 3.6 of 6 s), then it is aborted and the next one tries.
// - every reply is recorded: a server console line and a short in-memory list for /dev/brain. No key ever appears
//   here: a slot carries the NAMES of its env variables, never their values.
// State (cooldowns, the reply list) lives on globalThis, not in module variables: every route bundle of the server
// process and every dev hot reload then shares the same chain (a timestamp per slot; never user state).
import type { ProviderName } from "@/lib/brain/protocol";

/** Why a provider call failed (STACK-NOTES 5.6, 6.6). Everything except "aborted" moves on to the next slot. */
export type BrainFailure = "aborted" | "timeout" | "offline" | "auth" | "rate_limited" | "server" | "bad_request" | "refusal" | "empty" | "invalid" | "unknown";

/** Thrown by our own provider code for outcomes that are not SDK errors (an empty or refused reply, a bad shape). */
export class ProviderFailure extends Error {
  readonly failure: BrainFailure;
  constructor(failure: BrainFailure, message?: string) {
    super(message ?? `provider failure: ${failure}`);
    this.name = "ProviderFailure";
    this.failure = failure;
  }
}

/** The slots of the chain, in their fixed order. */
export const SLOT_IDS = ["gemini-1", "gemini-2", "anthropic"] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Env variable NAMES (never values) a slot reads; shown in logs so the owner knows what to check. */
export type KeyEnv = "GEMINI_API_KEY" | "GEMINI_API_KEY_2" | "ANTHROPIC_API_KEY";
export type ModelEnv = "GEMINI_MODEL" | "GEMINI_MODEL_2" | "ANTHROPIC_MODEL";

/** One configured provider slot: a key that is set, and the model it calls. */
export interface ChainSlot {
  readonly id: SlotId;
  readonly provider: ProviderName;
  readonly model: string;
  readonly keyEnv: KeyEnv;
  readonly modelEnv: ModelEnv;
}

export type ChainTask = "advisor" | "onboarding" | "cv";

/** Why a slot did not answer this reply: a real failure, or skipped (resting after a failure, or no time left). */
export type SlotMiss = BrainFailure | "cooling_down" | "no_time";

export interface ChainMiss {
  readonly slot: SlotId;
  readonly why: SlotMiss;
  /** How long this slot's attempt took (0 when it was skipped). */
  readonly ms: number;
}

/** One reply in the log: who answered (a slot or the built-in brain), with what model, how fast, after which misses. */
export interface ReplyRecord {
  readonly at: string;
  readonly task: ChainTask;
  readonly by: SlotId | "local";
  readonly model: string | null;
  readonly ms: number;
  readonly misses: readonly ChainMiss[];
  /** True when no slot was configured at all (no key, or AI_PROVIDER=local). */
  readonly noProvider?: boolean;
}

// ── Timing ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A slot that is not the last one gets this share of the time left (the first of three: 3.6 of 6 s). */
const SHARE = 0.6;
/** No attempt starts with less than this fraction of the budget left (advisor 1.2 s, onboarding 1 s, CV 2.4 s). */
const MIN_ATTEMPT = 0.2;

export function minAttemptMs(budgetMs: number): number {
  return Math.round(budgetMs * MIN_ATTEMPT);
}

/**
 * How long a slot may take to send its first event: everything left when no live slot follows it; otherwise 60 % of
 * what is left, but never so much that the rest would be too short for the next one to try (then it gets all of it).
 */
export function shareMs(remainingMs: number, budgetMs: number, slotsAfter: number): number {
  if (slotsAfter <= 0) return remainingMs;
  const min = minAttemptMs(budgetMs);
  const share = Math.max(min, Math.round(remainingMs * SHARE));
  return remainingMs - share < min ? remainingMs : share;
}

// ── Per-slot health (cooldowns) and the reply log, shared by the whole server process ─────────────────────────────

/** After a failure, a slot rests this long (TIMEOUTS_MS.providerCooldown). */
export const SLOT_COOLDOWN_MS = 60_000;
/** One slow reply is not an outage: a "timeout" cools a slot down only when another one came within this window. */
export const TIMEOUT_REPEAT_WINDOW_MS = 120_000;
/** Replies kept for /dev/brain. */
export const REPLY_LOG_SIZE = 20;

interface SlotHealth {
  failedAt: number | null;
  failure: BrainFailure | null;
  lastTimeoutAt: number | null;
  lastMissAt: number | null;
  lastMiss: BrainFailure | null;
}

interface ChainStore {
  readonly health: Map<SlotId, SlotHealth>;
  replies: ReplyRecord[];
}

const STORE = Symbol.for("dalilak.brain.chain.v1");

function store(): ChainStore {
  const g = globalThis as typeof globalThis & { [STORE]?: ChainStore };
  g[STORE] ??= { health: new Map(), replies: [] };
  return g[STORE];
}

function health(slot: SlotId): SlotHealth {
  const map = store().health;
  let h = map.get(slot);
  if (!h) {
    h = { failedAt: null, failure: null, lastTimeoutAt: null, lastMissAt: null, lastMiss: null };
    map.set(slot, h);
  }
  return h;
}

/** Milliseconds this slot still rests, or 0 when it may be tried. */
export function slotCooldownLeftMs(slot: SlotId, now: number = Date.now()): number {
  const h = store().health.get(slot);
  if (!h || h.failedAt === null) return 0;
  return Math.max(0, h.failedAt + SLOT_COOLDOWN_MS - now);
}

export function slotCoolingDown(slot: SlotId, now: number = Date.now()): boolean {
  return slotCooldownLeftMs(slot, now) > 0;
}

/** The last failure of a slot (for /dev/brain), whether or not it started a cooldown. */
export function slotLastMiss(slot: SlotId): { readonly failure: BrainFailure; readonly at: number } | null {
  const h = store().health.get(slot);
  return h && h.lastMiss !== null && h.lastMissAt !== null ? { failure: h.lastMiss, at: h.lastMissAt } : null;
}

/**
 * Records a failure of ONE slot and starts its cooldown, except after a user abort, and except for a lone "timeout"
 * (a second one within 2 minutes does start it). Returns true when the cooldown started. Logs a wrong key or a model
 * id the API rejects loudly, naming the env variables to check (names only).
 */
export function markSlotFailure(slot: ChainSlot, failure: BrainFailure, now: number = Date.now()): boolean {
  if (failure === "aborted") return false;
  const h = health(slot.id);
  h.lastMiss = failure;
  h.lastMissAt = now;
  if (failure === "timeout") {
    const repeated = h.lastTimeoutAt !== null && now - h.lastTimeoutAt < TIMEOUT_REPEAT_WINDOW_MS;
    h.lastTimeoutAt = now;
    if (!repeated) return false;
  }
  h.failedAt = now;
  h.failure = failure;
  if (failure === "auth" || failure === "bad_request") {
    // 401/403: a wrong key; 400/404: a request shape the API rejects or a retired model id (STACK-NOTES 5.2, 6.2).
    console.error(
      `[brain] ${slot.id} (${slot.model}) failed with "${failure}". Check ${slot.keyEnv} and ${slot.modelEnv}. ` +
        `${slot.id} rests for ${SLOT_COOLDOWN_MS / 1000} s; the next in the chain answers meanwhile.`,
    );
  } else {
    console.warn(`[brain] ${slot.id} (${slot.model}) failed with "${failure}"; it rests for ${SLOT_COOLDOWN_MS / 1000} s.`);
  }
  return true;
}

/** The console line of one reply, e.g. `[brain] advisor reply by gemini-2 (gemini-3.1-flash-lite) in 1240 ms after gemini-1 rate_limited`. */
export function replyLine(entry: ReplyRecord): string {
  const who = entry.by === "local" ? "the built-in brain" : `${entry.by} (${entry.model ?? "?"})`;
  const why = entry.noProvider
    ? " (no AI provider configured)"
    : entry.misses.length > 0
      ? ` after ${entry.misses.map((m) => `${m.slot} ${m.why}${m.ms > 0 ? ` ${m.ms} ms` : ""}`).join(", ")}`
      : "";
  return `[brain] ${entry.task} reply by ${who} in ${entry.ms} ms${why}`;
}

/** Adds a reply to the log (newest first, at most 20) and prints its line. */
export function recordReply(entry: ReplyRecord): void {
  const s = store();
  s.replies = [entry, ...s.replies].slice(0, REPLY_LOG_SIZE);
  console.info(replyLine(entry));
}

/** The last replies, newest first. */
export function recentReplies(): readonly ReplyRecord[] {
  return store().replies;
}

/** Test seam: forget every cooldown and the reply log (never called by product code). */
export function resetChainState(): void {
  const s = store();
  s.health.clear();
  s.replies = [];
}

// ── The chain runner ───────────────────────────────────────────────────────────────────────────────────────────────

/** What the chain needs from the outside (product: CHAIN_HOOKS in ./provider.ts; tests: fakes). */
export interface ChainHooks {
  readonly coolingDown: (slot: SlotId) => boolean;
  readonly markFailure: (slot: ChainSlot, failure: BrainFailure) => void;
  readonly classify: (error: unknown, signal: AbortSignal) => BrainFailure;
  readonly record: (entry: ReplyRecord) => void;
}

/** Handed to one slot's attempt. */
export interface AttemptContext {
  /** Aborted by the user, by this slot's share of the first-event budget, or by the whole deadline. */
  readonly signal: AbortSignal;
  /** Call when the provider's first response arrives: this slot's share timer stops (the whole deadline stays). */
  readonly firstEvent: () => void;
  /** This slot's share of the first-event budget (for an SDK's own per-call timeout). */
  readonly shareMs: number;
  /** 0 for the first slot tried in this reply, then 1, 2. */
  readonly index: number;
}

export interface ChainOptions<T> {
  readonly task: ChainTask;
  /** The configured slots, in chain order (./provider.ts chainSlots()). Resting ones are skipped here. */
  readonly slots: readonly ChainSlot[];
  /** The user's signal («إيقاف», or the browser went away): the chain stops and nothing is recorded. */
  readonly signal: AbortSignal;
  /** Some slot must send its first event within this (advisor 6 s); each slot gets a share of what is left. */
  readonly firstEventMs: number;
  /** The whole deadline, first events and the rest (advisor 12 s). Default: firstEventMs (a one-shot call). */
  readonly totalMs?: number;
  readonly attempt: (slot: ChainSlot, ctx: AttemptContext) => Promise<T>;
  readonly hooks: ChainHooks;
}

export type ChainResult<T> =
  | { readonly ok: true; readonly value: T; readonly slot: ChainSlot; readonly ms: number; readonly misses: readonly ChainMiss[] }
  | { readonly ok: false; readonly aborted: boolean; readonly ms: number; readonly misses: readonly ChainMiss[] };

type AttemptOutcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly aborted: true } | { readonly ok: false; readonly aborted: false; readonly failure: BrainFailure };

/** Rejects as soon as `signal` aborts, so a call that ignores its signal can never hold the chain past its share. */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new DOMException("chain deadline", "AbortError"));
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/** The slots that will be tried (not resting) and the misses for the resting ones. */
export function liveSlots(slots: readonly ChainSlot[], coolingDown: (slot: SlotId) => boolean): { readonly live: ChainSlot[]; readonly resting: ChainMiss[] } {
  const live: ChainSlot[] = [];
  const resting: ChainMiss[] = [];
  for (const slot of slots) {
    if (coolingDown(slot.id)) resting.push({ slot: slot.id, why: "cooling_down", ms: 0 });
    else live.push(slot);
  }
  return { live, resting };
}

/** Records a reply that never reached the chain (every slot resting, or none configured). */
export function recordLocalOnly(task: ChainTask, slots: readonly ChainSlot[], hooks: Pick<ChainHooks, "coolingDown" | "record">): void {
  hooks.record({
    at: new Date().toISOString(),
    task,
    by: "local",
    model: null,
    ms: 0,
    misses: liveSlots(slots, hooks.coolingDown).resting,
    ...(slots.length === 0 ? { noProvider: true } : {}),
  });
}

/**
 * Tries the slots in order within one reply and resolves with the first answer, or `ok: false` (then the caller's
 * built-in brain answers). Never throws. Every failure is marked on its own slot; the reply is recorded once, unless
 * the user aborted.
 */
export async function runChain<T>(options: ChainOptions<T>): Promise<ChainResult<T>> {
  const { hooks, signal, firstEventMs } = options;
  const totalMs = options.totalMs ?? firstEventMs;
  const started = Date.now();
  const elapsed = (): number => Date.now() - started;
  const min = minAttemptMs(firstEventMs);
  const { live, resting } = liveSlots(options.slots, hooks.coolingDown);
  const misses: ChainMiss[] = [...resting];

  const attemptOnce = async (slot: ChainSlot, index: number, share: number, turnLeft: number): Promise<AttemptOutcome<T>> => {
    const controller = new AbortController();
    let deadline = false;
    let first = false;
    const onUserAbort = (): void => controller.abort();
    signal.addEventListener("abort", onUserAbort, { once: true });
    const shareTimer = setTimeout(() => {
      if (!first) {
        deadline = true;
        controller.abort();
      }
    }, share);
    const totalTimer = setTimeout(() => {
      deadline = true;
      controller.abort();
    }, turnLeft);
    let succeeded = false;
    try {
      let work: Promise<T>;
      try {
        work = options.attempt(slot, {
          signal: controller.signal,
          firstEvent: () => {
            first = true;
            clearTimeout(shareTimer);
          },
          shareMs: share,
          index,
        });
      } catch (error) {
        work = Promise.reject(error);
      }
      const value = await untilAborted(work, controller.signal);
      succeeded = true;
      return { ok: true, value };
    } catch (error) {
      if (signal.aborted) return { ok: false, aborted: true };
      const failure = deadline ? "timeout" : hooks.classify(error, signal);
      return { ok: false, aborted: false, failure: failure === "aborted" ? "timeout" : failure };
    } finally {
      clearTimeout(shareTimer);
      clearTimeout(totalTimer);
      signal.removeEventListener("abort", onUserAbort);
      if (!succeeded) controller.abort(); // release a call still in flight
    }
  };

  for (let i = 0; i < live.length; i++) {
    const slot = live[i];
    if (!slot) break;
    if (signal.aborted) return { ok: false, aborted: true, ms: elapsed(), misses };
    const now = elapsed();
    const remaining = firstEventMs - now;
    const turnLeft = totalMs - now;
    if (remaining < min || turnLeft < min) {
      for (const rest of live.slice(i)) misses.push({ slot: rest.id, why: "no_time", ms: 0 });
      break;
    }
    const share = shareMs(remaining, firstEventMs, live.length - 1 - i);
    const attemptStart = Date.now();
    const outcome = await attemptOnce(slot, i, share, turnLeft);
    if (outcome.ok) {
      const ms = elapsed();
      hooks.record({ at: new Date().toISOString(), task: options.task, by: slot.id, model: slot.model, ms, misses });
      return { ok: true, value: outcome.value, slot, ms, misses };
    }
    if (outcome.aborted) return { ok: false, aborted: true, ms: elapsed(), misses };
    misses.push({ slot: slot.id, why: outcome.failure, ms: Date.now() - attemptStart });
    hooks.markFailure(slot, outcome.failure);
  }

  const ms = elapsed();
  hooks.record({
    at: new Date().toISOString(),
    task: options.task,
    by: "local",
    model: null,
    ms,
    misses,
    ...(options.slots.length === 0 ? { noProvider: true } : {}),
  });
  return { ok: false, aborted: false, ms, misses };
}
