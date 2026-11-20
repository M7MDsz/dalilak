// Owner: jobs. Every string of /jobs and /jobs/[id] (spec 3.7, 3.8, 7.4), copied verbatim. Strings shared with other
// owners come from @/lib/copy (SAMPLE_COPY, BAND_LABEL, SOURCE_LABEL, appliedChip, ASK_ADVISOR_APPLY_TEXT, …).
import { formatPercent } from "@/lib/format";

/** Spec 3.7: the jobs list. */
export const LIST_COPY = {
  subline: "كل وظيفة ومعها نسبة مطابقتك لها.",
  searchLabel: "ابحث",
  searchPlaceholder: "ابحث بالمسمى أو المهارة أو الجهة",
  cityLabel: "المدينة",
  cityAll: "كل المدن",
  fieldLabel: "المجال",
  fieldAll: "كل المجالات",
  /** «المهارة: {name}» (the removable skill chip). */
  skillPrefix: "المهارة:",
  /** The accessible name of the chip's remove control (icon-only). */
  skillRemove: "إزالة",
  byMatch: "مرتّبة حسب المطابقة",
  byAnswers: "مرتّبة حسب إجاباتك",
  cvBanner: "ارفع سيرتك لتُرتَّب الوظائف حسب مطابقتك الفعلية.",
  cvBannerAction: "ارفع سيرتك الذاتية",
  /** «ينقصك: Power BI، الإحصاء» (at most three). */
  missingPrefix: "ينقصك:",
  allMet: "تستوفي المتطلبات كلها",
  flagTarget: "هدفك",
  flagApplied: "قدّمت",
  empty: "لا توجد وظائف بهذه المواصفات.",
  clear: "امسح التصفية",
  /**
   * The board's reward banner (docs/GAME-LAYER.md 5.3.1, the rule of spec 8.1): «قدّم حين تبلغ مطابقتك 60% أو أكثر، وتكسب
   * +40 XP عن كل تقديم مدروس. مفتوحة لك الآن: وظيفتان.»
   */
  rewardLead: "قدّم حين تبلغ مطابقتك 60% أو أكثر، وتكسب",
  rewardTail: "عن كل تقديم مدروس.",
  rewardOpen: "مفتوحة لك الآن:",
  /** No job at 60% or more yet (every reward on the board is locked). */
  rewardNone: "لا وظيفة بعد",
} as const;

/** Spec 3.8: the job page. */
export const JOB_COPY = {
  back: "الوظائف",
  matchCaption: "مطابقتك",
  matchLine: "كل مهارة من الخمس تساوي 20% من المطابقة.",
  explain: "كيف تُحسب؟",
  /** «Excel: 20 من 20». */
  explainRow: (points: number) => `${Math.round(points)} من 20`,
  /** «المجموع: 70%». */
  explainTotal: (total: number) => `المجموع: ${formatPercent(total)}`,
  about: "عن الوظيفة",
  tasks: "المهام",
  have: "ما لديك",
  missing: "ما ينقصك",
  courses: "كيف تسدّ الفجوة",
  noStar: "لم تُحلَّل سيرتك بعد، لذلك تظهر كل المتطلبات ناقصة.",
  noStarAction: "ارفع سيرتك الذاتية",
  ready: "لا شيء ينقصك. أنت جاهز لهذه الوظيفة.",
  /** «+20% مطابقة»: the number (an LTR isolate, so the sign stays before it) and the word. */
  courseGain: (gain: number) => `+${formatPercent(gain)}`,
  courseGainWord: "مطابقة",
  prep: "تمهيدية",
  openCourse: "افتح الدورة",
  applyAdvisor: "دع دليل يقدّم عنك",
  applySelf: "قدّم بنفسك",
  setTarget: "اجعلها هدفي",
  isTarget: "هدفك الحالي",
  askAdvisor: "اسأل دليل عن هذه الوظيفة",
  follow: "تابع الطلب",
  /** The apply reward chip (docs/GAME-LAYER.md 4, spec 8.1): «تكسب +40 XP عند التقديم» / «+40 XP من 60% مطابقة». */
  rewardOffer: "تكسب",
  rewardWhen: "عند التقديم",
  rewardFrom: (line: number) => `من ${formatPercent(line)} مطابقة`,
  /** After applying at 60% or more: «كسبت +40 XP تقديم مدروس» (the confirmation's words, spec 3.8). */
  rewardEarned: "كسبت",
  rewardReason: "تقديم مدروس",
} as const;

/** Spec 3.8 the apply sheet, and 7.4 «دليل» applying. */
export const SHEET_COPY = {
  title: (title: string) => `التقديم على ${title}`,
  warning: (match: number) => `مطابقتك ${formatPercent(match)}، أقل من 60%. الأفضل أن تسدّ الفجوة أولاً.`,
  warningGap: "شاهد الفجوة",
  name: "الاسم",
  city: "المدينة",
  education: "المؤهل والتخصص",
  skills: "مهاراتك المطابقة",
  note: "رسالة التقديم",
  cv: "السيرة الذاتية",
  submit: "أرسل الطلب",
  submitAnyway: "قدّم على أي حال",
  cancel: "إلغاء",
  filling: "دليل يعبّي طلبك…",
  // the other sites «دليل» applies on after the in-app send (APPLY_SITES; a simulation, and it says so)
  sitesLine: "أقدّم عنك في المواقع الثانية…",
  sitesDone: "أرسلت طلبك في دليلك",
  sitesTitle: "وأقدّم عنك الحين في المواقع الثانية",
  siteDalilak: "دليلك",
  siteWaiting: "بالدور",
  siteFilling: "يعبّي الطلب…",
  siteSent: "أُرسل",
  sitesNote: "محاكاة للعرض: ما ينرسل شي لأي موقع حقيقي.",
  sitesLabel: "أُرسل عبر:",
  /** 7.4 step 5's status line, shown in the sheet while the pressed send goes out. */
  sendingLine: "أرسل الطلب…",
  stop: "إيقاف",
  sending: "جارٍ الإرسال…",
  sent: "تم إرسال طلبك",
  numberLabel: "رقم الطلب:",
  matchAtSendLabel: "مطابقتك عند التقديم:",
  xpReason: "تقديم مدروس",
  noXp: "بدون نقاط: المطابقة أقل من 60%",
  goApplications: "تابع طلباتي",
  close: "إغلاق",
} as const;
