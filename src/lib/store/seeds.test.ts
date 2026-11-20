// Owner: store. Every seed of spec 10.3 against its row of the table (XP, level, stars, skills, match, courses,
// applications, badges, weekly rank, next step), the quiet flags, and the first-visit leaderboard baselines of the notes.
import { describe, expect, it } from "vitest";

import type { BadgeId, Clock, NextStep, SeedName, UserState } from "@/lib/types";
import { SEED_NAMES } from "@/lib/ids";
import {
  applicationStatus,
  dailyReward,
  levelFor,
  makeClock,
  nextStep,
  rankBeforeLatestImprovement,
  skillStars,
  skillsHeld,
  streakInfo,
  targetMatch,
  totalStars,
  totalXp,
  weeklyRankFor,
  weeklyXp,
} from "@/lib/engine";

import { buildSeed, demoAnswers, seedUser } from "./seeds";
import { factsOf } from "./snapshot";
import { claimDailyReward, touchDay } from "./transitions";

/** Wednesday 18 Nov 2026, 21:00 on the device's clock (the week started on Sunday the 15th). */
const CLOCK: Clock = makeClock(new Date(2026, 10, 18, 21, 0));
const TODAY = "2026-11-18";
const DEMO_NOTE =
  "أتقدّم لوظيفة محلل بيانات لدى وادي الغيم للبيانات. مطابقتي الحالية مع متطلبات الوظيفة 90%، وأبرز ما لديّ: Excel و SQL و Power BI. وأعمل الآن على استكمال: الإحصاء.";

interface SeedRow {
  readonly xp: number;
  readonly level: number;
  readonly stars: number;
  readonly skills: number;
  readonly match: number;
  readonly completed: readonly string[];
  readonly started: readonly string[];
  readonly applications: number;
  readonly badges: readonly BadgeId[];
  readonly rank: number;
  readonly next: NextStep["rule"];
  /** The first-visit leaderboard baseline (10.3 notes): rankBeforeLatestImprovement. */
  readonly baseline: number;
}

const BASE: readonly BadgeId[] = ["first-steps", "goal-set"];
const TABLE: Readonly<Record<Exclude<SeedName, "fresh">, SeedRow>> = {
  onboarded: {
    xp: 80, level: 1, stars: 0, skills: 0, match: 0, completed: [], started: [], applications: 0,
    badges: BASE, rank: 22, next: 1, baseline: 23,
  },
  "cv-analysed": {
    xp: 180, level: 2, stars: 11, skills: 8, match: 70, completed: [], started: [], applications: 0,
    badges: [...BASE, "cv-scanned"], rank: 18, next: 3, baseline: 22,
  },
  "course-done": {
    xp: 380, level: 3, stars: 12, skills: 9, match: 90, completed: ["c-powerbi-1"], started: [], applications: 0,
    badges: [...BASE, "cv-scanned", "first-course", "top-ten"], rank: 10, next: 3, baseline: 18,
  },
  "mid-path": {
    xp: 420, level: 3, stars: 12, skills: 9, match: 90, completed: ["c-powerbi-1"], started: ["c-statistics-2"], applications: 1,
    badges: [...BASE, "cv-scanned", "first-course", "top-ten", "first-application"], rank: 10, next: 2, baseline: 18,
  },
  "job-ready": {
    xp: 620, level: 4, stars: 13, skills: 9, match: 100, completed: ["c-powerbi-1", "c-statistics-2"], started: [], applications: 0,
    badges: [...BASE, "cv-scanned", "first-course", "top-ten", "job-ready"], rank: 7, next: 4, baseline: 10,
  },
  returning: {
    xp: 420, level: 3, stars: 12, skills: 9, match: 90, completed: ["c-powerbi-1"], started: ["c-statistics-2"], applications: 1,
    badges: [...BASE, "cv-scanned", "first-course", "top-ten", "first-application"], rank: 10, next: 2, baseline: 18,
  },
};

