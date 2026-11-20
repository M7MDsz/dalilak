// Owner: data. Every career family «دليلك» knows: the 16 of the 20 Nov 2026 expansion (./expansion/knowledge.ts, rewritten by
// research/expansion/build.py), the 18 of wave 2 (./wave2/knowledge.ts, rewritten by research/wave2/build.py) and the 7 of
// wave 3 (./wave3/knowledge.ts, rewritten by research/wave3/build.py), merged here so each generator keeps its own file
// (like ./all-guides.ts). Wave 3 also adds, per existing family, the knowledge-plus facts (more pay rows with their source,
// Saudization decisions, interview questions with their guideline, a stand-out tip, new entry routes, bot lines), and the
// Saudization / labour-law facts and open Tuwaiq bootcamps (saudizationForModel). The same names as ./expansion/knowledge.ts, so the
// chatbot (src/lib/brain) imports from here and sees every family. Pure module.
import type { JobId } from "@/lib/types";

import {
  CAREER_FAMILIES as EXPANSION_FAMILIES,
  CAREER_FAMILY_IDS as EXPANSION_FAMILY_IDS,
  ENTRY_ROUTES as EXPANSION_ROUTES,
  type CareerFamily as ExpansionFamily,
  type EntryRoute as ExpansionRoute,
  type EntryRouteId as ExpansionRouteId,
} from "./expansion/knowledge";
import { WAVE2_CAREER_FAMILIES, WAVE2_ENTRY_ROUTES, WAVE2_FAMILY_IDS } from "./wave2/knowledge";
import {
  WAVE3_CAREER_FAMILIES,
  WAVE3_ENTRY_ROUTES,
  WAVE3_FAMILY_IDS,
  WAVE3_FAMILY_PLUS,
  WAVE3_SAUDIZATION,
  WAVE3_TUWAIQ_BOOTCAMPS,
  type FamilyPlus,
} from "./wave3/knowledge";

export type { FamilyCertificate, FamilyEmployer, FamilyGuideline, FamilySalary, KnowledgeLink } from "./expansion/knowledge";
export type { FamilyPlus, LocalisationDecision } from "./wave3/knowledge";

/** The expansion's 16 families, then wave 2's 18, then wave 3's 7. */
export const CAREER_FAMILY_IDS = [...EXPANSION_FAMILY_IDS, ...WAVE2_FAMILY_IDS, ...WAVE3_FAMILY_IDS] as const;
export type CareerFamilyId = (typeof CAREER_FAMILY_IDS)[number];

export type EntryRouteId =
  | ExpansionRouteId
  | (typeof WAVE2_ENTRY_ROUTES)[number]["id"]
  | (typeof WAVE3_ENTRY_ROUTES)[number]["id"];

export interface EntryRoute extends Omit<ExpansionRoute, "id" | "fits"> {
  readonly id: EntryRouteId;
  readonly fits: readonly CareerFamilyId[] | "all";
}

export interface CareerFamily extends Omit<ExpansionFamily, "id" | "entryRoutes" | "jobs"> {
  readonly id: CareerFamilyId;
  readonly entryRoutes: readonly EntryRouteId[];
  /** Real jobs in the app for this family (the practice job only for data-analyst-bi). */
  readonly jobs: readonly JobId[];
  /** Wave 3 (knowledge-plus): more published pay rows, each with its guide and page or link; only rows quotable as SAR. */
  readonly salariesMore?: FamilyPlus["salaries"];
  /** Wave 3: no published Saudi guide lists the role (the guides checked); «دليلك» says so instead of a number. */
  readonly noSalaryLine?: string | null;
  /** Wave 3: the Saudization decisions of the Ministry of Human Resources that cover this family's jobs. */
  readonly localisation?: FamilyPlus["localisation"];
  /** Wave 3: more interview questions written by «دليلك», each from the linked guideline. */
  readonly interviewQuestionsMore?: FamilyPlus["interviewQuestions"];
  /** Wave 3: one concrete way to stand out, from an official page. */
  readonly standOut?: FamilyPlus["standOut"];
}

