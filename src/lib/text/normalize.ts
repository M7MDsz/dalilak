// Owner: engine. The text rules of spec 4.3, used by every reader of free text:
// the onboarding interpreter and the advisor router (brain-advisor), the CV analyser (brain-cv), job search (engine 7.1)
// and account names (store, spec 3.1). Pure; no imports.

/** Zero-width and direction marks (U+200C-U+200F, U+202A-U+202E). */
const DIRECTION_MARKS = /[‌-‏‪-‮]/g;
/** Arabic diacritics and Quranic marks, and the tatweel (U+0640). */
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭـ]/g;
/** Arabic-Indic (U+0660-U+0669) and Extended Arabic-Indic (U+06F0-U+06F9) digits. */
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/**
 * Spec 4.3 normalisation, applied to a COPY of the text before matching: Unicode NFKC; remove U+200C-U+200F,
 * U+202A-U+202E, Arabic diacritics and the tatweel; ٠-٩ → 0-9; أ إ آ → ا; ى → ي; ة → ه; Latin lower-cased.
 * Idempotent: normalizeText(normalizeText(t)) === normalizeText(t).
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(DIRECTION_MARKS, "")
    .replace(ARABIC_MARKS, "")
    .replace(ARABIC_DIGITS, (d) => {
      const code = d.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

/** Trim and collapse inner whitespace: the displayed name (spec 3.1 "trimmed and inner spaces collapsed"). */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/gu, " ");
}

/** The account key of a name: normalizeText(cleanName(name)). «سارة» = «ساره», «أحمد» = «احمد», "Sara" = "sara". */
export function normalizeName(name: string): string {
  return normalizeText(cleanName(name));
}

const NAME_MAX_LETTERS = 20;
const NAME_MIN_LETTERS = 2;
const LETTER = /\p{L}/u;
const ARABIC_OR_LATIN = /[\p{Script=Arabic}\p{Script=Latin}]/u;
const MARK = /\p{M}/u;

/**
 * Spec 3.1 checks on the cleaned name: fewer than 2 letters → short; anything but Arabic/Latin letters and spaces →
 * letters; more than 20 letters → long. Letters are counted without spaces; combining marks (Arabic diacritics) and the
 * tatweel are accepted and not counted. Checked on the NFKC form, so presentation-form letters count as letters.
 */
export function validateName(raw: string): { ok: true; name: string; key: string } | { ok: false; error: "short" | "long" | "letters" } {
  const name = cleanName(raw);
  let letters = 0;
  let invalid = false;
  for (const ch of name.normalize("NFKC")) {
    if (ch === " " || ch === "ـ" || MARK.test(ch)) continue;
    if (LETTER.test(ch) && ARABIC_OR_LATIN.test(ch)) letters += 1;
    else invalid = true;
  }
  if (letters < NAME_MIN_LETTERS) return { ok: false, error: "short" };
  if (invalid) return { ok: false, error: "letters" };
  if (letters > NAME_MAX_LETTERS) return { ok: false, error: "long" };
  return { ok: true, name, key: normalizeText(name) };
}

/**
 * A word: letters, marks and digits; a trailing run of "+" or "#" stays on the word when nothing word-like follows it,
 * so «C++» and «C#» (spec 9.2 aliases) are words of their own and not a bare «c».
 */
