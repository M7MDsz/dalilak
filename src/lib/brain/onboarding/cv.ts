// Owner: brain-advisor (onboarding). The CV step in front of the questions (docs/ONBOARDING-FLOW.md), as a PURE script
// like the rest of the interpreter: what the CV states clearly (cvFacts), the CV phase a saved user is in, «دليلك»'s
// lines for it (Najdi, each with 2-3 variants picked by a stable hash so a run looks the same twice), and the turns of
// the two CV phases (the offer, the confirm). The screen runs the analysis itself (src/features/welcome/cv-step.tsx).
import { countNoun } from "@/lib/copy";
import { SKILLS, getJob, getQuestion, optionLabel } from "@/lib/data";
import { isJobFieldId } from "@/lib/ids";
import type { CvErrorCode, OnboardingContext, OnboardingInput, OnboardingTurn } from "@/lib/brain/protocol";
import type {
  CvSkill,
  EducationOption,
  InterestOption,
  JobId,
  OnboardingAnswers,
  OnboardingStepId,
  RevealReason,
  UserState,
} from "@/lib/types";

import { CV_QUESTION_ORDER, onboardingTurn, pendingQuestion, questionChips } from "./index";
import { Reading, readPending } from "./read";
import { REPLY } from "./tables";

// ── Variants ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** A stable pick among variants: the same name and key give the same line on every run (the demo looks the same twice). */
export function pickVariant<T>(name: string, key: string, variants: readonly [T, ...T[]]): T {
  let h = 0;
  for (const ch of `${name.replace(/\s+/g, "")}|${key}`) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return variants[h % variants.length] ?? variants[0];
}

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

// ── What the CV states clearly ─────────────────────────────────────────────────────────────────────────────────────

/** The CV slots «دليلك» may fill, in question order. */
export const CV_SLOTS = ["city", "education", "major", "experience"] as const satisfies readonly OnboardingStepId[];

export interface CvFacts {
  /** Only what is clearly written; the rest stays a question. */
  readonly answers: OnboardingAnswers;
  /** The filled slots, in question order. */
  readonly slots: readonly OnboardingStepId[];
  /** The CV's own words for a short experience («تدريب تعاوني أربعة أشهر»), said in the confirm instead of the band. */
  readonly experienceNote?: string;
}

const HEADER_WORDS = ["نبذة", "الملخص", "ملخص", "التعليم", "المؤهلات", "الخبرة", "الخبرات", "المشاريع", "المهارات", "اللغات", "الدورات", "الشهادات", "summary", "education", "experience", "projects", "skills", "languages"];
const DEGREE_WORDS = ["بكالوريوس", "بكالريوس", "ماجستير", "دكتوراه", "دبلوم", "تخرجت", "تخرّجت", "خريج", "خريجة", "تخصص", "تخصصي", "bachelor", "master", "degree", "bsc", "diploma"];
const EXPERIENCE_HEADERS = ["الخبرة", "الخبرات", "الخبرة العملية", "experience"];
const MONTH_WORDS = ["تدريب", "تعاوني", "أشهر", "شهور", "internship", "months"];
const NEW_GRAD_WORDS = ["حديث تخرج", "حديث التخرج", "خريج جديد", "خريجة جديدة", "fresh graduate"];
const EDUCATION_RANK: Readonly<Record<EducationOption, number>> = { postgrad: 4, bachelor: 3, diploma: 2, secondary: 1, student: 0 };

/** A section title: a short line (1-3 words), no sentence punctuation, that names a CV section. */
function isHeader(line: string): boolean {
  const text = line.trim();
  if (text === "" || /[.،,:؛]/.test(text) || text.split(/\s+/).length > 3) return false;
  return new Reading(text).mentions(HEADER_WORDS);
}

/** «5 سنوات خبرة» / «خبرة 3 سنوات» / "4 years of experience": the years written next to the word for experience. */
function yearsOfExperience(lines: readonly string[]): number | null {
  for (const line of lines) {
    const ar = line.match(/(\d{1,2})\s*\+?\s*(?:سنوات|سنة|سنين)\s*(?:من\s*)?(?:ال)?خبر/u) ?? line.match(/خبر\S*\s*(?:تزيد عن|أكثر من|لمدة)?\s*(\d{1,2})\s*(?:سنوات|سنة|سنين)/u);
    const en = line.match(/(\d{1,2})\s*\+?\s*years?\s+(?:of\s+)?experience/i);
    const hit = ar ?? en;
    if (hit?.[1]) return Number(hit[1]);
  }
  return null;
}

