// Owner: brain-advisor. Reading one typed onboarding message, in the order of spec 4.3 (each step has one test, so no
// two rules compete): 1 question · 2 greeting / thanks set aside · 3 the pending question · 4 the other unanswered
// questions · 5 could not be mapped. Words that matched are used up. Pure.
import { getJobCity, getSaRegion, nearestJobMarket } from "@/lib/data";
import { COMPANY_KEYWORDS, matchCompanyAlone } from "@/lib/engine";
import { findKeywords, normalizeText, tokenize } from "@/lib/text/normalize";
import type {
  CityOption,
  CompanyId,
  EducationOption,
  ExperienceOption,
  InterestOption,
  MajorOption,
  OnboardingStepId,
  PriorityOption,
} from "@/lib/types";

import {
  AMBIGUOUS_PLACE_WORDS,
  CITY_ENTRIES,
  COMPANY_GATE_WORDS,
  COMPANY_NONE_PHRASES,
  COUNT_PHRASES,
  EDUCATION_KEYWORDS,
  EXPERIENCE_GATE_WORDS,
  EXPERIENCE_MONTH_WORDS,
  EXPERIENCE_MORE_WORDS,
  EXPERIENCE_NONE_WORDS,
  EXPERIENCE_UNDER1_PHRASES,
  FILLER_WORDS,
  GREETING_OTHER,
  GREETING_SALAM,
  INTEREST_KEYWORDS,
  MAJOR_KEYWORDS,
  NEUTRAL_PHRASES,
  NUMBER_WORDS,
  PLACE_CONTEXT_WORDS,
  PLACE_ENTRIES,
  placeSpellings,
  PRIORITY_KEYWORDS,
  QUESTION_WORDS,
  THANKS_WORDS,
  VOCATIVE_WORDS,
  WHO_PHRASES,
  WHY_ASK_PHRASES,
  WISH_WORDS,
  type PlaceAck,
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

  /** Words not used yet outside [start, end). */
  restOutside(start: number, end: number): string[] {
    return this.words.filter((_, i) => !this.used[i] && (i < start || i >= end));
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
  | { readonly question: "city"; readonly value: CityOption; readonly label: string | null; readonly place?: PlaceAck }
  | { readonly question: "education"; readonly value: EducationOption }
  | { readonly question: "major"; readonly value: MajorOption }
  | { readonly question: "experience"; readonly value: ExperienceOption }
  | { readonly question: "interest"; readonly values: readonly [InterestOption] | readonly [InterestOption, InterestOption] }
  | { readonly question: "priority"; readonly value: PriorityOption }
  | { readonly question: "company"; readonly value: CompanyId | "none" };

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

const CITY_KEYWORDS = [...CITY_ENTRIES.map((e) => e.keyword), ...PLACE_ENTRIES.map((e) => e.keyword)];
const AMBIGUOUS_PLACES = new Set(AMBIGUOUS_PLACE_WORDS.flatMap(placeSpellings).flatMap((w) => [nk(w), nk(w).replace(/^ال/, "")]));
const PLACE_CONTEXT = new Set(PLACE_CONTEXT_WORDS.map(nk));
const PLACE_FILLERS = new Set([...FILLER_WORDS.map(nk), ...PLACE_CONTEXT]);
const MADINAH_WORD = nk("مدينة");

/** An ambiguous place name counts after a place word, with «ب» on its front («بالمذنب»), or when nothing else was said. */
function placeInContext(reading: Reading, hit: { keyword: string; start: number; end: number }): boolean {
  const before = reading.words[hit.start - 1];
  if (before !== undefined && PLACE_CONTEXT.has(before)) return true;
  const word = reading.words[hit.start] ?? "";
  if (word.startsWith("ب") && !hit.keyword.startsWith("ب")) return true;
  return reading.restOutside(hit.start, hit.end).every((w) => PLACE_FILLERS.has(w));
}

/** The place as recorded: its nearest big job market is the value; the label is the name as the table spells it. */
function placeFound(entry: (typeof PLACE_ENTRIES)[number]): Found {
  const { market, km } = nearestJobMarket(entry.place);
  const region = entry.region ?? getSaRegion(entry.place.region);
  const ack: PlaceAck = {
    label: entry.label,
    kind: entry.region ? "region" : entry.place.kind,
    regionName: region.name,
    seat: region.seat,
    market: getJobCity(market).name,
    km,
  };
  return { question: "city", value: market, label: entry.label, place: ack };
}

/**
 * The earliest city or place named (longer first at the same start): the five chip cities and «الخبر» as before, then
 * every other Saudi city, governorate and region (tables PLACE_ENTRIES). «مدينة» before a place is the word "city", not
 * «المدينة»; an everyday word that is also a place counts only as a place (see placeInContext).
 */
function readCity(reading: Reading): Found | null {
  const hits = reading.find(CITY_KEYWORDS);
  for (const hit of hits) {
    const core = CITY_ENTRIES.find((e) => nk(e.keyword) === hit.keyword);
    if (core) {
      if (core.value === "madinah" && reading.words[hit.start] === MADINAH_WORD && hits.some((h) => h.start === hit.end)) continue;
      reading.use(hit.start, hit.end);
      return { question: "city", value: core.value, label: core.label };
    }
    const entry = PLACE_ENTRIES.find((e) => nk(e.keyword) === hit.keyword);
    if (!entry) continue;
    if (AMBIGUOUS_PLACES.has(hit.keyword) && !placeInContext(reading, hit)) continue;
    reading.use(hit.start, hit.end);
    return placeFound(entry);
  }
  return null;
}

function readEducation(reading: Reading): Found | null {
  const found = earliestOf(reading, EDUCATION_KEYWORDS);
  return found ? { question: "education", value: found.value } : null;
}

/** The generic major words: they decide only when no specific major is named (21 Nov 2026, tester: «بكالوريوس علوم
 * الحاسب» read as science, «إدارة الموارد البشرية» as business). */
const GENERIC_MAJOR_WORDS: ReadonlySet<string> = new Set(["إدارة", "علوم", "هندسة"]);
const SPECIFIC_MAJORS = MAJOR_KEYWORDS.filter((k) => !GENERIC_MAJOR_WORDS.has(k.keyword));
/** «الحاسب», «الموارد البشرية», «التسويق»…: the specific Arabic keywords with the article too. */
const SPECIFIC_MAJORS_WITH_AL = [
  ...SPECIFIC_MAJORS,
  ...SPECIFIC_MAJORS.filter((k) => /^[؀-ۿ]/u.test(k.keyword) && !k.keyword.startsWith("ال")).map((k) => ({
    keyword: k.keyword
      .split(" ")
      .map((w) => (w.startsWith("ال") ? w : `ال${w}`))
      .join(" "),
    value: k.value,
  })),
];

function readMajor(reading: Reading): Found | null {
  // «هندسة» means engineering only when no `cs` keyword matched (4.3).
  const csHit = reading.find(SPECIFIC_MAJORS_WITH_AL.filter((k) => k.value === "cs").map((k) => k.keyword)).length > 0;
  const found =
    earliestOf(reading, SPECIFIC_MAJORS_WITH_AL) ?? earliestOf(reading, MAJOR_KEYWORDS, (v) => csHit && v === "engineering");
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
  // 4b. The dual «سنتين» / «عامين» (two years, no digit: «خبرة سنتين», 21 Nov 2026 tester) → 1to3.
  const dual = reading.find(["سنتين", "سنتان", "عامين", "عامان"])[0];
  if (dual) {
    reading.use(dual.start, dual.end);
    return { question: "experience", value: "1to3" };
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

/** Words around a company typed alone that are not part of its name: «أبي أشتغل في مهارة». */
const COMPANY_FILLERS = new Set([...PLACE_FILLERS, ...COMPANY_GATE_WORDS.map(nk), ...["أشتغل", "اشتغل", "شركة", "عند", "مع", "يمكن"].map(nk)]);

/** A company named (engine COMPANY_KEYWORDS: «أرامكو», «ارامكو», «Aramco», «اس تي سي», «stc» …): the earliest, longer first. */
function readCompanyName(reading: Reading): Found | null {
  const found = earliestOf(reading, COMPANY_KEYWORDS.map((k) => ({ keyword: k.keyword, value: k.id })));
  return found ? { question: "company", value: found.value } : null;
}

/**
 * Step 7 (20 Nov 2026): a company named; a whole answer that is an everyday-word name («مهارة», filler words aside); else
 * «لا، مو الحين» in its many forms («لا», «مافي», «بعدين», «not now»).
 */
function readCompany(reading: Reading): Found | null {
  const named = readCompanyName(reading);
  if (named) return named;
  const rest = reading.rest().filter((w) => !COMPANY_FILLERS.has(w));
  const alone = matchCompanyAlone(rest);
  if (alone) {
    reading.use(0, reading.words.length);
    return { question: "company", value: alone };
  }
  const none = reading.find(COMPANY_NONE_PHRASES)[0];
  if (!none) return null;
  reading.use(none.start, none.end);
  return { question: "company", value: "none" };
}

const READERS: Readonly<Record<OnboardingStepId, (reading: Reading) => Found | null>> = {
  city: readCity,
  education: readEducation,
  major: readMajor,
  experience: readExperience,
  interest: readInterest,
  company: readCompany,
  priority: readPriority,
};

/** Step 3: the pending question. */
export function readPending(reading: Reading, question: OnboardingStepId): Found | null {
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
 * only when the message contains «خبرة» or a year word; `company` only a company NAME, with a wish word («أبي أشتغل
 * في أرامكو»; never «لا», and never «أشتغل في stc», which is where one works now).
 */
export function readOthers(reading: Reading, unanswered: readonly OnboardingStepId[]): Found[] {
  const wish = reading.mentions(WISH_WORDS);
  const yearOrExperience = reading.mentions(EXPERIENCE_GATE_WORDS);
  const companyWish = reading.mentions(COMPANY_GATE_WORDS);
  const found: Found[] = [];
  for (const question of unanswered) {
    if ((question === "interest" || question === "priority") && !wish) continue;
    if (question === "experience" && !yearOrExperience) continue;
    if (question === "company") {
      const named = companyWish ? readCompanyName(reading) : null;
      if (named) found.push(named);
      continue;
    }
    const f = READERS[question](reading);
    if (f) found.push(f);
  }
  return found;
}
