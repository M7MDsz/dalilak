// Small pieces of the kit: SampleTag, Divider, Kbd.
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

const SAMPLE_LABEL = {
  data: "بيانات تجريبية",
  company: "جهة تجريبية",
  cv: "سيرة تجريبية",
} as const;

export interface SampleTagProps extends ComponentProps<"span"> {
  /** data «بيانات تجريبية» (jobs, courses, leaderboard users) · company «جهة تجريبية» · cv «سيرة تجريبية» */
  readonly kind?: keyof typeof SAMPLE_LABEL;
  /** Other wording, when the spec gives one. */
  readonly children?: ReactNode;
}

/** The honest label on sample data (spec P6, 7.6): a small dashed tag, quiet but always readable. */
export function SampleTag({ kind = "data", className, children, ...rest }: SampleTagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-tag border border-dashed border-border-strong px-2 text-caption text-fg-3",
        className,
      )}
      {...rest}
    >
      {children ?? SAMPLE_LABEL[kind]}
    </span>
  );
}

export interface DividerProps extends ComponentProps<"div"> {
  /** line: a hairline · trail: the dotted trail (a quiet break, "more below", the leaderboard gap) */
  readonly variant?: "line" | "trail";
  /** Text in the middle of the line («المراتب 4 و5»). */
  readonly label?: ReactNode;
  readonly orientation?: "horizontal" | "vertical";
}

export function Divider({ variant = "line", label, orientation = "horizontal", className, ...rest }: DividerProps) {
  const stroke = variant === "line" ? "border-border" : "border-dotted border-border-strong";
  if (orientation === "vertical") {
    return <div aria-orientation="vertical" className={cn("w-0 self-stretch", variant === "line" ? "border-s" : "border-s-2", stroke, className)} role="separator" {...rest} />;
  }
  if (!label) {
    return <div className={cn("h-0 w-full", variant === "line" ? "border-t" : "border-t-2", stroke, className)} role="separator" {...rest} />;
  }
  const rule = cn("h-0 flex-1", variant === "line" ? "border-t" : "border-t-2", stroke);
  return (
    <div className={cn("flex w-full items-center gap-3", className)} role="separator" {...rest}>
      <span aria-hidden className={rule} />
      <span className="shrink-0 text-caption text-fg-3">{label}</span>
      <span aria-hidden className={rule} />
    </div>
  );
}

const key =
  "inline-flex h-6 min-w-6 items-center justify-center rounded-tag border border-b-2 border-border-strong bg-surface px-1.5 font-sans text-caption font-semibold text-fg-2";

export interface KbdProps extends ComponentProps<"kbd"> {
  /** A combination, written in the order it is pressed: ["Ctrl", "K"]. Kept left to right inside Arabic text. */
  readonly keys?: readonly string[];
}

/** A keyboard key, for shortcuts shown in the interface (Ctrl K opens «دليل»). Latin, left to right. */
export function Kbd({ keys, className, children, ...rest }: KbdProps) {
  if (keys) {
    return (
      <kbd className={cn("inline-flex items-center gap-1 font-sans", className)} dir="ltr" {...rest}>
        {keys.map((k) => (
          <kbd className={key} key={k}>
            {k}
          </kbd>
        ))}
      </kbd>
    );
  }
  return (
    <kbd className={cn(key, className)} dir="ltr" {...rest}>
      {children}
    </kbd>
  );
}