/**
 * The answers the CV states clearly (spec of docs/ONBOARDING-FLOW.md 2): city (only in the header lines, before the
 * first section), the highest degree, the major (read only from a degree line), the experience band (years written with
 * «خبرة»; else a co-op, internship or months in the experience section → «أقل من سنة»; else «خريج جديد» → none).
 * `lines` are the cleaned CV lines (the analysis' `lines`; the first one is the name).
 */
export function cvFacts(lines: readonly string[]): CvFacts {
  const answers: { -readonly [K in keyof OnboardingAnswers]: OnboardingAnswers[K] } = {};
  let note: string | null = null;
  const firstHeader = lines.findIndex((l, i) => i > 0 && isHeader(l));
  const head = lines.slice(1, firstHeader > 0 ? Math.min(firstHeader, 6) : 5);

  for (const line of head) {
    const found = readPending(new Reading(line), "city");
    if (found?.question === "city" && found.value !== "other") {
      answers.city = { value: found.value, label: found.label ?? optionLabel("city", found.value) ?? line.trim() };
      break;
    }
  }

  let education: EducationOption | null = null;
  for (const line of lines.slice(1)) {
    const reading = new Reading(line);
    if (!reading.mentions(DEGREE_WORDS)) continue;
    const found = readPending(reading, "education");
    if (found?.question === "education" && found.value !== "student" && (education === null || EDUCATION_RANK[found.value] > EDUCATION_RANK[education])) {
      education = found.value;
    }
  }
  if (education !== null) answers.education = education;

  for (const line of lines.slice(1)) {
    const reading = new Reading(line);
    if (!reading.mentions(DEGREE_WORDS)) continue;
    const found = readPending(reading, "major");
    if (found?.question === "major" && found.value !== "other") {
      answers.major = { value: found.value, label: optionLabel("major", found.value) ?? found.value };
      break;
    }
  }

  const years = yearsOfExperience(lines);
  if (years !== null) answers.experience = years === 0 ? "none" : years <= 3 ? (years < 1 ? "under1" : "1to3") : "over3";
  else {
    const start = lines.findIndex((l) => isHeader(l) && new Reading(l).mentions(EXPERIENCE_HEADERS));
    if (start >= 0) {
      const end = lines.findIndex((l, i) => i > start && isHeader(l));
      const section = lines.slice(start + 1, end > start ? end : undefined);
      if (section.some((l) => new Reading(l).mentions(MONTH_WORDS))) answers.experience = "under1";
      for (const l of section) {
        const months = l.match(/((?:\d{1,2}|شهر|شهرين|ثلاثة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة)\s+(?:أشهر|شهور))/u)?.[1];
        if (!months) continue;
        const kind = /تدريب تعاوني/u.test(l) ? "تدريب تعاوني" : /تدريب/u.test(l) ? "تدريب" : "خبرة";
        note = `${kind} ${months}`;
        break;
      }
    }
    if (answers.experience === undefined && lines.some((l) => new Reading(l).mentions(NEW_GRAD_WORDS))) answers.experience = "none";
  }

  return { answers, slots: CV_SLOTS.filter((q) => answers[q] !== undefined), ...(note !== null && answers.experience === "under1" ? { experienceNote: note } : {}) };
}

/**
 * The interest the CV's stars lean to: the job field holding the most stars (ties: catalogue order), when it holds at
 * least 3 stars; null otherwise (then «دليلك» suggests nothing).
 */
