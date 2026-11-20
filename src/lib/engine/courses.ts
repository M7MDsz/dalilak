// Owner: engine. Course states (spec 3.10, 3.11, 8.5) and the /learn lists.
import { COURSE_IDS, courseIdFor } from "@/lib/ids";
import { getSkill } from "@/lib/data";
import type { Course, CourseId, CoursePathInfo, CourseState, CourseStateInfo, FieldId, LearnListing, LearnTab, UserFacts } from "@/lib/types";

import { courseStateOf, courseStateWith, xpForCourse } from "./course-state";
import { courseParts } from "./internal";
import { buildRoadmap } from "./roadmap";
import { skillStars } from "./stars";

/** 20 × hours (spec 8.2). */
export function courseXp(course: Course): number {
  return xpForCourse(course);
}

/** The part before the colon, trimmed; the whole title when there is none (spec "Course titles"). */
export function shortTitle(course: Course): string {
  const colon = course.title.indexOf(":");
  return (colon >= 0 ? course.title.slice(0, colon) : course.title).trim();
}

/**
 * Spec 3.10 / 8.5, first match wins: completed (completedAt) · credited (the star is held and this course was not
 * completed: CV or a higher course) · started · available (star n-1 held; for n = 1 every prerequisite ≥ 1) · locked.
 */
export function courseState(courseId: CourseId, facts: UserFacts): CourseStateInfo {
  return courseStateOf(courseId, facts);
}

/**
 * The course's place on the target's roadmap (any of its stages, done or not), or null when it is not one of them.
 * `matchNow` = the target match now; `matchAfter` = the match after completing this course from the current state (for a
 * done stage, the same as now); `gain` = that star's share (0 for a preparatory stage).
 */
export function courseOnPath(courseId: CourseId, facts: UserFacts): CoursePathInfo | null {
  const roadmap = buildRoadmap(facts);
  const stage = roadmap?.stages.find((s) => s.courseId === courseId);
  if (roadmap === null || roadmap === undefined || stage === undefined) return null;
  return {
    jobId: roadmap.jobId,
    stageN: stage.n,
    prep: stage.prep,
    prepares: stage.prepares,
    gain: stage.gain,
    matchNow: roadmap.match,
    matchAfter: stage.matchAfter,
  };
}

/**
 * For a locked course: the course that removes the lock («افتح المتطلب», 3.11): the previous star's course, or the first
 * star of the first prerequisite with no star. Null when the course is not locked.
 */
export function unlockerCourse(courseId: CourseId, facts: UserFacts): CourseId | null {
  const info = courseState(courseId, facts);
  if (info.state !== "locked") return null;
  return courseIdFor(info.lock.skill, info.lock.kind === "prereq" ? 1 : info.lock.star);
}

const EXPLORE_ORDER: Readonly<Record<CourseState, number>> = { available: 0, started: 1, credited: 2, locked: 3, completed: 4 };

/**
 * One tab of /learn (3.10), filtered by field (null = all) and ordered: "path" = unfinished stages' courses in stage order
 * (current first) + doneGroup (the done stages' courses, in stage order); "explore" = every course not on the path and not
 * completed: available, started, credited, locked (data order inside each); "done" = completed, newest first.
 */
export function learnList(facts: UserFacts, tab: LearnTab, field: FieldId | null): LearnListing {
  const inField = (id: CourseId) => field === null || getSkill(courseParts(id).skill).field === field;
  const roadmap = buildRoadmap(facts);
  const stages = roadmap?.stages ?? [];

  if (tab === "path") {
    return {
      items: stages.filter((s) => s.state !== "done").map((s) => s.courseId).filter(inField),
      doneGroup: stages.filter((s) => s.state === "done").map((s) => s.courseId).filter(inField),
    };
  }

  const stars = skillStars(facts);
  if (tab === "explore") {
    const onPath = new Set<CourseId>(stages.map((s) => s.courseId));
    const items = COURSE_IDS.filter((id) => !onPath.has(id) && inField(id))
      .map((id, order) => ({ id, rank: EXPLORE_ORDER[courseStateWith(id, facts, stars).state], order }))
      .filter((c) => c.rank !== EXPLORE_ORDER.completed)
      .sort((a, b) => a.rank - b.rank || a.order - b.order)
      .map((c) => c.id);
    return { items, doneGroup: [] };
  }

  const items = COURSE_IDS.map((id, order) => ({ id, at: facts.courses[id]?.completedAt ?? null, order }))
    .filter((c): c is { id: CourseId; at: number; order: number } => c.at !== null && inField(c.id))
    .sort((a, b) => b.at - a.at || a.order - b.order)
    .map((c) => c.id);
  return { items, doneGroup: [] };
}
