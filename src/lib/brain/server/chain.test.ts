// Owner: brain-advisor. The backup chain engine (owner's part 7) with fake attempts (no SDK, no network): shares of
// the first-event budget, fast and slow failures, per-slot cooldowns with the lone-timeout rule, the reply log and its
// console line, a user abort, and a call that ignores its signal.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ProviderFailure,
  markSlotFailure,
  minAttemptMs,
  recentReplies,
  recordReply,
  replyLine,
  resetChainState,
  runChain,
  shareMs,
  slotCoolingDown,
  type AttemptContext,
  type BrainFailure,
  type ChainHooks,
  type ChainSlot,
  type ReplyRecord,
  type SlotId,
} from "./chain";

const G1: ChainSlot = { id: "gemini-1", provider: "gemini", model: "m1", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL" };
const G2: ChainSlot = { id: "gemini-2", provider: "gemini", model: "m2", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL_2" };
const CL: ChainSlot = { id: "anthropic", provider: "anthropic", model: "c", keyEnv: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL" };
const ALL = [G1, G2, CL];

type Behaviour = { kind: "answer"; value: string; afterMs?: number } | { kind: "fail"; failure: BrainFailure; afterMs?: number } | { kind: "hang" } | { kind: "deaf" };

/** Fake attempts by slot; every call is logged with the share it was given. */
function scripted(behaviours: Partial<Record<SlotId, Behaviour>>, calls: { slot: SlotId; share: number }[] = []) {
  return (slot: ChainSlot, ctx: AttemptContext): Promise<string> => {
    calls.push({ slot: slot.id, share: ctx.shareMs });
    const b = behaviours[slot.id] ?? { kind: "hang" };
    if (b.kind === "deaf") return new Promise<string>(() => {}); // ignores its signal entirely
    return new Promise<string>((resolve, reject) => {
      ctx.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      if (b.kind === "hang") return;
      setTimeout(() => (b.kind === "answer" ? resolve(b.value) : reject(new ProviderFailure(b.failure))), b.afterMs ?? 0);
    });
  };
}

/** Hooks on the REAL per-slot cooldown store, with the log captured instead of printed. */
function realHooks(records: ReplyRecord[]): ChainHooks {
  return {
    coolingDown: (slot) => slotCoolingDown(slot),
    markFailure: (slot, failure) => {
      markSlotFailure(slot, failure);
    },
    classify: (error) => (error instanceof ProviderFailure ? error.failure : "unknown"),
    record: (entry) => records.push(entry),
  };
}

const quiet = { warn: console.warn, error: console.error, info: console.info };
beforeEach(() => {
  resetChainState();
  console.warn = () => {};
  console.error = () => {};
});
afterEach(() => {
  resetChainState();
  console.warn = quiet.warn;
  console.error = quiet.error;
  console.info = quiet.info;
});

const signal = (): AbortSignal => new AbortController().signal;

describe("shares of the budget", () => {
  it("gives the first of three 60 % of 6 s, and the last one everything left", () => {
    expect(minAttemptMs(6_000)).toBe(1_200);
    expect(shareMs(6_000, 6_000, 2)).toBe(3_600);
    expect(shareMs(2_400, 6_000, 1)).toBe(2_400); // 60 % would leave 960 ms: too little for the next one, so all of it
    expect(shareMs(5_700, 6_000, 1)).toBe(3_420); // after a fast failure the next ones still share a full budget
    expect(shareMs(2_000, 6_000, 0)).toBe(2_000);
  });
});

describe("runChain", () => {
  it("returns the first slot's answer and records it", async () => {
    const records: ReplyRecord[] = [];
    const result = await runChain({ task: "advisor", slots: ALL, signal: signal(), firstEventMs: 600, attempt: scripted({ "gemini-1": { kind: "answer", value: "one" } }), hooks: realHooks(records) });
    expect(result).toEqual(expect.objectContaining({ ok: true, value: "one", slot: G1, misses: [] }));
    expect(records.map((r) => [r.by, r.model])).toEqual([["gemini-1", "m1"]]);
  });

  it.each([
    ["rate_limited", "429"],
    ["server", "5xx"],
    ["auth", "a bad key"],
    ["bad_request", "a bad model id"],
    ["offline", "no network"],
  ] as const)("moves on at once after %s (%s) and rests only that slot", async (failure, _what) => {
    const records: ReplyRecord[] = [];
    const started = Date.now();
    const result = await runChain({
      task: "advisor",
      slots: ALL,
      signal: signal(),
      firstEventMs: 6_000,
      attempt: scripted({ "gemini-1": { kind: "fail", failure }, "gemini-2": { kind: "answer", value: "two" } }),
      hooks: realHooks(records),
    });
    expect(Date.now() - started).toBeLessThan(300);
    expect(result.ok && result.slot.id).toBe("gemini-2");
    expect(slotCoolingDown("gemini-1")).toBe(true);
    expect(slotCoolingDown("gemini-2")).toBe(false);
    expect(slotCoolingDown("anthropic")).toBe(false);
  });

  it("forces each slot to fail in turn: the next one answers every time", async () => {
    const fail: Behaviour = { kind: "fail", failure: "server" };
    const answer = (value: string): Behaviour => ({ kind: "answer", value });
    const cases: [Partial<Record<SlotId, Behaviour>>, SlotId | null][] = [
      [{ "gemini-1": fail, "gemini-2": answer("2"), anthropic: answer("3") }, "gemini-2"],
      [{ "gemini-1": answer("1"), "gemini-2": fail, anthropic: answer("3") }, "gemini-1"],
      [{ "gemini-1": fail, "gemini-2": fail, anthropic: answer("3") }, "anthropic"],
      [{ "gemini-1": fail, "gemini-2": fail, anthropic: fail }, null],
    ];
    for (const [behaviours, expected] of cases) {
      resetChainState();
      const result = await runChain({ task: "advisor", slots: ALL, signal: signal(), firstEventMs: 6_000, attempt: scripted(behaviours), hooks: realHooks([]) });
      expect(result.ok ? result.slot.id : null).toBe(expected);
    }
  });

  it("cuts a slow slot at its share and keeps the whole chain inside the budget", async () => {
    const calls: { slot: SlotId; share: number }[] = [];
    const records: ReplyRecord[] = [];
    const started = Date.now();
    const result = await runChain({ task: "advisor", slots: ALL, signal: signal(), firstEventMs: 1_000, attempt: scripted({}, calls), hooks: realHooks(records) });
    const elapsed = Date.now() - started;
    expect(result.ok).toBe(false);
    expect(elapsed).toBeGreaterThanOrEqual(980);
    expect(elapsed).toBeLessThan(1_300);
    expect(calls.map((c) => c.slot)).toEqual(["gemini-1", "gemini-2"]);
    // the share is 60% of the time left when the slot starts (real clock): 600 ms, a few ms less under load
    expect(calls[0]?.share).toBeGreaterThanOrEqual(585);
    expect(calls[0]?.share).toBeLessThanOrEqual(600);
    expect(records[0]?.by).toBe("local");
    expect(records[0]?.misses.map((m) => m.why)).toEqual(["timeout", "timeout", "no_time"]);
    // a lone timeout does not rest a slot
    expect(slotCoolingDown("gemini-1")).toBe(false);
  });

  it("does not let a call that ignores its signal hold the chain", async () => {
    const started = Date.now();
    const result = await runChain({
      task: "onboarding",
      slots: [G1, G2],
      signal: signal(),
      firstEventMs: 500,
      attempt: scripted({ "gemini-1": { kind: "deaf" }, "gemini-2": { kind: "answer", value: "two" } }),
      hooks: realHooks([]),
    });
    expect(Date.now() - started).toBeLessThan(450);
    expect(result.ok && result.value).toBe("two");
  });

  it("stops the share timer at the first event; the whole deadline still holds", async () => {
    const result = await runChain({
      task: "advisor",
      slots: [G1, G2],
      signal: signal(),
      firstEventMs: 300,
      totalMs: 1_000,
      attempt: (slot, ctx) =>
        new Promise<string>((resolve, reject) => {
          ctx.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          setTimeout(() => ctx.firstEvent(), 50); // a tool call arrives at once…
          setTimeout(() => resolve(`${slot.id} done`), 500); // …and the reply well after the first-event budget
        }),
      hooks: realHooks([]),
    });
    expect(result.ok && result.value).toBe("gemini-1 done");
  });

  it("rests a slot after its second timeout within 2 minutes, then skips it", async () => {
    const records: ReplyRecord[] = [];
    const calls: { slot: SlotId; share: number }[] = [];
    const run = () =>
      runChain({ task: "advisor", slots: [G1, G2], signal: signal(), firstEventMs: 400, attempt: scripted({ "gemini-2": { kind: "answer", value: "two" } }, calls), hooks: realHooks(records) });
    await run();
    expect(slotCoolingDown("gemini-1")).toBe(false);
    await run();
    expect(slotCoolingDown("gemini-1")).toBe(true);
    calls.length = 0;
    const third = await run();
    expect(calls.map((c) => c.slot)).toEqual(["gemini-2"]);
    // the first live slot, and the last: the whole budget (real clock: a few ms less under load)
    expect(calls[0]?.share).toBeGreaterThanOrEqual(390);
    expect(calls[0]?.share).toBeLessThanOrEqual(400);
    expect(third.ok && third.slot.id).toBe("gemini-2");
    expect(records[2]?.misses).toEqual([{ slot: "gemini-1", why: "cooling_down", ms: 0 }]);
  });

  it("goes local with no slot at all and says so", async () => {
    const records: ReplyRecord[] = [];
    const result = await runChain({ task: "cv", slots: [], signal: signal(), firstEventMs: 1_000, attempt: scripted({}), hooks: realHooks(records) });
    expect(result.ok).toBe(false);
    expect(records[0]).toEqual(expect.objectContaining({ by: "local", noProvider: true }));
  });

  it("stops on a user abort without marking or recording anything", async () => {
    const controller = new AbortController();
    const records: ReplyRecord[] = [];
    setTimeout(() => controller.abort(), 30);
    const result = await runChain({ task: "advisor", slots: ALL, signal: controller.signal, firstEventMs: 1_000, attempt: scripted({}), hooks: realHooks(records) });
    expect(result).toEqual(expect.objectContaining({ ok: false, aborted: true }));
    expect(records).toEqual([]);
    expect(slotCoolingDown("gemini-1")).toBe(false);
  });
});

describe("the reply log", () => {
  it("prints one line per reply, naming who answered and who missed, never a key", () => {
    const line = replyLine({
      at: "2026-11-20T10:00:00.000Z",
      task: "advisor",
      by: "gemini-2",
      model: "gemini-3.1-flash-lite",
      ms: 1_240,
      misses: [{ slot: "gemini-1", why: "rate_limited", ms: 180 }],
    });
    expect(line).toBe("[brain] advisor reply by gemini-2 (gemini-3.1-flash-lite) in 1240 ms after gemini-1 rate_limited 180 ms");
    expect(replyLine({ at: "", task: "onboarding", by: "local", model: null, ms: 0, misses: [], noProvider: true })).toBe(
      "[brain] onboarding reply by the built-in brain in 0 ms (no AI provider configured)",
    );
  });

  it("keeps the last 20 replies, newest first", () => {
    console.info = () => {};
    for (let i = 0; i < 25; i++) recordReply({ at: String(i), task: "advisor", by: "gemini-1", model: "m1", ms: i, misses: [] });
    expect(recentReplies()).toHaveLength(20);
    expect(recentReplies()[0]?.ms).toBe(24);
    expect(recentReplies()[19]?.ms).toBe(5);
  });
});
