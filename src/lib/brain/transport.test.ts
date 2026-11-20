// Owner: brain-advisor. The NDJSON transport (encode → decode round trip, chunk boundaries) and the request schemas.
import { describe, expect, it } from "vitest";

import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";

import { ndjsonResponse, readNdjson } from "./ndjson";
import { parseAdvisorRequest, parseOnboardingClassifyRequest } from "./schemas";

const clock = makeClock(new Date("2026-11-18T21:00:00"));

async function* events(): AsyncGenerator<{ n: number; text: string }> {
  yield { n: 1, text: "أبشر" };
  yield { n: 2, text: "سطر\nبسطرين" };
}

describe("ndjson", () => {
  it("writes one JSON object per line and reads them back", async () => {
    const response = ndjsonResponse(events());
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    const out: { n: number; text: string }[] = [];
    for await (const e of readNdjson<{ n: number; text: string }>(response)) out.push(e);
    expect(out).toEqual([
      { n: 1, text: "أبشر" },
      { n: 2, text: "سطر\nبسطرين" },
    ]);
  });

  it("splits on newlines, not on chunk boundaries", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"a":1}\n{"a"'));
        controller.enqueue(encoder.encode(':2}\n{"a":3}'));
        controller.close();
      },
    });
    const out: number[] = [];
    for await (const e of readNdjson<{ a: number }>(new Response(body))) out.push(e.a);
    expect(out).toEqual([1, 2, 3]);
  });

  it("throws on a non-2xx status", async () => {
    const read = async (): Promise<void> => {
      for await (const e of readNdjson(new Response("nope", { status: 500 }))) void e;
    };
    await expect(read()).rejects.toThrow("HTTP 500");
  });
});

describe("schemas", () => {
  const state = buildSeed("mid-path", clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("no seed user");
  const facts = factsOf(user);
  const valid = {
    v: 1,
    message: { text: "  ماذا أفعل الآن؟  " },
    history: Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "daleel" : "user", text: `رسالة ${i}` })),
    facts,
    clock,
    page: { route: "job", jobId: "data-analyst-riyadh", applySheetOpen: false, showRunning: false },
    thread: { jobsDisclosed: true, lastJobIds: ["data-analyst-riyadh"], lastCourseIds: [] },
  };

  it("accepts a real snapshot, trims the text and keeps the last 12 messages", () => {
    const parsed = parseAdvisorRequest(JSON.parse(JSON.stringify(valid)));
    expect(parsed).not.toBeNull();
    expect(parsed?.message.text).toBe("ماذا أفعل الآن؟");
    expect(parsed?.history).toHaveLength(12);
    expect(parsed?.history[11]?.text).toBe("رسالة 19");
    expect(parsed?.facts).toEqual(facts);
  });

  it("cuts a message to 500 characters, and keeps a chip payload", () => {
    const long = parseAdvisorRequest({ ...valid, message: { text: "ا".repeat(900) } });
    expect(long?.message.text).toHaveLength(500);
    const chip = parseAdvisorRequest({
      ...valid,
      message: { text: "قدّم على أي حال", chip: { intent: "apply", jobId: "qiddiya-hr-analytics-analyst-riyadh", anyway: true } },
    });
    expect(chip?.message.chip).toEqual({ intent: "apply", jobId: "qiddiya-hr-analytics-analyst-riyadh", anyway: true });
  });

  it("rejects unknown ids and wrong shapes (rule 2)", () => {
    expect(parseAdvisorRequest(null)).toBeNull();
    expect(parseAdvisorRequest({ ...valid, v: 2 })).toBeNull();
    expect(parseAdvisorRequest({ ...valid, page: { ...valid.page, jobId: "real-company-job" } })).toBeNull();
    expect(parseAdvisorRequest({ ...valid, message: { text: "x", chip: { intent: "start_course", courseId: "c-nope-1" } } })).toBeNull();
    expect(parseAdvisorRequest({ ...valid, facts: { ...facts, targetJobId: "nope" } })).toBeNull();
    expect(parseAdvisorRequest({ ...valid, message: { text: "   " } })).toBeNull();
  });

  it("validates the onboarding classification request (text cut to 300)", () => {
    expect(parseOnboardingClassifyRequest({ v: 1, question: "city", text: "ب".repeat(400) })?.text).toHaveLength(300);
    expect(parseOnboardingClassifyRequest({ v: 1, question: "salary", text: "x" })).toBeNull();
  });
});
