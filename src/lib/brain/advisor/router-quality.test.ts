// Owner: brain-advisor. The chatbot-quality fixes of 21 Nov 2026 (tester's live run, online mode): career answers that must
// come from the data (certificates, interview questions, how to become one) answered by the router before a job search
// or a model; every one of the 34 career families reachable by its common Arabic / English titles; a salary that is the
// nearest published role or not the asked company's said so; apply requests that name a job or a company always beating
// the page's job (and never applying silently); «أبي كورس Power BI بالعربي» naming the guide's Arabic course; and the
// model-reply guards (no internal id, no certificate / company outside the data, no fact about the user the snapshot does
// not hold). Expected words are read from the data, never restated. Pure modules, persona facts, no key.
import { describe, expect, it } from "vitest";

import { SKILLS, getGuide } from "@/lib/data";
import { CAREER_FAMILIES, CAREER_FAMILY_IDS, getCareerFamily, type CareerFamilyId } from "@/lib/data/careers";
import { jobsAtCompany, makeClock } from "@/lib/engine";
import { buildSeed } from "@/lib/store/seeds";
import { factsOf } from "@/lib/store/snapshot";
import type { AdvisorEvent, AdvisorRequest, PageContext } from "@/lib/brain/protocol";
import type { Clock, JobId, SeedName, UserFacts } from "@/lib/types";

import { finishModelReply, scrubEvents } from "../server/turn";
import { familiesNamed, payLine } from "./careers";
import { AdvisorCtx } from "./context";
import { routeAdvisorMessage } from "./router";
import { namesAreGrounded, scrubIds, userFactsGrounded } from "./rules";
import * as W from "./words";

const clock: Clock = makeClock(new Date("2026-11-18T21:00:00"));

function persona(seed: Exclude<SeedName, "fresh"> = "cv-analysed"): UserFacts {
  const state = buildSeed(seed, clock);
  const id = state.currentUserId;
  const user = id ? state.users[id] : undefined;
  if (!user) throw new Error("seed without a user");
  return factsOf(user);
}

function request(text: string, page: Partial<PageContext> = {}, facts: UserFacts = persona()): AdvisorRequest {
  return {
    v: 1,
    message: { text },
    history: [],
    facts,
    clock,
    page: { route: "path", applySheetOpen: false, showRunning: false, ...page },
    thread: { jobsDisclosed: true, lastJobIds: [], lastCourseIds: [] },
  };
}

function view(events: readonly AdvisorEvent[]) {
  return {
    text: events.flatMap((e) => (e.type === "text" ? [e.text] : [])).join("\n\n"),
    tools: events.flatMap((e) => (e.type === "status" && e.tool ? [e.tool] : [])),
    actions: events.flatMap((e) => (e.type === "action" ? [e.action] : [])),
    cards: events.flatMap((e) => (e.type === "card" ? [e.card] : [])),
    chips: events.flatMap((e) => (e.type === "chips" ? e.chips : [])),
  };
}

function route(text: string, page: Partial<PageContext> = {}, facts: UserFacts = persona()) {
  const decision = routeAdvisorMessage(request(text, page, facts));
  return { decision, ...view(decision.kind === "router" ? decision.events : decision.local) };
}

const PRACTICE_PAGE: Partial<PageContext> = { route: "job", jobId: "data-analyst-riyadh" };
const family = (id: CareerFamilyId) => getCareerFamily(id);
const shortCert = (name: string): string => name.replace(/\s*\([^)]*\)/g, "").trim();

/** The one job an apply reply is about: the apply action's, else the «قدّم ولو كذا» chip's, else null. */
function appliedJob(r: ReturnType<typeof route>): JobId | null {
  for (const a of r.actions) if (a.type === "apply") return a.jobId;
  for (const c of r.chips) if (c.payload.intent === "apply" && c.role === "yes") return c.payload.jobId;
  return null;
}

// ── Apply: a job or company named beats the page's job ─────────────────────────────────────────────────────────────

