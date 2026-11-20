// Owner: welcome. The geometry of the path sheet (the strip the reveal draws and the result keeps, spec 3.3), in CSS
// pixels of the sheet box. SVG is never mirrored: Arabic enters the geometry here, once.
//   climb (desktop): the map's own language. One straight climb with a gentle sway, «البداية» at the bottom, the
//                    trophy at the top; labels sit at the inline-end (left) of each station, as on the map.
//   rows  (phone):   spec 3.3 "the nodes of the path strip wrap onto two rows". Row 1 runs from the start at the right
//                    to the left, turns, and row 2 runs back to the trophy at the right. Labels alternate above and below
//                    their station, so each one has the width of two stations.

export type SheetLayout = "climb" | "rows";

export interface SheetNode {
  /** 0 = «البداية», 1..stages = the stages in canonical order, stages + 1 = the trophy. */
  readonly index: number;
  readonly kind: "start" | "stage" | "goal";
  readonly x: number;
  readonly y: number;
  /** Where the line reaches this node, as a fraction of the whole line (for "each named as it is reached"). */
  readonly at: number;
  /** The label box (physical px inside the sheet). */
  readonly label: { readonly left: number; readonly top: number; readonly width: number; readonly align: "start" | "center" | "end"; readonly side: "above" | "below" | "beside" };
}

export interface SheetGeometry {
  readonly layout: SheetLayout;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly SheetNode[];
  /** The line from the start through every stage to the trophy. */
  readonly d: string;
  /** Top of the footer (summary line and the CV line). */
  readonly footerTop: number;
}

/** Node sizes, shared with the drawing. */
export const NODE = { coin: 32, coinRows: 30, start: 20, goal: 46, goalRows: 42 } as const;

const CLIMB = { top: 52, startGap: 30, footer: 104, idealStep: 56, minStep: 38, labelGap: 22, labelPad: 18 } as const;
// labelZone: room for a two-line label above row 1 and between the rows; bottomZone: under row 2, where the trophy's
// title (up to two lines, the long job titles) sits
const ROWS = { pad: 22, turn: 22, row1: 76, rowGap: 136, labelZone: 58, bottomZone: 88, footer: 92 } as const;

/** A gentle, deterministic sway (two slow sines), so the climb is straight but alive, like the map's line. */
function sway(i: number, amp: number): number {
  return amp * (0.62 * Math.sin(i * 1.15 + 0.4) + 0.38 * Math.sin(i * 0.53 + 1.3));
}

