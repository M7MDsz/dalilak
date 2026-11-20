// Owner: brain-advisor. «دليلك» knows the career families (20 Nov 2026): what a job is, how to become one, its
// certificates, its published pay WITH the source, interview questions, a first-30-days plan, employers and the entry
// routes (Tamheer, Doroob, Tuwaiq…), all read from src/lib/data/careers.ts (the expansion's families and wave 2's; never
// restated here). Two users: the router (a family named, or the user's target family for a few specific asks) and the
// model's get_career tool (its result carries the pay figure, so rule 8 accepts it only when that tool was called). Pure.
import { COMPANIES, JOBS, getJob, getSkill } from "@/lib/data";
import { matchCompany } from "@/lib/engine";
import { SKILL_IDS, courseIdFor } from "@/lib/ids";
import {
  CAREER_FAMILIES,
  CAREER_FAMILY_IDS,
  ENTRY_ROUTES,
  careersIndexForModel,
  getCareerFamily,
  knowledgeForModel,
  saudizationForModel,
  type CareerFamily,
  type CareerFamilyId,
  type EntryRoute,
  type EntryRouteId,
} from "@/lib/data/careers";
import { normalizeText, tokenize } from "@/lib/text/normalize";
import type { Chip, JobId, NavTarget, SkillId } from "@/lib/types";
import type { ToolError } from "@/lib/brain/protocol";

import type { AdvisorCtx } from "./context";
import { NOT_NOW, openChip, reply, type Reply } from "./replies";
import * as W from "./words";

// ── How people name a family (Arabic, English, common spellings; whole words after 4.3 normalisation) ─────────────

/**
 * Checked in this order (ux-research before the designer, so «باحث تجربة المستخدم» is the researcher). Wave 2's families
 * (src/lib/data/wave2/knowledge.ts) come first with phrases no older family uses.
 */
