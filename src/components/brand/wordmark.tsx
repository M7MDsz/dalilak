import { WORDMARK } from "./geometry";
import { type LogoTone, waypointStyle } from "./mark";

/** Half a unit of air so antialiased edges are never clipped. */
const PAD = 0.75;
const VB = {
  x: WORDMARK.ink.x0 - PAD,
  y: WORDMARK.ink.y0 - PAD,
  w: WORDMARK.ink.x1 - WORDMARK.ink.x0 + PAD * 2,
  h: WORDMARK.ink.y1 - WORDMARK.ink.y0 + PAD * 2,
};

/** Width / height of the Wordmark box. */
export const WORDMARK_RATIO = VB.w / VB.h;

/**
 * From this height (px) the standalone wordmark shows the ي's leading dot as the waypoint, in the accent. Below it the
 * two dots are under 6 px apart and would merge into one two-tone speck, so the word is all ink.
 */
export const WORDMARK_ACCENT_FROM = 48;

/** "auto" (default): the accent ي from 48 px tall, all ink below. "accent" / "mono" force one form. */
export type WordmarkTone = LogoTone | "auto";

/**
 * The word's drawing in its own units (1 em = 100, baseline 0): place it with a transform inside any SVG.
 * Both ي dots are circles of one radius; tone "accent" lights the leading one, "mono" keeps both in the ink.
 */
export function WordShape({ tone = "accent" }: { readonly tone?: LogoTone }) {
  const { dot, inkDot } = WORDMARK;
  return (
    <>
      <path d={WORDMARK.body} fill="currentColor" />
      <circle cx={inkDot.cx} cy={inkDot.cy} fill="currentColor" r={inkDot.r} />
      <circle cx={dot.cx} cy={dot.cy} r={dot.r} style={waypointStyle(tone)} />
    </>
  );
}

export interface WordmarkProps {
  /** Rendered height in px: from the top of ل/ك to the bottom of the ي's dots. Default 32. */
  readonly height?: number;
  readonly className?: string;
  /** Default "auto": the accent waypoint on the ي from 48 px tall, all ink below. */
  readonly tone?: WordmarkTone;
  /** Accessible name. Default «دليلك». Pass "" to make it decorative. */
  readonly title?: string;
}

/**
 * «دليلك» set in IBM Plex Sans Arabic Bold, as outlines, so it renders the same everywhere (no font load, no shaping
 * differences). One custom detail: the ي's dots are two equal circles, and from 48 px the leading one is the waypoint,
 * in the accent. Ink from currentColor.
 */
export function Wordmark({ height = 32, className, tone = "auto", title = "دليلك" }: WordmarkProps) {
  const decorative = title === "";
  const resolved: LogoTone = tone === "auto" ? (height >= WORDMARK_ACCENT_FROM ? "accent" : "mono") : tone;
  return (
    <svg
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      className={className}
      data-tone={resolved}
      fill="none"
      height={height}
      role={decorative ? undefined : "img"}
      style={{ flex: "none" }}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      width={+(height * WORDMARK_RATIO).toFixed(2)}
    >
      <WordShape tone={resolved} />
    </svg>
  );
}
