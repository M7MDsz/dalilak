// Owner: map. The drawing's layout rules that QA found broken on 18 Nov: the lit station's card must sit clear of the
// goal's label on a short sheet (beside the docked advisor panel), and the trailhead sign has one corner that nothing of
// the trail reaches (or it is not drawn).
import { describe, expect, it } from "vitest";

import { canonicalStages } from "@/lib/engine";
import type { Roadmap, RoadmapStage, StageState } from "@/lib/types";

import { buildGeometry, minSheetHeight, type MapGeometry } from "./geometry";

const JOB = "data-analyst-riyadh";
/** The match at each station of the demo target after the sample CV (spec 3.4). */
const MATCH_AT = [10, 20, 30, 50, 60, 70, 90, 100];

function roadmapWith(states: readonly StageState[], gate: Roadmap["gate"] = "cleared"): Roadmap {
  const stages: RoadmapStage[] = canonicalStages(JOB).map((c, i) => ({
    ...c,
    n: i + 1,
    state: states[i] ?? "locked",
    xp: 200,
    doneBy: null,
    lock: null,
    gain: 10,
    matchAfter: MATCH_AT[i] ?? 100,
    matchAt: MATCH_AT[i] ?? 100,
  }));
  const done = stages.filter((s) => s.state === "done");
  const last = done[done.length - 1];
  return {
    jobId: JOB,
    match: last !== undefined ? last.matchAt : 0,
    complete: done.length === stages.length,
    gate,
    stages,
    currentN: stages.find((s) => s.state === "current")?.n ?? null,
    doneCount: done.length,
    total: stages.length,
    hoursLeft: 0,
    hoursTotal: 0,
    branches: [],
  };
}

const ONBOARDED = roadmapWith(["upcoming", "locked", "locked", "locked", "upcoming", "locked", "locked", "locked"], "current");
const CV_ANALYSED = roadmapWith(["done", "done", "done", "done", "done", "done", "current", "upcoming"]);
const MID_PATH = roadmapWith(["done", "done", "done", "done", "done", "done", "done", "current"]);

const lit = (g: MapGeometry) => g.stations.find((s) => s.look === "now");

describe("the lit station's card clears the label above it", () => {
  it("keeps the goal clear beside the docked panel (a short wide sheet)", () => {
    const g = buildGeometry(MID_PATH, { width: 740, height: 600 });
    const now = lit(g);
    expect(now).toBeDefined();
    expect((now?.y ?? 0) - g.summit.y).toBeGreaterThanOrEqual(84);
  });

  it("keeps the goal clear on the phone sheet", () => {
    const g = buildGeometry(MID_PATH, { width: 366, height: 560 });
    expect((lit(g)?.y ?? 0) - g.summit.y).toBeGreaterThanOrEqual(60);
  });

  it("keeps the next stage clear of the lit gate, also on the lowest sheet allowed", () => {
    const height = minSheetHeight(ONBOARDED, false);
    const g = buildGeometry(ONBOARDED, { width: 790, height });
    const gate = g.stations.findIndex((s) => s.kind === "gate");
    const next = g.stations[gate + 1];
    expect(next).toBeDefined();
    expect((g.stations[gate]?.y ?? 0) - (next?.y ?? 0)).toBeGreaterThanOrEqual(84 - 0.1);
  });
});

describe("the trailhead sign has one corner", () => {
  it("is drawn after a CV on a wide sheet, and nothing of the trail reaches it", () => {
    const g = buildGeometry(CV_ANALYSED, { width: 790, height: 780 });
    expect(g.sign).not.toBeNull();
    const left = g.width - 18 - (g.sign?.maxWidth ?? 0);
    const bandTop = g.height - 18 - 118;
    for (const s of g.stations) if (s.y + s.r >= bandTop) expect(s.x + s.r).toBeLessThan(left);
    expect(g.you.y + g.youH / 2).toBeLessThan(bandTop);
  });

  it("is not drawn while «أنت هنا» stands in its corner (before a CV), instead of moving to another corner", () => {
    expect(buildGeometry(ONBOARDED, { width: 790, height: 780 }).sign).toBeNull();
  });

  it("is never drawn on the phone sheet (the target header sits right above the map)", () => {
    expect(buildGeometry(CV_ANALYSED, { width: 366, height: 690 }).sign).toBeNull();
  });
});

describe("the summit and «أنت هنا» on a narrow phone sheet (21 Nov: the pennant sat on a branch title at 360-390 px)", () => {
  // the sheet is the phone's width less the page's 12 px gutters: 360, 390 and 430 px phones
  for (const width of [336, 366, 406]) {
    it(`keeps the branch titles off the flag and on the sheet at ${width} px`, () => {
      const g = buildGeometry(MID_PATH, { width, height: 600 });
      const a = g.peaks[0];
      const b = g.peaks[1];
      if (a === undefined || b === undefined || a.label === null || b.label === null) throw new Error("the phone sheet gives both branch titles a span");
      // the left title ends before the pennant's tip (flag.w - 6 px left of the pole); the right one starts after the pole
      const leftEnd = a.x - 26 + a.label.room;
      expect(leftEnd).toBeLessThanOrEqual(g.summit.x - g.flag.w + 6 - 4);
      expect(leftEnd - a.label.max).toBeGreaterThanOrEqual(6);
      const rightBegin = b.x + 26 - b.label.room;
      expect(rightBegin).toBeGreaterThanOrEqual(g.summit.x + 6);
      expect(rightBegin + b.label.max).toBeLessThanOrEqual(width - 6);
    });

    it(`keeps «أنت هنا» on the sheet at ${width} px`, () => {
      for (const roadmap of [CV_ANALYSED, MID_PATH]) {
        const g = buildGeometry(roadmap, { width, height: 600 });
        if (g.you.side > 0) expect(g.you.x + 14 + g.you.room).toBeLessThanOrEqual(width - 6);
        else expect(g.you.x - 14 - g.you.room).toBeGreaterThanOrEqual(6);
        // the tag with its full second line fits on the side it hangs (138 px in the game theme's wider type)
        expect(g.you.room).toBeGreaterThanOrEqual(138);
      }
    });
  }

  it("hangs «أنت هنا» left of the road only where the right side is short, never on a wide sheet", () => {
    expect(buildGeometry(CV_ANALYSED, { width: 336, height: 600 }).you.side).toBe(-1);
    expect(buildGeometry(CV_ANALYSED, { width: 406, height: 600 }).you.side).toBe(1);
    expect(buildGeometry(CV_ANALYSED, { width: 790, height: 780 }).you.side).toBe(1);
    expect(buildGeometry(CV_ANALYSED, { width: 790, height: 780 }).peaks.every((p) => p.label === null)).toBe(true);
  });
});

describe("labels keep their extras only where they fit", () => {
  it("is roomy on a desktop sheet and beside the docked panel at 1440, not at 1280 or on the phone", () => {
    expect(buildGeometry(CV_ANALYSED, { width: 790, height: 780 }).roomy).toBe(true);
    expect(buildGeometry(CV_ANALYSED, { width: 740, height: 620 }).roomy).toBe(true);
    expect(buildGeometry(CV_ANALYSED, { width: 588, height: 620 }).roomy).toBe(false);
    expect(buildGeometry(CV_ANALYSED, { width: 366, height: 690 }).roomy).toBe(false);
  });
});
