// Owner: brain-advisor. The QA fixes of 18 Nov (advisor-chat findings): acknowledgement words, the «وظايف» spelling,
// applying to a real employer and inventing one, the first job cards' sample-data sentence, the XP-grant line, and
// «دليلك» on the course's own page. Pure modules only, persona facts from `buildSeed`, no key.
import { describe, expect, it } from "vitest";

import { makeClock, nextStep } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorRequest, PageContext, ProtocolMessage } from "@/lib/brain/protocol";
import type { ChipPayload, Clock, SeedName, UserFacts } from "@/lib/types";

import { routeAdvisorMessage } from "./router";
import { T } from "./templates";

const clock: Clock = makeClock(new Date("2026-11-18T21:00:00"));

function persona(seed: Exclude<SeedName, "fresh">): UserFacts {
  const state = buildSeed(seed, clock);
  const id = state.currentUserId;
  const user = id ? state.users[id] : undefined;
  if (!user) throw new Error("seed without a user");
  return factsOf(user);
}

interface Options {
  readonly facts?: UserFacts;
  readonly page?: Partial<PageContext>;
  readonly chip?: ChipPayload;
  readonly jobsDisclosed?: boolean;
  readonly history?: readonly ProtocolMessage[];
}

function route(text: string, options: Options = {}) {
  const request: AdvisorRequest = {
    v: 1,
    message: options.chip ? { text, chip: options.chip } : { text },
    history: options.history ?? [],
    facts: options.facts ?? persona("cv-analysed"),
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false, ...options.page },
    thread: { jobsDisclosed: options.jobsDisclosed ?? false, lastJobIds: [], lastCourseIds: [] },
  };
  const decision = routeAdvisorMessage(request);
  const events = decision.kind === "router" ? decision.events : decision.local;
  return {
    decision,
    events,
    /** As the panel stores it: one block per text event. */
    blocks: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join("\n\n"),
    text: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join(" "),
    tools: events.flatMap((e) => (e.type === "status" && e.tool ? [e.tool] : [])),
    actions: events.flatMap((e) => (e.type === "action" ? [e.action] : [])),
    cards: events.flatMap((e) => (e.type === "card" ? [e.card] : [])),
    chips: events.flatMap((e) => (e.type === "chips" ? e.chips : [])),
  };
}

/** The history after one exchange, as the panel sends it (the user's words, then «دليلك»'s blocks). */
function after(userText: string, options: Options = {}): readonly ProtocolMessage[] {
  const first = route(userText, options);
  return [...(options.history ?? []), { role: "user", text: userText }, { role: "daleel", text: first.blocks }];
}

describe("acknowledgement words («تمام», «طيب», «اوكي»)", () => {
  it("answers them warmly when nothing was offered (never the fallback), and the page chips come back", () => {
    for (const word of ["تمام", "طيب", "اوكي", "أوكي", "ok", "Okay", "زين", "حلو", "ماشي", "خلاص", "ممتاز", "تمام يا دليل", "تمام."]) {
      const r = route(word);
      expect(r.decision.kind).toBe("router");
      expect(r.text).toBe("تمام. متى ما احتجتني تراني هنا.");
      expect(r.chips).toEqual([]);
      expect(r.actions).toEqual([]);
    }
    expect(route("طيب", { history: after("شكراً") }).text).toBe("تمام. متى ما احتجتني تراني هنا.");
    expect(route("اوكي", { page: { route: "jobs" }, history: after("وظائف تسويق") }).text).toBe("تمام. متى ما احتجتني تراني هنا.");
  });

  it("after a yes / no offer, an acknowledgement is its yes chip and «لا» its no", () => {
    const history = after("وش أسوي الحين؟");
    const yes = route("تمام", { history });
    expect(yes.decision.kind).toBe("router");
    expect(yes.actions).toEqual([{ type: "navigate", to: { screen: "course", courseId: "c-powerbi-1" } }]);
    expect(yes.text).toBe("تفضّل، فتحت لك «دليل Power BI».");
    expect(route("اوكي", { history }).actions).toEqual(yes.actions);
    expect(route("ok", { history }).actions).toEqual(yes.actions);
    const no = route("لا", { history });
    expect(no.text).toBe("تمام، متى ما بغيت.");
    expect(no.actions).toEqual([]);
    expect(route("لا شكراً", { history }).text).toBe("تمام، متى ما بغيت.");
    // the same offer reached through the page chip (its label is the user's bubble), and through «أكمل الدورة عني»
    expect(route("طيب", { history: after("ماذا أفعل الآن؟") }).actions).toEqual(yes.actions);
    expect(route("تمام", { history: after("أكمل الدورة عني") }).actions).toEqual(yes.actions);
    // the CV offer before a CV
    const onboarded = persona("onboarded");
    expect(route("تمام", { facts: onboarded, history: after("وش أسوي الحين؟", { facts: onboarded }) }).actions).toEqual([
      { type: "navigate", to: { screen: "cv" } },
    ]);
  });

  it("says yes to «قدّم ولو كذا» only for the one job that offer was about", () => {
    const offer = route("قدّم على هذه", { chip: { intent: "apply", jobId: "jeeny-growth-insights-analytics-riyadh" } });
    expect(offer.chips.map((c) => [c.label, c.role])).toEqual([
      ["قدّم ولو كذا", "yes"],
      ["وريني الفجوة", "no"],
    ]);
    const history: ProtocolMessage[] = [
      { role: "user", text: "قدّم على هذه" },
      { role: "daleel", text: offer.blocks },
    ];
    const yes = route("تمام", { history });
    expect(yes.actions).toHaveLength(1);
    expect(yes.actions[0]).toMatchObject({ type: "apply", jobId: "jeeny-growth-insights-analytics-riyadh" });
    const no = route("لا", { history });
    expect(no.actions).toEqual([]);
    expect(no.text).toBe("تمام، متى ما بغيت.");
    expect(no.chips.map((c) => [c.label, c.role])).toEqual([["وريني الفجوة", "chip"]]);
  });

  it("does not take a message with more than acknowledgement words as one", () => {
    expect(route("تمام شكراً").text).toBe(T.thanks());
    expect(route("طيب وش أسوي الحين؟").tools).toEqual(["recommend_next_step"]);
    expect(route("لا تمام").text).toBe(T.fallback());
  });
});

