"use client";
// useSeen (playbook block 27): "on arrival" replays. Animate from what the user last saw to what is true now, once.
// `read`/`write` talk to a `seen` slice of the persisted store. Mount the component only after the store has hydrated.
import { useEffect, useEffectEvent, useState } from "react";

/**
 * Returns the value to animate FROM (the remembered one, or `current` when nothing was remembered). The new value is
 * written back only after `playMs`, so a quick visit does not swallow the replay. Strict-Mode safe.
 * Typical use: <Ring from={useSeen(read, write, match)} value={match} />.
 */
export function useSeen<T>(read: () => T | undefined, write: (value: T) => void, current: T, playMs = 1200): T {
  const [from] = useState(() => read() ?? current);
  const commit = useEffectEvent(() => write(current));
  useEffect(() => {
    const timer = setTimeout(() => commit(), playMs);
    return () => clearTimeout(timer);
  }, [current, playMs]);
  return from;
}
