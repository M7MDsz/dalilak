import { describe, expect, it } from "vitest";

import type { OnboardingAnswers } from "@/lib/types";

import { fitBreakdown, fitReasons, rankByFit, recommend } from "./onboarding-fit";
import { DEMO_ANSWERS } from "./test-fixtures";

describe("fit score (spec 4.6)", () => {
  it("9.8 check 6: the worked example scores 100 / 90 / 82 / 78 / 47 with these terms", () => {
    const rows = (["data-analyst-riyadh", "reporting-specialist-jeddah", "bi-analyst-riyadh", "junior-data-scientist-remote", "business-analyst-riyadh"] as const).map(
      (id) => fitBreakdown(id, DEMO_ANSWERS),
    );
    expect(rows.map((r) => [r.terms.interest, r.terms.major, r.terms.experience, r.terms.city, r.terms.priority, r.score])).toEqual([
      [40, 25, 15, 10, 10, 100],
      [40, 25, 15, 0, 10, 90],
      [40, 25, 7, 10, 0, 82],
      [40, 25, 7, 6, 0, 78],
      [0, 12, 15, 10, 10, 47],
    ]);
    expect(rows.every((r) => !r.excluded)).toBe(true);
  });

  it("ranks: the four data jobs, then the business analyst", () => {
    expect(rankByFit(DEMO_ANSWERS).slice(0, 5).map((f) => [f.jobId, f.score])).toEqual([
      ["data-analyst-riyadh", 100],
      ["reporting-specialist-jeddah", 90],
      ["bi-analyst-riyadh", 82],
      ["junior-data-scientist-remote", 78],
      ["business-analyst-riyadh", 47],
    ]);
  });

  it("recommends the data analyst, the reporting specialist, and the business analyst from another field, with three reasons", () => {
    expect(recommend(DEMO_ANSWERS)).toEqual({
      recommended: "data-analyst-riyadh",
      alternatives: ["reporting-specialist-jeddah", "business-analyst-riyadh"],
      reasons: [
        { kind: "interest", interest: "data" },
        { kind: "major", tier: "primary", majorLabel: "نظم معلومات إدارية" },
        { kind: "experience", band: "entry" },
      ],
    });
    expect(fitReasons("data-analyst-riyadh", DEMO_ANSWERS)).toEqual(recommend(DEMO_ANSWERS).reasons);
  });

  it("gives any job its own reasons, in 4.6 order, up to three", () => {
    // business analyst: major secondary · entry band · Riyadh · first job → the first three
    expect(fitReasons("business-analyst-riyadh", DEMO_ANSWERS)).toEqual([
      { kind: "major", tier: "secondary", majorLabel: "نظم معلومات إدارية" },
      { kind: "experience", band: "entry" },
      { kind: "city", cityLabel: "الرياض" },
    ]);
    // BI analyst (junior: 7 experience points are not a reason): interest, major, city
    expect(fitReasons("bi-analyst-riyadh", DEMO_ANSWERS)).toEqual([
      { kind: "interest", interest: "data" },
      { kind: "major", tier: "primary", majorLabel: "نظم معلومات إدارية" },
      { kind: "city", cityLabel: "الرياض" },
    ]);
    // remote
    const noCity: OnboardingAnswers = { ...DEMO_ANSWERS, city: { value: "none", label: "" }, interest: ["unsure"], major: { value: "other", label: "تخصص آخر" }, experience: "over3" };
    expect(fitReasons("junior-data-scientist-remote", noCity)).toEqual([{ kind: "remote" }]);
  });

  it("gives the single «none» reason when nothing scored", () => {
    const nothing: OnboardingAnswers = {
      city: { value: "makkah", label: "مكة المكرمة" },
      education: "bachelor",
      major: { value: "other", label: "تخصص آخر" },
      experience: "over3",
      interest: ["unsure"],
      priority: "explore",
    };
    // frontend: entry band (two bands from mid), Riyadh, software
    expect(fitBreakdown("frontend-developer-riyadh", nothing).score).toBe(0);
    expect(fitReasons("frontend-developer-riyadh", nothing)).toEqual([{ kind: "none" }]);
  });

  it("second interest scores 30; priorities switch and grow", () => {
    const two: OnboardingAnswers = { ...DEMO_ANSWERS, interest: ["marketing", "data"], priority: "switch" };
    const da = fitBreakdown("data-analyst-riyadh", two);
    expect(da.terms.interest).toBe(30);
    // switch: the field is an interest but it IS the major's primary field (data for mis) → 0
    expect(da.terms.priority).toBe(0);
    expect(fitBreakdown("digital-marketing-specialist-riyadh", two).terms).toMatchObject({ interest: 40, priority: 10 });
    const grow: OnboardingAnswers = { ...DEMO_ANSWERS, priority: "grow" };
    expect(fitBreakdown("data-analyst-riyadh", grow).terms.priority).toBe(10);
    expect(fitBreakdown("business-analyst-riyadh", grow).terms.priority).toBe(0);
  });

  it("the education gate leaves mid-level jobs out for secondary, diploma and student", () => {
    for (const education of ["secondary", "diploma", "student"] as const) {
      const a: OnboardingAnswers = { ...DEMO_ANSWERS, education };
      expect(fitBreakdown("web-app-developer-remote", a).excluded).toBe(true);
      expect(rankByFit(a).map((f) => f.jobId)).not.toContain("web-app-developer-remote");
      expect(rankByFit(a).map((f) => f.jobId)).not.toContain("product-designer-jeddah");
      expect(rankByFit(a)).toHaveLength(18);
    }
    expect(rankByFit({ ...DEMO_ANSWERS, education: "unknown" })).toHaveLength(20);
  });

  it("breaks ties by the interest term, then the lower band, then data order", () => {
    // software interest, cs major (software primary), no city, under a year (entry): frontend and qa tie at 80
    const a: OnboardingAnswers = {
      city: { value: "none", label: "" },
      education: "bachelor",
      major: { value: "cs", label: "حاسب وتقنية معلومات" },
      experience: "under1",
      interest: ["software"],
      priority: "explore",
    };
    const ranked = rankByFit(a);
    const scores = ranked.map((f) => f.score);
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
    // frontend 40+25+15+0 = 80; qa 80 too (entry, dammam): data order puts frontend first
    expect(ranked.slice(0, 2).map((f) => [f.jobId, f.score])).toEqual([
      ["frontend-developer-riyadh", 80],
      ["qa-tester-dammam", 80],
    ]);
  });
});
