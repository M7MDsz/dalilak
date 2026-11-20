"use client";
// Owner: learn. The guide page `/learn/[id]`: the learning guide of the step's skill, laid out as a three-step plan so
// the user never hesitates: ① «تعلّم» (the top pick, a real course that opens in a new tab) → ② «طبّق» (the proof task
// with its dataset; skipped when the guide has none) → ③ «خلّصتها». Internally the step is still a Course (the game runs
// on it): ①/② tick lessons 1 and 2 of the started course (progress only, no XP), and «خلّصتها» runs the course's
// completion EXACTLY as before: hold `celebration` FIRST, completeCourse (the one write: XP, star, level, badges), then the
// celebration opens from the consequence; if the store refuses, the hold is released. «خلّصتها» is always on the page
// (self-reported: a user who already learned the skill elsewhere presses it at once); it is the primary only when it is
// the current step. One primary per screen: the current step's action. On a phone that action is pinned above the tab bar.
// People («مين تتابع») and articles («وش تقرأ») sit in a quieter column beside the plan (below it on narrow screens).
import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import { RewardChip, StateRibbon } from "@/components/game";
import { IconArrowForward, IconChevronForward, IconEvidence, IconExternal, IconInfo, IconLock } from "@/components/icons";
import { NavLink, PageTransition, useGo } from "@/components/motion";
import { Button, SkillStars, Stamp, TextField, buttonStyles, cn, toast } from "@/components/ui";
import { NotFoundBlock, useViewport } from "@/features/shared";
import { COURSE_STATE_LABEL, SAMPLE_COPY, TOAST_COPY, dayMonth, guideTitle, lockReasonText } from "@/lib/copy";
import { getCourse, getGuide, getJob, getSkill, type Guide } from "@/lib/data";
import { buildRoadmap, courseOnPath, courseState, courseXp, nextStep, unlockerCourse } from "@/lib/engine";
import { asCourseId, hrefFor } from "@/lib/routes";
import { useAppStore, useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CourseId, CourseStateInfo, UserState } from "@/lib/types";

import { Ltr } from "./bidi";
import { Celebration, type CompletedCourse } from "./celebration";
import {
  COURSE_COPY,
  completedOnLine,
  finishGetsLine,
  fromCourseLine,
  learnOnLine,
  lockedLine,
  openDatasetLine,
  pathToLine,
  raisesMatchLine,
  starOrdinal,
  stepOfLine,
} from "./copy";
import { ArticleList, CertificateCard, OtherOptions, OutLink, PeopleList, PlanCard, PlanStepper, TopPickCard, platformOf, type PlanStepId, type PlanStepState } from "./guide-parts";
import { NextStepCard } from "./next-step-card";
import { nextCourseOf, questStateOf } from "./quest";

