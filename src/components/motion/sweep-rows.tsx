"use client";
// SweepRows (playbook block 31, `jobs-sweep` in the path reveal): rows of job tiles pass by once, alternate rows in
// opposite directions (so nothing needs flipping for RTL), on a linear compositor-only translate. Every tile starts at full
// contrast; after `sortDelay` (mid-pass) the tiles that fit stay and the rest drop to 35%: that drop IS the sorting, so it
// must be seen happening. Tile titles are decoration of the sort (aria-hidden); the result is said in words elsewhere.
// Replaces a marquee: it runs once, with a cause.
import { motion } from "motion/react";

import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type SweepTile = { id: string; title: string; fits: boolean };

/**
 * `rows`: three rows on desktop, four narrower ones on a phone (the caller decides). Each row travels `distance` px
 * (half of it to each side of its rest place) over `duration` s. Remount (key) to play it again.
 */
export function SweepRows({ rows, distance = 220, duration = 1.5, sortDelay = 0.5, className }: { rows: readonly (readonly SweepTile[])[]; distance?: number; duration?: number; sortDelay?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col items-center gap-3 overflow-hidden", className)}>
      {rows.map((row, r) => {
        const dir = r % 2 === 0 ? 1 : -1;
        return (
          <motion.div
            key={r}
            className="flex w-max gap-3"
            initial={{ x: (-distance / 2) * dir }}
            animate={{ x: (distance / 2) * dir }}
            transition={{ duration, ease: "linear" }}
          >
            {row.map((job) => (
              <motion.span
                key={job.id}
                data-fits={job.fits ? "" : undefined}
                className="rounded-lg border border-border bg-surface px-3.5 py-2 text-[15px] font-medium whitespace-nowrap text-fg"
                initial={{ opacity: 1 }}
                animate={{ opacity: job.fits ? 1 : 0.35 }}
                transition={{ ...tween.move, delay: sortDelay }}
              >
                {job.title}
              </motion.span>
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}
