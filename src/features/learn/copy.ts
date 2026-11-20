// Owner: learn. Every string of the learning guide («دليل التعلّم», spec 3.10) and the guide page (3.11, the completion
// celebration), plus the 3.4 next-step card forms the course page shows under a completed course. Strings shared with
// other owners come from @/lib/copy (SAMPLE_COPY, TOAST_COPY, COURSE_STATE_LABEL, countNoun, hoursText, …). Pure module.
import { countNoun } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import type { LearnTab } from "@/lib/types";

export const LEARN_COPY = {
  heading: "دليل التعلّم",
  subline: "لكل مهارة في مسارك: أين تتعلّمها، ومن تتابع، وماذا تقرأ.",
  tabs: { path: "خطوات مساري", explore: "كل المهارات", done: "مكتملة" } satisfies Record<LearnTab, string>,
  tabsLabel: "عرض الأدلة",
  allFields: "كل المجالات",
  fieldsLabel: "المجال",
  prep: "تمهيدية",
  /** «أنجزتها (6)». */
  doneGroup: (n: number) => `أنجزتها (${formatNumber(n)})`,
  emptyPath: "أنجزت كل خطوات مسارك.",
  emptyPathAction: "كل المهارات",
  emptyDone: "لم تُتمّ أي خطوة بعد. أول خطوة تمنحك شارة.",
  emptyDoneAction: "خطوات مساري",
  emptyField: "لا توجد مهارات هنا بهذا الاختيار.",
  emptyFieldAction: "إلغاء التصفية",
  filtersLabel: "تصفية المصادر",
  filterAr: "عربي",
  filterEn: "English",
  filterFree: "مجاني",
  /** The next step's card: why it is the one. */
  nextLabel: "التالية",
  nextWhy: (jobTitle: string) => `تقفل أكبر جزء من فجوتك مع «${jobTitle}»`,
  prepWhy: (skillName: string) => `تمهيدية: تفتح لك ${skillName} في مسارك`,
  startHere: "ابدأ بهذا:",
  openGuide: "افتح الدليل",
} as const;

/** «Power BI · النجمة 1». */
export function skillStarLine(skillName: string, star: number): string {
  return `${skillName} · النجمة ${formatNumber(star)}`;
}

/** «+20% مطابقة». */
export function matchGainText(gain: number): string {
  return `+${formatNumber(gain)}% مطابقة`;
}

/** «المرحلة 7» (the stage's displayed number, spec 3.4). */
export function stageText(n: number): string {
  return `المرحلة ${formatNumber(n)}`;
}

export const COURSE_COPY = {
  back: "دليل التعلّم",
  start: "ابدأ التعلّم",
  complete: "خلّصتها",
  creditedLine: "هذه النجمة مثبتة عندك. الدليل هنا إن أردت التعمّق.",
  fromCv: "من سيرتك:",
  lockedOpen: "افتح المتطلب",
  why: "ليش ذي الخطوة:",
  plan: { learn: "تعلّم", apply: "طبّق", finish: "خلّصتها" },
  planLabel: "خطة الخطوة",
  topPick: "ابدأ بهذا",
  topPickNote: "اخترناه لك",
  learnedNext: "خلّصت التعلّم، الخطوة الجاية",
  appliedNext: "طبّقتها، الخطوة الجاية",
  learned: "خلّصت التعلّم",
  applied: "طبّقتها",
  undo: "تراجع",
  others: "خيارات ثانية",
  othersOpen: "عرض",
  othersClose: "إخفاء",
  people: "مين تتابع",
  read: "وش تقرأ",
  proofTitle: "كيف تعرف إنك أتقنتها",
  dataset: "البيانات",
  finishBody: "إذا خلّصت التعلّم، اضغط «خلّصتها».",
  certLabel: "رابط شهادتك (اختياري)",
  certPlaceholder: "https://",
  certShown: "شهادتك",
  sources: "أين وُجدت التوصية",
  checked: "فُتحت الروابط في 20 نوفمبر 2026.",
  financialAid: "دعم مالي متاح",
  cert: {
    heading: "الشهادة اللي تثبت مهارتك",
    official: "رسمي",
    exam: "اختبار",
    program: "برنامج شهادة مهنية",
    prep: "طريقة التحضير",
    page: "صفحة الشهادة",
    none: "ما فيه شهادة معتمدة",
    insteadLabel: "اللي يثبتها بدالها:",
    proofCourse: "دورة تعطيك شهادة إتمام",
    level: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" },
  },
  personLinks: "حسابات",
} as const;

