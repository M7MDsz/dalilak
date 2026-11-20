"use client";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { IconStreak } from "@/components/icons";
import { Roll, useInstant } from "@/components/motion";
import { ease } from "@/lib/motion";
import { cn } from "@/components/ui/cn";

import { WEEK_DAYS, WEEK_LETTERS, streakDaysWord } from "./arabic";

// ---------------------------------------------------------------------------------------------------------------------
// StreakFlame: the campfire with the day count.

export interface StreakFlameProps {
  readonly days: number;
  /** md: the campfire in its ring, the number, the words (profile, daily reward) · sm: one line for the user chip */
  readonly size?: "sm" | "md";
  readonly className?: string;
  readonly testId?: string;
}

/** When the number changes the number rolls and the fire answers once (streak-tick: its parts flicker about their base). */
export function StreakFlame({ days, size = "md", className, testId }: StreakFlameProps) {
  const instant = useInstant();
  const [tick, setTick] = useState(0);
  const last = useRef(days);
  useEffect(() => {
    if (last.current === days) return;
    last.current = days;
    setTick((t) => t + 1);
  }, [days]);

  const fire = (px: number) => (
    <motion.span
      animate={tick > 0 && !instant ? { scaleY: [1, 1.16, 0.92, 1.06, 1] } : { scaleY: 1 }}
      className="inline-flex"
      key={tick}
      style={{ originY: 1 }}
      transition={{ duration: 0.8, ease: ease.out }}
    >
      <IconStreak size={px} />
    </motion.span>
  );

  if (size === "sm") {
    return (
      <span aria-label={`${days} ${streakDaysWord(days)}`} className={cn("inline-flex items-center gap-1 text-title font-bold leading-none text-fg", className)} data-testid={testId} data-value={days} role="img">
        {fire(20)}
        <Roll id={days}>
          <span className="tabular-nums">{days}</span>
        </Roll>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-4 text-fg", className)} data-testid={testId} data-value={days}>
      <span className="grid size-14 shrink-0 place-items-center rounded-full border-[1.5px] border-fg">{fire(30)}</span>
      <span className="flex flex-col">
        <span className="text-h1 leading-[1.15] tabular-nums">
          <Roll id={days}>{days}</Roll>
        </span>
        <span className="text-small font-medium text-fg-2">{streakDaysWord(days)}</span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// StreakWeek: seven day marks on a trail. done = ink dot · today = the accent waypoint in its ring (you are here) ·
// ahead = dotted circle · missed = an empty ring. Covered stretches are solid, the way ahead is dotted.

export type DayMark = "done" | "today" | "ahead" | "missed";

const STATE_WORD: Record<DayMark, string> = { done: "تمّ", today: "اليوم", ahead: "لم يأتِ بعد", missed: "فات" };

export interface StreakWeekProps {
  /** Seven marks, Sunday first (the week the leaderboard counts from). */
  readonly days: readonly DayMark[];
  /** Letters under the marks; Arabic day initials by default (ح ن ث ر خ ج س). */
  readonly letters?: readonly string[];
  readonly className?: string;
  readonly testId?: string;
}

export function StreakWeek({ days, letters = WEEK_LETTERS, className, testId }: StreakWeekProps) {
  return (
    <ol className={cn("flex items-start", className)} data-testid={testId}>
      {days.map((mark, i) => {
        const next = days[i + 1];
        const covered = mark === "done" && (next === "done" || next === "today");
        return (
          <li aria-label={`${WEEK_DAYS[i] ?? ""}: ${STATE_WORD[mark]}`} className="relative flex w-10 flex-col items-center gap-1.5" data-state={mark} key={i}>
            {next ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[7px] start-[calc(50%+11px)] w-[calc(100%-22px)] border-t-2",
                  covered ? "border-solid border-fg" : "border-dotted border-border-strong",
                )}
              />
            ) : null}
            <span aria-hidden className="grid size-4 place-items-center">
              {mark === "done" ? <span className="size-4 rounded-full bg-solid" /> : null}
              {mark === "today" ? <span className="size-3.5 rounded-full bg-accent outline-[1.5px] outline-offset-[3px] outline-accent outline-solid" /> : null}
              {mark === "ahead" ? <span className="size-4 rounded-full border-2 border-dotted border-border-strong" /> : null}
              {mark === "missed" ? <span className="size-4 rounded-full border-2 border-border-strong" /> : null}
            </span>
            <span aria-hidden className={cn("text-caption", mark === "today" ? "font-bold text-fg" : "font-normal text-fg-3")}>
              {letters[i] ?? ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
