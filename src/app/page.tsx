// Owner: signin. The sign-in page `/` (spec 3.1). A thin Server Component: the Guard waits for the saved state, applies
// ?seed=, sends a signed-in user on (spec 2.2), and only then renders the screen. Tab title: «دليل» alone (2.2).
import type { Metadata } from "next";

import { SigninScreen } from "@/features/signin";
import { Guard } from "@/features/shared";
import { pageTitle } from "@/lib/routes";

export const metadata: Metadata = { title: { absolute: pageTitle() } };

export default function Page() {
  return (
    <Guard area="signin">
      <SigninScreen />
    </Guard>
  );
}
