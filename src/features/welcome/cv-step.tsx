"use client";
// Owner: welcome. The CV step inside the onboarding chat (docs/ONBOARDING-FLOW.md): the live CV card (the /cv analysis
// show in its compact form, drawn as «دليلك»'s turn), its summary at rest after a reload, and the paste box that replaces
// the tiles when the user chooses «الصق نص سيرتك». The conversation owns the flow; these only draw.
import { motion } from "motion/react";
import { useState, type ReactNode, type RefObject } from "react";

import { Button, SkillStars, cn } from "@/components/ui";
import { CvShow, type Outcome, type ShowRun } from "@/features/cv/cv-show";
import { CV_COPY } from "@/features/cv/copy";
import { cvCardText } from "@/lib/brain/onboarding/cv";
import { LIMITS } from "@/lib/brain/protocol";
import { getSkill } from "@/lib/data";
import { tween } from "@/lib/motion";
import type { CvSkill } from "@/lib/types";

/** The analysis running in the chat right now: the show plays over the real result as it arrives. */
export interface LiveCv {
  /** The thread id the card takes (`o-{n}`), so the live card keeps its element when the store records it. */
  readonly cardId: string;
  readonly bubbleId: string;
  readonly bubble: string;
  readonly travelId?: string;
  readonly run: ShowRun;
  readonly outcome: Outcome | null;
}

/** The live card: the CV show, compact, inside «دليلك»'s turn. */
export function CvLiveCard({ live, onFinished }: { readonly live: LiveCv; readonly onFinished: () => void }): ReactNode {
  return (
    <div className="w-full" data-testid="welcome-cv-card" data-state="live">
      <CvShow compact onFinished={onFinished} outcome={live.outcome} run={live.run} />
    </div>
  );
}

/** The card at rest (a reload, or once the conversation has moved on): the skills found, each with its stars. */
export function CvSummaryCard({ skills }: { readonly skills: readonly CvSkill[] }): ReactNode {
  return (
    <div className="w-full rounded-card border border-border bg-surface/70 px-4 py-3" data-state="done" data-testid="welcome-cv-card" data-value={skills.length}>
      <p className="text-small font-semibold text-fg">{cvCardText(skills.length)}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {skills.map((s) => {
          const skill = getSkill(s.skill);
          return (
            <li className="inline-flex items-center gap-1.5 text-small text-fg" data-skill={s.skill} key={s.skill}>
              <span className="font-semibold" dir="auto">
                {skill.name}
              </span>
              <SkillStars size="sm" slots={skill.maxStars} value={s.stars} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** «الصق نص سيرتك»: the box under the thread (the same 80-character minimum as /cv). */
export function PasteBox({
  onAnalyse,
  onBack,
  inputRef,
}: {
  readonly onAnalyse: (text: string) => void;
  readonly onBack: () => void;
  readonly inputRef?: RefObject<HTMLTextAreaElement | null>;
}): ReactNode {
  const [text, setText] = useState("");
  const length = text.trim().length;
  const ready = length >= LIMITS.cvMinChars;
  return (
    <motion.div animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2" initial={{ opacity: 0, y: 8 }} transition={tween.move}>
      <textarea
        aria-label={CV_COPY.pasteLabel}
        className={cn(
          "min-h-28 w-full resize-none rounded-card border-[1.5px] border-border-strong bg-surface px-4 py-3 text-body text-fg",
          "placeholder:text-fg-3 focus:border-fg focus:outline-none",
        )}
        data-testid="welcome-cv-paste"
        dir="auto"
        maxLength={20_000}
        onChange={(e) => setText(e.target.value)}
        placeholder={CV_COPY.pastePlaceholder}
        ref={inputRef}
        value={text}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button data-testid="welcome-cv-paste-analyse" disabled={!ready} onClick={() => onAnalyse(text)} size="sm">
          {CV_COPY.analyse}
        </Button>
        <Button data-testid="welcome-cv-paste-back" onClick={onBack} size="sm" variant="ghost">
          رجوع
        </Button>
        {length > 0 && !ready ? <span className="text-small text-fg-2">{CV_COPY.pasteShort}</span> : null}
      </div>
    </motion.div>
  );
}
