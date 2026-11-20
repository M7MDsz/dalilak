// Owner: brain-advisor. «دليلك» knows the learning guides (20 Nov 2026, the owner's part 1): «وش أبدأ فيه؟», «وين أتعلم
// SQL؟», «مين أتابع في البيانات؟», «وش أقرأ عن Power BI؟» → the guide's real top pick (with one reason), its people or its
// articles, and the guide page of the user's next step in that skill opens. Plus the step wording that replaced the
// course wording, and the lines that must not move (the demo's apply line, the «أكمل الدورة عني» refusal). Pure modules,
// persona facts from `buildSeed`, no key. Expected guide words are read from the guide data, so nothing is restated.
import { describe, expect, it } from "vitest";

import { getGuide } from "@/lib/data";
import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorRequest, PageContext } from "@/lib/brain/protocol";
import type { Clock, SeedName, UserFacts } from "@/lib/types";

import { pageChips } from "./chips";
import { routeAdvisorMessage } from "./router";
import { T } from "./templates";
import { runTool } from "./tools";

const clock: Clock = makeClock(new Date("2026-11-18T21:00:00"));

function persona(seed: Exclude<SeedName, "fresh">): UserFacts {
  const state = buildSeed(seed, clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("seed without a user");
  return factsOf(user);
}

function route(text: string, options: { facts?: UserFacts; page?: Partial<PageContext> } = {}) {
  const request: AdvisorRequest = {
    v: 1,
    message: { text },
    history: [],
    facts: options.facts ?? persona("cv-analysed"),
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false, ...options.page },
    thread: { jobsDisclosed: true, lastJobIds: [], lastCourseIds: [] },
  };
  const decision = routeAdvisorMessage(request);
  const events = decision.kind === "router" ? decision.events : decision.local;
  return {
    decision,
    blocks: events.flatMap((e) => (e.type === "text" ? [e.text] : [])),
    text: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join(" "),
    tools: events.flatMap((e) => (e.type === "status" && e.tool ? [e.tool] : [])),
    actions: events.flatMap((e) => (e.type === "action" ? [e.action] : [])),
    chips: events.flatMap((e) => (e.type === "chips" ? e.chips : [])),
  };
}

const opens = (courseId: string) => [{ type: "navigate", to: { screen: "course", courseId } }];

