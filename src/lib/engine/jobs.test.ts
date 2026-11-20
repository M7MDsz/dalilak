import { describe, expect, it } from "vitest";

import { JOB_IDS } from "@/lib/ids";
import { getJob } from "@/lib/data";

import { jobsRequiringSkill, rankJobs, searchJobs } from "./jobs";
import { rankByFit } from "./onboarding-fit";
import { MINUTE, T0, applied, completed, cvAnalysedFacts, newFacts, onboarded, quiet, targeted } from "./test-fixtures";

const t = T0.getTime();

describe("rankJobs (spec 7.2)", () => {
  it("after the sample CV, the first eight in order (the practice job first, then the real postings)", () => {
    const ranked = rankJobs(cvAnalysedFacts());
    expect(ranked).toHaveLength(JOB_IDS.length);
    // 20 Nov 2026 expansion: two new sales postings at 50% come in after the two 53% jobs; wave 2's fraud investigator
    // (Tamara, 50%) follows them; wave 3's OutSystems developer (Master-Works, 50%) comes after the older 50% ones; the top
    // three (demo step 6) hold
    // 21 Nov 2026 (owner: the jobs shown must relate to the path): the target's field (data) first, by match
    // 21 Nov 2026: the target's field first, jobs within reach of a new graduate before the senior ones, then by match
    expect(ranked.slice(0, 8).map((r) => [getJob(r.jobId).title, r.match])).toEqual([
      ["محلل بيانات", 70],
      ["محلل أداء عقاري", 43],
      ["محلل تحليلات وتقارير الموارد البشرية", 40],
      ["برنامج تمارا للخريجين (Builders) - مسار البيانات", 40],
      ["مهندس ذكاء اصطناعي مبتدئ (رؤية حاسوبية)", 20],
      ["مهندس ذكاء اصطناعي", 20],
      ["مهندس بيانات أول", 53],
      ["مدير نمو - رؤى وتحليلات", 47],
    ]);
    expect(ranked[0]).toMatchObject({ jobId: "data-analyst-riyadh", isTarget: true, applied: false, missing: ["powerbi", "statistics"] });
    expect(ranked.find((r) => r.jobId === "syarah-financial-analyst-tamheer-riyadh")?.missing).toEqual(["accounting", "financial-analysis"]);
  });

  it("ties: the target first, then the user's city, then an interest's field, then data order", () => {
    // at 40%: eight Riyadh jobs (the data one first: an interest's field) and the SEO manager in Jeddah
    const f = cvAnalysedFacts();
    const at40 = (facts: typeof f) => rankJobs(facts).filter((r) => r.match === 40).map((r) => r.jobId);
    expect(at40(f)).toEqual([
      // 21 Nov 2026: the target's field first, then within reach of the user's band, then the rest
      "qiddiya-hr-analytics-analyst-riyadh",
      "tamara-builders-program-data-riyadh",
      "maharah-qa-analyst-riyadh",
      "rentokil-customer-experience-specialist-riyadh",
      "hanmiglobal-hse-engineer-riyadh",
      "gathern-guest-relations-associate-riyadh",
      "seven-guest-service-associate-riyadh",
      "tamara-collections-advisor-riyadh",
      "pwc-assurance-coop-2027-riyadh",
      "webook-legal-analyst-riyadh",
      "ninja-integration-specialist-riyadh",
      "mozn-revenue-assurance-officer-riyadh",
      "segadty-hr-coop-trainee-riyadh",
      "lucid-payroll-analyst-riyadh",
      "ninja-it-governance-analyst-riyadh",
      "bosch-software-development-intern-riyadh",
      "hungerstation-3pl-management-specialist-riyadh",
      "syarah-fleet-purchasing-officer-riyadh",
      "sgs-junior-civil-structural-design-review-engineer-riyadh",
      "teefnajd-junior-architect-engineer-riyadh",
      "eram-community-startups-coordinator-riyadh",
      "bank-of-jordan-financial-credit-analyst-riyadh",
      "moyasar-aml-specialist-riyadh",
      "bayut-dubizzle-legal-coordinator-tamheer-riyadh",
      "khayira-legal-administrative-specialist-riyadh",
      "flow-leasing-coordinator-riyadh",
      "lucidya-customer-product-marketing-intern-remote",
      "accor-income-auditor-jeddah",
      "hungerstation-account-manager-jeddah",
      "marriott-sales-executive-jeddah",
      "ninja-outbound-officer-jeddah",
      "aanaab-early-years-arabic-teacher-jeddah",
      "rawafid-governance-prequalification-officer-jeddah",
      "almajed-mobile-developer-riyadh",
      "hungerstation-senior-product-designer-riyadh",
      "lucidya-social-media-analyst-riyadh",
      "platinumlist-content-manager-riyadh",
      "master-works-ai-business-analyst-riyadh",
      "lucidya-talent-acquisition-lead-riyadh",
      "taj-hr-cybersecurity-engineer-riyadh",
      "mullers-solutions-soc-l2-specialist-riyadh",
      "ninja-live-operations-supervisor-riyadh",
      "qiddiya-training-administration-senior-specialist-riyadh",
      "ey-resource-management-workforce-planning-specialist-riyadh",
      "acwa-store-keeper-afif",
      "accor-health-safety-fire-protection-specialist-riyadh",
      "abbvie-national-field-trainer-riyadh",
      "ultimate-peaks-internal-auditor-operations-riyadh",
      "riyadhair-flight-following-specialist-riyadh",
      "riyadhair-operations-controller-riyadh",
      "eram-media-content-creation-riyadh",
      "salla-mahally-seo-manager-jeddah",
      "fuku-hse-engineer-dammam",
      "matar-albaqmi-planning-engineer-dammam",
      "eram-academic-program-administrator-jeddah",
    ]);
    // living in Jeddah with an interest in marketing: Jeddah first; then the marketing jobs; then data order
    const jeddah = { ...f, answers: { ...f.answers, city: { value: "jeddah" as const, label: "جدة" }, interest: ["marketing"] as const } };
    expect(at40(jeddah)).toEqual([
      // 21 Nov 2026: the suited fields first, then within reach, then Jeddah, then data order
      "lucidya-customer-product-marketing-intern-remote",
      "qiddiya-hr-analytics-analyst-riyadh",
      "tamara-builders-program-data-riyadh",
      "salla-mahally-seo-manager-jeddah",
      "lucidya-social-media-analyst-riyadh",
      "platinumlist-content-manager-riyadh",
      "accor-income-auditor-jeddah",
      "hungerstation-account-manager-jeddah",
      "marriott-sales-executive-jeddah",
      "ninja-outbound-officer-jeddah",
      "aanaab-early-years-arabic-teacher-jeddah",
      "rawafid-governance-prequalification-officer-jeddah",
      "maharah-qa-analyst-riyadh",
      "rentokil-customer-experience-specialist-riyadh",
      "hanmiglobal-hse-engineer-riyadh",
      "gathern-guest-relations-associate-riyadh",
      "seven-guest-service-associate-riyadh",
      "tamara-collections-advisor-riyadh",
      "pwc-assurance-coop-2027-riyadh",
      "webook-legal-analyst-riyadh",
      "ninja-integration-specialist-riyadh",
      "mozn-revenue-assurance-officer-riyadh",
      "segadty-hr-coop-trainee-riyadh",
      "lucid-payroll-analyst-riyadh",
      "ninja-it-governance-analyst-riyadh",
      "bosch-software-development-intern-riyadh",
      "hungerstation-3pl-management-specialist-riyadh",
      "syarah-fleet-purchasing-officer-riyadh",
      "sgs-junior-civil-structural-design-review-engineer-riyadh",
      "teefnajd-junior-architect-engineer-riyadh",
      "eram-community-startups-coordinator-riyadh",
      "bank-of-jordan-financial-credit-analyst-riyadh",
      "moyasar-aml-specialist-riyadh",
      "bayut-dubizzle-legal-coordinator-tamheer-riyadh",
      "khayira-legal-administrative-specialist-riyadh",
      "flow-leasing-coordinator-riyadh",
      "eram-academic-program-administrator-jeddah",
      "almajed-mobile-developer-riyadh",
      "hungerstation-senior-product-designer-riyadh",
      "master-works-ai-business-analyst-riyadh",
      "lucidya-talent-acquisition-lead-riyadh",
      "taj-hr-cybersecurity-engineer-riyadh",
      "mullers-solutions-soc-l2-specialist-riyadh",
      "ninja-live-operations-supervisor-riyadh",
      "fuku-hse-engineer-dammam",
      "matar-albaqmi-planning-engineer-dammam",
      "qiddiya-training-administration-senior-specialist-riyadh",
      "ey-resource-management-workforce-planning-specialist-riyadh",
      "acwa-store-keeper-afif",
      "accor-health-safety-fire-protection-specialist-riyadh",
      "abbvie-national-field-trainer-riyadh",
      "ultimate-peaks-internal-auditor-operations-riyadh",
      "riyadhair-flight-following-specialist-riyadh",
      "riyadhair-operations-controller-riyadh",
      "eram-media-content-creation-riyadh",
    ]);
    // the target beats everything at the same match
    expect(at40({ ...f, targetJobId: "salla-mahally-seo-manager-jeddah" })[0]).toBe("salla-mahally-seo-manager-jeddah");
  });

  it("while the user holds no star: every match is 0 and the order is the fit score (4.6)", () => {
    const f = quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t));
    const ranked = rankJobs(f);
    expect(ranked.every((r) => r.match === 0)).toBe(true);
    expect(ranked.slice(0, 5).map((r) => [r.jobId, r.fit])).toEqual([
      ["data-analyst-riyadh", 100],
      ["qiddiya-hr-analytics-analyst-riyadh", 100],
      // wave 3: Tamara's entry data programme ties at 100, after the two the reveal names (data order)
      ["tamara-builders-program-data-riyadh", 100],
      ["lamdax-ai-engineer-remote", 96],
      ["ninja-real-estate-performance-analyst-riyadh", 82],
    ]);
    expect(ranked.map((r) => r.jobId).slice(0, rankByFit(f.answers).length)).toEqual(rankByFit(f.answers).map((r) => r.jobId));
  });

  it("a course star alone switches the order to the match (7.2: «from a CV or from a course»)", () => {
    const f = completed(quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t)), "c-excel-1", t + MINUTE, 160);
    const ranked = rankJobs(f);
    expect(ranked[0]?.match).toBeGreaterThan(0);
    // the target's field first (21 Nov 2026), then the rest; inside each group the match decides
    const inField = (r: (typeof ranked)[number]) => getJob(r.jobId).field === getJob("data-analyst-riyadh").field;
    const split = ranked.findIndex((r) => !inField(r));
    expect(split).toBeGreaterThan(0);
    expect(ranked.slice(split).some(inField)).toBe(false);
    // inside each field group: the jobs within reach of a new graduate (entry, junior) first, then the match decides
    const reach = (r: (typeof ranked)[number]) => getJob(r.jobId).band !== "mid";
    for (const group of [ranked.slice(0, split), ranked.slice(split)]) {
      const cut = group.findIndex((r) => !reach(r));
      const parts = cut === -1 ? [group] : [group.slice(0, cut), group.slice(cut)];
      if (cut !== -1) expect(group.slice(cut).some(reach)).toBe(false);
      for (const part of parts) expect(part.map((r) => r.match)).toEqual([...part.map((r) => r.match)].sort((a, b) => b - a));
    }
  });

  it("the education gate sends mid-level jobs to the end of the fit order, still listing every job", () => {
    const f = quiet(targeted(onboarded(newFacts(), t, { ...cvAnalysedFacts().answers, education: "student", interest: ["software"] }), "lucidya-frontend-engineer-dammam", t));
    const ranked = rankJobs(f);
    expect(ranked).toHaveLength(JOB_IDS.length);
    const mids = JOB_IDS.filter((id) => getJob(id).band === "mid");
    expect(ranked.slice(-mids.length).map((r) => r.jobId).sort()).toEqual([...mids].sort());
  });

  it("flags applied jobs", () => {
    const f = applied(cvAnalysedFacts(), "data-analyst-riyadh", t + 10 * MINUTE, 70);
    expect(rankJobs(f).find((r) => r.jobId === "data-analyst-riyadh")?.applied).toBe(true);
  });
});

