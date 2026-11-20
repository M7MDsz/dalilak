"use client";
// Meters of the game layer, all built on one segmented bar that fills in counted steps (the "draw" verb: progress).
// - Segments: the bar itself (ink for skills and lessons, brass for XP).
// - UnlockMeter: a job's five requirements as five segments, each filled by stars held ÷ stars required (spec 7.2), and the
//   lock at the end that opens at 100%. The meter IS the match formula, so the number can be explained to the last point (P4).
// - LessonMeter, CollectionMeter: lessons ticked; skills collected out of all of them.
import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { IconLock, IconUnlock } from "@/components/icons";
import { Roll, useInstant } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { SkillStars } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { ease } from "@/lib/motion";

import { requirementFill } from "./state";

const HEIGHT = { xs: "h-2", sm: "h-2.5", md: "h-3", lg: "h-3.5" } as const;
const STEP = 0.07; // seconds between two segments filling one after another
const FILL = 0.18; // one segment's fill

export interface SegmentsProps {
  /** One number 0..1 per segment. */
  readonly fills: readonly number[];
  /** ink: skills, lessons, collection · xp: XP (brass) */
  readonly tone?: "ink" | "xp";
  readonly height?: keyof typeof HEIGHT;
  /** Gap between segments in px (default 4; 2 for a dense strip). */
  readonly gap?: number;
  /** ticks: a dense strip (a collection of 38): no outline, empty ticks in the track tone, filled ticks in ink. */
  readonly variant?: "boxed" | "ticks";
  /** Seconds before the first segment fills (to follow its cause). */
  readonly delay?: number;
  readonly className?: string;
  readonly label?: string;
}

/**
 * The segmented bar. When a fill grows, the segments that grew fill one after another from the inline-start (counted
 * steps, 70 ms apart), never all at once; a fill that shrinks (a fresh level sheet) cuts at once, it never un-draws.
 */
export function Segments({ fills, tone = "ink", height = "md", gap = 4, variant = "boxed", delay = 0, className, label }: SegmentsProps) {
  const instant = useInstant();
  const previous = useRef<readonly number[]>(fills);
  let order = 0;
  const delays = fills.map((f, i) => (f > (previous.current[i] ?? 0) + 0.001 ? delay + order++ * STEP : 0));
  useEffect(() => {
    previous.current = fills;
  });
  return (
    <span
      aria-label={label}
      className={cn("grid w-full", className)}
      role={label ? "img" : undefined}
      style={{ gridTemplateColumns: `repeat(${fills.length}, minmax(0, 1fr))`, gap }}
    >
      {fills.map((f, i) => {
        const grew = delays[i]! > 0 || f > (previous.current[i] ?? 0) + 0.001;
        return (
          <span
            className={cn(
              "relative overflow-hidden",
              variant === "ticks"
                ? "rounded-[1px] bg-track"
                : cn("rounded-[0.1875rem] border-[1.5px] bg-surface", tone === "xp" ? "border-xp-line stage:bg-transparent" : "border-fg stage:border-on-stage-3"),
              HEIGHT[height],
            )}
            key={i}
          >
            <motion.span
              animate={{ scaleX: f }}
              className={cn("absolute inset-0 rtl:origin-right ltr:origin-left", tone === "xp" ? "bg-xp" : "bg-fg")}
              initial={false}
              transition={instant || !grew ? { duration: 0 } : { duration: FILL, delay: delays[i], ease: ease.out }}
            />
          </span>
        );
      })}
    </span>
  );
}

export interface Requirement {
  readonly name: string;
  readonly have: number;
  readonly need: number;
}

export interface UnlockMeterProps {
  /** The job's requirements, in the job's order (five in the data). */
  readonly skills: readonly Requirement[];
  /** The match the product shows (P5: the same number as the ring). Opens the lock at 100. */
  readonly value: number;
  /** Write each skill under its segment, with its stars (the job page, a featured card). Off in list cards. */
  readonly labels?: boolean;
  /** The line under the meter. Default «تستوفي 3 من 5 متطلبات» / «تستوفي المتطلبات كلها». `null` hides it. */
  readonly caption?: ReactNode | null;
  readonly size?: "sm" | "md";
  readonly delay?: number;
  readonly className?: string;
  readonly testId?: string;
}

