// Owner: brain-advisor. «دليلك» knows the career families (20 Nov 2026): «وش يسوي مدير المنتج؟», «كيف أصير مهندس
// سحابة؟», certificates, the pay with its source, interview questions, the first 30 days and the entry routes, answered
// from src/lib/data/expansion/knowledge.ts (expected words are read from that data, never restated); «كيف أصير أحسن؟» is
// not a career question, and the existing intents keep their rows. Plus the model's side: the CAREERS index, the
// get_career tool, and rule 8 accepting a pay figure only from get_career. Pure modules, persona facts, no key.
import { describe, expect, it } from "vitest";

import { getCareerFamily, type CareerFamilyId } from "@/lib/data/expansion/knowledge";
import { makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorRequest, ProtocolMessage } from "@/lib/brain/protocol";
import type { Clock, UserFacts } from "@/lib/types";

import { TOOL_DECLARATIONS, buildSystemPrompt } from "../server/model-common";
import { finishModelReply } from "../server/turn";
import { payLine, runCareerTool } from "./careers";
import { AdvisorCtx } from "./context";
import { routeAdvisorMessage } from "./router";
import { numbersAreGrounded } from "./rules";
import { T } from "./templates";

const clock: Clock = makeClock(new Date("2026-11-18T21:00:00"));

function facts(): UserFacts {
  const state = buildSeed("cv-analysed", clock);
  const user = state.currentUserId ? state.users[state.currentUserId] : undefined;
  if (!user) throw new Error("seed without a user");
  return factsOf(user);
}

function request(text: string, history: readonly ProtocolMessage[] = []): AdvisorRequest {
  return {
    v: 1,
    message: { text },
    history,
    facts: facts(),
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false },
    thread: { jobsDisclosed: true, lastJobIds: [], lastCourseIds: [] },
  };
}

function route(text: string, history: readonly ProtocolMessage[] = []) {
  const decision = routeAdvisorMessage(request(text, history));
  const events = decision.kind === "router" ? decision.events : decision.local;
  return {
    decision,
    text: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join("\n\n"),
    actions: events.flatMap((e) => (e.type === "action" ? [e.action] : [])),
    chips: events.flatMap((e) => (e.type === "chips" ? e.chips : [])),
  };
}

const family = (id: CareerFamilyId) => getCareerFamily(id);
const shortCert = (name: string): string => name.replace(/\s*\([^)]*\)/g, "").trim();

describe("a career family named: what the job is", () => {
  it.each([
    ["وش يسوي مدير المنتج؟", "product"],
    ["برودكت مانجر وش يسوي؟", "product"],
    ["what does a product manager do?", "product"],
    ["وش شغل محلل الأمن السيبراني؟", "cyber"],
    ["وش هو السايبر؟", "cyber"],
    ["وش يسوي مهندس الكلاود؟", "cloud-devops"],
    ["وش شغل المبيعات؟", "sales-cs"],
    ["وش يعني سلاسل الإمداد؟", "supply-procurement"],
    ["وش يسوي مهندس الذكاء الاصطناعي؟", "ai-ml"],
  ] as const)("«%s» → %s's own line (the local brain; a model may answer first online)", (text, id) => {
    const r = route(text);
    expect(r.decision.kind).toBe("open");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain(family(id).botLines[0]);
    expect(r.actions).toEqual([]);
  });

  it("ends with one next step: its jobs in the app (an offer with yes / no chips)", () => {
    const r = route("وش يسوي مدير المنتج؟");
    expect(r.text.endsWith("؟")).toBe(true);
    expect(r.chips.map((c) => c.role)).toEqual(["yes", "no"]);
    expect(r.chips[0]?.payload.intent).toBe("open");
  });

  it("«تمام» after that offer opens it (the offer is rebuilt from the previous question)", () => {
    const first = route("وش يسوي مدير المنتج؟");
    const r = route("تمام", [
      { role: "user", text: "وش يسوي مدير المنتج؟" },
      { role: "daleel", text: first.text },
    ]);
    expect(r.actions[0]?.type).toBe("navigate");
  });

  it("two families named: one line each", () => {
    const r = route("وش الفرق بين محلل البيانات وعالم البيانات؟");
    expect(r.text).toContain(family("data-analyst-bi").botLines[0]);
    expect(r.text).toContain(family("data-science").botLines[0]);
  });
});

