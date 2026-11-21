"use client";
// Owner: map. The real jobs beside the map (owner, 20 Nov 2026: «put instead what is the percentage needed from you to land
// that job»). They take the place of the next-step card, the target card and the leaderboard preview: the real postings of
// the job data (src/lib/data/jobs.ts, collected on 20 Nov; never the practice job «محلل بيانات»), closest first, each with
// the company's logo (shared CompanyLogo: a local file, else a monogram), what is left to reach it in big type («باقي لك
// 30%»), the match it rests on (the engine's formula, spec 7.2: never a new one), the skills still missing by name, and
// the way to its gap («وش ناقصني؟» opens the job page at its missing skills). The dream company's jobs are pinned on top («شركة حلمك»). Offline: logos are local files.
import { Fragment, useEffect, useMemo, type ReactNode } from "react";

import { Segments } from "@/components/game";
import { IconChevronForward } from "@/components/icons";
import { NavLink, NumberTicker } from "@/components/motion";
import { cn } from "@/components/ui";
import { CompanyLogo } from "@/features/shared";
import { JOBS, getJob, getJobCity, getSkill } from "@/lib/data";
import { EXPERIENCE_BANDS } from "@/lib/ids";
import { dreamCompany, matchPercent, skillStars, suitedFieldsOf } from "@/lib/engine";
import { formatNumber, formatPercent } from "@/lib/format";
import { hrefFor } from "@/lib/routes";
import type { Job, JobFieldId, JobId, UserState } from "@/lib/types";

import { BASED_ON_LEAD, basedOnFor } from "./based-on";

/** The column's test ids (the list, and one per card: data-value = job id, data-match = the match in %). */
export const JOB_CARDS_TID = { list: "path-jobs", card: "path-job-card", basedOn: "path-based-on" } as const;

/** How many cards: the column scrolls past the first four; the phone row holds three. */
const WIDE_COUNT = 8;
const NARROW_COUNT = 3;

export interface JobAd {
  readonly job: Job;
  readonly match: number;
  /** The five requirements' fills (held ÷ required, capped at 1): the segments that explain the match. */
  readonly fills: readonly number[];
  /** The skills still short of the job, by their display names, in the job's own order. */
  readonly missing: readonly string[];
  /** A job of the company the user has in mind (pinned on top). */
  readonly dream: boolean;
}

/**
 * The jobs of the company the user has in mind (onboarding «فيه شركة أو وظيفة معيّنة في بالك؟», «ملفي»). The ONE hook to
 * the company selector (engine `dreamCompany`): an empty list when there is none, or when the selector is not there.
 */
function dreamJobIds(user: UserState): ReadonlySet<JobId> {
  try {
    return new Set(dreamCompany(user)?.jobs ?? []);
  } catch {
    return new Set();
  }
}

/** Spec 4.6: the user's experience answer as a job band (none and under a year are entry level). */
const BAND_OF = { none: "entry", under1: "entry", "1to3": "junior", over3: "mid" } as const;

/**
 * The fields whose jobs suit this user (21 Nov 2026, tester): the target's field, the interests, the major's main field and
 * the CV's strongest field (engine suitedFieldsOf, shared with the jobs page). Empty when nothing is known yet.
 */
function suitedFields(user: UserState): ReadonlySet<JobFieldId> {
  return suitedFieldsOf(user, skillStars(user));
}

/**
 * The real postings for this user: the dream company's first, then the jobs in the fields that suit them (highest match
 * first), then — only to fill the column up to six — the closest others; ties keep the data order.
 */
