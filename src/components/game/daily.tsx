"use client";
// DailyTrack: the daily reward of spec 8.4 laid out as a track of brass coins, so the real reward of coming back tomorrow is
// visible (20 XP × the streak day, capped at 100). Claimed days are struck coins joined by a solid line; today is your
// position; the days ahead are dotted, with their amounts. Nothing here pays XP: the claim is the daily-reward sheet's job.
import { motion } from "motion/react";

import { IconCheck } from "@/components/icons";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";
import { popIn } from "@/lib/motion";

import { dailyRewardFor } from "./state";

export type DailyState = "claimed" | "today" | "ahead" | "missed";

export interface DailyDay {
  /** The XP of that day's reward (use dailyRewardFor(day)). */
  readonly amount: number;
  /** Under the coin: «اليوم», «غداً», «يوم 4». */
  readonly label: string;
  readonly state: DailyState;
}

export interface DailyTrackProps {
  readonly days: readonly DailyDay[];
  readonly className?: string;
  readonly testId?: string;
}

/** The track for a streak: `daysFor(streak, claimedToday)` gives five days from yesterday with the spec's amounts. */
export function dailyDays(streak: number, claimedToday: boolean, count = 5): DailyDay[] {
  const first = Math.max(1, streak - 1);
  return Array.from({ length: count }, (_, i) => {
    const day = first + i;
    const state: DailyState = day < streak ? "claimed" : day === streak ? (claimedToday ? "claimed" : "today") : "ahead";
    const label = day === streak ? "اليوم" : day === streak + 1 ? "غداً" : `يوم ${formatNumber(day)}`;
    return { amount: dailyRewardFor(day), label, state };
  });
}

function Coin({ d }: { d: DailyDay }) {
  const amount = (
    <span className="text-caption font-bold leading-none tabular-nums" dir="ltr">
      +{formatNumber(d.amount)}
    </span>
  );
  if (d.state === "claimed") {
    return (
      <span className="inline-grid size-11 place-items-center rounded-full border-2 border-xp-line bg-xp text-ink">
        <IconCheck size={20} strokeWidth={2.6} waypoint="off" />
      </span>
    );
  }
  if (d.state === "today") {
    return (
      <motion.span animate="show" className="inline-grid size-11 place-items-center rounded-full border-2 border-ink bg-xp text-ink" initial="hidden" variants={popIn}>
        {amount}
      </motion.span>
    );
  }
  if (d.state === "missed") {
    return <span className="inline-grid size-11 place-items-center rounded-full border-[1.5px] border-border-strong bg-surface-2 text-fg-3">{amount}</span>;
  }
  return <span className="inline-grid size-11 place-items-center rounded-full border-2 border-dashed border-border-strong bg-surface text-fg-2">{amount}</span>;
}

export function DailyTrack({ days, className, testId }: DailyTrackProps) {
  return (
    <ol className={cn("flex items-start", className)} data-testid={testId}>
      {days.map((d, i) => {
        const prev = days[i - 1];
        const joined = prev?.state === "claimed" && (d.state === "claimed" || d.state === "today");
        return (
          <li className="flex min-w-0 flex-1 flex-col items-center gap-1.5 first:flex-none" data-state={d.state} key={`${d.label}-${i}`}>
            <span className="flex w-full items-center">
              {i > 0 ? <span aria-hidden className={cn("h-0 flex-1 border-t-2", joined ? "border-fg" : "border-dotted border-border-strong")} /> : null}
              <Coin d={d} />
            </span>
            <span className={cn("w-full text-end text-caption", d.state === "today" ? "font-semibold text-accent-fg" : "text-fg-2", i === 0 && "text-center")}>
              <span className={cn("inline-block min-w-11 text-center")}>{d.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
