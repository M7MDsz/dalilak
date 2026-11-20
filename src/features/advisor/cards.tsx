"use client";
// Owner: advisor. The cards in «دليلك»'s replies (spec 3.14, 5.5 rule 10): drawn by the app from data by id, never from a
// model's words. Titles, companies, matches and statuses are read LIVE from data and the engine, so an old card is never
// stale. Every card opens its page; a card may carry one action chip («قدّم على ذي», «ابدأ الخطوة», «خلّها هدفي»),
// which sends a new message with its payload (the router answers). A course card is a learning step shown as its
// skill's guide («دليل Power BI» and its real top pick; 20 Nov 2026): never the internal course title or its hours.
import type { ReactNode } from "react";

import { Chip as ChipButton, Button, Card, SkillStars, XpValue } from "@/components/ui";
import { IconArrowForward, IconCheckCircle, IconClock } from "@/components/icons";
import { Ring } from "@/components/motion";
import { JobTag, useNextStepAction } from "@/features/shared";
import { APPLICATION_STATUS_COPY, JOB_SOURCE_COPY, companyCityLine, courseStateLabel, guideTitle, nextStepLabel, starsOfRequired } from "@/lib/copy";
import { getCourse, getGuide, getJob, getSkill } from "@/lib/data";
import { applicationStatus, courseOnPath, courseState, courseXp, jobGap, jobMatch, nextStep, skillStars } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import { hrefFor } from "@/lib/routes";
import { useClock, useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { AdvisorCard, Chip, CourseId, JobId } from "@/lib/types";

export interface CardActions {
  /** Opens a page (closes the phone sheet first). */
  readonly onOpen: (href: string) => void;
  /** A card's action chip: sends it as the user's message. */
  readonly onChip: (chip: Chip, key: string) => void;
  /** «دليلك» is busy: chips and the next-step button wait (5.5 rule 13). */
  readonly busy: boolean;
  /** The chip being pressed (the press frame shows before the message goes). */
  readonly pressedKey: string | null;
  /** A reply that just arrived (rings draw); false for a saved thread at rest. */
  readonly fresh: boolean;
}

/** The frame: a white sheet with a hairline; the body opens the page, the footer holds the action chip. */
function CardFrame({ testId, onOpen, label, action, children }: { testId: string; onOpen: () => void; label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div
      className="group/card overflow-hidden rounded-card border border-border bg-surface transition-[border-color] duration-200 ease-out has-[[data-card-body]:hover]:border-border-strong"
      data-testid={testId}
    >
      <button
        aria-label={label}
        className="block w-full p-4 text-start transition-[scale] duration-200 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus) active:scale-[0.99] active:transition-none"
        data-card-body=""
        onClick={onOpen}
        type="button"
      >
        {children}
      </button>
      {action ? <div className="flex flex-wrap gap-2 px-4 pb-4">{action}</div> : null}
    </div>
  );
}

function CardChip({ chip, id, actions }: { chip: Chip; id: JobId | CourseId; actions: CardActions }) {
  const key = `card-${id}-${chip.slug}`;
  return (
    <ChipButton
      data-testid={TID.advisor.cardAction(id)}
      disabled={actions.busy}
      onClick={() => actions.onChip(chip, key)}
      pressed={actions.pressedKey === key}
      size="sm"
    >
      {chip.label}
    </ChipButton>
  );
}

function JobCard({ jobId, chip, actions }: { jobId: JobId; chip?: Chip; actions: CardActions }) {
  const user = useCurrentUser();
  const job = getJob(jobId);
  const match = user ? jobMatch(jobId, user) : 0;
  return (
    <CardFrame
      action={chip ? <CardChip actions={actions} chip={chip} id={jobId} /> : undefined}
      label={job.title}
      onOpen={() => actions.onOpen(hrefFor({ screen: "job", jobId }))}
      testId={TID.advisor.cardJob(jobId)}
    >
      <span className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="text-title text-fg">{job.title}</span>
          <span className="text-small text-fg-2">{companyCityLine(jobId)}</span>
          <JobTag className="mt-1" jobId={jobId} />
        </span>
        <Ring delay={0.35} from={actions.fresh ? 0 : undefined} size={56} value={match} />
      </span>
    </CardFrame>
  );
}

function CourseCard({ courseId, chip, actions }: { courseId: CourseId; chip?: Chip; actions: CardActions }) {
  const user = useCurrentUser();
  const course = getCourse(courseId);
  const skill = getSkill(course.skill);
  const top = getGuide(course.skill).topPick;
  const title = guideTitle(courseId);
  const info = user ? courseState(courseId, user) : null;
  const path = user ? courseOnPath(courseId, user) : null;
  const held = user ? skillStars(user)[course.skill] : 0;
  const ahead = info !== null && (info.state === "available" || info.state === "started" || info.state === "locked");
  return (
    <CardFrame
      action={chip ? <CardChip actions={actions} chip={chip} id={courseId} /> : undefined}
      label={title}
      onOpen={() => actions.onOpen(hrefFor({ screen: "course", courseId }))}
      testId={TID.advisor.cardCourse(courseId)}
    >
      <span className="flex flex-col items-start gap-2">
        <span className="flex w-full items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <SkillStars size="sm" slots={skill.maxStars} value={held} />
            <span className="truncate text-small font-semibold text-fg-2">
              <bdi>{skill.name}</bdi> · النجمة {formatNumber(course.star)}
            </span>
          </span>
          {info && info.state !== "available" ? <span className="shrink-0 text-small font-medium text-fg-3">{courseStateLabel(info)}</span> : null}
        </span>
        {/* the thread keeps every <bdi> on one line ([&_bdi]:whitespace-nowrap, for numbers and short names): a long
            guide or course title must wrap instead, or it runs out of the card on a phone */}
        <span className="text-title text-fg">
          <bdi className="whitespace-normal!">{title}</bdi>
        </span>
        <span className="line-clamp-2 text-small text-fg-2">
          ابدأ بـ «<bdi className="whitespace-normal!">{top.title}</bdi>» · <bdi>{top.provider}</bdi>
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-fg-2">
          {info?.state === "credited" ? null : <XpValue gain size="sm" value={courseXp(course)} />}
          {path && ahead ? (
            path.prep ? (
              <span className="inline-flex h-6 items-center rounded-tag border border-border-strong px-2 text-caption font-semibold text-fg-2">تمهيدية</span>
            ) : path.gain > 0 ? (
              <span className="inline-flex items-baseline gap-1 font-semibold text-fg">
                <bdi className="tabular-nums" dir="ltr">
                  +{formatNumber(path.gain)}%
                </bdi>
                <span>مطابقة</span>
              </span>
            ) : null
          ) : null}
        </span>
      </span>
    </CardFrame>
  );
}

function GapCard({ jobId, actions }: { jobId: JobId; actions: CardActions }) {
  const user = useCurrentUser();
  if (!user) return null;
  const job = getJob(jobId);
  const gap = jobGap(jobId, user);
  const row = (skill: (typeof gap.have)[number]["skill"], held: number, need: number) => (
    <li className="flex items-center gap-2.5" key={skill}>
      <SkillStars size="sm" slots={need as 1 | 2 | 3} value={Math.min(held, need)} />
      <span className="min-w-0 text-small text-fg">
        <bdi>{starsOfRequired(getSkill(skill).name, held, need)}</bdi>
      </span>
    </li>
  );
  return (
    <CardFrame label={job.title} onOpen={() => actions.onOpen(hrefFor({ screen: "job", jobId }))} testId={TID.advisor.cardGap(jobId)}>
      <span className="flex flex-col gap-3.5">
        <span className="flex items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="text-title text-fg">{job.title}</span>
            <span className="text-small text-fg-2">{companyCityLine(jobId)}</span>
          </span>
          <Ring delay={0.35} from={actions.fresh ? 0 : undefined} size={56} value={gap.match} />
        </span>
        {gap.have.length > 0 ? (
          <span className="flex flex-col gap-2">
            <span className="text-small font-semibold text-fg-2">ما لديك</span>
            <ul className="flex flex-col gap-1.5">{gap.have.map((h) => row(h.skill, h.held, h.need))}</ul>
          </span>
        ) : null}
        <span className="flex flex-col gap-2 border-t border-border pt-3.5">
          <span className="text-small font-semibold text-fg-2">ما ينقصك</span>
          {gap.missing.length > 0 ? (
            <ul className="flex flex-col gap-1.5">{gap.missing.map((m) => row(m.skill, m.held, m.need))}</ul>
          ) : (
            <span className="text-small text-fg">لا شيء ينقصك. أنت جاهز لهذه الوظيفة.</span>
          )}
        </span>
      </span>
    </CardFrame>
  );
}

function ApplicationCard({ jobId, actions }: { jobId: JobId; actions: CardActions }) {
  const user = useCurrentUser();
  const clock = useClock(5_000);
  const app = user?.applications.find((a) => a.jobId === jobId);
  if (!app) return null;
  const job = getJob(jobId);
  const status = applicationStatus(app, clock.now);
  return (
    <CardFrame label={job.title} onOpen={() => actions.onOpen(hrefFor({ screen: "applications" }))} testId={TID.advisor.cardApplication(jobId)}>
      <span className="flex flex-col items-start gap-2">
        <span className="flex w-full items-start justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-title text-fg">{job.title}</span>
            <span className="text-small text-fg-2">
              رقم الطلب:{" "}
              <bdi className="font-semibold text-fg tabular-nums" dir="ltr">
                {app.number}
              </bdi>
            </span>
          </span>
          {app.xpPaid > 0 ? <XpValue className="mt-1 shrink-0" gain size="sm" value={app.xpPaid} /> : null}
        </span>
        <span className="mt-1 flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3">
          {job.real ? (
            // a real posting: prepared here, sent by the user from the posting (20 Nov 2026), no simulated status
            <span className="inline-flex items-center gap-1.5 text-small font-semibold text-fg" data-state="prepared">
              <IconCheckCircle className="text-ok-fg" size={18} waypoint="off" />
              {app.by === "advisor" ? JOB_SOURCE_COPY.preparedByAdvisor : JOB_SOURCE_COPY.preparedByUser}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-small font-semibold text-fg" data-state={status}>
                {status === "shortlisted" ? (
                  <IconCheckCircle className="text-ok-fg" size={18} waypoint="off" />
                ) : (
                  <IconClock className="text-fg-3" size={18} waypoint="off" />
                )}
                {APPLICATION_STATUS_COPY[status].label}
              </span>
              {app.by === "advisor" ? <span className="text-small text-fg-2">قدّم عنك دليلك</span> : null}
            </>
          )}
        </span>
      </span>
    </CardFrame>
  );
}

function NextStepCard({ actions }: { actions: CardActions }) {
  const user = useCurrentUser();
  const perform = useNextStepAction();
  if (!user) return null;
  const step = nextStep(user);
  return (
    <div data-testid={TID.advisor.cardNextStep}>
      <Card dot="accent" label="الخطوة التالية">
        <Button
          className="w-full justify-between"
          disabled={actions.busy}
          icon={<IconArrowForward size={18} />}
          onClick={() => perform(step)}
          size="sm"
          variant="secondary"
        >
          {nextStepLabel(step)}
        </Button>
      </Card>
    </div>
  );
}

/** One card of a reply, by kind. */
export function AdvisorCardView({ card, actions }: { card: AdvisorCard; actions: CardActions }): ReactNode {
  switch (card.kind) {
    case "job":
      return <JobCard actions={actions} chip={card.chip} jobId={card.jobId} />;
    case "course":
      return <CourseCard actions={actions} chip={card.chip} courseId={card.courseId} />;
    case "gap":
      return <GapCard actions={actions} jobId={card.jobId} />;
    case "application":
      return <ApplicationCard actions={actions} jobId={card.jobId} />;
    case "next-step":
      return <NextStepCard actions={actions} />;
  }
}

/** A stable key for a card inside one reply. */
export function cardKey(card: AdvisorCard, index: number): string {
  return `${card.kind}-${"jobId" in card ? card.jobId : "courseId" in card ? card.courseId : "next"}-${index}`;
}
