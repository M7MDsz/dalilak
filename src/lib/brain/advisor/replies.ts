// Owner: brain-advisor. «دليلك»'s replies as data: the 5.9 template filled from a tool result, with its cards and chips,
// and the event order of protocol.ts (status* → action? → text+ → card* → chips?). Used by the router (every mode) and
// by the model turn when a model's reply must be replaced by "the template for that tool" (5.5 rules 8, 9, 11). Pure.
import { APPLICATION_STATUS_COPY, guideTitle, nextStepLabel } from "@/lib/copy";
import { COMPANIES, XP, getBadge, getCourse, getField, getGuide, getJob, getSkill } from "@/lib/data";
import type { GuideCourse, GuideLang } from "@/lib/data";
import { courseOnPath, courseState, fitReasons, jobsAtCompany } from "@/lib/engine";
import type { AdvisorCard, Chip, ChipPayload, CompanyId, CourseId, FieldId, JobId, NavTarget, ToolName } from "@/lib/types";
import type { AdvisorAction, AdvisorEvent, ToolParams, ToolResults } from "@/lib/brain/protocol";

import type { AdvisorCtx } from "./context";
import { guideCourseFacts, joinAnd, openChipLabel, pageName } from "./phrasing";
import {
  T,
  TOOL_STATUS,
  applyAlreadyReply,
  blockedActionReply,
  heldStarsWord,
  lockReasonInSentence,
  needStarsWord,
  startCourseRefusedLine,
} from "./templates";

/** One reply before it becomes events. */
export interface Reply {
  /** Tools that ran, in order: one status line each (5.3). */
  readonly tools: readonly ToolName[];
  readonly action?: AdvisorAction;
  /** Paragraphs (each one `text` event, revealed block by block). */
  readonly text: readonly string[];
  readonly cards: readonly AdvisorCard[];
  readonly chips: readonly Chip[];
}

export function reply(text: string | readonly string[], extra: Partial<Omit<Reply, "text">> = {}): Reply {
  return {
    tools: extra.tools ?? [],
    ...(extra.action ? { action: extra.action } : {}),
    text: typeof text === "string" ? [text] : text,
    cards: extra.cards ?? [],
    chips: extra.chips ?? [],
  };
}

/** The events of a reply, WITHOUT `done` (the turn runner appends it with the real mode and source). */
export function toEvents(r: Reply): AdvisorEvent[] {
  const events: AdvisorEvent[] = [];
  let last: ToolName | null = null;
  for (const tool of r.tools) {
    if (tool !== last) events.push({ type: "status", tool, text: TOOL_STATUS[tool] });
    last = tool;
  }
  if (r.action) events.push({ type: "action", action: r.action });
  for (const text of r.text) if (text.trim() !== "") events.push({ type: "text", text });
  for (const card of r.cards) events.push({ type: "card", card });
  if (r.chips.length > 0) events.push({ type: "chips", chips: r.chips });
  return events;
}

/**
 * 5.5 rule 7 in router turns: while the apply sheet is open or a show is running, a reply that would emit an action
 * emits none and answers blockedActionReply(that action) instead.
 */
export function guardBlocked(ctx: AdvisorCtx, r: Reply): Reply {
  if (!r.action || !ctx.blocked) return r;
  const blocked = blockedActionReply(r.action, ctx.facts);
  return reply(blocked.text, { chips: blocked.chips });
}

// ── Chips (roles and slugs: ARCHITECTURE 8.2) ──────────────────────────────────────────────────────────────────────

export const NOT_NOW: Chip = { slug: "not-now", label: "مو الحين", role: "no", payload: { intent: "not_now" } };

function chip(slug: string, label: string, payload: ChipPayload, role: Chip["role"] = "chip"): Chip {
  return { slug, label, role, payload };
}

export function openChip(to: NavTarget, label?: string, role: Chip["role"] = "chip"): Chip {
  return chip(`open-${to.screen}`, label ?? openChipLabel(to), { intent: "open", to }, role);
}

const OPEN_COURSE = (courseId: CourseId): Chip => openChip({ screen: "course", courseId }, "افتح الدليل", "yes");
const OPEN_CV_YES: Chip = openChip({ screen: "cv" }, "افتح صفحة السيرة", "yes");
const OPEN_APPLICATIONS: Chip = openChip({ screen: "applications" }, "افتح طلباتي");
const OPEN_PATH: Chip = openChip({ screen: "path" }, "افتح مساري");
const OPEN_JOBS: Chip = openChip({ screen: "jobs" }, "افتح الوظائف");
const APPLY_YES = (jobId: JobId): Chip => chip("apply", "قدّم على ذي", { intent: "apply", jobId }, "yes");
const APPLY_CARD = (jobId: JobId): Chip => chip("apply", "قدّم على ذي", { intent: "apply", jobId });
const START_CARD = (courseId: CourseId): Chip => chip("start-course", "ابدأ الخطوة", { intent: "start_course", courseId });
const START_YES = (courseId: CourseId): Chip => chip("start-course", "ابدأ الخطوة", { intent: "start_course", courseId }, "yes");
const TARGET_CARD = (jobId: JobId): Chip => chip("set-target", "خلّها هدفي", { intent: "set_target", jobId });
const TARGET_YES = (jobId: JobId): Chip => chip("set-target", "خلّها هدفي", { intent: "set_target", jobId }, "yes");

