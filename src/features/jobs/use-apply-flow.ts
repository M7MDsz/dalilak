"use client";
// Owner: jobs. The apply sheet's brain (spec 3.8, 7.4; ARCHITECTURE 9.2), owned by the job page so that a run «دليلك» is
// performing is reported correctly whatever happens to the sheet.
//
// Two ways in:
// - user: «قدّم بنفسك» or `/jobs/{id}?apply=1` → the sheet opens already filled; «احفظ الطلب» → the record is written
//   (ARCHITECTURE 5.2: on the press) → «جارٍ الحفظ…» (1.2 s) → the confirmation. From the press until the sheet closes
//   the overlay queue is held, so the +40 XP and badge toasts follow the receipt instead of landing on it, exactly as
//   they follow «دليلك»'s run. HoldKey has no key for a manual send (frozen type), so this borrows "advisor-apply": no
//   advisor run can exist while a user sheet is open (startApplyRun refuses then), so the key never has two holders.
// - advisor: the dispatcher started `applyRun` for this job → the sheet opens EMPTY in advisor mode and «دليلك» fills it:
//   open 0.5 s · name, city, qualification 0.4 s each · the skills pop 0.7 s · the note types 2.0 s · the send is pressed
//   and goes out 1.6 s (the record is written at the START of this step) · the confirmation, then the sheet closes itself.
//   20 Nov 2026 (real jobs): the simulated multi-site step is gone. The PRACTICE job's confirmation stays up longer
//   (APPLY_PRACTICE_DONE_MS) on «تم حفظ طلبك»; a REAL job's application is PREPARED, not
//   sent: the confirmation shows where the job is posted and ONE action, «افتح الإعلان الأصلي وقدّم» (a new tab + the
//   note on the clipboard). That needs the user's own press, so for a real job the sheet stays open after the run ends. Every step is reported with setApplyStep(runId, 1..6); «إيقاف» (composer or sheet: requestApplyStop) during
//   steps 1-4 stops it, leaves what was written, editable, and reports `stopped`. Unmounted mid-run (a nav item, Back),
//   a DEFERRED cleanup reports `interrupted` before step 5, `sent` from step 5 (the record exists); Strict Mode's
//   simulated unmount reports nothing. The show starts once per run id.
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { useInstant, useShow, type ShowStep } from "@/components/motion";
import { answerText, applicationNote, educationAndMajorText, NEUTRAL_PRINT } from "@/lib/copy";
import { ADVISOR_APPLY_STEPS, APPLY_PRACTICE_DONE_MS, MANUAL_SEND_MS, getJob } from "@/lib/data";
import { sleep } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useAppStore, useUi } from "@/lib/store";
import type { Application, ApplyRun, ApplyStep, JobId, SubmitApplicationResult, UserState } from "@/lib/types";

export type FillStepId = "open" | "name" | "city" | "education" | "skills" | "note" | "send" | "done";
export type SheetMode = "user" | "advisor";
export type SheetPhase = "form" | "sending" | "confirmed";
export type FormKey = "name" | "city" | "education" | "note";
export type FormValues = Readonly<Record<FormKey, string>>;

const ms = (step: ApplyStep) => ADVISOR_APPLY_STEPS.find((s) => s.step === step)?.ms ?? 0;

/** Spec 7.4, step 2 split into its three fields (1.2 s = 3 × 0.4 s). The practice job's confirmation stays up longer. */
function fillSteps(real: boolean): readonly ShowStep<FillStepId>[] {
  return [
    { id: "open", ms: ms(1) },
    { id: "name", ms: ms(2) / 3 },
    { id: "city", ms: ms(2) / 3 },
    { id: "education", ms: ms(2) / 3 },
    { id: "skills", ms: ms(3) },
    { id: "note", ms: ms(4) },
    { id: "send", ms: ms(5) },
    { id: "done", ms: real ? ms(6) : APPLY_PRACTICE_DONE_MS },
  ];
}
const FILL_STEPS_REAL = fillSteps(true);
const FILL_STEPS_PRACTICE = fillSteps(false);

