// Owner: brain-cv. Steps 1-4 of spec 6.5 (pure): clean, split, rejoin wrapped lines, find zones.
import { findKeywords } from "@/lib/text/normalize";

export type CvZone = "applied" | "listed";

export interface CvLine {
  /** The cleaned (step 1), split and rejoined (steps 2-3) line, as displayed, without its list mark. */
  readonly text: string;
  /** The zone of the nearest heading above (step 4); lines before the first heading are "listed". */
  readonly zone: CvZone;
  readonly heading: boolean;
  readonly listMark: boolean;
}

// ─── Step 1: clean the whole text ────────────────────────────────────────────────────────────────────────────────

/** Line separators other than "\n" (CR LF, CR, vertical tab, form feed, U+2028, U+2029). */
const LINE_BREAKS = /\r\n|[\r\v\f\u2028\u2029]/g;
/**
 * The direction marks of spec 6.5 (U+200C-U+200F, U+202A-U+202E), plus the other invisible direction and format marks a
 * PDF or Word file can carry and that would split a word in two: U+061C (Arabic letter mark), U+2066-U+2069
 * (isolates), U+FEFF (byte-order mark) and U+00AD (soft hyphen).
 */
const INVISIBLE_MARKS = /[\u200C-\u200F\u202A-\u202E\u061C\u2066-\u2069\uFEFF\u00AD]/g;
const TATWEEL = /\u0640/g;
/** Arabic-Indic (spec: ٠-٩) and Extended Arabic-Indic digits. */
const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

/** Farsi yeh «ی» at the end of a word (its dotless final form is the shape of «ى»). */
const FARSI_YEH_FINAL = /ی(?![\p{L}\p{M}])/gu;
const LOOKALIKES: Readonly<Record<string, string>> = { "ی": "ي", "ھ": "ه", "ہ": "ه", "ۃ": "ة", "ک": "ك" };

/**
 * Persian and Urdu letters that share a glyph with an Arabic letter, back to the Arabic letter. Chrome's PDF printer
 * (Arial, Tahoma) maps the shared joining forms to the Persian code points, so an Arabic CV printed to PDF reads
 * «بیانات», «المھارات» (U+06CC, U+06BE): no alias, heading or sample check matched them. A final «ی» is «ى» (the
 * dotless final shape); elsewhere it is «ي». An Arabic CV has no Persian letters of its own.
 */
export function foldArabicLookalikes(text: string): string {
  return text.replace(FARSI_YEH_FINAL, "ى").replace(/[یھہۃک]/gu, (ch) => LOOKALIKES[ch] ?? ch);
}

/**
 * Spec 6.5 step 1 on the whole text: Unicode NFKC (folds the presentation-form letters and ligatures many PDFs give
 * back into ordinary letters), Persian look-alike letters folded to Arabic (foldArabicLookalikes), the direction marks
 * and the stretching mark (tatweel) removed, ٠-٩ → 0-9, line breaks as "\n", tabs as spaces. Diacritics are KEPT:
 * this is the text that is displayed.
 */
export function cleanCvText(raw: string): string {
  return foldArabicLookalikes(raw.replace(LINE_BREAKS, "\n").normalize("NFKC"))
    .replace(INVISIBLE_MARKS, "")
    .replace(TATWEEL, "")
    .replace(ARABIC_DIGITS, (d) => {
      const code = d.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/\t/g, " ");
}

// ─── Step 2: split into lines, list marks ────────────────────────────────────────────────────────────────────────

/**
 * A leading list mark (spec: "-, •, *, a number with a dot"), plus the other bullet glyphs Word and PDF exports use.
 * A number takes one or two digits and must be followed by a space, so «2026.» or «1.5 سنة» are not list marks.
 */
const LIST_MARK = /^(?:[-–—•·●○◦▪■□►▸‣➢✓*]+\s*|\d{1,2}[.)]\s+)/u;

/** Spec 6.5 step 2: longer than this, a line is split at «.» and «؛». */
const SPLIT_ABOVE = 200;

function splitLongLine(text: string): string[] {
  if (text.length <= SPLIT_ABOVE) return [text];
  // After a «.» that ends a sentence (followed by a space; «Node.js» and «7.0» stay whole), and after every «؛».
  return text
    .split(/(?<=\.)\s+|(?<=؛)\s*/u)
    .map((piece) => piece.trim())
    .filter((piece) => piece !== "");
}

// ─── Step 4: headings ─────────────────────────────────────────────────────────────────────────────────────────────

