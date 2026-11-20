// Owner: engine. Job ranking (spec 7.2) and search (7.1).
import { EXPERIENCE_BANDS, JOB_IDS } from "@/lib/ids";
import { getField, getJob, getJobCity, getSkill } from "@/lib/data";
import { normalizeText, tokenize, wordForms } from "@/lib/text/normalize";
import type { FitBreakdown, Job, JobFieldId, JobId, JobQuery, RankedJob, SkillId, UserFacts } from "@/lib/types";

import { matchPercent } from "./match";
import { compareFit, fitBreakdown, wantedFields } from "./onboarding-fit";
import { skillStars, totalStars } from "./stars";

/** Spec 4.6: the experience answer as a job band (none and under a year are entry level). */
const BAND_OF_EXPERIENCE = { none: "entry", under1: "entry", "1to3": "junior", over3: "mid" } as const;

/**
 * All the jobs ranked (7.2): 21 Nov 2026 (owner: "the jobs shown to choose between should be related to the path or what
 * you entered") the jobs in the fields that suit the user come first — the target's field and the fields they asked for
 * (interests, else their major's) —, then the rest; inside each group higher match first; ties: the target · a job in the
 * user's city · a job whose field is one of the interests · data order. While the user holds no star: by the onboarding fit score (4.6) instead (its own ties; the
 * jobs the education gate leaves out of the recommendation come last, in fit order, so the list still holds them all).
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
    const suited = new Set<JobFieldId>(wantedFields(facts.answers) ?? []);
    if (facts.targetJobId !== null) suited.add(getJob(facts.targetJobId).field);
    const inSuited = (job: Job) => suited.size === 0 || suited.has(job.field);
    // within reach of the user's experience (at most one band above): a senior «أول» role goes after the reachable ones
    // for a new graduate (the user's own target is never pushed down), the same rule as the onboarding company tiles and the
    // map's job column (tester, 21 Nov 2026)
    const userBand = BAND_OF_EXPERIENCE[facts.answers.experience ?? "none"];
    const reachable = (job: Job) => EXPERIENCE_BANDS.indexOf(job.band) - EXPERIENCE_BANDS.indexOf(userBand) <= 1;
    rows.sort(
      (a, b) =>
        Number(inSuited(b.job)) - Number(inSuited(a.job)) ||
        Number(reachable(b.job) || b.ranked.isTarget) - Number(reachable(a.job) || a.ranked.isTarget) ||
        b.ranked.match - a.ranked.match ||
        Number(b.ranked.isTarget) - Number(a.ranked.isTarget) ||
        Number(inCity(b.job)) - Number(inCity(a.job)) ||
        Number(inInterest(b.job)) - Number(inInterest(a.job)) ||
        a.order - b.order,
    );
  }
  return rows.map((r) => r.ranked);
}

/**
 * The searchable words of a job (7.1): title, company, city name, field name, the names of its five skills; for a real
 * posting also its own title and the company's own name («Salla», «Lucidya»).
 */
function jobWords(job: Job): readonly string[] {
  const text = [
    job.title,
    job.titleEn ?? "",
    job.company,
    job.companyEn ?? "",
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
