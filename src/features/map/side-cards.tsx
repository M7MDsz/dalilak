"use client";
// Owner: map. The cards beside the map (spec 3.4 regions): the next-step card (the one primary action of the screen), the
// target header with the match ring and the summary line, the branch cards (narrow layouts; on a wide sheet the branches
// are the two peaks on the map), and the leaderboard preview (top three and the user's own row).
// Game layer (docs/GAME-LAYER.md 5.2): the next step is a quest whose rewards are chips (RewardRow: the course XP in brass,
// the star it grants, the match it adds); the target is a destination whose five requirements are the five segments of
// its unlock meter (they explain the match to the last point); the player plate (PlayerCard + DailyTrack) joins the column
// where there is room for it. Nothing here pays XP: the chips show what the store pays (spec 8.1).
import type { ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { IconArrowForward, IconClock, IconCv, IconFlag, IconLessons, IconTarget } from "@/components/icons";
import { type AvatarId } from "@/components/avatars";
import { DailyTrack, dailyDays, PlayerCard, RewardChip, RewardRow, Segments, Tile, UnlockMeter } from "@/components/game";
import { NavLink, Ring } from "@/components/motion";
import { Button, Card, Divider, SampleTag, SkillStars, XpValue, buttonStyles, cn } from "@/components/ui";
import { companyCityLine, countNoun, hoursText } from "@/lib/copy";
import { getCourse, getJob, getLevel, getSkill, XP } from "@/lib/data";
import { courseXp, levelFor, shortTitle } from "@/lib/engine";
import { formatNumber, formatPercent } from "@/lib/format";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { Course, JobId, Leaderboard, LeaderRow, LevelNumber, NextStep, Roadmap, RoadmapStage, SkillId, StarMap } from "@/lib/types";

// ── the next step ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface NextStepCardProps {
  readonly step: NextStep;
  readonly roadmap: Roadmap;
  /** The stage the step works on (rules 2 and 3, when its course is a stage of this path). */
  readonly stage: RoadmapStage | null;
  /** The stars the user holds in every skill: a solid star is an earned one, an outline an empty slot. */
  readonly held: StarMap;
  /** While a station card with its own primary button is open, this card's button steps back: one primary on screen. */
  readonly stepBack: boolean;
  readonly advisorBusy: boolean;
  readonly onAction: () => void;
  readonly onSecondary: () => void;
}

/** Title, body and buttons of the five forms, verbatim from spec 3.4. */
function stepCopy(step: NextStep, roadmap: Roadmap): { title: string; body: ReactNode; button: string; secondary: string | null } {
  switch (step.rule) {
    case 1:
      return { title: "اكتشف نقطة بدايتك", body: "ارفع سيرتك الذاتية ليحدّد دليل المراحل التي أنجزتها فعلاً.", button: "ارفع سيرتك الذاتية", secondary: "ابدأ بدون سيرة" };
    case 2:
      return {
        title: "أكمل ما بدأته",
        body: (
          <>
            دورة «<bdi>{shortTitle(getCourse(step.courseId))}</bdi>»: {formatNumber(step.ticked)} من {countNoun(step.total, "lesson")}.
          </>
        ),
        button: "أكمل الدورة",
        secondary: null,
      };
    case 3:
      return {
        title: "خطوتك التالية",
        body: (
          <>
            دورة «<bdi>{shortTitle(getCourse(step.courseId))}</bdi>»
          </>
        ),
        button: "ابدأ الدورة",
        secondary: null,
      };
    case 4:
      return {
        title: "أنت جاهز لهذه الوظيفة",
        body: (
          <>
            مطابقتك <bdi dir="ltr">{formatPercent(100)}</bdi> مع «<bdi>{getJob(roadmap.jobId).title}</bdi>».
          </>
        ),
        button: "دع دليل يقدّم عنك",
        secondary: "قدّم بنفسك",
      };
    case 5:
      return { title: "اختر هدفك التالي", body: "أنجزت هذا المسار. هذه وظائف صارت أقرب إليك.", button: "استعرض الوظائف", secondary: null };
  }
}

const SECONDARY_TID = { 1: TID.path.skipCv, 4: TID.path.nextStepSecondary } as const;

/** The stars of the course's skill drawn solid before it: the ones the user holds, never the star this course grants. */
function heldBefore(course: { readonly skill: SkillId; readonly star: number }, held: StarMap): number {
  return Math.min(course.star - 1, held[course.skill]);
}

