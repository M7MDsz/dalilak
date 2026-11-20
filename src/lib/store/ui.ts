// Owner: store. The shape and the action names are the architect's contract; the bodies are the store agent's.
// The NON-persisted UI store (a plain zustand `create`, no persist): cross-screen UI state that several owners must agree
// on. Nothing here survives a reload, by design (reload-safe facts live in the persisted store).
//
// Rules for readers (React Strict Mode runs every effect mount → cleanup → mount on the dev server Mohammed tests on):
// - Nothing is read destructively. One-time values (`mapHandover`, `advisorRequest`) carry an id; readers remember the
//   id they handled (a ref) or read the value in a useState initializer on their FIRST render.
// - Code that must see the latest holds / blocking reads `useUi.getState()` INSIDE its effect or listener, never a
//   render-time copy (the overlay host and the advisor nudge also run their first pass one requestAnimationFrame after
//   mount, so every hold set in the same commit, in a layout effect, is already visible).
// - Ids (advisorRequest, applyRun, mapHandover) only ever increase, also across resetUi().
import { create } from "zustand";

import type { AdvisorOutgoing, ApplyRun, ApplyStep, HoldKey, JobId, MapHandover } from "@/lib/types";
import type { BrainStatus } from "@/lib/brain/protocol";

export interface UiState {
  /** The advisor panel is open (spec 3.14). Owner of the panel: `advisor`; the shell's phone tab and Ctrl+K toggle it too. */
  readonly advisorOpen: boolean;
  /**
   * A reply or an action of «دليل» is in flight (5.5 rule 13). Set by the panel for each turn and each apply run. While
   * true, askAdvisor() ignores requests, and every page button that calls it renders disabled={advisorBusy}.
   */
  readonly advisorBusy: boolean;
  /**
   * The newest request a page button queued for the panel to send («دع دليل يقدّم عنك», …). NOT cleared when handled:
   * the panel keeps the last handled id in a ref and sends from a useUi.subscribe listener (and once on subscribe, if
   * the current id is newer than the ref), never from an effect whose cleanup aborts the turn.
   */
  readonly advisorRequest: { readonly id: number; readonly outgoing: AdvisorOutgoing } | null;
  /** Running shows (spec 3.15 hold rule; 2.6 nudge; 5.5 rule 7). Several may be held at once. */
  readonly holds: readonly HoldKey[];
  /**
   * The overlay on screen that others wait for, set by the shell's overlay host: "daily" (the one overlay that blocks
   * input) or "levelup" (never blocks input: it is listed so that the nudge waits for it). The map's opening waits for
   * "daily" (and for `dailyReward(facts, clock).due`, which is known before this is set).
   */
  readonly blocking: "daily" | "levelup" | null;
  /** The apply sheet is open, in either mode (5.5 rule 7: no navigation event is applied then). Set by the jobs page. */
  readonly applySheetOpen: boolean;
  /** «دليل» applying for the user (7.4). Started by the dispatcher, run by the jobs page's apply sheet. */
  readonly applyRun: ApplyRun | null;
  /**
   * The reveal → map hand-over (v3 3.3, 3.4). Set by `welcome` just before navigating. The map and the shell read it in
   * a useState initializer on their first render (`useState(() => useUi.getState().mapHandover)`); only the map clears
   * it (`setMapHandover(null)`), when the full form ends or when the map unmounts.
   */
  readonly mapHandover: (MapHandover & { readonly id: number }) | null;
  /** Incremented by the dispatcher when «دليل» opens the map, also when /path is already on screen (v3 3.4 situation 3). */
  readonly mapOpenRequest: number;
  /** GET /api/brain, fetched once per page load (null until known). */
  readonly brain: BrainStatus | null;
}

