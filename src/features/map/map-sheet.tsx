"use client";
// Owner: map. The drawn sheet: terrain, the road, and everything that stands on it (the billboards). It only draws what
// geometry.ts computed; it holds no state and never re-renders for a flight (choreography.ts moves it). Stations are real
// buttons in reading order (start, the gate, stages 1..n, the goal, the branches), so Tab walks the path.
import { memo, useId, type CSSProperties, type ReactNode } from "react";

import { Avatar } from "@/components/avatars";
import { IconCheck, IconChevronForward, IconClock, IconGate, IconLock } from "@/components/icons";
import { NumberTicker } from "@/components/motion";
import { SkillStars, XpValue, cn } from "@/components/ui";
import { SOURCE_LABEL, STAGE_STATE_LABEL, hoursText, lockReasonText } from "@/lib/copy";
import { getSkill } from "@/lib/data";
import { formatNumber, formatPercent } from "@/lib/format";
import { TID } from "@/lib/testids";
import type { JobId, Roadmap, RoadmapStage, StarMap } from "@/lib/types";

import type { MapGeometry, StationGeo } from "./geometry";

export interface BranchLabel {
  readonly jobId: JobId;
  readonly title: string;
  readonly now: number;
  readonly after: number;
}

export interface MapSheetProps {
  readonly g: MapGeometry;
  readonly roadmap: Roadmap;
  readonly jobTitle: string;
  readonly avatar: string;
  readonly level: number;
  /** The match in the «أنت هنا» tag: counts from `from` to `value` when `value` changes. */
  readonly match: { readonly value: number; readonly from: number; readonly delay: number; readonly duration: number };
  readonly branches: readonly BranchLabel[];
  /** The stars the user holds in every skill (engine `skillStars`). */
  readonly stars: StarMap;
  /** Wide layout: the peaks are the branch controls. Narrow: they are a drawing, the branch cards sit under the map. */
  readonly peaksAreControls: boolean;
  readonly onStation: (key: string) => void;
  readonly onGate: () => void;
  readonly onBranch: (jobId: JobId) => void;
}

/** The dotted survey grid's spacing in sheet pixels. */
const GRID = 24;

const at = (x: number, y: number, r: number): CSSProperties => ({ left: x, top: y, ["--r" as string]: `${r}px` });
/** A station's box is its coin, centred on the trail. */
const box = (x: number, y: number, r: number): CSSProperties => ({ left: x - r, top: y - r, ["--r" as string]: `${r}px` });
/** A peak's box is its triangle; the branch line ends at its foot. */
const peakBox = (x: number, y: number): CSSProperties => ({ left: x - 12, top: y - 14 });

/**
 * Stars for a stage: a solid star is one the user has earned, an outline an empty slot (DESIGN-BRIEF 3.5). A done stage
 * shows its star earned; any other stage shows the earlier stars of that skill only as far as the user really holds
 * them (a locked «Excel ★★» with no Excel star held is two outlines, not one solid star).
 */
export function stageStarsHeld(stage: RoadmapStage, stars: StarMap): number {
  return stage.state === "done" ? stage.star : Math.min(stage.star - 1, stars[stage.skill]);
}

function StageStars({ stage, stars, size = "sm" }: { readonly stage: RoadmapStage; readonly stars: StarMap; readonly size?: "sm" | "md" }) {
  return <SkillStars size={size} slots={stage.star} value={stageStarsHeld(stage, stars)} />;
}

function stageAria(stage: RoadmapStage): string {
  const name = getSkill(stage.skill).name;
  return `المرحلة ${formatNumber(stage.n)}: ${name}، النجمة ${formatNumber(stage.star)}، ${STAGE_STATE_LABEL[stage.state]}`;
}

function sourceOf(stage: RoadmapStage): string {
  if (stage.doneBy?.kind === "cv") return SOURCE_LABEL.cv;
  if (stage.doneBy?.kind === "course") return SOURCE_LABEL.course;
  return "تمهيدية";
}

