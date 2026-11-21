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
    const thirds = matchBreakdown(getJob("jeeny-growth-insights-analytics-riyadh"), stars({ excel: 2, sql: 2, statistics: 1 }));
    expect(thirds.rows[1]?.points).toBeCloseTo(13.333, 2);
    expect(thirds.total).toBe(37);
  });

  it("9.8 check 5: with the sample CV every job's match is as listed; only the practice data analyst is ≥ 70", () => {
    const expected: Record<(typeof JOB_IDS)[number], number> = {
      "data-analyst-riyadh": 70,
      "jeeny-growth-insights-analytics-riyadh": 47,
      "qiddiya-hr-analytics-analyst-riyadh": 40,
      "ninja-real-estate-performance-analyst-riyadh": 43,
      "master-works-data-senior-engineer-riyadh": 53,
      "salla-senior-data-scientist-remote": 43,
      "lucidya-frontend-engineer-dammam": 0,
      "salla-senior-backend-checkout-remote": 43,
      "salla-senior-qa-engineer-remote": 20,
      "almajed-mobile-developer-riyadh": 40,
      "horizontal-graduate-designer-riyadh": 20,
      "flyakeed-product-designer-riyadh": 20,
      "lucidya-product-designer-riyadh": 20,
      "hungerstation-senior-product-designer-riyadh": 40,
      "salla-marketing-specialist-tamheer-jeddah": 10,
      "salla-mahally-seo-manager-jeddah": 40,
      "lucidya-social-media-analyst-riyadh": 40,
      "platinumlist-content-manager-riyadh": 40,
      "syarah-financial-analyst-tamheer-riyadh": 60,
      "foodics-accountant-erp-riyadh": 53,
      "master-works-ai-business-analyst-riyadh": 40,
      "maharah-business-development-specialist-riyadh": 30,
      "maharah-qa-analyst-riyadh": 40,
      "atheer-hr-specialist-riyadh": 20,
      "qiddiya-hris-specialist-riyadh": 0,
      "lucidya-people-operations-riyadh": 20,
      "tamara-people-business-partner-riyadh": 10,
      "lucidya-talent-acquisition-lead-riyadh": 40,
      // the expansion's 18
      "petroapp-product-manager-riyadh": 0,
      "salla-product-manager-storefront-jeddah": 20,
      "master-works-ai-product-manager-riyadh": 0,
      "taj-hr-cybersecurity-engineer-riyadh": 40,
      "mullers-solutions-soc-l2-specialist-riyadh": 40,
      "qiddiya-it-security-design-riyadh": 20,
      "lucidya-devops-engineer-riyadh": 0,
      "lucidya-site-reliability-engineer-riyadh": 0,
      "mozn-cloud-platform-engineer-riyadh": 20,
      "lamdax-ai-engineer-remote": 20,
      "foodics-ai-engineer-riyadh": 10,
      "mozn-ai-engineer-riyadh": 0,
      "foodics-field-sales-representative-riyadh": 50,
      "shipa-junior-business-development-executive-riyadh": 50,
      "petroapp-customer-success-specialist-riyadh": 30,
      "qiddiya-procurement-specialist-riyadh": 20,
      "ninja-procurement-cost-control-specialist-riyadh": 13,
      "hungerstation-junior-3pl-account-manager-riyadh": 10,
      // wave 2
      "almosafer-product-designer-riyadh": 10,
      "mrsool-creative-copywriter-riyadh": 30,
      "rentokil-customer-experience-specialist-riyadh": 40,
      "mrsool-customer-care-representative-riyadh": 20,
      "ninja-live-operations-supervisor-riyadh": 40,
      "teefnajd-site-engineer-riyadh": 20,
      "rawafid-site-civil-engineer-jeddah": 20,
      "matar-albaqmi-site-engineer-hvac-dammam": 0,
      "hanmiglobal-mechanical-engineer-riyadh": 0,
      "teefnajd-quality-control-engineer-riyadh": 20,
      "hanmiglobal-quality-inspector-electrical-riyadh": 20,
      "hanmiglobal-hse-engineer-riyadh": 40,
      "fuku-hse-engineer-dammam": 40,
      "aljomaih-graduate-development-engineering-riyadh": 20,
      "matar-albaqmi-planning-engineer-dammam": 40,
      "teefnajd-contract-engineer-riyadh": 10,
      "rawafid-erp-projects-cost-controller-jeddah": 20,
      "gathern-guest-relations-associate-riyadh": 40,
      "seven-guest-service-associate-riyadh": 40,
      "eram-event-management-coordinator-jeddah": 20,
      "waseel-rcm-specialist-riyadh": 20,
      "eram-associate-instructional-designer-dhahran": 20,
      "abis-industrial-skills-trainer-computer-dhahran": 20,
      "qiddiya-training-administration-senior-specialist-riyadh": 40,
      "tamara-collections-advisor-riyadh": 40,
      "tamara-compliance-officer-riyadh": 30,
      "tamara-compliance-senior-associate-riyadh": 30,
      "tamara-fraud-investigator-riyadh": 50,
      "pwc-assurance-coop-2027-riyadh": 40,
      "pwc-risk-internal-audit-senior-associate-jeddah": 30,
      "ey-senior-auditor-gcc-nationals-riyadh": 30,
      "webook-legal-analyst-riyadh": 40,
      "mozn-legal-specialist-riyadh": 20,
      "webook-legal-associate-riyadh": 20,
      "mozn-creative-design-motion-riyadh": 10,
      "chainreaction-multimedia-designer-riyadh": 0,
      "platinumlist-en-ar-content-manager-riyadh": 20,
      "qiddiya-gaming-esports-strategy-am-riyadh": 30,
      // wave 3
      "arabicai-machine-learning-engineer-riyadh": 10,
      "innovationteam-junior-ai-engineer-computer-vision-riyadh": 20,
      "mozn-data-scientist-iii-riyadh": 20,
      "masterworks-nabeh-ai-engineer-specialist-riyadh": 0,
      "tamara-builders-program-data-riyadh": 40,
      "arabicai-data-engineer-riyadh": 13,
      "lucidya-database-administrator-riyadh": 43,
      "squadio-odoo-frontend-developer-riyadh": 0,
      "lucidya-10x-software-engineer-riyadh": 23,
      "tawantech-java-developer-banking-riyadh": 10,
      "masterworks-adree-outsystems-dotnet-developer-riyadh": 50,
      "moyasar-software-engineer-full-stack-riyadh": 30,
      "lamdax-mobile-flutter-intern-remote": 20,
      "gathern-quality-assurance-engineer-riyadh": 20,
      "innovationteam-quality-assurance-engineer-riyadh": 30,
      "ninja-integration-specialist-riyadh": 40,
      "almosafer-specialist-product-designer-riyadh": 10,
      "eram-talent-ui-ux-designer-dhahran": 20,
      "jeeny-social-media-communication-specialist-riyadh": 10,
      "lucidya-activations-campaigns-intern-remote": 20,
      "lucidya-customer-product-marketing-intern-remote": 40,
      "tawantech-marketing-specialist-banking-riyadh": 20,
      "qiddiya-analyst-feasibilities-riyadh": 43,
      "accor-income-auditor-jeddah": 40,
      "aljomaih-accountant-saudi-nationals-dammam": 20,
      "clear-general-accountant-riyadh": 20,
      "mozn-revenue-assurance-officer-riyadh": 40,
      "ninja-invoice-matching-officer-jeddah": 20,
      "eram-accounts-payable-analyst-riyadh": 20,
      "eram-contracts-financial-analyst-jeddah": 20,
      "segadty-hr-coop-trainee-riyadh": 40,
      "accor-people-culture-executive-riyadh": 20,
      "lucid-payroll-analyst-riyadh": 40,
      "eram-smp-associate-hr-analyst-dhahran": 20,
      "ey-resource-management-workforce-planning-specialist-riyadh": 40,
      "saudi-azm-product-manager-riyadh": 20,
      "webook-product-manager-riyadh": 10,
      "arabicai-operations-security-engineer-riyadh": 0,
      "lucid-purple-teaming-engineer-riyadh": 10,
      "ninja-it-governance-analyst-riyadh": 40,
      "syarah-it-helpdesk-specialist-riyadh": 30,
      "bosch-software-development-intern-riyadh": 40,
      "deepsource-cloud-administrator-azure-riyadh": 20,
      "masterworks-soor-cloud-infrastructure-engineer-riyadh": 20,
      "saudi-azm-devops-engineer-riyadh": 20,
      "moomoo-brokerage-services-support-specialist-riyadh": 0,
      "rentokil-contact-center-specialist-riyadh": 30,
      "tamara-customer-care-advisor-non-voice-riyadh": 30,
      "hungerstation-account-manager-jeddah": 40,
      "marriott-sales-coordinator-riyadh": 10,
      "marriott-sales-executive-jeddah": 40,
      "thechefz-customer-care-specialist-riyadh": 10,
      "ninja-outbound-officer-jeddah": 40,
      "hungerstation-3pl-management-specialist-riyadh": 40,
      "syarah-fleet-purchasing-officer-riyadh": 40,
      "acwa-store-keeper-afif": 40,
      "sgs-junior-civil-structural-design-review-engineer-riyadh": 40,
      "teefnajd-junior-architect-engineer-riyadh": 40,
      "ultimate-peaks-quality-safety-officer-riyadh": 10,
      "accor-health-safety-fire-protection-specialist-riyadh": 40,
      "gathern-host-relations-associate-riyadh": 30,
      "marriott-voyage-food-beverage-jeddah": 50,
      "accor-sales-executive-social-events-weddings-al-khobar": 30,
      "eram-community-startups-coordinator-riyadh": 40,
      "eram-events-engagement-officer-jeddah": 0,
      "marriott-event-executive-riyadh": 30,
      "alborg-customer-care-officer-riyadh": 0,
      "aanaab-early-years-arabic-teacher-jeddah": 40,
      "accor-training-supervisor-riyadh": 50,
      "abbvie-national-field-trainer-riyadh": 40,
      "eram-academic-program-administrator-jeddah": 40,
      "eram-program-development-evaluation-analyst-riyadh": 20,
      "bank-of-jordan-financial-credit-analyst-riyadh": 40,
      "moyasar-aml-specialist-riyadh": 40,
      "ultimate-peaks-internal-auditor-operations-riyadh": 40,
      "bayut-dubizzle-legal-coordinator-tamheer-riyadh": 40,
      "khayira-legal-administrative-specialist-riyadh": 40,
      "alkaffary-legal-coordinator-riyadh": 20,
      "rawafid-governance-prequalification-officer-jeddah": 40,
      "flow-leasing-coordinator-riyadh": 40,
      "riyadhair-flight-following-specialist-riyadh": 40,
      "riyadhair-operations-controller-riyadh": 40,
      "accor-government-relations-supervisor-riyadh": 30,
      "qiddiya-analyst-government-relations-riyadh": 20,
      "jodayn-tamheer-internal-communications-riyadh": 30,
      "eram-media-content-creation-riyadh": 40,
      // wave 4 (21 Nov 2026): beginner roles
      "smart-social-media-trainee-jeddah": 20,
      "innovationteam-junior-accountant-riyadh": 40,
      "zaintech-business-development-associate-intern-riyadh": 40,
      "maharah-mechanical-engineer-fresh-graduate-riyadh": 40,
      "maharah-electrical-engineer-fresh-graduate-riyadh": 20,
      "smart-technology-solutions-it-trainee-jeddah": 40,
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
    // frontend: html-css · javascript (needs programming, unlisted) · react · git · apis
    const gap = jobGap("lucidya-frontend-engineer-dammam", newFacts());
    const prep = gap.rows.filter((r) => r.prep);
    expect(prep).toHaveLength(1);
    expect(prep[0]).toMatchObject({ skill: "programming", star: 1, gain: 0, matchAfter: 0 });
    // the sample CV proves programming: no preparatory row then
    expect(jobGap("lucidya-frontend-engineer-dammam", cvAnalysedFacts()).rows.some((r) => r.prep)).toBe(false);
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
    expect(projectedMatch("jeeny-growth-insights-analytics-riyadh", target, facts)).toBe(77);
    expect(projectedMatch("master-works-data-senior-engineer-riyadh", target, facts)).toBe(73);
    expect(projectedMatch("data-analyst-riyadh", target, facts)).toBe(100);
  });
});
