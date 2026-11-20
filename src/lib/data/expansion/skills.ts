// Owner: data (expansion agent, 20 Nov 2026). The new fields and skills of the expansion (product management, cyber
// security and cloud, AI engineering, sales and customer success, supply chain and procurement). Wired in: their ids are
// in src/lib/ids.ts and ../skills.ts merges EXPANSION_SKILLS into SKILLS (SKILL_IDS order); ./expansion.test.ts checks them.
//
// Rules kept (the same as src/lib/data/skills.ts): prerequisites stay inside the skill's field and are satisfied by one
// star; no new skill is a prerequisite of a data-field skill (deep-learning only DEPENDS on ml); aliases are distinctive
// names or phrases in Arabic and English, never a bare word of the 9.2 list, never an alias of another skill (old or
// new), never a phrase of the sample CV (it must still return exactly its eight skills), and never a level word of the
// CV analyser («متقدم», «خبير», «advanced» …). Skill order inside a field follows the published guidelines named in
// knowledge.ts (`path.basedOnLinks`). Pure module.
//
import type { FieldId, Skill, SkillId } from "@/lib/types";

/**
 * The three new fields, in display order after hr. Sales and supply chain have their own field so each skill tree keeps
 * at most three skills per row and the business field stays exactly as it was.
 */
export const EXPANSION_FIELD_IDS = ["product", "cyber-cloud", "sales-supply"] as const;
export type ExpansionFieldId = (typeof EXPANSION_FIELD_IDS)[number];
export type AnyFieldId = FieldId | ExpansionFieldId;

/** The 16 new skills, grouped by field and, inside a field, in roadmap order. */
export const EXPANSION_SKILL_IDS = [
  // product
  "product-discovery", "product-roadmap", "product-specs", "product-analytics",
  // cyber-cloud
  "linux", "networking", "security-fundamentals", "soc-analysis", "cloud", "devops",
  // data (existing field)
  "deep-learning",
  // software (existing field)
  "llm-apps",
  // sales-supply
  "sales", "customer-success", "procurement", "supply-chain",
] as const;
export type ExpansionSkillId = (typeof EXPANSION_SKILL_IDS)[number];
export type AnySkillId = SkillId | ExpansionSkillId;

/** `Field` with the new ids (until FieldId has them). */
export interface ExpansionField {
  readonly id: ExpansionFieldId;
  readonly name: string;
  readonly hasJobs: boolean;
}

/** `Skill` with the new ids (until SkillId / FieldId have them). */
export interface ExpansionSkill extends Omit<Skill, "id" | "field" | "prereqs"> {
  readonly id: ExpansionSkillId;
  readonly field: AnyFieldId;
  readonly prereqs: readonly AnySkillId[];
}

export const EXPANSION_FIELDS: readonly ExpansionField[] = [
  { id: "product", name: "إدارة المنتجات", hasJobs: true },
  { id: "cyber-cloud", name: "الأمن السيبراني والسحابة", hasJobs: true },
  { id: "sales-supply", name: "المبيعات وسلاسل الإمداد", hasJobs: true },
];

