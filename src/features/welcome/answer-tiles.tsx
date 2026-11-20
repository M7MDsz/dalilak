"use client";
// Owner: welcome. The pending question's quick replies as game pieces (docs/GAME-LAYER.md 5.7): every answer is an
// AnswerTile, a piece raised on its ink plinth that sinks when pressed. The tapped one stays pressed home in ink, with the
// waypoint at its start, for a beat (SELECT_MS), and only then is it picked: the chosen piece itself then travels into the
// thread and becomes the user's bubble (`chip-to-bubble`), while the others leave.
//
// Same travel contract as the chat kit's QuickReplies (spec 3.2): the picked tile and the bubble share one layout id,
// `quickReplyId(question, option)`; in ONE state update the caller closes the tiles (`open={false}`) and appends
// <UserMessage layoutId={quickReplyId(...)} />, and Motion flies the bubble from the tile's box (an ink piece becoming the
// ink bubble). Tiles land with popIn, 60 ms apart (ten or more arrive as one group, playbook 3.2). Test ids stay on the
// pressable face (`welcome-chip-{question}-{option}`).
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { quickReplyId, type QuickReplyOption } from "@/components/chat";
import { AnswerTile } from "@/components/game";
import { cn } from "@/components/ui";
import { group, popIn, spring, staggerStep, tween } from "@/lib/motion";

/** How long the chosen piece shows pressed home in ink before it travels (the press is seen, then the answer goes). */
export const SELECT_MS = 220;

export interface AnswerOption extends QuickReplyOption {
  /** A field icon for «الاهتمام» (20 px). */
  readonly icon?: ReactNode;
}

export interface AnswerTilesProps {
  readonly question: string;
  readonly options: readonly AnswerOption[];
  /** False once answered: the picked tile travels into the thread, the rest fade out. */
  readonly open: boolean;
  readonly onPick: (option: AnswerOption) => void;
  /** «دليلك» is answering: the pieces wait. */
  readonly disabled?: boolean;
  readonly size?: "sm" | "md";
  /** Classes of every tile's face (a phone tightens the ten majors). */
  readonly tileFaceClassName?: string;
  /** Closer pieces (4 px apart instead of 8, the row 4 px wider on each side): a phone fits the long lists in three lines (spec 3.2 Phone). */
  readonly tight?: boolean;
  readonly className?: string;
  readonly label?: string;
}

const exitFade = { opacity: 0, transition: tween.exit };

export function AnswerTiles({ question, options, open, onPick, disabled = false, size = "md", tileFaceClassName, tight = false, className, label = "اختر إجابة" }: AnswerTilesProps) {
  const [picked, setPicked] = useState<string | null>(null);
  // a new question, or the tiles closing, starts again with nothing chosen (the exiting group keeps its last frame)
  const [shown, setShown] = useState({ question, open });
  if (shown.question !== question || shown.open !== open) {
    setShown({ question, open });
    if (picked !== null) setPicked(null);
  }
  const holding = useRef(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (option: AnswerOption) => {
    if (disabled || holding.current) return;
    holding.current = true;
    setPicked(option.id);
    timer.current = window.setTimeout(() => {
      holding.current = false;
      onPick(option);
    }, SELECT_MS);
  };

  const step = options.length >= 10 ? 0 : staggerStep(options.length, 0.06);
  return (
    <div className={cn("relative", tight && "-mx-1", className)}>
      <AnimatePresence mode="popLayout">
        {open ? (
          <motion.div animate="show" aria-label={label} className={cn("flex flex-wrap gap-y-1.5", tight ? "gap-x-1" : "gap-x-2")} exit={exitFade} initial="hidden" key={question} role="group" variants={group(step)}>
            {options.map((option) => (
              <motion.span className="inline-flex max-w-full" key={option.id} variants={popIn}>
                {/* the travelling box: the bubble flies out of this piece */}
                <motion.span className="inline-flex max-w-full" layoutId={quickReplyId(question, option.id)} style={{ borderRadius: 999 }} transition={{ layout: spring.gentle }}>
                  <AnswerTile
                    data-testid={option.testId}
                    disabled={disabled}
                    // the choice lands at once (a press is immediate); only hover eases
                    faceClassName={cn("data-selected:transition-none", tileFaceClassName)}
                    icon={option.icon}
                    onClick={() => choose(option)}
                    selected={picked === option.id}
                    size={size}
                  >
                    {option.label}
                  </AnswerTile>
                </motion.span>
              </motion.span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
