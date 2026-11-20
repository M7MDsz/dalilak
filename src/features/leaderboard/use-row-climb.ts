"use client";
// Owner: leaderboard. The director of `row-climb` (spec 3.12, tier 1; playbook 3.10). The list first shows the order the
// user last saw, then the user's row climbs ONE place at a time to its new rank, so it visibly passes each row it
// overtook. My card's rank counts down on the same clock, place by place, and lands with the row.
//
// Timeline (from the page's mount): the podium rises (0-0.8 s); the climb starts as it ends (CLIMB_START_MS) and lasts
// about 1.2 s with the lift and the landing. Nothing waits for a scroll.
// - Card and board side by side (a wide content area, or beside the docked advisor): the card column is sticky, so when
//   the stretch of the climb is below the fold the window glides there WHILE the podium rises, and the card stays in
//   view. A wheel, touch or key press during that glide hands control back; the row then climbs when it is seen.
// - One column (a phone, a narrow content area, or a window too short for the sticky column): the window never moves,
//   so my card (first on the page) stays where it is. The card counts and lands on its own clock at CLIMB_START_MS; the
//   row climbs when it is first seen (it may already be on screen).
// Reduced motion and still frames: everything opens on the end state.
import { animate } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { useInstant } from "@/components/motion";
import { ease } from "@/lib/motion";

import { CLIMB_SETTLE_MS, CLIMB_START_MS, GLIDE_START_MS, LIFT_LEAD_MS, climbSchedule, stepsStarted } from "./climb";

/** waiting (old place shown) → climbing (lifted, stepping) → arrived (on its new place, the lift coming down) → landed. */
export type ClimbPhase = "waiting" | "climbing" | "arrived" | "landed";

export interface RowClimb {
  /** The place the user's row is drawn at right now (1-based). */
  readonly position: number;
  /** The row's phase. */
  readonly phase: ClimbPhase;
  /** Places gained since the page last showed the rank (0 when none). */
  readonly places: number;
  /** The length of the step the row is travelling now, in seconds (its move is a straight segment of that length). */
  readonly segmentS: number;
  /** The rank my card shows right now (the old place, counting down to the new one). */
  readonly cardRank: number;
  /** My card has landed on the new rank (its gap line and «صعدت…» show from then on). */
  readonly cardLanded: boolean;
}

export function useRowClimb(
  from: number,
  to: number,
  boardRef: RefObject<HTMLElement | null>,
  asideRef: RefObject<HTMLElement | null>,
): RowClimb {
  const instant = useInstant();
  const places = Math.max(0, from - to);
  const active = places > 0 && !instant;
  const [cardGo, setCardGo] = useState(false);
  const [rowGo, setRowGo] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let started = false; // CLIMB_START_MS has passed
    let armed = false; // the row has been told to climb
    let mode: "now" | "watch" = "watch";
    let glide: { stop: () => void } | null = null;
    let observer: IntersectionObserver | null = null;

    const arm = () => {
      if (cancelled || armed) return;
      armed = true;
      setRowGo(true);
    };
    const watchUntilSeen = () => {
      const me = boardRef.current?.querySelector<HTMLElement>("[data-me]");
      if (!me) return arm();
      const { top, bottom } = visibleBand();
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)) {
            observer?.disconnect();
            arm();
          }
        },
        { rootMargin: `-${Math.round(top)}px 0px -${Math.round(Math.max(0, window.innerHeight - bottom))}px 0px`, threshold: [0.6] },
      );
      observer.observe(me);
    };
    const stopListening = () => {
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("keydown", takeOver);
    };
    function takeOver() {
      glide?.stop();
      glide = null;
      stopListening();
      if (armed) return;
      mode = "watch";
      if (started) watchUntilSeen();
    }

    const planTimer = window.setTimeout(() => {
      const plan = planGlide(boardRef.current, asideRef.current, to);
      if (plan.kind === "watch") return;
      mode = "now";
      if (plan.kind === "visible") return;
      window.addEventListener("wheel", takeOver, { passive: true });
      window.addEventListener("touchstart", takeOver, { passive: true });
      window.addEventListener("keydown", takeOver);
      glide = animate(window.scrollY, plan.top, {
        duration: plan.duration,
        ease: ease.inOut,
        onUpdate: (y) => window.scrollTo({ top: y, behavior: "instant" }),
        onComplete: () => {
          stopListening();
          glide = null;
        },
      });
    }, GLIDE_START_MS);

    // One callback starts the card and (when it can be seen) the row, so both clocks begin in the same frame.
    const startTimer = window.setTimeout(() => {
      started = true;
      if (cancelled) return;
      setCardGo(true);
      if (mode === "now") arm();
      else watchUntilSeen();
    }, CLIMB_START_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(planTimer);
      window.clearTimeout(startTimer);
      glide?.stop();
      observer?.disconnect();
      stopListening();
    };
  }, [active, to, boardRef, asideRef]);

  const row = useStepClock(places, active, rowGo);
  const card = useStepClock(places, active, cardGo);
  return {
    position: from - row.done,
    phase: row.phase,
    places,
    segmentS: row.segmentS,
    cardRank: from - card.done,
    cardLanded: card.phase === "landed",
  };
}

