"use client";
// Owner: skills. The skill panel (spec 3.5): what a skill is, where each of its stars came from, what it needs, the
// next star's guide, and the jobs that require it. A centred dialog from 1024 px, a bottom sheet on phones (spec 2.4),
// opened by the URL (`/skills?skill=powerbi`, so «دليلك» and QA can open it, and the advisor sees which skill is open).
//
// It is the design system's Sheet, rebuilt here (same Base UI Dialog, same classes and transitions) for one reason: the
// spec names a test id for the close control (`skills-panel-close`) and Sheet's close button takes none. See the
// screen's report (contractNotes).
import { Dialog } from "@base-ui/react/dialog";
import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";

import { IconArrowForward, IconCheckCircle, IconClose, IconEvidence, IconJobs, IconLock, IconStarFilled, IconTarget } from "@/components/icons";
import { Button, SkillStars, XpValue, buttonStyles, cn } from "@/components/ui";
import { guideTitle, joinWithAnd, starsOf } from "@/lib/copy";
import { getCourse, getField, getSkill } from "@/lib/data";
import { courseState, courseXp, jobsRequiringSkill, starSources } from "@/lib/engine";
import { courseIdFor } from "@/lib/ids";
import { tween } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { TID } from "@/lib/testids";
import type { CourseId, SkillId, SkillNode as EngineNode, StarMap, StarSource, UserFacts } from "@/lib/types";

import { COPY, fromCourse, jobsLine, lockedLine, nextStarParts, openPrereq, requires } from "./copy";
import { FieldIcon } from "./field-icon";
import { missingPrereqs } from "./model";

/**
 * Consecutive stars with the same source are one row (the CV that proved Excel ★★ is one sentence, drawn once). Stars
 * earned through the skill's guide are one row too: every learning step of a skill opens the same «دليل Power BI».
 */
function groupSources(sources: readonly StarSource[]): { stars: number; source: StarSource }[] {
  const out: { stars: number; source: StarSource }[] = [];
  for (const s of sources) {
    const last = out[out.length - 1];
    const same =
      last !== undefined &&
      last.source.source === s.source &&
      (s.source === "cv" ? last.source.source === "cv" && last.source.evidence === s.evidence : last.source.source === "course" && guideTitle(last.source.courseId) === guideTitle(s.courseId));
    if (same) last.stars += 1;
    else out.push({ stars: 1, source: s });
  }
  return out;
}

/** A small copy of the node's disk, so the panel is visibly about the node that was pressed. */
function MiniDisk({ node }: { node: EngineNode }): ReactNode {
  const lit = node.state === "earned" || node.state === "maxed";
  const locked = node.state === "locked";
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-12 shrink-0 place-items-center rounded-full border-2",
        lit ? "border-fg bg-solid text-on-solid" : locked ? "border-dashed border-border-strong bg-surface-2 text-fg-2" : "border-border-strong bg-surface text-fg",
        node.state === "maxed" && "outline-2 outline-offset-[3px] outline-fg",
      )}
    >
      {locked ? <IconLock size={22} waypoint="muted" /> : <FieldIcon field={getSkill(node.skill).field} size={24} waypoint="muted" />}
    </span>
  );
}

