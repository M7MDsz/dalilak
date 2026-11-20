import { describe, expect, it } from "vitest";

import { JOB_IDS } from "@/lib/ids";
import { getJob } from "@/lib/data";

import { jobsRequiringSkill, rankJobs, searchJobs } from "./jobs";
import { rankByFit } from "./onboarding-fit";
import { MINUTE, T0, applied, completed, cvAnalysedFacts, newFacts, onboarded, quiet, targeted } from "./test-fixtures";

const t = T0.getTime();

describe("rankJobs (spec 7.2)", () => {
  it("after the sample CV, the first eight of 3.7 in order", () => {
    const ranked = rankJobs(cvAnalysedFacts());
    expect(ranked).toHaveLength(20);
    expect(ranked.slice(0, 8).map((r) => [getJob(r.jobId).title, r.match])).toEqual([
      ["محلل بيانات", 70],
      ["محلل أعمال", 60],
      ["محلل مالي", 53],
      ["أخصائي تقارير وبيانات", 50],
      ["مختبِر برمجيات", 50],
      ["منسّق مشاريع", 50],
      ["أخصائي استقطاب وتوظيف", 50],
      ["محلل ذكاء الأعمال", 43],
    ]);
    expect(ranked[0]).toMatchObject({ jobId: "data-analyst-riyadh", isTarget: true, applied: false, missing: ["powerbi", "statistics"] });
    expect(ranked.find((r) => r.jobId === "business-analyst-riyadh")?.missing).toEqual(["project-management", "business-analysis"]);
  });

  it("ties: the target first, then the user's city, then an interest's field, then data order", () => {
    // at 50%: reporting (data, jeddah), qa (dammam), project coordinator (jeddah), recruiter (jeddah)
    const f = cvAnalysedFacts();
    const at50 = (facts: typeof f) => rankJobs(facts).filter((r) => r.match === 50).map((r) => r.jobId);
    expect(at50(f)).toEqual(["reporting-specialist-jeddah", "qa-tester-dammam", "project-coordinator-jeddah", "recruiter-jeddah"]);
    // living in Jeddah with an interest in HR: Jeddah first; among those the HR job; then data order
    const jeddah = { ...f, answers: { ...f.answers, city: { value: "jeddah" as const, label: "جدة" }, interest: ["hr"] as const } };
    expect(at50(jeddah)).toEqual(["recruiter-jeddah", "reporting-specialist-jeddah", "project-coordinator-jeddah", "qa-tester-dammam"]);
    // the target beats everything at the same match
    expect(at50({ ...f, targetJobId: "qa-tester-dammam" })[0]).toBe("qa-tester-dammam");
  });

  it("while the user holds no star: every match is 0 and the order is the fit score (4.6)", () => {
    const f = quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t));
    const ranked = rankJobs(f);
    expect(ranked.every((r) => r.match === 0)).toBe(true);
    expect(ranked.slice(0, 5).map((r) => [r.jobId, r.fit])).toEqual([
      ["data-analyst-riyadh", 100],
      ["reporting-specialist-jeddah", 90],
      ["bi-analyst-riyadh", 82],
      ["junior-data-scientist-remote", 78],
      ["business-analyst-riyadh", 47],
    ]);
    expect(ranked.map((r) => r.jobId).slice(0, rankByFit(f.answers).length)).toEqual(rankByFit(f.answers).map((r) => r.jobId));
  });

  it("a course star alone switches the order to the match (7.2: «from a CV or from a course»)", () => {
    const f = completed(quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t)), "c-excel-1", t + MINUTE, 160);
    const ranked = rankJobs(f);
    expect(ranked[0]?.match).toBeGreaterThan(0);
    expect(ranked.map((r) => r.match)).toEqual([...ranked.map((r) => r.match)].sort((a, b) => b - a));
  });

  it("the education gate sends mid-level jobs to the end of the fit order, still listing all 20", () => {
    const f = quiet(targeted(onboarded(newFacts(), t, { ...cvAnalysedFacts().answers, education: "student", interest: ["software"] }), "frontend-developer-riyadh", t));
    const ranked = rankJobs(f);
    expect(ranked).toHaveLength(20);
    const mids = JOB_IDS.filter((id) => getJob(id).band === "mid");
    expect(ranked.slice(-mids.length).map((r) => r.jobId).sort()).toEqual([...mids].sort());
  });

  it("flags applied jobs", () => {
    const f = applied(cvAnalysedFacts(), "data-analyst-riyadh", t + 10 * MINUTE, 70);
    expect(rankJobs(f).find((r) => r.jobId === "data-analyst-riyadh")?.applied).toBe(true);
  });
});

describe("searchJobs (spec 7.1)", () => {
  it("«محلل بيانات» in Riyadh returns exactly the data analyst and the BI analyst", () => {
    const hits = searchJobs(cvAnalysedFacts(), { q: "محلل بيانات", city: "riyadh" }).map((r) => r.jobId);
    expect(hits).toEqual(["data-analyst-riyadh", "bi-analyst-riyadh"]);
  });

  it("ignores «ال», diacritics and letter case; every word must be found", () => {
    const f = cvAnalysedFacts();
    expect(searchJobs(f, { q: "البيانات" }).length).toBeGreaterThanOrEqual(4);
    expect(searchJobs(f, { q: "power bi" }).map((r) => r.jobId).sort()).toEqual(
      ["data-analyst-riyadh", "bi-analyst-riyadh", "reporting-specialist-jeddah"].sort(),
    );
    expect(searchJobs(f, { q: "مصمّم" }).map((r) => r.jobId).sort()).toEqual(["product-designer-jeddah", "ui-ux-designer-riyadh"].sort());
    expect(searchJobs(f, { q: "محلل زرافة" })).toEqual([]);
    expect(searchJobs(f, { q: "  " })).toHaveLength(20);
  });

  it("finds while typing (a word of the job that starts with the query word)", () => {
    expect(searchJobs(cvAnalysedFacts(), { q: "محل", city: "riyadh" }).map((r) => r.jobId)).toEqual(
      searchJobs(cvAnalysedFacts(), { q: "محلل", city: "riyadh" }).map((r) => r.jobId),
    );
  });

  it("combines search, city, field and skill with AND, keeping the ranking", () => {
    const f = cvAnalysedFacts();
    expect(searchJobs(f, { city: "remote" }).map((r) => r.jobId).sort()).toEqual(
      ["junior-data-scientist-remote", "web-app-developer-remote", "ux-researcher-remote"].sort(),
    );
    expect(searchJobs(f, { field: "hr", city: "jeddah" }).map((r) => r.jobId)).toEqual(["recruiter-jeddah"]);
    expect(searchJobs(f, { skill: "powerbi" }).map((r) => r.jobId)).toEqual(["data-analyst-riyadh", "reporting-specialist-jeddah", "bi-analyst-riyadh"]);
    expect(searchJobs(f, { skill: "powerbi", city: "jeddah" }).map((r) => r.jobId)).toEqual(["reporting-specialist-jeddah"]);
  });
});

describe("jobsRequiringSkill (spec 3.5)", () => {
  it("lists exactly the jobs that require a skill, in data order", () => {
    expect(jobsRequiringSkill("powerbi")).toEqual(["data-analyst-riyadh", "bi-analyst-riyadh", "reporting-specialist-jeddah"]);
    expect(jobsRequiringSkill("ml")).toEqual(["junior-data-scientist-remote"]);
  });
});
