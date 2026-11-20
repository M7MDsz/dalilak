// Owner: store. The pure transitions against the spec's arithmetic (8.8, 10.4) and the consequences the screens play.
// Fixed clocks only; every number below is forced by spec sections 8 and 9.
import { describe, expect, it } from "vitest";

import type { AdvisorMessage, BadgeId, Clock, CvAnalysis, UserState } from "@/lib/types";
import type { OnboardingTurn } from "@/lib/brain/protocol";
import { LIMITS } from "@/lib/brain/protocol";
import { applicationNote } from "@/lib/copy";
import {
  applicationStatus,
  dailyReward,
  levelFor,
  makeClock,
  nextApplicationNumber,
  skillStars,
  streakInfo,
  targetMatch,
  totalXp,
  weeklyRankFor,
  weeklyXp,
} from "@/lib/engine";

import { demoAnswers } from "./seeds";
import { factsOf, INITIAL_SEEN, stateFromFacts } from "./snapshot";
import {
  ADVISOR_THREAD_LIMIT,
  advanceApplication,
  appendAdvisorMessages,
  appendOnboardingMessages,
  applyOnboardingTurn,
  claimDailyReward,
  clearAdvisorThread,
  completeCourse,
  completeOnboarding,
  markAnnounced,
  markRevealPlayed,
  markSeen,
  newUser,
  recordCvAnalysis,
  resolveInterruptedApply,
  setApplyInFlight,
  setAvatar,
  setTarget,
  skipCv,
  startCourse,
  submitApplication,
  tickLesson,
  touchDay,
  type Transition,
} from "./transitions";

const TARGET = "data-analyst-riyadh" as const;
const DEMO_NOTE =
  "أتقدّم لوظيفة محلل بيانات لدى وادي الغيم للبيانات. مطابقتي الحالية مع متطلبات الوظيفة 90%، وأبرز ما لديّ: Excel و SQL و Power BI. وأعمل الآن على استكمال: الإحصاء.";

/** 18 Nov 2026 (a Wednesday), 21:00 + `minute` minutes, on the device's clock. */
function at(minute: number, day = 18): Clock {
  return makeClock(new Date(2026, 10, day, 21, minute));
}

interface Row {
  readonly xp: number;
  readonly level: number;
  readonly match: number | null;
  readonly rank: number;
  readonly badges: number;
}

function row(user: UserState, clock: Clock): Row {
  const facts = factsOf(user);
  return {
    xp: totalXp(facts),
    level: levelFor(totalXp(facts)).level,
    match: targetMatch(facts),
    rank: weeklyRankFor(weeklyXp(facts, clock)),
    badges: user.badges.length,
  };
}

/**
 * What the sample CV must produce (spec 6.2: exactly these eight skills and stars). A fixture here, so these tests check
 * the transitions alone; the real local analyser is checked by brain-cv's own test (9.8 check 4), and the seeds, which
 * run it for real, by seeds.test.ts.
 */
const SAMPLE_LINES = [
  "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.",
  "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.",
  "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.",
  "التواصل، العمل الجماعي، العرض والتقديم.",
  "الإنجليزية: جيد جداً.",
] as const;
const SAMPLE_CV: CvAnalysis = {
  skills: [
    { skill: "excel", stars: 2, evidence: SAMPLE_LINES[1], line: 1 },
    { skill: "sql", stars: 2, evidence: SAMPLE_LINES[2], line: 2 },
    { skill: "statistics", stars: 1, evidence: SAMPLE_LINES[0], line: 0 },
    { skill: "programming", stars: 1, evidence: SAMPLE_LINES[0], line: 0 },
    { skill: "english", stars: 2, evidence: SAMPLE_LINES[4], line: 4 },
    { skill: "communication", stars: 1, evidence: SAMPLE_LINES[3], line: 3 },
    { skill: "presentation", stars: 1, evidence: SAMPLE_LINES[3], line: 3 },
    { skill: "teamwork", stars: 1, evidence: SAMPLE_LINES[3], line: 3 },
  ],
  lines: SAMPLE_LINES,
  engine: "local",
  isSample: true,
};

