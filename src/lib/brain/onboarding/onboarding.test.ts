// Owner: brain-advisor. Spec 4 through the pure interpreter: the six demo chips give exactly the acknowledgements of
// 10.2 step 2 and the closing line; the 4.3 free-text examples; the second miss; questions and greetings; the derived
// pending question. Then the whole flow end to end with the store's pure transitions (the local brain, no network).
import { describe, expect, it } from "vitest";

import { SA_PLACES, SA_REGIONS, SA_REGION_IDS, distanceKm, findSaPlace, getJob, nearestJobMarket } from "@/lib/data";
import { revealReasonText } from "@/lib/copy";
import { fitReasons, makeClock, rankByFit, recommend } from "@/lib/engine";
import { normalizeText } from "@/lib/text/normalize";
import { appendOnboardingMessages, applyOnboardingTurn, newUser, setTarget } from "@/lib/store/transitions";
import type { OnboardingContext, OnboardingInput, OnboardingTurn } from "@/lib/brain/protocol";
import type { OnboardingAnswers, UserState } from "@/lib/types";

import { onboardingContext, onboardingTurn, openingMessages, pendingQuestion, questionChips, resumeMessages } from "./index";

const clock = makeClock(new Date("2026-11-18T21:00:00"));

function ctx(answers: OnboardingAnswers = {}, name = "خالد", misses: OnboardingContext["misses"] = {}): OnboardingContext {
  return { name, answers, misses, pending: pendingQuestion(answers) };
}

function text(t: string): OnboardingInput {
  return { kind: "text", text: t };
}

/** Plays inputs one after another, carrying answers and misses, like the store would. */
function play(inputs: readonly OnboardingInput[], name = "خالد"): OnboardingTurn[] {
  let context = ctx({}, name);
  const turns: OnboardingTurn[] = [];
  for (const input of inputs) {
    const turn = onboardingTurn(context, input);
    turns.push(turn);
    context = { name, answers: turn.answers, misses: turn.misses, pending: turn.pending };
  }
  return turns;
}

// 21 Nov 2026 (owner: career shift): the priority is asked BEFORE the interest (the company step is no longer asked)
const DEMO_CHIPS: readonly OnboardingInput[] = [
  { kind: "chip", question: "city", option: "riyadh" },
  { kind: "chip", question: "education", option: "bachelor" },
  { kind: "chip", question: "major", option: "mis" },
  { kind: "chip", question: "experience", option: "none" },
  { kind: "chip", question: "priority", option: "first-job" },
  { kind: "chip", question: "interest", option: "data" },
];

