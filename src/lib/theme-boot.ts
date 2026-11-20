// The design switch's server-safe half (no React): the names and the script that src/app/layout.tsx inlines in <head>.
// The hook and the setter are in ./theme.ts (client). Why the switch exists: ./theme.ts.

export type Theme = "darb" | "lawha";

export const THEMES: readonly Theme[] = ["darb", "lawha"];
export const THEME_STORAGE_KEY = "dalilak-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "darb" || value === "lawha";
}

/**
 * Runs in <head> before the page paints (a string: it cannot import anything). A `?theme=` override wins and is
 * remembered; otherwise the saved choice; otherwise Darb (no attribute on <html>).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var u=new URLSearchParams(location.search).get("theme");if(u==="lawha"||u==="darb"){localStorage.setItem(k,u);}var t=localStorage.getItem(k);if(t==="lawha"){document.documentElement.setAttribute("data-theme","lawha");}}catch(e){}})();`;
