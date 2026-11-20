// Owner: brain-cv. The PDF reading-order rebuild (pdf-lines.ts) on synthetic items laid out the way Chrome's PDF printer
// lays out an Arabic line (verified on public/samples/cv-ar.pdf): glyphs in visual order, Arabic letters one item each,
// a Latin run drawn left to right as a unit, mirrored brackets, diacritics as separate zero-width items.
import { describe, expect, it } from "vitest";

import { applyLigatureFixes, ligatureFixes, pdfItemsToText, type PdfTextItem } from "./pdf-lines";

type Seg =
  | { readonly rtl: string } // Arabic letters, one item per letter
  | { readonly ltr: string } // a Latin / digit run (words split into items, kept left to right)
  | { readonly n: string } // neutral characters in Arabic context (drawn mirrored, like Chrome)
  | { readonly sp: true };

const MIRRORED: Readonly<Record<string, string>> = { "(": ")", ")": "(" };
const W = 6;
const SPACE = 3;

/** Lays out one logical Arabic line right to left from x = 520, as a PDF would draw it. */
function rtlLine(segs: readonly Seg[], y: number, size = 10): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  let right = 520;
  for (const seg of segs) {
    if ("rtl" in seg) {
      for (const ch of seg.rtl) {
        items.push({ str: ch, x: right - W, y, width: W, height: size, dir: "rtl" });
        right -= W;
      }
    } else if ("ltr" in seg) {
      const width = seg.ltr.split(" ").reduce((n, word) => n + word.length * W, 0) + (seg.ltr.split(" ").length - 1) * SPACE;
      let x = right - width;
      seg.ltr.split(" ").forEach((word, i) => {
        if (i > 0) {
          items.push({ str: " ", x, y, width: SPACE, height: 0, dir: "ltr" });
          x += SPACE;
        }
        items.push({ str: word, x, y, width: word.length * W, height: size, dir: "ltr" });
        x += word.length * W;
      });
      right -= width;
    } else if ("n" in seg) {
      for (const ch of seg.n) {
        items.push({ str: MIRRORED[ch] ?? ch, x: right - SPACE, y, width: SPACE, height: size, dir: "ltr" });
        right -= SPACE;
      }
    } else {
      items.push({ str: " ", x: right - SPACE, y, width: SPACE, height: 0, dir: "ltr" });
      right -= SPACE;
    }
  }
  // A PDF stores them in visual order (left to right); the rebuild must not depend on the order anyway.
  return items.sort((a, b) => a.x - b.x);
}

/** Words of a logical Arabic sentence → segments (spaces between words; trailing punctuation as neutrals). */
function words(sentence: string): Seg[] {
  const segs: Seg[] = [];
  sentence.split(" ").forEach((word, i) => {
    if (i > 0) segs.push({ sp: true });
    const m = /^([(]?)(.*?)([)،.:]*)$/u.exec(word);
    const [, open = "", core = "", close = ""] = m ?? [];
    if (open) segs.push({ n: open });
    if (/[A-Za-z0-9]/.test(core)) segs.push({ ltr: core });
    else if (core) segs.push({ rtl: core });
    if (close) segs.push({ n: close });
  });
  return segs;
}

const text = (pages: readonly (readonly PdfTextItem[])[]) => pdfItemsToText(pages).normalize("NFKC");

