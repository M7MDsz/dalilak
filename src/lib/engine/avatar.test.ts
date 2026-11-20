import { describe, expect, it } from "vitest";

import { defaultAvatar } from "./avatar";

describe("default avatar (spec 9.6)", () => {
  it("sums the code points of the cleaned name, mod 4, plus 1", () => {
    // 1582 + 1575 + 1604 + 1583 = 6344 → 0 → av-01
    expect(defaultAvatar("خالد")).toBe("av-01");
    // 1605 + 1581 + 1605 + 1583 = 6374 → 2 → av-03
    expect(defaultAvatar("محمد")).toBe("av-03");
    expect(defaultAvatar("  خالد ")).toBe("av-01");
  });

  it("is always one of the four neutral avatars", () => {
    for (const name of ["سارة", "ساره", "نورة", "Sara", "Ali", "عبد الله"]) {
      expect(["av-01", "av-02", "av-03", "av-04"]).toContain(defaultAvatar(name));
    }
  });
});