describe("searchJobs (spec 7.1)", () => {
  it("«محلل بيانات» in Riyadh returns the data analyst first, then the analysts of the data field", () => {
    const hits = searchJobs(cvAnalysedFacts(), { q: "محلل بيانات", city: "riyadh" }).map((r) => r.jobId);
    expect(hits).toEqual([
      "data-analyst-riyadh",
      "ninja-real-estate-performance-analyst-riyadh",
      "qiddiya-hr-analytics-analyst-riyadh",
      "maharah-qa-analyst-riyadh",
    ]);
  });

  it("finds a real job by the company's own name, in English or Arabic", () => {
    const f = cvAnalysedFacts();
    const salla = searchJobs(f, { q: "Salla" }).map((r) => r.jobId).sort();
    expect(salla).toEqual([
      "salla-mahally-seo-manager-jeddah",
      "salla-marketing-specialist-tamheer-jeddah",
      "salla-product-manager-storefront-jeddah",
      "salla-senior-backend-checkout-remote",
      "salla-senior-data-scientist-remote",
      "salla-senior-qa-engineer-remote",
    ]);
    expect(searchJobs(f, { q: "سلة" }).map((r) => r.jobId).sort()).toEqual(salla);
  });

  it("ignores «ال», diacritics and letter case; every word must be found", () => {
    const f = cvAnalysedFacts();
    expect(searchJobs(f, { q: "البيانات" }).length).toBeGreaterThanOrEqual(4);
    expect(searchJobs(f, { q: "power bi" }).map((r) => r.jobId).sort()).toEqual(
      [
        "data-analyst-riyadh",
        "jeeny-growth-insights-analytics-riyadh",
        "master-works-data-senior-engineer-riyadh",
        "ninja-real-estate-performance-analyst-riyadh",
        "qiddiya-hr-analytics-analyst-riyadh",
        "qiddiya-hris-specialist-riyadh",
        "qiddiya-training-administration-senior-specialist-riyadh",
        // wave 3
        "arabicai-machine-learning-engineer-riyadh",
        "eram-accounts-payable-analyst-riyadh",
        "eram-smp-associate-hr-analyst-dhahran",
        "ultimate-peaks-internal-auditor-operations-riyadh",
      ].sort(),
    );
    expect(searchJobs(f, { q: "مصمّم" }).map((r) => r.jobId).sort()).toEqual(
      [
        "horizontal-graduate-designer-riyadh",
        "hungerstation-senior-product-designer-riyadh",
        "lucidya-product-designer-riyadh",
        // wave 2
        "almosafer-product-designer-riyadh",
        "eram-associate-instructional-designer-dhahran",
        "chainreaction-multimedia-designer-riyadh",
        // wave 3
        "eram-talent-ui-ux-designer-dhahran",
      ].sort(),
    );
    expect(searchJobs(f, { q: "محلل زرافة" })).toEqual([]);
    expect(searchJobs(f, { q: "  " })).toHaveLength(JOB_IDS.length);
  });

  it("finds while typing (a word of the job that starts with the query word)", () => {
    expect(searchJobs(cvAnalysedFacts(), { q: "محل", city: "riyadh" }).map((r) => r.jobId)).toEqual(
      searchJobs(cvAnalysedFacts(), { q: "محلل", city: "riyadh" }).map((r) => r.jobId),
    );
  });

  it("combines search, city, field and skill with AND, keeping the ranking", () => {
    const f = cvAnalysedFacts();
    expect(searchJobs(f, { city: "remote" }).map((r) => r.jobId).sort()).toEqual(
      [
        "lamdax-ai-engineer-remote", "salla-senior-backend-checkout-remote", "salla-senior-data-scientist-remote", "salla-senior-qa-engineer-remote",
        // wave 3
        "lamdax-mobile-flutter-intern-remote", "lucidya-activations-campaigns-intern-remote", "lucidya-customer-product-marketing-intern-remote",
      ].sort(),
    );
    // the Tamheer role (within reach of a new graduate) before the SEO manager (mid), 21 Nov 2026
    expect(searchJobs(f, { field: "marketing", city: "jeddah" }).map((r) => r.jobId)).toEqual([
      "salla-marketing-specialist-tamheer-jeddah",
      "salla-mahally-seo-manager-jeddah",
    ]);
    expect(searchJobs(f, { skill: "powerbi" }).map((r) => r.jobId)).toEqual([
      "data-analyst-riyadh",
      "ninja-real-estate-performance-analyst-riyadh",
      "qiddiya-hr-analytics-analyst-riyadh",
      "master-works-data-senior-engineer-riyadh",
      "jeeny-growth-insights-analytics-riyadh",
      "arabicai-machine-learning-engineer-riyadh",
      "qiddiya-hris-specialist-riyadh",
      "qiddiya-training-administration-senior-specialist-riyadh",
      "ultimate-peaks-internal-auditor-operations-riyadh",
      "eram-accounts-payable-analyst-riyadh",
      "eram-smp-associate-hr-analyst-dhahran",
    ]);
    expect(searchJobs(f, { skill: "seo", city: "jeddah" }).map((r) => r.jobId)).toEqual(["salla-mahally-seo-manager-jeddah"]);
  });
});

