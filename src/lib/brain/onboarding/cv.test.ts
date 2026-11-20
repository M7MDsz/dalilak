// The CV step of onboarding (docs/ONBOARDING-FLOW.md): what the sample CV states, the confirm, the turns, and the model
// layer's checks (a reply that adds a fact is refused).
import { describe, expect, it } from "vitest";

import { analyseCvLocal } from "@/lib/brain/cv";
import { recommend } from "@/lib/engine";
import { sampleCvText } from "@/lib/data";
import type { OnboardingContext } from "@/lib/brain/protocol";

import { cvConfirmQuestion, cvConfirmTurn, cvFacts, cvInterestQuestion, cvOfferTurn, cvReaction, cvSkipTurn, interestFromCv, pathLine } from "./cv";
import { checkUnderstood, phraseProblem, type OnboardingPhraseRequest, type OnboardingUnderstandRequest } from "./phrase";

const analysis = analyseCvLocal(sampleCvText("خالد"));
const facts = cvFacts(analysis.lines);
const ctx = (answers = {}): OnboardingContext => ({ name: "خالد", answers, misses: {}, pending: "city" });

describe("the sample CV in onboarding", () => {
  it("returns exactly its 8 skills, and states الرياض · بكالوريوس · نظم معلومات إدارية · أقل من سنة", () => {
    expect(analysis.skills.map((s) => s.skill)).toHaveLength(8);
    expect(facts.answers).toEqual({
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
      experience: "under1",
    });
    expect(facts.slots).toEqual(["city", "education", "major", "experience"]);
    expect(facts.experienceNote).toBe("تدريب تعاوني أربعة أشهر");
    expect(interestFromCv(analysis.skills)).toBe("data");
  });

  it("reacts with what it really holds and asks for a quick yes", () => {
    expect(cvReaction("خالد", analysis.skills)).toMatch(/8 مهارات/);
    expect(cvReaction("خالد", analysis.skills)).toMatch(/Excel و ?SQL/);
    expect(cvConfirmQuestion(facts.answers)).toBe("فهمت من سيرتك إنك خريج نظم معلومات إدارية (بكالوريوس) من الرياض، وعندك خبرة أقل من سنة. صح؟");
    expect(cvConfirmQuestion(facts.answers, facts.experienceNote)).toBe("فهمت من سيرتك إنك خريج نظم معلومات إدارية (بكالوريوس) من الرياض، ومعك تدريب تعاوني أربعة أشهر. صح؟");
  });

  it("yes confirms and asks the interest with the CV's hint; change takes the CV answers out; a typed correction replaces only what it names", () => {
    const yes = cvConfirmTurn(ctx(facts.answers), facts.slots, { kind: "chip", option: "yes" }, "data");
    expect(yes.cvStep).toEqual({ prefill: { slots: facts.slots, confirmed: true } });
    expect(yes.pending).toBe("interest");
    expect(yes.replies[1]).toBe("وش نوع الشغل اللي يشدّك أكثر؟");
    expect(cvInterestQuestion(analysis.skills, "data")).toBe("عندك Excel و SQL قوية، تبي تكمل في الأرقام والبيانات ولا تفكر بمجال ثاني؟");
    const change = cvConfirmTurn(ctx(facts.answers), facts.slots, { kind: "chip", option: "change" }, "data");
    expect(change.cvStep).toEqual({ prefill: null });
    expect(change.answers).toEqual({});
    expect(change.pending).toBe("city");
    const fix = cvConfirmTurn(ctx(facts.answers), facts.slots, { kind: "text", text: "لا، أنا من جدة" }, "data");
    expect(fix.answers.city?.value).toBe("jeddah");
    expect(fix.answers.major?.value).toBe("mis");
    expect(fix.cvStep?.prefill).toEqual({ slots: facts.slots, confirmed: true });
  });

  it("without a CV: «ما عندي» skips to today's question 1; a typed city skips and is recorded", () => {
    expect(cvSkipTurn(ctx(), "ما عندي سيرة الحين").cvStep).toEqual({ cv: "skipped" });
    const typed = cvOfferTurn(ctx(), "الرياض");
    expect(typed.cvStep).toEqual({ cv: "skipped" });
    expect(typed.answers.city?.value).toBe("riyadh");
    expect(typed.pending).toBe("education");
  });

  it("the path line names the engine's job, the reasons and the real match", () => {
    const rec = recommend({ ...facts.answers, interest: ["data"], company: "none", priority: "first-job" });
    expect(rec.recommended).toBe("data-analyst-riyadh");
    const line = pathLine("خالد", rec.recommended, 70, rec.reasons);
    expect(line).toMatch(/«محلل بيانات»/);
    expect(line).toMatch(/70%/);
    expect(line).toMatch(/تحب الأرقام والبيانات/);
  });
});

