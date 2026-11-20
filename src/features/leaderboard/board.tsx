"use client";
// Owner: leaderboard. The full weekly board (spec 3.12 "List"): all 25 rows in rank order on one sheet. Each row: rank ·
// avatar with its level ring · name · city · «المستوى 5» · XP this week; the user's row is the ink row with «أنت»
// (DESIGN 4.8). Rows are not clickable. When the board is narrow (a phone, or beside the docked advisor) city and level
// drop to a second line. During `row-climb` the rows reorder in place (ClimbList); the user's rank ticks down place by
// place while every row it passes ticks one place back (RankTick: legible on every frame). The user's row always shows
// this week's XP as it is now (420 in the demo), the same number as the top bar and my card.
import { motion } from "motion/react";
import { memo, type ReactNode, type RefObject } from "react";

import { Avatar } from "@/components/avatars";
import { IconRankUp } from "@/components/icons";
import { Card, XpValue, cn } from "@/components/ui";
import { countNoun } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { popIn } from "@/lib/motion";
import { TID } from "@/lib/testids";
import type { LeaderRow } from "@/lib/types";

import { ClimbList } from "./climb-list";
import { RankTick } from "./rank-tick";
import type { ClimbPhase } from "./use-row-climb";

export interface BoardProps {
  /** The rows in the order they are drawn now (the old order before the climb, then each step of it). */
  readonly order: readonly LeaderRow[];
  readonly phase: ClimbPhase;
  readonly places: number;
  /** The length of the step the user's row is travelling now (s). */
  readonly segmentS: number;
  readonly boardRef: RefObject<HTMLDivElement | null>;
}

export function Board({ order, phase, places, segmentS, boardRef }: BoardProps): ReactNode {
  return (
    <div className="@container/board" ref={boardRef}>
      <Card className="overflow-hidden" padding="none">
        <ClimbList
          className="flex flex-col gap-0.5 p-2"
          itemClassName="rounded-control"
          lifted={phase === "climbing"}
          rows={order.map((row, index) => ({
            id: row.id,
            me: row.me,
            // only the user's row carries the climb's moving parts, so a step re-renders two rows, not twenty-five
            node: row.me ? <Row phase={phase} places={places} position={index + 1} row={row} /> : <Row position={index + 1} row={row} />,
          }))}
          segmentS={segmentS}
        />
      </Card>
    </div>
  );
}

const Row = memo(function Row({
  row,
  position,
  phase = "landed",
  places = 0,
}: {
  row: LeaderRow;
  position: number;
  phase?: ClimbPhase;
  places?: number;
}) {
  const me = row.me;
  return (
    // Narrow: rank and avatar span two lines; line 1 name … XP, line 2 «city · المستوى n» across the whole text width.
    // Wide: one line of six columns, so city, level and XP align down the board.
    <div
      className={cn(
        "relative grid min-h-16 grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-control px-3 py-2",
        "@min-[36rem]/board:min-h-14 @min-[36rem]/board:grid-cols-[2rem_2.5rem_minmax(0,1fr)_7.5rem_5.5rem_5.75rem] @min-[36rem]/board:gap-x-4 @min-[36rem]/board:py-1.5",
        "@min-[46rem]/board:grid-cols-[2rem_2.5rem_minmax(0,1fr)_9rem_6rem_6rem]",
        me && "bg-bg",
      )}
      data-me={me ? "" : undefined}
      data-pos={position}
      data-surface={me ? "stage" : undefined}
      data-testid={me ? TID.leaderboard.rowMe : TID.leaderboard.row(row.id as Exclude<LeaderRow["id"], "me">)}
      data-value={row.rank}
    >
      <span aria-hidden className="col-start-1 row-span-2 row-start-1 text-center text-title font-bold text-fg-3 tabular-nums @min-[36rem]/board:row-span-1">
        {/* the climbing row ticks up place by place; a row it passes loses one place (it ticks downward) */}
        <RankTick className="h-[1.9em]" dir={me ? 1 : -1} value={position} />
      </span>
      <span className="sr-only">{`المركز ${formatNumber(row.rank)}`}</span>
      <span className="col-start-2 row-span-2 row-start-1 flex @min-[36rem]/board:row-span-1">
        <Avatar id={row.avatar} level={row.level} size={40} />
      </span>
      <p className="col-start-3 row-start-1 flex min-w-0 items-center gap-2">
        <span className="truncate text-body font-medium text-fg">{row.name}</span>
        {me ? <span className="shrink-0 text-small font-semibold text-accent-fg">أنت</span> : null}
        {me && places > 0 ? <ClimbMark places={places} show={phase === "landed"} /> : null}
      </p>
      <p className="col-span-2 col-start-3 row-start-2 truncate text-small text-fg-3 @min-[36rem]/board:hidden">
        {row.city ? `${row.city} · ` : ""}المستوى {formatNumber(row.level)}
      </p>
      <span className="hidden truncate text-small text-fg-3 @min-[36rem]/board:col-start-4 @min-[36rem]/board:row-start-1 @min-[36rem]/board:block">
        {row.city}
      </span>
      <span className="hidden text-small text-fg-2 @min-[36rem]/board:col-start-5 @min-[36rem]/board:row-start-1 @min-[36rem]/board:block">
        المستوى {formatNumber(row.level)}
      </span>
      <span className="col-start-4 row-start-1 flex justify-end @min-[36rem]/board:col-start-6">
        <XpValue size="sm" value={row.weeklyXp} />
      </span>
    </div>
  );
});

/** After the landing, beside «أنت»: the places gained, as a small rising mark (the card says it in words). */
function ClimbMark({ places, show }: { places: number; show: boolean }) {
  return (
    <motion.span
      animate={show ? "show" : "hidden"}
      aria-label={`صعدت ${countNoun(places, "place", "object")}`}
      className="inline-flex shrink-0 items-center gap-0.5 text-small font-bold text-ok-fg tabular-nums"
      initial={false}
      role="img"
      variants={popIn}
    >
      <IconRankUp size={18} waypoint="muted" />
      <span dir="ltr">{formatNumber(places)}</span>
    </motion.span>
  );
}
