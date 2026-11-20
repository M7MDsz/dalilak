import { describe, expect, it } from "vitest";

import { levelFor, levelNumberFor } from "./levels";

describe("levels (spec 8.3)", () => {
  it("follows the threshold table", () => {
    const table: [number, number, string][] = [
      [0, 1, "مبتدئ"],
      [149, 1, "مبتدئ"],
      [150, 2, "مستكشف"],
      [349, 2, "مستكشف"],
      [350, 3, "مجتهد"],
      [599, 3, "مجتهد"],
      [600, 4, "متمكّن"],
      [1000, 5, "محترف"],
      [1600, 6, "خبير"],
      [2499, 6, "خبير"],
      [2500, 7, "أسطورة"],
      [99999, 7, "أسطورة"],
    ];
    for (const [xp, level, title] of table) {
      expect(levelFor(xp).level, `${xp} XP`).toBe(level);
      expect(levelFor(xp).title, `${xp} XP`).toBe(title);
    }
  });

  it("gives the demo's bar numbers", () => {
    expect(levelFor(80)).toMatchObject({ level: 1, from: 0, next: 150, xpToNext: 70 });
    expect(levelFor(180)).toMatchObject({ level: 2, title: "مستكشف", from: 150, next: 350, xpToNext: 170 });
    const at420 = levelFor(420);
    expect(at420).toMatchObject({ level: 3, from: 350, next: 600, xpToNext: 180 });
    expect(at420.ratio).toBeCloseTo(0.28, 10);
    expect(levelFor(660)).toMatchObject({ level: 4, title: "متمكّن", next: 1000 });
  });

  it("caps at level 7", () => {
    expect(levelFor(2500)).toEqual({ level: 7, title: "أسطورة", from: 2500, next: null, xpToNext: null, ratio: 1 });
    expect(levelFor(150).ratio).toBe(0);
  });

  it("never goes below level 1", () => {
    expect(levelNumberFor(-10)).toBe(1);
    expect(levelFor(-10).ratio).toBe(0);
  });
});
