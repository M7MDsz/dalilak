// The end-to-end arithmetic of the demo (spec 10.2 / 10.4, 8.8, the 10.3 seed rows) on the REAL catalogue of
// src/lib/data, with facts written step by step the way the store's transitions write them (each step: the facts it
// changes, its XP event, then every badge whose rule now holds, like `finalize`). The store tests the same walk through
// its real transitions; this file proves the engine's numbers.
import { describe, expect, it } from "vitest";

import { getJob } from "@/lib/data";
import type { BadgeId, Clock, OnboardingAnswers, UserFacts } from "@/lib/types";

import {
  addDays,
  applicationNumber,
  applicationStatus,
  badgesEarned,
  buildRoadmap,
  courseOnPath,
  dailyReward,
  defaultAvatar,
  jobGap,
  jobMatch,
  leaderboard,
  levelFor,
  matchBreakdown,
  nextApplicationNumber,
  nextStep,
  pendingNews,
  rankBeforeLatestImprovement,
  rankJobs,
  recommend,
  pathSummary,
  skillNode,
  skillStars,
  skillTreeSummary,
  starsBeforeLatestStar,
  streakInfo,
  targetMatch,
  totalStars,
  totalXp,
  weeklyRankFor,
  weeklyXp,
} from "@/lib/engine";

import {
  CLOCK,
  DAY,
  DEMO_ANSWERS,
  MINUTE,
  T0,
  addEvent,
  applied,
  clockAt,
  completed,
  newFacts,
  onboarded,
  quiet,
  started,
  targeted,
  withCv,
  withDays,
  xpEvent,
} from "./test-fixtures";

const t = T0.getTime();

/** Like `finalize`: unlock every badge whose rule now holds (written un-announced). */
function finalize(facts: UserFacts, clock: Clock): UserFacts {
  const have = new Set(facts.badges.map((b) => b.id));
  const added = badgesEarned(facts, clock).filter((id) => !have.has(id));
  return { ...facts, badges: [...facts.badges, ...added.map((id) => ({ id, at: clock.now, announced: false }))] };
}

/** Marks everything announced (what the overlay queue / the celebration does after showing it). */
const announce = quiet;

interface Row {
  xp: number;
  level: number;
  title: string;
  match: number | null;
  rank: number;
  badges: readonly BadgeId[];
}

function row(facts: UserFacts, clock: Clock): Row {
  const level = levelFor(totalXp(facts));
  return {
    xp: totalXp(facts),
    level: level.level,
    title: level.title,
    match: targetMatch(facts),
    rank: weeklyRankFor(weeklyXp(facts, clock)),
    badges: facts.badges.map((b) => b.id),
  };
}

/**
 * 20 Nov 2026 (docs/ONBOARDING-FLOW.md): the CV is read INSIDE onboarding, before the questions it answers. The sample CV
 * states الرياض · بكالوريوس · نظم معلومات إدارية · a four-month co-op («أقل من سنة»); the user then taps «الأرقام والبيانات»,
 * «لا، مو الحين» and «أول وظيفة».
 */
const CV_ANSWERS: OnboardingAnswers = { ...DEMO_ANSWERS, experience: "under1", company: "none" };

