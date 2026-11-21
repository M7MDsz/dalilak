// Owner: brain-advisor. Saudization and the labour law, answered from the data (21 Nov 2026, QA in online mode: asked
// directly, the model declined or invented «التوطين في المحاسبة … 30%» and «التجربة … تسعين يوماً»). Everything here is
// read from src/lib/data/wave3/knowledge.ts (the localisation decisions of the Ministry of Human Resources, Nitaqat
// counting, the labour-law articles, SANED, the Tuwaiq bootcamps open for registration) and the entry routes of
// src/lib/data/careers.ts, never restated. The router answers these before any model, in every mode; when the data has
// nothing on what is asked, «دليلك» says so. Also the stricter figure check for model replies on these topics. Pure.
import { CAREER_FAMILIES, type LocalisationDecision } from "@/lib/data/careers";
import { WAVE3_SAUDIZATION, WAVE3_TUWAIQ_BOOTCAMPS } from "@/lib/data/wave3/knowledge";

import { familiesNamed, routeNamed, routeReply } from "./careers";
import type { AdvisorCtx } from "./context";
import { reply, type Reply } from "./replies";
import * as W from "./words";

type Decision = LocalisationDecision & { readonly families: readonly string[]; readonly professionsExamples: readonly string[] };
const DECISIONS: readonly Decision[] = WAVE3_SAUDIZATION.decisions;
type Article = (typeof WAVE3_SAUDIZATION.labourLaw)[number];

// ── What is asked ──────────────────────────────────────────────────────────────────────────────────────────────────

const LOCALISATION_WORDS = ["توطين", "التوطين", "توطينها", "سعودة", "السعودة", "نسبة السعودة", "saudization", "localisation", "localization"];
const NITAQAT_WORDS = ["نطاقات", "nitaqat"];
const COUNTING_WORDS = ["ينحسب", "يحتسب", "يُحتسب", "يحسب", "احتساب", "ينحسبون", "counted", "count"];

/** Each decision by the words people use for its professions (with the decision's own group name and examples). */
const DECISION_SAYINGS: Readonly<Record<string, readonly string[]>> = {
  "accounting-2025": ["المحاسبة", "محاسبة", "محاسب", "محاسبين", "المحاسبية", "محاسبية", "مراجع مالي", "مدير مالي", "accounting", "accountant", "accountants"],
  "technical-engineering-2025": ["الفنية الهندسية", "فني هندسي", "الفنيين الهندسيين", "technician", "technicians"],
  // not a bare «مهندس»: a software engineer is not in the engineering decision (the families named carry that)
  "engineering-2026": ["المهن الهندسية", "مهن الهندسة", "الهندسة", "الهندسية", "engineering"],
  "procurement-2026": ["المشتريات", "مشتريات", "المناقصات", "مناقصات", "المستودعات", "مستودعات", "procurement"],
  "sales-2026": ["المبيعات", "مبيعات", "مندوب مبيعات", "مندوبين", "sales"],
  "marketing-2026": ["التسويق", "تسويق", "مسوق", "علاقات عامة", "العلاقات العامة", "مصمم جرافيك", "مصور", "دعاية وإعلان", "marketing"],
  "project-management-2027": ["إدارة المشاريع", "ادارة المشاريع", "مدير مشاريع", "مدير مشروع", "project management", "project manager"],
};

