"use client";
// Owner: map. The station card: the stage sheet of spec 3.4 (`path-stage-sheet`), drawn as the approved page draws it. On
// a wide sheet it is a card on the map beside the station the camera flew to; on a phone it is a bottom sheet above the
// tab bar. It shows the real stage: its course, the skill and the star it raises, hours, lessons, XP, the match before
// and after, and the user's progress there, with the one action the spec gives that state («ابدأ الدورة» starts the
// course and opens it; «أكمل الدورة» and «افتح الدورة» only open it). Its arrival and departure are choreography.ts's.
import type { ReactNode, Ref } from "react";

import { IconArrowForward, IconClock, IconClose, IconLessons, IconLock } from "@/components/icons";
import { Button, IconButton, SampleTag, SkillStars, Stamp, XpValue } from "@/components/ui";
import { COURSE_STATE_LABEL, STAGE_STATE_LABEL, companyCityLine, countNoun, hoursText, lockReasonText } from "@/lib/copy";
import { getCourse, getJob, getSkill } from "@/lib/data";
import { shortTitle } from "@/lib/engine";
import { formatNumber, formatPercent } from "@/lib/format";
import { TID } from "@/lib/testids";
import type { CourseStateInfo, Roadmap, RoadmapStage, StarMap } from "@/lib/types";

import { FLIGHT } from "./camera";
import { stageStarsHeld } from "./map-sheet";

export type CardSubject = { readonly kind: "stage"; readonly stage: RoadmapStage; readonly course: CourseStateInfo } | { readonly kind: "summit" };

export interface StationCardProps {
  readonly subject: CardSubject;
  readonly roadmap: Roadmap;
  /** The stars the user holds in every skill (a solid star is an earned one). */
  readonly stars: StarMap;
  /** The landing of the «تمّ» stamp follows the flight; false when the card opens in place. */
  readonly animate: boolean;
  /** A hop from another station: the card is already there, so the stamp lands sooner. */
  readonly hop: boolean;
  readonly titleId: string;
  readonly ref?: Ref<HTMLDivElement>;
  readonly onClose: () => void;
  /** The stage's button, whatever its label. `start` is true only for «ابدأ الدورة». */
  readonly onCourse: (stage: RoadmapStage, start: boolean) => void;
  readonly onJob: () => void;
}

function MatchBar({ before, after, state }: { readonly before: number; readonly after: number; readonly state: string }) {
  return (
    <div aria-hidden className="dm-mbar" data-state={state}>
      <i className="dm-pv" style={{ width: `${before}%` }} />
      <i className="dm-th" style={{ width: `${Math.max(0, after - before)}%` }} />
    </div>
  );
}

function Pips({ total, on }: { readonly total: number; readonly on: number }) {
  return (
    <div aria-hidden className="dm-les">
      {Array.from({ length: total }, (_, i) => (
        <i data-on={i < on ? "" : undefined} key={i} />
      ))}
    </div>
  );
}

function CloseButton({ onClose }: { readonly onClose: () => void }) {
  return <IconButton className="dm-x" data-testid={TID.path.stageSheetClose} icon={<IconClose size={20} waypoint="off" />} label="إغلاق" onClick={onClose} size="sm" />;
}

