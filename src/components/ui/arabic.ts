// Counted nouns for the few strings the kit writes itself (spec "How to read": 1 singular, 2 dual, 3-10 plural, 11+ singular).
// The product's shared helper (owned by the screen builders) does the full job with cases; the kit only needs these.

/** «نجمة واحدة من 3» · «نجمتان من 3» · «3 نجوم من 3» · «0 من 3 نجوم» */
export function starsLabel(value: number, slots: number): string {
  if (value <= 0) return `0 من ${slots} نجوم`;
  if (value === 1) return `نجمة واحدة من ${slots}`;
  if (value === 2) return `نجمتان من ${slots}`;
  return `${value} نجوم من ${slots}`;
}

/** The line under the streak number: «اليوم الأول» · «يومان متتاليان» · «4 أيام متتالية» (without the number) */
export function streakDaysWord(days: number): string {
  if (days === 1) return "اليوم الأول";
  if (days === 2) return "يومان متتاليان";
  if (days >= 3 && days <= 10) return "أيام متتالية";
  return "يوماً متتالياً";
}

export const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;
export const WEEK_LETTERS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"] as const;
