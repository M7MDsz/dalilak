// Owner: brain-cv. The PDF reading-order rebuild (pdf-lines.ts) on synthetic items laid out the way Chrome's PDF printer
// lays out an Arabic line (verified on public/samples/cv-ar.pdf): glyphs in visual order, Arabic letters one item each,
// a Latin run drawn left to right as a unit, mirrored brackets, diacritics as separate zero-width items.
import { describe, expect, it } from "vitest";

import { pdfItemsToText, type PdfTextItem } from "./pdf-lines";

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
