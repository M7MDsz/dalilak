// Owner: brain-advisor (20 Nov 2026, owner's part 2). Step 7 of the onboarding chat, «وفيه شركة أو وظيفة معيّنة في بالك؟»,
// asked right after «الاهتمام»: the tiles of the field just picked, the optional skip («لا، مو الحين» and its typed forms),
// company names in their common spellings (offline), the misses, the reply that names the company's job or says there is
// none, reading a company ahead of its turn only with a wish word, and accounts saved before the step existed.
import { describe, expect, it } from "vitest";

import { getCompany, getJob, getJobCity } from "@/lib/data";
import { companyJob, jobsAtCompany, makeClock } from "@/lib/engine";
import { COMPANY_IDS } from "@/lib/ids";
import { appendOnboardingMessages, applyOnboardingTurn, newUser } from "@/lib/store/transitions";
import type { OnboardingContext, OnboardingInput } from "@/lib/brain/protocol";
import type { OnboardingAnswers, UserState } from "@/lib/types";

import { onboardingContext, onboardingTurn, openingMessages, pendingQuestion, questionChips } from "./index";

const clock = makeClock(new Date("2026-11-20T21:00:00"));

/** The five answers before the company step (the demo's). */
const FIVE: OnboardingAnswers = {
  city: { value: "riyadh", label: "الرياض" },
  education: "bachelor",
  major: { value: "mis", label: "نظم معلومات إدارية" },
  experience: "none",
  interest: ["data"],
};

function ctx(answers: OnboardingAnswers = FIVE, misses: OnboardingContext["misses"] = {}): OnboardingContext {
  return { name: "خالد", answers, misses, pending: pendingQuestion(answers) };
}

const say = (t: string, answers: OnboardingAnswers = FIVE, misses: OnboardingContext["misses"] = {}) =>
  onboardingTurn(ctx(answers, misses), { kind: "text", text: t });
const tap = (option: string, answers: OnboardingAnswers = FIVE) =>
  onboardingTurn(ctx(answers), { kind: "chip", question: "company", option } satisfies OnboardingInput);

const PRIORITY_Q = "وآخر سؤال، وش أولويتك الحين؟";
const NONE_ACK = "ولا يهمك، نخليها مفتوحة، وتقدر تضيفها بعدين من «ملفي».";

describe("the company step: where it sits and its tiles", () => {
  it("is asked right after «الاهتمام», with the big employers of the field just picked and «لا، مو الحين»", () => {
    const turn = onboardingTurn(ctx({ ...FIVE, interest: undefined }), { kind: "chip", question: "interest", option: "data" });
    expect(turn.pending).toBe("company");
    expect(turn.replies[1]).toBe("وفيه شركة أو وظيفة معيّنة في بالك؟");
    expect(turn.chips?.question).toBe("company");
    expect(turn.chips?.options.map((o) => o.id)).toEqual(["maharah", "aramco", "stc", "sabic", "qiddiya", "salla", "none"]);
    expect(turn.chips?.options.map((o) => o.label)).toEqual(["مهارة", "أرامكو", "stc", "سابك", "القدية", "سلة", "لا، مو الحين"]);
  });

  it("follows the field: «مهارة» first (the owner's request), then the field's employers, «لا، مو الحين» last", () => {
    expect(questionChips("company", { interest: ["software"] }).options.map((o) => o.id)).toEqual(["maharah", "stc", "mobily", "zain", "foodics", "lucidya", "none"]);
    expect(questionChips("company", { interest: ["design"] }).options.map((o) => o.id)).toEqual(["maharah", "neom", "roshn", "hungerstation", "tabby", "lucidya", "none"]);
    expect(questionChips("company", { interest: ["hr", "data"] }).options[1]?.id).toBe("qiddiya");
    expect(questionChips("company", { interest: ["unsure"] }).options.map((o) => o.id)).toEqual(["maharah", "aramco", "stc", "sabic", "neom", "pif", "none"]);
  });
});

