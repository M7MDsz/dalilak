// Owner: brain-advisor.
// POST /api/onboarding/phrase: OnboardingPhraseRequest (JSON) → { ok: true, lines } | { ok: false } (docs/ONBOARDING-FLOW.md
// 4). The model rewrites only the words of «دليلك»'s onboarding template, within 3 s, and every line is checked before it
// is returned. Offline or with no key it answers { ok: false } at once and the browser shows the template.
import type { NextRequest } from "next/server";

import { parsePhraseRequest } from "@/lib/brain/onboarding/phrase";
import { runOnboardingPhrase } from "@/lib/brain/server/run-onboarding";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const request = parsePhraseRequest(body);
  if (!request) return Response.json({ ok: false }, { status: 400 });
  const out = await runOnboardingPhrase(request, req.signal);
  return Response.json(out.ok ? { ok: true, lines: out.value, ms: out.ms } : { ok: false, why: out.why }, { headers: { "Cache-Control": "no-store" } });
}
