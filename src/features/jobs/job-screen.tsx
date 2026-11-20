"use client";
// Owner: jobs. `/jobs/[id]` (spec 3.8): the gap for one job in three plain parts, and «دليلك» applying for the user (7.4).
// Drawn as a destination you unlock (docs/GAME-LAYER.md 5.3.6): under the title, the job's five requirements as the five
// segments of its unlock meter, each skill written under its segment with its stars (the ring's number, explained to the
// point); the gap as skill gems (met, partial, locked) and the courses that close it as quests on a trail.
// Order: on a wide content area (900 px and up) the content column (back link, header, the gap, «عن الوظيفة») and the
// 340 px action card beside it, sticky (DESIGN 4.0); narrower, one column in the spec's phone order: header and ring
// first, then the actions, then the three gap blocks, then «عن الوظيفة». On a phone «دع دليلك يقدّم عنك» is pinned to the
// bottom, directly above the tab bar, while scrolling (only one copy of the button is ever rendered).
// `?apply=1` opens the apply sheet already filled; `#missing` scrolls to «ما ينقصك» («شاهد الفجوة»). An unknown id renders
// the shell's not-found block.
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Tile, UnlockMeter, type Requirement as GameRequirement } from "@/components/game";
import { IconAdvisor, IconArrowBack, IconCompany, IconExperience, IconExternal } from "@/components/icons";
import { NavLink, PageTransition } from "@/components/motion";
import { Button, buttonStyles } from "@/components/ui";
import { CompanyLogo, ConfirmTargetDialog, NotFoundBlock, useViewport } from "@/features/shared";
import { ASK_ADVISOR_APPLY_TEXT, BAND_LABEL, JOB_SOURCE_COPY, companyCityLine, countNounBare, dayKeyText } from "@/lib/copy";
import { getField, getJob, getSkill } from "@/lib/data";
import { applicationStatus, jobGap, nextStep, projectedMatch, skillStars, totalStars } from "@/lib/engine";
import { asJobId, hrefFor } from "@/lib/routes";
import { useClock, useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { JobId, Requirement, UserState } from "@/lib/types";

import { ApplySheet } from "./apply-sheet";
import { JOB_COPY } from "./copy";
import { installDevApply } from "./dev-apply";
import { GapBlocks } from "./gap-blocks";
import { MatchCard } from "./match-card";
import { FieldIcon, LtrNumbers, jobRequirements } from "./parts";
import { useApplyFlow } from "./use-apply-flow";

export function JobScreen({ id }: { id: string }): ReactNode {
  const user = useCurrentUser();
  if (!user) return null; // the Guard renders nothing once signed out; children may assume a user
  const jobId = asJobId(id);
  if (jobId === null) {
    return (
      <PageTransition>
        <NotFoundBlock />
      </PageTransition>
    );
  }
  return <JobDetail jobId={jobId} user={user} />;
}

function JobDetail({ jobId, user }: { jobId: JobId; user: UserState }): ReactNode {
  const job = getJob(jobId);
  const params = useSearchParams();
  const clock = useClock();
  const { desktop } = useViewport();
  const advisorBusy = useUi((s) => s.advisorBusy);

  const gap = useMemo(() => jobGap(jobId, user), [jobId, user]);
  const stars = useMemo(() => skillStars(user), [user]);
  const hasStar = totalStars(stars) > 0;
  const requirements = useMemo(() => jobRequirements(jobId, stars), [jobId, stars]);
  // the trail's nodes: the match after each course row, taking the rows in order (the last one closes the gap)
  const trail = useMemo(() => {
    let raised: Requirement[] = [];
    return gap.rows.map((row) => {
      raised = [...raised, { skill: row.skill, stars: row.star }];
      return projectedMatch(jobId, raised, user);
    });
  }, [gap, jobId, user]);

  const application = user.applications.find((a) => a.jobId === jobId) ?? null;
  const status = application ? applicationStatus(application, clock.now) : null;
  const isTarget = user.targetJobId === jobId;
  const step = useMemo(() => nextStep(user), [user]);
  const nextHere = step.rule === 4 && step.jobId === jobId;

  const [preview, setPreview] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState(false);

  const scrollToMissing = () => {
    window.setTimeout(
      () => document.getElementById("missing")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      180,
    );
  };
  const flow = useApplyFlow(jobId, user, (reason) => {
    if (reason === "gap") scrollToMissing();
  });

  // `?apply=1` (the map's «قدّم بنفسك», QA): the sheet opens already filled, once per mount
  const autoOpened = useRef(false);
  const wantsApply = params.get("apply") === "1";
  useEffect(() => {
    if (!wantsApply || autoOpened.current || application !== null) return;
    autoOpened.current = true;
    flow.openUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsApply]);

  // `#missing` («شاهد الفجوة» from «دليلك»): scroll to the block once the page has risen
  useEffect(() => {
    if (window.location.hash !== "#missing") return;
    const timer = window.setTimeout(
      () => document.getElementById("missing")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      320,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => installDevApply(), []);

  const pinned = !desktop && application === null;

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-[72rem] px-gutter pt-4 pb-14 @min-[900px]/content:pt-2">
        <NavLink
          className={buttonStyles({
            variant: "ghost",
            size: "sm",
            className: "-ms-1",
          })}
          data-testid={TID.job.back}
          href={hrefFor({ screen: "jobs" })}
        >
          <IconArrowBack size={18} />
          {JOB_COPY.back}
        </NavLink>

        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-8 @min-[900px]/content:grid-cols-[minmax(0,1fr)_21.25rem] @min-[900px]/content:grid-rows-[auto_auto_1fr]">
          <JobHeader jobId={jobId} match={gap.match} requirements={requirements} />

          <div className="@min-[900px]/content:col-start-2 @min-[900px]/content:row-span-3 @min-[900px]/content:row-start-1">
            <div className="@min-[900px]/content:sticky @min-[900px]/content:top-[calc(var(--shell-top)+1.5rem)]">
              <MatchCard
                isTarget={isTarget}
                jobId={jobId}
                match={gap.match}
                nextHere={nextHere}
                onApplySelf={flow.openUser}
                onSetTarget={() => setConfirmTarget(true)}
                preview={preview}
                showPrimary={!pinned}
                paidXp={application?.xpPaid ?? null}
                status={status}
                user={user}
              />
            </div>
          </div>

          <div className="@min-[900px]/content:col-start-1 @min-[900px]/content:row-start-2">
            <GapBlocks
              gap={gap}
              hasStar={hasStar}
              jobId={jobId}
              onPreview={setPreview}
              preview={preview}
              trail={trail}
              user={user}
            />
          </div>

          <About jobId={jobId} />
        </div>

        {pinned ? (
          <div className="sticky bottom-(--shell-bottom) z-sticky -mx-gutter mt-8 border-t border-border bg-bg px-gutter pt-3 pb-7">
            <Button
              className="w-full"
              data-testid={TID.job.applyAdvisor}
              disabled={advisorBusy}
              icon={<IconAdvisor size={20} />}
              iconPosition="start"
              onClick={() =>
                useUi.getState().askAdvisor({
                  text: ASK_ADVISOR_APPLY_TEXT,
                  chip: { intent: "apply", jobId },
                })
              }
            >
              {job.real ? JOB_COPY.applyAdvisorReal : JOB_COPY.applyAdvisor}
            </Button>
          </div>
        ) : null}
      </main>

      <ApplySheet flow={flow} have={gap.have} jobId={jobId} match={gap.match} onSeeGap={flow.seeGap} user={user} />
      <ConfirmTargetDialog jobId={jobId} onOpenChange={setConfirmTarget} open={confirmTarget} />
    </PageTransition>
  );
}

/**
 * Header (spec 3.8): job title · «{company} · {city}» (a real job: the company's own name in small type) · tags: the field,
 * the experience label. A real job then shows where it was posted: the site, the posting date and «افتح الإعلان الأصلي»
 * (a new tab). Under it the
 * destination's lock: the unlock meter, one segment per requirement filled by the stars held ÷ the stars required (spec
 * 7.2), the skills written under their segments (from 640 px; on a phone the gems below name them), «تستوفي 3 من 5
 * متطلبات», and the lock that opens at 100%.
 */
function JobHeader({
  jobId,
  match,
  requirements,
}: {
  jobId: JobId;
  match: number;
  requirements: readonly GameRequirement[];
}): ReactNode {
  const job = getJob(jobId);
  return (
    <header className="flex min-w-0 flex-col gap-3 @min-[900px]/content:col-start-1 @min-[900px]/content:row-start-1">
      <div className="flex items-center gap-4">
        <CompanyLogo jobId={jobId} size={56} />
        <h1 className="min-w-0 text-h2 text-fg @min-[600px]/content:text-h1" data-testid={TID.job.title}>
          {job.title}
        </h1>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-fg-2">
        <IconCompany className="shrink-0 text-fg-3" size={20} waypoint="muted" />
        <span>{companyCityLine(jobId)}</span>
        {job.companyEn ? (
          <bdi className="text-small text-fg-3" data-testid="job-company-en" dir="ltr">
            {job.companyEn}
          </bdi>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong ps-2.5 pe-3 text-small font-medium text-fg-2">
          <FieldIcon className="text-fg-2" field={job.field} size={17} />
          {getField(job.field).name}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong ps-2.5 pe-3 text-small font-medium text-fg-2">
          <IconExperience className="text-fg-2" size={17} waypoint="muted" />
          <LtrNumbers text={BAND_LABEL[job.band]} />
        </span>
      </div>
      {job.real ? <PostingSource jobId={jobId} /> : null}
      <Tile className="mt-3" faceClassName="px-card pt-4 pb-3.5" interactive={false}>
        <UnlockMeter labels size="md" skills={requirements} testId="job-unlock" value={match} />
      </Tile>
    </header>
  );
}

/** A real job's source: the site, the posting date, the link to the original posting (a new tab). */
function PostingSource({ jobId }: { jobId: JobId }): ReactNode {
  const job = getJob(jobId);
  const source = job.source;
  if (!source) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="job-source">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-fg-2">
        <span>
          {JOB_SOURCE_COPY.sourceLabel}: <bdi className="font-medium text-fg">{source.site}</bdi>
        </span>
        {source.postedAt ? (
          <>
            <span aria-hidden className="text-fg-4">
              ·
            </span>
            <span>{JOB_SOURCE_COPY.posted(dayKeyText(source.postedAt))}</span>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          className={buttonStyles({ variant: "secondary", size: "sm" })}
          data-testid="job-posting-link"
          href={source.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {JOB_SOURCE_COPY.openPosting}
          <IconExternal size={18} waypoint="off" />
        </a>
      </div>
    </div>
  );
}

/** A real job: each requirement with the posting's own sentence it was read from (so the user sees why). */
function PostingEvidence({ jobId }: { jobId: JobId }): ReactNode {
  const job = getJob(jobId);
  if (!job.real) return null;
  return (
    <div className="mt-4 flex max-w-2xl flex-col gap-3" data-testid="job-evidence">
      <h3 className="text-title text-fg">{JOB_SOURCE_COPY.evidenceTitle}</h3>
      <p className="text-small text-fg-3">{JOB_SOURCE_COPY.evidenceLine}</p>
      {job.titleEn || job.place ? (
        <dl className="flex flex-col gap-1 text-small text-fg-2">
          {job.titleEn ? (
            <div className="flex flex-wrap gap-x-2">
              <dt>{JOB_SOURCE_COPY.titleLabel}:</dt>
              <dd className="m-0">
                <bdi dir="ltr">{job.titleEn}</bdi>
              </dd>
            </div>
          ) : null}
          {job.place ? (
            <div className="flex flex-wrap gap-x-2">
              <dt>{JOB_SOURCE_COPY.placeLabel}:</dt>
              <dd className="m-0">
                <bdi dir="ltr">{job.place}</bdi>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <ul className="flex flex-col gap-3">
        {job.requirements.map((r) => (
          <li className="flex flex-col gap-1.5 rounded-card border border-border bg-surface px-4 py-3" data-skill={r.skill} key={r.skill}>
            <span className="flex flex-wrap items-baseline gap-x-2 text-body font-semibold text-fg">
              <bdi>{getSkill(r.skill).name}</bdi>
              <span className="text-small font-normal text-fg-3">
                <LtrNumbers text={`المطلوب: ${countNounBare(r.stars, "star")}`} />
              </span>
            </span>
            {r.evidence ? (
              <blockquote className="border-s-2 border-border-strong ps-3 text-small text-fg-2" dir="ltr" lang="en">
                “{r.evidence}”
              </blockquote>
            ) : null}
          </li>
        ))}
      </ul>
      {job.source?.note ? (
        <p className="flex flex-col gap-1 text-small text-fg-3" data-testid="job-source-note">
          <span>{JOB_SOURCE_COPY.sourceNote}</span>
          <bdi className="block" dir="ltr" lang="en">
            {job.source.note}
          </bdi>
        </p>
      ) : null}
    </div>
  );
}

/** «عن الوظيفة»: one summary sentence; «المهام»: three lines. */
function About({ jobId }: { jobId: JobId }): ReactNode {
  const job = getJob(jobId);
  return (
    <section
      aria-labelledby="job-about"
      className="flex min-w-0 flex-col gap-3 @min-[900px]/content:col-start-1 @min-[900px]/content:row-start-3"
    >
      <h2 className="text-h3 text-fg" id="job-about">
        {JOB_COPY.about}
      </h2>
      <p className="max-w-2xl text-body text-fg-2">{job.summary}</p>
      <h3 className="mt-2 text-title text-fg">{JOB_COPY.tasks}</h3>
      <ul className="flex max-w-2xl flex-col gap-2.5">
        {job.tasks.map((task) => (
          <li className="flex items-start gap-3 text-body text-fg-2" key={task}>
            <span aria-hidden className="mt-[0.7em] size-2 shrink-0 rounded-full border-2 border-fg-3" />
            <span>{task}</span>
          </li>
        ))}
      </ul>
      <PostingEvidence jobId={jobId} />
    </section>
  );
}
