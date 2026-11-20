"use client";
import { motion } from "motion/react";
import { useId } from "react";

import { useInstant } from "@/components/motion";
import { ease } from "@/lib/motion";
import { cn } from "@/components/ui/cn";

const SIZE = { sm: 64, md: 96, lg: 128 } as const;

export interface StampProps {
  /** The word in the seal. Default «تمّ». */
  readonly label?: string;
  readonly size?: keyof typeof SIZE;
  /** ok: success green (a completed course, a sent application) · ink: the surface's ink (a neutral record) */
  readonly tone?: "ok" | "ink";
  /** Land it now: it comes down, presses once (one 0.95 frame), settles, and one contour ripple leaves it. */
  readonly play?: boolean;
  /** Delay before it lands, in seconds (so it follows its cause). */
  readonly delay?: number;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Stamp: an inked survey seal. The outer ring opens once at the top, with the dot in the opening (the signature, in the
 * stamp's own ink: a completion is not the user's position). Slightly rotated, with a faint ink grain.
 */
export function Stamp({ label = "تمّ", size = "md", tone = "ok", play = false, delay = 0, className, testId }: StampProps) {
  const id = useId().replace(/:/g, "");
  const instant = useInstant();
  const px = SIZE[size];
  const animate = play && !instant;
  const small = size === "sm";
  // a long word («أُرسل») needs the room between the side ticks: they move out to the dotted ring and get shorter
  const long = label.length > 3;

  const seal = (
    <svg aria-hidden className="block size-full overflow-visible" viewBox="0 0 120 120">
      <defs>
        <filter height="130%" id={`ink-${id}`} width="130%" x="-15%" y="-15%">
          <feTurbulence baseFrequency="0.85" numOctaves={2} result="grain" seed={4} type="fractalNoise" />
          {/* the small seal gets less grain, so the print does not eat its thinner line */}
          <feDisplacementMap in="SourceGraphic" in2="grain" result="rough" scale={small ? 0.8 : 1.3} xChannelSelector="R" yChannelSelector="G" />
          <feColorMatrix in="grain" result="patchy" type="matrix" values={small ? "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.5 1.3" : "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.8 1.28"} />
          <feComposite in="rough" in2="patchy" operator="in" />
        </filter>
      </defs>
      <g fill="none" filter={`url(#ink-${id})`} stroke="currentColor">
        {/* the ring opens at the top; the dot sits in the opening */}
        <path d="M74.88 8.09A54 54 0 1 1 45.12 8.09" strokeLinecap="round" strokeWidth={small ? 4.5 : 3.4} />
        <circle cx={60} cy={6.2} fill="currentColor" r={small ? 4.2 : 3.6} stroke="none" />
        <circle cx={60} cy={60} r={44.5} strokeDasharray={small ? "0.1 6" : "0.1 5.2"} strokeLinecap="round" strokeWidth={small ? 2.8 : 2} />
        <path d={long ? "M20 60h6M94 60h6" : "M21 60h12M87 60h12"} strokeLinecap="round" strokeWidth={small ? 3.2 : 2.6} />
        <text
          direction="rtl"
          dominantBaseline="central"
          fill="currentColor"
          fontFamily="inherit"
          fontSize={label.length > 3 ? 24 : 34}
          fontWeight={700}
          stroke="none"
          textAnchor="middle"
          x={60}
          y={62}
        >
          {label}
        </text>
      </g>
    </svg>
  );

  return (
    <span
      aria-label={label}
      className={cn("relative inline-block shrink-0", tone === "ok" ? "text-ok-fg" : "text-fg", className)}
      data-testid={testId}
      role="img"
      style={{ width: px, height: px }}
    >
      {animate ? (
        <>
          <motion.span
            animate={{ scale: [1.32, 0.95, 1], opacity: [0, 1, 1], rotate: [-15, -8, -8] }}
            className="absolute inset-0"
            initial={{ scale: 1.32, opacity: 0, rotate: -15 }}
            transition={{ duration: 0.42, times: [0, 0.55, 1], ease: ease.out, delay }}
          >
            {seal}
          </motion.span>
          {/* one contour ripple at the moment of impact: a 1 px ring, never a glow */}
          <motion.span
            animate={{ scale: [0.92, 1.3], opacity: [0, 0.55, 0] }}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-current"
            initial={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.65, times: [0, 0.2, 1], ease: ease.out, delay: delay + 0.22 }}
          />
        </>
      ) : (
        <span className="absolute inset-0 -rotate-8">{seal}</span>
      )}
    </span>
  );
}
