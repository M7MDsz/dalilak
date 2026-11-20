// Owner: advisor. THE dispatcher (ARCHITECTURE 8.2, 9; spec 5.3 contract): the one place in the browser where «دليل»'s
// actions change the site. The server never changes state; it sends an `action` event and the panel hands it here.
//
// For every action, first (5.5 rule 7, re-checked on the client for the race): an apply sheet open or any show running
// → `blocked`, nothing changes. Then, on phones, the sheet closes so the page is visible (3.14 "Acting on the page");
// the panel opens it again when it reveals the reply. Each action resolves only when the page has visibly responded
// (page-handoff): the page changes first, the words follow.
import { toast } from "@/components/ui";
import { TOAST_COPY, targetChangedToast } from "@/lib/copy";
import { hrefFor } from "@/lib/routes";
import { selectCurrentUser, useAppStore, useUi } from "@/lib/store";
import { sleep } from "@/lib/motion";
import type { AdvisorAction, DispatchResult } from "@/lib/brain/protocol";
import type { Application, ApplyRun, ApplyStep } from "@/lib/types";

/** What the panel learns back: the frozen DispatchResult, plus the real record of a sent application (its number may
 *  differ from the server's `expect`), and whether the phone sheet was closed for the action. */
export type DispatchOutcome = DispatchResult & { readonly application?: Application; readonly closedPanel: boolean };

export interface DispatchContext {
  /** useGo()'s navigation (the route transition plays). */
  readonly go: (href: string) => void;
  /** Below 1024 px: the advisor is a full-screen sheet that steps aside while the action runs. */
  readonly isPhone: boolean;
  /** Each step of «دليل» filling the apply sheet, for the status line (7.4). */
  readonly onApplyStep?: (step: ApplyStep) => void;
}

/** The phone sheet's exit is 150 ms; the page only starts to move once the sheet is gone (never two layers half-seen). */
const SHEET_EXIT_MS = 150;
const SHEET_EXIT_CAP_MS = 450;
/** Same pathname (a query change, or the page already open): the list reorders, the map replays its short opening. */
const SAME_PAGE_MS = 380;
/** A cold dev compile of a route can take seconds; never wait for ever. */
const ARRIVE_CAP_MS = 12_000;
/** After the URL changed, the new page's root mounts (the content area can be empty in between) … */
const MOUNT_CAP_MS = 3_000;
/** … and rises in (page-in, 260 ms). */
const RISE_CAP_MS = 900;
/** Phones: the page that opened stays in view on its own this long before the sheet comes back with the reply
 *  (3.14 "the page is visible": the user sees the site respond to the chat). */
const PHONE_VIEW_MS = 900;
/** Phones, after «دليل»'s application: the apply sheet closes by itself (its exit) before the advisor sheet returns. */
const APPLY_SHEET_GONE_CAP_MS = 700;
/** The apply watchdog (ARCHITECTURE 9.2). */
const WATCH_AFTER_ARRIVAL_MS = 3_000;
const WATCH_TOTAL_MS = 15_000;

const pathOf = (href: string) => new URL(href, window.location.href).pathname;
const isStill = () => document.documentElement.dataset.still !== undefined;

/** Polls `ok` every 30 ms until it holds or `capMs` has passed. */
async function until(ok: () => boolean, capMs: number): Promise<void> {
  const t0 = performance.now();
  while (!ok() && performance.now() - t0 < capMs) await sleep(30);
}

/** Two frames: what the last change rendered has been painted. */
const painted = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Every page's outermost element is a PageTransition `.page` inside the shell's #app-content. */
const pages = () => Array.from(document.querySelectorAll<HTMLElement>("#app-content .page"));

/**
 * Moves to `href` and resolves when its page is on screen: the URL changed, the NEW page's root is in the DOM (between
 * the old page leaving and the new one mounting the content area can be empty for a moment, longer on the dev server),
 * it has finished rising in, and that has been painted. Clearing the leave flag is not enough: the shell clears it on
 * the URL change, before the new page has mounted.
 */
async function goAndArrive(href: string, ctx: DispatchContext): Promise<void> {
  const target = pathOf(href);
  if (window.location.pathname === target) {
    ctx.go(href);
    await sleep(SAME_PAGE_MS);
    return;
  }
  const before = new Set(pages());
  ctx.go(href);
  await until(() => window.location.pathname === target, ARRIVE_CAP_MS);
  await until(() => pages().some((page) => !before.has(page)), MOUNT_CAP_MS);
  await until(() => {
    if (document.documentElement.dataset.leaving !== undefined) return false;
    const page = pages().find((p) => !before.has(p));
    return page !== undefined && Number(getComputedStyle(page).opacity) >= 0.99;
  }, RISE_CAP_MS);
  await painted();
}

/** Phones: the page that opened is seen on its own before the sheet returns. */
async function inView(closedPanel: boolean): Promise<void> {
  if (closedPanel && !isStill()) await sleep(PHONE_VIEW_MS);
}

async function stepAside(ctx: DispatchContext): Promise<boolean> {
  if (!ctx.isPhone) return false;
  useUi.getState().closeAdvisor();
  // the sheet's state trails the store by two frames, then its 150 ms exit: the page moves once it is really gone
  await sleep(isStill() ? 0 : SHEET_EXIT_MS);
  await until(() => {
    const panel = document.querySelector<HTMLElement>("[data-testid=advisor-panel]");
    return panel === null || Number(getComputedStyle(panel).opacity) < 0.05;
  }, SHEET_EXIT_CAP_MS);
  return true;
}

function isBlocked(): boolean {
  const ui = useUi.getState();
  return ui.applySheetOpen || ui.holds.length > 0;
}