export interface UiActions {
  openAdvisor(): void;
  closeAdvisor(): void;
  toggleAdvisor(): void;
  /** The panel marks a turn or an apply run in flight / finished. */
  setAdvisorBusy(busy: boolean): void;
  /** Opens the panel and queues `outgoing` (new id) for it to send as the user's message. Ignored while advisorBusy. */
  askAdvisor(outgoing: AdvisorOutgoing): void;
  /** A key is either held or not (not counted): each key has exactly one owner (welcome, cv, learn, advisor, map). */
  hold(key: HoldKey): void;
  release(key: HoldKey): void;
  setBlocking(blocking: "daily" | "levelup" | null): void;
  setApplySheetOpen(open: boolean): void;
  /**
   * Starts a run (step 0) and returns its id. Returns null (the dispatcher answers `blocked`) while another run is
   * unfinished (5.5 rule 13) or while an apply sheet is already open (rule 7: a manual application is being edited).
   */
  startApplyRun(jobId: JobId): number | null;
  /** The sheet reports the step it is showing (the panel's status line follows it). Ignored for a stale run id. */
  setApplyStep(runId: number, step: ApplyStep): void;
  /** «إيقاف» from the composer or the sheet. */
  requestApplyStop(): void;
  /** The sheet (or the dispatcher's watchdog) reports the end of the run. Ignored for a stale id or a run already ended. */
  finishApplyRun(runId: number, result: NonNullable<ApplyRun["result"]>): void;
  /** The dispatcher clears the finished run. */
  clearApplyRun(): void;
  /** Stores the hand-over with a new id (or clears it with null). */
  setMapHandover(handover: MapHandover | null): void;
  requestMapOpen(): void;
  setBrainStatus(status: BrainStatus): void;
  /**
   * Back to the initial UI state, keeping `brain` and the id counters. Called by every account action of the persisted
   * store (createAccount, resumeAccount, restartAccount, signOut, resetCurrentAccount) and by applySeed, so nothing of
   * the previous user (open panel, holds, a run, a hand-over, a queued request) leaks into the next one.
   */
  resetUi(): void;
}

export type UiStore = UiState & UiActions;

/** Everything `resetUi()` goes back to (it keeps `brain` and `mapOpenRequest`, which is a counter). */
const RESETTABLE = {
  advisorOpen: false,
  advisorBusy: false,
  advisorRequest: null,
  holds: [],
  blocking: null,
  applySheetOpen: false,
  applyRun: null,
  mapHandover: null,
} as const satisfies Omit<UiState, "mapOpenRequest" | "brain">;

/**
 * Id counters, outside the state so resetUi() can never move them back (readers compare ids: a smaller or equal id is
 * "already handled"). Module scope is per browser page load, like the store itself.
 */
const ids = { request: 0, run: 0, handover: 0 };

/** The UI store: `useUi(selector)` in components (stable selections only), `useUi.getState()` in handlers and effects. */
export const useUi = create<UiStore>()((set, get) => ({
  ...RESETTABLE,
  mapOpenRequest: 0,
  brain: null,

  openAdvisor: () => {
    if (!get().advisorOpen) set({ advisorOpen: true });
  },
  closeAdvisor: () => {
    if (get().advisorOpen) set({ advisorOpen: false });
  },
  toggleAdvisor: () => set((state) => ({ advisorOpen: !state.advisorOpen })),
  setAdvisorBusy: (busy) => {
    if (get().advisorBusy !== busy) set({ advisorBusy: busy });
  },
  askAdvisor: (outgoing) => {
    if (get().advisorBusy) return;
    ids.request += 1;
    set({ advisorOpen: true, advisorRequest: { id: ids.request, outgoing } });
  },

  hold: (key) => {
    const holds = get().holds;
    if (!holds.includes(key)) set({ holds: [...holds, key] });
  },
  release: (key) => {
    const holds = get().holds;
    if (holds.includes(key)) set({ holds: holds.filter((held) => held !== key) });
  },
  setBlocking: (blocking) => {
    if (get().blocking !== blocking) set({ blocking });
  },
  setApplySheetOpen: (open) => {
    if (get().applySheetOpen !== open) set({ applySheetOpen: open });
  },

  startApplyRun: (jobId) => {
    const { applyRun, applySheetOpen } = get();
    if ((applyRun !== null && applyRun.result === null) || applySheetOpen) return null;
    ids.run += 1;
    set({ applyRun: { id: ids.run, jobId, step: 0, stopRequested: false, result: null } });
    return ids.run;
  },
  setApplyStep: (runId, step) => {
    const run = get().applyRun;
    if (run === null || run.id !== runId || run.result !== null || run.step === step) return;
    set({ applyRun: { ...run, step } });
  },
  requestApplyStop: () => {
    const run = get().applyRun;
    if (run === null || run.result !== null || run.stopRequested) return;
    set({ applyRun: { ...run, stopRequested: true } });
  },
  finishApplyRun: (runId, result) => {
    const run = get().applyRun;
    if (run === null || run.id !== runId || run.result !== null) return;
    set({ applyRun: { ...run, result } });
  },
  clearApplyRun: () => {
    if (get().applyRun !== null) set({ applyRun: null });
  },

  setMapHandover: (handover) => {
    if (handover === null) {
      if (get().mapHandover !== null) set({ mapHandover: null });
      return;
    }
    ids.handover += 1;
    set({ mapHandover: { ...handover, id: ids.handover } });
  },
  requestMapOpen: () => set((state) => ({ mapOpenRequest: state.mapOpenRequest + 1 })),
  setBrainStatus: (status) => set({ brain: status }),

  resetUi: () => set({ ...RESETTABLE }),
}));
