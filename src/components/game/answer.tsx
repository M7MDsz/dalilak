"use client";
// The onboarding conversation as a game's dialogue (docs/GAME-LAYER.md 5.6): answers are tactile tiles you press (and the
// chosen one stays pressed home, in ink, with the waypoint at its start), and the six questions are a trail of six stops.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { IconCheck } from "@/components/icons";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";
import { popIn } from "@/lib/motion";

import { Tile, type TileProps } from "./tile";

export interface AnswerTileProps extends Omit<TileProps, "state" | "ribbon" | "radius" | "depth"> {
  /** An icon at the start (a field icon for «الاهتمام»), 20 px. */
  readonly icon?: ReactNode;
  readonly size?: "sm" | "md";
}

/** AnswerTile: a quick reply as a piece you press. `selected` keeps it pressed home in ink. */
export function AnswerTile({ icon, size = "md", selected = false, children, faceClassName, ...rest }: AnswerTileProps) {
  return (
    <Tile
      {...rest}
      aria-pressed={selected}
      depth="sm"
      faceClassName={cn(
        "flex-row items-center whitespace-nowrap font-semibold wp-quiet",
        size === "sm" ? "h-10 gap-1.5 px-3.5 text-small" : "h-11 gap-2 px-4 text-body",
        faceClassName,
      )}
      radius="full"
      selected={selected}
    >
      {selected ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" /> : null}
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      <span className="leading-none">{children}</span>
    </Tile>
  );
}

export interface StepTrailProps {
  /** Number of stops (6 questions). */
  readonly total: number;
  /** The current stop, 1-based; `total + 1` when all are done. */
  readonly current: number;
  /** The words beside the trail. Default «السؤال 3 من 6». `null` hides them. */
  readonly label?: ReactNode | null;
  readonly className?: string;
  readonly testId?: string;
}

/** StepTrail: solid line behind you, the waypoint where you are, a dotted line ahead. The current stop pops when it moves. */
export function StepTrail({ total, current, label, className, testId }: StepTrailProps) {
  const words = label === undefined ? `السؤال ${formatNumber(Math.min(current, total))} من ${formatNumber(total)}` : label;
  return (
    <div className={cn("flex items-center gap-3", className)} data-testid={testId} data-value={Math.min(current, total)}>
      {words ? <span className="shrink-0 text-small font-semibold text-fg">{words}</span> : null}
      <ol aria-hidden className="flex min-w-0 flex-1 items-center">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "current" : "ahead";
          return (
            <li className={cn("flex items-center", i > 0 && "flex-1")} key={n}>
              {i > 0 ? <span className={cn("h-0 min-w-3 flex-1 border-t-2", n <= current ? "border-fg" : "border-dotted border-border-strong")} /> : null}
              {state === "done" ? (
                <span className="inline-grid size-5 shrink-0 place-items-center rounded-full bg-fg text-bg">
                  <IconCheck size={13} strokeWidth={3} waypoint="off" />
                </span>
              ) : state === "current" ? (
                <motion.span animate="show" className="inline-grid size-6 shrink-0 place-items-center rounded-full border-2 border-fg bg-surface" initial="hidden" key={`c-${current}`} variants={popIn}>
                  <span className="size-2.5 rounded-full bg-accent" />
                </motion.span>
              ) : (
                <span className="size-4 shrink-0 rounded-full border-2 border-dotted border-border-strong bg-surface" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
