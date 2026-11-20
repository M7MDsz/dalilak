// Owner: brain-advisor. «دليل»'s guide to the platform itself (Mohammed, 18 Nov 2026, on «طيب كيف اغير صورتي؟» answered
// with «ما أدري»: "he should be able to advise and help to everything in the platform and actually open that page for
// you"). One entry per thing a user can do: the words that name it, the page where it is done, and «دليل»'s answer in
// Najdi naming the buttons exactly as they are written on screen.
// - The router answers a how-to question from here and opens the page at once (every mode, also offline): see
//   detectHowTo in router.ts. Topics that already have their own personal answer (badges, XP and level, rank, streak,
//   the next step, an application's status) are NOT routed from here, so those answers keep their numbers.
// - The model gets every entry (routed or not) as its PLATFORM GUIDE (model-common.ts), and may open the page for a
//   how-to question (rules.ts asksHowTo, turn.ts rule 7).
import type { NavTarget } from "@/lib/types";

import * as W from "./words";

export interface GuideEntry {
  readonly id: string;
  /** Any of these (whole words after 4.3 normalisation) names the topic. */
  readonly topic: readonly string[];
  /** The message must ALSO contain one of these (a how / where word or a doing verb), so a passing mention is not a
   *  how-to question: «كيف أوصل لهدفي» is about the path, «كيف أغيّر هدفي» is this entry. */
  readonly ask: readonly string[];
  /** When set, the message must contain one of these TOO: «كيف أبدأ دورة؟» is a how-to, «أي دورة أبدأ بها؟» asks which. */
  readonly also?: readonly string[];
  /** Where it is done; null when there is nothing to open (a button of the panel itself). */
  readonly to: NavTarget | null;
  /** «دليل»'s answer, Najdi, the buttons in «…» as on screen. */
  readonly how: string;
  /** False: only the model's guide (the router has a personal answer for it). */
  readonly routed: boolean;
  /** The model's line: what it is and where, in English, the button names in Arabic. */
  readonly hint: string;
}

/** How / where words that make a message a how-to question about the topic it names. */
const HOW = ["كيف", "شلون", "وين", "فين", "طريقة", "اقدر", "أقدر", "ممكن", "how", "where"];
/** Verbs of changing something. */
const CHANGE = ["أغير", "أغيّر", "اغير", "اغيّر", "أبدل", "أبدّل", "ابدل", "تغيير", "أعدل", "أعدّل", "اعدل", "change", "edit"];

