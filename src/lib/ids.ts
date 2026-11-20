// Owner: architect. FROZEN CONTRACT (change only through the lead): every agent codes against these names.
// Every id of the product spec as a runtime list, the union type derived from it, and a type guard.
// Ids are lowercase Latin with hyphens and never change once written (spec 9). Pure module: no imports.

function guard<T extends string>(list: readonly T[]): (value: unknown) => value is T {
  const set: ReadonlySet<string> = new Set(list);
  return (value: unknown): value is T => typeof value === "string" && set.has(value);
}

/**
 * Spec 9.1, in display order (tree, filters, CV results). 20 Nov 2026 expansion: «إدارة المنتجات» (product), «الأمن
 * السيبراني والسحابة» (cyber-cloud) and «المبيعات وسلاسل الإمداد» (sales-supply) after hr, so the seven original fields
 * keep their places (src/lib/data/expansion). Wave 2 (20 Nov 2026, src/lib/data/wave2): nine more fields (engineering,
 * project controls, tourism, health administration, education, banking and risk, legal, media, gaming) before professional.
 * Wave 3 (21 Nov 2026, src/lib/data/wave3): four more (energy and sustainability, real estate and facilities, aviation,
 * public relations and corporate communications), after wave 2's and before professional.
 */
export const FIELD_IDS = [
  "data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply",
  // wave 2 (src/lib/data/wave2)
  "engineering", "project-controls", "tourism-hospitality", "health-admin", "education", "banking-risk", "legal", "media", "gaming",
  // wave 3 (src/lib/data/wave3)
  "energy-sustainability", "real-estate", "aviation", "communications",
  "professional",
] as const;
export type FieldId = (typeof FIELD_IDS)[number];
export const isFieldId = guard(FIELD_IDS);

/** The fields that have jobs (spec 7.1 field filter): all but `professional`. */
export const JOB_FIELD_IDS = [
  "data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply",
  "engineering", "project-controls", "tourism-hospitality", "health-admin", "education", "banking-risk", "legal", "media", "gaming",
  "energy-sustainability", "real-estate", "aviation", "communications",
] as const;
export type JobFieldId = (typeof JOB_FIELD_IDS)[number];
export const isJobFieldId = guard(JOB_FIELD_IDS);

/**
 * Spec 9.2, in table order (which is also the order inside each field), plus the 16 skills of the 20 Nov 2026 expansion
 * (src/lib/data/expansion/skills.ts): deep-learning after ml, llm-apps after apis, and the product, cyber-cloud and
 * sales-supply fields before professional. A prerequisite is always listed before the skill that needs it.
 */
export const SKILL_IDS = [
  "excel", "sql", "statistics", "powerbi", "dataviz", "python-data", "ml", "deep-learning",
  "programming", "html-css", "git", "javascript", "react", "apis", "llm-apps",
  "design-basics", "figma", "ux-research", "ui-design", "prototyping",
  "marketing-basics", "content", "social-media", "seo", "ads",
  "project-management", "accounting", "agile", "business-analysis", "financial-analysis",
  "hr-basics", "recruitment", "labor-law", "training-dev", "payroll",
  "product-discovery", "product-roadmap", "product-specs", "product-analytics",
  "linux", "networking", "security-fundamentals", "soc-analysis", "cloud", "devops",
  "sales", "customer-success", "procurement", "supply-chain", "contact-center-ops", "cx-quality", "cx-analytics",
  // wave 2 (src/lib/data/wave2/skills.ts)
  "engineering-drawings", "hse", "quality-control", "site-execution", "mep-systems", "saudi-building-code",
  "planning-scheduling", "quantity-surveying", "bim-revit", "cost-control", "construction-contracts", "guest-service",
  "front-office", "event-planning", "tour-guiding", "medical-terminology", "medical-coding", "health-claims",
  "health-informatics", "instructional-design", "elearning-dev", "training-delivery", "banking-basics", "credit-analysis",
  "aml-compliance", "internal-audit", "legal-research", "contract-drafting", "corporate-governance", "video-editing",
  "motion-graphics", "translation", "arabic-editing", "game-design", "game-testing", "esports-community",
  // wave 3 (src/lib/data/wave3/skills.ts): the new fields' skills, and insurance (banking-risk), mobile (software) and
  // telecom (cyber-cloud) skills of older fields, all after wave 2's so every older index stays
  "esg-fundamentals", "esg-reporting", "carbon-accounting", "property-management", "facilities-management", "real-estate-valuation",
  "insurance-basics", "underwriting", "insurance-claims", "flutter", "ios-swift", "android-kotlin", "routing-switching",
  "mobile-networks", "fiber-optics", "aviation-ops", "ground-handling", "flight-dispatch", "public-relations",
  "corporate-communications", "government-relations",
  "communication", "english", "problem-solving", "presentation", "teamwork",
] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export const isSkillId = guard(SKILL_IDS);

