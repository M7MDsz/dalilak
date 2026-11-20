"use client";
// Owner: cv. A found skill as a tag (spec 3.6 `tag-pop`). The motion block's SkillTag pins one tag to a zero-width anchor at
// the end of its sentence; a CV sentence often proves two or three skills at once («التواصل، العمل الجماعي، العرض والتقديم.»),
// so here the tags of one sentence pop side by side in a measured group (see CvDocument) and fly to the tray one after
// another. Same look and the same travel as SkillTag: popIn at the sentence, then the same layoutId in the tray
// (spring.gentle), inside one SkillTagGroup. The tag never changes size, so the flight only translates.
import { motion } from "motion/react";

import { popIn, spring } from "@/lib/motion";
import { cn } from "@/components/ui";

import { Bidi } from "./bidi";

export function FoundTag({
  id,
  name,
  where,
  restored = false,
  className,
}: {
  readonly id: string;
  readonly name: string;
  readonly where: "sentence" | "tray";
  /** Rendered at rest, with no flight (a skip, or a saved result). */
  readonly restored?: boolean;
  readonly className?: string;
}) {
  return (
    <motion.span
      animate="show"
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center border-[1.5px] border-fg bg-surface px-3 text-small font-semibold whitespace-nowrap text-fg",
        className,
      )}
      data-skill={id}
      data-where={where}
      initial={where === "sentence" && !restored ? "hidden" : false}
      layoutId={restored ? undefined : `cv-tag-${id}`}
      style={{ borderRadius: 999 }}
      transition={{ layout: spring.gentle }}
      variants={popIn}
    >
      <motion.span className="inline-flex items-center leading-none" layout="position">
        <Bidi text={name} />
      </motion.span>
    </motion.span>
  );
}

/** A width estimate for placing a group of tags before it is rendered (14 px semibold, 12 px padding each side). */
export function estimateTagWidth(name: string): number {
  let w = 0;
  for (const ch of name) w += /[A-Za-z0-9]/.test(ch) ? 8.4 : ch === " " ? 4 : 7.2;
  return Math.ceil(w + 27);
}
