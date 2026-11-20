// Owner: data. Spec 9.8 checks 1, 2, 3, 7, 8 and 9 on the catalogue, the demo aliases of 9.2, prerequisites inside
// their field, the sample CV text, the onboarding questions, levels and badges. Check 4 (the sample CV read by the
// analyser) belongs to brain-cv and check 5 / 6 (matches, fit) to the engine; here the aliases are only sanity-checked
// against the sample CV so brain-cv's acceptance test cannot fail because of the data.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  BADGES,
  COMPANIES,
  CATALOGUE_COUNTS,
  COURSES,
  FIELDS,
  JOB_CITIES,
  JOBS,
  LEADERBOARD_USERS,
  LESSONS_BY_HOURS,
  LEVEL_THRESHOLDS,
  LEVELS,
  ONBOARDING_QUESTIONS,
  SAMPLE_CV_BODY,
  SKILLS,
  getBadge,
  getCourse,
  getField,
  getJob,
  getJobCity,
  getLeaderboardUser,
  getLevel,
  getQuestion,
  getSkill,
  optionLabel,
  sampleCvText,
} from "@/lib/data";
import {
  BADGE_IDS,
  COURSE_IDS,
  FIELD_IDS,
  JOB_CITY_IDS,
  JOB_IDS,
  LEADERBOARD_USER_IDS,
  OPTIONS_BY_QUESTION,
  QUESTION_IDS,
  SKILL_IDS,
  courseIdFor,
} from "@/lib/ids";
import type { CourseId, FieldId, Job, JobId, SkillId } from "@/lib/types";

// ─── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Spec 4.3 normalisation, enough for the checks here (the engine owns the real one). */
function norm(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ‌-‏‪-‮]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

function words(text: string): string[] {
  return norm(text)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((w) => w.length > 0);
}

/** A word without «ال», «لل» or one one-letter prefix (و، ف، ب، ل، ك), in every way it could be read. */
function readings(word: string): string[] {
  const out = new Set<string>([word]);
  const stripAl = (w: string) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w);
  out.add(stripAl(word));
  if (word.startsWith("لل") && word.length > 3) out.add(word.slice(2));
  if (/^[وفبلك]/.test(word) && word.length > 2) {
    out.add(word.slice(1));
    out.add(stripAl(word.slice(1)));
  }
  return [...out];
}

/** Whole-word match of a (multi-word) alias in a text, «ال» and a one-letter prefix allowed on every word (lenient). */
function aliasOccurs(alias: string, textWords: readonly string[]): boolean {
  const aliasWords = words(alias).map((w) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w));
  if (aliasWords.length === 0) return false;
  for (let i = 0; i + aliasWords.length <= textWords.length; i++) {
    const ok = aliasWords.every((aw, j) => {
      const tw = textWords[i + j];
      return tw !== undefined && readings(tw).includes(aw);
    });
    if (ok) return true;
  }
  return false;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

/** Every string inside a value (deep). */
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

/** Every prerequisite of a skill, transitively (ui-design → figma → design-basics). */
function prereqsOf(skill: SkillId, seen: Set<SkillId> = new Set()): Set<SkillId> {
  for (const p of getSkill(skill).prereqs) {
    if (seen.has(p)) continue;
    seen.add(p);
    prereqsOf(p, seen);
  }
  return seen;
}

/** Spec 3.4 / 9.3: one stage per required star, plus a prep stage (first star) for each unlisted prerequisite, transitively. */
function stagesOf(job: Job): { courses: CourseId[]; preps: number } {
  const listed = new Set<SkillId>(job.requirements.map((r) => r.skill));
  const courses: CourseId[] = [];
  const preps = new Set<SkillId>();
  for (const r of job.requirements) {
    for (const p of prereqsOf(r.skill)) if (!listed.has(p)) preps.add(p);
    for (let star = 1; star <= r.stars; star++) {
      const id = courseIdFor(r.skill, star);
      if (id) courses.push(id);
    }
  }
  for (const p of preps) {
    const id = courseIdFor(p, 1);
    if (id) courses.push(id);
  }
  return { courses, preps: preps.size };
}

// ─── 9.8 check 1: fields and skills ───────────────────────────────────────────────────────────────────────────────

describe("fields and skills (9.1, 9.2, 9.8 check 1)", () => {
  it("has the seven fields in display order, only `professional` without jobs", () => {
    expect(FIELDS.map((f) => f.id)).toEqual([...FIELD_IDS]);
    expect(FIELDS.filter((f) => !f.hasJobs).map((f) => f.id)).toEqual(["professional"]);
    expect(getField("data").name).toBe("البيانات والتحليل");
    expect(getField("professional").name).toBe("المهارات المهنية");
  });

  it("has 114 skills in table order (spec 9.2's 38, the expansion's 16, wave 2's 39 and wave 3's 21), with 185 star slots", () => {
    expect(SKILLS.map((s) => s.id)).toEqual([...SKILL_IDS]);
    const perField = (field: FieldId) => SKILLS.filter((s) => s.field === field);
    // data, software, design, marketing, business, hr, product, cyber-cloud, sales-supply, then wave 2's engineering,
    // project-controls, tourism-hospitality, health-admin, education, banking-risk, legal, media, gaming, wave 3's
    // energy-sustainability, real-estate, aviation, communications, and professional (wave 3 also adds mobile skills to
    // software, telecom ones to cyber-cloud and insurance ones to banking-risk)
    expect(FIELD_IDS.map((f) => perField(f).length)).toEqual([8, 10, 5, 5, 5, 5, 4, 9, 7, 6, 5, 4, 4, 3, 7, 3, 4, 3, 3, 3, 3, 3, 5]);
    expect(FIELD_IDS.map((f) => perField(f).reduce((sum, s) => sum + s.maxStars, 0))).toEqual([
      15, 16, 8, 7, 7, 7, 5, 13, 11, 11, 9, 7, 6, 6, 12, 5, 7, 5, 5, 6, 5, 5, 7,
    ]);
    expect(SKILLS.reduce((sum, s) => sum + s.maxStars, 0)).toBe(185);
    expect(CATALOGUE_COUNTS.skills).toBe(SKILLS.length);
    expect(CATALOGUE_COUNTS.starSlots).toBe(185);
  });

  it("gives three slots to five skills and two to eleven (9.2)", () => {
    const withSlots = (n: number) => SKILLS.filter((s) => s.maxStars === n).map((s) => s.id);
    expect(withSlots(3)).toEqual(["excel", "sql", "powerbi", "javascript", "figma"]);
    expect(withSlots(2).sort()).toEqual(
      [
        "statistics",
        "programming",
        "ui-design",
        "content",
        "social-media",
        "project-management",
        "financial-analysis",
        "hr-basics",
        "recruitment",
        "communication",
        "english",
        // the expansion's
        "product-roadmap",
        "security-fundamentals",
        "cloud",
        "sales",
        "supply-chain",
        // wave 2's
        "cx-quality", "cx-analytics",
        "engineering-drawings", "hse", "quality-control", "site-execution", "mep-systems",
        "planning-scheduling", "quantity-surveying", "bim-revit", "cost-control",
        "front-office", "event-planning", "tour-guiding",
        "medical-coding", "health-informatics",
        "instructional-design", "elearning-dev", "training-delivery",
        "credit-analysis", "aml-compliance", "internal-audit",
        "legal-research", "contract-drafting",
        "video-editing", "motion-graphics", "translation",
        "game-design", "game-testing",
        // wave 3's
        "esg-reporting", "carbon-accounting", "property-management", "facilities-management", "real-estate-valuation",
        "underwriting", "insurance-claims", "flutter", "ios-swift", "android-kotlin", "routing-switching", "mobile-networks",
        "aviation-ops", "ground-handling", "public-relations", "corporate-communications",
      ].sort(),
    );
    expect(withSlots(1)).toHaveLength(48);
  });

  it("keeps every prerequisite inside its skill's field, listed earlier, never itself", () => {
    for (const skill of SKILLS) {
      for (const p of skill.prereqs) {
        expect(getSkill(p).field, `${skill.id} → ${p}`).toBe(skill.field);
        expect(SKILL_IDS.indexOf(p), `${skill.id} → ${p}`).toBeLessThan(SKILL_IDS.indexOf(skill.id));
      }
    }
    expect(getSkill("python-data").prereqs).toEqual(["sql", "statistics"]);
    expect(getSkill("apis").prereqs).toEqual(["programming", "git"]);
  });

  it("writes a one-line description of under 15 words for every skill", () => {
    for (const skill of SKILLS) {
      expect(skill.description.includes("\n"), skill.id).toBe(false);
      expect(wordCount(skill.description), skill.id).toBeLessThan(15);
    }
  });
});

// ─── aliases (9.2) ────────────────────────────────────────────────────────────────────────────────────────────────

const DEMO_ALIASES: Readonly<Partial<Record<SkillId, readonly string[]>>> = {
  excel: ["Excel", "إكسل", "اكسل", "الجداول المحورية", "Pivot"],
  sql: ["SQL", "MySQL", "PostgreSQL", "قاعدة بيانات", "قواعد البيانات", "استعلامات"],
  statistics: ["الإحصاء", "إحصاء", "إحصائي", "statistics", "SPSS"],
  programming: ["البرمجة", "برمجة", "Python", "بايثون", "Java", "C++", "C#"],
  english: ["الإنجليزية", "الانجليزية", "English", "IELTS", "TOEFL"],
  communication: ["التواصل", "مهارات الاتصال", "communication"],
  presentation: ["العرض والتقديم", "مهارات العرض", "الإلقاء", "عروض تقديمية", "PowerPoint"],
  teamwork: ["العمل الجماعي", "العمل ضمن فريق", "روح الفريق", "teamwork"],
  powerbi: ["Power BI", "PowerBI", "باور بي آي"],
  dataviz: ["تصوير البيانات", "لوحة معلومات", "لوحات المعلومات", "رسوم بيانية", "dashboard", "Tableau"],
  "python-data": ["pandas", "NumPy", "تحليل البيانات بـ Python"],
  "social-media": ["التواصل الاجتماعي", "وسائل التواصل", "social media"],
  "training-dev": ["التدريب والتطوير", "البرامج التدريبية", "تطوير الموظفين"],
  content: ["كتابة المحتوى", "صناعة المحتوى", "copywriting"],
  "project-management": ["إدارة المشاريع", "إدارة مشروع", "PMP"],
};

