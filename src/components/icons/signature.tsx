import { IconBase, type IconProps } from "./icon-base";

/* Navigation */

// The logo mark cut to 24: the outer arch folds into the inner arch, the waypoint between the inner feet (always with «مساري»).
export function IconPath(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 19v-4.5a9 9 0 0 0-18 0v2.25a2.25 2.25 0 0 0 4.5 0V14.5a4.5 4.5 0 0 1 9 0V19" />
      <circle className="wp" cx="12" cy="17.5" r="1.75" />
    </IconBase>
  );
}

// A sapling on the ground: two leaves grown, the stem stops, and the bud is the next skill.
export function IconSkills(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21V10M12 16.5c-3.5 0-6.5-1.5-7-5 3.5 0 6.5 1.5 7 5zM12 13c3.5 0 6.5-1.5 7-5-3.5 0-6.5 1.5-7 5zM7.5 21h9" />
      <circle className="wp" cx="12" cy="5.5" r="1.75" />
    </IconBase>
  );
}

// An open book; a trail on one page crosses the spine to the waypoint on the other.
export function IconCourses(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 8.5C10.5 7 7 6 3 6.5V18c4-.5 7.5.5 9 2 1.5-1.5 5-2.5 9-2V6.5c-4-.5-7.5.5-9 2zM12 8.5V20" />
      <path d="M5.5 15.5c2 0 2.5-3.5 4.5-3.5" />
      <circle className="wp" cx="16.5" cy="13" r="1.75" />
    </IconBase>
  );
}

// A sheet with its corner folded at the end side, lines set from the right (Arabic), the last line runs on into the waypoint: the next entry.
export function IconCv(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 3h7.5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V8.5zM10 3v4a1.5 1.5 0 0 1-1.5 1.5h-4" />
      <path d="M16.5 7.5h-3M16.5 12H8M16.5 16.5h-3" />
      <circle className="wp" cx="9" cy="16.5" r="1.75" />
    </IconBase>
  );
}

// A case whose top edge opens into an arch (the logo's grammar) for a handle; the waypoint stands in that doorway.
export function IconJobs(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16.5 8H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.5a4.5 3 0 0 1 9 0M3 14h18" />
      <circle className="wp" cx="12" cy="9.5" r="1.75" />
    </IconBase>
  );
}

// A clipboard tracker read from the right: a done step, then the waypoint as the current one.
export function IconApplications(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.5 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2.5" />
      <path d="M9.5 3h5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M13 10.5l1.5 1.5 3-3M10 10.5H7M11 16.5H7" />
      <circle className="wp" cx="15.5" cy="16.5" r="1.75" />
    </IconBase>
  );
}

// A podium on one ground line: second on the start side, third on the end side, the waypoint on the first block.
export function IconLeaderboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 18.5h18M3 18.5v-4A1.5 1.5 0 0 1 4.5 13h3M21 18.5V12a1.5 1.5 0 0 0-1.5-1.5h-3M7.5 18.5v-10a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v10" />
      <circle className="wp" cx="12" cy="11.5" r="1.75" />
    </IconBase>
  );
}

// Ring head, arch shoulders, the waypoint inside the arch (the logo's grammar).
export function IconProfile(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="7.5" r="3" />
      <path d="M5 21a7 7 0 0 1 14 0" />
      <circle className="wp" cx="12" cy="18.5" r="1.75" />
    </IconBase>
  );
}

// دليلك: an open compass ring; the needle points through the gap at the waypoint (always with its name).
export function IconAdvisor(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 3.5A8.75 8.75 0 1 0 20.5 10M14.5 9.5l-1 4-4 1 1-4z" />
      <circle className="wp" cx="18" cy="6" r="1.75" />
    </IconBase>
  );
}

// A tile grid whose fourth tile is the waypoint.
export function IconMore(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="6" rx="2" width="6" x="4" y="4" />
      <rect height="6" rx="2" width="6" x="4" y="14" />
      <rect height="6" rx="2" width="6" x="14" y="14" />
      <circle className="wp" cx="17" cy="7" r="1.75" />
    </IconBase>
  );
}

