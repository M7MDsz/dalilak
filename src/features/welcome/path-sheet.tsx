"use client";
// Owner: welcome. The path sheet: the line the reveal draws in step 5 (`path-draw`) and the result keeps (spec 3.3 "The
// show ends on a path, as he asked"). It is a white map sheet in the map's own language (contours rising to a summit,
// numbered coins, the way ahead as a dotted trail, «البداية» with the waypoint), because it becomes the map: on a
// choice the rest of the result leaves, this sheet stays, and its nodes are measured for the map to open out of.
//   hidden   before step 5 (it is laid out, invisible, so nothing moves when it appears)
//   drawing  step 5: the sheet rises, the pen draws the trail from «البداية» to the trophy at one speed, each station
//            settles as the pen reaches it and its name comes into focus; the target's title waits at the trophy
//   rest     drawn and still (a reload after step 6, reduced motion, still frames)
// `landed` (step 6, `reveal-landing`): the title lands on the trophy end; the trophy answers once.
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";

import { IconStarFilled, IconTrophy } from "@/components/icons";
import { useInstant } from "@/components/motion";
import { ContourBackdrop, cn } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { dur, ease, spring, tween } from "@/lib/motion";
import { TID } from "@/lib/testids";

import { RESULT_COPY } from "./copy";
import type { RevealStageInfo } from "./reveal-data";
import { NODE, climbHeight, rowsHeight, sheetGeometry, type SheetLayout, type SheetNode } from "./sheet-geometry";

export type SheetMode = "hidden" | "drawing" | "rest";

/** The pen's speed: the sheet rises first, then the line is drawn in this long (step 5 is 1.5 s). */
const RISE_S = 0.26;
const DRAW_S = 1.12;
const LABEL_DELAY_S = 0.1;

export interface PathSheetProps {
  readonly layout: SheetLayout;
  readonly stages: readonly RevealStageInfo[];
  readonly title: string;
  readonly summary: string;
  readonly mode: SheetMode;
  readonly landed: boolean;
  /** The footer (summary, CV line) shows with the result. */
  readonly footer: boolean;
  /** Step 5: the chosen tile of step 4 (`[data-reveal-target-tile]`) travels onto the trophy and becomes the title. */
  readonly titleTravels?: boolean;
  /** Desktop: the most height the sheet may take (it fills to its ideal step below that). */
  readonly maxHeight: number;
  readonly sheetRef?: Ref<HTMLDivElement>;
  readonly className?: string;
}

