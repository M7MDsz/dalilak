// Owner: skills. The pure model of the skill tree (spec 3.5): which tier and column each skill takes inside its field,
// the state a node shows for a given set of stars, the state of every line, and the replay plan that carries the tree
// from what this page last showed to what is true now (`tree-grow`, `star-fill`, `node-unlock`). No React here.
//
// The node rule is the engine's (spec 3.5 / 8.5: earned · maxed · available · locked). The engine computes it from the
// user's facts (`skillNodes`), which is what the page shows at rest and what `data-state` carries from the first frame.
// The replay must also draw the tree at an EARLIER set of stars (the baseline of `star-fill`), which the engine does not
// expose, so `stateFor` applies the same rule to a StarMap. They agree by construction; `stateFor(stars) ===
// skillNodes(facts)[id].state` whenever `stars = skillStars(facts)`.
import { FIELD_IDS, SKILL_IDS } from "@/lib/ids";
import { SKILLS, getSkill } from "@/lib/data";
import type { FieldId, SkillId, SkillNodeState, StarCount, StarMap } from "@/lib/types";

// ─── Layout ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Columns of a field's grid. A node's centre sits on an even column line (2, 4 … 10), so three fit side by side. */
export const GRID_COLUMNS = 12;
/** Two neighbours in one tier keep their centres this many columns apart (their boxes never overlap). */
const MIN_SEPARATION = 4;

export interface PlacedSkill {
  readonly skill: SkillId;
  readonly tier: number;
  /** The column line the node is centred on (1..11 of 12). */
  readonly centre: number;
  /** Half the node box, in columns: the label may use 2 × half columns. */
  readonly half: number;
}

export interface TreeLine {
  readonly key: string;
  readonly from: SkillId;
  readonly to: SkillId;
  /** Tiers crossed (1 = neighbouring tiers; more = the line must pass a tier in between). */
  readonly span: number;
}

export interface FieldLayout {
  readonly field: FieldId;
  readonly skills: readonly SkillId[];
  readonly tiers: readonly (readonly PlacedSkill[])[];
  readonly lines: readonly TreeLine[];
  readonly placed: Readonly<Partial<Record<SkillId, PlacedSkill>>>;
}

/** Depth by prerequisite: a root is 0, a skill sits one tier under its deepest prerequisite. */
function depthOf(skill: SkillId, memo: Map<SkillId, number>): number {
  const known = memo.get(skill);
  if (known !== undefined) return known;
  const prereqs = getSkill(skill).prereqs;
  const depth = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map((p) => depthOf(p, memo)));
  memo.set(skill, depth);
  return depth;
}

/** Centres for a tier with no prerequisite to follow (the roots): evenly spread. */
const ROOT_CENTRES: Readonly<Record<number, readonly number[]>> = { 1: [6], 2: [4, 8], 3: [2, 6, 10] };

/**
 * The positions of one tier: every node as close as it can be to the mean of its prerequisites' centres, neighbours at
 * least MIN_SEPARATION apart, inside the grid. Brute force (three nodes at most, nine positions each); ties go to the
 * placement whose mean is nearest the middle, then to the one with the most even spacing.
 */
function placeTier(desired: readonly number[]): number[] {
  const n = desired.length;
  const positions = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  let best: number[] = [];
  let bestCost = Number.POSITIVE_INFINITY;
  const walk = (i: number, chosen: number[]) => {
    if (i === n) {
      const displacement = chosen.reduce((sum, x, k) => sum + Math.abs(x - (desired[k] ?? 6)), 0);
      const mean = chosen.reduce((s, x) => s + x, 0) / n;
      const cost = displacement * 100 + Math.abs(mean - 6) * 10 + (chosen.some((x) => x % 2 === 1) ? 1 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = [...chosen];
      }
      return;
    }
    for (const x of positions) {
      const prev = chosen[i - 1];
      if (prev !== undefined && x - prev < MIN_SEPARATION) continue;
      walk(i + 1, [...chosen, x]);
    }
  };
  walk(0, []);
  return best;
}

