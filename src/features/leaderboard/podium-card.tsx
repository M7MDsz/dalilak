"use client";
// Owner: leaderboard. Spec 3.12 "Podium": ranks 1, 2 and 3 with avatar, name and XP this week. The Podium motion block
// draws the three blocks (`podium-rise`: third first, the winner last, then the people land on them); first place is
// marked by its height and the ink block, never by gold (brass is XP only, DESIGN 4.8). The winner stands at the summit
// of a faint contour map. When the user is in the top three they stand on the podium too, with «أنت».
import type { ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { Podium } from "@/components/motion";
import { Card, ContourBackdrop, XpValue } from "@/components/ui";
import type { LeaderRow } from "@/lib/types";

export function PodiumCard({ top3 }: { readonly top3: readonly LeaderRow[] }): ReactNode {
  const places = top3
    .filter((row): row is LeaderRow & { rank: 1 | 2 | 3 } => row.rank === 1 || row.rank === 2 || row.rank === 3)
    .map((row) => ({ rank: row.rank, node: <Person row={row} /> }));
  return (
    <Card className="relative isolate flex flex-col justify-end overflow-hidden px-4 pb-4 pt-4" padding="none">
      <ContourBackdrop intensity="faint" rings={7} seed={11} summit={{ x: 0.5, y: 0.34 }} />
      <Podium
        // the places fit the 22.5 rem column (and a 390 px phone): three of 100 px with 8 px between them
        className="gap-2 [&>div]:w-[6.25rem]"
        top={places}
      />
    </Card>
  );
}

function Person({ row }: { row: LeaderRow }) {
  const winner = row.rank === 1;
  return (
    <>
      <Avatar id={row.avatar} level={row.level} size={winner ? 60 : 52} />
      <span className="mt-2 max-w-full truncate text-small font-semibold text-fg">{row.name}</span>
      {row.me ? <span className="text-small font-semibold text-accent-fg">أنت</span> : null}
      <XpValue className="mt-1" size="sm" value={row.weeklyXp} />
    </>
  );
}
