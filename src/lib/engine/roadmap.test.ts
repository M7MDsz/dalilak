import { describe, expect, it } from "vitest";

import { JOB_IDS, type JobId } from "@/lib/ids";
import type { Roadmap, UserFacts } from "@/lib/types";

import { branchJobs, buildRoadmap, canonicalStages, pathSummary, roadmapFor } from "./roadmap";
import {
  MINUTE,
  T0,
  completed,
  courseDoneFacts,
  cvAnalysedFacts,
  newFacts,
  onboarded,
  quiet,
  started,
  targeted,
  withCv,
} from "./test-fixtures";

const t = T0.getTime();

function label(r: Roadmap): string[] {
  return r.stages.map((s) => `${s.skill}${"*".repeat(s.star)}`);
}

function onboardedTarget(jobId: JobId = "data-analyst-riyadh"): UserFacts {
  return quiet(targeted(onboarded(newFacts(), t + MINUTE), jobId, t + 2 * MINUTE));
}

describe("canonical stages (spec 3.4, 9.3)", () => {
  it("data analyst: every ★ first, then ★★, in requirement order", () => {
    expect(canonicalStages("data-analyst-riyadh").map((s) => `${s.skill}${"*".repeat(s.star)}`)).toEqual([
      "excel*",
      "sql*",
      "powerbi*",
      "statistics*",
      "communication*",
      "excel**",
      "sql**",
      "statistics**",
    ]);
    expect(canonicalStages("data-analyst-riyadh").every((s) => !s.prep && s.courseId === `c-${s.skill}-${s.star}`)).toBe(true);
  });

  it("9.8 check 9: the three reveal jobs", () => {
    expect(pathSummary("data-analyst-riyadh")).toEqual({ stages: 8, prep: 0, hours: 74 });
    expect(pathSummary("reporting-specialist-jeddah")).toEqual({ stages: 7, prep: 0, hours: 60 });
    expect(pathSummary("business-analyst-riyadh")).toEqual({ stages: 7, prep: 0, hours: 64 });
  });

  it("every job's stage and preparatory counts equal the 9.3 column (6 to 11)", () => {
    const expected: Record<JobId, [number, number]> = {
      "data-analyst-riyadh": [8, 0],
      "bi-analyst-riyadh": [11, 0],
      "reporting-specialist-jeddah": [7, 0],
      "junior-data-scientist-remote": [8, 1],
      "frontend-developer-riyadh": [7, 1],
      "backend-developer-riyadh": [8, 1],
      "web-app-developer-remote": [10, 3],
      "qa-tester-dammam": [7, 1],
      "ui-ux-designer-riyadh": [7, 1],
      "product-designer-jeddah": [10, 1],
      "ux-researcher-remote": [7, 2],
      "digital-marketing-specialist-riyadh": [6, 0],
      "content-writer-jeddah": [7, 0],
      "digital-ads-specialist-dammam": [8, 1],
      "business-analyst-riyadh": [7, 0],
      "project-coordinator-jeddah": [7, 0],
      "financial-analyst-riyadh": [10, 1],
      "hr-specialist-riyadh": [7, 0],
      "recruiter-jeddah": [8, 0],
      "training-coordinator-dammam": [6, 0],
    };
    for (const id of JOB_IDS) {
      const { stages, prep } = pathSummary(id);
      expect([stages, prep], id).toEqual(expected[id]);
    }
  });

  it("places an unlisted prerequisite right before the skill it prepares, transitively, as a ★ «تمهيدية»", () => {
    const web = canonicalStages("web-app-developer-remote");
    expect(web.map((s) => `${s.skill}${"*".repeat(s.star)}${s.prep ? "(prep→" + s.prepares + ")" : ""}`)).toEqual([
      "html-css*(prep→javascript)",
      "programming*(prep→javascript)",
      "javascript*",
      "react*",
      "git*",
      "apis*",
      "communication*(prep→teamwork)",
      "teamwork*",
      "javascript**",
      "javascript***",
    ]);
    const ds = canonicalStages("junior-data-scientist-remote");
    expect(ds[0]).toMatchObject({ skill: "excel", star: 1, prep: true, prepares: "sql" });
  });
});

