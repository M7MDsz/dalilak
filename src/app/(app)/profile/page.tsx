// Owner: profile. `/profile` (spec 3.13): a thin Server Component that renders the client screen.
import type { Metadata } from "next";

import { ProfileScreen } from "@/features/profile";
import { PAGE_HEADINGS, pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.profile) } };

export default function ProfilePage() {
  return <ProfileScreen />;
}
