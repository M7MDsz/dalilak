// Dalilak avatars: the colours.
//
// Two kinds of colour live here, and the difference is a rule (docs/DESIGN-BRIEF.md 1.4, 3.3 and section 4):
//  1. PALETTE colours (grounds, the trail, brand-blue garments, the outline, the level ring) are CSS variables of the
//     NEUTRAL design tokens (paper, sunk, contour, ink, stage), so a palette swap in globals.css repaints every avatar.
//     They are written as `var(--color-…)` or a `color-mix()` of them. Semantic tokens are never decoration here: no
//     accent-soft, ok, warn or xp in a ground or a garment. The accent appears exactly once per figure, as the waypoint
//     pin; the XP gold appears only in the level ring's top tiers (level-ring.tsx).
//  2. PEOPLE colours (skin, hair, eyes, mouth) and FIXED cloth (white thobe and ghutra, cream, black abaya, the forest
//     parka, the teal knit, camel, leather, the shemagh red, the iqal) are a small palette of our own, declared once here
//     and nowhere else. They are clothes and people, not brand signals, so they stay put when the palette changes.
// If the design system ever adds illustration tokens (for example --color-ground-1..6), `grounds` is the one place to
// switch to them.

/** A colour that follows the design tokens (neutral roles only, plus the accent for the pin). */
export const tok = {
  paper: "var(--color-paper)",
  sheet: "var(--color-sheet)",
  sunk: "var(--color-sunk)",
  contour: "var(--color-contour)",
  contour2: "var(--color-contour-2)",
  contourInk: "var(--color-contour-ink)",
  ink: "var(--color-ink)",
  stage2: "var(--color-stage-2)",
  stage3: "var(--color-stage-3)",
  onStage3: "var(--color-on-stage-3)",
  accent: "var(--color-accent)",
} as const;

/** `color-mix` of two colours: `pct` percent of `a`, the rest `b` (both may be token variables or fixed colours). */
export const mix = (a: string, pct: number, b: string): string => `color-mix(in oklab, ${a} ${pct}%, ${b})`;

/** Fixed marks used across the set. */
export const marks = {
  white: "#FFFFFF",
  eye: "#1A1513",
  mouth: "#5A2420",
  teeth: "#FFFFFF",
  iqal: "#15171C",
  shemagh: "#B4232D",
  metal: "#C99A3E",
  frame: "#1A1513",
} as const;

/** A round ground and the trail that runs across it behind the figure. */
export interface Ground {
  readonly fill: string;
  /** The trail's tone: solid on the start side, dotted on the other. */
  readonly trail: string;
  /** true for the dark ground: it gets a rim that flips with the surface so it keeps its round edge on the stage. */
  readonly dark: boolean;
}

/** Five grounds, all from neutral tokens: three light blues, one deeper blue, one night. */
export const grounds = {
  ice: { fill: tok.sunk, trail: mix(tok.contourInk, 60, tok.sunk), dark: false },
  sky: { fill: tok.contour, trail: mix(tok.contourInk, 66, tok.contour), dark: false },
  dusk: { fill: mix(tok.contour2, 70, tok.contour), trail: mix(tok.ink, 52, tok.contour2), dark: false },
  night: { fill: mix(tok.stage3, 80, tok.stage2), trail: mix(tok.onStage3, 62, tok.stage3), dark: true },
} as const satisfies Record<string, Ground>;

/** Skin: five tones, each with a shade (neck, ears), a line (nose) and a warm cheek. */
export interface Skin {
  readonly base: string;
  readonly shade: string;
  readonly line: string;
  readonly cheek: string;
}

export const skin = {
  s1: { base: "#F6D2B4", shade: "#E7B794", line: "#C98E6B", cheek: "#F2AE96" },
  s2: { base: "#EBB993", shade: "#D99D76", line: "#B87652", cheek: "#E49A7E" },
  s3: { base: "#D29A6E", shade: "#BC8157", line: "#98603C", cheek: "#C97F62" },
  s4: { base: "#B07650", shade: "#97603D", line: "#77462A", cheek: "#A9654A" },
  s5: { base: "#7E4F33", shade: "#6A4029", line: "#4B2C1B", cheek: "#8A4E36" },
} as const satisfies Record<string, Skin>;

/** Hair and beard. `sheen` draws the strand contours on top of the mass. */
export const hair = {
  black: { base: "#1C1714", sheen: "#3E332D" },
  espresso: { base: "#2F211A", sheen: "#5A4134" },
  chestnut: { base: "#4A2E20", sheen: "#74503B" },
} as const;

/** Fixed cloth. `fold` is the contour line on that cloth; some cloths carry a third tone for a rim, cuff or shade. */
export const cloth = {
  white: { base: "#FBFCFE", fold: "#C9D2DE" },
  cream: { base: "#F4ECDF", fold: "#D6C8B2" },
  fleece: { base: "#F1E7D6", fold: "#D3C2A6" },
  camel: { base: "#C98F52", fold: "#A6703A" },
  leather: { base: "#83522F", fold: "#663D20", shade: "#5B361C" },
  forest: { base: "#2C7357", fold: "#1F5A43", rim: "#5F9C80", shade: "#163D2F" },
  teal: { base: "#1E7477", fold: "#155759", cuff: "#17605F" },
  black: { base: "#1D2028", fold: "#4A5162" },
  charcoal: { base: "#2B2F39", fold: "#4F5565" },
} as const;
