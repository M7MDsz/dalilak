"use client";
// The CV results as loot (docs/GAME-LAYER.md 4.7): every skill «دليلك» found is a card you collected, with its stars and the
// sentence that proves it (P4: evidence over assertion). Cards are read, not pressed, so they lie flat. LootReveal lands them
// one after another (pop, under 480 ms in total) when the results arrive; nothing moves after that.
import { motion } from "motion/react";
import { Children, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { SkillStars } from "@/components/ui";
import { group, popIn, staggerStep } from "@/lib/motion";

import { Tile } from "./tile";

export interface LootCardProps {
  readonly name: string;
  readonly stars: number;
  /** The skill's slots (1-3). */
  readonly slots: 1 | 2 | 3;
  /** The CV sentence that proves it (without quotes). */
  readonly evidence?: string;
  /** Before the sentence. Default «من سيرتك:». */
  readonly source?: string;
  /** The field icon (20 px). */
  readonly icon?: ReactNode;
  /** Land the last star (star-fill) after `delay` seconds. */
  readonly fresh?: boolean;
  readonly delay?: number;
  readonly className?: string;
  /** cv-skill-{skillId} (data-value = stars) */
  readonly testId?: string;
  /** cv-evidence-{skillId} */
  readonly evidenceTestId?: string;
}

export function LootCard({ name, stars, slots, evidence, source = "من سيرتك:", icon, fresh = false, delay = 0, className, testId, evidenceTestId }: LootCardProps) {
  const latin = /^[\x20-\x7e]+$/.test(name);
  return (
    <Tile className={cn("h-full", className)} faceClassName="gap-2.5 p-4" interactive={false}>
      <div className="flex items-center gap-2.5">
        {icon ? <span className="inline-grid size-9 shrink-0 place-items-center rounded-[0.625rem] border-[1.5px] border-fg text-fg wp-quiet stage:border-on-stage-3">{icon}</span> : null}
        <p className="min-w-0 flex-1 truncate text-title text-fg">{latin ? <bdi dir="ltr">{name}</bdi> : name}</p>
        <SkillStars fresh={fresh ? stars : undefined} freshDelay={delay} size="lg" slots={slots} testId={testId} value={stars} />
      </div>
      {evidence ? (
        <p className="text-small text-fg-2" data-testid={evidenceTestId}>
          <span className="font-medium text-fg-3">{source} </span>
          <span className="bg-mark box-decoration-clone px-0.5 text-fg">«{evidence}»</span>
        </p>
      ) : null}
    </Tile>
  );
}

export interface LootRevealProps {
  readonly children: ReactNode;
  /** false: render at rest (a returning visit shows the saved results with no replay). */
  readonly play?: boolean;
  /** Seconds before the first card lands. */
  readonly delay?: number;
  readonly className?: string;
}

/** Lands its children one after another with the pop verb. Change its `key` to replay. */
export function LootReveal({ children, play = true, delay = 0, className }: LootRevealProps) {
  const items = Children.toArray(children);
  return (
    <motion.div animate="show" className={className} initial={play ? "hidden" : false} variants={group(staggerStep(items.length, 0.06), delay)}>
      {items.map((child, i) => (
        <motion.div className="min-w-0" key={i} variants={popIn}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
