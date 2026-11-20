// Owner: store. Names and signatures are the architect's contract; the bodies are the store agent's.
// React hooks over the two stores. Client components only (the importing component file starts with "use client").
//
// Rules every screen follows (STACK-NOTES 3, playbook 1.7):
// - Decide nothing on saved state before useHydrated() is true (the Guard already waits; screens inside it may assume it).
// - Select stable references only (`useAppStore(selectCurrentUser)`); compute derived values with useDerived, never inside
//   a zustand selector (a selector returning a new object each call is an infinite render loop).
import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react";

import type { Clock, HoldKey, LevelNumber, UserId, UserState, AvatarId } from "@/lib/types";
import type { BrainStatus } from "@/lib/brain/protocol";
import { fetchBrainStatus } from "@/lib/brain/client";
import { makeClock } from "@/lib/engine";

import { accountChips } from "./accounts";
import { selectCurrentUser, useAppStore } from "./store";
import { useUi } from "./ui";

// ── Hydration ─────────────────────────────────────────────────────────────────────────────────────────────────────

// `useAppStore.persist` is undefined on the server (no localStorage): touched only inside these callbacks.
function subscribeHydration(onChange: () => void): () => void {
  const api = useAppStore.persist as typeof useAppStore.persist | undefined;
  return api ? api.onFinishHydration(onChange) : () => {};
}

function hasHydrated(): boolean {
  const api = useAppStore.persist as typeof useAppStore.persist | undefined;
  return api ? api.hasHydrated() : false;
}

function serverHydrated(): boolean {
  return false;
}

/** False on the server and during the hydration render; true once the persisted store has loaded (STACK-NOTES 3.3). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, hasHydrated, serverHydrated);
}

// ── Users ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The signed-in user (stable reference until it changes), or null. */
export function useCurrentUser(): UserState | null {
  return useAppStore(selectCurrentUser);
}

/** Saved accounts for the sign-in chips (3.1), most recent sign-in first. */
export function useAccounts(): readonly { readonly userId: UserId; readonly name: string; readonly avatar: AvatarId; readonly level: LevelNumber }[] {
  const users = useAppStore((state) => state.users);
  return useMemo(() => accountChips({ currentUserId: null, users }), [users]);
}

// ── Clock ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The Clock of the server render and the hydration render only (nothing user-specific renders then). */
const EPOCH_CLOCK: Clock = { now: 0, today: "1970-01-01", weekStart: 0 };

const DEFAULT_TICK_MS = 60_000;

interface Ticker {
  clock: Clock | null;
  readonly listeners: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
}

const tickers = new Map<number, Ticker>();
const subscribers = new Map<number, (onChange: () => void) => () => void>();
const snapshots = new Map<number, () => Clock>();

function tickerFor(intervalMs: number): Ticker {
  let ticker = tickers.get(intervalMs);
  if (!ticker) {
    ticker = { clock: null, listeners: new Set(), timer: null };
    tickers.set(intervalMs, ticker);
  }
  return ticker;
}

/** The cached Clock for this interval, replaced (makeClock) only when it is older than the interval. Stable between ticks. */
function readClock(intervalMs: number): Clock {
  const ticker = tickerFor(intervalMs);
  const cached = ticker.clock;
  if (cached !== null && Date.now() - cached.now < intervalMs) return cached;
  const fresh = makeClock();
  ticker.clock = fresh;
  return fresh;
}

/** One shared interval per interval length, started with its first subscriber and stopped with its last. */
function subscribeTick(intervalMs: number): (onChange: () => void) => () => void {
  let subscribe = subscribers.get(intervalMs);
  if (!subscribe) {
    subscribe = (onChange) => {
      const ticker = tickerFor(intervalMs);
      ticker.listeners.add(onChange);
      if (ticker.timer === null) {
        ticker.timer = setInterval(() => {
          ticker.clock = makeClock();
          for (const listener of [...ticker.listeners]) listener();
        }, intervalMs);
      }
      return () => {
        ticker.listeners.delete(onChange);
        if (ticker.listeners.size === 0 && ticker.timer !== null) {
          clearInterval(ticker.timer);
          ticker.timer = null;
        }
      };
    };
    subscribers.set(intervalMs, subscribe);
  }
  return subscribe;
}

function getCachedClock(intervalMs: number): () => Clock {
  let snapshot = snapshots.get(intervalMs);
  if (!snapshot) {
    snapshot = () => readClock(intervalMs);
    snapshots.set(intervalMs, snapshot);
  }
  return snapshot;
}

function serverClock(): Clock {
  return EPOCH_CLOCK;
}

/**
 * The device clock, refreshed every `intervalMs` (default 60 s; /applications uses 5 s, spec 7.5). Stable between ticks.
 * Implementation contract: `useSyncExternalStore(subscribeTick(intervalMs), getCachedClock(intervalMs), () => EPOCH_CLOCK)`.
 * getCachedClock returns the cached Clock for that interval and replaces it (makeClock()) only when it is older than
 * intervalMs, so a component mounted after hydration (every screen: they mount inside the Guard) gets the REAL clock on
 * its first render, and `data-value`, weekly XP, rank, streak and daily-reward-due are right from the first frame.
 * EPOCH_CLOCK (server and hydration render only) is a fixed Clock; nothing user-specific renders then. This hook is the
 * one place outside handlers where the current time is read.
 */
export function useClock(intervalMs?: number): Clock {
  const ms = intervalMs !== undefined && intervalMs > 0 ? intervalMs : DEFAULT_TICK_MS;
  return useSyncExternalStore(subscribeTick(ms), getCachedClock(ms), serverClock);
}

// ── Derived values ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A value derived from the current user by an engine function, memoised on (user, clock). Pass a STABLE function
 * (module-level, or useCallback): `const roadmap = useDerived(roadmapOfUser)`. Null when signed out.
 */
export function useDerived<T>(compute: (user: UserState, clock: Clock) => T): T | null {
  const user = useCurrentUser();
  const clock = useClock();
  return useMemo(() => (user === null ? null : compute(user, clock)), [user, clock, compute]);
}

// ── Overlay holds ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Holds the overlay queue (and the nudge, and advisor navigation) while `active` (spec 3.15). Releases on unmount.
 * Sets the hold in a LAYOUT effect, so a hold active on a component's first render is in the UI store before any passive
 * effect of that commit runs (the overlay host also waits one animation frame before its first pass).
 */
export function useOverlayHold(key: HoldKey, active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    useUi.getState().hold(key);
    return () => useUi.getState().release(key);
  }, [key, active]);
}

// ── Brain status ──────────────────────────────────────────────────────────────────────────────────────────────────

const LOCAL_BRAIN: BrainStatus = { configured: false, provider: null, mode: "local" };

/** One request per page load, shared by every component (Strict Mode's second effect run finds it already started). */
let brainRequest: Promise<void> | null = null;

/** GET /api/brain once per page load, cached in the UI store. Null until known (treat as local). */
export function useBrainStatus(): BrainStatus | null {
  const brain = useUi((state) => state.brain);
  useEffect(() => {
    if (brainRequest !== null || useUi.getState().brain !== null) return;
    brainRequest = fetchBrainStatus()
      .then((status) => useUi.getState().setBrainStatus(status))
      .catch(() => useUi.getState().setBrainStatus(LOCAL_BRAIN));
  }, []);
  return brain;
}
