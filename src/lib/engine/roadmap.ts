// Owner: engine. The roadmap of spec 3.4 as data (no layout: D3).
import { JOB_IDS } from "@/lib/ids";
import { getJob } from "@/lib/data";
import type { Branch, CanonicalStage, JobId, Roadmap, RoadmapStage, StageState, StarMap, UserFacts } from "@/lib/types";

import { courseStateWith, xpForCourseId } from "./course-state";
import { completedAt, courseParts, cvSkillOf, lowestCompletedAtOrAbove, raised, zeroStars } from "./internal";
import { matchPercent } from "./match";
import { canonicalStagesOf, stageDone, stageGain } from "./path";
import { skillStars } from "./stars";

/**
 * A job's stages in canonical order (3.4): requirement order, each unlisted prerequisite's ★ placed right before the skill
 * it prepares (transitively), every ★ first, then ★★, then ★★★. Counts must equal the "Stages" column of 9.3.
 */
export function canonicalStages(jobId: JobId): readonly CanonicalStage[] {
  return canonicalStagesOf(jobId);
}

/** «8 مراحل · 74 ساعة تعلّم» (reveal strip and alternatives, spec 3.3 / 9.8 check 9). */
export function pathSummary(jobId: JobId): { stages: number; prep: number; hours: number } {
  const stages = canonicalStagesOf(jobId);
  return {
    stages: stages.length,
    prep: stages.filter((s) => s.prep).length,
    hours: stages.reduce((sum, s) => sum + s.hours, 0),
  };
}

type DoneBy = RoadmapStage["doneBy"];

/** How a done stage was done, and the group it is displayed in (cv first, then courses by completion time). */
function doneByOf(stage: CanonicalStage, facts: UserFacts, stars: StarMap): { by: NonNullable<DoneBy>; group: "cv" | "course"; at: number } {
  if (stars[stage.skill] >= stage.star) {
    const exactAt = completedAt(facts, stage.courseId);
    if (exactAt !== null) return { by: { kind: "course", courseId: stage.courseId, at: exactAt }, group: "course", at: exactAt };
    const cv = cvSkillOf(facts, stage.skill);
    if (cv !== null && cv.stars >= stage.star) return { by: { kind: "cv", evidence: cv.evidence }, group: "cv", at: 0 };
    const higher = lowestCompletedAtOrAbove(facts, stage.skill, stage.star);
    if (higher !== null) return { by: { kind: "course", courseId: higher.courseId, at: higher.at }, group: "course", at: higher.at };
  }
  // A preparatory stage done by implication joins the group of the prepared skill's first star (spec 3.4).
  const prepared = stage.prepares;
  if (prepared !== null) {
    const exact = lowestCompletedAtOrAbove(facts, prepared, 1);
    const cv = cvSkillOf(facts, prepared);
    if (exact !== null && courseParts(exact.courseId).star === 1) return { by: { kind: "implied" }, group: "course", at: exact.at };
    if (cv !== null && cv.stars >= 1) return { by: { kind: "implied" }, group: "cv", at: 0 };
    if (exact !== null) return { by: { kind: "implied" }, group: "course", at: exact.at };
  }
  return { by: { kind: "implied" }, group: "cv", at: 0 };
}

/**
 * The roadmap to `jobId` for this user (3.4): displayed order (CV-proven in canonical order, then course-completed in
 * completion order, then the rest in canonical order; an implied prep stage joins the group of the star that implied it),
 * states (done / current / upcoming / locked; the gate while no CV and not skipped), summary numbers, two branches.
 * Per stage: `matchAfter` (this one stage's course from now) and `matchAt` (stages 1..n held, none after: the match "at
 * this station", 100 at the last stage, = `match` at the last done stage). 6 to 11 stages (9.3).
 *
 * The current stage is the first stage that is not done; should that stage's course be locked (possible only when an
 * implied preparatory stage is also another path skill's missing prerequisite), it is the first not-done stage whose
 * course can be started, so the lit step can always be started (2.8 rule 3).
 */