const FAMILY_SAYINGS: readonly (readonly [CareerFamilyId, readonly string[]])[] = [
  // ── wave 3 (21 Nov 2026, src/lib/data/wave3/knowledge.ts): phrases no older family uses (no bare «الاتصالات»: stc's name) ──
  ["esg-sustainability", ["محلل استدامة", "محللة استدامة", "الاستدامة", "استدامة", "البصمة الكربونية", "تقارير الاستدامة", "esg", "sustainability"]],
  [
    "real-estate-fm",
    [
      "مدير أملاك", "إدارة الأملاك", "إدارة أملاك", "إدارة المرافق", "مدير مرافق", "منسق تأجير", "مقيم عقاري", "مقيّم عقاري",
      "التقييم العقاري", "العقار", "العقارات", "real estate", "property manager", "property management", "facilities management", "leasing",
    ],
  ],
  ["insurance", ["مكتتب تأمين", "مكتتب", "الاكتتاب", "اكتتاب", "تسوية المطالبات", "مقدر أضرار", "التأمين", "تأمين", "insurance", "underwriter", "underwriting", "claims adjuster"]],
  [
    "mobile-dev",
    [
      "مطور تطبيقات جوال", "مطور تطبيقات", "تطوير تطبيقات", "تطبيقات الجوال", "مطور جوال", "مطور موبايل", "فلاتر", "أندرويد", "اندرويد",
      "mobile developer", "mobile development", "mobile app", "flutter", "android", "ios",
    ],
  ],
  [
    "telecom-network",
    [
      "مهندس شبكات", "مهندسة شبكات", "شبكات الاتصالات", "مهندس اتصالات", "قطاع الاتصالات", "الألياف البصرية", "الجيل الخامس",
      "network engineer", "telecom", "telecommunications", "ccna", "5g",
    ],
  ],
  [
    "aviation-ops",
    [
      "مراقب عمليات جوية", "مراقب العمليات الجوية", "عمليات الطيران", "عمليات المطارات", "الخدمات الأرضية", "الطيران", "طيران", "مطار",
      "flight dispatcher", "flight dispatch", "aviation", "airline", "airport",
    ],
  ],
  [
    "pr-communications",
    [
      "أخصائي علاقات عامة", "العلاقات العامة", "علاقات عامة", "الاتصال المؤسسي", "الاتصال الداخلي", "العلاقات الحكومية", "علاقات حكومية",
      "متحدث رسمي", "public relations", "corporate communications", "government relations", "pr",
    ],
  ],
  // ── wave 2 (20 Nov 2026) ──
  ["civil-site-engineer", ["مهندس موقع", "مهندس مدني", "مهندسة مدنية", "الهندسة المدنية", "هندسة مدنية", "site engineer", "civil engineer"]],
  ["mep-engineer", ["مهندس ميكانيكا", "مهندس ميكانيكي", "مهندس كهرباء", "مهندس تكييف", "مهندس mep", "mep engineer", "mep", "hvac"]],
  ["qa-qc-engineer", ["مهندس جودة", "مراقب جودة", "ضبط الجودة", "quality engineer", "quality control", "qc engineer"]],
  ["hse-officer", ["السلامة المهنية", "الصحة والسلامة", "مهندس سلامة", "أخصائي سلامة", "hse", "safety officer", "safety engineer"]],
  ["planning-engineer", ["مهندس تخطيط", "مهندس جدولة", "بريمافيرا", "primavera", "planning engineer", "scheduling engineer"]],
  ["quantity-surveyor", ["حاسب كميات", "حصر الكميات", "حساب الكميات", "مهندس تكاليف", "مهندس عقود", "quantity surveyor", "cost engineer", "cost controller"]],
  ["guest-experience", ["الضيافة", "ضيافة", "الفنادق", "فندق", "موظف استقبال", "خدمة الضيوف", "hospitality", "front desk", "guest relations", "علاقات الضيوف", "guest experience", "guest service"]],
  ["events", ["تنظيم الفعاليات", "منظم فعاليات", "منسق فعاليات", "إدارة الفعاليات", "الفعاليات", "event planner", "event management", "events coordinator", "event coordinator", "events planner"]],
  ["medical-coding-rcm", ["الترميز الطبي", "ترميز طبي", "مرمز طبي", "المطالبات الطبية", "دورة الإيرادات", "medical coding", "medical coder", "rcm"]],
  ["learning-design", ["التصميم التعليمي", "مصمم تعليمي", "مصممة تعليمية", "مدرب", "مدربة", "instructional designer", "instructional design", "trainer"]],
  ["cx-quality", ["تجربة العملاء", "تجربة العميل", "خدمة العملاء", "مركز الاتصال", "كول سنتر", "customer experience", "call center", "contact center", "customer service", "customer care", "cx"]],
  ["credit-risk", ["محلل ائتمان", "الائتمان", "ائتمان", "مخاطر ائتمانية", "مخاطر الائتمان", "credit analyst", "credit risk"]],
  ["compliance-aml", ["مسؤول التزام", "مسؤول الالتزام", "الامتثال", "غسل الأموال", "مكافحة غسل الأموال", "compliance officer", "compliance", "aml"]],
  ["audit", ["مراجع داخلي", "المراجعة الداخلية", "التدقيق الداخلي", "مدقق حسابات", "مراجع حسابات", "auditor", "internal audit", "audit"]],
  ["legal-paralegal-contracts", ["محامي", "محامية", "محاماة", "مستشار قانوني", "باحث قانوني", "قانوني", "القانون", "lawyer", "legal", "paralegal"]],
  ["video-editor-motion", ["مونتير", "مونتاج", "المونتاج", "موشن جرافيك", "محرر فيديو", "video editor", "video editing", "motion designer", "motion graphics"]],
  ["translator-ar-en", ["مترجم", "مترجمة", "الترجمة", "مدقق لغوي", "translator", "translation"]],
  ["game-qa-design-esports", ["الألعاب", "مصمم ألعاب", "تصميم الألعاب", "مختبر ألعاب", "الرياضات الإلكترونية", "قيمنق", "game designer", "game tester", "gaming", "esports"]],
  ["ux-research", ["باحث تجربة المستخدم", "باحث تجربة مستخدم", "بحث تجربة المستخدم", "بحث المستخدم", "ux research", "ux researcher", "user research"]],
  [
    "ui-ux-product-design",
    [
      "مصمم واجهات", "تصميم واجهات", "تصميم الواجهات", "مصمم تجربة المستخدم", "مصمم تجربة مستخدم", "تصميم تجربة المستخدم",
      "مصمم منتجات", "مصمم منتج", "يو اي", "ui ux", "uiux", "ux designer", "ui designer", "product designer", "مصمم ux",
    ],
  ],
  [
    "data-science",
    ["عالم بيانات", "علم البيانات", "علوم البيانات", "data scientist", "data science", "داتا ساينس", "داتا ساينتست"],
  ],
  [
    "data-analyst-bi",
    [
      "محلل بيانات", "محللة بيانات", "محلل داتا", "تحليل البيانات", "ذكاء الأعمال", "ذكاء أعمال", "data analyst", "bi analyst",
      "business intelligence", "داتا أناليست", "داتا اناليست",
    ],
  ],
  [
    "frontend-web",
    [
      "مطور واجهات أمامية", "واجهات أمامية", "الواجهات الأمامية", "فرونت اند", "فرونت إند", "فرونتند", "front end", "frontend",
      "مطور ويب", "تطوير الويب", "تطوير مواقع", "web developer",
    ],
  ],
  ["backend", ["أنظمة خلفية", "الأنظمة الخلفية", "مطور خلفية", "باك اند", "باك إند", "باكند", "back end", "backend"]],
  [
    "qa",
    ["ضمان الجودة", "ضمان جودة", "اختبار البرمجيات", "اختبار برمجيات", "مختبر برمجيات", "كيو ايه", "qa", "software testing", "tester"],
  ],
  [
    "digital-marketing",
    [
      "التسويق الرقمي", "تسويق رقمي", "تسويق إلكتروني", "أخصائي تسويق", "مسوق", "مسوّق رقمي", "ديجيتال ماركتنق", "ماركتنق",
      "سوشال ميديا", "سوشيال ميديا", "digital marketing", "marketing specialist", "seo",
    ],
  ],
  [
    "business-pm-finance",
    [
      "محلل أعمال", "مدير مشاريع", "مدير مشروع", "إدارة المشاريع", "إدارة مشاريع", "محلل مالي", "business analyst", "project manager",
      "financial analyst",
    ],
  ],
  [
    "hr-recruitment",
    ["الموارد البشرية", "موارد بشرية", "أخصائي توظيف", "الاستقطاب", "اتش ار", "إتش آر", "hr", "recruiter", "talent acquisition", "human resources"],
  ],
  [
    "product",
    [
      "مدير منتج", "مدير المنتجات", "مديرة منتج", "إدارة المنتج", "إدارة المنتجات", "برودكت مانجر", "برودكت منجر", "برودكت مانيجر",
      "برودكت", "مالك منتج", "product manager", "product management", "product owner",
    ],
  ],
  [
    "cyber",
    [
      "الأمن السيبراني", "أمن سيبراني", "سيبراني", "سايبر", "سايبر سكيورتي", "أمن المعلومات", "امن معلومات", "اختبار اختراق", "محلل سوك",
      "cyber", "cybersecurity", "cyber security", "soc analyst",
    ],
  ],
  [
    "cloud-devops",
    [
      "مهندس سحابة", "السحابة", "سحابة", "سحابي", "الحوسبة السحابية", "كلاود", "ديف أوبس", "ديف اوبس", "ديفوبس", "cloud", "devops",
      "dev ops", "sre",
    ],
  ],
  [
    "ai-ml",
    [
      "الذكاء الاصطناعي", "ذكاء اصطناعي", "تعلم الآلة", "تعلّم آلة", "التعلم الآلي", "machine learning", "ai engineer", "ai", "ml",
    ],
  ],
  [
    "sales-cs",
    ["مبيعات", "المبيعات", "مندوب مبيعات", "نجاح العملاء", "نجاح عملاء", "سيلز", "sales", "customer success"],
  ],
  [
    "supply-procurement",
    [
      "سلاسل الإمداد", "سلسلة الإمداد", "سلاسل امداد", "مشتريات", "المشتريات", "لوجستيات", "اللوجستيات", "سبلاي تشين", "supply chain",
      "procurement", "logistics",
    ],
  ],
];

