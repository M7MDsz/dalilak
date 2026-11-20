"use client";
// The app's one client wrapper (rendered by src/app/layout.tsx):
//   DirectionProvider (rtl)  Base UI keyboard behaviour and logical sides follow Arabic
//   MotionProvider           reduced motion and still frames (?still=1, read in an effect after hydration)
//   Tooltip.Provider         one shared delay for every tooltip
//   ToastProvider + Toaster  the one toast position of the app
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useState, type ReactNode } from "react";

import { MotionProvider } from "@/components/motion";
import { ToastProvider, Toaster } from "@/components/ui/toast";

function useStill(): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const on = new URLSearchParams(window.location.search).get("still") === "1";
    // CSS animations and transitions jump to their end (globals.css, html[data-still]); Motion is told by the provider.
    if (on) document.documentElement.dataset.still = "1";
    else delete document.documentElement.dataset.still;
    setStill(on);
  }, []);
  return still;
}

export function Providers({ children }: { readonly children: ReactNode }) {
  const still = useStill();
  return (
    <DirectionProvider direction="rtl">
      <MotionProvider still={still}>
        <Tooltip.Provider delay={300} closeDelay={80}>
          <ToastProvider>
            {/* isolate: portaled popups (Base UI) always sit above the app without z-index wars */}
            <div className="isolate min-h-dvh">{children}</div>
            <Toaster />
          </ToastProvider>
        </Tooltip.Provider>
      </MotionProvider>
    </DirectionProvider>
  );
}
