"use client";
// useShow (playbook block 16): the director of every show (path reveal, CV analysis, celebration, «دليلك» applying).
// The step index lives in React state; each step lasts at least its `ms` AND until its real work (`until`) is done,
// capped at 12 s. Cancellable, Strict-Mode safe, and it reports `playing` (the overlay queue holds while a show plays).
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import { sleep } from "@/lib/motion";

import { useStill } from "./provider";

export type ShowStep<Id extends string> = { id: Id; ms: number; until?: Promise<unknown> };

export type ShowState<Id extends string> = {
  /** 0-based index of the current step (QA: `data-value={index + 1}`). */
  index: number;
  id: Id | undefined;
  /** True from the first step until the end (or a skip, or `play` turning false). */
  playing: boolean;
  /** True once the last step has finished or the show was skipped. */
  done: boolean;
  /** Jump to the last step and finish now (Space / Esc, or a press on a button under the show). */
  skip: () => void;
};

const CAP_MS = 12_000;

/**
 * The reduced-motion form of any show (PRODUCT-SPEC "How to read": with reduced motion every moment shows its end state;
 * the path reveal and the CV analysis open directly on their results). One step, the last, with no dwell; it still waits
 * for the real work of every step (`until`), so a model's answer is never skipped.
 *   useShow(instant ? resultOnly(STEPS) : STEPS, play, onDone)      // instant = useInstant()
 */
export function resultOnly<Id extends string>(steps: readonly ShowStep<Id>[]): readonly ShowStep<Id>[] {
  const last = steps[steps.length - 1];
  if (!last) return [];
  const work = steps.flatMap((s) => (s.until ? [s.until.catch(() => undefined)] : []));
  return [{ id: last.id, ms: 0, until: work.length > 0 ? Promise.all(work) : undefined }];
}

/** The CV analysis show (PRODUCT-SPEC 6.3): six stages, 7.0 s. Give `read` its `until` (the analysis promise) yourself. */
export type CvStepId = "read" | "extract" | "evidence" | "level" | "match" | "done";
export const CV_STEPS: readonly ShowStep<CvStepId>[] = [
  { id: "read", ms: 1200 },
  { id: "extract", ms: 1600 },
  { id: "evidence", ms: 1200 },
  { id: "level", ms: 1200 },
  { id: "match", ms: 1200 },
  { id: "done", ms: 600 },
];
/** Reduced motion: the results open directly (`done`, no dwell). With a real `until`, use `resultOnly(steps)` instead. */
export const CV_STEPS_REDUCED: readonly ShowStep<CvStepId>[] = [{ id: "done", ms: 0 }];

/**
 * - Starts from step 0 every time `play` turns true; turning `play` false stops it where it is (`«أوقف»`).
 * - Under reduced motion pass `resultOnly(steps)` yourself (`useInstant()` tells you): the spec opens shows on their result.
 * - `?still=1`: the show jumps straight to its last step and finishes.
 * - Steps may be a new array on every render: the show restarts only when the ids or durations change.
 */
export function useShow<Id extends string>(steps: readonly ShowStep<Id>[], play: boolean, onDone: () => void): ShowState<Id> {
  const still = useStill();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const stepsRef = useRef(steps);
  const skipRef = useRef<(() => void) | null>(null);
  const finish = useEffectEvent(onDone);
  const signature = steps.map((s) => `${s.id}:${s.ms}`).join("|");

  useEffect(() => {
    stepsRef.current = steps;
  });

  useEffect(() => {
    if (!play) {
      setPlaying(false);
      return;
    }
    const list = stepsRef.current;
    const last = Math.max(0, list.length - 1);
    let alive = true;
    let ended = false;
    const end = () => {
      if (!alive || ended) return;
      ended = true;
      setIndex(last);
      setPlaying(false);
      setDone(true);
      finish();
    };
    skipRef.current = end;
    setDone(false);
    if (still || list.length === 0) {
      end();
      return () => {
        alive = false;
      };
    }
    setPlaying(true);
    void (async () => {
      for (const [i, step] of list.entries()) {
        if (!alive || ended) return;
        setIndex(i);
        // a failed `until` counts as finished: the show never stalls (the caller falls back to its local result)
        await Promise.all([sleep(step.ms), Promise.race([step.until?.catch(() => undefined), sleep(CAP_MS)])]);
      }
      end();
    })();
    return () => {
      alive = false; // Strict Mode and «أوقف» both land here
      skipRef.current = null;
    };
  }, [play, signature, still]);

  const skip = useCallback(() => skipRef.current?.(), []);
  return { index, id: steps[index]?.id, playing, done, skip };
}
