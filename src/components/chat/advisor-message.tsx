"use client";
// AdvisorMessage: one turn of «دليل», from "working on it" to the answer, in one place.
//   pending  the glyph beside the message is alive (thinking / working) and the status line rolls through the real steps
//   answer   the glyph settles (done), the status leaves, and the answer comes into focus block by block (80 ms apart):
//            paragraphs and short lists (light markdown), action receipts, then cards rise 12 px, then the reply chips land
// One «دليل» turn = one row: his glyph at the inline-start (the right), the content beside it. The same row serves the
// onboarding conversation (glyph only, no status: the wait is 350-600 ms) and the advisor panel.
// Also here: ActionReceipt («فتحت لك صفحة الوظائف»), MessageCard (the frame for app-drawn cards), ChatError
// («تعذّر الرد الآن» + «أعد المحاولة») and StoppedMark («توقّف الرد»).
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";

import { IconCheck, IconRetry, IconWarning } from "@/components/icons";
import { Collapse, StatusMark } from "@/components/motion";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { focusIn, group, riseBy, staggerStep, tween } from "@/lib/motion";

import { DaleelGlyph, type DaleelState } from "./daleel-glyph";
import { LightBlockView, parseLight } from "./light-text";
import { ReplyChips, type ReplyChip } from "./reply-chips";
import { RollingStatus } from "./rolling-status";

// ------------------------------------------------------------------------------------------------ parts

/** What «دليل» says, in order. Cards are drawn by the app from tool results, never from the model's text (spec 5.5 rule 10). */
export type AdvisorPart =
  | { readonly kind: "text"; readonly text: string; readonly id?: string }
  | { readonly kind: "receipt"; readonly text: string; readonly icon?: ReactNode; readonly state?: "running" | "done"; readonly onOpen?: () => void; readonly testId?: string; readonly id?: string }
  | { readonly kind: "card"; readonly id: string; readonly node: ReactNode };

type Block = { id: string; kind: "text" | "receipt" | "card"; node: ReactNode };

function toBlocks(parts: readonly AdvisorPart[]): Block[] {
  const out: Block[] = [];
  parts.forEach((part, p) => {
    if (part.kind === "text") {
      parseLight(part.text).forEach((block, b) => out.push({ id: `${part.id ?? p}-${b}`, kind: "text", node: <LightBlockView block={block} /> }));
    } else if (part.kind === "receipt") {
      out.push({
        id: part.id ?? `r${p}`,
        kind: "receipt",
        node: (
          <ActionReceipt icon={part.icon} onOpen={part.onOpen} state={part.state} testId={part.testId}>
            {part.text}
          </ActionReceipt>
        ),
      });
    } else out.push({ id: part.id, kind: "card", node: part.node });
  });
  return out;
}

const cardRise = riseBy(12);

// ------------------------------------------------------------------------------------------------ AdvisorMessage

export interface AdvisorMessageProps {
  /** `pending`: «دليل» is working on it (glyph alive, status rolling). `answer` (default): the reply. */
  readonly state?: "pending" | "answer";
  /** While pending: `thinking` (before any tool) or `working` (a tool is running). Default thinking. */
  readonly activity?: "thinking" | "working";
  /** The status line while pending («دليل يفكّر…», then the tool's line). Leave it out for the glyph alone (onboarding). */
  readonly status?: string;
  /** When the work started (ms since epoch), for the elapsed seconds after 4 s. */
  readonly startedAt?: number;
  /** The answer: text (light markdown), receipts and cards, in order. */
  readonly parts?: readonly AdvisorPart[];
  /** Shorthand for one text part. */
  readonly text?: string;
  /** Reply chips under this answer (give them to the last answer only). */
  readonly chips?: readonly ReplyChip[];
  readonly onChip?: (chip: ReplyChip) => void;
  readonly chipsDisabled?: boolean;
  /** The chip being pressed by a script (press frame). */
  readonly pressedChip?: string | null;
  /** The reply was stopped by the user: what arrived stays, with the stopped mark under it. */
  readonly stopped?: boolean;
  /** A saved thread: render at rest, never replay. */
  readonly restored?: boolean;
  /** «دليل» above the first line. Default true. */
  readonly showName?: boolean;
  /** The glyph beside the message. Default true (turn it off for a second message in a row). */
  readonly showGlyph?: boolean;
  readonly className?: string;
  /** data-testid on the row (advisor-message-last, welcome-message-last). */
  readonly testId?: string;
  /** data-testid on the status line while pending (advisor-status). */
  readonly statusTestId?: string;
}

