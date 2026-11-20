"use client";
// Owner: learn. The courses catalogue `/learn` (spec 3.10; playbook 3.9). All 59 courses, the ones on the user's path
// first, and every card says what star it grants. Tabs «في مساري» · «وسّع آفاقك» · «مكتملة» and the field filter live in
// the URL (router.replace, no page transition: the list reorders in place, `list-reorder`). Under the path tab the done
// stages sit in the collapsed group «أنجزتها (6)», whose toggle shows the stations already passed.
// Every course is a quest (docs/GAME-LAYER.md 5.5): the next step's course is the one `next` piece of the page.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";

import { QuestNumber, Tile } from "@/components/game";
import { IconChevronDown, IconInfo } from "@/components/icons";
import { Collapse, PageTransition, PillTabs, ReorderList } from "@/components/motion";
import { Button, Card, Chip, EmptyState, cn } from "@/components/ui";
import { SAMPLE_COPY } from "@/lib/copy";
import { FIELDS, getCourse } from "@/lib/data";
import { courseOnPath, courseState, courseXp, learnList, nextStep } from "@/lib/engine";
import { hrefFor, parseLearnQuery } from "@/lib/routes";
import { useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CourseId, FieldId, LearnTab, UserState } from "@/lib/types";

import { LEARN_COPY } from "./copy";
import { CourseCard, type CourseCardModel } from "./course-card";
import { nextCourseOf } from "./quest";

const TAB_ORDER: readonly LearnTab[] = ["path", "explore", "done"];

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

function cardModel(user: UserState, id: CourseId, nextCourse: CourseId | null, ahead: boolean): CourseCardModel {
  const course = getCourse(id);
  return {
    course,
    info: courseState(id, user),
    xp: courseXp(course),
    path: courseOnPath(id, user),
    next: id === nextCourse,
    ahead,
  };
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

  const show = (next: { tab?: LearnTab; field?: FieldId | null }) => {
    const nextTab = next.tab ?? tab;
    const nextField = next.field === undefined ? field : next.field;
    const href = hrefFor({ screen: "learn", ...(nextTab !== "path" ? { tab: nextTab } : {}), ...(nextField ? { field: nextField } : {}) });
    setView({ query: new URL(href, "http://x").searchParams.toString(), tab: nextTab, field: nextField });
    router.replace(href, { scroll: false });
  };

  const { items, doneGroup } = useMemo(() => {
    const listing = learnList(user, tab, field);
    const next = nextCourseOf(nextStep(user));
    return {
      items: listing.items.map((id) => cardModel(user, id, next, tab === "path")),
      doneGroup: listing.doneGroup.map((id) => cardModel(user, id, null, false)),
    };
  }, [user, tab, field]);

  const labelBy = tab === "path" ? "stage" : "field";
  const empty = items.length === 0 ? emptyFor(tab, field, doneGroup.length > 0) : null;

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
      </div>

      <section aria-label={LEARN_COPY.tabs[tab]} className="flex flex-col gap-6">
        {empty ? (
          <Card padding="none">
            <EmptyState
              action={
                <Button data-testid={TID.learn.emptyAction} onClick={() => show(empty.go)} variant="secondary">
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
