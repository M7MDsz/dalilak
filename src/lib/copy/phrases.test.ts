// Owner: data. The copy helpers that combine spec strings with values, and `applicationNote` = the 7.4 demo text at 90%.
// Tests that call the engine (short titles, the gap) run as soon as the engine is built; while its stubs still throw
// "not built yet" they are skipped, so phase A stays green whichever agent lands first.
import { describe, expect, it } from "vitest";

import { getCourse } from "@/lib/data";
import { jobGap, shortTitle } from "@/lib/engine";
import type { CvRecord, OnboardingAnswers, UserFacts, XpEvent, XpNews } from "@/lib/types";

import {
  answerText,
  appliedChip,
  applicationNote,
  applicationNoteText,
  companyCityLine,
  courseStateLabel,
  cvAttachmentLine,
  educationAndMajorText,
  hoursText,
  joinWithAnd,
  lockReasonText,
  nextStepLabel,
  revealReasonText,
  starsOf,
  starsOfRequired,
  targetChangedToast,
  xpHistoryText,
  xpNewsReason,
} from "./phrases";
import {
  APPLICATION_STATUS_COPY,
  ASK_ADVISOR_APPLY_TEXT,
  BAND_LABEL,
  COURSE_STATE_LABEL,
  NAV_LABEL,
  NEUTRAL_PRINT,
  SAMPLE_COPY,
  SOURCE_LABEL,
  STAGE_STATE_LABEL,
  TOAST_COPY,
  XP_REASON,
  XP_REASON_ONBOARDING_AND_TARGET,
} from "./strings";

// ─── fixtures: the demo persona of spec 10 ────────────────────────────────────────────────────────────────────────

const T = new Date(2026, 10, 18, 21, 0).getTime();

/** Spec 4.6 worked example. */
const DEMO_ANSWERS: OnboardingAnswers = {
  city: { value: "riyadh", label: "الرياض" },
  education: "bachelor",
  major: { value: "mis", label: "نظم معلومات إدارية" },
  experience: "none",
  interest: ["data"],
  priority: "first-job",
};

