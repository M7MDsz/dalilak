// Owner: brain-cv. SERVER-ONLY. The model half of spec 6.6, through the provider chain
// (src/lib/brain/server/provider.ts + chain.ts: gemini-1 → gemini-2 → anthropic, each with its own cooldown; the 12 s
// budget is shared along the chain, a fast failure moves on at once).
// Returns candidate { skill id, quoted evidence sentence } pairs, or null when every slot timed out, failed or rests,
// or the answering slot refused or replied in another shape. The model is asked ONE thing: skills of the catalogue the
// CV shows but the alias lists missed. It never sets stars, and every pair is checked again in code (merge.ts) before
// it counts.
import { SKILLS } from "@/lib/data";
import { SKILL_IDS, isSkillId } from "@/lib/ids";
import { TIMEOUTS_MS } from "@/lib/brain/protocol";
import { ProviderFailure, liveSlots, runChain, type ChainHooks, type ChainSlot } from "@/lib/brain/server/chain";
import { CHAIN_HOOKS, anthropicClientFor, chainSlots, geminiClientFor, geminiDeadlineMs } from "@/lib/brain/server/provider";
import type { SkillId } from "@/lib/types";

import { analyseCvLocal } from "../local-analyser";

/** The CV text sent to a provider is cut here (a CV is far shorter; this only bounds a pasted wall of text). */
const MODEL_INPUT_CHARS = 20_000;
/** Pairs read from one reply (at most one per catalogue skill). */
const MAX_CANDIDATES = SKILL_IDS.length;

type Candidate = { readonly skill: SkillId; readonly evidence: string };

/**
 * JSON Schema of the reply. Anthropic structured outputs need additionalProperties: false on every object. The skill id
 * is a plain string, NOT an enum of the catalogue: with 114 ids Gemini refuses the schema («too much branching for
 * serving», HTTP 400; CV-reader test, 21 Nov 2026), and a 400 cooled down every Gemini slot, so the onboarding and
 * advisor chats went local for a minute after each CV. The ids are listed in the system prompt and checked by
 * readCandidates (isSkillId).
 */
export function replySchema(strict: boolean): Record<string, unknown> {
  const closed = strict ? { additionalProperties: false } : {};
  return {
    type: "object",
    properties: {
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: { skill: { type: "string" }, evidence: { type: "string" } },
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

type CvCandidates = readonly { readonly skill: SkillId; readonly evidence: string }[];

/**
 * One slot's answer: the pairs, or null for a reply that came back but is of no use (a refusal, a cut-off reply, another
 * shape). That is not an outage: no cooldown, no next slot, the local result stands alone. Throws on a real failure.
 */
export type CvSlotCall = (slot: ChainSlot, input: string, system: string, signal: AbortSignal, shareMs: number) => Promise<CvCandidates | null>;

const callSlot: CvSlotCall = async (slot, input, system, signal, shareMs) => {
  if (slot.provider === "gemini") {
    const client = geminiClientFor(slot);
    if (client === null) throw new ProviderFailure("auth", `${slot.id}: no client`);
    const response = await client.models.generateContent({
      model: slot.model,
      contents: input,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: replySchema(false),
        abortSignal: signal,
        httpOptions: { timeout: geminiDeadlineMs(TIMEOUTS_MS.cvModel) },
      },
    });
    return readCandidates(response.text);
  }
  const client = anthropicClientFor(slot);
  if (client === null) throw new ProviderFailure("auth", `${slot.id}: no client`);
  const message = await client.messages.create(
    {
      model: slot.model,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: input }],
      output_config: { effort: "low", format: { type: "json_schema", schema: replySchema(true) } },
    },
    { signal, timeout: shareMs },
  );
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return null;
  const block = message.content.find((b) => b.type === "text");
  return readCandidates(block?.type === "text" ? block.text : undefined);
};

/** What the CV model call needs from the outside (a seam so the chain is tested without a key or a network). */
export interface CvModelDeps {
  readonly slots: () => readonly ChainSlot[];
  readonly call: CvSlotCall;
  readonly hooks: ChainHooks;
  /** The whole chain's budget (default TIMEOUTS_MS.cvModel = 12 s). */
  readonly budgetMs?: number;
}

export async function modelCvSkillsWith(text: string, signal: AbortSignal, deps: CvModelDeps): Promise<CvCandidates | null> {
  let slots: readonly ChainSlot[];
  try {
    slots = deps.slots();
    if (liveSlots(slots, deps.hooks.coolingDown).live.length === 0) return null;
  } catch {
    return null;
  }
  const input = text.slice(0, MODEL_INPUT_CHARS);
  const system = systemPrompt(analyseCvLocal(text).skills.map((s) => s.skill));
  const result = await runChain<CvCandidates | null>({
    task: "cv",
    slots,
    signal,
    firstEventMs: deps.budgetMs ?? TIMEOUTS_MS.cvModel,
    hooks: deps.hooks,
    attempt: (slot, attempt) => deps.call(slot, input, system, attempt.signal, attempt.shareMs),
  });
  return result.ok ? result.value : null;
}

export async function modelCvSkills(text: string, signal: AbortSignal): Promise<CvCandidates | null> {
  try {
    return await modelCvSkillsWith(text, signal, { slots: chainSlots, call: callSlot, hooks: CHAIN_HOOKS });
  } catch {
    return null; // the chain does not throw; any surprise here leaves the local result alone
  }
}
