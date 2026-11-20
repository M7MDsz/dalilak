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
 * keep their places (src/lib/data/expansion).
 */
export const FIELD_IDS = [
  "data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply", "professional",
] as const;
export type FieldId = (typeof FIELD_IDS)[number];
export const isFieldId = guard(FIELD_IDS);

/** The fields that have jobs (spec 7.1 field filter): all but `professional`. */
export const JOB_FIELD_IDS = ["data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply"] as const;
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
  "sales", "customer-success", "procurement", "supply-chain",
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
  // marketing
  "salla-marketing-specialist-tamheer-jeddah", "salla-mahally-seo-manager-jeddah", "lucidya-social-media-analyst-riyadh",
  "platinumlist-content-manager-riyadh",
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
] as const;
export type JobId = (typeof JOB_IDS)[number];
export const isJobId = guard(JOB_IDS);

/** Spec 9.4: one course per star slot, `c-{skill}-{star}`, in table order. 59 ids, plus the expansion's 21 (80). */
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