function ok<T extends { readonly ok: boolean }>(outcome: T): Extract<T, { ok: true }> {
  if (!outcome.ok) throw new Error(`expected ok, got ${JSON.stringify(outcome)}`);
  return outcome as Extract<T, { ok: true }>;
}

function cvTransition(user: UserState, analysis: CvAnalysis, clock: Clock): Transition {
  const done = recordCvAnalysis(user, { analysis, fileName: null }, clock);
  if (done === null) throw new Error("expected a CV transition");
  return done;
}

/** The demo journey of 10.2 up to a step, on pure transitions. */
function journey() {
  const fresh = newUser("خالد", at(0));
  const onboarded = completeOnboarding(fresh, demoAnswers(), at(1));
  const targeted = setTarget(onboarded.user, TARGET, at(2));
  const cv = cvTransition(targeted.user, SAMPLE_CV, at(3));
  const started = ok(startCourse(cv.user, "c-powerbi-1", at(4)));
  const course = ok(completeCourse(started.transition.user, "c-powerbi-1", at(5)));
  const numberBefore = nextApplicationNumber(factsOf(course.transition.user), at(6));
  const applied = ok(
    submitApplication(
      course.transition.user,
      { jobId: TARGET, note: applicationNote(TARGET, factsOf(course.transition.user)), by: "advisor" },
      at(6),
    ),
  );
  return { fresh, onboarded, targeted, cv, started, course, numberBefore, applied };
}

describe("newUser (spec 3.1)", () => {
  it("is a fresh account: level 1, 0 XP, streak 1, default avatar, nothing seen", () => {
    const clock = at(0);
    const user = newUser("  خالد  ", clock);
    expect(user.id).toBe("خالد");
    expect(user.name).toBe("خالد");
    expect(user.avatar).toBe("av-01");
    expect(user.createdDay).toBe("2026-11-18");
    expect(user.activeDays).toEqual(["2026-11-18"]);
    expect(user.createdAt).toBe(clock.now);
    expect(user.lastSignInAt).toBe(clock.now);
    expect(user.targetJobId).toBeNull();
    expect(user.xpEvents).toEqual([]);
    expect(user.badges).toEqual([]);
    expect(user.seen).toEqual(INITIAL_SEEN);
    expect(user.onboarding).toEqual({ thread: [], misses: {}, revealPlayed: false });
    expect(user.advisor).toEqual({ messages: [], jobsDisclosed: false, applyInFlight: null });
    expect(row(user, clock)).toEqual({ xp: 0, level: 1, match: null, rank: 25, badges: 0 });
    expect(streakInfo(user, clock).current).toBe(1);
  });

  it("normalises the account key (4.3): «سارة» = «ساره», «أحمد» = «احمد», Sara = sara", () => {
    expect(newUser("سارة", at(0)).id).toBe(newUser("ساره", at(0)).id);
    expect(newUser("أحمد", at(0)).id).toBe(newUser("احمد", at(0)).id);
    expect(newUser("Sara", at(0)).id).toBe(newUser("sara", at(0)).id);
    expect(newUser("Sara", at(0)).name).toBe("Sara");
  });

  it("changes the avatar and nothing else", () => {
    const user = newUser("خالد", at(0));
    const changed = setAvatar(user, "av-07");
    expect(changed.avatar).toBe("av-07");
    expect(totalXp(changed)).toBe(0);
    expect(setAvatar(changed, "av-07")).toBe(changed);
  });
});