const jobCard = (jobId: JobId, c?: Chip): AdvisorCard => (c ? { kind: "job", jobId, chip: c } : { kind: "job", jobId });
const courseCard = (courseId: CourseId, c?: Chip): AdvisorCard =>
  c ? { kind: "course", courseId, chip: c } : { kind: "course", courseId };

const title = (jobId: JobId): string => getJob(jobId).title;
const skillName = (courseId: CourseId): string => getSkill(getCourse(courseId).skill).name;

// ── Next step ──────────────────────────────────────────────────────────────────────────────────────────────────────

export function nextStepReply(ctx: AdvisorCtx, result: ToolResults["recommend_next_step"], tools: readonly ToolName[]): Reply {
  const step = result.step;
  const target = ctx.targetTitle ?? "";
  switch (step.rule) {
    case 1:
      return reply(T.nextStepCv(), { tools, chips: [OPEN_CV_YES, NOT_NOW] });
    case 2:
      // 5.2: the guide is already on screen, so no offer to open it.
      if (ctx.pageCourse === step.courseId) return reply(T.nextStepHereContinue(), { tools });
      return reply(T.nextStepContinue(skillName(step.courseId)), { tools, chips: [OPEN_COURSE(step.courseId), NOT_NOW] });
    case 3: {
      const prepares = step.prepares ? getSkill(step.prepares).name : skillName(step.courseId);
      if (ctx.pageCourse === step.courseId) {
        const text = step.prep
          ? T.nextStepHerePrep(step.xp, prepares)
          : T.nextStepHereCourse(step.xp, target, step.matchNow, step.matchAfter);
        return reply(text, { tools, chips: [START_YES(step.courseId), NOT_NOW] });
      }
      const text = step.prep
        ? T.nextStepPrep(skillName(step.courseId), step.xp, prepares)
        : T.nextStepCourse(skillName(step.courseId), step.xp, target, step.matchNow, step.matchAfter);
      return reply(text, { tools, chips: [OPEN_COURSE(step.courseId), NOT_NOW] });
    }
    case 4:
      return reply(T.nextStepApply(title(step.jobId)), { tools, chips: [APPLY_YES(step.jobId), NOT_NOW] });
    case 5:
      return reply(T.nextStepDone(target), { tools, chips: [OPEN_JOBS] });
  }
}

// ── Opening a page ─────────────────────────────────────────────────────────────────────────────────────────────────

export function openPageText(ctx: AdvisorCtx, to: NavTarget): string {
  if (to.screen === "cv") return T.openCv();
  if (to.screen === "path") {
    const roadmap = ctx.roadmap;
    if (!roadmap) return T.openPage(pageName(to));
    if (roadmap.complete) return T.openPathComplete();
    if (roadmap.gate === "current") return T.openPathBeforeCv();
    const current = roadmap.stages.find((s) => s.n === roadmap.currentN) ?? roadmap.stages.find((s) => s.state !== "done");
    if (!current) return T.openPathComplete();
    return T.openPath(current.n, roadmap.total, getSkill(current.skill).name);
  }
  return T.openPage(pageName(to));
}

export function openPageReply(ctx: AdvisorCtx, to: NavTarget): Reply {
  return guardBlocked(ctx, reply(openPageText(ctx, to), { tools: ["navigate"], action: { type: "navigate", to } }));
}

// ── Jobs ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The three jobs nearest to the user's skills (rankJobs), optionally without one id. */
export function topJobs(ctx: AdvisorCtx, count: number, without?: JobId | null): readonly JobId[] {
  return ctx.ranked
    .map((j) => j.jobId)
    .filter((id) => id !== without)
    .slice(0, count);
}

