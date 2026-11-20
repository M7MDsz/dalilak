// Owner: engine. Small helpers shared by the engine modules. Not re-exported from "@/lib/engine" (index.ts lists the
// public modules only). Pure.
import { SKILL_IDS, courseIdFor, isSkillId } from "@/lib/ids";
import { getSkill } from "@/lib/data";
import type { CourseId, CourseProgress, SkillId, StarCount, StarMap, StarSlot, UserFacts } from "@/lib/types";

/** The skill and star a course grants, read from its id `c-{skill}-{star}` (spec 9.4; ids are typed, so this cannot fail). */
export function courseParts(courseId: CourseId): { readonly skill: SkillId; readonly star: StarSlot } {
  const match = /^c-(.+)-([123])$/.exec(courseId);
  const skill = match?.[1];
  const star = Number(match?.[2]);
  if (skill === undefined || !isSkillId(skill) || (star !== 1 && star !== 2 && star !== 3)) {
    throw new Error(`engine: malformed course id ${courseId}`);
  }
  return { skill, star };
}

/** The course that grants `star` of `skill` (it exists for every star up to the skill's slots). */
export function courseFor(skill: SkillId, star: number): CourseId {
  const id = courseIdFor(skill, star);
  if (id === null) throw new Error(`engine: no course for ${skill} star ${star}`);
  return id;
}

/** A star count clamped to 0..3. */
export function asStarCount(n: number): StarCount {
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  if (n >= 1) return 1;
  return 0;
}

/** A StarMap with every skill at 0. */
export function zeroStars(): Record<SkillId, StarCount> {
  const out = {} as Record<SkillId, StarCount>;
  for (const skill of SKILL_IDS) out[skill] = 0;
  return out;
}

/** A copy of `stars` with `skill` raised to at least `to` (never lowered). */
export function raised(stars: StarMap, skill: SkillId, to: number): StarMap {
  const current = stars[skill];
  if (current >= to) return stars;
  return { ...stars, [skill]: asStarCount(to) };
}

/** The skill's number of star slots (spec 9.2). */
export function maxStarsOf(skill: SkillId): StarSlot {
  return getSkill(skill).maxStars;
}

/** Every course of the account with its progress, in insertion order. */
export function courseEntries(facts: UserFacts): readonly (readonly [CourseId, CourseProgress])[] {
  const out: (readonly [CourseId, CourseProgress])[] = [];
  for (const [id, progress] of Object.entries(facts.courses) as [CourseId, CourseProgress | undefined][]) {
    if (progress !== undefined) out.push([id, progress]);
  }
  return out;
}

/** The completion time of a course, or null when it is not completed. */
export function completedAt(facts: UserFacts, courseId: CourseId): number | null {
  return facts.courses[courseId]?.completedAt ?? null;
}

/** Completed courses, oldest completion first (ties: insertion order). */
export function completedCourses(facts: UserFacts): readonly { readonly courseId: CourseId; readonly at: number }[] {
  const out: { courseId: CourseId; at: number }[] = [];
  for (const [courseId, progress] of courseEntries(facts)) {
    if (progress.completedAt !== null) out.push({ courseId, at: progress.completedAt });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The CV's record of a skill, if the CV proved it. */
export function cvSkillOf(facts: UserFacts, skill: SkillId) {
  return facts.cv?.skills.find((s) => s.skill === skill) ?? null;
}

/** The lowest completed course of `skill` granting a star of `star` or more (the course a held star is owed to). */
export function lowestCompletedAtOrAbove(facts: UserFacts, skill: SkillId, star: number): { courseId: CourseId; at: number } | null {
  for (let n = star; n <= 3; n += 1) {
    const id = courseIdFor(skill, n);
    if (id === null) break;
    const at = completedAt(facts, id);
    if (at !== null) return { courseId: id, at };
  }
  return null;
}
