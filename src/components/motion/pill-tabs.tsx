"use client";
// PillTabs (playbook block 26): the sliding selection pill for tabs, filters and view toggles.
// The labels are drawn twice: the row of real buttons (fg-2 on the track) and, above it, an inverse copy of the same row
// (on-solid on solid) clipped to the selected tab's box. Moving the selection animates the clip (spring.gentle), so the
// pill slides and every label is legible in every frame: the part of a label under the pill is inverse, the rest is not.
// (A moving pill under labels that switch colour at once leaves both labels unreadable for ~200 ms on each press.)
// Hover changes colour only. Keyboard: arrows move the selection in reading order (in RTL, ArrowLeft is "next").
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

import { useInstant } from "./provider";

export type PillTab<T extends string> = { id: T; label: ReactNode; icon?: ReactNode; testId?: string };

const SIZE = { sm: "h-9 px-3.5 text-sm", md: "h-10 px-4 text-[15px]" } as const;
const LABEL = "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap";

export function PillTabs<T extends string>({
  tabs,
  active,
  onPick,
  label,
  size = "md",
  className,
}: {
  tabs: readonly PillTab<T>[];
  active: T;
  onPick: (id: T) => void;
  /** Accessible name of the group («عرض المسار»). */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const instant = useInstant();
  const listRef = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = tabs.findIndex((t) => t.id === active);
  // Until the first measure (server render, hydration) the selected button paints its own pill.
  const [measured, setMeasured] = useState(false);

  // The clip: inset() from each side of the track's padding box, in px.
  const top = useMotionValue(0);
  const right = useMotionValue(0);
  const bottom = useMotionValue(0);
  const left = useMotionValue(0);
  const clipPath = useTransform(() => `inset(${top.get()}px ${right.get()}px ${bottom.get()}px ${left.get()}px round 999px)`);

  // `place` reads the selection from a ref so it stays one stable function: the resize observer below is created once.
  // (Re-creating it on every selection fired its initial callback, which jumped the clip and cancelled the glide.)
  const activeRef = useRef(activeIndex);
  const place = useCallback(
    (glide: boolean) => {
      const list = listRef.current;
      const button = refs.current[activeRef.current];
      if (!list || !button) return;
      // offset* are relative to the track (it is `relative`) and ignore transforms (the press scale).
      const box = { top: button.offsetTop, left: button.offsetLeft, right: list.clientWidth - button.offsetLeft - button.offsetWidth, bottom: list.clientHeight - button.offsetTop - button.offsetHeight };
      const sides = [
        [top, box.top],
        [right, box.right],
        [bottom, box.bottom],
        [left, box.left],
      ] as const;
      for (const [mv, to] of sides) {
        if (glide) animate(mv, to, spring.gentle);
        else mv.jump(to);
      }
    },
    [top, right, bottom, left],
  );

  // A new selection glides (it jumps on the first measure, under reduced motion and in still frames).
  const first = useRef(true);
  useLayoutEffect(() => {
    activeRef.current = activeIndex;
    place(!first.current && !instant);
    first.current = false;
    setMeasured(true);
  }, [activeIndex, place, instant]);

  // The track resizes (fonts load, the window narrows): follow at once. Only a real change of size counts.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let size = `${list.clientWidth}x${list.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const now = `${list.clientWidth}x${list.clientHeight}`;
      if (now === size) return;
      size = now;
      place(false);
    });
    observer.observe(list);
    void document.fonts?.ready.then(() => place(false));
    return () => observer.disconnect();
  }, [place]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const i = activeIndex;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    const prevKey = rtl ? "ArrowRight" : "ArrowLeft";
    let j = -1;
    if (event.key === nextKey) j = (i + 1) % tabs.length;
    else if (event.key === prevKey) j = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") j = 0;
    else if (event.key === "End") j = tabs.length - 1;
    const tab = tabs[j];
    if (!tab) return;
    event.preventDefault();
    onPick(tab.id);
    refs.current[j]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={move}
      className={cn("relative inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1", className)}
    >
      {tabs.map((tab, i) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            data-testid={tab.testId}
            data-active={on ? "" : undefined}
            onClick={() => onPick(tab.id)}
            className={cn(
              LABEL,
              SIZE[size],
              "transition-colors duration-200 active:scale-[0.97] active:transition-none",
              on && !measured ? "bg-solid text-on-solid" : "text-fg-2 hover:text-fg",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
      {/* the pill: an inverse copy of the row, clipped to the selected tab */}
      <motion.div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 flex items-center gap-1 rounded-full bg-solid p-1", !measured && "invisible")}
        style={{ clipPath }}
      >
        {tabs.map((tab) => (
          <span key={tab.id} className={cn(LABEL, SIZE[size], "text-on-solid")}>
            {tab.icon}
            {tab.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
