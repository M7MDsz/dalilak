// Owner: engine. «أتطوّر في مجالي» / «أغيّر مجالي» built on the user's CURRENT career (owner, 21 Nov 2026: "when you shift your
// career it should ask what you are interested in and give a suggestion based on the current career"). Pure.
//   closeFields: the fields a person working in one field moves to most easily, by the skills their jobs share.
//   careerBand:  the band the path aims at: grow → one step above the user's experience; switch → a new field starts lower.
import { EXPERIENCE_BANDS, INTEREST_OPTIONS, isJobFieldId } from "@/lib/ids";
import { JOBS, SKILLS, getJob } from "@/lib/data";
import type { ExperienceBand, ExperienceOption, JobFieldId, JobId, OnboardingAnswers, SkillId } from "@/lib/types";

const BAND_OF_EXPERIENCE: Readonly<Record<ExperienceOption, ExperienceBand>> = { none: "entry", under1: "entry", "1to3": "junior", over3: "mid" };

/** The skills every field asks for (communication, English, teamwork…): they say nothing about how close two fields are. */
const SHARED_EVERYWHERE: ReadonlySet<string> = new Set(SKILLS.filter((s) => s.field === "professional").map((s) => s.id));

/** Per field: the share of its jobs that ask for each skill (professional skills left out). */
function skillShares(): ReadonlyMap<JobFieldId, ReadonlyMap<SkillId, number>> {
  const counts = new Map<JobFieldId, { jobs: number; skills: Map<SkillId, number> }>();
  for (const job of JOBS) {
    const entry = counts.get(job.field) ?? { jobs: 0, skills: new Map<SkillId, number>() };
    entry.jobs += 1;
    for (const r of job.requirements) if (!SHARED_EVERYWHERE.has(r.skill)) entry.skills.set(r.skill, (entry.skills.get(r.skill) ?? 0) + 1);
    counts.set(job.field, entry);
  }
  const out = new Map<JobFieldId, ReadonlyMap<SkillId, number>>();
  for (const [field, { jobs, skills }] of counts) out.set(field, new Map([...skills].map(([s, n]) => [s, n / jobs])));
  return out;
}

let shares: ReadonlyMap<JobFieldId, ReadonlyMap<SkillId, number>> | null = null;
function sharesOf(field: JobFieldId): ReadonlyMap<SkillId, number> {
  shares ??= skillShares();
  return shares.get(field) ?? new Map();
}

/** How much two fields' jobs ask for the same skills: Σ min(share in a, share in b) over the skills (0 = nothing shared). */
export function fieldOverlap(a: JobFieldId, b: JobFieldId): number {
  const sa = sharesOf(a);
  const sb = sharesOf(b);
  let sum = 0;
  for (const [skill, share] of sa) sum += Math.min(share, sb.get(skill) ?? 0);
  return sum;
}

/**
 * The fields closest to the user's current one (most skills shared by their jobs), among the interest tiles (so «دليلك» names
 * real options and they lead the tiles), the current field left out. Ties: the tiles' order.
 */
export function closeFields(current: JobFieldId, n = 2): JobFieldId[] {
  const tiles: JobFieldId[] = [];
  for (const option of INTEREST_OPTIONS) if (isJobFieldId(option) && option !== current) tiles.push(option);
  const bySkills = tiles
    .map((field, i) => ({ field, i, overlap: fieldOverlap(current, field) }))
    .filter((f) => f.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.i - b.i)
    .map((f) => f.field);
  // the well-known moves first (an accountant → data analysis, not HR, which the skill counts alone gave), then the skills
  const known = (KNOWN_MOVES[current] ?? []).filter((f) => tiles.includes(f));
  return [...new Set([...known, ...bySkills])].slice(0, n);
}

/** 21 Nov 2026 (owner's example: from accounting to data): the career moves people in Saudi Arabia commonly make. */
const KNOWN_MOVES: Partial<Record<JobFieldId, readonly JobFieldId[]>> = {
  business: ["data", "banking-risk"],
  "banking-risk": ["data", "business"],
  "sales-supply": ["marketing", "product"],
  marketing: ["product", "data"],
  hr: ["business", "data"],
  software: ["data", "cyber-cloud"],
  data: ["software", "product"],
  design: ["product", "marketing"],
  engineering: ["business", "data"],
  "project-controls": ["business", "data"],
  "cyber-cloud": ["software", "data"],
  product: ["data", "marketing"],
  education: ["hr", "marketing"],
  "tourism-hospitality": ["sales-supply", "marketing"],
  media: ["marketing", "design"],
  communications: ["marketing", "hr"],
};

/** The skills a job asks for that the jobs of the user's current field ask for too (professional skills left out). */
export function bridgeSkills(jobId: JobId, current: JobFieldId): SkillId[] {
  const from = sharesOf(current);
  return getJob(jobId)
    .requirements.map((r) => r.skill)
    .filter((s) => !SHARED_EVERYWHERE.has(s) && (from.get(s) ?? 0) > 0);
}

/** The current career's field when the user told it (a job field, not «مجال آخر»), else null. */
export function currentField(answers: OnboardingAnswers): JobFieldId | null {
  const value = answers.current?.value;
  return value !== undefined && isJobFieldId(value) ? value : null;
}

/** «أتطوّر في مجالي» with a known current field. */
export function growsInField(answers: OnboardingAnswers): JobFieldId | null {
  return answers.priority === "grow" ? currentField(answers) : null;
}

/** «أغيّر مجالي» with a known current field. */
export function switchesFrom(answers: OnboardingAnswers): JobFieldId | null {
  return answers.priority === "switch" ? currentField(answers) : null;
}

/**
 * The band the path aims at (spec 4.6 experience term): the user's own band, except with a known current career: grow →
 * one band above it (1to3 → mid roles: the next step up); switch → one band below it (a new field starts lower: entry or
 * junior, never mid).
 */
export function careerBand(answers: OnboardingAnswers): ExperienceBand {
  const own = EXPERIENCE_BANDS.indexOf(BAND_OF_EXPERIENCE[answers.experience ?? "none"]);
  const at = growsInField(answers) !== null ? Math.min(own + 1, 2) : switchesFrom(answers) !== null ? Math.max(own - 1, 0) : own;
  return EXPERIENCE_BANDS[at] ?? "entry";
}
