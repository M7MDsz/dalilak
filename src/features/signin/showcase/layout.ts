// Owner: signin. The desktop showcase composition, in design units (CSS px of a W x H box that is scaled as one piece to
// fit the stage). One trail climbs from the stage's bottom edge to the summit through six waypoints; each waypoint has a
// numbered caption and a real product piece beside it, on alternating sides, in the spec's order (3.1: 1 at the foot,
// 6 near the top). Pure: no React, no DOM. SVG is never mirrored, so x here is physical (0 = left).

export const BOX = { w: 880, h: 860 } as const;

export type Pt = { readonly x: number; readonly y: number };

export type Side = "left" | "right";

export interface Slot {
  /** The waypoint on the trail. */
  readonly at: Pt;
  readonly side: Side;
  /** The card's box (top-left corner and width); the caption sits above it. */
  readonly card: { readonly x: number; readonly y: number; readonly w: number };
  /** Where the leader line meets the card, measured down from the card's top. */
  readonly anchor: number;
}

export const COL_W = 312;
const LEFT_X = 22;
const RIGHT_X = BOX.w - 22 - COL_W;

/** A waypoint at (x, y) whose card hangs on the given side, its leader meeting the card `anchor` px below its top. */
function slot(side: Side, x: number, y: number, anchor: number): Slot {
  const cardX = side === "left" ? LEFT_X : RIGHT_X;
  return { at: { x, y }, side, card: { x: cardX, y: y - anchor, w: COL_W }, anchor };
}

/**
 * The six slots, piece 1 to piece 6. Right column: 1 (roadmap strip), 3 (skills), 5 (XP). Left column: 2 (match ring),
 * 4 (advisor), 6 (leaderboard). Card heights are fixed by the pieces themselves (no piece changes its height).
 */
export const SLOTS: readonly Slot[] = [
  slot("right", 498, 766, 36),
  slot("left", 380, 672, 44),
  slot("right", 503, 532, 70),
  slot("left", 377, 420, 44),
  slot("right", 494, 284, 44),
  slot("left", 387, 160, 42),
];

/** Where the trail enters (below the box: the stage clips it, so it rises out of the bottom edge) and the summit. */
export const TRAIL_START: Pt = { x: 458, y: BOX.h + 240 };
export const SUMMIT: Pt = { x: 446, y: 82 };

/** Caption block height above a card (the numbered caption line plus its gap). */
export const CAPTION_H = 40;

// ── The trail: a Catmull-Rom spline through start, the six waypoints and the summit, as one cubic Bézier per leg ──────

const POINTS: readonly Pt[] = [TRAIL_START, ...SLOTS.map((s) => s.at), SUMMIT];

type Leg = { readonly a: Pt; readonly c1: Pt; readonly c2: Pt; readonly b: Pt };

const TENSION = 0.92;

function legs(points: readonly Pt[]): Leg[] {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))] as Pt;
  const out: Leg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    out.push({
      a: p1,
      c1: { x: p1.x + ((p2.x - p0.x) / 6) * TENSION, y: p1.y + ((p2.y - p0.y) / 6) * TENSION },
      c2: { x: p2.x - ((p3.x - p1.x) / 6) * TENSION, y: p2.y - ((p3.y - p1.y) / 6) * TENSION },
      b: p2,
    });
  }
  return out;
}

const f = (n: number) => n.toFixed(2);
const cubic = (l: Leg) => `C ${f(l.c1.x)} ${f(l.c1.y)}, ${f(l.c2.x)} ${f(l.c2.y)}, ${f(l.b.x)} ${f(l.b.y)}`;

function bezierAt(l: Leg, t: number): Pt {
  const u = 1 - t;
  const x = u * u * u * l.a.x + 3 * u * u * t * l.c1.x + 3 * u * t * t * l.c2.x + t * t * t * l.b.x;
  const y = u * u * u * l.a.y + 3 * u * u * t * l.c1.y + 3 * u * t * t * l.c2.y + t * t * t * l.b.y;
  return { x, y };
}

function legLength(l: Leg, samples = 240): number {
  let len = 0;
  let prev = l.a;
  for (let i = 1; i <= samples; i++) {
    const p = bezierAt(l, i / samples);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

const LEGS = legs(POINTS);
const LENGTHS = LEGS.map((l) => legLength(l));
const TOTAL = LENGTHS.reduce((s, n) => s + n, 0);

/** Seven legs: start → waypoint 1, waypoint 1 → 2, …, waypoint 6 → summit. Each is drawn by its own Edge. */
export const LEG_PATHS: readonly string[] = LEGS.map((l) => `M ${f(l.a.x)} ${f(l.a.y)} ${cubic(l)}`);

/** The whole trail as one path: the spine the «أنت هنا» dot rides. */
export const SPINE_PATH = `M ${f(TRAIL_START.x)} ${f(TRAIL_START.y)} ${LEGS.map(cubic).join(" ")}`;

/** Fraction of the spine at the END of each leg (index 0 = waypoint 1, … 5 = waypoint 6, 6 = the summit). */
export const LEG_END: readonly number[] = LENGTHS.map((_, i) => LENGTHS.slice(0, i + 1).reduce((s, n) => s + n, 0) / TOTAL);

/** The leader line from a waypoint to its card's near edge. */
export function leaderPath(s: Slot): string {
  const edge = s.side === "left" ? s.card.x + s.card.w : s.card.x;
  const gap = 12; // the line stops short of the waypoint's disc
  const from = s.side === "left" ? s.at.x - gap : s.at.x + gap;
  return `M ${f(from)} ${f(s.at.y)} H ${f(edge)}`;
}
