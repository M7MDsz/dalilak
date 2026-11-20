// Owner: brain-advisor. The thirteen tools of spec 5.3, executed on the server against the static data and the engine
// (PURE). State-changing tools never change anything here: they return what WOULD happen; the caller turns that into an
// `action` event (router turns) or an offer with confirmation chips (model turns, 5.4).
// Simulations (recommend_next_step's badges) run the store's pure transitions on `stateFromFacts(context.facts)`
// (@/lib/store/snapshot). apply_to_job's number is engine `nextApplicationNumber(facts, clock)`, the same function the
// browser's submitApplication uses, so `expect.number` matches the real record.
import { z } from "zod";

import { nextStepLabel, stepName } from "@/lib/copy";
import { COURSES, MATCH_LINE, XP, getBadge, getCourse, getGuide, getJob, getSkill, type GuideCourse } from "@/lib/data";
import {
  applicationStatus,
  badgeProgress,
  courseOnPath,
  courseState,
  courseXp,
  jobGap,
  jobMatch,
  leaderboard,
  matchBreakdown,
  nextApplicationNumber,
  nextStep,
  nextStepTarget,
  roadmapFor,
  searchJobs,
  skillStars,
  weeklyRankFor,
  weeklyXp,
} from "@/lib/engine";
import {
  COURSE_IDS,
  FIELD_IDS,
  JOB_CITY_IDS,
  JOB_FIELD_IDS,
  JOB_IDS,
  LEARN_TABS,
  NAV_SCREENS,
  SKILL_IDS,
  isCourseId,
  isFieldId,
  isJobFieldId,
  isJobId,
  isSkillId,
} from "@/lib/ids";
import { hrefFor } from "@/lib/routes";
import { completeCourse, startCourse, submitApplication } from "@/lib/store/transitions";
import { stateFromFacts } from "@/lib/store/snapshot";
import type { BadgeId, Clock, CourseId, JobId, JobQuery, NavTarget, NextStep, UserFacts } from "@/lib/types";
import type { PageContext, ToolCourse, ToolError, ToolGuide, ToolGuideCourse, ToolJob, ToolParams, ToolResults } from "@/lib/brain/protocol";
import type { ToolName } from "@/lib/ids";

export interface ToolContext {
  readonly facts: UserFacts;
  readonly clock: Clock;
  readonly page: PageContext;
}

function unknownId(detail: string): ToolError {
  return { error: "unknown_id", detail };
}

export function isToolError(value: unknown): value is ToolError {
  return typeof value === "object" && value !== null && "error" in value && "detail" in value;
}

// ── Shared pieces (also used by the router's templates) ───────────────────────────────────────────────────────────

/** The NavTarget a navigate call (or a search with show) opens, or a ToolError for a bad screen / unknown id. */
export function navTargetFromParams(params: ToolParams["navigate"]): NavTarget | ToolError {
  const p = params.params ?? {};
  switch (params.screen) {
    case "path":
    case "cv":
    case "applications":
    case "leaderboard":
    case "profile":
      return { screen: params.screen };
    case "skills": {
      const skill = p.skill_id ?? p.skill;
      if (skill !== undefined && !isSkillId(skill)) return unknownId(`skill ${String(skill)}`);
      return skill ? { screen: "skills", skill } : { screen: "skills" };
    }
    case "jobs": {
      if (p.skill !== undefined && !isSkillId(p.skill)) return unknownId(`skill ${String(p.skill)}`);
      const field = isJobFieldId(p.field) ? p.field : undefined;
      return {
        screen: "jobs",
        ...(p.q ? { q: p.q.trim().slice(0, 100) } : {}),
        ...(p.city ? { city: p.city } : {}),
        ...(field ? { field } : {}),
        ...(p.skill ? { skill: p.skill } : {}),
      };
    }
    case "job": {
      if (!isJobId(p.job_id)) return unknownId(`job ${String(p.job_id)}`);
      return p.apply ? { screen: "job", jobId: p.job_id, apply: true } : { screen: "job", jobId: p.job_id };
    }
    case "learn": {
      const field = isFieldId(p.field) ? p.field : undefined;
      return { screen: "learn", ...(p.tab ? { tab: p.tab } : {}), ...(field ? { field } : {}) };
    }
    case "course": {
      if (!isCourseId(p.course_id)) return unknownId(`course ${String(p.course_id)}`);
      return { screen: "course", courseId: p.course_id };
    }
    default:
      return { error: "invalid_params", detail: `screen ${String(params.screen)}` };
  }
}

