"use client";
// Ring (playbook block 13): Darb's match ring. An OPEN ring: a solid arc from 12 o'clock, clockwise, that ends in the
// waypoint dot (accent); the rest of the track is dotted. Arc, dot and the number in the centre are one motion value,
// so they can never disagree. Never mirrored (SVG ignores dir="rtl"; clockwise reads the same in both directions).
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useEffectEvent, useId, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { popIn, tween } from "@/lib/motion";

import { useInstant } from "./provider";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Ring geometry for a size in CSS px. All lengths are returned in viewBox units (the viewBox is 100 x 100). */
function geometry(size: number) {
  const u = 100 / size; // viewBox units per CSS px
  const sw = clamp(size * 0.058, 3, 8.5); // solid arc, px
  const dot = Math.max(2.4, sw * 0.72); // dotted track, px
  const endR = sw * 1.02; // waypoint radius, px
  const cut = Math.max(2, sw * 0.5); // the open gap round the waypoint, px
  const r = 50 - (endR + cut + 0.75) * u;
  const circumferencePx = (2 * Math.PI * r) / u;
  const dots = Math.max(12, Math.round(circumferencePx / (size < 72 ? 6.5 : 8.5)));
  const tickR = sw * 0.85 * u;
  const tickW = Math.max(1.6, sw * 0.42) * u;
  return { r, sw: sw * u, dot: dot * u, endR: endR * u, cut: cut * u, dots, tickR, tickW };
}

/** Screen point at `pct` percent round the ring, clockwise from 12 o'clock. */
function at(pct: number, radius: number) {
  const a = ((-90 + 3.6 * pct) * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(a), y: 50 + radius * Math.sin(a) };
}

/** A pie wedge from `a` to `b` percent (clockwise), used to clip the accent "next leg" dots. */
function wedge(a: number, b: number) {
  const p = at(a, 64);
  const q = at(b, 64);
  const large = b - a > 50 ? 1 : 0;
  return `M50 50 L${p.x.toFixed(3)} ${p.y.toFixed(3)} A64 64 0 ${large} 1 ${q.x.toFixed(3)} ${q.y.toFixed(3)} Z`;
}

export type RingProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** 0..100. Changes draw the arc and count the number from what is on screen (900 ms, ease-in-out). */
  value: number;
  /** A projected value (gain-preview): an accent dotted "next leg" and a small open tick ahead of the waypoint. */
  preview?: number;
  /** First paint shows `from` and draws to `value` (ring-count from 0). Default: `value` (nothing moves on load). */
  from?: number;
  /** 40..160 px. Under 56 px the number drops its % sign. */
  size?: number;
  /** Seconds before the draw starts. */
  delay?: number;
  /** Hide the number (a ring used as a pure mark). */
  hideNumber?: boolean;
  /** Called when a draw reaches its value (the celebration fires Burst here). */
  onDrawn?: () => void;
  /**
   * The end dot. `accent` (default): the waypoint, your position. `muted`: drawn in the arc's ink, for a ring that is not
   * where you are going (a job card that is not your target, DESIGN 3.1). A parent can ask the same for rings drawn inside
   * other pieces with `data-ring-dot="muted"`.
   */
  dot?: "accent" | "muted";
};

/**
 * Colours come from the semantic utilities, so the ring works on paper, on a card and inside `data-surface="stage"` with
 * no extra props: arc `fg`, dots `border-strong`, waypoint `accent`. The opening round the waypoint (and inside the
 * preview tick) is a real gap cut with an SVG mask, so whatever is behind the ring shows through: no colour to match.
 * (`--ring-cut` is no longer needed by the Ring; setting it does nothing here.)
 */
