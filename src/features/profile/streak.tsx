"use client";
// Owner: profile. «سلسلة الأيام» (spec 3.13, 8.4): the current streak in words («يوم واحد»), «أطول سلسلة: 1», a strip of
// the last seven days (oldest first, today last, under the day letters of those days) and «مكافأة الغد: +40 XP».
// The strip is the design system's StreakWeek: covered days on a solid line, today the waypoint (the user's position),
// days without a visit an empty ring. The campfire is drawn the way the kit's StreakFlame draws it, with the spec's words
// (StreakFlame writes «اليوم الأول»; the profile's copy is «يوم واحد»).
// Under «مكافأة الغد» the game layer's DailyTrack (docs/GAME-LAYER.md 5.8) lays the daily reward out as brass coins, so
// the reward for coming back grows in front of the user: 20 XP × the streak day, capped at 100 (spec 8.4). Honest to the
// rule: today's coin shows only when today has a reward (offered, or already claimed: the struck coin); on the day the
// account was created there is none (onboarding was that day's event), so the track starts at tomorrow.
import type { ReactNode } from "react";

import { DailyTrack, type DailyDay } from "@/components/game";
import { IconStreak } from "@/components/icons";
import { Roll } from "@/components/motion";
import { StreakWeek, XpValue, type DayMark } from "@/components/ui";
import { countNoun } from "@/lib/copy";
import { dailyRewardAmount } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import { TID } from "@/lib/testids";
import type { DailyRewardInfo, DayKey, StreakInfo } from "@/lib/types";

import { PROFILE_COPY } from "./copy";
import { Section } from "./section";

/** Day initials, Sunday first (the kit's letters: ح ن ث ر خ ج س). */
const DAY_LETTERS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"] as const;

/** Coins on the track: today (when it has a reward) and the days ahead. */
const COINS = 5;

function letterOf(day: DayKey): string {
  const [y, m, d] = day.split("-").map(Number);
  return DAY_LETTERS[new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay()] ?? "";
}

/**
 * The reward track from the real rule. `daily.day` is today's streak day. Today: `today` while the reward is offered,
 * `claimed` once it was taken; on the creation day (no reward today) the track starts at tomorrow.
 */
function rewardDays(daily: DailyRewardInfo, firstDay: boolean): DailyDay[] {
  const start = firstDay ? daily.day + 1 : daily.day;
  return Array.from({ length: COINS }, (_, i) => {
    const day = start + i;
    const isToday = day === daily.day;
    const label = isToday ? "اليوم" : day === daily.day + 1 ? "غداً" : `يوم ${formatNumber(day)}`;
    const state: DailyDay["state"] = isToday ? (daily.due ? "today" : "claimed") : "ahead";
    return { amount: dailyRewardAmount(day), label, state };
  });
}

export function StreakSection({
  streak,
  daily,
  firstDay,
  className,
}: {
  readonly streak: StreakInfo;
  readonly daily: DailyRewardInfo;
  /** Today is the day the account was created (no daily reward today, spec 8.4). */
  readonly firstDay: boolean;
  readonly className?: string;
}): ReactNode {
  const marks: DayMark[] = streak.last7.map((d) => (d.today ? "today" : d.active ? "done" : "missed"));
  const letters = streak.last7.map((d) => letterOf(d.day));
  return (
    <Section className={className} data-testid={TID.profile.streak} data-value={streak.current} headingId="profile-streak" title={PROFILE_COPY.streak}>
      {/* the count and the strip, centred in whatever height the row gives the card (it pairs with the history) */}
      <div className="flex flex-1 flex-col justify-center gap-5">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full border-[1.5px] border-fg text-fg">
            <IconStreak size={30} />
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="text-h2 leading-tight text-fg">
              <Roll id={streak.current}>{countNoun(streak.current, "day")}</Roll>
            </p>
            <p className="text-small text-fg-2">
              {PROFILE_COPY.longest} <bdi className="font-semibold text-fg tabular-nums">{formatNumber(streak.longest)}</bdi>
            </p>
          </div>
        </div>
        <StreakWeek className="justify-between" days={marks} letters={letters} />
      </div>
      <div className="flex flex-col gap-3.5 border-t border-border pt-4">
        <p className="flex flex-wrap items-center gap-2 text-small text-fg-2">
          {PROFILE_COPY.tomorrow}
          <XpValue gain size="sm" value={daily.tomorrow} />
        </p>
        <DailyTrack days={rewardDays(daily, firstDay)} />
      </div>
    </Section>
  );
}
