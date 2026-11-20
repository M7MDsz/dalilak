// Owner: applications. `/applications` (spec 3.9): a thin Server Component that renders the client screen.
import type { Metadata } from "next";

import { ApplicationsScreen } from "@/features/applications";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.applications) } };

export default function ApplicationsPage() {
  return <ApplicationsScreen />;
}
