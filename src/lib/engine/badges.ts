// Owner: engine. The twelve unlock rules of spec 8.6, evaluated from the facts.
import { BADGE_IDS } from "@/lib/ids";
import { BADGE_RULES, LEVEL_THRESHOLDS } from "@/lib/data";
import type { BadgeId, BadgeProgress, Clock, UserFacts } from "@/lib/types";

import { completedCourses } from "./internal";
import { weeklyRankFor } from "./leaderboard";
import { levelNumberFor } from "./levels";
import { targetMatch } from "./match";
import { skillStars, skillsHeld } from "./stars";
import { streakInfo } from "./streak";
import { totalXp, weeklyXp } from "./xp";

/** What the rules read, computed once. */
function measures(facts: UserFacts, clock: Clock) {
  const fired = (type: string) => facts.xpEvents.some((e) => e.type === type);
  const streak = streakInfo(facts, clock);
  const total = totalXp(facts);
  return {
    onboarded: fired("onboarding_completed") || facts.onboardingCompletedAt !== null,
    targetSet: fired("target_set") || facts.targetJobId !== null,
    cvScanned: fired("cv_analysed") || facts.cv !== null,
    applications: facts.applications.length,
    courses: completedCourses(facts).length,
    streakCurrent: streak.current,
    streakLongest: streak.longest,
    skills: skillsHeld(skillStars(facts)),
    total,
    level: levelNumberFor(total),
    match: targetMatch(facts),
    rank: weeklyRankFor(weeklyXp(facts, clock)),
  };
}

type Measures = ReturnType<typeof measures>;

const RULES: Readonly<Record<BadgeId, (m: Measures) => boolean>> = {
  "first-steps": (m) => m.onboarded,
  "goal-set": (m) => m.targetSet,
  "cv-scanned": (m) => m.cvScanned,
  "first-application": (m) => m.applications >= 1,
  "first-course": (m) => m.courses >= 1,
  "five-courses": (m) => m.courses >= BADGE_RULES.fiveCourses,
  "streak-3": (m) => m.streakLongest >= BADGE_RULES.streak3,
  "streak-7": (m) => m.streakLongest >= BADGE_RULES.streak7,
  "ten-skills": (m) => m.skills >= BADGE_RULES.tenSkills,
  "level-5": (m) => m.level >= BADGE_RULES.level5,
  "job-ready": (m) => m.match === BADGE_RULES.jobReadyMatch,
  "top-ten": (m) => m.rank <= BADGE_RULES.topTenRank,
};

/**
 * Every badge whose rule holds now, in 8.6 order. The store adds the ones not yet unlocked after EVERY state change (one
 * place: transitions `finalize`) and never removes one. `top-ten` = weekly rank ≤ 10; `job-ready` = match with the current
 * target = 100; `first-application` = at least one application (any match). The streak badges read the longest streak
 * in activeDays (badges are checked after every streak change, so this equals "streak ≥ n" at that moment).
 */
export function badgesEarned(facts: UserFacts, clock: Clock): readonly BadgeId[] {
  const m = measures(facts, clock);
  return BADGE_IDS.filter((id) => RULES[id](m));
}

/**
 * Unlocked flag (the badge is in facts.badges) and counted progress per badge, in 8.6 order (advisor `list_badges`,
 * profile hints). Counted: applications, courses, streak days (current streak), skills with a star, total XP toward
 * level 5 (1000). Not counted (null): the three one-time badges, job-ready and top-ten.
 */
export function badgeProgress(facts: UserFacts, clock: Clock): readonly BadgeProgress[] {
  const m = measures(facts, clock);
  const unlocked = new Set<BadgeId>(facts.badges.map((b) => b.id));
  const counted: Readonly<Partial<Record<BadgeId, { have: number; need: number }>>> = {
    "first-application": { have: m.applications, need: 1 },
    "first-course": { have: m.courses, need: 1 },
    "five-courses": { have: m.courses, need: BADGE_RULES.fiveCourses },
    "streak-3": { have: m.streakCurrent, need: BADGE_RULES.streak3 },
    "streak-7": { have: m.streakCurrent, need: BADGE_RULES.streak7 },
    "ten-skills": { have: m.skills, need: BADGE_RULES.tenSkills },
    "level-5": { have: m.total, need: LEVEL_THRESHOLDS[BADGE_RULES.level5 - 1] ?? 1000 },
  };
  return BADGE_IDS.map((id) => {
    const c = counted[id];
    return { id, unlocked: unlocked.has(id), have: c?.have ?? null, need: c?.need ?? null };
  });
}
