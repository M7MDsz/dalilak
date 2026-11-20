// Owner: data. The ONE counted-noun helper of spec "How to read → Counted nouns". Pure module.
// 1 → singular with «واحد/ة» (object case: «مركزاً واحداً»), 2 → dual (subject «مرحلتان» / object «مرحلتين»),
// 3-10 → "N plural" («8 مهارات»), 11+ → "N singular" («11 مهارة»). Digits are Latin (formatNumber).
//
// Two refinements of the rule, so that the Arabic stays correct beyond the demo's numbers:
// - From 11 to 99 the counted noun is an accusative singular (tamyīz), so a masculine noun takes its «اً»:
//   «11 يوماً», «20 درساً», «24 مركزاً». Feminine nouns ending in «ة» do not change in writing: «11 مهارة».
// - From 100 the last two digits decide the same way (103 → «103 أيام», 111 → «111 يوماً»), and a round hundred
//   (or 101, 102) takes the plain singular: «100 يوم». 0 takes the plain singular too: «0 مهارة».
import { formatNumber } from "@/lib/format";

export type CountedNoun =
  | "skill"
  | "stage"
  | "course"
  | "hour"
  | "lesson"
  | "job"
  | "star"
  | "place"
  | "day"
  | "application"
  | "badge"
  | "minute";

/** "subject": «بقيت لك مرحلتان»; "object" (also after a preposition): «صعدت مركزين», «وجدت وظيفتين». */
export type GrammaticalCase = "subject" | "object";

interface NounForms {
  /** «مهارة». */
  readonly singular: string;
  /** «مهارتان». */
  readonly dualSubject: string;
  /** «مهارتين». */
  readonly dualObject: string;
  /** «مهارات». */
  readonly plural: string;
  /** Feminine nouns take «واحدة» and never an «اً» (they all end in «ة»). */
  readonly feminine: boolean;
}

/** The forms of "How to read" (singular / dual subject / dual object / plural), plus minute for the time copy. */
const NOUNS = {
  skill: { singular: "مهارة", dualSubject: "مهارتان", dualObject: "مهارتين", plural: "مهارات", feminine: true },
  stage: { singular: "مرحلة", dualSubject: "مرحلتان", dualObject: "مرحلتين", plural: "مراحل", feminine: true },
  course: { singular: "دورة", dualSubject: "دورتان", dualObject: "دورتين", plural: "دورات", feminine: true },
  hour: { singular: "ساعة", dualSubject: "ساعتان", dualObject: "ساعتين", plural: "ساعات", feminine: true },
  lesson: { singular: "درس", dualSubject: "درسان", dualObject: "درسين", plural: "دروس", feminine: false },
  job: { singular: "وظيفة", dualSubject: "وظيفتان", dualObject: "وظيفتين", plural: "وظائف", feminine: true },
  star: { singular: "نجمة", dualSubject: "نجمتان", dualObject: "نجمتين", plural: "نجوم", feminine: true },
  place: { singular: "مركز", dualSubject: "مركزان", dualObject: "مركزين", plural: "مراكز", feminine: false },
  day: { singular: "يوم", dualSubject: "يومان", dualObject: "يومين", plural: "أيام", feminine: false },
  application: { singular: "طلب", dualSubject: "طلبان", dualObject: "طلبين", plural: "طلبات", feminine: false },
  badge: { singular: "شارة", dualSubject: "شارتان", dualObject: "شارتين", plural: "شارات", feminine: true },
  minute: { singular: "دقيقة", dualSubject: "دقيقتان", dualObject: "دقيقتين", plural: "دقائق", feminine: true },
} as const satisfies Record<CountedNoun, NounForms>;

/** The singular in the accusative: «يوماً», «مركزاً»; feminine nouns are written unchanged («مهارة»). */
function accusative(forms: NounForms): string {
  return forms.feminine ? forms.singular : `${forms.singular}اً`;
}

/** The counted form after a number of 0 or 3 and above: «8 مهارات», «11 يوماً», «100 يوم». */
function numbered(n: number, forms: NounForms): string {
  const lastTwo = Math.abs(Math.trunc(n)) % 100;
  const digits = formatNumber(n);
  if (n === 0) return `${digits} ${forms.singular}`;
  if (lastTwo >= 3 && lastTwo <= 10) return `${digits} ${forms.plural}`;
  if (lastTwo >= 11) return `${digits} ${accusative(forms)}`;
  return `${digits} ${forms.singular}`;
}

/** countNoun(2, "stage") → «مرحلتان»; countNoun(2, "place", "object") → «مركزين»; countNoun(8, "skill") → «8 مهارات». */
export function countNoun(n: number, noun: CountedNoun, grammaticalCase: GrammaticalCase = "subject"): string {
  const forms: NounForms = NOUNS[noun];
  if (n === 1) {
    if (forms.feminine) return `${forms.singular} واحدة`;
    return grammaticalCase === "object" ? `${accusative(forms)} واحداً` : `${forms.singular} واحد`;
  }
  if (n === 2) return grammaticalCase === "object" ? forms.dualObject : forms.dualSubject;
  return numbered(n, forms);
}

/**
 * Like countNoun, but 1 is the bare noun, without «واحد/ة»: for places where the number is implied or follows in the
 * sentence. «قبل دقيقة» (not «قبل دقيقة واحدة»), «نجمة من نجمتين», «والمطلوب نجمة».
 */
export function countNounBare(n: number, noun: CountedNoun, grammaticalCase: GrammaticalCase = "subject"): string {
  if (n === 1) return NOUNS[noun].singular;
  return countNoun(n, noun, grammaticalCase);
}