export function interestFromCv(skills: readonly CvSkill[]): InterestOption | null {
  const byField = new Map<string, number>();
  for (const s of skills) {
    const field = SKILLS.find((k) => k.id === s.skill)?.field;
    if (field && isJobFieldId(field)) byField.set(field, (byField.get(field) ?? 0) + s.stars);
  }
  let best: string | null = null;
  let most = 0;
  for (const [field, stars] of byField) if (stars > most) [best, most] = [field, stars];
  if (best === null || most < 3 || !isJobFieldId(best)) return null;
  // 21 Nov 2026 (tester): a field that is not one of the six interest tiles (a civil-engineering CV → project-controls)
  // is suggested as the nearest tile, so «دليلك» names a real option (never a raw id) and a plain «إيه» records it
  return NEAREST_INTEREST[best] ?? null;
}

/** The interest tile nearest to each job field (the six tiles are data, software, design, marketing, business, hr). */
const NEAREST_INTEREST: Readonly<Record<string, InterestOption>> = {
  data: "data",
  software: "software",
  design: "design",
  marketing: "marketing",
  business: "business",
  hr: "hr",
  product: "business",
  "cyber-cloud": "software",
  gaming: "software",
  media: "design",
  communications: "marketing",
  education: "hr",
  "sales-supply": "business",
  engineering: "business",
  "project-controls": "business",
  "banking-risk": "business",
  legal: "business",
  "real-estate": "business",
  aviation: "business",
  "energy-sustainability": "business",
  "tourism-hospitality": "business",
  "health-admin": "business",
};

/** «Excel و SQL» (a space before a Latin name, so it reads apart) · «الإحصاء والبرمجة». */
function andOf(a: string, b: string): string {
  return /^[A-Za-z]/.test(b) ? `${a} و ${b}` : `${a} و${b}`;
}

/** The two strongest skills (most stars, then the order they were found in), by name. */
export function strongestSkills(skills: readonly CvSkill[], n = 2): string[] {
  return [...skills]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.stars - a.s.stars || a.i - b.i)
    .slice(0, n)
    .map(({ s }) => SKILLS.find((k) => k.id === s.skill)?.name ?? s.skill);
}

// ── The phase a saved user is in ───────────────────────────────────────────────────────────────────────────────────

/** "offer": waiting for the CV (or «ما عندي»); "confirm": waiting for yes / change on the CV's answers; null: the questions. */
export type CvPhase = "offer" | "confirm" | null;

export function cvPhase(user: Pick<UserState, "onboarding">): CvPhase {
  const o = user.onboarding;
  if (o.thread.length === 0) return null;
  if (o.cv === "offered") return "offer";
  if (o.cvPrefill && !o.cvPrefill.confirmed) return "confirm";
  return null;
}

// ── «دليلك»'s lines ────────────────────────────────────────────────────────────────────────────────────────────────

/** The offer chips (test ids `welcome-chip-cv-{id}`) and the confirm chips (`welcome-chip-cv-confirm-{id}`). */
export const CV_OFFER_CHIPS = [
  { id: "upload", label: "ارفع ملف سيرتك" },
  { id: "paste", label: "الصق نص سيرتك" },
  { id: "sample", label: "جرّب بسيرة جاهزة" },
  { id: "none", label: "ما عندي سيرة الحين" },
] as const;
export type CvOfferChip = (typeof CV_OFFER_CHIPS)[number]["id"];

export const CV_CONFIRM_CHIPS = [
  { id: "yes", label: "إيه، صح" },
  { id: "change", label: "لا، بعدّل" },
] as const;
export type CvConfirmChip = (typeof CV_CONFIRM_CHIPS)[number]["id"];

