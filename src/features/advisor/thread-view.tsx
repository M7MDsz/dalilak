"use client";
// Owner: advisor. The rows of the thread: the saved messages (the app store), the turn in flight, and the session-only
// rows (an error with «أعد المحاولة», a reply stopped before any word).
// The turn in flight is rendered by the SAME component, under the SAME key, as the message it becomes (the message id
// starts with the turn's id), so React keeps one row and the chat kit's AdvisorMessage turns from "working" (living
// glyph, rolling status) into the answer coming into focus, instead of one row vanishing and another appearing.
// Messages already in the thread when the panel first mounted render at rest; everything that arrives afterwards moves.
import { memo, useMemo, useState, type ReactElement } from "react";

import { AdvisorMessage, ChatError, UserMessage, type AdvisorPart, type ReplyChip } from "@/components/chat";
import { useCurrentUser, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { AdvisorMessage as ThreadMessage, Chip } from "@/lib/types";

import { AdvisorCardView, cardKey, type CardActions } from "./cards";
import { useElapsedStart, useLive, type LiveNote, type LiveTurn } from "./live";
import { baseId, receiptHref, receiptIcon, receiptOf, receiptText } from "./receipts";
import { retryMessage } from "./runner";
import { isolateRuns, tidyReply } from "./text";

/** A reply chip's test id (ARCHITECTURE 8.2): yes / no confirmations, every other chip by its slug. */
export function chipTestId(chip: Chip): string {
  if (chip.role === "yes") return TID.advisor.confirmYes;
  if (chip.role === "no") return TID.advisor.confirmNo;
  return TID.advisor.chip(chip.slug);
}

/** A switch read when the chips render (see DaleelRow): `current` false → the chips carry no test id. */
export interface ChipsLive {
  current: boolean;
}

/**
 * The chat kit's chips for a reply. With `live`, each chip's test id follows `live.current` at render time: the chat
 * kit keeps a reply's last chips while they fold away (and in the DOM after that, inert), and a folded chip must not
 * answer to advisor-confirm-no / advisor-chip-{slug}, or a script's selector finds the old hidden chip before the live
 * one (spec "How to read": an id points at the element to click). The ids stay on the chips of the last answer only.
 */
export function toReplyChips(chips: readonly Chip[], prefix: string, live?: ChipsLive): ReplyChip[] {
  return chips.map((chip, i) => {
    const id = `${prefix}${i}-${chip.slug}`;
    const label = isolateRuns(chip.label);
    const testId = chipTestId(chip);
    if (!live) return { id, label, testId };
    return Object.defineProperty({ id, label } as ReplyChip, "testId", { enumerable: true, get: () => (live.current ? testId : undefined) });
  });
}

const NO_PARTS: readonly AdvisorPart[] = [];
const LINE_BREAK = String.fromCharCode(10);

/** One «دليلك» row: pending (a turn in flight) or a saved reply. Memoised: a row re-renders only when its own props change. */
const DaleelRow = memo(function DaleelRow({
  message,
  pending,
  restored,
  last,
  showChips,
  actions,
}: {
  message?: ThreadMessage;
  pending?: LiveTurn;
  restored: boolean;
  last: boolean;
  showChips: boolean;
  actions: CardActions;
}) {
  const { onOpen, onChip } = actions;
  const parts = useMemo<readonly AdvisorPart[]>(() => {
    if (!message) return NO_PARTS;
    const out: AdvisorPart[] = [];
    const receipt = receiptOf(message.id);
    if (receipt) {
      out.push({ kind: "receipt", id: "receipt", text: isolateRuns(receiptText(receipt)), icon: receiptIcon(receipt), onOpen: () => onOpen(receiptHref(receipt)) });
    }
    message.blocks.forEach((text, i) => out.push({ kind: "text", id: `t${i}`, text: tidyReply(text) }));
    message.cards.forEach((card, i) => out.push({ kind: "card", id: cardKey(card, i), node: <AdvisorCardView actions={actions} card={card} /> }));
    return out;
  }, [message, actions, onOpen]);
  const chips = message?.chips;
  const prefix = message ? `${baseId(message.id)}:` : "";
  // the chips' test ids follow this row's showChips: a pure function of this render's props, read by the chips (the
  // live ones, or the kept ones folding away) when they render in this same pass
  const [live] = useState<ChipsLive>(() => ({ current: showChips }));
  live.current = showChips;
  const replyChips = useMemo(() => (chips ? toReplyChips(chips, prefix, live) : []), [chips, prefix, live]);
  const elapsedFrom = useElapsedStart(pending);
  const pick = (chip: ReplyChip) => {
    const source = chips?.[replyChips.findIndex((c) => c.id === chip.id)];
    if (source) onChip(source, chip.id);
  };
  return (
    <AdvisorMessage
      activity={pending?.activity}
      chips={showChips ? replyChips : undefined}
      chipsDisabled={actions.busy}
      onChip={pick}
      parts={parts}
      pressedChip={actions.pressedKey}
      restored={restored}
      startedAt={elapsedFrom}
      state={pending ? "pending" : "answer"}
      status={pending?.status}
      statusTestId={TID.advisor.status}
      testId={last ? TID.advisor.messageLast : undefined}
    />
  );
});

function NoteRow({ note, last }: { note: LiveNote; last: boolean }) {
  if (note.kind === "error") {
    const outgoing = note.outgoing;
    return (
      <ChatError
        onRetry={outgoing ? () => retryMessage(note.id, outgoing) : undefined}
        retryTestId={TID.advisor.retry}
        testId={last ? TID.advisor.messageLast : undefined}
      />
    );
  }
  return <AdvisorMessage parts={NO_PARTS} stopped testId={last ? TID.advisor.messageLast : undefined} />;
}

export interface ThreadRowsInput {
  readonly onOpen: (href: string) => void;
  readonly onChip: (chip: Chip, key: string) => void;
  readonly pressedKey: string | null;
}

type Row =
  | { readonly key: string; readonly kind: "user"; readonly message: ThreadMessage }
  | { readonly key: string; readonly kind: "daleel"; readonly message: ThreadMessage }
  | { readonly key: string; readonly kind: "pending"; readonly turn: LiveTurn }
  | { readonly key: string; readonly kind: "note"; readonly note: LiveNote };

interface RowsInput {
  readonly messages: readonly ThreadMessage[];
  readonly notes: readonly LiveNote[];
  readonly turn: LiveTurn | null;
  readonly restored: ReadonlySet<string>;
  readonly fresh: CardActions;
  readonly rested: CardActions;
  readonly avatar: string | undefined;
  readonly name: string | undefined;
}

/** Saved messages, then session notes after the message they follow, then the turn in flight (unless saved already). */
function buildRows({ messages, notes, turn, restored, fresh, rested, avatar, name }: RowsInput): { rows: ReactElement[]; replyChipsShown: boolean } {
  const list: Row[] = [];
  const keys = new Set<string>();
  for (const message of messages) {
    const key = baseId(message.id);
    keys.add(key);
    list.push(message.from === "user" ? { key, kind: "user", message } : { key, kind: "daleel", message });
    for (const note of notes) if (note.afterId === key) list.push({ key: note.id, kind: "note", note });
  }
  if (turn && !keys.has(turn.id)) list.push({ key: turn.id, kind: "pending", turn });

  let newest = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.kind !== "user") {
      newest = i;
      break;
    }
  }
  const lastRow = list[list.length - 1];
  const replyChipsShown = lastRow?.kind === "daleel" && lastRow.message.chips.length > 0;

  const rows = list.map((row, i): ReactElement => {
    const last = i === newest;
    switch (row.kind) {
      case "user":
        return (
          <UserMessage avatar={avatar} entrance={restored.has(row.key) ? "none" : "pop"} key={row.key} name={name}>
            {row.message.blocks.join(LINE_BREAK)}
          </UserMessage>
        );
      case "daleel": {
        const rest = restored.has(row.key);
        return (
          <DaleelRow
            actions={rest ? rested : fresh}
            key={row.key}
            last={last}
            message={row.message}
            restored={rest}
            showChips={i === list.length - 1 && replyChipsShown}
          />
        );
      }
      case "pending":
        return <DaleelRow actions={fresh} key={row.key} last={last} pending={row.turn} restored={false} showChips={false} />;
      case "note":
        return <NoteRow key={row.key} last={last} note={row.note} />;
    }
  });
  return { rows, replyChipsShown };
}

