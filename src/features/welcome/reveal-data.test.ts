// The path reveal's data and timing (spec 4.7): the demo's recommendation never changes, the show keeps its length, and
// every scene draws a sample of the catalogue that fits the stage and always holds the three chosen jobs.
import { describe, expect, it } from "vitest";

import { JOBS, REVEAL_SEQUENCE } from "@/lib/data";
import type { JobId, OnboardingAnswers } from "@/lib/types";

import { RESULT_COPY } from "./copy";
import { revealData, sampleTiles } from "./reveal-data";

const DEMO_ANSWERS: OnboardingAnswers = {
  city: { value: "riyadh", label: "الرياض" },
  education: "bachelor",
  major: { value: "mis", label: "نظم معلومات إدارية" },
  experience: "none",
  interest: ["data"],
  priority: "first-job",
};

describe("REVEAL_SEQUENCE", () => {
  it("plays the six steps in order, 7.8 s in all", () => {
    expect(REVEAL_SEQUENCE.map((s) => s.id)).toEqual(["answers-gather", "jobs-sweep", "skills-map", "narrow-to-three", "path-draw", "reveal-landing"]);
    expect(REVEAL_SEQUENCE.reduce((sum, s) => sum + s.ms, 0)).toBe(7_800);
  });

  it("gives every step long enough to be read (at least 0.8 s) and none longer than 1.6 s", () => {
    for (const step of REVEAL_SEQUENCE) {
      expect(step.ms).toBeGreaterThanOrEqual(800);
      expect(step.ms).toBeLessThanOrEqual(1_600);
    }
  });
});

describe("revealData (the demo answers)", () => {
  const data = revealData(DEMO_ANSWERS);

  it("recommends «محلل بيانات» with the two demo alternatives", () => {
    expect(data.recommended.id).toBe("data-analyst-riyadh");
    expect(data.alternatives.map((a) => a.id)).toEqual(["qiddiya-hr-analytics-analyst-riyadh", "tamara-builders-program-data-riyadh"]);
  });

  it("gathers the six answers and draws a tile for every job of the catalogue", () => {
    expect(data.answers).toHaveLength(6);
    expect(data.answers.every((a) => a.text.length > 0)).toBe(true);
    expect(data.tiles).toHaveLength(JOBS.length);
  });
});

describe("sampleTiles", () => {
  const data = revealData(DEMO_ANSWERS);
  const three: readonly JobId[] = [data.alternatives[0].id, data.recommended.id, data.alternatives[1].id];

  for (const count of [10, 20, 27]) {
    it(`draws ${count} distinct tiles that hold the three chosen ones, apart`, () => {
      const sample = sampleTiles(data.tiles, three, count);
      expect(sample).toHaveLength(count);
      expect(new Set(sample.map((t) => t.id)).size).toBe(count);
      const at = three.map((id) => sample.findIndex((t) => t.id === id));
      expect(at.every((i) => i >= 0)).toBe(true);
      const sorted = [...at].sort((a, b) => a - b);
      expect(sorted[1]! - sorted[0]!).toBeGreaterThan(1);
      expect(sorted[2]! - sorted[1]!).toBeGreaterThan(1);
    });
  }

  it("mixes tiles that fit with tiles that do not, so the sort is seen", () => {
    const sample = sampleTiles(data.tiles, three, 27);
    const fits = sample.filter((t) => t.fits).length;
    expect(fits).toBeGreaterThanOrEqual(3);
    expect(fits).toBeLessThan(27);
  });

  it("is deterministic, and returns a short list whole", () => {
    expect(sampleTiles(data.tiles, three, 20)).toEqual(sampleTiles(data.tiles, three, 20));
    const short = data.tiles.slice(0, 5);
    expect(sampleTiles(short, three, 20)).toBe(short);
  });
});

describe("RESULT_COPY company line", () => {
  it("speaks Najdi, as «دليلك» does", () => {
    expect(RESULT_COPY.companyAimed("سلة")).toBe("في سلة، الشركة اللي اخترتها");
    // a company with jobs elsewhere in the app is said positively; one with no job at all, honestly (21 Nov 2026)
    expect(RESULT_COPY.companyNoJob("مهارة")).toBe("وظايف مهارة حطيتها لك أول وحدة في وظائفك، ومسارك يبقى في مجالك.");
    expect(RESULT_COPY.companyNoJob("شركة غير معروفة")).toBe("ما عندي الحين وظيفة من شركة غير معروفة، فهذي الأقرب لك.");
  });
});
