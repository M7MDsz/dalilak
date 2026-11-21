// Owner: brain-advisor. The fixed script of spec 4.3-4.5: keyword tables, the acknowledgement bank, the special replies.
// Every Arabic string is final copy from the spec. Pure; client-safe (no @/lib/store import).
import { SA_PLACES, SA_REGIONS, findSaPlace, type SaPlace, type SaPlaceKind, type SaRegion } from "@/lib/data";
import type {
  CityOption,
  EducationOption,
  ExperienceOption,
  InterestOption,
  MajorOption,
  OnboardingStepId,
  PriorityOption,
} from "@/lib/types";

// ── 4.3: keyword tables ────────────────────────────────────────────────────────────────────────────────────────────

export interface CityEntry {
  readonly keyword: string;
  readonly value: CityOption;
  /** The word kept as the label (4.3: «الخبر» → value dammam, label «الخبر»); null = the chip label. */
  readonly label: string | null;
}

/** The three job cities and the two holy cities as the chips name them (4.3), and «الخبر» / «الظهران» kept as typed. */
export const CITY_ENTRIES: readonly CityEntry[] = [
  { keyword: "الرياض", value: "riyadh", label: null },
  { keyword: "رياض", value: "riyadh", label: null },
  { keyword: "riyadh", value: "riyadh", label: null },
  { keyword: "جدة", value: "jeddah", label: null },
  { keyword: "جده", value: "jeddah", label: null },
  { keyword: "jeddah", value: "jeddah", label: null },
  { keyword: "الدمام", value: "dammam", label: null },
  { keyword: "دمام", value: "dammam", label: null },
  { keyword: "dammam", value: "dammam", label: null },
  { keyword: "الخبر", value: "dammam", label: "الخبر" },
  { keyword: "khobar", value: "dammam", label: "الخبر" },
  { keyword: "al khobar", value: "dammam", label: "الخبر" },
  { keyword: "alkhobar", value: "dammam", label: "الخبر" },
  { keyword: "dhahran", value: "dammam", label: "الظهران" },
  { keyword: "الظهران", value: "dammam", label: "الظهران" },
  { keyword: "مكة", value: "makkah", label: null },
  { keyword: "مكة المكرمة", value: "makkah", label: null },
  { keyword: "المدينة المنورة", value: "madinah", label: null },
  { keyword: "المدينه", value: "madinah", label: null },
  // English spellings people type (tester, 21 Nov 2026: «I live in Yanbu»)
  { keyword: "makkah", value: "makkah", label: null },
  { keyword: "mecca", value: "makkah", label: null },
  { keyword: "makka", value: "makkah", label: null },
  { keyword: "madinah", value: "madinah", label: null },
  { keyword: "medina", value: "madinah", label: null },
  { keyword: "madina", value: "madinah", label: null },
];

/**
 * Every other city and governorate of the kingdom (src/lib/data/sa-places.ts, 20 Nov 2026), and the regions people name
 * on their own («القصيم», «الشرقية»: read as the region's seat). Each is recorded as its nearest big job market (as
 * «الخبر» is recorded as dammam), so its jobs come first and remote ones right after.
 */
export interface PlaceEntry {
  readonly keyword: string;
  readonly place: SaPlace;
  /** The name kept as the label: the place's own name, or the alias or region name that was typed («جيزان», «القصيم»). */
  readonly label: string;
  /** Set when the keyword names a whole region: the reply speaks of the region and its seat. */
  readonly region: SaRegion | null;
}

/**
 * The spellings people type besides the name itself: a final «ء» left out or added («شقرا», «صبياء»), «ئ» / «ؤ» written
 * «ي» / «و» («الداير»). ة/ه, ى/ي, أ/إ/ا and «ال» are already the normaliser's (src/lib/text).
 */
export function placeSpellings(name: string): string[] {
  const out = new Set([name]);
  if (name.endsWith("اء")) out.add(name.slice(0, -1));
  else if (name.endsWith("ا")) out.add(`${name}ء`);
  for (const form of [...out]) out.add(form.replace(/ئ/g, "ي").replace(/ؤ/g, "و"));
  return [...out];
}

