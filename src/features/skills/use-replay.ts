"use client";
// Owner: skills. The tree's arrival (spec 3.5 motion moments): on the first visit `tree-grow` plays, then the stars
// earned since what this page last showed land (`star-fill`), spreading down the tree along its lines, and the nodes
// they open unlock (`node-unlock`). The baseline is `seen.skillStars`, or on a first visit the state before the user's
// latest star (engine `starsBeforeLatestStar`): in the demo, Power BI's first star fills and «تصوير البيانات» opens.
// What was shown is remembered (`markSeen("skillStars")`) only after it has been shown, so a quick visit does not
// swallow the replay. Reduced motion and still frames show the end state at once (and remember it).
//
// The driver is a handful of timers that move a time cursor from one star step to the next; everything drawn is derived
// from the cursor (the stars shown now), and every component animates its own change from what it showed before.
// Strict Mode: the effect re-schedules the same timers after its simulated unmount; nothing is consumed.
import { useEffect, useMemo, useState } from "react";

import { useInstant } from "@/components/motion";
import { skillStars, starsBeforeLatestStar } from "@/lib/engine";
import { SKILL_IDS } from "@/lib/ids";
import { useAppStore } from "@/lib/store";
import type { SkillId, StarCount, StarMap, UserState } from "@/lib/types";

import { LAG, fromSeen, replayPlan, sameStars, starsAt, type StarViews } from "./model";

function toSeen(stars: StarMap): Partial<Record<SkillId, StarCount>> {
  const out: Partial<Record<SkillId, StarCount>> = {};
  for (const id of SKILL_IDS) if (stars[id] > 0) out[id] = stars[id];
  return out;
}

export interface TreeReplay {
  /** The stars each part of the tree draws now (the lines first, then the disks, then what they open: LAG). */
  readonly views: StarViews;
  /** The tree grows on mount (only true during the grow, so a field opened later does not grow again). */
  readonly grow: boolean;
  readonly settled: boolean;
}

export function useTreeReplay(user: UserState): TreeReplay {
  const instant = useInstant();
  const current = useMemo(() => skillStars(user), [user]);
  const [setup] = useState(() => {
    const seen = user.seen.skillStars;
    const grow = seen === null;
    const from = grow ? starsBeforeLatestStar(user) : fromSeen(seen);
    return { from, grow, plan: replayPlan(from, current, grow) };
  });
  const playing = !instant && (setup.grow || setup.plan.steps.length > 0);
  const [t, setT] = useState(playing ? 0 : Number.POSITIVE_INFINITY);

  useEffect(() => {
    if (!playing) return;
    const lags = Object.values(LAG);
    const times = [...new Set([setup.plan.growFor, ...setup.plan.steps.flatMap((s) => lags.map((lag) => s.at + lag)), setup.plan.endsAt])].sort((a, b) => a - b);
    const timers = times.map((time) => window.setTimeout(() => setT((prev) => Math.max(prev, time)), time * 1000));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [playing, setup]);

  const settled = !playing || t >= setup.plan.endsAt;
  const views = useMemo<StarViews>(() => {
    if (settled) return { line: current, node: current, out: current, unlock: current };
    const at = (lag: number) => starsAt(setup.from, setup.plan, t - lag);
    return { line: at(LAG.line), node: at(LAG.node), out: at(LAG.out), unlock: at(LAG.unlock) };
  }, [settled, current, setup, t]);

  // Remember what was shown, after it was shown (and again if the stars change while the page is open).
  const remembered = user.seen.skillStars;
  useEffect(() => {
    if (!settled) return;
    if (remembered !== null && sameStars(fromSeen(remembered), current)) return;
    useAppStore.getState().markSeen("skillStars", toSeen(current));
  }, [settled, current, remembered]);

  return { views, grow: setup.grow && !instant && t < setup.plan.growFor, settled };
}
