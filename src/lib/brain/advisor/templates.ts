// Owner: brain-advisor. «دليلك»'s fixed words that the BROWSER also needs (pure, client-safe), and the full 5.9 template
// bank (the router and the local brain use it). Every Arabic string here is final copy from spec 3.14, 4.6, 5.6, 5.8, 5.9
// and 7.4, written exactly; the few lines the spec does not give are marked PROVISIONAL.
// VOICE: «دليلك» speaks Saudi Najdi, not Fusha (Mohammed, 18 Nov 2026). UI labels elsewhere stay in Fusha.
// Imports: types, ids, data, copy, engine, text and protocol TYPES only. NEVER @/lib/store/** (the persisted store imports
// this file for applyInterruptedLine; brain code that needs transitions does so in router.ts / tools.ts, not here).
import { APPLICATION_STATUS_COPY, countNoun } from "@/lib/copy";
import { getJob, getSkill, optionLabel } from "@/lib/data";
import { courseState } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import type {
  Application,
  ApplicationStatus,
  ApplyStep,
  Chip,
  CourseId,
  LockReason,
  RevealReason,
  ToolName,
  UserFacts,
} from "@/lib/types";
import type { AdvisorAction } from "@/lib/brain/protocol";

import { firstName, joinCommaAnd, openChipLabel, pageName, q, withBa } from "./phrasing";

/** «دليلك يفكّر…» (3.14: before any tool runs). */
export const THINKING_LINE: string = "دليلك يفكّر…";

/** The status line of each tool (5.3). apply_to_job's three lines follow the apply run: see applyStatusLine. */
export const TOOL_STATUS: Readonly<Record<ToolName, string>> = {
  navigate: "أفتح لك الصفحة…",
  search_jobs: "أدوّر لك في الوظائف…",
  get_job_gap: "أقارن مهاراتك بالمطلوب…",
  explain_match: "أحسب لك المطابقة…",
  recommend_next_step: "أشوف مسارك…",
  list_courses: "أشوف خطوات التعلّم…",
  get_course: "أشوف الدليل…",
  start_course: "أبدأ لك الخطوة…",
  apply_to_job: "أفتح نموذج التقديم…",
  list_applications: "أشوف طلباتك…",
  set_target_job: "أرسم مسارك من جديد…",
  get_leaderboard: "أشوف الترتيب…",
  list_badges: "أشوف شاراتك…",
};

/**
 * Step 1 «أفتح نموذج التقديم…» · steps 2-4 «أعبّي بياناتك…» · step 5 «أرسل الطلب…» (a real posting: «أجهّز الطلب…», it is
 * prepared, never sent by «دليلك») · 0 and 6: null (7.4).
 */
export function applyStatusLine(step: ApplyStep, real = false): string | null {
  switch (step) {
    case 1:
      return "أفتح نموذج التقديم…";
    case 2:
    case 3:
    case 4:
      return "أعبّي بياناتك…";
    case 5:
      return real ? "أجهّز الطلب…" : "أرسل الطلب…";
    default:
      return null;
  }
}

/** First open after onboarding, and after «محادثة جديدة» (3.14): «أهلاً من جديد يا {name}. مسارك نحو «{target}» جاهز، …». */
export function firstOpenMessage(facts: UserFacts): string {
  const name = firstName(facts.name);
  const target = facts.targetJobId ? getJob(facts.targetJobId).title : null;
  const path = target ? `مسارك لـ ${q(target)} جاهز` : "مسارك جاهز";
  return `هلا والله من جديد يا ${name}. ${path}، وأنا معك خطوة بخطوة. اسألني عن مسارك أو وين تتعلّم أو الوظائف، أو قل لي: وش أسوي الحين؟`;
}

/** «أوقفت التقديم. الطلب أمامك إن أحببت أن تكمله بنفسك.» (7.4, 5.9). */
export function applyStoppedLine(): string {
  return "وقّفت التقديم. الطلب قدّامك لو تبي تكمّله بنفسك.";
}

/** «لم يكتمل التقديم. اطلبه مرة أخرى إن أحببت.» (7.4, 5.9). */
export function applyInterruptedLine(): string {
  return "التقديم ما اكتمل. اطلبه مرة ثانية لو تبي.";
}

/** The 5.9 "Sent" reply from the REAL record (used when the server's held text does not match the record). */
export function applySentReply(application: Application): string {
  const job = getJob(application.jobId);
  return job.real
    ? T.applyPrepared(job.title, job.company, application.number, application.matchAtSend, application.xpPaid)
    : T.applySent(job.title, application.number, application.matchAtSend, application.xpPaid);
}

/**
 * «قدّمت على هذه الوظيفة من قبل، وحالة طلبك «{status}».» (5.9). A real posting (20 Nov 2026) has no simulated status: it was
 * prepared, and the user sends it from the original posting.
 */
export function applyAlreadyReply(status: ApplicationStatus, real = false): string {
  if (real) return "جهّزت لك طلب ذي الوظيفة من قبل. باقي ترسله أنت من الإعلان الأصلي، وتلقاه في «طلباتي».";
  return `قدّمت على ذي الوظيفة من قبل، وحالة طلبك ${q(APPLICATION_STATUS_COPY[status].label)}.`;
}