/** «دليل»'s message: pending with a living glyph and a rolling status, then the answer coming into focus. */
export function AdvisorMessage({
  state = "answer",
  activity = "thinking",
  status,
  startedAt,
  parts,
  text,
  chips,
  onChip,
  chipsDisabled = false,
  pressedChip,
  stopped = false,
  restored = false,
  showName = true,
  showGlyph = true,
  className,
  testId,
  statusTestId,
}: AdvisorMessageProps) {
  const all = useMemo<readonly AdvisorPart[]>(() => parts ?? (text ? [{ kind: "text", text }] : []), [parts, text]);
  const blocks = useMemo(() => toBlocks(all), [all]);
  const pending = state === "pending";
  const glyph: DaleelState = pending ? activity : restored ? "idle" : "done";
  const step = staggerStep(blocks.length, 0.08);
  const startDelay = 0.1; // the status line leaves first (150 ms), the first block comes in under it
  const chipsDelay = restored ? 0 : startDelay + step * blocks.length + 0.32;
  // keep the last chips while they fold away
  // (compared by content, so a caller may pass a new array on every render)
  const liveChips = !pending && !!chips && chips.length > 0;
  const chipsKey = liveChips ? chips.map((c) => `${c.id}:${c.label}`).join("|") : "";
  const [kept, setKept] = useState<{ key: string; chips?: readonly ReplyChip[] }>({ key: chipsKey, chips: liveChips ? chips : undefined });
  if (liveChips && chipsKey !== kept.key) setKept({ key: chipsKey, chips });
  const shownChips = liveChips ? chips : kept.chips;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={cn("flex items-start gap-3", className)}
      data-role="daleel"
      data-state={pending ? "pending" : stopped ? "stopped" : "answer"}
      data-testid={testId}
      initial={restored ? false : { opacity: 0 }}
      transition={tween.fast}
    >
      {showGlyph ? <DaleelGlyph framed size={32} state={glyph} /> : <span aria-hidden className="w-8 shrink-0" />}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {showName ? <p className="text-small leading-8 font-semibold text-fg">دليل</p> : null}
        <AnimatePresence initial={!restored} mode="popLayout">
          {pending ? (
            <motion.div className="flex min-h-7 items-center" exit={{ opacity: 0, transition: tween.exit }} key="status">
              {status ? <RollingStatus label={status} startedAt={startedAt} testId={statusTestId} /> : <span className="sr-only">دليل يفكّر…</span>}
            </motion.div>
          ) : (
            <motion.div animate="show" className="flex flex-col gap-3" initial={restored ? false : "hidden"} key="answer" variants={group(step, startDelay) as Variants}>
              {blocks.map((block) => (
                <motion.div className={block.kind === "receipt" ? "flex" : undefined} key={block.id} variants={block.kind === "card" ? cardRise : focusIn}>
                  {block.node}
                </motion.div>
              ))}
              {stopped ? (
                <motion.div variants={focusIn}>
                  <StoppedMark />
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
        {shownChips ? (
          // chips belong to the last answer: when the conversation moves on they fold away (260 ms), nothing jumps
          <Collapse open={liveChips}>
            <ReplyChips chips={shownChips} className="pt-3.5 pb-1" delay={chipsDelay} disabled={chipsDisabled || !liveChips} onPick={onChip} pressedId={pressedChip} restored={restored} />
          </Collapse>
        ) : null}
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ ActionReceipt

export interface ActionReceiptProps {
  /** What «دليل» did, in his voice: «فتحت لك صفحة الوظائف». */
  readonly children: ReactNode;
  /** The page's icon (18 px), for example <IconJobs size={18} />. */
  readonly icon?: ReactNode;
  /** `running` while the tool runs (the arc goes round), `done` (default) when it has happened. */
  readonly state?: "running" | "done";
  /** Opens the page again. Without it the receipt is a plain record. */
  readonly onOpen?: () => void;
  readonly className?: string;
  readonly testId?: string;
}

/** A small record of an action «دليل» performed on the page (page-handoff): the page's icon, the line, a check. */
export function ActionReceipt({ children, icon, state = "done", onOpen, className, testId }: ActionReceiptProps) {
  const body = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-fg">{icon}</span>
      <span className="min-w-0 truncate text-small font-semibold text-fg">{children}</span>
      {state === "running" ? (
        <StatusMark size={18} state="running" />
      ) : (
        <IconCheck aria-hidden className="shrink-0 text-ok-fg" size={18} strokeWidth={2.5} waypoint="off" />
      )}
    </>
  );
  const shell = cn(
    "inline-flex h-10 max-w-full items-center gap-2.5 rounded-full border border-border bg-surface ps-1 pe-3.5",
    onOpen && "transition-[border-color,scale,translate] duration-200 ease-out hover:border-border-strong active:scale-[0.98] active:transition-none",
    className,
  );
  return onOpen ? (
    <button className={shell} data-state={state} data-testid={testId} onClick={onOpen} type="button">
      {body}
    </button>
  ) : (
    <span className={shell} data-state={state} data-testid={testId}>
      {body}
    </span>
  );
}

// ------------------------------------------------------------------------------------------------ MessageCard

export interface MessageCardProps {
  readonly children: ReactNode;
  /** Cards in the thread are clickable and open their page (spec 3.14). */
  readonly onOpen?: () => void;
  readonly className?: string;
  readonly testId?: string;
  /** Accessible name of the button when the content alone is not enough. */
  readonly label?: string;
}

/** The frame of an app-drawn card in the thread (job, course, gap, application, next step): a white sheet, hairline. */
export function MessageCard({ children, onOpen, className, testId, label }: MessageCardProps) {
  const shell = cn("block w-full rounded-card border border-border bg-surface p-4 text-start", className);
  if (!onOpen) {
    return (
      <div className={shell} data-testid={testId}>
        {children}
      </div>
    );
  }
  return (
    <button
      aria-label={label}
      className={cn(shell, "transition-[border-color,scale,translate] duration-200 ease-out hover:border-border-strong active:scale-[0.99] active:transition-none")}
      data-testid={testId}
      onClick={onOpen}
      type="button"
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------------------------------------ ChatError, StoppedMark

export interface ChatErrorProps {
  /** Default «تعذّر الرد الآن. جرّب مرة أخرى.» (spec 3.14). */
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  /** data-testid on «أعد المحاولة» (advisor-retry). */
  readonly retryTestId?: string;
  readonly testId?: string;
  readonly className?: string;
}

/** The error row, on «دليل»'s side: warn colour with the warning icon and words (never the accent), and one retry. */
export function ChatError({ message = "تعذّر الرد الآن. جرّب مرة أخرى.", onRetry, retryLabel = "أعد المحاولة", retryTestId, testId, className }: ChatErrorProps) {
  return (
    <motion.div animate={{ opacity: 1, y: 0 }} className={cn("flex items-start gap-3", className)} data-role="error" data-testid={testId} initial={{ opacity: 0, y: 8 }} role="alert" transition={tween.move}>
      <DaleelGlyph framed size={32} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5 rounded-card border border-border bg-surface p-3.5">
        <p className="flex items-start gap-2 text-small font-medium text-fg">
          <IconWarning className="mt-0.5 shrink-0 text-warn-fg" size={18} waypoint="off" />
          <span>{message}</span>
        </p>
        {onRetry ? (
          <Button data-testid={retryTestId} icon={<IconRetry size={18} />} iconPosition="start" onClick={onRetry} size="sm" variant="secondary">
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Under a reply the user stopped: what arrived stays, and this quiet line says where it ended. */
export function StoppedMark({ label = "توقّف الرد", className }: { readonly label?: string; readonly className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 text-small font-medium text-fg-3", className)} data-role="stopped">
      {/* a small solid stop square (an outline would read as a checkbox) */}
      <span aria-hidden className="size-2 shrink-0 rounded-[2px] bg-fg-3" />
      <span>{label}</span>
    </p>
  );
}
