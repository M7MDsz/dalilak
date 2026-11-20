"use client";
// QuestCard: a course drawn as a quest (docs/GAME-LAYER.md 4.4). What you do (the course), what it costs (hours, lessons),
// what you get (its XP, the star it grants, the match it adds) and where it stands (the five states). The rewards are the
// real ones of spec 8.1 and 3.10; nothing here invents a new source of XP.
import type { ReactNode } from "react";

import { IconClock, IconLessons, IconLock } from "@/components/icons";
import { Roll } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { Stamp } from "@/components/ui";
import { formatNumber } from "@/lib/format";

import { LessonMeter } from "./meter";
import { RewardChip, RewardRow } from "./reward";
import { StateRibbon } from "./ribbon";
import { hoursLabel, lessonsLabel, type GameState } from "./state";
import { Tile, type TileProps } from "./tile";

/** The quest's number token: the same number as its stage on the map («المرحلة 7»), drawn as the map draws stations. */
export function QuestNumber({ n, state, size = "md", className }: { readonly n: number; readonly state: GameState; readonly size?: "sm" | "md"; readonly className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold tabular-nums leading-none",
        size === "sm" ? "size-8 border-2 text-small" : "size-10 border-2 text-title",
        state === "next" && "border-ink bg-accent text-on-accent",
        state === "done" && "border-[color:var(--solid)] bg-solid text-on-solid",
        state === "locked" && "border-dashed border-border-strong bg-surface-2 text-fg-2",
        (state === "available" || state === "progress") && "border-fg bg-surface text-fg stage:border-on-stage-3",
        className,
      )}
      data-state={state}
      dir="ltr"
    >
      <Roll id={`${n}-${state}`}>{formatNumber(n)}</Roll>
    </span>
  );
}

export interface QuestCardProps extends Omit<TileProps, "children" | "state" | "ribbon" | "title"> {
  /** The step's title (on «دليل التعلّم»: the guide's pick, the real course to learn it from). */
  readonly title: ReactNode;
  /** The skill it raises («Power BI»). */
  readonly skill: string;
  /** The star it grants (1..3). */
  readonly star: number;
  /**
   * What it costs, drawn only when given. Leave both out for a learning step whose course is internal (the guide's
   * course hours and lessons are not a real course's duration).
   */
  readonly hours?: number;
  readonly lessons?: number;
  /** Its XP (spec 8.2: 20 × hours). */
  readonly xp: number;
  /** Match points it adds to the target («+20% مطابقة»), only for a course on the path. */
  readonly matchGain?: number;
  /** Its stage number on the path («المرحلة 7»): draws the station token. */
  readonly stageNumber?: number;
  /** Off the path (no stage number): the skill's field icon as the quest's emblem token (20 px). */
  readonly icon?: ReactNode;
  readonly state: GameState;
  /** Lessons ticked so far (a started course): draws the lesson meter and «جارية · 2 من 5». */
  readonly progress?: number;
  /** Locked: the catalogue's reason («تتطلب النجمة 1 في Excel»). */
  readonly lockedReason?: ReactNode;
  /** Done or credited: the line under the title («أكملتها اليوم» · «من سيرتك: …»). */
  readonly note?: ReactNode;
  /** «مثبتة»: the star is held without this course (spec 8.5). It pays nothing, so no rewards are offered. */
  readonly credited?: boolean;
  /** «تمهيدية»: a preparatory stage (no match gain). */
  readonly preparatory?: boolean;
  /** The ribbon's label, when the state's own is not enough. */
  readonly ribbonLabel?: ReactNode;
  /**
   * A button of its own («افتح الدليل»). With an action the card itself is flat (the button is the pressable piece:
   * a button never sits inside another button); without one, the whole card is the pressable piece (pass `render` for a link).
   */
  readonly action?: ReactNode;
  /** Plays the «تمّ» stamp landing (the course was completed in front of the user). Otherwise a done card shows it at rest. */
  readonly stampPlay?: boolean;
  readonly testId?: string;
}

/**
 * QuestCard.
 * ```tsx
 * <QuestCard state="next" stageNumber={7} title="أساسيات Power BI: من البيانات إلى لوحة المعلومات" skill="Power BI" star={1}
 *   hours={10} lessons={5} xp={200} matchGain={20} render={<NavLink href="/learn/c-powerbi-1" />} testId="learn-card-c-powerbi-1" />
 * ```
 */
