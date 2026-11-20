// Owner: brain-cv. SERVER-ONLY. The model half of spec 6.6, through the ONE provider switch
// (src/lib/brain/server/provider.ts: resolveProvider, getGeminiClient, getAnthropicClient, markProviderFailure).
// Returns candidate { skill id, quoted evidence sentence } pairs, or null on timeout (12 s), error, refusal or a reply
// that is not the asked shape. The model is asked ONE thing: skills of the catalogue the CV shows but the alias lists
// missed. It never sets stars, and every pair is checked again in code (merge.ts) before it counts.
import { SKILLS } from "@/lib/data";
import { SKILL_IDS, isSkillId } from "@/lib/ids";
import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import {
  classifyProviderError,
  getAnthropicClient,
  getGeminiClient,
  markProviderFailure,
  modelIds,
  providerCoolingDown,
  resolveProvider,
} from "@/lib/brain/server/provider";
import type { SkillId } from "@/lib/types";

import { analyseCvLocal } from "../local-analyser";

/** The CV text sent to a provider is cut here (a CV is far shorter; this only bounds a pasted wall of text). */
const MODEL_INPUT_CHARS = 20_000;
/** Pairs read from one reply (the catalogue has 38 skills). */
const MAX_CANDIDATES = 38;

type Candidate = { readonly skill: SkillId; readonly evidence: string };

/** JSON Schema of the reply. Anthropic structured outputs need additionalProperties: false on every object. */
function replySchema(strict: boolean): Record<string, unknown> {
  const closed = strict ? { additionalProperties: false } : {};
  return {
    type: "object",
    properties: {
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: { skill: { type: "string", enum: [...SKILL_IDS] }, evidence: { type: "string" } },
          required: ["skill", "evidence"],
          ...closed,
        },
      },
    },
    required: ["skills"],
    ...closed,
  };
}

function systemPrompt(found: readonly SkillId[]): string {
  const catalogue = SKILLS.map((s) => `${s.id}: ${s.name} (names already searched: ${s.aliases.join(", ")})`).join("\n");
  return [
    "You read a CV for a skills platform. The skills below were already searched for by their names.",
    "Return only skills from this catalogue that the CV clearly shows WITHOUT using any of their listed names.",
    `Do not return these, they were already found: ${found.length > 0 ? found.join(", ") : "none"}.`,
    "For each skill give its id and one sentence copied word for word from the CV that proves it. Never paraphrase.",
    "Do not guess: if nothing is clearly shown, return an empty list. Do not rate levels.",
    "",
    "Catalogue (id: name):",
    catalogue,
  ].join("\n");
}

/** The reply's pairs with a known skill id and a non-empty evidence string; null when the reply is not that shape. */
export function readCandidates(json: string | undefined): Candidate[] | null {
  if (json === undefined || json.trim() === "") return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || !("skills" in data) || !Array.isArray(data.skills)) return null;
  const out: Candidate[] = [];
  for (const entry of data.skills as readonly unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const skill: unknown = "skill" in entry ? entry.skill : undefined;
    const evidence: unknown = "evidence" in entry ? entry.evidence : undefined;
    if (isSkillId(skill) && typeof evidence === "string" && evidence.trim() !== "") out.push({ skill, evidence: evidence.trim() });
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

export async function modelCvSkills(
  text: string,
  signal: AbortSignal,
): Promise<readonly { readonly skill: SkillId; readonly evidence: string }[] | null> {
  let provider: ReturnType<typeof resolveProvider>;
  try {
    provider = resolveProvider();
    if (provider === null || providerCoolingDown()) return null;
  } catch {
    return null;
  }
  const input = text.slice(0, MODEL_INPUT_CHARS);
  const found = analyseCvLocal(text).skills.map((s) => s.skill);
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(TIMEOUTS_MS.cvModel)]);
  try {
    if (provider === "gemini") {
      const client = getGeminiClient();
      if (client === null) return null;
      const response = await client.models.generateContent({
        model: modelIds().gemini,
        contents: input,
        config: {
          systemInstruction: systemPrompt(found),
          responseMimeType: "application/json",
          responseJsonSchema: replySchema(false),
          abortSignal: deadline,
          httpOptions: { timeout: TIMEOUTS_MS.cvModel },
        },
      });
      return readCandidates(response.text);
    }
    const client = getAnthropicClient();
    if (client === null) return null;
    const message = await client.messages.create(
      {
        model: modelIds().anthropic,
        max_tokens: 8000,
        system: systemPrompt(found),
        messages: [{ role: "user", content: input }],
        output_config: { effort: "low", format: { type: "json_schema", schema: replySchema(true) } },
      },
      { signal: deadline, timeout: TIMEOUTS_MS.cvModel },
    );
    // A refusal or a cut-off reply is not an outage: no cooldown, the local result stands alone.
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return null;
    const block = message.content.find((b) => b.type === "text");
    return readCandidates(block?.type === "text" ? block.text : undefined);
  } catch (error) {
    try {
      markProviderFailure(classifyProviderError(error, signal));
    } catch {
      /* the provider module failed too: nothing to record */
    }
    return null;
  }
}
