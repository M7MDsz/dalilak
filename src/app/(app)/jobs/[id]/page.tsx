// Owner: jobs. `/jobs/[id]`, the job page with the gap and the apply sheet (spec 3.8). A thin Server Component: the tab
// title is the job title (spec 2.2: «دليل · {job title}»); an unknown id renders the shell's not-found block (in the
// screen). The screen reads `?apply=1` with useSearchParams(), so it sits under <Suspense> (STACK 1.3).
import type { Metadata } from "next";
import { Suspense } from "react";

import { JobScreen } from "@/features/jobs";
import { getJob } from "@/lib/data";
import { PAGE_HEADINGS, asJobId, pageTitle } from "@/lib/routes";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const jobId = asJobId(id);
  return {
    title: {
      absolute: pageTitle(jobId ? getJob(jobId).title : PAGE_HEADINGS.jobs),
    },
  };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <JobScreen id={id} key={id} />
    </Suspense>
  );
}