/** The families a message names, in the order it names them. */
export function familiesNamed(text: W.Text): readonly CareerFamilyId[] {
  const found: { id: CareerFamilyId; start: number }[] = [];
  for (const [id, sayings] of FAMILY_SAYINGS) {
    const hit = W.firstHit(text, sayings);
    if (hit) found.push({ id, start: hit.start });
  }
  return found.sort((a, b) => a.start - b.start).map((f) => f.id);
}

// ── What is asked ─────────────────────────────────────────────────────────────────────────────────────────────────

export type CareerAsk = "salary" | "certs" | "interview" | "plan" | "routes" | "employers" | "become" | "what";

const SALARY_WORDS = ["راتب", "رواتب", "راتبه", "رواتبهم", "معاش", "كم يدفعون", "كم يعطون", "كم ياخذ", "كم يأخذ", "salary", "salaries", "pay"];
const CERT_WORDS = ["شهادة", "شهادات", "شهادته", "certificate", "certificates", "certification", "certifications", "cert", "certs"];
const INTERVIEW_ASK = [...W.INTERVIEW_WORDS, "يسألون", "يسألوني", "بيسألوني"];
const PLAN_WORDS = ["أول شهر", "أول 30 يوم", "أول ثلاثين يوم", "30 يوم", "خطة شهر", "خطة 30", "first month", "30 days", "30 day"];
const ROUTE_WORDS = [
  "تمهير", "دروب", "طويق", "مسك", "تعاوني", "بوتكامب", "معسكر", "معسكرات", "برنامج تدريب", "برامج تدريب", "تدريب", "bootcamp",
  "tamheer", "doroob", "tuwaiq", "misk", "coop",
];
const EMPLOYER_WORDS = ["مين يوظف", "من يوظف", "وين يشتغلون", "وين أشتغل", "شركات", "جهات", "employers", "companies"];
const BECOME_WORDS = ["أصير", "أكون", "أصبح", "أدخل", "أتحول", "أبدأ", "مسار", "طريق", "أبي", "أبغى", "ودي", "become", "get into"];

