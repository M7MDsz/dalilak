"use client";
// Owner: leaderboard. A local cousin of the ReorderList motion block, for `row-climb` only. ReorderList moves every row on
// spring.gentle; stepped one place at a time, that spring trails the steps by two places, so the climbing row floated over
// rows it had not passed yet while a hole opened ahead of it. Here the user's row follows the climb's own clock instead:
// each step is a straight segment as long as the time to the next step (the steps themselves are eased, slow at both
// ends), so the row is always on its slot, and each row it passes ducks one place on spring.gentle, as in ReorderList.
// While it climbs the row is lifted: scale 1.02 and the one neutral shadow (shadow-float) fading in, never a glow.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/components/ui";
import { spring, tween } from "@/lib/motion";

export interface ClimbRow {
  readonly id: string;
  readonly node: ReactNode;
  readonly me: boolean;
}

export function ClimbList({
  rows,
  lifted,
  segmentS,
  className,
  itemClassName,
}: {
  readonly rows: readonly ClimbRow[];
  /** The user's row is climbing (lift it and let it follow the step clock). */
  readonly lifted: boolean;
  /** Length of the step the user's row is travelling now, in seconds. */
  readonly segmentS: number;
  readonly className?: string;
  readonly itemClassName?: string;
}): ReactNode {
  return (
    <ol className={cn("relative", className)}>
      {rows.map((row) => {
        const climbing = row.me && lifted;
        return (
          <motion.li
            animate={{ scale: climbing ? 1.02 : 1 }}
            className={itemClassName}
            key={row.id}
            layout="position"
            style={{ position: "relative", zIndex: row.me ? 1 : 0 }}
            transition={{
              layout: climbing ? { type: "tween", duration: segmentS, ease: "linear" } : spring.gentle,
              scale: spring.gentle,
            }}
          >
            {row.me ? (
              <motion.span
                animate={{ opacity: climbing ? 1 : 0 }}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-float"
                initial={false}
                transition={tween.fast}
              />
            ) : null}
            {row.node}
          </motion.li>
        );
      })}
    </ol>
  );
}
