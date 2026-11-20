import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { ContourBackdrop, type ContourIntensity } from "./contour-backdrop";

type StageTag = "div" | "section" | "aside" | "main" | "article" | "header";

export interface StageProps extends ComponentProps<"div"> {
  readonly as?: StageTag;
  /** Draw the contour texture behind the content (true = "quiet"). */
  readonly contour?: boolean | ContourIntensity;
  readonly contourSummit?: { readonly x: number; readonly y: number };
  readonly children?: ReactNode;
}

/**
 * The dark surface for set pieces (DESIGN.md 4.3: the stage rule). Sets data-surface="stage", so every kit component and
 * every semantic alias inside it (text-fg, bg-surface, border-border, …) flips to its stage form with no extra props.
 */
export function Stage({ as: Tag = "div", contour = false, contourSummit, className, children, ...rest }: StageProps) {
  return (
    <Tag
      className={cn("skin-stage relative isolate bg-bg text-fg", contour !== false && "overflow-hidden", className)}
      data-surface="stage"
      {...rest}
    >
      {contour !== false ? <ContourBackdrop intensity={contour === true ? "quiet" : contour} summit={contourSummit} /> : null}
      {children}
    </Tag>
  );
}
