// Owner: data. Time copy of "How to read → Time": relativeTime boundaries, clock times, dates and history stamps.
// Dates are built with the local-time constructor, so the tests hold in any time zone.
import { describe, expect, it } from "vitest";

import { clockTime, dayMonth, historyStamp, relativeTime } from "./time";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const at = (month: number, day: number, hours: number, minutes: number) =>
  new Date(2026, month - 1, day, hours, minutes).getTime();

describe("relativeTime", () => {
  const now = at(11, 18, 21, 14);

  it("says «الآن» under a minute (and for a time a moved clock puts in the future)", () => {
    expect(relativeTime(now, now)).toBe("الآن");
    expect(relativeTime(now - 59 * SECOND - 999, now)).toBe("الآن");
    expect(relativeTime(now + 5 * MINUTE, now)).toBe("الآن");
  });

  it("counts minutes under an hour", () => {
    expect(relativeTime(now - MINUTE, now)).toBe("قبل دقيقة");
    expect(relativeTime(now - 2 * MINUTE, now)).toBe("قبل دقيقتين");
    expect(relativeTime(now - 5 * MINUTE, now)).toBe("قبل 5 دقائق");
    expect(relativeTime(now - 10 * MINUTE, now)).toBe("قبل 10 دقائق");
    expect(relativeTime(now - 11 * MINUTE, now)).toBe("قبل 11 دقيقة");
    expect(relativeTime(now - HOUR + SECOND, now)).toBe("قبل 59 دقيقة");
  });

  it("counts hours earlier today", () => {
    expect(relativeTime(now - HOUR, now)).toBe("قبل ساعة");
    expect(relativeTime(now - 2 * HOUR, now)).toBe("قبل ساعتين");
    expect(relativeTime(now - 3 * HOUR, now)).toBe("قبل 3 ساعات");
    expect(relativeTime(at(11, 18, 0, 0), now)).toBe("قبل 21 ساعة");
  });

  it("says «أمس» for yesterday and gives the date before that", () => {
    expect(relativeTime(at(11, 17, 23, 59), now)).toBe("أمس");
    expect(relativeTime(at(11, 17, 0, 0), now)).toBe("أمس");
    expect(relativeTime(at(11, 16, 23, 59), now)).toBe("16 نوفمبر");
    expect(relativeTime(at(1, 3, 9, 0), now)).toBe("3 يناير");
  });

  it("keeps minutes across midnight, then «أمس»", () => {
    const justAfterMidnight = at(11, 19, 0, 30);
    expect(relativeTime(at(11, 18, 23, 50), justAfterMidnight)).toBe("قبل 40 دقيقة");
    expect(relativeTime(at(11, 18, 22, 0), justAfterMidnight)).toBe("أمس");
  });
});

describe("clockTime and dayMonth", () => {
  it("writes «21:14» and «09:05»", () => {
    expect(clockTime(at(11, 18, 21, 14))).toBe("21:14");
    expect(clockTime(at(11, 18, 9, 5))).toBe("09:05");
    expect(clockTime(at(11, 18, 0, 0))).toBe("00:00");
  });

  it("writes «18 نوفمبر» with the Gregorian month", () => {
    expect(dayMonth(at(11, 18, 21, 14))).toBe("18 نوفمبر");
    expect(dayMonth(at(1, 1, 12, 0))).toBe("1 يناير");
    expect(dayMonth(at(12, 31, 12, 0))).toBe("31 ديسمبر");
  });
});

describe("historyStamp", () => {
  const now = at(11, 18, 22, 0);

  it("writes «اليوم 21:14», «أمس 21:14», then «16 نوفمبر»", () => {
    expect(historyStamp(at(11, 18, 21, 14), now)).toBe("اليوم 21:14");
    expect(historyStamp(at(11, 17, 21, 14), now)).toBe("أمس 21:14");
    expect(historyStamp(at(11, 16, 21, 14), now)).toBe("16 نوفمبر");
  });
});
