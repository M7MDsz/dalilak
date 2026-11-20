"use client";
// Piece 4 (spec 3.1): the advisor exchange, built from the chat kit's own parts: «دليل»'s header (his glyph, his name and
// the line «دليلك إلى وظيفتك», spec 3.14), the page chip «ماذا أفعل الآن؟», the user's bubble and his answer.
// Its moment: the chip is pressed, the user's bubble pops (the approved send pop, from its inline-end corner), the
// glyph works for a beat (the needle seeks) and the answer comes into focus as the needle settles.
import { AnimatePresence, motion } from "motion/react";

import { DaleelGlyph, SentBubble, type DaleelState } from "@/components/chat";
import { FocusInGroup, useInstant } from "@/components/motion";
import { Chip, cn } from "@/components/ui";
import { tween } from "@/lib/motion";

import { PIECE_COPY } from "../../copy";
import { PieceCard, usePlayed, useSteps, type PieceProps } from "../piece-frame";

/** The answer, with the Latin run kept whole («Power BI» never breaks across lines). */
function Answer() {
  const latin = "Power BI";
  const at = PIECE_COPY.answer.indexOf(latin);
  const before = at >= 0 ? PIECE_COPY.answer.slice(0, at) : PIECE_COPY.answer;
  return (
    <p className="text-body leading-[1.7] text-fg">
      {before}
      {at >= 0 ? <bdi className="whitespace-nowrap">{latin}</bdi> : null}
    </p>
  );
}

export function AdvisorCard({ state, delay, compact = false }: PieceProps) {
  const instant = useInstant();
  const played = usePlayed(state);
  const d = delay * 1000;
  // 0: the chip is pressed · 1: the bubble pops · 2: «دليل» works · 3: the answer comes into focus
  const step = useSteps(played, [d, d + 170, d + 650, d + 1450], instant);
  const restored = instant && state === "done";
  const glyph: DaleelState = step === 2 ? "thinking" : step >= 3 && !restored ? "done" : "idle";
  return (
    <PieceCard compact={compact} className={compact ? "h-[10rem]" : "h-[10.75rem]"}>
      <div className="flex items-center gap-2.5">
        <DaleelGlyph framed size={30} state={glyph} />
        <p className="text-small font-semibold text-fg">{PIECE_COPY.daleel}</p>
        <p className="truncate text-small text-fg-3">{PIECE_COPY.daleelLine}</p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {step >= 1 ? (
          <div className="flex justify-end">
            <SentBubble entrance={restored ? "none" : "pop"}>{PIECE_COPY.question}</SentBubble>
          </div>
        ) : null}
        {step >= 3 ? <FocusInGroup restored={restored} blocks={[{ id: "answer", node: <Answer /> }]} /> : null}
      </div>
      <AnimatePresence initial={false}>
        {step < 1 ? (
          <motion.div key="chip" exit={{ opacity: 0, transition: tween.exit }} className={cn("absolute end-4", compact ? "bottom-3.5" : "bottom-4")}>
            <Chip size="sm" pressed={step === 0} tabIndex={-1}>
              {PIECE_COPY.question}
            </Chip>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PieceCard>
  );
}
