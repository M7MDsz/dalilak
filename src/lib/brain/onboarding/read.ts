// Owner: brain-advisor. Reading one typed onboarding message, in the order of spec 4.3 (each step has one test, so no
// two rules compete): 1 question · 2 greeting / thanks set aside · 3 the pending question · 4 the other unanswered
// questions · 5 could not be mapped. Words that matched are used up. Pure.
import { findKeywords, normalizeText, tokenize } from "@/lib/text/normalize";
import type {
  CityOption,
  EducationOption,
  ExperienceOption,
  InterestOption,
  MajorOption,
  PriorityOption,
  QuestionId,
} from "@/lib/types";

import {
  CITY_ENTRIES,
  COUNT_PHRASES,
  EDUCATION_KEYWORDS,
  EXPERIENCE_GATE_WORDS,
  EXPERIENCE_MONTH_WORDS,
  EXPERIENCE_MORE_WORDS,
  EXPERIENCE_NONE_WORDS,
  EXPERIENCE_UNDER1_PHRASES,
  GREETING_OTHER,
  GREETING_SALAM,
  INTEREST_KEYWORDS,
  MAJOR_KEYWORDS,
  NEUTRAL_PHRASES,
  NUMBER_WORDS,
  PRIORITY_KEYWORDS,
  QUESTION_WORDS,
  THANKS_WORDS,
  VOCATIVE_WORDS,
  WHO_PHRASES,
  WHY_ASK_PHRASES,
  WISH_WORDS,
} from "./tables";

// ── Words with a "used" mark ───────────────────────────────────────────────────────────────────────────────────────

const normCache = new Map<string, string>();
function nk(keyword: string): string {
  let out = normCache.get(keyword);
  if (out === undefined) {
    out = normalizeText(keyword);
    normCache.set(keyword, out);
  }
  return out;
}

/** A message being read: its normalised words, each usable once. */
export class Reading {
  readonly words: readonly string[];
  private readonly used: boolean[];
  /** The whole message, normalised (for the gates of step 4, which look at the message, not at what is left). */
  readonly whole: string;

  constructor(text: string) {
    this.whole = normalizeText(text);
    this.words = tokenize(this.whole);
    this.used = this.words.map(() => false);
  }

  get empty(): boolean {
    return this.used.every((u) => u);
  }

  /** Hits of keywords among the words not used yet, as indexes into `words`; sorted by start, longer first. */
  find(keywords: readonly string[]): { keyword: string; start: number; end: number }[] {
    const index: number[] = [];
    const rest: string[] = [];
    this.words.forEach((w, i) => {
      if (!this.used[i]) {
        index.push(i);
        rest.push(w);
      }
    });
    if (rest.length === 0) return [];
    const hits = findKeywords(rest.join(" "), keywords.map(nk));
    return hits
      .map((h) => {
        const start = index[h.start];
        const last = index[h.end - 1];
        return start === undefined || last === undefined ? null : { keyword: h.keyword, start, end: last + 1 };
      })
      .filter((h): h is { keyword: string; start: number; end: number } => h !== null);
  }

  use(start: number, end: number): void {
    for (let i = start; i < end; i++) this.used[i] = true;
  }

  isUsed(i: number): boolean {
    return this.used[i] === true;
  }

  /** True when any keyword is in the whole message (used words included). */
  mentions(keywords: readonly string[]): boolean {
    return findKeywords(this.whole, keywords.map(nk)).length > 0;
  }

  /** Words not used yet, in order. */
  rest(): string[] {
    return this.words.filter((_, i) => !this.used[i]);
  }
}

// ── Step 1 and 2 ───────────────────────────────────────────────────────────────────────────────────────────────────

export type Special = "who" | "why-ask" | "count" | "question" | "greeting-salam" | "greeting" | "thanks";

