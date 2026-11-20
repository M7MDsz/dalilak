// Dalilak's utility icons: arrows, controls and small objects, the same family as signature.tsx.
// 24 grid, 2 px margin, stroke 2 (IconBase), round caps and joins, radius 2 on boxes, true arcs on rings, no fills.
// Long straight strokes sit on whole units so they stay crisp at 24 px. Exactly one waypoint dot per icon, never as a
// corner badge, with at least 1.5 units of air around it. It is placed by one of three rules:
//   1. Movement (arrows, chevrons, send, upload, exit, retry, reset, branch, play, edit, plus, close, check, the stairs,
//      the i of info): the dot is on the line's course: a short gap past an arrow's tip, on the axis of the forward (left)
//      arm, where the check touches down, on the top step.
//   2. Objects (rings, pages, boxes, buildings, the bubble): the outline opens once and the dot sits in the opening.
//   3. Places (pin, calendar, list, lesson, caret, map, stop): the dot marks your place: today, the current row, the caret.
// Icons whose dot sits outside the strokes re-centre their strokes when the dot is off (waypoint="off"), so a bare chevron
// or check is centred in its box.
import { IconBase, type IconProps } from "./icon-base";

/** Search: the lens is an open ring, like the match ring; the waypoint sits in its opening. */
export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17.41 9.41A7 7 0 1 1 11.6 3.59" />
      <path d="M15.5 15.5 20 20" />
      <circle className="wp" cx="15.5" cy="5.5" r="1.75" />
    </IconBase>
  );
}

/** Filter: a funnel open at its spout; what passes through is the waypoint. */
export function IconFilter(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 2)" : undefined}>
        <path d="M10 15.5V12L3.5 4h17L14 12v3.5" />
      </g>
      <circle className="wp" cx="12" cy="19.75" r="1.75" />
    </IconBase>
  );
}

/** Upload: the tray is a valley, open at the top; the arrow climbs out of it to the waypoint. */
export function IconUpload(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 -2)" : undefined}>
        <path d="M12 16V8M8.5 11.5 12 8l3.5 3.5M4 12v3a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-3" />
      </g>
      <circle className="wp" cx="12" cy="3.75" r="1.75" />
    </IconBase>
  );
}

/** Send (apply): a folded paper plane, its long wing trailing, flying forward (left and a little up) to the waypoint. */
export function IconSend(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-2.5 0)" : undefined}>
        <path d="M8 9.5 21 7l-5 5.5-1 4.5zM8 9.5l8 3" />
      </g>
      <circle className="wp" cx="3.75" cy="8" r="1.75" />
    </IconBase>
  );
}

/** Forward: points LEFT (forward in Arabic), toward the waypoint. */
export function IconArrowForward(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-2 0)" : undefined}>
        <path d="M19.5 12H9M15 6l-6 6 6 6" />
      </g>
      <circle className="wp" cx="4.5" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Back: points right. */
export function IconArrowBack(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(2 0)" : undefined}>
        <path d="M4.5 12H15M9 6l6 6-6 6" />
      </g>
      <circle className="wp" cx="19.5" cy="12" r="1.75" />
    </IconBase>
  );
}

export function IconArrowUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 -2)" : undefined}>
        <path d="M12 19.5V9M6 15l6-6 6 6" />
      </g>
      <circle className="wp" cx="12" cy="4.5" r="1.75" />
    </IconBase>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 2)" : undefined}>
        <path d="M12 4.5V15M6 9l6 6 6-6" />
      </g>
      <circle className="wp" cx="12" cy="19.5" r="1.75" />
    </IconBase>
  );
}

/** Chevrons: the dot stands clear ahead of the point (a full gap, so it never reads as a head or a summit). */
export function IconChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 3)" : undefined}>
        <path d="M4 5l8 8 8-8" />
      </g>
      <circle className="wp" cx="12" cy="19.25" r="1.75" />
    </IconBase>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 -3)" : undefined}>
        <path d="M4 19l8-8 8 8" />
      </g>
      <circle className="wp" cx="12" cy="4.75" r="1.75" />
    </IconBase>
  );
}

/** Chevron forward: points left. */
export function IconChevronForward(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-3 0)" : undefined}>
        <path d="M19 4l-8 8 8 8" />
      </g>
      <circle className="wp" cx="4.75" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Chevron back: points right. */
export function IconChevronBack(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(3 0)" : undefined}>
        <path d="M5 4l8 8-8 8" />
      </g>
      <circle className="wp" cx="19.25" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Plus: the forward (left) arm leads on to the waypoint, on its own axis. */
export function IconPlus(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-2 0)" : undefined}>
        <path d="M8 12h12M14 6v12" />
      </g>
      <circle className="wp" cx="3.75" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Close: one arm stops short and the waypoint continues it, low and forward (bottom left). */
export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 5l14 14M19 5 8.5 15.5" />
      <circle className="wp" cx="5" cy="19" r="1.75" />
    </IconBase>
  );
}

