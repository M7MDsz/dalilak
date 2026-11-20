// Owner: engine. Levels from total XP (spec 8.3) and the chip bar of 2.7.
import { LEVEL_THRESHOLDS, getLevel } from "@/lib/data";
import type { LevelInfo, LevelNumber } from "@/lib/types";

const LEVEL_NUMBERS: readonly LevelNumber[] = [1, 2, 3, 4, 5, 6, 7];

/** The level number for a total (thresholds of game.ts; below 0 counts as 0). */
export function levelNumberFor(totalXp: number): LevelNumber {
  let level: LevelNumber = 1;
  LEVEL_THRESHOLDS.forEach((from, i) => {
    const n = LEVEL_NUMBERS[i];
    if (n !== undefined && totalXp >= from) level = n;
  });
  return level;
}

/** 180 → level 2 «مستكشف», xpToNext 170; 420 → level 3, next 600, ratio 0.28; 2500+ → level 7, next null, ratio 1. */
export function levelFor(totalXp: number): LevelInfo {
  const level = levelNumberFor(totalXp);
  const thresholds: readonly number[] = LEVEL_THRESHOLDS;
  const from = thresholds[level - 1] ?? 0;
  const next = thresholds[level] ?? null;
  if (next === null) return { level, title: getLevel(level).title, from, next: null, xpToNext: null, ratio: 1 };
  const ratio = Math.min(1, Math.max(0, (totalXp - from) / (next - from)));
  return { level, title: getLevel(level).title, from, next, xpToNext: next - totalXp, ratio };
}
