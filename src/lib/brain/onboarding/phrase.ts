// Owner: brain-advisor (onboarding). The Gemini rephrase layer of «دليلك»'s onboarding lines (docs/ONBOARDING-FLOW.md 4).
// Client-safe and pure except `phraseOnboarding` (a fetch). The interpreter decides everything (answers, chips, the next
// question); the model only rewrites the WORDS of a template, given ONLY the facts that line may use, and its reply is
// thrown away unless it passes every check below. Offline, slow or rejected → the template, at once.
import { COMPANIES, JOBS, SKILLS } from "@/lib/data";
import { PROTOCOL_VERSION } from "@/lib/brain/protocol";
import type { UserFacts } from "@/lib/types";

import { numbersAreGrounded } from "../advisor/rules";
import { Reading } from "./read";

export type PhraseMoment = "ack" | "cv" | "path";

export interface PhraseFacts {
  /** The answer just recorded, as the user's bubble printed it. */
  readonly answer?: string;
  /** The next question's text (the model keeps its meaning). */
  readonly nextQuestion?: string;
  /** The CV's skills with their stars (names exactly as the catalogue writes them). */
  readonly skills?: readonly { readonly name: string; readonly stars: number }[];
  readonly skillCount?: number;
  /** The recommended job's title and the user's real match with it. */
  readonly job?: string;
  readonly match?: number;
  /** Why the engine picked that job, in plain words (from its fit reasons). */
  readonly reasons?: readonly string[];
}

export interface OnboardingPhraseRequest {
  readonly v: typeof PROTOCOL_VERSION;
  readonly moment: PhraseMoment;
  /** The user's first name. */
  readonly name: string;
  /** The template lines (what the user sees when the model does not answer in time or fails a check). */
  readonly lines: readonly string[];
  readonly facts: PhraseFacts;
}

export type OnboardingPhraseResponse = { readonly ok: true; readonly lines: readonly string[] } | { readonly ok: false };

/** The browser waits this long for the rephrased lines (the server chain gets PHRASE_SERVER_MS of it). */
export const PHRASE_CLIENT_MS = 3_500;
export const PHRASE_SERVER_MS = 3_000;
/** Longest line accepted. */
const LINE_MAX = 220;

// ── The prompt ─────────────────────────────────────────────────────────────────────────────────────────────────────

const MOMENT_HINT: Record<PhraseMoment, string> = {
  ack: "Line 1 acknowledges the user's answer warmly, in your own words (do not start the way the template starts). If there is a line 2, it asks the next question: the same question, naturally worded, ending with «؟».",
  cv: "Line 1 reacts to the user's CV: the number of skills found and the strongest ones, exactly as given. If there is a line 2, it is either the same confirmation question (the same facts, ending with «؟») or the next question.",
  path: "The first line acknowledges the user's last answer warmly. The last line proposes the closest path yourself: the job title exactly as written, inside «», why it suits the user in your own words using ONLY the given reasons, the current match exactly as given with % when one is given, and that you will draw the path now.",
};

export function phrasePrompt(request: OnboardingPhraseRequest): { readonly system: string; readonly user: string } {
  const n = request.lines.length;
  const system = [
    "You rewrite the lines of «دليلك», the warm career guide inside the Saudi career app «دليل», during the user's first conversation, so they sound like a real person and not like a form.",
    "VOICE: Saudi Najdi Arabic, the everyday spoken dialect of Riyadh (وش، الحين، أبي/تبي، زين، ذي، اللي، عشان، ترى، حلو، ما شاء الله، يعطيك العافية، ولا يهمك، أبشر). Never Modern Standard Arabic (no الآن، هذه، سوف، لديك، يمكنك، ماذا) and never Hijazi or Egyptian words (no إيش، دحين، كدا، عايز). Warm, short, respectful, like a kind older brother.",
    "RULES (a reply that breaks one is thrown away):",
    "- Keep the meaning of every line and stay close to it: change the opening and a few words so it never sounds repeated, in correct Arabic spelling. Use ONLY what is in the template and in FACTS.",
    "- Never add a number, a percentage, a company, a job, a skill, a city, a salary, a date or a promise. Write skill and tool names exactly as given (Excel، SQL).",
    "- Each line: one or two short sentences, under 30 words. A question stays a question about the same thing and ends with «؟».",
    `- Say the name «${request.name}» at most once, and only if the template does.`,
    "- Plain text: no emoji, no markdown, no quotes around whole lines.",
    `- Reply with JSON only: {"lines": [...]} with exactly ${n} line${n === 1 ? "" : "s"}, in the same order as the template.`,
    MOMENT_HINT[request.moment],
  ].join("\n");
  const user = [
    `MOMENT: ${request.moment}`,
    `FACTS: ${JSON.stringify(request.facts)}`,
    "TEMPLATE:",
    ...request.lines.map((line, i) => `${i + 1}. ${line}`),
  ].join("\n");
  return { system, user };
}

