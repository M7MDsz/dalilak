"use client";
// Owner: shell. The XP the user chip must not show yet (spec 3.15 `xp-fly`, 2.7 `xp-chip-fill`).
// The reward is seen landing in the total: the chip shows the total WITHOUT the XP events that are still news
// (`announced: false`, waiting for their toast or their celebration beat) and WITHOUT the events whose token is still
// flying from the toast to the chip. The overlay host adds the event ids here just before it marks them announced and
// removes them when the token lands, so the chip's number counts up at the landing. `shell-xp`'s data-value is always
// the true total (from the first frame).
import { useSyncExternalStore } from "react";

import type { XpEvent } from "@/lib/types";

const EMPTY: ReadonlySet<string> = new Set();
let flying: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Marks these XP events as in the air (the chip keeps them out of its number until they land). */
export function startXpFlight(eventIds: readonly string[]): void {
  if (eventIds.length === 0) return;
  const next = new Set(flying);
  for (const id of eventIds) next.add(id);
  flying = next;
  emit();
}

/** The token landed (or could not fly): the chip counts these events in. */
export function landXpFlight(eventIds: readonly string[]): void {
  if (eventIds.length === 0 || flying.size === 0) return;
  const next = new Set(flying);
  for (const id of eventIds) next.delete(id);
  flying = next.size === 0 ? EMPTY : next;
  emit();
}

/** Clears every flight (the overlay host unmounts: nothing must stay hidden from the chip). */
export function clearXpFlights(): void {
  if (flying.size === 0) return;
  flying = EMPTY;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): ReadonlySet<string> {
  return flying;
}

function serverSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

export function useXpInFlight(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/**
 * The total the chip shows: every event counted once, unless it is still news or still flying. Pure (exported for the
 * shell's own use; no state of its own).
 */
export function shownXpTotal(events: readonly XpEvent[], inFlight: ReadonlySet<string>): number {
  let total = 0;
  for (const event of events) {
    if (event.announced && !inFlight.has(event.id)) total += event.amount;
  }
  return total;
}