/** Spec 9.2: never an alias on their own (with or without «ال»). */
const BARE_WORDS = ["تحليل", "بيانات", "تصميم", "مشروع", "إدارة", "كتابة", "تقارير", "تطوير", "تدريب", "مبيعات", "نظام", "عرض", "تقديم", "عمل", "فريق"];

/** Spec 6.2: the eight skills the sample CV must give. */
const SAMPLE_SKILLS: readonly SkillId[] = [
  "excel",
  "sql",
  "statistics",
  "programming",
  "english",
  "communication",
  "presentation",
  "teamwork",
];

describe("aliases (9.2)", () => {
  it("uses the demo aliases of the 9.2 table exactly", () => {
    expect(Object.keys(DEMO_ALIASES)).toHaveLength(15);
    for (const [id, aliases] of Object.entries(DEMO_ALIASES)) {
      expect(getSkill(id as SkillId).aliases, id).toEqual(aliases);
    }
  });

  it("gives every skill Arabic aliases, and an English one wherever the spec did not fix the list", () => {
    for (const skill of SKILLS) {
      expect(skill.aliases.some((a) => /[؀-ۿ]/.test(a)), skill.id).toBe(true);
      if (DEMO_ALIASES[skill.id] === undefined) {
        expect(skill.aliases.some((a) => /[A-Za-z]/.test(a)), skill.id).toBe(true);
      }
    }
  });

  it("never uses a bare word of 9.2 as an alias", () => {
    const bare = new Set(BARE_WORDS.flatMap((w) => [norm(w), norm(`ال${w}`)]));
    for (const skill of SKILLS) {
      for (const alias of skill.aliases) expect(bare.has(norm(alias.trim())), `${skill.id}: ${alias}`).toBe(false);
    }
  });

  it("never gives the same alias to two skills", () => {
    const owner = new Map<string, SkillId>();
    for (const skill of SKILLS) {
      for (const alias of skill.aliases) {
        // The spec's own lists hold spellings that normalise alike («إكسل», «اكسل»): only another skill is a clash.
        const key = norm(alias.trim());
        expect(owner.get(key) ?? skill.id, `${alias} in ${skill.id} and ${owner.get(key) ?? ""}`).toBe(skill.id);
        owner.set(key, skill.id);
      }
    }
  });

  it("lets the sample CV name exactly its eight skills (sanity check for brain-cv's 9.8 check 4)", () => {
    const text = words(SAMPLE_CV_BODY);
    for (const skill of SKILLS) {
      const found = skill.aliases.filter((a) => aliasOccurs(a, text));
      if (SAMPLE_SKILLS.includes(skill.id)) expect(found.length, skill.id).toBeGreaterThan(0);
      else expect(found, skill.id).toEqual([]);
    }
  });
});

// ─── 9.8 check 2: courses ─────────────────────────────────────────────────────────────────────────────────────────

/** Spec 9.4 hours, in table order. */
const COURSE_HOURS: Readonly<Record<CourseId, number>> = {
  "c-excel-1": 8,
  "c-excel-2": 10,
  "c-excel-3": 14,
  "c-sql-1": 8,
  "c-sql-2": 12,
  "c-sql-3": 16,
  "c-statistics-1": 8,
  "c-statistics-2": 12,
  "c-powerbi-1": 10,
  "c-powerbi-2": 12,
  "c-powerbi-3": 16,
  "c-dataviz-1": 6,
  "c-python-data-1": 10,
  "c-ml-1": 10,
  "c-programming-1": 10,
  "c-programming-2": 12,
  "c-html-css-1": 8,
  "c-git-1": 6,
  "c-javascript-1": 10,
  "c-javascript-2": 12,
  "c-javascript-3": 16,
  "c-react-1": 10,
  "c-apis-1": 10,
  "c-design-basics-1": 8,
  "c-figma-1": 8,
  "c-figma-2": 10,
  "c-figma-3": 14,
  "c-ux-research-1": 8,
  "c-ui-design-1": 10,
  "c-ui-design-2": 12,
  "c-prototyping-1": 8,
  "c-marketing-basics-1": 8,
  "c-content-1": 8,
  "c-content-2": 10,
  "c-social-media-1": 8,
  "c-social-media-2": 10,
  "c-seo-1": 8,
  "c-ads-1": 10,
  "c-project-management-1": 8,
  "c-project-management-2": 12,
  "c-agile-1": 6,
  "c-business-analysis-1": 8,
  "c-accounting-1": 8,
  "c-financial-analysis-1": 10,
  "c-financial-analysis-2": 12,
  "c-hr-basics-1": 8,
  "c-hr-basics-2": 10,
  "c-recruitment-1": 8,
  "c-recruitment-2": 10,
  "c-labor-law-1": 8,
  "c-payroll-1": 8,
  "c-training-dev-1": 8,
  "c-communication-1": 6,
  "c-communication-2": 10,
  "c-english-1": 10,
  "c-english-2": 12,
  "c-presentation-1": 6,
  "c-teamwork-1": 6,
  "c-problem-solving-1": 6,
  // the expansion's 21 (src/lib/data/expansion/courses.ts, 218 hours)
  "c-deep-learning-1": 14,
  "c-llm-apps-1": 12,
  "c-product-discovery-1": 8,
  "c-product-roadmap-1": 8,
  "c-product-roadmap-2": 12,
  "c-product-specs-1": 8,
  "c-product-analytics-1": 10,
  "c-linux-1": 8,
  "c-networking-1": 10,
  "c-security-fundamentals-1": 12,
  "c-security-fundamentals-2": 10,
  "c-soc-analysis-1": 12,
  "c-cloud-1": 10,
  "c-cloud-2": 14,
  "c-devops-1": 14,
  "c-sales-1": 8,
  "c-sales-2": 10,
  "c-customer-success-1": 8,
  "c-procurement-1": 8,
  "c-supply-chain-1": 10,
  "c-supply-chain-2": 12,
  // wave 2 (src/lib/data/wave2/courses.ts)
  "c-engineering-drawings-1": 10,
  "c-engineering-drawings-2": 16,
  "c-hse-1": 10,
  "c-hse-2": 16,
  "c-quality-control-1": 10,
  "c-quality-control-2": 16,
  "c-site-execution-1": 12,
  "c-site-execution-2": 16,
  "c-mep-systems-1": 12,
  "c-mep-systems-2": 16,
  "c-saudi-building-code-1": 8,
  "c-planning-scheduling-1": 16,
  "c-planning-scheduling-2": 16,
  "c-quantity-surveying-1": 12,
  "c-quantity-surveying-2": 16,
  "c-bim-revit-1": 16,
  "c-bim-revit-2": 16,
  "c-cost-control-1": 10,
  "c-cost-control-2": 12,
  "c-construction-contracts-1": 10,
  "c-guest-service-1": 6,
  "c-front-office-1": 8,
  "c-front-office-2": 10,
  "c-event-planning-1": 8,
  "c-event-planning-2": 10,
  "c-tour-guiding-1": 8,
  "c-tour-guiding-2": 10,
  "c-contact-center-ops-1": 8,
  "c-cx-quality-1": 8,
  "c-cx-quality-2": 10,
  "c-cx-analytics-1": 8,
  "c-cx-analytics-2": 10,
  "c-medical-terminology-1": 8,
  "c-medical-coding-1": 12,
  "c-medical-coding-2": 14,
  "c-health-claims-1": 10,
  "c-health-informatics-1": 10,
  "c-health-informatics-2": 12,
  "c-instructional-design-1": 8,
  "c-instructional-design-2": 12,
  "c-elearning-dev-1": 10,
  "c-elearning-dev-2": 12,
  "c-training-delivery-1": 8,
  "c-training-delivery-2": 10,
  "c-banking-basics-1": 8,
  "c-credit-analysis-1": 8,
  "c-credit-analysis-2": 12,
  "c-aml-compliance-1": 8,
  "c-aml-compliance-2": 12,
  "c-internal-audit-1": 8,
  "c-internal-audit-2": 12,
  "c-legal-research-1": 8,
  "c-legal-research-2": 12,
  "c-contract-drafting-1": 8,
  "c-contract-drafting-2": 12,
  "c-corporate-governance-1": 8,
  "c-video-editing-1": 8,
  "c-video-editing-2": 12,
  "c-motion-graphics-1": 8,
  "c-motion-graphics-2": 12,
  "c-translation-1": 8,
  "c-translation-2": 12,
  "c-arabic-editing-1": 8,
  "c-game-design-1": 8,
  "c-game-design-2": 12,
  "c-game-testing-1": 8,
  "c-game-testing-2": 12,
  "c-esports-community-1": 8,
  // wave 3 (src/lib/data/wave3/courses.ts)
  "c-esg-fundamentals-1": 8,
  "c-esg-reporting-1": 10,
  "c-esg-reporting-2": 14,
  "c-carbon-accounting-1": 8,
  "c-carbon-accounting-2": 12,
  "c-property-management-1": 8,
  "c-property-management-2": 12,
  "c-facilities-management-1": 10,
  "c-facilities-management-2": 14,
  "c-real-estate-valuation-1": 10,
  "c-real-estate-valuation-2": 16,
  "c-insurance-basics-1": 10,
  "c-underwriting-1": 10,
  "c-underwriting-2": 14,
  "c-insurance-claims-1": 8,
  "c-insurance-claims-2": 12,
  "c-flutter-1": 16,
  "c-flutter-2": 16,
  "c-ios-swift-1": 16,
  "c-ios-swift-2": 16,
  "c-android-kotlin-1": 16,
  "c-android-kotlin-2": 16,
  "c-routing-switching-1": 16,
  "c-routing-switching-2": 16,
  "c-mobile-networks-1": 10,
  "c-mobile-networks-2": 16,
  "c-fiber-optics-1": 12,
  "c-aviation-ops-1": 10,
  "c-aviation-ops-2": 14,
  "c-ground-handling-1": 8,
  "c-ground-handling-2": 12,
  "c-flight-dispatch-1": 16,
  "c-public-relations-1": 8,
  "c-public-relations-2": 12,
  "c-corporate-communications-1": 8,
  "c-corporate-communications-2": 12,
  "c-government-relations-1": 8,
};

