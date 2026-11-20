// Owner: engine. Skill stars (spec 8.5) and the skill tree's node states (3.5).
import { SKILL_IDS } from "@/lib/ids";
import { SKILLS, getSkill } from "@/lib/data";
import type { SkillId, SkillNode, StarMap, StarSource, UserFacts } from "@/lib/types";

import { asStarCount, completedCourses, courseParts, cvSkillOf, lowestCompletedAtOrAbove, maxStarsOf, zeroStars } from "./internal";
import { pathSkillIds } from "./path";

/** A StarMap with every skill at 0 (the building block for fixtures and simulations). */
export function emptyStars(): StarMap {
  return zeroStars();
}

/** Stars the CV proved (spec 6.5), per skill, never above the skill's slots. */
export function cvStars(facts: UserFacts): StarMap {
  const out = zeroStars();
  for (const s of facts.cv?.skills ?? []) {
    out[s.skill] = asStarCount(Math.max(out[s.skill], Math.min(s.stars, maxStarsOf(s.skill))));
  }
  return out;
}

/** Highest n among completed courses `c-{skill}-n`, per skill (spec 8.5). */
export function courseStars(facts: UserFacts): StarMap {
  const out = zeroStars();
  for (const { courseId } of completedCourses(facts)) {
    const { skill, star } = courseParts(courseId);
    if (star > out[skill]) out[skill] = star;
  }
  return out;
}

/** Spec 8.5: a skill's stars = max(CV stars, course stars). A new CV never removes a course star. */
export function skillStars(facts: UserFacts): StarMap {
  const cv = cvStars(facts);
  const course = courseStars(facts);
  const out = zeroStars();
  for (const skill of SKILL_IDS) out[skill] = asStarCount(Math.max(cv[skill], course[skill]));
  return out;
}

/**
 * Where each held star of a skill came from («مصدر النجوم», 3.5): star n is "course" when c-{skill}-n is completed,
 * else "cv" when the CV proved at least n; a star held only because a higher course was completed (the CV that proved
 * the lower one was replaced) names that higher course. Ordered by star.
 */
export function starSources(facts: UserFacts, skill: SkillId): readonly StarSource[] {
  const held = skillStars(facts)[skill];
  const cv = cvSkillOf(facts, skill);
  const out: StarSource[] = [];
  for (const star of [1, 2, 3] as const) {
    if (star > held) break;
    const exact = lowestCompletedAtOrAbove(facts, skill, star);
    if (exact !== null && courseParts(exact.courseId).star === star) out.push({ star, source: "course", courseId: exact.courseId });
    else if (cv !== null && cv.stars >= star) out.push({ star, source: "cv", evidence: cv.evidence });
    else if (exact !== null) out.push({ star, source: "course", courseId: exact.courseId });
  }
  return out;
}

/** Sum of stars (the skill tree summary «11 من 59 نجمة», profile «النجوم»). */
export function totalStars(stars: StarMap): number {
  return SKILL_IDS.reduce((sum, skill) => sum + stars[skill], 0);
}

/** Skills with at least one star («8 من 38 مهارة», badge `ten-skills`). */
export function skillsHeld(stars: StarMap): number {
  return SKILL_IDS.reduce((sum, skill) => sum + (stars[skill] > 0 ? 1 : 0), 0);
}

/**
 * The stars before the user's most recent star-granting event (spec 3.5: the skill tree's first-visit baseline). The latest
 * event is the most recent of: a course completion (remove that course's star) or the CV analysis (remove all CV stars).
 * On a tie in time the course counts as the later event (seeds write everything at one instant, the course after the
 * CV). In the demo after the Power BI course: Power BI at 0, the rest as after the CV. No event: the current stars.
 */
export function starsBeforeLatestStar(facts: UserFacts): StarMap {
  const courses = completedCourses(facts);
  const lastCourse = courses[courses.length - 1] ?? null;
  const cvAt = facts.cv?.analysedAt ?? null;
  if (lastCourse === null && cvAt === null) return skillStars(facts);
  if (lastCourse !== null && (cvAt === null || lastCourse.at >= cvAt)) {
    const progress = facts.courses[lastCourse.courseId];
    const without: UserFacts = {
      ...facts,
      courses: { ...facts.courses, [lastCourse.courseId]: progress ? { ...progress, completedAt: null } : undefined },
    };
    return skillStars(without);
  }
  return courseStars(facts);
}

/** The stars that hold the node state; internal form of skillNode with precomputed inputs. */
function nodeOf(skill: SkillId, stars: StarMap, inPath: ReadonlySet<SkillId>): SkillNode {
  const held = stars[skill];
  const max = maxStarsOf(skill);
  const missing = getSkill(skill).prereqs.find((p) => stars[p] < 1) ?? null;
  const state = held >= max ? "maxed" : held >= 1 ? "earned" : missing === null ? "available" : "locked";
  return { skill, state, stars: held, max, inPath: inPath.has(skill), lockedBy: state === "locked" ? missing : null };
}

/** The skills of the target's path (requirements and preparatory skills): the mark «في مسارك». */
function inPathSet(facts: UserFacts): ReadonlySet<SkillId> {
  return new Set(facts.targetJobId === null ? [] : pathSkillIds(facts.targetJobId));
}

/**
 * Spec 3.5 node state: earned (≥1 star, not all) · maxed · available (0 stars, every prerequisite ≥1) · locked. A skill
 * with a star is never locked. `inPath`: the skill is on the target's roadmap (a requirement or a preparatory skill).
 * `lockedBy` is set on locked nodes only.
 */
export function skillNode(skill: SkillId, facts: UserFacts): SkillNode {
  return nodeOf(skill, skillStars(facts), inPathSet(facts));
}

/** Every node, keyed by skill. */
export function skillNodes(facts: UserFacts): Readonly<Record<SkillId, SkillNode>> {
  const stars = skillStars(facts);
  const inPath = inPathSet(facts);
  const out = {} as Record<SkillId, SkillNode>;
  for (const skill of SKILL_IDS) out[skill] = nodeOf(skill, stars, inPath);
  return out;
}

/** «8 من 38 مهارة · 11 من 59 نجمة». */
export function skillTreeSummary(facts: UserFacts): { skillsHeld: number; skillsTotal: number; starsHeld: number; starsTotal: number } {
  const stars = skillStars(facts);
  return {
    skillsHeld: skillsHeld(stars),
    skillsTotal: SKILL_IDS.length,
    starsHeld: totalStars(stars),
    starsTotal: SKILLS.reduce((sum, s) => sum + s.maxStars, 0),
  };
}