export function QuestCard({
  title,
  skill,
  star,
  hours,
  lessons,
  xp,
  matchGain,
  stageNumber,
  icon,
  state,
  progress,
  lockedReason,
  note,
  credited = false,
  preparatory = false,
  ribbonLabel,
  action,
  stampPlay = false,
  testId,
  faceClassName,
  interactive,
  ...rest
}: QuestCardProps) {
  const started = progress !== undefined && progress > 0 && state !== "done";
  const ribbonText =
    ribbonLabel ??
    (credited
      ? "مثبتة"
      : started
        ? lessons !== undefined
          ? `${state === "next" ? "أكمل" : "جارية"} · ${formatNumber(progress)} من ${formatNumber(lessons)}`
          : state === "next"
            ? "أكمل"
            : "جارية"
        : undefined);
  const rewardStatus = state === "done" && !credited ? "earned" : state === "locked" ? "locked" : "offer";
  const latin = /^[\x20-\x7e]+$/.test(skill);
  const flat = action !== undefined || interactive === false;

  return (
    <Tile
      {...rest}
      data-testid={testId}
      faceClassName={cn("gap-3 p-card pt-6", faceClassName)}
      interactive={!flat}
      ribbon={
        <StateRibbon state={credited ? "done" : state} tone={credited ? "quiet" : undefined}>
          {ribbonText}
        </StateRibbon>
      }
      state={state}
    >
      <div className="flex items-start gap-3">
        {stageNumber !== undefined ? (
          <QuestNumber n={stageNumber} state={state} />
        ) : icon ? (
          <span
            className={cn(
              "inline-grid size-10 shrink-0 place-items-center rounded-control border-2 wp-quiet",
              state === "locked" ? "border-dashed border-border-strong text-fg-2" : state === "done" ? "border-[1.5px] border-border-strong text-fg-2" : "border-fg text-fg stage:border-on-stage-3",
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-x-1.5 text-small font-medium text-fg-2">
            {latin ? <bdi dir="ltr">{skill}</bdi> : <span>{skill}</span>}
            <span aria-hidden>·</span>
            <span>النجمة {formatNumber(star)}</span>
            {stageNumber !== undefined ? (
              <>
                <span aria-hidden>·</span>
                <span>المرحلة {formatNumber(stageNumber)}</span>
              </>
            ) : null}
            {preparatory ? <span className="ms-1 rounded-tag border border-dashed border-border-strong px-1.5 text-caption">تمهيدية</span> : null}
          </p>
          <h3 className="text-title text-fg">{title}</h3>
        </div>
        {state === "done" && !credited ? (
          <Stamp className="-mt-3 -me-2 shrink-0 -rotate-12" play={stampPlay} size="sm" />
        ) : null}
      </div>

      {hours !== undefined || lessons !== undefined ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-fg-2">
          {hours !== undefined ? (
            <span className="inline-flex items-center gap-1.5">
              <IconClock className="text-fg-3" size={18} waypoint="off" />
              {hoursLabel(hours)}
            </span>
          ) : null}
          {lessons !== undefined ? (
            <span className="inline-flex items-center gap-1.5">
              <IconLessons className="text-fg-3" size={18} waypoint="off" />
              {lessonsLabel(lessons)}
            </span>
          ) : null}
        </p>
      ) : null}

      {note ? <p className="text-small text-fg-2">{note}</p> : null}

      {!credited ? (
        <RewardRow label={state === "done" ? "كسبت" : "تكسب"}>
          {/* completed in front of the user: the earned rewards land after the stamp (0.35 s), 60 ms apart */}
          <RewardChip delay={0.35} land={stampPlay} size="sm" status={rewardStatus} value={xp} />
          <RewardChip
            delay={0.41}
            kind="star"
            label={latin ? <bdi dir="ltr">{skill}</bdi> : skill}
            land={stampPlay}
            size="sm"
            status={state === "done" ? "earned" : rewardStatus}
            value={star}
          />
          {matchGain !== undefined && !preparatory ? <RewardChip delay={0.47} kind="match" land={stampPlay} size="sm" status={rewardStatus} value={matchGain} /> : null}
        </RewardRow>
      ) : null}

      {started && lessons !== undefined ? <LessonMeter done={progress} total={lessons} /> : null}

      {state === "locked" && lockedReason ? (
        <p className="flex items-start gap-1.5 text-small font-medium text-fg-2">
          <IconLock className="mt-0.5 shrink-0" size={17} waypoint="off" />
          <span>{lockedReason}</span>
        </p>
      ) : null}

      {action ? <div className="mt-1 flex flex-wrap items-center gap-3">{action}</div> : null}
    </Tile>
  );
}
