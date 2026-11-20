"use client";
// Tile: the tactile piece every game card is built on (docs/GAME-LAYER.md section 4.1). A face with an ink outline sits on a
// flat plinth (a drawn layer, zero blur, never a shadow); pressed, the face sinks onto it. Raised = there is something to
// do here (available, next, progress); flat = settled (done, pressed home) or not reachable yet (locked, a dashed well).
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { isRaised, type GameState } from "./state";

/** Plinth height in px: sm for chips and the user chip, md for cards, lg for a featured card. */
export const TILE_DEPTH = { sm: 3, md: 4, lg: 6 } as const;
export type TileDepth = keyof typeof TILE_DEPTH;

const RADIUS = { control: "rounded-control", card: "rounded-card", sheet: "rounded-sheet", full: "rounded-full" } as const;
export type TileRadius = keyof typeof RADIUS;

export interface TileProps extends Omit<useRender.ComponentProps<"button">, "className"> {
  /** The game state (section 3 of the layer). Default `available`. */
  readonly state?: GameState;
  /** Plinth height: sm 3 px · md 4 px · lg 6 px. */
  readonly depth?: TileDepth;
  readonly radius?: TileRadius;
  /**
   * false: a flat card (a collected skill, a stat). No plinth, no press, rendered as a div. Tactile depth belongs only to
   * things you can press. Default true.
   */
  readonly interactive?: boolean;
  /** A toggle that is on (an answer chosen, a filter set): pressed home and filled with ink. */
  readonly selected?: boolean;
  /** Shows the press frame without a pointer: «دليلك» pressing the tile in front of the user. */
  readonly pressed?: boolean;
  /** A StateRibbon (or any tag) hung on the top edge at the inline-start. It moves with the face. */
  readonly ribbon?: ReactNode;
  /** Classes of the outer box (layout: width, grid placement, h-full). */
  readonly className?: string;
  /** Classes of the face (padding and inner layout). */
  readonly faceClassName?: string;
}

/**
 * The face classes by state. Every colour is a semantic alias, so a tile works on paper and on the stage with no props
 * (on the stage the outline and the plinth become stage-3: the piece's body is one colour, as ink is on paper).
 */
function faceOf(state: GameState, interactive: boolean, selected: boolean): string {
  // (`border-solid` is the border-style utility in Tailwind, so the ink colour is written through its variable)
  if (selected) return "border-2 border-[color:var(--solid)] bg-solid text-on-solid";
  if (!interactive) {
    if (state === "locked") return "border-[1.5px] border-dashed border-border-strong bg-surface-2 text-fg";
    if (state === "done") return "border-[1.5px] border-border-strong bg-surface text-fg";
    return "border-[1.5px] border-fg bg-surface text-fg stage:border-stage-3";
  }
  switch (state) {
    case "locked":
      return "border-[1.5px] border-dashed border-border-strong bg-surface-2 text-fg hover:border-fg-2";
    case "done":
      return "border-[1.5px] border-border-strong bg-surface text-fg hover:border-fg-2";
    default:
      return "border-2 border-fg bg-surface text-fg hover:bg-hover stage:border-stage-3";
  }
}

/** The plinth colour: ink under a raised face; the accent key under the one `next` piece (your next action). */
function plinthOf(state: GameState): string {
  return state === "next" ? "bg-accent-ink" : "bg-fg stage:bg-stage-3";
}

/**
 * Tile. Renders a `<button>` by default; pass `render={<NavLink href="/jobs/x" />}` for a link, or `interactive={false}`
 * for a flat card. `className` lays out the outer box; `faceClassName` pads the face.
 *
 * ```tsx
 * <Tile state="next" ribbon={<StateRibbon state="next" />} render={<NavLink href="/learn/c-powerbi-1" />} faceClassName="p-card">…</Tile>
 * ```
 */
export function Tile({
  state = "available",
  depth = "md",
  radius = "card",
  interactive = true,
  selected = false,
  pressed = false,
  ribbon,
  className,
  faceClassName,
  render,
  children,
  ...rest
}: TileProps) {
  const d = interactive ? TILE_DEPTH[depth] : 0;
  const raised = interactive && !selected && isRaised(state);
  // A flat interactive piece (done, locked, selected) lies pressed home: the face sits where a raised face goes when pressed,
  // so a list of mixed states keeps one height and the settled ones read as pushed into the board.
  const home = interactive && !raised;

  const face = cn(
    "relative flex h-full w-full min-w-0 flex-col rounded-[inherit] text-start",
    faceOf(state, interactive, selected),
    interactive && "select-none transition-[translate,background-color,border-color,scale] duration-200 ease-out",
    raised && "active:translate-y-(--tile-d) active:transition-none data-pressed:translate-y-(--tile-d) data-pressed:transition-none",
    home && "translate-y-(--tile-d) active:scale-[0.99] active:transition-none",
    interactive && "focus-visible:outline-offset-[3px]",
    faceClassName,
  );

  const content = (
    <>
      {ribbon ? <span className="pointer-events-none absolute -top-3.5 start-4 z-raised flex">{ribbon}</span> : null}
      {children}
    </>
  );

  const element = useRender({
    defaultTagName: interactive ? "button" : "div",
    render,
    props: mergeProps<"button">(
      {
        type: interactive && !render ? "button" : undefined,
        className: face,
        children: content,
      },
      // the game state first, so a screen's own data-state (the catalogue's «started», «credited» for QA) wins
      { "data-state": state, "data-selected": selected ? "" : undefined } as Record<string, string | undefined>,
      rest,
      pressed ? ({ "data-pressed": "" } as Record<string, string>) : {},
    ),
  });

  return (
    <div className={cn("relative isolate min-w-0", RADIUS[radius], className)} data-tile="" style={{ "--tile-d": `${d}px`, paddingBottom: d } as CSSProperties}>
      {raised ? <span aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 -z-10 rounded-[inherit]", plinthOf(state))} style={{ top: d }} /> : null}
      {element}
    </div>
  );
}
