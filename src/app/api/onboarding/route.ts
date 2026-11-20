// Owner: brain-advisor.
// POST /api/onboarding: OnboardingClassifyRequest (JSON) → NDJSON stream of OnboardingEvent (the one model-assisted
// step of spec 4.5). Offline or with no key it answers { unclassified } then { done, mode: "local" } at once.
import type { NextRequest } from "next/server";

import { ndjsonResponse } from "@/lib/brain/ndjson";
import type { OnboardingEvent } from "@/lib/brain/protocol";
import { parseOnboardingClassifyRequest } from "@/lib/brain/schemas";
import { runOnboardingClassify } from "@/lib/brain/server/run-onboarding";

export const runtime = "nodejs";

async function* badRequest(): AsyncGenerator<OnboardingEvent> {
  yield { type: "error", code: "bad_request" };
}

export async function POST(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const request = parseOnboardingClassifyRequest(body);
  if (!request) return ndjsonResponse(badRequest());
  return ndjsonResponse(runOnboardingClassify(request, req.signal));
}
