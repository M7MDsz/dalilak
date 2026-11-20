// Owner: engine (20 Nov 2026, owner's part 2). Companies against free text and against the app's job data: which company a
// typed name means (Arabic and English, the common spellings of data `COMPANIES[].aliases`), and which jobs belong to a
// company. Jobs are found by the company NAME they carry (`company`, `companyEn`), never by job id, so the job data can
// change under it. Pure.
import { COMPANIES, JOBS, companyTiles, getJob } from "@/lib/data";
import { isJobFieldId } from "@/lib/ids";
import { findKeywords, normalizeText, tokenize } from "@/lib/text/normalize";
import type { CompanyId, Job, JobFieldId, JobId, OnboardingAnswers } from "@/lib/types";

/** Every spelling «دليلك» knows, with its company (the order of COMPANIES, then of each company's aliases). */
export const COMPANY_KEYWORDS: readonly { readonly keyword: string; readonly id: CompanyId }[] = COMPANIES.flatMap((c) =>
  c.aliases.map((keyword) => ({ keyword, id: c.id })),
);

const KEYWORD_LIST = COMPANY_KEYWORDS.map((k) => k.keyword);
const ID_BY_KEYWORD = new Map(COMPANY_KEYWORDS.map((k) => [k.keyword, k.id] as const));

/** The spellings that count only as the whole answer («مهارة», «سيارة», «علم»), normalised. */
const ALONE = new Map<string, CompanyId>(
  COMPANIES.flatMap((c) => (c.aliasesAlone ?? []).map((a) => [tokenize(normalizeText(a)).join(" "), c.id] as const)),
);

/**
 * The company named by a whole answer that is only an everyday-word name («مهارة», «شركة مهارة» is already a spelling):
 * the words, «ال» and one prefix letter aside, equal one of `aliasesAlone`. Null otherwise.
 */
export function matchCompanyAlone(words: readonly string[]): CompanyId | null {
  if (words.length === 0) return null;
  const joined = words.join(" ");
  return ALONE.get(joined) ?? ALONE.get(joined.replace(/^ال/, "")) ?? null;
}

/**
 * The company a text names: the earliest spelling in it, the longer one first at the same start («أرامكو السعودية»,
 * «ارامكو», «Aramco», «اس تي سي», «stc»), or a whole answer that is an everyday-word name («مهارة»). Null when it names
 * none of them.
 */
export function matchCompany(text: string): CompanyId | null {
  const normalized = normalizeText(text);
  const hit = findKeywords(normalized, KEYWORD_LIST)[0];
  if (hit) return ID_BY_KEYWORD.get(hit.keyword) ?? null;
  return matchCompanyAlone(tokenize(normalized));
}

/** The names a job carries for its company (the Arabic one, and the posting's own English one when there is one). */
function jobCompanyNames(job: Job): string[] {
  return [job.company, job.companyEn].filter((n): n is string => typeof n === "string" && n.trim() !== "");
}

const EXACT = new Map<string, CompanyId>(
  COMPANIES.flatMap((c) => [c.name, c.short, c.en].map((n) => [normalizeText(n).trim(), c.id] as const)),
);

/** The company of a job, read from its company names: an exact name («سيارة»), else a known spelling inside it («سلة (محلي)»). */
export function companyOfJob(job: Job): CompanyId | null {
  const names = jobCompanyNames(job);
  for (const name of names) {
    const exact = EXACT.get(normalizeText(name).trim());
    if (exact) return exact;
  }
  for (const name of names) {
    const found = matchCompany(name);
    if (found) return found;
  }
  return null;
}

let byCompany: { readonly jobs: readonly Job[]; readonly map: ReadonlyMap<CompanyId, readonly JobId[]> } | null = null;

/** The jobs of a company in the app's job data, in data order (empty when it has none there). */
export function jobsAtCompany(id: CompanyId): readonly JobId[] {
  if (byCompany === null || byCompany.jobs !== JOBS) {
    const map = new Map<CompanyId, JobId[]>();
    for (const job of JOBS) {
      const company = companyOfJob(job);
      if (company) map.set(company, [...(map.get(company) ?? []), job.id]);
    }
    byCompany = { jobs: JOBS, map };
  }
  return byCompany.map.get(id) ?? [];
}

/**
 * The companies the seventh step offers (and the profile picker shows first), 20 Nov 2026 owner's rule: only companies
 * that really have a job in the app for that field ("applicable"), the ones with the most jobs first (the curated tiles
 * break ties), at most `max` of them; «مهارة», the hackathon's organiser, always leads (owner's request). With no field
 * («لم أحدّد بعد»), the companies with the most jobs overall.
 */
export function companyChoices(field: JobFieldId | null, max = 5): readonly CompanyId[] {
  const curated = companyTiles(field);
  const rank = (id: CompanyId): number => {
    const at = curated.indexOf(id);
    return at === -1 ? curated.length : at;
  };
  const counted = COMPANIES.filter((c) => c.id !== "maharah")
    .map((c, order) => ({ id: c.id, order, n: jobsAtCompany(c.id).filter((j) => field === null || getJob(j).field === field).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n || rank(a.id) - rank(b.id) || a.order - b.order);
  return ["maharah", ...counted.slice(0, max).map((c) => c.id)];
}

/** The field whose companies the seventh step shows: the first interest that is a job field; null for «لم أحدّد بعد». */
export function companyField(answers: OnboardingAnswers): JobFieldId | null {
  for (const interest of answers.interest ?? []) if (isJobFieldId(interest)) return interest;
  return null;
}
