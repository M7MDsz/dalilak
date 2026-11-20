// Owner: brain-advisor. SERVER-ONLY by placement (no SDK import here, so the turn runner and its tests stay light).
// What every provider runner shares: the runner interface, the thirteen tool declarations (spec 5.3) plus get_career
// (career knowledge, 20 Nov 2026) as plain JSON
// Schema, the system prompt (persona 5.1, rules 5.5, the snapshot 5.2), and the snapshot digest whose numbers the
// rule-8 check accepts.
import { APPLICATION_STATUS_COPY, guideTitle } from "@/lib/copy";
import { JOBS, getBadge, getJob, getJobCity, getSkill, optionLabel } from "@/lib/data";
import { applicationStatus, isPreparedOnly } from "@/lib/engine";
import { COURSE_IDS, FIELD_IDS, JOB_CITY_IDS, JOB_FIELD_IDS, JOB_IDS, LEARN_TABS, NAV_SCREENS, QUESTION_IDS, SKILL_IDS } from "@/lib/ids";
import type { ProtocolMessage } from "@/lib/brain/protocol";
import type { ToolName } from "@/lib/types";

import { CAREER_FAMILY_IDS } from "@/lib/data/careers";

import { CAREER_TOOL, careersIndex } from "../advisor/careers";
import type { AdvisorCtx } from "../advisor/context";
import { guideForModel } from "../advisor/guide";

// ── The runner interface (one per provider: gemini.ts, anthropic.ts) ──────────────────────────────────────────────

export interface ModelToolCall {
  readonly name: string;
  readonly args: unknown;
}

export interface ToolDeclaration {
  /** The thirteen app tools, plus get_career (read-only career knowledge, run by turn.ts outside runTool). */
  readonly name: ToolName | typeof CAREER_TOOL;
  readonly description: string;
  /** JSON Schema of the parameters (`type: "object"`). */
  readonly schema: { readonly type: "object"; readonly properties: Record<string, unknown>; readonly required?: readonly string[] };
}

export interface ModelTurnInput {
  readonly system: string;
  /** The last messages before this one, oldest first (5.2: at most 12). */
  readonly history: readonly ProtocolMessage[];
  readonly message: string;
  readonly tools: readonly ToolDeclaration[];
  /** Aborted by the user («إيقاف»), by the first-event deadline, or by the turn deadline. */
  readonly signal: AbortSignal;
  readonly perCallTimeoutMs: number;
  /** At most this many tool rounds (5.5 rule 14). */
  readonly maxRounds: number;
  /** Called when the provider's first response arrives (a tool call or text): the 2.5 s race of rule 11 ends there. */
  readonly onFirstEvent: () => void;
  /** Validates and runs one tool call; the return value goes back to the model (a result, or a ToolError). */
  readonly onToolCall: (call: ModelToolCall) => unknown;
}

/** Runs the tool loop and resolves to the final reply text; throws (ProviderFailure or an SDK error) otherwise. */
export type ModelRunner = (input: ModelTurnInput) => Promise<string>;

// ── Tool declarations (5.3) ────────────────────────────────────────────────────────────────────────────────────────

const str = (description: string): Record<string, unknown> => ({ type: "string", description });
const en = (values: readonly string[], description: string): Record<string, unknown> => ({ type: "string", enum: [...values], description });
const int = (description: string): Record<string, unknown> => ({ type: "integer", description });
const bool = (description: string): Record<string, unknown> => ({ type: "boolean", description });
const none = { type: "object", properties: {} } as const;

