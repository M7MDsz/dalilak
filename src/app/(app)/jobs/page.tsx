// Owner: jobs. `/jobs` (spec 3.7): a thin Server Component that renders the client screen. The screen reads the filters
// from the URL with useSearchParams(), so it sits under <Suspense> (STACK 1.3).
import type { Metadata } from "next";
import { Suspense } from "react";

import { JobsScreen } from "@/features/jobs";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = {
  title: { absolute: pageTitle(PAGE_HEADINGS.jobs) },
};

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsScreen />
    </Suspense>
  );
}