/**
 * A course as the tools describe it (5.3), with its place on the target's path. Since 20 Nov 2026 a course is a learning
 * step the user meets as its skill's guide, so its `title` is the step's name (the skill: «Power BI»), never the internal
 * course title the user no longer sees.
 */
export function toolCourse(courseId: CourseId, facts: UserFacts): ToolCourse {
  const course = getCourse(courseId);
  const state = courseState(courseId, facts).state;
  const onPath = courseOnPath(courseId, facts);
  const done = state === "completed" || state === "credited";
  return {
    id: course.id,
    title: stepName(course.id),
    skill: course.skill,
    star: course.star,
    hours: course.hours,
    xp: courseXp(course),
    state,
    gain: onPath && !onPath.prep && !done ? onPath.gain : 0,
    match_after: onPath ? onPath.matchAfter : null,
    prep: onPath ? onPath.prep : false,
    prepares: onPath ? onPath.prepares : null,
  };
}

function guideCourse(c: GuideCourse): ToolGuideCourse {
  return { title: c.title, provider: c.provider, lang: c.lang, price: c.price, hours: c.hours, certificate: c.certificate, why: c.why };
}

/** The guide of a course's skill, for get_course (the real items «دليلك» may name; 20 Nov 2026). */
export function toolGuide(courseId: CourseId): ToolGuide {
  const guide = getGuide(getCourse(courseId).skill);
  return {
    top_pick: guideCourse(guide.topPick),
    alternatives: guide.alternatives.map(guideCourse),
    people: guide.people.map((p) => ({ name: p.name, platform: p.platform, why: p.why })),
    articles: guide.articles.map((a) => ({ title: a.title, author: a.author, why: a.why })),
    proof: guide.proof ? guide.proof.task : null,
  };
}

/**
 * What applying to `jobId` would give now (5.3, 5.5 rules 4-5). `anyway` = the chip «قدّم على أي حال» carrying this job
 * (the second yes of rule 5): only then does a match under 60% go through, paying 0 XP.
 */
export function applyOutcome(jobId: JobId, facts: UserFacts, clock: Clock, anyway: boolean): ToolResults["apply_to_job"] {
  const existing = facts.applications.find((a) => a.jobId === jobId);
  if (existing) return { ok: false, reason: "already_applied", status: applicationStatus(existing, clock.now) };
  const match = jobMatch(jobId, facts);
  if (match < MATCH_LINE && !anyway) return { ok: false, reason: "low_match", match };
  return { ok: true, number: nextApplicationNumber(facts, clock), match, xp: match >= MATCH_LINE ? XP.job_applied : 0 };
}

/** Badges the next step would unlock, in 8.6 order, simulated with the store's pure transitions on a copy (5.3). */
export function stepBadges(step: NextStep, facts: UserFacts, clock: Clock): readonly BadgeId[] {
  try {
    const state = stateFromFacts(facts);
    switch (step.rule) {
      case 1:
        // A CV analysis cannot be simulated without a CV; its own badge is certain.
        return facts.badges.some((b) => b.id === "cv-scanned") ? [] : ["cv-scanned"];
      case 2: {
        const done = completeCourse(state, step.courseId, clock);
        return done.ok ? done.transition.consequence.badges : [];
      }
      case 3: {
        const started = startCourse(state, step.courseId, clock);
        if (!started.ok) return [];
        const done = completeCourse(started.transition.user, step.courseId, clock);
        return done.ok ? done.transition.consequence.badges : [];
      }
      case 4: {
        const sent = submitApplication(state, { jobId: step.jobId, note: "", by: "advisor" }, clock);
        return sent.ok ? sent.transition.consequence.badges : [];
      }
      case 5:
        return [];
    }
  } catch {
    return [];
  }
}

function toolJob(jobId: JobId, match: number, missing: readonly ToolJob["missing"][number][]): ToolJob {
  const job = getJob(jobId);
  return { id: job.id, title: job.title, company: job.company, city: job.city, field: job.field, match, missing };
}

// ── The thirteen handlers ──────────────────────────────────────────────────────────────────────────────────────────

type Handlers = { [K in ToolName]: (params: ToolParams[K], context: ToolContext) => ToolResults[K] | ToolError };

