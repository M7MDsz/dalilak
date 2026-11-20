// Owner: brain-advisor. The router of spec 5.7 and the local brain behind it. PURE (data, engine, store transitions for
// simulation); server code calls it, tests call it; the browser does not.
//
// Order (first match wins): a chip or button (row 3, never parsed as text) · a message made only of acknowledgement
// words («تمام», «طيب», «اوكي», «لا»: the answer to the last offer, else a warm line; QA fix, before row 21 so it can
// never reach the fallback) · 1 refuse «أكمل الدورة عني» / «خلّصها عني» and «أعطني XP» · refuse to invent an employer ·
// 2 real / real-world numbers · 4 apply · 5 start a course (a learning step) · 6 set the target (4-6 only when the
// message is a request in the sense of 5.4: it does not open with a question word) · the learning guides («وين أتعلم
// SQL؟», «مين أتابع في البيانات؟», «وش أقرأ عن Power BI؟», «وش أبدأ فيه؟»: the guide's answer, and its page opens; 20 Nov
// 2026) · 7 job search · 8 open a page · the typed fixed answers of 5.8 · 9 explain · 10 gap · 11 next step · 12 a
// course · 13 leaderboard · 14 XP/level/streak · 15 badges/stars · 16 applications · 17 the CV · 18 greeting ·
// 19 thanks · 20 who · 21 the fallback.
// Careers (20 Nov 2026, careers.ts): the pay of a named career family goes right before row 2 (the published figure with
// its source); every other career question (a family named, or a first-month / certificates / route question about the
// target's family) goes after the how-to answers and before row 9.
// One deliberate refinement: a «لماذا … مطابقتي» or «ينقصني» message that names exactly one job title is answered by
// rows 9/10 for THAT job before row 7 would read the title as a job search (see the brain report).
import { JOBS, MATCH_LINE, SKILLS, getCourse, getJob, getSkill } from "@/lib/data";
import { courseIdFor } from "@/lib/ids";
import type { Chip, ChipPayload, CourseId, FieldId, JobCityId, JobFieldId, JobId, NavTarget, PageChipSlug, SkillId, ToolName } from "@/lib/types";
import type { AdvisorEvent, AdvisorRequest, ToolParams, ToolResults } from "@/lib/brain/protocol";

import { AdvisorCtx } from "./context";
import {
  applicationsReply,
  applyOfferReply,
  applyReply,
  applySearchReply,
  startOfferReply,
  targetOfferReply,
  applyWhichReply,
  badgesReply,
  bestJobReply,
  climbReply,
  completeForMeReply,
  grantReply,
  inventReply,
  withJobsDisclosure,
  courseGainReply,
  courseWhatReply,
  courseWhichReply,
  explainReply,
  fallbackReply,
  gapReply,
  greetingReply,
  guardBlocked,
  guideReply,
  levelHowReply,
  nextStepReply,
  openPageReply,
  pathCoursesReply,
  rankGapReply,
  remainingReply,
  reply,
  searchReply,
  shortCoursesReply,
  startReply,
  streakReply,
  targetReply,
  targetWhichReply,
  toEvents,
  whyPathReply,
  xpLevelReply,
  type GuideAsk,
  type GuidePick,
  type Reply,
} from "./replies";
import { careerReply, careerSalaryReply } from "./careers";
import { guideByTopic, guideFor } from "./guide";
import { T } from "./templates";
import { applyOutcome, isToolError, runTool } from "./tools";
import * as W from "./words";

/** The rows of 5.7 (plus the fixed answers of 5.8 matched before the general intents) and chips (row 3). */
export type AdvisorIntent =
  | "acknowledge"
  | "refuse-complete"
  | "refuse-grant"
  | "refuse-invent"
  | "is-real"
  | "real-numbers"
  | "chip"
  | "apply"
  | "start-course"
  | "set-target"
  | "guide"
  | "job-search"
  | "open-page"
  | "explain-match"
  | "gap"
  | "next-step"
  | "course"
  | "leaderboard"
  | "xp-level"
  | "badges"
  | "applications"
  | "cv"
  | "greeting"
  | "thanks"
  | "who"
  | "fixed-answer"
  | "how-to"
  | "feelings"
  | "interview"
  | "career"
  | "fallback";

export type RouterDecision =
  /** Rows 1-8, every chip and button, and the 5.8 fixed answers: answered by the router in every mode (5.5 rule 1). */
  | { readonly kind: "router"; readonly intent: AdvisorIntent; readonly events: readonly AdvisorEvent[] }
  /** Rows 9-21: a model may answer when online; `local` is the local brain's answer, used when offline or on any failure. */
  | { readonly kind: "open"; readonly intent: AdvisorIntent; readonly local: readonly AdvisorEvent[] };

// ── Tool calls ─────────────────────────────────────────────────────────────────────────────────────────────────────

class NotFound extends Error {}

/** Runs a tool; an unknown id (impossible for ids the router took from the data) answers the not-found line. */
function call<N extends ToolName>(ctx: AdvisorCtx, name: N, params: ToolParams[N]): ToolResults[N] {
  const result = runTool(name, params, { facts: ctx.facts, clock: ctx.clock, page: ctx.page });
  if (isToolError(result)) throw new NotFound(result.detail);
  return result;
}

// ── Building blocks shared by typed requests and chips ─────────────────────────────────────────────────────────────

function applyRoute(ctx: AdvisorCtx, jobId: JobId | null, anyway: boolean): Reply {
  if (jobId === null) return applyWhichReply(ctx);
  const result = anyway ? applyOutcome(jobId, ctx.facts, ctx.clock, true) : call(ctx, "apply_to_job", { job_id: jobId });
  return applyReply(ctx, jobId, result);
}