/** The labour-law articles by topic (checked in this order: a resignation is not a leave). */
const ARTICLE_SAYINGS: readonly (readonly [Article["id"], readonly string[]])[] = [
  ["probation-once", ["تجربة مرتين", "التجربة مرتين", "فترة تجربة ثانية", "تجربة ثانية"]],
  ["probation", ["فترة التجربة", "فترة تجربة", "الفترة التجريبية", "فترة تجريبية", "تحت التجربة", "probation"]],
  ["end-of-service", ["نهاية الخدمة", "مكافأة نهاية", "end of service", "gratuity"]],
  ["notice", ["الاستقالة", "استقالة", "أستقيل", "استقيل", "بستقيل", "فترة الإشعار", "مدة الإشعار", "الإشعار", "إشعار", "اشعار", "notice period", "resign", "resignation"]],
  ["annual-leave", ["الإجازة السنوية", "إجازة سنوية", "اجازة سنوية", "الاجازة السنوية", "annual leave"]],
  ["working-hours", ["ساعات العمل", "ساعات الدوام", "ساعات الشغل", "عدد ساعات", "دوام رمضان", "working hours"]],
];
/** «التجربة» / «الإجازة» alone may be anything («تجربة المستخدم»): they count with a word of the job contract. */
const WEAK_ARTICLE_SAYINGS: readonly (readonly [Article["id"], readonly string[], readonly string[]])[] = [
  ["probation", ["التجربة", "تجربة"], ["عقد", "العقد", "عقدي", "عقد العمل", "نظام العمل", "صاحب العمل", "الشركة", "الوظيفة", "مدة"]],
  ["annual-leave", ["الإجازة", "إجازة", "اجازة", "الاجازة", "إجازتي", "اجازتي", "vacation", "leave"], ["كم", "يوم", "أيام", "ايام", "نظام العمل", "الشركة", "عقد", "سنة", "السنة"]],
];
const NOT_PROBATION = ["تجربة المستخدم", "تجربة العملاء", "تجربة العميل", "تجربة مستخدم"];
const SANED_WORDS = ["ساند", "التعطل", "تعطل", "التأمين ضد التعطل", "saned", "unemployment insurance"];

const q = (s: string): string => `«${s}»`;

/** «وزارة الموارد البشرية: «…» (27 أكتوبر 2025)» → said as the source of a fact. */
const sourceLine = (label: string): string => `المصدر: ${label}.`;

// ── The answers ────────────────────────────────────────────────────────────────────────────────────────────────────

function decisionNamed(text: W.Text): Decision[] {
  const found: { d: Decision; start: number }[] = [];
  for (const d of DECISIONS) {
    const sayings = [...(DECISION_SAYINGS[d.id] ?? []), ...d.professionsExamples];
    const hit = W.firstHit(text, sayings);
    if (hit) found.push({ d, start: hit.start });
  }
  // «الفنية الهندسية» is the technicians' decision, not the engineers' as well
  const ids = new Set(found.map((f) => f.d.id));
  const kept = ids.has("technical-engineering-2025") ? found.filter((f) => f.d.id !== "engineering-2026") : found;
  return kept.sort((a, b) => a.start - b.start).map((f) => f.d);
}

function decisionLines(d: Decision): string[] {
  const line =
    d.botLine ??
    `${d.groupAr}: ${d.rate}، ${d.appliesTo}${d.minWageCounted ? `، والسعودي ينحسب بأجر ${d.minWageCounted}` : ""}.`;
  const source = d.sources[0];
  return source ? [line, sourceLine(source.label)] : [line];
}

function nitaqatReply(): Reply {
  const source = WAVE3_SAUDIZATION.nitaqat[0]?.source;
  return reply([...WAVE3_SAUDIZATION.nitaqatBotLines, ...(source ? [sourceLine(source.label)] : [])]);
}

/** The localisation decisions of a family named («توطين المحاسبين»), else of the words used, else honest "none". */
function localisationReply(text: W.Text): Reply {
  let decisions = decisionNamed(text);
  if (decisions.length === 0) {
    const family = familiesNamed(text)[0];
    if (family !== undefined) decisions = DECISIONS.filter((d) => (d.families as readonly string[]).includes(family));
  }
  if (decisions.length > 0) return reply(decisions.slice(0, 2).flatMap(decisionLines));
  const counting = W.has(text, NITAQAT_WORDS) || W.has(text, COUNTING_WORDS);
  if (counting) return nitaqatReply();
  const groups = DECISIONS.map((d) => d.groupAr).join("، ");
  return reply([
    `للأمانة ما عندي قرار توطين منشور لهذي المهنة في بياناتي، وما أحب أعطيك نسبة من عندي.`,
    `قرارات التوطين اللي عندي من وزارة الموارد البشرية: ${groups}. اسألني عن وحدة منها.`,
  ]);
}

function articleReply(a: Article): Reply {
  return reply([`${a.botLine} (${a.article.replace(/\s*\(.*\)\s*$/, "")} من نظام العمل)`, sourceLine(a.source.label)]);
}

/**
 * SANED in «دليلك»'s Najdi (21 Nov 2026, tester: the GOSI facts pasted as-is read as Fusha). Every figure is one of the
 * GOSI facts in the data (labour.test.ts checks each against WAVE3_SAUDIZATION.saned.facts).
 */
