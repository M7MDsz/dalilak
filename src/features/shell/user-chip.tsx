"use client";
// Owner: shell. The user chip of spec 2.7, drawn as the game layer's HUD plate (docs/GAME-LAYER.md 5.1, `PlayerChip`).
// Desktop: a pressable plate on a 3 px ink plinth (it opens /profile): the avatar with its level ring · the first name over
// «المستوى [2] · مستكشف» (the level as the ink token) · a brass track of eight segments with «180 / 350 XP» · the
// campfire and the days. Phone (compact): the same plate as a pill: avatar · level token · XP total · streak.
// Test ids: shell-user-chip (the plate's face), shell-level (data-value = level), shell-xp (data-value = total XP),
// shell-streak (data-value = days); only one form is rendered at a time, so they stay unique.
//
// Built from the layer's parts (Tile, LevelToken, Segments) rather than `PlayerChip` itself, because the chip must keep
// two numbers apart that PlayerChip takes as one: what it SHOWS and what its data-value says.
// Motion (spec 2.7, 3.15): the number the chip shows leaves out the XP that is still news or still flying from its toast
// (xp-flight.ts), so `xp-fly` lands in the total: the number counts up and the segments fill in counted steps
// (`xp-chip-fill`); on a level change the old sheet fills to its end (the number counts to its threshold), a fresh sheet
// starts (a cut, never an un-draw), and only then do the level token and the title roll and the number count on.
// data-value always holds the true final number from the first frame.
// Reading order follows the spec (avatar first); the row is drawn reversed so the avatar sits at the chip's outer end,
// as in the Darb home (design/explore/darb/map/final-home.png).
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { LevelToken, Segments, Tile } from "@/components/game";
import { NavLink, NumberTicker, Roll, useInstant } from "@/components/motion";
import { cn, StreakFlame } from "@/components/ui";
import { levelFor, streakInfo, totalXp } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import { hrefFor } from "@/lib/routes";
import { useClock, useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { LevelInfo, UserState } from "@/lib/types";

import { firstName } from "./nav";
import { shownXpTotal, useXpInFlight } from "./xp-flight";

/** The brass track of the plate (GAME-LAYER 5.1: eight segments). */
const SEGMENTS = 8;
/**
 * How long the old sheet takes to fill to its end before the fresh sheet starts: the layer's Segments fill one after
 * another 70 ms apart (180 ms each), and the number counts for 800 ms; both are done by then (the layer's levelUpMs).
 */
const FINISH_SHEET_MS = SEGMENTS * 70 + 260;

interface ChipNumbers {
  /** True values (data-value). */
  readonly total: number;
  readonly level: LevelInfo;
  /** What the chip shows now (news and flights left out). */
  readonly shown: number;
  readonly streak: number;
}

function useChipNumbers(user: UserState): ChipNumbers {
  const clock = useClock();
  const inFlight = useXpInFlight();
  return useMemo(() => {
    const total = totalXp(user);
    return {
      total,
      level: levelFor(total),
      shown: Math.min(total, shownXpTotal(user.xpEvents, inFlight)),
      streak: streakInfo(user, clock).current,
    };
  }, [user, clock, inFlight]);
}

interface SheetView {
  /** The XP the track draws and the number shows (the old sheet's end during a level change). */
  readonly total: number;
  readonly info: LevelInfo;
}

/**
 * The level sheet the chip draws for a shown total. A rise inside a level fills the segments in counted steps; a level
 * change first fills the old sheet to its end, then cuts to the new level's sheet (never an un-draw) and fills it.
 */
function useLevelSheet(shown: number): SheetView {
  const instant = useInstant();
  const [view, setView] = useState<SheetView>(() => ({ total: shown, info: levelFor(shown) }));
  const shownLevel = useRef(view.info.level);

  useEffect(() => {
    const info = levelFor(shown);
    if (instant || info.level < shownLevel.current) {
      shownLevel.current = info.level;
      setView({ total: shown, info });
      return;
    }
    if (info.level > shownLevel.current) {
      setView((v) => ({ ...v, total: v.info.next ?? v.total })); // 1. finish the old sheet
      let inner = 0;
      const outer = window.setTimeout(() => {
        shownLevel.current = info.level;
        setView({ total: info.from, info }); // 2. a fresh sheet for the new level
        inner = window.setTimeout(() => setView({ total: shown, info }), 60); // 3. fill it
      }, FINISH_SHEET_MS);
      return () => {
        window.clearTimeout(outer);
        window.clearTimeout(inner);
      };
    }
    setView({ total: shown, info });
  }, [shown, instant]);

  return view;
}

function fillsOf(view: SheetView): number[] {
  const { from, next } = view.info;
  if (next === null || next <= from) return Array.from({ length: SEGMENTS }, () => 1);
  const filled = Math.max(0, Math.min(1, (view.total - from) / (next - from))) * SEGMENTS;
  return Array.from({ length: SEGMENTS }, (_, i) => Math.max(0, Math.min(1, filled - i)));
}

/** The plate is a link to /profile (the route transition plays); the Tile hands it its classes, data and children. */
function ProfileLink({ children, ...rest }: Omit<ComponentProps<"a">, "href">): ReactNode {
  return (
    <NavLink {...rest} href={hrefFor({ screen: "profile" })}>
      {children}
    </NavLink>
  );
}

/** Desktop: the HUD plate in the top bar. */
export function UserChip({ className }: { readonly className?: string }): ReactNode {
  const user = useCurrentUser();
  if (user === null) return null;
  return <FullChip className={className} user={user} />;
}

function FullChip({ user, className }: { readonly user: UserState; readonly className?: string }): ReactNode {
  const numbers = useChipNumbers(user);
  const view = useLevelSheet(numbers.shown);
  const fills = fillsOf(view);
  return (
    <Tile
      className={cn("w-fit max-w-full shrink-0", className)}
      data-testid={TID.shell.userChip}
      depth="sm"
      faceClassName="wp-quiet min-h-14 flex-row-reverse items-center gap-3 py-2 ps-4 pe-2 @max-[46rem]/top:ps-3"
      radius="control"
      render={<ProfileLink />}
    >
      {/* the player: the avatar with the level ring, the first name, «المستوى [2] · مستكشف» */}
      <Avatar id={user.avatar} level={view.info.level} size={40} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="max-w-[9rem] truncate text-small leading-tight font-bold text-fg @max-[54rem]/top:hidden">{firstName(user.name)}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption text-fg-2" data-testid={TID.shell.level} data-value={numbers.level.level}>
          <span>المستوى</span>
          <LevelToken level={view.info.level} size="sm" value={numbers.level.level} />
          <span aria-hidden className="@max-[46rem]/top:hidden">
            ·
          </span>
          <Roll className="font-semibold text-fg @max-[46rem]/top:hidden" id={view.info.title}>
            {view.info.title}
          </Roll>
        </span>
      </span>
      <span aria-hidden className="h-8 w-px shrink-0 bg-border" />
      {/* the way to the next level: «180 / 350 XP» over eight brass segments (the coin of `xp-fly` lands here) */}
      <span className="flex w-32 shrink-0 flex-col gap-1.5 @max-[46rem]/top:w-26" data-testid={TID.shell.xp} data-value={numbers.total}>
        <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-caption font-semibold text-fg-3 tabular-nums" dir="ltr">
          <span className="text-small font-bold text-xp-fg">
            <NumberTicker value={view.total} />
          </span>
          {view.info.next === null ? "XP" : `/ ${formatNumber(view.info.next)} XP`}
        </span>
        <Segments fills={fills} gap={2} height="xs" tone="xp" />
      </span>
      <span aria-hidden className="h-8 w-px shrink-0 bg-border" />
      {/* the streak: the campfire and the days (it rolls and flickers when the number changes: streak-tick) */}
      <StreakFlame days={numbers.streak} size="sm" testId={TID.shell.streak} />
    </Tile>
  );
}

/** Phone: the plate as a pill: avatar · level token · XP total · streak. */
export function UserChipCompact({ className }: { readonly className?: string }): ReactNode {
  const user = useCurrentUser();
  if (user === null) return null;
  return <CompactChip className={className} user={user} />;
}

function CompactChip({ user, className }: { readonly user: UserState; readonly className?: string }): ReactNode {
  const numbers = useChipNumbers(user);
  const view = useLevelSheet(numbers.shown);
  return (
    <Tile
      className={cn("w-fit shrink-0", className)}
      data-testid={TID.shell.userChip}
      depth="sm"
      faceClassName="wp-quiet h-11 flex-row-reverse items-center gap-2 ps-3 pe-1"
      radius="full"
      render={<ProfileLink />}
    >
      <Avatar id={user.avatar} level={view.info.level} size={34} />
      <LevelToken level={view.info.level} size="sm" testId={TID.shell.level} value={numbers.level.level} />
      <span className="inline-flex items-baseline gap-1 text-small font-bold text-xp-fg tabular-nums" data-testid={TID.shell.xp} data-value={numbers.total} dir="ltr">
        <NumberTicker value={view.total} />
        <span className="text-caption font-semibold">XP</span>
      </span>
      <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
      <StreakFlame days={numbers.streak} size="sm" testId={TID.shell.streak} />
    </Tile>
  );
}