function StageLabel({ stage, stars, small, roomy }: { readonly stage: RoadmapStage; readonly stars: StarMap; readonly small: boolean; readonly roomy: boolean }): ReactNode {
  const name = <bdi className="dm-name">{getSkill(stage.skill).name}</bdi>;
  if (stage.state === "current") {
    return (
      <span className="dm-lb dm-card-lb dm-q">
        <span className="dm-e">{STAGE_STATE_LABEL.current}</span>
        <b>
          {name}
          <StageStars stage={stage} stars={stars} />
        </b>
        {roomy ? (
          <small>
            <span>
              <IconClock size={16} waypoint="off" />
              {hoursText(stage.hours)}
            </span>
            <XpValue gain size="sm" value={stage.xp} />
            {stage.prep ? (
              <span>تمهيدية</span>
            ) : (
              <span>
                ترفع مطابقتك إلى <b dir="ltr">{formatPercent(stage.matchAfter)}</b>
              </span>
            )}
          </small>
        ) : null}
      </span>
    );
  }
  if (stage.state === "done") {
    return (
      <span className="dm-lb dm-q">
        <b>
          {name}
          <StageStars stage={stage} stars={stars} />
          <em className="dm-src">
            <IconCheck className="dm-ok" size={15} strokeWidth={2.6} waypoint="off" />
            <span className="sr-only">{STAGE_STATE_LABEL.done}، </span>
            <span>{sourceOf(stage)}</span>
          </em>
        </b>
      </span>
    );
  }
  const locked = stage.state === "locked";
  return (
    <span className="dm-lb dm-q">
      <b>
        {name}
        <StageStars stage={stage} stars={stars} />
        <em className="dm-inline">
          {locked ? <IconLock size={14} waypoint="off" /> : null}
          {STAGE_STATE_LABEL[stage.state]}
        </em>
      </b>
      <small>
        {locked ? <IconLock size={15} waypoint="off" /> : null}
        {STAGE_STATE_LABEL[stage.state]}
        <i className="dm-sep" />
        {locked && stage.lock !== null && roomy ? (
          // the reason needs room; on the phone and beside the docked panel the label keeps its hours (the sheet says why)
          <span>{lockReasonText(stage.lock)}</span>
        ) : (
          <>
            <span>{hoursText(stage.hours)}</span>
            {small ? null : <XpValue className="ms-1" gain size="sm" value={stage.xp} />}
          </>
        )}
      </small>
    </span>
  );
}

function Station({ st, stars, small, roomy, onStation, onGate }: { readonly st: StationGeo; readonly stars: StarMap; readonly small: boolean; readonly roomy: boolean; readonly onStation: (key: string) => void; readonly onGate: () => void }) {
  if (st.kind === "gate" || st.stage === null) {
    // the start gate (before a CV): the one lit step; pressing it opens /cv
    return (
      <button
        aria-label="اكتشف مهاراتك، الآن: ارفع سيرتك الذاتية"
        className="dm-bb dm-st dm-now"
        data-key={st.key}
        data-state="current"
        data-testid={TID.path.gate}
        onClick={onGate}
        style={box(st.x, st.y, st.r)}
        type="button"
      >
        <span className="dm-coin">
          <IconGate size={small ? 24 : 28} waypoint="off" />
        </span>
        <i className="dm-ld dm-q" />
        <span className="dm-lb dm-card-lb dm-q">
          <span className="dm-e">{STAGE_STATE_LABEL.current}</span>
          <b>اكتشف مهاراتك</b>
          {small ? null : (
            <small>
              <span>ارفع سيرتك الذاتية</span>
            </small>
          )}
        </span>
      </button>
    );
  }
  const stage = st.stage;
  return (
    <button
      aria-label={stageAria(stage)}
      className={cn("dm-bb dm-st", st.look === "done" ? "dm-done" : st.look === "now" ? "dm-now" : "dm-ahead")}
      data-key={st.key}
      data-level={stage.star}
      data-skill={stage.skill}
      data-state={stage.state}
      data-testid={TID.path.stage(stage.n)}
      onClick={() => onStation(st.key)}
      style={box(st.x, st.y, st.r)}
      type="button"
    >
      {st.look === "done" ? (
        <i aria-hidden className="dm-ghost">
          <b>{formatNumber(stage.n)}</b>
        </i>
      ) : null}
      <span className="dm-coin">
        <b>{formatNumber(stage.n)}</b>
        {st.look === "done" ? (
          <i className="dm-ck">
            <IconCheck size={small ? 10 : 11} strokeWidth={3.4} waypoint="off" />
          </i>
        ) : stage.state === "locked" ? (
          <i className="dm-lk">
            <IconLock size={13} strokeWidth={2.2} waypoint="off" />
          </i>
        ) : null}
      </span>
      <i className="dm-ld dm-q" />
      <StageLabel roomy={roomy} small={small} stage={stage} stars={stars} />
    </button>
  );
}

