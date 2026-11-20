"use client";
// Owner: learn. «دليل التعلّم» `/learn` (spec 3.10): the learning steps of the user's path in order, each with where to
// learn it (the guide's real top pick), the next one highlighted with why («تقفل أكبر جزء من فجوتك مع «محلل بيانات»»),
// the done ones in the collapsed group «أنجزتها (6)» with their stamps. Tabs «خطوات مساري» · «كل المهارات» · «مكتملة»
// live in the URL (router.replace: the list reorders in place); the field chips show on «كل المهارات» only. Two quiet
// filters (language عربي / English, and مجاني) pick, per step, the first option of its guide that fits; a step with no
// fitting option is left out. Every step is a quest (docs/GAME-LAYER.md 5.5): the next step is the one `next` piece.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";

import { QuestNumber, Tile } from "@/components/game";
import { IconChevronDown, IconInfo } from "@/components/icons";
import { Collapse, PageTransition, PillTabs, ReorderList } from "@/components/motion";
import { Button, Card, Chip, EmptyState, cn } from "@/components/ui";
import { SAMPLE_COPY } from "@/lib/copy";
import { FIELDS, getCourse, getGuide, getJob, getSkill, isFreeCourse, type GuideCourse } from "@/lib/data";
import { courseOnPath, courseState, courseXp, learnList, nextStep } from "@/lib/engine";
import { hrefFor, parseLearnQuery } from "@/lib/routes";
import { useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CourseId, FieldId, LearnTab, UserState } from "@/lib/types";

import { LEARN_COPY } from "./copy";
import { CourseCard, type CourseCardModel } from "./course-card";
import { nextCourseOf } from "./quest";

const TAB_ORDER: readonly LearnTab[] = ["path", "explore", "done"];

type LangFilter = "ar" | "en" | null;
interface SourceFilter {
  readonly lang: LangFilter;
  readonly free: boolean;
}

/** The guide's option that fits the filters: the top pick first, then the alternatives; null when none fits. */
function pickFor(id: CourseId, filter: SourceFilter): GuideCourse | null {
  const guide = getGuide(getCourse(id).skill);
  const options = [guide.topPick, ...guide.alternatives];
  return options.find((o) => (filter.lang === null || o.lang === filter.lang) && (!filter.free || isFreeCourse(o))) ?? null;
}

export function LearnScreen(): ReactNode {
  return (
    <PageTransition>
      <Suspense fallback={null}>
        <Catalogue />
      </Suspense>
    </PageTransition>
  );
}

function Catalogue(): ReactNode {
  const user = useCurrentUser();
  if (user === null) return null; // the app Guard renders nothing while signed out; this only satisfies the type
  return <CatalogueFor user={user} />;
}

function cardModel(user: UserState, id: CourseId, nextCourse: CourseId | null, ahead: boolean, pick: GuideCourse): CourseCardModel {
  const course = getCourse(id);
  const path = courseOnPath(id, user);
  const next = id === nextCourse;
  const why =
    next && path !== null
      ? path.prep
        ? LEARN_COPY.prepWhy(getSkill(path.prepares ?? course.skill).name)
        : LEARN_COPY.nextWhy(getJob(path.jobId).title)
      : null;
  return { course, info: courseState(id, user), xp: courseXp(course), path, next, ahead, pick, why };
}

