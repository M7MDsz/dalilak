// Owner: brain-advisor. Spec 5.7 acceptance test: every user line of 5.6 (examples 1-22), with the persona facts of
// `buildSeed` and no key, gives exactly that reply text, tool calls, cards and chips; every 5.8 chip answers; the 5.4
// never-a-request examples send nothing; consent and rule-7 edge cases. Pure modules only.
import { describe, expect, it } from "vitest";

import { fitReasons, makeClock, nextApplicationNumber, nextStep } from "@/lib/engine";
import { NAV_SCREENS } from "@/lib/ids";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorEvent, AdvisorRequest, PageContext, ProtocolMessage } from "@/lib/brain/protocol";
import type { ChipPayload, Clock, SeedName, UserFacts } from "@/lib/types";

import { pageChips } from "./chips";
import { routeAdvisorMessage, type RouterDecision } from "./router";
import { T } from "./templates";

const clock: Clock = makeClock(new Date("2026-11-18T21:00:00"));

function persona(seed: Exclude<SeedName, "fresh">): UserFacts {
  const state = buildSeed(seed, clock);
  const id = state.currentUserId;
  if (!id) throw new Error("seed without a user");
  const user = state.users[id];
  if (!user) throw new Error("seed user missing");
  return factsOf(user);
}

const PATH: PageContext = { route: "path", applySheetOpen: false, showRunning: false };

function request(
  text: string,
  options: {
    facts?: UserFacts;
    page?: Partial<PageContext>;
    chip?: ChipPayload;
    jobsDisclosed?: boolean;
    history?: readonly ProtocolMessage[];
  } = {},
): AdvisorRequest {
  return {
    v: 1,
    message: options.chip ? { text, chip: options.chip } : { text },
    history: options.history ?? [],
    facts: options.facts ?? persona("cv-analysed"),
    clock,
    page: { ...PATH, ...options.page },
    thread: { jobsDisclosed: options.jobsDisclosed ?? false, lastJobIds: [], lastCourseIds: [] },
  };
}

function eventsOf(decision: RouterDecision): readonly AdvisorEvent[] {
  return decision.kind === "router" ? decision.events : decision.local;
}

function route(text: string, options: Parameters<typeof request>[1] = {}) {
  const decision = routeAdvisorMessage(request(text, options));
  const events = eventsOf(decision);
  return {
    decision,
    events,
    text: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join(" "),
    tools: events.flatMap((e) => (e.type === "status" && e.tool ? [e.tool] : [])),
    actions: events.flatMap((e) => (e.type === "action" ? [e.action] : [])),
    cards: events.flatMap((e) => (e.type === "card" ? [e.card] : [])),
    chips: events.flatMap((e) => (e.type === "chips" ? e.chips : [])),
  };
}

