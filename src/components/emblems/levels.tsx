import type { ReactNode } from "react";

import { Ahead, EmblemSvg, Key, Ln, Wash, Wp } from "./parts";

/** The seven levels of PRODUCT-SPEC 8.3. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const LEVEL_TITLES: Readonly<Record<Level, string>> = {
  1: "مبتدئ",
  2: "مستكشف",
  3: "مجتهد",
  4: "متمكّن",
  5: "محترف",
  6: "خبير",
  7: "أسطورة",
};

type Pt = readonly [number, number];

const f = (n: number) => +n.toFixed(2);
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// The mountain (32 grid): a low peak on the left, a col, and the main summit right of centre, so the silhouette is never
// a symmetric road-sign triangle. The summit is rounded (a short curve, not a point).
const GROUND = 23.6;
const FOOT_L: Pt = [2.4, GROUND];
const PEAK_L: Pt = [8.6, 14.4];
const COL: Pt = [11.8, 17.6];
const SUMMIT: Pt = [18.2, 7.2];
const FOOT_R: Pt = [29.6, GROUND];
const ROUND = 1.5; // length of the rounding on each side of the summit
const unit = (a: Pt, b: Pt): Pt => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
const S_IN: Pt = [SUMMIT[0] + unit(SUMMIT, COL)[0] * ROUND, SUMMIT[1] + unit(SUMMIT, COL)[1] * ROUND];
const S_OUT: Pt = [SUMMIT[0] + unit(SUMMIT, FOOT_R)[0] * ROUND, SUMMIT[1] + unit(SUMMIT, FOOT_R)[1] * ROUND];
const quad = (t: number): Pt => lerp(lerp(S_IN, SUMMIT, t), lerp(SUMMIT, S_OUT, t), t);

/** The outline as a polygon (the summit curve sampled), for the fill. */
const POLY: readonly Pt[] = [FOOT_L, PEAK_L, COL, S_IN, quad(0.25), quad(0.5), quad(0.75), S_OUT, FOOT_R];
/** The outline as a path (the summit a true curve). */
const OUTLINE = `M${FOOT_L.map(f).join(" ")}L${PEAK_L.map(f).join(" ")}L${COL.map(f).join(" ")}L${S_IN.map(f).join(" ")}Q${SUMMIT.map(f).join(" ")} ${S_OUT.map(f).join(" ")}L${FOOT_R.map(f).join(" ")}Z`;
const TOP = quad(0.5);

/** Height of the climb at each level: level 1 at the foot, level 7 at the top, evenly in between. */
const fillY = (level: number) => GROUND - ((level - 1) / 6) * (GROUND - TOP[1]);

/** Where the right flank (the trail side: RTL starts on the right) crosses height y. */
const flankX = (y: number) => FOOT_R[0] + ((GROUND - y) / (GROUND - SUMMIT[1])) * (SUMMIT[0] - FOOT_R[0]);

/** The part of the mountain at or below height y (Sutherland-Hodgman against the half-plane "below y"). */
function below(y: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i] as Pt;
    const b = POLY[(i + 1) % POLY.length] as Pt;
    const ain = a[1] >= y;
    const bin = b[1] >= y;
    if (ain) out.push(a);
    if (ain !== bin) out.push(lerp(a, b, (y - a[1]) / (b[1] - a[1])));
  }
  return out;
}
const pathOf = (pts: readonly Pt[]) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;

/** The mountain's inside along height y (for the locked form's dotted target line). */
function across(y: number, inset: number): string {
  const xs: number[] = [];
  for (let i = 0; i < POLY.length; i++) {
    const a = POLY[i] as Pt;
    const b = POLY[(i + 1) % POLY.length] as Pt;
    if ((a[1] - y) * (b[1] - y) < 0) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
  }
  xs.sort((p, q) => p - q);
  let d = "";
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const x0 = (xs[i] as number) + inset;
    const x1 = (xs[i + 1] as number) - inset;
    if (x1 > x0) d += `M${f(x0)} ${f(y)}H${f(x1)}`;
  }
  return d;
}

// The scale bar under the mountain: seven segments, counted from the right (RTL), the reached ones heavy. It is the
// kit's XP scale bar in small, so "level" always reads as "how far along the scale".
const BAR_Y = 27.7;
const BAR_X0 = FOOT_L[0];
const BAR_X1 = FOOT_R[0];
const BAR_GAP = 1.15;
const BAR_W = (BAR_X1 - BAR_X0 - 6 * BAR_GAP) / 7;

function ScaleBar({ lit, locked }: { readonly lit: number; readonly locked: boolean }) {
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const x1 = BAR_X1 - i * (BAR_W + BAR_GAP);
        const on = !locked && i < lit;
        const h = on ? 2.7 : 1.1;
        return <rect fill="currentColor" height={h} key={i} rx={on ? 0.5 : 0.4} width={f(BAR_W)} x={f(x1 - BAR_W)} y={f(BAR_Y - h / 2)} />;
      })}
    </>
  );
}

/**
 * The drawing of one level (also used by the «المستوى الخامس» badge, so "level" always looks the same).
 * Earned: the mountain's body is enamel, the height climbed is solid ink rising from the foot (a sixth of the height per
 * level), the scale bar counts the level, and the waypoint marks the height reached on the right flank (the trail
 * side). Level 1 stands at the trailhead, at the right foot; level 7 has the solid mountain, the waypoint on the
 * summit and the flag.
 * Locked: bare outline, the target height dotted, every scale segment thin, the waypoint an empty ring.
 */
export function levelArt(raw: number, locked = false): ReactNode {
  const level = Math.min(7, Math.max(1, Math.round(raw)));
  const y = fillY(level);
  const here: Pt = level === 7 ? TOP : level === 1 ? FOOT_R : [flankX(y), y];
  return (
    <>
      <Wash d={OUTLINE} locked={locked} />
      {!locked && level > 1 ? <path d={pathOf(level === 7 ? POLY : below(y))} fill="currentColor" /> : null}
      <Ln d={OUTLINE} />
      {locked && level > 1 && level < 7 ? <Ahead d={across(y, 1.6)} w={1.4} /> : null}
      <ScaleBar locked={locked} lit={level} />
      {level === 7 ? (
        <>
          <Ln d={`M${f(TOP[0])} ${f(TOP[1])}V1`} w={1.5} />
          <Key d={`M${f(TOP[0])} 1.1 12.6 3.05 ${f(TOP[0])} 5z`} locked={locked} outline={1.3} />
        </>
      ) : null}
      <Wp cx={f(here[0])} cy={f(here[1])} locked={locked} r={2.15} />
    </>
  );
}

export interface LevelEmblemProps {
  /** 1..7 (spec 8.3); any number is rounded and held to that range. */
  readonly level: Level | number;
  /** Rendered size in px (square). Default 48. Inside BadgeMedal use 46% of the medal; it never grows past its box. */
  readonly size?: number;
  readonly className?: string;
  /** Accessible name; without it the emblem is decorative. */
  readonly title?: string;
}

/**
 * One emblem per level: the same mountain, filled higher each time, from the trailhead (1 «مبتدئ») to the summit flag
 * (7 «أسطورة»). Three cues that agree: the solid ink rises a sixth of the mountain per level, the scale bar under it
 * counts the level in heavy segments, and the waypoint climbs the right flank.
 */
export function LevelEmblem({ level, size = 48, className, title }: LevelEmblemProps) {
  return (
    <EmblemSvg className={className} size={size} title={title}>
      {levelArt(level)}
    </EmblemSvg>
  );
}
