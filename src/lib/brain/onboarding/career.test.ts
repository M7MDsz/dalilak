// 21 Nov 2026 (owner: «the thing of upgrading my career, it should give you about your career; when you shift your career it
// should ask what are you interested in and give him a suggestion based on his current career»): the priority comes before
// the interest; «أتطوّر في مجالي» / «أغيّر مجالي» ask «وش مجال شغلك الحين؟»; growing records the interest itself and aims a
// band higher in that field; switching suggests the fields closest to the current one and lands in the NEW field.
import { describe, expect, it } from "vitest";

import { analyseCvLocal } from "@/lib/brain/cv";
import { revealReasonText } from "@/lib/copy";
import { getJob, sampleCvText } from "@/lib/data";
import { closeFields, recommend, trackOf } from "@/lib/engine";
import { revealData } from "@/features/welcome/reveal-data";
import type { OnboardingContext, OnboardingInput, OnboardingTurn } from "@/lib/brain/protocol";
import type { OnboardingAnswers, OnboardingStepId } from "@/lib/types";

import { cvConfirmQuestion, cvConfirmTurn, cvFacts, pathLine } from "./cv";
import { CV_QUESTION_ORDER, onboardingTurn, pendingQuestion, questionChips, stepNumber, stepsFor } from "./index";

const BASE: OnboardingAnswers = {
  city: { value: "riyadh", label: "الرياض" },
  education: "bachelor",
  major: { value: "finance", label: "مالية ومحاسبة" },
  experience: "1to3",
};

function ctx(answers: OnboardingAnswers, name = "خالد"): OnboardingContext {
  return { name, answers, misses: {}, pending: pendingQuestion(answers) };
}

function play(answers: OnboardingAnswers, inputs: readonly OnboardingInput[], name = "خالد"): OnboardingTurn[] {
  let context = ctx(answers, name);
  const turns: OnboardingTurn[] = [];
  for (const input of inputs) {
    const turn = onboardingTurn(context, input);
    turns.push(turn);
    context = { name, answers: turn.answers, misses: turn.misses, pending: turn.pending };
  }
  return turns;
}

const chip = (question: OnboardingStepId, option: string): OnboardingInput => ({ kind: "chip", question, option });

describe("the priority comes before the interest", () => {
  it("asks city, education, major, experience, priority, then the interest (first job: six steps, no current career)", () => {
    const turns = play(BASE, [chip("priority", "first-job"), chip("interest", "data")]);
    expect(pendingQuestion(BASE)).toBe("priority");
    expect(turns[0]?.replies[1]).toBe("وش نوع الشغل اللي يشدّك أكثر؟");
    expect(turns[0]?.pending).toBe("interest");
    expect(turns[1]?.done).toBe(true);
    expect(stepsFor(turns[1]!.answers)).toEqual(["city", "education", "major", "experience", "priority", "interest"]);
  });

  it("asks «وش مجال شغلك الحين؟» only after grow / switch, ALWAYS (21 Nov 2026, owner: with no work it is the field they studied)", () => {
    expect(pendingQuestion({ ...BASE, priority: "grow" })).toBe("current");
    expect(pendingQuestion({ ...BASE, priority: "switch" })).toBe("current");
    expect(pendingQuestion({ ...BASE, priority: "explore" })).toBe("interest");
    expect(pendingQuestion({ ...BASE, experience: "none", priority: "switch" })).toBe("current");
    // an account that finished before the question existed stays finished
    expect(pendingQuestion({ ...BASE, priority: "grow", interest: ["data"] }, true)).toBeNull();
    expect(stepsFor({ ...BASE, priority: "grow" })).toEqual(["city", "education", "major", "experience", "priority", "current", "interest"]);
    expect(stepNumber({ ...BASE, priority: "grow" })).toBe(6);
    expect(stepNumber({ ...BASE })).toBe(5);
  });

  it("offers the common fields of work and «مجال آخر» as tiles; every field is an option for a typed job", () => {
    const tiles = questionChips("current", BASE).options.map((o) => o.id);
    expect(tiles[0]).toBe("business");
    expect(tiles[tiles.length - 1]).toBe("other");
    expect(questionChips("current", BASE).options.find((o) => o.id === "business")?.label).toBe("المحاسبة والمالية");
  });
});

