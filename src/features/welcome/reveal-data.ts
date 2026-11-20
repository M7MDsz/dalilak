// Owner: welcome. Everything the path reveal and its result show, derived once from the user's six answers (spec 4.6,
// 4.7): the recommendation, the target's canonical stages, the twenty jobs and how well each fits, the skill landscape.
// Pure: the screen memoises it on the answers. The fit score itself is never shown (P5): it only decides which tiles
// "stay stronger" in the sweep and which fields stay lit.
import { answerText, companyCityLine, revealReasonText } from "@/lib/copy";
import { FIELDS, JOBS, SKILLS, getField, getJob, getQuestion, getSkill } from "@/lib/data";
import { canonicalStages, dreamCompany, pathSummary, rankByFit, recommend } from "@/lib/engine";
import { QUESTION_IDS } from "@/lib/ids";
import type { FieldId, JobId, OnboardingAnswers, QuestionId, SkillId, StarMap, StarSlot } from "@/lib/types";

export interface RevealStageInfo {
  /** 1-based, canonical order (`reveal-path-node-{n}`). Before a CV this is also the map's displayed order. */
  readonly n: number;
  readonly skill: SkillId;
  readonly name: string;
  readonly star: StarSlot;
  readonly prep: boolean;
}

export interface RevealJobCard {
  readonly id: JobId;
  readonly title: string;
  /** «وادي الغيم للبيانات · الرياض». 21 Nov 2026 (owner): no sample or practice label is drawn beside any job. */
  readonly companyCity: string;
  readonly field: string;
  readonly fieldId: FieldId;
  readonly stages: number;
  readonly hours: number;
}

export interface RevealData {
  readonly answers: readonly { readonly question: QuestionId; readonly slot: string; readonly text: string }[];
  readonly recommended: RevealJobCard;
  readonly alternatives: readonly [RevealJobCard, RevealJobCard];
  readonly reasons: readonly string[];
  /**
   * 20 Nov 2026 (owner's part 2): the company the user has in mind. `aimed`: the recommended job is that company's (the
   * path ends on it); otherwise the data has none of its jobs and the recommended one is the closest (and says so).
   */
  readonly company: { readonly name: string; readonly aimed: boolean } | null;
  readonly stages: readonly RevealStageInfo[];
  /** The twenty jobs in data order; `fits` = the answers point at it (the tile stays at full contrast). */
  readonly tiles: readonly { readonly id: JobId; readonly title: string; readonly fits: boolean }[];
  /** The seven fields with their skills; `lit` = a field the answers point at (it stays lit after the pass). */
  readonly fields: readonly { readonly id: FieldId; readonly name: string; readonly skills: number; readonly lit: boolean }[];
}

function jobCard(id: JobId): RevealJobCard {
  const job = getJob(id);
  const summary = pathSummary(id);
  return {
    id,
    title: job.title,
    companyCity: companyCityLine(id),
    field: getField(job.field).name,
    fieldId: job.field,
    stages: summary.stages,
    hours: summary.hours,
  };
}

/** `stars`: the CV's skills when the user read a CV in onboarding (21 Nov 2026, owner: the path is built on the CV too). */
export function revealData(answers: OnboardingAnswers, stars?: StarMap): RevealData {
  const rec = recommend(answers, undefined, stars);
  const ranked = rankByFit(answers, stars).filter((b) => !b.excluded);
  const top = ranked[0]?.score ?? 0;
  const chosen = new Set<JobId>([rec.recommended, ...rec.alternatives]);
  // "the ones that fit the answers stay stronger": the three chosen, and every job that scores close to the best
  const fitting = new Set<JobId>(ranked.filter((b) => b.score > 0 && b.score >= top * 0.6).map((b) => b.jobId));
  for (const id of chosen) fitting.add(id);

  const interests = new Set<string>(answers.interest ?? []);
  const recommendedField = getJob(rec.recommended).field;
  const dream = dreamCompany({ answers });

  return {
    answers: QUESTION_IDS.map((question) => ({
      question,
      slot: getQuestion(question).slot,
      text: answerText(answers, question) ?? "",
    })),
    recommended: jobCard(rec.recommended),
    alternatives: [jobCard(rec.alternatives[0]), jobCard(rec.alternatives[1])],
    reasons: rec.reasons.map(revealReasonText),
    company: dream ? { name: dream.company.short, aimed: dream.job !== null && dream.job === rec.recommended } : null,
    stages: canonicalStages(rec.recommended).map((s, i) => ({
      n: i + 1,
      skill: s.skill,
      name: getSkill(s.skill).name,
      star: s.star,
      prep: s.prep,
    })),
    tiles: JOBS.map((job) => ({ id: job.id, title: job.title, fits: fitting.has(job.id) })),
    fields: FIELDS.map((field) => ({
      id: field.id,
      name: field.name,
      skills: SKILLS.filter((s) => s.field === field.id).length,
      lit: field.id === recommendedField || interests.has(field.id),
    })),
  };
}

/** `k` items spread evenly through `list` (its first, its last and the ones between), in list order. */
function spread<T>(list: readonly T[], k: number): T[] {
  if (k <= 0) return [];
  if (list.length <= k) return [...list];
  return Array.from({ length: k }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / k)] as T);
}

/**
 * 21 Nov 2026 (the catalogue grew from 20 jobs to 84; drawn whole, the sweep and the narrowing filled the screen, ran
 * under the answers, the logo and the status line): the tiles ONE scene draws, a readable sample of `count`. It always
 * holds the three chosen jobs, then about a third that fit the answers and the rest that do not, the fitting ones spread
 * evenly through it so the sort is seen everywhere at once. Deterministic: the same answers draw the same sample. The
 * status line still says the real count («أقارن ملفك مع ٨٤ وظيفة»).
 */
export function sampleTiles(tiles: RevealData["tiles"], chosen: readonly JobId[], count: number): RevealData["tiles"] {
  if (tiles.length <= count) return tiles;
  const picked = new Set<JobId>(chosen);
  const three = chosen.map((id) => tiles.find((t) => t.id === id)).filter((t): t is RevealData["tiles"][number] => t !== undefined);
  const fitTarget = Math.max(three.length, Math.round(count * 0.35));
  const extraFits = spread(
    tiles.filter((t) => t.fits && !picked.has(t.id)),
    fitTarget - three.length,
  );
  // the chosen three sit apart among the fitting ones (never side by side), so their gathering in the narrowing is seen
  const fitCount = extraFits.length + three.length;
  const threeAt = new Map(three.map((tile, i) => [Math.floor(((i + 0.5) * fitCount) / three.length), tile] as const));
  let e = 0;
  const fits = Array.from({ length: fitCount }, (_, j) => threeAt.get(j) ?? (extraFits[e++] as RevealData["tiles"][number]));
  const others = spread(
    tiles.filter((t) => !t.fits && !picked.has(t.id)),
    count - fits.length,
  );
  const slots = new Set(fits.map((_, j) => Math.floor(((j + 0.5) * count) / fits.length)));
  const out: RevealData["tiles"][number][] = [];
  let f = 0;
  let o = 0;
  for (let i = 0; i < count; i++) {
    const next = slots.has(i) ? fits[f++] : others[o++];
    if (next) out.push(next);
  }
  // a short catalogue side (fewer others than slots) leaves nothing out: the rest of the fitting ones close the list
  while (f < fits.length) out.push(fits[f++] as RevealData["tiles"][number]);
  return out;
}
