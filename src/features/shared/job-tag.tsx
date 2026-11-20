"use client";
// Owner: jobs (shared by every screen that draws a job). The honest mark beside a job's company (20 Nov 2026): the one
// practice job carries the dashed «وظيفة تدريبية» tag (it replaced «جهة تجريبية»); a real posting carries the company's
// own name, the site it was posted on and «جُمعت في 20 نوفمبر», quietly.
import type { ReactNode } from "react";

import { SampleTag, cn } from "@/components/ui";
import { JOB_SOURCE_COPY, dayKeyText } from "@/lib/copy";
import { getJob } from "@/lib/data";
import { companyLogo } from "@/lib/data/company-logos";
import type { JobId } from "@/lib/types";

/** «صفحة وظائف سلة (Workable)» → «Workable»: the platform, for small places. */
export function jobSiteShort(site: string): string {
  const inBrackets = /\(([^)]+)\)\s*$/.exec(site);
  return inBrackets?.[1] ?? site;
}

export function JobTag({ jobId, className }: { readonly jobId: JobId; readonly className?: string }): ReactNode {
  const job = getJob(jobId);
  if (!job.real || !job.source) return <SampleTag className={className} kind="practice" />;
  return (
    <span
      className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-fg-3", className)}
      data-real="true"
      data-testid="job-source-tag"
    >
      {job.companyEn ? (
        <>
          <bdi dir="ltr">{job.companyEn}</bdi>
          <span aria-hidden>·</span>
        </>
      ) : null}
      <bdi>{jobSiteShort(job.source.site)}</bdi>
      <span aria-hidden>·</span>
      <span>{JOB_SOURCE_COPY.collected(dayKeyText(job.source.checkedAt, false))}</span>
    </span>
  );
}

/**
 * The employer's logo (public/logos, downloaded from each company's own site on 20 Nov 2026: src/lib/data/company-logos.ts),
 * small and contained on white with rounded corners; a company without one gets a neat monogram (its first letter).
 */
export function CompanyLogo({
  jobId,
  size = 44,
  className,
}: {
  readonly jobId: JobId;
  readonly size?: number;
  readonly className?: string;
}): ReactNode {
  const job = getJob(jobId);
  const src = (job.companyEn ? companyLogo(job.companyEn) : null) ?? companyLogo(job.company);
  const box = { width: size, height: size } as const;
  if (src) {
    return (
      <span
        className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-control border border-border bg-white p-1.5", className)}
        data-testid="company-logo"
        style={box}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local, already small file; no optimiser needed offline */}
        <img alt={job.companyEn ?? job.company} className="max-h-full max-w-full object-contain" decoding="async" src={src} />
      </span>
    );
  }
  const letter = (job.companyEn ?? job.company).trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-control border border-border-strong bg-surface font-semibold text-fg-2",
        className,
      )}
      data-testid="company-monogram"
      style={{ ...box, fontSize: Math.round(size * 0.42) }}
    >
      {letter}
    </span>
  );
}