describe("the spec 8.8 / 10.4 walk", () => {
  it("gives the numbers of every row: 50/1/–/23/1 · 80/1/0/22/2 · 180/2/70/18/3 · 380/3/90/10/5 · 420/3/90/10/6 · 660/4/100/6", () => {
    const j = journey();
    expect(row(j.onboarded.user, at(1))).toEqual({ xp: 50, level: 1, match: null, rank: 23, badges: 1 });
    expect(row(j.targeted.user, at(2))).toEqual({ xp: 80, level: 1, match: 0, rank: 22, badges: 2 });
    expect(row(j.cv.user, at(3))).toEqual({ xp: 180, level: 2, match: 70, rank: 18, badges: 3 });
    expect(row(j.course.transition.user, at(5))).toEqual({ xp: 380, level: 3, match: 90, rank: 10, badges: 5 });
    expect(row(j.applied.transition.user, at(6))).toEqual({ xp: 420, level: 3, match: 90, rank: 10, badges: 6 });
    const stats = ok(startCourse(j.applied.transition.user, "c-statistics-2", at(7)));
    const ready = ok(completeCourse(stats.transition.user, "c-statistics-2", at(8)));
    expect(row(ready.transition.user, at(8))).toMatchObject({ xp: 660, level: 4, match: 100, rank: 6 });
    expect(ready.transition.consequence.badges).toEqual(["job-ready"]);
    expect(ready.transition.consequence.xp.gained).toBe(240);
  });

  it("unlocks the badges of 8.8 at each step, in 8.6 order", () => {
    const j = journey();
    expect(j.onboarded.consequence.badges).toEqual(["first-steps"]);
    expect(j.targeted.consequence.badges).toEqual(["goal-set"]);
    expect(j.cv.consequence.badges).toEqual(["cv-scanned"]);
    expect(j.course.transition.consequence.badges).toEqual(["first-course", "top-ten"]);
    expect(j.applied.transition.consequence.badges).toEqual(["first-application"]);
    expect(j.applied.transition.user.badges.map((b) => b.id)).toEqual([
      "first-steps",
      "goal-set",
      "cv-scanned",
      "first-course",
      "top-ten",
      "first-application",
    ]);
  });

  it("onboarding: +50, first-steps; target: +30, goal-set, match null → 0", () => {
    const j = journey();
    expect(j.onboarded.consequence.xp).toMatchObject({ gained: 50, before: 0, after: 50 });
    expect(j.onboarded.consequence.xp.events.map((e) => e.id)).toEqual(["onboarding_completed"]);
    expect(j.onboarded.user.onboardingCompletedAt).toBe(at(1).now);
    expect(j.onboarded.user.answers).toEqual(demoAnswers());
    expect(j.targeted.consequence.xp).toMatchObject({ gained: 30, before: 50, after: 80 });
    expect(j.targeted.consequence.match).toEqual({ before: null, after: { jobId: TARGET, value: 0 } });
    expect(j.targeted.consequence.rank).toEqual({ before: 23, after: 22, weeklyXpBefore: 50, weeklyXpAfter: 80 });
  });

  it("CV consequence: +100, level 1 → 2, match 0 → 70, rank 22 → 18, [cv-scanned], 11 stars", () => {
    const { cv } = journey();
    const c = cv.consequence;
    expect(c.xp).toMatchObject({ gained: 100, before: 80, after: 180 });
    expect(c.level).toEqual({ before: 1, after: 2 });
    expect(c.match).toEqual({ before: { jobId: TARGET, value: 0 }, after: { jobId: TARGET, value: 70 } });
    expect(c.rank).toMatchObject({ before: 22, after: 18 });
    expect(c.badges).toEqual(["cv-scanned"]);
    expect(c.stars.reduce((sum, s) => sum + s.after - s.before, 0)).toBe(11);
    expect(c.stars).toHaveLength(8);
    expect(cv.user.cv).toMatchObject({ fileName: null, isSample: true, engine: "local", analysedAt: at(3).now });
    expect(cv.user.cvDocument?.lines).toEqual(SAMPLE_CV.lines);
  });

  it("course consequence: +200, 2 → 3, 70 → 90, Power BI 0 → 1, 18 → 10, [first-course, top-ten]", () => {
    const { started, course } = journey();
    expect(started.already).toBe(false);
    expect(started.transition.consequence.xp.gained).toBe(0);
    const c = course.transition.consequence;
    expect(c.xp).toMatchObject({ gained: 200, before: 180, after: 380 });
    expect(c.xp.events.map((e) => e.id)).toEqual(["course_completed:c-powerbi-1"]);
    expect(c.level).toEqual({ before: 2, after: 3 });
    expect(c.match).toEqual({ before: { jobId: TARGET, value: 70 }, after: { jobId: TARGET, value: 90 } });
    expect(c.stars).toEqual([{ skill: "powerbi", before: 0, after: 1 }]);
    expect(c.rank).toMatchObject({ before: 18, after: 10 });
    expect(c.badges).toEqual(["first-course", "top-ten"]);
    expect(course.onPath).toMatchObject({ jobId: TARGET, stageN: 7, prep: false, gain: 20, matchNow: 70, matchAfter: 90 });
    const progress = course.transition.user.courses["c-powerbi-1"];
    expect(progress?.ticked).toEqual([1, 2, 3, 4, 5]);
    expect(progress?.completedAt).toBe(at(5).now);
  });

  it("application consequence: +40, rank 10 → 10, [first-application]; DL-2026-0001 = nextApplicationNumber before the call", () => {
    const { applied, numberBefore } = journey();
    expect(numberBefore).toBe("DL-2026-0001");
    expect(applied.application).toMatchObject({
      jobId: TARGET,
      number: numberBefore,
      sentAt: at(6).now,
      matchAtSend: 90,
      note: DEMO_NOTE,
      xpPaid: 40,
      by: "advisor",
      manualStatus: null,
      pinned: false,
    });
    const c = applied.transition.consequence;
    expect(c.xp).toMatchObject({ gained: 40, before: 380, after: 420 });
    expect(c.rank).toMatchObject({ before: 10, after: 10 });
    expect(c.badges).toEqual(["first-application"]);
    expect(applicationStatus(applied.application, at(6).now)).toBe("sent");
  });

  it("refuses a second application to the same job and writes nothing", () => {
    const { applied } = journey();
    const again = submitApplication(applied.transition.user, { jobId: TARGET, note: "x", by: "user" }, at(9));
    expect(again).toEqual({ ok: false, reason: "already_applied" });
    expect(applied.transition.user.applications).toHaveLength(1);
  });

  it("numbers the second application DL-2026-0002", () => {
    const { applied } = journey();
    const user = applied.transition.user;
    const expected = nextApplicationNumber(factsOf(user), at(9));
    const second = ok(submitApplication(user, { jobId: "business-analyst-riyadh", note: "x", by: "user" }, at(9)));
    expect(second.application.number).toBe(expected);
    expect(expected).toBe("DL-2026-0002");
  });

  it("other order: skipping the application → 620, level 4, rank 7", () => {
    const { course } = journey();
    const stats = ok(startCourse(course.transition.user, "c-statistics-2", at(7)));
    const done = ok(completeCourse(stats.transition.user, "c-statistics-2", at(8)));
    expect(row(done.transition.user, at(8))).toMatchObject({ xp: 620, level: 4, match: 100, rank: 7 });
  });

  it("other order: applying at 70% first → 220 rank 16, then the course → 420, level 3, rank 10", () => {
    const { cv } = journey();
    const applied = ok(submitApplication(cv.user, { jobId: TARGET, note: "x", by: "user" }, at(4)));
    expect(applied.application.matchAtSend).toBe(70);
    expect(applied.application.xpPaid).toBe(40);
    expect(row(applied.transition.user, at(4))).toMatchObject({ xp: 220, rank: 16 });
    const started = ok(startCourse(applied.transition.user, "c-powerbi-1", at(5)));
    const done = ok(completeCourse(started.transition.user, "c-powerbi-1", at(6)));
    expect(row(done.transition.user, at(6))).toMatchObject({ xp: 420, level: 3, rank: 10 });
    expect(done.transition.consequence.rank).toMatchObject({ before: 16, after: 10 });
  });

  it("pays nothing for an application under 60%, and still unlocks first-application", () => {
    const { targeted } = journey();
    const applied = ok(submitApplication(targeted.user, { jobId: TARGET, note: "x", by: "user" }, at(3)));
    expect(applied.application.matchAtSend).toBe(0);
    expect(applied.application.xpPaid).toBe(0);
    expect(applied.transition.consequence.xp.gained).toBe(0);
    expect(applied.transition.consequence.xp.events).toEqual([]);
    expect(applied.transition.consequence.badges).toEqual(["first-application"]);
  });
});