describe("5.6 examples, no key (the local brain and the router)", () => {
  it("1. what should I do now (and the dialect and the chip)", () => {
    const expected =
      "خطوتك الجاية: Power BI. تعطيك 200 XP وترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%، وجهّزت لك أحسن مكان تتعلّمها منه. أفتح لك الدليل؟";
    for (const r of [route("ماذا أفعل الآن؟"), route("وش أسوي الحين؟"), route("", { chip: { intent: "page", slug: "next-step" } })]) {
      expect(r.text).toBe(expected);
      expect(r.tools).toEqual(["recommend_next_step"]);
      expect(r.actions).toEqual([]);
      expect(r.cards).toEqual([]);
      expect(r.chips.map((c) => [c.label, c.role])).toEqual([
        ["افتح الدليل", "yes"],
        ["مو الحين", "no"],
      ]);
      expect(r.chips[0]?.payload).toEqual({ intent: "open", to: { screen: "course", courseId: "c-powerbi-1" } });
    }
  });

  it("2. open my roadmap (and «ودّني لمساري», \"open my path\")", () => {
    for (const line of ["افتح مساري", "ودّني لمساري", "open my path"]) {
      const r = route(line);
      expect(r.decision.kind).toBe("router");
      expect(r.text).toBe("تفضّل، هذا مسارك. أنت في المرحلة 7 من 8، واللي بعدها Power BI.");
      expect(r.tools).toEqual(["navigate"]);
      expect(r.actions).toEqual([{ type: "navigate", to: { screen: "path" } }]);
    }
  });

  it("3. show me data analyst jobs in Riyadh", () => {
    const r = route("اعرض لي وظائف محلل بيانات في الرياض");
    expect(r.text).toBe(
      "لقيت 4 وظائف. الأقرب لمهاراتك «محلل بيانات» بمطابقة 70%. فتحت لك القائمة.",
    );
    expect(r.tools).toEqual(["search_jobs"]);
    expect(r.actions).toEqual([{ type: "navigate", to: { screen: "jobs", q: "محلل بيانات", city: "riyadh" } }]);
    expect(r.cards).toEqual([
      { kind: "job", jobId: "data-analyst-riyadh" },
      { kind: "job", jobId: "ninja-real-estate-performance-analyst-riyadh" },
      { kind: "job", jobId: "qiddiya-hr-analytics-analyst-riyadh" },
      { kind: "job", jobId: "maharah-qa-analyst-riyadh" },
    ]);
  });

  it("4. apply for me: the demo line, after the Power BI course, on /path", () => {
    const facts = persona("course-done");
    const r = route("قدّم لي على وظيفة محلل بيانات", { facts });
    expect(r.decision.kind).toBe("router");
    expect(r.tools).toEqual(["apply_to_job"]);
    expect(r.actions).toEqual([
      { type: "apply", jobId: "data-analyst-riyadh", expect: { number: "DL-2026-0001", match: 90, xp: 40 } },
    ]);
    expect(r.text).toBe(
      "حفظت طلبك على «محلل بيانات» في «طلباتي» برقم DL-2026-0001 ومطابقتك 90%، وكسبت 40 XP.",
    );
    expect(r.cards).toEqual([{ kind: "application", jobId: "data-analyst-riyadh" }]);
    expect(r.chips.map((c) => [c.label, c.role, c.slug])).toEqual([
      ["افتح طلباتي", "chip", "open-applications"],
      ["افتح مساري", "chip", "open-path"],
    ]);
    // apply_to_job's number is the engine's nextApplicationNumber (the same derivation the store uses).
    expect(nextApplicationNumber(facts, clock)).toBe("DL-2026-0001");
  });

  it("4. the same from the job page («هذه الوظيفة»), the page chip and the «دع دليلك يقدّم عنك» button", () => {
    const facts = persona("course-done");
    const page = { route: "job" as const, jobId: "data-analyst-riyadh" as const };
    const typed = route("قدّم لي على هذه الوظيفة", { facts, page });
    const chip = route("قدّم لي على هذه الوظيفة", { facts, page, chip: { intent: "apply", jobId: "data-analyst-riyadh" } });
    const button = route("قدّم لي على هذه الوظيفة", { facts, chip: { intent: "apply", jobId: "data-analyst-riyadh" } });
    for (const r of [typed, chip, button]) {
      expect(r.actions).toEqual([
        { type: "apply", jobId: "data-analyst-riyadh", expect: { number: "DL-2026-0001", match: 90, xp: 40 } },
      ]);
    }
  });

  it("5. why is my match 70%", () => {
    const r = route("لماذا مطابقتي 70%؟");
    expect(r.text).toBe(
      "الوظيفة تطلب خمس مهارات، وكل وحدة بـ 20%. اللي مكتمل عندك: Excel و SQL والتواصل الفعّال (60%). الإحصاء: عندك نجمة من نجمتين (10%). وللحين ما عندك نجوم في: Power BI (0%). المجموع 70%، وخطوة Power BI توصّلك لـ 90%.",
    );
    expect(r.tools).toEqual(["explain_match"]);
    expect(r.actions).toEqual([]);
  });

  it("6. what is this course (on /learn/c-powerbi-1)", () => {
    const r = route("ما هذه الدورة؟", { page: { route: "course", courseId: "c-powerbi-1" } });
    expect(r.text).toBe(
      "دليل Power BI: أحسن بداية «بدء استخدام تحليلات بيانات Microsoft» من Microsoft Learn، بالعربي، مجاني. وإذا خلّصت الخطوة تاخذ النجمة 1 في Power BI و200 XP، وترتفع مطابقتك مع هدفك لـ 90%. وفي الدليل بعد ناس تتابعهم ومقالات تقراها.",
    );
    expect(r.tools).toEqual(["get_course"]);
  });

  it("7. how do I move up the leaderboard", () => {
    const r = route("كيف أتقدّم في الترتيب؟");
    expect(r.text).toBe(
      "أنت في المركز 18 ذا الأسبوع بـ 180 XP، وبينك وبين المركز 17 10 XP. أسرع طريق تطلع فيه: كمّل خطوة Power BI، تاخذ 200 XP وتطلع للمركز 10.",
    );
    expect(r.tools).toEqual(["recommend_next_step", "get_leaderboard"]);
  });

  it("8. a greeting", () => {
    const r = route("السلام عليكم");
    expect(r.text).toBe("وعليكم السلام ورحمة الله، حيّاك الله يا خالد. مطابقتك مع «محلل بيانات» 70% وباقي لك مرحلتين. من وين نبدأ؟");
    expect(r.tools).toEqual([]);
    expect(route("هلا").text).toBe("هلا والله يا خالد. مطابقتك مع «محلل بيانات» 70% وباقي لك مرحلتين. من وين نبدأ؟");
  });

  it("9. thanks", () => {
    expect(route("شكراً يا دليل").text).toBe("العفو، الله يعطيك العافية. أنا هنا متى ما احتجتني.");
  });

  it("10. off-topic: the fallback with its three chips", () => {
    const r = route("من سيفوز بمباراة الليلة؟");
    expect(r.text).toBe("سامحني، ما عندي جواب زين على ذي. أقدر أساعدك في مسارك ووظايفك ووين تتعلّم: أقول لك خطوتك الجاية، أو أفتح لك صفحة، أو أشرح لك مطابقتك.");
    expect(r.decision.kind).toBe("open");
    expect(r.chips.map((c) => [c.slug, c.label])).toEqual([
      ["next-step", "وش أسوي الحين؟"],
      ["open-path", "افتح مساري"],
      ["why-match", "ليش كذا مطابقتي؟"],
    ]);
  });

  it("11. refuses to complete a course for the user", () => {
    const r = route("أكمل الدورة عني");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toBe(
      "ذي ما أقدر عليها، ولا أحد يقدر عليها غيرك: النجمة تنكسب لما تتعلّم بنفسك وتضغط «خلّصتها». اللي أقدر عليه أفتح لك الدليل الحين وأكون معك. أفتحه؟",
    );
    expect(r.actions).toEqual([]);
    expect(r.chips.map((c) => [c.label, c.role])).toEqual([
      ["افتح الدليل", "yes"],
      ["مو الحين", "no"],
    ]);
  });

  it("12. is it real (also «هل مطابقتي حقيقية؟»)", () => {
    const expected =
      "للأمانة: أغلب الوظائف هنا إعلانات حقيقية، ولكل وحدة رابط إعلانها الأصلي، وفيها أجهّز لك الطلب وترسله أنت من الإعلان. وأدلة التعلّم حقيقية: الكورسات والناس والمقالات كلها حقيقية. واللي ينحسب فعلاً مهاراتك ومطابقتك ومسارك.";
    expect(route("هل وادي الغيم شركة حقيقية؟ قل لي أي شركة كبيرة توظّف الآن").text).toBe(expected);
    expect(route("هل مطابقتي حقيقية؟").text).toBe(expected);
  });

  it("13. a real-world number (a career's pay is the published figure since 20 Nov 2026: router-careers.test.ts)", () => {
    expect(route("كم راتب محلل البيانات؟").text).toContain("حسب دليل Hays للرواتب في السعودية 2026");
    expect(route("كم الرواتب في سوق العمل؟").text).toBe(
      "سؤال في محله، بس ما عندي أرقام موثوقة عن سوق العمل أو الرواتب، وما أحب أعطيك شي من عندي. اللي أعرفه بالضبط مطابقتك ومهاراتك وخطوتك الجاية، وتقدر تسألني عنها.",
    );
  });

  it("14. change my target", () => {
    const r = route("اجعل مهندس بيانات أول هدفي");
    expect(r.tools).toEqual(["set_target_job"]);
    expect(r.actions).toEqual([{ type: "set_target", jobId: "master-works-data-senior-engineer-riyadh" }]);
    expect(r.text).toBe(
      "تم. هدفك الحين «مهندس بيانات أول» ومطابقتك معه 53%. باقي لك 3 مراحل، وتبدأ بـ Power BI. فتحت لك المسار الجديد.",
    );
  });

  it("15. start a course", () => {
    const r = route("ابدأ دورة Power BI");
    expect(r.tools).toEqual(["start_course"]);
    expect(r.actions).toEqual([{ type: "start_course", courseId: "c-powerbi-1" }]);
    expect(r.text).toBe("بدينا خطوة Power BI. فتحت لك دليلها، واضغط «ابدأ بهذا» يفتح لك «بدء استخدام تحليلات بيانات Microsoft» من Microsoft Learn. إذا خلّصته ارجع واضغط «خلّصتها» وتطلع مطابقتك لـ 90%. الله يوفقك.");
  });

  it("16. my applications (after example 4, status in review)", () => {
    const r = route("ما حالة طلبي؟", { facts: persona("mid-path") });
    expect(r.text).toBe(
      "عندك طلب واحد: «محلل بيانات»، وحالته الحين «جاهز».",
    );
    expect(r.tools).toEqual(["list_applications"]);
    expect(r.cards).toEqual([{ kind: "application", jobId: "data-analyst-riyadh" }]);
  });

  it("17. upload my CV (before any CV)", () => {
    const r = route("أريد أن أرفع سيرتي", { facts: persona("onboarded") });
    expect(r.text).toBe(
      "أبشر. فتحت لك صفحة السيرة: ارفع ملف PDF أو Word، أو الصق النص. وإذا ما هي جاهزة جرّب السيرة الجاهزة عندي.",
    );
    expect(r.actions).toEqual([{ type: "navigate", to: { screen: "cv" } }]);
  });

  it("18. an unclear request to apply (on /path): which job, three cards with «قدّم على هذه»", () => {
    const r = route("قدّم لي على وظيفة", { jobsDisclosed: true });
    expect(r.text).toBe("أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.");
    // the first job cards of a thread carry no data sentence (removed 21 Nov 2026)
    expect(route("قدّم لي على وظيفة").text).toBe("أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.");
    expect(r.tools).toEqual(["search_jobs"]);
    expect(r.actions).toEqual([]);
    expect(r.cards.map((c) => (c.kind === "job" ? c.jobId : c.kind))).toEqual([
      "data-analyst-riyadh",
      // 21 Nov 2026: the jobs page ranks the target's field first, so the next two are data jobs
      "master-works-data-senior-engineer-riyadh",
      "jeeny-growth-insights-analytics-riyadh",
    ]);
    for (const card of r.cards) {
      expect(card.kind === "job" && card.chip?.label).toBe("قدّم على ذي");
    }
  });

  it("19. who are you", () => {
    expect(route("من أنت؟").text).toBe(
      "أنا دليلك إلى وظيفتك. أشرح لك مسارك، وأدلّك وين تتعلّم كل مهارة، وأفتح لك الصفحات، وأقدّم على الوظائف إذا طلبت. أما التعلّم فعليك أنت.",
    );
  });

  it("20. badges", () => {
    const r = route("كيف أحصل على شارة جديدة؟");
    expect(r.text).toBe("أقرب شارة لك «أول خطوة تعلّم»: أتمّ خطوة تعلّم واحدة. ومعها تاخذ «ضمن العشرة الأوائل».");
    expect(r.tools).toEqual(["recommend_next_step", "list_badges"]);
  });

  it("21. my points and level", () => {
    const r = route("كم نقاطي؟");
    expect(r.text).toBe("عندك 180 XP وأنت في المستوى 2 · مستكشف. باقي لك 170 XP للمستوى 3، وسلسلتك يوماً واحداً.");
    expect(r.tools).toEqual([]);
  });

  it("22. dialect: «ودّني لطلباتي»", () => {
    const r = route("ودّني لطلباتي");
    expect(r.text).toBe("تفضّل، فتحت لك طلباتك.");
    expect(r.actions).toEqual([{ type: "navigate", to: { screen: "applications" } }]);
  });
});

