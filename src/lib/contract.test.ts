// Owner: architect. The one trivial test that proves `npm test` and the "@/" alias work, plus id-list sanity
// (counts of spec 9.8 checks 1-3 on the id lists themselves; the data agent tests the data), plus the few contract
// functions the architect wrote in full (pendingQuestion, stateFromFacts / factsOf).
import { describe, expect, it } from "vitest";

import { pendingQuestion } from "@/lib/brain/onboarding";
import { BADGE_IDS, COURSE_IDS, FIELD_IDS, JOB_IDS, LEADERBOARD_USER_IDS, SKILL_IDS, courseIdFor } from "@/lib/ids";
import { hrefFor, parsePathname } from "@/lib/routes";
import { factsOf, INITIAL_SEEN, stateFromFacts } from "@/lib/store/snapshot";
import type { OnboardingAnswers, UserFacts } from "@/lib/types";

describe("contract", () => {
  it("has the spec's id counts", () => {
    expect(FIELD_IDS).toHaveLength(23);
    expect(SKILL_IDS).toHaveLength(114);
    expect(COURSE_IDS).toHaveLength(185);
    expect(JOB_IDS).toHaveLength(170);
    expect(BADGE_IDS).toHaveLength(12);
    expect(LEADERBOARD_USER_IDS).toHaveLength(24);
  });

  it("maps a skill star to its course id", () => {
    expect(courseIdFor("powerbi", 1)).toBe("c-powerbi-1");
    expect(courseIdFor("dataviz", 2)).toBeNull();
  });

  it("builds and reads URLs", () => {
    expect(hrefFor({ screen: "job", jobId: "data-analyst-riyadh", apply: true })).toBe("/jobs/data-analyst-riyadh?apply=1");
    expect(hrefFor({ screen: "learn", tab: "explore", field: "data" })).toBe("/learn?tab=explore&field=data");
    expect(parsePathname("/learn/c-powerbi-1")).toEqual({ route: "course", id: "c-powerbi-1" });
    expect(parsePathname("/nope")).toBeNull();
  });

  it("derives the pending onboarding question (spec 4.1, 4.3)", () => {
    expect(pendingQuestion({})).toBe("city");
    expect(pendingQuestion({ city: { value: "jeddah", label: "جدة" }, major: { value: "marketing", label: "تسويق" } })).toBe("education");
    expect(
      pendingQuestion({
        city: { value: "riyadh", label: "الرياض" },
        education: "bachelor",
        major: { value: "mis", label: "نظم معلومات إدارية" },
        experience: "none",
        interest: ["data"],
        priority: "first-job",
      }),
    ).toBeNull(); // 21 Nov 2026 (owner): the company step is no longer asked
    // 20 Nov 2026: the seventh step (the company, «لا، مو الحين» = "none") completes it
    const seven: OnboardingAnswers = {
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
      experience: "none",
      interest: ["data"],
      company: "none",
      priority: "first-job",
    };
    expect(pendingQuestion(seven)).toBeNull();
  });

  it("wraps facts in a simulation state and gets them back (spec 5.2)", () => {
    const facts: UserFacts = {
      id: "خالد",
      name: "خالد",
      avatar: "av-01",
      createdAt: 1_000,
      createdDay: "2026-11-18",
      answers: {},
      onboardingCompletedAt: null,
      targetJobId: "data-analyst-riyadh",
      cv: null,
      cvSkipped: false,
      courses: {},
      xpEvents: [],
      applications: [],
      activeDays: ["2026-11-18"],
      badges: [],
    };
    const state = stateFromFacts(facts);
    expect(factsOf(state)).toEqual(facts);
    expect(state.seen).toEqual(INITIAL_SEEN);
    expect(state.advisor.messages).toHaveLength(0);
  });
});
