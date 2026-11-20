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
    expect(pathSummary("qiddiya-hr-analytics-analyst-riyadh")).toEqual({ stages: 8, prep: 2, hours: 64 });
    expect(pathSummary("syarah-financial-analyst-tamheer-riyadh")).toEqual({ stages: 5, prep: 0, hours: 38 });
  });

  it("every job's stage and preparatory counts are as listed (5 to 13)", () => {
    const expected: Record<JobId, [number, number]> = {
      "data-analyst-riyadh": [8, 0],
      "jeeny-growth-insights-analytics-riyadh": [11, 0],
      "qiddiya-hr-analytics-analyst-riyadh": [8, 2],
      "ninja-real-estate-performance-analyst-riyadh": [8, 0],
      "master-works-data-senior-engineer-riyadh": [8, 1],
      "salla-senior-data-scientist-remote": [10, 2],
      "lucidya-frontend-engineer-dammam": [7, 1],
      "salla-senior-backend-checkout-remote": [11, 3],
      "salla-senior-qa-engineer-remote": [8, 2],
      "almajed-mobile-developer-riyadh": [9, 4],
      "horizontal-graduate-designer-riyadh": [6, 1],
      "flyakeed-product-designer-riyadh": [9, 2],
      "lucidya-product-designer-riyadh": [9, 2],
      "hungerstation-senior-product-designer-riyadh": [10, 2],
      "salla-marketing-specialist-tamheer-jeddah": [6, 0],
      "salla-mahally-seo-manager-jeddah": [9, 2],
      "lucidya-social-media-analyst-riyadh": [7, 1],
      "platinumlist-content-manager-riyadh": [8, 1],
      "syarah-financial-analyst-tamheer-riyadh": [5, 0],
      "foodics-accountant-erp-riyadh": [8, 0],
      "master-works-ai-business-analyst-riyadh": [10, 4],
      "maharah-business-development-specialist-riyadh": [6, 0],
      "maharah-qa-analyst-riyadh": [7, 2],
      "atheer-hr-specialist-riyadh": [8, 0],
      "qiddiya-hris-specialist-riyadh": [6, 1],
      "lucidya-people-operations-riyadh": [7, 1],
      "tamara-people-business-partner-riyadh": [7, 0],
      "lucidya-talent-acquisition-lead-riyadh": [6, 0],
      // the expansion's 18
      "petroapp-product-manager-riyadh": [6, 1],
      "salla-product-manager-storefront-jeddah": [10, 4],
      "master-works-ai-product-manager-riyadh": [9, 3],
      "taj-hr-cybersecurity-engineer-riyadh": [6, 1],
      "mullers-solutions-soc-l2-specialist-riyadh": [9, 2],
      "qiddiya-it-security-design-riyadh": [7, 2],
      "lucidya-devops-engineer-riyadh": [5, 0],
      "lucidya-site-reliability-engineer-riyadh": [5, 0],
      "mozn-cloud-platform-engineer-riyadh": [6, 0],
      "lamdax-ai-engineer-remote": [9, 4],
      "foodics-ai-engineer-riyadh": [6, 0],
      "mozn-ai-engineer-riyadh": [13, 8],
      "foodics-field-sales-representative-riyadh": [6, 0],
      "shipa-junior-business-development-executive-riyadh": [6, 0],
      "petroapp-customer-success-specialist-riyadh": [6, 0],
      "qiddiya-procurement-specialist-riyadh": [7, 1],
      "ninja-procurement-cost-control-specialist-riyadh": [7, 0],
      "hungerstation-junior-3pl-account-manager-riyadh": [8, 2],
      // wave 2
      "almosafer-product-designer-riyadh": [9, 1],
      "mrsool-creative-copywriter-riyadh": [8, 1],
      "rentokil-customer-experience-specialist-riyadh": [5, 0],
      "mrsool-customer-care-representative-riyadh": [5, 0],
      "ninja-live-operations-supervisor-riyadh": [9, 2],
      "teefnajd-site-engineer-riyadh": [5, 0],
      "rawafid-site-civil-engineer-jeddah": [8, 1],
      "matar-albaqmi-site-engineer-hvac-dammam": [6, 0],
      "hanmiglobal-mechanical-engineer-riyadh": [7, 0],
      "teefnajd-quality-control-engineer-riyadh": [6, 1],
      "hanmiglobal-quality-inspector-electrical-riyadh": [6, 0],
      "hanmiglobal-hse-engineer-riyadh": [5, 0],
      "fuku-hse-engineer-dammam": [8, 1],
      "aljomaih-graduate-development-engineering-riyadh": [6, 1],
      "matar-albaqmi-planning-engineer-dammam": [8, 2],
      "teefnajd-contract-engineer-riyadh": [6, 0],
      "rawafid-erp-projects-cost-controller-jeddah": [10, 4],
      "gathern-guest-relations-associate-riyadh": [6, 1],
      "seven-guest-service-associate-riyadh": [5, 0],
      "eram-event-management-coordinator-jeddah": [6, 0],
      "waseel-rcm-specialist-riyadh": [6, 1],
      "eram-associate-instructional-designer-dhahran": [8, 1],
      "abis-industrial-skills-trainer-computer-dhahran": [7, 1],
      "qiddiya-training-administration-senior-specialist-riyadh": [8, 2],
      "tamara-collections-advisor-riyadh": [7, 2],
      "tamara-compliance-officer-riyadh": [8, 0],
      "tamara-compliance-senior-associate-riyadh": [8, 0],
      "tamara-fraud-investigator-riyadh": [9, 1],
      "pwc-assurance-coop-2027-riyadh": [5, 0],
      "pwc-risk-internal-audit-senior-associate-jeddah": [8, 0],
      "ey-senior-auditor-gcc-nationals-riyadh": [7, 0],
      "webook-legal-analyst-riyadh": [5, 0],
      "mozn-legal-specialist-riyadh": [8, 1],
      "webook-legal-associate-riyadh": [9, 2],
      "mozn-creative-design-motion-riyadh": [8, 0],
      "chainreaction-multimedia-designer-riyadh": [7, 1],
      "platinumlist-en-ar-content-manager-riyadh": [9, 1],
      "qiddiya-gaming-esports-strategy-am-riyadh": [7, 0],
    };
    for (const id of JOB_IDS) {
      const { stages, prep } = pathSummary(id);
      expect([stages, prep], id).toEqual(expected[id]);
    }
  });

  it("places an unlisted prerequisite right before the skill it prepares, transitively, as a ★ «تمهيدية»", () => {
    // the mobile developer: UI design needs Figma, which needs design basics: both come before it
    const mobile = canonicalStages("almajed-mobile-developer-riyadh");
    expect(mobile.map((s) => `${s.skill}${"*".repeat(s.star)}${s.prep ? "(prep→" + s.prepares + ")" : ""}`)).toEqual([
      "programming*",
      "git*(prep→apis)",
      "apis*",
      "design-basics*(prep→figma)",
      "figma*(prep→ui-design)",
      "ui-design*",
      "communication*(prep→teamwork)",
      "teamwork*",
      "business-analysis*",
    ]);
    const ds = canonicalStages("salla-senior-data-scientist-remote");
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
      { jobId: "jeeny-growth-insights-analytics-riyadh", now: 47, after: 77 },
      { jobId: "master-works-data-senior-engineer-riyadh", now: 53, after: 73 },
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

  it("jeeny-growth-insights-analytics-riyadh holds 11 stages; every job has 5 to 13, ends at 100, and its last done stage is at the match", () => {
    expect(roadmapFor("jeeny-growth-insights-analytics-riyadh", cvAnalysedFacts()).stages).toHaveLength(11);
    for (const id of JOB_IDS) {
      const r = roadmapFor(id, cvAnalysedFacts());
      expect(r.stages[r.stages.length - 1]?.matchAt, id).toBe(100);
      expect(r.stages.length, id).toBeGreaterThanOrEqual(5);
      expect(r.stages.length, id).toBeLessThanOrEqual(13);
      const lastDone = r.stages.filter((s) => s.state === "done").pop();
      if (lastDone) expect(lastDone.matchAt, id).toBe(r.match);
    }
  });

  it("a preparatory stage done by implication joins the group of the star that implied it", () => {
    // the data scientist with a CV proving SQL only: Excel (prep → SQL) is done by implication
    const f = withCv(onboardedTarget("salla-senior-data-scientist-remote"), t + 3 * MINUTE, [{ skill: "sql", stars: 1, evidence: "SQL", line: 0 }]);
    const r = roadmapFor("salla-senior-data-scientist-remote", f);
    expect(label(r)).toEqual([
      "excel*",
      "sql*",
      "statistics*",
      "python-data*",
      "powerbi*",
      "dataviz*",
      "communication*",
      "sql**",
      "communication**",
      "sql***",
    ]);
    expect(r.stages[0]).toMatchObject({ state: "done", doneBy: { kind: "implied" }, prep: true, gain: 0 });
    expect(r.stages[1]).toMatchObject({ state: "done", doneBy: { kind: "cv" } });
    // statistics needs Excel, which has no star: locked, never contradicting the catalogue
    expect(r.stages[2]).toMatchObject({ skill: "statistics", state: "locked", lock: { kind: "prereq", skill: "excel" } });
  });

  it("the current stage can always be started (an implied prep that another skill still needs)", () => {
    const f = withCv(onboardedTarget("salla-senior-data-scientist-remote"), t + 3 * MINUTE, [{ skill: "sql", stars: 1, evidence: "SQL", line: 0 }]);
    const r = roadmapFor("salla-senior-data-scientist-remote", f);
    expect(r.stages.map((s) => s.state)).toEqual(["done", "done", "locked", "locked", "locked", "locked", "current", "upcoming", "locked", "locked"]);
    expect(r.currentN).toBe(7);
    expect(r.stages[6]).toMatchObject({ skill: "communication", star: 1 });
  });

  it("without a target there is no roadmap", () => {
    expect(buildRoadmap(newFacts())).toBeNull();
  });
});

describe("branches (spec 3.4)", () => {
  it("offers the two highest projected matches (the growth analyst 77, the data engineer 73)", () => {
    expect(branchJobs("data-analyst-riyadh", cvAnalysedFacts()).map((b) => [b.jobId, b.now, b.after])).toEqual([
      ["jeeny-growth-insights-analytics-riyadh", 47, 77],
      ["master-works-data-senior-engineer-riyadh", 53, 73],
    ]);
  });

  it("never offers the target itself", () => {
    for (const id of JOB_IDS) expect(branchJobs(id, cvAnalysedFacts()).map((b) => b.jobId), id).not.toContain(id);
  });
});
