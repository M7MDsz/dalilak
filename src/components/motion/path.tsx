"use client";
// Paths (playbook blocks 14 and 15): one connector of the roadmap or the skill tree, and the «أنت هنا» marker that
// rides the path. Darb's rule: covered is solid ink, the way ahead is a clearly visible dotted trail, the next leg is
// the accent's dotted trail. SVG units here are CSS pixels, and SVG is never mirrored: direction enters the geometry
// only through INLINE_END.
import { animate, motion, useMotionValue, useMotionValueEvent } from "motion/react";
import { useCallback, useEffect, useEffectEvent, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/cn";
import { ease, INLINE_END, tween } from "@/lib/motion";

import { useInstant } from "./provider";

export type Pt = { x: number; y: number };

/** A vertical S-curve between two points (roadmap legs, tree edges). */
export const sCurve = (a: Pt, b: Pt) => {
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
};

/** Roadmap layout in logical units, mirrored once: centre, inline-end side, centre, inline-start side, ... */
export function roadmapPoint(index: number, width: number, rowHeight = 112, top = 56): Pt {
  const amp = Math.min(width * 0.26, 120);
  const inline = Math.sin((index * Math.PI) / 2) * 0.6;
  return { x: width / 2 + INLINE_END * inline * amp, y: top + index * rowHeight };
}

/** A node's anchor relative to `root`, from offset* (ignores CSS transforms, so edges do not jump while nodes pop). */
export function anchor(el: HTMLElement, root: HTMLElement, at: "top" | "bottom"): Pt {
  let x = el.offsetWidth / 2;
  let y = at === "top" ? 0 : el.offsetHeight;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}

export type EdgeState = "locked" | "next" | "drawing" | "done";

/**
 * One connector, two layers (an element that uses pathLength cannot keep its own dash pattern):
 * - `locked`  the way ahead: dotted, `border-strong` (clearly visible, never text-faint).
 * - `next`    the leg to your next station: dotted in the accent.
 * - `drawing` the solid ink line draws over the accent dots of the leg you just walked (900 ms ease-in-out, after `delay`
 *             s); `onDrawn` when it arrives. The dots stay accent until the ink covers them (no grey flash).
 * - `done`    solid ink, no animation.
 * `track` overrides the dotted layer: "auto" (the rules above), "quiet" (border-strong dots whatever the state) or
 * "none" (no dots: a line drawn for the first time into empty space, as in the path reveal, where nothing was walked).
 * Put it inside an <svg> whose units are CSS px. Colours flip on the stage by themselves (semantic aliases).
 */
export function Edge({
  d,
  state,
  delay = 0,
  width = 3,
  track = "auto",
  onDrawn,
  className,
}: {
  d: string;
  state: EdgeState;
  delay?: number;
  width?: number;
  track?: "auto" | "quiet" | "none";
  onDrawn?: () => void;
  className?: string;
}) {
  const dotWidth = width + 0.75;
  const spacing = Math.max(8, width * 2.75);
  return (
    <g fill="none" strokeLinecap="round" className={className}>
      {state !== "done" && track !== "none" && (
        <path
          d={d}
          strokeWidth={dotWidth}
          strokeDasharray={`0.01 ${spacing}`}
          className={track === "auto" && (state === "next" || state === "drawing") ? "stroke-accent" : "stroke-border-strong"}
        />
      )}
      {(state === "drawing" || state === "done") && (
        <motion.path
          d={d}
          strokeWidth={width}
          className="stroke-fg"
          initial={state === "drawing" ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { ...tween.draw, delay }, opacity: { duration: 0.01, delay } }}
          onAnimationComplete={state === "drawing" ? onDrawn : undefined}
        />
      )}
    </g>
  );
}

/**
 * The default look of the marker: the waypoint itself, an accent dot with a cut in the colour behind it. The cut is
 * `--ring-cut`, by default the surface colour (a card or the map sheet; it flips on the stage). Over the bare page or the
 * bare stage, set `[--ring-cut:var(--bg)]` on it or a parent.
 */
export function HereDot({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block rounded-full bg-accent", className)}
      style={{ width: size, height: size, boxShadow: `0 0 0 ${Math.max(2, size * 0.2)}px var(--ring-cut, var(--surface))` }}
    />
  );
}

/**
 * «أنت هنا» rides the path: `target` is a fraction 0..1 of the spine's length (a hidden <path> in the same box as this
 * element's positioned parent). `from` replays a climb (catch-up); without it the marker starts at `target`.
 * Travel lasts 0.5 s per hop (at most 2.4 s), ease-in-out. Reduced motion and still frames jump.
 * The children (default: HereDot) are centred on the point. The marker follows the spine when its `d` changes (resize).
 */
export function HereMarker({
  spine,
  from,
  target,
  hops = 1,
  delay = 0,
  onArrive,
  className,
  children,
}: {
  spine: RefObject<SVGPathElement | null>;
  from?: number;
  target: number;
  hops?: number;
  delay?: number;
  onArrive?: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const instant = useInstant();
  const progress = useMotionValue(from ?? target);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const arrived = useEffectEvent(() => onArrive?.());

  const place = useCallback(
    (p: number) => {
      const el = spine.current;
      if (!el) return;
      const point = el.getPointAtLength(Math.min(1, Math.max(0, p)) * el.getTotalLength());
      x.set(point.x);
      y.set(point.y);
    },
    [spine, x, y],
  );
  useMotionValueEvent(progress, "change", place);

  useEffect(() => {
    place(progress.get());
    if (instant) {
      progress.jump(target);
      place(target);
      arrived();
      return;
    }
    const controls = animate(progress, target, {
      duration: Math.min(0.5 * Math.max(hops, 1), 2.4),
      delay,
      ease: ease.inOut,
      onComplete: () => arrived(),
    });
    return () => controls.stop();
  }, [instant, place, progress, target, hops, delay]);

  // Re-place when the spine is redrawn (a resize, the Arabic font loading).
  useEffect(() => {
    const el = spine.current;
    if (!el) return;
    const observer = new MutationObserver(() => place(progress.get()));
    observer.observe(el, { attributes: true, attributeFilter: ["d"] });
    return () => observer.disconnect();
  }, [spine, place, progress]);

  return (
    <motion.div aria-hidden className={cn("pointer-events-none absolute left-0 top-0", className)} style={{ x, y }}>
      {/* physical left on purpose: x and y are SVG pixels */}
      <div className="-translate-x-1/2 -translate-y-1/2">{children ?? <HereDot />}</div>
    </motion.div>
  );
}
