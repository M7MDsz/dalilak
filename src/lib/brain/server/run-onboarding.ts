// Owner: brain-advisor. SERVER-ONLY. The one model-assisted onboarding step (spec 4.5): classify an unmapped typed
// answer into the pending question's option ids, within 5 s for the whole provider chain (gemini-1 → gemini-2 →
// anthropic, owner's part 7: a fast failure moves on at once, a slow slot gets a share of the 5 s). Ids outside the
// list are dropped. When every slot rests, failed or timed out: { type: "unclassified" }. Never writes words of the
// conversation.
import { getQuestion } from "@/lib/data";
import { isOptionOf } from "@/lib/ids";
import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import type { OnboardingClassifyRequest, OnboardingEvent } from "@/lib/brain/protocol";

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
