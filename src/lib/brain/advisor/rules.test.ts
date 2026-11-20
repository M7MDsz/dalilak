// Owner: brain-advisor. Spec 5.5 rules 7, 8, 9 and 17 on crafted model replies.
import { describe, expect, it } from "vitest";

import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { UserFacts } from "@/lib/types";

import { asksToOpen, capReplyLength, claimsUndoneDeed, numbersAreGrounded } from "./rules";

const clock = makeClock(new Date("2026-11-18T21:00:00"));

function facts(): UserFacts {
  const state = buildSeed("cv-analysed", clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("no seed user");
  return factsOf(user);
}

describe("rule 8: numbers and money come from data", () => {
  const explain = { jobId: "data-analyst-riyadh", total: 70, metPoints: 60, next_course: { id: "c-powerbi-1", match_after: 90 } };

  it("accepts numbers found in this turn's tool results, the snapshot digest and the product constants", () => {
    expect(numbersAreGrounded("مطابقتك 70%، ودورة Power BI توصلك إلى 90%.", [explain], facts())).toBe(true);
    expect(numbersAreGrounded("في المنصة 46 وظيفة و80 دورة و54 مهارة.", [], facts())).toBe(true);
    expect(numbersAreGrounded("تحتاج 60% على الأقل لتأخذ 40 XP.", [], facts())).toBe(true);
    expect(numbersAreGrounded("عندك 180 XP.", [{ totalXp: 180 }], facts())).toBe(true);
    expect(numbersAreGrounded("مطابقتك ٧٠٪.", [explain], facts())).toBe(true);
  });

  it("rejects an invented number and any money word", () => {
    expect(numbersAreGrounded("مطابقتك 73%.", [explain], facts())).toBe(false);
    expect(numbersAreGrounded("الراتب يبدأ من 8000.", [explain], facts())).toBe(false);
    expect(numbersAreGrounded("الراتب عشرة آلاف ريال تقريباً.", [explain], facts())).toBe(false);
    expect(numbersAreGrounded("قد يصل الدخل إلى مليون.", [explain], facts())).toBe(false);
  });

  it("accepts rounded forms of exact points (6.67 → 7)", () => {
    expect(numbersAreGrounded("كل نجمة هنا تساوي 7%.", [{ points: 6.666666666666667 }], facts())).toBe(true);
    expect(numbersAreGrounded("كل نجمة هنا تساوي 6.67%.", [{ points: 6.666666666666667 }], facts())).toBe(true);
  });
});

describe("rule 9: no done-claim without the deed", () => {
  it("flags a claim with no matching event", () => {
    expect(claimsUndoneDeed("تم. أرسلت طلبك.", [])).toBe(true);
    expect(claimsUndoneDeed("بدأت لك الدورة.", ["navigate"])).toBe(true);
    expect(claimsUndoneDeed("فتحت لك صفحة الوظائف.", [])).toBe(true);
    expect(claimsUndoneDeed("غيّرت هدفك.", ["navigate"])).toBe(true);
  });

  it("accepts a claim backed by its event, and words that only look similar", () => {
    expect(claimsUndoneDeed("فتحت لك صفحة الوظائف.", ["navigate"])).toBe(false);
    expect(claimsUndoneDeed("تمام، خطوتك التالية دورة Power BI.", [])).toBe(false);
    expect(claimsUndoneDeed("هل تريد أن أفتح لك الدورة؟", [])).toBe(false);
  });
});

describe("rule 17: length", () => {
  it("keeps a short reply and cuts a long one at the last full sentence before 600 characters", () => {
    expect(capReplyLength("جملة قصيرة.")).toBe("جملة قصيرة.");
    const sentence = "هذه جملة طويلة نسبياً عن مسارك ومطابقتك ودوراتك القادمة. ";
    const long = sentence.repeat(20);
    const cut = capReplyLength(long);
    expect(cut.length).toBeLessThanOrEqual(600);
    expect(cut.endsWith(".")).toBe(true);
    expect(long.startsWith(cut)).toBe(true);
  });

  it("cuts at a space with an ellipsis when there is no sentence end", () => {
    const cut = capReplyLength("كلمة ".repeat(200));
    expect(cut.length).toBeLessThanOrEqual(600);
    expect(cut.endsWith("…")).toBe(true);
  });
});

describe("rule 7: navigation is asked for", () => {
  it("finds the open words, in Arabic, dialect and English", () => {
    for (const line of ["افتح مساري", "ورّني الوظائف", "ودّني لطلباتي", "وين الدورات؟", "show me jobs", "go to my path", "اعرض لي"]) {
      expect(asksToOpen(line), line).toBe(true);
    }
    for (const line of ["لماذا مطابقتي 70%؟", "ماذا أفعل الآن؟", "شكراً"]) expect(asksToOpen(line), line).toBe(false);
  });
});