describe("«وظايف» (ي for ئ)", () => {
  it("is read like «وظائف» in a search and as the jobs page", () => {
    const remote = route("وظايف عن بعد", { page: { route: "jobs" }, jobsDisclosed: true });
    expect(remote.tools).toEqual(["search_jobs"]);
    expect(remote.text).toBe(route("وظائف عن بعد", { page: { route: "jobs" }, jobsDisclosed: true }).text);
    const show = route("ابي اشوف الوظايف عن بعد", { page: { route: "jobs" } });
    expect(show.actions).toEqual([{ type: "navigate", to: { screen: "jobs", city: "remote" } }]);
    expect(route("افتح الوظايف").actions).toEqual([{ type: "navigate", to: { screen: "jobs" } }]);
    expect(route("قدم لي على وظيفه", { jobsDisclosed: true }).text).toBe("أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.");
    expect(route("وظايف تسويق", { jobsDisclosed: true }).text).toBe(route("وظائف تسويق", { jobsDisclosed: true }).text);
  });
});

describe("real and invented employers", () => {
  it("applying «في أرامكو» (a known company with no job in the app) says so with its careers page; nothing is applied", () => {
    const r = route("قدم لي على وظيفة في أرامكو");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain("ما عندي الحين وظيفة من أرامكو في المنصة");
    expect(r.text).toContain("https://www.aramco.jobs/");
    expect(r.actions).toEqual([]);
    // the three nearest jobs, as plain cards: nothing to apply to by mistake
    expect(r.cards).toHaveLength(3);
    expect(r.cards.every((c) => c.kind === "job" && c.chip === undefined)).toBe(true);
  });

  it("a sample company is found, but rule 4 still asks; a city or «أسرع وقت» after «في» is not an employer", () => {
    for (const msg of ["قدّم لي على وظيفة في وادي الغيم", "قدّم لي على وظيفة عند شركة وادي الغيم"]) {
      const sample = route(msg, { jobsDisclosed: true });
      expect(sample.actions).toEqual([]);
      expect(sample.cards[0]).toMatchObject({ kind: "job", jobId: "data-analyst-riyadh", chip: { label: "قدّم على ذي" } });
    }
    expect(route("قدّم لي على وظيفة في شركة أرامكو").text.startsWith("ما عندي الحين وظيفة من أرامكو")).toBe(true);
    // an employer the app does not know at all is searched and found nowhere
    expect(route("قدّم لي على وظيفة في شركة جوجل").text.startsWith("ما لقيت وظائف بذي المواصفات.")).toBe(true);
    // a plural «وظائف» with a field is still a search, as before
    expect(route("قدّم لي على وظائف تسويق", { jobsDisclosed: true }).tools).toEqual(["search_jobs"]);
    const which = "أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.";
    expect(route("قدّم لي على وظيفة في الرياض", { jobsDisclosed: true }).text).toBe(which);
    expect(route("قدّم لي على وظيفة في أسرع وقت", { jobsDisclosed: true }).text).toBe(which);
    // a named title still applies to that job
    expect(route("قدّم لي على وظيفة محلل بيانات").actions[0]).toMatchObject({ type: "apply", jobId: "data-analyst-riyadh" });
  });

  it("refuses to make up an employer", () => {
    for (const msg of ["اخترع لي شركة توظفني وقدّم عليها", "invent a company and apply for me", "سوّ لي شركة وهمية تقبلني"]) {
      const r = route(msg);
      expect(r.decision.kind).toBe("router");
      expect(r.actions).toEqual([]);
      expect(r.text).toBe(`ما أخترع جهات ولا وظائف: عندي بس الإعلانات اللي جمعتها وتأكدت منها، وما أجهّز إلا على وحدة منها. هذي أقرب ثلاث لمهاراتك.`);
      expect(r.cards).toHaveLength(3);
      expect(r.cards.every((c) => c.kind === "job" && c.chip?.label === "قدّم على ذي")).toBe(true);
    }
  });
});