describe("jobsRequiringSkill (spec 3.5)", () => {
  it("lists exactly the jobs that require a skill, in data order", () => {
    expect(jobsRequiringSkill("powerbi")).toEqual([
      "data-analyst-riyadh",
      "jeeny-growth-insights-analytics-riyadh",
      "qiddiya-hr-analytics-analyst-riyadh",
      "ninja-real-estate-performance-analyst-riyadh",
      "master-works-data-senior-engineer-riyadh",
      "qiddiya-hris-specialist-riyadh",
      "qiddiya-training-administration-senior-specialist-riyadh",
      // wave 3
      "arabicai-machine-learning-engineer-riyadh",
      "eram-accounts-payable-analyst-riyadh",
      "eram-smp-associate-hr-analyst-dhahran",
      "ultimate-peaks-internal-auditor-operations-riyadh",
    ]);
    expect(jobsRequiringSkill("python-data")).toEqual([
      "salla-senior-data-scientist-remote", "lamdax-ai-engineer-remote",
      // wave 3
      "arabicai-machine-learning-engineer-riyadh", "innovationteam-junior-ai-engineer-computer-vision-riyadh", "mozn-data-scientist-iii-riyadh",
      "masterworks-nabeh-ai-engineer-specialist-riyadh", "arabicai-data-engineer-riyadh",
    ]);
    expect(jobsRequiringSkill("ml")).toEqual([
      "lamdax-ai-engineer-remote", "mozn-ai-engineer-riyadh", "salla-product-manager-storefront-jeddah",
      // wave 3
      "arabicai-machine-learning-engineer-riyadh", "innovationteam-junior-ai-engineer-computer-vision-riyadh", "mozn-data-scientist-iii-riyadh",
      "masterworks-nabeh-ai-engineer-specialist-riyadh", "tamara-builders-program-data-riyadh",
    ]);
    expect(jobsRequiringSkill("ads")).toEqual([]);
  });
});
