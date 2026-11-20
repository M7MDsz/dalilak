"use client";
// /dev/motion: the motion-blocks gallery. One labelled cell per block of docs/COMPONENT-PLAYBOOK.md section 2, each with
// a «أعد» replay button (data-testid="replay-<block>") and realistic Arabic sample content (data-testid="motion-<block>").
// Owned by the motion-blocks agent. Sample people and companies are invented.
import { motion, useAnimate } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { IconAdvisor, IconChevronDown, IconRetry, IconXp } from "@/components/icons";
import {
  Burst,
  CV_STEPS,
  CV_STEPS_REDUCED,
  CelebrationBeats,
  Collapse,
  Edge,
  FocusInGroup,
  GainPreview,
  HereDot,
  HereMarker,
  Highlight,
  NavLink,
  NumberTicker,
  PageTransition,
  PillTabs,
  Podium,
  ReorderList,
  RevealStage,
  Ring,
  Roll,
  ScanLine,
  Sheet,
  ShowcaseStage,
  SkillTag,
  SkillTagGroup,
  StatusMark,
  SweepRows,
  WordsIn,
  graphemes,
  roadmapPoint,
  sCurve,
  useClimb,
  useFlights,
  useInstant,
  useSeen,
  useShow,
  useStill,
  useTypeOn,
  words,
  type BeatState,
  type CvStepId,
  type EdgeState,
  type MarkState,
  type Pt,
  type RevealLayer,
  type RevealStepId,
  type ShowStep,
  type SweepTile,
} from "@/components/motion";
import { beginDeparture } from "@/components/motion/route-departure";
import { cn } from "@/lib/cn";
import { formatGain, formatNumber } from "@/lib/format";
import { group, popIn, rise, spring, tween } from "@/lib/motion";

// ------------------------------------------------------------------------------------------------ frame

function useRun(): [number, () => void] {
  const [run, setRun] = useState(0);
  return [run, useCallback(() => setRun((r) => r + 1), [])];
}