describe("courses (9.4, 8.2, 9.8 check 2)", () => {
  it("has 185 courses in table order (59 + the expansion's 21 + wave 2's 68 + wave 3's 37), one per star slot, ids c-{skill}-{star}", () => {
    expect(COURSES).toHaveLength(185);
    expect(COURSES.map((c) => c.id)).toEqual([...COURSE_IDS]);
    for (const course of COURSES) expect(course.id).toBe(`c-${course.skill}-${course.star}`);
    for (const skill of SKILLS) {
      const stars = COURSES.filter((c) => c.skill === skill.id).map((c) => c.star);
      expect(stars, skill.id).toEqual(Array.from({ length: skill.maxStars }, (_, i) => i + 1));
    }
    expect(CATALOGUE_COUNTS.courses).toBe(COURSES.length);
  });

  it("has the hours as listed: 1,962 hours (566 + 218 + 728 + 450) and 39,240 XP in total", () => {
    for (const course of COURSES) expect(course.hours, course.id).toBe(COURSE_HOURS[course.id]);
    const hours = COURSES.reduce((sum, c) => sum + c.hours, 0);
    expect(hours).toBe(1962);
    expect(hours).toBe(CATALOGUE_COUNTS.courseHours);
    expect(hours * 20).toBe(39_240);
  });

  it("has as many lessons as 8.2 gives for the hours, each a short title, none repeated in a course", () => {
    for (const course of COURSES) {
      expect(course.lessons, course.id).toHaveLength(LESSONS_BY_HOURS[course.hours]);
      expect(new Set(course.lessons).size, course.id).toBe(course.lessons.length);
      for (const lesson of course.lessons) {
        expect(lesson.trim(), course.id).toBe(lesson);
        expect(lesson.length, course.id).toBeGreaterThan(0);
        expect(wordCount(lesson), `${course.id}: ${lesson}`).toBeLessThanOrEqual(7);
        expect(lesson.endsWith("."), `${course.id}: ${lesson}`).toBe(false);
      }
    }
  });

  it("describes every course in exactly two sentences", () => {
    for (const course of COURSES) {
      expect(course.description.endsWith("."), course.id).toBe(true);
      expect(course.description.split(".").length - 1, course.id).toBe(2);
    }
  });

  it("gives the two demo courses exactly as 9.4 writes them", () => {
    const powerbi = getCourse("c-powerbi-1");
    expect(powerbi.title).toBe("أساسيات Power BI: من البيانات إلى لوحة المعلومات");
    expect(powerbi.hours).toBe(10);
    expect(powerbi.description).toBe(
      "تتعلّم ربط البيانات وتنظيفها وبناء تقارير تفاعلية في Power BI. تخرج منها بلوحة معلومات كاملة تستطيع عرضها.",
    );
    expect(powerbi.lessons).toEqual([
      "التعرّف على واجهة Power BI",
      "ربط مصادر البيانات وتنظيفها",
      "بناء أول تقرير تفاعلي",
      "المقاييس والحسابات الأساسية",
      "نشر لوحة المعلومات ومشاركتها",
    ]);
    const statistics = getCourse("c-statistics-2");
    expect(statistics.title).toBe("الإحصاء التطبيقي للمحللين");
    expect(statistics.hours).toBe(12);
    expect(statistics.description).toBe(
      "تنتقل من وصف البيانات إلى الاستنتاج منها بثقة. تخرج منها قادراً على اختبار فرضية وشرح نتيجتها.",
    );
    expect(statistics.lessons).toEqual([
      "التوزيعات ومقاييس التشتت",
      "العيّنات وفترات الثقة",
      "اختبار الفرضيات",
      "الارتباط والانحدار البسيط",
      "عرض النتائج لغير المختصين",
    ]);
  });
});

// ─── 9.8 checks 3 and 9: jobs ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Requirements in roadmap order, and the stage count before any CV (prep stages). 20 Nov 2026: the practice job (spec
 * 9.3's «محلل بيانات») and the 27 real postings of research/jobs/jobs-snapshot.json and research/jobs/maharah.json.
 */