export function SkillPanel({
  skill,
  open,
  node,
  facts,
  stars,
  onClose,
  onPick,
  onStart,
  onJobs,
}: {
  /** The skill to show (kept while the panel closes, so its content does not vanish mid-transition). */
  readonly skill: SkillId | null;
  readonly open: boolean;
  readonly node: EngineNode | null;
  readonly facts: UserFacts;
  /** The user's stars now (for the prerequisites that still lack one). */
  readonly stars: StarMap;
  readonly onClose: () => void;
  /** Select another skill (a prerequisite). */
  readonly onPick: (skill: SkillId) => void;
  readonly onStart: (courseId: CourseId) => void;
  readonly onJobs: (skill: SkillId) => void;
}): ReactNode {
  // Focus lands on the title (read first by a screen reader, no ring on the close button when «دليلك» or a link opens it).
  const titleRef = useRef<HTMLHeadingElement>(null);
  const def = skill ? getSkill(skill) : null;

  let body: ReactNode = null;
  let footer: ReactNode = null;
  if (skill && def && node) {
    const sources = groupSources(starSources(facts, skill));
    const jobs = jobsRequiringSkill(skill).length;
    const nextCourse = node.stars < def.maxStars ? courseIdFor(skill, node.stars + 1) : null;

    body = (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5"
        initial={{ opacity: 0, y: 8 }}
        key={skill}
        transition={tween.move}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SkillStars size="md" slots={def.maxStars} value={node.stars} />
          <span className="text-title text-fg">{starsOf(node.stars, def.maxStars)}</span>
        </div>
        <p className="text-body text-fg-2">{def.description}</p>

        {sources.length > 0 ? (
          <section aria-labelledby="skills-panel-sources" className="flex flex-col gap-2">
            <h3 className="text-small font-semibold text-fg-2" id="skills-panel-sources">
              {COPY.sources}
            </h3>
            <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
              {sources.map((row, i) => (
                <li className="flex items-start gap-3 px-4 py-3" key={i}>
                  <span aria-hidden className="mt-1 inline-flex shrink-0 gap-0.5 text-fg">
                    {Array.from({ length: row.stars }, (_, k) => (
                      <IconStarFilled key={k} size={18} waypoint="off" />
                    ))}
                  </span>
                  {row.source.source === "cv" ? (
                    <p className="min-w-0 flex-1 text-body text-fg">
                      <span className="font-semibold">{COPY.fromCv}</span>{" "}
                      <span className="box-decoration-clone rounded-[3px] bg-mark px-0.5">«{row.source.evidence}»</span>
                    </p>
                  ) : (
                    <p className="min-w-0 flex-1 text-body text-fg">{fromCourse(guideTitle(row.source.courseId))}</p>
                  )}
                  {row.source.source === "cv" ? <IconEvidence className="mt-1 shrink-0 text-fg-3" size={20} waypoint="muted" /> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex flex-col gap-3">
          {def.prereqs.length > 0 ? (
            <p className="text-body text-fg">
              {requires("")}
              {def.prereqs.map((p, i) => (
                <span key={p}>
                  {i > 0 ? (/^[؀-ۿ]/.test(getSkill(p).name) ? " و" : " و ") : null}
                  <button
                    className="trail rounded-tag font-semibold text-fg transition-[background-size] duration-300 [--trail-y:0.1rem] hover:trail-walk"
                    onClick={() => onPick(p)}
                    type="button"
                  >
                    <bdi dir="rtl">{getSkill(p).name}</bdi>
                  </button>
                </span>
              ))}
            </p>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-fg">
            <IconJobs className="shrink-0 text-fg-2" size={22} waypoint="muted" />
            <span>{jobsLine(jobs)}</span>
            <a
              className={buttonStyles({ variant: "ghost", size: "sm" })}
              data-testid={TID.skills.panelJobs}
              href={hrefFor({ screen: "jobs", skill })}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                onJobs(skill);
              }}
            >
              {COPY.showJobs}
            </a>
          </p>
        </div>
      </motion.div>
    );

    if (node.state === "maxed") {
      footer = (
        <p className="flex items-center gap-2 text-title text-fg">
          <IconCheckCircle className="shrink-0 text-ok-fg" size={24} waypoint="off" />
          {COPY.maxed}
        </p>
      );
    } else if (node.state === "locked") {
      const blocking = missingPrereqs(skill, stars);
      const first = node.lockedBy ?? blocking[0] ?? null;
      footer = (
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-body text-fg">
            <IconLock className="mt-1 shrink-0 text-fg-2" size={20} waypoint="muted" />
            <span>{lockedLine(joinWithAnd(blocking.map((p) => getSkill(p).name)))}</span>
          </p>
          {first ? (
            <Button className="w-full" onClick={() => onPick(first)} variant="secondary">
              {openPrereq(getSkill(first).name)}
            </Button>
          ) : null}
        </div>
      );
    } else if (nextCourse) {
      const course = getCourse(nextCourse);
      const started = courseState(nextCourse, facts).state === "started";
      const parts = nextStarParts(guideTitle(nextCourse));
      footer = (
        <div className="flex flex-col gap-3">
          <p className="text-body text-fg">
            {parts.lead}
            <bdi className="whitespace-nowrap" dir="rtl">
              {parts.guide}
            </bdi>
            <span className="whitespace-nowrap">
              {parts.dot}
              <XpValue className="align-[-0.15em]" gain size="sm" value={courseXp(course)} />
            </span>
          </p>
          <Button className="w-full" data-testid={TID.skills.panelStart} icon={<IconArrowForward size={20} />} onClick={() => onStart(nextCourse)} size="lg">
            {started ? COPY.resume : COPY.start}
          </Button>
        </div>
      );
    }
  }

  return (
    <Dialog.Root onOpenChange={(next) => (next ? undefined : onClose())} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-ink/30 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-end overflow-y-auto lg:place-items-center lg:p-6">
          <Dialog.Popup
            className={cn(
              "flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface text-fg outline-none",
              "transition-[opacity,translate] duration-200 ease-out",
              "data-starting-style:translate-y-4 data-starting-style:opacity-0",
              "data-ending-style:translate-y-4 data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in",
              "lg:max-h-[85dvh] lg:w-[520px] lg:rounded-2xl",
            )}
            data-skill={skill ?? undefined}
            data-surface="paper"
            data-testid={TID.skills.panel}
            initialFocus={titleRef}
          >
            {skill && def && node ? (
              <>
                <div className="flex items-start gap-4 px-5 pt-5 pb-4">
                  <MiniDisk node={node} />
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="text-h3 text-fg outline-none" ref={titleRef} tabIndex={-1}>
                      <bdi dir="rtl">{def.name}</bdi>
                    </Dialog.Title>
                    <Dialog.Description className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-fg-2" render={<div />}>
                      <span className="inline-flex items-center gap-1.5">
                        <FieldIcon field={def.field} size={18} waypoint="muted" />
                        {getField(def.field).name}
                      </span>
                      {node.inPath ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border-strong px-2.5 py-0.5 font-semibold text-fg">
                          <IconTarget size={16} strokeWidth={2.25} waypoint="muted" />
                          {COPY.inPath}
                        </span>
                      ) : null}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    aria-label={COPY.close}
                    className="-me-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:bg-surface-2 hover:text-fg active:scale-[0.97] active:transition-none"
                    data-testid={TID.skills.panelClose}
                  >
                    <IconClose size={22} waypoint="off" />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{body}</div>
                {footer ? <div className="border-t border-border px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
              </>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
