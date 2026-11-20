// Owner: brain-advisor. SERVER-ONLY. The one model-assisted onboarding step (spec 4.5): classify an unmapped typed
// answer into the pending question's option ids, within 2.5 s. Ids outside the list are dropped. When offline, cooling
// down, timed out or failed: { type: "unclassified" }. Never writes words of the conversation.
// UNTESTED against a live provider (no key on this machine); the offline path (unclassified + done local) is what runs.
import { ThinkingLevel } from "@google/genai";

import { getQuestion } from "@/lib/data";
import { isOptionOf } from "@/lib/ids";
import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import type { OnboardingClassifyRequest, OnboardingEvent } from "@/lib/brain/protocol";

import {
  brainStatus,
  classifyProviderError,
  geminiDeadlineMs,
  getAnthropicClient,
  getGeminiClient,
  markProviderFailure,
  modelIds,
  resolveProvider,
  ProviderFailure,
} from "./provider";

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

async function classify(request: OnboardingClassifyRequest, signal: AbortSignal): Promise<string[]> {
  const provider = resolveProvider();
  const { system, user } = prompt(request);
  if (provider === "gemini") {
    const client = getGeminiClient();
    if (!client) return [];
    const response = await client.models.generateContent({
      model: modelIds().gemini,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, // a one-word classification: no thinking needed
        abortSignal: signal,
        httpOptions: { timeout: geminiDeadlineMs(TIMEOUTS_MS.onboardingClassify) },
      },
    });
    const text = response.candidates?.[0]?.content?.parts?.map((p) => (p.thought ? "" : (p.text ?? ""))).join("") ?? "";
    if (!text.trim()) throw new ProviderFailure("empty");
    return validOptions(request, text);
  }
  if (provider === "anthropic") {
    const client = getAnthropicClient();
    if (!client) return [];
    const model = modelIds().anthropic;
    const message = await client.messages.create(
      {
        model,
        max_tokens: 1_000,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { effort: "low" },
        ...(model.includes("haiku") ? { thinking: { type: "disabled" as const } } : {}),
      },
      { signal, timeout: TIMEOUTS_MS.onboardingClassify },
    );
    if (message.stop_reason === "refusal") throw new ProviderFailure("refusal");
    const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
    return validOptions(request, text);
  }
  return [];
}

export async function* runOnboardingClassify(request: OnboardingClassifyRequest, signal: AbortSignal): AsyncGenerator<OnboardingEvent> {
  if (brainStatus().mode !== "online") {
    yield { type: "unclassified" };
    yield { type: "done", mode: "local" };
    return;
  }

  const controller = new AbortController();
  const onUserAbort = (): void => controller.abort();
  signal.addEventListener("abort", onUserAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), TIMEOUTS_MS.onboardingClassify);
  try {
    const options = await classify(request, controller.signal);
    if (options.length > 0) yield { type: "classified", question: request.question, options };
    else yield { type: "unclassified" };
    yield { type: "done", mode: "online" };
  } catch (error) {
    if (signal.aborted) return;
    const failure = controller.signal.aborted ? "timeout" : classifyProviderError(error, signal);
    markProviderFailure(failure);
    yield { type: "unclassified" };
    yield { type: "done", mode: "local" };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onUserAbort);
  }
}
