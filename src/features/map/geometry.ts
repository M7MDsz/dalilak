// Owner: map. The whole drawing of the map sheet, computed from the roadmap and the sheet's size. Pure and deterministic:
// no React, no DOM, no randomness, nothing hand-placed for one path. The trail is ONE curve (a straight climb with a gentle
// sway); every coin, label anchor, ground shadow, terrace edge, altitude mark, branch and opening delay is derived from it,
// for 6 to 11 stages plus the start gate, the start and the goal, on a 366 px phone sheet and on a wide desktop sheet.
// Ported from design/explore/darb/map/final-home.build.mjs (the approved page) and generalised from its one demo path.
import type { Roadmap, RoadmapStage } from "@/lib/types";

export interface SheetSize {
  readonly width: number;
  readonly height: number;
}

/** How a station is drawn: covered, the one lit step, or the way ahead (upcoming and locked share the look). */
export type StationLook = "done" | "now" | "ahead";
export type OpenForm = "full" | "short" | "catch-up";

export interface StationGeo {
  /** "gate" or "s{n}". */
  readonly key: string;
  readonly kind: "gate" | "stage";
  readonly stage: RoadmapStage | null;
  readonly look: StationLook;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Seconds after the opening starts at which this station settles, per form. */
  readonly t: Readonly<Record<OpenForm, number>>;
}

export interface Band {
  readonly d: string;
  /** 0 = the ground beyond the trailhead … 5 = the white cap at 100%. */
  readonly tint: number;
}

export interface Timeline {
  /** The camera levelling (full form only; 0 otherwise). */
  readonly cam: number;
  readonly terrainD: number;
  readonly start: number;
  readonly fill0: number;
  readonly fillD: number;
  readonly you: number;
  readonly youD: number;
  /** The match count in the «أنت هنا» tag and the ring: start and duration. 0 duration = no count in this form. */
  readonly count: number;
  readonly countD: number;
  readonly leg0: number;
  readonly legD: number;
  readonly now: number;
  readonly nowLabel: number;
  readonly ahead0: number;
  readonly aheadD: number;
  readonly flag: number;
  readonly summitLabel: number;
  readonly branches: number;
  /** When everything rests. */
  readonly rest: number;
}

