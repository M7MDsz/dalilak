// Owner: cv. Every string of the CV screen, copied verbatim from docs/PRODUCT-SPEC.md 3.6 and 6.3. Strings used by one
// screen stay in that screen (ARCHITECTURE 6). Counted nouns go through countNoun (spec "How to read").
import type { CvErrorCode } from "@/lib/brain/protocol";
import { countNoun, nextStepLabel } from "@/lib/copy";
import { getCourse } from "@/lib/data";
import { shortTitle } from "@/lib/engine";
import { formatPercent } from "@/lib/format";
import type { NextStep } from "@/lib/types";

import type { CvStepId } from "@/components/motion";

export const CV_COPY = {
  intro: "ارفع سيرتك، ودليل يستخرج مهاراتك ويريك الجملة التي تثبت كل واحدة.",
  /** Wide screens only: the drop zone's label, on the same line as pasteLabel so both boxes start and end level. */
  dropLabel: "ارفع ملف سيرتك",
  dropTitle: "اسحب ملف سيرتك هنا أو اختره من جهازك",
  dropHint: "PDF أو Word (docx) · حتى 5 ميغابايت و15 صفحة",
  chooseFile: "اختر ملفاً",
  removeFile: "إزالة",
  pasteLabel: "أو الصق نص السيرة",
  pastePlaceholder: "الصق هنا نص سيرتك الذاتية…",
  pasteShort: "النص قصير. أضف خبراتك ومهاراتك (80 حرفاً على الأقل).",
  sample: "جرّب بسيرة ذاتية تجريبية",
  analyse: "حلّل سيرتي",
  privacy: "تُقرأ سيرتك لاستخراج المهارات فقط، ويُحفظ نصها ونتيجتها في متصفحك.",
  privacyModel: "يُرسل نص السيرة إلى مزوّد نموذج الذكاء الاصطناعي لقراءته فقط.",
  retry: "أعد المحاولة",
  // results
  evidenceLead: "من سيرتك:",
  engineLocal: "القراءة: محلّل محلي بالكلمات المفتاحية",
  engineModel: "القراءة: نموذج ذكاء اصطناعي",
  jobsHeading: "أفضل الوظائف لمهاراتك",
  targetTag: "هدفك",
  applyAdvisor: "دع دليل يقدّم عنك",
  setTarget: "اجعلها هدفي",
  goPath: "اذهب إلى مساري",
  goJobs: "كل الوظائف",
  reanalyse: "حلّل سيرة أخرى",
  // empty result, in «دليل»'s voice
  emptyTitle: "لم ألتقط مهارات واضحة في هذا النص.",
  emptyBody: "أضف خبراتك ودوراتك ومهاراتك بأسمائها، أو جرّب السيرة التجريبية لترى كيف يعمل التحليل.",
  emptyEdit: "عدّل النص",
} as const;

/** The input errors of spec 3.6 (which one applies: 6.1). `request_failed` also covers the server's too_short / bad_request. */
export const CV_ERROR_COPY = {
  wrong_type: "المقبول: PDF و Word (docx) فقط. أو الصق نص سيرتك.",
  too_large: "الملف أكبر من 5 ميغابايت. جرّب ملفاً أصغر أو الصق النص.",
  too_many_pages: "الملف طويل (أكثر من 15 صفحة). ارفع سيرة أقصر أو الصق نصها.",
  unreadable: "تعذّر فتح الملف. الصق نص سيرتك هنا.",
  no_text: "لا يوجد نص مقروء في الملف، وقد يكون صورة ممسوحة. الصق نص سيرتك هنا.",
  request_failed: "تعذّر التحليل الآن. جرّب مرة أخرى.",
} as const satisfies Record<CvErrorCode, string>;

