// Owner: data. The twelve badges of spec 8.6, in table order: name, description (unlocked) and hint (locked).
// The unlock RULES are engine code (src/lib/engine/badges.ts), not data. Pure module.
import type { Badge, BadgeId } from "@/lib/types";

export const BADGES: readonly Badge[] = [
  {
    id: "first-steps",
    name: "الخطوة الأولى",
    description: "أكملت التعارف مع دليلك.",
    hint: "أكمل التعارف مع دليلك.",
  },
  {
    id: "goal-set",
    name: "صاحب هدف",
    description: "اخترت وظيفتك المستهدفة.",
    hint: "اختر وظيفتك المستهدفة.",
  },
  {
    id: "cv-scanned",
    name: "سيرة مقروءة",
    description: "حلّلت سيرتك واكتشفت مهاراتك.",
    hint: "حلّل سيرتك الذاتية.",
  },
  {
    id: "first-application",
    name: "أول تقديم",
    description: "قدّمت على أول وظيفة.",
    hint: "قدّم على وظيفة.",
  },
  {
    id: "first-course",
    name: "أول خطوة تعلّم",
    description: "أتممت أول خطوة تعلّم.",
    hint: "أتمّ خطوة تعلّم واحدة.",
  },
  {
    id: "five-courses",
    name: "خمس خطوات تعلّم",
    description: "أتممت خمس خطوات تعلّم.",
    hint: "أتمّ خمس خطوات تعلّم.",
  },
  {
    id: "streak-3",
    name: "ثلاثة أيام",
    description: "عدت ثلاثة أيام متتالية.",
    hint: "عد ثلاثة أيام متتالية.",
  },
  {
    id: "streak-7",
    name: "أسبوع كامل",
    description: "عدت سبعة أيام متتالية.",
    hint: "عد سبعة أيام متتالية.",
  },
  {
    id: "ten-skills",
    name: "عشر مهارات",
    description: "لديك نجمة على الأقل في عشر مهارات.",
    hint: "اكسب نجمة في عشر مهارات.",
  },
  {
    id: "level-5",
    name: "المستوى الخامس",
    description: "بلغت المستوى 5: محترف.",
    hint: "اجمع 1000 XP.",
  },
  {
    id: "job-ready",
    name: "جاهز للوظيفة",
    description: "بلغت مطابقة 100% مع وظيفتك المستهدفة.",
    hint: "ابلغ 100% مع وظيفتك المستهدفة.",
  },
  {
    id: "top-ten",
    name: "ضمن العشرة الأوائل",
    description: "دخلت العشرة الأوائل في ترتيب الأسبوع.",
    hint: "ادخل العشرة الأوائل هذا الأسبوع.",
  },
];

export function getBadge(id: BadgeId): Badge {
  const badge = BADGES.find((b) => b.id === id);
  if (!badge) throw new Error(`data: unknown badge ${id}`);
  return badge;
}
