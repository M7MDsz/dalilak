// Owner: learn. Every string of spec 3.10 (courses catalogue) and 3.11 (course detail, the completion celebration),
// copied verbatim, plus the 3.4 next-step card forms the course page shows under a completed course. Strings shared with
// other owners come from @/lib/copy (SAMPLE_COPY, TOAST_COPY, COURSE_STATE_LABEL, countNoun, hoursText, …). Pure module.
import { countNoun } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import type { LearnTab } from "@/lib/types";

export const LEARN_COPY = {
  heading: "الدورات",
  subline: "كل دورة تمنحك نجمة في مهارة.",
  tabs: { path: "في مساري", explore: "وسّع آفاقك", done: "مكتملة" } satisfies Record<LearnTab, string>,
  tabsLabel: "عرض الدورات",
  allFields: "كل المجالات",
  fieldsLabel: "المجال",
  prep: "تمهيدية",
  /** «أنجزتها (6)». */
  doneGroup: (n: number) => `أنجزتها (${formatNumber(n)})`,
  emptyPath: "أنجزت كل دورات مسارك.",
  emptyPathAction: "وسّع آفاقك",
  emptyDone: "لم تكمل أي دورة بعد. أول دورة تمنحك شارة.",
  emptyDoneAction: "دورات مساري",
  emptyField: "لا توجد دورات في هذا المجال هنا.",
  emptyFieldAction: "كل المجالات",
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
  back: "الدورات",
  about: "عن الدورة",
  lessons: "الدروس",
  start: "ابدأ الدورة",
  complete: "أكمل الدورة",
  creditedLine: "هذه النجمة مثبتة عندك. لا تحتاج هذه الدورة.",
  fromCv: "من سيرتك:",
  lockedOpen: "افتح المتطلب",
} as const;

/** «تمنحك: النجمة 1 في Power BI». */
export function grantsLine(skillName: string, star: number): string {
  return `تمنحك: النجمة ${formatNumber(star)} في ${skillName}`;
}

/** «10 ساعات · 5 دروس» (the «+200 XP» that follows is drawn by XpValue). */
export function hoursLessonsLine(hoursText: string, lessons: number): string {
  return `${hoursText} · ${countNoun(lessons, "lesson")}`;
}

/** «ترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%». */
export function raisesMatchLine(jobTitle: string, from: number, to: number): string {
  return `ترفع مطابقتك مع «${jobTitle}» من ${formatNumber(from)}% إلى ${formatNumber(to)}%`;
}

/** «2 من 5 دروس». */
export function progressLine(ticked: number, total: number): string {
  return `${formatNumber(ticked)} من ${countNoun(total, "lesson")}`;
}

/** «أكملتها 18 نوفمبر» (the «· +200 XP» that follows is drawn by XpValue). */
export function completedOnLine(date: string): string {
  return `أكملتها ${date}`;
}

/** «من دورة: أساسيات Power BI» (a sentence: the short title). */
export function fromCourseLine(shortTitle: string): string {
  return `من دورة: ${shortTitle}`;
}

/** «مقفلة: تتطلب: SQL». */
export function lockedLine(reason: string): string {
  return `مقفلة: ${reason}`;
}

/** The lesson box's accessible name: «الدرس 2: …». */
export function lessonLabel(n: number, title: string): string {
  return `الدرس ${formatNumber(n)}: ${title}`;
}

export const CELEBRATION_COPY = {
  course: "أكملت الدورة",
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
  rule1: { title: "اكتشف نقطة بدايتك", body: "ارفع سيرتك الذاتية ليحدّد دليل المراحل التي أنجزتها فعلاً.", button: "ارفع سيرتك الذاتية", text: "ابدأ بدون سيرة" },
  rule2: { title: "أكمل ما بدأته", button: "أكمل الدورة" },
  rule3: { title: "خطوتك التالية", button: "ابدأ الدورة" },
  rule4: { title: "أنت جاهز لهذه الوظيفة", button: "دع دليل يقدّم عنك", text: "قدّم بنفسك" },
  rule5: { title: "اختر هدفك التالي", body: "أنجزت هذا المسار. هذه وظائف صارت أقرب إليك.", button: "استعرض الوظائف" },
} as const;

/** «دورة «{course}»: {x} من {y} دروس.» */
export function rule2Body(course: string, ticked: number, total: number): string {
  return `دورة «${course}»: ${formatNumber(ticked)} من ${countNoun(total, "lesson")}.`;
}

/** «دورة «أساسيات Power BI»» (the card goes on: «· 10 ساعات · +200 XP · ترفع مطابقتك إلى 90%»). */
export function rule3Course(course: string): string {
  return `دورة «${course}»`;
}

/** «ترفع مطابقتك إلى 90%». */
export function raisesTo(after: number): string {
  return `ترفع مطابقتك إلى ${formatNumber(after)}%`;
}

/** «مطابقتك 100% مع «{target}».» */
export function rule4Body(target: string): string {
  return `مطابقتك 100% مع «${target}».`;
}
