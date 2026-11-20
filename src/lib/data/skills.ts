// Owner: data. The 38 skills of spec 9.2 (and, merged at the bottom, the 16 of the 20 Nov 2026 expansion in
// ./expansion/skills.ts, written to the same rules and checked by ./expansion/expansion.test.ts), in table order (which is also the order inside each field): name, field, star
// slots, prerequisites (always inside the same field, each satisfied by one star), a one-line description for the
// skill panel (under 15 words) and the aliases the CV analyser looks for (spec 6.5 step 5).
//
// Aliases. The fifteen lists of the 9.2 table ("aliases the demo depends on") are copied exactly and nothing is added
// to them. The other 23 are written to the same rules: a distinctive name or phrase in Arabic and in English, never a
// bare word of the 9.2 list (تحليل، بيانات، تصميم، مشروع، إدارة، كتابة، تقارير، تطوير، تدريب، مبيعات، نظام، عرض، تقديم،
// عمل، فريق), never a phrase that occurs in the sample CV (it must return exactly its eight skills, 6.2), and no alias
// in two skills. data.test.ts checks all of this. Pure module.
import { SKILL_IDS } from "@/lib/ids";
import type { Skill, SkillId } from "@/lib/types";

import { EXPANSION_SKILLS } from "./expansion/skills";
import { WAVE2_SKILLS } from "./wave2/skills";

