// Owner: brain-advisor. Small Arabic phrasing helpers shared by the templates, the chips and the router (pure,
// client-safe: imports data, copy and format only, never @/lib/store).
import { guideTitle } from "@/lib/copy";
import { getJob, type GuideCourse } from "@/lib/data";
import { formatNumber } from "@/lib/format";
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

/** «ب» before a name: attached before Arabic («بإدارة المشاريع»), «بـ» before Latin («بـ Power BI»). */
export function withBa(name: string): string {
  return startsArabic(name) ? `ب${name}` : `بـ ${name}`;
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

/** The first word of the displayed name («خالد» from «خالد العتيبي»): how «دليلك» addresses the user. */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

/** Hours as the guide data gives them: «15 ساعة», «ساعتين», «4.4 ساعة» (never rounded, never guessed). */
function guideHours(hours: number): string {
  if (!Number.isInteger(hours)) return `${String(hours)} ساعة`;
  if (hours === 1) return "ساعة";
  if (hours === 2) return "ساعتين";
  if (hours >= 3 && hours <= 10) return `${formatNumber(hours)} ساعات`;
  return `${formatNumber(hours)} ساعة`;
}

/**
 * What the guide data says about a real course, in Najdi, only what is known (a null stays out): «بالإنجليزي، مدفوع،
 * قرابة 15 ساعة، وفيه شهادة» · «بالعربي، مجاني» · «بالإنجليزي، مجاني والشهادة بفلوس، قرابة 10 ساعات».
 */
export function guideCourseFacts(course: GuideCourse): string {
  const parts: string[] = [course.lang === "ar" ? "بالعربي" : "بالإنجليزي"];
  if (course.price === "free") parts.push("مجاني");
  else if (course.price === "paid") parts.push("مدفوع");
  else if (course.price === "free_to_audit") parts.push("مجاني والشهادة بفلوس");
  if (course.hours !== null && course.hours > 0) parts.push(`قرابة ${guideHours(course.hours)}`);
  const facts = parts.join("، ");
  return course.certificate === true && course.price !== "free_to_audit" ? `${facts}، وفيه شهادة` : facts;
}

/**
 * {page} as «دليلك» says it in a sentence (5.9 "Opening a page"): «فتحت لك طلباتك», «ثم أفتح لك مسارك». A course page is
 * the guide of its skill («دليل Power BI»): since 20 Nov 2026 «دليلك» never quotes the internal course titles.
 */
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
      return "دليل التعلّم";
    case "course":
      return q(guideTitle(to.courseId));
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
