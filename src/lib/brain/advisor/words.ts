// Owner: brain-advisor. The word lists of spec 5.4, 5.5 rule 7 and 5.7, and the matching helpers the router uses.
// Recognition is by WHOLE words after the normalisation of 4.3 (engine `normalizeText`, `findKeyword`: with or without
// «ال», with or without one one-letter prefix). Keywords are written here as the spec writes them and normalised once,
// lazily (never at module load, so importing this file has no cost and no dependency on the engine being ready).
import { COURSES, JOBS, SKILLS } from "@/lib/data";
import { shortTitle } from "@/lib/engine";
import { findKeyword, findKeywords, normalizeText, tokenize } from "@/lib/text/normalize";
import type { KeywordHit } from "@/lib/text/normalize";
import type { CourseId, JobCityId, JobFieldId, JobId, NavScreen, SkillId } from "@/lib/types";

// ── Normalisation cache ────────────────────────────────────────────────────────────────────────────────────────────

const normalized = new WeakMap<readonly string[], readonly string[]>();

/** The list, each keyword normalised (cached per list object). */
export function norm(list: readonly string[]): readonly string[] {
  let out = normalized.get(list);
  if (!out) {
    out = list.map((k) => normalizeText(k)).filter((k) => k.length > 0);
    normalized.set(list, out);
  }
  return out;
}

/** A message ready for matching: its normalised text and its words. */
export interface Text {
  readonly raw: string;
  readonly n: string;
  readonly words: readonly string[];
}

export function textOf(raw: string): Text {
  const n = normalizeText(raw);
  return { raw, n, words: tokenize(n) };
}

/** True when any keyword of the list is in the text as whole words. */
export function has(text: Text, list: readonly string[]): boolean {
  for (const k of norm(list)) if (findKeyword(text.n, k) !== null) return true;
  return false;
}

/** The earliest hit of any keyword of the list (ties: the longer keyword), or null. */
export function firstHit(text: Text, list: readonly string[]): KeywordHit | null {
  return findKeywords(text.n, norm(list))[0] ?? null;
}

/** Every hit of any keyword of the list, sorted by start (longer first at the same start). */
export function hits(text: Text, list: readonly string[]): readonly KeywordHit[] {
  return findKeywords(text.n, norm(list));
}

// ── 5.4: question words, and the three typed requests ─────────────────────────────────────────────────────────────

/** A message that OPENS with one of these is a question, never a request (5.4). «من أين / من وين» count too. */
export const QUESTION_OPENERS = ["لماذا", "ليش", "ليه", "كيف", "متى", "أين", "وين", "أي", "ماذا", "ما", "وش", "ايش", "إيش", "شنو", "كم", "هل"];
const QUESTION_AFTER_MIN = ["أين", "وين"];

export function opensWithQuestion(text: Text): boolean {
  const [first, second] = text.words;
  if (first === undefined) return false;
  const openers = norm(QUESTION_OPENERS);
  if (openers.includes(first)) return true;
  return first === normalizeText("من") && second !== undefined && norm(QUESTION_AFTER_MIN).includes(second);
}

/** Apply: the imperative verbs (alone or with لي، عني). */
export const APPLY_VERBS = ["قدّم", "قدّمي", "قدّملي", "قدملي", "سجّلني", "apply"];
/** Apply: a wish word followed within three words by one of APPLY_WISH_TARGETS. */
export const WISH_WORDS = ["أريد", "أبغى", "أبي", "ودّي", "ممكن"];
export const APPLY_WISH_TARGETS = ["أقدّم", "تقدّم", "تقديم", "التقديم"];
/** Apply: a job reference (plus a job title, plus «هذه»/«هذي» on a job page). */
export const JOB_REFERENCES = ["وظيفة", "الوظيفة", "عليها", "الوظيفه"];
export const THIS_WORDS = ["هذه", "هذي", "هاذي", "هذا"];
/** Apply: a course word excludes the apply reading («ابدأ دورة العرض والتقديم»). */
export const COURSE_WORDS = ["دورة", "الدورة", "دورات"];

