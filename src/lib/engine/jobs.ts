// Owner: engine. Job ranking (spec 7.2) and search (7.1).
import { JOB_IDS } from "@/lib/ids";
import { getField, getJob, getJobCity, getSkill } from "@/lib/data";
import { normalizeText, tokenize, wordForms } from "@/lib/text/normalize";
import type { FitBreakdown, Job, JobId, JobQuery, RankedJob, SkillId, UserFacts } from "@/lib/types";

import { matchPercent } from "./match";
import { compareFit, fitBreakdown } from "./onboarding-fit";
import { skillStars, totalStars } from "./stars";

/**
 * All 20 jobs ranked (7.2): higher match first; ties: the target · a job in the user's city · a job whose field is one of
 * the interests · data order. While the user holds no star: by the onboarding fit score (4.6) instead (its own ties; the
 * jobs the education gate leaves out of the recommendation come last, in fit order, so the list still holds all 20).
 */
export function rankJobs(facts: UserFacts): readonly RankedJob[] {
  const stars = skillStars(facts);
  const fits = new Map<JobId, FitBreakdown>(JOB_IDS.map((id) => [id, fitBreakdown(id, facts.answers)]));
  const rows = JOB_IDS.map((jobId, order) => {
    const job = getJob(jobId);
    const fit = fits.get(jobId) ?? fitBreakdown(jobId, facts.answers);
    const ranked: RankedJob = {
      jobId,
      match: matchPercent(job.requirements, stars),
      fit: fit.score,
      missing: job.requirements.filter((r) => stars[r.skill] < r.stars).map((r) => r.skill),
      isTarget: facts.targetJobId === jobId,
      applied: facts.applications.some((a) => a.jobId === jobId),
    };
    return { ranked, job, fit, order };
  });

  if (totalStars(stars) === 0) {
    rows.sort((a, b) => Number(a.fit.excluded) - Number(b.fit.excluded) || compareFit(a.fit, b.fit));
  } else {
    const city = facts.answers.city?.value;
    const interests = facts.answers.interest ?? [];
    const inCity = (job: Job) => city !== undefined && city === job.city;
    const inInterest = (job: Job) => interests.some((i) => i === job.field);
    rows.sort(
      (a, b) =>
        b.ranked.match - a.ranked.match ||
        Number(b.ranked.isTarget) - Number(a.ranked.isTarget) ||
        Number(inCity(b.job)) - Number(inCity(a.job)) ||
        Number(inInterest(b.job)) - Number(inInterest(a.job)) ||
        a.order - b.order,
    );
  }
  return rows.map((r) => r.ranked);
}

/** The searchable words of a job (7.1): title, company, city name, field name, the names of its five skills. */
function jobWords(job: Job): readonly string[] {
  const text = [
    job.title,
    job.company,
    getJobCity(job.city).name,
    getField(job.field).name,
    ...job.requirements.map((r) => getSkill(r.skill).name),
  ].join(" ");
  return tokenize(normalizeText(text)).flatMap((w) => [...wordForms(w)]);
}

/** A query word is found when some word of the job starts with it, both compared without «ال» and one one-letter prefix. */
function wordFound(queryWord: string, words: readonly string[]): boolean {
  const forms = wordForms(queryWord);
  return forms.some((q) => words.some((w) => w.startsWith(q)));
}

/**
 * rankJobs filtered by search AND city AND field AND skill (7.1). Search: normalised (4.3), «ال» ignored, every query word
 * must be found in title, company, city name, field name or the names of the five skills. A word is found when a word
 * of the job starts with it, so the list narrows while the user types («محل» already finds «محلل»).
 */
export function searchJobs(facts: UserFacts, query: JobQuery): readonly RankedJob[] {
  const queryWords = tokenize(normalizeText(query.q ?? "")).filter((w) => w !== "ال");
  return rankJobs(facts).filter((row) => {
    const job = getJob(row.jobId);
    if (query.city !== undefined && job.city !== query.city) return false;
    if (query.field !== undefined && job.field !== query.field) return false;
    if (query.skill !== undefined && !job.requirements.some((r) => r.skill === query.skill)) return false;
    if (queryWords.length === 0) return true;
    const words = jobWords(job);
    return queryWords.every((q) => wordFound(q, words));
  });
}

/** Exactly the jobs that require a skill (`/jobs?skill=`, «تطلبها 3 وظائف», 3.5). Data order. */
export function jobsRequiringSkill(skill: SkillId): readonly JobId[] {
  return JOB_IDS.filter((id) => getJob(id).requirements.some((r) => r.skill === skill));
}