function placeEntries(): PlaceEntry[] {
  const core = new Set(CITY_ENTRIES.map((e) => e.keyword));
  const out: PlaceEntry[] = [];
  const add = (spelling: string, place: SaPlace, region: SaRegion | null, label: string) => {
    for (const keyword of placeSpellings(spelling)) if (!core.has(keyword)) out.push({ keyword, place, label, region });
  };
  // an English spelling («Yanbu») is kept under the place's Arabic name, so «دليلك» says «ينبع» back
  const latin = (word: string): boolean => /[A-Za-z]/.test(word);
  for (const place of SA_PLACES) for (const name of [place.name, ...(place.aliases ?? [])]) add(name, place, null, latin(name) ? place.name : name);
  for (const region of SA_REGIONS) {
    const seat = findSaPlace(region.seat);
    const arabic = region.aliases.find((a) => !latin(a)) ?? region.name;
    if (seat) for (const alias of region.aliases) add(alias, seat, region, latin(alias) ? arabic : alias);
  }
  return out;
}

export const PLACE_ENTRIES: readonly PlaceEntry[] = placeEntries();

/**
 * Place names that are also everyday words or first names («الكامل», «مرات», «الوجه», «شقراء», «بدر»): they count as
 * the place only next to a place word («من», «في», «ساكن» …), with «ب» on the front («بالمذنب»), or when nothing else was
 * said. So «أبي دوام كامل في الرياض» stays الرياض.
 */
export const AMBIGUOUS_PLACE_WORDS = [
  "بدر", "الكامل", "مرات", "الوجه", "حقل", "القرى", "الحجرة", "البرك", "الحريق", "هروب", "تربة", "الدرب", "البيضاء",
  "بحرة", "المهد", "البدع", "رماح", "ضمد", "الليث", "ثار", "العقيق", "الغزالة", "الطوال", "العارضة", "الدائر", "صوير",
  "الأمواه", "الفرشة", "البدائع", "المذنب", "السليل", "الريث", "العديد", "طريف", "عفيف", "شقراء", "ميسان", "تيماء",
  "سميراء", "الحائط", "السليمي", "المويه", "الحرث", "ليلى", "السيح", "الشرقية",
];

/** Words that say "this is where I am": the one before an ambiguous place name makes it the place. */
export const PLACE_CONTEXT_WORDS = [
  "من", "في", "ساكن", "ساكنة", "أسكن", "اسكن", "عايش", "عايشة", "أعيش", "مدينة", "مدينتي", "محافظة", "محافظتي",
  "منطقة", "منطقتي", "ديرتي", "بلدي", "أنا", "انا",
];

/** What «دليلك» needs to say a place back: where it is, its nearest big job market, how far (straight line, whole km). */
export interface PlaceAck {
  /** As kept in the answer: «شقراء», «القصيم». */
  readonly label: string;
  readonly kind: SaPlaceKind | "region";
  /** «منطقة الرياض», «المنطقة الشرقية». */
  readonly regionName: string;
  /** The region's emirate seat («بريدة»): said for a region. */
  readonly seat: string;
  /** «الرياض», «جدة», «الدمام». */
  readonly market: string;
  /** null: inside the market's own urban area (البيضاء). */
  readonly km: number | null;
}

/** «حوالي 160 كم»: tens from 100 km up, fives below (never under 5). */
export function roundKm(km: number): number {
  return km >= 100 ? Math.round(km / 10) * 10 : Math.max(5, Math.round(km / 5) * 5);
}

function placeWhere(a: PlaceAck): string {
  switch (a.kind) {
    case "region":
      return `مقر إمارتها ${a.seat}`;
    case "seat":
      return `مقر إمارة ${a.regionName}`;
    case "city":
      return `مدينة في ${a.regionName}`;
    case "governorate":
      return `محافظة في ${a.regionName}`;
  }
}

function placeNear(a: PlaceAck): string {
  if (a.km === null) return `، وهي ضمن حاضرة ${a.market}، يعني سوق ${a.market} عندك`;
  if (a.kind === "region" && a.market === a.seat) return `، و${a.market} من أكبر أسواق الوظائف عندنا`;
  const from = a.kind === "region" ? ` من ${a.seat}` : "";
  return `، وأقرب سوق وظائف كبير لك ${a.market} (حوالي ${roundKm(a.km)} كم${from} بخط مستقيم)`;
}