/** «النجمة 1 في Power BI»: the star a course grants, as an ink reward chip. */
function StarChip({ course }: { readonly course: Course }) {
  return (
    <RewardChip
      kind="star"
      label={
        <>
          في <bdi>{getSkill(course.skill).name}</bdi>
        </>
      }
      size="sm"
      value={course.star}
    />
  );
}

/**
 * The rewards of the step, where the store will pay them (spec 8.1): the course's XP, its star and the match it adds
 * (rules 2 and 3), the +40 XP for applying (rule 4), the +100 XP of the first CV analysis (rule 1, while unpaid).
 */
function StepRewards({ step, stage, cvRewardOpen }: { readonly step: NextStep; readonly stage: RoadmapStage | null; readonly cvRewardOpen: boolean }) {
  if (step.rule === 1) {
    if (!cvRewardOpen) return null;
    return (
      <RewardRow>
        <RewardChip label="عند تحليل سيرتك" size="sm" value={XP.cv_analysed} />
      </RewardRow>
    );
  }
  if (step.rule === 2) {
    const course = getCourse(step.courseId);
    const gain = stage !== null ? stage.gain : 0;
    return (
      <RewardRow>
        <RewardChip size="sm" value={courseXp(course)} />
        <StarChip course={course} />
        {gain > 0 ? <RewardChip kind="match" size="sm" value={gain} /> : null}
      </RewardRow>
    );
  }
  if (step.rule === 4) {
    return (
      <RewardRow>
        <RewardChip label="عند التقديم" size="sm" value={XP.job_applied} />
      </RewardRow>
    );
  }
  return null;
}

export interface NextStepRewardsProps {
  /** The +100 XP of the first CV analysis is still to be earned (no `cv_analysed` event yet): rule 1 shows it. */
  readonly cvRewardOpen: boolean;
}

