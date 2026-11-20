// Owner: brain-advisor. SERVER-ONLY (imports the model SDKs): never import from client code.
// The ONE provider switch (A4, D5), now a backup chain (owner's part 7; the engine is ./chain.ts). Also used by
// brain-cv's model analyser (src/lib/brain/cv/server/model.ts).
//
// Env (.env.local; restart the server after editing): AI_PROVIDER = auto | gemini | anthropic | local (default auto).
// The chain, tried in order within the same reply (each slot skipped quietly when its key is empty):
//   gemini-1   GEMINI_API_KEY with GEMINI_MODEL (default "gemini-3.5-flash-lite", STACK-NOTES 5.2)
//   gemini-2   GEMINI_API_KEY_2 (a key from ANOTHER Google project: the free limit is counted per project), or until it
//              is set, GEMINI_API_KEY again; with GEMINI_MODEL_2 (default "gemini-3.1-flash-lite": each model has its
//              own daily limit). Left out when it would be the very same key and model as gemini-1.
//   anthropic  ANTHROPIC_API_KEY with ANTHROPIC_MODEL (default "claude-haiku-5-5", STACK-NOTES 6.2)
//   then the built-in brain.
// AI_PROVIDER gemini = the two Gemini slots only; anthropic = Claude only; local = none; auto (or anything else) = all.
// `KEY=` is an empty string: tested with ?.trim().
//
// Spec 5.5 rule 18: no AI client is ever constructed without an explicit, non-empty key. Both SDKs would otherwise go
// looking for ambient credentials on the machine (STACK-NOTES 5.1, 6.3, 11.5). The key is passed explicitly, always.
// No key value is ever logged or returned: slots carry the NAMES of their env variables only.
import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";

import type { BrainStatus, ProviderName } from "@/lib/brain/protocol";

import {
  ProviderFailure,
  markSlotFailure,
  recordReply,
  resetChainState,
  slotCooldownLeftMs,
  slotCoolingDown,
  slotLastMiss,
  type BrainFailure,
  type ChainHooks,
  type ChainSlot,
  type KeyEnv,
  type ModelEnv,
  type SlotId,
} from "./chain";

export { ProviderFailure, type BrainFailure };

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_GEMINI_MODEL_2 = "gemini-3.1-flash-lite";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

/** Seconds-level ceiling of one Anthropic call (the chain also races its own deadlines). */
const ANTHROPIC_CLIENT_TIMEOUT_MS = 20_000;

function envValue(name: KeyEnv | ModelEnv): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

type Scope = "auto" | "gemini" | "anthropic" | "local";

function scope(): Scope {
  const choice = (process.env.AI_PROVIDER ?? "auto").trim().toLowerCase();
  return choice === "gemini" || choice === "anthropic" || choice === "local" ? choice : "auto";
}

interface SlotPlan {
  readonly slot: ChainSlot;
  /** The key is set (non-empty). */
  readonly configured: boolean;
  /** AI_PROVIDER allows this slot. */
  readonly inScope: boolean;
  /** gemini-2 would repeat gemini-1 exactly (same key, same model): left out, it would run out together. */
  readonly duplicate: boolean;
}

