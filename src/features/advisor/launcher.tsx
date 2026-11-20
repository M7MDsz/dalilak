"use client";
// Owner: advisor. Everything «دليلك» shows OUTSIDE the panel:
// - Launcher: the desktop floating button «اسأل دليلك» at the bottom inline-end corner (spec 2.6). On phones the shell's
//   centre tab is the launcher; this one is rendered only on desktop (never hidden with CSS: one test id on screen).
// - GlyphFlight: the signature of the opening. «دليلك»'s glyph leaves the launcher and lands in the panel's header (and
//   goes home again on close). Measured at the moment of the change and flown as one fixed element, so a scrolled page,
//   the panel's own 16 px slide or a portal can never put its start or end point in the wrong place.
// - Nudge: the one line by the launcher (beside it on desktop), once per account, on the first arrival at /path (2.6).
// - WorkingPill: phones only. While an action runs the sheet steps aside so the page is seen (3.14); this pill keeps
//   «دليلك»'s glyph and the rolling status line on screen until the sheet comes back with the reply.
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";

import { DaleelGlyph, RollingStatus } from "@/components/chat";
import { Kbd, cn, press } from "@/components/ui";
import { popIn, tween } from "@/lib/motion";
import { TID } from "@/lib/testids";

import { ADVISOR_COPY } from "./copy";

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Flight {
  readonly id: number;
  readonly from: Box;
  readonly to: Box;
  readonly dir: "in" | "out";
}

// ------------------------------------------------------------------------------------------------ Launcher

export function Launcher({
  onOpen,
  glyphRef,
  buttonRef,
  glyphHidden,
  working,
  aside,
}: {
  onOpen: () => void;
  glyphRef: Ref<HTMLSpanElement>;
  buttonRef: Ref<HTMLButtonElement>;
  glyphHidden: boolean;
  working: boolean;
  /** Shown beside the launcher, toward the page (the nudge). */
  aside?: ReactNode;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, transition: { ...tween.fast, delay: 0.06 } }}
      className="fixed end-6 bottom-6 z-launcher"
      exit={{ opacity: 0, transition: tween.exit }}
      initial={{ opacity: 0 }}
    >
      <button
        aria-keyshortcuts="Control+K"
        className={cn(
          "group/launcher inline-flex h-14 items-center gap-3 rounded-full border border-border-strong bg-surface ps-2 pe-4 text-fg shadow-float",
          "transition-[border-color,scale,translate] duration-200 ease-out hover:border-fg",
          press,
        )}
        data-testid={TID.shell.advisorLauncher}
        data-wp-live=""
        onClick={onOpen}
        ref={buttonRef}
        type="button"
      >
        <span className="inline-flex shrink-0" ref={glyphRef}>
          <DaleelGlyph className={glyphHidden ? "opacity-0" : undefined} framed size={40} state={working ? "working" : "idle"} />
        </span>
        <span className="text-title font-semibold">{ADVISOR_COPY.launcher}</span>
        <Kbd aria-hidden className="ms-1 hidden xl:inline-flex" keys={["Ctrl", "K"]} />
      </button>
      {aside}
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ GlyphFlight

/** The flight: 420 ms on a gently overshooting curve (spring.gentle's shape), run by the Web Animations API on the
 *  compositor, so a busy main thread cannot freeze it mid-air. */
const FLIGHT_MS = 420;
const FLIGHT_EASE = "cubic-bezier(0.3, 1.18, 0.4, 1)";

/** One glyph flying from `from` to `to` (viewport pixels, physical by design, like FlyToken). */
export function GlyphFlight({ flight, onLand }: { flight: Flight | null; onLand: (id: number) => void }) {
  if (!flight) return null;
  return <Flyer flight={flight} key={flight.id} onLand={onLand} />;
}