export const CV_LINES = {
  offer: "عندك سيرة ذاتية؟ ارفعها وأختصر عليك نص الأسئلة.",
  skip: ["ولا يهمك، نمشي بالأسئلة، وتقدر ترفعها بعدين من خريطتك.", "ما عليه، الأسئلة تكفي الحين، وإذا جهزت سيرتك ترفعها من خريطتك.", "تمام، نكمل بالأسئلة، والسيرة تقدر تضيفها بعدين من خريطتك."],
  skipShort: "ولا يهمك، نمشي بالأسئلة.",
  yesHint: "حلو! اختر «ارفع ملف سيرتك» تحت، أو الصق نصها.",
  bubbleSample: "جرّب بسيرة جاهزة",
  bubblePaste: "لصقت نص سيرتي",
  bubbleFile: (fileName: string): string => `سيرتي: ${fileName}`,
  confirmed: ["تمام، سجّلتها.", "زين، اعتمدتها.", "أبشر، ثبّتها لك."],
  rejected: ["ولا يهمك، نمر عليها بسرعة.", "ما عليه، نعدّلها سوا بسرعة."],
  unclear: "سامحني، ما لقطتها. اللي فهمته من سيرتك صح، ولا تبي تعدّل؟",
  /** In the chat, in «دليلك»'s voice: the same facts as the /cv sentences (features/cv/copy.ts). */
  errors: {
    wrong_type: "المقبول PDF و Word (docx) بس. جرّب ملف ثاني أو الصق نص سيرتك.",
    too_large: "الملف أكبر من 5 ميغابايت. جرّب ملف أصغر أو الصق النص.",
    too_many_pages: "الملف طويل (أكثر من 15 صفحة). ارفع سيرة أقصر أو الصق نصها.",
    unreadable: "ما قدرت أفتح الملف. الصق نص سيرتك وأقراه لك.",
    no_text: "ما لقيت نص مقروء في الملف، يمكن صورة ممسوحة. الصق نص سيرتك.",
    request_failed: "ما قدرت أحلّلها الحين. جرّب مرة ثانية، أو كمّل بدونها.",
  } satisfies Record<CvErrorCode, string>,
  empty: "ما لقطت مهارات واضحة في ذي السيرة. أضف خبراتك ومهاراتك بأسمائها، أو جرّب السيرة الجاهزة.",
} as const;

/** The greeting of a fresh account: the opening line, then the CV offer (docs/ONBOARDING-FLOW.md 2). */
export function cvOpeningMessages(name: string): readonly string[] {
  return [REPLY.opening(firstName(name)), CV_LINES.offer];
}

/** The screen-reader text of the CV card (the card itself is drawn from `user.cv`). */
export function cvCardText(skills: number): string {
  return `قرأت سيرتك: ${countNoun(skills, "skill")}.`;
}

/** The reaction to what the CV really holds: only its skill count and its strongest skills. */
export function cvReaction(name: string, skills: readonly CvSkill[]): string {
  const first = firstName(name);
  const count = countNoun(skills.length, "skill");
  const [a, b] = strongestSkills(skills);
  const best = a === undefined ? "" : b === undefined ? a : andOf(a, b);
  return pickVariant(name, "cv-reaction", [
    `ما شاء الله يا ${first}، لقيت في سيرتك ${count}، أقواها ${best}.`,
    `يعطيك العافية يا ${first}، طلع في سيرتك ${count}، وأبرزها ${best}.`,
    `حلو يا ${first}! سيرتك فيها ${count}، وأقواها ${best}.`,
  ]);
}

const EXPERIENCE_CLAUSE = {
  none: ["وما عندك خبرة شغل للحين", "إنك ما عندك خبرة شغل للحين"],
  under1: ["وعندك خبرة أقل من سنة", "إن عندك خبرة أقل من سنة"],
  "1to3": ["وعندك خبرة من سنة إلى 3 سنوات", "إن عندك خبرة من سنة إلى 3 سنوات"],
  over3: ["وعندك خبرة أكثر من 3 سنوات", "إن عندك خبرة أكثر من 3 سنوات"],
} as const;

/**
 * «فهمت من سيرتك إنك خريج نظم معلومات إدارية (بكالوريوس) من الرياض، ومعك تدريب تعاوني أربعة أشهر. صح؟» (`note`: the CV's
 * own words for a short experience, from cvFacts; else the band).
 */
export function cvConfirmQuestion(answers: OnboardingAnswers, note?: string): string {
  const edu = answers.education ? optionLabel("education", answers.education) : null;
  const city = answers.city ? `من ${answers.city.label}` : null;
  const clauses: string[] = [];
  if (answers.major) clauses.push(`إنك خريج ${answers.major.label}${edu ? ` (${edu})` : ""}${city ? ` ${city}` : ""}`);
  else if (edu) clauses.push(`إن مؤهلك ${edu}${city ? `، وإنك ${city}` : ""}`);
  else if (city) clauses.push(`إنك ${city}`);
  if (answers.experience && note && answers.experience === "under1") clauses.push(clauses.length > 0 ? `ومعك ${note}` : `إن معك ${note}`);
  else if (answers.experience) clauses.push(EXPERIENCE_CLAUSE[answers.experience][clauses.length > 0 ? 0 : 1]);
  return `فهمت من سيرتك ${clauses.join("، ")}. صح؟`;
}