/** Reduced motion (playbook 3.8): the fields fill at once, the press still shows, the confirmation appears. */
function fillStepsReduced(real: boolean): readonly ShowStep<FillStepId>[] {
  return [
    { id: "open", ms: 0 },
    { id: "name", ms: 0 },
    { id: "city", ms: 0 },
    { id: "education", ms: 0 },
    { id: "skills", ms: 0 },
    { id: "note", ms: 0 },
    { id: "send", ms: 600 },
    { id: "done", ms: real ? ms(6) : APPLY_PRACTICE_DONE_MS },
  ];
}
const FILL_STEPS_REAL_REDUCED = fillStepsReduced(true);
const FILL_STEPS_PRACTICE_REDUCED = fillStepsReduced(false);

const SPEC_STEP: Readonly<Record<FillStepId, ApplyStep>> = {
  open: 1,
  name: 2,
  city: 2,
  education: 2,
  skills: 3,
  note: 4,
  send: 5,
  done: 6,
};

export const STEP_ORDER: readonly FillStepId[] = FILL_STEPS_REAL.map((s) => s.id);
const SEND_INDEX = STEP_ORDER.indexOf("send");
const FORM_KEYS: readonly FormKey[] = ["name", "city", "education", "note"];
/** The programmatic press on «احفظ الطلب» (DESIGN 7: the press is seen, then the action follows). */
const PRESS_MS = 180;

interface Session {
  /** Remounts the form for each opening. */
  readonly key: number;
  readonly mode: SheetMode;
  /** The advisor run this session plays (null in user mode). */
  readonly runId: number | null;
}

interface RunBook {
  id: number;
  stepIndex: number;
  submitted: SubmitApplicationResult | null;
  finished: boolean;
}

export interface ApplyFlow {
  readonly open: boolean;
  readonly session: Session | null;
  readonly phase: SheetPhase;
  /** The step «دليلك» is on while he fills (null in user mode). */
  readonly stepId: FillStepId | null;
  readonly stepIndex: number;
  /** «دليلك» is writing (steps 1-4): fields are his, «إيقاف» is shown. */
  readonly filling: boolean;
  /** The send button shows its press frame. */
  readonly pressed: boolean;
  readonly stopped: boolean;
  /** What is in the fields now. */
  readonly values: FormValues;
  /** What «دليلك» writes (and what the user mode starts with). */
  readonly targets: FormValues;
  readonly application: Application | null;
  /** A real posting: the application is prepared here and sent by the user from the original posting. */
  readonly real: boolean;
  /** «دليلك»'s run has ended (or none was running): the sheet can be closed. */
  readonly ended: boolean;
  setValue(key: FormKey, value: string): void;
  openUser(): void;
  close(): void;
  submit(): void;
  stop(): void;
}

let sessionKeys = 0;

