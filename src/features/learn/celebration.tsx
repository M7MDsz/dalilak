"use client";
// Owner: learn. The completion celebration (spec 3.11; playbook 3.9): ONE overlay on the stage, one sequence, one dismiss.
// It is a scoreboard that lights up in the order cause, effect, meaning. Every cell is on the board from the first frame in
// its BEFORE state, quiet; at its beat it lights, its own value moves to the AFTER state, and its sentence rises:
//   course  the «تمّ» stamp lands on the course
//   xp      «+200 XP» pops and the scale bar fills in counted steps while the total counts 180 → 380 (xp-count-up)
//   star    a star leaves the stamp, travels to the skill's slot and lands (star-award, FlyToken)
//   match   120 ms of stillness, then the ring climbs 70 → 90 (match-rise) and the one Burst fires as it arrives
//   level   the new level's medal lands (spring.cheer) · badges unlock from their locked form · the weekly rank climbs
// The store was written BEFORE this opens (the page held `celebration` and called completeCourse); this only replays the
// consequence. Beat 1 marks the course's news announced, so the overlay queue never toasts it (3.15). Buttons are live from
// the first beat: a press settles every value at once, then acts. Space settles; Esc is «رجوع لمساري». Reduced motion and
// ?still=1 open settled. Desktop: a stage panel over a flat scrim. Phone: full screen, beats stacked, buttons pinned.
import { Dialog } from "@base-ui/react/dialog";
import { motion, type Variants } from "motion/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { BadgeEmblem, LevelEmblem } from "@/components/emblems";
import { IconArrowForward, IconRankUp, IconStarFilled } from "@/components/icons";
import { Burst, NumberTicker, Ring, resultOnly, useFlights, useGo, useInstant, useShow } from "@/components/motion";
import { BadgeMedal, Button, ContourBackdrop, SkillStars, Stamp, XpBar, XpValue, cn, toast } from "@/components/ui";
import { useNextStepAction, useViewport } from "@/features/shared";
import { nextStepLabel } from "@/lib/copy";
import { CELEBRATION_BEATS, getBadge, getCourse, getJob, getSkill, type CelebrationBeatId } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { levelFor, nextStep } from "@/lib/engine";
import { ease, popIn, spring, tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useAppStore, useCurrentUser, useOverlayHold } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CompleteCourseResult, StarCount } from "@/lib/types";

import { keepLatin } from "./bidi";
import { CELEBRATION_COPY, matchWithLine, newLevelLine, rankClimbLine, starOfLine } from "./copy";

/** The level medal lands a moment into its beat, after the match beat's Burst has thrown its bits (one thing at a time). */
const LEVEL_DELAY = 0.14;

/** The weekly rank in an open ring with its waypoint (the frame of the medals beside it), and the climb mark. */
function RankMark({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      <svg aria-hidden className="absolute inset-0 size-full overflow-visible" fill="none" viewBox="0 0 56 56">
        <path className="stroke-fg-2" d="M34.2 3.3A25 25 0 1 1 21.8 3.3" strokeLinecap="round" strokeWidth={1.75} />
        <circle className="fill-fg-2" cx={28} cy={2.6} r={2.1} />
      </svg>
      <span className="relative text-h3 leading-none font-bold text-fg">{children}</span>
      <span className="absolute -end-1 -bottom-1 grid size-6 place-items-center rounded-full border-[1.5px] border-border-strong bg-bg text-ok-fg">
        <IconRankUp size={14} strokeWidth={2.4} waypoint="off" />
      </span>
    </span>
  );
}

export type CompletedCourse = Extract<CompleteCourseResult, { ok: true }>;

/** wait: on the board, before its beat (quiet) · now: its beat · past: played, resting · done: the show has settled. */
type Phase = "wait" | "now" | "past" | "done";

