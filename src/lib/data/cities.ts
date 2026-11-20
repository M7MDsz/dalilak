// Owner: data. The job cities of spec 9.3 and their labels, in the order of the jobs city filter (3.7). Pure module.
import type { JobCity, JobCityId } from "@/lib/types";

/** riyadh «الرياض» · jeddah «جدة» · dammam «الدمام» · remote «عن بُعد», in this order (the jobs city filter, 3.7). */
export const JOB_CITIES: readonly JobCity[] = [
  { id: "riyadh", name: "الرياض" },
  { id: "jeddah", name: "جدة" },
  { id: "dammam", name: "الدمام" },
  { id: "remote", name: "عن بُعد" },
];

export function getJobCity(id: JobCityId): JobCity {
  const city = JOB_CITIES.find((c) => c.id === id);
  if (!city) throw new Error(`data: unknown city ${id}`);
  return city;
}