export const EDUCATION_KEYWORDS: readonly { readonly keyword: string; readonly value: EducationOption }[] = [
  { keyword: "ثانوي", value: "secondary" },
  { keyword: "ثانوية", value: "secondary" },
  { keyword: "دبلوم", value: "diploma" },
  { keyword: "بكالوريوس", value: "bachelor" },
  { keyword: "بكالريوس", value: "bachelor" },
  { keyword: "جامعي", value: "bachelor" },
  { keyword: "جامعة", value: "bachelor" },
  { keyword: "bachelor", value: "bachelor" },
  { keyword: "ماجستير", value: "postgrad" },
  { keyword: "دكتوراه", value: "postgrad" },
  { keyword: "دراسات عليا", value: "postgrad" },
  { keyword: "master", value: "postgrad" },
  { keyword: "طالب", value: "student" },
  { keyword: "طالبة", value: "student" },
  { keyword: "أدرس", value: "student" },
  { keyword: "ما زلت", value: "student" },
];

export const MAJOR_KEYWORDS: readonly { readonly keyword: string; readonly value: MajorOption }[] = [
  { keyword: "حاسب", value: "cs" },
  { keyword: "حاسوب", value: "cs" },
  { keyword: "تقنية معلومات", value: "cs" },
  { keyword: "هندسة برمجيات", value: "cs" },
  { keyword: "برمجة", value: "cs" },
  { keyword: "أمن سيبراني", value: "cs" },
  { keyword: "ذكاء اصطناعي", value: "cs" },
  { keyword: "cs", value: "cs" },
  { keyword: "it", value: "cs" },
  { keyword: "نظم معلومات", value: "mis" },
  { keyword: "mis", value: "mis" },
  { keyword: "إدارة أعمال", value: "business" },
  { keyword: "إدارة", value: "business" },
  { keyword: "محاسبة", value: "finance" },
  { keyword: "مالية", value: "finance" },
  { keyword: "تمويل", value: "finance" },
  { keyword: "اقتصاد", value: "finance" },
  { keyword: "تسويق", value: "marketing" },
  { keyword: "موارد بشرية", value: "hr" },
  { keyword: "hr", value: "hr" },
  { keyword: "تصميم", value: "design" },
  { keyword: "جرافيك", value: "design" },
  { keyword: "إعلام", value: "design" },
  { keyword: "فنون", value: "design" },
  /** Only when no `cs` keyword matched (4.3). */
  { keyword: "هندسة", value: "engineering" },
  { keyword: "رياضيات", value: "science" },
  { keyword: "إحصاء", value: "science" },
  { keyword: "فيزياء", value: "science" },
  { keyword: "كيمياء", value: "science" },
  { keyword: "أحياء", value: "science" },
  { keyword: "علوم", value: "science" },
];

export const INTEREST_KEYWORDS: readonly { readonly keyword: string; readonly value: InterestOption }[] = [
  { keyword: "بيانات", value: "data" },
  { keyword: "أرقام", value: "data" },
  { keyword: "تحليل", value: "data" },
  { keyword: "إحصاء", value: "data" },
  { keyword: "برمجة", value: "software" },
  { keyword: "تطبيقات", value: "software" },
  { keyword: "مواقع", value: "software" },
  { keyword: "موقع إلكتروني", value: "software" },
  { keyword: "ويب", value: "software" },
  { keyword: "فرونت إند", value: "software" },
  { keyword: "باك إند", value: "software" },
  { keyword: "مطوّر", value: "software" },
  { keyword: "تطوير", value: "software" },
  { keyword: "تصميم", value: "design" },
  { keyword: "إبداع", value: "design" },
  { keyword: "رسم", value: "design" },
  { keyword: "تسويق", value: "marketing" },
  { keyword: "محتوى", value: "marketing" },
  { keyword: "إعلانات", value: "marketing" },
  { keyword: "كتابة", value: "marketing" },
  { keyword: "مشاريع", value: "business" },
  { keyword: "أعمال", value: "business" },
  { keyword: "إدارة", value: "business" },
  { keyword: "تنظيم", value: "business" },
  { keyword: "مالية", value: "business" },
  { keyword: "الناس", value: "hr" },
  { keyword: "توظيف", value: "hr" },
  { keyword: "موارد بشرية", value: "hr" },
  { keyword: "تدريب", value: "hr" },
  { keyword: "لا أعرف", value: "unsure" },
  { keyword: "ما أدري", value: "unsure" },
  { keyword: "مو متأكد", value: "unsure" },
  // Simple English (5.1), as the city, education and major tables already have: "I like data".
  { keyword: "data", value: "data" },
  { keyword: "numbers", value: "data" },
  { keyword: "analysis", value: "data" },
  { keyword: "analytics", value: "data" },
  { keyword: "software", value: "software" },
  { keyword: "apps", value: "software" },
  { keyword: "web", value: "software" },
  { keyword: "websites", value: "software" },
  { keyword: "website", value: "software" },
  { keyword: "frontend", value: "software" },
  { keyword: "front end", value: "software" },
  { keyword: "backend", value: "software" },
  { keyword: "back end", value: "software" },
  { keyword: "app", value: "software" },
  { keyword: "developer", value: "software" },
  { keyword: "programming", value: "software" },
  { keyword: "coding", value: "software" },
  { keyword: "design", value: "design" },
  { keyword: "marketing", value: "marketing" },
  { keyword: "content", value: "marketing" },
  { keyword: "business", value: "business" },
  { keyword: "projects", value: "business" },
  { keyword: "people", value: "hr" },
  { keyword: "hr", value: "hr" },
  { keyword: "not sure", value: "unsure" },
];

