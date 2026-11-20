"use client";
// Owner: advisor. <AdvisorRoot /> is rendered ONCE by the app shell, as a sibling of #app-content (outside the page and
// outside the content's stacking context), so it survives page changes and stays above the apply sheet. It renders the
// panel, the desktop launcher (only when useViewport().desktop), the travelling glyph, the nudge and the phone working
// pill; it owns Ctrl+K / Esc, hands its navigation to the dispatcher, listens for page buttons that ask «دليلك»
// (useUi.advisorRequest), and resolves an application a reload interrupted, once per account and page load.
//
// Contract points (ARCHITECTURE 9, 10, 13):
// - Page requests: a useUi.subscribe listener sends the request whose id is newer than the last handled one (module
//   scope, so neither Strict Mode's second effect nor a re-mount sends it twice). The turn runner is a plain async
//   function; no effect cleanup aborts it. Only «إيقاف» does.
// - Nudge: reads useUi.getState().holds / .blocking inside its check; first pass one animation frame after mount.
// - Esc goes to exactly one layer: the panel first when focus is inside it; otherwise only when no dialog, sheet or
//   level-up is open. Every handler returns early on event.defaultPrevented and calls preventDefault when it acts.
import { AnimatePresence, useReducedMotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useGo, useStill } from "@/components/motion";
import { useViewport } from "@/features/shared";
import { hrefFor } from "@/lib/routes";
import { selectCurrentUser, useAppStore, useCurrentUser, useUi, type UiStore } from "@/lib/store";

import { AdvisorPanel } from "./advisor-panel";
import { GlyphFlight, Launcher, Nudge, WorkingPill, type Box, type Flight } from "./launcher";
import { useElapsedStart, useLive } from "./live";
import { abandonTurn, registerNavigator, sendRequest } from "./runner";

/** The last page request handed to the runner (module scope: once per id, whatever mounts twice). */
let lastRequestId = 0;
/** Accounts whose interrupted application was already resolved in this page load. */
const resolvedFor = new Set<string>();
/** The next opening was asked for by the launcher or Ctrl+K: the composer takes focus when the panel is in. */
let focusNextOpen = false;
/** Focus was inside the panel when it closed: give it back to the launcher. */
let returnFocus = false;

const NUDGE_MS = 8_000;

/** `el`'s box with the frame's own offset taken out (its translate and transform): where it rests once the frame has
 *  arrived, not where the arrival has it right now. */
function restingBox(el: Element, frame: Element): Box {
  const box = el.getBoundingClientRect();
  const style = getComputedStyle(frame);
  const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
  const [tx = "0", ty = "0"] = style.translate === "none" ? [] : style.translate.split(" ");
  const dx = matrix.m41 + (Number.parseFloat(tx) || 0);
  const dy = matrix.m42 + (Number.parseFloat(ty) || 0);
  return { x: box.left - dx, y: box.top - dy, w: box.width, h: box.height };
}

function boxOf(el: Element): Box {
  const box = el.getBoundingClientRect();
  return { x: box.left, y: box.top, w: box.width, h: box.height };
}