/** The 38 skills of spec 9.2. */
const SPEC_SKILLS: readonly Skill[] = [
  // ── data «البيانات والتحليل» ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: "excel",
    name: "Excel",
    field: "data",
    maxStars: 3,
    prereqs: [],
    description: "جداول البيانات والمعادلات والجداول المحورية لترتيب الأرقام وتحليلها.",
    aliases: ["Excel", "إكسل", "اكسل", "الجداول المحورية", "Pivot"],
  },
  {
    id: "sql",
    name: "SQL",
    field: "data",
    maxStars: 3,
    prereqs: ["excel"],
    description: "لغة الاستعلام عن قواعد البيانات واستخراج ما تحتاجه منها.",
    aliases: ["SQL", "MySQL", "PostgreSQL", "قاعدة بيانات", "قواعد البيانات", "استعلامات"],
  },
  {
    id: "statistics",
    name: "الإحصاء",
    field: "data",
    maxStars: 2,
    prereqs: ["excel"],
    description: "وصف البيانات وقراءة اتجاهاتها والاستنتاج منها بثقة.",
    aliases: ["الإحصاء", "إحصاء", "إحصائي", "statistics", "SPSS"],
  },
  {
    id: "powerbi",
    name: "Power BI",
    field: "data",
    maxStars: 3,
    prereqs: ["excel"],
    description: "بناء تقارير ولوحات معلومات تفاعلية من مصادر بيانات متعددة.",
    aliases: ["Power BI", "PowerBI", "باور بي آي"],
  },
  {
    id: "dataviz",
    name: "تصوير البيانات",
    field: "data",
    maxStars: 1,
    prereqs: ["powerbi"],
    description: "اختيار الرسم المناسب ليفهم الآخرون الأرقام من النظرة الأولى.",
    aliases: ["تصوير البيانات", "لوحة معلومات", "لوحات المعلومات", "رسوم بيانية", "dashboard", "Tableau"],
  },
  {
    id: "python-data",
    name: "تحليل البيانات بـ Python",
    field: "data",
    maxStars: 1,
    prereqs: ["sql", "statistics"],
    description: "تنظيف البيانات وتحليلها ورسمها بلغة Python ومكتباتها.",
    aliases: ["pandas", "NumPy", "تحليل البيانات بـ Python"],
  },
  {
    id: "ml",
    name: "تعلّم الآلة",
    field: "data",
    maxStars: 1,
    prereqs: ["python-data"],
    description: "بناء نماذج تتعلّم من البيانات لتتنبأ أو تصنّف.",
    aliases: ["تعلّم الآلة", "التعلم الآلي", "نماذج التنبؤ", "machine learning", "scikit-learn"],
  },

  // ── software «تطوير البرمجيات» ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "programming",
    name: "أساسيات البرمجة",
    field: "software",
    maxStars: 2,
    prereqs: [],
    description: "التفكير البرمجي وكتابة برامج صغيرة، من المتغيرات إلى الدوال.",
    aliases: ["البرمجة", "برمجة", "Python", "بايثون", "Java", "C++", "C#"],
  },
  {
    id: "html-css",
    name: "HTML و CSS",
    field: "software",
    maxStars: 1,
    prereqs: [],
    description: "بناء هيكل صفحات الويب وتنسيقها لتظهر جيداً على كل شاشة.",
    aliases: ["HTML", "CSS", "HTML5", "CSS3", "Bootstrap", "Tailwind", "صفحات الويب"],
  },
  {
    id: "git",
    name: "Git",
    field: "software",
    maxStars: 1,
    prereqs: [],
    description: "حفظ نسخ الكود وتتبّع تغييراته والعمل عليه مع الزملاء.",
    aliases: ["Git", "GitHub", "GitLab", "إدارة النسخ", "التحكم بالإصدارات", "version control"],
  },
  {
    id: "javascript",
    name: "JavaScript",
    field: "software",
    maxStars: 3,
    prereqs: ["html-css"],
    description: "لغة الويب التي تجعل الصفحات تفاعلية وتتعامل مع البيانات.",
    aliases: ["JavaScript", "جافاسكربت", "جافا سكريبت", "TypeScript", "ES6", "jQuery"],
  },
  {
    id: "react",
    name: "React",
    field: "software",
    maxStars: 1,
    prereqs: ["javascript"],
    description: "بناء واجهات الويب من مكوّنات قابلة لإعادة الاستخدام.",
    aliases: ["React", "React.js", "ReactJS", "رياكت", "Next.js"],
  },
  {
    id: "apis",
    name: "واجهات API",
    field: "software",
    maxStars: 1,
    prereqs: ["programming", "git"],
    description: "تصميم الخدمات التي تتبادل بها التطبيقات البيانات، وربطها بقواعدها.",
    aliases: ["API", "APIs", "REST", "RESTful", "GraphQL", "واجهات API", "واجهات برمجة التطبيقات"],
  },

  // ── design «التصميم وتجربة المستخدم» ──────────────────────────────────────────────────────────────────────────────
  {
    id: "design-basics",
    name: "أساسيات التصميم",
    field: "design",
    maxStars: 1,
    prereqs: [],
    description: "اللون والخط والتكوين: قواعد تجعل أي تصميم واضحاً ومتوازناً.",
    aliases: ["أساسيات التصميم", "نظرية الألوان", "التصميم الجرافيكي", "graphic design", "Photoshop", "Illustrator"],
  },
  {
    id: "figma",
    name: "Figma",
    field: "design",
    maxStars: 3,
    prereqs: ["design-basics"],
    description: "أداة لتصميم الواجهات ومكوّناتها والتعاون عليها مع الزملاء.",
    aliases: ["Figma", "فيجما", "فيغما"],
  },
  {
    id: "ux-research",
    name: "بحث المستخدم",
    field: "design",
    maxStars: 1,
    prereqs: [],
    description: "فهم المستخدمين بالمقابلات واختبارات الاستخدام قبل التصميم وبعده.",
    aliases: [
      "بحث المستخدم",
      "أبحاث المستخدمين",
      "مقابلات المستخدمين",
      "اختبارات الاستخدام",
      "تجربة المستخدم",
      "user research",
      "usability testing",
      "UX research",
    ],
  },
  {
    id: "ui-design",
    name: "تصميم الواجهات",
    field: "design",
    maxStars: 2,
    prereqs: ["figma"],
    description: "تصميم شاشات تطبيقات ومواقع واضحة وسهلة الاستخدام.",
    aliases: ["تصميم الواجهات", "تصميم واجهات", "واجهات المستخدم", "UI design", "user interface", "Adobe XD"],
  },
  {
    id: "prototyping",
    name: "النماذج التفاعلية",
    field: "design",
    maxStars: 1,
    prereqs: ["figma"],
    description: "تحويل التصاميم إلى نماذج قابلة للتجربة قبل تطويرها.",
    aliases: ["النماذج التفاعلية", "نموذج تفاعلي", "النماذج الأولية", "prototype", "prototyping", "wireframe", "wireframes"],
  },

  // ── marketing «التسويق الرقمي» ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "marketing-basics",
    name: "أساسيات التسويق",
    field: "marketing",
    maxStars: 1,
    prereqs: [],
    description: "مبادئ التسويق الرقمي: الجمهور والقنوات والرسالة وقياس النتائج.",
    aliases: ["أساسيات التسويق", "التسويق", "التسويق الرقمي", "التسويق الإلكتروني", "digital marketing", "marketing"],
  },
  {
    id: "content",
    name: "كتابة المحتوى",
    field: "marketing",
    maxStars: 2,
    prereqs: ["marketing-basics"],
    description: "نصوص تسويقية ومقالات تخاطب الجمهور وتحقق هدفاً واضحاً.",
    aliases: ["كتابة المحتوى", "صناعة المحتوى", "copywriting"],
  },
  {
    id: "social-media",
    name: "إدارة وسائل التواصل",
    field: "marketing",
    maxStars: 2,
    prereqs: ["marketing-basics"],
    description: "إدارة حسابات العلامة على منصات التواصل وبناء جمهورها.",
    aliases: ["التواصل الاجتماعي", "وسائل التواصل", "social media"],
  },
  {
    id: "seo",
    name: "تحسين محركات البحث (SEO)",
    field: "marketing",
    maxStars: 1,
    prereqs: ["content"],
    description: "تحسين المحتوى والمواقع لتظهر في نتائج محركات البحث.",
    aliases: ["SEO", "تحسين محركات البحث", "السيو", "search engine optimization"],
  },
  {
    id: "ads",
    name: "الإعلانات المدفوعة",
    field: "marketing",
    maxStars: 1,
    prereqs: ["marketing-basics"],
    description: "إعداد الحملات الإعلانية المدفوعة واستهدافها وقياس عائدها.",
    aliases: ["الإعلانات المدفوعة", "إعلانات مدفوعة", "الحملات الإعلانية", "Google Ads", "Meta Ads", "PPC", "paid ads"],
  },

  // ── business «الأعمال والمشاريع» ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "project-management",
    name: "إدارة المشاريع",
    field: "business",
    maxStars: 2,
    prereqs: [],
    description: "تخطيط المشاريع وتوزيع مهامها ومتابعة وقتها ومخاطرها حتى التسليم.",
    aliases: ["إدارة المشاريع", "إدارة مشروع", "PMP"],
  },
  {
    id: "accounting",
    name: "المحاسبة",
    field: "business",
    maxStars: 1,
    prereqs: [],
    description: "القيود والقوائم المالية الأساسية، لفهم أرقام أي منشأة.",
    aliases: ["المحاسبة", "محاسب", "القيود المحاسبية", "accounting", "bookkeeping"],
  },
  {
    id: "agile",
    name: "Agile",
    field: "business",
    maxStars: 1,
    prereqs: ["project-management"],
    description: "العمل بدورات قصيرة متكررة تسلّم قيمة وتتكيّف مع التغيير.",
    aliases: ["Agile", "Scrum", "Kanban", "سكرم", "أجايل", "المنهجية الرشيقة"],
  },
  {
    id: "business-analysis",
    name: "تحليل الأعمال",
    field: "business",
    maxStars: 1,
    prereqs: [],
    description: "فهم احتياجات العمل وتحويلها إلى متطلبات واضحة قابلة للتنفيذ.",
    aliases: ["تحليل الأعمال", "محلل أعمال", "جمع المتطلبات", "business analysis", "BPMN", "user stories"],
  },
  {
    id: "financial-analysis",
    name: "التحليل المالي",
    field: "business",
    maxStars: 2,
    prereqs: ["accounting"],
    description: "قراءة القوائم المالية وحساب النسب وبناء التوقعات.",
    aliases: [
      "التحليل المالي",
      "تحليل مالي",
      "القوائم المالية",
      "النسب المالية",
      "النمذجة المالية",
      "financial analysis",
      "financial modeling",
    ],
  },

  // ── hr «الموارد البشرية» ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "hr-basics",
    name: "أساسيات الموارد البشرية",
    field: "hr",
    maxStars: 2,
    prereqs: [],
    description: "وظائف الموارد البشرية وسياساتها ودورة حياة الموظف في المنشأة.",
    aliases: ["الموارد البشرية", "شؤون الموظفين", "human resources", "HR"],
  },
  {
    id: "recruitment",
    name: "الاستقطاب والتوظيف",
    field: "hr",
    maxStars: 2,
    prereqs: ["hr-basics"],
    description: "جذب المرشحين وفرزهم ومقابلتهم حتى اختيار الأنسب.",
    aliases: ["الاستقطاب", "التوظيف", "استقطاب المواهب", "المقابلات الوظيفية", "recruitment", "recruiting", "talent acquisition"],
  },
  {
    id: "labor-law",
    name: "أنظمة العمل",
    field: "hr",
    maxStars: 1,
    prereqs: ["hr-basics"],
    description: "العقود وساعات العمل والإجازات وحقوق الموظف والمنشأة في نظام العمل.",
    aliases: ["أنظمة العمل", "نظام العمل", "قانون العمل", "labor law", "labour law"],
  },
  {
    id: "training-dev",
    name: "التدريب والتطوير",
    field: "hr",
    maxStars: 1,
    prereqs: ["hr-basics"],
    description: "تحديد احتياجات التدريب وتصميم برامجه وقياس أثرها.",
    aliases: ["التدريب والتطوير", "البرامج التدريبية", "تطوير الموظفين"],
  },
  {
    id: "payroll",
    name: "الرواتب والمزايا",
    field: "hr",
    maxStars: 1,
    prereqs: ["labor-law"],
    description: "إعداد مسيّرات الرواتب وإدارة البدلات والمزايا بدقة.",
    aliases: ["الرواتب والمزايا", "مسيرات الرواتب", "الرواتب", "التعويضات والمزايا", "payroll"],
  },

  // ── professional «المهارات المهنية» ───────────────────────────────────────────────────────────────────────────────
  {
    id: "communication",
    name: "التواصل الفعّال",
    field: "professional",
    maxStars: 2,
    prereqs: [],
    description: "إيصال الفكرة بوضوح، والإصغاء، والكتابة المهنية في بيئة العمل.",
    aliases: ["التواصل", "مهارات الاتصال", "communication"],
  },
  {
    id: "english",
    name: "الإنجليزية المهنية",
    field: "professional",
    maxStars: 2,
    prereqs: [],
    description: "الإنجليزية المستخدمة في المراسلات والاجتماعات والتقارير المهنية.",
    aliases: ["الإنجليزية", "الانجليزية", "English", "IELTS", "TOEFL"],
  },
  {
    id: "problem-solving",
    name: "حل المشكلات",
    field: "professional",
    maxStars: 1,
    prereqs: [],
    description: "تحليل المشكلة إلى أسبابها واختيار الحل الأنسب بمنهجية.",
    aliases: [
      "حل المشكلات",
      "حل المشاكل",
      "التفكير النقدي",
      "التفكير التحليلي",
      "اتخاذ القرار",
      "problem solving",
      "critical thinking",
    ],
  },
  {
    id: "presentation",
    name: "العرض والتقديم",
    field: "professional",
    maxStars: 1,
    prereqs: ["communication"],
    description: "عرض الأفكار والنتائج أمام الآخرين بوضوح وثقة.",
    aliases: ["العرض والتقديم", "مهارات العرض", "الإلقاء", "عروض تقديمية", "PowerPoint"],
  },
  {
    id: "teamwork",
    name: "العمل الجماعي",
    field: "professional",
    maxStars: 1,
    prereqs: ["communication"],
    description: "التعاون مع الزملاء وتوزيع المهام وتنظيم الوقت لإنجاز مشترك.",
    aliases: ["العمل الجماعي", "العمل ضمن فريق", "روح الفريق", "teamwork"],
  },
];

/** Every skill (the 38 of spec 9.2, the expansion's 16 and wave 2's 39 in ./wave2/skills.ts), in SKILL_IDS order. */
export const SKILLS: readonly Skill[] = [...SPEC_SKILLS, ...EXPANSION_SKILLS, ...WAVE2_SKILLS].sort(
  (a, b) => SKILL_IDS.indexOf(a.id) - SKILL_IDS.indexOf(b.id),
);

export function getSkill(id: SkillId): Skill {
  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) throw new Error(`data: unknown skill ${id}`);
  return skill;
}
