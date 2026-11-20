// Owner: brain-advisor. SERVER-ONLY. The one model-assisted onboarding step (spec 4.5): classify an unmapped typed
// answer into the pending question's option ids, within 5 s for the whole provider chain (gemini-1 → gemini-2 →
// anthropic, owner's part 7: a fast failure moves on at once, a slow slot gets a share of the 5 s). Ids outside the
// list are dropped. When every slot rests, failed or timed out: { type: "unclassified" }. Never writes words of the
// conversation.
import { getQuestion } from "@/lib/data";
import { isOptionOf } from "@/lib/ids";
import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import type { OnboardingClassifyRequest, OnboardingEvent } from "@/lib/brain/protocol";

import {
  PHRASE_SERVER_MS,
  checkUnderstood,
  parsePhraseReply,
  phraseProblem,
  phrasePrompt,
  understandPrompt,
  type OnboardingPhraseRequest,
  type OnboardingUnderstandRequest,
  type UnderstandResult,
} from "../onboarding/phrase";

import { ProviderFailure, liveSlots, recordLocalOnly, runChain, type ChainHooks, type ChainSlot } from "./chain";
import { geminiThinking } from "./gemini";
import { CHAIN_HOOKS, anthropicClientFor, chainSlots, geminiClientFor, geminiDeadlineMs } from "./provider";

function prompt(request: OnboardingClassifyRequest): { system: string; user: string } {
  const question = getQuestion(request.question);
  const options = question.options
    .filter((o) => !(request.question === "city" && o.id === "other"))
    .map((o) => `${o.id} = «${o.label}»`)
    .join("\n");
  const many = request.question === "interest" ? "one or two ids" : "exactly one id";
  return {
    system:
      'You classify one answer from an Arabic onboarding chat into option ids. Reply with JSON only: {"options": ["id"]}. ' +
      `Use ${many} from the list, or {"options": []} when none fits. Never invent an id. Write nothing else.`,
    user: `Question: «${question.text}»\nOptions:\n${options}\nAnswer: «${request.text}»`,
  };
}

/** The option ids found in a model's JSON reply, kept only when valid for the question (interest: up to two). */
function validOptions(request: OnboardingClassifyRequest, raw: string): string[] {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const options = typeof parsed === "object" && parsed !== null && "options" in parsed ? (parsed as { options: unknown }).options : null;
  if (!Array.isArray(options)) return [];
  const valid = [...new Set(options.filter((o): o is string => isOptionOf(request.question, o)))];
  return valid.slice(0, request.question === "interest" ? 2 : 1);
}

/** One slot's classification: the valid option ids (an empty list is an answer: nothing fits). Throws on failure. */
export type SlotClassifier = (slot: ChainSlot, request: OnboardingClassifyRequest, signal: AbortSignal, shareMs: number) => Promise<string[]>;

const classifyWithSlot: SlotClassifier = async (slot, request, signal, shareMs) => {
  const { system, user } = prompt(request);
  if (slot.provider === "gemini") {
    const client = geminiClientFor(slot);
    if (!client) throw new ProviderFailure("auth", `${slot.id}: no client`);
    const response = await client.models.generateContent({
      model: slot.model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        thinkingConfig: geminiThinking(slot.model), // a one-word classification: no thinking needed
        abortSignal: signal,
        httpOptions: { timeout: geminiDeadlineMs(TIMEOUTS_MS.onboardingClassify) },
      },
    });
    const text = response.candidates?.[0]?.content?.parts?.map((p) => (p.thought ? "" : (p.text ?? ""))).join("") ?? "";
    if (!text.trim()) throw new ProviderFailure("empty");
    return validOptions(request, text);
  }
  const client = anthropicClientFor(slot);
  if (!client) throw new ProviderFailure("auth", `${slot.id}: no client`);
  const message = await client.messages.create(
    {
      model: slot.model,
      max_tokens: 1_000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low" },
      ...(slot.model.includes("haiku") ? { thinking: { type: "disabled" as const } } : {}),
    },
    { signal, timeout: shareMs },
  );
  if (message.stop_reason === "refusal") throw new ProviderFailure("refusal");
  const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  return validOptions(request, text);
};

