"use client";
// Owner: learn. The course page `/learn/[id]` (spec 3.11; playbook 3.9): start a course, tick its lessons, complete it,
// and feel the effect. «أكمل الدورة» ticks the remaining lessons in a quick run (`lessons-cascade`, 90 ms apart), then in
// ONE handler: hold `celebration` FIRST (so the overlay queue never sees the news without the hold), completeCourse (the
// one write: XP, star, level, badges), and the celebration opens from the consequence (ARCHITECTURE 11.5). If the store
// refuses, the hold is released. Layout follows the content width: two columns (the content, then the 340 px action
// card, sticky) from 900 px of content; one column with the action pinned to the bottom under that.
// The header is the quest's briefing (docs/GAME-LAYER.md 5.6): its station token (on the path), the title, what it costs
// and, as reward chips, what it pays («تكسب»: +200 XP, the star, +20% مطابقة); started, the lesson meter sits above the
// lessons. The celebration is unchanged.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { LessonMeter, QuestNumber, RewardChip, RewardRow, StateRibbon, starLabel } from "@/components/game";
import { IconArrowBack, IconClock, IconInfo, IconLessons, IconTarget } from "@/components/icons";
import { NavLink, PageTransition, useInstant } from "@/components/motion";
import { buttonStyles, cn, toast } from "@/components/ui";
import { NotFoundBlock, useViewport } from "@/features/shared";
import { COURSE_STATE_LABEL, SAMPLE_COPY, TOAST_COPY, countNoun, hoursText } from "@/lib/copy";
import { getCourse, getJob, getSkill } from "@/lib/data";
import { courseOnPath, courseState, courseXp, nextStep, unlockerCourse } from "@/lib/engine";
import { asCourseId, hrefFor } from "@/lib/routes";
import { useAppStore, useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CourseId, UserState } from "@/lib/types";

import { ActionBar, ActionCard, CreditedCard, type ActionAreaProps } from "./action-area";
import { Ltr, keepLatin } from "./bidi";
import { Celebration, type CompletedCourse } from "./celebration";
import { COURSE_COPY, raisesMatchLine, stageText } from "./copy";
import { LessonList } from "./lessons";
import { NextStepCard } from "./next-step-card";
import { FIELD_ICON, nextCourseOf, questStateOf, ribbonLabelOf } from "./quest";

const CASCADE_STEP_MS = 90;
/** After the last tick: its check draws (240 ms), a beat of rest, then the celebration. */
const CASCADE_TAIL_MS = 340;

export function CourseScreen({ id }: { readonly id: string }): ReactNode {
  const courseId = asCourseId(id);
  const user = useCurrentUser();
  return <PageTransition>{courseId === null ? <NotFoundBlock /> : user === null ? null : <CourseView courseId={courseId} user={user} />}</PageTransition>;
}

/** The content container query in JS: one DOM per layout keeps every test id unique (`@min-[900px]/content`). */
function useContentWide(min = 900): boolean {
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = document.getElementById("app-content");
    if (el === null) return;
    const read = () => setWide(el.clientWidth >= min);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [min]);
  return wide;
}

