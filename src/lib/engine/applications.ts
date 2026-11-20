// Owner: engine. Application status as a function of time, the match when sent and the simulation control (spec 7.5),
// and the application number (7.4). 20 Nov 2026: an application to a REAL posting was prepared in Dalilak and is sent by
// the user from the original posting, so no company is pretended to review it: it stays «sent» (shown as prepared) and
// the simulation control never moves it. Only the practice job's application follows the simulated track.
import { APPLICATION_PREFIX, APPLICATION_TIMING, MATCH_LINE, getJob } from "@/lib/data";
import type { Application, ApplicationStatus, Clock, UserFacts } from "@/lib/types";

const STEP: Readonly<Record<ApplicationStatus, number>> = { sent: 0, review: 1, shortlisted: 2, closed: 2 };

/** The result an application reaches: shortlisted at a match of 60% or more when sent, else closed (7.5). */
function resultOf(application: Application): ApplicationStatus {
  return application.matchAtSend >= MATCH_LINE ? "shortlisted" : "closed";
}

/** 0 to 30 s: sent · 30 s to 2 min: review · from 2 min: the result. */
function timeStatus(application: Application, now: number): ApplicationStatus {
  const elapsed = now - application.sentAt;
  if (elapsed < APPLICATION_TIMING.reviewAfterMs) return "sent";
  if (elapsed < APPLICATION_TIMING.resultAfterMs) return "review";
  return resultOf(application);
}

/** The time-based status (7.5) unless `pinned` (then `manualStatus`); otherwise the later of the time-based and the manual status. */
export function applicationStatus(application: Application, now: number): ApplicationStatus {
  if (isPreparedOnly(application)) return "sent";
  const manual = application.manualStatus;
  if (application.pinned) return manual ?? "sent";
  const byTime = timeStatus(application, now);
  if (manual === null) return byTime;
  return STEP[manual] >= STEP[byTime] ? manual : byTime;
}

/** The status «محاكاة: انقل للحالة التالية» moves to (sent → review → shortlisted|closed by the 60% line), or null at the end. */
export function nextApplicationStatus(application: Application, now: number): ApplicationStatus | null {
  if (isPreparedOnly(application)) return null;
  const current = applicationStatus(application, now);
  if (current === "sent") return "review";
  if (current === "review") return resultOf(application);
  return null;
}

/** A real posting's application: prepared here, sent by the user from the posting; no simulated status. */
export function isPreparedOnly(application: Application): boolean {
  return getJob(application.jobId).real;
}

/** «DL-2026-0001»: prefix, year, sequence as four digits (spec 7.4, v3). */
export function applicationNumber(sequence: number, year: number): string {
  return `${APPLICATION_PREFIX}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * The number the NEXT application of this account gets: applicationNumber(facts.applications.length + 1,
 * Number(clock.today.slice(0, 4))). The one derivation of sequence and year, used by the store's submitApplication AND
 * by the advisor's apply_to_job tool (`expect.number`), so the two can never disagree.
 */
export function nextApplicationNumber(facts: UserFacts, clock: Clock): string {
  return applicationNumber(facts.applications.length + 1, Number(clock.today.slice(0, 4)));
}
