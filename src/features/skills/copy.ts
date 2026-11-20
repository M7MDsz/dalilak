// Owner: skills. The skill tree's own copy, verbatim from spec 3.5 (strings used by one screen stay in that screen,
// ARCHITECTURE 6). Shared helpers (countNoun, starsOf, guideTitle, joinWithAnd) come from @/lib/copy.
import { countNoun } from "@/lib/copy";
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
  start: "افتح الدليل",
  resume: "عد إلى الدليل",
  showJobs: "عرضها",
  close: "إغلاق",
  bannerTitle: "شجرتك لم تُضئ بعد. ارفع سيرتك لتُظهر ما تملكه.",
  bannerAction: "ارفع سيرتك الذاتية",
} as const;

/** «38 مهارة في 7 مجالات. كل نجمة تقرّبك من وظيفة.» */
export function subline(skills: number, fields: number): string {
  return `${countNoun(skills, "skill")} في ${formatNumber(fields)} ${fields >= 3 && fields <= 10 ? "مجالات" : "مجالاً"}. كل نجمة تقرّبك من وظيفة.`;
}

/** «من دليل Power BI» (the guide's title, guideTitle: the course itself is internal). */
export function fromCourse(guide: string): string {
  return `من ${guide}`;
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
 * «النجمة التالية: دليل Power BI · +{xp} XP», in its parts: the lead, the guide's title (guideTitle), then «· » before
 * the «+{xp} XP» that XpValue draws (so the line may break only between the parts, never inside one). No hours: the
 * course behind the guide is internal, its hours are not a real course's duration.
 */
export function nextStarParts(guide: string): { lead: string; guide: string; dot: string } {
  return { lead: "النجمة التالية: ", guide, dot: " · " };
}

/** «تطلبها 3 وظائف» · «تطلبها وظيفة واحدة» · «تطلبها وظيفتان». */
export function jobsLine(count: number): string {
  return `تطلبها ${countNoun(count, "job")}`;
}
