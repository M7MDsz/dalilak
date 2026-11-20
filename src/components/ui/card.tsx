import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type CardVariant = "sheet" | "plain" | "stage";

export interface CardProps extends Omit<ComponentProps<"div">, "title"> {
  /**
   * The label that sits IN the border line, the way a contour line opens for its height («سيرتك الذاتية»).
   * On a `stage` card it sits inside the card instead, as its first line (a cut line would cross two surfaces).
   */
  readonly label?: ReactNode;
  /** The dot before the label: `muted` by default; `accent` only on the card that holds the user's next step. The label is
   *  14 px semibold (a presenter points at it). */
  readonly dot?: "accent" | "muted" | "none";
  /** sheet: white, raised (default) · plain: drawn outline on the page, no fill · stage: the dark card (a set piece) */
  readonly variant?: CardVariant;
  /** Hover darkens the border and a press gives a small press (for a card that is itself a link or a button). */
  readonly interactive?: boolean;
  /** none: you pad the children yourself (lists that run to the edge) */
  readonly padding?: "card" | "none";
}

const surfaces: Record<CardVariant, string> = {
  sheet: "border border-border bg-surface",
  plain: "border border-border-strong bg-transparent",
  // a stage card inside a Stage is lifted to the raised stage tone, so it does not vanish into its surroundings
  stage: "border border-transparent bg-stage text-on-stage [[data-surface=stage]_&]:border-stage-3 [[data-surface=stage]_&]:bg-stage-2",
};

function Dot({ tone }: { tone: "accent" | "muted" }) {
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", tone === "accent" ? "bg-accent" : "bg-fg-3")} />;
}

/**
 * Card. With a `label`, the label is cut into the top border (a native fieldset legend, so the cut works on any background
 * without knowing its colour). Without one it is a plain box.
 */
export function Card({ label, dot = "muted", variant = "sheet", interactive = false, padding = "card", className, children, ...rest }: CardProps) {
  const shape = cn(
    "skin-card relative min-w-0 rounded-card",
    surfaces[variant],
    // the line a label is cut into is an index contour (contour-2): it must survive a projector, where the plain hairline
    // (line) washes out. Unlabelled cards keep the hairline.
    Boolean(label) && variant === "sheet" && "border-contour-line-2",
    interactive && "transition-[border-color,scale] duration-200 ease-out hover:border-border-strong active:scale-[0.99] active:transition-none",
    interactive && variant === "plain" && "hover:border-fg",
    className,
  );
  const labelRow = label ? (
    <span className="inline-flex items-center gap-2 text-small font-semibold text-fg-2">
      {dot !== "none" ? <Dot tone={dot} /> : null}
      {label}
    </span>
  ) : null;

  if (variant === "stage") {
    return (
      <div className={cn(shape, padding === "card" && "p-card")} data-surface="stage" {...rest}>
        {labelRow ? <div className="mb-2">{labelRow}</div> : null}
        {children}
      </div>
    );
  }

  if (!label) {
    return (
      <div className={cn(shape, padding === "card" && "p-card")} {...rest}>
        {children}
      </div>
    );
  }

  // A fieldset is the one element whose border opens for its legend on any background. It is announced as a group named
  // by the label, which is what a labelled card is.
  return (
    <fieldset className={cn(shape, "m-0", padding === "card" ? "px-card pb-card pt-1" : "p-0")} {...(rest as ComponentProps<"fieldset">)}>
      <legend className="ms-3 px-2">{labelRow}</legend>
      {children}
    </fieldset>
  );
}