/**
 * The jobs, in data order (the order breaks ties everywhere): the practice job «محلل بيانات» first (the demo's job, spec
 * 9.3), then the 27 real postings checked on 20 Nov 2026 (src/lib/data/jobs.ts; Maharah's two from its own careers board), by field,
 * each field's expansion postings after its own (src/lib/data/expansion/jobs.ts, 18 more), then the product, cyber-cloud
 * and sales-supply fields. New jobs come after the old ones of their field, so every tie the demo's reveal depends on stays.
 */
export const JOB_IDS = [
  "data-analyst-riyadh",
  // data
  "jeeny-growth-insights-analytics-riyadh", "qiddiya-hr-analytics-analyst-riyadh", "ninja-real-estate-performance-analyst-riyadh",
  "master-works-data-senior-engineer-riyadh", "salla-senior-data-scientist-remote",
  "lamdax-ai-engineer-remote", "mozn-ai-engineer-riyadh",
  // software
  "lucidya-frontend-engineer-dammam", "salla-senior-backend-checkout-remote", "salla-senior-qa-engineer-remote",
  "almajed-mobile-developer-riyadh", "foodics-ai-engineer-riyadh",
  // design
  "horizontal-graduate-designer-riyadh", "flyakeed-product-designer-riyadh", "lucidya-product-designer-riyadh",
  "hungerstation-senior-product-designer-riyadh",
  "almosafer-product-designer-riyadh",
  // marketing
  "salla-marketing-specialist-tamheer-jeddah", "salla-mahally-seo-manager-jeddah", "lucidya-social-media-analyst-riyadh",
  "platinumlist-content-manager-riyadh",
  "mrsool-creative-copywriter-riyadh",
  // business
  "syarah-financial-analyst-tamheer-riyadh", "foodics-accountant-erp-riyadh", "master-works-ai-business-analyst-riyadh",
  "maharah-business-development-specialist-riyadh", "maharah-qa-analyst-riyadh",
  // hr
  "atheer-hr-specialist-riyadh", "qiddiya-hris-specialist-riyadh", "lucidya-people-operations-riyadh",
  "tamara-people-business-partner-riyadh", "lucidya-talent-acquisition-lead-riyadh",
  // product
  "petroapp-product-manager-riyadh", "salla-product-manager-storefront-jeddah", "master-works-ai-product-manager-riyadh",
  // cyber-cloud
  "taj-hr-cybersecurity-engineer-riyadh", "mullers-solutions-soc-l2-specialist-riyadh", "qiddiya-it-security-design-riyadh",
  "lucidya-devops-engineer-riyadh", "lucidya-site-reliability-engineer-riyadh", "mozn-cloud-platform-engineer-riyadh",
  // sales-supply
  "foodics-field-sales-representative-riyadh", "shipa-junior-business-development-executive-riyadh",
  "petroapp-customer-success-specialist-riyadh",
  "qiddiya-procurement-specialist-riyadh", "ninja-procurement-cost-control-specialist-riyadh",
  "hungerstation-junior-3pl-account-manager-riyadh",
  "rentokil-customer-experience-specialist-riyadh", "mrsool-customer-care-representative-riyadh", "ninja-live-operations-supervisor-riyadh",
  // wave 2 (src/lib/data/wave2/jobs.ts): its postings of the old fields sit after each field's own (above), then the new fields
  // engineering
  "teefnajd-site-engineer-riyadh",
  "rawafid-site-civil-engineer-jeddah",
  "matar-albaqmi-site-engineer-hvac-dammam",
  "hanmiglobal-mechanical-engineer-riyadh",
  "teefnajd-quality-control-engineer-riyadh",
  "hanmiglobal-quality-inspector-electrical-riyadh",
  "hanmiglobal-hse-engineer-riyadh",
  "fuku-hse-engineer-dammam",
  // project-controls
  "aljomaih-graduate-development-engineering-riyadh",
  "matar-albaqmi-planning-engineer-dammam",
  "teefnajd-contract-engineer-riyadh",
  "rawafid-erp-projects-cost-controller-jeddah",
  // tourism-hospitality
  "gathern-guest-relations-associate-riyadh",
  "seven-guest-service-associate-riyadh",
  "eram-event-management-coordinator-jeddah",
  // health-admin
  "waseel-rcm-specialist-riyadh",
  // education
  "eram-associate-instructional-designer-dhahran",
  "abis-industrial-skills-trainer-computer-dhahran",
  "qiddiya-training-administration-senior-specialist-riyadh",
  // banking-risk
  "tamara-collections-advisor-riyadh",
  "tamara-compliance-officer-riyadh",
  "tamara-compliance-senior-associate-riyadh",
  "tamara-fraud-investigator-riyadh",
  "pwc-assurance-coop-2027-riyadh",
  "pwc-risk-internal-audit-senior-associate-jeddah",
  "ey-senior-auditor-gcc-nationals-riyadh",
  // legal
  "webook-legal-analyst-riyadh",
  "mozn-legal-specialist-riyadh",
  "webook-legal-associate-riyadh",
  // media
  "mozn-creative-design-motion-riyadh",
  "chainreaction-multimedia-designer-riyadh",
  "platinumlist-en-ar-content-manager-riyadh",
  // gaming
  "qiddiya-gaming-esports-strategy-am-riyadh",
  // wave 3 (src/lib/data/wave3/jobs.ts): after every older job (so no tie of the demo's reveal moves), by field
  // data
  "arabicai-machine-learning-engineer-riyadh",
  "innovationteam-junior-ai-engineer-computer-vision-riyadh",
  "mozn-data-scientist-iii-riyadh",
  "masterworks-nabeh-ai-engineer-specialist-riyadh",
  "tamara-builders-program-data-riyadh",
  "arabicai-data-engineer-riyadh",
  "lucidya-database-administrator-riyadh",
  // software
  "squadio-odoo-frontend-developer-riyadh",
  "lucidya-10x-software-engineer-riyadh",
  "tawantech-java-developer-banking-riyadh",
  "masterworks-adree-outsystems-dotnet-developer-riyadh",
  "moyasar-software-engineer-full-stack-riyadh",
  "lamdax-mobile-flutter-intern-remote",
  "gathern-quality-assurance-engineer-riyadh",
  "innovationteam-quality-assurance-engineer-riyadh",
  "ninja-integration-specialist-riyadh",
  // design
  "almosafer-specialist-product-designer-riyadh",
  "eram-talent-ui-ux-designer-dhahran",
  // marketing
  "jeeny-social-media-communication-specialist-riyadh",
  "lucidya-activations-campaigns-intern-remote",
  "lucidya-customer-product-marketing-intern-remote",
  "tawantech-marketing-specialist-banking-riyadh",
  // business
  "qiddiya-analyst-feasibilities-riyadh",
  "accor-income-auditor-jeddah",
  "aljomaih-accountant-saudi-nationals-dammam",
  "clear-general-accountant-riyadh",
  "mozn-revenue-assurance-officer-riyadh",
  "ninja-invoice-matching-officer-jeddah",
  "eram-accounts-payable-analyst-riyadh",
  "eram-contracts-financial-analyst-jeddah",
  // hr
  "segadty-hr-coop-trainee-riyadh",
  "accor-people-culture-executive-riyadh",
  "lucid-payroll-analyst-riyadh",
  "eram-smp-associate-hr-analyst-dhahran",
  "ey-resource-management-workforce-planning-specialist-riyadh",
  // product
  "saudi-azm-product-manager-riyadh",
  "webook-product-manager-riyadh",
  // cyber-cloud
  "arabicai-operations-security-engineer-riyadh",
  "lucid-purple-teaming-engineer-riyadh",
  "ninja-it-governance-analyst-riyadh",
  "syarah-it-helpdesk-specialist-riyadh",
  "bosch-software-development-intern-riyadh",
  "deepsource-cloud-administrator-azure-riyadh",
  "masterworks-soor-cloud-infrastructure-engineer-riyadh",
  "saudi-azm-devops-engineer-riyadh",
  // sales-supply
  "moomoo-brokerage-services-support-specialist-riyadh",
  "rentokil-contact-center-specialist-riyadh",
  "tamara-customer-care-advisor-non-voice-riyadh",
  "hungerstation-account-manager-jeddah",
  "marriott-sales-coordinator-riyadh",
  "marriott-sales-executive-jeddah",
  "thechefz-customer-care-specialist-riyadh",
  "ninja-outbound-officer-jeddah",
  "hungerstation-3pl-management-specialist-riyadh",
  "syarah-fleet-purchasing-officer-riyadh",
  "acwa-store-keeper-afif",
  // engineering
  "sgs-junior-civil-structural-design-review-engineer-riyadh",
  "teefnajd-junior-architect-engineer-riyadh",
  "ultimate-peaks-quality-safety-officer-riyadh",
  "accor-health-safety-fire-protection-specialist-riyadh",
  // tourism-hospitality
  "gathern-host-relations-associate-riyadh",
  "marriott-voyage-food-beverage-jeddah",
  "accor-sales-executive-social-events-weddings-al-khobar",
  "eram-community-startups-coordinator-riyadh",
  "eram-events-engagement-officer-jeddah",
  "marriott-event-executive-riyadh",
  // health-admin
  "alborg-customer-care-officer-riyadh",
  // education
  "aanaab-early-years-arabic-teacher-jeddah",
  "accor-training-supervisor-riyadh",
  "abbvie-national-field-trainer-riyadh",
  "eram-academic-program-administrator-jeddah",
  "eram-program-development-evaluation-analyst-riyadh",
  // banking-risk
  "bank-of-jordan-financial-credit-analyst-riyadh",
  "moyasar-aml-specialist-riyadh",
  "ultimate-peaks-internal-auditor-operations-riyadh",
  // legal
  "bayut-dubizzle-legal-coordinator-tamheer-riyadh",
  "khayira-legal-administrative-specialist-riyadh",
  "alkaffary-legal-coordinator-riyadh",
  "rawafid-governance-prequalification-officer-jeddah",
  // real-estate
  "flow-leasing-coordinator-riyadh",
  // aviation
  "riyadhair-flight-following-specialist-riyadh",
  "riyadhair-operations-controller-riyadh",
  // communications
  "accor-government-relations-supervisor-riyadh",
  "qiddiya-analyst-government-relations-riyadh",
  "jodayn-tamheer-internal-communications-riyadh",
  "eram-media-content-creation-riyadh",
] as const;
export type JobId = (typeof JOB_IDS)[number];
export const isJobId = guard(JOB_IDS);

