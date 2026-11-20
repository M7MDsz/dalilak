// Dalilak avatars: the shared hand. Small drawing parts used by all twelve figures, so the set has one weight, one eye
// language, one way of drawing cloth (folds are contour lines, patterns are a dashed trail), one bust and one place for
// the waypoint. Every figure still draws its own silhouette, face shape and expression: these parts take parameters, they
// are not one face pasted twelve times.
// Grid: 96 x 96. The round ground is clipped by the Avatar component.
import type { ReactNode } from "react";

import { marks, mix, tok, type Ground, type Skin } from "./palette";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The weight of every contour line on cloth and hair (96 grid). */
export const FOLD = 1.6;

/** One drawn figure: its ground, the trail across that ground, and the figure itself. */
export interface Figure {
  readonly ground: Ground;
  readonly trail: TrailSpec;
  readonly draw: () => ReactNode;
}

/**
 * A head as one closed path: crown at `top`, widest at `mid` (half-width `hw`), chin at `bottom`.
 * `jw` is how wide the jaw stays near the chin: close to `hw` gives a square jaw, small gives a pointed (heart) chin.
 */
export function headPath(cx: number, top: number, mid: number, bottom: number, hw: number, jw: number): string {
  const up = (mid - top) * 0.56;
  const dn = (bottom - mid) * 0.5;
  return [
    `M${r2(cx)} ${r2(top)}`,
    `C${r2(cx + hw * 0.56)} ${r2(top)} ${r2(cx + hw)} ${r2(mid - up)} ${r2(cx + hw)} ${r2(mid)}`,
    `C${r2(cx + hw)} ${r2(mid + dn)} ${r2(cx + jw)} ${r2(bottom)} ${r2(cx)} ${r2(bottom)}`,
    `C${r2(cx - jw)} ${r2(bottom)} ${r2(cx - hw)} ${r2(mid + dn)} ${r2(cx - hw)} ${r2(mid)}`,
    `C${r2(cx - hw)} ${r2(mid - up)} ${r2(cx - hw * 0.56)} ${r2(top)} ${r2(cx)} ${r2(top)}Z`,
  ].join("");
}

/** The adult bust every figure shares: broad shoulders that leave room for a visible neck. */
export const BODY = "M4.5 98C6.5 84.6 17.6 78.6 33.4 77.6L62.6 77.6C78.4 78.6 89.5 84.6 91.5 98Z";

/** The trail weight: the brand line that has to survive at 32 px. */
export const TRAIL = 2.6;

/**
 * The trail behind the figure, as the product draws progress: solid on the start side (the right, in this RTL product)
 * up to the figure, dotted from the figure on. The figure stands where the waypoint would be: "you are here".
 * `r`, `m`, `l` are the heights at the right edge, behind the figure and at the left edge; `sway` bends the two ends.
 */
export interface TrailSpec {
  readonly r: number;
  readonly m: number;
  readonly l: number;
  readonly sway?: number;
}

function Trail({ spec, color }: { readonly spec: TrailSpec; readonly color: string }) {
  const { r, m, l, sway = 5 } = spec;
  const k = (l - r) * 0.16;
  const solid = `M99 ${r2(r)}C83 ${r2(r - sway)} 64 ${r2(m - k)} 48 ${r2(m)}`;
  const dotted = `M48 ${r2(m)}C32 ${r2(m + k)} 13 ${r2(l + sway)} -3 ${r2(l)}`;
  return (
    <>
      <path d={solid} fill="none" stroke={color} strokeLinecap="round" strokeWidth={TRAIL} />
      <path d={dotted} fill="none" stroke={color} strokeDasharray="0 5" strokeLinecap="round" strokeWidth={TRAIL + 0.4} />
    </>
  );
}

/** The ground: a flat field and the trail. */
export function GroundField({ ground, trail }: { readonly ground: Ground; readonly trail: TrailSpec }) {
  return (
    <>
      <rect fill={ground.fill} height="96" width="96" />
      <Trail color={ground.trail} spec={trail} />
    </>
  );
}

/**
 * The rim of the dark ground. It uses the surface's third text tone, so it is a quiet dark ring on paper and a clear
 * light ring on the stage (where the dark disc would otherwise melt into the dark surface).
 */
export function GroundRim({ ground }: { readonly ground: Ground }) {
  if (!ground.dark) return null;
  return <circle cx="48" cy="48" fill="none" r="46.7" stroke="var(--fg-3, var(--color-ink-3))" strokeWidth={2.4} />;
}

/** A contour line on cloth or hair. */
export function Fold({ d, color, width = FOLD, dash }: { readonly d: string; readonly color: string; readonly width?: number; readonly dash?: string }) {
  return <path d={d} fill="none" stroke={color} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" strokeWidth={width} />;
}

/**
 * The waypoint has one home on every figure: a round pin on the chest, on the start side (right) of the collar, well
 * clear of any skin. At 32 px all twelve carry the same coral dot in the same place, so it reads as one deliberate mark.
 */
export const PIN = { cx: 59.6, cy: 87.6, r: 2.6 } as const;

