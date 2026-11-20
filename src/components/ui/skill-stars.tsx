"use client";
import { motion } from "motion/react";

import { IconStar, IconStarFilled } from "@/components/icons";
import { spring, tween } from "@/lib/motion";
import { cn } from "@/components/ui/cn";

import { starsLabel } from "./arabic";

// The icon box per size. The star covers 18 of the 24 grid units, so the drawn star (stroke included) is 15 / 18 / 23 px:
// never under 14 px (design brief 3.5).
const SIZE = { sm: 18, md: 22, lg: 28 } as const;
// The empty slot is a solid outline; at sm it is drawn a little heavier so it holds on a projector.
const EMPTY_STROKE = { sm: 2.25, md: 2, lg: 2 } as const;

export interface SkillStarsProps {
  /** Stars held (0..slots). */
  readonly value: number;
  /** The skill's star slots, 1 to 3 (spec 8.5). */
  readonly slots?: 1 | 2 | 3;
  /** The drawn star: sm 15 px (rows; never smaller) · md 18 px (cards, skill panel) · lg 23 px (celebration, CV results) */
  readonly size?: keyof typeof SIZE;
  /** The slot (1-based) whose star was just earned: it lands with a pop (star-award, star-fill). */
  readonly fresh?: number;
  /** Delay before the fresh star lands, in seconds (to follow its cause). */
  readonly freshDelay?: number;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * SkillStars: earned = solid star in ink, empty slot = solid outline in ink-3 (never dotted, never a sparkle). Stars fill from
 * the inline-start. The icons are drawn by the icon set (IconStar, IconStarFilled); their waypoint dot is off here, because
 * a star is not the user's position.
 */
export function SkillStars({ value, slots = 3, size = "md", fresh, freshDelay = 0, className, testId }: SkillStarsProps) {
  const px = SIZE[size];
  return (
    <span
      aria-label={starsLabel(value, slots)}
      className={cn("inline-flex shrink-0 items-center", size === "lg" ? "gap-1" : "gap-0.5", className)}
      data-testid={testId}
      data-value={value}
      role="img"
    >
      {Array.from({ length: slots }, (_, i) => {
        const earned = i < value;
        const landing = earned && fresh === i + 1;
        return (
          <span className="relative inline-grid place-items-center" key={i}>
            {/* the empty outline stays underneath, so a landing star covers its own slot */}
            <IconStar className={cn("text-fg-3", earned && !landing && "invisible")} size={px} strokeWidth={EMPTY_STROKE[size]} waypoint="off" />
            {earned ? (
              <motion.span
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 inline-grid place-items-center text-fg"
                initial={landing ? { scale: 0.4, opacity: 0 } : false}
                transition={{ default: { ...spring.pop, delay: freshDelay }, opacity: { ...tween.fast, delay: freshDelay } }}
              >
                <IconStarFilled size={px} waypoint="off" />
              </motion.span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