export function searchReply(
  ctx: AdvisorCtx,
  result: ToolResults["search_jobs"],
  show: NavTarget | null,
  tools: readonly ToolName[] = ["search_jobs"],
): Reply {
  if (result.total === 0 || result.jobs.length === 0) {
    return reply(T.searchNone(), { tools, cards: topJobs(ctx, 3).map((id) => jobCard(id)) });
  }
  const first = result.jobs[0]!;
  const base = result.total === 1 ? T.searchOne(first.title, first.match) : T.searchSeveral(result.total, first.title, first.match);
  const text = show ? `${base} ${T.searchShowed()}` : base;
  const cards = result.jobs.map((j) => jobCard(j.id));
  const r = reply(text, { tools, cards, ...(show ? { action: { type: "navigate", to: show } as const } : {}) });
  return guardBlocked(ctx, r);
}

export function bestJobReply(ctx: AdvisorCtx, result: ToolResults["search_jobs"]): Reply {
  const [a, b, c] = result.jobs;
  if (!a) return reply(T.searchNone(), { tools: ["search_jobs"] });
  const text = !ctx.holdsAnyStar
    ? T.bestJobNoStars(a.title)
    : b && c
      ? T.bestJob(a.title, a.match, b.title, c.title)
      : T.searchOne(a.title, a.match);
  return reply(text, { tools: ["search_jobs"], cards: result.jobs.map((j) => jobCard(j.id)) });
}

export function explainReply(result: ToolResults["explain_match"], tools: readonly ToolName[] = ["explain_match"]): Reply {
  const met = result.rows.filter((r) => r.held >= r.need);
  const partial = result.rows.filter((r) => r.held > 0 && r.held < r.need);
  const none = result.rows.filter((r) => r.held === 0);
  const parts = [T.explainIntro()];
  if (met.length > 0) parts.push(T.explainMet(joinAnd(met.map((r) => getSkill(r.skill).name)), Math.round(result.metPoints)));
  for (const r of partial) {
    parts.push(T.explainPartial(getSkill(r.skill).name, heldStarsWord(r.held), needStarsWord(r.need), Math.round(r.points)));
  }
  if (none.length > 0) parts.push(T.explainNone(joinAnd(none.map((r) => getSkill(r.skill).name))));
  if (result.total >= 100) parts.push(T.explainTotalFull());
  else if (result.next_course) parts.push(T.explainTotal(result.total, skillName(result.next_course.id), result.next_course.match_after));
  else parts.push(`المجموع ${result.total}%.`);
  return reply(parts.join(" "), { tools });
}

export function gapReply(result: ToolResults["get_job_gap"], tools: readonly ToolName[] = ["get_job_gap"]): Reply {
  const jobTitle = title(result.jobId);
  const card: AdvisorCard = { kind: "gap", jobId: result.jobId };
  if (result.missing.length === 0) return reply(T.gapNone(jobTitle), { tools, cards: [card] });
  const row = result.rows.find((r) => !r.prep) ?? result.rows[0];
  const missing = joinAnd(result.missing.map((m) => getSkill(m.skill).name));
  if (!row) return reply(T.gapNone(jobTitle), { tools, cards: [card] });
  return reply(T.gap(jobTitle, missing, skillName(row.courseId), result.match, row.matchAfter), {
    tools,
    cards: [card],
  });
}

// ── Applying ───────────────────────────────────────────────────────────────────────────────────────────────────────

export function applyReply(ctx: AdvisorCtx, jobId: JobId, result: ToolResults["apply_to_job"]): Reply {
  const tools: readonly ToolName[] = ["apply_to_job"];
  if (result.ok) {
    const action: AdvisorAction = { type: "apply", jobId, expect: { number: result.number, match: result.match, xp: result.xp } };
    return guardBlocked(
      ctx,
      reply(applyDoneText(jobId, result.number, result.match, result.xp), {
        tools,
        action,
        cards: [{ kind: "application", jobId }],
        chips: [OPEN_APPLICATIONS, OPEN_PATH],
      }),
    );
  }
  if (result.reason === "already_applied") {
    return reply(applyAlreadyReply(result.status, getJob(jobId).real), { tools, chips: [OPEN_APPLICATIONS] });
  }
  return reply(T.applyLowMatch(result.match), {
    tools,
    chips: [
      chip("apply-anyway", "قدّم ولو كذا", { intent: "apply", jobId, anyway: true }, "yes"),
      openChip({ screen: "job", jobId, focus: "missing" }, "وريني الفجوة", "no"),
    ],
  });
}

/** The line after «دليلك» applied, by job kind (20 Nov 2026): the practice job's honest send, a real job's preparation. */
function applyDoneText(jobId: JobId, number: string, match: number, xp: number): string {
  const job = getJob(jobId);
  return job.real ? T.applyPrepared(job.title, job.company, number, match, xp) : T.applySent(job.title, number, match, xp);
}

export function applyWhichReply(ctx: AdvisorCtx): Reply {
  return reply(T.applyWhich(), { tools: ["search_jobs"], cards: topJobs(ctx, 3).map((id) => jobCard(id, APPLY_CARD(id))) });
}

