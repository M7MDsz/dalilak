"use client";
// Owner: learn. The numbered lessons of a course (spec 3.11). Each lesson's number sits in a small open ring; once the
// course is started the ring is the tick box (the whole row presses), and a tick fills it with ink and draws the check
// (`lesson-tick`, 240 ms) while the title steps back to the quieter ink. «أكمل الدورة» ticks the rest in a quick run
// (`lessons-cascade`): the page passes those numbers in `running`, 90 ms apart, before the celebration opens.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { dur, ease, tween } from "@/lib/motion";
import { TID } from "@/lib/testids";

import { keepLatin } from "./bidi";
import { lessonLabel } from "./copy";

/**
 * The lesson's number token, drawn like the quest's station tokens (GAME-LAYER 3): quiet before the course starts, an
 * ink outline while it runs (there is something to do), solid ink with the check once ticked (done).
 */
function LessonMark({ n, done, live }: { readonly n: number; readonly done: boolean; readonly live: boolean }): ReactNode {
  return (
    <span className="relative grid size-8 shrink-0 place-items-center">
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full transition-[background-color,border-color] duration-200 ease-out",
          done ? "border-2 border-[color:var(--solid)] bg-solid" : live ? "border-2 border-fg bg-surface" : "border-[1.5px] border-border-strong bg-surface",
        )}
      />
      <motion.span
        animate={{ opacity: done ? 0 : 1 }}
        aria-hidden
        className={cn("relative text-small font-semibold tabular-nums", live ? "text-fg" : "text-fg-2")}
        initial={false}
        transition={tween.fast}
      >
        {formatNumber(n)}
      </motion.span>
      <svg aria-hidden className="absolute inset-0 size-full" fill="none" viewBox="0 0 32 32">
        <motion.path
          animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          className="stroke-on-solid"
          d="M10.5 16.4l3.6 3.6 7.4-7.6"
          initial={false}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.4}
          transition={done ? { pathLength: { duration: dur.check, ease: ease.out, delay: 0.06 }, opacity: { duration: 0.01 } } : { opacity: tween.exit, pathLength: { duration: 0, delay: dur.exit } }}
        />
      </svg>
    </span>
  );
}

export function LessonList({
  lessons,
  ticked,
  interactive,
  onToggle,
}: {
  readonly lessons: readonly string[];
  /** 1-based lesson numbers shown ticked (stored ticks plus the ones the cascade has reached). */
  readonly ticked: ReadonlySet<number>;
  /** Started: every row is a tick box. */
  readonly interactive: boolean;
  readonly onToggle?: (n: number, on: boolean) => void;
}): ReactNode {
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {lessons.map((title, i) => {
        const n = i + 1;
        const done = ticked.has(n);
        const text = <span className={cn("min-w-0 flex-1 text-body font-medium transition-colors duration-200", done ? "text-fg-3" : "text-fg")}>{keepLatin(title)}</span>;
        if (!interactive) {
          return (
            <li className="flex items-center gap-4 px-card py-3.5" data-testid={TID.course.lesson(n)} key={n}>
              <LessonMark done={done} live={interactive} n={n} />
              {text}
            </li>
          );
        }
        return (
          <li key={n}>
            <button
              aria-checked={done}
              aria-label={lessonLabel(n, title)}
              className="flex w-full items-center gap-4 px-card py-3.5 text-start transition-colors duration-200 hover:bg-hover focus-visible:-outline-offset-2"
              data-testid={TID.course.lesson(n)}
              onClick={() => onToggle?.(n, !done)}
              role="checkbox"
              type="button"
            >
              <LessonMark done={done} live={interactive} n={n} />
              {text}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
