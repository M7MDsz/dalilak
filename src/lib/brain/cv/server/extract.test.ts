// Owner: brain-cv. Spec 6.1 acceptance: the Arabic text PDF and the English .docx in public/samples/ are read on this
// machine (unpdf, mammoth; no network) and each returns skills. Plus the file errors of 6.1 / 3.6.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { sampleCvText } from "@/lib/data";
import type { CvAnalysis } from "@/lib/types";

import { analyseCvLocal } from "../local-analyser";
import { isSampleCv } from "../sample";

import { extractCvText } from "./extract";

const samples = path.resolve(process.cwd(), "public", "samples");
const sampleFile = (name: string, type: string) => new File([fs.readFileSync(path.join(samples, name))], name, { type });
const collapse = (text: string) => text.replace(/\s+/gu, " ").trim();
const bySkill = (analysis: CvAnalysis) =>
  Object.fromEntries(analysis.skills.map((s) => [s.skill, { stars: s.stars, evidence: s.evidence }]));

/** A valid PDF with `pages` empty pages (no text at all), with a correct cross-reference table. */
function emptyPdf(pages: number): Uint8Array<ArrayBuffer> {
  const kids = Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`,
    ...Array.from({ length: pages }, () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>"),
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

describe("public/samples/cv-ar.pdf (the sample CV of 6.2 printed to a text PDF)", async () => {
  const result = await extractCvText(sampleFile("cv-ar.pdf", "application/pdf"));

  it("is read as a one-page PDF", () => {
    expect(result).toMatchObject({ ok: true, kind: "pdf", pages: 1, fileName: "cv-ar.pdf" });
  });

  it("comes out as the sample's Arabic text in reading order (not reversed), letter for letter", () => {
    if (!result.ok) throw new Error(result.error);
    // the PDF still marks its two invented organisations «(جهة تجريبية)»; the sample text no longer does (21 Nov 2026)
    expect(collapse(result.text.replaceAll(" (جهة تجريبية)", ""))).toBe(collapse(sampleCvText("خالد")));
    expect(result.text.split("\n")[0]).toBe("خالد");
    expect(result.text).toContain("تخرّجت حديثاً في نظم المعلومات الإدارية");
    expect(result.text).toContain("- تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.");
    expect(result.text).toContain("جامعة التلال السبع (جهة تجريبية)، 2026.");
    expect(result.text).toContain("أساسيات البرمجة بلغة Python.");
    expect(result.text).toContain("الإنجليزية: جيد جداً.");
    expect(/[\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(result.text)).toBe(false); // no presentation forms left
  });

  it("is recognised as the sample and gives exactly the analysis of the sample text", () => {
    if (!result.ok) throw new Error(result.error);
    expect(isSampleCv(result.text)).toBe(true);
    const fromPdf = analyseCvLocal(result.text);
    const fromText = analyseCvLocal(sampleCvText("خالد"));
    expect(fromPdf.skills.map((s) => [s.skill, s.stars, s.evidence])).toEqual(fromText.skills.map((s) => [s.skill, s.stars, s.evidence]));
    expect(fromPdf.isSample).toBe(true);
    expect(fromPdf.skills).toHaveLength(8);
  });
});

describe("public/samples/cv-en.docx (an English CV)", async () => {
  const result = await extractCvText(
    sampleFile("cv-en.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
  );

  it("is read as a .docx", () => {
    expect(result).toMatchObject({ ok: true, kind: "docx", pages: null, fileName: "cv-en.docx" });
    if (!result.ok) throw new Error(result.error);
    expect(result.text.split("\n")[0]).toBe("Sara Al-Harbi");
  });

  it("returns its skills with stars and evidence by the rules of 6.5", () => {
    if (!result.ok) throw new Error(result.error);
    const analysis = analyseCvLocal(result.text);
    expect(analysis.isSample).toBe(false);
    expect(analysis.engine).toBe("local");
    expect(bySkill(analysis)).toEqual({
      statistics: { stars: 1, evidence: "Courses: Principles of Statistics, Introduction to Accounting." },
      accounting: { stars: 1, evidence: "Courses: Principles of Statistics, Introduction to Accounting." },
      powerbi: { stars: 2, evidence: "Built a weekly sales dashboard in Power BI for the regional manager." },
      dataviz: { stars: 1, evidence: "Built a weekly sales dashboard in Power BI for the regional manager." },
      "social-media": { stars: 2, evidence: "Wrote short social media posts for the store's launch week." },
      sql: { stars: 2, evidence: "Designed the database and wrote SQL queries for monthly reports." },
      excel: { stars: 3, evidence: "Excel (advanced), teamwork, communication." },
      communication: { stars: 1, evidence: "Excel (advanced), teamwork, communication." },
      teamwork: { stars: 1, evidence: "Excel (advanced), teamwork, communication." },
      english: { stars: 2, evidence: "English: fluent (IELTS 7.0)." },
    });
  });
});

describe("file errors (spec 6.1, 3.6)", () => {
  it("refuses other types, including the old .doc", async () => {
    expect(await extractCvText(new File(["hello"], "cv.doc"))).toEqual({ ok: false, error: "wrong_type" });
    expect(await extractCvText(new File(["hello"], "cv.txt"))).toEqual({ ok: false, error: "wrong_type" });
  });

  it("refuses a file over 5 MB before reading it", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.pdf");
    expect(await extractCvText(big)).toEqual({ ok: false, error: "too_large" });
  });

  it("answers unreadable for a file that is not really a PDF or a .docx", async () => {
    expect(await extractCvText(new File(["not a pdf at all"], "fake.pdf"))).toEqual({ ok: false, error: "unreadable" });
    expect(await extractCvText(new File(["not a zip at all"], "fake.docx"))).toEqual({ ok: false, error: "unreadable" });
  });

  it("answers no_text for a PDF without a text layer (a scan)", async () => {
    expect(await extractCvText(new File([emptyPdf(1)], "scan.pdf"))).toEqual({ ok: false, error: "no_text" });
  });

  it("answers too_many_pages above 15 pages", async () => {
    expect(await extractCvText(new File([emptyPdf(16)], "long.pdf"))).toEqual({ ok: false, error: "too_many_pages" });
    expect(await extractCvText(new File([emptyPdf(15)], "fifteen.pdf"))).toEqual({ ok: false, error: "no_text" });
  });
});
