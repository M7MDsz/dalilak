// Owner: skills. The tree's pure model: tiers, columns, line looks and the replay plan of spec 3.5.
import { describe, expect, it } from "vitest";

import { SKILL_IDS } from "@/lib/ids";
import { emptyStars } from "@/lib/engine";
import type { StarMap } from "@/lib/types";

import { FIELD_LAYOUTS, chainOf, lineLook, replayPlan, starsAt, stateFor } from "./model";

const withStars = (entries: Partial<Record<string, number>>): StarMap => ({ ...emptyStars(), ...entries }) as StarMap;

describe("layout", () => {
  it("puts every skill in exactly one tier of its field", () => {
    const all = Object.values(FIELD_LAYOUTS).flatMap((l) => l.tiers.flat().map((p) => p.skill));
    expect(new Set(all).size).toBe(SKILL_IDS.length);
  });

  it("keeps neighbours apart and inside the grid", () => {
    for (const layout of Object.values(FIELD_LAYOUTS)) {
      for (const row of layout.tiers) {
        row.forEach((p, i) => {
          expect(p.centre - p.half).toBeGreaterThanOrEqual(0);
          expect(p.centre + p.half).toBeLessThanOrEqual(12);
          const prev = row[i - 1];
          if (prev) expect(p.centre - p.half).toBeGreaterThanOrEqual(prev.centre + prev.half);
        });
      }
    }
  });

  it("draws the data field in four tiers, Excel at the root", () => {
    const data = FIELD_LAYOUTS.data;
    expect(data.tiers.map((row) => row.map((p) => p.skill))).toEqual([
      ["excel"],
      ["sql", "statistics", "powerbi"],
      ["python-data", "dataviz"],
      ["ml"],
    ]);
    expect(data.lines).toHaveLength(7);
  });

  it("logs the layout for review", () => {
    for (const layout of Object.values(FIELD_LAYOUTS)) {
      const rows = layout.tiers.map((row) => row.map((p) => `${p.skill}@${p.centre}±${p.half}`).join("  "));
      console.log(`${layout.field}\n  ${rows.join("\n  ")}`);
    }
  });
});

describe("states and lines", () => {
  it("follows the engine's node rule", () => {
    const stars = withStars({ excel: 2, sql: 2, statistics: 1 });
    expect(stateFor("excel", stars)).toBe("earned");
    expect(stateFor("powerbi", stars)).toBe("available");
    expect(stateFor("dataviz", stars)).toBe("locked");
    expect(stateFor("python-data", stars)).toBe("available");
    expect(stateFor("statistics", withStars({ statistics: 2 }))).toBe("maxed");
  });

  it("tells a walked line from the next one and the closed ones", () => {
    const stars = withStars({ excel: 2, sql: 2 });
    const line = (from: string, to: string) => FIELD_LAYOUTS.data.lines.find((l) => l.from === from && l.to === to)!;
    expect(lineLook(line("excel", "sql"), stars, "powerbi")).toBe("walked");
    expect(lineLook(line("excel", "powerbi"), stars, "powerbi")).toBe("next");
    expect(lineLook(line("excel", "statistics"), stars, "powerbi")).toBe("open");
    expect(lineLook(line("powerbi", "dataviz"), stars, "powerbi")).toBe("closed");
  });

  it("lights a chain down to the roots", () => {
    expect([...chainOf("ml")].sort()).toEqual(["excel", "ml", "python-data", "sql", "statistics"]);
  });
});

describe("replay", () => {
  it("lands the demo's Power BI star after the grow, then ends", () => {
    const before = withStars({ excel: 2, sql: 2, statistics: 1 });
    const after = withStars({ excel: 2, sql: 2, statistics: 1, powerbi: 1 });
    const plan = replayPlan(before, after, true);
    expect(plan.steps).toEqual([{ at: expect.any(Number), skill: "powerbi", stars: 1 }]);
    expect(plan.steps[0]!.at).toBeGreaterThan(plan.growFor);
    expect(plan.endsAt).toBeGreaterThan(plan.steps[0]!.at + 1.1);
    expect(starsAt(before, plan, plan.endsAt).powerbi).toBe(1);
    expect(starsAt(before, plan, 0).powerbi).toBe(0);
  });

  it("spreads a CV's stars from the roots down, one step per star", () => {
    const after = withStars({ excel: 2, sql: 2, statistics: 1, programming: 1, english: 2, communication: 1, presentation: 1, teamwork: 1 });
    const plan = replayPlan(emptyStars(), after, true);
    expect(plan.steps).toHaveLength(11);
    const firstSql = plan.steps.find((s) => s.skill === "sql")!.at;
    const lastExcel = Math.max(...plan.steps.filter((s) => s.skill === "excel").map((s) => s.at));
    expect(firstSql).toBeGreaterThan(lastExcel);
  });

  it("has nothing to play when nothing changed and the tree does not grow", () => {
    const stars = withStars({ excel: 1 });
    const plan = replayPlan(stars, stars, false);
    expect(plan.steps).toHaveLength(0);
    expect(plan.growFor).toBe(0);
  });
});
