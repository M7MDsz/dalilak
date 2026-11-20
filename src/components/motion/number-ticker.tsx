"use client";
// NumberTicker (playbook block 12): big numbers count (XP totals, gaps). A motion value renders the text, so counting
// never re-renders React. Latin digits, tabular figures, isolated left-to-right.
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { dur, ease } from "@/lib/motion";

import { useInstant } from "./provider";

/**
 * Shows `value`. On first paint it shows `from` (default: `value`, so nothing counts on load) and counts to `value`;
 * every later change counts from what is on screen. 800 ms ease-out. Reduced motion and still frames jump.
 * `data-value` always holds the final value (for QA).
 */
export function NumberTicker({
  value,
  from,
  format = formatNumber,
  duration = dur.count,
  delay = 0,
  className,
}: {
  value: number;
  from?: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const instant = useInstant();
  const mv = useMotionValue(from ?? value);
  const text = useTransform(() => format(Math.round(mv.get())));
  useEffect(() => {
    if (instant) {
      mv.jump(value);
      return;
    }
    const controls = animate(mv, value, { duration, delay, ease: ease.out });
    return () => controls.stop();
  }, [instant, mv, value, duration, delay]);
  return (
    <motion.span dir="ltr" data-value={value} className={cn("inline-block tabular-nums", className)}>
      {text}
    </motion.span>
  );
}