function CourseView({ courseId, user }: { readonly courseId: CourseId; readonly user: UserState }): ReactNode {
  const course = getCourse(courseId);
  const skill = getSkill(course.skill);
  const instant = useInstant();
  const wide = useContentWide();
  const { desktop } = useViewport();

  const info = useMemo(() => courseState(courseId, user), [courseId, user]);
  const path = useMemo(() => courseOnPath(courseId, user), [courseId, user]);
  const unlocker = useMemo(() => unlockerCourse(courseId, user), [courseId, user]);
  const step = useMemo(() => nextStep(user), [user]);
  const xp = courseXp(course);

  const [cascade, setCascade] = useState<readonly number[]>([]);
  const [completing, setCompleting] = useState(false);
  const [celebration, setCelebration] = useState<CompletedCourse | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => {
      for (const t of list) window.clearTimeout(t);
    };
  }, []);

  const ticked = useMemo(() => {
    if (info.state === "completed") return new Set(course.lessons.map((_, i) => i + 1));
    if (info.state === "started") return new Set([...info.ticked, ...cascade]);
    return new Set<number>();
  }, [info, cascade, course.lessons]);

  const start = () => {
    const result = useAppStore.getState().startCourse(courseId);
    if (result.ok && !result.already) toast({ title: TOAST_COPY.courseStarted, tone: "ok" });
  };

  const finish = () => {
    useUi.getState().hold("celebration"); // FIRST: the overlay queue must never see this course's news without the hold
    const result = useAppStore.getState().completeCourse(courseId);
    if (!result.ok) {
      useUi.getState().release("celebration");
      setCompleting(false);
      setCascade([]);
      return;
    }
    setCelebration(result);
  };

  const complete = () => {
    if (completing || info.state !== "started") return;
    // nothing shows over the celebration: a note still on screen (the «بدأت الدورة» toast) leaves NOW, with the press,
    // so its 150 ms fade is over while the lessons tick and the board never shares a frame with it (closed only when the
    // board mounted, 700 ms later, it was still fading over the board's header). The board closes any toast again.
    toast.close();
    setCompleting(true);
    const remaining = course.lessons.map((_, i) => i + 1).filter((n) => !info.ticked.includes(n));
    if (instant || remaining.length === 0) {
      finish();
      return;
    }
    remaining.forEach((n, i) => {
      timers.current.push(window.setTimeout(() => setCascade((list) => [...list, n]), i * CASCADE_STEP_MS));
    });
    timers.current.push(window.setTimeout(finish, (remaining.length - 1) * CASCADE_STEP_MS + CASCADE_TAIL_MS));
  };

  const toggle = (n: number, on: boolean) => {
    if (completing) return;
    useAppStore.getState().tickLesson(courseId, n, on);
  };

  const area: ActionAreaProps = {
    course,
    info,
    xp,
    path,
    tickedCount: ticked.size,
    unlocker,
    onStart: start,
    onComplete: complete,
    completing,
  };
  const raises = path !== null && !path.prep && path.gain > 0 && (info.state === "available" || info.state === "started" || info.state === "locked");
  const quest = questStateOf(info, nextCourseOf(step) === courseId);
  const FieldIcon = FIELD_ICON[skill.field];
  const skillName = /^[\x20-\x7e]+$/.test(skill.name) ? <bdi dir="ltr">{skill.name}</bdi> : skill.name;
  const rewardStatus = info.state === "completed" ? "earned" : info.state === "locked" ? "locked" : "offer";

  const header = (
    <header className="flex flex-col gap-5">
      <NavLink className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "self-start")} data-testid={TID.course.back} href={hrefFor({ screen: "learn" })}>
        <IconArrowBack size={18} />
        {COURSE_COPY.back}
      </NavLink>
      {/* the briefing: the quest's state, its token and title, then what it costs and what it pays */}
      <div className="flex flex-col items-start gap-4">
        <span className="inline-flex" data-state={info.state} data-testid={TID.course.state}>
          <StateRibbon size="md" state={quest} tone={info.state === "credited" ? "quiet" : undefined}>
            {info.state === "credited" ? COURSE_STATE_LABEL.credited : ribbonLabelOf(info)}
          </StateRibbon>
        </span>
        <div className="flex items-start gap-4">
          {path !== null ? (
            <QuestNumber className="mt-1 size-12 text-h3" n={path.stageN} state={quest} />
          ) : (
            <span
              className={cn(
                "mt-1 inline-grid size-12 shrink-0 place-items-center rounded-control border-2 wp-quiet",
                quest === "locked" ? "border-dashed border-border-strong text-fg-2" : quest === "done" ? "border-[1.5px] border-border-strong text-fg-2" : "border-fg text-fg",
              )}
            >
              <FieldIcon size={24} waypoint="off" />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex flex-wrap items-center gap-x-1.5 text-small font-medium text-fg-2">
              {/* «Power BI · النجمة 1 · المرحلة 7», drawn as the quest cards draw it */}
              <span>{skillName}</span>
              <span aria-hidden>·</span>
              <span>{starLabel(course.star)}</span>
              {path !== null ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{stageText(path.stageN)}</span>
                </>
              ) : null}
            </p>
            <h1 className="text-h2 text-balance text-fg @min-[900px]/content:text-h1" data-testid={TID.course.title}>
              {keepLatin(course.title)}
            </h1>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-body text-fg-2">
          <span className="inline-flex items-center gap-2">
            <IconClock className="shrink-0 text-fg-3" size={20} waypoint="off" />
            {hoursText(course.hours)}
          </span>
          <span className="inline-flex items-center gap-2">
            <IconLessons className="shrink-0 text-fg-3" size={20} waypoint="off" />
            {countNoun(course.lessons.length, "lesson")}
          </span>
        </p>
        {info.state === "credited" ? null : (
          <RewardRow label={info.state === "completed" ? "كسبت" : "تكسب"}>
            <RewardChip status={rewardStatus} value={xp} />
            <RewardChip kind="star" label={<>في {skillName}</>} status={info.state === "completed" ? "earned" : rewardStatus} value={course.star} />
            {raises ? <RewardChip kind="match" status={rewardStatus} value={path.gain} /> : null}
          </RewardRow>
        )}
        {raises ? (
          <p className="flex items-start gap-2 text-body font-medium text-fg">
            <IconTarget className="mt-[0.3rem] shrink-0 text-fg-3" size={20} waypoint="muted" />
            <span>
              <Ltr text={raisesMatchLine(getJob(path.jobId).title, path.matchNow, path.matchAfter)} />
            </span>
          </p>
        ) : null}
      </div>
      <p className="flex items-start gap-2 text-small text-fg-3">
        <IconInfo className="mt-[0.2rem] shrink-0" size={18} waypoint="muted" />
        <span>{SAMPLE_COPY.coursePage}</span>
      </p>
    </header>
  );

  const about = (
    <section aria-labelledby="course-about" className="flex flex-col gap-3">
      <h2 className="text-h2 text-fg" id="course-about">
        {COURSE_COPY.about}
      </h2>
      <p className="max-w-2xl text-body text-fg-2">{keepLatin(course.description)}</p>
    </section>
  );

  const lessons = (
    <section aria-labelledby="course-lessons" className="flex flex-col gap-3">
      <h2 className="text-h2 text-fg" id="course-lessons">
        {COURSE_COPY.lessons}
      </h2>
      {info.state === "started" ? <LessonMeter done={ticked.size} total={course.lessons.length} /> : null}
      <LessonList interactive={info.state === "started"} lessons={course.lessons} onToggle={toggle} ticked={ticked} />
    </section>
  );

  const nextCard = info.state === "completed" ? <NextStepCard step={step} /> : null;

  return (
    <>
      {wide ? (
        <main className="mx-auto grid w-full max-w-[72rem] grid-cols-[minmax(0,1fr)_21.25rem] items-start gap-x-12 gap-y-10 px-gutter pt-6 pb-16">
          <div className="flex min-w-0 flex-col gap-10">
            {header}
            {about}
            {lessons}
          </div>
          <aside className="sticky top-[calc(var(--shell-top)+1.5rem)] flex flex-col gap-6 pt-16">
            <ActionCard {...area} />
            {nextCard}
          </aside>
        </main>
      ) : (
        <main className={cn("mx-auto flex w-full max-w-[72rem] flex-col gap-8 px-gutter pt-5", !desktop && "min-h-[calc(100dvh-var(--shell-top,4rem)-var(--shell-bottom,0px))]")}>
          {header}
          {/* a narrow content column on a desktop: the card sits in the flow (a bar pinned to the bottom would run under
              the advisor launcher in the bottom corner); on a phone the action is pinned above the tab bar */}
          {desktop ? (
            <div className="w-full max-w-[26rem]">
              <ActionCard {...area} />
            </div>
          ) : info.state === "credited" ? (
            <CreditedCard info={info} />
          ) : null}
          {nextCard ? <div className={cn(desktop && "w-full max-w-[26rem]")}>{nextCard}</div> : null}
          {about}
          {lessons}
          {desktop ? <div className="h-6" /> : (
            <>
              <div className="h-2" />
              <ActionBar {...area} />
            </>
          )}
        </main>
      )}
      {celebration ? <Celebration result={celebration} /> : null}
    </>
  );
}