export interface MapGeometry {
  readonly width: number;
  readonly height: number;
  /** The phone sheet (narrow): smaller coins and type, branch labels under their peaks, the card is a bottom sheet. */
  readonly small: boolean;
  /** Many stations for this height: labels stay on one line and drop their second line. */
  readonly dense: boolean;
  /**
   * Labels have room for their extras: the lit station's second line (hours, XP, the match it reaches) and a locked
   * stage's reason. The labels hang left of the trail; on the phone sheet and on a narrow wide sheet (beside the docked
   * panel at 1280 px) that room is too short, so they keep one line and never run off the sheet.
   */
  readonly roomy: boolean;
  readonly start: { readonly x: number; readonly y: number; readonly r: number };
  readonly summit: { readonly x: number; readonly y: number; readonly r: number };
  /** The waypoint «أنت هنا». At 100% it is the summit itself. */
  readonly you: { readonly x: number; readonly y: number; readonly atSummit: boolean };
  readonly stations: readonly StationGeo[];
  /** The road bed from the start to the summit, then its three legs: covered (solid), your next leg, the way ahead. */
  readonly dRoad: string;
  readonly dSolid: string;
  readonly dLeg: string;
  readonly dAhead: string;
  readonly road: number;
  readonly dot: number;
  readonly terrain: {
    readonly bleed: readonly [number, number, number];
    readonly cliff: number;
    readonly bands: readonly Band[];
    readonly hairs: readonly string[];
    readonly crosses: string;
    readonly marks: readonly { readonly x: number; readonly y: number; readonly pct: number }[];
  };
  readonly peaks: readonly { readonly x: number; readonly y: number; readonly d: string }[];
  readonly flag: { readonly w: number; readonly h: number; readonly pen: number };
  readonly youH: number;
  /**
   * The trailhead sign «مسارك نحو …». It has one place, the bottom-right corner of a wide sheet (where the approved page
   * draws it), and is shown only when nothing of the trail, its coins or «أنت هنا» reaches that corner; `maxWidth` is the
   * room it has there. Null on the phone sheet (the target header sits right above the map there) and whenever the
   * corner is taken, so it never jumps to another corner and never covers the trail.
   */
  readonly sign: { readonly maxWidth: number } | null;
  /** The station flight: where the pressed station lands in the window, the pitch, how close, and how big billboards stay. */
  readonly focus: { readonly x: number; readonly y: number; readonly pitch: number; readonly scale: number; readonly keep: number; readonly perspective: number };
  readonly timeline: Readonly<Record<OpenForm, Timeline>>;
  /** Points of the trail from the start to «أنت هنا», for the marker's travel in catch-up. */
  readonly youTravel: readonly (readonly [number, number])[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const mid = (a: number, b: number) => (a + b) / 2;

/** A cubic-bezier easing, solved for "the time at which the eased output reaches `out`" (coins settle as the line passes). */
function bezierTimeAt(x1: number, y1: number, x2: number, y2: number, out: number): number {
  const c = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (c(m, y1, y2) < out) lo = m;
    else hi = m;
  }
  return c((lo + hi) / 2, x1, x2);
}
/** The road's fill: cubic-bezier(.4, 0, .3, 1). */
export const FILL_EASE = [0.4, 0, 0.3, 1] as const;
const fillTimeAt = (out: number) => bezierTimeAt(FILL_EASE[0], FILL_EASE[1], FILL_EASE[2], FILL_EASE[3], clamp(out, 0, 1));

// ── The contour ring (the Darb blob), flattened once ─────────────────────────────────────────────────────────────────

type Seg = readonly [number, number, number, number, number, number];
const BLOB_START = [100, 0] as const;
const BLOB: readonly Seg[] = [
  [100, 45, 70, 85, 20, 95],
  [-30, 105, -80, 80, -98, 30],
  [-112, -10, -90, -60, -50, -85],
  [-10, -108, 40, -100, 70, -75],
  [92, -55, 100, -30, 100, 0],
];
const RING = { ox: 0.1, oy: 0.17, a: 1.5, b: 1, rot: (-8 * Math.PI) / 180 };

/** No two contours are the same: each ring leans and widens a little differently, like real ground. */
function ringPoint(u: number, v: number, k: number, sx: number, sy: number): [number, number] {
  const wob = Math.sin(k * 1.7 + 0.6);
  const wob2 = Math.sin(k * 2.9 + 2);
  const x = (RING.a + 0.13 * wob) * u * k;
  const y = RING.b * v * k;
  const rot = RING.rot + 0.11 * wob2;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [sx + RING.ox * 100 * k + x * c - y * s, sy + RING.oy * 100 * k + x * s + y * c];
}

/** Where the unit ring (k = 1, summit at 0,0) crosses the line straight below the summit. */
const RING_D1 = (() => {
  let best = 0;
  let px: number = BLOB_START[0];
  let py: number = BLOB_START[1];
  for (const seg of BLOB) {
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const u = 1 - t;
      const bx = u * u * u * px + 3 * u * u * t * seg[0] + 3 * u * t * t * seg[2] + t * t * t * seg[4];
      const by = u * u * u * py + 3 * u * u * t * seg[1] + 3 * u * t * t * seg[3] + t * t * t * seg[5];
      const q = ringPoint(bx, by, 1, 0, 0);
      if (Math.abs(q[0]) < 2.5 && q[1] > best) best = q[1];
    }
    px = seg[4];
    py = seg[5];
  }
  return best;
})();

/** The ring that crosses the trail `d` px below the summit. */
function ringPath(d: number, sx: number, sy: number): string {
  const k = d / RING_D1;
  const P = (u: number, v: number) => {
    const q = ringPoint(u, v, k, sx, sy);
    return `${r1(q[0])} ${r1(q[1])}`;
  };
  return `M${P(BLOB_START[0], BLOB_START[1])}${BLOB.map((s) => `C${P(s[0], s[1])} ${P(s[2], s[3])} ${P(s[4], s[5])}`).join("")}Z`;
}