/** Check: the stroke comes down to the waypoint and climbs away; the dot is where it touched down. */
export function IconCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 2)" : undefined}>
        <path d="M4 9.5l5.5 5.5L20 4.5" />
      </g>
      <circle className="wp" cx="9.5" cy="19.25" r="1.75" />
    </IconBase>
  );
}

/** Done («تمّ»): the ring opens at its foot, under the point where the check touches down (as on IconCheck); the
 *  waypoint sits in the opening. */
export function IconCheckCircle(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 .5)" : undefined}>
        <path d="M16.24 18.28A8 8 0 1 0 7.76 18.28" />
        <path d="M8 11.5l3 3 5-6" />
      </g>
      <circle className="wp" cx="12" cy="19.5" r="1.75" />
    </IconBase>
  );
}

/** Lock: the shackle is the logo's arch; the body opens between its feet and the waypoint is the keyhole. */
export function IconLock(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2.5" />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
      <circle className="wp" cx="12" cy="15.5" r="1.75" />
    </IconBase>
  );
}

/** Unlock: the same lock with the shackle lifted free on one side. */
export function IconUnlock(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0" />
      <circle className="wp" cx="12" cy="15.5" r="1.75" />
    </IconBase>
  );
}

/** Edit: the pencil is about to set down the waypoint just beyond its tip. */
export function IconEdit(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-2 2)" : undefined}>
        <path d="M7.5 16.5l2-5 7-7a2.12 2.12 0 0 1 3 3l-7 7zM9.5 11.5l3 3" />
      </g>
      <circle className="wp" cx="4" cy="20" r="1.75" />
    </IconBase>
  );
}

/** Delete: the bin is open under its lid; what is thrown away is the waypoint inside. */
export function IconTrash(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5h16M9.5 6.5V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6 6.5l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <circle className="wp" cx="12" cy="13.5" r="1.75" />
    </IconBase>
  );
}

/** Retry: the ring turns clockwise and its arrow heads into the opening, where the waypoint is. */
export function IconRetry(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18.78 16.24A8 8 0 1 1 18.78 7.76" />
      <path d="M19.57 4.35l-.79 3.41-3.41-.79" />
      <circle className="wp" cx="20" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Stop (the answer): the plain stop square with the waypoint held at its centre. */
export function IconStop(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="13" rx="2.5" width="13" x="5.5" y="5.5" />
      <circle className="wp" cx="12" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Play (start a lesson): the triangle opens at its point, and the waypoint is where it is heading. */
export function IconPlay(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(2 0)" : undefined}>
        <path d="M14.25 9 5.5 4v16l8.75-5" />
      </g>
      <circle className="wp" cx="17.5" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Sign out: the arrow leaves the open door frame for the waypoint outside. */
export function IconLogout(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-2.5 0)" : undefined}>
        <path d="M14 4h3.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14M16 12H9.5M13 8.5 9.5 12l3.5 3.5" />
      </g>
      <circle className="wp" cx="5" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Info: the stroke of the i rises and stops; its dot is the waypoint. */
export function IconInfo(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12v4.5" />
      <circle className="wp" cx="12" cy="7.75" r="1.75" />
    </IconBase>
  );
}

/** Warning: the sign opens at its base under the point of the exclamation mark. */
export function IconWarning(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.5 20.5H3L12 3.5l9 17h-5.5" />
      <path d="M12 10v3" />
      <circle className="wp" cx="12" cy="17.25" r="1.75" />
    </IconBase>
  );
}

/** Copy: the sheet behind stops short, and the waypoint marks its missing corner. */
export function IconCopy(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15.5 6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4.5" />
      <rect height="11" rx="2" width="11" x="9" y="9" />
      <circle className="wp" cx="4" cy="15" r="1.75" />
    </IconBase>
  );
}

/** Hours: the dial is a ring open at six o'clock, with the waypoint in its opening. */
export function IconClock(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 .5)" : undefined}>
        <path d="M16.24 18.28A8 8 0 1 0 7.76 18.28" />
        <path d="M12 7v4.5l3.5 2" />
      </g>
      <circle className="wp" cx="12" cy="19.5" r="1.75" />
    </IconBase>
  );
}

/** City: a pin standing on an open contour of ground; the waypoint is the place it marks. */
export function IconLocation(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 17.5s-5.5-4.6-5.5-9a5.5 5.5 0 0 1 11 0c0 4.4-5.5 9-5.5 9z" />
      <path d="M8 16c-2.7.5-4.5 1.3-4.5 2.25 0 1.5 3.8 2.75 8.5 2.75s8.5-1.25 8.5-2.75c0-.95-1.8-1.75-4.5-2.25" />
      <circle className="wp" cx="12" cy="8.5" r="1.75" />
    </IconBase>
  );
}

/** Employer: a stepped skyline on a ground line (a tower with windows, a low wing); the ground opens at the tower's
 *  door and the waypoint stands in the doorway. */
export function IconCompany(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 20h7V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14h2M10 12H6a2 2 0 0 0-2 2v6M13 7.5V9M16 7.5V9M13 11.5V13M16 11.5V13M7 15v1.5" />
      <circle className="wp" cx="14.5" cy="20" r="1.75" />
    </IconBase>
  );
}

