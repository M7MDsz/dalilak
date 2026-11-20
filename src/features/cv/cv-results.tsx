"use client";
// Owner: cv. The results of /cv (spec 3.6, 6.4) drawn as the haul (docs/GAME-LAYER.md 5.4): what the analysis gave you.
//   - The header (the heading, the engine), then a flat results tile with the three real numbers (skills
//     found, stars held, the +100 XP of a first analysis) and the collection meter «مجموعتك: 8 من 38 مهارة».
//   - Every skill found is a loot card (name, stars, «من سيرتك: «…»» marked as evidence, P4), grouped by field (9.1 order,
//     more stars first). After a show the cards land one after another and each last star lands (LootReveal, star-fill).
//   - The side column: «هدفك بعد التحليل» = the target as a destination (ring-count from the match before this analysis,
//     its five requirement segments, the locked gems), the one primary «اذهب إلى مساري» with the match and the next
//     step under it. «أفضل الوظائف لمهاراتك»: the other best jobs as destinations, each with its buttons UNDER the card
//     (a button never sits inside a pressable card).
// After a show the blocks come into focus (`results-rise`: «دليلك» worked them out), the counts climb, the XP coin lands
// and the collection meter fills tick by tick; a saved result renders at rest. Wide content: the haul on the right with
// the other jobs under it, the side column (340 px, sticky) on the left. Narrow: one column, the target and its action
// right after the results tile, then the loot, then the other jobs.
import { animate, motion, useMotionValue, useTransform, type Variants } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";

import { CollectionMeter, DestinationCard, LootCard, LootReveal, Tile, XpCoin, type Requirement } from "@/components/game";
import {
  IconAdvisor,
  IconArrowForward,
  IconFieldBusiness,
  IconFieldCyberCloud,
  IconFieldData,
  IconFieldDesign,
  IconFieldHr,
  IconFieldMarketing,
  IconFieldProduct,
  IconFieldProfessional,
  IconFieldSalesSupply,
  WAVE2_FIELD_ICONS,
  IconFieldSoftware,
  IconRetry,
  IconStarFilled,
} from "@/components/icons";
import type { IconProps } from "@/components/icons/icon-base";
import { NavLink, NumberTicker, useGo, useInstant } from "@/components/motion";
import { Button, cn } from "@/components/ui";
import { ConfirmTargetDialog } from "@/features/shared";
import { APPLICATION_STATUS_COPY, ASK_ADVISOR_APPLY_TEXT, BAND_LABEL, historyStamp } from "@/lib/copy";
import { FIELDS, SKILLS, XP, getJob, getJobCity, getSkill } from "@/lib/data";
import { applicationStatus, nextStep, rankJobs, skillStars, skillsHeld, targetMatch, totalStars } from "@/lib/engine";
import { formatNumber, formatPercent } from "@/lib/format";
import { group, spring, staggerStep, tween } from "@/lib/motion";
import { hrefFor, PAGE_HEADINGS } from "@/lib/routes";
import { useClock, useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CvSkill, FieldId, JobId, RankedJob, StarMap, UserState } from "@/lib/types";

import { Bidi, BidiLine } from "./bidi";
import { CV_COPY, HAUL_COPY, fieldCount, foundLabel, lastAnalysed, nextLine, resultsHeading, starsLabel, targetLine, targetLineLead } from "./copy";

/** What the show hands over, so the result can play its arrival once. Null for a saved result. */
export type FreshResult = {
  readonly matchBefore: number | null;
  readonly xpGained: number;
  /** Skills this analysis added to the collection (the collection meter fills from the count before it). */
  readonly newSkills: number;
};

const FIELD_ICON = {
  data: IconFieldData,
  software: IconFieldSoftware,
  design: IconFieldDesign,
  marketing: IconFieldMarketing,
  business: IconFieldBusiness,
  hr: IconFieldHr,
  product: IconFieldProduct,
  "cyber-cloud": IconFieldCyberCloud,
  "sales-supply": IconFieldSalesSupply,
  ...WAVE2_FIELD_ICONS,
  professional: IconFieldProfessional,
} as const satisfies Record<FieldId, ComponentType<IconProps>>;