export function Pin() {
  return <circle cx={PIN.cx} cy={PIN.cy} fill={tok.accent} r={PIN.r} />;
}

export function Ears({ skin, y, x1, x2, r = 3.4 }: { readonly skin: Skin; readonly y: number; readonly x1: number; readonly x2: number; readonly r?: number }) {
  return (
    <>
      <ellipse cx={x1} cy={y} fill={skin.shade} rx={r * 0.82} ry={r} />
      <ellipse cx={x2} cy={y} fill={skin.shade} rx={r * 0.82} ry={r} />
    </>
  );
}

export function Neck({ skin, x = 42, w = 12, top, bottom }: { readonly skin: Skin; readonly x?: number; readonly w?: number; readonly top: number; readonly bottom: number }) {
  const h = bottom - top;
  return <path d={`M${x} ${top}h${w}v${h - w / 2}a${w / 2} ${w / 2} 0 0 1 ${-w} 0z`} fill={skin.shade} />;
}

/** A light warmth on the cheeks: quiet, so the faces stay adult. */
export function Cheeks({ skin, y, gap, rx = 2.6, ry = 1.6 }: { readonly skin: Skin; readonly y: number; readonly gap: number; readonly rx?: number; readonly ry?: number }) {
  return (
    <g fill={skin.cheek} opacity={0.42}>
      <ellipse cx={48 - gap} cy={y} rx={rx} ry={ry} />
      <ellipse cx={48 + gap} cy={y} rx={rx} ry={ry} />
    </g>
  );
}

export type NoseKind = "hook" | "button" | "line";

/** The nose: a hook (side-lit), a button (just the underside), or a straight line with a small foot. */
export function Nose({ skin, y, cx = 48, size = 1, kind = "hook" }: { readonly skin: Skin; readonly y: number; readonly cx?: number; readonly size?: number; readonly kind?: NoseKind }) {
  const s = size;
  let d: string;
  switch (kind) {
    case "hook":
      d = `M${r2(cx + 0.6 * s)} ${r2(y)}c${r2(1.2 * s)} ${r2(1.5 * s)} ${r2(1.5 * s)} ${r2(3 * s)} ${r2(-0.9 * s)} ${r2(3.7 * s)}`;
      break;
    case "button":
      d = `M${r2(cx - 1.8 * s)} ${r2(y + 2.4 * s)}q${r2(1.8 * s)} ${r2(1.8 * s)} ${r2(3.6 * s)} 0`;
      break;
    case "line":
      d = `M${r2(cx + 0.5 * s)} ${r2(y)}l${r2(-0.3 * s)} ${r2(3.2 * s)}q${r2(0.5 * s)} ${r2(0.8 * s)} ${r2(1.8 * s)} ${r2(0.3 * s)}`;
      break;
  }
  return <path d={d} fill="none" stroke={skin.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} />;
}

export type EyeKind = "oval" | "dot" | "half" | "happy" | "lash";

/**
 * Eyes as confident marks, sized for adults (an oval is 4.4 x 5.8 units: about 1.5 x 1.9 px at 32 px).
 * - oval: tall ovals, open and attentive · dot: round · half: smiling half-moons · happy: closed arcs · lash: oval with a flick
 */
export function Eyes({ kind, y, gap = 6.8, cx = 48, scale = 1 }: { readonly kind: EyeKind; readonly y: number; readonly gap?: number; readonly cx?: number; readonly scale?: number }) {
  const xs = [cx - gap, cx + gap] as const;
  const s = scale;
  switch (kind) {
    case "oval":
      return (
        <g fill={marks.eye}>
          {xs.map((x) => (
            <ellipse cx={x} cy={y} key={x} rx={2.2 * s} ry={2.9 * s} />
          ))}
        </g>
      );
    case "dot":
      return (
        <g fill={marks.eye}>
          {xs.map((x) => (
            <circle cx={x} cy={y} key={x} r={2.35 * s} />
          ))}
        </g>
      );
    case "half":
      return (
        <g fill={marks.eye}>
          {xs.map((x) => (
            <path d={`M${r2(x - 3 * s)} ${r2(y + 1.1 * s)}C${r2(x - 2.8 * s)} ${r2(y - 3 * s)} ${r2(x + 2.8 * s)} ${r2(y - 3 * s)} ${r2(x + 3 * s)} ${r2(y + 1.1 * s)}C${r2(x + 1.2 * s)} ${r2(y + 0.2 * s)} ${r2(x - 1.2 * s)} ${r2(y + 0.2 * s)} ${r2(x - 3 * s)} ${r2(y + 1.1 * s)}Z`} key={x} />
          ))}
        </g>
      );
    case "happy":
      return (
        <g fill="none" stroke={marks.eye} strokeLinecap="round" strokeWidth={2.4 * s}>
          {xs.map((x) => (
            <path d={`M${r2(x - 2.9 * s)} ${r2(y + 1.1 * s)}Q${r2(x)} ${r2(y - 3.2 * s)} ${r2(x + 2.9 * s)} ${r2(y + 1.1 * s)}`} key={x} />
          ))}
        </g>
      );
    case "lash":
      return (
        <g fill={marks.eye}>
          {xs.map((x, i) => {
            const out = i === 0 ? -1 : 1;
            return (
              <g key={x}>
                <ellipse cx={x} cy={y} rx={2.2 * s} ry={2.8 * s} />
                <path d={`M${r2(x + out * 1.8 * s)} ${r2(y - 1.5 * s)}q${r2(out * 1.2 * s)} ${r2(-0.2 * s)} ${r2(out * 2 * s)} ${r2(-1 * s)}`} fill="none" stroke={marks.eye} strokeLinecap="round" strokeWidth={1.3 * s} />
              </g>
            );
          })}
        </g>
      );
  }
}