export function AdvisorRoot(): ReactNode {
  const { desktop } = useViewport();
  const phone = !desktop;
  const open = useUi((s) => s.advisorOpen);
  const user = useCurrentUser();
  const userId = user?.id ?? null;
  const turn = useLive((s) => s.turn);
  const pillElapsedFrom = useElapsedStart(turn);
  // while «دليلك» fills the apply sheet, the sheet narrates and carries its own «إيقاف»: the phone pill steps aside
  const applying = useUi((s) => s.applyRun !== null && s.applyRun.result === null);
  const pathname = usePathname();
  const go = useGo();
  const still = useStill();
  const reduce = useReducedMotionConfig();
  const instant = still || Boolean(reduce);

  const launcherGlyph = useRef<HTMLSpanElement>(null);
  const launcherButton = useRef<HTMLButtonElement>(null);
  const headerGlyph = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const flightId = useRef(0);

  // The motion state trails the store by two frames. The heavy commit of the change lands and is painted first (the
  // shell docks or undocks the content, the thread renders: a long frame on a busy laptop or the dev server), then the
  // arrival or the exit starts on a free main thread and is seen whole: the page makes room, then the panel comes in.
  // Both motions run on the compositor (the panel's CSS transition, the glyph's Web Animation), so later jank cannot
  // freeze them either. On close the panel stays put while the page re-widens beneath it, then leaves.
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (shown === open) return;
    if (instant) {
      setShown(open);
      return;
    }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setShown(open));
    });
    return () => cancelAnimationFrame(frame);
  }, [open, shown, instant]);

  // the dispatcher moves the page through the route transition
  useEffect(() => registerNavigator(go), [go]);

  // page buttons that ask «دليلك» («دع دليلك يقدّم عنك» …): askAdvisor opened the panel; the bubble pops once it is in
  useEffect(() => {
    const handle = (state: UiStore, prev?: UiStore) => {
      const request = state.advisorRequest;
      if (request === null || request.id <= lastRequestId) return;
      lastRequestId = request.id;
      const wasOpen = prev ? prev.advisorOpen : false;
      sendRequest(request.outgoing, wasOpen ? 60 : 340);
    };
    handle(useUi.getState());
    return useUi.subscribe(handle);
  }, []);

  // an application «دليلك» was filling when the page was reloaded: «لم يكتمل التقديم…» (7.4), once per account and load
  useEffect(() => {
    if (userId === null || resolvedFor.has(userId)) return;
    resolvedFor.add(userId);
    if (useUi.getState().applyRun === null) useAppStore.getState().resolveInterruptedApply();
  }, [userId]);

  // another account (or a seed): what was in flight is not theirs
  const lastUser = useRef(userId);
  useEffect(() => {
    if (lastUser.current !== userId) {
      lastUser.current = userId;
      abandonTurn();
    }
  }, [userId]);

  const openFromLauncher = useCallback(() => {
    focusNextOpen = true;
    useUi.getState().openAdvisor();
  }, []);
  const takeFocusRequest = useCallback(() => {
    const ask = focusNextOpen;
    focusNextOpen = false;
    return ask;
  }, []);

  // Ctrl+K toggles (the K key by its position, so an Arabic layout works too); Esc closes (one layer per press)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === "KeyK") {
        event.preventDefault();
        const ui = useUi.getState();
        if (ui.advisorOpen) {
          returnFocus = panel.current?.contains(document.activeElement) ?? false;
          ui.closeAdvisor();
        } else {
          focusNextOpen = true;
          ui.openAdvisor();
        }
        return;
      }
      if (event.key !== "Escape") return;
      const ui = useUi.getState();
      if (!ui.advisorOpen) return;
      const inside = panel.current?.contains(document.activeElement) ?? false;
      if (!inside) {
        // a dialog, a sheet or the level-up is the topmost layer: it takes this Esc
        if (ui.blocking === "levelup" || ui.applySheetOpen || document.querySelector("[role=dialog][data-open]")) return;
      }
      event.preventDefault();
      // one press, one layer: Base UI's dismiss (the apply sheet behind the panel) does not look at defaultPrevented
      if (inside) event.stopPropagation();
      returnFocus = inside;
      ui.closeAdvisor();
    };
    // capture: inside the panel, Esc closes it in one press (the composer would otherwise take it to fold its card)
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // every close: focus goes back to the launcher if it was inside the panel
  useLayoutEffect(() => {
    if (!open && panel.current?.contains(document.activeElement)) returnFocus = true;
  }, [open]);

  // the travelling glyph (desktop): launcher → header as the panel arrives, header → launcher as it leaves
  const wasShown = useRef(shown);
  useLayoutEffect(() => {
    if (wasShown.current === shown) return;
    wasShown.current = shown;
    if (!desktop || instant || !launcherGlyph.current || !headerGlyph.current || !panel.current) return;
    const slot = restingBox(headerGlyph.current, panel.current);
    const home = boxOf(launcherGlyph.current);
    flightId.current += 1;
    setFlight(shown ? { id: flightId.current, from: home, to: slot, dir: "in" } : { id: flightId.current, from: slot, to: home, dir: "out" });
  }, [shown, desktop, instant]);

  useEffect(() => {
    if (shown || open || !returnFocus) return;
    returnFocus = false;
    const timer = window.setTimeout(() => {
      const target = launcherButton.current ?? document.querySelector<HTMLElement>(`[data-testid="shell-advisor-launcher"]`);
      target?.focus();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [open, shown]);

  const land = useCallback((id: number) => setFlight((f) => (f?.id === id ? null : f)), []);

  const nudge = useNudge(pathname === hrefFor({ screen: "path" }));
  const hideNudge = nudge.hide;
  const openFromNudge = useCallback(() => {
    hideNudge();
    openFromLauncher();
  }, [hideNudge, openFromLauncher]);

  return (
    <>
      <AdvisorPanel
        entered={shown}
        focusOnOpen={takeFocusRequest}
        glyphHidden={flight !== null}
        glyphSlotRef={headerGlyph}
        panelRef={panel}
        phone={phone}
      />
      {desktop ? (
        <AnimatePresence>
          {!shown ? (
            <Launcher
              aside={<Nudge onOpen={openFromNudge} phone={false} shown={nudge.shown && !open} />}
              buttonRef={launcherButton}
              glyphHidden={flight !== null}
              glyphRef={launcherGlyph}
              key="launcher"
              onOpen={openFromLauncher}
              working={turn !== null}
            />
          ) : null}
        </AnimatePresence>
      ) : null}
      <GlyphFlight flight={flight} onLand={land} />
      {phone ? <Nudge onOpen={openFromNudge} phone shown={nudge.shown && !open && !shown} /> : null}
      {phone && !open && !shown && turn && !applying ? <WorkingPill onOpen={() => useUi.getState().openAdvisor()} startedAt={pillElapsedFrom ?? turn.startedAt} status={turn.status} /> : null}
    </>
  );
}

/**
 * The one nudge (spec 2.6): once per account, on the first arrival at /path, when nothing holds it back (the level-up,
 * the daily reward, a running show including the full map-open, or the open panel; toasts do not). If /path is left
 * before it could show, it shows on the next visit. It hides after 8 s or on any press.
 */
function useNudge(onPath: boolean): { shown: boolean; hide: () => void } {
  const [shown, setShown] = useState(false);
  const hide = useCallback(() => setShown(false), []);

  useEffect(() => {
    if (!onPath) return;
    let unsubscribe: (() => void) | null = null;
    const check = (): boolean => {
      const user = selectCurrentUser(useAppStore.getState());
      if (!user || user.seen.nudge) return true; // nothing to wait for
      const ui = useUi.getState();
      if (ui.advisorOpen || ui.holds.length > 0 || ui.blocking !== null) return false;
      useAppStore.getState().markSeen("nudge", true);
      setShown(true);
      return true;
    };
    const frame = requestAnimationFrame(() => {
      if (check()) return;
      unsubscribe = useUi.subscribe(() => {
        if (check()) {
          unsubscribe?.();
          unsubscribe = null;
        }
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe?.();
    };
  }, [onPath]);

  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(hide, NUDGE_MS);
    // any press hides it; a press on the nudge itself also opens the panel (its own click handler)
    const onPress = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-nudge]")) return;
      hide();
    };
    document.addEventListener("pointerdown", onPress, true);
    const unsubscribe = useUi.subscribe((state) => {
      if (state.advisorOpen) hide();
    });
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPress, true);
      unsubscribe();
    };
  }, [shown, hide]);

  return { shown, hide };
}
