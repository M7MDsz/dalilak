// Owner: data (expansion agent, 20 Nov 2026). Checks the expansion data, now wired into the catalogue (ids.ts, SKILLS,
// COURSES, JOBS, GUIDES through all-guides.ts): every job has exactly five requirements in roadmap order, every skill id referenced exists (old or new),
// prerequisites stay inside a field with no cycles and no new skill ever leads to a data-field skill, the aliases follow
// the rules at the top of src/lib/data/skills.ts (Arabic and English, no bare 9.2 word, no alias in two skills, no level
// word, nothing the sample CV contains: it must still give exactly its eight skills), one course per new star slot,
// one guide per new skill, and a knowledge base whose facts all keep their links.
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COURSES, getGuide, JOBS, SAMPLE_CV_BODY, SKILLS } from "@/lib/data";
import { ADVANCED_WORDS, MIDDLE_WORDS } from "@/lib/brain/cv/local-analyser";
import { COURSE_IDS, FIELD_IDS, JOB_IDS, SKILL_IDS } from "@/lib/ids";
import { findKeywords, normalizeText } from "@/lib/text/normalize";

import { EXPANSION_COURSE_IDS, EXPANSION_COURSES } from "./courses";
import { EXPANSION_GUIDES } from "./guides";
import { EXPANSION_JOB_IDS, EXPANSION_JOBS } from "./jobs";
import { CAREER_FAMILIES, CAREER_FAMILY_IDS, careersIndexForModel, ENTRY_ROUTE_IDS, ENTRY_ROUTES, knowledgeForModel } from "./knowledge";
import { EXPANSION_FIELD_IDS, EXPANSION_FIELDS, EXPANSION_SKILL_IDS, EXPANSION_SKILLS, type AnySkillId } from "./skills";

// ─── helpers (the same lenient reading as src/lib/data/data.test.ts) ────────────────────────────────────────────────

function norm(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ‌-‏‪-‮]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

function words(text: string): string[] {
  return norm(text)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((w) => w.length > 0);
}

function readings(word: string): string[] {
  const out = new Set<string>([word]);
  const stripAl = (w: string) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w);
  out.add(stripAl(word));
  if (word.startsWith("لل") && word.length > 3) out.add(word.slice(2));
  if (/^[وفبلك]/.test(word) && word.length > 2) {
    out.add(word.slice(1));
    out.add(stripAl(word.slice(1)));
  }
  return [...out];
}

function aliasOccurs(alias: string, textWords: readonly string[]): boolean {
  const aliasWords = words(alias).map((w) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w));
  if (aliasWords.length === 0) return false;
  for (let i = 0; i + aliasWords.length <= textWords.length; i++) {
    const ok = aliasWords.every((aw, j) => {
      const tw = textWords[i + j];
      return tw !== undefined && readings(tw).includes(aw);
    });
    if (ok) return true;
  }
  return false;
}

const wordCount = (text: string) => text.trim().split(/\s+/).length;
const isUrl = (url: string) => /^https:\/\/[^\s]+$/.test(url);
const isDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day);