const JOB_TABLE: Readonly<Record<JobId, { reqs: string; stages: number; preps: number }>> = {
  "data-analyst-riyadh": { reqs: "excel:2 sql:2 powerbi:1 statistics:2 communication:1", stages: 8, preps: 0 },
  "jeeny-growth-insights-analytics-riyadh": { reqs: "excel:3 sql:3 statistics:2 powerbi:1 communication:2", stages: 11, preps: 0 },
  "qiddiya-hr-analytics-analyst-riyadh": { reqs: "statistics:1 powerbi:2 dataviz:1 presentation:1 hr-basics:1", stages: 8, preps: 2 },
  "ninja-real-estate-performance-analyst-riyadh": { reqs: "excel:3 powerbi:1 communication:2 problem-solving:1 presentation:1", stages: 8, preps: 0 },
  "master-works-data-senior-engineer-riyadh": { reqs: "sql:3 powerbi:1 dataviz:1 communication:1 english:1", stages: 8, preps: 1 },
  "salla-senior-data-scientist-remote": { reqs: "sql:3 statistics:1 python-data:1 dataviz:1 communication:2", stages: 10, preps: 2 },
  "lucidya-frontend-engineer-dammam": { reqs: "html-css:1 javascript:2 git:1 react:1 apis:1", stages: 7, preps: 1 },
  "salla-senior-backend-checkout-remote": { reqs: "programming:2 sql:3 apis:1 problem-solving:1 teamwork:1", stages: 11, preps: 3 },
  "salla-senior-qa-engineer-remote": { reqs: "javascript:2 git:1 apis:1 problem-solving:1 communication:1", stages: 8, preps: 2 },
  "almajed-mobile-developer-riyadh": { reqs: "programming:1 apis:1 ui-design:1 teamwork:1 business-analysis:1", stages: 9, preps: 4 },
  "horizontal-graduate-designer-riyadh": { reqs: "design-basics:1 figma:1 prototyping:1 ui-design:1 teamwork:1", stages: 6, preps: 1 },
  "flyakeed-product-designer-riyadh": { reqs: "ux-research:1 figma:2 prototyping:1 ui-design:2 teamwork:1", stages: 9, preps: 2 },
  "lucidya-product-designer-riyadh": { reqs: "ux-research:1 figma:2 prototyping:1 ui-design:2 teamwork:1", stages: 9, preps: 2 },
  "hungerstation-senior-product-designer-riyadh": { reqs: "ux-research:1 figma:3 ui-design:2 presentation:1 teamwork:1", stages: 10, preps: 2 },
  "salla-marketing-specialist-tamheer-jeddah": { reqs: "marketing-basics:1 social-media:1 content:1 communication:2 problem-solving:1", stages: 6, preps: 0 },
  "salla-mahally-seo-manager-jeddah": { reqs: "content:2 seo:1 english:2 sql:1 business-analysis:1", stages: 9, preps: 2 },
  "lucidya-social-media-analyst-riyadh": { reqs: "marketing-basics:1 social-media:2 content:1 english:1 presentation:1", stages: 7, preps: 1 },
  "platinumlist-content-manager-riyadh": { reqs: "content:2 seo:1 english:2 communication:1 problem-solving:1", stages: 8, preps: 1 },
  "syarah-financial-analyst-tamheer-riyadh": { reqs: "excel:1 accounting:1 financial-analysis:1 communication:1 teamwork:1", stages: 5, preps: 0 },
  "foodics-accountant-erp-riyadh": { reqs: "accounting:1 excel:3 financial-analysis:2 communication:1 english:1", stages: 8, preps: 0 },
  "master-works-ai-business-analyst-riyadh": { reqs: "business-analysis:1 agile:1 apis:1 presentation:1 english:2", stages: 10, preps: 4 },
  "maharah-business-development-specialist-riyadh": { reqs: "communication:2 presentation:1 marketing-basics:1 business-analysis:1 sales:1", stages: 6, preps: 0 },
  "maharah-qa-analyst-riyadh": { reqs: "business-analysis:1 statistics:1 dataviz:1 problem-solving:1 communication:1", stages: 7, preps: 2 },
  "atheer-hr-specialist-riyadh": { reqs: "hr-basics:2 labor-law:1 recruitment:2 payroll:1 english:2", stages: 8, preps: 0 },
  "qiddiya-hris-specialist-riyadh": { reqs: "hr-basics:1 powerbi:1 dataviz:1 business-analysis:1 training-dev:1", stages: 6, preps: 1 },
  "lucidya-people-operations-riyadh": { reqs: "hr-basics:2 labor-law:1 payroll:1 recruitment:1 teamwork:1", stages: 7, preps: 1 },
  "tamara-people-business-partner-riyadh": { reqs: "hr-basics:2 labor-law:1 training-dev:1 communication:2 project-management:1", stages: 7, preps: 0 },
  "lucidya-talent-acquisition-lead-riyadh": { reqs: "hr-basics:1 recruitment:2 project-management:1 communication:1 presentation:1", stages: 6, preps: 0 },
  // the expansion's 18 (research/expansion/raw/jobs.json)
  "petroapp-product-manager-riyadh": { reqs: "product-discovery:1 product-specs:1 product-roadmap:1 product-analytics:1 agile:1", stages: 6, preps: 1 },
  "salla-product-manager-storefront-jeddah": { reqs: "product-discovery:1 product-analytics:1 ml:1 ux-research:1 english:2", stages: 10, preps: 4 },
  "master-works-ai-product-manager-riyadh": { reqs: "product-discovery:1 product-roadmap:2 product-specs:1 product-analytics:1 llm-apps:1", stages: 9, preps: 3 },
  "taj-hr-cybersecurity-engineer-riyadh": { reqs: "communication:1 networking:1 security-fundamentals:1 soc-analysis:1 english:1", stages: 6, preps: 1 },
  "mullers-solutions-soc-l2-specialist-riyadh": { reqs: "presentation:1 networking:1 security-fundamentals:2 soc-analysis:1 english:2", stages: 9, preps: 2 },
  "qiddiya-it-security-design-riyadh": { reqs: "teamwork:1 networking:1 security-fundamentals:1 soc-analysis:1 procurement:1", stages: 7, preps: 2 },
  "lucidya-devops-engineer-riyadh": { reqs: "linux:1 networking:1 cloud:1 devops:1 git:1", stages: 5, preps: 0 },
  "lucidya-site-reliability-engineer-riyadh": { reqs: "problem-solving:1 linux:1 networking:1 cloud:1 devops:1", stages: 5, preps: 0 },
  "mozn-cloud-platform-engineer-riyadh": { reqs: "networking:1 cloud:2 programming:1 linux:1 devops:1", stages: 6, preps: 0 },
  "lamdax-ai-engineer-remote": { reqs: "programming:1 python-data:1 ml:1 deep-learning:1 apis:1", stages: 9, preps: 4 },
  "foodics-ai-engineer-riyadh": { reqs: "programming:2 git:1 apis:1 llm-apps:1 problem-solving:1", stages: 6, preps: 0 },
  "mozn-ai-engineer-riyadh": { reqs: "ml:1 deep-learning:1 cloud:1 devops:1 apis:1", stages: 13, preps: 8 },
  "foodics-field-sales-representative-riyadh": { reqs: "sales:1 communication:2 presentation:1 marketing-basics:1 english:1", stages: 6, preps: 0 },
  "shipa-junior-business-development-executive-riyadh": { reqs: "sales:1 customer-success:1 communication:2 presentation:1 excel:1", stages: 6, preps: 0 },
  "petroapp-customer-success-specialist-riyadh": { reqs: "sales:1 customer-success:1 communication:2 teamwork:1 problem-solving:1", stages: 6, preps: 0 },
  "qiddiya-procurement-specialist-riyadh": { reqs: "procurement:1 financial-analysis:1 communication:1 problem-solving:1 supply-chain:2", stages: 7, preps: 1 },
  "ninja-procurement-cost-control-specialist-riyadh": { reqs: "accounting:1 financial-analysis:1 procurement:1 excel:3 problem-solving:1", stages: 7, preps: 0 },
  "hungerstation-junior-3pl-account-manager-riyadh": { reqs: "procurement:1 dataviz:1 supply-chain:1 problem-solving:1 communication:2", stages: 8, preps: 2 },
  // wave 2 (src/lib/data/wave2/jobs.ts)
  "almosafer-product-designer-riyadh": { reqs: "figma:2 ux-research:1 prototyping:1 ui-design:2 communication:2", stages: 9, preps: 1 },
  "mrsool-creative-copywriter-riyadh": { reqs: "content:2 seo:1 communication:2 project-management:1 teamwork:1", stages: 8, preps: 1 },
  "rentokil-customer-experience-specialist-riyadh": { reqs: "sales:1 customer-success:1 cx-analytics:1 communication:1 english:1", stages: 5, preps: 0 },
  "mrsool-customer-care-representative-riyadh": { reqs: "sales:1 customer-success:1 contact-center-ops:1 cx-analytics:1 communication:1", stages: 5, preps: 0 },
  "ninja-live-operations-supervisor-riyadh": { reqs: "cx-quality:1 contact-center-ops:1 excel:2 problem-solving:1 english:2", stages: 9, preps: 2 },
  "teefnajd-site-engineer-riyadh": { reqs: "engineering-drawings:1 site-execution:1 quality-control:1 hse:1 communication:1", stages: 5, preps: 0 },
  "rawafid-site-civil-engineer-jeddah": { reqs: "engineering-drawings:2 site-execution:2 hse:1 project-management:1 teamwork:1", stages: 8, preps: 1 },
  "matar-albaqmi-site-engineer-hvac-dammam": { reqs: "engineering-drawings:1 mep-systems:2 site-execution:1 quality-control:1 planning-scheduling:1", stages: 6, preps: 0 },
  "hanmiglobal-mechanical-engineer-riyadh": { reqs: "engineering-drawings:2 mep-systems:2 site-execution:1 quantity-surveying:1 problem-solving:1", stages: 7, preps: 0 },
  "teefnajd-quality-control-engineer-riyadh": { reqs: "engineering-drawings:1 quality-control:1 site-execution:1 teamwork:1 problem-solving:1", stages: 6, preps: 1 },
  "hanmiglobal-quality-inspector-electrical-riyadh": { reqs: "engineering-drawings:1 quality-control:2 mep-systems:1 hse:1 communication:1", stages: 6, preps: 0 },
  "hanmiglobal-hse-engineer-riyadh": { reqs: "hse:1 quality-control:1 problem-solving:1 communication:1 presentation:1", stages: 5, preps: 0 },
  "fuku-hse-engineer-dammam": { reqs: "hse:2 saudi-building-code:1 problem-solving:1 communication:1 english:2", stages: 8, preps: 1 },
  "aljomaih-graduate-development-engineering-riyadh": { reqs: "planning-scheduling:1 construction-contracts:1 hse:1 project-management:1 communication:1", stages: 6, preps: 1 },
  "matar-albaqmi-planning-engineer-dammam": { reqs: "planning-scheduling:2 project-management:1 dataviz:1 communication:1 teamwork:1", stages: 8, preps: 2 },
  "teefnajd-contract-engineer-riyadh": { reqs: "engineering-drawings:1 quantity-surveying:1 construction-contracts:1 planning-scheduling:1 communication:2", stages: 6, preps: 0 },
  "rawafid-erp-projects-cost-controller-jeddah": { reqs: "cost-control:2 financial-analysis:1 dataviz:1 project-management:1 communication:1", stages: 10, preps: 4 },
  "gathern-guest-relations-associate-riyadh": { reqs: "guest-service:1 front-office:1 customer-success:1 communication:1 teamwork:1", stages: 6, preps: 1 },
  "seven-guest-service-associate-riyadh": { reqs: "guest-service:1 front-office:1 sales:1 communication:1 teamwork:1", stages: 5, preps: 0 },
  "eram-event-management-coordinator-jeddah": { reqs: "event-planning:2 project-management:1 procurement:1 communication:1 guest-service:1", stages: 6, preps: 0 },
  "waseel-rcm-specialist-riyadh": { reqs: "medical-coding:1 health-claims:1 health-informatics:1 problem-solving:1 communication:1", stages: 6, preps: 1 },
  "eram-associate-instructional-designer-dhahran": { reqs: "instructional-design:2 elearning-dev:2 project-management:1 training-dev:1 communication:1", stages: 8, preps: 1 },
  "abis-industrial-skills-trainer-computer-dhahran": { reqs: "training-delivery:2 instructional-design:1 elearning-dev:1 presentation:1 problem-solving:1", stages: 7, preps: 1 },
  "qiddiya-training-administration-senior-specialist-riyadh": { reqs: "elearning-dev:1 training-dev:1 excel:1 powerbi:1 english:2", stages: 8, preps: 2 },
  "tamara-collections-advisor-riyadh": { reqs: "credit-analysis:1 customer-success:1 aml-compliance:1 english:1 excel:1", stages: 7, preps: 2 },
  "tamara-compliance-officer-riyadh": { reqs: "banking-basics:1 aml-compliance:2 internal-audit:1 english:2 communication:2", stages: 8, preps: 0 },
  "tamara-compliance-senior-associate-riyadh": { reqs: "banking-basics:1 aml-compliance:2 internal-audit:1 english:2 communication:2", stages: 8, preps: 0 },
  "tamara-fraud-investigator-riyadh": { reqs: "aml-compliance:2 excel:1 problem-solving:1 communication:2 english:2", stages: 9, preps: 1 },
  "pwc-assurance-coop-2027-riyadh": { reqs: "internal-audit:1 accounting:1 communication:1 problem-solving:1 english:1", stages: 5, preps: 0 },
  "pwc-risk-internal-audit-senior-associate-jeddah": { reqs: "internal-audit:2 accounting:1 problem-solving:1 communication:2 english:2", stages: 8, preps: 0 },
  "ey-senior-auditor-gcc-nationals-riyadh": { reqs: "internal-audit:2 accounting:1 communication:2 teamwork:1 problem-solving:1", stages: 7, preps: 0 },
  "webook-legal-analyst-riyadh": { reqs: "legal-research:1 contract-drafting:1 communication:1 english:1 problem-solving:1", stages: 5, preps: 0 },
  "mozn-legal-specialist-riyadh": { reqs: "legal-research:2 contract-drafting:2 corporate-governance:1 aml-compliance:1 english:1", stages: 8, preps: 1 },
  "webook-legal-associate-riyadh": { reqs: "legal-research:2 contract-drafting:2 corporate-governance:1 labor-law:1 teamwork:1", stages: 9, preps: 2 },
  "mozn-creative-design-motion-riyadh": { reqs: "video-editing:2 motion-graphics:2 design-basics:1 figma:1 communication:2", stages: 8, preps: 0 },
  "chainreaction-multimedia-designer-riyadh": { reqs: "video-editing:2 motion-graphics:1 design-basics:1 social-media:1 content:1", stages: 7, preps: 1 },
  "platinumlist-en-ar-content-manager-riyadh": { reqs: "translation:2 arabic-editing:1 content:2 seo:1 english:2", stages: 9, preps: 1 },
  "qiddiya-gaming-esports-strategy-am-riyadh": { reqs: "esports-community:1 project-management:2 business-analysis:1 communication:2 presentation:1", stages: 7, preps: 0 },
  // wave 3 (src/lib/data/wave3/jobs.ts)
  "arabicai-machine-learning-engineer-riyadh": { reqs: "statistics:2 python-data:1 ml:1 powerbi:3 dataviz:1", stages: 10, preps: 2 },
  "innovationteam-junior-ai-engineer-computer-vision-riyadh": { reqs: "python-data:1 ml:1 deep-learning:1 apis:1 english:2", stages: 11, preps: 5 },
  "mozn-data-scientist-iii-riyadh": { reqs: "statistics:2 python-data:1 ml:1 deep-learning:1 communication:2", stages: 9, preps: 2 },
  "masterworks-nabeh-ai-engineer-specialist-riyadh": { reqs: "python-data:1 ml:1 deep-learning:1 git:1 llm-apps:1", stages: 10, preps: 5 },
  "tamara-builders-program-data-riyadh": { reqs: "statistics:2 ml:1 problem-solving:1 communication:2 teamwork:1", stages: 10, preps: 3 },
  "arabicai-data-engineer-riyadh": { reqs: "sql:3 python-data:1 apis:1 cloud:1 business-analysis:1", stages: 12, preps: 5 },
  "lucidya-database-administrator-riyadh": { reqs: "sql:3 cloud:2 programming:1 security-fundamentals:1 communication:2", stages: 11, preps: 2 },
  "squadio-odoo-frontend-developer-riyadh": { reqs: "html-css:1 javascript:2 git:1 apis:1 ui-design:1", stages: 9, preps: 3 },
  "lucidya-10x-software-engineer-riyadh": { reqs: "programming:2 sql:3 apis:1 devops:1 problem-solving:1", stages: 13, preps: 5 },
  "tawantech-java-developer-banking-riyadh": { reqs: "programming:2 git:1 apis:1 devops:1 banking-basics:1", stages: 9, preps: 3 },
  "masterworks-adree-outsystems-dotnet-developer-riyadh": { reqs: "programming:2 sql:2 apis:1 agile:1 communication:1", stages: 10, preps: 3 },
  "moyasar-software-engineer-full-stack-riyadh": { reqs: "programming:2 html-css:1 git:1 apis:1 sql:2", stages: 8, preps: 1 },
  "lamdax-mobile-flutter-intern-remote": { reqs: "programming:1 git:1 apis:1 problem-solving:1 flutter:1", stages: 5, preps: 0 },
  "gathern-quality-assurance-engineer-riyadh": { reqs: "agile:1 apis:1 devops:1 english:1 problem-solving:1", stages: 11, preps: 6 },
  "innovationteam-quality-assurance-engineer-riyadh": { reqs: "agile:1 sql:1 apis:1 problem-solving:1 communication:2", stages: 10, preps: 4 },
  "ninja-integration-specialist-riyadh": { reqs: "apis:1 problem-solving:1 communication:1 teamwork:1 customer-success:1", stages: 8, preps: 3 },
  "almosafer-specialist-product-designer-riyadh": { reqs: "figma:2 ux-research:1 ui-design:2 prototyping:1 communication:2", stages: 9, preps: 1 },
  "eram-talent-ui-ux-designer-dhahran": { reqs: "design-basics:1 figma:2 ux-research:1 ui-design:2 teamwork:1", stages: 8, preps: 1 },
  "jeeny-social-media-communication-specialist-riyadh": { reqs: "marketing-basics:1 content:2 social-media:2 video-editing:2 communication:2", stages: 9, preps: 0 },
  "lucidya-activations-campaigns-intern-remote": { reqs: "marketing-basics:1 content:1 seo:1 event-planning:1 communication:1", stages: 5, preps: 0 },
  "lucidya-customer-product-marketing-intern-remote": { reqs: "communication:1 content:1 product-discovery:1 customer-success:1 presentation:1", stages: 7, preps: 2 },
  "tawantech-marketing-specialist-banking-riyadh": { reqs: "marketing-basics:1 social-media:1 banking-basics:1 presentation:1 project-management:1", stages: 6, preps: 1 },
  "qiddiya-analyst-feasibilities-riyadh": { reqs: "project-management:2 business-analysis:1 excel:3 communication:2 presentation:1", stages: 9, preps: 0 },
  "accor-income-auditor-jeddah": { reqs: "accounting:1 internal-audit:1 excel:2 problem-solving:1 english:2", stages: 7, preps: 0 },
  "aljomaih-accountant-saudi-nationals-dammam": { reqs: "accounting:1 financial-analysis:1 internal-audit:1 excel:2 problem-solving:1", stages: 6, preps: 0 },
  "clear-general-accountant-riyadh": { reqs: "accounting:1 financial-analysis:1 internal-audit:1 excel:2 problem-solving:1", stages: 6, preps: 0 },
  "mozn-revenue-assurance-officer-riyadh": { reqs: "accounting:1 excel:2 credit-analysis:1 english:2 problem-solving:1", stages: 8, preps: 1 },
  "ninja-invoice-matching-officer-jeddah": { reqs: "accounting:1 procurement:1 supply-chain:1 internal-audit:1 communication:1", stages: 5, preps: 0 },
  "eram-accounts-payable-analyst-riyadh": { reqs: "accounting:1 financial-analysis:1 internal-audit:1 excel:2 powerbi:1", stages: 6, preps: 0 },
  "eram-contracts-financial-analyst-jeddah": { reqs: "accounting:1 procurement:1 financial-analysis:1 business-analysis:1 english:2", stages: 6, preps: 0 },
  "segadty-hr-coop-trainee-riyadh": { reqs: "hr-basics:1 recruitment:1 payroll:1 excel:1 communication:1", stages: 6, preps: 1 },
  "accor-people-culture-executive-riyadh": { reqs: "hr-basics:2 recruitment:1 labor-law:1 english:2 problem-solving:1", stages: 7, preps: 0 },
  "lucid-payroll-analyst-riyadh": { reqs: "payroll:1 excel:2 accounting:1 communication:1 business-analysis:1", stages: 8, preps: 2 },
  "eram-smp-associate-hr-analyst-dhahran": { reqs: "hr-basics:1 payroll:1 excel:2 powerbi:1 dataviz:1", stages: 7, preps: 1 },
  "ey-resource-management-workforce-planning-specialist-riyadh": { reqs: "hr-basics:2 recruitment:1 training-dev:1 excel:2 communication:1", stages: 7, preps: 0 },
  "saudi-azm-product-manager-riyadh": { reqs: "agile:1 product-specs:1 product-roadmap:1 business-analysis:1 communication:1", stages: 7, preps: 2 },
  "webook-product-manager-riyadh": { reqs: "product-discovery:1 product-roadmap:2 product-specs:1 product-analytics:1 communication:2", stages: 7, preps: 0 },
  "arabicai-operations-security-engineer-riyadh": { reqs: "linux:1 security-fundamentals:2 soc-analysis:1 cloud:2 apis:1", stages: 10, preps: 3 },
  "lucid-purple-teaming-engineer-riyadh": { reqs: "networking:1 security-fundamentals:2 linux:1 soc-analysis:1 communication:2", stages: 7, preps: 0 },
  "ninja-it-governance-analyst-riyadh": { reqs: "security-fundamentals:1 internal-audit:1 corporate-governance:1 excel:1 presentation:1", stages: 8, preps: 3 },
  "syarah-it-helpdesk-specialist-riyadh": { reqs: "networking:1 security-fundamentals:2 problem-solving:1 communication:2 teamwork:1", stages: 7, preps: 0 },
  "bosch-software-development-intern-riyadh": { reqs: "programming:1 cloud:1 devops:1 problem-solving:1 english:2", stages: 8, preps: 2 },
  "deepsource-cloud-administrator-azure-riyadh": { reqs: "networking:1 cloud:2 security-fundamentals:1 problem-solving:1 communication:1", stages: 6, preps: 0 },
  "masterworks-soor-cloud-infrastructure-engineer-riyadh": { reqs: "networking:1 security-fundamentals:2 sql:1 apis:1 problem-solving:1", stages: 9, preps: 3 },
  "saudi-azm-devops-engineer-riyadh": { reqs: "cloud:2 linux:1 devops:1 programming:1 security-fundamentals:1", stages: 7, preps: 1 },
  "moomoo-brokerage-services-support-specialist-riyadh": { reqs: "sales:1 customer-success:1 contact-center-ops:1 banking-basics:1 problem-solving:1", stages: 5, preps: 0 },
  "rentokil-contact-center-specialist-riyadh": { reqs: "sales:1 customer-success:1 contact-center-ops:1 communication:2 english:1", stages: 6, preps: 0 },
  "tamara-customer-care-advisor-non-voice-riyadh": { reqs: "communication:2 english:2 problem-solving:1 customer-success:1 contact-center-ops:1", stages: 8, preps: 1 },
  "hungerstation-account-manager-jeddah": { reqs: "sales:2 customer-success:1 communication:1 teamwork:1 problem-solving:1", stages: 6, preps: 0 },
  "marriott-sales-coordinator-riyadh": { reqs: "sales:1 customer-success:1 marketing-basics:1 guest-service:1 communication:2", stages: 6, preps: 0 },
  "marriott-sales-executive-jeddah": { reqs: "sales:2 customer-success:1 marketing-basics:1 communication:1 presentation:1", stages: 6, preps: 0 },
  "thechefz-customer-care-specialist-riyadh": { reqs: "customer-success:1 contact-center-ops:1 cx-analytics:1 problem-solving:1 communication:2", stages: 7, preps: 1 },
  "ninja-outbound-officer-jeddah": { reqs: "supply-chain:1 excel:1 hse:1 problem-solving:1 communication:1", stages: 6, preps: 1 },
  "hungerstation-3pl-management-specialist-riyadh": { reqs: "supply-chain:1 excel:1 dataviz:1 problem-solving:1 english:2", stages: 8, preps: 2 },
  "syarah-fleet-purchasing-officer-riyadh": { reqs: "procurement:1 supply-chain:1 excel:1 problem-solving:1 english:1", stages: 5, preps: 0 },
  "acwa-store-keeper-afif": { reqs: "procurement:1 supply-chain:1 hse:1 communication:1 english:1", stages: 5, preps: 0 },
  "sgs-junior-civil-structural-design-review-engineer-riyadh": { reqs: "engineering-drawings:1 saudi-building-code:1 english:2 problem-solving:1 teamwork:1", stages: 7, preps: 1 },
  "teefnajd-junior-architect-engineer-riyadh": { reqs: "engineering-drawings:1 bim-revit:1 problem-solving:1 communication:1 teamwork:1", stages: 5, preps: 0 },
  "ultimate-peaks-quality-safety-officer-riyadh": { reqs: "hse:2 quality-control:1 internal-audit:1 problem-solving:1 communication:2", stages: 7, preps: 0 },
  "accor-health-safety-fire-protection-specialist-riyadh": { reqs: "hse:2 mep-systems:1 english:1 problem-solving:1 teamwork:1", stages: 8, preps: 2 },
  "gathern-host-relations-associate-riyadh": { reqs: "sales:1 customer-success:1 guest-service:1 communication:2 teamwork:1", stages: 6, preps: 0 },
  "marriott-voyage-food-beverage-jeddah": { reqs: "communication:2 teamwork:1 presentation:1 project-management:1 problem-solving:1", stages: 6, preps: 0 },
  "accor-sales-executive-social-events-weddings-al-khobar": { reqs: "sales:2 customer-success:1 communication:2 presentation:1 event-planning:1", stages: 7, preps: 0 },
  "eram-community-startups-coordinator-riyadh": { reqs: "project-management:1 event-planning:2 customer-success:1 communication:1 english:2", stages: 8, preps: 1 },
  "eram-events-engagement-officer-jeddah": { reqs: "guest-service:1 event-planning:2 project-management:1 procurement:1 financial-analysis:1", stages: 7, preps: 1 },
  "marriott-event-executive-riyadh": { reqs: "sales:1 guest-service:1 front-office:1 communication:2 teamwork:1", stages: 6, preps: 0 },
  "alborg-customer-care-officer-riyadh": { reqs: "customer-success:1 contact-center-ops:1 cx-analytics:1 health-informatics:1 health-claims:1", stages: 8, preps: 3 },
  "aanaab-early-years-arabic-teacher-jeddah": { reqs: "instructional-design:1 training-delivery:1 arabic-editing:1 communication:1 english:1", stages: 6, preps: 1 },
  "accor-training-supervisor-riyadh": { reqs: "communication:2 presentation:1 english:2 instructional-design:1 training-delivery:2", stages: 8, preps: 0 },
  "abbvie-national-field-trainer-riyadh": { reqs: "sales:1 presentation:1 training-dev:1 training-delivery:1 excel:2", stages: 8, preps: 2 },
  "eram-academic-program-administrator-jeddah": { reqs: "project-management:1 financial-analysis:1 excel:1 problem-solving:1 english:2", stages: 7, preps: 1 },
  "eram-program-development-evaluation-analyst-riyadh": { reqs: "instructional-design:2 elearning-dev:2 training-dev:1 project-management:1 communication:1", stages: 8, preps: 1 },
  "bank-of-jordan-financial-credit-analyst-riyadh": { reqs: "banking-basics:1 credit-analysis:2 statistics:1 financial-analysis:1 english:2", stages: 9, preps: 2 },
  "moyasar-aml-specialist-riyadh": { reqs: "banking-basics:1 aml-compliance:2 problem-solving:1 communication:1 english:1", stages: 6, preps: 0 },
  "ultimate-peaks-internal-auditor-operations-riyadh": { reqs: "internal-audit:2 excel:2 powerbi:1 supply-chain:1 communication:1", stages: 8, preps: 1 },
  "bayut-dubizzle-legal-coordinator-tamheer-riyadh": { reqs: "legal-research:1 contract-drafting:1 corporate-governance:1 english:2 presentation:1", stages: 7, preps: 1 },
  "khayira-legal-administrative-specialist-riyadh": { reqs: "contract-drafting:1 corporate-governance:1 labor-law:1 english:1 excel:1", stages: 7, preps: 2 },
  "alkaffary-legal-coordinator-riyadh": { reqs: "legal-research:1 contract-drafting:1 corporate-governance:1 labor-law:1 communication:1", stages: 6, preps: 1 },
  "rawafid-governance-prequalification-officer-jeddah": { reqs: "corporate-governance:1 procurement:1 excel:1 problem-solving:1 communication:1", stages: 6, preps: 1 },
  "flow-leasing-coordinator-riyadh": { reqs: "property-management:2 sales:1 customer-success:1 excel:1 english:2", stages: 7, preps: 0 },
  "riyadhair-flight-following-specialist-riyadh": { reqs: "aviation-ops:2 flight-dispatch:1 communication:1 teamwork:1 problem-solving:1", stages: 6, preps: 0 },
  "riyadhair-operations-controller-riyadh": { reqs: "aviation-ops:2 flight-dispatch:1 problem-solving:1 communication:1 teamwork:1", stages: 6, preps: 0 },
  "accor-government-relations-supervisor-riyadh": { reqs: "labor-law:1 communication:2 english:1 problem-solving:1 government-relations:1", stages: 7, preps: 1 },
  "qiddiya-analyst-government-relations-riyadh": { reqs: "legal-research:1 corporate-governance:1 labor-law:1 communication:1 government-relations:1", stages: 6, preps: 1 },
  "jodayn-tamheer-internal-communications-riyadh": { reqs: "content:1 arabic-editing:1 communication:2 english:1 corporate-communications:1", stages: 9, preps: 3 },
  "eram-media-content-creation-riyadh": { reqs: "content:2 video-editing:1 english:2 presentation:1 public-relations:1", stages: 9, preps: 2 },
};