function layoutOf(field: FieldId): FieldLayout {
  const skills = SKILLS.filter((s) => s.field === field).map((s) => s.id);
  const memo = new Map<SkillId, number>();
  const byTier: SkillId[][] = [];
  for (const id of skills) {
    const tier = depthOf(id, memo);
    (byTier[tier] ??= []).push(id);
  }

  const centre = new Map<SkillId, number>();
  const tiers: PlacedSkill[][] = [];
  byTier.forEach((ids, tier) => {
    let order = ids;
    let centres: number[];
    if (tier === 0) {
      // Three roots: the one that opens the most skills takes the middle, so its fork is symmetric (communication
      // opens presentation and teamwork); the others keep data order on either side.
      if (ids.length === 3) {
        const opens = (id: SkillId) => SKILLS.filter((s) => s.prereqs.includes(id)).length;
        const hub = [...ids].sort((a, b) => opens(b) - opens(a) || ids.indexOf(a) - ids.indexOf(b))[0];
        if (hub !== undefined && opens(hub) > 1) {
          const sides = ids.filter((id) => id !== hub);
          order = [sides[0] ?? hub, hub, sides[1] ?? hub];
        }
      }
      centres = [...(ROOT_CENTRES[ids.length] ?? ids.map((_, i) => 2 + i * 4))];
    } else {
      const want = (id: SkillId) => {
        const parents = getSkill(id).prereqs.map((p) => centre.get(p) ?? 6);
        return parents.reduce((s, x) => s + x, 0) / parents.length;
      };
      // Order by where each node wants to be (data order breaks ties), so lines do not cross needlessly.
      order = [...ids].sort((a, b) => want(a) - want(b) || ids.indexOf(a) - ids.indexOf(b));
      centres = placeTier(order.map(want));
    }
    const row: PlacedSkill[] = order.map((skill, i) => {
      const x = centres[i] ?? 6;
      const left = i === 0 ? Number.POSITIVE_INFINITY : x - (centres[i - 1] ?? 0);
      const right = i === order.length - 1 ? Number.POSITIVE_INFINITY : (centres[i + 1] ?? 12) - x;
      const half = Math.max(1, Math.floor(Math.min(3, x, GRID_COLUMNS - x, left / 2, right / 2)));
      centre.set(skill, x);
      return { skill, tier, centre: x, half };
    });
    tiers.push(row);
  });

  const placed: Partial<Record<SkillId, PlacedSkill>> = {};
  for (const row of tiers) for (const p of row) placed[p.skill] = p;

  const lines: TreeLine[] = [];
  for (const id of skills) {
    for (const from of getSkill(id).prereqs) {
      const span = (placed[id]?.tier ?? 0) - (placed[from]?.tier ?? 0);
      lines.push({ key: `${from}>${id}`, from, to: id, span });
    }
  }
  return { field, skills, tiers, lines, placed };
}

/** Every field's layout, computed once (the catalogue is static). */
export const FIELD_LAYOUTS: Readonly<Record<FieldId, FieldLayout>> = Object.fromEntries(
  FIELD_IDS.map((field) => [field, layoutOf(field)]),
) as Record<FieldId, FieldLayout>;

// ─── States ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Spec 3.5 node state for a set of stars (the engine's rule, applied to any StarMap: see the header). */
export function stateFor(skill: SkillId, stars: StarMap): SkillNodeState {
  const held = stars[skill];
  const def = getSkill(skill);
  if (held >= def.maxStars) return "maxed";
  if (held >= 1) return "earned";
  return def.prereqs.every((p) => stars[p] >= 1) ? "available" : "locked";
}

/** The four lagged views of the stars (LAG): what each part of the tree shows at one moment of a replay. */
export type StarViews = Readonly<Record<LagKey, StarMap>>;

/** The node's state from the lagged views: its own stars as the disk shows them, its lock as the lines have arrived. */
export function lookFor(skill: SkillId, views: StarViews): SkillNodeState {
  const held = views.node[skill];
  const def = getSkill(skill);
  if (held >= def.maxStars) return "maxed";
  if (held >= 1) return "earned";
  return def.prereqs.every((p) => views.unlock[p] >= 1) ? "available" : "locked";
}

/** Prerequisites with no star (all of them, in data order): «مقفلة. اكتسب أولاً: …». */
export function missingPrereqs(skill: SkillId, stars: StarMap): readonly SkillId[] {
  return getSkill(skill).prereqs.filter((p) => stars[p] < 1);
}

/**
 * A line's look (Darb: covered is solid ink, the way ahead is dotted):
 * - `walked`  both ends hold a star: solid ink.
 * - `next`    the prerequisite holds a star and the skill it opens is the user's next step: dotted accent.
 * - `open`    the prerequisite holds a star, the skill does not: dotted, clearly visible.
 * - `closed`  the prerequisite holds no star: quiet dots (a way that does not exist for this user yet).
 */
export type LineLook = "walked" | "next" | "open" | "closed";

export function lineLook(line: TreeLine, stars: StarMap, next: SkillId | null): LineLook {
  return lineLookIn(line, { line: stars, node: stars, out: stars, unlock: stars }, next);
}

/** The same from the lagged views: a line turns to ink as its skill's star step happens, opens once its source has lit. */
export function lineLookIn(line: TreeLine, views: StarViews, next: SkillId | null): LineLook {
  if (views.line[line.to] >= 1 && views.out[line.from] >= 1) return "walked";
  if (views.out[line.from] < 1) return "closed";
  return line.to === next ? "next" : "open";
}