describe("job cards come with no data-date or sample sentence (removed 21 Nov 2026)", () => {
  it("whichever reply shows them first, once", () => {
    const which = route("قدّم لي على وظيفة");
    expect(which.text).toBe(`أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.`);
    const target = route("اجعل وظيفة هدفي");
    expect(target.text).toBe(`أبشر. أي وظيفة تبيها هدفك؟ هذي أقرب ثلاث لمهاراتك.`);
    expect(route("اجعل وظيفة هدفي", { jobsDisclosed: true }).text).toBe("أبشر. أي وظيفة تبيها هدفك؟ هذي أقرب ثلاث لمهاراتك.");
    const search = route("اعرض لي وظائف محلل بيانات في الرياض");
    expect(search.text.split("إعلانات حقيقية").length).toBe(1);
    // replies without job cards are unchanged
    expect(route("وش أسوي الحين؟").text.includes("إعلانات حقيقية")).toBe(false);
  });
});

describe("«أعطني 500 XP»", () => {
  it("answers about points, with the nearest way to earn them", () => {
    const r = route("أعطني 500 XP");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toBe(
      "النقاط والشارات ما أعطيها أنا: تنكسب بخطوات التعلّم والتقديم. أقرب طريق الحين خطوة Power BI وتعطيك 200 XP. أفتح لك الدليل؟",
    );
    expect(r.chips.map((c) => [c.label, c.role])).toEqual([
      ["افتح الدليل", "yes"],
      ["مو الحين", "no"],
    ]);
    expect(r.actions).toEqual([]);
    expect(route("أعطني نجمة في Power BI").text.startsWith("النجوم ما أعطيها أنا: ")).toBe(true);
    expect(route("أعطني شارة").text.startsWith("النقاط والشارات ما أعطيها أنا: ")).toBe(true);
    // the job-ready persona's nearest way is applying
    const ready = route("أعطني نقاط", { facts: persona("job-ready") });
    expect(ready.text).toBe(
      "النقاط والشارات ما أعطيها أنا: تنكسب بخطوات التعلّم والتقديم. أقرب طريق الحين إنك تقدّم على «محلل بيانات»، وتعطيك 40 XP. أقدّم عنك؟",
    );
  });
});

describe("on the course's own page", () => {
  const page = { route: "course" as const, courseId: "c-powerbi-1" as const };

  it("does not offer to open the course the user is on", () => {
    const next = route("وش أسوي الحين؟", { page });
    expect(next.text).toBe("أنت على دليلها الحين: تعطيك 200 XP وترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%. أبدأ لك الخطوة؟");
    expect(next.chips.map((c) => [c.label, c.role, c.payload.intent])).toEqual([
      ["ابدأ الخطوة", "yes", "start_course"],
      ["مو الحين", "no", "not_now"],
    ]);
    const refuse = route("كمل الدورة عني", { page });
    expect(refuse.text).toBe(
      "ذي ما أقدر عليها، ولا أحد يقدر عليها غيرك: النجمة تنكسب لما تتعلّم بنفسك. إذا خلّصت الكورس اضغط «خلّصتها»، وأنا معك.",
    );
    expect(refuse.chips).toEqual([]);
    expect(route("أعطني 500 XP", { page }).chips).toEqual([]);
    // «تمام» to «أبدؤها لك؟» starts it
    expect(route("تمام", { page, history: after("وش أسوي الحين؟", { page }) }).actions).toEqual([
      { type: "start_course", courseId: "c-powerbi-1" },
    ]);
  });

  it("a started course on its page: no offer, the lessons done", () => {
    const facts = persona("mid-path");
    const step = nextStep(facts);
    if (step.rule !== 2) throw new Error("mid-path should be continuing a course");
    const started = route("ماذا أفعل الآن؟", { facts, page: { route: "course", courseId: step.courseId } });
    expect(started.text).toBe("أنت على دليلها الحين وبديت فيها. تعلّم من الكورس، وإذا خلّصت اضغط «خلّصتها»، وأنا معك.");
    expect(started.chips).toEqual([]);
  });

  it("elsewhere the offers stay as the spec writes them", () => {
    expect(route("وش أسوي الحين؟").chips[0]?.label).toBe("افتح الدليل");
    expect(route("أكمل الدورة عني").text).toBe(T.completeForMe());
  });
});