/** The snapshots the real jobs were written from (20 Nov 2026): the job boards, and Maharah's own careers board. */
const readSnapshot = (file: string) => JSON.parse(readFileSync(path.join(import.meta.dirname, "../../../research/jobs", file), "utf8")) as {
  readonly checkedAt: string;
  readonly jobs: readonly {
    readonly id: string;
    readonly title: string;
    readonly titleAr: string;
    readonly url: string;
    readonly postedAt: string;
    readonly company: { readonly en: string; readonly ar: string };
    readonly requirements: readonly { readonly skill: string; readonly stars: number; readonly evidence: string }[];
  }[];
};
/** Wave 2's career files keep their jobs in the app's shape (research/expansion/expansion.json); read as snapshot rows. */
const WAVE2_CAREER_FILES = ["engineering.json", "tourism-health-education.json", "finance-legal-media-gaming.json"];
function readWave2CareerJobs(file: string): ReturnType<typeof readSnapshot>["jobs"] {
  const data = JSON.parse(readFileSync(path.join(import.meta.dirname, "../../../research/wave2", file), "utf8")) as {
    readonly jobs: readonly {
      readonly id: string;
      readonly title: string;
      readonly titleEn: string;
      readonly company: string;
      readonly companyEn: string;
      readonly source: { readonly url: string; readonly postedAt: string };
      readonly requirements: readonly { readonly skill: string; readonly stars: number; readonly evidence: string }[];
    }[];
  };
  return data.jobs.map((j) => ({
    id: j.id,
    title: j.titleEn,
    titleAr: j.title,
    url: j.source.url,
    postedAt: j.source.postedAt,
    company: { en: j.companyEn, ar: j.company },
    requirements: j.requirements,
  }));
}
/**
 * Wave 3's files (research/wave3, 21 Nov 2026) read as snapshot rows, each with its own day. A posting whose own line the
 * research listed under missingSkills (the skill did not exist yet) carries that line as a new skill's evidence
 * (research/wave3/remap.json, the table research/wave3/build.py applies).
 */