describe("where to learn: the guide's top pick, and its page opens", () => {
  it("«وش أبدأ فيه؟»: the next step (Power BI, 70% → 90%), its top pick with one reason, and «دليل Power BI» opens", () => {
    const top = getGuide("powerbi").topPick;
    const r = route("وش أبدأ فيه؟");
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("guide");
    expect(r.tools).toEqual(["get_course", "navigate"]);
    expect(r.actions).toEqual(opens("c-powerbi-1"));
    expect(r.blocks).toEqual([
      "خطوتك الجاية Power BI، وترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%.",
      `أحسن مكان تتعلّمها منه «${top.title}» من ${top.provider}، بالعربي، مجاني. ليش هو؟ ${top.why}`,
      "فتحت لك «دليل Power BI»، ومتى ما جهزت اضغط «ابدأ بهذا».",
    ]);
    expect(route("وش أتعلم أول؟").actions).toEqual(r.actions);
    expect(route("what should I learn").actions).toEqual(r.actions);
  });

  it("«وين أتعلم SQL؟»: SQL's top pick, the guide of the user's next SQL star (cv-analysed holds 2 of 3)", () => {
    const top = getGuide("sql").topPick;
    const r = route("وين أتعلم SQL؟");
    expect(r.decision.intent).toBe("guide");
    expect(r.actions).toEqual(opens("c-sql-3"));
    expect(r.blocks).toEqual([
      `أحسن مكان تتعلّم منه SQL: «${top.title}» من ${top.provider}، بالإنجليزي، مجاني. ليش هو؟ ${top.why}`,
      "فتحت لك «دليل SQL»، ومتى ما جهزت اضغط «ابدأ بهذا».",
    ]);
    // the same answer however it is asked
    for (const line of ["أفضل كورس SQL", "أبي أتعلم SQL", "من وين أتعلم سيكوال؟", "ترشح لي دورة SQL؟"]) {
      expect(route(line).text, line).toBe(r.text);
      expect(route(line).actions, line).toEqual(r.actions);
    }
  });

  it("«وين أتعلّم باوربي»: Power BI however it is spelled", () => {
    const r = route("وين أتعلّم باوربي");
    expect(r.actions).toEqual(opens("c-powerbi-1"));
    expect(r.text).toBe(route("وين أتعلم Power BI؟").text);
    expect(r.text.startsWith("أحسن مكان تتعلّم منه Power BI: ")).toBe(true);
    expect(route("وين اتعلم باور بي آي").actions).toEqual(r.actions);
  });

  it("says hours, price and the certificate only when the data has them", () => {
    const excel = route("وين أتعلم Excel؟").text;
    expect(excel).toContain("بالإنجليزي، مدفوع، قرابة 15 ساعة، وفيه شهادة");
    const sql = route("وين أتعلم SQL؟").text;
    expect(sql).not.toContain("ساعة");
    expect(sql).not.toContain("شهادة");
    expect(route("وين أتعلم الإحصاء؟").text).toContain("بالإنجليزي، مدفوع، قرابة 10 ساعات، وفيه شهادة");
  });

  it("names the lock of a step that cannot start yet (the guide page explains it too)", () => {
    const r = route("وين أتعلم تعلّم الآلة؟");
    expect(r.actions).toEqual(opens("c-ml-1"));
    expect(r.blocks[r.blocks.length - 1]).toBe("وترى الخطوة للحين مقفلة: تحتاج قبلها تحليل البيانات بـ Python.");
  });

  it("a started step: «كمّل اللي بديته»", () => {
    const r = route("وش أبدأ فيه؟", { facts: persona("mid-path") });
    expect(r.actions).toEqual(opens("c-statistics-2"));
    expect(r.blocks[0]).toBe("كمّل اللي بديته في الإحصاء، وترفع مطابقتك مع «محلل بيانات» من 90% إلى 100%.");
  });

  it("before the CV, «وش أبدأ فيه؟» is the CV step (nothing to learn yet), as «وش أسوي الحين؟»", () => {
    const facts = persona("onboarded");
    const r = route("وش أبدأ فيه؟", { facts });
    expect(r.actions).toEqual([]);
    expect(r.text).toBe(T.nextStepCv());
  });
});

