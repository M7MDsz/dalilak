"use client";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { useRef, useState, type ReactElement, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";

import { surfaceOf, type Surface } from "./surface";

export interface TooltipProps {
  /** What the tooltip says (Arabic, short). Tooltips do not exist on touch screens: never put anything a phone user needs here. */
  readonly content: ReactNode;
  /** The element that triggers it (a button, an icon button). It receives the trigger props. */
  readonly children: ReactElement;
  readonly side?: "top" | "bottom" | "inline-start" | "inline-end";
  readonly className?: string;
}

/**
 * Tooltip (Base UI). Ink on paper, light on the stage (it reads the surface of its trigger when it opens).
 * Motion: scale 0.96 + fade from the anchor, 150 ms in, 100 ms out (playbook 1.3).
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [surface, setSurface] = useState<Surface>("paper");
  return (
    <BaseTooltip.Root
      onOpenChange={(open) => {
        if (open) setSurface(surfaceOf(trigger.current));
      }}
    >
      <BaseTooltip.Trigger ref={trigger} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="z-popover" collisionPadding={8} side={side} sideOffset={8}>
          <BaseTooltip.Popup
            className={cn(
              "max-w-xs origin-(--transform-origin) rounded-[0.625rem] bg-solid px-3 py-1.5 text-small font-medium text-on-solid",
              "transition-[opacity,scale] duration-150 ease-out data-ending-style:duration-100 data-ending-style:ease-in",
              "data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.96] data-ending-style:opacity-0 data-instant:transition-none",
              className,
            )}
            data-surface={surface}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
