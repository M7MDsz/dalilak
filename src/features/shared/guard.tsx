"use client";
// Owner: shell. The route guard of spec 2.2, used by `/` (area "signin"), `/welcome` (area "welcome") and the (app)
// layout ("app"). ARCHITECTURE 11.1.
//
// It DECIDES ONCE PER MOUNT, for the URL it was mounted on:
//   1) until useHydrated(): draw only the logo;
//   2) if the URL has ?seed=: applySeed(name) when known, then router.replace(the same URL without seed) (spec 10.3:
//      before any redirect; unknown names are just removed). ?seed= is read from window.location in an effect
//      (useSearchParams would need a Suspense boundary at build time);
//   3) redirect by area (still only the logo while redirecting; a reload never bounces through `/`):
//        signin:  signed in → onboarded ? /path : /welcome
//        welcome: signed out → / · onboarded → /path
//        app:     signed out → / · not onboarded → /welcome
//      ("onboarded" = targetJobId !== null; the rules live in guard-rules.ts, unit-tested);
//   4) otherwise render children, and NEVER redirect again during this mount. Later store changes are made by a screen,
//      and that screen navigates itself (signin after createAccount / resumeAccount / restartAccount, welcome's
//      hand-over, profile after signOut / resetCurrentAccount).
//      One exception: in "welcome" and "app", once no user is signed in any more, render nothing (no logo) until that
//      navigation lands, so children may always assume a signed-in user.
// A client navigation into a new area (welcome → /path) mounts a fresh Guard on a hydrated store: it decides in a
// useState initializer, so the children are on the first frame (no logo flash). A full page load decides in the effect
// that runs once the persisted store has hydrated. React Strict Mode runs that effect twice: a ref keeps it to one
// decision (one applySeed, one router.replace).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LogoMark } from "@/components/brand";
import { selectCurrentUser, useAppStore, useHydrated } from "@/lib/store";

import { hasSeedParam, readSeed, redirectFor, type GuardArea } from "./guard-rules";

export type { GuardArea } from "./guard-rules";

type Decision = "pending" | "redirect" | "show";

/** What a Guard mounted on an already hydrated store decides on its first render (no seed in the URL). */
function firstDecision(area: GuardArea, hydrated: boolean): Decision {
  if (!hydrated || typeof window === "undefined") return "pending";
  if (hasSeedParam(window.location.search)) return "pending";
  return redirectFor(area, selectCurrentUser(useAppStore.getState())) === null ? "show" : "redirect";
}

export function Guard({ area, children }: { readonly area: GuardArea; readonly children: ReactNode }): ReactNode {
  const router = useRouter();
  const hydrated = useHydrated();
  const [decision, setDecision] = useState<Decision>(() => firstDecision(area, hydrated));
  const decided = useRef(false);
  const signedIn = useAppStore((state) => state.currentUserId !== null);

  useEffect(() => {
    if (!hydrated || decided.current) return;
    decided.current = true;
    if (decision === "show") return; // decided on the first render
    if (decision === "redirect") {
      const to = redirectFor(area, selectCurrentUser(useAppStore.getState()));
      if (to !== null) router.replace(to);
      return;
    }
    // A full page load (or a URL with ?seed=): the seed first, then the redirect, on the state it left.
    const request = readSeed(window.location);
    if (request.seed !== null) useAppStore.getState().applySeed(request.seed);
    const to = redirectFor(area, selectCurrentUser(useAppStore.getState()));
    if (to !== null) {
      setDecision("redirect");
      router.replace(to);
      return;
    }
    if (request.present) router.replace(request.cleanUrl, { scroll: false });
    setDecision("show");
  }, [area, decision, hydrated, router]);

  if (decision !== "show") return <GuardLogo />;
  if (area !== "signin" && !signedIn) return null;
  return children;
}

/** Only the logo, while the saved state loads or a redirect is on its way (spec 2.2). It fades in late, so a quick
 *  decision shows plain paper rather than a flash of the mark. */
function GuardLogo(): ReactNode {
  return (
    <div aria-busy="true" className="grid min-h-dvh place-items-center bg-bg text-fg">
      <span className="animate-rise [animation-delay:160ms]">
        <LogoMark size={56} title="دليلك" />
      </span>
    </div>
  );
}
