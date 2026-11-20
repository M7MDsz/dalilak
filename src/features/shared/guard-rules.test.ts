// Owner: shell. Spec 2.2 redirects and the 10.3 seed parameter, as the Guard decides them.
import { describe, expect, it } from "vitest";

import { hasSeedParam, readSeed, redirectFor } from "./guard-rules";

const signedOut = null;
const newUser = { targetJobId: null };
const onboarded = { targetJobId: "data-analyst-riyadh" as const };

describe("redirectFor (spec 2.2)", () => {
  it("sends a signed-out visitor to the sign-in page from the app and from /welcome", () => {
    expect(redirectFor("app", signedOut)).toBe("/");
    expect(redirectFor("welcome", signedOut)).toBe("/");
    expect(redirectFor("signin", signedOut)).toBeNull();
  });

  it("sends a signed-in user without a target to /welcome", () => {
    expect(redirectFor("app", newUser)).toBe("/welcome");
    expect(redirectFor("signin", newUser)).toBe("/welcome");
    expect(redirectFor("welcome", newUser)).toBeNull();
  });

  it("sends an onboarded user from / and /welcome to /path, and lets the app render", () => {
    expect(redirectFor("signin", onboarded)).toBe("/path");
    expect(redirectFor("welcome", onboarded)).toBe("/path");
    expect(redirectFor("app", onboarded)).toBeNull();
  });
});

describe("readSeed (spec 10.3)", () => {
  it("reads a known seed and removes it, keeping the other query values and the hash", () => {
    const request = readSeed({ pathname: "/jobs", search: "?q=SQL&seed=cv-analysed&city=riyadh", hash: "#top" });
    expect(request).toEqual({ present: true, seed: "cv-analysed", cleanUrl: "/jobs?q=SQL&city=riyadh#top" });
  });

  it("removes an unknown seed without applying anything", () => {
    expect(readSeed({ pathname: "/path", search: "?seed=nonsense", hash: "" })).toEqual({ present: true, seed: null, cleanUrl: "/path" });
  });

  it("leaves a URL without a seed as it is", () => {
    expect(readSeed({ pathname: "/learn", search: "?tab=done", hash: "" })).toEqual({ present: false, seed: null, cleanUrl: "/learn?tab=done" });
    expect(readSeed({ pathname: "/", search: "", hash: "" })).toEqual({ present: false, seed: null, cleanUrl: "/" });
  });

  it("knows every seed name of 10.3", () => {
    for (const name of ["fresh", "onboarded", "cv-analysed", "course-done", "mid-path", "job-ready", "returning"]) {
      expect(readSeed({ pathname: "/", search: `?seed=${name}`, hash: "" }).seed).toBe(name);
    }
  });

  it("detects the parameter", () => {
    expect(hasSeedParam("?seed=fresh")).toBe(true);
    expect(hasSeedParam("?a=1&seed=")).toBe(true);
    expect(hasSeedParam("?q=seed")).toBe(false);
    expect(hasSeedParam("")).toBe(false);
  });
});