function MapSheetImpl({ g, roadmap, jobTitle, avatar, level, match, branches, stars, peaksAreControls, onStation, onGate, onBranch }: MapSheetProps) {
  const uid = useId().replace(/:/g, "");
  const [BL, BT, BB] = g.terrain.bleed;
  const W = g.width;
  const H = g.height;
  const sw = g.road;
  const dotW = g.small ? 3.4 : 4;
  const legW = g.small ? 4.2 : 5;
  const dash = `.1 ${g.dot}`;
  const drift = { ["--p" as string]: `${-(g.dot + 0.1)}` } as CSSProperties;
  const { w: flagW, h: flagH, pen } = g.flag;

  return (
    <div className="dm-plane" style={{ width: W, height: H }}>
      <svg aria-hidden className="dm-terrain" height={H + BT + BB} style={{ left: -BL, top: -BT }} viewBox={`${-BL} ${-BT} ${W + 2 * BL} ${H + BT + BB}`} width={W + 2 * BL}>
        <defs>
          <pattern height={GRID} id={`${uid}-grid`} patternUnits="userSpaceOnUse" width={GRID} x={0} y={0}>
            <circle className="dm-grid-dot" cx={GRID / 2} cy={GRID / 2} r={1.1} />
          </pattern>
        </defs>
        {g.terrain.bands.map((band, i) => (
          <g key={i}>
            <path className="dm-fall" d={band.d} transform={`translate(0 ${g.terrain.cliff + 7})`} />
            <path className="dm-cliff" d={band.d} transform={`translate(0 ${g.terrain.cliff})`} />
            <path className="dm-band" d={band.d} style={{ fill: `var(--t-${band.tint})` }} />
          </g>
        ))}
        {g.terrain.hairs.map((d, i) => (
          <path className="dm-hair" d={d} key={i} />
        ))}
        {/* the dotted survey grid lies over the whole sheet, under the trail and every label */}
        <rect className="dm-grid" fill={`url(#${uid}-grid)`} height={H + BT + BB} width={W + 2 * BL} x={-BL} y={-BT} />
        <path className="dm-svy" d={g.terrain.crosses} />
        {g.terrain.marks.map((m) => (
          <g className="dm-alt" key={m.pct} transform={`translate(${m.x} ${m.y})`}>
            <rect height={22} rx={6} width={g.small ? 40 : 44} x={0} y={-11} />
            <text x={g.small ? 20 : 22} y={5}>
              {formatPercent(m.pct)}
            </text>
          </g>
        ))}
      </svg>

      <svg aria-hidden className="dm-trail" height={H} viewBox={`0 0 ${W} ${H}`} width={W}>
        <defs>
          <mask height={H} id={`${uid}-leg`} maskUnits="userSpaceOnUse" width={W} x={0} y={0}>
            <path className="dm-draw" d={g.dLeg} data-o="leg" pathLength={1} stroke="white" strokeWidth={14} />
          </mask>
          <mask height={H} id={`${uid}-ahd`} maskUnits="userSpaceOnUse" width={W} x={0} y={0}>
            <path className="dm-draw" d={g.dAhead} data-o="ahead" pathLength={1} stroke="white" strokeWidth={14} />
          </mask>
        </defs>
        <g className="dm-brn">
          {g.peaks.map((p, i) => (
            <path d={p.d} key={i} />
          ))}
        </g>
        {/* ground shadows: every coin stands on the sheet */}
        <g className="dm-gshadow">
          {g.stations.map((s) => (
            <ellipse cx={s.x} cy={s.y + s.r + 1} data-gs={s.key} key={s.key} rx={s.r * 0.74} ry={g.small ? 4 : 5} />
          ))}
          <ellipse cx={g.summit.x} cy={g.summit.y + g.summit.r + 1} data-gs="summit" rx={g.summit.r * 0.74} ry={4} />
        </g>
        {/* the road: an edged white bed from the trailhead to the summit, drawn in the three legs of the story */}
        <g className="dm-bed" strokeWidth={sw}>
          {g.dSolid ? <path className="dm-draw" d={g.dSolid} data-o="solid" pathLength={1} /> : null}
          {g.dLeg ? <path className="dm-draw" d={g.dLeg} data-o="leg" pathLength={1} /> : null}
          {g.dAhead ? <path className="dm-draw" d={g.dAhead} data-o="ahead" pathLength={1} /> : null}
        </g>
        <g className="dm-bed-in" strokeWidth={sw - 3}>
          {g.dSolid ? <path className="dm-draw" d={g.dSolid} data-o="solid" pathLength={1} /> : null}
          {g.dLeg ? <path className="dm-draw" d={g.dLeg} data-o="leg" pathLength={1} /> : null}
          {g.dAhead ? <path className="dm-draw" d={g.dAhead} data-o="ahead" pathLength={1} /> : null}
        </g>
        {/* the way ahead: dots that drift slowly toward the summit (the little living move) */}
        {g.dAhead ? (
          <g mask={`url(#${uid}-ahd)`}>
            <path className="dm-ahd dm-dots" d={g.dAhead} strokeDasharray={dash} strokeWidth={dotW} style={drift} />
          </g>
        ) : null}
        {g.dLeg ? (
          <g mask={`url(#${uid}-leg)`}>
            <path className="dm-leg dm-dots" d={g.dLeg} strokeDasharray={dash} strokeWidth={legW} style={drift} />
          </g>
        ) : null}
        {/* the climbed part: solid ink (its own key in catch-up, where only this line draws) */}
        {g.dSolid ? (
          <path className="dm-cov dm-draw" d={g.dSolid} data-cov="" data-o="solid" pathLength={1} strokeWidth={sw - 7} />
        ) : null}
        {/* the focus ring and the lifted coin's shadow (placed by the camera) */}
        <ellipse className="dm-fshadow" rx={20} ry={6} />
        <circle className="dm-fring" pathLength={1} r={30} />
      </svg>

      <span className="dm-bb dm-st dm-start" style={box(g.start.x, g.start.y, g.start.r)}>
        <span className="dm-coin" data-o="start" />
        <i className="dm-ld dm-q" />
        <span className="dm-lb dm-q" data-o="start-lb">
          <b>البداية</b>
        </span>
      </span>

      {g.stations.map((st) => (
        <Station key={st.key} onGate={onGate} onStation={onStation} roomy={g.roomy} small={g.small} st={st} stars={stars} />
      ))}

      <button
        aria-label={`جاهز للوظيفة: ${jobTitle}`}
        className="dm-bb dm-st dm-sum"
        data-key="summit"
        data-state={roadmap.complete ? "lit" : "unlit"}
        data-testid={TID.path.trophy}
        onClick={() => onStation("summit")}
        style={box(g.summit.x, g.summit.y, g.summit.r)}
        type="button"
      >
        <span className="dm-coin">
          <i />
        </span>
        <i className="dm-ld dm-q" />
        <span className="dm-lb dm-q">
          <b>
            <span className="dm-name">جاهز للوظيفة</span>
          </b>
          <small>
            <bdi>{jobTitle}</bdi>
            {g.small ? null : (
              <>
                <i className="dm-sep" />
                <span>
                  مطابقة <bdi dir="ltr">{formatPercent(100)}</bdi>
                </span>
              </>
            )}
          </small>
        </span>
      </button>
      <span aria-hidden className="dm-bb dm-flag" style={at(g.summit.x, g.summit.y, 0)}>
        <svg height={flagH} style={{ left: -(flagW - 3), top: -flagH }} viewBox={`0 0 ${flagW} ${flagH}`} width={flagW}>
          <path className="dm-pole" d={`M${flagW - 3} ${flagH}V3`} />
          <path className="dm-pen" d={`M${flagW - 4.5} 4L4 ${4 + pen / 2}L${flagW - 4.5} ${4 + pen}Z`} />
        </svg>
      </span>

      <span
        className="dm-bb dm-you"
        data-side={g.you.side < 0 ? "left" : undefined}
        data-summit={g.you.atSummit ? "" : undefined}
        style={{ ...at(g.you.x, g.you.y, g.youH / 2), ["--sr" as string]: `${g.summit.r}px`, ["--room" as string]: `${g.you.room}px` }}
      >
        {g.you.atSummit ? null : <i className="dm-wp" />}
        <span className="dm-pill" data-surface="stage">
          <Avatar id={avatar} level={level} size={g.small ? 30 : 40} />
          <span className="dm-tx">
            <b>أنت هنا</b>
            {/* the word and the match are two pieces: with too little room the word wraps away (map.css); the space stays with
                the word (a no-break space, which a flex item keeps), so the line reads as before */}
            <small>
              <span>مطابقتك&nbsp;</span>
              <bdi dir="ltr">
                <NumberTicker delay={match.delay} duration={match.duration} format={formatPercent} from={match.from} value={match.value} />
              </bdi>
            </small>
          </span>
        </span>
      </span>

      {branches.map((b, i) => {
        const p = g.peaks[i];
        if (p === undefined) return null;
        const style: CSSProperties = p.label === null ? peakBox(p.x, p.y) : { ...peakBox(p.x, p.y), ["--lb-room" as string]: `${p.label.room}px`, ["--lb-max" as string]: `${p.label.max}px` };
        const drawing = (
          <>
            <svg aria-hidden height={22} viewBox="0 0 24 22" width={24}>
              <path d="M12 2.5 22 19.5H2z" />
            </svg>
            <span className="dm-lb dm-q">
              <b>
                <bdi>{b.title}</bdi>
                {peaksAreControls ? <IconChevronForward size={15} waypoint="off" /> : null}
              </b>
              {g.small ? null : (
                <small>
                  <span>
                    الآن <bdi dir="ltr">{formatPercent(b.now)}</bdi>
                  </span>
                  <i className="dm-sep" />
                  <span>
                    بعد المسار <bdi dir="ltr">{formatPercent(b.after)}</bdi>
                  </span>
                </small>
              )}
            </span>
          </>
        );
        return peaksAreControls ? (
          <button className="dm-bb dm-peak" data-side={i === 0 ? "a" : "b"} data-testid={TID.path.branch(b.jobId)} data-value={b.after} key={b.jobId} onClick={() => onBranch(b.jobId)} style={style} type="button">
            {drawing}
          </button>
        ) : (
          <span aria-hidden className="dm-bb dm-peak" data-side={i === 0 ? "a" : "b"} key={b.jobId} style={style}>
            {drawing}
          </span>
        );
      })}
    </div>
  );
}

export const MapSheet = memo(MapSheetImpl);