/** A specific route named: its id (Misk: the career-essentials programme first). */
const ROUTE_SAYINGS: readonly (readonly [EntryRouteId, readonly string[]])[] = [
  ["tamheer", ["تمهير", "tamheer"]],
  ["doroob", ["دروب", "doroob"]],
  ["tuwaiq-bootcamps", ["طويق", "tuwaiq"]],
  ["hrdf-coop", ["تعاوني", "coop"]],
  ["misk-career-essentials", ["مسك", "misk"]],
  // wave 3 (src/lib/data/wave3/knowledge.ts)
  ["sdaia-academy", ["أكاديمية سدايا", "sdaia academy"]],
];

/** Messages another row answers better (the CV, the gap, the match, feelings, XP, badges, the leaderboard). */
const NOT_CAREER = [
  ...W.CV_WORDS, ...W.GAP_WORDS, ...W.MATCH_WORDS, ...W.FEELING_WORDS, ...W.XP_WORDS, ...W.BADGE_WORDS, ...W.LEADERBOARD_WORDS,
];

export function isSalaryAsk(text: W.Text): boolean {
  return W.has(text, SALARY_WORDS);
}

function askOf(text: W.Text): CareerAsk {
  if (W.has(text, SALARY_WORDS)) return "salary";
  if (W.has(text, CERT_WORDS)) return "certs";
  if (W.has(text, INTERVIEW_ASK)) return "interview";
  if (W.has(text, PLAN_WORDS)) return "plan";
  if (W.has(text, ROUTE_WORDS)) return "routes";
  if (W.has(text, EMPLOYER_WORDS)) return "employers";
  if (W.has(text, BECOME_WORDS)) return "become";
  return "what";
}

function routeNamed(text: W.Text): EntryRoute | null {
  for (const [id, sayings] of ROUTE_SAYINGS) {
    if (W.has(text, sayings)) return ENTRY_ROUTES.find((r) => r.id === id) ?? null;
  }
  return null;
}

/** The user's target job's family (its job list, else its field), or null. */
export function targetFamily(ctx: AdvisorCtx): CareerFamily | null {
  const target = ctx.target;
  if (!target) return null;
  const byJob = CAREER_FAMILIES.find((f) => (f.jobs as readonly string[]).includes(target));
  if (byJob) return byJob;
  const field = getJob(target).field as string;
  return CAREER_FAMILIES.find((f) => (f.fields as readonly string[]).includes(field)) ?? null;
}

// ── Next steps: its jobs in the app, or the guide of its first skill ──────────────────────────────────────────────

const q = (s: string): string => `«${s}»`;
const money = (n: number): string => n.toLocaleString("en-US");
const JOB_IDS_NOW: () => ReadonlySet<string> = () => new Set(JOBS.map((j) => j.id));

/** The family's jobs that are in the app now (the expansion's jobs count once they are wired into JOBS). */
function jobsOf(f: CareerFamily): readonly JobId[] {
  const now = JOB_IDS_NOW();
  return f.jobs.filter((id): id is JobId => now.has(id));
}

function jobsCount(n: number): string {
  if (n === 2) return "وظيفتين";
  return n <= 10 ? `${n} وظايف` : `${n} وظيفة`;
}

