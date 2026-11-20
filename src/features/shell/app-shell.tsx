"use client";
// Owner: shell. The app shell around every app route (spec 2.3, 2.4; ARCHITECTURE 11.1), rendered by the (app) layout
// inside the Guard, so it may assume a hydrated store and a signed-in, onboarded user.
//
// DOM contract (jobs, advisor and the overlay host depend on it):
//   <div shell root  style="--content-inset-start; --content-inset-end">
//     side nav (≥ 1024 px)  |  phone top bar (< 1024 px)        only one is rendered (useViewport), never hidden by CSS
//     <div docking wrapper: padding-inline-start = the rail, padding-inline-end = 436px while the panel docks>
//       desktop top bar
//       <div id="app-content" class="@container/content relative isolate">  the page (no transform: fixed stays fixed)
//     phone tab bar (< 1024 px)
//     <OverlayHost />  <AdvisorRoot />                          siblings of #app-content, outside its stacking context
// The docking padding sits on the wrapper AROUND #app-content and the top bar, so the container query width is the
// visible content width; the two custom properties let fixed layers cover "the content area only" (the apply sheet).
// The shell also writes --shell-top (toasts sit 12 px under the top bar) and --shell-bottom (things pinned to the bottom
// on a phone sit directly above the tab bar, spec 2.4) on <html>, because portaled layers (the toaster) read them there;
// for the same reason it mirrors --content-inset-start / --content-inset-end there too, so a layer portaled into <body>
// can keep to the content area (the toast stack anchored under the user chip, never under the docked panel).
// On mount: touchDay() (spec 8.4; idempotent per day) and useBrainStatus() once. Coming from the reveal (a map hand-over
// in the UI store on the first render) the chrome arrives around the map with a short rise after about 300 ms, instead
// of being there from frame one (v3 3.3 / 3.4); the shell never clears the hand-over.
import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/components/ui";
import { AdvisorRoot } from "@/features/advisor";
import { useBrainStatus, useAppStore, useUi } from "@/lib/store";

import { useKeyboardViewport, useViewport } from "@/features/shared";

import { OverlayHost } from "./overlay-host";
import { PHONE_TAB_BAR_HEIGHT, PHONE_TOP_BAR_HEIGHT, PhoneTopBar, TabBar } from "./phone-bars";
import { SIDE_NAV_WIDTH, SideNav } from "./side-nav";
import { TOP_BAR_HEIGHT, TopBar } from "./top-bar";

/** The advisor panel's room while it docks (spec 3.14: 420 px wide, inset 8 px, so 436 px of content padding). */
export const DOCKED_PANEL_INSET = "436px";

/** The chrome's arrival after the reveal hands over to the map. */
const ARRIVE_CLASS = "animate-rise [animation-delay:300ms]";

export function AppShell({ children }: { readonly children: ReactNode }): ReactNode {
  const { desktop, wide } = useViewport();
  const advisorOpen = useUi((state) => state.advisorOpen);
  const docked = desktop && wide && advisorOpen;
  const [arriving] = useState(() => useUi.getState().mapHandover !== null);

  useBrainStatus();
  useEffect(() => {
    useAppStore.getState().touchDay();
  }, []);
  useShellMetrics(desktop, docked);
  useKeyboardViewport(!desktop); // phones: the keyboard's box on <html>, so the composer and sheets stay above it

  const style = {
    "--content-inset-start": desktop ? SIDE_NAV_WIDTH : "0px",
    "--content-inset-end": docked ? DOCKED_PANEL_INSET : "0px",
  } as CSSProperties;

  return (
    <div className="relative min-h-dvh bg-bg" data-docked={docked ? "" : undefined} style={style}>
      {desktop ? <SideNav className={arriving ? ARRIVE_CLASS : undefined} /> : <PhoneTopBar className={arriving ? ARRIVE_CLASS : undefined} />}
      {/* The page body never moves for the panel (Mohammed, 18 Nov 2026: "the site feels heavy when you open the
          chatbot", then "sometimes it feels kinda buggy"). Squeezing #app-content from 1208 to 772 px re-laid out the
          whole page (250-630 ms) and on /path flipped the map to its phone order: the cards jumped to the top. Now the
          panel floats over the page like a side chat; only the thin top bar makes room, so the player bar (XP,
          level, the level-up beside it) stays in view, and --content-inset-end keeps overlays (the apply sheet) clear. */}
      <div className={cn("flex min-h-dvh flex-col", desktop ? "ps-(--content-inset-start)" : "pb-(--shell-bottom)")}>
        {desktop ? <TopBar className={cn(arriving ? ARRIVE_CLASS : undefined, docked && "pe-(--content-inset-end)")} /> : null}
        <div className="@container/content relative isolate flex-1" id="app-content">
          {children}
        </div>
      </div>
      {desktop ? null : <TabBar className={arriving ? ARRIVE_CLASS : undefined} />}
      <OverlayHost />
      <AdvisorRoot />
    </div>
  );
}

/** --shell-top, --shell-bottom and the two content insets on <html> (portaled layers read them there), reset when the
 *  shell leaves. */
function useShellMetrics(desktop: boolean, docked: boolean): void {
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--shell-top", desktop ? TOP_BAR_HEIGHT : `calc(${PHONE_TOP_BAR_HEIGHT} + env(safe-area-inset-top))`);
    root.setProperty("--shell-bottom", desktop ? "0px" : `calc(${PHONE_TAB_BAR_HEIGHT} + env(safe-area-inset-bottom))`);
    root.setProperty("--content-inset-start", desktop ? SIDE_NAV_WIDTH : "0px");
    root.setProperty("--content-inset-end", docked ? DOCKED_PANEL_INSET : "0px");
    return () => {
      root.removeProperty("--shell-top");
      root.removeProperty("--shell-bottom");
      root.removeProperty("--content-inset-start");
      root.removeProperty("--content-inset-end");
    };
  }, [desktop, docked]);
}
