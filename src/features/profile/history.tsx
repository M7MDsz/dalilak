"use client";
// Owner: profile. «سجل النقاط» (spec 3.13, 8.1): every XP event, newest first, each row «+200 XP · أكملت دورة أساسيات
// Power BI · اليوم 21:14». The gain is the game layer's earned reward chip (GAME-LAYER 4: brass outline, a check, XP
// numerals: XP already yours), the reason in ink, the stamp quiet at the end.
// history-roll (playbook 3.11): a row earned while the page is open (the daily reward) joins at the top while the others
// make room (ReorderList); nothing moves on arrival. Index 0 is the newest row.
import type { ReactNode } from "react";

import { RewardChip } from "@/components/game";
import { ReorderList } from "@/components/motion";
import { historyStamp, xpHistoryText } from "@/lib/copy";
import { TID } from "@/lib/testids";
import type { Clock, XpEvent } from "@/lib/types";

import { PROFILE_COPY } from "./copy";
import { Section } from "./section";

export function HistorySection({ events, clock, className }: { readonly events: readonly XpEvent[]; readonly clock: Clock; readonly className?: string }): ReactNode {
  // Stored oldest first; events of one moment keep their order of writing, so reversing (not sorting) is newest first.
  const rows = [...events].reverse();
  return (
    <Section className={className} headingId="profile-history" title={PROFILE_COPY.history}>
      <div data-testid={TID.profile.history}>
        <ReorderList
          className="-my-1 flex flex-col"
          itemClassName="border-b border-border last:border-b-0"
          label={PROFILE_COPY.history}
          rows={rows.map((event, index) => ({
            id: event.id,
            node: (
              <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-start gap-x-3 py-3.5 @min-[640px]/content:grid-cols-[7.25rem_minmax(0,1fr)] @min-[640px]/content:gap-x-4" data-testid={TID.profile.historyRow(index)} data-value={event.amount}>
                <RewardChip className="mt-0.5 justify-self-start" size="sm" status="earned" value={event.amount} />
                {/* phone: the reason, the stamp under it · wide: the reason, the stamp at the inline-end */}
                <span className="flex min-w-0 flex-col gap-0.5 @min-[640px]/content:flex-row @min-[640px]/content:items-baseline @min-[640px]/content:justify-between @min-[640px]/content:gap-4">
                  <span className="min-w-0 text-body leading-snug text-fg">{xpHistoryText(event)}</span>
                  <span className="text-small whitespace-nowrap text-fg-3 tabular-nums">{historyStamp(event.at, clock.now)}</span>
                </span>
              </div>
            ),
          }))}
        />
      </div>
    </Section>
  );
}
