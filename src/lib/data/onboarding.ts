// Owner: data. The six onboarding questions of spec 4.2, in order: the slot labels of 3.2, the question text, the q3
// variant after `secondary`, and the chips with their option ids and labels. Pure module.
// The acknowledgements, special replies and keyword tables of 4.3-4.5 are the onboarding interpreter's
// (src/lib/brain/onboarding, owner brain-advisor), not data.
// 20 Nov 2026 (owner's part 2): the optional seventh step, COMPANY_QUESTION, asked right after «الاهتمام» (step 6; the
// priority question is now step 7). It stays out of ONBOARDING_QUESTIONS (the six of spec 4.2); getQuestion knows both.
import type { OnboardingQuestion, OnboardingStepId } from "@/lib/types";

import { COMPANIES, COMPANY_NONE_LABEL } from "./companies";

export const ONBOARDING_QUESTIONS: readonly OnboardingQuestion[] = [
  {
    id: "city",
    n: 1,
    slot: "المدينة",
    text: "في أي مدينة أنت الحين؟",
    textAfterSecondary: null,
    options: [
      { id: "riyadh", label: "الرياض" },
      { id: "jeddah", label: "جدة" },
      { id: "dammam", label: "الدمام" },
      { id: "makkah", label: "مكة المكرمة" },
      { id: "madinah", label: "المدينة المنورة" },
      { id: "other", label: "مدينة أخرى" },
    ],
  },
  {
    id: "education",
    n: 2,
    slot: "المؤهل",
    text: "وش آخر شهادة دراسية أخذتها؟",
    textAfterSecondary: null,
    options: [
      { id: "secondary", label: "ثانوي" },
      { id: "diploma", label: "دبلوم" },
      { id: "bachelor", label: "بكالوريوس" },
      { id: "postgrad", label: "ماجستير أو أعلى" },
      { id: "student", label: "ما زلت أدرس" },
    ],
  },
  {
    id: "major",
    n: 3,
    slot: "التخصص",
    text: "طيب، وش تخصصك؟",
    textAfterSecondary: "طيب، وش أقرب مجال لك، دراسة أو تدريب؟",
    options: [
      { id: "cs", label: "حاسب وتقنية معلومات" },
      { id: "mis", label: "نظم معلومات إدارية" },
      { id: "business", label: "إدارة أعمال" },
      { id: "finance", label: "مالية ومحاسبة" },
      { id: "marketing", label: "تسويق" },
      { id: "hr", label: "موارد بشرية" },
      { id: "design", label: "تصميم وإعلام" },
      { id: "engineering", label: "هندسة" },
      { id: "science", label: "علوم ورياضيات" },
      { id: "other", label: "تخصص آخر" },
    ],
  },
  {
    id: "experience",
    n: 4,
    slot: "الخبرة",
    text: "وعندك خبرة شغل؟ كم سنة تقريباً؟",
    textAfterSecondary: null,
    options: [
      { id: "none", label: "بدون خبرة بعد" },
      { id: "under1", label: "أقل من سنة" },
      { id: "1to3", label: "من سنة إلى 3 سنوات" },
      { id: "over3", label: "أكثر من 3 سنوات" },
    ],
  },
  {
    id: "interest",
    n: 5,
    slot: "الاهتمام",
    text: "وش نوع الشغل اللي يشدّك أكثر؟",
    textAfterSecondary: null,
    options: [
      { id: "data", label: "الأرقام والبيانات" },
      { id: "software", label: "بناء المواقع والتطبيقات" },
      { id: "design", label: "التصميم والإبداع" },
      { id: "marketing", label: "التسويق والمحتوى" },
      { id: "business", label: "تنظيم الأعمال والمشاريع" },
      { id: "hr", label: "العمل مع الناس وتطويرهم" },
      // 21 Nov 2026 (owner): a tile per job field with a real path (each id is its field's id)
      { id: "product", label: "إدارة المنتجات" },
      { id: "cyber-cloud", label: "الأمن السيبراني والسحابة" },
      { id: "sales-supply", label: "المبيعات وخدمة العملاء" },
      { id: "engineering", label: "الهندسة والإنشاءات" },
      { id: "banking-risk", label: "البنوك والتدقيق" },
      { id: "unsure", label: "لم أحدّد بعد" },
    ],
  },
  {
    id: "priority",
    n: 6,
    slot: "الأولوية",
    // 21 Nov 2026: asked before the interest now (the interest builds on it), so it is no longer «وآخر سؤال»
    text: "وش أولويتك الحين؟",
    textAfterSecondary: null,
    options: [
      { id: "first-job", label: "أول وظيفة بأسرع وقت" },
      { id: "switch", label: "أغيّر مجالي" },
      { id: "grow", label: "أتطوّر في مجالي" },
      { id: "explore", label: "أستكشف خياراتي" },
    ],
  },
];