/* Game */

// The spot height: a ridge, a shoulder on the start side and the main peak, whose summit stays open for the waypoint;
// one contour line under the summit.
export function IconXp(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 19 8 9M12 9l3 6 2.5-2 3 6M7.5 15.5q2.5-2.5 5 0" />
      <circle className="wp" cx="10" cy="5" r="1.75" />
    </IconBase>
  );
}

// The level device of the avatars: seven contour segments from 12 o'clock, four walked, the waypoint, the rest dotted.
export function IconLevel(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.75 3.68A8.5 8.5 0 0 1 17.41 5.45M19.59 8.18A8.5 8.5 0 0 1 20.5 12.15M19.72 15.56A8.5 8.5 0 0 1 17.19 18.74M14.03 20.25A8.5 8.5 0 0 1 9.97 20.25" />
      <path d="M3.5 12.15A8.5 8.5 0 0 1 10.25 3.68" pathLength={3} strokeDasharray="0 1" />
      <circle className="wp" cx="5.36" cy="17.3" r="1.75" />
    </IconBase>
  );
}

// A campfire: the flame opens at its base and the waypoint is the ember.
export function IconStreak(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 15.5C7 14 6.5 12.5 7 10.5c.5-2.5 2.5-4.5 5-7 2.5 2.5 4.5 4.5 5 7 .5 2 0 3.5-2 5M5 21l14-3M5 18l14 3" />
      <circle className="wp" cx="12" cy="12" r="1.75" />
    </IconBase>
  );
}

// A medal ring that runs on into its ribbon tails; the waypoint at its heart.
export function IconBadge(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 13A5.4 5.4 0 1 1 15 13l1.5 8-4.5-2.5L7.5 21z" />
      <circle className="wp" cx="12" cy="8.5" r="1.75" />
    </IconBase>
  );
}

// A cup with no rim line: the line turns at the lip into the handles, the mouth stays open with the waypoint in it; the foot is two contour steps.
export function IconTrophy(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.5 10.5H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2h2v4.5a5 5 0 0 0 10 0V4h2a2 2 0 0 1 2 2v1.5a3 3 0 0 1-3 3h-1.5M12 13.5v3M9.5 16.5h5M7.5 20h9" />
      <circle className="wp" cx="12" cy="5.5" r="1.75" />
    </IconBase>
  );
}

// The goal: a notched banner planted on the crest of a hill; the waypoint tops the pole.
export function IconFlag(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 21Q12 15 21 21M12 18V9M12 10h7l-2.5 2.5 2.5 2.5h-7" />
      <circle className="wp" cx="12" cy="4.5" r="1.75" />
    </IconBase>
  );
}

const STAR = "M12 3.5 15 9l6 1-4.5 4.5 1 6-5.5-3-5.5 3 1-6L3 10l6-1z";

export function IconStar(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={STAR} />
      <circle className="wp" cx="12" cy="13" r="1.75" />
    </IconBase>
  );
}

export function IconStarFilled(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={STAR} fill="currentColor" />
      <circle className="wp" cx="12" cy="13" r="1.75" />
    </IconBase>
  );
}

// A ribboned box whose ribbons stop short of the crossing; the waypoint is the knot.
export function IconGift(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5.5 8h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM12 8v2M12 19v2M3.5 14.5h4M16.5 14.5h4" />
      <path d="M12 8C11 5.5 7.5 3.5 7.5 6S10.5 8 12 8c1-2.5 4.5-4.5 4.5-2S13.5 8 12 8" />
      <circle className="wp" cx="12" cy="14.5" r="1.75" />
    </IconBase>
  );
}

// Two open contour rings; a trail runs in through their gaps to the waypoint at the centre.
export function IconTarget(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 20A8.5 8.5 0 1 0 4 15M12 16.5A4.5 4.5 0 1 0 7.5 12M3.5 20.5l5-5" />
      <circle className="wp" cx="12" cy="12" r="1.75" />
    </IconBase>
  );
}

// Rising off a podium step to the waypoint.
export function IconRankUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.5 20.5h9M12 20.5v-11M8 13.5l4-4 4 4" />
      <circle className="wp" cx="12" cy="5" r="1.75" />
    </IconBase>
  );
}

