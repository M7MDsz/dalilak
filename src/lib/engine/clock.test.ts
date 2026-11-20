import { describe, expect, it } from "vitest";

import { addDays, dayKey, makeClock, weekStartOf } from "./clock";
import { totalXp, weeklyXp, xpEventId } from "./xp";
import { CLOCK, T0, addEvent, newFacts, xpEvent } from "./test-fixtures";

describe("clock (spec 8.4, 8.7)", () => {
  it("makes a clock from a local date", () => {
    const clock = makeClock(new Date(2026, 10, 18, 21, 14));
    expect(clock.today).toBe("2026-11-18");
    expect(clock.now).toBe(new Date(2026, 10, 18, 21, 14).getTime());
    expect(clock.weekStart).toBe(new Date(2026, 10, 15, 0, 0, 0, 0).getTime());
  });

  it("formats day keys with zero padding", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 0, 6, 0, 0))).toBe("2026-01-06");
  });

  it("adds calendar days across months and years", () => {
    expect(addDays("2026-11-18", -1)).toBe("2026-11-17");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-11-18", 0)).toBe("2026-11-18");
  });

  it("starts the week on Sunday 00:00", () => {
    // Sunday itself
    expect(weekStartOf(new Date(2026, 10, 15, 0, 0))).toBe(new Date(2026, 10, 15).getTime());
    expect(weekStartOf(new Date(2026, 10, 15, 23, 59))).toBe(new Date(2026, 10, 15).getTime());
    // Saturday night belongs to the week that started the Sunday before
    expect(weekStartOf(new Date(2026, 10, 21, 23, 59))).toBe(new Date(2026, 10, 15).getTime());
    expect(weekStartOf(new Date(2026, 10, 22, 0, 0))).toBe(new Date(2026, 10, 22).getTime());
    // across a month boundary
    expect(weekStartOf(new Date(2026, 11, 2))).toBe(new Date(2026, 10, 29).getTime());
  });
});

describe("xp (spec 8.1, 8.7)", () => {
  it("sums all events and this week's events", () => {
    const sunday = new Date(2026, 10, 15).getTime();
    let f = newFacts();
    f = addEvent(f, xpEvent("onboarding_completed", 50, sunday - 1));
    f = addEvent(f, xpEvent("target_set", 30, sunday));
    f = addEvent(f, xpEvent("cv_analysed", 100, T0.getTime()));
    expect(totalXp(f)).toBe(180);
    expect(weeklyXp(f, CLOCK)).toBe(130);
    expect(totalXp(newFacts())).toBe(0);
  });

  it("names events", () => {
    expect(xpEventId("onboarding_completed", null)).toBe("onboarding_completed");
    expect(xpEventId("target_set", null)).toBe("target_set");
    expect(xpEventId("cv_analysed", null)).toBe("cv_analysed");
    expect(xpEventId("course_completed", "c-powerbi-1")).toBe("course_completed:c-powerbi-1");
    expect(xpEventId("job_applied", "data-analyst-riyadh")).toBe("job_applied:data-analyst-riyadh");
    expect(xpEventId("daily_reward", "2026-11-18")).toBe("daily_reward:2026-11-18");
  });
});
