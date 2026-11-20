// Owner: brain-advisor. Small Arabic phrasing helpers shared by the templates, the chips and the router (pure,
// client-safe: imports data and engine only, never @/lib/store).
import { getCourse, getJob } from "@/lib/data";
import { shortTitle } from "@/lib/engine";
import type { NavTarget } from "@/lib/types";

/** «…» around a title. */
export function q(text: string): string {
  return `«${text}»`;
}

/** True when the first letter is Arabic (then «و» is written attached: «والتواصل»; before Latin it stands alone: «و SQL»). */
function startsArabic(text: string): boolean {
  const first = text.trimStart().codePointAt(0);
  return first !== undefined && first >= 0x0600 && first <= 0x06ff;
}

/**
 * Joins with «و» the way the spec writes lists: «Excel و SQL والتواصل الفعّال», «Excel و SQL و Power BI»
 * (5.6 example 5, 7.4 demo note). One item: itself; none: "".
 */
export function joinAnd(items: readonly string[]): string {
  let out = "";
  for (const [index, item] of items.entries()) {
    if (index === 0) out = item;
    else out += startsArabic(item) ? ` و${item}` : ` و ${item}`;
  }
  return out;
}

/** «A، وB، وC» (the extra answers of 4.3 and the why-path sentence of 5.8). */
export function joinCommaAnd(items: readonly string[]): string {
  let out = "";
  for (const [index, item] of items.entries()) {
    if (index === 0) out = item;
    else out += `، و${item}`;
  }
  return out;
}

/** The first word of the displayed name («خالد» from «خالد العتيبي»): how «دليل» addresses the user. */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

/** The short course title (the part before the colon). */
export function courseShort(courseId: Parameters<typeof getCourse>[0]): string {
  return shortTitle(getCourse(courseId));
}

/** {page} as «دليل» says it in a sentence (5.9 "Opening a page"): «فتحت لك طلباتك», «ثم أفتح لك مسارك». */
export function pageName(to: NavTarget): string {
  switch (to.screen) {
    case "path":
      return "مسارك";
    case "skills":
      return "شجرة المهارات";
    case "cv":
      return "صفحة السيرة";
    case "jobs":
      return "الوظائف";
    case "job":
      return q(getJob(to.jobId).title);
    case "applications":
      return "طلباتك";
    case "learn":
      return "الدورات";
    case "course":
      return q(courseShort(to.courseId));
    case "leaderboard":
      return "المتصدرين";
    case "profile":
      return "ملفك";
  }
}

/** A chip the user "says" is in the first person (spec "Form of address"): «افتح مساري», «افتح طلباتي», «افتح ملفي». */
export function openChipLabel(to: NavTarget): string {
  switch (to.screen) {
    case "path":
      return "افتح مساري";
    case "applications":
      return "افتح طلباتي";
    case "profile":
      return "افتح ملفي";
    default:
      return `افتح ${pageName(to)}`;
  }
}
