// Owner: brain-advisor. The checks of spec 5.5 applied to a MODEL's reply (pure).
import { guideTitle } from "@/lib/copy";
import {
  APPLICATION_TIMING,
  CATALOGUE_COUNTS,
  COMPANIES,
  COURSES,
  FIELDS,
  GUIDES,
  JOBS,
  LEADERBOARD_SIZE,
  LESSONS_BY_HOURS,
  LEVEL_THRESHOLDS,
  MATCH_LINE,
  POINTS_PER_SKILL,
  SKILLS,
  XP,
} from "@/lib/data";
import { CAREER_FAMILIES, ENTRY_ROUTES, knowledgeForModel } from "@/lib/data/careers";
import { LIMITS } from "@/lib/brain/protocol";
import type { UserFacts } from "@/lib/types";

import { guideForModel } from "./guide";
import * as W from "./words";

// ── Rule 8: numbers and money come from data ──────────────────────────────────────────────────────────────────────

/** The money words of rule 8. Salaries are never in the data, so any of these fails unless a tool result carries it. */
const MONEY_WORDS = ["ريال", "ر.س", "SAR", "ألف", "مليون"];

/** Digits of any script → Latin, so «٧٠» and "70" are the same number. */
function latinDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Every number written in a text: "70", "6.67", "2026", "0001" (thousands separators joined: "1,240" → "1240"). */
function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const match of latinDigits(text).matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)) out.push(match[0].replace(/,/g, ""));
  return out;
}

/** The product constants of rule 8, as numbers. */
function productConstants(): number[] {
  return [
    ...Object.values(CATALOGUE_COUNTS),
    ...Object.values(XP),
    ...LEVEL_THRESHOLDS,
    ...Object.keys(LESSONS_BY_HOURS).map(Number),
    ...Object.values(LESSONS_BY_HOURS),
    MATCH_LINE,
    POINTS_PER_SKILL,
    LEADERBOARD_SIZE,
    100,
    APPLICATION_TIMING.reviewAfterMs / 1000,
    APPLICATION_TIMING.resultAfterMs / 60_000,
    // Levels 1-7, stars 1-3, and the counts of the five skills a job requires.
    1, 2, 3, 4, 5, 6, 7,
  ];
}

/** A number and its usual written forms: 6.6667 → "6.6667", "6.67", "6.7", "7". */
function forms(value: number): string[] {
  if (!Number.isFinite(value)) return [];
  const out = new Set<string>([String(value), String(Math.round(value)), String(Math.abs(Math.round(value)))]);
  if (!Number.isInteger(value)) {
    out.add(value.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));
    out.add(value.toFixed(1).replace(/0+$/, "").replace(/\.$/, ""));
  }
  return [...out];
}

/** Every number found anywhere inside a value (strings scanned for digit runs, numbers in all their forms). */
function collect(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 12 || value === null || value === undefined) return;
  if (typeof value === "number") {
    for (const f of forms(value)) into.add(f);
    return;
  }
  if (typeof value === "string") {
    for (const n of numbersIn(value)) {
      into.add(n);
      into.add(String(Number(n)));
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, into, depth + 1);
    return;
  }
  if (typeof value === "object") for (const item of Object.values(value)) collect(item, into, depth + 1);
}

/** Every string anywhere inside a value, joined (for the money-word check). */
function allText(value: unknown, depth = 0): string {
  if (depth > 12 || value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => allText(v, depth + 1)).join(" ");
  if (typeof value === "object") return Object.values(value).map((v) => allText(v, depth + 1)).join(" ");
  return "";
}

/**
 * Rule 8: every digit sequence and money word must appear in this turn's tool results, the facts or the product constants.
 * Callers pass the derived numbers the model was shown (the snapshot digest of the system prompt) among `toolResults`.
 */