/** The loot starts landing once the header and the results tile have come into focus. */
const LOOT_START = 0.3;
/** One card after another (LootReveal's own step for groups of up to eight). */
const LOOT_STEP = 0.06;
/** A card's last star lands just after the card itself. */
const STAR_AFTER = 0.28;
/** The stats count while the tile comes into focus. */
const COUNT_DELAY = 0.2;
/** The XP coin lands (the pop verb: you earned this) once the counts are under way. */
const COIN_DELAY = 0.45;
const coinIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { default: { ...spring.pop, delay: COIN_DELAY }, opacity: { ...tween.fast, delay: COIN_DELAY } } },
};
/** The collection meter's new skills fill, one tick after another, as the first cards land. */
const COLLECT_MS = 450;

/** results-rise: a result block rises 12 px and comes into focus (playbook 3.6). */
const resultIn: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: tween.focus },
};

const catalogueIndex = new Map(SKILLS.map((s, i) => [s.id, i]));

/** Spec 6.4: grouped by field in 9.1 order; inside a field, more stars first. */
function groupsOf(skills: readonly CvSkill[]) {
  return FIELDS.map((field) => ({
    field,
    skills: skills
      .filter((s) => getSkill(s.skill).field === field.id)
      .toSorted((a, b) => b.stars - a.stars || (catalogueIndex.get(a.skill) ?? 0) - (catalogueIndex.get(b.skill) ?? 0)),
  })).filter((g) => g.skills.length > 0);
}

/** The +100 XP belongs to the analysis that earned it (spec 3.6: "first analysis only"). */
function earnedHere(user: UserState): boolean {
  const cv = user.cv;
  return cv !== null && user.xpEvents.some((e) => e.type === "cv_analysed" && e.at === cv.analysedAt);
}

/** A job's five requirements with the stars the user holds (spec 7.2): the five segments of its unlock meter. */
function requirementsOf(jobId: JobId, stars: StarMap): Requirement[] {
  return getJob(jobId).requirements.map((r) => ({ name: getSkill(r.skill).name, have: stars[r.skill], need: r.stars }));
}