describe("the 2-minute demo, step by step (spec 10.2 / 10.4, CV in onboarding)", () => {
  // Step 1: sign in as «خالد» (21:00)
  const s1 = newFacts({ avatar: defaultAvatar("خالد") });
  // Step 2a: «جرّب بسيرة جاهزة» in the chat → cv_analysed (+100); its toast shows in the chat (announced there)
  const s2a = finalize(withCv(s1, t + MINUTE / 2), clockAt(0.5));
  // Step 2b: the questions left → onboarding_completed (+50)
  const s2 = finalize(onboarded(announce(s2a), t + MINUTE, CV_ANSWERS), clockAt(1));
  // Step 4: «ابدأ هذا المسار» → target_set (+30): the reveal's job, ranked with the CV's stars
  const s4 = finalize(targeted(s2, recommend(CV_ANSWERS, undefined, skillStars(s2)).recommended, t + 2 * MINUTE), clockAt(2));
  // Step 6 (the old order's CV step): nothing left to do; the map's full opening already shows the CV's stages done (no catch-up after it)
  const s6 = announce(s4);
  // Step 8: course started (pays nothing)
  const s8 = started(announce(s6), "c-powerbi-1", t + 4 * MINUTE);
  // Step 9: course completed → course_completed (+200)
  const s9 = finalize(completed(s8, "c-powerbi-1", t + 5 * MINUTE, 200), clockAt(5));
  // Step 11: «دليلك» applies at 90% → job_applied (+40)
  const s11 = finalize(applied(announce(s9), "data-analyst-riyadh", t + 6 * MINUTE, targetMatch(s9) ?? 0), clockAt(6));
  // One course further (8.8 last row): statistics ★★ → +240
  const s14 = finalize(completed(announce(s11), "c-statistics-2", t + 7 * MINUTE, 240), clockAt(7));

  it("step 1: «خالد» starts at 0 XP, level 1, rank 25, avatar av-01, streak 1, no daily reward", () => {
    expect(row(s1, CLOCK)).toEqual({ xp: 0, level: 1, title: "مبتدئ", match: null, rank: 25, badges: [] });
    expect(s1.avatar).toBe("av-01");
    expect(streakInfo(s1, CLOCK).current).toBe(1);
    expect(dailyReward(s1, CLOCK).due).toBe(false);
  });

  it("step 2: the CV in the chat +100 → 100, «سيرة مقروءة», 8 skills · 11 stars; then the questions +50 → 150, level 2", () => {
    expect(row(s2a, clockAt(0.5))).toMatchObject({ xp: 100, level: 1, title: "مبتدئ", match: null, badges: ["cv-scanned"] });
    expect(skillTreeSummary(s2a)).toMatchObject({ skillsHeld: 8, starsHeld: 11 });
    expect(row(s2, clockAt(1))).toMatchObject({ xp: 150, level: 2, title: "مستكشف", match: null, badges: ["cv-scanned", "first-steps"] });
  });

  it("step 3: the reveal recommends «محلل بيانات» with 8 stages · 74 hours and the two alternatives, with or without the CV", () => {
    const withStars = recommend(CV_ANSWERS, undefined, skillStars(s2));
    expect([withStars.recommended, ...withStars.alternatives]).toEqual(["data-analyst-riyadh", "qiddiya-hr-analytics-analyst-riyadh", "syarah-financial-analyst-tamheer-riyadh"]);
    expect(jobMatch("data-analyst-riyadh", s2)).toBe(70);
    const rec = recommend(DEMO_ANSWERS);
    expect([rec.recommended, ...rec.alternatives]).toEqual([withStars.recommended, ...withStars.alternatives]);
    expect(rec.recommended).toBe("data-analyst-riyadh");
    expect(getJob(rec.recommended).company).toBe("وادي الغيم للبيانات");
    expect(pathSummary(rec.recommended)).toMatchObject({ stages: 8, hours: 74 });
    expect(rec.alternatives.map((id) => [getJob(id).title, pathSummary(id).stages, pathSummary(id).hours])).toEqual([
      ["محلل تحليلات وتقارير الموارد البشرية", 8, 64],
      ["محلل مالي (برنامج تمهير)", 5, 38],
    ]);
  });

  it("step 4: +30 → 180, level 2 «مستكشف», match 70%, rank 18; on /path one +80 toast (rank line 18, the level-up) and two badge toasts", () => {
    expect(row(s4, clockAt(2))).toEqual({
      xp: 180,
      level: 2,
      title: "مستكشف",
      match: 70,
      rank: 18,
      badges: ["cv-scanned", "first-steps", "goal-set"],
    });
    // the CV's +100 (and its badge) were announced in the chat; the map merges the onboarding +50 and the target +30
    expect(pendingNews(s4, clockAt(2))).toEqual({
      xp: {
        eventIds: ["onboarding_completed", "target_set"],
        amount: 80,
        types: ["onboarding_completed", "target_set"],
        rankLine: 18,
        levelUp: { level: 2, title: "مستكشف", xpToNext: 170 },
      },
      badges: ["first-steps", "goal-set"],
    });
    const board = leaderboard(s4, clockAt(2));
    expect(board.top3.map((r) => [r.name, r.weeklyXp])).toEqual([
      ["فيصل ق.", 980],
      ["سلطان م.", 910],
      ["مشعل ر.", 860],
    ]);
    expect(board.me).toMatchObject({ rank: 18, weeklyXp: 180 });
    expect(board.rows.find((r) => r.me)).toMatchObject({ name: "خالد", rank: 18 });
  });

  it("step 6: the map opens at 180, level 2 «مستكشف», match 70%, rank 18, with the CV's 8 skills and nothing left to announce", () => {
    expect(row(s6, clockAt(3))).toEqual({
      xp: 180,
      level: 2,
      title: "مستكشف",
      match: 70,
      rank: 18,
      badges: ["cv-scanned", "first-steps", "goal-set"],
    });
    expect(pendingNews(s6, clockAt(3))).toEqual({ xp: null, badges: [] });
    expect(skillTreeSummary(s6)).toMatchObject({ skillsHeld: 8, starsHeld: 11 });
    expect(rankJobs(s6).slice(0, 3).map((r) => [getJob(r.jobId).title, r.match])).toEqual([
      ["محلل بيانات", 70],
      ["مهندس بيانات أول", 53],
      ["مدير نمو - رؤى وتحليلات", 47],
    ]);
  });

  it("step 7: the roadmap catches up: 6 of 8, 22 hours left, Power BI is stage 7; card «أساسيات Power BI» · 10 h · +200 XP · to 90%", () => {
    const map = buildRoadmap(s6);
    expect(map).toMatchObject({ match: 70, gate: "cleared", currentN: 7, doneCount: 6, total: 8, hoursLeft: 22 });
    expect(map?.stages.filter((s) => s.state === "done").every((s) => s.doneBy?.kind === "cv")).toBe(true);
    expect(nextStep(s6)).toMatchObject({ rule: 3, courseId: "c-powerbi-1", hours: 10, xp: 200, matchNow: 70, matchAfter: 90 });
    expect(map?.stages[6]).toMatchObject({ n: 7, skill: "powerbi", star: 1, hours: 10, xp: 200, gain: 20 });
  });

  it("step 8: starting the course pays nothing; the next step becomes «أكمل دورة…»", () => {
    expect(row(s8, clockAt(4))).toEqual({ ...row(s6, clockAt(3)), badges: ["cv-scanned", "first-steps", "goal-set"] });
    expect(nextStep(s8)).toEqual({ rule: 2, courseId: "c-powerbi-1", ticked: 0, total: 5 });
    expect(courseOnPath("c-powerbi-1", s8)).toMatchObject({ stageN: 7, matchNow: 70, matchAfter: 90 });
  });

  it("step 9: +200 → 380, level 3 «مجتهد», 90%, rank 10 (8 places), «أول دورة» and «ضمن العشرة الأوائل»", () => {
    expect(row(s9, clockAt(5))).toEqual({
      xp: 380,
      level: 3,
      title: "مجتهد",
      match: 90,
      rank: 10,
      badges: ["cv-scanned", "first-steps", "goal-set", "first-course", "top-ten"],
    });
    expect(skillStars(s8).powerbi).toBe(0);
    expect(skillStars(s9).powerbi).toBe(1);
    const before = weeklyRankFor(weeklyXp(s8, clockAt(4)));
    const after = weeklyRankFor(weeklyXp(s9, clockAt(5)));
    expect([before, after, before - after]).toEqual([18, 10, 8]);
    expect(pendingNews(s9, clockAt(5)).xp).toMatchObject({ amount: 200, rankLine: 10, levelUp: { level: 3, title: "مجتهد" } });
  });

  it("step 10: back on /path: 90%, 7 of 8, 12 hours left, stage 7 done «من دورة», stage 8 lit; 380 / 600", () => {
    const map = buildRoadmap(s9);
    expect(map).toMatchObject({ match: 90, currentN: 8, doneCount: 7, total: 8, hoursLeft: 12 });
    expect(map?.stages[6]).toMatchObject({ n: 7, state: "done", doneBy: { kind: "course", courseId: "c-powerbi-1" } });
    expect(map?.stages[7]).toMatchObject({ n: 8, skill: "statistics", star: 2, state: "current" });
    expect(levelFor(380)).toMatchObject({ level: 3, next: 600 });
    expect(leaderboard(s9, clockAt(5)).me).toMatchObject({ rank: 10, weeklyXp: 380 });
  });

  it("step 11: «دليلك» applies at 90%: DL-2026-0001, +40 → 420, rank stays 10 (no rank line), «أول تقديم»", () => {
    expect(nextApplicationNumber(s9, clockAt(6))).toBe("DL-2026-0001");
    expect(applicationNumber(1, 2026)).toBe(s11.applications[0]?.number);
    expect(s11.applications[0]).toMatchObject({ jobId: "data-analyst-riyadh", matchAtSend: 90, xpPaid: 40 });
    expect(row(s11, clockAt(6))).toEqual({
      xp: 420,
      level: 3,
      title: "مجتهد",
      match: 90,
      rank: 10,
      badges: ["cv-scanned", "first-steps", "goal-set", "first-course", "top-ten", "first-application"],
    });
    expect(pendingNews(s11, clockAt(6))).toEqual({
      xp: { eventIds: ["job_applied:data-analyst-riyadh"], amount: 40, types: ["job_applied"], rankLine: null, levelUp: null },
      badges: ["first-application"],
    });
    const app = s11.applications[0];
    if (app) expect(applicationStatus(app, t + 6 * MINUTE)).toBe("sent");
    const gap = jobGap("data-analyst-riyadh", s11);
    expect(gap.missing.map((m) => m.skill)).toEqual(["statistics"]);
    expect(gap.have.map((h) => h.skill)).toEqual(["excel", "sql", "powerbi", "communication"]);
  });

  it("step 12: the leaderboard: «مركزك 10 من 25» · 420 XP · 20 XP to rank 9 · climbs 8 places from 18", () => {
    const board = leaderboard(announce(s11), clockAt(7));
    expect(board.rows).toHaveLength(25);
    expect(board.me).toEqual({ rank: 10, weeklyXp: 420, gap: { toRank: 9, xp: 20 } });
    const from = rankBeforeLatestImprovement(s11, clockAt(7));
    expect(from).toBe(18);
    expect((from ?? 0) - board.me.rank).toBe(8);
    expect(board.top3.map((r) => [r.name, r.weeklyXp])).toEqual([
      ["فيصل ق.", 980],
      ["سلطان م.", 910],
      ["مشعل ر.", 860],
    ]);
  });

  it("step 13: skill tree 9 of 114 · 12 of 185 (38 · 59 before the 20 Nov expansion, 54 · 80 before wave 2, 93 · 148 before wave 3), Power BI fills and «تصوير البيانات» opens; profile 6 of 12 badges, history +40 +200 +100 +30 +50", () => {
    expect(skillTreeSummary(s11)).toEqual({ skillsHeld: 9, skillsTotal: 114, starsHeld: 12, starsTotal: 185 });
    const baseline = starsBeforeLatestStar(s11);
    expect([baseline.powerbi, totalStars(baseline)]).toEqual([0, 11]);
    expect(skillNode("dataviz", s11).state).toBe("available");
    expect(levelFor(420)).toMatchObject({ level: 3, title: "مجتهد", next: 600 });
    expect(s11.badges).toHaveLength(6);
    expect([...s11.xpEvents].reverse().map((e) => e.amount)).toEqual([40, 200, 30, 50, 100]);
    expect(totalStars(skillStars(s11))).toBe(12);
    expect(streakInfo(s11, clockAt(7)).current).toBe(1);
    expect(dailyReward(s11, clockAt(7)).tomorrow).toBe(40);
  });

  it("8.8 last row: «الإحصاء التطبيقي للمحللين» → 660, level 4 «متمكّن», 100%, rank 6, «جاهز للوظيفة»; next: choose a new target", () => {
    expect(row(s14, clockAt(7))).toEqual({
      xp: 660,
      level: 4,
      title: "متمكّن",
      match: 100,
      rank: 6,
      badges: ["cv-scanned", "first-steps", "goal-set", "first-course", "top-ten", "first-application", "job-ready"],
    });
    expect(matchBreakdown(getJob("data-analyst-riyadh"), skillStars(s14)).total).toBe(100);
    expect(buildRoadmap(s14)).toMatchObject({ complete: true, currentN: null, doneCount: 8 });
    expect(nextStep(s14)).toEqual({ rule: 5 });
  });
});