/** The thread's rows, oldest first, for <ChatThread>; and whether the newest reply shows its own chips (then the page
 *  chips step aside: 3.14 / ARCHITECTURE 8.2 "reply chips replace the page chips while shown"). Memoised, so a change
 *  that is not the thread's (the panel's motion state) renders nothing inside it. */
export function useThreadRows({ onOpen, onChip, pressedKey }: ThreadRowsInput): { rows: ReactElement[]; replyChipsShown: boolean } {
  const user = useCurrentUser();
  const messages = useMemo(() => user?.advisor.messages ?? [], [user]);
  const turn = useLive((s) => s.turn);
  const notes = useLive((s) => s.notes);
  const busy = useUi((s) => s.advisorBusy);
  // what was already there when the panel first mounted is shown at rest: a saved thread never replays
  const [restored] = useState(() => new Set(messages.map((m) => baseId(m.id))));
  const fresh = useMemo<CardActions>(() => ({ onOpen, onChip, busy, pressedKey, fresh: true }), [onOpen, onChip, busy, pressedKey]);
  const rested = useMemo<CardActions>(() => ({ ...fresh, fresh: false }), [fresh]);
  const avatar = user?.avatar;
  const name = user?.name;
  return useMemo(
    () => buildRows({ messages, notes, turn, restored, fresh, rested, avatar, name }),
    [messages, notes, turn, restored, fresh, rested, avatar, name],
  );
}
