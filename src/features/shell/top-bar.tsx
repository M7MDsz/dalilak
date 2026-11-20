"use client";
// Owner: shell. The desktop top bar of spec 2.3, across the content area: the page heading at the inline-start, the
// next-step pill in the middle, the user chip at the inline-end. The heading is PAGE_HEADINGS of the route (the section
// heading on /jobs/[id] and /learn/[id]); it is aria-hidden, because every page renders its own <h1> (lg:sr-only).
// It sticks to the top while the page scrolls (a hairline appears once the page has moved), and it is a container
// (`@container/top`), so the pill and the chip tighten when the advisor panel docks beside the content. The heading and
// the chip keep their whole width; the pill takes what is left and picks the form that fits whole (next-step-pill.tsx).
// While a level-up is open beside the chip, the pill (always) and, in the narrow bar, the heading fade out of its way.
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/ui";
import { useUi } from "@/lib/store";

import { topBarHeading } from "./nav";
import { NextStepPill } from "./next-step-pill";
import { UserChip } from "./user-chip";

/** The bar's height; the shell exports it as --shell-top (the toasts sit 12 px under it). */
export const TOP_BAR_HEIGHT = "5.5rem";

export function TopBar({ className }: { readonly className?: string }): ReactNode {
  const pathname = usePathname();
  const heading = topBarHeading(pathname);
  const scrolled = useScrolled();
  // The level-up stands beside the user chip (level-up.tsx); in the narrow bar (the panel docked) it reaches the
  // heading, so the heading steps aside for those few seconds, as the pill does.
  const levelUpOpen = useUi((state) => state.blocking === "levelup");
  return (
    <header
      className={cn(
        "@container/top sticky top-0 z-sticky h-22 border-b bg-bg transition-[border-color] duration-200 ease-out",
        scrolled ? "border-border" : "border-transparent",
        className,
      )}
    >
      <div className="grid h-full grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center gap-4 px-8 @max-[62rem]/top:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] @max-[62rem]/top:gap-3 @max-[62rem]/top:px-6">
        <p
          aria-hidden
          className={cn(
            "min-w-0 truncate text-h2 text-fg transition-opacity duration-150 ease-out @max-[46rem]/top:text-h3",
            levelUpOpen && "@max-[62rem]/top:opacity-0",
          )}
        >
          {heading}
        </p>
        <div className="flex min-w-0 justify-center">
          <NextStepPill />
        </div>
        <div className="flex min-w-0 justify-end">
          <UserChip />
        </div>
      </div>
    </header>
  );
}

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 4);
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => window.removeEventListener("scroll", read);
  }, []);
  return scrolled;
}