/** Start a course. */
export const START_VERBS = ["ابدأ", "ابدئي", "سجّلني في الدورة", "start"];
/** Set the target. */
export const TARGET_VERBS = ["اجعل", "اجعلها", "خلها", "غيّر"];
export const MY_TARGET = ["هدفي"];

// ── 5.7 row 1: refuse to complete; row 2: real, real-world numbers ────────────────────────────────────────────────

export const COMPLETE_VERBS = ["أكمل", "كمّل", "خلّص", "أنهِ", "انهي"];
export const LESSON_WORDS = ["الدورة", "دورة", "الدرس", "درس", "الدروس"];
export const FOR_ME = ["عني", "لي", "بدالي", "عنّي"];
export const GIVE_ME = ["أعطني", "عطني", "اعطني", "أعطيني", "اعطيني", "زودني", "زوّدني", "ضيف لي", "أضف لي", "give me"];
export const GRANT_WORDS = ["XP", "نقاط", "النقاط", "شارة", "شارات", "نجمة", "نجوم"];
/** A grant request about skill stars (answered with the star wording, not the points-and-badges one). */
export const GRANT_STAR_WORDS = ["نجمة", "نجوم"];

/** Refuse: invent an employer or a job (a verb of making up + a company or job word). Spec 5.1, 5.5 rule 2. */
export const INVENT_VERBS = [
  "اخترع", "اخترعلي", "اخترع لي", "ألّف لي", "اختلق", "سوّ لي", "سو لي", "سوي لي", "اصنع لي", "invent", "make up", "fake",
];
export const INVENT_OBJECTS = ["شركة", "شركات", "جهة", "جهات", "وظيفة", "وظائف", "وظايف", "company", "employer", "job"];

/**
 * A message made ONLY of acknowledgement words («تمام», «طيب», «اوكي»…), optionally with the vocative fillers: after a
 * reply that offered yes / no chips it is the yes chip; otherwise a short warm reply. Same for the no words.
 */
export const ACK_WORDS = [
  "تمام", "طيب", "اوكي", "أوكي", "اوكيه", "اوك", "ok", "okay", "زين", "حلو", "ماشي", "خلاص", "ممتاز", "أكيد", "نعم",
  "أيوه", "ايوا", "يلا", "يالله", "yes", "sure", "yep",
];
export const NO_WORDS = ["لا", "لأ", "no", "nope", "مو الحين", "مو الآن", "ليس الآن", "بعدين", "لاحقاً", "لاحقا", "not now", "later"];
/** Words allowed around an acknowledgement or a no without changing it: «تمام يا دليل», «لا والله». */
export const ACK_FILLERS = ["يا", "دليل", "والله", "جداً", "جدا"];
/** Allowed around a no only: «لا شكراً» is a polite no, while «تمام شكراً» stays a thanks (row 19). */
export const NO_FILLERS = ["شكراً", "شكرا", "مشكور", "thanks"];

