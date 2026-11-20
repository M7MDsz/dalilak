// Owner: engine. Fixtures for the engine's own tests (not exported from "@/lib/engine"; imported by *.test.ts only).
// Facts are built by hand from the spec (4.6 answers, the 6.2 table of the sample CV's eight skills), so the engine is
// tested on its own rules; the store tests the same walk through its real transitions.
import type {
  Application,
  CourseId,
  CvSkill,
  DayKey,
  JobId,
  OnboardingAnswers,
  UnlockedBadge,
  UserFacts,
  XpEvent,
  XpEventType,
} from "@/lib/types";

import { makeClock } from "./clock";
import { xpEventId } from "./xp";

/** Wednesday 18 Nov 2026, 21:00 local: the demo's evening. The week started on Sunday 15 Nov 00:00. */
export const T0 = new Date(2026, 10, 18, 21, 0, 0, 0);
export const CLOCK = makeClock(T0);
export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

/** A clock `minutes` after T0. */
export function clockAt(minutes: number) {
  return makeClock(new Date(T0.getTime() + minutes * MINUTE));
}

/** Spec 4.6 / 10.2 step 2: الرياض · بكالوريوس · نظم معلومات إدارية · بدون خبرة بعد · الأرقام والبيانات · أول وظيفة بأسرع وقت. */
export const DEMO_ANSWERS: OnboardingAnswers = {
  city: { value: "riyadh", label: "الرياض" },
  education: "bachelor",
  major: { value: "mis", label: "نظم معلومات إدارية" },
  experience: "none",
  interest: ["data"],
  priority: "first-job",
};

const EDUCATION_LINE = "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.";
const SKILLS_LINE = "التواصل، العمل الجماعي، العرض والتقديم.";

