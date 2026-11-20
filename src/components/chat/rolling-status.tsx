"use client";
// RollingStatus (playbook block 7): the one "working" line. Each new step rolls in (old up and out, new up and in, 2 px
// blur), the current text carries the passing light (.shimmer-text, 2.4 s, right to left), and after 4 s the elapsed
// seconds fade in beside it. No dots, ever: waiting is «دليلك»'s glyph plus this line.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Roll } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";
import { spring, tween } from "@/lib/motion";

import { DaleelGlyph, type DaleelState } from "./daleel-glyph";

/** Whole seconds since `startedAt` (ms since epoch), or since the first effect when it is not given. Ticks twice a second. */
export function useElapsed(startedAt?: number, running = true): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = startedAt ?? Date.now();
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [startedAt, running]);
  return seconds;
}

export interface RollingStatusProps {
  /** The current step, in «دليلك»'s voice: «دليلك يفكّر…», «أبحث في الوظائف…». A new label rolls in. */
  readonly label: string;
  /** Also draw «دليلك»'s glyph before the line (20 px), in this state. Leave it out where the glyph already sits beside it. */
  readonly glyph?: DaleelState;
  /** When the work started (ms since epoch). Default: when the line appeared. */
  readonly startedAt?: number;
  /** Seconds before the elapsed time fades in. Default 4 (spec 3.14). */
  readonly elapsedAfter?: number;
  readonly className?: string;
  /** data-testid on the line (advisor-status). */
  readonly testId?: string;
}

/** «دليلك» is working: the step label rolls, a light passes over it, and after 4 s the seconds appear («6 ث»). */
export function RollingStatus({ label, glyph, startedAt, elapsedAfter = 4, className, testId }: RollingStatusProps) {
  const seconds = useElapsed(startedAt);
  const showSeconds = seconds >= elapsedAfter;
  return (
    <span className={cn("inline-flex min-h-7 max-w-full items-center gap-2.5 text-small font-medium", className)} data-testid={testId} data-value={label}>
      {glyph ? <DaleelGlyph size={20} state={glyph} /> : null}
      {/* a screen reader hears each step once; the light and the seconds are for the eyes */}
      <span className="sr-only" role="status">
        {label}
      </span>
      <Roll className="min-w-0" id={label}>
        <span aria-hidden className="shimmer-text">
          {label}
        </span>
      </Roll>
      <AnimatePresence initial={false}>
        {showSeconds ? (
          <motion.span
            animate={{ opacity: 1 }}
            aria-hidden
            className="inline-flex shrink-0 items-center gap-1 text-caption font-medium text-fg-3"
            exit={{ opacity: 0, transition: tween.exit }}
            initial={{ opacity: 0 }}
            key="elapsed"
            layout="position"
            transition={{ opacity: tween.enter, layout: spring.gentle }}
          >
            <Roll id={seconds}>
              <span className="tabular-nums" dir="ltr">
                {formatNumber(seconds)}
              </span>
            </Roll>
            <span>ث</span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
