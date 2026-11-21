"use client";
// Owner: profile. «معلوماتي» (spec 3.13): the six onboarding answers as they print everywhere (copy answerText; neutral
// answers per 4.3) and «الوظيفة المستهدفة» with the link «غيّر الهدف» (the jobs list, where any job can become the target
// through «اجعلها هدفي»). And «عن هذا العرض»: the honest paragraph, plus one sentence when an AI key is configured.
import { pathTitleOf } from "@/lib/engine";
import type { ReactNode } from "react";

import { IconArrowForward } from "@/components/icons";
import { NavLink } from "@/components/motion";
import { buttonStyles } from "@/components/ui";
import { NEUTRAL_PRINT, answerText } from "@/lib/copy";
import { getJob, optionLabel } from "@/lib/data";
import { hrefFor } from "@/lib/routes";
import { useBrainStatus } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { QuestionId, UserState } from "@/lib/types";

import { CompanyRow } from "./company";
import { PROFILE_COPY } from "./copy";
import { Section } from "./section";

const QUESTIONS: readonly QuestionId[] = ["city", "education", "major", "experience", "interest", "priority"];

/** What an unanswered question prints (spec 4.3 neutral table); an onboarded account has all six, so this is a guard. */
function neutralPrint(question: QuestionId): string {
  switch (question) {
    case "city":
      return NEUTRAL_PRINT.city;
    case "education":
      return NEUTRAL_PRINT.education;
    case "major":
      return NEUTRAL_PRINT.major;
    case "experience":
      return optionLabel("experience", "none") ?? "";
    case "interest":
      return optionLabel("interest", "unsure") ?? "";
    case "priority":
      return optionLabel("priority", "explore") ?? "";
  }
}

export function AnswersSection({ user, className }: { readonly user: UserState; readonly className?: string }): ReactNode {
  const target = user.targetJobId ? getJob(user.targetJobId) : null;
  return (
    <Section className={className} headingId="profile-answers" title={PROFILE_COPY.answers}>
      <dl className="-my-1 grid grid-cols-1 gap-x-10 @min-[640px]/content:grid-cols-2" data-testid={TID.profile.answers}>
        {QUESTIONS.map((question) => (
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-3" key={question}>
            <dt className="shrink-0 text-small text-fg-2">{PROFILE_COPY.answerLabels[question]}</dt>
            <dd className="min-w-0 text-end text-body font-medium text-fg">{answerText(user.answers, question) ?? neutralPrint(question)}</dd>
          </div>
        ))}
        {/* «مجال شغلك» (21 Nov 2026): only when the user told it (after «أتطوّر» / «أغيّر») */}
        {user.answers.current ? (
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt className="shrink-0 text-small text-fg-2">{PROFILE_COPY.current}</dt>
            <dd className="min-w-0 text-end text-body font-medium text-fg">
              {user.answers.current.label}
              {/* its specialisation, when told (grow) and not the same words */}
              {user.answers.currentTrack && user.answers.currentTrack.value !== "other" && user.answers.currentTrack.label !== user.answers.current.label
                ? ` · ${user.answers.currentTrack.label}`
                : null}
            </dd>
          </div>
        ) : null}
        {/* «الشركة اللي في بالك» (onboarding step 7, 20 Nov 2026): across both columns, with change and clear */}
        <CompanyRow user={user} />
        {/* the target job, across both columns, with the way to change it */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 @min-[640px]/content:col-span-2">
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4 @min-[640px]/content:justify-start">
            <dt className="shrink-0 text-small text-fg-2">{PROFILE_COPY.target}</dt>
            <dd className="min-w-0 text-end text-body font-semibold text-fg @min-[640px]/content:text-start">{target ? pathTitleOf(target.id) : "—"}</dd>
          </div>
          <dd className="flex w-full justify-end @min-[640px]/content:w-auto">
            <NavLink className={buttonStyles({ variant: "ghost", size: "sm" })} data-testid={TID.profile.changeTarget} href={hrefFor({ screen: "jobs" })}>
              {PROFILE_COPY.changeTarget}
              <IconArrowForward size={18} />
            </NavLink>
          </dd>
        </div>
      </dl>
    </Section>
  );
}

export function AboutSection({ className }: { readonly className?: string }): ReactNode {
  const brain = useBrainStatus();
  return (
    <Section className={className} headingId="profile-about" title={PROFILE_COPY.about}>
      <p className="max-w-2xl text-body text-fg-2">
        {PROFILE_COPY.aboutText}
        {brain?.configured ? ` ${PROFILE_COPY.aboutModel}` : null}
      </p>
    </Section>
  );
}