describe("pdfItemsToText: Arabic lines in logical order", () => {
  it("reads a reversed Arabic word back", () => {
    expect(text([rtlLine([{ rtl: "خالد" }], 700)])).toBe("خالد");
  });

  it("keeps Latin words and punctuation where they belong in an Arabic sentence", () => {
    const sentence = "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.";
    expect(text([rtlLine(words(sentence), 700)])).toBe(sentence);
  });

  it("swaps mirrored brackets back and keeps digits left to right", () => {
    const sentence = "بكالوريوس نظم المعلومات، جامعة التلال السبع (جهة تجريبية)، 2026.";
    expect(text([rtlLine(words(sentence), 700)])).toBe(sentence);
  });

  it("keeps a multi-word Latin run in order", () => {
    const segs: Seg[] = [{ rtl: "لوحات" }, { sp: true }, { rtl: "في" }, { sp: true }, { ltr: "Power BI" }, { sp: true }, { rtl: "للمدير" }, { n: "." }];
    expect(text([rtlLine(segs, 700)])).toBe("لوحات في Power BI للمدير.");
  });

  it("puts a detached shadda or tanween on the letter under it", () => {
    const line = rtlLine([{ rtl: "تخرجت" }, { sp: true }, { rtl: "حديثا" }], 700);
    const ra = line.find((i) => i.str === "ر");
    const alef = line.find((i) => i.str === "ا");
    if (ra === undefined || alef === undefined) throw new Error("layout");
    line.push({ str: "ّ", x: ra.x, y: 700, width: 0, height: 0, dir: "ltr" });
    line.push({ str: " ً", x: alef.x - 0.1, y: 705, width: 0, height: 10, dir: "ltr" }); // raised, with a stray space
    expect(text([line])).toBe("تخرّجت حديثاً");
  });

  it("folds presentation forms and ligatures, and finds the right letter inside a ligature for a mark", () => {
    // «سلام» drawn as initial seen, lam-alef final ligature, isolated meem.
    const salam: PdfTextItem[] = [
      { str: "م", x: 100, y: 700, width: 6, height: 10, dir: "rtl" },
      { str: "\uFEFC", x: 106, y: 700, width: 6, height: 10, dir: "rtl" },
      { str: "\uFEB3", x: 112, y: 700, width: 6, height: 10, dir: "rtl" },
    ];
    expect(text([salam])).toBe("سلام");

    // «صغيّر»: initial sad, medial ghain, then a «ير» ligature with the shadda on its right half (the yeh).
    let ligature: string | null = null;
    for (let cp = 0xfb50; cp <= 0xfdff && ligature === null; cp += 1) {
      const ch = String.fromCodePoint(cp);
      if (ch.normalize("NFKC") === "ير") ligature = ch;
    }
    expect(ligature).not.toBeNull();
    const saghir: PdfTextItem[] = [
      { str: ligature ?? "", x: 100, y: 700, width: 8, height: 10, dir: "rtl" },
      { str: "\uFED0", x: 108, y: 700, width: 6, height: 10, dir: "rtl" },
      { str: "\uFEBB", x: 114, y: 700, width: 6, height: 10, dir: "rtl" },
      { str: "ّ", x: 103.8, y: 700, width: 0, height: 0, dir: "ltr" },
    ];
    expect(text([saghir])).toBe("صغيّر");
  });

  it("drops the narrow space PDF.js invents inside a word, and keeps real spaces", () => {
    const heading = rtlLine([{ rtl: "المشاريع" }], 700, 13);
    const ya = heading.find((i) => i.str === "ي");
    if (ya === undefined) throw new Error("layout");
    heading.push({ str: " ", x: ya.x + W - 1, y: 700, width: 1.9, height: 0, dir: "ltr" });
    const body = rtlLine(words("بناء قاعدة البيانات وكتابة استعلامات SQL."), 680);
    expect(text([[...heading, ...body]])).toBe("المشاريع\nبناء قاعدة البيانات وكتابة استعلامات SQL.");
  });

  it("orders lines top to bottom and marks a paragraph gap with a blank line", () => {
    const page = [
      ...rtlLine([{ rtl: "نبذة" }], 700),
      ...rtlLine(words("أحب تحويل الأرقام إلى قرارات واضحة."), 688),
      ...rtlLine([{ rtl: "التعليم" }], 650),
    ];
    expect(text([page])).toBe("نبذة\nأحب تحويل الأرقام إلى قرارات واضحة.\n\nالتعليم");
  });

  it("joins pages with a blank line", () => {
    expect(text([rtlLine([{ rtl: "خالد" }], 700), rtlLine([{ rtl: "الرياض" }], 700)])).toBe("خالد\n\nالرياض");
  });
});