export const REAL_WORDS = ["حقيقي", "حقيقية", "وهمي", "وهمية", "real"];
export const REAL_NUMBER_WORDS = [
  "راتب", "رواتب", "الراتب", "كم يدفعون", "إحصائية", "إحصائيات", "بطالة", "سوق العمل", "salary",
  // the future / demand of a field: no market claims either (18 Nov 2026: the model said «الطلب عليه عالٍ جداً»)
  "له مستقبل", "مستقبل المجال", "مستقبله", "الطلب على", "الطلب عليه", "مطلوب في السوق", "مطلوبة في السوق", "يتوظفون بسرعة",
];
/** Worry, fear, frustration: «دليل» comforts first, then the next step (T.feelingsLead). */
export const FEELING_WORDS = [
  "خايف", "خايفة", "خوف", "قلقان", "قلقانة", "قلق", "تعبت", "تعبان", "تعبانة", "محبط", "محبطة", "إحباط", "زهقت", "طفشت",
  "يأست", "يئست", "متضايق", "متضايقة", "ضايقة", "انرفضت", "رفضوني", "ما أحد رد", "ما احد رد", "محد رد", "فاشل", "فاشلة",
];
/** «كيف أكتب سيرة قوية»: with a CV word, T.cvTips. */
export const CV_WRITE_WORDS = ["أكتب", "اكتب", "أسوي", "اسوي", "أحسّن", "احسن", "أحسن", "أطور", "اطور", "أقوي", "اقوي", "قوية", "write", "improve"];
/** «نصيحة للمقابلة»: T.interviewTips. */
export const INTERVIEW_WORDS = ["مقابلة", "المقابلة", "مقابلات", "المقابلات", "انترفيو", "interview"];

// ── 5.7 row 7: job search ──────────────────────────────────────────────────────────────────────────────────────────

/** «وظايف» (ي for ئ) is how many Saudis type the plural; «وظيفه» is already «وظيفة» after the 4.3 normalisation. */
export const JOBS_WORDS = ["وظائف", "وظايف", "وظيفة", "jobs", "job"];
/** The plural alone (row 7: an open word with one title in the singular opens that job; the plural searches). */
export const JOBS_PLURAL = ["وظائف", "وظايف", "jobs"];
export const BEST_WORDS = ["أنسب", "أفضل", "أقرب", "احسن", "أحسن"];
export const SEARCH_PREPOSITIONS = ["في", "لدى", "عند"];
/** After في in an apply request these start no employer name («في أسرع وقت», «في مجالي»). */
export const NOT_EMPLOYER_WORDS = ["أسرع", "اسرع", "أقرب", "وقت", "مجال", "مجالي", "تخصصي", "مدينتي", "نفس", "هذا", "هذه"];
/** Generic words left out of the employer words before they are searched («عند شركة وادي الغيم» → «وادي الغيم»). */
export const GENERIC_EMPLOYER_WORDS = ["شركة", "شركه", "جهة", "مؤسسة", "company"];

export const FIELD_WORDS: Readonly<Record<JobFieldId, readonly string[]>> = {
  data: ["data", "بيانات", "البيانات", "تحليل البيانات"],
  software: ["software", "برمجة", "البرمجة", "برمجيات", "البرمجيات", "تطوير البرمجيات"],
  design: ["design", "تصميم", "التصميم"],
  marketing: ["marketing", "تسويق", "التسويق"],
  business: ["business", "أعمال", "الأعمال", "المشاريع"],
  hr: ["hr", "موارد بشرية", "الموارد البشرية"],
};

export const CITY_WORDS: Readonly<Record<JobCityId, readonly string[]>> = {
  riyadh: ["الرياض", "رياض", "riyadh"],
  jeddah: ["جدة", "جده", "jeddah"],
  dammam: ["الدمام", "دمام", "الخبر", "الظهران", "dammam", "khobar"],
  remote: ["عن بُعد", "عن بعد", "remote", "من البيت"],
};

// ── 5.7 row 8 and 5.5 rule 7: open a page ─────────────────────────────────────────────────────────────────────────

export const OPEN_WORDS = [
  "افتح", "افتحلي", "ورّني", "وريني", "أرني", "اعرض", "روح", "خذني", "ودّني", "ودني", "وديني",
  // with an object pronoun («طيب افتحها لي» after «دليل» named a course): whole-word matching misses these otherwise
  "افتحها", "افتحه", "افتحهم", "افتحهن", "اعرضها", "اعرضه", "اعرضلي",
  "أبغى أشوف", "أبي أشوف", "خلني أشوف", "وين", "open", "show", "go to",
];

