// Owner: brain-advisor. Request validation at the route boundary (zod 4; STACK-NOTES 9.2: never trust JSON.parse).
// Unknown ids, wrong shapes and over-long text are rejected or trimmed here (spec 5.5 rule 2, 3.14).
import { z } from "zod";

import {
  APPLICATION_STATUSES,
  AVATAR_IDS,
  BADGE_IDS,
  CITY_OPTIONS,
  COMPANY_OPTIONS,
  COURSE_IDS,
  CURRENT_OPTIONS,
  EDUCATION_OPTIONS,
  EXPERIENCE_OPTIONS,
  FIELD_IDS,
  INTEREST_OPTIONS,
  JOB_CITY_IDS,
  JOB_FIELD_IDS,
  JOB_IDS,
  LEARN_TABS,
  MAJOR_OPTIONS,
  NAV_SCREENS,
  PAGE_CHIP_SLUGS,
  ONBOARDING_STEP_IDS,
  PRIORITY_OPTIONS,
  SKILL_IDS,
  XP_EVENT_TYPES,
} from "@/lib/ids";
import { LIMITS, PROTOCOL_VERSION } from "@/lib/brain/protocol";
import type { AdvisorRequest, OnboardingClassifyRequest, PageContext, ProtocolMessage } from "@/lib/brain/protocol";
import type { ChipPayload, UserSnapshot } from "@/lib/types";

const jobId = z.enum(JOB_IDS);
const courseId = z.enum(COURSE_IDS);
const skillId = z.enum(SKILL_IDS);
const shortText = z.string().max(2_000);
const finite = z.number().finite();
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ── NavTarget and chip payloads (spec 5.4 point 1: a chip is never parsed as text) ────────────────────────────────

const navTarget = z.discriminatedUnion("screen", [
  z.object({ screen: z.literal("path") }),
  z.object({ screen: z.literal("skills"), skill: skillId.optional() }),
  z.object({ screen: z.literal("cv") }),
  z.object({
    screen: z.literal("jobs"),
    q: z.string().max(100).optional(),
    city: z.enum(JOB_CITY_IDS).optional(),
    field: z.enum(JOB_FIELD_IDS).optional(),
    skill: skillId.optional(),
  }),
  z.object({ screen: z.literal("job"), jobId, apply: z.boolean().optional(), focus: z.literal("missing").optional() }),
  z.object({ screen: z.literal("applications") }),
  z.object({ screen: z.literal("learn"), tab: z.enum(LEARN_TABS).optional(), field: z.enum(FIELD_IDS).optional() }),
  z.object({ screen: z.literal("course"), courseId }),
  z.object({ screen: z.literal("leaderboard") }),
  z.object({ screen: z.literal("profile") }),
]);

const chipPayload = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("page"), slug: z.enum(PAGE_CHIP_SLUGS) }),
  z.object({ intent: z.literal("start_course"), courseId }),
  z.object({ intent: z.literal("apply"), jobId, anyway: z.boolean().optional() }),
  z.object({ intent: z.literal("set_target"), jobId }),
  z.object({ intent: z.literal("open"), to: navTarget }),
  z.object({ intent: z.literal("not_now") }),
]);

// ── The snapshot (UserSnapshot = UserFacts, spec 5.2) ──────────────────────────────────────────────────────────────

const answers = z.object({
  city: z.object({ value: z.enum([...CITY_OPTIONS, "none"]), label: z.string().max(60) }).optional(),
  education: z.enum([...EDUCATION_OPTIONS, "unknown"]).optional(),
  major: z.object({ value: z.enum(MAJOR_OPTIONS), label: z.string().max(60) }).optional(),
  experience: z.enum(EXPERIENCE_OPTIONS).optional(),
  interest: z
    .union([z.tuple([z.enum(INTEREST_OPTIONS)]), z.tuple([z.enum(INTEREST_OPTIONS), z.enum(INTEREST_OPTIONS)])])
    .optional(),
  priority: z.enum(PRIORITY_OPTIONS).optional(),
  /** 20 Nov 2026: the company the user has in mind (onboarding step 7), or "none". */
  company: z.enum(COMPANY_OPTIONS).optional(),
  /** 21 Nov 2026: the field the user works in now (asked after «أتطوّر» / «أغيّر»). */
  current: z.object({ value: z.enum(CURRENT_OPTIONS), label: z.string().max(60) }).optional(),
  currentTrack: z.object({ value: z.string().max(60), label: z.string().max(60) }).optional(),
});