export function numbersAreGrounded(reply: string, toolResults: readonly unknown[], facts: UserFacts): boolean {
  const allowed = new Set<string>();
  for (const result of toolResults) collect(result, allowed);
  collect(facts, allowed);
  for (const c of productConstants()) for (const f of forms(c)) allowed.add(f);

  for (const n of numbersIn(reply)) {
    if (!allowed.has(n) && !allowed.has(String(Number(n)))) return false;
  }

  const text = W.textOf(reply);
  for (const money of MONEY_WORDS) {
    const present = money === "ر.س" ? reply.includes("ر.س") : W.has(text, [money]);
    if (!present) continue;
    const source = `${allText(toolResults)} ${allText(facts)}`;
    if (!source.includes(money)) return false;
  }
  return true;
}

// ── Rule 9: no done-claim without the deed ────────────────────────────────────────────────────────────────────────

/** Each claim word and the action types that would make it true. «تم» is true after any action. */
const CLAIMS: readonly { readonly words: readonly string[]; readonly actions: readonly string[] }[] = [
  { words: ["تم"], actions: ["navigate", "apply", "start_course", "set_target"] },
  // Najdi forms too («دليلك» speaks Najdi since 18 Nov 2026; matching is by whole word). Only forms that can only mean
  // "I did it for you": «فتحتها» / «قدّمته» / «بدأتها» also mean "you unlocked / sent / started it" («الشارات اللي
  // فتحتها» is the user's badges), and rejected good replies when they were listed here.
  { words: ["أرسلت", "قدّمت", "قدّمتلك", "أرسلتلك", "رسلتلك"], actions: ["apply"] },
  { words: ["بدأنا", "بدأت", "بدينا", "بديناها", "بدأناها", "سجّلتك"], actions: ["start_course"] },
  { words: ["فتحت", "فتحتلك"], actions: ["navigate", "apply", "start_course", "set_target"] },
  { words: ["غيّرت", "غيّرتلك"], actions: ["set_target"] },
];

/** Rule 9: a done-claim (تم، أرسلت، قدّمت، بدأنا، بدأت، فتحت، غيّرت) without a matching event in this turn. */
export function claimsUndoneDeed(reply: string, emittedActions: readonly string[]): boolean {
  const text = W.textOf(reply);
  for (const claim of CLAIMS) {
    if (!W.has(text, claim.words)) continue;
    if (!claim.actions.some((a) => emittedActions.includes(a))) return true;
  }
  return false;
}

// ── Rule 17: length ────────────────────────────────────────────────────────────────────────────────────────────────

const SENTENCE_END = /[.!؟?…]/;

/** Rule 17: cut at the last full sentence before 600 characters. */
export function capReplyLength(reply: string): string {
  const text = reply.trim();
  if (text.length <= LIMITS.replyChars) return text;
  const head = text.slice(0, LIMITS.replyChars);
  for (let i = head.length - 1; i > 0; i--) {
    const ch = head[i];
    if (ch !== undefined && SENTENCE_END.test(ch)) {
      // A closing quote right after the full stop belongs to the sentence: «…».
      const next = head[i + 1];
      return head.slice(0, next === "»" ? i + 2 : i + 1).trim();
    }
  }
  // No sentence end at all: cut at the last space and close with an ellipsis.
  const space = head.lastIndexOf(" ");
  return `${head.slice(0, space > 0 ? space : LIMITS.replyChars - 1).trim()}…`;
}

// ── Rule 7: navigation is asked for ────────────────────────────────────────────────────────────────────────────────

/** Rule 7: the message contains an open word (افتح، ورّني، أرني، اعرض، روح، خذني، ودّني، وين، open، show، go to). */
export function asksToOpen(message: string): boolean {
  return W.has(W.textOf(message), W.OPEN_WORDS);
}

/** How / where words: «كيف أغيّر صورتي؟» wants the page where it is done opened too (Mohammed, 18 Nov 2026). */
const HOW_TO_WORDS = ["كيف", "شلون", "وين", "فين", "ممكن"];

/**
 * Rule 7, widened: a how-to question about the platform may open the page it is about (guide.ts). How-to means a how /
 * where word followed by a first-person verb («كيف أغيّر…»، «وين ألقى…»، «شلون أرفع…»), the word «طريقة», or English
 * "how do / can I", "where do / can I". «كيف حالي في المنافسة؟» is a question about the user, not a how-to.
 */