describe("the model layer's checks", () => {
  const request: OnboardingPhraseRequest = {
    v: 1,
    moment: "ack",
    name: "خالد",
    lines: ["زين، نظم معلومات إدارية. فيه مهارات كثيرة تنحسب لك من الحين.", "وعندك خبرة شغل؟ كم سنة تقريباً؟"],
    facts: { answer: "نظم معلومات إدارية", nextQuestion: "وعندك خبرة شغل؟ كم سنة تقريباً؟" },
  };
  it("accepts a Najdi rewording and refuses added facts, numbers, Fusha, or a lost question", () => {
    expect(phraseProblem(request, ["حلو، نظم معلومات إدارية تخصص يفتح أبواب.", "طيب، عندك خبرة شغل؟ كم سنة تقريباً؟"])).toBeNull();
    expect(phraseProblem(request, ["حلو، تخصص مطلوب في أرامكو.", "عندك خبرة؟"])).toMatch(/named/);
    expect(phraseProblem(request, ["حلو، 90% من الخريجين يتوظفون.", "عندك خبرة؟"])).toBe("number");
    expect(phraseProblem(request, ["ممتاز، هذه بداية جيدة.", "عندك خبرة؟"])).toBe("not najdi");
    expect(phraseProblem(request, ["حلو.", "خبرتك تهمني."])).toBe("question lost");
    expect(phraseProblem(request, ["حلو."])).toBe("line count");
  });

  it("understanding keeps only listed ids and a checked side reply", () => {
    const u: OnboardingUnderstandRequest = {
      v: 1,
      step: "city",
      question: "في أي مدينة أنت الحين؟",
      options: [
        { id: "riyadh", label: "الرياض" },
        { id: "jeddah", label: "جدة" },
      ],
      many: false,
      name: "خالد",
      text: "ساكن بالعاصمة",
    };
    expect(checkUnderstood(u, '{"type":"answer","options":["riyadh"]}')).toEqual({ type: "answer", options: ["riyadh"] });
    expect(checkUnderstood(u, '{"type":"answer","options":["dubai"]}')).toEqual({ type: "none" });
    expect(checkUnderstood(u, '{"type":"question","reply":"عشان أقدّم لك الوظائف القريبة منك أول، ومعها الوظائف عن بُعد."}')).toMatchObject({ type: "question" });
    expect(checkUnderstood(u, '{"type":"question","reply":"الرياض فيها 500 وظيفة."}')).toBeNull();
  });
});

describe("English place names (tester, 21 Nov 2026)", () => {
  it("reads «I live in Yanbu», Mecca and Al Khobar, and says the Arabic name back", async () => {
    const { onboardingTurn } = await import("./index");
    const yanbu = onboardingTurn(ctx(), { kind: "text", text: "I live in Yanbu" });
    expect(yanbu.answers.city?.label).toBe("ينبع");
    expect(yanbu.replies[0]).toMatch(/^ينبع/);
    expect(onboardingTurn(ctx(), { kind: "text", text: "Mecca" }).answers.city?.value).toBe("makkah");
    expect(onboardingTurn(ctx(), { kind: "text", text: "Al Khobar" }).answers.city).toEqual({ value: "dammam", label: "الخبر" });
    expect(onboardingTurn(ctx(), { kind: "text", text: "Qassim" }).answers.city?.label).toBe("القصيم");
  });
});

describe("quoted facts stay word for word", () => {
  it("refuses a rewording that drops what the template quotes", () => {
    const request: OnboardingPhraseRequest = {
      v: 1,
      moment: "path",
      name: "خالد",
      lines: ["أول وظيفة، هدف واضح.", "على إجاباتك، أقرب مسار لك «محلل بيانات». لحظات وأرسمه لك."],
      facts: { answer: "أول وظيفة بأسرع وقت", job: "محلل بيانات" },
    };
    expect(phraseProblem(request, ["زين، هدف واضح.", "أقرب مسار لك «محلل بيانات»، لحظات وأرسمه."])).toBeNull();
    expect(phraseProblem(request, ["زين، هدف واضح.", "عندي لك مسار حلو، لحظات وأرسمه."])).toBe("lost «محلل بيانات»");
  });
});
