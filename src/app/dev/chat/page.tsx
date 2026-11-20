"use client";
// /dev/chat: the chat-kit gallery (owned by the chat-kit agent).
// (b) first, because it is the point: a SCRIPTED CONVERSATION in a 420 px panel, played with timers and no network
//     («شغّل», data-testid="chat-play"). After it ends the panel stays live: type, pick a chip, press Stop.
// (a) then every piece in its states: the glyph, the status line, messages, the composer, quick replies, the typed field,
//     and the pieces on the stage.
// Sample people and companies are invented (spec 9.3, 9.7); «خالد» is the demo persona of spec 10.
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ActionReceipt,
  AdvisorMessage,
  AttachChip,
  ChatError,
  ChatThread,
  Composer,
  DaleelGlyph,
  MessageCard,
  QuickReplies,
  ReplyChips,
  RollingStatus,
  StoppedMark,
  TypedField,
  UserMessage,
  quickReplyId,
  type AdvisorPart,
  type ComposerHandle,
  type DaleelState,
  type QuickReplyOption,
  type ReplyChip,
} from "@/components/chat";
import { IconClock, IconClose, IconCourses, IconJobs, IconLessons, IconNewChat, IconPath, IconPlay, IconRetry } from "@/components/icons";
import { graphemes, Ring, StatusMark } from "@/components/motion";
import { Button, IconButton, SampleTag, Stage, XpValue } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { sleep } from "@/lib/motion";

// ------------------------------------------------------------------------------------------------ sample content

const ME = { name: "خالد", avatar: "av-10" } as const;

const CITY: readonly QuickReplyOption[] = [
  { id: "riyadh", label: "الرياض", testId: "chat-chip-city-riyadh" },
  { id: "jeddah", label: "جدة", testId: "chat-chip-city-jeddah" },
  { id: "dammam", label: "الدمام", testId: "chat-chip-city-dammam" },
  { id: "makkah", label: "مكة المكرمة", testId: "chat-chip-city-makkah" },
  { id: "madinah", label: "المدينة المنورة", testId: "chat-chip-city-madinah" },
  { id: "other", label: "مدينة أخرى", testId: "chat-chip-city-other" },
];

const GREETING =
  "أهلاً خالد، أنا دليل، دليلك إلى وظيفتك. سأكون معك من أول خطوة إلى آخرها.\n\nأسألك ستة أسئلة قصيرة لأرسم لك مساراً يناسبك أنت. نبدأ: في أي مدينة أنت الآن؟";

function JobCard({ title = "محلل بيانات", company = "وادي الغيم للبيانات", city = "الرياض", match = 70 }: { title?: string; company?: string; city?: string; match?: number }) {
  return (
    <MessageCard onOpen={() => undefined} testId="advisor-card-job-data-analyst-riyadh">
      <span className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="text-title text-fg">{title}</span>
          <span className="text-small text-fg-2">
            {company} · {city}
          </span>
          <SampleTag className="mt-0.5" kind="company" />
        </span>
        <Ring size={56} value={match} />
      </span>
    </MessageCard>
  );
}

function CourseCard() {
  return (
    <MessageCard onOpen={() => undefined} testId="advisor-card-course-c-powerbi-1">
      <span className="flex flex-col items-start gap-2">
        <span className="text-small font-semibold text-accent-fg">الخطوة التالية في مسارك</span>
        <span className="text-title text-fg">
          أساسيات <bdi>Power BI</bdi>: من البيانات إلى لوحة المعلومات
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-fg-2">
          <span className="inline-flex items-center gap-1.5">
            <IconClock size={16} waypoint="off" />
            10 ساعات
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconLessons size={16} waypoint="off" />5 دروس
          </span>
          <XpValue gain size="sm" value={200} />
        </span>
        <span className="text-small text-fg-2">
          ترفع مطابقتك من <bdi dir="ltr">70%</bdi> إلى <bdi className="font-semibold text-fg" dir="ltr">90%</bdi>
        </span>
      </span>
    </MessageCard>
  );
}

const ANSWER_JOBS: readonly AdvisorPart[] = [
  {
    kind: "text",
    text: "تمام، الرياض. وهناك أيضاً فرص عن بُعد إن أحببت.\n\nوجدت وظيفتين في الرياض تناسبان البدايات. الأقرب لمهاراتك «محلل بيانات» بمطابقة **70%**. وللعلم: كل الوظائف هنا بيانات تجريبية.",
  },
  { kind: "receipt", id: "rc", text: "فتحت لك صفحة الوظائف", icon: <IconJobs size={18} />, onOpen: () => undefined, testId: "advisor-receipt-jobs" },
  { kind: "card", id: "job", node: <JobCard /> },
];
const CHIPS_JOBS: readonly ReplyChip[] = [
  { id: "why-match", label: "لماذا هذه المطابقة؟", testId: "advisor-chip-why-match" },
  { id: "open-path", label: "افتح مساري", testId: "advisor-chip-open-path" },
];

const QUESTION_NEXT = "ماذا أفعل الآن؟";
const ANSWER_NEXT: readonly AdvisorPart[] = [
  {
    kind: "text",
    text: "خطوتك التالية دورة **أساسيات Power BI**:\n- 10 ساعات و5 دروس\n- تعطيك +200 XP\n- ترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%\n\nأفتحها لك؟",
  },
  { kind: "card", id: "course", node: <CourseCard /> },
];
const CHIPS_NEXT: readonly ReplyChip[] = [
  { id: "open-course", label: "افتح الدورة", testId: "advisor-confirm-yes" },
  { id: "not-now", label: "ليس الآن", testId: "advisor-confirm-no" },
];

