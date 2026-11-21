// Owner: welcome. Everything the path reveal and its result show, derived once from the user's six answers (spec 4.6,
// 4.7): the recommendation, the target's canonical stages, the twenty jobs and how well each fits, the skill landscape.
// Pure: the screen memoises it on the answers. The fit score itself is never shown (P5): it only decides which tiles
// "stay stronger" in the sweep and which fields stay lit.
import { answerText, companyCityLine, revealReasonText } from "@/lib/copy";
import { FIELDS, JOBS, SKILLS, getField, getJob, getQuestion, getSkill } from "@/lib/data";
import {
  canonicalStages,
  choiceOrder,
  dreamCompany,
  growTrackOf,
  growsInField,
  pathSummary,
  rankByFit,
  recommend,
  roadmapFor,
  trackOf,
  userBandOf,
  withinReach,
  type Track,
} from "@/lib/engine";
import { EXPERIENCE_BANDS, QUESTION_IDS, isJobFieldId } from "@/lib/ids";
import type { FieldId, JobFieldId, JobId, OnboardingAnswers, QuestionId, SkillId, StarMap, StarSlot, UserFacts } from "@/lib/types";

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

/** One specialisation of the user's field on the result («اختر تخصصك»): the track and its best job for this user. */
export interface RevealTrackCard {
  /** The engine's track id («software/front-end»). */
  readonly id: string;
  /** «واجهات أمامية». */
  readonly name: string;
  /** The recommended job's own track: first, «الأنسب لك», and choosing it is the main «ابدأ هذا المسار». */
  readonly best: boolean;
  readonly job: RevealJobCard;
  /**
   * 21 Nov 2026 (owner: «أتطوّر في مجالي» must upgrade the current career): "step" = a «خطوتك الجاية» card (a higher job in
   * the user's own specialisation or field: its title leads, the track under it); "track" (default) = «اختر تخصصك».
   */
  readonly kind?: "track" | "step";
  /** 21 Nov 2026 (owner: beginner roles): the job sits above the user's experience (a senior role for a beginner): the card says «تحتاج خبرة». */
  readonly needsExperience?: boolean;
}

