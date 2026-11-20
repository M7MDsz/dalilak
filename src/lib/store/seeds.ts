// Owner: store. The named saved states of spec 10.3, produced by running the REAL transitions on the real data (A6),
// never hand-written JSON, so they cannot drift from the rules. Pure: no zustand, no storage.
// Used by `applySeed` (store.ts), by tests, and by brain tests as the persona fixtures.
import type {
  ApplicationStatus,
  AvatarId,
  Clock,
  CourseId,
  JobId,
  OnboardingAnswers,
  PersistedState,
  SeedName,
  UserState,
} from "@/lib/types";
import { analyseCvLocal } from "@/lib/brain/cv";
import { applicationNote } from "@/lib/copy";
import { optionLabel, sampleCvText } from "@/lib/data";
import { makeClock } from "@/lib/engine";

import { EMPTY_STATE } from "./accounts";
import { factsOf } from "./snapshot";
import {
  completeCourse,
  completeOnboarding,
  markAnnounced,
  markRevealPlayed,
  markSeen,
  newUser,
  recordCvAnalysis,
  setAvatar,
  setTarget,
  startCourse,
  submitApplication,
  tickLesson,
  touchDay,
  type Transition,
} from "./transitions";

/** The demo persona of every seed but `fresh` (10.3). */
export const SEED_PERSONA = {
  name: "خالد",
  avatar: "av-01" satisfies AvatarId,
  targetJobId: "data-analyst-riyadh" satisfies JobId,
} as const;

/** The 4.6 worked-example answers: الرياض · بكالوريوس · نظم معلومات إدارية · بدون خبرة بعد · الأرقام والبيانات · أول وظيفة. */
export function demoAnswers(): OnboardingAnswers {
  return {
    city: { value: "riyadh", label: chipLabel("city", "riyadh") },
    education: "bachelor",
    major: { value: "mis", label: chipLabel("major", "mis") },
    experience: "none",
    interest: ["data"],
    priority: "first-job",
  };
}

function chipLabel(question: "city" | "major", option: string): string {
  const label = optionLabel(question, option);
  if (label === null) throw new Error(`seeds: no chip label for ${question}/${option}`);
  return label;
}

// ── Clocks ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** The same moment `days` calendar days later (negative: earlier), on the device's calendar. */
function shiftDays(clock: Clock, days: number): Clock {
  const date = new Date(clock.now);
  date.setDate(date.getDate() + days);
  return makeClock(date);
}

const STEP_MS = 1_000;
const STEP_SLOTS = 16;

/**
 * Clocks for the successive actions of one seed day: the same `today` and `weekStart`, `now` one second apart, ending a
 * few seconds before the base clock (never in the future), never before that day's 00:00 or the week's start. Every event
 * is still "now" for the spec (10.3: weekly XP = total XP), and their order is a real order: lists sorted by time (the
 * profile's history, newest first) read the same as the order the actions ran in.
 */
function stepper(base: Clock): () => Clock {
  const midnight = new Date(base.now);
  midnight.setHours(0, 0, 0, 0);
  const floor = Math.max(base.weekStart, midnight.getTime());
  let index = 0;
  return () => {
    const now = Math.min(base.now, Math.max(floor, base.now - (STEP_SLOTS - index) * STEP_MS));
    index += 1;
    return { ...base, now };
  };
}

// ── The steps of 10.3, as real actions ───────────────────────────────────────────────────────────────────────────

function must(transition: Transition | null, what: string): UserState {
  if (transition === null) throw new Error(`seeds: ${what} changed nothing`);
  return transition.user;
}

function onboarded(next: () => Clock): UserState {
  let user = setAvatar(newUser(SEED_PERSONA.name, next()), SEED_PERSONA.avatar);
  user = completeOnboarding(user, demoAnswers(), next()).user;
  user = markRevealPlayed(user);
  return setTarget(user, SEED_PERSONA.targetJobId, next()).user;
}

function withSampleCv(user: UserState, next: () => Clock): UserState {
  const analysis = analyseCvLocal(sampleCvText(user.name));
  return must(recordCvAnalysis(user, { analysis, fileName: null }, next()), "the sample CV");
}

function withCompletedCourse(user: UserState, courseId: CourseId, next: () => Clock): UserState {
  const started = startCourse(user, courseId, next());
  if (!started.ok) throw new Error(`seeds: ${courseId} cannot start (${started.reason})`);
  const done = completeCourse(started.transition.user, courseId, next());
  if (!done.ok) throw new Error(`seeds: ${courseId} cannot complete (${done.reason})`);
  return done.transition.user;
}