function startRoute(ctx: AdvisorCtx, courseId: CourseId | null): Reply {
  if (courseId === null) return courseWhichReply(ctx);
  return startReply(ctx, courseId, call(ctx, "start_course", { course_id: courseId }));
}

function targetRoute(ctx: AdvisorCtx, jobId: JobId | null): Reply {
  if (jobId === null) return targetWhichReply(ctx);
  return targetReply(ctx, jobId, call(ctx, "set_target_job", { job_id: jobId }));
}

function nextStepRoute(ctx: AdvisorCtx): Reply {
  return nextStepReply(ctx, call(ctx, "recommend_next_step", {}), ["recommend_next_step"]);
}

function explainRoute(ctx: AdvisorCtx, jobId: JobId | null): Reply {
  if (jobId === null) return fallbackReply();
  return explainReply(call(ctx, "explain_match", { job_id: jobId }));
}

function gapRoute(ctx: AdvisorCtx, jobId: JobId | null): Reply {
  if (jobId === null) return fallbackReply();
  return gapReply(call(ctx, "get_job_gap", { job_id: jobId }));
}

function searchRoute(
  ctx: AdvisorCtx,
  filters: { readonly query?: string; readonly city?: JobCityId; readonly field?: JobFieldId },
  show: boolean,
): Reply {
  const result = call(ctx, "search_jobs", { ...filters, show, limit: 5 });
  const to: NavTarget | null = show
    ? {
        screen: "jobs",
        ...(filters.query ? { q: filters.query } : {}),
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.field ? { field: filters.field } : {}),
      }
    : null;
  return searchReply(ctx, result, result.total > 0 ? to : null);
}

function bestJobRoute(ctx: AdvisorCtx): Reply {
  return bestJobReply(ctx, call(ctx, "search_jobs", { limit: 3 }));
}

function courseWhatRoute(ctx: AdvisorCtx, courseId: CourseId | null): Reply {
  if (courseId === null) return fallbackReply();
  return courseWhatReply(ctx, call(ctx, "get_course", { course_id: courseId }));
}

function pathCoursesRoute(ctx: AdvisorCtx): Reply {
  return pathCoursesReply(call(ctx, "list_courses", { on_path: true, limit: 59 }));
}

function shortCoursesRoute(ctx: AdvisorCtx): Reply {
  const all = call(ctx, "list_courses", { max_hours: 8, limit: 59 });
  const open = all.courses
    .filter((c) => c.state === "available" || c.state === "started")
    .map((c, index) => ({ c, index }))
    .sort((a, b) => a.c.hours - b.c.hours || a.index - b.index)
    .map(({ c }) => c);
  return shortCoursesReply({ courses: open });
}

function climbRoute(ctx: AdvisorCtx): Reply {
  const next = call(ctx, "recommend_next_step", {});
  const plus = next.course?.xp;
  const board = call(ctx, "get_leaderboard", plus ? { plus_xp: plus } : {});
  return climbReply(next, board);
}

function rankGapRoute(ctx: AdvisorCtx): Reply {
  return rankGapReply(call(ctx, "get_leaderboard", {}));
}

function badgesRoute(ctx: AdvisorCtx): Reply {
  return badgesReply(call(ctx, "recommend_next_step", {}), call(ctx, "list_badges", {}));
}

function applicationsRoute(ctx: AdvisorCtx): Reply {
  return applicationsReply(call(ctx, "list_applications", {}));
}

/** The course for the user's NEXT star in a skill (5.4: a skill name means that course); maxed: its last course. */
function nextCourseFor(ctx: AdvisorCtx, skill: SkillId): CourseId | null {
  const held = ctx.stars[skill];
  const max = getSkill(skill).maxStars;
  return courseIdFor(skill, Math.min(held + 1, max));
}

// ── Row 3: chips and buttons (a chip is never parsed as text) ──────────────────────────────────────────────────────

function pageChipRoute(ctx: AdvisorCtx, slug: PageChipSlug): Reply {
  switch (slug) {
    case "next-step":
    case "skill-start":
    case "course-start":
      return nextStepRoute(ctx);
    case "why-path":
      return whyPathReply(ctx);
    case "remaining":
      return remainingReply(ctx);
    case "gap":
      return gapRoute(ctx, ctx.focusJob);
    case "stars-how":
      return reply(T.starsHow());
    case "cv-what":
      return reply(T.cvWhat());
    case "cv-none":
      return reply(T.cvNone());
    case "jobs-data-riyadh":
      return searchRoute(ctx, { field: "data", city: "riyadh" }, true);
    case "best-job":
      return bestJobRoute(ctx);
    case "jobs-remote":
      return searchRoute(ctx, { city: "remote" }, true);
    case "why-match":
      return explainRoute(ctx, ctx.focusJob);
    case "apply":
      return applyRoute(ctx, ctx.pageJob, false);
    case "set-target":
      return targetRoute(ctx, ctx.pageJob);
    case "applications-status":
      return applicationsRoute(ctx);
    case "courses-path":
      return pathCoursesRoute(ctx);
    case "courses-short":
      return shortCoursesRoute(ctx);
    case "course-what":
      return courseWhatRoute(ctx, ctx.pageCourse);
    case "start-course":
      return startRoute(ctx, ctx.pageCourse);
    case "course-gain":
      return ctx.pageCourse ? courseGainReply(ctx, ctx.pageCourse) : fallbackReply();
    case "rank-how":
      return climbRoute(ctx);
    case "rank-gap":
      return rankGapRoute(ctx);
    case "badge-next":
      return badgesRoute(ctx);
    case "level-how":
      return levelHowReply(ctx);
  }
}

