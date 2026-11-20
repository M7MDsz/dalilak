// Owner: brain-advisor. SERVER-ONLY. The Gemini tool loop (STACK-NOTES 5.3-5.6), behind the provider switch.
// UNTESTED against the live API: there is no key on this machine (spec v3 item 6). Built from the installed SDK's types
// and the stack notes: everything goes in `config`; roles are user / model; function results go back as ONE user turn
// per round; the model's content is appended exactly as received (its parts may carry thoughtSignature).
import { FunctionCallingConfigMode, ThinkingLevel, type Content, type GoogleGenAI, type Part } from "@google/genai";

import type { ProtocolMessage } from "@/lib/brain/protocol";

import type { ModelRunner, ModelTurnInput } from "./model-common";
import { ProviderFailure, geminiDeadlineMs } from "./provider";

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
          // minimal thinking: measured live 18 Nov 2026 on gemini-3.5-flash-lite, 0.8-1.4 s per call instead of 1.0-3.0 s
          // with replies as good; the default crossed the 6 s first-event limit late in a conversation
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
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
