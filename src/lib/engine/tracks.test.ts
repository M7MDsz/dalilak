// The specialisations of each field (owner, 21 Nov 2026: web → full stack / front end / back end, and the same for the
// other fields): every job lands in exactly one track of its own field, and the titles that say it land where they say.
import { describe, expect, it } from "vitest";

import { JOBS } from "@/lib/data";
import { JOB_FIELD_IDS } from "@/lib/ids";

import { jobsOfTrack, trackCatalogue, trackOf, tracksOf } from "./tracks";

describe("trackOf", () => {
  it("puts every job in a track of its own field", () => {
    for (const job of JOBS) {
      const track = trackOf(job);
      expect(track.field, job.id).toBe(job.field);
      expect(trackCatalogue(job.field).some((t) => t.id === track.id), job.id).toBe(true);
    }
  });

  it("reads the software titles as the owner's specialisations", () => {
    expect(trackOf("lucidya-frontend-engineer-dammam").id).toBe("software/front-end");
    expect(trackOf("salla-senior-backend-checkout-remote").id).toBe("software/back-end");
    expect(trackOf("moyasar-software-engineer-full-stack-riyadh").id).toBe("software/full-stack");
    expect(trackOf("almajed-mobile-developer-riyadh").id).toBe("software/mobile");
    expect(trackOf("gathern-quality-assurance-engineer-riyadh").id).toBe("software/qa");
    expect(trackOf("foodics-ai-engineer-riyadh").id).toBe("software/ai");
  });

  it("keeps the demo's job in data analysis", () => {
    expect(trackOf("data-analyst-riyadh").id).toBe("data/analysis");
    expect(trackOf("salla-senior-data-scientist-remote").id).toBe("data/science");
    expect(trackOf("arabicai-data-engineer-riyadh").id).toBe("data/engineering");
  });

  it("classifies most jobs (the general tracks hold the few no keyword fits)", () => {
    const general = JOBS.filter((job) => trackOf(job).general && trackCatalogue(job.field).length > 1);
    expect(general.length / JOBS.length).toBeLessThan(0.1);
  });
});

describe("tracksOf", () => {
  it("offers only tracks that have a job, each job in exactly one", () => {
    for (const field of JOB_FIELD_IDS) {
      const tracks = tracksOf(field);
      const jobs = tracks.flatMap((t) => jobsOfTrack(t.id));
      expect(jobs.length, field).toBe(JOBS.filter((j) => j.field === field).length);
      expect(new Set(jobs).size, field).toBe(jobs.length);
      for (const t of tracks) expect(jobsOfTrack(t.id).length, t.id).toBeGreaterThan(0);
    }
  });

  it("gives the six interest fields at least two specialisations", () => {
    for (const field of ["data", "software", "design", "marketing", "business", "hr"] as const) {
      expect(tracksOf(field).length, field).toBeGreaterThanOrEqual(2);
    }
  });
});
