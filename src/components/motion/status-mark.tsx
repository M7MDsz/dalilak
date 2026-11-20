"use client";
// StatusMark (playbook block 10): pending, running, done or failed, as one mark in Darb's line language.
// pending: an open dotted ring. running: the same ring with one solid arc travelling round it (one of the five allowed
// loops; it stops under reduced motion). done: a disc in the inverse colour lands and a check is drawn in its partner
// colour (`solid` / `on-solid`, 240 ms after 120 ms), so it reads on paper, on cards and on the stage without props.
// failed: a warn ring with a drawn bar and dot. Leaving a state only fades (150 ms): no spring, nothing un-draws.
import { motion, type Transition } from "motion/react";

import { cn } from "@/lib/cn";
import { dur, ease, spring, tween } from "@/lib/motion";

export type MarkState = "pending" | "running" | "done" | "failed";

const LABEL: Record<MarkState, string> = { pending: "بانتظار", running: "جارٍ", done: "تمّ", failed: "تعذّر" };

const check: Transition = { pathLength: { duration: dur.check, ease: ease.out, delay: 0.12 }, opacity: { duration: 0.01, delay: 0.12 } };
/** Leaving: fade in 150 ms, then (out of sight) put the line back to zero length for the next time it is drawn. */
const unCheck: Transition = { opacity: tween.exit, pathLength: { duration: 0, delay: dur.exit } };

/**
 * `size` in px (24 by default, at least 16). The first render shows the state at rest unless `appear` is set (a mark
 * mounted by an event); every later change of `state` animates. `label` overrides the accessible name.
 */
export function StatusMark({ state, size = 24, appear = false, label, className }: { state: MarkState; size?: number; appear?: boolean; label?: string; className?: string }) {
  const done = state === "done";
  const failed = state === "failed";
  const ring = state === "pending" || state === "running";
  return (
    <span role="img" aria-label={label ?? LABEL[state]} data-state={state} className={cn("relative inline-block shrink-0 text-fg", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* the open dotted ring (pending and running) */}
        <motion.circle
          cx="12"
          cy="12"
          r="9"
          strokeWidth="2"
          pathLength={24}
          strokeDasharray="0.01 2"
          className="stroke-border-strong"
          initial={appear ? { opacity: 0 } : false}
          animate={{ opacity: ring ? 1 : 0 }}
          transition={ring ? tween.fast : tween.exit}
        />
        {/* running: one arc travels round the ring */}
        {state === "running" && (
          <g className="mark-spin">
            <path d="M12 3a9 9 0 0 1 9 9" strokeWidth="2.25" className="stroke-fg" />
          </g>
        )}
        {/* done: the disc lands (spring.pop from 0.6), the check is drawn on it; leaving done only fades */}
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          className="fill-solid"
          initial={appear ? { opacity: 0, scale: 0.6 } : false}
          animate={done ? { opacity: 1, scale: [0.6, 1] } : { opacity: 0 }}
          transition={done ? { default: spring.pop, opacity: tween.fast } : tween.exit}
        />
        <motion.path
          d="M7.5 12.4l3 3 6-6.4"
          strokeWidth="2.25"
          className="stroke-on-solid"
          initial={appear ? { pathLength: 0, opacity: 0 } : false}
          animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={done ? check : unCheck}
        />
        {/* failed: a warn ring with a bar and a dot */}
        <motion.g initial={appear ? { opacity: 0 } : false} animate={{ opacity: failed ? 1 : 0 }} transition={failed ? tween.fast : tween.exit}>
          <circle cx="12" cy="12" r="9" strokeWidth="2" className="stroke-warn-fg" />
          <motion.path
            d="M12 7.5v5.5"
            strokeWidth="2.25"
            className="stroke-warn-fg"
            initial={false}
            animate={{ pathLength: failed ? 1 : 0 }}
            transition={failed ? check : { pathLength: { duration: 0, delay: dur.exit } }}
          />
          <circle cx="12" cy="16.6" r="1.3" className="fill-warn-fg" />
        </motion.g>
      </svg>
    </span>
  );
}