describe("apply requests that name a job or a company (never the page's job, never silently)", () => {
  const FRONTEND: JobId = "lucidya-frontend-engineer-dammam";

  it.each([
    ["قدّم عني على وظيفة مهندس برمجيات واجهات أمامية في لوسيديا", PRACTICE_PAGE],
    ["قدّم عني على وظيفة مهندس برمجيات واجهات أمامية في لوسيديا", {}],
    ["قدم لي على مهندس الواجهات الأمامية في لوسيديا", PRACTICE_PAGE],
    ["قدم لي على مهندس الواجهات الأمامية في لوسيديا", {}],
    ["قدّم على وظيفة مهندس برمجيات واجهات أمامية (للسعوديين فقط)", PRACTICE_PAGE],
  ] as const)("«%s» (page %o) runs the honest apply flow for the Lucidya front-end job", (text, page) => {
    const r = route(text, page);
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("apply");
    expect(r.tools).toEqual(["apply_to_job"]);
    expect(appliedJob(r)).toBe(FRONTEND);
    expect(r.text).not.toContain("من قبل");
    expect(r.text).not.toContain("DL-2026-0001");
  });

  it("«قدم عني على وظيفة في نيوم» on the practice job's page: no job of NEOM here, its careers page, nothing applied", () => {
    expect(jobsAtCompany("neom")).toEqual([]);
    const r = route("قدم عني على وظيفة في نيوم", PRACTICE_PAGE, persona("job-ready"));
    expect(r.decision.kind).toBe("router");
    expect(r.actions).toEqual([]);
    expect(r.text).toContain("ما عندي الحين وظيفة من نيوم");
    expect(r.text).toContain("https://www.neom.com/en-us/be-part-of-neom/work-at-neom");
    expect(r.text).not.toContain("محلل بيانات");
    expect(r.cards.every((c) => c.kind === "job" && c.chip === undefined)).toBe(true);
    expect(r.chips.some((c) => c.payload.intent === "apply")).toBe(false);
  });

  it("a company named with no title: its jobs to choose from, each with «قدّم على ذي»; nothing applied", () => {
    const r = route("قدم لي على وظيفة في لوسيديا", PRACTICE_PAGE);
    expect(r.actions).toEqual([]);
    expect(r.text).toContain("لوسيديا");
    const lucidya = jobsAtCompany("lucidya");
    expect(r.cards.length).toBeGreaterThan(1);
    expect(r.cards.every((c) => c.kind === "job" && lucidya.includes(c.jobId) && c.chip?.label === "قدّم على ذي")).toBe(true);
  });

  it("several jobs with the title named (three «مهندس ذكاء اصطناعي»): ask which, with those three; nothing applied", () => {
    const r = route("قدم لي على مهندس ذكاء اصطناعي", PRACTICE_PAGE);
    expect(r.actions).toEqual([]);
    expect(r.cards.map((c) => (c.kind === "job" ? c.jobId : "")).sort()).toEqual(
      ["foodics-ai-engineer-riyadh", "lamdax-ai-engineer-remote", "mozn-ai-engineer-riyadh"].sort(),
    );
  });

  it("the title and the company together pick the one job («مهندس ذكاء اصطناعي في مزن»)", () => {
    expect(appliedJob(route("قدم لي على وظيفة مهندس ذكاء اصطناعي في مزن", PRACTICE_PAGE))).toBe("mozn-ai-engineer-riyadh");
  });

  it("a title the app does not have, on a job page, is searched: the page's job is not applied to", () => {
    const r = route("قدم لي على وظيفة مهندس بترول", PRACTICE_PAGE, persona("job-ready"));
    expect(r.actions).toEqual([]);
    expect(r.tools).toEqual(["search_jobs"]);
  });

  it("an employer the app does not know, on a job page, is searched and found nowhere: nothing applied", () => {
    const r = route("قدم عني على وظيفة في جوجل", PRACTICE_PAGE, persona("job-ready"));
    expect(r.actions).toEqual([]);
    expect(r.text.startsWith("ما لقيت وظائف بذي المواصفات.")).toBe(true);
  });

  it("only a bare «قدّم عني» means the page's job: the practice job, DL-2026-0001, +40 XP", () => {
    const r = route("قدّم عني", PRACTICE_PAGE, persona("job-ready"));
    expect(r.actions).toHaveLength(1);
    const action = r.actions[0]!;
    expect(action.type === "apply" && action.jobId).toBe("data-analyst-riyadh");
    expect(action.type === "apply" && action.expect).toMatchObject({ number: "DL-2026-0001", xp: 40 });
    expect(route("قدّم على ذي الوظيفة", PRACTICE_PAGE, persona("job-ready")).actions[0]).toMatchObject({ jobId: "data-analyst-riyadh" });
  });
});