const CURRENCY = { USD: "دولار", SAR: "ريال" } as const;

/** «الرسوم: 165 دولار (حسب الموقع الرسمي، 20 نوفمبر)», «الرسوم: مجانية …», «الرسوم: تختلف حسب الدولة …». */
export function certFeeLine(
  fee: { readonly amount: number; readonly currency: "USD" | "SAR"; readonly qualifier: "from" | "about" | null; readonly per: "month" | null } | null,
  varies: boolean,
  checkedOn: string,
): string | null {
  const source = `(حسب الموقع الرسمي، ${checkedOn})`;
  if (fee === null) return varies ? `الرسوم: تختلف حسب الدولة ${source}` : null;
  if (fee.amount === 0) return `الرسوم: مجانية ${source}`;
  const lead = fee.qualifier === "from" ? "من " : fee.qualifier === "about" ? "حوالي " : "";
  const per = fee.per === "month" ? " شهريًا" : "";
  return `الرسوم: ${lead}${formatNumber(fee.amount)} ${CURRENCY[fee.currency]}${per} ${source}`;
}

/** «شهادة: PL-300» (the list card's chip). */
export function certChipText(short: string): string {
  return `شهادة: ${short}`;
}

const PROFILE_LABEL = { linkedin: "لينكدإن", x: "إكس", youtube: "يوتيوب", website: "موقع", github: "GitHub" } as const;

/** «لينكدإن Leila Gharani» (a profile icon link's accessible name). */
export function profileLinkLabel(kind: keyof typeof PROFILE_LABEL, name: string): string {
  return `${PROFILE_LABEL[kind]} ${name}`;
}

/** «تمنحك: النجمة 1 في Power BI». */
export function grantsLine(skillName: string, star: number): string {
  return `تمنحك: النجمة ${formatNumber(star)} في ${skillName}`;
}

/** «ترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%». */
export function raisesMatchLine(jobTitle: string, from: number, to: number): string {
  return `ترفع مطابقتك مع «${jobTitle}» من ${formatNumber(from)}% إلى ${formatNumber(to)}%`;
}

/** «أتممتها 18 نوفمبر» (the «· +200 XP» that follows is drawn by XpValue). */
export function completedOnLine(date: string): string {
  return `أتممتها ${date}`;
}

/** «من دليل Power BI» (the star came from a higher step of the same skill). */
export function fromCourseLine(guideTitle: string): string {
  return `من ${guideTitle}`;
}

/** «النجمة الأولى» … «النجمة الثالثة» (the guide page's title). */
export function starOrdinal(star: number): string {
  return ["النجمة الأولى", "النجمة الثانية", "النجمة الثالثة"][star - 1] ?? `النجمة ${formatNumber(star)}`;
}

/** «الخطوة 7 من 8». */
export function stepOfLine(n: number, total: number): string {
  return `الخطوة ${formatNumber(n)} من ${formatNumber(total)}`;
}

/** «مسارك نحو «محلل بيانات»». */
export function pathToLine(jobTitle: string): string {
  return `مسارك نحو «${jobTitle}»`;
}

/** «ابدأ التعلّم على Microsoft Learn» · «تابع التعلّم على …» · «افتح الدورة على …». */
export function learnOnLine(platform: string, phase: "start" | "continue" | "open"): string {
  const verb = phase === "start" ? "ابدأ التعلّم على" : phase === "continue" ? "تابع التعلّم على" : "افتح الدورة على";
  return `${verb} ${platform}`;
}

