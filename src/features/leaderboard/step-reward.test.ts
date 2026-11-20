// Owner: leaderboard. The reward chip beside «أسرع طريق للصعود» shows only XP that spec 8.1 pays.
import { describe, expect, it } from "vitest";

import { getCourse, XP } from "@/lib/data";
import { courseXp } from "@/lib/engine";
import type { CourseId, JobId, NextStep, UserFacts } from "@/lib/types";

import { stepReward } from "./step-reward";

const facts = (over: Partial<Record<"xpEvents" | "applications", unknown[]>> = {}): UserFacts =>
  ({ xpEvents: [], applications: [], ...over }) as unknown as UserFacts;

describe("stepReward", () => {
  it("rule 1 pays the first CV analysis, once per account", () => {
    expect(stepReward({ rule: 1 }, facts())).toBe(XP.cv_analysed);
    expect(stepReward({ rule: 1 }, facts({ xpEvents: [{ type: "cv_analysed" }] }))).toBeNull();
  });

  it("rules 2 and 3 show the course's own XP (20 × hours)", () => {
    const courseId = "c-statistics-2" as CourseId;
    expect(stepReward({ rule: 2, courseId, ticked: 2, total: 5 }, facts())).toBe(courseXp(getCourse(courseId)));
    const step = { rule: 3, courseId, hours: 12, xp: 240, prep: false, prepares: null, matchNow: 90, matchAfter: 100 } as NextStep;
    expect(stepReward(step, facts())).toBe(240);
  });

  it("rule 4 shows nothing once the job was applied to; rule 5 shows nothing", () => {
    const jobId = "data-analyst-riyadh" as JobId;
    expect(stepReward({ rule: 4, jobId }, facts({ applications: [{ jobId }] }))).toBeNull();
    expect(stepReward({ rule: 5 }, facts())).toBeNull();
  });
});
