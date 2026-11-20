// Owner: data. Time copy of spec "How to read → Time", on the device's clock (local time). Pure module: every function
// takes epoch milliseconds and never reads the clock itself.
// Latin digits; Gregorian months («18 نوفمبر»); never a bare toLocaleString (STACK-NOTES 2.4).
import { countNoun, countNounBare } from "./plural";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Gregorian months as the spec writes them («18 نوفمبر»). */
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

/** Whole calendar days from `at`'s local day to `now`'s local day (0 = same day, 1 = `at` was yesterday). */
function calendarDaysBetween(at: number, now: number): number {
  const a = new Date(at);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  // Rounded, so a day that is 23 or 25 hours long (daylight saving) still counts as one.
  return Math.round((startB - startA) / DAY_MS);
}

/** «قبل دقيقة» · «قبل دقيقتين» · «قبل 5 دقائق» · «قبل 11 دقيقة» (and the same for hours). */
function ago(n: number, noun: "minute" | "hour"): string {
  return `قبل ${n === 1 ? countNounBare(1, noun) : countNoun(n, noun, "object")}`;
}

/**
 * «الآن» (< 1 min) · «قبل 5 دقائق» (< 1 hour) · «قبل ساعتين» (earlier today) · «أمس» (yesterday) · then «18 نوفمبر».
 * A time in the future (a clock that moved back) reads «الآن».
 */
export function relativeTime(at: number, now: number): string {
  const diff = now - at;
  if (diff < MINUTE_MS) return "الآن";
  if (diff < HOUR_MS) return ago(Math.floor(diff / MINUTE_MS), "minute");
  const days = calendarDaysBetween(at, now);
  if (days <= 0) return ago(Math.floor(diff / HOUR_MS), "hour");
  if (days === 1) return "أمس";
  return dayMonth(at);
}

/** «21:14» (24-hour, two digits each). */
export function clockTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** «18 نوفمبر». */
export function dayMonth(at: number): string {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()] ?? ""}`;
}

/** XP history and similar stamps: «اليوم 21:14» today, «أمس 21:14» yesterday, else «18 نوفمبر». */
export function historyStamp(at: number, now: number): string {
  const days = calendarDaysBetween(at, now);
  if (days <= 0) return `اليوم ${clockTime(at)}`;
  if (days === 1) return `أمس ${clockTime(at)}`;
  return dayMonth(at);
}