function chipRoute(ctx: AdvisorCtx, chip: ChipPayload): Reply {
  switch (chip.intent) {
    case "not_now":
      return reply(T.notNow());
    case "open":
      return openPageReply(ctx, chip.to);
    case "apply":
      return applyRoute(ctx, chip.jobId, chip.anyway === true);
    case "start_course":
      return startRoute(ctx, chip.courseId);
    case "set_target":
      return targetRoute(ctx, chip.jobId);
    case "page":
      return pageChipRoute(ctx, chip.slug);
  }
}

// ── Rows 4-6: typed requests (5.4) ─────────────────────────────────────────────────────────────────────────────────

/** A wish word followed within three words by أقدّم، تقدّم، تقديم or التقديم. */
function wishToApply(text: W.Text): boolean {
  const wishes = W.hits(text, W.WISH_WORDS);
  const targets = W.hits(text, W.APPLY_WISH_TARGETS);
  return wishes.some((w) => targets.some((t) => t.start > w.start && t.start - w.start <= 3));
}

const ALL_CITY_WORDS: readonly string[] = Object.values(W.CITY_WORDS).flat();
const ALL_FIELD_WORDS: readonly string[] = Object.values(W.FIELD_WORDS).flat();

/**
 * Row 7's test, shared with row 4: the words after في / لدى / عند when they are not a known title, city or field
 * («وظيفة في أرامكو» → «أرامكو»). Null when there are none.
 */
function employerWords(text: W.Text): string | null {
  const prep = W.firstHit(text, W.SEARCH_PREPOSITIONS);
  if (!prep) return null;
  const generic = W.norm(W.GENERIC_EMPLOYER_WORDS);
  const words = text.words.slice(prep.end).filter((w) => !generic.includes(w));
  const first = words[0];
  if (first === undefined || W.norm(W.NOT_EMPLOYER_WORDS).includes(first)) return null;
  const rest = W.textOf(words.join(" "));
  if (W.jobsNamed(rest).length > 0 || W.has(rest, ALL_CITY_WORDS) || W.has(rest, ALL_FIELD_WORDS)) return null;
  return words.join(" ");
}

/**
 * Null: not an apply request. Otherwise the one job it is about, or null inside (→ «على أي وظيفة؟»), or `elsewhere`:
 * the employer words of «قدّم لي على وظيفة في أرامكو», searched like row 7 (a real employer finds nothing).
 */
function detectApply(
  ctx: AdvisorCtx,
  text: W.Text,
): { readonly jobId: JobId | null; readonly elsewhere?: string } | null {
  if (!(W.has(text, W.APPLY_VERBS) || wishToApply(text))) return null;
  if (W.has(text, W.COURSE_WORDS)) return null;
  const named = W.jobsNamed(text);
  // on a job page «قدّم عني» / «قدّم لي» with nothing else means this job (20 Nov 2026: kept on the router, never a model)
  const thisJob = ctx.pageJob !== null && (W.has(text, W.THIS_WORDS) || W.has(text, ["عني", "عنّي", "لي"]));
  if (!(named.length > 0 || W.has(text, W.JOB_REFERENCES) || thisJob)) return null;
  if (named.length === 1) return { jobId: named[0]! };
  if (named.length > 1) return { jobId: null };
  if (thisJob) return { jobId: ctx.pageJob };
  const elsewhere = employerWords(text);
  if (elsewhere) return { jobId: null, elsewhere };
  return { jobId: ctx.pageJob };
}

function detectStart(ctx: AdvisorCtx, text: W.Text): { readonly courseId: CourseId | null } | null {
  if (!W.has(text, W.START_VERBS)) return null;
  const courses = W.coursesNamed(text);
  const skills = W.skillsNamed(text);
  const thisCourse = ctx.pageCourse !== null && W.has(text, W.THIS_WORDS);
  if (!(courses.length > 0 || skills.length > 0 || W.has(text, W.COURSE_WORDS) || thisCourse)) return null;
  if (courses.length === 1) return { courseId: courses[0]! };
  if (courses.length > 1) return { courseId: null };
  if (skills.length === 1) return { courseId: nextCourseFor(ctx, skills[0]!) };
  if (skills.length > 1) return { courseId: null };
  return { courseId: ctx.pageCourse };
}

function detectTarget(ctx: AdvisorCtx, text: W.Text): { readonly jobId: JobId | null } | null {
  if (!(W.has(text, W.TARGET_VERBS) && W.has(text, W.MY_TARGET))) return null;
  const named = W.jobsNamed(text);
  if (named.length === 1) return { jobId: named[0]! };
  if (named.length > 1) return { jobId: null };
  const thisJob = ctx.pageJob !== null && (W.has(text, W.THIS_WORDS) || W.has(text, ["اجعلها", "خلها"]));
  return { jobId: thisJob ? ctx.pageJob : null };
}

// ── Row 7: job search ──────────────────────────────────────────────────────────────────────────────────────────────

const JOB_FIELD_KEYS = Object.keys(W.FIELD_WORDS) as JobFieldId[];
const CITY_KEYS = Object.keys(W.CITY_WORDS) as JobCityId[];

