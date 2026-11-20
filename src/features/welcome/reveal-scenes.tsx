"use client";
// Owner: welcome. The scenes of the path reveal's first four steps (spec 4.7; playbook 3.3). Every scene shows the user's
// real data: their six answers, the real twenty jobs (the ones the answers point at stay stronger), the real 38 skills in
// 7 fields, and the three jobs that were really chosen. Layers live across steps where the story continues (the answers
// stay while the jobs pass; the twenty tiles become three); only the status line rolls.
//   answers-gather   the six answers travel from where they sat in «ملفك يتكوّن» and gather round «دليلك»'s compass
//   jobs-sweep       twenty job tiles pass in rows under the answers; mid-pass the ones that do not fit drop back
//   skills-map       the skill landscape: seven fields, one dot per skill; the fields light in turn and the ones the
//                    answers point at stay lit
//   narrow-to-three  the twenty, then seventeen leave and three glide into one row; the recommended one in the middle
//                    (in step 5 it travels onto the trophy: path-sheet.tsx finds it by [data-reveal-target-tile])
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
  IconFieldSoftware,
} from "@/components/icons";
import type { IconProps } from "@/components/icons/icon-base";
import { SweepRows, useInstant } from "@/components/motion";
import { cn } from "@/components/ui";
import { ease, spring, tween } from "@/lib/motion";
import type { FieldId, JobId, QuestionId } from "@/lib/types";

import type { AnswerRects } from "./conversation";
import type { RevealData } from "./reveal-data";


// ------------------------------------------------------------------------------------------------ 1. answers-gather

export function AnswerCluster({ answers, rects, compact, phone }: { answers: RevealData["answers"]; rects: AnswerRects | null; compact: boolean; phone: boolean }) {
  const instant = useInstant();
  const refs = useRef(new Map<QuestionId, HTMLSpanElement>());
  const travels = !instant && rects !== null && Object.keys(rects).length > 0;

  // FLIP: each answer starts where it sat in «ملفك يتكوّن» (measured when the conversation ended) and travels here
  useLayoutEffect(() => {
    if (!travels || !rects) return;
    // one travel at walking pace (the draw tempo: 900 ms, eased in and out), 50 ms apart, so the eye follows each answer
    const controls = answers.flatMap((a, i) => {
      const el = refs.current.get(a.question);
      const from = rects[a.question];
      if (!el) return [];
      const to = el.getBoundingClientRect();
      if (!from) return [animate(el, { opacity: [0, 1], scale: [0.8, 1] }, { ...spring.pop, delay: 0.3 + i * 0.05 })];
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const s = Math.max(0.55, Math.min(1, from.height / to.height));
      const delay = 0.04 + i * 0.05;
      return [
        animate(el, { x: [dx, 0], y: [dy, 0], scale: [s, 1] }, { ...tween.draw, delay }),
        animate(el, { opacity: [0, 1] }, { duration: 0.32, ease: ease.out, delay }),
      ];
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

export function JobSweep({ tiles, phone }: { tiles: RevealData["tiles"]; phone: boolean }) {
  const perRow = phone ? 5 : 7;
  const rows: (typeof tiles)[number][][] = [];
  tiles.forEach((tile, i) => {
    const r = Math.floor(i / perRow);
    (rows[r] ??= []).push(tile);
  });
  return (
    <div className="w-full translate-y-16">
      <SweepRows distance={phone ? 180 : 260} duration={1.5} rows={rows} sortDelay={0.55} />
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
  professional: IconFieldProfessional,
};

export function FieldIcon({ field, size = 20, className }: { field: FieldId; size?: number; className?: string }) {
  const Icon = FIELD_ICON[field];
  return <Icon className={className} size={size} waypoint="muted" />;
}

const PASS_S = 1.25; // the whole lighting pass (step 3 is 1.5 s)

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
 * skills-map: the skill landscape. Seven small hills (one per field), each drawn as three contour rings with one dot per
 * skill on its middle ring (7, 6, 5, 5, 5, 5, 5 = 38). The fields light in turn as their rings are drawn; the ones the
 * answers point at stay lit, the others settle back. On a desktop the hills step up and down like a range.
 */
export function SkillLandscape({ fields, phone }: { fields: RevealData["fields"]; phone: boolean }) {
  const instant = useInstant();
  const n = fields.length;
  const W = phone ? 80 : 132;
  const H = phone ? 60 : 92;
  return (
    <div className={cn("flex w-full flex-wrap items-start justify-center", phone ? "max-w-[22rem] gap-x-2 gap-y-6" : "max-w-[64rem] gap-x-4")}>
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
            style={{ marginTop: !phone && k % 2 === 1 ? 44 : 0 }}
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
                    r={phone ? 2.75 : 3.5}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    transition={{ default: spring.pop, opacity: tween.fast, delay: start + 0.22 + i * 0.03 }}
                  />
                ))}
              </svg>
              <span className="absolute inset-0 grid place-items-center text-fg">
                <FieldIcon field={field.id} size={phone ? 16 : 22} />
              </span>
            </span>
            <span className={cn("font-medium text-fg [text-wrap:balance]", phone ? "w-20 text-caption" : "w-32 text-small")}>{field.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 4. narrow-to-three

export function NarrowToThree({ tiles, three, recommended, phone }: { tiles: RevealData["tiles"]; three: readonly [JobId, JobId, JobId]; recommended: JobId; phone: boolean }) {
  const instant = useInstant();
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