/** Vertical S-curves through the points (vertical tangent at each station). */
function climbPath(points: readonly { x: number; y: number }[]): string {
  const [first, ...rest] = points;
  if (!first) return "";
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  let prev = first;
  for (const p of rest) {
    const my = (prev.y + p.y) / 2;
    d += ` C ${prev.x.toFixed(1)} ${my.toFixed(1)}, ${p.x.toFixed(1)} ${my.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    prev = p;
  }
  return d;
}

function fractions(points: readonly { x: number; y: number }[], extra: readonly number[] = []): number[] {
  // cumulative straight-line length (the curves are gentle: close enough for timing), `extra[i]` adds to segment i
  const seg: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    seg.push(Math.hypot(b.x - a.x, b.y - a.y) + (extra[i - 1] ?? 0));
  }
  const total = seg.reduce((s, v) => s + v, 0) || 1;
  const out = [0];
  let run = 0;
  for (const s of seg) {
    run += s;
    out.push(run / total);
  }
  return out;
}

/** The natural height of a climb sheet for `stages` stages, at the ideal step, capped by `maxHeight`. */
export function climbHeight(stages: number, maxHeight: number): number {
  const natural = CLIMB.top + CLIMB.idealStep * (stages + 1) + CLIMB.startGap + CLIMB.footer;
  const floor = CLIMB.top + CLIMB.minStep * (stages + 1) + CLIMB.startGap + CLIMB.footer;
  return Math.round(Math.max(floor, Math.min(natural, maxHeight)));
}

/** The height of a rows sheet (fixed: two rows and their label zones). */
export function rowsHeight(): number {
  return ROWS.row1 + ROWS.rowGap + ROWS.bottomZone + ROWS.footer;
}

export function sheetGeometry(layout: SheetLayout, stages: number, width: number, height: number): SheetGeometry {
  return layout === "climb" ? climbGeometry(stages, width, height) : rowsGeometry(stages, width);
}

function climbGeometry(stages: number, width: number, height: number): SheetGeometry {
  const count = stages + 2;
  const footerTop = height - CLIMB.footer;
  const startY = footerTop - CLIMB.startGap;
  const step = (startY - CLIMB.top) / (count - 1);
  // the road sits toward the inline-start (the right), labels run toward the inline-end (left), as on the map
  const roadX = width - Math.max(64, Math.min(92, width * 0.2));
  const amp = Math.min(9, width * 0.022);
  const points = Array.from({ length: count }, (_, i) => ({ x: roadX + sway(i, amp), y: startY - i * step }));
  const at = fractions(points);
  const nodes: SheetNode[] = points.map((p, i) => {
    const kind: SheetNode["kind"] = i === 0 ? "start" : i === count - 1 ? "goal" : "stage";
    const radius = kind === "goal" ? NODE.goal / 2 : kind === "start" ? NODE.start / 2 : NODE.coin / 2;
    const right = p.x - radius - CLIMB.labelGap + 6;
    const left = CLIMB.labelPad;
    return {
      index: i,
      kind,
      x: p.x,
      y: p.y,
      at: at[i] ?? 0,
      label: { left, top: p.y, width: Math.max(80, right - left), align: "start", side: "beside" },
    };
  });
  return { layout: "climb", width, height, nodes, d: climbPath(points), footerTop };
}

function rowsGeometry(stages: number, width: number): SheetGeometry {
  const count = stages + 2;
  const first = Math.ceil(count / 2);
  const second = count - first;
  const { pad, turn } = ROWS;
  const y1 = ROWS.row1;
  const y2 = ROWS.row1 + ROWS.rowGap;
  const inner = width - pad * 2 - turn; // the turn needs room at the inline-end (left)
  const step1 = first > 1 ? inner / (first - 1) : 0;
  const step2 = second > 1 ? inner / (second - 1) : 0;
  const points: { x: number; y: number }[] = [];
  for (let j = 0; j < first; j++) points.push({ x: width - pad - j * step1, y: y1 });
  for (let j = 0; j < second; j++) points.push({ x: pad + turn + j * step2, y: y2 });

  // the line: straight along each row, a tight U at the left between the rows
  let d = "";
  points.forEach((p, i) => {
    if (i === 0) d = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    else if (i === first) {
      const prev = points[i - 1] ?? p;
      const bulge = Math.min(prev.x, p.x) - turn * 1.6;
      d += ` C ${bulge.toFixed(1)} ${prev.y.toFixed(1)}, ${bulge.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    } else d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });
  // the U is longer than its chord: add the difference to that segment for the timing
  const turnExtra = points.map((_, i) => (i === first - 1 ? (y2 - y1) * 0.55 : 0));
  const at = fractions(points, turnExtra);

  // Sides: row 1 alternates from the start (start below), row 2 alternates back from the trophy (trophy below). So the
  // labels that share a zone are always two stations apart, and the two rows' labels in the middle zone sit in two
  // separate bands (row 1's below its line, row 2's above its line).
  const labelWidth = (step: number) => Math.max(72, Math.min(150, step * 2 - 12));
  const turnClear = Math.max(4, pad + turn - turn * 1.6 + 12);
  const nodes: SheetNode[] = points.map((p, i) => {
    const kind: SheetNode["kind"] = i === 0 ? "start" : i === count - 1 ? "goal" : "stage";
    const fromEnd = i < first ? i : count - 1 - i;
    const side: "above" | "below" = fromEnd % 2 === 0 ? "below" : "above";
    const radius = kind === "goal" ? NODE.goalRows / 2 : kind === "start" ? NODE.start / 2 : NODE.coinRows / 2;
    let w = labelWidth(i < first ? step1 : step2);
    let left = p.x - w / 2;
    let align: "start" | "center" | "end" = "center";
    if (kind === "goal" || kind === "start") {
      // the two ends sit at the inline-start edge: their labels run from the edge toward the next station
      w = kind === "goal" ? Math.max(100, Math.min(170, step2 * 1.3 + pad)) : Math.max(72, Math.min(120, step1 + pad - 4));
      left = width - 4 - w;
      align = "start";
    } else if (left + w > width - 4) {
      left = width - 4 - w;
    } else if (left < turnClear) {
      // the stations at the turn: their labels keep clear of the U the line makes at the inline-end edge. The box gives
      // up its outer part (it does not slide into its neighbour's room); a long name balances onto two lines.
      w = left + w - turnClear;
      left = turnClear;
    }
    const top = side === "below" ? p.y + radius + 6 : p.y - radius - 6;
    return { index: i, kind, x: p.x, y: p.y, at: at[i] ?? 0, label: { left, top, width: w, align, side } };
  });
  // the trophy's title is wider than one slot: the label two stations before it (same zone) steps aside toward the
  // inline-end (it keeps its width, so «SQL ★★★» never breaks)
  const goal = nodes[count - 1];
  const before = nodes[count - 3];
  if (goal && before && count - 3 >= first) {
    const right = goal.label.left - 8;
    if (before.label.left + before.label.width > right) {
      nodes[count - 3] = { ...before, label: { ...before.label, left: Math.max(turnClear, right - before.label.width) } };
    }
  }
  return { layout: "rows", width, height: rowsHeight(), nodes, d, footerTop: y2 + ROWS.bottomZone + 4 };
}