function earliest<K extends string>(text: W.Text, table: Readonly<Record<K, readonly string[]>>, keys: readonly K[], outside?: { start: number; end: number } | null): K | null {
  let best: { key: K; start: number } | null = null;
  for (const key of keys) {
    for (const hit of W.hits(text, table[key])) {
      if (outside && hit.start >= outside.start && hit.end <= outside.end) continue;
      if (best === null || hit.start < best.start) best = { key, start: hit.start };
      break;
    }
  }
  return best ? best.key : null;
}

type SearchDetection =
  | { readonly kind: "best" }
  | { readonly kind: "open-job"; readonly jobId: JobId }
  | {
      readonly kind: "search";
      readonly filters: { readonly query?: string; readonly city?: JobCityId; readonly field?: JobFieldId };
      readonly show: boolean;
    };

function detectSearch(text: W.Text): SearchDetection | null {
  if (!W.has(text, W.JOBS_WORDS)) return null;
  if (W.has(text, W.BEST_WORDS)) return { kind: "best" };
  const show = W.has(text, W.OPEN_WORDS);
  const named = W.jobsNamed(text);
  // «افتح وظيفة محلل بيانات»: one job, asked for in the singular with an open word, opens that job (row 8's reading).
  if (show && named.length === 1 && !W.has(text, W.JOBS_PLURAL)) return { kind: "open-job", jobId: named[0]! };
  const titleSpan = named[0] ? W.jobTitleHit(text, named[0]) : null;
  const field = earliest(text, W.FIELD_WORDS, JOB_FIELD_KEYS, titleSpan);
  const city = earliest(text, W.CITY_WORDS, CITY_KEYS);
  let query: string | undefined = named[0] ? getJob(named[0]).title : undefined;
  if (!query && !field) {
    // «وظائف في/لدى/عند {anything else}» searches that as a query (so a real company answers "nothing found").
    const prep = W.firstHit(text, W.SEARCH_PREPOSITIONS);
    if (prep) {
      const rest = text.words.slice(prep.end).join(" ").trim();
      if (rest && !city) query = rest;
    }
  }
  if (!query && !field && !city) return null;
  return {
    kind: "search",
    filters: { ...(query ? { query } : {}), ...(city ? { city } : {}), ...(field ? { field } : {}) },
    show,
  };
}

// ── Row 8: open a page ─────────────────────────────────────────────────────────────────────────────────────────────

const PAGE_KEYS = Object.keys(W.PAGE_WORDS) as (keyof typeof W.PAGE_WORDS)[];

/** «الدليل» written as such (not the vocative «يا دليل»): «افتح الدليل», «افتح دليله». */
const GUIDE_EXACT: ReadonlySet<string> = new Set(["الدليل", "والدليل", "دليله", "دليلها", "guide"]);

function detectOpen(ctx: AdvisorCtx, text: W.Text): NavTarget | null {
  if (W.has(text, W.UPLOAD_WORDS) && W.has(text, W.CV_WORDS)) return { screen: "cv" };
  if (!W.has(text, W.OPEN_WORDS)) return null;
  const jobs = W.jobsNamed(text);
  if (jobs[0]) return { screen: "job", jobId: jobs[0] };
  const courses = W.coursesNamed(text);
  if (courses[0]) return { screen: "course", courseId: courses[0] };
  // «افتح دليل Power BI» / «افتح دورة الإحصاء»: the guide page of that skill's next step (a skill word: the tree)
  const courseWord = W.has(text, W.COURSE_WORDS);
  const guideWord = W.has(text, W.GUIDE_WORDS);
  const skill = W.skillsNamed(text)[0] ?? (courseWord || guideWord ? W.skillsAsked(text)[0] : undefined);
  if (skill) {
    const courseId = nextCourseFor(ctx, skill);
    if (courseId && courseWord) return { screen: "course", courseId };
    if (W.has(text, W.SKILL_WORDS)) return { screen: "skills", skill };
    if (courseId && guideWord) return { screen: "course", courseId };
  }
  const page = earliest(text, W.PAGE_WORDS, PAGE_KEYS);
  if (page) return { screen: page };
  // «افتح الدليل» with no skill: the guide of the next step, else the guides list
  if (text.words.some((w) => GUIDE_EXACT.has(w))) {
    const step = ctx.nextStep;
    return step.rule === 2 || step.rule === 3 ? { screen: "course", courseId: step.courseId } : { screen: "learn" };
  }
  return null;
}

// ── The learning guides (20 Nov 2026: «دليلك» knows the guides) ───────────────────────────────────────────────────

/** What a guide question asks for, or null: who to follow, what to read, where to learn (the top pick). */
function guideAsk(text: W.Text): GuideAsk | null {
  if (W.has(text, W.FOLLOW_WORDS) && !W.has(text, W.FOLLOW_UP_WORDS)) return "follow";
  if (W.has(text, W.READ_WORDS) && !W.has(text, W.CV_WORDS)) return "read";
  if (W.has(text, W.LEARN_WHERE_WORDS)) return "where";
  // «أفضل كورس SQL», «ترشح لي دورة إكسل؟»
  if (W.has(text, W.COURSE_WORDS) && (W.has(text, W.BEST_WORDS) || W.has(text, W.RECOMMEND_WORDS))) return "where";
  return null;
}

const GUIDE_FIELD_KEYS: readonly FieldId[] = [...(Object.keys(W.FIELD_WORDS) as JobFieldId[]), "professional"];
const GUIDE_FIELD_WORDS: Readonly<Record<FieldId, readonly string[]>> = { ...W.FIELD_WORDS, ...W.GUIDE_FIELD_EXTRA };