export function roadmapFor(jobId: JobId, facts: UserFacts): Roadmap {
  const job = getJob(jobId);
  const stars = skillStars(facts);
  const canonical = canonicalStagesOf(jobId);

  const cvGroup: { stage: CanonicalStage; by: NonNullable<DoneBy> }[] = [];
  const courseGroup: { stage: CanonicalStage; by: NonNullable<DoneBy>; at: number; order: number }[] = [];
  const rest: CanonicalStage[] = [];
  canonical.forEach((stage, order) => {
    if (!stageDone(stage, stars)) {
      rest.push(stage);
      return;
    }
    const done = doneByOf(stage, facts, stars);
    if (done.group === "cv") cvGroup.push({ stage, by: done.by });
    else courseGroup.push({ stage, by: done.by, at: done.at, order });
  });
  courseGroup.sort((a, b) => a.at - b.at || a.order - b.order);

  const gate: Roadmap["gate"] = facts.cv === null && !facts.cvSkipped ? "current" : "cleared";
  const ordered: { stage: CanonicalStage; by: DoneBy }[] = [
    ...cvGroup,
    ...courseGroup.map(({ stage, by }) => ({ stage, by })),
    ...rest.map((stage) => ({ stage, by: null })),
  ];

  const courseStates = ordered.map(({ stage }) => courseStateWith(stage.courseId, facts, stars));
  let currentIndex: number | null = null;
  if (gate === "cleared") {
    const firstOpen = ordered.findIndex(({ by }, i) => by === null && courseStates[i]?.state !== "locked");
    const firstNotDone = ordered.findIndex(({ by }) => by === null);
    currentIndex = firstOpen >= 0 ? firstOpen : firstNotDone >= 0 ? firstNotDone : null;
  }

  const match = matchPercent(job.requirements, stars);
  let atStars: StarMap = zeroStars();
  const stages: RoadmapStage[] = ordered.map(({ stage, by }, i) => {
    atStars = raised(atStars, stage.skill, stage.star);
    const info = courseStates[i];
    const state: StageState =
      by !== null ? "done" : i === currentIndex ? "current" : info?.state === "locked" ? "locked" : "upcoming";
    return {
      ...stage,
      n: i + 1,
      state,
      xp: xpForCourseId(stage.courseId),
      doneBy: by,
      lock: state === "locked" && info?.state === "locked" ? info.lock : null,
      gain: stageGain(stage, jobId),
      matchAfter: matchPercent(job.requirements, raised(stars, stage.skill, stage.star)),
      matchAt: matchPercent(job.requirements, atStars),
    };
  });

  const notDone = stages.filter((s) => s.state !== "done");
  return {
    jobId,
    match,
    complete: match === 100,
    gate,
    stages,
    currentN: currentIndex === null ? null : currentIndex + 1,
    doneCount: stages.length - notDone.length,
    total: stages.length,
    hoursLeft: notDone.reduce((sum, s) => sum + s.hours, 0),
    hoursTotal: stages.reduce((sum, s) => sum + s.hours, 0),
    branches: branchJobs(jobId, facts),
  };
}

/** The roadmap to the target, or null without a target (the page's empty state). */
export function buildRoadmap(facts: UserFacts): Roadmap | null {
  return facts.targetJobId === null ? null : roadmapFor(facts.targetJobId, facts);
}

/** The two branch jobs (3.4): highest projected match (stars raised to the target's requirements); ties: same field, then data order. */
export function branchJobs(jobId: JobId, facts: UserFacts): readonly Branch[] {
  const target = getJob(jobId);
  const stars = skillStars(facts);
  let projected = stars;
  for (const r of target.requirements) projected = raised(projected, r.skill, r.stars);
  const candidates = JOB_IDS.filter((id) => id !== jobId).map((id, order) => {
    const job = getJob(id);
    return {
      jobId: id,
      now: matchPercent(job.requirements, stars),
      after: matchPercent(job.requirements, projected),
      sameField: job.field === target.field,
      order,
    };
  });
  candidates.sort((a, b) => b.after - a.after || Number(b.sameField) - Number(a.sameField) || a.order - b.order);
  return candidates.slice(0, 2).map(({ jobId: id, now, after }) => ({ jobId: id, now, after }));
}
