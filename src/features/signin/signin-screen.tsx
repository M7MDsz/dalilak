"use client";
// Owner: signin. The sign-in page `/` (spec 3.1): two halves, the name form on the RIGHT, where an Arabic reader starts,
// and the moving showcase on the left (20 Nov 2026, Mohammed's ask; it used to be the other way round). The form comes
// first in the DOM (keyboard and screen readers meet it first), so a plain RTL row (`lg:flex-row`) puts it on the right,
// and on a phone the plain column (`flex-col`) puts the name box first, with the showcase band under it.
import { PageTransition } from "@/components/motion";

import { Showcase } from "./showcase/showcase";
import { SigninForm } from "./signin-form";

export function SigninScreen() {
  return (
    <PageTransition>
      <main className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:flex-row lg:overflow-hidden">
        <SigninForm className="flex-1 px-gutter pt-6 pb-6 lg:w-[clamp(27rem,38vw,35rem)] lg:flex-none lg:overflow-y-auto lg:px-14 lg:pt-10 lg:pb-8" />
        <div className="relative lg:min-h-0 lg:flex-1">
          <Showcase />
        </div>
      </main>
    </PageTransition>
  );
}
