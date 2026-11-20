"use client";
// Owner: welcome. Phase 1 of /welcome: the onboarding conversation with «دليل» (spec 3.2, 4; playbook 3.2).
// Built from the chat kit (ChatThread, AdvisorMessage, UserMessage (SentBubble), Composer, DaleelGlyph) and the game
// layer: the quick replies are AnswerTiles (./answer-tiles, the kit's chip-to-bubble contract), the profile card is a
// character sheet (./profile-trail). The interpreter is the pure brain script (instant, offline, identical every run); the
// one model-assisted step (classifying an unmapped typed answer, 2.5 s) runs only when the brain is online (spec 4.5).
//
// Motion moments: greeting-arrival (the glyph appears and thinks, the first line arrives word by word with the name
// emphasised, the second comes into focus) · chip-to-bubble (the tapped piece sinks home in ink, then travels into the
// thread and becomes the bubble, the others leave) · bubble-pop (a typed answer pops from the composer) · answer-focus (the
// acknowledgement and the next question come into focus as two blocks) · slot-fill (in the sheet) · step-tick (the
// StepTrail's stop pops, in the screen's top bar).
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AdvisorMessage, ChatThread, Composer, DaleelGlyph, UserMessage, quickReplyId, type ComposerHandle } from "@/components/chat";
import { IconBranch } from "@/components/icons";
import { WordsIn } from "@/components/motion";
import { cn } from "@/components/ui";
import { classifyOnboarding } from "@/lib/brain/client";
import { onboardingContext, onboardingTurn, openingMessages, pendingQuestion, questionChips, resumeMessages } from "@/lib/brain/onboarding";
import { PROTOCOL_VERSION, type OnboardingInput } from "@/lib/brain/protocol";
import { answerText } from "@/lib/copy";
import { ONBOARDING_TIMING } from "@/lib/data";
import { QUESTION_IDS, isFieldId } from "@/lib/ids";
import { focusIn, group, sleep, tween } from "@/lib/motion";
import { selectCurrentUser, useAppStore, useBrainStatus } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { OnboardingMessage, QuestionId, UserState } from "@/lib/types";
import { useViewport } from "@/features/shared";

import { AnswerTiles, type AnswerOption } from "./answer-tiles";
import { CHAT_COPY, firstNameOf } from "./copy";
import { ProfileCard, ProfileRow } from "./profile-trail";
import { FieldIcon } from "./reveal-scenes";

/** Where each answer sits on screen when the conversation ends: the reveal starts the answers from there. */
export type AnswerRects = Partial<Record<QuestionId, DOMRect>>;

type Row =
  | { readonly kind: "user"; readonly id: string; readonly text: string }
  | { readonly kind: "daleel"; readonly id: string; readonly texts: readonly string[] };

/** Consecutive lines of «دليل» are one turn (acknowledgement + next question = two blocks of one message). */
function rowsOf(thread: readonly OnboardingMessage[]): Row[] {
  const rows: Row[] = [];
  for (const m of thread) {
    const last = rows[rows.length - 1];
    if (m.from === "daleel" && last?.kind === "daleel") rows[rows.length - 1] = { ...last, texts: [...last.texts, m.text] };
    else rows.push(m.from === "user" ? { kind: "user", id: m.id, text: m.text } : { kind: "daleel", id: m.id, texts: [m.text] });
  }
  return rows;
}

/** «دليل» thinks 350-600 ms (spec 4.5), from a deterministic value: the same run looks the same every time. */
function thinkMs(index: number): number {
  const span = ONBOARDING_TIMING.thinkMaxMs - ONBOARDING_TIMING.thinkMinMs + 1;
  return ONBOARDING_TIMING.thinkMinMs + ((index * 131 + 89) % span);
}

function currentUser(): UserState | null {
  return selectCurrentUser(useAppStore.getState());
}

/** The question «دليل» is waiting on (null before the greeting and after the sixth answer). */
export function pendingOf(user: UserState): QuestionId | null {
  return user.onboarding.thread.length === 0 ? null : pendingQuestion(user.answers);
}

