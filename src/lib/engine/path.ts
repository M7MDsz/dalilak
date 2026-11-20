// Owner: engine. The canonical stage list of a job (spec 3.4 "How the path is built"), shared by stars (the mark
// «في مسارك»), match (the gap rows of 7.3) and roadmap. Not re-exported from "@/lib/engine" (roadmap.ts exports
// `canonicalStages`). Pure; depends on data only.
import { POINTS_PER_SKILL, getCourse, getJob, getSkill } from "@/lib/data";
import type { CanonicalStage, JobId, SkillId, StarMap, StarSlot } from "@/lib/types";

import { courseFor } from "./internal";

interface PathSkill {
  readonly skill: SkillId;
  /** Stars the job requires; 1 for a preparatory skill. */
  readonly stars: StarSlot;
  readonly prep: boolean;
  readonly prepares: SkillId | null;
}

/**
 * The skills of a job's path in canonical order: requirement order, and before each skill the prerequisites it still
 * needs (depth first, in the order 9.2 lists them). A prerequisite the job lists is placed where it is first needed (with
 * the data of 9.3 every listed prerequisite already comes earlier); one it does not list is a preparatory skill
 * («تمهيدية», one star) that prepares the skill that first needed it. Transitive.
 */
function pathSkills(jobId: JobId): readonly PathSkill[] {
  const job = getJob(jobId);
  const required = new Map<SkillId, StarSlot>(job.requirements.map((r) => [r.skill, r.stars]));
  const placed = new Set<SkillId>();
  const out: PathSkill[] = [];
  const visit = (skill: SkillId, prepares: SkillId | null) => {
    if (placed.has(skill)) return;
    placed.add(skill);
    for (const pre of getSkill(skill).prereqs) visit(pre, skill);
    const stars = required.get(skill);
    out.push(stars === undefined ? { skill, stars: 1, prep: true, prepares } : { skill, stars, prep: false, prepares: null });
  };
  for (const r of job.requirements) visit(r.skill, null);
  return out;
}

const cache = new Map<JobId, readonly CanonicalStage[]>();

/**
 * A job's stages in canonical order (3.4): every ★ first (in path-skill order), then every ★★, then every ★★★.
 * Counts equal the "Stages" column of 9.3.
 */
export function canonicalStagesOf(jobId: JobId): readonly CanonicalStage[] {
  const hit = cache.get(jobId);
  if (hit !== undefined) return hit;
  const skills = pathSkills(jobId);
  const stages: CanonicalStage[] = [];
  for (const star of [1, 2, 3] as const) {
    for (const s of skills) {
      if (s.stars < star) continue;
      const courseId = courseFor(s.skill, star);
      stages.push({ skill: s.skill, star, courseId, hours: getCourse(courseId).hours, prep: s.prep, prepares: s.prepares });
    }
  }
  // Data is static, but a test may run before the catalogue is filled: cache only a complete result.
  if (stages.length > 0) cache.set(jobId, stages);
  return stages;
}

/** The skills on a job's path (requirements and preparatory skills). */
export function pathSkillIds(jobId: JobId): readonly SkillId[] {
  return pathSkills(jobId).map((s) => s.skill);
}

/** Spec 3.4: a stage is done when its star is held; a preparatory stage also when the skill it prepares has a star. */
export function stageDone(stage: CanonicalStage, stars: StarMap): boolean {
  if (stars[stage.skill] >= stage.star) return true;
  return stage.prep && stage.prepares !== null && stars[stage.prepares] >= 1;
}

/** That star's share of the match: 20 ÷ the job's required stars, rounded (20, 10, 7); 0 for a preparatory stage. */
export function stageGain(stage: CanonicalStage, jobId: JobId): number {
  if (stage.prep) return 0;
  const need = getJob(jobId).requirements.find((r) => r.skill === stage.skill)?.stars;
  return need === undefined ? 0 : Math.round(POINTS_PER_SKILL / need);
}
