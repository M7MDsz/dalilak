// Owner: data. Copy that combines spec strings with values; every function returns final copy. Pure module.
// May import data and engine (never the reverse).
import { getCourse, getJob, getJobCity, getSkill, optionLabel } from "@/lib/data";
import { jobGap } from "@/lib/engine";
import { formatNumber, formatPercent } from "@/lib/format";
import { isCourseId, isJobId } from "@/lib/ids";
import type {
  ApplicationStatus,
  CourseId,
  CourseStateInfo,
  CvRecord,
  ExperienceBand,
  JobId,
  LockReason,
  NextStep,
  OnboardingAnswers,
  PriorityOption,
  QuestionId,
  RevealReason,
  UserFacts,
  XpEvent,
  XpNews,
} from "@/lib/types";

import { countNoun, countNounBare } from "./plural";
import {
  APPLICATION_STATUS_COPY,
  COURSE_STATE_LABEL,
  NEUTRAL_PRINT,
  XP_REASON,
  XP_REASON_ONBOARDING_AND_TARGET,
} from "./strings";

/** Arabic letters (the main block): a list item that starts with one takes «و» joined to it («والإحصاء»). */
const ARABIC_START = /^[؀-ۿ]/;

/**
 * Joins items with «و» as the spec writes lists in sentences: «Excel و SQL و Power BI» (a Latin item keeps a space
 * after «و»), «الإحصاء والتواصل الفعّال» (an Arabic item takes «و» joined to it).
 */
export function joinWithAnd(items: readonly string[]): string {
  return items.reduce((out, item, i) => {
    if (i === 0) return item;
    return ARABIC_START.test(item) ? `${out} و${item}` : `${out} و ${item}`;
  }, "");
}

/** «وادي الغيم للبيانات · الرياض» (reveal cards, roadmap header, job cards and page). */
export function companyCityLine(jobId: JobId): string {
  const job = getJob(jobId);
  return `${job.company} · ${getJobCity(job.city).name}`;
}

/** «نجمتان من 3», «نجمة من 1», «3 نجوم من 3»; with no star «0 من 3» (spec 3.5 skill panel). */
export function starsOf(held: number, max: number): string {
  const count = held === 0 ? formatNumber(0) : countNounBare(held, "star");
  return `${count} من ${formatNumber(max)}`;
}

/** Spec 3.8 wording: «Excel · نجمتان من نجمتين» (have) · «الإحصاء: لديك نجمة من نجمتين» · «Power BI: لا نجوم بعد، والمطلوب نجمة». */
export function starsOfRequired(skillName: string, held: number, need: number): string {
  if (held >= need) return `${skillName} · ${countNounBare(held, "star")} من ${countNounBare(need, "star", "object")}`;
  if (held > 0) return `${skillName}: لديك ${countNounBare(held, "star")} من ${countNounBare(need, "star", "object")}`;
  return `${skillName}: لا نجوم بعد، والمطلوب ${countNounBare(need, "star")}`;
}

/** Spec 3.10 labels («بدأتها»: a guide has no lessons to count). A locked step's reason is `lockReasonText`. */
export function courseStateLabel(info: CourseStateInfo): string {
  switch (info.state) {
    case "started":
    case "available":
    case "completed":
    case "credited":
    case "locked":
      return COURSE_STATE_LABEL[info.state];
  }
}

/** «تتطلب: Excel» · «تتطلب النجمة 1 في Excel» (spec 3.10). `star` is the star that is missing (the previous one). */
export function lockReasonText(reason: LockReason): string {
  const name = getSkill(reason.skill).name;
  switch (reason.kind) {
    case "prereq":
      return `تتطلب: ${name}`;
    case "previous-star":
      return `تتطلب النجمة ${formatNumber(reason.star)} في ${name}`;
  }
}

/**
 * A learning step's name as the user sees it: the skill it teaches («Power BI», «الإحصاء»). Courses are internal (the game
 * runs on them); the user meets a guide per skill, so the old course titles never show.
 */
export function stepName(courseId: CourseId): string {
  return getSkill(getCourse(courseId).skill).name;
}

/** «دليل Power BI» (the guide page's title and tab title). */
export function guideTitle(courseId: CourseId): string {
  return `دليل ${stepName(courseId)}`;
}

