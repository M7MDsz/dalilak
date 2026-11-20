// Owner: brain-advisor. SERVER-ONLY. The Claude tool loop (STACK-NOTES 6.1-6.6), behind the provider switch.
// UNTESTED against the live API: there is no Anthropic key on this machine (spec v3 item 6). SDK 1.10 rules followed:
// no temperature / top_p / top_k; adaptive thinking by default (disabled only on Haiku, where effort "low" allows it, for
// speed against the 2.5 s first-event limit); blocks read by `type`; the assistant content pushed back whole; every tool
// result of a round in ONE user message; never run tools from a turn that ended in refusal or max_tokens.
import type Anthropic from "@anthropic-ai/sdk";

import type { ProtocolMessage } from "@/lib/brain/protocol";

import type { ModelRunner, ModelTurnInput } from "./model-common";
import { ProviderFailure } from "./provider";

/** The neutral history as Claude messages: user / assistant, consecutive turns merged, starting with a user turn. */
function toMessages(history: readonly ProtocolMessage[], message: string): Anthropic.MessageParam[] {
  const turns: { role: "user" | "assistant"; text: string }[] = [];
  for (const m of [...history, { role: "user" as const, text: message }]) {
    const role = m.role === "user" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text = `${last.text}\n${m.text}`;
    else turns.push({ role, text: m.text });
  }
  while (turns[0] && turns[0].role !== "user") turns.shift();
  return turns.map((t) => ({ role: t.role, content: t.text }));
}

function isToolErrorLike(value: unknown): boolean {
  return typeof value === "object" && value !== null && "error" in value && "detail" in value;
}

/** Room for adaptive thinking plus a short reply (thinking counts toward max_tokens: STACK-NOTES 6.2). */
const MAX_TOKENS = 8_000;

export function anthropicRunner(client: Anthropic, model: string): ModelRunner {
  const haiku = model.includes("haiku");
  return async (input: ModelTurnInput): Promise<string> => {
    const messages = toMessages(input.history, input.message);
    const tools: Anthropic.Tool[] = input.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { ...t.schema, type: "object", required: t.schema.required ? [...t.schema.required] : [] },
    }));

    for (let round = 0; round <= input.maxRounds; round++) {
      const last = round === input.maxRounds;
      const message = await client.messages.create(
        {
          model,
          max_tokens: MAX_TOKENS,
          system: input.system,
          messages,
          tools,
          // The last round must answer in words: tools stay defined (the transcript holds tool_use blocks) but none may run.
          ...(last ? { tool_choice: { type: "none" as const } } : {}),
          output_config: { effort: "low" },
          ...(haiku ? { thinking: { type: "disabled" as const } } : {}),
        },
        { signal: input.signal, timeout: input.perCallTimeoutMs },
      );
      input.onFirstEvent();

      if (message.stop_reason === "refusal") throw new ProviderFailure("refusal");
      if (message.stop_reason === "max_tokens") throw new ProviderFailure("empty", "max_tokens");

      const uses = message.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      if (uses.length === 0) {
        const text = message.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("")
          .trim();
        if (!text) throw new ProviderFailure("empty");
        return text;
      }

      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.ToolResultBlockParam[] = uses.map((use) => {
        const output = input.onToolCall({ name: use.name, args: use.input });
        return {
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(output),
          ...(isToolErrorLike(output) ? { is_error: true } : {}),
        };
      });
      messages.push({ role: "user", content: results });
    }
    throw new ProviderFailure("invalid", "too many tool rounds");
  };
}
