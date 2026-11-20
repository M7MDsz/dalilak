"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { IconBase, type IconProps } from "@/components/icons/icon-base";
import { NumberTicker, Roll, useInstant } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";

// ---------------------------------------------------------------------------------------------------------------------
// XpGlyph: the spot height. A rounded hill (a dome on flat feet) whose line opens at the summit, with the dot standing in
// the opening: the waypoint-in-the-opening sentence again. No straight legs and no base line, so it can never close into
// a triangle (a triangle with a dot is the warning sign).

/**
 * The XP glyph, drawn on the icon grid (24, stroke 2, round caps). Its dot is the summit mark in the glyph's own colour,
 * at full strength and clear of the line: XP is a reward, not the user's position, so the dot is never coral.
 * Every XP number in the product carries it through XpValue; use it alone only where a label needs the XP mark.
 */
export function XpGlyph(props: IconProps) {
  return (
    <IconBase {...props} waypoint="off">
      <path d="M2 16.6C3.8 16.6 4.6 11.3 6.8 9.7 7.4 9.25 7.9 9 8.4 8.85M22 16.6C20.2 16.6 19.4 11.3 17.2 9.7 16.6 9.25 16.1 9 15.6 8.85" />
      <circle cx="12" cy="8.2" fill="currentColor" r="1.75" stroke="none" />
    </IconBase>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// XpValue: an XP amount in brass with the XP glyph (the spot height). Gains are written «+200 XP».

export interface XpValueProps {
  readonly value: number;
  /** A gain: «+200 XP». A total has no sign (and never a solid triangle in front of it). */
  readonly gain?: boolean;
  /** sm 14 px (rows, meta) · md 15 px (cards) · lg 20 px (toasts, celebration) */
  readonly size?: "sm" | "md" | "lg";
  /** Count to the value when it changes (NumberTicker) instead of showing it plainly. */
  readonly count?: boolean;
  readonly className?: string;
}

const XP_TEXT = { sm: "text-small", md: "text-[0.9375rem]", lg: "text-h3" } as const;
const XP_ICON = { sm: 18, md: 20, lg: 26 } as const;

export function XpValue({ value, gain = false, size = "md", count = false, className }: XpValueProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-bold text-xp-fg tabular-nums", XP_TEXT[size], "leading-none", className)} data-value={value} dir="ltr">
      <XpGlyph size={XP_ICON[size]} />
      <span>
        {gain ? "+" : ""}
        {count ? <NumberTicker value={value} /> : formatNumber(value)} XP
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// XpBar: the level progress drawn as a map scale bar. Segments fill in counted steps while the number counts.

const STEP_MS = 160; // one segment's fill; the steps follow each other, so five segments take 800 ms (the count's length)

function fillsOf(total: number, from: number, to: number | null, segments: number): number[] {
  if (to === null || to <= from) return Array.from({ length: segments }, () => 1);
  const filled = Math.max(0, Math.min(1, (total - from) / (to - from))) * segments;
  return Array.from({ length: segments }, (_, i) => Math.max(0, Math.min(1, filled - i)));
}

export interface XpBarProps {
  /** Total XP. */
  readonly total: number;
  /** The current level's threshold (350 for level 3). */
  readonly from: number;
  /** The next level's threshold (600 for level 3); null at the top level. */
  readonly to: number | null;
  readonly level: number;
  /** The level's title («مجتهد»). */
  readonly title: string;
  /** full: header, bar, scale ticks (profile, celebration) · compact: one line and a thin bar (the user chip) */
  readonly variant?: "full" | "compact";
  readonly segments?: number;
  /** full only: «بقي 180 XP للمستوى 4 «متمكّن»» under the ticks. Pass the next title. */
  readonly nextTitle?: string;
  readonly showRemaining?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

interface View {
  readonly total: number;
  readonly from: number;
  readonly to: number | null;
  readonly level: number;
  readonly title: string;
  readonly nextTitle?: string;
  readonly animate: boolean;
}

/**
 * XpBar. When XP is earned the segments fill one after another (counted steps) while the number counts. On a level-up the
 * old sheet fills to its end, then a fresh sheet for the new level starts (a cut, never an un-draw) and the title rolls.
 * Reduced motion and ?still=1: it shows the end state at once.
 */
export function XpBar({ total, from, to, level, title, variant = "full", segments = 5, nextTitle, showRemaining = false, className, testId }: XpBarProps) {
  const instant = useInstant();
  const [view, setView] = useState<View>({ total, from, to, level, title, nextTitle, animate: false });
  const shownLevel = useRef(level);

  useEffect(() => {
    const next = { total, from, to, level, title, nextTitle };
    if (instant || level < shownLevel.current) {
      shownLevel.current = level;
      setView({ ...next, animate: false });
      return;
    }
    if (level > shownLevel.current) {
      setView((v) => ({ ...v, total: v.to ?? v.total, animate: true })); // 1. finish the old sheet
      let inner = 0;
      const outer = window.setTimeout(() => {
        shownLevel.current = level;
        setView({ ...next, total: from, animate: false }); // 2. a fresh sheet for the new level
        inner = window.setTimeout(() => setView({ ...next, animate: true }), 60); // 3. count up on it
      }, segments * STEP_MS + 160);
      return () => {
        window.clearTimeout(outer);
        window.clearTimeout(inner);
      };
    }
    setView({ ...next, animate: true });
  }, [total, from, to, level, title, nextTitle, instant, segments]);

  const fills = fillsOf(view.total, view.from, view.to, segments);
  const previous = useRef(fills);
  let step = 0;
  const delays = fills.map((fill, i) => (fill > (previous.current[i] ?? 0) + 0.001 ? step++ * STEP_MS : 0));
  useEffect(() => {
    previous.current = fills;
  });

  const ticks = view.to === null ? [] : Array.from({ length: segments + 1 }, (_, i) => view.from + ((view.to! - view.from) * i) / segments);
  const compact = variant === "compact";

  const bar = (
    <div
      aria-label={`المستوى ${view.level}`}
      aria-valuemax={view.to ?? view.total}
      aria-valuemin={view.from}
      aria-valuenow={view.total}
      className={cn(
        "flex overflow-hidden border-fg-2 bg-surface stage:bg-transparent",
        compact ? "h-2 rounded-[0.125rem] border" : "h-3.5 rounded-[0.1875rem] border-[1.5px]",
      )}
      role="progressbar"
    >
      {fills.map((fill, i) => (
        <span className={cn("relative flex-1 border-fg-2 last:border-e-0", compact ? "border-e" : "border-e-[1.5px]")} key={i}>
          <span
            // the brass fill carries a 1.5 px xp-line edge along its foot, so a filled segment still reads when a projector
            // washes the yellow out (a border inside the fill, not a shadow)
            className={cn("absolute inset-0 border-xp-line bg-xp ltr:origin-left rtl:origin-right", compact ? "border-b" : "border-b-[1.5px]")}
            style={
              {
                scale: `${fill} 1`,
                transition: view.animate ? `scale ${STEP_MS}ms var(--ease-out) ${delays[i]}ms` : "none",
              } as CSSProperties
            }
          />
        </span>
      ))}
    </div>
  );

  const amount = (
    <span className={cn("font-medium text-fg-2 tabular-nums", compact ? "text-caption" : "text-small")} dir="ltr">
      <span className={cn("font-bold text-xp-fg", compact ? "text-small" : "text-[0.9375rem]")}>
        <NumberTicker value={view.total} />
      </span>
      {view.to === null ? " XP" : ` / ${formatNumber(view.to)} XP`}
    </span>
  );

  return (
    <div className={cn("flex min-w-0 flex-col", compact ? "gap-1.5" : "gap-2.5", className)} data-level={view.level} data-testid={testId} data-value={total}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("inline-flex items-baseline gap-1.5 whitespace-nowrap", compact ? "text-small font-semibold" : "text-title font-bold")}>
          <span>المستوى</span>
          <Roll id={view.level}>
            <span className="tabular-nums">{view.level}</span>
          </Roll>
          <span className={cn("font-normal text-fg-3", compact ? "text-caption" : "text-small")}>
            <Roll id={view.title}>{view.title}</Roll>
          </span>
        </span>
        {amount}
      </div>
      {bar}
      {!compact && ticks.length > 0 ? (
        <div className="flex justify-between text-caption font-normal text-fg-3 tabular-nums">
          {ticks.map((t) => (
            <span dir="ltr" key={t}>
              {formatNumber(t)}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && showRemaining && view.to !== null ? (
        <p className="text-small text-fg-2">
          بقي{" "}
          <bdi className="font-semibold text-fg" dir="ltr">
            {formatNumber(view.to - view.total)} XP
          </bdi>{" "}
          للمستوى {view.level + 1}
          {view.nextTitle ? ` «${view.nextTitle}»` : ""}
        </p>
      ) : null}
    </div>
  );
}