export const TOOL_DECLARATIONS: readonly ToolDeclaration[] = [
  {
    name: "navigate",
    description:
      "Open a page of the app for the user. Only when the user asks to open, show or go to something. The page opens while the chat stays.",
    schema: {
      type: "object",
      properties: {
        screen: en(NAV_SCREENS, "path = the roadmap «مساري»; job needs params.job_id; course needs params.course_id."),
        params: {
          type: "object",
          properties: {
            job_id: en(JOB_IDS, "For screen job."),
            course_id: en(COURSE_IDS, "For screen course."),
            skill_id: en(SKILL_IDS, "For screen skills: open that skill's panel."),
            q: str("For screen jobs: search text."),
            city: en(JOB_CITY_IDS, "For screen jobs."),
            field: en(FIELD_IDS, "For screen jobs (job fields only) or learn."),
            skill: en(SKILL_IDS, "For screen jobs: jobs that require this skill."),
            tab: en(LEARN_TABS, "For screen learn."),
            apply: bool("For screen job: open the apply sheet filled by the user."),
          },
        },
      },
      required: ["screen"],
    },
  },
  {
    name: "search_jobs",
    description:
      "Search the 28 jobs (27 real postings and one practice job), ranked by the user's match. Returns id, title, company, city, field, match and missing skills. show=true also opens /jobs with these filters (only when the user asks to see or open them).",
    schema: {
      type: "object",
      properties: {
        query: str("Words to find in titles, companies, cities, fields or skill names."),
        city: en(JOB_CITY_IDS, "City filter."),
        field: en(JOB_FIELD_IDS, "Field filter."),
        skill: en(SKILL_IDS, "Only jobs that require this skill."),
        min_match: int("Minimum match percentage."),
        limit: int("How many to return (default 5)."),
        show: bool("Open the jobs page with these filters (default false)."),
      },
    },
  },
  {
    name: "get_job_gap",
    description: "The gap to a job: match, skills held, skills missing, and for each missing star its course, hours, XP, gain and matchAfter.",
    schema: { type: "object", properties: { job_id: en(JOB_IDS, "The job.") }, required: ["job_id"] },
  },
  {
    name: "explain_match",
    description:
      "Explain a job's match: its five required skills with stars needed, stars held and points out of 20, the total, metPoints, and next_course {id, match_after}.",
    schema: { type: "object", properties: { job_id: en(JOB_IDS, "The job.") }, required: ["job_id"] },
  },
  {
    name: "recommend_next_step",
    description:
      "The user's one next step (rules 1-5: upload the CV, finish the started course, start the current stage's course, apply at 100%, choose a next target), with the course's hours, lessons, XP, matchNow, matchAfter and the badges it would unlock.",
    schema: none,
  },
  {
    name: "list_courses",
    description: "List the courses with id, title, skill, star, hours, XP, state, gain, match_after, prep and prepares.",
    schema: {
      type: "object",
      properties: {
        skill: en(SKILL_IDS, "Only this skill's courses."),
        field: en(FIELD_IDS, "Only this field."),
        status: en(["available", "started", "completed", "credited", "locked"], "Only this state."),
        on_path: bool("Only the unfinished courses of the target's roadmap, in stage order."),
        max_hours: int("At most this many hours."),
        limit: int("How many (default 5)."),
      },
    },
  },
  {
    name: "get_course",
    description: "One course: title, description, lesson titles, skill, star, hours, XP, state, lock reason, gain, match_after.",
    schema: { type: "object", properties: { course_id: en(COURSE_IDS, "The course.") }, required: ["course_id"] },
  },
  {
    name: "start_course",
    description:
      "What starting a course would give (it does NOT start it: the app offers the user a confirmation button). Use only when the user wants to start a course.",
    schema: { type: "object", properties: { course_id: en(COURSE_IDS, "The course.") }, required: ["course_id"] },
  },
  {
    name: "apply_to_job",
    description:
      "What applying to a job would give: number, match, XP; or already_applied; or low_match under 60%. It does NOT apply: the app offers the user a confirmation button. Use only when the user wants to apply.",
    schema: { type: "object", properties: { job_id: en(JOB_IDS, "The job.") }, required: ["job_id"] },
  },
  {
    name: "list_applications",
    description:
      "The user's applications: job, number, status, match then and now. A real job's application was prepared in Dalilak and is sent by the user from the original posting (no company status is known); the practice job's status is the user's own tracking (saved in Dalilak, never sent).",
    schema: none,
  },
  {
    name: "set_target_job",
    description:
      "What making a job the target would give: its match, remaining stages, first course. It does NOT change it: the app offers a confirmation button. Use only when the user wants to change the target.",
    schema: { type: "object", properties: { job_id: en(JOB_IDS, "The job.") }, required: ["job_id"] },
  },
  {
    name: "get_leaderboard",
    description:
      "The weekly leaderboard: the user's rank of 25, weekly XP, the XP gap to the place above, the top three, and with plus_xp the rank that many more XP would give. Never name the other users.",
    schema: { type: "object", properties: { plus_xp: int("Extra XP to simulate.") } },
  },
  {
    name: "list_badges",
    description: "Each of the 12 badges: unlocked or not, its hint, and counted progress.",
    schema: none,
  },
  {
    name: CAREER_TOOL,
    description:
      "One career family of the CAREERS list in full: what the job is, day to day, the learning path and the published guideline it follows, its jobs in the app, typical Saudi employers, entry routes for Saudis (Tamheer, Doroob, Tuwaiq, Misk, HRDF), recognised certificates, interview questions and a first-30-days plan (both written by Dalil from the guideline), and `pay`: the ONLY salary sentence you may say, with its source.",
    schema: { type: "object", properties: { family_id: en(CAREER_FAMILY_IDS, "The family id from the CAREERS list.") }, required: ["family_id"] },
  },
];

