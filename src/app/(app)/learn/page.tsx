// Owner: learn. `/learn`, the courses catalogue (spec 3.10). A thin Server Component around the client screen.
import type { Metadata } from "next";

import { LearnScreen } from "@/features/learn";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.learn) } };

export default function LearnPage() {
  return <LearnScreen />;
}