function StageCard({ stage, course, roadmap, stars, animate, hop, titleId, onClose, onCourse }: Omit<StationCardProps, "subject" | "ref" | "onJob"> & { readonly stage: RoadmapStage; readonly course: CourseStateInfo }) {
  const skill = getSkill(stage.skill);
  const courseData = getCourse(stage.courseId);
  // rows and sentences use the short title; the full title is the course page's heading (spec «How to read»)
  const short = shortTitle(courseData);
  const lessons = courseData.lessons.length;
  const done = stage.state === "done";
  const before = done ? stage.matchAt - stage.gain : roadmap.match;
  const after = done ? stage.matchAt : stage.matchAfter;
  const ticked = course.state === "started" ? course.ticked.length : course.state === "completed" ? lessons : 0;
  const stampDelay = animate ? (hop ? 0.5 : (FLIGHT.barAt + 60) / 1000) : 0;

  const courseBlock = (
    <div className="dm-blk dm-fi">
      {/* spec 3.4 rows: «الدورة: أساسيات Power BI» · «المدة: 10 ساعات» · «النقاط: +200 XP» */}
      {done && stage.doneBy?.kind !== "course" ? (
        <>
          <span className="dm-k">الدورة المقابلة · {COURSE_STATE_LABEL.credited}</span>
          <b>
            <bdi>{short}</bdi>
          </b>
        </>
      ) : (
        <p className="dm-crs">
          <span className="dm-k">الدورة:</span>
          <b>
            <bdi>{short}</bdi>
          </b>
        </p>
      )}
      <div className="dm-stats">
        <span>
          <IconClock size={18} waypoint="off" />
          <span className="dm-k">المدة:</span>
          {hoursText(stage.hours)}
        </span>
        <span>
          <IconLessons size={18} waypoint="off" />
          {countNoun(lessons, "lesson")}
        </span>
        {done && stage.doneBy?.kind !== "course" ? null : (
          <span>
            <span className="dm-k">النقاط:</span>
            <XpValue gain size="sm" value={stage.xp} />
          </span>
        )}
      </div>
    </div>
  );

  const matchBlock = stage.prep ? (
    <div className="dm-blk dm-fi">
      <p className="dm-note" style={{ marginTop: 0 }}>
        تمهيدية: لا ترفع المطابقة، لكنها تفتح المهارة التالية.
      </p>
    </div>
  ) : (
    <div className="dm-blk dm-fi">
      <div className="dm-row">
        <span className="dm-k">أثرها على المطابقة</span>
        <b className="dm-up" dir="ltr">
          +{formatPercent(stage.gain)}
        </b>
      </div>
      <MatchBar after={after} before={before} state={stage.state} />
      <div className="dm-row dm-rsub">
        <span>
          {done ? "قبلها" : "الآن"} <bdi dir="ltr">{formatPercent(before)}</bdi>
        </span>
        <span>
          بعدها{" "}
          <b>
            <bdi dir="ltr">{formatPercent(after)}</bdi>
          </b>
        </span>
      </div>
    </div>
  );

  let progress: ReactNode;
  let action: ReactNode = null;
  if (done) {
    progress = (
      <div className="dm-blk dm-ev dm-fi">
        {stage.doneBy?.kind === "cv" ? (
          <>
            <span className="dm-k">أثبتتها سيرتك:</span>
            <q>«{stage.doneBy.evidence}»</q>
          </>
        ) : stage.doneBy?.kind === "course" ? (
          <>
            <span className="dm-k">تقدّمك</span>
            <q>
              أكملتها بدورة «<bdi>{shortTitle(getCourse(stage.doneBy.courseId))}</bdi>».
            </q>
          </>
        ) : (
          <>
            <span className="dm-k">تقدّمك</span>
            <q>{STAGE_STATE_LABEL.done}</q>
          </>
        )}
        <Stamp className="dm-stamp" delay={stampDelay} play={animate} size="sm" />
      </div>
    );
    if (stage.doneBy?.kind === "course") {
      action = (
        <Button className="dm-go dm-fi" data-testid={TID.path.stageStart} icon={<IconArrowForward size={20} />} onClick={() => onCourse(stage, false)} variant="secondary">
          افتح الدورة
        </Button>
      );
    }
  } else if (stage.state === "locked") {
    progress = (
      <div className="dm-blk dm-lockb dm-fi">
        <IconLock className="mt-0.5 text-ink-2" size={22} waypoint="off" />
        <b>
          {STAGE_STATE_LABEL.locked}
          {stage.lock !== null ? `: ${lockReasonText(stage.lock)}` : ""}
        </b>
      </div>
    );
  } else {
    const started = course.state === "started";
    progress = (
      <div className="dm-blk dm-fi">
        <div className="dm-row">
          <span className="dm-k">تقدّمك</span>
          <b>
            {started ? COURSE_STATE_LABEL.started : "لم تبدأ بعد"}
            <i className="dm-sep" />
            <span>
              {formatNumber(ticked)} من {countNoun(lessons, "lesson")}
            </span>
          </b>
        </div>
        <Pips on={ticked} total={lessons} />
      </div>
    );
    const current = stage.state === "current";
    action = current ? (
      <Button className="dm-go dm-fi" data-testid={TID.path.stageStart} icon={<IconArrowForward size={20} />} onClick={() => onCourse(stage, !started)}>
        {started ? "أكمل الدورة" : "ابدأ الدورة"}
      </Button>
    ) : (
      <Button className="dm-go dm-fi" data-testid={TID.path.stageStart} icon={<IconArrowForward size={20} />} onClick={() => onCourse(stage, false)} variant="secondary">
        افتح الدورة
      </Button>
    );
  }

  return (
    <>
      <header className="dm-fi">
        <div className="dm-eye">
          <i className="dm-dot" />
          <b>{STAGE_STATE_LABEL[stage.state]}</b>
          <i className="dm-sep" />
          <span>
            {formatNumber(stage.n)} من {countNoun(roadmap.total, "stage")}
          </span>
          {stage.prep ? (
            <>
              <i className="dm-sep" />
              <span>تمهيدية</span>
            </>
          ) : null}
        </div>
        {/* spec 3.4: the title «المرحلة 7: Power BI» (the number is the station's and the test id's) */}
        <h3 id={titleId}>
          <span className="dm-pre">المرحلة {formatNumber(stage.n)}:</span>
          <span className="dm-ttl">
            <bdi>{skill.name}</bdi>
            <SkillStars size="md" slots={stage.star} value={stageStarsHeld(stage, stars)} />
          </span>
        </h3>
        <p>
          {done ? "النجمة" : "ترفع مهارتك إلى النجمة"} {formatNumber(stage.star)} من {formatNumber(skill.maxStars)} في <bdi>{skill.name}</bdi>
        </p>
        <CloseButton onClose={onClose} />
      </header>
      {done ? (
        <>
          {progress}
          {courseBlock}
          {matchBlock}
        </>
      ) : (
        <>
          {courseBlock}
          {matchBlock}
          {progress}
        </>
      )}
      {action}
    </>
  );
}

