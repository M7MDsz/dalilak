"use client";
// Owner: shell. The on-screen keyboard on a phone. Safari on iOS and Chrome on Android (since 108) do not shrink the
// layout viewport for the keyboard: a fixed layer pinned to the bottom (the advisor's composer, a sheet's field) stays
// BEHIND the keyboard. The visual viewport does shrink, so while the keyboard is up this writes its box on <html>:
//   data-keyboard            the keyboard is up
//   --kb-top / --kb-height   the visible box (px), for a full-screen layer: globals.css `.kb-fit` pins it there
//   --kb-bottom              how far the keyboard reaches up from the layout viewport's bottom (px); globals.css turns
//                            --shell-bottom into it, so anything pinned "above the tab bar" now sits above the keyboard
// and the tab bar steps aside (`.kb-hide`). Cleared when the keyboard goes down, the hook unmounts or is disabled.
import { useEffect } from "react";

/** Less than this between the layout and the visual viewport is browser chrome (the URL bar), not a keyboard. */
const MIN_KEYBOARD_PX = 120;

const VARS = ["--kb-top", "--kb-height", "--kb-bottom"] as const;

function clear(root: HTMLElement): void {
  for (const name of VARS) root.style.removeProperty(name);
  root.removeAttribute("data-keyboard");
}

function revealFocusedField(): void {
  const field = document.activeElement;
  if (!(field instanceof HTMLElement) || !field.matches("input, textarea, [contenteditable]")) return;
  field.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function useKeyboardViewport(enabled: boolean): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) return;
    const root = document.documentElement;
    let frame = 0;
    const apply = () => {
      frame = 0;
      // the layout viewport: iOS keeps innerHeight for the keyboard on most versions, the root's client height always
      const layout = Math.max(window.innerHeight, root.clientHeight);
      const open = vv.scale < 1.05 && layout - vv.height > MIN_KEYBOARD_PX;
      if (!open) {
        if (root.hasAttribute("data-keyboard")) clear(root);
        return;
      }
      root.style.setProperty("--kb-top", `${Math.round(vv.offsetTop)}px`);
      root.style.setProperty("--kb-height", `${Math.round(vv.height)}px`);
      root.style.setProperty("--kb-bottom", `${Math.max(0, Math.round(layout - vv.offsetTop - vv.height))}px`);
      const opening = !root.hasAttribute("data-keyboard");
      root.setAttribute("data-keyboard", "");
      // the layer just shrank around the field being typed in: keep that field in sight (a sheet's input at the end of
      // its scrolling body would otherwise sit under the new bottom edge)
      if (opening) window.requestAnimationFrame(revealFocusedField);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(apply);
    };
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    apply();
    return () => {
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      clear(root);
    };
  }, [enabled]);
}