export type BrowKind = "soft" | "raised" | "thick";

/** Brows carry most of the expression. Inner ends never dip (that reads as a frown). */
export function Brows({ kind, y, gap = 6.8, color, cx = 48, width }: { readonly kind: BrowKind; readonly y: number; readonly gap?: number; readonly color: string; readonly cx?: number; readonly width?: number }) {
  const w = width ?? (kind === "thick" ? 2.6 : 1.9);
  const left = cx - gap;
  const right = cx + gap;
  const arc = (x: number, lift: number, tilt: number) => `M${r2(x - 3.4)} ${r2(y + tilt)}Q${r2(x)} ${r2(y - lift)} ${r2(x + 3.4)} ${r2(y - tilt)}`;
  let d: string;
  switch (kind) {
    case "soft":
      d = `${arc(left, 1.5, 0.4)}${arc(right, 1.5, -0.4)}`;
      break;
    case "raised":
      d = `${arc(left, 2.5, 0.5)}${arc(right, 2.5, -0.5)}`;
      break;
    case "thick":
      d = `${arc(left, 1.6, 0.5)}${arc(right, 1.6, -0.5)}`;
      break;
  }
  return <path d={d} fill="none" stroke={color} strokeLinecap="round" strokeWidth={w} />;
}

/** The lip colour of a face: the mouth's warm brown drawn toward the skin's own line, so it never reads as a dark bar. */
export const lipOf = (s: Skin) => mix(marks.mouth, 62, s.line);

/**
 * The closed smile: a filled crescent, full in the middle and fine at the corners, with no hooks at the ends (hooked
 * corners read as a moustache). `y` is the corner height, `w` the half width, `depth` how far the middle drops, `thick` the
 * crescent's thickness in the middle.
 */
export function Smile({ skin, y, w, depth = 3, thick = 1.5, cx = 48 }: { readonly skin: Skin; readonly y: number; readonly w: number; readonly depth?: number; readonly thick?: number; readonly cx?: number }) {
  const c = lipOf(skin);
  const d = `M${r2(cx - w)} ${r2(y)}Q${r2(cx)} ${r2(y + 2 * (depth - thick))} ${r2(cx + w)} ${r2(y)}Q${r2(cx)} ${r2(y + 2 * depth)} ${r2(cx - w)} ${r2(y)}Z`;
  return <path d={d} fill={c} stroke={c} strokeLinejoin="round" strokeWidth={1.1} />;
}

/**
 * Open smile: a D-shaped mouth, with a band of teeth (the laugh, used on at most four figures) or without (a slight open
 * smile). `y` is the top lip line, `w` the half width, `h` the depth.
 */
export function MouthOpen({ y, w, h, cx = 48, teeth = true }: { readonly y: number; readonly w: number; readonly h: number; readonly cx?: number; readonly teeth?: boolean }) {
  const x0 = cx - w;
  const x1 = cx + w;
  const outline = `M${r2(x0)} ${r2(y)}Q${r2(cx)} ${r2(y + 1.4)} ${r2(x1)} ${r2(y)}C${r2(x1 - 0.4)} ${r2(y + h * 0.9)} ${r2(cx + w * 0.5)} ${r2(y + h)} ${r2(cx)} ${r2(y + h)}C${r2(cx - w * 0.5)} ${r2(y + h)} ${r2(x0 + 0.4)} ${r2(y + h * 0.9)} ${r2(x0)} ${r2(y)}Z`;
  const th = h * 0.38;
  const teethD = `M${r2(x0 + 0.9)} ${r2(y + 0.35)}Q${r2(cx)} ${r2(y + 1.7)} ${r2(x1 - 0.9)} ${r2(y + 0.35)}L${r2(x1 - 1.8)} ${r2(y + th)}Q${r2(cx)} ${r2(y + th + 1.4)} ${r2(x0 + 1.8)} ${r2(y + th)}Z`;
  return (
    <>
      <path d={outline} fill={marks.mouth} stroke={marks.mouth} strokeLinejoin="round" strokeWidth={0.6} />
      {teeth ? <path d={teethD} fill={marks.teeth} /> : null}
    </>
  );
}

/** A group drawn in the 96 grid, rotated about a pivot (a head tilt). */
export function Tilt({ deg, x = 48, y = 70, children }: { readonly deg: number; readonly x?: number; readonly y?: number; readonly children: ReactNode }) {
  return <g transform={`rotate(${deg} ${x} ${y})`}>{children}</g>;
}
