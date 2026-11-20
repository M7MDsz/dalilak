// Owner: brain-advisor. The provider switch, now a backup chain (spec 5.5 rules 11 and 18, owner's part 7):
// AI_PROVIDER auto | gemini | anthropic | local; the chain gemini-1 → gemini-2 → anthropic from the keys, an empty key
// skipped quietly; gemini-2 = GEMINI_API_KEY_2, or the first key with GEMINI_MODEL_2 until it is set; no client is ever
// constructed without an explicit non-empty key; each slot has its own 60 s cooldown; no key value ever leaves the
// module. No request is sent anywhere (constructing a client makes no call).
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  brainStatus,
  chainSlots,
  chainState,
  getAnthropicClient,
  getGeminiClient,
  geminiClientFor,
  markProviderFailure,
  modelIds,
  providerCoolingDown,
  resetProviderCooldown,
  resolveProvider,
} from "./provider";

const KEYS = ["AI_PROVIDER", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "ANTHROPIC_API_KEY", "GEMINI_MODEL", "GEMINI_MODEL_2", "ANTHROPIC_MODEL"] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  resetProviderCooldown();
});

afterEach(() => {
  for (const k of KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetProviderCooldown();
});

function quietly(fn: () => void): void {
  const warn = console.warn;
  const error = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    fn();
  } finally {
    console.warn = warn;
    console.error = error;
  }
}

const ids = () => chainSlots().map((s) => `${s.id}:${s.model}:${s.keyEnv}`);

describe("resolveProvider", () => {
  it("is local with no key, and with empty or blank keys", () => {
    expect(resolveProvider()).toBeNull();
    process.env.GEMINI_API_KEY = "";
    process.env.GEMINI_API_KEY_2 = " ";
    process.env.ANTHROPIC_API_KEY = "   ";
    expect(resolveProvider()).toBeNull();
    expect(chainSlots()).toEqual([]);
    expect(brainStatus()).toEqual({ configured: false, provider: null, mode: "local" });
  });

  it("auto picks the first provider whose key is non-empty", () => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    expect(resolveProvider()).toBe("anthropic");
    process.env.GEMINI_API_KEY = "test-gemini";
    expect(resolveProvider()).toBe("gemini");
    process.env.AI_PROVIDER = "auto";
    expect(resolveProvider()).toBe("gemini");
  });

  it("honours an explicit choice, and never picks a provider without its key", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.AI_PROVIDER = "anthropic";
    expect(resolveProvider()).toBeNull();
    process.env.AI_PROVIDER = "local";
    expect(resolveProvider()).toBeNull();
    process.env.AI_PROVIDER = "gemini";
    expect(resolveProvider()).toBe("gemini");
  });
});

describe("the chain from env (part 7)", () => {
  it("one Gemini key gives two slots: the same key with a second model (each model has its own daily limit)", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    expect(ids()).toEqual(["gemini-1:gemini-3.5-flash-lite:GEMINI_API_KEY", "gemini-2:gemini-3.1-flash-lite:GEMINI_API_KEY"]);
  });

  it("GEMINI_API_KEY_2 takes slot 2 once set; GEMINI_MODEL_2 picks its model", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GEMINI_API_KEY_2 = "test-gemini-other-project";
    process.env.GEMINI_MODEL_2 = "gemini-3.5-flash";
    expect(ids()).toEqual(["gemini-1:gemini-3.5-flash-lite:GEMINI_API_KEY", "gemini-2:gemini-3.5-flash:GEMINI_API_KEY_2"]);
  });

  it("the whole chain in order, Claude last; an empty Claude key is skipped quietly", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.ANTHROPIC_API_KEY = "";
    expect(chainSlots().map((s) => s.id)).toEqual(["gemini-1", "gemini-2"]);
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    expect(chainSlots().map((s) => s.id)).toEqual(["gemini-1", "gemini-2", "anthropic"]);
  });

  it("an empty first key leaves slot 1 out but slot 2 runs on GEMINI_API_KEY_2", () => {
    process.env.GEMINI_API_KEY = " ";
    process.env.GEMINI_API_KEY_2 = "test-gemini-other-project";
    expect(ids()).toEqual(["gemini-2:gemini-3.1-flash-lite:GEMINI_API_KEY_2"]);
  });

  it("leaves slot 2 out when it would repeat slot 1 exactly (same key, same model)", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GEMINI_MODEL_2 = "gemini-3.5-flash-lite";
    expect(chainSlots().map((s) => s.id)).toEqual(["gemini-1"]);
    expect(chainState().slots.find((s) => s.slot === "gemini-2")?.skipped).toBe("same_as_gemini_1");
  });

  it("AI_PROVIDER narrows the chain: gemini = both Gemini slots, anthropic = Claude, local = none", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    process.env.AI_PROVIDER = "gemini";
    expect(chainSlots().map((s) => s.id)).toEqual(["gemini-1", "gemini-2"]);
    process.env.AI_PROVIDER = "anthropic";
    expect(chainSlots().map((s) => s.id)).toEqual(["anthropic"]);
    process.env.AI_PROVIDER = "local";
    expect(chainSlots()).toEqual([]);
    expect(brainStatus()).toEqual({ configured: false, provider: null, mode: "local" });
  });

  it("never exposes a key value in the chain state, not even partly", () => {
    process.env.GEMINI_API_KEY = "AIzaSECRET-one-1234567890";
    process.env.GEMINI_API_KEY_2 = "AIzaSECRET-two-1234567890";
    process.env.ANTHROPIC_API_KEY = "sk-ant-SECRET-three";
    const json = JSON.stringify({ chain: chainState(), slots: chainSlots(), status: brainStatus() });
    expect(json).not.toMatch(/SECRET|AIza|sk-ant/);
    expect(json).toContain("GEMINI_API_KEY_2"); // names only
  });
});

