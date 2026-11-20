// Owner: skills. The skill tree's own copy, verbatim from spec 3.5 (strings used by one screen stay in that screen,
// ARCHITECTURE 6). Shared helpers (countNoun, starsOf, hoursText, joinWithAnd) come from @/lib/copy.
import { countNoun, hoursText } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import type { SkillNodeState } from "@/lib/types";

/** The legend words; maxed is an earned skill with every star («مكتسبة»). */
export const STATE_LABEL = {
  earned: "مكتسبة",
  maxed: "مكتسبة",
  available: "متاحة",
  locked: "مقفلة",
} as const satisfies Record<SkillNodeState, string>;

export const COPY = {
  allFields: "كل المجالات",
  fieldsLabel: "المجالات",
  inPath: "في مسارك",
  sources: "مصدر النجوم",
  fromCv: "من سيرتك:",
  maxed: "أتممت كل نجوم هذه المهارة.",
  start: "ابدأ الدورة",
  resume: "أكمل الدورة",
  showJobs: "عرضها",
  close: "إغلاق",
  bannerTitle: "شجرتك لم تُضئ بعد. ارفع سيرتك لتُظهر ما تملكه.",
  bannerAction: "ارفع سيرتك الذاتية",
} as const;

/** «38 مهارة في 7 مجالات. كل نجمة تقرّبك من وظيفة.» */
export function subline(skills: number, fields: number): string {
  return `${countNoun(skills, "skill")} في ${formatNumber(fields)} مجالات. كل نجمة تقرّبك من وظيفة.`;
}

/** «من دورة: {course}» (the course's short title). */
export function fromCourse(course: string): string {
  return `من دورة: ${course}`;
}

/** «تتطلب: Excel» (several: «تتطلب: SQL والإحصاء»). */
export function requires(names: string): string {
  return `تتطلب: ${names}`;
}

/** «مقفلة. اكتسب أولاً: {prerequisite}.» */
export function lockedLine(names: string): string {
  return `مقفلة. اكتسب أولاً: ${names}.`;
}

/** «افتح {prerequisite}». */
export function openPrereq(name: string): string {
  return `افتح ${name}`;
}

/**
 * «النجمة التالية: دورة «{course}» · {hours} ساعات · +{xp} XP», in its parts: the lead, then «· 10 ساعات», then «· »
 * before the «+{xp} XP» that XpValue draws (so the line may break only between the parts, never inside one).
 */
export function nextStarParts(course: string, hours: number): { lead: string; course: string; hours: string; dot: string } {
  return { lead: "النجمة التالية: ", course: `دورة «${course}»`, hours: ` · ${hoursText(hours)}`, dot: " · " };
}

/** «تطلبها 3 وظائف» · «تطلبها وظيفة واحدة» · «تطلبها وظيفتان». */
export function jobsLine(count: number): string {
  return `تطلبها ${countNoun(count, "job")}`;
}