/** Spec 9.4: one course per star slot, `c-{skill}-{star}`, in table order. 59 ids, plus the expansion's 21, wave 2's 68 and wave 3's 37 (185). */
export const COURSE_IDS = [
  "c-excel-1", "c-excel-2", "c-excel-3", "c-sql-1", "c-sql-2", "c-sql-3", "c-statistics-1", "c-statistics-2",
  "c-powerbi-1", "c-powerbi-2", "c-powerbi-3", "c-dataviz-1", "c-python-data-1", "c-ml-1", "c-deep-learning-1",
  "c-programming-1", "c-programming-2", "c-html-css-1", "c-git-1", "c-javascript-1", "c-javascript-2",
  "c-javascript-3", "c-react-1", "c-apis-1", "c-llm-apps-1",
  "c-design-basics-1", "c-figma-1", "c-figma-2", "c-figma-3", "c-ux-research-1", "c-ui-design-1", "c-ui-design-2",
  "c-prototyping-1",
  "c-marketing-basics-1", "c-content-1", "c-content-2", "c-social-media-1", "c-social-media-2", "c-seo-1", "c-ads-1",
  "c-project-management-1", "c-project-management-2", "c-agile-1", "c-business-analysis-1", "c-accounting-1",
  "c-financial-analysis-1", "c-financial-analysis-2",
  "c-hr-basics-1", "c-hr-basics-2", "c-recruitment-1", "c-recruitment-2", "c-labor-law-1", "c-payroll-1",
  "c-training-dev-1",
  "c-product-discovery-1", "c-product-roadmap-1", "c-product-roadmap-2", "c-product-specs-1", "c-product-analytics-1",
  "c-linux-1", "c-networking-1", "c-security-fundamentals-1", "c-security-fundamentals-2", "c-soc-analysis-1",
  "c-cloud-1", "c-cloud-2", "c-devops-1",
  "c-sales-1", "c-sales-2", "c-customer-success-1", "c-procurement-1", "c-supply-chain-1", "c-supply-chain-2",
  "c-contact-center-ops-1", "c-cx-quality-1", "c-cx-quality-2", "c-cx-analytics-1", "c-cx-analytics-2",
  // wave 2 (src/lib/data/wave2/courses.ts)
  "c-engineering-drawings-1", "c-engineering-drawings-2", "c-hse-1", "c-hse-2", "c-quality-control-1",
  "c-quality-control-2", "c-site-execution-1", "c-site-execution-2", "c-mep-systems-1", "c-mep-systems-2",
  "c-saudi-building-code-1", "c-planning-scheduling-1", "c-planning-scheduling-2", "c-quantity-surveying-1", "c-quantity-surveying-2",
  "c-bim-revit-1", "c-bim-revit-2", "c-cost-control-1", "c-cost-control-2", "c-construction-contracts-1",
  "c-guest-service-1", "c-front-office-1", "c-front-office-2", "c-event-planning-1", "c-event-planning-2",
  "c-tour-guiding-1", "c-tour-guiding-2", "c-medical-terminology-1", "c-medical-coding-1", "c-medical-coding-2",
  "c-health-claims-1", "c-health-informatics-1", "c-health-informatics-2", "c-instructional-design-1", "c-instructional-design-2",
  "c-elearning-dev-1", "c-elearning-dev-2", "c-training-delivery-1", "c-training-delivery-2", "c-banking-basics-1",
  "c-credit-analysis-1", "c-credit-analysis-2", "c-aml-compliance-1", "c-aml-compliance-2", "c-internal-audit-1",
  "c-internal-audit-2", "c-legal-research-1", "c-legal-research-2", "c-contract-drafting-1", "c-contract-drafting-2",
  "c-corporate-governance-1", "c-video-editing-1", "c-video-editing-2", "c-motion-graphics-1", "c-motion-graphics-2",
  "c-translation-1", "c-translation-2", "c-arabic-editing-1", "c-game-design-1", "c-game-design-2",
  "c-game-testing-1", "c-game-testing-2", "c-esports-community-1",
  // wave 3 (src/lib/data/wave3/courses.ts)
  "c-esg-fundamentals-1", "c-esg-reporting-1", "c-esg-reporting-2", "c-carbon-accounting-1", "c-carbon-accounting-2",
  "c-property-management-1", "c-property-management-2", "c-facilities-management-1", "c-facilities-management-2",
  "c-real-estate-valuation-1", "c-real-estate-valuation-2", "c-insurance-basics-1", "c-underwriting-1", "c-underwriting-2",
  "c-insurance-claims-1", "c-insurance-claims-2", "c-flutter-1", "c-flutter-2", "c-ios-swift-1", "c-ios-swift-2",
  "c-android-kotlin-1", "c-android-kotlin-2", "c-routing-switching-1", "c-routing-switching-2", "c-mobile-networks-1",
  "c-mobile-networks-2", "c-fiber-optics-1", "c-aviation-ops-1", "c-aviation-ops-2", "c-ground-handling-1",
  "c-ground-handling-2", "c-flight-dispatch-1", "c-public-relations-1", "c-public-relations-2",
  "c-corporate-communications-1", "c-corporate-communications-2", "c-government-relations-1",
  "c-communication-1", "c-communication-2", "c-english-1", "c-english-2", "c-presentation-1", "c-teamwork-1",
  "c-problem-solving-1",
] as const;
export type CourseId = (typeof COURSE_IDS)[number];
export const isCourseId = guard(COURSE_IDS);

