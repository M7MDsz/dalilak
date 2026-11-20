"use client";
// Owner: skills. One field of the tree: a sheet of the map with its quiet contours, the field's label cut into its border
// (icon, name, how many of its skills the user holds), the skills in tiers by prerequisite depth on a 12-column grid,
// and one measured line from each prerequisite to the skill it opens (playbook 3.5: CSS places the nodes, SVG draws
// the lines). The grid sits in an RTL container, so it mirrors itself; the lines are measured in physical pixels from
// offset* (transform-free, so they do not jump while nodes pop), so nothing is flipped by hand.
//
// A line that crosses a tier (a prerequisite two tiers up, as «أساسيات البرمجة» → «واجهات API») walks around the node in
// between, in a lane beside it, instead of running through it.
import { motion } from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { anchor, useInstant, type Pt } from "@/components/motion";
import { Card, ContourBackdrop, cn } from "@/components/ui";
import { countNoun } from "@/lib/copy";
import { getField } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { spring, tween } from "@/lib/motion";
import type { FieldId, SkillId, SkillNode as EngineNode } from "@/lib/types";

import { FieldIcon } from "./field-icon";
import { FIELD_LAYOUTS, GROW, lineLookIn, lookFor, type StarViews } from "./model";
import { SkillNode, type NodeSize } from "./skill-node";
import { TreeLine } from "./tree-line";

/** Contour placement per field, so the seven sheets do not repeat one another (texture only: it carries no meaning). */
const TERRAIN: Readonly<Record<FieldId, { seed: number; x: number; y: number }>> = {
  data: { seed: 11, x: 0.72, y: 0.22 },
  software: { seed: 23, x: 0.3, y: 0.7 },
  design: { seed: 37, x: 0.55, y: 0.35 },
  marketing: { seed: 41, x: 0.25, y: 0.3 },
  business: { seed: 53, x: 0.7, y: 0.75 },
  hr: { seed: 67, x: 0.4, y: 0.2 },
  professional: { seed: 79, x: 0.62, y: 0.6 },
  product: { seed: 83, x: 0.35, y: 0.55 },
  "cyber-cloud": { seed: 97, x: 0.68, y: 0.4 },
  "sales-supply": { seed: 101, x: 0.45, y: 0.78 },
  // wave 2
  engineering: { seed: 107, x: 0.3, y: 0.3 },
  "project-controls": { seed: 113, x: 0.66, y: 0.62 },
  "tourism-hospitality": { seed: 127, x: 0.42, y: 0.72 },
  "health-admin": { seed: 131, x: 0.7, y: 0.28 },
  education: { seed: 137, x: 0.28, y: 0.6 },
  "banking-risk": { seed: 139, x: 0.58, y: 0.45 },
  legal: { seed: 149, x: 0.36, y: 0.38 },
  media: { seed: 151, x: 0.74, y: 0.7 },
  gaming: { seed: 157, x: 0.5, y: 0.25 },
};

const f = (n: number) => n.toFixed(1);
/**
 * The "C …" part of a branch from a down to b. The handles reach 38% of the drop (not the playbook's 50%), so a wide fork
 * leaves its root as a branch does, on a slope, instead of running flat like a bracket.
 */
const curve = (a: Pt, b: Pt) => {
  const k = (b.y - a.y) * 0.38;
  return `C ${f(a.x)} ${f(a.y + k)}, ${f(b.x)} ${f(b.y - k)}, ${f(b.x)} ${f(b.y)}`;
};

interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

function boxOf(el: HTMLElement, root: HTMLElement): Box {
  const top = anchor(el, root, "top");
  return { left: top.x - el.offsetWidth / 2, right: top.x + el.offsetWidth / 2, top: top.y, bottom: top.y + el.offsetHeight };
}

