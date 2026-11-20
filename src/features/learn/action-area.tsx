"use client";
// Owner: learn. The course page's action area, by state (spec 3.11). Two forms of the same content, and only one is ever
// rendered (the test ids stay unique): `card` in the 340 px column when the content is wide, `bar` pinned to the bottom
// (above the phone tab bar) when it is narrow. Available and started show what the course adds (the match ring with its
// accent "next leg") and the one primary with its reward beside it (docs/GAME-LAYER.md 5.6: `RewardChip` next to «ابدأ
// الدورة»); started also the lessons ticked on a segmented meter; completed the stamp at rest, the date and the earned
// chips; credited the CV sentence (or the higher course) that holds the star; locked the reason and «افتح المتطلب».
// The card is a flat game tile (read, not pressed: its button is the pressable piece).
import type { ReactNode } from "react";

import { RewardChip, RewardRow, Segments, Tile } from "@/components/game";
import { IconArrowForward, IconEvidence, IconLock } from "@/components/icons";
import { NavLink, Ring, useGo } from "@/components/motion";
import { Button, Stamp } from "@/components/ui";
import { dayMonth, lockReasonText } from "@/lib/copy";
import { getCourse, getJob, getSkill } from "@/lib/data";
import { shortTitle } from "@/lib/engine";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { Course, CourseId, CoursePathInfo, CourseStateInfo } from "@/lib/types";

import { COURSE_COPY, completedOnLine, fromCourseLine, lockedLine, matchWithLine, progressLine } from "./copy";
import { MatchGain } from "./course-card";

export interface ActionAreaProps {
  readonly course: Course;
  readonly info: CourseStateInfo;
  readonly xp: number;
  readonly path: CoursePathInfo | null;
  /** Lessons shown ticked right now (store + cascade). */
  readonly tickedCount: number;
  readonly unlocker: CourseId | null;
  readonly onStart: () => void;
  readonly onComplete: () => void;
  readonly completing: boolean;
}

const card = "gap-5 p-card";

/** The match this course adds, as the ring with its projected leg (only for a path course that raises the match). */
function Adds({ path }: { readonly path: CoursePathInfo }): ReactNode {
  const job = getJob(path.jobId);
  return (
    <div className="flex items-center gap-4">
      <Ring preview={path.matchAfter} size={88} value={path.matchNow} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-small text-fg-2">{matchWithLine(job.title)}</p>
        <MatchGain className="text-title" gain={path.gain} />
      </div>
    </div>
  );
}

/** The lessons ticked on one segment per lesson («2 من 5 دروس» is written beside it by the caller). */
function LessonSegments({ ticked, total, className }: { readonly ticked: number; readonly total: number; readonly className?: string }): ReactNode {
  return <Segments className={className} fills={Array.from({ length: total }, (_, i) => (i < ticked ? 1 : 0))} height="sm" />;
}

/** The earned rewards of a completed course: its XP and its star, both with their checks. */
function Earned({ course, xp, size = "sm" }: { readonly course: Course; readonly xp: number; readonly size?: "sm" | "md" }): ReactNode {
  const name = getSkill(course.skill).name;
  const latin = /^[\x20-\x7e]+$/.test(name);
  return (
    <RewardRow label="كسبت">
      <RewardChip size={size} status="earned" value={xp} />
      <RewardChip kind="star" label={<>في {latin ? <bdi dir="ltr">{name}</bdi> : name}</>} size={size} status="earned" value={course.star} />
    </RewardRow>
  );
}

