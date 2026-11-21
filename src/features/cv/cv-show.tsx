"use client";
// Owner: cv. The CV analysis show (spec 3.6, 6.3; playbook 3.6): the page becomes a stage and plays six stages over the
// REAL result, directed by useShow. `read` lasts at least 1.2 s and until the analysis is back (its `until`), so with a
// model the scan simply waits; every highlighted sentence is real evidence and every tag a skill actually found (P4).
//   read      the document inks in under a passing line                         (scan-line)
//   extract   per evidence sentence: the marker draws, its tags pop at its end, then fly to the tray   (phrase-highlight, tag-pop)
//   evidence  each tray tag shows its sentence beside it
//   level     stars land on each tag, one by one                                (star-fill)
//   match     twenty job rings draw; the best three stay
//   done      «انتهيت: …»; then the results come into focus (cv-screen)
// Space or Esc jumps to the results (once the analysis is back). Reduced motion: the results open directly (resultOnly).
// Desktop: the document on the right, the status, tray and rings on the left. Phone: status, document, then the tray in
// a column under it; the read document folds away once its sentences have flown, so the tray has the screen.
import { motion } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";

import { DaleelGlyph, type DaleelState } from "@/components/chat";
import { CV_STEPS, resultOnly, Roll, SkillTagGroup, useInstant, useShow, type CvStepId } from "@/components/motion";
import { cn, SkillStars, Stage } from "@/components/ui";
import type { CvLine } from "@/lib/brain/cv";
import { JOBS, getSkill } from "@/lib/data";
import { rankJobs } from "@/lib/engine";
import { tween } from "@/lib/motion";
import { useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { Consequence, CvAnalysis, SkillId } from "@/lib/types";

import { Bidi, textDir } from "./bidi";
import { stageLine } from "./copy";
import { CvDocument, type ScanState } from "./cv-document";
import { estimateTagWidth, FoundTag } from "./found-tag";
import { MatchRings } from "./match-rings";
import { planExtract, starTime, tagTimes, type ExtractGroup } from "./show-plan";
import { StageTrail } from "./stage-trail";
import { useContentWide } from "./use-content-wide";

export type ShowRun = {
  readonly id: number;
  /** cleanCvLines(text): the document, identical to the analysis' `lines`. */
  readonly lines: readonly CvLine[];
  /** Resolves when the outcome is known (never rejects). The `until` of `read`. */
  readonly ready: Promise<void>;
  readonly text: string;
  readonly fileName: string | null;
};

export type Outcome =
  | { readonly kind: "ok"; readonly analysis: CvAnalysis; readonly consequence: Consequence }
  | { readonly kind: "empty"; readonly text: string }
  | { readonly kind: "failed" };

const STEP_INDEX: Record<CvStepId, number> = { read: 0, extract: 1, evidence: 2, level: 3, match: 4, done: 5 };
const NONE: ReadonlySet<never> = new Set();
/** The scan starts once the stage has risen in. */
const SCAN_DELAY_MS = 200;
/** When the other rings recede in `match`. */
const KEEP_AT_MS = 900;
/** Tray rows drawn before the analysis has answered (it usually answers before the stage has risen in). */
const PLACEHOLDER_ROWS = 4;

type Placement = { readonly start: number; readonly top: number; readonly place: "end" | "above"; readonly max: number };

function added<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  if (set.has(value)) return set;
  const next = new Set(set);
  next.add(value);
  return next;
}

