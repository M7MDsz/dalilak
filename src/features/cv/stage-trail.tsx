"use client";
// Owner: cv. The show's progress as Darb draws progress: solid line, waypoint, dotted line (DESIGN.md 1.3). The solid part
// is drawn at one steady pace through the six stages of 6.3 (each stage's share of the line is its share of the 7.0 s),
// and the waypoint rides its head. Transform only. Arabic only: the inline-start is the right (motion's originX and x are
// physical, playbook 1.7).
import { motion } from "motion/react";

import { CV_SHOW_STAGES } from "@/lib/data";

const TOTAL = CV_SHOW_STAGES.reduce((sum, s) => sum + s.ms, 0);
const ENDS = CV_SHOW_STAGES.map((_, i) => CV_SHOW_STAGES.slice(0, i + 1).reduce((sum, s) => sum + s.ms, 0) / TOTAL);

export function StageTrail({ index, done }: { readonly index: number; readonly done: boolean }) {
  const to = done ? 1 : (ENDS[index] ?? 1);
  const ms = done ? 200 : (CV_SHOW_STAGES[index]?.ms ?? 600);
  const transition = { duration: ms / 1000, ease: "linear" } as const;
  return (
    <div aria-hidden className="relative h-3 w-full">
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-border-strong" />
      <motion.span
        animate={{ scaleX: to }}
        className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-fg"
        initial={{ scaleX: 0 }}
        style={{ originX: 1 }}
        transition={transition}
      />
      <motion.span animate={{ x: `${-to * 100}%` }} className="absolute inset-0" initial={{ x: "0%" }} transition={transition}>
        <span className="absolute start-0 top-1/2 -ms-1.5 size-3 -translate-y-1/2 rounded-full border-2 border-fg bg-bg" />
      </motion.span>
    </div>
  );
}