// Dropping off a podium step to the waypoint.
export function IconRankDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.5 3.5h9M12 3.5v11M8 10.5l4 4 4-4" />
      <circle className="wp" cx="12" cy="19" r="1.75" />
    </IconBase>
  );
}

// A gateway: a wall with an arched passage open to the trail; the waypoint waits in the passage.
export function IconGate(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 21V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v15M3 21h4.5v-6.5a4.5 4.5 0 0 1 9 0V21H21" />
      <circle className="wp" cx="12" cy="16.5" r="1.75" />
    </IconBase>
  );
}

// A map pin whose point opens onto the waypoint: the place itself.
export function IconHereMarker(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 16.5 7 13A6.1 6.1 0 1 1 17 13l-2 3.5" />
      <circle cx="12" cy="9.5" r="2" />
      <circle className="wp" cx="12" cy="20" r="1.75" />
    </IconBase>
  );
}

/* The seven fields */

// A chart line climbing to the waypoint.
export function IconFieldData(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 3.5v15a2 2 0 0 0 2 2h15M7.5 16.5l3.5-4.5 3 2.5 3-5" />
      <circle className="wp" cx="19.5" cy="5.5" r="1.75" />
    </IconBase>
  );
}

// A terminal prompt; the waypoint is the cursor.
export function IconFieldSoftware(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M7 9l3 3-3 3" />
      <circle className="wp" cx="15" cy="15" r="1.75" />
    </IconBase>
  );
}

// A pen nib; the waypoint is its breather hole.
export function IconFieldDesign(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 6.5h8l2.5 5.5L12 21 5.5 12zM12 21v-4.5M9 3.5h6" />
      <circle className="wp" cx="12" cy="12" r="1.75" />
    </IconBase>
  );
}

// A megaphone with a grip; the cone stays open at the mouth, the waypoint is the message on its way out.
export function IconFieldMarketing(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16.5 5 6 9.5H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1l10.5 4.5M6 9.5v5M8 15.5V18a1.5 1.5 0 0 0 3 0v-1.5M19 9a5 5 0 0 1 0 6" />
      <circle className="wp" cx="14" cy="12" r="1.75" />
    </IconBase>
  );
}

// A project timeline read from the right: the axis on the start side, three bars cascading toward the milestone.
export function IconFieldBusiness(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.5 3.5v15a2 2 0 0 1-2 2h-8M18 5.5h-6M14.5 10H9M11 14.5H7" />
      <circle className="wp" cx="5" cy="19" r="1.75" />
    </IconBase>
  );
}

// Two people, the waypoint on the front one's chest.
export function IconFieldHr(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9.5" cy="8" r="3" />
      <path d="M3.5 20.5a6 6 0 0 1 12 0M15 5.5a2.75 2.75 0 1 1 1.5 5M17.5 13.5c2 .5 3.5 2.5 3.5 5" />
      <circle className="wp" cx="9.5" cy="18.75" r="1.75" />
    </IconBase>
  );
}

// A presentation board on an easel: one line said, and the waypoint is the point being made.
export function IconFieldProfessional(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="11" rx="2" width="18" x="3" y="3" />
      <path d="M8.5 14 6 21M15.5 14l2.5 7M7 8.5h4.5" />
      <circle className="wp" cx="16" cy="8.5" r="1.75" />
    </IconBase>
  );
}

/* The three fields of the 20 Nov 2026 expansion */

// A target: two rings around the waypoint, the one thing the product is built to hit.
export function IconFieldProduct(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.75" />
      <circle className="wp" cx="12" cy="12" r="1.75" />
    </IconBase>
  );
}

// A shield; the waypoint is its keyhole.
export function IconFieldCyberCloud(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 19.5 6.5v5c0 4.5-3.25 7.75-7.5 9-4.25-1.25-7.5-4.5-7.5-9v-5z" />
      <circle className="wp" cx="12" cy="11.5" r="1.75" />
    </IconBase>
  );
}