export const PRIORITY_KEYWORDS: readonly { readonly keyword: string; readonly value: PriorityOption }[] = [
  { keyword: "أول وظيفة", value: "first-job" },
  { keyword: "أتوظف", value: "first-job" },
  { keyword: "وظيفة بسرعة", value: "first-job" },
  { keyword: "أغيّر", value: "switch" },
  { keyword: "تغيير مجال", value: "switch" },
  { keyword: "تغيير المجال", value: "switch" },
  { keyword: "مجال جديد", value: "switch" },
  { keyword: "أتطوّر", value: "grow" },
  { keyword: "ترقية", value: "grow" },
  { keyword: "أتقدّم في مجالي", value: "grow" },
  { keyword: "أستكشف", value: "explore" },
  { keyword: "أشوف الخيارات", value: "explore" },
  { keyword: "لا أعرف", value: "explore" },
];

/** Experience, tested in this order (4.3). */
export const EXPERIENCE_UNDER1_PHRASES = ["أقل من سنة", "نص سنة", "نصف سنة"];
export const EXPERIENCE_MONTH_WORDS = ["أشهر", "شهر", "شهور", "تدريب", "تعاوني"];
export const EXPERIENCE_MORE_WORDS = ["أكثر من", "فوق"];
export const EXPERIENCE_NONE_WORDS = ["بدون", "ما عندي", "ماعندي", "لا يوجد", "حديث تخرج", "حديث التخرج", "خريج جديد", "مافي"];
/** Number words (0 to 10) and their value; «سنة» alone is one year, «سنتين» two. */
export const NUMBER_WORDS: readonly { readonly word: string; readonly value: number }[] = [
  { word: "صفر", value: 0 },
  { word: "واحد", value: 1 },
  { word: "واحدة", value: 1 },
  { word: "سنة", value: 1 },
  { word: "سنه", value: 1 },
  { word: "سنتين", value: 2 },
  { word: "سنتان", value: 2 },
  { word: "اثنين", value: 2 },
  { word: "اثنتين", value: 2 },
  { word: "ثلاث", value: 3 },
  { word: "ثلاثة", value: 3 },
  { word: "أربع", value: 4 },
  { word: "أربعة", value: 4 },
  { word: "خمس", value: 5 },
  { word: "خمسة", value: 5 },
  { word: "ست", value: 6 },
  { word: "ستة", value: 6 },
  { word: "سبع", value: 7 },
  { word: "سبعة", value: 7 },
  { word: "ثمان", value: 8 },
  { word: "ثمانية", value: 8 },
  { word: "تسع", value: 9 },
  { word: "تسعة", value: 9 },
  { word: "عشر", value: 10 },
  { word: "عشرة", value: 10 },
];
/** `experience` is read ahead of its turn only when the message contains «خبرة» or a year word (4.3 step 4). */
export const EXPERIENCE_GATE_WORDS = ["خبرة", "خبرتي", "سنة", "سنتين", "سنوات", "سنين"];

