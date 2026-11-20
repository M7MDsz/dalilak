// Owner: brain-advisor. The page chips of spec 5.8 (pure, client-safe): the panel shows them above the composer; the
// router executes their payloads (5.5 rule 1). A chip that would do nothing is left out (5.8).
// Imports: types, ids, data, copy, engine, text and protocol TYPES only; never @/lib/store/** (client-safe, no cycle).
import { courseState, jobMatch } from "@/lib/engine";
import type { Chip, ChipPayload, Clock, PageChipSlug, UserFacts } from "@/lib/types";
import type { PageContext } from "@/lib/brain/protocol";

function chip(slug: PageChipSlug, label: string, payload: ChipPayload = { intent: "page", slug }): Chip {
  return { slug, label, role: "chip", payload };
}

/**
 * The chips for this page. Payloads: `apply` → { intent: "apply", jobId }, `start-course` → { intent: "start_course",
 * courseId }, `set-target` → { intent: "set_target", jobId }, every other slug → { intent: "page", slug }. Role "chip".
 * `why-match` carries the live match in its label («لماذا مطابقتي 70%؟»).
 */
export function pageChips(page: PageContext, facts: UserFacts, clock: Clock): readonly Chip[] {
  void clock;
  switch (page.route) {
    case "path":
      return [
        chip("next-step", "وش أسوي الحين؟"),
        chip("why-path", "ليش ذا المسار؟"),
        chip("remaining", "كم باقي على هدفي؟"),
      ];
    case "skills":
      return [
        chip("skill-start", "أي مهارة أبدأ فيها؟"),
        chip("gap", "وش المهارات اللي تنقصني؟"),
        chip("stars-how", "كيف تنحسب النجوم؟"),
      ];
    case "cv":
      return [
        chip("cv-what", "وش تقرا في سيرتي؟"),
        chip("cv-none", "ما عندي سيرة جاهزة"),
        chip("stars-how", "كيف تتحدد مستويات المهارات؟"),
      ];
    case "jobs":
      return [
        chip("jobs-data-riyadh", "اعرض وظائف البيانات في الرياض"),
        chip("best-job", "وش أنسب وظيفة لي؟"),
        chip("jobs-remote", "وظائف عن بُعد"),
      ];
    case "job": {
      const jobId = page.jobId;
      if (!jobId) return [];
      const chips: Chip[] = [chip("why-match", `ليش مطابقتي ${jobMatch(jobId, facts)}%؟`)];
      if (!facts.applications.some((a) => a.jobId === jobId)) {
        chips.push(chip("apply", "قدّم لي على ذي الوظيفة", { intent: "apply", jobId }));
      }
      chips.push(chip("gap", "كيف أسدّ الفجوة؟"));
      if (facts.targetJobId !== jobId) chips.push(chip("set-target", "خلّها هدفي", { intent: "set_target", jobId }));
      return chips;
    }
    case "applications":
      return [chip("applications-status", "وش صار على طلباتي؟"), chip("next-step", "وش أسوي لين يجي الرد؟")];
    // «دليل التعلّم» and a step's guide (20 Nov 2026): the slugs and payloads stay, the words fit a guide.
    case "learn":
      return [
        chip("course-start", "وش خطوتي الجاية؟"),
        chip("courses-path", "خطوات مساري"),
        chip("courses-short", "أقصر الخطوات"),
      ];
    case "course": {
      const courseId = page.courseId;
      if (!courseId) return [];
      const chips: Chip[] = [chip("course-what", "وش في ذا الدليل؟")];
      // «ابدأ ذي الخطوة» only where it would start something (not locked, credited, completed or already started).
      if (courseState(courseId, facts).state === "available") {
        chips.push(chip("start-course", "ابدأ ذي الخطوة", { intent: "start_course", courseId }));
      }
      chips.push(chip("course-gain", "كم ترفع مطابقتي؟"));
      return chips;
    }
    case "leaderboard":
      return [chip("rank-how", "كيف أتقدّم في الترتيب؟"), chip("rank-gap", "كم بيني وبين المركز اللي فوقي؟")];
    case "profile":
      return [chip("badge-next", "كيف أحصل على شارة جديدة؟"), chip("level-how", "كيف أرفع مستواي؟")];
  }
}