export function asksHowTo(message: string): boolean {
  if (/\b(how|where)\s+(do|can|should|to)\b/i.test(message)) return true;
  const text = W.textOf(message);
  if (W.has(text, ["طريقة"])) return true;
  const how = new Set(HOW_TO_WORDS.map((w) => W.textOf(w).n));
  const words = text.words;
  for (let i = 0; i < words.length - 1; i++) {
    const next = words[i + 1] ?? "";
    if (how.has(words[i] ?? "") && /^[اأإآ]/.test(next) && next.length >= 3) return true;
  }
  return false;
}

// ── Internal ids never reach the user (21 Nov 2026, QA: «(c-powerbi-1)», «(data-analyst-riyadh)» in replies) ────────

let idNames: ReadonlyMap<string, string> | null = null;

/** Every internal id of the data, with the name the user knows it by. */
function idNameMap(): ReadonlyMap<string, string> {
  if (idNames) return idNames;
  const map = new Map<string, string>();
  for (const f of FIELDS) map.set(f.id, f.name);
  for (const r of ENTRY_ROUTES) map.set(r.id, `«${r.nameAr}»`);
  for (const f of CAREER_FAMILIES) map.set(f.id, `«${f.title}»`);
  for (const c of COMPANIES) map.set(c.id, c.short);
  for (const s of SKILLS) map.set(s.id, s.name);
  for (const c of COURSES) map.set(c.id, `«${guideTitle(c.id)}»`);
  for (const j of JOBS) map.set(j.id, `«${j.title}»`);
  idNames = map;
  return map;
}

const URL_RE = /https?:\/\/[^\s«»()]+/g;
/** A lowercase token with hyphens: «data-analyst-riyadh», «c-powerbi-1», «html-css». */
const KEBAB = /(?<![A-Za-z0-9-])[a-z0-9]+(?:-[a-z0-9]+)+(?![A-Za-z0-9-])/g;
/** An id alone in brackets or quotes: «(c-powerbi-1)», «[excel]», ««data-analyst-riyadh»». */
const WRAPPED = /\s*[(\[]\s*([a-z0-9][a-z0-9-]*)\s*[)\]]/g;
const QUOTED = /«\s*([a-z0-9][a-z0-9-]*)\s*»/g;

function scrubPart(part: string): string {
  const names = idNameMap();
  const isId = (token: string): boolean => names.has(token) || token.split("-").length >= 3;
  return part
    .replace(WRAPPED, (all, token: string) => (isId(token) ? "" : all))
    .replace(QUOTED, (all, token: string) => (names.has(token) ? (names.get(token) ?? "") : isId(token) ? "" : all))
    .replace(KEBAB, (token) => names.get(token) ?? (token.split("-").length >= 3 ? "" : token))
    .replace(/«»/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([،,.؟?!:؛])/g, "$1");
}

/**
 * Takes every internal id out of a reply shown to the user: an id in brackets is dropped (the name is said beside it),
 * a bare one becomes its name («data-analyst-riyadh» → «محلل بيانات»), and any other lowercase token of three hyphenated
 * parts is dropped. Links are left as they are. Applied to every text «دليلك» sends.
 */
export function scrubIds(text: string): string {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const at = match.index ?? 0;
    out += scrubPart(text.slice(last, at)) + match[0];
    last = at + match[0].length;
  }
  return (out + scrubPart(text.slice(last))).trim();
}

// ── Names come from the data (21 Nov 2026, QA: a model named certificates the data does not have) ─────────────────

/** Latin words of a text, lower-cased, starting with a letter («Security+», «C#», «PL-300» → «pl»). */
function latinWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9+#]*/g) ?? [];
}

/** Words of the product itself a reply may use. */
const PRODUCT_WORDS = ["xp", "cv", "pdf", "word", "ok", "ai", "dalil", "dalilak", "daleel", "linkedin", "github", "youtube", "online"];

let dataWords: ReadonlySet<string> | null = null;

