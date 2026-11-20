// Dalilak's shared motion building blocks (docs/COMPONENT-PLAYBOOK.md section 2). The export names are a contract
// (docs/DESIGN-BRIEF.md section 6). Tokens live in @/lib/motion. Chat pieces (RollingStatus, SentBubble, Composer,
// AdvisorPanel, AdvisorLauncher, ChipToBubble, TypedField, DaleelGlyph) belong to @/components/chat.

// provider: reduced motion, still frames, the default spring
export { MotionProvider, useInstant, useStill } from "./provider";
// route: the page transition
export { NavLink, PageTransition, useGo, useShownPathname, type GoOptions } from "./page-transition";
// text: blur into focus, words in
export { FocusInGroup, WordsIn } from "./text";
export { graphemes, headlineChunks, words } from "./segment";
// values: roll, count, ring
export { Roll } from "./roll";
export { NumberTicker } from "./number-ticker";
export { Ring, type RingProps } from "./ring";
export { GainPreview } from "./gain-preview";
// paths: roadmap and skill-tree connectors, the «أنت هنا» marker
export { anchor, Edge, HereDot, HereMarker, roadmapPoint, sCurve, type EdgeState, type Pt } from "./path";
// state marks
export { StatusMark, type MarkState } from "./status-mark";
// shows
export { CV_STEPS, CV_STEPS_REDUCED, resultOnly, useShow, type CvStepId, type ShowState, type ShowStep } from "./show";
export { REVEAL_STEPS, REVEAL_STEPS_REDUCED, RevealLayers, RevealStage, type RevealLayer, type RevealStepId } from "./reveal";
export { SweepRows, type SweepTile } from "./sweep-rows";
export { CelebrationBeats, type BeatState } from "./celebration";
export { Burst, BURST_COLORS } from "./burst";
// CV analysis
export { Highlight, useArmed } from "./evidence";
export { ScanLine } from "./scan-line";
export { SkillTag, SkillTagGroup } from "./skill-tag";
export { useTypeOn } from "./type-on";
// dialogs
export { Sheet } from "./sheet";
// travel and lists
export { FlyToken, flightBetween, useFlights, type Flight, type FlySource } from "./fly-token";
export { ReorderList, type ReorderRow } from "./reorder-list";
export { PillTabs, type PillTab } from "./pill-tabs";
export { Collapse } from "./collapse";
// replays and the leaderboard
export { useSeen } from "./seen";
export { Podium, useClimb, type PodiumPlace } from "./leaderboard";
// sign-in
export { ShowcaseStage, TURN_MS } from "./showcase";