/** The course that grants star `star` of `skill`, or null when the skill has fewer slots (spec 9.4). */
export function courseIdFor(skill: SkillId, star: number): CourseId | null {
  const id = `c-${skill}-${star}`;
  return isCourseId(id) ? id : null;
}

/** Spec 8.6, in table order (this order is used whenever badges are listed or compared). */
export const BADGE_IDS = [
  "first-steps", "goal-set", "cv-scanned", "first-application", "first-course", "five-courses",
  "streak-3", "streak-7", "ten-skills", "level-5", "job-ready", "top-ten",
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];
export const isBadgeId = guard(BADGE_IDS);

/** Spec 9.5. The signed-in user's own row is the literal "me", never one of these. */
export const LEADERBOARD_USER_IDS = [
  "u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11", "u12",
  "u13", "u14", "u15", "u16", "u17", "u18", "u19", "u20", "u21", "u22", "u23", "u24",
] as const;
export type LeaderboardUserId = (typeof LEADERBOARD_USER_IDS)[number];
export const isLeaderboardUserId = guard(LEADERBOARD_USER_IDS);

/** Spec 9.6. av-01..04 neutral (new-account defaults), 05..08 women, 09..12 men. Same union as `@/components/avatars`. */
export const AVATAR_IDS = [
  "av-01", "av-02", "av-03", "av-04", "av-05", "av-06", "av-07", "av-08", "av-09", "av-10", "av-11", "av-12",
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];
export const isAvatarId = guard(AVATAR_IDS);