describe("Saudi dialect and simple English (5.1, 5.7 word lists)", () => {
  it("reads the common phrasings", () => {
    const intent = (line: string) => route(line).decision.intent;
    expect(intent("وش التالي؟")).toBe("next-step");
    expect(intent("what should i do")).toBe("next-step");
    expect(route("ودني للوظائف").actions).toEqual([{ type: "navigate", to: { screen: "jobs" } }]);
    expect(route("وين ملفي").actions).toEqual([{ type: "navigate", to: { screen: "profile" } }]);
    expect(route("show me the leaderboard").actions).toEqual([{ type: "navigate", to: { screen: "leaderboard" } }]);
    expect(route("خلني أشوف شجرة المهارات").actions).toEqual([{ type: "navigate", to: { screen: "skills" } }]);
    expect(route("افتح وظيفة محلل بيانات").actions).toEqual([{ type: "navigate", to: { screen: "job", jobId: "data-analyst-riyadh" } }]);
    expect(route("افتح دورة الإحصاء").actions).toEqual([{ type: "navigate", to: { screen: "course", courseId: "c-statistics-2" } }]);
    expect(intent("كم باقي على الهدف")).toBe("fixed-answer");
    expect(intent("ليش اخترت لي هذا المسار؟")).toBe("fixed-answer");
    expect(route("وش ينقصني لوظيفة محلل أداء عقاري").text.startsWith("ناقصك لوظيفة «محلل أداء عقاري»")).toBe(true);
    expect(route("أبغى أقدم على مهندس بيانات أول").text).toBe(
      "مطابقتك مع ذي الوظيفة 53% بس، أقل من 60%. الأحسن نسدّ الفجوة أول. تبيني أقدّم ولو كذا؟",
    );
  });
});

