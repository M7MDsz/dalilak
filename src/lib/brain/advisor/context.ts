// Owner: brain-advisor. One advisor request's view of the user: the facts, the clock, the page, and the values the
// engine derives from them, each computed once on first use (pure; server and tests).
import { getJob } from "@/lib/data";
import {
  buildRoadmap,
  leaderboard,
  levelFor,
  nextStep,
  rankJobs,
  skillStars,
  streakInfo,
  targetMatch,
  totalXp,
  weeklyXp,
} from "@/lib/engine";
import type { Clock, JobId, Leaderboard, LevelInfo, NextStep, RankedJob, Roadmap, StarMap, UserFacts } from "@/lib/types";
import type { AdvisorRequest, PageContext } from "@/lib/brain/protocol";

import { firstName } from "./phrasing";

export class AdvisorCtx {
  readonly facts: UserFacts;
  readonly clock: Clock;
  readonly page: PageContext;
  readonly jobsDisclosed: boolean;

  private memo = new Map<string, unknown>();

  constructor(input: { facts: UserFacts; clock: Clock; page: PageContext; jobsDisclosed?: boolean }) {
    this.facts = input.facts;
    this.clock = input.clock;
    this.page = input.page;
    this.jobsDisclosed = input.jobsDisclosed ?? false;
  }

  static of(request: AdvisorRequest): AdvisorCtx {
    return new AdvisorCtx({
      facts: request.facts,
      clock: request.clock,
      page: request.page,
      jobsDisclosed: request.thread.jobsDisclosed,
    });
  }

  private once<T>(key: string, compute: () => T): T {
    if (this.memo.has(key)) return this.memo.get(key) as T;
    const value = compute();
    this.memo.set(key, value);
    return value;
  }

  /** «خالد». */
  get name(): string {
    return firstName(this.facts.name);
  }

  get target(): JobId | null {
    return this.facts.targetJobId;
  }

  get targetTitle(): string | null {
    return this.target ? getJob(this.target).title : null;
  }

  /** The job on screen (`/jobs/[id]`), or null. */
  get pageJob(): JobId | null {
    return this.page.route === "job" ? (this.page.jobId ?? null) : null;
  }

  /** The course on screen (`/learn/[id]`), or null. */
  get pageCourse(): CourseIdOrNull {
    return this.page.route === "course" ? (this.page.courseId ?? null) : null;
  }

  /** The job a "this job / my match" question is about: the one on screen, else the target. */
  get focusJob(): JobId | null {
    return this.pageJob ?? this.target;
  }

  /** 5.5 rule 7 in router turns: no action while the apply sheet is open or a show is running. */
  get blocked(): boolean {
    return this.page.applySheetOpen || this.page.showRunning;
  }

  get stars(): StarMap {
    return this.once("stars", () => skillStars(this.facts));
  }

  get holdsAnyStar(): boolean {
    return Object.values(this.stars).some((s) => s > 0);
  }

  get roadmap(): Roadmap | null {
    return this.once("roadmap", () => buildRoadmap(this.facts));
  }

  get match(): number | null {
    return this.once("match", () => targetMatch(this.facts));
  }

  get nextStep(): NextStep {
    return this.once("nextStep", () => nextStep(this.facts));
  }

  get ranked(): readonly RankedJob[] {
    return this.once("ranked", () => rankJobs(this.facts));
  }

  get totalXp(): number {
    return this.once("totalXp", () => totalXp(this.facts));
  }

  get weeklyXp(): number {
    return this.once("weeklyXp", () => weeklyXp(this.facts, this.clock));
  }

  get level(): LevelInfo {
    return this.once("level", () => levelFor(this.totalXp));
  }

  get streak(): number {
    return this.once("streak", () => streakInfo(this.facts, this.clock).current);
  }

  get board(): Leaderboard {
    return this.once("board", () => leaderboard(this.facts, this.clock));
  }

  /** Stages of the target's roadmap not done yet. */
  get remainingStages(): number {
    const roadmap = this.roadmap;
    return roadmap ? roadmap.stages.filter((s) => s.state !== "done").length : 0;
  }

  /** No CV analysed and «ابدأ بدون سيرة» not pressed (the start gate is lit). */
  get beforeCv(): boolean {
    return this.facts.cv === null && !this.facts.cvSkipped;
  }
}

type CourseIdOrNull = NonNullable<PageContext["courseId"]> | null;