export function PathSheet({ layout, stages, title, summary, mode, landed, footer, titleTravels = false, maxHeight, sheetRef, className }: PathSheetProps) {
  const instant = useInstant();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = layout === "climb" ? climbHeight(stages.length, maxHeight) : rowsHeight();
  const g = useMemo(() => (width > 0 ? sheetGeometry(layout, stages.length, width, height) : null), [layout, stages.length, width, height]);

  // the pen: one value drives the trail's reveal, the pen tip and which stations have been reached
  const atRest = mode === "rest" || instant;
  const progress = useMotionValue(atRest ? 1 : 0);
  const [reached, setReached] = useState(atRest ? Number.POSITIVE_INFINITY : 0);
  const nodesAt = useMemo(() => g?.nodes.map((n) => n.at) ?? [], [g]);
  useMotionValueEvent(progress, "change", (p) => {
    const count = nodesAt.filter((at) => at <= p + 0.002).length;
    setReached((r) => (r === Number.POSITIVE_INFINITY || count === r ? r : count));
  });
  useEffect(() => {
    if (atRest) {
      progress.jump(1);
      setReached(Number.POSITIVE_INFINITY);
      return;
    }
    if (mode !== "drawing") return;
    const controls = animate(progress, 1, { duration: DRAW_S, delay: RISE_S, ease: "linear" });
    return () => controls.stop();
  }, [mode, atRest, progress]);

  // the pen tip rides the trail while it is drawn
  const spine = useRef<SVGPathElement>(null);
  const tipX = useTransform(progress, (p) => pointAt(spine.current, p).x);
  const tipY = useTransform(progress, (p) => pointAt(spine.current, p).y);
  const tipOpacity = useTransform(progress, (p) => (p > 0.001 && p < 0.995 ? 1 : 0));

  const maskId = useId().replace(/:/g, "");
  const visible = mode !== "hidden";
  const summit = layout === "climb" ? { x: 0.62, y: 0.06 } : { x: 0.86, y: 0.62 };

  return (
    <div
      className={cn("relative isolate rounded-sheet", className)}
      data-surface="paper"
      data-testid={visible ? TID.reveal.path : undefined}
      data-value={stages.length}
      ref={sheetRef}
      style={{ height, visibility: visible ? "visible" : "hidden" }}
    >
      {/* the sheet itself (paper, hairline, the hill's contours rising to the summit) arrives first; the trail is drawn on it */}
      <motion.div
        animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.985 }}
        className="absolute inset-0 -z-10 overflow-hidden rounded-sheet border border-border bg-surface"
        initial={atRest ? false : { opacity: 0, scale: 0.985 }}
        transition={{ duration: RISE_S + 0.04, ease: ease.out }}
      >
        <ContourBackdrop intensity="quiet" rings={12} seed={7} summit={summit} />
      </motion.div>
      <div className="absolute inset-0" ref={box}>
        {g ? (
          <>
            <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" height={g.height} width={g.width}>
              <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse">
                  <motion.path d={g.d} fill="none" stroke="white" strokeLinecap="round" strokeWidth={16} style={{ pathLength: progress }} />
                </mask>
              </defs>
              <path d={g.d} fill="none" ref={spine} stroke="none" />
              {/* the way ahead, as on the map: a dotted trail; the pen reveals it at one speed */}
              <path className="stroke-fg-2" d={g.d} fill="none" mask={`url(#${maskId})`} strokeDasharray="0.01 10" strokeLinecap="round" strokeWidth={4} />
              <motion.circle className="fill-fg" cx={0} cy={0} r={4.5} style={{ x: tipX, y: tipY, opacity: tipOpacity }} />
            </svg>
            {g.nodes.map((node) => (
              <Station
                key={node.index}
                landed={landed}
                layout={layout}
                node={node}
                reached={node.index < reached}
                rest={atRest}
                stage={node.kind === "stage" ? stages[node.index - 1] : undefined}
                title={title}
                titleTravels={titleTravels}
              />
            ))}
            <motion.div
              animate={{ opacity: footer ? 1 : 0, y: footer ? 0 : 6 }}
              className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 border-t border-border px-5 pt-3.5 pb-4"
              initial={false}
              style={{ top: g.footerTop }}
              transition={footer ? { ...tween.move, delay: 0.2 } : tween.exit}
            >
              <p className="text-small font-semibold text-fg">{summary}</p>
              <p className="text-small text-fg-3">{RESULT_COPY.cvLine}</p>
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function pointAt(path: SVGPathElement | null, p: number): { x: number; y: number } {
  if (!path) return { x: 0, y: 0 };
  try {
    const length = path.getTotalLength();
    const point = path.getPointAtLength(Math.min(1, Math.max(0, p)) * length);
    return { x: point.x, y: point.y };
  } catch {
    return { x: 0, y: 0 };
  }
}

// ------------------------------------------------------------------------------------------------ one station

function Station({
  node,
  stage,
  layout,
  reached,
  rest,
  landed,
  title,
  titleTravels,
}: {
  node: SheetNode;
  stage: RevealStageInfo | undefined;
  layout: SheetLayout;
  reached: boolean;
  rest: boolean;
  landed: boolean;
  title: string;
  titleTravels: boolean;
}) {
  // travel: the chosen job's tile (step 4, still on screen while its scene leaves) flies to the trophy and becomes the
  // title, at the draw tempo. A FLIP on this one element: measured once, the tile hidden, the title flown from its box.
  const titleRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!titleTravels || !el || node.kind !== "goal") return;
    const tile = document.querySelector<HTMLElement>("[data-reveal-target-tile]");
    if (!tile) return;
    const from = tile.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    tile.style.visibility = "hidden";
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const s = Math.max(0.6, Math.min(1.6, from.height / Math.max(1, to.height)));
    const flight = animate(el, { x: [dx, 0], y: [dy, 0], scale: [s, 1] }, tween.draw);
    return () => flight.stop();
  }, [titleTravels, node.kind]);

  const rows = layout === "rows";
  const shown = rest || reached || node.kind === "start";
  const size = node.kind === "goal" ? (rows ? NODE.goalRows : NODE.goal) : node.kind === "start" ? NODE.start : rows ? NODE.coinRows : NODE.coin;
  const pop = rest ? false : { opacity: 0, scale: 0.55 };
  const labelStyle = {
    left: node.label.left,
    top: node.label.top,
    width: node.label.width,
    translate: node.label.side === "beside" ? "0 -50%" : node.label.side === "above" ? "0 -100%" : undefined,
  } as const;
  const align = node.label.align === "start" ? "text-start justify-start" : node.label.align === "end" ? "text-end justify-end" : "text-center justify-center";

  return (
    <div data-testid={stage ? TID.reveal.pathNode(stage.n) : undefined}>
      {/* the node itself: physical left/top on purpose, x and y are sheet pixels that already carry the mirror */}
      <motion.span
        animate={shown ? { opacity: 1, scale: node.kind === "goal" && landed && !rest ? [1, 1.14, 1] : 1 } : { opacity: 0, scale: 0.55 }}
        className="absolute grid place-items-center rounded-full border-2 border-fg bg-surface text-fg"
        data-sheet-node={node.index}
        initial={pop}
        style={{ left: node.x, top: node.y, width: size, height: size, translate: "-50% -50%" }}
        transition={node.kind === "goal" && landed && !rest ? { scale: { duration: 0.46, ease: ease.out, times: [0, 0.4, 1] }, opacity: tween.fast } : { default: spring.pop, opacity: tween.fast }}
      >
        {node.kind === "start" ? <span aria-hidden className="block size-2 rounded-full bg-accent" /> : null}
        {node.kind === "stage" && stage ? (
          <span className="text-[14px] leading-none font-bold tabular-nums" dir="ltr">
            {formatNumber(stage.n)}
          </span>
        ) : null}
        {node.kind === "goal" ? <IconTrophy size={rows ? 22 : 24} waypoint="muted" /> : null}
      </motion.span>

      {/* the label */}
      {node.kind === "goal" ? (
        <div className={cn("absolute flex", align)} style={labelStyle}>
          <motion.span
            animate={{ opacity: shown || titleTravels ? 1 : 0 }}
            className="relative z-10 inline-block max-w-full"
            initial={false}
            ref={titleRef}
            transition={tween.fast}
          >
            <span
              className={cn(
                "block rounded-control border-[1.5px] px-2.5 py-1 font-bold text-fg transition-[border-color,background-color] duration-300 ease-out",
                rows ? "text-[16px] leading-6" : "text-h3",
                landed || rest ? "border-transparent bg-transparent" : "border-border-strong bg-surface",
              )}
            >
              {title}
            </span>
          </motion.span>
        </div>
      ) : (
        <motion.div
          animate={shown ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 7, filter: "blur(3px)" }}
          className={cn("absolute flex", align)}
          initial={rest ? false : { opacity: 0, y: 7, filter: "blur(3px)" }}
          style={labelStyle}
          transition={{ duration: dur.move, ease: ease.out, delay: node.kind === "start" || rest ? 0 : LABEL_DELAY_S }}
        >
          {node.kind === "start" ? (
            <span className="text-small font-semibold text-fg-2">{RESULT_COPY.start}</span>
          ) : stage ? (
            <StageLabel rows={rows} stage={stage} />
          ) : null}
        </motion.div>
      )}
    </div>
  );
}

