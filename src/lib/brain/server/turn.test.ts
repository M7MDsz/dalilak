// Owner: brain-advisor. The turn runner with a fake provider (no SDK, no network): router turns never reach a model;
// a failing, slow or empty provider falls back silently to the local brain and starts the cooldown (spec 5.5 rule 11);
// a model reply is checked (rules 7, 8, 9) and state-changing calls become offers (5.4).
import { describe, expect, it } from "vitest";

import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorEvent, AdvisorRequest, BrainStatus, PageContext } from "@/lib/brain/protocol";
import type { UserFacts } from "@/lib/types";

import { routeAdvisorMessage } from "../advisor/router";
import type { ModelRunner } from "./model-common";
import type { BrainFailure } from "./provider";
import { ProviderFailure } from "./provider";
import { runTurn, type TurnDeps } from "./turn";

const clock = makeClock(new Date("2026-11-18T21:00:00"));

function facts(): UserFacts {
  const state = buildSeed("cv-analysed", clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("no seed user");
  return factsOf(user);
}

function request(text: string, page: Partial<PageContext> = {}): AdvisorRequest {
  return {
    v: 1,
    message: { text },
    history: [{ role: "daleel", text: "أهلاً من جديد يا خالد." }],
    facts: facts(),
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false, ...page },
    thread: { jobsDisclosed: false, lastJobIds: [], lastCourseIds: [] },
  };
}

const ONLINE: BrainStatus = { configured: true, provider: "gemini", mode: "online" };
const LOCAL: BrainStatus = { configured: false, provider: null, mode: "local" };

function deps(run: ModelRunner | null, status: BrainStatus, failures: BrainFailure[] = [], extra: Partial<TurnDeps> = {}): TurnDeps {
  return {
    status: () => status,
    runner: () => (run ? { provider: "gemini", run } : null),
    markFailure: (f) => failures.push(f),
    classify: (error) => (error instanceof ProviderFailure ? error.failure : "unknown"),
    ...extra,
  };
}

async function collect(stream: AsyncGenerator<AdvisorEvent>): Promise<AdvisorEvent[]> {
  const out: AdvisorEvent[] = [];
  for await (const event of stream) out.push(event);
  return out;
}

const texts = (events: readonly AdvisorEvent[]) => events.flatMap((e) => (e.type === "text" ? [e.text] : []));
const last = (events: readonly AdvisorEvent[]) => events[events.length - 1];

function localText(text: string): string[] {
  const decision = routeAdvisorMessage(request(text));
  const events = decision.kind === "router" ? decision.events : decision.local;
  return texts(events);
}

describe("router turns (rows 1-8, chips) never call a model, in any mode", () => {
  it("emits the router's events with done {source: router}", async () => {
    let called = false;
    const run: ModelRunner = async () => {
      called = true;
      return "x";
    };
    const events = await collect(runTurn(request("افتح مساري"), new AbortController().signal, deps(run, ONLINE)));
    expect(called).toBe(false);
    expect(events.some((e) => e.type === "action")).toBe(true);
    expect(last(events)).toEqual({ type: "done", mode: "online", source: "router" });
  });
});

