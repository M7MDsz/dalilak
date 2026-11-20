// Owner: shell. The layout of every app-shell route (spec 2.1: /path, /skills, /cv, /jobs, /jobs/[id], /applications,
// /learn, /learn/[id], /leaderboard, /profile). A thin Server Component: the Guard waits for the saved state, applies
// ?seed=, redirects once per mount (spec 2.2), and only then renders the shell around the page.
// Tab titles «دليلك · {page}» (spec 2.2) are set by each page: `metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.x) } }`
// (or a plain `title: "…"`, which the root layout's template turns into «دليلك · …»). This layout exports no metadata,
// so the root's default («دليلك») and template stay in force for every page below it.
import type { ReactNode } from "react";

import { Guard } from "@/features/shared";
import { AppShell } from "@/features/shell";

export default function AppLayout({ children }: { readonly children: ReactNode }) {
  return (
    <Guard area="app">
      <AppShell>{children}</AppShell>
    </Guard>
  );
}