/** Every Latin word of the app's checked data: careers (certificates, employers, routes), guides, companies, jobs, skills. */
function dataWordSet(): ReadonlySet<string> {
  if (dataWords) return dataWords;
  const words = new Set<string>(PRODUCT_WORDS);
  const add = (value: unknown): void => {
    for (const w of latinWords(allText(value))) words.add(w);
  };
  add(knowledgeForModel());
  add(GUIDES);
  add(COMPANIES);
  add(JOBS);
  add(SKILLS);
  add(COURSES);
  add(FIELDS);
  add(guideForModel());
  dataWords = words;
  return words;
}

/**
 * Every Latin name in a model's reply (a certificate, exam, programme, company, tool: «CompTIA Security+») must be in the
 * app's data or in this turn's tool results and facts. A certificate or company from the model's own memory fails, and
 * the reply is replaced by the local answer.
 */
export function namesAreGrounded(reply: string, sources: readonly unknown[]): boolean {
  const known = dataWordSet();
  let turn: Set<string> | null = null;
  for (const word of latinWords(reply)) {
    if (known.has(word)) continue;
    turn ??= new Set(latinWords(allText(sources)));
    if (!turn.has(word)) return false;
  }
  return true;
}

// ── Facts about the user come from the snapshot (21 Nov 2026, QA: «مع خبرتك» to a user with no experience) ─────────

const CLAIMS_EXPERIENCE = ["خبرتك", "خبراتك", "سنوات خبرتك", "خبرتك العملية", "خبرة عندك", "your experience"];
const CLAIMS_NO_EXPERIENCE = ["ما عندك خبرة", "ماعندك خبرة", "ما عندك أي خبرة", "بدون خبرة", "no experience"];
const CLAIMS_DEGREE = ["شهادتك الجامعية", "بكالوريوسك", "تخرجك", "تخرّجك", "تخرجت", "تخرّجت", "your degree"];

/**
 * A model may say only what the snapshot holds about the user: no work experience unless the onboarding answer gives
 * some (and no "no experience" when it gives years), no university degree unless the answer is a bachelor or higher.
 */
export function userFactsGrounded(reply: string, facts: UserFacts): boolean {
  const text = W.textOf(reply);
  const experience = facts.answers.experience;
  const hasExperience = experience === "under1" || experience === "1to3" || experience === "over3";
  if (!hasExperience && W.has(text, CLAIMS_EXPERIENCE)) return false;
  if ((experience === "1to3" || experience === "over3") && W.has(text, CLAIMS_NO_EXPERIENCE)) return false;
  const education = facts.answers.education;
  const degree = education === "bachelor" || education === "postgrad";
  if (!degree && W.has(text, CLAIMS_DEGREE)) return false;
  return true;
}

// ── No Persian / Urdu or Fusha slips (21 Nov 2026, QA: «روز» in an answer about the trial period) ────────────────────

/** Letters of Persian and Urdu that Arabic does not use (پ چ ژ گ ک ی ہ ے ۀ). */
const NON_ARABIC_LETTERS = /[\u067E\u0686\u0698\u06AF\u06A9\u06CC\u06C1\u06D2\u06C0]/;
/** Persian / Urdu words written in Arabic letters. */
const NON_ARABIC_WORDS = ["روز", "است", "هست", "میں", "برای", "خیلی", "چطور", "ہے", "اینجا", "آنجا"];
/** Fusha and other dialects' words the prompt bans (5.1 VOICE); allowed when the data quoted this turn has them. */
const OFF_DIALECT_WORDS = ["سوف", "لا أستطيع", "لديك", "ماذا", "دحين", "عايز", "هلّق"];

/**
 * A model reply that slipped out of Najdi: a Persian / Urdu letter or word, or a Fusha / other dialect word the prompt
 * bans (unless this turn's tool results, the data it may quote, have it too). True means the reply is replaced.
 */
export function dialectSlip(reply: string, sources: readonly unknown[] = []): boolean {
  if (NON_ARABIC_LETTERS.test(reply)) return true;
  const text = W.textOf(reply);
  if (W.has(text, NON_ARABIC_WORDS)) return true;
  if (!W.has(text, OFF_DIALECT_WORDS)) return false;
  const quoted = W.textOf(allText(sources));
  return W.norm(OFF_DIALECT_WORDS).some((w) => W.has(text, [w]) && !W.has(quoted, [w]));
}