/** The wide form: the one stage card of the screen (DESIGN 3.3), at the top of the 340 px column. */
export function NextStepCard({ step, roadmap, stage, held, stepBack, advisorBusy, onAction, onSecondary, cvRewardOpen }: NextStepCardProps & NextStepRewardsProps) {
  const copy = stepCopy(step, roadmap);
  const course = step.rule === 2 || step.rule === 3 ? getCourse(step.courseId) : null;
  const skill = course !== null ? getSkill(course.skill) : null;
  const secondaryTid = step.rule === 1 || step.rule === 4 ? SECONDARY_TID[step.rule] : undefined;
  const has = course !== null ? heldBefore(course, held) : 0;
  return (
    <Card className="flex flex-col gap-2 rounded-sheet px-5 pt-3.5 pb-4" data-state={step.rule} data-testid={TID.path.nextStep} padding="none" variant="stage">
      <div className="flex items-center justify-between gap-3 text-small">
        <span className="inline-flex items-center gap-2 font-semibold text-fg">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {step.rule === 3 ? copy.title : "الخطوة التالية"}
        </span>
        {stage !== null ? (
          <span className="text-fg-2">
            المرحلة {formatNumber(stage.n)} من {formatNumber(roadmap.total)}
          </span>
        ) : null}
      </div>
      {step.rule === 3 && course !== null && skill !== null ? (
        <>
          <h2 className="flex flex-wrap items-center gap-x-2.5 text-[1.75rem] leading-[1.3] font-bold">
            <bdi>{skill.name}</bdi>
            <SkillStars size="md" slots={course.star} value={has} />
          </h2>
          <p className="-mt-1.5 text-[0.9375rem] leading-[1.6] text-fg-2">{copy.body}</p>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-small text-fg-2">
            <span className="inline-flex items-center gap-1.5">
              <IconClock size={18} waypoint="off" />
              {hoursText(step.hours)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconLessons size={18} waypoint="off" />
              {countNoun(course.lessons.length, "lesson")}
            </span>
          </div>
          {/* the quest's rewards (GAME-LAYER 5.2): the XP in brass, the star it grants, the match it adds and where it takes
              the match (spec 3.4: «ترفع مطابقتك إلى 90%») */}
          <RewardRow className="mt-0.5 gap-y-2" label={null}>
            <RewardChip size="sm" value={step.xp} />
            <StarChip course={course} />
            {step.prep ? null : (
              <>
                <RewardChip kind="match" size="sm" value={step.matchAfter - step.matchNow} />
                <span className="ms-1 text-small text-fg-2">
                  ترفع مطابقتك إلى{" "}
                  <bdi className="font-bold text-fg tabular-nums" dir="ltr">
                    {formatPercent(step.matchAfter)}
                  </bdi>
                </span>
              </>
            )}
          </RewardRow>
          {step.prep ? <p className="rounded-control border border-border px-3 py-2 text-small text-fg-2">تمهيدية: لا ترفع المطابقة، لكنها تفتح المهارة التالية.</p> : null}
        </>
      ) : (
        <>
          <h2 className="text-h2">{copy.title}</h2>
          <p className="-mt-1 text-[0.9375rem] leading-[1.7] text-fg-2">{copy.body}</p>
          {step.rule === 2 ? (
            <Segments
              className="mb-0.5"
              fills={Array.from({ length: step.total }, (_, i) => (i < step.ticked ? 1 : 0))}
              height="sm"
              label={`${formatNumber(step.ticked)} من ${countNoun(step.total, "lesson")}`}
            />
          ) : null}
          <StepRewards cvRewardOpen={cvRewardOpen} stage={stage} step={step} />
        </>
      )}
      <Button
        className="mt-1 h-13 w-full"
        data-testid={TID.path.nextStepAction}
        disabled={step.rule === 4 && advisorBusy}
        icon={<IconArrowForward size={20} />}
        onClick={onAction}
        size="lg"
        variant={stepBack ? "secondary" : "primary"}
      >
        {copy.button}
      </Button>
      {copy.secondary !== null ? (
        <Button className="self-center" data-testid={secondaryTid} onClick={onSecondary} size="sm" variant="ghost">
          {copy.secondary}
        </Button>
      ) : null}
    </Card>
  );
}

/**
 * The narrow forms (one column: a phone, or beside the docked advisor panel; spec 2.3, 3.4 phone order). Both keep the
 * step's body line and its rewards (spec 3.4 form 3: «دورة «أساسيات Power BI» · 10 ساعات · +200 XP · ترفع مطابقتك إلى
 * 90%»): on a phone this card is the only place the next step lives (P3).
 * - `pair` (680 to 900 px of content, beside the target card): the card stands as tall as the target card, so it is a
 *   column whose button sits at its foot; the content fills it, no empty stage under a short strip.
 * - a phone: one row (the stage coin, the title, the button), then the body line and the rewards under it.
 */
export function NextStepDock({ step, roadmap, stage, held, advisorBusy, onAction, onSecondary, cvRewardOpen, pair }: Omit<NextStepCardProps, "stepBack"> & NextStepRewardsProps & { readonly pair: boolean }) {
  const copy = stepCopy(step, roadmap);
  const course = step.rule === 2 || step.rule === 3 ? getCourse(step.courseId) : null;
  const skill = course !== null ? getSkill(course.skill) : null;
  const secondaryTid = step.rule === 1 || step.rule === 4 ? SECONDARY_TID[step.rule] : undefined;
  const courseStep = step.rule === 3 && skill !== null && course !== null;
  const oneRow = courseStep && !pair;
  const coin = (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-[1.25rem] leading-none font-bold text-on-accent tabular-nums">
      {stage !== null ? formatNumber(stage.n) : step.rule === 1 ? <IconCv size={22} waypoint="off" /> : step.rule === 4 ? <IconFlag size={22} waypoint="off" /> : <IconTarget size={22} waypoint="off" />}
    </span>
  );
  const button = (
    <Button
      className={oneRow ? "shrink-0 px-4" : "w-full"}
      data-testid={TID.path.nextStepAction}
      disabled={step.rule === 4 && advisorBusy}
      icon={<IconArrowForward size={20} />}
      onClick={onAction}
    >
      {copy.button}
    </Button>
  );
  const secondary =
    copy.secondary !== null ? (
      <Button className="self-center" data-testid={secondaryTid} onClick={onSecondary} size="sm" variant="ghost">
        {copy.secondary}
      </Button>
    ) : null;
  if (courseStep && step.rule === 3) {
    const title = (
      <div className="min-w-0 flex-1">
        <p className="text-caption text-fg-2">{copy.title}</p>
        <h2 className="flex items-center gap-1.5 text-title leading-[1.35] font-bold whitespace-nowrap">
          <bdi className="truncate">{skill.name}</bdi>
          <SkillStars size="sm" slots={course.star} value={heldBefore(course, held)} />
        </h2>
      </div>
    );
    // the body line: the short course title and its hours (the full title is the course page's heading)
    const body = (
      <p className="text-small text-fg-2">
        دورة «<bdi className="font-semibold text-fg">{shortTitle(course)}</bdi>» · {hoursText(step.hours)}
      </p>
    );
    // the rewards: the XP in brass and where the course takes the match; beside the target card there is room for the
    // star it grants and the match it adds as well (the wide card's full row)
    const rewards = (
      <>
        <RewardRow className="gap-y-1.5" label={null}>
          <RewardChip size="sm" value={step.xp} />
          {pair ? <StarChip course={course} /> : null}
          {step.prep ? null : (
            <>
              {pair ? <RewardChip kind="match" size="sm" value={step.matchAfter - step.matchNow} /> : null}
              <span className="ms-1 text-small text-fg-2">
                ترفع مطابقتك إلى{" "}
                <bdi className="font-bold text-fg tabular-nums" dir="ltr">
                  {formatPercent(step.matchAfter)}
                </bdi>
              </span>
            </>
          )}
        </RewardRow>
        {step.prep ? <p className="text-small text-fg-2">تمهيدية: لا ترفع المطابقة، لكنها تفتح المهارة التالية.</p> : null}
      </>
    );
    return (
      <Card className={cn("flex flex-col rounded-sheet", pair ? "gap-2.5 px-4 pt-3.5 pb-4" : "gap-2 p-2 pb-3")} data-state={step.rule} data-testid={TID.path.nextStep} padding="none" variant="stage">
        <div className="flex items-center gap-2.5">
          {coin}
          {title}
          {oneRow ? button : null}
        </div>
        <div className={cn("flex flex-col gap-1.5", pair ? null : "px-1.5")}>
          {body}
          {rewards}
        </div>
        {/* beside the target card the button stands at the card's foot, so the card fills the row's height */}
        {pair ? <div className="mt-auto pt-0.5">{button}</div> : null}
      </Card>
    );
  }
  return (
    <Card className="flex flex-col rounded-sheet p-2" data-state={step.rule} data-testid={TID.path.nextStep} padding="none" variant="stage">
      <div className="flex flex-1 flex-col gap-2.5 p-1.5">
        <div className="flex items-center gap-2.5">
          {coin}
          <div className="min-w-0 flex-1">
            <p className="text-caption text-fg-2">الخطوة التالية</p>
            <h2 className="text-title leading-[1.35] font-bold">{copy.title}</h2>
          </div>
        </div>
        <p className="text-small text-fg-2">{copy.body}</p>
        {step.rule === 2 ? (
          <Segments
            fills={Array.from({ length: step.total }, (_, i) => (i < step.ticked ? 1 : 0))}
            height="sm"
            label={`${formatNumber(step.ticked)} من ${countNoun(step.total, "lesson")}`}
          />
        ) : null}
        <StepRewards cvRewardOpen={cvRewardOpen} stage={stage} step={step} />
        <div className={cn("flex flex-col gap-2.5", pair ? "mt-auto" : null)}>
          {button}
          {secondary}
        </div>
      </div>
    </Card>
  );
}

// ── the target header ────────────────────────────────────────────────────────────────────────────────────────────────

export function summaryLine(roadmap: Roadmap): string {
  const stages = `${formatNumber(roadmap.doneCount)} من ${countNoun(roadmap.total, "stage")}`;
  if (roadmap.complete || roadmap.doneCount === roadmap.total) return `${stages} · اكتمل المسار`;
  if (roadmap.doneCount === 0) return `${stages} · ${hoursText(roadmap.hoursLeft)} تعلّم`;
  return `${stages} · بقي ${hoursText(roadmap.hoursLeft)} تعلّم`;
}

/** The ring eases in: the meter's segments start a beat after it, so they fill while the arc sweeps, not ahead of it. */
const METER_LAG_S = 0.35;

export interface TargetRing {
  readonly value: number;
  readonly from: number;
  readonly delay: number;
}

/**
 * The target as a destination: the ring (the one number, P5), and under it the unlock meter: the job's five requirements
 * as five segments, each filled by the stars held ÷ the stars required (spec 7.2), and the lock that opens at 100%. The
 * segments are the match: Excel 2 of 2 is a full segment, الإحصاء 1 of 2 half of one, Power BI 0 of 1 an empty one: 70%.
 * In the 340 px column (900 px tall, with the launcher under it) the caption is left out; the one-column layouts write it.
 * While the ring is still at 0 waiting to count (the `catch-up` after a CV), the meter waits empty with it and then fills
 * in counted steps on the ring's beat; everywhere else it shows its value from the first frame.
 */
export function TargetCard({
  roadmap,
  ring,
  held,
  explain = false,
}: {
  readonly roadmap: Roadmap;
  readonly ring: TargetRing;
  readonly held: StarMap;
  /** Write «تستوفي 3 من 5 متطلبات» under the meter (the one-column layouts, which have the height for it). */
  readonly explain?: boolean;
}) {
  const job = getJob(roadmap.jobId);
  const waiting = ring.value === 0 && roadmap.match > 0;
  const requirements = job.requirements.map((r) => ({ name: getSkill(r.skill).name, have: waiting ? 0 : held[r.skill], need: r.stars }));
  return (
    <Card className="flex flex-col justify-center rounded-sheet" label="هدفك" padding="none">
      <div className="flex items-center gap-3.5 px-4 pt-0.5">
        <span className="shrink-0" data-testid={TID.path.match} data-value={roadmap.match}>
          <Ring delay={ring.delay} from={ring.from} size={76} value={ring.value} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-stretch">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-3">مطابقتك مع</span>
            <NavLink className={buttonStyles({ variant: "ghost", size: "sm", className: "-my-1.5 shrink-0" })} data-testid={TID.path.changeTarget} href={hrefFor({ screen: "jobs" })}>
              غيّر الهدف
            </NavLink>
          </div>
          <NavLink className="max-w-full self-start rounded-tag text-h3 leading-[1.4] text-fg hover:underline hover:decoration-[1.5px] hover:underline-offset-4" data-testid={TID.path.targetTitle} href={hrefFor({ screen: "job", jobId: roadmap.jobId })}>
            {job.title}
          </NavLink>
          <p className="text-small text-fg-2" data-testid={TID.path.summary}>
            {summaryLine(roadmap)}
          </p>
        </div>
      </div>
      {/* the five requirements are the five segments: they explain the match (GAME-LAYER 5.2) */}
      <UnlockMeter caption={explain ? undefined : null} className="mx-4 mt-1" delay={ring.delay + METER_LAG_S} skills={requirements} value={roadmap.match} />
      <p className="mx-4 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-dotted border-border-strong pt-1.5 pb-2 text-small text-fg-2">
        <span className="min-w-0">{companyCityLine(roadmap.jobId)}</span>
        <SampleTag kind="company" />
      </p>
    </Card>
  );
}

// ── branches (narrow layouts) ────────────────────────────────────────────────────────────────────────────────────────

export function BranchCards({ branches, complete, onBranch }: { readonly branches: Roadmap["branches"]; readonly complete: boolean; readonly onBranch: (jobId: JobId) => void }) {
  return (
    <section aria-labelledby="path-branches" className="flex flex-col gap-2.5">
      <h2 className="text-title text-fg" id="path-branches">
        فروع تُفتح بعد هذا المسار
      </h2>
      {branches.map((b) => (
        <button
          className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-start transition-[border-color,scale] duration-200 ease-out hover:border-border-strong active:scale-[0.99] active:transition-none"
          data-testid={TID.path.branch(b.jobId)}
          data-value={b.after}
          key={b.jobId}
          onClick={() => onBranch(b.jobId)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-title text-fg">{getJob(b.jobId).title}</span>
            <span className="flex items-center gap-2 text-small text-fg-2">
              <span>
                الآن <bdi dir="ltr">{formatPercent(b.now)}</bdi>
              </span>
              <span aria-hidden className="size-[3px] rounded-full bg-fg-3" />
              <span>
                بعد المسار <bdi dir="ltr">{formatPercent(b.after)}</bdi>
              </span>
            </span>
          </span>
          <span className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "pointer-events-none shrink-0")}>{complete ? "اجعلها هدفي" : "عرض الوظيفة"}</span>
        </button>
      ))}
    </section>
  );
}

