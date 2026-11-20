import { describe, expect, it } from "vitest";

import { cleanName, containsAny, findKeyword, findKeywords, normalizeName, normalizeText, tokenize, validateName } from "./normalize";

describe("normalizeText (spec 4.3)", () => {
  it("folds the Arabic letter variants", () => {
    expect(normalizeText("أحمد")).toBe("احمد");
    expect(normalizeText("إدارة")).toBe("اداره");
    expect(normalizeText("آمال")).toBe("امال");
    expect(normalizeText("مستشفى")).toBe("مستشفي");
    expect(normalizeText("سارة")).toBe(normalizeText("ساره"));
  });

  it("removes diacritics, the tatweel and direction marks", () => {
    expect(normalizeText("مُحَمَّد")).toBe("محمد");
    expect(normalizeText("قدّم")).toBe("قدم");
    expect(normalizeText("مـــرحبا")).toBe("مرحبا");
    expect(normalizeText("‏الرياض‫")).toBe("الرياض");
  });

  it("turns Arabic-Indic digits into Latin digits", () => {
    expect(normalizeText("٢٠٢٤")).toBe("2024");
    expect(normalizeText("۳ سنوات")).toBe("3 سنوات");
  });

  it("lower-cases Latin letters", () => {
    expect(normalizeText("Power BI")).toBe("power bi");
    expect(normalizeText("SQL")).toBe("sql");
  });

  it("folds presentation forms through NFKC", () => {
    // ﻻ (lam-alef ligature), ﺍﻟﺮﻳﺎﺽ (isolated / final / medial forms of «الرياض»)
    expect(normalizeText("ﻻ")).toBe("لا");
    expect(normalizeText("ﺍﻟﺮﻳﺎﺽ")).toBe("الرياض");
  });

  it("is idempotent", () => {
    const once = normalizeText("بالرِّياضِ، أُحِبُّ Excel ٣");
    expect(normalizeText(once)).toBe(once);
  });
});

describe("names (spec 3.1)", () => {
  it("cleans and keys names", () => {
    expect(cleanName("  خالد   العتيبي ")).toBe("خالد العتيبي");
    expect(normalizeName("سارة")).toBe(normalizeName("ساره"));
    expect(normalizeName("أحمد")).toBe(normalizeName("احمد"));
    expect(normalizeName("Sara")).toBe(normalizeName("sara"));
    expect(normalizeName(" Sara  Ali ")).toBe("sara ali");
  });

  it("validates", () => {
    expect(validateName("خالد")).toEqual({ ok: true, name: "خالد", key: "خالد" });
    expect(validateName("  Sara  Ali ")).toEqual({ ok: true, name: "Sara Ali", key: "sara ali" });
    expect(validateName("خ")).toEqual({ ok: false, error: "short" });
    expect(validateName("   ")).toEqual({ ok: false, error: "short" });
    expect(validateName("خالد1")).toEqual({ ok: false, error: "letters" });
    expect(validateName("sara@x")).toEqual({ ok: false, error: "letters" });
    expect(validateName("abcdefghijklmnopqrstu")).toEqual({ ok: false, error: "long" });
    // 20 letters with spaces is still fine; spaces do not count
    expect(validateName("abcde fghij klmno pqrst").ok).toBe(true);
    // diacritics are accepted and not counted
    expect(validateName("مُحَمَّد").ok).toBe(true);
  });
});

describe("tokenize", () => {
  it("splits on anything that is not a letter or a digit", () => {
    expect(tokenize("انا من الرياض، وتخصصي mis!")).toEqual(["انا", "من", "الرياض", "وتخصصي", "mis"]);
    expect(tokenize("بكالوريوس 2024")).toEqual(["بكالوريوس", "2024"]);
  });

  it("keeps C++ and C# whole", () => {
    expect(tokenize("c++ و c# و java")).toEqual(["c++", "و", "c#", "و", "java"]);
    expect(tokenize("excel+sql")).toEqual(["excel", "sql"]);
  });
});

describe("keywords (spec 4.3)", () => {
  it("matches with or without «ال» and one one-letter prefix", () => {
    expect(findKeyword(normalizeText("انا ساكن بالرياض"), "الرياض")).toEqual({ keyword: "الرياض", start: 2, end: 3 });
    expect(findKeyword("بالرياض", "رياض")).not.toBeNull();
    expect(findKeyword("الرياض", "رياض")).not.toBeNull();
    expect(findKeyword("رياض", "الرياض")).not.toBeNull();
    expect(findKeyword("والرياض", "الرياض")).not.toBeNull();
    expect(findKeyword("للرياض", "الرياض")).not.toBeNull();
    expect(findKeyword(normalizeText("افتح لطلباتي"), "طلباتي")).toEqual({ keyword: "طلباتي", start: 1, end: 2 });
  });

  it("matches whole words only", () => {
    expect(findKeyword("الرياضيات", "الرياض")).toBeNull();
    expect(findKeyword("riyadh2", "riyadh")).toBeNull();
    expect(findKeyword("bit", "it")).toBeNull();
    expect(findKeyword("I work in IT", "it")).not.toBeNull();
  });

  it("matches multi-word keywords and normalises both sides", () => {
    expect(findKeyword("درست نظم المعلومات", "نظم معلومات")).toEqual({ keyword: "نظم معلومات", start: 1, end: 3 });
    expect(findKeyword("أقل من سنة", "اقل من سنه")).not.toBeNull();
    expect(findKeyword("انا من المدينه المنوره", "المدينة المنورة")).toEqual({ keyword: "المدينة المنورة", start: 2, end: 4 });
  });

  it("returns the earliest hit", () => {
    expect(findKeyword("جدة ثم جدة", "جدة")?.start).toBe(0);
  });

  it("sorts every hit by start, the longer keyword first at the same start", () => {
    const hits = findKeywords(normalizeText("طالب ماجستير في إدارة أعمال"), ["ماجستير", "طالب", "إدارة", "إدارة أعمال"]);
    expect(hits.map((h) => [h.keyword, h.start])).toEqual([
      ["طالب", 0],
      ["ماجستير", 1],
      ["إدارة أعمال", 3],
      ["إدارة", 3],
    ]);
  });

  it("reports every occurrence", () => {
    expect(findKeywords("excel ثم excel", ["Excel"]).map((h) => h.start)).toEqual([0, 2]);
  });

  it("containsAny", () => {
    expect(containsAny(normalizeText("السلام عليكم، أنا من الرياض"), ["جدة", "الرياض"])).toBe(true);
    expect(containsAny("مرحبا", ["جدة", "الرياض"])).toBe(false);
  });
});