/** Calendar: the days you have walked are a line that runs (right to left) up to today, the waypoint. */
export function IconCalendar(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="15.5" rx="2" width="17" x="3.5" y="5" />
      <path d="M8 3v4M16 3v4M3.5 10h17M17 15.5h-4.5" />
      <circle className="wp" cx="8" cy="15.5" r="1.75" />
    </IconBase>
  );
}

/** File: a portrait sheet with two lines of text; its top corner (the inline end, left in Arabic) is folded away, and the
 *  waypoint sits in the fold. */
export function IconFile(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11.5 3H17a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9.5M15 13H9M15 17h-3.5" />
      <circle className="wp" cx="8.25" cy="6.25" r="1.75" />
    </IconBase>
  );
}

/** Pasted text: a text field with a line of text and the text cursor (an I-beam) at its end; the field opens above the
 *  cursor, and the waypoint is where the text goes in. */
export function IconPaste(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 -1)" : undefined}>
        <path d="M5 8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-6M9 11v4M7.5 11h3M7.5 15h3M17.5 13H13" />
      </g>
      <circle className="wp" cx="9" cy="5.75" r="1.75" />
    </IconBase>
  );
}

/** From your CV: a page of text whose middle sentence runs out through an opening in the page to the waypoint. */
export function IconEvidence(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-2 0)" : undefined}>
        <path d="M8 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-3M17 7h-5M17 12H8M17 17h-3" />
      </g>
      <circle className="wp" cx="3.75" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Branch: the main trail runs on, solid; a side trail leaves it and turns dotted (not walked yet) on its way to its own
 *  waypoint, another job. The brand's "solid line, waypoint, dotted line". */
export function IconBranch(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(-1.5 0)" : undefined}>
        <path d="M18 21V3M18 17l-4-4M11.5 10.5h0M9 8h0" />
      </g>
      <circle className="wp" cx="5.75" cy="4.75" r="1.75" />
    </IconBase>
  );
}

/** Map view: the folded map, its middle panel wide enough to hold you, the waypoint. */
export function IconMapView(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 6l4.25-2 8.5 2 4.25-2v14l-4.25 2-8.5-2-4.25 2zM7.75 4v14M16.25 6v14" />
      <circle className="wp" cx="12" cy="12" r="1.75" />
    </IconBase>
  );
}

/** List view: the stations as rows, markers on the start side; the middle row's marker is the waypoint (the current one). */
export function IconListView(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h10.5M4 12h10.5M4 18h10.5M18.5 6h1M18.5 18h1" />
      <circle className="wp" cx="19" cy="12" r="1.75" />
    </IconBase>
  );
}

/** New chat: a bubble with a plus; the bubble opens where its tail would be, and the waypoint is the tail. */
export function IconNewChat(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 2)" : undefined}>
        <path d="M11 16h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2M12 7v6M9 10h6" />
      </g>
      <circle className="wp" cx="8.5" cy="19.75" r="1.75" />
    </IconBase>
  );
}

/** Start again: the ring turns back (anticlockwise) into its opening, to the waypoint where you began. */
export function IconReset(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5.22 16.24A8 8 0 1 0 5.22 7.76" />
      <path d="M4.43 4.35l.79 3.41 3.41-.79" />
      <circle className="wp" cx="4" cy="12" r="1.75" />
    </IconBase>
  );
}

/** Remote (work from home): a house that opens at its door; the waypoint (you) stands in the doorway and sends a signal
 *  out, the arc above it. */
export function IconRemote(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 11l9-7.5 9 7.5M9.5 20H7a2 2 0 0 1-2-2V9.5M19 9.5V18a2 2 0 0 1-2 2h-2.5M8.75 13.25a4.6 4.6 0 0 1 6.5 0" />
      <circle className="wp" cx="12" cy="16.5" r="1.75" />
    </IconBase>
  );
}

/** Lessons: a lesson screen; its progress line runs (right to left) up to the waypoint. */
export function IconLessons(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="12.5" rx="2" width="18" x="3" y="3" />
      <path d="M10 6.5V12l4.5-2.75zM20.5 20h-6.25" />
      <circle className="wp" cx="10" cy="20" r="1.75" />
    </IconBase>
  );
}

/** Years of experience: a staircase of three steps climbed forward (to the left), one step per experience band; the
 *  waypoint stands on the top step. */
export function IconExperience(props: IconProps) {
  return (
    <IconBase {...props}>
      <g transform={props.waypoint === "off" ? "translate(0 -2)" : undefined}>
        <path d="M21 20h-4v-4h-5v-4H7V8H3" />
      </g>
      <circle className="wp" cx="5" cy="3.75" r="1.75" />
    </IconBase>
  );
}

/** Opens outside Dalilak (a real job posting): an arrow leaving its box. */
export function IconExternal(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.5 4H20v6.5M20 4l-8.5 8.5" />
      <path d="M17 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2h4" />
      <circle className="wp" cx="4.5" cy="3.75" r="1.75" />
    </IconBase>
  );
}
