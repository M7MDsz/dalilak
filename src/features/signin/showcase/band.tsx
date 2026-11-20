"use client";
// Owner: signin. The showcase reduced to one piece at a time (spec 3.1 "Phone": a band about 240 px high at the top,
// one piece with its caption). The same six pieces, in their compact cut, take turns: the old one leaves first (150 ms),
// the next rises in (420 ms) and plays its moment, then rests. Under the caption a small trail shows where the story
// is: covered solid, the current piece as the waypoint, the rest dotted (Darb's progress sentence).
// `panel`: the same, filling a desktop stage too small for the trail composition.
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useRef } from "react";

import { cn, ContourBackdrop, Stage } from "@/components/ui";
import { rise } from "@/lib/motion";

import { Caption } from "./caption";
import { useShowcaseLoop, type PieceState } from "./loop";
import { PIECES } from "./pieces";
import { BAND_DELAY, BAND_TIMING } from "./timing";

export function ShowcaseBand({ variant, className }: { variant: "phone" | "panel"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const loop = useShowcaseLoop(ref, BAND_TIMING);
  // reduced motion: one still piece (the first), at its end state
  const turn = loop.instant ? 0 : Math.min(loop.turn, PIECES.length - 1);
  const state: PieceState = loop.instant ? "done" : loop.phase === "arrived" ? "live" : "ahead";
  const Piece = PIECES[turn];
  const phone = variant === "phone";

  return (
    <div ref={ref} className={className}>
      <Stage data-testid="signin-showcase" aria-hidden inert className={cn("relative h-full overflow-hidden", phone ? "" : "absolute inset-0")}>
        <ContourBackdrop intensity="present" summit={phone ? { x: 0.5, y: 0.05 } : { x: 0.5, y: 0.12 }} />
        <div
          data-testid="signin-showcase-piece"
          data-value={turn + 1}
          className={cn("flex h-full flex-col items-center justify-center px-4", phone ? "gap-2.5 pt-4 pb-3.5" : "gap-5 px-10")}
        >
          <div className={cn("flex w-full items-center justify-center", phone ? "h-40 max-w-[22rem]" : "min-h-56 max-w-[24rem]")}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${loop.cycle}-${turn}`} variants={rise} initial="hidden" animate="show" exit="exit" className="w-full">
                {Piece ? <Piece state={state} delay={BAND_DELAY} compact /> : null}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* the caption leaves and arrives with its piece, so the two never disagree */}
          <div className="h-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${loop.cycle}-${turn}`} variants={rise} initial="hidden" animate="show" exit="exit">
                <Caption index={turn} live className={cn("h-8 justify-center", phone ? "text-[1.0625rem]" : "")} />
              </motion.div>
            </AnimatePresence>
          </div>
          <StoryTrail turn={turn} />
        </div>
      </Stage>
    </div>
  );
}

/** Six stops, right to left: done ones solid, the current one the accent waypoint, the rest dotted. */
function StoryTrail({ turn }: { turn: number }) {
  return (
    <div className="flex items-center" aria-hidden>
      {PIECES.map((_, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <span
              className={cn(
                "h-0 w-5 border-t-2 transition-[border-color] duration-500",
                i <= turn ? "border-solid border-fg" : "border-dotted border-border-strong",
              )}
            />
          ) : null}
          <span
            className={cn(
              "shrink-0 rounded-full transition-[background-color,scale] duration-500",
              i === turn ? "size-2.5 bg-accent" : i < turn ? "size-2 bg-fg" : "size-2 border-[1.5px] border-border-strong",
            )}
          />
        </Fragment>
      ))}
    </div>
  );
}