export const SANED_LINES = [
  "التأمين ضد التعطل عن العمل (ساند) للموظفين السعوديين المشتركين في التأمينات، إذا انقطع شغلك لظروف خارجة عن إرادتك.",
  "لازم تقدّم خلال 90 يوم من ترك العمل، ويصرفون لك 60% من متوسط أجرك المشترك فيه آخر سنتين في أول ثلاث أشهر، و50% بعدها.",
  "أعلى تعويض 9,000 ريال بالشهر في أول ثلاث أشهر و7,500 بعدها، وأقصى مدة للصرف 12 شهر.",
] as const;

function sanedReply(): Reply {
  return reply([...SANED_LINES, sourceLine(WAVE3_SAUDIZATION.saned.source.label)]);
}

function bootcampsCount(n: number): string {
  return n >= 3 && n <= 10 ? `${n} معسكرات مفتوحة` : `${n} معسكر مفتوح`;
}

function tuwaiqReply(text: W.Text): Reply {
  const route = routeNamed(text);
  const head = route ? `${route.owner}: ${route.line}` : null;
  const open = WAVE3_TUWAIQ_BOOTCAMPS.slice(0, 4).map((b) => `${q(b.name)} (${b.field}${b.free ? "، مجاني" : ""})`);
  return reply([
    ...(head ? [head] : []),
    `من المعسكرات المفتوحة للتسجيل الحين: ${open.join("، ")}.`,
    `وعندهم ${bootcampsCount(WAVE3_TUWAIQ_BOOTCAMPS.length)} للتسجيل، وتواريخ كل معسكر وشروطه في صفحته عندهم.`,
    sourceLine("أكاديمية طويق: صفحات المعسكرات المفتوحة للتسجيل (tuwaiq.edu.sa)"),
  ]);
}

/**
 * Tamheer's monthly stipend as HRDF's guide gives it (the route record says only «بمكافأة شهرية»; the families' tips,
 * sourced to that guide, carry the figure): «3,000 ريال شهرياً من 3 إلى 6 أشهر (العمر حتى 30)», or null.
 */
function tamheerStipend(): { readonly line: string; readonly source: string } | null {
  for (const f of CAREER_FAMILIES) {
    const tip = f.standOut;
    if (!tip || !/تمهير/.test(tip.tip) || !/hrdf/i.test(tip.source.url)) continue;
    const m = tip.tip.match(/بمكافأة\s+([\d,]+\s*ريال\s*شهرياً[^،؛.]*)/);
    if (m?.[1]) return { line: m[1].trim(), source: tip.source.label };
  }
  return null;
}

/**
 * A Saudization, labour-law, SANED or entry-route question, answered from the data (the router, before any model):
 * «التوطين في المحاسبة كم نسبته؟» → the accounting decision's rate, conditions, wage counted, date and source;
 * «كم مدة التجربة في عقد العمل؟» → Art. 53; notice → Art. 75; leave → Art. 109; hours → Art. 98; end of service →
 * Arts. 84-85; «ساند» → SANED; Nitaqat counting; «تمهير / دروب / دعم التوظيف / طويق» → the route (Tuwaiq with its open
 * bootcamps). Null when it is none of these.
 */
export function labourReply(ctx: AdvisorCtx, text: W.Text): Reply | null {
  if (W.has(text, SANED_WORDS)) return sanedReply();
  if (W.has(text, LOCALISATION_WORDS)) return localisationReply(text);
  if (W.has(text, NITAQAT_WORDS)) return localisationReply(text);
  if (W.has(text, W.JOBS_PLURAL)) return null; // «وظائف دوام جزئي» is a job search
  const id =
    ARTICLE_SAYINGS.find(([, sayings]) => W.has(text, sayings))?.[0] ??
    WEAK_ARTICLE_SAYINGS.find(([aid, sayings, context]) => W.has(text, sayings) && W.has(text, context) && !(aid === "probation" && W.has(text, NOT_PROBATION)))?.[0];
  const article = id ? WAVE3_SAUDIZATION.labourLaw.find((a) => a.id === id) : undefined;
  if (article) return articleReply(article);
  if (W.has(text, ["رمضان"]) && W.has(text, ["دوام", "الدوام", "ساعات", "ساعة"])) {
    const hours = WAVE3_SAUDIZATION.labourLaw.find((a) => a.id === "working-hours");
    if (hours) return articleReply(hours);
  }
  return null;
}

