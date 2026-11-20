// Owner: brain-advisor. SERVER-ONLY (imports the model SDKs): never import from client code.
// The ONE provider switch (A4, D5). Also used by brain-cv's model analyser (src/lib/brain/cv/server/model.ts).
//
// Env (.env.local; restart the server after editing): AI_PROVIDER = auto | gemini | anthropic | local (default auto);
// GEMINI_API_KEY; GEMINI_MODEL (default "gemini-3.5-flash-lite", STACK-NOTES 5.2); ANTHROPIC_API_KEY;
// ANTHROPIC_MODEL (default "claude-haiku-5-5", STACK-NOTES 6.2). `KEY=` is an empty string: test with ?.trim().
// auto = gemini if its key is non-empty, else anthropic if its key is non-empty, else local.
//
// Spec 5.5 rule 18: no AI client is ever constructed without an explicit, non-empty key. Both SDKs would otherwise go
// looking for ambient credentials on the machine (STACK-NOTES 5.1, 6.3, 11.5). The key is passed explicitly, always.
import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";

import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import type { BrainStatus, ProviderName } from "@/lib/brain/protocol";

/** Why a provider call failed (STACK-NOTES 5.6, 6.6). Everything except "aborted" falls back to the local brain. */
export type BrainFailure = "aborted" | "timeout" | "offline" | "auth" | "rate_limited" | "server" | "bad_request" | "refusal" | "empty" | "invalid" | "unknown";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

/** Seconds-level ceiling of one Anthropic call (the turn runner also races its own deadlines). */
const ANTHROPIC_CLIENT_TIMEOUT_MS = 20_000;

function envKey(name: "GEMINI_API_KEY" | "ANTHROPIC_API_KEY"): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** The provider AI_PROVIDER and the keys resolve to, or null for local. Never null-safe-guessing: an empty key is no key. */
export function resolveProvider(): ProviderName | null {
  const choice = (process.env.AI_PROVIDER ?? "auto").trim().toLowerCase();
  const gemini = envKey("GEMINI_API_KEY") !== null;
  const anthropic = envKey("ANTHROPIC_API_KEY") !== null;
  switch (choice) {
    case "local":
      return null;
    case "gemini":
      return gemini ? "gemini" : null;
    case "anthropic":
      return anthropic ? "anthropic" : null;
    default:
      // "auto", empty, or an unknown value: the first provider whose key is non-empty.
      if (gemini) return "gemini";
      if (anthropic) return "anthropic";
      return null;
  }
}

// A timestamp in the server process (spec 5.5 rule 11): not user state, shared by every request on purpose.
let lastFailureAt: number | null = null;
// One slow reply is not an outage: a "timeout" starts the cooldown only when another timeout came within this window.
// Without this, a single slow Gemini turn sent every question of the next minute to the local brain.
const TIMEOUT_REPEAT_WINDOW_MS = 120_000;
let lastTimeoutAt: number | null = null;

/** True for 60 s after a provider failure (a timestamp in the server process; not user state). */
export function providerCoolingDown(): boolean {
  return lastFailureAt !== null && Date.now() - lastFailureAt < TIMEOUTS_MS.providerCooldown;
}

/** configured = a provider resolves; mode = "online" when configured and not cooling down (5.5 rule 11). */
export function brainStatus(): BrainStatus {
  const provider = resolveProvider();
  const configured = provider !== null;
  return { configured, provider, mode: configured && !providerCoolingDown() ? "online" : "local" };
}

/**
 * Records a failure and starts the cooldown, except after a user abort, and except for a lone "timeout" (a second one
 * within 2 minutes does start it: then the network or the provider really is slow). Logs 404 / auth loudly.
 */
export function markProviderFailure(failure: BrainFailure): void {
  if (failure === "aborted") return;
  const now = Date.now();
  const provider = resolveProvider() ?? "none";
  if (failure === "timeout") {
    const repeated = lastTimeoutAt !== null && now - lastTimeoutAt < TIMEOUT_REPEAT_WINDOW_MS;
    lastTimeoutAt = now;
    if (!repeated) {
      console.warn(`[brain] provider ${provider} was slow once ("timeout"); this turn used the local brain.`);
      return;
    }
  }
  lastFailureAt = now;
  if (failure === "auth" || failure === "bad_request") {
    // 401/403: a wrong key; 400/404: a request shape the API rejects or a retired model id (STACK-NOTES 5.2, 6.2).
    console.error(
      `[brain] provider ${provider} failed with "${failure}". Check the key and the model id ` +
        `(${provider === "gemini" ? "GEMINI_MODEL" : "ANTHROPIC_MODEL"}). Local brain for the next 60 s.`,
    );
  } else {
    console.warn(`[brain] provider ${provider} failed with "${failure}". Local brain for the next 60 s.`);
  }
}

/** Test seam: forget the cooldown (never called by product code). */
export function resetProviderCooldown(): void {
  lastFailureAt = null;
  lastTimeoutAt = null;
}

let gemini: { readonly key: string; readonly client: GoogleGenAI } | null = null;
let anthropic: { readonly key: string; readonly client: Anthropic } | null = null;

/** The Gemini client, constructed ONLY with an explicit non-empty GEMINI_API_KEY (STACK-NOTES 5.1); otherwise null. */
export function getGeminiClient(): GoogleGenAI | null {
  const key = envKey("GEMINI_API_KEY");
  if (key === null) return null;
  if (gemini === null || gemini.key !== key) gemini = { key, client: new GoogleGenAI({ apiKey: key }) };
  return gemini.client;
}

/**
 * The `httpOptions.timeout` for a Gemini call. The SDK sends it to the API as the server deadline, and the API rejects
 * anything under 10 s with a 400 ("Minimum allowed deadline is 10s", seen live 18 Nov 2026). Our own shorter cut-offs
 * stay enforced by each caller's abort signal; this only keeps the request valid.
 */
export function geminiDeadlineMs(ms: number): number {
  return Math.max(ms, 10_000);
}

/** The Anthropic client, constructed ONLY with an explicit non-empty ANTHROPIC_API_KEY, maxRetries 0 (STACK-NOTES 6.3); otherwise null. */
export function getAnthropicClient(): Anthropic | null {
  const key = envKey("ANTHROPIC_API_KEY");
  if (key === null) return null;
  if (anthropic === null || anthropic.key !== key) {
    anthropic = { key, client: new Anthropic({ apiKey: key, maxRetries: 0, timeout: ANTHROPIC_CLIENT_TIMEOUT_MS }) };
  }
  return anthropic.client;
}

/** Model ids from env with the defaults above. */
export function modelIds(): { readonly gemini: string; readonly anthropic: string } {
  return {
    gemini: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    anthropic: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
  };
}

/** Thrown by our own provider code for outcomes that are not SDK errors (an empty or refused reply, a bad shape). */
export class ProviderFailure extends Error {
  readonly failure: BrainFailure;
  constructor(failure: BrainFailure, message?: string) {
    super(message ?? `provider failure: ${failure}`);
    this.name = "ProviderFailure";
    this.failure = failure;
  }
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