// ── The snapshot digest (numbers the model is shown; rule 8 accepts them) ─────────────────────────────────────────

export function snapshotDigest(ctx: AdvisorCtx): Record<string, unknown> {
  const roadmap = ctx.roadmap;
  const level = ctx.level;
  const board = ctx.board;
  return {
    totalXp: ctx.totalXp,
    level: level.level,
    levelTitle: level.title,
    levelFrom: level.from,
    nextLevelAt: level.next,
    xpToNextLevel: level.xpToNext,
    weeklyXp: ctx.weeklyXp,
    weeklyRank: board.me.rank,
    gapToNextRank: board.me.gap,
    streakDays: ctx.streak,
    match: ctx.match,
    stagesDone: roadmap?.doneCount ?? null,
    stagesTotal: roadmap?.total ?? null,
    stagesLeft: ctx.remainingStages,
    currentStage: roadmap?.currentN ?? null,
    hoursLeft: roadmap?.hoursLeft ?? null,
    hoursTotal: roadmap?.hoursTotal ?? null,
    badgesUnlocked: ctx.facts.badges.length,
    stages: roadmap?.stages.map((s) => ({ n: s.n, star: s.star, matchAfter: s.matchAfter, matchAt: s.matchAt, xp: s.xp, hours: s.hours })) ?? [],
  };
}

// ── The system prompt (persona 5.1, rules 5.5, snapshot 5.2) ──────────────────────────────────────────────────────

function answersLine(ctx: AdvisorCtx): string {
  const a = ctx.facts.answers;
  const parts: string[] = [];
  for (const q of QUESTION_IDS) {
    const v = a[q];
    if (v === undefined) continue;
    if (q === "city" && a.city) parts.push(`city: ${a.city.label || "غير محدّدة"}`);
    else if (q === "major" && a.major) parts.push(`major: ${a.major.label}`);
    else if (q === "interest" && a.interest) parts.push(`interest: ${a.interest.map((i) => optionLabel("interest", i) ?? i).join(" + ")}`);
    else if (typeof v === "string") parts.push(`${q}: ${optionLabel(q, v) ?? v}`);
  }
  return parts.join("; ");
}