/** Job cities (spec 9.3) and the jobs city filter (7.1, test ids `jobs-filter-city-{id}` plus `all`). */
export const JOB_CITY_IDS = ["riyadh", "jeddah", "dammam", "remote"] as const;
export type JobCityId = (typeof JOB_CITY_IDS)[number];
export const isJobCityId = guard(JOB_CITY_IDS);

/** Experience bands of a job (spec 9.3) and of an onboarding answer (4.6). */
export const EXPERIENCE_BANDS = ["entry", "junior", "mid"] as const;
export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number];

/** Spec 4.2: the six onboarding questions, always in this order. */
export const QUESTION_IDS = ["city", "education", "major", "experience", "interest", "priority"] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];
export const isQuestionId = guard(QUESTION_IDS);

/**
 * 20 Nov 2026 (owner's part 2): the onboarding conversation's seven steps, in the order «دليلك» asks them: the six questions
 * and, right after «الاهتمام», the optional «فيه شركة أو وظيفة معيّنة في بالك؟» (`company`, stored as `answers.company`).
 * The seventh stays out of QUESTION_IDS: the profile's «معلوماتي», the copy and the advisor print the six.
 */
export const ONBOARDING_STEP_IDS = ["city", "education", "major", "experience", "interest", "company", "priority"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];
export const isOnboardingStepId = guard(ONBOARDING_STEP_IDS);