/** `interest` and `priority` are read ahead of their turn only with a wish word (4.3 step 4). */
export const WISH_WORDS = ["أحب", "أهوى", "أميل", "أهتم", "يشدّني", "أريد", "أبغى", "أبي", "هدفي", "طموحي"];

/**
 * 20 Nov 2026, step 7 (the company): these say "no company in mind" («لا، مو الحين»). Read only while the company is the
 * pending question, and only when no company is named («لا، أبي أرامكو» is أرامكو). Company names themselves are the
 * engine's COMPANY_KEYWORDS (data `COMPANIES[].aliases`).
 */
export const COMPANY_NONE_PHRASES = [
  "لا", "لأ", "لاء", "لا شكرا", "مو الحين", "مب الحين", "مو الآن", "ليس الآن", "ما فيه", "مافيه", "ما في", "مافي",
  "ولا شي", "ولا شيء", "ولا وحدة", "ما عندي", "ماعندي", "بعدين", "لسا", "لسه", "أي شركة", "أي شي", "أي شيء", "أي وحدة",
  "ما يفرق", "مايفرق", "عادي", "no", "nope", "not now", "not yet", "none", "any",
];
/** A company is read ahead of its turn (4.3 step 4) only with a wish word: «أبي أشتغل في أرامكو», never «أشتغل في stc». */
export const COMPANY_GATE_WORDS = [
  "أحب", "أهوى", "أميل", "أهتم", "يشدّني", "أريد", "أبغى", "أبي", "هدفي", "طموحي", "حلمي", "أحلم", "نفسي", "ودي", "ودّي",
];

/** For the pending question, these are themselves an answer: its neutral value (4.3 "Neutral values"). */
export const NEUTRAL_PHRASES = ["لا أعرف", "ما أدري", "مدري", "لا أدري", "ما أعرف", "تخطَّ", "تخطى", "تخطي", "مو متأكد", "skip"];

// ── 4.3 step 1-2 and 4.5: questions, greetings, thanks ────────────────────────────────────────────────────────────

/** Step 1: a message that starts with one of these (or ends with «؟»/«?») is a question. «من» and «ما» are not here. */
export const QUESTION_WORDS = ["لماذا", "ليش", "كيف", "هل", "كم", "ماذا", "وش"];
/** The three special rows of 4.5, matched by keywords with or without a question mark. */
/** «ذكاء اصطناعي» alone is NOT here: it is a `cs` major keyword («تخصصي ذكاء اصطناعي»). */
export const WHO_PHRASES = ["من أنت", "مين أنت", "من انت", "هل أنت ذكاء اصطناعي", "أنت ذكاء اصطناعي", "هل أنت روبوت", "ما اسمك"];
export const WHY_ASK_PHRASES = ["لماذا تسأل", "ليش تسأل", "ليه تسأل", "ماذا ستفعل بإجاباتي", "وش بتسوي بإجاباتي", "ماذا تفعل بإجاباتي"];
export const COUNT_PHRASES = ["كم سؤالاً بقي", "كم سؤال بقي", "كم سؤال باقي", "كم سؤالا باقي", "كم بقي", "كم باقي"];

export const GREETING_SALAM = ["السلام عليكم", "السلام", "سلام", "عليكم"];
export const GREETING_OTHER = ["هلا", "هلا والله", "مرحبا", "مرحبتين", "أهلاً", "أهلين", "أهلا وسهلا", "صباح الخير", "مساء الخير", "صباح", "مساء", "الخير", "hi", "hello", "hey"];
export const THANKS_WORDS = ["شكراً", "شكرا جزيلا", "مشكور", "يعطيك العافية", "الله يعطيك العافية", "تسلم", "جزاك الله خير", "thanks", "thank you"];
/** Set aside with the greetings (a vocative): «هلا يا دليل». */
export const VOCATIVE_WORDS = ["يا", "دليلك", "دليل"];

/**
 * A greeting that came WITH an answer or a question is returned before the reply (QA: «السلام عليكم، أنا من الطائف»
 * gets «وعليكم السلام.» first). Narrower than step 2's lists: «صباح» / «مساء» alone may be part of an answer.
 */
