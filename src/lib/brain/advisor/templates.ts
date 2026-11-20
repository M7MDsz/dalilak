// Owner: brain-advisor. «دليل»'s fixed words that the BROWSER also needs (pure, client-safe), and the full 5.9 template
// bank (the router and the local brain use it). Every Arabic string here is final copy from spec 3.14, 4.6, 5.6, 5.8, 5.9
// and 7.4, written exactly; the few lines the spec does not give are marked PROVISIONAL.
// VOICE: «دليل» speaks Saudi Najdi, not Fusha (Mohammed, 18 Nov 2026). UI labels elsewhere stay in Fusha.
// Imports: types, ids, data, copy, engine, text and protocol TYPES only. NEVER @/lib/store/** (the persisted store imports
// this file for applyInterruptedLine; brain code that needs transitions does so in router.ts / tools.ts, not here).
import { APPLICATION_STATUS_COPY, countNoun } from "@/lib/copy";
import { APPLY_SITES, getJob, getSkill, optionLabel } from "@/lib/data";
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

import { firstName, joinAnd, joinCommaAnd, openChipLabel, pageName, q } from "./phrasing";

/** «دليل يفكّر…» (3.14: before any tool runs). */
export const THINKING_LINE: string = "دليل يفكّر…";

/** The status line of each tool (5.3). apply_to_job's three lines follow the apply run: see applyStatusLine. */
export const TOOL_STATUS: Readonly<Record<ToolName, string>> = {
  navigate: "أفتح لك الصفحة…",
  search_jobs: "أدوّر لك في الوظائف…",
  get_job_gap: "أقارن مهاراتك بالمطلوب…",
  explain_match: "أحسب لك المطابقة…",
  recommend_next_step: "أشوف مسارك…",
  list_courses: "أشوف الدورات…",
  get_course: "أشوف الدورة…",
  start_course: "أبدأ لك الدورة…",
  apply_to_job: "أفتح نموذج التقديم…",
  list_applications: "أشوف طلباتك…",
  set_target_job: "أرسم مسارك من جديد…",
  get_leaderboard: "أشوف الترتيب…",
  list_badges: "أشوف شاراتك…",
};

/** Step 1 «أفتح نموذج التقديم…» · steps 2-4 «أعبّي بياناتك…» · step 5 «أرسل الطلب…» · 0 and 6: null (7.4). */
export function applyStatusLine(step: ApplyStep): string | null {
  switch (step) {
    case 1:
      return "أفتح نموذج التقديم…";
    case 2:
    case 3:
    case 4:
      return "أعبّي بياناتك…";
    case 5:
      return "أرسل الطلب…";
    default:
      return null;
  }
}

/** First open after onboarding, and after «محادثة جديدة» (3.14): «أهلاً من جديد يا {name}. مسارك نحو «{target}» جاهز، …». */
export function firstOpenMessage(facts: UserFacts): string {
  const name = firstName(facts.name);
  const target = facts.targetJobId ? getJob(facts.targetJobId).title : null;
  const path = target ? `مسارك لـ ${q(target)} جاهز` : "مسارك جاهز";
  return `هلا والله من جديد يا ${name}. ${path}، وأنا معك خطوة بخطوة. اسألني عن مسارك أو الدورات أو الوظائف، أو قل لي: وش أسوي الحين؟`;
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
  return T.applySent(getJob(application.jobId).title, application.number, application.matchAtSend, application.xpPaid);
}

