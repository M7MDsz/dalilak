// Owner: brain-cv. The local keyword analyser of spec 6.5 (pure, deterministic). Used by the analyse route (always
// first; alone for the sample CV and with no key) and by the store's seeds.
import { SKILLS } from "@/lib/data";
import { findKeywords, normalizeText, tokenize } from "@/lib/text/normalize";
import type { CvAnalysis, CvSkill, SkillId, StarSlot } from "@/lib/types";

import { cleanCvLines, type CvLine } from "./clean";
import { isSampleCv } from "./sample";

/** Spec 6.5 step 6: a following advanced word gives 3 stars. */
export const ADVANCED_WORDS: readonly string[] = [
  "متقدم",
  "متقدمة",
  "خبير",
  "خبيرة",
  "احتراف",
  "احترافي",
  "ممتاز",
  "طلاقة",
  "advanced",
  "expert",
  "fluent",
];

/** Spec 6.5 step 6: a following middle word gives 2 stars. */
export const MIDDLE_WORDS: readonly string[] = ["متوسط", "متوسطة", "جيد جداً", "intermediate"];

/**
 * A level word right after one of these (up to two words later) grades a degree, not a skill: «بكالوريوس الإحصاء
 * بتقدير ممتاز», «GPA 4.6 (Excellent)». It does not raise the stars.
 */
export const GRADE_WORDS: readonly string[] = ["تقدير", "معدل", "GPA", "grade"];

/**
 * Phrases in which a skill's alias means something else (a CV-reader test, 21 Nov 2026): an alias hit that lies inside
 * one of these on the same line does not count. Several of these aliases are fixed by the 9.2 table («استعلامات»,
 * «Pivot»), so the meaning is told here, by its context, and the alias lists stay as they are.
 */
export const NOT_A_SKILL: readonly { readonly skill: SkillId; readonly phrases: readonly string[] }[] = [
  // Customer or patient inquiries, the information desk.
  { skill: "sql", phrases: ["استعلامات العملاء", "استعلامات المراجعين", "استعلامات المرضى", "استعلامات الموظفين", "مكتب الاستعلامات", "الرد على الاستعلامات"] },
  { skill: "excel", phrases: ["career pivot", "pivot to", "pivot into"] },
  { skill: "react", phrases: ["react to", "react quickly", "react fast", "react promptly"] },
  { skill: "apis", phrases: ["rest of", "the rest", "at rest", "rest days"] },
  // Shipping containers.
  { skill: "devops", phrases: ["شحن الحاويات", "حاويات الشحن", "تخليص الحاويات", "تتبع الحاويات", "متابعة الحاويات", "ساحة الحاويات", "محطة الحاويات"] },
  // Red / amber / green status reports.
  { skill: "llm-apps", phrases: ["RAG status", "RAG report", "RAG reports", "RAG rating", "تقرير RAG", "تقارير RAG"] },
  // Market-basket analysis.
  { skill: "procurement", phrases: ["سلة المشتريات", "سلة التسوق"] },
];

/**
 * A line that is only a contact heading names no skill: «التواصل» is the communication alias of 9.2, and «وسائل
 * التواصل» the social-media one, but over a phone number and an e-mail they mean "contact".
 */
export const CONTACT_HEADINGS: readonly string[] = [
  "التواصل",
  "للتواصل",
  "معلومات التواصل",
  "بيانات التواصل",
  "طرق التواصل",
  "وسائل التواصل",
  "معلومات الاتصال",
  "بيانات الاتصال",
  "contact",
  "contact information",
  "contact info",
  "contact details",
];

/** Spec 6.5 step 7: the evidence is cut at this many characters, on a word boundary, with «…». */
export const EVIDENCE_MAX_CHARS = 160;

/**
 * Spec 6.5 step 7: the cleaned line, trimmed, cut at 160 characters on a word boundary with «…» (the «…» included in
 * the 160).
 */
