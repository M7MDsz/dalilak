// Owner: data. countNoun for every noun form listed in "How to read → Counted nouns" (1, 2 subject, 2 object, 3, 10, 11),
// the object case of 1, and the edges beyond the demo's numbers.
import { describe, expect, it } from "vitest";

import { countNoun, countNounBare, type CountedNoun } from "./plural";

/** [1 subject, 1 object, 2 subject, 2 object, 3, 10, 11] per noun. */
const TABLE: Readonly<Record<CountedNoun, readonly [string, string, string, string, string, string, string]>> = {
  skill: ["مهارة واحدة", "مهارة واحدة", "مهارتان", "مهارتين", "3 مهارات", "10 مهارات", "11 مهارة"],
  stage: ["مرحلة واحدة", "مرحلة واحدة", "مرحلتان", "مرحلتين", "3 مراحل", "10 مراحل", "11 مرحلة"],
  course: ["دورة واحدة", "دورة واحدة", "دورتان", "دورتين", "3 دورات", "10 دورات", "11 دورة"],
  hour: ["ساعة واحدة", "ساعة واحدة", "ساعتان", "ساعتين", "3 ساعات", "10 ساعات", "11 ساعة"],
  lesson: ["درس واحد", "درساً واحداً", "درسان", "درسين", "3 دروس", "10 دروس", "11 درساً"],
  job: ["وظيفة واحدة", "وظيفة واحدة", "وظيفتان", "وظيفتين", "3 وظائف", "10 وظائف", "11 وظيفة"],
  star: ["نجمة واحدة", "نجمة واحدة", "نجمتان", "نجمتين", "3 نجوم", "10 نجوم", "11 نجمة"],
  place: ["مركز واحد", "مركزاً واحداً", "مركزان", "مركزين", "3 مراكز", "10 مراكز", "11 مركزاً"],
  day: ["يوم واحد", "يوماً واحداً", "يومان", "يومين", "3 أيام", "10 أيام", "11 يوماً"],
  application: ["طلب واحد", "طلباً واحداً", "طلبان", "طلبين", "3 طلبات", "10 طلبات", "11 طلباً"],
  badge: ["شارة واحدة", "شارة واحدة", "شارتان", "شارتين", "3 شارات", "10 شارات", "11 شارة"],
  minute: ["دقيقة واحدة", "دقيقة واحدة", "دقيقتان", "دقيقتين", "3 دقائق", "10 دقائق", "11 دقيقة"],
};

describe("countNoun (How to read → Counted nouns)", () => {
  for (const [noun, [one, oneObject, two, twoObject, three, ten, eleven]] of Object.entries(TABLE)) {
    it(`counts ${noun}`, () => {
      const n = noun as CountedNoun;
      expect(countNoun(1, n)).toBe(one);
      expect(countNoun(1, n, "object")).toBe(oneObject);
      expect(countNoun(2, n)).toBe(two);
      expect(countNoun(2, n, "subject")).toBe(two);
      expect(countNoun(2, n, "object")).toBe(twoObject);
      expect(countNoun(3, n)).toBe(three);
      expect(countNoun(3, n, "object")).toBe(three);
      expect(countNoun(10, n)).toBe(ten);
      expect(countNoun(11, n)).toBe(eleven);
      expect(countNoun(11, n, "object")).toBe(eleven);
    });
  }

  it("writes the spec's examples", () => {
    expect(countNoun(2, "stage")).toBe("مرحلتان");
    expect(countNoun(2, "place", "object")).toBe("مركزين");
    expect(countNoun(2, "job", "object")).toBe("وظيفتين");
    expect(countNoun(2, "day", "object")).toBe("يومين");
    expect(countNoun(1, "place", "object")).toBe("مركزاً واحداً");
    expect(countNoun(8, "skill")).toBe("8 مهارات");
    expect(countNoun(8, "place")).toBe("8 مراكز");
    expect(countNoun(22, "hour")).toBe("22 ساعة");
    expect(countNoun(12, "hour")).toBe("12 ساعة");
    expect(countNoun(20, "job")).toBe("20 وظيفة");
    expect(countNoun(38, "skill")).toBe("38 مهارة");
    expect(countNoun(1, "day")).toBe("يوم واحد");
  });

  it("keeps Arabic right beyond the demo's numbers", () => {
    expect(countNoun(0, "skill")).toBe("0 مهارة");
    expect(countNoun(24, "place")).toBe("24 مركزاً");
    expect(countNoun(99, "day")).toBe("99 يوماً");
    expect(countNoun(100, "day")).toBe("100 يوم");
    expect(countNoun(102, "skill")).toBe("102 مهارة");
    expect(countNoun(103, "day")).toBe("103 أيام");
    expect(countNoun(111, "lesson")).toBe("111 درساً");
    expect(countNoun(1240, "hour")).toBe("1,240 ساعة");
  });
});

describe("countNounBare", () => {
  it("drops «واحد/ة» for one and otherwise counts like countNoun", () => {
    expect(countNounBare(1, "star")).toBe("نجمة");
    expect(countNounBare(1, "place", "object")).toBe("مركز");
    expect(countNounBare(2, "star", "object")).toBe("نجمتين");
    expect(countNounBare(3, "star")).toBe("3 نجوم");
  });
});
