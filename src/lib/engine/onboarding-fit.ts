// Owner: engine. The onboarding fit score and recommendation (spec 4.6). Never shown as a number (P5).
import { EXPERIENCE_BANDS, JOB_IDS, isCompanyId, isJobFieldId } from "@/lib/ids";
import { SKILLS, getCompany, getJob, getJobCity, type Company } from "@/lib/data";
import type {
  CompanyId,
  ExperienceBand,
  ExperienceOption,
  FitBreakdown,
  InterestOption,
  Job,
  JobFieldId,
  JobId,
  MajorOption,
  OnboardingAnswers,
  Recommendation,
  RevealReason,
  StarMap,
  UserFacts,
} from "@/lib/types";

import { jobsAtCompany } from "./companies";
import { matchPercent } from "./match";

/** Spec 4.6 "Major → fields": primary, then secondary; `other` has none. */
const MAJOR_FIELDS: Readonly<Record<MajorOption, readonly [JobFieldId, JobFieldId] | null>> = {
  cs: ["software", "data"],
  mis: ["data", "business"],
  business: ["business", "hr"],
  finance: ["business", "data"],
  marketing: ["marketing", "design"],
  hr: ["hr", "business"],
  design: ["design", "marketing"],
  // 21 Nov 2026 (tester): engineering and project-controls jobs exist now (wave 2), so an engineering major points there
  engineering: ["engineering", "project-controls"],
  science: ["data", "software"],
  other: null,
};

/** Spec 4.6: none and under1 → entry; 1to3 → junior; over3 → mid. An unanswered question counts as its neutral value (none). */
const BAND_OF_EXPERIENCE: Readonly<Record<ExperienceOption, ExperienceBand>> = {
  none: "entry",
  under1: "entry",
  "1to3": "junior",
  over3: "mid",
};

/** Spec 4.6 education gate: these answers leave mid-level jobs out of the ranking. */
const GATED_EDUCATION: ReadonlySet<string> = new Set(["secondary", "diploma", "student"]);

function bandIndex(band: ExperienceBand): number {
  return EXPERIENCE_BANDS.indexOf(band);
}

function userBand(answers: OnboardingAnswers): ExperienceBand {
  return BAND_OF_EXPERIENCE[answers.experience ?? "none"];
}

/** The user's experience band (spec 4.6): none / under1 → entry, 1to3 → junior, over3 → mid (unanswered: entry). */
export function userBandOf(answers: OnboardingAnswers): ExperienceBand {
  return userBand(answers);
}

/**
 * 21 Nov 2026 (tester): a job is within reach when its band is at most one above the user's (entry → entry or junior;
 * junior → up to mid). A beginner who names a company is never aimed at its senior job.
 */
export function withinReach(jobId: JobId, answers: OnboardingAnswers): boolean {
  return bandIndex(getJob(jobId).band) - bandIndex(userBand(answers)) <= 1;
}

function majorFields(answers: OnboardingAnswers): readonly [JobFieldId, JobFieldId] | null {
  return answers.major === undefined ? null : MAJOR_FIELDS[answers.major.value];
}

/** The fields the user asked for: their interests, else their major's two fields; null when they named neither. */
export function wantedFields(answers: OnboardingAnswers): ReadonlySet<JobFieldId> | null {
  const interests = new Set<JobFieldId>();
  for (const interest of answers.interest ?? []) if (isJobFieldId(interest)) interests.add(interest);
  if (interests.size > 0) return interests;
  const fields = majorFields(answers);
  return fields === null ? null : new Set(fields);
}

/** Which interest the job's field is: 0 first, 1 second, or -1. */
function interestIndex(job: Job, answers: OnboardingAnswers): number {
  return (answers.interest ?? []).findIndex((i) => i === job.field);
}

/**
 * The interest tile nearest to each job field (the six tiles are data, software, design, marketing, business, hr). A CV
 * whose strongest field has no tile of its own is offered the nearest one (21 Nov 2026).
 */
export const NEAREST_INTEREST: Readonly<Record<JobFieldId, InterestOption>> = {
  data: "data",
  software: "software",
  design: "design",
  marketing: "marketing",
  business: "business",
  hr: "hr",
  product: "business",
  "cyber-cloud": "software",
  gaming: "software",
  media: "design",
  communications: "marketing",
  education: "hr",
  "sales-supply": "business",
  engineering: "business",
  "project-controls": "business",
  "banking-risk": "business",
  legal: "business",
  "real-estate": "business",
  aviation: "business",
  "energy-sustainability": "business",
  "tourism-hospitality": "business",
  "health-admin": "business",
};