// ── The checks ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A facts object with no number in it, so `numbersAreGrounded` accepts only the request's own numbers. */
const NO_FACTS: UserFacts = {
  id: "",
  name: "",
  avatar: "av-01",
  createdAt: 0,
  createdDay: "",
  answers: {},
  onboardingCompletedAt: null,
  targetJobId: null,
  cv: null,
  cvSkipped: false,
  courses: {},
  xpEvents: [],
  applications: [],
  activeDays: [],
  badges: [],
};

const NOT_NAJDI = ["الآن", "سوف", "لديك", "لديكم", "يمكنك", "ماذا", "هذه", "لا أستطيع", "إيش", "ايش", "أيش", "دحين", "كدا", "عايز", "شو", "هلق"];
const PROMISES = ["أضمن", "اضمن", "مضمون", "مضمونة", "أوعدك", "اوعدك", "وعد", "بتتوظف", "راح تتوظف", "guarantee"];
const MONEY = ["ريال", "راتب", "رواتب", "مليون", "ألف"];

/**
 * Company names that are also everyday words («زين» is good, «مسار» holds «سار», «مهارة» is a skill): never treated as a
 * company being named (live 21 Nov 2026: «زين» refused good Najdi replies).
 */
const EVERYDAY = new Set([
  "زين", "هلا", "ثقة", "هدف", "لين", "كريم", "مسك", "سيارة", "المتقدمة", "التعاونية", "التصنيع", "وافق", "ساري", "رواء",
  "نعناع", "ميسر", "برق", "أثير", "جاهز", "تحكم", "تكامل", "إجادة", "المسافر", "مهارة", "سار", "ساب", "معادن", "الإنماء", "زد",
]);

/** Names the model may not bring in by itself: skills, job titles, companies (each allowed only when the request has it). */
const NAMED: readonly string[] = [
  ...SKILLS.map((s) => s.name),
  ...JOBS.map((j) => j.title),
  ...COMPANIES.flatMap((c) => [c.short, c.name]),
].filter((n) => n.length >= 3 && !EVERYDAY.has(n));

function allowedText(request: OnboardingPhraseRequest): string {
  return `${request.lines.join(" ")} ${JSON.stringify(request.facts)} ${request.name}`;
}

/**
 * Why one line of «دليلك» written by the model is refused, or null. `allowed`: every text it may draw on (the template, the
 * facts); `template`: the line it replaces (a question must stay a question).
 */
