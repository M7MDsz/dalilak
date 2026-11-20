// Owner: store.
// The PURE state transitions: (UserState, input, Clock) → new UserState + Consequence. No zustand, no storage, no React,
// no Date.now(). The zustand store (store.ts) is a thin wrapper around these; seeds (seeds.ts) run them; the advisor's
// server simulates with them (badges a next step would unlock); the spec 8.8 / 10.4 arithmetic is tested on them.
// Every transition that changes game facts ends in `finalize`, the ONE place where badges are checked (A2, spec 8.6).
// Game rules are never re-implemented here: every number comes from the engine (match, stars, ranks, levels, streaks,
// course states, application numbers and statuses) or from data (XP amounts, the 60% line).
// Imports: types, ids, data, engine, text, copy, and TYPES from @/lib/brain/protocol (a pure type module that imports
// nothing back). Nothing else from src/lib/brain/** (brain-advisor imports this file; a two-way
// edge would be an import cycle): text that comes from «دليلك»'s templates is passed in as a parameter.
import type {
  AdvisorMessage,
  Application,
  AvatarId,
  BadgeId,
  Clock,
  Consequence,
  CourseId,
  CourseProgress,
  CoursePathInfo,
  CvAnalysis,
  CvRecord,
  DailyRewardInfo,
  DayKey,
  JobId,
  LockReason,
  OnboardingAnswers,
  OnboardingMessage,
  SeenMarkers,
  StarChange,
  TargetMatch,
  UnlockedBadge,
  UserState,
  XpEvent,
  XpEventType,
} from "@/lib/types";
import type { OnboardingTurn } from "@/lib/brain/protocol";
import { SKILL_IDS } from "@/lib/ids";
import { MATCH_LINE, XP, getCourse } from "@/lib/data";
import { cvAttachmentLine } from "@/lib/copy";
import {
  badgesEarned,
  courseOnPath,
  courseState,
  courseXp,
  dailyReward,
  defaultAvatar,
  jobMatch,
  levelFor,
  nextApplicationNumber,
  nextApplicationStatus,
  skillStars,
  streakInfo,
  totalXp,
  weeklyRankFor,
  weeklyXp,
  xpEventId,
} from "@/lib/engine";
import { cleanName, normalizeName } from "@/lib/text/normalize";

import { INITIAL_SEEN } from "./snapshot";

/**
 * Messages kept in the saved advisor thread (spec 3.14). Same number as `LIMITS.threadMessages` in protocol.ts (this file
 * may import only TYPES from src/lib/brain; transitions.test.ts checks that the two agree).
 */
export const ADVISOR_THREAD_LIMIT = 40;