/** Seeds write applications that keep their status until the control is pressed (7.5, 10.3). */
function pinApplication(user: UserState, jobId: JobId, status: ApplicationStatus): UserState {
  return {
    ...user,
    applications: user.applications.map((app) => (app.jobId === jobId ? { ...app, manualStatus: status, pinned: true } : app)),
  };
}

/** course-done + the advisor's application at 90% (pinned at `review`) + statistics ★★ started, lessons 1-2 ticked. */
function midPathFrom(courseDone: UserState, next: () => Clock): UserState {
  const jobId = SEED_PERSONA.targetJobId;
  const sent = submitApplication(
    courseDone,
    { jobId, note: applicationNote(jobId, factsOf(courseDone)), by: "advisor" },
    next(),
  );
  if (!sent.ok) throw new Error(`seeds: application refused (${sent.reason})`);
  const user = pinApplication(sent.transition.user, jobId, "review");
  const started = startCourse(user, "c-statistics-2", next());
  if (!started.ok) throw new Error(`seeds: c-statistics-2 cannot start (${started.reason})`);
  return tickLesson(tickLesson(started.transition.user, "c-statistics-2", 1, true), "c-statistics-2", 2, true);
}

/**
 * Quiet (10.3): every XP event and badge announced; advisor thread empty; the nudge shown; the full map-open played;
 * the leaderboard never visited; catch-up already played for the seed's CV, except in `cv-analysed` (it plays there).
 */
function quiet(user: UserState, seed: SeedName): UserState {
  let out = markAnnounced(user, { xp: user.xpEvents.map((event) => event.id), badges: user.badges.map((badge) => badge.id) });
  out = { ...out, advisor: { messages: [], jobsDisclosed: false, applyInFlight: null } };
  out = markSeen(out, "nudge", true);
  out = markSeen(out, "mapOpenPlayed", true);
  out = markSeen(out, "leaderboardRank", null);
  return markSeen(out, "catchUpForCv", seed === "cv-analysed" ? null : (out.cv?.analysedAt ?? null));
}

function seedUserAt(seed: Exclude<SeedName, "fresh">, clock: Clock): UserState {
  if (seed === "returning") {
    // Created two days ago with the first events; active the day before yesterday and yesterday; the newest events dated
    // yesterday; today not active yet, so the first app-shell load offers the daily reward of day 3 (10.3).
    const dayBefore = stepper(shiftDays(clock, -2));
    const yesterday = stepper(shiftDays(clock, -1));
    let user = withSampleCv(onboarded(dayBefore), dayBefore);
    user = touchDay(user, yesterday()).transition.user;
    user = withCompletedCourse(user, "c-powerbi-1", yesterday);
    return midPathFrom(user, yesterday);
  }
  const next = stepper(clock);
  let user = onboarded(next);
  if (seed === "onboarded") return user;
  user = withSampleCv(user, next);
  if (seed === "cv-analysed") return user;
  user = withCompletedCourse(user, "c-powerbi-1", next);
  if (seed === "course-done") return user;
  if (seed === "job-ready") return withCompletedCourse(user, "c-statistics-2", next);
  return midPathFrom(user, next);
}

/** The seed's account (quiet), or null for `fresh`. Brain tests use it as the persona fixture. */
export function seedUser(name: SeedName, clock: Clock): UserState | null {
  if (name === "fresh") return null;
  return quiet(seedUserAt(name, clock), name);
}

/**
 * The persisted state for a seed, at `clock`:
 * - fresh: { currentUserId: null, users: {} }.
 * - every other seed: one account «خالد», avatar av-01, the onboarding answers of 4.6 (completeOnboarding), target
 *   data-analyst-riyadh (setTarget), and per the 10.3 table: the sample CV analysed by the LOCAL analyser of brain-cv
 *   (`analyseCvLocal(sampleCvText("خالد"))`), courses started/completed, the mid-path application (DL-2026-0001,
 *   by advisor, match 90, pinned at `review`), `returning` backdated (created two days ago, active the day before
 *   yesterday and yesterday, its older XP events dated one and two days ago).
 * - quiet: every XP event and badge announced; advisor thread empty; seen.nudge true; seen.mapOpenPlayed true;
 *   leaderboard never visited (seen.leaderboardRank null); cv-analysed only: seen.catchUpForCv null (catch-up plays).
 */
export function buildSeed(name: SeedName, clock: Clock): PersistedState {
  const user = seedUser(name, clock);
  if (user === null) return EMPTY_STATE;
  return { currentUserId: user.id, users: { [user.id]: user } };
}