export const PAGE_WORDS: Readonly<Record<Exclude<NavScreen, "job" | "course">, readonly string[]>> = {
  path: ["مساري", "المسار", "path", "roadmap"],
  skills: ["المهارات", "مهاراتي", "الشجرة", "شجرة المهارات", "skills", "tree"],
  cv: ["سيرتي", "السيرة", "السيرة الذاتية", "cv", "resume"],
  jobs: ["الوظائف", "الوظايف", "jobs"],
  applications: ["طلباتي", "الطلبات", "applications"],
  learn: ["الدورات", "دوراتي", "courses"],
  leaderboard: ["المتصدرون", "المتصدرين", "الترتيب", "leaderboard", "rank"],
  profile: ["ملفي", "الشارات", "profile", "badges"],
};
export const UPLOAD_WORDS = ["أرفع", "ارفع"];
export const CV_WORDS = ["سيرتي", "السيرة", "سيرة", "السيرة الذاتية", "cv", "resume"];
export const SKILL_WORDS = ["مهارة", "المهارة"];

// ── 5.7 rows 9-20 ──────────────────────────────────────────────────────────────────────────────────────────────────

export const WHY_WORDS = ["لماذا", "ليش", "ليه", "كيف", "وش سبب", "why"];
export const MATCH_WORDS = ["مطابقة", "مطابقتي", "المطابقة", "نسبة", "نسبتي", "match"];
export const GAP_WORDS = ["ينقصني", "تنقصني", "ناقصني", "الفجوة", "المطلوب", "ينقصني", "الناقص"];
export const NEXT_STEP_WORDS = [
  "ماذا أفعل", "وش أسوي", "ايش أسوي", "إيش اسوي", "شنو أسوي", "الخطوة التالية", "خطوتي التالية", "وش التالي",
  "وش بعدين", "وش الخطوة الجاية", "من أين أبدأ", "من وين أبدأ", "أبدأ بها", "ماذا بعد", "what next",
  "what should i do", "what now",
];
export const COURSE_GAIN_WORDS = ["ترفع مطابقتي", "كم ترفع", "يرفع مطابقتي"];
export const PATH_COURSES_WORDS = ["دورات مساري", "دورات المسار"];
export const SHORT_COURSES_WORDS = ["دورات قصيرة", "دورة قصيرة", "أقصر الدورات", "أقصر دورة"];
export const LEADERBOARD_WORDS = ["الترتيب", "المتصدرين", "مركزي", "المركز", "يفصلني", "أتقدّم", "أصعد"];
export const RANK_GAP_WORDS = ["يفصلني", "كم بيني"];
export const XP_WORDS = ["نقاطي", "كم XP", "مستواي", "المستوى", "سلسلتي", "السلسلة"];
export const STREAK_WORDS = ["سلسلتي", "السلسلة"];
export const BADGE_WORDS = ["شارة", "شارات", "الشارات"];
export const STARS_WORDS = ["النجوم"];
export const APPLICATIONS_WORDS = ["طلبي", "طلباتي", "حالة", "الرد"];
export const GREETING_SALAM = ["السلام", "سلام"];
export const GREETING_WORDS = ["السلام", "مرحبا", "هلا", "أهلاً", "أهلين", "صباح", "مساء", "hi", "hello"];
export const THANKS_WORDS = ["شكراً", "مشكور", "يعطيك العافية", "تسلم", "thanks", "thank you"];
export const WHO_WORDS = ["من أنت", "مين أنت", "ما اسمك", "هل أنت"];

// ── 5.8 fixed answers, typed (matched before the general intents) ─────────────────────────────────────────────────

