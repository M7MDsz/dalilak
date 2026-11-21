// The path reveal's data and timing (spec 4.7): the demo's recommendation never changes, the show keeps its length, and
// every scene draws a sample of the catalogue that fits the stage and always holds the three chosen jobs.
import { describe, expect, it } from "vitest";

import { JOBS, REVEAL_SEQUENCE } from "@/lib/data";
import { tracksOf } from "@/lib/engine";
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

  // 21 Nov 2026 (owner: choose a specialisation of the field): the show's two others are the best jobs of the next two
  // specialisations, so the second changed from the Tamara graduate programme (data's general track, now offered after the
  // named ones) to the AI track's best job.
  it("recommends «محلل بيانات» with the two demo alternatives", () => {
    expect(data.recommended.id).toBe("data-analyst-riyadh");
    expect(data.recommended).toMatchObject({ stages: 8, hours: 74 });
    expect(data.alternatives.map((a) => a.id)).toEqual(["qiddiya-hr-analytics-analyst-riyadh", "lamdax-ai-engineer-remote"]);
  });

  it("offers the specialisations of data, «تحليل البيانات» first with the recommended job", () => {
    expect(data.tracks.map((t) => t.id)).toEqual(["data/analysis", "data/bi", "data/ai", "data/general", "data/engineering"]); // reachable tracks before senior-only ones
    expect(data.tracks[0]).toMatchObject({ name: "تحليل البيانات", best: true, job: { id: "data-analyst-riyadh" } });
    expect(data.tracks.slice(1).every((t) => !t.best)).toBe(true);
    // the show lands on what the result offers
    expect(data.tracks.slice(1, 3).map((t) => t.job.id)).toEqual(data.alternatives.map((a) => a.id));
  });

  it("gathers the six answers and draws a tile for every job of the catalogue", () => {
    expect(data.answers).toHaveLength(6);
    expect(data.answers.every((a) => a.text.length > 0)).toBe(true);
    expect(data.tiles).toHaveLength(JOBS.length);
  });
});

describe("revealData tracks (owner: web → full stack, front end, back end; the same for other jobs)", () => {
  const answersFor = (interest: OnboardingAnswers["interest"], major: "cs" | "design" | "hr" = "cs"): OnboardingAnswers => ({
    ...DEMO_ANSWERS,
    major: { value: major, label: "x" },
    interest,
  });

  it("gives a software user 3 to 5 software specialisations, front end, back end and full stack among them", () => {
    const data = revealData(answersFor(["software"]));
    const ids = data.tracks.map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(ids.every((id) => id.startsWith("software/"))).toBe(true);
    for (const id of ["software/front-end", "software/back-end", "software/full-stack"]) expect(ids).toContain(id);
    expect(data.tracks[0]?.job.id).toBe(data.recommended.id);
    expect(new Set(data.tracks.map((t) => t.job.id)).size).toBe(data.tracks.length);
  });

  it("keeps two of the second interest's specialisations", () => {
    const data = revealData(answersFor(["data", "software"]));
    expect(data.tracks).toHaveLength(5);
    expect(data.tracks.filter((t) => t.id.startsWith("software/")).length).toBe(2);
    expect(data.tracks.filter((t) => t.id.startsWith("data/")).length).toBe(3);
  });

  it("stays in the asked field, offering as many of its specialisations as it has (up to five)", () => {
    for (const interest of ["data", "software", "design", "marketing", "business", "hr"] as const) {
      const data = revealData(answersFor([interest]));
      expect(data.tracks.every((t) => t.job.fieldId === interest), interest).toBe(true);
      expect(data.tracks.length, interest).toBe(Math.min(5, tracksOf(interest).length));
    }
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
