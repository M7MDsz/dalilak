"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { IconLock } from "@/components/icons";
import { useInstant } from "@/components/motion";
import { ease, spring } from "@/lib/motion";
import { cn } from "@/components/ui/cn";

const SIZE = { sm: 56, md: 80, lg: 112 } as const;
/** The emblem's box, as a share of the medal: 30 px in sm, 43 in md, 60 in lg. Any emblem passed in is sized to it. */
const EMBLEM = 0.54;

export type BadgeState = "earned" | "locked" | "new";

export interface BadgeMedalProps {
  /**
   * The badge's own drawn emblem (from @/components/emblems: <BadgeEmblem id="first-course" />). It takes the medal's
   * colours: ink on the lit disk, ink-3 when locked. Pass it with no size: the medal sizes it to its emblem box (54%).
   * A function form, (locked) => <BadgeEmblem id="first-course" locked={locked} />, works only from a client component
   * (a function cannot cross into a client component from a server one); from a server component pass `lockedEmblem`.
   */
  readonly emblem: ReactNode | ((locked: boolean) => ReactNode);
  /** The emblem's locked drawing, as a node (server-component friendly). Defaults to `emblem` in the locked colour. */
  readonly lockedEmblem?: ReactNode;
  /** earned: lit (brass disk) · locked: visible but unlit, with the lock and the hint · new: unlocks in front of the user */
  readonly state?: BadgeState;
  readonly name?: string;
  /** Shown when earned or new. */
  readonly description?: string;
  /** Shown when locked («أكمل دورة واحدة.»). */
  readonly hint?: string;
  /** sm 56 (toasts, rows) · md 80 (profile grid) · lg 112 (the unlock moment) */
  readonly size?: keyof typeof SIZE;
  /** Hide the name and the line under it (the medal alone). */
  readonly bare?: boolean;
  /** For state="new": seconds before the unlock starts. */
  readonly delay?: number;
  readonly className?: string;
  readonly testId?: string;
}

/** The common medal frame. The milled ring opens once at the top, with its dot in the opening. */
function Frame({ lit }: { lit: boolean }) {
  return (
    <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100">
      <path
        className={lit ? "stroke-fg-2" : "stroke-fg-4"}
        d="M61.37 4.4A47 47 0 1 1 38.63 4.4"
        fill="none"
        strokeDasharray="1.4 3.52"
        strokeLinecap="round"
        strokeWidth={1.8}
      />
      <circle className={lit ? "fill-fg-2" : "fill-fg-4"} cx={50} cy={3.6} r={2.6} />
      {lit ? (
        <>
          {/* a struck medal: the brass disk, a rim in xp-line, one inner hairline in ink (flat colour, no gradient) */}
          <circle className="fill-xp stroke-xp-line" cx={50} cy={50} r={40} strokeWidth={3} />
          <circle className="stroke-ink" cx={50} cy={50} fill="none" opacity={0.5} r={35} strokeWidth={1.1} />
        </>
      ) : (
        <>
          <circle className="fill-surface-2" cx={50} cy={50} r={40} />
          <circle className="stroke-fg-4" cx={50} cy={50} fill="none" r={35} strokeDasharray="2.2 3" strokeWidth={1.3} />
        </>
      )}
    </svg>
  );
}

/**
 * The emblem's own waypoint is coral only on a medal that is unlocking now (you are here). On an earned medal it is drawn
 * in ink: a badge already won is a place you passed, not your position (the accent rule), and a grid of medals must not
 * carry a dozen coral dots. The emblem paints its dot with var(--color-accent), so the medal re-points that variable.
 */
function Face({ lit, emblem, lockedEmblem, px, live = false }: { lit: boolean; emblem: BadgeMedalProps["emblem"]; lockedEmblem?: ReactNode; px: number; live?: boolean }) {
  const art = typeof emblem === "function" ? emblem(!lit) : !lit && lockedEmblem !== undefined ? lockedEmblem : emblem;
  return (
    <span className="absolute inset-0">
      <Frame lit={lit} />
      <span className={cn("absolute inset-0 grid place-items-center", lit ? "text-ink" : "text-fg-3")}>
        {/* the emblem fills its box whatever size it was given (BadgeEmblem defaults to 48 px) */}
        <span className={cn("grid place-items-center [&>svg]:size-full", lit && !live && "[--color-accent:var(--color-ink)]")} style={{ width: px * EMBLEM, height: px * EMBLEM }}>
          {art}
        </span>
      </span>
    </span>
  );
}

/**
 * BadgeMedal: one medal frame for all twelve badges; the emblem inside is each badge's own drawing.
 * The unlock (state="new"): the lit medal is wiped up over its locked form (500 ms), then lands with one pop and one ripple.
 */
export function BadgeMedal({ emblem, lockedEmblem, state = "earned", name, description, hint, size = "md", bare = false, delay = 0, className, testId }: BadgeMedalProps) {
  const instant = useInstant();
  const px = SIZE[size];
  const locked = state === "locked";
  const playing = state === "new" && !instant;
  const lockPip = Math.round(px * 0.34);

  const medal = (
    <motion.span
      animate={{ scale: 1 }}
      className="relative block shrink-0"
      initial={playing ? { scale: 0.94 } : false}
      style={{ width: px, height: px }}
      transition={{ ...spring.pop, delay: delay + 0.5 }}
    >
      {playing ? (
        <>
          <Face emblem={emblem} lit={false} lockedEmblem={lockedEmblem} px={px} />
          <motion.span
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            className="absolute inset-0"
            initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
            transition={{ duration: 0.5, ease: ease.inOut, delay }}
          >
            <Face emblem={emblem} lit live px={px} />
          </motion.span>
          <motion.span
            animate={{ scale: [0.95, 1.32], opacity: [0, 0.6, 0] }}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-fg-2"
            initial={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.7, times: [0, 0.2, 1], ease: ease.out, delay: delay + 0.5 }}
          />
        </>
      ) : (
        <Face emblem={emblem} lit={!locked} live={state === "new"} lockedEmblem={lockedEmblem} px={px} />
      )}
      {locked ? (
        <span
          className="absolute -bottom-0.5 grid place-items-center rounded-full border-[1.5px] border-border-strong bg-surface text-fg-2 end-0"
          style={{ width: lockPip, height: lockPip }}
        >
          <IconLock size={Math.max(12, Math.round(lockPip * 0.58))} strokeWidth={2.2} waypoint="off" />
        </span>
      ) : null}
    </motion.span>
  );

  const line = locked ? hint : description;
  return (
    <span
      aria-label={name ? `${name}${locked ? " (مقفلة)" : ""}${line ? `: ${line}` : ""}` : undefined}
      className={cn("inline-flex flex-col items-center gap-2 text-center", className)}
      data-state={state}
      data-testid={testId}
      role={name ? "img" : undefined}
    >
      {medal}
      {!bare && name ? (
        <span aria-hidden className="flex w-32 flex-col gap-0.5">
          <span className={cn("text-small font-semibold", locked ? "text-fg-2" : "text-fg")}>{name}</span>
          {line ? <span className="text-caption font-normal text-fg-3">{line}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