/** «تعذّر الرد الآن. جرّب مرة أخرى.» (3.14 error). */
export function replyFailedLine(): string {
  return "ما قدرت أرد الحين. جرّب مرة ثانية.";
}

/**
 * The lock reason inside «لا أستطيع بدءها الآن: {reason}.». The 3.10 label is «تتطلب: Excel»; inside this sentence,
 * after a colon already, it is written without its own colon («…الآن: تتطلب Excel.»). The star form is the same as 3.10.
 */
export function lockReasonInSentence(lock: LockReason): string {
  const skill = getSkill(lock.skill).name;
  return lock.kind === "prereq" ? `تحتاج قبلها ${skill}` : `تحتاج النجمة ${lock.star} في ${skill}`;
}

/**
 * The 5.9 "Cannot start" lines, when start_course was refused (by the router's tool result, or by the store when the
 * dispatcher ran it): locked «ما أقدر أبداها الحين: {reason}.» · credited «ذي النجمة عندك أصلاً، فما تحتاج ذي الخطوة.» ·
 * completed «خلّصت ذي الخطوة من قبل.» (a learning step: the guide of one skill's next star, 20 Nov 2026).
 */
export function startCourseRefusedLine(reason: "locked" | "credited" | "completed", courseId: CourseId, facts: UserFacts): string {
  if (reason === "credited") return "ذي النجمة عندك أصلاً، فما تحتاج ذي الخطوة.";
  if (reason === "completed") return "خلّصت ذي الخطوة من قبل.";
  const state = courseState(courseId, facts);
  return state.state === "locked" ? `ما أقدر أبداها الحين: ${lockReasonInSentence(state.lock)}.` : "ما أقدر أبداها الحين.";
}

/**
 * 5.5 rule 7: an action that would move the page while the apply sheet is open or a show is running is not applied.
 * The router emits no action in that case (it sees `page.applySheetOpen || page.showRunning`) and answers this instead;
 * the dispatcher, which re-checks on the client, resolves `blocked` and the panel shows this too. Text: spec 5.9 has no
 * line, so PROVISIONAL copy (open question for the product agent / the lead): «أكمل ما أمامك أولاً، ثم أفتح لك {page}.»
 * with {page} as in 5.9 "Opening a page" (for apply / start_course / set_target: the job title or «دليل {skill}»). Chips: one role "chip", slug `open-{screen}`, label «افتح {page}», payload { intent: "open", to } for the page
 * the action would have opened (a later press is a new message, answered normally).
 */