export const GUIDE: readonly GuideEntry[] = [
  {
    id: "avatar",
    topic: ["صورتي", "الصورة", "صورة", "صوره", "الأفاتار", "افاتار", "avatar", "شخصيتي", "picture", "photo"],
    ask: [...HOW, ...CHANGE, "أختار", "اختار"],
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». اضغط «غيّر الصورة» تحت صورتك، واختر من 12 صورة، وبعدها اضغط «حفظ».",
    routed: true,
    hint: "Change the avatar / picture: profile page (ملفي) → «غيّر الصورة» → «اختر صورتك» (12 designed avatars) → «حفظ». navigate screen=profile.",
  },
  {
    id: "target",
    topic: ["هدفي", "الهدف", "هدف", "الوظيفة المستهدفة", "وظيفتي المستهدفة", "target"],
    ask: CHANGE,
    to: { screen: "jobs" },
    how: "تفضّل، فتحت لك الوظائف. افتح الوظيفة اللي تبيها واضغط «اجعلها هدفي»، أو قل لي اسمها وأنا أغيّره لك. وتقدر بعد من «ملفي» تضغط «غيّر الهدف».",
    routed: true,
    hint: "Change the target job: jobs page → open a job → «اجعلها هدفي»; or profile «غيّر الهدف»; or the user names the job and you call set_target_job. navigate screen=jobs.",
  },
  {
    id: "cv",
    topic: ["سيرتي", "السيرة", "سيرة", "السيرة الذاتية", "cv", "resume"],
    // upload verbs only: «كيف أكتب سيرة ذاتية قوية؟» wants advice (T.cvTips), not this page
    ask: ["أرفع", "ارفع", "أحلل", "احلل", "أحلّل", "أضيف", "اضيف", "upload"],
    to: { screen: "cv" },
    how: "تفضّل، فتحت لك صفحة السيرة. ارفع ملف PDF أو Word أو الصق النص، واضغط «حلّل سيرتي». وإذا ما عندك سيرة جاهزة اضغط «جرّب بسيرة ذاتية تجريبية».",
    routed: true,
    hint: "Upload / analyse a CV: CV page (سيرتي) → upload a PDF or Word file or paste the text → «حلّل سيرتي»; «جرّب بسيرة ذاتية تجريبية» for the sample; «حلّل سيرة أخرى» to redo. navigate screen=cv.",
  },
  {
    id: "course",
    topic: ["دورة", "الدورة", "دورات", "الدورات", "كورس", "الكورس", "course"],
    ask: ["كيف", "شلون", "طريقة", "how"],
    also: ["أبدأ", "ابدأ", "أكمل", "اكمل", "أخلص", "اخلص", "أخلّص", "أنهي", "start", "finish", "complete"],
    to: { screen: "learn" },
    how: "تفضّل، فتحت لك الدورات. افتح أي دورة واضغط «ابدأ الدورة»، وإذا خلّصتها اضغط «أكمل الدورة» وتاخذ نقاطها ونجمتها، وترتفع مطابقتك.",
    routed: true,
    hint: "Start / complete a course: courses page (الدورات, tabs «في مساري» «وسّع آفاقك» «مكتملة») → a course → «ابدأ الدورة», later «أكمل الدورة» (XP, a star, the match rises). The user completes courses, never you. navigate screen=learn.",
  },
  {
    id: "apply",
    topic: ["أقدّم", "اقدم", "أقدم", "التقديم", "تقديم", "apply"],
    ask: HOW,
    to: { screen: "jobs" },
    how: "تفضّل، فتحت لك الوظائف. افتح الوظيفة واضغط «قدّم بنفسك»، أو اضغط «دع دليل يقدّم عنك» وأنا أقدّم عنك في دليلك وLinkedIn وبيت.كوم وIndeed وموقع الجهة (تقديم تجريبي).",
    routed: true,
    hint: "Apply to a job: job page → «قدّم بنفسك» (the user fills it), or «دع دليل يقدّم عنك» / the user asks you and you call apply_to_job: you fill it and also apply on LinkedIn, بيت.كوم, Indeed and the company site (all simulated). navigate screen=jobs.",
  },
  {
    id: "history",
    topic: ["سجل النقاط", "سجل نقاطي", "سجل", "تاريخ النقاط"],
    ask: [...HOW, "أشوف", "اشوف"],
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». تحت «سجل النقاط» تلقى كل XP أخذته ومن وين جا.",
    routed: true,
    hint: "XP history: profile page → «سجل النقاط». navigate screen=profile.",
  },
  {
    id: "info",
    topic: ["معلوماتي", "مدينتي", "تخصصي", "مؤهلي", "خبرتي", "إجاباتي", "اجاباتي", "بياناتي"],
    ask: [...CHANGE, "وين", "فين", "أشوف", "اشوف", "where"],
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». معلوماتك تحت «معلوماتي»، وهي من أسئلة البداية وما تنعدّل من هنا. لو تبي تغيّرها، «إعادة ضبط العرض» في آخر الصفحة يبديك من جديد، وترى يمسح تقدّمك.",
    routed: true,
    hint: "Onboarding answers (city, education, major, experience, interest, priority): profile «معلوماتي», read-only; only «إعادة ضبط العرض» starts over (it deletes progress). navigate screen=profile.",
  },
  {
    id: "signout",
    // not «أطلع»: in Najdi it is also "move up" («أبي أطلع في المتصدرين»)
    topic: ["تسجيل الخروج", "خروج", "أسجل خروج", "logout"],
    ask: [...HOW, "أبي", "ابي", "أبغى", "ابغى"],
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». في آخر الصفحة تلقى «تسجيل الخروج».",
    routed: true,
    hint: "Sign out: profile page, at the bottom → «تسجيل الخروج». navigate screen=profile.",
  },
  {
    id: "reset",
    topic: ["إعادة ضبط", "اعادة ضبط", "من جديد", "من الصفر", "أصفر", "اصفر", "reset"],
    ask: [...HOW, "أبدأ", "ابدأ", "أبي", "ابي"],
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». في آخر الصفحة اضغط «إعادة ضبط العرض»، وترى يمسح تقدّمك ونقاطك من ذا المتصفح.",
    routed: true,
    hint: "Start over: profile page, at the bottom → «إعادة ضبط العرض» (deletes progress and XP in this browser). navigate screen=profile.",
  },
  {
    id: "new-chat",
    topic: ["محادثة جديدة", "المحادثة", "الشات", "chat"],
    ask: [...HOW, "أمسح", "امسح", "أبدأ", "ابدأ", "جديدة"],
    to: null,
    how: "فوق في المحادثة، جنب زر الإغلاق، اضغط «محادثة جديدة» وتبدأ معي من أول.",
    routed: true,
    hint: "New chat: the «محادثة جديدة» button in this panel's header (nothing to open).",
  },
  {
    id: "design",
    topic: ["التصميم", "تصميم", "الشكل", "شكل", "الثيم", "الألوان", "اللعبة", "theme", "design"],
    // not «كيف» alone: «كيف شكل مساري؟» is about the map
    ask: [...CHANGE, "وين", "فين", "أخلي", "اخلي", "where"],
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». تحت «شكل التطبيق» تختار بين «هادئ» و«لعبة»، وتقدر بعد تغيّره من أسفل القائمة الجانبية عند «التصميم».",
    routed: true,
    hint: "Change the look (the calm design «هادئ» or the game-board design «لعبة»): profile page section «شكل التطبيق», or the switch «التصميم: هادئ · لعبة» at the foot of the side menu (desktop); it also works with ?theme=lawha. navigate screen=profile.",
  },
  {
    id: "map",
    topic: ["الخريطة", "خريطة", "المحطة", "المحطات", "map"],
    ask: [...HOW, "أستخدم", "استخدم"],
    to: { screen: "path" },
    how: "تفضّل، هذا مسارك. اضغط على أي محطة وتطير لها الكاميرا وتشوف وش فيها، و«أنت هنا» يوريك وين وصلت.",
    routed: true,
    hint: "The roadmap map (مساري): press a station to fly to it and see its course and progress; «أنت هنا» marks the user. navigate screen=path.",
  },
  {
    id: "skills",
    topic: ["شجرة المهارات", "الشجرة", "مهاراتي"],
    // not «كيف»: «كيف أطوّر مهاراتي» wants advice, not the page
    ask: ["وين", "فين", "أشوف", "اشوف", "where"],
    to: { screen: "skills" },
    how: "تفضّل، فتحت لك «المهارات». الشجرة فيها 38 مهارة في 7 مجالات، واضغط أي مهارة تشوف نجومها ووش الدورة اللي تزيدها.",
    routed: true,
    hint: "Skill tree: skills page (المهارات): 38 skills in 7 fields, stars per skill; press one for its stars and course. navigate screen=skills.",
  },
  // ── for the model only (the router has a personal answer with the user's numbers) ──
  {
    id: "badges",
    topic: ["شارة", "شارات", "الشارات", "شاراتي"],
    ask: HOW,
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». شاراتك تحت «الشارات»، فيها 12 شارة وكل وحدة تنفتح بخطوة: أول دورة، أول تقديم، سلسلة أيام وغيرها.",
    routed: false,
    hint: "Badges: profile page «الشارات» (12 badges, each unlocked by a step: first course, first application, a streak…); list_badges gives the nearest one. navigate screen=profile.",
  },
  {
    id: "streak",
    topic: ["سلسلة", "السلسلة", "سلسلتي", "المكافأة اليومية", "مكافأة"],
    ask: HOW,
    to: { screen: "profile" },
    how: "تفضّل، فتحت لك «ملفي». تحت «سلسلة الأيام» تشوف سلسلتك وأطول سلسلة ومكافأة بكرة، وكل ما دخلت يوم ورا يوم تكبر مكافأتك.",
    routed: false,
    hint: "Streak and daily reward: profile «سلسلة الأيام» (longest streak, tomorrow's reward); coming back every day grows the daily reward (20 XP a day, up to 100). navigate screen=profile.",
  },
  {
    id: "leaderboard",
    topic: ["الترتيب", "المتصدرين", "المتصدرون"],
    ask: HOW,
    to: { screen: "leaderboard" },
    how: "تفضّل، فتحت لك «المتصدرون». ترتيبك يُحسب من نقاط ذا الأسبوع، وتطلع فيه بالدورات والتقديم.",
    routed: false,
    hint: "Leaderboard (المتصدرون): weekly XP rank among 25 (24 are sample users); climb by courses and applications; get_leaderboard has the numbers. navigate screen=leaderboard.",
  },
  {
    id: "applications",
    topic: ["طلباتي", "الطلبات", "طلبي"],
    ask: HOW,
    to: { screen: "applications" },
    how: "تفضّل، فتحت لك «طلباتي». تشوف حالة كل طلب ووين انرسل، وفيه زر «محاكاة: انقل للحالة التالية».",
    routed: false,
    hint: "Applications (طلباتي): each one's status track «أُرسل» → «قيد المراجعة» → «النتيجة», where it was sent, and «محاكاة: انقل للحالة التالية». navigate screen=applications.",
  },
];

/** The routed entry a how-to message is about, or null. The first entry whose topic AND ask words are both present. */
export function guideFor(text: W.Text): GuideEntry | null {
  for (const entry of GUIDE) {
    if (!entry.routed) continue;
    if (W.has(text, entry.topic) && W.has(text, entry.ask) && (!entry.also || W.has(text, entry.also))) return entry;
  }
  return null;
}

/**
 * For a message the local brain could only answer with the generic fallback («ذي برّا اللي أقدر عليه…»): the entry whose
 * topic it names (ask words not needed), routed or not. Used as the LOCAL answer of that turn (offline, or when the
 * model is slow or its reply is rejected), so a platform question never gets "outside what I can do".
 */
export function guideByTopic(text: W.Text): GuideEntry | null {
  // only the entries without a routed answer (badges, streak, leaderboard, applications): a routed entry's topic alone
  // is too loose («اشرح لي التقديم المدروس» names «التقديم» but is not a how-to)
  for (const entry of GUIDE) if (!entry.routed && entry.how && W.has(text, entry.topic)) return entry;
  return null;
}

/** The model's PLATFORM GUIDE block, one line per entry. */
export function guideForModel(): string {
  return GUIDE.map((entry) => `- ${entry.hint}`).join("\n");
}