export function lineProblem(line: string, allowed: string, template: string | null = null): string | null {
  const text = line.trim();
  if (text === "") return "empty line";
  if (text.length > LINE_MAX) return "too long";
  if (/[*#_`<>{}[\]]/.test(text) || /\p{Extended_Pictographic}/u.test(text)) return "markup or emoji";
  if (template !== null && /[؟?]\s*$/.test(template) && !/[؟?]\s*$/.test(text)) return "question lost";
  const reading = new Reading(text);
  if (reading.mentions(NOT_NAJDI)) return "not najdi";
  if (reading.mentions(PROMISES)) return "promise";
  if (reading.mentions(MONEY) && !new Reading(allowed).mentions(MONEY)) return "money";
  // whole words, normalised (a name inside a longer word is not that name: «سار» in «مسار»)
  const allowedReading = new Reading(allowed);
  for (const name of NAMED) if (text.includes(name) && reading.mentions([name]) && !allowedReading.mentions([name])) return `named ${name}`;
  const allowedLower = allowed.toLowerCase();
  for (const word of text.match(/[A-Za-z][A-Za-z.+#-]*/g) ?? []) if (!allowedLower.includes(word.toLowerCase())) return `latin ${word}`;
  if (!numbersAreGrounded(text, [allowed], NO_FACTS)) return "number";
  return null;
}

/** Why a rephrased reply is refused, or null when every line passes (docs/ONBOARDING-FLOW.md 4 "Checks"). */
export function phraseProblem(request: OnboardingPhraseRequest, lines: readonly string[]): string | null {
  if (lines.length !== request.lines.length) return "line count";
  const allowed = allowedText(request);
  for (const [i, line] of lines.entries()) {
    const template = request.lines[i] ?? "";
    const problem = lineProblem(line, allowed, template);
    if (problem !== null) return problem;
    // what the template quotes («محلل بيانات», «ملفي») is a fact or a button: it stays, word for word (live 21 Nov 2026:
    // a reworded company line lost the company)
    for (const quoted of template.match(/«[^»]+»/g) ?? []) if (!line.includes(quoted.slice(1, -1))) return `lost ${quoted}`;
  }
  return null;
}

/** The `lines` of a model's JSON reply, or null. */
export function parsePhraseReply(raw: string): string[] | null {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    const lines = typeof parsed === "object" && parsed !== null && "lines" in parsed ? (parsed as { lines: unknown }).lines : null;
    if (!Array.isArray(lines) || !lines.every((l): l is string => typeof l === "string")) return null;
    return lines.map((l) => l.replace(/\s+/g, " ").trim());
  } catch {
    return null;
  }
}

/** The request, read from untrusted JSON (the route). */
export function parsePhraseRequest(input: unknown): OnboardingPhraseRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  if (r.v !== PROTOCOL_VERSION || (r.moment !== "ack" && r.moment !== "cv" && r.moment !== "path")) return null;
  if (typeof r.name !== "string" || r.name.length > 40) return null;
  if (!Array.isArray(r.lines) || r.lines.length === 0 || r.lines.length > 3 || !r.lines.every((l) => typeof l === "string" && l.length > 0 && l.length <= 400)) return null;
  if (typeof r.facts !== "object" || r.facts === null || JSON.stringify(r.facts).length > 1_500) return null;
  const f = r.facts as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const skills = Array.isArray(f.skills)
    ? f.skills.flatMap((s) => (typeof s === "object" && s !== null && typeof (s as { name?: unknown }).name === "string" && typeof (s as { stars?: unknown }).stars === "number" ? [{ name: (s as { name: string }).name.slice(0, 40), stars: (s as { stars: number }).stars }] : [])).slice(0, 20)
    : undefined;
  const facts: PhraseFacts = {
    ...(str(f.answer) ? { answer: str(f.answer) } : {}),
    ...(str(f.nextQuestion) ? { nextQuestion: str(f.nextQuestion) } : {}),
    ...(skills ? { skills } : {}),
    ...(num(f.skillCount) !== undefined ? { skillCount: num(f.skillCount) } : {}),
    ...(str(f.job) ? { job: str(f.job) } : {}),
    ...(num(f.match) !== undefined ? { match: num(f.match) } : {}),
    ...(Array.isArray(f.reasons) ? { reasons: f.reasons.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 120)).slice(0, 4) } : {}),
  };
  return { v: PROTOCOL_VERSION, moment: r.moment, name: r.name, lines: r.lines as string[], facts };
}

// ── The browser call ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/onboarding/phrase, aborted after 3.5 s. Resolves to the rephrased lines (already checked by the server), or
 * null: the caller then shows its template. Never throws.
 */
export async function phraseOnboarding(request: OnboardingPhraseRequest, signal?: AbortSignal): Promise<readonly string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHRASE_CLIENT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch("/api/onboarding/phrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (typeof data !== "object" || data === null || (data as { ok?: unknown }).ok !== true) return null;
    const lines = (data as { lines?: unknown }).lines;
    if (!Array.isArray(lines) || lines.length !== request.lines.length || !lines.every((l) => typeof l === "string" && l.trim() !== "")) return null;
    return lines as string[];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

// ── Understanding a typed message (owner, 20 Nov 2026: «دليلك» leads the onboarding) ─────────────────────────────────

/**
 * What «دليلك» may say about the onboarding itself when the user asks («وش فايدة السيرة؟», «ليش تسأل عن المدينة؟», «وش الفرق
 * بين…»): the only facts a side answer may use. Najdi, short; skill and tool names in English.
 */
export const ONBOARDING_FACTS: readonly string[] = [
  "أقرا سيرتك وأطلّع مهاراتك، ومع كل مهارة الجملة اللي تثبتها من سيرتك، وأعطيها نجوم من 1 إلى 3.",
  "إذا رفعت سيرتك، أعبّي منها اللي واضح فيها (المدينة، الشهادة، التخصص، الخبرة) وأسألك بس عن الباقي، وأقارن مهاراتك مع الوظائف وتطلع نسبة مطابقتك الحقيقية.",
  "تقدر تكمل بدون سيرة وترفعها بعدين من خريطتك.",
  "المدينة: عشان أقدّم لك الوظائف القريبة منك أول، ومعها الوظائف عن بُعد.",
  "الشهادة والتخصص: عشان أربطك بالمجالات الأقرب لدراستك.",
  "الخبرة: عشان أختار وظائف تناسب مستواك، بداية أو خطوة أعلى.",
  "الاهتمام: أهم سؤال، هو اللي يحدد المجال اللي أرسم فيه مسارك.",
  "الشركة: لو في بالك شركة وعندها وظيفة في قائمتي، أوجّه مسارك لها.",
  "الأولوية: أول وظيفة بسرعة، أو تغيير مجال، أو تطوّر في مجالك، أو استكشاف؛ تغيّر ترتيب اللي أقترحه.",
  "بعد الأسئلة أرسم لك مسار من مراحل تعلّم لأقرب وظيفة لك، ونسبة المطابقة تزيد مع كل مهارة تكسبها.",
  "إجاباتك تنحفظ في متصفحك، وتقدر تغيّرها بعدين من «ملفي».",
  "الأرقام والبيانات: تحليل الأرقام وكتابة التقارير بأدوات مثل Excel و SQL و Power BI.",
  "بناء المواقع والتطبيقات: البرمجة وبناء المنتجات اللي يستخدمها الناس.",
  "التصميم والإبداع: تصميم الواجهات والهوية والمحتوى المرئي.",
  "التسويق والمحتوى: الحملات والمحتوى والإعلانات.",
  "تنظيم الأعمال والمشاريع: إدارة المشاريع والعمليات وترتيب الشغل.",
  "العمل مع الناس وتطويرهم: الموارد البشرية والتوظيف والتدريب.",
  "عدد الأسئلة سبعة، ومع السيرة ينقص أغلبها.",
];

/** One quick reply the user could have tapped (the question's chips, or the CV step's). */
export interface UnderstandOption {
  readonly id: string;
  readonly label: string;
}

export interface OnboardingUnderstandRequest {
  readonly v: typeof PROTOCOL_VERSION;
  /** What «دليلك» asked: a question id, "cv" (the CV offer) or "cv-confirm" (the CV's answers). */
  readonly step: string;
  /** The question as «دليلك» asked it. */
  readonly question: string;
  readonly options: readonly UnderstandOption[];
  /** One or two ids may be picked (the interest question). */
  readonly many: boolean;
  readonly name: string;
  /** At most 300 characters. */
  readonly text: string;
}

export type UnderstandResult =
  | { readonly type: "answer"; readonly options: readonly string[] }
  | { readonly type: "question"; readonly reply: string }
  | { readonly type: "none" };

export function understandPrompt(request: OnboardingUnderstandRequest): { readonly system: string; readonly user: string } {
  const system = [
    "You are «دليلك», the warm career guide inside the Saudi career app «دليل», leading the user's first conversation. You read ONE message the user typed in reply to your question and decide what it is.",
    `- If it answers the question (in any words: dialect, English, a typo, a synonym), reply {"type":"answer","options":["id"]} with ${request.many ? "one or two ids" : "exactly one id"} from OPTIONS. Never invent an id.`,
    '- If it is a question or a remark instead (why you ask, what something is for, the difference between options, who you are, how the app works), reply {"type":"question","reply":"..."}: answer it in one or two short sentences of Saudi Najdi Arabic (وش، الحين، أبي/تبي، زين، ذي، اللي، عشان، ترى), warm and plain, using ONLY the FACTS below. Never Modern Standard Arabic (no الآن، هذه، سوف، لديك، يمكنك، ماذا), never Hijazi or Egyptian words. Do not ask the question again (the app asks it right after). Never add a number, company, job, salary or promise that is not in the FACTS. If the FACTS do not cover it, say kindly that you will come back to it after drawing the path.',
    '- Otherwise reply {"type":"none"}.',
    "JSON only, nothing else.",
    "FACTS:",
    ...ONBOARDING_FACTS.map((f) => `- ${f}`),
  ].join("\n");
  const user = [`QUESTION: «${request.question}»`, "OPTIONS:", ...request.options.map((o) => `${o.id} = «${o.label}»`), `MESSAGE: «${request.text}»`].join("\n");
  return { system, user };
}

/** The company's name, short name, English name or one of its spellings is written in the user's text. */
function companyNamed(id: string, text: string): boolean {
  const company = COMPANIES.find((c) => c.id === id);
  if (!company) return false;
  const reading = new Reading(text);
  const names = [company.name, company.short, company.en, ...company.aliases, ...(company.aliasesAlone ?? [])].filter((n): n is string => typeof n === "string" && n.trim() !== "");
  return reading.find(names).length > 0;
}

/** The model's decision, kept only when valid: ids from the options, a side reply that passes `lineProblem`. */
export function checkUnderstood(request: OnboardingUnderstandRequest, raw: string): UnderstandResult | null {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const r = parsed as Record<string, unknown>;
  if (r.type === "answer" && Array.isArray(r.options)) {
    const ids = new Set(request.options.map((o) => o.id));
    let valid = [...new Set(r.options.filter((o): o is string => typeof o === "string" && ids.has(o)))].slice(0, request.many ? 2 : 1);
    // a company is taken only when the user wrote it: its name or one of its spellings must be in the text (21 Nov 2026,
    // tester: «أي بنك كويس» was read as Al Rajhi). «لا، مو الحين» needs no name.
    if (request.step === "company") valid = valid.filter((id) => id === "none" || companyNamed(id, request.text));
    return valid.length > 0 ? { type: "answer", options: valid } : { type: "none" };
  }
  if (r.type === "question" && typeof r.reply === "string") {
    const reply = r.reply.replace(/\s+/g, " ").trim();
    const allowed = `${ONBOARDING_FACTS.join(" ")} ${request.question} ${request.options.map((o) => o.label).join(" ")} ${request.name}`;
    return lineProblem(reply, allowed) === null ? { type: "question", reply } : null;
  }
  if (r.type === "none") return { type: "none" };
  return null;
}

export function parseUnderstandRequest(input: unknown): OnboardingUnderstandRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const r = input as Record<string, unknown>;
  if (r.v !== PROTOCOL_VERSION || typeof r.step !== "string" || r.step.length > 20) return null;
  if (typeof r.question !== "string" || r.question.length > 300 || typeof r.name !== "string" || r.name.length > 40) return null;
  if (typeof r.text !== "string" || r.text.trim() === "") return null;
  // the company question sends every known company (about 150 since wave 3): allow up to 400 options
  if (!Array.isArray(r.options) || r.options.length > 400) return null;
  const options = r.options.flatMap((o) =>
    typeof o === "object" && o !== null && typeof (o as UnderstandOption).id === "string" && typeof (o as UnderstandOption).label === "string"
      ? [{ id: (o as UnderstandOption).id.slice(0, 60), label: (o as UnderstandOption).label.slice(0, 80) }]
      : [],
  );
  return { v: PROTOCOL_VERSION, step: r.step, question: r.question, options, many: r.many === true, name: r.name, text: r.text.trim().slice(0, 300) };
}

/** POST /api/onboarding/understand, aborted after 3.5 s. Null on a timeout, an error or no valid decision. */
export async function understandOnboarding(request: OnboardingUnderstandRequest, signal?: AbortSignal): Promise<UnderstandResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHRASE_CLIENT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const response = await fetch("/api/onboarding/understand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    if (typeof data !== "object" || data === null || (data as { ok?: unknown }).ok !== true) return null;
    const result = (data as { result?: unknown }).result;
    if (typeof result !== "object" || result === null) return null;
    const r = result as Record<string, unknown>;
    if (r.type === "answer" && Array.isArray(r.options) && r.options.every((o) => typeof o === "string")) return { type: "answer", options: r.options as string[] };
    if (r.type === "question" && typeof r.reply === "string" && r.reply.trim() !== "") return { type: "question", reply: r.reply };
    if (r.type === "none") return { type: "none" };
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
