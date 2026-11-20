// The game layer's shared vocabulary (docs/GAME-LAYER.md section 3). Every game piece speaks these five states, drawn the
// same way everywhere: raised = there is something to do here; flat = settled (done) or not reachable yet (locked).

/**
 * - `locked`: not reachable yet (a prerequisite is missing). Sunk into the board: a dashed well, the lock, readable text.
 * - `available`: you may start it. Raised on an ink plinth: it sinks when pressed.
 * - `next`: the one thing to do now (spec 2.8). Raised, its plinth is the accent key, its ribbon says «التالية».
 * - `progress`: started, not finished (lessons ticked). Raised, with a lesson meter.
 * - `done`: finished or proven. Pressed home flat on the board, with its check or stamp.
 */
export type GameState = "locked" | "available" | "next" | "progress" | "done";

export const GAME_STATES: readonly GameState[] = ["locked", "available", "next", "progress", "done"];

/** The default label of each state (spec 3.10 course labels, 3.4 stage labels). Screens may pass their own. */
export const STATE_LABEL: Readonly<Record<GameState, string>> = {
  locked: "مقفلة",
  available: "متاحة",
  next: "التالية",
  progress: "جارية",
  done: "مكتملة",
};

/** Raised states carry depth (a plinth) and sink when pressed; the others lie flat. */
export function isRaised(state: GameState): boolean {
  return state === "available" || state === "next" || state === "progress";
}

/** Spec 8.4: the daily reward is 20 XP × the streak day, capped at 100. */
export function dailyRewardFor(day: number): number {
  return Math.min(100, Math.max(1, Math.round(day)) * 20);
}

/** Spec 7.2: a skill's points are 20 × min(held, required) ÷ required. Returns the fill 0..1 of one requirement. */
export function requirementFill(have: number, need: number): number {
  if (need <= 0) return 1;
  return Math.max(0, Math.min(1, have / need));
}

/** Spec 7.2, for the gallery and as a cross-check: the match from a job's five requirements. Screens pass the real match. */
export function matchOf(skills: readonly { have: number; need: number }[]): number {
  if (skills.length === 0) return 0;
  const each = 100 / skills.length;
  return Math.round(skills.reduce((sum, s) => sum + each * requirementFill(s.have, s.need), 0));
}

/** Arabic count of lessons with the dual and plural forms the spec uses («درس واحد», «درسان», «5 دروس»). */
export function lessonsLabel(n: number): string {
  if (n === 1) return "درس واحد";
  if (n === 2) return "درسان";
  if (n >= 3 && n <= 10) return `${n} دروس`;
  return `${n} درساً`;
}

/** «10 ساعات», «ساعة واحدة», «ساعتان», «12 ساعة». */
export function hoursLabel(n: number): string {
  if (n === 1) return "ساعة واحدة";
  if (n === 2) return "ساعتان";
  if (n >= 3 && n <= 10) return `${n} ساعات`;
  return `${n} ساعة`;
}

/** «النجمة 1» … the star a course grants. */
export function starLabel(n: number): string {
  return `النجمة ${n}`;
}
