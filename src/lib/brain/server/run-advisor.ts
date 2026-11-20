// Owner: brain-advisor. SERVER-ONLY. One advisor turn (spec 5.5, 5.7, A3, A4, owner's part 7):
// 1. routeAdvisorMessage(request). A "router" decision is emitted as is, in every mode (rule 1).
// 2. An "open" decision goes to the provider chain when some slot is online (gemini-1 → gemini-2 → anthropic, each with
//    its own cooldown): the tool loop (≤ 4 rounds, rule 14), the system prompt built from the facts (persona 5.1), tools
//    run by runTool, state-changing calls turned into offers (5.4), navigation only on an open word (rule 7), reply
//    checked (rules 8, 9, 16, 17), cards from data (rule 10).
// 3. Some slot must produce its first event within 6 s (each slot gets a share; a fast failure moves on at once); when
//    every slot failed or rested, the decision's `local` events are emitted (rule 11). A user abort ends the stream
//    silently.
// The generator never throws: its last event is `done` or `error`.
// The orchestration lives in ./turn.ts and ./chain.ts (no SDK import, so they are unit-tested with fake providers);
// this file wires the real slots into it. No client is constructed unless that slot is about to be tried.
import type { AdvisorEvent, AdvisorRequest } from "@/lib/brain/protocol";

import { anthropicRunner } from "./anthropic";
import type { ChainSlot } from "./chain";
import { geminiRunner } from "./gemini";
import type { ModelRunner } from "./model-common";
import { CHAIN_HOOKS, anthropicClientFor, chainSlots, geminiClientFor } from "./provider";
import { runTurn } from "./turn";

/** The model runner of one slot, or null when its client cannot be made (no key). */
export function slotRunner(slot: ChainSlot): ModelRunner | null {
  if (slot.provider === "gemini") {
    const client = geminiClientFor(slot);
    return client ? geminiRunner(client, slot.model) : null;
  }
  const client = anthropicClientFor(slot);
  return client ? anthropicRunner(client, slot.model) : null;
}

export async function* runAdvisorTurn(request: AdvisorRequest, signal: AbortSignal): AsyncGenerator<AdvisorEvent> {
  try {
    yield* runTurn(request, signal, { slots: chainSlots, runner: slotRunner, hooks: CHAIN_HOOKS });
  } catch (error) {
    // runTurn does not throw; this is the last guard so the stream always ends with an event (STACK-NOTES 1.5).
    console.error("[brain] advisor turn failed", error);
    yield { type: "error", code: "brain_failed" };
  }
}
