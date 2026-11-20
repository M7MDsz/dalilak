// Owner: brain-advisor. The fixed script of spec 4.3-4.5: keyword tables, the acknowledgement bank, the special replies.
// Every Arabic string is final copy from the spec. Pure; client-safe (no @/lib/store import).
import type {
  CityOption,
  EducationOption,
  ExperienceOption,
  InterestOption,
  MajorOption,
  PriorityOption,
  QuestionId,
} from "@/lib/types";

// ── 4.3: keyword tables ────────────────────────────────────────────────────────────────────────────────────────────

export interface CityEntry {
  readonly keyword: string;
  readonly value: CityOption;
  /** The word kept as the label (4.3: «الخبر» → value dammam, label «الخبر»); null = the chip label. */
  readonly label: string | null;
}

const OTHER_CITIES = [
  "الطائف", "أبها", "خميس مشيط", "تبوك", "بريدة", "عنيزة", "حائل", "جازان", "نجران", "الباحة", "سكاكا", "عرعر",
  "ينبع", "الجبيل", "الأحساء", "الهفوف", "القطيف", "الخرج", "حفر الباطن",
];

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
  { keyword: "الظهران", value: "dammam", label: "الظهران" },
  { keyword: "مكة", value: "makkah", label: null },
  { keyword: "مكة المكرمة", value: "makkah", label: null },
  { keyword: "المدينة المنورة", value: "madinah", label: null },
  { keyword: "المدينه", value: "madinah", label: null },
  ...OTHER_CITIES.map((city): CityEntry => ({ keyword: city, value: "other", label: city })),
];

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
export const VOCATIVE_WORDS = ["يا", "دليل"];

/**
 * A greeting that came WITH an answer or a question is returned before the reply (QA: «السلام عليكم، أنا من الطائف»
 * gets «وعليكم السلام.» first). Narrower than step 2's lists: «صباح» / «مساء» alone may be part of an answer.
 */
export const LEAD_SALAM = ["السلام عليكم", "سلام عليكم", "السلام"];
export const LEAD_OTHER = ["هلا", "هلا والله", "مرحبا", "مرحبتين", "أهلاً", "أهلين", "أهلا وسهلا", "صباح الخير", "مساء الخير", "hi", "hello", "hey"];

/** Filler words left out of an answer accepted as typed (4.5 second miss): «تخصصي فلسفة» keeps «فلسفة». */
export const FILLER_WORDS = [
  "أنا", "انا", "تخصصي", "تخصص", "درست", "أدرس", "من", "في", "مدينتي", "ساكن", "أسكن", "عايش", "مدينة",
  "السلام", "عليكم", "هلا", "مرحبا", "يا", "دليل",
];

// ── 4.4: acknowledgements; 4.5: special replies ────────────────────────────────────────────────────────────────────

export const QUESTION_NUMBER: Readonly<Record<QuestionId, 1 | 2 | 3 | 4 | 5 | 6>> = {
  city: 1,
  education: 2,
  major: 3,
  experience: 4,
  interest: 5,
  priority: 6,
};

