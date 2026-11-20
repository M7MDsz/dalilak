"use client";
// Owner: cv. /cv (spec 3.6, 6; ARCHITECTURE 11.4): input → the analysis show → results (or the empty result), one phase at
// a time inside one route (the old phase leaves in 150 ms, then the new one rises; playbook 1.3).
//   file  → precheckCvFile → extractCvFile (errors stay in the input state) → the show
//   paste / sample → the show
//   the show plays cleanCvLines(text) at once, while analyseCvText runs; when it answers: no skill → the empty result,
//   nothing saved; a failed request → back to the input with «تعذّر التحليل الآن…»; else recordCvAnalysis BEFORE
//   `extract` begins (a reload mid-show opens the saved result), and the show plays the real evidence.
// The overlay queue is held (`cv-show`) from the first frame of the show until the results have settled, so the XP toast,
// the level-up and the badge arrive together over the finished result (3.6, 3.15).
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { PageTransition, useTypeOn } from "@/components/motion";
import { cleanCvLines } from "@/lib/brain/cv";
import { analyseCvText, extractCvFile, precheckCvFile } from "@/lib/brain/cv/client";
import { PROTOCOL_VERSION, LIMITS, type CvErrorCode } from "@/lib/brain/protocol";
import { sampleCvText } from "@/lib/data";
import { tween } from "@/lib/motion";
import { useAppStore, useBrainStatus, useCurrentUser, useOverlayHold } from "@/lib/store";

import { CvEmpty } from "./cv-empty";
import { CvInput } from "./cv-input";
import { CvResults, type FreshResult } from "./cv-results";
import { CvShow, type Outcome, type ShowRun } from "./cv-show";

type Phase =
  | { readonly kind: "input" }
  | { readonly kind: "show"; readonly run: ShowRun }
  | { readonly kind: "results"; readonly fresh: FreshResult | null }
  | { readonly kind: "empty" };

/** The results hold the queue this long after they mount: their blocks have come into focus and the ring has counted. */
const SETTLE_MS = 1_500;
/** The sample CV writes itself in under a second (`sample-type-on`). */
const SAMPLE_TYPE_MS = 900;