export function TreeRegion({
  field,
  index,
  views,
  nodes,
  next,
  chain,
  grow,
  arriving = false,
  size = "md",
  onSelect,
  className,
}: {
  readonly field: FieldId;
  /** Position among the shown fields (staggers the grow). */
  readonly index: number;
  /** The stars drawn now, per part of the tree (the replay may still be on an earlier set). */
  readonly views: StarViews;
  /** The engine's nodes: what is true (data-state, data-value, «في مسارك»). */
  readonly nodes: Readonly<Record<SkillId, EngineNode>>;
  /** The skill of the user's next step, if it is a course. */
  readonly next: SkillId | null;
  /** The selected skill's chain (it stays lit; the rest goes quiet), or null. */
  readonly chain: ReadonlySet<SkillId> | null;
  /** Play `tree-grow` on mount. */
  readonly grow: boolean;
  /** The replay is still running (marks that appear now arrive with motion). */
  readonly arriving?: boolean;
  readonly size?: NodeSize;
  readonly onSelect: (skill: SkillId) => void;
  readonly className?: string;
}): ReactNode {
  const instant = useInstant();
  const layout = FIELD_LAYOUTS[field];
  const gridRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<SkillId, HTMLElement>());
  const [paths, setPaths] = useState<Readonly<Record<string, string>>>({});
  const growing = grow && !instant;

  const measure = useCallback(() => {
    const root = gridRef.current;
    if (!root) return;
    const out: Record<string, string> = {};
    for (const line of layout.lines) {
      const fromEl = buttons.current.get(line.from);
      const toEl = buttons.current.get(line.to);
      if (!fromEl || !toEl) continue;
      const a = anchor(fromEl, root, "bottom");
      const b = anchor(toEl, root, "top");
      const start = { x: a.x, y: a.y - 2 };
      const end = { x: b.x, y: b.y + (size === "lg" ? -5 : -6) };
      let d = `M ${f(start.x)} ${f(start.y)} ${curve(start, end)}`;
      if (line.span > 1) {
        // Nodes in the tiers between: walk around the one the straight line would cross.
        const fromTier = layout.placed[line.from]?.tier ?? 0;
        const toTier = layout.placed[line.to]?.tier ?? 0;
        const between = layout.tiers.slice(fromTier + 1, toTier).flat();
        for (const p of between) {
          const el = buttons.current.get(p.skill);
          if (!el) continue;
          const box = boxOf(el, root);
          const t = (box.top + box.bottom) / 2;
          const x = start.x + ((end.x - start.x) * (t - start.y)) / Math.max(1, end.y - start.y);
          if (x < box.left - 10 || x > box.right + 10) continue;
          const lanes = [box.left - 14, box.right + 14].filter((lx) => lx > 10 && lx < root.clientWidth - 10);
          const mid = (start.x + end.x) / 2;
          const lane = lanes.sort((l1, l2) => Math.abs(l1 - mid) - Math.abs(l2 - mid))[0];
          if (lane === undefined) continue;
          const inTop = { x: lane, y: box.top + 8 };
          const inBottom = { x: lane, y: box.bottom - 8 };
          d = `M ${f(start.x)} ${f(start.y)} ${curve(start, inTop)} L ${f(inBottom.x)} ${f(inBottom.y)} ${curve(inBottom, end)}`;
          break;
        }
      }
      out[line.key] = d;
    }
    setPaths((prev) => (Object.keys(out).every((k) => prev[k] === out[k]) && Object.keys(prev).length === Object.keys(out).length ? prev : out));
  }, [layout, size]);

  useLayoutEffect(() => {
    measure();
    const root = gridRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    for (const el of buttons.current.values()) observer.observe(el);
    void document.fonts?.ready.then(() => measure());
    return () => observer.disconnect();
  }, [measure]);

  const terrain = TERRAIN[field];
  const held = layout.skills.filter((id) => nodes[id].stars > 0).length;
  const base = GROW.start + index * GROW.fieldStep;

  return (
    <Card
      className={cn("flex flex-col", className)}
      data-field={field}
      label={
        <span className="inline-flex items-center gap-2">
          <FieldIcon className="text-fg" field={field} size={20} waypoint="muted" />
          <span className="font-semibold text-fg">{getField(field).name}</span>
          <span className="font-normal text-fg-3">
            · {formatNumber(held)} من {countNoun(layout.skills.length, "skill")}
          </span>
        </span>
      }
      padding="none"
    >
      <div className="relative isolate -mt-3 flex flex-1 flex-col overflow-hidden rounded-card">
        <ContourBackdrop intensity="faint" rings={14} seed={terrain.seed} summit={{ x: terrain.x, y: terrain.y }} />
        <div
          className={cn(
            "relative grid flex-1 grid-cols-12 content-evenly",
            size === "lg" ? "gap-y-20 px-4 pt-12 pb-10" : "gap-y-14 px-2 pt-9 pb-6",
          )}
          ref={gridRef}
        >
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
            {layout.lines.map((line) => {
              const d = paths[line.key];
              if (d === undefined) return null;
              const fromTier = layout.placed[line.from]?.tier ?? 0;
              return (
                <TreeLine
                  d={d}
                  dim={chain !== null && !(chain.has(line.from) && chain.has(line.to))}
                  duration={0.5 + 0.15 * (line.span - 1)}
                  growDelay={growing ? base + fromTier * GROW.tierStep + 0.14 : null}
                  id={`sk-${line.from}-${line.to}`}
                  key={line.key}
                  look={lineLookIn(line, views, next)}
                />
              );
            })}
          </svg>
          {layout.tiers.flat().map((p) => (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex justify-center"
              initial={growing ? { opacity: 0, scale: 0.8 } : false}
              key={p.skill}
              style={{ gridColumn: `${p.centre - p.half + 1} / span ${p.half * 2}`, gridRow: p.tier + 1 }}
              transition={{ default: { ...spring.pop, delay: base + p.tier * GROW.tierStep }, opacity: { ...tween.fast, delay: base + p.tier * GROW.tierStep } }}
            >
              <div
                className="contents"
                ref={(el) => {
                  const button = el?.firstElementChild;
                  if (button instanceof HTMLElement) buttons.current.set(p.skill, button);
                  else buttons.current.delete(p.skill);
                }}
              >
                <SkillNode
                  dim={chain !== null && !chain.has(p.skill)}
                  finalStars={nodes[p.skill].stars}
                  finalState={nodes[p.skill].state}
                  inPath={nodes[p.skill].inPath}
                  look={lookFor(p.skill, views)}
                  arriving={arriving}
                  next={p.skill === next}
                  onSelect={onSelect}
                  size={size}
                  skill={p.skill}
                  stars={views.node[p.skill]}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}