/** «تستوفي 3 من 5 متطلبات». */
export function requirementsCaption(skills: readonly Requirement[]): string {
  const met = skills.filter((s) => s.have >= s.need).length;
  if (met === skills.length) return "تستوفي المتطلبات كلها";
  return `تستوفي ${formatNumber(met)} من ${formatNumber(skills.length)} متطلبات`;
}

/** The lock at the end of the meter: closed under 100%, open (and in the success colour) at 100%. */
function Lock({ open, size }: { open: boolean; size: "sm" | "md" }) {
  const px = size === "sm" ? 16 : 18;
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full border-2 transition-colors duration-200",
        size === "sm" ? "size-8" : "size-9",
        open ? "border-current bg-surface text-ok-fg" : "border-fg bg-surface text-fg stage:border-on-stage-3",
      )}
      data-state={open ? "open" : "closed"}
    >
      <Roll id={open ? "open" : "closed"}>{open ? <IconUnlock size={px} waypoint="off" /> : <IconLock size={px} waypoint="off" />}</Roll>
    </span>
  );
}

/**
 * UnlockMeter. `<UnlockMeter value={70} skills={[{ name: "Excel", have: 2, need: 2 }, …]} />`. The segment of a skill held
 * at 1 of 2 stars is half full, exactly its 10 points of 20.
 */
export function UnlockMeter({ skills, value, labels = false, caption, size = "sm", delay = 0, className, testId }: UnlockMeterProps) {
  const fills = skills.map((s) => requirementFill(s.have, s.need));
  const line = caption === undefined ? requirementsCaption(skills) : caption;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)} data-testid={testId} data-value={value}>
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={cn("flex items-center", size === "sm" ? "h-8" : "h-9")}>
            <Segments delay={delay} fills={fills} height={size === "sm" ? "md" : "lg"} label={`المطابقة ${formatNumber(value)}%`} />
          </span>
          {labels ? (
            <span className="hidden w-full gap-1 sm:grid" style={{ gridTemplateColumns: `repeat(${skills.length}, minmax(0, 1fr))` }}>
              {skills.map((s) => {
                const latin = /^[\x20-\x7e]+$/.test(s.name);
                return (
                  <span className="flex min-w-0 flex-col items-start gap-0.5" key={s.name}>
                    <span className={cn("w-full truncate text-small font-semibold", s.have >= s.need ? "text-fg" : "text-fg-2")}>
                      {latin ? <bdi dir="ltr">{s.name}</bdi> : s.name}
                    </span>
                    <SkillStars size="sm" slots={Math.min(3, Math.max(1, s.need)) as 1 | 2 | 3} value={Math.min(s.have, s.need)} />
                  </span>
                );
              })}
            </span>
          ) : null}
        </div>
        <Lock open={value >= 100} size={size} />
      </div>
      {line ? <p className="text-small text-fg-2">{line}</p> : null}
    </div>
  );
}

/** LessonMeter: «2 من 5 دروس» on a bar of one segment per lesson. */
export function LessonMeter({ done, total, className, testId }: { readonly done: number; readonly total: number; readonly className?: string; readonly testId?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} data-testid={testId} data-value={done}>
      <Segments className="max-w-56 flex-1" fills={Array.from({ length: total }, (_, i) => (i < done ? 1 : 0))} height="sm" label={`${done} من ${total}`} />
      <span className="shrink-0 text-small font-medium text-fg-2 tabular-nums">
        {formatNumber(done)} من {formatNumber(total)} دروس
      </span>
    </div>
  );
}

/** CollectionMeter: skills collected out of all of them («مجموعتك: 8 من 38 مهارة»), one tick per skill. */
export function CollectionMeter({ have, total, label = "مجموعتك", unit = "مهارة", className }: { readonly have: number; readonly total: number; readonly label?: ReactNode; readonly unit?: string; readonly className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)} data-value={have}>
      <p className="flex items-baseline gap-2 text-small text-fg-2">
        <span className="font-semibold text-fg">{label}</span>
        <span className="tabular-nums">
          <span className="text-title font-bold text-fg">{formatNumber(have)}</span> من {formatNumber(total)} {unit}
        </span>
      </p>
      <Segments fills={Array.from({ length: total }, (_, i) => (i < have ? 1 : 0))} gap={2} height="md" variant="ticks" />
    </div>
  );
}
