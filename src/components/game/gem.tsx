"use client";
// SkillGem: one skill as a collectible piece, with its stars. Against a requirement (a job's five skills) it is met, partial
// or locked; in a collection it is owned or locked. Not pressable, so it is flat: an ink outline, or a dashed well when locked.
import type { ReactNode } from "react";

import { IconLock } from "@/components/icons";
import { cn } from "@/components/ui/cn";
import { SkillStars } from "@/components/ui";

export type GemState = "met" | "partial" | "locked";

export interface SkillGemProps {
  /** The skill's name («Power BI», «الإحصاء»). Latin names are isolated for you. */
  readonly name: string;
  /** Stars held. */
  readonly have: number;
  /** Stars required (a job requirement): draws `need` slots and decides met / partial / locked. */
  readonly need?: number;
  /** Without `need`: the skill's own slots (1-3) in a collection. */
  readonly slots?: 1 | 2 | 3;
  /** sm 36 px (inside cards) · md 44 px (a panel, the gap view) */
  readonly size?: "sm" | "md";
  /** An optional field icon at the start (20 px). */
  readonly icon?: ReactNode;
  /** The slot (1-based) whose star was just earned: it lands (SkillStars `fresh`). */
  readonly fresh?: number;
  readonly freshDelay?: number;
  readonly className?: string;
  readonly testId?: string;
}

const clampSlots = (n: number): 1 | 2 | 3 => (n <= 1 ? 1 : n >= 3 ? 3 : 2);

export function gemStateOf(have: number, need?: number): GemState {
  if (have <= 0) return "locked";
  if (need !== undefined && have < need) return "partial";
  return "met";
}

/**
 * SkillGem. `<SkillGem name="Power BI" have={0} need={1} />` is a locked gem (dashed, lock, empty star);
 * `<SkillGem name="الإحصاء" have={1} need={2} />` is partial; `<SkillGem name="Excel" have={2} slots={3} />` is owned.
 */
export function SkillGem({ name, have, need, slots, size = "sm", icon, fresh, freshDelay, className, testId }: SkillGemProps) {
  const state = gemStateOf(have, need);
  const n = clampSlots(need ?? slots ?? Math.max(1, have));
  const shown = Math.min(have, n);
  const latin = /^[\x20-\x7e]+$/.test(name);
  return (
    <span
      className={cn(
        "inline-flex min-w-0 shrink-0 items-center whitespace-nowrap rounded-[0.625rem] border-[1.5px] wp-quiet",
        size === "sm" ? "h-9 gap-1.5 ps-2.5 pe-2" : "h-11 gap-2 ps-3 pe-2.5",
        state === "locked" ? "border-dashed border-border-strong bg-surface-2 text-fg-2" : "border-fg bg-surface text-fg stage:border-on-stage-3",
        className,
      )}
      data-state={state}
      data-testid={testId}
      data-value={have}
    >
      {state === "locked" ? <IconLock className="shrink-0" size={16} waypoint="off" /> : icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      <span className={cn("truncate font-semibold", size === "sm" ? "text-small" : "text-body")}>{latin ? <bdi dir="ltr">{name}</bdi> : name}</span>
      <SkillStars fresh={fresh} freshDelay={freshDelay} size="sm" slots={n} value={shown} />
    </span>
  );
}

/** A skill still missing for a job: the locked gem (dashed well, the lock, its empty star slots). */
export function LockedGem({ name, need = 1, size = "sm", className, testId }: { readonly name: string; readonly need?: number; readonly size?: "sm" | "md"; readonly className?: string; readonly testId?: string }) {
  return <SkillGem className={className} have={0} name={name} need={need} size={size} testId={testId} />;
}
