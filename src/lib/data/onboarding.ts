// Owner: data. The six onboarding questions of spec 4.2, in order: the slot labels of 3.2, the question text, the q3
// variant after `secondary`, and the chips with their option ids and labels. Pure module.
// The acknowledgements, special replies and keyword tables of 4.3-4.5 are the onboarding interpreter's
// (src/lib/brain/onboarding, owner brain-advisor), not data.
import type { OnboardingQuestion, QuestionId } from "@/lib/types";

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
      { id: "unsure", label: "لم أحدّد بعد" },
    ],
  },
  {
    id: "priority",
    n: 6,
    slot: "الأولوية",
    text: "وآخر سؤال، وش أولويتك الحين؟",
    textAfterSecondary: null,
    options: [
      { id: "first-job", label: "أول وظيفة بأسرع وقت" },
      { id: "switch", label: "أغيّر مجالي" },
      { id: "grow", label: "أتطوّر في مجالي" },
      { id: "explore", label: "أستكشف خياراتي" },
    ],
  },
];

/** The question with this id (narrow its options by checking `question.id`). */
export function getQuestion(id: QuestionId): OnboardingQuestion {
  const question = ONBOARDING_QUESTIONS.find((q) => q.id === id);
  if (!question) throw new Error(`data: unknown question ${id}`);
  return question;
}

/** The label of an option id of a question («riyadh» → «الرياض»), or null when the id is not an option. */
export function optionLabel(question: QuestionId, option: string): string | null {
  const found = ONBOARDING_QUESTIONS.find((q) => q.id === question);
  const opt = found?.options.find((o) => o.id === option);
  return opt ? opt.label : null;
}