export function useApplyFlow(
  jobId: JobId,
  user: UserState,
  onClosed?: (reason: "close" | "gap") => void,
): ApplyFlow & { seeGap(): void } {
  const router = useRouter();
  const instant = useInstant();
  const real = getJob(jobId).real;

  const targets: FormValues = useMemo(
    () => ({
      name: user.name,
      city: answerText(user.answers, "city") ?? NEUTRAL_PRINT.city,
      education: educationAndMajorText(user.answers),
      note: applicationNote(jobId, user),
    }),
    // the note is drafted once per opening from the facts of that moment; the facts do not change while the sheet is open
    // except by the send itself, which must not rewrite the note under the confirmation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobId, user.name, user.answers],
  );
  const [noteDraft, setNoteDraft] = useState(targets.note);

  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<SheetPhase>("form");
  const [values, setValues] = useState<FormValues>({
    name: "",
    city: "",
    education: "",
    note: "",
  });
  const [stopped, setStopped] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(true);

  const run = useRef<RunBook | null>(null);
  const openRef = useRef(false);
  const mounted = useRef(true);
  const advisorTargets = useRef(targets);

  const setSheetOpen = (next: boolean) => {
    openRef.current = next;
    setOpen(next);
    useUi.getState().setApplySheetOpen(next);
  };

  // ── user mode ────────────────────────────────────────────────────────────────────────────────────────────────
  const openUser = () => {
    if (openRef.current) return;
    const ui = useUi.getState();
    if (ui.applyRun !== null && ui.applyRun.result === null) return; // «دليلك» is applying: one thing at a time
    const note = applicationNote(jobId, useAppStore.getState().users[user.id] ?? user);
    setNoteDraft(note);
    sessionKeys += 1;
    setSession({ key: sessionKeys, mode: "user", runId: null });
    setValues({ ...targets, note });
    setPhase("form");
    setStopped(false);
    setPressed(false);
    setApplication(null);
    setSheetOpen(true);
  };

  const sendTimer = useRef<number | null>(null);
  const userHold = useRef(false);
  const releaseUserHold = () => {
    if (!userHold.current) return;
    userHold.current = false;
    useUi.getState().release("advisor-apply");
  };
  const submit = () => {
    if (phase !== "form" || filling) return;
    // the hold first (synchronously), so the overlay host never sees the gain without it
    userHold.current = true;
    useUi.getState().hold("advisor-apply");
    const result = useAppStore.getState().submitApplication({
      jobId,
      note: values.note.trim() === "" ? noteDraft : values.note,
      by: "user",
    });
    if (!result.ok) {
      releaseUserHold();
      setSheetOpen(false);
      stripApplyParam();
      return;
    }
    setApplication(result.application);
    setPhase("sending");
    sendTimer.current = window.setTimeout(
      () => {
        sendTimer.current = null;
        setPhase("confirmed");
      },
      instant ? 0 : MANUAL_SEND_MS,
    );
  };

  const stripApplyParam = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("apply") === null) return;
    router.replace(hrefFor({ screen: "job", jobId }), { scroll: false });
  };

  const close = () => {
    if (!openRef.current) return;
    // «دليلك» is writing or sending: the sheet is his until it ends or «إيقاف» is pressed
    if (session?.mode === "advisor" && !stopped && run.current !== null && !run.current.finished) return;
    if (phase === "sending") return;
    setSheetOpen(false);
    releaseUserHold();
    stripApplyParam();
    onClosed?.("close");
  };

  const seeGap = () => {
    if (!openRef.current) return;
    setSheetOpen(false);
    releaseUserHold();
    stripApplyParam();
    onClosed?.("gap");
  };

  // ── advisor mode ─────────────────────────────────────────────────────────────────────────────────────────────
  const applyRun = useUi((s) => s.applyRun);
  const runForMe = applyRun !== null && applyRun.jobId === jobId && applyRun.result === null ? applyRun : null;
  const runForMeId = runForMe?.id ?? null;
  const startedRun = useRef<number | null>(null);

  useEffect(() => {
    if (runForMeId === null || startedRun.current === runForMeId) return;
    startedRun.current = runForMeId;
    const facts = useAppStore.getState().users[user.id] ?? user;
    advisorTargets.current = {
      ...targets,
      note: applicationNote(jobId, facts),
    };
    setNoteDraft(advisorTargets.current.note);
    run.current = {
      id: runForMeId,
      stepIndex: 0,
      submitted: null,
      finished: false,
    };
    sessionKeys += 1;
    setSession({ key: sessionKeys, mode: "advisor", runId: runForMeId });
    setValues({ name: "", city: "", education: "", note: "" });
    setPhase("form");
    setStopped(false);
    setPressed(false);
    setApplication(null);
    setEnded(false);
    setSheetOpen(true);
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runForMeId]);

  const finishRun = (result: NonNullable<ApplyRun["result"]>) => {
    const book = run.current;
    if (book === null || book.finished) return;
    book.finished = true;
    setEnded(true);
    useUi.getState().finishApplyRun(book.id, result);
  };

  /** The record, written once, at the start of step 5 (or when a still frame jumps past it). */
  const ensureSubmitted = (): SubmitApplicationResult | null => {
    const book = run.current;
    if (book === null) return null;
    if (book.submitted !== null) return book.submitted;
    const result = useAppStore.getState().submitApplication({
      jobId,
      note: advisorTargets.current.note,
      by: "advisor",
    });
    book.submitted = result;
    if (result.ok) setApplication(result.application);
    return result;
  };

  const showDone = useEffectEvent(() => {
    setPlaying(false);
    const book = run.current;
    if (book === null || book.finished) return;
    const result = ensureSubmitted();
    // a real job: the sheet stays on the hand-off (the posting opens only on the user's own press)
    if (!(real && result !== null && result.ok)) setSheetOpen(false);
    if (result !== null && result.ok)
      finishRun({
        kind: "sent",
        application: result.application,
        consequence: result.consequence,
      });
    else if (result !== null && !result.ok) finishRun({ kind: "failed", reason: result.reason });
  });

  const steps = instant
    ? real
      ? FILL_STEPS_REAL_REDUCED
      : FILL_STEPS_PRACTICE_REDUCED
    : real
      ? FILL_STEPS_REAL
      : FILL_STEPS_PRACTICE;
  const show = useShow(steps, playing && !stopped, showDone);
  const stepIndex = session?.mode === "advisor" ? show.index : STEP_ORDER.length - 1;
  const stepId = session?.mode === "advisor" && (playing || show.done) && !stopped ? (show.id ?? null) : null;
  const filling = session?.mode === "advisor" && playing && !stopped && show.index < SEND_INDEX;

  // report each step; write the record at the start of step 5 and press the send button in front of the user
  const onStep = useEffectEvent((index: number) => {
    const book = run.current;
    if (book === null || book.finished || session?.mode !== "advisor") return;
    book.stepIndex = Math.max(book.stepIndex, index);
    const id = STEP_ORDER[index];
    if (id === undefined) return;
    // every field «دليلك» has moved past holds its whole value, even if a busy machine let the typing lag behind the
    // step clock (what was typed so far is kept only when «إيقاف» stops him)
    const passed = new Set(STEP_ORDER.slice(0, index));
    const full = advisorTargets.current;
    setValues((all) => {
      let next = all;
      for (const key of FORM_KEYS) if (passed.has(key) && next[key] !== full[key]) next = { ...next, [key]: full[key] };
      return next;
    });
    useUi.getState().setApplyStep(book.id, SPEC_STEP[id]);
    if (id === "send") {
      const result = ensureSubmitted();
      if (result !== null && !result.ok) {
        setPlaying(false);
        setSheetOpen(false);
        finishRun({ kind: "failed", reason: result.reason });
        return;
      }
      setPhase("sending");
      setPressed(true);
      void sleep(PRESS_MS).then(() => setPressed(false));
    }
    if (id === "done") setPhase("confirmed");
  });
  useEffect(() => {
    if (!show.playing && !show.done) return;
    onStep(show.index);
  }, [show.index, show.playing, show.done]);

  // «إيقاف» from the composer or the sheet: honoured during steps 1-4 only
  const stopRequested = applyRun !== null && applyRun.id === session?.runId && applyRun.stopRequested;
  const onStop = useEffectEvent(() => {
    const book = run.current;
    if (book === null || book.finished || stopped) return;
    if (book.stepIndex >= SEND_INDEX) return; // a pressed send cannot be stopped
    setStopped(true);
    setPlaying(false);
    finishRun({ kind: "stopped" });
  });
  useEffect(() => {
    if (stopRequested) onStop();
  }, [stopRequested]);

  const stop = () => useUi.getState().requestApplyStop();

  // ── real unmount (deferred, so Strict Mode's simulated unmount reports nothing) ─────────────────────────────
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.setTimeout(() => {
        if (mounted.current) return;
        if (sendTimer.current !== null) window.clearTimeout(sendTimer.current);
        if (userHold.current) {
          userHold.current = false;
          useUi.getState().release("advisor-apply");
        }
        const book = run.current;
        if (book !== null && !book.finished) {
          book.finished = true;
          const sent = book.submitted;
          if (sent !== null && sent.ok)
            useUi.getState().finishApplyRun(book.id, {
              kind: "sent",
              application: sent.application,
              consequence: sent.consequence,
            });
          else if (sent !== null && !sent.ok)
            useUi.getState().finishApplyRun(book.id, { kind: "failed", reason: sent.reason });
          else useUi.getState().finishApplyRun(book.id, { kind: "interrupted" });
        }
        if (openRef.current) {
          openRef.current = false;
          useUi.getState().setApplySheetOpen(false);
        }
      }, 0);
    };
  }, []);

  const setValue = (key: FormKey, value: string) =>
    setValues((all) => (all[key] === value ? all : { ...all, [key]: value }));

  return {
    open,
    session,
    phase,
    stepId,
    stepIndex,
    filling,
    pressed,
    stopped,
    values,
    targets: session?.mode === "advisor" ? advisorTargets.current : { ...targets, note: noteDraft },
    application,
    real,
    ended,
    setValue,
    openUser,
    close,
    submit,
    stop,
    seeGap,
  };
}
