"use client";
// Owner: map. The roadmap page /path («مساري»), the home of the product (spec 3.4, ARCHITECTURE 11.3). It ports the
// approved page design/explore/darb/map/final-home.html: a hill you can fly over. The sheet is drawn from the engine's
// roadmap by geometry.ts. Beside it (owner, 20 Nov): the real jobs and what is left to reach each one (job-cards.tsx), in
// the place of the next-step card, the target card and the leaderboard preview. This file owns the state: which opening this visit plays (decided once, on the first render),
// the hold, the wait for the daily reward, the replay when «دليلك» opens the map, the hand-over from the reveal, and which
// station the camera is at.
import { useCallback, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { IconArrowBack, IconStarFilled, IconTrophy } from "@/components/icons";
import { PageTransition, useGo, useInstant } from "@/components/motion";
import { Button, EmptyState, cn, toast } from "@/components/ui";
import { ConfirmTargetDialog, useViewport } from "@/features/shared";
import { TOAST_COPY, countNoun } from "@/lib/copy";
import { BADGES, getJob, getSkill } from "@/lib/data";
import { buildRoadmap, canonicalStages, courseState, dailyReward, levelFor, skillStars, streakInfo, totalXp } from "@/lib/engine";
import { formatNumber } from "@/lib/format";
import { hrefFor } from "@/lib/routes";
import { useAppStore, useClock, useCurrentUser, useOverlayHold, useUi } from "@/lib/store";
import { TID } from "@/lib/testids";
import type { JobId, MapHandover, Roadmap, RoadmapStage, UserState } from "@/lib/types";

import { Camera, type FlightTarget } from "./camera";
import { playOpening, type Opening } from "./choreography";
import { buildGeometry, minSheetHeight, type MapGeometry, type OpenForm, type SheetSize } from "./geometry";
import { MapSheet, type BranchLabel } from "./map-sheet";
import { BasedOnLine, JobCards } from "./job-cards";
import { BranchCards, PlayerPanel, type PlayerFacts } from "./side-cards";
import { StationCard, type CardSubject } from "./station-card";

import "./map.css";

/** The pause between the sheet being ready and the opening's first beat. */
const START_BEAT_MS = 180;
/** After the full opening comes to rest, the overlay queue (toasts) waits this long more. */
const TOASTS_AFTER_OPEN_MS = 450;

type Phase = "wait" | "play" | "rest";
type Handover = MapHandover & { readonly id: number };

export function MapScreen(): ReactNode {
  const user = useCurrentUser();
  // The roadmap depends on the target, the CV and the courses only: keyed on those, it keeps its identity when a replay
  // marker or an XP flag is written, so the sheet (and a flight in progress) is never redrawn for nothing.
  const targetJobId = user?.targetJobId ?? null;
  const cv = user?.cv ?? null;
  const cvSkipped = user?.cvSkipped ?? false;
  const courses = user?.courses;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roadmap = useMemo(() => (user === null ? null : buildRoadmap(user)), [targetJobId, cv, cvSkipped, courses]);
  const go = useGo();
  if (user === null) return null;
  if (roadmap === null) {
    return (
      <PageTransition>
        <main className="px-gutter py-8">
          <h1 className="sr-only">مسارك</h1>
          <EmptyState
            action={
              <Button data-testid={TID.path.emptyChooseJob} onClick={() => go(hrefFor({ screen: "jobs" }))}>
                اختر وظيفة
              </Button>
            }
            title="لم تختر هدفاً بعد."
          />
        </main>
      </PageTransition>
    );
  }
  return <MapHome key={roadmap.jobId} roadmap={roadmap} user={user} />;
}

/** A hand-over for recording and QA on the dev server only: `/path?map-sim=handover` plays the full form out of a strip. */
function simulatedHandover(jobId: JobId): Handover | null {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  if (new URLSearchParams(window.location.search).get("map-sim") !== "handover") return null;
  const count = canonicalStages(jobId).length + 2;
  const width = Math.min(window.innerWidth - 80, 880);
  const x0 = (window.innerWidth + width) / 2;
  const y = window.innerHeight * 0.52;
  const step = width / (count - 1);
  return {
    id: -1,
    jobId,
    stripStays: true,
    stripRect: { x: (window.innerWidth - width) / 2, y: y - 20, width, height: 40 },
    nodeRects: Array.from({ length: count }, (_, i) => ({ x: x0 - i * step - 8, y: y - 8, width: 16, height: 16 })),
  };
}

function MapHome({ user, roadmap }: { readonly user: UserState; readonly roadmap: Roadmap }): ReactNode {
  const instant = useInstant();
  const clock = useClock();
  const go = useGo();
  const viewport = useViewport();
  const titleId = useId();
  const blocking = useUi((state) => state.blocking);
  const mapOpenRequest = useUi((state) => state.mapOpenRequest);

  // ── decided once, on the first render (ARCHITECTURE 11.3) ──
  const [handover] = useState<Handover | null>(() => useUi.getState().mapHandover ?? simulatedHandover(roadmap.jobId));
  const [opening] = useState<OpenForm>(() => {
    if (!user.seen.mapOpenPlayed || handover?.id === -1) return "full";
    if (user.cv !== null && user.seen.catchUpForCv !== user.cv.analysedAt) return "catch-up";
    return "short";
  });
  const [ringFrom] = useState(() => (opening === "catch-up" ? 0 : (user.seen.pathMatch ?? (opening === "full" ? 0 : roadmap.match))));

  const [phase, setPhase] = useState<Phase>("wait");
  const [form, setForm] = useState<OpenForm>(opening);
  const [playId, setPlayId] = useState(0);
  const [fullEnded, setFullEnded] = useState(false);
  const [counted, setCounted] = useState(false);
  // The toasts of the onboarding (+80 XP and its badges) wait for the whole full opening, plus a beat once the sheet is
  // at rest, so they never drop over the road while it draws (21 Nov 2026: they covered stations 5-8 and the flag).
  const [fullSettled, setFullSettled] = useState(false);
  useEffect(() => {
    if (!fullEnded) return;
    const timer = window.setTimeout(() => setFullSettled(true), TOASTS_AFTER_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [fullEnded]);
  useOverlayHold("map-open-full", opening === "full" && !fullSettled);

  // ── the sheet's size: the drawing is computed for the pixels it has ──
  const mainRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState<boolean | null>(null);
  const [size, setSize] = useState<SheetSize | null>(null);
  useLayoutEffect(() => {
    const main = mainRef.current;
    const map = mapRef.current;
    if (main === null || map === null) return;
    const read = () => {
      setWide(main.offsetWidth >= 900);
      const width = Math.round(map.clientWidth);
      const height = Math.round(map.clientHeight);
      if (width > 0 && height > 0) setSize((prev) => (prev !== null && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(main);
    observer.observe(map);
    return () => observer.disconnect();
  }, []);
  const geometry = useMemo<MapGeometry | null>(() => (size === null ? null : buildGeometry(roadmap, size)), [roadmap, size]);
  const small = geometry !== null ? geometry.small : !viewport.desktop;
  const minHeight = minSheetHeight(roadmap, small);
  // One column (under 900 px of content: a phone, or beside the docked advisor panel): the real jobs come first, a row
  // that scrolls sideways (owner, 20 Nov: in the place of the target header and the next step), then the map. On a wide sheet the map takes the rest of the first
  // screen under them, so the whole page reads at once; on the phone sheet it is one screen tall (its stations keep room
  // to be pointed at) and starts right under the next step.
  const leadRef = useRef<HTMLDivElement>(null);
  const [leadHeight, setLeadHeight] = useState(0);
  useLayoutEffect(() => {
    const lead = leadRef.current;
    if (lead === null) return;
    const read = () => setLeadHeight(Math.round(lead.offsetHeight));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(lead);
    return () => observer.disconnect();
  }, [wide]);
  const lead = wide === false && !small ? leadHeight + 8 : 0;

  // ── derived content ──
  const level = useMemo(() => levelFor(totalXp(user)).level, [user]);
  // the stars the user holds in every skill: a star is drawn solid only when it is earned (DESIGN-BRIEF 3.5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stars = useMemo(() => skillStars(user), [user.cv, user.courses]);
  const job = getJob(roadmap.jobId);
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  const branches = useMemo<readonly BranchLabel[]>(() => roadmap.branches.map((b) => ({ jobId: b.jobId, title: getJob(b.jobId).title, now: b.now, after: b.after })), [roadmap]);

  // ── the opening ──
  const daily = useMemo(() => dailyReward(user, clock), [user, clock]);
  // the player plate and the rewards still to earn (GAME-LAYER 5.2)
  const player = useMemo<PlayerFacts>(
    () => ({
      name: firstName,
      avatar: user.avatar,
      total: totalXp(user),
      streak: streakInfo(user, clock).current,
      badges: { have: user.badges.length, total: BADGES.length },
      tomorrow: daily.tomorrow,
      todayDone: !daily.due,
    }),
    [user, clock, daily, firstName],
  );
  const ready = !daily.due && blocking !== "daily";
  const started = useRef(false);
  const openingRef = useRef<Opening | null>(null);

  const endForm = useEffectEvent((ended: OpenForm) => {
    setPhase("rest");
    if (ended !== "full") return;
    setFullEnded(true);
    clearHandover(handover);
  });
  const begin = useEffectEvent((next: OpenForm) => {
    const store = useAppStore.getState();
    if (next === "full") store.markSeen("mapOpenPlayed", true);
    // The full form already draws every station the CV proved as done (the CV is read in the onboarding, before the
    // map's first visit), so it stands for that CV's catch-up too. 21 Nov 2026: a catch-up chained after the full form
    // wiped the finished map and redrew it («أنت هنا» back at «البداية»). The map opens once.
    if ((next === "full" || next === "catch-up") && user.cv !== null) store.markSeen("catchUpForCv", user.cv.analysedAt);
    setCounted(true);
    setForm(next);
    if (instant) {
      endForm(next);
      return;
    }
    setPhase("play");
    setPlayId((id) => id + 1);
  });
  const hasSheet = geometry !== null;
  useEffect(() => {
    if (started.current || !ready || !hasSheet) return;
    // one short beat after the page has mounted, so the first frames of the opening are not lost to the page's own work
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      begin(opening);
    }, START_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [ready, hasSheet, opening]);

  const geometryRef = useRef<MapGeometry | null>(null);
  useLayoutEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);
  useLayoutEffect(() => {
    const root = mapRef.current;
    const g = geometryRef.current;
    if (phase !== "play" || root === null || g === null) return;
    const playing = playOpening(root, g, form);
    openingRef.current = playing;
    const timer = window.setTimeout(() => endForm(form), g.timeline[form].rest * 1000 + 40);
    return () => {
      window.clearTimeout(timer);
      playing.finish();
      openingRef.current = null;
    };
    // one run per play: `playId` changes with every begin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId, phase]);
  /** A click during the opening acts on the final state: the sheet jumps to rest first. */
  const settleOpening = useEffectEvent(() => {
    if (phase !== "play") return;
    openingRef.current?.finish();
    endForm(form);
  });

  // «دليلك» opens the map (also when /path is already on screen): the short form plays again
  const handledRequest = useRef(mapOpenRequest);
  useEffect(() => {
    if (mapOpenRequest === handledRequest.current) return;
    handledRequest.current = mapOpenRequest;
    if (!started.current || instant) return;
    dropFocus();
    begin("short");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapOpenRequest, instant]);

  // the hand-over is cleared when the full form ends (endForm), or when the map really unmounts before that
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.setTimeout(() => {
        if (!mounted.current) clearHandover(handover);
      }, 0);
    };
  }, [handover]);

  // the match count in «أنت هنا»: remember the match only after it has been shown
  const resting = phase === "rest";
  const seenMatch = user.seen.pathMatch;
  useEffect(() => {
    if (!resting || seenMatch === roadmap.match) return;
    const timer = window.setTimeout(() => useAppStore.getState().markSeen("pathMatch", roadmap.match), 1200);
    return () => window.clearTimeout(timer);
  }, [resting, seenMatch, roadmap.match]);

  // ── the camera ──
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focusSeq, setFocusSeq] = useState(0);
  const [hop, setHop] = useState(false);
  const focusRef = useRef<string | null>(null);
  const closing = useRef(false);
  const cameraRef = useRef<Camera | null>(null);
  const dropFocus = useCallback(() => {
    cameraRef.current?.reset();
    focusRef.current = null;
    closing.current = false;
    setFocusKey(null);
  }, []);
  useLayoutEffect(() => {
    const root = mapRef.current;
    if (root === null || geometry === null) return;
    const camera = new Camera(root, geometry);
    cameraRef.current = camera;
    return () => {
      camera.reset();
      cameraRef.current = null;
      focusRef.current = null;
      closing.current = false;
      setFocusKey(null); // the sheet was redrawn (a resize, a new roadmap): the overview again
    };
  }, [geometry]);
  useLayoutEffect(() => {
    const camera = cameraRef.current;
    const g = geometryRef.current;
    if (focusKey === null || camera === null || g === null) return;
    const target = targetOf(g, focusKey);
    if (target === null) return;
    if (g.small && mapRef.current !== null && !instant) {
      // the phone sheet covers the lower half: bring the map's top under the top bar before the camera flies
      const top = mapRef.current.getBoundingClientRect().top;
      const wanted = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-top")) * 16 || 64;
      if (Math.abs(top - wanted) > 12) window.scrollBy({ top: top - wanted - 8, behavior: "smooth" });
    }
    void camera.focus(target, cardRef.current, { sheet: g.small, instant });
    cardRef.current?.focus({ preventScroll: true });
    // `focusSeq` re-runs this for a press on the same station while the camera is returning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, focusSeq]);

  const closeCard = useCallback(() => {
    const camera = cameraRef.current;
    const g = geometryRef.current;
    const key = focusRef.current;
    if (key === null || closing.current || camera === null || g === null) return;
    closing.current = true;
    void camera.release(cardRef.current, { sheet: g.small, instant }).then((back) => {
      if (!back || !closing.current) return;
      closing.current = false;
      focusRef.current = null;
      setFocusKey(null);
      mapRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`)?.focus({ preventScroll: true });
    });
  }, [instant]);

  const openStation = useCallback(
    (key: string) => {
      settleOpening();
      if (focusRef.current === key && !closing.current) {
        closeCard(); // a second press on the open station returns
        return;
      }
      setHop(focusRef.current !== null && !closing.current);
      closing.current = false;
      focusRef.current = key;
      setFocusKey(key);
      setFocusSeq((n) => n + 1);
    },
    [closeCard],
  );

  // Esc, and a click anywhere outside the map and its card, return to the overview (the click still does its own work)
  const focused = focusKey !== null;
  useEffect(() => {
    if (!focused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement;
      const mine = active === null || active === document.body || mapRef.current?.contains(active) === true || cardRef.current?.contains(active) === true;
      if (useUi.getState().advisorOpen && !mine) return; // the advisor panel takes its own Esc
      event.preventDefault();
      closeCard();
    };
    const onClick = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mapRef.current?.contains(target) === true || cardRef.current?.contains(target) === true) return;
      closeCard();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [focused, closeCard]);
  const onMapClick = (event: MouseEvent<HTMLElement>) => {
    if (focusRef.current === null) return;
    if (event.target instanceof Element && event.target.closest("button, a, .dm-card") !== null) return;
    closeCard();
  };

  // ── actions ──
  const onGate = useCallback(() => go(hrefFor({ screen: "cv" })), [go]);
  const [confirmJob, setConfirmJob] = useState<JobId | null>(null);
  const complete = roadmap.complete;
  const onBranch = useCallback(
    (jobId: JobId) => {
      if (complete) setConfirmJob(jobId);
      else go(hrefFor({ screen: "job", jobId }));
    },
    [complete, go],
  );
  const onCourse = (stage: RoadmapStage, start: boolean) => {
    if (start) {
      const result = useAppStore.getState().startCourse(stage.courseId);
      if (result.ok && !result.already) toast({ title: TOAST_COPY.courseStarted, tone: "ok" });
    }
    go(hrefFor({ screen: "course", courseId: stage.courseId }));
  };

  // ── what the card shows ──
  const focusedStage = focusKey !== null && focusKey !== "summit" ? (roadmap.stages.find((s) => `s${s.n}` === focusKey) ?? null) : null;
  const subject: CardSubject | null = focusKey === "summit" ? { kind: "summit" } : focusedStage !== null ? { kind: "stage", stage: focusedStage, course: courseState(focusedStage.courseId, user) } : null;
  const card =
    subject !== null ? (
      <StationCard animate={!instant} hop={hop} onClose={closeCard} onCourse={onCourse} onJob={() => go(hrefFor({ screen: "job", jobId: roadmap.jobId }))} ref={cardRef} roadmap={roadmap} stars={stars} subject={subject} titleId={titleId} />
    ) : null;
  const sheetMode = geometry !== null && geometry.small;
  const content = typeof document === "undefined" ? null : document.getElementById("app-content");

  const T = geometry !== null ? geometry.timeline[form] : null;
  const shownMatch = counted || instant ? roadmap.match : ringFrom;
  const matchCount = useMemo(() => ({ value: shownMatch, from: ringFrom, delay: T !== null ? T.count : 0, duration: T !== null && T.countD > 0 ? T.countD : 0.6 }), [shownMatch, ringFrom, T]);
  const sign = geometry?.sign ?? null;
  // Out of the reveal the page does not fade in as a whole (PageTransition has no animation then): the jobs beside the
  // map arrive with the shell's own short rise instead of popping in on the first frame.
  const arrive = handover !== null && !instant ? "animate-rise [animation-delay:300ms]" : undefined;

  return (
    <PageTransition className={handover !== null ? "[animation:none]" : undefined}>
      <main className="px-3 pt-4 pb-4 @min-[900px]/content:px-7 @min-[900px]/content:pt-2 @min-[900px]/content:pb-6" ref={mainRef}>
        <h1 className="sr-only">مسارك</h1>
        <div className="grid items-start gap-x-5 gap-y-2 @min-[900px]/content:grid-cols-[minmax(0,1fr)_21.25rem]" style={{ ["--lead" as string]: `${lead}px` } as CSSProperties}>
          {wide === false ? (
            <div className={cn("min-w-0", arrive)} ref={leadRef}>
              <JobCards layout="row" user={user} />
            </div>
          ) : null}
          <section
            aria-label={`مسارك نحو ${job.title}`}
            className={cn(
              "dm relative h-[calc(100dvh-var(--shell-top)-var(--shell-bottom,0px)-var(--lead,0px)-1rem)]",
              "@min-[900px]/content:sticky @min-[900px]/content:top-[calc(var(--shell-top)+0.5rem)] @min-[900px]/content:h-[calc(100dvh-var(--shell-top)-2rem)]",
            )}
            data-dense={geometry?.dense ? "" : undefined}
            data-focus={focused ? "" : undefined}
            data-instant={instant ? "" : undefined}
            data-open={opening}
            data-phase={instant ? "rest" : phase}
            data-small={small ? "" : undefined}
            data-testid={TID.path.map}
            onClick={onMapClick}
            ref={mapRef}
            style={{ minHeight: Math.max(minHeight, small ? 420 : 560) }}
          >
            <div className="dm-cam">
              {geometry !== null ? (
                <MapSheet
                  avatar={user.avatar}
                  branches={branches}
                  g={geometry}
                  jobTitle={job.title}
                  level={level}
                  match={matchCount}
                  onBranch={onBranch}
                  onGate={onGate}
                  onStation={openStation}
                  peaksAreControls={wide === true}
                  roadmap={roadmap}
                  stars={stars}
                />
              ) : null}
            </div>
            {sign !== null ? (
              <div className="dm-sign dm-furniture dm-q" style={{ maxWidth: sign.maxWidth }}>
                <div className="dm-e">مسارك نحو</div>
                <h2>{job.title}</h2>
                <div className="dm-pg">
                  <span>
                    <b>{formatNumber(roadmap.doneCount)}</b> من {countNoun(roadmap.total, "stage")}
                  </span>
                  <span aria-hidden className="dm-pips">
                    {roadmap.stages.map((s) => (
                      <i data-s={s.state === "done" ? "done" : s.state === "current" ? "now" : undefined} key={s.n} />
                    ))}
                  </span>
                </div>
              </div>
            ) : null}
            {wide === true ? <p className="dm-caption dm-furniture dm-q">فروع تُفتح بعد هذا المسار</p> : null}
            <button className="dm-back" onClick={closeCard} tabIndex={focused ? 0 : -1} type="button">
              <IconArrowBack size={18} waypoint="off" />
              رجوع للخريطة
            </button>
            {sheetMode ? null : <i aria-hidden className="dm-leader" />}
            {sheetMode ? null : card}
          </section>

          {wide === null ? null : wide ? (
            // the real jobs, as tall as the map less the corner under the column (the launcher «اسأل دليلك» stands there);
            // the list scrolls past the first four
            <aside className={cn("flex min-w-0 flex-col", arrive, "@min-[900px]/content:sticky @min-[900px]/content:top-[calc(var(--shell-top)+0.5rem)] @min-[900px]/content:max-h-[calc(100dvh-var(--shell-top)-6.75rem)]")}>
              <JobCards className="min-h-0 flex-1" layout="column" user={user} />
              <BasedOnLine className="mt-2 px-1" jobId={roadmap.jobId} />
            </aside>
          ) : (
            <div className="mt-2 flex min-w-0 flex-col gap-4">
              <BranchCards branches={roadmap.branches} complete={complete} onBranch={onBranch} />
              <PlayerPanel player={player} />
              <BasedOnLine className="px-1" jobId={roadmap.jobId} />
            </div>
          )}
        </div>
      </main>
      {sheetMode && card !== null && content !== null ? createPortal(<div className="dm-sheet-layer">{card}</div>, content) : null}
      {/* the strip's nodes are on screen from the map's first frame (where the reveal left them, so there is no blank
          moment between the two pages) and set out when the full form plays */}
      {handover !== null && handover.stripStays && geometry !== null && opening === "full" && form === "full" && !fullEnded && !instant && (ready || phase === "play") ? (
        <HandoverDots g={geometry} handover={handover} mapRef={mapRef} play={phase === "play"} roadmap={roadmap} />
      ) : null}
      {confirmJob !== null ? <ConfirmTargetDialog jobId={confirmJob} onOpenChange={(open) => (open ? undefined : setConfirmJob(null))} open /> : null}
    </PageTransition>
  );
}

function targetOf(g: MapGeometry, key: string): FlightTarget | null {
  if (key === "summit") return { key, x: g.summit.x, y: g.summit.y, r: g.summit.r };
  const station = g.stations.find((s) => s.key === key);
  return station === undefined ? null : { key, x: station.x, y: station.y, r: station.r };
}

/** Clears the hand-over this visit read, unless a newer one has replaced it. */
function clearHandover(handover: Handover | null) {
  if (handover === null) return;
  const current = useUi.getState().mapHandover;
  if (current !== null && current.id === handover.id) useUi.getState().setMapHandover(null);
}

/** The strip's nodes reach their stations in this time; each then waits for its station's beat. */
const HANDOVER_TRAVEL_S = 0.95;
/** The cross-fade from a travelling node into its station (its coin settles, its label rises in the same place). */
const HANDOVER_FADE_S = 0.3;
/** A station's label hangs this far from its coin's edge (map.css `.dm-lb`: right: calc(100% + 18px)). */
const LABEL_GAP_PX = 18;

/**
 * The reveal hands its path strip over without a cut (spec 3.4 situation 1): its nodes (start, stages in canonical
 * order, goal) are already on screen where the reveal drew them, and each one travels to its place on the sheet as the
 * strip drew it: the white ring with its number (the waypoint at the start, the trophy at the goal) and its label beside
 * it. The ring grows or shrinks to the station's coin on the way, the label keeps its place beside the ring, and when the
 * station's own beat comes the node cross-fades into it. Never a placeholder disc: the strip's stages become the map's.
 */
function HandoverDots({
  handover,
  g,
  roadmap,
  mapRef,
  play,
}: {
  readonly handover: Handover;
  readonly g: MapGeometry;
  readonly roadmap: Roadmap;
  readonly mapRef: { readonly current: HTMLElement | null };
  /** False while the map waits for its first beat: the nodes stand where the strip drew them. */
  readonly play: boolean;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const canon = canonicalStages(roadmap.jobId);
  const last = handover.nodeRects.length - 1;
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!play || layer === null || map === null) return;
    const box = map.getBoundingClientRect();
    const T = g.timeline.full;
    const ease = "cubic-bezier(.5,0,.15,1)";
    const animations: Animation[] = [];
    Array.from(layer.children).forEach((node, i) => {
      const rect = handover.nodeRects[i];
      if (rect === undefined) return;
      let to = { x: g.start.x, y: g.start.y, r: g.start.r, t: T.start };
      if (i === last) to = { x: g.summit.x, y: g.summit.y, r: g.summit.r, t: T.flag };
      else if (i > 0) {
        const c = canon[i - 1];
        const station = g.stations.find((s) => s.stage !== null && c !== undefined && s.stage.skill === c.skill && s.stage.star === c.star);
        if (station === undefined) return;
        to = { x: station.x, y: station.y, r: station.r, t: station.t.full };
      }
      const d = Math.min(rect.width, rect.height);
      const from = `translate(${rect.x + rect.width / 2}px,${rect.y + rect.height / 2}px)`;
      const end = `translate(${box.left + to.x}px,${box.top + to.y}px)`;
      // a station whose beat comes early (the start, at 0.3 s) is reached sooner, so the node lands as its station
      // appears and the two never stand side by side
      const travelS = to.t < HANDOVER_TRAVEL_S ? Math.max(0.4, to.t + 0.1) : HANDOVER_TRAVEL_S;
      const fadeAt = Math.max(travelS, to.t);
      const total = fadeAt + HANDOVER_FADE_S;
      animations.push(
        node.animate(
          [
            { transform: from, opacity: 1, easing: ease },
            { transform: end, opacity: 1, offset: travelS / total },
            { transform: end, opacity: 1, offset: fadeAt / total },
            { transform: end, opacity: 0 },
          ],
          { duration: total * 1000, fill: "both" },
        ),
      );
      const travel = { duration: travelS * 1000, fill: "both", easing: ease } as const;
      const ring = node.querySelector(".dm-ho-ring");
      if (ring !== null) animations.push(ring.animate([{ transform: "scale(1)" }, { transform: `scale(${((2 * to.r) / d).toFixed(3)})` }], travel));
      // the label keeps its distance from the ring's edge while the ring changes size: it ends where the station's label is
      const label = node.querySelector(".dm-ho-lb");
      if (label !== null) {
        animations.push(label.animate([{ transform: "translate(0,-50%)" }, { transform: `translate(${(d / 2 - to.r).toFixed(1)}px,-50%)` }], travel));
        // map.css hides the labels where the strip left them (side by side they overlapped): each fades in on the
        // second half of the travel, when the nodes have spread out, and stays until its node hands over to the station
        animations.push(label.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: travelS * 1000, fill: "forwards", easing: "linear" }));
      }
    });
    return () => {
      for (const a of animations) a.cancel();
    };
  }, [play, g, handover, mapRef, canon, last]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div aria-hidden className="dm-handover" ref={layerRef}>
      {handover.nodeRects.map((rect, i) => {
        const d = Math.min(rect.width, rect.height);
        const kind = i === 0 ? "start" : i === last ? "goal" : "stage";
        const c = kind === "stage" ? canon[i - 1] : undefined;
        return (
          <span className="dm-ho" data-kind={kind} key={i} style={{ transform: `translate(${rect.x + rect.width / 2}px,${rect.y + rect.height / 2}px)` }}>
            <i className="dm-ho-ring" style={{ width: d, height: d, left: -d / 2, top: -d / 2 }}>
              {kind === "start" ? <i className="dm-ho-wp" /> : null}
              {kind === "stage" ? <b>{formatNumber(i)}</b> : null}
              {kind === "goal" ? <IconTrophy size={Math.round(d * 0.5)} waypoint="muted" /> : null}
            </i>
            <span className="dm-ho-lb" style={{ right: d / 2 + LABEL_GAP_PX }}>
              {kind === "start" ? <span className="dm-ho-start">البداية</span> : null}
              {kind === "goal" ? <b>{getJob(roadmap.jobId).title}</b> : null}
              {c !== undefined ? (
                <b>
                  <bdi>{getSkill(c.skill).name}</bdi>
                  <span className="dm-ho-stars">
                    {Array.from({ length: c.star }, (_, s) => (
                      <IconStarFilled key={s} size={14} waypoint="off" />
                    ))}
                  </span>
                </b>
              ) : null}
            </span>
          </span>
        );
      })}
    </div>,
    document.body,
  );
}