export function evidenceText(line: string): string {
  const text = line.trim();
  if (text.length <= EVIDENCE_MAX_CHARS) return text;
  const head = text.slice(0, EVIDENCE_MAX_CHARS - 1);
  const space = head.search(/\s\S*$/u);
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`;
}

/** One alias found on a line: word indexes [start, end) into tokenize(normalizeText(line)). */
interface AliasHit {
  readonly skill: SkillId;
  readonly start: number;
  readonly end: number;
  /** Characters of the normalised alias (the tie-break after the word count). */
  readonly chars: number;
  /** Catalogue position (the last, stable tie-break). */
  readonly order: number;
}

/**
 * Spec 6.5 step 5 on one line: every skill's aliases (4.3 keyword rules: whole words, Latin case ignored, Arabic
 * normalised, with or without «ال»); where two aliases overlap the longer one wins and its words are used once
 * (more words first, then more characters, then the earlier hit). Returns the kept hits in word order.
 */
function skillHits(text: string): AliasHit[] {
  const all: AliasHit[] = [];
  const otherMeaning = new Map<SkillId, { start: number; end: number }[]>(
    NOT_A_SKILL.map(({ skill, phrases }) => [skill, findKeywords(text, phrases)]),
  );
  SKILLS.forEach((skill, order) => {
    const contexts = otherMeaning.get(skill.id) ?? [];
    for (const hit of findKeywords(text, skill.aliases)) {
      if (contexts.some((c) => c.start <= hit.start && hit.end <= c.end)) continue;
      all.push({ skill: skill.id, start: hit.start, end: hit.end, chars: normalizeText(hit.keyword).length, order });
    }
  });
  all.sort((a, b) => b.end - b.start - (a.end - a.start) || b.chars - a.chars || a.start - b.start || a.order - b.order);
  const used = new Set<number>();
  const kept: AliasHit[] = [];
  for (const hit of all) {
    let free = true;
    for (let i = hit.start; i < hit.end && free; i += 1) free = !used.has(i);
    if (!free) continue;
    for (let i = hit.start; i < hit.end; i += 1) used.add(i);
    kept.push(hit);
  }
  return kept.sort((a, b) => a.start - b.start || a.order - b.order);
}

/**
 * Spec 6.5 step 6: a level word follows `hit` on the same line with no other skill's alias between them.
 * `levelStarts` are the word indexes where a level word of the wanted kind starts.
 */
function levelWordFollows(hit: AliasHit, hits: readonly AliasHit[], levelStarts: readonly number[]): boolean {
  return levelStarts.some(
    (level) => level >= hit.end && !hits.some((other) => other.skill !== hit.skill && other.start >= hit.end && other.start < level),
  );
}

interface LineFacts {
  /** Skills named on the line. */
  readonly named: ReadonlySet<SkillId>;
  /** Skills with an advanced word following one of their aliases. */
  readonly advanced: ReadonlySet<SkillId>;
  /** Skills with a middle word following one of their aliases. */
  readonly middle: ReadonlySet<SkillId>;
}

/** The line is a contact heading and nothing else (CONTACT_HEADINGS). */
function isContactHeading(text: string): boolean {
  const words = tokenize(normalizeText(text)).length;
  return words <= 3 && findKeywords(text, CONTACT_HEADINGS).some((h) => h.start === 0 && h.end === words);
}

function lineFacts(text: string): LineFacts {
  const named = new Set<SkillId>();
  const advanced = new Set<SkillId>();
  const middle = new Set<SkillId>();
  if (isContactHeading(text)) return { named, advanced, middle };
  const hits = skillHits(text);
  if (hits.length === 0) return { named, advanced, middle };
  // Level words must not be read inside an alias (no alias contains one today; this keeps it that way), nor right
  // after a grade word («بتقدير ممتاز»).
  const insideAlias = (i: number) => hits.some((h) => i >= h.start && i < h.end);
  const gradeEnds = findKeywords(text, GRADE_WORDS).map((h) => h.end);
  const afterGrade = (i: number) => gradeEnds.some((end) => i >= end && i - end <= 2);
  const levelStarts = (words: readonly string[]) =>
    findKeywords(text, words).map((h) => h.start).filter((i) => !insideAlias(i) && !afterGrade(i));
  const advancedStarts = levelStarts(ADVANCED_WORDS);
  const middleStarts = levelStarts(MIDDLE_WORDS);
  for (const hit of hits) {
    named.add(hit.skill);
    if (levelWordFollows(hit, hits, advancedStarts)) advanced.add(hit.skill);
    if (levelWordFollows(hit, hits, middleStarts)) middle.add(hit.skill);
  }
  return { named, advanced, middle };
}

/**
 * Spec 6.5 steps 5-8 over cleaned lines (exported for the model merge, which must use the same lines). The evidence is
 * the first line, in document order, that justifies the level found before it is lowered to the skill's maximum:
 * 3 → the first line with a following advanced word; 2 → the first line in an applied zone or with a following middle
 * word; 1 → the first line naming the skill. Skills come back in document order of their evidence line, then in
 * catalogue order (the show marks the document from top to bottom; the results page regroups them by field).
 */
export function skillsFromLines(lines: readonly CvLine[]): CvSkill[] {
  const facts = lines.map((line) => lineFacts(line.text));
  const out: { skill: CvSkill; order: number }[] = [];
  SKILLS.forEach((skill, order) => {
    const firstWhere = (test: (f: LineFacts, line: CvLine) => boolean): number =>
      facts.findIndex((f, i) => {
        const line = lines[i];
        return line !== undefined && f.named.has(skill.id) && test(f, line);
      });
    const named = firstWhere(() => true);
    if (named < 0) return;
    const advanced = firstWhere((f) => f.advanced.has(skill.id));
    const middle = advanced >= 0 ? -1 : firstWhere((f, line) => line.zone === "applied" || f.middle.has(skill.id));
    const raw: StarSlot = advanced >= 0 ? 3 : middle >= 0 ? 2 : 1;
    const lineIndex = advanced >= 0 ? advanced : middle >= 0 ? middle : named;
    const stars: StarSlot = raw <= skill.maxStars ? raw : skill.maxStars;
    const text = lines[lineIndex]?.text ?? "";
    out.push({ skill: { skill: skill.id, stars, evidence: evidenceText(text), line: lineIndex }, order });
  });
  return out.sort((a, b) => a.skill.line - b.skill.line || a.order - b.order).map((entry) => entry.skill);
}

/** Spec 6.5 steps 1-8. engine "local"; isSample from isSampleCv. The sample CV must give exactly the eight skills of 6.2. */
export function analyseCvLocal(raw: string): CvAnalysis {
  const lines = cleanCvLines(raw);
  return {
    skills: skillsFromLines(lines),
    lines: lines.map((line) => line.text),
    engine: "local",
    isSample: isSampleCv(raw),
  };
}

/** Words of a text under the 4.3 rules (re-exported for the model merge's evidence check). */
export function cvWords(text: string): string[] {
  return tokenize(normalizeText(text));
}