export function CvScreen(): ReactNode {
  const user = useCurrentUser();
  const brain = useBrainStatus();
  const [phase, setPhase] = useState<Phase>(() => (user?.cv ? { kind: "results", fresh: null } : { kind: "input" }));
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  /** An extraction or request error (spec 3.6). */
  const [error, setError] = useState<CvErrorCode | null>(null);
  /** The chosen file's own rejection (wrong type, too large): the file stays visible with its sentence, and blocks nothing. */
  const [fileError, setFileError] = useState<CvErrorCode | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [emptyText, setEmptyText] = useState("");
  const [settling, setSettling] = useState(false);
  const runSeq = useRef(0);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const focusPaste = useRef(false);

  useOverlayHold("cv-show", phase.kind === "show" || settling);
  useEffect(() => {
    if (!settling) return;
    const timer = window.setTimeout(() => setSettling(false), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [settling]);

  // ── the sample CV writes itself into the paste area, line by line ─────────────────────────────────────────────
  const sample = useMemo(() => sampleCvText(user?.name ?? ""), [user?.name]);
  const sampleUnits = useMemo(() => sample.split(/(?<=\n)/u), [sample]);
  const typed = useTypeOn(sampleUnits, SAMPLE_TYPE_MS, typing);
  useEffect(() => {
    if (!typing || !typed.done) return;
    setText(sample);
    setTyping(false);
  }, [typing, typed.done, sample]);
  const shownText = typing ? typed.value : text;

  const trimmed = text.trim().length;
  const usableFile = file !== null && fileError === null ? file : null;
  const canAnalyse = !typing && !extracting && (usableFile !== null || trimmed >= LIMITS.cvMinChars);
  const showShortHint = usableFile === null && !typing && trimmed > 0 && trimmed < LIMITS.cvMinChars;

  // ── the analysis ──────────────────────────────────────────────────────────────────────────────────────────────
  const start = useCallback((cvText: string, fileName: string | null) => {
    const id = ++runSeq.current;
    let resolve: () => void = () => undefined;
    const ready = new Promise<void>((r) => {
      resolve = r;
    });
    setOutcome(null);
    setPhase({ kind: "show", run: { id, lines: cleanCvLines(cvText), ready, text: cvText, fileName } });
    void analyseCvText({ v: PROTOCOL_VERSION, text: cvText, fileName }).then((response) => {
      let out: Outcome;
      if (!response.ok) out = { kind: "failed" };
      else if (response.analysis.skills.length === 0) out = { kind: "empty", text: cvText };
      else {
        // saved now, before `extract` begins: a reload during the show opens the result, and its news shows once
        const recorded = useAppStore.getState().recordCvAnalysis({ analysis: response.analysis, fileName });
        out = recorded.ok
          ? { kind: "ok", analysis: response.analysis, consequence: recorded.consequence }
          : recorded.reason === "empty"
            ? { kind: "empty", text: cvText }
            : { kind: "failed" };
      }
      if (runSeq.current === id) {
        setOutcome(out);
        if (out.kind === "failed") {
          setError("request_failed");
          setPhase({ kind: "input" });
        } else if (out.kind === "empty") {
          setEmptyText(out.text);
          setPhase({ kind: "empty" });
        }
      }
      resolve();
    });
  }, []);

  const analyse = async () => {
    if (!canAnalyse) return;
    setError(null);
    if (!usableFile) {
      start(text, null);
      return;
    }
    setExtracting(true);
    const extracted = await extractCvFile(usableFile);
    setExtracting(false);
    if (!extracted.ok) {
      setError(extracted.error);
      return;
    }
    start(extracted.text, extracted.fileName);
  };

  const chooseFile = (next: File | null) => {
    setFile(next);
    setTyping(false);
    setError(null);
    setFileError(next ? precheckCvFile(next) : null);
  };

  const playSample = () => {
    setFile(null);
    setFileError(null);
    setError(null);
    setTyping(true);
  };

  const onFinished = useCallback(() => {
    const consequence = outcome?.kind === "ok" ? outcome.consequence : null;
    setSettling(true);
    setPhase({
      kind: "results",
      fresh: consequence
        ? {
            matchBefore: consequence.match.before?.value ?? null,
            xpGained: consequence.xp.gained,
            // skills this analysis added to the collection (a skill with no star before), minus any it took away
            newSkills: consequence.stars.filter((c) => c.before === 0 && c.after > 0).length - consequence.stars.filter((c) => c.before > 0 && c.after === 0).length,
          }
        : { matchBefore: null, xpGained: 0, newSkills: 0 },
    });
  }, [outcome]);

  // a new phase starts at the top of the page; «عدّل النص» lands in the text
  const onPhaseShown = () => {
    window.scrollTo({ top: 0 });
    if (focusPaste.current) {
      focusPaste.current = false;
      pasteRef.current?.focus({ preventScroll: true });
    }
  };

  let content: ReactNode;
  let key: string;
  switch (phase.kind) {
    case "show":
      key = `show-${phase.run.id}`;
      content = (
        <div className="mx-auto w-full max-w-[72rem] px-gutter py-4 @min-[900px]/content:py-5">
          <CvShow onFinished={onFinished} outcome={outcome} run={phase.run} />
        </div>
      );
      break;
    case "results":
      key = "results";
      content = (
        <CvResults
          fresh={phase.fresh}
          onReanalyse={() => {
            setFile(null);
            setFileError(null);
            setError(null);
            setPhase({ kind: "input" });
          }}
        />
      );
      break;
    case "empty":
      key = "empty";
      content = (
        <CvEmpty
          onEdit={() => {
            setFile(null);
            setFileError(null);
            setText(emptyText);
            focusPaste.current = true;
            setPhase({ kind: "input" });
          }}
          onSample={() => {
            setPhase({ kind: "input" });
            playSample();
          }}
        />
      );
      break;
    default:
      key = "input";
      content = (
        <CvInput
          canAnalyse={canAnalyse}
          error={error ?? fileError}
          fileRejected={fileError !== null}
          extracting={extracting}
          file={file}
          onAnalyse={() => void analyse()}
          onFile={chooseFile}
          onRetry={() => void analyse()}
          onSample={playSample}
          onText={(value) => {
            setText(value);
            if (error === "request_failed") setError(null);
          }}
          pasteRef={pasteRef}
          privacyModel={brain?.configured === true}
          showShortHint={showShortHint}
          text={shownText}
          typing={typing}
        />
      );
  }

  return (
    <PageTransition>
      <AnimatePresence initial={false} mode="wait" onExitComplete={onPhaseShown}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: tween.exit }}
          initial={phase.kind === "results" ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          key={key}
          transition={tween.move}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </PageTransition>
  );
}
