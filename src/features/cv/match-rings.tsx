"use client";
// Owner: cv. The `match` stage of the show (spec 6.3: «أقارن مهاراتك مع 20 وظيفة…», "job rings appear and fill; the best
// three stay"): every job's ring draws to its match with the skills just found, in ranking order; then the others recede
// and the best three are named. The coral waypoint stays on the best three only (the accent is the user's position and
// next step; seventeen coral dots would be noise).
import { motion } from "motion/react";

import { Ring } from "@/components/motion";
import { cn } from "@/components/ui";
import { getJob } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { group, rise, staggerStep, tween } from "@/lib/motion";
import type { RankedJob } from "@/lib/types";

import { ringDelay } from "./show-plan";

export function MatchRings({ ranked, keep, restored }: { readonly ranked: readonly RankedJob[]; readonly keep: boolean; readonly restored: boolean }) {
  const best = ranked.slice(0, 3);
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] justify-items-center gap-x-1 gap-y-2">
        {ranked.map((job, i) => {
          const top = i < 3;
          return (
            <motion.li
              animate={{ opacity: keep && !top ? 0.2 : 1, scale: 1 }}
              initial={restored ? false : { opacity: 0, scale: 0.85 }}
              key={job.jobId}
              transition={{ opacity: keep ? tween.enter : { ...tween.fast, delay: ringDelay(i, ranked.length) }, scale: tween.fast }}
            >
              <Ring
                className={cn(!top && "[&_.fill-accent]:fill-fg-3")}
                delay={restored ? 0 : ringDelay(i, ranked.length) + 0.05}
                from={restored ? job.match : 0}
                hideNumber={!top}
                size={40}
                value={job.match}
              />
            </motion.li>
          );
        })}
      </ol>
      <motion.ol
        animate={keep ? "show" : "hidden"}
        className="flex min-h-7 flex-wrap items-center gap-x-4 gap-y-1"
        initial={restored ? "show" : "hidden"}
        variants={group(staggerStep(best.length, 0.06))}
      >
        {best.map((job) => (
          <motion.li className="inline-flex items-baseline gap-1.5 text-small" key={job.jobId} variants={rise}>
            <span className="font-semibold text-fg">{getJob(job.jobId).title}</span>
            <span className="text-fg-2 tabular-nums" dir="ltr">
              {formatPercent(job.match)}
            </span>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}
