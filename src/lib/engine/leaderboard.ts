// Owner: engine. The weekly board (spec 8.7, 9.5).
import { LEADERBOARD_USERS } from "@/lib/data";
import type { Clock, LeaderRow, Leaderboard, UserFacts } from "@/lib/types";

import { levelNumberFor } from "./levels";
import { totalXp, weeklyXp } from "./xp";

/** 1 + the number of sample users with MORE weekly XP (ties go to the user): 0 → 25, 50 → 23, 80 → 22, 180 → 18, 380 → 10, 420 → 10, 480 → 8, 660 → 6. */
export function weeklyRankFor(weeklyXpValue: number): number {
  return 1 + LEADERBOARD_USERS.filter((u) => u.weeklyXp > weeklyXpValue).length;
}

/** XP to the place above (that user's XP minus the user's), or null in first place. */
export function gapToNext(weeklyXpValue: number): { toRank: number; xp: number } | null {
  const above = LEADERBOARD_USERS.filter((u) => u.weeklyXp > weeklyXpValue);
  if (above.length === 0) return null;
  const nearest = Math.min(...above.map((u) => u.weeklyXp));
  return { toRank: above.length, xp: nearest - weeklyXpValue };
}

/** The first word of the user's name (spec 3.4 / 3.12: the user's row shows the first name). */
function firstName(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? name;
}

/** All 25 rows (the user's row is "me", named with the user's first name), my rank and gap, the top three. */
export function leaderboard(facts: UserFacts, clock: Clock): Leaderboard {
  const mine = weeklyXp(facts, clock);
  const me: LeaderRow = {
    id: "me",
    rank: 0,
    name: firstName(facts.name),
    city: facts.answers.city?.label ?? "",
    avatar: facts.avatar,
    level: levelNumberFor(totalXp(facts)),
    weeklyXp: mine,
    me: true,
  };
  const samples: LeaderRow[] = LEADERBOARD_USERS.map((u) => ({
    id: u.id,
    rank: 0,
    name: u.name,
    city: u.city,
    avatar: u.avatar,
    level: levelNumberFor(u.totalXp),
    weeklyXp: u.weeklyXp,
    me: false,
  }));
  // Higher weekly XP first; the user ranks above a sample user with the same XP (8.7).
  const sorted = [me, ...samples].sort((a, b) => b.weeklyXp - a.weeklyXp || Number(b.me) - Number(a.me));
  const rows = sorted.map((row, i) => ({ ...row, rank: i + 1 }));
  const rank = weeklyRankFor(mine);
  return { rows, me: { rank, weeklyXp: mine, gap: gapToNext(mine) }, top3: rows.slice(0, 3) };
}

/**
 * Spec 8.7 point 3: the rank before the user's most recent XP gain that improved the weekly rank (this week's events
 * only, in time order), or null when no gain this week improved it. Demo after the application: 18 (the course lifted
 * 18 → 10; the application's +40 changed nothing).
 */
export function rankBeforeLatestImprovement(facts: UserFacts, clock: Clock): number | null {
  const events = facts.xpEvents.filter((e) => e.at >= clock.weekStart).slice().sort((a, b) => a.at - b.at);
  let sum = 0;
  let found: number | null = null;
  for (const e of events) {
    const before = weeklyRankFor(sum);
    sum += e.amount;
    if (weeklyRankFor(sum) < before) found = before;
  }
  return found;
}