export function CvResults({ fresh, onReanalyse }: { readonly fresh: FreshResult | null; readonly onReanalyse: () => void }): ReactNode {
  const user = useCurrentUser();
  const clock = useClock();
  const go = useGo();
  const instant = useInstant();
  const advisorBusy = useUi((s) => s.advisorBusy);
  const [confirmJob, setConfirmJob] = useState<JobId | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const cv = user?.cv ?? null;
  const groups = useMemo(() => groupsOf(cv?.skills ?? []), [cv]);
  // «أفضل الوظائف لمهاراتك»: the CV's skills decide here (highest match first, the usual ties), not the goal's field
  // (the jobs page puts the goal's field first; this heading promises jobs for the skills, CV tester 21 Nov 2026)
  const best = useMemo(() => (user ? [...rankJobs(user)].sort((a, b) => b.match - a.match).slice(0, 3) : []), [user]);
  const stars = useMemo(() => (user ? skillStars(user) : null), [user]);
  const step = useMemo(() => (user ? nextStep(user) : null), [user]);

  const held = stars ? skillsHeld(stars) : 0;
  const play = fresh !== null && !instant;
  // the collection meter fills from the count before this analysis, as the first cards land
  const [collected, setCollected] = useState(() => (fresh !== null && play ? Math.max(0, held - fresh.newSkills) : held));
  useEffect(() => {
    if (collected === held) return;
    const timer = window.setTimeout(() => setCollected(held), play ? COLLECT_MS : 0);
    return () => window.clearTimeout(timer);
  }, [collected, held, play]);

  // after a show, focus lands on the result's heading (the stage it replaced held the focus)
  useEffect(() => {
    if (fresh) headingRef.current?.focus({ preventScroll: true });
  }, [fresh]);

  if (!user || !cv || !stars) return null;

  const count = cv.skills.length;
  const starCount = totalStars(stars);
  const match = targetMatch(user) ?? 0;
  const target = user.targetJobId;
  const from = fresh?.matchBefore ?? 0;
  const xp = fresh ? fresh.xpGained : earnedHere(user) ? XP.cv_analysed : 0;
  const others = best.filter((j) => !j.isTarget).slice(0, target !== null && best.some((j) => j.isTarget) ? 2 : 3);
  const next = step ? nextLine(step) : null;
  const blocks = 3 + groups.length + (target ? 3 : 1) + 1 + others.length;
  const enter = fresh ? "hidden" : false;

  const askToApply = (jobId: JobId) => useUi.getState().askAdvisor({ text: ASK_ADVISOR_APPLY_TEXT, chip: { intent: "apply", jobId } });
  const setTarget = (jobId: JobId) => {
    setConfirmJob(jobId);
    setConfirmOpen(true);
  };
  const appliedOf = (jobId: JobId) => {
    const app = user.applications.find((a) => a.jobId === jobId);
    return app ? { status: APPLICATION_STATUS_COPY[applicationStatus(app, clock.now)].label, xp: app.xpPaid } : undefined;
  };

  // the loot lands card after card across the groups, in reading order
  let landed = 0;
  const loot = groups.map(({ field, skills }) => {
    const Icon = FIELD_ICON[field.id];
    const first = landed;
    landed += skills.length;
    return (
      <section aria-labelledby={`cv-field-${field.id}`} className="flex flex-col gap-3" key={field.id}>
        <motion.h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-title text-fg" id={`cv-field-${field.id}`} variants={resultIn}>
          <Icon className="text-fg-2" size={20} waypoint="off" />
          {field.name}
          <span className="text-small font-normal text-fg-3">· {fieldCount(skills.length)}</span>
        </motion.h3>
        <LootReveal className="grid gap-3 @min-[34rem]/haul:grid-cols-2" delay={LOOT_START + first * LOOT_STEP} play={play}>
          {skills.map((s, i) => {
            const info = getSkill(s.skill);
            return (
              <LootCard
                delay={LOOT_START + (first + i) * LOOT_STEP + STAR_AFTER}
                evidence={s.evidence}
                evidenceTestId={TID.cv.evidence(s.skill)}
                fresh={play}
                icon={<Icon size={20} waypoint="off" />}
                key={s.skill}
                name={info.name}
                slots={info.maxStars}
                stars={s.stars}
                testId={TID.cv.skill(s.skill)}
              />
            );
          })}
        </LootReveal>
      </section>
    );
  });

  const haulTile = (
    <motion.div className="@container/haul order-1" variants={resultIn}>
      <Tile faceClassName="gap-5 p-card" interactive={false}>
        <dl className={cn("grid gap-x-4 gap-y-4", xp > 0 ? "grid-cols-2 @min-[34rem]/haul:grid-cols-3" : "grid-cols-2")}>
          <Stat label={foundLabel(count)}>
            <NumberTicker from={play ? 0 : undefined} delay={COUNT_DELAY} value={count} />
          </Stat>
          <Stat className="border-s border-border ps-4" label={starsLabel(starCount)}>
            <NumberTicker from={play ? 0 : undefined} delay={COUNT_DELAY} value={starCount} />
            <IconStarFilled className="text-fg" size={22} waypoint="off" />
          </Stat>
          {xp > 0 ? (
            <Stat
              className="col-span-2 flex-row items-center justify-between gap-3 border-t border-border pt-4 @min-[34rem]/haul:col-span-1 @min-[34rem]/haul:flex-col @min-[34rem]/haul:items-start @min-[34rem]/haul:justify-start @min-[34rem]/haul:gap-1 @min-[34rem]/haul:border-s @min-[34rem]/haul:border-t-0 @min-[34rem]/haul:pt-0 @min-[34rem]/haul:ps-4"
              label={HAUL_COPY.xpEarned}
              tone="xp"
            >
              {/* an earned reward lands (it does not count up from «+0»): the coin and its amount pop once */}
              <motion.span animate="show" className="inline-flex items-center gap-2" initial={play ? "hidden" : false} variants={coinIn}>
                <XpCoin size={30} />
                <bdi className="tabular-nums" dir="ltr">
                  +{formatNumber(xp)} XP
                </bdi>
              </motion.span>
            </Stat>
          ) : null}
        </dl>
        <CollectionMeter have={collected} label={HAUL_COPY.collection} total={SKILLS.length} />
      </Tile>
    </motion.div>
  );

  const targetBlock = target ? (
    <section aria-labelledby="cv-target" className="order-2 flex flex-col gap-3">
      <motion.h3 className="text-title text-fg" id="cv-target" variants={resultIn}>
        {HAUL_COPY.targetHeading}
      </motion.h3>
      <motion.div className="flex flex-col gap-3" variants={resultIn}>
        <JobDestination applied={appliedOf(target)} job={{ jobId: target, match }} matchFrom={fresh ? from : undefined} stars={stars} target />
        <JobActions advisorBusy={advisorBusy} jobId={target} onApply={() => askToApply(target)} />
      </motion.div>
      <motion.div className="mt-1 flex flex-col gap-2.5" variants={resultIn}>
        <Button className="w-full" data-testid={TID.cv.goPath} icon={<IconArrowForward size={20} />} onClick={() => go(hrefFor({ screen: "path" }))} size="lg">
          {CV_COPY.goPath}
        </Button>
        <p className="flex flex-col gap-0.5 text-small text-fg-2">
          <span className="font-semibold text-fg" data-testid={TID.cv.targetMatch} data-value={match}>
            <span className="sr-only">{targetLine(getJob(target).title, match)}</span>
            <span aria-hidden>
              <Bidi text={targetLineLead(getJob(target).title)} />
              {/* counted with exactly the ring's timing, so the line and the ring never show two numbers */}
              <RingPercent from={fresh ? from : match} value={match} />
            </span>
          </span>
          {next ? (
            <span>
              <BidiLine text={next} />
            </span>
          ) : null}
        </p>
      </motion.div>
    </section>
  ) : (
    <motion.div className="order-2" variants={resultIn}>
      <Button className="w-full" data-testid={TID.cv.goPath} icon={<IconArrowForward size={20} />} onClick={() => go(hrefFor({ screen: "path" }))} size="lg">
        {CV_COPY.goPath}
      </Button>
    </motion.div>
  );

  const bestBlock = (
    <section aria-labelledby="cv-best-jobs" className="@container/best order-4 flex flex-col gap-3">
      <motion.div className="flex items-center justify-between gap-3" variants={resultIn}>
        <h3 className="text-title text-fg" id="cv-best-jobs">
          {CV_COPY.jobsHeading}
        </h3>
        <Button data-testid={TID.cv.goJobs} onClick={() => go(hrefFor({ screen: "jobs" }))} size="sm" variant="ghost">
          {CV_COPY.goJobs}
        </Button>
      </motion.div>
      <ul className="grid gap-x-5 gap-y-7 pt-2 @min-[34rem]/best:grid-cols-2">
        {others.map((job) => (
          <motion.li className="flex min-w-0 flex-col gap-3" key={job.jobId} variants={resultIn}>
            <JobDestination applied={appliedOf(job.jobId)} className="flex-1" job={job} stars={stars} />
            <JobActions advisorBusy={advisorBusy} jobId={job.jobId} onApply={() => askToApply(job.jobId)} onSetTarget={() => setTarget(job.jobId)} />
          </motion.li>
        ))}
      </ul>
    </section>
  );

  return (
    <motion.div
      animate="show"
      className="mx-auto flex w-full max-w-[72rem] flex-col gap-section px-gutter py-6 @min-[900px]/content:py-8"
      data-testid={TID.cv.results}
      data-value={count}
      initial={enter}
      variants={group(staggerStep(blocks, 0.08))}
    >
      <motion.header className="flex flex-col gap-1.5" variants={resultIn}>
        <h1 className="text-h1 lg:sr-only">{PAGE_HEADINGS.cv}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-h2 outline-none @min-[900px]/content:text-h1" ref={headingRef} tabIndex={-1}>
            {resultsHeading(count, cv.isSample)}
          </h2>
        </div>
        <p className="text-small text-fg-3" data-testid={TID.cv.engine}>
          {cv.engine === "model" ? CV_COPY.engineModel : CV_COPY.engineLocal}
        </p>
      </motion.header>

      {/* Narrow: the wrappers are `contents`, so their children order as one column (tile, target, loot, jobs). Wide: two
          columns, the haul with the other jobs under it, and the 340 px column of the target and the one primary, which
          stays in view while the haul scrolls (DESIGN 4.0: the action card of the side column is sticky). */}
      <div className="flex flex-col gap-section @min-[900px]/content:grid @min-[900px]/content:grid-cols-[minmax(0,1fr)_21.25rem] @min-[900px]/content:items-start @min-[900px]/content:gap-8">
        <div className="contents @min-[900px]/content:flex @min-[900px]/content:flex-col @min-[900px]/content:gap-8">
          {haulTile}
          <div className="@container/haul order-3 flex flex-col gap-7">{loot}</div>
          {bestBlock}
        </div>
        <div className="contents @min-[900px]/content:sticky @min-[900px]/content:top-[calc(var(--shell-top)+1.5rem)] @min-[900px]/content:flex @min-[900px]/content:flex-col">
          {targetBlock}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5">
        <span className="text-small text-fg-3">{lastAnalysed(historyStamp(cv.analysedAt, clock.now))}</span>
        <Button data-testid={TID.cv.reanalyse} icon={<IconRetry size={18} />} iconPosition="start" onClick={onReanalyse} size="sm" variant="ghost">
          {CV_COPY.reanalyse}
        </Button>
      </footer>

      {confirmJob ? <ConfirmTargetDialog jobId={confirmJob} onOpenChange={setConfirmOpen} open={confirmOpen} /> : null}
    </motion.div>
  );
}