/** What the classification needs from the outside (a seam so the chain is tested without a key or a network). */
export interface OnboardingDeps {
  readonly slots: () => readonly ChainSlot[];
  readonly classify: SlotClassifier;
  readonly hooks: ChainHooks;
  /** The whole chain's budget (default TIMEOUTS_MS.onboardingClassify = 5 s; the client also aborts at 5 s). */
  readonly budgetMs?: number;
}

export async function* runOnboardingClassifyWith(
  request: OnboardingClassifyRequest,
  signal: AbortSignal,
  deps: OnboardingDeps,
): AsyncGenerator<OnboardingEvent> {
  const slots = deps.slots();
  if (liveSlots(slots, deps.hooks.coolingDown).live.length === 0) {
    recordLocalOnly("onboarding", slots, deps.hooks);
    yield { type: "unclassified" };
    yield { type: "done", mode: "local" };
    return;
  }

  const result = await runChain<string[]>({
    task: "onboarding",
    slots,
    signal,
    firstEventMs: deps.budgetMs ?? TIMEOUTS_MS.onboardingClassify,
    hooks: deps.hooks,
    attempt: (slot, attempt) => deps.classify(slot, request, attempt.signal, attempt.shareMs),
  });
  if (!result.ok) {
    if (result.aborted || signal.aborted) return;
    yield { type: "unclassified" };
    yield { type: "done", mode: "local" };
    return;
  }
  if (result.value.length > 0) yield { type: "classified", question: request.question, options: result.value };
  else yield { type: "unclassified" };
  yield { type: "done", mode: "online" };
}

export async function* runOnboardingClassify(request: OnboardingClassifyRequest, signal: AbortSignal): AsyncGenerator<OnboardingEvent> {
  try {
    yield* runOnboardingClassifyWith(request, signal, { slots: chainSlots, classify: classifyWithSlot, hooks: CHAIN_HOOKS });
  } catch (error) {
    // The chain does not throw; the conversation only needs to know nothing was classified.
    console.error("[brain] onboarding classification failed", error);
    yield { type: "unclassified" };
    yield { type: "done", mode: "local" };
  }
}

// ── The model layer of «دليلك»'s onboarding (docs/ONBOARDING-FLOW.md 4): rephrasing and understanding ───────────────

/** One model call that answers JSON, on one slot of the chain. Resolves to the raw text; throws on a provider failure. */
export type SlotJson = (slot: ChainSlot, prompt: { readonly system: string; readonly user: string }, signal: AbortSignal, shareMs: number) => Promise<string>;

const jsonWithSlot: SlotJson = async (slot, { system, user }, signal, shareMs) => {
  if (slot.provider === "gemini") {
    const client = geminiClientFor(slot);
    if (!client) throw new ProviderFailure("auth", `${slot.id}: no client`);
    const response = await client.models.generateContent({
      model: slot.model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        thinkingConfig: geminiThinking(slot.model),
        abortSignal: signal,
        // the API rejects a deadline under 10 s; our own cut-off is the chain's abort signal (3 s)
        httpOptions: { timeout: geminiDeadlineMs(shareMs) },
      },
    });
    const text = response.candidates?.[0]?.content?.parts?.map((p) => (p.thought ? "" : (p.text ?? ""))).join("") ?? "";
    if (!text.trim()) throw new ProviderFailure("empty");
    return text;
  }
  const client = anthropicClientFor(slot);
  if (!client) throw new ProviderFailure("auth", `${slot.id}: no client`);
  const message = await client.messages.create(
    {
      model: slot.model,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low" },
      ...(slot.model.includes("haiku") ? { thinking: { type: "disabled" as const } } : {}),
    },
    { signal, timeout: shareMs },
  );
  if (message.stop_reason === "refusal") throw new ProviderFailure("refusal");
  return message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
};

/** A model reply that failed the checks (logged with its reason; the template is shown). */
class ReplyRejected extends Error {
  constructor(readonly problem: string) {
    super(`model reply refused: ${problem}`);
    this.name = "ReplyRejected";
  }
}

