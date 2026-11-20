// Owner: advisor. The action receipt: a one-line record, in the thread, of what «دليلك» did on the site (opened a page,
// started a learning step, changed the target, filled and sent an application). It sits above the reply's words, so the order
// on screen is the order of events: the page changed (the receipt), then «دليلك» speaks (the text).
//
// The persisted AdvisorMessage has no field for it (src/lib/types.ts is frozen), so the receipt rides in the message id,
// which the panel owns (ARCHITECTURE 5.1: "advisor messages get their id from the panel"): `d-<time>-<n>~<encoded ref>`.
// The part before "~" is the message's stable key (the pending row and the answer share it, so React keeps one row).
// Records are written in the verbal-noun form of a task log («فتح طلباتك», «بدء خطوة Power BI»), so they never repeat
// the reply's own sentence («تفضّل، فتحت لك طلباتك.»). Since 20 Nov 2026 a course is a learning step shown as its
// skill's guide: a record names the skill («فتح «دليل Power BI»»), never the internal course title.
import type { ReactNode } from "react";
import { createElement } from "react";

import {
  IconApplications,
  IconCourses,
  IconCv,
  IconJobs,
  IconLeaderboard,
  IconPath,
  IconProfile,
  IconSend,
  IconSkills,
  IconTarget,
} from "@/components/icons";
import { guideTitle, stepName } from "@/lib/copy";
import { getJob } from "@/lib/data";
import { isCourseId, isJobId } from "@/lib/ids";
import { hrefFor } from "@/lib/routes";
import type { AdvisorAction } from "@/lib/brain/protocol";
import type { CourseId, JobId, NavTarget } from "@/lib/types";

/** What a receipt records. Kept small: it is serialised into the message id. */
export type ReceiptRef =
  | { readonly k: "go"; readonly to: NavTarget }
  | { readonly k: "start"; readonly c: CourseId }
  | { readonly k: "target"; readonly j: JobId }
  | { readonly k: "apply"; readonly j: JobId };

export function receiptFor(action: AdvisorAction): ReceiptRef {
  switch (action.type) {
    case "navigate":
      return { k: "go", to: action.to };
    case "start_course":
      return { k: "start", c: action.courseId };
    case "set_target":
      return { k: "target", j: action.jobId };
    case "apply":
      return { k: "apply", j: action.jobId };
  }
}

const SEP = "~";

/** The stable key of a message: its id without the receipt part. */
export function baseId(id: string): string {
  const at = id.indexOf(SEP);
  return at < 0 ? id : id.slice(0, at);
}

export function withReceipt(id: string, ref: ReceiptRef | null): string {
  return ref ? `${baseId(id)}${SEP}${encodeURIComponent(JSON.stringify(ref))}` : baseId(id);
}

const NAV_SCREENS = new Set(["path", "skills", "cv", "jobs", "job", "applications", "learn", "course", "leaderboard", "profile"]);

function isNavTarget(value: unknown): value is NavTarget {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { screen?: unknown; jobId?: unknown; courseId?: unknown };
  if (typeof v.screen !== "string" || !NAV_SCREENS.has(v.screen)) return false;
  if (v.screen === "job") return isJobId(v.jobId);
  if (v.screen === "course") return isCourseId(v.courseId);
  return true;
}

/** The receipt a saved message carries, or null (a plain reply, or an id that does not parse). */
export function receiptOf(id: string): ReceiptRef | null {
  const at = id.indexOf(SEP);
  if (at < 0) return null;
  try {
    const raw: unknown = JSON.parse(decodeURIComponent(id.slice(at + 1)));
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as { k?: unknown; to?: unknown; c?: unknown; j?: unknown };
    if (r.k === "go" && isNavTarget(r.to)) return { k: "go", to: r.to };
    if (r.k === "start" && isCourseId(r.c)) return { k: "start", c: r.c };
    if ((r.k === "target" || r.k === "apply") && isJobId(r.j)) return { k: r.k, j: r.j };
    return null;
  } catch {
    return null;
  }
}

const quoted = (text: string) => `«${text}»`;

function openedText(to: NavTarget): string {
  switch (to.screen) {
    case "path":
      return "فتح مسارك";
    case "skills":
      return "فتح شجرة المهارات";
    case "cv":
      return "فتح صفحة السيرة";
    case "jobs":
      return "فتح قائمة الوظائف";
    case "job":
      return `فتح وظيفة ${quoted(getJob(to.jobId).title)}`;
    case "applications":
      return "فتح طلباتك";
    case "learn":
      return "فتح دليل التعلّم";
    case "course":
      return `فتح ${quoted(guideTitle(to.courseId))}`;
    case "leaderboard":
      return "فتح صفحة المتصدرين";
    case "profile":
      return "فتح ملفك";
  }
}

/** The record's line, in the voice of a task log. */
export function receiptText(ref: ReceiptRef): string {
  switch (ref.k) {
    case "go":
      return openedText(ref.to);
    case "start":
      return `بدء خطوة ${stepName(ref.c)}`;
    case "target":
      return `تغيير هدفك إلى ${quoted(getJob(ref.j).title)}`;
    case "apply":
      // a real posting is prepared here and sent by the user from the posting (20 Nov 2026)
      return getJob(ref.j).real
        ? `تعبئة طلبك على ${quoted(getJob(ref.j).title)} وتجهيزه`
        : `تعبئة طلبك على ${quoted(getJob(ref.j).title)} وحفظه`; // the practice job: saved in «طلباتي», never "sent"
  }
}

/** Where the receipt takes the user again when pressed. */
export function receiptHref(ref: ReceiptRef): string {
  switch (ref.k) {
    case "go":
      return hrefFor(ref.to);
    case "start":
      return hrefFor({ screen: "course", courseId: ref.c });
    case "target":
      return hrefFor({ screen: "path" });
    case "apply":
      return hrefFor({ screen: "applications" });
  }
}

function screenIcon(to: NavTarget) {
  switch (to.screen) {
    case "path":
      return IconPath;
    case "skills":
      return IconSkills;
    case "cv":
      return IconCv;
    case "jobs":
    case "job":
      return IconJobs;
    case "applications":
      return IconApplications;
    case "learn":
    case "course":
      return IconCourses;
    case "leaderboard":
      return IconLeaderboard;
    case "profile":
      return IconProfile;
  }
}

/** The record's icon: the page's own navigation icon, or the action's (18 px, quiet dot). */
export function receiptIcon(ref: ReceiptRef): ReactNode {
  const Icon = ref.k === "go" ? screenIcon(ref.to) : ref.k === "start" ? IconCourses : ref.k === "target" ? IconTarget : IconSend;
  return createElement(Icon, { size: 18, waypoint: "muted" });
}
