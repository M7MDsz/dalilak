# Motion and game UX: research notes for builders

Written 18 Nov 2026 by the motion/game-UX researcher. Two parts plus a drawing guide:

- **Part 1**: Motion 14.14.0 cheat-sheet (what is installed here, not what tutorials say) and the route-transition recommendation for Next 16.
- **Part 2**: how strong learning and habit products structure paths, skill trees, XP, streaks, badges, leaderboards, progress, celebrations and onboarding. Structure and behaviour only.
- **Part 3**: concrete techniques for a branching roadmap and a skill tree in SVG/DOM that stay usable at 390 px in RTL.

**Nothing in Part 2 may be copied.** Take the mechanism, never a product's names, wording, mascot, artwork, colours or layout. Where a product is named, it is evidence that a mechanism works, not a look to imitate.

## 0. What this is based on (read before trusting a line)

| Kind | What |
|---|---|
| Read on this laptop | `node_modules/motion` 14.14.0 (README, `package.json` exports), `framer-motion` 14.14.0 (`dist/index.d.ts` in full, `dist/animate-view.d.ts`, parts of `dist/es`), `motion-dom` 14.14.0 (`dist/index.d.ts` sections, parts of `dist/es`), `motion-utils` 14.7.0, `next` 16.4.6 bundled docs (`node_modules/next/dist/docs`), `react` / `react-dom` 19.3.1, `@base-ui/react` 1.9.0 bundled docs |
| Opened on the web | motion.dev docs pages, react.dev `ViewTransition` reference, five Duolingo blog posts, one Lenny's Newsletter article, the Laracasts path page (full list in "Sources") |
| Type-checked | Every TSX/TS snippet in Part 1 was compiled once against the installed types with `npm run typecheck` in a scratch file (since deleted). Two deliberate mistakes (`whilePress`, `exitBeforeEnter`) failed as expected, so the check was real |
| Measured | Spring numbers in 1.5 come from running the installed `motion-dom` spring generator in Node |
| NOT done | Nothing was run in a browser (researchers may not start a server). Anything marked **UNTESTED** must be looked at with `npm run shot` or by eye before it is relied on |

---

# PART 1. Motion 14.14.0 cheat-sheet

## 1.1 Entry points

| Import from | Use it for |
|---|---|
| `motion/react` | Everything in client components: `motion`, `AnimatePresence`, `MotionConfig`, `LayoutGroup`, `LazyMotion`, all hooks, and also `animate`, `stagger`, `arc`, `spring`, the easing functions (re-exported from `motion-dom` / `motion-utils`) |
| `motion/react-client` | Server Component files only: `import * as motion from "motion/react-client"` then `<motion.div>`. Components only, no hooks |
| `motion/react-animate-view` | `AnimateView` (needs React 19.3+; this project has 19.3.1). Not exported from `motion/react` |
| `motion/react-m` | `m.div` etc. for `LazyMotion` |
| `motion/react-mini` | A WAAPI-only `useAnimate` (about 3 kB): no sequences, no independent transforms |
| `motion` / `motion/mini` | Vanilla `animate`, `scroll`, `inView`, `hover`, `press` (no React) |

Rules: never import from `framer-motion` (it is installed only as a dependency of `motion`). A file that uses `motion` from `motion/react`, or any Motion hook, needs `"use client"`. Not for us: `motion/three`, `motion/vgpu`, `motion/remix`, `motion/debug`.

## 1.2 What changed: where older tutorials are wrong

| Older tutorials say | In 14.14.0 | Evidence |
|---|---|---|
| `import { motion } from "framer-motion"` | `import { motion } from "motion/react"` | README |
| `<AnimatePresence exitBeforeEnter>` | `mode="wait"`. The old prop is a type error | installed types; upgrade guide (removed in 10) |
| Wrap in `<AnimateSharedLayout>` | `layoutId` works on its own; `LayoutGroup` only to namespace or sync | upgrade guide (5.0) |
| `staggerChildren: 0.05`, `staggerDirection: -1` | Deprecated. `delayChildren: stagger(0.05)` and `stagger(0.05, { from: "last" })` | `@deprecated` in `motion-dom` types |
| `useViewportScroll()`, `useElementScroll(ref)` | `useScroll()`, `useScroll({ container: ref })` | `@deprecated` in types |
| `useAnimation()` / `useAnimationControls()` | Typed `LegacyAnimationControls`, deprecated. Use `useAnimate()` | types |
| `motion(Component)`, `motion.custom()` | `motion.create(Component)`, called at module scope, never inside render | motion-component doc |
| "Animate the `transform` string to get GPU acceleration; `x`/`scale` run in JS" | `x`, `y`, `scale`, `rotate` on **HTML** elements are grouped into one WAAPI `transform` animation and composited (conditions in 1.13) | `motion-dom/dist/es/animation/waapi/transforms/TransformAnimation.mjs`; react-animation doc: "Independent transforms and `transform` are both hardware accelerated." |
| Springs are `stiffness` / `damping` / `mass` | Still valid, but the easier form is `visualDuration` + `bounce`. **`visualDuration` without `bounce` is ignored** (see 1.5) | measured |
| `animate()` returns simple playback controls | It returns a `Timeline`: awaitable, with `time`, `speed`, `play/pause/stop/cancel/complete`, and `add`, `call`, `addPause`, `seek`, `playTo`, `reverse` | `framer-motion/dist/index.d.ts` |
| Page transitions: wrap `children` of the layout in `AnimatePresence` | Unreliable in the App Router (see 1.16). React 19.3 `<ViewTransition>` works in Next 16 with no configuration | `next/dist/docs/01-app/02-guides/view-transitions.md` |
| `experimental: { viewTransition: true }` in `next.config` | Flag removed in 16.3: "View transitions work in the App Router without configuration." | `next/dist/docs/.../upgrading/version-16.md` |
| `AnimateView` is a paid Motion+ API | Free, in `motion/react-animate-view` | README |
| Motion respects the OS "reduce motion" setting | Not by default. `MotionConfig`'s `reducedMotion` defaults to `"never"` | `framer-motion/dist/es/context/MotionConfigContext.mjs` |

New and useful, absent from most tutorials: `useFollowValue` (a follower with any transition; `useSpring` is the spring-only case), `useTransform` with an output map, `useScroll` returning `scrollXLength` / `scrollYLength` and taking `trackContentSize`, `transition.inherit`, `transition.out`, `transition.path: arc()`, `mass: "auto"` for layout springs, `layout="x" | "y"`, `layoutAnchor`, `layoutCrossfade`, `AnimatePresence` `propagate` / `root`, `usePresenceData`, `tap={{ count, hold, repeat }}`, `propagate={{ tap: false }}`, `stagger(…, { grid, ease, from: "edges" | "random" })`, `MotionConfig skipAnimations`, `useScopeMotion`, `usePageInView`.

The gesture prop is `whileTap`. One docs page was read back to me as `whilePress`; that prop does not exist in the installed types.

## 1.3 `motion` components: the props that matter

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}        // or a variant label, or false (start at `animate`, no enter animation)
  animate={{ opacity: 1, y: 0 }}        // values or variant label(s)
  exit={{ opacity: 0 }}                 // needs AnimatePresence above (1.6)
  transition={{ duration: 0.24 }}       // default for this element; a `transition` inside a target wins
  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} whileInView={{ opacity: 1 }}   // also whileFocus, whileDrag
  viewport={{ once: true, amount: 0.3, margin: "0px 0px -80px 0px" }}
  layout layoutId="…"                   // 1.7
  style={{ x, originX: 0, borderRadius: 16 }}   // motion values and transform shorthands live in `style`
/>
```

- Transform shorthands: `x y z scale scaleX scaleY rotate rotateX rotateY rotateZ skewX skewY transformPerspective`, plus `originX originY` (0 to 1) and `originZ` (px). Motion orders them for you; `transformTemplate` changes the order and costs you compositing.
- Keyframes: `animate={{ x: [0, 12, 0] }}`. `null` as a keyframe means "the current value". `transition.times` positions them (0 to 1). A keyframe array of 3+ values defaults to 0.8 s.
- `width` / `height` can animate to and from `"auto"`. Hide with `visibility: "hidden"`, not `display: "none"`, if you need to measure.
- `transitionEnd: { display: "none" }` inside a target sets values when the animation finishes.
- `whileTap` makes the element keyboard-focusable (`tabindex="0"`, since 9.0). `whileFocus` follows `:focus-visible`.
- Priority of states, low to high: `animate`, `whileInView`/`whileHover`/`whileTap`/`whileFocus`/`whileDrag`, `exit`.
- Animated text content: a motion value can be a child: `<motion.span>{motionValue}</motion.span>` (types: `children?: ReactNode | MotionValue<number> | MotionValue<string>`). No React re-render per frame.
- Wrapping your own component: `const MotionCard = motion.create(Card)`; `Card` must pass `ref` to its DOM node (React 19: `ref` is a normal prop).

## 1.4 Variants, orchestration, stagger

Variants are named targets. A parent's `initial` / `animate` label flows down to every child `motion` component that has `variants`, so children need no `animate` of their own.

```tsx
import { motion, stagger, type Variants } from "motion/react";

const list: Variants = {
  hidden: {},
  show: { transition: { delayChildren: stagger(0.06, { startDelay: 0.1 }) } },
};
const item: Variants = {           // "blurs into focus"
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.56, ease: [0.22, 1, 0.36, 1] } },
};

<motion.ul variants={list} initial="hidden" animate="show">
  {rows.map((r) => <motion.li key={r.id} variants={item} />)}
