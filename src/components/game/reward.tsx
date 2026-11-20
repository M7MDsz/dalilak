"use client";
// RewardChip: the real rewards of spec 8 made visible where they are earned (a course's XP and star, the +40 XP for applying
// at 60% or more, the daily reward). Brass only for XP and rewards; stars stay ink; nothing here is pressable, so it is flat.
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { IconBadge, IconCheck, IconLock, IconStarFilled, IconTarget } from "@/components/icons";
import { cn } from "@/components/ui/cn";
import { XpGlyph } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { spring, tween } from "@/lib/motion";

export type RewardKind = "xp" | "star" | "match" | "badge";
/** offer: to be earned · earned: already yours (a check) · locked: not available yet (dashed, with the lock and the condition) */
export type RewardStatus = "offer" | "earned" | "locked";

export interface RewardChipProps {
  readonly kind?: RewardKind;
  /** xp: the amount (200) · match: the gain in points (20) · star: the star number (1). Unused for badge. */
  readonly value?: number;
  /** Words after the value: star «في Power BI», match «مطابقة», xp «عند التقديم», badge the badge's name. */
  readonly label?: ReactNode;
  readonly status?: RewardStatus;
  /** sm 28 px (rows) · md 32 px (cards) · lg 40 px (a featured reward, the celebration) */
  readonly size?: "sm" | "md" | "lg";
  /** Pops (spring.pop) on mount and whenever `status` changes: the reward lands. Use it only when it has a cause. */
  readonly land?: boolean;
  readonly delay?: number;
  readonly className?: string;
  readonly testId?: string;
}

const BOX = {
  sm: "h-7 gap-1 px-2.5 text-small",
  md: "h-8 gap-1.5 px-3 text-small",
  lg: "h-10 gap-2 px-4 text-title",
} as const;
const ICON = { sm: 16, md: 17, lg: 21 } as const;

// A Latin run in a string label («من 60% مطابقة», «في Power BI») is isolated LTR (DESIGN 2.3): right after an Arabic word the
// bidi rules turn the digits into Arabic numbers and draw the sign on the wrong side («%60»). A node label is the caller's to
// isolate. Same run shape as the chat kit's: starts with a letter, a digit or + before a digit; ends with a letter, a digit or %.
const LATIN_RUN = /\+?[A-Za-z0-9](?:[A-Za-z0-9.,%+#_-]*[A-Za-z0-9%+#])?(?:\s+[A-Za-z0-9](?:[A-Za-z0-9.,%+#_-]*[A-Za-z0-9%+#])?)*/g;

function isolateLatin(label: ReactNode): ReactNode {
  if (typeof label !== "string") return label;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const run of label.matchAll(LATIN_RUN)) {
    const at = run.index ?? 0;
    if (at > last) parts.push(label.slice(last, at));
    parts.push(
      <bdi dir="ltr" key={at}>
        {run[0]}
      </bdi>,
    );
    last = at + run[0].length;
  }
  if (parts.length === 0) return label;
  if (last < label.length) parts.push(label.slice(last));
  return parts;
}

function tone(kind: RewardKind, status: RewardStatus): string {
  if (status === "locked") return "border-dashed border-border-strong bg-transparent text-fg-2";
  if (kind === "xp") {
    // offer: a brass coin chip with ink type (ink on brass ~8:1); earned: the brass outline, XP-coloured numerals
    return status === "earned" ? "border-xp-line bg-transparent text-xp-fg" : "border-xp-line bg-xp text-ink";
  }
  if (kind === "badge") return status === "earned" ? "border-xp-line bg-transparent text-fg" : "border-xp-line bg-surface text-fg";
  // star and match are ink: a star earned is filled ink (stars are never brass)
  if (kind === "star" && status === "earned") return "border-[color:var(--solid)] bg-solid text-on-solid";
  return "border-fg bg-surface text-fg stage:border-on-stage-3";
}

/**
 * RewardChip. `<RewardChip value={200} />` → «+200 XP» on a brass chip. `<RewardChip kind="star" value={1} label={<>في <bdi>Power BI</bdi></>} />`
 * → «★ النجمة 1 في Power BI». `<RewardChip value={40} label="عند التقديم" status="locked" />` → dashed, with the lock.
 * A Latin run in a string label is isolated for you («من 60% مطابقة» reads «60%»); in a node label wrap it in `<bdi dir="ltr">`.
 */
export function RewardChip({ kind = "xp", value = 0, label, status = "offer", size = "md", land = false, delay = 0, className, testId }: RewardChipProps) {
  const px = ICON[size];
  let mark: ReactNode;
  if (status === "locked") mark = <IconLock size={px} waypoint="off" />;
  else if (status === "earned" && kind !== "star") mark = <IconCheck size={px} waypoint="off" />;
  else if (kind === "xp") mark = <XpGlyph size={px + 2} />;
  else if (kind === "star") mark = <IconStarFilled size={px} waypoint="off" />;
  else if (kind === "match") mark = <IconTarget size={px} waypoint="off" />;
  else
    mark = (
      <span className="inline-grid size-5 place-items-center rounded-full border border-xp-line bg-xp text-ink">
        <IconBadge size={13} strokeWidth={2.4} waypoint="off" />
      </span>
    );

  let text: ReactNode;
  if (kind === "xp")
    text = (
      <>
        <bdi className="font-bold tabular-nums" dir="ltr">
          +{formatNumber(value)} XP
        </bdi>
        {label ? <span className="font-medium">{isolateLatin(label)}</span> : null}
      </>
    );
  else if (kind === "match")
    text = (
      <>
        <bdi className="font-bold tabular-nums" dir="ltr">
          +{formatNumber(value)}%
        </bdi>
        <span className="font-medium">{isolateLatin(label ?? "مطابقة")}</span>
      </>
    );
  else if (kind === "star")
    text = (
      <>
        <span className="font-bold">النجمة {formatNumber(value)}</span>
        {label ? <span className="font-medium">{isolateLatin(label)}</span> : null}
      </>
    );
  else text = <span className="font-semibold">{isolateLatin(label)}</span>;

  return (
    <motion.span
      animate={{ scale: 1, opacity: 1 }}
      className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full border-[1.5px] leading-none wp-quiet", BOX[size], tone(kind, status), className)}
      data-kind={kind}
      data-status={status}
      data-testid={testId}
      data-value={value}
      initial={land ? { scale: 0.8, opacity: 0 } : false}
      key={land ? status : undefined}
      transition={{ default: { ...spring.pop, delay }, opacity: { ...tween.fast, delay } }}
    >
      <span className="inline-flex shrink-0">{mark}</span>
      {text}
    </motion.span>
  );
}

/** The brass coin (the XP toast's coin, as a piece): a disk with an xp-line rim and the XP glyph in ink. Flat. */
export function XpCoin({ size = 32, className }: { readonly size?: number; readonly className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full border-2 border-xp-line bg-xp text-ink", className)}
      style={{ width: size, height: size }}
    >
      <XpGlyph size={Math.round(size * 0.62)} />
    </span>
  );
}

/** A labelled row of rewards («تكسب: +200 XP · النجمة 1 · +20% مطابقة»). Wraps at 390 px. */
export function RewardRow({ label = "تكسب", children, className }: { readonly label?: ReactNode; readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {label ? <span className="me-1 text-small font-medium text-fg-3">{label}</span> : null}
      {children}
    </div>
  );
}
