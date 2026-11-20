"use client";
// Owner: shell (written in full by the architect: it is small and every screen depends on its first-render behaviour).
// Viewport classes from matchMedia through useSyncExternalStore: correct on the FIRST render of anything mounted after
// hydration (every screen and the shell, which mount inside the Guard); {false, false} only on the server and in the
// hydration render. desktop = ≥ 1024 px (spec 2.3 vs 2.4); wide = ≥ 1280 px (the advisor panel docks, 3.14).
// Use it only to decide WHICH element renders where the spec says "only one is rendered" (side nav vs tab bar, the
// desktop launcher, which keeps `shell-advisor-launcher` unique): never hide a duplicate with CSS. Page layout uses the
// content container query (`@container/content`), not this.
import { useSyncExternalStore } from "react";

export interface Viewport {
  readonly desktop: boolean;
  readonly wide: boolean;
}

const QUERY_DESKTOP = "(min-width: 1024px)";
const QUERY_WIDE = "(min-width: 1280px)";
const SERVER_VIEWPORT: Viewport = { desktop: false, wide: false };

let cached: Viewport = SERVER_VIEWPORT;

function readViewport(): Viewport {
  const desktop = window.matchMedia(QUERY_DESKTOP).matches;
  const wide = window.matchMedia(QUERY_WIDE).matches;
  if (cached.desktop !== desktop || cached.wide !== wide) cached = { desktop, wide };
  return cached;
}

function subscribeViewport(onChange: () => void): () => void {
  const lists = [window.matchMedia(QUERY_DESKTOP), window.matchMedia(QUERY_WIDE)];
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

function serverViewport(): Viewport {
  return SERVER_VIEWPORT;
}

export function useViewport(): Viewport {
  return useSyncExternalStore(subscribeViewport, readViewport, serverViewport);
}
