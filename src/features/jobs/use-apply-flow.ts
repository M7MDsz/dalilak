"use client";
// Owner: jobs. The apply sheet's brain (spec 3.8, 7.4; ARCHITECTURE 9.2), owned by the job page so that a run «دليل» is
// performing is reported correctly whatever happens to the sheet.
//
// Two ways in:
// - user: «قدّم بنفسك» or `/jobs/{id}?apply=1` → the sheet opens already filled; «أرسل الطلب» → the record is written
//   (ARCHITECTURE 5.2: on the press) → «جارٍ الإرسال…» (1.2 s) → the confirmation. From the press until the sheet closes
//   the overlay queue is held, so the +40 XP and badge toasts follow the receipt instead of landing on it, exactly as
//   they follow «دليل»'s run. HoldKey has no key for a manual send (frozen type), so this borrows "advisor-apply": no
//   advisor run can exist while a user sheet is open (startApplyRun refuses then), so the key never has two holders.
// - advisor: the dispatcher started `applyRun` for this job → the sheet opens EMPTY in advisor mode and «دليل» fills it:
//   open 0.5 s · name, city, qualification 0.4 s each · the skills pop 0.7 s · the note types 2.0 s · the send is pressed
//   and goes out 1.6 s (the record is written at the START of this step) · the confirmation 1.2 s, then the sheet closes
//   itself. Every step is reported with setApplyStep(runId, 1..6); «إيقاف» (composer or sheet: requestApplyStop) during
//   steps 1-4 stops it, leaves what was written, editable, and reports `stopped`. Unmounted mid-run (a nav item, Back),
//   a DEFERRED cleanup reports `interrupted` before step 5, `sent` from step 5 (the record exists); Strict Mode's
//   simulated unmount reports nothing. The show starts once per run id.
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { useInstant, useShow, type ShowStep } from "@/components/motion";
import { answerText, applicationNote, educationAndMajorText, NEUTRAL_PRINT } from "@/lib/copy";
import { ADVISOR_APPLY_STEPS, APPLY_SITE_MS, APPLY_SITES, MANUAL_SEND_MS } from "@/lib/data";
import { sleep } from "@/lib/motion";
import { hrefFor } from "@/lib/routes";
import { useAppStore, useUi } from "@/lib/store";
import type { Application, ApplyRun, ApplyStep, JobId, SubmitApplicationResult, UserState } from "@/lib/types";

/** `sites`: after the in-app send, «دليل» applies on the other sites (APPLY_SITES, simulated), one after another. */
export type FillStepId = "open" | "name" | "city" | "education" | "skills" | "note" | "send" | "sites" | "done";
export type SheetMode = "user" | "advisor";
export type SheetPhase = "form" | "sending" | "confirmed";
export type FormKey = "name" | "city" | "education" | "note";
export type FormValues = Readonly<Record<FormKey, string>>;

const ms = (step: ApplyStep) => ADVISOR_APPLY_STEPS.find((s) => s.step === step)?.ms ?? 0;

/** Spec 7.4, step 2 split into its three fields (1.2 s = 3 × 0.4 s). */
const FILL_STEPS: readonly ShowStep<FillStepId>[] = [
  { id: "open", ms: ms(1) },
  { id: "name", ms: ms(2) / 3 },
  { id: "city", ms: ms(2) / 3 },
  { id: "education", ms: ms(2) / 3 },
  { id: "skills", ms: ms(3) },
  { id: "note", ms: ms(4) },
  { id: "send", ms: ms(5) },
  { id: "sites", ms: APPLY_SITES.length * APPLY_SITE_MS },
  { id: "done", ms: ms(6) },
];

/** Reduced motion (playbook 3.8): the fields fill at once, the press still shows, the confirmation appears. */
const FILL_STEPS_REDUCED: readonly ShowStep<FillStepId>[] = [
  { id: "open", ms: 0 },
  { id: "name", ms: 0 },
  { id: "city", ms: 0 },
  { id: "education", ms: 0 },
  { id: "skills", ms: 0 },
  { id: "note", ms: 0 },
  { id: "send", ms: 600 },
  { id: "sites", ms: 900 },
  { id: "done", ms: ms(6) },
];

const SPEC_STEP: Readonly<Record<FillStepId, ApplyStep>> = {
  open: 1,
  name: 2,
  city: 2,
  education: 2,
  skills: 3,
  note: 4,
  send: 5,
  sites: 5,
  done: 6,
};

export const STEP_ORDER: readonly FillStepId[] = FILL_STEPS.map((s) => s.id);
const SEND_INDEX = STEP_ORDER.indexOf("send");
const FORM_KEYS: readonly FormKey[] = ["name", "city", "education", "note"];
/** The programmatic press on «أرسل الطلب» (DESIGN 7: the press is seen, then the action follows). */
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
  /** The step «دليل» is on while he fills (null in user mode). */
  readonly stepId: FillStepId | null;
  readonly stepIndex: number;
  /** «دليل» is writing (steps 1-4): fields are his, «إيقاف» is shown. */
  readonly filling: boolean;
  /** The send button shows its press frame. */
  readonly pressed: boolean;
  readonly stopped: boolean;
  /** What is in the fields now. */
  readonly values: FormValues;
  /** What «دليل» writes (and what the user mode starts with). */
  readonly targets: FormValues;
  readonly application: Application | null;
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
    if (ui.applyRun !== null && ui.applyRun.result === null) return; // «دليل» is applying: one thing at a time
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
    // «دليل» is writing or sending: the sheet is his until it ends or «إيقاف» is pressed
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
    setSheetOpen(true);
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runForMeId]);

  const finishRun = (result: NonNullable<ApplyRun["result"]>) => {
    const book = run.current;
    if (book === null || book.finished) return;
    book.finished = true;
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
    setSheetOpen(false);
    if (result !== null && result.ok)
      finishRun({
        kind: "sent",
        application: result.application,
        consequence: result.consequence,
      });
    else if (result !== null && !result.ok) finishRun({ kind: "failed", reason: result.reason });
  });

  const show = useShow(instant ? FILL_STEPS_REDUCED : FILL_STEPS, playing && !stopped, showDone);
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
    // every field «دليل» has moved past holds its whole value, even if a busy machine let the typing lag behind the
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
    setValue,
    openUser,
    close,
    submit,
    stop,
    seeGap,
  };
}
