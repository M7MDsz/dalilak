"use client";
// Owner: skills. One line of the tree, from a prerequisite to the skill it opens, in Darb's trail language: covered is
// solid ink, the way ahead is dotted, the leg to the user's next step is dotted in the accent (playbook block 14).
//
// Every change of look is DRAWN, never swapped: the new look is revealed along the line, from the prerequisite to the
// skill, through a mask whose stroke grows (pathLength), over the old look that stays underneath until it is covered.
// A dotted line cannot use pathLength itself (it would lose its dash pattern), hence the mask. The same mechanism draws
// the line for the first time in `tree-grow` (nothing underneath). Lines never un-draw.
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { useInstant } from "@/components/motion";
import { cn } from "@/components/ui";
import { ease } from "@/lib/motion";

import type { LineLook } from "./model";

const LOOK = {
  walked: { width: 2.5, dash: undefined, className: "stroke-fg" },
  next: { width: 3.25, dash: "0.01 8", className: "stroke-accent" },
  open: { width: 3, dash: "0.01 8", className: "stroke-border-strong" },
  closed: { width: 2.5, dash: "0.01 7", className: "stroke-fg-4" },
} as const satisfies Record<LineLook, { width: number; dash: string | undefined; className: string }>;

function Stroke({ d, look, mask }: { d: string; look: LineLook; mask?: string }): ReactNode {
  const style = LOOK[look];
  return (
    <path
      className={style.className}
      d={d}
      fill="none"
      mask={mask ? `url(#${mask})` : undefined}
      strokeDasharray={style.dash}
      strokeLinecap="round"
      strokeWidth={style.width}
    />
  );
}

interface Shown {
  readonly look: LineLook;
  /** The look underneath while the new one draws (null: nothing, the first draw). */
  readonly base: LineLook | null;
  readonly drawing: boolean;
  readonly delay: number;
  readonly run: number;
}

export function TreeLine({
  id,
  d,
  look,
  growDelay,
  dim = false,
  duration = 0.5,
}: {
  /** Unique within the page (used for the mask id). */
  readonly id: string;
  readonly d: string;
  readonly look: LineLook;
  /** Seconds before the line draws for the first time (`tree-grow`); null when the tree does not grow. */
  readonly growDelay: number | null;
  /** Off the selected chain: quieter. */
  readonly dim?: boolean;
  readonly duration?: number;
}): ReactNode {
  const instant = useInstant();
  const [shown, setShown] = useState<Shown>(() => ({
    look,
    base: null,
    drawing: growDelay !== null && !instant,
    delay: growDelay ?? 0,
    run: 0,
  }));
  // A new look: draw it over the one on screen (render-time state adjustment, no effect).
  if (shown.look !== look) {
    setShown({ look, base: instant ? null : shown.look, drawing: !instant, delay: 0, run: shown.run + 1 });
  }

  const maskId = `${id}-m${shown.run}`;
  return (
    <g className={cn("transition-opacity duration-200", dim && "opacity-35")}>
      {shown.drawing && shown.base !== null ? <Stroke d={d} look={shown.base} /> : null}
      {shown.drawing ? (
        <>
          <defs>
            <mask height="100%" id={maskId} maskUnits="userSpaceOnUse" width="100%" x="0" y="0">
              <motion.path
                animate={{ pathLength: 1, opacity: 1 }}
                d={d}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                onAnimationComplete={() => setShown((s) => (s.run === shown.run ? { ...s, base: null, drawing: false } : s))}
                stroke="white"
                strokeLinecap="round"
                strokeWidth={14}
                transition={{
                  pathLength: { duration, delay: shown.delay, ease: ease.inOut },
                  opacity: { duration: 0.01, delay: shown.delay },
                }}
              />
            </mask>
          </defs>
          <Stroke d={d} look={shown.look} mask={maskId} />
        </>
      ) : (
        <Stroke d={d} look={shown.look} />
      )}
    </g>
  );
}
