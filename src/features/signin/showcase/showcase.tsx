"use client";
// Owner: signin. The moving half of the sign-in page (spec 3.1 "Showcase"). Desktop: the trail composition, scaled to
// the stage (or the one-piece band when the stage is too small to keep its text at 14 px or more). Phone: the band
// above the form. Only one of them is rendered, so `signin-showcase` and `signin-showcase-piece` stay unique.
import { useViewport } from "@/features/shared";
import { Stage } from "@/components/ui";

import { ShowcaseBand } from "./band";
import { MIN_TRAIL_SCALE, TrailStage, useStageFit } from "./trail-stage";

export function Showcase() {
  const { desktop } = useViewport();
  if (!desktop) return <ShowcaseBand variant="phone" className="h-[15.75rem] shrink-0" />;
  return <DesktopShowcase />;
}

function DesktopShowcase() {
  const [ref, fit] = useStageFit();
  return (
    <div ref={ref} className="relative h-full min-h-0 w-full">
      {fit === null ? (
        <Stage aria-hidden className="absolute inset-0" />
      ) : fit.s >= MIN_TRAIL_SCALE ? (
        <TrailStage fit={fit} />
      ) : (
        <ShowcaseBand variant="panel" className="absolute inset-0" />
      )}
    </div>
  );
}
