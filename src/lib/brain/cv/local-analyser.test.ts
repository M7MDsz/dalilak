// Owner: brain-cv. Spec 9.8 check 4 (the sample CV gives exactly the eight skills of 6.2) and the rules of 6.5 / 6.1
// that ARCHITECTURE §14 lists for this module.
import { describe, expect, it } from "vitest";

import { SAMPLE_CV_BODY, sampleCvText } from "@/lib/data";
import type { CvAnalysis } from "@/lib/types";

import { cleanCvLines, cleanCvText, headingZone } from "./clean";
import { EVIDENCE_MAX_CHARS, analyseCvLocal, evidenceText } from "./local-analyser";
import { isSampleCv } from "./sample";

/** Spec 6.2's table: skill → stars and the evidence line shown, exactly. */
const SAMPLE_EXPECTED = {
  excel: { stars: 2, evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية." },
  sql: { stars: 2, evidence: "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات." },
  statistics: { stars: 1, evidence: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python." },
  programming: { stars: 1, evidence: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python." },
  english: { stars: 2, evidence: "الإنجليزية: جيد جداً." },
  communication: { stars: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم." },
  presentation: { stars: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم." },
  teamwork: { stars: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم." },
} as const;

const bySkill = (analysis: CvAnalysis) =>
  Object.fromEntries(analysis.skills.map((s) => [s.skill, { stars: s.stars, evidence: s.evidence }]));

const skillOf = (analysis: CvAnalysis, id: string) => analysis.skills.find((s) => s.skill === id);

describe("the sample CV (spec 6.2, 9.8 check 4)", () => {
  const analysis = analyseCvLocal(sampleCvText("خالد"));

  it("returns exactly the eight skills, stars and evidence lines of 6.2, and nothing else", () => {
    expect(bySkill(analysis)).toEqual(SAMPLE_EXPECTED);
    expect(analysis.skills).toHaveLength(8);
    expect(analysis.skills.reduce((n, s) => n + s.stars, 0)).toBe(11);
  });

  it("points every evidence at its line in the document, in document order", () => {
    for (const skill of analysis.skills) expect(analysis.lines[skill.line]).toBe(skill.evidence);
    const lines = analysis.skills.map((s) => s.line);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });

  it("is the sample, read locally", () => {
    expect(analysis.isSample).toBe(true);
    expect(analysis.engine).toBe("local");
  });

  it("does not depend on the name on the first line", () => {
    expect(bySkill(analyseCvLocal(sampleCvText("Sara")))).toEqual(SAMPLE_EXPECTED);
  });

  it("finds the six headings, takes no content line for a heading and rejoins nothing (6.5, last paragraph)", () => {
    const lines = cleanCvLines(sampleCvText("خالد"));
    expect(lines.filter((l) => l.heading).map((l) => [l.text, l.zone])).toEqual([
      ["نبذة", "listed"],
      ["التعليم", "listed"],
      ["الخبرة العملية", "applied"],
      ["المشاريع", "applied"],
      ["المهارات", "listed"],
      ["اللغات", "listed"],
    ]);
    const sourceLines = sampleCvText("خالد").split("\n").filter((l) => l.trim() !== "");
    expect(lines).toHaveLength(sourceLines.length);
    expect(lines.map((l) => (l.listMark ? `- ${l.text}` : l.text))).toEqual(sourceLines);
  });

  it("keeps analysis.lines equal to cleanCvLines(text).map(l => l.text)", () => {
    const text = sampleCvText("خالد");
    expect(analysis.lines).toEqual(cleanCvLines(text).map((l) => l.text));
  });

  it("gives the same result every time", () => {
    expect(analyseCvLocal(sampleCvText("خالد"))).toEqual(analysis);
  });
});

describe("isSampleCv (spec 6.1)", () => {
  const sample = sampleCvText("خالد");

  it("ignores the first line and whitespace", () => {
    expect(isSampleCv(sample)).toBe(true);
    expect(isSampleCv(sampleCvText("Sara Al-Harbi"))).toBe(true);
    expect(isSampleCv(`\n\n  خالد  \r\n${SAMPLE_CV_BODY.replace(/\n/g, "\n\n   ").replace(/ /g, "  ")}\n\n`)).toBe(true);
    expect(isSampleCv(sample.replace(/\n/g, " ").replace("خالد ", "خالد\n"))).toBe(true);
  });

  it("still knows the sample in presentation-form letters (a PDF of it)", () => {
    const presentation = String.fromCodePoint(0xfe8d, 0xfedf, 0xfeae, 0xfef3, 0xfe8e, 0xfebd); // «الرياض» as glyph forms
    expect(cleanCvText(presentation)).toBe("الرياض");
    expect(isSampleCv(sample.replace("الرياض", presentation))).toBe(true);
  });

  it("treats an edited sample, or the body without a name line, as an ordinary CV", () => {
    expect(isSampleCv(sample.replace("أربعة أشهر", "ستة أشهر"))).toBe(false);
    expect(isSampleCv(`${sample}\nPower BI`)).toBe(false);
    expect(isSampleCv(SAMPLE_CV_BODY)).toBe(false);
    expect(isSampleCv("")).toBe(false);
    expect(isSampleCv("خالد")).toBe(false);
  });
});

describe("clean-up (spec 6.5 steps 1-4)", () => {
  it("detects headings by the step-4 rule", () => {
    expect(headingZone("Work Experience", false)).toBe("applied");
    expect(headingZone("Professional Experience", false)).toBe("applied");
    expect(headingZone("Employment History", false)).toBe("applied");
    expect(headingZone("خبرات العمل", false)).toBe("applied");
    expect(headingZone("مهارات", false)).toBe("listed");
    expect(headingZone("SKILLS", false)).toBe("listed");
    expect(headingZone("المهارات واللغات", false)).toBe("listed");
    expect(headingZone("Education & Projects", false)).toBe("listed"); // its first word decides
    expect(headingZone("Projects and Skills", false)).toBe("applied");
    expect(headingZone("Skills.", false)).toBeNull(); // a «.»
    expect(headingZone("المهارات، اللغات", false)).toBeNull(); // a «،»
    expect(headingZone("Experience", true)).toBeNull(); // a list mark
    expect(headingZone("Experience in building dashboards for teams", false)).toBeNull(); // over 40 characters
    expect(headingZone("الرياض", false)).toBeNull();
  });

  it("removes list marks and remembers them", () => {
    const lines = cleanCvLines("Experience\n- One\n• Two\n* Three\n1. Four\n2026. Year\n– Five");
    expect(lines.map((l) => [l.text, l.listMark])).toEqual([
      ["Experience", false],
      ["One", true],
      ["Two", true],
      ["Three", true],
      ["Four", true],
      ["2026. Year", false],
      ["Five", true],
    ]);
  });

  it("rejoins a wrapped line, and only under the step-3 conditions", () => {
    const text = [
      "Work Experience",
      "Built and maintained the weekly sales dashboards for the regional",
      "managers using Power BI and Excel.",
      "Prepared the monthly summary of branch numbers for the manager.",
      "Short line",
      "next line",
      "A line that is long enough to take the next one but has a blank",
      "",
      "after it.",
      "A long line that is followed by a list item and must stay alone",
      "- the list item",
      "A long line just before a heading line, which must not be joined",
      "Skills",
    ].join("\n");
    expect(cleanCvLines(text).map((l) => l.text)).toEqual([
      "Work Experience",
      "Built and maintained the weekly sales dashboards for the regional managers using Power BI and Excel.",
      "Prepared the monthly summary of branch numbers for the manager.",
      "Short line",
      "next line",
      "A line that is long enough to take the next one but has a blank",
      "after it.",
      "A long line that is followed by a list item and must stay alone",
      "the list item",
      "A long line just before a heading line, which must not be joined",
      "Skills",
    ]);
  });

  it("splits a line longer than 200 characters at «.» and «؛»", () => {
    const a = "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية لكل فرع من الفروع الخمسة.";
    const b = "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات وتجهيز ملخص أسبوعي للمدير؛";
    const c = "ومراجعة الأرقام مع الفريق قبل إرسالها.";
    const lines = cleanCvLines(`الخبرة\n${a} ${b} ${c}`);
    expect(`${a} ${b} ${c}`.length).toBeGreaterThan(200);
    expect(lines.map((l) => l.text)).toEqual(["الخبرة", a, b, c]);
    expect(lines.slice(1).every((l) => l.zone === "applied")).toBe(true);
  });

  it("applies NFKC, removes direction marks and the tatweel, converts Arabic-Indic digits", () => {
    const excelGlyphs = String.fromCodePoint(0xfe87, 0xfedb, 0xfeb4, 0xfede); // «إكسل» as presentation forms
    const raw = `المهارات\n\u200F${excelGlyphs}\u200E و Pivot\nخب\u0640\u0640\u0640رة ٣ سنوات`;
    const lines = cleanCvLines(raw).map((l) => l.text);
    expect(lines).toEqual(["المهارات", "إكسل و Pivot", "خبرة 3 سنوات"]);
    const analysis = analyseCvLocal(raw);
    expect(analysis.skills.map((s) => [s.skill, s.stars, s.evidence])).toEqual([["excel", 1, "إكسل و Pivot"]]);
  });
});

describe("stars and evidence (spec 6.5 steps 5-7)", () => {
  it("cuts the evidence at 160 characters on a word boundary with «…»", () => {
    const words = "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية لكل فرع".split(" ");
    let line = "";
    while (line.length < 190) line = line === "" ? (words[0] ?? "") : `${line} ${words[line.split(" ").length % words.length]}`;
    const cut = evidenceText(line);
    expect(cut.length).toBeLessThanOrEqual(EVIDENCE_MAX_CHARS);
    expect(cut.endsWith("…")).toBe(true);
    const head = cut.slice(0, -1);
    expect(line.startsWith(head)).toBe(true);
    expect(line.charAt(head.length)).toBe(" ");
    expect(evidenceText("  short line  ")).toBe("short line");

    const analysis = analyseCvLocal(`Experience\n${line}`);
    const excel = skillOf(analysis, "excel");
    expect(excel?.evidence).toBe(cut);
    expect(excel?.stars).toBe(2);
  });

  it("gives 3 for an advanced word after the alias with no other skill's alias between, lowered to the maximum", () => {
    const analysis = analyseCvLocal("Skills\nExcel (advanced), teamwork.\nAdvanced SQL users, Python.\nالإنجليزية بطلاقة.\nPower BI, Figma متقدم.");
    expect(skillOf(analysis, "excel")).toMatchObject({ stars: 3, evidence: "Excel (advanced), teamwork." });
    expect(skillOf(analysis, "sql")?.stars).toBe(1); // the level word comes before the alias
    expect(skillOf(analysis, "english")).toMatchObject({ stars: 2, evidence: "الإنجليزية بطلاقة." }); // 3, lowered to 2
    expect(skillOf(analysis, "figma")?.stars).toBe(3);
    expect(skillOf(analysis, "powerbi")?.stars).toBe(1); // Figma's alias stands between
  });

  it("gives 2 in an applied zone or for a middle word; the evidence is the line that justifies the level", () => {
    const text = ["Skills", "SQL, Excel", "SQL (intermediate)", "Projects", "Built a small Excel tracker for the team."].join("\n");
    const analysis = analyseCvLocal(text);
    expect(skillOf(analysis, "sql")).toMatchObject({ stars: 2, evidence: "SQL (intermediate)", line: 2 });
    expect(skillOf(analysis, "excel")).toMatchObject({ stars: 2, evidence: "Built a small Excel tracker for the team.", line: 4 });
  });

  it("lets the longer alias win where two overlap, and uses its words once", () => {
    const analysis = analyseCvLocal("الخبرات\nإدارة حسابات التواصل الاجتماعي لمتجر صغير.");
    expect(analysis.skills.map((s) => s.skill)).toEqual(["social-media"]);
  });

  it("reads «C++» and «C#» as names, and a bare «C» as nothing", () => {
    expect(analyseCvLocal("Skills\nC++ and C# basics").skills.map((s) => s.skill)).toEqual(["programming"]);
    expect(analyseCvLocal("Skills\nVitamin C and grade C").skills).toEqual([]);
  });

  it("returns no skill (and the lines) for a text without any alias", () => {
    const analysis = analyseCvLocal("نبذة\nأحب العمل مع الناس وأتعلم بسرعة.");
    expect(analysis.skills).toEqual([]);
    expect(analysis.lines).toEqual(["نبذة", "أحب العمل مع الناس وأتعلم بسرعة."]);
    expect(analysis.isSample).toBe(false);
  });
});
