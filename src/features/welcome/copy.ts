// Owner: welcome. Every string of /welcome that is used by this screen alone, copied verbatim from the spec
// (PRODUCT-SPEC 3.2, 3.3, 4.7). «دليل»'s own lines (greeting, acknowledgements, replies) come from @/lib/brain/onboarding.
import { countNoun } from "@/lib/copy";
import { CATALOGUE_COUNTS } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import type { RevealStepId } from "@/components/motion";

/** Spec 3.2. */
export const CHAT_COPY = {
  /** The step indicator «السؤال 2 من 6»: the number rolls, so it is given in parts. */
  stepBefore: "السؤال",
  stepAfter: `من ${formatNumber(6)}`,
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
    "skills-map": `أراجع ${formatNumber(CATALOGUE_COUNTS.skills)} مهارة في ${formatNumber(CATALOGUE_COUNTS.fields)} مجالات…`,
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
  /** «8 مراحل · 74 ساعة تعلّم». */
  summary: (stages: number, hours: number) => `${countNoun(stages, "stage")} · ${countNoun(hours, "hour")} تعلّم`,
} as const;

/** «خالد» from «خالد العتيبي»: how «دليل» addresses the user (the brain does the same). */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}
