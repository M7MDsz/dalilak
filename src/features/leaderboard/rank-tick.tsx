"use client";
// Owner: leaderboard. The ranks that change during `row-climb`: my card's big number, the climbing row's digit, and the
// digit of each row it passes. The climb changes them every 70-230 ms, faster than a Roll (420 ms, with blur) can
// finish, which left cells blank mid-climb. Here each new number slides in a few pixels in 100 ms, fully opaque, and the
// old one is gone at once (no exit, so the cell only ever holds one number): an odometer tick that is legible on every
// frame. `dir = 1` comes up from below (a rank that improved), `-1` comes down from above (a row the user passed). The
// first render does not move.
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { ease } from "@/lib/motion";

export function RankTick({ value, dir = 1, className }: { readonly value: number; readonly dir?: 1 | -1; readonly className?: string }): ReactNode {
  // "moved" turns true at the first change of value (React's adjust-state-on-prop-change pattern), so the number shown
  // on arrival stands still and every later one ticks in.
  const [prev, setPrev] = useState(value);
  const [moved, setMoved] = useState(false);
  if (value !== prev) {
    setPrev(value);
    setMoved(true);
  }
  return (
    <span className={cn("relative inline-flex overflow-hidden align-middle", className)}>
      <motion.span
        animate={{ y: "0%" }}
        className="inline-flex items-center whitespace-nowrap"
        dir="ltr"
        initial={moved ? { y: `${38 * dir}%` } : false}
        key={value}
        transition={{ duration: 0.1, ease: ease.out }}
      >
        {formatNumber(value)}
      </motion.span>
    </span>
  );
}
