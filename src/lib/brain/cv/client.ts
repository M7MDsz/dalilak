// Owner: brain-cv. Browser-side CV calls. No SDK, no server import.
import { isSkillId } from "@/lib/ids";
import { LIMITS, TIMEOUTS_MS } from "@/lib/brain/protocol";
import type { CvAnalyseRequest, CvAnalyseResponse, CvErrorCode, CvExtractResponse } from "@/lib/brain/protocol";
import type { CvAnalysis, CvProfile, CvSkill } from "@/lib/types";

type RequestFailed = { readonly ok: false; readonly error: "request_failed" };
const REQUEST_FAILED: RequestFailed = { ok: false, error: "request_failed" };

const ACCEPTED_EXTENSIONS: readonly string[] = [".pdf", ".docx"];

/** Instant checks before uploading (spec 6.1): extension .pdf / .docx (else wrong_type), size ≤ 5 MB (else too_large). */
export function precheckCvFile(file: File): Extract<CvErrorCode, "wrong_type" | "too_large"> | null {
  const name = file.name.trim().toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return "wrong_type";
  if (file.size > LIMITS.cvMaxBytes) return "too_large";
  return null;
}

// ─── Response shape checks (the server is ours, but a dev-server error page or a proxy must not crash the screen) ──

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

type ExtractError = Exclude<CvErrorCode, "request_failed">;
const EXTRACT_ERRORS: readonly ExtractError[] = ["wrong_type", "too_large", "too_many_pages", "unreadable", "no_text"];
const isExtractError = (value: unknown): value is ExtractError => EXTRACT_ERRORS.some((code) => code === value);

function asExtractResponse(data: unknown): CvExtractResponse | null {
  if (!isRecord(data)) return null;
  if (data.ok === true) {
    const { text, kind, pages, fileName } = data;
    if (typeof text !== "string" || (kind !== "pdf" && kind !== "docx") || typeof fileName !== "string") return null;
    if (pages !== null && typeof pages !== "number") return null;
    return { ok: true, text, kind, pages, fileName };
  }
  if (data.ok === false && isExtractError(data.error)) return { ok: false, error: data.error };
  return null;
}

function asCvSkill(value: unknown): CvSkill | null {
  if (!isRecord(value)) return null;
  const { skill, stars, evidence, line } = value;
  if (!isSkillId(skill) || (stars !== 1 && stars !== 2 && stars !== 3)) return null;
  if (typeof evidence !== "string" || typeof line !== "number" || !Number.isInteger(line) || line < 0) return null;
  return { skill, stars, evidence, line };
}

function asAnalysis(value: unknown): CvAnalysis | null {
  if (!isRecord(value)) return null;
  const { skills, lines, engine, isSample } = value;
  if (!Array.isArray(skills) || !Array.isArray(lines) || (engine !== "local" && engine !== "model") || typeof isSample !== "boolean") {
    return null;
  }
  if (!lines.every((line): line is string => typeof line === "string")) return null;
  const parsed: CvSkill[] = [];
  for (const entry of skills) {
    const skill = asCvSkill(entry);
    if (skill === null || skill.line >= lines.length) return null;
    parsed.push(skill);
  }
  const profile = asProfile(value.profile);
  return { skills: parsed, lines, engine, isSample, ...(profile ? { profile } : {}) };
}

const STATUSES = ["graduated", "studying", "incomplete"] as const;
const DEGREES = ["secondary", "diploma", "bachelor", "postgrad"] as const;

/** The model's profile, field by field (a bad field is dropped, never the whole analysis). */
function asProfile(value: unknown): CvProfile | null {
  if (!isRecord(value)) return null;
  const text = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" && v.length <= 120 ? v.trim() : null);
  const status = STATUSES.find((s) => s === value.status) ?? null;
  const degree = DEGREES.find((d) => d === value.degree) ?? null;
  const years = typeof value.years === "number" && Number.isFinite(value.years) && value.years >= 0 && value.years <= 50 ? value.years : null;
  return { city: text(value.city), status, degree, major: text(value.major), years, currentRole: text(value.currentRole) };
}

function asAnalyseResponse(data: unknown): CvAnalyseResponse | null {
  if (!isRecord(data)) return null;
  if (data.ok === true) {
    const analysis = asAnalysis(data.analysis);
    return analysis === null ? null : { ok: true, analysis };
  }
  if (data.ok === false && (data.error === "too_short" || data.error === "bad_request")) return { ok: false, error: data.error };
  return null;
}

/** A signal that aborts when `outer` aborts or after `ms` (no reliance on AbortSignal.any / timeout support). */
function withDeadline(outer: AbortSignal | undefined, ms: number): { readonly signal: AbortSignal; readonly done: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, ms);
  if (outer?.aborted) controller.abort();
  else outer?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      outer?.removeEventListener("abort", abort);
    },
  };
}

/** POST /api/cv/extract (multipart, field "cv"; do not set Content-Type). A failed request → { ok: false, error: "request_failed" }. */
export async function extractCvFile(
  file: File,
  signal?: AbortSignal,
): Promise<CvExtractResponse | { readonly ok: false; readonly error: "request_failed" }> {
  try {
    const body = new FormData();
    body.append("cv", file);
    const response = await fetch("/api/cv/extract", { method: "POST", body, signal });
    const data: unknown = await response.json().catch(() => null);
    return asExtractResponse(data) ?? REQUEST_FAILED;
  } catch {
    return REQUEST_FAILED;
  }
}

/**
 * POST /api/cv/analyse, aborted after TIMEOUTS_MS.cvAnalyseClient. A failed request → { ok: false, error: "request_failed" }.
 * The cv screen shows «تعذّر التحليل الآن. جرّب مرة أخرى.» with «أعد المحاولة» for request_failed AND for the server's
 * too_short / bad_request (the screen's own 80-character check makes those unreachable in normal use; 3.6 has no other line).
 */
export async function analyseCvText(
  request: CvAnalyseRequest,
  signal?: AbortSignal,
): Promise<CvAnalyseResponse | { readonly ok: false; readonly error: "request_failed" }> {
  const deadline = withDeadline(signal, TIMEOUTS_MS.cvAnalyseClient);
  try {
    const response = await fetch("/api/cv/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: deadline.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    return asAnalyseResponse(data) ?? REQUEST_FAILED;
  } catch {
    return REQUEST_FAILED;
  } finally {
    deadline.done();
  }
}