/**
 * Real employers in Saudi Arabia «دليلك» knows by name (src/lib/data/companies.ts, checked 20 Nov 2026): the ones with a
 * careers page that opened, the companies of the real postings, and big names whose careers page did not open.
 */
export const COMPANY_IDS = [
  "aramco", "stc", "sabic", "zatca", "qiddiya", "salla", "mobily", "zain", "ejada", "foodics", "lucidya", "neom",
  "roshn", "hungerstation", "tabby", "almarai", "tamara", "pif", "misk",
  "jeeny", "ninja", "master-works", "almajed-oud", "horizontal-digital", "flyakeed", "platinumlist", "syarah", "atheer",
  "sdaia", "alrajhi", "snb", "riyad-bank", "sab", "elm", "red-sea-global", "maaden", "jahez",
  "maharah",
  // wave 2 (research/wave2/companies.json)
  "alinma", "anb", "bank-albilad", "bank-aljazira", "bsf", "d360", "saib", "stc-bank",
  "barq", "geidea", "hala", "lean-tech", "moyasar", "rasan", "wafeq", "alrajhi-takaful",
  "bupa-arabia", "tawuniya", "careem", "mozn", "mrsool", "nana", "rewaa", "sary",
  "tahakom", "takamol", "tamkeen-tech", "thiqah", "unifonic", "zid", "acwa-power", "advanced-petrochem",
  "sipchem", "tasnee", "nwc", "sar", "sec", "diriyah", "king-salman-park", "new-murabba",
  "rcu", "soudah", "sta", "almosafer", "flyadeal", "flynas", "riyadh-air", "saudia",
  "seera", "americana", "bindawood", "extra", "jarir", "nahdi", "savola", "dallah-health",
  "hmg", "lean-health", "mouwasat", "nupco", "saudi-german-health", "hrdf", "monshaat", "nhc",
  "efg", "manga-productions", "mbc", "savvy-games", "srmg",
  // wave 3: the companies of the wave-3 real postings (research/wave3, 21 Nov 2026)
  "arabic-ai", "innovationteam", "squadio", "tawantech", "lamdax", "saudi-azm", "webook", "lucid-motors", "bosch", "deepsource",
  "eram-talent", "gathern", "accor", "marriott", "aljomaih-energy-water", "clear", "segadty", "ey", "moomoo", "rentokil",
  "thechefz", "sgs", "teef-najd", "ultimate-peaks", "alborg", "aanaab", "abbvie", "bank-of-jordan", "bayut-dubizzle", "khayira",
  "alkaffary", "rawafid", "jodayn", "flow",
] as const;
export type CompanyId = (typeof COMPANY_IDS)[number];
export const isCompanyId = guard(COMPANY_IDS);

