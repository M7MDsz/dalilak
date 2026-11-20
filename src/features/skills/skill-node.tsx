"use client";
// Owner: skills. One node of the tree (spec 3.5): a station disk with its field's icon, the skill's name and its star
// slots. States are told apart by shape and icon, never by colour alone:
//   earned   the disk is lit: solid ink, the icon in the sheet colour, stars filled up to what is held
//   maxed    lit, and an index ring around it (every star of the skill)
//   available  a white disk with a solid control ring: open, start whenever
//   locked   a sunk disk with a dashed ring and the lock; the name stays readable (locked is not faded out)
// «في مسارك» is a small target pip on the disk; the user's next step (the skill of the course the next-step rule names)
// carries the waypoint: an accent ring that opens once with the accent dot in the opening (Darb's signature), and the
// icon's own dot in the accent. Every change of state animates from what was shown: the ink fills the disk (lit), the
// lock gives way to the icon with a 2 px blur (node-unlock), the new star lands with a pop (star-fill).
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { IconLock, IconTarget } from "@/components/icons";
import { useInstant } from "@/components/motion";
import { SkillStars, cn } from "@/components/ui";
import { starsOf } from "@/lib/copy";
import { getSkill } from "@/lib/data";
import { spring, tween } from "@/lib/motion";
import { TID } from "@/lib/testids";
import type { SkillId, SkillNodeState, StarCount } from "@/lib/types";

import { FieldIcon } from "./field-icon";
import { STATE_LABEL } from "./copy";

export type NodeSize = "md" | "lg";

const TILE = { md: 56, lg: 68 } as const;
const ICON = { md: 24, lg: 28 } as const;

/**
 * The open ring of the next step: a circle that opens once at the top, the accent dot standing in the opening. When it
 * arrives during the tree's replay (the skill just opened) the ring draws and the dot lands; at rest it is simply there.
 */
