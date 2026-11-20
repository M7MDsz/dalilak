"use client";
// Owner: jobs. The gap of spec 3.8 / 7.3 in three plain parts, which arrive in order (`gap-settle`, the page's one
// staggered group), drawn in the game layer's pieces (docs/GAME-LAYER.md 5.3.6):
// - «ما لديك»: each fully met skill as a met SkillGem (its name and stars), with the spec's line («Excel · نجمتان من
//   نجمتين») and where the stars came from («من سيرتك» / «من دورة»).
// - «ما ينقصك»: each unmet skill as a partial gem (some stars held) or a locked gem (none yet), with «الإحصاء: لديك نجمة
//   من نجمتين» / «Power BI: لا نجوم بعد، والمطلوب نجمة».
// - «كيف تسدّ الفجوة»: one QuestCard per missing star, in roadmap order, with its real rewards (+XP, the star, +% مطابقة)
//   and its state from the catalogue (the next step is the one accent piece). The quests sit on the trail they are (DESIGN
//   1: solid line, waypoint, dotted line): it starts at the user's match today (the waypoint), every quest is a leg, and
//   the node after each leg carries the match reached there, ending on the goal flag. Hovering or focusing a quest
//   previews that node on the page's ring (`gain-preview`). Each quest is one link to its guide («افتح الدليل»).
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { QuestCard, SkillGem, type GameState } from "@/components/game";
import { IconCheckCircle, IconCourses, IconEvidence, IconFlag } from "@/components/icons";
import { NavLink } from "@/components/motion";
import { buttonStyles, cn } from "@/components/ui";
import { SOURCE_LABEL, lockReasonText, starsOfRequired } from "@/lib/copy";
import { getGuide, getSkill } from "@/lib/data";
import { courseOnPath, courseState, nextStep } from "@/lib/engine";
import { formatPercent } from "@/lib/format";
import { group, rise } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { Gap, GapRow, JobId, UserState } from "@/lib/types";

import { JOB_COPY } from "./copy";
import { FieldIcon, RouteLink, keepCounts } from "./parts";

