// Owner: data. Every learning guide: the 38 of ./guides.ts (rewritten by research/guides/gen-guides.mjs) and the 16 of the
// 20 Nov 2026 expansion (./expansion/guides.ts, rewritten by research/expansion/build.py). ./index.ts exports GUIDES and
// getGuide from here (an explicit export wins over `export * from "./guides"`), so each generator keeps its own file.
// Pure module.
import type { SkillId } from "@/lib/types";

import { EXPANSION_GUIDES } from "./expansion/guides";
import { WAVE2_GUIDES } from "./wave2/guides";
import { GUIDES as SPEC_GUIDES, type Guide } from "./guides";

/** Every skill's guide: the spec's 38, then the expansion's 16, then wave 2's 39 (./wave2/guides.ts, research/wave2/build.py). */
export const GUIDES: readonly Guide[] = [...SPEC_GUIDES, ...EXPANSION_GUIDES, ...WAVE2_GUIDES];

const BY_SKILL = new Map<SkillId, Guide>(GUIDES.map((g) => [g.skill, g]));

/** The guide of a skill (every skill has one). */
export function getGuide(skill: SkillId): Guide {
  const guide = BY_SKILL.get(skill);
  if (!guide) throw new Error(`No guide for skill ${skill}`);
  return guide;
}
