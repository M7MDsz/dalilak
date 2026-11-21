"use client";
// Owner: welcome. Phases 2 and 3 of /welcome: the path-reveal sequence (spec 3.3, 4.7) and the reveal result, as ONE
// layout, so the path the show draws is the same element the result keeps ("the path stays on screen and the rest of
// the result forms around it"). The result's grid is laid out from the first frame with everything but the sheet hidden;
// the show plays over it on the night stage (owned by the screen, so the logo stays put):
//   1-4  the scenes (reveal-scenes.tsx) over the whole stage, one rolling status line under them
//   5    the sheet rises in its result place and the trail is drawn on it; the chosen job's title travels to the trophy
//   6    the title lands; the night lifts (the stage fades to the paper, whose contours are the same hill); the result
//        comes into focus around the sheet
// On a choice (spec 3.3, ARCHITECTURE 11.2): the rest of the result leaves (150 ms), the sheet stays (recommended job)
// or leaves too (an alternative), the hand-over is measured and stored, the target is set, and router.push("/path")
// takes over directly (no leave fade: the sheet must stay on screen until the map opens out of it).
import { AnimatePresence, LayoutGroup, motion, type Variants } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { IconArrowForward, IconCheck, IconCompany } from "@/components/icons";
import { RollingStatus } from "@/components/chat";
import { useInstant, useShow, useStill, type RevealStepId, type ShowStep } from "@/components/motion";
import { Button, Card, cn } from "@/components/ui";
import { REVEAL_SEQUENCE } from "@/lib/data";
import { skillStars } from "@/lib/engine";
import { tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useAppStore, useOverlayHold, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { JobId, UserState } from "@/lib/types";
import { useViewport } from "@/features/shared";

import type { AnswerRects } from "./conversation";
import { RESULT_COPY, firstNameOf, revealLines } from "./copy";
import { PathSheet, type SheetMode } from "./path-sheet";
import { AnswerCluster, FieldIcon, JobSweep, NarrowToThree, SkillLandscape } from "./reveal-scenes";
import { revealData, type RevealData, type RevealJobCard, type RevealTrackCard } from "./reveal-data";

type Phase = "show" | "result" | "leaving";

const STEPS: readonly ShowStep<RevealStepId>[] = REVEAL_SEQUENCE.map((s) => ({ id: s.id, ms: s.ms }));
const NO_STEPS: readonly ShowStep<RevealStepId>[] = [];
/** When the night starts to lift inside step 6 (0.8 s): after the title has landed. */
const LIFT_AFTER_MS = 380;

// the window height (the desktop sheet fills to its ideal step below it)
function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
const windowHeight = () => window.innerHeight;
const serverHeight = () => 900;

// the result's blocks arrive in reading order (80 ms apart, under 480 ms) with a short slide and fade, and leave together
// (150 ms). 21 Nov 2026: no blur any more (a 4 px blur on every block read as the page loading, not arriving).
const block: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { ...tween.move, delay } }),
  leave: { opacity: 0, y: -4, transition: tween.exit },
};

/** When the hidden result grid mounts: after the six answers have landed (about 1.15 s), before the jobs pass (1.4 s). */
const GRID_AFTER_MS = 1_200;

/** Reduced motion: no show and nothing travels; the result fades in over the paper instead of cutting in. */
const REDUCED_FADE_MS = 220;

export interface RevealFlowProps {
  readonly user: UserState;
  /** Where the six answers sat when the conversation ended (null after a reload). */
  readonly rects: AnswerRects | null;
  /** A reload after step 6 started (`revealPlayed`): the result at rest. */
  readonly startOnResult: boolean;
  /** The night stage behind the show (owned by the screen). */
  readonly onNight: (night: boolean) => void;
  /** A choice was made: the screen's own chrome (the logo) leaves with the result. */
  readonly onLeaving: () => void;
}

