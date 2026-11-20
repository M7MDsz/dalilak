import { describe, expect, it } from "vitest";

import { BADGE_IDS, type CourseId } from "@/lib/ids";

import { addDays } from "./clock";
import { badgeProgress, badgesEarned } from "./badges";
import {
  CLOCK,
  DAY,
  MINUTE,
  T0,
  addEvent,
  applied,
  completed,
  courseDoneFacts,
  cvAnalysedFacts,
  newFacts,
  onboarded,
  targeted,
  withBadges,
  withDays,
  xpEvent,
} from "./test-fixtures";

const t = T0.getTime();

describe("badge rules (spec 8.6)", () => {
  it("one-time badges follow their events", () => {
    expect(badgesEarned(newFacts(), CLOCK)).toEqual([]);
    const o = onboarded(newFacts(), t);
    expect(badgesEarned(o, CLOCK)).toEqual(["first-steps"]);
    expect(badgesEarned(targeted(o, "data-analyst-riyadh", t), CLOCK)).toEqual(["first-steps", "goal-set"]);
    expect(badgesEarned(cvAnalysedFacts(), CLOCK)).toEqual(["first-steps", "goal-set", "cv-scanned"]);
  });

  it("first application counts at any match", () => {
    const low = applied(cvAnalysedFacts(), "bi-analyst-riyadh", t + 10 * MINUTE, 43);
    expect(badgesEarned(low, CLOCK)).toContain("first-application");
  });

  it("courses: first-course at 1, five-courses at 5; credited courses do not count", () => {
    expect(badgesEarned(courseDoneFacts(), CLOCK)).toEqual(["first-steps", "goal-set", "cv-scanned", "first-course", "top-ten"]);
    let f = cvAnalysedFacts();
    const five: CourseId[] = ["c-powerbi-1", "c-statistics-2", "c-excel-3", "c-dataviz-1", "c-sql-3"];
    five.forEach((id, i) => {
      f = completed(f, id, t + (10 + i) * MINUTE, 100);
    });
    expect(badgesEarned(f, CLOCK)).toContain("five-courses");
    expect(badgeProgress(f, CLOCK).find((b) => b.id === "five-courses")).toMatchObject({ have: 5, need: 5 });
  });

  it("streak badges at 3 and 7 days", () => {
    const d = (n: number) => addDays(CLOCK.today, n);
    expect(badgesEarned(withDays(newFacts(), [d(-1), d(0)]), CLOCK)).not.toContain("streak-3");
    expect(badgesEarned(withDays(newFacts(), [d(-2), d(-1), d(0)]), CLOCK)).toContain("streak-3");
    const week = withDays(newFacts(), [0, 1, 2, 3, 4, 5, 6].map((n) => d(-n)));
    expect(badgesEarned(week, CLOCK)).toEqual(expect.arrayContaining(["streak-3", "streak-7"]));
  });

  it("ten skills with a star", () => {
    const nine = cvAnalysedFacts(); // 8 skills
    expect(badgesEarned(completed(nine, "c-powerbi-1", t + MINUTE, 200), CLOCK)).not.toContain("ten-skills");
    const ten = completed(completed(nine, "c-powerbi-1", t + MINUTE, 200), "c-dataviz-1", t + 2 * MINUTE, 120);
    expect(badgesEarned(ten, CLOCK)).toContain("ten-skills");
  });

  it("level 5 from 1000 XP", () => {
    const f = addEvent(newFacts(), xpEvent("course_completed", 999, t, "c-excel-1"));
    expect(badgesEarned(f, CLOCK)).not.toContain("level-5");
    expect(badgesEarned(addEvent(f, xpEvent("daily_reward", 1, t, CLOCK.today)), CLOCK)).toContain("level-5");
  });

  it("job-ready at 100% with the CURRENT target", () => {
    const ready = completed(courseDoneFacts(), "c-statistics-2", t + 20 * MINUTE, 240);
    expect(badgesEarned(ready, CLOCK)).toContain("job-ready");
    expect(badgesEarned({ ...ready, targetJobId: "bi-analyst-riyadh" }, CLOCK)).not.toContain("job-ready");
  });

  it("top-ten = weekly rank ≤ 10, this week only", () => {
    expect(badgesEarned(cvAnalysedFacts(), CLOCK)).not.toContain("top-ten");
    expect(badgesEarned(courseDoneFacts(), CLOCK)).toContain("top-ten");
    const lastWeek = addEvent(newFacts(), xpEvent("course_completed", 400, t - 7 * DAY, "c-excel-1"));
    expect(badgesEarned(lastWeek, CLOCK)).not.toContain("top-ten");
  });

  it("lists badges in 8.6 order", () => {
    const all = badgesEarned(completed(courseDoneFacts(), "c-statistics-2", t + 20 * MINUTE, 240), CLOCK);
    expect(all).toEqual([...all].sort((a, b) => BADGE_IDS.indexOf(a) - BADGE_IDS.indexOf(b)));
  });
});

describe("badge progress (spec 5.3 list_badges)", () => {
  it("unlocked = held in the facts; counts where the rule counts", () => {
    const f = withBadges(courseDoneFacts(), ["first-steps", "goal-set", "cv-scanned", "first-course", "top-ten"], t, true);
    const p = badgeProgress(f, CLOCK);
    expect(p.map((b) => b.id)).toEqual([...BADGE_IDS]);
    expect(p.filter((b) => b.unlocked).map((b) => b.id)).toEqual(["first-steps", "goal-set", "cv-scanned", "first-course", "top-ten"]);
    expect(p.find((b) => b.id === "first-application")).toEqual({ id: "first-application", unlocked: false, have: 0, need: 1 });
    expect(p.find((b) => b.id === "ten-skills")).toEqual({ id: "ten-skills", unlocked: false, have: 9, need: 10 });
    expect(p.find((b) => b.id === "level-5")).toEqual({ id: "level-5", unlocked: false, have: 380, need: 1000 });
    expect(p.find((b) => b.id === "streak-3")).toEqual({ id: "streak-3", unlocked: false, have: 1, need: 3 });
    expect(p.find((b) => b.id === "job-ready")).toEqual({ id: "job-ready", unlocked: false, have: null, need: null });
    expect(p.find((b) => b.id === "first-steps")).toEqual({ id: "first-steps", unlocked: true, have: null, need: null });
  });

  it("does not invent unlocks: a rule that holds without the badge stored is still locked here", () => {
    expect(badgeProgress(cvAnalysedFacts(), CLOCK).every((b) => !b.unlocked)).toBe(true);
  });
});
