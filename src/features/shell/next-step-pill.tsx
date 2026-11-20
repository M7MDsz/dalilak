"use client";
// Owner: shell. The next-step pill of spec 2.3 / 2.8 in the desktop top bar: «الخطوة التالية: {label}» (`shell-next-step`).
// It performs the step through the shared useNextStepAction (rule 3 starts the course and opens it), and it is hidden on
// the page it would open. It IS the user's next action, so its waypoint is the accent (data-wp-live). When the step
// changes, the label rolls (playbook 3.13).
//
// It never cuts its text (QA, 18 Nov: beside the docked panel it read «ابدأ دورة «الإحصاء التطبيقي لل», or «أساسيات
// wer BI»). The pill measures the room its slot has and shows the largest form that fits WHOLE:
//   full     «الخطوة التالية: ابدأ دورة «الإحصاء التطبيقي للمحللين»»
//   label    «ابدأ دورة «الإحصاء التطبيقي للمحللين»» (the prefix dropped on purpose)
//   compact  «الخطوة التالية» and the arrow (the full sentence stays in its title and accessible name)
//   hidden   when not even that fits.
// The room is read from the slot, which an invisible zero-height probe of the full form holds open to the full width
// whenever the bar can afford it, so switching form never changes the room it was measured in (no flip-flop). The
// probes draw their text with CSS `content`, so a text search on the page never finds them. The course or job name
// sits in its own <bdi> between the guillemets, so a Latin name («أساسيات Power BI») is never reordered.
// While the level-up is open it stands in the pill's place beside the user chip (level-up.tsx), so the pill steps
// aside (fades out, takes no presses) and comes back when it closes.
import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { IconArrowForward } from "@/components/icons";
import { Roll } from "@/components/motion";
import { cn, press } from "@/components/ui";
import { nextStepLabel } from "@/lib/copy";
import { nextStep, nextStepTarget } from "@/lib/engine";
import { hrefFor, ROUTE_PATHS } from "@/lib/routes";
import { useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";

import { useNextStepAction } from "@/features/shared";

import { isOnPage } from "./nav";

type PillFit = "full" | "label" | "compact" | "hidden";

const PREFIX = "الخطوة التالية";

/** The pill's box, shared by the button and its probes so they measure the same. */
const BOX = "inline-flex h-11 items-center gap-2.5 rounded-full border ps-3.5 pe-3";
const TEXT_ROW = "flex min-w-0 items-center gap-1.5 text-small whitespace-nowrap";
const PROBE_TEXT = "before:content-[attr(data-t)]";

/** «ابدأ دورة «الإحصاء التطبيقي للمحللين»» → the verb and the quoted name (null when the label quotes nothing). */
function splitLabel(label: string): { readonly verb: string; readonly name: string | null } {
  const open = label.indexOf("«");
  if (open < 0 || !label.endsWith("»")) return { verb: label, name: null };
  return { verb: label.slice(0, open).trimEnd(), name: label.slice(open + 1, -1) };
}

export function NextStepPill({ className }: { readonly className?: string }): ReactNode {
  const user = useCurrentUser();
  const pathname = usePathname();
  const perform = useNextStepAction();
  const step = useMemo(() => (user === null ? null : nextStep(user)), [user]);
  const label = step === null ? null : nextStepLabel(step);
  const { slot, probes, fit } = usePillFit(label);
  const levelUpOpen = useUi((state) => state.blocking === "levelup");
  if (step === null || label === null) return null;
  const href = hrefFor(nextStepTarget(step));
  // Hidden on the page it would open, and on the map, whose own next-step card already carries the same action (lead, 18 Nov).
  if (isOnPage(pathname, href) || pathname === ROUTE_PATHS.path) return null;
  const { verb, name } = splitLabel(label);
  const sentence = `${PREFIX}: ${label}`;

  return (
    <div className="grid min-w-0 max-w-full justify-items-center" ref={slot}>
      {/* the probes: invisible, zero height; the first holds the slot open to the full form's width */}
      <span aria-hidden className="pointer-events-none invisible col-start-1 row-start-1 flex h-0 min-w-0 max-w-full flex-col overflow-hidden">
        <ProbeBox
          probe={(el) => {
            probes.current.full = el;
          }}
        >
          <span className={cn(PROBE_TEXT, "font-medium")} data-t={`${PREFIX}:`} />
          <span className={cn(PROBE_TEXT, "font-semibold")} data-t={label} />
        </ProbeBox>
        <ProbeBox
          probe={(el) => {
            probes.current.label = el;
          }}
        >
          <span className={cn(PROBE_TEXT, "font-semibold")} data-t={label} />
        </ProbeBox>
        <ProbeBox
          probe={(el) => {
            probes.current.compact = el;
          }}
        >
          <span className={cn(PROBE_TEXT, "font-semibold")} data-t={PREFIX} />
        </ProbeBox>
      </span>
      {fit === "hidden" ? null : (
        <button
          aria-label={sentence}
          className={cn(
            BOX,
            "skin-pill group/pill col-start-1 row-start-1 min-w-0 max-w-full border-border bg-surface text-start",
            "transition-[border-color,scale,translate,opacity] duration-200 ease-out hover:border-border-strong",
            press,
            levelUpOpen && "pointer-events-none opacity-0 duration-150",
            className,
          )}
          data-state={fit}
          data-testid={TID.shell.nextStep}
          data-wp-live=""
          onClick={() => perform(step)}
          title={sentence}
          type="button"
        >
          {/* the waypoint: this is where you go next */}
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
          <span className={TEXT_ROW}>
            {fit === "full" ? <span className="shrink-0 font-medium text-fg-3">{PREFIX}:</span> : null}
            <Roll className="min-w-0" id={label}>
              {fit === "compact" ? (
                <span className="font-semibold text-fg">{PREFIX}</span>
              ) : (
                <span className="font-semibold text-fg">
                  {verb}
                  {name === null ? null : (
                    <>
                      {" «"}
                      <bdi>{name}</bdi>»
                    </>
                  )}
                </span>
              )}
            </Roll>
          </span>
          <IconArrowForward className="shrink-0 text-fg-2 transition-[translate] duration-200 ease-out group-hover/pill:-translate-x-0.5" size={18} waypoint="off" />
        </button>
      )}
    </div>
  );
}

/** One invisible copy of the pill's box (dot, text, arrow), at its natural width. */
function ProbeBox({ probe, children }: { readonly probe: (el: HTMLSpanElement | null) => void; readonly children: ReactNode }): ReactNode {
  return (
    <span className={cn(BOX, "w-max shrink-0 border-transparent")} ref={probe}>
      <span className="size-2 shrink-0" />
      <span className={TEXT_ROW}>{children}</span>
      <span className="size-[18px] shrink-0" />
    </span>
  );
}

interface Probes {
  full: HTMLSpanElement | null;
  label: HTMLSpanElement | null;
  compact: HTMLSpanElement | null;
}

/** Which form fits the slot, measured before paint and again whenever the slot or a probe changes size (the panel
 *  docking, the fonts arriving, a new label). */
function usePillFit(label: string | null) {
  // the slot is state, not a ref: the pill mounts and unmounts with the page (it hides on the page it would open)
  const [el, slot] = useState<HTMLDivElement | null>(null);
  const probes = useRef<Probes>({ full: null, label: null, compact: null });
  const [fit, setFit] = useState<PillFit>("full");

  useLayoutEffect(() => {
    if (el === null || label === null) return;
    const width = (node: Element | null) => (node === null ? Number.POSITIVE_INFINITY : node.getBoundingClientRect().width);
    const measure = () => {
      const room = el.getBoundingClientRect().width + 0.5;
      const { full, label: labelOnly, compact } = probes.current;
      setFit(room >= width(full) ? "full" : room >= width(labelOnly) ? "label" : room >= width(compact) ? "compact" : "hidden");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const node of [probes.current.full, probes.current.label, probes.current.compact]) if (node !== null) observer.observe(node);
    return () => observer.disconnect();
  }, [el, label]);

  return { slot, probes, fit };
}
