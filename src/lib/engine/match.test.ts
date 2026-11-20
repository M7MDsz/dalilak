import { describe, expect, it } from "vitest";

import { JOB_IDS } from "@/lib/ids";
import { getJob } from "@/lib/data";
import type { Requirement, StarMap } from "@/lib/types";

import { jobGap, jobMatch, matchBreakdown, matchPercent, projectedMatch, starGain, targetMatch } from "./match";
import { emptyStars } from "./stars";
import { T0, completed, courseDoneFacts, cvAnalysedFacts, newFacts, targeted, withCv } from "./test-fixtures";

const DATA_ANALYST: readonly Requirement[] = [
  { skill: "excel", stars: 2 },
  { skill: "sql", stars: 2 },
  { skill: "powerbi", stars: 1 },
  { skill: "statistics", stars: 2 },
  { skill: "communication", stars: 1 },
];

function stars(held: Partial<Record<keyof StarMap, 0 | 1 | 2 | 3>>): StarMap {
  return { ...emptyStars(), ...held };
}

describe("matchPercent (spec 7.2), inline fixtures", () => {
  it("gives the 7.2 table: 70 / 90 / 100", () => {
    const afterCv = stars({ excel: 2, sql: 2, statistics: 1, communication: 1 });
    expect(matchPercent(DATA_ANALYST, afterCv)).toBe(70);
    expect(matchPercent(DATA_ANALYST, { ...afterCv, powerbi: 1 })).toBe(90);
    expect(matchPercent(DATA_ANALYST, { ...afterCv, powerbi: 1, statistics: 2 })).toBe(100);
    expect(matchPercent(DATA_ANALYST, emptyStars())).toBe(0);
  });

  it("produces thirds: 43, 53, 57", () => {
    // 20 + 13.33 + 0 + 0 + 10 = 43.33
    const bi: Requirement[] = [
      { skill: "excel", stars: 2 },
      { skill: "sql", stars: 3 },
      { skill: "powerbi", stars: 3 },
      { skill: "dataviz", stars: 1 },
      { skill: "statistics", stars: 2 },
    ];
    expect(matchPercent(bi, stars({ excel: 2, sql: 2, statistics: 1 }))).toBe(43);
    // 0 + 0 + 13.33 + 20 + 20 = 53.33
    const fin: Requirement[] = [
      { skill: "accounting", stars: 1 },
      { skill: "financial-analysis", stars: 2 },
      { skill: "excel", stars: 3 },
      { skill: "presentation", stars: 1 },
      { skill: "english", stars: 2 },
    ];
    expect(matchPercent(fin, stars({ excel: 2, presentation: 1, english: 2 }))).toBe(53);
    // 20 + 20 + 6.67 + 10 + 0 = 56.67
    expect(matchPercent(fin, stars({ accounting: 1, presentation: 1, excel: 1, "financial-analysis": 1 }))).toBe(57);
  });

  it("adds nothing for stars above the requirement or skills the job does not list", () => {
    const base = stars({ excel: 2, sql: 2, statistics: 1, communication: 1 });
    expect(matchPercent(DATA_ANALYST, { ...base, excel: 3, sql: 3, communication: 2 })).toBe(70);
    expect(matchPercent(DATA_ANALYST, { ...base, figma: 3, english: 2 })).toBe(70);
  });

  it("gives a star's share: 20 / 10 / 7", () => {
    expect(starGain(1)).toBe(20);
    expect(starGain(2)).toBe(10);
    expect(starGain(3)).toBe(7);
  });
});

