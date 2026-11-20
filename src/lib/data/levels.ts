// Owner: data. The seven levels of spec 8.3: titles «مبتدئ» … «أسطورة», thresholds from game.ts LEVEL_THRESHOLDS.
// The level is always derived from total XP (engine `levelFor`). Pure module.
import type { Level, LevelNumber } from "@/lib/types";

import { LEVEL_THRESHOLDS } from "./game";

export const LEVELS: readonly Level[] = [
  { level: 1, title: "مبتدئ", from: LEVEL_THRESHOLDS[0] },
  { level: 2, title: "مستكشف", from: LEVEL_THRESHOLDS[1] },
  { level: 3, title: "مجتهد", from: LEVEL_THRESHOLDS[2] },
  { level: 4, title: "متمكّن", from: LEVEL_THRESHOLDS[3] },
  { level: 5, title: "محترف", from: LEVEL_THRESHOLDS[4] },
  { level: 6, title: "خبير", from: LEVEL_THRESHOLDS[5] },
  { level: 7, title: "أسطورة", from: LEVEL_THRESHOLDS[6] },
];

export function getLevel(level: LevelNumber): Level {
  const found = LEVELS.find((l) => l.level === level);
  if (!found) throw new Error(`data: unknown level ${level}`);
  return found;
}
