// Owner: data (written in full by the architect: these are the spec's numbers, not content).
// Game constants of spec 7, 8 and 9. Every rule in the engine reads its numbers from here, and the advisor's number
// check (spec 5.5 rule 8) treats them as "product constants". Pure module.

/** Spec 8.1: fixed XP per event. Course XP = PER_COURSE_HOUR × hours; daily = min(DAILY_CAP, DAILY_PER_DAY × day). */
export const XP = {
  onboarding_completed: 50,
  target_set: 30,
  cv_analysed: 100,
  job_applied: 40,
  perCourseHour: 20,
  dailyPerDay: 20,
  dailyCap: 100,
} as const;

/** Spec 7.2 / 7.4 / 8.1: under this match an application pays no XP and needs a second yes; the apply sheet warns. */
export const MATCH_LINE = 60;

/** Spec 7.2: every job requires exactly five skills, each worth this many points. */
export const POINTS_PER_SKILL = 20;

/** Spec 8.2: lessons per course by its hours. */
export const LESSONS_BY_HOURS = { 6: 3, 8: 4, 10: 5, 12: 5, 14: 6, 16: 6 } as const satisfies Record<number, number>;

/** Spec 8.3: level thresholds (the titles live in levels.ts). */
export const LEVEL_THRESHOLDS = [0, 150, 350, 600, 1000, 1600, 2500] as const;

/** Spec 8.6 counted rules. */
export const BADGE_RULES = {
  fiveCourses: 5,
  streak3: 3,
  streak7: 7,
  tenSkills: 10,
  level5: 5,
  jobReadyMatch: 100,
  topTenRank: 10,
} as const;

/** Spec 7.5: seconds since sending → status. */
export const APPLICATION_TIMING = {
  /** 0 to 30 s: sent. */
  reviewAfterMs: 30_000,
  /** After 2 min: shortlisted (match when sent ≥ MATCH_LINE) or closed. */
  resultAfterMs: 120_000,
  /** /applications recomputes statuses this often while open. */
  refreshMs: 5_000,
} as const;

/** Spec 7.4 / v3 item 2: «DL-2026-0001». */
export const APPLICATION_PREFIX = "DL";

/** Spec 8.7: 24 sample users + the signed-in user. */
export const LEADERBOARD_SIZE = 25;

/** Spec 9.8 checks and the advisor's counted facts (5.5 rule 8 "product constants"). */
export const CATALOGUE_COUNTS = {
  fields: 7,
  skills: 38,
  starSlots: 59,
  courses: 59,
  courseHours: 566,
  jobs: 20,
  badges: 12,
  levels: 7,
  leaderboardUsers: 24,
  avatars: 12,
} as const;

/** Spec 2.6: the advisor nudge hides after this. */
export const NUDGE_MS = 8_000;

/** Spec 3.15: overlay timings. */
export const OVERLAY_TIMING = {
  xpToastMs: 3_500,
  badgeToastMs: 5_000,
  levelUpDelayMs: 600,
  levelUpAutoCloseMs: 4_000,
  maxToasts: 3,
} as const;

/** Spec 3.2 / 4.5: «دليل» "thinks" for 350-600 ms before each onboarding reply; phase 2 starts 1.2 s after the closing line. */
export const ONBOARDING_TIMING = { thinkMinMs: 350, thinkMaxMs: 600, closingHoldMs: 1_200 } as const;

/** Spec 4.7: the path-reveal sequence, 7.8 s in total. */
export const REVEAL_SEQUENCE = [
  { id: "answers-gather", ms: 1_200 },
  { id: "jobs-sweep", ms: 1_500 },
  { id: "skills-map", ms: 1_500 },
  { id: "narrow-to-three", ms: 1_300 },
  { id: "path-draw", ms: 1_500 },
  { id: "reveal-landing", ms: 800 },
] as const;

/** Spec 6.3: the CV analysis show, 7.0 s in total. `cv-show-stage` data-value is the id. */
export const CV_SHOW_STAGES = [
  { id: "read", ms: 1_200 },
  { id: "extract", ms: 1_600 },
  { id: "evidence", ms: 1_200 },
  { id: "level", ms: 1_200 },
  { id: "match", ms: 1_200 },
  { id: "done", ms: 600 },
] as const;
export type CvShowStageId = (typeof CV_SHOW_STAGES)[number]["id"];

/** Spec 3.11: the completion celebration's beats (5.0 s when all seven show; a beat that does not apply is skipped). */
export const CELEBRATION_BEATS = [
  { id: "course", ms: 500 },
  { id: "xp", ms: 700 },
  { id: "star", ms: 700 },
  { id: "match", ms: 1_600 },
  { id: "level", ms: 600 },
  { id: "badges", ms: 500 },
  { id: "rank", ms: 400 },
] as const;
export type CelebrationBeatId = (typeof CELEBRATION_BEATS)[number]["id"];

/** Spec 7.4: «دليل» applying, 7.2 s; the record is written at the start of step 5. */
export const ADVISOR_APPLY_STEPS = [
  { step: 1, ms: 500 },
  { step: 2, ms: 1_200 },
  { step: 3, ms: 700 },
  { step: 4, ms: 2_000 },
  { step: 5, ms: 1_600 },
  { step: 6, ms: 1_200 },
] as const;

/**
 * The other sites «دليل» applies on after the in-app send (Mohammed, 18 Nov 2026: "for demoing i want to show that he
 * will apply for in multiple sites"). A SIMULATION, labelled so on screen: nothing is sent to these sites. Names only
 * (no logos, no look-alike pages). Every application «دليل» sends (`by: "advisor"`) went to all of them; one the user
 * sent by hand went to Dalilak only, so no field is stored for it.
 */
export const APPLY_SITES = [
  { id: "linkedin", name: "LinkedIn" },
  { id: "bayt", name: "بيت.كوم" },
  { id: "indeed", name: "Indeed" },
  { id: "company", name: "موقع الجهة" },
] as const;
export type ApplySiteId = (typeof APPLY_SITES)[number]["id"];
/** One site of the run: «يعبّي…» then «أُرسل» (the whole sites step is APPLY_SITES.length × this). */
export const APPLY_SITE_MS = 560;

/** Spec 3.8: «جارٍ الإرسال…» when the user sends the sheet by hand. */
export const MANUAL_SEND_MS = 1_200;

/** v3 3.4: `map-open` lengths. */
export const MAP_OPEN = { fullMinMs: 2_600, fullMaxMs: 3_800, shortMaxMs: 1_200, catchUpMs: 2_400 } as const;