export function blockedActionReply(action: AdvisorAction, facts: UserFacts): { readonly text: string; readonly chips: readonly Chip[] } {
  void facts;
  const to =
    action.type === "navigate"
      ? action.to
      : action.type === "start_course"
        ? ({ screen: "course", courseId: action.courseId } as const)
        : ({ screen: "job", jobId: action.jobId } as const);
  return {
    text: `كمّل اللي قدّامك أول، وبعدها أفتح لك ${pageName(to)}.`,
    chips: [{ slug: `open-${to.screen}`, label: openChipLabel(to), role: "chip", payload: { intent: "open", to } }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The 5.9 bank. Pure string builders; numbers arrive already computed by the tools (5.3: no reply computes a %).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const pct = (n: number): string => `${formatNumber(n)}%`;

/**
 * The honesty sentence after applying to the PRACTICE job (5.5 rule 16; 20 Nov 2026: the simulated multi-site step is
 * gone, and this says what happens on a real job instead).
 */
export const HONESTY_APPLY = "وللأمانة: ذي وظيفة تدريبية، وما وصل طلبك لأي جهة. في الوظائف الحقيقية أفتح لك الإعلان الأصلي عشان ترسله.";
/** The jobs sentence, the first time jobs come up in a thread (5.1, 5.9): real postings, dated, may have closed. */
export const DISCLOSE_JOBS = "وللعلم: ترى الوظائف هنا إعلانات حقيقية جمعتها في 20 نوفمبر، ويمكن بعضها تسكّر بعدها.";

/** Interest labels inside the why-path sentence: «يوافق اهتمامك بالأرقام والبيانات». */
function interestPhrase(reason: Extract<RevealReason, { kind: "interest" }>): string {
  const label = optionLabel("interest", reason.interest) ?? "";
  return `يناسب اهتمامك ب${label}`;
}

/** One clause of the why-path sentence (5.8) per reason of 4.6. */
function reasonClause(reason: RevealReason): string {
  switch (reason.kind) {
    case "interest":
      return interestPhrase(reason);
    case "major":
      return reason.tier === "primary" ? "قريب من تخصصك" : "تخصصك يخدمك فيه";
    case "experience":
      return reason.band === "entry" ? "يناسب البدايات" : "يناسب خبرتك";
    case "city":
      // a typed place near a job market («شقراء» → the Riyadh job): «قريب منك في الرياض», never «في مدينتك»
      return reason.near ? `قريب منك في ${reason.cityLabel}` : "في مدينتك";
    case "remote":
      return "تقدر تشتغله عن بُعد";
    case "priority":
      return reason.priority === "first-job"
        ? "أقصر طريق لأول وظيفة"
        : reason.priority === "switch"
          ? "ينقلك من مجالك للي تحبه"
          : "يطوّرك في مجالك";
    case "none":
      return "بداية زينة تستكشف فيها خياراتك";
  }
}

export const T = {
  // ── Next step (recommend_next_step) ────────────────────────────────────────────────────────────────────────────
  nextStepCv: (): string =>
    "خطوتك الجاية إنك ترفع سيرتك الذاتية، عشان أعرف وش خلّصت من مراحل مسارك. أفتح لك صفحة السيرة؟",
  /** A step already started (rule 2): a guide has no lessons, so «started» just means "learning it now". */
  nextStepContinue: (skill: string): string => `كمّل اللي بديته في ${skill}. أفتح لك الدليل؟`,
  nextStepCourse: (skill: string, xp: number, target: string, match: number, after: number): string =>
    `خطوتك الجاية: ${skill}. تعطيك ${formatNumber(xp)} XP وترفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}، وجهّزت لك أحسن مكان تتعلّمها منه. أفتح لك الدليل؟`,
  nextStepPrep: (skill: string, xp: number, prepares: string): string =>
    `خطوتك الجاية: ${skill}. تعطيك ${formatNumber(xp)} XP، وهي تمهيدية: تفتح لك مهارة ${prepares} في مسارك. أفتح لك الدليل؟`,
  nextStepApply: (target: string): string => `مطابقتك مع ${q(target)} 100%. خطوتك الجاية إنك تقدّم عليها. أقدّم عنك؟`,
  nextStepDone: (target: string): string =>
    `خلّصت مسارك وقدّمت على ${q(target)}. اختر هدفك الجاي من الوظائف القريبة منك.`,
  /** PROVISIONAL (QA): the next step is the guide already on screen (5.2: he knows where the user is), not started. */
  nextStepHereCourse: (xp: number, target: string, match: number, after: number): string =>
    `أنت على دليلها الحين: تعطيك ${formatNumber(xp)} XP وترفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}. أبدأ لك الخطوة؟`,
  /** PROVISIONAL (QA): the same for a preparatory step. */
  nextStepHerePrep: (xp: number, skill: string): string =>
    `أنت على دليلها الحين: تعطيك ${formatNumber(xp)} XP، وهي تمهيدية: تفتح لك مهارة ${skill} في مسارك. أبدأ لك الخطوة؟`,
  /** PROVISIONAL (QA): the next step is the started step whose guide is on screen. */
  nextStepHereContinue: (): string => "أنت على دليلها الحين وبديت فيها. تعلّم من الكورس، وإذا خلّصت اضغط «خلّصتها»، وأنا معك.",

  // ── Opening a page (navigate) ──────────────────────────────────────────────────────────────────────────────────
  openPath: (n: number, total: number, skill: string): string =>
    `تفضّل، هذا مسارك. أنت في المرحلة ${n} من ${total}، واللي بعدها ${skill}.`,
  openPathBeforeCv: (): string => "تفضّل، هذا مسارك. وأول خطوة فيه ترفع سيرتك الذاتية.",
  openPathComplete: (): string => "تفضّل، هذا مسارك، وخلّصته كله.",
  openCv: (): string =>
    "أبشر. فتحت لك صفحة السيرة: ارفع ملف PDF أو Word، أو الصق النص. وإذا ما هي جاهزة جرّب السيرة التجريبية.",
  openPage: (page: string): string => `تفضّل، فتحت لك ${page}.`,

  // ── Jobs ───────────────────────────────────────────────────────────────────────────────────────────────────────
  searchSeveral: (count: number, title: string, match: number): string =>
    `لقيت ${countNoun(count, "job", "object")}. الأقرب لمهاراتك ${q(title)} بمطابقة ${pct(match)}.`,
  searchOne: (title: string, match: number): string => `لقيت وظيفة وحدة: ${q(title)}، ومطابقتك معها ${pct(match)}.`,
  searchNone: (): string => "ما لقيت وظائف بذي المواصفات. هذي أقرب ثلاث لمهاراتك.",
  searchShowed: (): string => "فتحت لك القائمة.",
  searchShowedAndDisclosed: (): string =>
    "فتحت لك القائمة، وللعلم: ترى الوظائف هنا إعلانات حقيقية جمعتها في 20 نوفمبر، ويمكن بعضها تسكّر بعدها.",
  bestJob: (title: string, match: number, t2: string, t3: string): string =>
    `أنسب وظيفة لمهاراتك الحين ${q(title)} بمطابقة ${pct(match)}، وبعدها ${q(t2)} و${q(t3)}.`,
  bestJobNoStars: (title: string): string =>
    `للحين ما قريت سيرتك، فكل المطابقات 0%. على حسب إجاباتك، الأقرب لك ${q(title)}. ارفع سيرتك عشان أرتّبها على مهاراتك.`,
  explainIntro: (): string => "الوظيفة تطلب خمس مهارات، وكل وحدة بـ 20%.",
  explainMet: (list: string, metPoints: number): string => `اللي مكتمل عندك: ${list} (${pct(metPoints)}).`,
  explainPartial: (skill: string, held: string, need: string, points: number): string =>
    `${skill}: عندك ${held} من ${need} (${pct(points)}).`,
  explainNone: (list: string): string => `وللحين ما عندك نجوم في: ${list} (0%).`,
  explainTotal: (match: number, skill: string, after: number): string =>
    `المجموع ${pct(match)}، وخطوة ${skill} توصّلك لـ ${pct(after)}.`,
  explainTotalFull: (): string => "المجموع 100%: مستوفي المتطلبات كلها.",
  gap: (title: string, missing: string, skill: string, match: number, after: number): string =>
    `ناقصك لوظيفة ${q(title)}: ${missing}. أقرب خطوة تتعلّم ${skill}، وترفع مطابقتك من ${pct(match)} إلى ${pct(after)}.`,
  gapNone: (title: string): string => `ما ينقصك شي لوظيفة ${q(title)}. مطابقتك 100%.`,

  // ── Applying (apply_to_job) ────────────────────────────────────────────────────────────────────────────────────
  /** The PRACTICE job (the demo's «محلل بيانات»): saved in Dalilak, nothing reaches anyone, and it says so. */
  applySent: (title: string, number: string, match: number, xp: number): string =>
    xp > 0
      ? `تم، قدّمت لك على ${q(title)} برقم ${number} ومطابقتك ${pct(match)}، وكسبت ${formatNumber(xp)} XP. ${HONESTY_APPLY} تقدر تتابعه من «طلباتي».`
      : `تم، قدّمت لك على ${q(title)} برقم ${number} ومطابقتك ${pct(match)}، وبدون نقاط لأن المطابقة أقل من 60%. ${HONESTY_APPLY} تقدر تتابعه من «طلباتي».`,
  /**
   * A REAL posting (20 Nov 2026): «دليلك» filled and saved it, the user sends it from the original posting. He never says
   * he sent it: «جهّزت»; the button and the copied note are named.
   */
  applyPrepared: (title: string, company: string, number: string, match: number, xp: number): string =>
    xp > 0
      ? `أبشر، جهّزت طلبك على ${q(title)} عند ${company} برقم ${number} ومطابقتك ${pct(match)}، وكسبت ${formatNumber(xp)} XP. الإرسال عليك: اضغط «افتح الإعلان الأصلي وقدّم»، وأنسخ لك رسالة التقديم عشان تلصقها هناك. وتلقاه في «طلباتي».`
      : `أبشر، جهّزت طلبك على ${q(title)} عند ${company} برقم ${number} ومطابقتك ${pct(match)}، وبدون نقاط لأن المطابقة أقل من 60%. الإرسال عليك: اضغط «افتح الإعلان الأصلي وقدّم»، وأنسخ لك رسالة التقديم عشان تلصقها هناك. وتلقاه في «طلباتي».`,
  applyWhich: (): string => "أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.",
  applyLowMatch: (match: number): string =>
    `مطابقتك مع ذي الوظيفة ${pct(match)} بس، أقل من 60%. الأحسن نسدّ الفجوة أول. تبيني أقدّم ولو كذا؟`,
  applyOffer: (title: string): string => `أقدّم لك على ${q(title)}؟`,

  // ── Learning steps (start_course, get_course, list_courses). Since 20 Nov 2026 a course is a learning STEP the user
  //    meets as the guide of one skill: a real top pick («ابدأ بهذا»), alternatives, people, articles; «خلّصتها» completes
  //    it (self-reported). «دليلك» names the skill, never the internal course title, and never lessons.
  courseStarted: (skill: string, top: string, provider: string, after: number | null): string =>
    after === null
      ? `بدينا خطوة ${skill}. فتحت لك دليلها، واضغط «ابدأ بهذا» يفتح لك ${q(top)} من ${provider}. إذا خلّصته ارجع واضغط «خلّصتها». الله يوفقك.`
      : `بدينا خطوة ${skill}. فتحت لك دليلها، واضغط «ابدأ بهذا» يفتح لك ${q(top)} من ${provider}. إذا خلّصته ارجع واضغط «خلّصتها» وتطلع مطابقتك لـ ${pct(after)}. الله يوفقك.`,
  courseAlreadyStarted: (skill: string): string =>
    `بديت خطوة ${skill} من قبل. فتحت لك دليلها، وإذا خلّصت اضغط «خلّصتها».`,
  courseWhich: (): string => "أبشر. وش تبي تتعلّم؟ هذي خطوات مسارك.",
  /** «وش في ذا الدليل؟»: the top pick with what the data says, then what finishing the step gives. */
  courseWhat: (
    skill: string,
    top: string,
    provider: string,
    facts: string,
    star: number,
    xp: number,
    after: number | null,
  ): string =>
    after === null
      ? `دليل ${skill}: أحسن بداية ${q(top)} من ${provider}، ${facts}. وإذا خلّصت الخطوة تاخذ النجمة ${star} في ${skill} و${formatNumber(xp)} XP.`
      : `دليل ${skill}: أحسن بداية ${q(top)} من ${provider}، ${facts}. وإذا خلّصت الخطوة تاخذ النجمة ${star} في ${skill} و${formatNumber(xp)} XP، وترتفع مطابقتك مع هدفك لـ ${pct(after)}.`,
  /** The guide also has people to follow and / or articles (named only when it has them). */
  courseWhatMore: (people: boolean, articles: boolean): string =>
    people && articles
      ? "وفي الدليل بعد ناس تتابعهم ومقالات تقراها."
      : people
        ? "وفي الدليل بعد ناس تتابعهم."
        : articles
          ? "وفي الدليل بعد مقالات تقراها."
          : "",
  courseGain: (skill: string, target: string, match: number, after: number): string =>
    `إذا خلّصت خطوة ${skill} ترتفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}.`,
  courseGainOffPath: (target: string): string =>
    `ذي الخطوة برّا مسارك الحالي، فما تغيّر مطابقتك مع ${q(target)}.`,
  courseGainPrep: (skill: string): string =>
    `ذي خطوة تمهيدية: ما ترفع المطابقة على طول، بس تفتح لك مهارة ${skill} في مسارك.`,
  pathCourses: (count: number, skill: string): string =>
    count === 1
      ? `باقي لك في مسارك خطوة وحدة: ${skill}.`
      : `باقي لك في مسارك ${countNoun(count, "stage", "object")}، وأولها ${skill}.`,
  pathCoursesNone: (): string => "خلّصت كل خطوات مسارك.",
  shortCourses: (): string => "هذي أقصر خطوات التعلّم المتاحة لك الحين.",
  /** PROVISIONAL (5.4 gives only the apply offer): a model's start_course call becomes this offer. */
  startOffer: (skill: string): string => `أبدأ لك خطوة ${skill}؟`,

  // ── The guides themselves («وين أتعلم SQL؟», «مين أتابع في البيانات؟», «وش أقرأ عن Power BI؟»), 20 Nov 2026 ─────
  /** Why this skill: it is the user's next step (with the match it brings when it raises it); `started`: rule 2. */
  guideLeadNext: (skill: string, started: boolean, target: string | null, match: number | null, after: number | null): string => {
    const head = started ? `كمّل اللي بديته في ${skill}` : `خطوتك الجاية ${skill}`;
    return target && match !== null && after !== null && after > match
      ? `${head}، وترفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}.`
      : `${head}.`;
  },
  /** Why this skill: the nearest one to the user in the field they named. */
  guideLeadField: (field: string, skill: string): string => `أقرب مهارة لك في ${field} الحين ${skill}.`,
  /** The top pick, with what the data says about it. `lead`: the skill was explained just before. */
  guideTop: (skill: string, top: string, provider: string, facts: string, lead: boolean): string =>
    lead
      ? `أحسن مكان تتعلّمها منه ${q(top)} من ${provider}، ${facts}.`
      : `أحسن مكان تتعلّم منه ${skill}: ${q(top)} من ${provider}، ${facts}.`,
  /** The pick's reason, from the data. */
  guideWhy: (why: string): string => `ليش هو؟ ${why}`,
  /** The tails: `guide` is the guide just opened, or null when it is already on screen (5.2: nothing to open). */
  guideTopTail: (guide: string | null): string =>
    guide ? `فتحت لك ${q(guide)}، ومتى ما جهزت اضغط «ابدأ بهذا».` : "والدليل قدّامك: متى ما جهزت اضغط «ابدأ بهذا».",
  guidePeopleHead: (skill: string, lead: boolean): string => (lead ? "ناس يستاهلون تتابعهم فيها:" : `ناس يستاهلون تتابعهم في ${skill}:`),
  /** «Leila Gharani (YouTube / XelPlus): …»; a name that has its own brackets takes the platform after a comma. */
  guidePerson: (name: string, platform: string, why: string): string =>
    name.includes("(") ? `${name}، ${platform}: ${why}` : `${name} (${platform}): ${why}`,
  guidePeopleTail: (guide: string | null): string => (guide ? `فتحت لك ${q(guide)}، وفيه روابطهم.` : "وروابطهم في الدليل اللي قدّامك."),
  guidePeopleNone: (skill: string, guide: string | null, top: string, provider: string): string =>
    guide
      ? `ما عندي للحين أسماء متأكد منها أرشّحها في ${skill}. فتحت لك ${q(guide)}، وفيه أحسن مكان تتعلّمها منه: ${q(top)} من ${provider}.`
      : `ما عندي للحين أسماء متأكد منها أرشّحها في ${skill}. وأحسن مكان تتعلّمها منه في الدليل اللي قدّامك: ${q(top)} من ${provider}.`,
  guideReadHead: (skill: string, lead: boolean): string => (lead ? "اقرا عنها:" : `تبي تقرا عن ${skill}؟ ذي أحسن اللي عندي:`),
  guideArticle: (title: string, author: string, why: string): string =>
    author.includes("(") ? `${q(title)}، ${author}: ${why}` : `${q(title)} (${author}): ${why}`,
  guideReadTail: (guide: string | null): string => (guide ? `فتحت لك ${q(guide)}، وفيه روابطها.` : "وروابطها في الدليل اللي قدّامك."),
  guideReadNone: (skill: string, guide: string | null, top: string, provider: string): string =>
    guide
      ? `ما عندي للحين مقالات متأكد منها عن ${skill}. فتحت لك ${q(guide)}، وأحسن بداية فيه ${q(top)} من ${provider}.`
      : `ما عندي للحين مقالات متأكد منها عن ${skill}. وأحسن بداية في الدليل اللي قدّامك ${q(top)} من ${provider}.`,
  /** The step of that skill cannot start yet (the guide page explains the lock too). */
  guideLocked: (reason: string): string => `وترى الخطوة للحين مقفلة: ${reason}.`,
  /** Every star of that skill is held already. */
  guideAllHeld: (skill: string): string => `وترى نجوم ${skill} كلها عندك، فذا لو تبي تتعمّق.`,

  // ── Target (set_target_job) ────────────────────────────────────────────────────────────────────────────────────
  targetChanged: (title: string, match: number, remaining: number, skill: string | null): string => {
    const head = `تم. هدفك الحين ${q(title)} ومطابقتك معه ${pct(match)}`;
    const tail = "فتحت لك المسار الجديد.";
    if (remaining === 0 || skill === null) return `${head} ومستوفي متطلباته كلها. ${tail}`;
    if (remaining === 1) return `${head}. باقي لك مرحلة وحدة: ${skill}. ${tail}`;
    return `${head}. باقي لك ${countNoun(remaining, "stage", "object")}، وتبدأ ${withBa(skill)}. ${tail}`;
  },
  targetWhich: (): string => "أبشر. أي وظيفة تبيها هدفك؟ هذي أقرب ثلاث لمهاراتك.",
  targetAlready: (): string => "ذي هي هدفك الحالي أصلاً.",
  /** PROVISIONAL (5.4 gives only the apply offer): a model's set_target_job call becomes this offer. */
  targetOffer: (title: string): string => `أخلّي ${q(title)} هدفك؟`,

  // ── Game ───────────────────────────────────────────────────────────────────────────────────────────────────────
  climbHead: (rank: number, xp: number, gap: number, rankAbove: number): string =>
    `أنت في المركز ${rank} ذا الأسبوع بـ ${formatNumber(xp)} XP، وبينك وبين المركز ${rankAbove} ${formatNumber(gap)} XP.`,
  /** PROVISIONAL first-place form of the climb head (5.9 gives the gap form only). */
  climbHeadFirst: (xp: number): string => `أنت في المركز 1 ذا الأسبوع بـ ${formatNumber(xp)} XP. أنت في الصدارة، حافظ عليها.`,
  climbCourse: (skill: string, courseXp: number, newRank: number): string =>
    `أسرع طريق تطلع فيه: كمّل خطوة ${skill}، تاخذ ${formatNumber(courseXp)} XP وتطلع للمركز ${newRank}.`,
  climbLabel: (label: string): string => `أسرع طريق تطلع فيه: ${label}.`,
  rankGap: (gap: number, rankAbove: number): string => `بينك وبين المركز ${rankAbove} ${formatNumber(gap)} XP.`,
  rankFirst: (): string => "أنت في الصدارة، حافظ عليها.",
  xpLevel: (xp: number, level: number, title: string, toNext: number, streak: number): string =>
    `عندك ${formatNumber(xp)} XP وأنت في المستوى ${level} · ${title}. باقي لك ${formatNumber(toNext)} XP للمستوى ${level + 1}، وسلسلتك ${countNoun(streak, "day", "object")}.`,
  xpLevelTop: (xp: number, streak: number): string =>
    `عندك ${formatNumber(xp)} XP ووصلت أعلى مستوى: أسطورة. وسلسلتك ${countNoun(streak, "day", "object")}.`,
  streak: (streak: number): string =>
    `سلسلتك الحين ${countNoun(streak, "day", "object")}. ادخل كل يوم عشان تكبر مكافأتك: 20 XP عن كل يوم، لين 100.`,
  badgeNext: (first: string, hint: string, second: string | null): string =>
    `أقرب شارة لك ${q(first)}: ${hint}${second ? ` ومعها تاخذ ${q(second)}.` : ""}`,
  badgesAll: (): string => "جمعت الشارات كلها. ما شاء الله عليك.",
  applicationsNone: (): string => "للحين ما قدّمت على أي وظيفة. لو تبي أقدّم عنك.",
  applicationsOne: (title: string, status: string): string =>
    `عندك طلب واحد: ${q(title)}، وحالته الحين ${q(status)}. وللتذكير: متابعة الطلبات هنا محاكاة، وما فيه جهة حقيقية تراجعه.`,
  applicationsMore: (count: number, title: string, status: string): string =>
    `عندك ${countNoun(count, "application", "object")}، وآخرها ${q(title)} وحالته ${q(status)}. وللتذكير: متابعة الطلبات هنا محاكاة.`,
  /** The newest application is to a REAL posting (20 Nov 2026): prepared here, sent by the user; no company status is known. */
  applicationsOneReal: (title: string, company: string): string =>
    `عندك طلب واحد: ${q(title)} عند ${company}. جهّزته لك، وباقي ترسله أنت من الإعلان الأصلي، وما أقدر أشوف رد الشركة.`,
  applicationsMoreReal: (count: number, title: string, company: string): string =>
    `عندك ${countNoun(count, "application", "object")}، وآخرها ${q(title)} عند ${company}: جهّزته لك، وترسله أنت من الإعلان الأصلي.`,

  // ── Conversation ───────────────────────────────────────────────────────────────────────────────────────────────
  greetingSalam: (name: string): string => `وعليكم السلام ورحمة الله، حيّاك الله يا ${name}.`,
  greetingHala: (name: string): string => `هلا والله يا ${name}.`,
  greetingMatch: (target: string, match: number, remaining: number): string =>
    `مطابقتك مع ${q(target)} ${pct(match)} وباقي لك ${countNoun(remaining, "stage", "object")}.`,
  greetingBeforeCv: (target: string): string => `مسارك لـ ${q(target)} ينتظر سيرتك الذاتية.`,
  greetingComplete: (target: string): string => `مطابقتك مع ${q(target)} 100%.`,
  greetingTail: (): string => "من وين نبدأ؟",
  thanks: (): string => "العفو، الله يعطيك العافية. أنا هنا متى ما احتجتني.",
  who: (): string =>
    "أنا دليلك إلى وظيفتك. أشرح لك مسارك، وأدلّك وين تتعلّم كل مهارة، وأفتح لك الصفحات، وأقدّم على الوظائف إذا طلبت. أما التعلّم فعليك أنت.",
  notNow: (): string => "تمام، متى ما بغيت.",
  /** 20 Nov 2026: the guides' courses, people and articles are real (links opened that day); the rest is still sample. */
  isReal: (): string =>
    "للأمانة: الوظائف إعلانات حقيقية جمعتها في 20 نوفمبر 2026، ولكل وحدة رابط إعلانها الأصلي، إلا «محلل بيانات» فهي وظيفة تدريبية. وفي الوظائف الحقيقية أجهّز لك الطلب وترسله أنت من الإعلان. أما أدلة التعلّم فحقيقية: الكورسات والناس والمقالات كلها حقيقية، وتأكدنا من روابطها في 20 نوفمبر 2026. والمتسابقين الباقين بيانات تجريبية، واللي ينحسب فعلاً مهاراتك ومطابقتك ومسارك.",
  realNumbers: (): string =>
    "سؤال في محله، بس ما عندي أرقام موثوقة عن سوق العمل أو الرواتب، وما أحب أعطيك شي من عندي. اللي أعرفه بالضبط مطابقتك ومهاراتك وخطوتك الجاية، وتقدر تسألني عنها.",
  completeForMe: (): string =>
    "ذي ما أقدر عليها، ولا أحد يقدر عليها غيرك: النجمة تنكسب لما تتعلّم بنفسك وتضغط «خلّصتها». اللي أقدر عليه أفتح لك الدليل الحين وأكون معك. أفتحه؟",
  /** PROVISIONAL (QA): the same refusal while the guide is already on screen (no offer to open it). */
  completeForMeHere: (): string =>
    "ذي ما أقدر عليها، ولا أحد يقدر عليها غيرك: النجمة تنكسب لما تتعلّم بنفسك. إذا خلّصت الكورس اضغط «خلّصتها»، وأنا معك.",
  /** PROVISIONAL (QA): «أعطني 500 XP» and the like (5.7 row 1), with the way to earn them filled from the next step. */
  grantHead: (): string => "النقاط والشارات ما أعطيها أنا: تنكسب بخطوات التعلّم والتقديم.",
  /** PROVISIONAL (QA): the same for skill stars. */
  grantStarsHead: (): string => "النجوم ما أعطيها أنا: كل نجمة تنكسب لما تتعلّم خطوتها بنفسك.",
  grantTailCourse: (skill: string, xp: number): string =>
    `أقرب طريق الحين خطوة ${skill} وتعطيك ${formatNumber(xp)} XP. أفتح لك الدليل؟`,
  grantTailHere: (xp: number): string => `وأنت على أقرب طريق الحين: ذي الخطوة تعطيك ${formatNumber(xp)} XP إذا خلّصتها.`,
  grantTailCv: (xp: number): string =>
    `أقرب طريق الحين إنك ترفع سيرتك الذاتية، وتعطيك ${formatNumber(xp)} XP. أفتح لك صفحة السيرة؟`,
  grantTailApply: (target: string, xp: number): string =>
    `أقرب طريق الحين إنك تقدّم على ${q(target)}، وتعطيك ${formatNumber(xp)} XP. أقدّم عنك؟`,
  grantTailDone: (): string => "اختر هدفك الجاي من الوظائف القريبة منك.",
  /** PROVISIONAL (QA): a request to make up an employer or a job (5.1, 5.5 rule 2), with the three nearest jobs. */
  inventRefusal: (): string =>
    "ما أخترع جهات ولا وظائف: عندي بس الإعلانات اللي جمعتها وتأكدت منها، وما أجهّز إلا على وحدة منها. هذي أقرب ثلاث لمهاراتك.",
  /** PROVISIONAL (QA): «تمام» / «طيب» / «اوكي» when the last reply offered nothing to say yes to. */
  ackIdle: (): string => "تمام. متى ما احتجتني تراني هنا.",
  fallback: (): string =>
    "سامحني، ما عندي جواب زين على ذي. أقدر أساعدك في مسارك ووظايفك ووين تتعلّم: أقول لك خطوتك الجاية، أو أفتح لك صفحة، أو أشرح لك مطابقتك.",
  /** Worry, fear, frustration (18 Nov 2026, "be nice"): said before the real next step, so the comfort is followed by
   *  one small thing to do, with the user's own numbers. */
  feelingsLead: (): string => "أفهمك، والشعور هذا طبيعي وأغلب الناس يمرون فيه بالبداية. خلّنا نركّز على اللي بيدك:",
  /** «كيف أكتب سيرة ذاتية قوية؟»: general advice, then what Dalilak does with it. */
  cvTips: (): string =>
    "نصيحتي لسيرة قوية: ابدأ بسطرين عن هدفك، واكتب كل مهارة مع مثال يثبتها من دراستك أو مشروع أو تدريب، وخلّها صفحة وحدة واضحة. وإذا رفعتها هنا أوريك وش المهارات اللي لقيتها والجملة اللي تثبت كل وحدة.",
  /** «عطني نصيحة للمقابلة»: general and honest, nothing about any real employer. */
  interviewTips: (target: string | null): string =>
    `${target ? `ثلاث نصايح تفرق معك في مقابلة ${q(target)}` : "ثلاث نصايح تفرق معك في أي مقابلة"}: جهّز مثالين من دراستك أو مشروع سويته يبيّنون مهاراتك، واقرأ عن الجهة ووش تسوي قبل لا تدخل، وجاوب بهدوء وبأمثلة مو بكلام عام. وإذا ما عرفت شي، قلها بصراحة وقل كيف بتتعلمه.`,
  /** PROVISIONAL: a tool call with an id that is not in the data (5.5 rule 2), when no template applies. */
  notFound: (): string => "ما لقيتها في بيانات المنصة. جرّب اسم ثاني، أو اسألني: وش أسوي الحين؟",

  // ── Fixed answers of 5.8 ───────────────────────────────────────────────────────────────────────────────────────
  whyPath: (reasons: readonly RevealReason[]): string => {
    const clauses = reasons.length > 0 ? reasons.map(reasonClause) : [reasonClause({ kind: "none" })];
    return `اخترته لك لأنه ${joinCommaAnd(clauses)}. وتقدر تغيّره من صفحة الوظائف.`;
  },
  /** No hours since 20 Nov 2026: the internal course hours are not the real courses' hours. */
  remaining: (stages: number, target: string): string =>
    `باقي لك ${countNoun(stages, "stage", "object")} عشان توصل 100% مع ${q(target)}.`,
  remainingDone: (target: string): string => `خلّصت مسارك: مطابقتك 100% مع ${q(target)}.`,
  starsHow: (): string =>
    "النجمة الأولى لمهارة مذكورة في سيرتك، والثانية إذا طلعت في خبرة أو مشروع، والثالثة إذا انوصفت إنها متقدمة. وبعدها كل خطوة تعلّم تخلّصها تزيدك نجمة.",
  cvWhat: (): string => "أدوّر على 38 مهارة بأسمائها، وأحفظ لكل مهارة الجملة اللي تثبتها عشان تشوفها بنفسك.",
  cvNone: (): string =>
    "ولا يهمك. الصق أي نص يوصف دراستك وخبرتك، أو جرّب السيرة التجريبية، أو ابدأ مسارك بدون سيرة.",
  levelHow: (toNext: number | null, nextLevel: number | null): string =>
    toNext === null || nextLevel === null
      ? "المستوى يرتفع بالـ XP، وأكثر شي يجيبه إنك تخلّص خطوات التعلّم."
      : `المستوى يرتفع بالـ XP، وأكثر شي يجيبه إنك تخلّص خطوات التعلّم. باقي لك ${formatNumber(toNext)} XP للمستوى ${nextLevel}.`,
} as const;

/** «نجمة»/«نجمتان» as the held count and «نجمتين»/«3 نجوم» after «من» (5.6 example 5: «عندك نجمة من نجمتين»). */
export function heldStarsWord(held: number): string {
  if (held === 1) return "نجمة";
  if (held === 2) return "نجمتين";
  return countNoun(held, "star");
}
export function needStarsWord(need: number): string {
  if (need === 1) return "نجمة";
  if (need === 2) return "نجمتين";
  return countNoun(need, "star", "object");
}
