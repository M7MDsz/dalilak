// Owner: brain-advisor. SERVER-ONLY. The Gemini tool loop (STACK-NOTES 5.3-5.6), one runner per chain slot (gemini-1,
// gemini-2). Tested live 18 and 20 Nov 2026. Built from the installed SDK's types and the stack notes: everything goes
// in `config`; roles are user / model; function results go back as ONE user turn per round; the model's content is
// appended exactly as received (its parts may carry thoughtSignature).
import { FunctionCallingConfigMode, ThinkingLevel, type Content, type GoogleGenAI, type Part, type ThinkingConfig } from "@google/genai";

import type { ProtocolMessage } from "@/lib/brain/protocol";

import { ProviderFailure } from "./chain";
import type { ModelRunner, ModelTurnInput } from "./model-common";
import { geminiDeadlineMs } from "./provider";

/**
 * The least thinking a model allows. Gemini 3 models take a level (minimal: measured live 18 Nov 2026 on
 * gemini-3.5-flash-lite, 0.8-1.4 s per call instead of 1.0-3.0 s, replies as good); Gemini 2.x models (a GEMINI_MODEL_2
 * the owner may pick) know only a token budget, where 0 turns thinking off.
 */
export function geminiThinking(model: string): ThinkingConfig {
  return /^gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL };
}

/** The neutral history as Gemini contents: roles user / model, consecutive turns merged, starting with a user turn. */
function toContents(history: readonly ProtocolMessage[], message: string): Content[] {
  const turns: { role: "user" | "model"; text: string }[] = [];
  for (const m of [...history, { role: "user" as const, text: message }]) {
    const role = m.role === "user" ? "user" : "model";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text = `${last.text}\n${m.text}`;
    else turns.push({ role, text: m.text });
  }
  while (turns[0] && turns[0].role !== "user") turns.shift();
  return turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
}

function isToolErrorLike(value: unknown): boolean {
  return typeof value === "object" && value !== null && "error" in value && "detail" in value;
}

export function geminiRunner(client: GoogleGenAI, model: string): ModelRunner {
  return async (input: ModelTurnInput): Promise<string> => {
    const contents = toContents(input.history, input.message);
    const tools = [
      {
        functionDeclarations: input.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parametersJsonSchema: t.schema,
        })),
      },
    ];

    for (let round = 0; round <= input.maxRounds; round++) {
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: input.system,
          // the least thinking: the default crossed the 6 s first-event limit late in a conversation
          thinkingConfig: geminiThinking(model),
          tools,
          toolConfig: {
            functionCallingConfig: { mode: round < input.maxRounds ? FunctionCallingConfigMode.AUTO : FunctionCallingConfigMode.NONE },
          },
          abortSignal: input.signal,
          httpOptions: { timeout: geminiDeadlineMs(input.perCallTimeoutMs) },
        },
      });
      input.onFirstEvent();

      if (response.promptFeedback?.blockReason) throw new ProviderFailure("refusal", String(response.promptFeedback.blockReason));
      const candidate = response.candidates?.[0];
      const parts: Part[] = candidate?.content?.parts ?? [];
      const calls = parts.flatMap((p) => (p.functionCall ? [p.functionCall] : []));

      if (calls.length === 0) {
        const text = parts
          .filter((p) => p.thought !== true && typeof p.text === "string")
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (!text) throw new ProviderFailure("empty", `finishReason ${String(candidate?.finishReason ?? "none")}`);
        return text;
      }

      if (candidate?.content) contents.push(candidate.content);
      const responses: Part[] = [];
      for (const call of calls) {
        const name = call.name ?? "";
        const output = input.onToolCall({ name, args: call.args ?? {} });
        responses.push({
          functionResponse: {
            ...(call.id ? { id: call.id } : {}),
            name,
            response: isToolErrorLike(output) ? { error: output } : { output },
          },
        });
      }
      contents.push({ role: "user", parts: responses });
    }
    throw new ProviderFailure("invalid", "too many tool rounds");
  };
}