describe("5.8: every page chip answers, in code", () => {
  const facts = persona("cv-analysed");
  const pages: PageContext[] = NAV_SCREENS.map((route) => ({
    route,
    applySheetOpen: false,
    showRunning: false,
    ...(route === "job" ? { jobId: "ninja-real-estate-performance-analyst-riyadh" as const } : {}),
    ...(route === "course" ? { courseId: "c-powerbi-1" as const } : {}),
  }));

  it("lists the spec's chips per page, leaving out chips that would do nothing", () => {
    const slugs = (page: PageContext, f: UserFacts = facts) => pageChips(page, f, clock).map((c) => c.slug);
    expect(slugs(pages[0]!)).toEqual(["next-step", "why-path", "remaining"]);
    expect(slugs({ ...PATH, route: "job", jobId: "ninja-real-estate-performance-analyst-riyadh" })).toEqual(["why-match", "apply", "gap", "set-target"]);
    expect(pageChips({ ...PATH, route: "job", jobId: "ninja-real-estate-performance-analyst-riyadh" }, facts, clock)[0]?.label).toBe("ليش مطابقتي 43%؟");
    // On the target job no «اجعلها هدفي»; after applying no «قدّم لي على هذه الوظيفة».
    expect(slugs({ ...PATH, route: "job", jobId: "data-analyst-riyadh" }, persona("mid-path"))).toEqual(["why-match", "gap"]);
    // A credited course has no «ابدأ هذه الدورة».
    expect(slugs({ ...PATH, route: "course", courseId: "c-excel-1" })).toEqual(["course-what", "course-gain"]);
    expect(slugs({ ...PATH, route: "course", courseId: "c-powerbi-1" })).toEqual(["course-what", "start-course", "course-gain"]);
  });

  it("answers every chip of every page through the router (never a model), with text", () => {
    for (const page of pages) {
      for (const chip of pageChips(page, facts, clock)) {
        const decision = routeAdvisorMessage(request(chip.label, { page, chip: chip.payload }));
        expect(decision.kind, `${page.route}/${chip.slug}`).toBe("router");
        const texts = eventsOf(decision).filter((e) => e.type === "text");
        expect(texts.length, `${page.route}/${chip.slug}`).toBeGreaterThan(0);
      }
    }
  });

  it("gives the fixed answers of 5.8", () => {
    const answer = (slug: "why-path" | "remaining" | "stars-how" | "cv-what" | "cv-none" | "level-how", f = facts) =>
      route("", { facts: f, chip: { intent: "page", slug } }).text;
    expect(answer("why-path")).toBe(
      "اخترته لك لأنه يناسب اهتمامك بالأرقام والبيانات، وقريب من تخصصك، ويناسب البدايات. وتقدر تغيّره من صفحة الوظائف.",
    );
    expect(answer("remaining")).toBe("باقي لك مرحلتين عشان توصل 100% مع «محلل بيانات».");
    expect(answer("remaining", persona("job-ready"))).toBe("خلّصت مسارك: مطابقتك 100% مع «محلل بيانات».");
    expect(answer("stars-how")).toBe(
      "النجمة الأولى لمهارة مذكورة في سيرتك، والثانية إذا طلعت في خبرة أو مشروع، والثالثة إذا انوصفت إنها متقدمة. وبعدها كل خطوة تعلّم تخلّصها تزيدك نجمة.",
    );
    expect(answer("cv-what")).toBe("أدوّر على 38 مهارة بأسمائها، وأحفظ لكل مهارة الجملة اللي تثبتها عشان تشوفها بنفسك.");
    expect(answer("cv-none")).toBe("ولا يهمك. الصق أي نص يوصف دراستك وخبرتك، أو جرّب السيرة الجاهزة، أو ابدأ مسارك بدون سيرة.");
    expect(answer("level-how")).toBe("المستوى يرتفع بالـ XP، وأكثر شي يجيبه إنك تخلّص خطوات التعلّم. باقي لك 170 XP للمستوى 3.");
    // Typed, the fixed answers come before the general intents («كم بقي على هدفي؟» is not the next step).
    expect(route("كم بقي على هدفي؟").text).toBe(answer("remaining"));
    expect(route("كم بقي على هدفي؟").decision.kind).toBe("router");
  });

  it("uses fitReasons of the CURRENT target for why-path", () => {
    const facts2: UserFacts = { ...facts, targetJobId: "syarah-financial-analyst-tamheer-riyadh" };
    const reasons = fitReasons("syarah-financial-analyst-tamheer-riyadh", facts2.answers);
    expect(route("", { facts: facts2, chip: { intent: "page", slug: "why-path" } }).text).toBe(T.whyPath(reasons));
    expect(T.whyPath(reasons)).not.toBe(T.whyPath(fitReasons("data-analyst-riyadh", facts2.answers)));
  });

  it("searches with show for the jobs chips, and the best job without moving the page", () => {
    const riyadh = route("", { chip: { intent: "page", slug: "jobs-data-riyadh" } });
    expect(riyadh.actions).toEqual([{ type: "navigate", to: { screen: "jobs", city: "riyadh", field: "data" } }]);
    expect(riyadh.text).toBe(
      "لقيت 13 وظيفة. الأقرب لمهاراتك «محلل بيانات» بمطابقة 70%. فتحت لك القائمة.",
    );
    const best = route("", { chip: { intent: "page", slug: "best-job" }, jobsDisclosed: true });
    expect(best.actions).toEqual([]);
    expect(best.text).toBe("أنسب وظيفة لمهاراتك الحين «محلل بيانات» بمطابقة 70%، وبعدها «مهندس بيانات أول» و«مدير نمو - رؤى وتحليلات».");
    expect(best.cards).toHaveLength(3);
  });

  it("answers «ليس الآن» and the «افتح…» chips", () => {
    expect(route("ليس الآن", { chip: { intent: "not_now" } }).text).toBe("تمام، متى ما بغيت.");
    const open = route("افتح الدورة", { chip: { intent: "open", to: { screen: "course", courseId: "c-powerbi-1" } } });
    expect(open.actions).toEqual([{ type: "navigate", to: { screen: "course", courseId: "c-powerbi-1" } }]);
    expect(open.text).toBe("تفضّل، فتحت لك «دليل Power BI».");
  });
});

