// Owner: brain-advisor.
// POST /api/onboarding/understand: OnboardingUnderstandRequest (JSON) → { ok: true, result } | { ok: false }
// (docs/ONBOARDING-FLOW.md 4). «دليلك» reads one typed onboarding message within 3 s: an answer (option ids from the
// list), a side question (a checked Najdi reply from the onboarding facts), or nothing. The browser's own reader stays
// the guard and the fallback; offline or with no key this answers { ok: false } at once.
import type { NextRequest } from "next/server";

import { parseUnderstandRequest } from "@/lib/brain/onboarding/phrase";
import { runOnboardingUnderstand } from "@/lib/brain/server/run-onboarding";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const request = parseUnderstandRequest(body);
  if (!request) return Response.json({ ok: false }, { status: 400 });
  const out = await runOnboardingUnderstand(request, req.signal);
  return Response.json(out.ok ? { ok: true, result: out.value, ms: out.ms } : { ok: false, why: out.why }, { headers: { "Cache-Control": "no-store" } });
}
