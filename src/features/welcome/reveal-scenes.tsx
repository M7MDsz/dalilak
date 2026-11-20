"use client";
// Owner: welcome. The scenes of the path reveal's first four steps (spec 4.7; playbook 3.3). Every scene shows the user's
// real data: their six answers, real jobs of the catalogue (the ones the answers point at stay stronger), the real skills
// in their fields, and the three jobs that were really chosen. Layers live across steps where the story continues (the
// answers stay while the jobs pass; the grid of tiles becomes three); only the status line rolls.
//   answers-gather   the six answers lift off where they sat in «ملفك يتكوّن» and gather round «دليلك»'s compass
//   jobs-sweep       a few rows of job tiles (a sample of the catalogue) pass under the answers; mid-pass the ones that
//                    do not fit drop back
//   skills-map       the skill landscape: one hill per field, one dot per skill; the fields light in turn and the ones
//                    the answers point at stay lit
//   narrow-to-three  a grid of tiles, then all but three leave and the three glide into one row, the recommended one in
//                    the middle (in step 5 it travels onto the trophy: path-sheet.tsx finds it by [data-reveal-target-tile])
// Every scene fits inside the stage (between the top bar and the status line) on a desktop and on a phone.
import { AnimatePresence, animate, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { DaleelGlyph } from "@/components/chat";
import {
  IconFieldBusiness,
  IconFieldCyberCloud,
  IconFieldData,
  IconFieldDesign,
  IconFieldHr,
  IconFieldMarketing,
  IconFieldProduct,
  IconFieldProfessional,
  IconFieldSalesSupply,
  WAVE2_FIELD_ICONS,
  IconFieldSoftware,
} from "@/components/icons";
import type { IconProps } from "@/components/icons/icon-base";
import { SweepRows, useInstant } from "@/components/motion";
import { cn } from "@/components/ui";
import { ease, spring, tween } from "@/lib/motion";
import type { FieldId, JobId, QuestionId } from "@/lib/types";

import type { AnswerRects } from "./conversation";
import { sampleTiles, type RevealData } from "./reveal-data";


// ------------------------------------------------------------------------------------------------ 1. answers-gather

export function AnswerCluster({ answers, rects, compact, phone }: { answers: RevealData["answers"]; rects: AnswerRects | null; compact: boolean; phone: boolean }) {
  const instant = useInstant();
  const refs = useRef(new Map<QuestionId, HTMLSpanElement>());
  const travels = !instant && rects !== null && Object.keys(rects).length > 0;

  // FLIP: each answer starts where it sat in «ملفك يتكوّن» (measured when the conversation ended) and travels here.
  // 21 Nov 2026 (owner: "buggy and not visible"): the travel never showed. The rest place was measured with the
  // transform a first run had already put on the pill (Strict Mode runs this effect twice; a stopped animation leaves
  // its transform behind), so every answer "travelled" zero pixels and only faded in, in the middle of an empty screen.
  // Now the transform is cleared before measuring, and each answer starts fully visible ON its slot (it is the same
  // word the reader just saw there), then lifts off and travels to the cluster while the night falls around it.
  useLayoutEffect(() => {
    if (!travels || !rects) return;
    // one travel at walking pace (800 ms, eased in and out), 60 ms apart, so the eye follows each answer; the last one
    // lands about 1.15 s in, and answers-gather (1.4 s) holds the gathered row for a beat before the jobs pass
    const controls = answers.flatMap((a, i) => {
      const el = refs.current.get(a.question);
      const from = rects[a.question];
      if (!el) return [];
      el.style.transform = "";
      const to = el.getBoundingClientRect();
      if (!from || to.width === 0) return [animate(el, { opacity: [0, 1], scale: [0.8, 1] }, { ...spring.pop, delay: 0.3 + i * 0.06 })];
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      // start at the size the word had on its slot: the pill's text line is about 60 % of its height, and the pill is
      // never wider than the slot (a phone's slots sit side by side in one narrow row: wider pills overlapped there)
      const s = Math.max(0.4, Math.min(1, from.height / (to.height * 0.6), from.width / to.width));
      const delay = 0.06 + i * 0.06;
      // on its slot from this very frame (the animation's first frame would come one frame late)
      el.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${s})`;
      el.style.opacity = "1";
      return [animate(el, { x: [dx, 0], y: [dy, 0], scale: [s, 1] }, { duration: 0.8, ease: ease.inOut, delay })];
    });
    return () => controls.forEach((c) => c.stop());
  }, [travels, rects, answers]);

  return (
    <motion.div
      animate={compact ? { y: phone ? -190 : -176, scale: 0.84 } : { y: 0, scale: 1 }}
      className="flex flex-col items-center gap-6"
      initial={false}
      transition={spring.gentle}
    >
      <motion.span animate={{ opacity: 1, scale: 1 }} initial={instant ? false : { opacity: 0, scale: 0.8 }} transition={{ ...spring.pop, delay: 0.1 }}>
        <DaleelGlyph framed size={phone ? 48 : 64} state="working" />
      </motion.span>
      <div className={cn("flex flex-wrap justify-center", phone ? "max-w-[22rem] gap-2.5" : "max-w-[44rem] gap-3")}>
        {answers.map((a, i) => (
          <motion.span
            animate={travels ? undefined : { opacity: 1, scale: 1 }}
            className={cn(
              "inline-flex items-center rounded-full bg-solid font-medium whitespace-nowrap text-on-solid",
              phone ? "h-10 px-4 text-body" : "h-12 px-5 text-title",
            )}
            initial={travels ? false : { opacity: 0, scale: 0.8 }}
            key={a.question}
            ref={(el) => {
              if (el) refs.current.set(a.question, el);
              else refs.current.delete(a.question);
            }}
            style={travels ? { opacity: 0 } : undefined}
            transition={{ ...spring.pop, delay: 0.15 + i * 0.06 }}
          >
            <span className="sr-only">{a.slot}: </span>
            {a.text}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ 2. jobs-sweep

/** The sweep's rows: three on a desktop, four narrower ones on a phone; each row is wider than the screen so it passes. */
const SWEEP = { desktop: { rows: 3, perRow: 9 }, phone: { rows: 4, perRow: 5 } } as const;

/**
 * jobs-sweep: a few rows of job tiles pass once under the gathered answers (which have moved up out of their way); mid-pass
 * the ones that do not fit drop back. 21 Nov 2026: a sample of the catalogue (sampleTiles), not all 84: drawn whole
 * they filled the screen in twelve rows and ran under the answers, the logo and the status line. The rows bleed to the
 * screen's edges (the stage's gutters would cut them in mid-air) and fade in as they start moving.
 */
export function JobSweep({ tiles, chosen, phone }: { tiles: RevealData["tiles"]; chosen: readonly JobId[]; phone: boolean }) {
  const { rows: rowCount, perRow } = phone ? SWEEP.phone : SWEEP.desktop;
  const sample = sampleTiles(tiles, chosen, rowCount * perRow);
  const rows: (typeof tiles)[number][][] = [];
  sample.forEach((tile, i) => {
    const r = Math.floor(i / perRow);
    (rows[r] ??= []).push(tile);
  });
  return (
    <div className={cn("w-screen max-w-none shrink-0", phone ? "translate-y-12" : "translate-y-14")}>
      <SweepRows distance={phone ? 160 : 240} duration={1.4} rows={rows} sortDelay={0.5} />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 3. skills-map

const FIELD_ICON: Record<FieldId, (props: IconProps) => React.ReactNode> = {
  data: IconFieldData,
  software: IconFieldSoftware,
  design: IconFieldDesign,
  marketing: IconFieldMarketing,
  business: IconFieldBusiness,
  hr: IconFieldHr,
  product: IconFieldProduct,
  "cyber-cloud": IconFieldCyberCloud,
  "sales-supply": IconFieldSalesSupply,
  ...WAVE2_FIELD_ICONS,
  professional: IconFieldProfessional,
};

export function FieldIcon({ field, size = 20, className }: { field: FieldId; size?: number; className?: string }) {
  const Icon = FIELD_ICON[field];
  return <Icon className={className} size={size} waypoint="muted" />;
}

const PASS_S = 1.2; // the whole lighting pass (step 3 is 1.4 s)

/** A closed, gently irregular ring (a contour line of a small hill), deterministic per field. */
function islandRing(cx: number, cy: number, rx: number, ry: number, seed: number): string {
  const n = 28;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 1 + 0.07 * Math.sin(3 * t + seed) + 0.04 * Math.sin(5 * t + seed * 1.7);
    const x = cx + Math.cos(t) * rx * r;
    const y = cy + Math.sin(t) * ry * r;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

/**
 * skills-map: the skill landscape. One small hill per field, each drawn as three contour rings with one dot per skill on
 * its middle ring. The fields light in turn as their rings are drawn; the ones the answers point at stay lit, the others
 * settle back. 21 Nov 2026: sized for the whole catalogue (about twenty fields, not seven): seven hills a row on a
 * desktop, five on a phone, so the landscape fits inside the stage (on a phone it ran under the logo and the status
 * line); the desktop's up-and-down step is gone (with three rows it read as a jumble, not a range).
 */
export function SkillLandscape({ fields, phone }: { fields: RevealData["fields"]; phone: boolean }) {
  const instant = useInstant();
  const n = fields.length;
  const W = phone ? 56 : 120;
  const H = phone ? 42 : 80;
  return (
    <div className={cn("flex w-full flex-wrap items-start justify-center", phone ? "max-w-[22rem] gap-x-1.5 gap-y-3" : "max-w-[64rem] gap-x-4 gap-y-5")}>
      {fields.map((field, k) => {
        const start = 0.1 + (k / n) * (PASS_S - 0.4);
        const rest = field.lit ? 1 : 0.46;
        const cx = W / 2;
        const cy = H / 2;
        const rings = [1, 0.72, 0.44];
        const dotRing = 0.72;
        const dots = Array.from({ length: field.skills }, (_, i) => {
          const t = -Math.PI / 2 + ((i + 0.5) / field.skills) * Math.PI * 2;
          const r = 1 + 0.07 * Math.sin(3 * t + k) + 0.04 * Math.sin(5 * t + k * 1.7);
          return { x: cx + Math.cos(t) * W * 0.46 * dotRing * r, y: cy + Math.sin(t) * H * 0.42 * dotRing * r };
        });
        return (
          <motion.div
            animate={{ opacity: instant ? rest : [0.5, 0.5, 1, 1, rest] }}
            className="flex flex-col items-center gap-2 text-center"
            data-lit={field.lit ? "" : undefined}
            initial={false}
            key={field.id}
            transition={{ duration: PASS_S, times: [0, start / PASS_S, (start + 0.18) / PASS_S, (start + 0.34) / PASS_S, 1], ease: "easeOut" }}
          >
            <span className="relative block" style={{ width: W, height: H }}>
              <svg aria-hidden className="absolute inset-0 overflow-visible" fill="none" height={H} width={W}>
                {rings.map((scale, ring) => (
                  <motion.path
                    animate={{ pathLength: 1, opacity: 1 }}
                    className={field.lit ? "stroke-fg" : "stroke-fg-3"}
                    d={islandRing(cx, cy, W * 0.46 * scale, H * 0.42 * scale, k * 1.3 + ring * 0.4)}
                    initial={instant ? false : { pathLength: 0, opacity: 0 }}
                    key={ring}
                    strokeLinecap="round"
                    strokeWidth={ring === 0 ? 1.25 : 1.5}
                    transition={{ pathLength: { duration: 0.55, ease: ease.inOut, delay: start + ring * 0.07 }, opacity: { duration: 0.01, delay: start + ring * 0.07 } }}
                  />
                ))}
                {dots.map((dot, i) => (
                  <motion.circle
                    animate={{ scale: 1, opacity: 1 }}
                    className="fill-fg"
                    cx={dot.x}
                    cy={dot.y}
                    initial={instant ? false : { scale: 0, opacity: 0 }}
                    key={i}
                    r={phone ? 2.25 : 3.25}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    transition={{ default: spring.pop, opacity: tween.fast, delay: start + 0.22 + i * 0.03 }}
                  />
                ))}
              </svg>
              <span className="absolute inset-0 grid place-items-center text-fg">
                <FieldIcon field={field.id} size={phone ? 14 : 20} />
              </span>
            </span>
            <span className={cn("font-medium text-fg [text-wrap:balance]", phone ? "w-[3.75rem] text-caption leading-4" : "w-32 text-small")}>{field.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 4. narrow-to-three

/** The narrowing's grid (21 Nov 2026: a sample that fits the stage; the whole catalogue ran off its top and bottom). */
const NARROW_TILES = { desktop: 20, phone: 10 } as const;

export function NarrowToThree({ tiles: all, three, recommended, phone }: { tiles: RevealData["tiles"]; three: readonly [JobId, JobId, JobId]; recommended: JobId; phone: boolean }) {
  const instant = useInstant();
  const tiles = sampleTiles(all, three, phone ? NARROW_TILES.phone : NARROW_TILES.desktop);
  const [narrowed, setNarrowed] = useState(instant);
  useEffect(() => {
    if (instant) return;
    const timer = window.setTimeout(() => setNarrowed(true), 420);
    return () => window.clearTimeout(timer);
  }, [instant]);
  const chosen = new Set<JobId>(three);
  const shown = narrowed ? three.map((id) => tiles.find((t) => t.id === id)).filter((t): t is (typeof tiles)[number] => Boolean(t)) : tiles;

  return (
    <div
        className={cn(
          narrowed ? cn("flex items-center justify-center", phone ? "flex-col gap-3" : "gap-4") : cn("grid gap-2", phone ? "w-full max-w-[22rem] grid-cols-2" : "w-full max-w-[58rem] grid-cols-5"),
        )}
      >
        <AnimatePresence mode="popLayout">
          {shown.map((tile) => {
            const isRec = tile.id === recommended;
            const big = narrowed;
            return (
              <motion.div
                animate={{ opacity: tile.fits || chosen.has(tile.id) ? 1 : 0.35, scale: 1 }}
                className={cn(
                  "min-w-0 overflow-hidden rounded-control border",
                  big ? (phone ? "px-4 py-3" : "px-6 py-4") : "px-3 py-2",
                  big && isRec ? "border-border-strong bg-surface text-fg" : "border-border bg-surface text-fg",
                )}
                data-surface={big && isRec ? "paper" : undefined}
                exit={{ opacity: 0, scale: 0.9, transition: tween.exit }}
                initial={false}
                key={tile.id}
                layout
                data-reveal-target-tile={big && isRec ? "" : undefined}
                style={{ borderRadius: 12 }}
                transition={{ layout: spring.gentle, opacity: { duration: 0.3, ease: ease.out } }}
              >
                <motion.span className={cn("block truncate font-medium", big ? (isRec ? (phone ? "text-h3 font-bold" : "text-h2 font-bold") : phone ? "text-title" : "text-h3") : "text-[14px] leading-6")} layout="position">
                  {tile.title}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>
    </div>
  );
}