describe("the opening and the six demo chips (spec 4.1, 10.2 steps 1-2)", () => {
  it("greets, says what comes, then asks question 1 in its own message", () => {
    expect(openingMessages("خالد")).toEqual([
      "هلا والله يا خالد، أنا دليلك إلى وظيفتك. بكون معك من أول خطوة لآخرها.",
      "بسألك ست أسئلة قصيرة، وعلى ضوئها أرسم لك مسار يناسبك أنت.",
      "نبدأ بالسهل: في أي مدينة أنت الحين؟",
    ]);
  });

  it("gives exactly the acknowledgements of 10.2 step 2, then the closing line", () => {
    const turns = play(DEMO_CHIPS);
    expect(turns.map((t) => t.replies[0])).toEqual([
      "تمام، الرياض. وفيه بعد فرص عن بُعد لو تبي.",
      "بكالوريوس، ممتاز. أساس زين نبني عليه.",
      "زين، نظم معلومات إدارية. فيه مهارات كثيرة تنحسب لك من الحين.",
      "ولا يهمك، كلنا بدينا من هنا. بختار لك وظائف تناسب البدايات.",
      "أول وظيفة، هدف واضح. بختار لك أقصر طريق لها.",
      "الأرقام والبيانات، اختيار حلو. اللي يقرا الأرقام ينسمع رأيه.",
    ]);
    expect(turns.map((t) => t.userText)).toEqual([
      "الرياض",
      "بكالوريوس",
      "نظم معلومات إدارية",
      "بدون خبرة بعد",
      "أول وظيفة بأسرع وقت",
      "الأرقام والبيانات",
    ]);
    // Each turn asks the next question with its chips; the last one closes.
    expect(turns[0]?.replies[1]).toBe("وش آخر شهادة دراسية أخذتها؟");
    expect(turns[0]?.chips?.question).toBe("education");
    expect(turns[3]?.replies[1]).toBe("وش أولويتك الحين؟");
    expect(turns[3]?.chips?.question).toBe("priority");
    expect(turns[4]?.replies[1]).toBe("وش نوع الشغل اللي يشدّك أكثر؟");
    expect(turns[4]?.chips?.question).toBe("interest");
    const last = turns[5];
    expect(last?.replies).toEqual([
      "الأرقام والبيانات، اختيار حلو. اللي يقرا الأرقام ينسمع رأيه.",
      "يعطيك العافية يا خالد، اكتملت الصورة. لحظات وأرسم لك مسارك.",
    ]);
    expect(last?.done).toBe(true);
    expect(last?.pending).toBeNull();
    expect(last?.chips).toBeNull();
    expect(last?.answers).toEqual({
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
      experience: "none",
      priority: "first-job",
      interest: ["data"],
    });
  });

  it("picks the general variant by (letters in the name + question number) mod 3", () => {
    // «سارة» has 4 letters like «خالد»; «علي» has 3: city (3 + 1) mod 3 = 1 → variant 2.
    expect(play([DEMO_CHIPS[0]!], "علي")[0]?.replies[0]).toBe("زين، الرياض. سجّلتها عشان أرتّب لك الوظائف القريبة منك.");
    expect(play([DEMO_CHIPS[0]!], "خالد العتيبي")[0]?.replies[0]).toBe("حلو، الرياض. بحط لك فرصها في المقدمة.");
  });

  it("uses the special acknowledgements (a city with no jobs, a student, another major)", () => {
    expect(play([{ kind: "chip", question: "city", option: "makkah" }])[0]?.replies[0]).toBe(
      "مكة المكرمة، يا حيّ أهلها! ترى الفرص القريبة منك قليلة في قائمتي، فبختار لك الأنسب من أقرب المدن والوظائف عن بُعد.",
    );
    const student = onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" } }), { kind: "chip", question: "education", option: "student" });
    expect(student.replies[0]).toBe("ما شاء الله، للحين تدرس؟ هذا أحسن وقت تبدأ فيه مسارك.");
    const other = onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" }, education: "bachelor" }), {
      kind: "chip",
      question: "major",
      option: "other",
    });
    expect(other.replies[0]).toBe("ولا يهمك، التخصص ما يحدّنا، وبعتمد أكثر على اللي تحبه.");
  });

  it("asks question 3 in its own words after «ثانوي»", () => {
    const turn = onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" } }), { kind: "chip", question: "education", option: "secondary" });
    expect(turn.replies[1]).toBe("طيب، وش أقرب مجال لك، دراسة أو تدريب؟");
    expect(turn.chips?.question).toBe("major");
  });

  it("does not send «مدينة أخرى» (it only focuses the composer)", () => {
    const turn = onboardingTurn(ctx(), { kind: "chip", question: "city", option: "other" });
    expect(turn.replies).toEqual([]);
    expect(turn.answers).toEqual({});
  });
});

