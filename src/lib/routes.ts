// Owner: architect (written in full as part of the contract); maintained afterwards by `shell`.
// Every URL of the product (spec 2.1, 2.2) and the browser-tab titles (2.2, v3: «دليلك · {page heading}»).
// Pure: safe on client and server. The only way to build an in-app URL is hrefFor(): nobody concatenates paths.

import { isCourseId, isFieldId, isJobCityId, isJobFieldId, isJobId, isLearnTab, isSkillId } from "@/lib/ids";
import type { CourseId, FieldId, JobId, JobQuery, LearnTab, NavTarget } from "@/lib/types";

/** Every route of spec 2.1. `job` = /jobs/[id], `course` = /learn/[id]. */
export type RouteKey =
  | "signin"
  | "welcome"
  | "path"
  | "skills"
  | "cv"
  | "jobs"
  | "job"
  | "applications"
  | "learn"
  | "course"
  | "leaderboard"
  | "profile";

/** Routes inside the app shell (the `(app)` route group). */
export type ShellRouteKey = Exclude<RouteKey, "signin" | "welcome">;

/** Static path of each route that has one. */
export const ROUTE_PATHS = {
  signin: "/",
  welcome: "/welcome",
  path: "/path",
  skills: "/skills",
  cv: "/cv",
  jobs: "/jobs",
  applications: "/applications",
  learn: "/learn",
  leaderboard: "/leaderboard",
  profile: "/profile",
} as const satisfies Record<Exclude<RouteKey, "job" | "course">, string>;

/** Page headings of the static app-shell routes (spec 3.x "Heading"). The top bar shows them on desktop (2.3). */
export const PAGE_HEADINGS = {
  path: "مسارك",
  skills: "شجرة المهارات",
  cv: "سيرتي الذاتية",
  jobs: "الوظائف",
  applications: "طلباتي",
  learn: "الدورات",
  leaderboard: "المتصدرون",
  profile: "ملفي",
} as const satisfies Record<Exclude<ShellRouteKey, "job" | "course">, string>;

/** The product name, for titles. */
export const PRODUCT_NAME = "دليلك";

/**
 * Browser-tab title (spec 2.2 as updated in v3): «دليلك · {page heading}»; `/` and `/welcome` are «دليلك» alone;
 * `/jobs/[id]` uses the job title and `/learn/[id]` the SHORT course title (pass it as `heading`).
 * Pages export `metadata = { title: { absolute: pageTitle(...) } }` (absolute, so the root layout needs no template).
 */
export function pageTitle(heading?: string): string {
  return heading ? `${PRODUCT_NAME} · ${heading}` : PRODUCT_NAME;
}

/** The one URL builder. Query values are encoded; Arabic search text is safe. */
export function hrefFor(target: NavTarget): string {
  switch (target.screen) {
    case "path":
      return ROUTE_PATHS.path;
    case "skills":
      return target.skill ? `${ROUTE_PATHS.skills}?skill=${target.skill}` : ROUTE_PATHS.skills;
    case "cv":
      return ROUTE_PATHS.cv;
    case "jobs": {
      const params = new URLSearchParams();
      if (target.q) params.set("q", target.q);
      if (target.city) params.set("city", target.city);
      if (target.field) params.set("field", target.field);
      if (target.skill) params.set("skill", target.skill);
      const query = params.toString();
      return query ? `${ROUTE_PATHS.jobs}?${query}` : ROUTE_PATHS.jobs;
    }
    case "job":
      return `${ROUTE_PATHS.jobs}/${target.jobId}${target.apply ? "?apply=1" : ""}${target.focus === "missing" ? "#missing" : ""}`;
    case "applications":
      return ROUTE_PATHS.applications;
    case "learn": {
      const params = new URLSearchParams();
      if (target.tab) params.set("tab", target.tab);
      if (target.field) params.set("field", target.field);
      const query = params.toString();
      return query ? `${ROUTE_PATHS.learn}?${query}` : ROUTE_PATHS.learn;
    }
    case "course":
      return `${ROUTE_PATHS.learn}/${target.courseId}`;
    case "leaderboard":
      return ROUTE_PATHS.leaderboard;
    case "profile":
      return ROUTE_PATHS.profile;
  }
}

/** Which route a pathname is, with its id for /jobs/[id] and /learn/[id]. Unknown paths → null. Ids are NOT validated. */
export function parsePathname(pathname: string): { route: RouteKey; id?: string } | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") return { route: "signin" };
  const parts = clean.split("/").filter((part) => part !== "");
  const [first, second, third] = parts;
  if (third !== undefined) return null;
  switch (first) {
    case "welcome":
      return second === undefined ? { route: "welcome" } : null;
    case "path":
    case "skills":
    case "cv":
    case "applications":
    case "leaderboard":
    case "profile":
      return second === undefined ? { route: first } : null;
    case "jobs":
      return second === undefined ? { route: "jobs" } : { route: "job", id: decodeURIComponent(second) };
    case "learn":
      return second === undefined ? { route: "learn" } : { route: "course", id: decodeURIComponent(second) };
    default:
      return null;
  }
}

/** Reads `/jobs?q=&city=&field=&skill=`; unknown values are dropped (spec 2.2, 7.1). */
export function parseJobsQuery(params: URLSearchParams): JobQuery {
  const q = params.get("q")?.trim();
  const city = params.get("city");
  const field = params.get("field");
  const skill = params.get("skill");
  return {
    ...(q ? { q } : {}),
    ...(isJobCityId(city) ? { city } : {}),
    ...(isJobFieldId(field) ? { field } : {}),
    ...(isSkillId(skill) ? { skill } : {}),
  };
}

/** Reads `/learn?tab=&field=` (spec 2.2, 3.10). Default tab "path". */
export function parseLearnQuery(params: URLSearchParams): { tab: LearnTab; field: FieldId | null } {
  const tab = params.get("tab");
  const field = params.get("field");
  return { tab: isLearnTab(tab) ? tab : "path", field: isFieldId(field) ? field : null };
}

/** `/jobs/[id]` id check (unknown → the shell's not-found block, spec 2.2). */
export function asJobId(id: string | undefined): JobId | null {
  return isJobId(id) ? id : null;
}

/** `/learn/[id]` id check. */
export function asCourseId(id: string | undefined): CourseId | null {
  return isCourseId(id) ? id : null;
}
