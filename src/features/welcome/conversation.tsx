"use client";
// Owner: welcome. Phase 1 of /welcome: the onboarding conversation with «دليلك» (spec 3.2, 4; playbook 3.2), with the CV
// step in front of the questions (20 Nov 2026, docs/ONBOARDING-FLOW.md): the greeting offers the CV; a CV is analysed
// INSIDE the chat as «دليلك»'s live card (the /cv show, compact); «دليلك» reacts to what it really holds, fills the
// answers it states clearly and asks for a quick yes; then only the questions left are asked, and the closing line names
// the path the CV and the answers point to. Without a CV: the seven questions, as before.
// Built from the chat kit (ChatThread, AdvisorMessage, UserMessage, Composer, DaleelGlyph) and the game layer (AnswerTiles,
// the profile card). The interpreter is the pure brain script (instant, offline, identical every run); the model only
// classifies an unmapped typed answer (as before) and rephrases «دليلك»'s lines when online (src/lib/brain/onboarding/
// phrase.ts: ≤ 3.5 s, checked, else the template).
//
// Motion moments: greeting-arrival · chip-to-bubble · bubble-pop · answer-focus · slot-fill (in the sheet) · step-tick
// (the StepTrail, in the screen's top bar) · the CV card's show (read, extract, evidence, stars, rings, done).
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AdvisorMessage, ChatThread, Composer, DaleelGlyph, UserMessage, quickReplyId, type ComposerHandle } from "@/components/chat";
import { BadgeEmblem } from "@/components/emblems";
import { IconBranch } from "@/components/icons";
import { WordsIn, type CvStepId } from "@/components/motion";
import { cn, toast } from "@/components/ui";
import { cleanCvLines } from "@/lib/brain/cv";
import { analyseCvText, extractCvFile, precheckCvFile } from "@/lib/brain/cv/client";
import { onboardingContext, onboardingTurn, pendingStep, questionChips, resumeMessages } from "@/lib/brain/onboarding";
import {
  CV_CONFIRM_CHIPS,
  CV_LINES,
  CV_OFFER_CHIPS,
  cvCardText,
  cvConfirmQuestion,
  cvConfirmTurn,
  cvFacts,
  cvNextQuestion,
  cvOfferTurn,
  cvOpeningMessages,
  cvPhase,
  cvReaction,
  cvSkipTurn,
  interestChipsWithCv,
  cvInterestQuestion,
  interestFromCv,
  pathLine,
  saysYes,
  reasonClauses,
  type CvConfirmChip,
  type CvOfferChip,
} from "@/lib/brain/onboarding/cv";
import {
  phraseOnboarding,
  understandOnboarding,
  type OnboardingPhraseRequest,
  type PhraseFacts,
  type PhraseMoment,
  type UnderstandOption,
} from "@/lib/brain/onboarding/phrase";
import { PROTOCOL_VERSION, type CvErrorCode, type OnboardingContext, type OnboardingInput, type OnboardingTurn } from "@/lib/brain/protocol";
import { answerText, xpNewsReason } from "@/lib/copy";
import { ONBOARDING_TIMING, companyAnswerLabel, getBadge, getCompany, getJob, getQuestion, getSkill, sampleCvText } from "@/lib/data";
import { jobMatch, recommend, skillStars } from "@/lib/engine";
import { ASKED_STEP_IDS, QUESTION_IDS, isCompanyId, isFieldId } from "@/lib/ids";
import { focusIn, group, sleep, tween } from "@/lib/motion";
import { selectCurrentUser, useAppStore, useBrainStatus } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { InterestOption, JobId, OnboardingAnswers, OnboardingMessage, OnboardingStepId, QuestionId, RevealReason, UserState } from "@/lib/types";
import { useViewport } from "@/features/shared";
import { CompanyMark } from "@/features/shared/company-mark";
import type { Outcome } from "@/features/cv/cv-show";

import { AnswerTiles, type AnswerOption } from "./answer-tiles";
import { CHAT_COPY, firstNameOf } from "./copy";
import { CvLiveCard, CvSummaryCard, PasteBox, type LiveCv } from "./cv-step";
import { ProfileCard, ProfileRow } from "./profile-trail";
import { FieldIcon } from "./reveal-scenes";
import "./welcome.css";

/** Where each answer sits on screen when the conversation ends: the reveal starts the answers from there. */
export type AnswerRects = Partial<Record<QuestionId, DOMRect>>;

type Row =
  | { readonly kind: "user"; readonly id: string; readonly text: string }
  | { readonly kind: "daleel"; readonly id: string; readonly texts: readonly string[] }
  | { readonly kind: "cv"; readonly id: string };

/** Consecutive lines of «دليلك» are one turn (acknowledgement + next question = two blocks of one message); a CV card is its own turn. */
function rowsOf(thread: readonly OnboardingMessage[]): Row[] {
  const rows: Row[] = [];
  for (const m of thread) {
    const last = rows[rows.length - 1];
    if (m.card === "cv") rows.push({ kind: "cv", id: m.id });
    else if (m.from === "daleel" && last?.kind === "daleel") rows[rows.length - 1] = { ...last, texts: [...last.texts, m.text] };
    else rows.push(m.from === "user" ? { kind: "user", id: m.id, text: m.text } : { kind: "daleel", id: m.id, texts: [m.text] });
  }
  return rows;
}