const PLUS = new Map<string, FamilyPlus>(WAVE3_FAMILY_PLUS.map((p) => [p.id, p]));

/** A family with its knowledge-plus additions (wave 3), when it has any. */
function withPlus(family: CareerFamily): CareerFamily {
  const plus = PLUS.get(family.id);
  if (!plus) return family;
  return {
    ...family,
    jobs: [...family.jobs, ...plus.jobs.filter((j) => !family.jobs.includes(j))],
    entryRoutes: [...family.entryRoutes, ...plus.entryRoutes.filter((r) => !family.entryRoutes.includes(r))],
    botLines: [...family.botLines, ...plus.botLines],
    salariesMore: plus.salaries,
    noSalaryLine: plus.noSalaryLine,
    localisation: plus.localisation,
    interviewQuestionsMore: plus.interviewQuestions,
    standOut: plus.standOut,
  };
}

const BASE_FAMILIES: readonly CareerFamily[] = [...EXPANSION_FAMILIES, ...WAVE2_CAREER_FAMILIES, ...WAVE3_CAREER_FAMILIES];
export const CAREER_FAMILIES: readonly CareerFamily[] = BASE_FAMILIES.map(withPlus);
export const ENTRY_ROUTES: readonly EntryRoute[] = [...EXPANSION_ROUTES, ...WAVE2_ENTRY_ROUTES, ...WAVE3_ENTRY_ROUTES];

export function getCareerFamily(id: CareerFamilyId): CareerFamily {
  const family = CAREER_FAMILIES.find((f) => f.id === id);
  if (!family) throw new Error(`data: unknown career family ${id}`);
  return family;
}

function money(n: number): string {
  return n.toLocaleString("en-US");
}

/** One line per family (id, title, what): small enough for every prompt; the full block comes from knowledgeForModel. */
export function careersIndexForModel(): string {
  return CAREER_FAMILIES.map((f) => `${f.id} «${f.title}» (${f.titleEn}): ${f.what}`).join("\n");
}

/**
 * The knowledge base as compact text for the chatbot (one block per family, then its entry routes), for the families
 * asked (all when none are given; prefer passing ids). Every number in it comes with its source, so «دليلك» may quote it;
 * nothing else about pay or demand may be said. The same rendering as ./expansion/knowledge.ts, over every family.
 */