export function CourseScreen({ id }: { readonly id: string }): ReactNode {
  const courseId = asCourseId(id);
  const user = useCurrentUser();
  return <PageTransition>{courseId === null ? <NotFoundBlock /> : user === null ? null : <GuideView courseId={courseId} user={user} />}</PageTransition>;
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

/** Where the user stands in the plan: each step's state and the current one (null when locked or finished). */
function planOf(info: CourseStateInfo, guide: Guide): { readonly steps: readonly { readonly id: PlanStepId; readonly state: PlanStepState }[]; readonly current: PlanStepId | null } {
  const ids: PlanStepId[] = guide.proof ? ["learn", "apply", "finish"] : ["learn", "finish"];
  const doneSet = new Set<PlanStepId>();
  if (info.state === "completed" || info.state === "credited") ids.forEach((s) => doneSet.add(s));
  if (info.state === "started") {
    if (info.ticked.includes(1)) doneSet.add("learn");
    if (guide.proof && info.ticked.includes(2)) doneSet.add("apply");
  }
  const current = info.state === "locked" ? null : (ids.find((s) => !doneSet.has(s)) ?? null);
  return { steps: ids.map((id) => ({ id, state: doneSet.has(id) ? "done" : id === current ? "current" : "upcoming" })), current };
}

const latin = (name: string) => /^[\x20-\x7e]+$/.test(name);

function GuideView({ courseId, user }: { readonly courseId: CourseId; readonly user: UserState }): ReactNode {
  const course = getCourse(courseId);
  const skill = getSkill(course.skill);
  const guide = getGuide(course.skill);
  const wide = useContentWide();
  const { desktop } = useViewport();
  const go = useGo();

  const info = useMemo(() => courseState(courseId, user), [courseId, user]);
  const path = useMemo(() => courseOnPath(courseId, user), [courseId, user]);
  const unlocker = useMemo(() => unlockerCourse(courseId, user), [courseId, user]);
  const step = useMemo(() => nextStep(user), [user]);
  const roadmapTotal = useMemo(() => buildRoadmap(user)?.total ?? null, [user]);
  const xp = courseXp(course);
  const certSaved = user.courses[courseId]?.certificateUrl ?? "";

  const [completing, setCompleting] = useState(false);
  const [celebration, setCelebration] = useState<CompletedCourse | null>(null);
  const [cert, setCert] = useState(certSaved);

  const plan = planOf(info, guide);
  const bar = !desktop; // a phone: the current step's action is pinned above the tab bar
  const isNext = nextCourseOf(step) === courseId;
  const skillName = latin(skill.name) ? <bdi dir="ltr">{skill.name}</bdi> : skill.name;
  const platform = platformOf(guide.topPick);
  const open = info.state === "available" || info.state === "started";

  /** «ابدأ» a step that is not started yet (the first press on the guide: open the course, tick a step, or finish). */
  const ensureStarted = (quiet: boolean): boolean => {
    const now = courseState(courseId, useAppStore.getState().users[user.id] ?? user);
    if (now.state === "started") return true;
    if (now.state !== "available") return false;
    const result = useAppStore.getState().startCourse(courseId);
    if (result.ok && !result.already && !quiet) toast({ title: TOAST_COPY.courseStarted, tone: "ok" });
    return result.ok;
  };

  const tick = (n: 1 | 2, on: boolean) => {
    if (completing) return;
    if (on && !ensureStarted(true)) return;
    useAppStore.getState().tickLesson(courseId, n, on);
  };

  const complete = () => {
    if (completing || !open) return;
    if (!ensureStarted(true)) return;
    const link = cert.trim();
    if (link !== "") useAppStore.getState().setCertificate(courseId, link);
    // nothing shows over the celebration: a note still on screen leaves NOW, with the press
    toast.close();
    setCompleting(true);
    useUi.getState().hold("celebration"); // FIRST: the overlay queue must never see this course's news without the hold
    const result = useAppStore.getState().completeCourse(courseId);
    if (!result.ok) {
      useUi.getState().release("celebration");
      setCompleting(false);
      return;
    }
    setCelebration(result);
  };

  // ── the actions, each built once (a phone pins the current one to the bottom bar instead of its card) ───────────
  const learnPhase = info.state === "available" ? "start" : plan.current === "learn" ? "continue" : "open";
  const learnButton = (primary: boolean) => (
    <OutLink
      className={buttonStyles({ variant: primary ? "primary" : "secondary", size: primary && !bar ? "lg" : "md", className: "group/button max-w-full" })}
      href={guide.topPick.url}
      onClick={() => ensureStarted(false)}
      testId={info.state === "available" ? TID.course.start : "course-open-pick"}
    >
      <span className="min-w-0 truncate py-1">
        {learnOnLine(platform, learnPhase)}
      </span>
      <IconExternal size={20} waypoint="off" />
    </OutLink>
  );
  const datasetButton = (primary: boolean) =>
    guide.proof?.dataset ? (
      <OutLink className={buttonStyles({ variant: primary ? "primary" : "secondary", size: "md", className: "group/button max-w-full" })} href={guide.proof.dataset.url} onClick={() => ensureStarted(true)}>
        <span className="min-w-0 truncate py-1">{openDatasetLine()}</span>
        <IconExternal size={20} waypoint="off" />
      </OutLink>
    ) : null;
  const finishButton = (primary: boolean) => (
    <Button
      className={cn(!bar && "self-start")}
      data-testid={TID.course.complete}
      icon={<IconArrowForward size={20} />}
      onClick={completing ? undefined : complete}
      pressed={completing}
      size={primary && !bar ? "lg" : "md"}
      variant={primary ? "primary" : "secondary"}
    >
      {COURSE_COPY.complete}
    </Button>
  );
  const nextLink = (label: string, onClick: () => void) => (
    <Button className="self-start" onClick={onClick} size="sm" variant="ghost">
      {label}
    </Button>
  );

  // ── header: breadcrumb, state, title with the star, the one line «ليش ذي الخطوة» ─────────────────────────────
  const whyLine: ReactNode =
    info.state === "credited" ? null : path !== null && path.prep ? (
      <span>{`تمهيدية: تفتح لك ${getSkill(path.prepares ?? course.skill).name} في مسارك`}</span>
    ) : path !== null && path.gain > 0 && open ? (
      <Ltr text={raisesMatchLine(getJob(path.jobId).title, path.matchNow, path.matchAfter)} />
    ) : info.state === "completed" ? (
      <span>{completedOnLine(dayMonth(info.at))}</span>
    ) : (
      <span>{skill.description}</span>
    );

  const header = (
    <header className="flex flex-col gap-3">
      <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-small text-fg-2">
        <NavLink className="font-medium text-fg underline decoration-border-strong decoration-dotted underline-offset-4 hover:decoration-fg" data-testid={TID.course.back} href={hrefFor({ screen: "learn" })}>
          {COURSE_COPY.back}
        </NavLink>
        {path !== null ? (
          <>
            <IconChevronForward className="text-fg-3" size={14} waypoint="off" />
            <span>{pathToLine(getJob(path.jobId).title)}</span>
            {roadmapTotal !== null ? (
              <>
                <IconChevronForward className="text-fg-3" size={14} waypoint="off" />
                <span>{stepOfLine(path.stageN, roadmapTotal)}</span>
              </>
            ) : null}
          </>
        ) : null}
        <span className="ms-2 inline-flex" data-state={info.state} data-testid={TID.course.state}>
          <StateRibbon size="sm" state={questStateOf(info, isNext)} tone={info.state === "credited" ? "quiet" : undefined}>
            {info.state === "started" ? COURSE_STATE_LABEL.started : info.state === "credited" ? COURSE_STATE_LABEL.credited : undefined}
          </StateRibbon>
        </span>
      </nav>
      <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-h2 text-fg @min-[900px]/content:text-h1" data-testid={TID.course.title}>
        <span>
          {skillName} · {starOrdinal(course.star)}
        </span>
        <SkillStars size="lg" slots={skill.maxStars} value={course.star} />
      </h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body text-fg-2">
        {whyLine ? (
          <>
            <span className="font-semibold text-fg">{COURSE_COPY.why}</span>
            {whyLine}
          </>
        ) : null}
        {info.state === "credited" ? null : <RewardChip size="sm" status={info.state === "completed" ? "earned" : info.state === "locked" ? "locked" : "offer"} value={xp} />}
      </p>
    </header>
  );

  // ── the plan ───────────────────────────────────────────────────────────────────────────────────────────────────
  const learnState = plan.steps.find((s) => s.id === "learn")?.state ?? "upcoming";
  const applyState = plan.steps.find((s) => s.id === "apply")?.state ?? "upcoming";
  const finishState = plan.steps.find((s) => s.id === "finish")?.state ?? "upcoming";

  const heroActions = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      {bar && plan.current === "learn" ? null : learnButton(plan.current === "learn")}
      {open && learnState !== "done" ? nextLink(COURSE_COPY.learnedNext, () => tick(1, true)) : null}
      {open && learnState === "done" ? nextLink(COURSE_COPY.undo, () => tick(1, false)) : null}
    </div>
  );

  const applyCard = guide.proof ? (
    <PlanCard n={2} state={applyState} testId="course-proof" title={COURSE_COPY.plan.apply}>
      <p className="text-small font-semibold text-fg-2">{COURSE_COPY.proofTitle}</p>
      <p className="text-body text-fg">{guide.proof.task}</p>
      {guide.proof.dataset ? (
        <p className="text-small text-fg-3">
          {COURSE_COPY.dataset}: <bdi dir="ltr">{guide.proof.dataset.name}</bdi> · <bdi dir="ltr">{guide.proof.dataset.provider}</bdi>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {bar && plan.current === "apply" ? null : datasetButton(plan.current === "apply")}
        {open && applyState !== "done" ? nextLink(COURSE_COPY.appliedNext, () => tick(2, true)) : null}
        {open && applyState === "done" ? nextLink(COURSE_COPY.undo, () => tick(2, false)) : null}
      </div>
    </PlanCard>
  ) : null;

  let finishBody: ReactNode;
  if (info.state === "completed") {
    finishBody = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Stamp size="sm" />
          <p className="text-title text-fg">{completedOnLine(dayMonth(info.at))}</p>
        </div>
        {certSaved ? (
          <OutLink className="text-small font-medium text-fg underline decoration-dotted underline-offset-4" href={certSaved}>
            {COURSE_COPY.certShown} <IconExternal className="inline align-[-0.15em]" size={16} waypoint="off" />
          </OutLink>
        ) : null}
      </div>
    );
  } else if (info.state === "credited") {
    finishBody = <CreditedBody info={info} />;
  } else if (info.state === "locked") {
    finishBody = (
      <div className="flex flex-col gap-3">
        <p className="flex items-start gap-2 text-body font-semibold text-fg">
          <IconLock className="mt-1 shrink-0 text-fg-2" size={20} waypoint="off" />
          <bdi>{lockedLine(lockReasonText(info.lock))}</bdi>
        </p>
        {unlocker ? (
          <Button className="self-start" data-testid={TID.course.lockedOpen} icon={<IconArrowForward size={20} />} onClick={() => go(hrefFor({ screen: "course", courseId: unlocker }))} variant="secondary">
            {COURSE_COPY.lockedOpen}
          </Button>
        ) : null}
      </div>
    );
  } else {
    finishBody = (
      <>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-fg">
          <span>{finishGetsLine(course.star, skill.name)}</span>
          <RewardChip size="sm" value={xp} />
        </p>
        <CertField onChange={setCert} value={cert} />
        {bar && plan.current === "finish" ? null : finishButton(plan.current === "finish")}
      </>
    );
  }
  const finishCard = (
    <PlanCard n={guide.proof ? 3 : 2} state={finishState} testId="course-finish" title={COURSE_COPY.plan.finish}>
      {finishBody}
    </PlanCard>
  );

  const nextCard = info.state === "completed" ? <NextStepCard step={step} /> : null;

  const planColumn = (
    <div className="flex min-w-0 flex-col gap-5">
      <PlanStepper steps={plan.steps} />
      <TopPickCard actions={heroActions} course={guide.topPick} current={plan.current === "learn"} done={learnState === "done"} />
      <OtherOptions options={guide.alternatives} />
      <div className={cn("grid gap-5", wide && guide.proof && "grid-cols-2")}>
        {applyCard}
        {finishCard}
      </div>
      {nextCard}
      {guide.certification ? <CertificateCard cert={guide.certification} /> : null}
    </div>
  );

  // the end padding lets the last row scroll clear of the floating «اسأل دليلك» launcher (desktop and phone)
  const sideColumn = (
    <div className="flex min-w-0 flex-col gap-8 pb-24">
      <PeopleList people={guide.people} />
      <ArticleList articles={guide.articles} />
      <p className="flex items-start gap-2 text-small text-fg-3">
        <IconInfo className="mt-[0.2rem] shrink-0" size={18} waypoint="muted" />
        <span>{SAMPLE_COPY.coursePage}</span>
      </p>
    </div>
  );

  // the bottom bar (phone): the current step's one action
  let barAction: ReactNode = null;
  if (bar) {
    if (plan.current === "learn") barAction = learnButton(true);
    else if (plan.current === "apply") barAction = datasetButton(true) ?? nextLink(COURSE_COPY.appliedNext, () => tick(2, true));
    else if (plan.current === "finish" && open) barAction = finishButton(true);
  }

  return (
    <>
      <main className={cn("mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-gutter pt-5 pb-16", bar && "min-h-[calc(100dvh-var(--shell-top,4rem)-var(--shell-bottom,0px))] pb-0")}>
        {header}
        {wide ? (
          <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-x-10">
            {planColumn}
            <aside className="flex flex-col gap-8 pt-1">{sideColumn}</aside>
          </div>
        ) : (
          <>
            {planColumn}
            <div className="pt-2">{sideColumn}</div>
          </>
        )}
        {barAction ? (
          <div className="sticky bottom-(--shell-bottom) z-raised -mx-gutter mt-auto flex min-h-[4.5rem] items-center gap-3 border-t border-border bg-surface px-gutter py-3 [&>*]:flex-1">{barAction}</div>
        ) : null}
      </main>
      {celebration ? <Celebration result={celebration} /> : null}
    </>
  );
}

/** «رابط شهادتك (اختياري)»: one small field; the link is kept with the step when «خلّصتها» is pressed. */
function CertField({ value, onChange }: { readonly value: string; readonly onChange: (v: string) => void }): ReactNode {
  return (
    <TextField
      autoComplete="off"
      className="max-w-[26rem]"
      data-testid="course-certificate"
      dir="ltr"
      inputMode="url"
      label={COURSE_COPY.certLabel}
      onChange={(e) => onChange(e.target.value)}
      placeholder={COURSE_COPY.certPlaceholder}
      type="url"
      value={value}
    />
  );
}

/** «هذه النجمة مثبتة عندك…» and where the star came from: the CV sentence (marked like evidence) or a higher step. */
function CreditedBody({ info }: { readonly info: Extract<CourseStateInfo, { state: "credited" }> }): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body font-semibold text-fg">{COURSE_COPY.creditedLine}</p>
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
          {fromCourseLine(guideTitle(info.by.courseId))}
        </NavLink>
      )}
    </div>
  );
}

