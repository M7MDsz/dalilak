// Owner: engine. Streak and daily reward (spec 8.4), derived from activeDays and the XP history.
import { XP } from "@/lib/data";
import type { Clock, DailyRewardInfo, DayKey, StreakInfo, UserFacts } from "@/lib/types";

import { addDays } from "./clock";

/** The length of the run of consecutive active days that ends on `day` (0 when `day` is not active). */
function runEndingOn(days: ReadonlySet<DayKey>, day: DayKey): number {
  let n = 0;
  let d = day;
  while (days.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

/** Current streak (consecutive active days ending today, or yesterday before today's first load), longest, last seven days. */
export function streakInfo(facts: UserFacts, clock: Clock): StreakInfo {
  const days = new Set(facts.activeDays);
  const today = clock.today;
  const current = days.has(today) ? runEndingOn(days, today) : runEndingOn(days, addDays(today, -1));
  let longest = 0;
  for (const day of days) {
    if (!days.has(addDays(day, 1))) longest = Math.max(longest, runEndingOn(days, day));
  }
  const last7: StreakInfo["last7"][number][] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    last7.push({ day, active: days.has(day), today: i === 0 });
  }
  return { current, longest: Math.max(longest, current), last7 };
}

/** min(100, 20 × day): day 1 → 20 … day 5 and after → 100. A day below 1 counts as day 1. */
export function dailyRewardAmount(streakDay: number): number {
  return Math.min(XP.dailyCap, XP.dailyPerDay * Math.max(1, Math.floor(streakDay)));
}

/**
 * Due on every day except the creation day until a `daily_reward` event dated today exists (spec 8.4). `day` is today's
 * streak day as it is once today is active, so the result is the same before and after touchDay (the map waits on `due`
 * before the shell's touchDay runs, §11.3). `restarted`: today starts a new streak after earlier active days.
 */
export function dailyReward(facts: UserFacts, clock: Clock): DailyRewardInfo {
  const days = new Set(facts.activeDays);
  const today = clock.today;
  const day = days.has(today) ? runEndingOn(days, today) : runEndingOn(days, addDays(today, -1)) + 1;
  const claimed = facts.xpEvents.some((e) => e.type === "daily_reward" && (e.ref === today || e.id === `daily_reward:${today}`));
  const restarted = day === 1 && facts.activeDays.some((d) => d < today);
  return {
    due: today !== facts.createdDay && !claimed,
    day,
    amount: dailyRewardAmount(day),
    tomorrow: dailyRewardAmount(day + 1),
    restarted,
  };
}
