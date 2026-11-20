"use client";
// Sheet (playbook block 23): every dialog except the advisor panel (stage sheet, skill panel, apply sheet, avatar picker,
// «المزيد», level-up, daily reward). Base UI Dialog with CSS transitions on its starting/ending styles: a bottom sheet on
// phones, a centred dialog from 1024 px; both rise 16 px and fade in 200 ms, and go back the same way in 150 ms (ease-in).
// The flat scrim (ink at 30%: a palette token, not raw black) fades with it. Focus is trapped inside and returns to
// whatever opened it.
import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode, RefObject } from "react";

import { IconClose } from "@/components/icons";
import { cn } from "@/lib/cn";

const WIDTH = { sm: "lg:w-[400px]", md: "lg:w-[480px]", lg: "lg:w-[640px]" } as const;

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  surface = "paper",
  hideTitle = false,
  closeLabel = "إغلاق",
  initialFocus,
  finalFocus,
  onOpenChangeComplete,
  testId,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Pinned under the scrolling body (the sheet's actions). */
  footer?: ReactNode;
  size?: keyof typeof WIDTH;
  /** "stage" paints the sheet as the dark stage (the level-up, the daily reward). Portals do not inherit data-surface. */
  surface?: "paper" | "stage";
  /** Keep the title for screen readers only. */
  hideTitle?: boolean;
  closeLabel?: string;
  initialFocus?: RefObject<HTMLElement | null> | boolean;
  finalFocus?: RefObject<HTMLElement | null> | boolean;
  /** After the open or close transition has finished (start the next step of a show here). */
  onOpenChangeComplete?: (open: boolean) => void;
  testId?: string;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} onOpenChangeComplete={onOpenChangeComplete}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-ink/30 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-end overflow-y-auto lg:place-items-center lg:p-6">
          <Dialog.Popup
            data-testid={testId}
            data-surface={surface}
            initialFocus={initialFocus}
            finalFocus={finalFocus}
            className={cn(
              "flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface text-fg outline-none",
              "transition-[opacity,translate] duration-200 ease-out",
              "data-starting-style:translate-y-4 data-starting-style:opacity-0",
              "data-ending-style:translate-y-4 data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in",
              "lg:max-h-[85dvh] lg:rounded-2xl",
              WIDTH[size],
              className,
            )}
          >
            <div className="flex items-start gap-3 px-5 pt-5 pb-3">
              <div className="min-w-0 flex-1">
                <Dialog.Title className={cn("text-xl leading-snug font-bold text-fg", hideTitle && "sr-only")}>{title}</Dialog.Title>
                {description !== undefined && <Dialog.Description className="mt-1 text-base text-fg-2">{description}</Dialog.Description>}
              </div>
              <Dialog.Close
                aria-label={closeLabel}
                className="-me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.97] active:transition-none"
              >
                <IconClose size={22} waypoint="off" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer !== undefined && <div className="border-t border-border px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