export interface Transition {
  readonly user: UserState;
  readonly consequence: Consequence;
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

function hasEvent(user: UserState, id: string): boolean {
  return user.xpEvents.some((event) => event.id === id);
}

/** A new XP event (written announced: false, like every gain: spec 3.15). */
function xpEvent(type: XpEventType, ref: XpEvent["ref"], amount: number, clock: Clock): XpEvent {
  return { id: xpEventId(type, ref), type, amount, at: clock.now, ref, announced: false };
}

function targetOf(user: UserState): TargetMatch | null {
  const jobId = user.targetJobId;
  return jobId === null ? null : { jobId, value: jobMatch(jobId, user) };
}

function withDay(days: readonly DayKey[], day: DayKey): readonly DayKey[] {
  return days.includes(day) ? days : [...days, day].sort();
}

function consequenceBetween(
  before: UserState,
  after: UserState,
  clock: Clock,
  written: readonly XpEvent[],
  badges: readonly BadgeId[],
): Consequence {
  const xpBefore = totalXp(before);
  const xpAfter = totalXp(after);
  const starsBefore = skillStars(before);
  const starsAfter = skillStars(after);
  const stars: StarChange[] = [];
  for (const skill of SKILL_IDS) {
    if (starsBefore[skill] !== starsAfter[skill]) stars.push({ skill, before: starsBefore[skill], after: starsAfter[skill] });
  }
  const weeklyBefore = weeklyXp(before, clock);
  const weeklyAfter = weeklyXp(after, clock);
  return {
    xp: { gained: xpAfter - xpBefore, before: xpBefore, after: xpAfter, events: written },
    level: { before: levelFor(xpBefore).level, after: levelFor(xpAfter).level },
    match: { before: targetOf(before), after: targetOf(after) },
    stars,
    rank: {
      before: weeklyRankFor(weeklyBefore),
      after: weeklyRankFor(weeklyAfter),
      weeklyXpBefore: weeklyBefore,
      weeklyXpAfter: weeklyAfter,
    },
    badges,
    streak: { before: streakInfo(before, clock).current, after: streakInfo(after, clock).current },
  };
}

// ── The one place badges are unlocked ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the Consequence between two states and unlocks every badge whose rule now holds (engine `badgesEarned`), in one
 * place. `written` are the XP events this action added. New badges, like every XP event, are written announced: false;
 * whoever shows them marks them (the overlay queue, or the celebration at its beat 1: spec 3.11, 3.15). Seeds mark
 * everything announced at the end ("quiet"). A badge, once unlocked, is never removed (8.6).
 */
export function finalize(before: UserState, after: UserState, clock: Clock, written: readonly XpEvent[]): Transition {
  const held = new Set<BadgeId>(after.badges.map((badge) => badge.id));
  const unlocked = badgesEarned(after, clock).filter((id) => !held.has(id));
  const user: UserState =
    unlocked.length === 0
      ? after
      : {
          ...after,
          badges: [
            ...after.badges,
            ...unlocked.map((id): UnlockedBadge => ({ id, at: clock.now, announced: false })),
          ],
        };
  return { user, consequence: consequenceBetween(before, user, clock, written, unlocked) };
}

// ── Accounts ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A fresh account (spec 3.1): id = normalizeName(name), name = cleanName(name), avatar = defaultAvatar (9.6), level 1,
 * 0 XP, streak 1 (activeDays = [clock.today], createdDay = clock.today), createdAt = lastSignInAt = clock.now,
 * answers {}, onboardingCompletedAt null, targetJobId null, cv null, cvSkipped false, courses {}, xpEvents [],
 * applications [], badges [], cvDocument null,
 * onboarding { thread: [], misses: {}, revealPlayed: false } (the pending question is derived, never stored),
 * advisor { messages: [], jobsDisclosed: false, applyInFlight: null },
 * seen INITIAL_SEEN (snapshot.ts: mapOpenPlayed false, catchUpForCv / pathMatch / skillStars / leaderboardRank /
 *        profileBadges / jobsMatch null, applicationStatus {}, nudge false).
 * Onboarding message ids are deterministic: `o-${index in the thread}`.
 */
export function newUser(name: string, clock: Clock): UserState {
  const display = cleanName(name);
  return {
    id: normalizeName(display),
    name: display,
    avatar: defaultAvatar(display),
    createdAt: clock.now,
    createdDay: clock.today,
    answers: {},
    onboardingCompletedAt: null,
    targetJobId: null,
    cv: null,
    cvSkipped: false,
    courses: {},
    xpEvents: [],
    applications: [],
    activeDays: [clock.today],
    badges: [],
    lastSignInAt: clock.now,
    onboarding: { thread: [], misses: {}, revealPlayed: false },
    cvDocument: null,
    advisor: { messages: [], jobsDisclosed: false, applyInFlight: null },
    seen: INITIAL_SEEN,
  };
}

/** The avatar picker's «حفظ» (spec 3.13). Pays nothing, unlocks nothing. */
export function setAvatar(user: UserState, avatar: AvatarId): UserState {
  return user.avatar === avatar ? user : { ...user, avatar };
}

// ── Onboarding ───────────────────────────────────────────────────────────────────────────────────────────────────

function onboardingMessage(index: number, from: OnboardingMessage["from"], text: string, clock: Clock): OnboardingMessage {
  return { id: `o-${index}`, from, text, at: clock.now };
}

/** Appends «دليلك»'s lines to the onboarding thread (the greeting on first visit; the re-ask on resume: 3.2). */
export function appendOnboardingMessages(user: UserState, texts: readonly string[], clock: Clock): UserState {
  if (texts.length === 0) return user;
  const thread = user.onboarding.thread;
  const added = texts.map((text, i) => onboardingMessage(thread.length + i, "daleel", text, clock));
  return { ...user, onboarding: { ...user.onboarding, thread: [...thread, ...added] } };
}

/** The facts of the sixth answer: answers, completion time, `onboarding_completed` +50 once (8.1). */
function completedOnboarding(
  user: UserState,
  answers: OnboardingAnswers,
  clock: Clock,
): { readonly after: UserState; readonly written: readonly XpEvent[] } {
  const written = hasEvent(user, xpEventId("onboarding_completed", null))
    ? []
    : [xpEvent("onboarding_completed", null, XP.onboarding_completed, clock)];
  const after: UserState = {
    ...user,
    answers,
    onboardingCompletedAt: user.onboardingCompletedAt ?? clock.now,
    xpEvents: [...user.xpEvents, ...written],
  };
  return { after, written };
}

/**
 * Applies one interpreted turn: thread (user bubble + replies), answers, misses; on `done`, completeOnboarding. The turn's
 * `pending` and `chips` are for the screen only (the pending question is derived from the answers).
 */
export function applyOnboardingTurn(user: UserState, turn: OnboardingTurn, clock: Clock): Transition {
  const thread = user.onboarding.thread;
  const added = [
    onboardingMessage(thread.length, "user", turn.userText, clock),
    ...turn.replies.map((text, i) => onboardingMessage(thread.length + 1 + i, "daleel", text, clock)),
  ];
  const answered: UserState = {
    ...user,
    answers: turn.answers,
    onboarding: { ...user.onboarding, thread: [...thread, ...added], misses: turn.misses },
  };
  if (!turn.done) return finalize(user, answered, clock, []);
  const { after, written } = completedOnboarding(answered, turn.answers, clock);
  return finalize(user, after, clock, written);
}

/** Records the six answers and `onboarding_completed` +50 once (spec 8.1), then badges (first-steps). Seeds call this directly. */
export function completeOnboarding(user: UserState, answers: OnboardingAnswers, clock: Clock): Transition {
  const { after, written } = completedOnboarding(user, answers, clock);
  return finalize(user, after, clock, written);
}

/** Spec 3.3: saved when step 6 of the reveal starts. */
export function markRevealPlayed(user: UserState): UserState {
  return user.onboarding.revealPlayed ? user : { ...user, onboarding: { ...user.onboarding, revealPlayed: true } };
}

// ── Target ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Sets the target. The first target ever pays `target_set` +30 and unlocks goal-set; later changes pay nothing (8.1). */
export function setTarget(user: UserState, jobId: JobId, clock: Clock): Transition {
  const written = hasEvent(user, xpEventId("target_set", null)) ? [] : [xpEvent("target_set", null, XP.target_set, clock)];
  const after: UserState = { ...user, targetJobId: jobId, xpEvents: [...user.xpEvents, ...written] };
  return finalize(user, after, clock, written);
}

// ── CV ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Records a CV analysis with ≥ 1 skill (null for an empty one: nothing is saved, spec 3.6): cv facts + cvDocument; the first
 * such analysis pays `cv_analysed` +100 (8.1); a later one replaces CV stars, never course stars (8.5: course stars are
 * derived from `courses`, which this does not touch). `analysedAt` always moves forward, so the map's catch-up marker
 * (`seen.catchUpForCv`) sees every new analysis.
 */
export function recordCvAnalysis(
  user: UserState,
  input: { readonly analysis: CvAnalysis; readonly fileName: string | null },
  clock: Clock,
): Transition | null {
  const { analysis, fileName } = input;
  if (analysis.skills.length === 0) return null;
  const cv: CvRecord = {
    fileName,
    isSample: analysis.isSample,
    engine: analysis.engine,
    analysedAt: Math.max(clock.now, (user.cv?.analysedAt ?? Number.NEGATIVE_INFINITY) + 1),
    skills: analysis.skills,
  };
  const written = hasEvent(user, xpEventId("cv_analysed", null)) ? [] : [xpEvent("cv_analysed", null, XP.cv_analysed, clock)];
  const after: UserState = {
    ...user,
    cv,
    cvDocument: { lines: analysis.lines },
    xpEvents: [...user.xpEvents, ...written],
  };
  return finalize(user, after, clock, written);
}

/** «ابدأ بدون سيرة»: clears the start gate (3.4). No XP. */
export function skipCv(user: UserState, clock: Clock): Transition {
  return finalize(user, user.cvSkipped ? user : { ...user, cvSkipped: true }, clock, []);
}

// ── Courses ──────────────────────────────────────────────────────────────────────────────────────────────────────

export type StartCourseOutcome =
  | { readonly ok: true; readonly already: boolean; readonly transition: Transition }
  | { readonly ok: false; readonly reason: "locked"; readonly lock: LockReason }
  | { readonly ok: false; readonly reason: "credited" | "completed" };

/** Sets a course to started (3.11). Pays nothing. Already started → ok with already = true and no change. */
export function startCourse(user: UserState, courseId: CourseId, clock: Clock): StartCourseOutcome {
  const info = courseState(courseId, user);
  switch (info.state) {
    case "completed":
      return { ok: false, reason: "completed" };
    case "credited":
      return { ok: false, reason: "credited" };
    case "locked":
      return { ok: false, reason: "locked", lock: info.lock };
    case "started":
      return { ok: true, already: true, transition: finalize(user, user, clock, []) };
    case "available": {
      const after: UserState = {
        ...user,
        courses: { ...user.courses, [courseId]: { startedAt: clock.now, ticked: [], completedAt: null } },
      };
      return { ok: true, already: false, transition: finalize(user, after, clock, []) };
    }
  }
}

/**
 * Ticks or unticks one lesson (1-based) of a started course. Progress only; pays nothing (3.11). A course that is not
 * started, already completed, or a lesson number outside the course leaves the user unchanged (same reference).
 */
export function tickLesson(user: UserState, courseId: CourseId, lesson: number, ticked: boolean): UserState {
  const progress = user.courses[courseId];
  if (!progress || progress.completedAt !== null) return user;
  const total = getCourse(courseId).lessons.length;
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > total) return user;
  if (progress.ticked.includes(lesson) === ticked) return user;
  const next = ticked ? [...progress.ticked, lesson].sort((a, b) => a - b) : progress.ticked.filter((n) => n !== lesson);
  return { ...user, courses: { ...user.courses, [courseId]: { ...progress, ticked: next } } };
}

