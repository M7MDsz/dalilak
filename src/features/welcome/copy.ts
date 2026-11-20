// Owner: welcome. Every string of /welcome that is used by this screen alone, copied verbatim from the spec
// (PRODUCT-SPEC 3.2, 3.3, 4.7). «دليلك»'s own lines (greeting, acknowledgements, replies) come from @/lib/brain/onboarding.
import { countNoun } from "@/lib/copy";
import { CATALOGUE_COUNTS, COMPANIES } from "@/lib/data";
import { jobsAtCompany } from "@/lib/engine";
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
  /** With a CV read in onboarding (21 Nov 2026, tester): what it already covers, instead of the line above. */
  cvCovered: (done: number, total: number, match: number) => `سيرتك تغطي ${done} من ${total} مراحل، ومطابقتك الحين ${match}%.`,
  /** Spec 3.4: a preparatory stage. */
  prep: "تمهيدية",
  /** 20 Nov 2026: under the recommended job, when the user named a company (onboarding step 7). */
  // 21 Nov 2026 (tester): «دليلك» speaks Najdi, so the company line does too (it was Fusha)
  companyAimed: (company: string) => `في ${company}، الشركة اللي اخترتها`,
  /**
   * The company named has no job on this path (21 Nov 2026, tester): a company with jobs elsewhere in the app is said
   * positively (its jobs are pinned first among the map's jobs); only a company with no job at all gets the honest line.
   */
  companyNoJob: (company: string) => {
    const known = COMPANIES.find((c) => c.short === company);
    return known && jobsAtCompany(known.id).length > 0
      ? `وظايف ${company} حطيتها لك أول وحدة في وظائفك، ومسارك يبقى في مجالك.`
      : `ما عندي الحين وظيفة من ${company}، فهذي الأقرب لك.`;
  },
  /** «8 مراحل · 74 ساعة تعلّم». */
  summary: (stages: number, hours: number) => `${countNoun(stages, "stage")} · ${countNoun(hours, "hour")} تعلّم`,
} as const;

/** «خالد» from «خالد العتيبي»: how «دليلك» addresses the user (the brain does the same). */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}
