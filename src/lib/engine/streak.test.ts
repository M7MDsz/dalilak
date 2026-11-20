import { describe, expect, it } from "vitest";

import { addDays } from "./clock";
import { dailyReward, dailyRewardAmount, streakInfo } from "./streak";
import { CLOCK, DAY, T0, addEvent, newFacts, withDays, xpEvent } from "./test-fixtures";

const today = CLOCK.today; // 2026-11-18
const d = (n: number) => addDays(today, n);

describe("streak (spec 8.4)", () => {
  it("a new account: streak 1, today in the strip", () => {
    const s = streakInfo(newFacts(), CLOCK);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
    expect(s.last7).toHaveLength(7);
    expect(s.last7[6]).toEqual({ day: today, active: true, today: true });
    expect(s.last7[0]).toEqual({ day: d(-6), active: false, today: false });
  });

  it("+1 when the last active day was yesterday", () => {
    const f = withDays(newFacts(), [d(-2), d(-1), today]);
    expect(streakInfo(f, CLOCK).current).toBe(3);
  });

  it("before today's first load the streak still counts up to yesterday", () => {
    const f = withDays(newFacts(), [d(-2), d(-1)]);
    expect(streakInfo(f, CLOCK).current).toBe(2);
    expect(streakInfo(f, CLOCK).last7[6]).toEqual({ day: today, active: false, today: true });
  });

  it("resets after a missed day, keeping the longest", () => {
    const f = withDays(newFacts(), [d(-6), d(-5), d(-4), d(-3), d(-1)]);
    expect(streakInfo(f, CLOCK)).toMatchObject({ current: 1, longest: 4 });
    const broken = withDays(newFacts(), [d(-5), d(-4)]);
    expect(streakInfo(broken, CLOCK).current).toBe(0);
    expect(streakInfo(withDays(broken, [d(-5), d(-4), today]), CLOCK).current).toBe(1);
  });

  it("counts across a month boundary", () => {
    const end = { ...CLOCK, today: "2026-12-01" };
    const f = withDays(newFacts(), ["2026-11-29", "2026-11-30", "2026-12-01"]);
    expect(streakInfo(f, end).current).toBe(3);
  });
});

describe("daily reward (spec 8.4)", () => {
  it("min(100, 20 × day)", () => {
    expect([1, 2, 3, 4, 5, 6, 30].map(dailyRewardAmount)).toEqual([20, 40, 60, 80, 100, 100, 100]);
    expect(dailyRewardAmount(0)).toBe(20);
  });

  it("is never due on the creation day", () => {
    expect(dailyReward(newFacts(), CLOCK)).toMatchObject({ due: false, day: 1, amount: 20, tomorrow: 40 });
  });

  it("returning seed: created two days ago, active the last two days → day 3, +60, tomorrow +80, due before AND after touchDay", () => {
    const f = withDays(newFacts({ createdAt: T0.getTime() - 2 * DAY, createdDay: d(-2) }), [d(-2), d(-1)]);
    const before = dailyReward(f, CLOCK);
    expect(before).toEqual({ due: true, day: 3, amount: 60, tomorrow: 80, restarted: false });
    const after = dailyReward(withDays(f, [d(-2), d(-1), today]), CLOCK);
    expect(after).toEqual(before);
  });

  it("is not due once today's reward is claimed", () => {
    let f = withDays(newFacts({ createdDay: d(-2) }), [d(-2), d(-1), today]);
    f = addEvent(f, xpEvent("daily_reward", 60, T0.getTime(), today));
    expect(dailyReward(f, CLOCK).due).toBe(false);
    // yesterday's claim does not count for today
    const y = addEvent(withDays(newFacts({ createdDay: d(-2) }), [d(-2), d(-1), today]), xpEvent("daily_reward", 40, T0.getTime() - DAY, d(-1)));
    expect(dailyReward(y, CLOCK).due).toBe(true);
  });

  it("after a break: day 1, +20, and «نبدأ سلسلة جديدة»", () => {
    const f = withDays(newFacts({ createdDay: d(-10) }), [d(-10), d(-9), d(-3)]);
    expect(dailyReward(f, CLOCK)).toEqual({ due: true, day: 1, amount: 20, tomorrow: 40, restarted: true });
  });

  it("caps at 100 from day 5", () => {
    const f = withDays(newFacts({ createdDay: d(-6) }), [d(-6), d(-5), d(-4), d(-3), d(-2), d(-1)]);
    expect(dailyReward(f, CLOCK)).toMatchObject({ day: 7, amount: 100, tomorrow: 100 });
  });
});