describe("«أتطوّر في مجالي»: the path is the next step up in the field they work in", () => {
  const grow: OnboardingAnswers = { ...BASE, major: { value: "cs", label: "حاسب وتقنية معلومات" } };

  it("records the interest itself, says so, asks the specialisation, and closes", () => {
    const [priority, current, track] = play(grow, [chip("priority", "grow"), chip("current", "software"), chip("currentTrack", "back-end")]);
    expect(priority?.replies).toEqual(["قرار موفق، تتطوّر في مجالك وتبني على اللي عندك.", "وش مجال شغلك الحين؟"]);
    expect(priority?.chips?.question).toBe("current");
    expect(current?.answers.current).toEqual({ value: "software", label: "البرمجة والتقنية" });
    expect(current?.answers.interest).toEqual(["software"]);
    expect(current?.replies).toEqual(["تمام، نطوّرك في مجالك: البرمجة والتقنية. بدوّر لك على الخطوة اللي بعدها فيه.", "وش تخصصك فيه بالضبط؟"]);
    // the field's specialisations with jobs, then «غير كذا» (21 Nov 2026, owner: upgrade the current career)
    expect(current?.chips?.options.map((o) => o.id)).toEqual(["full-stack", "front-end", "mobile", "qa", "ai", "back-end", "other"]);
    expect(track?.userText).toBe("واجهات خلفية");
    expect(track?.answers.currentTrack).toEqual({ value: "software/back-end", label: "واجهات خلفية" });
    expect(track?.replies[0]).toBe("تمام، واجهات خلفية.");
    expect(track?.done).toBe(true);
    expect(stepsFor(track!.answers)).toEqual(["city", "education", "major", "experience", "priority", "current", "currentTrack", "interest"]);
  });

  it("reads a typed specialisation («باك إند»), and «غير كذا» keeps the whole field", () => {
    const at = ctx({ ...grow, priority: "grow", current: { value: "software", label: "البرمجة والتقنية" }, interest: ["software"] });
    expect(at.pending).toBe("currentTrack");
    expect(onboardingTurn(at, { kind: "text", text: "باك إند" }).answers.currentTrack?.value).toBe("software/back-end");
    expect(onboardingTurn(at, { kind: "text", text: "front end developer" }).answers.currentTrack?.value).toBe("software/front-end");
    expect(onboardingTurn(at, chip("currentTrack", "other")).answers.currentTrack).toEqual({ value: "other", label: "غير كذا" });
  });

  it("recommends the next step in their OWN specialisation, says so, and offers only higher jobs of it", () => {
    const answers: OnboardingAnswers = {
      ...grow,
      priority: "grow",
      current: { value: "software", label: "البرمجة والتقنية" },
      currentTrack: { value: "software/back-end", label: "واجهات خلفية" },
      interest: ["software"],
    };
    const rec = recommend(answers);
    expect(trackOf(rec.recommended).id).toBe("software/back-end");
    expect(getJob(rec.recommended).band).toBe("mid");
    expect(rec.reasons.map(revealReasonText)[0]).toBe("خطوتك الجاية في واجهات خلفية");
    expect(pathLine("خالد", rec.recommended, null, rec.reasons)).toBe("الخطوة الجاية لك في واجهات خلفية: «مطوّر واجهات خلفية». لحظات وأرسمها لك."); // the path names the role (21 Nov 2026)
    const data = revealData(answers);
    expect(data.mode).toBe("grow");
    expect(data.tracks[0]?.job.id).toBe(rec.recommended);
    expect(data.tracks.length).toBeGreaterThanOrEqual(3);
    for (const card of data.tracks) {
      expect(trackOf(card.job.id).id, card.job.id).toBe("software/back-end");
      expect(getJob(card.job.id).band, card.job.id).toBe("mid");
    }
    expect(data.alternatives.map((a) => a.id)).toEqual(data.tracks.slice(1, 3).map((t) => t.job.id));
  });

  it("an accountant with over three years: an accounting job at their level, then the field at their level (never a junior one)", () => {
    const answers: OnboardingAnswers = {
      ...BASE,
      experience: "over3",
      priority: "grow",
      current: { value: "business", label: "المحاسبة والمالية" },
      currentTrack: { value: "business/accounting", label: "المحاسبة" },
      interest: ["business"],
    };
    const rec = recommend(answers);
    expect(trackOf(rec.recommended).id).toBe("business/accounting");
    expect(getJob(rec.recommended).band).toBe("mid");
    const data = revealData(answers);
    expect(data.tracks.every((t) => getJob(t.job.id).field === "business" && getJob(t.job.id).band === "mid")).toBe(true);
  });

  it("aims one band above the user's experience in that field (1to3 → mid), and says it grows them", () => {
    const answers: OnboardingAnswers = { ...grow, priority: "grow", current: { value: "software", label: "البرمجة والتقنية" }, interest: ["software"] };
    const rec = recommend(answers);
    expect(getJob(rec.recommended).field).toBe("software");
    expect(getJob(rec.recommended).band).toBe("mid");
    expect(rec.reasons.map(revealReasonText)).toContain("تطوّر داخل مجالك");
  });

  it("reads a typed job title («أنا مبرمج», «I'm a software developer»)", () => {
    const at = ctx({ ...grow, priority: "grow" });
    expect(onboardingTurn(at, { kind: "text", text: "أنا مبرمج" }).answers.current).toEqual({ value: "software", label: "البرمجة" });
    expect(onboardingTurn(at, { kind: "text", text: "I'm a software developer" }).answers.current?.value).toBe("software");
    expect(onboardingTurn(ctx({ ...BASE, priority: "grow" }), { kind: "text", text: "محاسب" }).answers.interest).toEqual(["business"]);
  });
});