// ── Terraces: altitude is the match ──────────────────────────────────────────────────────────────────────────────────

/**
 * Which match levels become terraces (at most five flat tones above the ground): always the cap at 100, the level where
 * the user stands, the level the next station reaches; then, walking down from where the user stands and up from the
 * next station, every level at least 20 points from the last one chosen. Data analyst after the sample CV
 * (10, 20, 30, 50, 60, 70, 90, 100; standing at 70): 30, 50, 70, 90, 100.
 */
export function pickTerraces(levels: readonly number[], match: number, next: number | null): number[] {
  const pcts = [...new Set(levels.filter((p) => p > 0))].sort((a, b) => a - b);
  const chosen = new Set<number>();
  if (pcts.includes(100)) chosen.add(100);
  if (match > 0 && pcts.includes(match)) chosen.add(match);
  if (next !== null && next > match && pcts.includes(next)) chosen.add(next);
  let last = match;
  for (const p of [...pcts].reverse()) {
    if (chosen.size >= 5) break;
    if (p >= match) continue;
    if (last - p >= 20 && p >= 15) {
      chosen.add(p);
      last = p;
    }
  }
  let lastUp = Math.max(match, next ?? 0);
  for (const p of pcts) {
    if (chosen.size >= 5) break;
    if (p <= lastUp || p >= 100) continue;
    if (p - lastUp >= 20) {
      chosen.add(p);
      lastUp = p;
    }
  }
  return [...chosen].sort((a, b) => a - b);
}

// ── Vertical rhythm ──────────────────────────────────────────────────────────────────────────────────────────────────

interface Node {
  readonly key: string;
  readonly kind: "gate" | "stage";
  readonly stage: RoadmapStage | null;
  readonly look: StationLook;
}

function nodesOf(roadmap: Roadmap): Node[] {
  const nodes: Node[] = [];
  if (roadmap.gate === "current") nodes.push({ key: "gate", kind: "gate", stage: null, look: "now" });
  for (const stage of roadmap.stages) {
    nodes.push({ key: `s${stage.n}`, kind: "stage", stage, look: stage.state === "done" ? "done" : stage.state === "current" ? "now" : "ahead" });
  }
  return nodes;
}

/** The past is compact, the present has room: the leg that holds «أنت هنا» is a fixed length, the rest share the climb. */
function rhythm(nodes: readonly Node[], small: boolean) {
  const fixedNow = small ? 90 : 108;
  const w = small ? { first: 0.7, done: 1, afterNow: 1.4, ahead: 1.2, toSummit: 1.2 } : { first: 0.8, done: 1, afterNow: 1.45, ahead: 1.25, toSummit: 1.3 };
  let fixed = 0;
  let weight = 0;
  const gaps = nodes.map((node, i) => {
    const prev = nodes[i - 1];
    if (node.look === "now") {
      fixed += fixedNow;
      return { fixed: fixedNow, weight: 0 };
    }
    const g = prev === undefined ? w.first : prev.look === "now" ? w.afterNow : node.look === "done" ? w.done : w.ahead;
    weight += g;
    return { fixed: 0, weight: g };
  });
  const lastNode = nodes[nodes.length - 1];
  const toSummit = lastNode !== undefined && lastNode.look === "now" ? w.afterNow : w.toSummit;
  weight += toSummit;
  return { gaps, fixed, weight, toSummit };
}

/**
 * The leg after the lit station is never shorter than this. The lit station's label is a three-line card centred on its
 * coin; the label above it (the next stage's, or the goal's «جاهز للوظيفة» with the job title) must sit clear of the
 * card's top edge, also on a short sheet (beside the docked advisor panel), so the goal never reads as struck through.
 */
const minAfterNow = (small: boolean) => (small ? 60 : 84);

