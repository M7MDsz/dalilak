"use client";
// Piece 1 (spec 3.1): the roadmap strip. Stages 6, 7, 8 of the «محلل بيانات» path and the goal, drawn in the map's own
// language (done: ink disc with a check; current: the accent disc; upcoming: a dashed ring; the goal: the flag, as the
// map draws it). Its moment: the «أنت هنا» marker travels from stage 6 to stage 7 while the walked leg draws in ink, and
// stage 7 lights up. Reading order is right to left, so stage 6 is at the right. Positions are SVG x (physical, as SVG
// is never mirrored), so the HTML pieces laid over the drawing use `left` on purpose.
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { IconFlag } from "@/components/icons";
import { Edge, HereMarker, useInstant, type EdgeState } from "@/components/motion";
import { cn } from "@/components/ui";
import { popIn, tween } from "@/lib/motion";

import { DEMO } from "../demo";
import { COL_W } from "../layout";
import { PIECE_COPY } from "../../copy";
import { PieceCard, usePlayed, useSteps, type PieceProps } from "../piece-frame";

const H = 92;
const NODE_Y = 48;
const LABEL_Y = 70;

type NodeLook = "done" | "current" | "upcoming";

function Node({ n, look, x }: { n: number; look: NodeLook; x: number }) {
  // the first paint is at rest; a change of look afterwards lands with a pop (a station turning done or current)
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  return (
    <span className="absolute" style={{ left: x, top: NODE_Y }}>
      <motion.span
        key={look}
        variants={popIn}
        initial={look === "upcoming" || first.current ? false : "hidden"}
        animate="show"
        className={cn(
          "absolute top-0 left-0 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-bold tabular-nums",
          look === "current" && "size-8 bg-accent text-[0.9375rem] text-on-accent",
          look === "done" && "size-7 bg-solid text-caption text-on-solid",
          look === "upcoming" && "size-7 border-[1.5px] border-dashed border-border-strong bg-surface text-caption text-fg-2",
        )}
      >
        <span dir="ltr">{n}</span>
        {look === "done" ? (
          // the check badge of a done station (as on the map)
          <span className="absolute -end-1 -top-1 grid size-3.5 place-items-center rounded-full bg-ok ring-2 ring-surface">
            <svg aria-hidden viewBox="0 0 10 10" className="size-2.5 fill-none stroke-surface" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.4 5.2 4.3 7l3.3-3.8" />
            </svg>
          </span>
        ) : null}
      </motion.span>
    </span>
  );
}

function Label({ x, strong, children }: { x: number; strong?: boolean; children: string }) {
  return (
    <span
      className={cn("absolute -translate-x-1/2 whitespace-nowrap text-small leading-6", strong ? "font-semibold text-fg" : "text-fg-2")}
      style={{ left: x, top: LABEL_Y }}
    >
      <bdi>{children}</bdi>
    </span>
  );
}

export function RoadmapStrip({ state, delay, compact = false }: PieceProps) {
  const instant = useInstant();
  const played = usePlayed(state);
  // step 0: the marker leaves stage 6 and the leg draws · step 1: it reaches stage 7, which lights up
  const step = useSteps(played, [delay * 1000, delay * 1000 + 900], instant);
  const spine = useRef<SVGPathElement>(null);

  const w = compact ? 296 : COL_W - 32;
  const [s6, s7, s8] = DEMO.strip;
  const x6 = w - 18;
  const x7 = w * 0.64;
  const x8 = w * 0.36;
  const xGoal = 22;
  const leg67: EdgeState = step < 0 ? "next" : step === 0 ? "drawing" : "done";

  return (
    <PieceCard compact={compact}>
      <div className="relative" style={{ width: w, height: H }}>
        <svg aria-hidden className="absolute inset-0 overflow-visible" width={w} height={H} viewBox={`0 0 ${w} ${H}`}>
          <Edge d={`M ${x8 - 19} ${NODE_Y} H ${xGoal + 20}`} state="locked" width={3} />
          <Edge d={`M ${x7 - 21} ${NODE_Y} H ${x8 + 19}`} state="locked" width={3} />
          <Edge d={`M ${x6 - 19} ${NODE_Y} H ${x7 + 21}`} state={leg67} width={3} />
          <path ref={spine} d={`M ${x6} ${NODE_Y} H ${x7}`} fill="none" stroke="none" />
        </svg>

        <Node n={s6.n} look={step < 0 ? "current" : "done"} x={x6} />
        <Node n={s7.n} look={step >= 1 ? "current" : "upcoming"} x={x7} />
        <Node n={s8.n} look="upcoming" x={x8} />
        <span className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center text-fg" style={{ left: xGoal, top: NODE_Y - 2 }}>
          <IconFlag size={30} waypoint="muted" />
        </span>

        {/* «أنت هنا» rides the walked leg: from stage 6 to stage 7 */}
        <HereMarker spine={spine} target={step >= 0 ? 1 : 0} hops={1.8} className="z-10">
          <span className="relative block size-0">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...tween.fast, delay: 0.05 }}
              className="absolute bottom-[1.375rem] left-0 flex -translate-x-1/2 flex-col items-center"
            >
              <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 text-caption font-semibold leading-6 text-accent-fg">{PIECE_COPY.here}</span>
              <span aria-hidden className="h-1.5 w-[1.5px] bg-accent-fg" />
            </motion.span>
          </span>
        </HereMarker>

        <Label x={x6}>{s6.name}</Label>
        <Label x={x7} strong={step >= 1}>
          {s7.name}
        </Label>
        <Label x={x8}>{s8.name}</Label>
        <Label x={xGoal} strong>
          {DEMO.job.title}
        </Label>
      </div>
    </PieceCard>
  );
}
