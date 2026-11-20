"use client";
// Owner: jobs. `/jobs` (spec 3.7, 7.1, 7.2; docs/GAME-LAYER.md 5.3): a board of destinations. Every job is a destination
// you unlock, ranked by how well it fits the user: its ring, its five-segment unlock meter, the skills still missing as
// locked gems, and the real reward for applying (+40 XP from 60%, spec 8.1). The target comes first, featured (the
// board's one accent piece); the others follow two by two. Under the header one flat banner states the apply reward and
// how many jobs it is open for now.
// Search, city, field and skill combine with AND and live in the URL (`/jobs?q=&city=&field=&skill=`), written with
// router.replace (no page transition: the board reorders in place, playbook 1.5). Typing filters as you type.
// Motion: `list-reorder` (ReorderList: cards glide to their new places when the filters change, and on arrival when the
// matches moved since the last visit: the old order first, then the new one) and `ring-count` (a ring whose value changed
// since the last visit counts from what the user last saw: `seen.jobsMatch`, written once after the replay).
// No loading and no error state (local data).
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Tile, XpCoin } from "@/components/game";
import { IconClose, IconCv, IconFilter, IconLocation, IconSearch } from "@/components/icons";
import { NavLink, PageTransition, ReorderList, type ReorderRow } from "@/components/motion";
import { Card, EmptyState, SelectField, TextField, buttonStyles, Button, type SelectItem } from "@/components/ui";
import { countNoun } from "@/lib/copy";
import { FIELDS, JOB_CITIES, MATCH_LINE, XP, getSkill } from "@/lib/data";
import { applicationStatus, rankJobs, searchJobs, skillStars, totalStars } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import { JOB_IDS } from "@/lib/ids";
import { PAGE_HEADINGS, hrefFor, parseJobsQuery } from "@/lib/routes";
import { useAppStore, useClock, useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { JobCityId, JobFieldId, JobId, JobQuery, RankedJob, UserState } from "@/lib/types";

import { LIST_COPY } from "./copy";
import { JobCard, type JobCardApplied } from "./job-row";
import { LtrNumbers, SampleLine } from "./parts";

type CityValue = JobCityId | "all";
type FieldValue = JobFieldId | "all";

const CITY_ITEMS: readonly SelectItem<CityValue>[] = [
  { value: "all", label: LIST_COPY.cityAll },
  ...JOB_CITIES.map((city) => ({ value: city.id, label: city.name })),
];

const FIELD_ITEMS: readonly SelectItem<FieldValue>[] = [
  { value: "all", label: LIST_COPY.fieldAll },
  ...FIELDS.flatMap((field) =>
    field.hasJobs && field.id !== "professional" ? [{ value: field.id, label: field.name }] : [],
  ),
];

/** When the cards glide to the new order (after the rings have counted). */
const REORDER_AT_MS = 1250;
const SEEN_WRITE_MS = 1800;

export function JobsScreen(): ReactNode {
  const user = useCurrentUser();
  if (!user) return null; // the Guard renders nothing once signed out; children may assume a user
  return <JobsList user={user} />;
}

function JobsList({ user }: { user: UserState }): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const url = useMemo(() => parseJobsQuery(new URLSearchParams(params.toString())), [params]);

  // The search box answers at once from local state; the URL follows (and an outside change, «دليلك» opening
  // /jobs?q=…, flows back into the box).
  const [text, setText] = useState(url.q ?? "");
  const written = useRef(url.q ?? "");
  useEffect(() => {
    const q = url.q ?? "";
    if (q !== written.current) {
      written.current = q;
      setText(q);
    }
  }, [url.q]);

  const query: JobQuery = useMemo(() => {
    const q = text.trim();
    return { ...url, q: q === "" ? undefined : q };
  }, [url, text]);

  const write = (next: JobQuery) => {
    written.current = next.q?.trim() ?? "";
    router.replace(hrefFor({ screen: "jobs", ...next }), { scroll: false });
  };

  const clock = useClock();
  const rows = useMemo(() => searchJobs(user, query), [user, query]);
  const stars = useMemo(() => skillStars(user), [user]);
  const hasStar = useMemo(() => totalStars(stars) > 0, [stars]);
  // the apply reward is open for every job at 60% or more not applied to yet (spec 8.1: once per job), whatever the filters
  const openForReward = useMemo(
    () =>
      rankJobs(user).filter((row) => row.match >= MATCH_LINE && !user.applications.some((a) => a.jobId === row.jobId))
        .length,
    [user],
  );

  const replay = useMatchReplay(user);
  // the target first (your destination, featured), then the board in ranked order
  const ordered = targetFirst(replay.oldOrder ? reorderByBaseline(rows, replay.oldOrder) : rows);

  const appliedOf = (jobId: JobId): JobCardApplied | null => {
    const app = user.applications.find((a) => a.jobId === jobId);
    return app ? { status: applicationStatus(app, clock.now), xp: app.xpPaid } : null;
  };

  const listRows: ReorderRow[] = ordered.map((row) => ({
    id: row.jobId,
    me: row.isTarget,
    node: row.isTarget ? (
      // the featured destination spans the whole board (the list's grid reads this marker)
      <div className="h-full" data-featured="">
        <JobCard applied={appliedOf(row.jobId)} featured from={replay.from(row.jobId, row.match)} row={row} stars={stars} />
      </div>
    ) : (
      <JobCard applied={appliedOf(row.jobId)} from={replay.from(row.jobId, row.match)} row={row} stars={stars} />
    ),
  }));

  const clear = () => {
    setText("");
    write({});
  };

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-gutter pt-6 pb-14 @min-[900px]/content:pt-2">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 text-fg lg:sr-only">{PAGE_HEADINGS.jobs}</h1>
            <p className="text-body text-fg-2">{LIST_COPY.subline}</p>
          </div>
          <SampleLine />
        </header>

        {user.cv === null ? <CvBanner /> : null}

        <RewardBanner open={openForReward} />

        <section aria-label={LIST_COPY.searchLabel} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 @min-[700px]/content:flex-row @min-[700px]/content:items-end">
            <TextField
              autoComplete="off"
              className="@min-[700px]/content:flex-1"
              data-testid={TID.jobs.search}
              enterKeyHint="search"
              hideLabel
              icon={<IconSearch size={20} />}
              label={LIST_COPY.searchLabel}
              onChange={(event) => {
                const value = event.target.value;
                setText(value);
                write({
                  ...url,
                  q: value.trim() === "" ? undefined : value.trim(),
                });
              }}
              inputMode="search"
              placeholder={LIST_COPY.searchPlaceholder}
              type="text"
              value={text}
            />
            <div className="grid grid-cols-2 gap-3 @min-[700px]/content:flex @min-[700px]/content:w-[26rem]">
              <SelectField<CityValue>
                className="@min-[700px]/content:flex-1"
                hideLabel
                icon={<IconLocation size={20} />}
                itemTestIdPrefix="jobs-filter-city"
                items={CITY_ITEMS}
                label={LIST_COPY.cityLabel}
                onValueChange={(value) =>
                  write({
                    ...query,
                    city: value === null || value === "all" ? undefined : value,
                  })
                }
                size="sm"
                testId="jobs-city-select"
                value={query.city ?? "all"}
              />
              <SelectField<FieldValue>
                className="@min-[700px]/content:flex-1"
                hideLabel
                icon={<IconFilter size={20} />}
                itemTestIdPrefix="jobs-filter-field"
                items={FIELD_ITEMS}
                label={LIST_COPY.fieldLabel}
                onValueChange={(value) =>
                  write({
                    ...query,
                    field: value === null || value === "all" ? undefined : value,
                  })
                }
                size="sm"
                testId="jobs-field-select"
                value={query.field ?? "all"}
              />
            </div>
          </div>
          {query.skill ? (
            <SkillFilterChip onRemove={() => write({ ...query, skill: undefined })} skill={query.skill} />
          ) : null}
        </section>

        <section aria-labelledby="jobs-count" className="flex flex-col gap-3">
          <p className="text-small text-fg-2" data-testid={TID.jobs.count} data-value={rows.length} id="jobs-count">
            {countNoun(rows.length, "job")}
            {rows.length > 0 ? ` · ${hasStar ? LIST_COPY.byMatch : LIST_COPY.byAnswers}` : null}
          </p>
          {rows.length === 0 ? (
            <Card padding="none">
              <EmptyState
                action={
                  <Button data-testid={TID.jobs.clear} onClick={clear} variant="secondary">
                    {LIST_COPY.clear}
                  </Button>
                }
                className="py-12"
                testId={TID.jobs.empty}
                title={LIST_COPY.empty}
              />
            </Card>
          ) : (
            <ReorderList
              className="mt-2 grid grid-cols-1 gap-x-5 gap-y-6 @min-[760px]/content:grid-cols-2 [&>li:has(>[data-featured])]:col-span-full"
              itemClassName="min-w-0"
              label={PAGE_HEADINGS.jobs}
              rows={listRows}
            />
          )}
        </section>
      </main>
    </PageTransition>
  );
}

