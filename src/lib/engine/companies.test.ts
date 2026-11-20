// Owner: engine (20 Nov 2026, owner's part 2). The companies «دليلك» knows: typed names in their common spellings, the
// everyday words that must NOT read as a company, a job's company read from its names (never its id), the tiles per
// field, and the path aimed at the company's job (with a stubbed job lookup, so it holds whatever the job data is).
import { describe, expect, it } from "vitest";

import { COMPANIES, COMPANY_TILES, getJob } from "@/lib/data";
import { COMPANY_IDS, JOB_FIELD_IDS, JOB_IDS } from "@/lib/ids";
import { normalizeText } from "@/lib/text/normalize";
import type { CompanyId, Job, JobId, OnboardingAnswers } from "@/lib/types";

import { companyField, companyOfJob, jobsAtCompany, matchCompany } from "./companies";
import { companyJob, dreamCompany, recommend } from "./onboarding-fit";

const DEMO: OnboardingAnswers = {
  city: { value: "riyadh", label: "الرياض" },
  education: "bachelor",
  major: { value: "mis", label: "نظم معلومات إدارية" },
  experience: "none",
  interest: ["data"],
  priority: "first-job",
};

describe("typed company names (Arabic, English, common spellings)", () => {
  it.each([
    ["أرامكو", "aramco"],
    ["ارامكو", "aramco"],
    ["ارمكو", "aramco"],
    ["Aramco", "aramco"],
    ["ARAMCO", "aramco"],
    ["أرامكو السعودية", "aramco"],
    ["أبي أشتغل بأرامكو", "aramco"],
    ["اس تي سي", "stc"],
    ["إس تي سي", "stc"],
    ["STC", "stc"],
    ["stc", "stc"],
    ["الاتصالات السعودية", "stc"],
    ["سابك", "sabic"],
    ["SABIC", "sabic"],
    ["هنقرستيشن", "hungerstation"],
    ["هنقر ستيشن", "hungerstation"],
    ["HungerStation", "hungerstation"],
    ["القدية", "qiddiya"],
    ["قدية", "qiddiya"],
    ["Qiddiya", "qiddiya"],
    ["نيوم", "neom"],
    ["NEOM", "neom"],
    ["زين السعودية", "zain"],
    ["Zain", "zain"],
    ["سدايا", "sdaia"],
    ["SDAIA", "sdaia"],
    ["مصرف الراجحي", "alrajhi"],
    ["الراجحي", "alrajhi"],
    ["Al Rajhi", "alrajhi"],
    ["البنك الأهلي", "snb"],
    ["صندوق الاستثمارات العامة", "pif"],
    ["PIF", "pif"],
    ["هيئة الزكاة", "zatca"],
    ["المراعي", "almarai"],
    ["سلة", "salla"],
    ["Salla", "salla"],
    ["مهارة", "maharah"],
    ["مهارة للموارد البشرية", "maharah"],
    ["Maharah", "maharah"],
    ["شركة سيارة", "syarah"],
    ["سيارة", "syarah"],
  ] as const)("«%s» → %s", (text, id) => {
    expect(matchCompany(text)).toBe(id);
  });

  it.each(["زين", "زين، لا", "علم البيانات", "أنا جاهز", "أكيد", "سيارة جديدة", "مهارة التواصل", "الرياض", "لا، مو الحين", "مدري", ""])(
    "«%s» is not a company (everyday words, places, a no)",
    (text) => {
      expect(matchCompany(text)).toBeNull();
    },
  );

  it("no spelling belongs to two companies", () => {
    const seen = new Map<string, CompanyId>();
    for (const c of COMPANIES) {
      for (const alias of c.aliases) {
        const key = normalizeText(alias);
        expect(seen.get(key) ?? c.id, `${alias} (${c.id})`).toBe(c.id);
        seen.set(key, c.id);
      }
    }
  });
});