/**
 * «قدّم لي على وظيفة في {a company}»: the words after في / لدى / عند were searched (row 7's test). Nothing found (a real
 * employer): the search-none line, which says the data is sample data, and the three nearest jobs. Found (a sample
 * company): the search line. Either way rule 4 holds: no single title was named, so each card carries «قدّم على هذه».
 */
export function applySearchReply(ctx: AdvisorCtx, result: ToolResults["search_jobs"]): Reply {
  const tools: readonly ToolName[] = ["search_jobs"];
  const first = result.jobs[0];
  if (result.total === 0 || !first) {
    return reply(T.searchNone(), { tools, cards: topJobs(ctx, 3).map((id) => jobCard(id, APPLY_CARD(id))) });
  }
  const text = result.total === 1 ? T.searchOne(first.title, first.match) : T.searchSeveral(result.total, first.title, first.match);
  return reply(text, { tools, cards: result.jobs.slice(0, 3).map((j) => jobCard(j.id, APPLY_CARD(j.id))) });
}

/** The jobs in the order of the user's match (rankJobs), the ones it leaves out last. */
function byMatch(ctx: AdvisorCtx, jobs: readonly JobId[]): JobId[] {
  const order = new Map(ctx.ranked.map((j, i) => [j.jobId, i] as const));
  return [...jobs].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

/** Several jobs fit an apply request's words (21 Nov 2026): «على أي وحدة؟» with each one's «قدّم على ذي»; nothing runs. */
export function applyCandidatesReply(ctx: AdvisorCtx, jobs: readonly JobId[]): Reply {
  const shown = byMatch(ctx, jobs).slice(0, 4);
  return reply(T.applyWhichOf(), { tools: ["search_jobs"], cards: shown.map((id) => jobCard(id, APPLY_CARD(id))) });
}

/**
 * An apply request that names a company and none of its jobs by title (21 Nov 2026, QA: «قدم عني على وظيفة في نيوم» on
 * a job page applied to that page's job). Its jobs in the app: which one (cards with «قدّم على ذي»); none: said plainly,
 * with its careers page when companies.ts has one, and the three nearest jobs as plain cards. Never applies.
 */
export function applyCompanyReply(ctx: AdvisorCtx, companyId: CompanyId): Reply {
  const company = COMPANIES.find((c) => c.id === companyId);
  const name = company?.short ?? companyId;
  const jobs = byMatch(ctx, jobsAtCompany(companyId));
  if (jobs.length > 0) {
    return reply(T.applyCompanyWhich(name, jobs.length), {
      tools: ["search_jobs"],
      cards: jobs.slice(0, 4).map((id) => jobCard(id, APPLY_CARD(id))),
    });
  }
  return reply([T.applyCompanyNone(name, company?.careersUrl ?? null), T.applyCompanyNoneTail()], {
    tools: ["search_jobs"],
    cards: topJobs(ctx, 3).map((id) => jobCard(id)),
  });
}

/** A model asked to apply (5.4): the call becomes an offer; one tap confirms it. */
export function applyOfferReply(jobId: JobId, result: ToolResults["apply_to_job"], ctx: AdvisorCtx): Reply {
  if (!result.ok) return applyReply(ctx, jobId, result);
  return reply(T.applyOffer(title(jobId)), { tools: ["apply_to_job"], chips: [APPLY_YES(jobId), NOT_NOW] });
}

// ── Learning steps (a course is a step the user meets as the guide of its skill, 20 Nov 2026) ───────────────────────

/** The guide of the skill a course teaches. */
const guideOf = (courseId: CourseId) => getGuide(getCourse(courseId).skill);

export function startReply(ctx: AdvisorCtx, courseId: CourseId, result: ToolResults["start_course"]): Reply {
  const tools: readonly ToolName[] = ["start_course"];
  if (!result.ok) return reply(startCourseRefusedLine(result.reason, courseId, ctx.facts), { tools });
  if (result.already) {
    return guardBlocked(
      ctx,
      reply(T.courseAlreadyStarted(skillName(courseId)), {
        tools,
        action: { type: "navigate", to: { screen: "course", courseId } },
      }),
    );
  }
  const onPath = courseOnPath(courseId, ctx.facts);
  const after = onPath && !onPath.prep && result.match_after !== null && result.match_after > onPath.matchNow ? result.match_after : null;
  const top = guideOf(courseId).topPick;
  return guardBlocked(
    ctx,
    reply(T.courseStarted(skillName(courseId), top.title, top.provider, after), {
      tools,
      action: { type: "start_course", courseId },
    }),
  );
}

/** «أبشر. وش تبي تتعلّم؟ هذي خطوات مسارك.» with the path's remaining steps (up to three), each with «ابدأ الخطوة». */
export function courseWhichReply(ctx: AdvisorCtx): Reply {
  const roadmap = ctx.roadmap;
  const ids = roadmap ? roadmap.stages.filter((s) => s.state !== "done").map((s) => s.courseId).slice(0, 3) : [];
  return reply(T.courseWhich(), { tools: ["list_courses"], cards: ids.map((id) => courseCard(id, START_CARD(id))) });
}

export function startOfferReply(ctx: AdvisorCtx, courseId: CourseId, result: ToolResults["start_course"]): Reply {
  if (!result.ok) return reply(startCourseRefusedLine(result.reason, courseId, ctx.facts), { tools: ["start_course"] });
  return reply(T.startOffer(skillName(courseId)), { tools: ["start_course"], chips: [START_YES(courseId), NOT_NOW] });
}

/** True when completing the course raises the match with the target (on the path, not preparatory, not done). */
function raisesMatch(ctx: AdvisorCtx, courseId: CourseId): number | null {
  const state = courseState(courseId, ctx.facts).state;
  if (state === "completed" || state === "credited") return null;
  const info = courseOnPath(courseId, ctx.facts);
  return info && !info.prep && info.matchAfter > info.matchNow ? info.matchAfter : null;
}

/** «وش في ذا الدليل؟»: the guide's top pick (what the data says about it), and what finishing the step gives. */
export function courseWhatReply(ctx: AdvisorCtx, result: ToolResults["get_course"], tools: readonly ToolName[] = ["get_course"]): Reply {
  const guide = getGuide(result.skill);
  const top = guide.topPick;
  const head = T.courseWhat(
    getSkill(result.skill).name,
    top.title,
    top.provider,
    guideCourseFacts(top),
    result.star,
    result.xp,
    raisesMatch(ctx, result.id),
  );
  const more = T.courseWhatMore(guide.people.length > 0, guide.articles.length > 0);
  return reply(more ? `${head} ${more}` : head, { tools });
}

export function courseGainReply(ctx: AdvisorCtx, courseId: CourseId): Reply {
  const tools: readonly ToolName[] = ["get_course"];
  const state = courseState(courseId, ctx.facts).state;
  if (state === "completed" || state === "credited") return reply(startCourseRefusedLine(state, courseId, ctx.facts), { tools });
  const target = ctx.targetTitle ?? "";
  const info = courseOnPath(courseId, ctx.facts);
  if (!info) return reply(T.courseGainOffPath(target), { tools });
  if (info.prep) return reply(T.courseGainPrep(info.prepares ? getSkill(info.prepares).name : skillName(courseId)), { tools });
  return reply(T.courseGain(skillName(courseId), target, info.matchNow, info.matchAfter), { tools });
}

export function pathCoursesReply(result: ToolResults["list_courses"]): Reply {
  const tools: readonly ToolName[] = ["list_courses"];
  const [first] = result.courses;
  if (!first) return reply(T.pathCoursesNone(), { tools });
  return reply(T.pathCourses(result.courses.length, skillName(first.id)), {
    tools,
    cards: result.courses.slice(0, 5).map((c) => courseCard(c.id)),
  });
}

export function shortCoursesReply(result: ToolResults["list_courses"]): Reply {
  return reply(T.shortCourses(), { tools: ["list_courses"], cards: result.courses.slice(0, 5).map((c) => courseCard(c.id)) });
}

// ── Target ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export function targetReply(ctx: AdvisorCtx, jobId: JobId, result: ToolResults["set_target_job"]): Reply {
  const tools: readonly ToolName[] = ["set_target_job"];
  if (!result.ok) return reply(T.targetAlready(), { tools });
  const course = result.first_course ? skillName(result.first_course) : null;
  return guardBlocked(
    ctx,
    reply(T.targetChanged(title(jobId), result.match, result.remaining, course), {
      tools,
      action: { type: "set_target", jobId },
    }),
  );
}