describe("the other orders of 8.8", () => {
  const afterCv = finalize(announce(withCv(targeted(onboarded(newFacts(), t + MINUTE), "data-analyst-riyadh", t + 2 * MINUTE), t + 3 * MINUTE)), clockAt(3));

  it("skipping the application: 180 → 380 → 620, level 4, rank 7", () => {
    let f = completed(afterCv, "c-powerbi-1", t + 5 * MINUTE, 200);
    f = completed(f, "c-statistics-2", t + 7 * MINUTE, 240);
    expect([totalXp(f), levelFor(totalXp(f)).level, weeklyRankFor(weeklyXp(f, clockAt(7)))]).toEqual([620, 4, 7]);
    expect(nextStep(f)).toEqual({ rule: 4, jobId: "data-analyst-riyadh" });
  });

  it("applying at 70% first (still ≥ 60): 180 → 220 (rank 16) → 420 (level 3, rank 10, six places)", () => {
    const a = finalize(applied(afterCv, "data-analyst-riyadh", t + 4 * MINUTE, 70), clockAt(4));
    expect([totalXp(a), weeklyRankFor(weeklyXp(a, clockAt(4)))]).toEqual([220, 16]);
    const c = finalize(completed(a, "c-powerbi-1", t + 5 * MINUTE, 200), clockAt(5));
    const rank = weeklyRankFor(weeklyXp(c, clockAt(5)));
    expect([totalXp(c), levelFor(totalXp(c)).level, rank, 16 - rank]).toEqual([420, 3, 10, 6]);
    // both level-ups and the top-ten badge are safe in every order
    expect(c.badges.map((b) => b.id)).toEqual(expect.arrayContaining(["top-ten", "first-application", "first-course"]));
  });
});

