// Owner: shell. Pure: the decisions of the route Guard (spec 2.2, 10.3; ARCHITECTURE 11.1), kept apart from the React
// component so they can be unit-tested. No React, no window, no store.
import { isSeedName } from "@/lib/ids";
import type { JobId, SeedName } from "@/lib/types";

/** Which part of the product a Guard protects: `/`, `/welcome`, or every app-shell route. */
export type GuardArea = "signin" | "welcome" | "app";

/** The three places a Guard can send the user. */
export type GuardRedirect = "/" | "/welcome" | "/path";

/**
 * Spec 2.2: not signed in → `/` · signed in, no target yet → `/welcome` · onboarded → `/` and `/welcome` go to `/path`.
 * "Onboarded" means a target job is set (ARCHITECTURE 5.1). Null = stay and render the children.
 */
export function redirectFor(area: GuardArea, user: { readonly targetJobId: JobId | null } | null): GuardRedirect | null {
  const onboarded = user !== null && user.targetJobId !== null;
  switch (area) {
    case "signin":
      if (user === null) return null;
      return onboarded ? "/path" : "/welcome";
    case "welcome":
      if (user === null) return "/";
      return onboarded ? "/path" : null;
    case "app":
      if (user === null) return "/";
      return onboarded ? null : "/welcome";
  }
}

export interface SeedRequest {
  /** `?seed=` was in the URL (known or not). */
  readonly present: boolean;
  /** The seed to apply; null when absent or unknown (an unknown name is just removed, spec 10.3). */
  readonly seed: SeedName | null;
  /** The same URL without `seed` (path, the other query values, the hash), for `router.replace`. */
  readonly cleanUrl: string;
}

/** Reads `?seed={name}` from a location (spec 10.3: applied before any guard or redirect, then removed from the URL). */
export function readSeed(location: { readonly pathname: string; readonly search: string; readonly hash: string }): SeedRequest {
  const params = new URLSearchParams(location.search);
  const present = params.has("seed");
  const raw = params.get("seed");
  params.delete("seed");
  const query = params.toString();
  const cleanUrl = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
  return { present, seed: isSeedName(raw) ? raw : null, cleanUrl };
}

/** True when a query string carries `seed` (the Guard then decides in its effect, after applying it). */
export function hasSeedParam(search: string): boolean {
  return new URLSearchParams(search).has("seed");
}
