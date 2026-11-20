"use client";
// The course-completion celebration's director (playbook 3.9): one overlay plays the spec's beats in order (course, XP,
// star, match, level, badges, rank) on useShow. The current beat rises in and plays; past beats rest at 70% (the
// playbook's 60% put fg-2 labels under the 4.5:1 floor); when the show ends (or the user presses anything) every beat is
// shown settled at its final value. Under reduced motion it opens settled (the spec's one rule).
import { motion, type Variants } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

import { useInstant } from "./provider";
import { resultOnly, useShow, type ShowStep } from "./show";

export type BeatState = "hidden" | "now" | "past" | "settled";

const beatVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  now: { opacity: 1, y: 0, transition: tween.move },
  past: { opacity: 0.7, y: 0, transition: tween.move },
  settled: { opacity: 1, y: 0, transition: tween.fast },
};

/**
 * `beats`: the steps that apply (leave the others out; about 5 s in total). `rows[i]` renders beat i; a function row
 * receives its state, so its own moment (a count, a ring, a Burst) starts when it becomes "now" and shows the final value
 * when "settled". `settle` jumps to the settled state at once (a press before the end). `onSettled` fires once.
 */
export function CelebrationBeats({
  beats,
  open,
  rows,
  settle = false,
  onSettled,
  className,
}: {
  beats: readonly ShowStep<string>[];
  open: boolean;
  rows: readonly (ReactNode | ((state: BeatState) => ReactNode))[];
  settle?: boolean;
  onSettled?: () => void;
  className?: string;
}) {
  const instant = useInstant();
  const { index, done, skip } = useShow(instant ? resultOnly(beats) : beats, open, () => onSettled?.());
  useEffect(() => {
    if (settle) skip();
  }, [settle, skip]);
  return (
    <div data-testid="celebration-overlay" data-beat={index + 1} data-settled={done ? "" : undefined} className={cn("flex flex-col gap-3", className)}>
      {rows.map((row, i) => {
        const state: BeatState = done ? "settled" : i === index ? "now" : i < index ? "past" : "hidden";
        return (
          <motion.div key={i} variants={beatVariants} initial="hidden" animate={state}>
            {typeof row === "function" ? row(state) : row}
          </motion.div>
        );
      })}
    </div>
  );
}
