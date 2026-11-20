// Owner: engine. The onboarding fit score and recommendation (spec 4.6). Never shown as a number (P5).
import { EXPERIENCE_BANDS, JOB_IDS } from "@/lib/ids";
import { getJob } from "@/lib/data";
import type {
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
} from "@/lib/types";

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
  if (terms.city === 10) reasons.push({ kind: "city", cityLabel: answers.city?.label ?? "" });
  else if (terms.city === 6) reasons.push({ kind: "remote" });
  const priority = answers.priority;
  if (terms.priority > 0 && priority !== undefined && priority !== "explore") reasons.push({ kind: "priority", priority });
  return reasons.length === 0 ? [{ kind: "none" }] : reasons.slice(0, 3);
}

/** Recommended (rank 1), alternative 1 (rank 2), alternative 2 (best remaining job of another field) and fitReasons(recommended). */
export function recommend(answers: OnboardingAnswers): Recommendation {
  const ranked = rankByFit(answers);
  const first = ranked[0];
  const second = ranked[1];
  if (first === undefined || second === undefined) throw new Error("engine: fewer than two jobs to recommend");
  const field = getJob(first.jobId).field;
  const third = ranked.slice(2).find((f) => getJob(f.jobId).field !== field) ?? ranked[2];
  if (third === undefined) throw new Error("engine: no second alternative");
  return { recommended: first.jobId, alternatives: [second.jobId, third.jobId], reasons: fitReasons(first.jobId, answers) };
}