// ── the leaderboard preview ──────────────────────────────────────────────────────────────────────────────────────────

function Row({ row, name, me }: { readonly row: LeaderRow; readonly name: string; readonly me: boolean }) {
  return (
    <li
      className={cn("flex items-center gap-2.5 rounded-control px-2.5", me ? "h-10.5 bg-bg" : "h-[2.125rem]")}
      data-surface={me ? "stage" : undefined}
      data-testid={me ? TID.path.leaderboardMe : row.id === "me" ? undefined : TID.path.leaderboardRow(row.id)}
      data-value={row.rank}
    >
      <span className="w-6 shrink-0 text-center text-body font-bold text-fg-3 tabular-nums" dir="ltr">
        {formatNumber(row.rank)}
      </span>
      <Avatar id={row.avatar} level={row.level} size={32} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-[0.9375rem] font-medium text-fg">{name}</span>
        {me ? <span className="shrink-0 text-small font-semibold text-accent-fg">أنت</span> : null}
      </span>
      <XpValue size="sm" value={row.weeklyXp} />
    </li>
  );
}

export function LeaderboardPreview({ board, firstName }: { readonly board: Leaderboard; readonly firstName: string }) {
  const meRow = board.rows.find((row) => row.me);
  const meOnPodium = board.top3.some((row) => row.me);
  return (
    <Card className="rounded-sheet px-2.5 pt-2.5 pb-2" data-testid={TID.path.leaderboard} padding="none">
      <div className="flex items-center gap-2.5 px-2.5 pb-1">
        <h2 className="text-title font-bold text-fg">المتصدرون</h2>
        <SampleTag />
        <NavLink className={buttonStyles({ variant: "ghost", size: "sm", className: "-my-1 ms-auto shrink-0" })} data-testid={TID.path.leaderboardOpen} href={hrefFor({ screen: "leaderboard" })}>
          عرض الترتيب
        </NavLink>
      </div>
      <ol className="flex flex-col">
        {board.top3.map((row) => (
          <Row key={row.id} me={row.me} name={row.me ? firstName : row.name} row={row} />
        ))}
        {!meOnPodium && meRow !== undefined ? (
          <>
            <li aria-hidden className="px-5 py-0.5">
              <Divider variant="trail" />
            </li>
            <Row me name={firstName} row={meRow} />
          </>
        ) : null}
      </ol>
    </Card>
  );
}