/** Where «افتح وظايفها» goes: one job's page, or the jobs page searched by the words all their titles share. */
function jobsTarget(jobs: readonly JobId[]): NavTarget | null {
  const first = jobs[0];
  if (first === undefined) return null;
  if (jobs.length === 1) return { screen: "job", jobId: first };
  const sets = jobs.map((id) => new Set(tokenize(normalizeText(getJob(id).title))));
  const shared = tokenize(getJob(first).title).filter((w) => w.length > 1 && sets.every((s) => s.has(normalizeText(w))));
  if (shared.length > 0) return { screen: "jobs", q: shared.join(" ") };
  const field = getJob(first).field;
  if (jobs.every((id) => getJob(id).field === field)) return { screen: "jobs", field };
  return { screen: "job", jobId: first };
}

interface Offer {
  readonly line: string;
  readonly chips: readonly Chip[];
}

function jobsOffer(f: CareerFamily): Offer | null {
  const jobs = jobsOf(f);
  // 21 Nov 2026 (owner: everything offered must have jobs): a family with no posting in the app says so honestly
  if (jobs[0] === undefined) return { line: "للأمانة ما فيه الحين وظيفة لها في المنصة، وأول ما ينزل إعلان لها بتلقاه في «الوظائف».", chips: [] };
  const to = jobsTarget(jobs);
  if (!to) return null;
  const line =
    jobs.length === 1
      ? `فيه وظيفة لها في المنصة: ${q(getJob(jobs[0]).title)}. تبيني أفتحها لك؟`
      : `فيه ${jobsCount(jobs.length)} لها في المنصة. تبيني أفتحها لك؟`;
  return { line, chips: [openChip(to, jobs.length === 1 ? "افتح الوظيفة" : "افتح وظايفها", "yes"), NOT_NOW] };
}

/** The guide of the family's first skill the user has not finished (only skills and guides that are in the app). */
function guideOffer(ctx: AdvisorCtx, f: CareerFamily): Offer | null {
  for (const id of f.path.skills) {
    if (!(SKILL_IDS as readonly string[]).includes(id)) continue;
    const skill = id as SkillId;
    const held = ctx.stars[skill] ?? 0;
    const max = getSkill(skill).maxStars;
    if (held >= max) continue;
    const courseId = courseIdFor(skill, held + 1);
    if (!courseId || ctx.pageCourse === courseId) return null;
    return {
      line: `أول خطوة لك فيه: دليل ${getSkill(skill).name}. تبيني أفتحه لك؟`,
      chips: [openChip({ screen: "course", courseId }, "افتح الدليل", "yes"), NOT_NOW],
    };
  }
  return null;
}

function withOffer(lines: readonly (string | null | undefined)[], offer: Offer | null): Reply {
  const text = lines.filter((l): l is string => typeof l === "string" && l.trim() !== "");
  return offer ? reply([...text, offer.line], { chips: offer.chips }) : reply(text);
}

// ── The answers ───────────────────────────────────────────────────────────────────────────────────────────────────

/** «دليل Hays للرواتب في السعودية 2026» from "Hays Saudi Arabia Salary Guide 2026"; other sources as written. */
export function salarySourceAr(sourceName: string): string {
  const year = sourceName.match(/\d{4}/)?.[0];
  return /hays/i.test(sourceName) ? `دليل Hays للرواتب في السعودية${year ? ` ${year}` : ""}` : sourceName;
}

/** The pay sentence, the same words in the local answer and in the get_career result (so rule 8 accepts either). */
export function payLine(f: CareerFamily): string | null {
  const s = f.salary;
  if (!s) return null;
  const period = s.period === "monthly" ? "شهرياً" : "سنوياً";
  return `حسب ${salarySourceAr(s.sourceName)}: راتب ${s.role} من ${money(s.minSAR)} إلى ${money(s.maxSAR)} ريال ${period}، وهو الراتب الثابت الإجمالي.`;
}

const shortCert = (name: string): string => name.replace(/\s*\([^)]*\)/g, "").trim() || name;

function whatReply(f: CareerFamily): Reply {
  return withOffer([f.botLines[0] ?? f.what], jobsOffer(f));
}

function becomeReply(ctx: AdvisorCtx, f: CareerFamily): Reply {
  return withOffer([f.botLines[1], f.botLines[2]], guideOffer(ctx, f) ?? jobsOffer(f));
}

