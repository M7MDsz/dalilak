import type { CSSProperties } from "react";

import { FAVICON_16, FAVICON_32, MARK_16, MARK_24, MARK_32, MARK_FULL, type MarkCut } from "./geometry";

/**
 * Which drawing of the mark to use. "auto" picks by rendered size: up to 20 px the 16 cut, up to 28 px the 24 cut, up to
 * 44 px the 32 cut, above that the full mark. So the stroke stays between 9% and 12.5% of the box at every size.
 */
export type MarkCutName = "auto" | "full" | "32" | "24" | "16";

/** "accent": the waypoint takes the accent (the normal logo). "mono": everything in currentColor (the one-colour form). */
export type LogoTone = "accent" | "mono";

export function pickCut(px: number, cut: MarkCutName = "auto"): MarkCut {
  if (cut === "full") return MARK_FULL;
  if (cut === "32") return MARK_32;
  if (cut === "24") return MARK_24;
  if (cut === "16") return MARK_16;
  if (px <= 20) return MARK_16;
  if (px <= 28) return MARK_24;
  if (px <= 44) return MARK_32;
  return MARK_FULL;
}

/** The waypoint's fill: the accent token, or the ink in the one-colour form. Never a hex value (design brief 1.4). */
export function waypointStyle(tone: LogoTone): CSSProperties {
  return { fill: tone === "mono" ? "currentColor" : "var(--color-accent)" };
}

/** The drawing itself, in the cut's own units: place it with a transform inside any SVG. Ink is currentColor. */
export function MarkShape({ cut, tone = "accent" }: { readonly cut: MarkCut; readonly tone?: LogoTone }) {
  return (
    <>
      <path d={cut.d} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={cut.sw} />
      <circle cx={cut.dot.cx} cy={cut.dot.cy} r={cut.dot.r} style={waypointStyle(tone)} />
    </>
  );
}

export interface LogoMarkProps {
  /** Rendered width and height in px (the mark sits in a square box). Default 32. */
  readonly size?: number;
  readonly className?: string;
  /** Force one drawing; by default the right cut for the size is used. */
  readonly cut?: MarkCutName;
  readonly tone?: LogoTone;
  /** Accessible name; without it the mark is decorative (aria-hidden). */
  readonly title?: string;
}

/**
 * The Dalilak mark: one trail folded into two contour arches, the waypoint between its feet.
 * Ink from currentColor (so it follows the surface), waypoint from var(--color-accent).
 */
export function LogoMark({ size = 32, className, cut = "auto", tone = "accent", title }: LogoMarkProps) {
  const c = pickCut(size, cut);
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={className}
      data-cut={c.vb}
      fill="none"
      height={size}
      role={title === undefined ? undefined : "img"}
      style={{ flex: "none" }}
      viewBox={`0 0 ${c.vb} ${c.vb}`}
      width={size}
    >
      <MarkShape cut={c} tone={tone} />
    </svg>
  );
}

/** The favicon tile for a size: the 16 drawing up to 24 px, the 32 drawing above. */
export function pickFaviconCut(px: number) {
  return px <= 24 ? FAVICON_16 : FAVICON_32;
}

export interface LogoFaviconProps {
  readonly cut: 16 | 32;
  readonly size?: number;
  readonly className?: string;
  readonly tone?: LogoTone;
  readonly title?: string;
  /**
   * Draw the favicon itself: the mark in the on-stage ink on a navy tile (what src/app/icon.svg shows), which reads on
   * any tab colour. Without it, the bare small cut in currentColor.
   */
  readonly tile?: boolean;
}

/** The small drawings by name, drawn for their pixel grids (fewer, heavier strokes), e.g. for a tab or a 32 px slot. */
export function LogoFavicon({ cut, size, className, tone, title, tile = false }: LogoFaviconProps) {
  if (!tile) return <LogoMark className={className} cut={cut === 16 ? "16" : "32"} size={size ?? cut} title={title} tone={tone} />;
  const c = cut === 16 ? FAVICON_16 : FAVICON_32;
  const px = size ?? cut;
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={className}
      fill="none"
      height={px}
      role={title === undefined ? undefined : "img"}
      style={{ flex: "none" }}
      viewBox={`0 0 ${c.vb} ${c.vb}`}
      width={px}
    >
      <rect height={c.vb} rx={c.rx} style={{ fill: "var(--color-stage)" }} width={c.vb} />
      <g style={{ color: "var(--color-on-stage)" }}>
        <MarkShape cut={c} tone={tone} />
      </g>
    </svg>
  );
}