export function targetWhichReply(ctx: AdvisorCtx): Reply {
  return reply(T.targetWhich(), {
    tools: ["search_jobs"],
    cards: topJobs(ctx, 3, ctx.target).map((id) => jobCard(id, TARGET_CARD(id))),
  });
}

export function targetOfferReply(ctx: AdvisorCtx, jobId: JobId, result: ToolResults["set_target_job"]): Reply {
  if (!result.ok) return reply(T.targetAlready(), { tools: ["set_target_job"] });
  void ctx;
  return reply(T.targetOffer(title(jobId)), { tools: ["set_target_job"], chips: [TARGET_YES(jobId), NOT_NOW] });
}

// ── Game ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export function climbReply(next: ToolResults["recommend_next_step"], board: ToolResults["get_leaderboard"]): Reply {
  const tools: readonly ToolName[] = ["recommend_next_step", "get_leaderboard"];
  if (board.gap === null) return reply(T.climbHeadFirst(board.weekly_xp), { tools });
  const head = T.climbHead(board.rank, board.weekly_xp, board.gap, board.rank - 1);
  const step = next.step;
  const tail =
    (step.rule === 2 || step.rule === 3) && next.course && board.rank_with_plus !== null
      ? T.climbCourse(skillName(step.courseId), next.course.xp, board.rank_with_plus)
      : T.climbLabel(nextStepLabel(step));
  return reply(`${head} ${tail}`, { tools });
}