function certsReply(f: CareerFamily): Reply {
  const certs = f.certificates;
  if (certs.length === 0) return withOffer([`للأمانة ما عندي شهادات موثّقة لـ${q(f.title)} في بياناتي.`], jobsOffer(f));
  const first = certs.find((c) => c.level === "entry") ?? certs[0]!;
  const support = f.entryRoutes.includes("hrdf-professional-certificates")
    ? ENTRY_ROUTES.find((r) => r.id === "hrdf-professional-certificates")
    : undefined;
  return withOffer(
    [
      `أشهر الشهادات لـ${q(f.title)}: ${certs.slice(0, 3).map((c) => `${shortCert(c.name)} من ${c.issuer}`).join("، ")}.`,
      `لو تبي تبدأ بوحدة: ${shortCert(first.name)}، ${first.why}`,
      support ? `وترى فيه برنامج ${q(support.nameAr)}: ${support.line}` : null,
    ],
    support ? null : jobsOffer(f),
  );
}

// The published row and the family it stands for (21 Nov 2026, QA: «كم راتب أخصائي التسويق في سلة؟» got a Social Media
// Manager figure with no word that it is the nearest published role and not Salla's figure).
const ROLE_GENERIC = new Set(["analyst", "engineer", "developer", "specialist", "officer", "designer", "associate", "generalist", "and", "of", "the"]);
const ROLE_LEVEL = new Set(["senior", "head", "manager", "lead", "director", "principal", "chief"]);
const roleTokens = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 0);

/**
 * True when the published row IS the family's role: its specific words are all in the family's English title, and it is
 * not a more senior row (Manager, Senior, Head…) than the title says. «Data Analyst» for «Data / BI Analyst» is the role;
 * «Social Media Manager» for «Digital Marketing Specialist» is only the nearest published one.
 */
export function salaryRowIsTheRole(f: CareerFamily): boolean {
  const role = f.salary?.role;
  if (!role) return false;
  const title = new Set(roleTokens(f.titleEn));
  const words = roleTokens(role);
  if (words.some((w) => ROLE_LEVEL.has(w) && !title.has(w))) return false;
  const specific = words.filter((w) => !ROLE_GENERIC.has(w) && !ROLE_LEVEL.has(w));
  return specific.length > 0 && specific.every((w) => title.has(w));
}

/** True when the published row is a more senior role than the family («Construction Manager» for a site engineer). */
export function salaryRowIsSenior(f: CareerFamily): boolean {
  const role = f.salary?.role;
  if (!role) return false;
  const title = new Set(roleTokens(f.titleEn));
  return roleTokens(role).some((w) => ROLE_LEVEL.has(w) && !title.has(w));
}

/** Words after «في / عند / لدى» that are a place, not an employer («في السعودية», «في الرياض»). */
const NOT_AN_EMPLOYER = ["السعودية", "السعوديه", "المملكة", "السوق", "سوق", "saudi", "ksa", "الخليج", "العالم", ...Object.values(W.CITY_WORDS).flat()];