/** «من سيرتك أشوف إن الأرقام والبيانات أقرب لك.» (kept for a CV that leans to a field with no strong skill to name). */
export function interestHint(interest: InterestOption): string {
  return `من سيرتك أشوف إن ${optionLabel("interest", interest) ?? interest} أقرب لك.`;
}

/**
 * The interest question built on the CV (the owner's example): «عندك Excel و SQL قوية، تبي تكمل في الأرقام والبيانات ولا
 * تفكر بمجال ثاني؟». The skills named are the CV's strongest in the field it leans to; its tile comes first, and a plain
 * «إيه» records it. Null without a field the CV leans to (then the usual question).
 */
export function cvInterestQuestion(skills: readonly CvSkill[], suggested: InterestOption | null): string | null {
  if (suggested === null) return null;
  // the skills whose field leads to the suggested tile (a civil engineer's Primavera and quantity surveying → «تنظيم الأعمال والمشاريع»)
  const inField = skills.filter((s) => {
    const field = SKILLS.find((k) => k.id === s.skill)?.field;
    return field !== undefined && NEAREST_INTEREST[field] === suggested;
  });
  const [a, b] = strongestSkills(inField);
  const label = optionLabel("interest", suggested) ?? suggested;
  if (a === undefined) return `${interestHint(suggested)} تبي تكمل فيها ولا تفكر بمجال ثاني؟`;
  const strong = b === undefined ? `عندك ${a} قوية` : `عندك ${andOf(a, b)} قوية`;
  return `${strong}، تبي تكمل في ${label} ولا تفكر بمجال ثاني؟`;
}

/** A plain yes to the CV's interest question («إيه»، «أكيد»، «صح») records the field it suggested. */
export function saysYes(text: string): boolean {
  return says(text, YES_WORDS) && !says(text, NO_WORDS);
}

/** Why the engine picked the job, as «دليلك» says it (the first two fit reasons, Najdi): «تحب الأرقام والبيانات». */
export function reasonClauses(reasons: readonly RevealReason[]): string[] {
  const out: string[] = [];
  for (const r of reasons) {
    switch (r.kind) {
      case "interest":
        out.push(`تحب ${optionLabel("interest", r.interest) ?? r.interest}`);
        break;
      case "major":
        out.push(`تخصصك ${r.majorLabel} قريب منها`);
        break;
      case "experience":
        out.push("تناسب خبرتك");
        break;
      case "city":
        out.push(r.near ? `قريبة منك في ${r.cityLabel}` : `في ${r.cityLabel}`);
        break;
      case "remote":
        out.push("تنشغل عن بُعد");
        break;
      case "priority":
        out.push(r.priority === "first-job" ? "توصلك لأول وظيفة بسرعة" : r.priority === "switch" ? "تنقلك لمجال جديد" : "تطوّرك في مجالك");
        break;
      case "none":
        break;
    }
  }
  return out.slice(0, 2);
}

/**
 * The closing line: «دليلك» proposes the path himself (the engine's job), says why (its fit reasons) and, with a CV, the
 * real match (docs/ONBOARDING-FLOW.md 2, «Path suggestion»). `match` null: no CV was read.
 */