/**
 * Every leg's length in px for one unit (the weighted share), with the leg after the lit station held to its minimum.
 * `fit` = the span the legs must fill: the unit is solved for it (the held leg leaves the shared pool). Index i < nodes
 * is the leg that ends at node i; the last entry is the leg from the last node to the summit.
 */
function legs(nodes: readonly Node[], small: boolean, size: { readonly unit: number } | { readonly fit: number }): { readonly unit: number; readonly lengths: readonly number[] } {
  const r = rhythm(nodes, small);
  const fixeds = [...r.gaps.map((g) => g.fixed), 0];
  const weights = [...r.gaps.map((g) => g.weight), r.toSummit];
  const solve = (fixed: number, weight: number) => ("unit" in size ? size.unit : Math.max(8, (size.fit - fixed) / weight));
  let unit = solve(r.fixed, r.weight);
  const nowIndex = nodes.findIndex((n) => n.look === "now");
  const held = nowIndex >= 0 ? nowIndex + 1 : -1;
  const heldWeight = weights[held];
  const min = minAfterNow(small);
  if (heldWeight !== undefined && heldWeight > 0 && heldWeight * unit < min) {
    fixeds[held] = min;
    weights[held] = 0;
    unit = solve(r.fixed + min, r.weight - heldWeight);
  }
  return { unit, lengths: fixeds.map((f, i) => f + (weights[i] ?? 0) * unit) };
}

const padTop = (small: boolean) => (small ? 88 : 124);
const padBottom = (small: boolean) => (small ? 20 : 26);

/** The lowest sheet that still gives every station room to be pointed at (11 stages on a phone need more than one screen). */
export function minSheetHeight(roadmap: Roadmap, small: boolean): number {
  const { lengths } = legs(nodesOf(roadmap), small, { unit: small ? 37 : 40 });
  return Math.ceil(padTop(small) + padBottom(small) + lengths.reduce((a, b) => a + b, 0));
}

/** The trailhead sign's corner: its inset from the sheet's edges, the height it may take, the room it needs. */
const SIGN = { inset: 18, height: 118, minWidth: 250, maxWidth: 272 } as const;

// ── The sheet ────────────────────────────────────────────────────────────────────────────────────────────────────────

