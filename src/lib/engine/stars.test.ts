import { describe, expect, it } from "vitest";

import { SKILL_IDS } from "@/lib/ids";

import {
  courseStars,
  cvStars,
  emptyStars,
  skillNode,
  skillNodes,
  skillStars,
  skillTreeSummary,
  skillsHeld,
  starSources,
  starsBeforeLatestStar,
  totalStars,
} from "./stars";
import { MINUTE, T0, completed, courseDoneFacts, cvAnalysedFacts, newFacts, targeted, withCv } from "./test-fixtures";

const t = T0.getTime();

describe("stars (spec 8.5)", () => {
  it("has every skill at 0 to begin with", () => {
    const empty = emptyStars();
    expect(Object.keys(empty)).toHaveLength(SKILL_IDS.length);
    expect(totalStars(empty)).toBe(0);
    expect(skillsHeld(empty)).toBe(0);
  });

  it("the sample CV gives eight skills and eleven stars", () => {
    const s = skillStars(cvAnalysedFacts());
    expect(totalStars(s)).toBe(11);
    expect(skillsHeld(s)).toBe(8);
    expect([s.excel, s.sql, s.statistics, s.programming, s.english, s.communication, s.presentation, s.teamwork]).toEqual([2, 2, 1, 1, 2, 1, 1, 1]);
    expect(s.powerbi).toBe(0);
  });

  it("stars = max(CV, highest completed course); a new CV never removes a course star", () => {
    const f = courseDoneFacts();
    expect(courseStars(f).powerbi).toBe(1);
    expect(skillStars(f).powerbi).toBe(1);
    expect(totalStars(skillStars(f))).toBe(12);
    const reCv = withCv(f, t + 30 * MINUTE, [{ skill: "excel", stars: 1, evidence: "Excel", line: 0 }], false);
    expect(cvStars(reCv).excel).toBe(1);
    expect(cvStars(reCv).sql).toBe(0);
    expect(skillStars(reCv).powerbi).toBe(1);
    expect(skillStars(reCv).excel).toBe(1);
  });

  it("never holds more than a skill's slots", () => {
    const f = withCv(newFacts(), t, [{ skill: "dataviz", stars: 3, evidence: "Tableau", line: 0 }]);
    expect(skillStars(f).dataviz).toBe(1);
  });

  it("names the source of each star", () => {
    const f = courseDoneFacts();
    expect(starSources(f, "excel")).toEqual([
      { star: 1, source: "cv", evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية." },
      { star: 2, source: "cv", evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية." },
    ]);
    expect(starSources(f, "powerbi")).toEqual([{ star: 1, source: "course", courseId: "c-powerbi-1" }]);
    expect(starSources(f, "dataviz")).toEqual([]);
    // statistics ★ from the CV, ★★ from the course
    const s2 = completed(f, "c-statistics-2", t + 30 * MINUTE, 240);
    expect(starSources(s2, "statistics").map((s) => s.source)).toEqual(["cv", "course"]);
  });

  it("the skill tree's first-visit baseline is the state before the latest star (3.5)", () => {
    const course = courseDoneFacts();
    const before = starsBeforeLatestStar(course);
    expect(before.powerbi).toBe(0);
    expect(before.excel).toBe(2);
    expect(totalStars(before)).toBe(11);
    // the CV was the latest: no CV star
    expect(totalStars(starsBeforeLatestStar(cvAnalysedFacts()))).toBe(0);
    // nothing earned yet
    expect(totalStars(starsBeforeLatestStar(newFacts()))).toBe(0);
    // a CV after the course: remove the CV stars, keep the course star
    const reCv = withCv(course, t + 30 * MINUTE, [{ skill: "excel", stars: 3, evidence: "Excel متقدم", line: 0 }], false);
    const b2 = starsBeforeLatestStar(reCv);
    expect([b2.excel, b2.powerbi, totalStars(b2)]).toEqual([0, 1, 1]);
  });
});

describe("skill tree nodes (spec 3.5)", () => {
  it("earned, maxed, available, locked; a skill with a star is never locked", () => {
    const f = cvAnalysedFacts();
    expect(skillNode("excel", f)).toMatchObject({ state: "earned", stars: 2, max: 3, inPath: true, lockedBy: null });
    expect(skillNode("presentation", f)).toMatchObject({ state: "maxed", stars: 1, max: 1, inPath: false });
    expect(skillNode("powerbi", f)).toMatchObject({ state: "available", stars: 0, inPath: true });
    expect(skillNode("dataviz", f)).toMatchObject({ state: "locked", lockedBy: "powerbi" });
    // the CV proved SQL without Excel: still earned, not locked
    const odd = withCv(newFacts(), t, [{ skill: "sql", stars: 1, evidence: "SQL", line: 0 }]);
    expect(skillNode("sql", odd)).toMatchObject({ state: "earned", lockedBy: null });
  });

  it("after Power BI: its first star, and «تصوير البيانات» opens", () => {
    const f = courseDoneFacts();
    expect(skillNode("powerbi", f).state).toBe("earned");
    expect(skillNode("dataviz", f).state).toBe("available");
  });

  it("marks the target's path skills, preparatory ones included", () => {
    const nodes = skillNodes(targeted(newFacts(), "lucidya-frontend-engineer-dammam", t));
    expect(SKILL_IDS.filter((s) => nodes[s].inPath)).toEqual(["programming", "html-css", "git", "javascript", "react", "apis"]);
    expect(SKILL_IDS.filter((s) => skillNodes(newFacts())[s].inPath)).toEqual([]);
  });

  it("summarises: 8 of 54 skills · 11 of 80 stars, then 9 · 12", () => {
    expect(skillTreeSummary(cvAnalysedFacts())).toEqual({ skillsHeld: 8, skillsTotal: 54, starsHeld: 11, starsTotal: 80 });
    expect(skillTreeSummary(courseDoneFacts())).toEqual({ skillsHeld: 9, skillsTotal: 54, starsHeld: 12, starsTotal: 80 });
  });
});
