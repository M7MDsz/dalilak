"use client";
// The route transition (playbook 1.5): the old page fades out and lifts 4 px in 120 ms, then the new page rises 6 px in
// 260 ms. Two pages are never visible together.
// `go()` navigates at once and Next keeps the old page on screen until the new route has committed; only then does the
// old page leave (a frozen copy of it fades where it stood, route-departure.ts) while the new page waits, held at
// opacity 0, and then rises. So the content area is never left empty while the next route loads. CSS lives in
// motion.css (.page, .page[data-held]).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { useInstant } from "./provider";
import { arrive, beginDeparture, isDeparting, noteUnmount } from "./route-departure";

export type GoOptions = { replace?: boolean; scroll?: boolean };

// ── The path a go() navigation is heading to, from the click until the route commits ─────────────────────────────
// The side nav and the tab bar highlight it at once (Mohammed, 18 Nov 2026: "sometimes it feels kindda buggy"): the
// highlight used to follow usePathname, which changes only once the new page has rendered, so for 150-400 ms after a
// click nothing on screen answered it.
let pendingPath: string | null = null;
let pendingTimer = 0;
const pendingListeners = new Set<() => void>();
function setPendingPath(path: string | null): void {
  if (pendingPath === path) return;
  pendingPath = path;
  window.clearTimeout(pendingTimer);
  if (path !== null) pendingTimer = window.setTimeout(() => setPendingPath(null), 10_000); // a navigation that never lands
  for (const listener of pendingListeners) listener();
}
const subscribePending = (listener: () => void) => {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
};

/** The pathname to highlight: where a go() navigation is heading while it renders, else the current one. */
export function useShownPathname(): string {
  const pathname = usePathname();
  const pending = useSyncExternalStore(subscribePending, () => pendingPath, () => null);
  useEffect(() => {
    setPendingPath(null); // the route committed (or changed some other way): the real path is shown again
  }, [pathname]);
  return pending ?? pathname;
}

/**
 * `go(href)`: every in-app navigation that should transition (navigation items, cards, buttons, «دليلك»'s navigate event).
 * Same pathname (only the query changes), reduced motion and still frames navigate at once without the leave.
 * Filters, tabs and search must NOT use it: they call `router.replace(url, { scroll: false })` and do not transition.
 */
export function useGo() {
  const router = useRouter();
  const instant = useInstant();
  const instantRef = useRef(instant);
  useEffect(() => {
    instantRef.current = instant;
  }, [instant]);
  return useCallback(
    (href: string, options: GoOptions = {}) => {
      const nav = () => (options.replace ? router.replace(href, { scroll: options.scroll }) : router.push(href, { scroll: options.scroll }));
      const samePage = new URL(href, window.location.href).pathname === window.location.pathname;
      if (samePage || instantRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        nav();
        return;
      }
      beginDeparture(); // the page on screen will leave when the new route commits
      setPendingPath(new URL(href, window.location.href).pathname); // the nav highlight moves now, not after the render
      nav();
    },
    [router],
  );
}

type LinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate">;

/**
 * A Next `<Link>` whose in-app navigation goes through `go()`. Modified clicks (new tab, Ctrl+click) behave as normal links.
 * Takes every `<Link>` prop except `onNavigate`; `href` is a string. In the production build the link prefetches its
 * route (Next's default), so the new page is usually there within a frame of the click.
 */
export function NavLink({ href, className, children, replace, scroll, ...rest }: LinkProps & { href: string; className?: string; children: ReactNode }) {
  const go = useGo();
  return (
    <Link
      {...rest}
      href={href}
      replace={replace}
      scroll={scroll}
      className={className}
      onNavigate={(event) => {
        event.preventDefault(); // fires only for in-app navigations
        go(href, { replace, scroll: scroll ?? undefined });
      }}
    >
      {children}
    </Link>
  );
}

/**
 * The outermost element of EVERY `page.tsx` (a template does not remount between /jobs and /jobs/[id]).
 * Mounted during a `go()` navigation it starts held (opacity 0) until the old page has left, then plays its 260 ms
 * rise; mounted any other way it rises at once. On unmount during a navigation it lends its DOM for the old page's exit.
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(isDeparting);

  useLayoutEffect(() => {
    const el = ref.current;
    return () => {
      if (el !== null) noteUnmount(el); // still in the document here: the old page's frozen copy is taken now
    };
  }, []);

  useLayoutEffect(() => {
    if (!held) return;
    const el = ref.current;
    arrive(() => {
      el?.removeAttribute("data-held"); // start page-in on this frame; the state below keeps React in step
      setHeld(false);
    });
  }, [held]);

  return (
    <div className={cn("page", className)} data-held={held ? "" : undefined} ref={ref}>
      {children}
    </div>
  );
}