/**
 * An entry route named on its own («وش هو تمهير؟», «وش دعم التوظيف؟», «معسكرات طويق»): the route's line from the data,
 * Tuwaiq with its bootcamps open for registration. Matched after the apply requests, so «قدّم لي على … (برنامج تمهير)»
 * stays an apply. Null when no route is named.
 */
export function routeAnswer(ctx: AdvisorCtx, text: W.Text): Reply | null {
  void ctx;
  if (W.has(text, ["طويق", "tuwaiq"])) return tuwaiqReply(text);
  const route = routeNamed(text);
  if (!route) return null;
  const base = routeReply(route, null);
  const stipend = route.id === "tamheer" ? tamheerStipend() : null;
  return stipend ? { ...base, text: [...base.text, `والمكافأة ${stipend.line}، ${sourceLine(stipend.source)}`] } : base;
}

/** True when a text is about Saudization or the labour law (the stricter figure check applies). */
export function isLabourTopic(text: string): boolean {
  const t = W.textOf(text);
  return (
    W.has(t, LOCALISATION_WORDS) ||
    W.has(t, NITAQAT_WORDS) ||
    W.has(t, SANED_WORDS) ||
    W.has(t, ["نظام العمل", "عقد العمل", "فترة التجربة", "الفترة التجريبية", "نهاية الخدمة", "فترة الإشعار", "الإجازة السنوية", "ساعات العمل"])
  );
}

// ── The stricter figure check (model replies on these topics) ────────────────────────────────────────────────────

const PERCENT = /(\d+(?:[.,]\d+)?)\s*(?:%|٪|بالمية|بالمئة|في المية|في المئة)/g;
const DAYS = /(\d+)\s*(?:يوماً|يوما|يوم|أيام|ايام)/g;
const RIYALS = /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:ريال|ر\.س|SAR)/g;

function latin(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function figures(text: string, re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of latin(text).matchAll(re)) out.add((m[1] ?? "").replace(/,/g, ""));
  return out;
}

let corpus: string | null = null;

function labourCorpus(): string {
  corpus ??= JSON.stringify(WAVE3_SAUDIZATION);
  return corpus;
}

/**
 * A model reply about Saudization or the labour law: every percentage must be one of the decisions it names (or, naming
 * none, one of the data's), every number of days one of the labour law's or SANED's, every riyal figure one of the data's.
 * «التوطين في المحاسبة … 30%» fails (the accounting decision says 40% rising to 70%), so does «تسعين يوماً» for probation
 * written as «90 يوم» when the reply is about the trial period. Replies on other topics pass untouched.
 */
export function labourFiguresGrounded(reply: string, message: string): boolean {
  if (!isLabourTopic(reply) && !isLabourTopic(message)) return true;
  const data = labourCorpus();
  const t = W.textOf(reply);
  const named = decisionNamed(t);
  const allowedPercent = named.length > 0 ? figures(named.map((d) => `${d.rate} ${d.botLine ?? ""}`).join(" "), PERCENT) : figures(data, PERCENT);
  for (const p of figures(reply, PERCENT)) if (!allowedPercent.has(p)) return false;
  const article = ARTICLE_SAYINGS.find(([, sayings]) => W.has(t, sayings) || W.has(W.textOf(message), sayings));
  const articleData = article ? WAVE3_SAUDIZATION.labourLaw.find((a) => a.id === article[0]) : undefined;
  const allowedDays = articleData ? figures(`${articleData.text} ${articleData.botLine}`, DAYS) : figures(data, DAYS);
  for (const d of figures(reply, DAYS)) if (!allowedDays.has(d)) return false;
  const allowedRiyals = figures(data, RIYALS);
  for (const r of figures(reply, RIYALS)) if (!allowedRiyals.has(r)) return false;
  // spelled-out day counts the data never uses for that article («تسعين يوماً», «مئة وثمانين»)
  if (/تسعين|مئة وثمانين|مائة وثمانين|ستين يوم|ثلاثين يوم/.test(reply)) return false;
  return true;
}