type Wave3Req = { readonly skill: string; readonly stars: number; readonly evidence: string };
const readWave3 = (file: string) => JSON.parse(readFileSync(path.join(import.meta.dirname, "../../../research/wave3", file), "utf8")) as unknown;
const WAVE3_REMAP = (readWave3("remap.json") as { readonly remap: Readonly<Record<string, { readonly drop: string; readonly add: Wave3Req }>> }).remap;
const remapped = (id: string, reqs: readonly Wave3Req[]): readonly Wave3Req[] => {
  const r = WAVE3_REMAP[id];
  return r ? [...reqs.filter((x) => x.skill !== r.drop), r.add] : reqs;
};
function readWave3Jobs(): (ReturnType<typeof readSnapshot>["jobs"][number] & { readonly checkedAt: string })[] {
  const tech = readWave3("tech-jobs.json") as {
    readonly postings: readonly { id: string; title: string; titleAr: string; url: string; postedAt: string; checkedAt: string; company: { en: string; ar: string }; requirements: readonly Wave3Req[] }[];
  };
  const business = readWave3("business-jobs.json") as {
    readonly postings: readonly { id: string; titleEn: string; title: string; url: string; postedAt: string; checkedAt: string; companyEn: string; company: string; requirements: readonly Wave3Req[] }[];
  };
  const careers = readWave3("new-careers.json") as {
    readonly jobs: readonly { id: string; titleEn: string; title: string; companyEn: string; company: string; source: { url: string; postedAt: string; checkedAt: string }; requirements: readonly Wave3Req[] }[];
  };
  return [
    ...tech.postings.map((j) => ({ id: j.id, title: j.title, titleAr: j.titleAr, url: j.url, postedAt: j.postedAt, company: j.company, requirements: remapped(j.id, j.requirements), checkedAt: j.checkedAt })),
    ...business.postings.map((j) => ({
      id: j.id, title: j.titleEn, titleAr: j.title, url: j.url, postedAt: j.postedAt, company: { en: j.companyEn, ar: j.company },
      requirements: remapped(j.id, j.requirements), checkedAt: j.checkedAt,
    })),
    ...careers.jobs.map((j) => ({
      id: j.id, title: j.titleEn, titleAr: j.title, url: j.source.url, postedAt: j.source.postedAt, company: { en: j.companyEn, ar: j.company },
      requirements: j.requirements, checkedAt: j.source.checkedAt,
    })),
  ];
}
const SNAPSHOT = {
  checkedAt: readSnapshot("jobs-snapshot.json").checkedAt,
  jobs: [
    ...readSnapshot("jobs-snapshot.json").jobs,
    ...readSnapshot("maharah.json").jobs,
    ...readSnapshot("../expansion/raw/jobs.json").jobs,
    // wave 2: the career files first (their postings are in the app's shape; two of them also sit, with fewer of the app's
    // skills, in companies-jobs.json), then the companies' roles
    ...WAVE2_CAREER_FILES.flatMap(readWave2CareerJobs),
    ...readSnapshot("../wave2/companies-jobs.json").jobs,
    // wave 3 (21 Nov 2026), each row with its own day
    ...readWave3Jobs(),
  ],
};