export function pathLine(name: string, job: JobId, match: number | null, reasons: readonly RevealReason[] = []): string {
  const title = getJob(job).title;
  const clauses = reasonClauses(reasons);
  const why = clauses.length > 0 ? `، لأنك ${clauses.join("، و")}` : "";
  if (match === null) {
    return pickVariant(name, "path-line", [
      `على إجاباتك، أقرب مسار لك «${title}»${why}. لحظات وأرسمه لك.`,
      `جمعت إجاباتك، وأشوف «${title}» أنسب مسار لك${why}. لحظات وأرسمه.`,
      `من إجاباتك، «${title}» أقرب وظيفة لك${why}. لحظات وأرسم لك الطريق.`,
    ]);
  }
  return pickVariant(name, "path-line", [
    `على سيرتك وإجاباتك، أقرب مسار لك «${title}»${why}، ومطابقتك له الحين ${match}%. لحظات وأرسمه لك.`,
    `جمعت سيرتك وإجاباتك، وأشوف «${title}» أنسب مسار لك${why}، ومطابقتك له ${match}% من الحين. لحظات وأرسمه.`,
    `من سيرتك وإجاباتك، «${title}» أقرب وظيفة لك${why}، ومطابقتك لها الحين ${match}%. لحظات وأرسم لك الطريق.`,
  ]);
}

// ── Reading yes / no ───────────────────────────────────────────────────────────────────────────────────────────────

const YES_WORDS = ["إيه", "ايه", "اي", "أيوه", "ايوه", "ايوا", "نعم", "صح", "صحيح", "تمام", "مضبوط", "بالضبط", "زين", "أكيد", "اكيد", "عندي", "yes", "yeah", "yep", "ok", "okay", "اوكي"];
const NO_WORDS = ["لا", "لأ", "لاء", "غلط", "مو صح", "مب صح", "عدل", "بعدل", "بعدّل", "أعدل", "عدّل", "ما عندي", "ماعندي", "مافي", "ما فيه", "no", "nope"];

function says(text: string, words: readonly string[]): boolean {
  return new Reading(text).mentions(words);
}

// ── The turns of the two CV phases ─────────────────────────────────────────────────────────────────────────────────

/** What the store writes besides the turn's thread and answers (protocol `OnboardingTurn.cvStep`). */
function withStep(turn: OnboardingTurn, cvStep: NonNullable<OnboardingTurn["cvStep"]>): OnboardingTurn {
  return { ...turn, cvStep };
}

function questionText(question: OnboardingStepId, answers: OnboardingAnswers): string {
  const q = getQuestion(question);
  return question === "major" && answers.education === "secondary" && q.textAfterSecondary ? q.textAfterSecondary : q.text;
}

/** The next question (the screen words the interest question from the CV's skills: `cvInterestQuestion`). */
function nextAsk(pending: OnboardingStepId, answers: OnboardingAnswers, suggested: InterestOption | null): string {
  void suggested;
  return questionText(pending, answers);
}

function turnTo(context: OnboardingContext, userText: string, answers: OnboardingAnswers, lead: readonly string[], suggested: InterestOption | null, cvOrder = false): OnboardingTurn {
  const pending = pendingQuestion(answers, false, cvOrder ? CV_QUESTION_ORDER : undefined);
  const replies = [...lead, ...(pending === null ? [REPLY.closing(firstName(context.name))] : [nextAsk(pending, answers, suggested)])];
  return { userText, replies, answers, misses: context.misses, pending, chips: pending === null ? null : questionChips(pending, answers), done: pending === null, unmapped: null };
}

/**
 * The offer phase, for what the user TYPED (the four chips are the screen's: upload / paste / sample run the analysis,
 * «ما عندي سيرة الحين» is `cvSkipTurn`). A yes gets the hint; a no skips; anything else skips the CV and is read as the
 * answer to question 1 (nothing typed is lost).
 */
export function cvOfferTurn(context: OnboardingContext, text: string): OnboardingTurn {
  const userText = text.trim();
  const turn = onboardingTurn({ ...context, pending: "city" }, { kind: "text", text });
  const answeredSomething = turn.answers !== context.answers && Object.keys(turn.answers).length > Object.keys(context.answers).length;
  if (answeredSomething) {
    const [first, ...rest] = turn.replies;
    return withStep({ ...turn, replies: [`${CV_LINES.skipShort} ${first ?? ""}`.trim(), ...rest] }, { cv: "skipped" });
  }
  if (says(text, NO_WORDS)) return cvSkipTurn(context, userText);
  if (says(text, YES_WORDS)) {
    return { userText, replies: [CV_LINES.yesHint], answers: context.answers, misses: context.misses, pending: "city", chips: null, done: false, unmapped: null };
  }
  const [first, ...rest] = turn.replies;
  return withStep({ ...turn, replies: [`${CV_LINES.skipShort} ${first ?? ""}`.trim(), ...rest] }, { cv: "skipped" });
}

