"use client";
import { Select } from "@base-ui/react/select";
import { useId, useRef, useState, type ReactNode } from "react";

import { IconCheck, IconChevronDown } from "@/components/icons";
import { cn } from "@/components/ui/cn";

import { press } from "./button";
import { fieldBox } from "./field";
import { surfaceOf, type Surface } from "./surface";

export interface SelectItem<V extends string> {
  readonly value: V;
  readonly label: string;
}

export interface SelectFieldProps<V extends string> {
  readonly label: ReactNode;
  /** Filters rows already say what they filter: hide the label there (it stays for screen readers). */
  readonly hideLabel?: boolean;
  readonly items: readonly SelectItem<V>[];
  readonly value?: V | null;
  readonly defaultValue?: V | null;
  readonly onValueChange?: (value: V | null) => void;
  /** Shown while nothing is chosen («كل المدن»). */
  readonly placeholder?: string;
  /** md: 52 px like a text field · sm: 44 px for a filters row */
  readonly size?: "md" | "sm";
  /** An icon at the inline-start of the trigger (IconLocation for the city, IconFilter for the field). 20 px. */
  readonly icon?: ReactNode;
  readonly hint?: ReactNode;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly className?: string;
  /** data-testid for the trigger. */
  readonly testId?: string;
  /** Each item gets data-testid="{prefix}-{value}" (spec 3.7: "jobs-filter-city" gives jobs-filter-city-riyadh). */
  readonly itemTestIdPrefix?: string;
}

/**
 * SelectField (Base UI Select) for the city and field filters. A normal dropdown under the trigger (not the overlapping
 * macOS style), keyboard and typeahead from Base UI, the chosen item marked with a check.
 */
export function SelectField<V extends string>({
  label,
  hideLabel,
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  size = "md",
  icon,
  hint,
  disabled,
  name,
  className,
  testId,
  itemTestIdPrefix,
}: SelectFieldProps<V>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [surface, setSurface] = useState<Surface>("paper");

  return (
    // Base UI renders its hidden input as `position: fixed; top: 0; left: 0` (1 x 1 px). Fixed is placed against the nearest
    // transformed or contained ancestor, which on a phone can sit beside the viewport and push the page sideways; held
    // absolute inside this relative box, the input stays in the corner of the field it belongs to.
    <div className={cn("relative flex min-w-0 flex-col gap-2 [&>input[aria-hidden=true]]:absolute!", className)}>
      <Select.Root<V>
        defaultValue={defaultValue}
        disabled={disabled}
        items={items as { value: V; label: string }[]}
        name={name}
        onOpenChange={(open) => {
          if (open) setSurface(surfaceOf(trigger.current));
        }}
        onValueChange={(next) => onValueChange?.(next)}
        value={value}
      >
        <Select.Label className={cn("text-small font-medium text-fg-2", hideLabel && "sr-only")}>{label}</Select.Label>
        <Select.Trigger
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(
            fieldBox,
            "group cursor-pointer select-none justify-between text-start focus-visible:outline-none",
            "transition-[border-color,scale,translate] data-popup-open:border-fg data-disabled:pointer-events-none data-disabled:border-dashed data-disabled:border-fg-4 data-disabled:bg-surface-2 data-disabled:text-fg-3",
            press,
            size === "md" ? "h-13 text-body" : "h-11 rounded-[0.625rem] px-3.5 text-[0.9375rem]",
          )}
          data-testid={testId}
          ref={trigger}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {icon ? <span className="inline-flex shrink-0 text-fg-3">{icon}</span> : null}
            <Select.Value className="truncate data-placeholder:text-fg-3" placeholder={placeholder} />
          </span>
          <Select.Icon className="inline-flex shrink-0 text-fg-2 transition-[rotate] duration-200 ease-out group-data-popup-open:rotate-180">
            <IconChevronDown size={20} waypoint="off" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner alignItemWithTrigger={false} className="z-popover outline-none" collisionPadding={8} sideOffset={6}>
            <Select.Popup
              className={cn(
                "max-h-[min(22rem,var(--available-height))] min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-control border border-border bg-surface p-1.5 text-fg shadow-float outline-none",
                "transition-[opacity,scale] duration-150 ease-out data-ending-style:duration-100 data-ending-style:ease-in",
                "data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.96] data-ending-style:opacity-0",
              )}
              data-surface={surface}
            >
              <Select.List>
                {items.map((item) => (
                  <Select.Item
                    className="flex h-11 cursor-pointer select-none items-center gap-2.5 rounded-[0.5rem] px-3 text-body outline-none data-highlighted:bg-hover data-selected:font-semibold"
                    data-testid={itemTestIdPrefix ? `${itemTestIdPrefix}-${item.value}` : undefined}
                    key={item.value}
                    value={item.value}
                  >
                    <span className="inline-flex w-5 shrink-0">
                      <Select.ItemIndicator className="inline-flex text-fg">
                        <IconCheck size={18} strokeWidth={2.5} waypoint="off" />
                      </Select.ItemIndicator>
                    </span>
                    <Select.ItemText className="min-w-0 truncate">{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {hint ? (
        <p className="text-small text-fg-3" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
