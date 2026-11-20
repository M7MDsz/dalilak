import { type MarkCut, WORDMARK } from "./geometry";
import { type LogoTone, MarkShape, pickCut } from "./mark";
import { WordShape } from "./wordmark";

/**
 * Lockup rules, in wordmark units (1 em = 100; the word's ascender is 74 high, its ink 95.5 high).
 * Horizontal: the mark on the right of the word (RTL: it is read first), its feet on the word's baseline, its ink as tall
 * as «ل» and «ك» (74); the gap is 0.46 of the mark.
 * Either lockup carries exactly ONE waypoint, the mark's: the word's ي dots are both ink here (the accent means "you are
 * here", and a logo is in one place).
 * Stacked: the mark centred over the word, 1.45 x the ascender, one inner window above the word.
 * Clear space around either lockup: half the mark's height, on every side.
 */
export const LOCKUP = {
  horizontal: { markInk: 74, gap: 0.46, overshoot: 0.012 },
  stacked: { markInk: 108, gap: 0.3 },
  clearSpace: 0.5,
} as const;

export type LogoLayout = "horizontal" | "stacked";

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface LockupGeometry {
  readonly viewBox: Box;
  readonly cut: MarkCut;
  /** transform of the mark drawing into lockup units */
  readonly mark: { readonly s: number; readonly tx: number; readonly ty: number };
  /** the mark's ink box in lockup units */
  readonly markBox: Box;
  /** the clear-space unit in lockup units */
  readonly clear: number;
}

export interface LockupParams {
  readonly markInk?: number;
  readonly gap?: number;
}

/** Where everything sits, for a given cut. Exported for the gallery's construction drawings. */
export function lockupGeometry(layout: LogoLayout, cut: MarkCut, params: LockupParams = {}): LockupGeometry {
  const W = WORDMARK.ink;
  const cutInkH = cut.ink.y1 - cut.ink.y0;
  const cutInkW = cut.ink.x1 - cut.ink.x0;
  if (layout === "horizontal") {
    const p = { ...LOCKUP.horizontal, ...params };
    const s = p.markInk / cutInkH;
    const w = cutInkW * s;
    const x0 = W.x1 + p.gap * p.markInk;
    const y1 = WORDMARK.baseline + LOCKUP.horizontal.overshoot * p.markInk;
    const y0 = y1 - p.markInk;
    const top = Math.min(W.y0, y0);
    const bottom = Math.max(W.y1, y1);
    return {
      viewBox: { x: W.x0, y: top, w: x0 + w - W.x0, h: bottom - top },
      cut,
      mark: { s, tx: x0 - cut.ink.x0 * s, ty: y0 - cut.ink.y0 * s },
      markBox: { x: x0, y: y0, w, h: p.markInk },
      clear: LOCKUP.clearSpace * p.markInk,
    };
  }
  const p = { ...LOCKUP.stacked, ...params };
  const s = p.markInk / cutInkH;
  const w = cutInkW * s;
  // centre the mark's centre of mass (not its box) over the word's ink centre
  const cx = (W.x0 + W.x1) / 2;
  const x0 = cx - (cut.centroid.x - cut.ink.x0) * s;
  const y1 = W.y0 - p.gap * p.markInk;
  const y0 = y1 - p.markInk;
  const left = Math.min(W.x0, x0);
  const right = Math.max(W.x1, x0 + w);
  return {
    viewBox: { x: left, y: y0, w: right - left, h: W.y1 - y0 },
    cut,
    mark: { s, tx: x0 - cut.ink.x0 * s, ty: y0 - cut.ink.y0 * s },
    markBox: { x: x0, y: y0, w, h: p.markInk },
    clear: LOCKUP.clearSpace * p.markInk,
  };
}

/** Px size of the square box the mark would have at this lockup height (to choose the right cut). */
function markBoxPx(layout: LogoLayout, heightPx: number, params: LockupParams): number {
  const g = lockupGeometry(layout, pickCut(999), params);
  const inkPx = (g.markBox.h / g.viewBox.h) * heightPx;
  return inkPx * (64 / 43);
}

export interface LogoProps {
  readonly layout?: LogoLayout;
  /** Rendered height of the whole lockup in px; the width follows. Default 32. */
  readonly size?: number;
  readonly className?: string;
  readonly tone?: LogoTone;
  /** Accessible name. Default «دليلك». Pass "" to make it decorative. */
  readonly title?: string;
  /** Gallery only: try other proportions. */
  readonly params?: LockupParams;
}

const PAD = 0.75;

/**
 * The logo: mark and wordmark «دليلك» in one drawing, horizontal (mark on the right) or stacked. One waypoint only: the
 * mark's (accent, or ink with tone="mono"); the word is all ink.
 */
export function Logo({ layout = "horizontal", size = 32, className, tone = "accent", title = "دليلك", params = {} }: LogoProps) {
  const cut = pickCut(markBoxPx(layout, size, params));
  const g = lockupGeometry(layout, cut, params);
  const vb = { x: g.viewBox.x - PAD, y: g.viewBox.y - PAD, w: g.viewBox.w + PAD * 2, h: g.viewBox.h + PAD * 2 };
  const decorative = title === "";
  return (
    <svg
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      className={className}
      data-cut={cut.vb}
      fill="none"
      height={size}
      role={decorative ? undefined : "img"}
      style={{ flex: "none" }}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width={+((size * vb.w) / vb.h).toFixed(2)}
    >
      <WordShape tone="mono" />
      <g transform={`translate(${g.mark.tx} ${g.mark.ty}) scale(${g.mark.s})`}>
        <MarkShape cut={cut} tone={tone} />
      </g>
    </svg>
  );
}