</motion.ul>
```

- `stagger(step, { startDelay, from, ease, grid })`. `from`: `"first"` (default), `"last"`, `"center"`, `"edges"`, `"random"`, or an index. `grid: [columns, rows]` staggers by 2D distance. Checked in Node: `stagger(0.1, { from: "center" })` over 5 items gives `0.2 0.1 0 0.1 0.2`.
- `when: "beforeChildren"` or `"afterChildren"` sequences parent against children.
- Dynamic variants: `show: (i: number) => ({ … })` reads the element's `custom={i}`. For exits, pass `custom` on `AnimatePresence` (the leaving element can no longer get new props).
- `inherit={false}` on a child stops it following the parent's label.
- Keep units identical across keyframes: `"blur(4px)"` to `"blur(0px)"`, not to `"none"`.
- Stagger follows DOM order, so in RTL a row staggers right to left without any work.

## 1.5 Transitions: defaults, springs vs tweens, values to use

**What you get if you write no `transition`** (from `motion-dom/dist/es/animation/utils/default-transitions.mjs`):

| Value | Default |
|---|---|
| `x`, `y`, `rotate` and other transforms | spring, stiffness 500, damping 25 (measured: about 12% overshoot, settles in 0.5 s) |
| `scale*` | spring, stiffness 550, damping 30 (critically damped when the target is 0) |
| `opacity`, colours, everything else | tween 0.3 s, ease `[0.25, 0.1, 0.35, 1]` |
| any keyframe array with 3+ values | tween 0.8 s |

So an untuned `animate={{ y: 0 }}` overshoots. Set a project default (1.11 shows the `MotionConfig`).

**Spring options.** Two ways to describe a spring:

1. Time-based: `{ type: "spring", visualDuration: 0.3, bounce: 0 }`. `visualDuration` is when it looks arrived; the settling tail comes after. `bounce` 0 = no overshoot, towards 1 = bouncier, negative = overdamped.
2. Physics: `stiffness`, `damping`, `mass`. If any of the three is set, `duration` / `bounce` / `visualDuration` are ignored. Physics springs carry the velocity of an interrupted gesture or animation; time-based ones with `duration` do not.

**Measured on the installed version (Node, 0 to 1):**

| Transition | Resolved stiffness / damping | Overshoot | Fully settled |
|---|---|---|---|
| `{ type: "spring" }` only | 100 / 10 | 16.3% | 1.1 s |
| `{ type: "spring", visualDuration: 0.3 }` (no `bounce`) | **100 / 10, the option is ignored** | 16.3% | 1.1 s |
| `{ type: "spring", bounce: 0.2 }` (no duration) | time-based, default 0.8 s | 1.5% | 0.8 s |
| `visualDuration: 0.18, bounce: 0` | 846 / 58 | 0% | 0.4 s |
| `visualDuration: 0.22, bounce: 0` | 566 / 48 | 0% | 0.45 s |
| `visualDuration: 0.3, bounce: 0` | 305 / 35 | 0% | 0.6 s |
| `visualDuration: 0.35, bounce: 0.15` | 224 / 25 | 0.6% | 0.65 s |
| `visualDuration: 0.4, bounce: 0.3` | 171 / 18 | 4.6% | 0.65 s |
| `visualDuration: 0.45, bounce: 0.4` | 135 / 14 | 9.5% | 1.0 s |
| `visualDuration: 0.5, bounce: 0.5` | 110 / 10.5 | 16.3% | 1.05 s |

Two traps follow. **Always write `bounce` next to `visualDuration`** (the code only switches to time-based resolution when `duration` or `bounce` is defined; `motion-dom/dist/es/animation/generators/spring.mjs`). And **a spring "finishes" at its settled time, not its visual time**: `AnimatePresence mode="wait"`, `onAnimationComplete` and `await animate(…)` all wait for the tail, so a spring exit makes the next thing feel late. Exits get tweens.

**When to use which**

| Use a tween (duration + ease) | Use a spring |
|---|---|
| Exits; opacity, colour, blur; anything another step waits on; path drawing; number count-ups; anything that must last an exact time | Things that move or scale and may be interrupted: panels, sheets, the composer, cards, layout changes, drag release, celebration pops |

**Suggested tokens for Dalilak** (my recommendation, sized to the taste notes in TEAM-BRIEF section 5; the names are suggestions, no such file exists yet):

```ts
import type { Transition } from "motion/react";

