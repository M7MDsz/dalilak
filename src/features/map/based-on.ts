// Owner: map (20 Nov 2026). «المسار مبني على: …»: what each job family's path is built on, shown as one quiet line
// at the foot of the path page, each named source a link that opens in a new tab. Generated from
// research/paths/paths-guidelines.json (`basedOnLine`, `basedOnLinks`, `jobs`); static text, so it works offline.
// A job is read from that file's job lists first, then from its field (and, in data, its title). Pure module.
import type { Job } from "@/lib/types";

export type PathFamily = "data-analyst-bi" | "data-science" | "frontend-web" | "backend" | "qa" | "ui-ux-product-design" | "ux-research" | "digital-marketing" | "business-pm-finance" | "hr-recruitment";

export interface BasedOnSource {
  /** The source as the line names it («دليل اختبار Microsoft PL-300 لمحلل بيانات Power BI»). */
  readonly name: string;
  /** Its short name, the text of its link in the one-line form («Microsoft PL-300»). */
  readonly short: string;
  readonly url: string;
}

export interface BasedOn {
  readonly family: PathFamily;
  /** The family's name («محلل بيانات / ذكاء الأعمال»). */
  readonly label: string;
  /** In the line's order; the line reads «المسار مبني على: A، وB، وC». */
  readonly sources: readonly BasedOnSource[];
}

export const BASED_ON_LEAD = "المسار مبني على:";