describe("jobs (9.3, 9.8 checks 3 and 9; real postings of 20 Nov 2026)", () => {
  it("has 170 jobs in data order (28 + the expansion's 18 + wave 2's 38 + wave 3's 86) with five requirements each, as listed", () => {
    expect(JOBS.map((j) => j.id)).toEqual([...JOB_IDS]);
    expect(CATALOGUE_COUNTS.jobs).toBe(JOBS.length);
    expect(JOBS).toHaveLength(170);
    for (const job of JOBS) {
      expect(job.requirements, job.id).toHaveLength(5);
      expect(job.requirements.map((r) => `${r.skill}:${r.stars}`).join(" "), job.id).toBe(JOB_TABLE[job.id].reqs);
      expect(new Set(job.requirements.map((r) => r.skill)).size, job.id).toBe(5);
    }
  });

  it("keeps ONE practice job (the demo's «محلل بيانات») and 169 real postings", () => {
    expect(JOBS.filter((j) => !j.real).map((j) => j.id)).toEqual(["data-analyst-riyadh"]);
    const practice = getJob("data-analyst-riyadh");
    expect(practice.source).toBeUndefined();
    expect(practice.requirements.every((r) => r.evidence === undefined)).toBe(true);
    expect(JOBS.filter((j) => j.real)).toHaveLength(169);
  });

  it("gives every real job its source, link, dates, both names and the posting's own sentence per requirement, as in the snapshot", () => {
    for (const job of JOBS.filter((j) => j.real)) {
      const snap = SNAPSHOT.jobs.find((s) => s.id === job.id);
      expect(snap, job.id).toBeDefined();
      if (!snap || !job.source) throw new Error(`no source for ${job.id}`);
      expect(job.source.url).toBe(snap.url);
      expect(job.source.url.startsWith("https://"), job.id).toBe(true);
      expect(job.source.checkedAt).toBe(("checkedAt" in snap ? snap.checkedAt : undefined) ?? SNAPSHOT.checkedAt);
      expect(job.source.postedAt).toBe(snap.postedAt);
      expect((job.source.postedAt ?? "") <= job.source.checkedAt, job.id).toBe(true);
      expect(job.source.site.length, job.id).toBeGreaterThan(0);
      expect(job.title).toBe(snap.titleAr);
      expect(job.titleEn).toBe(snap.title);
      expect(job.company).toBe(snap.company.ar);
      expect(job.companyEn).toBe(snap.company.en);
      for (const r of job.requirements) {
        const from = snap.requirements.find((s) => s.skill === r.skill);
        expect(from, `${job.id} ${r.skill}`).toBeDefined();
        // the posting's level, capped at the stars the skill has in Dalilak (the cap is written in the source note)
        expect(r.stars, `${job.id} ${r.skill}`).toBe(Math.min(from?.stars ?? 0, getSkill(r.skill).maxStars));
        if (r.stars !== from?.stars) expect(job.source.note ?? "", job.id).toContain("capped");
        expect(r.evidence, `${job.id} ${r.skill}`).toBe(from?.evidence);
      }
    }
  });

  it("lists a real job's requirements in roadmap order: a listed prerequisite comes before the skill that needs it", () => {
    for (const job of JOBS) {
      const order = job.requirements.map((r) => r.skill);
      order.forEach((skill, i) => {
        for (const p of prereqsOf(skill)) {
          const at = order.indexOf(p);
          if (at >= 0) expect(at, `${job.id}: ${p} before ${skill}`).toBeLessThan(i);
        }
      });
    }
  });

  it("never asks for more stars than a skill has", () => {
    for (const job of JOBS) {
      for (const r of job.requirements) expect(r.stars, `${job.id} ${r.skill}`).toBeLessThanOrEqual(getSkill(r.skill).maxStars);
    }
  });

  it("requires 95 of the 114 skills in at least one job (no posting asks for paid ads; four wave-2 and 14 wave-3 skills have no open posting yet)", () => {
    const required = new Set(JOBS.flatMap((j) => j.requirements.map((r) => r.skill)));
    expect(SKILL_IDS.filter((s) => !required.has(s))).toEqual([
      "ads", "tour-guiding", "medical-terminology", "game-design", "game-testing",
      // wave 3 (bim-revit now has a posting: Teef Najd's junior architect)
      "esg-fundamentals", "esg-reporting", "carbon-accounting", "facilities-management", "real-estate-valuation", "insurance-basics",
      "underwriting", "insurance-claims", "ios-swift", "android-kotlin", "routing-switching", "mobile-networks", "fiber-optics",
      "ground-handling",
    ]);
  });

  it("splits the jobs by field 15/14/7/9/13/10/5/14/20, by city 135/18/10/7 and by band 30/61/79 (waves 2 and 3 included)", () => {
    const count = <K extends string>(key: (j: Job) => K, value: K) => JOBS.filter((j) => key(j) === value).length;
    expect(
      ["data", "software", "design", "marketing", "business", "hr", "product", "cyber-cloud", "sales-supply"].map((f) =>
        count((j) => j.field, f),
      ),
    ).toEqual([15, 14, 7, 9, 13, 10, 5, 14, 20]);
    expect(JOB_CITY_IDS.map((c) => count((j) => j.city, c))).toEqual([135, 18, 10, 7]);
    expect(["entry", "junior", "mid"].map((b) => count((j) => j.band, b))).toEqual([30, 61, 79]);
  });

  it("gives every job's stage count and prep count (the reveal's three: 8/74, 8/64, 5/38)", () => {
    for (const job of JOBS) {
      const { courses, preps } = stagesOf(job);
      expect(courses.length, job.id).toBe(JOB_TABLE[job.id].stages);
      expect(preps, job.id).toBe(JOB_TABLE[job.id].preps);
    }
    const hours = (id: JobId) => stagesOf(getJob(id)).courses.reduce((sum, c) => sum + getCourse(c).hours, 0);
    expect(hours("data-analyst-riyadh")).toBe(74);
    expect(hours("qiddiya-hr-analytics-analyst-riyadh")).toBe(64);
    expect(hours("syarah-financial-analyst-tamheer-riyadh")).toBe(38);
    expect(Math.min(...JOBS.map((j) => stagesOf(j).courses.length))).toBe(5);
    expect(Math.max(...JOBS.map((j) => stagesOf(j).courses.length))).toBe(13);
  });

  it("keeps the demo job's text exactly as 9.3 writes it", () => {
    const job = getJob("data-analyst-riyadh");
    expect(job.title).toBe("محلل بيانات");
    expect(job.company).toBe("وادي الغيم للبيانات");
    expect(job.summary).toBe("تحوّل بيانات المبيعات والعمليات إلى تقارير ولوحات معلومات تساعد الفرق على اتخاذ القرار.");
    expect(job.tasks).toEqual([
      "استخراج البيانات بـ SQL وتنظيفها في Excel",
      "بناء لوحات معلومات بـ Power BI ومتابعتها أسبوعياً",
      "عرض النتائج على الفرق بلغة واضحة",
    ]);
  });

  it("writes one summary sentence of at most 25 words and three task lines of at most 10 words, with no numbers", () => {
    for (const job of JOBS) {
      expect(job.summary.endsWith("."), job.id).toBe(true);
      expect(job.summary.split(".").length - 1, job.id).toBe(1);
      expect(wordCount(job.summary), job.id).toBeLessThanOrEqual(25);
      expect(job.tasks, job.id).toHaveLength(3);
      for (const task of job.tasks) {
        expect(wordCount(task), `${job.id}: ${task}`).toBeLessThanOrEqual(10);
        expect(task.endsWith("."), `${job.id}: ${task}`).toBe(false);
      }
      for (const text of [job.title, job.company, job.summary, ...job.tasks]) {
        expect(/[0-9٠-٩]/.test(text), `${job.id}: ${text}`).toBe(false);
      }
    }
  });

  it("names the cities and bands of 9.3", () => {
    expect(JOB_CITIES.map((c) => c.id)).toEqual([...JOB_CITY_IDS]);
    expect(JOB_CITIES.map((c) => c.name)).toEqual(["الرياض", "جدة", "الدمام", "عن بُعد"]);
    expect(getJobCity("remote").name).toBe("عن بُعد");
  });
});

// ─── 9.8 check 8: honest sample data ──────────────────────────────────────────────────────────────────────────────

/** Spec 9.7: never in a company name (compared word by word, with «ال» and one-letter prefixes removed). */
const FORBIDDEN_COMPANY_WORDS = [
  "السعودية",
  "الوطنية",
  "العربية",
  "الخليج",
  "المملكة",
  "ديوان",
  "مجلس",
  "مرصد",
  "هيئة",
  "وزارة",
  "صندوق",
  "أمانة",
  "بنك",
  "مصرف",
  "مصرفية",
  "اتصالات",
  "تمويل",
  "السنبلة",
  "المرجان",
  "سدرة",
  "جسر",
  "فنار",
  "البرق",
  "السديم",
  "النيزك",
  "رواق",
  "ندى",
  "السنديان",
];