/**
 * Keeps the certificate link the user pasted for a started or completed course (self-reported, pays nothing). An empty
 * link removes it; a course without progress leaves the user unchanged (same reference).
 */
export function setCertificate(user: UserState, courseId: CourseId, url: string): UserState {
  const progress = user.courses[courseId];
  if (!progress) return user;
  const link = url.trim().slice(0, 500);
  if ((progress.certificateUrl ?? "") === link) return user;
  const next: CourseProgress = { startedAt: progress.startedAt, ticked: progress.ticked, completedAt: progress.completedAt, ...(link === "" ? {} : { certificateUrl: link }) };
  return { ...user, courses: { ...user.courses, [courseId]: next } };
}

export type CompleteCourseOutcome =
  | { readonly ok: true; readonly transition: Transition; readonly onPath: CoursePathInfo | null }
  | { readonly ok: false; readonly reason: "not_started" | "completed" | "credited" | "locked" };

/**
 * Completes a started course in ONE write (3.11 "Reload"): every lesson ticked, completedAt, `course_completed` 20 × hours,
 * the star, badges. Its XP event and new badges are written announced = false like every gain; the learn page marks them
 * announced when the celebration's beat 1 shows (it holds `celebration` before calling the store action, 3.15).
 * `onPath` is computed BEFORE completion (the stage it was, its gain and matchAfter).
 */
