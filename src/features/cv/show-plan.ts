// Owner: cv. The timing of the analysis show's busy stages (PRODUCT-SPEC 6.3, playbook 3.6), as pure data so the show's
// components only read it. Everything is measured in ms from the start of its own stage.
import { SKILLS } from "@/lib/data";
import type { CvSkill, SkillId } from "@/lib/types";

/** The marker starts drawing this long before its tags pop (the 600 ms marker is ~80% drawn by then). */
const MARK_LEAD = 300;
/** A tag rests at the end of its sentence this long before it flies to the tray. */
const HOLD = 360;
/** Tags of one sentence pop (and leave) this far apart. */
const TAG_STAGGER = 70;
/** Sentences follow each other this far apart at most (the playbook's "200 ms apart"), and at least this close. */
const GAP_MAX = 220;
const GAP_MIN = 60;
/** The last group should have popped by about this time, so every flight has landed when `evidence` begins (1.6 s). */
const LAST_POP = 1_000;

export type ExtractGroup = {
  /** Index into the document's lines. */
  readonly line: number;
  /** Skills proven by this sentence, in catalogue order. */
  readonly skills: readonly SkillId[];
  readonly markAt: number;
  readonly popAt: number;
};

export type ExtractPlan = {
  readonly groups: readonly ExtractGroup[];
  /** The tray's order: the order in which the tags arrive (document order). */
  readonly order: readonly SkillId[];
};

const catalogueIndex = new Map<SkillId, number>(SKILLS.map((s, i) => [s.id, i]));

/** One group per evidence sentence, in document order; the tags of a sentence pop together, 70 ms apart. */
export function planExtract(skills: readonly CvSkill[]): ExtractPlan {
  const byLine = new Map<number, SkillId[]>();
  for (const s of skills) byLine.set(s.line, [...(byLine.get(s.line) ?? []), s.skill]);
  const lines = [...byLine.keys()].sort((a, b) => a - b);
  const gap = lines.length > 1 ? Math.max(GAP_MIN, Math.min(GAP_MAX, (LAST_POP - MARK_LEAD) / (lines.length - 1))) : 0;
  const groups = lines.map((line, g) => {
    const popAt = MARK_LEAD + g * gap;
    const ids = [...(byLine.get(line) ?? [])].sort((a, b) => (catalogueIndex.get(a) ?? 0) - (catalogueIndex.get(b) ?? 0));
    return { line, skills: ids, markAt: popAt - MARK_LEAD, popAt };
  });
  return { groups, order: groups.flatMap((g) => g.skills) };
}

/** When tag `j` of a group pops, and when it leaves for the tray. */
export function tagTimes(group: ExtractGroup, j: number): { readonly pop: number; readonly fly: number } {
  const pop = group.popAt + j * TAG_STAGGER;
  return { pop, fly: pop + HOLD };
}

/** `level`: star `k` (1-based) of the tag at tray position `i` lands at this time. 11 stars fit well inside 1.2 s. */
export function starTime(i: number, k: number, count: number): number {
  const perTag = Math.min(60, 480 / Math.max(count, 1));
  return 80 + i * perTag + (k - 1) * 130;
}

/** `match`: the ring at rank `i` starts drawing after this delay (s); the whole group starts within 300 ms. */
export function ringDelay(i: number, count: number): number {
  return (Math.min(15, 300 / Math.max(count, 1)) * i) / 1000;
}
