"use client";
// Owner: signin. What every showcase piece shares: the white sheet it sits on (a paper card floating on the stage,
// DESIGN.md 3.3) and `usePlayed`, which turns the director's state into "start state" or "end state" so a piece always
// plays its moment FROM its start state, whether it was on screen before its turn (desktop) or mounted for it (phone).
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/ui";

import type { PieceState } from "./loop";

export interface PieceProps {
  readonly state: PieceState;
  /** Seconds between the piece getting its turn and its moment starting (the waypoint settles, or the band rises). */
  readonly delay: number;
  /** The phone band's smaller cut (one piece at a time in about 240 px). */
  readonly compact?: boolean;
}

/** False while a piece shows its start state, true once its moment has begun (and ever after, until the loop wraps). */
export function usePlayed(state: PieceState): boolean {
  // a piece mounted already "live" (the phone band) renders one frame at its start state, then plays
  const [armed, setArmed] = useState(state !== "live");
  useEffect(() => {
    if (state !== "live" || armed) return;
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, [state, armed]);
  if (state === "ahead") return false;
  if (state === "done") return true;
  return armed;
}

/**
 * The beats of a piece's moment: -1 (start state) until `played`, then 0, 1, … at the given times (ms after `played`
 * turned true). Back to -1 when `played` turns false. Reduced motion and still frames: the last beat at once.
 */
export function useSteps(played: boolean, at: readonly number[], instant: boolean): number {
  const [step, setStep] = useState(-1);
  const times = useRef(at);
  times.current = at;
  const key = at.join(",");
  useEffect(() => {
    if (!played) {
      setStep(-1);
      return;
    }
    const beats = times.current;
    if (instant) {
      setStep(beats.length - 1);
      return;
    }
    const timers = beats.map((ms, i) => window.setTimeout(() => setStep((s) => Math.max(s, i)), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [played, instant, key]);
  return step;
}

/** The white sheet of a piece: flat, no shadow (the stage gives it all the contrast it needs). */
export function PieceCard({ children, className, compact = false }: { children: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div data-surface="paper" className={cn("skin-piece relative rounded-card bg-surface text-fg", compact ? "p-3.5" : "p-4", className)}>
      {children}
    </div>
  );
}