/** Spec 2.8 labels: «ارفع سيرتك الذاتية» · «أكمل تعلّم {skill}» · «تعلّم {skill}» · «قدّم على «{target}»» · «اختر هدفك التالي». */
export function nextStepLabel(step: NextStep): string {
  switch (step.rule) {
    case 1:
      return "ارفع سيرتك الذاتية";
    case 2:
      return `أكمل تعلّم ${stepName(step.courseId)}`;
    case 3:
      return `تعلّم ${stepName(step.courseId)}`;
    case 4:
      return `قدّم على «${getJob(step.jobId).title}»`;
    case 5:
      return "اختر هدفك التالي";
  }
}

/** Spec 4.6 reason 3, by the shared experience band. */
const EXPERIENCE_REASON = {
  entry: "مناسب للبدايات",
  junior: "يناسب خبرتك: من سنة إلى 3 سنوات",
  mid: "يناسب خبرتك: أكثر من 3 سنوات",
} as const satisfies Record<ExperienceBand, string>;

/** Spec 4.6 reason 5 (`explore` scores nothing, so it has no reason). */
const PRIORITY_REASON = {
  "first-job": "طريق قصير إلى أول وظيفة",
  switch: "انتقال من مجالك إلى ما تحب",
  grow: "تطوّر داخل مجالك",
} as const satisfies Record<Exclude<PriorityOption, "explore">, string>;

/** Spec 4.6 reasons: «يوافق اهتمامك: الأرقام والبيانات» · «قريب من تخصصك: …» · «مناسب للبدايات» … */
export function revealReasonText(reason: RevealReason): string {
  switch (reason.kind) {
    case "interest":
      return `يوافق اهتمامك: ${optionLabel("interest", reason.interest) ?? ""}`;
    case "major":
      return reason.tier === "primary"
        ? `قريب من تخصصك: ${reason.majorLabel}`
        : `يستفيد من تخصصك: ${reason.majorLabel}`;
    case "experience":
      return EXPERIENCE_REASON[reason.band];
    case "city":
      return reason.near ? `قريبة منك: ${reason.cityLabel}` : `في مدينتك: ${reason.cityLabel}`;
    case "remote":
      return "عن بُعد: يناسب أي مدينة";
    case "priority":
      return PRIORITY_REASON[reason.priority];
    case "bridge":
      // «أغيّر مجالي» (21 Nov 2026): the new field's job asks for skills the user's current career uses
      return `مهاراتك من ${reason.from} تنفعك فيه`;
    case "none":
      return "بداية مناسبة لاستكشاف خياراتك";
  }
}

/**
 * How an answer prints (slot card, profile «معلوماتي», apply sheet), neutral values per 4.3; null when unanswered.
 * City: the word the user typed («الخبر») or the chip label; none → «غير محدّدة». Education: unknown → «غير محدّد».
 * Major: the typed words or the chip label; `other` with nothing kept → «تخصص آخر». Interest: one or two labels,
 * joined with «، ».
 */
export function answerText(answers: OnboardingAnswers, question: QuestionId): string | null {
  switch (question) {
    case "city": {
      const city = answers.city;
      if (!city) return null;
      if (city.value === "none") return NEUTRAL_PRINT.city;
      return city.label.trim() || optionLabel("city", city.value) || NEUTRAL_PRINT.city;
    }
    case "education": {
      const education = answers.education;
      if (education === undefined) return null;
      if (education === "unknown") return NEUTRAL_PRINT.education;
      return optionLabel("education", education) ?? NEUTRAL_PRINT.education;
    }
    case "major": {
      const major = answers.major;
      if (!major) return null;
      const typed = major.label.trim();
      if (typed) return typed;
      return major.value === "other" ? NEUTRAL_PRINT.major : (optionLabel("major", major.value) ?? NEUTRAL_PRINT.major);
    }
    case "experience":
      return answers.experience === undefined ? null : optionLabel("experience", answers.experience);
    case "interest":
      return answers.interest === undefined
        ? null
        : answers.interest.map((interest) => optionLabel("interest", interest) ?? "").join("، ");
    case "priority":
      return answers.priority === undefined ? null : optionLabel("priority", answers.priority);
  }
}

/** Spec 3.8 apply sheet field 3: «بكالوريوس · نظم معلومات إدارية» (neutral or missing answers print as in 4.3). */
export function educationAndMajorText(answers: OnboardingAnswers): string {
  const education = answerText(answers, "education") ?? NEUTRAL_PRINT.education;
  const major = answerText(answers, "major") ?? NEUTRAL_PRINT.major;
  return `${education} · ${major}`;
}