/** Spec 6.5 step 4, *applied* heading words. */
export const APPLIED_HEADING_WORDS: readonly string[] = [
  "الخبرة",
  "الخبرات",
  "خبرات",
  "التدريب",
  "المشاريع",
  "الأعمال التطوعية",
  "العمل التطوعي",
  "experience",
  "employment",
  "work history",
  "career",
  "projects",
  "internship",
  "volunteer",
];

/** Spec 6.5 step 4, *listed* heading words. */
export const LISTED_HEADING_WORDS: readonly string[] = [
  "نبذة",
  "الملخص",
  "ملخص",
  "الهدف",
  "التعليم",
  "المؤهلات",
  "الدورات",
  "الشهادات",
  "المهارات",
  "اللغات",
  "الاهتمامات",
  "summary",
  "profile",
  "objective",
  "about",
  "education",
  "courses",
  "certifications",
  "skills",
  "languages",
];

const HEADING_WORDS: readonly string[] = [...APPLIED_HEADING_WORDS, ...LISTED_HEADING_WORDS];
const APPLIED_SET: ReadonlySet<string> = new Set(APPLIED_HEADING_WORDS);
const HEADING_MAX_CHARS = 40;

/**
 * Spec 6.5 step 4: a line of at most 40 characters, with no list mark, no «.» and no «،», that contains a heading word
 * (whole words, with or without «ال», any letter case: the 4.3 keyword rules). When it holds words of both kinds, its
 * first word decides. Returns the zone the heading opens, or null when the line is not a heading.
 */
export function headingZone(text: string, listMark: boolean): CvZone | null {
  if (listMark || text.length > HEADING_MAX_CHARS || text.includes(".") || text.includes("،")) return null;
  const first = findKeywords(text, HEADING_WORDS)[0];
  if (first === undefined) return null;
  return APPLIED_SET.has(first.keyword) ? "applied" : "listed";
}

// ─── Step 3: rejoin wrapped lines ─────────────────────────────────────────────────────────────────────────────────

/** Spec 6.5 step 3: the previous line must be longer than this to take the next one. */
const REJOIN_ABOVE = 40;
/** A line ending with one of these is complete (spec: . : ؛ ! ؟; the Latin «?» too). */
const LINE_END = /[.:؛!؟?]$/u;

interface RawLine {
  text: string;
  listMark: boolean;
  /** The zone this line opens when it is a heading. */
  heading: CvZone | null;
  /** A blank line came before it. */
  afterBlank: boolean;
}

/**
 * Spec 6.5 steps 1-4. The same text always gives the same lines. `CvAnalysis.lines` is always exactly
 * `cleanCvLines(text).map((l) => l.text)` (both analysers), and the cv screen shows that list during the show's `read`
 * stage, before the analysis returns, so the document never re-flows when `extract` starts.
 * Blank lines are not returned (they only stop a rejoin); a heading line is returned with `heading: true`.
 */
export function cleanCvLines(raw: string): readonly CvLine[] {
  // Steps 1 and 2.
  const pieces: RawLine[] = [];
  let blank = false;
  for (const sourceLine of cleanCvText(raw).split("\n")) {
    let text = sourceLine.replace(/\s+/gu, " ").trim();
    if (text === "") {
      blank = true;
      continue;
    }
    let listMark = false;
    const mark = LIST_MARK.exec(text);
    if (mark !== null && mark[0].length < text.length) {
      listMark = true;
      text = text.slice(mark[0].length).trim();
    }
    splitLongLine(text).forEach((piece, i) => {
      const pieceMark = i === 0 && listMark;
      pieces.push({ text: piece, listMark: pieceMark, heading: headingZone(piece, pieceMark), afterBlank: i === 0 && blank });
    });
    blank = false;
  }

  // Step 3.
  const joined: RawLine[] = [];
  for (const line of pieces) {
    const prev = joined[joined.length - 1];
    if (
      prev !== undefined &&
      prev.text.length > REJOIN_ABOVE &&
      !LINE_END.test(prev.text) &&
      !line.listMark &&
      prev.heading === null &&
      line.heading === null &&
      !line.afterBlank
    ) {
      prev.text = `${prev.text} ${line.text}`;
      continue;
    }
    joined.push({ ...line });
  }

  // Step 4.
  let zone: CvZone = "listed";
  return joined.map((line) => {
    if (line.heading !== null) zone = line.heading;
    return { text: line.text, zone, heading: line.heading !== null, listMark: line.listMark };
  });
}
