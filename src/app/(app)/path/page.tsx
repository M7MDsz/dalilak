// Owner: map. /path, the roadmap page «مساري» (spec 3.4): a thin Server Component around the one client screen.
import type { Metadata } from "next";

import { MapScreen } from "@/features/map";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.path) } };

export default function PathPage() {
  return <MapScreen />;
}