/** «ما عندي سيرة الحين»: today's seven questions from question 1, after a kind line. */
export function cvSkipTurn(context: OnboardingContext, userText: string): OnboardingTurn {
  const replies = [pickVariant(context.name, "cv-skip", CV_LINES.skip), REPLY.openingLead, `${REPLY.openingAsk} ${questionText("city", context.answers)}`];
  const pending = pendingQuestion(context.answers);
  return withStep(
    { userText, replies, answers: context.answers, misses: context.misses, pending, chips: pending === null ? null : questionChips(pending, context.answers), done: false, unmapped: null },
    { cv: "skipped" },
  );
}

/**
 * The confirm phase: «إيه، صح» confirms the CV's answers; «لا، بعدّل» takes them out and asks them; a typed correction
 * («لا، أنا من جدة») replaces what it names and keeps the rest, confirmed; anything unclear asks again.
 * `suggested`: the interest the CV leans to (its hint goes in front of the interest question).
 */
export function cvConfirmTurn(
  context: OnboardingContext,
  slots: readonly OnboardingStepId[],
  input: { readonly kind: "chip"; readonly option: CvConfirmChip } | { readonly kind: "text"; readonly text: string },
  suggested: InterestOption | null,
): OnboardingTurn {
  const userText = input.kind === "chip" ? (CV_CONFIRM_CHIPS.find((c) => c.id === input.option)?.label ?? "") : input.text.trim();
  const without: { -readonly [K in keyof OnboardingAnswers]: OnboardingAnswers[K] } = { ...context.answers };
  for (const q of slots) delete without[q];

  const confirm = (answers: OnboardingAnswers, lead: readonly string[]) =>
    withStep(turnTo(context, userText, answers, lead, suggested, true), { prefill: { slots, confirmed: true } });
  const change = () => withStep(turnTo(context, userText, without, [pickVariant(context.name, "cv-rejected", CV_LINES.rejected)], suggested), { prefill: null });

  if (input.kind === "chip") return input.option === "yes" ? confirm(context.answers, [pickVariant(context.name, "cv-confirmed", CV_LINES.confirmed)]) : change();

  // a typed correction: read against the CV's slots only (the first slot pending)
  const read = onboardingTurn({ ...context, answers: without, pending: slots[0] ?? null }, { kind: "text", text: input.text } satisfies OnboardingInput);
  const corrected: { -readonly [K in keyof OnboardingAnswers]: OnboardingAnswers[K] } = {};
  for (const q of slots) if (read.answers[q] !== undefined && read.answers[q] !== without[q]) Object.assign(corrected, { [q]: read.answers[q] });
  if (Object.keys(corrected).length > 0) return confirm({ ...context.answers, ...corrected }, read.replies.slice(0, 1));
  if (says(input.text, NO_WORDS)) return change();
  if (says(input.text, YES_WORDS)) return confirm(context.answers, [pickVariant(context.name, "cv-confirmed", CV_LINES.confirmed)]);
  return { userText, replies: [CV_LINES.unclear], answers: context.answers, misses: context.misses, pending: pendingQuestion(context.answers), chips: null, done: false, unmapped: null };
}

/** The question after the CV's reaction when there was nothing to confirm (no slot stated clearly): the CV order. */
export function cvNextQuestion(answers: OnboardingAnswers, suggested: InterestOption | null): string | null {
  const pending = pendingQuestion(answers, false, CV_QUESTION_ORDER);
  return pending === null ? null : nextAsk(pending, answers, suggested);
}

/** The interest tiles with the CV's suggestion first. */
export function interestChipsWithCv(answers: OnboardingAnswers, suggested: InterestOption | null): ReturnType<typeof questionChips> {
  const chips = questionChips("interest", answers);
  if (suggested === null) return chips;
  const first = chips.options.find((o) => o.id === suggested);
  return first ? { ...chips, options: [first, ...chips.options.filter((o) => o.id !== suggested)] } : chips;
}
