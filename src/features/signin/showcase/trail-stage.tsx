"use client";
// Owner: signin. The desktop showcase (spec 3.1, playbook 3.1, the Darb sign-in draft with the jury's notes): one trail
// climbs the dark stage from its bottom edge to the summit through six numbered waypoints. The «أنت هنا» dot rides the
// drawing head; when it reaches a waypoint, that piece (a real product component beside it, on its leader line) plays
// its one moment while the rest of the stage is still. After the sixth, the last leg reaches the summit, the flag is
// raised, the whole map rests, the stage dips and the story starts again.
// The composition is drawn in design units (layout.ts) and scaled as one piece to fit the stage, so it never reflows
// while it plays. Reduced motion and still frames: the finished map (every piece at its end state, the flag raised).
// Coordinates are the drawing's own (physical x, as SVG is never mirrored), so positioned layers use `left` on purpose.
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { Edge, HereDot, HereMarker, type EdgeState } from "@/components/motion";
import { cn, ContourBackdrop, Stage } from "@/components/ui";
import { popIn, spring, tween } from "@/lib/motion";

import { PIECE_COPY } from "../copy";
import { Caption } from "./caption";
import { DEMO } from "./demo";
import { BOX, CAPTION_H, LEG_END, LEG_PATHS, leaderPath, SLOTS, SPINE_PATH, SUMMIT, type Slot } from "./layout";
import { pieceState, useShowcaseLoop, type LoopState, type PieceState } from "./loop";
import { PIECES } from "./pieces";
import { TRAIL_DELAY, TRAIL_TIMING } from "./timing";

/** Below this scale the composition would set text under the 14 px floor: the stage shows the band instead. */
export const MIN_TRAIL_SCALE = 0.8;
const MAX_SCALE = 1.12;

export type Fit = { readonly w: number; readonly h: number; readonly s: number; readonly left: number; readonly top: number };

export function fitBox(w: number, h: number): Fit {
  const raw = Math.min(MAX_SCALE, w / BOX.w, h / BOX.h);
  // within a few percent of 1, draw at exactly 1: text stays on the pixel grid (1440 x 900 lands here)
  const s = raw > 0.97 && raw < 1.04 && w >= BOX.w * 0.97 && h >= BOX.h * 0.97 ? Math.min(1, raw) : raw;
  return { w, h, s, left: (w - BOX.w * s) / 2, top: (h - BOX.h * s) / 2 };
}

/** Where a point of the box lands on the contour texture (ContourBackdrop paints a 1600 x 1000 viewBox, sliced). */
function contourSummit(fit: Fit) {
  const k = Math.max(fit.w / 1600, fit.h / 1000);
  const x = fit.left + SUMMIT.x * fit.s;
  const y = fit.top + SUMMIT.y * fit.s;
  return { x: ((1600 - fit.w / k) / 2 + x / k) / 1600, y: ((1000 - fit.h / k) / 2 + y / k) / 1000 };
}

