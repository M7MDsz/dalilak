"use client";
// ShowcaseStage (playbook block 30): the sign-in showcase director. The real product pieces sit in one fixed composition;
// one piece has the turn (3.3 s) and plays its moment at full contrast while the others rest at 70%, still (70%, not the
// playbook's 55%: text in a resting piece must keep the 4.5:1 floor of the design brief, so use fg / fg-2 there). One caption
// rolls under the stage. When the loop wraps, the whole stage dips (150 ms out, 260 ms in) and every piece resets.
// The loop pauses off screen and in a hidden tab. Reduced motion and still frames: no loop, every piece at its end state.
// Under 1024 px the stage is a band that shows one piece at a time (the same turn), rising in after the old one left.
import { AnimatePresence, motion, useInView, usePageInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { rise, spring, tween } from "@/lib/motion";

import { useInstant } from "./provider";
import { Roll } from "./roll";

export const TURN_MS = 3300;
const REST_OPACITY = 0.7;

export function ShowcaseStage({
  pieces,
  captions,
  turnMs = TURN_MS,
  pieceClassName,
  className,
  bandClassName,
}: {
  /**
   * Each piece renders itself from `active` (its turn: start its moment about 400 ms after it turns true) and `played`
   * (true from its turn until the loop wraps: keep showing the END state after the turn, never rewind one by one).
   */
  pieces: readonly ((active: boolean, played: boolean) => ReactNode)[];
  captions: readonly string[];
  turnMs?: number;
  /** The composition: grid spans and sizes per piece (the designers' call). Default: half width each. */
  pieceClassName?: (index: number) => string;
  className?: string;
  bandClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const instant = useInstant();
  const [turn, setTurn] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [dip, setDip] = useState(false);
  // The piece whose turn it is renders one frame at its START state before it is `played`, on mount and after every
  // wrap (the grid remounts), so its moment plays instead of mounting at its end state.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, [cycle]);
  const onScreen = useInView(ref);
  const tabVisible = usePageInView();
  const count = pieces.length;
  const turnRef = useRef(0);
  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (instant || !onScreen || !tabVisible || count < 2) return;
    let dipTimer: number | undefined;
    const timer = window.setInterval(() => {
      const t = turnRef.current;
      if (t + 1 < count) {
        setTurn(t + 1);
        return;
      }
      // wrap: dip the whole stage out, reset every piece (remount), come back in
      setDip(true);
      dipTimer = window.setTimeout(() => {
        setArmed(false);
        setCycle((c) => c + 1);
        setTurn(0);
        setDip(false);
      }, 150);
    }, turnMs);
    return () => {
      window.clearInterval(timer);
      if (dipTimer !== undefined) window.clearTimeout(dipTimer);
    };
  }, [instant, onScreen, tabVisible, count, turnMs]);

  const activeAt = (i: number) => instant || i === turn;
  const playedAt = (i: number) => instant || i < turn || (i === turn && armed);

  return (
    <div ref={ref} aria-hidden data-testid="signin-showcase" className={className}>
      <motion.div
        key={`grid-${cycle}`}
        className="hidden grid-cols-6 gap-4 lg:grid"
        initial={cycle === 0 ? false : { opacity: 0 }}
        animate={{ opacity: dip ? 0 : 1 }}
        transition={dip ? tween.exit : tween.enter}
      >
        {pieces.map((piece, i) => (
          <motion.div
            key={i}
            className={pieceClassName?.(i) ?? "col-span-3"}
            initial={false}
            animate={{ opacity: activeAt(i) ? 1 : REST_OPACITY, scale: activeAt(i) ? 1 : 0.98 }}
            transition={{ default: spring.gentle, opacity: tween.move }}
          >
            {piece(activeAt(i), playedAt(i))}
          </motion.div>
        ))}
      </motion.div>
      <div className={cn("relative h-60 overflow-hidden lg:hidden", bandClassName)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${cycle}-${turn}`} variants={rise} initial="hidden" animate="show" exit="exit" className="absolute inset-0 grid place-items-center">
            {pieces[turn] && <BandPiece piece={pieces[turn]} instant={instant} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <p data-testid="signin-showcase-piece" data-value={turn + 1} className="mt-4 text-center text-base text-fg-2">
        <Roll id={turn}>{captions[turn] ?? ""}</Roll>
      </p>
    </div>
  );
}

/** The phone band mounts each piece fresh: show its start state for one frame, then let it play to its end state. */
function BandPiece({ piece, instant }: { piece: (active: boolean, played: boolean) => ReactNode; instant: boolean }) {
  const [played, setPlayed] = useState(instant);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlayed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <>{piece(true, played)}</>;
}