describe("open turns (rows 9-21)", () => {
  it("answers locally with no key", async () => {
    const events = await collect(runTurn(request("ماذا أفعل الآن؟"), new AbortController().signal, deps(null, LOCAL)));
    expect(texts(events)).toEqual(localText("ماذا أفعل الآن؟"));
    expect(last(events)).toEqual({ type: "done", mode: "local", source: "local" });
  });

  it("falls back silently to the local brain when the provider fails, and starts the cooldown", async () => {
    const failures: BrainFailure[] = [];
    const run: ModelRunner = async () => {
      throw new ProviderFailure("offline");
    };
    const events = await collect(runTurn(request("ماذا أفعل الآن؟"), new AbortController().signal, deps(run, ONLINE, failures)));
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(texts(events)).toEqual(localText("ماذا أفعل الآن؟"));
    expect(last(events)).toEqual({ type: "done", mode: "local", source: "local" });
    expect(failures).toEqual(["offline"]);
  });

  it("falls back when the provider sends nothing within the first-event limit", async () => {
    const failures: BrainFailure[] = [];
    const run: ModelRunner = (input) =>
      new Promise((_, reject) => {
        input.signal.addEventListener("abort", () => reject(new Error("aborted by the deadline")));
      });
    const started = Date.now();
    const events = await collect(
      runTurn(request("كم نقاطي؟"), new AbortController().signal, deps(run, ONLINE, failures, { firstEventMs: 60 })),
    );
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(events[0]).toEqual({ type: "status", tool: null, text: "دليل يفكّر…" });
    expect(texts(events)).toEqual(localText("كم نقاطي؟"));
    expect(failures).toEqual(["timeout"]);
    expect(last(events)).toEqual({ type: "done", mode: "local", source: "local" });
  });

  it("falls back on an empty reply", async () => {
    const failures: BrainFailure[] = [];
    const run: ModelRunner = async (input) => {
      input.onFirstEvent();
      throw new ProviderFailure("empty");
    };
    const events = await collect(runTurn(request("كم نقاطي؟"), new AbortController().signal, deps(run, ONLINE, failures)));
    expect(texts(events)).toEqual(localText("كم نقاطي؟"));
    expect(failures).toEqual(["empty"]);
  });

  it("ends silently when the user stops it («إيقاف»)", async () => {
    const controller = new AbortController();
    const run: ModelRunner = (input) =>
      new Promise((_, reject) => {
        input.signal.addEventListener("abort", () => reject(new Error("user abort")));
        setTimeout(() => controller.abort(), 10);
      });
    const failures: BrainFailure[] = [];
    const events = await collect(runTurn(request("كم نقاطي؟"), controller.signal, deps(run, ONLINE, failures)));
    expect(events.filter((e) => e.type !== "status")).toEqual([]);
    expect(failures).toEqual([]);
  });

  it("sends a checked model reply with its tool status lines and cards", async () => {
    const run: ModelRunner = async (input) => {
      input.onFirstEvent();
      input.onToolCall({ name: "explain_match", args: { job_id: "data-analyst-riyadh" } });
      return "مطابقتك 70%، وأقرب خطوة دورة «أساسيات Power BI» التي توصلك إلى 90%.";
    };
    const events = await collect(runTurn(request("ليش مطابقتي كذا؟"), new AbortController().signal, deps(run, ONLINE)));
    expect(events.filter((e) => e.type === "status").map((e) => (e.type === "status" ? e.tool : null))).toEqual([null, "explain_match"]);
    expect(texts(events)).toEqual(["مطابقتك 70%، وأقرب خطوة دورة «أساسيات Power BI» التي توصلك إلى 90%."]);
    expect(last(events)).toEqual({ type: "done", mode: "online", source: "gemini" });
  });

  it("replaces a reply with an invented number by the tool's template (rule 8)", async () => {
    const run: ModelRunner = async (input) => {
      input.onFirstEvent();
      input.onToolCall({ name: "explain_match", args: { job_id: "data-analyst-riyadh" } });
      return "مطابقتك 73%، وستصل إلى 95% قريباً.";
    };
    const events = await collect(runTurn(request("ليش مطابقتي كذا؟"), new AbortController().signal, deps(run, ONLINE)));
    expect(texts(events)).toEqual(localText("لماذا مطابقتي 70%؟"));
  });

  it("turns a model's apply_to_job call into an offer with confirmation chips (5.4)", async () => {
    const run: ModelRunner = async (input) => {
      input.onFirstEvent();
      input.onToolCall({ name: "apply_to_job", args: { job_id: "business-analyst-riyadh" } });
      return "تم، قدّمت لك.";
    };
    const events = await collect(runTurn(request("ودي أشتغل محلل أعمال"), new AbortController().signal, deps(run, ONLINE)));
    expect(events.some((e) => e.type === "action")).toBe(false);
    expect(texts(events)).toEqual(["أقدّم لك على «محلل أعمال»؟"]);
    const chips = events.flatMap((e) => (e.type === "chips" ? e.chips : []));
    expect(chips.map((c) => [c.label, c.role])).toEqual([
      ["قدّم على ذي", "yes"],
      ["مو الحين", "no"],
    ]);
  });

  it("drops a navigation the user did not ask for and offers «افتح…» instead (rule 7)", async () => {
    const run: ModelRunner = async (input) => {
      input.onFirstEvent();
      input.onToolCall({ name: "navigate", args: { screen: "leaderboard" } });
      return "أنت في المركز 18 هذا الأسبوع.";
    };
    const events = await collect(runTurn(request("كيف حالي في المنافسة؟"), new AbortController().signal, deps(run, ONLINE)));
    expect(events.some((e) => e.type === "action")).toBe(false);
    const chips = events.flatMap((e) => (e.type === "chips" ? e.chips : []));
    expect(chips.map((c) => [c.slug, c.label])).toEqual([["open-leaderboard", "افتح المتصدرين"]]);
  });

  it("rejects unknown ids in a model's tool call (rule 2)", async () => {
    const seen: unknown[] = [];
    const run: ModelRunner = async (input) => {
      input.onFirstEvent();
      seen.push(input.onToolCall({ name: "get_job_gap", args: { job_id: "real-company-analyst" } }));
      seen.push(input.onToolCall({ name: "web_search", args: {} }));
      return "لم أجدها.";
    };
    await collect(runTurn(request("ما الذي ينقصني؟"), new AbortController().signal, deps(run, ONLINE)));
    expect(seen).toEqual([
      expect.objectContaining({ error: "unknown_id" }),
      expect.objectContaining({ error: "not_allowed" }),
    ]);
  });
});