/** «دليلك» thinks 350-600 ms (spec 4.5), from a deterministic value: the same run looks the same every time. */
function thinkMs(index: number): number {
  const span = ONBOARDING_TIMING.thinkMaxMs - ONBOARDING_TIMING.thinkMinMs + 1;
  return ONBOARDING_TIMING.thinkMinMs + ((index * 131 + 89) % span);
}

/** The CV offer as options the model may pick (a typed «إيه» / «لا»). */
const CV_OFFER_UNDERSTAND: readonly UnderstandOption[] = [
  { id: "yes", label: "إيه، عندي سيرة" },
  { id: "no", label: "لا، ما عندي سيرة الحين" },
];

/** The card's done → the toast and «دليلك»'s reaction. */
const AFTER_CARD_MS = 300;

/**
 * Who wrote each of «دليلك»'s onboarding lines: the model or the template (QA reads `window.__dalilOnb`; the console shows a
 * line per reply). Nothing is sent anywhere.
 */
function logSource(moment: string, source: string, ms: number): void {
  const w = window as typeof window & { __dalilOnb?: { moment: string; source: string; ms: number }[] };
  (w.__dalilOnb ??= []).push({ moment, source, ms: Math.round(ms) });
  console.info(`[dalil] onboarding ${moment}: ${source} in ${Math.round(ms)} ms`);
}

function currentUser(): UserState | null {
  return selectCurrentUser(useAppStore.getState());
}

/** The step «دليلك» is waiting on (null before the greeting and after the last answer; an account that finished before the
 *  company step existed stays finished). */
export function pendingOf(user: UserState): OnboardingStepId | null {
  return pendingStep(user);
}

/** How each of the seven answers prints in «ملفك يتكوّن» (null while unanswered). */
export function stepValues(answers: OnboardingAnswers): Record<OnboardingStepId, string | null> {
  const values = Object.fromEntries(QUESTION_IDS.map((q) => [q, answerText(answers, q)])) as Record<QuestionId, string | null>;
  return { ...values, company: companyAnswerLabel(answers.company) };
}

/** The interest the user's CV leans to (null without a CV read in onboarding). */
function suggestedInterest(user: UserState): InterestOption | null {
  return user.cv && user.onboarding.cv === "analysed" ? interestFromCv(user.cv.skills) : null;
}

/**
 * The CV's stars weigh in the path choice (21 Nov 2026): reveal.tsx passes the same stars to revealData, so «دليلك»
 * names exactly the job the reveal lands on (for the demo both give «محلل بيانات»).
 */
const REVEAL_USES_CV_STARS = true;

/** The job the CV and the answers point to, its real match (with a CV) and why (the engine decides; «دليلك» explains). */
function pathOf(answers: OnboardingAnswers, user: UserState): { readonly job: JobId; readonly match: number | null; readonly reasons: readonly RevealReason[] } {
  const withCv = user.cv !== null && user.onboarding.cv === "analysed";
  const rec = recommend(answers, undefined, withCv && REVEAL_USES_CV_STARS ? skillStars(user) : undefined);
  return { job: rec.recommended, match: withCv ? jobMatch(rec.recommended, user) : null, reasons: rec.reasons };
}

/** The closing line: «دليلك» proposes the path himself (with the CV's real match when there is one) instead of the plain closing. */
function withPathLine(turn: OnboardingTurn, user: UserState): OnboardingTurn {
  if (!turn.done || turn.replies.length === 0) return turn;
  const path = pathOf(turn.answers, user);
  return { ...turn, replies: [...turn.replies.slice(0, -1), pathLine(user.name, path.job, path.match, path.reasons)] };
}

/** The confirm question with the CV's own words for a short experience (recomputed from the saved CV document). */
function confirmAsk(user: UserState): string {
  return cvConfirmQuestion(user.answers, user.cvDocument ? cvFacts(user.cvDocument.lines).experienceNote : undefined);
}

/** The interest question as «دليلك» asks it after a CV: from its real skills (the owner's order), else the usual one. */
function interestAsk(user: UserState): string {
  return (user.cv ? cvInterestQuestion(user.cv.skills, suggestedInterest(user)) : null) ?? getQuestion("interest").text;
}

/** Swaps the plain interest question for the CV-built one (when the interpreter asked it plainly). */
function withInterestHint(turn: OnboardingTurn, user: UserState): OnboardingTurn {
  if (turn.pending !== "interest") return turn;
  const last = turn.replies[turn.replies.length - 1];
  const ask = interestAsk(user);
  if (last !== getQuestion("interest").text || ask === last) return turn;
  return { ...turn, replies: [...turn.replies.slice(0, -1), ask] };
}

/** The facts the model may use for a turn's lines (docs/ONBOARDING-FLOW.md 4), or null when the turn is not rephrased. */
function phraseRequestFor(context: OnboardingContext, turn: OnboardingTurn, user: UserState): OnboardingPhraseRequest | null {
  const recorded = turn.answers !== context.answers || turn.cvStep !== undefined;
  if (!recorded || turn.replies.length === 0 || turn.replies.length > 3) return null;
  // a named company's line carries facts (its job, or where its jobs are): said exactly as the template has it
  if (context.pending === "company" && turn.answers.company !== undefined && turn.answers.company !== "none") return null;
  const facts: { -readonly [K in keyof PhraseFacts]: PhraseFacts[K] } = { answer: turn.userText };
  let moment: PhraseMoment = "ack";
  if (turn.pending !== null) facts.nextQuestion = turn.replies[turn.replies.length - 1];
  if (turn.done) {
    const path = pathOf(turn.answers, user);
    facts.job = getJob(path.job).title;
    if (path.match !== null) facts.match = path.match;
    facts.reasons = reasonClauses(path.reasons);
    moment = "path";
  }
  return { v: PROTOCOL_VERSION, moment, name: firstNameOf(context.name), lines: turn.replies, facts };
}

