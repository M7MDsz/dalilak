// Owner: brain-advisor.
// GET /api/brain/log → the provider chain for /dev/brain (development page): { status, chain, replies }.
// status = BrainStatus (as GET /api/brain); chain = each slot (gemini-1, gemini-2, anthropic) with its model, the NAMES
// of its env variables, whether it is in the chain, its cooldown and last failure; replies = the last 20 replies (who
// answered, model, ms, the slots that missed and why). Never a key value, not even partly. The cooldowns and the
// reply list live on globalThis (src/lib/brain/server/chain.ts), so this route sees what the brain routes recorded.
import { recentReplies } from "@/lib/brain/server/chain";
import { brainStatus, chainState } from "@/lib/brain/server/provider";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({ status: brainStatus(), chain: chainState(), replies: recentReplies() }, { headers: { "Cache-Control": "no-store" } });
}
