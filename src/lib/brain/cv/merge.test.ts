// Owner: brain-cv. Spec 6.6: what a model's answer must pass before it counts (tested without a key).
import { describe, expect, it } from "vitest";

import { cleanCvLines } from "./clean";
import { analyseCvLocal } from "./local-analyser";
import { evidenceLineIndex, mergeModelSkills } from "./merge";

const CV = [
  "Sara Al-Harbi",
  "Summary",
  "I like turning messy numbers into weekly decisions.",
  "Work Experience",
  "- Interviewed twelve shoppers and turned their feedback into a new checkout flow.",
  "- Cleaned the weekly sales sheet in Excel.",
  "Skills",
  "Drawing clickable screens and testing them with friends.",
].join("\n");

const lines = cleanCvLines(CV);
const local = analyseCvLocal(CV).skills;

describe("mergeModelSkills (spec 6.6)", () => {
  it("keeps a known skill with real evidence, and sets its stars from the zone of its line, never from the model", () => {
    const { skills, added } = mergeModelSkills(local, lines, [
      { skill: "ux-research", evidence: "Interviewed twelve shoppers and turned their feedback into a new checkout flow." },
      { skill: "ui-design", evidence: "drawing clickable screens and testing them" },
    ]);
    expect(added).toBe(2);
    expect(skills).toEqual([
      { skill: "ux-research", stars: 1, evidence: "Interviewed twelve shoppers and turned their feedback into a new checkout flow.", line: 4 },
      { skill: "excel", stars: 2, evidence: "Cleaned the weekly sales sheet in Excel.", line: 5 },
      { skill: "ui-design", stars: 1, evidence: "Drawing clickable screens and testing them with friends.", line: 7 },
    ]);
    // ux-research has one star slot (applied zone → 2, lowered to 1); ui-design is in a listed zone → 1.
  });

  it("gives 2 stars to a model-only skill whose evidence is in an applied zone, up to the skill's maximum", () => {
    const { skills } = mergeModelSkills(local, lines, [{ skill: "content", evidence: "turned their feedback into a new checkout flow" }]);
    expect(skills.find((s) => s.skill === "content")).toEqual({
      skill: "content",
      stars: 2,
      evidence: "Interviewed twelve shoppers and turned their feedback into a new checkout flow.",
      line: 4,
    });
  });

  it("drops unknown ids, invented evidence, bare names, duplicates, and skills the local analyser already found", () => {
    const { skills, added } = mergeModelSkills(local, lines, [
      { skill: "cooking", evidence: "Cleaned the weekly sales sheet in Excel." },
      { skill: "ux-research", evidence: "Ran six usability tests with customers." },
      { skill: "figma", evidence: "Figma" },
      { skill: "excel", evidence: "Interviewed twelve shoppers and turned their feedback into a new checkout flow." },
      { skill: "ui-design", evidence: "Drawing clickable screens and testing them with friends." },
      { skill: "ui-design", evidence: "Interviewed twelve shoppers and turned their feedback into a new checkout flow." },
    ]);
    expect(added).toBe(1);
    expect(skills.map((s) => [s.skill, s.stars, s.line])).toEqual([
      ["excel", 2, 5],
      ["ui-design", 1, 7],
    ]);
    expect(skills.find((s) => s.skill === "excel")).toEqual(local.find((s) => s.skill === "excel"));
  });

  it("finds evidence by words, so punctuation, case and Arabic letter forms do not matter", () => {
    expect(evidenceLineIndex(lines, "CLEANED the weekly sales-sheet")).toBe(5);
    const arabic = cleanCvLines("الخبرات\nقابلت عشرين متسوقاً وحولت ملاحظاتهم إلى تصميم جديد.");
    expect(evidenceLineIndex(arabic, "قابلت عشرين متسوقا وحولت ملاحظاتهم")).toBe(1);
    expect(evidenceLineIndex(arabic, "قابلت عشرين")).toBe(-1); // too short to be a sentence
    // A quote of the raw text of a Chrome-printed PDF (Persian look-alike letters) still finds its cleaned line.
    const printed = cleanCvLines("الخبرات\nبناء لوحات معلومات تفاعلیة لمتابعة المبیعات.");
    expect(printed[1]?.text).toBe("بناء لوحات معلومات تفاعلية لمتابعة المبيعات.");
    expect(evidenceLineIndex(printed, "لوحات معلومات تفاعلیة لمتابعة المبیعات")).toBe(1);
  });
});
