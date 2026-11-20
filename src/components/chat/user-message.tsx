"use client";
// SentBubble and UserMessage: the user's side of the conversation.
// SIDES (Arabic, right to left): «دليلك» speaks from the inline-start (the right), with his glyph; the user's messages sit
// at the inline-end (the left), with the user's avatar at the far inline-end. The composer's round send button is at
// its inline-end too, so a sent message pops out of that corner: transform-origin is the bubble's bottom inline-end
// corner (physical bottom-left), `y 22px, scale 0.92` to rest in 440 ms on the approved ease.pop (playbook 3.2).
// The bubble's sharp corner is that same corner: the tail points at the user's avatar and the send button.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { Avatar, type AvatarId } from "@/components/avatars";
import { cn } from "@/components/ui/cn";
import { dur, ease, spring, tween } from "@/lib/motion";

/** How a user message enters. `pop`: out of the composer (typed and sent). `none`: at rest (a restored thread). */
export type SentEntrance = "pop" | "none";

// Physical corners on purpose: Motion corrects radii during a layout travel only when they are set in `style`, and this
// app is Arabic only, so the inline-end bottom corner is the bottom-left.
const BUBBLE_RADIUS = { borderRadius: 20, borderBottomLeftRadius: 6 } as const;

const bubbleClass =
  "w-fit min-w-0 max-w-full bg-solid px-4 py-2.5 text-body leading-[1.7] text-on-solid whitespace-pre-wrap [overflow-wrap:anywhere]";

export interface SentBubbleProps {
  readonly children: ReactNode;
  /** `pop` (default) out of the composer's send corner; `none` at rest. Ignored when `layoutId` is set. */
  readonly entrance?: SentEntrance;
  /** A chip that travels into the thread and becomes this bubble (QuickReplies): the chip's travel id. */
  readonly layoutId?: string;
  readonly className?: string;
  readonly testId?: string;
}

/** The user's message: ink on paper, white on the stage, its sharp corner toward the send button. */
export function SentBubble({ children, entrance = "pop", layoutId, className, testId }: SentBubbleProps) {
  if (layoutId) {
    // chip-to-bubble: the picked chip and this bubble share the id, so the chip itself travels up and becomes it.
    // The travel is POSITION ONLY and the text a plain child. The bubble lands inside the thread's `layoutScroll`
    // scroller while the chip lives outside it; Motion then projects the bubble (a shared element) in scroll-free page
    // space, but any projected child (`layout`) in the scroller's own space, so a projected text drifted off its bubble
    // by the thread's scroll (the white label floating hundreds of pixels above an empty pill); a shared text fixes the
    // desktop but still slips by a share of the scroll whenever the travel scales (a phone's piece is shorter than the
    // bubble). With no scale there is nothing to correct: the text rides the bubble exactly, never stretches, and the
    // bubble takes its own size on the first frame, anchored at the piece's left edge, the side where its text sits (the
    // waypoint dot and the field icon, at the piece's start, drop away as it becomes the bubble).
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className={cn(bubbleClass, className)}
        data-testid={testId}
        dir="auto"
        initial={{ opacity: 0.35 }}
        layout="position"
        layoutCrossfade={false}
        layoutId={layoutId}
        style={BUBBLE_RADIUS}
        transition={{ layout: spring.gentle, opacity: { duration: 0.12, ease: ease.out } }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(bubbleClass, className)}
      data-testid={testId}
      dir="auto"
      initial={entrance === "pop" ? { opacity: 0, y: 22, scale: 0.92 } : false}
      style={{ ...BUBBLE_RADIUS, originX: 0, originY: 1 }}
      transition={{ duration: dur.pop, ease: ease.pop, opacity: tween.fast }}
    >
      {children}
    </motion.div>
  );
}

export interface UserMessageProps {
  /** The text the user sent (plain text; line breaks are kept). */
  readonly children: ReactNode;
  /** The user's avatar id (av-01..av-12). Without it, no avatar is drawn. */
  readonly avatar?: AvatarId | (string & {});
  /** The user's name, read by screen readers with the message. */
  readonly name?: string;
  readonly entrance?: SentEntrance;
  /** Travel id from QuickReplies (`quickReplyId(question, option)`): the picked chip becomes this bubble. */
  readonly layoutId?: string;
  readonly className?: string;
  /** data-testid on the row. */
  readonly testId?: string;
}

/** One message from the user: the bubble at the inline-end (left), the avatar beside it, bottom-aligned. */
export function UserMessage({ children, avatar, name, entrance = "pop", layoutId, className, testId }: UserMessageProps) {
  const still = entrance === "none" && !layoutId;
  return (
    <div className={cn("flex items-end justify-end gap-2 ps-10", className)} data-role="user" data-testid={testId}>
      {name ? <span className="sr-only">{name}:</span> : null}
      <SentBubble entrance={entrance} layoutId={layoutId}>
        {children}
      </SentBubble>
      {avatar ? (
        <motion.span animate={{ opacity: 1 }} className="mb-0.5 inline-flex shrink-0" initial={still ? false : { opacity: 0 }} transition={{ ...tween.fast, delay: layoutId ? 0.28 : 0.06 }}>
          <Avatar id={avatar} size={28} />
        </motion.span>
      ) : null}
    </div>
  );
}
