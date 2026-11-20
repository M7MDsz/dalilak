// Owner: engine. The next-step rule (spec 2.8), used by the pill, the map card, the advisor, the celebration, the
// leaderboard and the course page.
import type { CourseId, NavTarget, NextStep, UserFacts } from "@/lib/types";

import { courseStateWith } from "./course-state";
import { courseEntries } from "./internal";
import { buildRoadmap } from "./roadmap";
import { skillStars } from "./stars";

/**
 * First match wins: 1 no CV and not skipped · 2 the most recently started course that is still `started` · 3 the roadmap's
 * current stage (match < 100) · 4 match 100 and not applied to the target · 5 otherwise.
 */
export function nextStep(facts: UserFacts): NextStep {
  if (facts.cv === null && !facts.cvSkipped) return { rule: 1 };

  const stars = skillStars(facts);
  let latest: { courseId: CourseId; startedAt: number; ticked: number; total: number } | null = null;
  for (const [courseId, progress] of courseEntries(facts)) {
    const info = courseStateWith(courseId, facts, stars);
    if (info.state !== "started") continue;
    if (latest === null || progress.startedAt >= latest.startedAt) {
      latest = { courseId, startedAt: progress.startedAt, ticked: info.ticked.length, total: info.total };
    }
  }
  if (latest !== null) return { rule: 2, courseId: latest.courseId, ticked: latest.ticked, total: latest.total };

  const roadmap = buildRoadmap(facts);
  if (roadmap === null) return { rule: 5 };
  const current = roadmap.currentN === null ? undefined : roadmap.stages[roadmap.currentN - 1];
  if (roadmap.match < 100 && current !== undefined) {
    return {
      rule: 3,
      courseId: current.courseId,
      hours: current.hours,
      xp: current.xp,
      prep: current.prep,
      prepares: current.prepares,
      matchNow: roadmap.match,
      matchAfter: current.matchAfter,
    };
  }
  if (roadmap.match === 100 && !facts.applications.some((a) => a.jobId === roadmap.jobId)) {
    return { rule: 4, jobId: roadmap.jobId };
  }
  return { rule: 5 };
}

/** Where the step's page is: 1 → cv · 2/3 → course · 4 → job · 5 → jobs. (Rule 3 also STARTS the course: shared `useNextStepAction`.) */
export function nextStepTarget(step: NextStep): NavTarget {
  switch (step.rule) {
    case 1:
      return { screen: "cv" };
    case 2:
    case 3:
      return { screen: "course", courseId: step.courseId };
    case 4:
      return { screen: "job", jobId: step.jobId };
    case 5:
      return { screen: "jobs" };
  }
}
