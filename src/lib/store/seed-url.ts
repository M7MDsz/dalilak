// Owner: store. PURE helpers for `?seed={name}` on any URL (spec 2.2, 10.3): read the parameter, and give back the same
// URL without it. The shell's Guard uses them through `applySeedFromLocation()` (store.ts), which also applies the seed.
import type { SeedName } from "@/lib/types";
import { isSeedName } from "@/lib/ids";

export const SEED_PARAM = "seed";

/**
 * `?seed=` in a query string ("?a=1&seed=onboarded" or "a=1&seed=onboarded"). `present`: the parameter is in the URL
 * (even empty or unknown: it is removed either way); `seed`: its value when it names one of the seeds of 10.3, else null
 * (an unknown name is ignored, 10.3).
 */
export function readSeedParam(search: string): { readonly present: boolean; readonly seed: SeedName | null } {
  const params = new URLSearchParams(search);
  if (!params.has(SEED_PARAM)) return { present: false, seed: null };
  const value = (params.get(SEED_PARAM) ?? "").trim();
  return { present: true, seed: isSeedName(value) ? value : null };
}

/** The same URL without the seed parameter: "/cv?seed=onboarded" → "/cv"; "/jobs?q=x&seed=fresh#top" → "/jobs?q=x#top". */
export function withoutSeedParam(pathname: string, search: string, hash = ""): string {
  const params = new URLSearchParams(search);
  params.delete(SEED_PARAM);
  const query = params.toString();
  return `${pathname}${query === "" ? "" : `?${query}`}${hash}`;
}
