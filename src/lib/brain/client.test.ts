// Owner: brain-advisor. The panel's advisor transport (21 Nov 2026, QA: a stalled /api/advisor request left «دليلك يفكّر…»
// counting past 20 s): a server that goes quiet is cut after the stall time and the turn ends with an error event (the
// panel's retry line); the time the panel spends on an event (an action) does not count; «إيقاف» is not an error.
import { describe, expect, it } from "vitest";

import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorEvent, AdvisorRequest } from "@/lib/brain/protocol";

import { ADVISOR_STALL_MS, streamAdvisor } from "./client";

const clock = makeClock(new Date("2026-11-18T21:00:00"));

function request(): AdvisorRequest {
  const state = buildSeed("cv-analysed", clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("seed without a user");
  return {
    v: 1,
    message: { text: "وش خطوتي الجاية؟" },
    history: [],
    facts: factsOf(user),
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false },
    thread: { jobsDisclosed: true, lastJobIds: [], lastCourseIds: [] },
  };
}

const line = (e: AdvisorEvent): Uint8Array => new TextEncoder().encode(`${JSON.stringify(e)}\n`);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * A fetch whose body sends `events` (each after its delay) and then stays open unless `close`; aborting the request
 * errors the body, like the browser's fetch.
 */
function serverSending(events: readonly { event: AdvisorEvent; afterMs?: number }[], close: boolean): typeof fetch {
  return (async (_url: unknown, init?: RequestInit) => {
    const signal = init?.signal ?? undefined;
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")), { once: true });
        for (const { event, afterMs } of events) {
          if (afterMs) await sleep(afterMs);
          if (signal?.aborted) return;
          controller.enqueue(line(event));
        }
        if (close) controller.close();
      },
    });
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson" } });
  }) as typeof fetch;
}

/** A fetch that never answers (until aborted). */
const neverAnswers = ((_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  })) as typeof fetch;

async function collect(stream: AsyncGenerator<AdvisorEvent>, onEvent?: (e: AdvisorEvent) => Promise<void>): Promise<AdvisorEvent[]> {
  const out: AdvisorEvent[] = [];
  for await (const e of stream) {
    out.push(e);
    if (onEvent) await onEvent(e);
  }
  return out;
}

const THINKING: AdvisorEvent = { type: "status", tool: null, text: "دليلك يفكّر…" };
const DONE: AdvisorEvent = { type: "done", mode: "online", source: "gemini" };

describe("streamAdvisor: a stalled request ends the turn", () => {
  it("waits about 10 s by default (longer than the server's own 9 s model turn)", () => {
    expect(ADVISOR_STALL_MS).toBe(10_000);
  });

  it("a server that sends «دليلك يفكّر…» and then nothing: cut, and an error event ends the turn", async () => {
    const t0 = Date.now();
    const events = await collect(
      streamAdvisor(request(), new AbortController().signal, { stallMs: 80, fetcher: serverSending([{ event: THINKING }], false) }),
    );
    expect(events).toEqual([THINKING, { type: "error", code: "brain_failed" }]);
    expect(Date.now() - t0).toBeLessThan(2_000);
  });

  it("a request that never gets an answer: an error event after the stall time", async () => {
    const events = await collect(streamAdvisor(request(), new AbortController().signal, { stallMs: 60, fetcher: neverAnswers }));
    expect(events).toEqual([{ type: "error", code: "brain_failed" }]);
  });

  it("a slow but steady server is not cut (each event restarts the wait)", async () => {
    const text: AdvisorEvent = { type: "text", text: "أبشر." };
    const fetcher = serverSending(
      [
        { event: THINKING },
        { event: { type: "status", tool: "recommend_next_step", text: "…" }, afterMs: 50 },
        { event: text, afterMs: 50 },
        { event: DONE, afterMs: 10 },
      ],
      true,
    );
    const events = await collect(streamAdvisor(request(), new AbortController().signal, { stallMs: 90, fetcher }));
    expect(events.at(-1)).toEqual(DONE);
    expect(events.some((e) => e.type === "error")).toBe(false);
  });

  it("the panel's own time on an event (an action) does not count as the server's", async () => {
    const action: AdvisorEvent = { type: "action", action: { type: "navigate", to: { screen: "path" } } };
    const text: AdvisorEvent = { type: "text", text: "تفضّل." };
    const fetcher = serverSending([{ event: action }, { event: text }, { event: DONE }], true);
    const events = await collect(streamAdvisor(request(), new AbortController().signal, { stallMs: 40, fetcher }), async (e) => {
      if (e.type === "action") await sleep(150); // the page moving
    });
    expect(events).toEqual([action, text, DONE]);
  });

  it("«إيقاف» (the caller's abort) is not turned into an error event", async () => {
    const user = new AbortController();
    const stream = streamAdvisor(request(), user.signal, { stallMs: 5_000, fetcher: serverSending([{ event: THINKING }], false) });
    const seen: AdvisorEvent[] = [];
    await expect(
      (async () => {
        for await (const e of stream) {
          seen.push(e);
          user.abort();
        }
      })(),
    ).rejects.toThrow();
    expect(seen).toEqual([THINKING]);
  });
});
