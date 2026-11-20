"use client";
// Piece 3 (spec 3.1): two skill cards. Excel with the CV sentence that proves it (the evidence marker, as the CV
// analysis draws it), and Power BI. Its moment: Power BI receives its first star, and its source line («من دورة: …»,
// spec 3.5) comes in under it.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { Highlight, useInstant } from "@/components/motion";
import { SkillStars } from "@/components/ui";
import { rise } from "@/lib/motion";

import { PIECE_COPY } from "../../copy";
import { DEMO } from "../demo";
import { PieceCard, usePlayed, useSteps, type PieceProps } from "../piece-frame";

function SkillRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-title">
        <bdi>{name}</bdi>
      </p>
      {children}
    </div>
  );
}

export function SkillsCard({ state, delay, compact = false }: PieceProps) {
  const instant = useInstant();
  const played = usePlayed(state);
  // step 0: the star lands · step 1: its source line arrives under it
  const step = useSteps(played, [delay * 1000, delay * 1000 + 420], instant);
  const { excel, powerbi } = DEMO.skills;
  const excelStars = <SkillStars value={excel.stars} slots={excel.slots as 1 | 2 | 3} size="md" />;
  const powerbiStars = (
    <SkillStars value={step >= 0 ? powerbi.after : powerbi.before} slots={powerbi.slots as 1 | 2 | 3} size="md" fresh={step >= 0 ? 1 : undefined} />
  );
  const evidence = (
    <>
      <span className="text-fg-3">{PIECE_COPY.fromCv}</span> <Highlight on>«{PIECE_COPY.excelEvidence}»</Highlight>
    </>
  );

  if (compact) {
    // the phone band: the two skills in one card (its 160 px box), the evidence kept to two lines
    return (
      <PieceCard compact className="py-3">
        <SkillRow name={excel.name}>{excelStars}</SkillRow>
        <p className="mt-0.5 line-clamp-2 text-small text-fg-2">{evidence}</p>
        <div aria-hidden className="my-2.5 h-px bg-border" />
        <SkillRow name={powerbi.name}>{powerbiStars}</SkillRow>
      </PieceCard>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <PieceCard className="py-3.5">
        <SkillRow name={excel.name}>{excelStars}</SkillRow>
        <p className="mt-1 text-small text-fg-2">{evidence}</p>
      </PieceCard>
      <PieceCard className="py-3.5">
        <SkillRow name={powerbi.name}>{powerbiStars}</SkillRow>
        <motion.p className="mt-1 text-small text-fg-2" variants={rise} initial={false} animate={step >= 1 ? "show" : "hidden"}>
          {PIECE_COPY.fromCourse(DEMO.course)}
        </motion.p>
      </PieceCard>
    </div>
  );
}
