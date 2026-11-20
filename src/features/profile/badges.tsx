"use client";
// Owner: profile. «الشارات» with «6 من 12» and the grid of all twelve badges (spec 3.13, 8.6), in the spec's order, each
// in the design system's BadgeMedal with its own emblem from @/components/emblems. Unlocked: the lit medal, the name,
// the description and the date. Locked: the unlit medal (visible, with its lock pip), the name, the tag «مقفلة» and the
// hint. Nothing is faded to say "locked": ink-2/ink-3 and the lock say it (DESIGN-BRIEF 3.1).
//
// badge-reveal (playbook 3.11, ARCH 17.3): a badge unlocked since the profile last showed turns over once, from its locked
// face to its lit face (rotateY 180 → 0, 600 ms, ease-in-out, the back face hidden). seen.profileBadges null (never
// opened) = every unlocked badge turns over once. The turns are one staggered group (at most 480 ms of stagger), after
// the page has risen. The list of shown badges is written back once the turns have played. Reduced motion: no turn.
// On a day whose daily reward is still due, the blocking daily overlay comes first (spec 3.15): the turns wait, as the
// map's opening does (ARCH 11.3: !dailyReward().due && blocking !== "daily"), so they are not spent behind its scrim;
// meanwhile the fresh medals show their locked face.
import { motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { BadgeEmblem } from "@/components/emblems";
import { useInstant } from "@/components/motion";
import { BadgeMedal, cn } from "@/components/ui";
import { dayMonth } from "@/lib/copy";
import { BADGES } from "@/lib/data";
import { ease } from "@/lib/motion";
import { dailyReward } from "@/lib/engine";
import { selectCurrentUser, useAppStore, useClock, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import { bidiNumbers } from "@/lib/format";
import type { Badge, BadgeId, UserState } from "@/lib/types";

import { PROFILE_COPY, ofTotal } from "./copy";
import { Section } from "./section";

const TURN_S = 0.6;
/** The page rises in 260 ms; the turns start once it has settled. */
const START_S = 0.45;
const MEDAL_PX = 80;

export function BadgesSection({ user }: { readonly user: UserState }): ReactNode {
  const instant = useInstant();
  const clock = useClock();
  const due = dailyReward(user, clock).due;
  const daily = useUi((state) => state.blocking === "daily");
  const ready = !due && !daily;
  const [armed, setArmed] = useState(ready);
  useEffect(() => {
    if (ready && !armed) setArmed(true);
  }, [ready, armed]);
  const unlockedAt = useMemo(() => new Map(user.badges.map((b) => [b.id, b.at] as const)), [user.badges]);
  const unlockedKey = BADGES.filter((b) => unlockedAt.has(b.id))
    .map((b) => b.id)
    .join(",");

  // What the profile showed last time, read once on the first render (never consumed: Strict-Mode safe).
  const [shownBefore] = useState<ReadonlySet<BadgeId> | null>(() => {
    const seen = user.seen.profileBadges;
    return seen === null ? null : new Set(seen);
  });
  const fresh = useMemo(
    () => (instant ? [] : BADGES.filter((b) => unlockedAt.has(b.id) && (shownBefore === null || !shownBefore.has(b.id))).map((b) => b.id)),
    // the set of turning badges is decided on arrival; a badge unlocked while the page is open turns as well
    [instant, unlockedAt, shownBefore],
  );
  const step = fresh.length > 1 ? Math.min(0.08, 0.48 / (fresh.length - 1)) : 0;
  const playMs = Math.round((START_S + step * Math.max(0, fresh.length - 1) + TURN_S) * 1000) + 200;

  // Remember what was shown, after the turns have played.
  useEffect(() => {
    if (!armed) return;
    const ids = unlockedKey === "" ? [] : (unlockedKey.split(",") as BadgeId[]);
    const timer = window.setTimeout(() => {
      const current = selectCurrentUser(useAppStore.getState());
      if (!current) return;
      const before = current.seen.profileBadges;
      if (before !== null && before.length === ids.length && ids.every((id) => before.includes(id))) return;
      useAppStore.getState().markSeen("profileBadges", ids);
    }, playMs);
    return () => window.clearTimeout(timer);
  }, [unlockedKey, playMs, armed]);

  const count = unlockedAt.size;

  return (
    <Section
      headingId="profile-badges"
      meta={
        <span className="text-title text-fg-2 tabular-nums" data-testid={TID.profile.badgesCount} data-value={count}>
          {ofTotal(count, BADGES.length)}
        </span>
      }
      title={PROFILE_COPY.badges}
    >
      <ul className="grid grid-cols-3 gap-x-3 gap-y-8 pt-1 @min-[640px]/content:grid-cols-4 @min-[640px]/content:gap-x-5 @min-[1000px]/content:grid-cols-6">
        {BADGES.map((badge) => {
          const at = unlockedAt.get(badge.id);
          const i = fresh.indexOf(badge.id);
          // a fresh badge: its locked face until the turns may start, then the turn
          const turn = i < 0 ? null : armed ? START_S + i * step : "wait";
          return <BadgeCell at={at ?? null} badge={badge} key={badge.id} turn={turn} />;
        })}
      </ul>
    </Section>
  );
}

function BadgeCell({ badge, at, turn }: { readonly badge: Badge; readonly at: number | null; readonly turn: number | "wait" | null }): ReactNode {
  const unlocked = at !== null;
  return (
    <li className="flex min-w-0 flex-col items-center gap-3 text-center" data-state={unlocked ? "unlocked" : "locked"} data-testid={TID.profile.badge(badge.id)}>
      <Medal id={badge.id} turn={turn} unlocked={unlocked} />
      <div className="flex min-w-0 flex-col items-center gap-1">
        <p className={cn("text-[0.9375rem] leading-snug font-semibold", unlocked ? "text-fg" : "text-fg-2")}>{badge.name}</p>
        {unlocked ? (
          <>
            <p className="text-small leading-snug text-balance text-fg-2">{badge.description}</p>
            <p className="text-caption text-fg-3">{dayMonth(at)}</p>
          </>
        ) : (
          <>
            <span className="mt-0.5 inline-flex h-6 items-center rounded-tag border border-border-strong px-2 text-caption text-fg-2">{PROFILE_COPY.locked}</span>
            <p className="text-small leading-snug text-balance text-fg-3">{bidiNumbers(badge.hint)}</p>
          </>
        )}
      </div>
    </li>
  );
}

/** The medal; a fresh one turns over from its locked face (`turn`: its delay in seconds; "wait": still locked-faced; null: none). */
function Medal({ id, unlocked, turn }: { readonly id: BadgeId; readonly unlocked: boolean; readonly turn: number | "wait" | null }): ReactNode {
  const lit = <BadgeMedal bare emblem={<BadgeEmblem id={id} />} size="md" state="earned" />;
  const unlit = <BadgeMedal bare emblem={<BadgeEmblem id={id} locked />} size="md" state="locked" />;
  if (!unlocked || turn === "wait") return unlit;
  if (turn === null) return lit;
  const delay = turn;
  return (
    <span className="relative block [perspective:600px]" style={{ width: MEDAL_PX, height: MEDAL_PX }}>
      <motion.span
        animate={{ rotateY: 0 }}
        className="relative block size-full [transform-style:preserve-3d]"
        initial={{ rotateY: 180 }}
        transition={{ duration: TURN_S, ease: ease.inOut, delay }}
      >
        <span className="absolute inset-0 grid place-items-center [backface-visibility:hidden]">{lit}</span>
        <span className="absolute inset-0 grid place-items-center [backface-visibility:hidden] [transform:rotateY(180deg)]">{unlit}</span>
      </motion.span>
    </span>
  );
}
