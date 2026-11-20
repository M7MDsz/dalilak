"use client";
// Owner: leaderboard. Spec 3.12 "My card": «مركزك 10 من 25» · «420 XP» (this week's) · the gap line «يفصلك 20 XP عن
// المركز 9» (first place: «أنت في الصدارة. حافظ عليها.») · «صعدت 8 مراكز» when the rank improved since the last visit ·
// «أسرع طريق للصعود: {next-step label}» with what that step pays on a brass reward chip (GAME-LAYER 5.9) and the one
// primary button of the page, which performs the next step (2.8).
// During `row-climb` the rank ticks from the old place to the new one on the climb's clock (in step with the row when
// both are in view), then «صعدت…» lands (popIn) and the gap line rises in. The gap line is held until then, because the
// distance to the place ahead is true only for the new rank: «18» beside «يفصلك 20 XP عن المركز 9» would contradict
// itself. «420 XP» is this week's XP as it is now, shown throughout. `data-value`s hold the final numbers from the first
// frame.
import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { RewardChip, RewardRow } from "@/components/game";
import { IconArrowForward, IconRankUp, IconTrophy } from "@/components/icons";
import { Button, Card, Divider, XpValue } from "@/components/ui";
import { countNoun, nextStepLabel } from "@/lib/copy";
import { formatNumber } from "@/lib/format";
import { spring, tween } from "@/lib/motion";
import { TID } from "@/lib/testids";
import type { AvatarId, Leaderboard, LeaderRow, LevelNumber, NextStep } from "@/lib/types";

import { GapTrail } from "./gap-trail";
import { RankTick } from "./rank-tick";

/** «صعدت…» lands just after the rank has ticked to its new number (cause, then meaning). */
const climbLands = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { default: { ...spring.pop, delay: 0.08 }, opacity: { ...tween.fast, delay: 0.08 } } },
} as const satisfies Variants;

/** Then the gap line rises in (what is next), held until the rank it belongs to is on screen. */
const gapLands = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { ...tween.move, delay: 0.22 } },
} as const satisfies Variants;

/** The button of the card, by rule of 2.8, in the words the roadmap's next-step card uses for the same action (3.4). */
const STEP_BUTTON = {
  1: "ارفع سيرتك الذاتية",
  2: "أكمل الدورة",
  3: "ابدأ الدورة",
  4: "عرض الوظيفة",
  5: "استعرض الوظائف",
} as const satisfies Record<NextStep["rule"], string>;

export interface MyCardProps {
  readonly board: Leaderboard;
  readonly avatar: AvatarId;
  readonly level: LevelNumber;
  /** The rank shown now: the old place, counting down to the real one during the climb. */
  readonly shownRank: number;
  /** The count has landed on the real rank (always true when there is no climb). */
  readonly landed: boolean;
  readonly places: number;
  readonly step: NextStep;
  readonly onStep: () => void;
  /** The XP the next step pays (spec 8.1), or null when it pays none: shown on a reward chip. */
  readonly reward: number | null;
}

export function MyCard({ board, avatar, level, shownRank, landed, places, step, onStep, reward }: MyCardProps): ReactNode {
  const { rank, weeklyXp, gap } = board.me;
  const ahead: LeaderRow | undefined = gap ? board.rows[gap.toRank - 1] : undefined;
  const behind: LeaderRow | undefined = board.rows[rank];
  return (
    <Card className="flex flex-col gap-3.5">
      {/* the rank (what changed) on the reading side; the week's XP (what changed it) and the climb at the other end */}
      <div className="flex items-center gap-3.5">
        <Avatar id={avatar} level={level} size={56} />
        <p className="flex min-w-0 flex-col" data-testid={TID.leaderboard.myRank} data-value={rank}>
          <span className="text-small font-semibold text-fg-2">مركزك</span>{" "}
          <span className="flex items-baseline gap-1.5">
            <span className="text-[2.75rem] font-bold leading-none text-fg tabular-nums">
              <RankTick className="h-[1.15em]" value={shownRank} />
            </span>{" "}
            <span className="whitespace-nowrap text-title font-semibold text-fg-3">من {formatNumber(board.rows.length)}</span>
          </span>
        </p>
        <div className="ms-auto flex flex-col items-end gap-2 self-stretch justify-center">
          <span data-testid={TID.leaderboard.myXp} data-value={weeklyXp}>
            <XpValue size="lg" value={weeklyXp} />
          </span>
          {places > 0 ? (
            <motion.p
              animate={landed ? "show" : "hidden"}
              className="inline-flex items-center gap-1 whitespace-nowrap text-small font-semibold text-ok-fg"
              data-testid={TID.leaderboard.climb}
              data-value={places}
              initial={false}
              variants={climbLands}
            >
              <IconRankUp size={18} waypoint="muted" />
              <span>صعدت {countNoun(places, "place", "object")}</span>
            </motion.p>
          ) : null}
        </div>
      </div>

      <Divider />

      <motion.div animate={landed ? "show" : "hidden"} initial={false} variants={gapLands}>
        {gap && ahead ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-body font-medium text-fg" data-testid={TID.leaderboard.gap} data-value={gap.xp}>
              يفصلك <XpValue className="mx-0.5 align-[-0.125em]" value={gap.xp} /> عن المركز {formatNumber(gap.toRank)}
            </p>
            <GapTrail ahead={ahead} behindXp={behind?.weeklyXp ?? 0} mine={weeklyXp} />
          </div>
        ) : (
          <p className="flex items-center gap-2 text-body font-medium text-fg" data-testid={TID.leaderboard.gap} data-value={0}>
            <IconTrophy size={22} waypoint="muted" />
            أنت في الصدارة. حافظ عليها.
          </p>
        )}
      </motion.div>

      <Divider />

      <div className="flex flex-col gap-2.5">
        <p className="text-pretty text-body text-fg-2">
          أسرع طريق للصعود: <span className="font-semibold text-fg">{nextStepLabel(step)}</span>
        </p>
        {/* what that step really pays (spec 8.1), on the game's brass reward chip (GAME-LAYER 5.9) */}
        {reward !== null ? (
          <RewardRow>
            <RewardChip value={reward} />
          </RewardRow>
        ) : null}
        <Button className="w-full" data-testid={TID.leaderboard.nextStep} icon={<IconArrowForward size={20} />} onClick={onStep}>
          {STEP_BUTTON[step.rule]}
        </Button>
      </div>
    </Card>
  );
}