export const EXPANSION_SKILLS: readonly ExpansionSkill[] = [
  // ── product «إدارة المنتجات» (roadmap.sh/product-manager, Pragmatic Framework, Scrum Guide 2020) ────────
  {
    id: "product-discovery",
    name: "اكتشاف المنتج",
    field: "product",
    maxStars: 1,
    prereqs: [],
    description: "فهم مشكلة العميل والتحقق من الفكرة بتجارب صغيرة قبل بنائها.",
    aliases: ["اكتشاف المنتج", "اكتشاف العملاء", "التحقق من الفكرة", "product discovery", "customer discovery", "JTBD"],
  },
  {
    id: "product-roadmap",
    name: "خارطة الطريق والأولويات",
    field: "product",
    maxStars: 2,
    prereqs: ["product-discovery"],
    description: "رسم رؤية المنتج وترتيب أولوياته وخارطة طريقه بأطر واضحة.",
    aliases: ["خارطة طريق المنتج", "خارطة الطريق", "استراتيجية المنتج", "product roadmap", "product strategy", "OKRs"],
  },
  {
    id: "product-specs",
    name: "متطلبات المنتج (PRD)",
    field: "product",
    maxStars: 1,
    prereqs: ["product-discovery"],
    description: "كتابة وثيقة المتطلبات وقصص المستخدم ومعايير القبول التي يبني منها الفريق.",
    aliases: [
      "متطلبات المنتج",
      "وثيقة متطلبات المنتج",
      "معايير القبول",
      "PRD",
      "product requirements",
      "acceptance criteria",
      "product backlog",
    ],
  },
  {
    id: "product-analytics",
    name: "تحليلات المنتج",
    field: "product",
    maxStars: 1,
    prereqs: [],
    description: "قياس استخدام المنتج ومؤشراته وتجارب A/B لتقرّر بالأرقام.",
    aliases: ["تحليلات المنتج", "مقاييس المنتج", "product analytics", "product metrics", "Mixpanel", "Amplitude"],
  },

  // ── cyber-cloud «الأمن السيبراني والسحابة» (roadmap.sh cyber-security and devops: OS, then networking) ──────────────
  {
    id: "linux",
    name: "Linux وسطر الأوامر",
    field: "cyber-cloud",
    maxStars: 1,
    prereqs: [],
    description: "التعامل مع خوادم Linux من سطر الأوامر: الملفات والصلاحيات والسكربتات.",
    aliases: ["Linux", "لينكس", "Ubuntu", "Bash", "سطر الأوامر", "shell scripting"],
  },
  {
    id: "networking",
    name: "أساسيات الشبكات",
    field: "cyber-cloud",
    maxStars: 1,
    prereqs: [],
    description: "كيف تتصل الأجهزة: نموذج OSI و TCP/IP والعناوين و DNS.",
    aliases: ["شبكات الحاسب", "شبكات الحاسوب", "أساسيات الشبكات", "computer networking", "CCNA", "Network+", "TCP/IP"],
  },
  {
    id: "security-fundamentals",
    name: "أساسيات الأمن السيبراني",
    field: "cyber-cloud",
    maxStars: 2,
    prereqs: ["networking"],
    description: "التهديدات وضوابط الحماية والهويات والتشفير، ثم الحوكمة والامتثال.",
    aliases: [
      "الأمن السيبراني",
      "أمن المعلومات",
      "cybersecurity",
      "cyber security",
      "information security",
      "Security+",
      "ISO 27001",
    ],
  },
  {
    id: "soc-analysis",
    name: "مراقبة الأمن والاستجابة للحوادث",
    field: "cyber-cloud",
    maxStars: 1,
    prereqs: ["security-fundamentals", "linux"],
    description: "رصد التنبيهات في SIEM وتحليل السجلات والاستجابة للحوادث الأمنية.",
    aliases: ["مركز العمليات الأمنية", "الاستجابة للحوادث", "SOC", "SIEM", "Splunk", "QRadar", "incident response"],
  },
  {
    id: "cloud",
    name: "الحوسبة السحابية",
    field: "cyber-cloud",
    maxStars: 2,
    prereqs: ["networking"],
    description: "خدمات السحابة الأساسية في AWS و Azure، ثم تصميم بنية عليها.",
    aliases: ["الحوسبة السحابية", "cloud computing", "AWS", "Azure", "Google Cloud", "GCP"],
  },
  {
    id: "devops",
    name: "DevOps والحاويات",
    field: "cyber-cloud",
    maxStars: 1,
    prereqs: ["linux", "cloud"],
    description: "أتمتة البناء والنشر بالحاويات وخطوط CI/CD والبنية ككود.",
    aliases: ["DevOps", "الحاويات", "Docker", "Kubernetes", "CI/CD", "Terraform", "Jenkins"],
  },

  // ── data (existing field): after ml, never before a data skill ──────────────────────────────────────────────────────
  {
    id: "deep-learning",
    name: "التعلّم العميق",
    field: "data",
    maxStars: 1,
    prereqs: ["ml"],
    description: "الشبكات العصبية لتمييز الصور وفهم النصوص، بمكتبات مثل PyTorch.",
    aliases: ["التعلّم العميق", "التعلم العميق", "الشبكات العصبية", "deep learning", "neural networks", "PyTorch", "TensorFlow"],
  },

  // ── software (existing field) ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: "llm-apps",
    name: "تطبيقات الذكاء الاصطناعي التوليدي",
    field: "software",
    maxStars: 1,
    prereqs: ["programming", "apis"],
    description: "بناء تطبيقات على النماذج اللغوية الكبيرة: الأوامر و RAG والتقييم.",
    aliases: [
      "الذكاء الاصطناعي التوليدي",
      "نماذج اللغة الكبيرة",
      "هندسة الأوامر",
      "generative AI",
      "LLM",
      "LLMs",
      "RAG",
      "LangChain",
      "prompt engineering",
    ],
  },

  // ── sales-supply «المبيعات وسلاسل الإمداد» (HubSpot Inbound Sales; CIPS L2: procurement first, inventory and logistics last)
  {
    id: "sales",
    name: "المبيعات وإدارة علاقات العملاء",
    field: "sales-supply",
    maxStars: 2,
    prereqs: [],
    description: "البحث عن العملاء والتفاوض وإغلاق الصفقات ومتابعتها في نظام CRM.",
    aliases: [
      "مهارات البيع",
      "مندوب مبيعات",
      "تطوير الأعمال",
      "إدارة علاقات العملاء",
      "التفاوض",
      "CRM",
      "Salesforce",
      "HubSpot",
      "business development",
      "negotiation",
    ],
  },
  {
    id: "customer-success",
    name: "نجاح العملاء",
    field: "sales-supply",
    maxStars: 1,
    prereqs: ["sales"],
    description: "تهيئة العملاء الجدد ومتابعتهم ليستفيدوا ويبقوا، وحل مشاكلهم.",
    aliases: ["نجاح العملاء", "خدمة العملاء", "دعم العملاء", "customer success", "customer service", "account management", "Zendesk"],
  },
  {
    id: "procurement",
    name: "المشتريات والتوريد",
    field: "sales-supply",
    maxStars: 1,
    prereqs: [],
    description: "طلب العروض واختيار الموردين والتفاوض والعقود، ومنصة اعتماد الحكومية.",
    aliases: ["المشتريات", "المناقصات", "إدارة الموردين", "منصة اعتماد", "procurement", "sourcing", "Etimad", "SAP Ariba"],
  },
  {
    id: "supply-chain",
    name: "سلاسل الإمداد",
    field: "sales-supply",
    maxStars: 2,
    prereqs: ["procurement"],
    description: "تخطيط الطلب والمخزون والنقل حتى يصل المنتج في وقته وبتكلفة أقل.",
    aliases: [
      "سلاسل الإمداد",
      "سلسلة الإمداد",
      "سلاسل التوريد",
      "اللوجستيات",
      "تخطيط الطلب",
      "supply chain",
      "logistics",
      "demand planning",
    ],
  },
];

export function getExpansionSkill(id: ExpansionSkillId): ExpansionSkill {
  const skill = EXPANSION_SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`data: unknown expansion skill ${id}`);
  return skill;
}
