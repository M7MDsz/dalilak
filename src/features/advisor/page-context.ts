// Owner: advisor. Where the user is (spec 5.2, ARCHITECTURE 8.2): "this job" and "this course" resolve from here.
// Built from the pathname (ids validated), `?skill=` on /skills, and the UI store (the apply sheet, running shows).
import { isSkillId } from "@/lib/ids";
import { asCourseId, asJobId, parsePathname } from "@/lib/routes";
import type { PageContext } from "@/lib/brain/protocol";
import type { HoldKey } from "@/lib/types";

type Route = PageContext["route"];

const SHELL_ROUTES: ReadonlySet<string> = new Set<Route>([
  "path",
  "skills",
  "cv",
  "jobs",
  "job",
  "applications",
  "learn",
  "course",
  "leaderboard",
  "profile",
]);

/** The page part of the context, from a pathname and a query string. An unknown path reads as the home (/path). */
export function routeContext(pathname: string, search = ""): Pick<PageContext, "route" | "jobId" | "courseId" | "skillId"> {
  const parsed = parsePathname(pathname);
  const route: Route = parsed && SHELL_ROUTES.has(parsed.route) ? (parsed.route as Route) : "path";
  if (route === "job") {
    const jobId = asJobId(parsed?.id);
    return jobId ? { route, jobId } : { route: "jobs" };
  }
  if (route === "course") {
    const courseId = asCourseId(parsed?.id);
    return courseId ? { route, courseId } : { route: "learn" };
  }
  if (route === "skills") {
    const skill = new URLSearchParams(search).get("skill");
    return isSkillId(skill) ? { route, skillId: skill } : { route };
  }
  return { route };
}

/** The full context sent with a message (read at send time, in a handler). */
export function pageContextNow(ui: { readonly applySheetOpen: boolean; readonly holds: readonly HoldKey[] }): PageContext {
  return {
    ...routeContext(window.location.pathname, window.location.search),
    applySheetOpen: ui.applySheetOpen,
    showRunning: ui.holds.length > 0,
  };
}
