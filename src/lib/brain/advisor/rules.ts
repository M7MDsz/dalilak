// Owner: brain-advisor. The checks of spec 5.5 applied to a MODEL's reply (pure).
import {
  APPLICATION_TIMING,
  CATALOGUE_COUNTS,
  LEADERBOARD_SIZE,
  LESSONS_BY_HOURS,
  LEVEL_THRESHOLDS,
  MATCH_LINE,
  POINTS_PER_SKILL,
  XP,
} from "@/lib/data";
import { LIMITS } from "@/lib/brain/protocol";
import type { UserFacts } from "@/lib/types";

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