/** A field's skill for this user: the next step's when it is in that field, else the first on their path, else the first. */
function fieldSkill(ctx: AdvisorCtx, field: FieldId): SkillId {
  const step = ctx.nextStep;
  if (step.rule === 2 || step.rule === 3) {
    const skill = getCourse(step.courseId).skill;
    if (getSkill(skill).field === field) return skill;
  }
  const stages = (ctx.roadmap?.stages ?? []).filter((s) => getSkill(s.skill).field === field);
  const onPath = stages.find((s) => s.state !== "done") ?? stages[0];
  if (onPath) return onPath.skill;
  return SKILLS.find((s) => s.field === field)?.id ?? SKILLS[0]!.id;
}

/**
 * The guide a question is about: a skill named (however it is said: «باوربي», «اكسل»), else a field named (its skill for
 * this user), else the next step. Null: «where» with no learning step to point at (before the CV, ready to apply, done),
 * answered by the next step itself.
 */
function guidePick(ctx: AdvisorCtx, text: W.Text, ask: GuideAsk): GuidePick | null {
  const skill = W.skillsAsked(text)[0];
  if (skill) {
    const courseId = nextCourseFor(ctx, skill);
    return courseId ? { by: "skill", courseId } : null;
  }
  const field = earliest(text, GUIDE_FIELD_WORDS, GUIDE_FIELD_KEYS);
  if (field) {
    const courseId = nextCourseFor(ctx, fieldSkill(ctx, field));
    return courseId ? { by: "field", field, courseId } : null;
  }
  const step = ctx.nextStep;
  if (step.rule === 2 || step.rule === 3) return { by: "next", courseId: step.courseId };
  // who to follow / what to read before the CV or after the path: the target's field still has a guide
  if (ask !== "where" && ctx.target) {
    const targetField = getJob(ctx.target).field;
    const courseId = nextCourseFor(ctx, fieldSkill(ctx, targetField));
    return courseId ? { by: "field", field: targetField, courseId } : null;
  }
  return null;
}

// ── 5.8 fixed answers, typed (matched before the general intents) ─────────────────────────────────────────────────

const WHY_ONLY = ["لماذا", "ليش", "ليه", "وش سبب", "why"];
const HOW = ["كيف", "شلون", "how"];

function asksAboutMatch(text: W.Text): boolean {
  return W.has(text, W.MATCH_WORDS) || text.n.includes("%");
}

function detectFixed(ctx: AdvisorCtx, text: W.Text): Reply | null {
  if (W.has(text, WHY_ONLY) && W.has(text, W.WHY_PATH_GOAL) && !asksAboutMatch(text)) return whyPathReply(ctx);
  if (W.has(text, W.REMAINING_ASK) && W.has(text, W.REMAINING_LEFT) && W.has(text, W.REMAINING_GOAL)) return remainingReply(ctx);
  if (W.has(text, HOW) && W.has(text, W.STARS_HOW_VERB) && W.has(text, W.STARS_HOW_OBJECT)) return reply(T.starsHow());
  if (W.has(text, W.CV_WHAT_ASK) && W.has(text, W.CV_WHAT_VERB) && W.has(text, W.CV_WORDS)) return reply(T.cvWhat());
  if (W.has(text, W.NO_CV) && W.has(text, W.CV_WORDS)) return reply(T.cvNone());
  if (W.has(text, HOW) && W.has(text, W.LEVEL_HOW_VERB) && W.has(text, W.LEVEL_WORDS)) return levelHowReply(ctx);
  return null;
}

// ── Rows 9-21 (the local brain) ────────────────────────────────────────────────────────────────────────────────────

function detectCourseQuestion(ctx: AdvisorCtx, text: W.Text): Reply | null {
  const named = W.coursesNamed(text);
  const skills = W.skillsNamed(text);
  const namedCourse = named.length === 1 ? named[0]! : skills.length === 1 ? nextCourseFor(ctx, skills[0]!) : null;
  if (W.has(text, W.COURSE_GAIN_WORDS)) {
    const course = ctx.pageCourse ?? (W.has(text, W.COURSE_WORDS) ? namedCourse : null);
    if (course) return courseGainReply(ctx, course);
  }
  if (W.has(text, W.PATH_COURSES_WORDS)) return pathCoursesRoute(ctx);
  if (W.has(text, W.SHORT_COURSES_WORDS)) return shortCoursesRoute(ctx);
  if (W.has(text, W.COURSE_WORDS) && named.length === 1) return courseWhatRoute(ctx, named[0]!);
  // on a guide's page: «وش ذي الدورة؟», «وش في ذا الدليل؟» («الدليل» as written, not the vocative «يا دليل»)
  const guideWord = text.words.some((w) => GUIDE_EXACT.has(w));
  if (ctx.pageCourse && (W.has(text, W.COURSE_WORDS) || W.has(text, W.THIS_WORDS) || guideWord)) return courseWhatRoute(ctx, ctx.pageCourse);
  if (W.has(text, W.COURSE_WORDS) && namedCourse) return courseWhatRoute(ctx, namedCourse);
  return null;
}

