// Owner: welcome. Every string of /welcome that is used by this screen alone, copied verbatim from the spec
// (PRODUCT-SPEC 3.2, 3.3, 4.7). «دليلك»'s own lines (greeting, acknowledgements, replies) come from @/lib/brain/onboarding.
import { countNoun } from "@/lib/copy";
import { CATALOGUE_COUNTS } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import type { RevealStepId } from "@/components/motion";

/** Spec 3.2. */
export const CHAT_COPY = {
  /** The step indicator «السؤال 2 من 7»: the number rolls, so it is given in parts (20 Nov 2026: seven steps). */
  stepBefore: "السؤال",
  stepAfter: `من ${formatNumber(7)}`,
  profileCard: "ملفك يتكوّن",
  placeholder: "اكتب إجابتك أو اختر من الخيارات…",
  /** «مدينة أخرى» does not send: it focuses the composer with this placeholder (spec 4.2). */
  otherCityPlaceholder: "اكتب اسم مدينتك",
} as const;

/** Spec 4.7: one status line per step of the path-reveal sequence. */
export function revealLines(firstName: string): Record<RevealStepId, string> {
  return {
    "answers-gather": `أجمع إجاباتك يا ${firstName}…`,
    "jobs-sweep": `أقارن ملفك مع ${formatNumber(CATALOGUE_COUNTS.jobs)} وظيفة…`,
    "skills-map": `أراجع ${formatNumber(CATALOGUE_COUNTS.skills)} مهارة في ${formatNumber(CATALOGUE_COUNTS.fields)} ${CATALOGUE_COUNTS.fields <= 10 ? "مجالات" : "مجالاً"}…`,
    "narrow-to-three": "أختار أنسب ثلاث وظائف لك…",
    "path-draw": "أرسم مسارك خطوة بخطوة…",
    "reveal-landing": "مسارك جاهز.",
  };
}

/** Spec 3.3, the reveal result. */
export const RESULT_COPY = {
  heading: (firstName: string) => `مسارك يا ${firstName}`,
  recommendedLabel: "الأنسب لك",
  why: "لماذا هذا المسار؟",
  start: "البداية",
  accept: "ابدأ هذا المسار",
  altHeading: "أو اختر اتجاهاً آخر",
  altChoose: "اختر هذا المسار",
  footer: "تستطيع تغيير هدفك في أي وقت من صفحة الوظائف.",
  cvLine: "بعد قراءة سيرتك قد تجد أنك قطعت جزءاً منها.",
  /** Spec 3.4: a preparatory stage. */
  prep: "تمهيدية",
  /** 20 Nov 2026: under the recommended job, when the user named a company (onboarding step 7). */
  companyAimed: (company: string) => `في ${company}، الشركة التي اخترتها`,
  companyNoJob: (company: string) => `لا توجد الآن وظيفة من ${company} في المجال الذي تريده، فهذه الأقرب لك.`,
  /** «8 مراحل · 74 ساعة تعلّم». */
  summary: (stages: number, hours: number) => `${countNoun(stages, "stage")} · ${countNoun(hours, "hour")} تعلّم`,
} as const;

/** «خالد» from «خالد العتيبي»: how «دليلك» addresses the user (the brain does the same). */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}
