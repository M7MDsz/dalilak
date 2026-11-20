// Owner: advisor. The panel's session-only state: the turn in flight and the few rows that are never saved (an error
// with its retry, a reply stopped before any word arrived). A small zustand store of its own, so the turn runner (a
// plain async function, ARCHITECTURE 9.1) can write to it whether or not the panel is mounted, and nothing here is
// persisted (the saved thread lives in the app store: appendAdvisorMessages).
import { useEffect, useState } from "react";
import { create } from "zustand";

import type { AdvisorOutgoing } from "@/lib/types";

/** «دليلك» working on a reply: the row shows his living glyph and the rolling status line. */
export interface LiveTurn {
  /** The key of the «دليلك» message this turn becomes (the saved message's id starts with it). */
  readonly id: string;
  /** For the elapsed seconds after 4 s (spec 3.14). */
  readonly startedAt: number;
  /** When the work last visibly moved on (a new status line, or a new step of the apply run under the same line). */
  readonly statusAt: number;
  /** «دليلك يفكّر…», then the tool's line (5.3), then during an application the step's line (7.4). */
  readonly status: string;
  /** `thinking` before any tool, `working` while a tool or an action runs (the glyph's state). */
  readonly activity: "thinking" | "working";
  /** An action is being applied to the page right now (page-handoff). */
  readonly acting: boolean;
}

/** A row that is shown in this session only. */
export interface LiveNote {
  readonly id: string;
  readonly kind: "error" | "stopped";
  /** Shown right after the message with this key (the user's message of that turn). */
  readonly afterId: string;
  /** The error's retry sends this again (without a second bubble). */
  readonly outgoing?: AdvisorOutgoing;
}

interface LiveState {
  readonly turn: LiveTurn | null;
  readonly notes: readonly LiveNote[];
}

interface LiveActions {
  start(turn: Omit<LiveTurn, "acting" | "statusAt">): void;
  setStatus(status: string, activity: LiveTurn["activity"]): void;
  /** The page moved on under the same line (the apply run's steps 2-4 share «أكتب بياناتك…»): the work is not stuck. */
  progress(): void;
  setActing(acting: boolean): void;
  end(): void;
  addNote(note: LiveNote): void;
  dropErrors(): void;
  reset(): void;
}

export const useLive = create<LiveState & LiveActions>()((set, get) => ({
  turn: null,
  notes: [],

  start: (turn) => set({ turn: { ...turn, statusAt: turn.startedAt, acting: false } }),
  setStatus: (status, activity) => {
    const turn = get().turn;
    if (turn && (turn.status !== status || turn.activity !== activity))
      set({ turn: { ...turn, status, activity, statusAt: turn.status !== status ? Date.now() : turn.statusAt } });
  },
  progress: () => {
    const turn = get().turn;
    if (turn) set({ turn: { ...turn, statusAt: Date.now() } });
  },
  setActing: (acting) => {
    const turn = get().turn;
    if (turn && turn.acting !== acting) set({ turn: { ...turn, acting } });
  },
  end: () => {
    if (get().turn !== null) set({ turn: null });
  },
  addNote: (note) => set({ notes: [...get().notes, note] }),
  dropErrors: () => {
    const notes = get().notes;
    if (notes.some((n) => n.kind === "error")) set({ notes: notes.filter((n) => n.kind !== "error") });
  },
  reset: () => set({ turn: null, notes: [] }),
}));

/** The line has to stand still this long before the elapsed seconds show (spec 3.14: "after 4 s"). */
const STALL_MS = 4_000;

/**
 * The `startedAt` to hand to the rolling status line. Spec 3.14 shows the elapsed seconds after 4 s, so a slow answer
 * is visibly being waited for; while the lines are still rolling (an action narrating itself, the apply run's steps)
 * the work is plainly moving and a ticking counter would only compete with it. So: until the line has stood still for
 * 4 s this is the moment it last moved (the line counts 0-3 s and shows nothing); once it has, the turn's own start (the
 * line shows the seconds since the message was sent). A new line hides them again.
 */
export function useElapsedStart(turn: Pick<LiveTurn, "startedAt" | "statusAt"> | null | undefined): number | undefined {
  const statusAt = turn?.statusAt;
  const [stalled, setStalled] = useState<number | null>(null);
  useEffect(() => {
    if (statusAt === undefined) return;
    const timer = window.setTimeout(() => setStalled(statusAt), Math.max(0, statusAt + STALL_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [statusAt]);
  if (!turn) return undefined;
  return stalled === turn.statusAt ? turn.startedAt : turn.statusAt;
}
