// Owner: shell. Spec 2.4-2.5 navigation, the desktop heading of ARCHITECTURE 11.1 and the pill rule of 2.8.
import { describe, expect, it } from "vitest";

import { activeNavItem, firstName, isMoreActive, isOnPage, MORE_ITEMS, NAV_GROUPS, NAV_HREF, NAV_ITEMS, PHONE_TABS_AFTER_CENTRE, PHONE_TABS_BEFORE_CENTRE, pathOf, topBarHeading } from "./nav";

describe("navigation items (spec 2.5)", () => {
  it("has eight items in three groups, in the spec's order", () => {
    expect(NAV_GROUPS).toEqual([
      ["path", "skills", "learn"],
      ["cv", "jobs", "applications"],
      ["leaderboard", "profile"],
    ]);
    expect(NAV_ITEMS).toHaveLength(8);
  });

  it("splits the phone navigation between the tab bar and the «المزيد» sheet with nothing lost or doubled (2.4)", () => {
    expect([...PHONE_TABS_BEFORE_CENTRE, ...PHONE_TABS_AFTER_CENTRE]).toEqual(["path", "learn", "jobs"]);
    expect(MORE_ITEMS).toEqual(["skills", "cv", "applications", "leaderboard", "profile"]);
    const all = [...PHONE_TABS_BEFORE_CENTRE, ...PHONE_TABS_AFTER_CENTRE, ...MORE_ITEMS];
    expect(new Set(all).size).toBe(8);
    expect([...all].sort()).toEqual([...NAV_ITEMS].sort());
  });

  it("links every item to its route", () => {
    expect(NAV_HREF).toEqual({
      path: "/path",
      skills: "/skills",
      learn: "/learn",
      cv: "/cv",
      jobs: "/jobs",
      applications: "/applications",
      leaderboard: "/leaderboard",
      profile: "/profile",
    });
  });
});

describe("activeNavItem", () => {
  it("marks the item of the page, and the section item on detail pages", () => {
    expect(activeNavItem("/path")).toBe("path");
    expect(activeNavItem("/skills")).toBe("skills");
    expect(activeNavItem("/jobs")).toBe("jobs");
    expect(activeNavItem("/jobs/data-analyst-riyadh")).toBe("jobs");
    expect(activeNavItem("/learn/c-powerbi-1")).toBe("learn");
    expect(activeNavItem("/profile/")).toBe("profile");
  });

  it("marks nothing outside the shell", () => {
    expect(activeNavItem("/")).toBeNull();
    expect(activeNavItem("/welcome")).toBeNull();
    expect(activeNavItem("/nowhere")).toBeNull();
    expect(activeNavItem("/jobs/a/b")).toBeNull();
  });

  it("lights «المزيد» for its five pages only", () => {
    expect(isMoreActive("/leaderboard")).toBe(true);
    expect(isMoreActive("/cv")).toBe(true);
    expect(isMoreActive("/path")).toBe(false);
    expect(isMoreActive("/jobs/data-analyst-riyadh")).toBe(false);
  });
});

describe("topBarHeading (ARCHITECTURE 11.1, 17.4)", () => {
  it("is the page heading, and the section heading on detail pages", () => {
    expect(topBarHeading("/path")).toBe("مسارك");
    expect(topBarHeading("/jobs")).toBe("الوظائف");
    expect(topBarHeading("/jobs/data-analyst-riyadh")).toBe("الوظائف");
    expect(topBarHeading("/learn/c-powerbi-1")).toBe("الدورات");
    expect(topBarHeading("/skills")).toBe("شجرة المهارات");
    expect(topBarHeading("/welcome")).toBeNull();
  });
});

describe("isOnPage (spec 2.8: the pill hides on the page it would open)", () => {
  it("compares paths only", () => {
    expect(isOnPage("/cv", "/cv")).toBe(true);
    expect(isOnPage("/learn/c-powerbi-1", "/learn/c-powerbi-1")).toBe(true);
    expect(isOnPage("/jobs", "/jobs?q=SQL")).toBe(true);
    expect(isOnPage("/jobs/data-analyst-riyadh", "/jobs")).toBe(false);
    expect(isOnPage("/learn", "/learn/c-powerbi-1")).toBe(false);
  });

  it("strips query, hash and trailing slashes", () => {
    expect(pathOf("/jobs/x?apply=1#missing")).toBe("/jobs/x");
    expect(pathOf("/path/")).toBe("/path");
    expect(pathOf("/")).toBe("/");
    expect(pathOf("")).toBe("/");
  });
});

describe("firstName (spec 2.7)", () => {
  it("keeps the first word of the name as typed", () => {
    expect(firstName("خالد")).toBe("خالد");
    expect(firstName("  سارة   العتيبي ")).toBe("سارة");
    expect(firstName("Sara Ali")).toBe("Sara");
  });
});
