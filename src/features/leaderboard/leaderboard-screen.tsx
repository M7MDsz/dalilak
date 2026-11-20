"use client";
// Owner: leaderboard. `/leaderboard` (spec 3.12, 8.7; playbook 3.10). Who is first, where the user stands, how to climb.
//
// Layout follows the content width (ARCHITECTURE 11.1), never the window:
// - 760 px of content and wider (a wide window, and also beside the docked advisor at 1440 px, where the content is
//   772 px): the board on one side; on the other (first in reading order) a sticky column with the user's card and the
//   podium, so the card, the podium and the climbing row are all in view together. Below 900 px of content the board
//   is narrow and its rows take two lines.
// - narrower (a phone, a small window with the advisor docked): the spec's phone order, card, podium, board (card and
//   podium side by side from 640 px of content). The window never scrolls by itself here (useRowClimb).
//
// `row-climb`: the old place is `seen.leaderboardRank`, or, when the page was never opened, the rank before the latest
// gain that improved it (engine `rankBeforeLatestImprovement`). It starts as `podium-rise` ends; my card counts on the
// same clock. The marker is written (useSeen) only after the row has landed, so a visit cut short replays next time.
// The home preview never writes it.
// While the daily reward is due or its overlay blocks the page (spec 3.15: it shows alone, first), the board rests on the
// current order: no climb, no marker. Once it is settled the content remounts and reads its baseline then, so the claim's
// own gain is the one that climbs (spec 10.3, `returning`: 10 → 8 after the claim).
import { useCallback, useRef, useState, type ReactNode } from "react";

import { IconCalendar } from "@/components/icons";
import { PageTransition, useSeen } from "@/components/motion";
import { cn } from "@/components/ui";
import { useNextStepAction } from "@/features/shared";
import { SAMPLE_COPY } from "@/lib/copy";
import { dailyReward, leaderboard, nextStep, rankBeforeLatestImprovement } from "@/lib/engine";
import { PAGE_HEADINGS } from "@/lib/routes";
import { useAppStore, useClock, useCurrentUser, useDerived, useUi } from "@/lib/store";
import type { Clock, UserState } from "@/lib/types";

import { Board } from "./board";
import { orderWithMeAt } from "./climb";
import { MyCard } from "./my-card";
import { PodiumCard } from "./podium-card";
import { stepReward } from "./step-reward";
import { useRowClimb } from "./use-row-climb";

const boardOf = (user: UserState, clock: Clock) => leaderboard(user, clock);
const stepOf = (user: UserState) => nextStep(user);
const dailyDueOf = (user: UserState, clock: Clock) => dailyReward(user, clock).due;

export function LeaderboardScreen(): ReactNode {
  const user = useCurrentUser();
  const clock = useClock();
  const board = useDerived(boardOf);
  const step = useDerived(stepOf);
  const dailyDue = useDerived(dailyDueOf);
  const dailyOpen = useUi((state) => state.blocking === "daily");
  const held = dailyDue === true || dailyOpen;
  // The Guard renders screens only for a signed-in, onboarded user; this covers the frame after a sign-out elsewhere.
  if (!user || !board || !step) return null;
  return (
    <PageTransition>
      <Screen board={board} clock={clock} held={held} key={held ? "held" : "live"} step={step} user={user} />
    </PageTransition>
  );
}

function Screen({
  user,
  clock,
  board,
  step,
  held,
}: {
  user: UserState;
  clock: Clock;
  board: NonNullable<ReturnType<typeof boardOf>>;
  step: NonNullable<ReturnType<typeof stepOf>>;
  held: boolean;
}) {
  const rank = board.me.rank;
  const boardRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const performStep = useNextStepAction();

  // The place the page last showed (read once, on the first render).
  const readSeen = useCallback(
    () => user.seen.leaderboardRank ?? rankBeforeLatestImprovement(user, clock) ?? undefined,
    [user, clock],
  );
  const [initialFrom] = useState(() => (held ? rank : (readSeen() ?? rank)));
  const climb = useRowClimb(initialFrom, rank, boardRef, asideRef);
  useSeen(
    readSeen,
    (value: number) => {
      if (!held) useAppStore.getState().markSeen("leaderboardRank", value);
    },
    climb.phase === "landed" ? rank : initialFrom,
    500,
  );

  const order = orderWithMeAt(board.rows, climb.position);

  return (
    <>
      {/* One grid. Narrow: header, card and podium, board (the spec's phone order). Wide: the card and the podium in a
          sticky column first in reading order (the right), the header and the board beside it. */}
      <div
        className={cn(
          "mx-auto grid w-full max-w-[72rem] items-start gap-6 px-gutter pb-12 pt-5",
          "@min-[760px]/content:grid-cols-[22.5rem_minmax(0,1fr)] @min-[760px]/content:grid-rows-[auto_1fr] @min-[760px]/content:gap-y-5",
          "@min-[900px]/content:gap-x-8",
        )}
      >
        <header className="flex flex-col gap-3 @min-[760px]/content:col-start-2 @min-[760px]/content:row-start-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 lg:sr-only">{PAGE_HEADINGS.leaderboard}</h1>
            <p className="text-body text-fg-2">
              ترتيب هذا الأسبوع حسب <bdi>XP</bdi>.
            </p>
          </div>
          <p className="self-start text-pretty rounded-control border border-dashed border-border-strong px-3 py-1.5 text-small text-fg-2">
            {SAMPLE_COPY.leaderboardNote}
          </p>
        </header>

        <aside
          className={cn(
            // phone: stacked · 640-760 px of content (a tablet, a small window beside the docked advisor): card and
            // podium side by side · 760 px and wider: one sticky column beside the board
            "grid gap-4 @min-[640px]/content:grid-cols-2 @min-[760px]/content:grid-cols-1",
            "@min-[760px]/content:col-start-1 @min-[760px]/content:row-span-2 @min-[760px]/content:row-start-1",
            "@min-[760px]/content:[@media(min-height:47.5rem)]:sticky @min-[760px]/content:[@media(min-height:47.5rem)]:top-[calc(var(--shell-top)+1.25rem)]",
          )}
          ref={asideRef}
        >
          <MyCard
            avatar={user.avatar}
            board={board}
            level={board.rows[rank - 1]?.level ?? 1}
            landed={climb.cardLanded}
            onStep={() => performStep(step)}
            places={climb.places}
            reward={stepReward(step, user)}
            shownRank={climb.cardRank}
            step={step}
          />
          <PodiumCard top3={board.top3} />
        </aside>

        <section
          aria-label={PAGE_HEADINGS.leaderboard}
          className="flex min-w-0 flex-col gap-3 @min-[760px]/content:col-start-2 @min-[760px]/content:row-start-2"
        >
          <Board boardRef={boardRef} order={order} phase={climb.phase} places={climb.places} segmentS={climb.segmentS} />
          <p className="flex items-center gap-2 px-1 text-small text-fg-3">
            <IconCalendar size={18} waypoint="off" />
            <span>
              يُحتسب <bdi>XP</bdi> أسبوعك من يوم الأحد.
            </span>
          </p>
        </section>
      </div>
    </>
  );
}