/** One number of the results tile, its words under it. */
function Stat({ label, tone = "ink", className, children }: { readonly label: string; readonly tone?: "ink" | "xp"; readonly className?: string; readonly children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <dt className="order-2 text-small text-fg-2">{label}</dt>
      <dd className={cn("order-1 flex items-center gap-2 text-h2 font-bold tabular-nums", tone === "xp" ? "text-xp-fg" : "text-fg")}>{children}</dd>
    </div>
  );
}

/** A job as a destination (the whole card opens its job; spec 3.6 "every card opens its job when clicked"). */
function JobDestination({
  job,
  stars,
  target = false,
  matchFrom,
  applied,
  className,
}: {
  readonly className?: string;
  readonly job: Pick<RankedJob, "jobId" | "match">;
  readonly stars: StarMap;
  readonly target?: boolean;
  readonly matchFrom?: number;
  readonly applied?: { readonly status: string; readonly xp: number };
}) {
  const info = getJob(job.jobId);
  const Icon = FIELD_ICON[info.field];
  return (
    <DestinationCard
      applied={applied}
      city={getJobCity(info.city).name}
      className={className}
      company={info.company}
      experience={BAND_LABEL[info.band]}
      icon={<Icon size={22} waypoint="off" />}
      match={job.match}
      matchFrom={matchFrom}
      maxGems={2}
      render={<CardLink href={hrefFor({ screen: "job", jobId: job.jobId })} />}
      skills={requirementsOf(job.jobId, stars)}
      target={target}
      testId={TID.cv.job(job.jobId)}
      title={info.title}
    />
  );
}