function NextRing({ size, arrive }: { size: number; arrive: boolean }): ReactNode {
  const r = size / 2 + 7;
  const box = r * 2 + 8;
  const c = box / 2;
  const gap = 0.42; // radians each side of 12 o'clock
  const a0 = -Math.PI / 2 + gap;
  const a1 = -Math.PI / 2 - gap + Math.PI * 2;
  const p = (a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  return (
    <svg aria-hidden className="pointer-events-none absolute" height={box} style={{ insetInlineStart: -(box - size) / 2, top: -(box - size) / 2 }} width={box}>
      <motion.path
        animate={{ pathLength: 1, opacity: 1 }}
        className="stroke-accent"
        d={`M ${p(a0)} A ${r} ${r} 0 1 1 ${p(a1)}`}
        fill="none"
        initial={arrive ? { pathLength: 0, opacity: 0 } : false}
        strokeLinecap="round"
        strokeWidth={2.25}
        transition={{ pathLength: tween.draw, opacity: { duration: 0.01 } }}
      />
      <motion.circle
        animate={{ scale: 1, opacity: 1 }}
        className="fill-accent"
        cx={c}
        cy={c - r}
        initial={arrive ? { scale: 0, opacity: 0 } : false}
        r={3.5}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        transition={{ scale: { ...spring.pop, delay: arrive ? 0.75 : 0 }, opacity: { ...tween.fast, delay: arrive ? 0.75 : 0 } }}
      />
    </svg>
  );
}

export function SkillNode({
  skill,
  look,
  stars,
  finalState,
  finalStars,
  inPath,
  next,
  arriving = false,
  dim,
  size,
  onSelect,
}: {
  readonly skill: SkillId;
  /** The state drawn now (it may still be the replay's earlier state). */
  readonly look: SkillNodeState;
  /** The stars drawn now. */
  readonly stars: StarCount;
  /** The state and stars that are true (data-state / data-value from the first frame, spec "Test ids"). */
  readonly finalState: SkillNodeState;
  readonly finalStars: StarCount;
  readonly inPath: boolean;
  readonly next: boolean;
  /** The tree is still replaying: marks that appear now arrive (the next-step ring draws) instead of being there. */
  readonly arriving?: boolean;
  readonly dim: boolean;
  readonly size: NodeSize;
  readonly onSelect: (skill: SkillId) => void;
}): ReactNode {
  const instant = useInstant();
  const def = getSkill(skill);
  const lit = look === "earned" || look === "maxed";
  const locked = look === "locked";
  const tile = TILE[size];

  // The slot that just filled lands with a pop; a star already on screen never replays.
  const [seen, setSeen] = useState({ stars, fresh: undefined as number | undefined });
  if (seen.stars !== stars) setSeen({ stars, fresh: stars > seen.stars && !instant ? stars : undefined });

  const label = [def.name, starsOf(finalStars, def.maxStars), STATE_LABEL[finalState], inPath ? "في مسارك" : null].filter(Boolean).join("، ");

  return (
    <button
      aria-haspopup="dialog"
      aria-label={label}
      className={cn(
        "group relative flex max-w-full flex-col items-center rounded-card px-1.5 pt-0.5 pb-1 text-center",
        "transition-opacity duration-200 ease-out active:scale-[0.97] active:transition-none",
        dim && "opacity-35",
      )}
      data-skill={skill}
      data-state={finalState}
      data-testid={TID.skills.node(skill)}
      data-value={finalStars}
      onClick={() => onSelect(skill)}
      type="button"
    >
      <span className="relative inline-grid shrink-0 place-items-center" style={{ width: tile, height: tile }}>
        {/* the disk: its ring tells the state before any colour does */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full border-2 transition-colors duration-200",
            locked ? "border-dashed border-border-strong bg-surface-2" : "border-border-strong bg-surface",
            !lit && "group-hover:border-fg",
            lit && "border-fg",
          )}
        />
        {/* the ink that lights it */}
        <motion.span
          animate={{ scale: lit ? 1 : 0, opacity: lit ? 1 : 0 }}
          aria-hidden
          className="absolute inset-0 rounded-full bg-solid"
          initial={false}
          transition={{ scale: tween.move, opacity: tween.fast }}
        />
        {/* every star held: the index ring */}
        <motion.span
          animate={{ scale: look === "maxed" ? 1 : 0.85, opacity: look === "maxed" ? 1 : 0 }}
          aria-hidden
          className="absolute -inset-[5px] rounded-full border-2 border-fg"
          initial={false}
          transition={{ scale: spring.pop, opacity: tween.fast }}
        />
        {/* the lock and the icon are both there; the lock gives way to the icon with a 2 px blur (node-unlock) */}
        <motion.span
          animate={locked ? { opacity: 1, filter: "blur(0px)", scale: 1 } : { opacity: 0, filter: "blur(2px)", scale: 0.8 }}
          aria-hidden
          className="absolute inset-0 grid place-items-center text-fg-2"
          initial={false}
          transition={locked ? tween.move : tween.exit}
        >
          <IconLock size={ICON[size] - 2} waypoint="muted" />
        </motion.span>
        <motion.span
          animate={locked ? { opacity: 0, filter: "blur(2px)", scale: 0.8 } : { opacity: 1, filter: "blur(0px)", scale: 1 }}
          aria-hidden
          className={cn("relative grid place-items-center transition-colors duration-300", lit ? "text-on-solid" : "text-fg")}
          initial={false}
          transition={locked ? tween.exit : { ...tween.move, delay: 0.1 }}
        >
          <FieldIcon field={def.field} size={ICON[size]} waypoint="muted" />
        </motion.span>
        {next && !locked ? <NextRing arrive={arriving} size={tile} /> : null}
        {inPath ? (
          <span
            aria-hidden
            className="absolute -top-1.5 -start-2 grid size-[26px] place-items-center rounded-full border-[1.5px] border-fg bg-surface text-fg"
          >
            <IconTarget size={18} strokeWidth={1.9} waypoint="muted" />
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "mt-2 text-balance",
          size === "lg" ? "text-[1.0625rem] leading-[1.4]" : "text-[1rem] leading-[1.35]",
          locked ? "font-medium text-fg-2" : "font-semibold text-fg",
        )}
      >
        <bdi dir="rtl">{def.name}</bdi>
      </span>
      <SkillStars className="mt-1" fresh={seen.fresh} size={size === "lg" ? "md" : "sm"} slots={def.maxStars} value={stars} />
    </button>
  );
}
