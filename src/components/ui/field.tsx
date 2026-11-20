"use client";
import { useId, type ComponentProps, type ReactNode } from "react";

import { IconWarning } from "@/components/icons";
import { cn } from "@/components/ui/cn";

export interface FieldShellProps {
  readonly id: string;
  readonly label: ReactNode;
  /** Visually hide the label (it stays for screen readers). Only where the context already names the field. */
  readonly hideLabel?: boolean;
  readonly hint?: ReactNode;
  /** An error replaces the hint. Errors are written in the warning colour with the warning icon (never the accent). */
  readonly error?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Label above, control, then one line of hint or error. Shared by TextField, TextArea and SelectField. */
export function FieldShell({ id, label, hideLabel = false, hint, error, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label className={cn("text-small font-medium text-fg-2", hideLabel && "sr-only")} htmlFor={id} id={`${id}-label`}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-small font-medium text-warn-fg" id={`${id}-msg`}>
          <IconWarning size={18} waypoint="off" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-small text-fg-3" id={`${id}-msg`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The box every text control shares: 1.5 px border, focus = ink border and a 3 px halo (no glow), caret in the accent.
 * Disabled: the box sinks into a well and its border turns dashed (on paper and on the stage). Adornment icons are quiet
 * (`wp-quiet`: their dot is not the coral waypoint).
 */
export const fieldBox =
  "skin-field wp-quiet flex w-full items-center gap-2.5 rounded-control border-[1.5px] border-border-strong bg-surface px-4 text-fg " +
  "transition-[border-color] duration-200 ease-out hover:border-fg-2 " +
  "focus-within:border-fg focus-within:ring-3 focus-within:ring-halo " +
  "data-invalid:border-warn-fg data-invalid:focus-within:border-warn-fg " +
  "has-disabled:pointer-events-none has-disabled:border-dashed has-disabled:border-fg-4 has-disabled:bg-surface-2 has-disabled:text-fg-3";

const control = "min-w-0 flex-1 bg-transparent text-fg caret-accent outline-none placeholder:text-fg-3 disabled:text-fg-3";

export interface TextFieldProps extends Omit<ComponentProps<"input">, "size"> {
  readonly label: ReactNode;
  readonly hideLabel?: boolean;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  /** md: 52 px (forms) · lg: 58 px (the sign-in name) */
  readonly size?: "md" | "lg";
  /** An icon at the inline-start inside the box (search). 20 px. */
  readonly icon?: ReactNode;
  /** Something at the inline-end inside the box (a clear button, a unit). */
  readonly end?: ReactNode;
  readonly fieldClassName?: string;
}

export function TextField({ label, hideLabel, hint, error, size = "md", icon, end, className, fieldClassName, id, ...rest }: TextFieldProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell className={className} error={error} hideLabel={hideLabel} hint={hint} id={fieldId} label={label}>
      <div className={cn(fieldBox, size === "md" ? "h-13" : "h-14.5 rounded-[0.875rem]", fieldClassName)} data-invalid={error ? "" : undefined}>
        {icon ? <span className="inline-flex shrink-0 text-fg-3">{icon}</span> : null}
        <input
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(control, "h-full", size === "md" ? "text-body" : "text-title font-normal")}
          id={fieldId}
          {...rest}
        />
        {end ? <span className="inline-flex shrink-0">{end}</span> : null}
      </div>
    </FieldShell>
  );
}

export interface TextAreaProps extends ComponentProps<"textarea"> {
  readonly label: ReactNode;
  readonly hideLabel?: boolean;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly fieldClassName?: string;
}

/** Grows with its text (field-sizing: content) from `rows` lines up to 16 lines, then scrolls. */
export function TextArea({ label, hideLabel, hint, error, className, fieldClassName, id, rows = 4, style, ...rest }: TextAreaProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell className={className} error={error} hideLabel={hideLabel} hint={hint} id={fieldId} label={label}>
      <div className={cn(fieldBox, "items-stretch py-3", fieldClassName)} data-invalid={error ? "" : undefined}>
        <textarea
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(control, "max-h-[16lh] resize-none text-body [field-sizing:content]")}
          id={fieldId}
          rows={rows}
          style={{ minHeight: `${rows}lh`, ...style }}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}
