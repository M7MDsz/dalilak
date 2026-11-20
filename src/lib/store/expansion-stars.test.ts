// Owner: store (expansion agent, 20 Nov 2026). A user saved before the expansion has no word about the 16 new skills:
// stars are never persisted as a full map (they are derived from the CV and the completed courses), so after reading the
// saved state back every new skill simply counts 0 and the old skills keep their stars.
import { describe, expect, it } from "vitest";

import { EXPANSION_SKILL_IDS } from "@/lib/data/expansion/skills";
import { makeClock, skillStars, totalStars } from "@/lib/engine";
import { SKILL_IDS } from "@/lib/ids";

import { sanitizePersisted } from "./accounts";
import { buildSeed } from "./seeds";

const CLOCK = makeClock(new Date(2026, 10, 18, 21, 0, 0, 0));

describe("persisted users from before the expansion", () => {
  it("read back with every new skill at 0 stars and the old stars unchanged", () => {
    const saved = buildSeed("course-done", CLOCK);
    // what localStorage held: plain JSON, written when the catalogue had 38 skills
    const read = sanitizePersisted(JSON.parse(JSON.stringify(saved)));
    const id = read?.currentUserId;
    expect(id).toBeTruthy();
    const before = skillStars(saved.users[id ?? ""]!);
    const after = skillStars(read!.users[id ?? ""]!);
    expect(Object.keys(after).sort()).toEqual([...SKILL_IDS].sort());
    for (const skill of EXPANSION_SKILL_IDS) expect(after[skill], skill).toBe(0);
    expect(after).toEqual(before);
    // the demo's course-done user: the sample CV's eight skills plus Power BI ★ (spec 6.2, demo step 7)
    expect(SKILL_IDS.filter((s) => after[s] > 0)).toHaveLength(9);
    expect(totalStars(after)).toBe(totalStars(before));
  });
});
