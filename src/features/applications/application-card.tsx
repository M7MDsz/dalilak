"use client";
// Owner: applications. One application (spec 3.9 "Application card"), in the spec's reading order: job title · company
// · «رقم الطلب …» · «قدّمت …» · the three-step track · the status note · the match when sent and now
// (and «ارتفعت من … إلى … منذ التقديم» when it rose) · «قدّم عنك دليلك» · «عرض الوظيفة» · «انقل للخطوة التالية»
// (hidden at the last step) · «شاهد الفجوة» when closed.
//
// `status-advance`: the status is derived (engine applicationStatus, clock refreshed every 5 s by the screen). The card
// SHOWS a status that follows the real one: on arrival it starts from the status this page last showed for this
// application (seen.applicationStatus; never shown → «محفوظ», which the user saw on the confirmation) and moves to the real
// one after the page has risen; later changes (the 5 s tick, the simulation control) move it at once. First the track
// draws and its marker rides to the new step (the cause), then the status label and the note roll (the meaning). The
// marker is written back to seen.applicationStatus once the change has been shown. data-state is final from frame one.
//
// Real jobs: an application to a REAL posting was prepared here and is sent by the user from the original posting. Its
// card says so («جهّزه دليلك، وأرسله أنت من الإعلان الأصلي») with the link, and shows no track and no status note:
// nobody is pretended to review it. The practice job keeps a track of the user's own progress («محفوظ» → «جاهز» →
// «الاستعداد»): no company stands behind it, so no step says it was sent, received or reviewed.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { DaleelGlyph } from "@/components/chat";
import { IconArrowForward, IconArrowUp, IconCheckCircle, IconClock, IconExternal, IconFile, IconInfo } from "@/components/icons";
import { NavLink, Roll, useInstant } from "@/components/motion";
import { Button, buttonStyles, cn } from "@/components/ui";
import { JobTag } from "@/features/shared";
import { APPLICATION_STATUS_COPY, JOB_SOURCE_COPY, relativeTime } from "@/lib/copy";
import { getJob } from "@/lib/data";
import { applicationStatus, jobMatch, makeClock, nextApplicationStatus } from "@/lib/engine";
import { bidiNumbers, formatPercent } from "@/lib/format";
import { tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { selectCurrentUser, useAppStore } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { Application, ApplicationStatus, Clock, JobId, UserState } from "@/lib/types";

import { APPLICATIONS_COPY, matchRoseText } from "./copy";
import { StatusTrack } from "./status-track";

/** On arrival the track waits for the page's rise (260 ms) before it moves. */
const ARRIVAL_DELAY_MS = 520;
/** The label and the note roll once the marker has reached its step. */
const MEANING_DELAY_MS = 420;
/** Remember what was shown only after the change has played. */
const SEEN_AFTER_MS = 1400;

export function ApplicationCard({ application, user, clock }: { readonly application: Application; readonly user: UserState; readonly clock: Clock }): ReactNode {
  const { jobId } = application;
  const job = getJob(jobId);
  const status = applicationStatus(application, clock.now);
  const next = nextApplicationStatus(application, clock.now);
  const shown = useShownStatus(jobId, status);
  const instant = useInstant();
  const meaning = useLagged(shown, instant ? 0 : MEANING_DELAY_MS);
  const matchThen = application.matchAtSend;
  const matchNow = jobMatch(jobId, user);
  const cardRef = useRef<HTMLElement>(null);
  const source = job.real ? job.source : undefined;

  const advance = () => {
    const after = nextApplicationStatus(application, makeClock().now);
    useAppStore.getState().advanceApplication(jobId);
    // The control disappears at the last status: keep keyboard focus on the card's next control.
    if (after === "shortlisted" || after === "closed") {
      window.requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>(`[data-testid="${TID.applications.openJob(jobId)}"]`)?.focus());
    }
  };

  return (
    <article
      aria-labelledby={`application-${jobId}`}
      className="grid overflow-hidden rounded-card border border-border bg-surface @min-[900px]/content:grid-cols-[minmax(0,1fr)_18rem] @min-[900px]/content:grid-rows-[auto_1fr]"
      data-testid={TID.applications.item(jobId)}
      ref={cardRef}
    >
      {/* the application and where it stands */}
      <div className="flex min-w-0 flex-col gap-6 p-card @min-[640px]/content:p-7 @min-[900px]/content:col-start-1 @min-[900px]/content:row-start-1 @min-[900px]/content:pb-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-h3 text-fg" id={`application-${jobId}`}>
                {job.title}
              </h2>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-fg-2">
                <span>{job.company}</span>
                <JobTag jobId={jobId} />
              </p>
            </div>
            {source ? <PreparedLabel jobId={jobId} /> : <StatusLabel jobId={jobId} shown={meaning} status={status} />}
          </div>
          <p className="text-small text-fg-3">
            {APPLICATIONS_COPY.numberLabel}{" "}
            <bdi className="font-semibold text-fg-2 tabular-nums" data-testid={TID.applications.number(jobId)} dir="ltr">
              {application.number}
            </bdi>
            <span aria-hidden className="mx-2 text-fg-4">
              ·
            </span>
            {APPLICATIONS_COPY.sentPrefix} {relativeTime(application.sentAt, clock.now)}
          </p>
        </header>

        {source ? (
          <Prepared by={application.by} url={source.url} user={user} />
        ) : (
        <div className="flex flex-col gap-3">
          <StatusTrack className="max-w-[36rem]" status={shown} />
          <StatusNote status={meaning} />
          {/* closed: the note comes with «شاهد الفجوة» (the job page at «ما ينقصك»); a second try is not offered */}
          <AnimatePresence initial={false}>
            {meaning === "closed" ? (
              <motion.div animate={{ opacity: 1, y: 0 }} className="flex" initial={{ opacity: 0, y: 8 }} key="gap" transition={tween.move}>
                <NavLink className={buttonStyles({ variant: "secondary", size: "sm" })} href={hrefFor({ screen: "job", jobId, focus: "missing" })}>
                  {APPLICATIONS_COPY.seeGap}
                </NavLink>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        )}
      </div>

      {/* the match then and now, who sent it, and what to do with it */}
      <div className="flex flex-col gap-5 border-t border-border p-card @min-[640px]/content:px-7 @min-[900px]/content:col-start-2 @min-[900px]/content:row-span-2 @min-[900px]/content:row-start-1 @min-[900px]/content:border-s @min-[900px]/content:border-t-0 @min-[900px]/content:p-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @min-[900px]/content:grid-cols-1">
          <MatchFact label={APPLICATIONS_COPY.matchThen} testId={TID.applications.matchThen(jobId)} value={matchThen} />
          <MatchFact label={APPLICATIONS_COPY.matchNow} testId={TID.applications.matchNow(jobId)} value={matchNow} />
        </dl>
        {matchNow > matchThen ? (
          <p className="-mt-1 flex items-start gap-1.5 text-small font-medium text-ok-fg">
            <IconArrowUp className="mt-0.5 shrink-0" size={18} waypoint="off" />
            <span>{matchRoseText(matchThen, matchNow)}</span>
          </p>
        ) : null}

        {application.by === "advisor" && !source ? <ByAdvisor user={user} /> : null}

        <div className="flex flex-wrap gap-2.5 @min-[900px]/content:flex-col @min-[900px]/content:items-stretch">
          <NavLink className={buttonStyles({ variant: "secondary", size: "sm" })} data-testid={TID.applications.openJob(jobId)} href={hrefFor({ screen: "job", jobId })}>
            {APPLICATIONS_COPY.openJob}
          </NavLink>
          <AnimatePresence initial={false}>
            {next !== null ? (
              <motion.div exit={{ opacity: 0, transition: tween.exit }} key="advance">
                <Button
                  className="w-full"
                  data-testid={TID.applications.advance(jobId)}
                  icon={<IconArrowForward size={18} />}
                  onClick={advance}
                  size="sm"
                  variant="ghost"
                >
                  {APPLICATIONS_COPY.advance}
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* what was sent: the note as written (spec 7.4) and the CV line, the record's own strings, so the card reads as a
          real application. Last in reading order (after the facts the spec lists); on desktop under the track. */}
      <figure className="flex flex-col gap-2 border-t border-border p-card @min-[640px]/content:px-7 @min-[900px]/content:col-start-1 @min-[900px]/content:row-start-2 @min-[900px]/content:border-t-0 @min-[900px]/content:pt-0 @min-[900px]/content:pb-7">
        <div className="flex max-w-[40rem] flex-col gap-2 border-s-2 border-border ps-4">
          <blockquote className="text-small text-fg-2">{bidiNumbers(application.note)}</blockquote>
          <figcaption className="inline-flex items-center gap-1.5 text-small text-fg-3">
            <IconFile className="shrink-0" size={18} waypoint="muted" />
            {application.cvLine}
          </figcaption>
        </div>
      </figure>
    </article>
  );
}

/** The status in words, with its mark. Carries the REAL status in data-state; the words roll when the shown one moves. */
function StatusLabel({ jobId, status, shown }: { readonly jobId: JobId; readonly status: ApplicationStatus; readonly shown: ApplicationStatus }): ReactNode {
  const won = shown === "shortlisted";
  return (
    <span
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border ps-3 pe-3.5 text-small font-semibold",
        won ? "border-ok text-ok-fg" : "border-border-strong text-fg",
      )}
      data-state={status}
      data-testid={TID.applications.status(jobId)}
    >
      <StatusIcon status={shown} />
      <Roll id={shown}>{APPLICATION_STATUS_COPY[shown].label}</Roll>
    </span>
  );
}

function StatusIcon({ status }: { readonly status: ApplicationStatus }): ReactNode {
  switch (status) {
    case "sent":
      return <IconFile size={18} waypoint="muted" />;
    case "review":
      return <IconClock size={18} waypoint="muted" />;
    case "shortlisted":
      return <IconCheckCircle size={18} waypoint="muted" />;
    case "closed":
      return <IconInfo size={18} waypoint="muted" />;
  }
}

/** The note under the track; a status change rolls it (old line up and out, the new one up and in, 2 px of blur). */
function StatusNote({ status }: { readonly status: ApplicationStatus }): ReactNode {
  return (
    <div aria-live="polite" className="relative min-h-[1.85em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.p
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="max-w-[34rem] text-body text-fg-2"
          exit={{ opacity: 0, y: "-60%", filter: "blur(2px)", transition: tween.exit }}
          initial={{ opacity: 0, y: "60%", filter: "blur(2px)" }}
          key={status}
          transition={tween.move}
        >
          {APPLICATION_STATUS_COPY[status].note}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** «مطابقتك عند التقديم 90%» / «مطابقتك الآن 90%»: the label, then the number set large. */
function MatchFact({ label, value, testId }: { readonly label: string; readonly value: number; readonly testId: string }): ReactNode {
  return (
    <div className="flex flex-col gap-0.5" data-testid={testId} data-value={value}>
      <dt className="text-small text-fg-2">{label}</dt>
      <dd className="text-h2 leading-tight text-fg tabular-nums">
        <bdi dir="ltr">{formatPercent(value)}</bdi>
      </dd>
    </div>
  );
}

/** «قدّم عنك دليلك»: «دليلك»'s glyph pinned to the user's avatar (he acted on the user's behalf, spec 9.6). */
function ByAdvisor({ user }: { readonly user: UserState }): ReactNode {
  return (
    <p className="flex items-center gap-3 text-small font-medium text-fg-2">
      <span className="relative inline-flex shrink-0">
        <Avatar id={user.avatar} size={32} />
        <span className="absolute -bottom-1 -end-1.5 grid size-[1.375rem] place-items-center rounded-full border-2 border-surface bg-surface">
          <DaleelGlyph size={18} />
        </span>
      </span>
      {APPLICATIONS_COPY.byAdvisor}
    </p>
  );
}

/** A real job's status: prepared, to be sent from the posting (no simulated review). */
function PreparedLabel({ jobId }: { readonly jobId: JobId }): ReactNode {
  return (
    <span
      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border-strong ps-3 pe-3.5 text-small font-semibold text-fg"
      data-state="prepared"
      data-testid={TID.applications.status(jobId)}
    >
      <IconCheckCircle size={18} waypoint="muted" />
      {APPLICATIONS_COPY.prepared}
    </span>
  );
}

/**
 * A real job's application: «جهّزه دليلك، وأرسله أنت من الإعلان الأصلي» (or «جهّزته هنا…» when the user prepared it), with
 * «دليلك»'s mark on the user's avatar when he did, and the link to the original posting (a new tab).
 */
function Prepared({ by, url, user }: { readonly by: Application["by"]; readonly url: string; readonly user: UserState }): ReactNode {
  return (
    <div className="flex flex-col items-start gap-3" data-testid="application-prepared">
      <p className="flex items-center gap-3 text-body font-medium text-fg">
        {by === "advisor" ? (
          <span className="relative inline-flex shrink-0">
            <Avatar id={user.avatar} size={32} />
            <span className="absolute -bottom-1 -end-1.5 grid size-[1.375rem] place-items-center rounded-full border-2 border-surface bg-surface">
              <DaleelGlyph size={18} />
            </span>
          </span>
        ) : null}
        <span>{by === "advisor" ? JOB_SOURCE_COPY.preparedByAdvisor : JOB_SOURCE_COPY.preparedByUser}</span>
      </p>
      <a
        className={buttonStyles({ size: "sm" })}
        data-testid="application-open-posting"
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <IconExternal size={18} />
        {JOB_SOURCE_COPY.openPosting}
      </a>
    </div>
  );
}

// ── the shown status ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The status the card draws: it starts from what this page last showed (or «محفوظ») and follows the real status; on
 * arrival after ARRIVAL_DELAY_MS, later at once. Writes seen.applicationStatus once the shown status is the real one and
 * the change has played. Strict-Mode safe (timers only; the marker is merged into the latest saved record when written).
 */
function useShownStatus(jobId: JobId, status: ApplicationStatus): ApplicationStatus {
  const instant = useInstant();
  const [shown, setShown] = useState<ApplicationStatus>(() => {
    if (instant) return status;
    const seen = selectCurrentUser(useAppStore.getState())?.seen.applicationStatus[jobId];
    return seen ?? "sent";
  });
  const arrived = useRef(false);

  useEffect(() => {
    if (shown === status) {
      arrived.current = true;
      return;
    }
    const timer = window.setTimeout(
      () => {
        arrived.current = true;
        setShown(status);
      },
      arrived.current || instant ? 0 : ARRIVAL_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [shown, status, instant]);

  useEffect(() => {
    if (shown !== status) return;
    const timer = window.setTimeout(() => {
      const user = selectCurrentUser(useAppStore.getState());
      if (!user || user.seen.applicationStatus[jobId] === status) return;
      useAppStore.getState().markSeen("applicationStatus", { ...user.seen.applicationStatus, [jobId]: status });
    }, SEEN_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [shown, status, jobId]);

  return shown;
}

/** `value`, `ms` later (the meaning follows the cause). */
function useLagged<T>(value: T, ms: number): T {
  const [lagged, setLagged] = useState(value);
  useEffect(() => {
    if (Object.is(lagged, value)) return;
    if (ms <= 0) {
      setLagged(value);
      return;
    }
    const timer = window.setTimeout(() => setLagged(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, lagged, ms]);
  return ms <= 0 ? value : lagged;
}