describe("news is written un-announced (3.15)", () => {
  it("writes every gain, the course's included, and every badge announced: false", () => {
    const { applied } = journey();
    const user = applied.transition.user;
    expect(user.xpEvents).toHaveLength(5);
    expect(user.xpEvents.every((e) => !e.announced)).toBe(true);
    expect(user.badges.every((b) => !b.announced)).toBe(true);
  });

  it("markAnnounced with a consequence's ids clears exactly those", () => {
    const { course, applied } = journey();
    const c = course.transition.consequence;
    const marked = markAnnounced(applied.transition.user, { xp: c.xp.events.map((e) => e.id), badges: c.badges });
    const announced = (ids: readonly { id: string; announced: boolean }[]) => ids.filter((e) => e.announced).map((e) => e.id);
    expect(announced(marked.xpEvents)).toEqual(["course_completed:c-powerbi-1"]);
    expect(announced(marked.badges)).toEqual(["first-course", "top-ten"]);
    expect(markAnnounced(marked, { xp: ["nope"], badges: [] })).toBe(marked);
  });
});

describe("onboarding transitions (3.2, 4)", () => {
  function turn(partial: Partial<OnboardingTurn>): OnboardingTurn {
    return {
      userText: "",
      replies: [],
      answers: {},
      misses: {},
      pending: null,
      chips: null,
      done: false,
      unmapped: null,
      ...partial,
    };
  }

  it("numbers the thread o-0, o-1, … and pays +50 only on the sixth answer", () => {
    let user = appendOnboardingMessages(newUser("خالد", at(0)), ["أهلاً", "في أي مدينة أنت الآن؟"], at(0));
    expect(user.onboarding.thread.map((m) => [m.id, m.from])).toEqual([
      ["o-0", "daleel"],
      ["o-1", "daleel"],
    ]);
    const first = applyOnboardingTurn(
      user,
      turn({ userText: "الرياض", replies: ["تمام، الرياض.", "ما مؤهلك؟"], answers: { city: { value: "riyadh", label: "الرياض" } }, pending: "education" }),
      at(1),
    );
    user = first.user;
    expect(first.consequence.xp.gained).toBe(0);
    expect(user.onboarding.thread.map((m) => m.id)).toEqual(["o-0", "o-1", "o-2", "o-3", "o-4"]);
    expect(user.onboarding.thread[2]).toMatchObject({ from: "user", text: "الرياض" });
    expect(user.answers.city?.value).toBe("riyadh");
    const last = applyOnboardingTurn(user, turn({ userText: "أول وظيفة", replies: ["شكراً"], answers: demoAnswers(), done: true }), at(2));
    expect(last.consequence.xp).toMatchObject({ gained: 50, after: 50 });
    expect(last.consequence.badges).toEqual(["first-steps"]);
    expect(last.user.onboardingCompletedAt).toBe(at(2).now);
    expect(last.user.answers).toEqual(demoAnswers());
    const again = completeOnboarding(last.user, demoAnswers(), at(3));
    expect(again.consequence.xp.gained).toBe(0);
    expect(again.user.onboardingCompletedAt).toBe(at(2).now);
  });

  it("keeps misses as the turn gives them and marks the reveal played once", () => {
    const user = applyOnboardingTurn(newUser("خالد", at(0)), turn({ userText: "؟", misses: { city: 1 } }), at(1)).user;
    expect(user.onboarding.misses).toEqual({ city: 1 });
    const played = markRevealPlayed(user);
    expect(played.onboarding.revealPlayed).toBe(true);
    expect(markRevealPlayed(played)).toBe(played);
  });

  it("pays target_set once: a later target change pays nothing and reports the new match", () => {
    const { cv } = journey();
    const changed = setTarget(cv.user, "business-analyst-riyadh", at(4));
    expect(changed.consequence.xp.gained).toBe(0);
    expect(changed.consequence.badges).toEqual([]);
    expect(changed.consequence.match.before).toEqual({ jobId: TARGET, value: 70 });
    expect(changed.consequence.match.after).toEqual({ jobId: "business-analyst-riyadh", value: 60 });
  });
});

