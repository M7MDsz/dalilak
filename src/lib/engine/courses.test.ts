import { describe, expect, it } from "vitest";

import { COURSE_IDS } from "@/lib/ids";
import { COURSES, getCourse } from "@/lib/data";

import { courseOnPath, courseState, courseXp, learnList, shortTitle, unlockerCourse } from "./courses";
import { MINUTE, T0, completed, courseDoneFacts, cvAnalysedFacts, newFacts, onboarded, quiet, started, targeted, withCv } from "./test-fixtures";

const t = T0.getTime();

describe("course XP and titles (spec 8.2, «Course titles»)", () => {
  it("pays 20 XP per hour; 80 courses (59 + the expansion's 21) are 784 hours and 15,680 XP", () => {
    expect(courseXp(getCourse("c-powerbi-1"))).toBe(200);
    expect(courseXp(getCourse("c-statistics-2"))).toBe(240);
    expect(COURSES.reduce((sum, c) => sum + c.hours, 0)).toBe(784);
    expect(COURSES.reduce((sum, c) => sum + courseXp(c), 0)).toBe(15_680);
  });

  it("short title = the part before the colon, trimmed; the whole title without one", () => {
    expect(shortTitle(getCourse("c-powerbi-1"))).toBe("أساسيات Power BI");
    expect(shortTitle(getCourse("c-statistics-2"))).toBe("الإحصاء التطبيقي للمحللين");
    expect(shortTitle({ ...getCourse("c-excel-1"), title: "عنوان بلا نقطتين" })).toBe("عنوان بلا نقطتين");
  });
});

describe("course states (spec 3.10, 8.5)", () => {
  it("before any star: first stars without prerequisites are available, the rest locked with the reason", () => {
    const f = newFacts();
    expect(courseState("c-excel-1", f)).toEqual({ state: "available" });
    expect(courseState("c-communication-1", f)).toEqual({ state: "available" });
    expect(courseState("c-sql-1", f)).toEqual({ state: "locked", lock: { kind: "prereq", skill: "excel" } });
    expect(courseState("c-excel-2", f)).toEqual({ state: "locked", lock: { kind: "previous-star", skill: "excel", star: 1 } });
    expect(courseState("c-excel-3", f)).toEqual({ state: "locked", lock: { kind: "previous-star", skill: "excel", star: 2 } });
    // python-data needs sql AND statistics: the first one without a star is named
    expect(courseState("c-python-data-1", f)).toEqual({ state: "locked", lock: { kind: "prereq", skill: "sql" } });
  });

  it("a course whose star the CV already proved is credited, with the CV sentence; it cannot be taken", () => {
    const f = cvAnalysedFacts();
    expect(courseState("c-excel-1", f)).toEqual({
      state: "credited",
      by: { kind: "cv", evidence: "تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية." },
    });
    expect(courseState("c-excel-2", f).state).toBe("credited");
    expect(courseState("c-excel-3", f)).toEqual({ state: "available" });
    expect(courseState("c-statistics-1", f).state).toBe("credited");
    expect(courseState("c-statistics-2", f)).toEqual({ state: "available" });
    expect(courseState("c-powerbi-1", f)).toEqual({ state: "available" });
    expect(courseState("c-dataviz-1", f)).toEqual({ state: "locked", lock: { kind: "prereq", skill: "powerbi" } });
  });

  it("started shows the ticked lessons out of the lesson count; completed wins over everything", () => {
    const s = started(cvAnalysedFacts(), "c-powerbi-1", t + 10 * MINUTE, [1, 2]);
    expect(courseState("c-powerbi-1", s)).toEqual({ state: "started", ticked: [1, 2], total: 5 });
    const c = courseDoneFacts();
    expect(courseState("c-powerbi-1", c)).toEqual({ state: "completed", at: t + 5 * MINUTE });
    expect(courseState("c-dataviz-1", c)).toEqual({ state: "available" });
  });

  it("a higher course credits the lower star when no CV proves it", () => {
    let f = quiet(targeted(onboarded(newFacts(), t), "data-analyst-riyadh", t));
    f = completed(f, "c-excel-1", t + MINUTE, 160);
    f = completed(f, "c-excel-2", t + 2 * MINUTE, 200);
    // a new CV that does not mention Excel: star 1 is still completed by its own course
    expect(courseState("c-excel-1", f).state).toBe("completed");
    const onlyHigher = { ...f, courses: { "c-excel-2": f.courses["c-excel-2"] } };
    expect(courseState("c-excel-1", onlyHigher)).toEqual({ state: "credited", by: { kind: "course", courseId: "c-excel-2" } });
  });

  it("a started course whose star a later CV proves becomes credited (first match wins)", () => {
    const s = started(cvAnalysedFacts(), "c-powerbi-1", t + 10 * MINUTE, [1]);
    const reCv = withCv(s, t + 20 * MINUTE, [{ skill: "powerbi", stars: 1, evidence: "Power BI", line: 0 }], false);
    expect(courseState("c-powerbi-1", reCv).state).toBe("credited");
  });
});