export function ActionCard(props: ActionAreaProps): ReactNode {
  const { course, info, xp, path, tickedCount, unlocker, onStart, onComplete, completing } = props;
  const go = useGo();
  const adds = path !== null && !path.prep && path.gain > 0 ? path : null;
  switch (info.state) {
    case "available":
      return (
        <Tile faceClassName={card} interactive={false}>
          {adds ? <Adds path={adds} /> : null}
          <div className="flex items-center gap-3">
            <Button className="min-w-0 flex-1" data-testid={TID.course.start} icon={<IconArrowForward size={20} />} onClick={onStart} size="lg">
              {COURSE_COPY.start}
            </Button>
            <RewardChip size="md" value={xp} />
          </div>
        </Tile>
      );
    case "started":
      return (
        <Tile faceClassName={card} interactive={false}>
          <div className="flex flex-col gap-2.5">
            <p className="text-title text-fg" data-testid={TID.course.progress} data-value={tickedCount}>
              {progressLine(tickedCount, info.total)}
            </p>
            <LessonSegments ticked={tickedCount} total={info.total} />
          </div>
          {adds ? (
            <div className="border-t border-border pt-4">
              <Adds path={adds} />
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Button
              className="min-w-0 flex-1"
              data-testid={TID.course.complete}
              icon={<IconArrowForward size={20} />}
              onClick={completing ? undefined : onComplete}
              pressed={completing}
              size="lg"
            >
              {COURSE_COPY.complete}
            </Button>
            <RewardChip size="md" value={xp} />
          </div>
        </Tile>
      );
    case "completed":
      return (
        <Tile faceClassName="gap-4 p-card" interactive={false}>
          <div className="flex items-center gap-4">
            <Stamp size="sm" />
            <p className="text-title text-fg">{completedOnLine(dayMonth(info.at))}</p>
          </div>
          <Earned course={course} xp={xp} />
        </Tile>
      );
    case "credited":
      return <CreditedCard info={info} />;
    case "locked":
      return (
        <Tile faceClassName="gap-4 p-card" interactive={false} state="locked">
          <p className="flex items-start gap-2 text-title text-fg">
            <IconLock className="mt-1 shrink-0 text-fg-2" size={20} waypoint="off" />
            <bdi>{lockedLine(lockReasonText(info.lock))}</bdi>
          </p>
          {unlocker ? (
            <Button
              className="w-full"
              data-testid={TID.course.lockedOpen}
              icon={<IconArrowForward size={20} />}
              onClick={() => go(hrefFor({ screen: "course", courseId: unlocker }))}
              variant="secondary"
            >
              {COURSE_COPY.lockedOpen}
            </Button>
          ) : null}
        </Tile>
      );
  }
}

/** «هذه النجمة مثبتة عندك…» and where the star came from: the CV sentence (marked like evidence) or the higher course. */
export function CreditedCard({ info }: { readonly info: Extract<CourseStateInfo, { state: "credited" }> }): ReactNode {
  return (
    <Tile faceClassName="gap-3 p-card" interactive={false} state="done">
      <p className="text-title text-fg">{COURSE_COPY.creditedLine}</p>
      {info.by.kind === "cv" ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-small font-semibold text-fg-2">
            <IconEvidence size={18} waypoint="off" />
            {COURSE_COPY.fromCv}
          </p>
          <blockquote className="text-body text-fg">
            <span className="box-decoration-clone rounded-[0.25rem] bg-mark px-1 py-0.5">«{info.by.evidence}»</span>
          </blockquote>
        </div>
      ) : (
        <NavLink className="text-small font-semibold text-fg underline decoration-border-strong decoration-dotted underline-offset-4 hover:decoration-fg" href={hrefFor({ screen: "course", courseId: info.by.courseId })}>
          {fromCourseLine(shortTitle(getCourse(info.by.courseId)))}
        </NavLink>
      )}
    </Tile>
  );
}

/** The narrow form: one line of state and the one action, pinned above the tab bar. */
export function ActionBar(props: ActionAreaProps): ReactNode {
  const { info, xp, tickedCount, unlocker, onStart, onComplete, completing } = props;
  const go = useGo();
  let lead: ReactNode = null;
  let action: ReactNode = null;
  switch (info.state) {
    case "available":
      // the one action and what it pays (the match it adds is in the briefing above)
      lead = <RewardChip size="md" value={xp} />;
      action = (
        <Button data-testid={TID.course.start} icon={<IconArrowForward size={20} />} onClick={onStart}>
          {COURSE_COPY.start}
        </Button>
      );
      break;
    case "started":
      lead = (
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="text-small font-semibold text-fg" data-testid={TID.course.progress} data-value={tickedCount}>
            {progressLine(tickedCount, info.total)}
          </span>
          <LessonSegments className="max-w-28" ticked={tickedCount} total={info.total} />
        </span>
      );
      action = (
        <Button data-testid={TID.course.complete} icon={<IconArrowForward size={20} />} onClick={completing ? undefined : onComplete} pressed={completing}>
          {COURSE_COPY.complete}
        </Button>
      );
      break;
    case "completed":
      lead = (
        <span className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center">
            <Stamp className="scale-75" size="sm" />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-small font-semibold text-fg">{completedOnLine(dayMonth(info.at))}</span>
            <RewardChip className="self-start" size="sm" status="earned" value={xp} />
          </span>
        </span>
      );
      break;
    case "credited":
      return null;
    case "locked":
      lead = (
        <span className="flex min-w-0 items-start gap-1.5 text-small font-semibold text-fg">
          <IconLock className="mt-0.5 shrink-0 text-fg-2" size={18} waypoint="off" />
          <bdi>{lockedLine(lockReasonText(info.lock))}</bdi>
        </span>
      );
      action = unlocker ? (
        <Button data-testid={TID.course.lockedOpen} onClick={() => go(hrefFor({ screen: "course", courseId: unlocker }))} variant="secondary">
          {COURSE_COPY.lockedOpen}
        </Button>
      ) : null;
      break;
  }
  return (
    <div className="sticky bottom-(--shell-bottom) z-raised -mx-gutter mt-auto flex min-h-[4.5rem] items-center justify-between gap-4 border-t border-border bg-surface px-gutter py-3">
      <div className="min-w-0 flex-1">{lead}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