function openRow(ctx: AdvisorCtx, text: W.Text): { intent: AdvisorIntent; reply: Reply } {
  // Row 9: explain the match (the job on screen, else the target).
  if (W.has(text, W.WHY_WORDS) && asksAboutMatch(text)) return { intent: "explain-match", reply: explainRoute(ctx, ctx.focusJob) };
  // Row 10: the gap.
  if (W.has(text, W.GAP_WORDS)) return { intent: "gap", reply: gapRoute(ctx, ctx.focusJob) };
  // Row 11: next step.
  if (W.has(text, W.NEXT_STEP_WORDS)) return { intent: "next-step", reply: nextStepRoute(ctx) };
  // Row 12: a course.
  const course = detectCourseQuestion(ctx, text);
  if (course) return { intent: "course", reply: course };
  // Row 13: leaderboard.
  if (W.has(text, W.LEADERBOARD_WORDS)) {
    return { intent: "leaderboard", reply: W.has(text, W.RANK_GAP_WORDS) ? rankGapRoute(ctx) : climbRoute(ctx) };
  }
  // Row 14: XP, level, streak.
  if (W.has(text, W.XP_WORDS)) {
    const streakOnly = W.has(text, W.STREAK_WORDS) && !W.has(text, ["نقاطي", "كم XP", "مستواي", "المستوى"]);
    return { intent: "xp-level", reply: streakOnly ? streakReply(ctx) : xpLevelReply(ctx) };
  }
  // Row 15: badges, or the fixed answer on stars.
  if (W.has(text, W.BADGE_WORDS)) return { intent: "badges", reply: badgesRoute(ctx) };
  if (W.has(text, W.STARS_WORDS)) return { intent: "badges", reply: reply(T.starsHow()) };
  // Row 16: applications.
  if (W.has(text, W.APPLICATIONS_WORDS)) return { intent: "applications", reply: applicationsRoute(ctx) };
  // Row 17: the CV (no open word reached here); «كيف أكتب سيرة قوية؟» gets writing advice
  if (W.has(text, W.CV_WORDS)) {
    if (W.has(text, W.CV_WRITE_WORDS) && !W.has(text, W.NO_CV)) return { intent: "cv", reply: reply(T.cvTips()) };
    return { intent: "cv", reply: reply(W.has(text, W.NO_CV) ? T.cvNone() : T.cvWhat()) };
  }
  // Row 18: greeting.
  if (W.has(text, W.GREETING_WORDS)) return { intent: "greeting", reply: greetingReply(ctx, W.has(text, W.GREETING_SALAM)) };
  // Row 19: thanks.
  if (W.has(text, W.THANKS_WORDS)) return { intent: "thanks", reply: reply(T.thanks()) };
  // Row 20: who are you.
  if (W.has(text, W.WHO_WORDS)) return { intent: "who", reply: reply(T.who()) };
  // Worry, fear, frustration («أنا خايف ما ألقى وظيفة»): comfort first, then the real next step with its numbers.
  if (W.has(text, W.FEELING_WORDS)) {
    const next = nextStepRoute(ctx);
    const [first, ...rest] = next.text;
    return { intent: "feelings", reply: { ...next, text: [`${T.feelingsLead()} ${first ?? ""}`.trim(), ...rest] } };
  }
  // «عطني نصيحة للمقابلة»
  if (W.has(text, W.INTERVIEW_WORDS)) return { intent: "interview", reply: reply(T.interviewTips(ctx.targetTitle ?? null)) };
  // Row 21: anything else.
  return { intent: "fallback", reply: fallbackReply() };
}

// ── Acknowledgements: «تمام», «طيب», «اوكي» (and a plain «لا») ────────────────────────────────────────────────────

/** "yes" / "no" when the message is made ONLY of acknowledgement (or no) words and fillers; otherwise null. */
function detectAck(text: W.Text): "yes" | "no" | null {
  const count = text.words.length;
  if (count === 0 || count > 6) return null;
  const yes = W.hits(text, W.ACK_WORDS);
  const no = W.hits(text, W.NO_WORDS);
  if ((yes.length > 0) === (no.length > 0)) return null; // neither, or both («لا تمام»): not an acknowledgement
  const covered: boolean[] = new Array<boolean>(count).fill(false);
  const cover = (list: readonly { readonly start: number; readonly end: number }[]) => {
    for (const h of list) for (let i = h.start; i < h.end; i++) covered[i] = true;
  };
  cover(yes);
  cover(no);
  cover(W.hits(text, W.ACK_FILLERS));
  // «تمام شكراً» stays a thanks (row 19); «لا شكراً» is a polite no.
  if (no.length > 0) cover(W.hits(text, W.NO_FILLERS));
  return covered.every(Boolean) ? (yes.length > 0 ? "yes" : "no") : null;
}

interface Offer {
  readonly yes: Chip;
  readonly no: Chip | null;
}

/** The yes / no chips of a reply whose words are exactly `said` (the newest «دليلك» message), or null. */
function offerIn(r: Reply, said: string): Offer | null {
  if (r.text.join("\n\n").trim() !== said) return null;
  const yes = r.chips.find((c) => c.role === "yes");
  return yes ? { yes, no: r.chips.find((c) => c.role === "no") ?? null } : null;
}

