// Owner: cv. /cv: CV upload, the analysis show, the results and the matched jobs (spec 3.6, 6). A thin Server Component;
// the screen is a client component whose outermost element is <PageTransition>.
import type { Metadata } from "next";

import { CvScreen } from "@/features/cv";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.cv) } };

export default function CvPage() {
  return <CvScreen />;
}
