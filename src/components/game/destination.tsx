"use client";
// DestinationCard: a job drawn as a destination you unlock (docs/GAME-LAYER.md 4.5). Its five requirements are the five
// segments of the unlock meter; the skills still missing are locked gems; the reward for applying (+40 XP at 60% or more,
// spec 8.1) is on the card, locked under 60%. The match ring stays the one number (P5).
import type { ReactNode } from "react";

import { IconExperience } from "@/components/icons";
import { Ring } from "@/components/motion";
import { cn } from "@/components/ui/cn";
import { SampleTag } from "@/components/ui";
import { formatPercent } from "@/lib/format";

import { SkillGem } from "./gem";
import { UnlockMeter, type Requirement } from "./meter";
import { RewardChip } from "./reward";
import { StateRibbon } from "./ribbon";
import type { GameState } from "./state";
import { Tile, type TileProps } from "./tile";

export interface ApplyReward {
  /** The XP for applying (spec 8.1: 40). */
  readonly xp: number;
  /** The match from which it pays (spec 8.1: 60). */
  readonly threshold: number;
}

export interface DestinationCardProps extends Omit<TileProps, "children" | "state" | "ribbon"> {
  readonly title: string;
  readonly company: string;
  readonly city: string;
  /** The experience label of spec 9.3 («حتى سنة خبرة»). */
  readonly experience?: string;
  /** The match, 0..100 (the same number as everywhere else). */
  readonly match: number;
  /** The ring draws from this value on first paint (a match that rose since the last visit: ring-count). */
  readonly matchFrom?: number;
  /** The job's five requirements, in the job's order, with the stars the user holds. */
  readonly skills: readonly Requirement[];
  /** The user's target job: the accent (your destination), the ribbon «هدفك». */
  readonly target?: boolean;
  /** Applied: the status line («قيد المراجعة · محاكاة») and the XP it paid (40 or 0). The card lies flat, settled. */
  readonly applied?: { readonly status: ReactNode; readonly xp: number };
  /** The reward for applying. Default { xp: 40, threshold: 60 }; `null` hides it. */
  readonly applyReward?: ApplyReward | null;
  /** The job's field icon (IconFieldData …, 22 px): drawn as the destination's emblem token before the title. */
  readonly icon?: ReactNode;
  /** The featured form: the target at the top of the jobs page or the CV results (skills written under the meter, a bigger ring). */
  readonly featured?: boolean;
  /** At most this many missing skills as gems (spec 3.7: three). */
  readonly maxGems?: number;
  /** Buttons of its own («دع دليلك يقدّم عنك»). With an action the card is flat; the buttons are the pressable pieces. */
  readonly action?: ReactNode;
  readonly testId?: string;
  readonly matchTestId?: string;
  /** The mark beside the company (default «جهة تجريبية»; the jobs board passes the job's own: practice tag or source). */
  readonly tag?: ReactNode;
  /** Drawn as-is in place of the bordered `icon` token (the jobs board: the employer's logo or monogram). */
  readonly emblem?: ReactNode;
}

/**
 * DestinationCard.
 * ```tsx
 * <DestinationCard target title="محلل بيانات" company="وادي الغيم للبيانات" city="الرياض" experience="حتى سنة خبرة"
 *   match={70} skills={[{ name: "Excel", have: 2, need: 2 }, …]} render={<NavLink href="/jobs/data-analyst-riyadh" />} />
 * ```
 */
export function DestinationCard({
  title,
  company,
  city,
  experience,
  match,
  matchFrom,
  skills,
  target = false,
  applied,
  applyReward = { xp: 40, threshold: 60 },
  featured = false,
  icon,
  maxGems = 3,
  action,
  testId,
  matchTestId,
  tag,
  emblem,
  faceClassName,
  interactive,
  ...rest
}: DestinationCardProps) {
  const state: GameState = applied ? "done" : target ? "next" : "available";
  const ready = match >= 100;
  const missing = skills.filter((s) => s.have < s.need).slice(0, maxGems);
  const flat = action !== undefined || interactive === false;

  let ribbon: ReactNode = null;
  if (applied) ribbon = <StateRibbon state="done">قدّمت</StateRibbon>;
  else if (target) ribbon = <StateRibbon icon={null} state="next" tone="accent">{ready ? "هدفك · جاهز للتقديم" : "هدفك"}</StateRibbon>;
  else if (ready) ribbon = <StateRibbon state="done">جاهز للتقديم</StateRibbon>;

  let reward: ReactNode = null;
  if (applyReward) {
    if (applied) {
      reward = applied.xp > 0 ? <RewardChip size="sm" status="earned" value={applied.xp} label="تقديم مدروس" /> : <span className="text-small text-fg-3">بدون نقاط: المطابقة كانت أقل من <bdi dir="ltr">{formatPercent(applyReward.threshold)}</bdi></span>;
    } else if (match >= applyReward.threshold) {
      reward = <RewardChip label="عند التقديم" size="sm" value={applyReward.xp} />;
    } else {
      // «من 60% مطابقة»: the percentage is isolated LTR (DESIGN 2.3), or the bidi rules draw it «%60» after the Arabic «من»
      reward = <RewardChip label={<>من <bdi dir="ltr">{formatPercent(applyReward.threshold)}</bdi> مطابقة</>} size="sm" status="locked" value={applyReward.xp} />;
    }
  }

  return (
    <Tile
      {...rest}
      data-testid={testId}
      data-value={match}
      depth={featured ? "lg" : "md"}
      faceClassName={cn("gap-4 p-card pt-6", featured && "lg:p-6 lg:pt-7", faceClassName)}
      interactive={!flat}
      ribbon={ribbon}
      state={state}
    >
      <div className="flex items-start gap-3">
        {emblem ? (
          emblem
        ) : icon ? (
          <span
            className={cn(
              "inline-grid shrink-0 place-items-center rounded-control border-2 border-fg text-fg wp-quiet stage:border-on-stage-3",
              featured ? "hidden size-14 sm:grid" : "size-11",
              applied && "border-[1.5px] border-border-strong text-fg-2",
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className={cn("text-fg", featured ? "text-h2" : "text-h3")}>{title}</h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-fg-2">
            <span>
              {company} · {city}
            </span>
            {tag === undefined ? <SampleTag kind="company" /> : tag}
          </p>
          {applied ? <p className="mt-1 text-small font-medium text-ok-fg">{applied.status}</p> : null}
        </div>
        <Ring data-testid={matchTestId} from={matchFrom} size={featured ? 88 : 64} value={match} />
      </div>

      <UnlockMeter caption={featured || missing.length === 0 ? undefined : null} labels={featured} size={featured ? "md" : "sm"} skills={skills} value={match} />

      {missing.length > 0 ? (
        <div className={cn("flex flex-wrap items-center gap-1.5", featured && "sm:hidden")}>
          <span className="me-0.5 text-small font-medium text-fg-3">ينقصك</span>
          {missing.map((s) => (
            <SkillGem have={s.have} key={s.name} name={s.name} need={s.need} />
          ))}
        </div>
      ) : null}

      {reward || experience ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
          {reward ?? <span />}
          {experience ? (
            <span className="inline-flex items-center gap-1.5 text-small text-fg-2">
              <IconExperience className="text-fg-3" size={18} waypoint="off" />
              {experience}
            </span>
          ) : null}
        </div>
      ) : null}

      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </Tile>
  );
}
