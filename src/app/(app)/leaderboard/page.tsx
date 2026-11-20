// Owner: leaderboard. `/leaderboard` (spec 3.12). A thin Server Component: the title, then the one client screen, whose
// outermost element is <PageTransition>.
import type { Metadata } from "next";

import { LeaderboardScreen } from "@/features/leaderboard";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.leaderboard) } };

export default function LeaderboardPage() {
  return <LeaderboardScreen />;
}