/** The skill and every prerequisite under it, transitively (the chain a selected node lights). */
export function chainOf(skill: SkillId): ReadonlySet<SkillId> {
  const out = new Set<SkillId>();
  const visit = (id: SkillId) => {
    if (out.has(id)) return;
    out.add(id);
    for (const p of getSkill(id).prereqs) visit(p);
  };
  visit(skill);
  return out;
}

// ─── The replay ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Seconds. `tree-grow` is 1.0 s in the spec: it starts once the page has risen, tiers 0.2 s apart, fields 0.04 s apart. */
export const GROW = { start: 0.15, tierStep: 0.2, fieldStep: 0.04, node: 0.32 } as const;

/**
 * Cause, then effect (playbook 1.1): when a star step happens at time T, each part of the tree shows it after its own lag.
 * - `line`   T + 0      the line into the skill draws (ink over the dots), from its prerequisite down to it
 * - `node`   T + 0.42   the disk lights and the star lands, when the line has arrived
 * - `out`    T + 0.62   the lines out of it change (a closed way opens), drawn from it to the skills it opens
 * - `unlock` T + 1.12   the skill at the end of a newly open line loses its lock, when that line has arrived
 */
export const LAG = { line: 0, node: 0.42, out: 0.62, unlock: 1.12 } as const;
export type LagKey = keyof typeof LAG;

/** One star landing on one node, at `at` seconds after the replay starts. */
export interface StarStep {
  readonly at: number;
  readonly skill: SkillId;
  readonly stars: StarCount;
}

export interface ReplayPlan {
  /** Seconds the grow takes before the first star lands (0 when the tree does not grow). */
  readonly growFor: number;
  /** The stars, one step per star, in the order they land. */
  readonly steps: readonly StarStep[];
  /** When everything has landed and every unlocked line has drawn (the moment to remember what was shown). */
  readonly endsAt: number;
}

/**
 * The plan from `from` (what the page last showed) to `to` (now). Stars land tier by tier, so the light spreads down the
 * tree along its lines: a root lights first, the lines from it draw, then the skills under it light. Inside a tier the
 * nodes follow each other by up to 70 ms (the whole tier inside 420 ms), a node's second and third star by 120 ms.
 * Under reduced motion the caller skips the plan and shows `to` at once.
 */
export function replayPlan(from: StarMap, to: StarMap, grow: boolean): ReplayPlan {
  const growFor = grow ? GROW.start + GROW.tierStep * 3 + GROW.node : 0;
  const gained = SKILL_IDS.filter((id) => to[id] > from[id]);
  const tierOf = (id: SkillId) => FIELD_LAYOUTS[getSkill(id).field].placed[id]?.tier ?? 0;
  const tiers = [...new Set(gained.map(tierOf))].sort((a, b) => a - b);

  const steps: StarStep[] = [];
  let at = growFor + (gained.length > 0 ? 0.1 : 0);
  tiers.forEach((tier, k) => {
    const inTier = gained.filter((id) => tierOf(id) === tier);
    const stagger = Math.min(0.07, 0.42 / Math.max(1, inTier.length));
    let last = at;
    inTier.forEach((id, i) => {
      const start = at + i * stagger;
      for (let n = from[id] + 1; n <= to[id]; n++) {
        const t = start + (n - from[id] - 1) * 0.12;
        steps.push({ at: t, skill: id, stars: n as StarCount });
        last = Math.max(last, t);
      }
    });
    // The next tier's lines leave once this tier has lit.
    if (k < tiers.length - 1) at = last + LAG.out + 0.02;
  });
  const lastStep = steps.length > 0 ? Math.max(...steps.map((s) => s.at)) : growFor;
  const opensSomething = SKILL_IDS.some((id) => stateFor(id, from) === "locked" && stateFor(id, to) !== "locked");
  const endsAt = lastStep + (steps.length > 0 ? (opensSomething ? LAG.unlock + 0.5 : LAG.node + 0.5) : 0.2);
  return { growFor, steps, endsAt };
}

/** The stars shown `t` seconds into a plan. */
export function starsAt(from: StarMap, plan: ReplayPlan, t: number): StarMap {
  const out: Record<SkillId, StarCount> = { ...from };
  for (const step of plan.steps) if (step.at <= t && step.stars > out[step.skill]) out[step.skill] = step.stars;
  return out;
}

/** A full StarMap from the remembered partial record (a skill missing from it showed 0). */
export function fromSeen(seen: Readonly<Partial<Record<SkillId, StarCount>>>): StarMap {
  const out = {} as Record<SkillId, StarCount>;
  for (const id of SKILL_IDS) out[id] = seen[id] ?? 0;
  return out;
}

/** Equal star maps (nothing to replay). */
export function sameStars(a: StarMap, b: StarMap): boolean {
  return SKILL_IDS.every((id) => a[id] === b[id]);
}