describe("pdfItemsToText: Latin documents", () => {
  it("leaves English lines alone and reads an Arabic word inside one right to left", () => {
    const line = (str: string, y: number): PdfTextItem => ({ str, x: 50, y, width: str.length * W, height: 10, dir: "ltr" });
    const riyadh: PdfTextItem[] = [
      { str: "City:", x: 50, y: 676, width: 30, height: 10, dir: "ltr" },
      { str: " ", x: 80, y: 676, width: 3, height: 0, dir: "ltr" },
      { str: "(", x: 83, y: 676, width: 3, height: 10, dir: "ltr" },
      // «الرياض» drawn left to right in visual order: ض ا ي ر ل ا
      ...[..."ضايرلا"].map((ch, i): PdfTextItem => ({ str: ch, x: 86 + i * W, y: 676, width: W, height: 10, dir: "rtl" })),
      { str: ")", x: 86 + 6 * W, y: 676, width: 3, height: 10, dir: "ltr" },
    ];
    const page = [line("Sara Al-Harbi", 700), line("Excel (advanced), teamwork, communication.", 688), ...riyadh];
    expect(text([page])).toBe("Sara Al-Harbi\nExcel (advanced), teamwork, communication.\nCity: (الرياض)");
  });

  it("adds a space for a real gap between two items that carry none", () => {
    const page: PdfTextItem[] = [
      { str: "Power", x: 50, y: 700, width: 30, height: 10, dir: "ltr" },
      { str: "BI", x: 84, y: 700, width: 12, height: 10, dir: "ltr" },
      { str: "dash", x: 96.2, y: 700, width: 24, height: 10, dir: "ltr" },
    ];
    expect(text([page])).toBe("Power BIdash");
  });
});

// ─── 21 Nov 2026, CV-reader test: real Chrome, Word and Canva-style PDFs ─────────────────────────────────────────

/** One LTR item per string, left edge at x. */
const ltr = (str: string, x: number, y: number): PdfTextItem => ({ str, x, y, width: str.length * W, height: 10, dir: "ltr" });