export const ease = {
  out: [0.22, 1, 0.36, 1],      // enters and reveals
  in: [0.4, 0, 1, 1],           // exits
  inOut: [0.65, 0, 0.35, 1],    // moves that start and end on screen, path drawing
  pop: [0.34, 1.32, 0.64, 1],   // overshoot: the approved "bubble pops from the composer" curve
} as const;
export const dur = { exit: 0.14, fast: 0.18, base: 0.24, slow: 0.42, draw: 0.9 } as const;
export const spring = {
  snap:   { type: "spring", visualDuration: 0.2,  bounce: 0 },     // toggles, chips, pressed states
  smooth: { type: "spring", visualDuration: 0.3,  bounce: 0 },     // panels, sheets, default
  layout: { type: "spring", visualDuration: 0.35, bounce: 0.15 },  // layout / layoutId, list reorder
  pop:    { type: "spring", visualDuration: 0.4,  bounce: 0.3 },   // badge or star landing
  cheer:  { type: "spring", visualDuration: 0.45, bounce: 0.4 },   // level-up centrepiece only
} as const satisfies Record<string, Transition>;
```

Named easings accepted as strings: `linear easeIn easeOut easeInOut circIn circOut circInOut backIn backOut backInOut anticipate`. A cubic-bezier is a 4-number array (values above 1 are allowed, that is how `pop` overshoots). `steps(n)` is exported for stepped motion.

**Other transition options that earn their place**

```tsx
// per-value overrides
transition={{ default: spring.smooth, opacity: { duration: 0.2, ease: "easeOut" } }}
// merge with the inherited transition instead of replacing it
transition={{ inherit: true, delay: 0.2 }}
// a different transition for leaving a state (hover ends slower than it starts)
whileHover={{ scale: 1.03, transition: { duration: 0.15, out: { duration: 0.3 } } }}
// travel on a curve instead of a straight line (also for layout: transition.layout.path)
const flight = arc({ strength: 0.4 });           // create once at module scope
<motion.div animate={{ x: 200, y: 100 }} transition={{ path: flight }} />
// loop
transition={{ duration: 2, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
```

`repeatType`: `"loop"`, `"reverse"`, `"mirror"`. `repeatDelay` and `"mirror"` push the animation off the compositor (1.13). A component's `transition` replaces the `MotionConfig` one unless it says `inherit: true`.

## 1.6 AnimatePresence

```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.section
    key={step}                                  // changing the key swaps the element
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } }}
    exit={{ opacity: 0, y: -6, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
  />
</AnimatePresence>
```

| `mode` | Behaviour | Use for |
|---|---|---|
| `"sync"` (default) | Entering and leaving animate at the same time. Both are in the layout, so they stack or overlap unless you position them | Lists where items come and go |
| `"wait"` | One child at a time. The new one mounts only after the old one's exit has finished | Steps of a flow, screen swaps: "old out first" |
| `"popLayout"` | The leaving element is taken out of flow (`position: absolute` at its measured box) so siblings move at once | Lists with `layout`, rolling text, icon swaps |

Rules that cause most "exit does not work" bugs:

1. `AnimatePresence` itself stays mounted; the condition goes inside it.
2. Every direct child has a stable, unique `key` (not the array index).
3. `mode="wait"` takes exactly one child.
4. `popLayout`: the parent needs `position: relative` (or any non-static position). A custom component as the direct child must pass `ref` through to its DOM node.
5. On a Base UI popup the exit must include `opacity`, or Base UI will not wait for it (1.15).
6. `initial={false}` on `AnimatePresence` stops children that are present at first render from animating in (use it for chat history and anything restored from storage).

Other props: `onExitComplete`, `custom` (data for dynamic exit variants; read with `usePresenceData()`), `propagate` (a nested `AnimatePresence` also runs its children's exits when the outer one removes it), `root` (where the popLayout style tag goes), `anchorX` / `anchorY` (which corner a popped element is pinned to; `anchorY="bottom"` for bottom-anchored lists such as a chat).

RTL: `popLayout` reads the element's computed `direction` and pins from the right when it is `rtl` (`framer-motion/dist/es/components/AnimatePresence/PopChild.mjs`). No action needed.

Hooks inside a child: `useIsPresent()`, `usePresence()` returning `[isPresent, safeToRemove]` for exits you run yourself (for example with `useAnimate`).

**Rolling status line** (the pattern Mohammed liked; one 24 px line, new step up from below, old one out upward):

```tsx
<span style={{ position: "relative", display: "inline-flex", height: 24, overflow: "hidden" }}>
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={label}
      initial={{ y: "100%", opacity: 0, filter: "blur(2px)" }}
      animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
      exit={{ y: "-100%", opacity: 0, filter: "blur(2px)" }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >{label}</motion.span>
  </AnimatePresence>
</span>
```

The same shape rolls a streak number, a rank, an XP total, or morphs Send into Stop (swap `y` for `scale` + `rotate` + blur).

## 1.7 `layout` and `layoutId`

- `layout` animates any size or position change caused by a React render, using transforms (FLIP). Change the layout through `className` / `style`, not through `animate`.
- Values: `true`, `"position"` (size snaps, position animates; right for text and anything that would look stretched), `"size"`, `"preserve-aspect"`, `"x"`, `"y"`.
- `layoutId="x"`: when an element with that id unmounts and another with the same id mounts, the new one animates out of the old one's box. If the old one is still mounted the two crossfade (`layoutCrossfade={false}` turns that off). The transition used is the one on the element being animated **to**. To animate back, the element must be inside `AnimatePresence`.
- `layoutId` is global. Wrap repeated widgets in `<LayoutGroup id="…">` to namespace them. `LayoutGroup` also makes siblings that do not re-render together animate together.
- `transition={{ layout: spring.layout }}` sets layout timing separately from `opacity` etc. `mass: "auto"` scales mass with element size.

```tsx
<LayoutGroup id="field-tabs">
  {tabs.map((t) => (
    <button key={t} onClick={() => pick(t)} style={{ position: "relative" }}>
      {t === active && (
        <motion.span layoutId="pill" transition={spring.layout}
          style={{ position: "absolute", inset: 0, borderRadius: 999 }} />
      )}
      <span style={{ position: "relative" }}>{t}</span>
    </button>
  ))}
</LayoutGroup>
```

Gotchas, all from the layout docs page:

| Symptom | Cause and fix |
|---|---|
| Corners or shadows stretch during the animation | `borderRadius` / `boxShadow` are only scale-corrected when set through `style` (or an animation prop), not through a class. `style={{ borderRadius: 16 }}` |
| Children stretch | Give the child `layout` too, or use `layout="position"` on text and images |
| Borders look wrong | Borders cannot be scale-corrected. Use a padded wrapper as the border |
| Nothing animates | `display: inline` cannot be transformed; or the component did not re-render |
| Wrong start position inside a scroll area | Put `layoutScroll` on the scrolling element |
| Wrong position inside a `position: fixed` container (our chat panel) | Put `layoutRoot` on the fixed element |
| Page jumps when a scrollbar appears | `scrollbar-gutter: stable` on the scroller |
| SVG element will not layout-animate | Unsupported. Animate `cx`, `x`, `d` and friends directly |
| A layout animation fires on every unrelated render | `layoutDependency={value}`: measure only when it changes |

Within one page use `layoutId`. **Across a route change it is not reliable** in the App Router (the old page is gone before the new one measures); use a named `<ViewTransition>` there (1.16). Layout animations are interruptible, view transitions are not: micro-interactions get `layout`, page-level moves get view transitions.

## 1.8 Motion values and hooks

A `MotionValue` holds a number or string outside React state. Setting it updates the DOM without a re-render.

| Hook | What it gives | Note |
|---|---|---|
| `useMotionValue(0)` | a value: `.get()`, `.set(v)`, `.jump(v)` (no animation, velocity 0), `.getVelocity()`, `.getPrevious()`, `.on("change", cb)` | pass through `style`, or as an SVG attribute (`cx={cx}`), or as children |
| `useTransform(v, [0, 1], [a, b], { clamp, ease })` | range map; colours and unit strings work | 4 forms, see below |
| `useSpring(source, opts)` | follows a number / unit string / other value with a spring | `{ skipInitialAnimation: true }` when the source jumps on mount (scroll) |
| `useFollowValue(source, transition)` | same, any transition (`tween`, `inertia`, …) | new |
| `useVelocity(v)` | velocity as a value | |
| `useMotionTemplate` | `` useMotionTemplate`blur(${b}px)` `` | |
| `useMotionValueEvent(v, "change", cb)` | subscribe without writing an effect | |
| `useScroll(opts)` | `scrollX/Y`, `scrollX/YProgress` (0 to 1), `scrollX/YLength` | below |
| `useInView(ref, { once, amount, margin, root })` | boolean | re-renders once per change |
| `usePageInView()` | false when the tab is hidden | pause ambient loops |
| `useTime()`, `useAnimationFrame(cb)` | a clock; a per-frame callback | main thread every frame |
| `useAnimate()` | imperative animations scoped to a ref | 1.9 |
| `useReducedMotion()`, `useReducedMotionConfig()` | 1.11 | |

`useTransform` forms: range map; `useTransform(v, (x) => x * 2)`; `useTransform(() => a.get() + b.get())` (tracks whatever it reads); and the output map `const { opacity, scale } = useTransform(x, [0, 1], { opacity: [0, 1], scale: [0.5, 1] })`.

**Count-up without re-rendering** (XP, match percent, rank):

```tsx
function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(() => Math.round(mv.get()).toLocaleString("en-US")); // Latin digits, always
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}
```

Give the span `font-variant-numeric: tabular-nums` and a fixed `min-width`, otherwise the line jitters. Never call `toLocaleString("ar")`: several Arabic locales print Arabic-Indic digits, which breaks the "Latin digits" rule.

**`useScroll`**

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.5"] });
const smooth = useSpring(scrollYProgress, { stiffness: 200, damping: 30, skipInitialAnimation: true });
<motion.path style={{ pathLength: smooth }} />
```

- No options: the page. `container: ref` for a scrollable element, `target: ref` to track one element through the container.
- `offset` is a list of "target container" intersections; each side is a number 0 to 1, `start | center | end`, px, %, `vh` / `vw`. Default `["start start", "end end"]`. `["start end", "end start"]` = from entering at the bottom to leaving at the top.
- `trackContentSize: true` if the content grows after mount (lazy lists). Off by default.
- Per the docs, progress passed straight to `opacity`, or through `useTransform` to `opacity` / `transform` / `clipPath` / `filter`, can run on the browser's ScrollTimeline off the main thread.
- Direction: `useMotionValueEvent(scrollY, "change", (y) => y > (scrollY.getPrevious() ?? 0))`.

## 1.9 `useAnimate`, sequences, timelines

```tsx
const [scope, animate] = useAnimate<HTMLDivElement>();   // selectors resolve inside scope.current only

useEffect(() => {
  const tl = animate([
    [".scanline", { y: ["0%", "100%"] }, { duration: 1.4, ease: "linear" }],
    ["mark", { backgroundSize: ["0% 100%", "100% 100%"] }, { duration: 0.35, delay: stagger(0.12), at: 0.3 }],
    "found",                                                              // a label at this point in time
    [".chip", { opacity: [0, 1], scale: [0.8, 1] }, { duration: 0.3, delay: stagger(0.06), at: "found" }],
    [".card", { opacity: [0, 1], y: [12, 0] }, { duration: 0.55, delay: stagger(0.08), at: "-0.1" }],
  ]);
  tl.call(() => onFound(), "found");     // fire React state at a moment in the sequence
  return () => tl.stop();                // required: StrictMode runs effects twice in dev
}, [animate, onFound]);

return <div ref={scope}>…</div>;
```

- A segment is `[target, keyframes, options]`. Target: a selector, an element, a motion value, or a plain object.
- `at`: a number (absolute seconds), `"<"` (start with the previous segment), `"+0.2"` / `"-0.1"` (relative to the end of the previous one), or a label name. Without `at`, segments play one after another.
- Sequence options (second argument): `duration` (rescale the whole thing), `delay`, `repeat`, `defaultTransition`, `reduceMotion`, `onComplete`.
- The return value is a `Timeline`: `await tl`, `tl.time = 0.5`, `tl.speed = 2`, `tl.pause()`, `tl.play()`, `tl.complete()`, `tl.cancel()` (back to the start), `tl.stop()`, plus `tl.add(segment, at)`, `tl.call(cb, at)`, `tl.addPause(at)`, `tl.seek(labelOrTime)`, `tl.playTo(labelOrTime)`, `tl.reverse()`. This sequence shape type-checks; it has not been run in a browser (**UNTESTED**).
- Animations are cleaned up when the component unmounts.
- Use `useAnimate` for multi-step shows (CV analysis, path reveal, level-up). Use props and variants for everything that is a function of state. Do not drive the same value from both.
- An exit you run yourself: `const [isPresent, safeToRemove] = usePresence()`; when `isPresent` turns false, `await animate(…)` then `safeToRemove()`.

## 1.10 SVG

```tsx
const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (i: number) => ({
    pathLength: 1, opacity: 1,
    transition: {
      pathLength: { delay: i * 0.12, duration: 0.9, ease: [0.65, 0, 0.35, 1] },
      opacity: { delay: i * 0.12, duration: 0.01 },
    },
  }),
};
<motion.path d={d} custom={i} variants={draw} initial="hidden" animate="show" fill="none" strokeLinecap="round" />
```

- `pathLength`, `pathOffset`, `pathSpacing` are 0 to 1 and work on `path circle ellipse line polygon polyline rect`. Motion sets the element's `pathLength="1"` attribute and writes `stroke-dasharray` / `stroke-dashoffset` (`motion-dom/dist/es/render/svg/utils/path.mjs`). Consequence: **an element using `pathLength` cannot also have its own dash pattern**. For "dashed = locked, solid = done" stack two paths.
- The `opacity: 0` in `hidden` is there because a zero-length dash with a round line cap still paints a dot at the start of the path. This is the shape of Motion's own path-drawing example, quoted from memory, not re-opened today.
- `pathLength` accepts a motion value through `style` (`style={{ pathLength: progress }}`), so scroll or a spring can drive it.
- Transforms on SVG elements: Motion sets `transform-box: fill-box` and origin `50% 50%`, so `scale` / `rotate` pivot on the element's own centre like HTML (`build-attrs.mjs`). Set `style={{ transformBox: "view-box" }}` for native SVG behaviour.
- `x` / `y` / `scale` on an SVG element are CSS transforms. To animate the attributes use `attrX`, `attrY`, `attrScale`. Other attributes animate directly: `cx`, `r`, `d`, `points`, `viewBox` (only on `motion.svg`: pan and zoom).
- `d` morphs only between paths with the same commands in the same order. Different shapes need a `transition.mixer` from a morphing library (none installed): design icon pairs with matching commands, or crossfade.
- A marker travelling along a path: CSS motion path works through Motion: `style={{ offsetPath: 'path("M …")', offsetRotate: "0deg" }}` and `animate={{ offsetDistance: "100%" }}` (type-checks; **UNTESTED**). The path's coordinates are px in the element's containing block, so it only lines up with an SVG whose user units are px (Part 3, technique A).
- Progress ring: a `circle` path starts at 3 o'clock and runs clockwise. Rotate the `<svg>` by -90 degrees to start at 12 o'clock:

```tsx
<svg viewBox="0 0 100 100" style={{ rotate: "-90deg" }}>
  <circle cx="50" cy="50" r="44" fill="none" />                       {/* track */}
  <motion.circle cx="50" cy="50" r="44" fill="none" strokeLinecap="round"
    initial={{ pathLength: 0 }} animate={{ pathLength: pct / 100 }}
    transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }} />
</svg>
```

- Performance: SVG attribute animation runs on the main thread and repaints the SVG. Independent transforms on SVG elements are not composited (the grouping needs an `HTMLElement`). Keep animated SVGs small, and move a whole SVG by transforming an HTML wrapper.
- Layout animations do not work on SVG elements.

## 1.11 Reduced motion

Facts (source and docs agree):

- `MotionConfig`'s `reducedMotion` is `"never"` by default: Motion ignores the OS setting unless told otherwise.
- With `reducedMotion="user"` and the OS setting on, Motion makes **positional** values instant: all transform props plus `width height top left right bottom`, and layout animations. `opacity`, colours, `filter`, `pathLength` still animate. So fades and line drawing survive, slides and pops do not.
- `useReducedMotion()` reads the OS setting (it returns `null` on the server and reads the value once per mount). `useReducedMotionConfig()` also honours a `MotionConfig` override (`"always"` / `"never"`); prefer it in components.
- React's `<ViewTransition>` does not reduce anything by itself; that needs the CSS media query (1.16).
- `skipAnimations` on `MotionConfig` makes every animation jump to its end state. That is the switch for stable screenshots.

```tsx
"use client";
export function Providers({ children, still }: { children: ReactNode; still: boolean }) {
  return (
    <MotionConfig reducedMotion="user" skipAnimations={still} transition={spring.smooth}>
      {children}
    </MotionConfig>
  );
}
```

Suggestion for QA: derive `still` from a `?still=1` query flag so `npm run shot` can capture settled screens, and use the tool's `--reduced` flag to see the reduced-motion version (it emulates the OS setting).

Patterns: keep the state change, drop the travel (`initial={reduce ? false : { opacity: 0, y: 8 }}`); never branch **markup** on `useReducedMotion()` (server gives `null`, client gives a boolean: hydration mismatch), only animation values; stop infinite ambient loops and confetti entirely; CSS keyframes need their own `@media (prefers-reduced-motion: reduce)` rule, `MotionConfig` cannot reach them.

## 1.12 LazyMotion

`motion` components cost about 43 kB gzipped whatever you use. `LazyMotion` + `m` cut the first load to about 5 kB and load features later: `domAnimation` (+24 kB: animations, variants, exit, hover/tap/focus) or `domMax` (+38 kB: adds `layout` / `layoutId` and drag). Sizes are from the docs page, not measured here.

```tsx
import { LazyMotion, domMax } from "motion/react";
import * as m from "motion/react-m";

<LazyMotion features={domMax} strict>   {/* strict: a stray <motion.div> inside throws */}
  <m.div animate={{ opacity: 1 }} />
</LazyMotion>
```

**Recommendation: do not use it in Dalilak.** The demo runs on localhost, so the saving is invisible, and it adds a silent failure: with `domAnimation`, `layout` and `layoutId` simply do nothing. Use `motion` everywhere.

## 1.13 Performance rules

What runs off the main thread in this version, read from `waapi/supports/waapi.mjs` and `waapi/transforms/TransformAnimation.mjs`:

| Composited (WAAPI) | Condition |
|---|---|
| `opacity`, `filter`, `clipPath`, a literal `transform` string | on HTML and SVG elements |
| `x y scale rotate …` (independent transforms) | **HTML elements only**; grouped into one `transform` animation |
| Colours in `oklch` / `oklab` / `lab` / `lch` | forced through WAAPI because the JS mixer cannot parse them as colours |

What puts an animation back on the main thread:

- Any of them: an `onUpdate` on the component or in the transition; `transformTemplate`; `type: "inertia"`; a custom `mixer`.
- `opacity` / `filter` / `clipPath` / literal `transform`: also `repeatDelay`, `repeatType: "mirror"`, `damping: 0`.
- Independent transforms: also a literal `transform` value on the same element, a layout animation in progress on it, or the value being written every frame from outside (drag, scrubbing). Browsers without `linear()` easing never composite them.

Rules:

1. Animate `transform`, `opacity`, `filter`, `clipPath`. For size and position changes use `layout` (it animates transforms), not `width` / `height` / `top` / `left`.
2. `box-shadow` and `border-radius` repaint every frame. Fade the opacity of a pre-drawn shadow layer instead of animating the shadow; the docs suggest `filter: drop-shadow()` and `clipPath: inset(0 round 16px)` as the compositable versions.
3. CSS variables are never composited and repaint everything that reads them. Fine for one accent value, wrong for a per-frame transform.
4. `filter: blur()` is composited but the blur itself is expensive on large areas. Keep it at 2 to 4 px, on text blocks or small cards, for under 600 ms. No animated `backdrop-filter` over moving content.
5. Infinite ambient motion (the sign-in showcase): prefer CSS `@keyframes` on transform/opacity, or Motion loops without `repeatDelay` / `mirror`. Pause when off screen or when the tab is hidden (`useInView`, `usePageInView`).
6. Values that change every frame belong in motion values, not `useState` (1.8).
7. `layout` measures on every render of its tree. Do not put it on every chat bubble or on hundreds of rows; scope with `layoutDependency`.
8. SVG attribute animation (path drawing, `cx`, `d`) is main thread plus repaint: keep those SVGs small, do not run ten at once.
9. Do not sprinkle `will-change`; layers cost memory.
10. Judge in a production build (`npm run demo`), at 390 px, with DevTools CPU throttling 4x. `next dev` janks during compilation and says nothing about the real thing.

## 1.14 RTL and Motion

- `x`, `rotate`, `skewX`, `originX` are **physical**. Positive `x` moves right in RTL too. There are no logical equivalents. Keep one constant, for example `const INLINE_END = -1` (the app is Arabic only), and write `x: 16 * INLINE_END`. A panel that enters from the inline-end edge (the left edge in RTL) starts at a negative `x`.
- `originX: 0` is the left edge. A bubble that grows out of the composer's send button needs the origin on whichever physical side that button is.
- `layout`, `layoutId`, `AnimatePresence popLayout` and stagger order are direction-agnostic or direction-aware: no work.
- Progress bars: scale from the start edge: `style={{ scaleX: progress, originX: 1 }}` in RTL. Rings: decide once whether they fill clockwise or mirrored (`scaleX(-1)` on the svg), then be consistent.
- Mirror direction glyphs (chevrons, "next" arrows, the send arrow). Do not mirror check marks, clocks, the logo, or up/down rank arrows.
- `drag="x"` and `dragConstraints` are physical.
- Horizontal scrollers: in RTL `scrollLeft` is 0 at the start and negative as you scroll. Use `element.scrollIntoView({ inline: "center" })` and CSS scroll-snap instead of arithmetic.
- Latin digits and units inside Arabic text ("+200 XP", "70%") need isolation: wrap in `<bdi>` or a `dir="ltr"` inline-block. A "from 70% to 90%" pair should be three flex items (value, mirrored arrow icon, value) so RTL orders them; a text arrow character will end up pointing the wrong way.

## 1.15 With Tailwind v4, Base UI and Next

**Tailwind.** Motion writes inline styles, so it wins over classes. The one real conflict (docs): a `transition-*` class on an element Motion animates makes the browser's CSS transition chase Motion's per-frame writes, which looks like stutter or lag. No `transition`, `transition-all`, `transition-transform` on a `motion.*` element; put hover colour transitions on a child. Responsive distances: define `[--enter-y:8px] md:[--enter-y:16px]` and use `initial={{ y: "var(--enter-y)" }}`. Tailwind v4 colours are `oklch`: animating between two theme colours works (checked: the JS mixer interpolates `oklch(a b c)` numbers; `animate` hands them to WAAPI), but a bare `var(--x)` to `var(--y)` cannot be mixed by `useTransform`.

**Base UI.** Read `node_modules/@base-ui/react/docs/react/handbook/animation.md` before animating a Dialog, Popover, Tooltip, Menu or Drawer. Two supported routes:

1. CSS transitions with `[data-starting-style]` and `[data-ending-style]` on the popup. Base UI waits for them before unmounting, and they can reverse mid-way. Simplest and safest for ordinary popovers, tooltips, menus.
2. Motion: make the component controlled (`open` / `onOpenChange`), put `keepMounted` on the `Portal`, render the portal conditionally inside `AnimatePresence`, and pass `render={<motion.div … />}` to the popup. Base UI "detects animations on the popup element. CSS animations are always detected, and so are Motion animations that include `opacity`": always include `opacity` in the exit.

Animate the popup part, not the positioner (the positioner is the element Base UI moves). The handbook's example sets `transform-origin: var(--transform-origin)` on the popup so it grows from its anchor.

**Next.** `motion/react` needs a client file. `initial` values are rendered on the server, so content with `initial={{ opacity: 0 }}` is invisible until hydration: fine for decoration, wrong for the page's main heading above the fold on a slow start. No `Math.random()` or `Date.now()` in render for animation values (hydration mismatch): compute them in an effect or from a seeded function.

## 1.16 Route transitions in Next 16: the recommendation

**Target:** old page out first, short slide + fade, never two pages half-visible, no dimming, no big shadows.

### What Next 16.4.6 and React 19.3.1 offer (bundled docs and installed packages)

- `import { ViewTransition, addTransitionType } from "react"`: both are real exports of the installed `react` 19.3.1 and typed in `@types/react`.
- "View transitions work in the App Router with no configuration." Route navigations are React Transitions, so `<ViewTransition>` boundaries animate on navigation. Plain `setState` (and Zustand updates) do not trigger them; `startTransition`, `Suspense` and `useDeferredValue` do.
- `<Link transitionTypes={["nav-forward"]}>` (added in 16.2) and `router.push(href, { transitionTypes: [...] })` tag a navigation; the boundary picks a class per type.
- Props: `enter`, `exit`, `update`, `share`, `default`, each `"auto"`, `"none"`, a class name, or `{ [type]: className, default: … }`; `name` only for shared elements. Classes are styled with `::view-transition-old(.cls)` / `::view-transition-new(.cls)` / `::view-transition-group(.cls)`.
- "Put the wrapper in each `page.tsx`, not the layout. Layouts persist across navigations, so enter and exit never fire there."
- Limits stated in the docs: Chromium 125+ and recent Safari / Firefox, otherwise the page just swaps; the browser back button does not animate; a view transition cannot be interrupted, a second one waits for the first; the `::view-transition` overlay eats clicks unless you add `pointer-events: none`; React does not handle reduced motion for you.
- React cancels the root snapshot when nothing outside a boundary changed (it sets `view-transition-name: none` on `<html>` for that transition; visible in `react-dom-client.development.js`). So the shell is not cross-faded; only the boundaries animate.

### Recommended: React `<ViewTransition>` with sequenced CSS

One wrapper, used as the outermost element of every `page.tsx` (it must sit above any DOM node of the page, and its child should be one element):

```tsx
import { ViewTransition, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
```

```css
/* globals.css. Old page leaves in 140 ms; the new one stays invisible until then. */
::view-transition-old(.page-out) {
  animation: 140ms cubic-bezier(0.4, 0, 1, 1) both page-out;
}
::view-transition-new(.page-in) {
  animation: 240ms cubic-bezier(0.22, 1, 0.36, 1) 140ms both page-in;   /* 140 ms delay = exit duration */
}
@keyframes page-out { to   { opacity: 0; translate: 0 -6px; } }
@keyframes page-in  { from { opacity: 0; translate: 0 8px; } }

::view-transition { pointer-events: none; }            /* keep the page clickable */

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

Why this one:

- The sequencing is exactly "old out first": the delay on the new snapshot plus `both` fill keeps it at opacity 0 while the old one fades. The structure is the bundled guide's own (exit 150 ms, enter 210 ms delayed by the exit, in its `globals.css`); only the numbers and the vertical direction are ours.
- The exit starts only when the new page is ready to commit. A hand-rolled "fade out, then `router.push`" shows an empty area while a route loads.
- Vertical travel is direction-neutral: nothing to flip for RTL. If a horizontal slide is ever wanted, "forward" in RTL moves the old page to the right, the reverse of the guide's LTR example.
- `default="none"` stops the page boundary from cross-fading on unrelated transitions.
- The advisor's "he opens it for you" navigation goes through `router.push`, so it gets the same transition for free.

**Things that will bite** (the first is my inference from how the overlay works plus the guide's "Anchoring the header" section; **UNTESTED**, check with a recording):

1. The page snapshots are painted in the `::view-transition` overlay, above the whole document. Anything fixed or sticky that overlaps the page (top bar, bottom tab bar, the chat launcher, the open chat panel, toasts) will be covered by the moving page for those 380 ms unless it is given its own name and pinned, the way the guide pins its header:

```tsx
<aside style={{ viewTransitionName: "advisor-panel" }}>…</aside>
```
```css
::view-transition-group(advisor-panel) { animation: none; z-index: 100; }
::view-transition-old(advisor-panel)   { display: none; }
::view-transition-new(advisor-panel)   { animation: none; }
```

   Each name must be unique among mounted elements or the whole transition is skipped. Named elements ignore clicks while a transition runs.
2. A `loading.tsx` or a suspending page turns one transition into two (page out, skeleton in, content in). Pages here are static shells with client state, so do not add `loading.tsx`.
3. A root `app/template.tsx` that returns the wrapper would save touching every page, and templates do remount on navigation (`template.md`), but the guide only vouches for `page.tsx`, and a root template does not remount for navigation inside a deeper segment. Per-page wrappers are the documented, predictable form.
4. Do not combine with a Motion `layoutId` animation across the same navigation.

**Fallback if it misbehaves on the day** (10 minutes, zero risk): delete the wrapper and add an enter-only animation in `app/template.tsx`, a CSS class with `animation: page-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both`. The old page disappears at once, the new one fades and rises: still never two pages at once. TEAM-BRIEF describes the route change he already approved in exactly these terms.

**Inside one route** (onboarding step to loading to reveal; tabs; the stages of the CV analysis) use `AnimatePresence mode="wait"` with the same numbers (the first snippet in 1.6). It is interruptible and needs no browser support.

**Shared element across routes** (a job card growing into the job page): `<ViewTransition name={"job-" + id} share="morph" default="none">` on both sides; keep the explicit `share` when `default="none"`, or the pair stops morphing. It only pairs when both ends are in the viewport and the destination does not suspend.

**`AnimateView`** (`motion/react-animate-view`) is the same mechanism with Motion transitions written in JS: `enter` / `exit` / `share` / `update` take targets, or functions of the transition types. Use it only if a view transition needs a spring or `clipPath` keyframes; plain CSS covers the page change. Setting your own values replaces the browser cross-fade.

**Not recommended:** `AnimatePresence` around `children` in a layout. The layout receives the new page as `children` immediately, so the "exiting" element is re-rendered with the new route's content. The well-known workaround freezes a router context imported from `next/dist/shared/lib/…`, an internal path (community knowledge, not checked against 16.4.6). Do not build the demo on it.

## 1.17 Recipes by Dalilak moment

| Moment | Technique |
|---|---|
| Sign-in showcase (right half) | Real product pieces as components in a slow loop: CSS keyframes or Motion loops on transform/opacity only; pointer tilt with `useMotionValue` -> `useTransform` -> `useSpring` -> `rotateX/rotateY` + `transformPerspective`; pause with `usePageInView`; under reduced motion show one still composition |
| Sent bubble pops from the composer | `initial={{ opacity: 0, y: 22, scale: 0.92 }}`, tween 0.44 s with `ease.pop`, `style={{ originX, originY: 1 }}` on the send-button side; reply block rises 8 px 140 ms later |
| Thinking state | Rolling status line (1.6); the glyph is its own small SVG loop; the shimmer is a CSS `background-clip: text` sweep |
| Answer blurs into focus | Variants from 1.4 on block-level children (paragraphs, cards), 80 ms stagger. Never one `motion` element per token |
| Chat panel open / close | `AnimatePresence`; open `opacity 0 -> 1` + 16 px from the inline-end edge, 0.2 s ease-out; close 0.15 s. Panel is `position: fixed`: add `layoutRoot` if anything inside uses `layout`; scroller gets `layoutScroll` |
| Composer pill springs open | `layout` on the composer with `style={{ borderRadius }}`, `spring.layout`; children get `layout="position"` |
| Path-reveal loading | One `useAnimate` timeline with labels; rolling status tied to `tl.call`; route line drawn with `pathLength`; hand-over to the roadmap with `AnimatePresence mode="wait"` |
| CV analysis show | Scan line (transform loop), phrase highlight (`backgroundSize` 0 to 100%), chips pop (`scale 0.8 -> 1`, stagger 60 ms), result cards rise 12 px / 0.55 s staggered (the sequence in 1.9) |
| Roadmap progress | Per-edge `motion.path` with `pathLength`; node pop with `spring.pop`; "next" node pulse as a CSS ring animation (a stroke that scales and fades, not a glow) |
| Course complete | One sequence: XP count-up -> star pip lands -> match ring 70 to 90 with count-up -> restrained confetti (about 30 `motion.span` particles on transform/opacity, removed on complete, none under reduced motion) |
| Level-up | Full-screen `AnimatePresence` layer; title with `spring.cheer`; old level label rolls to the new one |
| Leaderboard | Rows keyed by user id with `layout="position"` + `spring.layout`; rank number rolls; podium columns rise with stagger (`scaleY` from `originY: 1`) |
| Tab / filter pill | `layoutId` inside a `LayoutGroup` (1.7) |
| Job list re-rank on filter | `AnimatePresence mode="popLayout"` + `layout="position"` on items |

## The 10 mistakes to avoid (stack)

1. `visualDuration` without `bounce`, or `type: "spring"` with no numbers: you silently get a 1.1 s wobbly spring.
2. Spring exits, or springs before anything that waits (`mode="wait"`, `await`, `onAnimationComplete`): the wait includes the invisible tail. Exits are 120 to 160 ms tweens.
3. A Tailwind `transition-*` class on a `motion.*` element.
4. Page transitions with `AnimatePresence` around layout `children`, or `layoutId` across a route change.
5. Forgetting `<MotionConfig reducedMotion="user">` (the default ignores the OS setting), and forgetting that CSS keyframes and view transitions need their own media query.
6. `AnimatePresence` inside the condition, children without stable keys, two children in `mode="wait"`, `popLayout` inside a `position: static` parent.
7. `layout` with `borderRadius` / `boxShadow` set by class instead of `style`; `layout` inside a scroller without `layoutScroll`, or inside the fixed chat panel without `layoutRoot`.
8. Killing compositing by accident: `onUpdate`, `transformTemplate`, `repeatDelay` or `repeatType: "mirror"` on fades, or animating SVG children when an HTML wrapper could move instead.
9. Treating `x` as logical in RTL, or printing numbers with an Arabic locale.
10. Copying snippets written for `framer-motion` 6 to 11 (`exitBeforeEnter`, `AnimateSharedLayout`, `staggerChildren`, `useViewportScroll`, `useAnimation`), or judging smoothness in `next dev`.

---

# PART 2. Game-like learning UX patterns

Structure and behaviour, with the reason each works. Source tags like (S7) point to the list at the end; "general" means established theory I did not re-open today.

## 2.0 The psychology toolbox

| Effect | One line | Where it is used below |
|---|---|---|
| Goal-gradient (Hull 1932; Kivetz, Urminsky and Zheng 2006; general) | Effort rises as the goal gets closer | Progress bars, "2 steps to the next level", next node |
| Endowed progress (Nunes and Drèze 2006; S11) | A head start towards a goal raises completion. In the car-wash study, 34% of people given a 10-stamp card with 2 stamps already on it redeemed it, against 19% with an empty 8-stamp card: the same 8 purchases | Onboarding XP, a roadmap that starts with stages already done |
| Loss aversion (Kahneman and Tversky 1979; general) | Losing hurts more than an equal gain pleases | Streaks |
| Self-determination theory (Deci and Ryan; general) | Motivation lasts when people feel competent, autonomous and connected | Skill stars (competence), choosing a goal and branches (autonomy), leaderboard (relatedness) |
| Peak-end rule (Kahneman; general) | An experience is remembered by its peak and its end | End-of-lesson and end-of-session celebrations |
| Variable reward (Skinner; general) | Unpredictable rewards hold attention more than fixed ones | Daily reward, surprise badges. Use lightly |
| Social comparison (Festinger 1954; general) | People judge themselves against similar others | Small, similar-level leaderboard cohorts |
| Labor illusion (Buell and Norton 2011; S11) | People value a result more when they watch the work being done, even if it takes longer | Path-reveal loading, CV analysis |
| Overjustification (Lepper, Greene and Nisbett 1973; general) | Rewards unrelated to the activity can crowd out the real reason for doing it | Why XP must map to real progress |

The idea file's principle, "the game must reflect real progress", is the overjustification lesson stated as a product rule. A warning from practice (S8): a growth team added a "limited moves" counter copied from a puzzle game to a learning app and it changed nothing, because the mechanic had no reason to exist there. Their rule for borrowing a mechanic: ask why it works in the source product, whether that reason holds in yours, and what must be adapted.

## 2.1 Paths and roadmaps with branches

**Why it works.** A path answers "what do I do now?" with exactly one thing, which removes choice paralysis; it shows how far the goal is (goal-gradient); and done stages behind you are visible proof of competence. Duolingo replaced a choose-your-own tree with a single guided path because learners were unsure whether they were using the product the "right" way (S7). The cost was autonomy: users complained they could no longer pick what to do next (press coverage of the same change). Branches are how to give autonomy back without losing guidance.

**Structure worth taking**

- One spine from "you are here" to the goal. Exactly one node is "next": larger, labelled, the only thing that moves. Everything else is calm.
- Group nodes into named stages with a header that says what the stage gives you in plain words (S7: descriptive unit labels instead of numbered ones; a short overview per unit).
- Tapping a node opens a small panel (what it is, how long, what you earn, a single primary button), it does not navigate away (S7: tapping a circle opens a popup with the topic).
- Completed nodes stay tappable for review. Practice counts as forward movement, built into the path instead of living in another tab (S7).
- A floating "back to where I am" button whenever the current node is off screen (S7).
- Optional branches as side spurs off the spine, visibly different from core nodes and labelled optional. The Laracasts path page is built this way: four numbered levels, each with a description, a "you will learn" list, a set of core series with counts and hours, and a separate "optional branches" group per level, plus one locked badge shown from the start that completing the whole path unlocks (S9).
- A fork after the goal: the follow-on destinations that finishing this path opens up, each with its own number ("after this you match 90% of …", as in the idea file).
- The goal sits at the end as an object (a trophy, the job card), visible from the first screen: the path is a promise about where it leads.
- Start with progress already on the board: the profile and CV steps appear as completed first nodes (endowed progress), so the new user's roadmap is never empty.
- Every stage shows its payoff in the product's real currency. In Dalilak that is the match percentage: "this stage: +8% match".

**Interaction details**

- On open, the map is already scrolled so the next node is in the middle of the screen. Never open at the top of a long path.
- One movement at a time: when a stage completes, the edge to the next node draws, then the node unlocks, then the label appears. Nothing else on the page animates meanwhile.
- States must differ in shape and icon, not only colour: done (filled, check), next (larger, ring), optional (outlined), locked (muted, lock).
- Locked is visible, not hidden: seeing the whole route is the motivation. A locked node still responds to a tap by saying what unlocks it.

**Avoid.** A map that is only decoration (nodes you cannot open); more than one "next"; hiding the remaining length; a path so long that the goal is never on screen (collapse far stages into "3 more stages").

## 2.2 Skill trees with prerequisites and locked states

**Why it works.** A tree shows the whole landscape and how skills depend on each other, which a linear path cannot. It serves autonomy (choose a direction), competence (stars per skill), and curiosity (locked nodes you can almost reach). The idea file gives the tree that job explicitly: "shows the whole landscape, not just the user's own path".

**Structure worth taking**

- Three states per node, always distinguishable: earned, available, locked (the standard three-state model in skill-tree tools; S12).
- Show locked nodes and their requirements. Game designers argue both ways; one widely cited position (Tim Cain on his own older game, via S12) is that hiding options until they are offered was a mistake and he would show everything. For a career product, visibility is the point.
- A locked node explains itself on tap: which prerequisites are missing, each a link that jumps to that node.
- Selecting a node highlights its prerequisite chain and dims the rest. This is the interaction that makes the graph readable.
- Levels inside a node (0 to 3 stars here). Khan Academy does the same with named mastery levels per skill, and counts only the upper levels towards course mastery (S10): a node is not just done or not done.
- "Almost there" emphasis: a locked node with one missing prerequisite looks different from one with three (goal-gradient). An available node that also lies on the user's roadmap carries a marker linking the two views.
- Validate the data: prerequisites must form an acyclic graph with no unreachable node (S12). Write that as a unit test over the sample data (vitest is installed).

**Interaction details**

- Unlock is a small event: the edge from the finished prerequisite draws to the dependent, then the lock gives way to the skill's icon.
- Star gain animates on the node itself and in the place where the course was completed, so the two screens visibly share a state.
- On phone show one field at a time (Part 3). A zoomable canvas is a desktop pattern.

**Avoid.** Lines crossing between distant fields (state the requirement in text instead); long text inside nodes; trees so wide they need two-axis panning.

## 2.3 XP and level-up moments

**Why it works.** XP turns every meaningful action into immediate, countable feedback (competence), and a level is a slower identity that survives the session. The bar towards the next level is a goal-gradient device.

**Structure worth taking**

- XP is paid at the moment of the action, next to the thing that earned it, with the amount and the reason ("+100 XP: CV analysed"). Then the total updates.
- Amounts are proportional to real effort (the idea file scales course XP with hours). A few sizes only, so users learn the scale.
- Always show the distance to the next level ("120 XP to level 3") near the level, not only a bar.
- Early levels come fast. The first level-up should happen in the first session: the idea file's demo expects it at the CV step, and onboarding pays 50 + 100 XP by then, so level 2 has to cost 150 XP or less.
- Level titles (the seven named levels) are the shareable identity; show the title wherever the avatar appears.
- Tie XP to something real. In Dalilak a course also raises a skill's stars and the match percentage: show all three changing in one sequence, XP first (cheapest), match last (the one that matters).

**Level-up moment**

- It interrupts: a full-screen layer for about 2 seconds, dismissable, never more than once per action (queue several rewards into one sequence, do not stack overlays).
- Beats: the action completes -> XP counts into the bar -> the bar fills and overflows -> the level number rolls -> the new title appears -> one line saying what the level means -> continue.
- It ends by returning the user to the next thing to do, not to an empty state.

**Avoid.** XP for trivial actions (opening pages); a total with no next target; a level-up so frequent it stops meaning anything.

## 2.4 Streaks and daily rewards

**Why it works.** A streak makes consistency visible and adds something to lose (loss aversion); once people log a streak, keeping it becomes a goal in itself (Silverman and Barasch 2023; S11).

**What the evidence says**

- Keep the bar low. Duolingo found its "daily goal" requirement was stopping people from forming a habit; when one lesson a day became enough to extend the streak, day-14 retention rose 3.3% and the share of daily learners with a streak rose 10.5% within 20 days in the A/B test (S7).
- Early days matter most: going from day 2 to day 3 is a 50% increase, 200 to 201 is 0.5% (S7). Mark day 1, 3 and 7 loudly.
- Slack helps: allowing a second "protect one missed day" token raised daily active learners slightly (+0.38%) and, they report, did not lead to more days off (S7, which cites a study on leaving slack in goals).
- A broken streak demotivates. Highlighting an intact streak raises later engagement, highlighting a broken one lowers it, and the damage shrinks when people can repair it (S11).
- A celebration screen after extending the streak, with a special version on milestone days, raised 7-day retention of new learners by 1.7% in their test (S7). They treated timing and rhythm as part of the design, and made milestones shareable.
- One growth lead describes a "you are about to lose your streak" reminder, a calendar view, animations and rewards as successive retention wins, and a hard rule against sending more notifications (S8).

**Structure worth taking**

- The rule is one sentence and the action is small: one meaningful action a day (a course step, a CV update, an application).
- Show a week strip (seven day-dots, today marked) beside the number: it shows the pattern and how close the next milestone is.
- The moment the streak extends is its own small celebration, at the end of the first qualifying action of the day; bigger on milestone days.
- A daily reward that grows with the streak and is capped (the idea file's rule), collected with one tap from a card that states tomorrow's amount.
- If a day was missed, lead with the way back ("start a new streak today", or a repair), never with the loss.
- No guilt mechanics and no pressure copy: this is a career product and the user may be anxious already.

**For a 2-minute demo.** A streak cannot be earned on stage. Seed a profile that is one action away from a 7-day milestone, or label the feature honestly as starting at day 1.

## 2.5 Badges

**Why it works.** A badge marks a milestone that XP blurs. Displayed as a set with empty slots, it also shows what is possible (curiosity, collection).

**Structure worth taking**

- A fixed, small set (the idea file has 10) shown as a grid: earned in full, unearned as a muted silhouette with its condition written under it. Unearned badges are a to-do list.
- Progress towards countable badges ("3 of 5 courses").
- Award at the moment of the qualifying action, inside the same celebration sequence, not as a second popup.
- The badge detail says what was done and when: it is a record.
- Mix easy early badges (first steps, CV scanned) with one hard one ("job ready": 100% match) that names the product's real goal.
- One locked "end of path" badge shown from the first screen is a strong, cheap device (S9).

**Avoid.** Badges for things the user did not choose to do; so many that none is special.

## 2.6 Leaderboards

**Why it works.** Comparison with similar people is motivating; comparison with the unreachable is not. The reported effects of moving from a global board to small weekly cohorts of similarly active users: learning time up 17%, and three times as many highly engaged learners (S8). Research on leaderboards is mixed: relative ranking tends to help those near the top and can discourage those at the bottom (S12).

**Structure worth taking**

- A small cohort (a few dozen), matched by recent activity, reset on a period. Duolingo's cohorts are weekly and matched on study habits and time zone (S7); third-party guides report about 30 people per cohort, a figure I could not confirm from the company itself.
- Zones: a marked top group that earns something and, in harsher designs, a bottom group that loses something. For Dalilak keep only the top zone.
- A podium for the first three, then the list.
- **Your row**: always visible. If it is scrolled out of view, a pinned copy sits at the bottom edge of the list; tapping it scrolls to the real row. Open the page scrolled to your row, not to the top.
- **Neighbours**: studies of relative leaderboards show a window of about two above and two below (S12). State the gap to the next rank in XP ("40 XP to pass …"): this is the actionable number.
- **Movement arrows**: up / down and by how many places since the last visit or period; a dash for no change; new entrants marked as new. Up and down arrows are not mirrored in RTL.
- Rank by XP earned in the period, not all-time, so a newcomer can win.
- Every row: rank, avatar, name, level title, period XP.
- When the user earns XP elsewhere, the next visit to the board plays the change: their XP counts up, then the row moves to its new place, then the arrow appears. That replay is the whole point of the page in a demo.

**Honesty for the demo.** Other users are sample data and must be labelled so. Seed the sample XP so the walkthrough tells a story: after onboarding the user is mid-table, and the +200 XP course completion carries them past two or three neighbours into the top zone.

**Avoid.** A global all-time board; showing someone as last of thousands; a board with no next target.

## 2.7 Course and lesson progress

**Structure worth taking**

- Three nested levels, each with its own indicator: path (stage dots or percent), course (ring or bar on the card), lesson (checklist). The same course shows the same progress wherever it appears.
- A course card answers four things without a click: what skill it raises and by how much, how long it takes, what it pays (XP), and its state (not started, in progress with percent, done).
- "Continue" is the primary action on the home screen and goes to the exact place the user stopped.
- Inside a course, a visible list of parts with the current one marked and the remaining time stated.
- Completion is an explicit, satisfying action. In the demo it is a button, which is fine and honest; give it weight: press, short "confirming" state, then the celebration.
- After completion the card does not vanish; it turns into a "done" state with what it gave you.
- Recommended next course is one item with the reason ("closes your biggest gap: SQL"), not a grid.

**Why it works.** Goal-gradient at three scales, and a single obvious next step.

## 2.8 Celebration moments

**Why it works.** Peak-end: the end of a unit of effort is what is remembered, so that is where the emotion goes. It is also the cleanest feedback that the action worked.

**Rules**

- Three sizes, used consistently. **Small** (inline, under 0.5 s): a check, a "+XP" chip, a star landing. **Medium** (a card or sheet, about 1.5 s): course complete, streak extended. **Large** (full screen, about 2 to 2.5 s, skippable): level-up, a milestone streak, 100% match.
- One celebration per action. If an action triggers several rewards, order them inside one sequence from small to large and end on the one that matters.
- Show cause, then effect, then meaning: what you did -> what changed (numbers actually moving from the old value to the new) -> what that means ("you now match 90% of Data Analyst").
- Numbers roll, they do not swap. The old value must be visible first.
- Something physical connects the cause to the result: the XP chip travels to the bar, the star lands on the skill.
- End with one clear next step.
- Regular days and milestone days look different; if every day is a festival nothing is (S7).
- Restraint in colour and decoration. Mohammed's rejected list applies fully here: no sparkle glyphs, no glow, no gradient washes. The richness is timing: anticipation (a 100 to 150 ms hold), the hit, the settle.
- Under reduced motion keep the state change and the numbers, drop the travel and the confetti.

## 2.9 Onboarding conversations that feel personal

**Why it works.** Answering questions is effort invested (people value what they helped build), every answer can be reflected back (competence, being heard), and by the end the product has enough to make a specific promise. Products in this space let people get value before asking for commitment: Duolingo's well-known flow asks a handful of short questions and runs a first lesson before any sign-up (third-party teardowns, S13; the uplift figures quoted around the web could not be traced to a primary source, so none is repeated here).

**Structure worth taking**

- Say the cost up front: "five short questions". Show progress as "2 of 5".
- One question per turn. Each answerable with one tap (chips) or free text. Chips are answers, not menus: tapping one sends it as the user's bubble.
- The agent reacts to the answer before asking the next thing, with something that proves it was understood (it names the city, relates the major to a field). A fixed "Great!" reads as a form.
- Say why a question is asked when that is not obvious ("so I only show jobs near you").
- Fast first response: the reply starts at once, with a visible thinking state for anything slower (TEAM-BRIEF: answers every message at once, greetings too).
- Tolerate everything: a greeting, a question back, an answer to a different question, two answers at once, "skip", a correction of an earlier answer. Enforce what must be collected in code, not only in the prompt (lead decision), so the flow always finishes, with or without a model.
- Let the user see and edit what has been collected (a summary line or chips above the composer).
- Pay inside the conversation: the +50 XP for the profile lands as a visible moment at the last answer.
- The hand-off is a show, not a spinner (labor illusion): named steps that describe real work on the user's own answers, each resolving in turn, then the result. Not a fake percentage. Keep it under about 6 seconds and make it skippable on repeat visits.
- The reveal quotes the user: "because you studied X in Y and want Z". A result that could have been shown to anyone wastes the conversation.
- Afterwards the same character stays as the advisor and remembers what was said. Open the first advisor session with a specific suggestion, not "how can I help?".

**Avoid.** Asking what you could infer; more than about seven questions; a personality that jokes while the user is worried about work; walls of text.

---

# PART 3. Drawing a branching roadmap and a skill tree (SVG + DOM, 390 px, RTL)

## 3.1 Shared decisions

1. **Hybrid rendering.** Edges are SVG; nodes and labels are DOM. Arabic text in SVG `<text>` does not wrap, and `text-anchor` flips meaning with direction; `<foreignObject>` is fragile under transforms. DOM nodes get real buttons, focus rings, tooltips, Base UI popups, and Motion `layout`.
2. **One SVG overlay for edges**: `position: absolute; inset: 0; pointer-events: none; aria-hidden="true"`, under the nodes, with user units equal to CSS px (no `viewBox`, or a `viewBox` equal to the container size). Then `pathLength` drawing, CSS `offset-path` and node coordinates all share one coordinate system.
3. **SVG is not mirrored by `dir="rtl"`**: x still grows to the right. Mirror in your own geometry, in one place.
4. **Per-edge paths.** Each connection is its own `<path>`. State then lives on the edge (done: solid; being completed: drawing; locked: muted or dashed), and "draw the next segment" is one `pathLength` animation. No `getPointAtLength` arithmetic.
5. **Two layers per edge when needed**: a muted track path below (may be dashed), a solid progress path above with `pathLength`. One element cannot do both (1.10).
6. **Targets and sizes at 390 px**: tappable area at least 44 x 44 px; a node 56 to 64 px; 16 px side padding; labels up to 2 lines, about 45% of the width.
7. **State is never colour alone**: shape, icon and size change too.
8. **DOM order equals reading order.** Nodes are an `<ol>`; the current one has `aria-current="step"`; locked ones are still focusable, with `aria-disabled="true"` and the unlock condition in their accessible description.
9. **Re-measure or re-layout** on container resize (`ResizeObserver`) and after `document.fonts.ready`: the Arabic web font changes label sizes after first paint.
10. **Curve helpers.** Both are symmetric, so mirrored input gives a mirrored curve:

```ts
type Pt = { x: number; y: number };

// vertical S-curve: leaves and arrives vertically
const sCurve = (a: Pt, b: Pt) => {
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
};

// side spur: leaves horizontally, turns with radius r, arrives vertically
const elbow = (a: Pt, b: Pt, r = 16) => {
  const sx = Math.sign(b.x - a.x) || 1;
  const sy = Math.sign(b.y - a.y) || 1;
  return `M ${a.x} ${a.y} H ${b.x - sx * r} Q ${b.x} ${a.y} ${b.x} ${a.y + sy * r} V ${b.y}`;
};
```

## 3.2 Technique A: the branching roadmap (computed layout)

The roadmap is one user's path: few nodes, a known shape. Compute positions; do not measure.

**Model.** `nodes: { id, kind: "start" | "stage" | "optional" | "goal" | "next-goal", state: "done" | "next" | "locked" | "optional", parent?: id }` and `edges: { from, to, kind: "spine" | "branch" | "fork" }`.

**Layout in logical units, mirrored once.**

```ts
const INLINE_END = dir === "rtl" ? -1 : 1;                 // the only place direction enters
const amp = Math.min(width * 0.26, 120);                   // how far the spine swings
const toX = (inline: number) => width / 2 + INLINE_END * inline * amp;   // inline: -1 (start side) .. +1 (end side)
const toY = (row: number) => top + row * rowHeight;        // rowHeight 104 to 120 px on phone
```

- Spine: node `i` at `inline = sin(i * PI / 2) * 0.6` (centre, end side, centre, start side, …) or a simpler alternation. A gentle swing reads as a road and leaves the opposite side free for the label.
- Label side: opposite the node's offset; centred nodes put the label on the start side. Position labels with the same `toX`, so they mirror too.
- Optional branch: a spur from a spine node to `inline = ±1` on the free side, one row down, drawn with `elbow`. At most one spur per spine node at 390 px; its node is smaller (44 px) and outlined.
- Fork after the goal: two or three "next goal" cards in a row below the trophy (a horizontal scroll-snap row if there are three), joined by `sCurve` from the goal. On phone they are cards with a match ring, not circles.
- The page scrolls vertically; the map never needs horizontal panning.
- Container height is `toY(lastRow) + bottomPadding`; set it explicitly so the SVG and the node layer agree.

**Render.** Nodes: `position: absolute; left: x; top: y; translate: -50% -50%` (physical `left` is fine here because `x` already includes the mirror). Edges: `<path d={sCurve(a, b)}>` between node centres; nodes sit on top and hide the ends. Width comes from a `ResizeObserver` on the container, so render the map in a client component after the first measure (or assume 390 for the first paint, phone first).

**Progress and motion.**

- First visit: done edges draw one after another (about 250 ms each, 40 ms overlap) up to the current node, the "next" node pops, locked nodes only fade. Later visits: `initial={false}`.
- Stage complete: the edge draws (0.9 s, `ease.inOut`), the old "next" turns into "done" (icon swap), the new "next" pops (`spring.pop`), its label rolls in. One sequence, one moving thing at a time.
- "You are here" marker: an HTML element following the just-completed edge with `offsetPath: path("…")` and `offsetDistance` 0% to 100% using the same `d` (same px space), or simply cross-fade it from the old node to the new one if that proves fiddly.
- Scroll: on mount `nextNode.scrollIntoView({ block: "center" })` without animation. Show a "back to my step" button when the next node is out of view (`useInView`).
- Tap: a bottom sheet on phone (Base UI Drawer or Dialog), a popover or side panel on desktop; content: title, what it raises, time, XP, one primary button.

**Scaling alternative (not recommended, UNTESTED).** A percent-based `viewBox` with `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke` avoids measuring the width, but dash-based drawing and non-uniform scaling do not combine reliably. Stay in px.

## 3.3 Technique B: the skill tree (CSS layout, measured edges)

The tree has 38 skills in 7 fields with arbitrary prerequisites. Let CSS place the nodes, which mirrors for RTL automatically, then measure and draw.

**Phone structure.** One field at a time. A horizontally scrollable row of seven field chips at the top (sticky; the active chip uses the `layoutId` pill from 1.7), each chip showing that field's stars earned out of possible. Below it, the active field's tree. Swiping between fields: a horizontal `scroll-snap-type: x mandatory` container with one panel per field; RTL works natively. Desktop (1440): two or three field panels side by side, or all seven as columns with an overview.

**Tiers.** `depth(n) = 0` with no prerequisites inside the field, otherwise `1 + max(depth(prerequisites))`. Each depth is a row, top to bottom. Order nodes within a row by the average position of their parents in the row above (one pass is enough at this size): fewer crossings.

**Placement by CSS grid.** A 6-column grid per row: one node spans columns 3 to 4, two nodes 2 to 3 and 4 to 5, three nodes 1 to 2, 3 to 4, 5 to 6. Three nodes of about 104 px with 16 px gaps fit 358 px of content width. Because it is a grid inside a `dir="rtl"` container, column 1 is on the right: the mirror is free. More than three nodes in a tier: wrap that tier into two rows.

**Measure.** After layout, read each node's box relative to the tree container (`position: relative`), using layout offsets:

```ts
// offset* ignores CSS transforms, so edges do not jump while nodes scale or slide in.
// getBoundingClientRect() would include Motion's transforms mid-animation.
function anchor(el: HTMLElement, root: HTMLElement, at: "top" | "bottom"): Pt {
  let x = el.offsetWidth / 2;
  let y = at === "top" ? 0 : el.offsetHeight;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}
```

Edges run from the bottom centre of the prerequisite to the top centre of the dependent with `sCurve`. Measured coordinates are physical px, so nothing is mirrored by hand. Measure in `useLayoutEffect`; re-run on `ResizeObserver`, on `document.fonts.ready`, and when the field changes. Keep the measurements in state keyed by node id; the SVG re-renders from them.

**Node anatomy at about 96 to 104 px wide.** Icon tile (56 px) from the custom icon set; three star pips under it; a one or two line name. States: locked (muted tile, lock glyph, no pips, dashed outline), available (outlined, 0 of 3 pips, a "start" affordance), 1 to 3 stars (filled tile, pips filled), on-my-path marker (a small route glyph in the corner).

**Edge states.** Prerequisite earned and dependent unlocked: solid. Prerequisite earned and dependent still locked by another prerequisite: solid up to the node, node locked ("one more to go"). Prerequisite not earned: muted, dashed (a separate path element, no `pathLength`).

**Interactions.**

- Tap an available or earned node: sheet with the skill, the evidence sentence from the CV if it was found there, its stars, the courses that raise it.
- Tap a locked node: sheet listing its prerequisites with their state; each is a link that switches field if needed, scrolls to that node and pulses it once.
- Focus or tap highlights the prerequisite chain (walk the parents) and dims other nodes and edges to about 35% opacity.
- Cross-field prerequisites are a chip on the node ("needs: … in …"), never a line across panels.
- Unlock: the incoming edge draws, the lock is swapped for the icon (`AnimatePresence mode="popLayout"`, scale + blur), the outline turns solid, the pips appear.
- Star gained: the pip lands with `spring.pop`; the field chip's total rolls.

**Data checks to write as tests.** Every prerequisite id exists; the graph has no cycle; every node is reachable; no tier is wider than three after wrapping; names fit two lines at 390 px (check by screenshot).

## 3.4 RTL checklist for both

1. Direction enters the roadmap geometry once (`INLINE_END`); the tree gets it from CSS grid.
2. Never set `transform: scaleX(-1)` on a container that holds text. Mirror coordinates, not pixels.
3. Node and label positions come from one function, so they cannot disagree.
4. Chevrons and "next" arrows are mirrored; check marks, locks, stars, the trophy and rank arrows are not.
5. Latin terms (SQL, Power BI) and numbers inside Arabic labels: isolate with `<bdi>`.
6. Test the phone width with the longest real Arabic labels, not placeholders. Arabic words do not hyphenate; allow two lines and use `text-wrap: balance`.
7. Horizontal field chips: start edge is the right; the active chip is brought into view with `scrollIntoView({ inline: "center" })`.
8. Motion offsets on nodes (`x`) are physical; vertical entrances (`y`, `scale`, `opacity`) avoid the question.
9. Take both `--phone` and 1440 screenshots of each state: fresh, mid-path, one locked branch, all done.

---

# Sources

Opened and read unless stated otherwise.

- **S1 Installed Motion 14.14.0**: `node_modules/motion/README.md`, `motion/package.json`; `framer-motion/dist/index.d.ts`, `dist/animate-view.d.ts`, `dist/es/components/AnimatePresence/PopChild.mjs`, `dist/es/components/AnimateView/*`, `dist/es/context/MotionConfigContext.mjs`, `dist/es/utils/reduced-motion/*`; `motion-dom/dist/index.d.ts`, `dist/es/animation/utils/default-transitions.mjs`, `dist/es/animation/generators/spring.mjs`, `dist/es/animation/waapi/supports/waapi.mjs`, `dist/es/animation/waapi/utils/accelerated-values.mjs`, `dist/es/animation/waapi/transforms/TransformAnimation.mjs` (first 140 lines and selected comments), `dist/es/render/svg/utils/path.mjs` and `build-attrs.mjs`, `dist/es/render/VisualElement.mjs` (reduced-motion block), `dist/es/animation/interfaces/visual-element-target.mjs`.
- **S2 motion.dev docs** (through a fetch tool that summarises; exact wording may differ): `/llms.txt`, `/docs/react-upgrade-guide`, `/docs/react-animate-view`, `/docs/react-transitions`, `/docs/react-layout-animations`, `/docs/react-animate-presence`, `/docs/performance`, `/docs/react-animation`, `/docs/react-accessibility`, `/docs/react-reduce-bundle-size`, `/docs/react-svg-animation`, `/docs/react-use-scroll`, `/docs/react-use-animate`, `/docs/animate`, `/docs/base-ui`, `/docs/react-tailwind`, `/docs/stagger`, `/docs/react-motion-config`, `/docs/react-motion-value`, `/docs/react-use-spring`, `/docs/react-motion-component`.
- **S3 Next 16.4.6 bundled docs**: `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` (in full), `…/03-api-reference/02-components/link.md` (`transitionTypes`), `…/04-functions/use-router.md`, `…/03-file-conventions/template.md`, `…/02-guides/upgrading/version-16.md`. Also the guide's demo stylesheet, `github.com/nextjs/react-view-transitions-demo`, `src/app/globals.css`.
- **S4 React**: `react.dev/reference/react/ViewTransition`; `node_modules/react` exports; `node_modules/react-dom/cjs/react-dom-client.development.js` (root view-transition cancellation).
- **S5 Base UI**: `node_modules/@base-ui/react/docs/react/handbook/animation.md`.
- **S6 Measurements made here**: the installed `motion-dom` spring generator, `JSAnimation`, `mix` and `stagger` run in Node (tables in 1.4, 1.5, 1.15), and one `npm run typecheck` pass over all Part 1 snippets.
- **S7 Duolingo blog**: `blog.duolingo.com/improving-the-streak`, `/how-duolingo-streak-builds-habit`, `/streak-milestone-design-animation`, `/new-duolingo-home-screen-design`, `/duolingo-leagues-leaderboards`.
- **S8 Lenny's Newsletter**: "How Duolingo reignited user growth" (`lennysnewsletter.com/p/how-duolingo-reignited-user-growth`).
- **S9 Laracasts**: the public path page `laracasts.com/path`, structure only.
- **S10 Khan Academy help centre** on mastery levels: search summary only, pages not opened.
- **S11 Papers**, abstracts or secondary summaries only, full texts not opened: Nunes and Drèze, "The Endowed Progress Effect", Journal of Consumer Research 32(4), 2006; Silverman and Barasch, "On or Off Track: How (Broken) Streaks Affect Consumer Decisions", Journal of Consumer Research 49(6), 2023; Buell and Norton, "The Labor Illusion", Management Science 57(9), 2011.
- **S12 Search summaries only**: skill-tree design write-ups (tool documentation and a wiki summary of Tim Cain's talks); leaderboard research (a University of Hong Kong study on relative leaderboards, an LSE-hosted Topcoder study, a review in Internet Research).
- **S13 Search summaries only**: third-party onboarding teardowns; press coverage of the 2022 path redesign and the complaints about it (NBC News, PiunikaWeb).

**Could not open or verify**

- The roadmap.sh diagram is rendered by JavaScript and came back empty; its README only confirms that nodes are clickable. Nothing here relies on it.
- Laracasts behind login (XP, progress, leaderboard): not seen. Only the public path page.
- The Duolingo cohort size and promotion counts come from third-party guides.
- Motion's examples gallery (most sources are paid) was not opened; the path-drawing variant shape is from memory of the public example.
- No browser run of anything. See the UNTESTED marks: the timeline sequence, `offsetPath` on a `motion.div`, and the whole view-transition recipe including the overlay stacking behaviour.

---

# The 10 things most worth using in Dalilak

1. **One motion vocabulary, set once.** A `MotionConfig` with `reducedMotion="user"` and a default spring, plus the token file in 1.5: exits are 140 ms tweens, enters 240 ms ease-out, springs always `visualDuration` + `bounce`. This alone makes fifteen builders' screens feel like one product.
2. **Old page out first, done by the platform.** React `<ViewTransition>` per page with the 140 ms out / 240 ms in CSS in 1.16, pinned shell and chat panel, and `AnimatePresence mode="wait"` with the same numbers inside a page. Enter-only `template.tsx` as the ten-minute fallback.
3. **Loading as a show of real work.** The path reveal and the CV analysis run as one `useAnimate` timeline with a rolling status line whose steps name actual work on the user's own answers (labor illusion), ending in a result that quotes them.
4. **Per-edge path drawing.** Roadmap and tree edges as separate `motion.path` elements with `pathLength`: completing a course draws the next segment, then pops the next node. The clearest possible picture of "real progress".
5. **Numbers that travel.** Count-ups through motion values (no re-renders, Latin digits) and a `pathLength` ring: XP, then the star, then match 70% to 90%, in one sequence that ends on the number that matters.
6. **`layout` and `layoutId` for continuity inside a page.** The tab pill, the composer that springs open, job cards re-ranking, the leaderboard row sliding to its new rank.
7. **A guided path with exactly one "next".** Named stages, tap-to-open node panel, a "back to my step" button, optional branches as side spurs, follow-on jobs as a fork after the goal, and the first nodes already completed when the user arrives.
8. **A phone-first skill tree.** One field at a time, tiers by prerequisite depth, CSS-grid placement with measured SVG edges, locked nodes that explain what unlocks them, and prerequisite-chain highlighting.
9. **Kind game rules that the evidence supports.** One meaningful action keeps the streak; celebrate day 1, 3 and 7; never lead with a broken streak; a small cohort leaderboard with a pinned own row, the XP gap to the next rank, and movement played back when the user returns.
10. **An onboarding conversation that proves it listened.** One question per turn, chips plus free text, a reaction that uses the answer, visible "2 of 5", XP paid inside the chat, and a first level-up before the two-minute mark (level 2 at 150 XP or less).