/**
 * `compact` (20 Nov 2026, docs/ONBOARDING-FLOW.md): the same show as a card inside the onboarding chat: the phone layout
 * at any width (the read document folds away once its sentences have flown), a shorter document window, no page height,
 * and the card keeps its bottom in view as it grows (the chat thread scrolls, the page never moves).
 * `phone` (with compact; 21 Nov 2026, a tester on a 390 px phone never saw «دليلك»'s status line: the card was taller than
 * the screen and the thread kept its bottom in view, so the paper's top and its flying tags were cut off under the step
 * bar, above an empty skeleton): the status line is sticky at the top of the card (it stays on screen while the card
 * scrolls under it), the paper window is shorter, the tray comes in only with the first tags (no skeleton while it reads,
 * no dotted sentence lines until `evidence`), and while it reads (`read`, `extract`) the card keeps its TOP in view (the
 * conversation holds the thread's own following meanwhile, from `onStage`); from `evidence` it follows the bottom again.
 * `onStage`: each stage as it starts (the conversation shows the CV's answers in the profile from `done`).
 */
export function CvShow({
  run,
  outcome,
  onFinished,
  compact = false,
  phone = false,
  onStage,
}: {
  readonly run: ShowRun;
  readonly outcome: Outcome | null;
  readonly onFinished: () => void;
  readonly compact?: boolean;
  readonly phone?: boolean;
  readonly onStage?: (step: CvStepId) => void;
}): ReactNode {
  const instant = useInstant();
  const contentWide = useContentWide();
  const wide = compact ? false : contentWide;
  const tight = compact && phone;
  const user = useCurrentUser();
  const ok = outcome?.kind === "ok" ? outcome : null;

  // ── the director ──────────────────────────────────────────────────────────────────────────────────────────────
  const steps = useMemo(() => {
    const base = CV_STEPS.map((s) => (s.id === "read" || s.id === "extract" ? { ...s, until: run.ready } : s));
    return instant ? resultOnly(base) : base;
  }, [run.ready, instant]);
  const [ended, setEnded] = useState(false);
  const show = useShow(steps, true, () => setEnded(true));
  const stepId: CvStepId = show.done ? "done" : (show.id ?? "read");
  const at = STEP_INDEX[stepId];
  const stageStarted = useEffectEvent((step: CvStepId) => onStage?.(step));
  useEffect(() => {
    stageStarted(stepId);
  }, [stepId]);

  const finished = useRef(false);
  useEffect(() => {
    if (!ended || ok === null || finished.current) return;
    finished.current = true;
    onFinished();
  }, [ended, ok, onFinished]);

  // Space / Esc: jump to the results, once there is a result to jump to (ARCHITECTURE 13: never from a field, never
  // from inside the advisor panel, and Esc belongs to the panel while it is open).
  const skipWanted = useRef(false);
  const okRef = useRef(false);
  useEffect(() => {
    okRef.current = ok !== null;
    if (ok !== null && skipWanted.current) show.skip();
  }, [ok, show]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.key !== " " && event.key !== "Escape")) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='dialog']")) return;
      if (event.key === "Escape" && useUi.getState().advisorOpen) return;
      event.preventDefault();
      skipWanted.current = true;
      if (okRef.current) show.skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  // ── read ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const [scanStarted, setScanStarted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setScanStarted(true), SCAN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const scan: ScanState = at > 0 ? "done" : scanStarted ? "running" : "pending";

  // ── extract ───────────────────────────────────────────────────────────────────────────────────────────────────
  const plan = useMemo(() => planExtract(ok?.analysis.skills ?? []), [ok]);
  const allLines = useMemo(() => new Set(plan.groups.map((g) => g.line)), [plan]);
  const [lit, setLit] = useState<ReadonlySet<number>>(NONE);
  const [popped, setPopped] = useState<ReadonlySet<SkillId>>(NONE);
  const [landed, setLanded] = useState<ReadonlySet<SkillId>>(NONE);
  const [places, setPlaces] = useState<ReadonlyMap<number, Placement>>(() => new Map());

  const wrapperRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const lineEls = useRef(new Map<number, HTMLSpanElement>());
  const registerLine = useCallback((index: number, el: HTMLSpanElement | null) => {
    if (el) lineEls.current.set(index, el);
    else lineEls.current.delete(index);
  }, []);

  /** Brings a line into the document's window before its marker draws (a long CV scrolls inside its sheet). */
  const revealLine = useCallback(
    (index: number) => {
      const box = boxRef.current;
      const el = lineEls.current.get(index);
      if (!box || !el || box.scrollHeight <= box.clientHeight + 1) return;
      const b = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.top >= b.top + 12 && r.bottom <= b.bottom - 12) return;
      box.scrollTo({ top: box.scrollTop + (r.top - b.top) - b.height / 3, behavior: instant ? "auto" : "smooth" });
    },
    [instant],
  );

  /** Where a sentence's tags pop: just past the end of the sentence, or lifted above its last line when there is no room. */
  const measure = useCallback((group: ExtractGroup): Placement | null => {
    const wrap = wrapperRef.current;
    const el = lineEls.current.get(group.line);
    if (!wrap || !el) return null;
    const w = wrap.getBoundingClientRect();
    // The span's boxes: one per line, and more than one on a line where a <bdi> run splits it (bidi reordering), so
    // the visual end of the sentence is the far edge of ALL the boxes on its last line, not the last box in DOM order.
    const rects = Array.from(el.getClientRects()).filter((r) => r.width > 0);
    if (rects.length === 0) return null;
    const bottom = Math.max(...rects.map((r) => r.top));
    const lastLine = rects.filter((r) => Math.abs(r.top - bottom) < r.height / 2);
    const left = Math.min(...lastLine.map((r) => r.left));
    const right = Math.max(...lastLine.map((r) => r.right));
    const top = Math.min(...lastLine.map((r) => r.top));
    const height = Math.max(...lastLine.map((r) => r.bottom)) - top;
    const width = group.skills.reduce((sum, id) => sum + estimateTagWidth(getSkill(id).name), 0) + 6 * (group.skills.length - 1);
    const ltr = getComputedStyle(el).direction === "ltr";
    const mid = top - w.top + height / 2;
    const max = w.width - 20;
    if (!ltr && left - w.left - 12 >= width + 10) return { start: w.right - left + 8, top: mid, place: "end", max };
    if (ltr && w.right - right - 12 >= width + 10) return { start: w.right - right - 8 - width, top: mid, place: "end", max };
    // lifted above the last line; on a narrow sheet a long group wraps upward instead of leaving the sheet
    const from = ltr ? w.right - left - width : w.right - right;
    return { start: Math.max(10, Math.min(from, w.width - Math.min(width, max) - 10)), top: top - w.top - 2, place: "above", max };
  }, []);

  const extracting = stepId === "extract" && ok !== null;
  useEffect(() => {
    if (!extracting) return;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    for (const group of plan.groups) {
      later(group.markAt, () => {
        revealLine(group.line);
        setLit((s) => added(s, group.line));
      });
      later(group.popAt, () => {
        const place = measure(group);
        if (place) setPlaces((m) => new Map(m).set(group.line, place));
      });
      group.skills.forEach((id, j) => {
        const t = tagTimes(group, j);
        later(t.pop + 1, () => setPopped((s) => added(s, id)));
        later(t.fly, () => setLanded((s) => added(s, id)));
      });
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [extracting, plan, measure, revealLine]);

  const pastExtract = at > 1;
  const litNow = pastExtract ? allLines : lit;
  const inTray = (id: SkillId) => pastExtract || landed.has(id);
  const flew = (id: SkillId) => popped.has(id);

  // ── level ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const starsFound = useMemo(() => new Map((ok?.analysis.skills ?? []).map((s) => [s.skill, s.stars])), [ok]);
  const [stars, setStars] = useState<Readonly<Partial<Record<SkillId, number>>>>({});
  const leveling = stepId === "level" && ok !== null;
  useEffect(() => {
    if (!leveling) return;
    const timers: number[] = [];
    plan.order.forEach((id, i) => {
      const full = starsFound.get(id) ?? 0;
      for (let k = 1; k <= full; k++) {
        timers.push(window.setTimeout(() => setStars((s) => ({ ...s, [id]: k })), starTime(i, k, plan.order.length)));
      }
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [leveling, plan, starsFound]);

  // ── match ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const ranked = useMemo(() => (ok !== null && user !== null ? rankJobs(user) : []), [ok, user]);
  const [keep, setKeep] = useState(false);
  const [matchPlayed, setMatchPlayed] = useState(false);
  const matching = stepId === "match";
  useEffect(() => {
    if (!matching) return;
    setMatchPlayed(true);
    const timer = window.setTimeout(() => setKeep(true), KEEP_AT_MS);
    return () => window.clearTimeout(timer);
  }, [matching]);

  // ── phone: the read document folds away (the tray moves up into its place); the page follows the rings when a
  //    long CV has pushed them out of view ──────────────────────────────────────────────────────────────────────
  const docOpen = wide || at < 2;
  const ringsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (instant || at !== 4 || compact) return;
    ringsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [at, instant, compact]);
  // compact: the card's bottom follows each stage inside the chat thread (it grows as the tray fills and the rings draw);
  // on a phone, while it reads, its top stays in view instead (the status line and the whole paper window, where the
  // tags pop): set once per stage, so a reader who scrolls down to the tray is not pulled back up at every tag
  const endRef = useRef<HTMLSpanElement>(null);
  const topRef = useRef<HTMLSpanElement>(null);
  const holdTop = tight && at < 2;
  useEffect(() => {
    if (!compact || holdTop) return;
    const timer = window.setTimeout(() => endRef.current?.scrollIntoView({ block: "end", behavior: instant ? "auto" : "smooth" }), 120);
    return () => window.clearTimeout(timer);
  }, [compact, holdTop, at, landed.size, instant]);
  useEffect(() => {
    if (!holdTop) return;
    const timer = window.setTimeout(() => topRef.current?.scrollIntoView({ block: "start", behavior: instant ? "auto" : "smooth" }), 120);
    return () => window.clearTimeout(timer);
  }, [holdTop, at, instant]);

  // ── status ────────────────────────────────────────────────────────────────────────────────────────────────────
  const skillCount = ok?.analysis.skills.length ?? 0;
  const label = stageLine(stepId, skillCount, JOBS.length, compact);
  const glyph: DaleelState = stepId === "done" ? "done" : stepId === "read" ? "thinking" : "working";

  const overlay = (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-raised">
      {plan.groups.map((group) => {
        const place = places.get(group.line);
        if (!place || pastExtract || !group.skills.some((id) => flew(id) && !landed.has(id))) return null;
        return (
          <div
            className={cn("absolute flex flex-wrap gap-1.5 bg-transparent", place.place === "end" ? "-translate-y-1/2" : "-translate-y-full")}
            data-surface="stage"
            key={group.line}
            style={{ insetInlineStart: place.start, top: place.top, maxWidth: place.max }}
          >
            {group.skills.map((id) =>
              flew(id) && !landed.has(id) ? (
                <FoundTag id={id} key={id} name={getSkill(id).name} where="sentence" />
              ) : flew(id) ? (
                <span className="invisible inline-flex h-8 items-center px-3 text-small font-semibold whitespace-nowrap" key={id}>
                  {getSkill(id).name}
                </span>
              ) : null,
            )}
          </div>
        );
      })}
    </div>
  );

  const evidenceStep = Math.min(0.08, 0.48 / Math.max(plan.groups.length, 1));
  const trayShown = !tight || (ok !== null && at >= 1);

  return (
    <Stage
      aria-busy={!show.done}
      as="section"
      aria-label={label}
      className={cn(
        compact
          ? ["rounded-card p-3.5", tight && "overflow-clip"]
          : ["rounded-sheet p-4 @min-[900px]/content:px-6 @min-[900px]/content:py-5", "@min-[900px]/content:min-h-[calc(100dvh-var(--shell-top,5.5rem)-2.5rem)]"],
      )}
      contour="faint"
      data-testid={TID.cv.show}
    >
      <SkillTagGroup id={`cv-show-${run.id}`}>
        {/* phone, while it reads: the thread scrolls to here (the card's top edge, a little air above it) */}
        <span aria-hidden className="block h-0 scroll-mt-6" ref={topRef} />
        <div
          className={cn(
            "relative grid gap-4 [grid-template-areas:'status'_'doc'_'tray'_'rings']",
            "@min-[900px]/content:grid-cols-[minmax(0,1fr)_minmax(22rem,27.5rem)] @min-[900px]/content:grid-rows-[auto_auto_1fr] @min-[900px]/content:gap-x-8",
            "@min-[900px]/content:[grid-template-areas:'doc_status'_'doc_tray'_'doc_rings']",
            // phone card: only the rows it has yet (no empty rows, whose gaps would leave a blank band under the paper)
            tight && !trayShown && "[grid-template-areas:'status'_'doc']",
            tight && trayShown && at < 4 && "[grid-template-areas:'status'_'doc'_'tray']",
          )}
        >
          {/* the voice: «دليلك»'s glyph and the rolling status line, the trail of the six stages under it. Phone: sticky
              at the top of the thread (the Stage clips instead of hiding its overflow, so it can stick), on the stage's
              own ground, so what scrolls under it never shows through */}
          <div
            className={cn("flex flex-col gap-3 [grid-area:status]", tight && "sticky top-0 z-sticky -mt-2 bg-bg pt-2 pb-2.5")}
            data-testid={TID.cv.showStage}
            data-value={stepId}
          >
            <div className="flex min-h-11 items-center gap-3">
              <DaleelGlyph framed size={40} state={glyph} />
              {/* the rolling status line (RollingStatus's roll and light), except that the light stops on «انتهيت…» */}
              <span className="sr-only" role="status">
                {label}
              </span>
              {/* phone: a touch smaller with room at the end, so the longest line keeps its «…» at 360 px (tester, 21 Nov) */}
              <Roll className={cn("min-w-0 text-title font-semibold", tight && "pe-2 text-[0.95rem]", !compact && "@min-[900px]/content:text-h3")} id={label}>
                <span aria-hidden className={stepId === "done" ? "text-fg" : "shimmer-text"}>
                  {label}
                </span>
              </Roll>
            </div>
            <StageTrail done={show.done} index={at} />
          </div>

          {/* the document being read */}
          <div
            className={cn("collapse-rows [grid-area:doc] @min-[900px]/content:grid-rows-[1fr] @min-[900px]/content:opacity-100")}
            data-open={docOpen ? "" : undefined}
            inert={!docOpen}
          >
            <div className={cn("min-h-0", !wide && "overflow-clip")}>
              <CvDocument
                boxClassName={tight ? "max-h-[min(24svh,13rem)]" : compact ? "max-h-[min(34svh,15rem)]" : "max-h-[min(50svh,26rem)] @min-[900px]/content:max-h-[calc(100dvh-var(--shell-top,5.5rem)-5rem)]"}
                boxRef={boxRef}
                lines={run.lines}
                lit={litNow}
                overlay={overlay}
                registerLine={registerLine}
                scan={scan}
                wrapperRef={wrapperRef}
              />
            </div>
          </div>

          {/* the tray: one row per proving sentence. Its slots are dotted (the way ahead) until the tags land; then the
              sentence that proves them comes in under them, then each tag's stars land. Phone: it comes in with the
              first tags (no skeleton while the paper is read), its rows one line each until the sentences come in. */}
          {trayShown ? (
            <TrayBox fadeIn={tight}>
              <ol className="flex flex-col divide-y divide-border">
                {ok === null
                  ? Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => <TraySlots key={i} />)
                  : plan.groups.map((group, g) => {
                      const evidence = ok.analysis.skills.find((s) => s.line === group.line)?.evidence ?? "";
                      const landedHere = group.skills.some(inTray);
                      const delay = g * evidenceStep;
                      return (
                        <li className="flex flex-col gap-1.5 py-2" data-line={group.line} key={group.line}>
                          <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
                            {landedHere ? (
                              group.skills.map((id) => {
                                if (!inTray(id)) return null;
                                const skill = getSkill(id);
                                const shown = at > 3 ? (starsFound.get(id) ?? 0) : (stars[id] ?? 0);
                                return (
                                  <span className="inline-flex items-center gap-2" data-skill={id} key={id}>
                                    <FoundTag id={id} name={skill.name} restored={!flew(id)} where="tray" />
                                    {/* the slots are there from the landing (so nothing shifts), shown from `evidence` */}
                                    <motion.span animate={{ opacity: at >= 2 ? 1 : 0 }} initial={false} transition={{ ...tween.move, delay: at > 2 ? 0 : delay }}>
                                      <SkillStars fresh={at > 3 ? undefined : shown || undefined} size="sm" slots={skill.maxStars} value={shown} />
                                    </motion.span>
                                  </span>
                                );
                              })
                            ) : (
                              <span aria-hidden className="h-8 w-28 rounded-full border-[1.5px] border-dashed border-border-strong opacity-60" />
                            )}
                          </div>
                          {at >= 2 ? (
                            <motion.p
                              animate={{ opacity: 1, y: 0 }}
                              className="line-clamp-2 text-small text-fg-2 @min-[900px]/content:line-clamp-1"
                              dir={textDir(evidence)}
                              initial={at > 2 ? false : { opacity: 0, y: 8 }}
                              transition={{ ...tween.move, delay: delay + 0.04 }}
                            >
                              «<Bidi text={evidence} />»
                            </motion.p>
                          ) : tight ? null : (
                            <TrailLine />
                          )}
                        </li>
                      );
                    })}
              </ol>
            </TrayBox>
          ) : null}

          {/* the comparison with every job */}
          {/* scroll margin: clear of the phone tab bar, and of the desktop launcher in the bottom corner */}
          {!tight || at >= 4 ? (
            <div className="scroll-mb-[calc(var(--shell-bottom,4.5rem)+1rem)] [grid-area:rings] @min-[900px]/content:scroll-mb-24" ref={ringsRef}>
              {/* compact (the chat card): the best 24 rings, three short rows, instead of every job */}
              {at >= 4 && ranked.length > 0 ? <MatchRings keep={keep || at > 4} ranked={compact ? ranked.slice(0, 24) : ranked} restored={at > 4 && !matchPlayed} /> : null}
            </div>
          ) : null}
        </div>
        <span aria-hidden className="block h-px scroll-mb-4" ref={endRef} />
      </SkillTagGroup>
    </Stage>
  );
}

/** The tray's box; on a phone card it fades in with the first tags. */
function TrayBox({ fadeIn, children }: { readonly fadeIn: boolean; readonly children: ReactNode }) {
  const className = "rounded-card border border-border bg-surface/70 px-4 py-1.5 [grid-area:tray]";
  if (!fadeIn) return <div className={className}>{children}</div>;
  return (
    <motion.div animate={{ opacity: 1 }} className={className} initial={{ opacity: 0 }} transition={tween.move}>
      {children}
    </motion.div>
  );
}

/** The sentence still to come: a dotted line (DESIGN.md 1.3: dotted is the way ahead). */
function TrailLine() {
  return (
    <span aria-hidden className="flex h-[1.7em] items-center">
      <span className="block w-3/4 border-t-2 border-dotted border-border-strong opacity-60" />
    </span>
  );
}

/** An empty tray row: the slot of a tag and the line of its sentence, both still dotted. */
function TraySlots() {
  return (
    <li aria-hidden className="flex flex-col gap-1.5 py-2">
      <span className="h-8 w-28 rounded-full border-[1.5px] border-dashed border-border-strong opacity-60" />
      <TrailLine />
    </li>
  );
}