describe("5.4 consent: what counts as the user asking", () => {
  it("sends nothing for the never-a-request examples", () => {
    for (const line of [
      "قدّمت على وظيفة أمس",
      "اشرح لي التقديم المدروس",
      "ابدأ دورة العرض والتقديم",
      "أبغى أتقدّم في الترتيب",
      "من أين أبدأ؟",
      "أي دورة أبدأ بها؟",
      "لماذا هذا هدفي؟",
      "كيف أقدّم على وظيفة؟",
      "تقديم",
    ]) {
      const r = route(line);
      // 5.4: a question never applies, starts a course or changes the target. Since 18 Nov 2026 a how-to question
      // («كيف أقدّم على وظيفة؟») may OPEN the page where it is done (guide.ts); every other line opens nothing either.
      expect(r.actions.filter((a) => a.type !== "navigate"), line).toEqual([]);
      if (line === "كيف أقدّم على وظيفة؟") expect(r.actions, line).toEqual([{ type: "navigate", to: { screen: "jobs" } }]);
      else expect(r.actions, line).toEqual([]);
    }
  });

  it("reads «ابدأ دورة العرض والتقديم» as a start request for a course already credited by the CV", () => {
    const r = route("ابدأ دورة العرض والتقديم");
    expect(r.text).toBe("ذي النجمة عندك أصلاً، فما تحتاج ذي الخطوة.");
    expect(r.actions).toEqual([]);
  });

  it("treats a polite request as a request", () => {
    const facts = persona("course-done");
    const r = route("ممكن تقدّم لي على هذه الوظيفة؟", { facts, page: { route: "job", jobId: "data-analyst-riyadh" } });
    expect(r.actions.map((a) => a.type)).toEqual(["apply"]);
  });

  it("needs a second yes under 60%: low-match offer, then the «قدّم على أي حال» chip applies with 0 XP", () => {
    const facts = persona("cv-analysed");
    const page = { route: "job" as const, jobId: "ninja-real-estate-performance-analyst-riyadh" as const };
    const offer = route("قدّم لي على هذه الوظيفة", { facts, page });
    expect(offer.actions).toEqual([]);
    expect(offer.text).toBe("مطابقتك مع ذي الوظيفة 43% بس، أقل من 60%. الأحسن نسدّ الفجوة أول. تبيني أقدّم ولو كذا؟");
    expect(offer.chips.map((c) => [c.label, c.role])).toEqual([
      ["قدّم ولو كذا", "yes"],
      ["وريني الفجوة", "no"],
    ]);
    expect(offer.chips[1]?.payload).toEqual({ intent: "open", to: { screen: "job", jobId: "ninja-real-estate-performance-analyst-riyadh", focus: "missing" } });
    const anyway = route("قدّم على أي حال", { facts, page, chip: { intent: "apply", jobId: "ninja-real-estate-performance-analyst-riyadh", anyway: true } });
    expect(anyway.actions).toEqual([
      { type: "apply", jobId: "ninja-real-estate-performance-analyst-riyadh", expect: { number: "DL-2026-0001", match: 43, xp: 0 } },
    ]);
    expect(anyway.text).toBe(
      "أبشر، جهّزت طلبك على «محلل أداء عقاري» عند نينجا برقم DL-2026-0001 ومطابقتك 43%، وبدون نقاط لأن المطابقة أقل من 60%. الإرسال عليك: اضغط «افتح الإعلان الأصلي وقدّم»، وأنسخ لك رسالة التقديم عشان تلصقها هناك. وتلقاه في «طلباتي».",
    );
  });

  it("creates nothing for a second application to the same job", () => {
    const r = route("قدّم لي على وظيفة محلل بيانات", { facts: persona("mid-path") });
    expect(r.actions).toEqual([]);
    expect(r.text).toBe("قدّمت على ذي الوظيفة من قبل، وحالة طلبك «جاهز».");
    expect(r.chips.map((c) => c.label)).toEqual(["افتح طلباتي"]);
  });

  it("asks which job when two titles are named, and which course when none is", () => {
    const two = route("قدّم لي على وظيفة مهندس بيانات أول أو محلل أداء عقاري", { jobsDisclosed: true });
    expect(two.actions).toEqual([]);
    // 21 Nov 2026: the jobs named are the ones offered (each with «قدّم على ذي»); nothing is applied
    expect(two.text).toBe("لقيت أكثر من وظيفة تطابق اللي قلته. على أي وحدة أقدّم لك؟");
    expect(two.cards.map((c) => (c.kind === "job" ? c.jobId : null)).sort()).toEqual(
      ["master-works-data-senior-engineer-riyadh", "ninja-real-estate-performance-analyst-riyadh"].sort(),
    );
    expect(two.cards.every((c) => c.kind === "job" && c.chip?.label === "قدّم على ذي")).toBe(true);
    const course = route("ابدأ الدورة");
    expect(course.actions).toEqual([]);
    expect(course.text).toBe("أبشر. وش تبي تتعلّم؟ هذي خطوات مسارك.");
    expect(course.cards.every((c) => c.kind === "course" && c.chip?.label === "ابدأ الخطوة")).toBe(true);
  });

  it("does not change the target to the job that is already the target", () => {
    const r = route("اجعل محلل بيانات هدفي");
    expect(r.actions).toEqual([]);
    expect(r.text).toBe("ذي هي هدفك الحالي أصلاً.");
  });

  it("refuses to start a locked course, with the reason", () => {
    const r = route("ابدأ دورة تعلّم الآلة");
    expect(r.actions).toEqual([]);
    expect(r.text.startsWith("ما أقدر أبداها الحين: تحتاج ")).toBe(true);
  });

  it("refuses to grant XP or stars", () => {
    expect(route("أعطني 100 XP").decision.kind).toBe("router");
    expect(route("أعطني 500 XP").text).toBe(
      "النقاط والشارات ما أعطيها أنا: تنكسب بخطوات التعلّم والتقديم. أقرب طريق الحين خطوة Power BI وتعطيك 200 XP. أفتح لك الدليل؟",
    );
    expect(route("أعطني 500 XP").chips.map((ch) => [ch.label, ch.role])).toEqual([
      ["افتح الدليل", "yes"],
      ["مو الحين", "no"],
    ]);
    expect(route("أعطني نجمة في Power BI").text.startsWith("النجوم ما أعطيها أنا: ")).toBe(true);
    expect(route("أعطني 500 XP").actions).toEqual([]);
  });
});