function SummitCard({ roadmap, titleId, onClose, onJob }: Pick<StationCardProps, "roadmap" | "titleId" | "onClose" | "onJob">) {
  const job = getJob(roadmap.jobId);
  return (
    <>
      <header className="dm-fi">
        <div className="dm-eye">
          <i className="dm-dot" />
          <span>القمة</span>
          <i className="dm-sep" />
          <b>نهاية المسار</b>
        </div>
        <h3 id={titleId}>جاهز للوظيفة</h3>
        <CloseButton onClose={onClose} />
      </header>
      <div className="dm-blk dm-fi">
        <span className="dm-k">هدفك</span>
        <b>{job.title}</b>
        <span className="dm-sub flex flex-wrap items-center gap-2">
          {companyCityLine(roadmap.jobId)}
          <SampleTag kind="company" />
        </span>
      </div>
      <div className="dm-blk dm-fi">
        <div className="dm-row">
          <span className="dm-k">مطابقتك</span>
          <b>
            <bdi dir="ltr">{formatPercent(roadmap.match)}</bdi> من <bdi dir="ltr">{formatPercent(100)}</bdi>
          </b>
        </div>
        <MatchBar after={100} before={roadmap.match} state="summit" />
      </div>
      <div className="dm-blk dm-fi">
        <div className="dm-row">
          <span className="dm-k">تقدّمك</span>
          <b>
            <span>
              {formatNumber(roadmap.doneCount)} من {countNoun(roadmap.total, "stage")}
            </span>
            {roadmap.complete ? null : (
              <>
                <i className="dm-sep" />
                <span>بقي {hoursText(roadmap.hoursLeft)}</span>
              </>
            )}
          </b>
        </div>
        <Pips on={roadmap.doneCount} total={roadmap.total} />
      </div>
      <Button className="dm-go dm-fi" icon={<IconArrowForward size={20} />} onClick={onJob} variant="secondary">
        عرض الوظيفة
      </Button>
    </>
  );
}

/** The card element itself (one node for every station, so a hop keeps it in place and only its content changes). */
export function StationCard({ subject, roadmap, stars, animate, hop, titleId, ref, onClose, onCourse, onJob }: StationCardProps) {
  const stage = subject.kind === "stage" ? subject.stage : null;
  return (
    <div
      aria-labelledby={titleId}
      aria-modal="false"
      className="dm-card"
      data-kind={subject.kind}
      data-state={stage !== null ? stage.state : "summit"}
      data-testid={stage !== null ? TID.path.stageSheet : undefined}
      onClick={(event) => event.stopPropagation()}
      ref={ref}
      role="dialog"
      tabIndex={-1}
    >
      {subject.kind === "stage" ? (
        <StageCard animate={animate} course={subject.course} hop={hop} key={subject.stage.n} onClose={onClose} onCourse={onCourse} roadmap={roadmap} stage={subject.stage} stars={stars} titleId={titleId} />
      ) : (
        <SummitCard key="summit" onClose={onClose} onJob={onJob} roadmap={roadmap} titleId={titleId} />
      )}
    </div>
  );
}