describe("courseOnPath and unlockerCourse (spec 3.10, 3.11)", () => {
  it("places the demo courses on the path", () => {
    expect(courseOnPath("c-powerbi-1", cvAnalysedFacts())).toEqual({
      jobId: "data-analyst-riyadh",
      stageN: 7,
      prep: false,
      prepares: null,
      gain: 20,
      matchNow: 70,
      matchAfter: 90,
    });
    expect(courseOnPath("c-statistics-2", courseDoneFacts())).toMatchObject({ stageN: 8, gain: 10, matchNow: 90, matchAfter: 100 });
    expect(courseOnPath("c-dataviz-1", cvAnalysedFacts())).toBeNull();
    expect(courseOnPath("c-powerbi-1", newFacts())).toBeNull();
  });

  it("names the course that removes a lock", () => {
    const f = cvAnalysedFacts();
    expect(unlockerCourse("c-dataviz-1", f)).toBe("c-powerbi-1");
    expect(unlockerCourse("c-powerbi-2", f)).toBe("c-powerbi-1");
    expect(unlockerCourse("c-ml-1", f)).toBe("c-python-data-1");
    expect(unlockerCourse("c-powerbi-1", f)).toBeNull();
  });
});

describe("learnList (spec 3.10)", () => {
  it("«في مساري»: unfinished stages, current first, and the done group", () => {
    expect(learnList(cvAnalysedFacts(), "path", null)).toEqual({
      items: ["c-powerbi-1", "c-statistics-2"],
      doneGroup: ["c-excel-1", "c-sql-1", "c-statistics-1", "c-communication-1", "c-excel-2", "c-sql-2"],
    });
    const after = learnList(courseDoneFacts(), "path", null);
    expect(after.items).toEqual(["c-statistics-2"]);
    expect(after.doneGroup).toHaveLength(7);
    expect(learnList(cvAnalysedFacts(), "path", "professional")).toEqual({ items: [], doneGroup: ["c-communication-1"] });
  });

  it("«وسّع آفاقك»: every course not on the path and not completed, available → started → credited → locked", () => {
    const f = started(cvAnalysedFacts(), "c-excel-3", t, []);
    const items = learnList(f, "explore", null).items;
    const onPath = ["c-excel-1", "c-sql-1", "c-statistics-1", "c-communication-1", "c-excel-2", "c-sql-2", "c-powerbi-1", "c-statistics-2"];
    expect(items.some((id) => onPath.includes(id))).toBe(false);
    expect(items).toHaveLength(COURSE_IDS.length - onPath.length);
    const rank = { available: 0, started: 1, credited: 2, locked: 3, completed: 4 } as const;
    const ranks = items.map((id) => rank[courseState(id, f).state]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(items.map((id) => courseState(id, f).state))).toEqual(new Set(["available", "started", "credited", "locked"]));
    // the data field by hand: available sql-3, python-data-1 · started excel-3 · locked powerbi-2, powerbi-3, dataviz-1, ml-1, deep-learning-1
    expect(learnList(f, "explore", "data").items).toEqual([
      "c-sql-3",
      "c-python-data-1",
      "c-excel-3",
      "c-powerbi-2",
      "c-powerbi-3",
      "c-dataviz-1",
      "c-ml-1",
      "c-deep-learning-1",
    ]);
  });

  it("«مكتملة»: completed, newest first", () => {
    let f = courseDoneFacts();
    f = completed(f, "c-statistics-2", t + 30 * MINUTE, 240);
    expect(learnList(f, "done", null).items).toEqual(["c-statistics-2", "c-powerbi-1"]);
    expect(learnList(cvAnalysedFacts(), "done", null).items).toEqual([]);
  });
});