describe("5.5 rule 7 in router turns: no action while the apply sheet is open or a show runs", () => {
  it("answers blockedActionReply for open, apply, start and target requests", () => {
    const facts = persona("course-done");
    for (const page of [
      { route: "path" as const, applySheetOpen: true },
      { route: "path" as const, showRunning: true },
    ]) {
      const open = route("افتح مساري", { facts, page });
      expect(open.actions).toEqual([]);
      expect(open.text).toBe("كمّل اللي قدّامك أول، وبعدها أفتح لك مسارك.");
      expect(open.chips.map((c) => [c.slug, c.label])).toEqual([["open-path", "افتح مساري"]]);

      const apply = route("قدّم لي على وظيفة محلل بيانات", { facts, page });
      expect(apply.actions).toEqual([]);
      expect(apply.text).toBe("كمّل اللي قدّامك أول، وبعدها أفتح لك «محلل بيانات».");

      const start = route("ابدأ دورة الإحصاء", { facts, page });
      expect(start.actions).toEqual([]);
      expect(start.text).toBe("كمّل اللي قدّامك أول، وبعدها أفتح لك «دليل الإحصاء».");

      const target = route("اجعل مهندس بيانات أول هدفي", { facts, page });
      expect(target.actions).toEqual([]);
      expect(target.text).toBe("كمّل اللي قدّامك أول، وبعدها أفتح لك «مهندس بيانات أول».");
    }
  });
});

