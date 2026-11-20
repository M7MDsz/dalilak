"use client";
// MotionProvider and useInstant (playbook 1.6). Put <MotionProvider> once at the root of the app (src/components/providers.tsx
// already does); never nest a second one.
import { MotionConfig, useReducedMotion, useReducedMotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { spring } from "@/lib/motion";

import { settleDeparture } from "./route-departure";

const StillContext = createContext(false);

/**
 * Reduced motion, still frames and the app's default spring.
 * - Reduced motion (the OS setting): the spec's one rule (PRODUCT-SPEC "How to read"): every duration is 0 and every
 *   moment shows its end state. Motion skips every animation, CSS ends at once (motion.css), and imperative animations
 *   jump through `useInstant()`. Shows open on their result (`resultOnly`).
 * - `still`: the same, for QA screenshots. Without the prop it is read from `?still=1` after hydration. It also sets
 *   `data-still` on <html>, which stops the CSS loops and transitions (motion.css).
 * Motion reads `skipAnimations` when an element is created, so the subtree is mounted again once when either turns on
 * (right after hydration).
 * When the pathname changes (the new route has committed) it settles the route transition's departure, after every
 * page's own layout effects (route-departure.ts).
 */
export function MotionProvider({ children, still }: { children: ReactNode; still?: boolean }) {
  const [fromUrl, setFromUrl] = useState(false);
  useEffect(() => {
    if (still !== undefined) return;
    setFromUrl(new URLSearchParams(window.location.search).get("still") === "1");
  }, [still]);
  const on = still ?? fromUrl;
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const skip = on || (hydrated && reduce === true);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.still = "1";
    else delete root.dataset.still;
  }, [on]);

  const pathname = usePathname();
  useLayoutEffect(() => {
    settleDeparture(); // a route whose page did not hold itself: the old page still leaves first
  }, [pathname]);

  return (
    <StillContext value={on}>
      <MotionConfig key={skip ? "skip" : "live"} reducedMotion="user" skipAnimations={skip} transition={spring.smooth}>
        {children}
      </MotionConfig>
    </StillContext>
  );
}

/** True while screenshots are being taken with `?still=1`. */
export function useStill(): boolean {
  return useContext(StillContext);
}

const noSubscribe = () => () => undefined;

/** False on the server and while hydrating, true from the first render after hydration (and for anything mounted later). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/**
 * True when motion must jump instead of play: reduced motion is on, or `still`. Imperative `animate(motionValue, …)` is
 * outside MotionConfig, so every block that animates a motion value by hand reads this and calls `mv.jump(value)`.
 * Hydration-safe: it is false on the server and during hydration (the server cannot know the OS setting), and turns true
 * on the render right after, so a component may branch on it without a hydration mismatch.
 */
export function useInstant(): boolean {
  const reduce = useReducedMotionConfig();
  const still = useContext(StillContext);
  const hydrated = useHydrated();
  return hydrated && (Boolean(reduce) || still);
}
