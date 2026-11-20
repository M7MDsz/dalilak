// Owner: brain-advisor. The why-path sentence (5.8) names a nearby job city as near, never as the user's own city.
import { describe, expect, it } from "vitest";

import { T } from "./templates";

describe("whyPath city clause", () => {
  it("says «في مدينتك» when the user typed the job city itself", () => {
    expect(T.whyPath([{ kind: "city", cityLabel: "الرياض" }])).toContain("في مدينتك");
  });

  it("says «قريب منك في الرياض» for a typed place near the job city («شقراء» → الرياض)", () => {
    const line = T.whyPath([{ kind: "city", cityLabel: "الرياض", near: true }]);
    expect(line).toContain("قريب منك في الرياض");
    expect(line).not.toContain("في مدينتك");
  });
});