describe("match with the catalogue", () => {
  it("explains the demo match to the point (3.8 «كيف تُحسب؟»)", () => {
    const b = matchBreakdown(getJob("data-analyst-riyadh"), stars({ excel: 2, sql: 2, statistics: 1, communication: 1 }));
    expect(b.rows.map((r) => [r.skill, r.need, r.held, r.points])).toEqual([
      ["excel", 2, 2, 20],
      ["sql", 2, 2, 20],
      ["powerbi", 1, 0, 0],
      ["statistics", 2, 1, 10],
      ["communication", 1, 1, 20],
    ]);
    expect(b.total).toBe(70);
    expect(b.metPoints).toBe(60);
    const thirds = matchBreakdown(getJob("bi-analyst-riyadh"), stars({ excel: 2, sql: 2, statistics: 1 }));
    expect(thirds.rows[1]?.points).toBeCloseTo(13.333, 2);
    expect(thirds.total).toBe(43);
  });

  it("9.8 check 5: with the sample CV every job's match equals the 9.3 column; only data analyst is ≥ 70", () => {
    const expected: Record<(typeof JOB_IDS)[number], number> = {
      "data-analyst-riyadh": 70,
      "bi-analyst-riyadh": 43,
      "reporting-specialist-jeddah": 50,
      "junior-data-scientist-remote": 30,
      "frontend-developer-riyadh": 20,
      "backend-developer-riyadh": 30,
      "web-app-developer-remote": 20,
      "qa-tester-dammam": 50,
      "ui-ux-designer-riyadh": 20,
      "product-designer-jeddah": 10,
      "ux-researcher-remote": 40,
      "digital-marketing-specialist-riyadh": 20,
      "content-writer-jeddah": 40,
      "digital-ads-specialist-dammam": 20,
      "business-analyst-riyadh": 60,
      "project-coordinator-jeddah": 50,
      "financial-analyst-riyadh": 53,
      "hr-specialist-riyadh": 30,
      "recruiter-jeddah": 50,
      "training-coordinator-dammam": 30,
    };
    const facts = cvAnalysedFacts();
    for (const id of JOB_IDS) expect(jobMatch(id, facts), id).toBe(expected[id]);
    expect(JOB_IDS.filter((id) => jobMatch(id, facts) >= 70)).toEqual(["data-analyst-riyadh"]);
  });

  it("target match: null without a target, 0 before the CV, 70 → 90 → 100 along the demo", () => {
    expect(targetMatch(newFacts())).toBeNull();
    expect(targetMatch(targeted(newFacts(), "data-analyst-riyadh", T0.getTime()))).toBe(0);
    expect(targetMatch(cvAnalysedFacts())).toBe(70);
    expect(targetMatch(courseDoneFacts())).toBe(90);
    expect(targetMatch(completed(courseDoneFacts(), "c-statistics-2", T0.getTime() + 60 * 60_000, 240))).toBe(100);
  });

  it("keeps course stars when a new CV proves less (8.5)", () => {
    const f = withCv(courseDoneFacts(), T0.getTime() + 10 * 60_000, [{ skill: "excel", stars: 1, evidence: "Excel", line: 0 }], false);
    // excel 1 of 2 (10) + powerbi from the course (20)
    expect(jobMatch("data-analyst-riyadh", f)).toBe(30);
  });
});

describe("jobGap (spec 3.8 / 7.3)", () => {
  it("after the sample CV: have Excel, SQL, communication; missing Power BI and statistics; two rows", () => {
    const gap = jobGap("data-analyst-riyadh", cvAnalysedFacts());
    expect(gap.match).toBe(70);
    expect(gap.have).toEqual([
      { skill: "excel", need: 2, held: 2, source: "cv" },
      { skill: "sql", need: 2, held: 2, source: "cv" },
      { skill: "communication", need: 1, held: 1, source: "cv" },
    ]);
    expect(gap.missing).toEqual([
      { skill: "powerbi", need: 1, held: 0 },
      { skill: "statistics", need: 2, held: 1 },
    ]);
    expect(gap.rows).toEqual([
      { skill: "powerbi", star: 1, courseId: "c-powerbi-1", hours: 10, xp: 200, gain: 20, prep: false, matchAfter: 90 },
      { skill: "statistics", star: 2, courseId: "c-statistics-2", hours: 12, xp: 240, gain: 10, prep: false, matchAfter: 80 },
    ]);
  });

  it("after the Power BI course: Power BI is had from a course, one row left", () => {
    const gap = jobGap("data-analyst-riyadh", courseDoneFacts());
    expect(gap.match).toBe(90);
    expect(gap.have.map((h) => [h.skill, h.source])).toEqual([
      ["excel", "cv"],
      ["sql", "cv"],
      ["powerbi", "course"],
      ["communication", "cv"],
    ]);
    expect(gap.rows.map((r) => r.courseId)).toEqual(["c-statistics-2"]);
    expect(gap.rows[0]?.matchAfter).toBe(100);
  });

  it("marks a missing prerequisite the job does not list as a preparatory row at +0%", () => {
    // frontend: html-css · javascript (needs programming, unlisted) · react · git · english
    const gap = jobGap("frontend-developer-riyadh", newFacts());
    const prep = gap.rows.filter((r) => r.prep);
    expect(prep).toHaveLength(1);
    expect(prep[0]).toMatchObject({ skill: "programming", star: 1, gain: 0, matchAfter: 0 });
    // the sample CV proves programming: no preparatory row then
    expect(jobGap("frontend-developer-riyadh", cvAnalysedFacts()).rows.some((r) => r.prep)).toBe(false);
  });

  it("is empty when ready", () => {
    const ready = completed(courseDoneFacts(), "c-statistics-2", T0.getTime() + 60 * 60_000, 240);
    const gap = jobGap("data-analyst-riyadh", ready);
    expect(gap.match).toBe(100);
    expect(gap.missing).toEqual([]);
    expect(gap.rows).toEqual([]);
  });
});

describe("projectedMatch (spec 3.4 branches)", () => {
  it("raises the stars to the target's requirements", () => {
    const facts = cvAnalysedFacts();
    const target = getJob("data-analyst-riyadh").requirements;
    expect(projectedMatch("reporting-specialist-jeddah", target, facts)).toBe(80);
    expect(projectedMatch("bi-analyst-riyadh", target, facts)).toBe(60);
    expect(projectedMatch("data-analyst-riyadh", target, facts)).toBe(100);
  });
});