const cvRecord = z.object({
  fileName: z.string().max(300).nullable(),
  isSample: z.boolean(),
  engine: z.enum(["local", "model"]),
  analysedAt: finite,
  skills: z
    .array(
      z.object({
        skill: skillId,
        stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        evidence: z.string().max(400),
        line: z.number().int().min(0),
      }),
    )
    .max(SKILL_IDS.length),
});

const courseProgress = z.object({
  startedAt: finite,
  ticked: z.array(z.number().int().min(1).max(10)).max(10),
  completedAt: finite.nullable(),
  certificateUrl: z.string().max(500).optional(),
});

const xpEvent = z.object({
  id: z.string().max(120),
  type: z.enum(XP_EVENT_TYPES),
  amount: finite,
  at: finite,
  ref: z.string().max(80).nullable(),
  announced: z.boolean(),
});

const application = z.object({
  jobId,
  number: z.string().max(40),
  sentAt: finite,
  matchAtSend: finite,
  note: z.string().max(4_000),
  cvLine: z.string().max(400),
  xpPaid: z.union([z.literal(0), z.literal(40)]),
  by: z.enum(["user", "advisor"]),
  manualStatus: z.enum(APPLICATION_STATUSES).nullable(),
  pinned: z.boolean(),
});

const facts = z.object({
  id: z.string().max(120),
  name: z.string().min(1).max(60),
  avatar: z.enum(AVATAR_IDS),
  createdAt: finite,
  createdDay: dayKey,
  answers,
  onboardingCompletedAt: finite.nullable(),
  targetJobId: jobId.nullable(),
  cv: cvRecord.nullable(),
  cvSkipped: z.boolean(),
  courses: z.partialRecord(courseId, courseProgress),
  xpEvents: z.array(xpEvent).max(400),
  applications: z.array(application).max(JOB_IDS.length),
  activeDays: z.array(dayKey).max(2_000),
  badges: z.array(z.object({ id: z.enum(BADGE_IDS), at: finite, announced: z.boolean() })).max(BADGE_IDS.length),
});

const advisorRequest = z.object({
  v: z.literal(PROTOCOL_VERSION),
  message: z.object({ text: z.string().max(10_000), chip: chipPayload.optional() }),
  history: z.array(z.object({ role: z.enum(["user", "daleel"]), text: shortText })).max(200),
  facts,
  clock: z.object({ now: finite, today: dayKey, weekStart: finite }),
  page: z.object({
    route: z.enum(NAV_SCREENS),
    jobId: jobId.optional(),
    courseId: courseId.optional(),
    skillId: skillId.optional(),
    applySheetOpen: z.boolean(),
    showRunning: z.boolean(),
  }),
  thread: z.object({
    jobsDisclosed: z.boolean(),
    lastJobIds: z.array(jobId).max(20),
    lastCourseIds: z.array(courseId).max(20),
  }),
});

/** A valid AdvisorRequest (text trimmed to 500, history to 12), or null → the route answers one `error` event. */
export function parseAdvisorRequest(input: unknown): AdvisorRequest | null {
  const parsed = advisorRequest.safeParse(input);
  if (!parsed.success) return null;
  const r = parsed.data;
  const text = r.message.text.trim().slice(0, LIMITS.advisorMessageChars);
  if (text === "" && r.message.chip === undefined) return null;
  const history: ProtocolMessage[] = r.history
    .slice(-LIMITS.historyMessages)
    .map((m) => ({ role: m.role, text: m.text.slice(0, LIMITS.advisorMessageChars * 2) }));
  const snapshot: UserSnapshot = r.facts;
  const chip: ChipPayload | undefined = r.message.chip;
  const page: PageContext = r.page;
  return {
    v: PROTOCOL_VERSION,
    message: chip === undefined ? { text } : { text, chip },
    history,
    facts: snapshot,
    clock: r.clock,
    page,
    thread: r.thread,
  };
}

const onboardingClassify = z.object({
  v: z.literal(PROTOCOL_VERSION),
  question: z.enum(ONBOARDING_STEP_IDS),
  text: z.string().max(10_000),
});

/** A valid OnboardingClassifyRequest (text trimmed to 300), or null. */
export function parseOnboardingClassifyRequest(input: unknown): OnboardingClassifyRequest | null {
  const parsed = onboardingClassify.safeParse(input);
  if (!parsed.success) return null;
  const text = parsed.data.text.trim().slice(0, LIMITS.onboardingMessageChars);
  if (text === "") return null;
  return { v: PROTOCOL_VERSION, question: parsed.data.question, text };
}
