import { describe, expect, it } from "vitest";

import { pendingNews } from "./news";
import {
  CLOCK,
  DAY,
  MINUTE,
  T0,
  addEvent,
  applied,
  completed,
  cvAnalysedFacts,
  newFacts,
  onboarded,
  quiet,
  targeted,
  withBadges,
  withCv,
  xpEvent,
} from "./test-fixtures";

const t = T0.getTime();

describe("pending news (spec 3.15)", () => {
  it("nothing to announce", () => {
    expect(pendingNews(newFacts(), CLOCK)).toEqual({ xp: null, badges: [] });
    expect(pendingNews(cvAnalysedFacts(), CLOCK)).toEqual({ xp: null, badges: [] });
  });

  it("after the reveal: one merged +80 toast with no rank line (weekly XP was 0), and two badges", () => {
    let f = onboarded(newFacts(), t + MINUTE);
    f = withBadges(f, ["first-steps"], t + MINUTE);
    f = targeted(f, "data-analyst-riyadh", t + 2 * MINUTE);
    f = withBadges(f, ["goal-set"], t + 2 * MINUTE);
    expect(pendingNews(f, CLOCK)).toEqual({
      xp: {
        eventIds: ["onboarding_completed", "target_set"],
        amount: 80,
        types: ["onboarding_completed", "target_set"],
        rankLine: null,
        levelUp: null,
      },
      badges: ["first-steps", "goal-set"],
    });
  });

  it("the CV: +100 with rank 18 and the level-up to 2", () => {
    let f = quiet(targeted(onboarded(newFacts(), t + MINUTE), "data-analyst-riyadh", t + 2 * MINUTE));
    f = withBadges(withCv(f, t + 3 * MINUTE), ["cv-scanned"], t + 3 * MINUTE);
    expect(pendingNews(f, CLOCK)).toEqual({
      xp: { eventIds: ["cv_analysed"], amount: 100, types: ["cv_analysed"], rankLine: 18, levelUp: { level: 2, title: "مستكشف", xpToNext: 170 } },
      badges: ["cv-scanned"],
    });
  });

  it("the application: +40 and no rank line (rank stays 10)", () => {
    const f = applied(quiet(completed(cvAnalysedFacts(), "c-powerbi-1", t + 5 * MINUTE, 200)), "data-analyst-riyadh", t + 10 * MINUTE, 90);
    expect(pendingNews(f, CLOCK).xp).toEqual({
      eventIds: ["job_applied:data-analyst-riyadh"],
      amount: 40,
      types: ["job_applied"],
      rankLine: null,
      levelUp: null,
    });
  });

  it("a course reloaded before the celebration's beat 1: +200, rank 10, level 3", () => {
    const f = completed(cvAnalysedFacts(), "c-powerbi-1", t + 5 * MINUTE, 200);
    expect(pendingNews(f, CLOCK).xp).toMatchObject({ amount: 200, rankLine: 10, levelUp: { level: 3, title: "مجتهد", xpToNext: 220 } });
  });

  it("several gains merge, and a gain crossing two levels shows the final level only", () => {
    let f = quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t));
    f = withCv(f, t + MINUTE);
    f = completed(f, "c-powerbi-1", t + 2 * MINUTE, 200);
    f = completed(f, "c-statistics-2", t + 3 * MINUTE, 240);
    const xp = pendingNews(f, CLOCK).xp;
    expect(xp?.amount).toBe(540);
    expect(xp?.levelUp).toEqual({ level: 4, title: "متمكّن", xpToNext: 380 });
    expect(xp?.rankLine).toBe(7);
  });

  it("only this week's part of the gain counts for the rank line", () => {
    // an old un-announced event from last week does not count as weekly XP before or after
    let f = newFacts({ createdDay: "2026-11-01" });
    f = addEvent(f, xpEvent("course_completed", 300, t - 10 * DAY, "c-excel-1", false));
    f = addEvent(f, xpEvent("daily_reward", 100, t, CLOCK.today, false));
    const xp = pendingNews(f, CLOCK).xp;
    expect(xp?.amount).toBe(400);
    expect(xp?.rankLine).toBeNull();
  });
});
