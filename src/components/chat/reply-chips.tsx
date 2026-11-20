"use client";
// ReplyChips: the chips under «دليل»'s last answer (confirmation chips «افتح الدورة» · «ليس الآن») and the page's
// suggestion chips above the composer (spec 5.8). They land with popIn, 60 ms apart (the whole group under 480 ms).
// A chip carries an intent, not free text: the caller decides what it does (spec 5.5 rule 1).
import { motion } from "motion/react";

import { Chip } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { group, popIn, staggerStep } from "@/lib/motion";

export interface ReplyChip {
  /** The intent or slug («next-step», «open-course», «not-now»). */
  readonly id: string;
  readonly label: string;
  /** data-testid (advisor-chip-next-step, advisor-confirm-yes …). */
  readonly testId?: string;
}

export interface ReplyChipsProps {
  readonly chips: readonly ReplyChip[];
  readonly onPick?: (chip: ReplyChip) => void;
  /** While a reply or an action is in flight every chip is disabled (spec 5.5 rule 13). */
  readonly disabled?: boolean;
  /** sm (32 px, under an answer; default) · md (40 px). */
  readonly size?: "sm" | "md";
  /** Seconds before the first chip lands (after the answer's blocks). */
  readonly delay?: number;
  /** Render at rest (a restored thread, or chips that were already there). */
  readonly restored?: boolean;
  /** The chip «دليل» or the script is pressing: it shows the press frame. */
  readonly pressedId?: string | null;
  readonly className?: string;
  readonly label?: string;
}

/** A wrapping row of reply or suggestion chips. */
export function ReplyChips({ chips, onPick, disabled = false, size = "sm", delay = 0, restored = false, pressedId, className, label = "اقتراحات" }: ReplyChipsProps) {
  if (chips.length === 0) return null;
  return (
    <motion.div
      animate="show"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
      initial={restored ? false : "hidden"}
      role="group"
      variants={group(staggerStep(chips.length, 0.06), delay)}
    >
      {chips.map((chip) => (
        <motion.span className="inline-flex" key={chip.id} variants={popIn}>
          <Chip data-testid={chip.testId} disabled={disabled} onClick={() => onPick?.(chip)} pressed={pressedId === chip.id} size={size}>
            {chip.label}
          </Chip>
        </motion.span>
      ))}
    </motion.div>
  );
}