export function rankGapReply(board: ToolResults["get_leaderboard"]): Reply {
  const tools: readonly ToolName[] = ["get_leaderboard"];
  return reply(board.gap === null ? T.rankFirst() : T.rankGap(board.gap, board.rank - 1), { tools });
}

export function xpLevelReply(ctx: AdvisorCtx): Reply {
  const level = ctx.level;
  if (level.xpToNext === null) return reply(T.xpLevelTop(ctx.totalXp, ctx.streak));
  return reply(T.xpLevel(ctx.totalXp, level.level, level.title, level.xpToNext, ctx.streak));
}

export function streakReply(ctx: AdvisorCtx): Reply {
  return reply(T.streak(ctx.streak));
}

export function badgesReply(next: ToolResults["recommend_next_step"], list: ToolResults["list_badges"]): Reply {
  const tools: readonly ToolName[] = ["recommend_next_step", "list_badges"];
  const [first, second] = next.badges;
  if (first) {
    const badge = getBadge(first);
    return reply(T.badgeNext(badge.name, badge.hint, second ? getBadge(second).name : null), { tools });
  }
  const locked = list.badges.find((b) => !b.unlocked);
  if (!locked) return reply(T.badgesAll(), { tools });
  const badge = getBadge(locked.id);
  return reply(T.badgeNext(badge.name, badge.hint, null), { tools });
}

export function applicationsReply(result: ToolResults["list_applications"]): Reply {
  const tools: readonly ToolName[] = ["list_applications"];
  const newestFirst = [...result.applications].reverse();
  const [newest] = newestFirst;
  if (!newest) return reply(T.applicationsNone(), { tools });
  const status = APPLICATION_STATUS_COPY[newest.status].label;
  const job = getJob(newest.job_id);
  const text = job.real
    ? newestFirst.length === 1
      ? T.applicationsOneReal(job.title, job.company)
      : T.applicationsMoreReal(newestFirst.length, job.title, job.company)
    : newestFirst.length === 1
      ? T.applicationsOne(title(newest.job_id), status)
      : T.applicationsMore(newestFirst.length, title(newest.job_id), status);
  return reply(text, { tools, cards: newestFirst.slice(0, 5).map((a) => ({ kind: "application", jobId: a.job_id }) as const) });
}

// ── Conversation and the fixed answers of 5.8 ──────────────────────────────────────────────────────────────────────

export function greetingReply(ctx: AdvisorCtx, salam: boolean): Reply {
  const parts = [salam ? T.greetingSalam(ctx.name) : T.greetingHala(ctx.name)];
  const target = ctx.targetTitle;
  if (target) {
    if (ctx.beforeCv) parts.push(T.greetingBeforeCv(target));
    else if ((ctx.match ?? 0) >= 100) parts.push(T.greetingComplete(target));
    else parts.push(T.greetingMatch(target, ctx.match ?? 0, ctx.remainingStages));
  }
  parts.push(T.greetingTail());
  return reply(parts.join(" "));
}

/** The step «أكمل الدورة عني» / «خلّصها عني» is about: the guide on screen, else the started step, else the next one. */
function courseInQuestion(ctx: AdvisorCtx): CourseId | null {
  if (ctx.pageCourse) return ctx.pageCourse;
  const step = ctx.nextStep;
  return step.rule === 2 || step.rule === 3 ? step.courseId : null;
}

export function completeForMeReply(ctx: AdvisorCtx): Reply {
  // On the course's own page there is nothing to open: he stays with the user instead (5.2).
  if (ctx.pageCourse) return reply(T.completeForMeHere());
  const course = courseInQuestion(ctx);
  return reply(T.completeForMe(), { chips: course ? [OPEN_COURSE(course), NOT_NOW] : [] });
}

