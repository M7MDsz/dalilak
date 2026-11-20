// Owner: data. Every career family «دليلك» knows: the 16 of the 20 Nov 2026 expansion (./expansion/knowledge.ts, rewritten by
// research/expansion/build.py) and the 18 of wave 2 (./wave2/knowledge.ts, rewritten by research/wave2/build.py), merged
// here so each generator keeps its own file (like ./all-guides.ts). The same names as ./expansion/knowledge.ts, so the
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

export type { FamilyCertificate, FamilyEmployer, FamilyGuideline, FamilySalary, KnowledgeLink } from "./expansion/knowledge";

/** The expansion's 16 families, then wave 2's 18. */
export const CAREER_FAMILY_IDS = [...EXPANSION_FAMILY_IDS, ...WAVE2_FAMILY_IDS] as const;
export type CareerFamilyId = (typeof CAREER_FAMILY_IDS)[number];

export type EntryRouteId = ExpansionRouteId | (typeof WAVE2_ENTRY_ROUTES)[number]["id"];

export interface EntryRoute extends Omit<ExpansionRoute, "id" | "fits"> {
  readonly id: EntryRouteId;
  readonly fits: readonly CareerFamilyId[] | "all";
}

export interface CareerFamily extends Omit<ExpansionFamily, "id" | "entryRoutes" | "jobs"> {
  readonly id: CareerFamilyId;
  readonly entryRoutes: readonly EntryRouteId[];
  /** Real jobs in the app for this family (the practice job only for data-analyst-bi). */
  readonly jobs: readonly JobId[];
}

export const CAREER_FAMILIES: readonly CareerFamily[] = [...EXPANSION_FAMILIES, ...WAVE2_CAREER_FAMILIES];
export const ENTRY_ROUTES: readonly EntryRoute[] = [...EXPANSION_ROUTES, ...WAVE2_ENTRY_ROUTES];

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
    if (f.entryRoutes.length > 0) lines.push(`- entry routes: ${f.entryRoutes.join(", ")}`);
    lines.push(`- interview questions (written by Dalil): ${f.interviewQuestions.join(" | ")}`);
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
