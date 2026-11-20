// Owner: architect. FROZEN CONTRACT (change only through the lead).
// The wire contract between the browser and the stateless server routes (A3):
//   POST /api/advisor     AdvisorRequest  → NDJSON stream of AdvisorEvent      (spec 3.14, 5)
//   POST /api/onboarding  OnboardingClassifyRequest → NDJSON of OnboardingEvent (spec 4.5: the one model-assisted step)
//   GET  /api/brain       → BrainStatus (JSON)                                  (STACK-NOTES 1.7: only the server knows keys)
//   POST /api/cv/extract  multipart field "cv" → CvExtractResponse (JSON)       (spec 6.1)
//   POST /api/cv/analyse  CvAnalyseRequest → CvAnalyseResponse (JSON)           (spec 6.5, 6.6)
// Plus the pure onboarding interpreter's input/output (run in the browser, spec 4.1) and the tool contract (5.3).
// Pure types and constants: safe to import from client and server.

import type {
  AdvisorCard,
  ApplicationStatus,
  BadgeId,
  Chip,
  ChipPayload,
  Clock,
  CourseHours,
  CourseId,
  CourseState,
  CvAnalysis,
  FieldId,
  Gap,
  JobCityId,
  JobFieldId,
  JobId,
  LearnTab,
  LockReason,
  MatchBreakdown,
  NavTarget,
  NextStep,
  OnboardingAnswers,
  OnboardingOption,
  OnboardingStepId,
  SkillId,

  StarSlot,
  ToolName,
  UserSnapshot,
} from "@/lib/types";

export const PROTOCOL_VERSION = 1 as const;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Brain status and modes (spec 3.14 mode line, 3.6 privacy line, 3.13 «عن هذا العرض», 5.5 rule 11, A4)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type ProviderName = "gemini" | "anthropic";
/** "online": a key is configured and the provider has not failed in the last 60 s. Otherwise "local". */
export type BrainMode = "online" | "local";

