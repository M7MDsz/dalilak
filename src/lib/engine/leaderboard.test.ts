import { describe, expect, it } from "vitest";

import { gapToNext, leaderboard, rankBeforeLatestImprovement, weeklyRankFor } from "./leaderboard";
import {
  CLOCK,
  DAY,
  MINUTE,
  T0,
  addEvent,
  applied,
  completed,
  courseDoneFacts,
  cvAnalysedFacts,
  newFacts,
  onboarded,
  targeted,
  xpEvent,
} from "./test-fixtures";

const t = T0.getTime();

describe("weekly rank (spec 8.7, 9.5)", () => {
  it("is 1 + the sample users with more weekly XP", () => {
    const table: [number, number][] = [
      [0, 25],
      [50, 23],
      [80, 22],
      [180, 18],
      [220, 16],
      [380, 10],
      [420, 10],
      [480, 8],
      [620, 7],
      [660, 6],
      [980, 1],
      [5000, 1],
    ];
    for (const [xp, rank] of table) expect(weeklyRankFor(xp), `${xp} XP`).toBe(rank);
  });

  it("gives ties to the user", () => {
    // 440 = ريم ح., 480 = بندر ط., 980 = فيصل ق.
    expect(weeklyRankFor(440)).toBe(9);
    expect(weeklyRankFor(439)).toBe(10);
    expect(weeklyRankFor(480)).toBe(8);
    expect(weeklyRankFor(980)).toBe(1);
  });

  it("tells the gap to the place above", () => {
    expect(gapToNext(420)).toEqual({ toRank: 9, xp: 20 });
    expect(gapToNext(80)).toEqual({ toRank: 21, xp: 10 });
    expect(gapToNext(0)).toEqual({ toRank: 24, xp: 20 });
    expect(gapToNext(980)).toBeNull();
  });
});

describe("leaderboard (spec 3.12)", () => {
  it("has 25 rows with the user named by first name, the demo podium and gap", () => {
    const f = applied(courseDoneFacts(), "data-analyst-riyadh", t + 10 * MINUTE, 90);
    const board = leaderboard({ ...f, name: "خالد العتيبي" }, CLOCK);
    expect(board.rows).toHaveLength(25);
    expect(board.rows.map((r) => r.rank)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(board.top3.map((r) => [r.name, r.weeklyXp])).toEqual([
      ["فيصل ق.", 980],
      ["سلطان م.", 910],
      ["مشعل ر.", 860],
    ]);
    expect(board.me).toEqual({ rank: 10, weeklyXp: 420, gap: { toRank: 9, xp: 20 } });
    const me = board.rows.find((r) => r.me);
    expect(me).toMatchObject({ id: "me", rank: 10, name: "خالد", city: "الرياض", avatar: "av-01", level: 3, weeklyXp: 420 });
    expect(board.rows[8]).toMatchObject({ id: "u03", weeklyXp: 440, level: 6 });
    expect(board.rows[10]).toMatchObject({ id: "u16", weeklyXp: 370, level: 4 });
  });

  it("places the user above a sample user with the same XP", () => {
    const f = addEvent(newFacts(), xpEvent("daily_reward", 480, t, CLOCK.today));
    const board = leaderboard(f, CLOCK);
    expect(board.me.rank).toBe(8);
    expect(board.rows[7]?.id).toBe("me");
    expect(board.rows[8]?.id).toBe("u14");
  });

  it("counts this week's XP only; the user can be first", () => {
    const lastWeek = addEvent(newFacts(), xpEvent("course_completed", 1000, CLOCK.weekStart - 1, "c-excel-1"));
    expect(leaderboard(lastWeek, CLOCK).me).toMatchObject({ rank: 25, weeklyXp: 0 });
    const top = addEvent(newFacts(), xpEvent("course_completed", 1000, t, "c-excel-1"));
    const board = leaderboard(top, CLOCK);
    expect(board.me).toEqual({ rank: 1, weeklyXp: 1000, gap: null });
    expect(board.top3[0]?.me).toBe(true);
  });
});

describe("rankBeforeLatestImprovement (spec 8.7 point 3, 10.3 notes)", () => {
  it("demo: 18 after the application (the course lifted 18 → 10; +40 moved nothing)", () => {
    const f = applied(courseDoneFacts(), "data-analyst-riyadh", t + 10 * MINUTE, 90);
    expect(rankBeforeLatestImprovement(f, CLOCK)).toBe(18);
  });

  it("seed baselines: onboarded 23, cv-analysed 22, course-done 18, job-ready 10", () => {
    const onboardedSeed = targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t);
    expect(rankBeforeLatestImprovement(onboardedSeed, CLOCK)).toBe(23);
    expect(rankBeforeLatestImprovement(cvAnalysedFacts(), CLOCK)).toBe(22);
    expect(rankBeforeLatestImprovement(courseDoneFacts(), CLOCK)).toBe(18);
    const jobReady = completed(courseDoneFacts(), "c-statistics-2", t + 20 * MINUTE, 240);
    expect(rankBeforeLatestImprovement(jobReady, CLOCK)).toBe(10);
  });

  it("null when no gain this week improved the rank", () => {
    expect(rankBeforeLatestImprovement(newFacts(), CLOCK)).toBeNull();
    const old = addEvent(newFacts(), xpEvent("course_completed", 200, t - 7 * DAY, "c-excel-1"));
    expect(rankBeforeLatestImprovement(old, CLOCK)).toBeNull();
    // 10 XP from 0 does not pass anybody (the lowest has 20)
    const tiny = addEvent(newFacts(), xpEvent("daily_reward", 10, t, CLOCK.today));
    expect(rankBeforeLatestImprovement(tiny, CLOCK)).toBeNull();
  });
});