export function completeCourse(user: UserState, courseId: CourseId, clock: Clock): CompleteCourseOutcome {
  const info = courseState(courseId, user);
  switch (info.state) {
    case "completed":
      return { ok: false, reason: "completed" };
    case "credited":
      return { ok: false, reason: "credited" };
    case "locked":
      return { ok: false, reason: "locked" };
    case "available":
      return { ok: false, reason: "not_started" };
    case "started": {
      const onPath = courseOnPath(courseId, user);
      const course = getCourse(courseId);
      const startedAt = user.courses[courseId]?.startedAt ?? clock.now;
      const written = hasEvent(user, xpEventId("course_completed", courseId))
        ? []
        : [xpEvent("course_completed", courseId, courseXp(course), clock)];
      const after: UserState = {
        ...user,
        courses: {
          ...user.courses,
          [courseId]: { ...user.courses[courseId], startedAt, ticked: course.lessons.map((_, i) => i + 1), completedAt: clock.now },
        },
        xpEvents: [...user.xpEvents, ...written],
      };
      return { ok: true, transition: finalize(user, after, clock, written), onPath };
    }
  }
}

// ── Applications ─────────────────────────────────────────────────────────────────────────────────────────────────

export type SubmitApplicationOutcome =
  | { readonly ok: true; readonly application: Application; readonly transition: Transition }
  | { readonly ok: false; readonly reason: "already_applied" };

