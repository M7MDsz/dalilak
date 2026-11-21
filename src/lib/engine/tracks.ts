// Owner: engine. 21 Nov 2026 (owner: «if I choose web and building, he should give you the path of web and then let him
// choose between full stack, front end, back end — the same for other jobs»): the specialisations (tracks) of each job
// field, and which one a job belongs to. A job is classified by its titles (Arabic and the posting's English), first
// matching track in catalogue order; a job no keyword fits falls into its field's general track. Pure.
import { JOBS, getField, getJob } from "@/lib/data";
import type { Job, JobFieldId, JobId } from "@/lib/types";

export interface Track {
  /** `${field}/${slug}`, e.g. «software/front-end»; the general track is `${field}/general`. */
  readonly id: string;
  readonly field: JobFieldId;
  /** «واجهات أمامية». */
  readonly name: string;
  /** The field's catch-all: a job no keyword of the field fits. */
  readonly general: boolean;
}

type TrackDef = readonly [slug: string, name: string, match: RegExp];

/** The keywords run on the titles with the Arabic marks (shadda, harakat, tatweel) and direction marks taken out. */
const AI = /ذكاء اصطناعي|الذكاء الاصطناعي|تعلم الآلة|رؤية حاسوبية|\bai\b|machine learning|computer vision|\bml\b/i;
const CLOUD = /devops|سحابي|السحابية|cloud|\bsre\b|موثوقية|reliability|البنية التحتية|infrastructure/i;

/**
 * Per field: its tracks in matching order (the more specific first: «متكامل» before «تكامل», «عالم بيانات» before «محلل»),
 * and the name of its general track. A field missing here (a new one) has only its general track.
 */
