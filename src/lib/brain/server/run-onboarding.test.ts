// Owner: brain-advisor. The onboarding classification on the backup chain (spec 4.5, owner's part 7), with fake slots
// (no SDK, no network): the next slot classifies when one fails or is slow, and when every slot fails the conversation
// gets { unclassified } + done local, within the 5 s budget.
import { describe, expect, it } from "vitest";

import type { OnboardingClassifyRequest, OnboardingEvent } from "@/lib/brain/protocol";

import { ProviderFailure, type BrainFailure, type ChainHooks, type ChainSlot, type ReplyRecord, type SlotId } from "./chain";
import { runOnboardingClassifyWith, type SlotClassifier } from "./run-onboarding";

const G1: ChainSlot = { id: "gemini-1", provider: "gemini", model: "m1", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL" };
const G2: ChainSlot = { id: "gemini-2", provider: "gemini", model: "m2", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL_2" };

const REQUEST: OnboardingClassifyRequest = { v: 1, question: "education", text: "خلصت جامعة" };

function hooks(failures: BrainFailure[], records: ReplyRecord[], resting: readonly SlotId[] = []): ChainHooks {
  return {
    coolingDown: (slot) => resting.includes(slot),
    markFailure: (_slot, f) => failures.push(f),
    classify: (error) => (error instanceof ProviderFailure ? error.failure : "unknown"),
    record: (entry) => records.push(entry),
  };
}

async function collect(stream: AsyncGenerator<OnboardingEvent>): Promise<OnboardingEvent[]> {
  const out: OnboardingEvent[] = [];
  for await (const event of stream) out.push(event);
  return out;
}

function classifier(by: Partial<Record<SlotId, "fail" | "hang" | readonly string[]>>): SlotClassifier {
  return (slot, _request, signal) =>
    new Promise<string[]>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      const b = by[slot.id] ?? "hang";
      if (b === "fail") reject(new ProviderFailure("rate_limited"));
      else if (b !== "hang") resolve([...b]);
    });
}

describe("runOnboardingClassifyWith (part 7)", () => {
  it("classifies with gemini-2 when gemini-1 is rate-limited", async () => {
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    const events = await collect(
      runOnboardingClassifyWith(REQUEST, new AbortController().signal, {
        slots: () => [G1, G2],
        classify: classifier({ "gemini-1": "fail", "gemini-2": ["bachelor"] }),
        hooks: hooks(failures, records),
      }),
    );
    expect(events).toEqual([
      { type: "classified", question: "education", options: ["bachelor"] },
      { type: "done", mode: "online" },
    ]);
    expect(failures).toEqual(["rate_limited"]);
    expect(records[0]).toEqual(expect.objectContaining({ task: "onboarding", by: "gemini-2" }));
  });

  it("says unclassified (online) when the slot answers that nothing fits", async () => {
    const events = await collect(
      runOnboardingClassifyWith(REQUEST, new AbortController().signal, { slots: () => [G1], classify: classifier({ "gemini-1": [] }), hooks: hooks([], []) }),
    );
    expect(events).toEqual([{ type: "unclassified" }, { type: "done", mode: "online" }]);
  });

  it("falls back to unclassified + local within the budget when every slot is slow", async () => {
    const failures: BrainFailure[] = [];
    const started = Date.now();
    const events = await collect(
      runOnboardingClassifyWith(REQUEST, new AbortController().signal, { slots: () => [G1, G2], classify: classifier({}), hooks: hooks(failures, []), budgetMs: 500 }),
    );
    expect(Date.now() - started).toBeLessThan(800);
    expect(events).toEqual([{ type: "unclassified" }, { type: "done", mode: "local" }]);
    expect(failures).toEqual(["timeout", "timeout"]);
  });

  it("goes local at once when every slot rests, without calling any", async () => {
    let called = false;
    const records: ReplyRecord[] = [];
    const events = await collect(
      runOnboardingClassifyWith(REQUEST, new AbortController().signal, {
        slots: () => [G1, G2],
        classify: async () => {
          called = true;
          return [];
        },
        hooks: hooks([], records, ["gemini-1", "gemini-2"]),
      }),
    );
    expect(called).toBe(false);
    expect(events).toEqual([{ type: "unclassified" }, { type: "done", mode: "local" }]);
    expect(records[0]?.misses.map((m) => m.why)).toEqual(["cooling_down", "cooling_down"]);
  });
});