export function knowledgeForModel(ids?: readonly CareerFamilyId[]): string {
  const families = ids ? CAREER_FAMILIES.filter((f) => ids.includes(f.id)) : CAREER_FAMILIES;
  const blocks = families.map((f) => {
    const lines = [
      `CAREER ${f.id} «${f.title}» (${f.titleEn}): ${f.what}`,
      `- day to day: ${f.dayToDay.join("؛ ")}`,
      `- path (skill ids in order): ${f.path.skills.join(" → ")}${f.path.basedOnLine ? `. ${f.path.basedOnLine}` : ""}`,
      `- say it like this: ${f.botLines.join(" ")}`,
    ];
    if (f.jobs.length > 0) lines.push(`- jobs in the app: ${f.jobs.join(", ")}`);
    if (f.employers.length > 0) lines.push(`- employers: ${f.employers.map((e) => `${e.name} (${e.careersUrl})`).join("، ")}`);
    if (f.certificates.length > 0)
      lines.push(`- certificates: ${f.certificates.map((c) => `${c.name} from ${c.issuer} (${c.url})`).join("؛ ")}`);
    if (f.salary)
      lines.push(
        `- pay (only this source): ${f.salary.role} ${money(f.salary.minSAR)} to ${money(f.salary.maxSAR)} SAR ${f.salary.period}, ${f.salary.sourceName}${f.salary.page ? `, ${f.salary.page}` : ""} (${f.salary.url})`,
      );
    for (const s of f.salariesMore ?? [])
      lines.push(
        `- more pay (only this source): ${s.role} ${money(s.minSAR)} to ${money(s.maxSAR)} SAR ${s.period}, ${s.sourceName}${s.page ? `, ${s.page}` : ""} (${s.url})`,
      );
    if (!f.salary && (f.salariesMore ?? []).length === 0 && f.noSalaryLine)
      lines.push(`- pay: no published Saudi salary guide lists this role, so give no number (guides checked: ${f.noSalaryLine})`);
    for (const d of f.localisation ?? [])
      lines.push(
        `- Saudization: ${d.groupAr}: ${d.rate}; ${d.appliesTo}${d.minWageCounted ? `; wage counted: ${d.minWageCounted}` : ""}${d.effective ? `; from ${d.effective}` : ""} (${d.sources.map((x) => x.url).join(" ")})`,
      );
    if (f.standOut) lines.push(`- stand out: ${f.standOut.tip} (${f.standOut.source.url})`);
    if (f.entryRoutes.length > 0) lines.push(`- entry routes: ${f.entryRoutes.join(", ")}`);
    lines.push(`- interview questions (written by Dalil): ${f.interviewQuestions.join(" | ")}`);
    if ((f.interviewQuestionsMore ?? []).length > 0)
      lines.push(
        `- more interview questions (written by Dalil from the linked guideline): ${(f.interviewQuestionsMore ?? []).map((q) => `${q.q} (${q.from.url})`).join(" | ")}`,
      );
    lines.push(`- first 30 days (written by Dalil): ${f.first30Days.join(" | ")}`);
    return lines.join("\n");
  });
  const routeIds = new Set(families.flatMap((f) => f.entryRoutes));
  const routes = ENTRY_ROUTES.filter((r) => routeIds.has(r.id)).map(
    (r) =>
      `ROUTE ${r.id} «${r.nameAr}» (${r.owner}): ${r.line}${r.eligibility ? ` Eligibility: ${r.eligibility.join(" ")}` : ""}${r.benefit ? ` Benefit: ${r.benefit.join(" ")}` : ""}${r.note ? ` Note: ${r.note}` : ""} (${r.url})`,
  );
  return [...blocks, ...routes].join("\n\n");
}

/**
 * Wave 3: the Saudization and labour-law facts «دليلك» may quote (Nitaqat counting, the localisation decisions, the labour
 * law's probation and contract articles, SANED) and the Tuwaiq bootcamps open for registration, as compact text with the
 * official link after every fact. No day of collection is printed.
 */
/** `familyId`: only the localisation decisions that concern that family (the general facts always come). */
export function saudizationForModel(familyId?: string): string {
  const z = WAVE3_SAUDIZATION;
  const lines = [
    ...z.nitaqat.map((n) => `NITAQAT: ${n.text} (${n.source.url})`),
    ...z.decisions.filter((d) => familyId === undefined || (d.families as readonly string[]).includes(familyId)).map(
      (d) =>
        `LOCALISATION ${d.id} «${d.groupAr}»: ${d.rate}; ${d.appliesTo}${d.minWageCounted ? `; wage counted: ${d.minWageCounted}` : ""}${d.effective ? `; from ${d.effective}` : ""}. Families: ${d.families.join(", ")} (${d.sources.map((s) => s.url).join(" ")})`,
    ),
    ...z.labourLaw.map((a) => `LABOUR LAW ${a.article}: ${a.text} (${a.source.url})`),
    `SANED «${z.saned.name}»: ${z.saned.facts.join(" ")} (${z.saned.source.url})`,
    ...WAVE3_TUWAIQ_BOOTCAMPS.map((b) => `TUWAIQ BOOTCAMP «${b.name}» (${b.field}): ${b.length ?? ""}${b.free ? ", free" : ""} (${b.url})`),
  ];
  return lines.join("\n");
}
