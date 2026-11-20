"use client";
// Owner: signin. A numbered caption of the showcase: the piece's number in a ring, then its caption from the spec.
// Large on purpose (the jury asked for bigger numbered captions): 17 px text, a 28 px ring. The caption of the piece
// that has the turn is in full ink and its ring fills; the others rest one step quieter (on-stage-2, still 10:1).
import { cn } from "@/components/ui";

import { SHOWCASE_CAPTIONS } from "../copy";

export function Caption({ index, live, className }: { index: number; live: boolean; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2.5 text-title font-semibold", className)}>
      <span
        dir="ltr"
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] text-[0.9375rem] font-bold tabular-nums",
          "transition-[background-color,border-color,color] duration-500 ease-out",
          live ? "border-fg bg-fg text-bg" : "border-border-strong text-fg-2",
        )}
      >
        {index + 1}
      </span>
      <span className={cn("transition-colors duration-500 ease-out", live ? "text-fg" : "text-fg-2")}>{SHOWCASE_CAPTIONS[index]}</span>
    </p>
  );
}