// A parcel seen from its corner; the waypoint is the label on its way to the customer.
export function IconFieldSalesSupply(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 19.5 7.5v9L12 20.5l-7.5-4v-9zM4.5 7.5 12 11.5l7.5-4M12 11.5v9" />
      <circle className="wp" cx="16" cy="14" r="1.5" />
    </IconBase>
  );
}

/* The nine fields of wave 2 (20 Nov 2026, src/lib/data/wave2) */

// A building crane: mast, jib and the hanging load; the waypoint is the hook's load.
export function IconFieldEngineering(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 20.5V4.5M3.5 20.5h7M7 4.5h12.5M7 8l3.5-3.5M16.5 4.5v6" />
      <circle className="wp" cx="16.5" cy="12.5" r="1.75" />
    </IconBase>
  );
}

// A schedule: three bars of a Gantt chart in steps; the waypoint is the milestone.
export function IconFieldProjectControls(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4.5v15h16M7 8h5M9.5 12h6M12 16h5" />
      <circle className="wp" cx="18.5" cy="8" r="1.75" />
    </IconBase>
  );
}

// A concierge bell on its counter; the waypoint is the bell's button.
export function IconFieldTourism(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 16.5a7 7 0 0 1 14 0zM3.5 19.5h17M12 9.5V8" />
      <circle className="wp" cx="12" cy="6.25" r="1.75" />
    </IconBase>
  );
}

// A clipboard with a medical cross; the waypoint is the clip at the top.
export function IconFieldHealth(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="16" rx="2" width="14" x="5" y="5" />
      <path d="M12 10v6M9 13h6" />
      <circle className="wp" cx="12" cy="4.5" r="1.75" />
    </IconBase>
  );
}

// An open book; the waypoint is the bookmark where the reader stopped.
export function IconFieldEducation(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 6.5c-2-1.5-5-2-8.5-1.5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13" />
      <circle className="wp" cx="16.25" cy="10" r="1.5" />
    </IconBase>
  );
}

// A bank's portico: pediment, three columns and the base; the waypoint is the seal in the pediment.
export function IconFieldBanking(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 9 12 4l8.5 5zM6 11.5v6M12 11.5v6M18 11.5v6M3.5 20.5h17" />
      <circle className="wp" cx="12" cy="7.25" r="1.25" />
    </IconBase>
  );
}

// The scales: a beam on its stand with two pans; the waypoint is the pivot.
export function IconFieldLegal(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 6.5v14M8 20.5h8M4.5 8h15M6.5 8 4 14h5zM17.5 8 15 14h5" />
      <circle className="wp" cx="12" cy="5" r="1.75" />
    </IconBase>
  );
}

// A clapperboard: its striped arm lifted over the slate; the waypoint is the take being recorded.
export function IconFieldMedia(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="10" rx="2" width="17" x="3.5" y="10" />
      <path d="M3.5 10 19 5.5M8 8.6l1.5 1.4M13 7.1l1.5 1.4" />
      <circle className="wp" cx="12" cy="15" r="1.75" />
    </IconBase>
  );
}

// A game controller: its body, the cross pad on one side; the waypoint is the action button.
export function IconFieldGaming(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.5 7.5h9a4.5 4.5 0 0 1 4.3 5.8l-1 3.4a2.3 2.3 0 0 1-3.9.9L14.5 16h-5l-1.4 1.6a2.3 2.3 0 0 1-3.9-.9l-1-3.4a4.5 4.5 0 0 1 4.3-5.8zM8 10.5v3M6.5 12h3" />
      <circle className="wp" cx="16" cy="12" r="1.5" />
    </IconBase>
  );
}

/** The wave-2 field icons by field id, spread into every field-icon map (cv-results, jobs, learn, skills, the reveal). */
export const WAVE2_FIELD_ICONS = {
  engineering: IconFieldEngineering,
  "project-controls": IconFieldProjectControls,
  "tourism-hospitality": IconFieldTourism,
  "health-admin": IconFieldHealth,
  education: IconFieldEducation,
  "banking-risk": IconFieldBanking,
  legal: IconFieldLegal,
  media: IconFieldMedia,
  gaming: IconFieldGaming,
} as const;
