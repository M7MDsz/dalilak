"use client";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * The press of playbook 1.1, shared by every control of the kit: down at once (scale 0.97 and a 2 px sink), back eased in
 * 200 ms. `data-pressed` gives the same frame to a press «دليل» performs (the `pressed` prop).
 */
export const press =
  "active:scale-[0.97] active:translate-y-0.5 active:transition-none data-pressed:scale-[0.97] data-pressed:translate-y-0.5 data-pressed:transition-none";

const base =
  "group/button relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold " +
  "transition-[background-color,border-color,border-width,color,background-size,scale,translate] duration-200 ease-out " +
  "disabled:pointer-events-none aria-disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  // the accent: one per screen, the user's next action. Label is dark navy (5.2:1 on the coral). A key: a 3 px edge in
  // accent-ink under the coral face; pressed, the face sinks 2 px and the edge collapses to 1 px (a border, not a shadow).
  primary:
    "border-b-[3px] border-accent-ink bg-accent text-on-accent hover:bg-accent-hover " +
    "active:border-b active:bg-accent-press data-pressed:border-b data-pressed:bg-accent-press " +
    "disabled:border-transparent disabled:bg-surface-2 disabled:text-fg-3 " +
    "aria-disabled:border-transparent aria-disabled:bg-surface-2 aria-disabled:text-fg-3",
  // ink outline; hover fills it with ink (a colour change, never a lift)
  secondary:
    "border-[1.5px] border-fg bg-surface text-fg stage:bg-transparent " +
    "hover:border-solid hover:bg-solid hover:text-on-solid active:border-solid active:bg-solid active:text-on-solid " +
    "data-pressed:border-solid data-pressed:bg-solid data-pressed:text-on-solid " +
    "disabled:border-border disabled:bg-transparent disabled:text-fg-3 aria-disabled:border-border aria-disabled:text-fg-3",
  // the dotted trail under the label; hover walks it solid from the inline-start; pressed, the trail is yours (accent)
  ghost:
    "trail text-fg hover:trail-walk active:trail-walk data-pressed:trail-walk " +
    "active:text-accent-fg active:[--trail-ink:var(--accent-fg)] data-pressed:text-accent-fg data-pressed:[--trail-ink:var(--accent-fg)] " +
    "disabled:text-fg-3 disabled:[--trail-dots:var(--fg-4)] aria-disabled:text-fg-3",
};

const sizes: Record<ButtonVariant | "box", Record<ButtonSize, string>> = {
  box: {
    sm: "h-10 gap-2 rounded-[0.625rem] px-4 text-small font-semibold",
    md: "h-12 gap-2.5 rounded-control px-5.5 text-body font-semibold",
    lg: "h-14 gap-3 rounded-[0.875rem] px-7 text-title",
  },
  primary: { sm: "", md: "", lg: "" },
  secondary: { sm: "", md: "", lg: "" },
  ghost: {
    sm: "h-9 gap-1.5 rounded-tag px-1 text-small font-semibold [--trail-y:0.375rem]",
    md: "h-11 gap-2 rounded-tag px-1.5 text-body font-semibold [--trail-y:0.5rem]",
    lg: "h-13 gap-2 rounded-tag px-1.5 text-title [--trail-y:0.5rem]",
  },
};

/**
 * The classes of a Button, for an element that cannot be a Button (a NavLink styled as a button). Secondary and ghost carry
 * `wp-quiet`: the dot of their icon takes the icon's colour (globals.css, the waypoint rule); only the primary keeps it coral.
 */
export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  // skin-btn / skin-btn-{variant}: hooks for the «لعبة» design only (src/app/theme-lawha.css); no style in Darb
  return cn(base, press, variants[variant], variant === "ghost" ? sizes.ghost[size] : sizes.box[size], variant !== "primary" && "wp-quiet", "leading-[1.2]", "skin-btn", `skin-btn-${variant}`, className);
}

/** The running arc: a quiet ring with one arc going round (the StatusMark loop; one of the five allowed loops). */
export function RunningArc({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden className={cn("shrink-0", className)} fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <circle cx="12" cy="12" opacity="0.28" r="9" stroke="currentColor" strokeWidth="2.25" />
      <g className="origin-center animate-run motion-reduce:animate-none">
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeLinecap="round" strokeWidth="2.25" />
      </g>
    </svg>
  );
}

export interface ButtonProps extends useRender.ComponentProps<"button"> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** An icon from @/components/icons (20 px for md and lg, 18 px for sm). Sits after the label (inline-end) by default. */
  readonly icon?: ReactNode;
  readonly iconPosition?: "start" | "end";
  /** Shows the press frame without a pointer: «دليل» pressing the button in front of the user. */
  readonly pressed?: boolean;
  /** Keeps the label and width, swaps the icon for the running arc, and stops further presses. */
  readonly loading?: boolean;
}

/**
 * Button. `primary` = the accent (one per screen), `secondary` = ink outline, `ghost` = the dotted trail.
 * Compose with a link: `<Button render={<NavLink href="/path" />}>افتح مساري</Button>`.
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "end",
  pressed = false,
  loading = false,
  className,
  children,
  render,
  onClick,
  ...rest
}: ButtonProps) {
  const mark = loading ? <RunningArc size={size === "sm" ? 16 : 18} /> : icon;
  // hover on the primary: the colour stays, the forward icon steps 2 px toward where it points (the inline-end)
  const lead = variant === "primary" && !loading ? "transition-[translate] duration-200 ease-out rtl:group-hover/button:-translate-x-0.5 ltr:group-hover/button:translate-x-0.5" : "";
  const content = (
    <>
      {mark && iconPosition === "start" ? <span className="inline-flex shrink-0">{mark}</span> : null}
      <span className="min-w-0 truncate py-1">{children}</span>
      {mark && iconPosition === "end" ? <span className={cn("inline-flex shrink-0", lead)}>{mark}</span> : null}
    </>
  );
  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        type: render ? undefined : "button",
        className: buttonStyles({ variant, size, className }),
        "aria-busy": loading || undefined,
        "aria-disabled": loading || undefined,
        onClick: loading ? undefined : onClick, // a keyboard press on a loading button does nothing
        children: content,
      },
      rest,
      pressed ? ({ "data-pressed": "" } as Record<string, string>) : {},
      { "data-variant": variant } as Record<string, string>,
    ),
  });
}