// ── the player ───────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PlayerFacts {
  readonly name: string;
  readonly avatar: AvatarId;
  /** Total XP (the level, its title and the track come from it, spec 8.3). */
  readonly total: number;
  readonly streak: number;
  readonly badges: { readonly have: number; readonly total: number };
  /** Tomorrow's daily reward if the streak continues (spec 8.4). */
  readonly tomorrow: number;
  /** Today needs no claim: claimed already, or the creation day (no reward then, spec 8.4). */
  readonly todayDone: boolean;
}

/**
 * The player plate (GAME-LAYER 5.2 item 3): PlayerCard (the level token, the XP track with what is left, the streak, the
 * badges «3 / 12», tomorrow's reward) and, under it, the streak as a track of daily coins. The rank is left to the
 * leaderboard preview right under it (its «أنت» row): in the 340 px column a rank cell would also squeeze the level line
 * into two. `track: false` leaves the track out (the PlayerCard already names tomorrow's reward).
 */
export function PlayerPanel({ player, track = true, className }: { readonly player: PlayerFacts; readonly track?: boolean; readonly className?: string }) {
  const info = levelFor(player.total);
  const nextTitle = info.next === null ? undefined : getLevel((info.level + 1) as LevelNumber).title;
  return (
    <section aria-label="ملفك" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <PlayerCard
        avatar={player.avatar}
        badges={player.badges}
        from={info.from}
        level={info.level}
        name={player.name}
        nextReward={player.tomorrow}
        nextTitle={nextTitle}
        streak={player.streak}
        title={info.title}
        to={info.next}
        total={player.total}
      />
      {track ? (
        <Tile faceClassName="gap-3 px-4 pt-3 pb-3.5" interactive={false}>
          <h2 className="text-small font-semibold text-fg">سلسلة الأيام</h2>
          <DailyTrack days={dailyDays(player.streak, player.todayDone)} />
        </Tile>
      ) : null}
    </section>
  );
}