/** Chip option ids of each question (spec 4.2). Test id: `welcome-chip-{question}-{option}`. */
export const CITY_OPTIONS = ["riyadh", "jeddah", "dammam", "makkah", "madinah", "other"] as const;
export type CityOption = (typeof CITY_OPTIONS)[number];
export const EDUCATION_OPTIONS = ["secondary", "diploma", "bachelor", "postgrad", "student"] as const;
export type EducationOption = (typeof EDUCATION_OPTIONS)[number];
export const MAJOR_OPTIONS = [
  "cs", "mis", "business", "finance", "marketing", "hr", "design", "engineering", "science", "other",
] as const;
export type MajorOption = (typeof MAJOR_OPTIONS)[number];
export const EXPERIENCE_OPTIONS = ["none", "under1", "1to3", "over3"] as const;
export type ExperienceOption = (typeof EXPERIENCE_OPTIONS)[number];
export const INTEREST_OPTIONS = ["data", "software", "design", "marketing", "business", "hr", "unsure"] as const;
export type InterestOption = (typeof INTEREST_OPTIONS)[number];
export const PRIORITY_OPTIONS = ["first-job", "switch", "grow", "explore"] as const;
export type PriorityOption = (typeof PRIORITY_OPTIONS)[number];
/** The seventh step: every company «دليلك» knows (the tiles show the ones of the user's field) and «لا، مو الحين» (`none`). */
export const COMPANY_OPTIONS = [...COMPANY_IDS, "none"] as const;
export type CompanyOption = (typeof COMPANY_OPTIONS)[number];

