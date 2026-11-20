"use client";
// Leaderboard motion (playbook block 28): useClimb replays the order the user last saw, then the order now, so the
// user's row visibly passes the rows it overtook (feed the result to ReorderList). Podium blocks rise from the baseline,
// third first and the winner last; then the people on them pop in.
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { spring, tween } from "@/lib/motion";

import { useInstant } from "./provider";

/** First paint shows `before`, then `after` once `delayMs` has passed (at once under reduced motion or still frames). */
export function useClimb<T>(before: T, after: T, delayMs = 500): T {
  const instant = useInstant();
  const [shown, setShown] = useState(before);
  useEffect(() => {
    const timer = setTimeout(() => setShown(after), instant ? 0 : delayMs);
    return () => clearTimeout(timer);
  }, [after, delayMs, instant]);
  return shown;
}

const HEIGHT: Record<1 | 2 | 3, number> = { 1: 128, 2: 96, 3: 80 };

export type PodiumPlace = { rank: 1 | 2 | 3; node: ReactNode };

/**
 * Three places in the order second, first, third (the RTL row puts first in the middle). Each place: its `node` (avatar,
 * name, XP) above a block that grows from the baseline. The winner's block is ink, the others are outlined sheets.
 * Test ids `leaderboard-podium-{rank}` are on each place. `restored` renders at rest.
 */
export function Podium({ top, restored = false, className }: { top: readonly PodiumPlace[]; restored?: boolean; className?: string }) {
  const order: (1 | 2 | 3)[] = [2, 1, 3];
  return (
    <div className={cn("relative flex items-end justify-center gap-3 pb-[1.5px]", className)}>
      {/* the baseline the three blocks stand on */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[1.5px] bg-fg" />
      {order.map((rank) => {
        const place = top.find((p) => p.rank === rank);
        if (!place) return null;
        const delay = (3 - rank) * 0.08; // third rises first, the winner last
        return (
          <div key={rank} data-testid={`leaderboard-podium-${rank}`} className="flex w-24 flex-col items-center gap-2 sm:w-28">
            <motion.div
              initial={restored ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ default: { ...spring.pop, delay: delay + 0.3 }, opacity: { ...tween.fast, delay: delay + 0.3 } }}
              className="flex flex-col items-center text-center"
            >
              {place.node}
            </motion.div>
            <div className="relative w-full" style={{ height: HEIGHT[rank] }}>
              <motion.div
                className={cn("absolute inset-0 rounded-t-lg", rank === 1 ? "bg-fg" : "border-[1.5px] border-b-0 border-fg bg-surface")}
                style={{ originY: 1 }}
                initial={restored ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...tween.move, delay }}
              />
              <motion.span
                dir="ltr"
                className={cn("absolute inset-x-0 top-3 text-center text-2xl font-bold tabular-nums", rank === 1 ? "text-surface" : "text-fg")}
                initial={restored ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...tween.fast, delay: delay + 0.25 }}
              >
                {rank}
              </motion.span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
