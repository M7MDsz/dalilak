// Owner: signin. The fixed demo numbers the six showcase pieces are fed with (spec 3.1: "real product components fed
// with the fixed demo numbers, so the showcase cannot promise what the product does not do"). Every name, title and
// number is read from the catalogue and the engine, so the showcase says exactly what the product computes for the
// demo persona: the «محلل بيانات» path after the sample CV, then the course «أساسيات Power BI» (spec 10.2 steps 7-10).
import type { AvatarId } from "@/components/avatars";
import { getCourse, getJob, getJobCity, getLeaderboardUser, getSkill, LEADERBOARD_USERS } from "@/lib/data";
import { guideTitle } from "@/lib/copy";
import { defaultAvatar, levelFor, weeklyRankFor } from "@/lib/engine";
import type { LeaderboardUserId, SkillId } from "@/lib/types";

const JOB = getJob("data-analyst-riyadh");
const COURSE = getCourse("c-powerbi-1");

/** XP before and after the course (spec 10.4: 180 → 380, level 2 «مستكشف» → 3 «مجتهد»). */
const XP_BEFORE = 180;
const XP_AFTER = 380;

const levelView = (xp: number) => {
  const info = levelFor(xp);
  return { total: xp, level: info.level, title: info.title, from: info.from, to: info.next };
};

const stageSkill = (n: number, skill: SkillId, stars: number) => ({ n, name: getSkill(skill).name, stars, slots: getSkill(skill).maxStars });

/** A sample user's weekly rank on a board that also holds the user with `mine` weekly XP (ties go to the user, 8.7). */
function sampleRank(id: LeaderboardUserId, mine: number): number {
  const user = getLeaderboardUser(id);
  const above = LEADERBOARD_USERS.filter((u) => u.weeklyXp > user.weeklyXp).length;
  return 1 + above + (mine >= user.weeklyXp ? 1 : 0);
}

const boardRow = (id: LeaderboardUserId) => {
  const user = getLeaderboardUser(id);
  return { id, name: user.name, avatar: user.avatar, level: levelFor(user.totalXp).level, xp: user.weeklyXp };
};

export const DEMO = {
  job: { title: JOB.title, company: JOB.company, city: getJobCity(JOB.city).name },
  /** Piece 2: the match with «محلل بيانات» rises from 70% to 90% when the Power BI star lands (7.2). */
  match: { before: 70, after: 90 },
  /** Piece 1: stages 6, 7, 8 of the path after the sample CV (3.4), then the goal. */
  strip: [stageSkill(6, "sql", 2), stageSkill(7, "powerbi", 1), stageSkill(8, "statistics", 2)] as const,
  /** Piece 3: Excel from the CV (2 of 3 stars), Power BI's first star from the course. */
  skills: {
    excel: { name: getSkill("excel").name, stars: 2, slots: getSkill("excel").maxStars },
    powerbi: { name: getSkill("powerbi").name, before: 0, after: 1, slots: getSkill("powerbi").maxStars },
  },
  course: guideTitle(COURSE.id),
  /** Piece 5: the course pays +200 XP (8.2). */
  xp: { gain: XP_AFTER - XP_BEFORE, before: levelView(XP_BEFORE), after: levelView(XP_AFTER) },
  /** Piece 6: the board around the user, before (180 XP, rank 18) and after the course (380 XP, rank 10). */
  board: {
    above: boardRow("u03"),
    passed: boardRow("u16"),
    me: {
      avatar: defaultAvatar("خالد") as AvatarId,
      before: { xp: XP_BEFORE, rank: weeklyRankFor(XP_BEFORE), level: levelFor(XP_BEFORE).level },
      after: { xp: XP_AFTER, rank: weeklyRankFor(XP_AFTER), level: levelFor(XP_AFTER).level },
    },
    rank: (id: LeaderboardUserId, mine: number) => sampleRank(id, mine),
  },
} as const;
