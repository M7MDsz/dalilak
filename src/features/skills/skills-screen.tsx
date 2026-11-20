"use client";
// Owner: skills. `/skills`, the skill tree (spec 3.5; playbook 3.5): the whole landscape of 38 skills in 7 fields, what
// the user holds (lit), what is open, what is locked, which skills the target job needs («في مسارك»), and how each one
// connects to courses and jobs (the skill panel, opened by `?skill=`).
//
// Layout follows the content width (ARCHITECTURE 11.1, container queries, so it reflows beside the docked advisor):
//   ≥ 1060 px  the landscape: seven field sheets in three columns, set like a map (rows of display order)
//   ≥ 680 px   two columns
//   narrower   one field at a time (spec "Phone"): the field chips scroll sideways, the tree never does
// A chosen field is drawn alone and larger (`field-focus`: the cluster comes forward).
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { IconArrowForward, IconCv } from "@/components/icons";
import { PageTransition, PillTabs, Roll, useGo, useInstant, type PillTab } from "@/components/motion";
import { Button, Card, cn, toast } from "@/components/ui";
import { useViewport } from "@/features/shared";
import { TOAST_COPY, countNoun } from "@/lib/copy";
import { FIELDS, SKILLS, getCourse, getJob, getSkill } from "@/lib/data";
import { courseState, nextStep, skillNodes, skillStars, skillTreeSummary, skillsHeld, totalStars } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import { isSkillId } from "@/lib/ids";
import { tween } from "@/lib/motion";
import { PAGE_HEADINGS, hrefFor } from "@/lib/routes";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { CourseId, FieldId, SkillId, UserState } from "@/lib/types";

import { COPY, subline } from "./copy";
import { FieldIcon } from "./field-icon";
import { Legend } from "./legend";
import { chainOf } from "./model";
import { SkillPanel } from "./skill-panel";
import { TreeRegion } from "./tree-region";
import { useTreeReplay } from "./use-replay";

type FieldChoice = FieldId | "all";

/** The landscape's placement (three columns, ≥ 1060 px of content): rows read in display order, heights balanced. */
const LANDSCAPE =
  "@min-[1060px]/content:grid-cols-3 @min-[1060px]/content:[grid-template-areas:'data_software_design'_'data_software_design'_'data_software_design'_'data_business_design'_'marketing_business_hr'_'marketing_professional_hr'_'marketing_professional_hr']";
const AREA: Readonly<Record<FieldId, string>> = {
  data: "@min-[1060px]/content:[grid-area:data]",
  software: "@min-[1060px]/content:[grid-area:software]",
  design: "@min-[1060px]/content:[grid-area:design]",
  marketing: "@min-[1060px]/content:[grid-area:marketing]",
  business: "@min-[1060px]/content:[grid-area:business]",
  hr: "@min-[1060px]/content:[grid-area:hr]",
  professional: "@min-[1060px]/content:[grid-area:professional]",
};

/** The skill of the user's next step, when the next-step rule names a course (2.8 rules 2 and 3). */
function nextSkillOf(user: UserState): SkillId | null {
  const step = nextStep(user);
  return step.rule === 2 || step.rule === 3 ? getCourse(step.courseId).skill : null;
}

