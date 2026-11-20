// Owner: data. The spec's final copy for strings used by MORE THAN ONE owner (the keys are the contract). A string
// used by one screen stays in that screen's files, copied verbatim from the spec. Pure module.
import type { ApplicationStatus, CourseState, ExperienceBand, StageState, XpEventType } from "@/lib/types";

/** Spec 7.6 (v3, including the home leaderboard preview's label). */
export const SAMPLE_COPY = {
  /** «جهة تجريبية» (tag after every company name). */
  company: "جهة تجريبية",
  /** «بيانات تجريبية» (short tag: home leaderboard preview, banners' tag form). */
  data: "بيانات تجريبية",
  /** Sign-in footer «عرض تجريبي: الوظائف والدورات والمتسابقون بيانات تجريبية.» */
  signinFooter: "عرض تجريبي: الوظائف والدورات والمتسابقون بيانات تجريبية.",
  /** Side navigation footer «عرض تجريبي · بيانات تجريبية». */
  navFooter: "عرض تجريبي · بيانات تجريبية",
  jobsBanner: "بيانات تجريبية: الوظائف والجهات هنا للعرض فقط.",
  applySheet: "تقديم تجريبي: لن يُرسل شيء إلى جهة حقيقية.",
  applicationsBanner: "محاكاة: لا توجد جهة حقيقية تراجع طلبك. الحالات تتقدّم تلقائياً لتجربة المتابعة.",
  learnBanner: "دورات تجريبية: عناوين الدروس فقط، والإكمال بضغطة زر.",
  coursePage: "دورة تجريبية: عناوين فقط، والإكمال بضغطة زر.",
  leaderboardNote: "المتسابقون الآخرون بيانات تجريبية. ترتيبك يُحسب من نقاطك أنت.",
  /** «سيرة تجريبية». */
  sampleCvTag: "سيرة تجريبية",
} as const satisfies Record<string, string>;

/** Spec 3.15 XP toast reasons. */
export const XP_REASON = {
  onboarding_completed: "أكملت التعارف",
  target_set: "اخترت هدفك",
  cv_analysed: "حلّلت سيرتك",
  course_completed: "أكملت دورة",
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

/** Spec 3.9 status labels and notes. */
export const APPLICATION_STATUS_COPY = {
  sent: { label: "أُرسل الطلب", note: "وصل طلبك وينتظر المراجعة." },
  review: { label: "قيد المراجعة", note: "طلبك قيد المراجعة." },
  shortlisted: { label: "مرشّح للمقابلة", note: "رُشّحت للمقابلة. راجع مهارات الوظيفة واستعدّ." },
  closed: {
    label: "لم يُرشّح هذه المرة",
    note: "لم يُرشّح طلبك هذه المرة. سدّ الفجوة لتقوى فرصك في الوظائف القادمة.",
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
  learn: "الدورات",
  cv: "سيرتي",
  jobs: "الوظائف",
  applications: "طلباتي",
  leaderboard: "المتصدرون",
  profile: "ملفي",
  /** «المزيد». */
  more: "المزيد",
  /** «دليل» (phone centre tab). */
  advisor: "دليل",
  /** «اسأل دليل» (desktop launcher). */
  advisorLauncher: "اسأل دليل",
} as const satisfies Record<string, string>;

/** Spec 4.3 neutral prints: city «غير محدّدة», education «غير محدّد», major «تخصص آخر». */
export const NEUTRAL_PRINT = {
  city: "غير محدّدة",
  education: "غير محدّد",
  major: "تخصص آخر",
} as const satisfies Record<string, string>;

/** «من سيرتك» · «من دورة». */
export const SOURCE_LABEL = { cv: "من سيرتك", course: "من دورة" } as const satisfies Record<"cv" | "course", string>;

/** Toasts raised by more than one owner. */
export const TOAST_COPY = {
  /** «بدأت الدورة. بالتوفيق.» (course page and the dispatcher's start_course). */
  courseStarted: "بدأت الدورة. بالتوفيق.",
  /** «تم تحديث صورتك.» */
  avatarSaved: "تم تحديث صورتك.",
  /** «بدأنا محادثة جديدة.» */
  newChat: "بدأنا محادثة جديدة.",
} as const satisfies Record<string, string>;

/** The user bubble posted by every «دع دليل يقدّم عنك» button (3.4 form 4, 3.6, 3.8): «قدّم لي على هذه الوظيفة». */
export const ASK_ADVISOR_APPLY_TEXT = "قدّم لي على هذه الوظيفة";