describe("other 5.9 replies", () => {
  it("next step before a CV, and a started course", () => {
    expect(route("ماذا أفعل الآن؟", { facts: persona("onboarded") }).text).toBe(
      "خطوتك الجاية إنك ترفع سيرتك الذاتية، عشان أعرف وش خلّصت من مراحل مسارك. أفتح لك صفحة السيرة؟",
    );
    expect(route("ماذا أفعل الآن؟", { facts: persona("mid-path") }).text).toBe(
      "كمّل اللي بديته في الإحصاء. أفتح لك الدليل؟",
    );
    const ready = route("ماذا أفعل الآن؟", { facts: persona("job-ready") });
    expect(ready.text).toBe("مطابقتك مع «محلل بيانات» 100%. خطوتك الجاية إنك تقدّم عليها. أقدّم عنك؟");
    expect(ready.chips.map((c) => [c.label, c.role])).toEqual([
      ["قدّم على ذي", "yes"],
      ["مو الحين", "no"],
    ]);
  });

  it("the path before a CV, the gap with its card, the path's courses, the rank gap and the streak", () => {
    expect(route("افتح مساري", { facts: persona("onboarded") }).text).toBe("تفضّل، هذا مسارك. وأول خطوة فيه ترفع سيرتك الذاتية.");
    const gap = route("ما المهارات التي تنقصني؟");
    expect(gap.text).toBe(
      "ناقصك لوظيفة «محلل بيانات»: Power BI والإحصاء. أقرب خطوة تتعلّم Power BI، وترفع مطابقتك من 70% إلى 90%.",
    );
    expect(gap.cards).toEqual([{ kind: "gap", jobId: "data-analyst-riyadh" }]);
    const courses = route("", { chip: { intent: "page", slug: "courses-path" } });
    expect(courses.text).toBe("باقي لك في مسارك مرحلتين، وأولها Power BI.");
    expect(courses.cards).toEqual([
      { kind: "course", courseId: "c-powerbi-1" },
      { kind: "course", courseId: "c-statistics-2" },
    ]);
    expect(route("", { chip: { intent: "page", slug: "rank-gap" } }).text).toBe("بينك وبين المركز 17 10 XP.");
    expect(route("سلسلتي").text).toBe("سلسلتك الحين يوماً واحداً. ادخل كل يوم عشان تكبر مكافأتك: 20 XP عن كل يوم، لين 100.");
  });

  it("a job search with nothing found answers with three cards", () => {
    const r = route("وظائف في أرامكو");
    expect(r.text).toBe("ما لقيت وظائف بذي المواصفات. هذي أقرب ثلاث لمهاراتك.");
    expect(r.cards).toHaveLength(3);
    expect(r.actions).toEqual([]);
  });

  it("adds the sample-data sentence only the first time jobs come up", () => {
    const r = route("وظائف تسويق", { jobsDisclosed: true });
    expect(r.text.includes("إعلانات حقيقية")).toBe(false);
    expect(r.actions).toEqual([]);
  });

  it("explains the match of a job named in the message, and of the job on screen", () => {
    const named = route("لماذا مطابقتي مع وظيفة مهندس بيانات أول 53%؟");
    expect(named.tools).toEqual(["explain_match"]);
    expect(named.text.endsWith("المجموع 53%، وخطوة Power BI توصّلك لـ 73%.")).toBe(true);
    const onPage = route("", { page: { route: "job", jobId: "data-analyst-riyadh" }, chip: { intent: "page", slug: "why-match" } });
    expect(onPage.text).toBe(route("لماذا مطابقتي 70%؟").text);
  });
});