function Cell({
  block,
  title,
  note,
  onReplay,
  wide = false,
  stage = false,
  children,
  bodyClassName,
}: {
  block: string;
  title: string;
  note: ReactNode;
  onReplay: () => void;
  wide?: boolean;
  stage?: boolean;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section data-testid={`motion-${block}`} className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-sheet", wide && "lg:col-span-2")}>
      <header className="flex items-start gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-snug font-bold text-ink">
            <bdi dir="ltr">{title}</bdi>
          </h2>
          <p className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{note}</p>
        </div>
        <button
          type="button"
          data-testid={`replay-${block}`}
          onClick={onReplay}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-sheet px-4 text-[15px] font-semibold text-ink transition-colors duration-200 hover:border-ink active:scale-[0.97] active:transition-none"
        >
          <IconRetry size={18} waypoint="off" />
          أعد
        </button>
      </header>
      <div data-surface={stage ? "stage" : undefined} className={cn("relative flex min-h-60 flex-1 items-center justify-center p-6", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

const Xp = ({ value, className }: { value: string; className?: string }) => (
  <span dir="ltr" className={cn("inline-flex items-center gap-1 font-bold text-xp-fg tabular-nums", className)}>
    <IconXp size={16} waypoint="off" />
    {value}
    <span className="text-[0.8em]">XP</span>
  </span>
);

const Person = ({ name, size = 40 }: { name: string; size?: number }) => (
  <span
    aria-hidden
    className="grid shrink-0 place-items-center rounded-full border-2 border-fg bg-surface-2 font-bold text-fg"
    style={{ width: size, height: size, fontSize: size * 0.42 }}
  >
    {name.slice(0, 1)}
  </span>
);

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-on-accent transition-colors duration-200 hover:bg-accent-hover active:scale-[0.97] active:bg-accent-press active:transition-none";
const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink bg-sheet px-5 text-base font-semibold text-ink transition-colors duration-200 hover:bg-sunk active:scale-[0.97] active:transition-none disabled:border-line disabled:text-ink-3 disabled:hover:bg-sheet";

// ------------------------------------------------------------------------------------------------ provider

function ProviderCell() {
  const [run, replay] = useRun();
  const instant = useInstant();
  const still = useStill();
  const [flags, setFlags] = useState<{ instant: boolean; still: boolean } | null>(null);
  useEffect(() => setFlags({ instant, still }), [instant, still]);
  return (
    <Cell block="provider" title="MotionProvider · useInstant" note={
        <>
          يحترم «تقليل الحركة» ووضع اللقطة الثابتة <bdi dir="ltr">?still=1</bdi>. النابض الافتراضي يصل بلا ارتداد.
        </>
      } onReplay={replay}>
      <div className="flex w-full max-w-sm flex-col gap-5">
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-base">
          <dt className="text-ink-2">حركة فورية (تقليل الحركة أو لقطة ثابتة)</dt>
          <dd data-testid="motion-instant" className="font-semibold text-ink">
            {flags === null ? "…" : flags.instant ? "نعم" : "لا"}
          </dd>
          <dt className="text-ink-2">لقطة ثابتة</dt>
          <dd className="font-semibold text-ink">{flags === null ? "…" : flags.still ? "نعم" : "لا"}</dd>
        </dl>
        <div className="relative h-10 w-72 self-center rounded-full bg-sunk">
          {/* no transition written: MotionConfig's default spring (0.3 s, no overshoot) moves it */}
          <motion.span className="absolute top-1 right-1 size-8 rounded-full bg-ink" initial={false} animate={{ x: run % 2 === 0 ? 0 : -248 }} />
        </div>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ route

function MiniJobs() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold text-ink">الوظائف</h3>
      {["محلل بيانات", "محلل أعمال"].map((t, i) => (
        <div key={t} className="flex items-center justify-between rounded-xl border border-line bg-sheet px-4 py-3">
          <span className="text-base font-semibold text-ink">{t}</span>
          <span dir="ltr" className="text-base font-bold text-ink tabular-nums">
            {i === 0 ? "70%" : "64%"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniJob() {
  return (
    <div className="flex items-center gap-5">
      <Ring value={70} size={88} />
      <div>
        <h3 className="text-xl font-bold text-ink">محلل بيانات</h3>
        <p className="text-base text-ink-2">شركة نخلة الرقمية · الرياض</p>
        <p className="mt-1 text-sm text-ink-3">جهة تجريبية</p>
      </div>
    </div>
  );
}

function RouteCell() {
  const instant = useInstant();
  const [page, setPage] = useState(0);
  const replay = () => {
    if (instant) {
      setPage((p) => p + 1);
      return;
    }
    beginDeparture(); // exactly what go() does: the page on screen leaves when the new one has mounted
    setPage((p) => p + 1); // the new page mounts held, the old one fades out in 120 ms, then the new one rises
  };
  return (
    <Cell block="route" title="PageTransition · NavLink · useGo" note="الصفحة القديمة تخرج أولاً في 120 جزءاً من الثانية، ثم ترتفع الجديدة 6 بكسل. لا تظهر صفحتان معاً." onReplay={replay}>
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="h-48 overflow-hidden rounded-xl border border-line bg-paper p-4">
          <PageTransition key={page}>{page % 2 === 0 ? <MiniJobs /> : <MiniJob />}</PageTransition>
        </div>
        <NavLink href="/dev" className="self-start text-[15px] font-semibold text-accent-ink underline decoration-dotted underline-offset-4">
          انتقال حقيقي إلى فهرس المعارض
        </NavLink>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ focus, words

function DaleelSays({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-lg gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper">
        <IconAdvisor size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">دليلك</p>
        {children}
      </div>
    </div>
  );
}

function FocusCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="focus" title="FocusInGroup" note="ردّ «دليلك» يتضح كتلةً كتلة: يرتفع 8 بكسل ويزول الضباب، بفاصل 80 جزءاً من الثانية." onReplay={replay}>
      <DaleelSays>
        <FocusInGroup
          key={run}
          className="flex flex-col gap-3 text-base leading-relaxed text-ink"
          blocks={[
            {
              id: "a",
              node: (
                <p>
                  أهلاً سارة. قطعتِ محطتين من ست، وتطابقكِ مع «محلل بيانات» الآن <bdi dir="ltr">70%</bdi>.
                </p>
              ),
            },
            {
              id: "b",
              node: (
                <p>
                  محطتكِ التالية «<bdi>SQL</bdi> للمبتدئين»: ست ساعات، وبعدها يرتفع تطابقكِ إلى <bdi dir="ltr">78%</bdi>.
                </p>
              ),
            },
            {
              id: "c",
              node: (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-sheet px-4 py-3">
                  <div>
                    <p className="text-base font-bold text-ink">
                      <bdi>SQL</bdi> للمبتدئين
                    </p>
                    <p className="text-sm text-ink-2">6 ساعات · دورة تجريبية</p>
                  </div>
                  <Xp value="+200" />
                </div>
              ),
            },
          ]}
        />
      </DaleelSays>
    </Cell>
  );
}

function WordsCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="words" title="WordsIn" note="عنوان يصل كلمةً كلمة (50 جزءاً من الثانية). الحروف لا تُفصل أبداً، والكلمات اللاتينية المتتالية تبقى معاً." onReplay={replay}>
      <div className="flex max-w-lg flex-col gap-3">
        <h3 className="text-3xl leading-snug font-bold text-ink-2">
          <WordsIn key={`a${run}`} text="أهلاً سارة، مساركِ نحو محلل بيانات جاهز" wordClassName={(w) => (w.startsWith("سارة") ? "inline-block text-ink" : undefined)} />
        </h3>
        <p className="text-xl font-semibold text-ink">
          <WordsIn key={`b${run}`} text="بعد أربع محطات تتقنين Power BI ويرتفع تطابقكِ إلى 90%" delay={0.4} />
        </p>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ roll, ticker

const STATUS = ["أقرأ سيرتكِ…", "أطابق مهاراتكِ بعشرين وظيفة…", "أرسم مساركِ…"];
const LEVELS = ["مُتعلّمة", "مجتهدة", "متمكّنة"];
const RANKS = [7, 6, 5, 7];

function RollCell() {
  const [run, replay] = useRun();
  const rank = RANKS[run % RANKS.length] ?? 7;
  const prev = RANKS[(run + RANKS.length - 1) % RANKS.length] ?? 7;
  return (
    <Cell block="roll" title="Roll" note="قيمة تحل محل أخرى في سطر مقصوص: القديمة تخرج للأعلى والجديدة تدخل من الأسفل، 420 جزءاً من الثانية." onReplay={replay}>
      <dl className="grid w-full max-w-md grid-cols-[auto_1fr] items-center gap-x-6 gap-y-4 text-base">
        <dt className="text-ink-2">سطر الحالة</dt>
        <dd className="font-medium">
          <Roll id={run % STATUS.length}>
            <span className="shimmer-text">{STATUS[run % STATUS.length]}</span>
          </Roll>
        </dd>
        <dt className="text-ink-2">عدّاد الخطوات</dt>
        <dd className="font-semibold text-ink">
          السؤال{" "}
          <Roll id={(run % 6) + 1}>
            <span dir="ltr" className="tabular-nums">
              {(run % 6) + 1}
            </span>
          </Roll>{" "}
          من 6
        </dd>
        <dt className="text-ink-2">اللقب</dt>
        <dd className="text-xl font-bold text-ink">
          <Roll id={run % LEVELS.length}>{LEVELS[run % LEVELS.length]}</Roll>
        </dd>
        <dt className="text-ink-2">الترتيب</dt>
        <dd className="text-2xl font-bold text-ink">
          <Roll id={rank} dir={rank > prev ? -1 : 1}>
            <span dir="ltr" className="tabular-nums">
              {rank}
            </span>
          </Roll>
        </dd>
      </dl>
    </Cell>
  );
}

function TickerCell() {
  const [run, replay] = useRun();
  const total = run % 2 === 0 ? 1240 : 1440;
  return (
    <Cell block="ticker" title="NumberTicker" note="الأرقام الكبيرة تُعدّ ولا تُبدَّل: 800 جزء من الثانية، أرقام لاتينية بعرض ثابت." onReplay={replay}>
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-8 place-items-center">
          {run % 2 === 1 && (
            <motion.span key={run} variants={popIn} initial="hidden" animate="show" className="rounded-full bg-xp px-3 py-1">
              <span dir="ltr" className="text-base font-bold text-ink">
                +200 XP
              </span>
            </motion.span>
          )}
        </span>
        <p className="flex items-baseline gap-2 text-ink">
          <NumberTicker value={total} className="text-5xl font-bold" />
          <span className="text-lg font-semibold text-ink-2">XP</span>
        </p>
        <p className="text-base text-ink-2">
          بقي <NumberTicker value={1500 - total > 0 ? 1500 - total : 0} className="font-bold text-xp-ink" /> XP للمستوى 4
        </p>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ ring, gain

function RingCell() {
  const [run, replay] = useRun();
  const big = run % 2 === 0 ? 70 : 90;
  return (
    <Cell block="ring" title="Ring" note="حلقة مفتوحة: قوس متصل من الساعة 12 مع عقارب الساعة ينتهي بنقطة الطريق، والباقي منقّط. الرقم والقوس قيمة واحدة." onReplay={replay} wide>
      <div className="flex w-full flex-wrap items-center justify-center gap-8">
        <div className="flex items-end gap-6">
          {[40, 64, 96].map((s) => (
            <figure key={`${s}-${run}`} className="flex flex-col items-center gap-2">
              <Ring value={70} from={0} size={s} />
              <figcaption dir="ltr" className="text-sm text-ink-3 tabular-nums">
                {s}px
              </figcaption>
            </figure>
          ))}
        </div>
        <figure className="flex flex-col items-center gap-2">
          <Ring value={big} size={160} />
          <figcaption dir="ltr" className="text-sm text-ink-3 tabular-nums">
            160px
          </figcaption>
        </figure>
        <div data-surface="stage" data-testid="ring-stage" className="flex items-center gap-5 rounded-2xl p-5">
          <Ring key={`stage-${run}`} value={90} from={0} size={112} />
          <div>
            <p className="text-lg font-bold text-fg">على المسرح</p>
            <p className="text-sm text-fg-2">الألوان تنقلب وحدها، والفتحة حول النقطة فراغ حقيقي</p>
          </div>
        </div>
      </div>
    </Cell>
  );
}

function GainCell() {
  const [run, replay] = useRun();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (run > 0) setOn((v) => !v);
  }, [run]);
  return (
    <Cell block="gain" title="GainPreview" note="ماذا تضيف الدورة: ساق تالية منقّطة بلون الإشارة وعلامة مفتوحة عند القيمة المتوقعة. مرّر الفأرة، أو المس على الهاتف، أو اضغط Enter." onReplay={replay}>
      <div className="flex flex-col items-center gap-2">
        <GainPreview match={70} projected={90} size={112} on={on} onToggle={setOn} />
        <p className="text-sm text-ink-3">
          <bdi>SQL</bdi> للمبتدئين يرفع تطابقكِ
        </p>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ edge, here

const MAP_W = 300;
const MAP_ROW = 58;
const MAP_TOP = 30;
const MAP_N = 5;
const MAP_H = MAP_TOP * 2 + (MAP_N - 1) * MAP_ROW;
const mapPoints: Pt[] = Array.from({ length: MAP_N }, (_, i) => {
  const p = roadmapPoint(i, MAP_W, MAP_ROW, MAP_TOP);
  return { x: p.x, y: MAP_H - p.y }; // the trail climbs: start at the bottom
});
const mapLegs = mapPoints.slice(1).map((p, i) => sCurve(mapPoints[i] ?? p, p));
const mapSpine = mapLegs.map((d, i) => (i === 0 ? d : d.replace(/^M[^C]*/, ""))).join(" ");

type StationState = "done" | "doneNow" | "current" | "upcoming";

function Station({ state, n }: { state: StationState; n: number }) {
  if (state === "done" || state === "doneNow") return <StatusMark state="done" size={28} appear={state === "doneNow"} label={`المحطة ${n}: تمّت`} />;
  if (state === "current")
    return (
      <motion.span variants={popIn} initial="hidden" animate="show" className="relative grid size-9 place-items-center rounded-full bg-accent text-[15px] font-bold text-on-accent">
        <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full border border-accent" />
        {n}
      </motion.span>
    );
  return <span className="grid size-8 place-items-center rounded-full border-2 border-dotted border-line-strong bg-sheet text-sm font-semibold text-ink-2">{n}</span>;
}

function MiniMap({
  edges,
  stations,
  onDrawn,
  under,
  children,
}: {
  edges: EdgeState[];
  stations: StationState[];
  onDrawn?: () => void;
  /** Drawn above the line and below the stations (the HereMarker rides here, so a station covers it on arrival). */
  under?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative" style={{ width: MAP_W, height: MAP_H }}>
      <svg className="absolute inset-0" width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden>
        {mapLegs.map((d, i) => (
          <Edge key={i} d={d} state={edges[i] ?? "locked"} onDrawn={onDrawn} />
        ))}
      </svg>
      {under}
      {mapPoints.map((p, i) => (
        <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
          <Station state={stations[i] ?? "upcoming"} n={i + 1} />
        </span>
      ))}
      {children}
    </div>
  );
}

function EdgeCell() {
  const [run, replay] = useRun();
  const [phase, setPhase] = useState<0 | 1 | 2>(2);
  useEffect(() => {
    if (run === 0) return;
    setPhase(0);
    const t = window.setTimeout(() => setPhase(1), 500);
    return () => window.clearTimeout(t);
  }, [run]);
  const edges: EdgeState[] = phase === 0 ? ["done", "next", "locked", "locked"] : phase === 1 ? ["done", "drawing", "locked", "locked"] : ["done", "done", "next", "locked"];
  const stations: StationState[] =
    phase < 2 ? ["done", "done", "current", "upcoming", "upcoming"] : ["done", "done", run === 0 ? "done" : "doneNow", "current", "upcoming"];
  return (
    <Cell block="edge" title="Edge" note="المقطوع حبر متصل، والطريق أمامك نقاط واضحة، والساق التالية نقاط بلون الإشارة. عند إتمام محطة يُرسم الخط فوق النقاط." onReplay={replay}>
      <MiniMap key={run} edges={edges} stations={stations} onDrawn={() => setPhase(2)} />
    </Cell>
  );
}

function HereCell() {
  const [run, replay] = useRun();
  const spine = useRef<SVGPathElement>(null);
  const legRefs = useRef<(SVGPathElement | null)[]>([]);
  const [stops, setStops] = useState<number[] | null>(null);
  const [arrivedRun, setArrivedRun] = useState(0); // run 0 rests at the end
  const arrived = arrivedRun === run;
  useLayoutEffect(() => {
    const lengths = legRefs.current.map((el) => el?.getTotalLength() ?? 0);
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    setStops([0, ...lengths.map((l) => (acc += l) / total)]);
  }, []);
  const here = mapPoints[3] ?? { x: 0, y: 0 };
  return (
    <Cell block="here" title="HereMarker" note="«أنت هنا» يسير على الخط نفسه من البداية إلى محطتك الحالية (نصف ثانية لكل محطة)، فتضيء المحطة حين يصلها، ثم تظهر التسمية بجانبها." onReplay={replay}>
      {/* shifted 20 px (physical) to leave room for the label on the station's right */}
      <div className="-translate-x-5">
        <MiniMap
          edges={["done", "done", "done", "next"]}
          stations={["done", "done", "done", arrived ? "current" : "upcoming", "upcoming"]}
          under={
            <>
              <svg className="pointer-events-none absolute inset-0" width={MAP_W} height={MAP_H} aria-hidden>
                <path ref={spine} d={mapSpine} fill="none" stroke="none" />
                {mapLegs.map((d, i) => (
                  <path
                    key={i}
                    ref={(el) => {
                      legRefs.current[i] = el;
                    }}
                    d={d}
                    fill="none"
                    stroke="none"
                  />
                ))}
              </svg>
              {stops !== null && (
                <HereMarker key={run} spine={spine} from={run === 0 ? undefined : 0} target={stops[3] ?? 1} hops={3} delay={0.2} onArrive={() => setArrivedRun(run)}>
                  <HereDot size={14} />
                </HereMarker>
              )}
            </>
          }
        >
          {arrived && (
            // physical left: map geometry is in SVG px. The label sits on the side of the station the trail does not use.
            <motion.span
              variants={popIn}
              initial={run === 0 ? false : "hidden"}
              animate="show"
              className="absolute -translate-y-1/2 rounded-lg bg-solid px-2.5 py-1 text-sm font-semibold whitespace-nowrap text-on-solid"
              style={{ left: here.x + 26, top: here.y }}
            >
              أنت هنا · <bdi dir="ltr">70%</bdi>
            </motion.span>
          )}
        </MiniMap>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ status, show

function StatusCell() {
  const [run, replay] = useRun();
  const [live, setLive] = useState<MarkState>("done");
  const [fail, setFail] = useState<MarkState>("failed");
  useEffect(() => {
    if (run === 0) return;
    setLive("pending");
    setFail("running");
    const a = window.setTimeout(() => setLive("running"), 500);
    const b = window.setTimeout(() => setFail("failed"), 1500);
    const c = window.setTimeout(() => setLive("done"), 1900);
    return () => [a, b, c].forEach((t) => window.clearTimeout(t));
  }, [run]);
  const fixed: [MarkState, string][] = [
    ["pending", "بانتظار"],
    ["running", "جارٍ"],
    ["done", "تمّ"],
    ["failed", "تعذّر"],
  ];
  return (
    <Cell block="status" title="StatusMark" note="علامة واحدة لأربع حالات. عند الإتمام يهبط القرص ويُرسم الصح في 240 جزءاً من الثانية بعد 120." onReplay={replay}>
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-8">
          {fixed.map(([s, l]) => (
            <figure key={s} className="flex flex-col items-center gap-2">
              <StatusMark state={s} />
              <figcaption className="text-sm text-ink-2">{l}</figcaption>
            </figure>
          ))}
        </div>
        <div data-surface="stage" data-testid="status-stage" className="flex gap-8 rounded-xl px-6 py-4">
          {fixed.map(([s, l]) => (
            <figure key={s} className="flex flex-col items-center gap-2">
              <StatusMark state={s} />
              <figcaption className="text-sm text-fg-2">{l}</figcaption>
            </figure>
          ))}
        </div>
        <div className="flex items-center gap-8 rounded-xl border border-line px-5 py-3">
          <span className="flex items-center gap-3 text-base text-ink">
            <StatusMark state={live} size={28} />
            أرسلنا طلبكِ
          </span>
          <span className="flex items-center gap-3 text-base text-ink">
            <StatusMark state={fail} size={28} />
            قراءة الملف
          </span>
        </div>
      </div>
    </Cell>
  );
}

// the status lines of PRODUCT-SPEC 6.3 (copy belongs to the screens; the steps come from the blocks)
const CV_LINES: Record<CvStepId, string> = {
  read: "أقرأ سيرتك سطراً سطراً…",
  extract: "ألتقط المهارات من كلامك…",
  evidence: "أربط كل مهارة بالجملة التي تثبتها…",
  level: "أقدّر مستوى كل مهارة بالنجوم…",
  match: "أقارن مهاراتك مع 20 وظيفة…",
  done: "انتهيت: وجدت 8 مهارات.",
};

function ShowDemo() {
  const instant = useInstant();
  const [play, setPlay] = useState(true);
  const [ended, setEnded] = useState(false);
  // reduced motion: the results open directly (the spec's one rule); CV_STEPS_REDUCED is just `done`
  const show = useShow(instant ? CV_STEPS_REDUCED : CV_STEPS, play, () => setEnded(true));
  const at = Math.max(0, CV_STEPS.findIndex((s) => s.id === show.id));
  return (
    <div className="flex w-full max-w-lg flex-col gap-5">
      <ol className="flex items-center justify-between" aria-label="خطوات التحليل">
        {CV_STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center">
            <StatusMark state={show.done || i < at ? "done" : i === at && show.playing ? "running" : "pending"} size={26} />
          </li>
        ))}
      </ol>
      <p className="text-lg font-medium" data-testid="show-step" data-value={at + 1}>
        <Roll id={show.id ?? "none"}>
          <span className={show.done ? "font-semibold text-ink" : "shimmer-text"}>{show.id ? CV_LINES[show.id] : ""}</span>
        </Roll>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={secondaryButton} onClick={() => setPlay(false)} disabled={!show.playing}>
          أوقف
        </button>
        <button type="button" className={secondaryButton} onClick={show.skip} disabled={show.done}>
          اقفز إلى النتيجة
        </button>
        <span className="text-sm text-ink-3">
          الخطوة <bdi dir="ltr">{at + 1}/{CV_STEPS.length}</bdi> · {show.playing ? "يعمل" : ended ? "انتهى" : "متوقف"}
        </span>
      </div>
    </div>
  );
}

function ShowCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="show" title="useShow" note="مخرج العروض: خطوة في حالة React، تدوم مدتها الدنيا وحتى ينتهي العمل الحقيقي (12 ثانية حداً). يُوقَف ويُتخطّى." onReplay={replay}>
      <ShowDemo key={run} />
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ CV pieces

function HighlightCell() {
  const [run, replay] = useRun();
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (run === 0) return;
    setOn(false);
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(f);
  }, [run]);
  return (
    <Cell block="highlight" title="Highlight · .evidence" note="علامة الدليل في السيرة: لون مسطّح يُرسم من اليمين ويلتف عبر الأسطر، 600 جزء من الثانية." onReplay={replay}>
      <p className="max-w-md text-[17px] leading-[2.1] text-ink">
        <Highlight on={on}>
          حلّلتُ بيانات المبيعات الشهرية باستخدام <bdi>Excel</bdi> والجداول المحورية
        </Highlight>
        ، و
        <Highlight on={on} delay={0.2}>
          أعددتُ تقارير أسبوعية للإدارة
        </Highlight>
        . كما{" "}
        <Highlight on={on} delay={0.4}>
          كتبتُ استعلامات <bdi>SQL</bdi> بسيطة لاستخراج البيانات
        </Highlight>
        .
      </p>
    </Cell>
  );
}

// three evidence lines of the sample CV (PRODUCT-SPEC 6.2): one sentence per line, as a CV is written
const CV_SKILLS = [
  { id: "excel", name: "Excel", line: ["تنظيف بيانات المبيعات الأسبوعية وتلخيصها في ", "Excel", "."] },
  { id: "sql", name: "SQL", line: ["كتابة استعلامات ", "SQL", " لاستخراج أرقام الفروع."] },
  { id: "talk", name: "التواصل الفعّال", line: ["التواصل، العمل الجماعي، العرض والتقديم.", "", ""] },
] as const;

function SkillTagCell() {
  const [run, replay] = useRun();
  const [phase, setPhase] = useState<("none" | "sentence" | "tray")[]>(["tray", "tray", "tray"]);
  useEffect(() => {
    if (run === 0) return;
    setPhase(["none", "none", "none"]);
    const timers: number[] = [];
    CV_SKILLS.forEach((_, i) => {
      const at = 300 + i * 700;
      timers.push(window.setTimeout(() => setPhase((p) => p.map((v, j) => (j === i ? "sentence" : v))), at));
      timers.push(window.setTimeout(() => setPhase((p) => p.map((v, j) => (j === i ? "tray" : v))), at + 450));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [run]);
  const restored = run === 0;
  return (
    <Cell block="skilltag" title="SkillTag · SkillTagGroup" note="المهارة تقفز عند نهاية سطرها ثم تطير إلى الصينية بنفس المعرّف (نابض لطيف). لا تغطي الجملة التي تثبتها، ولا يتمدد شيء." onReplay={replay}>
      <SkillTagGroup>
        <div className="flex w-full max-w-lg flex-col gap-5">
          <ul className="flex flex-col gap-1 rounded-xl border border-line bg-sheet px-5 py-4 text-base leading-[2] text-ink">
            {CV_SKILLS.map((s, i) => (
              <li key={s.id} className="flex gap-2">
                <span aria-hidden className="text-ink-3">
                  -
                </span>
                <span className="min-w-0">
                  <Highlight on={phase[i] !== "none"}>
                    {s.line[0]}
                    {s.line[1] && <bdi>{s.line[1]}</bdi>}
                    {s.line[2]}
                  </Highlight>
                  {phase[i] === "sentence" && <SkillTag id={s.id} name={<bdi>{s.name}</bdi>} where="sentence" />}
                </span>
              </li>
            ))}
          </ul>
          <div className="min-h-[52px] rounded-xl border border-dashed border-line-strong p-2.5">
            <p className="sr-only">المهارات التي وجدناها</p>
            <div className="flex flex-wrap gap-2">
              {CV_SKILLS.map((s, i) =>
                phase[i] === "tray" ? <SkillTag key={s.id} id={s.id} name={<bdi>{s.name}</bdi>} where="tray" restored={restored} /> : null,
              )}
            </div>
          </div>
        </div>
      </SkillTagGroup>
    </Cell>
  );
}

const APPLY_NAME = "سارة العتيبي";
const APPLY_NOTE = "أتقدّم لوظيفة محلل بيانات. أتقن Excel وأتعلّم SQL الآن في مساري، وحلّلت بيانات مبيعات شهرية في تدريبي.";

function TypeOnDemo() {
  const nameUnits = useMemo(() => graphemes(APPLY_NAME), []);
  const noteUnits = useMemo(() => words(APPLY_NOTE), []);
  const name = useTypeOn(nameUnits, 400, true);
  const note = useTypeOn(noteUnits, 2000, name.done);
  const filling = !note.done;
  return (
    <form className="flex w-full max-w-md flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold text-ink">الاسم</span>
        <input readOnly value={name.value} className="h-12 rounded-xl border-[1.5px] border-line-strong bg-sheet px-4 text-base text-ink outline-none focus:border-ink" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold text-ink">رسالة قصيرة</span>
        <textarea readOnly rows={3} value={note.value} className="resize-none rounded-xl border-[1.5px] border-line-strong bg-sheet px-4 py-3 text-base leading-relaxed text-ink outline-none focus:border-ink" />
      </label>
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <IconAdvisor size={18} />
        {filling ? "دليلك يملأ الطلب…" : "اكتمل الطلب، راجعيه قبل الإرسال"}
      </p>
    </form>
  );
}

function TypeOnCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="typeon" title="useTypeOn" note="«دليلك» يملأ حقلاً حقيقياً: الاسم حرفاً حرفاً في 400 جزء من الثانية، والرسالة كلمةً كلمة في ثانيتين." onReplay={replay}>
      <TypeOnDemo key={run} />
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ sheet

function SheetCell() {
  const [open, setOpen] = useState(false);
  const [returned, setReturned] = useState<string | null>(null);
  return (
    <Cell block="sheet" title="Sheet" note="ورقة من الأسفل على الهاتف ونافذة في الوسط على الحاسوب: ترتفع 16 بكسل في 200 جزء وتعود في 150. التركيز محبوس ويعود لمن فتحها." onReplay={() => setOpen(true)}>
      <div className="flex flex-col items-center gap-3">
        <button type="button" data-testid="sheet-trigger" className={primaryButton} onClick={() => setOpen(true)}>
          افتحي محطة <bdi>SQL</bdi>
        </button>
        <p data-testid="sheet-focus" className="min-h-6 text-sm text-ink-2">
          {returned === null ? "" : `عاد التركيز إلى: «${returned}»`}
        </p>
      </div>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="SQL للمبتدئين"
        description="المحطة 3 من 6 في مساركِ نحو محلل بيانات."
        testId="sheet-demo"
        onOpenChangeComplete={(isOpen) => {
          if (isOpen) {
            setReturned(null);
            return;
          }
          requestAnimationFrame(() => {
            const el = document.activeElement;
            setReturned(el instanceof HTMLElement && el !== document.body ? (el.textContent ?? "").trim() : "لا شيء");
          });
        }}
        footer={
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryButton} onClick={() => setOpen(false)}>
              ابدئي الدورة
            </button>
            <button type="button" className={secondaryButton} onClick={() => setOpen(false)}>
              ليس الآن
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 text-base text-ink-2">
            <span>6 ساعات</span>
            <Xp value="+200" />
            <span>
              يرفع تطابقكِ إلى <bdi dir="ltr">78%</bdi>
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {["ما قاعدة البيانات؟", "أول استعلام SELECT", "التصفية بـ WHERE"].map((t, i) => (
              <li key={t} className="flex items-center gap-3 text-base text-ink">
                <StatusMark state={i === 0 ? "done" : "pending"} size={22} />
                <bdi>{t}</bdi>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ fly

function FlyCell() {
  const instant = useInstant();
  const { fly, layer } = useFlights();
  const source = useRef<HTMLSpanElement>(null);
  const [chip, animateChip] = useAnimate<HTMLSpanElement>();
  const [total, setTotal] = useState(1240);
  const go = async () => {
    await fly(source.current, chip.current, <Xp value="+200" className="rounded-full bg-xp-soft px-3 py-1" />, "hide"); // "hide": the demo replays
    setTotal((t) => t + 200); // NumberTicker counts from what is on screen
    if (!instant) void animateChip(chip.current, { scale: [1, 1.04, 1] }, tween.move);
  };
  return (
    <Cell block="fly" title="FlyToken · useFlights" note="الجائزة تُرى وهي تهبط في المجموع: الرمز يغادر الإشعار ويطير بقوس نحو الأعلى إلى شريحة المستخدم، ثم يُعدّ الرقم." onReplay={go}>
      <div className="flex w-full max-w-lg items-start justify-between gap-6">
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-sheet px-4 py-3">
          <p className="text-base font-semibold text-ink">
            أكملتِ <bdi>SQL</bdi> للمبتدئين
          </p>
          <span ref={source} className="self-start">
            <Xp value="+200" className="rounded-full bg-xp-soft px-3 py-1" />
          </span>
        </div>
        <span ref={chip} data-testid="fly-chip" className="inline-flex items-center gap-3 rounded-full border border-line bg-sheet py-1.5 ps-1.5 pe-4">
          <Person name="سارة" size={36} />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-ink">سارة</span>
            <span className="inline-flex items-center gap-1 text-[15px] font-bold text-xp-ink">
              <NumberTicker value={total} />
              <span className="text-xs">XP</span>
            </span>
          </span>
        </span>
      </div>
      {layer}
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ lists

const JOBS = [
  { id: "da", title: "محلل بيانات", company: "شركة نخلة الرقمية", match: 70, fresh: 3 },
  { id: "ba", title: "محلل أعمال", company: "مجموعة الأفق للاستشارات", match: 64, fresh: 1 },
  { id: "fe", title: "مطوّر واجهات", company: "استوديو سدرة", match: 52, fresh: 5 },
  { id: "mk", title: "أخصائي تسويق رقمي", company: "وكالة رمال", match: 48, fresh: 2 },
  { id: "hr", title: "محلل موارد بشرية", company: "شركة مدار للخدمات", match: 41, fresh: 4 },
];

function ReorderCell() {
  const [run, replay] = useRun();
  const byFresh = run % 2 === 1;
  const rows = [...JOBS].sort((a, b) => (byFresh ? a.fresh - b.fresh : b.match - a.match));
  return (
    <Cell block="reorder" title="ReorderList" note="الصفوف تنزلق إلى ترتيبها الجديد بنابض لطيف بدل أن تقفز؛ النص لا يتمدد." onReplay={replay}>
      <div className="flex w-full max-w-md flex-col gap-3">
        <p className="text-sm font-semibold text-ink-2">{byFresh ? "الترتيب: الأحدث" : "الترتيب: الأعلى تطابقاً"}</p>
        <ReorderList
          className="flex flex-col gap-2"
          itemClassName="rounded-xl"
          rows={rows.map((j) => ({
            id: j.id,
            me: j.id === "da",
            node: (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-sheet px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-ink">{j.title}</p>
                  <p className="text-sm text-ink-3">{j.company} · جهة تجريبية</p>
                </div>
                <span dir="ltr" className="text-lg font-bold text-ink tabular-nums">
                  {j.match}%
                </span>
              </div>
            ),
          }))}
        />
      </div>
    </Cell>
  );
}

function TabsCell() {
  const [run, replay] = useRun();
  const views = [
    { id: "map", label: "خريطة" },
    { id: "list", label: "قائمة" },
  ] as const;
  const fields = [
    { id: "all", label: "الكل" },
    { id: "data", label: "البيانات" },
    { id: "software", label: "البرمجيات" },
    { id: "design", label: "التصميم" },
  ] as const;
  const [view, setView] = useState<(typeof views)[number]["id"]>("map");
  const [field, setField] = useState<(typeof fields)[number]["id"]>("all");
  useEffect(() => {
    if (run === 0) return;
    setView((v) => (v === "map" ? "list" : "map"));
    setField((f) => fields[(fields.findIndex((x) => x.id === f) + 1) % fields.length]?.id ?? "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  return (
    <Cell block="tabs" title="PillTabs" note="حبة الاختيار تنزلق إلى التبويب الجديد. الأسهم تتنقل بترتيب القراءة." onReplay={replay}>
      <div className="flex flex-col items-center gap-5">
        <PillTabs tabs={views} active={view} onPick={setView} label="طريقة العرض" />
        <PillTabs tabs={fields} active={field} onPick={setField} label="المجال" size="sm" />
      </div>
    </Cell>
  );
}

function CollapseCell() {
  const [open, setOpen] = useState(false);
  const done = ["أساسيات Excel", "مبادئ الإحصاء", "التفكير التحليلي", "عرض البيانات", "الجداول المحورية", "كتابة التقارير"];
  return (
    <Cell block="collapse" title="Collapse" note="ارتفاع يتبع المحتوى بلا قياس: صفوف الشبكة من 0fr إلى 1fr، تفتح في 420 وتُغلق في 260 جزءاً من الثانية." onReplay={() => setOpen((o) => !o)}>
      <div className="w-full max-w-sm rounded-xl border border-line bg-sheet">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-base font-semibold text-ink">
          <span>
            أنجزتِها (<bdi dir="ltr">{done.length}</bdi>)
          </span>
          <motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={tween.move}>
            <IconChevronDown size={20} waypoint="off" />
          </motion.span>
        </button>
        <Collapse open={open}>
          <ul className="flex flex-col gap-2.5 border-t border-line px-4 py-3">
            {done.map((c) => (
              <li key={c} className="flex items-center gap-3 text-[15px] text-ink-2">
                <StatusMark state="done" size={20} />
                <bdi>{c}</bdi>
              </li>
            ))}
          </ul>
        </Collapse>
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ replays, leaderboard

let lastSeenMatch: number | undefined = 70; // stands in for the persisted `seen` slice
const SEEN_STEPS = [78, 90, 70];

function SeenRing({ current }: { current: number }) {
  const from = useSeen(
    () => lastSeenMatch,
    (v) => {
      lastSeenMatch = v;
    },
    current,
  );
  return (
    <div className="flex items-center gap-6">
      <Ring value={current} from={from} size={112} />
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-base">
        <dt className="text-ink-2">آخر ما رأيتِه</dt>
        <dd dir="ltr" className="text-end font-semibold text-ink tabular-nums">
          {from}%
        </dd>
        <dt className="text-ink-2">الآن</dt>
        <dd dir="ltr" className="text-end font-bold text-ink tabular-nums">
          {current}%
        </dd>
      </dl>
    </div>
  );
}

function SeenCell() {
  const [run, replay] = useRun();
  const current = run === 0 ? 70 : (SEEN_STEPS[(run - 1) % SEEN_STEPS.length] ?? 70);
  return (
    <Cell block="seen" title="useSeen" note="عند الوصول تُعاد الحركة من آخر قيمة رآها المستخدم إلى الحقيقة الآن، مرة واحدة، وتُحفظ بعد العرض." onReplay={replay}>
      <SeenRing key={run} current={current} />
    </Cell>
  );
}

type Racer = { id: string; name: string; xp: number; me?: boolean };
const BEFORE: Racer[] = [
  { id: "u4", name: "عبدالله الدوسري", xp: 1310 },
  { id: "u5", name: "هند السبيعي", xp: 1270 },
  { id: "u6", name: "لمى الزهراني", xp: 1250 },
  { id: "me", name: "سارة العتيبي", xp: 1240, me: true },
  { id: "u8", name: "ماجد العنزي", xp: 1120 },
];
const AFTER: Racer[] = [{ ...BEFORE[3]!, xp: 1440 }, BEFORE[0]!, BEFORE[1]!, BEFORE[2]!, BEFORE[4]!];

function ClimbDemo() {
  const shown = useClimb(BEFORE, AFTER, 600);
  const climbed = shown === AFTER;
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    if (!climbed) return;
    setLifted(true);
    const t = window.setTimeout(() => setLifted(false), 700);
    return () => window.clearTimeout(t);
  }, [climbed]);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between">
        <p className="text-sm font-semibold text-ink-2">المتصدرون · هذا الأسبوع</p>
        {climbed && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ default: { ...spring.pop, delay: 0.55 }, opacity: { ...tween.fast, delay: 0.55 } }}
            className="rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok"
          >
            صعدتِ 3 مراكز
          </motion.span>
        )}
      </div>
      <ReorderList
        className="flex flex-col gap-2"
        itemClassName="rounded-xl"
        rows={shown.map((r, i) => ({
          id: r.id,
          me: r.me,
          lift: r.me && lifted,
          node: (
            <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-2", r.me ? "border-ink bg-ink text-paper" : "border-line bg-sheet text-ink")}>
              <span className="w-7 text-lg font-bold">
                <Roll id={i + 4}>
                  <span dir="ltr" className="tabular-nums">
                    {i + 4}
                  </span>
                </Roll>
              </span>
              <span className="min-w-0 flex-1 text-base font-semibold">
                {r.name}
                {r.me && <span className="ms-2 text-sm font-medium text-on-stage-2">أنتِ</span>}
              </span>
              <span dir="ltr" className={cn("text-base font-bold tabular-nums", r.me ? "text-xp-on-stage" : "text-xp-ink")}>
                <NumberTicker value={r.xp} />
              </span>
            </div>
          ),
        }))}
      />
    </div>
  );
}

function ClimbCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="climb" title="useClimb · ReorderList" note="تُعرض أولاً الرتبة التي رآها المستخدم آخر مرة، ثم الآن: صفّه يتجاوز من سبقهم أمام عينيه." onReplay={replay}>
      <ClimbDemo key={run} />
    </Cell>
  );
}

function PodiumCell() {
  const [run, replay] = useRun();
  const place = (name: string, xp: number) => (
    <>
      <Person name={name} size={44} />
      <span className="mt-1 text-sm font-semibold text-ink">{name}</span>
      <Xp value={formatNumber(xp)} className="text-sm" />
    </>
  );
  return (
    <Cell block="podium" title="Podium" note="المنصة ترتفع من خط الأساس: الثالث أولاً والأول أخيراً، ثم يظهر أصحابها." onReplay={replay}>
      <Podium
        key={run}
        top={[
          { rank: 1, node: place("نورة القحطاني", 3420) },
          { rank: 2, node: place("فيصل الحربي", 3180) },
          { rank: 3, node: place("ريم الشهري", 2960) },
        ]}
      />
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ burst

function BurstDemo() {
  const [fire, setFire] = useState(false);
  return (
    <div className="relative flex flex-col items-center gap-2">
      <Ring value={90} from={70} size={128} delay={0.2} onDrawn={() => setFire(true)} />
      {fire && <Burst radius={56} onDone={() => setFire(false)} />}
      <p className="text-base font-semibold text-ink">
        تطابقكِ <bdi dir="ltr">90%</bdi>
      </p>
    </div>
  );
}

function BurstCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="burst" title="Burst" note="لحظة القصاصات الوحيدة: شرطات ونقاط مسطّحة بذهب الخبرة وحبر السطح (لا لون الإشارة)، تنطلق من حافة الحلقة حين تصل فلا تغطي الرقم، 900 جزء من الثانية." onReplay={replay}>
      {run === 0 ? (
        <div className="flex flex-col items-center gap-2">
          <Ring value={90} size={128} />
          <p className="text-base font-semibold text-ink">
            تطابقكِ <bdi dir="ltr">90%</bdi>
          </p>
        </div>
      ) : (
        <BurstDemo key={run} />
      )}
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ showcase, sweep

const SHOWCASE_CAPTIONS = ["نريكِ أين تقفين من وظيفتكِ", "دليلك يجيبكِ فوراً", "كل دورة تُحسب لكِ", "وتتقدّمين بين المتصدرين"];

const showcasePieces: ((active: boolean, played: boolean) => ReactNode)[] = [
  (active, played) => (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <Ring value={played ? 90 : 70} delay={active ? 0.4 : 0} size={72} />
      <div>
        <p className="text-lg font-bold text-fg">محلل بيانات</p>
        <p className="text-sm text-fg-2">شركة نخلة الرقمية · جهة تجريبية</p>
      </div>
    </div>
  ),
  (_active, played) => (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fg text-bg">
        <IconAdvisor size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-fg">دليلك</p>
        <p className="text-[15px] text-fg-2">
          <Roll id={played ? "b" : "a"}>{played ? "محطتكِ التالية: SQL للمبتدئين" : "أراجع مساركِ…"}</Roll>
        </p>
      </div>
    </div>
  ),
  (active, played) => (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-fg-2">المستوى 3 · متعلّمة</p>
      <p className="flex items-baseline gap-1.5 text-2xl font-bold text-xp-fg">
        <NumberTicker value={played ? 1440 : 1240} delay={active ? 0.4 : 0} />
        <span className="text-sm">XP</span>
      </p>
    </div>
  ),
  (_active, played) => (
    <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5">
      <span className="text-xl font-bold text-fg">
        <Roll id={played ? 6 : 7}>
          <span dir="ltr" className="tabular-nums">
            {played ? 6 : 7}
          </span>
        </Roll>
      </span>
      <Person name="سارة" size={34} />
      <span className="text-base font-semibold text-fg">سارة العتيبي</span>
    </div>
  ),
];

function ShowcaseCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="showcase" title="ShowcaseStage" note="مخرج عرض صفحة الدخول: لكل قطعة دورها 3.3 ثانية بكامل وضوحها وتؤدي لحظتها من البداية، والباقي ساكن عند 70% (فيبقى نصها مقروءاً). يتوقف خارج الشاشة." onReplay={replay} wide stage bodyClassName="min-h-80">
      <ShowcaseStage key={run} pieces={showcasePieces} captions={SHOWCASE_CAPTIONS} className="w-full max-w-2xl" />
    </Cell>
  );
}

const SWEEP_TITLES = [
  ["محلل بيانات", "مصمم واجهات", "محاسب", "محلل أعمال", "كاتب محتوى", "مطوّر ويب", "أخصائي موارد بشرية"],
  ["مسوّق رقمي", "محلل مالي", "مدير مشاريع", "مهندس بيانات", "منسّق مبيعات", "مصمم جرافيك", "أخصائي دعم"],
  ["محلل ذكاء أعمال", "مطوّر تطبيقات", "باحث تجربة مستخدم", "أخصائي توظيف", "محلل تسويق", "مدقق جودة", "منسّق عمليات"],
];
const FITS = new Set(["محلل بيانات", "محلل أعمال", "محلل ذكاء أعمال", "مهندس بيانات", "محلل مالي", "محلل تسويق"]);
const SWEEP_ROWS: SweepTile[][] = SWEEP_TITLES.map((row, r) => row.map((title, i) => ({ id: `${r}-${i}`, title, fits: FITS.has(title) })));

function SweepCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="sweep" title="SweepRows" note="الوظائف تمر مرة واحدة في ثلاثة صفوف متعاكسة؛ في منتصفها تبقى المناسبة واضحة ويخفت الباقي إلى 35%." onReplay={replay} stage>
      <SweepRows key={run} rows={SWEEP_ROWS} className="w-full" />
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ reveal

// the status lines of PRODUCT-SPEC 4.7
const REVEAL_LINES: Record<RevealStepId, string> = {
  "answers-gather": "أجمع إجاباتك يا سارة…",
  "jobs-sweep": "أقارن ملفك مع 20 وظيفة…",
  "skills-map": "أراجع 38 مهارة في 7 مجالات…",
  "narrow-to-three": "أختار أنسب ثلاث وظائف لك…",
  "path-draw": "أرسم مسارك خطوة بخطوة…",
  "reveal-landing": "مسارك جاهز.",
};
const ANSWERS = ["الرياض", "بكالوريوس", "نظم المعلومات", "سنة خبرة", "البيانات", "وظيفة مستقرة"];
// the recommended job and the two alternatives (spec 4.6). No match numbers: nothing is known before the CV is read.
const TOP_THREE = [
  { id: "da", title: "محلل بيانات", best: true },
  { id: "rd", title: "أخصائي تقارير وبيانات", best: false },
  { id: "ba", title: "محلل أعمال", best: false },
];
const GROUPS = [6, 5, 6, 5, 6, 5, 5]; // 38 skills in 7 fields
// The path climbs: «البداية» at the bottom right (the start of an Arabic line, your position: the accent), eight stages,
// the goal at the top left, every point higher than the one before it. Units are SVG px.
const PATH_W = 360;
const PATH_H = 124;
const PATH_N = 10; // start, eight stages, goal
const pathNodes: Pt[] = Array.from({ length: PATH_N }, (_, i) => ({
  x: PATH_W - 22 - i * ((PATH_W - 44) / (PATH_N - 1)),
  y: PATH_H - 16 - i * ((PATH_H - 34) / (PATH_N - 1)) + Math.sin(i * 1.7) * 4,
}));
const pathD = pathNodes.slice(1).reduce((d, p, i) => {
  const a = pathNodes[i] ?? p;
  const mx = (a.x + p.x) / 2;
  return `${d} C ${mx} ${a.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
}, `M ${pathNodes[0]?.x ?? 0} ${pathNodes[0]?.y ?? 0}`);

// Each node lands exactly when the drawing line reaches it: the line's progress follows tween.draw (ease-in-out over
// 0.9 s), so invert that curve at the node's share of the path length.
function drawTimeAt(progress: number): number {
  const [x1, y1, x2, y2] = [0.65, 0, 0.35, 1]; // ease.inOut
  const bez = (s: number, a: number, b: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, y1, y2) < progress) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, x1, x2);
}
const legLengths = pathNodes.slice(1).map((p, i) => Math.hypot(p.x - (pathNodes[i]?.x ?? 0), p.y - (pathNodes[i]?.y ?? 0)));
const pathTotal = legLengths.reduce((a, b) => a + b, 0);
const LINE_DELAY = 0.15; // the layer itself fades in after the 150 ms exit of the one before
const nodeDelay = pathNodes.map((_, i) => LINE_DELAY + 0.9 * drawTimeAt(legLengths.slice(0, i).reduce((a, b) => a + b, 0) / pathTotal));

const revealLayers: RevealLayer[] = [
  {
    id: "answers",
    from: 0,
    to: 1,
    className: "grid place-items-center",
    render: (index) => (
      <motion.div initial={false} animate={{ y: index === 1 ? -112 : 0, scale: index === 1 ? 0.85 : 1, opacity: index === 1 ? 0.6 : 1 }} transition={tween.move}>
        <motion.div variants={group(0.06)} initial="hidden" animate="show" className="flex max-w-md flex-wrap justify-center gap-2">
          {ANSWERS.map((a) => (
            <motion.span key={a} variants={popIn} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[15px] font-medium text-fg">
              {a}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    ),
  },
  { id: "sweep", from: 1, to: 1, className: "grid place-items-center pt-14", render: () => <SweepRows rows={SWEEP_ROWS} className="w-full" /> },
  {
    id: "skills",
    from: 2,
    to: 2,
    className: "grid place-items-center",
    render: () => (
      <motion.div variants={group(0.07)} initial="hidden" animate="show" className="flex flex-wrap items-end justify-center gap-5">
        {GROUPS.map((n, g) => (
          <motion.div key={g} variants={{ hidden: { opacity: 0.25 }, show: { opacity: 1, transition: tween.move } }} className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className="size-2.5 rounded-full bg-fg-2" />
            ))}
          </motion.div>
        ))}
      </motion.div>
    ),
  },
  {
    id: "three",
    from: 3,
    to: 3,
    className: "grid place-items-center",
    render: () => (
      <motion.div variants={group(0.08)} initial="hidden" animate="show" className="flex flex-wrap justify-center gap-3">
        {TOP_THREE.map((j) => (
          <motion.div
            key={j.id}
            variants={rise}
            className={cn("rounded-xl border bg-surface px-4 py-3 text-base font-semibold text-fg", j.best ? "border-[1.5px] border-fg" : "border-border")}
          >
            {j.title}
          </motion.div>
        ))}
      </motion.div>
    ),
  },
  {
    id: "path",
    from: 4,
    to: 5,
    className: "grid place-items-center",
    render: (index) => (
      <motion.div className="relative" style={{ width: PATH_W, height: PATH_H }} initial={false} animate={{ y: index === 5 ? 64 : 0 }} transition={tween.move}>
        {/* at the landing only the line steps back; the stations and the goal stay at full strength */}
        <motion.svg
          className="absolute inset-0 overflow-visible"
          width={PATH_W}
          height={PATH_H}
          viewBox={`0 0 ${PATH_W} ${PATH_H}`}
          aria-hidden
          initial={false}
          animate={{ opacity: index === 5 ? 0.55 : 1 }}
          transition={tween.move}
        >
          <Edge d={pathD} state="drawing" track="none" width={3} delay={LINE_DELAY} />
        </motion.svg>
        {pathNodes.map((p, i) => {
          const start = i === 0;
          const goal = i === PATH_N - 1;
          return (
            <motion.span
              key={i}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                start ? "size-4 bg-accent" : goal ? "size-5 border-[3px] border-fg bg-bg" : "size-3 border-2 border-fg bg-bg",
              )}
              style={{ left: p.x, top: p.y }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ default: { ...spring.pop, delay: nodeDelay[i] }, opacity: { ...tween.fast, delay: nodeDelay[i] } }}
            />
          );
        })}
      </motion.div>
    ),
  },
  {
    id: "landing",
    from: 5,
    to: 5,
    className: "flex items-start justify-center pt-4",
    render: () => (
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-4xl font-bold text-fg">
          <WordsIn text="محلل بيانات" />
        </p>
        <FocusInGroup
          startDelay={0.2}
          className="flex flex-col items-center gap-0.5"
          blocks={[
            {
              id: "m",
              node: (
                <p className="text-lg text-fg-2">
                  <bdi dir="ltr">8</bdi> مراحل · <bdi dir="ltr">74</bdi> ساعة تعلّم
                </p>
              ),
            },
            { id: "s", node: <p className="text-base text-fg-2">نعرف تطابقك بعد قراءة سيرتك</p> },
          ]}
        />
      </div>
    ),
  },
];

function RevealCell() {
  const [run, replay] = useRun();
  const [done, setDone] = useState(false);
  return (
    <Cell
      block="reveal"
      title="RevealStage · RevealLayers · REVEAL_STEPS"
      note="كشف المسار: ست خطوات في 7.8 ثانية بطبقات تعيش عبر الخطوات، وسطر حالة واحد يتدحرج. الخط يصعد من البداية إلى القمة وتهبط كل محطة لحظة يصلها. مع تقليل الحركة تُفتح النتيجة مباشرة."
      onReplay={() => {
        setDone(false);
        replay();
      }}
      wide
      stage
      bodyClassName="min-h-[26rem] p-0"
    >
      <RevealStage
        key={run}
        lines={REVEAL_LINES}
        layers={revealLayers}
        onDone={() => setDone(true)}
        className="w-full rounded-b-2xl px-6 py-8"
        stageClassName="h-72 overflow-hidden"
      />
      <span className="sr-only" data-testid="reveal-done" data-value={done ? 1 : 0} />
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ scan

function ScanCell() {
  const [run, replay] = useRun();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (run === 0) return;
    setPlaying(false);
    const f = requestAnimationFrame(() => setPlaying(true));
    return () => cancelAnimationFrame(f);
  }, [run]);
  return (
    <Cell block="scan" title="ScanLine" note="خط رفيع بلون الحبر يمر على الوثيقة أثناء قراءتها، ثانية وخُمس، تحويل فقط، ثم يخفت." onReplay={replay}>
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-line bg-sheet px-6 py-5">
        <p className="text-lg font-bold text-ink">سارة العتيبي</p>
        <p className="text-[15px] text-ink-2">محللة بيانات مبتدئة · الرياض</p>
        <div className="mt-4 flex flex-col gap-2.5" aria-hidden>
          {[100, 92, 96, 70, 88, 94, 60].map((w, i) => (
            <span key={i} className="block h-2 rounded-full bg-sunk" style={{ width: `${w}%` }} />
          ))}
        </div>
        <ScanLine key={run} playing={playing} />
      </div>
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ celebration

const BEATS: readonly ShowStep<string>[] = [
  { id: "course", ms: 500 },
  { id: "xp", ms: 800 },
  { id: "match", ms: 1400 },
  { id: "level", ms: 700 },
  { id: "rank", ms: 500 },
];

function BeatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-4 border-b border-border pb-3 last:border-b-0">
      <span className="w-24 shrink-0 text-sm text-fg-2">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-4">{children}</div>
    </div>
  );
}

function MatchBeat({ state }: { state: BeatState }) {
  const [fire, setFire] = useState(false);
  const live = state !== "hidden";
  return (
    <BeatRow label="التطابق">
      <span className="relative">
        <Ring value={live ? 90 : 70} delay={state === "now" ? 0.12 : 0} size={72} onDrawn={() => state === "now" && setFire(true)} />
        {fire && <Burst reach={0.7} radius={32} onDone={() => setFire(false)} />}
      </span>
      <span className="text-lg font-semibold text-fg">
        من <bdi dir="ltr">70%</bdi> إلى <bdi dir="ltr">90%</bdi> مع محلل بيانات
      </span>
    </BeatRow>
  );
}

const beatRows: ((state: BeatState) => ReactNode)[] = [
  (s) => (
    <BeatRow label="الدورة">
      <StatusMark state={s === "hidden" ? "pending" : "done"} size={28} />
      <span className="text-lg font-bold text-fg">
        أكملتِ «<bdi>SQL</bdi> للمبتدئين»
      </span>
    </BeatRow>
  ),
  (s) => (
    <BeatRow label="الخبرة">
      <motion.span variants={popIn} initial="hidden" animate={s === "hidden" ? "hidden" : "show"} className="rounded-full bg-xp px-3 py-1 text-base font-bold text-ink">
        <bdi dir="ltr">{formatGain(200)} XP</bdi>
      </motion.span>
      <span className="text-2xl font-bold text-xp-fg">
        <NumberTicker value={s === "hidden" ? 1240 : 1440} />
      </span>
    </BeatRow>
  ),
  (s) => <MatchBeat state={s} />,
  (s) => (
    <BeatRow label="المستوى">
      <motion.span
        className="grid size-11 place-items-center rounded-full border-2 border-xp-on-stage text-xl font-bold text-fg"
        initial={false}
        animate={{ scale: s === "now" ? [0.6, 1] : 1 }}
        transition={spring.cheer}
      >
        <Roll id={s === "hidden" ? 3 : 4}>
          <span dir="ltr">{s === "hidden" ? 3 : 4}</span>
        </Roll>
      </motion.span>
      <span className="text-lg font-semibold text-fg">
        <Roll id={s === "hidden" ? "a" : "b"}>{s === "hidden" ? "متعلّمة" : "مجتهدة"}</Roll>
      </span>
    </BeatRow>
  ),
  (s) => (
    <BeatRow label="الترتيب">
      <span className="text-2xl font-bold text-fg">
        <Roll id={s === "hidden" ? 7 : 6}>
          <span dir="ltr" className="tabular-nums">
            {s === "hidden" ? 7 : 6}
          </span>
        </Roll>
      </span>
      <span className="text-base text-fg-2">تقدّمتِ مركزاً بين المتصدرين</span>
    </BeatRow>
  ),
];

function CelebrationDemo({ atRest = false }: { atRest?: boolean }) {
  const [settle, setSettle] = useState(atRest);
  const [settled, setSettled] = useState(false);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <CelebrationBeats beats={BEATS} open rows={beatRows} settle={settle} onSettled={() => setSettled(true)} />
      <div className="flex gap-3">
        <button type="button" onClick={() => setSettle(true)} className={primaryButton}>
          {settled ? "متابعة" : "متابعة (تخطَّ)"}
        </button>
      </div>
    </div>
  );
}

function CelebrationCell() {
  const [run, replay] = useRun();
  return (
    <Cell block="celebration" title="CelebrationBeats" note="احتفال إتمام الدورة: الدورة، ثم الخبرة، ثم التطابق (ذروة المشهد ومعه القصاصات)، ثم المستوى والترتيب. ما مضى يستريح عند 70%. أي ضغطة تقفز إلى النهاية، ومع تقليل الحركة يُفتح على النهاية." onReplay={replay} wide stage>
      <CelebrationDemo key={run} atRest={run === 0} />
    </Cell>
  );
}

// ------------------------------------------------------------------------------------------------ page

const CELLS: readonly (readonly [string, () => ReactNode])[] = [
  ["provider", ProviderCell],
  ["route", RouteCell],
  ["focus", FocusCell],
  ["words", WordsCell],
  ["roll", RollCell],
  ["ticker", TickerCell],
  ["ring", RingCell],
  ["gain", GainCell],
  ["edge", EdgeCell],
  ["here", HereCell],
  ["status", StatusCell],
  ["show", ShowCell],
  ["highlight", HighlightCell],
  ["skilltag", SkillTagCell],
  ["scan", ScanCell],
  ["typeon", TypeOnCell],
  ["reveal", RevealCell],
  ["sweep", SweepCell],
  ["sheet", SheetCell],
  ["fly", FlyCell],
  ["reorder", ReorderCell],
  ["tabs", TabsCell],
  ["climb", ClimbCell],
  ["podium", PodiumCell],
  ["seen", SeenCell],
  ["collapse", CollapseCell],
  ["celebration", CelebrationCell],
  ["burst", BurstCell],
  ["showcase", ShowcaseCell],
];

export default function MotionGalleryPage() {
  // ?only=<block> shows one cell, centred and full width (used to record legible clips of one block)
  const [only, setOnly] = useState<string | null>(null);
  useEffect(() => setOnly(new URLSearchParams(window.location.search).get("only")), []);
  const cells = only === null ? CELLS : CELLS.filter(([id]) => id === only);
  return (
    <main className={cn("mx-auto px-4 py-8 lg:px-8 lg:py-12", only === null ? "max-w-[1280px]" : "max-w-3xl")}>
      {only === null && (
        <header className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-2">دليل · معرض المطوّرين</p>
          <h1 className="text-3xl font-bold text-ink">كتل الحركة</h1>
          <p className="max-w-3xl text-base leading-relaxed text-ink-2">
            كل كتلة حركة مشتركة في خلية واحدة مع زر «أعد». ست أفعال فقط: يرتفع، يتضح، يقفز، يتدحرج، يُرسم، ينتقل. الألوان كلها من رموز التصميم، والأشخاص والجهات
            تجريبية. أضف <bdi dir="ltr">?still=1</bdi> للقطات ثابتة.
          </p>
        </header>
      )}
      <div className={only === null ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : "flex flex-col gap-6"}>
        {cells.map(([id, C]) => (
          <C key={id} />
        ))}
      </div>
    </main>
  );
}
