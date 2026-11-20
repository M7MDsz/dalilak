// Owner: brain-cv. Spec 6.6 flow without a key: the sample never goes to a model, a model's answer only counts after the
// code checks, and every failure falls back silently to the local result.
import { describe, expect, it, vi } from "vitest";

import { sampleCvText } from "@/lib/data";
import type { CvAnalyseResponse } from "@/lib/brain/protocol";
import type { CvAnalysis } from "@/lib/types";

import { analyseCvLocal } from "../local-analyser";

import { analyseCvWith, type AnalyseDeps } from "./analyse";
import { readCandidates } from "./model";

const CV = [
  "Sara Al-Harbi",
  "Work Experience",
  "- Interviewed twelve shoppers and turned their feedback into a new checkout flow.",
  "- Cleaned the weekly sales sheet in Excel.",
].join("\n");

const request = (text: string) => ({ v: 1 as const, text, fileName: null });
const signal = new AbortController().signal;

function analysisOf(response: CvAnalyseResponse): CvAnalysis {
  if (!response.ok) throw new Error(response.error);
  return response.analysis;
}

function deps(online: boolean, model: AnalyseDeps["model"]): AnalyseDeps {
  return { online: () => online, model };
}

describe("analyseCvWith (spec 6.6)", () => {
  it("never sends the sample CV to a model, even online", async () => {
    const model = vi.fn<AnalyseDeps["model"]>(async () => [{ skill: "powerbi", evidence: "anything" }]);
    const analysis = analysisOf(await analyseCvWith(request(sampleCvText("خالد")), signal, deps(true, model)));
    expect(model).not.toHaveBeenCalled();
    expect(analysis).toEqual(analyseCvLocal(sampleCvText("خالد")));
  });

  it("uses only the local analyser when no provider is online", async () => {
    const model = vi.fn<AnalyseDeps["model"]>(async () => null);
    const analysis = analysisOf(await analyseCvWith(request(CV), signal, deps(false, model)));
    expect(model).not.toHaveBeenCalled();
    expect(analysis).toEqual(analyseCvLocal(CV));
    expect(analysis.engine).toBe("local");
  });

  it("adds a checked model skill (stars from its zone) and says the model read the CV", async () => {
    const model: AnalyseDeps["model"] = async () => [
      { skill: "ux-research", evidence: "Interviewed twelve shoppers and turned their feedback into a new checkout flow." },
    ];
    const analysis = analysisOf(await analyseCvWith(request(CV), signal, deps(true, model)));
    expect(analysis.engine).toBe("model");
    expect(analysis.lines).toEqual(analyseCvLocal(CV).lines);
    expect(analysis.skills.map((s) => [s.skill, s.stars, s.line])).toEqual([
      ["ux-research", 1, 2],
      ["excel", 2, 3],
    ]);
  });

  it("falls back silently to the local result on null, an empty list, a throw, or a provider check that throws", async () => {
    const local = analyseCvLocal(CV);
    const outcomes = await Promise.all([
      analyseCvWith(request(CV), signal, deps(true, async () => null)),
      analyseCvWith(request(CV), signal, deps(true, async () => [])),
      analyseCvWith(request(CV), signal, deps(true, async () => Promise.reject(new Error("timeout")))),
      analyseCvWith(request(CV), signal, {
        online: () => {
          throw new Error("provider not built");
        },
        model: async () => null,
      }),
    ]);
    for (const outcome of outcomes) expect(analysisOf(outcome)).toEqual(local);
  });

  it("keeps the local skills when every model pair fails the checks", async () => {
    const model: AnalyseDeps["model"] = async () => [{ skill: "excel", evidence: "Interviewed twelve shoppers and turned their feedback" }];
    const analysis = analysisOf(await analyseCvWith(request(CV), signal, deps(true, model)));
    expect(analysis.skills).toEqual(analyseCvLocal(CV).skills);
  });
});

describe("readCandidates (the model's reply)", () => {
  it("keeps pairs with a known id and an evidence string", () => {
    const json = JSON.stringify({
      skills: [
        { skill: "ux-research", evidence: "  Interviewed twelve shoppers. " },
        { skill: "cooking", evidence: "Made dinner." },
        { skill: "figma", evidence: "" },
        { skill: "agile", evidence: 3 },
        "nonsense",
      ],
    });
    expect(readCandidates(json)).toEqual([{ skill: "ux-research", evidence: "Interviewed twelve shoppers." }]);
  });

  it("answers null when the reply is not the asked shape", () => {
    expect(readCandidates(undefined)).toBeNull();
    expect(readCandidates("")).toBeNull();
    expect(readCandidates("{not json")).toBeNull();
    expect(readCandidates(JSON.stringify({ items: [] }))).toBeNull();
    expect(readCandidates(JSON.stringify({ skills: [] }))).toEqual([]);
  });
});
