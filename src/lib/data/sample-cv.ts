// Owner: data. The sample CV of spec 6.2 WITHOUT its first line ({name}), one line per line, exactly as written (LF line
// endings). sampleCvText() puts the signed-in user's name on top.
// The sample-CV test (6.1) and the analyser acceptance test (6.2, 9.8 check 4) read this constant. Pure module.

const SAMPLE_CV_LINES: readonly string[] = [
  "الرياض",
  "",
  "نبذة",
  "تخرّجت حديثاً في نظم المعلومات الإدارية، وأحب تحويل الأرقام إلى قرارات واضحة. أبحث عن فرصتي الأولى في مجال البيانات.",
  "",
  "التعليم",
  "بكالوريوس نظم المعلومات الإدارية، جامعة التلال السبع (جهة تجريبية)، 2026.",
  "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.",
  "",
  "الخبرة العملية",
  "تدريب تعاوني في قسم المبيعات، متجر الفانوس النحاسي (جهة تجريبية)، أربعة أشهر.",
  "- تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.",
  "- كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.",
  "- تجهيز ملخص أسبوعي لمدير القسم بأهم التغيّرات.",
  "",
  "المشاريع",
  "مشروع التخرج: نظام لمتابعة مخزون متجر صغير.",
  "- بناء قاعدة البيانات وكتابة استعلامات SQL لتقارير المخزون.",
  "- مراجعة حركة الأصناف في Excel لتحديد الأصناف الراكدة.",
  "",
  "المهارات",
  "التواصل، العمل الجماعي، العرض والتقديم.",
  "",
  "اللغات",
  "العربية: اللغة الأم.",
  "الإنجليزية: جيد جداً.",
];

/** Lines 2.. of the sample CV of spec 6.2 («الرياض», "", «نبذة», …, «الإنجليزية: جيد جداً.»), joined with "\n". */
export const SAMPLE_CV_BODY = SAMPLE_CV_LINES.join("\n");

/** The sample CV for this user: their name, a newline, then SAMPLE_CV_BODY (spec 6.2: "The first line is the user's name"). */
export function sampleCvText(name: string): string {
  return `${name}\n${SAMPLE_CV_BODY}`;
}