export interface LayerDeps {
  readonly slots: () => readonly ChainSlot[];
  readonly json: SlotJson;
  readonly hooks: ChainHooks;
  /** The whole chain's budget (default 3 s; the browser gives up at 3.5 s). */
  readonly budgetMs?: number;
}

export type LayerOutcome<T> = { readonly ok: true; readonly value: T; readonly ms: number } | { readonly ok: false; readonly why: string };

/**
 * One model step within the budget: gemini-1 → gemini-2 → anthropic (a fast failure moves on, a slow one is cut by the
 * chain's abort signal). `check` turns the raw reply into the value, or a reason to refuse it. Never throws.
 */
async function runLayer<T>(prompt: { system: string; user: string }, check: (raw: string) => T | string, signal: AbortSignal, deps: LayerDeps): Promise<LayerOutcome<T>> {
  const slots = deps.slots();
  if (liveSlots(slots, deps.hooks.coolingDown).live.length === 0) {
    recordLocalOnly("onboarding", slots, deps.hooks);
    return { ok: false, why: slots.length === 0 ? "no provider" : "resting" };
  }
  const started = Date.now();
  const result = await runChain<T>({
    task: "onboarding",
    slots,
    signal,
    firstEventMs: deps.budgetMs ?? PHRASE_SERVER_MS,
    hooks: deps.hooks,
    attempt: async (slot, attempt) => {
      const raw = await deps.json(slot, prompt, attempt.signal, attempt.shareMs);
      const value = check(raw);
      if (typeof value === "string") throw new ReplyRejected(value);
      return value;
    },
  });
  if (!result.ok) return { ok: false, why: result.aborted ? "aborted" : result.misses.map((m) => `${m.slot}:${m.why}`).join(",") || "failed" };
  return { ok: true, value: result.value, ms: Date.now() - started };
}

/** The product hooks, except that a refused reply never rests a slot (the next turn may phrase fine). */
function layerHooks(): ChainHooks {
  return {
    ...CHAIN_HOOKS,
    markFailure: (slot, failure) => (failure === "invalid" ? undefined : CHAIN_HOOKS.markFailure(slot, failure)),
    classify: (error, s) => {
      if (error instanceof ReplyRejected) {
        console.info(`[brain] onboarding model reply refused (${error.problem}); the template is used`);
        return "invalid";
      }
      return CHAIN_HOOKS.classify(error, s);
    },
  };
}

export function runOnboardingPhraseWith(request: OnboardingPhraseRequest, signal: AbortSignal, deps: LayerDeps): Promise<LayerOutcome<readonly string[]>> {
  return runLayer(
    phrasePrompt(request),
    (raw) => {
      const lines = parsePhraseReply(raw);
      if (lines === null) return "no JSON lines";
      return phraseProblem(request, lines) ?? lines;
    },
    signal,
    deps,
  );
}

/** Rephrases a template (checked line by line); { ok: false } → the browser keeps its template. */
export async function runOnboardingPhrase(request: OnboardingPhraseRequest, signal: AbortSignal): Promise<LayerOutcome<readonly string[]>> {
  try {
    return await runOnboardingPhraseWith(request, signal, { slots: chainSlots, json: jsonWithSlot, hooks: layerHooks() });
  } catch (error) {
    console.error("[brain] onboarding rephrase failed", error);
    return { ok: false, why: "error" };
  }
}

export function runOnboardingUnderstandWith(request: OnboardingUnderstandRequest, signal: AbortSignal, deps: LayerDeps): Promise<LayerOutcome<UnderstandResult>> {
  return runLayer(understandPrompt(request), (raw) => checkUnderstood(request, raw) ?? "invalid decision", signal, deps);
}

/** Reads one typed message: an answer (option ids), a side question (a checked Najdi reply), or nothing. */
export async function runOnboardingUnderstand(request: OnboardingUnderstandRequest, signal: AbortSignal): Promise<LayerOutcome<UnderstandResult>> {
  try {
    return await runOnboardingUnderstandWith(request, signal, { slots: chainSlots, json: jsonWithSlot, hooks: layerHooks() });
  } catch (error) {
    console.error("[brain] onboarding understanding failed", error);
    return { ok: false, why: "error" };
  }
}
