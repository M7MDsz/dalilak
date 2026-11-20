// Owner: advisor. The action receipts name a learning step by its skill (20 Nov 2026), never the internal course title.
import { describe, expect, it } from "vitest";

import { receiptOf, receiptText, withReceipt } from "./receipts";

describe("receipts", () => {
  it("records opening a guide, starting a step and opening «دليل التعلّم» in step words", () => {
    expect(receiptText({ k: "go", to: { screen: "course", courseId: "c-powerbi-1" } })).toBe("فتح «دليل Power BI»");
    expect(receiptText({ k: "start", c: "c-statistics-2" })).toBe("بدء خطوة الإحصاء");
    expect(receiptText({ k: "go", to: { screen: "learn" } })).toBe("فتح دليل التعلّم");
  });

  it("still round-trips through the message id", () => {
    const id = withReceipt("d-1-1", { k: "start", c: "c-powerbi-1" });
    expect(receiptOf(id)).toEqual({ k: "start", c: "c-powerbi-1" });
  });
});