export function Ring({ value, preview, from, size = 96, delay = 0, hideNumber = false, onDrawn, dot = "accent", className, style, ...rest }: RingProps) {
  const instant = useInstant();
  const uid = useId();
  const maskId = `${uid}-gap`;
  const clipId = `${uid}-leg`;
  const g = geometry(size);
  const mv = useMotionValue(clamp(from ?? value, 0, 100));
  const pathLength = useTransform(mv, (v) => clamp(v, 0, 100) / 100);
  const arcOpacity = useTransform(mv, (v) => (v > 0.2 ? 1 : 0)); // a zero-length round-capped arc would paint a dot
  const cx = useTransform(mv, (v) => at(clamp(v, 0, 100), g.r).x);
  const cy = useTransform(mv, (v) => at(clamp(v, 0, 100), g.r).y);
  const number = useTransform(() => Math.round(clamp(mv.get(), 0, 100)));
  const drawn = useEffectEvent(() => onDrawn?.());

  useEffect(() => {
    const target = clamp(value, 0, 100);
    if (instant) {
      mv.jump(target);
      drawn();
      return;
    }
    if (mv.get() === target) return;
    const controls = animate(mv, target, { ...tween.draw, delay, onComplete: () => drawn() });
    return () => controls.stop();
  }, [instant, mv, value, delay]);

  const shownPreview = preview !== undefined && preview > value ? clamp(preview, 0, 100) : null;
  const tick = shownPreview === null ? null : at(shownPreview, g.r);
  const small = size < 56;
  const fontSize = small ? Math.max(14, size * 0.36) : size * 0.27;
  const dash = `0.001 0.999`;

  return (
    <span
      role="img"
      aria-label={`${Math.round(value)}%`}
      {...rest}
      data-value={Math.round(value)}
      data-preview={shownPreview ?? undefined}
      className={cn("relative inline-grid shrink-0 place-items-center text-fg", className)}
      style={{ width: size, height: size, ...style }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          {/* white keeps, black cuts: the gap round the waypoint travels with it; the tick's hole fades with the tick */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
            <rect x="-10" y="-10" width="120" height="120" fill="white" />
            <motion.circle cx={cx} cy={cy} r={g.endR + g.cut} fill="black" />
            <AnimatePresence>
              {tick !== null && (
                <motion.circle
                  key="tick-hole"
                  cx={tick.x}
                  cy={tick.y}
                  r={g.tickR + g.tickW / 2 + g.cut * 0.6}
                  fill="black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: tween.fast }}
                  exit={{ opacity: 0, transition: tween.exit }}
                />
              )}
            </AnimatePresence>
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <g transform="rotate(-90 50 50)" fill="none" strokeLinecap="round">
            {/* the way ahead: dotted, exactly `dots` evenly spaced dots */}
            <circle cx="50" cy="50" r={g.r} pathLength={g.dots} strokeDasharray={dash} strokeWidth={g.dot} className="stroke-border-strong" />
            {/* covered: one solid arc */}
            <motion.circle cx="50" cy="50" r={g.r} strokeWidth={g.sw} className="stroke-fg" style={{ pathLength, opacity: arcOpacity }} />
          </g>
          <AnimatePresence>
            {shownPreview !== null && (
              <motion.g key="preview-leg" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: tween.fast }} exit={{ opacity: 0, transition: tween.exit }}>
                {/* the clip lives inside the group, so it leaves with it (an exiting group keeps its last render) */}
                <clipPath id={clipId}>
                  <path d={wedge(value, shownPreview)} />
                </clipPath>
                {/* the next leg: the same dots, in the accent, between the waypoint and the projected value */}
                <g clipPath={`url(#${clipId})`}>
                  <circle
                    cx="50"
                    cy="50"
                    r={g.r}
                    transform="rotate(-90 50 50)"
                    fill="none"
                    strokeLinecap="round"
                    pathLength={g.dots}
                    strokeDasharray={dash}
                    strokeWidth={g.dot * 1.15}
                    className="stroke-accent"
                  />
                </g>
              </motion.g>
            )}
          </AnimatePresence>
        </g>
        <AnimatePresence>
          {tick !== null && (
            <motion.g key="preview-tick" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: tween.exit }}>
              {/* the projected value: a small open tick (its inside is cut out of the dots by the mask) */}
              <motion.circle cx={tick.x} cy={tick.y} r={g.tickR} strokeWidth={g.tickW} fill="none" variants={popIn} initial="hidden" animate="show" className="stroke-accent" />
            </motion.g>
          )}
        </AnimatePresence>
        {/* the waypoint: where you are now */}
        <motion.circle cx={cx} cy={cy} r={g.endR} className={dot === "muted" ? "fill-fg" : "fill-accent in-data-[ring-dot=muted]:fill-fg"} />
      </svg>
      {!hideNumber && (
        <span aria-hidden dir="ltr" className="relative font-bold leading-none tabular-nums" style={{ fontSize }}>
          <motion.span>{number}</motion.span>
          {!small && <span className="text-[0.5em] font-semibold">%</span>}
        </span>
      )}
    </span>
  );
}
