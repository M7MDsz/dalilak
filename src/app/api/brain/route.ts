// Owner: brain-advisor.
// GET /api/brain → BrainStatus (JSON): { configured, provider, mode }. The browser cannot see server env (STACK-NOTES
// 1.7), so the mode line (3.14), the CV privacy line (3.6) and the profile sentence (3.13) ask here.
import { brainStatus } from "@/lib/brain/server/provider";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json(brainStatus(), { headers: { "Cache-Control": "no-store" } });
}