export interface RevealData {
  /** "grow": the cards are «خطوتك الجاية» (the next steps in the user's own career); "tracks": «اختر تخصصك». */
  readonly mode: "tracks" | "grow";
  readonly answers: readonly { readonly question: QuestionId; readonly slot: string; readonly text: string }[];
  readonly recommended: RevealJobCard;
  /** The show's two others beside the recommended one: the best jobs of the next two tracks (else the engine's). */
  readonly alternatives: readonly [RevealJobCard, RevealJobCard];
  /**
   * 21 Nov 2026 (owner: «if I choose web and building, he should give you the path of web and then let him choose between
   * full stack, front end, back end — the same for other jobs»): the specialisations of the user's field (and of their
   * second interest's), 3 to 5, each with its best job for this user in the engine's order. The recommended job's track
   * is first and holds the recommended job.
   */
  readonly tracks: readonly RevealTrackCard[];
  /** The jobs of the tracks after the show's three (the result draws them inside `tracks`; kept for probes and tests). */
  readonly more: readonly RevealJobCard[];
  readonly reasons: readonly string[];
  /**
   * 20 Nov 2026 (owner's part 2): the company the user has in mind. `aimed`: the recommended job is that company's (the
   * path ends on it); otherwise the data has none of its jobs and the recommended one is the closest (and says so).
   */
  readonly company: { readonly name: string; readonly aimed: boolean } | null;
  readonly stages: readonly RevealStageInfo[];
  /** With a CV read in onboarding: how much of the path it already covers (the footer says so). Null without a CV. */
  readonly cvCover: { readonly done: number; readonly total: number; readonly match: number } | null;
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

/** What the CV already covers of a job's path (the map's own roadmap). */
function coverOf(jobId: JobId, facts: UserFacts): { done: number; total: number; match: number } {
  const map = roadmapFor(jobId, facts);
  return { done: map.stages.filter((s) => s.state === "done").length, total: map.stages.length, match: map.match };
}

/**
 * `stars`: the CV's skills when the user read a CV in onboarding (21 Nov 2026, owner: the path is built on the CV too).
 * `facts`: the same user, so the path card shows the map's own order (the CV's done stages first, then what's left:
 * Power BI at station 7 for the demo) and the footer what the CV covers (tester, 21 Nov 2026).
 */
export function revealData(answers: OnboardingAnswers, stars?: StarMap, facts?: UserFacts): RevealData {
  const rec = recommend(answers, undefined, stars);
  const ranked = rankByFit(answers, stars).filter((b) => !b.excluded);
  const top = ranked[0]?.score ?? 0;
  const order = choiceOrder(answers, ranked.map((b) => b.jobId));
  const growing = growsInField(answers) !== null;
  const tracks = growing ? growChoices(answers, order, rec.recommended) : trackChoices(answers, order, rec.recommended);
  // the show lands on what the result offers: the recommended job between the best jobs of the next two tracks
  const others: JobId[] = tracks.slice(1, 3).map((t) => t.job);
  for (const id of rec.alternatives) if (others.length < 2 && !others.includes(id)) others.push(id);
  const [alt0, alt1] = others as [JobId, JobId];
  const chosen = new Set<JobId>([rec.recommended, alt0, alt1]);
  // "the ones that fit the answers stay stronger": the three chosen, and every job that scores close to the best
  const fitting = new Set<JobId>(ranked.filter((b) => b.score > 0 && b.score >= top * 0.6).map((b) => b.jobId));
  for (const id of chosen) fitting.add(id);

  const interests = new Set<string>(answers.interest ?? []);
  const recommendedField = getJob(rec.recommended).field;
  const dream = dreamCompany({ answers });

  return {
    mode: growing ? "grow" : "tracks",
    answers: QUESTION_IDS.map((question) => ({
      question,
      slot: getQuestion(question).slot,
      text: answerText(answers, question) ?? "",
    })),
    recommended: jobCard(rec.recommended),
    alternatives: [jobCard(alt0), jobCard(alt1)],
    tracks: tracks.map((t, i) =>
      growing
        ? { id: `${t.track.id}#${t.job}`, name: t.track.name, best: i === 0, job: jobCard(t.job), kind: "step" as const }
        : { id: t.track.id, name: t.track.name, best: i === 0, job: jobCard(t.job), ...(withinReach(t.job, answers) ? {} : { needsExperience: true }) },
    ),
    more: tracks.filter((t) => !chosen.has(t.job)).map((t) => jobCard(t.job)),
    reasons: rec.reasons.map(revealReasonText),
    company: dream ? { name: dream.company.short, aimed: dream.job !== null && dream.job === rec.recommended } : null,
    stages: (facts ? roadmapFor(rec.recommended, facts).stages : canonicalStages(rec.recommended)).map((s, i) => ({
      n: i + 1,
      skill: s.skill,
      name: getSkill(s.skill).name,
      star: s.star,
      prep: s.prep,
    })),
    cvCover: facts ? coverOf(rec.recommended, facts) : null,
    tiles: JOBS.map((job) => ({ id: job.id, title: job.title, fits: fitting.has(job.id) })),
    fields: FIELDS.map((field) => ({
      id: field.id,
      name: field.name,
      skills: SKILLS.filter((s) => s.field === field.id).length,
      lit: field.id === recommendedField || interests.has(field.id),
    })),
  };
}

/** The result offers at most 5 specialisations (3 or more wherever the field has them). */
const MAX_TRACKS = 5;

/**
 * The specialisations offered on the result, the recommended job's own track first (holding that job). The fields: the
 * recommended job's, plus the user's other interest field (two tracks of it are kept, so it is never crowded out); never
 * another field (owner: every choice stays in what the user asked for), so a field with two tracks offers two. Each
 * track's job is its first in `order` (the engine's choiceOrder: in-field, within reach and paid first); the tracks
 * follow their jobs' order, a field's general track after its named ones.
 */
function trackChoices(answers: OnboardingAnswers, order: readonly JobId[], recommended: JobId): { track: Track; job: JobId }[] {
  const recTrack = trackOf(recommended);
  const best = new Map<string, { track: Track; job: JobId; at: number }>();
  order.forEach((id, at) => {
    const track = trackOf(id);
    if (!best.has(track.id)) best.set(track.id, { track, job: id, at });
  });
  best.delete(recTrack.id);
  const of = (fields: readonly JobFieldId[]) =>
    [...best.values()]
      .filter((t) => fields.includes(t.track.field))
      // a track whose best job is out of reach (a senior role for a beginner) after the reachable ones (21 Nov 2026)
      .sort((a, b) => Number(!withinReach(a.job, answers)) - Number(!withinReach(b.job, answers)) || Number(a.track.general) - Number(b.track.general) || a.at - b.at);

  const field = recTrack.field;
  const second: JobFieldId[] = [];
  for (const interest of answers.interest ?? []) if (isJobFieldId(interest) && interest !== field) second.push(interest);
  const primary = of([field]);
  const secondary = of(second);
  const picked = secondary.length > 0 ? [...primary.slice(0, 2), ...secondary.slice(0, 2)] : primary.slice(0, MAX_TRACKS - 1);
  for (const t of [...primary, ...secondary].sort((a, b) => a.at - b.at)) {
    if (picked.length >= MAX_TRACKS - 1) break;
    if (!picked.includes(t)) picked.push(t);
  }
  return [{ track: recTrack, job: recommended }, ...picked.map(({ track, job }) => ({ track, job }))];
}

/**
 * 21 Nov 2026 (owner: «when you put I want to upgrade my career it should upgrade your career, not give something new»):
 * «خطوتك الجاية» for «أتطوّر في مجالي». The recommended job first, then the other jobs ABOVE the user's experience in their
 * own specialisation, then above it in the rest of their field (within reach first, in the engine's order); jobs of their
 * own band in the field only when there are no higher ones; never another field unless the field has nothing else.
 */
function growChoices(answers: OnboardingAnswers, order: readonly JobId[], recommended: JobId): { track: Track; job: JobId }[] {
  const field = growsInField(answers);
  const track = growTrackOf(answers);
  const own = EXPERIENCE_BANDS.indexOf(userBandOf(answers));
  const above = (id: JobId) => EXPERIENCE_BANDS.indexOf(getJob(id).band) > own;
  // an upgrade is never an unpaid training or a step below the user's level (owner: «upgrade, not something new»)
  const unpaid = (id: JobId) => /غير مدفوع|unpaid/i.test(`${getJob(id).title} ${getJob(id).titleEn ?? ""}`);
  const inField = order.filter((id) => id !== recommended && getJob(id).field === field && !unpaid(id) && EXPERIENCE_BANDS.indexOf(getJob(id).band) >= own);
  const sameTrack = (id: JobId) => track === null || trackOf(id).id === track;
  const band = (id: JobId) => EXPERIENCE_BANDS.indexOf(getJob(id).band);
  const reach = (ids: JobId[]) => [...ids.filter((id) => withinReach(id, answers)), ...ids.filter((id) => !withinReach(id, answers))];
  // another specialisation, when one is needed: the closest to the recommended job first (most skills in common: an
  // accountant's next card is a financial analyst, not an AI business analyst)
  const skillsOf = (id: JobId) => new Set(getJob(id).requirements.map((r) => r.skill));
  const mine = skillsOf(recommended);
  const shared = (id: JobId) => [...skillsOf(id)].filter((s) => mine.has(s)).length;
  const closest = (ids: JobId[]) => ids.map((id, i) => ({ id, i, n: shared(id) })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.id);
  // in this order, each only while fewer than two cards were found: their own specialisation a band up, then at their
  // level; then (only to make two) the rest of the field a band up, at their level, any; then anything
  // a named specialisation: ONLY its own jobs (21 Nov 2026, owner: other specialisations as filler read as «something
  // new»); fewer cards is fine. «غير كذا»: the whole field, as before.
  const stages: { readonly ids: JobId[]; readonly fill: boolean }[] =
    track !== null
      ? [
          { ids: reach(inField.filter((id) => above(id) && sameTrack(id))), fill: true },
          { ids: inField.filter((id) => band(id) === own && sameTrack(id)), fill: true },
        ]
      : [
          { ids: reach(inField.filter((id) => above(id) && sameTrack(id))), fill: true },
          { ids: inField.filter((id) => band(id) === own && sameTrack(id)), fill: true },
          { ids: reach(closest(inField.filter(above))), fill: false },
          { ids: closest(inField.filter((id) => band(id) >= own)), fill: false },
          { ids: closest(inField), fill: false },
        ];
  const picked: JobId[] = [];
  for (const stage of stages) {
    if (picked.length >= 2) break;
    for (const id of stage.ids) {
      if (picked.length >= (stage.fill ? MAX_TRACKS - 1 : 2)) break;
      // one card per title (a posting repeated in two cities reads as the same step)
      if (!picked.includes(id) && !picked.some((p) => getJob(p).title === getJob(id).title) && getJob(id).title !== getJob(recommended).title) picked.push(id);
    }
  }
  return [recommended, ...picked].map((job) => ({ track: trackOf(job), job }));
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