interface AnySkill {
  readonly id: AnySkillId;
  readonly name: string;
  readonly field: string;
  readonly maxStars: number;
  readonly prereqs: readonly AnySkillId[];
  readonly aliases: readonly string[];
}
const ALL_SKILLS: readonly AnySkill[] = SKILLS;
const byId = new Map<string, AnySkill>(ALL_SKILLS.map((s) => [s.id, s]));
const skill = (id: string): AnySkill => {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown skill ${id}`);
  return s;
};
const isNewSkill = (id: string) => (EXPANSION_SKILL_IDS as readonly string[]).includes(id);

function prereqsOf(id: string, seen: Set<string> = new Set()): Set<string> {
  for (const p of skill(id).prereqs) {
    if (seen.has(p)) continue;
    seen.add(p);
    prereqsOf(p, seen);
  }
  return seen;
}

const BARE_WORDS = ["تحليل", "بيانات", "تصميم", "مشروع", "إدارة", "كتابة", "تقارير", "تطوير", "تدريب", "مبيعات", "نظام", "عرض", "تقديم", "عمل", "فريق"];
const SAMPLE_SKILLS = ["excel", "sql", "statistics", "programming", "english", "communication", "presentation", "teamwork"];

// ─── fields and skills ──────────────────────────────────────────────────────────────────────────────────────────────

describe("expansion: fields and skills", () => {
  it("wires the three new fields and the 16 new skills into the ids and the catalogue", () => {
    expect(EXPANSION_FIELDS.map((f) => f.id)).toEqual([...EXPANSION_FIELD_IDS]);
    for (const id of EXPANSION_FIELD_IDS) expect((FIELD_IDS as readonly string[]).includes(id), id).toBe(true);
    expect(EXPANSION_SKILLS.map((s) => s.id)).toEqual([...EXPANSION_SKILL_IDS]);
    expect(new Set(EXPANSION_SKILL_IDS).size).toBe(16);
    for (const s of EXPANSION_SKILLS) {
      expect((SKILL_IDS as readonly string[]).includes(s.id), s.id).toBe(true);
      expect(SKILLS.find((x) => x.id === s.id), s.id).toBe(s);
    }
    expect(SKILLS).toHaveLength(SKILL_IDS.length);
  });

  it("puts every new skill in a known field, with a short description", () => {
    const fields = new Set<string>([...FIELD_IDS, ...EXPANSION_FIELD_IDS]);
    for (const s of EXPANSION_SKILLS) {
      expect(fields.has(s.field), s.id).toBe(true);
      expect(wordCount(s.description), s.id).toBeLessThan(15);
    }
  });

  it("keeps prerequisites inside the skill's field, existing, and free of cycles (old and new together)", () => {
    for (const s of ALL_SKILLS) {
      for (const p of s.prereqs) {
        expect(byId.has(p), `${s.id} → ${p}`).toBe(true);
        expect(skill(p).field, `${s.id} → ${p}`).toBe(s.field);
      }
      expect(prereqsOf(s.id).has(s.id), `cycle at ${s.id}`).toBe(false);
    }
  });

  it("never makes a new skill a prerequisite of a data-field skill (the demo's field)", () => {
    for (const s of ALL_SKILLS.filter((x) => x.field === "data")) {
      for (const p of prereqsOf(s.id)) expect(isNewSkill(p), `${s.id} needs ${p}`).toBe(false);
    }
  });

  it("orders every field's new skills after their prerequisites", () => {
    const index = new Map<string, number>(EXPANSION_SKILL_IDS.map((id, i) => [id, i]));
    for (const s of EXPANSION_SKILLS) {
      for (const p of s.prereqs) if (index.has(p)) expect(index.get(p)!, `${p} before ${s.id}`).toBeLessThan(index.get(s.id)!);
    }
  });
});

// ─── aliases ────────────────────────────────────────────────────────────────────────────────────────────────────────

describe("expansion: aliases (rules of src/lib/data/skills.ts)", () => {
  it("gives every new skill an Arabic and an English alias", () => {
    for (const s of EXPANSION_SKILLS) {
      expect(s.aliases.some((a) => /[؀-ۿ]/.test(a)), s.id).toBe(true);
      expect(s.aliases.some((a) => /[A-Za-z]/.test(a)), s.id).toBe(true);
    }
  });

  it("never uses a bare word of 9.2 as an alias", () => {
    const bare = new Set(BARE_WORDS.flatMap((w) => [norm(w), norm(`ال${w}`)]));
    for (const s of EXPANSION_SKILLS) for (const a of s.aliases) expect(bare.has(norm(a.trim())), `${s.id}: ${a}`).toBe(false);
  });

  it("never gives the same alias to two skills, old or new", () => {
    const owner = new Map<string, string>();
    for (const s of ALL_SKILLS) {
      for (const a of s.aliases) {
        const key = norm(a.trim());
        expect(owner.get(key) ?? s.id, `${a} in ${s.id} and ${owner.get(key) ?? ""}`).toBe(s.id);
        owner.set(key, s.id);
      }
    }
  });

  it("never puts a CV level word inside a new alias", () => {
    for (const s of EXPANSION_SKILLS) {
      for (const a of s.aliases) {
        expect(findKeywords(normalizeText(a), [...ADVANCED_WORDS, ...MIDDLE_WORDS]), `${s.id}: ${a}`).toEqual([]);
      }
    }
  });

  it("finds no new alias in the sample CV (lenient reading and the analyser's own matcher)", () => {
    const text = words(SAMPLE_CV_BODY);
    const normalized = SAMPLE_CV_BODY.split("\n").map((line) => normalizeText(line));
    for (const s of EXPANSION_SKILLS) {
      expect(s.aliases.filter((a) => aliasOccurs(a, text)), s.id).toEqual([]);
      for (const line of normalized) expect(findKeywords(line, s.aliases), `${s.id} in «${line}»`).toEqual([]);
    }
  });

  it("still lets the sample CV name exactly its eight skills with the merged catalogue", () => {
    const text = words(SAMPLE_CV_BODY);
    const named = ALL_SKILLS.filter((s) => s.aliases.some((a) => aliasOccurs(a, text))).map((s) => s.id);
    expect([...named].sort()).toEqual([...SAMPLE_SKILLS].sort());
  });
});

// ─── courses ────────────────────────────────────────────────────────────────────────────────────────────────────────

const LESSONS_FOR_HOURS: Readonly<Record<number, number>> = { 6: 3, 8: 4, 10: 5, 12: 5, 14: 6, 16: 6 };

describe("expansion: courses (spec 8.2 / 9.4 rules)", () => {
  it("has exactly one course per new star slot, named c-{skill}-{star}, wired into COURSE_IDS and COURSES", () => {
    const expected = EXPANSION_SKILLS.flatMap((s) => Array.from({ length: s.maxStars }, (_, i) => `c-${s.id}-${i + 1}`));
    expect(EXPANSION_COURSES.map((c) => c.id)).toEqual(expected);
    expect([...EXPANSION_COURSE_IDS]).toEqual(expected);
    for (const c of EXPANSION_COURSES) {
      expect(`c-${c.skill}-${c.star}`).toBe(c.id);
      expect((COURSE_IDS as readonly string[]).includes(c.id), c.id).toBe(true);
      expect(COURSES.find((x) => x.id === c.id), c.id).toBe(c);
    }
  });

  it("uses the allowed hours, the lesson count those hours give, and a two-sentence description", () => {
    for (const c of EXPANSION_COURSES) {
      expect(LESSONS_FOR_HOURS[c.hours], c.id).toBe(c.lessons.length);
      expect(c.description.split(/[.!؟]\s*/).filter((x) => x.trim().length > 0).length, c.id).toBe(2);
      expect(c.title.includes(":") || c.title.length < 40, c.id).toBe(true);
    }
  });

  it("totals 21 courses and 218 hours (for CATALOGUE_COUNTS in phase 2)", () => {
    expect(EXPANSION_COURSES).toHaveLength(21);
    expect(EXPANSION_COURSES.reduce((sum, c) => sum + c.hours, 0)).toBe(218);
    expect(COURSES).toHaveLength(COURSE_IDS.length);
  });
});

// ─── jobs ───────────────────────────────────────────────────────────────────────────────────────────────────────────

describe("expansion: real jobs", () => {
  it("lists every job once, wired into JOB_IDS and JOBS after the first jobs of its field", () => {
    expect(EXPANSION_JOBS.map((j) => j.id)).toEqual([...EXPANSION_JOB_IDS]);
    expect(new Set(EXPANSION_JOB_IDS).size).toBe(EXPANSION_JOB_IDS.length);
    for (const j of EXPANSION_JOBS) {
      expect((JOB_IDS as readonly string[]).includes(j.id), j.id).toBe(true);
      expect(JOBS.find((x) => x.id === j.id), j.id).toBe(j);
    }
    // the demo's reveal breaks fit ties by data order: syarah-financial (business, its third card) stays ahead of every
    // new job outside the data and software fields
    const later = EXPANSION_JOBS.filter((j) => j.field !== "data" && j.field !== "software").map((j) => (JOB_IDS as readonly string[]).indexOf(j.id));
    expect(JOB_IDS.indexOf("syarah-financial-analyst-tamheer-riyadh")).toBeLessThan(Math.min(...later));
  });

  it("gives every job exactly five distinct requirements of existing skills, within each skill's stars, with evidence", () => {
    for (const j of EXPANSION_JOBS) {
      expect(j.requirements, j.id).toHaveLength(5);
      expect(new Set(j.requirements.map((r) => r.skill)).size, j.id).toBe(5);
      for (const r of j.requirements) {
        expect(byId.has(r.skill), `${j.id}: ${r.skill}`).toBe(true);
        expect(r.stars, `${j.id}: ${r.skill}`).toBeGreaterThanOrEqual(1);
        expect(r.stars, `${j.id}: ${r.skill}`).toBeLessThanOrEqual(skill(r.skill).maxStars);
        expect((r.evidence ?? "").length, `${j.id}: ${r.skill}`).toBeGreaterThan(10);
      }
    }
  });

  it("keeps requirements in roadmap order (a listed prerequisite before the skill that needs it)", () => {
    for (const j of EXPANSION_JOBS) {
      j.requirements.forEach((r, i) => {
        for (const p of prereqsOf(r.skill)) {
          const at = j.requirements.findIndex((x) => x.skill === p);
          if (at >= 0) expect(at, `${j.id}: ${p} before ${r.skill}`).toBeLessThan(i);
        }
      });
    }
  });

  it("is a real posting with its source, a short summary and three short tasks", () => {
    for (const j of EXPANSION_JOBS) {
      expect(j.real, j.id).toBe(true);
      expect(j.source && isUrl(j.source.url), j.id).toBe(true);
      expect(j.source?.url ?? "", j.id).not.toMatch(/linkedin\.com|indeed\.|bayt\.com/);
      expect(isDay(j.source?.checkedAt ?? ""), j.id).toBe(true);
      expect(wordCount(j.summary), j.id).toBeLessThanOrEqual(25);
      expect(j.tasks, j.id).toHaveLength(3);
      for (const t of j.tasks) expect(wordCount(t), `${j.id}: ${t}`).toBeLessThanOrEqual(10);
    }
  });

  it("never touches the demo job (data-analyst-riyadh) or its skills' prerequisites", () => {
    const demo = JOBS.find((j) => j.id === "data-analyst-riyadh");
    expect(demo?.requirements.map((r) => `${r.skill}${r.stars}`)).toEqual(["excel2", "sql2", "powerbi1", "statistics2", "communication1"]);
    for (const r of demo?.requirements ?? []) for (const p of prereqsOf(r.skill)) expect(isNewSkill(p), p).toBe(false);
  });
});

// ─── guides ─────────────────────────────────────────────────────────────────────────────────────────────────────────

describe("expansion: learning guides", () => {
  it("has one guide per new skill, in skill order", () => {
    expect(EXPANSION_GUIDES.map((g) => g.skill)).toEqual([...EXPANSION_SKILL_IDS]);
  });

  it("keeps real, dated links everywhere and at most two alternatives", () => {
    for (const g of EXPANSION_GUIDES) {
      expect(g.alternatives.length, g.skill).toBeLessThanOrEqual(2);
      const courses = [g.topPick, ...g.alternatives];
      for (const c of courses) {
        expect(isUrl(c.url), `${g.skill}: ${c.url}`).toBe(true);
        expect(isDay(c.checkedAt), g.skill).toBe(true);
        if (c.star !== null) expect(c.star, `${g.skill}: ${c.title}`).toBeLessThanOrEqual(skill(g.skill).maxStars);
      }
      for (const a of g.articles) expect(isUrl(a.url), `${g.skill}: ${a.url}`).toBe(true);
      expect(g.people.length, g.skill).toBeGreaterThan(0);
      expect(g.proof?.task.length ?? 0, g.skill).toBeGreaterThan(10);
    }
  });

  it("takes a person's LinkedIn only from a page the person controls (never from linkedin.com itself)", () => {
    const research = JSON.parse(readFileSync(path.join(import.meta.dirname, "../../../../research/expansion/expansion.json"), "utf8")) as {
      readonly guides: readonly { readonly skill: string; readonly people: readonly { readonly name: string; readonly linkedinSource: string | null }[] }[];
    };
    for (const g of EXPANSION_GUIDES) {
      for (const p of g.people) {
        expect(isUrl(p.url), `${g.skill}: ${p.name}`).toBe(true);
        for (const url of Object.values(p.links ?? {})) expect(isUrl(url as string), `${p.name}: ${String(url)}`).toBe(true);
        const source = research.guides.find((x) => x.skill === g.skill)?.people.find((x) => x.name === p.name)?.linkedinSource ?? null;
        if (p.links?.linkedin) {
          expect(source, p.name).not.toBeNull();
          expect(source ?? "", p.name).not.toMatch(/linkedin\.com/);
          expect(p.links.linkedin, p.name).toMatch(/^https:\/\/([a-z]+\.)?linkedin\.com\//);
        }
      }
    }
  });

  it("gives every new skill its certificate block (an issuer page, or an honest «none» with a proof)", () => {
    for (const g of EXPANSION_GUIDES) {
      const cert = g.certification;
      expect(cert, g.skill).toBeDefined();
      if (cert?.kind === "official") {
        expect(isUrl(cert.url) && isUrl(cert.prepUrl), g.skill).toBe(true);
        expect(cert.short.length, g.skill).toBeGreaterThan(0);
        expect(cert.star, g.skill).toBeLessThanOrEqual(skill(g.skill).maxStars);
        if (cert.fee) expect(cert.fee.note.length, g.skill).toBeGreaterThan(10);
      } else if (cert) {
        expect(cert.proof.length, g.skill).toBeGreaterThan(10);
        expect(cert.why.length, g.skill).toBeGreaterThan(10);
      }
    }
  });

  it("serves the new guides through getGuide (all-guides.ts merges them with guides.ts)", () => {
    for (const g of EXPANSION_GUIDES) expect(getGuide(g.skill), g.skill).toBe(g);
    for (const id of SKILL_IDS) expect(getGuide(id).skill, id).toBe(id);
  });
});

// ─── knowledge base ─────────────────────────────────────────────────────────────────────────────────────────────────

// The chatbot's voice rules (src/lib/brain/server/model-common.ts): Najdi, never Fusha or other dialects in its lines.
const NOT_NAJDI = ["الآن", "هذه", "لا أستطيع", "سوف", "لديك", "يمكنك", "ماذا", "إيش", "ايش", "دحين", "كدا", "عايز", "شو", "هلّق"];

describe("expansion: career knowledge base", () => {
  it("covers the 10 existing families and the 6 new ones, once each", () => {
    expect(CAREER_FAMILIES.map((f) => f.id)).toEqual([...CAREER_FAMILY_IDS]);
    expect(CAREER_FAMILY_IDS).toHaveLength(16);
    expect(CAREER_FAMILIES.filter((f) => f.isNew).map((f) => f.id)).toEqual([
      "product",
      "cyber",
      "cloud-devops",
      "ai-ml",
      "sales-cs",
      "supply-procurement",
    ]);
  });

  it("names only existing skills, fields, jobs and entry routes", () => {
    const fields = new Set<string>([...FIELD_IDS, ...EXPANSION_FIELD_IDS]);
    const jobs = new Set<string>([...JOB_IDS, ...EXPANSION_JOB_IDS]);
    const routes = new Set<string>(ENTRY_ROUTE_IDS);
    for (const f of CAREER_FAMILIES) {
      for (const s of f.path.skills) expect(byId.has(s), `${f.id}: ${s}`).toBe(true);
      for (const fl of f.fields) expect(fields.has(fl), `${f.id}: ${fl}`).toBe(true);
      for (const j of f.jobs) expect(jobs.has(j), `${f.id}: ${j}`).toBe(true);
      for (const r of f.entryRoutes) expect(routes.has(r), `${f.id}: ${r}`).toBe(true);
    }
  });

  it("orders every family's path after its prerequisites", () => {
    for (const f of CAREER_FAMILIES) {
      f.path.skills.forEach((s, i) => {
        for (const p of prereqsOf(s)) {
          const at = (f.path.skills as readonly string[]).indexOf(p);
          if (at >= 0) expect(at, `${f.id}: ${p} before ${s}`).toBeLessThan(i);
        }
      });
    }
  });

  it("keeps a link and a date on every fact: guideline, employer, certificate, salary, route", () => {
    for (const f of CAREER_FAMILIES) {
      expect(f.path.basedOnLine, f.id).not.toBeNull();
      for (const url of f.path.basedOnLinks) expect(isUrl(url), `${f.id}: ${url}`).toBe(true);
      for (const g of f.path.guidelines) expect(isUrl(g.url) && isDay(g.checkedAt), `${f.id}: ${g.url}`).toBe(true);
      for (const e of f.employers) expect(isUrl(e.careersUrl) && isDay(e.checkedAt), `${f.id}: ${e.name}`).toBe(true);
      for (const c of f.certificates) expect(isUrl(c.url) && isDay(c.checkedAt), `${f.id}: ${c.name}`).toBe(true);
      if (f.salary) {
        expect(isUrl(f.salary.url) && isDay(f.salary.checkedAt), f.id).toBe(true);
        expect(f.salary.minSAR, f.id).toBeLessThan(f.salary.maxSAR);
      }
      for (const s of f.sources) expect(isUrl(s.url), `${f.id}: ${s.url}`).toBe(true);
    }
    for (const r of ENTRY_ROUTES) expect(isUrl(r.url) && isDay(r.checkedAt), r.id).toBe(true);
  });

  it("gives every family its plain lines: what, day-to-day, 3-5 interview questions, a 4-week plan, Najdi bot lines", () => {
    for (const f of CAREER_FAMILIES) {
      expect(f.what.length, f.id).toBeGreaterThan(20);
      expect(f.dayToDay.length, f.id).toBeGreaterThanOrEqual(3);
      expect(f.interviewQuestions.length, f.id).toBeGreaterThanOrEqual(3);
      expect(f.interviewQuestions.length, f.id).toBeLessThanOrEqual(5);
      expect(f.first30Days, f.id).toHaveLength(4);
      expect(f.botLines.length, f.id).toBeGreaterThanOrEqual(2);
      for (const line of [...f.botLines, ...f.interviewQuestions, f.what]) {
        for (const w of NOT_NAJDI) expect(words(line).includes(norm(w)) || (w.includes(" ") && line.includes(w)), `${f.id}: «${w}» in «${line}»`).toBe(false);
      }
    }
  });

  it("renders a compact block for the chatbot that names every family and quotes pay only with its source", () => {
    const text = knowledgeForModel();
    for (const f of CAREER_FAMILIES) expect(text, f.id).toContain(`CAREER ${f.id} «${f.title}»`);
    for (const line of text.split("\n").filter((l) => l.includes("SAR"))) expect(line, line).toMatch(/https:\/\//);
    const one = knowledgeForModel(["product"]);
    expect(one).toContain("CAREER product «مدير منتج»");
    expect(one).not.toContain("CAREER cyber");
    expect(careersIndexForModel().split("\n")).toHaveLength(16);
  });
});
