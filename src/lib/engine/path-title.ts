// Owner: engine. 21 Nov 2026 (owner: «the path should be the path he asked for, don't link the path with the job; the jobs
// appear in the overview»): the path is a ROLE, named by the specialisation (track) of the job it is built on, never one
// company's posting title. «مطوّر OutSystems و .NET» at Masterworks is the back-end path «مطوّر واجهات خلفية»; the jobs
// themselves are listed in the overview (the map's «وظائف تناسبك»). The practice job keeps its own title («محلل بيانات»,
// the demo). A general track (a job no keyword places) keeps the job's title. Pure.
import { JOBS, getJob } from "@/lib/data";
import type { JobId } from "@/lib/types";

import { trackOf } from "./tracks";

/** The role a specialisation leads to (by track id), as a person would say it. */
const ROLE_OF_TRACK: Readonly<Record<string, string>> = {
  "data/science": "عالم بيانات",
  "data/engineering": "مهندس بيانات",
  "data/ai": "مهندس ذكاء اصطناعي وتعلّم آلة",
  "data/bi": "محلل ذكاء أعمال (BI)",
  "data/analysis": "محلل بيانات",
  "software/full-stack": "مطوّر متكامل (Full-stack)",
  "software/front-end": "مطوّر واجهات أمامية",
  "software/mobile": "مطوّر تطبيقات جوال",
  "software/qa": "مهندس ضمان جودة البرمجيات",
  "software/ai": "مهندس ذكاء اصطناعي",
  "software/cloud": "مهندس سحابة وDevOps",
  "software/back-end": "مطوّر واجهات خلفية",
  "design/ui-ux": "مصمم واجهات وتجربة مستخدم",
  "design/product": "مصمم منتجات",
  "design/graphic": "مصمم جرافيك",
  "marketing/social": "أخصائي تواصل اجتماعي",
  "marketing/content": "صانع وكاتب محتوى",
  "marketing/digital": "أخصائي تسويق رقمي",
  "business/accounting": "محاسب",
  "business/finance": "محلل مالي",
  "business/business-dev": "محلل وتطوير أعمال",
  "hr/recruitment": "أخصائي استقطاب مواهب",
  "hr/operations": "أخصائي عمليات موارد بشرية",
  "hr/analytics": "محلل موارد بشرية",
  "product/ai": "مدير منتجات ذكاء اصطناعي",
  "product/commerce": "مدير منتجات تجارة إلكترونية",
  "product/analytics": "محلل منتجات",
  "product/management": "مدير منتج",
  "cyber-cloud/security": "أخصائي أمن سيبراني",
  "cyber-cloud/cloud": "مهندس سحابة وDevOps",
  "cyber-cloud/support": "أخصائي دعم فني وحوكمة تقنية",
  "sales-supply/supply": "أخصائي مشتريات وسلاسل إمداد",
  "sales-supply/customer": "أخصائي خدمة ونجاح عملاء",
  "sales-supply/sales": "أخصائي مبيعات وتطوير أعمال",
  "engineering/quality-safety": "مهندس جودة وسلامة",
  "engineering/architecture": "مهندس معماري",
  "engineering/mep": "مهندس ميكانيكا وكهرباء",
  "engineering/civil": "مهندس مدني",
  "project-controls/planning-cost": "مهندس تخطيط ومراقبة تكاليف",
  "project-controls/contracts": "أخصائي عقود",
  "tourism-hospitality/events": "منسق فعاليات",
  "tourism-hospitality/guests": "أخصائي ضيافة وخدمة ضيوف",
  "health-admin/revenue": "أخصائي دورة إيرادات صحية",
  "health-admin/patients": "أخصائي خدمة مرضى",
  "education/instructional": "مصمم تعليمي",
  "education/training": "مدرب",
  "education/teaching": "معلم",
  "banking-risk/compliance": "أخصائي التزام ومكافحة احتيال",
  "banking-risk/audit": "مراجع وتدقيق",
  "banking-risk/credit": "محلل ائتمان",
  "legal/governance": "أخصائي حوكمة",
  "legal/coordination": "منسق قانوني",
  "legal/advisory": "مستشار قانوني",
  "media/creative": "مصمم إبداعي وموشن",
  "media/content": "صانع محتوى",
  "communications/government": "أخصائي علاقات حكومية",
  "communications/internal": "أخصائي اتصال مؤسسي",
  "communications/media": "أخصائي إعلام ومحتوى",
};

/** The path's name for the job it is built on: the role of its specialisation (the practice job keeps its own title). */
export function pathTitleOf(jobId: JobId): string {
  const job = getJob(jobId);
  if (!job.real) return job.title;
  return ROLE_OF_TRACK[trackOf(job).id] ?? job.title;
}

/** How many real postings in the data lead to the same role (the same specialisation): the overview lists them. */
export function jobsOnPath(jobId: JobId): number {
  const track = trackOf(getJob(jobId)).id;
  return JOBS.filter((j) => j.real && trackOf(j).id === track).length;
}