export const LEAD_SALAM = ["السلام عليكم", "سلام عليكم", "السلام"];
export const LEAD_OTHER = ["هلا", "هلا والله", "مرحبا", "مرحبتين", "أهلاً", "أهلين", "أهلا وسهلا", "صباح الخير", "مساء الخير", "hi", "hello", "hey"];

/** Filler words left out of an answer accepted as typed (4.5 second miss): «تخصصي فلسفة» keeps «فلسفة». */
export const FILLER_WORDS = [
  "أنا", "انا", "تخصصي", "تخصص", "درست", "أدرس", "من", "في", "مدينتي", "ساكن", "أسكن", "عايش", "مدينة",
  "السلام", "عليكم", "هلا", "مرحبا", "يا", "دليلك", "دليل",
];

// ── 4.4: acknowledgements; 4.5: special replies ────────────────────────────────────────────────────────────────────

export const QUESTION_NUMBER: Readonly<Record<OnboardingStepId, 1 | 2 | 3 | 4 | 5 | 6 | 7>> = {
  city: 1,
  education: 2,
  major: 3,
  experience: 4,
  interest: 5,
  company: 6,
  priority: 7,
};

export const ACK = {
  city: [
    (city: string): string => `حلو، ${city}. بحط لك فرصها في المقدمة.`,
    (city: string): string => `زين، ${city}. سجّلتها عشان أرتّب لك الوظائف القريبة منك.`,
    (city: string): string => `تمام، ${city}. وفيه بعد فرص عن بُعد لو تبي.`,
  ],
  cityNoJobs: (city: string): string =>
    `${city}، يا حيّ أهلها! ترى الفرص القريبة منك قليلة في قائمتي، فبختار لك الأنسب من أقرب المدن والوظائف عن بُعد.`,
  /** Any other Saudi city, governorate or region (20 Nov 2026): «شقراء، حيّاك الله! محافظة في منطقة الرياض، …». */
  cityPlace: (a: PlaceAck): string =>
    `${a.label}، حيّاك الله! ${placeWhere(a)}${placeNear(a)}. وفيه بعد وظائف عن بُعد تقدر تشتغلها من مكانك.`,
  education: [
    (education: string): string => `${education}، ممتاز. أساس زين نبني عليه.`,
    (education: string): string => `${education}، ما شاء الله. وعليه نبني المهارات اللي تفرق معك.`,
    (education: string): string => `تمام، ${education}. وهذا أساس نبني عليه بإذن الله.`,
  ],
  educationStudent: "ما شاء الله، للحين تدرس؟ هذا أحسن وقت تبدأ فيه مسارك.",
  major: [
    (major: string): string => `${major}، تخصص يفتح لك أكثر من باب. بوريك أقربها لك.`,
    (major: string): string => `زين، ${major}. فيه مهارات كثيرة تنحسب لك من الحين.`,
    (major: string): string => `${major}، تخصص له مستقبل. بربطه لك بأقرب الوظائف له.`,
  ],
  majorOther: "ولا يهمك، التخصص ما يحدّنا، وبعتمد أكثر على اللي تحبه.",
  // 20 Nov 2026 (docs/ONBOARDING-FLOW.md 4): three variants each, picked like the city ones (name + question number); the
  // variant «خالد» gets is the line the demo always had.
  experience: {
    none: ["كلنا بدينا من الصفر، وهذا مو عيب. بدوّر لك على وظائف تفتح الباب للبدايات.", "ما عليه، أول خطوة أهم خطوة، وبختار لك فرص تناسب البداية.", "ولا يهمك، كلنا بدينا من هنا. بختار لك وظائف تناسب البدايات."],
    under1: ["حلو، عندك بداية، وكل شهر خبرة يفرق.", "زين، خبرة قصيرة بس تنحسب لك، ونبني عليها.", "بداية طيبة، وكل شهر خبرة ينحسب لك."],
    "1to3": ["زين، عندك أساس قوي. بدوّر لك على خطوة أعلى من البداية.", "حلو، خبرة تفرق معك، وبختار لك وظائف تبني عليها.", "ما شاء الله، خبرة زينة. بدوّر لك على خطوة أعلى، مو بداية من الصفر."],
    over3: ["خبرة طويلة، ما شاء الله. بختار لك مسار يناسب مستواك.", "زين، خبرة تفتح لك أبواب أعلى، وبدوّر لك عليها.", "ما شاء الله، خبرة تستاهل مسار يليق فيها."],
  } satisfies Record<ExperienceOption, readonly [string, string, string]>,
  interest: {
    data: ["الأرقام والبيانات، اختيار حلو. اللي يقرا الأرقام ينسمع رأيه.", "البيانات؟ زين، كل قرار كبير يبدأ من رقم.", "حلو، الأرقام والبيانات مجال مطلوب وممتع."],
    software: ["بناء المواقع والتطبيقات، ممتاز. وما أحلى إنك تبني شي يستخدمه الناس.", "زين، البرمجة تخليك تبني أفكارك بيدك.", "حلو، المواقع والتطبيقات شغل تشوف أثره على طول."],
    design: ["التصميم والإبداع، حلو. العين اللي تلقط التفاصيل مطلوبة.", "زين، الذوق الحلو يفرق في كل منتج.", "حلو، التصميم يخلي الفكرة تنفهم من أول نظرة."],
    marketing: ["التسويق والمحتوى، تمام. الكلمة الصح تفتح أبواب.", "زين، المحتوى الحلو يوصل للناس بسرعة.", "حلو، التسويق مجال يحب الأفكار الجديدة."],
    business: ["تنظيم الأعمال والمشاريع، ممتاز. كل فريق يحتاج أحد يرتّب الطريق.", "زين، اللي يرتب الشغل يرتاح معه الفريق كله.", "حلو، إدارة المشاريع تفتح لك أبواب كثيرة."],
    hr: ["الشغل مع الناس وتطويرهم، حلو. هذا أثر يبقى.", "زين، الناس هم أساس أي شركة.", "حلو، تطوير الناس شغل له طعم."],
    unsure: ["ولا يهمك، طبيعي ما تكون متأكد. بعتمد على تخصصك وخبرتك، وتقدر تغيّر الاتجاه متى ما بغيت.", "ما عليه، نكتشفها سوا، وبعتمد الحين على تخصصك وخبرتك.", "طبيعي، كثير يبدون كذا. بعتمد على تخصصك وخبرتك، والاتجاه تقدر تغيّره بعدين."],
  } satisfies Record<InterestOption, readonly [string, string, string]>,
  priority: {
    "first-job": ["زين، نركّز على أقرب وظيفة لك. بختار أقصر طريق.", "تمام، أول وظيفة هي الهدف، وبمشي معك له خطوة خطوة.", "أول وظيفة، هدف واضح. بختار لك أقصر طريق لها."],
    switch: ["تغيير المجال يبي له شجاعة، وأنت قدها. برسم لك جسر من مهاراتك الحالية.", "زين، بنستفيد من اللي عندك ونعبر به للمجال الجديد.", "حلو، التغيير قرار كبير، وبسهّله لك من مهاراتك الحالية."],
    grow: ["زين، نبني على اللي عندك ونطلع فيه خطوة.", "حلو، التطوّر في مجالك أقصر طريق لخطوة أعلى.", "قرار موفق، تتطوّر في مجالك وتبني على اللي عندك."],
    explore: ["زين، بوريك أكثر من اتجاه والاختيار لك.", "حلو، الاستكشاف يخليك تختار عن قناعة.", "الاستكشاف بداية ذكية. بوريك ثلاث اتجاهات والاختيار لك."],
  } satisfies Record<PriorityOption, readonly [string, string, string]>,
  /**
   * 20 Nov 2026, step 7: the company the user has in mind. `job`: the job of that company the path will aim at (engine
   * `companyJob`), «في الرياض» or «عن بُعد»; `noJob`: the job data has none of its jobs, so the path goes to the closest
   * job and the reveal says so; `early`: named ahead of its turn, before «دليلك» knows enough to pick one of its jobs.
   */
  company: {
    job: (company: string, title: string, where: string): string =>
      `${company}، اختيار زين! عندهم وظيفة «${title}» ${where}، وعليها برسم مسارك.`,
    noJob: (company: string): string =>
      `${company}، اختيار زين! بس ما عندي الحين وظيفة منهم في قائمتي، فبرسم مسارك لأقرب وظيفة تناسبك، وتقدر تغيّر الشركة من «ملفي» متى ما بغيت.`,
    /** It has jobs in the data, but none in the field the user asked for (20 Nov 2026): never aimed at another field. */
    noJobInField: (company: string): string =>
      `${company}، اختيار زين! بس ما عندي الحين وظيفة منهم في المجال اللي تبيه، فبرسم مسارك لأقرب وظيفة تناسبك، ووظايفهم الثانية تلقاها في «الوظائف».`,
    /**
     * Its jobs are in another field (21 Nov 2026, tester: «مهارة» leads every field): said positively, the job pinned first
     * among the map's jobs, the path still in the user's field.
     */
    otherField: (company: string, title: string, field: string, mine: string): string =>
      `${company}، اختيار زين! عندهم وظيفة «${title}» في ${field}، حطيتها لك أول وحدة في وظائفك، ومسارك الأساسي يبقى في ${mine}.`,
    /** It has jobs in the field, but all need more experience (21 Nov 2026): the next goal, never the path now. */
    aboveBand: (company: string): string =>
      `${company} عندهم وظايف في مجالك، بس تبي خبرة أكثر. نخليها هدفك الجاي، وأرسم لك مسار يوصلك لها.`,
    early: (company: string): string => `${company}، سجّلتها! عندهم وظايف في قائمتي، وبعد ما أعرفك أكثر أختار لك أنسبها.`,
    none: "ولا يهمك، نخليها مفتوحة، وتقدر تضيفها بعدين من «ملفي».",
    /** The second miss: a name «دليلك» does not know is never guessed (4.5: it never loops). */
    unknown: "ما عرفتها، فنخليها مفتوحة الحين، وتقدر تضيفها بعدين من «ملفي».",
  },
  /** The neutral value taken (a «لا أعرف» answer, or the second miss of the four other questions: 4.5). */
  neutral: (label: string): string => `ولا يهمك، نخليها «${label}» ونكمل.`,
} as const;