/**
 * «ارفع سيرتك لتُرتَّب الوظائف حسب مطابقتك الفعلية.» with «ارفع سيرتك الذاتية» (spec 3.7, until a CV is analysed). A flat
 * tile (read-only; the button is the pressable piece): until then every meter on the board is empty and every apply reward
 * locked, which is the honest picture and the reason to upload.
 */
function CvBanner(): ReactNode {
  return (
    <Tile
      data-testid={TID.jobs.bannerCv}
      faceClassName="gap-3 px-card py-4 @min-[600px]/content:flex-row @min-[600px]/content:items-center @min-[600px]/content:gap-4"
      interactive={false}
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control border-2 border-fg text-fg wp-quiet">
          <IconCv size={22} waypoint="muted" />
        </span>
        <span className="text-body font-medium text-fg">{LIST_COPY.cvBanner}</span>
      </span>
      <NavLink
        className={buttonStyles({
          variant: "primary",
          size: "sm",
          className: "self-start @min-[600px]/content:self-auto",
        })}
        href={hrefFor({ screen: "cv" })}
      >
        {LIST_COPY.cvBannerAction}
      </NavLink>
    </Tile>
  );
}

/**
 * The board's reward line (GAME-LAYER 5.3.1), one flat tile with the brass coin: «قدّم حين تبلغ مطابقتك 60% أو أكثر،
 * وتكسب +40 XP عن كل تقديم مدروس. مفتوحة لك الآن: وظيفتان.» The count is real: jobs at 60% or more not applied to yet.
 */