/** «أعطني 500 XP» (5.7 row 1): points, badges and stars are earned; the nearest way to earn them is the next step. */
export function grantReply(ctx: AdvisorCtx, next: ToolResults["recommend_next_step"], stars: boolean): Reply {
  const tools: readonly ToolName[] = ["recommend_next_step"];
  const head = stars ? T.grantStarsHead() : T.grantHead();
  const step = next.step;
  switch (step.rule) {
    case 1:
      return reply(`${head} ${T.grantTailCv(XP.cv_analysed)}`, { tools, chips: [OPEN_CV_YES, NOT_NOW] });
    case 2:
    case 3: {
      const xp = next.course?.xp ?? getCourse(step.courseId).hours * XP.perCourseHour;
      if (ctx.pageCourse === step.courseId) return reply(`${head} ${T.grantTailHere(xp)}`, { tools });
      return reply(`${head} ${T.grantTailCourse(skillName(step.courseId), xp)}`, {
        tools,
        chips: [OPEN_COURSE(step.courseId), NOT_NOW],
      });
    }
    case 4:
      return reply(`${head} ${T.grantTailApply(title(step.jobId), XP.job_applied)}`, {
        tools,
        chips: [APPLY_YES(step.jobId), NOT_NOW],
      });
    case 5:
      return reply(`${head} ${T.grantTailDone()}`, { tools, chips: [OPEN_JOBS] });
  }
}

/** «اخترع لي شركة…»: he never makes up an employer (5.1, 5.5 rule 2); the three nearest sample jobs, each with its chip. */
export function inventReply(ctx: AdvisorCtx): Reply {
  return reply(T.inventRefusal(), { tools: ["search_jobs"], cards: topJobs(ctx, 3).map((id) => jobCard(id, APPLY_CARD(id))) });
}

export function fallbackReply(): Reply {
  return reply(T.fallback(), {
    chips: [
      chip("next-step", "وش أسوي الحين؟", { intent: "page", slug: "next-step" }),
      OPEN_PATH,
      chip("why-match", "ليش كذا مطابقتي؟", { intent: "page", slug: "why-match" }),
    ],
  });
}

export function whyPathReply(ctx: AdvisorCtx): Reply {
  if (!ctx.target) return fallbackReply();
  return reply(T.whyPath(fitReasons(ctx.target, ctx.facts.answers)));
}

export function remainingReply(ctx: AdvisorCtx): Reply {
  const roadmap = ctx.roadmap;
  const target = ctx.targetTitle;
  if (!roadmap || !target) return fallbackReply();
  if (roadmap.complete) return reply(T.remainingDone(target));
  return reply(T.remaining(ctx.remainingStages, target));
}

export function levelHowReply(ctx: AdvisorCtx): Reply {
  const level = ctx.level;
  return reply(T.levelHow(level.xpToNext, level.xpToNext === null ? null : level.level + 1));
}

// ── The learning guides («وين أتعلم SQL؟», «مين أتابع في البيانات؟», «وش أقرأ عن Power BI؟»; 20 Nov 2026) ─────────

/** What a guide question asks for: where to learn (the top pick), who to follow (people), what to read (articles). */
export type GuideAsk = "where" | "follow" | "read";

export type { GuideLang };

/**
 * Why «دليلك» picked the skill: the user named it, it is their next step, or it is their nearest skill in the field they
 * named. `courseId` is the step whose guide opens (the course of the user's next star in that skill).
 */
export type GuidePick =
  | { readonly by: "skill"; readonly courseId: CourseId }
  | { readonly by: "next"; readonly courseId: CourseId }
  | { readonly by: "field"; readonly field: FieldId; readonly courseId: CourseId };

/** The lock or all-stars note for the step that opens (the guide page says it too; one short line). */
function guideNote(ctx: AdvisorCtx, courseId: CourseId): string | null {
  const info = courseState(courseId, ctx.facts);
  if (info.state === "locked") return T.guideLocked(lockReasonInSentence(info.lock));
  if (info.state === "completed" || info.state === "credited") {
    const skill = getCourse(courseId).skill;
    if (getCourse(courseId).star >= getSkill(skill).maxStars) return T.guideAllHeld(getSkill(skill).name);
  }
  return null;
}

/**
 * A guide question answered from the guide data (real courses, people, articles; nothing invented: hours, price and a
 * certificate only when the data has them), and the guide page opens beside the chat (navigate, 5.5 rule 7 applies).
 */