/**
 * While the CV card reads (until its «خلصت…»), the profile and the step counter show what they showed before it: the
 * CV's answers are recorded with the analysis (before `extract`), but they appear when the card says it is done.
 */
interface HeldProfile {
  readonly answers: OnboardingAnswers;
  readonly slots: readonly OnboardingStepId[];
  /** The step counter's number before the CV. */
  readonly step: number;
}

export function Conversation({
  user,
  onDone,
  onStepHold,
}: {
  readonly user: UserState;
  readonly onDone: (rects: AnswerRects) => void;
  /** The step counter's number to show instead of the live one while the CV card reads (null: the live one). */
  readonly onStepHold?: (step: number | null) => void;
}) {
  const { desktop } = useViewport();
  const brain = useBrainStatus();
  const thread = user.onboarding.thread;
  const pending = pendingOf(user);
  const phase = cvPhase(user);
  const firstName = firstNameOf(user.name);

  // what was already there when the page opened renders at rest (a restored thread never replays)
  const [restored] = useState(() => new Set(thread.map((m) => m.id)));
  const [freshGreeting] = useState(() => thread.length === 0);
  const [optimistic, setOptimistic] = useState<{ id: string; text: string } | null>(null);
  const [thinking, setThinking] = useState<string | null>(() => (thread.length === 0 ? "o-0" : null));
  const [chipsReady, setChipsReady] = useState(() => thread.length > 0);
  const [placeholder, setPlaceholder] = useState<string>(CHAT_COPY.placeholder);
  /** The CV step's screen state: the paste box open, or an analysis running in the chat. */
  const [cvMode, setCvMode] = useState<"idle" | "paste" | "reading">("idle");
  const [live, setLive] = useState<LiveCv | null>(null);
  /** The live card's stage (null before its first), and the profile as it stood before the card. */
  const [cvStage, setCvStage] = useState<CvStepId | null>(null);
  const [held, setHeld] = useState<HeldProfile | null>(null);
  const travel = useRef(new Map<string, string>()); // message id → the chip it travelled from
  const busy = useRef(false);
  const queued = useRef<string | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const finishing = useRef(false);
  const brainOnline = useRef(false);
  brainOnline.current = brain?.mode === "online";

  /** «دليلك»'s lines, rephrased by the model when it answers in time and passes the checks; else the template. */
  const phrased = async (request: OnboardingPhraseRequest | null): Promise<readonly string[] | null> => {
    if (request === null) return null;
    if (!brainOnline.current) {
      logSource(request.moment, "template (offline)", 0);
      return null;
    }
    const t0 = performance.now();
    const lines = await phraseOnboarding(request);
    logSource(request.moment, lines ? "model" : "template", performance.now() - t0);
    return lines;
  };

  // First visit: «دليلك» appears and thinks, then greets and offers the CV (checked inside the timer: Strict Mode's second
  // run adds nothing). Resumed midway: the line «دليلك» is waiting on is asked again, unless it is already the last thing
  // he said (the offer, the reaction and its yes, the pending question).
  const resumed = useRef(false);
  useEffect(() => {
    const now = currentUser();
    if (!now) return;
    if (now.onboarding.thread.length === 0) {
      const timer = window.setTimeout(() => {
        const u = currentUser();
        if (!u || u.onboarding.thread.length > 0) return;
        useAppStore.getState().openOnboardingWithCv(cvOpeningMessages(u.name));
        setThinking(null);
        window.setTimeout(() => {
          setChipsReady(true);
          // an answer typed while «دليلك» was still greeting is played now, right after the greeting (never dropped)
          const early = queued.current;
          queued.current = null;
          if (early) void sendText(early);
        }, 900);
      }, 620);
      return () => window.clearTimeout(timer);
    }
    if (resumed.current) return;
    resumed.current = true;
    const last = now.onboarding.thread[now.onboarding.thread.length - 1];
    if (last?.card === "cv") {
      // reloaded during the card: the analysis is saved; «دليلك» reacts now
      void afterCard(false);
      return;
    }
    const nowPhase = cvPhase(now);
    const ask =
      nowPhase === "offer"
        ? [CV_LINES.offer]
        : nowPhase === "confirm"
          ? [confirmAsk(now)]
          : resumeMessages(onboardingContext(now)).map((line) => (line === getQuestion("interest").text ? interestAsk(now) : line));
    const already = last?.from === "daleel" && ask.length > 0 && ask.every((line) => last.text.endsWith(line));
    if (!already && ask.length > 0) useAppStore.getState().appendOnboardingMessages(ask);
    // the effect runs once per mount; afterCard and sendText read the store, not this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Once the closing line has held for 1.2 s, measure where the answers sit and move to the reveal. */
  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    window.setTimeout(() => {
      const rects: AnswerRects = {};
      document.querySelectorAll<HTMLElement>("[data-welcome-answer]").forEach((el) => {
        const q = el.dataset.welcomeAnswer as QuestionId | undefined;
        if (q && QUESTION_IDS.includes(q)) rects[q] = el.getBoundingClientRect();
      });
      onDone(rects);
    }, ONBOARDING_TIMING.closingHoldMs + 260);
  };

  /**
   * One turn: the bubble at once, «دليلك» thinks, the interpreter (pure) decides, the model may rephrase the words
   * (≤ 3.5 s, checked), then the store applies the turn (thread, answers, slots, the CV step).
   */
  const runTurn = async (compute: (context: OnboardingContext, user: UserState) => Promise<OnboardingTurn> | OnboardingTurn, bubble: string, travelId?: string) => {
    const user0 = currentUser();
    if (!user0 || busy.current) return;
    busy.current = true;
    const context = onboardingContext(user0);
    const n = user0.onboarding.thread.length;
    const userId = `o-${n}`;
    if (travelId) travel.current.set(userId, travelId);
    setOptimistic({ id: userId, text: bubble });
    setChipsReady(false);
    setThinking(`o-${n + 1}`);
    const started = performance.now();
    let turn = await compute(context, user0);
    turn = withPathLine(withInterestHint(turn, user0), user0);
    const lines = await phrased(phraseRequestFor(context, turn, user0));
    if (lines) turn = { ...turn, replies: lines };
    await sleep(Math.max(0, thinkMs(n) - (performance.now() - started)));
    useAppStore.getState().applyOnboardingTurn(turn);
    setOptimistic(null);
    setThinking(null);
    setPlaceholder(CHAT_COPY.placeholder);
    busy.current = false;
    if (turn.done) {
      finish();
      return;
    }
    window.setTimeout(() => setChipsReady(true), 420);
    const next = queued.current;
    queued.current = null;
    if (next) void sendText(next);
  };

  /** A side answer of «دليلك» (a question asked mid-onboarding), then the line he is waiting on, again. */
  const sideTurn = (context: OnboardingContext, userText: string, reply: string, ask: string): OnboardingTurn => ({
    userText,
    replies: [reply, ask],
    answers: context.answers,
    misses: context.misses,
    pending: context.pending,
    chips: null,
    done: false,
    unmapped: null,
  });

  /** «دليلك» reads a typed message with the model (≤ 3.5 s); null offline, on a timeout or an invalid decision. */
  const understand = async (context: OnboardingContext, step: string, question: string, options: readonly UnderstandOption[], text: string, many = false) => {
    if (!brainOnline.current) {
      logSource(`understand:${step}`, "local (offline)", 0);
      return null;
    }
    const t0 = performance.now();
    const result = await understandOnboarding({ v: PROTOCOL_VERSION, step, question, options, many, name: firstNameOf(context.name), text });
    logSource(`understand:${step}`, result ? `model ${result.type}` : "local", performance.now() - t0);
    return result;
  };

  /**
   * The questions: a chip is recorded directly; a TYPED message goes through the model first (owner, 20 Nov 2026: «دليلك»
   * leads): an answer in any words (its ids are checked against the options), or a side question he answers before asking
   * again. The local reader is the guard (it keeps a message that answers several questions at once, and a typed place
   * with its distance) and the fallback (offline, slow, or an invalid decision).
   */
  const questionTurn = async (context: OnboardingContext, input: OnboardingInput): Promise<OnboardingTurn> => {
    let local = onboardingTurn(context, input);
    const pending = context.pending;
    // «إيه» to «…تبي تكمل في الأرقام والبيانات ولا تفكر بمجال ثاني؟» is the field the CV suggested
    const user0 = currentUser();
    const suggested = user0 ? suggestedInterest(user0) : null;
    if (input.kind === "text" && pending === "interest" && suggested !== null && local.answers.interest === undefined && saysYes(input.text)) {
      local = onboardingTurn(context, { kind: "classified", question: "interest", options: [suggested], text: input.text });
      return local;
    }
    if (input.kind !== "text" || pending === null || !brainOnline.current) return local;
    const options = getQuestion(pending).options.filter((o) => !(pending === "city" && o.id === "other"));
    const asked = pending === "interest" && user0 ? interestAsk(user0) : getQuestion(pending).text;
    const understood = await understand(context, pending, asked, options, input.text, pending === "interest");
    const before = Object.keys(context.answers).length;
    const recordedLocally = Object.keys(local.answers).length - before;
    if (understood?.type === "answer") {
      const placeTyped = pending === "city" && local.answers.city !== undefined && local.answers.city !== context.answers.city;
      if (recordedLocally >= 2 || placeTyped) return local;
      const read = onboardingTurn(context, { kind: "classified", question: pending, options: understood.options, text: input.text });
      return read.answers !== context.answers ? read : local;
    }
    if (understood?.type === "question" && recordedLocally === 0) return sideTurn(context, input.text.trim(), understood.reply, asked);
    if (understood === null && local.unmapped) {
      // the model did not answer in time: the one classification of spec 4.5 is not tried again (the user waited already)
      return local;
    }
    return local;
  };

  /** The CV offer, typed: an answer to question 1 skips the CV; a question about the CV is answered, then offered again. */
  const offerTurn = async (context: OnboardingContext, text: string): Promise<OnboardingTurn> => {
    const local = cvOfferTurn(context, text);
    if (local.cvStep?.cv === "skipped" && Object.keys(local.answers).length > Object.keys(context.answers).length) return local;
    const understood = await understand(context, "cv", CV_LINES.offer, CV_OFFER_UNDERSTAND, text);
    if (understood?.type === "question") return sideTurn(context, text.trim(), understood.reply, CV_LINES.offer);
    if (understood?.type === "answer") {
      if (understood.options[0] === "no") return cvSkipTurn(context, text.trim());
      return { ...sideTurn(context, text.trim(), CV_LINES.yesHint, ""), replies: [CV_LINES.yesHint] };
    }
    return local;
  };

  /** The CV's answers, typed: the local reading first (yes, change, a correction); what it cannot read, the model reads. */
  const confirmTurn = async (context: OnboardingContext, user: UserState, slots: readonly OnboardingStepId[], text: string): Promise<OnboardingTurn> => {
    const local = cvConfirmTurn(context, slots, { kind: "text", text }, suggestedInterest(user));
    if (local.replies[0] !== CV_LINES.unclear) return local;
    const ask = confirmAsk(user);
    const understood = await understand(context, "cv-confirm", ask, CV_CONFIRM_CHIPS, text);
    if (understood?.type === "question") return sideTurn(context, text.trim(), understood.reply, ask);
    if (understood?.type === "answer") return cvConfirmTurn(context, slots, { kind: "chip", option: understood.options[0] as CvConfirmChip }, suggestedInterest(user));
    return local;
  };

  const sendText = async (text: string) => {
    const now = currentUser();
    if (!now) return;
    const nowPhase = cvPhase(now);
    if (nowPhase === "offer") return runTurn((context) => offerTurn(context, text), text);
    if (nowPhase === "confirm") {
      const slots = now.onboarding.cvPrefill?.slots ?? [];
      return runTurn((context, u) => confirmTurn(context, u, slots, text), text);
    }
    return runTurn((context) => questionTurn(context, { kind: "text", text }), text);
  };

  // ── The CV in the chat ──────────────────────────────────────────────────────────────────────────────────────────

  /** A CV that could not be read: the user's bubble and «دليلك»'s line, then the offer chips again (nothing saved). */
  const cvProblem = (bubble: string, line: string) => {
    const now = currentUser();
    if (!now) return;
    const context = onboardingContext(now);
    useAppStore.getState().applyOnboardingTurn({
      userText: bubble,
      replies: [line],
      answers: context.answers,
      misses: context.misses,
      pending: context.pending,
      chips: null,
      done: false,
      unmapped: null,
    });
    setOptimistic(null);
    setThinking(null);
    setLive(null);
    setCvMode("idle");
    busy.current = false;
    window.setTimeout(() => setChipsReady(true), 420);
  };

  /** The analysis: the card plays at once (its `read` waits for the result); the result is recorded before `extract`. */
  const startCv = (text: string, fileName: string | null, bubble: string, travelId?: string) => {
    const now = currentUser();
    if (!now) return;
    busy.current = true;
    const n = now.onboarding.thread.length;
    const bubbleId = `o-${n}`;
    const cardId = `o-${n + 1}`;
    if (travelId) travel.current.set(bubbleId, travelId);
    let resolve: () => void = () => undefined;
    const ready = new Promise<void>((r) => {
      resolve = r;
    });
    setChipsReady(false);
    setOptimistic(null);
    setThinking(null);
    setCvMode("reading");
    const before = pendingOf(now);
    setHeld({ answers: now.answers, slots: now.onboarding.cvPrefill?.slots ?? [], step: before ? getQuestion(before).n : ASKED_STEP_IDS.length });
    setCvStage(null);
    setLive({ cardId, bubbleId, bubble, travelId, run: { id: n, lines: cleanCvLines(text), ready, text, fileName }, outcome: null });
    void analyseCvText({ v: PROTOCOL_VERSION, text, fileName }).then((response) => {
      if (!response.ok) {
        resolve();
        cvProblem(bubble, CV_LINES.errors.request_failed);
        return;
      }
      if (response.analysis.skills.length === 0) {
        resolve();
        cvProblem(bubble, CV_LINES.empty);
        return;
      }
      const facts = cvFacts(response.analysis.lines, response.analysis.profile);
      const recorded = useAppStore.getState().recordOnboardingCv({
        analysis: response.analysis,
        fileName,
        bubble,
        cardText: cvCardText(response.analysis.skills.length),
        prefill: facts,
      });
      if (!recorded.ok) {
        resolve();
        cvProblem(bubble, recorded.reason === "empty" ? CV_LINES.empty : CV_LINES.errors.request_failed);
        return;
      }
      const outcome: Outcome = { kind: "ok", analysis: response.analysis, consequence: recorded.consequence };
      setLive((l) => (l && l.cardId === cardId ? { ...l, outcome } : l));
      resolve();
    });
  };

  /**
   * The card has finished (or was restored mid-show): the +100 toast (announced here, so the map's toast is +80 with the
   * level-up), then «دليلك» reacts to what the CV holds and asks for the yes (or the next question).
   */
  const afterCard = async (fresh: boolean) => {
    const now = currentUser();
    if (!now || !now.cv) return;
    busy.current = true;
    const xpEvent = now.xpEvents.find((e) => e.type === "cv_analysed" && !e.announced);
    if (fresh && xpEvent) {
      toast.xp({ amount: xpEvent.amount, reason: xpNewsReason({ eventIds: [xpEvent.id], amount: xpEvent.amount, types: ["cv_analysed"], rankLine: null, levelUp: null }) });
    }
    // its badge («سيرة مقروءة») lands here too, under the XP toast (the map then announces the onboarding and target ones)
    const badges = now.badges.filter((b) => !b.announced && b.id === "cv-scanned").map((b) => b.id);
    if (fresh) {
      for (const id of badges) {
        const badge = getBadge(id);
        toast.badge({ badgeId: id, name: badge.name, description: badge.description, emblem: <BadgeEmblem id={id} /> });
      }
    }
    if (xpEvent || badges.length > 0) useAppStore.getState().markAnnounced({ ...(xpEvent ? { xp: [xpEvent.id] } : {}), badges });
    const n = now.onboarding.thread.length;
    setThinking(`o-${n}`);
    const started = performance.now();
    const skills = now.cv.skills;
    const suggested = suggestedInterest(now);
    const reaction = cvReaction(now.name, skills);
    const next = cvNextQuestion(now.answers, suggested);
    const question = now.onboarding.cvPrefill && !now.onboarding.cvPrefill.confirmed ? confirmAsk(now) : next === getQuestion("interest").text ? interestAsk(now) : next;
    const template = question === null ? [reaction] : [reaction, question];
    const lines = await phrased({
      v: PROTOCOL_VERSION,
      moment: "cv",
      name: firstNameOf(now.name),
      lines: template,
      facts: {
        skills: skills.map((s) => ({ name: getSkill(s.skill).name, stars: s.stars })),
        skillCount: skills.length,
        ...(question ? { nextQuestion: question } : {}),
      },
    });
    await sleep(Math.max(0, thinkMs(n) - (performance.now() - started)));
    useAppStore.getState().appendOnboardingMessages(lines ?? template);
    setThinking(null);
    setLive(null);
    setCvMode("idle");
    busy.current = false;
    window.setTimeout(() => setChipsReady(true), 420);
  };

  const onCardFinished = () => {
    window.setTimeout(() => void afterCard(true), AFTER_CARD_MS);
  };

  const chooseFile = async (file: File | null) => {
    if (!file || busy.current) return;
    const bubble = CV_LINES.bubbleFile(file.name);
    const rejected = precheckCvFile(file);
    if (rejected) {
      cvProblem(bubble, CV_LINES.errors[rejected]);
      return;
    }
    busy.current = true;
    const now = currentUser();
    const n = now?.onboarding.thread.length ?? 0;
    setChipsReady(false);
    setOptimistic({ id: `o-${n}`, text: bubble });
    setThinking(`o-${n + 1}`);
    const extracted = await extractCvFile(file);
    if (!extracted.ok) {
      cvProblem(bubble, CV_LINES.errors[extracted.error as CvErrorCode]);
      return;
    }
    busy.current = false;
    startCv(extracted.text, extracted.fileName, bubble);
  };

  const pickOffer = (option: AnswerOption) => {
    if (busy.current) return;
    const id = option.id as CvOfferChip;
    const now = currentUser();
    if (!now) return;
    if (id === "upload") {
      fileInput.current?.click();
      return;
    }
    if (id === "paste") {
      setCvMode("paste");
      return;
    }
    if (id === "sample") {
      startCv(sampleCvText(now.name), null, CV_LINES.bubbleSample, quickReplyId("cv", "sample"));
      return;
    }
    void runTurn((context) => cvSkipTurn(context, option.label), option.label, quickReplyId("cv", "none"));
  };

  const pickConfirm = (option: AnswerOption) => {
    const now = currentUser();
    if (!now || busy.current) return;
    const slots = now.onboarding.cvPrefill?.slots ?? [];
    void runTurn((context, u) => cvConfirmTurn(context, slots, { kind: "chip", option: option.id as CvConfirmChip }, suggestedInterest(u)), option.label, quickReplyId("cv-confirm", option.id));
  };

  const pick = (option: AnswerOption) => {
    if (!pending || busy.current) return;
    if (pending === "city" && option.id === "other") {
      // «مدينة أخرى» is not sent: the cursor goes to the composer with its own placeholder (spec 4.2)
      setPlaceholder(CHAT_COPY.otherCityPlaceholder);
      composer.current?.focus();
      return;
    }
    void runTurn((context) => questionTurn(context, { kind: "chip", question: pending, option: option.id }), option.label, quickReplyId(pending, option.id));
  };

  const send = (text: string) => {
    const now = currentUser();
    if (!now) return;
    // typed before «دليلك» has greeted (the greeting comes first, spec 4.1): kept and answered right after the greeting
    if (now.onboarding.thread.length === 0) {
      queued.current = text;
      return;
    }
    // nothing is sent after the last answer
    if (pendingStep(now) === null && cvPhase(now) === null) return;
    if (busy.current) {
      queued.current = text;
      return;
    }
    if (cvMode === "paste") setCvMode("idle");
    void sendText(text);
  };

  // ── Drawing ─────────────────────────────────────────────────────────────────────────────────────────────────────

  const rows = useMemo(() => {
    const all = rowsOf(thread);
    if (optimistic && !all.some((r) => r.id === optimistic.id)) all.push({ kind: "user", id: optimistic.id, text: optimistic.text });
    if (live && !all.some((r) => r.id === live.bubbleId)) all.push({ kind: "user", id: live.bubbleId, text: live.bubble });
    if (live && !all.some((r) => r.id === live.cardId)) all.push({ kind: "cv", id: live.cardId });
    return all;
  }, [thread, optimistic, live]);
  const lastDaleel = (() => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i]?.kind === "daleel") return rows[i]?.id;
    return undefined;
  })();
  const suggested = suggestedInterest(user);
  const done = user.onboarding.thread.length > 0 && pendingStep(user) === null && phase === null;
  const reading = cvMode === "reading" || live !== null;
  const asking = phase === null && !reading;
  const chips = asking && pending ? (pending === "interest" ? interestChipsWithCv(user.answers, suggested) : questionChips(pending, user.answers)) : null;
  // the CV card reading: the profile as it was before it, until «خلصت…» (then the CV's answers fill their slots); on a phone
  // the card keeps its own top in view while it reads the paper (`read`, `extract`), so the thread does not follow meanwhile
  const holding = live !== null && cvStage !== "done" ? held : null;
  // phones AND laptops (a 900 px screen shows the same problem): hold the thread so the card's status line stays in view
  const holdThread = live !== null && (cvStage === null || cvStage === "read" || cvStage === "extract");
  const heldStep = holding?.step ?? null;
  useEffect(() => {
    onStepHold?.(heldStep);
  }, [heldStep, onStepHold]);
  useEffect(() => () => onStepHold?.(null), [onStepHold]);
  const values = stepValues(holding ? holding.answers : user.answers);
  const shownSlots = holding ? holding.slots : user.onboarding.cvPrefill?.slots;
  const fromCv = useMemo(() => new Set<OnboardingStepId>(shownSlots ?? []), [shownSlots]);

  // one keyed array, so a message keeps its element from "thinking" to "answer" (the glyph settles in place)
  // «دليلك»'s name and glyph head each group of his turns (a CV card and the reaction under it are one group)
  const followsDaleel = (index: number) => {
    const before = rows[index - 1];
    return before !== undefined && before.kind !== "user";
  };
  const items: ReactNode[] = rows.map((row, index) => {
    if (row.kind === "user") {
      const travelled = travel.current.get(row.id);
      return (
        <UserMessage avatar={user.avatar} entrance={restored.has(row.id) ? "none" : "pop"} key={row.id} layoutId={restored.has(row.id) ? undefined : travelled} name={user.name}>
          {row.text}
        </UserMessage>
      );
    }
    if (row.kind === "cv") {
      const card =
        live && live.cardId === row.id ? (
          <CvLiveCard live={live} onFinished={onCardFinished} onStage={setCvStage} phone />
        ) : user.cv ? (
          <CvSummaryCard skills={user.cv.skills} />
        ) : null;
      return (
        <AdvisorMessage
          key={row.id}
          parts={card ? [{ kind: "card", id: `${row.id}-card`, node: card }] : []}
          restored={restored.has(row.id)}
          showGlyph={!followsDaleel(index)}
          showName={!followsDaleel(index)}
        />
      );
    }
    const last = row.id === lastDaleel && thinking === null;
    if (row.id === "o-0" && freshGreeting) return <Greeting firstName={firstName} key={row.id} last={last} texts={row.texts} />;
    return (
      <AdvisorMessage
        key={row.id}
        parts={[{ kind: "card", id: `${row.id}-say`, node: <SayBubble texts={row.texts} /> }]}
        restored={restored.has(row.id)}
        showGlyph={!followsDaleel(index)}
        showName={!followsDaleel(index)}
        testId={last ? TID.welcome.messageLast : undefined}
      />
    );
  });
  if (thinking === "o-0" && freshGreeting) items.push(<Greeting firstName={firstName} key="o-0" last={false} pending texts={[]} />);
  else if (thinking) items.push(<AdvisorMessage key={thinking} state="pending" status={TYPING} />);

  const tilesOpen = chipsReady && thinking === null && !done && !reading;
  const tileSize = desktop ? "md" : "sm";

  return (
    // a fixed, full-window screen under the top bar: only the thread scrolls. `overflow-clip` (not `hidden`: nothing can
    // scroll it) keeps anything that strays past the screen from making the page taller than the window, so the page
    // itself can never scroll and lift the top bar and the profile card away.
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-clip lg:h-[calc(100dvh-72px)] [html[data-keyboard]_&]:h-[calc(var(--kb-height)-4rem)]">
      {!desktop ? (
        <div className="px-gutter pt-1 pb-3">
          <ProfileRow avatar={user.avatar} fromCv={fromCv} name={user.name} pending={asking ? pending : null} values={values} />
        </div>
      ) : null}
      <div className="mx-auto flex min-h-0 w-full max-w-[72rem] flex-1 gap-10 px-gutter">
        <section aria-labelledby="welcome-heading" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <h1 className="sr-only" id="welcome-heading">
            المحادثة مع دليلك
          </h1>
          {/* `wl-thread` (welcome.css): the slim scroll bar, in the 8 px the thread borrows past the column */}
          <ChatThread
            busy={thinking !== null || reading}
            className="wl-thread -mx-2"
            contentClassName={cn("mx-auto min-h-full w-full max-w-[42rem] justify-end gap-6 px-2", desktop ? "pt-8 pb-6" : "pt-2 pb-4")}
            follow={!holdThread}
            testId={TID.welcome.thread}
          >
            {items}
          </ChatThread>
          <div className={cn("mx-auto flex w-full max-w-[42rem] flex-col gap-3", desktop ? "pt-2 pb-8" : "pt-1 pb-4")}>
            <input
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              data-testid="welcome-cv-file"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                void chooseFile(file);
              }}
              ref={fileInput}
              tabIndex={-1}
              type="file"
            />
            {phase === "offer" && cvMode === "paste" && !reading ? (
              <PasteBox
                onAnalyse={(text) => startCv(text, null, CV_LINES.bubblePaste)}
                onBack={() => setCvMode("idle")}
              />
            ) : phase === "offer" ? (
              <AnswerTiles
                disabled={thinking !== null || reading}
                label="سيرتك الذاتية"
                onPick={pickOffer}
                open={tilesOpen}
                options={CV_OFFER_CHIPS.map((o) => ({ id: o.id, label: o.label, testId: `welcome-chip-cv-${o.id}` }))}
                question="cv"
                size={tileSize}
              />
            ) : phase === "confirm" ? (
              <AnswerTiles
                disabled={thinking !== null || reading}
                label="تأكيد ما فهمته من سيرتك"
                onPick={pickConfirm}
                open={tilesOpen}
                options={CV_CONFIRM_CHIPS.map((o) => ({ id: o.id, label: o.label, testId: `welcome-chip-cv-confirm-${o.id}` }))}
                question="cv-confirm"
                size={tileSize}
              />
            ) : chips ? (
              <AnswerTiles
                disabled={thinking !== null}
                onPick={pick}
                open={tilesOpen}
                options={chips.options.map((o) => ({
                  id: o.id,
                  label: o.label,
                  testId: TID.welcome.chip(chips.question, o.id),
                  // the field emblems ride on the desktop pieces; on a phone they would cost the list a fourth line
                  icon:
                    desktop && chips.question === "interest" ? (
                      <InterestIcon option={o.id} size={20} />
                    ) : chips.question === "company" && isCompanyId(o.id) ? (
                      // the companies carry their logo (a monogram when there is none), on a phone too: it is the name
                      <CompanyMark company={getCompany(o.id)} size={desktop ? 20 : 18} />
                    ) : undefined,
                }))}
                question={chips.question}
                // a phone holds the ten majors in three lines (spec 3.2 Phone): the pieces are the small size there,
                // and the long lists tighten their padding a little
                size={tileSize}
                tight={!desktop && chips.options.length >= 7}
                tileFaceClassName={chips.options.length >= 7 ? (desktop ? "px-3.5" : "px-2 font-medium") : undefined}
              />
            ) : null}
            <Composer
              disabled={done || reading}
              disabledHint={placeholder}
              keyHint={desktop ? undefined : null}
              maxLength={300}
              onSend={send}
              placeholder={placeholder}
              ref={composer}
              testIds={{ input: TID.welcome.input, send: TID.welcome.send }}
            />
          </div>
        </section>
        {desktop ? (
          <aside className="w-[21.25rem] shrink-0 pt-8">
            <ProfileCard avatar={user.avatar} fromCv={fromCv} name={user.name} pending={asking ? pending : null} values={values} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** The thinking state's label (owner, 21 Nov 2026: «دليلك»'s replies must be easy to see). */
const TYPING = "دليلك يكتب…";

/** The line of a turn that asks something: the last one ending with «؟» (shown semibold, so the user sees what to answer). */
function questionIndex(texts: readonly string[]): number {
  for (let i = texts.length - 1; i >= 0; i--) if (/[؟?]\s*$/.test(texts[i] ?? "")) return i;
  return -1;
}

/**
 * «دليلك»'s words as a calm bubble (owner, 21 Nov 2026: "the agent's response is kind of not visible"): a light card with a
 * visible border, readable text, and the question line in semibold. No gradient, no wash.
 */
function SayBubble({ texts, children }: { readonly texts: readonly string[]; readonly children?: ReactNode }) {
  const q = questionIndex(texts);
  return (
    <div className="w-fit max-w-full rounded-card rounded-ss-md border-[1.5px] border-border-strong bg-surface px-4 py-3 text-fg" data-testid="welcome-daleel-bubble">
      {children ?? (
        <div className="flex flex-col gap-2">
          {texts.map((text, i) => (
            <p className={cn("text-body leading-7", i === q && "font-semibold")} key={i}>
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** «الاهتمام» answers carry their field's emblem (the fields of the catalogue); «لم أحدّد بعد» stands at a fork. */
function InterestIcon({ option, size }: { readonly option: string; readonly size: number }) {
  if (isFieldId(option)) return <FieldIcon field={option} size={size} />;
  return <IconBranch size={size} waypoint="muted" />;
}

/**
 * greeting-arrival: «دليلك» appears and thinks (the glyph alone), then his first line arrives word by word with the
 * user's name emphasised, and the second comes into focus. Drawn exactly as an AdvisorMessage row.
 */
function Greeting({ texts, firstName, pending = false, last }: { readonly texts: readonly string[]; readonly firstName: string; readonly pending?: boolean; readonly last: boolean }) {
  const [first, ...rest] = texts;
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
      data-role="daleel"
      data-state={pending ? "pending" : "answer"}
      data-testid={last ? TID.welcome.messageLast : undefined}
      initial={{ opacity: 0, y: 8 }}
      transition={tween.move}
    >
      <DaleelGlyph framed size={32} state={pending ? "thinking" : "done"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-small leading-8 font-semibold text-fg">دليلك</p>
        {pending ? (
          <span className="flex min-h-7 items-center text-small text-fg-2">{TYPING}</span>
        ) : (
          <SayBubble texts={texts}>
            <motion.div animate="show" className="flex flex-col gap-2" initial="hidden" variants={group(0.6, 0.05)}>
              {first ? (
                <motion.p className="text-body leading-7" variants={{ hidden: { opacity: 1 }, show: { opacity: 1 } }}>
                  <WordsIn text={first} wordClassName={(word) => (word.startsWith(firstName) ? "inline-block font-semibold" : undefined)} />
                </motion.p>
              ) : null}
              {rest.map((text, i) => (
                <motion.p className={cn("text-body leading-7", /[؟?]\s*$/.test(text) && "font-semibold")} key={i} variants={focusIn}>
                  {text}
                </motion.p>
              ))}
            </motion.div>
          </SayBubble>
        )}
      </div>
    </motion.div>
  );
}
