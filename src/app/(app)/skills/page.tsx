// Owner: skills. `/skills`, the skill tree (spec 3.5). A thin Server Component: the tab title (spec 2.2) and the client
// screen, under Suspense because it reads `?skill=` (useSearchParams, STACK-NOTES 1.3).
import type { Metadata } from "next";
import { Suspense } from "react";

import { SkillsScreen } from "@/features/skills";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.skills) } };

export default function SkillsPage() {
  return (
    <Suspense fallback={null}>
      <SkillsScreen />
    </Suspense>
  );
}
