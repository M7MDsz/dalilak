"use client";
// The path-reveal building blocks (playbook 3.3). The stage is made of LAYERS that live across steps (the same answer
// chips and job tiles persist and change), not six scenes; only the status line rolls. Directed by useShow.
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { dur, tween } from "@/lib/motion";

import { useInstant } from "./provider";
import { Roll } from "./roll";
import { useShow, type ShowStep } from "./show";

export type RevealStepId = "answers-gather" | "jobs-sweep" | "skills-map" | "narrow-to-three" | "path-draw" | "reveal-landing";

/** The spec's six steps, 7.8 s. A module constant (a stable reference). */
export const REVEAL_STEPS: readonly ShowStep<RevealStepId>[] = [
  { id: "answers-gather", ms: 1200 },
  { id: "jobs-sweep", ms: 1500 },
  { id: "skills-map", ms: 1500 },
  { id: "narrow-to-three", ms: 1300 },
  { id: "path-draw", ms: 1500 },
  { id: "reveal-landing", ms: 800 },
];

/**
 * Reduced motion: the result opens directly (PRODUCT-SPEC 4.7 and "How to read": "With reduced motion the result opens
 * directly", "No moment has a special reduced-motion sequence"). This replaces the playbook's older 1-4-6 list.
 */
export const REVEAL_STEPS_REDUCED: readonly ShowStep<RevealStepId>[] = [{ id: "reveal-landing", ms: 0 }];

export type RevealLayer = {
  id: string;
  /** Present from this step index to that one (inclusive, 0-based). */
  from: number;
  to: number;
  render: (index: number, id: RevealStepId | undefined) => ReactNode;
  className?: string;
};

/**
 * Layers that live across steps: each fades in when its range starts (after the 150 ms in which a layer that ends there
 * fades out, so two scenes never cross) and stays, changing with the step, until its range ends. Every layer is
 * absolutely placed over the stage (give it `className` to place it).
 */
export function RevealLayers({ index, id, layers }: { index: number; id: RevealStepId | undefined; layers: readonly RevealLayer[] }) {
  return (
    <>
      {layers.map((layer) => (
        <AnimatePresence key={layer.id}>
          {index >= layer.from && index <= layer.to && (
            <motion.div
              key={layer.id}
              className={cn("absolute inset-0", layer.className)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { ...tween.enter, delay: dur.exit } }} // the leaving layer goes first
              exit={{ opacity: 0, transition: tween.exit }}
            >
              {layer.render(index, id)}
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </>
  );
}

/**
 * The reveal's frame: the dark stage, the layers, and one rolling status line under them (`reveal-step` carries the
 * 1-based step for QA). It plays the full list; under reduced motion and `?still=1` it opens on the last step.
 * `lines` gives the status text of every step. `onDone` fires once at the end (persist "played" there).
 */
export function RevealStage({
  lines,
  layers,
  onDone,
  play = true,
  className,
  stageClassName,
}: {
  lines: Record<RevealStepId, string>;
  layers: readonly RevealLayer[];
  onDone: () => void;
  play?: boolean;
  className?: string;
  stageClassName?: string;
}) {
  const instant = useInstant();
  const { index, id } = useShow(instant ? REVEAL_STEPS_REDUCED : REVEAL_STEPS, play, onDone);
  const fullIndex = id ? REVEAL_STEPS.findIndex((s) => s.id === id) : 0;
  return (
    <section data-testid="reveal-sequence" data-surface="stage" className={cn("flex flex-col items-center gap-6", className)}>
      <div className={cn("relative w-full", stageClassName)}>
        <RevealLayers index={fullIndex} id={id} layers={layers} />
      </div>
      <p data-testid="reveal-step" data-value={fullIndex + 1} role="status" className="text-base font-medium text-fg-2">
        {id && (
          <Roll id={id}>
            <span className="shimmer-text">{lines[id]}</span>
          </Roll>
        )}
      </p>
    </section>
  );
}