describe("clients (rule 18)", () => {
  it("constructs no client without an explicit non-empty key", () => {
    expect(getGeminiClient()).toBeNull();
    expect(getAnthropicClient()).toBeNull();
    process.env.GEMINI_API_KEY = " ";
    expect(getGeminiClient()).toBeNull();
  });

  it("constructs a client with a key (no request is made by constructing it), one per Gemini slot", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GEMINI_API_KEY_2 = "test-gemini-2";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    expect(getGeminiClient()).not.toBeNull();
    expect(getAnthropicClient()).not.toBeNull();
    const [one, two] = chainSlots();
    expect(one && two && geminiClientFor(one) !== geminiClientFor(two)).toBe(true);
  });

  it("uses the default model ids unless overridden", () => {
    expect(modelIds()).toEqual({ gemini: "gemini-3.5-flash-lite", gemini2: "gemini-3.1-flash-lite", anthropic: "claude-haiku-5-5" });
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    expect(modelIds().gemini).toBe("gemini-3.8-flash");
  });
});

describe("cooldown per slot (rule 11, part 7)", () => {
  it("rests only the slot that failed; the brain stays online while another slot is ready", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    expect(brainStatus()).toEqual({ configured: true, provider: "gemini", mode: "online" });
    markProviderFailure("aborted");
    expect(chainState().slots[0]?.coolingDownMs).toBe(0);
    quietly(() => markProviderFailure("offline", "gemini-1"));
    expect(chainState().slots[0]?.coolingDownMs).toBeGreaterThan(55_000);
    expect(chainState().slots[1]?.coolingDownMs).toBe(0);
    expect(providerCoolingDown()).toBe(false);
    expect(brainStatus().mode).toBe("online");
    quietly(() => markProviderFailure("rate_limited", "gemini-2"));
    expect(providerCoolingDown()).toBe(true);
    expect(brainStatus()).toEqual({ configured: true, provider: "gemini", mode: "local" });
  });

  it("Claude stays ready while both Gemini slots rest", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    quietly(() => {
      markProviderFailure("server", "gemini-1");
      markProviderFailure("server", "gemini-2");
    });
    expect(brainStatus()).toEqual({ configured: true, provider: "anthropic", mode: "online" });
  });

  it("does not rest a slot after one slow reply, only after its second timeout within 2 minutes", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    quietly(() => {
      markProviderFailure("timeout", "gemini-1");
      markProviderFailure("timeout", "gemini-2"); // another slot's timeout does not count for gemini-1
    });
    expect(chainState().slots.map((s) => s.coolingDownMs)).toEqual([0, 0, 0]);
    expect(chainState().slots[0]?.lastFailure?.failure).toBe("timeout");
    quietly(() => markProviderFailure("timeout", "gemini-1"));
    expect(chainState().slots[0]?.coolingDownMs).toBeGreaterThan(0);
    expect(chainState().slots[1]?.coolingDownMs).toBe(0);
  });
});