const HANDLERS: Handlers = {
  navigate(params) {
    const target = navTargetFromParams(params);
    return isToolError(target) ? target : { route: hrefFor(target) };
  },

  search_jobs(params, { facts }) {
    if (params.skill !== undefined && !isSkillId(params.skill)) return unknownId(`skill ${String(params.skill)}`);
    const query: JobQuery = {
      ...(params.query?.trim() ? { q: params.query.trim().slice(0, 100) } : {}),
      ...(params.city ? { city: params.city } : {}),
      ...(params.field ? { field: params.field } : {}),
      ...(params.skill ? { skill: params.skill } : {}),
    };
    const minMatch = typeof params.min_match === "number" ? params.min_match : 0;
    const found = searchJobs(facts, query).filter((j) => j.match >= minMatch);
    const limit = Math.max(1, Math.min(20, Math.round(params.limit ?? 5)));
    return { jobs: found.slice(0, limit).map((j) => toolJob(j.jobId, j.match, j.missing)), total: found.length };
  },

  get_job_gap(params, { facts }) {
    if (!isJobId(params.job_id)) return unknownId(`job ${String(params.job_id)}`);
    return jobGap(params.job_id, facts);
  },

  explain_match(params, { facts }) {
    if (!isJobId(params.job_id)) return unknownId(`job ${String(params.job_id)}`);
    const breakdown = matchBreakdown(getJob(params.job_id), skillStars(facts));
    const row = jobGap(params.job_id, facts).rows.find((r) => !r.prep);
    return { ...breakdown, next_course: row ? { id: row.courseId, match_after: row.matchAfter } : null };
  },

  recommend_next_step(_params, { facts, clock }) {
    const step = nextStep(facts);
    const courseId = step.rule === 2 || step.rule === 3 ? step.courseId : null;
    const course = courseId ? getCourse(courseId) : null;
    return {
      step,
      label: nextStepLabel(step),
      route: hrefFor(nextStepTarget(step)),
      course: course ? { id: course.id, hours: course.hours, lessons: course.lessons.length, xp: courseXp(course) } : null,
      badges: stepBadges(step, facts, clock),
    };
  },

  list_courses(params, { facts }) {
    if (params.skill !== undefined && !isSkillId(params.skill)) return unknownId(`skill ${String(params.skill)}`);
    let ids: readonly CourseId[];
    if (params.on_path) {
      const roadmap = facts.targetJobId ? roadmapFor(facts.targetJobId, facts) : null;
      ids = roadmap ? roadmap.stages.filter((s) => s.state !== "done").map((s) => s.courseId) : [];
    } else {
      ids = COURSES.map((c) => c.id);
    }
    const courses = ids
      .map((id) => toolCourse(id, facts))
      .filter((c) => (params.skill ? c.skill === params.skill : true))
      .filter((c) => (params.field ? getSkill(c.skill).field === params.field : true))
      .filter((c) => (params.status ? c.state === params.status : true))
      .filter((c) => (typeof params.max_hours === "number" ? c.hours <= params.max_hours : true));
    const limit = Math.max(1, Math.min(COURSE_IDS.length, Math.round(params.limit ?? 5)));
    return { courses: courses.slice(0, limit) };
  },

  get_course(params, { facts }) {
    if (!isCourseId(params.course_id)) return unknownId(`course ${String(params.course_id)}`);
    const course = getCourse(params.course_id);
    const info = courseState(params.course_id, facts);
    // a learning step: the skill's description and its real guide, no made-up lessons (20 Nov 2026)
    return {
      ...toolCourse(params.course_id, facts),
      description: getSkill(course.skill).description,
      lessons: [],
      lock: info.state === "locked" ? info.lock : null,
      guide: toolGuide(params.course_id),
    };
  },

  start_course(params, { facts, clock }) {
    if (!isCourseId(params.course_id)) return unknownId(`course ${String(params.course_id)}`);
    const outcome = startCourse(stateFromFacts(facts), params.course_id, clock);
    if (!outcome.ok) {
      return outcome.reason === "locked"
        ? { ok: false, reason: "locked", lock: outcome.lock }
        : { ok: false, reason: outcome.reason };
    }
    const course = getCourse(params.course_id);
    if (outcome.already) {
      const progress = facts.courses[params.course_id];
      return { ok: true, already: true, ticked: progress?.ticked.length ?? 0, total: course.lessons.length };
    }
    const onPath = courseOnPath(params.course_id, facts);
    return {
      ok: true,
      already: false,
      hours: course.hours,
      lessons: course.lessons.length,
      xp: courseXp(course),
      match_after: onPath ? onPath.matchAfter : null,
    };
  },

  apply_to_job(params, { facts, clock }) {
    if (!isJobId(params.job_id)) return unknownId(`job ${String(params.job_id)}`);
    return applyOutcome(params.job_id, facts, clock, false);
  },

  list_applications(_params, { facts, clock }) {
    return {
      applications: facts.applications.map((a) => ({
        job_id: a.jobId,
        number: a.number,
        status: applicationStatus(a, clock.now),
        match_then: a.matchAtSend,
        match_now: jobMatch(a.jobId, facts),
      })),
    };
  },

  set_target_job(params, { facts }) {
    if (!isJobId(params.job_id)) return unknownId(`job ${String(params.job_id)}`);
    if (facts.targetJobId === params.job_id) return { ok: false, reason: "already_target" };
    const roadmap = roadmapFor(params.job_id, facts);
    const left = roadmap.stages.filter((s) => s.state !== "done");
    return {
      ok: true,
      job_id: params.job_id,
      match: roadmap.match,
      remaining: left.length,
      first_course: left[0]?.courseId ?? null,
    };
  },

  get_leaderboard(params, { facts, clock }) {
    const board = leaderboard(facts, clock);
    const plus = typeof params.plus_xp === "number" && params.plus_xp > 0 ? params.plus_xp : null;
    return {
      rank: board.me.rank,
      weekly_xp: board.me.weeklyXp,
      gap: board.me.gap ? board.me.gap.xp : null,
      top3: board.top3.map((row) => ({ rank: row.rank, weekly_xp: row.weeklyXp })),
      rank_with_plus: plus === null ? null : weeklyRankFor(weeklyXp(facts, clock) + plus),
    };
  },

  list_badges(_params, { facts, clock }) {
    return {
      badges: badgeProgress(facts, clock).map((p) => ({
        id: p.id,
        unlocked: p.unlocked,
        hint: getBadge(p.id).hint,
        have: p.have,
        need: p.need,
      })),
    };
  },
};