describe("«أغيّر مجالي»: a suggestion built on the current career, the path in the NEW field", () => {
  it("names the closest fields (skills their jobs share) in the interest question and puts them first among the tiles", () => {
    expect(closeFields("business")).toEqual(["data", "banking-risk"]); // the known move first (21 Nov 2026)
    const [priority, current] = play(BASE, [chip("priority", "switch"), chip("current", "business")]);
    expect(priority?.replies[1]).toBe("وش مجال شغلك الحين؟");
    expect(current?.replies).toEqual([
      "زين، شغلك في المحاسبة والمالية ما يروح عليك، مهاراتك منه تختصر عليك الطريق.",
      "من شغلك في المحاسبة والمالية، أقرب مجالات تنتقل لها: الأرقام والبيانات أو البنوك والتدقيق، وش يشدّك؟",
    ]);
    const tiles = current?.chips?.options.map((o) => o.id) ?? [];
    expect(tiles.slice(0, 2)).toEqual(["data", "banking-risk"]);
    expect(tiles).not.toContain("business");
    expect(current?.answers.interest).toBeUndefined();
  });

  it("lands on an entry / junior job of the chosen field, with «مهاراتك من … تنفعك فيه» among the reasons", () => {
    const turns = play(BASE, [chip("priority", "switch"), chip("current", "business"), chip("interest", "data")]);
    const last = turns[2];
    expect(last?.done).toBe(true);
    const rec = recommend(last!.answers);
    const job = getJob(rec.recommended);
    expect(job.field).toBe("data");
    expect(["entry", "junior"]).toContain(job.band);
    expect(rec.reasons.map(revealReasonText)).toContain("مهاراتك من المحاسبة والمالية تنفعك فيه");
  });

  it("never takes the field they work in now as the new one", () => {
    const at = ctx({ ...BASE, priority: "switch", current: { value: "business", label: "المحاسبة" } });
    const same = onboardingTurn(at, { kind: "text", text: "تنظيم الأعمال والمشاريع" });
    expect(same.answers.interest).toBeUndefined();
    expect(same.replies[0]).toBe("المحاسبة هو مجالك الحين، وأنت تبي تغيّره. اختر مجال جديد من الخيارات تحت.");
    expect(same.pending).toBe("interest");
  });

  it("reads «أشتغل محاسب وأبي أغيّر مجالي» as both answers", () => {
    const turn = onboardingTurn(ctx(BASE), { kind: "text", text: "أشتغل محاسب وأبي أغيّر مجالي" });
    expect(turn.answers.priority).toBe("switch");
    expect(turn.answers.current).toEqual({ value: "business", label: "المحاسبة" });
    expect(turn.pending).toBe("interest");
  });
});