export function Conversation({ user, onDone }: { readonly user: UserState; readonly onDone: (rects: AnswerRects) => void }) {
  const { desktop } = useViewport();
  const brain = useBrainStatus();
  const thread = user.onboarding.thread;
  const pending = pendingOf(user);
  const firstName = firstNameOf(user.name);

  // what was already there when the page opened renders at rest (a restored thread never replays)
  const [restored] = useState(() => new Set(thread.map((m) => m.id)));
  const [freshGreeting] = useState(() => thread.length === 0);
  const [optimistic, setOptimistic] = useState<{ id: string; text: string } | null>(null);
  const [thinking, setThinking] = useState<string | null>(() => (thread.length === 0 ? "o-0" : null));
  const [chipsReady, setChipsReady] = useState(() => thread.length > 0);
  const [placeholder, setPlaceholder] = useState<string>(CHAT_COPY.placeholder);
  const travel = useRef(new Map<string, string>()); // message id → the chip it travelled from
  const busy = useRef(false);
  const queued = useRef<string | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const finishing = useRef(false);

  // First visit: «دليل» appears and thinks, then greets (checked inside the timer: Strict Mode's second run adds nothing).
  // Resumed midway: the pending question is asked again, unless it is already the last thing «دليل» said.
  const resumed = useRef(false);
  useEffect(() => {
    const now = currentUser();
    if (!now) return;
    if (now.onboarding.thread.length === 0) {
      const timer = window.setTimeout(() => {
        const u = currentUser();
        if (!u || u.onboarding.thread.length > 0) return;
        useAppStore.getState().appendOnboardingMessages(openingMessages(u.name));
        setThinking(null);
        window.setTimeout(() => setChipsReady(true), 900);
      }, 620);
      return () => window.clearTimeout(timer);
    }
    if (resumed.current) return;
    resumed.current = true;
    const ask = resumeMessages(onboardingContext(now));
    const last = now.onboarding.thread[now.onboarding.thread.length - 1];
    const already = last?.from === "daleel" && ask.length > 0 && ask.every((line) => last.text.endsWith(line));
    if (!already && ask.length > 0) useAppStore.getState().appendOnboardingMessages(ask);
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

  /** One turn: the bubble at once, «دليل» thinks, then the store applies the interpreted turn (thread, answers, slot). */
  const runTurn = async (input: OnboardingInput, bubble: string, travelId?: string) => {
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
    let turn = onboardingTurn(context, input);
    if (turn.unmapped && brain?.mode === "online" && input.kind === "text") {
      const answer = await classifyOnboarding({ v: PROTOCOL_VERSION, question: turn.unmapped.question, text: turn.unmapped.text });
      if (answer.type === "classified") turn = onboardingTurn(context, { kind: "classified", question: answer.question, options: answer.options, text: input.text });
    }
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
    if (next) void runTurn({ kind: "text", text: next }, next);
  };

  const pick = (option: AnswerOption) => {
    if (!pending || busy.current) return;
    if (pending === "city" && option.id === "other") {
      // «مدينة أخرى» is not sent: the cursor goes to the composer with its own placeholder (spec 4.2)
      setPlaceholder(CHAT_COPY.otherCityPlaceholder);
      composer.current?.focus();
      return;
    }
    void runTurn({ kind: "chip", question: pending, option: option.id }, option.label, quickReplyId(pending, option.id));
  };

  const send = (text: string) => {
    const now = currentUser();
    // nothing is sent before «دليل» has greeted (the greeting comes first, spec 4.1) or after the sixth answer
    if (!now || now.onboarding.thread.length === 0 || pendingQuestion(now.answers) === null) return;
    if (busy.current) {
      queued.current = text;
      return;
    }
    void runTurn({ kind: "text", text }, text);
  };

  const rows = useMemo(() => {
    const all = rowsOf(thread);
    if (optimistic && !all.some((r) => r.id === optimistic.id)) all.push({ kind: "user", id: optimistic.id, text: optimistic.text });
    return all;
  }, [thread, optimistic]);
  const lastDaleel = (() => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i]?.kind === "daleel") return rows[i]?.id;
    return undefined;
  })();
  const chips = pending ? questionChips(pending, user.answers) : null;
  const values = Object.fromEntries(QUESTION_IDS.map((q) => [q, answerText(user.answers, q)])) as Record<QuestionId, string | null>;
  const done = pendingQuestion(user.answers) === null;

  // one keyed array, so a message keeps its element from "thinking" to "answer" (the glyph settles in place)
  const items: ReactNode[] = rows.map((row) => {
    if (row.kind === "user") {
      const travelled = travel.current.get(row.id);
      return (
        <UserMessage avatar={user.avatar} entrance={restored.has(row.id) ? "none" : "pop"} key={row.id} layoutId={restored.has(row.id) ? undefined : travelled} name={user.name}>
          {row.text}
        </UserMessage>
      );
    }
    const last = row.id === lastDaleel && thinking === null;
    if (row.id === "o-0" && freshGreeting) return <Greeting firstName={firstName} key={row.id} last={last} texts={row.texts} />;
    return (
      <AdvisorMessage
        key={row.id}
        parts={row.texts.map((text, i) => ({ kind: "text", text, id: `${row.id}-${i}` }))}
        restored={restored.has(row.id)}
        testId={last ? TID.welcome.messageLast : undefined}
      />
    );
  });
  if (thinking === "o-0" && freshGreeting) items.push(<Greeting firstName={firstName} key="o-0" last={false} pending texts={[]} />);
  else if (thinking) items.push(<AdvisorMessage key={thinking} state="pending" />);

  return (
    // a fixed, full-window screen under the top bar: only the thread scrolls. `overflow-clip` (not `hidden`: nothing can
    // scroll it) keeps anything that strays past the screen from making the page taller than the window, so the page
    // itself can never scroll and lift the top bar and the profile card away.
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-clip lg:h-[calc(100dvh-72px)]">
      {!desktop ? (
        <div className="px-gutter pt-1 pb-3">
          <ProfileRow avatar={user.avatar} name={user.name} pending={pending} values={values} />
        </div>
      ) : null}
      <div className="mx-auto flex min-h-0 w-full max-w-[72rem] flex-1 gap-10 px-gutter">
        <section aria-labelledby="welcome-heading" className="flex min-h-0 min-w-0 flex-1 flex-col">
          <h1 className="sr-only" id="welcome-heading">
            المحادثة مع دليل
          </h1>
          <ChatThread
            busy={thinking !== null}
            className="-mx-2"
            contentClassName={cn("mx-auto min-h-full w-full max-w-[42rem] justify-end gap-6 px-2", desktop ? "pt-8 pb-6" : "pt-2 pb-4")}
            testId={TID.welcome.thread}
          >
            {items}
          </ChatThread>
          <div className={cn("mx-auto flex w-full max-w-[42rem] flex-col gap-3", desktop ? "pt-2 pb-8" : "pt-1 pb-4")}>
            {chips ? (
              <AnswerTiles
                disabled={thinking !== null}
                onPick={pick}
                open={chipsReady && thinking === null && !done}
                options={chips.options.map((o) => ({
                  id: o.id,
                  label: o.label,
                  testId: TID.welcome.chip(chips.question, o.id),
                  // the field emblems ride on the desktop pieces; on a phone they would cost the list a fourth line
                  icon: desktop && chips.question === "interest" ? <InterestIcon option={o.id} size={20} /> : undefined,
                }))}
                question={chips.question}
                // a phone holds the ten majors in three lines (spec 3.2 Phone): the pieces are the small size there,
                // and the long lists tighten their padding a little
                size={desktop ? "md" : "sm"}
                tight={!desktop && chips.options.length >= 7}
                tileFaceClassName={chips.options.length >= 7 ? (desktop ? "px-3.5" : "px-2 font-medium") : undefined}
              />
            ) : null}
            <Composer
              disabled={done}
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
            <ProfileCard avatar={user.avatar} name={user.name} pending={pending} values={values} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** «الاهتمام» answers carry their field's emblem (the fields of the catalogue); «لم أحدّد بعد» stands at a fork. */
function InterestIcon({ option, size }: { readonly option: string; readonly size: number }) {
  if (isFieldId(option)) return <FieldIcon field={option} size={size} />;
  return <IconBranch size={size} waypoint="muted" />;
}

/**
 * greeting-arrival: «دليل» appears and thinks (the glyph alone), then his first line arrives word by word with the
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
        <p className="text-small leading-8 font-semibold text-fg">دليل</p>
        {pending ? (
          <span className="sr-only">دليل يفكّر…</span>
        ) : (
          <motion.div animate="show" className="flex flex-col gap-3" initial="hidden" variants={group(0.6, 0.05)}>
            {first ? (
              <motion.p className="text-body text-fg" variants={{ hidden: { opacity: 1 }, show: { opacity: 1 } }}>
                <WordsIn text={first} wordClassName={(word) => (word.startsWith(firstName) ? "inline-block font-semibold" : undefined)} />
              </motion.p>
            ) : null}
            {rest.map((text, i) => (
              <motion.p className="text-body text-fg" key={i} variants={focusIn}>
                {text}
              </motion.p>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