/** A Latin name never breaks inside itself («Power BI», «HTML و CSS» keep their spaces). */
function keepTogether(name: string): string {
  return /[A-Za-z]/.test(name) && !/[؀-ۿ]/.test(name) ? name.replace(/ /g, " ") : name;
}

/**
 * «Excel ★★»: the name, then its stars, flowing as one line of text. When a name must wrap, the lines are balanced and
 * the stars stay with its last word (a no-break space), so a star is never left alone on a line.
 */
function StageLabel({ stage, rows }: { stage: RevealStageInfo; rows: boolean }) {
  const stars = Array.from({ length: stage.star }, (_, i) => i);
  return (
    <span className={cn("block max-w-full [text-wrap:balance]", rows ? "text-[14px] leading-5" : "text-[16px] leading-6")}>
      <bdi className="font-semibold text-fg">{keepTogether(stage.name)}</bdi>
      {" "}
      <span aria-label={"★".repeat(stage.star)} className="inline-flex items-center gap-px align-[-1px] whitespace-nowrap text-fg" role="img">
        {stars.map((i) => (
          <IconStarFilled key={i} size={rows ? 12 : 14} waypoint="off" />
        ))}
      </span>
      {stage.prep ? (
        <>
          {" "}
          <span className="inline-flex h-5 items-center rounded-tag border border-border-strong px-1.5 align-middle text-caption whitespace-nowrap text-fg-3">{RESULT_COPY.prep}</span>
        </>
      ) : null}
    </span>
  );
}
