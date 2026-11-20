// Owner: brain-cv.
// POST /api/cv/extract: multipart form, field "cv" (File) → CvExtractResponse (JSON). 200 on ok; 4xx with the same JSON
// shape on errors (415 wrong_type, 413 too_large / too_many_pages, 422 unreadable / no_text, 400 no file). A route
// handler, not a Server Action (1 MB body cap, STACK-NOTES 1.4). Stateless: the file is read and dropped.
import type { CvExtractResponse } from "@/lib/brain/protocol";
import { extractCvText } from "@/lib/brain/cv/server/extract";

export const runtime = "nodejs";

const STATUS: Readonly<Record<Exclude<CvExtractResponse, { ok: true }>["error"], number>> = {
  wrong_type: 415,
  too_large: 413,
  too_many_pages: 413,
  unreadable: 422,
  no_text: 422,
};

const UNREADABLE: CvExtractResponse = { ok: false, error: "unreadable" };

export async function POST(request: Request): Promise<Response> {
  let file: FormDataEntryValue | null = null;
  try {
    file = (await request.formData()).get("cv");
  } catch {
    return Response.json(UNREADABLE, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json(UNREADABLE, { status: 400 });
  let result: CvExtractResponse;
  try {
    result = await extractCvText(file);
  } catch {
    result = UNREADABLE;
  }
  return Response.json(result, { status: result.ok ? 200 : STATUS[result.error] });
}