describe("free text (spec 4.3)", () => {
  it("fills three questions from «أنا من جدة وتخصصي تسويق وما عندي خبرة» and confirms the extras", () => {
    const turn = onboardingTurn(ctx(), text("أنا من جدة وتخصصي تسويق وما عندي خبرة"));
    expect(turn.answers.city).toEqual({ value: "jeddah", label: "جدة" });
    expect(turn.answers.major).toEqual({ value: "marketing", label: "تسويق" });
    expect(turn.answers.experience).toBe("none");
    expect(turn.answers.education).toBeUndefined();
    expect(turn.replies[0]).toBe("تمام، جدة. وفيه بعد فرص عن بُعد لو تبي. وسجّلت بعد: تخصصك تسويق، وبدون خبرة بعد.");
    expect(turn.pending).toBe("education");
    expect(turn.replies[1]).toBe("وش آخر شهادة دراسية أخذتها؟");
  });

  it("does not fill experience from «بكالوريوس 2024»", () => {
    const turn = onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" } }), text("بكالوريوس 2024"));
    expect(turn.answers.education).toBe("bachelor");
    expect(turn.answers.experience).toBeUndefined();
    expect(turn.pending).toBe("major");
  });

  it("sets a greeting aside: «السلام عليكم، أنا من الرياض» carries on as «أنا من الرياض», and returns the salam", () => {
    const turn = onboardingTurn(ctx(), text("السلام عليكم، أنا من الرياض"));
    expect(turn.answers.city).toEqual({ value: "riyadh", label: "الرياض" });
    expect(turn.replies[0]).toBe("وعليكم السلام. تمام، الرياض. وفيه بعد فرص عن بُعد لو تبي.");
    const taif = onboardingTurn(ctx({}, "Sam"), text("السلام عليكم، أنا من الطائف"));
    expect(taif.answers.city).toEqual({ value: "jeddah", label: "الطائف" });
    expect(taif.replies[0]?.startsWith("وعليكم السلام. الطائف، حيّاك الله!")).toBe(true);
    expect(onboardingTurn(ctx(), text("هلا، أنا من جدة")).replies[0]?.startsWith("هلا والله. ")).toBe(true);
    expect(onboardingTurn(ctx(), text("أنا من الرياض")).replies[0]).toBe("تمام، الرياض. وفيه بعد فرص عن بُعد لو تبي.");
    expect(onboardingTurn(ctx(), text("مرحبا، كم باقي؟")).replies[0]).toBe("هلا والله. باقي 6 أسئلة بس.");
  });

  it("understands simple English for the interest question", () => {
    // 21 Nov 2026: the interest comes after the priority
    const at = ctx({
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
      experience: "none",
      priority: "first-job",
    });
    expect(onboardingTurn(at, text("I like data")).answers.interest).toEqual(["data"]);
    expect(onboardingTurn(at, text("programming and design")).answers.interest).toEqual(["software", "design"]);
    expect(onboardingTurn(at, text("working with people")).answers.interest).toEqual(["hr"]);
    expect(onboardingTurn(at, text("not sure")).answers.interest).toEqual(["unsure"]);
  });

  it("keeps the typed word for «الخبر», and records a city outside the three as its nearest job market", () => {
    expect(onboardingTurn(ctx(), text("أنا في الخبر")).answers.city).toEqual({ value: "dammam", label: "الخبر" });
    const abha = onboardingTurn(ctx(), text("أبها"));
    expect(abha.answers.city).toEqual({ value: "jeddah", label: "أبها" });
    expect(abha.replies[0]).toBe(
      "أبها، حيّاك الله! مقر إمارة منطقة عسير، وأقرب سوق وظائف كبير لك جدة (حوالي 500 كم بخط مستقيم). وفيه بعد وظائف عن بُعد تقدر تشتغلها من مكانك.",
    );
  });

  it("applies the tie rules: the earliest keyword wins («طالب ماجستير»), a specific major beats «إدارة»/«علوم», «هندسة برمجيات» is cs", () => {
    expect(onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" } }), text("طالب ماجستير")).answers.education).toBe("student");
    const base: OnboardingAnswers = { city: { value: "riyadh", label: "الرياض" }, education: "bachelor" };
    // 21 Nov 2026 (tester): the specific word decides — «إدارة مالية» is the finance major, CV lines name the real major
    expect(onboardingTurn(ctx(base), text("إدارة مالية")).answers.major?.value).toBe("finance");
    expect(onboardingTurn(ctx(base), text("بكالوريوس علوم الحاسب، جامعة الملك عبدالعزيز")).answers.major?.value).toBe("cs");
    expect(onboardingTurn(ctx(base), text("بكالوريوس إدارة الموارد البشرية، جامعة الملك سعود")).answers.major?.value).toBe("hr");
    expect(onboardingTurn(ctx(base), text("إدارة أعمال")).answers.major?.value).toBe("business");
    expect(onboardingTurn(ctx(base), text("هندسة برمجيات")).answers.major?.value).toBe("cs");
    expect(onboardingTurn(ctx(base), text("هندسة")).answers.major?.value).toBe("engineering");
    expect(onboardingTurn(ctx(base), text("ذكاء اصطناعي")).answers.major?.value).toBe("cs");
  });

  it("reads the dual «سنتين» as one to three years (21 Nov 2026, tester)", () => {
    const base: OnboardingAnswers = { city: { value: "riyadh", label: "الرياض" }, education: "bachelor", major: { value: "hr", label: "موارد بشرية" } };
    expect(onboardingTurn(ctx(base), text("عندي خبرة سنتين")).answers.experience).toBe("1to3");
  });

  it("reads experience in the order of 4.3", () => {
    const base: OnboardingAnswers = {
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
    };
    const exp = (t: string) => onboardingTurn(ctx(base), text(t)).answers.experience;
    expect(exp("أقل من سنة")).toBe("under1");
    expect(exp("6 أشهر")).toBe("under1");
    expect(exp("تدريب تعاوني")).toBe("under1");
    expect(exp("أكثر من 5 سنوات")).toBe("over3");
    expect(exp("ما عندي خبرة")).toBe("none");
    expect(exp("سنتين")).toBe("1to3");
    expect(exp("3")).toBe("1to3");
    expect(exp("7")).toBe("over3");
    expect(exp("0")).toBe("none");
  });

  it("fills interest and priority ahead of their turn only with a wish word, and keeps two interests", () => {
    const upToExperience: OnboardingAnswers = {
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
      experience: "none",
    };
    // 4.2: a second interest can only come from free text («أحب البيانات والتسويق»).
    expect(onboardingTurn(ctx(upToExperience), text("أحب البيانات والتسويق")).answers.interest).toEqual(["data", "marketing"]);
    const majorKnown: OnboardingAnswers = { major: { value: "mis", label: "نظم معلومات إدارية" } };
    const early = onboardingTurn(ctx(majorKnown), text("أنا من الرياض وأحب التصميم"));
    expect(early.answers.city?.value).toBe("riyadh");
    expect(early.answers.interest).toEqual(["design"]);
    const noWish = onboardingTurn(ctx(majorKnown), text("أنا من الرياض والتصميم"));
    expect(noWish.answers.interest).toBeUndefined();
  });

  it("takes the neutral value for «لا أعرف» on the pending question", () => {
    const turn = onboardingTurn(ctx(), text("لا أعرف"));
    expect(turn.answers.city).toEqual({ value: "none", label: "" });
    expect(turn.replies[0]).toBe("ولا يهمك، نخليها «غير محدّدة» ونكمل.");
    expect(turn.pending).toBe("education");
  });
});

describe("every other message (spec 4.5)", () => {
  it("answers greetings, thanks and the three special rows, then repeats the pending question", () => {
    const q1 = "في أي مدينة أنت الحين؟";
    expect(onboardingTurn(ctx(), text("السلام عليكم")).replies).toEqual(["وعليكم السلام، حيّاك الله.", q1]);
    expect(onboardingTurn(ctx(), text("هلا")).replies).toEqual(["هلا والله.", q1]);
    expect(onboardingTurn(ctx(), text("مرحبا")).replies).toEqual(["هلا والله.", q1]);
    expect(onboardingTurn(ctx(), text("شكراً")).replies).toEqual(["العفو.", q1]);
    expect(onboardingTurn(ctx(), text("يعطيك العافية")).replies).toEqual(["العفو.", q1]);
    expect(onboardingTurn(ctx(), text("من أنت؟")).replies[0]).toBe(
      "أنا دليلك إلى وظيفتك. أسألك الحين عشان أرسم مسارك، وبعدها أكون معك في كل خطوة.",
    );
    expect(onboardingTurn(ctx(), text("هل أنت ذكاء اصطناعي")).replies[0]).toBe(
      "أنا دليلك إلى وظيفتك. أسألك الحين عشان أرسم مسارك، وبعدها أكون معك في كل خطوة.",
    );
    expect(onboardingTurn(ctx(), text("لماذا تسأل؟")).replies[0]).toBe(
      "أسأل عشان أختار لك من 20 وظيفة اللي يناسب مدينتك وتخصصك وخبرتك واللي تحبه. وترى إجاباتك تنحفظ في متصفحك.",
    );
    expect(onboardingTurn(ctx(), text("ماذا ستفعل بإجاباتي")).replies[0]).toBe(
      "أسأل عشان أختار لك من 20 وظيفة اللي يناسب مدينتك وتخصصك وخبرتك واللي تحبه. وترى إجاباتك تنحفظ في متصفحك.",
    );
    expect(onboardingTurn(ctx({ city: { value: "riyadh", label: "الرياض" } }), text("كم سؤالاً بقي؟")).replies[0]).toBe("باقي 5 أسئلة بس.");
    const four: OnboardingAnswers = {
      city: { value: "riyadh", label: "الرياض" },
      education: "bachelor",
      major: { value: "mis", label: "نظم معلومات إدارية" },
      experience: "none",
    };
    expect(onboardingTurn(ctx(four), text("كم باقي؟")).replies[0]).toBe("باقي سؤالين بس.");
    expect(onboardingTurn(ctx({ ...four, priority: "first-job" }), text("كم باقي")).replies[0]).toBe("باقي سؤال واحد بس.");
    // «أتطوّر» / «أغيّر» add «وش مجال شغلك الحين؟» to what is left (21 Nov 2026)
    expect(onboardingTurn(ctx({ ...four, experience: "1to3", priority: "switch" }), text("كم باقي")).replies[0]).toBe("باقي سؤالين بس.");
    expect(onboardingTurn(ctx(), text("كم الراتب في جدة؟")).replies).toEqual(["سؤال في محله، ونرجع له بعد ما نرسم مسارك.", q1]);
  });

  it("asks again on the first miss, and on the second accepts city and major as typed", () => {
    // a place outside the kingdom (every Saudi one is known: see "every Saudi city and governorate" below)
    const first = onboardingTurn(ctx(), text("دبي"));
    expect(first.replies).toEqual(["سامحني، ما لقطتها زين. تقدر تختار من الخيارات تحت، أو تكتبها بطريقة ثانية.", "في أي مدينة أنت الحين؟"]);
    expect(first.unmapped).toEqual({ question: "city", text: "دبي" });
    expect(first.misses).toEqual({ city: 1 });
    expect(first.answers).toEqual({});

    const second = onboardingTurn(ctx({}, "خالد", first.misses), text("دبي"));
    expect(second.answers.city).toEqual({ value: "other", label: "دبي" });
    expect(second.replies[0]).toBe("دبي، يا حيّ أهلها! ترى الفرص القريبة منك قليلة في قائمتي، فبختار لك الأنسب من أقرب المدن والوظائف عن بُعد.");
    expect(second.pending).toBe("education");

    const majorBase: OnboardingAnswers = { city: { value: "riyadh", label: "الرياض" }, education: "bachelor" };
    const m1 = onboardingTurn(ctx(majorBase), text("تخصصي فلسفة"));
    expect(m1.answers.major).toBeUndefined();
    const m2 = onboardingTurn(ctx(majorBase, "خالد", m1.misses), text("تخصصي فلسفة"));
    expect(m2.answers.major).toEqual({ value: "other", label: "فلسفة" });
    expect(m2.replies[0]).toBe("ولا يهمك، التخصص ما يحدّنا، وبعتمد أكثر على اللي تحبه.");
  });

  it("takes the neutral value on the second miss of the other four questions; it never loops", () => {
    const base: OnboardingAnswers = { city: { value: "riyadh", label: "الرياض" } };
    const m1 = onboardingTurn(ctx(base), text("ممم"));
    const m2 = onboardingTurn(ctx(base, "خالد", m1.misses), text("ممم"));
    expect(m2.answers.education).toBe("unknown");
    expect(m2.replies[0]).toBe("ولا يهمك، نخليها «غير محدّد» ونكمل.");
    expect(m2.pending).toBe("major");
  });

  it("applies a model-classified answer like a chip", () => {
    const turn = onboardingTurn(ctx(), { kind: "classified", question: "city", options: ["jeddah"], text: "عروس البحر" });
    expect(turn.answers.city).toEqual({ value: "jeddah", label: "جدة" });
    expect(turn.userText).toBe("عروس البحر");
  });
});

describe("every Saudi city and governorate (20 Nov 2026: «شقراء» gets a real answer)", () => {
  const cityOf = (t: string) => onboardingTurn(ctx(), text(t));
  const tail = "وفيه بعد وظائف عن بُعد تقدر تشتغلها من مكانك.";

  it("knows the 13 regions, each with its seat and its governorates, all inside the kingdom", () => {
    expect(SA_REGIONS.map((r) => r.id)).toEqual([...SA_REGION_IDS]);
    expect(SA_REGION_IDS).toHaveLength(13);
    for (const region of SA_REGIONS) {
      expect(findSaPlace(region.seat)?.kind, region.seat).toBe("seat");
      expect(findSaPlace(region.seat)?.region, region.seat).toBe(region.id);
      expect(SA_PLACES.filter((p) => p.region === region.id && p.kind === "governorate").length, region.name).toBeGreaterThanOrEqual(3);
    }
    expect(SA_PLACES.filter((p) => p.kind === "seat")).toHaveLength(13);
    expect(SA_PLACES.filter((p) => p.kind === "governorate")).toHaveLength(141);
    expect(new Set(SA_PLACES.map((p) => p.name)).size).toBe(SA_PLACES.length);
    for (const place of SA_PLACES) {
      if (place.at === null) {
        expect(place.metroOf, place.name).toBeDefined();
        continue;
      }
      const [lat, lon] = place.at;
      expect(lat > 16 && lat < 32.2 && lon > 34.4 && lon < 55.7, place.name).toBe(true);
    }
    for (const name of ["شقراء", "الدوادمي", "المجمعة", "الزلفي", "عفيف", "وادي الدواسر", "بيشة"]) {
      expect(findSaPlace(name)?.kind, name).toBe("governorate");
    }
  });

  it("no two places share a spelling", () => {
    const seen = new Map<string, string>();
    for (const place of SA_PLACES) {
      for (const name of [place.name, ...(place.aliases ?? [])]) {
        const key = normalizeText(name).replace(/^ال/, "");
        expect(seen.get(key) ?? place.name, name).toBe(place.name);
        seen.set(key, place.name);
      }
    }
  });

  it("works the distance out from the coordinates (haversine, straight line)", () => {
    const at = (name: string) => findSaPlace(name)?.at ?? [0, 0];
    expect(Math.round(distanceKm(at("الرياض"), at("جدة")))).toBeGreaterThan(840);
    expect(Math.round(distanceKm(at("الرياض"), at("جدة")))).toBeLessThan(860);
    expect(distanceKm(at("شقراء"), at("شقراء"))).toBe(0);
    const shaqra = findSaPlace("شقراء");
    expect(shaqra && nearestJobMarket(shaqra)).toEqual({ market: "riyadh", km: 160 });
    const bisha = findSaPlace("بيشة");
    expect(bisha && nearestJobMarket(bisha).market).toBe("jeddah");
    const hofuf = findSaPlace("الهفوف");
    expect(hofuf && nearestJobMarket(hofuf).market).toBe("dammam");
  });

  it("says where the place is, its nearest big job market and how far, in Najdi", () => {
    expect(cityOf("شقراء").replies[0]).toBe(
      `شقراء، حيّاك الله! محافظة في منطقة الرياض، وأقرب سوق وظائف كبير لك الرياض (حوالي 160 كم بخط مستقيم). ${tail}`,
    );
    expect(cityOf("الدوادمي").replies[0]).toBe(
      `الدوادمي، حيّاك الله! محافظة في منطقة الرياض، وأقرب سوق وظائف كبير لك الرياض (حوالي 240 كم بخط مستقيم). ${tail}`,
    );
    expect(cityOf("بيشة").replies[0]).toBe(
      `بيشة، حيّاك الله! محافظة في منطقة عسير، وأقرب سوق وظائف كبير لك جدة (حوالي 390 كم بخط مستقيم). ${tail}`,
    );
    expect(cityOf("عفيف").replies[0]).toBe(
      `عفيف، حيّاك الله! محافظة في منطقة الرياض، وأقرب سوق وظائف كبير لك الرياض (حوالي 400 كم بخط مستقيم). ${tail}`,
    );
    expect(cityOf("الهفوف").replies[0]).toBe(
      `الهفوف، حيّاك الله! مدينة في المنطقة الشرقية، وأقرب سوق وظائف كبير لك الدمام (حوالي 130 كم بخط مستقيم). ${tail}`,
    );
    expect(cityOf("القصيم").replies[0]).toBe(
      `القصيم، حيّاك الله! مقر إمارتها بريدة، وأقرب سوق وظائف كبير لك الرياض (حوالي 330 كم من بريدة بخط مستقيم). ${tail}`,
    );
    expect(cityOf("البيضاء").replies[0]).toBe(
      `البيضاء، حيّاك الله! محافظة في المنطقة الشرقية، وهي ضمن حاضرة الدمام، يعني سوق الدمام عندك. ${tail}`,
    );
    // and the next question follows, as after any answer
    expect(cityOf("شقراء").replies[1]).toBe("وش آخر شهادة دراسية أخذتها؟");
    expect(cityOf("شقراء").pending).toBe("education");
  });

  it("accepts the common spellings: ة/ه, ء, ال, ى/ي, أ/إ/ا, ئ/ي and the other names", () => {
    const cases: readonly [string, string, string][] = [
      ["شقرا", "riyadh", "شقراء"],
      ["الشقراء", "riyadh", "شقراء"],
      ["أنا من شقراء", "riyadh", "شقراء"],
      ["ساكن في مدينة شقراء", "riyadh", "شقراء"],
      ["دوادمي", "riyadh", "الدوادمي"],
      ["الدوادمى", "riyadh", "الدوادمي"],
      ["المجمعه", "riyadh", "المجمعة"],
      ["مجمعة", "riyadh", "المجمعة"],
      ["زلفي", "riyadh", "الزلفي"],
      ["وادى الدواسر", "riyadh", "وادي الدواسر"],
      ["بيشه", "jeddah", "بيشة"],
      ["ابها", "jeddah", "أبها"],
      ["إبها", "jeddah", "أبها"],
      ["الاحساء", "dammam", "الأحساء"],
      ["الإحساء", "dammam", "الأحساء"],
      ["الداير", "jeddah", "الدائر"],
      ["صبياء", "jeddah", "صبيا"],
      ["جيزان", "jeddah", "جيزان"],
      ["محايل", "jeddah", "محايل"],
      ["بالمذنب", "riyadh", "المذنب"],
      ["حفر الباطن", "riyadh", "حفر الباطن"],
      ["الشرقية", "dammam", "الشرقية"],
    ];
    for (const [typed, value, label] of cases) {
      const turn = cityOf(typed);
      expect(turn.answers.city, typed).toEqual({ value, label });
      expect(turn.unmapped, typed).toBeNull();
      expect(turn.replies[0]?.includes("حيّاك الله!"), typed).toBe(true);
    }
  });

  it("never treats a real Saudi place as not understood", () => {
    for (const place of SA_PLACES) {
      for (const name of [place.name, ...(place.aliases ?? [])]) {
        const turn = cityOf(name);
        expect(turn.unmapped, name).toBeNull();
        expect(turn.answers.city?.value, name).not.toBe("other");
        expect(turn.answers.city?.value, name).not.toBe("none");
      }
    }
  });

  it("keeps the chip cities and their replies exactly as before", () => {
    expect(cityOf("الرياض").replies[0]).toBe("تمام، الرياض. وفيه بعد فرص عن بُعد لو تبي.");
    expect(cityOf("جدة").answers.city).toEqual({ value: "jeddah", label: "جدة" });
    expect(cityOf("الدمام").answers.city).toEqual({ value: "dammam", label: "الدمام" });
    expect(cityOf("مكة").answers.city).toEqual({ value: "makkah", label: "مكة المكرمة" });
    expect(cityOf("المدينة المنورة").answers.city).toEqual({ value: "madinah", label: "المدينة المنورة" });
    expect(cityOf("الظهران").answers.city).toEqual({ value: "dammam", label: "الظهران" });
    expect(cityOf("رياض الخبراء").answers.city).toEqual({ value: "riyadh", label: "رياض الخبراء" });
  });

  it("reads an everyday word that is also a place only as the place", () => {
    expect(cityOf("أبي دوام كامل في الرياض").answers.city).toEqual({ value: "riyadh", label: "الرياض" });
    expect(cityOf("الكامل").answers.city).toEqual({ value: "jeddah", label: "الكامل" });
    expect(cityOf("الجهة الشرقية من جدة").answers.city).toEqual({ value: "jeddah", label: "جدة" });
  });

  it("ranks the nearest market's jobs first and the remote ones right after (the 4.6 city term)", () => {
    const ranked = rankByFit(cityOf("شقراء").answers);
    expect(ranked.length).toBeGreaterThan(0);
    for (const fit of ranked) {
      const city = getJob(fit.jobId).city;
      expect(fit.terms.city, fit.jobId).toBe(city === "riyadh" ? 10 : city === "remote" ? 6 : 0);
    }
    const bisha = rankByFit(cityOf("بيشة").answers);
    for (const fit of bisha) {
      const city = getJob(fit.jobId).city;
      expect(fit.terms.city, fit.jobId).toBe(city === "jeddah" ? 10 : city === "remote" ? 6 : 0);
    }
  });

  it("says a job in the nearest market is near the place, not in it («قريبة منك: الرياض»; the city itself stays «في مدينتك»)", () => {
    // major and experience score nothing here, so the city is one of the (at most three) reasons
    const base: OnboardingAnswers = { education: "bachelor", major: { value: "other", label: "تخصص آخر" }, experience: "over3", interest: ["data"] };
    const shaqra = fitReasons("data-analyst-riyadh", { ...base, city: cityOf("شقراء").answers.city }).map(revealReasonText);
    expect(shaqra).toContain("قريبة منك: الرياض");
    expect(shaqra.join(" ")).not.toContain("شقراء");
    const riyadh = fitReasons("data-analyst-riyadh", { ...base, city: cityOf("الرياض").answers.city }).map(revealReasonText);
    expect(riyadh).toContain("في مدينتك: الرياض");
    expect(revealReasonText({ kind: "city", cityLabel: "الرياض", near: true })).toBe("قريبة منك: الرياض");
  });
});

describe("the pending question is derived (ARCHITECTURE 8.5)", () => {
  function user(answers: OnboardingAnswers, greeted: boolean): UserState {
    const fresh = newUser("خالد", clock);
    const withAnswers: UserState = { ...fresh, answers };
    return greeted ? appendOnboardingMessages(withAnswers, openingMessages("خالد"), clock) : withAnswers;
  }

  it("pendingQuestion: {} → city; city + major → education; all six → null", () => {
    expect(pendingQuestion({})).toBe("city");
    expect(pendingQuestion({ city: { value: "jeddah", label: "جدة" }, major: { value: "marketing", label: "تسويق" } })).toBe("education");
    expect(play(DEMO_CHIPS)[5]?.pending).toBeNull();
  });

  it("onboardingContext: empty thread → null; after the greeting → city", () => {
    expect(onboardingContext(user({}, false)).pending).toBeNull();
    expect(onboardingContext(user({}, true)).pending).toBe("city");
  });

  it("resumes by asking the pending question again, and gives its chips", () => {
    const context = onboardingContext(user({ city: { value: "riyadh", label: "الرياض" } }, true));
    expect(resumeMessages(context)).toEqual(["وش آخر شهادة دراسية أخذتها؟"]);
    expect(questionChips("education", {}).options.map((o) => o.id)).toEqual(["secondary", "diploma", "bachelor", "postgrad", "student"]);
  });
});

describe("the onboarding flow end to end through the local brain and the store's transitions", () => {
  it("greets, takes six answers, completes (+50), recommends the demo target, and sets it (+30)", () => {
    let state = appendOnboardingMessages(newUser("خالد", clock), openingMessages("خالد"), clock);
    expect(state.onboarding.thread.map((m) => m.text)).toEqual(openingMessages("خالد"));
    for (const input of DEMO_CHIPS) {
      const turn = onboardingTurn(onboardingContext(state), input);
      state = applyOnboardingTurn(state, turn, clock).user;
    }
    expect(state.onboardingCompletedAt).not.toBeNull();
    expect(state.onboarding.thread[state.onboarding.thread.length - 1]?.text).toBe(
      "يعطيك العافية يا خالد، اكتملت الصورة. لحظات وأرسم لك مسارك.",
    );
    expect(state.xpEvents.map((e) => [e.type, e.amount])).toEqual([["onboarding_completed", 50]]);
    expect(onboardingContext(state).pending).toBeNull();

    const recommendation = recommend(state.answers);
    expect(recommendation.recommended).toBe("data-analyst-riyadh");
    const target = setTarget(state, recommendation.recommended, clock);
    expect(target.user.targetJobId).toBe("data-analyst-riyadh");
    expect(target.consequence.xp.after).toBe(80);
  });

  it("handles a typed conversation with greetings, a question, a miss and multi-answers", () => {
    let state = appendOnboardingMessages(newUser("سارة", clock), openingMessages("سارة"), clock);
    const say = (t: string): OnboardingTurn => {
      const turn = onboardingTurn(onboardingContext(state), text(t));
      state = applyOnboardingTurn(state, turn, clock).user;
      return turn;
    };
    expect(say("السلام عليكم").replies[0]).toBe("وعليكم السلام، حيّاك الله.");
    expect(say("لماذا تسأل؟").replies[1]).toBe("في أي مدينة أنت الحين؟");
    say("أنا من الدمام وتخصصي محاسبة");
    expect(state.answers.city?.value).toBe("dammam");
    expect(state.answers.major?.value).toBe("finance");
    say("بكالوريوس");
    say("سنتين");
    // 21 Nov 2026: the priority before the interest; «أغيّر مجالي» asks the current career and suggests from it
    expect(say("أغيّر مجالي").replies[1]).toBe("وش مجال شغلك الحين؟");
    expect(say("أشتغل محاسبة").replies[1]).toMatch(/^من شغلك في المحاسبة، أقرب مجالات تنتقل لها: /);
    const last = say("التسويق والمحتوى");
    expect(last.done).toBe(true);
    expect(state.answers).toMatchObject({
      education: "bachelor",
      experience: "1to3",
      priority: "switch",
      current: { value: "business", label: "المحاسبة" },
      interest: ["marketing"],
    });
    expect(state.onboardingCompletedAt).not.toBeNull();
  });
});
