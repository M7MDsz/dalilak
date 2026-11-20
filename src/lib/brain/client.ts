// Owner: brain-advisor. Browser-side calls to the brain routes. No SDK, no key, no server import,
// and no @/lib/store import (the store's useBrainStatus imports fetchBrainStatus from here).
import { readNdjson } from "@/lib/brain/ndjson";
import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import type {
  AdvisorEvent,
  AdvisorRequest,
  BrainStatus,
  OnboardingClassifyRequest,
  OnboardingEvent,
} from "@/lib/brain/protocol";

const LOCAL_STATUS: BrainStatus = { configured: false, provider: null, mode: "local" };

/**
 * The longest the panel waits on the server for the next event (21 Nov 2026, QA: a stalled request left «دليلك يفكّر…»
 * counting past 20 s). The server's own model turn ends by 9 s with the local brain's answer (turn.ts), so a gap this long
 * is a stall: the request is cut and the turn ends with an error event, which the panel shows as its retry line.
 */
export const ADVISOR_STALL_MS = 10_000;

export interface StreamAdvisorOptions {
  /** Default ADVISOR_STALL_MS. */
  readonly stallMs?: number;
  /** Default the global fetch (tests pass a stalling one). */
  readonly fetcher?: typeof fetch;
}

/**
 * POST /api/advisor and yield its events. Abort with `signal` («إيقاف»): what arrived is kept by the caller. When the
 * server sends nothing for `stallMs` (the time the caller spends on an event, e.g. an action, does not count), the request
 * is aborted and `{ type: "error", code: "brain_failed" }` is yielded, so the turn ends instead of waiting forever.
 */
export async function* streamAdvisor(
  request: AdvisorRequest,
  signal: AbortSignal,
  options: StreamAdvisorOptions = {},
): AsyncGenerator<AdvisorEvent> {
  const stallMs = options.stallMs ?? ADVISOR_STALL_MS;
  const fetcher = options.fetcher ?? fetch;
  const stall = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const disarm = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const arm = (): void => {
    disarm();
    timer = setTimeout(() => stall.abort(), stallMs);
  };
  let reader: AsyncIterator<AdvisorEvent> | null = null;
  let finished = false;
  arm();
  try {
    const response = await fetcher("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: anySignal([signal, stall.signal]),
      cache: "no-store",
    });
    reader = readNdjson<AdvisorEvent>(response)[Symbol.asyncIterator]();
    for (;;) {
      arm();
      const step = await reader.next();
      disarm();
      if (step.done) {
        finished = true;
        return;
      }
      yield step.value; // the caller's time on this event (an action, the pacing) is not the server's
    }
  } catch (error) {
    if (stall.signal.aborted && !signal.aborted) {
      finished = true;
      yield { type: "error", code: "brain_failed" };
      return;
    }
    throw error;
  } finally {
    disarm();
    if (reader && !finished) await reader.return?.();
  }
}

/** One AbortSignal that fires when any of the given ones does (AbortSignal.any where available). */
function anySignal(signals: readonly AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any([...signals]);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/**
 * POST /api/onboarding, aborted after TIMEOUTS_MS.onboardingClassify. Resolves to the classified event, or to
 * { type: "unclassified" } on a timeout, an error or no answer (spec 4.5: silently fall back).
 */
export async function classifyOnboarding(
  request: OnboardingClassifyRequest,
  signal?: AbortSignal,
): Promise<Extract<OnboardingEvent, { type: "classified" | "unclassified" }>> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUTS_MS.onboardingClassify);
  try {
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: signal ? anySignal([signal, timeout.signal]) : timeout.signal,
      cache: "no-store",
    });
    for await (const event of readNdjson<OnboardingEvent>(response)) {
      if (event.type === "classified") {
        if (event.question !== request.question || !Array.isArray(event.options) || event.options.length === 0) {
          return { type: "unclassified" };
        }
        return event;
      }
      if (event.type === "unclassified" || event.type === "error") return { type: "unclassified" };
    }
    return { type: "unclassified" };
  } catch {
    return { type: "unclassified" };
  } finally {
    clearTimeout(timer);
  }
}

function isBrainStatus(value: unknown): value is BrainStatus {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.configured === "boolean" &&
    (v.provider === null || v.provider === "gemini" || v.provider === "anthropic") &&
    (v.mode === "online" || v.mode === "local")
  );
}

/** GET /api/brain. On any failure resolves to { configured: false, provider: null, mode: "local" }. */
export async function fetchBrainStatus(signal?: AbortSignal): Promise<BrainStatus> {
  try {
    const response = await fetch("/api/brain", { method: "GET", signal, cache: "no-store" });
    if (!response.ok) return LOCAL_STATUS;
    const body: unknown = await response.json();
    return isBrainStatus(body) ? { configured: body.configured, provider: body.provider, mode: body.mode } : LOCAL_STATUS;
  } catch {
    return LOCAL_STATUS;
  }
}