const cell: Variants = {
  wait: { opacity: 0.34, transition: tween.fast },
  now: { opacity: 1, transition: tween.fast },
  past: { opacity: 0.74, transition: tween.move },
  done: { opacity: 1, transition: tween.fast },
};

/** A sentence that becomes true at its beat: rises 8 px into place (it holds its line from the first frame). */
function Sentence({ on, delay = 0, className, children }: { readonly on: boolean; readonly delay?: number; readonly className?: string; readonly children: ReactNode }): ReactNode {
  return (
    <motion.p animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }} className={className} initial={false} transition={on ? { ...tween.move, delay } : tween.exit}>
      {children}
    </motion.p>
  );
}

export function Celebration({ result }: { readonly result: CompletedCourse }): ReactNode {
  const { consequence: c, onPath, courseId } = result;
  const instant = useInstant();
  const { desktop } = useViewport();
  const go = useGo();
  const perform = useNextStepAction();
  const user = useCurrentUser();

  const course = getCourse(courseId);
  const skill = getSkill(course.skill);
  const star = c.stars.find((s) => s.skill === course.skill) ?? { skill: course.skill, before: (course.star - 1) as StarCount, after: course.star as StarCount };
  const job = onPath ? getJob(onPath.jobId) : null;
  const matchBefore = c.match.before?.value ?? onPath?.matchNow ?? 0;
  const matchAfter = c.match.after?.value ?? matchBefore;
  const lvBefore = levelFor(c.xp.before);
  const lvAfter = levelFor(c.xp.after);
  const climbed = c.rank.before - c.rank.after;

  const beats = useMemo(
    () =>
      CELEBRATION_BEATS.filter((b) => {
        switch (b.id) {
          case "match":
            return onPath !== null;
          case "level":
            return c.level.after !== c.level.before;
          case "badges":
            return c.badges.length > 0;
          case "rank":
            return c.rank.after < c.rank.before;
          default:
            return true;
        }
      }),
    [onPath, c.level.after, c.level.before, c.badges.length, c.rank.after, c.rank.before],
  );

  const [open, setOpen] = useState(true);
  const [skipped, setSkipped] = useState(false);
  const { index, done, skip } = useShow(instant ? resultOnly(beats) : beats, open, () => undefined);
  useOverlayHold("celebration", open);

  // Beat 1: the celebration absorbs its own news (XP, level, badges and rank are on this board, not in toasts).
  // Nothing else shows over it: the course page already closed every toast at the press of «أكمل الدورة» (during the
  // lessons' cascade); this closes anything raised since, as the board arrives.
  useEffect(() => {
    useAppStore.getState().markAnnounced({ xp: c.xp.events.map((e) => e.id), badges: c.badges });
    toast.close();
  }, [c]);

  const order = beats.map((b) => b.id);
  const phaseOf = (id: CelebrationBeatId): Phase => {
    if (done) return "done";
    const i = order.indexOf(id);
    if (i < 0) return "done";
    return i < index ? "past" : i === index ? "now" : "wait";
  };
  const reached = (id: CelebrationBeatId) => phaseOf(id) !== "wait";
  const live = skipped ? "settled" : "live";

  // star-award: a star leaves the stamp and lands in the skill's slot.
  const { fly, layer } = useFlights();
  const stampRef = useRef<HTMLSpanElement>(null);
  const starsRef = useRef<HTMLSpanElement>(null);
  const [landed, setLanded] = useState(false);
  const flown = useRef(false);
  const starPhase = phaseOf("star");
  useEffect(() => {
    if (starPhase !== "now" || flown.current) return;
    flown.current = true;
    const slot = starsRef.current?.querySelector(`[role="img"] > span:nth-child(${star.after})`) ?? starsRef.current;
    const token = (
      <span className="block bg-transparent text-fg" data-surface="stage">
        <IconStarFilled size={desktop ? 34 : 28} waypoint="off" />
      </span>
    );
    void fly(stampRef.current, slot ?? null, token, "keep").then(() => setLanded(true));
  }, [starPhase, star.after, fly, desktop]);
  const starShown = landed || done ? star.after : star.before;

  // match-rise, then the one Burst as the ring arrives.
  const [arrived, setArrived] = useState(false);
  const [burst, setBurst] = useState(false);
  const burstFired = useRef(false);
  const matchPhase = phaseOf("match");
  const onRingDrawn = () => {
    if (matchPhase === "now" && !burstFired.current && matchAfter > matchBefore) {
      burstFired.current = true;
      setBurst(true);
    }
    if (matchPhase !== "wait") setArrived(true);
  };

  const settle = () => {
    if (!done) {
      setSkipped(true);
      skip();
    }
  };
  const step = user ? nextStep(user) : null;
  const close = () => {
    settle();
    setOpen(false);
    go(hrefFor({ screen: "path" }));
  };
  const next = () => {
    settle();
    setOpen(false);
    if (step) perform(step);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== " " || event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, [contenteditable]")) return;
    event.preventDefault();
    settle();
  };
  const focusRef = useRef<HTMLDivElement>(null);
  // Phone: the board is taller than some screens; the beat that is playing is scrolled into view (never on desktop).
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentId = done ? null : order[index];
  useEffect(() => {
    if (desktop || currentId === null || currentId === undefined) return;
    const el = scrollRef.current?.querySelector(`[data-cell="${currentId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: instant ? "auto" : "smooth" });
  }, [currentId, desktop, instant]);

  const ringSize = desktop ? 176 : 104;
  const xp = reached("xp") ? { total: c.xp.after, lv: lvAfter } : { total: c.xp.before, lv: lvBefore };
  const levelShown = reached("level") ? lvAfter : lvBefore;

  // ── the cells ──────────────────────────────────────────────────────────────────────────────────────────────────
  const xpCell = (
    <motion.div animate={phaseOf("xp")} className="flex flex-col gap-2 lg:gap-3" data-testid={TID.celebration.xp} data-value={c.xp.gained} initial={false} data-cell="xp" key="xp" variants={cell}>
      <motion.span animate={reached("xp") ? "show" : "hidden"} className="self-start" initial={false} variants={popIn}>
        <XpValue gain size="lg" value={c.xp.gained} />
      </motion.span>
      <XpBar from={xp.lv.from} key={live} level={xp.lv.level} title={xp.lv.title} to={xp.lv.next} total={xp.total} variant={desktop ? "full" : "compact"} />
    </motion.div>
  );

  const starCell = (
    <motion.div animate={starPhase} className="flex items-center gap-3 lg:flex-col lg:items-stretch lg:gap-2" data-testid={TID.celebration.star} data-value={star.after} initial={false} data-cell="star" key="star" variants={cell}>
      <span className="self-start" ref={starsRef}>
        <SkillStars fresh={landed && !skipped ? star.after : undefined} key={live} size="lg" slots={skill.maxStars} value={starShown} />
      </span>
      <Sentence className="text-title text-fg" on={landed || done}>
        <span className="sr-only">{starOfLine(skill.name, star.after, skill.maxStars)}</span>
        <span aria-hidden>
          <bdi>{skill.name}</bdi>: النجمة {formatNumber(star.after)} من {formatNumber(skill.maxStars)}
        </span>
      </Sentence>
    </motion.div>
  );

  const matchCell =
    job !== null ? (
      <motion.div
        animate={matchPhase}
        className={cn("flex items-center gap-4", desktop && "flex-col gap-3 text-center")}
        data-from={matchBefore}
        data-testid={TID.celebration.match}
        data-value={matchAfter}
        initial={false}
        data-cell="match" key="match"
        variants={cell}
      >
        <motion.span
          animate={arrived && !skipped && !done && !instant ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          className="relative grid shrink-0 place-items-center"
          initial={false}
          transition={{ duration: 0.45, times: [0, 0.35, 1], ease: ease.out }}
        >
          <Ring delay={0.12} key={live} onDrawn={onRingDrawn} size={ringSize} value={reached("match") ? matchAfter : matchBefore} />
          {burst ? <Burst onDone={() => setBurst(false)} radius={ringSize / 2 - 6} reach={desktop ? 1.15 : 0.8} seed={11} /> : null}
        </motion.span>
        <div className={cn("flex min-w-0 flex-col gap-1", desktop && "items-center")}>
          <p className="text-title text-fg">{matchWithLine(job.title)}</p>
          <Sentence className="flex items-center gap-2 text-body font-semibold text-fg tabular-nums" on={arrived || done}>
            <bdi className="text-fg-3" dir="ltr">
              {formatNumber(matchBefore)}%
            </bdi>
            <IconArrowForward className="text-fg-3" size={18} waypoint="off" />
            <bdi dir="ltr">{formatNumber(matchAfter)}%</bdi>
          </Sentence>
          {matchAfter >= 100 ? (
            <Sentence className="text-small font-semibold text-ok-fg" on={arrived || done}>
              {CELEBRATION_COPY.ready}
            </Sentence>
          ) : null}
        </div>
      </motion.div>
    ) : null;

  const levelCell = beats.some((b) => b.id === "level") ? (
    <motion.div animate={phaseOf("level")} className="flex items-center gap-3" data-testid={TID.celebration.level} data-value={lvAfter.level} initial={false} data-cell="level" key="level" variants={cell}>
      <motion.span
        animate={{ scale: 1, opacity: 1 }}
        className="shrink-0"
        initial={reached("level") && !skipped && !done ? { scale: 0.6, opacity: 0 } : false}
        key={`${levelShown.level}-${live}`}
        transition={{ default: { ...spring.cheer, delay: LEVEL_DELAY }, opacity: { ...tween.fast, delay: LEVEL_DELAY } }}
      >
        <BadgeMedal bare emblem={<LevelEmblem level={levelShown.level} />} size="sm" state="earned" />
      </motion.span>
      <Sentence className="min-w-0 text-title text-fg" delay={LEVEL_DELAY} on={reached("level")}>
        {newLevelLine(lvAfter.level, lvAfter.title)}
      </Sentence>
    </motion.div>
  ) : null;

  const badgesPhase = phaseOf("badges");
  const badgesCell =
    c.badges.length > 0 ? (
      <motion.div animate={badgesPhase} className="flex flex-col gap-3" data-testid={TID.celebration.badges} data-value={c.badges.length} initial={false} data-cell="badges" key="badges" variants={cell}>
        <p className="text-small font-semibold text-fg-2">{c.badges.length === 1 ? CELEBRATION_COPY.badge : CELEBRATION_COPY.badges}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-3">
          {c.badges.map((id, i) => {
            const badge = getBadge(id);
            // "new" stays for the rest of the show: the unlock (wipe 500 ms, then one pop) outlasts its 500 ms beat
            const state = badgesPhase === "wait" ? "locked" : skipped ? "earned" : "new";
            return (
              <li className="flex w-[5.5rem] flex-col items-center gap-1.5 text-center" key={id}>
                <BadgeMedal bare delay={i * 0.06} emblem={<BadgeEmblem id={id} />} key={live} lockedEmblem={<BadgeEmblem id={id} locked />} size="sm" state={state} />
                <span className="text-small font-semibold leading-snug text-fg">{badge.name}</span>
              </li>
            );
          })}
        </ul>
      </motion.div>
    ) : null;

  const rankCell =
    climbed > 0 ? (
      <motion.div animate={phaseOf("rank")} className="flex items-center gap-3" data-testid={TID.celebration.rank} data-value={c.rank.after} initial={false} data-cell="rank" key="rank" variants={cell}>
        <RankMark>
          <NumberTicker duration={0.6} key={live} value={reached("rank") ? c.rank.after : c.rank.before} />
        </RankMark>
        <Sentence className="min-w-0 text-body font-medium text-balance text-fg" on={reached("rank")}>
          {rankClimbLine(climbed, c.rank.after)}
        </Sentence>
      </motion.div>
    ) : null;

  const before = [xpCell, starCell];
  const after = [levelCell, badgesCell, rankCell].filter((n): n is NonNullable<typeof n> => n !== null);

  return (
    <Dialog.Root
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next) close();
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-overlay bg-ink/60 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-overlay grid place-items-stretch overflow-hidden lg:place-items-center lg:p-6">
          <Dialog.Popup
            className={cn(
              "relative isolate flex flex-col overflow-hidden bg-bg text-fg outline-none",
              "h-dvh w-full lg:h-auto lg:max-h-[calc(100dvh-3rem)] lg:w-[min(57rem,100%)] lg:rounded-sheet lg:shadow-float",
              "transition-[opacity,translate] duration-200 ease-out data-starting-style:translate-y-4 data-starting-style:opacity-0",
              "data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in",
            )}
            data-beat={done ? "settled" : order[index]}
            data-surface="stage"
            data-testid={TID.celebration.overlay}
            initialFocus={focusRef}
            onKeyDown={onKeyDown}
          >
            <ContourBackdrop intensity="quiet" seed={7} summit={desktop ? { x: 0.5, y: 0.56 } : { x: 0.3, y: 0.5 }} />
            <Dialog.Title className="sr-only">{CELEBRATION_COPY.course}</Dialog.Title>
            <div className="relative flex min-h-0 flex-1 flex-col outline-none" ref={focusRef} tabIndex={-1}>
              <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-gutter pt-6 pb-5 lg:gap-9 lg:px-12 lg:pt-11 lg:pb-9" ref={scrollRef}>
                {/* course: the stamp lands on the course */}
                <motion.header
                  animate={phaseOf("course")}
                  className={cn("flex items-center gap-4", desktop && "justify-center gap-6")}
                  initial={false}
                  variants={cell}
                >
                  <span className="shrink-0" ref={stampRef}>
                    <Stamp play size={desktop ? "md" : "sm"} delay={0.12} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-small font-semibold text-ok-fg lg:text-title">{CELEBRATION_COPY.course}</p>
                    <h2 className="text-title font-bold text-balance text-fg lg:text-h2">{keepLatin(course.title)}</h2>
                  </div>
                </motion.header>

                <div aria-hidden className="hidden h-px shrink-0 bg-border lg:block" />

                {desktop ? (
                  <div className={cn("grid items-center gap-10", matchCell ? "grid-cols-[minmax(0,1fr)_13rem_minmax(0,1fr)]" : after.length > 0 ? "grid-cols-2" : "grid-cols-1")}>
                    <div className="flex flex-col justify-center gap-8">{before}</div>
                    {matchCell}
                    {after.length > 0 ? <div className="flex flex-col justify-center gap-7">{after}</div> : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {before}
                    {matchCell}
                    {after}
                  </div>
                )}
              </div>

              <footer className="relative flex shrink-0 flex-col gap-3 border-t border-border bg-bg px-gutter pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-6">
                {step ? (
                  <p className="hidden min-w-0 items-center gap-2 text-small text-fg-2 lg:flex">
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
                    <span className="truncate">{nextStepLabel(step)}</span>
                  </p>
                ) : null}
                <div className="grid shrink-0 grid-cols-2 gap-3 lg:flex">
                  <Button data-testid={TID.celebration.next} icon={<IconArrowForward size={20} />} onClick={next}>
                    {CELEBRATION_COPY.next}
                  </Button>
                  <Button data-testid={TID.celebration.close} onClick={close} variant="secondary">
                    {CELEBRATION_COPY.close}
                  </Button>
                </div>
              </footer>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
      {layer}
    </Dialog.Root>
  );
}
