"use client";
// Piece 5 (spec 3.1): XP and level, on the design system's XpBar (the map scale bar). Its moment: «+200 XP» for the
// course lands, the segments fill in counted steps while the number counts, the old level's sheet fills to its end and
// the new one starts, and the title rolls to «المستوى 3 · مجتهد». One gain, one mark: no echoes behind it.
import { motion } from "motion/react";

import { useInstant } from "@/components/motion";
import { XpBar, XpValue } from "@/components/ui";
import { popIn } from "@/lib/motion";

import { DEMO } from "../demo";
import { PieceCard, usePlayed, useSteps, type PieceProps } from "../piece-frame";

export function XpCard({ state, delay, compact = false }: PieceProps) {
  const instant = useInstant();
  const played = usePlayed(state);
  // 0: the gain lands beside its cause · 1: the bar takes it
  const step = useSteps(played, [delay * 1000, delay * 1000 + 360], instant);
  const v = step >= 1 ? DEMO.xp.after : DEMO.xp.before;
  return (
    <PieceCard compact={compact}>
      <div className="mb-3 flex h-6 items-center justify-between gap-3">
        <p className="truncate text-small text-fg-2">
          <bdi>{DEMO.course}</bdi>
        </p>
        <motion.span variants={popIn} initial={false} animate={step >= 0 ? "show" : "hidden"} className="inline-flex">
          <XpValue value={DEMO.xp.gain} gain size="md" />
        </motion.span>
      </div>
      <XpBar total={v.total} from={v.from} to={v.to} level={v.level} title={v.title} />
    </PieceCard>
  );
}