/** Spec 6.2: what the sample CV must produce, eight skills, eleven stars (line indexes are illustrative). */
export const SAMPLE_CV_SKILLS: readonly CvSkill[] = [
  { skill: "excel", stars: 2, evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.", line: 12 },
  { skill: "sql", stars: 2, evidence: "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.", line: 13 },
  { skill: "statistics", stars: 1, evidence: EDUCATION_LINE, line: 8 },
  { skill: "programming", stars: 1, evidence: EDUCATION_LINE, line: 8 },
  { skill: "english", stars: 2, evidence: "الإنجليزية: جيد جداً.", line: 26 },
  { skill: "communication", stars: 1, evidence: SKILLS_LINE, line: 22 },
  { skill: "presentation", stars: 1, evidence: SKILLS_LINE, line: 22 },
  { skill: "teamwork", stars: 1, evidence: SKILLS_LINE, line: 22 },
];

/** A new account «خالد» created at T0 (no answers, no target). */
export function newFacts(overrides: Partial<UserFacts> = {}): UserFacts {
  return {
    id: "خالد",
    name: "خالد",
    avatar: "av-01",
    createdAt: T0.getTime(),
    createdDay: CLOCK.today,
    answers: {},
    onboardingCompletedAt: null,
    targetJobId: null,
    cv: null,
    cvSkipped: false,
    courses: {},
    xpEvents: [],
    applications: [],
    activeDays: [CLOCK.today],
    badges: [],
    ...overrides,
  };
}

export function xpEvent(type: XpEventType, amount: number, at: number, ref: XpEvent["ref"] = null, announced = false): XpEvent {
  return { id: xpEventId(type, ref), type, amount, at, ref, announced };
}

export function addEvent(facts: UserFacts, event: XpEvent): UserFacts {
  return { ...facts, xpEvents: [...facts.xpEvents, event] };
}

/** Onboarding done (+50) with the demo answers, at `at`. */
export function onboarded(facts: UserFacts, at: number, answers: OnboardingAnswers = DEMO_ANSWERS): UserFacts {
  return addEvent({ ...facts, answers, onboardingCompletedAt: at }, xpEvent("onboarding_completed", 50, at));
}

/** First target (+30). */
export function targeted(facts: UserFacts, jobId: JobId, at: number): UserFacts {
  const paid = facts.xpEvents.some((e) => e.type === "target_set");
  const next = { ...facts, targetJobId: jobId };
  return paid ? next : addEvent(next, xpEvent("target_set", 30, at));
}

/** A CV record (+100 on the first one). */
export function withCv(facts: UserFacts, at: number, skills: readonly CvSkill[] = SAMPLE_CV_SKILLS, isSample = true): UserFacts {
  const paid = facts.xpEvents.some((e) => e.type === "cv_analysed");
  const next: UserFacts = { ...facts, cv: { fileName: null, isSample, engine: "local", analysedAt: at, skills } };
  return paid ? next : addEvent(next, xpEvent("cv_analysed", 100, at));
}

export function started(facts: UserFacts, courseId: CourseId, at: number, ticked: readonly number[] = []): UserFacts {
  return { ...facts, courses: { ...facts.courses, [courseId]: { startedAt: at, ticked, completedAt: null } } };
}

/** A course completed at `at` (started a minute before unless already started), paying `xp`. */
export function completed(facts: UserFacts, courseId: CourseId, at: number, xp: number): UserFacts {
  const progress = facts.courses[courseId];
  const startedAt = progress?.startedAt ?? at - MINUTE;
  const next: UserFacts = { ...facts, courses: { ...facts.courses, [courseId]: { startedAt, ticked: [1, 2, 3, 4, 5], completedAt: at } } };
  return addEvent(next, xpEvent("course_completed", xp, at, courseId));
}

export function application(jobId: JobId, sentAt: number, matchAtSend: number, overrides: Partial<Application> = {}): Application {
  return {
    jobId,
    number: "DL-2026-0001",
    sentAt,
    matchAtSend,
    note: "",
    cvLine: "مرفقة: السيرة التجريبية",
    xpPaid: matchAtSend >= 60 ? 40 : 0,
    by: "advisor",
    manualStatus: null,
    pinned: false,
    ...overrides,
  };
}

/** An application (+40 when the match is 60% or more). */
export function applied(facts: UserFacts, jobId: JobId, at: number, matchAtSend: number): UserFacts {
  const app = application(jobId, at, matchAtSend, { number: `DL-2026-${String(facts.applications.length + 1).padStart(4, "0")}` });
  const next: UserFacts = { ...facts, applications: [...facts.applications, app] };
  return matchAtSend >= 60 ? addEvent(next, xpEvent("job_applied", 40, at, jobId)) : next;
}

export function withBadges(facts: UserFacts, ids: readonly UnlockedBadge["id"][], at: number, announced = false): UserFacts {
  const have = new Set(facts.badges.map((b) => b.id));
  const added = ids.filter((id) => !have.has(id)).map((id) => ({ id, at, announced }));
  return { ...facts, badges: [...facts.badges, ...added] };
}

/** Every XP event and badge marked announced (a "quiet" state, like the seeds). */
export function quiet(facts: UserFacts): UserFacts {
  return {
    ...facts,
    xpEvents: facts.xpEvents.map((e) => ({ ...e, announced: true })),
    badges: facts.badges.map((b) => ({ ...b, announced: true })),
  };
}

export function withDays(facts: UserFacts, days: readonly DayKey[]): UserFacts {
  return { ...facts, activeDays: [...days].sort() };
}

/** The `cv-analysed` state of 10.3 (quiet): onboarded, target data analyst, the sample CV. */
export function cvAnalysedFacts(): UserFacts {
  const t = T0.getTime();
  let f = onboarded(newFacts(), t + MINUTE);
  f = targeted(f, "data-analyst-riyadh", t + 2 * MINUTE);
  f = withCv(f, t + 3 * MINUTE);
  return quiet(f);
}

/** The `course-done` state of 10.3 (quiet). */
export function courseDoneFacts(): UserFacts {
  return quiet(completed(cvAnalysedFacts(), "c-powerbi-1", T0.getTime() + 5 * MINUTE, 200));
}
