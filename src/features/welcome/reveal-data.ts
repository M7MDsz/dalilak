// Owner: welcome. Everything the path reveal and its result show, derived once from the user's six answers (spec 4.6,
// 4.7): the recommendation, the target's canonical stages, the twenty jobs and how well each fits, the skill landscape.
// Pure: the screen memoises it on the answers. The fit score itself is never shown (P5): it only decides which tiles
// "stay stronger" in the sweep and which fields stay lit.
import { answerText, companyCityLine, revealReasonText } from "@/lib/copy";
import { FIELDS, JOBS, SKILLS, getField, getJob, getQuestion, getSkill } from "@/lib/data";
import { canonicalStages, dreamCompany, pathSummary, rankByFit, recommend } from "@/lib/engine";
import { QUESTION_IDS } from "@/lib/ids";
import type { FieldId, JobId, OnboardingAnswers, QuestionId, SkillId, StarSlot } from "@/lib/types";

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
  /** «وادي الغيم للبيانات · الرياض» (the «جهة تجريبية» tag is drawn beside it). */
  readonly companyCity: string;
  /** A real posting (no sample tag); false for the one practice job («وظيفة تدريبية»). */
  readonly real: boolean;
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
    real: job.real,
    field: getField(job.field).name,
    fieldId: job.field,
    stages: summary.stages,
    hours: summary.hours,
  };
}

export function revealData(answers: OnboardingAnswers): RevealData {
  const rec = recommend(answers);
  const ranked = rankByFit(answers).filter((b) => !b.excluded);
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
