// Owner: brain-cv. PDF text items → lines in logical reading order (pure; no PDF library here, so it is unit-tested with
// plain items). Why this exists (spec 6.1 acceptance, STACK-NOTES 7.1 "Arabic PDFs: UNVERIFIED"):
//
// Verified on public/samples/cv-ar.pdf (Chrome's PDF printer, IBM Plex Sans Arabic): the PDF draws Arabic in VISUAL
// order, one glyph per text item, with joined letters as presentation forms (\uFEDF \uFE8E \uFEA7 …) and ligatures as single
// presentation code points (\uFC43 = لى, \uFC91 …). Joining unpdf's items in stream order gives every Arabic word reversed
// («\uFEAA\uFEDF\uFE8E\uFEA7» for «خالد»), detached diacritics, and Latin words and digits in the wrong place in the sentence. So:
//   1. the extractor asks PDF.js for items with `disableNormalization: true`: PDF.js otherwise expands a ligature code
//      point into its letters BEFORE its own per-item bidi pass, which then reverses them («يف» for «في»);
//   2. items are grouped into lines by baseline, and each line is put back into logical order from the items'
//      positions: an Arabic line is read right to left, while runs of Latin letters and digits inside it keep their
//      left-to-right order; mirrored brackets drawn in Arabic context are swapped back;
//   3. combining marks drawn as separate items (shadda, tanween) are attached to the letter under them;
//   4. the narrow spaces PDF.js invents inside an Arabic word (at a non-joining letter) are dropped, and real gaps
//      between items that carry no space become one;
//   5. a vertical gap clearly larger than the line spacing becomes a blank line (so spec 6.5 step 3 never joins
//      across a paragraph).
// Presentation forms and ligatures are folded by NFKC afterwards (the extractor, and step 1 of spec 6.5).

/** One PDF.js text item (TextItem: `transform[4]`, `transform[5]`, width, height, dir). */
export interface PdfTextItem {
  readonly str: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** PDF.js: "ltr" | "rtl" | "ttb". For "rtl" items PDF.js has already put the item's own characters in logical order. */
  readonly dir: string;
}

type Cls = "R" | "L" | "EN" | "N";

interface Cluster {
  /** A base character with its combining marks (a ligature is split into its letters first). */
  text: string;
  readonly left: number;
  readonly right: number;
  readonly cls: Cls;
  readonly space: boolean;
  /** Index of the source item (spaces are inserted only between different items). */
  readonly item: number;
}

interface Line {
  y: number;
  /** Sum of the characters of the items placed so far (weights the baseline). */
  weight: number;
  readonly items: { readonly item: PdfTextItem; readonly index: number }[];
  readonly spaces: { readonly item: PdfTextItem; readonly index: number }[];
  readonly marks: PdfTextItem[];
  size: number;
}

const MARK_CHAR = /\p{M}/u;
const ONLY_MARKS = /^\p{M}+$/u;
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;
const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;
/** Arabic presentation forms (A and B) and Latin ligatures: may stand for several letters (NFKC). */
const PRESENTATION = /[\uFB00-\uFB06\uFB50-\uFDFF\uFE70-\uFEFF]/u;
const MIRROR: Readonly<Record<string, string>> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«", "‹": "›", "›": "‹" };

function classOf(ch: string): Cls {
  if (DIGIT.test(ch)) return "EN";
  if (LETTER.test(ch)) return RTL_SCRIPT.test(ch) ? "R" : "L";
  return "N";
}

/** Base character + following combining marks. Leading marks (no base) stay as their own unit. */
function graphemes(str: string): string[] {
  const out: string[] = [];
  for (const ch of str) {
    const last = out.length - 1;
    if (MARK_CHAR.test(ch) && last >= 0) out[last] += ch;
    else out.push(ch);
  }
  return out;
}

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] ?? null) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/** The clusters of one text item, each with its share of the item's box (right to left for an "rtl" item). */
function itemClusters(item: PdfTextItem, index: number): Cluster[] {
  // A presentation-form ligature (or a Latin "ﬁ") becomes its letters, so a mark can find the right one.
  const units = graphemes(item.str).flatMap((g) => {
    const base = [...g][0] ?? "";
    if (!PRESENTATION.test(base)) return [g];
    const letters = graphemes(base.normalize("NFKC"));
    if (letters.length < 2) return [g];
    const marks = g.slice(base.length);
    return letters.map((letter, i) => (i === letters.length - 1 ? letter + marks : letter));
  });
  const n = units.length;
  if (n === 0) return [];
  const w = item.width / n;
  const rtl = item.dir === "rtl";
  return units.map((text, i) => {
    const left = rtl ? item.x + item.width - (i + 1) * w : item.x + i * w;
    const base = [...text][0] ?? "";
    return { text, left, right: left + w, cls: classOf(base), space: /^\s+$/u.test(text), item: index };
  });
}

const OPENERS = "([{<«‹";
const CLOSERS = ")]}>»›";