/** Runs one tool after validating its params (unknown ids → ToolError "unknown_id", 5.5 rule 2). */
export function runTool<N extends ToolName>(name: N, params: ToolParams[N], context: ToolContext): ToolResults[N] | ToolError {
  const handler: Handlers[N] = HANDLERS[name];
  try {
    return handler(params, context);
  } catch (error) {
    return { error: "invalid_params", detail: error instanceof Error ? error.message : String(error) };
  }
}

// ── Model-side validation: a model's raw arguments → typed params, or a ToolError (5.5 rule 2) ────────────────────

const jobIdSchema = z.enum(JOB_IDS);
const courseIdSchema = z.enum(COURSE_IDS);
const skillIdSchema = z.enum(SKILL_IDS);

const PARAM_SCHEMAS = {
  navigate: z.object({
    screen: z.enum(NAV_SCREENS),
    params: z
      .object({
        job_id: jobIdSchema.optional(),
        course_id: courseIdSchema.optional(),
        skill_id: skillIdSchema.optional(),
        q: z.string().max(100).optional(),
        city: z.enum(JOB_CITY_IDS).optional(),
        field: z.enum(FIELD_IDS).optional(),
        skill: skillIdSchema.optional(),
        tab: z.enum(LEARN_TABS).optional(),
        apply: z.boolean().optional(),
      })
      .optional(),
  }),
  search_jobs: z.object({
    query: z.string().max(100).optional(),
    city: z.enum(JOB_CITY_IDS).optional(),
    field: z.enum(JOB_FIELD_IDS).optional(),
    skill: skillIdSchema.optional(),
    min_match: z.number().min(0).max(100).optional(),
    limit: z.number().int().min(1).max(20).optional(),
    show: z.boolean().optional(),
  }),
  get_job_gap: z.object({ job_id: jobIdSchema }),
  explain_match: z.object({ job_id: jobIdSchema }),
  recommend_next_step: z.object({}),
  list_courses: z.object({
    skill: skillIdSchema.optional(),
    field: z.enum(FIELD_IDS).optional(),
    status: z.enum(["available", "started", "completed", "credited", "locked"]).optional(),
    on_path: z.boolean().optional(),
    max_hours: z.number().min(0).max(100).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  get_course: z.object({ course_id: courseIdSchema }),
  start_course: z.object({ course_id: courseIdSchema }),
  apply_to_job: z.object({ job_id: jobIdSchema }),
  list_applications: z.object({}),
  set_target_job: z.object({ job_id: jobIdSchema }),
  get_leaderboard: z.object({ plus_xp: z.number().min(0).max(100_000).optional() }),
  list_badges: z.object({}),
} satisfies Record<ToolName, z.ZodType>;

/** Validates a model's raw arguments for `name` (ids must exist: 5.5 rule 2). Unknown fields are dropped. */
export function parseToolParams<N extends ToolName>(name: N, raw: unknown): ToolParams[N] | ToolError {
  const schema = PARAM_SCHEMAS[name];
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const idIssue = parsed.error.issues.some((i) => /_id$|^skill$/.test(String(i.path[i.path.length - 1] ?? "")));
    return { error: idIssue ? "unknown_id" : "invalid_params", detail: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return parsed.data as ToolParams[N];
}
