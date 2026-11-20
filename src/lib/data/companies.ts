// Owner: data (20 Nov 2026, owner's part 2: the onboarding question «فيه شركة أو وظيفة معيّنة في بالك؟»). The real employers
// in Saudi Arabia «دليلك» knows by name, and the tiles of that question per field. Pure module.
// Source: research/jobs/jobs-snapshot.json, collected on 20 Nov 2026:
//   - `companiesByField`: big employers whose careers page opened that day (the tiles, 4-6 per field);
//   - `jobs`: the companies of the real postings (known by name, so a typed «سيارة» or «Jeeny» is understood);
//   - `companiesNotOpened`: big names whose careers page did not open (known by name only, no link).
// And «مهارة» (Maharah Human Resources), the organiser of the hackathon, added at the owner's request (20 Nov 2026): the
// first tile of every field.
// Nothing here is a number about a company: no size, salary or rating. Matching a typed name and finding a company's jobs
// in the app's job data are the engine's (src/lib/engine/companies.ts).
import type { CompanyId, JobFieldId } from "@/lib/types";

export interface Company {
  readonly id: CompanyId;
  /** The Arabic name as the company writes it: «أرامكو السعودية». */
  readonly name: string;
  /** The everyday name: on a tile, in «دليلك»'s replies, on «ملفي»: «أرامكو». */
  readonly short: string;
  readonly en: string;
  /**
   * What people type (Arabic and English). The normaliser already folds أ/إ/آ → ا, ة → ه, ى → ي, «ال» and one prefix letter
   * (و ف ب ل ك). A name that is also an everyday word («زين» = good, «علم», «جاهز» = ready, «أكيد», «سيارة») is only here
   * inside a longer phrase («شركة زين», «زين السعودية»), so «زين، لا» never reads as the company.
   */
  readonly aliases: readonly string[];
  /**
   * Spellings that are also an everyday word and count only when they are the whole answer («مهارة» = skill, «سيارة» =
   * car, «علم»): typed alone at the company question they are the company; inside a sentence they are not.
   */
  readonly aliasesAlone?: readonly string[];
  /** The careers page that opened on 20 Nov 2026; null when the company is known by name only. */
  readonly careersUrl: string | null;
  /**
   * careers-page: from `companiesByField` · posting: a company of the snapshot's postings · not-opened: name only ·
   * owner: added at the owner's request (the hackathon's organiser).
   */
  readonly source: "careers-page" | "posting" | "not-opened" | "owner";
  readonly checkedAt: "2026-11-20";
  readonly note?: string;
}

const CHECKED = "2026-11-20" as const;