/**
 * Grows the run [start, end] over a bracket just outside it whose partner, as drawn, is unmatched inside it: a bracket
 * pair stays with the run it encloses part of («Excel (advanced)» drawn in an Arabic line), as the bidi algorithm's
 * bracket-pair rule (N0) drew it.
 */
function withBrackets(visual: readonly Cluster[], start: number, end: number): readonly [number, number] {
  let s = start;
  let e = end;
  for (;;) {
    let open = 0;
    let lowest = 0;
    for (let k = s; k <= e; k += 1) {
      const t = visual[k]?.text ?? "";
      if (OPENERS.includes(t)) open += 1;
      else if (CLOSERS.includes(t)) lowest = Math.min(lowest, (open -= 1));
    }
    const after = visual[e + 1]?.text ?? "";
    const before = visual[s - 1]?.text ?? "";
    if (open - lowest > 0 && after !== "" && CLOSERS.includes(after)) e += 1;
    else if (lowest < 0 && before !== "" && OPENERS.includes(before)) s -= 1;
    else return [s, e];
  }
}

/** Runs that start and end with a `strong` cluster and hold no `stop` cluster (merged when brackets make them touch). */
function runs(visual: readonly Cluster[], strong: (c: Cluster) => boolean, stop: (c: Cluster) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < visual.length) {
    const c = visual[i];
    if (c === undefined || !strong(c)) {
      i += 1;
      continue;
    }
    let end = i;
    for (let j = i + 1; j < visual.length; j += 1) {
      const cj = visual[j];
      if (cj === undefined || stop(cj)) break;
      if (strong(cj)) end = j;
    }
    const [s, e] = withBrackets(visual, i, end);
    const last = out[out.length - 1];
    if (last !== undefined && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
    i = Math.max(end, e) + 1;
  }
  return out;
}

const mirrored = (c: Cluster): string => (c.cls === "N" ? [...c.text].map((ch) => MIRROR[ch] ?? ch).join("") : c.text);

/** Visual order (left to right) → logical order, for one line (a small inverse of the Unicode bidi algorithm). */
function logicalText(visual: readonly Cluster[], rtl: boolean): string {
  const join = (from: number, to: number) => visual.slice(from, to + 1).map((c) => c.text).join("");
  if (rtl) {
    // Read right to left; runs of Latin letters and digits (with what lies between them) keep their own order, and a
    // neutral drawn in Arabic context is un-mirrored.
    const islands = runs(visual, (c) => c.cls === "L" || c.cls === "EN", (c) => c.cls === "R");
    const segments: string[] = [];
    let k = 0;
    for (const [s, e] of islands) {
      for (; k < s; k += 1) segments.push(mirrored(visual[k] as Cluster));
      segments.push(join(s, e));
      k = e + 1;
    }
    for (; k < visual.length; k += 1) segments.push(mirrored(visual[k] as Cluster));
    return segments.reverse().join("");
  }
  // Read left to right; runs of Arabic letters are read right to left inside, with digit runs kept in order.
  const islands = runs(visual, (c) => c.cls === "R", (c) => c.cls === "L");
  const out: string[] = [];
  let k = 0;
  for (const [s, e] of islands) {
    for (; k < s; k += 1) out.push(visual[k]?.text ?? "");
    const units: string[] = [];
    let i = s;
    while (i <= e) {
      const c = visual[i] as Cluster;
      if (c.cls === "EN") {
        let stop = i;
        while (stop + 1 <= e && visual[stop + 1]?.cls !== "R" && !(visual[stop + 1]?.space ?? true)) stop += 1;
        while (stop > i && visual[stop]?.cls !== "EN") stop -= 1;
        units.push(join(i, stop));
        i = stop + 1;
      } else {
        units.push(mirrored(c));
        i += 1;
      }
    }
    out.push(units.reverse().join(""));
    k = e + 1;
  }
  for (; k < visual.length; k += 1) out.push(visual[k]?.text ?? "");
  return out.join("");
}

/**
 * The line's base direction. An Arabic document reads every line right to left (a Latin run inside keeps its order);
 * a Latin document reads its lines left to right, except a line made of Arabic letters only. A line with no Arabic
 * letter in an Arabic document is read right to left only when its punctuation was drawn at its left end.
 */
function lineIsRtl(visual: readonly Cluster[], docRtl: boolean): boolean {
  const r = visual.filter((c) => c.cls === "R").length;
  const l = visual.filter((c) => c.cls === "L").length;
  if (r > 0) return docRtl || l === 0;
  if (!docRtl) return false;
  const ink = visual.filter((c) => !c.space);
  const first = ink[0];
  const last = ink[ink.length - 1];
  return (
    first !== undefined &&
    last !== undefined &&
    first.cls === "N" &&
    !OPENERS.includes(first.text) &&
    !CLOSERS.includes(first.text) &&
    (last.cls === "L" || last.cls === "EN")
  );
}

