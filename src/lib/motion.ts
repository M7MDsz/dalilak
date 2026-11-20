// Dalilak's motion tokens (docs/COMPONENT-PLAYBOOK.md 1.2). Owned by the motion-blocks agent.
// Never write a transition inline: pick a token. The CSS twins of these numbers live in src/components/motion/motion.css.
import { stagger, type Transition, type Variants } from "motion/react";

/** Arabic only: inline-end is the physical LEFT, so "toward inline-end" is negative x. `x`, `originX`, `rotate` are physical. */
export const INLINE_END = -1;

/** Cubic-bezier curves. `pop` overshoots and belongs to the sent bubble alone. */
export const ease = {
  out: [0.22, 1, 0.36, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.65, 0, 0.35, 1],
  pop: [0.34, 1.32, 0.64, 1],
} as const;

/** Durations in seconds. `leave` is the route exit; `count` a number count-up; `mark` the evidence marker; `check` a drawn tick; `fly` a FlyToken. */
export const dur = {
  exit: 0.15,
  leave: 0.12,
  fast: 0.2,
  check: 0.24,
  page: 0.26,
  move: 0.42,
  pop: 0.44,
  focus: 0.56,
  mark: 0.6,
  fly: 0.6,
  count: 0.8,
  draw: 0.9,
  shimmer: 2.4,
} as const;

/** Springs, always written with `bounce` next to `visualDuration` (without it Motion silently uses a 1.1 s wobble). */
export const spring = {
  snappy: { type: "spring", visualDuration: 0.2, bounce: 0 }, // toggles, pressed and selected states
  smooth: { type: "spring", visualDuration: 0.3, bounce: 0 }, // the app default (MotionConfig); no overshoot
  gentle: { type: "spring", visualDuration: 0.35, bounce: 0.15 }, // anything that travels or resizes: layout, layoutId, reorder
  pop: { type: "spring", visualDuration: 0.4, bounce: 0.3 }, // an earned thing landing (about 5% overshoot)
  cheer: { type: "spring", visualDuration: 0.45, bounce: 0.4 }, // the one centrepiece of a big moment (about 10%)
} as const satisfies Record<string, Transition>;

/** Tweens: exits, fades, blur, drawing, counting, and anything another step waits on. */
export const tween = {
  exit: { duration: dur.exit, ease: ease.in },
  fast: { duration: dur.fast, ease: ease.out },
  enter: { duration: dur.page, ease: ease.out },
  move: { duration: dur.move, ease: ease.out },
  focus: { duration: dur.focus, ease: ease.out },
  draw: { duration: dur.draw, ease: ease.inOut },
  count: { duration: dur.count, ease: ease.out },
} as const satisfies Record<string, Transition>;

/** "This arrived": a block rises 8 px. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: tween.move },
  exit: { opacity: 0, y: -4, transition: tween.exit },
};

/** Rise by another distance: 12 px for result cards, 16 px for a panel from its edge. */
export function riseBy(px: number): Variants {
  return {
    hidden: { opacity: 0, y: px },
    show: { opacity: 1, y: 0, transition: tween.move },
    exit: { opacity: 0, y: -4, transition: tween.exit },
  };
}

/** "«دليل» worked this out": rise 8 px and blur 4 px to 0. Only for things «دليل» produced. */
export const focusIn: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: tween.focus },
  exit: { opacity: 0, transition: tween.exit },
};

/** "You earned this": an earned thing lands from scale 0.8 on spring.pop. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { default: spring.pop, opacity: tween.fast } },
  exit: { opacity: 0, scale: 0.9, transition: tween.exit },
};

/** A parent that staggers its children (`hidden` -> `show`). 80 ms blocks, 60 ms chips, 50 ms words. */
export const group = (step = 0.08, startDelay = 0): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: stagger(step, { startDelay }) } },
});

/** A stagger step that keeps the whole group under 480 ms (playbook 1.4): `group(staggerStep(n))`. */
export function staggerStep(count: number, step = 0.08): number {
  return Math.min(step, 0.48 / Math.max(count, 1));
}

/** A promise that resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