describe("honest sample data (9.7, 9.8 check 8)", () => {
  const catalogue = { FIELDS, SKILLS, JOBS, COURSES, LEADERBOARD_USERS, LEVELS, BADGES, ONBOARDING_QUESTIONS, JOB_CITIES, SAMPLE_CV_BODY };

  it("uses no forbidden word in the practice job's fictional company, and no real job uses it", () => {
    const withoutAl = (w: string) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w);
    const forbidden = new Set(FORBIDDEN_COMPANY_WORDS.flatMap((w) => [norm(w), withoutAl(norm(w))]));
    for (const job of JOBS.filter((j) => !j.real)) {
      for (const word of words(job.company)) {
        for (const reading of readings(word)) expect(forbidden.has(reading), `${job.company}: ${word}`).toBe(false);
      }
    }
    expect(JOBS.filter((j) => j.company === "وادي الغيم للبيانات").map((j) => j.id)).toEqual(["data-analyst-riyadh"]);
  });

  it("mentions no money, salary or currency anywhere in the jobs", () => {
    for (const job of JOBS) {
      for (const text of [job.summary, ...job.tasks, job.company, job.title]) {
        expect(/ريال|راتب|SAR|salary/i.test(text), text).toBe(false);
      }
    }
    for (const text of allStrings(catalogue)) expect(text.includes("ريال"), text).toBe(false);
  });

  it("names two invented organisations inside the sample CV, neither of them a real company of the data (no sample label: 21 Nov 2026)", () => {
    expect(SAMPLE_CV_BODY).toContain("جامعة التلال السبع");
    expect(SAMPLE_CV_BODY).toContain("متجر الفانوس النحاسي");
    expect(SAMPLE_CV_BODY).not.toContain("تجريبية");
    const names = new Set(COMPANIES.flatMap((c) => [c.name, c.short]));
    expect(names.has("جامعة التلال السبع") || names.has("متجر الفانوس النحاسي")).toBe(false);
  });
});

// ─── 9.8 check 7: leaderboard ─────────────────────────────────────────────────────────────────────────────────────

/** Spec 9.5 level and weekly-rank columns, u01..u24. */
const LEVEL_COLUMN = [7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1];
const RANK_COLUMN = [7, 1, 9, 4, 14, 2, 11, 6, 17, 3, 20, 5, 12, 8, 22, 10, 15, 13, 18, 16, 19, 21, 23, 24];

function levelOf(totalXp: number): number {
  return LEVEL_THRESHOLDS.filter((t) => totalXp >= t).length;
}

describe("leaderboard users (9.5, 9.8 check 7)", () => {
  const byWeekly = [...LEADERBOARD_USERS].sort((a, b) => b.weeklyXp - a.weeklyXp);

  it("has 24 users with all totals different and all weekly values different and never above the total", () => {
    expect(LEADERBOARD_USERS.map((u) => u.id)).toEqual([...LEADERBOARD_USER_IDS]);
    expect(CATALOGUE_COUNTS.leaderboardUsers).toBe(24);
    expect(new Set(LEADERBOARD_USERS.map((u) => u.totalXp)).size).toBe(24);
    expect(new Set(LEADERBOARD_USERS.map((u) => u.weeklyXp)).size).toBe(24);
    for (const u of LEADERBOARD_USERS) expect(u.weeklyXp, u.id).toBeLessThanOrEqual(u.totalXp);
  });

  it("derives the levels of the table from 8.3", () => {
    expect(LEADERBOARD_USERS.map((u) => levelOf(u.totalXp))).toEqual(LEVEL_COLUMN);
  });

  it("ranks by weekly XP as the table says, فيصل ق. · سلطان م. · مشعل ر. on top", () => {
    expect(LEADERBOARD_USERS.map((u) => byWeekly.indexOf(u) + 1)).toEqual(RANK_COLUMN);
    expect(byWeekly.slice(0, 3).map((u) => u.name)).toEqual(["فيصل ق.", "سلطان م.", "مشعل ر."]);
    expect(byWeekly.slice(0, 3).map((u) => u.weeklyXp)).toEqual([980, 910, 860]);
  });

  it("never gives two weekly neighbours the same avatar, and never av-01..av-04", () => {
    for (let i = 1; i < byWeekly.length; i++) {
      expect(byWeekly[i]?.avatar, `${byWeekly[i - 1]?.id} / ${byWeekly[i]?.id}`).not.toBe(byWeekly[i - 1]?.avatar);
    }
    for (const u of LEADERBOARD_USERS) expect(["av-01", "av-02", "av-03", "av-04"]).not.toContain(u.avatar);
    for (const avatar of ["av-05", "av-06", "av-07", "av-08", "av-09", "av-10", "av-11", "av-12"]) {
      expect(LEADERBOARD_USERS.filter((u) => u.avatar === avatar), avatar).toHaveLength(3);
    }
  });

  it("puts the demo's ranks where 8.8 says (more weekly XP than the user, plus one)", () => {
    const rankAt = (xp: number) => LEADERBOARD_USERS.filter((u) => u.weeklyXp > xp).length + 1;
    expect([0, 50, 80, 180, 380, 420, 480, 660].map(rankAt)).toEqual([25, 23, 22, 18, 10, 10, 8, 6]);
    expect(getLeaderboardUser("u14").weeklyXp).toBe(480);
  });
});

// ─── levels, badges, onboarding, sample CV ────────────────────────────────────────────────────────────────────────

describe("levels and badges (8.3, 8.6)", () => {
  it("has the seven levels of 8.3", () => {
    expect(LEVELS.map((l) => [l.level, l.title, l.from])).toEqual([
      [1, "مبتدئ", 0],
      [2, "مستكشف", 150],
      [3, "مجتهد", 350],
      [4, "متمكّن", 600],
      [5, "محترف", 1000],
      [6, "خبير", 1600],
      [7, "أسطورة", 2500],
    ]);
    expect(getLevel(3).title).toBe("مجتهد");
  });

  it("has the twelve badges of 8.6 in table order, each with a name, a description and a hint", () => {
    expect(BADGES.map((b) => b.id)).toEqual([...BADGE_IDS]);
    expect(CATALOGUE_COUNTS.badges).toBe(12);
    for (const b of BADGES) {
      expect(b.name.length * b.description.length * b.hint.length, b.id).toBeGreaterThan(0);
    }
    expect(getBadge("first-steps")).toEqual({
      id: "first-steps",
      name: "الخطوة الأولى",
      description: "أكملت التعارف مع دليلك.",
      hint: "أكمل التعارف مع دليلك.",
    });
    expect(getBadge("top-ten").name).toBe("ضمن العشرة الأوائل");
  });
});

describe("onboarding questions (4.2, 3.2)", () => {
  it("asks the six questions in order, with the 3.2 slot labels", () => {
    expect(ONBOARDING_QUESTIONS.map((q) => q.id)).toEqual([...QUESTION_IDS]);
    expect(ONBOARDING_QUESTIONS.map((q) => q.n)).toEqual([1, 2, 3, 4, 5, 7]);
    expect(ONBOARDING_QUESTIONS.map((q) => q.slot)).toEqual(["المدينة", "المؤهل", "التخصص", "الخبرة", "الاهتمام", "الأولوية"]);
    expect(getQuestion("city").text).toBe("في أي مدينة أنت الحين؟");
    expect(getQuestion("priority").text).toBe("وآخر سؤال، وش أولويتك الحين؟");
  });

  it("offers each question's chips in the order of the ids, and only question 3 has a variant", () => {
    for (const q of ONBOARDING_QUESTIONS) {
      expect(q.options.map((o) => o.id), q.id).toEqual([...OPTIONS_BY_QUESTION[q.id]]);
      expect(q.textAfterSecondary === null, q.id).toBe(q.id !== "major");
    }
    expect(getQuestion("major").textAfterSecondary).toBe("طيب، وش أقرب مجال لك، دراسة أو تدريب؟");
  });

  it("reads option labels", () => {
    expect(optionLabel("city", "riyadh")).toBe("الرياض");
    expect(optionLabel("major", "mis")).toBe("نظم معلومات إدارية");
    expect(optionLabel("experience", "1to3")).toBe("من سنة إلى 3 سنوات");
    expect(optionLabel("interest", "data")).toBe("الأرقام والبيانات");
    expect(optionLabel("priority", "first-job")).toBe("أول وظيفة بأسرع وقت");
    expect(optionLabel("city", "abha")).toBeNull();
  });
});

describe("sample CV (6.2)", () => {
  it("stores lines 2.. of 6.2 with LF line endings, and puts the user's name on top", () => {
    const lines = SAMPLE_CV_BODY.split("\n");
    expect(lines).toHaveLength(26);
    expect(lines[0]).toBe("الرياض");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("نبذة");
    expect(lines.at(-1)).toBe("الإنجليزية: جيد جداً.");
    expect(SAMPLE_CV_BODY.includes("\r")).toBe(false);
    expect(lines).toContain("- تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.");
    expect(lines).toContain("من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.");
    expect(lines).toContain("التواصل، العمل الجماعي، العرض والتقديم.");
    expect(sampleCvText("خالد")).toBe(`خالد\n${SAMPLE_CV_BODY}`);
  });
});

describe("lookups", () => {
  it("find by id and throw on an unknown id (ids are typed, so that is a bug)", () => {
    expect(getSkill("powerbi").name).toBe("Power BI");
    expect(getJob("syarah-financial-analyst-tamheer-riyadh").title).toBe("محلل مالي (برنامج تمهير)");
    expect(getCourse("c-git-1").hours).toBe(6);
    expect(() => getSkill("nope" as string as SkillId)).toThrow();
    expect(() => getJob("nope" as string as JobId)).toThrow();
    expect(() => getCourse("nope" as string as CourseId)).toThrow();
  });
});
