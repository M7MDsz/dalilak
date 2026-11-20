// The old page's exit for the route transition (playbook 1.5), timed to the moment the new route is really there.
//
// Why: navigating only after a 120 ms fade left the content area empty for as long as the next route took to arrive
// (0.4-0.9 s on the dev server). Now `go()` navigates at once; Next keeps the old page on screen, live, until the new
// segment commits (its navigations are transitions). In that commit:
//   1. the old PageTransition's unmount (React's mutation phase, while its DOM is still in the document) takes a frozen
//      copy of the page, where it stands on screen (`noteUnmount`);
//   2. the new PageTransition mounts held (opacity 0); its layout effect (`arrive`) puts the copy back exactly where the
//      old page was, before anything is painted, and fades it out (120 ms, 4 px up);
//   3. the copy is removed and the held page is released: it plays page-in (rises 6 px in 260 ms).
// A route can also commit before its page exists (a screen under its own <Suspense>, whose code is still loading):
// then MotionProvider (`settleDeparture`, on the pathname change) puts the copy back at full opacity and it stays until
// the page mounts, and only then fades. So the old page leaves first, the new one follows, two pages are never visible
// together, and the only empty time is the designed 120 ms leave, whatever the server's speed.
//
// The copy ("ghost") is inert, hidden from assistive tech, carries no test ids, no form names and no `page` class (so
// nothing that looks for the page or a test id ever finds it), and is appended to the old page's parent: inside
// #app-content it keeps the page's container queries and stays under the shell's chrome (top bar, tab bar, advisor
// panel, overlays paint above #app-content). Any failure falls back to the plain enter: the new page rises.
import { dur, ease } from "@/lib/motion";

type Snapshot = {
  readonly node: HTMLElement;
  readonly rect: DOMRect;
  /** The page's opacity when it left (below 1 only when it was still rising in: a click during the hand-off). */
  readonly opacity: number;
  readonly parent: HTMLElement;
  /** [index among the page's descendants, scrollTop, scrollLeft] of every inner scroller that was scrolled. */
  readonly scrolls: readonly (readonly [number, number, number])[];
  /** "index|animation-name|pseudo" → currentTime of every CSS animation playing in the page (loops, entrances). */
  readonly clocks: ReadonlyMap<string, number>;
};

type Departure = {
  /** The page that was on screen when the navigation started (null: none, e.g. a screen without PageTransition). */
  readonly el: HTMLElement | null;
  snap: Snapshot | null;
  /** pending: waiting for the commit · waiting: the copy stands in for a route whose page has not mounted yet ·
   *  fading: the copy is leaving, the new page is held */
  phase: "pending" | "waiting" | "fading";
  readonly releases: Set<() => void>;
  ghost: HTMLElement | null;
  timer: number;
};

/** A navigation that never lands (or a cold dev compile of many seconds): stop holding new pages after this long. The
 * old page simply stays on screen meanwhile; nothing is hidden while waiting. */
const PENDING_CAP_MS = 10_000;
/** The fade normally ends on its own; this only guards against an animation that never reports its end. */
const FADE_CAP_MS = 600;
/** The copy stands in for a page that has not mounted yet at most this long, then leaves anyway. */
const WAIT_CAP_MS = 1500;
/** Copying scroll offsets and animation clocks reads every descendant; a larger page skips both (its copy's entrances
 * jump to their end, its loops restart, its inner scrollers start at 0: all for 120 ms). */
const SCAN_CAP = 8000;

let departure: Departure | null = null;

const shown = (el: HTMLElement): boolean => el.isConnected && el.getClientRects().length > 0;

/** The page on screen: the shell's, else the first visible `.page`. */
function currentPage(): HTMLElement | null {
  const inShell = document.querySelector<HTMLElement>("#app-content .page");
  if (inShell !== null && shown(inShell)) return inShell;
  return Array.from(document.querySelectorAll<HTMLElement>(".page")).find(shown) ?? null;
}

/** True while a transitioning navigation is under way: a PageTransition that mounts now starts held. */
export function isDeparting(): boolean {
  return departure !== null;
}

/** `go()` calls this right before it navigates. */
export function beginDeparture(): void {
  if (departure !== null && departure.phase !== "pending") finish(); // a click during the leave: settle it at once
  if (departure === null) {
    departure = { el: currentPage(), snap: null, phase: "pending", releases: new Set(), ghost: null, timer: 0 };
  }
  window.clearTimeout(departure.timer); // a second click while waiting: one departure, to the latest href
  departure.timer = window.setTimeout(finish, PENDING_CAP_MS);
}

/** A PageTransition is unmounting (its layout-effect cleanup: the element is still in the document). */
export function noteUnmount(el: HTMLElement): void {
  const d = departure;
  if (d === null || d.phase !== "pending" || d.el !== el || !shown(el)) return;
  try {
    d.snap = snapshot(el);
  } catch {
    d.snap = null;
  }
}

/**
 * A PageTransition mounted held (its layout effect: the commit's DOM work is done, nothing painted yet). `release` lets
 * it play page-in; it is called once the old page has left (or at once when there is nothing to wait for).
 */
export function arrive(release: () => void): void {
  const d = departure;
  if (d === null) return release();
  if (d.phase === "fading") {
    d.releases.add(release);
    return;
  }
  if (d.phase === "waiting") {
    d.releases.add(release);
    return fade(d); // the page the copy stood in for is here
  }
  // the page that was on screen is still there: this mount is not the navigation's arrival (a branch inside the old page)
  if (d.el !== null && shown(d.el)) return release();
  d.releases.add(release);
  if (!showGhost(d)) return finish();
  fade(d);
}