/** Option ids per step, for generic code (`OPTIONS_BY_QUESTION[q]`; the model's onboarding classification checks ids here). */
export const OPTIONS_BY_QUESTION = {
  city: CITY_OPTIONS,
  education: EDUCATION_OPTIONS,
  major: MAJOR_OPTIONS,
  experience: EXPERIENCE_OPTIONS,
  interest: INTEREST_OPTIONS,
  company: COMPANY_OPTIONS,
  priority: PRIORITY_OPTIONS,
} as const satisfies Record<OnboardingStepId, readonly string[]>;
export interface OptionsByQuestion {
  city: CityOption;
  education: EducationOption;
  major: MajorOption;
  experience: ExperienceOption;
  interest: InterestOption;
  company: CompanyOption;
  priority: PriorityOption;
}
export function isOptionOf<Q extends OnboardingStepId>(question: Q, value: unknown): value is OptionsByQuestion[Q] {
  return typeof value === "string" && (OPTIONS_BY_QUESTION[question] as readonly string[]).includes(value);
}

/** Spec 3.9 / 7.5. */
export const APPLICATION_STATUSES = ["sent", "review", "shortlisted", "closed"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const isApplicationStatus = guard(APPLICATION_STATUSES);

/** Spec 8.1. */
export const XP_EVENT_TYPES = [
  "onboarding_completed", "target_set", "cv_analysed", "course_completed", "job_applied", "daily_reward",
] as const;
export type XpEventType = (typeof XP_EVENT_TYPES)[number];

/** Spec 10.3. `?seed={name}`. */
export const SEED_NAMES = ["fresh", "onboarded", "cv-analysed", "course-done", "mid-path", "job-ready", "returning"] as const;
export type SeedName = (typeof SEED_NAMES)[number];
export const isSeedName = guard(SEED_NAMES);

/** Spec 2.2 / 3.10: `/learn?tab=`. Test ids `learn-tab-{tab}`. */
export const LEARN_TABS = ["path", "explore", "done"] as const;
export type LearnTab = (typeof LEARN_TABS)[number];
export const isLearnTab = guard(LEARN_TABS);

/** Spec 5.3 `navigate.screen`: every app-shell screen. */
export const NAV_SCREENS = [
  "path", "skills", "cv", "jobs", "job", "applications", "learn", "course", "leaderboard", "profile",
] as const;
export type NavScreen = (typeof NAV_SCREENS)[number];
export const isNavScreen = guard(NAV_SCREENS);

/** Spec 5.8: page chip slugs. Test id `advisor-chip-{slug}`; the slug is also the intent the chip carries. */
export const PAGE_CHIP_SLUGS = [
  "next-step", "why-path", "remaining",
  "skill-start", "gap", "stars-how",
  "cv-what", "cv-none",
  "jobs-data-riyadh", "best-job", "jobs-remote",
  "why-match", "apply", "set-target",
  "applications-status",
  "course-start", "courses-path", "courses-short",
  "course-what", "start-course", "course-gain",
  "rank-how", "rank-gap",
  "badge-next", "level-how",
] as const;
export type PageChipSlug = (typeof PAGE_CHIP_SLUGS)[number];
export const isPageChipSlug = guard(PAGE_CHIP_SLUGS);

/** Spec 5.3: the thirteen advisor tools. */
export const TOOL_NAMES = [
  "navigate", "search_jobs", "get_job_gap", "explain_match", "recommend_next_step", "list_courses", "get_course",
  "start_course", "apply_to_job", "list_applications", "set_target_job", "get_leaderboard", "list_badges",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
export const isToolName = guard(TOOL_NAMES);

/** Spec 5.4: the only three tools that change the user's state. */
export const STATE_CHANGING_TOOLS = ["start_course", "apply_to_job", "set_target_job"] as const satisfies readonly ToolName[];
export type StateChangingTool = (typeof STATE_CHANGING_TOOLS)[number];