/** Every slot with its state, configured or not (for /dev/brain). Reads env each time: a changed .env.local applies. */
function slotPlans(): SlotPlan[] {
  const s = scope();
  const key1 = envValue("GEMINI_API_KEY");
  const key2 = envValue("GEMINI_API_KEY_2");
  const model1 = envValue("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
  const model2 = envValue("GEMINI_MODEL_2") ?? DEFAULT_GEMINI_MODEL_2;
  const geminiScope = s === "auto" || s === "gemini";
  const anthropicScope = s === "auto" || s === "anthropic";
  return [
    {
      slot: { id: "gemini-1", provider: "gemini", model: model1, keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL" },
      configured: key1 !== null,
      inScope: geminiScope,
      duplicate: false,
    },
    {
      slot: { id: "gemini-2", provider: "gemini", model: model2, keyEnv: key2 !== null ? "GEMINI_API_KEY_2" : "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL_2" },
      configured: (key2 ?? key1) !== null,
      inScope: geminiScope,
      duplicate: key2 === null && key1 !== null && model2 === model1,
    },
    {
      slot: { id: "anthropic", provider: "anthropic", model: envValue("ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL, keyEnv: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL" },
      configured: envValue("ANTHROPIC_API_KEY") !== null,
      inScope: anthropicScope,
      duplicate: false,
    },
  ];
}

/** The slots the chain tries, in order: key set, allowed by AI_PROVIDER, not a duplicate. Cooldowns are not applied here. */
export function chainSlots(): ChainSlot[] {
  return slotPlans()
    .filter((p) => p.configured && p.inScope && !p.duplicate)
    .map((p) => p.slot);
}

/** The provider of the first slot in the chain (ignoring cooldowns), or null for local. An empty key is no key. */
export function resolveProvider(): ProviderName | null {
  return chainSlots()[0]?.provider ?? null;
}

/** True while EVERY slot of the chain rests after a failure (then only the built-in brain answers). */
export function providerCoolingDown(): boolean {
  const slots = chainSlots();
  return slots.length > 0 && slots.every((slot) => slotCoolingDown(slot.id));
}

/**
 * configured = a slot resolves; provider = the first slot that is not resting (else the first slot); mode = "online"
 * when some slot is not resting (5.5 rule 11). The UI reads only these three fields.
 */
export function brainStatus(): BrainStatus {
  const slots = chainSlots();
  const live = slots.find((slot) => !slotCoolingDown(slot.id));
  return { configured: slots.length > 0, provider: (live ?? slots[0])?.provider ?? null, mode: live ? "online" : "local" };
}

/** One slot for /dev/brain: env variable NAMES, never values. */
export interface SlotState {
  readonly slot: SlotId;
  readonly provider: ProviderName;
  readonly model: string;
  readonly keyEnv: KeyEnv;
  readonly modelEnv: ModelEnv;
  /** In the chain now (key set, allowed by AI_PROVIDER, not a duplicate). */
  readonly active: boolean;
  /** Why not, when not active. */
  readonly skipped: "no_key" | "ai_provider" | "same_as_gemini_1" | null;
  readonly coolingDownMs: number;
  readonly lastFailure: { readonly failure: BrainFailure; readonly agoMs: number } | null;
}

export function chainState(): { readonly aiProvider: Scope; readonly slots: readonly SlotState[] } {
  const now = Date.now();
  return {
    aiProvider: scope(),
    slots: slotPlans().map((p) => {
      const miss = slotLastMiss(p.slot.id);
      const skipped = !p.configured ? "no_key" : !p.inScope ? "ai_provider" : p.duplicate ? "same_as_gemini_1" : null;
      return {
        slot: p.slot.id,
        provider: p.slot.provider,
        model: p.slot.model,
        keyEnv: p.slot.keyEnv,
        modelEnv: p.slot.modelEnv,
        active: skipped === null,
        skipped,
        coolingDownMs: slotCooldownLeftMs(p.slot.id, now),
        lastFailure: miss ? { failure: miss.failure, agoMs: now - miss.at } : null,
      };
    }),
  };
}

/** Records a failure on ONE slot (default: the first of the chain). Kept for callers outside the chain runner. */
export function markProviderFailure(failure: BrainFailure, slotId?: SlotId): void {
  const slots = chainSlots();
  const slot = (slotId ? slots.find((s) => s.id === slotId) : slots[0]) ?? null;
  if (slot) markSlotFailure(slot, failure);
}

/** Test seam: forget every cooldown and the reply log (never called by product code). */
export function resetProviderCooldown(): void {
  resetChainState();
}

/** The env key of a slot, read now; null when empty. Never leaves this module. */
function slotKey(slot: ChainSlot): string | null {
  return envValue(slot.keyEnv);
}

const geminiClients = new Map<SlotId, { readonly key: string; readonly client: GoogleGenAI }>();
let anthropic: { readonly key: string; readonly client: Anthropic } | null = null;

/** The Gemini client of a slot, constructed ONLY with its explicit non-empty key (STACK-NOTES 5.1); otherwise null. */
export function geminiClientFor(slot: ChainSlot): GoogleGenAI | null {
  if (slot.provider !== "gemini") return null;
  const key = slotKey(slot);
  if (key === null) return null;
  const cached = geminiClients.get(slot.id);
  if (cached && cached.key === key) return cached.client;
  const client = new GoogleGenAI({ apiKey: key });
  geminiClients.set(slot.id, { key, client });
  return client;
}

/** The Anthropic client of a slot, constructed ONLY with an explicit non-empty key, maxRetries 0 (STACK-NOTES 6.3). */
export function anthropicClientFor(slot: ChainSlot): Anthropic | null {
  if (slot.provider !== "anthropic") return null;
  const key = slotKey(slot);
  if (key === null) return null;
  if (anthropic === null || anthropic.key !== key) {
    anthropic = { key, client: new Anthropic({ apiKey: key, maxRetries: 0, timeout: ANTHROPIC_CLIENT_TIMEOUT_MS }) };
  }
  return anthropic.client;
}

/** The Gemini client for GEMINI_API_KEY (gemini-1), or null. */
export function getGeminiClient(): GoogleGenAI | null {
  const plan = slotPlans().find((p) => p.slot.id === "gemini-1");
  return plan ? geminiClientFor(plan.slot) : null;
}

/** The Anthropic client for ANTHROPIC_API_KEY, or null. */
export function getAnthropicClient(): Anthropic | null {
  const plan = slotPlans().find((p) => p.slot.id === "anthropic");
  return plan ? anthropicClientFor(plan.slot) : null;
}

/**
 * The `httpOptions.timeout` for a Gemini call. The SDK sends it to the API as the server deadline, and the API rejects
 * anything under 10 s with a 400 ("Minimum allowed deadline is 10s", seen live 18 Nov 2026). Our own shorter cut-offs
 * stay enforced by the chain's abort signal; this only keeps the request valid.
 */
export function geminiDeadlineMs(ms: number): number {
  return Math.max(ms, 10_000);
}

/** Model ids of gemini-1 and anthropic from env with the defaults above (each slot also carries its own). */
export function modelIds(): { readonly gemini: string; readonly gemini2: string; readonly anthropic: string } {
  return {
    gemini: envValue("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL,
    gemini2: envValue("GEMINI_MODEL_2") ?? DEFAULT_GEMINI_MODEL_2,
    anthropic: envValue("ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL,
  };
}

/**
 * Any error from either SDK (or from our runners) as a BrainFailure (STACK-NOTES 5.6, 6.6). `signal` is the caller's
 * own signal: when it is aborted, the failure is "aborted" whatever was thrown (the only failure with no fallback).
 */
export function classifyProviderError(error: unknown, signal: AbortSignal): BrainFailure {
  if (signal.aborted) return "aborted";
  if (error instanceof ProviderFailure) return error.failure;
  // Anthropic: the most specific classes first (APIUserAbortError and APIConnectionError extend APIError).
  if (error instanceof Anthropic.APIUserAbortError) return "timeout"; // our own deadline aborted it, not the user
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIConnectionError) return "offline";
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return "auth";
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.NotFoundError || error instanceof Anthropic.BadRequestError) return "bad_request";
  if (error instanceof Anthropic.APIError) {
    return typeof error.status === "number" && error.status >= 500 ? "server" : "unknown";
  }
  // Gemini: ApiError carries the HTTP status; a timeout or an internal abort is a DOMException "AbortError".
  if (error instanceof GeminiApiError) {
    if (error.status === 401 || error.status === 403) return "auth";
    if (error.status === 429) return "rate_limited";
    if (error.status >= 500) return "server";
    return "bad_request";
  }
  if (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") return "timeout";
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  if (error instanceof TypeError) return "offline";
  return "unknown";
}

/** The chain's outside world in product code: per-slot cooldowns, SDK error classes, the reply log. */
export const CHAIN_HOOKS: ChainHooks = {
  coolingDown: (slot) => slotCoolingDown(slot),
  markFailure: (slot, failure) => {
    markSlotFailure(slot, failure);
  },
  classify: classifyProviderError,
  record: recordReply,
};
