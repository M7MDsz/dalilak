// Owner: brain-cv. The CV model call on the provider backup chain (owner's part 7), with fake slots (no SDK, no
// network): a failing slot hands over to the next one; every slot failing or resting leaves the local result alone.
import { describe, expect, it } from "vitest";

import { ProviderFailure, type BrainFailure, type ChainHooks, type ChainSlot, type ReplyRecord, type SlotId } from "@/lib/brain/server/chain";

import { modelCvSkillsWith, readCandidates, replySchema, type CvSlotCall } from "./model";

const G1: ChainSlot = { id: "gemini-1", provider: "gemini", model: "m1", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL" };
const CL: ChainSlot = { id: "anthropic", provider: "anthropic", model: "c", keyEnv: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL" };

const CV = "Sara Al-Harbi\nWork Experience\n- Interviewed twelve shoppers and turned their feedback into a new checkout flow.";
const PAIRS = [{ skill: "communication" as const, evidence: "Interviewed twelve shoppers" }];

function hooks(failures: BrainFailure[], records: ReplyRecord[], resting: readonly SlotId[] = []): ChainHooks {
  return {
    coolingDown: (slot) => resting.includes(slot),
    markFailure: (_slot, f) => failures.push(f),
    classify: (error) => (error instanceof ProviderFailure ? error.failure : "unknown"),
    record: (entry) => records.push(entry),
  };
}

describe("modelCvSkillsWith (part 7)", () => {
  it("asks Claude when gemini-1 fails, and keeps its pairs", async () => {
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    const call: CvSlotCall = async (slot) => {
      if (slot.id === "gemini-1") throw new ProviderFailure("server");
      return PAIRS;
    };
    const result = await modelCvSkillsWith(CV, new AbortController().signal, { slots: () => [G1, CL], call, hooks: hooks(failures, records) });
    expect(result).toEqual(PAIRS);
    expect(failures).toEqual(["server"]);
    expect(records[0]).toEqual(expect.objectContaining({ task: "cv", by: "anthropic" }));
  });

  it("returns null (the local result stands alone) when every slot fails", async () => {
    const failures: BrainFailure[] = [];
    const call: CvSlotCall = async () => {
      throw new ProviderFailure("rate_limited");
    };
    expect(await modelCvSkillsWith(CV, new AbortController().signal, { slots: () => [G1, CL], call, hooks: hooks(failures, []) })).toBeNull();
    expect(failures).toEqual(["rate_limited", "rate_limited"]);
  });

  it("keeps a reply of no use as null without trying the next slot or resting the first (not an outage)", async () => {
    const failures: BrainFailure[] = [];
    const asked: SlotId[] = [];
    const call: CvSlotCall = async (slot) => {
      asked.push(slot.id);
      return null;
    };
    expect(await modelCvSkillsWith(CV, new AbortController().signal, { slots: () => [G1, CL], call, hooks: hooks(failures, []) })).toBeNull();
    expect(asked).toEqual(["gemini-1"]);
    expect(failures).toEqual([]);
  });

  it("asks nobody when every slot rests or none is configured", async () => {
    const asked: SlotId[] = [];
    const call: CvSlotCall = async (slot) => {
      asked.push(slot.id);
      return PAIRS;
    };
    expect(await modelCvSkillsWith(CV, new AbortController().signal, { slots: () => [G1, CL], call, hooks: hooks([], [], ["gemini-1", "anthropic"]) })).toBeNull();
    expect(await modelCvSkillsWith(CV, new AbortController().signal, { slots: () => [], call, hooks: hooks([], []) })).toBeNull();
    expect(asked).toEqual([]);
  });
});

describe("the reply schema (CV-reader test, 21 Nov 2026)", () => {
  it("has no enum anywhere (Gemini refuses an enum of the whole catalogue with a 400), and unknown ids are dropped in code", () => {
    for (const strict of [false, true]) expect(JSON.stringify(replySchema(strict))).not.toContain("enum");
    expect(replySchema(true)).toMatchObject({ additionalProperties: false });
    expect(readCandidates(JSON.stringify({ skills: [{ skill: "excel", evidence: "Built pivot tables" }, { skill: "juggling", evidence: "x y z" }] }))).toEqual([
      { skill: "excel", evidence: "Built pivot tables" },
    ]);
  });
});
