"use client";
// Owner: learn. The next-step card under a completed course (spec 3.11 → the five forms of 3.4, by rule of 2.8). It is
// the user's next action, so its label carries the accent waypoint and its button is the page's one primary. Performing
// goes through the shared useNextStepAction (rule 3 starts the step, shows «بدأت هذه الخطوة. بالتوفيق.» and opens its guide).
// The map builds its own card from the same table; screens do not import each other.
import type { ReactNode } from "react";

import { IconArrowForward, IconTarget } from "@/components/icons";
import { useGo } from "@/components/motion";
import { Button, Card, XpValue } from "@/components/ui";
import { useNextStepAction } from "@/features/shared";
import { ASK_ADVISOR_APPLY_TEXT, guideTitle, stepName } from "@/lib/copy";
import { getJob } from "@/lib/data";
import { hrefFor } from "@/lib/routes";
import { useAppStore, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { NextStep } from "@/lib/types";

import { Ltr } from "./bidi";
import { NEXT_CARD_COPY, raisesTo, rule2Body, rule3Course, rule4Body } from "./copy";

export function NextStepCard({ step, className }: { readonly step: NextStep; readonly className?: string }): ReactNode {
  const perform = useNextStepAction();
  const go = useGo();
  const busy = useUi((s) => s.advisorBusy);
  const primary = (label: string, onClick = () => perform(step), disabled = false) => (
    <Button data-testid={TID.course.nextStep} disabled={disabled} icon={<IconArrowForward size={20} />} onClick={onClick}>
      {label}
    </Button>
  );

  let title: string;
  let body: ReactNode;
  let actions: ReactNode;
  switch (step.rule) {
    case 1:
      title = NEXT_CARD_COPY.rule1.title;
      body = NEXT_CARD_COPY.rule1.body;
      actions = (
        <>
          {primary(NEXT_CARD_COPY.rule1.button)}
          <Button onClick={() => useAppStore.getState().skipCv()} size="sm" variant="ghost">
            {NEXT_CARD_COPY.rule1.text}
          </Button>
        </>
      );
      break;
    case 2: {
      title = NEXT_CARD_COPY.rule2.title;
      body = rule2Body(stepName(step.courseId));
      actions = primary(NEXT_CARD_COPY.rule2.button);
      break;
    }
    case 3: {
      title = NEXT_CARD_COPY.rule3.title;
      // «دليل Power BI» · +200 XP · ترفع مطابقتك إلى 90%»: the guide on its line, then its facts,
      // each with its mark (so no line of a wrapped row starts or ends with a lone «·»)
      body = (
        <span className="flex flex-col gap-1.5">
          <span className="text-body font-medium text-fg">{rule3Course(guideTitle(step.courseId))}</span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <XpValue gain size="sm" value={step.xp} />
            {step.prep ? null : (
              <span className="inline-flex items-center gap-1.5">
                <IconTarget className="text-fg-3" size={18} waypoint="off" />
                <span>
                  <Ltr text={raisesTo(step.matchAfter)} />
                </span>
              </span>
            )}
          </span>
        </span>
      );
      actions = primary(NEXT_CARD_COPY.rule3.button);
      break;
    }
    case 4: {
      const job = getJob(step.jobId);
      title = NEXT_CARD_COPY.rule4.title;
      body = <Ltr text={rule4Body(job.title)} />;
      actions = (
        <>
          {primary(NEXT_CARD_COPY.rule4.button, () => useUi.getState().askAdvisor({ text: ASK_ADVISOR_APPLY_TEXT, chip: { intent: "apply", jobId: step.jobId } }), busy)}
          <Button onClick={() => go(hrefFor({ screen: "job", jobId: step.jobId, apply: true }))} size="sm" variant="ghost">
            {NEXT_CARD_COPY.rule4.text}
          </Button>
        </>
      );
      break;
    }
    case 5:
      title = NEXT_CARD_COPY.rule5.title;
      body = NEXT_CARD_COPY.rule5.body;
      actions = primary(NEXT_CARD_COPY.rule5.button);
      break;
  }

  return (
    <Card className={className} dot="accent" label={NEXT_CARD_COPY.label}>
      <h3 className="text-h3 text-fg">{title}</h3>
      <div className="mt-1 text-small text-fg-2">{body}</div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div>
    </Card>
  );
}