/** GET /api/brain. */
export interface BrainStatus {
  /** A provider key is configured (the CV privacy line and the profile sentence depend on this, not on `mode`). */
  readonly configured: boolean;
  /** The provider AI_PROVIDER resolves to, or null (local only). */
  readonly provider: ProviderName | null;
  readonly mode: BrainMode;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Advisor request (spec 5.2)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Neutral history; the server converts it per provider (STACK-NOTES 6.7). */
export interface ProtocolMessage {
  readonly role: "user" | "daleel";
  readonly text: string;
}

/** Where the user is (spec 5.2): "this job" and "this course" resolve from here. */
export interface PageContext {
  readonly route: "path" | "skills" | "cv" | "jobs" | "job" | "applications" | "learn" | "course" | "leaderboard" | "profile";
  readonly jobId?: JobId;
  readonly courseId?: CourseId;
  readonly skillId?: SkillId;
  /** The apply sheet is open (5.5 rule 7: no navigation event is applied then). */
  readonly applySheetOpen: boolean;
  /** A show is running (any HoldKey held). */
  readonly showRunning: boolean;
}

export interface AdvisorRequest {
  readonly v: typeof PROTOCOL_VERSION;
  /** The user's message: at most 500 characters of text (3.14); a chip or button also carries its payload. */
  readonly message: { readonly text: string; readonly chip?: ChipPayload };
  /** The last 12 messages before this one, oldest first (spec 5.2). */
  readonly history: readonly ProtocolMessage[];
  /** What «دليلك» may know: the facts (UserSnapshot = UserFacts). The server derives every number from them. */
  readonly facts: UserSnapshot;
  /** The device's clock (weekly XP, statuses and "today" come from it). */
  readonly clock: Clock;
  readonly page: PageContext;
  readonly thread: {
    /** Jobs already came up in this thread (5.9: the sample-data sentence is added only the first time). */
    readonly jobsDisclosed: boolean;
    /** Ids on the cards of the newest «دليلك» message (context for a model; the router never resolves ids from it). */
    readonly lastJobIds: readonly JobId[];
    readonly lastCourseIds: readonly CourseId[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Advisor stream events (NDJSON, one JSON object per line)
// Order inside one turn: status* → action? → text+ → card* → chips? → done. `error` may replace everything after it.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the browser's ONE dispatcher applies (A3, spec 5.3 contract). The server never changes state. */
export type AdvisorAction =
  /** navigate, and search_jobs with show (as a `jobs` target with filters), and «افتح…» chips. */
  | { readonly type: "navigate"; readonly to: NavTarget }
  /** Dispatcher: store.startCourse(courseId), then opens /learn/{id} already started. */
  | { readonly type: "start_course"; readonly courseId: CourseId }
  /** Dispatcher: store.setTarget(jobId), toast «هدفك الآن: {title}», then opens /path (short map-open). */
  | { readonly type: "set_target"; readonly jobId: JobId }
  /**
   * Dispatcher: runs the visible application of 7.4 (opens /jobs/{id} if needed, the sheet fills itself, the record is
   * written at the start of step 5). `expect` is what the server computed from the snapshot; if the real record
   * differs, the panel shows the client template filled from the real record instead of the held text.
   */
  | {
      readonly type: "apply";
      readonly jobId: JobId;
      readonly expect: { readonly number: string; readonly match: number; readonly xp: 0 | 40 };
    };

export type ReplySource = "router" | "local" | ProviderName;

export type AdvisorEvent =
  /** The tool status line (5.3), or «دليلك يفكّر…» before any tool (tool null). Rolls (`status-roll`). */
  | { readonly type: "status"; readonly tool: ToolName | null; readonly text: string }
  /**
   * A state change or a page change for the dispatcher. Everything after it in the same turn (text, cards, chips) is
   * HELD by the browser until the dispatcher reports the action finished (5.5 rule 12, `page-handoff`); if the action
   * was stopped or refused, the held events are discarded and the panel shows the client template for that outcome.
   */
  | { readonly type: "action"; readonly action: AdvisorAction }
  /** One complete paragraph (never a token). Plain text, no markdown. Revealed block by block (`answer-focus`). */
  | { readonly type: "text"; readonly text: string }
  /** A card drawn from data by id (5.5 rule 10). */
  | { readonly type: "card"; readonly card: AdvisorCard }
  /** Confirmation / reply chips of this reply (they replace any page chips while shown). */
  | { readonly type: "chips"; readonly chips: readonly Chip[] }
  /** The turn ended normally. `mode` updates the panel's mode line. */
  | { readonly type: "done"; readonly mode: BrainMode; readonly source: ReplySource }
  /** Only a bug can cause this (both the provider and the local brain failed): «تعذّر الرد الآن. جرّب مرة أخرى.» */
  | { readonly type: "error"; readonly code: "bad_request" | "brain_failed" };

/** A stream that ends without `done` or `error` is a failure too (STACK-NOTES 1.5). */
export type AdvisorEventType = AdvisorEvent["type"];

/**
 * What the dispatcher reports back for one action. On `ok: false` the panel discards the held events and shows the
 * client template for the reason (src/lib/brain/advisor/templates.ts):
 * - stopped → applyStoppedLine() («إيقاف» during steps 1-4)
 * - interrupted → applyInterruptedLine() (the jobs page unmounted before step 5, or the watchdog fired: ARCHITECTURE 9.2)
 * - blocked → blockedActionReply(action, facts) (5.5 rule 7 / 13: a sheet open, a show running, a run unfinished)
 * - already_applied → applyAlreadyReply(status) with the live status of the existing application
 * - locked / credited / completed → startCourseRefusedLine(reason, courseId, facts)
 * - no_user → replyFailedLine()
 */
export type DispatchResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | "stopped"
        | "interrupted"
        | "blocked"
        | "already_applied"
        | "no_user"
        | "locked"
        | "credited"
        | "completed";
    };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The thirteen tools (spec 5.3): parameters and results. Every job/course/skill id is validated (5.5 rule 2).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ToolParams {
  navigate: {
    readonly screen: "path" | "skills" | "cv" | "jobs" | "job" | "applications" | "learn" | "course" | "leaderboard" | "profile";
    readonly params?: {
      readonly job_id?: JobId;
      readonly course_id?: CourseId;
      readonly skill_id?: SkillId;
      readonly q?: string;
      readonly city?: JobCityId;
      readonly field?: JobFieldId | FieldId;
      readonly skill?: SkillId;
      readonly tab?: LearnTab;
      readonly apply?: boolean;
    };
  };
  search_jobs: {
    readonly query?: string;
    readonly city?: JobCityId;
    readonly field?: JobFieldId;
    readonly skill?: SkillId;
    readonly min_match?: number;
    /** Default 5. */
    readonly limit?: number;
    /** Default false. With true, /jobs also opens with those filters (5.5 rule 7 applies in model turns). */
    readonly show?: boolean;
  };
  get_job_gap: { readonly job_id: JobId };
  explain_match: { readonly job_id: JobId };
  recommend_next_step: Record<string, never>;
  list_courses: {
    readonly skill?: SkillId;
    readonly field?: FieldId;
    readonly status?: CourseState;
    readonly on_path?: boolean;
    readonly max_hours?: number;
    /** Default 5. */
    readonly limit?: number;
  };
  get_course: { readonly course_id: CourseId };
  start_course: { readonly course_id: CourseId };
  apply_to_job: { readonly job_id: JobId };
  list_applications: Record<string, never>;
  set_target_job: { readonly job_id: JobId };
  get_leaderboard: { readonly plus_xp?: number };
  list_badges: Record<string, never>;
}

export interface ToolJob {
  readonly id: JobId;
  readonly title: string;
  readonly company: string;
  readonly city: JobCityId;
  readonly field: JobFieldId;
  readonly match: number;
  readonly missing: readonly SkillId[];
}

export interface ToolCourse {
  readonly id: CourseId;
  readonly title: string;
  readonly skill: SkillId;
  readonly star: StarSlot;
  readonly hours: CourseHours;
  readonly xp: number;
  readonly state: CourseState;
  /** 0 when off the path or preparatory. */
  readonly gain: number;
  /** Null when the course is off the target's path. */
  readonly match_after: number | null;
  /** A preparatory stage of the target's path («تمهيدية», 5.9 "How much does it raise my match"); false off the path. */
  readonly prep: boolean;
  /** For a preparatory course: the skill it opens («تفتح مهارة {skill}»); else null. */
  readonly prepares: SkillId | null;
}

/** A real course of a learning guide, as get_course carries it (a null is unknown: never guessed, never said). */
export interface ToolGuideCourse {
  readonly title: string;
  readonly provider: string;
  readonly lang: "ar" | "en";
  readonly price: "free" | "paid" | "free_to_audit" | null;
  readonly hours: number | null;
  readonly certificate: boolean | null;
  /** One line, Arabic: why it is recommended. */
  readonly why: string;
}

/**
 * The learning guide of a step's skill (20 Nov 2026: Dalilak guides instead of hosting courses). Real items only, links
 * opened on 20 Nov 2026: the top pick «ابدأ بهذا», up to two alternatives, people to follow, articles, a proof task.
 */
export interface ToolGuide {
  readonly top_pick: ToolGuideCourse;
  readonly alternatives: readonly ToolGuideCourse[];
  readonly people: readonly { readonly name: string; readonly platform: string; readonly why: string }[];
  readonly articles: readonly { readonly title: string; readonly author: string; readonly why: string }[];
  readonly proof: string | null;
}

/**
 * Field spelling: the flat tool shapes use snake_case (`match_after`, `job_id`, as spec 5.3 names them). Where a result
 * embeds an engine type as is (`Gap`, `MatchBreakdown`, `NextStep`), that type keeps its camelCase names (`matchAfter`,
 * `metPoints`); this is the accepted spelling and the model's tool declarations describe the fields as they are sent.
 */
export interface ToolResults {
  navigate: { readonly route: string };
  search_jobs: { readonly jobs: readonly ToolJob[]; readonly total: number };
  get_job_gap: Gap;
  explain_match: MatchBreakdown & { readonly next_course: { readonly id: CourseId; readonly match_after: number } | null };
  recommend_next_step: {
    readonly step: NextStep;
    readonly label: string;
    readonly route: string;
    /** For rule 2/3: the course's hours, lessons and XP. */
    readonly course: { readonly id: CourseId; readonly hours: CourseHours; readonly lessons: number; readonly xp: number } | null;
    /** Badges that completing this step would unlock, in 8.6 order (simulated with the store's pure transitions). */
    readonly badges: readonly BadgeId[];
  };
  list_courses: { readonly courses: readonly ToolCourse[] };
  get_course: ToolCourse & {
    readonly description: string;
    /** Empty since the guides (20 Nov 2026): a learning step has no lessons in Dalilak. */
    readonly lessons: readonly string[];
    readonly lock: LockReason | null;
    /** The guide of the step's skill (optional: added 20 Nov 2026, older readers ignore it). */
    readonly guide?: ToolGuide;
  };
  start_course:
    | { readonly ok: true; readonly already: false; readonly hours: CourseHours; readonly lessons: number; readonly xp: number; readonly match_after: number | null }
    | { readonly ok: true; readonly already: true; readonly ticked: number; readonly total: number }
    | { readonly ok: false; readonly reason: "locked"; readonly lock: LockReason }
    | { readonly ok: false; readonly reason: "credited" | "completed" };
  apply_to_job:
    | { readonly ok: true; readonly number: string; readonly match: number; readonly xp: 0 | 40 }
    | { readonly ok: false; readonly reason: "already_applied"; readonly status: ApplicationStatus }
    | { readonly ok: false; readonly reason: "low_match"; readonly match: number };
  list_applications: {
    readonly applications: readonly {
      readonly job_id: JobId;
      readonly number: string;
      readonly status: ApplicationStatus;
      readonly match_then: number;
      readonly match_now: number;
    }[];
  };
  set_target_job:
    | { readonly ok: true; readonly job_id: JobId; readonly match: number; readonly remaining: number; readonly first_course: CourseId | null }
    | { readonly ok: false; readonly reason: "already_target" };
  get_leaderboard: {
    readonly rank: number;
    readonly weekly_xp: number;
    /** XP to the place above; null in first place. */
    readonly gap: number | null;
    readonly top3: readonly { readonly rank: number; readonly weekly_xp: number }[];
    /** With plus_xp: the rank that many more XP would give. */
    readonly rank_with_plus: number | null;
  };
  list_badges: {
    readonly badges: readonly {
      readonly id: BadgeId;
      readonly unlocked: boolean;
      readonly hint: string;
      readonly have: number | null;
      readonly need: number | null;
    }[];
  };
}

/** A tool call that failed validation (unknown id: 5.5 rule 2) answers this instead of its result. */
export interface ToolError {
  readonly error: "unknown_id" | "invalid_params" | "not_allowed";
  readonly detail: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Onboarding (spec 4): the interpreter is PURE and runs in the browser (4.1: instant, offline, identical every run).
// POST /api/onboarding exists for the one model-assisted step only (4.5): classifying an unmapped typed answer.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface OnboardingContext {
  readonly name: string;
  readonly answers: OnboardingAnswers;
  readonly misses: Readonly<Partial<Record<OnboardingStepId, number>>>;
  /** Derived, never stored: null while the thread is empty (before the greeting), else `pendingQuestion(answers)`. */
  readonly pending: OnboardingStepId | null;
  /**
   * 20 Nov 2026 (docs/ONBOARDING-FLOW.md): the order the questions left are asked in. After a CV whose answers were
   * confirmed: the interest first (asked from the CV's skills), then what the CV did not state, then company and priority.
   * Absent: the seven steps in their fixed order.
   */
  readonly order?: readonly OnboardingStepId[];
}

export type OnboardingInput =
  /** A chip: its option id is recorded directly, never parsed (4.2). The `other` city chip is NOT sent (it only focuses the composer). */
  | { readonly kind: "chip"; readonly question: OnboardingStepId; readonly option: string }
  /** A typed message (only the first 300 characters are read, 4.5). */
  | { readonly kind: "text"; readonly text: string }
  /** A typed message the model classified into option ids of `question` (interest: up to two). */
  | { readonly kind: "classified"; readonly question: OnboardingStepId; readonly options: readonly string[]; readonly text: string };

/** The quick replies under the pending question (test id `welcome-chip-{question}-{option}`). */
export interface OnboardingChipSet {
  readonly question: OnboardingStepId;
  readonly options: readonly OnboardingOption[];
}

/** What one turn produced. The welcome screen shows it; the store applies it (`applyOnboardingTurn`). */
export interface OnboardingTurn {
  /** The user's bubble (chip label or the typed text). */
  readonly userText: string;
  /** «دليلك»'s messages in order: the acknowledgement (4.4) or special reply (4.5), then the next question; or the closing line. */
  readonly replies: readonly string[];
  /** All answers after this turn. */
  readonly answers: OnboardingAnswers;
  readonly misses: Readonly<Partial<Record<OnboardingStepId, number>>>;
  /** The question now pending (its chips are `chips`); null when done. The store does not save it (it is derived). */
  readonly pending: OnboardingStepId | null;
  readonly chips: OnboardingChipSet | null;
  /** The sixth answer was accepted: the closing line is in `replies`; phase 2 starts 1.2 s later. */
  readonly done: boolean;
  /**
   * The text reached step 5 of 4.3 (could not be mapped) for the pending question. If the brain is online the screen may
   * ask POST /api/onboarding (2.5 s) and, on a valid answer, run the interpreter again with a "classified" input instead
   * of applying this turn. Otherwise this turn (with its «لم ألتقطها جيداً…» reply) is applied as is.
   */
  readonly unmapped: { readonly question: OnboardingStepId; readonly text: string } | null;
  /**
   * 20 Nov 2026, the CV step (docs/ONBOARDING-FLOW.md): what the store writes on `user.onboarding` besides the thread and
   * answers. `cv`: the step's new status; `prefill`: the confirmed CV answers, or null when «لا، بعدّل» dropped them.
   */
  readonly cvStep?: {
    readonly cv?: "offered" | "analysed" | "skipped";
    readonly prefill?: { readonly slots: readonly OnboardingStepId[]; readonly confirmed: boolean } | null;
  };
}

export interface OnboardingClassifyRequest {
  readonly v: typeof PROTOCOL_VERSION;
  readonly question: OnboardingStepId;
  /** At most 300 characters. */
  readonly text: string;
}

export type OnboardingEvent =
  /** Option ids valid for that question (anything else was dropped by the server). */
  | { readonly type: "classified"; readonly question: OnboardingStepId; readonly options: readonly string[] }
  | { readonly type: "unclassified" }
  | { readonly type: "done"; readonly mode: BrainMode }
  | { readonly type: "error"; readonly code: "bad_request" | "brain_failed" };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// CV (spec 3.6, 6)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Which input error of 3.6 applies (6.1 "Which error"). `request_failed` is set by the client on a failed fetch. */
export type CvErrorCode = "wrong_type" | "too_large" | "too_many_pages" | "unreadable" | "no_text" | "request_failed";

/** POST /api/cv/extract (multipart, field "cv"). HTTP 200 on ok; 4xx with the same JSON shape on errors. */
export type CvExtractResponse =
  | { readonly ok: true; readonly text: string; readonly kind: "pdf" | "docx"; readonly pages: number | null; readonly fileName: string }
  | { readonly ok: false; readonly error: Exclude<CvErrorCode, "request_failed"> };

/** POST /api/cv/analyse. `text` is raw (pasted, sample, or extracted); at least 80 characters (6.1). */
export interface CvAnalyseRequest {
  readonly v: typeof PROTOCOL_VERSION;
  readonly text: string;
  readonly fileName: string | null;
}

export type CvAnalyseResponse =
  /** `analysis.skills` may be empty: the screen shows the empty result (3.6) and records nothing. */
  | { readonly ok: true; readonly analysis: CvAnalysis }
  | { readonly ok: false; readonly error: "too_short" | "bad_request" };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Limits and timeouts (spec 3.14, 4.5, 5.5, 6.3, 6.6, A4)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const LIMITS = {
  /** Characters of an advisor message that are sent (3.14). */
  advisorMessageChars: 500,
  /** Characters of an onboarding message that are read (4.5). */
  onboardingMessageChars: 300,
  /** Messages of history sent with each advisor request (5.2). */
  historyMessages: 12,
  /** Messages kept in the saved advisor thread (3.14). */
  threadMessages: 40,
  /** A model reply longer than this is cut at the last full sentence (5.5 rule 17). */
  replyChars: 600,
  /** Tool rounds per message (5.5 rule 14). */
  toolRounds: 4,
  /** Pasted CV minimum (6.1). */
  cvMinChars: 80,
  /** CV file limits (6.1). */
  cvMaxBytes: 5 * 1024 * 1024,
  cvMaxPages: 15,
} as const;

export const TIMEOUTS_MS = {
  /**
   * The provider must send its first event within this, or the local brain answers (5.5 rule 11). Was 2.5 s; live
   * Gemini Flash-Lite (18 Nov 2026) answered in 1.0-2.0 s but crossed 2.5 s on about 1 turn in 4, so the user got the
   * local "out of scope" line for questions Gemini handles. The panel shows «دليلك يفكّر…» at once and its stall line
   * after 4 s, so a 6 s wait reads as thinking, not as a hang.
   */
  advisorFirstEvent: 6_000,
  /** After a provider failure, no provider call for this long; the panel shows the local mode line (5.5 rule 11). */
  providerCooldown: 60_000,
  /**
   * The onboarding classification (4.5); the client also aborts at this. Was 2.5 s: live Gemini crossed it on 1 of 6
   * typed answers (18 Nov 2026). «دليلك» shows his typing dots meanwhile, so 5 s reads as thinking.
   */
  onboardingClassify: 5_000,
  /** The CV model call (6.3, 6.6); then the local result stands alone. */
  cvModel: 12_000,
  /** The browser gives up on /api/cv/analyse after this and shows «تعذّر التحليل الآن. جرّب مرة أخرى.» */
  cvAnalyseClient: 15_000,
} as const;
