"use client";
// QuickReplies: the chips of an onboarding question (spec 4.2), and ChipToBubble: picking one makes the chip itself
// travel into the thread and become the user's bubble, while the other chips leave (150 ms fade).
// How: the picked chip and the user's bubble share one layout id, `quickReplyId(question, option)`. In ONE state update
// the caller closes the chips (`open={false}`) and appends <UserMessage layoutId={quickReplyId(...)} /> to the thread;
// Motion flies the bubble from the chip's box to its place on spring.gentle, the chip crossfading into the ink bubble.
// Chips land with popIn, 60 ms apart (no stagger with ten or more: they arrive as one group, playbook 3.2).
// Fallback decided in advance (playbook 3.2): pass `travel={false}` and the answer is a plain SentBubble pop.
import { AnimatePresence, motion } from "motion/react";

import { Chip } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { group, popIn, spring, staggerStep, tween } from "@/lib/motion";

/** The shared travel id of a chip and the bubble it becomes. */
export function quickReplyId(question: string, option: string): string {
  return `chat-answer-${question}-${option}`;
}

export interface QuickReplyOption {
  readonly id: string;
  readonly label: string;
  /** data-testid (welcome-chip-city-riyadh). */
  readonly testId?: string;
}

export interface QuickRepliesProps {
  /** The question id (city, education, …): with the option id it makes the travel id. */
  readonly question: string;
  readonly options: readonly QuickReplyOption[];
  /** False once answered: the picked chip travels into the thread, the rest fade out. */
  readonly open: boolean;
  readonly onPick: (option: QuickReplyOption) => void;
  /** «دليل» is answering: the chips wait (spec 5.5 rule 13). */
  readonly disabled?: boolean;
  /** The chip a script is pressing (the press frame shows before the pick). */
  readonly pressedId?: string | null;
  /** The chip travels into the thread (default). False: no shared travel, the answer simply pops. */
  readonly travel?: boolean;
  readonly className?: string;
  readonly label?: string;
}

const exitFade = { opacity: 0, transition: tween.exit };

/** The pending question's chips, right to left by DOM order, wrapping onto at most three lines at 390 px. */
export function QuickReplies({ question, options, open, onPick, disabled = false, pressedId, travel = true, className, label = "اختر إجابة" }: QuickRepliesProps) {
  const step = options.length >= 10 ? 0 : staggerStep(options.length, 0.06);
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="popLayout">
        {open ? (
          <motion.div animate="show" aria-label={label} className="flex flex-wrap gap-2" exit={exitFade} initial="hidden" key={question} role="group" variants={group(step)}>
            {options.map((option) => (
              <motion.span className="inline-flex" key={option.id} variants={popIn}>
                <MotionChip
                  data-testid={option.testId}
                  disabled={disabled}
                  layoutId={travel ? quickReplyId(question, option.id) : undefined}
                  onClick={() => onPick(option)}
                  pressed={pressedId === option.id}
                  style={{ borderRadius: 999 }}
                  transition={{ layout: spring.gentle }}
                >
                  <motion.span className="block" layout="position">
                    {option.label}
                  </motion.span>
                </MotionChip>
              </motion.span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const MotionChip = motion.create(Chip);
