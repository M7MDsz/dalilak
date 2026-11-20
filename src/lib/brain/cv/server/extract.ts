// Owner: brain-cv. SERVER-ONLY (unpdf, mammoth: both in next.config serverExternalPackages).
// File → text (spec 6.1, STACK-NOTES 1.6, 7): type by extension (.pdf / .docx, else wrong_type), > 5 MB too_large,
// PDF pages > 15 too_many_pages (checked on numPages BEFORE extracting), a reader exception unreadable, < 80 non-space
// characters no_text. Nothing is fetched from the network; the file is not kept.
// PDF text is rebuilt in logical reading order from the items' positions (./pdf-lines.ts explains why: Arabic PDFs
// come out reversed otherwise), then NFKC-folded (presentation forms and ligatures → ordinary letters).
import mammoth from "mammoth";

import { LIMITS } from "@/lib/brain/protocol";
import type { CvExtractResponse } from "@/lib/brain/protocol";

import { foldArabicLookalikes } from "../clean";

import { applyLigatureFixes, ligatureFixes, pdfItemsToText, type PdfTextItem } from "./pdf-lines";

const nonSpaceLength = (text: string): number => text.replace(/\s+/gu, "").length;

/** The page's text-drawing runs, as drawn: each glyph's text, or a number for a spacing adjustment. [] on any failure. */
async function glyphRuns(page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }> }): Promise<(string | number)[][]> {
  try {
    const ops = await page.getOperatorList();
    const runs: (string | number)[][] = [];
    for (const args of ops.argsArray) {
      if (!Array.isArray(args) || !Array.isArray(args[0])) continue;
      const run: (string | number)[] = [];
      for (const glyph of args[0] as readonly unknown[]) {
        if (typeof glyph === "number") run.push(glyph);
        else if (typeof glyph === "object" && glyph !== null && "unicode" in glyph && typeof glyph.unicode === "string") run.push(glyph.unicode);
      }
      if (run.some((g) => typeof g === "string")) runs.push(run);
    }
    return runs;
  } catch {
    return [];
  }
}

/** PDF bytes → document text, or an error code. Exported for the extraction test. */
export async function extractPdfText(
  bytes: Uint8Array,
): Promise<{ readonly ok: true; readonly text: string; readonly pages: number } | { readonly ok: false; readonly error: "too_many_pages" | "unreadable" }> {
  const { getDocumentProxy } = await import("unpdf");
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    // unpdf consumes the bytes it is given; the caller's copy is not needed afterwards.
    pdf = await getDocumentProxy(bytes);
  } catch {
    return { ok: false, error: "unreadable" }; // not a PDF, damaged, or password-protected
  }
  try {
    if (pdf.numPages > LIMITS.cvMaxPages) return { ok: false, error: "too_many_pages" };
    const pages: PdfTextItem[][] = [];
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent({ disableNormalization: true });
      const items: PdfTextItem[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue; // marked-content markers
        const transform: readonly unknown[] = item.transform;
        const x = transform[4];
        const y = transform[5];
        if (typeof x !== "number" || typeof y !== "number") continue;
        items.push({ str: item.str, x, y, width: item.width, height: item.height, dir: item.dir });
      }
      // Word-made PDFs: ligature glyphs come out with their letters swapped (pdf-lines.ts, ligatureFixes). Only pages
      // with Arabic items pay for the operator list.
      if (items.some((i) => i.dir === "rtl")) {
        const fixes = ligatureFixes(await glyphRuns(page));
        if (fixes.size > 0) pages.push(items.map((i) => (i.dir === "rtl" ? { ...i, str: applyLigatureFixes(i.str, fixes) } : i)));
        else pages.push(items);
      } else pages.push(items);
      page.cleanup();
    }
    return { ok: true, text: foldArabicLookalikes(pdfItemsToText(pages).normalize("NFKC")), pages: pdf.numPages };
  } catch {
    return { ok: false, error: "unreadable" };
  } finally {
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}

/** .docx bytes → text (one paragraph per line, a blank line between paragraphs), or null when mammoth cannot read it. */
export async function extractDocxText(buffer: Buffer): Promise<string | null> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return null; // not a zip, an old .doc renamed, or damaged
  }
}

export async function extractCvText(file: File): Promise<CvExtractResponse> {
  const name = file.name.trim().toLowerCase();
  const kind = name.endsWith(".pdf") ? "pdf" : name.endsWith(".docx") ? "docx" : null;
  if (kind === null) return { ok: false, error: "wrong_type" };
  if (file.size > LIMITS.cvMaxBytes) return { ok: false, error: "too_large" };
  try {
    if (kind === "pdf") {
      const result = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
      if (!result.ok) return result;
      if (nonSpaceLength(result.text) < LIMITS.cvMinChars) return { ok: false, error: "no_text" };
      return { ok: true, text: result.text, kind, pages: result.pages, fileName: file.name };
    }
    const text = await extractDocxText(Buffer.from(await file.arrayBuffer()));
    if (text === null) return { ok: false, error: "unreadable" };
    if (nonSpaceLength(text) < LIMITS.cvMinChars) return { ok: false, error: "no_text" };
    return { ok: true, text, kind, pages: null, fileName: file.name };
  } catch {
    return { ok: false, error: "unreadable" };
  }
}