export const COMPANIES: readonly Company[] = [
  // ── the hackathon's organiser, at the owner's request (20 Nov 2026) ───────────────────────────────────────────────
  { id: "maharah", name: "مهارة للموارد البشرية", short: "مهارة", en: "Maharah Human Resources", aliases: ["مهارة للموارد البشرية", "شركة مهارة", "مهارة للموارد", "maharah"], aliasesAlone: ["مهارة"], careersUrl: "https://apply.workable.com/maharahjobs/", source: "careers-page", checkedAt: CHECKED, note: "the organiser of the hackathon (added at the owner's request); the careers board linked from maharah.com, opened 20 Nov 2026 (research/jobs/maharah.json); two of its postings are in jobs.ts" },

  // ── careers page opened on 20 Nov 2026 (companiesByField) ─────────────────────────────────────────────────────────
  { id: "aramco", name: "أرامكو السعودية", short: "أرامكو", en: "Saudi Aramco", aliases: ["أرامكو", "أرامكو السعودية", "ارمكو", "aramco", "saudi aramco"], careersUrl: "https://www.aramco.jobs/", source: "careers-page", checkedAt: CHECKED, note: "aramco.com/careers timed out; aramco.jobs opened" },
  { id: "stc", name: "stc", short: "stc", en: "stc", aliases: ["stc", "اس تي سي", "إس تي سي", "الاتصالات السعودية", "شركة الاتصالات", "saudi telecom"], careersUrl: "https://careers.stc.com.sa/", source: "careers-page", checkedAt: CHECKED },
  { id: "sabic", name: "سابك", short: "سابك", en: "SABIC", aliases: ["سابك", "sabic"], careersUrl: "https://jobs.sabic.com/", source: "careers-page", checkedAt: CHECKED },
  { id: "zatca", name: "هيئة الزكاة والضريبة والجمارك", short: "هيئة الزكاة والضريبة والجمارك", en: "Zakat, Tax and Customs Authority (ZATCA)", aliases: ["هيئة الزكاة والضريبة والجمارك", "هيئة الزكاة", "الزكاة والضريبة", "زاتكا", "zatca"], careersUrl: "https://careers.zatca.gov.sa/", source: "careers-page", checkedAt: CHECKED },
  { id: "qiddiya", name: "شركة القدية للاستثمار", short: "القدية", en: "Qiddiya Investment Company", aliases: ["القدية", "شركة القدية", "qiddiya"], careersUrl: "https://jobs.workable.com/search?query=qiddiya", source: "careers-page", checkedAt: CHECKED, note: "qiddiya.com/careers returned 403; its postings open on Workable" },
  { id: "salla", name: "سلة", short: "سلة", en: "Salla", aliases: ["سلة", "منصة سلة", "salla"], careersUrl: "https://apply.workable.com/salla/", source: "careers-page", checkedAt: CHECKED },
  { id: "mobily", name: "موبايلي", short: "موبايلي", en: "Mobily", aliases: ["موبايلي", "mobily"], careersUrl: "https://careers.mobily.com.sa/en/sites/opportunities", source: "careers-page", checkedAt: CHECKED },
  { id: "zain", name: "زين السعودية", short: "زين", en: "Zain KSA", aliases: ["زين السعودية", "شركة زين", "اتصالات زين", "zain", "zain ksa"], careersUrl: "https://sa.zain.com/en/careers", source: "careers-page", checkedAt: CHECKED },
  { id: "ejada", name: "إجادة للأنظمة", short: "إجادة", en: "Ejada Systems", aliases: ["إجادة", "إجادة للأنظمة", "ejada"], careersUrl: "https://Careers.ejada.com/", source: "careers-page", checkedAt: CHECKED },
  { id: "foodics", name: "فودكس", short: "فودكس", en: "Foodics", aliases: ["فودكس", "فوودكس", "foodics"], careersUrl: "https://apply.workable.com/foodics/", source: "careers-page", checkedAt: CHECKED },
  { id: "lucidya", name: "لوسيديا", short: "لوسيديا", en: "Lucidya", aliases: ["لوسيديا", "lucidya"], careersUrl: "https://apply.workable.com/lucidya/", source: "careers-page", checkedAt: CHECKED },
  { id: "neom", name: "نيوم", short: "نيوم", en: "NEOM", aliases: ["نيوم", "neom"], careersUrl: "https://www.neom.com/en-us/be-part-of-neom/work-at-neom", source: "careers-page", checkedAt: CHECKED },
  { id: "roshn", name: "روشن", short: "روشن", en: "ROSHN", aliases: ["روشن", "roshn"], careersUrl: "https://www.roshn.sa/careers", source: "careers-page", checkedAt: CHECKED },
  { id: "hungerstation", name: "هنقرستيشن", short: "هنقرستيشن", en: "HungerStation (Delivery Hero)", aliases: ["هنقرستيشن", "هنقر ستيشن", "هنجرستيشن", "هنقر", "hungerstation", "hunger station"], careersUrl: "https://careers.deliveryhero.com/", source: "careers-page", checkedAt: CHECKED },
  { id: "tabby", name: "تابي", short: "تابي", en: "Tabby", aliases: ["تابي", "tabby"], careersUrl: "https://tabby.ai/en-SA/careers", source: "careers-page", checkedAt: CHECKED, note: "redirects to the en-AE careers page" },
  { id: "almarai", name: "المراعي", short: "المراعي", en: "Almarai", aliases: ["المراعي", "almarai"], careersUrl: "https://www.almarai.com/en/careers", source: "careers-page", checkedAt: CHECKED },
  { id: "tamara", name: "تمارا", short: "تمارا", en: "Tamara", aliases: ["تمارا", "tamara"], careersUrl: "https://tamara.co/en-SA/careers", source: "careers-page", checkedAt: CHECKED },
  { id: "pif", name: "صندوق الاستثمارات العامة", short: "صندوق الاستثمارات العامة", en: "Public Investment Fund (PIF)", aliases: ["صندوق الاستثمارات العامة", "صندوق الاستثمارات", "الصندوق السيادي", "pif", "public investment fund"], careersUrl: "https://www.pif.gov.sa/en/careers/", source: "careers-page", checkedAt: CHECKED },
  { id: "misk", name: "مؤسسة مسك", short: "مسك", en: "Misk Foundation", aliases: ["مسك", "مؤسسة مسك", "misk"], careersUrl: "https://misk.org.sa/careers/", source: "careers-page", checkedAt: CHECKED },

  // ── companies of the snapshot's real postings (no careers link of their own here; each posting has its link) ──────
  { id: "jeeny", name: "جيني", short: "جيني", en: "Jeeny", aliases: ["جيني", "jeeny"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "ninja", name: "نينجا", short: "نينجا", en: "Ninja", aliases: ["نينجا", "ninja"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "master-works", name: "ماستر ووركس", short: "ماستر ووركس", en: "Master-Works", aliases: ["ماستر ووركس", "ماسترووركس", "master works", "masterworks"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "almajed-oud", name: "الماجد للعود", short: "الماجد للعود", en: "Almajed 4 Oud", aliases: ["الماجد للعود", "الماجد", "almajed", "al majed"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "horizontal-digital", name: "هورايزنتال ديجيتال", short: "هورايزنتال ديجيتال", en: "Horizontal Digital", aliases: ["هورايزنتال", "هوريزنتال", "horizontal digital"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "flyakeed", name: "فلاي أكيد", short: "فلاي أكيد", en: "FlyAkeed", aliases: ["فلاي أكيد", "flyakeed", "fly akeed"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "platinumlist", name: "بلاتينوم ليست", short: "بلاتينوم ليست", en: "Platinumlist", aliases: ["بلاتينوم ليست", "بلاتينوم", "platinumlist", "platinum list"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "syarah", name: "سيارة", short: "سيارة", en: "Syarah", aliases: ["شركة سيارة", "موقع سيارة", "syarah"], aliasesAlone: ["سيارة"], careersUrl: null, source: "posting", checkedAt: CHECKED },
  { id: "atheer", name: "أثير", short: "أثير", en: "Atheer ACT", aliases: ["أثير", "atheer"], careersUrl: null, source: "posting", checkedAt: CHECKED },

  // ── big names whose careers page did not open on 20 Nov 2026 (known by name only) ───────────────────────────────────
  { id: "sdaia", name: "الهيئة السعودية للبيانات والذكاء الاصطناعي", short: "سدايا", en: "SDAIA", aliases: ["سدايا", "هيئة البيانات", "الهيئة السعودية للبيانات والذكاء الاصطناعي", "sdaia"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 404" },
  { id: "alrajhi", name: "مصرف الراجحي", short: "مصرف الراجحي", en: "Al Rajhi Bank", aliases: ["الراجحي", "مصرف الراجحي", "بنك الراجحي", "al rajhi", "alrajhi", "rajhi"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "redirect to not-found" },
  { id: "snb", name: "البنك الأهلي السعودي", short: "البنك الأهلي", en: "Saudi National Bank (SNB)", aliases: ["البنك الأهلي", "الأهلي السعودي", "الأهلي", "snb", "saudi national bank", "alahli"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 404" },
  { id: "riyad-bank", name: "بنك الرياض", short: "بنك الرياض", en: "Riyad Bank", aliases: ["بنك الرياض", "riyad bank"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 404" },
  { id: "sab", name: "البنك السعودي الأول", short: "ساب", en: "SAB", aliases: ["ساب", "البنك السعودي الأول", "البنك السعودي البريطاني", "sab"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 404" },
  { id: "elm", name: "شركة علم", short: "شركة علم", en: "Elm", aliases: ["شركة علم", "elm"], aliasesAlone: ["علم"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers link redirects to its home page" },
  { id: "red-sea-global", name: "البحر الأحمر الدولية", short: "البحر الأحمر الدولية", en: "Red Sea Global", aliases: ["البحر الأحمر الدولية", "red sea global"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 403" },
  { id: "maaden", name: "معادن", short: "معادن", en: "Ma'aden", aliases: ["معادن", "شركة معادن", "maaden", "ma'aden"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 404" },
  { id: "jahez", name: "جاهز", short: "جاهز", en: "Jahez", aliases: ["شركة جاهز", "تطبيق جاهز", "jahez"], careersUrl: null, source: "not-opened", checkedAt: CHECKED, note: "careers page answered 404" },
];

/**
 * The tiles of the seventh step per field: «مهارة» first (the owner's request), then the employers of the interest the
 * user just picked (its first one) from the snapshot's `companiesByField`, six in all; then «لا، مو الحين». «لم أحدّد بعد»
 * gets the big names of several fields.
 */
export const COMPANY_TILES: Readonly<Record<JobFieldId | "general", readonly CompanyId[]>> = {
  data: ["maharah", "aramco", "stc", "sabic", "qiddiya", "salla"],
  software: ["maharah", "stc", "mobily", "zain", "foodics", "lucidya"],
  design: ["maharah", "neom", "roshn", "hungerstation", "tabby", "lucidya"],
  marketing: ["maharah", "almarai", "salla", "hungerstation", "zain", "tamara"],
  business: ["maharah", "pif", "aramco", "qiddiya", "roshn", "tamara"],
  hr: ["maharah", "qiddiya", "misk", "stc", "almarai", "tamara"],
  // the 20 Nov 2026 expansion: employers with open postings of the field in research/expansion/raw/jobs.json (demandEvidence)
  product: ["maharah", "salla", "lucidya", "foodics"],
  "cyber-cloud": ["maharah", "qiddiya", "lucidya", "hungerstation"],
  "sales-supply": ["maharah", "foodics", "lucidya", "tamara", "qiddiya", "hungerstation"],
  general: ["maharah", "aramco", "stc", "sabic", "neom", "pif"],
};

/** The label of «لا، مو الحين» (the owner's words for the tile). */
export const COMPANY_NONE_LABEL = "لا، مو الحين";

export function getCompany(id: CompanyId): Company {
  const company = COMPANIES.find((c) => c.id === id);
  if (!company) throw new Error(`data: unknown company ${id}`);
  return company;
}

/** How the company answer prints (the slot «الشركة», «ملفي»): the company's everyday name, «لا، مو الحين», or null when unanswered. */
export function companyAnswerLabel(value: CompanyId | "none" | undefined): string | null {
  if (value === undefined) return null;
  if (value === "none") return COMPANY_NONE_LABEL;
  return COMPANIES.find((c) => c.id === value)?.short ?? null;
}

/** The tiles for a field (or the general set), in order. */
export function companyTiles(field: JobFieldId | null): readonly CompanyId[] {
  return COMPANY_TILES[field ?? "general"];
}
