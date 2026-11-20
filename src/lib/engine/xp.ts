// Owner: engine. XP sums (spec 8.1, 8.7) and event ids.
import type { Clock, CourseId, DayKey, JobId, UserFacts, XpEventType } from "@/lib/types";

/** Sum of all XP events. */
export function totalXp(facts: UserFacts): number {
  return facts.xpEvents.reduce((sum, e) => sum + e.amount, 0);
}

/** Sum of XP events with `at >= clock.weekStart` (spec 8.7: since Sunday 00:00 on the device's clock). */
export function weeklyXp(facts: UserFacts, clock: Clock): number {
  return facts.xpEvents.reduce((sum, e) => (e.at >= clock.weekStart ? sum + e.amount : sum), 0);
}

const ONE_TIME: ReadonlySet<XpEventType> = new Set<XpEventType>(["onboarding_completed", "target_set", "cv_analysed"]);

/** The unique id of an event: the type alone for the three one-time events, `${type}:${ref}` otherwise. */
export function xpEventId(type: XpEventType, ref: CourseId | JobId | DayKey | null): string {
  if (ONE_TIME.has(type) || ref === null) return type;
  return `${type}:${ref}`;
}
