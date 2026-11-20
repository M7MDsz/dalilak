"use client";
// Owner: jobs. The job page's action card (spec 3.8 "Match" and "Actions"; DESIGN 4.0: the 340 px column, sticky):
// the ring with the caption «مطابقتك» (the card's label, cut into its border line) · «كل مهارة من الخمس تساوي 20% من
// المطابقة.» · «كيف تُحسب؟» (an explainer that draws each skill's share) · «دع دليل يقدّم عنك» (primary) · «قدّم بنفسك»
// (text button) · «اجعلها هدفي» or «هدفك الحالي» · «اسأل دليل عن هذه الوظيفة». Applied: the chip «قدّمت · {status} ·
// محاكاة» and «تابع الطلب» replace the two apply buttons.
// The ring takes a `preview` from the course rows (gain-preview): an accent dotted leg to the match those courses reach.
// The reward for applying is shown where it is earned (docs/GAME-LAYER.md 4): «تكسب +40 XP عند التقديم» from 60%, the
// locked chip with its real condition under it, and «كسبت +40 XP تقديم مدروس» once the application paid it (spec 8.1).
import { motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { IconAdvisor, IconArrowForward, IconCheck, IconChevronDown, IconFlag, IconSend } from "@/components/icons";
import { RewardChip, RewardRow } from "@/components/game";
import { Collapse, NavLink, Ring } from "@/components/motion";
import { Button, Card, buttonStyles, cn } from "@/components/ui";
import { ASK_ADVISOR_APPLY_TEXT, appliedChip } from "@/lib/copy";
import { MATCH_LINE, XP, getJob, getSkill } from "@/lib/data";
import { matchBreakdown, skillStars } from "@/lib/engine";
import { tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { ApplicationStatus, JobId, UserState } from "@/lib/types";

import { JOB_COPY } from "./copy";
import { LtrNumbers, TargetFlag } from "./parts";

export function MatchCard({
  jobId,
  user,
  match,
  preview,
  status,
  paidXp,
  isTarget,
  nextHere,
  showPrimary,
  onApplySelf,
  onSetTarget,
}: {
  jobId: JobId;
  user: UserState;
  match: number;
  preview: number | null;
  /** The application's status when the user has applied to this job. */
  status: ApplicationStatus | null;
  /** The XP the application paid (40 or 0), when the user has applied. */
  paidXp: number | null;
  isTarget: boolean;
  /** This job is the user's next step (rule 4): the card carries the accent dot. */
  nextHere: boolean;
  /** False on phones, where «دع دليل يقدّم عنك» is pinned to the bottom instead (spec 3.8 "Phone"). */
  showPrimary: boolean;
  onApplySelf: () => void;
  onSetTarget: () => void;
}): ReactNode {
  const [explain, setExplain] = useState(false);
  const panelId = useId();
  const advisorBusy = useUi((s) => s.advisorBusy);

  return (
    <div className="@container/card">
      <Card dot={nextHere ? "accent" : "muted"} label={JOB_COPY.matchCaption}>
        {/* 340 px column: stacked. A wide single column (the panel docked, a tablet): the ring | the actions */}
        <div className="grid grid-cols-1 @min-[560px]/card:grid-cols-2">
          <div className="min-w-0 @min-[560px]/card:pe-6">
            <div className="flex items-center gap-5 pt-2">
              <Ring
                className="shrink-0"
                data-testid={TID.job.match}
                preview={preview ?? undefined}
                size={116}
                value={match}
              />
              <div className="flex min-w-0 flex-col items-start gap-2">
                <p className="text-small text-fg-2">
                  <LtrNumbers text={JOB_COPY.matchLine} />
                </p>
                <button
                  aria-controls={panelId}
                  aria-expanded={explain}
                  className={buttonStyles({
                    variant: "ghost",
                    size: "sm",
                    className: "-ms-1",
                  })}
                  data-testid={TID.job.explain}
                  onClick={() => setExplain((v) => !v)}
                  type="button"
                >
                  {JOB_COPY.explain}
                  <IconChevronDown
                    className={cn("transition-[rotate] duration-200 ease-out", explain && "rotate-180")}
                    size={18}
                    waypoint="off"
                  />
                </button>
              </div>
            </div>

            <Collapse open={explain} testId={TID.job.explainPanel}>
              <div id={panelId}>
                <Explainer jobId={jobId} open={explain} user={user} />
              </div>
            </Collapse>
          </div>

          <div className="flex min-w-0 flex-col @min-[560px]/card:justify-center @min-[560px]/card:border-s @min-[560px]/card:border-border @min-[560px]/card:ps-6">
            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 @min-[560px]/card:mt-0 @min-[560px]/card:border-t-0 @min-[560px]/card:pt-2">
              {status !== null ? (
                <>
                  <p
                    className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-border-strong py-1.5 ps-3 pe-4 text-small font-semibold text-fg"
                    data-state={status}
                    data-testid={TID.job.appliedStatus}
                  >
                    <IconCheck className="shrink-0 text-ok-fg" size={18} strokeWidth={2.5} waypoint="off" />
                    {appliedChip(status)}
                  </p>
                  <NavLink
                    className={buttonStyles({
                      variant: "secondary",
                      className: "w-full",
                    })}
                    href={hrefFor({ screen: "applications" })}
                  >
                    {JOB_COPY.follow}
                    <IconArrowForward size={20} />
                  </NavLink>
                  {paidXp !== null && paidXp > 0 ? (
                    <RewardRow className="justify-center" label={JOB_COPY.rewardEarned}>
                      <RewardChip label={JOB_COPY.rewardReason} size="sm" status="earned" value={paidXp} />
                    </RewardRow>
                  ) : null}
                </>
              ) : (
                <>
                  {showPrimary ? (
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
                      {JOB_COPY.applyAdvisor}
                    </Button>
                  ) : null}
                  <Button
                    className="self-center"
                    data-testid={TID.job.apply}
                    icon={<IconSend size={18} />}
                    onClick={onApplySelf}
                    size="sm"
                    variant="ghost"
                  >
                    {JOB_COPY.applySelf}
                  </Button>
                  <ApplyReward match={match} />
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-4">
              {isTarget ? (
                <TargetFlag className="h-8 px-2.5 text-small" label={JOB_COPY.isTarget} />
              ) : (
                <Button
                  data-testid={TID.job.setTarget}
                  icon={<IconFlag size={18} />}
                  iconPosition="start"
                  onClick={onSetTarget}
                  size="sm"
                  variant="secondary"
                >
                  {JOB_COPY.setTarget}
                </Button>
              )}
              <Button
                data-testid={TID.job.askAdvisor}
                icon={<IconAdvisor size={18} />}
                iconPosition="start"
                onClick={() => useUi.getState().openAdvisor()}
                size="sm"
                variant="ghost"
              >
                {JOB_COPY.askAdvisor}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * The reward for applying (spec 8.1), as a chip: «+40 XP عند التقديم» from 60%; under it dashed, with the lock and its
 * condition «من 60% مطابقة» (applying still works, it pays nothing).
 */
export function ApplyReward({ match, className }: { match: number; className?: string }): ReactNode {
  const open = match >= MATCH_LINE;
  return (
    <RewardRow className={cn("justify-center", className)} label={JOB_COPY.rewardOffer}>
      <RewardChip
        label={open ? JOB_COPY.rewardWhen : <LtrNumbers text={JOB_COPY.rewardFrom(MATCH_LINE)} />}
        size="sm"
        status={open ? "offer" : "locked"}
        testId="job-apply-reward"
        value={XP.job_applied}
      />
    </RewardRow>
  );
}

/**
 * «كيف تُحسب؟» (spec 3.8, 7.2): each of the five skills with what it contributes («Excel: 20 من 20»), its share drawn as a
 * bar out of 20, and «المجموع: 70%». The bars draw when the panel opens (the proof is drawn, playbook 1.1).
 */
function Explainer({ jobId, user, open }: { jobId: JobId; user: UserState; open: boolean }): ReactNode {
  const breakdown = matchBreakdown(getJob(jobId), skillStars(user));
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-control bg-bg px-4 pt-3.5 pb-3">
      <ul className="flex flex-col gap-3">
        {breakdown.rows.map((row, i) => (
          <li className="flex flex-col gap-1.5" key={row.skill}>
            <p className="flex items-baseline justify-between gap-3 text-small">
              <span className="font-medium text-fg">
                <bdi>{getSkill(row.skill).name}</bdi>:
              </span>{" "}
              <span className="tabular-nums text-fg-2">{JOB_COPY.explainRow(row.points)}</span>
            </p>
            <span aria-hidden className="relative h-1.5 overflow-hidden rounded-full bg-track">
              <motion.span
                animate={{ scaleX: open ? row.points / 20 : 0 }}
                className="absolute inset-0 rounded-full bg-fg ltr:origin-left rtl:origin-right"
                initial={false}
                transition={open ? { ...tween.draw, delay: 0.12 + i * 0.06 } : { duration: 0 }}
              />
            </span>
          </li>
        ))}
      </ul>
      <motion.p
        animate={{ opacity: open ? 1 : 0, y: open ? 0 : 4 }}
        className="flex items-center justify-between border-t border-border pt-2.5 text-body font-semibold text-fg"
        initial={false}
        transition={open ? { ...tween.move, delay: 0.5 } : { duration: 0 }}
      >
        <LtrNumbers text={JOB_COPY.explainTotal(breakdown.total)} />
      </motion.p>
    </div>
  );
}