/** The status line of each show stage (spec 6.3), in «دليل»'s voice. */
export function stageLine(step: CvStepId, skills: number, jobs: number): string {
  switch (step) {
    case "read":
      return "أقرأ سيرتك سطراً سطراً…";
    case "extract":
      return "ألتقط المهارات من كلامك…";
    case "evidence":
      return "أربط كل مهارة بالجملة التي تثبتها…";
    case "level":
      return "أقدّر مستوى كل مهارة بالنجوم…";
    case "match":
      return `أقارن مهاراتك مع ${countNoun(jobs, "job", "object")}…`;
    case "done":
      return `انتهيت: وجدت ${countNoun(skills, "skill", "object")}.`;
  }
}

/** «في سيرتك 8 مهارات» · with the sample CV «في السيرة التجريبية 8 مهارات». */
export function resultsHeading(skills: number, isSample: boolean): string {
  return `${isSample ? "في السيرة التجريبية" : "في سيرتك"} ${countNoun(skills, "skill")}`;
}

/** «مطابقتك مع هدفك «محلل بيانات»: » (the percentage follows, counted). */
export function targetLineLead(title: string): string {
  return `مطابقتك مع هدفك «${title}»: `;
}

/** The whole target line, for screen readers and QA: «مطابقتك مع هدفك «محلل بيانات»: 70%». */
export function targetLine(title: string, match: number): string {
  return `${targetLineLead(title)}${formatPercent(match)}`;
}

/** The haul and the side column of the results (docs/GAME-LAYER.md 5.4). */
export const HAUL_COPY = {
  xpEarned: "كسبتها بتحليل سيرتك",
  collection: "مجموعتك",
  targetHeading: "هدفك بعد التحليل",
} as const;

/** The counted noun that follows a number shown on its own: «8» «مهارات» · «11» «مهارة» · «2» «مهارتان». */
function nounAfter(n: number, noun: "skill" | "star"): string {
  if (n === 1) return noun === "skill" ? "مهارة" : "نجمة";
  return countNoun(n, noun).replace(/^[\d,]+\s/u, "");
}

/** Under the number of skills found: «مهارات اكتشفتها» · «مهارتان اكتشفتهما» · «مهارة اكتشفتها». */
export function foundLabel(n: number): string {
  return `${nounAfter(n, "skill")} ${n === 2 ? "اكتشفتهما" : "اكتشفتها"}`;
}

/** Under the number of stars held: «نجمة في رصيدك» · «نجوم في رصيدك» · «نجمتان في رصيدك». */
export function starsLabel(n: number): string {
  return `${nounAfter(n, "star")} في رصيدك`;
}

/** Beside a field's heading: «3 مهارات» · «مهارة واحدة». */
export function fieldCount(n: number): string {
  return countNoun(n, "skill");
}

/**
 * The line under «اذهب إلى مساري», from the next step (spec 2.8): «التالي: دورة «أساسيات Power BI» ترفعك إلى 90%.»
 * Null where there is no course or job to name (rule 1 or 5).
 */
export function nextLine(step: NextStep): string | null {
  switch (step.rule) {
    case 3: {
      const course = `التالي: دورة «${shortTitle(getCourse(step.courseId))}»`;
      return step.prep ? `${course}.` : `${course} ترفعك إلى ${formatPercent(step.matchAfter)}.`;
    }
    case 2:
    case 4:
      return `التالي: ${nextStepLabel(step)}.`;
    default:
      return null;
  }
}

/** «آخر تحليل: {date}». */
export function lastAnalysed(stamp: string): string {
  return `آخر تحليل: ${stamp}`;
}

/** «{file name} · {size}» with the size in Arabic units and Latin digits («48 كيلوبايت», «1.2 ميغابايت»). */
export function fileChipLabel(name: string, bytes: number): { readonly name: string; readonly size: string } {
  const kb = bytes / 1024;
  const size = kb < 1024 ? `${Math.max(1, Math.round(kb))} كيلوبايت` : `${(kb / 1024).toFixed(1)} ميغابايت`;
  return { name, size };
}
