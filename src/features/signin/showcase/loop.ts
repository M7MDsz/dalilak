"use client";
// Owner: signin. The showcase director (spec 3.1 `showcase-loop`, playbook 3.1). A local version of the shared
// ShowcaseStage's loop, because the trail composition needs what that block keeps inside: the turn and its phase (the
// trail draws to a waypoint, THEN its piece plays), a summit beat, and a rest before the loop wraps.
//
//   rest ─► travel(0) ─► arrived(0) ─► travel(1) ─► … ─► arrived(5) ─► travel(6) ─► arrived(6: the summit) ─► dip ─► rest
//
// Each step waits a fixed time (no step waits on another component), so the rhythm is the same on every loop and
// nothing jitters. The loop pauses off screen and in a hidden tab (spec: "it pauses when the tab is hidden"); on resume
// the current step runs its full time again. Reduced motion and still frames: no loop; the end of the story shows at
// once (every piece at its end state, the trail drawn to the summit).
import { useInView, usePageInView } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { useInstant } from "@/components/motion";

export type LoopPhase = "rest" | "travel" | "arrived";

export interface LoopState {
  /** Bumped when the loop wraps: everything keyed by it starts again from its first state, under the dip. */
  readonly cycle: number;
  /** 0..5 = piece 1..6; 6 = the summit (desktop only). */
  readonly turn: number;
  readonly phase: LoopPhase;
  /** True for the 150 ms the stage fades out before it resets. */
  readonly dip: boolean;
}

export interface LoopTiming {
  /** The calm frame before the first leg draws (ms). */
  readonly rest: number;
  /** One leg of the trail drawing to its waypoint (0 on the phone, where there is no trail). */
  readonly travel: number;
  /** How long each piece holds the stage after it arrived, its moment included (ms), piece 1..6. */
  readonly live: readonly number[];
  /** The summit beat after the last leg (0: no summit, the phone). */
  readonly summit: number;
}

const DIP_MS = 160;

export function useShowcaseLoop(ref: RefObject<HTMLElement | null>, timing: LoopTiming): LoopState & { readonly instant: boolean } {
  const instant = useInstant();
  const onScreen = useInView(ref);
  const tabVisible = usePageInView();
  const pieces = timing.live.length;
  const last = timing.summit > 0 ? pieces : pieces - 1;
  const [state, setState] = useState<LoopState>({ cycle: 0, turn: 0, phase: "rest", dip: false });
  const timingRef = useRef(timing);
  useEffect(() => {
    timingRef.current = timing;
  });

  const running = !instant && onScreen && tabVisible;
  const { cycle, turn, phase, dip } = state;

  useEffect(() => {
    if (!running) return;
    const t = timingRef.current;
    let timer: number;
    if (dip) {
      timer = window.setTimeout(() => setState((s) => ({ cycle: s.cycle + 1, turn: 0, phase: "rest", dip: false })), DIP_MS);
    } else if (phase === "rest") {
      timer = window.setTimeout(() => setState((s) => ({ ...s, phase: t.travel > 0 ? "travel" : "arrived" })), t.rest);
    } else if (phase === "travel") {
      timer = window.setTimeout(() => setState((s) => ({ ...s, phase: "arrived" })), t.travel);
    } else {
      const hold = turn < pieces ? (t.live[turn] ?? 2400) : t.summit;
      timer = window.setTimeout(() => {
        setState((s) => {
          if (s.turn >= last) return { ...s, dip: true };
          return { ...s, turn: s.turn + 1, phase: t.travel > 0 ? "travel" : "arrived" };
        });
      }, hold);
    }
    return () => window.clearTimeout(timer);
  }, [running, cycle, turn, phase, dip, pieces, last]);

  if (instant) return { cycle: 0, turn: last, phase: "arrived", dip: false, instant };
  return { ...state, instant };
}

/** What a piece shows: its start state, its moment (once, when it arrives), or its end state. */
export type PieceState = "ahead" | "live" | "done";

export function pieceState(index: number, loop: LoopState): PieceState {
  if (loop.turn > index) return "done";
  if (loop.turn === index && loop.phase === "arrived") return "live";
  return "ahead";
}