/**
 * Writes an application (7.4): number = engine `nextApplicationNumber(user, clock)` (the SAME function the apply_to_job
 * tool uses for `expect.number`), match when sent, the note as given, cvLine, `job_applied` +40 only when the match is
 * ≥ 60 (once per job), badge first-application. A second application to the same job creates nothing.
 * The record IS "sent" (7.4: written at the start of step 5), so «دليلك»'s in-flight marker for this job is cleared here.
 */
export function submitApplication(
  user: UserState,
  input: { readonly jobId: JobId; readonly note: string; readonly by: "user" | "advisor" },
  clock: Clock,
): SubmitApplicationOutcome {
  const { jobId, note, by } = input;
  if (user.applications.some((app) => app.jobId === jobId)) return { ok: false, reason: "already_applied" };
  const match = jobMatch(jobId, user);
  const pays = match >= MATCH_LINE && !hasEvent(user, xpEventId("job_applied", jobId));
  const application: Application = {
    jobId,
    number: nextApplicationNumber(user, clock),
    sentAt: clock.now,
    matchAtSend: match,
    note,
    cvLine: cvAttachmentLine(user.cv),
    xpPaid: pays ? XP.job_applied : 0,
    by,
    manualStatus: null,
    pinned: false,
  };
  const written = pays ? [xpEvent("job_applied", jobId, XP.job_applied, clock)] : [];
  const inFlight = user.advisor.applyInFlight;
  const after: UserState = {
    ...user,
    applications: [...user.applications, application],
    xpEvents: [...user.xpEvents, ...written],
    advisor: inFlight !== null && inFlight.jobId === jobId ? { ...user.advisor, applyInFlight: null } : user.advisor,
  };
  return { ok: true, application, transition: finalize(user, after, clock, written) };
}

/** «محاكاة: انقل للحالة التالية» (7.5): manualStatus = the next status; no-op at shortlisted / closed. */
export function advanceApplication(user: UserState, jobId: JobId, clock: Clock): UserState {
  const app = user.applications.find((a) => a.jobId === jobId);
  if (!app) return user;
  const next = nextApplicationStatus(app, clock.now);
  if (next === null) return user;
  return {
    ...user,
    applications: user.applications.map((a) => (a.jobId === jobId ? { ...a, manualStatus: next } : a)),
  };
}

// ── Days ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** First app-shell load of a day (8.4): adds today to activeDays (streak +1 / reset), badges (streak-3/7). Idempotent per day. */
export function touchDay(
  user: UserState,
  clock: Clock,
): { readonly transition: Transition; readonly firstLoadToday: boolean; readonly daily: DailyRewardInfo } {
  const firstLoadToday = !user.activeDays.includes(clock.today);
  const after: UserState = firstLoadToday ? { ...user, activeDays: withDay(user.activeDays, clock.today) } : user;
  const transition = finalize(user, after, clock, []);
  return { transition, firstLoadToday, daily: dailyReward(transition.user, clock) };
}

/**
 * Pays today's daily reward (`daily_reward:{today}`, min(100, 20 × streak day)) if due; null if not due (8.4). The amount
 * and "due" come from engine `dailyReward`, read after today is in activeDays (a claim without a prior touchDay first
 * records today, so the reward's streak day is always today's).
 */
export function claimDailyReward(user: UserState, clock: Clock): Transition | null {
  const touched: UserState = user.activeDays.includes(clock.today)
    ? user
    : { ...user, activeDays: withDay(user.activeDays, clock.today) };
  const daily = dailyReward(touched, clock);
  if (!daily.due || hasEvent(touched, xpEventId("daily_reward", clock.today))) return null;
  const written = [xpEvent("daily_reward", clock.today, daily.amount, clock)];
  return finalize(user, { ...touched, xpEvents: [...touched.xpEvents, ...written] }, clock, written);
}

// ── Overlay queue and replays ────────────────────────────────────────────────────────────────────────────────────

