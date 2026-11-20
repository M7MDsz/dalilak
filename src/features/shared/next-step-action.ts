"use client";
// Owner: shell. The ONE way to perform the next step (spec 2.8), used by the pill, the map card, the course page, the
// celebration («الخطوة التالية»), the leaderboard card and the advisor's next-step card:
// rule 1 → go(/cv) · rule 2 → go(/learn/{id}) · rule 3 → store.startCourse(id), the toast «بدأت الدورة. بالتوفيق.»
// (spec 3.11), then go(/learn/{id}) («ابدأ الدورة» opens it already started) · rule 4 → go(/jobs/{id}) · rule 5 →
// go(/jobs). Where each step goes is the engine's `nextStepTarget`; navigation goes through useGo() (playbook 1.5).
import { useCallback } from "react";

import { useGo } from "@/components/motion";
import { toast } from "@/components/ui";
import { TOAST_COPY } from "@/lib/copy";
import { nextStepTarget } from "@/lib/engine";
import { hrefFor } from "@/lib/routes";
import { useAppStore } from "@/lib/store";
import type { NextStep } from "@/lib/types";

export function useNextStepAction(): (step: NextStep) => void {
  const go = useGo();
  return useCallback(
    (step: NextStep) => {
      if (step.rule === 3) {
        const result = useAppStore.getState().startCourse(step.courseId);
        // Refused (locked, credited, completed) cannot happen for the roadmap's current stage; the course page then
        // shows the course as it is, so the press still opens it.
        if (result.ok && !result.already) toast({ title: TOAST_COPY.courseStarted, tone: "ok" });
      }
      go(hrefFor(nextStepTarget(step)));
    },
    [go],
  );
}