/** The rows «من أنت», «لماذا تسأل», «كم سؤالاً بقي» (keywords, with or without «؟»), then any other question (step 1). */
export function readQuestion(raw: string, reading: Reading): Special | null {
  if (reading.mentions(WHO_PHRASES)) return "who";
  if (reading.mentions(WHY_ASK_PHRASES)) return "why-ask";
  if (reading.mentions(COUNT_PHRASES)) return "count";
  const first = reading.words[0];
  const trimmed = raw.trim();
  if ((first !== undefined && QUESTION_WORDS.map(nk).includes(first)) || /[؟?]$/.test(trimmed)) return "question";
  return null;
}

/** Step 2: sets greetings and thanks aside; when nothing else is left, the message IS a greeting or thanks. */
export function readGreeting(reading: Reading): Special | null {
  const thanks = reading.find(THANKS_WORDS);
  const salam = reading.find(GREETING_SALAM);
  const other = reading.find(GREETING_OTHER);
  for (const h of [...thanks, ...salam, ...other]) reading.use(h.start, h.end);
  const greeted = thanks.length + salam.length + other.length > 0;
  if (greeted) for (const h of reading.find(VOCATIVE_WORDS)) reading.use(h.start, h.end);
  if (!greeted || !reading.empty) return null;
  if (thanks.length > 0) return "thanks";
  return salam.length > 0 ? "greeting-salam" : "greeting";
}

// ── Steps 3-4: one reader per question ─────────────────────────────────────────────────────────────────────────────

export type Found =
  | { readonly question: "city"; readonly value: CityOption; readonly label: string | null }
  | { readonly question: "education"; readonly value: EducationOption }
  | { readonly question: "major"; readonly value: MajorOption }
  | { readonly question: "experience"; readonly value: ExperienceOption }
  | { readonly question: "interest"; readonly values: readonly [InterestOption] | readonly [InterestOption, InterestOption] }
  | { readonly question: "priority"; readonly value: PriorityOption };

/** The earliest hit (longer first at the same start) of a keyword table, used up. */
function earliestOf<V>(reading: Reading, table: readonly { readonly keyword: string; readonly value: V }[], skip?: (v: V) => boolean): { value: V; keyword: string } | null {
  const byKeyword = new Map<string, V>();
  for (const entry of table) if (!skip?.(entry.value)) byKeyword.set(nk(entry.keyword), entry.value);
  const hit = reading.find([...byKeyword.keys()])[0];
  if (!hit) return null;
  const value = byKeyword.get(hit.keyword);
  if (value === undefined) return null;
  reading.use(hit.start, hit.end);
  return { value, keyword: hit.keyword };
}

function readCity(reading: Reading): Found | null {
  const hit = reading.find(CITY_ENTRIES.map((e) => e.keyword))[0];
  if (!hit) return null;
  const entry = CITY_ENTRIES.find((e) => nk(e.keyword) === hit.keyword);
  if (!entry) return null;
  reading.use(hit.start, hit.end);
  return { question: "city", value: entry.value, label: entry.label };
}

function readEducation(reading: Reading): Found | null {
  const found = earliestOf(reading, EDUCATION_KEYWORDS);
  return found ? { question: "education", value: found.value } : null;
}

function readMajor(reading: Reading): Found | null {
  // «هندسة» means engineering only when no `cs` keyword matched (4.3).
  const csHit = reading.find(MAJOR_KEYWORDS.filter((k) => k.value === "cs").map((k) => k.keyword)).length > 0;
  const found = earliestOf(reading, MAJOR_KEYWORDS, (v) => csHit && v === "engineering");
  return found ? { question: "major", value: found.value } : null;
}

/** A number in digits (0-50) or words, at word index i. */
function numberAt(reading: Reading, i: number): number | null {
  const word = reading.words[i];
  if (word === undefined) return null;
  if (/^\d{1,2}$/.test(word)) {
    const n = Number(word);
    return n <= 50 ? n : null;
  }
  const entry = NUMBER_WORDS.find((e) => nk(e.word) === word);
  return entry ? entry.value : null;
}