const CATALOGUE: Partial<Record<JobFieldId, { readonly tracks: readonly TrackDef[]; readonly general: string }>> = {
  data: {
    tracks: [
      ["science", "علم البيانات", /عالم بيانات|علم البيانات|data scien/i],
      ["engineering", "هندسة البيانات", /مهندس بيانات|هندسة البيانات|قواعد بيانات|قواعد البيانات|data,? (senior )?engineer|database|\betl\b/i],
      ["ai", "الذكاء الاصطناعي وتعلّم الآلة", AI],
      ["bi", "ذكاء الأعمال BI", /ذكاء الأعمال|\bbi\b|business intelligence|reporting|تقارير|لوحات|dashboard|performance|محلل أداء/i],
      ["analysis", "تحليل البيانات", /محلل|تحليل|analyst|analytics|insights/i],
    ],
    general: "مسار عام في البيانات",
  },
  software: {
    tracks: [
      ["full-stack", "تطوير متكامل", /متكامل|full.?stack/i],
      ["front-end", "واجهات أمامية", /واجهات أمامية|واجهات امامية|front.?end/i],
      ["mobile", "تطبيقات الجوال", /جوال|mobile|flutter|\bios\b|android|react native|swift|kotlin/i],
      ["qa", "ضمان الجودة والاختبار", /ضمان (ال)?جودة|اختبار|\bqa\b|quality assurance|\btest/i],
      ["ai", "الذكاء الاصطناعي", AI],
      ["cloud", "الحوسبة السحابية وDevOps", CLOUD],
      ["back-end", "واجهات خلفية", /خلفي|back.?end|java|\.net|outsystems|موزعة|distributed|تكامل|integration|\bapi/i],
    ],
    general: "مسار عام في البرمجيات",
  },
  design: {
    tracks: [
      ["ui-ux", "واجهات وتجربة المستخدم UI/UX", /تجربة|واجهات|\bux\b|\bui\b/i],
      ["product", "تصميم المنتجات", /منتج|product/i],
      ["graphic", "التصميم الجرافيكي", /جرافيك|graphic|بصري|visual|إبداعي|ابداعي|creative|موشن|motion|وسائط|multimedia|brand/i],
    ],
    general: "مسار عام في التصميم",
  },
  marketing: {
    tracks: [
      ["social", "التواصل الاجتماعي", /التواصل الاجتماعي|وسائل التواصل|social/i],
      ["content", "المحتوى", /محتوى|كاتب|كتابة|content|copywrit/i],
      ["digital", "التسويق الرقمي والحملات", /حملات|حملة|رقمي|محركات البحث|تفعيل|\bseo\b|\bsem\b|campaign|digital|activation|performance|growth/i],
    ],
    general: "التسويق العام",
  },
  business: {
    tracks: [
      ["accounting", "المحاسبة", /محاسب|حسابات|فواتير|إيرادات|ايرادات|مدقق|account|invoice|payable|receivable|revenue|auditor|bookkeep/i],
      ["finance", "التحليل المالي", /مالي|جدوى|financial|feasib|finance|investment|استثمار/i],
      ["business-dev", "تحليل الأعمال وتطويرها", /تطوير أعمال|تطوير الأعمال|محلل أعمال|business develop|business,? analyst/i],
    ],
    general: "مسار عام في الأعمال",
  },
  hr: {
    tracks: [
      ["recruitment", "الاستقطاب", /استقطاب|توظيف|talent acquisition|recruit/i],
      ["operations", "عمليات الموارد البشرية", /عمليات|رواتب|أنظمة معلومات|انظمة معلومات|operations|payroll|hris/i],
      ["analytics", "تحليلات الموارد البشرية", /تحليل|محلل|تخطيط القوى|analyst|analytics|workforce/i],
    ],
    general: "مسار عام في الموارد البشرية",
  },
  product: {
    tracks: [
      ["ai", "منتجات الذكاء الاصطناعي", AI],
      ["commerce", "منتجات التجارة الإلكترونية", /متجر|تجارة|storefront|checkout|commerce/i],
      ["analytics", "تحليل المنتجات", /تحليل|محلل|analyst|analytics/i],
      ["management", "إدارة المنتجات", /مدير منتج|مدير منتجات|مالك المنتج|product manager|product owner/i],
    ],
    general: "مسار عام في المنتجات",
  },
  "cyber-cloud": {
    tracks: [
      ["security", "الأمن السيبراني", /أمن|سيبراني|security|\bsoc\b|cyber|purple|red team|penetration/i],
      ["cloud", "الحوسبة السحابية وDevOps", CLOUD],
      ["support", "الدعم الفني وحوكمة التقنية", /دعم فني|حوكمة|help ?desk|support|governance/i],
    ],
    general: "مسار عام في التقنية",
  },
  "sales-supply": {
    tracks: [
      ["supply", "المشتريات وسلاسل الإمداد", /مشتريات|مستودع|لوجست|الصادر|الوارد|إمداد|امداد|procure|purchas|store ?keeper|warehouse|\b3pl\b|logistic|supply|outbound/i],
      ["customer", "خدمة العملاء ونجاحهم", /عملاء|مركز اتصال|دعم خدمات|customer|contact cent|care|support/i],
      ["sales", "المبيعات وتطوير الأعمال", /مبيعات|تطوير أعمال|حسابات|sales|business develop|account manager/i],
    ],
    general: "العمليات والتشغيل",
  },
  engineering: {
    tracks: [
      ["quality-safety", "الجودة والسلامة", /جودة|سلامة|حريق|quality|safety|\bhse\b|fire/i],
      ["architecture", "الهندسة المعمارية", /معماري|architect/i],
      ["mep", "الهندسة الميكانيكية والكهربائية", /ميكانيك|كهرب|تكييف|mechanical|electrical|hvac|\bmep\b/i],
      ["civil", "الهندسة المدنية والمواقع", /مدني|موقع|إنشائ|انشائ|civil|site|structural/i],
    ],
    general: "مسار عام في الهندسة",
  },
  "project-controls": {
    tracks: [
      ["planning-cost", "التخطيط ومراقبة التكاليف", /تخطيط|تكاليف|planning|cost|schedul/i],
      ["contracts", "العقود", /عقود|contract/i],
    ],
    general: "إدارة المشاريع",
  },
  "tourism-hospitality": {
    tracks: [
      ["events", "الفعاليات", /فعاليات|مناسبات|أعراس|event|wedding/i],
      ["guests", "الضيافة وخدمة الضيوف", /ضيوف|مضيفين|أغذية|guest|host|food|beverage|front office|hospitality/i],
    ],
    general: "مسار عام في السياحة والضيافة",
  },
  "health-admin": {
    tracks: [
      ["revenue", "دورة الإيرادات الصحية", /إيرادات|ايرادات|\brcm\b|revenue|billing/i],
      ["patients", "خدمة المرضى والعملاء", /عملاء|مرضى|customer|patient/i],
    ],
    general: "مسار عام في الإدارة الصحية",
  },
  education: {
    tracks: [
      ["instructional", "التصميم التعليمي", /تصميم تعليمي|instructional/i],
      ["training", "التدريب", /مدرب|تدريب|trainer|training/i],
      ["teaching", "التدريس", /معلم|teacher|teaching/i],
    ],
    general: "الإدارة التعليمية",
  },
  "banking-risk": {
    tracks: [
      ["compliance", "الالتزام ومكافحة الاحتيال", /التزام|احتيال|غسل|compliance|fraud|\baml\b/i],
      ["audit", "المراجعة والتدقيق", /مراجع|تدقيق|audit|assurance/i],
      ["credit", "الائتمان والتحصيل", /ائتمان|تحصيل|credit|collection/i],
    ],
    general: "مسار عام في المصارف والمخاطر",
  },
  legal: {
    tracks: [
      ["governance", "الحوكمة والتأهيل", /حوكمة|governance|prequalif/i],
      ["coordination", "التنسيق والإدارة القانونية", /منسق|إداري|اداري|coordinator|administrative/i],
      ["advisory", "التحليل والاستشارات القانونية", /قانوني|legal/i],
    ],
    general: "مسار عام في القانون",
  },
  media: {
    tracks: [
      ["creative", "التصميم الإبداعي والموشن", /تصميم|موشن|وسائط|design|motion|multimedia/i],
      ["content", "المحتوى", /محتوى|content/i],
    ],
    general: "مسار عام في الإعلام",
  },
  communications: {
    tracks: [
      ["government", "العلاقات الحكومية", /حكومي|government/i],
      ["internal", "الاتصال المؤسسي", /اتصال|communication/i],
      ["media", "الإعلام وصناعة المحتوى", /إعلام|اعلام|محتوى|media|content/i],
    ],
    general: "مسار عام في الاتصال",
  },
  gaming: { tracks: [], general: "الألعاب والرياضات الإلكترونية" },
  "real-estate": { tracks: [], general: "العقار والتأجير" },
  aviation: { tracks: [], general: "عمليات الطيران" },
  "energy-sustainability": { tracks: [], general: "الطاقة والاستدامة" },
};