describe("CV transitions (3.6, 8.5)", () => {
  it("saves nothing for an analysis without skills", () => {
    const user = newUser("خالد", at(0));
    expect(recordCvAnalysis(user, { analysis: { skills: [], lines: ["x"], engine: "local", isSample: false }, fileName: "cv.pdf" }, at(1))).toBeNull();
  });

  it("a second analysis pays nothing, replaces CV stars and keeps course stars", () => {
    const { course } = journey();
    const before = skillStars(course.transition.user);
    expect(before.powerbi).toBe(1);
    expect(before.excel).toBe(2);
    const analysis: CvAnalysis = {
      skills: [{ skill: "excel", stars: 1, evidence: "Excel", line: 0 }],
      lines: ["Excel"],
      engine: "local",
      isSample: false,
    };
    const again = cvTransition(course.transition.user, analysis, at(6));
    const after = skillStars(again.user);
    expect(after.powerbi).toBe(1);
    expect(after.excel).toBe(1);
    expect(after.sql).toBe(0);
    expect(again.consequence.xp.gained).toBe(0);
    expect(again.user.cv?.fileName).toBeNull();
    expect(again.user.cv?.analysedAt).toBeGreaterThan(course.transition.user.cv?.analysedAt ?? Infinity);
    expect(again.user.cvDocument?.lines).toEqual(["Excel"]);
  });

  it("skipCv clears the gate without XP", () => {
    const { targeted } = journey();
    const skipped = skipCv(targeted.user, at(3));
    expect(skipped.user.cvSkipped).toBe(true);
    expect(skipped.consequence.xp.gained).toBe(0);
  });
});

