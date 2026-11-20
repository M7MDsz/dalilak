// Owner: store. `?seed=` on any URL (spec 2.2, 10.3): read, then removed from the URL; unknown names are only removed.
import { describe, expect, it } from "vitest";

import { readSeedParam, withoutSeedParam } from "./seed-url";

describe("?seed=", () => {
  it("reads a known seed name, with or without the leading ?", () => {
    expect(readSeedParam("?seed=onboarded")).toEqual({ present: true, seed: "onboarded" });
    expect(readSeedParam("seed=mid-path&x=1")).toEqual({ present: true, seed: "mid-path" });
    expect(readSeedParam("?q=1&seed=fresh")).toEqual({ present: true, seed: "fresh" });
  });

  it("marks an unknown or empty name as present but not a seed (removed, ignored)", () => {
    expect(readSeedParam("?seed=nope")).toEqual({ present: true, seed: null });
    expect(readSeedParam("?seed=")).toEqual({ present: true, seed: null });
  });

  it("finds nothing when the parameter is absent", () => {
    expect(readSeedParam("")).toEqual({ present: false, seed: null });
    expect(readSeedParam("?skill=sql")).toEqual({ present: false, seed: null });
  });

  it("gives back the same URL without the parameter", () => {
    expect(withoutSeedParam("/cv", "?seed=onboarded")).toBe("/cv");
    expect(withoutSeedParam("/", "?seed=fresh")).toBe("/");
    expect(withoutSeedParam("/jobs", "?city=riyadh&seed=fresh", "#top")).toBe("/jobs?city=riyadh#top");
    expect(withoutSeedParam("/learn", "?seed=mid-path&tab=explore&field=data")).toBe("/learn?tab=explore&field=data");
  });
});