export function guideReply(ctx: AdvisorCtx, ask: GuideAsk, pick: GuidePick, lang: GuideLang | null = null): Reply {
  const courseId = pick.courseId;
  const course = getCourse(courseId);
  const skill = getSkill(course.skill).name;
  const guide = getGuide(course.skill);
  const top = guide.topPick;
  // 5.2: on that guide's own page already, nothing opens and the tails say it is in front of the user
  const here = ctx.pageCourse === courseId;
  const title = here ? null : guideTitle(courseId);
  const text: string[] = [];
  let lead = false;
  if (pick.by === "next") {
    const info = courseOnPath(courseId, ctx.facts);
    const raises = info && !info.prep ? info : null;
    const started = courseState(courseId, ctx.facts).state === "started";
    text.push(T.guideLeadNext(skill, started, ctx.targetTitle, raises ? raises.matchNow : null, raises ? raises.matchAfter : null));
    lead = true;
  } else if (pick.by === "field") {
    text.push(T.guideLeadField(getField(pick.field).name, skill));
    lead = true;
  }
  switch (ask) {
    case "where": {
      // «بالعربي»: the guide's course in that language (the top pick first), or an honest "none" and the top pick
      const inLang: GuideCourse | undefined = lang ? [top, ...guide.alternatives].find((c) => c.lang === lang) : top;
      if (lang && inLang && inLang !== top) {
        text.push(`${T.guideInLang(skill, lang, inLang.title, inLang.provider, guideCourseFacts(inLang))} ${T.guideWhy(inLang.why)}`);
      } else {
        const none = lang && !inLang ? `${T.guideNoLang(skill, lang)} ` : "";
        text.push(`${none}${T.guideTop(skill, top.title, top.provider, guideCourseFacts(top), lead)} ${T.guideWhy(top.why)}`);
      }
      text.push(T.guideTopTail(title));
      break;
    }
    case "follow": {
      const people = guide.people.slice(0, 3);
      if (people.length === 0) {
        text.push(T.guidePeopleNone(skill, title, top.title, top.provider));
        break;
      }
      text.push(T.guidePeopleHead(skill, lead));
      for (const person of people) text.push(T.guidePerson(person.name, person.platform, person.why));
      text.push(T.guidePeopleTail(title));
      break;
    }
    case "read": {
      const articles = guide.articles.slice(0, 3);
      if (articles.length === 0) {
        text.push(T.guideReadNone(skill, title, top.title, top.provider));
        break;
      }
      text.push(T.guideReadHead(skill, lead));
      for (const article of articles) text.push(T.guideArticle(article.title, article.author, article.why));
      text.push(T.guideReadTail(title));
      break;
    }
  }
  const note = guideNote(ctx, courseId);
  if (note) text.push(note);
  if (here) return reply(text, { tools: ["get_course"] });
  return guardBlocked(ctx, reply(text, { tools: ["get_course", "navigate"], action: { type: "navigate", to: { screen: "course", courseId } } }));
}

// ── "The template for that tool" (model turns: 5.5 rules 8, 9, 11) ─────────────────────────────────────────────────

/** The 5.9 reply for one tool call a model made, built from that call's real result. Null when no template fits. */
export function replyForTool<N extends ToolName>(
  ctx: AdvisorCtx,
  name: N,
  params: ToolParams[N],
  result: ToolResults[N],
): Reply | null {
  // The casts below re-associate the generic name with its params/result pair (one switch arm per tool).
  switch (name) {
    case "navigate":
      return null;
    case "search_jobs":
      return searchReply(ctx, result as ToolResults["search_jobs"], null);
    case "get_job_gap":
      return gapReply(result as ToolResults["get_job_gap"]);
    case "explain_match":
      return explainReply(result as ToolResults["explain_match"]);
    case "recommend_next_step":
      return nextStepReply(ctx, result as ToolResults["recommend_next_step"], ["recommend_next_step"]);
    case "list_courses":
      return pathCoursesReply(result as ToolResults["list_courses"]);
    case "get_course":
      return courseWhatReply(ctx, result as ToolResults["get_course"]);
    case "start_course":
      return startOfferReply(ctx, (params as ToolParams["start_course"]).course_id, result as ToolResults["start_course"]);
    case "apply_to_job":
      return applyOfferReply((params as ToolParams["apply_to_job"]).job_id, result as ToolResults["apply_to_job"], ctx);
    case "list_applications":
      return applicationsReply(result as ToolResults["list_applications"]);
    case "set_target_job":
      return targetOfferReply(ctx, (params as ToolParams["set_target_job"]).job_id, result as ToolResults["set_target_job"]);
    case "get_leaderboard":
      return rankGapReply(result as ToolResults["get_leaderboard"]);
    case "list_badges": {
      const list = result as ToolResults["list_badges"];
      const locked = list.badges.find((b) => !b.unlocked);
      if (!locked) return reply(T.badgesAll(), { tools: ["list_badges"] });
      const badge = getBadge(locked.id);
      return reply(T.badgeNext(badge.name, badge.hint, null), { tools: ["list_badges"] });
    }
    default:
      return null;
  }
}