function RewardBanner({ open }: { open: number }): ReactNode {
  return (
    <Tile
      data-testid="jobs-reward-banner"
      data-value={open}
      faceClassName="flex-row items-center gap-3.5 px-4 py-3.5 @min-[600px]/content:px-5"
      interactive={false}
    >
      <XpCoin size={40} />
      <p className="min-w-0 flex-1 text-small text-fg-2 @min-[600px]/content:text-body">
        <span className="font-semibold text-fg">
          <LtrNumbers text={LIST_COPY.rewardLead} />{" "}
          <bdi className="font-bold text-xp-fg tabular-nums" dir="ltr">
            +{formatNumber(XP.job_applied)} XP
          </bdi>{" "}
          {LIST_COPY.rewardTail}
        </span>{" "}
        <span className="whitespace-nowrap">
          {LIST_COPY.rewardOpen}{" "}
          <span className="font-semibold text-fg">{open > 0 ? countNoun(open, "job") : LIST_COPY.rewardNone}</span>.
        </span>
      </p>
    </Tile>
  );
}

/** The removable chip «المهارة: {name}» (spec 3.7, only when the URL carries `skill`). */
function SkillFilterChip({
  skill,
  onRemove,
}: {
  skill: NonNullable<JobQuery["skill"]>;
  onRemove: () => void;
}): ReactNode {
  const name = getSkill(skill).name;
  return (
    <span
      className="inline-flex h-10 items-center gap-1 self-start rounded-full bg-solid ps-4 pe-1 text-[0.9375rem] font-medium text-on-solid"
      data-testid={TID.jobs.filterSkill}
      data-value={skill}
    >
      <span aria-hidden className="me-1 size-2 shrink-0 rounded-full bg-accent" />
      <span>
        {LIST_COPY.skillPrefix} <bdi>{name}</bdi>
      </span>
      <button
        aria-label={`${LIST_COPY.skillRemove} ${LIST_COPY.skillPrefix} ${name}`}
        className="grid size-8 place-items-center rounded-full transition-colors duration-200 hover:bg-on-solid/15 active:scale-[0.97] active:transition-none"
        data-testid={TID.jobs.filterSkillClear}
        onClick={onRemove}
        type="button"
      >
        <IconClose size={18} waypoint="off" />
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ring-count and list-reorder on arrival

/**
 * What the user saw last time (`seen.jobsMatch`), read once on the first render. When some match moved since, the rings
 * count from the old values and the list first shows the old order, then glides to the new one once the counts have
 * landed. The current matches are written back once, after the replay (never on every render: the write itself changes
 * the user object).
 */
function useMatchReplay(user: UserState): {
  from: (jobId: JobId, match: number) => number;
  oldOrder: ReadonlyMap<JobId, number> | null;
} {
  const [baseline] = useState(() => user.seen.jobsMatch);
  const current = useMemo(() => {
    const out: Partial<Record<JobId, number>> = {};
    for (const row of rankJobs(user)) out[row.jobId] = row.match;
    return out;
  }, [user]);
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const [replaying, setReplaying] = useState(() => {
    if (baseline === null) return false;
    return JOB_IDS.some((id) => baseline[id] !== undefined && baseline[id] !== current[id]);
  });

  useEffect(() => {
    if (!replaying) return;
    const timer = window.setTimeout(() => setReplaying(false), REORDER_AT_MS);
    return () => window.clearTimeout(timer);
  }, [replaying]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => useAppStore.getState().markSeen("jobsMatch", { ...currentRef.current }),
      SEEN_WRITE_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const oldOrder = useMemo(() => {
    if (!replaying || baseline === null) return null;
    const map = new Map<JobId, number>();
    for (const id of JOB_IDS) map.set(id, baseline[id] ?? current[id] ?? 0);
    return map;
  }, [replaying, baseline, current]);

  return {
    from: (jobId, match) => (baseline?.[jobId] !== undefined ? (baseline[jobId] ?? match) : match),
    oldOrder,
  };
}

/** The target first (it is featured at the top of the board), the others in the order given. */
function targetFirst(rows: readonly RankedJob[]): readonly RankedJob[] {
  const i = rows.findIndex((row) => row.isTarget);
  return i <= 0 ? rows : [rows[i]!, ...rows.slice(0, i), ...rows.slice(i + 1)];
}

/** The rows in the order the user last saw: by the old match (stable, so ties keep today's tie order; all-zero = by fit). */
function reorderByBaseline(rows: readonly RankedJob[], old: ReadonlyMap<JobId, number>): readonly RankedJob[] {
  const allZero = rows.every((row) => (old.get(row.jobId) ?? 0) === 0);
  return [...rows].sort((a, b) => (old.get(b.jobId) ?? 0) - (old.get(a.jobId) ?? 0) || (allZero ? b.fit - a.fit : 0));
}
