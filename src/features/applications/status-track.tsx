"use client";
// Owner: applications. The three-step track of spec 3.9 («أُرسل» → «قيد المراجعة» → «النتيجة»), drawn in Darb's trail
// language: the covered stretch is a solid ink line, the way ahead is dotted, and one marker stands on the current step.
// `status-advance` (playbook 3.7): when the status moves on, the solid line draws to the next step (growing from the
// inline-start edge) and the marker rides its head there (one shared layoutId, the same tween as the line, so it never
// runs ahead of the line). At the end the marker becomes the result: shortlisted lands as a green check (an earned
// thing pops), closed settles as a quiet ink disk. Reduced motion: everything is at its end state at once.
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, type ReactNode } from "react";

import { IconCheck } from "@/components/icons";
import { cn } from "@/components/ui";
import { ease, spring, tween } from "@/lib/motion";
import type { ApplicationStatus } from "@/lib/types";

import { APPLICATIONS_COPY } from "./copy";

/** The step each status stands on. */
export const TRACK_STEP: Readonly<Record<ApplicationStatus, 0 | 1 | 2>> = { sent: 0, review: 1, shortlisted: 2, closed: 2 };

/** The line and the marker move together: one tween, so the marker always sits at the head of the drawn line. */
const RIDE = { duration: 0.7, ease: ease.inOut } as const;
/** The result lands just after the marker has arrived (the layout ride starts a frame after the line). */
const LAND_S = RIDE.duration + 0.12;

type NodeState = "done" | "current" | "ahead";

/** The first step sits on the inline-start edge (aligned with the title above), the middle one in the centre, the last on
 *  the inline-end edge; each label aligns with its mark. */
const ALIGN = ["items-start text-start", "items-center text-center", "items-end text-end"] as const;

export function StatusTrack({ status, className }: { readonly status: ApplicationStatus; readonly className?: string }): ReactNode {
  const groupId = useId();
  const step = TRACK_STEP[status];

  return (
    <LayoutGroup id={groupId}>
      <div className={cn("relative", className)}>
        {/* the way ahead: dotted, from the centre of the first step (at the inline-start edge, under the title) to the
            centre of the last (at the inline-end edge) */}
        <span aria-hidden className="absolute top-[13px] h-0 border-t-2 border-dotted border-border-strong start-3.5 end-3.5" />
        {/* the covered stretch: solid ink, drawn from the inline-start edge; step 1 is exactly half way */}
        <motion.span
          animate={{ scaleX: step / 2 }}
          aria-hidden
          className="absolute top-[13px] h-0.5 rounded-full bg-fg start-3.5 end-3.5 ltr:origin-left rtl:origin-right"
          initial={false}
          transition={RIDE}
        />
        <ol className="relative grid grid-cols-3">
          {APPLICATIONS_COPY.track.map((label, i) => {
            const state: NodeState = i < step ? "done" : i === step ? "current" : "ahead";
            const result = state === "current" && i === 2;
            return (
              <li
                aria-current={state === "current" ? "step" : undefined}
                className={cn("flex min-w-0 flex-col gap-2.5", ALIGN[i])}
                data-state={state}
                key={label}
              >
                <span className="relative grid size-7 place-items-center">
                  {state === "done" ? <DoneMark /> : <AheadMark />}
                  {state === "current" ? (
                    <motion.span className="absolute inset-0 z-[1] grid place-items-center" layoutId="track-marker" transition={{ layout: RIDE }}>
                      <Marker status={status} />
                    </motion.span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-small leading-snug",
                    state === "done" && "text-fg-2",
                    state === "current" && "font-semibold text-fg",
                    state === "ahead" && "text-fg-3",
                    result && status === "shortlisted" && "text-ok-fg",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </LayoutGroup>
  );
}

/** A step already passed: an ink disk with a check. It fades in as the marker leaves it. */
function DoneMark(): ReactNode {
  return (
    <motion.span animate={{ opacity: 1 }} className="grid size-[1.375rem] place-items-center rounded-full bg-fg text-on-solid" initial={{ opacity: 0 }} transition={tween.fast}>
      <IconCheck size={14} strokeWidth={3} waypoint="off" />
    </motion.span>
  );
}

/** A step still ahead: a dotted ring, the trail not yet walked. The marker covers it when it arrives. */
function AheadMark(): ReactNode {
  return <span className="size-[1.375rem] rounded-full border-2 border-dotted border-border-strong bg-surface" />;
}

/**
 * The marker. On the way (sent, review): the waypoint, an ink ring around an ink dot. At the result: shortlisted lands
 * as a green disk with a check (success), closed as a quiet ink disk with a bar (the end of this trail, not an error).
 */
function Marker({ status }: { readonly status: ApplicationStatus }): ReactNode {
  const kind = status === "shortlisted" ? "won" : status === "closed" ? "ended" : "on-the-way";
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {kind === "on-the-way" ? (
        <motion.span
          animate={{ opacity: 1 }}
          className="grid size-7 place-items-center rounded-full border-2 border-fg bg-surface"
          exit={{ opacity: 0, transition: tween.exit }}
          initial={{ opacity: 0 }}
          key="way"
          transition={tween.fast}
        >
          <span className="size-3 rounded-full bg-fg" />
        </motion.span>
      ) : kind === "won" ? (
        <motion.span
          animate={{ opacity: 1, scale: 1 }}
          className="grid size-7 place-items-center rounded-full bg-ok text-sheet"
          initial={{ opacity: 0, scale: 0.8 }}
          key="won"
          // lands when the marker arrives (an earned thing pops: spring.pop)
          transition={{ default: { ...spring.pop, delay: LAND_S }, opacity: { ...tween.fast, delay: LAND_S } }}
        >
          <IconCheck size={17} strokeWidth={3} waypoint="off" />
        </motion.span>
      ) : (
        <motion.span
          animate={{ opacity: 1 }}
          className="grid size-7 place-items-center rounded-full bg-fg-3"
          initial={{ opacity: 0 }}
          key="ended"
          transition={{ ...tween.fast, delay: RIDE.duration * 0.8 }}
        >
          <span className="h-0.5 w-3 rounded-full bg-sheet" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