export const REPLY = {
  opening: (name: string): string => `هلا والله يا ${name}، أنا دليلك إلى وظيفتك. بكون معك من أول خطوة لآخرها.`,
  openingLead: "بسألك سبع أسئلة قصيرة، وعلى ضوئها أرسم لك مسار يناسبك أنت.",
  /** Before question 1, in its own message so the first question stands out (19 Nov 2026). */
  openingAsk: "نبدأ بالسهل:",
  closing: (name: string): string => `يعطيك العافية يا ${name}، اكتملت الصورة. لحظات وأرسم لك مسارك.`,
  greetingSalam: "وعليكم السلام، حيّاك الله.",
  greetingOther: "هلا والله.",
  thanks: "العفو.",
  who: "أنا دليلك إلى وظيفتك. أسألك الحين عشان أرسم مسارك، وبعدها أكون معك في كل خطوة.",
  whyAsk: "أسأل عشان أختار لك من 20 وظيفة اللي يناسب مدينتك وتخصصك وخبرتك واللي تحبه. وترى إجاباتك تنحفظ في متصفحك.",
  /** 4.5 «بقي {n} فقط.» with its counted noun (spec "Counted nouns"): 1 singular, 2 dual, 3-10 plural, 11+ singular. */
  count: (n: number): string =>
    n === 1 ? "باقي سؤال واحد بس." : n === 2 ? "باقي سؤالين بس." : n <= 10 ? `باقي ${n} أسئلة بس.` : `باقي ${n} سؤال بس.`,
  /** Returned before the reply when a greeting came with an answer or a question (QA). */
  leadSalam: "وعليكم السلام.",
  leadOther: "هلا والله.",
  otherQuestion: "سؤال في محله، ونرجع له بعد ما نرسم مسارك.",
  unmapped: "سامحني، ما لقطتها زين. تقدر تختار من الخيارات تحت، أو تكتبها بطريقة ثانية.",
  /** The first miss of step 7 (a company name «دليلك» does not know). */
  unmappedCompany: "ما عرفت ذي الشركة. تقدر تختار من الخيارات تحت أو تكتب اسمها بطريقة ثانية، وإذا ما في بالك شي، اختر «لا، مو الحين».",
  /** «وسجّلت أيضاً: تخصصك تسويق، وبدون خبرة بعد.» (4.3: the extra answers confirmed in the acknowledgement). */
  alsoRecorded: (items: string): string => `وسجّلت بعد: ${items}.`,
} as const;
