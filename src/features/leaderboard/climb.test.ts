// Owner: leaderboard. The pace of `row-climb` (spec 3.12, "How to read": 1.2 s, starting as `podium-rise` 0.8 s ends)
// and the order replayed before it.
import { describe, expect, it } from "vitest";

import type { LeaderRow } from "@/lib/types";

import { CLIMB_SETTLE_MS, CLIMB_START_MS, GLIDE_START_MS, LIFT_LEAD_MS, climbSchedule, orderWithMeAt, stepsStarted } from "./climb";

const row = (id: string, rank: number, me = false): LeaderRow =>
  ({ id, rank, name: id, city: "", avatar: "av-01", level: 1, weeklyXp: 1000 - rank * 10, me }) as unknown as LeaderRow;

describe("climbSchedule", () => {
  it("climbs the demo's 8 places (18 → 10) within the spec's 1.2 s, lift and landing included", () => {
    const bounds = climbSchedule(8);
    expect(bounds).toHaveLength(9);
    expect(bounds[0]).toBe(0);
    expect(LIFT_LEAD_MS + (bounds[8] ?? 0) + CLIMB_SETTLE_MS).toBeLessThanOrEqual(1200);
    for (let k = 1; k < bounds.length; k += 1) expect(bounds[k]).toBeGreaterThan(bounds[k - 1] ?? 0);
  });

  it("is eased: the middle steps are shorter than the first and the last", () => {
    const b = climbSchedule(8);
    const step = (k: number) => (b[k] ?? 0) - (b[k - 1] ?? 0);
    expect(step(4)).toBeLessThan(step(1));
    expect(step(5)).toBeLessThan(step(8));
  });

  it("starts as the podium has risen, and the window's glide starts before that", () => {
    expect(CLIMB_START_MS).toBeLessThanOrEqual(800);
    expect(GLIDE_START_MS).toBeLessThan(CLIMB_START_MS);
  });
});

describe("stepsStarted", () => {
  it("counts the places climbed so far, one per step, never more than the climb", () => {
    const bounds = climbSchedule(8);
    expect(stepsStarted(bounds, 8, -1)).toBe(0);
    expect(stepsStarted(bounds, 8, 0)).toBe(1);
    expect(stepsStarted(bounds, 8, (bounds[8] ?? 0) + 500)).toBe(8);
    let last = 0;
    for (let t = 0; t <= (bounds[8] ?? 0); t += 10) {
      const now = stepsStarted(bounds, 8, t);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });
});

describe("orderWithMeAt", () => {
  const rows = [row("a", 1), row("b", 2), row("me", 3, true), row("c", 4), row("d", 5)];

  it("puts the user's row back at its old place, the others closing up around it", () => {
    expect(orderWithMeAt(rows, 5).map((r) => r.id)).toEqual(["a", "b", "c", "d", "me"]);
    expect(orderWithMeAt(rows, 1).map((r) => r.id)).toEqual(["me", "a", "b", "c", "d"]);
  });

  it("is the rank order itself at the new place", () => {
    expect(orderWithMeAt(rows, 3).map((r) => r.id)).toEqual(["a", "b", "me", "c", "d"]);
  });
});