export function RevealFlow({ user, rects, startOnResult, onNight, onLeaving }: RevealFlowProps) {
  const router = useRouter();
  const instant = useInstant();
  const still = useStill();
  const { desktop } = useViewport();
  const height = useSyncExternalStore(subscribeResize, windowHeight, serverHeight);
  // with a CV read in onboarding, its skills weigh in the choice too (the same rule «دليلك» used for his path line)
  const cvStars = useMemo(() => (user.cv !== null && user.onboarding.cv === "analysed" ? skillStars(user) : undefined), [user]);
  const data = useMemo(() => revealData(user.answers, cvStars, cvStars ? user : undefined), [user, cvStars]);
  const firstName = firstNameOf(user.name);
  const lines = useMemo(() => revealLines(firstName), [firstName]);

  const [phase, setPhase] = useState<Phase>(startOnResult ? "result" : "show");
  const [stripStays, setStripStays] = useState(true);
  const [skipped, setSkipped] = useState(false);
  // The result's grid (hidden until step 5) is mounted in the rest beat at the end of answers-gather, not with the show:
  // mounted together with the chat's unmount it was one 150 ms task (dev build) that froze the hand-off's first frames.
  const [gridDue, setGridDue] = useState(startOnResult);
  useEffect(() => {
    if (gridDue) return;
    const timer = window.setTimeout(() => setGridDue(true), GRID_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [gridDue]);
  const markedRef = useRef(false);
  const markPlayed = () => {
    if (markedRef.current) return;
    markedRef.current = true;
    useAppStore.getState().markRevealPlayed();
  };

  // Reduced motion: the show opens on its result (spec "How to read"; ARCHITECTURE 13: pass no steps).
  const show = useShow(instant ? NO_STEPS : STEPS, phase === "show", () => {
    markPlayed();
    setPhase("result");
  });
  const index = phase === "show" ? show.index : STEPS.length - 1;
  const stepId = STEPS[index]?.id;

  useOverlayHold("reveal", phase === "show");

  // reduced motion (not still frames): one quick crossfade from the conversation to the result, opacity only (a Web
  // Animation: Motion skips its own animations under reduced motion, and the CSS rule ends CSS ones at once)
  const rootRef = useRef<HTMLDivElement>(null);
  const fadedRef = useRef(false);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!instant || still || fadedRef.current || !el || typeof el.animate !== "function") return;
    fadedRef.current = true;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE_MS, easing: "ease-out" });
  }, [instant, still]);

  // `revealPlayed` is saved when step 6 starts (spec 3.3)
  useEffect(() => {
    if (phase === "show" && show.playing && index === STEPS.length - 1) markPlayed();
  });

  // the night: falls with the show, lifts in step 6 once the title has landed (or at once when the show is skipped)
  const showing = phase === "show" && !instant;
  useEffect(() => {
    if (!showing) {
      onNight(false);
      return;
    }
    if (index < STEPS.length - 1) {
      onNight(true);
      return;
    }
    const timer = window.setTimeout(() => onNight(false), LIFT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [showing, index, onNight]);

  // Space or Esc jumps to the result (for the presenter; not advertised)
  const skip = show.skip;
  useEffect(() => {
    if (phase !== "show") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.key !== " " && event.key !== "Escape")) return;
      const t = event.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      event.preventDefault();
      setSkipped(true);
      skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip]);

  // ---- the hand-over to the map
  const sheetRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(false);
  const choose = (jobId: JobId, recommended: boolean) => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setStripStays(recommended);
    setPhase("leaving");
    onLeaving();
    window.setTimeout(() => {
      const sheet = sheetRef.current;
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      const nodes = recommended && sheet ? Array.from(sheet.querySelectorAll<HTMLElement>("[data-sheet-node]")) : [];
      nodes.sort((a, b) => Number(a.dataset.sheetNode) - Number(b.dataset.sheetNode));
      useUi.getState().setMapHandover({
        jobId,
        stripStays: recommended,
        stripRect: recommended && sheet ? box(sheet) : null,
        nodeRects: nodes.map(box),
      });
      useAppStore.getState().setTarget(jobId);
      router.push(hrefFor({ screen: "path" }));
    }, 170);
  };

  const layout = desktop ? "climb" : "rows";
  const sheetMode: SheetMode =
    startOnResult || instant || skipped ? "rest" : phase !== "show" || index >= 4 ? "drawing" : "hidden";
  const visible = phase !== "show";
  const leaving = phase === "leaving";
  const state = leaving ? "leave" : visible ? "show" : "hidden";
  const resultTid = phase === "result";
  const gridMounted = gridDue || instant || phase !== "show" || index >= 1;
  const maxSheet = Math.max(460, height - 72 - 24 - 136);

  const three: readonly [JobId, JobId, JobId] = [data.alternatives[0].id, data.recommended.id, data.alternatives[1].id];

  return (
    <LayoutGroup>
      {/* during the show the page is exactly the viewport: PageTransition's resting translate makes .page the containing
          block of the fixed layers (the night, the show), so .page must not be taller than the screen while they play */}
      <div className={cn("relative", phase === "show" && "h-[calc(100dvh-4rem)] overflow-hidden lg:h-[calc(100dvh-72px)]")} ref={rootRef}>
        {gridMounted ? (
          <main
            className={cn(
              "mx-auto grid w-full max-w-[76rem] gap-x-10 gap-y-6 px-gutter",
              desktop ? "grid-cols-[minmax(0,1fr)_24rem_minmax(0,1fr)] grid-rows-[auto_auto_auto_1fr] items-start pt-6 pb-16" : "grid-cols-1 pt-2 pb-6",
            )}
            data-testid={resultTid ? TID.reveal.result : undefined}
          >
            {/* 1. heading and the recommended job (desktop: the inline-start column) */}
            <div className={cn("flex min-w-0 flex-col gap-6", desktop && "col-start-1 row-start-1")} style={{ visibility: visible ? "visible" : "hidden" }}>
              <motion.h1 animate={state} className={cn("text-fg", desktop ? "text-display" : "text-h1")} custom={0} initial={startOnResult ? false : "hidden"} variants={block}>
                {RESULT_COPY.heading(firstName)}
              </motion.h1>
              <motion.div animate={state} custom={0.08} initial={startOnResult ? false : "hidden"} variants={block}>
                <RecommendedCard company={data.company} job={data.recommended} />
              </motion.div>
            </div>

            {/* 2. the path sheet (desktop: the middle column, both rows) */}
            <motion.div
              animate={{ opacity: leaving && !stripStays ? 0 : 1 }}
              className={cn("min-w-0", desktop && "col-start-2 row-span-4 row-start-1")}
              initial={false}
              transition={tween.exit}
            >
              <PathSheet
                footer={visible && !(leaving && stripStays)}
                landed={phase !== "show" || index >= 5}
                layout={layout}
                maxHeight={maxSheet}
                mode={sheetMode}
                sheetRef={sheetRef}
                stages={data.stages}
                summary={RESULT_COPY.summary(data.recommended.stages, data.recommended.hours)}
                note={data.cvCover ? RESULT_COPY.cvCovered(data.cvCover.done, data.cvCover.total, data.cvCover.match) : undefined}
                title={data.recommended.path}
                titleTravels={!startOnResult && !instant && !skipped && index >= 4}
              />
            </motion.div>

            {/* 3. the one primary action (phone: pinned above the fold's bottom edge until its place scrolls into view) */}
            <motion.div
              animate={state}
              className={cn(desktop ? "col-start-1 row-start-3" : "sticky bottom-0 z-10 -mx-gutter border-t border-border bg-bg px-gutter py-3")}
              custom={0.24}
              initial={startOnResult ? false : "hidden"}
              style={{ visibility: visible ? "visible" : "hidden" }}
              variants={block}
            >
              <Button
                className={desktop ? undefined : "w-full"}
                data-testid={visible ? TID.reveal.accept : undefined}
                disabled={leaving}
                icon={<IconArrowForward size={20} />}
                onClick={() => choose(data.recommended.id, true)}
                size="lg"
              >
                {RESULT_COPY.accept}
              </Button>
            </motion.div>

            {/* 4. why this path (desktop: under the card; phone: after the path and its button, so both fit the first screen) */}
            <motion.section
              animate={state}
              aria-labelledby="reveal-why"
              className={cn("flex min-w-0 flex-col gap-3", desktop && "col-start-1 row-start-2")}
              custom={0.16}
              initial={startOnResult ? false : "hidden"}
              style={{ visibility: visible ? "visible" : "hidden" }}
              variants={block}
            >
              <h2 className="text-title text-fg" id="reveal-why">
                {RESULT_COPY.why}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {data.reasons.map((reason, i) => (
                  <li
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface py-1 ps-2.5 pe-3.5 text-small font-medium text-fg"
                    data-testid={TID.reveal.reason(i)}
                    key={reason}
                  >
                    <IconCheck className="shrink-0 text-ok-fg" size={16} strokeWidth={2.5} waypoint="off" />
                    {reason}
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* 5. «اختر تخصصك»: the specialisations of the user's field, each with its best job (desktop: the inline-end
                column). The recommended job's own track comes first and its button is the main «ابدأ هذا المسار». */}
            <section
              aria-labelledby="reveal-alts"
              className={cn("flex min-w-0 flex-col gap-3", desktop ? "col-start-3 row-span-4 row-start-1 pt-3" : "pt-2")}
              style={{ visibility: visible ? "visible" : "hidden" }}
            >
              {/* nothing else to choose (a specialisation with one job): no section that only repeats the job above */}
              {data.tracks.length > 1 ? (
              <motion.div animate={state} className="flex flex-col gap-1" custom={0.32} initial={startOnResult ? false : "hidden"} variants={block}>
                <h2 className="text-h3 text-fg" id="reveal-alts">
                  {data.mode === "grow" ? RESULT_COPY.stepsHeading : RESULT_COPY.tracksHeading}
                </h2>
                <p className="text-small text-fg-2">{data.mode === "grow" ? RESULT_COPY.stepsLead : RESULT_COPY.tracksLead}</p>
              </motion.div>
              ) : null}
              {(data.tracks.length > 1 ? data.tracks : []).map((track, i) => (
                <motion.div animate={state} custom={0.4 + i * 0.04} initial={startOnResult ? false : "hidden"} key={`${track.id}-${track.job.id}`} variants={block}>
                  <TrackCard
                    disabled={leaving}
                    index={i - 1}
                    onChoose={() => choose(track.job.id, track.best)}
                    track={track}
                    visible={visible}
                  />
                </motion.div>
              ))}
              <motion.p animate={state} className="text-small text-fg-3" custom={0.44 + data.tracks.length * 0.04} initial={startOnResult ? false : "hidden"} variants={block}>
                {RESULT_COPY.footer}
              </motion.p>
            </section>
          </main>
        ) : null}

        {/* the show: scenes over the whole stage, one status line under them. Clipped (21 Nov 2026): an answer starting
            near the screen's edge, or a sweep row, must never widen the page (a phone's viewport zoomed out and the
            whole stage slid sideways while the answers gathered) */}
        <AnimatePresence>
          {phase === "show" && !instant ? (
            <motion.section
              aria-label={lines[stepId ?? "answers-gather"]}
              className="pointer-events-none fixed inset-0 z-20 overflow-hidden bg-transparent"
              data-surface="stage"
              data-testid={TID.reveal.sequence}
              exit={{ opacity: 0, transition: tween.exit }}
              key="show"
            >
              <div className={cn("absolute inset-x-0 flex items-center justify-center px-gutter", desktop ? "top-[72px] bottom-[136px]" : "top-14 bottom-28")}>
                <AnimatePresence>
                  {index <= 1 ? (
                    <Scene immediate key="answers">
                      <AnswerCluster answers={data.answers} compact={index === 1} phone={!desktop} rects={rects} />
                    </Scene>
                  ) : null}
                  {index === 1 ? (
                    <Scene key="sweep">
                      <JobSweep chosen={three} phone={!desktop} tiles={data.tiles} />
                    </Scene>
                  ) : null}
                  {index === 2 ? (
                    <Scene key="skills">
                      <SkillLandscape fields={data.fields} phone={!desktop} />
                    </Scene>
                  ) : null}
                  {index === 3 ? (
                    <Scene key="narrow">
                      <NarrowToThree phone={!desktop} recommended={data.recommended.id} three={three} tiles={data.tiles} />
                    </Scene>
                  ) : null}
                </AnimatePresence>
              </div>
              <motion.div
                animate={{ opacity: index >= STEPS.length - 1 ? 0 : 1 }}
                className={cn("absolute inset-x-0 flex justify-center px-gutter", desktop ? "bottom-10" : "bottom-8")}
                data-testid={TID.reveal.step}
                data-value={index + 1}
                initial={{ opacity: 0 }}
                transition={index >= STEPS.length - 1 ? { ...tween.exit, delay: 0.25 } : { ...tween.enter, delay: 0.2 }}
              >
                <RollingStatus className={cn("text-fg-2", desktop ? "text-title" : "text-body")} elapsedAfter={600} glyph={index >= STEPS.length - 1 ? "done" : "working"} label={lines[stepId ?? "answers-gather"]} />
              </motion.div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

/**
 * A scene of the show: absolutely centred on the stage. It rises 8 px and fades in while the leaving one fades and lifts
 * 4 px (150 ms), starting 40 ms in, so the two cross instead of leaving an empty night between them (21 Nov 2026: the
 * old 150 ms wait read as a blank frame at every change of scene).
 */
function Scene({ children, immediate = false }: { children: React.ReactNode; immediate?: boolean }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, transition: { ...tween.enter, delay: 0.04 } }}
      className="absolute inset-0 flex items-center justify-center px-gutter"
      exit={{ opacity: 0, y: -4, transition: tween.exit }}
      initial={immediate ? false : { opacity: 0, y: 8 }}
    >
      {children}
    </motion.div>
  );
}

function RecommendedCard({ job, company }: { job: RevealJobCard; company: RevealData["company"] }) {
  return (
    <Card data-testid={TID.reveal.recommended} data-value={job.id} label={RESULT_COPY.recommendedLabel}>
      <div className="flex flex-col gap-2 pt-1">
        <h2 className="text-h2 text-fg">{job.path}</h2>
        {/* the path is the role; its real jobs are listed in the map's «وظائف تناسبك» (owner, 21 Nov 2026) */}
        {job.jobsOnPath > 0 ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-fg-2">
            <IconCompany className="shrink-0 text-fg-3" size={18} waypoint="muted" />
            <span>{RESULT_COPY.jobsOnPath(job.jobsOnPath)}</span>
          </p>
        ) : null}
        <p className="flex items-center gap-2 text-small text-fg-2">
          <FieldIcon className="shrink-0 text-fg-3" field={job.fieldId} size={18} />
          <span>{job.field}</span>
        </p>
        {/* the company the user has in mind (onboarding step 7): this is its job, or the closest one and why */}
        {company ? (
          <p
            className={cn("mt-1 flex items-start gap-2 border-t border-border pt-3 text-small", company.aimed ? "font-semibold text-fg" : "text-fg-2")}
            data-testid={TID.reveal.company}
            data-value={company.aimed ? "aimed" : "closest"}
          >
            {company.aimed ? <IconCheck className="mt-0.5 shrink-0 text-ok-fg" size={16} strokeWidth={2.5} waypoint="off" /> : null}
            <span>{company.aimed ? RESULT_COPY.companyAimed(company.name) : RESULT_COPY.companyNoJob(company.name)}</span>
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * One specialisation: its name big, then its best job for the user (title · company · city), the path's size and the
 * choice. The recommended job's track is labelled «الأنسب لك» in its border (as the recommended card is) and its button
 * is the main «ابدأ هذا المسار»; `index` numbers the others (`reveal-alt-{index}`).
 */
function TrackCard({ track, index, onChoose, disabled, visible }: { track: RevealTrackCard; index: number; onChoose: () => void; disabled: boolean; visible: boolean }) {
  const { job, best } = track;
  // «خطوتك الجاية» (grow): the job's title leads, its specialisation · company · city under it
  const step = track.kind === "step";
  return (
    <Card
      data-testid={visible ? (best ? TID.reveal.trackBest : TID.reveal.alt(index)) : undefined}
      data-track={track.id}
      data-value={job.id}
      dot={best ? "accent" : "muted"}
      label={best ? RESULT_COPY.recommendedLabel : undefined}
      padding="none"
    >
      <div className={cn("flex flex-col gap-2 px-card", best ? "pt-1.5 pb-4" : "py-4")}>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-title text-fg">{step ? job.title : track.name}</h3>
          <p className="text-small text-fg-2">
            {step ? (
              <>
                <span className="font-medium text-fg">{track.name}</span>
                <span aria-hidden> · </span>
                {/* the company and city wrap together (a lone city on the next line read as a stray) */}
                <span className="whitespace-nowrap">{job.companyCity}</span>
              </>
            ) : (
              <>
                {/* a specialisation is a role, not one posting: its role and how many real jobs lead to it */}
                <span className="font-medium text-fg">{job.path}</span>
                {job.jobsOnPath > 0 ? (
                  <>
                    <span aria-hidden> · </span>
                    <span className="whitespace-nowrap">{RESULT_COPY.jobsOnPath(job.jobsOnPath)}</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="flex flex-wrap items-center gap-2 text-small font-semibold text-fg">
            {RESULT_COPY.summary(job.stages, job.hours)}
            {track.needsExperience ? (
              <span className="inline-flex h-5.5 items-center rounded-tag border border-border px-1.5 text-caption font-normal text-fg-2">{RESULT_COPY.needsExperience}</span>
            ) : null}
          </p>
          <Button
            data-testid={visible ? (best ? TID.reveal.trackBestChoose : TID.reveal.altChoose(index)) : undefined}
            disabled={disabled}
            onClick={onChoose}
            size="sm"
            variant={best ? "primary" : "secondary"}
          >
            {best ? RESULT_COPY.accept : step ? RESULT_COPY.stepChoose : RESULT_COPY.trackChoose}
          </Button>
        </div>
      </div>
    </Card>
  );
}
