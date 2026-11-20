"use client";
// Owner: jobs. One job on the board of `/jobs` (spec 3.7 "Job card"; docs/GAME-LAYER.md 5.3): a destination you unlock.
// The game layer's DestinationCard carries every part of the spec's card: the title, «{company} · {city}» with «جهة
// تجريبية», the experience label, the match ring (the one number, P5), and the gap («ينقصك») as up to three locked gems
// under a five-segment unlock meter (each segment = one requirement's 20 points, spec 7.2). The reward for applying is
// on the card: +40 XP, open from 60%, locked under it (spec 8.1). Flags: the target is the board's one accent piece
// («هدفك», the coral key, featured at the top); an application lies flat with «قدّمت» and its status.
// The whole card is one link (the route transition plays) and sinks onto its plinth when pressed.
// Arriving with stars the board has not shown yet (`ring-count`): the ring counts from what the user last saw, and a job
// that stood at 0% last time (no star in any of its five skills, so every segment was empty: exact, not a guess) fills
// its meter segment by segment from empty, in counted steps, while the ring counts.
import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import { DestinationCard } from "@/components/game";
import { APPLICATION_STATUS_COPY } from "@/lib/copy";
import { getJob, getJobCity } from "@/lib/data";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { ApplicationStatus, RankedJob, StarMap } from "@/lib/types";

import { LIST_COPY } from "./copy";
import { FieldIcon, RouteLink, TargetFlag, experienceText, jobRequirements } from "./parts";

export interface JobCardApplied {
  readonly status: ApplicationStatus;
  /** XP the application paid (40 at 60% or more, else 0). */
  readonly xp: number;
}

export function JobCard({
  row,
  stars,
  from,
  applied,
  featured = false,
}: {
  row: RankedJob;
  stars: StarMap;
  /** What the ring showed last visit (ring-count); the current match when nothing moved. */
  from: number;
  applied: JobCardApplied | null;
  /** The target at the top of the board: the bigger ring, the five skills written under the meter. */
  featured?: boolean;
}): ReactNode {
  const job = getJob(row.jobId);
  const status = applied ? `${APPLICATION_STATUS_COPY[applied.status].label} · محاكاة` : null;
  const requirements = useMemo(() => jobRequirements(row.jobId, stars), [row.jobId, stars]);
  // committed empty once, then (before the first paint) the real stars: the meter's segments grow, so they fill in steps
  const [fromEmpty, setFromEmpty] = useState(() => from === 0 && row.match > 0);
  useLayoutEffect(() => {
    setFromEmpty(false);
  }, []);
  const skills = useMemo(
    () => (fromEmpty ? requirements.map((r) => ({ ...r, have: 0 })) : requirements),
    [fromEmpty, requirements],
  );
  return (
    <DestinationCard
      // a job that is not your destination does not carry the waypoint: its ring ends in ink (DESIGN 3.1)
      data-ring-dot={row.isTarget ? undefined : "muted"}
      applied={
        applied && status
          ? {
              xp: applied.xp,
              // the target you already applied to keeps its «هدفك» beside the status (spec 3.7: both flags)
              status: row.isTarget ? (
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <TargetFlag label={LIST_COPY.flagTarget} />
                  <span>{status}</span>
                </span>
              ) : (
                status
              ),
            }
          : undefined
      }
      city={getJobCity(job.city).name}
      className="h-full"
      company={job.company}
      experience={experienceText(job.band)}
      featured={featured}
      icon={<FieldIcon field={job.field} size={featured ? 26 : 22} />}
      match={row.match}
      matchFrom={from}
      matchTestId={TID.jobs.match(row.jobId)}
      render={<RouteLink href={hrefFor({ screen: "job", jobId: row.jobId })} />}
      skills={skills}
      target={row.isTarget}
      testId={TID.jobs.card(row.jobId)}
      title={job.title}
    />
  );
}