describe("the optional skip (the demo walk's one extra tap)", () => {
  it("records «لا، مو الحين» as company none, answers in Najdi, and asks the last question", () => {
    const turn = tap("none");
    expect(turn.userText).toBe("لا، مو الحين");
    expect(turn.answers.company).toBe("none");
    expect(turn.replies).toEqual([NONE_ACK, PRIORITY_Q]);
    expect(turn.pending).toBe("priority");
    expect(turn.done).toBe(false);
  });

  it.each(["لا", "لا، مو الحين", "مو الحين", "بعدين", "مافي", "ما في بالي شي", "ولا شي", "أي شركة", "no", "not now", "مدري", "لا أعرف"])(
    "reads «%s» as no company",
    (t) => {
      const turn = say(t);
      expect(turn.answers.company).toBe("none");
      expect(turn.replies).toEqual([NONE_ACK, PRIORITY_Q]);
    },
  );
});

describe("company names typed offline (Arabic and English, common spellings)", () => {
  it.each([
    ["أرامكو", "aramco"],
    ["ارامكو", "aramco"],
    ["Aramco", "aramco"],
    ["أبي أشتغل في أرامكو", "aramco"],
    ["اس تي سي", "stc"],
    ["إس تي سي", "stc"],
    ["STC", "stc"],
    ["stc", "stc"],
    ["سابك طبعاً", "sabic"],
    ["لا، أبي سابك", "sabic"],
    ["هنقر ستيشن", "hungerstation"],
    ["مصرف الراجحي", "alrajhi"],
    ["سدايا", "sdaia"],
    ["مهارة", "maharah"],
    ["أبي أشتغل في مهارة", "maharah"],
    ["مهارة للموارد البشرية", "maharah"],
    ["Maharah", "maharah"],
  ] as const)("«%s» → %s", (t, id) => {
    const turn = say(t);
    expect(turn.answers.company).toBe(id);
    expect(turn.pending).toBe("priority");
  });

  it("applies a model-classified company like a tile (the online path maps a typed name to an id)", () => {
    const turn = onboardingTurn(ctx(), { kind: "classified", question: "company", options: ["neom"], text: "المدينة الجديدة في تبوك" });
    expect(turn.answers.company).toBe("neom");
    expect(turn.userText).toBe("المدينة الجديدة في تبوك");
  });
});

describe("what «دليلك» says when a company is named", () => {
  it("names the company's job the path will end on, or says there is none in his list and he goes to the closest", () => {
    for (const id of COMPANY_IDS) {
      const short = getCompany(id).short;
      const reply = tap(id).replies[0];
      const job = companyJob({ ...FIVE, company: id });
      if (job === null) {
        expect(jobsAtCompany(id), id).toEqual([]);
        expect(reply, id).toBe(
          `${short}، اختيار زين! بس ما عندي الحين وظيفة منهم في قائمتي، فبرسم مسارك لأقرب وظيفة تناسبك، وتقدر تغيّر الشركة من «ملفي» متى ما بغيت.`,
        );
      } else {
        const j = getJob(job);
        const where = j.city === "remote" ? "عن بُعد" : `في ${getJobCity(j.city).name}`;
        expect(reply, id).toBe(`${short}، اختيار زين! عندهم وظيفة «${j.title}» ${where}، وعليها برسم مسارك.`);
      }
    }
  });

  it("never names a job before it knows the five answers (a company read ahead only says it has jobs)", () => {
    const withJobs = COMPANY_IDS.find((id) => jobsAtCompany(id).length > 0);
    if (withJobs === undefined) return; // the job data has no real company yet: nothing to name
    const early = onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" } }), { kind: "chip", question: "company", option: withJobs });
    expect(early.replies[0]).toBe(`${getCompany(withJobs).short}، سجّلتها! عندهم وظايف في قائمتي، وبعد ما أعرفك أكثر أختار لك أنسبها.`);
  });
});