describe("the platform guide (how-to questions open the page, 18 Nov 2026)", () => {
  it("answers «كيف أغيّر صورتي؟» with the buttons and opens the profile", () => {
    const r = route("طيب كيف اغير صورتي ؟");
    expect(r.decision.kind).toBe("router");
    expect(r.actions).toEqual([{ type: "navigate", to: { screen: "profile" } }]);
    expect(r.text).toContain("«غيّر الصورة»");
  });

  it("opens the right page for other how-to questions", () => {
    expect(route("كيف أغير هدفي؟").actions).toEqual([{ type: "navigate", to: { screen: "jobs" } }]);
    expect(route("وين أشوف سجل النقاط").actions).toEqual([{ type: "navigate", to: { screen: "profile" } }]);
    expect(route("كيف أبدأ دورة؟").actions).toEqual([{ type: "navigate", to: { screen: "learn" } }]);
    expect(route("كيف أبدأ محادثة جديدة").actions).toEqual([]);
  });

  it("answers a platform question the local brain had no row for from the guide, not with «ذي برّا اللي أقدر عليه»", () => {
    const r = route("وين ألقى شاراتي؟");
    expect(r.text).toContain("«الشارات»");
    expect(r.actions).toEqual([{ type: "navigate", to: { screen: "profile" } }]);
  });

  it("leaves questions that are not how-to alone", () => {
    expect(route("أي دورة أبدأ بها؟").actions).toEqual([]);
    expect(route("أبي أطلع في المتصدرين").actions.every((a) => a.type !== "navigate" || a.to.screen !== "profile")).toBe(true);
  });
});

describe("kind answers when no model is there (18 Nov 2026, «be nice»)", () => {
  it("comforts a worried user first, then gives the real next step", () => {
    const r = route("أنا خايف ما ألقى وظيفة");
    expect(r.text.startsWith("أفهمك، والشعور هذا طبيعي")).toBe(true);
    expect(r.text).toContain("Power BI");
    expect(r.text).not.toContain("سامحني");
  });

  it("gives CV-writing advice for «كيف أكتب سيرة ذاتية قوية؟» (not the upload page)", () => {
    const r = route("كيف أكتب سيرة ذاتية قوية؟");
    expect(r.text.startsWith("نصيحتي لسيرة قوية")).toBe(true);
    expect(r.actions).toEqual([]);
  });

  it("gives interview tips for the target job", () => {
    expect(route("عطني نصيحة للمقابلة").text).toContain("ثلاث نصايح تفرق معك في مقابلة «محلل بيانات»");
  });

  it("answers «does this field have a future» honestly, in code (no market claims)", () => {
    const r = route("هل البيانات مجال له مستقبل؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text.startsWith("سؤال في محله، بس ما عندي أرقام موثوقة")).toBe(true);
  });
});