function seeded(name: Exclude<SeedName, "fresh">): UserState {
  const state = buildSeed(name, CLOCK);
  expect(state.currentUserId).toBe("خالد");
  expect(Object.keys(state.users)).toEqual(["خالد"]);
  const user = state.users["خالد"];
  if (!user) throw new Error("seed has no user");
  return user;
}

function completedCourses(user: UserState): string[] {
  return Object.entries(user.courses)
    .filter(([, progress]) => progress?.completedAt != null)
    .map(([id]) => id)
    .sort();
}

function startedCourses(user: UserState): string[] {
  return Object.entries(user.courses)
    .filter(([, progress]) => progress != null && progress.completedAt === null)
    .map(([id]) => id)
    .sort();
}

describe("seed fresh", () => {
  it("is signed out with no account", () => {
    expect(buildSeed("fresh", CLOCK)).toEqual({ currentUserId: null, users: {} });
    expect(seedUser("fresh", CLOCK)).toBeNull();
  });
});

describe.each(Object.entries(TABLE) as [Exclude<SeedName, "fresh">, SeedRow][])("seed %s (spec 10.3)", (name, expected) => {
  it("has the numbers of its row", () => {
    const user = seeded(name);
    const facts = factsOf(user);
    const stars = skillStars(facts);
    expect({
      xp: totalXp(facts),
      level: levelFor(totalXp(facts)).level,
      stars: totalStars(stars),
      skills: skillsHeld(stars),
      match: targetMatch(facts),
      completed: completedCourses(user),
      started: startedCourses(user),
      applications: user.applications.length,
      badges: [...user.badges.map((b) => b.id)].sort(),
      rank: weeklyRankFor(weeklyXp(facts, CLOCK)),
      next: nextStep(facts).rule,
      baseline: rankBeforeLatestImprovement(facts, CLOCK),
    }).toEqual({ ...expected, completed: [...expected.completed].sort(), started: [...expected.started].sort(), badges: [...expected.badges].sort() });
  });

  it("is «خالد», av-01, the 4.6 answers, target data-analyst-riyadh, past the reveal", () => {
    const user = seeded(name);
    expect(user.name).toBe("خالد");
    expect(user.avatar).toBe("av-01");
    expect(user.answers).toEqual(demoAnswers());
    expect(user.targetJobId).toBe("data-analyst-riyadh");
    expect(user.onboardingCompletedAt).not.toBeNull();
    expect(user.onboarding.revealPlayed).toBe(true);
  });

  it("is quiet: news announced, thread empty, nudge shown, full map-open played, leaderboard not visited", () => {
    const user = seeded(name);
    expect(user.xpEvents.every((e) => e.announced)).toBe(true);
    expect(user.badges.every((b) => b.announced)).toBe(true);
    expect(user.advisor).toEqual({ messages: [], jobsDisclosed: false, applyInFlight: null });
    expect(user.seen.nudge).toBe(true);
    expect(user.seen.mapOpenPlayed).toBe(true);
    expect(user.seen.leaderboardRank).toBeNull();
    if (name === "onboarded") expect(user.seen.catchUpForCv).toBeNull();
    else if (name === "cv-analysed") expect(user.seen.catchUpForCv).toBeNull();
    else expect(user.seen.catchUpForCv).toBe(user.cv?.analysedAt);
  });

  it("dates every event at or before the clock, in the order the actions ran", () => {
    const user = seeded(name);
    const times = user.xpEvents.map((e) => e.at);
    expect(times.every((t) => t <= CLOCK.now)).toBe(true);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
  });
});

describe("seeds created today (10.3: streak 1, active today, weekly XP = total XP)", () => {
  it.each(["onboarded", "cv-analysed", "course-done", "mid-path", "job-ready"] as const)("%s", (name) => {
    const user = seeded(name);
    expect(user.createdDay).toBe(TODAY);
    expect(user.activeDays).toEqual([TODAY]);
    expect(streakInfo(user, CLOCK).current).toBe(1);
    expect(weeklyXp(user, CLOCK)).toBe(totalXp(user));
    expect(dailyReward(user, CLOCK).due).toBe(false);
  });
});