export function jobAds(user: UserState): readonly JobAd[] {
  const stars = skillStars(user);
  const dream = dreamJobIds(user);
  const suited = suitedFields(user);
  const ranked = JOBS.flatMap((job, order) => (job.real ? [{ job, order }] : []))
    .map(({ job, order }) => {
      const fills = job.requirements.map((r) => Math.min(stars[r.skill], r.stars) / r.stars);
      const missing = job.requirements.filter((r) => stars[r.skill] < r.stars).map((r) => getSkill(r.skill).name);
      return { ad: { job, match: matchPercent(job.requirements, stars), fills, missing, dream: dream.has(job.id) }, order };
    })
    .sort((a, b) => Number(b.ad.dream) - Number(a.ad.dream) || b.ad.match - a.ad.match || a.order - b.order)
    .map((row) => row.ad);
  // within reach first (21 Nov 2026, tester): a job more than one band above the user's experience (a senior «أول» role
  // for a beginner) goes after the reachable ones, the same rule the onboarding company tiles use
  const userBand = BAND_OF[user.answers.experience ?? "none"];
  const reachable = (ad: JobAd) => EXPERIENCE_BANDS.indexOf(ad.job.band) - EXPERIENCE_BANDS.indexOf(userBand) <= 1;
  // the dream company's jobs stay pinned first (owner, 20 Nov 2026), then the reachable ones, then the rest
  const byReach = [
    ...ranked.filter((ad) => ad.dream),
    ...ranked.filter((ad) => !ad.dream && reachable(ad)),
    ...ranked.filter((ad) => !ad.dream && !reachable(ad)),
  ];
  if (suited.size === 0) return byReach;
  const inField = byReach.filter((ad) => ad.dream || suited.has(ad.job.field));
  const others = byReach.filter((ad) => !ad.dream && !suited.has(ad.job.field));
  return inField.length >= 6 ? inField : [...inField, ...others.slice(0, 6 - inField.length)];
}

/** «Excel وSQL» · «Excel، SQL وPower BI» · «Excel، SQL و3 غيرها» (never «و1 غيرها»: three names are shown in full). */
export function missingText(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length <= 3) return `${names.slice(0, -1).join("، ")} و${names[names.length - 1]}`;
  return `${names.slice(0, 2).join("، ")} و${formatNumber(names.length - 2)} غيرها`;
}

/**
 * The match each card showed last, for this visit of the app: a card that mounts again (back on the map after «خلّصتها»)
 * counts from what it showed to what it is now, instead of jumping.
 */
const shownMatch = new Map<JobId, number>();

function JobCard({ ad, compact }: { readonly ad: JobAd; readonly compact: boolean }): ReactNode {
  const { job, match } = ad;
  const from = shownMatch.get(job.id);
  useEffect(() => {
    shownMatch.set(job.id, match);
  }, [job.id, match]);
  const left = 100 - match;
  const city = getJobCity(job.city).name;
  return (
    <NavLink
      aria-label={`${job.title}، ${job.company}، ${city}. باقي لك ${formatPercent(left)}، مطابقتك ${formatPercent(match)}`}
      className={cn(
        "skin-card group/job flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface px-3.5 pt-3 pb-2.5 text-start text-fg",
        "transition-[border-color,scale] duration-200 ease-out hover:border-border-strong active:scale-[0.99] active:transition-none",
        compact ? "w-[17.5rem] shrink-0 snap-start" : "w-full",
      )}
      data-dream={ad.dream ? "" : undefined}
      data-match={match}
      data-testid={JOB_CARDS_TID.card}
      data-value={job.id}
      href={hrefFor({ screen: "job", jobId: job.id, focus: "missing" })}
    >
      {/* who and what: the logo, the company and city, the title */}
      <span className="flex items-start gap-2.5">
        <CompanyLogo jobId={job.id} size={compact ? 38 : 40} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5 text-small text-fg-2">
            <bdi className="truncate font-semibold text-fg">{job.company}</bdi>
            <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-fg-3" />
            <span className="shrink-0">{city}</span>
            <span className="ms-auto flex shrink-0 items-center gap-1">
              {ad.dream ? <span className="inline-flex h-5.5 items-center rounded-tag border border-accent px-1.5 text-caption font-semibold text-accent-fg">شركة حلمك</span> : null}
              <span className="inline-flex h-5.5 items-center rounded-tag border border-border px-1.5 text-caption text-fg-2">وظيفة حقيقية</span>
            </span>
          </span>
          <span className="truncate text-[0.9375rem] leading-[1.5] font-bold">
            <bdi>{job.title}</bdi>
          </span>
        </span>
      </span>
      {/* what is left: the one big number of the card, and the match it rests on with its five requirements */}
      <span className="flex items-end justify-between gap-3 border-t border-dotted border-border-strong pt-2">
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          {left > 0 ? (
            <>
              <span className="text-[1.0625rem] font-semibold text-fg-2">باقي لك</span>
              <bdi className="text-[1.875rem] leading-none font-bold tracking-tight text-fg" dir="ltr">
                <NumberTicker delay={0.45} duration={0.9} format={formatPercent} from={from === undefined ? undefined : 100 - from} value={left} />
              </bdi>
            </>
          ) : (
            <span className="text-[1.375rem] leading-none font-bold text-fg">جاهز لها</span>
          )}
        </span>
        <span className="flex w-[6.5rem] shrink-0 flex-col items-stretch gap-1 pb-0.5">
          <span className="text-end text-caption text-fg-2">
            مطابقتك{" "}
            <bdi className="font-bold text-fg" dir="ltr">
              <NumberTicker delay={0.45} duration={0.9} format={formatPercent} from={from} value={match} />
            </bdi>
          </span>
          <Segments fills={ad.fills} gap={3} height="sm" label={`${formatPercent(match)} من المتطلبات الخمسة`} />
        </span>
      </span>
      {/* the skills still missing, by name, and the way to the gap */}
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-small text-fg-2">
          {ad.missing.length > 0 ? (
            <>
              ناقصك: <bdi className="font-semibold text-fg" dir="rtl">{missingText(ad.missing)}</bdi>
            </>
          ) : (
            "تستوفي المتطلبات الخمسة"
          )}
        </span>
        <span className="inline-flex h-7.5 shrink-0 items-center gap-0.5 rounded-full border border-border-strong ps-2.5 pe-1.5 text-small font-semibold text-fg transition-colors duration-200 group-hover/job:border-fg">
          وش ناقصني؟
          <IconChevronForward size={15} waypoint="off" />
        </span>
      </span>
    </NavLink>
  );
}

