// Owner: engine. The overlay queue's content (spec 3.15), rebuilt from the facts on every load.
import type { Clock, News, UserFacts, XpNews } from "@/lib/types";

import { weeklyRankFor } from "./leaderboard";
import { levelFor, levelNumberFor } from "./levels";
import { totalXp, weeklyXp } from "./xp";

/**
 * Un-announced XP events merged into one toast (sum; rank line when the weekly rank improved across them and weekly XP
 * before the first was > 0; level-up from the level before the first to after the last) and un-announced badges.
 * Demo after the reveal: { amount 80, types [onboarding_completed, target_set], rankLine null, levelUp null } + 2 badges.
 * "Before" = the facts' current numbers minus the un-announced events (weekly: only those dated this week).
 */
export function pendingNews(facts: UserFacts, clock: Clock): News {
  const pending = facts.xpEvents.filter((e) => !e.announced).slice().sort((a, b) => a.at - b.at);
  const badges = facts.badges.filter((b) => !b.announced).map((b) => b.id);
  if (pending.length === 0) return { xp: null, badges };

  const amount = pending.reduce((sum, e) => sum + e.amount, 0);
  const totalAfter = totalXp(facts);
  const weeklyAfter = weeklyXp(facts, clock);
  const weeklyBefore = weeklyAfter - pending.reduce((sum, e) => (e.at >= clock.weekStart ? sum + e.amount : sum), 0);
  const rankBefore = weeklyRankFor(weeklyBefore);
  const rankAfter = weeklyRankFor(weeklyAfter);
  const levelBefore = levelNumberFor(totalAfter - amount);
  const after = levelFor(totalAfter);

  const xp: XpNews = {
    eventIds: pending.map((e) => e.id),
    amount,
    types: pending.map((e) => e.type),
    rankLine: weeklyBefore > 0 && rankAfter < rankBefore ? rankAfter : null,
    levelUp: after.level > levelBefore ? { level: after.level, title: after.title, xpToNext: after.xpToNext } : null,
  };
  return { xp, badges };
}
