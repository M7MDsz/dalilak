// Owner: brain-advisor. The turn runner with fake providers (no SDK, no network): router turns never reach a model;
// a failing, slow or empty provider falls back silently to the local brain and is marked (spec 5.5 rule 11); the
// backup chain (owner's part 7) moves to the next slot on a fast failure at once and on a slow one after its share;
// a model reply is checked (rules 7, 8, 9) and state-changing calls become offers (5.4).
import { describe, expect, it } from "vitest";

import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorEvent, AdvisorRequest, PageContext } from "@/lib/brain/protocol";
import type { UserFacts } from "@/lib/types";

import { routeAdvisorMessage } from "../advisor/router";
import { ProviderFailure, type BrainFailure, type ChainHooks, type ChainSlot, type ReplyRecord, type SlotId } from "./chain";
import type { ModelRunner } from "./model-common";
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

const G1: ChainSlot = { id: "gemini-1", provider: "gemini", model: "model-1", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL" };
const G2: ChainSlot = { id: "gemini-2", provider: "gemini", model: "model-2", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL_2" };
const CL: ChainSlot = { id: "anthropic", provider: "anthropic", model: "claude", keyEnv: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL" };

/** One configured slot (gemini-1), or none (no key). */
const ONLINE = "online" as const;
const LOCAL = "local" as const;

function hooks(failures: BrainFailure[] = [], records: ReplyRecord[] = [], resting: readonly SlotId[] = []): ChainHooks {
  return {
    coolingDown: (slot) => resting.includes(slot),
    markFailure: (_slot, f) => failures.push(f),
    classify: (error) => (error instanceof ProviderFailure ? error.failure : "unknown"),
    record: (entry) => records.push(entry),
  };
}

function deps(run: ModelRunner | null, status: typeof ONLINE | typeof LOCAL, failures: BrainFailure[] = [], extra: Partial<TurnDeps> = {}): TurnDeps {
  return {
    slots: () => (status === ONLINE && run ? [G1] : []),
    runner: () => run,
    hooks: hooks(failures),
    ...extra,
  };
}

/** A chain of fake slots: each runner by slot id. */
function chainDeps(
  runners: Partial<Record<SlotId, ModelRunner>>,
  out: { failures?: BrainFailure[]; records?: ReplyRecord[]; resting?: SlotId[] } = {},
  extra: Partial<TurnDeps> = {},
): TurnDeps {
  return {
    slots: () => [G1, G2, CL].filter((s) => runners[s.id] !== undefined),
    runner: (slot) => runners[slot.id] ?? null,
    hooks: hooks(out.failures ?? [], out.records ?? [], out.resting ?? []),
    ...extra,
  };
}

/** A runner that never answers: it waits for its signal (the chain's share deadline) and rejects then. */
const hanging: ModelRunner = (input) =>
  new Promise((_, reject) => {
    input.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });

function failing(failure: BrainFailure): ModelRunner {
  return async () => {
    throw new ProviderFailure(failure);
  };
}

function answering(text: string, seen?: string[], name?: string): ModelRunner {
  return async (input) => {
    seen?.push(name ?? text);
    input.onFirstEvent();
    return text;
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
    expect(events[0]).toEqual({ type: "status", tool: null, text: "دليلك يفكّر…" });
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
      input.onToolCall({ name: "apply_to_job", args: { job_id: "syarah-financial-analyst-tamheer-riyadh" } });
      return "تم، قدّمت لك.";
    };
    const events = await collect(runTurn(request("ودي أشتغل محلل أعمال"), new AbortController().signal, deps(run, ONLINE)));
    expect(events.some((e) => e.type === "action")).toBe(false);
    expect(texts(events)).toEqual(["أقدّم لك على «محلل مالي (برنامج تمهير)»؟"]);
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

describe("the backup chain (owner's part 7)", () => {
  const REPLY = "أبشر، خطوتك الجاية واضحة.";
  const open = (): AbortSignal => new AbortController().signal;
  const cards = (events: readonly AdvisorEvent[]) => events.filter((e) => e.type === "card");

  it("moves to gemini-2 at once when gemini-1 fails fast, and marks only gemini-1", async () => {
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    const started = Date.now();
    const events = await collect(
      runTurn(request("كم نقاطي؟"), open(), chainDeps({ "gemini-1": failing("rate_limited"), "gemini-2": answering(REPLY) }, { failures, records })),
    );
    expect(Date.now() - started).toBeLessThan(500);
    expect(texts(events)).toEqual([REPLY]);
    expect(last(events)).toEqual({ type: "done", mode: "online", source: "gemini" });
    expect(failures).toEqual(["rate_limited"]);
    expect(records).toEqual([
      expect.objectContaining({ task: "advisor", by: "gemini-2", model: "model-2", misses: [expect.objectContaining({ slot: "gemini-1", why: "rate_limited" })] }),
    ]);
  });

  it("cuts a slow gemini-1 at its share of the first-event budget, and gemini-2 still answers within the budget", async () => {
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    const started = Date.now();
    const events = await collect(
      runTurn(
        request("كم نقاطي؟"),
        open(),
        chainDeps({ "gemini-1": hanging, "gemini-2": answering(REPLY), anthropic: answering("x") }, { failures, records }, { firstEventMs: 600 }),
      ),
    );
    const elapsed = Date.now() - started;
    // three live slots: gemini-1 gets 60 % of 600 ms = 360 ms, then gemini-2 answers at once
    expect(elapsed).toBeGreaterThanOrEqual(340);
    expect(elapsed).toBeLessThan(600);
    expect(texts(events)).toEqual([REPLY]);
    expect(failures).toEqual(["timeout"]);
    expect(records[0]).toEqual(expect.objectContaining({ by: "gemini-2", misses: [expect.objectContaining({ slot: "gemini-1", why: "timeout" })] }));
  });

  it("answers with Claude when both Gemini slots fail", async () => {
    const failures: BrainFailure[] = [];
    const events = await collect(
      runTurn(
        request("كم نقاطي؟"),
        open(),
        chainDeps({ "gemini-1": failing("server"), "gemini-2": failing("rate_limited"), anthropic: answering(REPLY) }, { failures }),
      ),
    );
    expect(texts(events)).toEqual([REPLY]);
    expect(last(events)).toEqual({ type: "done", mode: "online", source: "anthropic" });
    expect(failures).toEqual(["server", "rate_limited"]);
  });

  it("answers with the built-in brain when every slot fails at once", async () => {
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    const started = Date.now();
    const events = await collect(
      runTurn(
        request("كم نقاطي؟"),
        open(),
        chainDeps({ "gemini-1": failing("offline"), "gemini-2": failing("auth"), anthropic: failing("server") }, { failures, records }),
      ),
    );
    expect(Date.now() - started).toBeLessThan(500);
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(texts(events)).toEqual(localText("كم نقاطي؟"));
    expect(last(events)).toEqual({ type: "done", mode: "local", source: "local" });
    expect(failures).toEqual(["offline", "auth", "server"]);
    expect(records).toHaveLength(1);
    expect(records[0]?.by).toBe("local");
    expect(records[0]?.misses.map((m) => [m.slot, m.why])).toEqual([
      ["gemini-1", "offline"],
      ["gemini-2", "auth"],
      ["anthropic", "server"],
    ]);
  });

  it("keeps the whole chain within the first-event budget when every slot is slow", async () => {
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    const started = Date.now();
    const events = await collect(
      runTurn(
        request("كم نقاطي؟"),
        open(),
        chainDeps({ "gemini-1": hanging, "gemini-2": hanging, anthropic: hanging }, { failures, records }, { firstEventMs: 600, turnMs: 1_200 }),
      ),
    );
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(580);
    expect(elapsed).toBeLessThan(900);
    expect(texts(events)).toEqual(localText("كم نقاطي؟"));
    expect(last(events)).toEqual({ type: "done", mode: "local", source: "local" });
    // gemini-1 360 ms, gemini-2 the 240 ms left (too little to share with Claude), Claude: no time
    expect(failures).toEqual(["timeout", "timeout"]);
    expect(records[0]?.misses.map((m) => [m.slot, m.why])).toEqual([
      ["gemini-1", "timeout"],
      ["gemini-2", "timeout"],
      ["anthropic", "no_time"],
    ]);
  });

  it("skips a resting slot without calling it", async () => {
    const seen: string[] = [];
    const records: ReplyRecord[] = [];
    const events = await collect(
      runTurn(
        request("كم نقاطي؟"),
        open(),
        chainDeps({ "gemini-1": answering("from gemini-1", seen, "gemini-1"), "gemini-2": answering(REPLY, seen, "gemini-2") }, { records, resting: ["gemini-1"] }),
      ),
    );
    expect(seen).toEqual(["gemini-2"]);
    expect(texts(events)).toEqual([REPLY]);
    expect(records[0]?.misses).toEqual([{ slot: "gemini-1", why: "cooling_down", ms: 0 }]);
  });

  it("answers locally at once, with no thinking line, when every slot rests", async () => {
    const records: ReplyRecord[] = [];
    const events = await collect(
      runTurn(
        request("كم نقاطي؟"),
        open(),
        chainDeps({ "gemini-1": answering("x"), "gemini-2": answering("y") }, { records, resting: ["gemini-1", "gemini-2"] }),
      ),
    );
    expect(events.some((e) => e.type === "status")).toBe(false);
    expect(texts(events)).toEqual(localText("كم نقاطي؟"));
    expect(last(events)).toEqual({ type: "done", mode: "local", source: "local" });
    expect(records[0]).toEqual(expect.objectContaining({ by: "local", ms: 0 }));
    expect(records[0]?.misses.map((m) => m.why)).toEqual(["cooling_down", "cooling_down"]);
  });

  it("drops the tool calls of a slot that was cut off", async () => {
    const seen: unknown[] = [];
    const late: ModelRunner = (input) =>
      new Promise((_, reject) => {
        input.signal.addEventListener("abort", () => {
          seen.push(input.onToolCall({ name: "search_jobs", args: { query: "محلل" } }));
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    const events = await collect(
      runTurn(request("كم نقاطي؟"), open(), chainDeps({ "gemini-1": late, "gemini-2": answering(REPLY) }, {}, { firstEventMs: 300 })),
    );
    expect(seen).toEqual([expect.objectContaining({ error: "not_allowed" })]);
    expect(events.filter((e) => e.type === "status").map((e) => (e.type === "status" ? e.tool : "?"))).toEqual([null]);
    expect(cards(events)).toEqual([]);
    expect(texts(events)).toEqual([REPLY]);
  });

  it("lets the next slot take over after a failure inside the tool loop, without the first slot's cards", async () => {
    const failures: BrainFailure[] = [];
    const broken: ModelRunner = async (input) => {
      input.onFirstEvent();
      input.onToolCall({ name: "search_jobs", args: { query: "محلل" } });
      throw new ProviderFailure("server");
    };
    const events = await collect(runTurn(request("كم نقاطي؟"), open(), chainDeps({ "gemini-1": broken, "gemini-2": answering(REPLY) }, { failures })));
    expect(failures).toEqual(["server"]);
    expect(cards(events)).toEqual([]);
    expect(texts(events)).toEqual([REPLY]);
    expect(last(events)).toEqual({ type: "done", mode: "online", source: "gemini" });
  });

  it("stops the chain silently when the user stops it («إيقاف»), marking no slot", async () => {
    const controller = new AbortController();
    const failures: BrainFailure[] = [];
    const records: ReplyRecord[] = [];
    setTimeout(() => controller.abort(), 20);
    const events = await collect(
      runTurn(request("كم نقاطي؟"), controller.signal, chainDeps({ "gemini-1": hanging, "gemini-2": answering(REPLY) }, { failures, records })),
    );
    expect(events.filter((e) => e.type !== "status")).toEqual([]);
    expect(failures).toEqual([]);
    expect(records).toEqual([]);
  });
});
