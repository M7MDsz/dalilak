// /welcome: the onboarding conversation with «دليل», the path-reveal show and its result (spec 3.2, 3.3, 4).
// A thin server page: the Guard decides (signed out → /, onboarded → /path), the screen is a client component.
import type { Metadata } from "next";

import { Guard } from "@/features/shared";
import { WelcomeScreen } from "@/features/welcome/welcome-screen";
import { pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle() } };

export default function WelcomePage() {
  return (
    <Guard area="welcome">
      <WelcomeScreen />
    </Guard>
  );
}
