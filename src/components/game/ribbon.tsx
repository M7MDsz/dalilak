"use client";
// StateRibbon: the small tag hung on a tile's top edge that names its state («التالية», «مقفلة», «مكتملة», «هدفك»).
// The label rolls when it changes (a state change is a value change: the roll verb).
import type { ReactNode } from "react";

import { IconCheck, IconLock } from "@/components/icons";
import { Roll } from "@/components/motion";
import { cn } from "@/components/ui/cn";

import { STATE_LABEL, type GameState } from "./state";

export type RibbonTone = "accent" | "ink" | "ok" | "quiet" | "locked";

const TONE: Record<RibbonTone, string> = {
  // your position or your next action: the coral face, the dark label (5.2:1), an ink outline
  accent: "border-ink bg-accent text-on-accent",
  ink: "border-[color:var(--solid)] bg-solid text-on-solid",
  ok: "border-current bg-surface text-ok-fg",
  quiet: "border-border-strong bg-surface text-fg-2",
  locked: "border-dashed border-border-strong bg-surface-2 text-fg-2",
};

const BY_STATE: Record<GameState, { tone: RibbonTone; icon: ReactNode | null }> = {
  locked: { tone: "locked", icon: <IconLock size={15} waypoint="off" /> },
  available: { tone: "quiet", icon: null },
  next: { tone: "accent", icon: null },
  progress: { tone: "ink", icon: null },
  done: { tone: "ok", icon: <IconCheck size={15} waypoint="off" /> },
};

export interface StateRibbonProps {
  /** Gives the tone, the icon and the default label of a game state. */
  readonly state?: GameState;
  /** Overrides the state's tone: `accent` only for your position or your next action («هدفك», «التالية»). */
  readonly tone?: RibbonTone;
  /** Overrides the state's icon; `null` for none. */
  readonly icon?: ReactNode | null;
  /** The label («جارية · 2 من 5»); defaults to the state's label. */
  readonly children?: ReactNode;
  /** A stable key for the roll when `children` is not a plain string. */
  readonly rollId?: string;
  readonly size?: "sm" | "md";
  readonly className?: string;
  readonly testId?: string;
}

/** StateRibbon. Hang it with `<Tile ribbon={<StateRibbon state="next" />}>`, or use it inline as a state tag. */
export function StateRibbon({ state = "available", tone, icon, children, rollId, size = "sm", className, testId }: StateRibbonProps) {
  const preset = BY_STATE[state];
  const t = tone ?? preset.tone;
  const mark = icon === undefined ? preset.icon : icon;
  const label = children ?? STATE_LABEL[state];
  const id = rollId ?? (typeof label === "string" ? label : state);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-tag border-[1.5px] font-semibold leading-none wp-quiet",
        size === "sm" ? "h-7 px-2 text-small" : "h-8 px-2.5 text-small",
        TONE[t],
        className,
      )}
      data-state={state}
      data-testid={testId}
    >
      {mark ? <span className="inline-flex shrink-0">{mark}</span> : null}
      <Roll id={id}>{label}</Roll>
    </span>
  );
}
