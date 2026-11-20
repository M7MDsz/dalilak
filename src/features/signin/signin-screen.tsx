"use client";
// Owner: signin. The sign-in page `/` (spec 3.1): two halves on PHYSICAL sides, as Mohammed asked: the form on the
// left, the moving showcase on the right (text in both stays right to left). The form comes first in the DOM (keyboard
// and screen readers meet it first); `lg:flex-row-reverse` puts it on the left in an RTL row, and on a phone
// `flex-col-reverse` puts the showcase band above it (playbook 3.1).
import { PageTransition } from "@/components/motion";

import { Showcase } from "./showcase/showcase";
import { SigninForm } from "./signin-form";

export function SigninScreen() {
  return (
    <PageTransition>
      <main className="flex min-h-dvh flex-col-reverse bg-bg lg:h-dvh lg:flex-row-reverse lg:overflow-hidden">
        <SigninForm className="flex-1 px-gutter pt-6 pb-6 lg:w-[clamp(27rem,38vw,35rem)] lg:flex-none lg:overflow-y-auto lg:px-14 lg:pt-10 lg:pb-8" />
        <div className="relative lg:min-h-0 lg:flex-1">
          <Showcase />
        </div>
      </main>
    </PageTransition>
  );
}