export const REMAINING_ASK = ["كم"];
export const REMAINING_LEFT = ["بقي", "باقي", "تبقى", "يتبقى", "متبقي"];
export const REMAINING_GOAL = ["هدفي", "الهدف", "مساري", "المسار", "للوظيفة", "100"];
export const WHY_PATH_GOAL = ["المسار", "مساري", "هدفي", "الهدف", "اخترته", "اخترت"];
export const STARS_HOW_VERB = ["تحسب", "تُحسب", "تحدد", "تُحدَّد", "تنحسب"];
export const STARS_HOW_OBJECT = ["النجوم", "نجوم", "مستويات", "المستويات"];
export const CV_WHAT_VERB = ["تقرأ", "تقرا", "تبحث", "تشوف", "تدور"];
export const CV_WHAT_ASK = ["ماذا", "وش", "ايش", "إيش", "شو"];
export const NO_CV = ["ليست عندي", "ليس عندي", "ما عندي", "ماعندي", "مافي", "لا أملك", "لا يوجد", "ما عندي"];
export const LEVEL_HOW_VERB = ["أرفع", "ارفع", "يرتفع", "أزيد", "يزيد", "أصعد", "أتقدّم", "أطلع"];
export const LEVEL_WORDS = ["مستواي", "المستوى", "مستوى"];

// ── Entities: job titles, course titles, skill names ───────────────────────────────────────────────────────────────

interface Entity<Id> {
  readonly id: Id;
  readonly key: string;
}

let jobTitles: readonly Entity<JobId>[] | null = null;
let courseTitles: readonly Entity<CourseId>[] | null = null;
let skillNames: readonly Entity<SkillId>[] | null = null;

function jobEntities(): readonly Entity<JobId>[] {
  jobTitles ??= JOBS.map((job) => ({ id: job.id, key: normalizeText(job.title) }));
  return jobTitles;
}

function courseEntities(): readonly Entity<CourseId>[] {
  courseTitles ??= COURSES.flatMap((course) => {
    const full = normalizeText(course.title);
    const short = normalizeText(shortTitle(course));
    return short !== full ? [{ id: course.id, key: full }, { id: course.id, key: short }] : [{ id: course.id, key: full }];
  });
  return courseTitles;
}

function skillEntities(): readonly Entity<SkillId>[] {
  skillNames ??= SKILLS.map((skill) => ({ id: skill.id, key: normalizeText(skill.name) }));
  return skillNames;
}

/**
 * The entities named in the text (whole words). Rule: when two names overlap, the longer one is meant (5.4: «when two
 * titles match, the longer one is meant»). Returns the distinct ids left, in order of appearance.
 */
function namedIn<Id>(text: Text, entities: readonly Entity<Id>[]): readonly Id[] {
  const found: { id: Id; start: number; end: number; length: number }[] = [];
  for (const entity of entities) {
    const hit = findKeyword(text.n, entity.key);
    if (hit) found.push({ id: entity.id, start: hit.start, end: hit.end, length: entity.key.length });
  }
  const kept = found.filter(
    (a) => !found.some((b) => b !== a && b.length > a.length && b.start <= a.start && b.end >= a.end),
  );
  kept.sort((a, b) => a.start - b.start || b.length - a.length);
  const ids: Id[] = [];
  for (const k of kept) if (!ids.includes(k.id)) ids.push(k.id);
  return ids;
}

export function jobsNamed(text: Text): readonly JobId[] {
  return namedIn(text, jobEntities());
}

export function coursesNamed(text: Text): readonly CourseId[] {
  return namedIn(text, courseEntities());
}

export function skillsNamed(text: Text): readonly SkillId[] {
  return namedIn(text, skillEntities());
}

/** The span of the job title found in the text (used to keep its words out of the field and city readings). */
export function jobTitleHit(text: Text, jobId: JobId): KeywordHit | null {
  const entity = jobEntities().find((e) => e.id === jobId);
  return entity ? findKeyword(text.n, entity.key) : null;
}

/** Word index of the first occurrence of any of the words, or -1. */
export function indexOfAny(text: Text, list: readonly string[]): number {
  const hit = firstHit(text, list);
  return hit ? hit.start : -1;
}
