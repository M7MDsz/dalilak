// Owner: brain-cv.
// POST /api/cv/analyse: CvAnalyseRequest (JSON) → CvAnalyseResponse (JSON). Validates the body ({ v: 1, text, fileName };
// text of at least 80 characters, else { ok: false, error: "too_short" }), then returns analyseCv(request, req.signal).
// Never throws to the client: if the model path and the merge both failed, the local analyser answers alone; only a
// bug in the local analyser itself gives { ok: false, error: "bad_request" } (status 500).
import { LIMITS, PROTOCOL_VERSION } from "@/lib/brain/protocol";
import type { CvAnalyseRequest, CvAnalyseResponse } from "@/lib/brain/protocol";
import { analyseCvLocal } from "@/lib/brain/cv";
import { analyseCv } from "@/lib/brain/cv/server/analyse";

export const runtime = "nodejs";

/** A text longer than this is not a CV (it only bounds the work of one request). */
const MAX_TEXT_CHARS = 200_000;

function parseRequest(body: unknown): CvAnalyseRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const v: unknown = "v" in body ? body.v : undefined;
  const text: unknown = "text" in body ? body.text : undefined;
  const fileName: unknown = "fileName" in body ? body.fileName : null;
  if (v !== PROTOCOL_VERSION || typeof text !== "string" || text.length > MAX_TEXT_CHARS) return null;
  if (fileName !== null && typeof fileName !== "string") return null;
  return { v: PROTOCOL_VERSION, text, fileName };
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = parseRequest(body);
  if (parsed === null) return Response.json({ ok: false, error: "bad_request" } satisfies CvAnalyseResponse, { status: 400 });
  if (parsed.text.length < LIMITS.cvMinChars) {
    return Response.json({ ok: false, error: "too_short" } satisfies CvAnalyseResponse, { status: 400 });
  }
  try {
    return Response.json(await analyseCv(parsed, request.signal));
  } catch {
    try {
      return Response.json({ ok: true, analysis: analyseCvLocal(parsed.text) } satisfies CvAnalyseResponse);
    } catch {
      return Response.json({ ok: false, error: "bad_request" } satisfies CvAnalyseResponse, { status: 500 });
    }
  }
}
