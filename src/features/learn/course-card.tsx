"use client";
// Owner: learn. One course of the catalogue (spec 3.10) as a quest (docs/GAME-LAYER.md 5.5): what you do (the title, the
// skill and the star it grants), what it costs (hours, lessons), what you get (its XP, the star, «+20% مطابقة» for a
// path course still ahead, or «تمهيدية»), and where it stands (the five game states, the ribbon in the spec's words).
// On the path tab the station token carries the stage number of the map; off it, the field emblem. The whole card is the
// link (NavLink, so the route transition plays); it sinks onto its plinth when pressed. `data-state` keeps the
// catalogue's word (available, started, completed, credited, locked) that QA reads.
import type { ReactNode } from "react";

import { QuestCard } from "@/components/game";
import { cn } from "@/components/ui";
import { lockReasonText } from "@/lib/copy";
import { getSkill } from "@/lib/data";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { Course, CoursePathInfo, CourseStateInfo } from "@/lib/types";

import { keepLatin } from "./bidi";
import { matchGainText } from "./copy";
import { FIELD_ICON, QuestLink, questNoteOf, questStateOf, ribbonLabelOf } from "./quest";

export interface CourseCardModel {
  readonly course: Course;
  readonly info: CourseStateInfo;
  readonly xp: number;
  readonly path: CoursePathInfo | null;
  /** The next step's course (spec 2.8): the one `next` quest of the screen (the accent key, the coral ribbon). */
  readonly next: boolean;
  /** The path stage is not done yet (only then «+20% مطابقة» / «تمهيدية» is shown). */
  readonly ahead: boolean;
}

export function CourseCard({ model, labelBy }: { readonly model: CourseCardModel; readonly labelBy: "stage" | "field" }): ReactNode {
  const { course, info, xp, path, next, ahead } = model;
  const skill = getSkill(course.skill);
  const Icon = FIELD_ICON[skill.field];
  const station = labelBy === "stage" && path !== null ? path.stageN : undefined;
  return (
    <QuestCard
      className="h-full"
      credited={info.state === "credited"}
      data-state={info.state}
      hours={course.hours}
      icon={station === undefined ? <Icon size={20} waypoint="off" /> : undefined}
      lessons={course.lessons.length}
      lockedReason={info.state === "locked" ? <bdi>{lockReasonText(info.lock)}</bdi> : undefined}
      matchGain={path && ahead && !path.prep ? path.gain : undefined}
      note={questNoteOf(info, true)}
      preparatory={path !== null && ahead && path.prep}
      progress={info.state === "started" ? info.ticked.length : undefined}
      render={<QuestLink href={hrefFor({ screen: "course", courseId: course.id })} />}
      ribbonLabel={ribbonLabelOf(info)}
      skill={skill.name}
      stageNumber={station}
      star={course.star}
      state={questStateOf(info, next)}
      testId={TID.learn.card(course.id)}
      title={keepLatin(course.title)}
      xp={xp}
    />
  );
}

/** «+20% مطابقة», with the signed number isolated left to right (DESIGN 2.3: the sign must not jump). */
export function MatchGain({ gain, className }: { readonly gain: number; readonly className?: string }): ReactNode {
  const [amount, ...rest] = matchGainText(gain).split(" ");
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-semibold text-fg", className)}>
      <bdi className="tabular-nums" dir="ltr">
        {amount}
      </bdi>
      <span>{rest.join(" ")}</span>
    </span>
  );
}
