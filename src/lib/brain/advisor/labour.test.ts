// Owner: brain-advisor. Saudization, Nitaqat, the labour law, SANED and the entry routes answered from the data by the
// router (21 Nov 2026, QA in online mode: «التوطين في المحاسبة كم نسبته؟» got an invented 30%, «وش نسبة توطين مهن
// المبيعات؟» got «ما عندي معلومة», «كم مدة التجربة في عقد العمل؟» got «تسعين يوماً» and once a Persian «روز»); the
// stricter figure check and the dialect guard on model replies. Expected words are read from the data. Pure, no key.
import { describe, expect, it } from "vitest";

import { WAVE3_SAUDIZATION, WAVE3_TUWAIQ_BOOTCAMPS } from "@/lib/data/wave3/knowledge";
import { ENTRY_ROUTES } from "@/lib/data/careers";
import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorEvent, AdvisorRequest } from "@/lib/brain/protocol";
import type { Clock, UserFacts } from "@/lib/types";

import { finishModelReply } from "../server/turn";
import { AdvisorCtx } from "./context";
import { labourFiguresGrounded } from "./labour";
import { routeAdvisorMessage } from "./router";
import { dialectSlip } from "./rules";

const clock: Clock = makeClock(new Date("2026-11-18T21:00:00"));

function facts(): UserFacts {
  const state = buildSeed("cv-analysed", clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("seed without a user");
  return factsOf(user);
}

function request(text: string): AdvisorRequest {
  return {
    v: 1,
    message: { text },
    history: [],
    facts: facts(),
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false },
    thread: { jobsDisclosed: true, lastJobIds: [], lastCourseIds: [] },
  };
}

function route(text: string) {
  const decision = routeAdvisorMessage(request(text));
  const events = decision.kind === "router" ? decision.events : decision.local;
  return { decision, text: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join("\n\n") };
}

const decision = (id: string) => WAVE3_SAUDIZATION.decisions.find((d) => d.id === id)!;
const article = (id: string) => WAVE3_SAUDIZATION.labourLaw.find((a) => a.id === id)!;

