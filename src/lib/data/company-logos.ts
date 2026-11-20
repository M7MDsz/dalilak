// Owner: data (20 Nov 2026). The company logos shipped in public/logos, so a job card can show the employer's logo offline.
// Each file was downloaded on 20 Nov 2026 from the company's own website; the exact source URL and page of each one are in
// research/jobs/logos.json, with the companies left out and why. A company without a logo here gets a monogram.
// Keys are the English name, the Arabic name and the everyday short name as the app's data writes them
// (src/lib/data/companies.ts, src/lib/data/jobs.ts). Pure module.

/** Company name (English, Arabic or short) -> public path of its logo. */
export const COMPANY_LOGOS: Readonly<Record<string, string>> = {
  // jeeny
  "Jeeny": "/logos/jeeny.svg",
  "جيني": "/logos/jeeny.svg",
  // ninja
  "Ninja": "/logos/ninja.png",
  "نينجا": "/logos/ninja.png",
  // salla
  "Salla": "/logos/salla.svg",
  "سلة": "/logos/salla.svg",
  "Salla (Mahally)": "/logos/salla.svg",
  "سلة (محلي)": "/logos/salla.svg",
  // lucidya
  "Lucidya": "/logos/lucidya.svg",
  "لوسيديا": "/logos/lucidya.svg",
  // almajed-oud
  "Almajed 4 Oud": "/logos/almajed-oud.png",
  "الماجد للعود": "/logos/almajed-oud.png",
  // horizontal-digital
  "Horizontal Digital": "/logos/horizontal-digital.svg",
  "هورايزنتال ديجيتال": "/logos/horizontal-digital.svg",
  // flyakeed
  "FlyAkeed": "/logos/flyakeed.png",
  "فلاي أكيد": "/logos/flyakeed.png",
  // hungerstation
  "HungerStation (Delivery Hero)": "/logos/hungerstation.svg",
  "هنقرستيشن": "/logos/hungerstation.svg",
  // syarah
  "Syarah": "/logos/syarah.svg",
  "سيارة": "/logos/syarah.svg",
  // foodics
  "Foodics": "/logos/foodics.svg",
  "فودكس": "/logos/foodics.svg",
  // atheer
  "Atheer ACT": "/logos/atheer.png",
  "أثير": "/logos/atheer.png",
  // tamara
  "Tamara": "/logos/tamara.svg",
  "تمارا": "/logos/tamara.svg",
  // aramco
  "Saudi Aramco": "/logos/aramco.png",
  "أرامكو السعودية": "/logos/aramco.png",
  "أرامكو": "/logos/aramco.png",
  // stc
  "stc": "/logos/stc.svg",
  // zatca
  "Zakat, Tax and Customs Authority (ZATCA)": "/logos/zatca.svg",
  "هيئة الزكاة والضريبة والجمارك": "/logos/zatca.svg",
  // mobily
  "Mobily": "/logos/mobily.svg",
  "موبايلي": "/logos/mobily.svg",
  // ejada
  "Ejada Systems": "/logos/ejada.png",
  "إجادة للأنظمة": "/logos/ejada.png",
  "إجادة": "/logos/ejada.png",
  // neom
  "NEOM": "/logos/neom.png",
  "نيوم": "/logos/neom.png",
  // roshn
  "ROSHN": "/logos/roshn.svg",
  "روشن": "/logos/roshn.svg",
  // tabby
  "Tabby": "/logos/tabby.svg",
  "تابي": "/logos/tabby.svg",
  // almarai
  "Almarai": "/logos/almarai.svg",
  "المراعي": "/logos/almarai.svg",
  // pif
  "Public Investment Fund (PIF)": "/logos/pif.svg",
  "صندوق الاستثمارات العامة": "/logos/pif.svg",
  // misk
  "Misk Foundation": "/logos/misk.png",
  "مؤسسة مسك": "/logos/misk.png",
  "مسك": "/logos/misk.png",
  // maharah
  "Maharah": "/logos/maharah.svg",
  "Maharah Human Resources": "/logos/maharah.svg",
  "Maharah Human Resources Company": "/logos/maharah.svg",
  "مهارة": "/logos/maharah.svg",
  "مهارة للموارد البشرية": "/logos/maharah.svg",
  "شركة مهارة للموارد البشرية": "/logos/maharah.svg",
};

const BY_LOWER: ReadonlyMap<string, string> = new Map(
  Object.entries(COMPANY_LOGOS).map(([name, path]) => [name.toLowerCase(), path] as const),
);

/**
 * The public path of a company's logo, or null when it has none (show a monogram). Matches the name as written, then
 * without case, then without a trailing «(…)» brand: «Salla (Mahally)» -> Salla's logo.
 */
export function companyLogo(name: string): string | null {
  const key = name.trim();
  if (!key) return null;
  const found = COMPANY_LOGOS[key] ?? BY_LOWER.get(key.toLowerCase());
  if (found) return found;
  const base = key.replace(/\s*\([^()]*\)$/, "");
  return base !== key ? companyLogo(base) : null;
}