describe("the catalogue and the tiles (research/jobs/jobs-snapshot.json, 20 Nov 2026)", () => {
  it("has every company id once, with its link where the careers page opened", () => {
    expect(COMPANIES.map((c) => c.id).sort()).toEqual([...COMPANY_IDS].sort());
    for (const c of COMPANIES) {
      expect(c.checkedAt, c.id).toBe("2026-11-20");
      expect(c.aliases.length, c.id).toBeGreaterThan(0);
      if (c.source === "careers-page") expect(c.careersUrl, c.id).toMatch(/^https:\/\//);
      else expect(c.careersUrl, c.id).toBeNull();
    }
  });

  it("offers «مهارة» first, then real employers with an opened careers page, six per field; «لم أحدّد بعد» gets the big names", () => {
    for (const field of [...JOB_FIELD_IDS, "general"] as const) {
      const tiles = COMPANY_TILES[field];
      expect(tiles.length, field).toBeGreaterThanOrEqual(4);
      expect(tiles.length, field).toBeLessThanOrEqual(6);
      expect(new Set(tiles).size, field).toBe(tiles.length);
      expect(tiles[0], field).toBe("maharah");
      for (const id of tiles.slice(1)) expect(COMPANIES.find((c) => c.id === id)?.source, `${field}/${id}`).toBe("careers-page");
    }
    expect(companyField({ interest: ["unsure"] })).toBeNull();
    expect(companyField({ interest: ["design", "data"] })).toBe("design");
    expect(companyField({})).toBeNull();
  });
});

describe("a job's company, read from its names (never its id)", () => {
  const practice = getJob("data-analyst-riyadh");
  const as = (company: string, companyEn?: string): Job => ({ ...practice, company, companyEn, real: true });

  it("finds the company of a posting by its Arabic or English name", () => {
    expect(companyOfJob(as("سلة (محلي)", "Salla (Mahally)"))).toBe("salla");
    expect(companyOfJob(as("شركة القدية للاستثمار", "Qiddiya Investment Company"))).toBe("qiddiya");
    expect(companyOfJob(as("سيارة", "Syarah"))).toBe("syarah");
    expect(companyOfJob(as("ماستر ووركس (نابه)", "Master-Works (Nabeh)"))).toBe("master-works");
    expect(companyOfJob(as("شركة غير معروفة", "HungerStation (Delivery Hero)"))).toBe("hungerstation");
  });

  it("gives the practice job and an unknown company none, and lists each company's jobs consistently", () => {
    expect(companyOfJob(practice)).toBeNull();
    expect(companyOfJob(as("وادي الغيم للبيانات"))).toBeNull();
    for (const id of COMPANY_IDS) for (const jobId of jobsAtCompany(id)) expect(companyOfJob(getJob(jobId)), jobId).toBe(id);
  });
});

describe("the path aims at the company's job (owner's part 2)", () => {
  const other = JOB_IDS.find((id) => id !== "data-analyst-riyadh") as JobId;
  const stub = (jobs: readonly JobId[]) => (id: CompanyId) => (id === "qiddiya" ? jobs : []);

  it("recommends the company's job when it has one, the ranking's best two as the alternatives", () => {
    const plain = recommend(DEMO);
    expect(plain.recommended).toBe("data-analyst-riyadh");
    const aimed = recommend({ ...DEMO, company: "qiddiya" }, stub([other]));
    expect(aimed.recommended).toBe(other);
    expect(aimed.alternatives).not.toContain(other);
    expect(aimed.alternatives[0]).toBe("data-analyst-riyadh");
  });

  it("keeps the ranking's choice for «لا، مو الحين», no answer, or a company with no job in the data", () => {
    const plain = recommend(DEMO);
    expect(recommend({ ...DEMO, company: "none" }, stub([other]))).toEqual(plain);
    expect(recommend({ ...DEMO, company: "qiddiya" }, stub([]))).toEqual(plain);
    expect(recommend({ ...DEMO, company: "aramco" }, stub([other]))).toEqual(plain);
    expect(companyJob({ ...DEMO, company: "none" }, stub([other]))).toBeNull();
  });

  it("picks the same job of the company whatever the priority (it is named before «الأولوية» is asked)", () => {
    const two = stub(JOB_IDS.filter((id) => id !== "data-analyst-riyadh").slice(0, 6));
    const answers = (priority: OnboardingAnswers["priority"]): OnboardingAnswers => ({ ...DEMO, company: "qiddiya", priority });
    const first = companyJob(answers("first-job"), two);
    expect(first).not.toBeNull();
    for (const p of ["switch", "grow", "explore", undefined] as const) expect(companyJob(answers(p), two)).toBe(first);
  });

  it("dreamCompany: the company, its jobs and the aimed one; null for none, a missing answer or an unknown value", () => {
    expect(dreamCompany({ answers: DEMO })).toBeNull();
    expect(dreamCompany({ answers: { ...DEMO, company: "none" } })).toBeNull();
    expect(dreamCompany({ answers: { ...DEMO, company: "xyz" as CompanyId } })).toBeNull();
    const dream = dreamCompany({ answers: { ...DEMO, company: "qiddiya" } }, stub([other]));
    expect(dream).toMatchObject({ id: "qiddiya", jobs: [other], job: other });
    expect(dream?.company.short).toBe("القدية");
    expect(dreamCompany({ answers: { ...DEMO, company: "aramco" } }, stub([other]))).toMatchObject({ id: "aramco", jobs: [], job: null });
  });
});