describe("roadmap (spec 3.4)", () => {
  it("before a CV: the gate is current, no stage is current, upcoming or locked by the catalogue", () => {
    const r = buildRoadmap(onboardedTarget());
    expect(r).not.toBeNull();
    if (r === null) return;
    expect(r.gate).toBe("current");
    expect(r.currentN).toBeNull();
    expect(r.match).toBe(0);
    expect([r.doneCount, r.total, r.hoursLeft, r.hoursTotal]).toEqual([0, 8, 74, 74]);
    expect(r.stages.map((s) => s.state)).toEqual([
      "upcoming", // Excel ★: no prerequisite
      "locked", // SQL ★ needs Excel
      "locked",
      "locked",
      "upcoming", // التواصل ★: no prerequisite
      "locked", // Excel ★★ needs Excel ★
      "locked",
      "locked",
    ]);
    expect(r.stages[1]?.lock).toEqual({ kind: "prereq", skill: "excel" });
    expect(r.stages[5]?.lock).toEqual({ kind: "previous-star", skill: "excel", star: 1 });
  });

  it("«ابدأ بدون سيرة» clears the gate and makes stage 1 current", () => {
    const r = buildRoadmap({ ...onboardedTarget(), cvSkipped: true });
    expect(r?.gate).toBe("cleared");
    expect(r?.currentN).toBe(1);
    expect(r?.stages[0]).toMatchObject({ skill: "excel", star: 1, state: "current", matchAfter: 10 });
  });

  it("after the sample CV: six done from the CV, Power BI current at 7, statistics ★★ upcoming at 8", () => {
    const r = buildRoadmap(cvAnalysedFacts());
    if (r === null) throw new Error("no roadmap");
    expect(label(r)).toEqual(["excel*", "sql*", "statistics*", "communication*", "excel**", "sql**", "powerbi*", "statistics**"]);
    expect(r.stages.map((s) => s.state)).toEqual(["done", "done", "done", "done", "done", "done", "current", "upcoming"]);
    expect(r.stages.slice(0, 6).every((s) => s.doneBy?.kind === "cv")).toBe(true);
    expect(r.stages[0]?.doneBy).toEqual({ kind: "cv", evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية." });
    expect(r.gate).toBe("cleared");
    expect(r.currentN).toBe(7);
    expect(r.match).toBe(70);
    expect([r.doneCount, r.total, r.hoursLeft]).toEqual([6, 8, 22]);
    expect(r.stages.map((s) => s.matchAt)).toEqual([10, 20, 30, 50, 60, 70, 90, 100]);
    expect(r.stages[5]?.matchAt).toBe(r.match);
    expect(r.stages[6]).toMatchObject({ n: 7, courseId: "c-powerbi-1", hours: 10, xp: 200, gain: 20, matchAfter: 90 });
    expect(r.stages[7]).toMatchObject({ n: 8, courseId: "c-statistics-2", gain: 10, matchAfter: 80 });
    expect(r.branches).toEqual([
      { jobId: "reporting-specialist-jeddah", now: 50, after: 80 },
      { jobId: "bi-analyst-riyadh", now: 43, after: 60 },
    ]);
  });

  it("after the Power BI course: seven done, Power BI keeps number 7 «من دورة», stage 8 current", () => {
    const r = buildRoadmap(courseDoneFacts());
    if (r === null) throw new Error("no roadmap");
    expect(r.stages[6]).toMatchObject({ n: 7, skill: "powerbi", state: "done" });
    expect(r.stages[6]?.doneBy).toMatchObject({ kind: "course", courseId: "c-powerbi-1" });
    expect(r.stages[7]).toMatchObject({ n: 8, skill: "statistics", star: 2, state: "current", matchAfter: 100 });
    expect([r.doneCount, r.total, r.hoursLeft, r.match, r.currentN]).toEqual([7, 8, 12, 90, 8]);
    expect(r.stages[6]?.matchAt).toBe(90);
  });

  it("at 100%: complete, no current stage, nothing left", () => {
    const ready = completed(courseDoneFacts(), "c-statistics-2", t + 60 * MINUTE, 240);
    const r = buildRoadmap(ready);
    expect(r).toMatchObject({ complete: true, match: 100, currentN: null, doneCount: 8, hoursLeft: 0 });
  });

  it("course-completed stages come in completion order (a stage taken early moves up)", () => {
    // statistics ★★ completed before Power BI: it becomes stage 7, Power BI 8
    const f = completed(cvAnalysedFacts(), "c-statistics-2", t + 10 * MINUTE, 240);
    const r = buildRoadmap(f);
    if (r === null) throw new Error("no roadmap");
    expect(label(r).slice(6)).toEqual(["statistics**", "powerbi*"]);
    expect(r.stages.map((s) => s.state).slice(6)).toEqual(["done", "current"]);
    expect(r.stages.map((s) => s.matchAt)).toEqual([10, 20, 30, 50, 60, 70, 80, 100]);
  });

  it("a started course does not change the stage's state", () => {
    const r = buildRoadmap(started(cvAnalysedFacts(), "c-powerbi-1", t + 10 * MINUTE, [1, 2]));
    expect(r?.stages[6]?.state).toBe("current");
  });

  it("bi-analyst-riyadh holds 11 stages; every job has 6 to 11, ends at 100, and its last done stage is at the match", () => {
    expect(roadmapFor("bi-analyst-riyadh", cvAnalysedFacts()).stages).toHaveLength(11);
    for (const id of JOB_IDS) {
      const r = roadmapFor(id, cvAnalysedFacts());
      expect(r.stages[r.stages.length - 1]?.matchAt, id).toBe(100);
      expect(r.stages.length, id).toBeGreaterThanOrEqual(6);
      expect(r.stages.length, id).toBeLessThanOrEqual(11);
      const lastDone = r.stages.filter((s) => s.state === "done").pop();
      if (lastDone) expect(lastDone.matchAt, id).toBe(r.match);
    }
  });

  it("a preparatory stage done by implication joins the group of the star that implied it", () => {
    // frontend with a CV proving JavaScript only: programming (prep → javascript) is done by implication
    const f = withCv(onboardedTarget("frontend-developer-riyadh"), t + 3 * MINUTE, [
      { skill: "javascript", stars: 1, evidence: "JavaScript", line: 0 },
    ]);
    const r = roadmapFor("frontend-developer-riyadh", f);
    expect(label(r)).toEqual(["programming*", "javascript*", "html-css*", "react*", "git*", "english*", "javascript**"]);
    expect(r.stages[0]).toMatchObject({ state: "done", doneBy: { kind: "implied" }, prep: true, gain: 0 });
    expect(r.stages[2]?.state).toBe("current");
    // git needs programming, which has no star: locked, never contradicting the catalogue
    expect(r.stages[4]).toMatchObject({ skill: "git", state: "locked", lock: { kind: "prereq", skill: "programming" } });
  });

  it("the current stage can always be started (an implied prep that another skill still needs)", () => {
    const f = withCv(onboardedTarget("web-app-developer-remote"), t + 3 * MINUTE, [
      { skill: "html-css", stars: 1, evidence: "HTML", line: 0 },
      { skill: "javascript", stars: 1, evidence: "JavaScript", line: 1 },
      { skill: "react", stars: 1, evidence: "React", line: 2 },
    ]);
    const r = roadmapFor("web-app-developer-remote", f);
    expect(label(r)).toEqual([
      "html-css*",
      "programming*",
      "javascript*",
      "react*",
      "git*",
      "apis*",
      "communication*",
      "teamwork*",
      "javascript**",
      "javascript***",
    ]);
    expect(r.stages.map((s) => s.state)).toEqual([
      "done",
      "done",
      "done",
      "done",
      "locked",
      "locked",
      "current",
      "locked",
      "upcoming",
      "locked",
    ]);
    expect(r.currentN).toBe(7);
  });

  it("without a target there is no roadmap", () => {
    expect(buildRoadmap(newFacts())).toBeNull();
  });
});

describe("branches (spec 3.4)", () => {
  it("ties on the projected match go to the target's field, then data order", () => {
    // bi-analyst and business-analyst both project to 60: bi-analyst (data) wins
    expect(branchJobs("data-analyst-riyadh", cvAnalysedFacts()).map((b) => [b.jobId, b.now, b.after])).toEqual([
      ["reporting-specialist-jeddah", 50, 80],
      ["bi-analyst-riyadh", 43, 60],
    ]);
  });

  it("never offers the target itself", () => {
    for (const id of JOB_IDS) expect(branchJobs(id, cvAnalysedFacts()).map((b) => b.jobId), id).not.toContain(id);
  });
});