describe("misses and reading ahead", () => {
  it("asks again once for a name it does not know, then leaves it open (never stores a guess)", () => {
    const first = say("شركة الفلاني للتجارة");
    expect(first.replies).toEqual([
      "ما عرفت ذي الشركة. تقدر تختار من الخيارات تحت أو تكتب اسمها بطريقة ثانية، وإذا ما في بالك شي، اختر «لا، مو الحين».",
      "وفيه شركة أو وظيفة معيّنة في بالك؟",
    ]);
    expect(first.answers.company).toBeUndefined();
    expect(first.misses).toEqual({ company: 1 });
    expect(first.unmapped).toEqual({ question: "company", text: "شركة الفلاني للتجارة" });
    const second = say("شركة الفلاني للتجارة", FIVE, first.misses);
    expect(second.answers.company).toBe("none");
    expect(second.replies).toEqual(["ما عرفتها، فنخليها مفتوحة الحين، وتقدر تضيفها بعدين من «ملفي».", PRIORITY_Q]);
  });

  it("does not take «زين» (good) for the company Zain, nor «مهارة» (a skill) inside a sentence", () => {
    expect(say("زين").answers.company).toBeUndefined();
    expect(say("زين السعودية").answers.company).toBe("zain");
    expect(say("أبي أطوّر مهارة التواصل").answers.company).toBeUndefined();
    const four: OnboardingAnswers = { ...FIVE, interest: undefined };
    expect(onboardingTurn(ctx(four), { kind: "text", text: "أحب البيانات وأبي أطوّر مهارة" }).answers.company).toBeUndefined();
  });

  it("reads a company ahead of its turn only with a wish word, and never «لا»", () => {
    const four: OnboardingAnswers = { ...FIVE, interest: undefined };
    const ahead = onboardingTurn(ctx(four), { kind: "text", text: "أحب البيانات وأبي أشتغل في سابك" });
    expect(ahead.answers.interest).toEqual(["data"]);
    expect(ahead.answers.company).toBe("sabic");
    expect(ahead.pending).toBe("priority");
    const now = onboardingTurn(ctx({ ...four, experience: undefined }), { kind: "text", text: "عندي سنة خبرة في stc" });
    expect(now.answers.experience).toBe("1to3");
    expect(now.answers.company).toBeUndefined();
    const no = onboardingTurn(ctx(four), { kind: "text", text: "لا أحب البيانات" });
    expect(no.answers.company).toBeUndefined();
  });
});

describe("accounts saved before the step existed (20 Nov 2026) stay complete", () => {
  const six: OnboardingAnswers = { ...FIVE, priority: "first-job" };

  it("pendingQuestion: six answers → company for a conversation in progress, null for a completed account", () => {
    expect(pendingQuestion(six)).toBe("company");
    expect(pendingQuestion(six, true)).toBeNull();
    expect(pendingQuestion({ ...six, company: "none" })).toBeNull();
  });

  it("onboardingContext: a completed old account has nothing pending; a new one completes on the seventh answer", () => {
    const greeted = appendOnboardingMessages(newUser("خالد", clock), openingMessages("خالد"), clock);
    const old: UserState = { ...greeted, answers: six, onboardingCompletedAt: clock.now };
    expect(onboardingContext(old).pending).toBeNull();
    let state: UserState = { ...greeted, answers: FIVE };
    state = applyOnboardingTurn(state, onboardingTurn(onboardingContext(state), { kind: "chip", question: "company", option: "none" }), clock).user;
    expect(state.onboardingCompletedAt).toBeNull();
    state = applyOnboardingTurn(state, onboardingTurn(onboardingContext(state), { kind: "chip", question: "priority", option: "first-job" }), clock).user;
    expect(state.onboardingCompletedAt).not.toBeNull();
    expect(state.answers.company).toBe("none");
  });
});