/** Lines of one page, top to bottom, "" where a paragraph gap is. `docRtl`: the document is mostly Arabic. */
function pageLines(items: readonly PdfTextItem[], docRtl: boolean): string[] {
  const texts: { item: PdfTextItem; index: number }[] = [];
  const spaces: { item: PdfTextItem; index: number }[] = [];
  const marks: PdfTextItem[] = [];
  items.forEach((item, index) => {
    if (item.str === "") return;
    const compact = item.str.replace(/\s+/gu, "");
    if (compact === "") spaces.push({ item, index });
    else if (ONLY_MARKS.test(compact)) marks.push({ ...item, str: compact });
    else texts.push({ item, index });
  });
  const fallbackSize = median(texts.map((t) => t.item.height).filter((h) => h > 0)) ?? 10;
  const sizeOf = (item: PdfTextItem) => (item.height > 0 ? item.height : fallbackSize);

  // Lines by baseline.
  const lines: Line[] = [];
  const nearest = (y: number, factor: (line: Line) => number): Line | null => {
    let best: Line | null = null;
    for (const line of lines) {
      const d = Math.abs(line.y - y);
      if (d <= factor(line) && (best === null || d < Math.abs(best.y - y))) best = line;
    }
    return best;
  };
  for (const t of [...texts].sort((a, b) => b.item.y - a.item.y || a.item.x - b.item.x)) {
    const size = sizeOf(t.item);
    const line = nearest(t.item.y, (l) => 0.5 * Math.max(l.size, size));
    const chars = [...t.item.str].length;
    if (line === null) {
      lines.push({ y: t.item.y, weight: chars, items: [t], spaces: [], marks: [], size });
    } else {
      line.items.push(t);
      line.y = (line.y * line.weight + t.item.y * chars) / (line.weight + chars);
      line.weight += chars;
      line.size = median(line.items.map((m) => sizeOf(m.item))) ?? line.size;
    }
  }
  for (const s of spaces) nearest(s.item.y, (l) => 0.5 * l.size)?.spaces.push(s);
  for (const m of marks) nearest(m.y, (l) => 0.8 * l.size)?.marks.push(m);

  // A normal space on this page, in units of the line's size (to tell real spaces from the ones PDF.js invents).
  const spaceEm = median(
    lines.flatMap((line) => line.spaces.filter((s) => s.item.width > 0).map((s) => s.item.width / line.size)),
  );

  lines.sort((a, b) => b.y - a.y);
  const out: string[] = [];
  let prev: Line | null = null;
  for (const line of lines) {
    let clusters: Cluster[] = line.items.flatMap((t) => itemClusters(t.item, t.index));
    for (const s of line.spaces) {
      clusters.push({ text: " ", left: s.item.x, right: s.item.x + s.item.width, cls: "N", space: true, item: s.index });
    }
    clusters.sort((a, b) => (a.left + a.right) / 2 - (b.left + b.right) / 2);

    // Marks drawn on their own: onto the letter whose left edge is nearest to the mark's origin.
    for (const mark of line.marks) {
      let best: Cluster | null = null;
      for (const c of clusters) {
        if (c.cls !== "R" && c.cls !== "L") continue;
        if (best === null || Math.abs(c.left - mark.x) < Math.abs(best.left - mark.x)) best = c;
      }
      if (best !== null) best.text += mark.str;
    }

    // Spaces PDF.js invented inside an Arabic word: much narrower than a real space, between two Arabic letters.
    if (spaceEm !== null) {
      const narrow = 0.55 * spaceEm * line.size;
      clusters = clusters.filter((c, i) => {
        if (!c.space || c.right - c.left >= narrow) return true;
        return !(clusters[i - 1]?.cls === "R" && clusters[i + 1]?.cls === "R");
      });
    }

    // A real gap between two items that carries no space becomes one.
    const gapForSpace = spaceEm !== null ? 0.6 * spaceEm * line.size : 0.25 * line.size;
    const withGaps: Cluster[] = [];
    for (const c of clusters) {
      const before = withGaps[withGaps.length - 1];
      if (before !== undefined && !before.space && !c.space && before.item !== c.item && c.left - before.right > gapForSpace) {
        withGaps.push({ text: " ", left: before.right, right: c.left, cls: "N", space: true, item: -1 });
      }
      withGaps.push(c);
    }

    const text = logicalText(withGaps, lineIsRtl(withGaps, docRtl)).replace(/\s+/gu, " ").trim();
    if (text === "") continue;
    if (prev !== null && prev.y - line.y > 1.9 * Math.max(prev.size, line.size)) out.push("");
    out.push(text);
    prev = line;
  }
  return out;
}

/**
 * Every page's items → the document text: lines in logical order joined with "\n", a blank line at paragraph gaps and
 * between pages. The characters are as the PDF gave them (presentation forms included); NFKC is the caller's.
 */
export function pdfItemsToText(pages: readonly (readonly PdfTextItem[])[]): string {
  let r = 0;
  let l = 0;
  for (const page of pages) {
    for (const item of page) {
      for (const ch of item.str) {
        const cls = classOf(ch);
        if (cls === "R") r += 1;
        else if (cls === "L") l += 1;
      }
    }
  }
  const docRtl = r > l;
  return pages
    .map((page) => pageLines(page, docRtl).join("\n"))
    .filter((text) => text !== "")
    .join("\n\n");
}
