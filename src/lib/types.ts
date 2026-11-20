// Owner: architect. FROZEN CONTRACT (change only through the lead): every agent codes against these names.
// The domain types of «دليل»: the static catalogue (spec 9), the user's saved facts (A1), the values the engine derives
// from them (spec 2.8, 3.4, 7, 8), the consequence every state-changing action returns (A2), and the persisted shape.
// Types only (no runtime code). Ids, their runtime lists and guards live in ./ids.

import type {
  ApplicationStatus,
  AvatarId,
  BadgeId,
  CityOption,
  CompanyId,
  CourseId,
  EducationOption,
  ExperienceBand,
  ExperienceOption,
  FieldId,
  InterestOption,
  JobCityId,
  JobFieldId,
  JobId,
  LeaderboardUserId,
  LearnTab,
  MajorOption,
  OnboardingStepId,
  OptionsByQuestion,
  PageChipSlug,
  PriorityOption,
  QuestionId,
  SkillId,
  XpEventType,
} from "./ids";

export type {
  ApplicationStatus,
  AvatarId,
  BadgeId,
  CityOption,
  CompanyId,
  CourseId,
  EducationOption,
  ExperienceBand,
  ExperienceOption,
  FieldId,
  InterestOption,
  JobCityId,
  JobFieldId,
  JobId,
  LeaderboardUserId,
  LearnTab,
  MajorOption,
  NavScreen,
  OnboardingStepId,
  OptionsByQuestion,
  PageChipSlug,
  PriorityOption,
  QuestionId,
  SeedName,
  SkillId,
  ToolName,
  XpEventType,
} from "./ids";

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Small value types
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** An account key: the name after the normalisation of spec 4.3 (so «سارة» and «ساره» are one account, 3.1). */
export type UserId = string;
/** A calendar day on the device's clock, "YYYY-MM-DD" (spec 8.4). */
export type DayKey = string;
/** Stars held in a skill (spec 8.5). */
export type StarCount = 0 | 1 | 2 | 3;
/** A star slot / a required star level (spec 9.2, 9.3). */
export type StarSlot = 1 | 2 | 3;
/** Spec 8.3. */
export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Spec 8.2 / 9.4. */
export type CourseHours = 6 | 8 | 10 | 12 | 14 | 16;
/** Which analyser read a CV (spec 3.6 engine label, 6.6). */
export type CvEngine = "local" | "model";
/** Stars held per skill. Every one of the 38 keys is present (0 when none). */
export type StarMap = Readonly<Record<SkillId, StarCount>>;

/**
 * The device's clock, captured once per action or per render tick. Engine functions never call Date.now(): they take a
 * Clock, so the server (which receives the browser's Clock in each request) computes the same weekly numbers.
 */