describe("who to follow and what to read", () => {
  it("«مين أتابع في البيانات؟»: the user's nearest data skill (the next step, Power BI) and two or three people", () => {
    const people = getGuide("powerbi").people.slice(0, 3);
    const r = route("مين أتابع في البيانات؟");
    expect(r.decision.intent).toBe("guide");
    expect(r.actions).toEqual(opens("c-powerbi-1"));
    expect(r.blocks[0]).toBe("أقرب مهارة لك في البيانات والتحليل الحين Power BI.");
    expect(r.blocks[1]).toBe("ناس يستاهلون تتابعهم فيها:");
    expect(r.blocks.slice(2, -1)).toEqual(
      people.map((p) => (p.name.includes("(") ? `${p.name}، ${p.platform}: ${p.why}` : `${p.name} (${p.platform}): ${p.why}`)),
    );
    expect(r.blocks[r.blocks.length - 1]).toBe("فتحت لك «دليل Power BI»، وفيه روابطهم.");
  });

  it("a field off the path: its first skill («مين أتابع في التسويق؟»)", () => {
    const r = route("مين أتابع في التسويق؟");
    expect(r.actions).toEqual(opens("c-marketing-basics-1"));
    expect(r.blocks[0]).toBe("أقرب مهارة لك في التسويق الرقمي الحين أساسيات التسويق.");
  });

  it("a guide with no people says so plainly, and still opens", () => {
    expect(getGuide("accounting").people).toEqual([]);
    const top = getGuide("accounting").topPick;
    const r = route("مين أتابع في المحاسبة؟");
    expect(r.actions).toEqual(opens("c-accounting-1"));
    expect(r.text).toBe(`ما عندي للحين أسماء متأكد منها أرشّحها في المحاسبة. فتحت لك «دليل المحاسبة»، وفيه أحسن مكان تتعلّمها منه: «${top.title}» من ${top.provider}.`);
  });

  it("«وش أقرأ عن Power BI؟»: the guide's articles", () => {
    const articles = getGuide("powerbi").articles;
    const r = route("وش أقرأ عن Power BI؟");
    expect(r.decision.intent).toBe("guide");
    expect(r.actions).toEqual(opens("c-powerbi-1"));
    expect(r.blocks[0]).toBe("تبي تقرا عن Power BI؟ ذي أحسن اللي عندي:");
    for (const article of articles.slice(0, 3)) expect(r.text).toContain(`«${article.title}»`);
    expect(r.blocks[r.blocks.length - 1]).toBe("فتحت لك «دليل Power BI»، وفيه روابطها.");
  });

  it("before the CV, who to follow comes from the target's field", () => {
    const r = route("مين أتابع؟", { facts: persona("onboarded") });
    expect(r.actions).toEqual(opens("c-excel-1"));
    expect(r.blocks[0]).toBe("أقرب مهارة لك في البيانات والتحليل الحين Excel.");
  });

  it("does not read following up an application or «اقرأ سيرتي» as a guide question", () => {
    expect(route("أبي أتابع طلبي", { facts: persona("mid-path") }).decision.intent).toBe("applications");
    expect(route("اقرأ سيرتي").decision.intent).not.toBe("guide");
  });

  it("never quotes a course title or lessons in a guide answer", () => {
    for (const line of ["وش أبدأ فيه؟", "وين أتعلم SQL؟", "مين أتابع في البيانات؟", "وش أقرأ عن Power BI؟"]) {
      const text = route(line).text;
      expect(text, line).not.toContain("أساسيات Power BI");
      expect(text, line).not.toContain("دروس");
    }
  });

  it("on that guide's own page, opens nothing and says the guide is in front of the user", () => {
    const r = route("وين أتعلم Power BI؟", { page: { route: "course", courseId: "c-powerbi-1" } });
    expect(r.actions).toEqual([]);
    expect(r.blocks[r.blocks.length - 1]).toBe("والدليل قدّامك: متى ما جهزت اضغط «ابدأ بهذا».");
  });

  it("opens nothing while the apply sheet is open (5.5 rule 7)", () => {
    const r = route("وين أتعلم SQL؟", { page: { applySheetOpen: true } });
    expect(r.actions).toEqual([]);
    expect(r.text).toBe("كمّل اللي قدّامك أول، وبعدها أفتح لك «دليل SQL».");
  });
});

describe("opening a guide", () => {
  it("«افتح دليل Power BI» opens that guide; «افتح الدليل» the next step's; the vocative «يا دليل» does not", () => {
    expect(route("افتح دليل Power BI").actions).toEqual(opens("c-powerbi-1"));
    expect(route("افتح دليل باوربي").actions).toEqual(opens("c-powerbi-1"));
    expect(route("افتح دليل Power BI").text).toBe("تفضّل، فتحت لك «دليل Power BI».");
    expect(route("افتح الدليل").actions).toEqual(opens("c-powerbi-1"));
    expect(route("افتح مساري يا دليل").actions).toEqual([{ type: "navigate", to: { screen: "path" } }]);
    expect(route("افتح دليل التعلم").actions).toEqual([{ type: "navigate", to: { screen: "learn" } }]);
    expect(route("افتح دليل التعلم").text).toBe("تفضّل، فتحت لك دليل التعلّم.");
  });
});

