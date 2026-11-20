"use client";
// "Blurs into focus" (playbook blocks 4 and 5). Focus belongs to «دليل»: answers, analysis results, the path reveal.
import { motion } from "motion/react";
import { Fragment, useMemo, type ReactNode } from "react";

import { focusIn, group, staggerStep } from "@/lib/motion";

import { headlineChunks } from "./segment";

/**
 * «دليل»'s reply, an analysis result or a reveal arriving block by block: each block rises 8 px and blurs into focus
 * (560 ms), 80 ms apart (the whole group stays under 480 ms). Blocks appended later come into focus as they mount.
 * `restored`: a saved thread or result renders at rest, without replaying.
 */
export function FocusInGroup({
  blocks,
  step = 0.08,
  startDelay = 0,
  restored = false,
  className,
  blockClassName,
}: {
  blocks: readonly { id: string; node: ReactNode }[];
  step?: number;
  startDelay?: number;
  restored?: boolean;
  className?: string;
  blockClassName?: string;
}) {
  return (
    <motion.div variants={group(staggerStep(blocks.length, step), startDelay)} initial={restored ? false : "hidden"} animate="show" className={className}>
      {blocks.map((block) => (
        <motion.div key={block.id} variants={focusIn} className={blockClassName}>
          {block.node}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * A headline arriving word by word (50 ms apart, at most about 12 words). Words, never letters: Arabic letters join.
 * Consecutive Latin words stay together ("Power BI", "+200 XP"). The real sentence is in the DOM once, for screen readers.
 * Replays when `text` changes if you give it a `key`. `wordClassName` styles chosen words (for example the user's name).
 */
export function WordsIn({
  text,
  step = 0.05,
  delay = 0,
  className,
  wordClassName,
}: {
  text: string;
  step?: number;
  delay?: number;
  className?: string;
  wordClassName?: (word: string, index: number) => string | undefined;
}) {
  const chunks = useMemo(() => headlineChunks(text), [text]);
  return (
    <motion.span variants={group(staggerStep(chunks.length, step), delay)} initial="hidden" animate="show" className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {chunks.map((chunk, i) => (
          <Fragment key={i}>
            <motion.span variants={focusIn} className={wordClassName?.(chunk.text, i) ?? "inline-block"} style={{ display: "inline-block" }}>
              {chunk.text}
            </motion.span>
            {chunk.space}
          </Fragment>
        ))}
      </span>
    </motion.span>
  );
}