function readExperience(reading: Reading): Found | null {
  // 1. «أقل من سنة», «نص سنة», «نصف سنة».
  const under = reading.find(EXPERIENCE_UNDER1_PHRASES)[0];
  if (under) {
    reading.use(under.start, under.end);
    return { question: "experience", value: "under1" };
  }
  // 2. A month or training word, whatever number is beside it («6 أشهر»).
  const month = reading.find(EXPERIENCE_MONTH_WORDS)[0];
  if (month) {
    const before = month.start - 1;
    reading.use(before >= 0 && !reading.isUsed(before) && numberAt(reading, before) !== null ? before : month.start, month.end);
    return { question: "experience", value: "under1" };
  }
  // 3. «أكثر من N» / «فوق N» with N of 3 or more.
  for (const more of reading.find(EXPERIENCE_MORE_WORDS)) {
    const n = numberAt(reading, more.end);
    if (n !== null && n >= 3) {
      reading.use(more.start, more.end + 1);
      return { question: "experience", value: "over3" };
    }
  }
  // 4. «بدون», «ما عندي», «لا يوجد», «حديث تخرج», «خريج جديد».
  const none = reading.find(EXPERIENCE_NONE_WORDS)[0];
  if (none) {
    reading.use(none.start, none.end);
    return { question: "experience", value: "none" };
  }
  // 5. A number in digits or words: 0 → none; 1 to 3 → 1to3; above 3 → over3.
  for (let i = 0; i < reading.words.length; i++) {
    if (reading.isUsed(i)) continue;
    const n = numberAt(reading, i);
    if (n === null) continue;
    reading.use(i, i + 1);
    return { question: "experience", value: n === 0 ? "none" : n <= 3 ? "1to3" : "over3" };
  }
  return null;
}

function readInterest(reading: Reading): Found | null {
  const hits = reading.find(INTEREST_KEYWORDS.map((k) => k.keyword));
  const values: InterestOption[] = [];
  for (const hit of hits) {
    const entry = INTEREST_KEYWORDS.find((k) => nk(k.keyword) === hit.keyword);
    if (!entry) continue;
    reading.use(hit.start, hit.end);
    if (!values.includes(entry.value)) values.push(entry.value);
  }
  const real = values.filter((v) => v !== "unsure");
  const kept = real.length > 0 ? real : values;
  const [a, b] = kept;
  if (!a) return null;
  return { question: "interest", values: b ? [a, b] : [a] };
}

function readPriority(reading: Reading): Found | null {
  const found = earliestOf(reading, PRIORITY_KEYWORDS);
  return found ? { question: "priority", value: found.value } : null;
}

const READERS: Readonly<Record<QuestionId, (reading: Reading) => Found | null>> = {
  city: readCity,
  education: readEducation,
  major: readMajor,
  experience: readExperience,
  interest: readInterest,
  priority: readPriority,
};

/** Step 3: the pending question. */
export function readPending(reading: Reading, question: QuestionId): Found | null {
  return READERS[question](reading);
}

/** For the pending question only: «لا أعرف» / «ما أدري» / «تخطَّ» is itself an answer (its neutral value). */
export function readNeutral(reading: Reading): boolean {
  const hit = reading.find(NEUTRAL_PHRASES)[0];
  if (!hit) return false;
  reading.use(hit.start, hit.end);
  return true;
}

/**
 * Step 4: the other unanswered questions, in order. `interest` and `priority` only with a wish word; `experience`
 * only when the message contains «خبرة» or a year word.
 */
export function readOthers(reading: Reading, unanswered: readonly QuestionId[]): Found[] {
  const wish = reading.mentions(WISH_WORDS);
  const yearOrExperience = reading.mentions(EXPERIENCE_GATE_WORDS);
  const found: Found[] = [];
  for (const question of unanswered) {
    if ((question === "interest" || question === "priority") && !wish) continue;
    if (question === "experience" && !yearOrExperience) continue;
    const f = READERS[question](reading);
    if (f) found.push(f);
  }
  return found;
}