function SkillsTree({ user }: { readonly user: UserState }): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const go = useGo();
  const instant = useInstant();
  const { desktop } = useViewport();

  const nodes = useMemo(() => skillNodes(user), [user]);
  const stars = useMemo(() => skillStars(user), [user]);
  const summary = useMemo(() => skillTreeSummary(user), [user]);
  const next = useMemo(() => nextSkillOf(user), [user]);
  const replay = useTreeReplay(user);

  // ── the panel, driven by ?skill= ───────────────────────────────────────────────────────────────────────────────
  const raw = params.get("skill");
  const fromUrl: SkillId | null = isSkillId(raw) ? raw : null;
  const [panel, setPanel] = useState<{ skill: SkillId | null; open: boolean; url: SkillId | null }>(() => ({ skill: fromUrl, open: fromUrl !== null, url: fromUrl }));

  // ── the field shown: the landscape on a desktop; on a phone the field of the open skill or of the target ─────────
  const [field, setField] = useState<FieldChoice>(() => {
    if (desktop) return "all";
    if (fromUrl) return getSkill(fromUrl).field;
    return user.targetJobId ? getJob(user.targetJobId).field : "all";
  });

  const [picked, setPicked] = useState(false);
  const pick = useCallback((choice: FieldChoice) => {
    setPicked(true);
    setField(choice);
  }, []);

  // The URL changed (a node, a prerequisite, «دليل», Back): follow it. Render-time adjustment, no effect.
  if (panel.url !== fromUrl) {
    setPanel({ skill: fromUrl ?? panel.skill, open: fromUrl !== null, url: fromUrl });
    if (fromUrl && field !== "all" && getSkill(fromUrl).field !== field) setField(getSkill(fromUrl).field);
  }

  // `url` mirrors the last ?skill= this component has SEEN; local opens and closes leave it alone, so the render between a
  // click and the URL catching up never mistakes the old URL for a new one (no flicker).
  const select = useCallback(
    (skill: SkillId) => {
      setPanel((p) => ({ ...p, skill, open: true }));
      router.replace(hrefFor({ screen: "skills", skill }), { scroll: false });
    },
    [router],
  );
  const close = useCallback(() => {
    setPanel((p) => ({ ...p, open: false }));
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const leaveTo = useCallback(
    (href: string) => {
      setPanel((p) => ({ ...p, open: false }));
      go(href);
    },
    [go],
  );
  const start = useCallback(
    (courseId: CourseId) => {
      if (courseState(courseId, user).state !== "started") {
        const result = useAppStore.getState().startCourse(courseId);
        if (result.ok && !result.already) toast({ title: TOAST_COPY.courseStarted, tone: "ok" });
      }
      leaveTo(hrefFor({ screen: "course", courseId }));
    },
    [leaveTo, user],
  );

  // Arriving on ?skill=: bring that node into view once (the panel opens over it).
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    if (fromUrl === null) return;
    document.querySelector(`[data-testid="${TID.skills.node(fromUrl)}"]`)?.scrollIntoView({ block: "center" });
  }, [fromUrl]);

  // The chosen field chip stays in view in its sideways row: the row scrolls by the chip's distance from its centre
  // (a relative physical delta, so RTL's negative scrollLeft never enters; and the page itself never scrolls).
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector(`[data-testid="${TID.skills.field(field)}"]`);
    if (!row || !chip) return;
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (r.left + r.width / 2);
    if (Math.abs(delta) > 1) row.scrollBy({ left: delta, behavior: instant ? "auto" : "smooth" });
  }, [field, instant]);

  const tabs: PillTab<FieldChoice>[] = [
    { id: "all", label: COPY.allFields, testId: TID.skills.field("all") },
    ...FIELDS.map((f) => ({
      id: f.id,
      label: f.name,
      // On a desktop the eight names fit in one row only without icons (the landscape shows each field's icon on its
      // sheet); on a phone the row scrolls sideways and the icons help find a field.
      icon: desktop ? undefined : <FieldIcon field={f.id} size={18} waypoint="muted" />,
      testId: TID.skills.field(f.id),
    })),
  ];

  const chain = panel.open && panel.skill ? chainOf(panel.skill) : null;
  const noLight = user.cv === null && summary.starsHeld === 0;
  const shownSkills = skillsHeld(replay.views.node);
  const shownStars = totalStars(replay.views.node);

  return (
    <main className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-gutter pt-6 pb-12">
      <header className="flex flex-col gap-4 @min-[760px]/content:flex-row @min-[760px]/content:items-end @min-[760px]/content:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-fg lg:sr-only">{PAGE_HEADINGS.skills}</h1>
          <p className="text-body text-fg-2">{subline(SKILLS.length, FIELDS.length)}</p>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-fg-2" data-testid={TID.skills.summary} data-value={summary.starsHeld}>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-h2 leading-none text-fg tabular-nums">
                <Roll id={shownSkills}>{formatNumber(shownSkills)}</Roll>
              </span>
              <span>من {countNoun(summary.skillsTotal, "skill")}</span>
            </span>
            <span aria-hidden className="text-fg-3">
              ·
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-h2 leading-none text-fg tabular-nums">
                <Roll id={shownStars}>{formatNumber(shownStars)}</Roll>
              </span>
              <span>من {countNoun(summary.starsTotal, "star")}</span>
            </span>
          </p>
        </div>
        <Legend className="@min-[760px]/content:pb-1.5" />
      </header>

      {noLight ? (
        <Card className="flex flex-col gap-4 @min-[640px]/content:flex-row @min-[640px]/content:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-dashed border-border-strong text-fg">
              <IconCv size={24} waypoint="muted" />
            </span>
            <p className="min-w-0 flex-1 text-title text-fg">{COPY.bannerTitle}</p>
          </div>
          <Button data-testid={TID.skills.bannerCv} icon={<IconArrowForward size={20} />} onClick={() => go(hrefFor({ screen: "cv" }))}>
            {COPY.bannerAction}
          </Button>
        </Card>
      ) : null}

      <div className="-mx-gutter overflow-x-auto px-gutter pb-1 [scrollbar-width:none]" ref={chipsRef}>
        <PillTabs active={field} className="min-w-max" label={COPY.fieldsLabel} onPick={pick} size="md" tabs={tabs} />
      </div>

      {/* No initial={false} here: it would reach every motion element below and cancel tree-grow. The first field
          simply does not animate in (the page rise carries it); later picks do. */}
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, transition: tween.exit }}
          initial={picked ? { opacity: 0, y: 8, scale: field === "all" ? 1 : 0.985 } : false}
          key={field}
          transition={tween.move}
        >
          {field === "all" ? (
            <div className={cn("grid grid-cols-1 gap-x-6 gap-y-8 @min-[680px]/content:grid-cols-2", LANDSCAPE)}>
              {FIELDS.map((f, i) => (
                <TreeRegion
                  chain={chain}
                  className={AREA[f.id]}
                  field={f.id}
                  arriving={!replay.settled}
                  grow={replay.grow}
                  index={i}
                  key={f.id}
                  next={next}
                  nodes={nodes}
                  onSelect={select}
                  views={replay.views}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[52rem]">
              <TreeRegion
                chain={chain}
                arriving={!replay.settled}
                field={field}
                grow={replay.grow}
                index={0}
                next={next}
                nodes={nodes}
                onSelect={select}
                size={desktop ? "lg" : "md"}
                views={replay.views}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <SkillPanel
        facts={user}
        node={panel.skill ? nodes[panel.skill] : null}
        onClose={close}
        onJobs={(skill) => leaveTo(hrefFor({ screen: "jobs", skill }))}
        onPick={select}
        onStart={start}
        open={panel.open}
        skill={panel.skill}
        stars={stars}
      />
    </main>
  );
}

export function SkillsScreen(): ReactNode {
  const user = useCurrentUser();
  return <PageTransition>{user ? <SkillsTree user={user} /> : null}</PageTransition>;
}