describe("the seed rows of 10.3, derived by the engine", () => {
  const onboardedSeed = quiet(finalize(targeted(finalize(onboarded(newFacts(), t), CLOCK), "data-analyst-riyadh", t), CLOCK));
  const cvSeed = quiet(finalize(withCv(onboardedSeed, t), CLOCK));
  const courseSeed = quiet(finalize(completed(started(cvSeed, "c-powerbi-1", t), "c-powerbi-1", t, 200), CLOCK));
  const midSeed = (() => {
    let f = finalize(applied(courseSeed, "data-analyst-riyadh", t, 90), CLOCK);
    f = { ...f, applications: f.applications.map((a) => ({ ...a, manualStatus: "review" as const, pinned: true })) };
    return quiet(started(f, "c-statistics-2", t, [1, 2]));
  })();
  const jobReadySeed = quiet(finalize(completed(started(courseSeed, "c-statistics-2", t), "c-statistics-2", t, 240), CLOCK));

  function seedRow(f: UserFacts) {
    const stars = skillStars(f);
    return {
      xp: totalXp(f),
      level: levelFor(totalXp(f)).level,
      stars: totalStars(stars),
      skills: skillTreeSummary(f).skillsHeld,
      match: targetMatch(f),
      badges: f.badges.length,
      rank: weeklyRankFor(weeklyXp(f, CLOCK)),
      rule: nextStep(f).rule,
      baseline: rankBeforeLatestImprovement(f, CLOCK),
    };
  }

  it("onboarded · cv-analysed · course-done · mid-path · job-ready", () => {
    expect(seedRow(onboardedSeed)).toEqual({ xp: 80, level: 1, stars: 0, skills: 0, match: 0, badges: 2, rank: 22, rule: 1, baseline: 23 });
    expect(seedRow(cvSeed)).toEqual({ xp: 180, level: 2, stars: 11, skills: 8, match: 70, badges: 3, rank: 18, rule: 3, baseline: 22 });
    expect(seedRow(courseSeed)).toEqual({ xp: 380, level: 3, stars: 12, skills: 9, match: 90, badges: 5, rank: 10, rule: 3, baseline: 18 });
    expect(seedRow(midSeed)).toEqual({ xp: 420, level: 3, stars: 12, skills: 9, match: 90, badges: 6, rank: 10, rule: 2, baseline: 18 });
    expect(seedRow(jobReadySeed)).toEqual({ xp: 620, level: 4, stars: 13, skills: 9, match: 100, badges: 6, rank: 7, rule: 4, baseline: 10 });
    expect(jobReadySeed.badges.map((b) => b.id)).toEqual(["first-steps", "goal-set", "cv-scanned", "first-course", "top-ten", "job-ready"]);
    const app = midSeed.applications[0];
    if (app) expect(applicationStatus(app, t + 365 * DAY)).toBe("review");
    // the 100% apply of job-ready pays +40 → 660
    expect(totalXp(applied(jobReadySeed, "data-analyst-riyadh", t, 100))).toBe(660);
  });

  it("returning: day 3 offers +60 → 480, streak 3, «ثلاثة أيام» (7 badges), rank 8, climbing 10 → 8", () => {
    // created two days ago; active the day before yesterday and yesterday; newest events yesterday; today not active yet
    const yesterday = t - DAY;
    let f: UserFacts = {
      ...midSeed,
      createdAt: t - 2 * DAY,
      createdDay: addDays(CLOCK.today, -2),
      xpEvents: midSeed.xpEvents.map((e, i) => ({ ...e, at: i < 2 ? t - 2 * DAY : yesterday })),
    };
    f = withDays(f, [addDays(CLOCK.today, -2), addDays(CLOCK.today, -1)]);
    const offer = dailyReward(f, CLOCK);
    expect(offer).toEqual({ due: true, day: 3, amount: 60, tomorrow: 80, restarted: false });
    // the shell's touchDay, then «استلم»
    f = withDays(f, [...f.activeDays, CLOCK.today]);
    f = finalize(addEvent(f, xpEvent("daily_reward", offer.amount, t, CLOCK.today)), CLOCK);
    expect(totalXp(f)).toBe(480);
    expect(streakInfo(f, CLOCK).current).toBe(3);
    expect(f.badges.map((b) => b.id)).toContain("streak-3");
    expect(f.badges).toHaveLength(7);
    expect(weeklyRankFor(weeklyXp(f, CLOCK))).toBe(8);
    expect(rankBeforeLatestImprovement(f, CLOCK)).toBe(10);
    expect(dailyReward(f, CLOCK).due).toBe(false);
  });
});
