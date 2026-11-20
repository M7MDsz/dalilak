import { describe, expect, it } from "vitest";

import { getJob } from "@/lib/data";
import { JOB_IDS } from "@/lib/ids";
import type { OnboardingAnswers } from "@/lib/types";

import { fitBreakdown, fitReasons, rankByFit, recommend } from "./onboarding-fit";
import { DEMO_ANSWERS } from "./test-fixtures";

describe("fit score (spec 4.6)", () => {
  it("9.8 check 6: the worked example scores 100 / 100 / 82 / 71 / 47 with these terms", () => {
    const rows = (["data-analyst-riyadh", "qiddiya-hr-analytics-analyst-riyadh", "ninja-real-estate-performance-analyst-riyadh", "salla-senior-data-scientist-remote", "syarah-financial-analyst-tamheer-riyadh"] as const).map(
      (id) => fitBreakdown(id, DEMO_ANSWERS),
    );
    expect(rows.map((r) => [r.terms.interest, r.terms.major, r.terms.experience, r.terms.city, r.terms.priority, r.score])).toEqual([
      [40, 25, 15, 10, 10, 100],
      [40, 25, 15, 10, 10, 100],
      [40, 25, 7, 10, 0, 82],
      [40, 25, 0, 6, 0, 71],
      [0, 12, 15, 10, 10, 47],
    ]);
    expect(rows.every((r) => !r.excluded)).toBe(true);
  });

  it("ranks: the practice data analyst first (data order breaks the tie at 100), then the real data jobs", () => {
    // 20 Nov 2026 expansion: the remote entry AI engineer (Lamdax, data field) scores 96, under the two at 100, so the
    // reveal still recommends the practice job with the HR-analytics analyst
    expect(rankByFit(DEMO_ANSWERS).slice(0, 5).map((f) => [f.jobId, f.score])).toEqual([
      ["data-analyst-riyadh", 100],
      ["qiddiya-hr-analytics-analyst-riyadh", 100],
      // wave 3 (21 Nov 2026): Tamara's entry data programme in Riyadh also scores 100; it sits after every older job in data
      // order, so the two the reveal names stay first
      ["tamara-builders-program-data-riyadh", 100],
      ["lamdax-ai-engineer-remote", 96],
      ["ninja-real-estate-performance-analyst-riyadh", 82],
    ]);
  });

  it("recommends the data analyst, the HR-analytics analyst, and the financial analyst from another field, with three reasons", () => {
    expect(recommend(DEMO_ANSWERS)).toEqual({
      recommended: "data-analyst-riyadh",
      alternatives: ["qiddiya-hr-analytics-analyst-riyadh", "syarah-financial-analyst-tamheer-riyadh"],
      reasons: [
        { kind: "interest", interest: "data" },
        { kind: "major", tier: "primary", majorLabel: "نظم معلومات إدارية" },
        { kind: "experience", band: "entry" },
      ],
    });
    expect(fitReasons("data-analyst-riyadh", DEMO_ANSWERS)).toEqual(recommend(DEMO_ANSWERS).reasons);
  });

  it("gives any job its own reasons, in 4.6 order, up to three", () => {
    // financial analyst (business): major secondary · entry band · Riyadh · first job → the first three
    expect(fitReasons("syarah-financial-analyst-tamheer-riyadh", DEMO_ANSWERS)).toEqual([
      { kind: "major", tier: "secondary", majorLabel: "نظم معلومات إدارية" },
      { kind: "experience", band: "entry" },
      { kind: "city", cityLabel: "الرياض" },
    ]);
    // real-estate performance analyst (junior: 7 experience points are not a reason): interest, major, city
    expect(fitReasons("ninja-real-estate-performance-analyst-riyadh", DEMO_ANSWERS)).toEqual([
      { kind: "interest", interest: "data" },
      { kind: "major", tier: "primary", majorLabel: "نظم معلومات إدارية" },
      { kind: "city", cityLabel: "الرياض" },
    ]);
    // remote (every remote posting is mid-level, so over three years is a reason too)
    const noCity: OnboardingAnswers = { ...DEMO_ANSWERS, city: { value: "none", label: "" }, interest: ["unsure"], major: { value: "other", label: "تخصص آخر" }, experience: "over3" };
    expect(fitReasons("salla-senior-data-scientist-remote", noCity)).toEqual([{ kind: "experience", band: "mid" }, { kind: "remote" }]);
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
    // frontend: entry band (two bands from mid), Dammam, software
    expect(fitBreakdown("lucidya-frontend-engineer-dammam", nothing).score).toBe(0);
    expect(fitReasons("lucidya-frontend-engineer-dammam", nothing)).toEqual([{ kind: "none" }]);
  });

  it("second interest scores 30; priorities switch and grow", () => {
    const two: OnboardingAnswers = { ...DEMO_ANSWERS, interest: ["marketing", "data"], priority: "switch" };
    const da = fitBreakdown("data-analyst-riyadh", two);
    expect(da.terms.interest).toBe(30);
    // switch: the field is an interest but it IS the major's primary field (data for mis) → 0
    expect(da.terms.priority).toBe(0);
    expect(fitBreakdown("salla-marketing-specialist-tamheer-jeddah", two).terms).toMatchObject({ interest: 40, priority: 10 });
    const grow: OnboardingAnswers = { ...DEMO_ANSWERS, priority: "grow" };
    expect(fitBreakdown("data-analyst-riyadh", grow).terms.priority).toBe(10);
    expect(fitBreakdown("syarah-financial-analyst-tamheer-riyadh", grow).terms.priority).toBe(0);
  });

  it("the education gate leaves mid-level jobs out for secondary, diploma and student", () => {
    for (const education of ["secondary", "diploma", "student"] as const) {
      const a: OnboardingAnswers = { ...DEMO_ANSWERS, education };
      expect(fitBreakdown("salla-senior-backend-checkout-remote", a).excluded).toBe(true);
      expect(rankByFit(a).map((f) => f.jobId)).not.toContain("salla-senior-backend-checkout-remote");
      expect(rankByFit(a).map((f) => f.jobId)).not.toContain("lucidya-product-designer-riyadh");
      expect(rankByFit(a)).toHaveLength(JOB_IDS.filter((id) => getJob(id).band !== "mid").length);
    }
    expect(rankByFit({ ...DEMO_ANSWERS, education: "unknown" })).toHaveLength(JOB_IDS.length);
  });

  it("breaks ties by the interest term, then the lower band, then data order", () => {
    // software interest, cs major (software primary), no city, under a year (entry): the two remote Salla jobs tie at 71
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
    // frontend 40+25+15+0 = 80; the expansion's junior AI engineer 40+25+7+0 = 72; backend and QA 40+25+0+6 = 71 each
    // (both mid, remote): data order puts backend first. Wave 3 (21 Nov 2026): the entry remote Flutter intern 40+25+15+6 =
    // 86 leads, and four junior Riyadh software postings join the AI engineer at 72, after it in data order
    expect(ranked.slice(0, 9).map((f) => [f.jobId, f.score])).toEqual([
      ["lamdax-mobile-flutter-intern-remote", 86],
      ["lucidya-frontend-engineer-dammam", 80],
      ["foodics-ai-engineer-riyadh", 72],
      ["masterworks-adree-outsystems-dotnet-developer-riyadh", 72],
      ["moyasar-software-engineer-full-stack-riyadh", 72],
      ["gathern-quality-assurance-engineer-riyadh", 72],
      ["ninja-integration-specialist-riyadh", 72],
      ["salla-senior-backend-checkout-remote", 71],
      ["salla-senior-qa-engineer-remote", 71],
    ]);
  });
});
