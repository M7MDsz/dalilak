"use client";
// Burst (playbook block 29): the ONE confetti moment (the match beat of the course celebration). 28 flat bits in Darb's
// own shapes (short trail dashes and dots) in the reward's colours (XP gold and the surface's ink; never the accent, which
// only marks your position and next action), thrown out from the centre of the positioned parent, 900 ms, then gone.
// No rainbow, no glow. Renders nothing under reduced motion or still frames.
import { motion } from "motion/react";
import { useEffect, useEffectEvent, useMemo } from "react";

import { ease } from "@/lib/motion";

import { useInstant } from "./provider";

/**
 * XP gold, the ink of the surface it sits on, and the XP text tone of that surface (dark brass on paper, light gold on the
 * stage). Raw aliases (var(--fg)), not the Tailwind names (var(--color-fg)): only the raw ones flip on the stage.
 */
export const BURST_COLORS = ["var(--color-xp)", "var(--fg)", "var(--xp-fg)"] as const;

/** A small seeded generator: the same seed gives the same burst on server and browser (no Math.random in render). */
function seeded(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mount it from the event (the ring arriving), inside a `relative` box; unmount it after `onDone` (about 1 s).
 * Fire it once per achievement (store the celebrated id). `seed` varies the throw; `reach` scales its size.
 * `radius` (px): the bits leave from a circle of this radius round the centre (give it the ring's radius, so nothing
 * covers the number in the middle).
 */
export function Burst({
  colors = BURST_COLORS,
  count = 28,
  seed = 7,
  reach = 1,
  radius = 0,
  onDone,
}: {
  colors?: readonly string[];
  count?: number;
  seed?: number;
  reach?: number;
  radius?: number;
  onDone?: () => void;
}) {
  const instant = useInstant();
  const done = useEffectEvent(() => onDone?.());
  const bits = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.4;
      const distance = (50 + rand() * 70) * reach;
      const kind = i % 3 === 0 ? "dot" : "dash";
      return {
        id: i,
        x0: Math.cos(angle) * radius,
        y0: Math.sin(angle) * radius,
        dx: Math.cos(angle) * (radius + distance),
        dy: Math.sin(angle) * (radius + distance) - 24 * reach,
        spin: (rand() - 0.5) * 540,
        tilt: rand() * 180,
        color: colors[i % colors.length] ?? "currentColor",
        kind,
      };
    });
  }, [colors, count, seed, reach, radius]);

  useEffect(() => {
    const timer = setTimeout(() => done(), instant ? 0 : 1000);
    return () => clearTimeout(timer);
  }, [instant]);

  if (instant) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-10">
      {bits.map((bit) => (
        <motion.span
          key={bit.id}
          className="absolute block"
          style={{
            width: bit.kind === "dot" ? 6 : 10,
            height: bit.kind === "dot" ? 6 : 3,
            marginLeft: bit.kind === "dot" ? -3 : -5,
            marginTop: bit.kind === "dot" ? -3 : -1.5,
            borderRadius: 999,
            backgroundColor: bit.color,
          }}
          initial={{ x: bit.x0, y: bit.y0, opacity: 1, rotate: bit.tilt, scale: 0.6 }}
          animate={{ x: bit.dx, y: [bit.y0, bit.dy, bit.dy + 36 * reach], opacity: [1, 1, 0], rotate: bit.tilt + bit.spin, scale: 1 }}
          transition={{
            duration: 0.9,
            ease: ease.out,
            y: { duration: 0.9, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] },
            opacity: { duration: 0.9, times: [0, 0.7, 1] },
          }}
        />
      ))}
    </span>
  );
}
