import type { CSSProperties, ReactNode } from "react";

/**
 * The emblem pen: a 32 x 32 grid, the icon family's round line, exactly one waypoint.
 * Emblems live on the design system's BadgeMedal, whose earned disk is BRASS: so an emblem carries no brass of its own.
 * It is drawn in three tones that read on brass, on paper and on the stage:
 *   ink (currentColor) lines · KEY: the one solid ink shape that is the reward · ENAMEL: secondary areas filled white
 *   (var(--color-sheet): the medal's ink is navy on paper and on the stage) · the waypoint in the accent.
 * Locked ("visible but unlit"): the same drawing as bare line (no key, no enamel), the achievement trail dotted
 * (not walked yet), the waypoint an empty ring. Never faded with opacity: the medal sets the ink (fg-3 when locked).
 * Used BARE on a dark surface (light ink), set --emblem-enamel: var(--color-stage-2) on a parent, or the enamel areas
 * fill in with the ink.
 * The waypoint always sits at the end of a line or in a line's opening (a ribbon's end, a shelf's end, the gap where a
 * laurel parts, a flame's open foot), never floating beside an object like a notification dot.
 */
export const LINE = 1.75;
export const FINE = 1.2;
const round = { strokeLinecap: "round", strokeLinejoin: "round" } as const;
const enamel: CSSProperties = { fill: "var(--emblem-enamel, var(--color-sheet))" };

/** A main ink line. */
export function Ln({ d, w = LINE, dash }: { readonly d: string; readonly w?: number; readonly dash?: string }) {
  return <path d={d} fill="none" stroke="currentColor" strokeDasharray={dash} strokeWidth={w} {...round} />;
}

/** A fine ink line (text lines, contour hairlines, details). */
export function Fine({ d, w = FINE }: { readonly d: string; readonly w?: number }) {
  return <path d={d} fill="none" stroke="currentColor" strokeWidth={w} {...round} />;
}

/** The trail that was walked to earn this: solid when earned, a dotted trail when locked. */
export function Trail({ d, locked, w = LINE }: { readonly d: string; readonly locked: boolean; readonly w?: number }) {
  return <path d={d} fill="none" stroke="currentColor" strokeDasharray={locked ? `0.01 ${w * 1.9}` : undefined} strokeWidth={w} {...round} />;
}

/** The way still ahead: always dotted. */
export function Ahead({ d, w = LINE }: { readonly d: string; readonly w?: number }) {
  return <path d={d} fill="none" stroke="currentColor" strokeDasharray={`0.01 ${w * 1.9}`} strokeWidth={w} {...round} />;
}

/** The reward shape: solid ink when earned, its outline only when locked. */
export function Key({ d, locked, outline = 1.4 }: { readonly d: string; readonly locked: boolean; readonly outline?: number }) {
  return <path d={d} fill={locked ? "none" : "currentColor"} stroke="currentColor" strokeWidth={outline} {...round} />;
}

/** A secondary area: enamel-filled and outlined when earned, outline only when locked. */
export function Enamel({ d, locked, outline = LINE }: { readonly d: string; readonly locked: boolean; readonly outline?: number }) {
  return <path d={d} stroke="currentColor" strokeWidth={outline} style={locked ? { fill: "none" } : enamel} {...round} />;
}

/** An enamel area with no outline (a highlight, the unclimbed body of the level mountain). Absent when locked. */
export function Wash({ d, locked }: { readonly d: string; readonly locked: boolean }) {
  return locked ? null : <path d={d} style={enamel} />;
}

/** A line that carries the achievement: heavy ink when earned, the normal line when locked. */
export function Bold({ d, locked, w = 2.6 }: { readonly d: string; readonly locked: boolean; readonly w?: number }) {
  return <path d={d} fill="none" stroke="currentColor" strokeWidth={locked ? LINE : w} {...round} />;
}

/** The waypoint: lit in the accent when earned, an empty ring when locked. */
export function Wp({ cx, cy, r = 2.25, locked }: { readonly cx: number; readonly cy: number; readonly r?: number; readonly locked: boolean }) {
  if (locked) return <circle cx={cx} cy={cy} fill="none" r={r - 0.55} stroke="currentColor" strokeWidth={1.1} />;
  return <circle cx={cx} cy={cy} r={r} style={{ fill: "var(--color-accent)" }} />;
}

/** A five-point star in Dalilak's line language (rounded joins), the skill mark. */
export function starPath(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = ((-90 + k * 36) * Math.PI) / 180;
    const rad = k % 2 === 0 ? R : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export interface EmblemSvgProps {
  readonly size: number;
  readonly className?: string;
  readonly title?: string;
  readonly children: ReactNode;
  readonly locked?: boolean;
}

/**
 * The emblem's svg. It never grows past the box it is placed in (max 100% both ways), so an emblem with the default
 * size dropped into a smaller medal (BadgeMedal md 37 px, sm 26 px) shrinks to fit instead of overflowing.
 */
export function EmblemSvg({ size, className, title, children, locked }: EmblemSvgProps) {
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={className}
      data-locked={locked ? "" : undefined}
      fill="none"
      height={size}
      role={title === undefined ? undefined : "img"}
      style={{ flex: "none", maxWidth: "100%", maxHeight: "100%" }}
      viewBox="0 0 32 32"
      width={size}
    >
      {children}
    </svg>
  );
}
