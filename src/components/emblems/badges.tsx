import type { ReactNode } from "react";

import { levelArt } from "./levels";
import { Ahead, Bold, EmblemSvg, Enamel, Fine, Key, Ln, starPath, Trail, Wp } from "./parts";

/** The twelve badges of PRODUCT-SPEC 8.6, in the spec's order. */
export const BADGE_IDS = [
  "first-steps",
  "goal-set",
  "cv-scanned",
  "first-application",
  "first-course",
  "five-courses",
  "streak-3",
  "streak-7",
  "ten-skills",
  "level-5",
  "job-ready",
  "top-ten",
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

/** Arabic names (spec 8.6), for galleries and accessible names. */
export const BADGE_NAMES: Readonly<Record<BadgeId, string>> = {
  "first-steps": "الخطوة الأولى",
  "goal-set": "صاحب هدف",
  "cv-scanned": "سيرة مقروءة",
  "first-application": "أول تقديم",
  "first-course": "أول دورة",
  "five-courses": "خمس دورات",
  "streak-3": "ثلاثة أيام",
  "streak-7": "أسبوع كامل",
  "ten-skills": "عشر مهارات",
  "level-5": "المستوى الخامس",
  "job-ready": "جاهز للوظيفة",
  "top-ten": "ضمن العشرة الأوائل",
};

type Art = (locked: boolean) => ReactNode;

/** A shoe print (forefoot, waist, heel) pointing up before rotation; mirror for the other foot. */
function Print({ x, y, a, locked, solid, left }: { readonly x: number; readonly y: number; readonly a: number; readonly locked: boolean; readonly solid: boolean; readonly left: boolean }) {
  const sole = "M.2-7.2C2.5-7.2 3.5-5.3 3.5-3.2 3.5-1.1 2.3.3 2.1 1.9 1.9 3.4 2.5 4.4 2.3 5.6 2.1 6.8 1.2 7.4 0 7.4-1.2 7.4-2.1 6.6-2.1 5.4-2.1 4-1.5 3-1.5 1.6-1.5.2-3-1-3-3.4-3-5.6-1.8-7.2.2-7.2z";
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${left ? -1 : 1} 1)`}>
      {solid ? <Key d={sole} locked={locked} outline={1.5} /> : <Enamel d={sole} locked={locked} outline={1.5} />}
    </g>
  );
}

/**
 * The campfire with the streak's length as a big Latin numeral (the solid key) inside the flame, so the two streak badges
 * differ in their main shape, not in a detail. The flame opens at its foot and the waypoint (today) sits in that opening,
 * above the crossed logs.
 */
function StreakFire({ n, locked }: { readonly n: 3 | 7; readonly locked: boolean }) {
  const numeral =
    n === 7
      ? "M12.9 9.8H19.1L14.8 18.6"
      : "M13.2 11c.6-.9 1.6-1.4 2.9-1.4 1.8 0 3 .9 3 2.2s-1.2 2.1-3.1 2.1h-.4c2.1 0 3.4.9 3.4 2.3 0 1.5-1.4 2.4-3.3 2.4-1.3 0-2.4-.5-3.1-1.4";
  return (
    <>
      <Ln d="M9.4 28.8 22.6 25.2M9.4 25.2l13.2 3.6" />
      <Enamel d="M12.2 22.2C9 20.8 7.6 18.2 7.8 15 8 11.2 11 9.2 13 6.4c1.2-1.6 1.6-3 1.4-4.6C16.6 2.9 18.4 4.4 19.4 6.4 19.9 5.4 20.6 4.6 21.6 3.8 23.4 6.6 24.4 11.2 24.2 15c.2 3.2-1.2 5.8-4.4 7.2" locked={locked} outline={1.75} />
      <g transform="translate(0.5 0)">
        <Bold d={numeral} locked={locked} w={2.6} />
      </g>
      <Wp cx={16} cy={22.6} locked={locked} r={2.1} />
    </>
  );
}

const ART: Readonly<Record<BadgeId, Art>> = {
  // Two footprints climbing toward the next waypoint: the first step taken is the solid one.
  "first-steps": (L) => (
    <>
      <Fine d="M4.4 27.4c4.2-1.6 8.8-1.7 13.4-.3 3.6 1.1 6.8 1 9.8-.4" />
      <Print a={-30} left={false} locked={L} solid={false} x={22} y={19} />
      <Print a={-30} left locked={L} solid x={12.4} y={13.8} />
      <Ahead d="M10.4 5.6 9 4.6" w={1.4} />
      <Wp cx={7} cy={3.9} locked={L} r={2.1} />
    </>
  ),

  // The goal: a flag planted at the centre of the summit's contours.
  "goal-set": (L) => (
    <>
      <Fine d="M3.93 21.7A12.5 5.1 0 1 1 3.93 24.3" />
      <Fine d="M23.73 23.85A8 3.3 0 1 1 23.73 22.15" />
      <Enamel d="M16 21.3c2.3 0 4 .76 4 1.7s-1.7 1.7-4 1.7-4-.76-4-1.7 1.7-1.7 4-1.7z" locked={L} outline={1.2} />
      <Ln d="M16 23V4.4" />
      <Key d="M16 5 6.6 8.5 16 12z" locked={L} outline={1.6} />
      <Wp cx={16} cy={23} locked={L} r={2.1} />
    </>
  ),

  // A CV being read: the found evidence is heavy, and the reader's waypoint sits in the middle of a line, between the
  // part read (heavy) and the rest of the sentence (fine). The skill star it proved, solid.
  "cv-scanned": (L) => (
    <>
      <Enamel d="M11.2 3.6h8.6l4.6 4.6v16.4a2 2 0 0 1-2 2H11.2a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2z" locked={L} />
      <Ln d="M19.6 3.8v4.6h4.6" />
      <Fine d="M14.2 11.2h7M12.6 22.4h8.8M13.2 18.6H11.4" />
      <Bold d="M21.2 14.9h-8.6M21.8 18.6h-2.4" locked={L} w={2.4} />
      <Wp cx={16} cy={18.6} locked={L} r={1.75} />
      <Key d={starPath(8.6, 25.4, 4.6, 2.1)} locked={L} outline={1.3} />
    </>
  ),

  // A paper plane away on its flight, from the waypoint where you pressed «تقديم».
  "first-application": (L) => (
    <>
      <Trail d="M23.7 24.2c-.7-2.4-1.9-4-3.8-5" locked={L} w={1.4} />
      <Enamel d="M4.8 7.4 27 12.6l-8.6 3.6z" locked={L} outline={1.6} />
      <Key d="M4.8 7.4 18.4 16.2l-2.6 7.6z" locked={L} outline={1.6} />
      <Wp cx={24.4} cy={26.3} locked={L} />
    </>
  ),

  // An open book: its first page (the right-hand one, in Arabic) read and solid; the bookmark ribbon hangs from the
  // spine and its end is the waypoint.
  "first-course": (L) => (
    <g>
      <g transform="translate(0 -1.2)">
        <Enamel d="M16 8c-3.3-2-7.2-2.5-11.2-2v16.2c4-.4 7.9.1 11.2 2z" locked={L} />
        <Fine d="M8.2 10.3c1.9 0 3.6.3 5.2.9M8.2 13.5c1.9 0 3.6.3 5.2.9M8.2 16.7c1.9 0 3.6.3 5.2.9" />
        <Key d="M16 8c3.3-2 7.2-2.5 11.2-2v16.2c-4-.4-7.9.1-11.2 2z" locked={L} outline={1.75} />
        <Ln d="M16 8v16.2" />
      </g>
      <Trail d="M16 23v1.2c0 1.5-.6 2.6-1.8 3.4" locked={L} w={1.5} />
      <Wp cx={12.5} cy={28.7} locked={L} r={2} />
    </g>
  ),

  // Five books stacked like steps, the fifth (the newest) solid, on a ground line that runs on ahead (to the left) and
  // ends in the waypoint.
  "five-courses": (L) => (
    <g>
      <g transform="translate(1.2 -2.2)">
        <Enamel d="M7 23.4h19a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zM9 19.4h15.6a1 1 0 0 1 1 1v3H8v-3a1 1 0 0 1 1-1zM6.6 15.4h16.6a1 1 0 0 1 1 1v3H5.6v-3a1 1 0 0 1 1-1zM8.6 11.4h16.4a1 1 0 0 1 1 1v3H7.6v-3a1 1 0 0 1 1-1z" locked={L} />
        <Fine d="M9.6 23.4v4M23.4 23.4v4M11 19.4v4M22.4 19.4v4M8.8 15.4v4M21 15.4v4M10.6 11.4v4M22.6 11.4v4" />
        <Key d="M10.6 7.4h12a1 1 0 0 1 1 1v3h-14v-3a1 1 0 0 1 1-1z" locked={L} outline={1.6} />
      </g>
      <Trail d="M29.4 27.9H9.4" locked={L} />
      <Wp cx={5.8} cy={27.9} locked={L} r={2.1} />
    </g>
  ),

  // The campfire with a big 3: three days in a row.
  "streak-3": (L) => <StreakFire locked={L} n={3} />,

  // The campfire with a big 7: the whole week.
  "streak-7": (L) => <StreakFire locked={L} n={7} />,

  // A solid skill star on a ring of ten stations; the tenth is the waypoint.
  "ten-skills": (L) => (
    <>
      <Fine d="M18.3 4.32A12 12 0 1 1 13.7 4.32" w={0.9} />
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((-90 + (i + 1) * 36) * Math.PI) / 180;
        return <circle cx={16 + 12 * Math.cos(a)} cy={16.1 + 12 * Math.sin(a)} fill="currentColor" key={i} r={1.35} />;
      })}
      <Key d={starPath(16, 16.9, 7.2, 3.3)} locked={L} outline={1.6} />
      <Wp cx={16} cy={4.1} locked={L} r={2.1} />
    </>
  ),

  // The level-5 emblem itself, so "level" always looks the same: the mountain climbed to the fifth mark.
  "level-5": (L) => levelArt(5, L),

  // The match ring closed to 100%, ending in the waypoint, around the job.
  "job-ready": (L) => (
    <>
      <path d="M18.7 4.1A12.4 12.4 0 1 1 13.3 4.1" fill="none" stroke="currentColor" strokeDasharray={L ? "0.01 3.2" : undefined} strokeLinecap="round" strokeWidth={L ? 1.75 : 2.6} />
      <Enamel d="M10 13.2h12a1.8 1.8 0 0 1 1.8 1.8v6.6a1.8 1.8 0 0 1-1.8 1.8H10a1.8 1.8 0 0 1-1.8-1.8V15a1.8 1.8 0 0 1 1.8-1.8z" locked={L} outline={1.6} />
      <Ln d="M13.4 13.2v-1.4a1.7 1.7 0 0 1 1.7-1.7h1.8a1.7 1.7 0 0 1 1.7 1.7v1.4M8.2 17.6h15.6" w={1.5} />
      <Key d="M14.6 16.2h2.8v2.8h-2.8z" locked={L} outline={1.1} />
      <Wp cx={16} cy={4.1} locked={L} r={2.1} />
    </>
  ),

  // «10» inside a laurel; the waypoint in the gap at its base, where the two branches part.
  "top-ten": (L) => {
    const leaves: [number, number, number][] = [
      [8.6, 24.6, 54],
      [5.9, 20.2, 28],
      [4.9, 15.4, 6],
      [5.5, 10.7, -16],
    ];
    const leaf = "M0-2.7C.75-2 1.15-1 1.15 0S.75 2 0 2.7C-.75 2-1.15 1-1.15 0S-.75-2 0-2.7z";
    return (
      <>
        <Fine d="M13.1 27.5c-4.2-1.5-6.9-5.8-6.7-11.5.1-2.6.9-4.7 2.1-6.6M18.9 27.5c4.2-1.5 6.9-5.8 6.7-11.5-.1-2.6-.9-4.7-2.1-6.6" />
        {leaves.map(([x, y, a]) => (
          <g key={`l${x}${y}`}>
            <g transform={`translate(${x} ${y}) rotate(${a})`}>
              <Key d={leaf} locked={L} outline={0.9} />
            </g>
            <g transform={`translate(${32 - x} ${y}) rotate(${-a})`}>
              <Key d={leaf} locked={L} outline={0.9} />
            </g>
          </g>
        ))}
        <Ln d="M11.8 13.6l1.8-1.4v9.6" w={1.9} />
        <Ln d="M19 12.2c1.6 0 2.5 1.6 2.5 4.8s-.9 4.8-2.5 4.8-2.5-1.6-2.5-4.8.9-4.8 2.5-4.8z" w={1.9} />
        <Wp cx={16} cy={28} locked={L} r={1.85} />
      </>
    );
  },
};

export interface BadgeEmblemProps {
  readonly id: BadgeId;
  /** Locked form: the same drawing unlit (bare line, the trail dotted, the waypoint an empty ring). */
  readonly locked?: boolean;
  /**
   * Rendered size in px (square). Default 48. Inside BadgeMedal pass 46% of the medal (lg 112 → 52, md 80 → 37, sm 56 → 26);
   * without it the emblem still never grows past the medal's box (it shrinks to fit).
   */
  readonly size?: number;
  readonly className?: string;
  /** Accessible name; without it the emblem is decorative (the medal around it usually carries the name). */
  readonly title?: string;
}

/** The drawn emblem of one badge (spec 8.6), for the design system's BadgeMedal. Colours from tokens only. */
export function BadgeEmblem({ id, locked = false, size = 48, className, title }: BadgeEmblemProps) {
  return (
    <EmblemSvg className={className} locked={locked} size={size} title={title}>
      {ART[id](locked)}
    </EmblemSvg>
  );
}