export const BASED_ON: Readonly<Record<PathFamily, BasedOn>> = {
  "data-analyst-bi": {
    family: "data-analyst-bi",
    label: "محلل بيانات / ذكاء الأعمال",
    sources: [
      { name: "دليل اختبار Microsoft PL-300 لمحلل بيانات Power BI", short: "Microsoft PL-300", url: "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300" },
      { name: "شهادة Google لتحليل البيانات", short: "Google Data Analytics", url: "https://www.coursera.org/professional-certificates/google-data-analytics" },
      { name: "بطاقة مهنة «محلل البيانات» في الإطار الوطني للمعايير المهنية للبيانات والذكاء الاصطناعي (سدايا)", short: "إطار سدايا", url: "https://iu.edu.sa/media/%D9%85%D8%B1%D9%83%D8%B2%20%D8%AF%D8%B9%D9%85%20%D8%A7%D8%AA%D8%AE%D8%A7%D8%B0%20%D8%A7%D9%84%D9%82%D8%B1%D8%A7%D8%B1%20%D9%88%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9%20%D8%A7%D9%84%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA/%D9%86%D8%B4%D8%B1%D8%A7%D8%AA%20%D8%AA%D9%88%D8%B9%D9%8A%D8%A9_PDF/%D8%A7%D9%84%D8%A5%D8%B7%D8%A7%D8%B1%20%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%20%D9%84%D9%84%D9%85%D8%B9%D8%A7%D9%8A%D9%8A%D8%B1%20%D8%A7%D9%84%D9%85%D9%87%D9%86%D9%8A%D8%A9%20%D9%84%D9%84%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA%20%D9%88%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1%20%D8%A7%D9%84%D8%A5%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A.pdf" },
    ],
  },
  "data-science": {
    family: "data-science",
    label: "علم البيانات",
    sources: [
      { name: "شهادة IBM لعلم البيانات", short: "IBM Data Science", url: "https://www.coursera.org/professional-certificates/ibm-data-science" },
      { name: "شهادة Google المتقدمة لتحليل البيانات", short: "Google Advanced Data Analytics", url: "https://www.coursera.org/professional-certificates/google-advanced-data-analytics" },
      { name: "بطاقة مهنة «عالم بيانات» في الإطار الوطني للمعايير المهنية للبيانات والذكاء الاصطناعي (سدايا)", short: "إطار سدايا", url: "https://iu.edu.sa/media/%D9%85%D8%B1%D9%83%D8%B2%20%D8%AF%D8%B9%D9%85%20%D8%A7%D8%AA%D8%AE%D8%A7%D8%B0%20%D8%A7%D9%84%D9%82%D8%B1%D8%A7%D8%B1%20%D9%88%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9%20%D8%A7%D9%84%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA/%D9%86%D8%B4%D8%B1%D8%A7%D8%AA%20%D8%AA%D9%88%D8%B9%D9%8A%D8%A9_PDF/%D8%A7%D9%84%D8%A5%D8%B7%D8%A7%D8%B1%20%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A%20%D9%84%D9%84%D9%85%D8%B9%D8%A7%D9%8A%D9%8A%D8%B1%20%D8%A7%D9%84%D9%85%D9%87%D9%86%D9%8A%D8%A9%20%D9%84%D9%84%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA%20%D9%88%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1%20%D8%A7%D9%84%D8%A5%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A.pdf" },
    ],
  },
  "frontend-web": {
    family: "frontend-web",
    label: "تطوير الواجهات الأمامية والويب",
    sources: [
      { name: "شهادة Meta لتطوير الواجهات الأمامية", short: "Meta Front-End", url: "https://www.coursera.org/professional-certificates/meta-front-end-developer" },
      { name: "مسار مطوّر الواجهات الأمامية في roadmap.sh", short: "roadmap.sh", url: "https://roadmap.sh/frontend" },
    ],
  },
  "backend": {
    family: "backend",
    label: "تطوير الأنظمة الخلفية",
    sources: [
      { name: "شهادة Meta لتطوير الأنظمة الخلفية", short: "Meta Back-End", url: "https://www.coursera.org/professional-certificates/meta-back-end-developer" },
      { name: "مسار مطوّر الأنظمة الخلفية في roadmap.sh", short: "roadmap.sh", url: "https://roadmap.sh/backend" },
    ],
  },
  "qa": {
    family: "qa",
    label: "ضمان الجودة واختبار البرمجيات",
    sources: [
      { name: "منهج شهادة ISTQB للمستوى التأسيسي في اختبار البرمجيات (CTFL)", short: "ISTQB CTFL", url: "https://www.istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/" },
      { name: "مسار مهندس ضمان الجودة في roadmap.sh", short: "roadmap.sh", url: "https://roadmap.sh/qa" },
    ],
  },
  "ui-ux-product-design": {
    family: "ui-ux-product-design",
    label: "تصميم الواجهات وتجربة المستخدم والمنتجات",
    sources: [
      { name: "شهادة Google لتصميم تجربة المستخدم", short: "Google UX Design", url: "https://www.coursera.org/professional-certificates/google-ux-design" },
      { name: "مسار تصميم تجربة المستخدم في roadmap.sh", short: "roadmap.sh", url: "https://roadmap.sh/ux-design" },
    ],
  },
  "ux-research": {
    family: "ux-research",
    label: "بحث تجربة المستخدم",
    sources: [
      { name: "تخصص جامعة ميشيغان في بحث وتصميم تجربة المستخدم", short: "Michigan UX", url: "https://www.coursera.org/specializations/michiganux" },
      { name: "شهادة Nielsen Norman Group في تجربة المستخدم (تخصص البحث)", short: "NN/g UX", url: "https://www.nngroup.com/ux-certification/" },
    ],
  },
  "digital-marketing": {
    family: "digital-marketing",
    label: "التسويق الرقمي والمحتوى والإعلانات",
    sources: [
      { name: "شهادة Google للتسويق الرقمي والتجارة الإلكترونية", short: "Google Digital Marketing", url: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce" },
      { name: "شهادة Meta لتسويق وسائل التواصل الاجتماعي", short: "Meta Social Media Marketing", url: "https://www.coursera.org/professional-certificates/facebook-social-media-marketing" },
    ],
  },
  "business-pm-finance": {
    family: "business-pm-finance",
    label: "تحليل الأعمال وإدارة المشاريع والمالية",
    sources: [
      { name: "شهادة IIBA التأسيسية في تحليل الأعمال (ECBA)", short: "IIBA ECBA", url: "https://www.iiba.org/business-analysis-certifications/ecba/" },
      { name: "مخطط اختبار PMI CAPM لإدارة المشاريع", short: "PMI CAPM", url: "https://www.pmi.org/certifications/certified-associate-capm" },
      { name: "برنامج CFI للتحليل والنمذجة المالية (FMVA)", short: "CFI FMVA", url: "https://corporatefinanceinstitute.com/certifications/financial-modeling-valuation-analyst-fmva-program/" },
    ],
  },
  "hr-recruitment": {
    family: "hr-recruitment",
    label: "الموارد البشرية والاستقطاب",
    sources: [
      { name: "مخطط محتوى اختبار aPHRi من معهد اعتماد الموارد البشرية (HRCI)", short: "HRCI aPHRi", url: "https://www.hrci.org/docs/default-source/2024-document-control/hrci_aphri-exam-content-outline-2024.pdf" },
    ],
  },
};

/** The jobs the research file names, by family. */
const FAMILY_OF_JOB: Readonly<Record<string, PathFamily>> = {
  "data-analyst-riyadh": "data-analyst-bi",
  "jeeny-growth-insights-analytics-riyadh": "data-analyst-bi",
  "qiddiya-hr-analytics-analyst-riyadh": "data-analyst-bi",
  "ninja-real-estate-performance-analyst-riyadh": "data-analyst-bi",
  "master-works-data-senior-engineer-riyadh": "data-analyst-bi",
  "salla-senior-data-scientist-remote": "data-science",
  "lucidya-frontend-engineer-dammam": "frontend-web",
  "almajed-mobile-developer-riyadh": "frontend-web",
  "salla-senior-backend-checkout-remote": "backend",
  "salla-senior-qa-engineer-remote": "qa",
  "horizontal-graduate-designer-riyadh": "ui-ux-product-design",
  "flyakeed-product-designer-riyadh": "ui-ux-product-design",
  "lucidya-product-designer-riyadh": "ui-ux-product-design",
  "hungerstation-senior-product-designer-riyadh": "ui-ux-product-design",
  "salla-marketing-specialist-tamheer-jeddah": "digital-marketing",
  "salla-mahally-seo-manager-jeddah": "digital-marketing",
  "lucidya-social-media-analyst-riyadh": "digital-marketing",
  "platinumlist-content-manager-riyadh": "digital-marketing",
  "master-works-ai-business-analyst-riyadh": "business-pm-finance",
  "syarah-financial-analyst-tamheer-riyadh": "business-pm-finance",
  "foodics-accountant-erp-riyadh": "business-pm-finance",
  "atheer-hr-specialist-riyadh": "hr-recruitment",
  "qiddiya-hris-specialist-riyadh": "hr-recruitment",
  "lucidya-people-operations-riyadh": "hr-recruitment",
  "tamara-people-business-partner-riyadh": "hr-recruitment",
  "lucidya-talent-acquisition-lead-riyadh": "hr-recruitment",
};

/** A job the file does not name: by its field, and in data and software by what its title says. */
function familyByField(job: Job): PathFamily {
  const title = `${job.title} ${job.titleEn ?? ""}`.toLowerCase();
  switch (job.field) {
    case "data":
      return /عالم بيانات|علم البيانات|scientist|science/.test(title) ? "data-science" : "data-analyst-bi";
    case "software":
      if (/جودة|اختبار|qa|quality|test/.test(title)) return "qa";
      return /خلفي|backend|back-end/.test(title) ? "backend" : "frontend-web";
    case "design":
      return /بحث|research/.test(title) ? "ux-research" : "ui-ux-product-design";
    case "marketing":
      return "digital-marketing";
    case "business":
      return "business-pm-finance";
    case "hr":
      return "hr-recruitment";
    default:
      return "data-analyst-bi";
  }
}

/** What the path to this job is built on. */
export function basedOnFor(job: Job): BasedOn {
  return BASED_ON[FAMILY_OF_JOB[job.id] ?? familyByField(job)];
}