describe("course transitions (3.10, 3.11)", () => {
  it("refuses locked, credited and completed courses, and answers already for a started one", () => {
    const { cv, course } = journey();
    const locked = startCourse(cv.user, "c-powerbi-2", at(4));
    expect(locked).toMatchObject({ ok: false, reason: "locked", lock: { kind: "previous-star", skill: "powerbi" } });
    expect(startCourse(cv.user, "c-excel-1", at(4))).toEqual({ ok: false, reason: "credited" });
    expect(startCourse(course.transition.user, "c-powerbi-1", at(6))).toEqual({ ok: false, reason: "completed" });
    const started = ok(startCourse(cv.user, "c-powerbi-1", at(4)));
    const twice = ok(startCourse(started.transition.user, "c-powerbi-1", at(5)));
    expect(twice.already).toBe(true);
    expect(twice.transition.user.courses["c-powerbi-1"]?.startedAt).toBe(at(4).now);
  });

  it("refuses to complete a course that is not started, or already completed", () => {
    const { cv, course } = journey();
    expect(completeCourse(cv.user, "c-powerbi-1", at(4))).toEqual({ ok: false, reason: "not_started" });
    expect(completeCourse(course.transition.user, "c-powerbi-1", at(6))).toEqual({ ok: false, reason: "completed" });
    expect(completeCourse(cv.user, "c-excel-1", at(4))).toEqual({ ok: false, reason: "credited" });
  });

  it("ticks and unticks lessons of a started course only, within the course", () => {
    const { started, cv } = journey();
    let user = started.transition.user;
    user = tickLesson(user, "c-powerbi-1", 2, true);
    user = tickLesson(user, "c-powerbi-1", 1, true);
    expect(user.courses["c-powerbi-1"]?.ticked).toEqual([1, 2]);
    expect(tickLesson(user, "c-powerbi-1", 2, true)).toBe(user);
    expect(tickLesson(user, "c-powerbi-1", 6, true)).toBe(user);
    expect(tickLesson(user, "c-powerbi-1", 0, true)).toBe(user);
    user = tickLesson(user, "c-powerbi-1", 1, false);
    expect(user.courses["c-powerbi-1"]?.ticked).toEqual([2]);
    expect(tickLesson(cv.user, "c-powerbi-1", 1, true)).toBe(cv.user);
    expect(totalXp(user)).toBe(180);
  });
});

