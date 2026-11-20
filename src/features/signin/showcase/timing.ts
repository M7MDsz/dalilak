// Owner: signin. The rhythm of the showcase loop (spec 3.1: "a loop of about 20 s"; playbook 3.1). Each piece holds
// the stage long enough to play its one moment and then rest, so the eye always has a still beat between turns.
import type { LoopTiming } from "./loop";

/** Desktop: the trail draws a leg (0.95 s), then the piece plays and rests; the summit closes the loop. About 22 s. */
export const TRAIL_TIMING: LoopTiming = {
  rest: 700,
  travel: 950,
  live: [1900, 1800, 1750, 2450, 2700, 2300],
  summit: 2600,
};

/** Seconds from a piece's arrival to the start of its moment (the waypoint settles first). */
export const TRAIL_DELAY = 0.15;

/** Phone band and narrow stages: one piece at a time; each rises in, plays and rests. About 18 s. */
export const BAND_TIMING: LoopTiming = {
  rest: 300,
  travel: 0,
  live: [2700, 2500, 2400, 3100, 3300, 2900],
  summit: 0,
};

/** The band's piece rises in (420 ms) before its moment starts. */
export const BAND_DELAY = 0.5;
