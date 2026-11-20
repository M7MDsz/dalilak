import { describe, expect, it } from "vitest";

import { nextStep, nextStepTarget } from "./next-step";
import { MINUTE, T0, applied, completed, courseDoneFacts, cvAnalysedFacts, newFacts, onboarded, quiet, started, targeted } from "./test-fixtures";

const t = T0.getTime();
const onboardedSeed = () => quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t));

describe("next step (spec 2.8)", () => {
  it("rule 1: no CV and not skipped", () => {
    expect(nextStep(onboardedSeed())).toEqual({ rule: 1 });
    expect(nextStepTarget({ rule: 1 })).toEqual({ screen: "cv" });
  });

  it("rule 1 wins over a started course", () => {
    expect(nextStep(started(onboardedSeed(), "c-excel-1", t))).toEqual({ rule: 1 });
  });

  it("rule 3 after skipping the CV: stage 1's course", () => {
    expect(nextStep({ ...onboardedSeed(), cvSkipped: true })).toMatchObject({ rule: 3, courseId: "c-excel-1", matchNow: 0, matchAfter: 10 });
  });

  it("rule 3 after the sample CV: «أساسيات Power BI» · 10 h · +200 XP · to 90%", () => {
    const step = nextStep(cvAnalysedFacts());
    expect(step).toEqual({
      rule: 3,
      courseId: "c-powerbi-1",
      hours: 10,
      xp: 200,
      prep: false,
      prepares: null,
      matchNow: 70,
      matchAfter: 90,
    });
    expect(nextStepTarget(step)).toEqual({ screen: "course", courseId: "c-powerbi-1" });
  });

  it("rule 2: the most recently started course still started (mid-path: statistics, 2 of 5)", () => {
    let f = applied(courseDoneFacts(), "data-analyst-riyadh", t + 10 * MINUTE, 90);
    f = started(f, "c-statistics-2", t + 11 * MINUTE, [1, 2]);
    expect(nextStep(f)).toEqual({ rule: 2, courseId: "c-statistics-2", ticked: 2, total: 5 });
    // an older started course loses to a newer one
    const two = started(started(cvAnalysedFacts(), "c-excel-3", t + 20 * MINUTE), "c-sql-3", t + 21 * MINUTE);
    expect(nextStep(two)).toMatchObject({ rule: 2, courseId: "c-sql-3" });
    expect(nextStep(started(cvAnalysedFacts(), "c-excel-3", t + 20 * MINUTE))).toMatchObject({ rule: 2, courseId: "c-excel-3" });
  });

  it("rule 3 again after the course: statistics ★★", () => {
    expect(nextStep(courseDoneFacts())).toMatchObject({ rule: 3, courseId: "c-statistics-2", matchNow: 90, matchAfter: 100 });
  });

  it("rule 4: 100% and not applied to the target; rule 5 once applied", () => {
    const ready = completed(courseDoneFacts(), "c-statistics-2", t + 20 * MINUTE, 240);
    expect(nextStep(ready)).toEqual({ rule: 4, jobId: "data-analyst-riyadh" });
    expect(nextStepTarget({ rule: 4, jobId: "data-analyst-riyadh" })).toEqual({ screen: "job", jobId: "data-analyst-riyadh" });
    const done = applied(ready, "data-analyst-riyadh", t + 30 * MINUTE, 100);
    expect(nextStep(done)).toEqual({ rule: 5 });
    expect(nextStepTarget({ rule: 5 })).toEqual({ screen: "jobs" });
  });

  it("rule 4 also when applied to another job only", () => {
    const ready = applied(completed(courseDoneFacts(), "c-statistics-2", t + 20 * MINUTE, 240), "syarah-financial-analyst-tamheer-riyadh", t + 30 * MINUTE, 60);
    expect(nextStep(ready)).toEqual({ rule: 4, jobId: "data-analyst-riyadh" });
  });

  it("rule 5 without a target (damaged state)", () => {
    expect(nextStep({ ...cvAnalysedFacts(), targetJobId: null })).toEqual({ rule: 5 });
  });

  it("a completed course is no longer rule 2", () => {
    expect(nextStep(courseDoneFacts()).rule).toBe(3);
  });
});
