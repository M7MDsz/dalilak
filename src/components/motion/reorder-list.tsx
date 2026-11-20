"use client";
// ReorderList (playbook block 25): rows glide to a new order (jobs, courses, leaderboard, celebration rank). Stable keys,
// `layout="position"` on spring.gentle so text never stretches; a row joining fades in while its neighbours make room;
// a row leaving fades out in 150 ms, taken out of flow (popLayout).
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { spring, tween } from "@/lib/motion";

export type ReorderRow = {
  id: string;
  node: ReactNode;
  /** The user's own row: drawn above its neighbours while it moves. */
  me?: boolean;
  /** Lift the row while it climbs (scale 1.02 and the design system's one neutral shadow, `shadow-float`, fading in). */
  lift?: boolean;
};

export function ReorderList({ rows, className, itemClassName, label }: { rows: readonly ReorderRow[]; className?: string; itemClassName?: string; label?: string }) {
  return (
    <ol aria-label={label} className={cn("relative", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {rows.map((row) => (
          <motion.li
            key={row.id}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: row.lift ? 1.02 : 1 }}
            exit={{ opacity: 0, transition: tween.exit }}
            transition={{ layout: spring.gentle, scale: spring.gentle, opacity: tween.enter }}
            style={{ position: "relative", zIndex: row.me || row.lift ? 1 : 0 }}
            className={itemClassName}
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-float"
              initial={false}
              animate={{ opacity: row.lift ? 1 : 0 }}
              transition={tween.fast}
            />
            {row.node}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