/**
 * The fields whose jobs suit this user, for the job lists (the map's column, the jobs page): the target's field, every
 * interest that is a job field, the major's main field and the CV's strongest field (21 Nov 2026, tester: a civil
 * engineer who took the «تنظيم الأعمال» tile saw business jobs at 0% while engineering jobs existed).
 */
export function suitedFieldsOf(facts: Pick<UserFacts, "answers" | "targetJobId">, stars?: StarMap): ReadonlySet<JobFieldId> {
  const fields = new Set<JobFieldId>();
  if (facts.targetJobId !== null) fields.add(getJob(facts.targetJobId).field);
  for (const interest of facts.answers.interest ?? []) if (isJobFieldId(interest)) fields.add(interest);
  const major = majorFields(facts.answers)?.[0]; // the major's main field only (its second is too wide: mis → business)
  if (major !== undefined) fields.add(major);
  const cv = cvFieldOf(stars);
  if (cv !== null) fields.add(cv);
  return fields;
}

/** A posting that says it is unpaid («غير مدفوع», "unpaid"). */
const UNPAID = /غير مدفوع|unpaid/i;

/** The job field holding the most CV stars (at least 3; ties: catalogue order), or null. */
export function cvFieldOf(stars: StarMap | undefined): JobFieldId | null {
  if (stars === undefined) return null;
  const byField = new Map<JobFieldId, number>();
  for (const skill of SKILLS) {
    const held = stars[skill.id] ?? 0;
    if (held > 0 && isJobFieldId(skill.field)) byField.set(skill.field, (byField.get(skill.field) ?? 0) + held);
  }
  let best: JobFieldId | null = null;
  let most = 0;
  for (const [field, held] of byField) if (held > most) [best, most] = [field, held];
  return most >= 3 ? best : null;
}

function termsOf(job: Job, answers: OnboardingAnswers, stars?: StarMap): FitBreakdown["terms"] {
  let interestAt = interestIndex(job, answers);
  // the user took the tile their CV pointed to (a civil engineer's CV → «تنظيم الأعمال والمشاريع»): the CV's own field
  // counts as that interest, so the path lands on an engineering job, not a business one (tester, 21 Nov 2026)
  if (interestAt === -1 && stars !== undefined) {
    const cvField = cvFieldOf(stars);
    if (cvField !== null && cvField === job.field && NEAREST_INTEREST[cvField] !== cvField && answers.interest?.[0] === NEAREST_INTEREST[cvField]) {
      interestAt = 0;
    }
  }
  const interest = interestAt === 0 ? 40 : interestAt === 1 ? 30 : 0;
  const fields = majorFields(answers);
  const major = fields === null ? 0 : job.field === fields[0] ? 25 : job.field === fields[1] ? 12 : 0;
  const distance = Math.abs(bandIndex(userBand(answers)) - bandIndex(job.band));
  const experience = distance === 0 ? 15 : distance === 1 ? 7 : 0;
  const cityValue = answers.city?.value;
  const city = cityValue !== undefined && cityValue === job.city ? 10 : job.city === "remote" ? 6 : 0;
  let priority = 0;
  // «أول وظيفة بأسرع وقت»: an entry job, but not an unpaid internship (tester, 21 Nov 2026)
  if (answers.priority === "first-job") priority = job.band === "entry" && !UNPAID.test(`${job.title} ${job.titleEn ?? ""}`) ? 10 : 0;
  else if (answers.priority === "switch") priority = interestAt >= 0 && job.field !== fields?.[0] ? 10 : 0;
  else if (answers.priority === "grow") priority = fields !== null && job.field === fields[0] ? 10 : 0;
  return { interest, major, experience, city, priority };
}

/**
 * 20 Nov 2026 (docs/ONBOARDING-FLOW.md): the CV term, added to the score when the user's real stars are known (a CV read
 * in onboarding): the match with those stars / 10, rounded (0-10). It never outweighs the answers (interest alone is 40).
 */
export function cvFitPoints(job: Job, stars: StarMap | undefined): number {
  return stars === undefined ? 0 : Math.round(matchPercent(job.requirements, stars) / 10);
}

/**
 * The five terms of 4.6 for one job (interest 40/30/0, major 25/12/0, experience 15/7/0, city 10/6/0, priority 10/0) and the
 * education gate; with `stars` (a CV), the CV term (0-10) is added to the score (the terms stay the five of 4.6).
 */
