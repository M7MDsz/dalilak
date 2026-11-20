// Owner: data. The spec's final copy for strings used by MORE THAN ONE owner (the keys are the contract). A string
// used by one screen stays in that screen's files, copied verbatim from the spec. Pure module.
import type { ApplicationStatus, CourseState, ExperienceBand, StageState, XpEventType } from "@/lib/types";

/** The notes that say how a screen works (where an application is sent, how a step is marked done, how rank is counted). */
export const SAMPLE_COPY = {
  /** The apply sheet of the practice job. */
  applySheet: "يُحفظ طلبك في «طلباتي» لتتابعه منها.",
  /** The apply sheet of a real job. */
  applySheetReal: "دليلك يجهّز طلبك هنا، وترسله أنت من الإعلان الأصلي.",
  applicationsBanner: "طلبات الوظائف ترسلها أنت من الإعلان الأصلي، ولا نرى ردّ الجهة.",
  /** The learning guide: real courses, people and articles; finishing a step is self-reported. */
  learnBanner: "مصادر حقيقية: تتعلّم عندهم، وتضغط «خلّصتها» هنا.",
  coursePage: "روابط حقيقية، والإكمال تؤكّده أنت بضغطة «خلّصتها».",
  leaderboardNote: "ترتيبك يُحسب من نقاطك أنت.",
} as const satisfies Record<string, string>;

/** Real jobs and the one practice job: the words every screen that shows a job uses. */
export const JOB_SOURCE_COPY = {
  /** «نُشرت في 29 سبتمبر 2026». */
  posted: (day: string) => `نُشرت في ${day}`,
  sourceLabel: "المصدر",
  openPosting: "افتح الإعلان الأصلي",
  placeLabel: "الموقع في الإعلان",
  titleLabel: "المسمى في الإعلان",
  evidenceTitle: "المتطلبات من نص الإعلان",
  evidenceLine: "كل مهارة ومعها الجملة التي وردت في الإعلان.",
  /** Where reading the posting as Dalilak's skills needed a judgement, the note says how (kept with the source). */
  sourceNote: "ملاحظة عن قراءة المهارات من الإعلان:",
  /** A real job's application: Dalilak prepared it, the user sends it from the original posting (nothing is simulated). */
  preparedByAdvisor: "جهّزه دليلك، وأرسله أنت من الإعلان الأصلي",
  preparedByUser: "جهّزته هنا، وأرسله أنت من الإعلان الأصلي",
  /** The short status of a prepared real application (cards, chips). */
  preparedShort: "جاهز للإرسال من الإعلان الأصلي",
  /** The one big action after preparing: opens the posting in a new tab and copies the cover note. */
  openAndApply: "افتح الإعلان الأصلي وقدّم",
  /** Said once the note is on the clipboard. */
  noteCopied: "نسخت لك رسالة التقديم",
} as const;

/** Spec 3.15 XP toast reasons. */
export const XP_REASON = {
  onboarding_completed: "أكملت التعارف",
  target_set: "اخترت هدفك",
  cv_analysed: "حلّلت سيرتك",
  course_completed: "أتممت خطوة تعلّم",
  job_applied: "تقديم مدروس",
  daily_reward: "مكافأة يومية",
} as const satisfies Record<XpEventType, string>;

/** «التعارف واختيار الهدف» (onboarding_completed + target_set merged into one toast). */
export const XP_REASON_ONBOARDING_AND_TARGET = "التعارف واختيار الهدف";

/** Spec 3.4 stage labels: «مكتملة» · «الآن» · «لاحقاً» · «مقفلة». */
export const STAGE_STATE_LABEL = {
  done: "مكتملة",
  current: "الآن",
  upcoming: "لاحقاً",
  locked: "مقفلة",
} as const satisfies Record<StageState, string>;

/** Spec 3.10 course-state labels (started takes counts: use phrases `courseStateLabel`). */
export const COURSE_STATE_LABEL = {
  available: "متاحة",
  started: "بدأتها",
  completed: "مكتملة",
  credited: "مثبتة",
  locked: "مقفلة",
} as const satisfies Record<CourseState, string>;

/**
 * The practice job's tracking steps (spec 3.9, reworded 21 Nov 2026): the user's own progress, never a company's review
 * (no company stands behind the practice job, so nothing says it was sent, received or reviewed).
 */
export const APPLICATION_STATUS_COPY = {
  sent: { label: "محفوظ", note: "حفظت طلبك في «طلباتي»." },
  review: { label: "جاهز", note: "طلبك جاهز. راجع مهارات الوظيفة." },
  shortlisted: { label: "مستعدّ للمقابلة", note: "مطابقتك قوية. راجع مهارات الوظيفة واستعدّ للمقابلة." },
  closed: {
    label: "يحتاج تقوية",
    note: "مطابقتك أقل من 60%. سدّ الفجوة لتقوى فرصك في الوظائف القادمة.",
  },
} as const satisfies Record<ApplicationStatus, { label: string; note: string }>;

/** Spec 9.3 experience labels: «حتى سنة خبرة» · «خبرة 1-3 سنوات» · «خبرة 3 سنوات فأكثر». */
export const BAND_LABEL = {
  entry: "حتى سنة خبرة",
  junior: "خبرة 1-3 سنوات",
  mid: "خبرة 3 سنوات فأكثر",
} as const satisfies Record<ExperienceBand, string>;

/** Spec 2.4-2.6 navigation labels. */
export const NAV_LABEL = {
  path: "مساري",
  skills: "المهارات",
  learn: "دليل التعلّم",
  cv: "سيرتي",
  jobs: "الوظائف",
  applications: "طلباتي",
  leaderboard: "المتصدرون",
  profile: "ملفي",
  /** «المزيد». */
  more: "المزيد",
  /** «دليلك» (phone centre tab). */
  advisor: "دليلك",
  /** «اسأل دليلك» (desktop launcher). */
  advisorLauncher: "اسأل دليلك",
} as const satisfies Record<string, string>;

/** Spec 4.3 neutral prints: city «غير محدّدة», education «غير محدّد», major «تخصص آخر». */
export const NEUTRAL_PRINT = {
  city: "غير محدّدة",
  education: "غير محدّد",
  major: "تخصص آخر",
} as const satisfies Record<string, string>;

/** «من سيرتك» · «من خطوة تعلّم». */
export const SOURCE_LABEL = { cv: "من سيرتك", course: "من خطوة تعلّم" } as const satisfies Record<"cv" | "course", string>;

/** Toasts raised by more than one owner. */
export const TOAST_COPY = {
  /** «بدأت هذه الخطوة. بالتوفيق.» (the guide page, the map and the dispatcher's start_course). */
  courseStarted: "بدأت هذه الخطوة. بالتوفيق.",
  /** «تم تحديث صورتك.» */
  avatarSaved: "تم تحديث صورتك.",
  /** «بدأنا محادثة جديدة.» */
  newChat: "بدأنا محادثة جديدة.",
} as const satisfies Record<string, string>;

/** The user bubble posted by every «دع دليلك يقدّم عنك» button (3.4 form 4, 3.6, 3.8): «قدّم لي على هذه الوظيفة». */
export const ASK_ADVISOR_APPLY_TEXT = "قدّم لي على هذه الوظيفة";