describe("localisation (توطين) answered from the Ministry's decisions, on the router", () => {
  it("«التوطين في المحاسبة كم نسبته؟»: 40% from 27 Oct 2025, 5+ accountants, rising to 70%, with its source", () => {
    const d = decision("accounting-2025");
    const r = route("التوطين في المحاسبة كم نسبته؟");
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("labour");
    expect(r.text).toContain(d.botLine);
    expect(r.text).toContain("40%");
    expect(r.text).toContain("70%");
    expect(r.text).toContain("27 أكتوبر 2025");
    expect(r.text).toContain(d.sources[0].label);
    expect(r.text).not.toMatch(/(?<!\d)30%/);
  });

  it("«وش نسبة توطين مهن المبيعات؟»: 60% from 19 Apr 2026", () => {
    const r = route("وش نسبة توطين مهن المبيعات؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(decision("sales-2026").botLine);
    expect(r.text).toContain("60%");
    expect(r.text).toContain("19 أبريل 2026");
  });

  it.each([
    ["كم نسبة السعودة في التسويق؟", "marketing-2026"],
    ["توطين المشتريات كم؟", "procurement-2026"],
    ["وش نسبة توطين إدارة المشاريع؟", "project-management-2027"],
    ["كم نسبة توطين المهن الهندسية؟", "engineering-2026"],
  ])("«%s» → %s", (text, id) => {
    expect(route(text).text).toContain(decision(id).botLine);
  });

  it("a family named reads its decisions («توطين مهندس الموقع» → the engineering decisions)", () => {
    const text = route("وش نسبة توطين مهندس الموقع؟").text;
    expect(text).toContain(decision("engineering-2026").botLine);
  });

  it("a profession the data has no decision for: said honestly, no rate", () => {
    const r = route("كم نسبة توطين مهن التمريض؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain("ما عندي قرار توطين منشور");
    expect(r.text).not.toMatch(/\d+%/);
  });

  it("Nitaqat counting: a Saudi counts fully from 4,000 SAR", () => {
    const r = route("كيف ينحسب السعودي في نطاقات؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(WAVE3_SAUDIZATION.nitaqatBotLines[0]);
  });
});

describe("the labour law, by article", () => {
  it.each([
    ["كم مدة التجربة في عقد العمل؟", "probation", "180"],
    ["كم فترة التجربة؟", "probation", "180"],
    ["إذا بستقيل كم مدة الإشعار؟", "notice", "30"],
    ["كم أيام الإجازة السنوية؟", "annual-leave", "21"],
    ["كم ساعات الدوام في رمضان؟", "working-hours", "6"],
    ["كيف تنحسب مكافأة نهاية الخدمة؟", "end-of-service", "خمس"],
  ])("«%s» → %s", (text, id, figure) => {
    const a = article(id);
    const r = route(text);
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("labour");
    expect(r.text).toContain(a.botLine);
    expect(r.text).toContain(a.article.replace(/\s*\(.*\)\s*$/, ""));
    expect(r.text).toContain(figure);
    expect(r.text).toContain(a.source.label);
    expect(r.text).not.toMatch(/تسعين|روز/);
  });

  it("«تجربة المستخدم» is not the trial period", () => {
    expect(route("وش هي تجربة المستخدم؟").decision.intent).not.toBe("labour");
  });

  it("«وش هو ساند؟»: SANED from GOSI", () => {
    const r = route("وش هو ساند؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(WAVE3_SAUDIZATION.saned.name);
    expect(r.text).toContain("9,000");
    expect(r.text).toContain(WAVE3_SAUDIZATION.saned.source.label);
  });
});

describe("entry routes and the open Tuwaiq bootcamps", () => {
  it.each([
    ["وش هو تمهير؟", "tamheer"],
    ["وش هو دعم التوظيف؟", "hrdf-wage-support"],
    ["وش برنامج دروب؟", "doroob"],
  ])("«%s» → the %s route's own line, on the router", (text, id) => {
    const r = route(text);
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(ENTRY_ROUTES.find((x) => x.id === id)!.line);
  });

  it("«وش هو تمهير؟» also gives the monthly stipend HRDF's guide states (3,000 SAR)", () => {
    const text = route("وش هو تمهير؟").text;
    expect(text).toContain("3,000 ريال شهرياً");
    expect(text).toContain("صندوق تنمية الموارد البشرية");
  });

  it("«وش معسكرات طويق المفتوحة؟»: bootcamps open for registration, from the data", () => {
    const r = route("وش معسكرات طويق المفتوحة؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(WAVE3_TUWAIQ_BOOTCAMPS[0]!.name);
  });

  it("an apply request naming a Tamheer job stays an apply", () => {
    expect(route("قدّم لي على وظيفة محلل مالي (برنامج تمهير)").decision.intent).toBe("apply");
  });
});

describe("model replies on these topics", () => {
  const local: AdvisorEvent[] = [{ type: "text", text: "LOCAL" }];

  it("a rate the decision does not have fails, even when the number is elsewhere in the data", () => {
    expect(labourFiguresGrounded("التوطين في المهن المحاسبية نسبته 30%.", "التوطين في المحاسبة كم نسبته؟")).toBe(false);
    expect(labourFiguresGrounded("المهن المحاسبية توطينها 40% وتوصل 70%.", "التوطين في المحاسبة كم نسبته؟")).toBe(true);
    const ctx = AdvisorCtx.of(request("التوطين في المحاسبة كم نسبته؟"));
    expect(finishModelReply(ctx, "التوطين في المحاسبة كم نسبته؟", "التوطين في المهن المحاسبية نسبته 30%.", [], local)).toEqual(local);
  });

  it("a day count the article does not have fails («تسعين يوماً», «90 يوم» for probation)", () => {
    expect(labourFiguresGrounded("فترة التجربة لا تزيد على تسعين يوماً.", "كم مدة التجربة؟")).toBe(false);
    expect(labourFiguresGrounded("فترة التجربة ما تزيد عن 90 يوم.", "كم فترة التجربة؟")).toBe(false);
    expect(labourFiguresGrounded("فترة التجربة ما تزيد عن 180 يوم.", "كم فترة التجربة؟")).toBe(true);
  });

  it("other topics are not touched by the labour check", () => {
    expect(labourFiguresGrounded("مطابقتك 30% مع محلل بيانات.", "كم مطابقتي؟")).toBe(true);
  });

  it("a Persian or Urdu slip, or a banned Fusha word, is replaced", () => {
    expect(dialectSlip("فترة التجربة 180 روز.")).toBe(true);
    expect(dialectSlip("ساعات العمل است ثمانية.")).toBe(true);
    expect(dialectSlip("يہ اچھا ہے")).toBe(true);
    expect(dialectSlip("سوف أساعدك في مسارك.")).toBe(true);
    expect(dialectSlip("أبشر، خطوتك الجاية Power BI.")).toBe(false);
    const ctx = AdvisorCtx.of(request("كم مدة التجربة؟"));
    expect(finishModelReply(ctx, "وش أسوي الحين؟", "خطوتك الجاية روز Power BI.", [], local)).toEqual(local);
  });
});

describe("SANED in Najdi keeps the data's figures (tester, 21 Nov 2026)", () => {
  it("every figure of the Najdi lines is one of the GOSI facts", async () => {
    const { SANED_LINES } = await import("./labour");
    const { WAVE3_SAUDIZATION } = await import("@/lib/data/wave3/knowledge");
    const facts = WAVE3_SAUDIZATION.saned.facts.join(" ");
    for (const line of SANED_LINES) for (const n of line.match(/\d[\d,]*/g) ?? []) expect(facts, n).toContain(n);
    expect(SANED_LINES.join(" ")).not.toMatch(/يجب|يُصرف|وألا/);
  });
});