/** The employer a pay question names: a known company's everyday name, else the words after في / عند / لدى; or null. */
function employerAsked(text: W.Text): string | null {
  const id = matchCompany(text.raw);
  if (id) return COMPANIES.find((c) => c.id === id)?.short ?? null;
  const prep = W.firstHit(text, W.SEARCH_PREPOSITIONS);
  if (!prep) return null;
  const rest = text.raw
    .replace(/[؟?!.,،]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(prep.end);
  const head = rest[0];
  if (head === undefined || W.has(W.textOf(rest.join(" ")), NOT_AN_EMPLOYER) || W.has(W.textOf(head), [...W.GENERIC_EMPLOYER_WORDS, ...W.NOT_EMPLOYER_WORDS])) {
    return null;
  }
  return rest.slice(0, 3).join(" ");
}

function salaryReply(f: CareerFamily, employer: string | null = null): Reply {
  const line = payLine(f);
  if (!line) {
    const at = employer ? ` ولا لرواتب ${employer}` : "";
    return withOffer([`للأمانة ما لقيت رقم منشور من مصدر سعودي موثوق لراتب ${q(f.title)}${at}، وما أحب أعطيك رقم من عندي.`], jobsOffer(f));
  }
  const s = f.salary!;
  const banded = s.level && !/^not stated/i.test(s.level);
  const nearest = salaryRowIsTheRole(f)
    ? null
    : salaryRowIsSenior(f)
      ? `وترى الرقم لمسمّى ${s.role} بالذات، وهو مسمّى أعلى رتبة من ${q(f.title)}: أقرب مسمّى منشور لقيته، فلا تعتبره راتب البداية.`
      : `وترى الرقم لمسمّى ${s.role} بالذات، وهو أقرب مسمّى منشور لقيته لـ${q(f.title)}، فخذه كتقدير تقريبي.`;
  const company = employer
    ? `وهو رقم عام من الدليل للسوق السعودي، مو راتب ${employer}: ما عندي رواتب منشورة لشركة بعينها.`
    : null;
  return withOffer([line, nearest, company, banded ? null : "والدليل ما يقسّمه حسب سنوات الخبرة، فخذه كصورة عامة."], jobsOffer(f));
}

function interviewReply(f: CareerFamily): Reply {
  const questions = f.interviewQuestions.slice(0, 3).map(q).join(" ");
  return withOffer(
    [
      `أسئلة تتكرر في مقابلات ${q(f.title)}: ${questions}`,
      "كتبتها لك من مواضيع المسار المنشور، مو من شركة معيّنة. جهّز لكل سؤال مثال من مشروع سويته.",
    ],
    jobsOffer(f),
  );
}

function planReply(ctx: AdvisorCtx, f: CareerFamily): Reply {
  return withOffer(
    [`خطة أول 30 يوم لـ${q(f.title)}، كتبتها لك من مواضيع المسار: ${f.first30Days.join("؛ ")}.`],
    guideOffer(ctx, f) ?? jobsOffer(f),
  );
}

function routeCheckLine(r: EntryRoute): string | null {
  return r.note && /close|no open cohort/i.test(r.note) ? "تأكد من صفحتهم إذا التسجيل مفتوح الحين." : null;
}

function routeReply(r: EntryRoute, f: CareerFamily | null): Reply {
  const fits = f && (r.fits === "all" || r.fits.includes(f.id)) ? `ويناسب ${q(f.title)}.` : null;
  return withOffer([`${r.nameAr} من ${r.owner}: ${r.line}`, fits, routeCheckLine(r)], f ? jobsOffer(f) : null);
}

function routesReply(f: CareerFamily): Reply {
  const routes = f.entryRoutes.flatMap((id) => ENTRY_ROUTES.filter((r) => r.id === id));
  const first = routes[0];
  if (!first) return whatReply(f);
  return withOffer(
    [
      `أبواب الدخول لـ${q(f.title)}: ${routes.slice(0, 4).map((r) => r.nameAr).join("، ")}.`,
      `أقربها ${first.nameAr}: ${first.line}`,
    ],
    jobsOffer(f),
  );
}

function employersReply(f: CareerFamily): Reply {
  if (f.employers.length === 0) return whatReply(f);
  return withOffer(
    [`من الجهات اللي توظّف في ${q(f.title)}: ${f.employers.slice(0, 4).map((e) => e.name).join("، ")}.`, "وظايفهم المفتوحة تلقاها في صفحات التوظيف حقتهم."],
    jobsOffer(f),
  );
}

function answer(ctx: AdvisorCtx, ask: CareerAsk, f: CareerFamily, text: W.Text): Reply {
  switch (ask) {
    case "salary":
      return salaryReply(f);
    case "certs":
      return certsReply(f);
    case "interview":
      return interviewReply(f);
    case "plan":
      return planReply(ctx, f);
    case "routes": {
      const named = routeNamed(text);
      return named ? routeReply(named, f) : routesReply(f);
    }
    case "employers":
      return employersReply(f);
    case "become":
      return becomeReply(ctx, f);
    case "what":
      return whatReply(f);
  }
}

/**
 * The pay question for a named family (matched before row 2's «no market numbers», so «كم راتب محلل البيانات؟» gets
 * the published figure with its source, or an honest "no published figure"). Null: no salary word or no family.
 */
export function careerSalaryReply(text: W.Text): Reply | null {
  if (!isSalaryAsk(text)) return null;
  const id = familiesNamed(text)[0];
  return id ? salaryReply(getCareerFamily(id), employerAsked(text)) : null;
}

/** «كيف أصير …؟» said outright (not «أبي» / «ودي», which may lead to a job or an apply request). */
const BECOME_SURE = ["أصير", "أكون", "أصبح", "أتحول", "أتحوّل", "become"];
const HOW_START = ["كيف", "شلون", "how"];
const START_INTO = ["أدخل", "ادخل", "أبدأ", "ابدأ"];

/** Asks whose answer is a list from the data (certificates, questions, a plan, routes): never left to a model. */
const SURE_ASKS: ReadonlySet<CareerAsk> = new Set(["salary", "certs", "interview", "plan", "routes"]);

function sureAsk(ask: CareerAsk, text: W.Text): boolean {
  if (SURE_ASKS.has(ask)) return true;
  if (ask === "become") return W.has(text, BECOME_SURE) || (W.has(text, HOW_START) && W.has(text, START_INTO));
  return false;
}

/**
 * A career question whose answer must come from the data, answered by the router before a job search or a model could
 * take it (21 Nov 2026, QA: a model listed certificates that are not in the data; «وش أسئلة المقابلة لوظيفة أخصائي موارد
 * بشرية؟» became a job list): a family named and asked for its certificates, interview questions, 30-day plan, entry
 * routes or how to become one. A job or open word with «كيف أصير» still goes to the rows after. Null otherwise.
 */
export function careerFirst(ctx: AdvisorCtx, text: W.Text): Reply | null {
  if (W.has(text, NOT_CAREER)) return null;
  const first = familiesNamed(text)[0];
  if (first === undefined) return null;
  const ask = askOf(text);
  if (!sureAsk(ask, text)) return null;
  if (ask === "become" && (W.has(text, W.JOBS_PLURAL) || W.has(text, W.OPEN_WORDS))) return null;
  return answer(ctx, ask, getCareerFamily(first), text);
}

/** careerReply, and whether its answer is a data list the router keeps (true) or a description a model may phrase. */
export function careerAnswer(ctx: AdvisorCtx, text: W.Text): { readonly reply: Reply; readonly sure: boolean } | null {
  const r = careerReply(ctx, text);
  if (!r) return null;
  const ask = askOf(text);
  const twoFamilies = ask === "what" && familiesNamed(text).length > 1;
  return { reply: r, sure: !twoFamilies && sureAsk(ask, text) };
}

/**
 * A career question: a family named («وش يسوي مدير المنتج؟», «كيف أصير مهندس سحابة؟», «وش يسألون في مقابلة مدير
 * المنتج؟»), or, for a question about certificates, the first 30 days or the entry routes, the user's target family
 * («وش أسوي أول شهر؟»). A route named on its own («وش هو تمهير؟») answers that route. Null otherwise (so «كيف أصير
 * أحسن؟» is never a career question).
 */
export function careerReply(ctx: AdvisorCtx, text: W.Text): Reply | null {
  if (W.has(text, NOT_CAREER)) return null;
  const ask = askOf(text);
  const named = familiesNamed(text);
  const first = named[0];
  if (first !== undefined) {
    const f = getCareerFamily(first);
    const second = named[1];
    if (ask === "what" && second !== undefined) {
      const g = getCareerFamily(second);
      return reply([f.botLines[0] ?? f.what, g.botLines[0] ?? g.what, "قل لي أيهم يشدّك وأقولك من وين تبدأ."]);
    }
    return answer(ctx, ask, f, text);
  }
  if (!W.opensWithQuestion(text) && !W.has(text, ["تفيدني", "تنصحني"])) return null;
  if (ask === "routes") {
    const route = routeNamed(text);
    if (route) return routeReply(route, null);
  }
  if (ask !== "certs" && ask !== "plan" && ask !== "routes") return null;
  const f = targetFamily(ctx);
  return f ? answer(ctx, ask, f, text) : null;
}

// ── The model's side: the careers index of the system prompt and the get_career tool ─────────────────────────────

export const CAREER_TOOL = "get_career";
export const CAREER_TOOL_STATUS = "أشوف معلومات المهنة…";

/** One line per family (id «title» (English): what): the CAREERS block of the system prompt. */
export function careersIndex(): string {
  return careersIndexForModel();
}

export interface CareerToolResult {
  readonly family_id: CareerFamilyId;
  readonly title: string;
  /** The family's full knowledge (knowledgeForModel), its entry routes included. */
  readonly knowledge: string;
  /** The only pay sentence «دليلك» may say, with its source, or the honest "no published figure". */
  readonly pay: string;
  /** Official Saudization / labour-law / SANED facts and the open Tuwaiq bootcamps (wave 3), each with its link. */
  readonly labour: string;
}

export function runCareerTool(args: unknown): CareerToolResult | ToolError {
  const id = typeof args === "object" && args !== null ? (args as { family_id?: unknown }).family_id : undefined;
  if (typeof id !== "string" || !(CAREER_FAMILY_IDS as readonly string[]).includes(id)) {
    return { error: "unknown_id", detail: `unknown career family ${String(id)}` };
  }
  const f = getCareerFamily(id as CareerFamilyId);
  return {
    family_id: f.id,
    title: f.title,
    knowledge: knowledgeForModel([f.id]),
    pay: payLine(f) ?? `لا يوجد رقم منشور من مصدر سعودي موثوق لراتب ${q(f.title)}: قل ذلك بصراحة ولا تذكر أي رقم.`,
    labour: saudizationForModel(f.id),
  };
}
