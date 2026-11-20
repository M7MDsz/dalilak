// Owner: profile. The strings of spec 3.13 that only this screen uses, verbatim. Shared strings (the toast «تم تحديث
// صورتك.», counted nouns, time stamps, answer prints) come from @/lib/copy.
import { formatNumber } from "@/lib/format";

export const PROFILE_COPY = {
  heading: "ملفي",
  changeAvatar: "غيّر الصورة",
  topLevel: "بلغت أعلى مستوى",
  xpNote: "نقاط الخبرة",
  stats: {
    xp: "XP",
    courses: "الدورات المكتملة",
    stars: "النجوم",
    streak: "سلسلة الأيام",
    rank: "ترتيب الأسبوع",
  },
  badges: "الشارات",
  locked: "مقفلة",
  streak: "سلسلة الأيام",
  longest: "أطول سلسلة:",
  tomorrow: "مكافأة الغد:",
  history: "سجل النقاط",
  answers: "معلوماتي",
  answerLabels: {
    city: "المدينة",
    education: "المؤهل",
    major: "التخصص",
    experience: "الخبرة",
    interest: "الاهتمام",
    priority: "الأولوية",
  },
  target: "الوظيفة المستهدفة",
  changeTarget: "غيّر الهدف",
  about: "عن هذا العرض",
  aboutText:
    "منصة دليلك عرض تجريبي. الوظائف والجهات والدورات والمتسابقون بيانات تجريبية، والتقديم على الوظائف محاكاة. تحليل السيرة وحساب المطابقة ورسم المسار حقيقي ويُحسب من بياناتك. بياناتك محفوظة في هذا المتصفح، لا في حساب على خادم.",
  aboutModel: "عند تفعيل نموذج الذكاء الاصطناعي تُرسل رسائلك وملخص ملفك إلى مزوّد النموذج للرد فقط.",
  signOut: "تسجيل الخروج",
  reset: "إعادة ضبط العرض",
  resetBody: "سيُحذف تقدّمك ونقاطك من هذا المتصفح.",
  resetConfirm: "احذف وابدأ من جديد",
  cancel: "إلغاء",
  pickerTitle: "اختر صورتك",
  save: "حفظ",
} as const;

/** «المستوى 3 · مجتهد». */
export function levelLine(level: number, title: string): string {
  return `المستوى ${formatNumber(level)} · ${title}`;
}

/** «حذف بيانات {name}؟». */
export function resetTitle(name: string): string {
  return `حذف بيانات ${name}؟`;
}

/** «6 من 12». */
export function ofTotal(have: number, total: number): string {
  return `${formatNumber(have)} من ${formatNumber(total)}`;
}
