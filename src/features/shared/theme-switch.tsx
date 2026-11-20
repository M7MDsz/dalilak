"use client";
// Owner: shell. The design switch (Mohammed, 18 Nov 2026: "i want the user to be able to change if he want"): «هادئ» is
// Darb, the default; «لعبة» is Lawha, the game board. Two forms of one control:
// - ThemeToggle: the compact two-option switch at the foot of the desktop side nav.
// - ThemePicker: the profile section with a small drawing of each design (reachable on a phone too).
// Switching is instant (data-theme on <html>, src/lib/theme.ts) and remembered on this device; ?theme=lawha|darb also works.
import type { ReactNode } from "react";

import { cn } from "@/components/ui";
import { useTheme, type Theme } from "@/lib/theme";

const LABEL: Record<Theme, string> = { darb: "هادئ", lawha: "لعبة" };
const NOTE: Record<Theme, string> = {
  darb: "خريطة كنتور وخطوط هادئة",
  lawha: "لوحة لعب بقطع وحواف واضحة",
};
const ORDER: readonly Theme[] = ["darb", "lawha"];

/** The compact switch: «التصميم» and two options side by side. */
export function ThemeToggle({ className }: { readonly className?: string }): ReactNode {
  const [theme, setTheme] = useTheme();
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <span className="text-caption font-medium text-fg-3" id="theme-toggle-label">
        التصميم
      </span>
      <div aria-labelledby="theme-toggle-label" className="flex rounded-full border border-border-strong bg-surface p-0.5" data-testid="theme-toggle" role="radiogroup">
        {ORDER.map((option) => {
          const on = option === theme;
          return (
            <button
              aria-checked={on}
              className={cn(
                "h-7 rounded-full px-3 text-caption font-semibold transition-colors duration-200 ease-out",
                on ? "bg-solid text-on-solid" : "text-fg-2 hover:text-fg",
              )}
              data-testid={`theme-toggle-${option}`}
              key={option}
              onClick={() => setTheme(option)}
              role="radio"
              type="button"
            >
              {LABEL[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The profile section: a drawing of each design to pick from. */
export function ThemePicker({ className }: { readonly className?: string }): ReactNode {
  const [theme, setTheme] = useTheme();
  return (
    <section aria-labelledby="theme-picker-title" className={cn("flex min-w-0 flex-col gap-5 rounded-card border border-border bg-surface p-card @min-[640px]/content:p-6", className)} data-testid="theme-picker">
      <header className="flex flex-col gap-1">
        <h2 className="text-h3 text-fg" id="theme-picker-title">
          شكل التطبيق
        </h2>
        <p className="text-small text-fg-2">اختر التصميم الذي يناسبك. يتغيّر فوراً، ويُحفظ في هذا المتصفح.</p>
      </header>
      <div className="grid gap-4 @min-[640px]/content:grid-cols-2" role="radiogroup" aria-labelledby="theme-picker-title">
        {ORDER.map((option) => {
          const on = option === theme;
          return (
            <button
              aria-checked={on}
              className={cn(
                "group/pick flex flex-col gap-3 rounded-card border-[1.5px] bg-surface p-3 text-start transition-[border-color,scale] duration-200 ease-out active:scale-[0.99]",
                on ? "border-fg" : "border-border-strong hover:border-fg-2",
              )}
              data-testid={`theme-pick-${option}`}
              key={option}
              onClick={() => setTheme(option)}
              role="radio"
              type="button"
            >
              {option === "darb" ? <DarbPreview /> : <LawhaPreview />}
              <span className="flex items-center justify-between gap-3 px-1">
                <span className="flex flex-col">
                  <span className="text-title text-fg">{LABEL[option]}</span>
                  <span className="text-small text-fg-2">{NOTE[option]}</span>
                </span>
                <span
                  aria-hidden
                  className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", on ? "border-fg bg-fg" : "border-border-strong")}
                >
                  {on ? <span className="size-2 rounded-full bg-accent" /> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// The two drawings use each design's OWN colours (not the tokens), so each shows itself whatever design is on.

function DarbPreview(): ReactNode {
  return (
    <svg aria-hidden className="block h-auto w-full rounded-[0.625rem]" viewBox="0 0 280 140">
      <rect fill="#ebf0f6" height="140" width="280" />
      {[18, 34, 50, 66].map((r) => (
        <ellipse cx="206" cy="58" fill="none" key={r} rx={r * 1.5} ry={r} stroke="#bccbe3" strokeWidth="1" />
      ))}
      <rect fill="#ffffff" height="92" rx="10" stroke="#c9d3e2" width="118" x="16" y="24" />
      <rect fill="#0e1e3d" height="8" rx="4" width="70" x="32" y="40" />
      <rect fill="#c9d3e2" height="6" rx="3" width="86" x="32" y="56" />
      <rect fill="#c9d3e2" height="6" rx="3" width="60" x="32" y="68" />
      <rect fill="#f54d38" height="18" rx="7" width="86" x="32" y="86" />
      <path d="M206 120 L206 96 L210 76 L206 58" fill="none" stroke="#0e1e3d" strokeLinecap="round" strokeWidth="3" />
      <circle cx="206" cy="58" fill="#f54d38" r="6" stroke="#ffffff" strokeWidth="2" />
      <circle cx="206" cy="96" fill="#0e1e3d" r="5" />
    </svg>
  );
}

function LawhaPreview(): ReactNode {
  return (
    <svg aria-hidden className="block h-auto w-full rounded-[0.625rem]" viewBox="0 0 280 140">
      <rect fill="#ede4d3" height="140" width="280" />
      <rect fill="#111837" height="108" rx="12" width="112" x="158" y="20" />
      <rect fill="#16204d" height="108" rx="12" stroke="#111837" strokeWidth="2" width="112" x="162" y="16" />
      {[0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2, 3].map((col) => <circle cx={176 + col * 26} cy={30 + row * 26} fill="#f6f1e4" fillOpacity="0.14" key={`${row}-${col}`} r="1.6" />),
      )}
      <path d="M182 108 H214 V72 H246 V40" fill="none" stroke="#fbf7ee" strokeLinejoin="round" strokeWidth="6" />
      <rect fill="#ffc42e" height="18" rx="5" stroke="#111837" strokeWidth="2" width="22" x="235" y="30" />
      <rect fill="#f2542d" height="16" rx="5" stroke="#111837" strokeWidth="2" width="16" x="206" y="64" />
      <rect fill="#17905a" height="14" rx="4" stroke="#111837" strokeWidth="2" width="14" x="175" y="101" />
      <rect fill="#111837" height="92" rx="12" width="118" x="12" y="30" />
      <rect fill="#fbf7ee" height="92" rx="12" stroke="#111837" strokeWidth="2" width="118" x="16" y="26" />
      <rect fill="#111837" height="9" rx="3" width="70" x="32" y="42" />
      <rect fill="#ffc42e" height="14" rx="7" stroke="#111837" strokeWidth="2" width="44" x="32" y="58" />
      <rect fill="#111837" height="20" rx="7" width="86" x="29" y="88" />
      <rect fill="#f2542d" height="20" rx="7" stroke="#111837" strokeWidth="2" width="86" x="32" y="85" />
    </svg>
  );
}
