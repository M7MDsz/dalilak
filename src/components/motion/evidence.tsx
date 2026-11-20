"use client";
// Highlight (playbook block 17): the evidence marker in the CV. One flat token colour (`--mark`, which flips on the stage) drawn as a sized
// background that grows from the right (the start of an Arabic line) and wraps across lines. CSS: `.evidence` in motion.css.
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Wrap one evidence sentence. `on` draws the marker (600 ms ease-out) after `delay` seconds; turning it off removes it at
 * once (lines never un-draw). Latin terms inside should be wrapped in <bdi> by the caller.
 */
export function Highlight({ on, delay = 0, children, className }: { on: boolean; delay?: number; children: ReactNode; className?: string }) {
  return (
    <span className={cn("evidence", className)} data-on={on ? "" : undefined} style={on && delay > 0 ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </span>
  );
}

/** Turns true one frame after mount, so a marker mounted already "on" still draws (use for evidence shown by an event). */
export function useArmed(): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return armed;
}
