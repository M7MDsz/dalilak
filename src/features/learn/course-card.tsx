"use client";
// Owner: learn. One learning step of «دليل التعلّم» as a quest (docs/GAME-LAYER.md 5.5): the skill and the star it grants,
// where to learn it (the guide's pick: the top pick, or the first option that fits the filters, with its platform and
// facts), what you get (its XP, the star, «+20% مطابقة» for a path step still ahead, or «تمهيدية»), why the next one is
// next, and where it stands (the five game states). No made-up hours or lessons: only the real course's facts.
// On the path tab the station token carries the stage number of the map; off it, the field emblem. The whole card is the
// link (NavLink, so the route transition plays); it sinks onto its plinth when pressed. `data-state` keeps the
// catalogue's word (available, started, completed, credited, locked) that QA reads.
import type { ReactNode } from "react";

import { QuestCard } from "@/components/game";
import { cn } from "@/components/ui";
import { lockReasonText } from "@/lib/copy";
import { getGuide, getSkill, officialCertOf, type GuideCourse } from "@/lib/data";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { Course, CoursePathInfo, CourseStateInfo } from "@/lib/types";

import { certChipText, matchGainText } from "./copy";
import { platformOf } from "./guide-parts";
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
  /** Where to learn it (the top pick, or the option that fits the filters). */
  readonly pick: GuideCourse;
  /** The next step's reason («تقفل أكبر جزء من فجوتك مع «محلل بيانات»»), or null. */
  readonly why: string | null;
}

const LANG = { ar: "عربي", en: "English" } as const;
const PRICE = { free: "مجاني", paid: "مدفوع", free_to_audit: "مجاني للحضور" } as const;

/** «Microsoft Learn · عربي · مجاني», each part isolated so the line reads right to left. */
function pickFacts(pick: GuideCourse): ReactNode {
  const parts = [platformOf(pick), LANG[pick.lang], ...(pick.price !== null ? [PRICE[pick.price]] : [])];
  return parts.map((part, i) => (
    <span key={part}>
      {i > 0 ? " · " : null}
      <bdi>{part}</bdi>
    </span>
  ));
}

export function CourseCard({ model, labelBy }: { readonly model: CourseCardModel; readonly labelBy: "stage" | "field" }): ReactNode {
  const { course, info, xp, path, next, ahead, pick, why } = model;
  const doneNote = questNoteOf(info, true);
  const skill = getSkill(course.skill);
  const Icon = FIELD_ICON[skill.field];
  const cert = officialCertOf(getGuide(course.skill));
  const station = labelBy === "stage" && path !== null ? path.stageN : undefined;
  return (
    <QuestCard
      className="h-full"
      credited={info.state === "credited"}
      data-state={info.state}
      icon={station === undefined ? <Icon size={20} waypoint="off" /> : undefined}
      lockedReason={info.state === "locked" ? <bdi>{lockReasonText(info.lock)}</bdi> : undefined}
      matchGain={path && ahead && !path.prep ? path.gain : undefined}
      note={
        doneNote ?? (
          <span className="flex flex-col gap-1">
            {why ? <span className="font-semibold text-fg">{why}</span> : null}
            <span>
              ابدأ بهذا على {pickFacts(pick)}
            </span>
            {cert ? (
              <span className="inline-flex h-6 max-w-full items-center self-start truncate rounded-full border border-border px-2 text-small font-medium text-fg-2" data-testid="learn-card-cert">
                <bdi>{certChipText(cert.short)}</bdi>
              </span>
            ) : null}
          </span>
        )
      }
      preparatory={path !== null && ahead && path.prep}
      render={<QuestLink href={hrefFor({ screen: "course", courseId: course.id })} />}
      ribbonLabel={ribbonLabelOf(info)}
      skill={skill.name}
      stageNumber={station}
      star={course.star}
      state={questStateOf(info, next)}
      testId={TID.learn.card(course.id)}
      title={
        <span className="line-clamp-2">
          <bdi>{pick.title}</bdi>
        </span>
      }
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