/**
 * The pathname changed (MotionProvider, after every page's own layout effects, so a page that mounted with its route
 * has already called `arrive`). A URL change that kept the same page clears the departure. A route that committed
 * without its page (still loading under its own Suspense boundary) gets the old page's copy back, at full opacity,
 * until the page mounts.
 */
export function settleDeparture(): void {
  const d = departure;
  if (d === null || d.phase !== "pending") return;
  if (d.el !== null && shown(d.el)) return finish();
  if (!showGhost(d)) return finish();
  d.phase = "waiting";
  d.timer = window.setTimeout(() => {
    if (departure === d && d.phase === "waiting") fade(d);
  }, WAIT_CAP_MS);
}

/** Puts the old page's copy back where the page stood (nothing painted since the commit). False when there is none. */
function showGhost(d: Departure): boolean {
  window.clearTimeout(d.timer);
  try {
    d.ghost = d.snap !== null && d.snap.parent.isConnected ? mountGhost(d.snap) : null;
  } catch {
    d.snap?.node.remove(); // mountGhost may have appended it before failing
    d.ghost = null;
  }
  if (d.ghost !== null && typeof d.ghost.animate !== "function") {
    d.ghost.remove();
    d.ghost = null;
  }
  return d.ghost !== null;
}

/** The copy fades out and lifts 4 px in 120 ms; then the held page is released. */
function fade(d: Departure): void {
  d.phase = "fading";
  window.clearTimeout(d.timer);
  const ghost = d.ghost;
  if (ghost === null) return finish();
  const leave = ghost.animate(
    [
      { opacity: ghost.style.opacity || 1, translate: "0 0" },
      { opacity: 0, translate: "0 -4px" },
    ],
    { duration: dur.leave * 1000, easing: `cubic-bezier(${ease.in.join(", ")})`, fill: "forwards" },
  );
  const done = () => {
    if (departure === d) finish();
  };
  leave.finished.then(done, done);
  d.timer = window.setTimeout(done, FADE_CAP_MS);
}

function finish(): void {
  const d = departure;
  if (d === null) return;
  departure = null;
  window.clearTimeout(d.timer);
  d.ghost?.remove();
  for (const release of d.releases) release();
}

function snapshot(el: HTMLElement): Snapshot | null {
  const parent = el.parentElement;
  if (parent === null) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const opacity = Number.parseFloat(getComputedStyle(el).opacity);
  if (!(opacity > 0.05)) return null; // nothing visible to take away
  const node = el.cloneNode(true) as HTMLElement;
  const scrolls: (readonly [number, number, number])[] = [];
  const clocks = new Map<string, number>();
  const all = el.getElementsByTagName("*");
  if (all.length <= SCAN_CAP) {
    const index = new Map<Element, number>();
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (e === undefined) continue;
      index.set(e, i);
      if (e.scrollTop !== 0 || e.scrollLeft !== 0) scrolls.push([i, e.scrollTop, e.scrollLeft]);
    }
    // (no animation clocks any more: motion.css lets every animation of the copy jump to its end, see mountGhost)
  }
  return { node, rect, opacity, parent, scrolls, clocks };
}

function mountGhost(s: Snapshot): HTMLElement {
  const g = s.node;
  g.classList.remove("page");
  g.classList.add("page-ghost");
  g.removeAttribute("data-held");
  g.removeAttribute("data-testid");
  for (const e of g.querySelectorAll("[data-testid]")) e.removeAttribute("data-testid");
  // a copied checked radio would uncheck its namesake on the new page; a copied field must not join a form
  for (const e of g.querySelectorAll("input[name], select[name], textarea[name], button[name]")) e.removeAttribute("name");
  for (const e of g.querySelectorAll("[autofocus]")) e.removeAttribute("autofocus");
  g.inert = true;
  g.setAttribute("aria-hidden", "true");
  Object.assign(g.style, {
    position: "fixed",
    top: `${s.rect.top}px`,
    left: `${s.rect.left}px`,
    width: `${s.rect.width}px`,
    height: `${s.rect.height}px`,
    margin: "0",
    opacity: String(s.opacity),
    zIndex: "1",
    pointerEvents: "none",
    // like the resting .page (its filled page-in animates translate), the copy is the containing block of fixed layers
    willChange: "opacity, translate",
  } satisfies Partial<CSSStyleDeclaration>);
  s.parent.appendChild(g);
  const all = g.getElementsByTagName("*");
  // The copy's CSS animations would start again from their first frame. They used to be put back where the page's
  // were by reading every animation of the page and of the copy (getAnimations on both subtrees): that forced a style
  // pass over the whole copy inside the route commit, 80-125 ms on /path and /jobs (measured 18 Nov 2026), the main
  // part of the freeze on every page change. Now one CSS rule (motion.css, .page-ghost) makes each of them jump to
  // its end: entrances show their final state, loops rest, no transition runs. For a copy that only fades for 120 ms
  // that looks the same, and costs nothing.
  if (s.scrolls.length > 0) {
    for (const [i, top, left] of s.scrolls) {
      const e = all[i];
      if (e === undefined) continue;
      e.scrollTop = top;
      e.scrollLeft = left;
    }
  }
  return g;
}