/** The sample CV's result (spec 6.2). */
const SAMPLE_CV: CvRecord = {
  fileName: null,
  isSample: true,
  engine: "local",
  analysedAt: T,
  skills: [
    { skill: "excel", stars: 2, evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.", line: 11 },
    { skill: "sql", stars: 2, evidence: "كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.", line: 12 },
    { skill: "statistics", stars: 1, evidence: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.", line: 7 },
    { skill: "programming", stars: 1, evidence: "من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.", line: 7 },
    { skill: "english", stars: 2, evidence: "الإنجليزية: جيد جداً.", line: 25 },
    { skill: "communication", stars: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم.", line: 21 },
    { skill: "presentation", stars: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم.", line: 21 },
    { skill: "teamwork", stars: 1, evidence: "التواصل، العمل الجماعي، العرض والتقديم.", line: 21 },
  ],
};

/** «خالد» after the sample CV and the Power BI course (demo step 11, before applying). */
const AFTER_POWER_BI: UserFacts = {
  id: "خالد",
  name: "خالد",
  avatar: "av-01",
  createdAt: T,
  createdDay: "2026-11-18",
  answers: DEMO_ANSWERS,
  onboardingCompletedAt: T,
  targetJobId: "data-analyst-riyadh",
  cv: SAMPLE_CV,
  cvSkipped: false,
  courses: { "c-powerbi-1": { startedAt: T, ticked: [1, 2, 3, 4, 5], completedAt: T } },
  xpEvents: [],
  applications: [],
  activeDays: ["2026-11-18"],
  badges: [],
};

const DEMO_NOTE =
  "أتقدّم لوظيفة محلل بيانات لدى وادي الغيم للبيانات. مطابقتي الحالية مع متطلبات الوظيفة 90%، وأبرز ما لديّ: Excel و SQL و Power BI. وأعمل الآن على استكمال: الإحصاء.";

/** True once the engine functions these tests call are built (their stubs throw "not built yet"). */
function engineBuilt(): boolean {
  try {
    shortTitle(getCourse("c-powerbi-1"));
    jobGap("data-analyst-riyadh", AFTER_POWER_BI);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("not built yet")) return false;
    throw error;
  }
}

function xpEvent(partial: Pick<XpEvent, "type" | "ref">): XpEvent {
  return { id: partial.type, amount: 10, at: T, announced: false, ...partial };
}

function news(types: XpNews["types"]): XpNews {
  return { eventIds: [...types], amount: 80, types, rankLine: null, levelUp: null };
}

// ─── strings ──────────────────────────────────────────────────────────────────────────────────────────────────────

describe("shared strings", () => {
  it("fills every value with final copy", () => {
    const groups: Record<string, Record<string, string>> = {
      SAMPLE_COPY,
      XP_REASON,
      STAGE_STATE_LABEL,
      COURSE_STATE_LABEL,
      BAND_LABEL,
      NAV_LABEL,
      NEUTRAL_PRINT,
      SOURCE_LABEL,
      TOAST_COPY,
    };
    for (const [group, values] of Object.entries(groups)) {
      for (const [key, value] of Object.entries(values)) expect(value.trim().length, `${group}.${key}`).toBeGreaterThan(0);
    }
    for (const [status, copy] of Object.entries(APPLICATION_STATUS_COPY)) {
      expect(copy.label.length * copy.note.length, status).toBeGreaterThan(0);
    }
    expect(XP_REASON_ONBOARDING_AND_TARGET).toBe("التعارف واختيار الهدف");
    expect(ASK_ADVISOR_APPLY_TEXT).toBe("قدّم لي على هذه الوظيفة");
    expect(SAMPLE_COPY.company).toBe("جهة تجريبية");
    expect(NAV_LABEL.path).toBe("مساري");
  });
});

// ─── phrases that need only data ──────────────────────────────────────────────────────────────────────────────────

describe("stars (3.5, 3.8)", () => {
  it("writes «نجمتان من 3» and its family", () => {
    expect(starsOf(2, 3)).toBe("نجمتان من 3");
    expect(starsOf(1, 1)).toBe("نجمة من 1");
    expect(starsOf(3, 3)).toBe("3 نجوم من 3");
    expect(starsOf(0, 2)).toBe("0 من 2");
  });

  it("writes the gap rows of 3.8", () => {
    expect(starsOfRequired("Excel", 2, 2)).toBe("Excel · نجمتان من نجمتين");
    expect(starsOfRequired("التواصل الفعّال", 1, 1)).toBe("التواصل الفعّال · نجمة من نجمة");
    expect(starsOfRequired("الإحصاء", 1, 2)).toBe("الإحصاء: لديك نجمة من نجمتين");
    expect(starsOfRequired("Power BI", 0, 1)).toBe("Power BI: لا نجوم بعد، والمطلوب نجمة");
    expect(starsOfRequired("الإحصاء", 0, 2)).toBe("الإحصاء: لا نجوم بعد، والمطلوب نجمتان");
    expect(starsOfRequired("SQL", 0, 3)).toBe("SQL: لا نجوم بعد، والمطلوب 3 نجوم");
  });
});

describe("course states and locks (3.10)", () => {
  it("labels each state, with the counts while started", () => {
    expect(courseStateLabel({ state: "available" })).toBe("متاحة");
    expect(courseStateLabel({ state: "started", ticked: [1, 2], total: 5 })).toBe("بدأتها · 2 من 5");
    expect(courseStateLabel({ state: "completed", at: T })).toBe("مكتملة");
    expect(courseStateLabel({ state: "credited", by: { kind: "cv", evidence: "…" } })).toBe("مثبتة");
    expect(courseStateLabel({ state: "locked", lock: { kind: "prereq", skill: "excel" } })).toBe("مقفلة");
  });

  it("explains a lock", () => {
    expect(lockReasonText({ kind: "prereq", skill: "excel" })).toBe("تتطلب: Excel");
    expect(lockReasonText({ kind: "previous-star", skill: "excel", star: 1 })).toBe("تتطلب النجمة 1 في Excel");
  });
});

describe("next step labels (2.8) that need no course", () => {
  it("writes rules 1, 4 and 5", () => {
    expect(nextStepLabel({ rule: 1 })).toBe("ارفع سيرتك الذاتية");
    expect(nextStepLabel({ rule: 4, jobId: "data-analyst-riyadh" })).toBe("قدّم على «محلل بيانات»");
    expect(nextStepLabel({ rule: 5 })).toBe("اختر هدفك التالي");
  });
});

describe("reveal reasons (4.6)", () => {
  it("writes the demo's three reasons and every other kind", () => {
    expect(revealReasonText({ kind: "interest", interest: "data" })).toBe("يوافق اهتمامك: الأرقام والبيانات");
    expect(revealReasonText({ kind: "major", tier: "primary", majorLabel: "نظم معلومات إدارية" })).toBe(
      "قريب من تخصصك: نظم معلومات إدارية",
    );
    expect(revealReasonText({ kind: "experience", band: "entry" })).toBe("مناسب للبدايات");
    expect(revealReasonText({ kind: "major", tier: "secondary", majorLabel: "إدارة أعمال" })).toBe("يستفيد من تخصصك: إدارة أعمال");
    expect(revealReasonText({ kind: "experience", band: "junior" })).toBe("يناسب خبرتك: من سنة إلى 3 سنوات");
    expect(revealReasonText({ kind: "experience", band: "mid" })).toBe("يناسب خبرتك: أكثر من 3 سنوات");
    expect(revealReasonText({ kind: "city", cityLabel: "الرياض" })).toBe("في مدينتك: الرياض");
    expect(revealReasonText({ kind: "remote" })).toBe("عن بُعد: يناسب أي مدينة");
    expect(revealReasonText({ kind: "priority", priority: "first-job" })).toBe("طريق قصير إلى أول وظيفة");
    expect(revealReasonText({ kind: "priority", priority: "switch" })).toBe("انتقال من مجالك إلى ما تحب");
    expect(revealReasonText({ kind: "priority", priority: "grow" })).toBe("تطوّر داخل مجالك");
    expect(revealReasonText({ kind: "none" })).toBe("بداية مناسبة لاستكشاف خياراتك");
  });
});

describe("answers (4.3 neutral prints, 3.8 field 3)", () => {
  it("prints the demo answers", () => {
    expect(answerText(DEMO_ANSWERS, "city")).toBe("الرياض");
    expect(answerText(DEMO_ANSWERS, "education")).toBe("بكالوريوس");
    expect(answerText(DEMO_ANSWERS, "major")).toBe("نظم معلومات إدارية");
    expect(answerText(DEMO_ANSWERS, "experience")).toBe("بدون خبرة بعد");
    expect(answerText(DEMO_ANSWERS, "interest")).toBe("الأرقام والبيانات");
    expect(answerText(DEMO_ANSWERS, "priority")).toBe("أول وظيفة بأسرع وقت");
    expect(educationAndMajorText(DEMO_ANSWERS)).toBe("بكالوريوس · نظم معلومات إدارية");
  });

  it("prints typed words, neutral values and two interests", () => {
    const answers: OnboardingAnswers = {
      city: { value: "dammam", label: "الخبر" },
      education: "unknown",
      major: { value: "other", label: "" },
      experience: "none",
      interest: ["data", "marketing"],
      priority: "explore",
    };
    expect(answerText(answers, "city")).toBe("الخبر");
    expect(answerText({ city: { value: "none", label: "" } }, "city")).toBe("غير محدّدة");
    expect(answerText(answers, "education")).toBe("غير محدّد");
    expect(answerText(answers, "major")).toBe("تخصص آخر");
    expect(answerText({ major: { value: "other", label: "علم النفس" } }, "major")).toBe("علم النفس");
    expect(answerText(answers, "interest")).toBe("الأرقام والبيانات، التسويق والمحتوى");
    expect(answerText({ interest: ["unsure"] }, "interest")).toBe("لم أحدّد بعد");
    expect(answerText(answers, "priority")).toBe("أستكشف خياراتي");
    expect(educationAndMajorText(answers)).toBe("غير محدّد · تخصص آخر");
  });

  it("returns null for a question not answered yet", () => {
    for (const q of ["city", "education", "major", "experience", "interest", "priority"] as const) {
      expect(answerText({}, q), q).toBeNull();
    }
  });
});

describe("application note (7.4)", () => {
  it("writes the demo text at 90%", () => {
    expect(
      applicationNoteText({
        title: "محلل بيانات",
        company: "وادي الغيم للبيانات",
        match: 90,
        held: ["Excel", "SQL", "Power BI", "التواصل الفعّال"],
        missing: ["الإحصاء"],
      }),
    ).toBe(DEMO_NOTE);
  });

  it("drops the last sentence with nothing missing, and starts from scratch with nothing held", () => {
    expect(
      applicationNoteText({
        title: "محلل بيانات",
        company: "وادي الغيم للبيانات",
        match: 100,
        held: ["Excel", "SQL", "Power BI", "الإحصاء", "التواصل الفعّال"],
        missing: [],
      }),
    ).toBe(
      "أتقدّم لوظيفة محلل بيانات لدى وادي الغيم للبيانات. مطابقتي الحالية مع متطلبات الوظيفة 100%، وأبرز ما لديّ: Excel و SQL و Power BI.",
    );
    expect(
      applicationNoteText({
        title: "مصمّم منتجات رقمية",
        company: "دار الطاووس للمنتجات الرقمية",
        match: 0,
        held: [],
        missing: ["Figma", "تصميم الواجهات", "النماذج التفاعلية"],
      }),
    ).toBe(
      "أتقدّم لوظيفة مصمّم منتجات رقمية لدى دار الطاووس للمنتجات الرقمية. مطابقتي الحالية مع متطلبات الوظيفة 0%، وأبدأ الآن ببناء المهارات المطلوبة. وأعمل الآن على استكمال: Figma وتصميم الواجهات.",
    );
  });

  it("joins lists with «و» as the spec writes them", () => {
    expect(joinWithAnd([])).toBe("");
    expect(joinWithAnd(["Excel"])).toBe("Excel");
    expect(joinWithAnd(["Excel", "SQL", "Power BI"])).toBe("Excel و SQL و Power BI");
    expect(joinWithAnd(["الإحصاء", "التواصل الفعّال"])).toBe("الإحصاء والتواصل الفعّال");
  });
});

describe("other phrases", () => {
  it("prints the CV line of the apply sheet (3.8 field 6)", () => {
    expect(cvAttachmentLine(null)).toBe("لا توجد سيرة مرفقة");
    expect(cvAttachmentLine(SAMPLE_CV)).toBe("مرفقة: السيرة التجريبية");
    expect(cvAttachmentLine({ ...SAMPLE_CV, isSample: false, fileName: "khalid-cv.pdf" })).toBe("مرفقة: khalid-cv.pdf");
    expect(cvAttachmentLine({ ...SAMPLE_CV, isSample: false, fileName: null })).toBe("مرفقة: نص السيرة");
  });

  it("gives the XP toast reason, merging onboarding and target (3.15)", () => {
    expect(xpNewsReason(news(["onboarding_completed", "target_set"]))).toBe("التعارف واختيار الهدف");
    expect(xpNewsReason(news(["cv_analysed"]))).toBe("حلّلت سيرتك");
    expect(xpNewsReason(news(["course_completed"]))).toBe("أكملت دورة");
    expect(xpNewsReason(news(["job_applied"]))).toBe("تقديم مدروس");
    expect(xpNewsReason(news(["daily_reward"]))).toBe("مكافأة يومية");
    expect(xpNewsReason(news(["course_completed", "job_applied"]))).toBe("تقديم مدروس");
  });

  it("writes the XP history rows that need no course title (3.13)", () => {
    expect(xpHistoryText(xpEvent({ type: "onboarding_completed", ref: null }))).toBe("أكملت التعارف");
    expect(xpHistoryText(xpEvent({ type: "target_set", ref: null }))).toBe("اخترت هدفك");
    expect(xpHistoryText(xpEvent({ type: "cv_analysed", ref: null }))).toBe("حلّلت سيرتك");
    expect(xpHistoryText(xpEvent({ type: "job_applied", ref: "data-analyst-riyadh" }))).toBe("قدّمت على وظيفة محلل بيانات");
    expect(xpHistoryText(xpEvent({ type: "daily_reward", ref: "2026-11-18" }))).toBe("مكافأة يومية");
  });

  it("writes hours, the target toast, the applied chip and the company line", () => {
    expect(hoursText(10)).toBe("10 ساعات");
    expect(hoursText(12)).toBe("12 ساعة");
    expect(hoursText(2)).toBe("ساعتان");
    expect(targetChangedToast("bi-analyst-riyadh")).toBe("هدفك الآن: محلل ذكاء الأعمال");
    expect(appliedChip("review")).toBe("قدّمت · قيد المراجعة · محاكاة");
    expect(appliedChip("shortlisted")).toBe("قدّمت · مرشّح للمقابلة · محاكاة");
    expect(companyCityLine("data-analyst-riyadh")).toBe("وادي الغيم للبيانات · الرياض");
    expect(companyCityLine("junior-data-scientist-remote")).toBe("مختبر النجم الثامن · عن بُعد");
  });
});

// ─── phrases that call the engine ─────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!engineBuilt())("phrases with the engine (run once the engine is built)", () => {
  it("writes the next-step labels with the course's short title (2.8)", () => {
    expect(
      nextStepLabel({
        rule: 3,
        courseId: "c-powerbi-1",
        hours: 10,
        xp: 200,
        prep: false,
        prepares: null,
        matchNow: 70,
        matchAfter: 90,
      }),
    ).toBe("ابدأ دورة «أساسيات Power BI»");
    expect(nextStepLabel({ rule: 2, courseId: "c-statistics-2", ticked: 2, total: 5 })).toBe(
      "أكمل دورة «الإحصاء التطبيقي للمحللين»",
    );
  });

  it("writes the XP history row of a course (3.13)", () => {
    expect(xpHistoryText(xpEvent({ type: "course_completed", ref: "c-powerbi-1" }))).toBe("أكملت دورة أساسيات Power BI");
  });

  it("builds the 7.4 demo note from the facts after the Power BI course", () => {
    expect(applicationNote("data-analyst-riyadh", AFTER_POWER_BI)).toBe(DEMO_NOTE);
  });
});