describe("applications (7.4, 7.5)", () => {
  it("moves an application to its next status with the simulation control", () => {
    const { applied } = journey();
    const now = at(6).now;
    const moved = advanceApplication(applied.transition.user, TARGET, at(6));
    const app = moved.applications[0];
    expect(app?.manualStatus).toBe("review");
    expect(app && applicationStatus(app, now)).toBe("review");
    const shortlisted = advanceApplication(moved, TARGET, at(6));
    expect(shortlisted.applications[0]?.manualStatus).toBe("shortlisted");
    expect(advanceApplication(shortlisted, TARGET, at(6))).toBe(shortlisted);
    expect(advanceApplication(shortlisted, "qa-tester-dammam", at(6))).toBe(shortlisted);
  });

  it("records the CV line of the sample CV", () => {
    const { applied } = journey();
    expect(applied.application.cvLine).toBe("مرفقة: السيرة التجريبية");
  });
});

describe("«دليل» applying: the in-flight marker (7.4)", () => {
  const LINE = "لم يكتمل التقديم. اطلبه مرة أخرى إن أحببت.";

  it("an interrupted run appends the line once and clears the marker", () => {
    const { course } = journey();
    const marked = setApplyInFlight(course.transition.user, TARGET, at(6));
    expect(marked.advisor.applyInFlight).toEqual({ jobId: TARGET, startedAt: at(6).now });
    const resolved = resolveInterruptedApply(marked, at(7), LINE);
    expect(resolved.interrupted).toBe(true);
    expect(resolved.user.advisor.applyInFlight).toBeNull();
    expect(resolved.user.advisor.messages).toEqual([
      { id: `interrupted-${at(6).now}`, from: "daleel", at: at(7).now, blocks: [LINE], cards: [], chips: [] },
    ]);
    const again = resolveInterruptedApply(resolved.user, at(8), LINE);
    expect(again.interrupted).toBe(false);
    expect(again.user).toBe(resolved.user);
  });

  it("a run that reached step 5 (the record exists) only clears the marker", () => {
    const { course } = journey();
    const marked = setApplyInFlight(course.transition.user, TARGET, at(6));
    const sent = ok(submitApplication(marked, { jobId: TARGET, note: DEMO_NOTE, by: "advisor" }, at(6)));
    expect(sent.transition.user.advisor.applyInFlight).toBeNull();
    const kept = setApplyInFlight(sent.transition.user, TARGET, at(6));
    const resolved = resolveInterruptedApply(kept, at(7), LINE);
    expect(resolved.interrupted).toBe(false);
    expect(resolved.user.advisor.applyInFlight).toBeNull();
    expect(resolved.user.advisor.messages).toEqual([]);
  });

  it("clears the marker on request", () => {
    const marked = setApplyInFlight(newUser("خالد", at(0)), TARGET, at(1));
    expect(setApplyInFlight(marked, null, at(2)).advisor.applyInFlight).toBeNull();
  });
});

describe("advisor thread (3.14)", () => {
  function message(id: string, from: "user" | "daleel", jobCard = false): AdvisorMessage {
    return { id, from, at: 1, blocks: [id], cards: jobCard ? [{ kind: "job", jobId: TARGET }] : [], chips: [] };
  }

  it("keeps the last 40, skips repeated ids, and marks jobs disclosed on a «دليل» job card", () => {
    expect(ADVISOR_THREAD_LIMIT).toBe(LIMITS.threadMessages);
    let user = newUser("خالد", at(0));
    user = appendAdvisorMessages(user, [message("u1", "user", true)]);
    expect(user.advisor.jobsDisclosed).toBe(false);
    user = appendAdvisorMessages(user, [message("d1", "daleel", true)]);
    expect(user.advisor.jobsDisclosed).toBe(true);
    expect(appendAdvisorMessages(user, [message("d1", "daleel")])).toBe(user);
    const many = Array.from({ length: 45 }, (_, i) => message(`m${i}`, i % 2 === 0 ? "user" : "daleel"));
    user = appendAdvisorMessages(user, many);
    expect(user.advisor.messages).toHaveLength(40);
    expect(user.advisor.messages[0]?.id).toBe("m5");
    expect(user.advisor.messages[39]?.id).toBe("m44");
    const cleared = clearAdvisorThread(user);
    expect(cleared.advisor.messages).toEqual([]);
    expect(cleared.advisor.jobsDisclosed).toBe(false);
  });
});