export function fitBreakdown(jobId: JobId, answers: OnboardingAnswers, stars?: StarMap): FitBreakdown {
  const job = getJob(jobId);
  const terms = termsOf(job, answers, stars);
  const score = terms.interest + terms.major + terms.experience + terms.city + terms.priority + cvFitPoints(job, stars);
  const excluded = answers.education !== undefined && GATED_EDUCATION.has(answers.education) && job.band === "mid";
  return { jobId, score, terms, excluded };
}

/** Score desc; ties: higher interest term, lower experience band, data order (spec 4.6 "Ranking"). */
export function compareFit(a: FitBreakdown, b: FitBreakdown): number {
  return (
    b.score - a.score ||
    b.terms.interest - a.terms.interest ||
    bandIndex(getJob(a.jobId).band) - bandIndex(getJob(b.jobId).band) ||
    JOB_IDS.indexOf(a.jobId) - JOB_IDS.indexOf(b.jobId)
  );
}

/** Jobs not excluded by the gate, highest score first; ties: higher interest term, lower experience band, data order. */
export function rankByFit(answers: OnboardingAnswers, stars?: StarMap): readonly FitBreakdown[] {
  return JOB_IDS.map((id) => fitBreakdown(id, answers, stars))
    .filter((f) => !f.excluded)
    .sort(compareFit);
}

/**
 * The «لماذا هذا المسار؟» reasons of 4.6 for ANY job: up to three, in 4.6 order, or the single "none" reason. recommend()
 * uses it for the recommended job; the advisor's chip `why-path` uses it for the CURRENT target (which may have been
 * changed since the reveal). Experience is a reason only for the same band (15 points); city for 10 («في مدينتك») or the
 * remote 6 («عن بُعد»).
 */
export function fitReasons(jobId: JobId, answers: OnboardingAnswers): readonly RevealReason[] {
  const job = getJob(jobId);
  const terms = termsOf(job, answers);
  const reasons: RevealReason[] = [];
  const interest = answers.interest?.[interestIndex(job, answers)];
  if (terms.interest > 0 && interest !== undefined) reasons.push({ kind: "interest", interest });
  if (terms.major > 0 && answers.major !== undefined) {
    reasons.push({ kind: "major", tier: terms.major === 25 ? "primary" : "secondary", majorLabel: answers.major.label });
  }
  if (terms.experience === 15) reasons.push({ kind: "experience", band: job.band });
  if (terms.city === 10) {
    // a place recorded as its nearest job market («شقراء» → riyadh, 20 Nov 2026) is near the job's city, not in it
    const cityName = getJobCity(job.city).name;
    const typed = answers.city?.label ?? "";
    reasons.push(typed === "" || typed === cityName ? { kind: "city", cityLabel: cityName } : { kind: "city", cityLabel: cityName, near: true });
  }
  else if (terms.city === 6) reasons.push({ kind: "remote" });
  const priority = answers.priority;
  if (terms.priority > 0 && priority !== undefined && priority !== "explore") reasons.push({ kind: "priority", priority });
  return reasons.length === 0 ? [{ kind: "none" }] : reasons.slice(0, 3);
}

/** The jobs of a company in the job data (a seam: tests pass their own). */
export type CompanyJobs = (id: CompanyId) => readonly JobId[];

/**
 * 20 Nov 2026 (owner's part 2): the job at the company the user has in mind (`answers.company`), or null when they named
 * none or the job data has no job of that company. Of several, the best fit by the 4.6 score WITHOUT the priority term
 * (the company is asked before «الأولوية», and «دليلك» names this job in his reply right then, so the reveal must land on
 * the same one); a job the education gate would leave out comes only after the others (the user chose the company).
 */
export function companyJob(answers: OnboardingAnswers, jobsAt: CompanyJobs = jobsAtCompany, stars?: StarMap): JobId | null {
  const company = answers.company;
  if (company === undefined || company === "none" || !isCompanyId(company)) return null;
  // 20 Nov 2026: only the company's jobs in the fields the user asked for (a websites user who names Tamara is not sent
  // to its collections job); none there → null, and the ranking decides as if no company was named.
  const wanted = wantedFields(answers);
  // and only the ones within reach of the user's experience (21 Nov 2026: no senior job for a beginner)
  const ids = jobsAt(company).filter((id) => (wanted === null || wanted.has(getJob(id).field)) && withinReach(id, answers));
  if (ids.length === 0) return null;
  const withoutPriority: OnboardingAnswers = { ...answers, priority: undefined };
  const fits = ids.map((id) => fitBreakdown(id, withoutPriority, stars));
  fits.sort((a, b) => Number(a.excluded) - Number(b.excluded) || compareFit(a, b));
  return fits[0]?.jobId ?? null;
}