// ── Career answers from the data ───────────────────────────────────────────────────────────────────────────────────

describe("career answers that must come from the data are the router's", () => {
  it("«وش الشهادات للأمن السيبراني؟»: the cyber family's certificates, on the router, nothing else", () => {
    const r = route("وش الشهادات للأمن السيبراني؟");
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("career");
    for (const c of family("cyber").certificates.slice(0, 3)) expect(r.text).toContain(shortCert(c.name));
    expect(r.text).not.toMatch(/CEH|CISSP/);
  });

  it("«وش أسئلة المقابلة لوظيفة أخصائي موارد بشرية؟»: the HR family's interview questions, not a job list", () => {
    const r = route("وش أسئلة المقابلة لوظيفة أخصائي موارد بشرية؟");
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("career");
    expect(r.text).toContain(family("hr-recruitment").interviewQuestions[0]!);
    expect(r.cards).toEqual([]);
  });

  it("«كيف أصير مصمم تعليمي؟»: the learning-design path line and its first guide offered", () => {
    const f = family("learning-design");
    const r = route("كيف أصير مصمم تعليمي؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(f.botLines[1]!);
    expect(r.text).toMatch(/دليل .+\. تبيني أفتحه لك؟$/);
    expect(r.chips[0]?.payload).toMatchObject({ intent: "open", to: { screen: "course" } });
  });

  it("«وش يسوي مهندس الموقع؟» (a description) may still be phrased by a model online, from the local answer offline", () => {
    const r = route("وش يسوي مهندس الموقع؟");
    expect(r.decision.kind).toBe("open");
    expect(r.text).toContain(family("civil-site-engineer").botLines[0]!);
  });
});

/** Each family by a common Arabic title and a common English one. */
const TITLES: Readonly<Record<CareerFamilyId, readonly [string, string]>> = {
  "data-analyst-bi": ["محلل بيانات", "data analyst"],
  "data-science": ["عالم بيانات", "data scientist"],
  "frontend-web": ["مطور واجهات أمامية", "frontend developer"],
  backend: ["مطور باك اند", "backend developer"],
  qa: ["مختبر برمجيات", "software tester"],
  "ui-ux-product-design": ["مصمم تجربة المستخدم", "ux designer"],
  "ux-research": ["باحث تجربة المستخدم", "ux researcher"],
  "digital-marketing": ["أخصائي تسويق رقمي", "digital marketing specialist"],
  "business-pm-finance": ["محلل أعمال", "business analyst"],
  "hr-recruitment": ["أخصائي موارد بشرية", "hr specialist"],
  product: ["مدير منتج", "product manager"],
  cyber: ["محلل أمن سيبراني", "cybersecurity analyst"],
  "cloud-devops": ["مهندس سحابة", "devops engineer"],
  "ai-ml": ["مهندس ذكاء اصطناعي", "machine learning engineer"],
  "sales-cs": ["مندوب مبيعات", "sales representative"],
  "supply-procurement": ["أخصائي مشتريات", "procurement specialist"],
  "civil-site-engineer": ["مهندس موقع", "site engineer"],
  "mep-engineer": ["مهندس ميكانيكا", "mep engineer"],
  "qa-qc-engineer": ["مهندس جودة", "quality engineer"],
  "hse-officer": ["أخصائي سلامة", "safety officer"],
  "planning-engineer": ["مهندس تخطيط", "planning engineer"],
  "quantity-surveyor": ["حاسب كميات", "quantity surveyor"],
  "guest-experience": ["موظف استقبال", "guest relations"],
  events: ["منسق فعاليات", "event coordinator"],
  "medical-coding-rcm": ["مرمز طبي", "medical coder"],
  "learning-design": ["مصمم تعليمي", "instructional designer"],
  "cx-quality": ["أخصائي خدمة العملاء", "customer service"],
  "credit-risk": ["محلل ائتمان", "credit analyst"],
  "compliance-aml": ["مسؤول التزام", "compliance officer"],
  audit: ["مراجع داخلي", "internal auditor"],
  "legal-paralegal-contracts": ["محامي", "lawyer"],
  "video-editor-motion": ["مونتير", "video editor"],
  "translator-ar-en": ["مترجم", "translator"],
  "game-qa-design-esports": ["مصمم ألعاب", "game designer"],
  // wave 3 (src/lib/data/wave3/knowledge.ts)
  "esg-sustainability": ["محلل استدامة", "sustainability analyst"],
  "real-estate-fm": ["مدير أملاك", "property manager"],
  insurance: ["مكتتب تأمين", "underwriter"],
  "mobile-dev": ["مطور تطبيقات جوال", "mobile developer"],
  "telecom-network": ["مهندس شبكات", "network engineer"],
  "aviation-ops": ["مراقب عمليات جوية", "flight dispatcher"],
  "pr-communications": ["أخصائي علاقات عامة", "pr specialist"],
};

describe("every career family is reachable by its common titles (table-driven over all 41)", () => {
  it("the table covers every family of the data", () => {
    expect(Object.keys(TITLES).sort()).toEqual([...CAREER_FAMILY_IDS].sort());
    expect(CAREER_FAMILIES).toHaveLength(41);
  });

  const rows = CAREER_FAMILY_IDS.flatMap((id) => TITLES[id].map((title) => [id, title] as const));

  it.each(rows)("%s · «%s» is read as that family", (id, title) => {
    expect(familiesNamed(W.textOf(`وش يسوي ${title}؟`))[0]).toBe(id);
  });

  it.each(rows)("%s · «%s»: what it is, how to become one, and its pay", (id, title) => {
    const f = family(id);
    const what = route(`وش يسوي ${title}؟`);
    expect(what.decision.intent).toBe("career");
    expect(what.text).toContain(f.botLines[0]!);

    const how = route(/[a-z]/.test(title) ? `how do I become a ${title}?` : `كيف أصير ${title}؟`);
    expect(how.decision.kind).toBe("router");
    expect(how.decision.intent).toBe("career");
    expect(how.text).toContain(f.botLines[1]!);

    const pay = route(/[a-z]/.test(title) ? `what is the salary of a ${title}?` : `كم راتب ${title}؟`);
    expect(pay.decision.kind).toBe("router");
    expect(pay.decision.intent).toBe("career");
    if (f.salary) expect(pay.text).toContain(payLine(f)!);
    else expect(pay.text).toContain("ما لقيت رقم منشور");
  });

  it.each(CAREER_FAMILY_IDS.map((id) => [id, TITLES[id][0]] as const))(
    "%s · «%s»: certificates, interview questions and the 30-day plan from the data, on the router",
    (id, title) => {
      const f = family(id);
      const certs = route(`وش الشهادات المطلوبة لـ${title}؟`);
      expect(certs.decision.kind).toBe("router");
      if (f.certificates.length > 0) expect(certs.text).toContain(shortCert(f.certificates[0]!.name));
      else expect(certs.text).toContain("ما عندي شهادات موثّقة");

      const interview = route(`وش أسئلة المقابلة لوظيفة ${title}؟`);
      expect(interview.decision.kind).toBe("router");
      expect(interview.text).toContain(f.interviewQuestions[0]!);

      const plan = route(`وش خطة أول 30 يوم لـ${title}؟`);
      expect(plan.decision.kind).toBe("router");
      expect(plan.text).toContain(f.first30Days[0]!);
    },
  );
});

// ── Salary: the published role, and never a company's figure ───────────────────────────────────────────────────────

describe("a published pay figure says which role it is for and that it is not a company's", () => {
  it("«كم راتب أخصائي التسويق في سلة؟»: the nearest published role, and not Salla's figure", () => {
    const f = family("digital-marketing");
    const r = route("كم راتب أخصائي التسويق في سلة؟");
    expect(r.decision.kind).toBe("router");
    expect(r.text).toContain(payLine(f)!);
    expect(r.text).toContain(`لمسمّى ${f.salary!.role} بالذات`);
    expect(r.text).toContain("أقرب مسمّى منشور");
    expect(r.text).toContain("مو راتب سلة");
  });

  it("«كم راتب مهندس الموقع؟»: the Construction Manager row is said to be a more senior, nearest published role", () => {
    const f = family("civil-site-engineer");
    const r = route("كم راتب مهندس الموقع؟");
    expect(r.text).toContain(payLine(f)!);
    expect(r.text).toContain(`لمسمّى ${f.salary!.role} بالذات، وهو مسمّى أعلى رتبة`);
    expect(r.text).toContain("فلا تعتبره راتب البداية");
  });

  it("an employer the app does not know is named back the same way («في جوجل»)", () => {
    expect(route("كم راتب محلل البيانات في جوجل؟").text).toContain("مو راتب جوجل");
  });

  it("the role's own row and no company: no extra note («كم راتب محلل البيانات؟», «… في السعودية؟»)", () => {
    for (const text of ["كم راتب محلل البيانات؟", "كم راتب محلل البيانات في السعودية؟", "كم راتب محلل بيانات في الرياض؟"]) {
      const r = route(text);
      expect(r.text).not.toContain("أقرب مسمّى");
      expect(r.text).not.toContain("مو راتب");
    }
  });
});

// ── Guides: the Arabic course ──────────────────────────────────────────────────────────────────────────────────────

describe("«أبي كورس Power BI بالعربي»", () => {
  it("names the guide's Arabic course (the Microsoft Learn top pick) and opens «دليل Power BI»; no id", () => {
    const guide = getGuide("powerbi");
    const arabic = [guide.topPick, ...guide.alternatives].find((c) => c.lang === "ar")!;
    const r = route("أبي كورس Power BI بالعربي");
    expect(r.decision.kind).toBe("router");
    expect(r.decision.intent).toBe("guide");
    expect(r.text).toContain(arabic.title);
    expect(r.text).toContain(arabic.provider);
    expect(r.text).toContain("بالعربي");
    expect(r.text).toContain("دليل Power BI");
    expect(r.text).not.toMatch(/c-powerbi/);
    expect(r.actions[0]).toMatchObject({ type: "navigate", to: { screen: "course" } });
  });

  it("a guide with no Arabic course says so plainly, then names its top pick", () => {
    const skill = SKILLS.find((s) => {
      const g = getGuide(s.id);
      return ![g.topPick, ...g.alternatives].some((c) => c.lang === "ar") && W.skillsAsked(W.textOf(`أبي كورس ${s.name} بالعربي`))[0] === s.id;
    });
    expect(skill).toBeDefined();
    const r = route(`أبي كورس ${skill!.name} بالعربي`);
    expect(r.decision.intent).toBe("guide");
    expect(r.text).toContain(`للأمانة ما في دليل ${skill!.name} كورس بالعربي.`);
    expect(r.text).toContain(getGuide(skill!.id).topPick.title);
  });
});

// ── The guards on what reaches the user ────────────────────────────────────────────────────────────────────────────

describe("no internal id reaches the user", () => {
  it.each([
    ["أبشر، دليل Power BI فيه دورة Power BI (c-powerbi-1) ترفع تطابقك.", "c-powerbi-1"],
    ["تطابقك على وظيفة محلل بيانات (data-analyst-riyadh) هو 70 بالمية.", "data-analyst-riyadh"],
    ["أبشر، كورس c-powerbi-1 هو «دليل Power BI».", "c-powerbi-1"],
    ["وظيفة lucidya-frontend-engineer-dammam تطلب React.", "lucidya-frontend-engineer-dammam"],
    ["عائلة «cyber» فيها شهادات.", "«cyber»"],
  ])("«%s» loses %s", (text, id) => {
    const out = scrubIds(text);
    expect(out).not.toContain(id);
    expect(out).not.toMatch(/\(\s*\)/);
  });

  it("a bare job id becomes its title; links, application numbers and English words stay", () => {
    expect(scrubIds("وظيفة data-analyst-riyadh تنتظرك.")).toBe("وظيفة «محلل بيانات» تنتظرك.");
    const kept = "رقم طلبك DL-2026-0001، والرابط https://www.neom.com/en-us/be-part-of-neom/work-at-neom وفيه e-commerce.";
    expect(scrubIds(kept)).toBe(kept);
  });

  it("every text event of a turn is scrubbed (router, local and model alike)", () => {
    const events: AdvisorEvent[] = [{ type: "text", text: "خطوتك c-powerbi-1 الحين." }, { type: "chips", chips: [] }];
    expect(scrubEvents(events)).toEqual([{ type: "text", text: "خطوتك «دليل Power BI» الحين." }, { type: "chips", chips: [] }]);
  });
});

describe("a model reply names only what the data holds, and only the user's own facts", () => {
  const local: AdvisorEvent[] = [{ type: "text", text: "LOCAL" }];
  const ctx = AdvisorCtx.of(request("وش رأيك أترك الجامعة وأشتغل؟"));

  it("certificates outside the data fail (CEH, CISSP); the data's own pass", () => {
    expect(namesAreGrounded("من أبرز الشهادات: CompTIA Security+ و ISC2 CC.", [])).toBe(true);
    expect(namesAreGrounded("من أبرز الشهادات: CompTIA Security+, CEH, و CISSP.", [])).toBe(false);
    expect(namesAreGrounded("خطوتك الجاية دورة Power BI في Excel و SQL.", [])).toBe(true);
    const said = "حسب دليل الأمن السيبراني عندنا، من أبرز الشهادات المعتمدة: CompTIA Security+, CEH, و CISSP.";
    expect(finishModelReply(ctx, "وش الشهادات للأمن السيبراني؟", said, [], local)).toEqual(local);
  });

  it("«مع خبرتك» to a user with no experience fails; a user with years may hear it", () => {
    const base = persona();
    const none: UserFacts = { ...base, answers: { ...base.answers, experience: "none" } };
    const years: UserFacts = { ...base, answers: { ...base.answers, experience: "1to3" } };
    const said = "تخصصك نظم معلومات إدارية مع خبرتك بيعطيك وزن أكبر بالسوق.";
    expect(userFactsGrounded(said, none)).toBe(false);
    expect(userFactsGrounded(said, years)).toBe(true);
    const ctxNone = AdvisorCtx.of(request("وش رأيك أترك الجامعة وأشتغل؟", {}, none));
    expect(finishModelReply(ctxNone, "وش رأيك أترك الجامعة وأشتغل؟", said, [], local)).toEqual(local);
  });

  it("a degree is not claimed for a student", () => {
    const base = persona();
    const student: UserFacts = { ...base, answers: { ...base.answers, education: "student" } };
    expect(userFactsGrounded("شهادتك الجامعية بتخصص نظم معلومات تفيدك.", student)).toBe(false);
    expect(userFactsGrounded("تخصصك نظم معلومات يفيدك.", student)).toBe(true);
  });

  it("an id in a model reply is taken out before it is shown", () => {
    const said = "تطابقك على وظيفة محلل بيانات (data-analyst-riyadh) عالي.";
    expect(finishModelReply(ctx, "كيف مطابقتي؟", said, [], local)).toEqual([{ type: "text", text: "تطابقك على وظيفة محلل بيانات عالي." }]);
  });
});
