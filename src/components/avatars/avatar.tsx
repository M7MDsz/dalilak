// <Avatar id size level className title />: one of Dalilak's twelve hand-drawn avatars in its round ground, optionally
// wearing the seven-segment level ring. No hooks, no ids: it renders on the server and the client alike.
import { cn } from "@/lib/cn";

import { isAvatarId, type AvatarId } from "./data";
import { LevelRing, ringMetrics } from "./level-ring";
import { av09, av10, av11, av12 } from "./men";
import { av01, av02, av03, av04 } from "./neutral";
import { GroundField, GroundRim, type Figure } from "./parts";
import { av05, av06, av07, av08 } from "./women";

const ART: Record<AvatarId, Figure> = {
  "av-01": av01,
  "av-02": av02,
  "av-03": av03,
  "av-04": av04,
  "av-05": av05,
  "av-06": av06,
  "av-07": av07,
  "av-08": av08,
  "av-09": av09,
  "av-10": av10,
  "av-11": av11,
  "av-12": av12,
};

/**
 * The silhouette pass: the figure drawn once more underneath itself, every shape forced to ink and fattened, so only an
 * outer contour shows around the whole figure (headwear, hair, shoulders) and none inside it. Plain CSS on the group,
 * no SVG filter and no id.
 */
const SILHOUETTE =
  "[&_*]:[fill:var(--color-ink)] [&_*]:[stroke:var(--color-ink)] [&_*]:[stroke-width:3.6px] [&_*]:[stroke-dasharray:none] [&_*]:[stroke-linejoin:round] [&_*]:[opacity:1]";

/** Whether the set is drawn with the outer contour. One switch for the whole product. */
export const OUTLINE = true;

/** The 96 x 96 drawing of one avatar (ground, trail, rim, figure). */
export function AvatarArt({ id, outline = OUTLINE }: { readonly id: AvatarId; readonly outline?: boolean }) {
  const fig = ART[id];
  return (
    <>
      <GroundField ground={fig.ground} trail={fig.trail} />
      <GroundRim ground={fig.ground} />
      {outline ? <g className={SILHOUETTE}>{fig.draw()}</g> : null}
      {fig.draw()}
    </>
  );
}

export interface AvatarProps {
  /** One of av-01..av-12. Anything else falls back to av-01 (never crashes on stale saved data). */
  readonly id: AvatarId | (string & {});
  /** Outer size in px, ring included. */
  readonly size?: number;
  /** 1..7 draws the level ring; without it, no ring. */
  readonly level?: number;
  readonly className?: string;
  /** Accessible name. Without it the avatar is decorative (it usually sits next to the person's name). */
  readonly title?: string;
}

export function Avatar({ id, size = 40, level, className, title }: AvatarProps) {
  return <AvatarFrame className={className} id={id} level={level} size={size} title={title} />;
}

/** The Avatar with the drawing style exposed, for the gallery's side-by-side study only (not exported from the index). */
export function AvatarFrame({ id, size = 40, level, className, title, outline = OUTLINE }: AvatarProps & { readonly outline?: boolean }) {
  const safeId: AvatarId = isAvatarId(id) ? id : "av-01";
  const hasRing = typeof level === "number" && Number.isFinite(level) && level >= 1;
  const inset = hasRing ? ringMetrics(size).inset : 0;
  return (
    <span
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
      className={cn("relative inline-block shrink-0 align-middle", className)}
      data-avatar={safeId}
      role={title === undefined ? undefined : "img"}
      style={{ width: size, height: size }}
    >
      <span className="absolute overflow-hidden rounded-full" style={{ inset }}>
        <svg aria-hidden className="block size-full" focusable="false" viewBox="0 0 96 96">
          <AvatarArt id={safeId} outline={outline} />
        </svg>
      </span>
      {hasRing ? <LevelRing level={Math.min(7, level)} size={size} /> : null}
    </span>
  );
}
