"use client";
// Owner: signin. The headline's last word «بخطوة.» carries the first step of a trail under it, in Darb's progress
// sentence: a short solid stretch (the step taken), the waypoint (you are here: the trailhead), then the way ahead,
// dotted. It draws once when the page arrives (the solid stretch grows from the inline-start, the waypoint lands, the
// dots come in); nothing loops. Reduced motion and still frames: drawn.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { useInstant } from "@/components/motion";
import { spring, tween } from "@/lib/motion";

export function StepMark({ children }: { children: ReactNode }) {
  const instant = useInstant();
  const at = (s: number) => (instant ? 0 : s);
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-[0.2em] flex h-3 items-center">
        {/* the step taken: solid, growing from the start of the word (its right edge: Arabic only, so physical right) */}
        <motion.span
          className="h-[3px] w-[46%] origin-right rounded-full bg-fg"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ ...tween.draw, duration: 0.6, delay: at(0.35) }}
        />
        {/* you are here */}
        <motion.span
          className="mx-1.5 size-2.5 shrink-0 rounded-full bg-accent"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ default: { ...spring.pop, delay: at(0.9) }, opacity: { ...tween.fast, delay: at(0.9) } }}
        />
        {/* the way ahead */}
        <motion.span
          className="h-0 flex-1 border-t-[3px] border-dotted border-border-strong"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...tween.move, delay: at(1.05) }}
        />
      </span>
    </span>
  );
}
