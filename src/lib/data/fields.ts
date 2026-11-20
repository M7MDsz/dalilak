// Owner: data. The seven fields of spec 9.1, in display order (tree, filters, CV results). Pure module.
import type { Field, FieldId } from "@/lib/types";

/** The seven fields of spec 9.1, in display order (data, software, design, marketing, business, hr, professional). */
export const FIELDS: readonly Field[] = [
  { id: "data", name: "البيانات والتحليل", hasJobs: true },
  { id: "software", name: "تطوير البرمجيات", hasJobs: true },
  { id: "design", name: "التصميم وتجربة المستخدم", hasJobs: true },
  { id: "marketing", name: "التسويق الرقمي", hasJobs: true },
  { id: "business", name: "الأعمال والمشاريع", hasJobs: true },
  { id: "hr", name: "الموارد البشرية", hasJobs: true },
  { id: "professional", name: "المهارات المهنية", hasJobs: false },
];

export function getField(id: FieldId): Field {
  const field = FIELDS.find((f) => f.id === id);
  if (!field) throw new Error(`data: unknown field ${id}`);
  return field;
}
