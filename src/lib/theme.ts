"use client";
// The app's visual design, chosen by the user (Mohammed, 18 Nov 2026: "i want the user to be able to change if he
// want"): «هادئ» = Darb, the default, and «لعبة» = Lawha, the game board (design/explore/lawha). The choice is a device
// preference, kept in its own localStorage key OUTSIDE the app store, so seeds (?seed=…) and the store contract never
// touch it. `?theme=lawha|darb` on any URL sets it too (handy on stage).
//
// The source of truth on screen is `data-theme` on <html>: the inline script of src/app/layout.tsx (THEME_BOOT_SCRIPT,
// ./theme-boot.ts) sets it before the first paint, so the wrong design never flashes; every Lawha rule lives under
// html[data-theme="lawha"] in src/app/theme-lawha.css. Darb is "no attribute", so Darb renders exactly as before.
import { useSyncExternalStore } from "react";

import { isTheme, THEME_STORAGE_KEY, type Theme } from "./theme-boot";

export { isTheme, THEMES, THEME_STORAGE_KEY, type Theme } from "./theme-boot";

const CHANGE_EVENT = "dalilak-theme-change";

function apply(theme: Theme): void {
  if (theme === "lawha") document.documentElement.setAttribute("data-theme", "lawha");
  else document.documentElement.removeAttribute("data-theme");
}

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "lawha" ? "lawha" : "darb";
}

/** Applies a design at once (no reload) and remembers it on this device. */
export function setTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  apply(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  // another tab switched: follow it
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    apply(isTheme(event.newValue) ? event.newValue : "darb");
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The design on screen and the way to change it. The server (and the hydration pass) always sees Darb. */
export function useTheme(): readonly [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "darb" as Theme);
  return [theme, setTheme] as const;
}