describe("pdfItemsToText: what the CV-reader test found", () => {
  it("reads the tatweel of «لـ» as Arabic, so the number after it stays in place", () => {
    const segs: Seg[] = [{ rtl: "إعداد" }, { sp: true }, { rtl: "لـ" }, { sp: true }, { ltr: "3" }, { sp: true }, { rtl: "أقسام" }];
    expect(text([rtlLine(segs, 700)])).toBe("إعداد لـ 3 أقسام");
  });

  it("puts a year range in an Arabic line back in logical order, and keeps «2020-2022» and «4.8» whole", () => {
    const range: Seg[] = [{ rtl: "شركة" }, { sp: true }, { n: "|" }, { sp: true }, { ltr: "2020" }, { sp: true }, { n: "-" }, { sp: true }, { ltr: "2022" }];
    expect(text([rtlLine(range, 700)])).toBe("شركة | 2020 - 2022");
    expect(text([rtlLine([{ rtl: "من" }, { sp: true }, { ltr: "2020-2022" }, { sp: true }, { rtl: "بمعدل" }, { sp: true }, { ltr: "4.8" }], 700)])).toBe(
      "من 2020-2022 بمعدل 4.8",
    );
  });

  it("keeps the spaces inside a Word item, even next to a tab-wide space item", () => {
    const page: PdfTextItem[] = [
      { str: "CV", x: 72, y: 708, width: 13, height: 12, dir: "ltr" },
      { str: " ", x: 85, y: 708, width: 376, height: 0, dir: "ltr" },
      { str: "مهندس مدني بخبرة", x: 480, y: 690, width: 73, height: 12, dir: "rtl" },
      { str: "7", x: 470, y: 690, width: 6, height: 12, dir: "ltr" },
      { str: "سنوات في الإشراف على التنفيذ", x: 340, y: 690, width: 126, height: 12, dir: "rtl" },
    ];
    expect(text([page])).toBe("CV\nمهندس مدني بخبرة 7 سنوات في الإشراف على التنفيذ");
  });

  it("does not mirror a bracket inside a Word item (already logical), but still un-mirrors Chrome's", () => {
    const word: PdfTextItem[] = [{ str: "شركة الصفوة (جهة تجريبية)", x: 300, y: 700, width: 110, height: 12, dir: "rtl" }];
    expect(text([word])).toBe("شركة الصفوة (جهة تجريبية)");
    expect(text([rtlLine(words("شركة الصفوة (جهة تجريبية)"), 700)])).toBe("شركة الصفوة (جهة تجريبية)");
  });

  it("starts a new paragraph where a line moves more than an em off the line above (a bullet drawn as a shape)", () => {
    const page = [
      ltr("Frontend Developer - Wadi Tech (sample company), Jeddah", 50, 700),
      ltr("Built the checkout flow in React and TypeScript, cutting", 68, 686),
      ltr("drop-off by 18%.", 68, 672),
    ];
    expect(text([page])).toBe(
      "Frontend Developer - Wadi Tech (sample company), Jeddah\n\nBuilt the checkout flow in React and TypeScript, cutting\ndrop-off by 18%.",
    );
  });

  it("reads a two-column page column by column, header first, even where the baselines line up", () => {
    const side = ["Contact", "Riyadh", "0550000000", "Skills", "Salesforce CRM", "Excel", "Negotiation", "Languages", "English"];
    const main = ["Summary", "Sales representative with six years", "Experience", "Senior Sales Representative", "Exceeded the quota by 22%", "Managed sixty accounts", "Education", "BBA in Marketing", "Central Plains University"];
    const page: PdfTextItem[] = [ltr("Omar Al-Harthy, Senior Sales Representative, Riyadh", 40, 760)];
    side.forEach((str, i) => page.push(ltr(str, 40, 730 - i * 13)));
    main.forEach((str, i) => page.push(ltr(str, 200, 730 - i * 17))); // its own line spacing: some baselines meet, most do not
    expect(text([page])).toBe(["Omar Al-Harthy, Senior Sales Representative, Riyadh", "", ...side, "", ...main].join("\n"));
  });

  it("reads an Arabic two-column page right column first", () => {
    const rtlAt = (str: string, right: number, y: number): PdfTextItem => ({ str, x: right - str.length * W, y, width: str.length * W, height: 10, dir: /[0-9]/.test(str) ? "ltr" : "rtl" });
    const side = ["التواصل", "الدمام", "0550000000", "المهارات", "التسويق الرقمي", "كتابة المحتوى", "تحسين محركات البحث", "اللغات", "الإنجليزية"];
    const main = ["الملخص", "أخصائية تسويق رقمي بخبرة أربع سنوات", "الخبرة العملية", "أخصائية تسويق رقمي في وكالة", "إدارة الحملات الإعلانية", "رفع الزيارات العضوية للموقع", "التعليم", "بكالوريوس التسويق", "جامعة الساحل الشرقي"];
    const page: PdfTextItem[] = [];
    side.forEach((str, i) => page.push(rtlAt(str, 540, 730 - i * 13)));
    main.forEach((str, i) => page.push(rtlAt(str, 380, 730 - i * 17)));
    expect(text([page])).toBe([...side, "", ...main].join("\n"));
  });

  it("does not split a label | value table (both cells on every line)", () => {
    const rows = [["Name:", "Omar"], ["City:", "Riyadh"], ["Phone:", "0550000000"], ["Email:", "omar@example.com"], ["Born:", "1999"], ["Status:", "Single"]];
    const page = rows.flatMap(([a = "", b = ""], i) => [ltr(a, 40, 700 - i * 14), ltr(b, 200, 700 - i * 14)]);
    expect(text([page])).toBe(rows.map(([a, b]) => `${a} ${b}`).join("\n"));
  });
});

describe("ligatureFixes: Word-made PDFs (ligature glyphs mapped to their letters)", () => {
  it("knows the swapped spelling PDF.js gives each word holding a ligature glyph, and fixes only that word", () => {
    // As drawn, left to right: «الآن» = ن | لآ | ا ; «ريال» = one glyph; «المال» = separate glyphs (no ligature).
    const fixes = ligatureFixes([["ن", "لآ", "ا", " ", "ريال", -40, " ", "ل", "ا", "م", "ل", "ا"]]);
    expect([...fixes]).toEqual([
      ["اآلن", "الآن"],
      ["لاير", "ريال"],
    ]);
    expect(applyLigatureFixes("حتى اآلن مليون لاير من المال", fixes)).toBe("حتى الآن مليون ريال من المال");
    expect(applyLigatureFixes("Excel 2021", fixes)).toBe("Excel 2021");
  });

  it("treats a large spacing adjustment as a word gap, and finds nothing in a Chrome PDF (presentation forms)", () => {
    expect([...ligatureFixes([["ن", "لآ", "ا", -300, "ة", "ر", "ا", "د", "لإ", "ا"]])]).toEqual([
      ["اآلن", "الآن"],
      ["اإلدارة", "الإدارة"],
    ]);
    expect(ligatureFixes([["ﻻ", "ﺎ"]]).size).toBe(0);
  });
});