export function buildGeometry(roadmap: Roadmap, size: SheetSize): MapGeometry {
  const W = size.width;
  const H = size.height;
  const small = W < 560;
  const cx = W * (small ? 0.625 : 0.583);
  const yT = padTop(small);
  const yS = H - padBottom(small);
  const span = yS - yT;
  const amp = small ? 13 : clamp(W * 0.03, 16, 24);
  const sway = (y: number) => {
    const t = (yS - y) / span;
    return cx + amp * (0.82 * Math.sin(2 * Math.PI * (t * 1.12 + 0.07)) + 0.3 * Math.sin(2 * Math.PI * (t * 2.5 + 0.33)));
  };

  const nodes = nodesOf(roadmap);
  const { unit, lengths } = legs(nodes, small, { fit: span });
  const dense = unit < (small ? 44 : 46);
  const rDone = clamp(unit * 0.45, 13, 20);
  const rAhead = Math.min(rDone + 1, small ? 20 : 21);
  const rNow = small ? (dense ? 22 : 24) : dense ? 25 : 27;
  // the lit station's card label is ~330 px wide with its second line: it must fit between the sheet's edge and the coin
  const roomy = !small && cx - amp - rNow - 20 - 8 >= 340;

  let y = yS;
  const placed = nodes.map((node, i) => {
    y -= lengths[i] ?? unit;
    return { ...node, y: r1(y), x: r1(sway(y)), r: r1(node.look === "now" ? rNow : node.look === "done" ? rDone : rAhead) };
  });

  const start = { x: r1(sway(yS)), y: yS, r: small ? 7 : 9 };
  const summit = { x: r1(sway(yT)), y: yT, r: small ? 12 : 15 };
  const nowIndex = placed.findIndex((p) => p.look === "now");
  const now = nowIndex >= 0 ? placed[nowIndex] : undefined;
  const prevOfNow = nowIndex > 0 ? placed[nowIndex - 1] : undefined;
  const prevY = prevOfNow !== undefined ? prevOfNow.y : yS;
  const wayY = now !== undefined ? r1(prevY - (prevY - now.y) * 0.47) : yT;
  const you = { x: r1(sway(wayY)), y: wayY, atSummit: now === undefined };

  // the trail as a fine polyline, bottom to top
  const poly = (ya: number, yb: number): [number, number][] => {
    const out: [number, number][] = [];
    const n = Math.max(2, Math.ceil((ya - yb) / 3));
    for (let i = 0; i <= n; i++) {
      const yy = ya - ((ya - yb) * i) / n;
      out.push([sway(yy), yy]);
    }
    return out;
  };
  const dOf = (p: readonly (readonly [number, number])[]) => p.map((q, i) => `${i ? "L" : "M"}${r1(q[0])} ${r1(q[1])}`).join("");
  const lenOf = (p: readonly (readonly [number, number])[]) =>
    p.reduce((a, q, i) => {
      const before = p[i - 1];
      return before === undefined ? 0 : a + Math.hypot(q[0] - before[0], q[1] - before[1]);
    }, 0);

  // Covered ground is solid as far as the user has climbed. Normally that is «أنت هنا»; when a station before the lit
  // one is not done (the engine may light a later, startable stage), the solid line stops at the last done station.
  const beforeNow = nowIndex >= 0 ? placed.slice(0, nowIndex) : placed;
  const allDoneBefore = beforeNow.every((p) => p.look === "done");
  const lastDone = [...beforeNow].reverse().find((p) => p.look === "done");
  const solidEndY = now === undefined ? yT : allDoneBefore ? wayY : lastDone !== undefined ? lastDone.y : yS;
  const solid = poly(yS, solidEndY);
  const leg = now !== undefined ? poly(wayY, now.y) : [];
  const aheadParts: [number, number][][] = [];
  if (now !== undefined) {
    if (solidEndY - wayY > 1) aheadParts.push(poly(solidEndY, wayY));
    aheadParts.push(poly(now.y, yT));
  }
  const lenSolid = Math.max(1, lenOf(solid));
  const aheadMain = aheadParts[aheadParts.length - 1] ?? [];
  const lenAhead = Math.max(1, lenOf(aheadMain));
  const fracSolid = (yy: number) => lenOf(poly(yS, Math.max(yy, solidEndY))) / lenSolid;
  const fracAhead = (yy: number) => (now === undefined ? 1 : lenOf(poly(now.y, yy)) / lenAhead);

  // ── the opening, all times in seconds (ONE place) ──
  const fillFull = clamp(lenSolid / 220, 0.35, 1.3);
  const aheadFull = clamp(lenAhead / 650, 0.55, 1.05);
  const youFull = Math.max(1.0, 0.4 + fillFull + 0.02);
  const hasNow = now !== undefined;
  const flagFull = hasNow ? youFull + 0.68 + aheadFull - 0.03 : youFull + 0.2;
  const full: Timeline = {
    cam: 1.25,
    terrainD: 0.5,
    start: 0.3,
    fill0: 0.4,
    fillD: fillFull,
    you: youFull,
    youD: 0.42,
    count: youFull + 0.04,
    countD: 0.85,
    leg0: youFull + 0.28,
    legD: 0.28,
    now: youFull + 0.42,
    nowLabel: youFull + 0.58,
    ahead0: youFull + 0.68,
    aheadD: aheadFull,
    flag: flagFull,
    summitLabel: flagFull + 0.1,
    branches: flagFull + 0.23,
    rest: Math.min(3.8, Math.max(2.6, flagFull + 0.58)),
  };
  const short: Timeline = {
    cam: 0,
    terrainD: 0.2,
    start: 0,
    fill0: 0.05,
    fillD: 0.55,
    you: 0.55,
    youD: 0.25,
    count: 0.55,
    countD: 0,
    leg0: 0.65,
    legD: 0.3,
    now: 0.7,
    nowLabel: 0.76,
    ahead0: 0.65,
    aheadD: 0.3,
    flag: 0.9,
    summitLabel: 0.9,
    branches: 0.9,
    rest: 1.1,
  };
  // catch-up: the road is already there; the covered line climbs, the CV's stations turn done as it passes, the marker
  // rides its tip, the match counts with it, then the next station answers. 2.3 s (the spec allows 2.4).
  const catchUp: Timeline = {
    cam: 0,
    terrainD: 0.2,
    start: 0,
    fill0: 0.15,
    fillD: 1.35,
    you: 0.15,
    youD: 1.35,
    count: 0.2,
    countD: 1.3,
    leg0: 1.55,
    legD: 0.25,
    now: 1.7,
    nowLabel: 1.84,
    ahead0: 0,
    aheadD: 0,
    flag: 0,
    summitLabel: 0,
    branches: 0,
    rest: 2.3,
  };

  let doneSeen = 0;
  const stations: StationGeo[] = placed.map((p, i) => {
    const before = nowIndex < 0 || i < nowIndex;
    const climbT = fillTimeAt(fracSolid(p.y));
    let tFull: number;
    let tShort: number;
    let tCatch: number;
    if (p.look === "now") {
      tFull = full.now;
      tShort = short.now;
      tCatch = catchUp.now;
    } else if (before) {
      tFull = full.fill0 + full.fillD * climbT - 0.06;
      tShort = 0.08 + doneSeen * 0.03;
      tCatch = p.look === "done" ? catchUp.fill0 + catchUp.fillD * climbT - 0.05 : 0;
      doneSeen += 1;
    } else {
      tFull = full.ahead0 + full.aheadD * fracAhead(p.y) - 0.04;
      tShort = 0.7 + 0.03 * (i - nowIndex);
      tCatch = 0;
    }
    return { key: p.key, kind: p.kind, stage: p.stage, look: p.look, x: p.x, y: p.y, r: p.r, t: { full: r1(tFull * 10) / 10, short: r1(tShort * 10) / 10, "catch-up": r1(tCatch * 10) / 10 } };
  });

  // ── terrain: a hill of flat terraces. Each terrace edge sits where the trail reaches that match ──
  const levels: { pct: number; y: number }[] = [];
  placed.forEach((p, i) => {
    if (p.stage === null) return;
    const next = placed[i + 1];
    const nextY = next !== undefined ? next.y : yT;
    const yCross = p.look !== "now" && next !== undefined && next.look === "now" ? wayY : p.look === "now" ? mid(p.y, nextY) - (small ? 0 : 2) : mid(p.y, nextY);
    if (!levels.some((l) => l.pct === p.stage?.matchAt)) levels.push({ pct: p.stage.matchAt, y: yCross });
  });
  const nextPct = now !== undefined && now.stage !== null ? now.stage.matchAt : null;
  const terraces = pickTerraces(
    levels.map((l) => l.pct),
    roadmap.match,
    nextPct,
  );
  const baseD = yS + 14 - yT;
  const rings: { d: number; tint: number; pct: number | null; y: number }[] = [{ d: baseD, tint: 0, pct: null, y: yS }];
  for (const l of levels) {
    const order = terraces.indexOf(l.pct);
    rings.push({ d: l.y - yT, tint: order >= 0 ? 5 - (terraces.length - 1 - order) : -1, pct: l.pct, y: l.y });
  }
  // texture: one hairline between the wide terraces, and the land falling away beyond the trailhead and behind the summit
  const sorted = rings.map((r) => r.d).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a !== undefined && b !== undefined && b - a > 70) rings.push({ d: mid(a, b), tint: -1, pct: null, y: 0 });
  }
  const innermost = sorted[0];
  if (innermost !== undefined) rings.push({ d: innermost * 0.45, tint: -1, pct: null, y: 0 });
  for (const extra of [70, 150, 250, 370, 520, 700, 920, 1200, 1550]) rings.push({ d: baseD + extra * (small ? 0.7 : 1), tint: -1, pct: null, y: 0 });
  rings.sort((a, b) => b.d - a.d);
  const cliff = small ? 3 : 4;
  const bands: Band[] = [];
  const hairs: string[] = [];
  for (const ring of rings) {
    if (ring.d <= 4) continue;
    const d = ringPath(ring.d, summit.x, summit.y);
    if (ring.tint >= 0) bands.push({ d, tint: clamp(ring.tint, 0, 5) });
    else hairs.push(d);
  }
  const marks = rings
    .filter((r) => r.tint > 0 && r.pct !== null && r.pct !== roadmap.match && r.pct !== 100)
    .map((r) => ({ x: r1(sway(r.y) + (small ? 13 : 17)), y: r1(r.y + cliff / 2), pct: r.pct ?? 0 }));
  const crosses = (
    [
      [0.09, 0.3],
      [0.09, 0.62],
      [0.92, 0.3],
      [0.92, 0.5],
    ] as const
  )
    .map(([fx, fy]) => `M${r1(W * fx - 5)} ${r1(H * fy)}h10M${r1(W * fx)} ${r1(H * fy - 5)}v10`)
    .join("");

  // ── branches: after the summit, clearly secondary ──
  const peakAt = small
    ? [
        { x: W * 0.262, y: 30 },
        { x: W * 0.869, y: 34 },
      ]
    : [
        { x: W * 0.331, y: 58 },
        { x: W * 0.904, y: 72 },
      ];
  const peaks = peakAt.map((p) => ({
    x: r1(p.x),
    y: p.y,
    d: `M${summit.x} ${summit.y}Q${r1(mid(summit.x, p.x))} ${r1(summit.y - (summit.y - p.y) * 0.25 - 14)} ${r1(p.x)} ${p.y + 6}`,
  }));

  const focus = small
    ? { x: r1(W * 0.41), y: 168, pitch: 52, scale: 1.7, keep: 1, perspective: 820 }
    : { x: r1(Math.max(W * 0.707, 22 + 348 + 150)), y: r1(H * 0.56), pitch: 54, scale: 1.9, keep: 1.05, perspective: 1100 };

  const travel = poly(yS, wayY).filter((_, i, all) => i % 4 === 0 || i === all.length - 1);

  // the trailhead sign's corner (bottom right): free when the road, every coin standing in that band and «أنت هنا» stay
  // left of it; the room it gets is what is left there
  const road = small ? 12 : 14;
  const youH = small ? 38 : 48;
  let sign: { maxWidth: number } | null = null;
  if (!small) {
    const bandTop = H - SIGN.inset - SIGN.height;
    let reach = start.x + start.r;
    for (const [px, py] of poly(yS, Math.max(yT, bandTop - road))) if (py >= bandTop - road) reach = Math.max(reach, px + road / 2);
    for (const p of placed) if (p.y + p.r >= bandTop - 6) reach = Math.max(reach, p.x + p.r);
    const youInBand = !you.atSummit && you.y + youH / 2 + 8 >= bandTop;
    const room = Math.floor(W - SIGN.inset - reach - 20);
    if (!youInBand && room >= SIGN.minWidth) sign = { maxWidth: Math.min(SIGN.maxWidth, room) };
  }

  return {
    width: W,
    height: H,
    small,
    dense,
    roomy,
    start,
    summit,
    you,
    stations,
    dRoad: dOf(poly(yS, yT)),
    dSolid: solid.length > 1 && lenOf(solid) > 2 ? dOf(solid) : "",
    dLeg: leg.length > 1 ? dOf(leg) : "",
    dAhead: aheadParts.map(dOf).join(""),
    road,
    dot: small ? 9.6 : 11,
    terrain: { bleed: small ? [220, 420, 240] : [300, 640, 280], cliff, bands, hairs, crosses, marks },
    peaks,
    flag: small ? { w: 32, h: 52, pen: 20 } : { w: 46, h: 74, pen: 28 },
    youH,
    sign,
    focus,
    timeline: { full, short, "catch-up": catchUp },
    youTravel: travel.map(([px, py]) => [r1(px), r1(py)] as const),
  };
}