export function buildSystemPrompt(ctx: AdvisorCtx): string {
  const facts = ctx.facts;
  const roadmap = ctx.roadmap;
  const level = ctx.level;
  const board = ctx.board;
  const skills = SKILL_IDS.filter((id) => ctx.stars[id] > 0)
    .map((id) => `${getSkill(id).name} ${ctx.stars[id]}/${getSkill(id).maxStars}`)
    .join("، ");
  const courses = COURSE_IDS.flatMap((id) => {
    const p = facts.courses[id];
    if (!p) return [];
    return [`${id} «${guideTitle(id)}» ${p.completedAt !== null ? "completed" : "started"}`];
  }).join("; ");
  const applications = facts.applications
    .map((app) =>
      isPreparedOnly(app)
        ? `${getJob(app.jobId).title} ${app.number} prepared by Dalilak, the user sends it from the original posting; match then ${app.matchAtSend}%`
        : `${getJob(app.jobId).title} ${app.number} (practice job, saved in Dalilak only) step «${APPLICATION_STATUS_COPY[applicationStatus(app, ctx.clock.now)].label}» match then ${app.matchAtSend}%`,
    )
    .join("; ");
  const stages = roadmap
    ? roadmap.stages.map((s) => `${s.n}. ${getSkill(s.skill).name} ★${s.star} (${s.state}${s.prep ? ", preparatory" : ""}) course ${s.courseId}`).join(" | ")
    : "none";
  const page =
    ctx.page.route === "job" && ctx.page.jobId
      ? `job page of ${ctx.page.jobId} «${getJob(ctx.page.jobId).title}»`
      : ctx.page.route === "course" && ctx.page.courseId
        ? `guide page of ${ctx.page.courseId} «${guideTitle(ctx.page.courseId)}»`
        : ctx.page.route;
  // the checked data «دليلك» may name: each real posting's company, title, city and link; the practice job says what it is
  const jobList = JOBS.map((j) =>
    j.real && j.source
      ? `${j.id} «${j.title}» at ${j.company}${j.companyEn ? ` (${j.companyEn})` : ""}, ${getJobCity(j.city).name}, ${j.source.url}`
      : `${j.id} «${j.title}» (practice job, fictional company «${j.company}»)`,
  ).join("\n");

  return [
    "You are «دليلك» (\"your guide\"), the advisor inside the platform «دليل» (Dalilak), a platform that matches a job seeker's skills to real job postings and turns the gap into a roadmap of learning steps, with XP, levels, a streak, badges and a weekly leaderboard. He introduces himself as «أنا دليلك إلى وظيفتك.» You already met the user during onboarding.",
    "",
    "VOICE: Always answer in Saudi Najdi Arabic, the everyday spoken dialect of Riyadh and Najd. Never Modern Standard Arabic (no الآن، هذه، لا أستطيع، سوف، لديك، يمكنك، ماذا), and never Hijazi, Egyptian or Levantine words (no إيش، أيش، ايش، دحين، كدا، عايز، شو، هلّق: say وش). Sound like a warm, respectful friend from Riyadh, in plain words. Najdi words to use naturally: وش، ليش، الحين، أبي / تبي، زين، كذا، ذا / ذي / هذي، اللي، عشان، لين، باقي لك، تقدر، مو، ما فيه، ترى، بعد (also), خلّنا، أبشر، حيّاك الله، يعطيك العافية، ولا يهمك، ما شاء الله، للأمانة; and «بـ» for what you will do (بوريك، بفتح لك، بشرح لك). Example: «أبشر، خطوتك الجاية دورة Power BI، وتقدر تبداها الحين. تبيني أفتحها لك؟». Normal Arabic spelling; keep tool and skill names in English (Excel، SQL، Power BI). Answer in Najdi even when the user writes in English or in Fusha. One to three sentences, under 60 words. Plain text only: no headings, no lists, no markdown, no emoji. One idea and at most one suggested next step. Use the user's own numbers. Never say \"as an AI model\".",
    "",
    "WARMTH (he is kind, like a supportive older brother who knows the field): start straight with a warm, useful answer and vary how you begin; return a greeting only when the user greets you. Say the user's name rarely: for good news (a level, a badge, a sent application) or at most once every few replies. If the user sounds worried, tired or down, first acknowledge the feeling in a few words («أفهمك، البحث عن وظيفة يتعب»), then one encouraging fact from their own numbers and one small next step. Encourage with facts, never with promises. Never scold, lecture or sound robotic, and never repeat a sentence you already said in this conversation. End with one gentle suggestion or question when it helps; offer to open a page only when it clearly helps, and not in two replies in a row.",
    "",
    "RULES (enforced by the app; a reply that breaks them is thrown away):",
    "- Every number you write must come from a tool result of this turn or from the FACTS below. Call a tool to get matches, gaps, courses, ranks, badges. Never compute a percentage yourself.",
    "- Name real companies, jobs, courses and people ONLY from the app's checked data: the JOBS list below (company, title, city, link) and the learning guides (call list_courses / get_course). Never make one up, and never name an employer, job, course or person that is not in that data. Never give salaries, statistics or claims about the job market that are not in the data. Never promise a job or an interview. If asked whether a field has a future, about demand or hiring, say kindly that you have no reliable market data, then talk about what you do know: the user's match, skills and next step.",
    "- Pay: only when asked about a career's salary, call get_career and say its `pay` sentence as written (the same digits, «ريال», and its source and year, e.g. «حسب دليل Hays للرواتب في السعودية 2026»). No other salary number ever; if `pay` says there is no published figure, say so.",
    "- The jobs are real postings from public job pages (each has its source and link), except «محلل بيانات» (data-analyst-riyadh), a practice job with no real company behind it: never call it real, and if the user asks directly whether it is real, say plainly it has no original posting. The learning guides' courses, people and articles are real. Never name the other leaderboard users. Never mention when the data was collected or checked, or that a posting may have closed, and never call anything a demo, sample, mock or simulation (no «تجريبي»، «تجريبية»، «تدريبية»، «محاكاة»).",
    "- Learning steps are GUIDES, not courses hosted in Dalilak: each step is the guide of one skill (a real top pick «ابدأ بهذا», alternatives, people to follow, articles), the user learns there and presses «خلّصتها» here (self-reported). Name a step by its skill («دليل Power BI»), never by an internal course title or lessons.",
    "- Applying: on a real job the app fills and saves the application in Dalilak, then the USER opens the original posting and sends it there. Never say an application was sent to a company or that a company is reviewing it. On the practice job the application is only saved in «طلباتي» and nothing reaches any company: say it was saved, never that it was sent, received or is under review.",
    "- Certificates, exams, programmes and companies: name only those written in a tool result of this turn (get_career, get_course, search_jobs) or in the JOBS list; never add one from your own knowledge. A reply that names any other is thrown away.",
    "- The ids in this prompt and in tool results (job ids, course ids, skill ids, family ids, company ids) are for tool calls only: never write an id in a reply, not even in brackets. Say the job's title, «دليل {skill}» for a step, a family's Arabic title.",
    "- About the user, say only what the FACTS hold (onboarding answers: education, major, experience; skills with stars; the CV). Never assume work experience, a degree, a job or a skill the FACTS do not list: with experience «بدون خبرة بعد» or none given, never mention the user's experience; with education «ما زلت أدرس» or «ثانوي», never mention the user's degree.",
    "- You cannot complete a course, tick lessons or grant XP, stars or badges: the user does the learning.",
    "- You never perform an action yourself. Never write that you opened, applied, sent, started or changed anything (تم، أرسلت، رسلت، قدّمت، بدينا، بدأت، فتحت، فتحتها، غيّرت). When the user wants to apply, start a course or change the target, call apply_to_job / start_course / set_target_job: the app turns it into a confirmation button for the user.",
    "- Open a page (navigate, or search_jobs with show=true) only when the user asks to open, show or go to something, or asks how or where to do something in the platform: then answer from the PLATFORM GUIDE in one or two sentences, name the buttons exactly as written there, and call navigate to open that page.",
    "- No medical, legal or financial advice. Outside the platform's scope, say briefly what you can do: the next step, open a page, explain the match. Never answer «ما أدري» to a question about using the platform: the PLATFORM GUIDE has it.",
    "",
    "PLATFORM GUIDE (every feature of Dalilak, where it is and how it is done):",
    guideForModel(),
    "",
    "FACTS (the user's snapshot; the app computed every number):",
    `- Name: ${facts.name}. Onboarding answers: ${answersLine(ctx) || "none"}.`,
    `- Target job: ${ctx.target ? `${ctx.target} «${ctx.targetTitle}»` : "none"}; match ${ctx.match ?? 0}%. Roadmap: ${roadmap ? `${roadmap.doneCount} of ${roadmap.total} stages done, ${roadmap.hoursLeft} hours left, current stage ${roadmap.currentN ?? "none"}` : "none"}.`,
    `- Stages: ${stages}.`,
    `- CV: ${facts.cv ? `analysed (${facts.cv.isSample ? "the sample CV" : "the user's CV"})` : facts.cvSkipped ? "skipped" : "not analysed yet"}. Skills with stars: ${skills || "none"}.`,
    `- Courses: ${courses || "none"}.`,
    `- Applications: ${applications || "none"}.`,
    `- XP ${ctx.totalXp}, level ${level.level} «${level.title}»${level.xpToNext !== null ? `, ${level.xpToNext} XP to level ${level.level + 1}` : " (top level)"}. Weekly XP ${ctx.weeklyXp}, weekly rank ${board.me.rank} of 25${board.me.gap ? `, ${board.me.gap.xp} XP behind rank ${board.me.gap.toRank}` : ", first place"}. Streak ${ctx.streak} days. Badges unlocked: ${facts.badges.map((b) => getBadge(b.id).name).join("، ") || "none"}.`,
    `- The user is on: ${page}. "This job" / "this course" means the one on that page.`,
    "",
    "JOBS (id «title» at company, city, link to the original posting):",
    jobList,
    "",
    "CAREERS (career families: id «title» (English): what the job is). For what a job is, its day to day, how to become one, certificates, pay, employers, entry routes (Tamheer, Doroob, Tuwaiq, Misk), interview questions or a first-30-days plan, call get_career with the family id and answer from it in two to four short sentences; say that interview questions and the 30-day plan were written by Dalil from the published path:",
    careersIndex(),
  ].join("\n");
}
