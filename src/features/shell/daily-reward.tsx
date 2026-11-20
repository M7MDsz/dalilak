"use client";
// Owner: shell. The daily reward of spec 3.15 / 8.4: the one overlay that blocks (the design system's modal Sheet, on the
// stage, because it is a reward moment). «مكافأة اليوم» · «اليوم 3 على التوالي» (after a broken streak: «أهلاً بعودتك.
// نبدأ سلسلة جديدة.») · a strip of seven days with their rewards · «استلم +60 XP» · «عد غداً لتأخذ +80 XP».
// Test ids: overlay-daily (data-value = XP offered), overlay-daily-claim.
// `daily-claim`: today's cell gets a drawn check, then the sheet closes and the overlay queue raises the XP toast whose
// coin flies to the user chip. Closing it without claiming (Esc, «إغلاق») only postpones it: it is offered again on the
// next load that day (the XP is paid only on «استلم»).
import { motion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";

import { IconGift } from "@/components/icons";
import { Sheet, useInstant } from "@/components/motion";
import { Button, cn } from "@/components/ui";
import { dailyRewardAmount } from "@/lib/engine";
import { formatGain } from "@/lib/format";
import { dur, ease, tween } from "@/lib/motion";
import { TID } from "@/lib/testids";
import type { DailyRewardInfo } from "@/lib/types";

/** How long the drawn check is seen before the sheet closes. */
const CLAIM_HOLD_MS = 520;

/**
 * Spec 3.15 "Phone: level-up and daily reward are centred sheets". The design system's Sheet is a bottom sheet below
 * 1024 px, so on phones the popup centres itself in the Sheet's grid viewport, inset 1 rem, with all four corners round.
 */
const PHONE_CENTRED = "max-lg:self-center max-lg:justify-self-center max-lg:w-[calc(100%-2rem)] max-lg:rounded-2xl";

export function DailyRewardSheet({
  info,
  open,
  onClaim,
  onDismiss,
  onClosed,
}: {
  readonly info: DailyRewardInfo | null;
  readonly open: boolean;
  /** Pays the reward (store.claimDailyReward). */
  readonly onClaim: () => void;
  /** Closed without claiming. */
  readonly onDismiss: () => void;
  /** The close transition has finished (the queue continues). */
  readonly onClosed: () => void;
}): ReactNode {
  const instant = useInstant();
  const [claimed, setClaimed] = useState(false);
  const claimButton = useRef<HTMLButtonElement | null>(null);
  const day = info?.day ?? 1;
  const amount = info?.amount ?? 0;

  const claim = () => {
    if (claimed) return;
    setClaimed(true);
    onClaim();
    window.setTimeout(() => onDismiss(), instant ? 0 : CLAIM_HOLD_MS);
  };

  return (
    <Sheet
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
      onOpenChangeComplete={(next) => {
        if (!next) {
          setClaimed(false);
          onClosed();
        }
      }}
      className={PHONE_CENTRED}
      initialFocus={claimButton}
      open={open}
      size="sm"
      surface="stage"
      title="مكافأة اليوم"
    >
      <div className="flex flex-col items-center gap-5 pt-1 text-center" data-testid={TID.overlay.daily} data-value={amount}>
        <span aria-hidden className="grid size-16 place-items-center rounded-full border-[1.5px] border-xp-line bg-xp text-ink">
          <IconGift size={32} waypoint="off" />
        </span>
        <p className="text-title text-fg">
          {info?.restarted ? (
            "أهلاً بعودتك. نبدأ سلسلة جديدة."
          ) : (
            <>
              اليوم <bdi className="tabular-nums">{day}</bdi> على التوالي
            </>
          )}
        </p>
        <DayStrip claimed={claimed} day={day} />
        <Button className="w-full" data-testid={TID.overlay.dailyClaim} onClick={claim} pressed={claimed} ref={claimButton} size="lg">
          استلم <bdi dir="ltr">{formatGain(amount)} XP</bdi>
        </Button>
        <p className="text-small text-fg-2">
          عد غداً لتأخذ <bdi dir="ltr">{formatGain(info?.tomorrow ?? 0)} XP</bdi>
        </p>
      </div>
    </Sheet>
  );
}

/** Seven days on a trail: the days already behind (solid), today (the waypoint; a drawn check once claimed), the days
 *  ahead (dotted), each with its reward in brass. Long streaks show today in the middle of the window. */
function DayStrip({ day, claimed }: { readonly day: number; readonly claimed: boolean }): ReactNode {
  const start = day <= 4 ? 1 : day - 3;
  const days = Array.from({ length: 7 }, (_, i) => start + i);
  return (
    <ol className="flex w-full items-start justify-between">
      {days.map((n, i) => {
        const state = n < day ? "done" : n === day ? "today" : "ahead";
        const last = i === days.length - 1;
        return (
          <li className="relative flex flex-1 flex-col items-center gap-1.5" data-state={state} key={n}>
            {last ? null : (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[0.6875rem] start-[calc(50%+0.875rem)] w-[calc(100%-1.75rem)] border-t-2",
                  n < day ? "border-solid border-fg" : "border-dotted border-border-strong",
                )}
              />
            )}
            <span aria-hidden className="grid size-6 place-items-center">
              {state === "done" ? <DoneMark /> : null}
              {state === "today" ? <TodayMark claimed={claimed} /> : null}
              {state === "ahead" ? <span className="size-5 rounded-full border-2 border-dotted border-border-strong" /> : null}
            </span>
            <span className="text-caption font-bold text-xp-fg tabular-nums" dir="ltr">
              {formatGain(dailyRewardAmount(n))}
            </span>
            <span className={cn("text-caption tabular-nums", state === "today" ? "font-bold text-fg" : "text-fg-3")}>{n}</span>
          </li>
        );
      })}
    </ol>
  );
}

function DoneMark(): ReactNode {
  return (
    <svg className="size-5 text-fg" fill="none" viewBox="0 0 20 20">
      <circle className="fill-current" cx="10" cy="10" r="10" />
      <path className="stroke-bg" d="M6 10.4 8.7 13 14 7.6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

/** Today: the accent waypoint in its ring; once claimed, a check is drawn over it (240 ms). */
function TodayMark({ claimed }: { readonly claimed: boolean }): ReactNode {
  return (
    <svg className="size-6 overflow-visible" fill="none" viewBox="0 0 24 24">
      <circle className="stroke-accent" cx="12" cy="12" r="10.5" strokeWidth="1.5" />
      <motion.circle animate={{ r: claimed ? 9 : 5.5 }} className="fill-accent" cx="12" cy="12" initial={false} transition={tween.fast} />
      {claimed ? (
        <motion.path
          animate={{ pathLength: 1 }}
          className="stroke-on-accent"
          d="M7.6 12.4 10.6 15.3 16.6 9.2"
          initial={{ pathLength: 0 }}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.25"
          transition={{ duration: dur.check, ease: ease.out, delay: dur.fast }}
        />
      ) : null}
    </svg>
  );
}