export interface Clock {
  /** Epoch ms. */
  readonly now: number;
  /** Today on the device's calendar. */
  readonly today: DayKey;
  /** Epoch ms of the most recent Sunday 00:00 on the device's clock (spec 8.7: the week starts on Sunday). */
  readonly weekStart: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The static catalogue (spec 9). Owned by the `data` agent in src/lib/data.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Spec 9.1. */
export interface Field {
  readonly id: FieldId;
  /** «البيانات والتحليل» … */
  readonly name: string;
  /** False only for `professional`. */
  readonly hasJobs: boolean;
}

/** Spec 9.3 city ids and their labels: riyadh «الرياض», jeddah «جدة», dammam «الدمام», remote «عن بُعد». */
export interface JobCity {
  readonly id: JobCityId;
  readonly name: string;
}

/** Spec 9.2. */
export interface Skill {
  readonly id: SkillId;
  /** «Excel», «الإحصاء» … */
  readonly name: string;
  readonly field: FieldId;
  /** Number of star slots = number of courses for this skill. */
  readonly maxStars: StarSlot;
  /** Always inside the same field; satisfied by one star each. */
  readonly prereqs: readonly SkillId[];
  /** One line, under 15 words, for the skill panel. */
  readonly description: string;
  /** Names the CV analyser looks for (Arabic and English; spec 9.2 aliases rules and table). */
  readonly aliases: readonly string[];
}

/** One required skill of a job (spec 9.3). */
export interface Requirement {
  readonly skill: SkillId;
  readonly stars: StarSlot;
  /** Real jobs: the posting's own sentence this requirement was read from, verbatim (shown so the user sees why). */
  readonly evidence?: string;
}

/** Where a real job was posted (20 Nov 2026 snapshot). */
export interface JobSource {
  /** The site, as shown: «Workable», «صفحة وظائف سلة (Workable)» … */
  readonly site: string;
  /** The original posting (opened in a new tab). */
  readonly url: string;
  /** The posting date, when the posting gives one. */
  readonly postedAt: DayKey | null;
  /** The day the posting was opened and found open («جُمعت في 20 نوفمبر»). */
  readonly checkedAt: DayKey;
  /** How the posting's words were read as Dalilak's skills, where that needed a judgement (shown as a source note). */
  readonly note?: string;
}

/** Spec 9.3. Exactly five requirements, in roadmap order. No salary or applicant count exists. */
export interface Job {
  readonly id: JobId;
  /** «محلل بيانات» (masculine generic, as advertised; a real job's title is translated from the posting). */
  readonly title: string;
  /** Real jobs: the posting's own title. */
  readonly titleEn?: string;
  readonly field: JobFieldId;
  readonly city: JobCityId;
  /** Real jobs: the posting's own place text («Riyadh / Jeddah / Al Khobar», «Madinah (remote)»). */
  readonly place?: string;
  readonly band: ExperienceBand;
  /** The company in Arabic. The practice job's is fictional (spec 9.7, «وادي الغيم للبيانات»). */
  readonly company: string;
  /** Real jobs: the company's own (English) name, shown in small type. */
  readonly companyEn?: string;
  /** True for a real posting (with `source`); false for the one practice job («وظيفة تدريبية»). */
  readonly real: boolean;
  /** Real jobs: where it was posted. */
  readonly source?: JobSource;
  readonly requirements: readonly [Requirement, Requirement, Requirement, Requirement, Requirement];
  /** One sentence, at most 25 words. */
  readonly summary: string;
  /** Three task lines, at most 10 words each. */
  readonly tasks: readonly [string, string, string];
}

/** Spec 9.4. XP = 20 × hours (engine `courseXp`); the short title is the part before the colon (engine `shortTitle`). */
export interface Course {
  readonly id: CourseId;
  readonly skill: SkillId;
  readonly star: StarSlot;
  /** Full title, e.g. «أساسيات Power BI: من البيانات إلى لوحة المعلومات». */
  readonly title: string;
  readonly hours: CourseHours;
  /** Two sentences: what you learn; what you can do afterwards. */
  readonly description: string;
  /** 3 to 6 lesson titles in learning order; the count follows from the hours (spec 8.2). */
  readonly lessons: readonly string[];
}

/** Spec 8.3. */
export interface Level {
  readonly level: LevelNumber;
  /** «مبتدئ» … «أسطورة». */
  readonly title: string;
  /** Total XP at which this level starts. */
  readonly from: number;
}

/** Spec 8.6. */
export interface Badge {
  readonly id: BadgeId;
  /** «الخطوة الأولى» */
  readonly name: string;
  /** Shown when unlocked. */
  readonly description: string;
  /** Shown when locked. */
  readonly hint: string;
}

/** Spec 9.5. Fixed values; they never move. The level is derived from totalXp (engine `levelFor`). */
export interface LeaderboardUser {
  readonly id: LeaderboardUserId;
  /** First name and one family initial: «نورة ع.» */
  readonly name: string;
  /** Display name of the city, e.g. «الخبر» (not an id). */
  readonly city: string;
  readonly avatar: AvatarId;
  readonly totalXp: number;
  readonly weeklyXp: number;
}

/** A quick-reply chip of an onboarding question (spec 4.2). */
export interface OnboardingOption<V extends string = string> {
  readonly id: V;
  readonly label: string;
}

/** Spec 4.2 / 3.2. One per question; `options` is typed per question. */
export type OnboardingQuestion<Q extends OnboardingStepId = OnboardingStepId> = {
  [K in Q]: {
    readonly id: K;
    /** 1..7, the step indicator «السؤال 2 من 7» (20 Nov 2026: the seventh step, `company`, is number 6). */
    readonly n: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    /** The slot label of «ملفك يتكوّن» and of the profile's «معلوماتي»: «المدينة» … «الأولوية». */
    readonly slot: string;
    /** What «دليلك» asks. */
    readonly text: string;
    /** Question 3 only: the wording after `secondary` («وما المجال الأقرب إليك دراسةً أو تدريباً؟»); null elsewhere. */
    readonly textAfterSecondary: string | null;
    readonly options: readonly OnboardingOption<OptionsByQuestion[K]>[];
  };
}[Q];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Onboarding answers (spec 4.2, 4.3 neutral values)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** City as stored: a chip option, or "none" (the neutral value, printed «غير محدّدة»). */
export type CityValue = CityOption | "none";
/** Education as stored: a chip option, or "unknown" (the neutral value, printed «غير محدّد»). */
export type EducationValue = EducationOption | "unknown";

/**
 * The six answers. A missing key means "not answered yet" (the conversation is still on or before it).
 * Printing rules (slot card, profile, apply sheet) are in copy `answerText` (spec 4.3 neutral table).
 */
export interface OnboardingAnswers {
  /** `label` keeps the word the user typed («الخبر» → value dammam, label «الخبر»; «أبها» → other, «أبها»); chip label otherwise; "" for none. */
  readonly city?: { readonly value: CityValue; readonly label: string };
  readonly education?: EducationValue;
  /** `label` is the chip label, or the typed words for `other` («تخصص آخر» when none were kept). */
  readonly major?: { readonly value: MajorOption; readonly label: string };
  readonly experience?: ExperienceOption;
  /** One or two interests, in the order they appeared (spec 4.3). Neutral: ["unsure"]. */
  readonly interest?: readonly [InterestOption] | readonly [InterestOption, InterestOption];
  readonly priority?: PriorityOption;
  /**
   * 20 Nov 2026 (owner's part 2): the company the user has in mind (the optional seventh step), or "none" for «لا، مو
   * الحين». Missing on accounts saved before it existed: their onboarding counts as complete (brain/onboarding
   * `pendingQuestion`), and engine `dreamCompany` reads it as no company.
   */
  readonly company?: CompanyId | "none";
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The user's saved FACTS (A1). Nothing derivable is stored. UserFacts is also exactly what the browser sends to the
// server as the advisor snapshot (spec 5.2): UserSnapshot = UserFacts.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One skill found in a CV (spec 6.4, 6.5). */
export interface CvSkill {
  readonly skill: SkillId;
  /** Already lowered to the skill's maximum (spec 6.5 step 6). */
  readonly stars: StarSlot;
  /** The cleaned line that justifies the level, trimmed, cut at 160 characters with «…» (spec 6.5 step 7). */
  readonly evidence: string;
  /** Index into the CV document's `lines` where the evidence sits (for `phrase-highlight`). */
  readonly line: number;
}

/** What one CV analysis returns (POST /api/cv/analyse) and what the store records. */
export interface CvAnalysis {
  readonly skills: readonly CvSkill[];
  /**
   * The cleaned, rejoined lines (spec 6.5 steps 1-3): the document the show displays. ALWAYS equal to
   * `cleanCvLines(text).map((l) => l.text)` (src/lib/brain/cv, pure), for the local and the model analyser alike, so the
   * cv screen can show the same document during `read`, before the analysis returns, without a re-flow.
   */
  readonly lines: readonly string[];
  readonly engine: CvEngine;
  /** True when the text was the sample CV (spec 6.1 test); the sample is always read locally. */
  readonly isSample: boolean;
}

/** The latest successful CV analysis (≥ 1 skill), as a fact. The document text lives in UserState.cvDocument. */
export interface CvRecord {
  readonly fileName: string | null;
  readonly isSample: boolean;
  readonly engine: CvEngine;
  readonly analysedAt: number;
  readonly skills: readonly CvSkill[];
}

/** Progress in one course (spec 3.11). State (available/started/…) is derived: engine `courseState`. */
export interface CourseProgress {
  readonly startedAt: number;
  /** 1-based lesson numbers ticked, ascending. */
  readonly ticked: readonly number[];
  readonly completedAt: number | null;
  /** The certificate link the user pasted on «خلّصتها» (optional, self-reported; the guide page shows it back). */
  readonly certificateUrl?: string;
}

/** One entry of the XP history (spec 8.1). Zero-XP happenings are not recorded. */
export interface XpEvent {
  /** Unique per account: "onboarding_completed", "target_set", "cv_analysed", "course_completed:c-powerbi-1",
   *  "job_applied:data-analyst-riyadh", "daily_reward:2026-11-18" (engine `xpEventId`). */
  readonly id: string;
  readonly type: XpEventType;
  /** > 0. */
  readonly amount: number;
  readonly at: number;
  /** The course, the job or the day the event is about; null for the three one-time events. */
  readonly ref: CourseId | JobId | DayKey | null;
  /** False until its toast, level-up or celebration beat has shown (spec 3.15). */
  readonly announced: boolean;
}

/** Spec 7.4. The status is derived (engine `applicationStatus`) from time, the match when sent and the manual control. */
export interface Application {
  readonly jobId: JobId;
  /** "DL-2026-0001": prefix DL, year sent, sequence per account from 0001 (spec 7.4, v3 item 2). */
  readonly number: string;
  readonly sentAt: number;
  readonly matchAtSend: number;
  /** The note as sent (template of 7.4, possibly edited by the user). */
  readonly note: string;
  /** «مرفقة: {file name}» · «مرفقة: السيرة الجاهزة» · «لا توجد سيرة مرفقة» (copy `cvAttachmentLine`). */
  readonly cvLine: string;
  /** 40 when sent at a match of 60% or more, else 0 (spec 8.1). */
  readonly xpPaid: 0 | 40;
  readonly by: "user" | "advisor";
  /** Set by «محاكاة: انقل للحالة التالية»: the status this application was moved to. Null until pressed. */
  readonly manualStatus: ApplicationStatus | null;
  /** True for applications written by a seed: they keep `manualStatus` and ignore time (spec 7.5). */
  readonly pinned: boolean;
}

/** Spec 8.6: once unlocked, a badge stays. */
export interface UnlockedBadge {
  readonly id: BadgeId;
  readonly at: number;
  readonly announced: boolean;
}

/** The facts the engine needs. Everything else (level, stars, match, roadmap, ranks, streak) is derived from these. */
export interface UserFacts {
  readonly id: UserId;
  /** As typed, trimmed, inner spaces collapsed (spec 3.1). */
  readonly name: string;
  readonly avatar: AvatarId;
  readonly createdAt: number;
  /** The day the account was created: no daily reward that day (spec 8.4). */
  readonly createdDay: DayKey;
  readonly answers: OnboardingAnswers;
  /** When the sixth answer was accepted (`onboarding_completed`), else null. */
  readonly onboardingCompletedAt: number | null;
  /** Null until the first target is chosen. "Onboarded" (spec 2.2) means targetJobId !== null. */
  readonly targetJobId: JobId | null;
  readonly cv: CvRecord | null;
  /** «ابدأ بدون سيرة» was pressed (spec 2.8 rule 1, 3.4 start gate). */
  readonly cvSkipped: boolean;
  readonly courses: Readonly<Partial<Record<CourseId, CourseProgress>>>;
  /** Oldest first. */
  readonly xpEvents: readonly XpEvent[];
  /** Oldest first. */
  readonly applications: readonly Application[];
  /** Days on which an app-shell page was opened, ascending, unique (spec 8.4). Streaks are derived from it. */
  readonly activeDays: readonly DayKey[];
  /** Oldest first. */
  readonly badges: readonly UnlockedBadge[];
}

/** What «دليلك» is allowed to know (spec 5.2): exactly the facts. The CV text, the threads and the markers stay home. */
export type UserSnapshot = UserFacts;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Chat threads (persisted per account)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A line of the onboarding conversation (spec 3.2). */
export interface OnboardingMessage {
  readonly id: string;
  readonly from: "daleel" | "user";
  readonly text: string;
  readonly at: number;
  /**
   * 20 Nov 2026 (docs/ONBOARDING-FLOW.md): "cv" = «دليلك»'s CV card (the live analysis in the chat, drawn at rest from
   * `user.cv` after a reload); its `text` is the plain summary for screen readers. Absent on every other line.
   */
  readonly card?: "cv";
}

/** Where the advisor (or a card, or a chip) can take the user. `hrefFor` in src/lib/routes.ts turns it into a URL. */
export type NavTarget =
  | { readonly screen: "path" }
  | { readonly screen: "skills"; readonly skill?: SkillId }
  | { readonly screen: "cv" }
  | {
      readonly screen: "jobs";
      readonly q?: string;
      readonly city?: JobCityId;
      readonly field?: JobFieldId;
      readonly skill?: SkillId;
    }
  | {
      readonly screen: "job";
      readonly jobId: JobId;
      /** `?apply=1`: opens the user-filled apply sheet (spec 2.2). */
      readonly apply?: boolean;
      /** "missing": scroll to the block «ما ينقصك» (`#missing`), used by «شاهد الفجوة». */
      readonly focus?: "missing";
    }
  | { readonly screen: "applications" }
  | { readonly screen: "learn"; readonly tab?: LearnTab; readonly field?: FieldId }
  | { readonly screen: "course"; readonly courseId: CourseId }
  | { readonly screen: "leaderboard" }
  | { readonly screen: "profile" };

/**
 * What a chip or a button carries to the router (spec 5.4 point 1, 5.5 rule 1). A chip is never parsed as text.
 * Pressing a state-changing payload IS the user asking (5.4).
 */
export type ChipPayload =
  /** A page chip of 5.8 that needs no id of its own (ids come from the page context). */
  | { readonly intent: "page"; readonly slug: PageChipSlug }
  /** «ابدأ الدورة» (confirmation), page chip `start-course` «ابدأ هذه الدورة». */
  | { readonly intent: "start_course"; readonly courseId: CourseId }
  /** «قدّم على هذه», page chip `apply`, the button «دع دليلك يقدّم عنك»; `anyway` = «قدّم على أي حال» (5.5 rule 5). */
  | { readonly intent: "apply"; readonly jobId: JobId; readonly anyway?: boolean }
  /** «اجعلها هدفي» (confirmation and page chip `set-target`). */
  | { readonly intent: "set_target"; readonly jobId: JobId }
  /** «افتح الدورة», «افتح صفحة السيرة», «افتح طلباتي», «افتح مساري», «افتح الوظائف», «شاهد الفجوة», «افتح {page}». */
  | { readonly intent: "open"; readonly to: NavTarget }
  /** «ليس الآن». */
  | { readonly intent: "not_now" };

/**
 * A chip as shown. Test id: role "yes" → `advisor-confirm-yes`, role "no" → `advisor-confirm-no`,
 * role "chip" → `advisor-chip-{slug}` (page chips use their 5.8 slug; other reply chips use "open-{screen}" etc.).
 */
export interface Chip {
  readonly slug: string;
  readonly label: string;
  readonly role: "yes" | "no" | "chip";
  readonly payload: ChipPayload;
}

/**
 * A card in the advisor thread, drawn by the app from data by id (spec 3.14, 5.5 rule 10). Titles, companies, matches and
 * statuses are always read live from data and the engine, never from the model's text. `chip` is the action chip a card
 * carries (spec 5.5 rule 4: «قدّم على هذه», «ابدأ الدورة», «اجعلها هدفي»); test id `advisor-card-action-{id}`.
 */
export type AdvisorCard =
  | { readonly kind: "job"; readonly jobId: JobId; readonly chip?: Chip }
  | { readonly kind: "course"; readonly courseId: CourseId; readonly chip?: Chip }
  | { readonly kind: "gap"; readonly jobId: JobId }
  | { readonly kind: "application"; readonly jobId: JobId }
  /** Carries nothing: drawn and performed with the LIVE `nextStep(facts)` (useNextStepAction), so an old card never acts stale. */
  | { readonly kind: "next-step" };

/** One message of the advisor thread (spec 3.14). The thread keeps the last 40. */
export interface AdvisorMessage {
  readonly id: string;
  readonly from: "user" | "daleel";
  readonly at: number;
  /** User: one block, the text sent (or the chip label). «دليلك»: its paragraphs, each revealed as one block. */
  readonly blocks: readonly string[];
  readonly cards: readonly AdvisorCard[];
  /** Only the newest «دليلك» message shows its chips; older chips are kept but not rendered. */
  readonly chips: readonly Chip[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Everything else the store keeps per account (not sent to the server)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The onboarding conversation's own progress (spec 3.2, 3.3, 4). The pending question is NOT stored: it is derived by
 * `pendingQuestion(answers)` in src/lib/brain/onboarding (the first of the six, in order, with no answer; spec 4.1), and
 * `onboardingContext(user)` returns null for it while the thread is still empty (before the greeting).
 */
export interface OnboardingProgress {
  readonly thread: readonly OnboardingMessage[];
  /** Unmapped answers per question: the second miss is accepted as typed or neutral (spec 4.5). */
  readonly misses: Readonly<Partial<Record<OnboardingStepId, number>>>;
  /** Saved when step 6 of the path reveal starts (spec 3.3). */
  readonly revealPlayed: boolean;
  /**
   * 20 Nov 2026, the CV step in front of the questions (docs/ONBOARDING-FLOW.md): "offered" with the greeting, then
   * "analysed" (a CV with skills was recorded in the chat) or "skipped". Absent on accounts that started before it: they
   * keep the seven questions only.
   */
  readonly cv?: "offered" | "analysed" | "skipped";
  /**
   * The answers the CV stated clearly (written into `answers` at once, so the profile card shows them filled), and
   * whether the user has confirmed them («إيه، صح»). «لا، بعدّل» takes them out of `answers` again and drops this.
   */
  readonly cvPrefill?: { readonly slots: readonly OnboardingStepId[]; readonly confirmed: boolean };
}

/** The advisor thread and its in-flight marker (spec 3.14, 7.4). */
export interface AdvisorThread {
  /** Last 40, oldest first. Empty after «محادثة جديدة». */
  readonly messages: readonly AdvisorMessage[];
  /** Jobs or companies already came up in this thread (5.9: «وللعلم: كل الوظائف هنا بيانات تجريبية.» only the first time). */
  readonly jobsDisclosed: boolean;
  /** Set when «دليلك» starts filling an application, cleared when it is sent or stopped. Found set on load → interrupted. */
  readonly applyInFlight: { readonly jobId: JobId; readonly startedAt: number } | null;
}

/**
 * "What this page last showed" markers, for the replays that animate from the old state to the new one once (playbook
 * `useSeen`). Written with the store action `markSeen` AFTER the replay has been shown.
 */
export interface SeenMarkers {
  /** v3 3.4: `mapOpenPlayed`. Saved when the full `map-open` starts; afterwards every visit plays the short form. */
  readonly mapOpenPlayed: boolean;
  /** The `cv.analysedAt` for which `catch-up` has played (spec 3.4). Plays when cv && cv.analysedAt !== this. */
  readonly catchUpForCv: number | null;
  /** The match the roadmap last showed (`ring-count` baseline). */
  readonly pathMatch: number | null;
  /** Stars per skill the skill tree last showed. Null = never opened: baseline is engine `starsBeforeLatestStar` (3.5). */
  readonly skillStars: Readonly<Partial<Record<SkillId, StarCount>>> | null;
  /** Weekly rank the leaderboard last showed. Null = never opened: baseline is engine `rankBeforeLatestImprovement` (8.7). */
  readonly leaderboardRank: number | null;
  /** Badges the profile last showed. Null = never opened: every unlocked badge turns over once (`badge-reveal`). */
  readonly profileBadges: readonly BadgeId[] | null;
  /** Match per job the jobs list last showed (`ring-count`, `list-reorder`). Null = never opened: no replay. */
  readonly jobsMatch: Readonly<Partial<Record<JobId, number>>> | null;
  /** Status per application the tracker last showed (`status-advance`). */
  readonly applicationStatus: Readonly<Partial<Record<JobId, ApplicationStatus>>>;
  /** The advisor nudge has shown (once per account, spec 2.6). */
  readonly nudge: boolean;
}

/** One account in this browser. */
export interface UserState extends UserFacts {
  /** For ordering the saved-account chips on sign-in (most recent first). */
  readonly lastSignInAt: number;
  readonly onboarding: OnboardingProgress;
  /** The CV document of the latest successful analysis (cleaned lines), shown again on /cv. Not sent to the server. */
  readonly cvDocument: { readonly lines: readonly string[] } | null;
  readonly advisor: AdvisorThread;
  readonly seen: SeenMarkers;
}

/** The ONE localStorage value (key "masari:state", version 1). The `hydrated` flag is not persisted (A1). */
export interface PersistedState {
  readonly currentUserId: UserId | null;
  readonly users: Readonly<Record<UserId, UserState>>;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Consequences (A2): every state-changing store action returns one, so the caller can play the right celebration.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface TargetMatch {
  readonly jobId: JobId;
  readonly value: number;
}

export interface StarChange {
  readonly skill: SkillId;
  readonly before: StarCount;
  readonly after: StarCount;
}

export interface Consequence {
  readonly xp: {
    readonly gained: number;
    readonly before: number;
    readonly after: number;
    /** The events this action wrote (with their `announced` flag as written). */
    readonly events: readonly XpEvent[];
  };
  readonly level: { readonly before: LevelNumber; readonly after: LevelNumber };
  /** Match with the target before and after the action (null where there was no target). */
  readonly match: { readonly before: TargetMatch | null; readonly after: TargetMatch | null };
  /** Skills whose stars changed, in spec 9.2 order. */
  readonly stars: readonly StarChange[];
  /** Weekly rank (spec 8.7) and weekly XP before and after. */
  readonly rank: {
    readonly before: number;
    readonly after: number;
    readonly weeklyXpBefore: number;
    readonly weeklyXpAfter: number;
  };
  /** Badges unlocked by this action, in spec 8.6 order. */
  readonly badges: readonly BadgeId[];
  /** Streak days before and after (only `touchDay` changes it; equal elsewhere). */
  readonly streak: { readonly before: number; readonly after: number };
}

/** Name checks of spec 3.1: «اكتب اسمك (حرفان على الأقل).» · «الاسم طويل…» · «استخدم الحروف فقط.» */
export type NameError = "short" | "long" | "letters";
export type NameCheck =
  | { readonly ok: true; readonly name: string; readonly key: UserId }
  | { readonly ok: false; readonly error: NameError };

export type CreateAccountResult =
  | { readonly ok: true; readonly userId: UserId; readonly to: "/welcome" }
  | { readonly ok: false; readonly reason: "invalid"; readonly error: NameError }
  | { readonly ok: false; readonly reason: "exists"; readonly userId: UserId };

export type RecordCvResult =
  | { readonly ok: true; readonly consequence: Consequence }
  | { readonly ok: false; readonly reason: "empty" | "no_user" };

export type StartCourseResult =
  | { readonly ok: true; readonly already: boolean; readonly consequence: Consequence }
  | { readonly ok: false; readonly reason: "locked"; readonly lock: LockReason }
  | { readonly ok: false; readonly reason: "credited" | "completed" | "no_user" };

export type CompleteCourseResult =
  | { readonly ok: true; readonly courseId: CourseId; readonly onPath: CoursePathInfo | null; readonly consequence: Consequence }
  | { readonly ok: false; readonly reason: "not_started" | "completed" | "credited" | "locked" | "no_user" };

export type SubmitApplicationResult =
  | { readonly ok: true; readonly application: Application; readonly consequence: Consequence }
  | { readonly ok: false; readonly reason: "already_applied"; readonly status: ApplicationStatus }
  | { readonly ok: false; readonly reason: "no_user" };

export interface TouchDayResult {
  /** True on the first app-shell load of a calendar day (the day was added to activeDays). */
  readonly firstLoadToday: boolean;
  readonly daily: DailyRewardInfo;
  readonly consequence: Consequence;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Derived values (computed by src/lib/engine from UserFacts + data + Clock; never stored)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Spec 8.3 and the chip bar of 2.7: «420 / 600 XP» is 28% (70 of 250). */
export interface LevelInfo {
  readonly level: LevelNumber;
  readonly title: string;
  /** Threshold of this level. */
  readonly from: number;
  /** Threshold of the next level; null at level 7. */
  readonly next: number | null;
  /** XP still needed for the next level; null at level 7. */
  readonly xpToNext: number | null;
  /** Fill of the bar, 0..1 (1 at level 7). */
  readonly ratio: number;
}

/** Where a held star came from (skill panel «مصدر النجوم», spec 3.5). */
export type StarSource =
  | { readonly star: StarSlot; readonly source: "cv"; readonly evidence: string }
  | { readonly star: StarSlot; readonly source: "course"; readonly courseId: CourseId };

/** Spec 3.5 node states. */
export type SkillNodeState = "earned" | "maxed" | "available" | "locked";
export interface SkillNode {
  readonly skill: SkillId;
  readonly state: SkillNodeState;
  readonly stars: StarCount;
  readonly max: StarSlot;
  /** Needed by the target job (the mark «في مسارك»). */
  readonly inPath: boolean;
  /** The first prerequisite with no star (for «مقفلة. اكتسب أولاً: {prerequisite}.»), else null. */
  readonly lockedBy: SkillId | null;
}

/** Why a course is locked (spec 3.10): «تتطلب: {skill}» or «تتطلب النجمة {n} في {skill}». */
export type LockReason =
  | { readonly kind: "prereq"; readonly skill: SkillId }
  | { readonly kind: "previous-star"; readonly skill: SkillId; readonly star: StarSlot };

/** Spec 3.10 / 3.11 course states. */
export type CourseStateInfo =
  | { readonly state: "available" }
  | { readonly state: "started"; readonly ticked: readonly number[]; readonly total: number }
  | { readonly state: "completed"; readonly at: number }
  | {
      readonly state: "credited";
      readonly by: { readonly kind: "cv"; readonly evidence: string } | { readonly kind: "course"; readonly courseId: CourseId };
    }
  | { readonly state: "locked"; readonly lock: LockReason };
export type CourseState = CourseStateInfo["state"];

/** How a course relates to the target's roadmap (card «+20% مطابقة», header «ترفع مطابقتك… من 70% إلى 90%»). */
export interface CoursePathInfo {
  readonly jobId: JobId;
  /** The stage's displayed number on the roadmap. */
  readonly stageN: number;
  /** A preparatory stage («تمهيدية»): it raises nothing (gain 0). */
  readonly prep: boolean;
  /** For a preparatory course: the skill it opens. */
  readonly prepares: SkillId | null;
  /** That star's share: 20 ÷ required stars, rounded (20, 10, 7); 0 for prep (spec 7.3). */
  readonly gain: number;
  readonly matchNow: number;
  /** The exact match after completing this course from the current state (the ring is the truth). */
  readonly matchAfter: number;
}

/** A course list for one tab of /learn (spec 3.10), already filtered by field and ordered. */
export interface LearnListing {
  readonly items: readonly CourseId[];
  /** Tab "path" only: the path's done stages' courses (completed or credited), the collapsed group «أنجزتها (6)». */
  readonly doneGroup: readonly CourseId[];
}

/** Spec 7.2 breakdown, for «كيف تُحسب؟» and `explain_match`. */
export interface MatchBreakdown {
  readonly jobId: JobId;
  readonly rows: readonly {
    readonly skill: SkillId;
    readonly need: StarSlot;
    readonly held: StarCount;
    /** Exact points out of 20 (6.67 possible); display rounds. */
    readonly points: number;
  }[];
  /** The match, rounded. */
  readonly total: number;
  /** Sum of the fully met skills' points (`met_points`). */
  readonly metPoints: number;
}

/** One row of «كيف تسدّ الفجوة» (spec 7.3), also the gap card and `get_job_gap`. */
export interface GapRow {
  readonly skill: SkillId;
  readonly star: StarSlot;
  readonly courseId: CourseId;
  readonly hours: CourseHours;
  readonly xp: number;
  /** 20 ÷ required stars, rounded; 0 for a preparatory row (shown «+0%»). */
  readonly gain: number;
  readonly prep: boolean;
  /** Match after this one star is added to the current stars. */
  readonly matchAfter: number;
}

/** Spec 3.8 / 7.3. */
export interface Gap {
  readonly jobId: JobId;
  readonly match: number;
  /** «ما لديك»: required skills held at the required stars or more, in requirement order. */
  readonly have: readonly { readonly skill: SkillId; readonly need: StarSlot; readonly held: StarCount; readonly source: "cv" | "course" }[];
  /** «ما ينقصك»: required skills held below the requirement. */
  readonly missing: readonly { readonly skill: SkillId; readonly need: StarSlot; readonly held: StarCount }[];
  /** In roadmap (canonical) order. */
  readonly rows: readonly GapRow[];
}

/** One job in a ranked list (spec 7.2). */
export interface RankedJob {
  readonly jobId: JobId;
  readonly match: number;
  /** Onboarding fit score (4.6); never shown as a number (P5). */
  readonly fit: number;
  /** Unmet required skills in requirement order (the card shows at most three: «ينقصك: Power BI، الإحصاء»). */
  readonly missing: readonly SkillId[];
  readonly isTarget: boolean;
  readonly applied: boolean;
}

/** `/jobs?q=&city=&field=&skill=` (spec 2.2, 7.1). Absent = all. */
export interface JobQuery {
  readonly q?: string;
  readonly city?: JobCityId;
  readonly field?: JobFieldId;
  readonly skill?: SkillId;
}

/** Spec 4.6 fit score of one job. */
export interface FitBreakdown {
  readonly jobId: JobId;
  readonly score: number;
  readonly terms: {
    readonly interest: number;
    readonly major: number;
    readonly experience: number;
    readonly city: number;
    readonly priority: number;
  };
  /** Left out of the ranking by the education gate (mid-level jobs for secondary / diploma / student). */
  readonly excluded: boolean;
}

/** «لماذا هذا المسار؟» reasons (spec 4.6), structured; copy `revealReasonText` writes them. */
export type RevealReason =
  | { readonly kind: "interest"; readonly interest: InterestOption }
  | { readonly kind: "major"; readonly tier: "primary" | "secondary"; readonly majorLabel: string }
  | { readonly kind: "experience"; readonly band: ExperienceBand }
  /** `near`: the user typed a place near this job city («شقراء» → الرياض): `cityLabel` is the job city, printed «قريبة منك». */
  | { readonly kind: "city"; readonly cityLabel: string; readonly near?: boolean }
  | { readonly kind: "remote" }
  | { readonly kind: "priority"; readonly priority: Exclude<PriorityOption, "explore"> }
  | { readonly kind: "none" };

/** Spec 4.6: recommended = rank 1; alternative 1 = rank 2; alternative 2 = best remaining job of another field. */
export interface Recommendation {
  readonly recommended: JobId;
  readonly alternatives: readonly [JobId, JobId];
  /** Up to three, in the order of 4.6 (or the single "none" reason). */
  readonly reasons: readonly RevealReason[];
}

/** One stage of a job's path in canonical order, before any user data (the reveal strip, spec 3.3). */
export interface CanonicalStage {
  readonly skill: SkillId;
  readonly star: StarSlot;
  readonly courseId: CourseId;
  readonly hours: CourseHours;
  /** «تمهيدية»: a prerequisite the job does not list (first star only). */
  readonly prep: boolean;
  /** For prep stages: the skill it prepares. */
  readonly prepares: SkillId | null;
}

export type StageState = "done" | "current" | "upcoming" | "locked";

/** One stage of the roadmap as displayed (spec 3.4). `n` is its displayed position and its test id number. */
export interface RoadmapStage extends CanonicalStage {
  /** 1-based displayed position: `path-stage-{n}`, «المرحلة {n}». */
  readonly n: number;
  readonly state: StageState;
  readonly xp: number;
  /** How a done stage was done. "implied": a prep stage done because the prepared skill already has a star. */
  readonly doneBy:
    | { readonly kind: "cv"; readonly evidence: string }
    | { readonly kind: "course"; readonly courseId: CourseId; readonly at: number }
    | { readonly kind: "implied" }
    | null;
  /** Locked stages only. */
  readonly lock: LockReason | null;
  /** That star's share of the match (0 for prep). */
  readonly gain: number;
  /** Match after completing this ONE stage's course from the current state (stage sheet «أثرها على المطابقة», cards). */
  readonly matchAfter: number;
  /**
   * The match "at this station": with this stage and every stage before it (displayed order) held, and none after.
   * Equals `Roadmap.match` at the last done stage and 100 at the last stage; a drawing that shows the match along the
   * path (altitude, a rising line) uses exactly this, so it is the ring's number (P5). Data analyst after the sample CV,
   * stages 1-8: 10, 20, 30, 50, 60, 70, 90, 100. The start «البداية» is 0.
   */
  readonly matchAt: number;
}

/** A branch job (spec 3.4): projected match = with the user's stars raised to the target's requirements. */
export interface Branch {
  readonly jobId: JobId;
  readonly now: number;
  readonly after: number;
}

/** The roadmap to the target (spec 3.4). Layout-free: the map draws it however the chosen design says. */
export interface Roadmap {
  readonly jobId: JobId;
  readonly match: number;
  /** Match is 100: the goal is lit. */
  readonly complete: boolean;
  /** The start gate «اكتشف مهاراتك»: current while no CV is analysed and «ابدأ بدون سيرة» was not pressed. */
  readonly gate: "current" | "cleared";
  /**
   * In displayed order; 6 to 11 stages (spec 9.3: 8 for the demo target, 11 for bi-analyst-riyadh). Any of the 20 jobs
   * can become the target, so a drawing must hold 11 stages plus the gate, the start and the goal at 390 px and 1440 px
   * (D3's "4 to 8 stations" is the range the first drawing was tried at, not the data's range).
   */
  readonly stages: readonly RoadmapStage[];
  /** `n` of the current stage; null while the gate is current or when all are done. */
  readonly currentN: number | null;
  readonly doneCount: number;
  readonly total: number;
  readonly hoursLeft: number;
  readonly hoursTotal: number;
  /** Exactly two (spec 3.4). */
  readonly branches: readonly Branch[];
}

/** Spec 2.8: the user's one next step. Labels: copy `nextStepLabel`; where it goes: engine `nextStepTarget`. */
export type NextStep =
  | { readonly rule: 1 }
  | { readonly rule: 2; readonly courseId: CourseId; readonly ticked: number; readonly total: number }
  | {
      readonly rule: 3;
      readonly courseId: CourseId;
      readonly hours: CourseHours;
      readonly xp: number;
      readonly prep: boolean;
      readonly prepares: SkillId | null;
      readonly matchNow: number;
      readonly matchAfter: number;
    }
  | { readonly rule: 4; readonly jobId: JobId }
  | { readonly rule: 5 };

/** Spec 8.4 and the profile's streak block. */
export interface StreakInfo {
  /** Consecutive active days ending today (or yesterday, before today's first load). */
  readonly current: number;
  readonly longest: number;
  /** The last seven calendar days, oldest first, ending today. */
  readonly last7: readonly { readonly day: DayKey; readonly active: boolean; readonly today: boolean }[];
}

/** Spec 8.4 / 3.15 daily reward. */
export interface DailyRewardInfo {
  /** Offered now: not the creation day, and no `daily_reward` event dated today. */
  readonly due: boolean;
  /** Today's streak day (the reward's day number). */
  readonly day: number;
  /** min(100, 20 × day). */
  readonly amount: number;
  /** Tomorrow's reward if the streak continues: «عد غداً لتأخذ +80 XP». */
  readonly tomorrow: number;
  /** The streak restarted after a break (copy «أهلاً بعودتك. نبدأ سلسلة جديدة.»). */
  readonly restarted: boolean;
}

/** Spec 8.6 progress, for `list_badges` and hints. */
export interface BadgeProgress {
  readonly id: BadgeId;
  readonly unlocked: boolean;
  /** Counted progress where the rule counts something (courses, skills, streak days, XP); else null. */
  readonly have: number | null;
  readonly need: number | null;
}

/** One row of the weekly board (spec 3.12, 8.7). The user's row has id "me". */
export interface LeaderRow {
  readonly id: LeaderboardUserId | "me";
  readonly rank: number;
  readonly name: string;
  readonly city: string;
  readonly avatar: AvatarId;
  readonly level: LevelNumber;
  readonly weeklyXp: number;
  readonly me: boolean;
}

/** Spec 3.12 / 8.7. */
export interface Leaderboard {
  /** All 25 rows in rank order. */
  readonly rows: readonly LeaderRow[];
  readonly me: {
    readonly rank: number;
    readonly weeklyXp: number;
    /** «يفصلك {xp} XP عن المركز {toRank}»; null in first place («أنت في الصدارة. حافظ عليها.»). */
    readonly gap: { readonly toRank: number; readonly xp: number } | null;
  };
  /** Ranks 1-3 (podium, and the home preview of D4). */
  readonly top3: readonly LeaderRow[];
}

/** What the overlay queue still has to announce (spec 3.15), rebuilt from the facts on every load. */
export interface XpNews {
  /** The un-announced XP events merged into this toast, oldest first. */
  readonly eventIds: readonly string[];
  /** The sum shown: «+80 XP». */
  readonly amount: number;
  /** Event types merged, oldest first (copy `xpNewsReason` picks the reason; onboarding+target → «التعارف واختيار الهدف»). */
  readonly types: readonly XpEventType[];
  /** «صعدت إلى المركز {n} هذا الأسبوع»: the rank after, or null when the rank did not improve or weekly XP was 0 before. */
  readonly rankLine: number | null;
  /** The level-up that follows 0.6 s later; a gain that crosses two levels shows the final level only. */
  readonly levelUp: { readonly level: LevelNumber; readonly title: string; readonly xpToNext: number | null } | null;
}
export interface News {
  readonly xp: XpNews | null;
  /** Un-announced badges, in unlock order. */
  readonly badges: readonly BadgeId[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Cross-screen UI state (the non-persisted UI store in src/lib/store/ui.ts)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Running shows that hold the overlay queue and the nudge (spec 3.15 hold rule, 2.6) and block navigation (5.5 rule 7). */
export type HoldKey = "reveal" | "cv-show" | "celebration" | "advisor-apply" | "map-open-full";

/** What the advisor panel is asked to send for a page button (spec 3.4 form 4, 3.6, 3.8 «دع دليلك يقدّم عنك», …). */
export interface AdvisorOutgoing {
  /** The user bubble, e.g. «قدّم لي على هذه الوظيفة». */
  readonly text: string;
  readonly chip?: ChipPayload;
}

/** The six visible steps of «دليلك» filling the apply sheet (spec 7.4). 0 = waiting for the sheet to mount. */
export type ApplyStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** «دليلك» applying for the user: the dispatcher starts it, the jobs page's apply sheet runs it and reports back. */
export interface ApplyRun {
  /** Increments per run, so a stale sheet never answers a new run. */
  readonly id: number;
  readonly jobId: JobId;
  readonly step: ApplyStep;
  /** «إيقاف» was pressed (composer or sheet). Honoured during steps 1-4 only. */
  readonly stopRequested: boolean;
  /**
   * Set once by whoever ends the run: the jobs page (sent / stopped / failed, and `interrupted` when it unmounts before
   * step 5), or the dispatcher's watchdog (`interrupted` when no sheet reported step ≥ 1 within 3 s of arriving on the
   * job page, or within 15 s of the start).
   * A page that unmounts at or after step 5 reports `sent` (the record was written at the start of step 5).
   */
  readonly result:
    | { readonly kind: "sent"; readonly application: Application; readonly consequence: Consequence }
    | { readonly kind: "stopped" }
    | { readonly kind: "interrupted" }
    | { readonly kind: "failed"; readonly reason: "already_applied" | "no_user" }
    | null;
}

/**
 * The reveal result hands the path strip over to the map (v3 3.3, 3.4 `map-open` in full, "without a cut"). The UI store
 * keeps it with an id (`UiState.mapHandover`); readers read it in a useState initializer on their FIRST render, never
 * destructively (React Strict Mode runs effects twice on the dev server).
 */
export interface MapHandover {
  readonly jobId: JobId;
  /** The strip stays only when the recommended job was chosen; for an alternative it left with the rest. */
  readonly stripStays: boolean;
  /** The strip's box in viewport pixels at the moment of the choice (null if it left). */
  readonly stripRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | null;
  /** Bounding boxes of the strip's nodes in order: start, stages…, goal (viewport pixels), for the map to open out of. */
  readonly nodeRects: readonly { readonly x: number; readonly y: number; readonly width: number; readonly height: number }[];
}