/**
 * Recommended (rank 1), alternative 1 (rank 2), alternative 2 (best remaining job of another field) and fitReasons(recommended).
 * When the user named a company that has a job in the data, that job is the recommended one (the path reveal ends on it)
 * and the ranking's best two others are the alternatives; otherwise the ranking decides, as before.
 * `stars`: the user's real stars when a CV was read in onboarding (the CV term of `fitBreakdown`).
 */
export function recommend(answers: OnboardingAnswers, jobsAt: CompanyJobs = jobsAtCompany, stars?: StarMap): Recommendation {
  const ranked = rankByFit(answers, stars).map((f) => f.jobId);
  const aimed = companyJob(answers, jobsAt, stars);
  const order = choiceOrder(answers, ranked);
  const first = aimed ?? order[0];
  if (first === undefined) throw new Error("engine: no job to recommend");
  const [second, third] = order.filter((id) => id !== first && getJob(id).title !== getJob(first).title);
  if (second === undefined || third === undefined) throw new Error("engine: fewer than two alternatives");
  return { recommended: first, alternatives: [second, third], reasons: fitReasons(first, answers) };
}

/**
 * 21 Nov 2026 (owner: «I put I'm interested in something and what he gave me is not related to it»): the order the jobs
 * are offered in. The ranking's order, but the fields the user asked for come first (their interests, else their major's;
 * the old second alternative was picked from ANOTHER field on purpose, and that is what read as unrelated), and inside
 * them a paid job within reach of their experience before an unpaid or senior one. Every job stays in the list, so a
 * field with few jobs still fills the choices.
 */
export function choiceOrder(answers: OnboardingAnswers, ranked: readonly JobId[]): JobId[] {
  const wanted = wantedFields(answers);
  const tier = (id: JobId): number => {
    const job = getJob(id);
    const inField = wanted === null || wanted.has(job.field);
    const good = withinReach(id, answers) && !UNPAID.test(`${job.title} ${job.titleEn ?? ""}`);
    return inField ? (good ? 0 : 1) : good ? 2 : 3;
  };
  return [0, 1, 2, 3].flatMap((t) => ranked.filter((id) => tier(id) === t));
}

/**
 * The company has jobs in the fields the user asked for, but none within reach of their experience (all more senior):
 * «دليلك» says so honestly and the path goes to the best reachable job (21 Nov 2026).
 */
export function companyJobsOutOfReach(answers: OnboardingAnswers, jobsAt: CompanyJobs = jobsAtCompany): boolean {
  const company = answers.company;
  if (company === undefined || company === "none" || !isCompanyId(company)) return false;
  const wanted = wantedFields(answers);
  const inField = jobsAt(company).filter((id) => wanted === null || wanted.has(getJob(id).field));
  return inField.length > 0 && inField.every((id) => !withinReach(id, answers));
}

/**
 * 21 Nov 2026 (tester, «مهارة» first in every field): the company's best job OUTSIDE the fields the user asked for that is
 * within reach of their experience (data order), or null. The path stays in the user's field; «دليلك» names this job
 * positively and it is pinned first among the map's jobs.
 */
export function companyOtherFieldJob(answers: OnboardingAnswers, jobsAt: CompanyJobs = jobsAtCompany): JobId | null {
  const company = answers.company;
  if (company === undefined || company === "none" || !isCompanyId(company)) return null;
  const wanted = wantedFields(answers);
  return jobsAt(company).find((id) => (wanted === null || !wanted.has(getJob(id).field)) && withinReach(id, answers)) ?? null;
}

/** The company the user has in mind, with its jobs in the data and the one the path aims at. */
export interface DreamCompany {
  readonly id: CompanyId;
  readonly company: Company;
  /** Its jobs in the job data, in data order: the map's job ads pin these first. Empty when it has none there. */
  readonly jobs: readonly JobId[];
  /** companyJob: the one the onboarding path aimed at; null when the data has none of its jobs. */
  readonly job: JobId | null;
}

/**
 * The selector of «الشركة اللي في بالك» (onboarding step 7, «ملفي»): null for «لا، مو الحين», for an account saved before
 * the question existed, and for anything that is not a known company.
 */
export function dreamCompany(facts: Pick<UserFacts, "answers">, jobsAt: CompanyJobs = jobsAtCompany): DreamCompany | null {
  const id = facts.answers.company;
  if (id === undefined || id === "none" || !isCompanyId(id)) return null;
  return { id, company: getCompany(id), jobs: jobsAt(id), job: companyJob(facts.answers, jobsAt) };
}