/** «قدّمت على هذه الوظيفة من قبل، وحالة طلبك «{status}».» (5.9). */
export function applyAlreadyReply(status: ApplicationStatus): string {
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
function lockReasonInSentence(lock: LockReason): string {
  const skill = getSkill(lock.skill).name;
  return lock.kind === "prereq" ? `تحتاج قبلها ${skill}` : `تحتاج النجمة ${lock.star} في ${skill}`;
}

/**
 * The 5.9 "Cannot start" lines, when start_course was refused (by the router's tool result, or by the store when the
 * dispatcher ran it): locked «لا أستطيع بدءها الآن: {reason}.» (reason = copy `lockReasonText` of the course's lock) ·
 * credited «هذه النجمة مثبتة عندك، فلا تحتاج هذه الدورة.» · completed «أكملت هذه الدورة من قبل.»
 */
export function startCourseRefusedLine(reason: "locked" | "credited" | "completed", courseId: CourseId, facts: UserFacts): string {
  if (reason === "credited") return "ذي النجمة عندك أصلاً، فما تحتاج ذي الدورة.";
  if (reason === "completed") return "خلّصت ذي الدورة من قبل.";
  const state = courseState(courseId, facts);
  return state.state === "locked" ? `ما أقدر أبداها الحين: ${lockReasonInSentence(state.lock)}.` : "ما أقدر أبداها الحين.";
}

/**
 * 5.5 rule 7: an action that would move the page while the apply sheet is open or a show is running is not applied.
 * The router emits no action in that case (it sees `page.applySheetOpen || page.showRunning`) and answers this instead;
 * the dispatcher, which re-checks on the client, resolves `blocked` and the panel shows this too. Text: spec 5.9 has no
 * line, so PROVISIONAL copy (open question for the product agent / the lead): «أكمل ما أمامك أولاً، ثم أفتح لك {page}.»
 * with {page} as in 5.9 "Opening a page" (for apply / start_course / set_target: the job title or the short course
 * title). Chips: one role "chip", slug `open-{screen}`, label «افتح {page}», payload { intent: "open", to } for the page
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

/** The honesty sentence after every application (5.5 rule 16). */
export const HONESTY_APPLY = "وللأمانة: ترى ذا تقديم تجريبي، وما وصل لأي موقع ولا جهة حقيقية.";
/** «وقدّمت لك بعد في LinkedIn وبيت.كوم وIndeed وموقع الجهة.» (APPLY_SITES, simulated). */
export const APPLY_SITES_LINE = `وقدّمت لك بعد في ${joinAnd(APPLY_SITES.map((s) => s.name))}.`;
/** The sample-data sentence, the first time jobs come up in a thread (5.1, 5.9). */
export const DISCLOSE_JOBS = "وللعلم: ترى كل الوظائف هنا بيانات تجريبية.";

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
      return "في مدينتك";
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
  nextStepContinue: (course: string, ticked: number, total: number): string =>
    `كمّل اللي بديته: دورة ${q(course)}، خلّصت ${ticked} من ${total} دروس. أفتحها لك؟`,
  nextStepCourse: (course: string, hours: string, xp: number, target: string, match: number, after: number): string =>
    `خطوتك الجاية دورة ${q(course)}: ${hours}، تعطيك ${formatNumber(xp)} XP وترفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}. أفتحها لك؟`,
  nextStepPrep: (course: string, hours: string, xp: number, skill: string): string =>
    `خطوتك الجاية دورة ${q(course)}: ${hours}، تعطيك ${formatNumber(xp)} XP. وهي تمهيدية: تفتح لك مهارة ${skill} في مسارك. أفتحها لك؟`,
  nextStepApply: (target: string): string => `مطابقتك مع ${q(target)} 100%. خطوتك الجاية إنك تقدّم عليها. أقدّم عنك؟`,
  nextStepDone: (target: string): string =>
    `خلّصت مسارك وقدّمت على ${q(target)}. اختر هدفك الجاي من الوظائف القريبة منك.`,
  /** PROVISIONAL (QA): the next step is the course already on screen (5.2: he knows where the user is), not started. */
  nextStepHereCourse: (lessons: string, xp: number, target: string, match: number, after: number): string =>
    `أنت عليها الحين: ${lessons} تعطيك ${formatNumber(xp)} XP وترفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}. أبداها لك؟`,
  /** PROVISIONAL (QA): the same for a preparatory course. */
  nextStepHerePrep: (lessons: string, xp: number, skill: string): string =>
    `أنت عليها الحين: ${lessons} تعطيك ${formatNumber(xp)} XP، وهي تمهيدية: تفتح لك مهارة ${skill} في مسارك. أبداها لك؟`,
  /** PROVISIONAL (QA): the next step is the started course already on screen. */
  nextStepHereContinue: (ticked: number, total: number): string =>
    `أنت عليها الحين، وخلّصت ${ticked} من ${total} دروس. كمّل الباقي من هنا، وأنا معك.`,

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
  searchNone: (): string =>
    "ما لقيت وظائف بذي المواصفات. ترى كل الوظائف والجهات هنا بيانات تجريبية، وهذي أقرب ثلاث لمهاراتك.",
  searchShowed: (): string => "فتحت لك القائمة.",
  searchShowedAndDisclosed: (): string => "فتحت لك القائمة، وللعلم: ترى كل الوظائف هنا بيانات تجريبية.",
  bestJob: (title: string, match: number, t2: string, t3: string): string =>
    `أنسب وظيفة لمهاراتك الحين ${q(title)} بمطابقة ${pct(match)}، وبعدها ${q(t2)} و${q(t3)}.`,
  bestJobNoStars: (title: string): string =>
    `للحين ما قريت سيرتك، فكل المطابقات 0%. على حسب إجاباتك، الأقرب لك ${q(title)}. ارفع سيرتك عشان أرتّبها على مهاراتك.`,
  explainIntro: (): string => "الوظيفة تطلب خمس مهارات، وكل وحدة بـ 20%.",
  explainMet: (list: string, metPoints: number): string => `اللي مكتمل عندك: ${list} (${pct(metPoints)}).`,
  explainPartial: (skill: string, held: string, need: string, points: number): string =>
    `${skill}: عندك ${held} من ${need} (${pct(points)}).`,
  explainNone: (list: string): string => `وللحين ما عندك نجوم في: ${list} (0%).`,
  explainTotal: (match: number, course: string, after: number): string =>
    `المجموع ${pct(match)}، ودورة ${q(course)} توصّلك لـ ${pct(after)}.`,
  explainTotalFull: (): string => "المجموع 100%: مستوفي المتطلبات كلها.",
  gap: (title: string, missing: string, course: string, hours: string, match: number, after: number): string =>
    `ناقصك لوظيفة ${q(title)}: ${missing}. أقرب خطوة دورة ${q(course)}: ${hours}، وترفع مطابقتك من ${pct(match)} إلى ${pct(after)}.`,
  gapNone: (title: string): string => `ما ينقصك شي لوظيفة ${q(title)}. مطابقتك 100%.`,

  // ── Applying (apply_to_job) ────────────────────────────────────────────────────────────────────────────────────
  /** «دليل»'s own sends also went to the other sites (APPLY_SITES, simulated): the sentence names them. */
  applySent: (title: string, number: string, match: number, xp: number): string =>
    xp > 0
      ? `تم، أرسلت طلبك على ${q(title)} برقم ${number} ومطابقتك ${pct(match)}، وكسبت ${formatNumber(xp)} XP. ${APPLY_SITES_LINE} ${HONESTY_APPLY} تقدر تتابعه من «طلباتي».`
      : `تم، أرسلت طلبك على ${q(title)} برقم ${number} ومطابقتك ${pct(match)}، وبدون نقاط لأن المطابقة أقل من 60%. ${APPLY_SITES_LINE} ${HONESTY_APPLY} تقدر تتابعه من «طلباتي».`,
  applyWhich: (): string => "أبشر. على أي وظيفة؟ هذي أقرب ثلاث لمهاراتك.",
  applyLowMatch: (match: number): string =>
    `مطابقتك مع ذي الوظيفة ${pct(match)} بس، أقل من 60%. الأحسن نسدّ الفجوة أول. تبيني أقدّم ولو كذا؟`,
  applyOffer: (title: string): string => `أقدّم لك على ${q(title)}؟`,

  // ── Courses (start_course, get_course, list_courses) ───────────────────────────────────────────────────────────
  courseStarted: (course: string, lessons: string, after: number | null): string =>
    after === null
      ? `بدينا. فتحت لك ${q(course)}: ${lessons}. الله يوفقك.`
      : `بدينا. فتحت لك ${q(course)}: ${lessons}، وإذا خلّصتها تطلع مطابقتك لـ ${pct(after)}. الله يوفقك.`,
  courseAlreadyStarted: (ticked: number, total: number): string =>
    `بديتها من قبل، وخلّصت ${ticked} من ${total} دروس. فتحتها لك.`,
  courseWhich: (): string => "أبشر. أي دورة؟ هذي دورات مسارك.",
  courseWhat: (
    short: string,
    hours: string,
    lessons: string,
    first: string,
    last: string,
    star: number,
    skill: string,
    xp: number,
    after: number | null,
  ): string =>
    after === null
      ? `دورة ${q(short)}: ${hours}، ${lessons}، من ${q(first)} إلى ${q(last)}. تعطيك النجمة ${star} في ${skill} و${formatNumber(xp)} XP. وترى هي دورة تجريبية: عناوين دروس بس.`
      : `دورة ${q(short)}: ${hours}، ${lessons}، من ${q(first)} إلى ${q(last)}. تعطيك النجمة ${star} في ${skill} و${formatNumber(xp)} XP، وترفع مطابقتك مع هدفك لـ ${pct(after)}. وترى هي دورة تجريبية: عناوين دروس بس.`,
  courseGain: (course: string, target: string, match: number, after: number): string =>
    `إذا خلّصت ${q(course)} ترتفع مطابقتك مع ${q(target)} من ${pct(match)} إلى ${pct(after)}.`,
  courseGainOffPath: (target: string): string =>
    `ذي الدورة برّا مسارك الحالي، فما تغيّر مطابقتك مع ${q(target)}.`,
  courseGainPrep: (skill: string): string =>
    `ذي دورة تمهيدية: ما ترفع المطابقة على طول، بس تفتح لك مهارة ${skill} في مسارك.`,
  pathCourses: (count: number, course: string, hours: string): string =>
    `الباقي في مسارك: ${countNoun(count, "course", "object")}. ابدأ بدورة ${q(course)}: ${hours}.`,
  pathCoursesNone: (): string => "خلّصت كل دورات مسارك.",
  shortCourses: (): string => "هذي أقصر الدورات المتاحة لك الحين، وكلها 8 ساعات أو أقل.",
  /** PROVISIONAL (5.4 gives only the apply offer): a model's start_course call becomes this offer. */
  startOffer: (course: string): string => `أبدأ لك دورة ${q(course)}؟`,

  // ── Target (set_target_job) ────────────────────────────────────────────────────────────────────────────────────
  targetChanged: (title: string, match: number, remaining: number, course: string | null): string => {
    const head = `تم. هدفك الحين ${q(title)} ومطابقتك معه ${pct(match)}`;
    const tail = "فتحت لك المسار الجديد.";
    if (remaining === 0 || course === null) return `${head} ومستوفي متطلباته كلها. ${tail}`;
    if (remaining === 1) return `${head}. باقي لك مرحلة وحدة: دورة ${q(course)}. ${tail}`;
    return `${head}. باقي لك ${countNoun(remaining, "stage", "object")}، وتبدأ بدورة ${q(course)}. ${tail}`;
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
  climbCourse: (course: string, courseXp: number, newRank: number): string =>
    `أسرع طريق تطلع فيه: كمّل ${q(course)}، تاخذ ${formatNumber(courseXp)} XP وتطلع للمركز ${newRank}.`,
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
    "أنا دليل، دليلك إلى وظيفتك. أشرح لك مسارك، وأفتح لك الصفحات، وأقدّم على الوظائف إذا طلبت. أما الدورات فتكمّلها أنت بنفسك.",
  notNow: (): string => "تمام، متى ما بغيت.",
  isReal: (): string =>
    "للأمانة: الوظائف والجهات والدورات والمتسابقين كلهم بيانات تجريبية، والتقديم محاكاة. اللي ينحسب فعلاً هو مهاراتك ومطابقتك ومسارك.",
  realNumbers: (): string =>
    "سؤال في محله، بس ما عندي أرقام موثوقة عن سوق العمل أو الرواتب، وما أحب أعطيك شي من عندي. اللي أعرفه بالضبط مطابقتك ومهاراتك وخطوتك الجاية، وتقدر تسألني عنها.",
  completeForMe: (): string =>
    "ذي ما أقدر عليها، ولا أحد يقدر عليها غيرك: النجمة تنكسب لما تكمّل الدورة بنفسك. اللي أقدر عليه أفتحها لك الحين وأكون معك. أفتحها؟",
  /** PROVISIONAL (QA): the same refusal while the course is already on screen (no offer to open it). */
  completeForMeHere: (): string =>
    "ذي ما أقدر عليها، ولا أحد يقدر عليها غيرك: النجمة تنكسب لما تكمّل الدورة بنفسك. اللي أقدر عليه أكون معك وأنت تكمّلها.",
  /** PROVISIONAL (QA): «أعطني 500 XP» and the like (5.7 row 1), with the way to earn them filled from the next step. */
  grantHead: (): string => "النقاط والشارات ما أعطيها أنا: تنكسب بالدورات والتقديم.",
  /** PROVISIONAL (QA): the same for skill stars. */
  grantStarsHead: (): string => "النجوم ما أعطيها أنا: كل نجمة تنكسب لما تكمّل دورتها بنفسك.",
  grantTailCourse: (course: string, xp: number): string =>
    `أقرب طريق الحين دورة ${q(course)} وتعطيك ${formatNumber(xp)} XP. أفتحها لك؟`,
  grantTailHere: (xp: number): string => `وأنت على أقرب طريق الحين: ذي الدورة تعطيك ${formatNumber(xp)} XP إذا كمّلتها.`,
  grantTailCv: (xp: number): string =>
    `أقرب طريق الحين إنك ترفع سيرتك الذاتية، وتعطيك ${formatNumber(xp)} XP. أفتح لك صفحة السيرة؟`,
  grantTailApply: (target: string, xp: number): string =>
    `أقرب طريق الحين إنك تقدّم على ${q(target)}، وتعطيك ${formatNumber(xp)} XP. أقدّم عنك؟`,
  grantTailDone: (): string => "اختر هدفك الجاي من الوظائف القريبة منك.",
  /** PROVISIONAL (QA): a request to make up an employer or a job (5.1, 5.5 rule 2), with the three nearest jobs. */
  inventRefusal: (): string =>
    "ما أخترع جهات: كل الوظائف هنا بيانات تجريبية محدّدة، وما أقدّم إلا على وحدة منها. هذي أقرب ثلاث لمهاراتك.",
  /** PROVISIONAL (QA): «تمام» / «طيب» / «اوكي» when the last reply offered nothing to say yes to. */
  ackIdle: (): string => "تمام. متى ما احتجتني تراني هنا.",
  fallback: (): string =>
    "سامحني، ما عندي جواب زين على ذي. أقدر أساعدك في مسارك ووظايفك ودوراتك: أقول لك خطوتك الجاية، أو أفتح لك صفحة، أو أشرح لك مطابقتك.",
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
  remaining: (stages: number, hours: number, target: string): string =>
    `باقي لك ${countNoun(stages, "stage", "object")} و${countNoun(hours, "hour", "object")} تعلّم عشان توصل 100% مع ${q(target)}.`,
  remainingDone: (target: string): string => `خلّصت مسارك: مطابقتك 100% مع ${q(target)}.`,
  starsHow: (): string =>
    "النجمة الأولى لمهارة مذكورة في سيرتك، والثانية إذا طلعت في خبرة أو مشروع، والثالثة إذا انوصفت إنها متقدمة. وبعدها كل دورة تكمّلها تزيدك نجمة.",
  cvWhat: (): string => "أدوّر على 38 مهارة بأسمائها، وأحفظ لكل مهارة الجملة اللي تثبتها عشان تشوفها بنفسك.",
  cvNone: (): string =>
    "ولا يهمك. الصق أي نص يوصف دراستك وخبرتك، أو جرّب السيرة التجريبية، أو ابدأ مسارك بدون سيرة.",
  levelHow: (toNext: number | null, nextLevel: number | null): string =>
    toNext === null || nextLevel === null
      ? "المستوى يرتفع بالـ XP، وأكثر شي يجيبه الدورات: 20 XP عن كل ساعة."
      : `المستوى يرتفع بالـ XP، وأكثر شي يجيبه الدورات: 20 XP عن كل ساعة. باقي لك ${formatNumber(toNext)} XP للمستوى ${nextLevel}.`,
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