describe("the specific parts asked", () => {
  it("«كيف أصير مهندس سحابة؟»: the path line of cloud / DevOps", () => {
    const r = route("كيف أصير مهندس سحابة؟");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain(family("cloud-devops").botLines[1]);
  });

  it("«وش الشهادات اللي تفيدني في الأمن السيبراني؟»: its certificates from the data", () => {
    const r = route("وش الشهادات اللي تفيدني في الأمن السيبراني؟");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain(shortCert(family("cyber").certificates[0]!.name));
  });

  it("«كم راتب محلل البيانات؟»: the published figure with its source and year, always on the router", () => {
    const f = family("data-analyst-bi");
    const r = route("كم راتب محلل البيانات؟");
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain("حسب دليل Hays للرواتب في السعودية 2026");
    expect(r.text).toContain(f.salary!.minSAR.toLocaleString("en-US"));
    expect(r.text).toContain(f.salary!.maxSAR.toLocaleString("en-US"));
    // rule 8: grounded by the get_career result, and only by it
    expect(numbersAreGrounded(payLine(f)!, [runCareerTool({ family_id: f.id })], facts())).toBe(true);
    expect(numbersAreGrounded(payLine(f)!, [], facts())).toBe(false);
  });

  it("a family without a published figure says so, with no number", () => {
    expect(family("ux-research").salary).toBeNull();
    const r = route("كم راتب باحث تجربة المستخدم؟");
    expect(r.text).toContain("ما لقيت رقم منشور");
    expect(r.text).not.toMatch(/\d/);
  });

  it("«وش يسألون في مقابلة مدير المنتج؟»: its interview questions, labelled as written by «دليل»", () => {
    const r = route("وش يسألون في مقابلة مدير المنتج؟");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain(family("product").interviewQuestions[0]!);
    expect(r.text).toContain("مو من شركة معيّنة");
  });

  it("«وش أسوي أول شهر؟»: the 30-day plan of the target's family (محلل بيانات → data / BI)", () => {
    const r = route("وش أسوي أول شهر؟");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain(family("data-analyst-bi").first30Days[0]!);
  });

  it("«وش هو تمهير؟»: the route's own line", () => {
    const r = route("وش هو تمهير؟");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain("تمهير");
  });
});

describe("what stays as it was", () => {
  it("«كيف أصير أحسن؟» names no career family: not a career answer", () => {
    expect(route("كيف أصير أحسن؟").decision.intent).not.toBe("career");
  });

  it("«ليش ذا المسار؟» is still the fixed answer", () => {
    expect(route("ليش ذا المسار؟").decision.intent).toBe("fixed-answer");
  });

  it("«عطني نصيحة للمقابلة» is still the interview tips", () => {
    const r = route("عطني نصيحة للمقابلة");
    expect(r.decision.intent).toBe("interview");
    expect(r.text).toBe(T.interviewTips(AdvisorCtx.of(request("عطني نصيحة للمقابلة")).targetTitle ?? null));
  });

  it("pay with no family named is still «no market numbers»", () => {
    const r = route("كم الرواتب في سوق العمل؟");
    expect(r.decision.intent).toBe("real-numbers");
  });

  it("«وين أتعلم SQL؟» is still the guide", () => {
    expect(route("وين أتعلم SQL؟").decision.intent).toBe("guide");
  });
});

describe("the model's side", () => {
  it("the system prompt carries one CAREERS line per family, and get_career is declared", () => {
    const prompt = buildSystemPrompt(AdvisorCtx.of(request("مرحبا")));
    expect(prompt).toContain("CAREERS");
    expect(prompt).toContain("get_career");
    for (const id of ["product", "cyber", "cloud-devops", "data-analyst-bi"] as const) expect(prompt).toContain(`${id} «${family(id).title}»`);
    expect(TOOL_DECLARATIONS.map((t) => t.name)).toContain("get_career");
  });

  it("get_career returns the family's knowledge and pay; an unknown id is a tool error", () => {
    const result = runCareerTool({ family_id: "product" });
    expect("knowledge" in result && result.knowledge).toContain("CAREER product");
    expect("pay" in result && result.pay).toContain("ريال");
    expect(runCareerTool({ family_id: "astronaut" })).toMatchObject({ error: "unknown_id" });
  });

  it("a model reply with the pay figure passes rule 8 only after get_career", () => {
    const f = family("product");
    const ctx = AdvisorCtx.of(request("كم راتب مدير المنتج؟"));
    const said = payLine(f)!;
    const local = [{ type: "text", text: "LOCAL" } as const];
    const withTool = finishModelReply(ctx, "كم راتب مدير المنتج؟", said, [], local, [runCareerTool({ family_id: f.id })]);
    expect(withTool).toEqual([{ type: "text", text: said }]);
    const without = finishModelReply(ctx, "كم راتب مدير المنتج؟", said, [], local);
    expect(without).toEqual(local);
  });
});