/** Measures the stage before the first paint and on every resize. */
export function useStageFit(): [RefObject<HTMLDivElement | null>, Fit | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setFit((prev) => (prev && Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5 ? prev : fitBox(r.width, r.height)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, fit];
}

export function TrailStage({ fit, className }: { fit: Fit; className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const loop = useShowcaseLoop(stageRef, TRAIL_TIMING);
  const summit = contourSummit(fit);
  return (
    <div ref={stageRef} className={cn("absolute inset-0", className)}>
      <Stage data-testid="signin-showcase" aria-hidden inert className="absolute inset-0 overflow-hidden">
        <ContourBackdrop intensity="present" summit={summit} rings={18} />
        <div
          data-testid="signin-showcase-piece"
          data-value={Math.min(loop.turn, SLOTS.length - 1) + 1}
          className="absolute"
          style={{ left: fit.left, top: fit.top, width: BOX.w, height: BOX.h, transform: `scale(${fit.s})`, transformOrigin: "0 0" }}
        >
          <motion.div
            key={loop.cycle}
            className="absolute inset-0"
            initial={loop.cycle === 0 ? false : { opacity: 0 }}
            animate={{ opacity: loop.dip ? 0 : 1 }}
            transition={loop.dip ? tween.exit : tween.enter}
          >
            <Composition loop={loop} />
          </motion.div>
        </div>
      </Stage>
    </div>
  );
}

function Composition({ loop }: { loop: LoopState }) {
  const spine = useRef<SVGPathElement>(null);
  const { turn, phase } = loop;
  const legState = (leg: number): EdgeState => {
    if (leg < turn) return "done";
    if (leg > turn || phase === "rest") return "locked";
    return phase === "travel" ? "drawing" : "done";
  };
  const markerAt = phase === "rest" && turn === 0 ? 0 : (LEG_END[turn] ?? 1);
  const summitLit = turn >= SLOTS.length && phase === "arrived";

  return (
    <>
      <svg aria-hidden className="absolute inset-0 overflow-visible" width={BOX.w} height={BOX.h} viewBox={`0 0 ${BOX.w} ${BOX.h}`}>
        {SLOTS.map((slot, i) => (
          <path
            key={`leader-${i}`}
            d={leaderPath(slot)}
            fill="none"
            strokeWidth={1.25}
            className={cn("transition-[stroke] duration-500", pieceState(i, loop) === "ahead" ? "stroke-border" : "stroke-border-strong")}
          />
        ))}
        {LEG_PATHS.map((d, i) => (
          <Edge key={`leg-${i}`} d={d} state={legState(i)} width={3.5} />
        ))}
        <path ref={spine} d={SPINE_PATH} fill="none" stroke="none" />
        {SLOTS.map((slot, i) => (
          <Waypoint key={`wp-${i}`} slot={slot} state={pieceState(i, loop)} />
        ))}
        <SummitFlag lit={summitLit} />
      </svg>

      {/* the «أنت هنا» dot rides the drawing head and rests on the waypoint it reached */}
      <HereMarker spine={spine} target={markerAt} hops={1.9} className="z-20 [--ring-cut:var(--bg)]">
        <motion.span className="block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...tween.fast, delay: 0.06 }}>
          <HereDot size={18} />
        </motion.span>
      </HereMarker>

      {SLOTS.map((slot, i) => {
        const Piece = PIECES[i];
        const state = pieceState(i, loop);
        return (
          <SlotView key={`slot-${i}`} slot={slot} index={i} state={state}>
            {Piece ? <Piece state={state} delay={TRAIL_DELAY} /> : null}
          </SlotView>
        );
      })}

      <SummitLabel lit={summitLit} />
    </>
  );
}

function SlotView({ slot, index, state, children }: { slot: Slot; index: number; state: PieceState; children: ReactNode }) {
  return (
    <motion.div
      className="absolute z-10"
      style={{ left: slot.card.x, top: slot.card.y - CAPTION_H, width: slot.card.w }}
      initial={false}
      animate={{ opacity: state === "ahead" ? 0.9 : 1 }}
      transition={tween.move}
    >
      <Caption index={index} live={state === "live"} className="mb-2 h-8" />
      {children}
    </motion.div>
  );
}

/** A waypoint on the trail: ahead (a dotted ring), current (a quiet accent ring round the «أنت هنا» dot), done (a check). */
function Waypoint({ slot, state }: { slot: Slot; state: PieceState }) {
  const { x, y } = slot.at;
  if (state === "done") {
    return (
      <motion.g
        variants={popIn}
        initial="hidden"
        animate="show"
        className="[transform-box:fill-box] origin-center"
      >
        <circle cx={x} cy={y} r={12} className="fill-fg" />
        <path d={`M ${x - 5} ${y + 0.5} l 3.4 3.4 l 6.6 -7`} fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="stroke-bg" />
      </motion.g>
    );
  }
  if (state === "live") {
    return (
      <motion.circle
        cx={x}
        cy={y}
        r={19}
        fill="none"
        strokeWidth={1.5}
        className="stroke-accent [transform-box:fill-box] origin-center"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ default: spring.pop, opacity: tween.fast }}
      />
    );
  }
  return <circle cx={x} cy={y} r={9.5} strokeWidth={2} strokeDasharray="2.6 3.4" className="fill-bg stroke-border-strong" />;
}

const POLE = 50;

/** The summit: the goal's flag (as the map draws it). Unlit, an outline; when the trail arrives the pole draws and the flag lands. */
function SummitFlag({ lit }: { lit: boolean }) {
  const { x, y } = SUMMIT;
  // the brand's goal flag (IconFlag): a banner with a notch at its free end, flying forward (to the left, in Arabic)
  const top = y - POLE;
  const flag = `M ${x} ${top} H ${x - 34} L ${x - 26} ${top + 10.5} L ${x - 34} ${top + 21} H ${x} Z`;
  return (
    <g>
      <path d={`M ${x} ${y} V ${y - POLE}`} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="0.01 6" className="stroke-border-strong" />
      <path d={flag} fill="none" strokeWidth={1.75} strokeDasharray="3 3.5" strokeLinejoin="round" className="stroke-border-strong" />
      {lit ? (
        <>
          <motion.path
            d={`M ${x} ${y} V ${y - POLE}`}
            strokeWidth={2.75}
            strokeLinecap="round"
            className="stroke-fg"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.path
            d={flag}
            strokeWidth={1.75}
            strokeLinejoin="round"
            className="fill-accent stroke-accent"
            style={{ transformBox: "view-box", transformOrigin: `${x}px ${top + 10.5}px` }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ default: { ...spring.cheer, delay: 0.3 }, opacity: { ...tween.fast, delay: 0.3 } }}
          />
        </>
      ) : null}
      <circle cx={x} cy={y} r={6} className={cn("transition-[fill] duration-300", lit ? "fill-fg" : "fill-border-strong")} />
    </g>
  );
}

function SummitLabel({ lit }: { lit: boolean }) {
  return (
    <div className="absolute z-10 text-end" style={{ left: SUMMIT.x + 24, top: SUMMIT.y - POLE - 6 }}>
      <p className={cn("text-h3 whitespace-nowrap transition-colors duration-500", lit ? "text-fg" : "text-fg-2")}>{PIECE_COPY.goal}</p>
      <p className="text-small whitespace-nowrap text-fg-2">{DEMO.job.title}</p>
    </div>
  );
}
