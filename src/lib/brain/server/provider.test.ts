// Owner: brain-advisor. The provider switch (spec 5.5 rules 11 and 18): AI_PROVIDER auto | gemini | anthropic | local;
// auto = the first provider whose key is non-empty; an empty key is no key; no client is ever constructed without an
// explicit non-empty key; the 60 s cooldown. No request is sent anywhere (constructing a client makes no call).
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  brainStatus,
  getAnthropicClient,
  getGeminiClient,
  markProviderFailure,
  modelIds,
  providerCoolingDown,
  resetProviderCooldown,
  resolveProvider,
} from "./provider";

const KEYS = ["AI_PROVIDER", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_MODEL", "ANTHROPIC_MODEL"] as const;
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

describe("resolveProvider", () => {
  it("is local with no key, and with empty or blank keys", () => {
    expect(resolveProvider()).toBeNull();
    process.env.GEMINI_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "   ";
    expect(resolveProvider()).toBeNull();
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

describe("clients (rule 18)", () => {
  it("constructs no client without an explicit non-empty key", () => {
    expect(getGeminiClient()).toBeNull();
    expect(getAnthropicClient()).toBeNull();
    process.env.GEMINI_API_KEY = " ";
    expect(getGeminiClient()).toBeNull();
  });

  it("constructs a client with a key (no request is made by constructing it)", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    expect(getGeminiClient()).not.toBeNull();
    expect(getAnthropicClient()).not.toBeNull();
  });

  it("uses the default model ids unless overridden", () => {
    expect(modelIds()).toEqual({ gemini: "gemini-3.5-flash-lite", anthropic: "claude-haiku-5-5" });
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    expect(modelIds().gemini).toBe("gemini-3.8-flash");
  });
});

describe("cooldown (rule 11)", () => {
  it("goes local for 60 s after a failure, but not after a user abort", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    expect(brainStatus()).toEqual({ configured: true, provider: "gemini", mode: "online" });
    markProviderFailure("aborted");
    expect(providerCoolingDown()).toBe(false);
    const warn = console.warn;
    console.warn = () => {};
    try {
      markProviderFailure("offline");
    } finally {
      console.warn = warn;
    }
    expect(providerCoolingDown()).toBe(true);
    expect(brainStatus()).toEqual({ configured: true, provider: "gemini", mode: "local" });
  });

  it("does not go local after one slow reply, only after a second timeout within 2 minutes", () => {
    process.env.GEMINI_API_KEY = "test-gemini";
    const warn = console.warn;
    console.warn = () => {};
    try {
      markProviderFailure("timeout");
      expect(providerCoolingDown()).toBe(false);
      expect(brainStatus().mode).toBe("online");
      markProviderFailure("timeout");
      expect(providerCoolingDown()).toBe(true);
      expect(brainStatus().mode).toBe("local");
    } finally {
      console.warn = warn;
    }
  });
});
