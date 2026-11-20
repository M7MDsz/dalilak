"use client";
// Piece 6 (spec 3.1): a leaderboard mini with three rows, one of them «أنت», drawn with the leaderboard's row recipe
// (DESIGN.md 4.8: Latin rank, avatar with its level ring, name, XP; the user's row is the ink row with «أنت» in the
// accent). The numbers are the demo's: 180 XP at rank 18, then 380 XP at rank 10 after the course (spec 10.4).
// Its moment: the user's XP counts up, then the «أنت» row climbs one place past the row it overtook while both ranks
// roll. Rows move by their own fixed offsets (no layout measuring), so the climb is exact at any stage scale.
import { motion } from "motion/react";

import { Avatar, type AvatarId } from "@/components/avatars";
import { Roll, useInstant } from "@/components/motion";
import { cn, XpValue } from "@/components/ui";
import { spring } from "@/lib/motion";

import { PIECE_COPY } from "../../copy";
import { DEMO } from "../demo";
import { PieceCard, usePlayed, useSteps, type PieceProps } from "../piece-frame";

type RowView = { key: string; rank: number; avatar: AvatarId; level: number; name: string; xp: number; me?: boolean; dir: 1 | -1 };

function Row({ row, y, compact }: { row: RowView; y: number; compact: boolean }) {
  return (
    <motion.li
      initial={false}
      animate={{ y }}
      transition={spring.gentle}
      data-surface={row.me ? "stage" : undefined}
      className={cn(
        "absolute inset-x-0 top-0 flex items-center gap-2.5 rounded-control px-2.5",
        compact ? "h-11" : "h-12",
        row.me ? "z-10 bg-bg" : "z-0",
      )}
    >
      <span className="w-7 shrink-0 text-center text-title font-bold text-fg-3">
        <Roll id={row.rank} dir={row.dir}>
          <span dir="ltr" className="tabular-nums">
            {row.rank}
          </span>
        </Roll>
      </span>
      <Avatar id={row.avatar} size={compact ? 30 : 32} level={row.level} />
      <span className={cn("min-w-0 flex-1 truncate text-body", row.me ? "font-semibold text-accent-fg" : "font-medium text-fg")}>{row.name}</span>
      <XpValue size="sm" value={row.xp} count={row.me} />
    </motion.li>
  );
}

export function LeaderboardCard({ state, delay, compact = false }: PieceProps) {
  const instant = useInstant();
  const played = usePlayed(state);
  // 0: the user's XP counts up · 1: the row climbs and the ranks roll
  const step = useSteps(played, [delay * 1000, delay * 1000 + 820], instant);
  const { above, passed, me } = DEMO.board;
  const meNow = step >= 0 ? me.after : me.before;
  const climbed = step >= 1;

  const rows: Record<"above" | "passed" | "me", RowView> = {
    above: { key: above.id, rank: DEMO.board.rank(above.id, me.after.xp), avatar: above.avatar, level: above.level, name: above.name, xp: above.xp, dir: 1 },
    passed: {
      key: passed.id,
      rank: DEMO.board.rank(passed.id, climbed ? me.after.xp : me.before.xp),
      avatar: passed.avatar,
      level: passed.level,
      name: passed.name,
      xp: passed.xp,
      dir: -1,
    },
    me: { key: "me", rank: climbed ? me.after.rank : me.before.rank, avatar: me.avatar, level: meNow.level, name: PIECE_COPY.you, xp: meNow.xp, me: true, dir: 1 },
  };
  const order: (keyof typeof rows)[] = climbed ? ["above", "me", "passed"] : ["above", "passed", "me"];
  const pitch = compact ? 48 : 52;

  return (
    <PieceCard compact={compact} className={compact ? "p-2" : "p-2"}>
      <ol className="relative" style={{ height: pitch * 3 - 4 }}>
        {(["above", "passed", "me"] as const).map((k) => (
          <Row key={rows[k].key} row={rows[k]} y={order.indexOf(k) * pitch} compact={compact} />
        ))}
      </ol>
    </PieceCard>
  );
}