describe("seed details", () => {
  it("cv-analysed: the sample CV, marked as the sample, read locally; catch-up has not played", () => {
    const user = seeded("cv-analysed");
    expect(user.cv).toMatchObject({ fileName: null, isSample: true, engine: "local" });
    expect(user.cv?.skills).toHaveLength(8);
    expect(user.cvDocument?.lines.length).toBeGreaterThan(0);
    expect(nextStep(user)).toMatchObject({ rule: 3, courseId: "c-powerbi-1", matchNow: 70, matchAfter: 90 });
  });

  it("course-done: next is «الإحصاء التطبيقي للمحللين» (c-statistics-2)", () => {
    expect(nextStep(seeded("course-done"))).toMatchObject({ rule: 3, courseId: "c-statistics-2" });
  });

  it("mid-path: DL-2026-0001, sent by «دليلك» at 90%, pinned at review; statistics started with lessons 1-2", () => {
    const user = seeded("mid-path");
    const app = user.applications[0];
    expect(app).toMatchObject({
      jobId: "data-analyst-riyadh",
      number: "DL-2026-0001",
      matchAtSend: 90,
      by: "advisor",
      xpPaid: 40,
      manualStatus: "review",
      pinned: true,
      note: DEMO_NOTE,
      cvLine: "مرفقة: السيرة الجاهزة",
    });
    if (!app) throw new Error("no application");
    expect(applicationStatus(app, CLOCK.now + 10 * 60_000)).toBe("review");
    expect(user.courses["c-statistics-2"]?.ticked).toEqual([1, 2]);
    expect(nextStep(user)).toMatchObject({ rule: 2, courseId: "c-statistics-2", ticked: 2 });
  });

  it("job-ready: no application, so the 100% apply can be tested (+40 → 660)", () => {
    const user = seeded("job-ready");
    expect(user.applications).toEqual([]);
    expect(nextStep(user)).toEqual({ rule: 4, jobId: "data-analyst-riyadh" });
  });

  it("returning: created two days ago, active the day before yesterday and yesterday, streak 2, today not active", () => {
    const user = seeded("returning");
    expect(user.createdDay).toBe("2026-11-16");
    expect(user.activeDays).toEqual(["2026-11-16", "2026-11-17"]);
    expect(streakInfo(user, CLOCK).current).toBe(2);
    const days = new Set(user.xpEvents.map((e) => new Date(e.at).getDate()));
    expect(days).toEqual(new Set([16, 17]));
    expect(user.applications[0]?.number).toBe("DL-2026-0001");
    expect(dailyReward(user, CLOCK)).toMatchObject({ due: true, day: 3, amount: 60 });
  });

  it("returning: the first app-shell load offers day 3: «استلم +60 XP» → 480 XP, streak 3, «ثلاثة أيام» (7), rank 8, climb 10 → 8", () => {
    const touched = touchDay(seeded("returning"), CLOCK);
    expect(touched.firstLoadToday).toBe(true);
    expect(touched.daily).toMatchObject({ due: true, day: 3, amount: 60 });
    expect(touched.transition.consequence.streak).toEqual({ before: 2, after: 3 });
    expect(touched.transition.consequence.badges).toEqual(["streak-3"]);
    const claimed = claimDailyReward(touched.transition.user, CLOCK);
    if (!claimed) throw new Error("the daily reward was not due");
    expect(claimed.consequence.xp).toMatchObject({ gained: 60, after: 480 });
    expect(claimed.consequence.rank).toMatchObject({ before: 10, after: 8 });
    expect(claimed.user.badges).toHaveLength(7);
    expect(rankBeforeLatestImprovement(claimed.user, CLOCK)).toBe(10);
  });

  it("covers every seed name", () => {
    expect([...SEED_NAMES].sort()).toEqual(["fresh", ...Object.keys(TABLE)].sort());
  });
});