const FALLBACK_CHIPS: readonly ReplyChip[] = [
  { id: "next-step", label: "ماذا أفعل الآن؟", testId: "advisor-chip-next-step" },
  { id: "open-path", label: "افتح مساري", testId: "advisor-chip-open-path" },
  { id: "why-match", label: "لماذا هذه المطابقة؟", testId: "advisor-chip-why-match" },
];

/** A tiny scripted brain for the gallery only (the real one is the router of spec 5.7). */
type Canned = { status: string[]; parts: readonly AdvisorPart[]; chips?: readonly ReplyChip[] };
function cannedFor(intent: string): Canned {
  switch (intent) {
    case "next-step":
      return { status: ["دليل يفكّر…", "أراجع مسارك…"], parts: ANSWER_NEXT, chips: CHIPS_NEXT };
    case "why-match":
      return {
        status: ["دليل يفكّر…", "أحسب المطابقة…"],
        parts: [
          {
            kind: "text",
            text: "الوظيفة تطلب خمس مهارات، وكل واحدة تساوي 20%. المكتملة عندك: Excel و SQL والتواصل الفعّال (60%). الإحصاء: عندك نجمة من نجمتين (10%). ولا نجوم بعد في: Power BI (0%).\n\nالمجموع **70%**، ودورة «أساسيات Power BI» توصلك إلى 90%.",
          },
        ],
        chips: [{ id: "next-step", label: "ماذا أفعل الآن؟", testId: "advisor-chip-next-step" }],
      };
    case "open-path":
      return {
        status: ["دليل يفكّر…", "أفتح الصفحة…"],
        parts: [
          { kind: "receipt", id: "rp", text: "فتحت لك مساري", icon: <IconPath size={18} />, onOpen: () => undefined },
          { kind: "text", text: "تفضّل، هذا مسارك. أنت عند المرحلة 7 من 8، والتالية Power BI." },
        ],
      };
    case "open-course":
      return {
        status: ["دليل يفكّر…", "أفتح الصفحة…"],
        parts: [
          { kind: "receipt", id: "rcrs", text: "فتحت لك «أساسيات Power BI»", icon: <IconCourses size={18} />, onOpen: () => undefined },
          { kind: "text", text: "تفضّل، فتحت لك «أساسيات Power BI». خمسة دروس، وبعدها تصعد مطابقتك إلى 90%. بالتوفيق." },
        ],
      };
    case "not-now":
      return { status: [], parts: [{ kind: "text", text: "تمام، متى ما أحببت." }] };
    default:
      return {
        status: ["دليل يفكّر…"],
        parts: [{ kind: "text", text: "هذه خارج ما أستطيعه هنا. أنا دليلك إلى وظيفتك: أدلّك على خطوتك التالية، أو أفتح لك صفحة، أو أشرح مطابقتك." }],
        chips: FALLBACK_CHIPS,
      };
  }
}
function intentOf(text: string): string {
  if (/أفعل|أسوي|اسوي|التالية|التالي/.test(text)) return "next-step";
  if (/مطابق/.test(text)) return "why-match";
  if (/مسار/.test(text)) return "open-path";
  if (/دورة|الدورة/.test(text)) return "open-course";
  return "fallback";
}

// ------------------------------------------------------------------------------------------------ the scripted panel

type DaleelTurn = {
  id: string;
  who: "daleel";
  state: "pending" | "answer";
  activity: "thinking" | "working";
  status?: string;
  startedAt?: number;
  parts: readonly AdvisorPart[];
  chips?: readonly ReplyChip[];
  stopped?: boolean;
  restored?: boolean;
};
type UserTurn = { id: string; who: "user"; text: string; travel?: string; restored?: boolean };
type ErrorTurn = { id: string; who: "error"; retry: string };
type Turn = DaleelTurn | UserTurn | ErrorTurn;

/** The conversation at rest, as the script leaves it (what the panel shows before «شغّل»). */
const RESTED: readonly Turn[] = [
  { id: "r1", who: "daleel", state: "answer", activity: "thinking", parts: [{ kind: "text", text: GREETING }], restored: true },
  { id: "r2", who: "user", text: "الرياض", restored: true },
  { id: "r3", who: "daleel", state: "answer", activity: "working", parts: ANSWER_JOBS, restored: true },
  { id: "r4", who: "user", text: QUESTION_NEXT, restored: true },
  { id: "r5", who: "daleel", state: "answer", activity: "working", parts: ANSWER_NEXT, chips: CHIPS_NEXT, restored: true },
];

class Cancelled extends Error {}

/** A cancellable script: every `wait` throws once a newer run (or the unmount) has started. */
function useScript() {
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );
  const start = useCallback((body: (wait: (ms: number) => Promise<void>, current: () => boolean) => Promise<void>) => {
    run.current += 1;
    const id = run.current;
    const current = () => run.current === id;
    const wait = async (ms: number) => {
      await sleep(ms);
      if (!current()) throw new Cancelled();
    };
    void body(wait, current).catch((error: unknown) => {
      if (!(error instanceof Cancelled)) throw error;
    });
  }, []);
  const cancel = useCallback(() => {
    run.current += 1;
  }, []);
  return { start, cancel };
}