export function GapBlocks({
  gap,
  jobId,
  user,
  trail,
  hasStar,
  preview,
  onPreview,
}: {
  gap: Gap;
  jobId: JobId;
  user: UserState;
  /** The match after each row, cumulatively (the trail's nodes), aligned with gap.rows. */
  trail: readonly number[];
  hasStar: boolean;
  preview: number | null;
  onPreview: (value: number | null) => void;
}): ReactNode {
  const ready = gap.missing.length === 0;
  return (
    <motion.div
      animate="show"
      className="grid gap-x-6 gap-y-8 @min-[760px]/content:grid-cols-2"
      initial="hidden"
      variants={group(0.12)}
    >
      <motion.section
        aria-labelledby="gap-have"
        className="flex min-w-0 flex-col gap-3"
        data-testid={TID.job.have}
        variants={rise}
      >
        <BlockHeading icon={<IconCheckCircle className="text-ok-fg" size={22} waypoint="off" />} id="gap-have">
          {JOB_COPY.have}
        </BlockHeading>
        {!hasStar ? (
          <div
            className="flex flex-col items-start gap-3 rounded-card border-[1.5px] border-dashed border-border-strong bg-surface-2 px-card py-4"
            data-testid={TID.job.bannerCv}
          >
            <p className="text-body text-fg-2">{JOB_COPY.noStar}</p>
            <NavLink className={buttonStyles({ variant: "secondary", size: "sm" })} href={hrefFor({ screen: "cv" })}>
              {JOB_COPY.noStarAction}
            </NavLink>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-card border-[1.5px] border-border-strong bg-surface">
            {gap.have.map((row) => {
              const name = getSkill(row.skill).name;
              return (
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3" data-skill={row.skill} key={row.skill}>
                  <SkillGem have={row.held} name={name} need={row.need} size="md" />
                  <span className="flex min-w-0 flex-col">
                    <GemLine name={name} text={starsOfRequired(name, row.held, row.need)} />
                    <span className="flex items-center gap-1.5 text-small text-fg-3">
                      {row.source === "cv" ? (
                        <IconEvidence size={16} waypoint="muted" />
                      ) : (
                        <IconCourses size={16} waypoint="muted" />
                      )}
                      {SOURCE_LABEL[row.source]}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>

      <motion.section
        aria-labelledby="gap-missing"
        className="flex min-w-0 scroll-mt-[calc(var(--shell-top)+1.5rem)] flex-col gap-3"
        data-testid={TID.job.missing}
        id="missing"
        variants={rise}
      >
        <BlockHeading icon={<MissingMark />} id="gap-missing">
          {JOB_COPY.missing}
        </BlockHeading>
        {ready ? (
          <p className="flex items-center gap-3 rounded-card border-[1.5px] border-border-strong bg-surface px-card py-4 text-body font-medium text-fg">
            <IconCheckCircle className="shrink-0 text-ok-fg" size={22} waypoint="off" />
            {JOB_COPY.ready}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-card border-[1.5px] border-dashed border-border-strong bg-surface">
            {gap.missing.map((row) => {
              const name = getSkill(row.skill).name;
              return (
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3" data-skill={row.skill} key={row.skill}>
                  <SkillGem have={row.held} name={name} need={row.need} size="md" />
                  <GemLine name={name} text={starsOfRequired(name, row.held, row.need)} />
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>

      {!ready && gap.rows.length > 0 ? (
        <motion.section
          aria-labelledby="gap-courses"
          className="flex min-w-0 flex-col gap-3 @min-[760px]/content:col-span-2"
          data-testid={TID.job.courses}
          variants={rise}
        >
          <BlockHeading icon={<IconCourses className="text-fg-2" size={22} waypoint="muted" />} id="gap-courses">
            {JOB_COPY.courses}
          </BlockHeading>
          <QuestTrail gap={gap} jobId={jobId} onPreview={onPreview} preview={preview} trail={trail} user={user} />
        </motion.section>
      ) : null}
    </motion.div>
  );
}

/**
 * The spec's line for a skill, beside its gem: the gem already shows the name, so the name and its separator («Excel · »,
 * «Power BI: ») stay for screen readers and the page text, and the eye reads only the rest («نجمتان من نجمتين»).
 */
function GemLine({ name, text }: { name: string; text: string }): ReactNode {
  const rest = text.slice(name.length);
  const sep = /^\s*[·:]\s*/.exec(rest)?.[0] ?? "";
  return (
    <span className="text-small text-fg-2">
      <span className="sr-only">
        <bdi>{name}</bdi>
        {sep}
      </span>
      {keepCounts(rest.slice(sep.length))}
    </span>
  );
}

function BlockHeading({ id, icon, children }: { id: string; icon: ReactNode; children: ReactNode }): ReactNode {
  return (
    <h2 className="flex items-center gap-2.5 text-h3 text-fg" id={id}>
      <span aria-hidden className="inline-flex shrink-0">
        {icon}
      </span>
      {children}
    </h2>
  );
}

/** «ما ينقصك»'s mark: the open, dashed ring of something not yet held (the kit's "missing" language). */
function MissingMark(): ReactNode {
  return (
    <svg aria-hidden className="text-fg-2" fill="none" height={22} viewBox="0 0 24 24" width={22}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeDasharray="2.6 3.1"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Rail geometry: the line runs 17 px from the rail's inline-end edge; nodes are centred on it. */
const RAIL = "relative w-[3.25rem] shrink-0 @min-[600px]/content:w-[5.25rem]";
const LINE = "pointer-events-none absolute end-[17px] w-0 border-s-2 border-dotted border-border-strong";

function QuestTrail({
  gap,
  jobId,
  user,
  trail,
  preview,
  onPreview,
}: {
  gap: Gap;
  jobId: JobId;
  user: UserState;
  trail: readonly number[];
  preview: number | null;
  onPreview: (value: number | null) => void;
}): ReactNode {
  const last = gap.rows.length - 1;
  const step = nextStep(user);
  const nextCourse = step.rule === 2 || step.rule === 3 ? step.courseId : null;
  return (
    <ol className="pt-5 pb-6">
      {gap.rows.map((row, i) => {
        const after = trail[i] ?? row.matchAfter;
        const before = i === 0 ? gap.match : (trail[i - 1] ?? gap.match);
        const lit = preview !== null && preview === after && after !== before;
        return (
          <li className="flex items-stretch" key={row.courseId}>
            <div className={RAIL}>
              <span aria-hidden className={cn(LINE, "inset-y-0")} />
              {i === 0 ? <TrailNode kind="you" top value={gap.match} /> : null}
              <TrailNode kind={i === last ? "goal" : "step"} lit={lit} same={after === before} value={after} />
            </div>
            <div className="min-w-0 flex-1 py-3">
              <Quest jobId={jobId} next={row.courseId === nextCourse} onPreview={onPreview} previewValue={after} row={row} user={user} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** A node on the trail: «you» (the waypoint: the match today), a step (the match after that leg), the goal flag. */
function TrailNode({
  kind,
  value,
  top = false,
  lit = false,
  same = false,
}: {
  kind: "you" | "step" | "goal";
  value: number;
  top?: boolean;
  lit?: boolean;
  same?: boolean;
}): ReactNode {
  return (
    <span
      className={cn(
        "absolute inset-x-0 z-raised flex items-center justify-end gap-2 pe-[10px]",
        top ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
      )}
    >
      {same ? null : (
        <bdi
          className={cn(
            "text-small tabular-nums transition-colors duration-200",
            kind === "step" ? "font-semibold text-fg-2" : "font-bold text-fg",
            lit && "text-accent-fg",
          )}
          dir="ltr"
        >
          {formatPercent(value)}
        </bdi>
      )}
      <span className="grid size-4 shrink-0 place-items-center">
        {kind === "you" ? (
          <span className="grid size-4 place-items-center rounded-full bg-bg">
            <span className="size-2.5 rounded-full bg-accent" />
          </span>
        ) : kind === "goal" ? (
          <span className="grid size-6 place-items-center rounded-full bg-bg text-fg">
            <IconFlag size={18} waypoint={lit ? "on" : "muted"} />
          </span>
        ) : (
          <span
            className={cn(
              "size-3.5 rounded-full border-2 bg-bg transition-colors duration-200",
              same ? "border-border-strong" : "border-fg",
              lit && "border-accent",
            )}
          />
        )}
      </span>
    </span>
  );
}

/** The catalogue's state of a course, in the game's five states (GAME-LAYER 3); the user's next step is `next`. */
function questState(info: ReturnType<typeof courseState>, next: boolean): GameState {
  switch (info.state) {
    case "completed":
    case "credited":
      return "done";
    case "locked":
      return "locked";
    case "started":
      return next ? "next" : "progress";
    default:
      return next ? "next" : "available";
  }
}

/**
 * One row of «كيف تسدّ الفجوة» as a quest: the skill's guide (its real top pick's title) · «+200 XP» · the star it grants
 * · «+20% مطابقة», raised and pressable (it opens the guide), with «افتح الدليل» at its foot. On the target's own page
 * the quest carries its stage number from the map; elsewhere the skill's field emblem.
 */
function Quest({
  row,
  jobId,
  user,
  next,
  previewValue,
  onPreview,
}: {
  row: GapRow;
  jobId: JobId;
  user: UserState;
  next: boolean;
  previewValue: number;
  onPreview: (value: number | null) => void;
}): ReactNode {
  // a learning step is the guide of one skill (20 Nov 2026): the quest names the guide's real top pick
  const skill = getSkill(row.skill);
  const pick = getGuide(row.skill).topPick;
  const info = courseState(row.courseId, user);
  const state = questState(info, next);
  const onPath = courseOnPath(row.courseId, user);
  const stage = onPath !== null && onPath.jobId === jobId ? onPath.stageN : undefined;
  return (
    <div className="group/quest relative @container/quest min-w-0">
      <QuestCard
        data-course={row.courseId}
        faceClassName="pb-16 @min-[34rem]/quest:pb-card"
        icon={stage === undefined ? <FieldIcon field={skill.field} size={20} /> : undefined}
        lockedReason={info.state === "locked" ? lockReasonText(info.lock) : undefined}
        matchGain={row.gain}
        onBlur={() => onPreview(null)}
        onFocus={() => onPreview(previewValue)}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") onPreview(previewValue);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") onPreview(null);
        }}
        preparatory={row.prep}
        progress={info.state === "started" ? info.ticked.length : undefined}
        render={<RouteLink href={hrefFor({ screen: "course", courseId: row.courseId })} />}
        skill={skill.name}
        stageNumber={stage}
        star={row.star}
        state={state}
        testId={TID.job.course(row.courseId)}
        title={
          <span className="line-clamp-2">
            <bdi>{pick.title}</bdi>
          </span>
        }
        xp={row.xp}
      />
      {/* the quest's own cue: part of the face to the eye, sinking with it when pressed; the face is the link */}
      <span
        aria-hidden
        className={buttonStyles({
          variant: "ghost",
          size: "sm",
          className:
            "pointer-events-none absolute end-5 bottom-[1.125rem] z-raised transition-[translate] duration-200 group-hover/quest:trail-walk group-has-[:active]/quest:translate-y-1 group-has-[:active]/quest:transition-none",
        })}
      >
        {JOB_COPY.openCourse}
      </span>
    </div>
  );
}
