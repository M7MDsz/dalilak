// Owner: applications. The strings of spec 3.9 that only this screen uses, verbatim. Shared strings (status labels and
// notes, the banner, «جهة تجريبية») come from @/lib/copy.
import { formatPercent } from "@/lib/format";

export const APPLICATIONS_COPY = {
  heading: "طلباتي",
  subline: "تابع كل طلب قدّمته.",
  /** The three-step track: «أُرسل» → «قيد المراجعة» → «النتيجة». */
  track: ["أُرسل", "قيد المراجعة", "النتيجة"] as const,
  numberLabel: "رقم الطلب",
  sentPrefix: "قدّمت",
  matchThen: "مطابقتك عند التقديم",
  matchNow: "مطابقتك الآن",
  byAdvisor: "قدّم عنك دليلك",
  /** A real job's application (20 Nov 2026): prepared here, sent by the user from the posting. */
  prepared: "جاهز للإرسال",
  openJob: "عرض الوظيفة",
  advance: "محاكاة: انقل للحالة التالية",
  seeGap: "شاهد الفجوة",
  emptyTitle: "لم تقدّم على أي وظيفة بعد.",
  emptyBody: "ابدأ بالوظائف الأقرب لمهاراتك، أو اطلب من دليلك أن يقدّم عنك.",
  emptyAction: "استعرض الوظائف",
} as const;

/** «ارتفعت من 90% إلى 100% منذ التقديم». */
export function matchRoseText(then: number, now: number): string {
  return `ارتفعت من ${formatPercent(then)} إلى ${formatPercent(now)} منذ التقديم`;
}
