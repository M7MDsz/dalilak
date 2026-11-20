"use client";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { press } from "./button";
import { Tooltip } from "./tooltip";

export type IconButtonVariant = "plain" | "outline" | "solid";
export type IconButtonSize = "sm" | "md" | "lg";

const variants: Record<IconButtonVariant, string> = {
  plain: "text-fg-2 hover:bg-hover hover:text-fg active:bg-hover data-pressed:bg-hover disabled:text-fg-4",
  outline:
    "border-[1.5px] border-border-strong bg-surface text-fg hover:border-fg active:border-fg data-pressed:border-fg " +
    "disabled:border-border disabled:text-fg-4",
  solid: "bg-solid text-on-solid hover:bg-fg-2 active:bg-fg-2 data-pressed:bg-fg-2 disabled:bg-surface-2 disabled:text-fg-3",
};

const sizes: Record<IconButtonSize, string> = { sm: "size-9", md: "size-11", lg: "size-13" };

export interface IconButtonProps extends Omit<useRender.ComponentProps<"button">, "children" | "aria-label"> {
  /** The Arabic name of the action, read by screen readers («إغلاق», «إرسال», «إيقاف»). Required: an icon alone has no name. */
  readonly label: string;
  /** An icon from @/components/icons: 18 px for sm, 20 px for md, 24 px for lg. */
  readonly icon: ReactNode;
  readonly variant?: IconButtonVariant;
  readonly size?: IconButtonSize;
  /** Also show the label as a tooltip on hover and keyboard focus (desktop only; never the only way to learn the action). */
  readonly tip?: boolean;
  readonly pressed?: boolean;
}

/** A round button with only an icon. Always has an Arabic `label`. */
export function IconButton({ label, icon, variant = "plain", size = "md", tip = false, pressed = false, className, render, ...rest }: IconButtonProps) {
  const element = useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        type: render ? undefined : "button",
        "aria-label": label,
        className: cn(
          "inline-grid shrink-0 select-none place-items-center rounded-full transition-[background-color,border-color,color,scale,translate] duration-200 ease-out",
          `skin-iconbtn skin-iconbtn-${variant}`,
          "disabled:pointer-events-none",
          press,
          variants[variant],
          sizes[size],
          // plain and outline are quiet (close, search, filters): their icon's dot is not the coral waypoint. The solid one
          // is the action itself (send), so it keeps the coral. Add data-wp-live to a quiet one that is your next action.
          variant !== "solid" && "wp-quiet",
          className,
        ),
        children: icon,
      },
      rest,
      pressed ? ({ "data-pressed": "" } as Record<string, string>) : {},
      { "data-variant": variant } as Record<string, string>,
    ),
  });
  return tip ? <Tooltip content={label}>{element}</Tooltip> : element;
}
