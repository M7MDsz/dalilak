// Owner: data. The fields of spec 9.1 and the two of the 20 Nov 2026 expansion, in display order (tree, filters, CV
// results). Pure module.
import type { Field, FieldId } from "@/lib/types";

import { WAVE2_FIELDS } from "./wave2/skills";
import { WAVE3_FIELDS } from "./wave3/skills";

/**
 * Display order: data, software, design, marketing, business, hr, product, cyber-cloud, sales-supply, the nine of wave 2
 * (./wave2/skills.ts: engineering … gaming), the four of wave 3 (./wave3/skills.ts: energy-sustainability, real-estate,
 * aviation, communications), professional.
 */
export const FIELDS: readonly Field[] = [
  { id: "data", name: "البيانات والتحليل", hasJobs: true },
  { id: "software", name: "تطوير البرمجيات", hasJobs: true },
  { id: "design", name: "التصميم وتجربة المستخدم", hasJobs: true },
  { id: "marketing", name: "التسويق الرقمي", hasJobs: true },
  { id: "business", name: "الأعمال والمشاريع", hasJobs: true },
  { id: "hr", name: "الموارد البشرية", hasJobs: true },
  // the 20 Nov 2026 expansion (./expansion/skills.ts)
  { id: "product", name: "إدارة المنتجات", hasJobs: true },
  { id: "cyber-cloud", name: "الأمن السيبراني والسحابة", hasJobs: true },
  { id: "sales-supply", name: "المبيعات وسلاسل الإمداد", hasJobs: true },
  // wave 2 (./wave2/skills.ts)
  ...WAVE2_FIELDS,
  // wave 3 (./wave3/skills.ts)
  ...WAVE3_FIELDS,
  { id: "professional", name: "المهارات المهنية", hasJobs: false },
];

export function getField(id: FieldId): Field {
  const field = FIELDS.find((f) => f.id === id);
  if (!field) throw new Error(`data: unknown field ${id}`);
  return field;
}
