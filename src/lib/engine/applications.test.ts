import { describe, expect, it } from "vitest";

import { applicationNumber, applicationStatus, nextApplicationNumber, nextApplicationStatus } from "./applications";
import { makeClock } from "./clock";
import { CLOCK, T0, application, applied, newFacts } from "./test-fixtures";

const t = T0.getTime();
const s = 1000;

describe("application status (spec 7.5)", () => {
  it("follows time and the match when sent", () => {
    const high = application("data-analyst-riyadh", t, 90);
    expect(applicationStatus(high, t)).toBe("sent");
    expect(applicationStatus(high, t + 29 * s)).toBe("sent");
    expect(applicationStatus(high, t + 30 * s)).toBe("review");
    expect(applicationStatus(high, t + 119 * s)).toBe("review");
    expect(applicationStatus(high, t + 120 * s)).toBe("shortlisted");
    const low = application("bi-analyst-riyadh", t, 43);
    expect(applicationStatus(low, t + 120 * s)).toBe("closed");
    // the 60% line itself is enough
    expect(applicationStatus(application("business-analyst-riyadh", t, 60), t + 200 * s)).toBe("shortlisted");
  });

  it("a manual advance moves ahead of time, never back", () => {
    const moved = application("data-analyst-riyadh", t, 90, { manualStatus: "review" });
    expect(applicationStatus(moved, t + s)).toBe("review");
    expect(applicationStatus(moved, t + 130 * s)).toBe("shortlisted");
  });

  it("a pinned (seed) application keeps its status and ignores time", () => {
    const seed = application("data-analyst-riyadh", t, 90, { manualStatus: "review", pinned: true });
    expect(applicationStatus(seed, t + 10_000 * s)).toBe("review");
    expect(nextApplicationStatus(seed, t + 10_000 * s)).toBe("shortlisted");
    expect(applicationStatus({ ...seed, manualStatus: "shortlisted" }, t + 10_000 * s)).toBe("shortlisted");
  });

  it("the control's next status, and none at the end", () => {
    const high = application("data-analyst-riyadh", t, 90);
    expect(nextApplicationStatus(high, t)).toBe("review");
    expect(nextApplicationStatus(high, t + 40 * s)).toBe("shortlisted");
    expect(nextApplicationStatus(application("bi-analyst-riyadh", t, 43), t + 40 * s)).toBe("closed");
    expect(nextApplicationStatus(high, t + 200 * s)).toBeNull();
    expect(nextApplicationStatus(application("bi-analyst-riyadh", t, 43, { manualStatus: "closed" }), t)).toBeNull();
  });
});

describe("application number (spec 7.4)", () => {
  it("«DL-2026-0001»", () => {
    expect(applicationNumber(1, 2026)).toBe("DL-2026-0001");
    expect(applicationNumber(12, 2027)).toBe("DL-2027-0012");
    expect(applicationNumber(10000, 2026)).toBe("DL-2026-10000");
  });

  it("the next number: sequence = applications + 1, year = the clock's", () => {
    expect(nextApplicationNumber(newFacts(), CLOCK)).toBe("DL-2026-0001");
    const one = applied(newFacts(), "data-analyst-riyadh", t, 90);
    expect(nextApplicationNumber(one, CLOCK)).toBe("DL-2026-0002");
    expect(nextApplicationNumber(newFacts(), makeClock(new Date(2027, 0, 1, 0, 5)))).toBe("DL-2027-0001");
  });
});
