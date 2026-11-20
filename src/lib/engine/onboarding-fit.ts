// Owner: engine. The onboarding fit score and recommendation (spec 4.6). Never shown as a number (P5).
import { EXPERIENCE_BANDS, JOB_IDS, isCompanyId } from "@/lib/ids";
import { getCompany, getJob, getJobCity, type Company } from "@/lib/data";
import type {
  CompanyId,
  ExperienceBand,
  ExperienceOption,
  FitBreakdown,
  Job,
  JobFieldId,
  JobId,
  MajorOption,
  OnboardingAnswers,
  Recommendation,
  RevealReason,
  UserFacts,
} from "@/lib/types";

import { jobsAtCompany } from "./companies";

/** Spec 4.6 "Major → fields": primary, then secondary; `other` has none. */
const MAJOR_FIELDS: Readonly<Record<MajorOption, readonly [JobFieldId, JobFieldId] | null>> = {
  cs: ["software", "data"],
  mis: ["data", "business"],
  business: ["business", "hr"],
  finance: ["business", "data"],
  marketing: ["marketing", "design"],
  hr: ["hr", "business"],
  design: ["design", "marketing"],
  engineering: ["data", "business"],
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

function majorFields(answers: OnboardingAnswers): readonly [JobFieldId, JobFieldId] | null {
  return answers.major === undefined ? null : MAJOR_FIELDS[answers.major.value];
}

/** Which interest the job's field is: 0 first, 1 second, or -1. */
function interestIndex(job: Job, answers: OnboardingAnswers): number {
  return (answers.interest ?? []).findIndex((i) => i === job.field);
}

function termsOf(job: Job, answers: OnboardingAnswers): FitBreakdown["terms"] {
  const interestAt = interestIndex(job, answers);
  const interest = interestAt === 0 ? 40 : interestAt === 1 ? 30 : 0;
  const fields = majorFields(answers);
  const major = fields === null ? 0 : job.field === fields[0] ? 25 : job.field === fields[1] ? 12 : 0;
  const distance = Math.abs(bandIndex(userBand(answers)) - bandIndex(job.band));
  const experience = distance === 0 ? 15 : distance === 1 ? 7 : 0;
  const cityValue = answers.city?.value;
  const city = cityValue !== undefined && cityValue === job.city ? 10 : job.city === "remote" ? 6 : 0;
  let priority = 0;
  if (answers.priority === "first-job") priority = job.band === "entry" ? 10 : 0;
  else if (answers.priority === "switch") priority = interestAt >= 0 && job.field !== fields?.[0] ? 10 : 0;
  else if (answers.priority === "grow") priority = fields !== null && job.field === fields[0] ? 10 : 0;
  return { interest, major, experience, city, priority };
}

/** The five terms of 4.6 for one job (interest 40/30/0, major 25/12/0, experience 15/7/0, city 10/6/0, priority 10/0) and the education gate. */
export function fitBreakdown(jobId: JobId, answers: OnboardingAnswers): FitBreakdown {
  const job = getJob(jobId);
  const terms = termsOf(job, answers);
  const score = terms.interest + terms.major + terms.experience + terms.city + terms.priority;
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
export function rankByFit(answers: OnboardingAnswers): readonly FitBreakdown[] {
  return JOB_IDS.map((id) => fitBreakdown(id, answers))
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
export function companyJob(answers: OnboardingAnswers, jobsAt: CompanyJobs = jobsAtCompany): JobId | null {
  const company = answers.company;
  if (company === undefined || company === "none" || !isCompanyId(company)) return null;
  const ids = jobsAt(company);
  if (ids.length === 0) return null;
  const withoutPriority: OnboardingAnswers = { ...answers, priority: undefined };
  const fits = ids.map((id) => fitBreakdown(id, withoutPriority));
  fits.sort((a, b) => Number(a.excluded) - Number(b.excluded) || compareFit(a, b));
  return fits[0]?.jobId ?? null;
}

/**
 * Recommended (rank 1), alternative 1 (rank 2), alternative 2 (best remaining job of another field) and fitReasons(recommended).
 * When the user named a company that has a job in the data, that job is the recommended one (the path reveal ends on it)
 * and the ranking's best two others are the alternatives; otherwise the ranking decides, as before.
 */
export function recommend(answers: OnboardingAnswers, jobsAt: CompanyJobs = jobsAtCompany): Recommendation {
  const ranked = rankByFit(answers);
  const aimed = companyJob(answers, jobsAt);
  if (aimed !== null) {
    const rest = ranked.filter((f) => f.jobId !== aimed);
    const field = getJob(aimed).field;
    const second = rest[0];
    const third = rest.slice(1).find((f) => getJob(f.jobId).field !== field) ?? rest[1];
    if (second === undefined || third === undefined) throw new Error("engine: no alternatives");
    return { recommended: aimed, alternatives: [second.jobId, third.jobId], reasons: fitReasons(aimed, answers) };
  }
  const first = ranked[0];
  const second = ranked[1];
  if (first === undefined || second === undefined) throw new Error("engine: fewer than two jobs to recommend");
  const field = getJob(first.jobId).field;
  const third = ranked.slice(2).find((f) => getJob(f.jobId).field !== field) ?? ranked[2];
  if (third === undefined) throw new Error("engine: no second alternative");
  return { recommended: first.jobId, alternatives: [second.jobId, third.jobId], reasons: fitReasons(first.jobId, answers) };
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
