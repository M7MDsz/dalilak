// Owner: shell. Pure: the navigation of spec 2.4-2.5 and the small decisions the shell makes from the URL (which item is
// active, which heading the desktop top bar shows, whether the next-step pill is hidden). No React, no window.
import { hrefFor, PAGE_HEADINGS, parsePathname } from "@/lib/routes";

/** The eight navigation items of spec 2.5 (their test ids are `shell-nav-{id}`). */
export type NavItemId = "path" | "skills" | "learn" | "cv" | "jobs" | "applications" | "leaderboard" | "profile";

/** Spec 2.5: three groups (Learning, Work, Me), separated by space, never by a heading. */
export const NAV_GROUPS: readonly (readonly NavItemId[])[] = [
  ["path", "skills", "learn"],
  ["cv", "jobs", "applications"],
  ["leaderboard", "profile"],
];

export const NAV_ITEMS: readonly NavItemId[] = NAV_GROUPS.flat();

/** Spec 2.4: the phone tab bar is «مساري» · «الدورات» · «دليل» (centre) · «الوظائف» · «المزيد». */
export const PHONE_TABS_BEFORE_CENTRE: readonly NavItemId[] = ["path", "learn"];
export const PHONE_TABS_AFTER_CENTRE: readonly NavItemId[] = ["jobs"];

/** Spec 2.4: the «المزيد» sheet lists «المهارات» · «سيرتي» · «طلباتي» · «المتصدرون» · «ملفي». */
export const MORE_ITEMS: readonly NavItemId[] = ["skills", "cv", "applications", "leaderboard", "profile"];

/** The URL of each item (every URL comes from hrefFor). */
export const NAV_HREF = {
  path: hrefFor({ screen: "path" }),
  skills: hrefFor({ screen: "skills" }),
  learn: hrefFor({ screen: "learn" }),
  cv: hrefFor({ screen: "cv" }),
  jobs: hrefFor({ screen: "jobs" }),
  applications: hrefFor({ screen: "applications" }),
  leaderboard: hrefFor({ screen: "leaderboard" }),
  profile: hrefFor({ screen: "profile" }),
} as const satisfies Record<NavItemId, string>;

/** The item a pathname belongs to: `/jobs/[id]` marks «الوظائف», `/learn/[id]` marks «الدورات». */
export function activeNavItem(pathname: string): NavItemId | null {
  const parsed = parsePathname(pathname);
  if (parsed === null) return null;
  switch (parsed.route) {
    case "signin":
    case "welcome":
      return null;
    case "job":
      return "jobs";
    case "course":
      return "learn";
    default:
      return parsed.route;
  }
}

/** True when the «المزيد» tab should look active (the current page is one of its items). */
export function isMoreActive(pathname: string): boolean {
  const item = activeNavItem(pathname);
  return item !== null && MORE_ITEMS.includes(item);
}

/**
 * The desktop top bar's heading (ARCHITECTURE 11.1): PAGE_HEADINGS of the route; the section heading «الوظائف» /
 * «الدورات» on the detail pages (their own header carries the title, ARCHITECTURE 17.4). Null outside the shell.
 */
export function topBarHeading(pathname: string): string | null {
  const item = activeNavItem(pathname);
  return item === null ? null : PAGE_HEADINGS[item];
}

/** The path part of an href (no query, no hash, no trailing slash). */
export function pathOf(href: string): string {
  const cut = href.split(/[?#]/)[0] ?? "";
  const clean = cut.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

/** Spec 2.8: the pill is hidden on the page it would open (compared by path; the query does not matter). */
export function isOnPage(pathname: string, href: string): boolean {
  return pathOf(pathname) === pathOf(href);
}

/** Spec 2.7: the chip shows the first name (the name as typed may hold more than one word). */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first === undefined || first === "" ? name.trim() : first;
}
