"use client";
// useTypeOn (playbook block 19): «دليل» fills a field, the sample CV writes itself. Typing belongs to «دليل»'s hands only:
// never for answers. The value goes into a real, controlled, read-only field (one text node, so Arabic joins as it grows).
import { useEffect, useState } from "react";

import { useInstant } from "./provider";

/**
 * Reveals `units` (from `graphemes()`, `words()` or lines) one at a time so that the whole string takes `ms`.
 * Restarts from empty whenever `play` turns true or the text changes; stopping (`play` false) keeps what was written.
 * Reduced motion and still frames write it all at once.
 */
export function useTypeOn(units: readonly string[], ms: number, play: boolean): { value: string; done: boolean } {
  const instant = useInstant();
  const [count, setCount] = useState(0);
  const text = units.join("");
  useEffect(() => {
    if (!play) return;
    const total = units.length;
    if (instant || total === 0) {
      setCount(total);
      return;
    }
    setCount(0);
    const tick = Math.max(16, ms / total);
    const timer = setInterval(() => {
      setCount((c) => {
        if (c + 1 >= total) clearInterval(timer);
        return Math.min(c + 1, total);
      });
    }, tick);
    return () => clearInterval(timer);
    // `text` stands for `units`: callers may pass a new array with the same content on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, text, ms, instant]);
  return { value: units.slice(0, count).join(""), done: units.length > 0 && count >= units.length };
}