function CatalogueFor({ user }: { readonly user: UserState }): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const fromUrl = parseLearnQuery(new URLSearchParams(query));

  // The view follows a press at once (local state) and writes the URL; a navigation from outside (the advisor opening
  // /learn?tab=explore while the page is open) changes the query and wins.
  const [view, setView] = useState({ query, tab: fromUrl.tab, field: fromUrl.field });
  if (view.query !== query && (view.tab !== fromUrl.tab || view.field !== fromUrl.field)) {
    setView({ query, tab: fromUrl.tab, field: fromUrl.field });
  }
  const { tab, field } = view;
  const [doneOpen, setDoneOpen] = useState(false);
  const [filter, setFilter] = useState<SourceFilter>({ lang: null, free: false });

  const show = (next: { tab?: LearnTab; field?: FieldId | null }) => {
    const nextTab = next.tab ?? tab;
    const nextField = next.field === undefined ? field : next.field;
    const href = hrefFor({ screen: "learn", ...(nextTab !== "path" ? { tab: nextTab } : {}), ...(nextField ? { field: nextField } : {}) });
    setView({ query: new URL(href, "http://x").searchParams.toString(), tab: nextTab, field: nextField });
    router.replace(href, { scroll: false });
  };

  const { items, doneGroup } = useMemo(() => {
    const listing = learnList(user, tab, tab === "explore" ? field : null);
    const next = nextCourseOf(nextStep(user));
    const models = (ids: readonly CourseId[], nextId: CourseId | null, ahead: boolean) =>
      ids.flatMap((id) => {
        const pick = pickFor(id, filter);
        return pick === null ? [] : [cardModel(user, id, nextId, ahead, pick)];
      });
    return { items: models(listing.items, next, tab === "path"), doneGroup: models(listing.doneGroup, null, false) };
  }, [user, tab, field, filter]);
  const filtered = filter.lang !== null || filter.free;

  const labelBy = tab === "path" ? "stage" : "field";
  const empty = items.length === 0 ? (filtered ? { title: LEARN_COPY.emptyField, action: LEARN_COPY.emptyFieldAction, go: {} } : emptyFor(tab, field, doneGroup.length > 0)) : null;

  return (
    <main className="mx-auto flex w-full max-w-[72rem] flex-col gap-8 px-gutter pt-6 pb-12 @min-[900px]/content:pt-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 text-fg lg:sr-only">{LEARN_COPY.heading}</h1>
        <p className="text-body text-fg-2">{LEARN_COPY.subline}</p>
        <p className="flex items-start gap-2 text-small text-fg-3">
          <IconInfo className="mt-[0.2rem] shrink-0" size={18} waypoint="muted" />
          <span>{SAMPLE_COPY.learnBanner}</span>
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <PillTabs
          active={tab}
          className="self-start"
          label={LEARN_COPY.tabsLabel}
          onPick={(id) => show({ tab: id })}
          tabs={TAB_ORDER.map((id) => ({ id, label: LEARN_COPY.tabs[id], testId: TID.learn.tab(id) }))}
        />
        <div aria-label={LEARN_COPY.filtersLabel} className="flex flex-wrap items-center gap-2" role="group">
          {(["ar", "en"] as const).map((lang) => (
            <Chip
              data-testid={`learn-lang-${lang}`}
              key={lang}
              onClick={() => setFilter((f) => ({ ...f, lang: f.lang === lang ? null : lang }))}
              selected={filter.lang === lang}
              size="sm"
            >
              {lang === "ar" ? LEARN_COPY.filterAr : LEARN_COPY.filterEn}
            </Chip>
          ))}
          <span aria-hidden className="mx-1 h-5 border-s border-border-strong" />
          <Chip data-testid="learn-free" onClick={() => setFilter((f) => ({ ...f, free: !f.free }))} selected={filter.free} size="sm">
            {LEARN_COPY.filterFree}
          </Chip>
        </div>
        {tab !== "explore" ? null : (
        <div
          aria-label={LEARN_COPY.fieldsLabel}
          className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] @min-[900px]/content:mx-0 @min-[900px]/content:flex-wrap @min-[900px]/content:overflow-visible @min-[900px]/content:px-0 [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          <Chip data-testid={TID.learn.filter("all")} onClick={() => show({ field: null })} selected={field === null} size="sm">
            {LEARN_COPY.allFields}
          </Chip>
          {FIELDS.map((f) => (
            <Chip data-testid={TID.learn.filter(f.id)} key={f.id} onClick={() => show({ field: f.id })} selected={field === f.id} size="sm">
              {f.name}
            </Chip>
          ))}
        </div>
        )}
      </div>

      <section aria-label={LEARN_COPY.tabs[tab]} className="flex flex-col gap-6">
        {empty ? (
          <Card padding="none">
            <EmptyState
              action={
                <Button
                  data-testid={TID.learn.emptyAction}
                  onClick={() => {
                    if (filtered) setFilter({ lang: null, free: false });
                    else show(empty.go);
                  }}
                  variant="secondary"
                >
                  {empty.action}
                </Button>
              }
              testId={TID.learn.empty}
              title={empty.title}
            />
          </Card>
        ) : (
          <ReorderList
            className="grid gap-x-5 gap-y-8 pt-1 @min-[44rem]/content:grid-cols-2"
            itemClassName="min-w-0"
            label={LEARN_COPY.tabs[tab]}
            rows={items.map((model) => ({ id: model.course.id, node: <CourseCard labelBy={labelBy} model={model} /> }))}
          />
        )}

        {tab === "path" && doneGroup.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* the toggle is a piece (it opens the group); the stations already passed sit on it, pressed home */}
            <Tile
              aria-expanded={doneOpen}
              data-testid={TID.learn.doneGroup}
              depth="sm"
              faceClassName="min-h-14 flex-row flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5"
              onClick={() => setDoneOpen((open) => !open)}
              radius="control"
            >
              <span className="text-title text-fg">{LEARN_COPY.doneGroup(doneGroup.length)}</span>
              <span aria-hidden className="order-last flex basis-full flex-wrap items-center gap-1.5 @min-[44rem]/content:order-none @min-[44rem]/content:flex-1 @min-[44rem]/content:basis-auto">
                {doneGroup.map((model) => (model.path ? <QuestNumber key={model.course.id} n={model.path.stageN} size="sm" state="done" /> : null))}
              </span>
              <IconChevronDown className={cn("ms-auto text-fg-2 transition-transform duration-200 ease-out", doneOpen && "rotate-180")} size={20} waypoint="off" />
            </Tile>
            <Collapse open={doneOpen}>
              <ul className="grid gap-x-5 gap-y-8 pt-4 pb-1 @min-[44rem]/content:grid-cols-2">
                {doneGroup.map((model) => (
                  <li className="min-w-0" key={model.course.id}>
                    <CourseCard labelBy="stage" model={model} />
                  </li>
                ))}
              </ul>
            </Collapse>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function emptyFor(tab: LearnTab, field: FieldId | null, hasDone: boolean): { title: string; action: string; go: { tab?: LearnTab; field?: FieldId | null } } {
  if (tab === "path" && (field === null || hasDone)) return { title: LEARN_COPY.emptyPath, action: LEARN_COPY.emptyPathAction, go: { tab: "explore" } };
  if (field !== null) return { title: LEARN_COPY.emptyField, action: LEARN_COPY.emptyFieldAction, go: { field: null } };
  if (tab === "done") return { title: LEARN_COPY.emptyDone, action: LEARN_COPY.emptyDoneAction, go: { tab: "path" } };
  return { title: LEARN_COPY.emptyField, action: LEARN_COPY.emptyFieldAction, go: { field: null } };
}