/**
 * The column (wide layouts): a heading and the cards in a list that scrolls past the first four. On a
 * phone (and beside the docked panel) the same cards are a row that scrolls sideways, three of them, above the map.
 */
export function JobCards({ user, layout, className }: { readonly user: UserState; readonly layout: "column" | "row"; readonly className?: string }): ReactNode {
  const all = useMemo(() => jobAds(user), [user]);
  const row = layout === "row";
  const ads = all.slice(0, row ? NARROW_COUNT : WIDE_COUNT);
  if (ads.length === 0) return null;
  return (
    <section aria-labelledby="path-jobs-title" className={cn("flex min-h-0 min-w-0 flex-col", row ? "gap-2" : "gap-2.5", className)} data-testid={JOB_CARDS_TID.list}>
      <header className={cn("flex items-baseline justify-between gap-3", row ? "px-1" : "px-1 pt-1")}>
        <h2 className="text-title font-bold text-fg" id="path-jobs-title">
          وظائف تناسبك
        </h2>
      </header>
      {row ? (
        <div className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {ads.map((ad) => (
            <JobCard ad={ad} compact key={ad.job.id} />
          ))}
        </div>
      ) : (
        <ol className="-me-1.5 flex min-h-0 flex-col gap-2.5 overflow-y-auto pe-1.5 pb-1 [scrollbar-width:thin]">
          {ads.map((ad) => (
            <li className="flex" key={ad.job.id}>
              <JobCard ad={ad} compact={false} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * «المسار مبني على: Microsoft PL-300 · Google Data Analytics · إطار سدايا»: what the path to the target is built on, one
 * quiet line (research/paths/paths-guidelines.json via based-on.ts). Each source is a link that opens in a new tab; its
 * full name is its title. Static text: nothing is fetched.
 */
export function BasedOnLine({ jobId, className }: { readonly jobId: JobId; readonly className?: string }): ReactNode {
  const based = basedOnFor(getJob(jobId));
  if (based === null) return null;
  return (
    <p className={cn("text-caption leading-[1.7] text-fg-3", className)} data-testid={JOB_CARDS_TID.basedOn} data-value={based.family}>
      {BASED_ON_LEAD}{" "}
      {based.sources.map((source, i) => (
        <Fragment key={source.url}>
          {i > 0 ? <span aria-hidden> · </span> : null}
          <a
            aria-label={source.name}
            className="whitespace-nowrap text-fg-2 underline decoration-dotted decoration-1 underline-offset-4 transition-colors duration-200 hover:text-fg"
            href={source.url}
            rel="noopener"
            target="_blank"
            title={source.name}
          >
            <bdi>{source.short}</bdi>
          </a>
        </Fragment>
      ))}
    </p>
  );
}