describe("what stays as it was", () => {
  it("the demo's apply line still applies (DL-2026-0001, 90%, 40 XP)", () => {
    const r = route("قدّم لي على وظيفة محلل بيانات", { facts: persona("course-done") });
    expect(r.decision.intent).toBe("apply");
    expect(r.actions).toEqual([
      { type: "apply", jobId: "data-analyst-riyadh", expect: { number: "DL-2026-0001", match: 90, xp: 40 } },
    ]);
  });

  it("«ابدأ دورة Power BI» still starts the step", () => {
    const r = route("ابدأ دورة Power BI");
    expect(r.decision.intent).toBe("start-course");
    expect(r.actions).toEqual([{ type: "start_course", courseId: "c-powerbi-1" }]);
  });

  it("«أكمل الدورة عني» is still refused, and so are «خلّصها عني», «خلّص الخطوة عني» and «اضغط خلّصتها عني»", () => {
    for (const line of ["أكمل الدورة عني", "خلّصها عني", "خلّص الخطوة عني", "اضغط خلّصتها عني", "كمّلها لي"]) {
      const r = route(line);
      expect(r.decision.intent, line).toBe("refuse-complete");
      expect(r.actions, line).toEqual([]);
      expect(r.text, line).toBe(T.completeForMe());
      expect(r.chips.map((c) => [c.label, c.role]), line).toEqual([
        ["افتح الدليل", "yes"],
        ["مو الحين", "no"],
      ]);
    }
    // «كمّل لي يا دليل» is not about a course
    expect(route("كمّل لي يا دليل").decision.intent).not.toBe("refuse-complete");
  });

  it("the honest line: most jobs are real postings, the guides are real", () => {
    const text = route("هل الكورسات حقيقية؟").text;
    expect(text).toBe(T.isReal());
    expect(text).toContain("أغلب الوظائف هنا إعلانات حقيقية");
    expect(text).toContain("وأدلة التعلّم حقيقية");
  });

  it("the how-to for learning describes the guide flow and opens «دليل التعلّم»", () => {
    const r = route("كيف أبدأ دورة؟");
    expect(r.actions).toEqual([{ type: "navigate", to: { screen: "learn" } }]);
    expect(r.text).toContain("«ابدأ بهذا»");
    expect(r.text).toContain("«خلّصتها»");
  });
});

describe("the guide page's chips and get_course", () => {
  it("labels the course page's chips for a guide (slugs and payloads unchanged)", () => {
    const facts = persona("cv-analysed");
    const chips = pageChips({ route: "course", courseId: "c-powerbi-1", applySheetOpen: false, showRunning: false }, facts, clock);
    expect(chips.map((c) => [c.slug, c.label])).toEqual([
      ["course-what", "وش في ذا الدليل؟"],
      ["start-course", "ابدأ ذي الخطوة"],
      ["course-gain", "كم ترفع مطابقتي؟"],
    ]);
    expect(chips[1]?.payload).toEqual({ intent: "start_course", courseId: "c-powerbi-1" });
  });

  it("answers «وش في ذا الدليل؟» typed on the guide's page like its chip", () => {
    const page = { route: "course" as const, courseId: "c-powerbi-1" as const };
    const typed = route("وش في ذا الدليل؟", { page });
    expect(typed.decision.intent).toBe("course");
    expect(typed.text.startsWith("دليل Power BI: أحسن بداية «")).toBe(true);
    expect(route("شكراً يا دليل", { page }).decision.intent).toBe("thanks");
  });

  it("get_course carries the real guide, the step's name and no lessons", () => {
    const facts = persona("cv-analysed");
    const result = runTool("get_course", { course_id: "c-powerbi-1" }, { facts, clock, page: { route: "path", applySheetOpen: false, showRunning: false } });
    if ("error" in result) throw new Error(result.detail);
    expect(result.title).toBe("Power BI");
    expect(result.lessons).toEqual([]);
    expect(result.guide?.top_pick.title).toBe(getGuide("powerbi").topPick.title);
    expect(result.guide?.people.map((p) => p.name)).toEqual(getGuide("powerbi").people.map((p) => p.name));
  });
});
