// Owner: brain-advisor.
// POST /api/advisor: AdvisorRequest (JSON) → NDJSON stream of AdvisorEvent (src/lib/brain/protocol.ts).
// Stateless: no user state in module variables. An invalid request answers ONE `error` event (bad_request).
import type { NextRequest } from "next/server";

import { ndjsonResponse } from "@/lib/brain/ndjson";
import type { AdvisorEvent } from "@/lib/brain/protocol";
import { parseAdvisorRequest } from "@/lib/brain/schemas";
import { runAdvisorTurn } from "@/lib/brain/server/run-advisor";

export const runtime = "nodejs";

async function* badRequest(): AsyncGenerator<AdvisorEvent> {
  yield { type: "error", code: "bad_request" };
}

export async function POST(req: NextRequest): Promise<Response> {
  const body: unknown = await req.json().catch(() => null);
  const request = parseAdvisorRequest(body);
  if (!request) return ndjsonResponse(badRequest());
  return ndjsonResponse(runAdvisorTurn(request, req.signal));
}