function ScriptedPanel({ children }: { children: ReactNode }) {
  const [stepLabel, onStep] = useState("في وضع السكون");
  const [turns, setTurns] = useState<readonly Turn[]>(RESTED);
  const [question, setQuestion] = useState<{ id: string; options: readonly QuickReplyOption[]; open: boolean } | null>(null);
  const [pressedChoice, setPressedChoice] = useState<string | null>(null);
  const [pressedChip, setPressedChip] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [responding, setResponding] = useState(false);
  const [typing, setTyping] = useState(false);
  const [playing, setPlaying] = useState(false);
  const composer = useRef<ComposerHandle>(null);
  const counter = useRef(0);
  const script = useScript();
  const reply = useScript();
  const nextId = () => `t${(counter.current += 1)}`;

  const patch = useCallback((id: string, change: Partial<DaleelTurn>) => {
    setTurns((all) => all.map((t) => (t.id === id && t.who === "daleel" ? { ...t, ...change } : t)));
  }, []);

  /** «دليل» answers: pending (glyph, then the status steps), then the answer. Returns when the answer is in. */
  const answer = useCallback(
    async (wait: (ms: number) => Promise<void>, canned: Canned) => {
      const id = nextId();
      setResponding(true);
      setTurns((all) => [...all, { id, who: "daleel", state: "pending", activity: "thinking", status: canned.status[0], startedAt: Date.now(), parts: [] }]);
      if (canned.status.length === 0) await wait(520); // the onboarding wait: the glyph alone
      for (const [i, line] of canned.status.entries()) {
        if (i > 0) patch(id, { status: line, activity: "working" });
        await wait(i === 0 ? 1250 : 1450);
      }
      patch(id, { state: "answer", parts: canned.parts, chips: canned.chips });
      setResponding(false);
      return id;
    },
    [patch],
  );

  const play = () => {
    reply.cancel();
    setPlaying(true);
    script.start(async (wait, current) => {
      try {
        setTurns([]);
        setQuestion(null);
        setDraft("");
        setResponding(false);
        onStep("«دليل» يرحّب ويسأل");
        await wait(450);
        // 1. the greeting and the first onboarding question: the glyph alone thinks (350-600 ms), then it focuses in
        const g = nextId();
        setTurns([{ id: g, who: "daleel", state: "pending", activity: "thinking", parts: [] }]);
        await wait(520);
        patch(g, { state: "answer", parts: [{ kind: "text", text: GREETING }] });
        await wait(800);
        setQuestion({ id: "city", options: CITY, open: true });
        await wait(1500);
        // 2. a chip is picked: it travels into the thread and becomes the bubble; the others leave
        onStep("اختيار «الرياض»: الشريحة تصير فقاعة");
        setPressedChoice("riyadh");
        await wait(170);
        setPressedChoice(null);
        setQuestion((q) => (q ? { ...q, open: false } : q));
        setTurns((all) => [...all, { id: nextId(), who: "user", text: "الرياض", travel: quickReplyId("city", "riyadh") }]);
        await wait(700);
        // 3. the status line rolls through two steps while the glyph seeks, then sweeps
        onStep("الحالة تتدحرج والبوصلة تبحث");
        await answer(wait, { status: ["دليل يفكّر…", "أبحث في الوظائف…"], parts: ANSWER_JOBS, chips: CHIPS_JOBS });
        onStep("الجواب يتّضح: إيصال وبطاقة ورقائق");
        await wait(2300);
        // 4. a typed question sent from the composer
        onStep("سؤال مكتوب يُرسل من المحرّر");
        composer.current?.focus();
        await wait(380);
        const units = graphemes(QUESTION_NEXT);
        for (let i = 1; i <= units.length; i++) {
          setDraft(units.slice(0, i).join(""));
          await wait(70);
        }
        await wait(450);
        composer.current?.send();
        await wait(380);
        onStep("الجواب الثاني: فقرة وقائمة وبطاقة دورة");
        await answer(wait, { status: ["دليل يفكّر…", "أراجع مسارك…"], parts: ANSWER_NEXT, chips: CHIPS_NEXT });
        await wait(1800);
        onStep("انتهى. اكتب أو اختر رقاقة لتجرّب بنفسك");
      } finally {
        if (current()) setPlaying(false);
      }
    });
  };

  // after the script: the panel is live
  const respondTo = (intent: string) => {
    reply.start(async (wait) => {
      await wait(360);
      await answer(wait, cannedFor(intent));
    });
  };

  const onSend = (text: string) => {
    setTurns((all) => [...all, { id: nextId(), who: "user", text }]);
    setDraft("");
    if (!playing) respondTo(intentOf(text));
  };

  const onChip = (chip: ReplyChip) => {
    if (responding) return;
    setPressedChip(chip.id);
    window.setTimeout(() => {
      setPressedChip(null);
      setTurns((all) => [...all, { id: nextId(), who: "user", text: chip.label }]);
      respondTo(chip.id);
    }, 160);
  };

  const onPick = (option: QuickReplyOption) => {
    setQuestion((q) => (q ? { ...q, open: false } : q));
    setTurns((all) => [...all, { id: nextId(), who: "user", text: option.label, travel: quickReplyId("city", option.id) }]);
    respondTo("open-path");
  };

  const stop = () => {
    script.cancel();
    reply.cancel();
    setPlaying(false);
    setResponding(false);
    setTurns((all) => all.map((t) => (t.who === "daleel" && t.state === "pending" ? { ...t, state: "answer", stopped: true, parts: [], chips: undefined } : t)));
  };

  const showError = () => {
    script.cancel();
    reply.cancel();
    setPlaying(false);
    setResponding(false);
    setTurns((all) => [...all.filter((t) => !(t.who === "daleel" && t.state === "pending")), { id: nextId(), who: "user", text: "وش أسوي الحين؟" }, { id: nextId(), who: "error", retry: "next-step" }]);
  };

  const retry = (id: string, intent: string) => {
    setTurns((all) => all.filter((t) => t.id !== id));
    respondTo(intent);
  };

  const reset = () => {
    script.cancel();
    reply.cancel();
    setPlaying(false);
    setResponding(false);
    setQuestion(null);
    setDraft("");
    setTurns(RESTED);
    onStep("في وضع السكون");
  };

  const lastDaleel = (() => {
    for (let i = turns.length - 1; i >= 0; i--) if (turns[i]?.who === "daleel") return i;
    return -1;
  })();

  return (
    <section aria-labelledby="script-h" className="flex flex-col-reverse items-center gap-8 lg:flex-row-reverse lg:items-start" data-testid="section-script">
      {/* the panel, as it will sit in the product: 420 px, the sheet radius, the one floating shadow */}
      <section
        aria-label="دليل"
        className="flex h-[680px] w-full max-w-[420px] shrink-0 flex-col overflow-hidden rounded-sheet border border-border bg-surface shadow-float lg:h-[680px]"
        data-testid="chat-panel"
      >
        <header className="flex items-center gap-3 border-b border-border py-3 ps-4 pe-2">
          <DaleelGlyph framed size={40} state={typing ? "listening" : "idle"} />
          <div className="min-w-0 flex-1">
            <p className="text-title leading-6 text-fg">دليل</p>
            <p className="text-small text-fg-3">دليلك إلى وظيفتك</p>
          </div>
          <IconButton icon={<IconNewChat size={20} />} label="محادثة جديدة" onClick={reset} />
          <IconButton icon={<IconClose size={20} />} label="إغلاق" />
        </header>
        <p className="border-b border-border px-4 py-2 text-caption text-fg-3" data-state="local" data-testid="advisor-mode">
          وضع محلي: دليل يعمل دون اتصال.
        </p>
        <ChatThread busy={responding} testId="advisor-thread">
          {turns.map((t, i) => {
            if (t.who === "user") {
              return (
                <UserMessage avatar={ME.avatar} entrance={t.restored ? "none" : "pop"} key={t.id} layoutId={t.travel} name={ME.name}>
                  {t.text}
                </UserMessage>
              );
            }
            if (t.who === "error") {
              return <ChatError key={t.id} onRetry={() => retry(t.id, t.retry)} retryTestId="advisor-retry" />;
            }
            return (
              <AdvisorMessage
                activity={t.activity}
                chips={i === lastDaleel && i === turns.length - 1 ? t.chips : undefined}
                chipsDisabled={responding}
                key={t.id}
                onChip={onChip}
                parts={t.parts}
                pressedChip={pressedChip}
                restored={t.restored}
                startedAt={t.startedAt}
                state={t.state}
                status={t.status}
                statusTestId="advisor-status"
                stopped={t.stopped}
                testId={i === lastDaleel ? "advisor-message-last" : undefined}
              />
            );
          })}
        </ChatThread>
        <div className="flex flex-col gap-3 px-3 pt-1 pb-3">
          {question ? (
            <QuickReplies
              className="px-1"
              disabled={responding}
              onPick={onPick}
              open={question.open}
              options={question.options}
              pressedId={pressedChoice}
              question={question.id}
            />
          ) : null}
          <Composer
            onSend={onSend}
            onStop={stop}
            onTypingChange={setTyping}
            onValueChange={setDraft}
            ref={composer}
            responding={responding}
            testIds={{ input: "advisor-input", send: "advisor-send", stop: "advisor-stop" }}
            value={draft}
          />
        </div>
      </section>

      <div className="flex w-full max-w-xl flex-col gap-4 lg:pt-6">
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <Button data-testid="chat-play" icon={<IconPlay size={20} />} iconPosition="start" onClick={play}>
            شغّل
          </Button>
          <Button data-testid="chat-reset" icon={<IconRetry size={20} />} iconPosition="start" onClick={reset} variant="secondary">
            أعد الضبط
          </Button>
          <Button data-testid="chat-error" onClick={showError} size="md" variant="ghost">
            أظهر خطأ
          </Button>
        </div>
        <p aria-live="polite" className="flex items-center gap-2 text-small font-semibold text-fg" data-testid="chat-step">
          <IconPlay size={16} waypoint="off" />
          {stepLabel}
        </p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ gallery frame

function Section({ id, title, note, children, className }: { id: string; title: string; note: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-h`} className={cn("flex flex-col gap-5 border-t border-border pt-10", className)} data-testid={`section-${id}`}>
      <div className="flex max-w-3xl flex-col gap-1">
        <h2 className="text-h2 text-fg" id={`${id}-h`}>
          {title}
        </h2>
        <p className="text-body text-fg-2">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Tile({ label, children, className, testId }: { label: ReactNode; children: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border border-border bg-surface p-5", className)} data-testid={testId}>
      <p className="text-start text-caption text-fg-3" dir="auto">
        {label}
      </p>
      {children}
    </div>
  );
}

function useReplay(): [number, () => void] {
  const [n, setN] = useState(0);
  return [n, useCallback(() => setN((v) => v + 1), [])];
}

function ReplayButton({ onClick, testId, children = "أعد" }: { onClick: () => void; testId: string; children?: ReactNode }) {
  return (
    <Button className="self-start" data-testid={testId} icon={<IconRetry size={18} />} iconPosition="start" onClick={onClick} size="sm" variant="ghost">
      {children}
    </Button>
  );
}

// ------------------------------------------------------------------------------------------------ (a) the glyph

const STATES: readonly { state: DaleelState; label: string; note: string }[] = [
  { state: "idle", label: "idle", note: "ساكن، يشير إلى العلامة" },
  { state: "listening", label: "listening", note: "التفاتة صغيرة: المستخدم يكتب" },
  { state: "thinking", label: "thinking", note: "الإبرة تبحث وتستقر، كل 2.4 ث" },
  { state: "working", label: "working", note: "أداة تعمل: مسح ثابت" },
  { state: "done", label: "done", note: "تستقر مع تجاوز صغير واحد" },
];

function GlyphLab() {
  const [state, setState] = useState<DaleelState>("idle");
  const [settles, setSettles] = useState(0);
  const script = useScript();
  const sequence = () => {
    script.start(async (wait) => {
      setState("idle");
      await wait(700);
      setState("listening");
      await wait(1400);
      setState("thinking");
      await wait(4800);
      setState("working");
      await wait(3600);
      setState("done");
      await wait(1600);
    });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Tile label="Transition lab: one glyph, every state change (48 px framed, 32 px bare)" testId="glyph-lab">
        <div className="flex items-center justify-center gap-10 py-6" data-testid="glyph-lab-stage">
          <DaleelGlyph framed onSettled={() => setSettles((n) => n + 1)} size={48} state={state} />
          <DaleelGlyph size={32} state={state} />
          <span className="inline-flex items-center gap-2 text-small font-medium text-fg">
            <DaleelGlyph size={20} state={state} />
            <span className="w-20 text-start text-fg-2" data-testid="glyph-lab-state" data-value={state}>
              {state}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATES.map((s) => (
            <Button data-testid={`glyph-set-${s.state}`} key={s.state} onClick={() => setState(s.state)} size="sm" variant={state === s.state ? "primary" : "secondary"}>
              {s.label}
            </Button>
          ))}
          <Button data-testid="glyph-sequence" icon={<IconPlay size={18} />} iconPosition="start" onClick={sequence} size="sm" variant="ghost">
            تسلسل كامل
          </Button>
        </div>
        <p className="text-small text-fg-3" data-testid="glyph-settles" data-value={settles}>
          استقرّت {settles} مرة
        </p>
      </Tile>
      <Tile label="The five states, live: 16 · 20 beside a line of text · 24 · 32 framed · 48 framed">
        <div className="flex flex-col divide-y divide-border" data-testid="glyph-states">
          {STATES.map((s) => (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3 first:pt-0 last:pb-0" key={s.state}>
              <div className="flex w-44 flex-col">
                <span className="inline-flex items-center gap-2 text-small font-semibold text-fg">
                  <DaleelGlyph size={20} state={s.state} />
                  <bdi dir="ltr">{s.label}</bdi>
                </span>
                <span className="text-caption text-fg-3">{s.note}</span>
              </div>
              <div className="flex items-center gap-4">
                <DaleelGlyph size={16} state={s.state} />
                <DaleelGlyph size={24} state={s.state} />
                <DaleelGlyph framed size={32} state={s.state} />
                <DaleelGlyph framed size={48} state={s.state} />
              </div>
            </div>
          ))}
        </div>
      </Tile>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ (a) the status line

const APPLY_STEPS = ["دليل يفكّر…", "أفتح نموذج التقديم…", "أكتب بياناتك…", "أرسل الطلب…"];

function StatusDemo() {
  const [run, replay] = useReplay();
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const timers = APPLY_STEPS.slice(1).map((_, k) => window.setTimeout(() => setI(k + 1), 1700 * (k + 1)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [run]);
  const glyph: DaleelState = i === 0 ? "thinking" : "working";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tile label="Live: the steps roll; the seconds fade in after 4 s («دليل يقدّم عنك»)" testId="status-live">
        <div className="flex min-h-12 items-center">
          <RollingStatus glyph={glyph} key={run} label={APPLY_STEPS[i] ?? ""} testId="advisor-status" />
        </div>
        <ReplayButton onClick={replay} testId="status-play">
          أعد التسلسل
        </ReplayButton>
      </Tile>
      <Tile label="The same line inside «دليل»'s message (the glyph sits beside the message)">
        <AdvisorMessage activity="working" key={run} startedAt={undefined} state="pending" status="أبحث في الوظائف…" />
        <AdvisorMessage activity="thinking" state="pending" />
        <p className="text-caption text-fg-3">Without a status: the onboarding wait (350-600 ms), the glyph alone.</p>
      </Tile>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ (a) messages

function MessagesDemo() {
  const [run, replay] = useReplay();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Tile label="An answer coming into focus: paragraph, list, receipt, card (rises 12 px), chips (pop)" testId="messages-answer">
        <div className="flex flex-col gap-5" key={run}>
          <UserMessage avatar={ME.avatar} name={ME.name}>
            {QUESTION_NEXT}
          </UserMessage>
          <AdvisorMessage chips={CHIPS_NEXT} parts={ANSWER_NEXT} />
        </div>
        <ReplayButton onClick={replay} testId="messages-play" />
      </Tile>
      <div className="flex flex-col gap-4">
        <Tile label="Receipts: done (default), running, and as a link back to the page">
          <div className="flex flex-col items-start gap-2.5">
            <ActionReceipt icon={<IconJobs size={18} />}>فتحت لك صفحة الوظائف</ActionReceipt>
            <ActionReceipt icon={<IconPath size={18} />} state="running">
              أفتح مساري…
            </ActionReceipt>
            <ActionReceipt icon={<IconCourses size={18} />} onOpen={() => undefined}>
              فتحت لك «أساسيات Power BI»
            </ActionReceipt>
          </div>
        </Tile>
        <Tile label="Error row with «أعد المحاولة», and a stopped reply" testId="messages-error">
          <div className="flex flex-col gap-5">
            <ChatError onRetry={() => undefined} retryTestId="advisor-retry" />
            <AdvisorMessage parts={[{ kind: "text", text: "خطوتك التالية دورة «أساسيات Power BI»: 10 ساعات، تعطيك" }]} showName={false} stopped />
            <StoppedMark />
          </div>
        </Tile>
        <Tile label="User messages: a long one wraps; an English one runs left to right; restored at rest">
          <div className="flex flex-col gap-3">
            <UserMessage avatar="av-06" entrance="none" name="سارة">
              أبي أعرف وش أقرب وظيفة لي في جدة، وهل أحتاج دورة قبل ما أقدّم؟
            </UserMessage>
            <UserMessage avatar="av-06" entrance="none" name="سارة">
              open my path
            </UserMessage>
          </div>
        </Tile>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ (a) the composer

function ComposerDemo() {
  const [sent, setSent] = useState<string[]>([]);
  const [file, setFile] = useState<string | undefined>(undefined);
  const [responding, setResponding] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Tile label="Live: focus springs the pill open; Enter sends; Shift+Enter adds a line; Esc closes the empty card" testId="composer-live">
        <div className="flex min-h-40 flex-col justify-end gap-3 rounded-control bg-bg p-3" data-testid="composer-live-area">
          <div className="flex flex-col gap-2">
            {sent.slice(-2).map((text, i) => (
              <UserMessage key={`${sent.length}-${i}`} name={ME.name}>
                {text}
              </UserMessage>
            ))}
          </div>
          <Composer
            attachment={<AttachChip fileName={file} onAttach={() => setFile("Khaled-CV.pdf")} onRemove={() => setFile(undefined)} testId="composer-attach" />}
            onSend={(text) => {
              setSent((all) => [...all, text]);
              setResponding(true);
              window.setTimeout(() => setResponding(false), 1800);
            }}
            onStop={() => setResponding(false)}
            responding={responding}
            testIds={{ input: "composer-live-input", send: "composer-live-send", stop: "composer-live-stop" }}
          />
        </div>
        <p className="text-caption text-fg-3">After a send the round button is Stop for 1.8 s (as while «دليل» answers), then the arrow returns from below.</p>
      </Tile>
      <div className="flex flex-col gap-4">
        <Tile label="Closed (the pill) · onboarding placeholder">
          <Composer onSend={() => undefined} placeholder="اكتب إجابتك أو اختر من الخيارات…" />
        </Tile>
        <Tile label="Open with text (it stays open while it has text) · grows to six lines, then scrolls">
          <Composer onSend={() => undefined} value={"قدّم لي على وظيفة محلل بيانات\nوأرسل لي رقم الطلب"} />
        </Tile>
        <Tile label="Responding: the button is Stop (إيقاف)">
          <Composer onSend={() => undefined} responding />
        </Tile>
        <Tile label="Disabled, with its hint">
          <Composer disabled disabledHint="دليل يملأ الطلب الآن. لحظات وينتهي." onSend={() => undefined} />
        </Tile>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ (a) quick replies

function QuickRepliesDemo() {
  const [picked, setPicked] = useState<QuickReplyOption | null>(null);
  const [run, replay] = useReplay();
  const [travel, setTravel] = useState(true);
  return (
    <Tile label="Pick a chip: it travels into the thread and becomes the bubble; the others leave" testId="quick-demo">
      <div className="flex h-[380px] max-w-[420px] flex-col overflow-hidden rounded-card border border-border bg-surface" key={run}>
        <ChatThread label="مثال الأسئلة">
          {[
            <AdvisorMessage key="q" parts={[{ kind: "text", text: "في أي مدينة أنت الآن؟" }]} restored />,
            ...(picked
              ? [
                  <UserMessage avatar={ME.avatar} key="a" layoutId={travel ? quickReplyId("city-demo", picked.id) : undefined} name={ME.name}>
                    {picked.label}
                  </UserMessage>,
                ]
              : []),
          ]}
        </ChatThread>
        <div className="px-4 pt-1 pb-4">
          <QuickReplies onPick={setPicked} open={picked === null} options={CITY} question="city-demo" travel={travel} />
          {picked ? <p className="py-2 text-small text-fg-3">تمّ: «{picked.label}»</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ReplayButton
          onClick={() => {
            setPicked(null);
            replay();
          }}
          testId="quick-reset"
        />
        <Button onClick={() => setTravel((t) => !t)} size="sm" variant="ghost">
          {travel ? "الرحلة مفعّلة" : "بدون رحلة (الاحتياط)"}
        </Button>
      </div>
    </Tile>
  );
}

// ------------------------------------------------------------------------------------------------ (a) the typed field (apply flow)

const NOTE = "أتقدّم لوظيفة محلل بيانات لدى وادي الغيم للبيانات. مطابقتي الحالية مع متطلبات الوظيفة 90%، وأبرز ما لديّ: Excel و SQL و Power BI. وأعمل الآن على استكمال: الإحصاء.";
type ApplyStep = "idle" | "open" | "name" | "city" | "degree" | "note" | "send" | "done" | "stopped";

function ApplyDemo() {
  const [step, setStep] = useState<ApplyStep>("idle");
  const [values, setValues] = useState({ name: "", city: "", degree: "", note: "" });
  const [pressed, setPressed] = useState(false);
  const script = useScript();
  const set = (key: keyof typeof values) => (v: string) => setValues((all) => ({ ...all, [key]: v }));
  const fill = () => {
    script.start(async (wait) => {
      setValues({ name: "", city: "", degree: "", note: "" });
      setStep("open");
      await wait(500);
      setStep("name");
      await wait(400);
      setStep("city");
      await wait(400);
      setStep("degree");
      await wait(400);
      setStep("note");
      await wait(2000);
      setStep("send");
      setPressed(true);
      await wait(180);
      setPressed(false);
      await wait(1400);
      setStep("done");
    });
  };
  const stop = () => {
    script.cancel();
    setStep("stopped");
  };
  const status = step === "open" ? "أفتح نموذج التقديم…" : step === "send" ? "أرسل الطلب…" : "أكتب بياناتك…";
  const busy = step !== "idle" && step !== "done" && step !== "stopped";
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Tile label="«دليل» fills the real form while the user watches: letters for fields, words for the note" testId="apply-demo">
        <div className="flex flex-col gap-4">
          <div className="flex min-h-8 items-center gap-3">
            {busy ? <RollingStatus glyph={step === "open" ? "thinking" : "working"} label={status} /> : null}
            {step === "done" ? (
              <span className="inline-flex items-center gap-2 text-small font-semibold text-fg" data-testid="apply-done">
                <StatusMark appear size={22} state="done" />
                أرسلت الطلب برقم <bdi dir="ltr">DL-2026-0001</bdi>
              </span>
            ) : null}
            {step === "stopped" ? <StoppedMark label="أوقفت التقديم. الطلب أمامك إن أحببت أن تكمله بنفسك." /> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TypedField filling={step === "name"} formValue={values.name} label="الاسم" onValueChange={set("name")} testId="apply-name" value="خالد" />
            <TypedField filling={step === "city"} formValue={values.city} label="المدينة" onValueChange={set("city")} testId="apply-city" value="الرياض" />
          </div>
          <TypedField filling={step === "degree"} formValue={values.degree} label="المؤهل والتخصص" onValueChange={set("degree")} testId="apply-degree" value="بكالوريوس · نظم معلومات إدارية" />
          <TypedField by="words" filling={step === "note"} formValue={values.note} label="رسالة التقديم" ms={2000} multiline onValueChange={set("note")} testId="apply-note" value={NOTE} />
          <div className="flex items-center gap-3">
            <Button data-testid="apply-send" disabled={step !== "send" && step !== "stopped"} loading={step === "send" && !pressed} pressed={pressed}>
              {step === "send" ? "جارٍ الإرسال…" : "أرسل الطلب"}
            </Button>
            {busy && step !== "send" ? (
              <Button data-testid="apply-stop" onClick={stop} size="md" variant="secondary">
                إيقاف
              </Button>
            ) : null}
          </div>
        </div>
      </Tile>
      <Tile label="Play it">
        <p className="text-body text-fg-2">
          الحقول تكتب نفسها بالترتيب، وعلامة «دليل» الصغيرة تنتقل من حقل إلى حقل، ثم يُضغط زر الإرسال أمامك. «إيقاف» أثناء الكتابة يُبقي ما كُتب ويجعله قابلاً للتعديل.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="apply-play" icon={<IconPlay size={20} />} iconPosition="start" onClick={fill} variant="secondary">
            دع دليل يقدّم عنك
          </Button>
        </div>
        <p className="text-caption text-fg-3" data-testid="apply-step" data-value={step}>
          step: {step}
        </p>
      </Tile>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ (a) on the stage

function StageDemo() {
  return (
    <Stage className="grid gap-6 rounded-sheet p-6 md:grid-cols-2" contour="faint" data-testid="stage-demo">
      <div className="relative flex flex-col gap-5">
        <p className="text-caption text-fg-3">On the stage every piece flips by itself (no colour props)</p>
        <div className="flex items-center gap-4">
          <DaleelGlyph framed size={40} state="thinking" />
          <DaleelGlyph size={28} state="working" />
          <RollingStatus glyph="thinking" label="دليل يرسم مسارك…" />
        </div>
        <UserMessage avatar={ME.avatar} entrance="none" name={ME.name}>
          افتح مساري
        </UserMessage>
        <AdvisorMessage parts={[{ kind: "text", text: "مسارك جاهز يا خالد. نبدأ بـ **Power BI**؟" }, { kind: "receipt", text: "فتحت لك مساري", icon: <IconPath size={18} /> }]} restored />
      </div>
      <div className="relative flex flex-col justify-end gap-4">
        <ReplyChips chips={CHIPS_NEXT} restored />
        <Composer onSend={() => undefined} placeholder="اسأل دليل عن مسارك…" />
        <Composer onSend={() => undefined} responding />
      </div>
    </Stage>
  );
}

// ------------------------------------------------------------------------------------------------ page

export default function ChatGallery() {
  const sides = useMemo(
    () => (
      <ul className="flex flex-col gap-2 text-body text-fg-2">
        <li>
          <b className="font-semibold text-fg">الجانبان:</b> «دليل» يتكلّم من بداية السطر (اليمين) ومعه بوصلته؛ رسائل المستخدم في نهايته (اليسار) ومعها صورته، في جهة زر الإرسال الذي تخرج منه.
        </li>
        <li>
          <b className="font-semibold text-fg">ما يتحرّك:</b> الفقاعة تقفز من زاوية الإرسال، الحالة تتدحرج والضوء يمرّ عليها، الإبرة تبحث ثم تستقر، والجواب يتّضح كتلةً كتلة.
        </li>
        <li>
          <b className="font-semibold text-fg">بلا شبكة:</b> كل ما في اللوحة نص مكتوب مسبقاً بمؤقّتات. بعد انتهاء العرض اكتب أو اختر رقاقة.
        </li>
      </ul>
    ),
    [],
  );
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1280px] flex-col gap-10 bg-bg px-gutter py-8" data-testid="chat-gallery">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-fg-3" dir="ltr">
          /dev/chat · chat kit · Dalilak
        </p>
        <h1 className="text-h1 text-fg">عُدّة المحادثة</h1>
        <p className="max-w-3xl text-body text-fg-2">قطع المحادثة التي تبني محادثة التعارف ولوحة «دليل»: بوصلته الحيّة، سطر الحالة، الفقاعات، المحرّر، الرقائق، والحقل الذي يكتبه بنفسه.</p>
      </header>

      {/* (b) the scripted conversation */}
      <ScriptedPanel>
        <h2 className="text-h2 text-fg" id="script-h">
          محادثة مسجّلة في لوحة بعرض 420
        </h2>
        <p className="text-body text-fg-2">سؤال من التعارف برقائق، اختيار رقاقة، سطر حالة بخطوتين والبوصلة تبحث، جواب يتّضح مع إيصال ورقائق، ثم سؤال مكتوب من المحرّر وجواب ثانٍ.</p>
        {sides}
      </ScriptedPanel>

      <Section id="glyph" note="بوصلة «دليل»: الإبرة تشير إلى العلامة في فتحة الحلقة. هي الجزء الوحيد الذي يتحرّك، وحلقتها الدائرة هي إحدى الحلقات الخمس المسموحة." title="DaleelGlyph">
        <GlyphLab />
      </Section>

      <Section id="status" note="سطر عمل واحد: الخطوة الجديدة تصعد من تحت والقديمة تخرج للأعلى، والضوء يمرّ من اليمين إلى اليسار. بعد 4 ثوانٍ يظهر العدّاد. لا نقاط أبداً." title="RollingStatus">
        <StatusDemo />
      </Section>

      <Section id="messages" note="UserMessage و AdvisorMessage: الجواب يصل كتلة كتلة ويتّضح من الضباب، والبطاقات ترتفع بعد النص، والرقائق تحطّ أخيراً. نص خفيف فقط: فقرات وقوائم وخط عريض، دون أي HTML." title="Messages">
        <MessagesDemo />
      </Section>

      <Section id="composer" note="حبّة تنفتح بطاقةً عند التركيز وتكبر مع النص، وزر دائري واحد يتبدّل بين الإرسال والإيقاف. سهم الإرسال يعود من الأسفل بعد كل إرسال." title="Composer">
        <ComposerDemo />
      </Section>

      <Section id="quick" note="QuickReplies: رقائق سؤال التعارف. الرقاقة المختارة نفسها تنتقل إلى المحادثة وتصبح فقاعة المستخدم." title="QuickReplies">
        <QuickRepliesDemo />
      </Section>

      <Section id="typed" note="TypedField: حقل حقيقي يملؤه «دليل» أمام المستخدم في التقديم، بمؤشّر يومض وعلامة صغيرة تنتقل بين الحقول." title="TypedField">
        <ApplyDemo />
      </Section>

      <Section id="stage" note="القطع نفسها على المسرح الداكن، كما في عرض الدخول." title="On the stage">
        <StageDemo />
      </Section>

      <motion.footer className="pb-10 text-caption text-fg-3" dir="ltr">
        Tokens only · no network · reduced motion: loops stand still, travel is instant, fades stay.
      </motion.footer>
    </main>
  );
}
