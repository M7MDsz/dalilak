// Owner: leaderboard. Pure helpers of the `row-climb` replay (spec 3.12, 8.7): the order the page last showed and the
// pace of the climb. No React, no storage, no clock reads.
import type { LeaderRow } from "@/lib/types";

/**
 * The board with the user's row put back at `position` (1-based) and every other row closing up around it, as the page
 * showed it before the climb. `rows` are the 25 rows in rank order (engine `leaderboard().rows`).
 */
export function orderWithMeAt(rows: readonly LeaderRow[], position: number): readonly LeaderRow[] {
  const me = rows.find((row) => row.me);
  if (!me) return rows;
  const others = rows.filter((row) => !row.me);
  const at = Math.max(0, Math.min(others.length, position - 1));
  return [...others.slice(0, at), me, ...others.slice(at)];
}

/**
 * When each step of the climb starts, in ms after the lift: `n + 1` boundaries, step k running from boundary k-1 to k.
 * One place per step, eased in and out (the inverse of easeInOutSine), so the row sets off, passes the middle rows
 * briskly and slows into its new place. Under a second whatever the length, so with the lift and the landing the whole
 * moment is the spec's `row-climb` 1.2 s; a climb of one or two places is shorter, so it never crawls.
 */
export function climbSchedule(places: number): readonly number[] {
  const n = Math.max(1, places);
  const total = Math.min(860, 260 + 75 * n);
  return Array.from({ length: n + 1 }, (_, k) => Math.round((total * Math.acos(1 - (2 * k) / n)) / Math.PI));
}

/** Steps started `elapsed` ms after the first step (step k starts at boundary k-1); 0 before it. */
export function stepsStarted(bounds: readonly number[], places: number, elapsed: number): number {
  if (elapsed < 0) return 0;
  let started = 0;
  for (let k = 0; k < places; k += 1) if ((bounds[k] ?? Infinity) <= elapsed) started = k + 1;
  return started;
}

/**
 * Timeline after the page mounts (ms). The window starts gliding to the climb (only where the card stays in view) while
 * the podium rises; the climb itself starts as `podium-rise` ends (0.8 s), and the card's rank counts on the same clock.
 */
export const GLIDE_START_MS = 200;
export const CLIMB_START_MS = 800;

/** The pause between the row lifting and its first step, so the lift is seen before the move. */
export const LIFT_LEAD_MS = 120;

/** After the last step: the row comes down from its lift (spring.gentle) before the landing is announced. */
export const CLIMB_SETTLE_MS = 220;