const WORD = /[\p{L}\p{M}\p{N}]+(?:[+#]+(?![\p{L}\p{M}\p{N}]))?/gu;

/** Words of a normalised text, in order (split on anything that is not a letter or a digit; see WORD for «C++»). */
export function tokenize(normalized: string): string[] {
  return normalized.match(WORD) ?? [];
}

/** A keyword found in a normalised text: `start` and `end` are word indexes [start, end). */
export interface KeywordHit {
  readonly keyword: string;
  readonly start: number;
  readonly end: number;
}

const ONE_LETTER_PREFIXES: ReadonlySet<string> = new Set(["و", "ف", "ب", "ل", "ك"]);
const AL = "ال";

/** The keyword word with and without «ال». */
function keywordForms(word: string): string[] {
  return word.startsWith(AL) && word.length > AL.length + 1 ? [word, word.slice(AL.length)] : [word];
}

/**
 * The first word of a hit, as it may appear in the text: itself; without «ال»; without one one-letter prefix
 * (و ف ب ل ك) and then also without «ال»; and «لل…» read as ل + ال. Every stripped form keeps at least two letters.
 */
function firstWordForms(word: string): string[] {
  const forms = new Set<string>([word]);
  const addStripped = (w: string) => {
    if (w.length >= 2) forms.add(w);
    if (w.startsWith(AL) && w.length >= AL.length + 2) forms.add(w.slice(AL.length));
  };
  addStripped(word);
  const first = word.charAt(0);
  if (ONE_LETTER_PREFIXES.has(first) && word.length >= 3) addStripped(word.slice(1));
  if (word.startsWith("لل") && word.length >= 4) forms.add(word.slice(2));
  return [...forms];
}

function overlaps(a: readonly string[], b: readonly string[]): boolean {
  return a.some((x) => b.includes(x));
}

/** A text read once for matching: its words, and each word's forms as the first word of a hit and as a later word. */
interface PreparedText {
  readonly first: readonly (readonly string[])[];
  readonly later: readonly (readonly string[])[];
}

function prepare(text: string): PreparedText {
  const words = tokenize(normalizeText(text));
  return { first: words.map(firstWordForms), later: words.map(keywordForms) };
}

/** A keyword read once: its words' forms (with and without «ال»), its word count and its normalised length. */
function prepareKeyword(keyword: string): { readonly forms: readonly (readonly string[])[]; readonly chars: number } {
  const norm = normalizeText(keyword);
  return { forms: tokenize(norm).map(keywordForms), chars: norm.length };
}

/** Every start index at which the keyword matches the text. */
function hitStarts(text: PreparedText, kwForms: readonly (readonly string[])[]): number[] {
  const out: number[] = [];
  const n = kwForms.length;
  if (n === 0) return out;
  for (let i = 0; i + n <= text.first.length; i += 1) {
    let ok = true;
    for (let j = 0; j < n && ok; j += 1) {
      const textForms = j === 0 ? text.first[i] : text.later[i + j];
      const forms = kwForms[j];
      ok = textForms !== undefined && forms !== undefined && overlaps(textForms, forms);
    }
    if (ok) out.push(i);
  }
  return out;
}

/**
 * Whole-word match of one keyword (normalised here too; may be several words) in a text (normalised here too, so a raw
 * text gives the same hits as its normalised copy), with or without «ال» and with or without one one-letter prefix
 * (و، ف، ب، ل، ك) on the first word: «بالرياض» matches «الرياض», «لطلباتي» matches «طلباتي». Returns the earliest hit
 * (word indexes into tokenize(normalizeText(text))) or null. `keyword` in the hit is the keyword as passed.
 */
export function findKeyword(normalized: string, keyword: string): KeywordHit | null {
  const kw = prepareKeyword(keyword);
  const start = hitStarts(prepare(normalized), kw.forms)[0];
  return start === undefined ? null : { keyword, start, end: start + kw.forms.length };
}

/**
 * Every hit of any of the keywords (every occurrence), sorted by start; at the same start the longer keyword first
 * (more words, then more characters: spec 4.3 tie rule), then the order of `keywords`.
 */
export function findKeywords(normalized: string, keywords: readonly string[]): KeywordHit[] {
  const text = prepare(normalized);
  const hits: { hit: KeywordHit; chars: number; order: number }[] = [];
  keywords.forEach((keyword, order) => {
    const kw = prepareKeyword(keyword);
    for (const start of hitStarts(text, kw.forms)) {
      hits.push({ hit: { keyword, start, end: start + kw.forms.length }, chars: kw.chars, order });
    }
  });
  hits.sort(
    (a, b) =>
      a.hit.start - b.hit.start ||
      b.hit.end - b.hit.start - (a.hit.end - a.hit.start) ||
      b.chars - a.chars ||
      a.order - b.order,
  );
  return hits.map((h) => h.hit);
}

/** True when any keyword matches (findKeyword ≠ null). */
export function containsAny(normalized: string, keywords: readonly string[]): boolean {
  const text = prepare(normalized);
  return keywords.some((keyword) => hitStarts(text, prepareKeyword(keyword).forms).length > 0);
}

/**
 * Engine helper (not in the stub list; used by job search, 7.1): the forms a text word can be compared under, «ال» and
 * one one-letter prefix stripped (the same rule as findKeyword's first word).
 */
export function wordForms(word: string): readonly string[] {
  return firstWordForms(word);
}
