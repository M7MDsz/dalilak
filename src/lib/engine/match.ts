// Owner: engine. The match formula (spec 7.2), its breakdown, the gap (7.3) and projections (3.4).
import { POINTS_PER_SKILL, getJob } from "@/lib/data";
import type { Gap, GapRow, Job, JobId, MatchBreakdown, Requirement, StarMap, StarSlot, UserFacts } from "@/lib/types";

import { xpForCourseId } from "./course-state";
import { raised } from "./internal";
import { canonicalStagesOf, stageDone, stageGain } from "./path";
import { skillStars, starSources } from "./stars";

/**
 * Spec 7.2: round( Σ 20 × min(held, required) ÷ required ). Pure in its inputs (testable without the catalogue).
 * Summed in sixths of a point (every term 120 × min ÷ required is a whole number), so no float drift; the sum is never
 * an exact half, so the rounding has no tie to break.
 */
export function matchPercent(requirements: readonly Requirement[], stars: StarMap): number {
  let sixths = 0;
  for (const r of requirements) sixths += (POINTS_PER_SKILL * 6 * Math.min(stars[r.skill], r.stars)) / r.stars;
  return Math.round(sixths / 6);
}

/** Per-skill points (exact, 6.67 possible), total and met points (spec 3.8 «كيف تُحسب؟», 5.3 explain_match). */
export function matchBreakdown(job: Job, stars: StarMap): MatchBreakdown {
  const rows = job.requirements.map((r) => {
    const held = stars[r.skill];
    return { skill: r.skill, need: r.stars, held, points: (POINTS_PER_SKILL * Math.min(held, r.stars)) / r.stars };
  });
  const metPoints = rows.reduce((sum, row) => (row.held >= row.need ? sum + row.points : sum), 0);
  return { jobId: job.id, rows, total: matchPercent(job.requirements, stars), metPoints };
}

/** The match of one job for this user. */
export function jobMatch(jobId: JobId, facts: UserFacts): number {
  return matchPercent(getJob(jobId).requirements, skillStars(facts));
}

/** The match with the target, or null without a target. */
export function targetMatch(facts: UserFacts): number | null {
  return facts.targetJobId === null ? null : jobMatch(facts.targetJobId, facts);
}

/** A star's share of the match: 20 ÷ required stars, rounded → 20, 10 or 7 (spec 7.3). */
export function starGain(required: StarSlot): number {
  return Math.round(POINTS_PER_SKILL / required);
}

/**
 * Spec 3.8 / 7.3: have, missing, and one row per missing star in roadmap (canonical) order, a preparatory row
 * («تمهيدية») +0% for a prerequisite the job does not list. `matchAfter` of a row = the match after completing that
 * row's course from the current stars (the skill raised to that star).
 */
export function jobGap(jobId: JobId, facts: UserFacts): Gap {
  const job = getJob(jobId);
  const stars = skillStars(facts);
  const have: Gap["have"][number][] = [];
  const missing: Gap["missing"][number][] = [];
  for (const r of job.requirements) {
    const held = stars[r.skill];
    if (held >= r.stars) {
      const source = starSources(facts, r.skill).find((s) => s.star === r.stars)?.source ?? "cv";
      have.push({ skill: r.skill, need: r.stars, held, source });
    } else {
      missing.push({ skill: r.skill, need: r.stars, held });
    }
  }
  const rows: GapRow[] = canonicalStagesOf(jobId)
    .filter((stage) => !stageDone(stage, stars))
    .map((stage) => ({
      skill: stage.skill,
      star: stage.star,
      courseId: stage.courseId,
      hours: stage.hours,
      xp: xpForCourseId(stage.courseId),
      gain: stageGain(stage, jobId),
      prep: stage.prep,
      matchAfter: matchPercent(job.requirements, raised(stars, stage.skill, stage.star)),
    }));
  return { jobId, match: matchPercent(job.requirements, stars), have, missing, rows };
}

/** The match of `jobId` if the user's stars were raised to `raisedTo` (spec 3.4 branches: the target's requirements). */
export function projectedMatch(jobId: JobId, raisedTo: readonly Requirement[], facts: UserFacts): number {
  let stars = skillStars(facts);
  for (const r of raisedTo) stars = raised(stars, r.skill, r.stars);
  return matchPercent(getJob(jobId).requirements, stars);
}