describe("days: streak and daily reward (8.4)", () => {
  it("offers nothing on the creation day, +1 on the next day, a reset after a break, the 100 cap", () => {
    const created = newUser("خالد", at(0, 10));
    const sameDay = touchDay(created, at(5, 10));
    expect(sameDay.firstLoadToday).toBe(false);
    expect(sameDay.daily.due).toBe(false);
    expect(sameDay.transition.user).toBe(created);
    expect(claimDailyReward(created, at(5, 10))).toBeNull();

    const day2 = touchDay(created, at(0, 11));
    expect(day2.firstLoadToday).toBe(true);
    expect(day2.transition.consequence.streak).toEqual({ before: 1, after: 2 });
    expect(day2.daily).toMatchObject({ due: true, day: 2, amount: 40 });
    const claim2 = claimDailyReward(day2.transition.user, at(1, 11));
    expect(claim2?.consequence.xp).toMatchObject({ gained: 40, after: 40 });
    expect(claim2?.consequence.xp.events.map((e) => e.id)).toEqual(["daily_reward:2026-11-11"]);
    expect(claim2 && claimDailyReward(claim2.user, at(2, 11))).toBeNull();

    const day3 = touchDay(claim2?.user ?? created, at(0, 12));
    expect(day3.transition.consequence.badges).toEqual(["streak-3"]);
    expect(day3.daily.amount).toBe(60);
    expect(touchDay(day3.transition.user, at(30, 12)).firstLoadToday).toBe(false);

    const afterBreak = touchDay(day3.transition.user, at(0, 15));
    expect(afterBreak.transition.consequence.streak.after).toBe(1);
    expect(afterBreak.daily).toMatchObject({ due: true, day: 1, amount: 20, restarted: true });
    expect(afterBreak.transition.user.badges.map((b) => b.id)).toContain("streak-3");
  });

  it("a claim without a prior touch records today first", () => {
    const created = newUser("خالد", at(0, 10));
    const claim = claimDailyReward(created, at(0, 11));
    expect(claim?.user.activeDays).toEqual(["2026-11-10", "2026-11-11"]);
    expect(claim?.consequence.xp.gained).toBe(40);
    expect(claim && dailyReward(claim.user, at(1, 11)).due).toBe(false);
  });
});

describe("seen markers and the snapshot", () => {
  it("writes one marker; the same value keeps the reference", () => {
    const user = newUser("خالد", at(0));
    const seen = markSeen(user, "leaderboardRank", 18);
    expect(seen.seen.leaderboardRank).toBe(18);
    expect(seen.seen.nudge).toBe(false);
    expect(markSeen(seen, "leaderboardRank", 18)).toBe(seen);
    expect(markSeen(seen, "skillStars", { powerbi: 1 }).seen.skillStars).toEqual({ powerbi: 1 });
  });

  it("stateFromFacts(factsOf(u)) round-trips the facts", () => {
    const { applied } = journey();
    const facts = factsOf(applied.transition.user);
    expect(factsOf(stateFromFacts(facts))).toEqual(facts);
  });

  it("simulating on stateFromFacts gives the same badges as the real state", () => {
    const { cv } = journey();
    const simulated = stateFromFacts(factsOf(cv.user));
    const started = ok(startCourse(simulated, "c-powerbi-1", at(4)));
    const done = ok(completeCourse(started.transition.user, "c-powerbi-1", at(5)));
    const expected: readonly BadgeId[] = ["first-course", "top-ten"];
    expect(done.transition.consequence.badges).toEqual(expected);
  });
});