function Flyer({ flight, onLand }: { flight: Flight; onLand: (id: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { from, to, id } = flight;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dx = from.x + from.w / 2 - (to.x + to.w / 2);
    const dy = from.y + from.h / 2 - (to.y + to.h / 2);
    const animation = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${from.w / to.w})` }, { transform: "translate(0px, 0px) scale(1)" }],
      { duration: FLIGHT_MS, easing: FLIGHT_EASE, fill: "both" },
    );
    let done = false;
    const land = () => {
      if (done) return;
      done = true;
      onLand(id);
    };
    animation.onfinish = land;
    const safety = window.setTimeout(land, FLIGHT_MS + 400);
    return () => {
      window.clearTimeout(safety);
      animation.cancel();
    };
  }, [from, to, id, onLand]);
  return (
    <span aria-hidden className="pointer-events-none fixed z-fly will-change-transform" ref={ref} style={{ left: to.x, top: to.y, width: to.w, height: to.h }}>
      <DaleelGlyph framed size={to.w} state="idle" />
    </span>
  );
}

// ------------------------------------------------------------------------------------------------ Nudge

/**
 * Desktop: rendered inside the launcher's corner box, BESIDE the launcher on its inline-start side (toward the page),
 * centred on it, 12 px off, its tail pointing at the launcher; it pops from the tail. Above the launcher it sat over the
 * bottom of the page's inline-end column, where /path keeps the leaderboard preview, and hid the user's own row
 * («أنت») for its whole 8 s; beside it, it stays in the launcher's own band at the bottom of the window, which on /path
 * is the free strip under that column and the map sheet's empty bottom corner (the sheet's only bottom furniture, the
 * trailhead sign, lives in the other corner). Phone: above the centre tab «دليلك», and above the map's pinned next-step
 * card when that card sits at the bottom, so it never covers the user's next action.
 */
export function Nudge({ shown, phone, onOpen }: { shown: boolean; phone: boolean; onOpen: () => void }) {
  const [lift, setLift] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!shown || !phone) return;
    const bar = document.querySelector<HTMLElement>("nav.fixed.bottom-0");
    const card = document.querySelector<HTMLElement>('[data-testid="path-next-step"]');
    const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight;
    const box = card?.getBoundingClientRect();
    // the card counts only when it is pinned just above the tab bar
    setLift(box && box.bottom > barTop - 24 && box.top < barTop ? window.innerHeight - box.top + 10 : null);
  }, [shown, phone]);
  if (!phone) {
    return (
      <AnimatePresence>
        {shown ? (
          // as tall as the launcher, past its inline-start edge: the bubble is centred on the launcher and grows toward
          // the page; it pops from the tail (its physical left, the launcher's side)
          <motion.div
            animate="show"
            className="group/nudge pointer-events-none absolute inset-y-0 end-full me-3 flex items-center"
            exit="exit"
            initial="hidden"
            key="nudge"
            style={{ originX: 0, originY: 0.5 }}
            variants={popIn}
          >
            <button
              className={cn(
                "pointer-events-auto relative w-max max-w-80 shrink-0 rounded-card border border-border-strong bg-surface px-4 py-2.5 text-start text-body font-medium leading-7 text-fg shadow-float",
                "transition-[border-color,scale,translate] duration-200 ease-out hover:border-fg",
                press,
              )}
              data-nudge=""
              data-testid={TID.shell.advisorNudge}
              onClick={onOpen}
              type="button"
            >
              {ADVISOR_COPY.nudge}
            </button>
            {/* the tail, on the bubble's inline-end edge (toward the launcher): a square turned 45° shows its physical
                left and bottom edges (border-e is the left in this Arabic-only app) as a V pointing at the launcher */}
            <span
              aria-hidden
              className="absolute top-1/2 -end-[6px] -mt-1.5 size-3 rotate-45 border-e border-b border-border-strong bg-surface transition-colors duration-200 group-hover/nudge:border-fg"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
  }
  return (
    <AnimatePresence>
      {shown ? (
        <motion.div
          animate="show"
          className="fixed inset-x-0 bottom-[calc(var(--shell-bottom,0px)+0.75rem)] z-launcher flex justify-center px-gutter"
          exit="exit"
          initial="hidden"
          key="nudge"
          style={{ originX: 0.5, originY: 1, ...(lift !== null ? { bottom: lift } : {}) }}
          variants={popIn}
        >
          <button
            className={cn(
              "relative max-w-80 rounded-card border border-border-strong bg-surface px-4 py-3 text-start text-body font-medium leading-7 text-fg shadow-float",
              "transition-[border-color,scale,translate] duration-200 ease-out hover:border-fg",
              press,
            )}
            data-nudge=""
            data-testid={TID.shell.advisorNudge}
            onClick={onOpen}
            type="button"
          >
            {ADVISOR_COPY.nudge}
            {/* the tail points down at the centre tab */}
            <span aria-hidden className="absolute inset-x-0 -bottom-[7px] mx-auto size-3 rotate-45 border-e border-b border-border-strong bg-surface" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------------------------------------ WorkingPill

export function WorkingPill({ status, startedAt, onOpen }: { status: string | null; startedAt: number; onOpen: () => void }) {
  return (
    <AnimatePresence>
      {status ? (
        <motion.div
          animate="show"
          className="fixed inset-x-0 bottom-[calc(var(--shell-bottom,0px)+0.75rem)] z-panel flex justify-center px-gutter"
          exit="exit"
          initial="hidden"
          key="working"
          style={{ originY: 1 }}
          variants={popIn}
        >
          <button
            className={cn("inline-flex h-12 max-w-full items-center gap-2.5 rounded-full bg-bg ps-3 pe-4 text-fg shadow-float", press)}
            data-surface="stage"
            data-testid="advisor-working"
            onClick={onOpen}
            type="button"
          >
            <DaleelGlyph size={22} state="working" />
            <RollingStatus label={status} startedAt={startedAt} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