/** The parts of the 7.4 note, already resolved to display names. */
export interface ApplicationNoteParts {
  readonly title: string;
  readonly company: string;
  readonly match: number;
  /** Fully met skills in the job's order (the first three are used). */
  readonly held: readonly string[];
  /** Unmet skills in the job's order (the first two are used). */
  readonly missing: readonly string[];
}

/**
 * The spec 7.4 template: «أتقدّم لوظيفة {title} لدى {company}. مطابقتي الحالية مع متطلبات الوظيفة {match}%، وأبرز ما
 * لديّ: {held}. وأعمل الآن على استكمال: {missing}.» With nothing missing the last sentence is dropped; with nothing held
 * the middle part becomes «وأبدأ الآن ببناء المهارات المطلوبة».
 */
export function applicationNoteText(parts: ApplicationNoteParts): string {
  const held = parts.held.slice(0, 3);
  const missing = parts.missing.slice(0, 2);
  const middle = held.length > 0 ? `وأبرز ما لديّ: ${joinWithAnd(held)}` : "وأبدأ الآن ببناء المهارات المطلوبة";
  const opening = `أتقدّم لوظيفة ${parts.title} لدى ${parts.company}.`;
  const matchSentence = `مطابقتي الحالية مع متطلبات الوظيفة ${formatPercent(parts.match)}، ${middle}.`;
  const closing = missing.length > 0 ? ` وأعمل الآن على استكمال: ${joinWithAnd(missing)}.` : "";
  return `${opening} ${matchSentence}${closing}`;
}

/** Spec 7.4 note template, built in the browser from the user's own data (no model ever writes it). */
export function applicationNote(jobId: JobId, facts: UserFacts): string {
  const job = getJob(jobId);
  const gap = jobGap(jobId, facts);
  return applicationNoteText({
    title: job.title,
    company: job.company,
    match: gap.match,
    held: gap.have.map((row) => getSkill(row.skill).name),
    missing: gap.missing.map((row) => getSkill(row.skill).name),
  });
}

/**
 * Spec 3.8 field 6: «مرفقة: {file name}» · «مرفقة: السيرة الجاهزة» · «لا توجد سيرة مرفقة». A pasted CV (no file name,
 * not the sample) prints «مرفقة: نص السيرة» (ARCHITECTURE §17 open question 1, provisional).
 */
export function cvAttachmentLine(cv: CvRecord | null): string {
  if (!cv) return "لا توجد سيرة مرفقة";
  if (cv.isSample) return "مرفقة: السيرة الجاهزة";
  if (cv.fileName) return `مرفقة: ${cv.fileName}`;
  return "مرفقة: نص السيرة";
}

/**
 * Spec 3.13 XP history row text, without the amount and the time: «أتممت خطوة Power BI». Other events:
 * «أكملت التعارف» · «اخترت هدفك» · «حلّلت سيرتك» · «قدّمت على وظيفة محلل بيانات» · «مكافأة يومية».
 */
export function xpHistoryText(event: XpEvent): string {
  switch (event.type) {
    case "course_completed":
      return isCourseId(event.ref) ? `أتممت خطوة ${stepName(event.ref)}` : XP_REASON.course_completed;
    case "job_applied":
      return isJobId(event.ref) ? `قدّمت على وظيفة ${getJob(event.ref).title}` : XP_REASON.job_applied;
    case "onboarding_completed":
    case "target_set":
    case "cv_analysed":
    case "daily_reward":
      return XP_REASON[event.type];
  }
}

/**
 * The reason line of a (possibly merged) XP toast (spec 3.15): onboarding + target together → «التعارف واختيار الهدف»;
 * otherwise the most recent event's reason (ARCHITECTURE §17 open question 2, provisional).
 */
export function xpNewsReason(news: XpNews): string {
  const types = new Set(news.types);
  if (types.size === 2 && types.has("onboarding_completed") && types.has("target_set")) {
    return XP_REASON_ONBOARDING_AND_TARGET;
  }
  const latest = news.types[news.types.length - 1];
  return latest === undefined ? "" : XP_REASON[latest];
}

/** «10 ساعات», «12 ساعة», «ساعتان»… (subject case). */
export function hoursText(hours: number): string {
  return countNoun(hours, "hour");
}

/** «هدفك الآن: {title}» (spec 3.8, 5.3 set_target_job). */
export function targetChangedToast(jobId: JobId): string {
  return `هدفك الآن: ${getJob(jobId).title}`;
}

/** «قدّمت · {status}» (spec 3.8 applied chip). */
export function appliedChip(status: ApplicationStatus): string {
  return `قدّمت · ${APPLICATION_STATUS_COPY[status].label}`;
}