/** Applies one action and resolves when the site has responded. Never throws. */
export async function dispatchAction(action: AdvisorAction, ctx: DispatchContext): Promise<DispatchOutcome> {
  if (isBlocked()) return { ok: false, reason: "blocked", closedPanel: false };
  if (selectCurrentUser(useAppStore.getState()) === null) return { ok: false, reason: "no_user", closedPanel: false };
  try {
    switch (action.type) {
      case "navigate":
        return await navigate(action.to, ctx);
      case "start_course":
        return await startCourse(action, ctx);
      case "set_target":
        return await setTarget(action, ctx);
      case "apply":
        return await apply(action, ctx);
    }
  } catch (error) {
    console.error("[advisor] dispatch failed", error);
    return { ok: false, reason: "no_user", closedPanel: false };
  }
}

async function navigate(to: Extract<AdvisorAction, { type: "navigate" }>["to"], ctx: DispatchContext): Promise<DispatchOutcome> {
  const closedPanel = await stepAside(ctx);
  // the map plays its short opening on «دليل»'s request, also when /path is already on screen (v3 3.4 situation 3)
  if (to.screen === "path") useUi.getState().requestMapOpen();
  await goAndArrive(hrefFor(to), ctx);
  await inView(closedPanel);
  return { ok: true, closedPanel };
}

async function startCourse(action: Extract<AdvisorAction, { type: "start_course" }>, ctx: DispatchContext): Promise<DispatchOutcome> {
  const result = useAppStore.getState().startCourse(action.courseId);
  if (!result.ok) return { ok: false, reason: result.reason, closedPanel: false };
  const closedPanel = await stepAside(ctx);
  if (!result.already) toast({ title: TOAST_COPY.courseStarted, tone: "ok" });
  await goAndArrive(hrefFor({ screen: "course", courseId: action.courseId }), ctx);
  await inView(closedPanel);
  return { ok: true, closedPanel };
}

async function setTarget(action: Extract<AdvisorAction, { type: "set_target" }>, ctx: DispatchContext): Promise<DispatchOutcome> {
  useAppStore.getState().setTarget(action.jobId);
  const closedPanel = await stepAside(ctx);
  toast({ title: targetChangedToast(action.jobId), tone: "ok" });
  useUi.getState().requestMapOpen();
  await goAndArrive(hrefFor({ screen: "path" }), ctx);
  await inView(closedPanel);
  return { ok: true, closedPanel };
}

/** «دليل» fills the real apply sheet in front of the user (7.4, ARCHITECTURE 9.2). The jobs page runs the steps. */
async function apply(action: Extract<AdvisorAction, { type: "apply" }>, ctx: DispatchContext): Promise<DispatchOutcome> {
  const ui = useUi.getState();
  const runId = ui.startApplyRun(action.jobId);
  if (runId === null) return { ok: false, reason: "blocked", closedPanel: false };
  ui.hold("advisor-apply");
  useAppStore.getState().setApplyInFlight(action.jobId);
  let closedPanel = false;
  let result: NonNullable<ApplyRun["result"]>;
  try {
    closedPanel = await stepAside(ctx);
    const href = hrefFor({ screen: "job", jobId: action.jobId });
    const path = pathOf(href);
    if (window.location.pathname !== path) ctx.go(href);
    result = await watchRun(runId, path, ctx.onApplyStep);
    // phones: the apply sheet closed itself after the confirmation; the advisor sheet returns once it is gone
    if (closedPanel && result.kind === "sent") {
      await until(() => document.querySelector("[data-testid=apply-sheet]") === null, APPLY_SHEET_GONE_CAP_MS);
      await painted();
    }
  } finally {
    const after = useUi.getState();
    after.release("advisor-apply");
    useAppStore.getState().setApplyInFlight(null);
    if (after.applyRun?.id === runId) after.clearApplyRun();
  }
  switch (result.kind) {
    case "sent":
      return { ok: true, application: result.application, closedPanel };
    case "stopped":
      return { ok: false, reason: "stopped", closedPanel };
    case "interrupted":
      return { ok: false, reason: "interrupted", closedPanel };
    case "failed":
      return { ok: false, reason: result.reason, closedPanel };
  }
}

/** Resolves on the UI store's next change, or after `ms` (the watchdog's clock), whichever comes first. */
function nextUiChange(ms: number): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    const unsubscribe = useUi.subscribe(() => {
      window.clearTimeout(timer);
      unsubscribe();
      resolve();
    });
    timer = window.setTimeout(() => {
      unsubscribe();
      resolve();
    }, ms);
  });
}

/** Follows the run until whoever ends it reports (the jobs page, or this watchdog). Each step reaches the status line
 *  the moment the sheet reports it, and the reply follows step 6 without a polling gap. */
async function watchRun(runId: number, path: string, onStep?: (step: ApplyStep) => void): Promise<NonNullable<ApplyRun["result"]>> {
  const start = performance.now();
  let arrivedAt: number | null = window.location.pathname === path ? start : null;
  let lastStep: ApplyStep | -1 = -1;
  for (;;) {
    const run = useUi.getState().applyRun;
    // resetUi() (an account action, a seed) took the run away: nothing was sent from here on
    if (run === null || run.id !== runId) return { kind: "interrupted" };
    if (run.result !== null) return run.result;
    if (run.step !== lastStep) {
      lastStep = run.step;
      onStep?.(run.step);
    }
    const now = performance.now();
    if (arrivedAt === null && window.location.pathname === path) arrivedAt = now;
    const late = (arrivedAt !== null && now - arrivedAt > WATCH_AFTER_ARRIVAL_MS) || now - start > WATCH_TOTAL_MS;
    if (run.step === 0 && late) {
      useUi.getState().finishApplyRun(runId, { kind: "interrupted" });
      continue;
    }
    await nextUiChange(80);
  }
}
