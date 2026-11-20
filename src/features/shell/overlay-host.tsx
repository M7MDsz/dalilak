"use client";
// Owner: shell. The overlay queue of spec 3.15 (ARCHITECTURE 10), rendered once by the app shell (never on `/` or
// `/welcome`). It runs PASSES: the first one requestAnimationFrame after its mount (so every hold a page set on its first
// render, in a layout effect, is already in the UI store), then one on every change of either store (coalesced into
// the next frame). Each pass reads useUi.getState() and useAppStore.getState() inside the pass, never a render copy:
//   1. the daily reward first, alone (it blocks: setBlocking("daily")); holds do not delay it;
//   2. if any hold is set (reveal, cv-show, celebration, advisor-apply, map-open-full), wait;
//   3. pendingNews: the merged XP toast (+ its rank line), then markAnnounced; its coin flies to the user chip
//      (`xp-fly`), whose number counts up on landing; a level-up 0.6 s after the toast, when the coin lands, beside
//      the user chip (never in the toast stack, never over the page: level-up.tsx);
//   4. one badge toast per un-announced badge, then markAnnounced. The badges are raised just BEFORE the XP toast,
//      so the XP toast (the newest) heads the stack and the badges sit under it, first badge first.
// The queue is rebuilt from the `announced` flags, so a reload never loses news and never repeats it. Nothing here
// swallows a click: toasts and the level-up have no scrim; only the daily reward is modal.
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { BadgeEmblem } from "@/components/emblems";
import { useFlights, useInstant } from "@/components/motion";
import { toast, XpGlyph } from "@/components/ui";
import { xpNewsReason } from "@/lib/copy";
import { getBadge, OVERLAY_TIMING } from "@/lib/data";
import { dailyReward, makeClock, pendingNews } from "@/lib/engine";
import { hrefFor } from "@/lib/routes";
import { selectCurrentUser, useAppStore, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { BadgeId, DailyRewardInfo, XpNews } from "@/lib/types";

import { useViewport } from "@/features/shared";

import { DailyRewardSheet } from "./daily-reward";
import { LevelUpCard, type LevelUpView } from "./level-up";
import { clearXpFlights, landXpFlight, startXpFlight } from "./xp-flight";

/** The coin leaves its toast once the toast has dropped in (200 ms); it lands 600 ms later in the chip. */
const FLY_AFTER_MS = 200;
/** The longest the coin waits for its toast to be on screen before the chip just counts. */
const TOKEN_WAIT_MS = 700;

/** The XP coin that flies (the toast's own coin: a brass disk with the XP glyph in ink). */
function XpCoin(): ReactNode {
  return (
    <span className="grid size-11 place-items-center rounded-full border-[1.5px] border-xp-line bg-xp text-ink">
      <XpGlyph size={24} />
    </span>
  );
}

/** The newest XP toast's coin (Base UI stacks the newest at --toast-index 0). */
function newestXpCoin(): Element | null {
  const toasts = Array.from(document.querySelectorAll(`[data-testid="${TID.overlay.toastXp}"]`));
  const front = toasts.find((el) => el instanceof HTMLElement && el.style.getPropertyValue("--toast-index").trim() === "0") ?? toasts[0];
  return front?.querySelector("[data-xp-token]") ?? null;
}

export function OverlayHost(): ReactNode {
  const instant = useInstant();
  const { desktop } = useViewport();
  const { fly, layer } = useFlights();
  const [daily, setDaily] = useState<DailyRewardInfo | null>(null);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelUpView | null>(null);

  // Live values the passes read (a pass runs outside render).
  const live = useRef({ instant, desktop, fly });
  useEffect(() => {
    live.current = { instant, desktop, fly };
  });
  const dailyShown = useRef(false); // the daily overlay is on screen (or closing): the queue waits
  const dailyPostponed = useRef(false); // closed without claiming: offered again on the next load, not now
  const levelUpId = useRef(0);
  const timers = useRef(new Set<number>());
  const schedulePass = useRef<() => void>(() => undefined);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const openLevelUp = useCallback((news: NonNullable<XpNews["levelUp"]>) => {
    levelUpId.current += 1;
    setLevelUp({
      id: levelUpId.current,
      level: news.level,
      title: news.title,
      xpToNext: news.xpToNext,
      layout: live.current.desktop ? "desktop" : "phone",
    });
    useUi.getState().setBlocking("levelup");
  }, []);

  const closeLevelUp = useCallback(() => {
    setLevelUp(null);
    if (useUi.getState().blocking === "levelup") useUi.getState().setBlocking(null);
  }, []);

  /** The XP toast, its coin's flight to the chip, and the level-up when the coin lands. */
  const announceXp = useCallback(
    (news: XpNews) => {
      toast.xp({ amount: news.amount, reason: xpNewsReason(news), rank: news.rankLine });
      const levelUpNews = news.levelUp;
      const land = () => {
        landXpFlight(news.eventIds);
        if (levelUpNews) openLevelUp(levelUpNews);
      };
      if (live.current.instant) {
        landXpFlight(news.eventIds);
        if (levelUpNews) later(() => openLevelUp(levelUpNews), OVERLAY_TIMING.levelUpDelayMs);
        return;
      }
      const started = performance.now();
      const tryFly = () => {
        const from = newestXpCoin();
        const to = document.querySelector(`[data-testid="${TID.shell.xp}"]`);
        if (from && to) {
          void live.current.fly(from, to, <XpCoin />).then(land);
          return;
        }
        if (performance.now() - started > TOKEN_WAIT_MS) {
          landXpFlight(news.eventIds);
          if (levelUpNews) later(() => openLevelUp(levelUpNews), Math.max(0, OVERLAY_TIMING.levelUpDelayMs - TOKEN_WAIT_MS));
          return;
        }
        later(tryFly, 50);
      };
      later(tryFly, FLY_AFTER_MS);
    },
    [later, openLevelUp],
  );

  const announceBadges = useCallback((badges: readonly BadgeId[]) => {
    // Base UI stacks the newest toast on top: raised in reverse, the first badge ends up right under the XP toast
    // (which is raised after them, so it is the newest of all).
    for (const id of [...badges].reverse()) {
      const badge = getBadge(id);
      toast.badge({ badgeId: id, name: badge.name, description: badge.description, emblem: <BadgeEmblem id={id} />, href: hrefFor({ screen: "profile" }) });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let frame = 0;

    const pass = () => {
      if (!alive) return;
      const app = useAppStore.getState();
      const ui = useUi.getState();
      const user = selectCurrentUser(app);
      if (user === null) return;
      const clock = makeClock();

      // 1. The daily reward, first and alone.
      if (dailyShown.current) return;
      if (!dailyPostponed.current) {
        const info = dailyReward(user, clock);
        if (info.due) {
          dailyShown.current = true;
          setDaily(info);
          setDailyOpen(true);
          ui.setBlocking("daily");
          return;
        }
      }

      // 2. A running show holds everything else.
      if (ui.holds.length > 0) return;

      // 3 and 4. The news.
      const news = pendingNews(user, clock);
      const xp = news.xp;
      if (xp === null && news.badges.length === 0) return;
      if (xp !== null) startXpFlight(xp.eventIds); // the chip keeps this XP out of its number until the coin lands
      app.markAnnounced({ ...(xp !== null ? { xp: xp.eventIds } : {}), ...(news.badges.length > 0 ? { badges: news.badges } : {}) });
      // The badges first, then the XP: the stack is newest on top, so the XP toast heads it with its badges under it
      // (spec 10.2 step 4), and the coin always flies from the top toast.
      if (news.badges.length > 0) announceBadges(news.badges);
      if (xp !== null) announceXp(xp);
    };

    const schedule = () => {
      if (!alive || frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        pass();
      });
    };
    schedulePass.current = schedule;

    schedule(); // the first pass, one frame after mount
    const offApp = useAppStore.subscribe(schedule);
    const offUi = useUi.subscribe(schedule);
    return () => {
      alive = false;
      if (frame !== 0) window.cancelAnimationFrame(frame);
      frame = 0;
      offApp();
      offUi();
      schedulePass.current = () => undefined;
    };
  }, [announceBadges, announceXp]);

  // Unmount (sign-out, leaving the app shell): no timer fires later, nothing stays hidden from a chip, nothing blocks.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
      clearXpFlights();
      const ui = useUi.getState();
      if (ui.blocking !== null) ui.setBlocking(null);
    };
  }, []);

  return (
    <>
      <DailyRewardSheet
        info={daily}
        onClaim={() => {
          useAppStore.getState().claimDailyReward();
        }}
        onClosed={() => {
          dailyShown.current = false;
          setDaily(null);
          if (useUi.getState().blocking === "daily") useUi.getState().setBlocking(null);
          schedulePass.current();
        }}
        onDismiss={() => {
          // Closed: claimed (the XP is in the store) or postponed to the next load. Either way the queue goes on after
          // the close transition (onClosed).
          dailyPostponed.current = true;
          setDailyOpen(false);
        }}
        open={dailyOpen}
      />
      <AnimatePresence>{levelUp !== null ? <LevelUpCard key={levelUp.id} onClose={closeLevelUp} view={levelUp} /> : null}</AnimatePresence>
      {layer}
    </>
  );
}