/** The card's link: a NavLink (the route transition plays) whose children come from the card it renders. */
function CardLink({ href, children, ...rest }: Omit<ComponentProps<"a">, "href"> & { readonly href: string }): ReactNode {
  return (
    <NavLink {...rest} href={href}>
      {children}
    </NavLink>
  );
}

/** The card's own buttons, under it: «دع دليلك يقدّم عنك» on every card, «اجعلها هدفي» on the others (spec 3.6). */
function JobActions({ jobId, advisorBusy, onApply, onSetTarget }: { readonly jobId: JobId; readonly advisorBusy: boolean; readonly onApply: () => void; readonly onSetTarget?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 ps-1">
      <Button data-testid={TID.cv.jobApplyAdvisor(jobId)} disabled={advisorBusy} icon={<IconAdvisor size={18} />} iconPosition="start" onClick={onApply} size="sm" variant="secondary">
        {CV_COPY.applyAdvisor}
      </Button>
      {onSetTarget ? (
        <Button data-testid={TID.cv.jobSetTarget(jobId)} onClick={onSetTarget} size="sm" variant="ghost">
          {CV_COPY.setTarget}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The percentage in the target line, counted with exactly the target ring's own timing (tween.draw from its first paint),
 * so the sentence and the ring above it never show two numbers (playbook 0.6: the ring and its number are one value).
 */
function RingPercent({ value, from }: { readonly value: number; readonly from: number }) {
  const instant = useInstant();
  const mv = useMotionValue(from);
  const text = useTransform(() => formatPercent(Math.round(mv.get())));
  useEffect(() => {
    if (instant) {
      mv.jump(value);
      return;
    }
    const controls = animate(mv, value, tween.draw);
    return () => controls.stop();
  }, [instant, mv, value]);
  return (
    <motion.bdi className="inline-block tabular-nums" data-value={value} dir="ltr">
      {text}
    </motion.bdi>
  );
}
