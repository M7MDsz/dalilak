import { useMemo } from "react";

import { cn } from "@/components/ui/cn";

// The quiet contour texture of the map, as one SVG paint. Deterministic (a seeded generator, no Math.random), so the server
// and the browser draw the same lines. It never moves and never competes with content: hairlines in the contour token,
// every fifth line an index contour one shade stronger.

export type ContourIntensity = "faint" | "quiet" | "present";

// Spread so the three steps are told apart at a glance: faint is a whisper behind content, present is the showcase.
const OPACITY: Record<ContourIntensity, number> = { faint: 0.3, quiet: 0.6, present: 1 };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/** One closed, smooth contour through `pts` (Catmull-Rom turned into cubic Béziers). */
function closedPath(pts: readonly (readonly [number, number])[]): string {
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n] as readonly [number, number];
  let d = `M${f(at(0)[0])} ${f(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

function terrain(seed: number, rings: number, cx: number, cy: number) {
  const rand = mulberry32(seed);
  const waves = [2, 3, 5].map((k) => ({ k, phase: rand() * Math.PI * 2, amp: 0.05 + rand() * 0.07, drift: (rand() - 0.5) * 0.35 }));
  const tilt = (rand() - 0.5) * 0.6;
  const lines: { d: string; index: boolean }[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    const r = 26 + ring * 58 + ring * ring * 1.6;
    const grow = 0.6 + ring / rings; // outer lines wander more, like real terrain
    const pts: [number, number][] = [];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      let m = 1;
      for (const w of waves) m += w.amp * grow * Math.sin(w.k * t + w.phase + w.drift * ring);
      const x = Math.cos(t) * r * m * 1.4;
      const y = Math.sin(t) * r * m * 0.82;
      pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    lines.push({ d: closedPath(pts), index: ring % 5 === 0 });
  }
  return lines;
}

export interface ContourBackdropProps {
  /** faint (behind content-heavy pages) · quiet (default: cards on the stage, empty states) · present (the sign-in showcase) */
  readonly intensity?: ContourIntensity;
  /** Where the summit sits, as fractions of the box (physical x: 0 = left). */
  readonly summit?: { readonly x: number; readonly y: number };
  readonly rings?: number;
  readonly seed?: number;
  readonly className?: string;
}

/**
 * The contour texture. Put it as the first child of a `relative isolate` box (Stage does this with its `contour` prop).
 * It colours itself from the surface: contour lines on paper, stage-contour lines on the stage.
 */
export function ContourBackdrop({ intensity = "quiet", summit = { x: 0.74, y: 0.3 }, rings = 16, seed = 11, className }: ContourBackdropProps) {
  const lines = useMemo(() => terrain(seed, rings, summit.x * 1600, summit.y * 1000), [seed, rings, summit.x, summit.y]);
  return (
    <svg
      aria-hidden
      className={cn("skin-contour pointer-events-none absolute inset-0 -z-10 size-full", className)}
      fill="none"
      focusable="false"
      opacity={OPACITY[intensity]}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1600 1000"
    >
      {lines.map((line, i) => (
        <path
          className={line.index ? "stroke-contour-line-2" : "stroke-contour-line"}
          d={line.d}
          key={i}
          strokeWidth={line.index ? 1.4 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