/** «افتح البيانات» (the dataset's name is on the line above the button). */
export function openDatasetLine(): string {
  return "افتح البيانات";
}

/** «اضغط «خلّصتها» وتأخذ النجمة الأولى في Power BI.» (the XP is drawn beside it). */
export function finishGetsLine(star: number, skillName: string): string {
  return `اضغط «خلّصتها» وتأخذ ${starOrdinal(star)} في ${skillName}`;
}

/** «خيارات ثانية (2)». */
export function othersLine(n: number): string {
  return `خيارات ثانية (${formatNumber(n)})`;
}

/** «مقفلة: تتطلب: SQL». */
export function lockedLine(reason: string): string {
  return `مقفلة: ${reason}`;
}

export const CELEBRATION_COPY = {
  course: "أتممت الخطوة",
  ready: "أنت جاهز لهذه الوظيفة",
  badges: "شارات جديدة",
  /** One badge: the singular of the same heading (the badge toast's own words, spec 3.15). */
  badge: "شارة جديدة",
  next: "الخطوة التالية",
  close: "رجوع لمساري",
} as const;

/** «Power BI: النجمة 1 من 3». */
export function starOfLine(skillName: string, star: number, max: number): string {
  return `${skillName}: النجمة ${formatNumber(star)} من ${formatNumber(max)}`;
}

/** «مطابقتك مع «محلل بيانات»». */
export function matchWithLine(jobTitle: string): string {
  return `مطابقتك مع «${jobTitle}»`;
}

/** «مستوى جديد: 3 · مجتهد». */
export function newLevelLine(level: number, title: string): string {
  return `مستوى جديد: ${formatNumber(level)} · ${title}`;
}

/** «صعدت 8 مراكز: المركز 10 هذا الأسبوع» (object case: «صعدت مركزاً واحداً», «صعدت مركزين»). */
export function rankClimbLine(places: number, rank: number): string {
  // no-break spaces keep «8 مراكز» and «المركز 10» whole when the sentence wraps
  return `صعدت ${countNoun(places, "place", "object").replace(" ", NBSP)}: المركز${NBSP}${formatNumber(rank)} هذا الأسبوع`;
}

const NBSP = "\u00A0";

/** The next-step card of spec 3.4, by rule of 2.8 (title, body, button). */
export const NEXT_CARD_COPY = {
  label: "الخطوة التالية",
  rule1: { title: "اكتشف نقطة بدايتك", body: "ارفع سيرتك الذاتية ليحدّد دليلك المراحل التي أنجزتها فعلاً.", button: "ارفع سيرتك الذاتية", text: "ابدأ بدون سيرة" },
  rule2: { title: "أكمل ما بدأته", button: "عد إلى الدليل" },
  rule3: { title: "خطوتك التالية", button: "افتح الدليل" },
  rule4: { title: "أنت جاهز لهذه الوظيفة", button: "دع دليلك يقدّم عنك", text: "قدّم بنفسك" },
  rule5: { title: "اختر هدفك التالي", body: "أنجزت هذا المسار. هذه وظائف صارت أقرب إليك.", button: "استعرض الوظائف" },
} as const;

/** «تتعلّم الآن Power BI. إذا خلّصت، اضغط «خلّصتها» في دليلها.» */
export function rule2Body(skillName: string): string {
  return `تتعلّم الآن ${skillName}. إذا خلّصت، اضغط «خلّصتها» في دليلها.`;
}

/** «دليل Power BI» (the card goes on: «+200 XP · ترفع مطابقتك إلى 90%»). */
export function rule3Course(guideTitle: string): string {
  return guideTitle;
}

/** «ترفع مطابقتك إلى 90%». */
export function raisesTo(after: number): string {
  return `ترفع مطابقتك إلى ${formatNumber(after)}%`;
}

/** «مطابقتك 100% مع «{target}».» */
export function rule4Body(target: string): string {
  return `مطابقتك 100% مع «${target}».`;
}