/** Marks queue entries announced (3.15). Unknown ids are ignored. Nothing to mark → the same reference. */
export function markAnnounced(
  user: UserState,
  ids: { readonly xp?: readonly string[]; readonly badges?: readonly BadgeId[] },
): UserState {
  const xp = new Set(ids.xp ?? []);
  const badges = new Set<BadgeId>(ids.badges ?? []);
  const xpChanges = user.xpEvents.some((event) => !event.announced && xp.has(event.id));
  const badgeChanges = user.badges.some((badge) => !badge.announced && badges.has(badge.id));
  if (!xpChanges && !badgeChanges) return user;
  return {
    ...user,
    xpEvents: xpChanges
      ? user.xpEvents.map((event) => (!event.announced && xp.has(event.id) ? { ...event, announced: true } : event))
      : user.xpEvents,
    badges: badgeChanges
      ? user.badges.map((badge) => (!badge.announced && badges.has(badge.id) ? { ...badge, announced: true } : badge))
      : user.badges,
  };
}

/** Writes one "seen" marker. The same value → the same reference. */
export function markSeen<K extends keyof SeenMarkers>(user: UserState, key: K, value: SeenMarkers[K]): UserState {
  if (Object.is(user.seen[key], value)) return user;
  const seen: SeenMarkers = { ...user.seen, [key]: value };
  return { ...user, seen };
}

// ── Advisor thread ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Appends to the advisor thread, keeps the last 40; sets jobsDisclosed when a «دليلك» message carries at least one job card.
 * A message whose id is already in the thread is skipped (a repeated append, e.g. from a re-mounted component, adds nothing).
 */
export function appendAdvisorMessages(user: UserState, messages: readonly AdvisorMessage[]): UserState {
  const known = new Set(user.advisor.messages.map((message) => message.id));
  const fresh: AdvisorMessage[] = [];
  for (const message of messages) {
    if (known.has(message.id)) continue;
    known.add(message.id);
    fresh.push(message);
  }
  if (fresh.length === 0) return user;
  const jobsDisclosed =
    user.advisor.jobsDisclosed ||
    fresh.some((message) => message.from === "daleel" && message.cards.some((card) => card.kind === "job"));
  return {
    ...user,
    advisor: {
      ...user.advisor,
      messages: [...user.advisor.messages, ...fresh].slice(-ADVISOR_THREAD_LIMIT),
      jobsDisclosed,
    },
  };
}

/** «محادثة جديدة»: empties the thread and resets jobsDisclosed (the in-flight marker is kept). */
export function clearAdvisorThread(user: UserState): UserState {
  if (user.advisor.messages.length === 0 && !user.advisor.jobsDisclosed) return user;
  return { ...user, advisor: { ...user.advisor, messages: [], jobsDisclosed: false } };
}

/** The in-flight marker of «دليلك» applying (7.4). */
export function setApplyInFlight(user: UserState, jobId: JobId | null, clock: Clock): UserState {
  if (jobId === null) {
    return user.advisor.applyInFlight === null ? user : { ...user, advisor: { ...user.advisor, applyInFlight: null } };
  }
  return { ...user, advisor: { ...user.advisor, applyInFlight: { jobId, startedAt: clock.now } } };
}

/**
 * On load (7.4): if applyInFlight is set and no application for that job exists, appends «دليلك»'s message `line` (the
 * caller passes brain/advisor/templates `applyInterruptedLine()`: «لم يكتمل التقديم. اطلبه مرة أخرى إن أحببت.») to the
 * advisor thread, with the id `interrupted-{startedAt}`; clears the marker either way.
 */
export function resolveInterruptedApply(
  user: UserState,
  clock: Clock,
  line: string,
): { readonly user: UserState; readonly interrupted: boolean } {
  const inFlight = user.advisor.applyInFlight;
  if (inFlight === null) return { user, interrupted: false };
  const cleared: UserState = { ...user, advisor: { ...user.advisor, applyInFlight: null } };
  if (user.applications.some((app) => app.jobId === inFlight.jobId)) return { user: cleared, interrupted: false };
  const message: AdvisorMessage = {
    id: `interrupted-${inFlight.startedAt}`,
    from: "daleel",
    at: clock.now,
    blocks: [line],
    cards: [],
    chips: [],
  };
  return { user: appendAdvisorMessages(cleared, [message]), interrupted: true };
}
