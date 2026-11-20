"use client";
import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";

import { IconCheck } from "@/components/icons";
import { spring } from "@/lib/motion";
import { cn } from "@/components/ui/cn";

import { press } from "./button";

export interface ChipProps extends ComponentProps<"button"> {
  /** Selected: filled with ink, and the waypoint dot appears at its start (you picked this). */
  readonly selected?: boolean;
  readonly size?: "sm" | "md";
  /** Optional icon after the dot, before the label (18 px md, 16 px sm). */
  readonly icon?: ReactNode;
  /** The press frame without a pointer («دليلك» picking a chip for the user). */
  readonly pressed?: boolean;
}

/** A selectable quick reply or filter: onboarding answers, suggestion chips, the course tabs' field filter. */
export function Chip({ selected = false, size = "md", icon, pressed = false, className, children, type = "button", ...rest }: ChipProps) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "skin-chip wp-quiet tap-area relative inline-flex select-none items-center whitespace-nowrap rounded-full border-[1.5px] font-medium",
        "transition-[background-color,border-color,color,scale,translate] duration-200 ease-out disabled:pointer-events-none",
        press,
        size === "md" ? "h-10 gap-2 px-4 text-[0.9375rem] leading-[1.2]" : "h-8 gap-1.5 px-3 text-small leading-[1.2]",
        selected
          ? "border-solid bg-solid text-on-solid"
          : "border-border-strong bg-surface text-fg hover:border-fg active:border-fg data-pressed:border-fg",
        "disabled:border-border disabled:bg-transparent disabled:text-fg-3",
        className,
      )}
      data-pressed={pressed ? "" : undefined}
      data-state={selected ? "selected" : "idle"}
      type={type}
      {...rest}
    >
      {selected ? (
        <motion.span
          animate={{ scale: 1 }}
          aria-hidden
          className={cn("shrink-0 rounded-full bg-accent", size === "md" ? "size-2" : "size-1.5")}
          initial={{ scale: 0 }}
          transition={spring.snappy}
        />
      ) : null}
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export interface SkillChipProps extends ComponentProps<"span"> {
  /** has: the user holds this skill (check) · missing: the job needs it and the user does not (dashed) · plain: just a name */
  readonly state?: "has" | "missing" | "plain";
}

/** A skill name on a job or course card. Not interactive. Latin names (SQL, Power BI) are isolated for RTL. */
export function SkillChip({ state = "plain", className, children, ...rest }: SkillChipProps) {
  return (
    <span
      className={cn(
        "skin-skill inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-small font-medium",
        state === "has" && "border-fg text-fg",
        state === "missing" && "border-dashed border-border-strong text-fg-2",
        state === "plain" && "border-border-strong text-fg-2",
        className,
      )}
      data-state={state}
      {...rest}
    >
      {state === "has" ? <IconCheck className="text-ok-fg" size={16} strokeWidth={2.5} waypoint="off" /> : null}
      <bdi>{children}</bdi>
    </span>
  );
}
