// Owner: brain-advisor. SERVER-ONLY. One advisor turn (spec 5.5, 5.7, A3, A4):
// 1. routeAdvisorMessage(request). A "router" decision is emitted as is, in every mode (rule 1).
// 2. An "open" decision goes to the provider when brainStatus().mode is "online": the tool loop (≤ 4 rounds, rule 14),
//    the system prompt built from the facts (persona 5.1), tools run by runTool, state-changing calls turned into offers
//    (5.4), navigation only on an open word (rule 7), reply checked (rules 8, 9, 16, 17), cards from data (rule 10).
// 3. The provider must produce its first event within 2.5 s; on a timeout, error, refusal or empty reply BEFORE any event
//    was sent, the decision's `local` events are emitted and the cooldown starts (rule 11). After an event was sent, the
//    template for the tool already called finishes the turn. A user abort ends the stream silently.
// The generator never throws: its last event is `done` or `error`.
// The orchestration lives in ./turn.ts (no SDK import, so it is unit-tested with a fake provider); this file wires the
// real provider switch into it. No client is constructed unless a model turn is about to run with a non-empty key.
import type { AdvisorEvent, AdvisorRequest } from "@/lib/brain/protocol";

import { anthropicRunner } from "./anthropic";
import { geminiRunner } from "./gemini";
import type { ModelRunner } from "./model-common";
import {
  brainStatus,
  classifyProviderError,
  getAnthropicClient,
  getGeminiClient,
  markProviderFailure,
  modelIds,
  resolveProvider,
} from "./provider";
import { runTurn } from "./turn";

function providerRunner(): { readonly provider: "gemini" | "anthropic"; readonly run: ModelRunner } | null {
  const provider = resolveProvider();
  if (provider === "gemini") {
    const client = getGeminiClient();
    return client ? { provider, run: geminiRunner(client, modelIds().gemini) } : null;
  }
  if (provider === "anthropic") {
    const client = getAnthropicClient();
    return client ? { provider, run: anthropicRunner(client, modelIds().anthropic) } : null;
  }
  return null;
}

export async function* runAdvisorTurn(request: AdvisorRequest, signal: AbortSignal): AsyncGenerator<AdvisorEvent> {
  try {
    yield* runTurn(request, signal, {
      status: brainStatus,
      runner: providerRunner,
      markFailure: markProviderFailure,
      classify: classifyProviderError,
    });
  } catch (error) {
    // runTurn does not throw; this is the last guard so the stream always ends with an event (STACK-NOTES 1.5).
    console.error("[brain] advisor turn failed", error);
    yield { type: "error", code: "brain_failed" };
  }
}