/**
 * Step 6 of 7: «وفيه شركة أو وظيفة معيّنة في بالك؟». Its options are every company «دليلك» knows (the model's classification
 * of a typed name reads them) and «لا، مو الحين»; the tiles show only the companies of the user's field
 * (brain/onboarding `questionChips`, data `companyTiles`).
 */
export const COMPANY_QUESTION: OnboardingQuestion<"company"> = {
  id: "company",
  n: 7,
  slot: "الشركة",
  text: "وفيه شركة أو وظيفة معيّنة في بالك؟",
  textAfterSecondary: null,
  options: [...COMPANIES.map((c) => ({ id: c.id, label: c.short })), { id: "none", label: COMPANY_NONE_LABEL }],
};

/**
 * 21 Nov 2026 (owner: «when you shift your career it should ask what you are interested in and give a suggestion based on
 * his current career»): «وش مجال شغلك الحين؟», asked right after the priority, only for «أتطوّر في مجالي» / «أغيّر مجالي».
 * Its options are every job field (the model's classification of a typed job reads them) and «مجال آخر»; the tiles show
 * the common ones (CURRENT_TILES). Each label is the field as a person says where they work.
 */
export const CURRENT_QUESTION: OnboardingQuestion<"current"> = {
  id: "current",
  n: 7,
  slot: "مجالك",
  text: "وش مجال شغلك الحين؟",
  textAfterSecondary: null,
  options: [
    { id: "data", label: "البيانات والتحليل" },
    { id: "software", label: "البرمجة والتقنية" },
    { id: "design", label: "التصميم" },
    { id: "marketing", label: "التسويق" },
    { id: "business", label: "المحاسبة والمالية" },
    { id: "hr", label: "الموارد البشرية" },
    { id: "product", label: "إدارة المنتجات" },
    { id: "cyber-cloud", label: "الأمن السيبراني والشبكات" },
    { id: "sales-supply", label: "المبيعات وخدمة العملاء" },
    { id: "engineering", label: "الهندسة" },
    { id: "project-controls", label: "التخطيط وضبط المشاريع" },
    { id: "tourism-hospitality", label: "السياحة والضيافة" },
    { id: "health-admin", label: "القطاع الصحي" },
    { id: "education", label: "التعليم والتدريب" },
    { id: "banking-risk", label: "البنوك والتدقيق" },
    { id: "legal", label: "القانون" },
    { id: "media", label: "الإعلام والإنتاج" },
    { id: "gaming", label: "الألعاب" },
    { id: "energy-sustainability", label: "الطاقة والاستدامة" },
    { id: "real-estate", label: "العقار والمرافق" },
    { id: "aviation", label: "الطيران" },
    { id: "communications", label: "العلاقات العامة" },
    { id: "other", label: "مجال آخر" },
  ],
};

/** The tiles of «وش مجال شغلك الحين؟», in the order shown (the common fields of work), then «مجال آخر». */
export const CURRENT_TILES = [
  "business", "sales-supply", "hr", "marketing", "software", "data", "design", "engineering", "education", "banking-risk", "other",
] as const satisfies readonly (typeof CURRENT_QUESTION.options)[number]["id"][];

/**
 * 21 Nov 2026 (owner: «أتطوّر في مجالي» must upgrade the current career): «وش تخصصك فيه بالضبط؟», after the current field,
 * for grow only. Its options depend on the field (brain/onboarding `questionChips`: the field's tracks with jobs, then
 * «غير كذا»), so the static list holds only «غير كذا».
 */
export const CURRENT_TRACK_QUESTION: OnboardingQuestion<"currentTrack"> = {
  id: "currentTrack",
  n: 7,
  slot: "دورك",
  text: "وش تخصصك فيه بالضبط؟",
  textAfterSecondary: null,
  options: [{ id: "other", label: "غير كذا" }],
};

/** The question with this id, the seventh step included (narrow its options by checking `question.id`). */
export function getQuestion(id: OnboardingStepId): OnboardingQuestion {
  if (id === "company") return COMPANY_QUESTION;
  if (id === "current") return CURRENT_QUESTION;
  if (id === "currentTrack") return CURRENT_TRACK_QUESTION;
  const question = ONBOARDING_QUESTIONS.find((q) => q.id === id);
  if (!question) throw new Error(`data: unknown question ${id}`);
  return question;
}

/** The label of an option id of a question («riyadh» → «الرياض»), or null when the id is not an option. */
export function optionLabel(question: OnboardingStepId, option: string): string | null {
  const found = question === "company" ? COMPANY_QUESTION : question === "current" ? CURRENT_QUESTION : question === "currentTrack" ? CURRENT_TRACK_QUESTION : ONBOARDING_QUESTIONS.find((q) => q.id === question);
  const opt = found?.options.find((o) => o.id === option);
  return opt ? opt.label : null;
}