interface StepClock {
  /** Steps started (places climbed so far, counting the one under way). */
  readonly done: number;
  readonly phase: ClimbPhase;
  /** Length of the step under way, in seconds. */
  readonly segmentS: number;
}

/**
 * The climb's clock: once `go`, a lift, then one place per step on the eased schedule, driven by the frame clock (a slow
 * frame skips a place, it never stretches the climb). Inactive (no climb, reduced motion): the end state.
 */
function useStepClock(places: number, active: boolean, go: boolean): StepClock {
  const [state, setState] = useState<StepClock>({ done: 0, phase: "waiting", segmentS: 0.12 });
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active || !go) return;
    const bounds = climbSchedule(places);
    const end = bounds[places] ?? 0;
    let frame = 0;
    const tick = (now: number) => {
      startRef.current ??= now + LIFT_LEAD_MS;
      const elapsed = now - startRef.current;
      const done = stepsStarted(bounds, places, elapsed);
      const segmentS = ((bounds[Math.max(1, done)] ?? end) - (bounds[Math.max(1, done) - 1] ?? 0)) / 1000;
      const phase: ClimbPhase = elapsed >= end + CLIMB_SETTLE_MS ? "landed" : elapsed >= end ? "arrived" : "climbing";
      setState((prev) => (prev.done === done && prev.phase === phase && prev.segmentS === segmentS ? prev : { done, phase, segmentS }));
      if (phase !== "landed") frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, go, places]);
  return active ? state : { done: places, phase: "landed", segmentS: 0.12 };
}

/** The part of the window not covered by the shell's bars (the top bar, and the tab bar on a phone). */
function visibleBand(): { top: number; bottom: number } {
  return { top: cssLengthPx("--shell-top") + 12, bottom: window.innerHeight - cssLengthPx("--shell-bottom") - 12 };
}

/** A CSS length custom property set on <html> by the shell (rem, calc, env), measured in px. */
function cssLengthPx(name: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;inset-block-start:0;block-size:var(${name}, 0px)`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

/** My card's column sits beside the board and sticks: moving the window leaves the card in view. */
function cardStaysInView(aside: HTMLElement | null, board: HTMLElement): boolean {
  if (!aside) return false;
  const a = aside.getBoundingClientRect();
  const b = board.getBoundingClientRect();
  const beside = a.right <= b.left + 1 || a.left >= b.right - 1;
  return beside && getComputedStyle(aside).position === "sticky";
}

type GlidePlan = { kind: "visible" } | { kind: "watch" } | { kind: "glide"; top: number; duration: number };

/**
 * Where the stretch from the new place (the row drawn there now) to the user's row (still at its old place) stands.
 * Visible: climb in place. Below the fold with the card beside it and sticky: glide there (centred when it fits; when
 * it is taller than the window, the new place near the top, so the landing is seen), short enough to end as the climb
 * starts. Otherwise (one column, or rows that cannot be measured): never move the window; climb when the row is seen.
 */
function planGlide(board: HTMLElement | null, aside: HTMLElement | null, to: number): GlidePlan {
  const me = board?.querySelector<HTMLElement>("[data-me]");
  const first = board?.querySelector<HTMLElement>(`[data-pos="${to}"]`);
  if (!board || !me || !first) return { kind: "watch" };
  const rangeTop = first.getBoundingClientRect().top;
  const rangeBottom = me.getBoundingClientRect().bottom;
  const band = visibleBand();
  if (rangeTop >= band.top && rangeBottom <= band.bottom) return { kind: "visible" };
  if (!cardStaysInView(aside, board)) return { kind: "watch" };
  const fits = rangeBottom - rangeTop <= band.bottom - band.top;
  const delta = fits ? (rangeTop + rangeBottom) / 2 - (band.top + band.bottom) / 2 : rangeTop - band.top - 8;
  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const top = Math.max(0, Math.min(max, window.scrollY + delta));
  const distance = Math.abs(top - window.scrollY);
  if (distance < 8) return { kind: "visible" };
  return { kind: "glide", top, duration: Math.max(0.4, Math.min(0.6, 0.3 + distance / 2400)) };
}