describe("with a CV", () => {
  it("the sample CV states no current career (a co-op is not one) and keeps exactly its four answers", () => {
    const facts = cvFacts(analyseCvLocal(sampleCvText("خالد")).lines);
    expect(facts.slots).toEqual(["city", "education", "major", "experience"]);
    expect(facts.answers.current).toBeUndefined();
  });

  it("reads the current job of a CV with years of work, says it in the confirm, and asks the priority next", () => {
    const lines = ["سارة", "الرياض", "الخبرة العملية", "محاسبة، شركة الندى للتجارة، 2021 - الآن", "خبرة 4 سنوات في إعداد القوائم المالية."];
    const facts = cvFacts(lines);
    expect(facts.answers.current).toEqual({ value: "business", label: "المحاسبة" });
    expect(facts.answers.currentTrack).toEqual({ value: "business/accounting", label: "المحاسبة" });
    expect(cvConfirmQuestion(facts.answers)).toBe("فهمت من سيرتك إنك من الرياض، وعندك خبرة أكثر من 3 سنوات، وشغلك الحين في المحاسبة. صح؟");
    const yes = cvConfirmTurn({ name: "سارة", answers: facts.answers, misses: {}, pending: null }, facts.slots, { kind: "chip", option: "yes" }, null);
    expect(yes.pending).toBe("priority");
    expect(CV_QUESTION_ORDER.slice(0, 4)).toEqual(["priority", "current", "currentTrack", "interest"]);
    // «أغيّر مجالي» then skips the question the CV answered and asks the interest with the suggestion
    const sw = onboardingTurn({ name: "سارة", answers: yes.answers, misses: {}, pending: "priority", order: CV_QUESTION_ORDER }, chip("priority", "switch"));
    expect(sw.pending).toBe("interest");
    expect(sw.replies[sw.replies.length - 1]).toMatch(/^من شغلك في المحاسبة، أقرب مجالات تنتقل لها: /);
  });
});

describe("«أتطوّر في مجالي» with a CV whose latest job is «محاسب» (4 years)", () => {
  it("reads the specialisation from the job title, skips both questions, and closes on the next accounting step", () => {
    const lines = ["سارة", "الرياض", "الخبرة العملية", "محاسب، شركة الندى للتجارة، 2021 - الآن", "خبرة 4 سنوات في إعداد القوائم المالية."];
    const facts = cvFacts(lines);
    const yes = cvConfirmTurn({ name: "سارة", answers: facts.answers, misses: {}, pending: null }, facts.slots, { kind: "chip", option: "yes" }, null);
    const grow = onboardingTurn({ name: "سارة", answers: yes.answers, misses: {}, pending: "priority", order: CV_QUESTION_ORDER }, chip("priority", "grow"));
    // the education and major the CV did not state are still asked, after the career
    expect(grow.answers.interest).toEqual(["business"]);
    expect(grow.replies[0]).toMatch(/تمام، نطوّرك في مجالك: المحاسبة\./);
    expect(grow.pending).toBe("education");
    const rec = recommend({ ...grow.answers, education: "bachelor", major: { value: "finance", label: "مالية ومحاسبة" } });
    expect(trackOf(rec.recommended).id).toBe("business/accounting");
    expect(getJob(rec.recommended).band).toBe("mid");
  });
});
