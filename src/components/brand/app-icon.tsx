import { useId } from "react";

import { type MarkCut } from "./geometry";
import { MarkShape, pickCut, pickFaviconCut } from "./mark";

/** Tile rules, in tile units (side 100). */
export const APP_TILE = {
  /** corner radius (the favicon tiles use the same proportion: 3.5 of 16, 7 of 32) */
  radius: 22,
  /** the mark's ink width */
  markWidth: 56,
  /** the optical centre sits this far above the tile's centre (the open feet make the box centre look low) */
  lift: 1.2,
  /** contour hairlines (stage tile only) from this tile size up (px) */
  contoursFrom: 88,
  /**
   * Up to this size (px) the tile is drawn from the favicon tiles (FAVICON_16 up to 24 px, FAVICON_32 above): a larger
   * mark on whole pixels, no contours. Above it, the full composition.
   */
  smallUpTo: 32,
} as const;

export type AppIconSurface = "stage" | "paper";

/**
 * Where the mark goes in a 100 tile. "optical": its centre of mass on the optical centre (default).
 * "box": its bounding box on the tile's centre (shown in the gallery as the comparison).
 */
export function tilePlacement(cut: MarkCut, centring: "optical" | "box" = "optical") {
  const s = APP_TILE.markWidth / (cut.ink.x1 - cut.ink.x0);
  if (centring === "box") {
    const cx = (cut.ink.x0 + cut.ink.x1) / 2;
    const cy = (cut.ink.y0 + cut.ink.y1) / 2;
    return { s, tx: 50 - cx * s, ty: 50 - cy * s };
  }
  return { s, tx: 50 - cut.centroid.x * s, ty: 50 - APP_TILE.lift - cut.centroid.y * s };
}

export interface AppIconProps {
  /** Side in px. Default 64. */
  readonly size?: number;
  readonly className?: string;
  /** "stage": the navy tile (the app icon). "paper": a white tile with a hairline edge. */
  readonly surface?: AppIconSurface;
  /** Gallery only: compare optical and box centring. */
  readonly centring?: "optical" | "box";
  readonly title?: string;
}

/**
 * The app-icon tile: the mark optically centred on the stage, with quiet contour hairlines at large sizes. Colours from
 * tokens. Up to 32 px it is the favicon drawing (pixel-snapped, a larger mark, no contours), so small slots stay crisp.
 */
export function AppIcon({ size = 64, className, surface = "stage", centring = "optical", title }: AppIconProps) {
  const clip = useId();
  const stage = surface === "stage";
  const small = size <= APP_TILE.smallUpTo && centring === "optical";
  const tileFill = { fill: stage ? "var(--color-stage)" : "var(--color-sheet)" };
  const ink = { color: stage ? "var(--color-on-stage)" : "var(--color-ink)" };
  const a11y = {
    "aria-hidden": title === undefined ? true : undefined,
    "aria-label": title,
    role: title === undefined ? undefined : "img",
  } as const;

  if (small) {
    const c = pickFaviconCut(size);
    return (
      <svg {...a11y} className={className} fill="none" height={size} style={{ flex: "none" }} viewBox={`0 0 ${c.vb} ${c.vb}`} width={size}>
        <rect height={c.vb} rx={c.rx} style={tileFill} width={c.vb} />
        {stage ? null : <rect height={c.vb - 1} rx={c.rx - 0.5} style={{ stroke: "var(--color-line)" }} width={c.vb - 1} x="0.5" y="0.5" />}
        <g style={ink}>
          <MarkShape cut={c} />
        </g>
      </svg>
    );
  }

  const cut = pickCut(size * 0.62);
  const p = tilePlacement(cut, centring);
  // a quiet hill in the upper start corner (RTL: top right), as on the Darb boards; stage only, from 88 px
  const contours = stage && size >= APP_TILE.contoursFrom;
  return (
    <svg {...a11y} className={className} fill="none" height={size} style={{ flex: "none" }} viewBox="0 0 100 100" width={size}>
      <defs>
        <clipPath id={clip}>
          <rect height="100" rx={APP_TILE.radius} width="100" />
        </clipPath>
      </defs>
      <rect height="100" rx={APP_TILE.radius} style={tileFill} width="100" />
      {contours ? (
        <g clipPath={`url(#${clip})`} strokeWidth={0.6} style={{ stroke: "var(--color-stage-contour-2)" }}>
          {[9, 17, 25, 33].map((r, i) => (
            <ellipse cx={+(92 - i * 0.8).toFixed(2)} cy={+(6 + i * 0.6).toFixed(2)} key={r} rx={+(r * 1.12).toFixed(2)} ry={+(r * 0.92).toFixed(2)} transform="rotate(-14 92 6)" />
          ))}
        </g>
      ) : null}
      {stage ? null : <rect height="99" rx={APP_TILE.radius - 0.5} style={{ stroke: "var(--color-line)" }} width="99" x="0.5" y="0.5" />}
      <g style={ink} transform={`translate(${p.tx} ${p.ty}) scale(${p.s})`}>
        <MarkShape cut={cut} />
      </g>
    </svg>
  );
}