function quietly(build: () => Reply): Reply | null {
  try {
    return build();
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
}

/**
 * The offer the newest «دليلك» message made, if it was one with yes / no chips. History carries text only, so the offer
 * is rebuilt: every offer is a pure function of (facts, page, the user's message), and the facts do not change between
 * an offer and its answer (an offer runs no action). Tried in order: the reply to the previous user message read again ·
 * the next step and the two refusals that offer it (the chips' labels read as text may route elsewhere) · a model
 * turn's offers by their exact words (5.4) · the under-60% offer by its match, when exactly one unapplied job has it.
 */
function previousOffer(request: AdvisorRequest, ctx: AdvisorCtx): Offer | null {
  const history = request.history;
  const last = history[history.length - 1];
  if (!last || last.role !== "daleel") return null;
  const said = last.text.trim();
  if (!/[؟?]$/.test(said)) return null; // every offer ends with its question

  const previousUser = [...history].reverse().find((m) => m.role === "user");
  const candidates: (() => Reply)[] = [];
  if (previousUser) {
    const again: AdvisorRequest = { ...request, message: { text: previousUser.text }, history: [] };
    candidates.push(() => decide(again, ctx).reply);
  }
  candidates.push(
    () => nextStepRoute(ctx),
    () => completeForMeReply(ctx),
    () => grantRoute(ctx, false),
    () => grantRoute(ctx, true),
  );
  for (const build of candidates) {
    const r = quietly(build);
    const offer = r ? offerIn(r, said) : null;
    if (offer) return offer;
  }

  // A model turn turned a state-changing call into an offer (5.4): «أقدّم لك على «…»؟», «أبدأ لك خطوة …؟», «أخلّي «…» هدفك؟».
  for (const job of JOBS) {
    if (said === T.applyOffer(job.title)) return offerIn(applyOfferReply(job.id, call(ctx, "apply_to_job", { job_id: job.id }), ctx), said);
    if (said === T.targetOffer(job.title)) {
      return offerIn(targetOfferReply(ctx, job.id, call(ctx, "set_target_job", { job_id: job.id })), said);
    }
  }
  // a step offer names the skill: it is that skill's next step
  for (const skill of SKILLS) {
    if (said !== T.startOffer(skill.name)) continue;
    const courseId = nextCourseFor(ctx, skill.id);
    if (courseId) return offerIn(startOfferReply(ctx, courseId, call(ctx, "start_course", { course_id: courseId })), said);
  }

  // «مطابقتك مع هذه الوظيفة 53% فقط…» names no job: it is the one unapplied job with that match, if only one has it.
  const low = ctx.ranked.filter((j) => j.match < MATCH_LINE && T.applyLowMatch(j.match) === said);
  const unapplied = low.filter((j) => !ctx.facts.applications.some((a) => a.jobId === j.jobId));
  if (unapplied.length === 1) {
    const jobId = unapplied[0]!.jobId;
    return offerIn(applyReply(ctx, jobId, call(ctx, "apply_to_job", { job_id: jobId })), said);
  }
  return null;
}

/**
 * Acknowledgements (before row 21, always the router: a yes may run an action, which only a router turn may do). After an
 * offer with yes / no chips, «تمام» is its yes chip and «لا» its no; otherwise a short warm line, and the page chips
 * return (the reply carries none).
 */
function ackRoute(request: AdvisorRequest, ctx: AdvisorCtx, ack: "yes" | "no"): Reply {
  const offer = previousOffer(request, ctx);
  if (!offer) return reply(T.ackIdle());
  if (ack === "yes") return chipRoute(ctx, offer.yes.payload);
  if (!offer.no || offer.no.payload.intent === "not_now") return reply(T.notNow());
  // «لا» to «هل أقدّم على أي حال؟»: nothing is opened unasked; «شاهد الفجوة» stays offered.
  return reply(T.notNow(), { chips: [{ ...offer.no, role: "chip" }] });
}

// ── The router ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One decision before it becomes events (the first-cards disclosure is added once, in routeAdvisorMessage). */
interface Decision {
  readonly kind: "router" | "open";
  readonly intent: AdvisorIntent;
  readonly reply: Reply;
}

function router(intent: AdvisorIntent, r: Reply): Decision {
  return { kind: "router", intent, reply: r };
}

function open(intent: AdvisorIntent, r: Reply): Decision {
  return { kind: "open", intent, reply: r };
}

function grantRoute(ctx: AdvisorCtx, stars: boolean): Reply {
  return grantReply(ctx, call(ctx, "recommend_next_step", {}), stars);
}

function decide(request: AdvisorRequest, ctx: AdvisorCtx): Decision {
  const chip = request.message.chip;
  if (chip) return router("chip", chipRoute(ctx, chip));

  const text = W.textOf(request.message.text);

  // «تمام» / «طيب» / «اوكي» / «لا» on their own: the answer to the last offer, or a warm line (never the fallback).
  const ack = detectAck(text);
  if (ack) return router("acknowledge", ackRoute(request, ctx, ack));

  // Row 1: refuse to complete for the user (5.5 rule 6: no such tool exists; «خلّصها عني» and «اضغط خلّصتها عني» too),
  // and to grant XP, badges or stars.
  const completeAsk = (W.has(text, W.COMPLETE_VERBS) && W.has(text, W.LESSON_WORDS)) || W.has(text, W.COMPLETE_IT);
  if (completeAsk && W.has(text, W.FOR_ME)) {
    return router("refuse-complete", completeForMeReply(ctx));
  }
  if (W.has(text, W.GIVE_ME) && W.has(text, W.GRANT_WORDS)) {
    const stars = W.has(text, W.GRANT_STAR_WORDS) && !W.has(text, ["XP", "نقاط", "النقاط", "شارة", "شارات"]);
    return router("refuse-grant", grantRoute(ctx, stars));
  }
  // Refuse to make up an employer or a job (5.1; 5.5 rule 2: ids are real).
  if (W.has(text, W.INVENT_VERBS) && W.has(text, W.INVENT_OBJECTS)) return router("refuse-invent", inventReply(ctx));
  // Row 2: is it real; real-world numbers (answered before any model, 5.1).
  if (W.has(text, W.REAL_WORDS)) return router("is-real", reply(T.isReal()));
  // The pay of a named career family (careers.ts): its published figure with the source, or "no published figure",
  // before row 2's «no market numbers» (every mode: a number is never left to a model here).
  const pay = careerSalaryReply(text);
  if (pay) return router("career", pay);
  if (W.has(text, W.REAL_NUMBER_WORDS)) return router("real-numbers", reply(T.realNumbers()));

  // Rows 4-6: the three state-changing requests (5.4), never from a question.
  if (!W.opensWithQuestion(text)) {
    const apply = detectApply(ctx, text);
    if (apply?.elsewhere) {
      return router("apply", applySearchReply(ctx, call(ctx, "search_jobs", { query: apply.elsewhere, limit: 3 })));
    }
    if (apply) return router("apply", applyRoute(ctx, apply.jobId, false));
    const start = detectStart(ctx, text);
    if (start) return router("start-course", startRoute(ctx, start.courseId));
    const target = detectTarget(ctx, text);
    if (target) return router("set-target", targetRoute(ctx, target.jobId));
  }

  // Rows 9/10 for a job named in the message (before row 7 reads the title as a search).
  const named = W.jobsNamed(text);
  if (named.length === 1) {
    if (W.has(text, W.WHY_WORDS) && asksAboutMatch(text)) return open("explain-match", explainRoute(ctx, named[0]!));
    if (W.has(text, W.GAP_WORDS)) return open("gap", gapRoute(ctx, named[0]!));
  }

  // The learning guides: the top pick, the people or the articles, and the guide page opens (every mode: real data only).
  const ask = guideAsk(text);
  if (ask) {
    const pick = guidePick(ctx, text, ask);
    return pick ? router("guide", guideReply(ctx, ask, pick)) : router("next-step", nextStepRoute(ctx));
  }

  // Row 7: job search.
  const search = detectSearch(text);
  if (search) {
    if (search.kind === "best") return router("job-search", bestJobRoute(ctx));
    if (search.kind === "open-job") return router("open-page", openPageReply(ctx, { screen: "job", jobId: search.jobId }));
    return router("job-search", searchRoute(ctx, search.filters, search.show));
  }

  // Row 8: open a page.
  const page = detectOpen(ctx, text);
  if (page) return router("open-page", openPageReply(ctx, page));

  // The fixed answers of 5.8, before the general intents («كم بقي على هدفي؟» gets its own answer).
  const fixed = detectFixed(ctx, text);
  if (fixed) return router("fixed-answer", fixed);

  // How to do something in the platform («كيف أغيّر صورتي؟»): the guide's answer, and the page where it is done opens
  // (guide.ts; Mohammed, 18 Nov 2026: "help to everything in the platform and actually open that page for you").
  const howTo = guideFor(text);
  if (howTo) {
    const how = howTo.to === null ? reply(howTo.how) : guardBlocked(ctx, reply(howTo.how, { tools: ["navigate"], action: { type: "navigate", to: howTo.to } }));
    return router("how-to", how);
  }

  // A career family named («وش يسوي مدير المنتج؟», «كيف أصير مهندس سحابة؟», «وش الشهادات اللي تفيدني في الأمن
  // السيبراني؟»), or a first-month / certificates / entry-route question about the target's family (careers.ts). After
  // every more specific row above, before the general rows (so «وش أسوي أول شهر؟» is not row 11's next step). Online the
  // model answers first, with get_career.
  const career = careerReply(ctx, text);
  if (career) return open("career", career);

  const row = openRow(ctx, text);
  // the generic «ذي برّا اللي أقدر عليه» for a message that names a platform feature («وين شاراتي؟»): the guide's
  // answer, with its page, is the local answer instead (the model still answers first when online)
  if (row.intent === "fallback") {
    const topic = guideByTopic(text);
    if (topic) {
      const how = topic.to === null ? reply(topic.how) : guardBlocked(ctx, reply(topic.how, { tools: ["navigate"], action: { type: "navigate", to: topic.to } }));
      return open("how-to", how);
    }
  }
  return open(row.intent, row.reply);
}

/**
 * Classifies the message (whole words after 4.3 normalisation; first matching row wins) and builds the router's answer:
 * status, action, text blocks from the 5.9 templates, cards and chips, in the event order of protocol.ts, WITHOUT the
 * final `done` (the caller appends it with the real mode and source). Chip roles: an offer of exactly two chips
 * (an action + «ليس الآن» / «شاهد الفجوة») is role "yes" then "no"; every other chip is role "chip" with a slug
 * (5.8 slugs for page intents, "open-{screen}" for «افتح…» chips, e.g. "open-applications", "open-path", "open-jobs").
 * Rule 7 in router turns: while `request.page.applySheetOpen || request.page.showRunning` it emits NO action event at all
 * (navigate, apply, start_course or set_target) and answers templates `blockedActionReply(the action it would have
 * emitted, facts)` instead. Rule 2: start_course refused by the tool → `startCourseRefusedLine`. A guide question
 * («وين أتعلم SQL؟») answers from the guide data and opens that skill's guide page (navigate).
 */
export function routeAdvisorMessage(request: AdvisorRequest): RouterDecision {
  const ctx = AdvisorCtx.of(request);
  let decision: Decision;
  try {
    decision = decide(request, ctx);
  } catch (error) {
    if (error instanceof NotFound) decision = router("fallback", reply(T.notFound()));
    else throw error;
  }
  const events = toEvents(withJobsDisclosure(ctx, decision.reply));
  return decision.kind === "router"
    ? { kind: "router", intent: decision.intent, events }
    : { kind: "open", intent: decision.intent, local: events };
}
