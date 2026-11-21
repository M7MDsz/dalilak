"use client";
// Owner: welcome. /welcome: «دليلك» gets to know the user (phase 1), then the path-reveal show (phase 2) ends on the named
// path and the result forms around it (phase 3), and a choice hands the path over to the map (spec 3.2, 3.3, 4).
// The screen owns what lasts across the phases: the paper and its contours, the night stage that falls over it for the
// show (the same hill, by night), and the top bar with the logo (it stays while the phases change under it).
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

import { Logo, LogoMark } from "@/components/brand";
import { StepTrail } from "@/components/game";
import { PageTransition, Roll, useInstant } from "@/components/motion";
import { ContourBackdrop, Stage } from "@/components/ui";
import { stepNumber, stepsFor } from "@/lib/brain/onboarding";
import { ASKED_STEP_IDS } from "@/lib/ids";
import { formatNumber } from "@/lib/format";
import { tween } from "@/lib/motion";
import { useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { UserState } from "@/lib/types";
import { useKeyboardViewport, useViewport } from "@/features/shared";

import { Conversation, pendingOf, type AnswerRects } from "./conversation";
import { CHAT_COPY } from "./copy";
import { RevealFlow } from "./reveal";

type Phase = { readonly kind: "chat" } | { readonly kind: "reveal"; readonly rects: AnswerRects | null; readonly startOnResult: boolean };

/** Where a visit starts: the conversation, or (all seven answered) the show, or (it reached step 6) the result. */
function initialPhase(user: UserState): Phase {
  const complete = user.onboardingCompletedAt !== null && pendingOf(user) === null && user.onboarding.thread.length > 0;
  if (!complete) return { kind: "chat" };
  return { kind: "reveal", rects: null, startOnResult: user.onboarding.revealPlayed };
}

/** The contours of the paper and of the night are one hill (same seed, same summit): when the night lifts, it is the same place by day. */
const HILL = { seed: 23, rings: 15, summit: { x: 0.5, y: 0.08 } } as const;

export function WelcomeScreen() {
  const user = useCurrentUser();
  if (!user) return null; // the Guard renders nothing once signed out; this only satisfies the types
  return <WelcomeFlow user={user} />;
}

function WelcomeFlow({ user }: { user: UserState }) {
  const instant = useInstant();
  const { desktop } = useViewport();
  // phones: track the visible area while the keyboard is up, so it never covers the chat composer (phone agent, 21 Nov)
  useKeyboardViewport(!desktop);
  const [phase, setPhase] = useState<Phase>(() => initialPhase(user));
  const [night, setNight] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const onNight = useCallback((value: boolean) => setNight(value), []);
  const onLeaving = useCallback(() => setLeaving(true), []);

  // before «دليلك» has greeted, nothing is pending yet (pendingStep is null on an empty thread): show step 1 with every
  // stop still ahead, not «7 من 7» all ticked rolling down to 1 (tester, 21 Nov 2026)
  const pending = user.onboarding.thread.length === 0 ? ASKED_STEP_IDS[0] : pendingOf(user);
  // while the CV card reads, the counter keeps the number it had before it (the conversation holds it until «خلصت…»)
  const [heldStep, setHeldStep] = useState<number | null>(null);
  // 21 Nov 2026: counted over the steps that apply (seven with «مجالك» after «أتطوّر» / «أغيّر», else six)
  const steps = stepsFor(user.answers);
  const step = heldStep ?? (pending ? stepNumber(user.answers) : steps.length);

  return (
    <PageTransition>
      <div className="relative isolate min-h-dvh bg-paper text-fg" data-surface={night ? "stage" : "paper"}>
        {/* the paper's contours (always there, under everything) */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-20" data-surface="paper">
          <ContourBackdrop intensity="faint" rings={HILL.rings} seed={HILL.seed} summit={HILL.summit} />
        </div>
        {/* the night stage: falls for the show, lifts in its last step */}
        <motion.div
          animate={{ opacity: night ? 1 : 0 }}
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          initial={false}
          transition={{ duration: night ? 0.42 : 0.5, ease: [0.65, 0, 0.35, 1] }}
        >
          <Stage className="size-full" contour="quiet" contourSummit={HILL.summit} />
        </motion.div>

        {/* the top bar: the logo stays while the phases change under it; the step indicator belongs to the conversation */}
        <motion.header
          animate={{ opacity: leaving ? 0 : 1 }}
          className="relative z-30 mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between gap-4 px-gutter lg:h-[72px]"
          initial={false}
          transition={tween.exit}
        >
          <span className="text-fg transition-colors duration-500">{desktop ? <Logo size={30} /> : <LogoMark size={30} title="دليل" />}</span>
          <AnimatePresence initial={false}>
            {phase.kind === "chat" ? (
              <motion.div className="flex min-w-0 justify-end" exit={{ opacity: 0, transition: tween.exit }} key="step">
                {/* step-tick (GAME-LAYER 5.7): the six questions as a trail of six stops, solid behind, the waypoint where
                    you are, dotted ahead; the current stop pops when it moves and the number rolls. A phone shows the
                    words only: the slot row under the bar is already the six-stop trail there. */}
                <StepTrail
                  className={desktop ? "w-[22rem]" : "[&>ol]:hidden"}
                  current={pending || heldStep !== null ? step : step + 1}
                  label={
                    <span className="inline-flex items-center gap-1.5 text-fg-2">
                      <span>{CHAT_COPY.stepBefore}</span>
                      <Roll id={step}>
                        <span className="tabular-nums text-fg" dir="ltr">
                          {formatNumber(step)}
                        </span>
                      </Roll>
                      {/* «من 6» / «من 7»: the steps that apply (CHAT_COPY.stepAfter is the fixed «من 7») */}
                      <span>من {formatNumber(steps.length)}</span>
                    </span>
                  }
                  testId={TID.welcome.step}
                  total={steps.length}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.header>

        {/* popLayout (the reveal agent's hand-off, 21 Nov 2026): the reveal mounts in the same frame the chat starts its
            150 ms fade, so no empty paper frame shows between them */}
        <AnimatePresence initial={false} mode="popLayout">
          {phase.kind === "chat" ? (
            <motion.div className="relative z-10" exit={{ opacity: 0, transition: tween.exit }} key="chat">
              <Conversation onDone={(rects) => setPhase({ kind: "reveal", rects, startOnResult: instant })} onStepHold={setHeldStep} user={user} />
            </motion.div>
          ) : (
            <motion.div className="relative z-10" key="reveal">
              <RevealFlow onLeaving={onLeaving} onNight={onNight} rects={phase.rects} startOnResult={phase.startOnResult} user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
