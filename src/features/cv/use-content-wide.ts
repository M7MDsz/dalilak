"use client";
// Owner: cv. True when the shell's content area (#app-content) is at least `min` px wide: the same line the page's
// container queries (`@min-[900px]/content:`) draw, for the few behaviours CSS cannot express (collapsing the document
// on a phone once it has been read, following the show with the page scroll). Layout itself stays in CSS.
import { useSyncExternalStore } from "react";

const MIN = 900;

function contentWidth(): number {
  return document.getElementById("app-content")?.clientWidth ?? window.innerWidth;
}

function subscribe(onChange: () => void): () => void {
  const el = document.getElementById("app-content");
  if (!el || typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }
  const observer = new ResizeObserver(onChange);
  observer.observe(el);
  return () => observer.disconnect();
}

export function useContentWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => contentWidth() >= MIN,
    () => true,
  );
}
