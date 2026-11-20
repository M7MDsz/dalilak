// Owner: engine. The course state rule of spec 3.10 / 3.11 / 8.5 and course XP, shared by courses, roadmap, match and
// next-step. Not re-exported from "@/lib/engine" (courses.ts exports `courseState` and `courseXp`). Pure.
import { LESSONS_BY_HOURS, XP, getCourse, getSkill } from "@/lib/data";
import type { Course, CourseId, CourseStateInfo, LockReason, StarMap, UserFacts } from "@/lib/types";

import { courseParts, cvSkillOf, lowestCompletedAtOrAbove } from "./internal";
import { skillStars } from "./stars";

/** 20 × hours (spec 8.2). */
export function xpForCourse(course: Course): number {
  return XP.perCourseHour * course.hours;
}

/** XP of a course by id. */
export function xpForCourseId(courseId: CourseId): number {
  return xpForCourse(getCourse(courseId));
}

/** Lessons of a course: its lesson titles, or the 8.2 count for its hours when the titles are missing. */
export function lessonCount(course: Course): number {
  return course.lessons.length > 0 ? course.lessons.length : LESSONS_BY_HOURS[course.hours];
}

/** Why a course cannot be started (spec 8.5), or null when it can: the previous star, or the first prerequisite with no star. */
export function lockOf(courseId: CourseId, stars: StarMap): LockReason | null {
  const { skill, star } = courseParts(courseId);
  if (star > 1) {
    const previous = star === 3 ? 2 : 1;
    return stars[skill] >= previous ? null : { kind: "previous-star", skill, star: previous };
  }
  const missing = getSkill(skill).prereqs.find((p) => stars[p] < 1);
  return missing === undefined ? null : { kind: "prereq", skill: missing };
}

/**
 * Spec 3.10 / 8.5, first match wins: completed (completedAt) · credited (the star is held and this course was not
 * completed: CV or a higher course; the source named as in starSources) · started · available (star n-1 held; for n = 1
 * every prerequisite ≥ 1) · locked. `stars` = skillStars(facts), passed in so lists compute it once.
 */
export function courseStateWith(courseId: CourseId, facts: UserFacts, stars: StarMap): CourseStateInfo {
  const progress = facts.courses[courseId];
  if (progress !== undefined && progress.completedAt !== null) return { state: "completed", at: progress.completedAt };
  const { skill, star } = courseParts(courseId);
  if (stars[skill] >= star) {
    const cv = cvSkillOf(facts, skill);
    if (cv !== null && cv.stars >= star) return { state: "credited", by: { kind: "cv", evidence: cv.evidence } };
    const higher = lowestCompletedAtOrAbove(facts, skill, star + 1);
    if (higher !== null) return { state: "credited", by: { kind: "course", courseId: higher.courseId } };
  }
  if (progress !== undefined) {
    return { state: "started", ticked: progress.ticked, total: lessonCount(getCourse(courseId)) };
  }
  const lock = lockOf(courseId, stars);
  return lock === null ? { state: "available" } : { state: "locked", lock };
}

/** courseStateWith with the stars computed here. */
export function courseStateOf(courseId: CourseId, facts: UserFacts): CourseStateInfo {
  return courseStateWith(courseId, facts, skillStars(facts));
}
