// Owner: engine. Calendar helpers on the device's local clock (spec 8.4, 8.7).
// The ONLY place that turns a Date into a Clock. Everything else takes a Clock argument and never reads Date.now().
import type { Clock, DayKey } from "@/lib/types";

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** The Clock for this moment (default: new Date()), in the runtime's local time zone. Call it in effects and handlers, never in render. */
export function makeClock(date?: Date): Clock {
  const at = date ?? new Date();
  return { now: at.getTime(), today: dayKey(at), weekStart: weekStartOf(at) };
}

/** "YYYY-MM-DD" of a local date. */
export function dayKey(date: Date): DayKey {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/** The day `n` days after `day` (negative for before). Calendar arithmetic, independent of time zone and DST. */
export function addDays(day: DayKey, n: number): DayKey {
  const [y = "1970", m = "1", d = "1"] = day.split("-");
  const t = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + n));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1, 2)}-${pad(t.getUTCDate(), 2)}`;
}

/** Epoch ms of the most recent Sunday 00:00 local at or before `date` (spec 8.7). */
export function weekStartOf(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), 0, 0, 0, 0).getTime();
}
