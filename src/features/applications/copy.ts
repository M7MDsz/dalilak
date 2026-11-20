// Owner: applications. The strings of spec 3.9 that only this screen uses. Shared strings (status labels and notes, the
// banner) come from @/lib/copy.
import { formatPercent } from "@/lib/format";

export const APPLICATIONS_COPY = {
  heading: "طلباتي",
  subline: "تابع كل طلب قدّمته.",
  /** The practice job's three-step track, the user's own progress: «محفوظ» → «جاهز» → «الاستعداد». */
  track: ["محفوظ", "جاهز", "الاستعداد"] as const,
  numberLabel: "رقم الطلب",
  sentPrefix: "قدّمت",
  matchThen: "مطابقتك عند التقديم",
  matchNow: "مطابقتك الآن",
  byAdvisor: "قدّم عنك دليلك",
  /** A real job's application: prepared here, sent by the user from the posting. */
  prepared: "جاهز للإرسال",
  openJob: "عرض الوظيفة",
  advance: "انقل للخطوة التالية",
  seeGap: "شاهد الفجوة",
  emptyTitle: "لم تقدّم على أي وظيفة بعد.",
  emptyBody: "ابدأ بالوظائف الأقرب لمهاراتك، أو اطلب من دليلك أن يقدّم عنك.",
  emptyAction: "استعرض الوظائف",
} as const;

/** «ارتفعت من 90% إلى 100% منذ التقديم». */
export function matchRoseText(then: number, now: number): string {
  return `ارتفعت من ${formatPercent(then)} إلى ${formatPercent(now)} منذ التقديم`;
}
