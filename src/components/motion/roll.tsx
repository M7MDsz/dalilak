"use client";
// Roll (playbook block 6): any value replacing another in place: a status step, a step counter, a level, a streak,
// a rank, a state label. In a clipped line the old value leaves upward and the new one arrives from below, each with
// 2 px of blur, 420 ms. Big numbers count instead (NumberTicker).
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

const rollVariants: Variants = {
  from: (dir: number) => ({ y: `${100 * dir}%`, opacity: 0, filter: "blur(2px)" }),
  rest: { y: "0%", opacity: 1, filter: "blur(0px)", transition: tween.move },
  to: (dir: number) => ({ y: `${-100 * dir}%`, opacity: 0, filter: "blur(2px)", transition: tween.move }),
};

/**
 * `id` is what changed (the label itself, or the number). `dir = -1` rolls downward (a rank that got worse).
 * The first render does not roll. The line is 1.9em tall so Arabic ascenders and marks are never clipped.
 */
export function Roll({ id, dir = 1, children, className }: { id: string | number; dir?: 1 | -1; children: ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-flex h-[1.9em] overflow-hidden align-middle", className)}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span key={id} custom={dir} variants={rollVariants} initial="from" animate="rest" exit="to" className="inline-flex items-center whitespace-nowrap">
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
