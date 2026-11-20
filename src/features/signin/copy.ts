// Owner: signin. Every string of the sign-in screen, word for word from docs/PRODUCT-SPEC.md 3.1 (and the few product
// strings the showcase pieces repeat from 2.6, 3.4, 3.5, 3.14). Names, numbers and titles come from @/lib/data.
import type { NameError } from "@/lib/types";

export const SIGNIN_COPY = {
  headline: "مسارك المهني يبدأ بخطوة.",
  /** The headline split where the drawn first step sits under its last word. */
  headlineLead: "مسارك المهني يبدأ",
  headlineStep: "بخطوة.",
  support: "اكتب اسمك وابدأ. دليلك يتعرّف عليك، يقرأ سيرتك، ويرسم لك الطريق إلى وظيفتك.",
  accountsHeading: "أكمل بحساب محفوظ",
  fieldLabel: "اسمك",
  fieldPlaceholder: "مثال: خالد",
  submit: "ابدأ رحلتك",
  helper: "بدون بريد ولا كلمة مرور. تقدّمك يُحفظ في هذا المتصفح.",
  matchNotice: "يوجد تقدّم محفوظ بهذا الاسم في هذا المتصفح.",
  resume: "أكمل من حيث توقفت",
  restart: "ابدأ من جديد",
} as const;

/** «المستوى {n}» on a saved-account chip. */
export function levelLabel(level: number): string {
  return `المستوى ${level}`;
}

/** The three name errors of 3.1, shown under the field on submit. */
export const NAME_ERROR_COPY = {
  short: "اكتب اسمك (حرفان على الأقل).",
  long: "الاسم طويل. اختصره إلى 20 حرفاً.",
  letters: "استخدم الحروف فقط.",
} as const satisfies Record<NameError, string>;

/** The six showcase captions, in the spec's order (3.1 table): piece 1 to 6. */
export const SHOWCASE_CAPTIONS = [
  "مسار واضح: الخطوة التالية أمامك",
  "مطابقتك ترتفع مع كل خطوة تعلّم",
  "كل مهارة ومعها الجملة التي تثبتها",
  "دليلك يجيبك ويفتح لك الصفحات",
  "نقاط ومستويات وسلسلة أيام",
  "ترتيبك بين المتسابقين",
] as const;

/** Text inside the showcase pieces (spec 3.1, with the product's own words from 3.4, 3.5 and 3.14). */
export const PIECE_COPY = {
  here: "أنت هنا",
  goal: "جاهز للوظيفة",
  fromCv: "من سيرتك:",
  excelEvidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel…",
  /** «من دليل Power BI» (3.5), with the guide's title. */
  fromCourse: (guide: string) => `من ${guide}`,
  daleel: "دليلك",
  /** The advisor panel's header line (3.14). */
  daleelLine: "مرشدك إلى وظيفتك",
  question: "وش أسوي الحين؟",
  answer: "خطوتك الجاية: تعلّم Power BI",
  you: "أنت",
} as const;