export const ACK = {
  city: [
    (city: string): string => `حلو، ${city}. بحط لك فرصها في المقدمة.`,
    (city: string): string => `زين، ${city}. سجّلتها عشان أرتّب لك الوظائف القريبة منك.`,
    (city: string): string => `تمام، ${city}. وفيه بعد فرص عن بُعد لو تبي.`,
  ],
  cityNoJobs: (city: string): string =>
    `${city}، يا حيّ أهلها! ترى الفرص القريبة منك قليلة في البيانات التجريبية، فبضيف لك وظائف عن بُعد تناسبك.`,
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
  experience: {
    none: "ولا يهمك، كلنا بدينا من هنا. بختار لك وظائف تناسب البدايات.",
    under1: "بداية طيبة، وكل شهر خبرة ينحسب لك.",
    "1to3": "ما شاء الله، خبرة زينة. بدوّر لك على خطوة أعلى، مو بداية من الصفر.",
    over3: "ما شاء الله، خبرة تستاهل مسار يليق فيها.",
  } satisfies Record<ExperienceOption, string>,
  interest: {
    data: "الأرقام والبيانات، اختيار حلو. اللي يقرا الأرقام ينسمع رأيه.",
    software: "بناء المواقع والتطبيقات، ممتاز. وما أحلى إنك تبني شي يستخدمه الناس.",
    design: "التصميم والإبداع، حلو. العين اللي تلقط التفاصيل مطلوبة.",
    marketing: "التسويق والمحتوى، تمام. الكلمة الصح تفتح أبواب.",
    business: "تنظيم الأعمال والمشاريع، ممتاز. كل فريق يحتاج أحد يرتّب الطريق.",
    hr: "الشغل مع الناس وتطويرهم، حلو. هذا أثر يبقى.",
    unsure: "ولا يهمك، طبيعي ما تكون متأكد. بعتمد على تخصصك وخبرتك، وتقدر تغيّر الاتجاه متى ما بغيت.",
  } satisfies Record<InterestOption, string>,
  priority: {
    "first-job": "أول وظيفة، هدف واضح. بختار لك أقصر طريق لها.",
    switch: "تغيير المجال يبي له شجاعة، وأنت قدها. برسم لك جسر من مهاراتك الحالية.",
    grow: "قرار موفق، تتطوّر في مجالك وتبني على اللي عندك.",
    explore: "الاستكشاف بداية ذكية. بوريك ثلاث اتجاهات والاختيار لك.",
  } satisfies Record<PriorityOption, string>,
  /** The neutral value taken (a «لا أعرف» answer, or the second miss of the four other questions: 4.5). */
  neutral: (label: string): string => `ولا يهمك، نخليها «${label}» ونكمل.`,
} as const;

export const REPLY = {
  opening: (name: string): string => `هلا والله يا ${name}، أنا دليل، دليلك إلى وظيفتك. بكون معك من أول خطوة لآخرها.`,
  openingLead: "بسألك ست أسئلة قصيرة، وعلى ضوئها أرسم لك مسار يناسبك أنت.",
  /** Before question 1, in its own message so the first question stands out (19 Nov 2026). */
  openingAsk: "نبدأ بالسهل:",
  closing: (name: string): string => `يعطيك العافية يا ${name}، اكتملت الصورة. لحظات وأرسم لك مسارك.`,
  greetingSalam: "وعليكم السلام، حيّاك الله.",
  greetingOther: "هلا والله.",
  thanks: "العفو.",
  who: "أنا دليل، دليلك إلى وظيفتك. أسألك الحين عشان أرسم مسارك، وبعدها أكون معك في كل خطوة.",
  whyAsk: "أسأل عشان أختار لك من 20 وظيفة اللي يناسب مدينتك وتخصصك وخبرتك واللي تحبه. وترى إجاباتك تنحفظ في متصفحك.",
  /** 4.5 «بقي {n} فقط.» with its counted noun (spec "Counted nouns"): 1 singular, 2 dual, 3-10 plural, 11+ singular. */
  count: (n: number): string =>
    n === 1 ? "باقي سؤال واحد بس." : n === 2 ? "باقي سؤالين بس." : n <= 10 ? `باقي ${n} أسئلة بس.` : `باقي ${n} سؤال بس.`,
  /** Returned before the reply when a greeting came with an answer or a question (QA). */
  leadSalam: "وعليكم السلام.",
  leadOther: "هلا والله.",
  otherQuestion: "سؤال في محله، ونرجع له بعد ما نرسم مسارك.",
  unmapped: "سامحني، ما لقطتها زين. تقدر تختار من الخيارات تحت، أو تكتبها بطريقة ثانية.",
  /** «وسجّلت أيضاً: تخصصك تسويق، وبدون خبرة بعد.» (4.3: the extra answers confirmed in the acknowledgement). */
  alsoRecorded: (items: string): string => `وسجّلت بعد: ${items}.`,
} as const;