/** The Arabic marks and the direction marks that would break a keyword («مطوّر», «‎.NET»). */
const MARKS = /[ً-ْٰـ‎‏‪-‮]/g;

function defsOf(field: JobFieldId) {
  return CATALOGUE[field] ?? { tracks: [], general: `مسار عام في ${getField(field).name}` };
}

/** Every track of a field, in catalogue order, its general track last (with or without jobs). */
export function trackCatalogue(field: JobFieldId): readonly Track[] {
  const defs = defsOf(field);
  return [
    ...defs.tracks.map(([slug, name]) => ({ id: `${field}/${slug}`, field, name, general: false })),
    { id: `${field}/general`, field, name: defs.general, general: true },
  ];
}

const trackCache = new Map<JobId, Track>();

/** The track a job belongs to: the first of its field's tracks whose keywords fit its titles, else the general one. */
export function trackOf(job: Job | JobId): Track {
  const j = typeof job === "string" ? getJob(job) : job;
  const cached = trackCache.get(j.id);
  if (cached) return cached;
  const text = `${j.title} ${j.titleEn ?? ""}`.replace(MARKS, "");
  const all = trackCatalogue(j.field);
  const defs = defsOf(j.field).tracks;
  const at = defs.findIndex(([, , match]) => match.test(text));
  const track = (at >= 0 ? all[at] : all[all.length - 1]) as Track;
  trackCache.set(j.id, track);
  return track;
}

/** The jobs of a track, in data order. */
export function jobsOfTrack(trackId: string): readonly JobId[] {
  return JOBS.filter((job) => trackOf(job).id === trackId).map((job) => job.id);
}

/** The tracks of a field that have at least one job, in catalogue order (the only ones ever offered). */
export function tracksOf(field: JobFieldId): readonly Track[] {
  const used = new Set(JOBS.filter((job) => job.field === field).map((job) => trackOf(job).id));
  return trackCatalogue(field).filter((t) => used.has(t.id));
}

/**
 * 21 Nov 2026 (owner: «أتطوّر في مجالي» must upgrade the user's current career): the named tracks of a field that have
 * jobs (its general track left out): the choices of «وش تخصصك فيه بالضبط؟».
 */
export function namedTracksOf(field: JobFieldId): readonly Track[] {
  return tracksOf(field).filter((t) => !t.general);
}

/** Everyday spellings of the English track words («باك إند», «فل ستاك»): read as the English the keywords know. */
const SPOKEN: readonly (readonly [RegExp, string])[] = [
  [/باك ?[اإأ]ند/g, "back end"],
  [/فرو?نت ?[اإأ]ند/g, "front end"],
  [/فل ?ستا?ك/g, "full stack"],
  [/موبا?يل/g, "mobile"],
  [/ديف ?[اأ]وبس/g, "devops"],
  [/سوشي?ال ?ميديا/g, "social"],
  [/داتا ?سا?ينس/g, "data science"],
  [/تستر|تستنق|تيستنق/g, "test"],
];

/**
 * The named track of `field` a text names (a typed answer, or a CV's job title: «محاسب», «مطوّر واجهات خلفية», «back-end
 * developer»), by the same keywords that classify the jobs; null when none of the field's tracks with jobs fits.
 */
export function trackFromText(field: JobFieldId, text: string): Track | null {
  let clean = text.replace(MARKS, "");
  for (const [spoken, english] of SPOKEN) clean = clean.replace(spoken, english);
  const offered = new Set(namedTracksOf(field).map((t) => t.id));
  const all = trackCatalogue(field);
  const at = defsOf(field).tracks.findIndex(([slug, , match]) => offered.has(`${field}/${slug}`) && match.test(clean));
  return at >= 0 ? (all[at] ?? null) : null;
}
