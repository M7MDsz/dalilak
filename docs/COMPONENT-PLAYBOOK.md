# Dalilak component playbook

Written 18 Nov 2026 by the component lead. For every screen builder, the design-system builder and QA.

Read `BRIEF.md`, `docs/TEAM-BRIEF.md` and `docs/PRODUCT-SPEC.md` first. This file decides **how things move and which shared pieces every screen is built from**. It does not decide colours, type, icons or avatars (the design direction does), and it does not change any copy, rule or test id in the spec. The motion moments named in the spec (`code style` names such as `bubble-pop`, `match-rise`) are mapped to a building block here, screen by screen.

**Where this file and the three research files disagree, this file wins.** The research files (`docs/research/*.md`, `docs/STACK-NOTES.md`) stay the place to look up a technique in depth; section numbers are cited where useful.

## 0. Ten decisions, and what was checked

1. **One vocabulary of six verbs** (section 1.1): rise, focus, pop, roll, draw, travel. Every motion in the product is one of them, with fixed numbers. If a motion is none of the six, it is cut.
2. **Blur belongs to «دليل».** Only things «دليل» produced (answers, analysis results, the path reveal) come "into focus". Nothing else blurs, except the 2 px inside a roll.
3. **Typing belongs to «دليل»'s hands.** Text types itself only inside a real field that «دليل» is filling, or the sample CV. Answers never typewrite.
4. **Route change: old page out in 120 ms, then the new page rises 6 px in 260 ms.** Done with one CSS class and one navigation helper. React `<ViewTransition>` is not used (section 4).
5. **Shows are state-driven.** The path reveal, the CV analysis, the celebration and «دليل» filling the apply form all run on one small step runner (`useShow`): a step index in React state, real work awaited, a minimum dwell per step. No giant imperative timeline.
6. **Numbers never swap.** Big numbers count (XP, match), small ones roll (level, streak, rank, step). The match ring and its number are driven by the same value.
7. **Two ways for one thing to travel, and no third:** a shared `layoutId` when the element itself moves and stays (inside one page), `FlyToken` when a token is consumed by its target (XP into the user chip). Never across a route change.
8. **Two dialog routes:** every sheet and dialog is Base UI `Dialog` with CSS transitions; the advisor panel alone is Base UI `Dialog` with a Motion popup, because it carries a travelling glyph.
9. **No new packages.** Everything below is built from what is installed (`motion` 14.14.0, `@base-ui/react` 1.9.0, Tailwind 4.3.5). No confetti, number or toast library is needed.
10. **Loops are rationed.** At rest the product is still. Five things may loop, listed in 1.7.

**What was checked.** Every TSX/TS sketch in this file exists in compilable form in `artifacts/playbook-scratch/sketches.tsx` and passed `npm run typecheck` against the installed packages (0 errors; a deliberate mistake failed as expected, so the check was real). The CSS in 1.2 was compiled with the installed Tailwind (`artifacts/playbook-scratch/motion.css`). **Nothing was run in a browser** (only the lead runs a server). Section 5 lists what to look at first on a real screen. That scratch file is the fastest starting point for the shared blocks: copy from it, not from memory.

---

## 1. Dalilak's motion language

### 1.0 The whole language on one page

| | |
|---|---|
| **Six verbs** | **rise** (it arrived) · **focus** («دليل» worked it out) · **pop** (you did it, or earned it) · **roll** (the value changed) · **draw** (progress, proof) · **travel** (this caused that). Plus **press** on every control and **type** when «دليل» fills a field |
| **Easings** | `ease.out` `(0.22, 1, 0.36, 1)` enters · `ease.in` `(0.4, 0, 1, 1)` exits · `ease.inOut` `(0.65, 0, 0.35, 1)` drawing · `ease.pop` `(0.34, 1.32, 0.64, 1)` the sent bubble only |
| **Durations (ms)** | `exit` 150 · `fast` 200 · `page` 260 · `move` 420 · `pop` 440 · `focus` 560 · `draw` 900 · shimmer 2400 |
| **Springs** (visual duration / bounce) | `snappy` 0.2 / 0 selected and toggled states · `smooth` 0.3 / 0 the app default · `gentle` 0.35 / 0.15 anything that travels, resizes or reorders · `pop` 0.4 / 0.3 an earned thing landing · `cheer` 0.45 / 0.4 the one centrepiece of a big moment |
| **Enters** | a page rises 6 px · a block rises 8 px · «دليل»'s output comes into focus (8 px, blur 4 px) · the user's message pops from the send button · earned things pop · sheets and the advisor panel come 16 px from their edge · values roll · lines draw |
| **Exits** | 150 ms, ease-in, opacity (at most 4-8 px back the way it came), all at once, never a spring. Lines never un-draw |
| **Stagger** | 80 ms between blocks · 60 ms chips and star pips · 50 ms words · never more than 480 ms in total · never on exit · one group at a time |
| **Route** | the old page fades out in 120 ms, then the new page rises 6 px in 260 ms. The shell does not move. Filters, tabs and search do not transition |
| **Reduced motion** | travel becomes instant, fades and drawing stay, numbers jump, the five loops stop, shows shorten as the spec says, no confetti |
| **Never** | gradient or glow washes · coloured shadows · glass · sparkles · bouncing dots · two pages visible at once · heavy page pushes · per-letter Arabic animation · typewriter answers · a number that swaps · motion without a cause · a loop outside the five allowed (1.7) |

The rest of this section is the same thing with reasons and code.

### 1.1 The six verbs

| Verb | It says | What moves | Numbers |
|---|---|---|---|
| **Rise** | "this arrived" | opacity 0 to 1 with a short upward travel: 6 px for a page, 8 px for a block, 12 px for a result card, 16 px for a sheet or panel (from its edge) | page 260 ms; blocks 420 ms; sheets 200 ms in, 150 ms out; ease-out |
| **Focus** | "«دليل» worked this out" | rise 8 px plus blur 4 px to 0, block by block | 560 ms each, 80 ms apart |
| **Pop** | "you did this" / "you earned this" | scale up with a small overshoot. Sent bubble: from `y 22px, scale 0.92` at the send-button corner. Earned things (tag, star, badge, chip): from `scale 0.8` | bubble 440 ms on `ease.pop`; earned things on `spring.pop` |
| **Roll** | "this value changed" | in a clipped line the old value leaves upward and the new one arrives from below, each with 2 px blur. Big numbers count instead | roll 420 ms; count 800 ms |
| **Draw** | "this is progress" / "this is the proof" | a stroke grows: path edges, rings, check marks (`pathLength`), the evidence marker (`background-size`) | edges and rings 900 ms ease-in-out; marker 600 ms; checks 240-300 ms |
| **Travel** | "this caused that" | exactly one object moves from the cause to the effect: the tag to the tray, XP to the chip, the glyph into the panel, the marker along the path | `spring.gentle`; a `FlyToken` flight is 600 ms |

Two touches complete it. **Press:** every control goes down at once and comes back eased (`active:scale-[0.97] active:transition-none`, release 200 ms). **Type:** «دليل» writing into a field, at the speed the spec gives that step.

Rules that make the six read as one language:

- **One moving thing at a time.** While a line draws, nothing else on the page animates. Sequences go: cause, then effect, then meaning.
- **Exits are faster than enters, simultaneous, and never choreographed.** 150 ms, ease-in, opacity (plus at most 4-8 px back the way it came).
- **Opacity, blur, colour and drawing are tweens. Position and size are springs** (and only when they can be interrupted). Anything another step waits on is a tween.
- **Hover changes colour or border only.** No lift, no shadow growth, no scale on hover.
- **Nothing moves without a cause** (spec principle P8). No entrance animation on scroll, no parallax, no idle wobble.

### 1.2 Tokens

CSS side, in `src/app/globals.css` (compiled with the installed Tailwind; the `@import` line already needs `source("..")`, see STACK-NOTES 2.1):

```css
@import "tailwindcss" source("..");

:root {
  --dur-exit: 150ms;   --dur-fast: 200ms;  --dur-page: 260ms;  --dur-move: 420ms;
  --dur-pop: 440ms;    --dur-focus: 560ms; --dur-draw: 900ms;  --dur-shimmer: 2400ms;
}

@theme static {                      /* static: always emitted, JS reads them too */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);      /* enters, reveals. Replaces Tailwind's default ease-out */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);           /* exits */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);   /* drawing, moves that start and end on screen */
  --ease-pop: cubic-bezier(0.34, 1.32, 0.64, 1);   /* the approved bubble pop, and nothing else */
}

@theme {
  --animate-rise: rise var(--dur-move) var(--ease-out) both;
  --animate-focus-in: focus-in var(--dur-focus) var(--ease-out) both;
  --animate-pop-in: pop-in var(--dur-pop) var(--ease-pop) both;
  --animate-breathe: breathe 1600ms var(--ease-in-out) infinite;
  --animate-pulse-ring: pulse-ring 2000ms var(--ease-out) infinite;

  @keyframes rise { from { opacity: 0; translate: 0 8px; } }
  @keyframes focus-in { from { opacity: 0; translate: 0 8px; filter: blur(4px); } }
  @keyframes pop-in { from { opacity: 0; translate: 0 22px; scale: 0.92; } }
  @keyframes breathe { 50% { opacity: 0.55; } }
  @keyframes pulse-ring { from { scale: 1; opacity: 0.5; } to { scale: 1.6; opacity: 0; } }
}
```

There is no `--duration-*` namespace in Tailwind 4: write `duration-(--dur-fast)` or a plain `duration-200`. `ease-out`, `ease-in`, `ease-in-out` and `ease-pop` are utilities and now carry Dalilak's curves. Stagger a CSS animation with `[animation-delay:80ms]` (`delay-*` only delays transitions).

Motion side, in `src/lib/motion.ts` (type-checked):

```ts
import { stagger, type Transition, type Variants } from "motion/react";

export const INLINE_END = -1; // Arabic only: inline-end is the physical LEFT, so "toward inline-end" is negative x.

export const ease = {
  out: [0.22, 1, 0.36, 1], in: [0.4, 0, 1, 1], inOut: [0.65, 0, 0.35, 1], pop: [0.34, 1.32, 0.64, 1],
} as const;

export const dur = { exit: 0.15, fast: 0.2, page: 0.26, move: 0.42, pop: 0.44, focus: 0.56, draw: 0.9 } as const;

export const spring = {
  snappy: { type: "spring", visualDuration: 0.2, bounce: 0 },     // toggles, pressed and selected states
  smooth: { type: "spring", visualDuration: 0.3, bounce: 0 },     // the app default (MotionConfig); no overshoot
  gentle: { type: "spring", visualDuration: 0.35, bounce: 0.15 }, // anything that travels or resizes: layout, layoutId, reorder
  pop:    { type: "spring", visualDuration: 0.4, bounce: 0.3 },   // an earned thing landing (about 5% overshoot)
  cheer:  { type: "spring", visualDuration: 0.45, bounce: 0.4 },  // the one centrepiece of a big moment: level number, trophy (about 10%)
} as const satisfies Record<string, Transition>;

export const tween = {
  exit:  { duration: dur.exit, ease: ease.in },
  fast:  { duration: dur.fast, ease: ease.out },
  enter: { duration: dur.page, ease: ease.out },
  move:  { duration: dur.move, ease: ease.out },
  focus: { duration: dur.focus, ease: ease.out },
  draw:  { duration: dur.draw, ease: ease.inOut },
} as const satisfies Record<string, Transition>;

export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: tween.move },
  exit: { opacity: 0, y: -4, transition: tween.exit },
};
export const focusIn: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: tween.focus },
  exit: { opacity: 0, transition: tween.exit },
};
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { default: spring.pop, opacity: tween.fast } },
  exit: { opacity: 0, scale: 0.9, transition: tween.exit },
};
export const group = (step = 0.08, startDelay = 0): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: stagger(step, { startDelay }) } },
});
```

Three traps the tokens exist to prevent (measured in `docs/research/motion-and-game-ux.md` 1.5): a spring written as `visualDuration` without `bounce` silently becomes a 1.1 s wobble; an untuned `animate={{ y: 0 }}` overshoots 12%; a spring used as an exit makes whatever waits for it feel late. **Never write a transition inline. Pick a token.**

A variant's own `transition` wins over the component's `transition` prop. To delay a preset, use `group(step, startDelay)` on the parent, or write explicit `initial`/`animate` with `{ ...tween.move, delay }`.

### 1.3 What enters how, what exits how

| Thing | Enters | Exits |
|---|---|---|
| Page | rise 6 px, 260 ms (`.page`, CSS) | fades and lifts 4 px in 120 ms, before the navigation starts |
| Sections and cards on a page | with the page. At most **one** staggered group per page (its main trio or hero), `rise` | with the page |
| A phase inside one route (`/welcome` phases, show scenes, tab panels) | `rise`, after the old one has left (`AnimatePresence mode="wait"`) | `rise.exit`, 150 ms |
| «دليل»'s reply blocks, analysis results, the reveal | `focusIn`, 80 ms apart | fade 150 ms |
| The user's sent message | pop from the send-button corner, 440 ms | stays |
| Chip, tag, star, badge, nudge | `popIn` | fade and `scale 0.9`, 150 ms |
| Sheet or dialog | rises 16 px and fades in 200 ms; the scrim (flat `black/30`) fades in 200 ms | the same path back, 150 ms, ease-in |
| Advisor panel | 16 px from the inline-end edge plus fade, 200 ms; its glyph travels in from the launcher | 150 ms |
| Popover, menu, tooltip | `scale 0.96` plus fade from the anchor's origin, 150 ms | 100 ms |
| Toast | drops 8 px and fades in, 200 ms | fade 150 ms |
| A status text, a small number, a state label | roll | roll |
| A line, ring or check | draws | never un-draws: it fades, or stays |
| A row joining a list | fade 260 ms while its neighbours make room (`layout="position"`, `spring.gentle`) | fade 150 ms, taken out of flow (`popLayout`) |

### 1.4 Stagger

- 80 ms between blocks, 60 ms between chips or star pips, 50 ms between words (headlines only, at most about 12 words).
- **A stagger never lasts longer than 480 ms in total:** `group(Math.min(0.08, 0.48 / n))`. A list of 20 jobs does not stagger at all: it arrives with the page.
- Stagger follows DOM order, so a row staggers right to left in Arabic with no extra work.
- Only one staggered group plays at a time. Exits never stagger.

### 1.5 The route transition

**Old page out first (120 ms fade, 4 px up), then the new page rises 6 px and fades in over 260 ms.** Two pages are never visible together, there is no dimming and no shadow. The shell (navigation, top bar, advisor panel, launcher, toasts) does not move.

```css
/* globals.css */
@layer components {
  .page { animation: page-in var(--dur-page) var(--ease-out) both; }
  html[data-leaving] .page {
    animation: none; opacity: 0; translate: 0 -4px;
    transition: opacity 120ms var(--ease-in), translate 120ms var(--ease-in);
  }
}
@keyframes page-in { from { opacity: 0; translate: 0 6px; } }
```

```tsx
// src/components/motion/page-transition.tsx  ("use client", type-checked)
export function useGo() {
  const router = useRouter();
  return useCallback((href: string) => {
    const root = document.documentElement;
    const samePage = new URL(href, window.location.href).pathname === window.location.pathname;
    if (samePage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }
    root.dataset.leaving = "1";                                    // CSS fades the current .page out
    window.setTimeout(() => {
      router.push(href);
      window.setTimeout(() => delete root.dataset.leaving, 800);   // safety net if the new page never mounts
    }, 120);
  }, [router]);
}

export function NavLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const go = useGo();
  return (
    <Link href={href} className={className}
      onNavigate={(event) => { event.preventDefault(); go(href); }}>  {/* fires only for in-app navigations */}
      {children}
    </Link>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  useEffect(() => { delete document.documentElement.dataset.leaving; }, []);  // the new page mounted: play page-in
  return <div className="page">{children}</div>;
}
```

Rules:

- `PageTransition` is the outermost element of **every `page.tsx`**. A `template.tsx` in the shell is not enough: it does not remount between `/jobs` and `/jobs/[id]` (Next's own template doc: a template remounts only when the segment at its own level changes).
- Every in-app navigation goes through `NavLink` or `go()`: navigation items, cards, buttons, and the advisor's `navigate` event. A stray `<Link>` still works, it only skips the 120 ms leave. That is the designed failure mode: if anything about the leave misbehaves, delete the `html[data-leaving]` rule and the product keeps the enter-only transition he already approved.
- A change of filters, tabs or search writes the URL with `router.replace(url, { scroll: false })`, **not** `go()`. The page does not transition; the list reorders in place.
- No `loading.tsx` anywhere (screens are local and render at once; a skeleton would add a second transition).
- Inside one route use `AnimatePresence mode="wait"` with `rise`: onboarding to reveal to result, tab panels, show scenes.

### 1.6 Reduced motion and still frames

One provider at the root (type-checked). Motion ignores the OS setting unless told:

```tsx
export function MotionProvider({ children, still }: { children: ReactNode; still: boolean }) {
  return <MotionConfig reducedMotion="user" skipAnimations={still} transition={spring.smooth}>{children}</MotionConfig>;
}
```

and one CSS block for everything Motion cannot reach (keyframes, transitions, Base UI popups):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
    transition-duration: 1ms !important; scroll-behavior: auto !important;
  }
}
```

What that gives, and what builders must add by hand:

- With `reducedMotion="user"` Motion makes transforms and layout animations instant and keeps opacity, colour, blur and `pathLength`. So fades and line drawing survive, travel does not. That is the form the spec asks for ("the state changes without travel").
- **Imperative `animate(motionValue, …)` is outside `MotionConfig`.** `NumberTicker`, `Ring` and `HereMarker` must read one shared `useInstant()` flag (reduced motion OR `still`) and call `mv.jump(value)` instead of animating.
- The shows shorten exactly as the spec says: path reveal plays steps 1, 4 and 6 at 0.7 s each; the CV analysis plays `read` and `done` in about 1.5 s. `useShow` takes the shortened step list.
- All five loops stop. The showcase shows its six end states as a still composition. `Burst` renders nothing.
- `still` comes from `?still=1`, read in an effect, so QA can screenshot settled screens; `npm run shot -- --reduced` shows the reduced form.
- Never branch **markup** on `useReducedMotion()` in a component that is server-rendered (it is `null` on the server): branch animation values only.

### 1.7 The hard "never" list

**Look (his rejected list, plus what leads to it)**

- No tinted gradient or glow washes on cards, headers or backgrounds. No coloured or glowing shadows. No `backdrop-blur`, no glass.
- No sparkle icons, no orb or blob as the "AI" mark, no purple-gradient AI look, no emoji as icons, no stock icon pack.
- No bouncing or pulsing dots, anywhere. Waiting is «دليل»'s glyph plus a rolling status line.
- No gradient text, border beams, shimmer on buttons, spotlight or cursor-follow effects, tilt, magnetic buttons.
- No animated backgrounds (aurora, beams, particles, flickering grids, moving paths).

**Motion**

- No heavy spring page pushes, no dimming of the old page, no cross-fade with two pages half visible.
- No per-character animation of Arabic text, ever (letters disconnect). Words, lines or whole blocks only.
- No typewriter for «دليل»'s answers. No animation per streamed token.
- No number that swaps without rolling or counting. No Arabic-Indic digits: one `formatNumber` helper with `"en-US"`, never a bare `toLocaleString()`.
- No loop outside these five: the showcase's turn-taking, the current-stage pulse ring, «دليل»'s glyph with its status shimmer, the running arc of a `StatusMark`, the caret while «دليل» types.
- No confetti except the one `Burst` on the match beat of the course celebration. No second celebration overlay on top of a first.
- No motion that blocks input longer than the duration the spec states for it. Buttons under a show are live from its first beat.
- No hover-only affordance (hover does not exist on a phone).

**Engineering**

- Never import from `framer-motion`. Never `exitBeforeEnter`, `staggerChildren`, `useAnimation`, `whilePress` (STACK and motion notes list the replacements).
- Never a Tailwind `transition-*` class on a `motion.*` element. Never `transition-all`.
- Never animate `width`, `height`, `top`, `left`, `box-shadow`. Use `layout`, transforms, and a pre-drawn shadow layer whose opacity fades.
- Never a spring as an exit. Never `visualDuration` without `bounce`.
- Never `layoutId` across a route change. Never `AnimatePresence` around a layout's `children`.
- Never treat `x`, `originX`, `rotate` as logical: they are physical. Use `INLINE_END`.
- Never `Math.random()` or `Date.now()` in render for an animation value. Never decide anything on saved state before the store has hydrated.
- Never `layout` on every chat bubble or on hundreds of rows. Never blur larger than 4 px, or on an area larger than a card.

---

## 2. Shared building blocks (build once, in this order)

Suggested homes: tokens in `src/lib/motion.ts`; blocks in `src/components/motion/`; chat pieces in `src/components/chat/`. The lead may rename folders; **the export names are the contract.** "tsc" in the last column means a compiled sketch is in `artifacts/playbook-scratch/sketches.tsx`.

| # | Block | Purpose | Technique | Adapts | tsc |
|---|---|---|---|---|---|
| 1 | `motion.ts` | The tokens of 1.2 | constants and `Variants` | reference values, Kokonut/SmoothUI vocabulary | yes |
| 2 | `MotionProvider`, `useInstant` | Reduced motion, still frames, app default spring | `MotionConfig reducedMotion="user" skipAnimations` | Kokonut v2 convention | yes |
| 3 | `PageTransition`, `NavLink`, `useGo` | The route transition (1.5) | CSS keyframe on mount, `data-leaving` on `<html>`, `Link onNavigate` | the reference assistant route change | yes |
| 4 | `FocusInGroup` | "Blurs into focus", block by block | parent `group(0.08)`, children `focusIn` | Magic UI blur-fade, the reference assistant answer | yes |
| 5 | `WordsIn` | A headline arriving word by word | `Intl.Segmenter("ar", word)`, `inline-block whitespace-pre` spans, real sentence once in `sr-only` | Motion Primitives text-effect, prompt-kit | yes |
| 6 | `Roll` | Any value replacing another in place: status line, step counter, level, streak, rank, state label | keyed child in `AnimatePresence mode="popLayout"`, `y ±100%` and 2 px blur, clipped line | the reference assistant rolling status, Motion Primitives text-loop | yes |
| 7 | `RollingStatus` | The one "working" line | `Roll` + `.shimmer-text` + elapsed seconds after 4 s | the reference assistant status line, the reference demo shimmer, React Bits ThoughtLine | yes |
| 8 | `.shimmer-text` (CSS) | Light passing over a label | two backgrounds clipped to text, one hue two lightness steps, travelling right to left | Motion Primitives text-shimmer | css |
| 9 | `DaleelGlyph` | «دليل»'s living mark | one small SVG with per-part variants; states `idle`, `listening`, `thinking`, `working`, `done`; a 2.4 s loop in step with the shimmer; settles into the still brand glyph when the first words arrive | the reference demo living glyph (own shape), Animate UI per-part icon pattern | no |
| 10 | `StatusMark` | pending / running / done / failed, one mark | 24 px SVG: dashed ring, a spinning arc, a check drawn with `pathLength` in 240 ms after a 120 ms delay | React Bits Micro StatusMark, Kokonut drawn check | no |
| 11 | `SentBubble` | The sent message pops from the composer | `y 22, scale 0.92`, 440 ms `ease.pop`, origin at the send-button corner | the reference assistant send transition | yes |
| 12 | `NumberTicker` | Big numbers count (XP, gaps, totals) | a motion value animated with `animate()`, rendered as a motion child (no re-render), `dir="ltr"`, `tabular-nums`, final value in the DOM and in `data-value` | Magic UI number-ticker | yes |
| 13 | `Ring` | Match ring, level ring, gain preview | `motion.circle` with `pathLength` and the centre number, both from one motion value; clockwise from 12 o'clock, never mirrored | Magic UI circular progress | yes |
| 14 | `Edge` | One connector of the roadmap or the tree | two layers: a dashed muted track, a solid `motion.path` that draws | SmoothUI svg-draw, Magic UI beam geometry (gradient removed) | yes |
| 15 | `HereMarker` | The «أنت هنا» marker rides the path | a progress motion value sampled with `getPointAtLength` into `x`/`y` of an HTML element | SmoothUI marker | yes |
| 16 | `useShow` | The director of every show | step index in state; `Promise.all([dwell, realWork])`; cancellable | Aceternity multi-step loader (its timing idea only) | yes |
| 17 | `Highlight` (`.evidence`) | The evidence marker in the CV | `background-size 0 to 100%` on an inline span, from the right, `box-decoration-break: clone` | the reference demo reading show | css |
| 18 | `SkillTag` + `LayoutGroup` | A tag pops out of its sentence and flies to the tray | `popIn`, then the same `layoutId` rendered in the tray | Aceternity upload morph idea | yes |
| 19 | `useTypeOn` | «دليل» fills a field; the sample CV writes itself | reveal graphemes, words or lines of a string inside a controlled field on a timer | "fields type themselves" (TEAM-BRIEF 5) | yes |
| 20 | `Composer` | Pill that opens into a card; Send and Stop on one button | `layout` on the form with `borderRadius` in `style`; `field-sizing: content`; IME guard; two stacked faces that cross with blur | the reference demo composer, cult/ui morph-surface, Kokonut ai-prompt | yes |
| 21 | `ChatThread` | Transcript that follows the newest message only while pinned | `role="log"`, `content-visibility: auto` per message, pinned flag and `ResizeObserver` | shadcn message-scroller, prompt-kit | no |
| 22 | `AdvisorPanel`, `AdvisorLauncher` | The side-panel opening | Base UI `Dialog` (non-modal on desktop), popup composed with `motion.div`, glyph shared by `layoutId` | the reference demo panel | yes |
| 23 | `Sheet` | Every other dialog: stage sheet, skill panel, apply sheet, avatar picker, «المزيد», level-up, daily reward | Base UI `Dialog` + `Dialog.Viewport`; CSS transitions on `data-starting-style` / `data-ending-style`; bottom sheet on phones, centred on desktop | Base UI handbook | yes |
| 24 | `FlyToken` | A token is consumed by its target (XP to the chip, a star to its skill) | measure two rects at the moment of the event, fly one fixed element, then tell the target to react | Trophy/DHxWhy "the reward lands" idea | yes |
| 25 | `ReorderList` | Rows glide to a new order (jobs, courses, leaderboard) | stable keys, `layout="position"`, `AnimatePresence mode="popLayout"` | Magic UI animated-list | yes |
| 26 | `PillTabs` | The sliding selection pill (tabs, filters, navigation) | one `motion.span` with `layoutId` inside a `LayoutGroup` keyed by `useId()` | Motion Primitives animated-background | yes |
| 27 | `useSeen` | "On arrival" replays: animate from what the user last saw to what is true now, once | read the remembered value at mount, commit the new one after the replay | Duolingo-style rank replay (mechanism only) | yes |
| 28 | `useClimb`, `Podium` | Leaderboard: the row climbs, the podium rises | render the old order first, switch after 500 ms; `scaleY` from the baseline, third first | Trophy podium structure | yes |
| 29 | `Burst` | The one confetti moment | 28 flat chips as `motion.span`, three brand tokens, 900 ms, removed after | Kokonut particle-button scale, Magic UI origin idea | yes |
| 30 | `ShowcaseStage` | Sign-in showcase director | six real components in a fixed composition; one has the turn; caption rolls | Magic UI bento "live cell" idea | yes |
| 31 | `SweepRows` | `jobs-sweep` in the reveal | three rows of tiles on a one-shot linear translate | replaces Marquee | yes |
| 32 | `Collapse` (CSS) | Height that follows content, without measuring | `grid-template-rows: 0fr` to `1fr` transition, inner `min-h-0 overflow-clip` | React Bits ThoughtLine | css |
| 33 | `PressButton` | Tactile press, and a press «دليل» can perform | `active:scale-[0.97] active:transition-none`; the same style on `data-pressed` for a programmatic press | cult/ui pressed recipe (shadow kept neutral) | no |
| 34 | Toasts | XP and badge toasts | Base UI `Toast` (installed) with its CSS variables; one position | Sonner stack maths | no |

The lead's brief also named a MultiStepLoader, a Marquee and a card-to-page shared element. They are answered, not forgotten: the loader is `useShow` + `RollingStatus` (the spec gives each show one status line, not a step list); the Marquee is replaced by `ShowcaseStage` and `SweepRows`; card-to-page is a matched cut, not a morph (section 4 gives the reasons).

Core sketches used by many screens (all type-checked):

```tsx
// Roll: one line, old value up and out, new value up and in. dir = -1 rolls downward (a rank that got worse).
const rollVariants: Variants = {
  from: (dir: number) => ({ y: `${100 * dir}%`, opacity: 0, filter: "blur(2px)" }),
  rest: { y: "0%", opacity: 1, filter: "blur(0px)", transition: tween.move },
  to: (dir: number) => ({ y: `${-100 * dir}%`, opacity: 0, filter: "blur(2px)", transition: tween.move }),
};
export function Roll({ id, dir = 1, children }: { id: string | number; dir?: 1 | -1; children: ReactNode }) {
  return (
    <span className="relative inline-flex h-[1.75em] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span key={id} custom={dir} variants={rollVariants} initial="from" animate="rest" exit="to"
          className="inline-flex items-center whitespace-nowrap">
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
```

```tsx
// NumberTicker: the first paint shows the real value; later changes count from the old one.
export function NumberTicker({ value, format = formatNumber }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(value);
  const text = useTransform(() => format(Math.round(mv.get())));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: ease.out });   // useInstant(): mv.jump(value) instead
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span dir="ltr" data-value={value} className="inline-block tabular-nums">{text}</motion.span>;
}
```

```tsx
// Ring: arc and number are one value, so they can never disagree. `preview` shows a projected match (gain-preview).
export function Ring({ value, preview, size = 96 }: { value: number; preview?: number; size?: number }) {
  const mv = useMotionValue(value);
  const pathLength = useTransform(mv, (v) => v / 100);
  const opacity = useTransform(mv, (v) => (v > 0 ? 1 : 0));   // a zero-length round-capped dash still paints a dot
  const label = useTransform(() => `${Math.round(mv.get())}%`);
  const shown = preview ?? value;
  useEffect(() => { const c = animate(mv, shown, tween.draw); return () => c.stop(); }, [mv, shown]);
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} data-value={value}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-(--color-track)" />
        <motion.circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round"
          className="stroke-(--color-brand)" style={{ pathLength, opacity }} />
      </svg>
      <motion.span dir="ltr" className="tabular-nums">{label}</motion.span>
    </span>
  );
}
```

```tsx
// useShow: the director. Each step lasts at least `ms`, and as long as its real work (`until`), capped at 12 s.
export type ShowStep<Id extends string> = { id: Id; ms: number; until?: Promise<unknown> };
export function useShow<Id extends string>(steps: readonly ShowStep<Id>[], play: boolean, onDone: () => void) {
  const [index, setIndex] = useState(0);
  const finish = useEffectEvent(onDone);
  useEffect(() => {
    if (!play) return;
    let alive = true;
    void (async () => {
      for (const [i, step] of steps.entries()) {
        if (!alive) return;
        setIndex(i);
        await Promise.all([sleep(step.ms), Promise.race([step.until, sleep(12_000)])]);
      }
      if (alive) finish();
    })();
    return () => { alive = false; };                      // Strict Mode and «أوقف» both land here
  }, [play, steps]);
  return { index, id: steps[index]?.id };
}
```

```tsx
// useSeen: replay from the value the user last saw. `read`/`write` talk to a `seen` slice of the persisted store.
export function useSeen<T>(read: () => T | undefined, write: (value: T) => void, current: T, playMs = 1200) {
  const [from] = useState(() => read() ?? current);
  const commit = useEffectEvent(() => write(current));
  useEffect(() => {
    const timer = setTimeout(commit, playMs);             // remember only after the replay has been shown
    return () => clearTimeout(timer);
  }, [current, playMs]);
  return from;
}
```

Colour names in sketches (`--color-brand`, `--color-track`, `--color-surface`, `--color-surface-2`, `--color-fg`, `--color-fg-muted`, `--color-mark`) are **placeholders** until the design system names its tokens. `steps` passed to `useShow` must be a stable reference (a module constant or `useMemo`).

---

## 3. Screen by screen

Each screen: the pattern, why, the technique, and the pitfalls. Spec section numbers are in brackets.

### 3.1 Sign-in showcase [spec 3.1]

**Pattern.** `ShowcaseStage`: the six real product components sit in one fixed composition on the right half. A director gives each a 3.3 s turn (about 20 s for the loop). The component whose turn it is goes to full contrast and plays its one moment; the other five rest at 55%, still. One caption line rolls under the stage. On a phone the stage is a 240 px band that shows one piece at a time (`AnimatePresence mode="wait"`, `rise`).

**Why.** The spec asks for six real components taking turns, with a still composition under reduced motion; a fixed composition *is* that still. Real components cannot promise what the product does not do, and they are already built by the time this screen is. Only one cell animates at a time, so it costs almost nothing and reads as calm, not as a brochure reel. No sign-in on 21st.dev does this (research 21st-dev 3).

**Technique.**

```tsx
const TURN_MS = 3300;
export function ShowcaseStage({ pieces, captions }: { pieces: ((active: boolean) => ReactNode)[]; captions: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState(0);
  const onScreen = useInView(ref);
  const tabVisible = usePageInView();
  useEffect(() => {
    if (!onScreen || !tabVisible) return;                       // spec: the loop pauses when the tab is hidden
    const timer = setInterval(() => setTurn((t) => (t + 1) % pieces.length), TURN_MS);
    return () => clearInterval(timer);
  }, [onScreen, tabVisible, pieces.length]);
  return (
    <div ref={ref} aria-hidden data-testid="signin-showcase" className="grid grid-cols-6 gap-4">
      {pieces.map((piece, i) => (
        <motion.div key={i} className="col-span-3 rounded-2xl border p-4"
          animate={{ opacity: i === turn ? 1 : 0.55, scale: i === turn ? 1 : 0.98 }}
          transition={{ default: spring.gentle, opacity: tween.move }}>
          {piece(i === turn)}
        </motion.div>
      ))}
      <p data-testid="signin-showcase-piece" data-value={turn + 1} className="col-span-6">
        <Roll id={turn}>{captions[turn] ?? ""}</Roll>
      </p>
    </div>
  );
}
```

- Each piece is the app's own component with the fixed demo numbers and an `active` flag: `<Ring value={active ? 90 : 70} />`, the roadmap strip (`Edge` + `HereMarker`), the two skill cards (a star pip with `popIn`), the advisor exchange (`SentBubble`, then `FocusInGroup`), the XP line (`NumberTicker` + bar), the three-row leaderboard (`ReorderList`). A piece starts its moment about 400 ms after `active` turns true.
- When the loop wraps, the whole stage dips to opacity 0 and back once (150 ms out, 260 ms in) while every piece resets to its start state. Pieces do not rewind one by one.
- The grid spans and sizes are the designers' composition; the sketch shows the mechanism only.
- **Layout.** The form must be physically on the left. Keep the form first in the DOM and use `flex flex-col-reverse lg:flex-row-reverse` on the wrapper: in an RTL row, `row-reverse` lays out left to right, so the form lands on the left on desktop; on a phone `col-reverse` puts the showcase band on top while the form stays first for the keyboard and screen readers.
- **`signin-handoff`** is a matched cut, not a shared element (the two screens are two routes): on submit the page leaves with the normal 120 ms leave; on `/welcome` «دليل»'s first line arrives with `WordsIn` and the user's name is its first emphasised word. Same surface, same rhythm, so it reads as one gesture.

**Pitfalls.**

- RTL: do not put `dir="ltr"` on the two-column wrapper (`rtl:` utilities keep matching inside it; STACK-NOTES 2.4). Captions and text in both halves stay RTL.
- Phone: `min-h-dvh`, not `h-screen`. The band is a fixed `h-60` so the name field is visible without scrolling.
- Performance: no blur, no SVG animation except the active piece. The loop is one interval; pause it off screen and when the tab is hidden.
- Hydration: the showcase renders identically on server and client (turn 0, fixed props, no random, no date). The "returning accounts" chips depend on `localStorage`: render them after hydration inside a `Collapse` so the field slides down instead of jumping.

### 3.2 Onboarding conversation [spec 3.2, 4]

**Pattern.** A full-page chat built from the **same chat kit as the advisor panel** (`ChatThread`, `SentBubble`, `FocusInGroup`, `Composer`, `DaleelGlyph`), plus the chip row and the «ملفك يتكوّن» card. One question per turn; «دليل» thinks 350-600 ms (glyph only, no status line: the wait is too short to read one), then its acknowledgement and next question come into focus as two blocks.

**Why.** His words: the chatbot must answer at once and be good to you, and a sent bubble that pops and an answer that blurs into focus are the two things he has already approved. Using one kit for onboarding and advisor makes "the same character stays" visible.

| Spec moment | Block and verb |
|---|---|
| `greeting-arrival` | `DaleelGlyph` draws and settles; first line `WordsIn`, second line `focusIn` |
| `chip-to-bubble` | travel: chip and bubble share a `layoutId`; the other chips fade in 150 ms |
| `bubble-pop` | `SentBubble` |
| `answer-focus` | `FocusInGroup` (two blocks, 80 ms apart) |
| `slot-fill` | the slot's value arrives with `Roll`; a `StatusMark` check draws |
| `step-tick` | `Roll` on the number in «السؤال 2 من 6» |

**Technique.**

```tsx
// SentBubble: the approved pop. Origin is the bottom inline-end corner, where the send button is (physical left).
<motion.div
  initial={{ opacity: 0, y: 22, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: dur.pop, ease: ease.pop, opacity: tween.fast }}
  style={{ originX: 0, originY: 1 }} className="ms-auto w-fit max-w-[80%] rounded-2xl px-4 py-2" />
```

```tsx
// chip-to-bubble: the same layoutId on the tapped chip and on the bubble that replaces it.
<LayoutGroup id="welcome">
  <AnimatePresence>
    {pending && options.map((o) => (
      <motion.button key={o.id} layoutId={`answer-${question}-${o.id}`} style={{ borderRadius: 999 }}
        exit={{ opacity: 0, transition: tween.exit }} onClick={() => answer(o)}>
        <motion.span layout="position">{o.label}</motion.span>
      </motion.button>
    ))}
  </AnimatePresence>
  {/* in the thread, once answered: */}
  <motion.div layoutId={`answer-${question}-${picked.id}`} transition={{ layout: spring.gentle }} style={{ borderRadius: 18 }}>
    <motion.span layout="position">{picked.label}</motion.span>
  </motion.div>
</LayoutGroup>
```

This compiles (it is `ChipToBubble` in the scratch file) but, like every shared-layout flight here, it has not been seen in a browser. **Fallback, decided in advance:** if the travel looks wrong in the recording, drop the `layoutId` and let the answer be a plain `SentBubble`; the moment is then identical to a typed answer.

**Pitfalls.**

- RTL: which side the user's bubbles sit on is the design system's call; `originX` must be the physical side of the send button. Chips flow right to left by DOM order.
- Phone: the thread column is `h-dvh flex flex-col` with the composer in normal flow at the bottom (not `position: fixed`), so it stays above the keyboard. Chips wrap to at most three lines; with ten chips (the major question) they arrive as one group, no stagger.
- Performance: `layout` only on the picked chip and its bubble, never on every bubble. Text inside a morphing box gets `layout="position"` so it does not stretch.
- Hydration: a resumed thread is restored after the store hydrates and must not replay: `AnimatePresence initial={false}`. «تعديل» removes messages together (150 ms fade), no cascade.
- The page moves to the reveal by itself 1.2 s after the closing line: `AnimatePresence mode="wait"` between the three phases of `/welcome`.

### 3.3 Path-reveal sequence [spec 3.3, 4.7]

**Pattern.** A full-screen stage directed by `useShow` with the spec's six steps (7.8 s), one `RollingStatus` line under it, no progress bar, no skip. The stage is made of **layers that live across steps**, not six separate scenes: the same answer chips and the same job tiles persist and change, which is what makes it read as work being done on the user's own data.

**Why.** Labor illusion done honestly: every step shows the user's real answers, the real 20 jobs, the three chosen (research motion 2.0, 2.9). State-driven steps give QA the `reveal-step` value the spec asks for, survive Strict Mode, and make the reduced-motion form a shorter step list rather than a second implementation.

| Step | What moves | Blocks |
|---|---|---|
| `answers-gather` 1.2 s | the six answers travel from the slots of «ملفك يتكوّن» to a cluster in the centre | shared `layoutId` per answer (same route, so it is allowed) |
| `jobs-sweep` 1.5 s | twenty job tiles pass in three rows; the ones that fit stay at full contrast, the rest drop to 35% | `SweepRows` |
| `skills-map` 1.5 s | 38 dots in 7 groups appear; the groups light in turn (opacity only) | `group(0.07)` |
| `narrow-to-three` 1.3 s | seventeen tiles leave, three glide to a centre row | `ReorderList` mechanics (`layout` + `popLayout`) |
| `path-draw` 1.5 s | one line draws through eight nodes to the trophy; each node pops as the line reaches it | one `motion.path`, `popIn` with `delay = i * 0.15` |
| `reveal-landing` 0.8 s | the job title lands; the result layout forms around it | `WordsIn`, then `FocusInGroup`; the recommended tile shares a `layoutId` with the result card's frame |

**Technique.**

```tsx
const REVEAL_STEPS = [
  { id: "answers-gather", ms: 1200 }, { id: "jobs-sweep", ms: 1500 }, { id: "skills-map", ms: 1500 },
  { id: "narrow-to-three", ms: 1300 }, { id: "path-draw", ms: 1500 }, { id: "reveal-landing", ms: 800 },
] as const;                                              // module constant: a stable reference for useShow

const { index, id } = useShow(REVEAL_STEPS, true, onDone);
// layers, each present for the steps it belongs to:
<AnimatePresence>{index <= 1 && <AnswerCluster key="answers" />}</AnimatePresence>
<AnimatePresence>{index >= 1 && index <= 3 && <JobTiles key="tiles" narrowed={index === 3} />}</AnimatePresence>
<AnimatePresence>{index === 2 && <SkillsMap key="map" />}</AnimatePresence>
<span data-testid="reveal-step" data-value={index + 1}>{id && <RollingStatus label={lines[id]} seconds={null} />}</span>
```

```tsx
// SweepRows: a one-shot pass, direction-neutral, compositor-only.
<motion.div className="flex w-max gap-3" initial={{ x: 0 }} animate={{ x: (r % 2 === 0 ? 1 : -1) * 220 }}
  transition={{ duration: 1.5, ease: "linear" }}>
  {row.map((job) => (
    <motion.span key={job.id} animate={{ opacity: job.fits ? 1 : 0.35 }} transition={{ ...tween.move, delay: 0.5 }} />
  ))}
</motion.div>
```

**Pitfalls.**

- Do not put the whole stage in `AnimatePresence mode="wait"` keyed by step: each exit would add 150 ms and the 7.8 s total would drift. Layers overlap; only the status line rolls.
- Reduced motion: steps 1, 4 and 6 at 0.7 s each (pass that list to `useShow`).
- RTL: `SweepRows` moves rows in both physical directions, so nothing flips. The path is drawn top to bottom on a phone and uses the roadmap geometry of 3.4.
- Phone: three rows of tiles become four narrower ones; the stage is tall, so the cluster, the tiles and the path stack on the same centre line.
- Performance: tiles and dots are HTML with transform and opacity only. One SVG path. Blur only on the title's words.
- Hydration: the sequence is not resumable mid-way. Persist "played" when it finishes; on reload show the result directly with `initial={false}`. The global overlay queue is on hold while it runs.

### 3.4 Roadmap [spec 3.4]

**Pattern.** A computed vertical path: stages are DOM buttons in an `<ol>` (real focus, real Arabic labels), connectors are SVG in one overlay whose units are CSS pixels. Each connector is an `Edge` with two layers (dashed track, solid progress). One invisible "spine" path carries the «أنت هنا» marker. Exactly one stage is "current": it is larger, labelled «الآن», and carries the only loop on the page, a ring that scales and fades (`animate-pulse-ring` on a 1 px stroke, not a glow).

**Why.** The path answers "what do I do now" with one thing, and a line that extends when a course is finished is the clearest picture of real progress the product has (research motion 2.1, 3.2). Per-edge paths keep state on the edge and make "draw the next segment" one animation.

| Spec moment | Block and verb |
|---|---|
| `path-draw-in` | first visit: edges draw one after another (`delay = i * 0.21`), each stage pops as its edge arrives; later visits `initial={false}` |
| `catch-up` | stages the CV proved turn done 180 ms apart (check draws), `HereMarker` travels the spine, `Ring` counts 0 to 70 |
| `current-pulse` | `animate-pulse-ring` on a stroke-only ring behind the current stage |
| `ring-count` | `Ring` |
| `stage-sheet-open` | `Sheet` |
| `trophy-light` | the trophy's parts draw, then it lands with `spring.cheer` (no glow) |

**Technique.**

```tsx
// Layout in logical units, mirrored once. SVG is never mirrored by dir="rtl".
export function roadmapPoint(index: number, width: number, rowHeight = 112, top = 56): Pt {
  const amp = Math.min(width * 0.26, 120);
  const inline = Math.sin((index * Math.PI) / 2) * 0.6;          // centre, end side, centre, start side, ...
  return { x: width / 2 + INLINE_END * inline * amp, y: top + index * rowHeight };
}
export const sCurve = (a: Pt, b: Pt) => {
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
};

// Edge: an element that uses pathLength cannot have its own dash pattern, hence two paths.
export function Edge({ d, state, delay = 0 }: { d: string; state: "locked" | "done" | "drawing"; delay?: number }) {
  return (
    <>
      <path d={d} fill="none" strokeWidth={3} strokeLinecap="round" strokeDasharray="2 8" className="stroke-(--color-track)" />
      {state !== "locked" && (
        <motion.path d={d} fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-(--color-brand)"
          initial={state === "drawing" ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { ...tween.draw, delay }, opacity: { duration: 0.01, delay } }} />
      )}
    </>
  );
}
```

```tsx
// HereMarker: progress 0..1 along the hidden spine path, sampled into x/y of an HTML element.
const progress = useMotionValue(from ?? target);
const x = useMotionValue(0), y = useMotionValue(0);
const place = useCallback((p: number) => {
  const el = spine.current; if (!el) return;
  const point = el.getPointAtLength(p * el.getTotalLength());
  x.set(point.x); y.set(point.y);
}, [spine, x, y]);
useMotionValueEvent(progress, "change", place);
useEffect(() => {
  place(progress.get());
  const controls = animate(progress, target, { duration: Math.min(0.5 * Math.max(hops, 1), 2.4), ease: ease.inOut });
  return () => controls.stop();
}, [place, progress, target, hops]);
return <motion.div aria-hidden className="absolute left-0 top-0" style={{ x, y }} />;   // physical left on purpose
```

- Stages are placed with `position: absolute; left: x; top: y; translate: -50% -50%` (physical `left` is right here because `x` already contains the mirror). Labels use the same function, so nodes and labels cannot disagree.
- On mount, `currentStage.scrollIntoView({ block: "center" })` without animation. Show a «العودة لخطوتي» button when the current stage is out of view (`useInView`).

**Pitfalls.**

- RTL: direction enters the geometry in exactly one place (`INLINE_END`). Never `scaleX(-1)` a container that holds text. The opacity in `Edge`'s initial state is there because a zero-length round-capped stroke paints a dot.
- Phone: one column; `amp` shrinks with the width; labels take at most 45% of the width, two lines, `text-wrap: balance`. Tap targets at least 44 px. The stage sheet is a bottom `Sheet`.
- Performance: SVG path drawing runs on the main thread. Draw edges in sequence, never ten at once. The marker writes two motion values per frame; that is the whole cost.
- Hydration: the width is unknown on the server. Render the map only after the first measure (`ResizeObserver`), behind the hydrated gate, and re-measure after `document.fonts.ready` (the Arabic font changes label sizes). `path-draw-in` and `catch-up` play once: remember them with `useSeen`.

### 3.5 Skill tree [spec 3.5]

**Pattern.** CSS places the nodes, SVG draws the lines. Each field is a panel; inside a panel, skills sit in tiers by prerequisite depth on a 6-column grid (at most three nodes per tier); connectors are measured `Edge`s from the bottom of a prerequisite to the top of its dependent. Phone: one field at a time. Desktop: the seven panels in a grid; choosing a field keeps that panel at full contrast, scrolls it into view and dims the rest to 35%. No zoomable canvas.

**Why.** A CSS grid inside a `dir="rtl"` container mirrors itself for free, and measured coordinates are physical pixels, so nothing is flipped by hand (research motion 3.3). A pan-and-zoom canvas is a desktop pattern that fails at 390 px and adds gesture code nobody has time to test.

| Spec moment | Block and verb |
|---|---|
| `tree-grow` | first visit: per panel, tier by tier, nodes `popIn` and their incoming edges draw (400 ms); panels start 120 ms apart; only panels in view |
| `star-fill` | `useSeen`: the new pip lands with `spring.pop` |
| `node-unlock` | the incoming `Edge` draws, then the lock gives way to the skill icon (a keyed swap with 2 px blur), then the outline turns solid |
| `field-focus` | `PillTabs` for the selector; opacity dim on the other panels; on phones `AnimatePresence mode="wait"` between panels |

**Technique.**

```ts
// offset* ignores CSS transforms, so edges do not jump while nodes pop or slide. getBoundingClientRect would.
export function anchor(el: HTMLElement, root: HTMLElement, at: "top" | "bottom"): Pt {
  let x = el.offsetWidth / 2;
  let y = at === "top" ? 0 : el.offsetHeight;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft; y += n.offsetTop;
  }
  return { x, y };
}
// d = sCurve(anchor(prerequisiteEl, panel, "bottom"), anchor(dependentEl, panel, "top"))
```

Measure in `useLayoutEffect`; re-run on `ResizeObserver`, on `document.fonts.ready`, and when the field changes. Selecting a node highlights its prerequisite chain and dims everything else to 35%: that single interaction is what makes the graph readable.

**Pitfalls.**

- RTL: nothing to mirror. Bring the active field chip into view with `scrollIntoView({ inline: "center" })` (never `scrollLeft` arithmetic, it is negative in RTL). Latin skill names (SQL, Power BI) go in `<bdi>`.
- Phone: nodes 96-104 px wide with a 56 px icon tile, name on two lines. A prerequisite in another field is a chip on the node («تتطلب: …»), never a line across panels.
- Performance: draw `tree-grow` once (a `useSeen` flag), and only for mounted panels. Locked edges are plain dashed paths with no animation.
- Hydration: edges need a measured layout, so the first paint has nodes without lines and the lines then draw. That is the intended look, not a flash to hide.
- State is never colour alone: locked, available, earned and maxed differ in shape and icon too.

### 3.6 CV analysis show [spec 3.6, 6.3]

**Pattern.** The the reference demo reading show in Dalilak's own form, directed by `useShow` over the **real result**: the CV is on screen as a document, a line passes down it, each evidence sentence gets a marker stroke, a skill tag pops out of its sentence and flies to a tray, stars fill, three job rings fill, the result cards come into focus. The analysis promise is the `until` of the first step, so with a model the scan simply lasts until the answer arrives (12 s ceiling, then the local result).

**Why.** He asked for motion "when he analysis the cv" and named the reference demo. The show is honest because every highlighted sentence is real evidence and every tag is a skill actually found (spec P4). Tying the first step to the real work means the show neither outruns the model nor stalls behind it.

| Stage | What moves | Blocks |
|---|---|---|
| `read` 1.2 s | a 1 px line passes down the document | `ScanLine` |
| `extract` 1.6 s | per evidence sentence, 200 ms apart: marker draws (`phrase-highlight`), tag pops at the end of the sentence, then flies to the tray (`tag-pop`) | `.evidence[data-on]`, `SkillTag` |
| `evidence` 1.2 s | each tray tag shows its sentence beside it | `rise`, `group(Math.min(0.08, 0.48 / n))` |
| `level` 1.2 s | star pips land on each tag (`star-fill`) | `popIn`, 60 ms apart |
| `match` 1.2 s | job rings appear and fill; the best three stay | `Ring`, `ReorderList` |
| `done` 0.6 s | results layout forms (`results-rise`); the target ring counts 0 to 70 (`ring-count`) | `focusIn` with `y: 12`, 80 ms apart; `Ring` |

**Technique.**

```css
/* The marker: one flat colour drawn as a sized background. Grows from the right, wraps across lines. */
.evidence {
  background: linear-gradient(var(--color-mark), var(--color-mark)) no-repeat 100% 100% / 0% 38%;
  transition: background-size 600ms var(--ease-out);
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
.evidence[data-on] { background-size: 100% 38%; }
```

```tsx
// ScanLine: a full-size layer slides down; its bottom edge is the line. Transform only.
<motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={{ y: "-100%" }}
  animate={playing ? { y: "0%" } : { y: "-100%" }} transition={{ duration: 1.2, ease: "linear" }}>
  <div className="absolute inset-x-0 bottom-0 h-px bg-(--color-brand)" />
</motion.div>

// SkillTag: rendered inline after its sentence for ~350 ms (where="sentence"), then in the tray (where="tray").
<motion.span layoutId={`cv-tag-${id}`} variants={popIn} initial={where === "sentence" ? "hidden" : false} animate="show"
  transition={{ layout: spring.gentle }} style={{ borderRadius: 999 }} className="inline-flex items-center gap-1 px-3 py-1">
  <motion.span layout="position">{name}</motion.span>
</motion.span>
```

```ts
// useTypeOn: the sample CV writes itself by lines in under a second (sample-type-on).
export function useTypeOn(units: readonly string[], ms: number, play: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!play) return;
    setCount(0);
    const tick = Math.max(16, ms / Math.max(units.length, 1));
    const timer = setInterval(() => setCount((c) => Math.min(c + 1, units.length)), tick);
    return () => clearInterval(timer);
  }, [play, units, ms]);
  return { value: units.slice(0, count).join(""), done: count >= units.length };
}
```

- The document is the CV text split into plain and evidence segments from the analyser's result; the tag in its "sentence" phase is rendered inline right after its span, so it sits at the end of the sentence in reading order with no coordinates.
- `drop-accept`: the drop zone wakes when a file enters the **window** (the five `window` drag listeners with a depth counter in research component-libraries 9), shows three texts (idle, file over the window, file over the zone), and the zone's tile and the file chip share a `layoutId`. The paste area (or chip) and the document share one too, so upload flows into the show without a page change.
- Rejected files stay visible with the spec's sentence; they do not vanish.

**Pitfalls.**

- RTL: the marker grows from the right (`background-position: 100%`). Latin terms inside evidence lines need `<bdi>` or the punctuation jumps.
- Phone: the document fills the width, the tray is a wrapping row under it. The drop zone is a button, as the spec says.
- Performance: no blur during the show except the final `focusIn`. One tag in flight at a time. Memoise the document so it does not re-render per step.
- Hydration: saved results render with `initial={false}`; the show only ever starts from a click. The XP toast, level-up and badge toast are held until the results have settled (spec 3.6, 3.15).
- Reduced motion: `read` and `done` only, about 1.5 s.
- Typed text lives in the textarea's `value` (one text node), so Arabic joins correctly as it grows.

### 3.7 Jobs list and job detail [spec 3.7, 3.8]

**Pattern.** The list is a `ReorderList`: filter, search or a better match makes cards glide to their new places. Each card is one stretched `NavLink` with a `Ring`. The detail page arrives in the spec's order: header and ring, then the three gap blocks (have, missing, courses) as the page's one staggered group. Card to page is a **matched cut**: the card presses, the page leaves, and the detail header shows the same ring at the same value, so the number carries the continuity.

**Why.** Reordering is the one place where `layout` earns its cost: it shows that ranking is computed from the user's skills. A cross-route card morph was considered and dropped (section 4).

| Spec moment | Block and verb |
|---|---|
| `list-reorder` | `ReorderList` |
| `ring-count` | `Ring` fed by `useSeen` (counts from the match the user last saw on this card) |
| `gap-settle` | `group(0.12)` with `rise` on the three blocks |
| `gain-preview` | `<Ring value={match} preview={hovered ? projected : undefined} />`; a tap toggles it on phones |
| `status-advance` (applications) | the track's dot moves by `layoutId`, the fill grows with `scaleX` from the start edge (`rtl:origin-right`), the note is a `Roll` |

**Technique.**

```tsx
export function ReorderList({ rows }: { rows: { id: string; me?: boolean; node: ReactNode }[] }) {
  return (
    <ol className="relative">                                   {/* popLayout needs a positioned parent */}
      <AnimatePresence mode="popLayout" initial={false}>
        {rows.map((row) => (
          <motion.li key={row.id} layout="position"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: tween.exit }}
            transition={{ layout: spring.gentle, opacity: tween.enter }}
            style={{ position: "relative", zIndex: row.me ? 1 : 0 }}>
            {row.node}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}
```

**Pitfalls.**

- RTL: «من 70% إلى 90%» in a compact display is three flex items (value, mirrored arrow icon, value), never a text arrow. Every number is `dir="ltr"` with `tabular-nums`.
- Phone: «قدّم الآن» is pinned with `position: sticky` above the tab bar, with safe-area padding. The gap blocks stack.
- Performance: `layout="position"` (not `layout`) so text does not stretch. Do not count all 20 rings on every visit: a ring animates only when `useSeen` says its value changed.
- Hydration: any component that calls `useSearchParams()` sits under `<Suspense>` or `next build` stops. `params` is a Promise (`use(params)`). Matches are computed after the store hydrates.
- Filters call `router.replace`, so typing in the search box never triggers the page transition.

### 3.8 «دليل» applies for you [spec 3.8, 7.4]

**Pattern.** «دليل» operates the **real apply sheet** in front of the user. The advisor's `apply` event starts a `useShow` script with the spec's six steps; the sheet opens empty, each field types itself with a small «دليل» mark that moves from field to field, the matching skills pop in, the note types by words, the send button is visibly pressed, the confirmation lands. The status line in the chat rolls in step.

**Why.** This is "he opens it for you, like in our demos" at its strongest, and the one place where typing is the right verb: it is «دليل»'s hands on the page. Running it as steps makes «أوقف» trivial and exact.

| Step (spec 7.4) | Technique |
|---|---|
| 1 open, 0.5 s | `go()` to the job if needed, then `Sheet` opens with empty fields (`sheet-open`) |
| 2 fields, 1.2 s | `self-typing`: `useTypeOn(graphemes(value), 400, …)` per field, one after another; the mark moves by `layoutId="daleel-mark"` |
| 3 skills, 0.7 s | chips `popIn`, 60 ms apart (`chips-pop`) |
| 4 note, 2.0 s | `useTypeOn(words(note), 2000, …)` |
| 5 send, 1.6 s | `PressButton` gets `data-pressed` for 180 ms (`submit-press`), then «جارٍ الإرسال…» |
| 6 confirmation, 1.2 s | a `StatusMark` check draws, the application number rolls in (`sent-mark`); the sheet closes itself |

**Technique.**

```ts
export const graphemes = (text: string) =>
  Array.from(new Intl.Segmenter("ar", { granularity: "grapheme" }).segment(text), (s) => s.segment);
export const words = (text: string) => Array.from(wordSegmenter.segment(text), (s) => s.segment);

const name = useTypeOn(nameUnits, 400, step === "fields");      // nameUnits = useMemo(() => graphemes(user.name), …)
// <input readOnly={filling} value={filling ? name.value : form.name} … />
```

- «أوقف» during steps 1-4 flips `play` to false: the effect cleanup stops the script, the fields keep what was written and become editable. After the press it cannot be stopped (spec).
- Phone (`sheet-to-pill`): the advisor sheet collapses to a pill «دليل يعمل…» and reopens with the reply. Pill and sheet share one empty background layer by `layoutId`; their contents fade separately so no text stretches.
- The reply comes into focus only after the confirmation has shown (`page-handoff` order: the site responds first, the words follow).

**Pitfalls.**

- Typed text is the `value` of a controlled, read-only field. Never spans per letter.
- Derive every tick from the step's duration (`ms / units.length`), so the script always lasts what the spec says.
- **Two dialogs are open at once on desktop** (the non-modal advisor panel and the modal apply sheet). The panel must have `disablePointerDismissal`, or a click in the sheet closes it. This combination was not run in a browser: test it first (section 5).
- The overlay queue is on hold for the whole script; the +40 XP toast appears after the sheet has closed.
- Reduced motion: fields fill at once, the press still shows, the confirmation appears.

### 3.9 Courses and the completion celebration [spec 3.10, 3.11]

**Pattern.** The catalogue is `PillTabs` plus a `ReorderList` of course cards. The course page's one loud moment is «أكمل الدورة»: the remaining lessons tick in a quick run, then **one overlay** plays the spec's beats in order on `useShow`, and each beat is the product's own numbers moving. The match beat is the peak: everything else dims, a large `Ring` climbs from the old value to the new one, and the single `Burst` fires from the ring's centre as it arrives.

**Why.** The idea file's principle is that the game reflects real progress, so the celebration is made of real values changing, in the order cause, effect, meaning: course, XP, star, match (research motion 2.8). Confetti is the full stop, not the sentence.

| Beat | ms | What moves |
|---|---|---|
| Course | 500 | title with `WordsIn`; a `StatusMark` check draws |
| XP | 800 | «+200 XP» pops; the total counts 220 to 420 (`NumberTicker`, `xp-count-up`) |
| Star | 600 | a star token flies to the skill's pip and lands with `spring.pop` (`FlyToken`, `star-award`) |
| Match | 1400 | 120 ms of stillness, then `Ring` 70 to 90 with its number (`match-rise`); `Burst` at the end (`confetti-burst`) |
| Level | 700 | the level number lands with `spring.cheer`; the title is a `Roll` from the old one (`level-up-beat`) |
| Badges | 500 | badges `popIn`, 60 ms apart (`badge-drop`) |
| Rank | 500 | a five-row `ReorderList` in which the user's row passes the rows it overtook (`rank-climb`) |

Beats that do not apply are left out of the step list; the total is about 5 s.

**Technique.**

```tsx
// lessons-cascade: tick the remaining lessons 90 ms apart, then open the overlay.
// Celebration: the store is updated FIRST; the overlay replays from the values captured at the click.
const { index } = useShow(beats, open, () => setSettled(true));
// each beat row: animate={i === index ? "now" : i < index ? "past" : "hidden"}; "past" rests at 60% opacity

export function Burst({ colors, count = 28 }: { colors: readonly string[]; count?: number }) {
  const reduce = useReducedMotionConfig();
  const [bits] = useState(() => Array.from({ length: count }, (_, i) => {   // mounted from an event, never server-rendered
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const reach = 60 + Math.random() * 80;
    return { id: i, dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach - 30,
             spin: (Math.random() - 0.5) * 540, color: colors[i % colors.length] ?? "currentColor", wide: i % 3 === 0 };
  }));
  if (reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {bits.map((bit) => (
        <motion.span key={bit.id} className="absolute block rounded-[1px]"
          style={{ width: bit.wide ? 8 : 5, height: bit.wide ? 3 : 5, backgroundColor: bit.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: bit.dx, y: [0, bit.dy, bit.dy + 70], opacity: [1, 1, 0], rotate: bit.spin }}
          transition={{ duration: 0.9, ease: ease.out,
            y: { duration: 0.9, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] },
            opacity: { duration: 0.9, times: [0, 0.7, 1] } }} />
      ))}
    </span>
  );
}
```

- `lesson-tick`: the lesson's box gets a drawn check (240 ms) and its title drops to 65% contrast. `celebration-open`: the flat scrim fades in over 200 ms and the first beat rises; nothing slides over the page.
- `Burst` gets two or three brand tokens, never a rainbow. Unmount it one second after it fires. Fire it once per achievement: store the celebrated id.
- The buttons are live from the first beat. A press before the end jumps to the settled state (every value shown at its final number), then acts.
- Catalogue: a label that changed since the last visit (`card-state-change`) is a `Roll` fed by `useSeen`; the collapsed «أنجزتها (6)» group opens with `Collapse`.

**Pitfalls.**

- RTL: the star flight uses viewport pixels (physical). Rank arrows are not mirrored. The "from, arrow, to" pair is three flex items.
- Phone: the overlay is full screen with the beats stacked and the two buttons pinned at the bottom.
- Performance: only the current beat animates. The overlay surface is solid with a flat scrim; no blur behind it.
- Hydration and safety: state changes before the overlay opens, so a reload mid-celebration loses nothing. The overlay is mounted from a click only.
- The global queue is absorbed: the celebration shows the XP, level, badge and rank news of its own course, and nothing else pops over it.

### 3.10 Leaderboard [spec 3.12]

**Pattern.** A podium that rises, then the full list as a `ReorderList`. If the user's rank improved since this tab was last seen, the list first renders in the **old** order, then switches to the new one, so the user's row visibly passes the rows it overtook. Tabs re-sort the same 25 rows in place.

**Why.** The replay is the whole point of this page in a demo: XP earned elsewhere becomes a visible climb (research motion 2.6). It costs one prop (`layout="position"`) and one remembered value.

| Spec moment | Block and verb |
|---|---|
| `podium-rise` | `Podium`: blocks grow from the baseline, third first, the winner last; avatars `popIn` after |
| `row-climb` | `useClimb(orderLastSeen, orderNow)` into `ReorderList`; the rank number is a `Roll`; a «صعدت 6 مراكز» chip pops and stays |
| `tab-reorder` | `PillTabs`, the same list re-sorted (no `mode="wait"`: rows glide) |
| pinned bar | `useInView` on the user's row; the bar rises 16 px and fades in |

**Technique.**

```tsx
export function useClimb<T>(before: T, after: T, delayMs = 500): T {
  const [shown, setShown] = useState(before);           // first paint: the order the user last saw
  useEffect(() => {
    const timer = setTimeout(() => setShown(after), delayMs);
    return () => clearTimeout(timer);
  }, [after, delayMs]);
  return shown;
}

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 128, 2: 96, 3: 80 };
// per place: delay = (3 - rank) * 0.08
<motion.div style={{ height: PODIUM_HEIGHT[rank], originY: 1 }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
  transition={{ ...tween.move, delay }} />
```

While it climbs, the user's row sits above its neighbours (`zIndex: 1`), scales to 1.02 and shows a neutral shadow by fading a pre-drawn shadow layer. The row is marked by a border and the «أنت» tag, never a glow.

**Pitfalls.**

- RTL: up and down arrows are not mirrored. DOM order of the podium is second, first, third; the row direction places them.
- Phone: the pinned bar sits above the tab bar. City and level drop to a second line.
- Performance: 25 rows with `layout="position"` is fine. If the list ever scrolls inside its own box, that box needs `layoutScroll`.
- Hydration: the last seen rank is per tab and comes from the store; decide nothing before hydration. Commit the new rank only after the climb has played (`useSeen`), or a quick visit would swallow the replay.

### 3.11 Profile and badges [spec 3.13]

**Pattern.** A quiet page. Three things move, each once, each only when something changed: a newly unlocked badge turns over, new XP rows arrive at the top of the history, and the avatar swaps everywhere at once when the picker saves.

| Spec moment | Block and verb |
|---|---|
| `avatar-swap` | the `Avatar` component itself is a keyed swap (`AnimatePresence mode="popLayout"`, `scale 0.9` and 2 px blur, 200 ms), so every place that shows it changes together |
| `badge-reveal` | one flip: `rotateY 180` to `0` in 600 ms on `ease.inOut` with `transformPerspective: 600`, the locked face hidden by `backface-visibility`; once, via `useSeen` |
| `history-roll` | new rows join a `ReorderList` at the top |
| avatar picker | `Sheet`; the selection ring is one `motion.span` with `layoutId` (as in `PillTabs`) |
| level bar | `scaleX` from the start edge (`rtl:origin-right`), `NumberTicker` beside it |

**Pitfalls.**

- RTL: progress bars grow from the right: `style={{ scaleX: p, originX: 1 }}` or `rtl:origin-right`. Base UI `Progress` already anchors at inline-start; give it `locale="en"`.
- Phone: badges three per row. Locked badges show their rule as text, since tooltips do not exist on touch.
- Performance: only badges unlocked since the last visit flip. Twelve flips at once would be a show nobody asked for.
- Hydration: dates and times («اليوم 21:14») are formatted in an effect with the fixed-locale helper, or server and browser will disagree.

### 3.12 Advisor panel and its opening [spec 3.14, 5]

**Pattern.** The panel is Dalilak's own form of the the reference demo opening, in the same register he approved (opacity plus a 16 px slide from the edge, 200 ms in, 150 ms out) with one signature of its own: **«دليل»'s glyph travels from the launcher into the panel header**. Three beats inside about 400 ms: the launcher fades while its glyph leaves; the panel arrives from the inline-end edge; header, thread and composer rise 60 ms apart. The thread is restored without replaying old messages.

Inside, everything is the approved chat grammar: the composer is a pill that springs open into a card; the sent bubble pops from it; while «دليل» works its glyph is alive beside a rolling, shimmering status line that names the real step; the reply comes into focus block by block; cards rise after the text; one round button is Send or Stop.

**Why.** He named this transition. The lead could not tell whether he meant the opening or the reading motion, so both are built: the opening here, the reading show as the CV analysis (3.6). The panel lives in the shell, outside `.page`, so when «دليل» opens a page the page changes beside a panel that does not move: the user watches the site respond to the chat.

| Spec moment | Block and verb |
|---|---|
| `panel-open` | `AdvisorPanel` + `AdvisorLauncher` |
| `composer-expand` | `Composer` (`layout`, `spring.gentle`) |
| `bubble-pop` | `SentBubble` |
| `thinking-glyph` | `DaleelGlyph` state `thinking` / `working`, settles to `done` on the first words |
| `status-roll` | `RollingStatus`; the elapsed seconds fade in after 4 s |
| `answer-focus`, `card-rise` | `FocusInGroup`; cards use `rise` with `y: 12` after the last text block |
| `send-stop-morph` | two stacked faces in `Composer` |
| `page-handoff` | status rolls to the tool's line, `go(href)`, and only when the new page has entered (about 400 ms) does the reply focus in |
| `sheet-to-pill` | phones: one background layer shared by `layoutId` (3.8) |

**Technique.**

```tsx
// The one Base UI popup that is animated by Motion: Motion owns the transform, so the shared glyph measures correctly.
export function AdvisorPanel({ open, onOpenChange, phone, children }:
  { open: boolean; onOpenChange: (open: boolean) => void; phone: boolean; children: ReactNode }) {
  const from = phone ? { opacity: 0, y: 24 } : { opacity: 0, x: 16 * INLINE_END };
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} modal={phone} disablePointerDismissal={!phone}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted>
            <Dialog.Popup data-testid="advisor-panel"
              className="fixed inset-0 flex flex-col bg-(--color-surface) lg:inset-y-2 lg:start-auto lg:end-2 lg:w-[420px] lg:rounded-xl lg:border"
              render={
                <motion.div layoutRoot initial={from}
                  animate={{ opacity: 1, x: 0, y: 0, transition: tween.fast }}
                  exit={{ ...from, transition: tween.exit }} />   /* the exit must animate opacity, or Base UI will not wait */
              }>
              <Dialog.Title className="sr-only">دليل</Dialog.Title>
              <motion.span layoutId="daleel-glyph" transition={{ layout: spring.gentle }} className="size-8" />
              {children}
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function AdvisorLauncher({ open, onOpen, label }: { open: boolean; onOpen: () => void; label: string }) {
  return (
    <AnimatePresence>
      {!open && (
        <motion.button data-testid="shell-advisor-launcher" onClick={onOpen} whileTap={{ scale: 0.97 }}
          exit={{ opacity: 0, transition: tween.exit }}
          className="fixed bottom-4 end-4 inline-flex items-center gap-2 rounded-full border px-4 py-2">
          <motion.span layoutId="daleel-glyph" transition={{ layout: spring.gentle }} className="size-6" />
          <span>{label}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
```

```tsx
// Composer: the pill opens into a card on focus; Send and Stop are two faces of one button.
const face = "absolute inset-0 grid place-items-center transition-[opacity,filter,scale,rotate] duration-200 ease-out";
<motion.form layout transition={{ layout: spring.gentle }} style={{ borderRadius: open ? 20 : 24 }}
  className={open ? "flex min-h-28 flex-col gap-2 border p-3" : "flex h-12 items-center gap-2 border px-4"}>
  <motion.textarea layout="position" rows={1} value={text}
    onFocus={() => setOpen(true)} onBlur={() => setOpen(text.length > 0)}
    onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
    }}
    className="max-h-40 w-full flex-1 resize-none bg-transparent outline-hidden [field-sizing:content]" />
  <motion.button layout="position" type={responding ? "button" : "submit"} onClick={responding ? onStop : undefined}
    disabled={!responding && !canSend} className="relative size-9 shrink-0 self-end rounded-full">
    <span aria-hidden className={`${face} ${responding ? "scale-50 -rotate-90 opacity-0 blur-[2px]" : ""}`}>{/* send */}</span>
    <span aria-hidden className={`${face} ${responding ? "" : "scale-50 rotate-90 opacity-0 blur-[2px]"}`}>{/* stop */}</span>
  </motion.button>
</motion.form>
```

```css
/* The status shimmer: one hue, two lightness steps, travelling right to left. Nothing is split, so Arabic is safe. */
.shimmer-text {
  color: transparent;
  background:
    linear-gradient(90deg, transparent calc(50% - 3em), var(--color-fg), transparent calc(50% + 3em)) 0% 0 / 250% 100% no-repeat,
    linear-gradient(var(--color-fg-muted), var(--color-fg-muted));
  -webkit-background-clip: text; background-clip: text;
  animation: shimmer var(--dur-shimmer) linear infinite;
}
@keyframes shimmer { to { background-position: 100% 0, 0 0; } }
```

- **How a reply appears, for every brain:** reveal **completed blocks** (a paragraph, then cards). With the local brain the reply is instant and is revealed block by block, 80 ms apart. With a model, hold the text until a paragraph is complete (replies are capped at 600 characters, and the status line covers the wait), then let that paragraph come into focus. Never animate per token and never typewrite.
- `DaleelGlyph`: the designers own the shape; the motion budget is at most two moving parts, one 2.4 s loop in step with the shimmer while `thinking` or `working`, and a settle into the still brand glyph on the first words. The states to draw: `idle`, `listening` (the user is typing), `thinking`, `working` (a tool is running), `done`.
- `ChatThread` (not compiled here; from research component-libraries 14): `role="log"`; each message wrapper has `[content-visibility:auto] [contain-intrinsic-size:auto_10rem]`; keep a `pinned` ref that is true while the reader is within 48 px of the bottom, and on a `ResizeObserver` of the content scroll to the end only if pinned. Treat `wheel` and `touchmove` as the reader's intent. Finished messages are memoised by id.
- The nudge bubble beside the launcher is a `popIn` from the launcher's corner and leaves after 8 s.
- `Ctrl+K` toggles the panel; `Esc` closes it; on open the composer takes focus (`initialFocus`), on close focus returns to the launcher.

**Fallback, decided in advance.** If the glyph's travel misbehaves (wrong start point on a scrolled page, a jump at the end), remove the two `layoutId`s and let the header glyph `popIn`. If the Motion-composed popup itself misbehaves, build the panel on `Sheet`'s CSS route with `ltr:… rtl:-translate-x-4` starting and ending styles (STACK-NOTES 4.3 has that exact class list, type-checked). Either way the opening stays in the approved register.

**Pitfalls.**

- RTL: the panel is on the inline-end side, which is the physical left; it enters from further left: `x: 16 * INLINE_END`. The send arrow is mirrored, check marks are not.
- Desktop: `modal={false}` **and** `disablePointerDismissal`, or the panel closes the moment «دليل» "opens a page for you" or the user clicks the page. The spec's line that the page "stays visible and usable beside it" is why focus is not trapped on desktop.
- Phone: a modal full-screen sheet that rises 24 px; the composer stays above the keyboard (flex column, `h-dvh`, no fixed positioning inside).
- Performance: no `layout` on bubbles. The fixed popup has `layoutRoot`; the thread's scroller needs `layoutScroll` if anything inside it uses `layout`. The shimmer is CSS; the glyph is the only loop.
- Hydration: the panel is closed on the first render. `phone` comes from `matchMedia` in an effect, never during render. The saved thread is restored after hydration with `initial={false}`.
- Honesty rules still apply to motion: the status line names the tool that is really running (spec 5.3), and cards are drawn by the app from tool results.

### 3.13 Shell and global overlays [spec 2.3-2.8, 3.15]

**Pattern.** One overlay queue, one toast position, and one rule for rewards: **the reward is seen landing in the total.** A toast's «+100 XP» does not just disappear: a token flies from it to the user chip, and when it arrives the chip's number counts up and its bar fills.

| Spec moment | Block and verb |
|---|---|
| `xp-fly`, `xp-chip-fill` | `FlyToken` from the toast to `shell-xp`; on arrival `NumberTicker` counts, the bar grows with `scaleX`, the chip answers with a `spring.snappy` scale to 1.04 and back |
| `level-reveal` | level-up card: the number lands with `spring.cheer`, the title is a `Roll` from the old one |
| `badge-unlock` | the badge's art is revealed over its locked silhouette by a `clipPath: inset(100% 0 0 0)` to `inset(0)` wipe (500 ms, `ease.inOut`), then one `spring.pop` |
| `daily-claim` | today's cell gets a drawn check, the amount flies to the chip, the streak number rolls |
| `streak-tick` | the streak icon's parts flicker once (`scaleY` keyframes about its base, 800 ms) |
| navigation | the active item's marker is a `PillTabs`-style `layoutId`; the next-step pill's label is a `Roll` when the step changes; a nav dot is a `popIn` |

**Technique.**

```tsx
export function flightBetween(from: Element, to: Element, node: ReactNode, id: number): Flight {
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  return { id, node, x: a.left, y: a.top,
           dx: b.left + b.width / 2 - (a.left + a.width / 2), dy: b.top + b.height / 2 - (a.top + a.height / 2) };
}
export function FlyToken({ flight, onArrive }: { flight: Flight; onArrive: () => void }) {
  return (
    <motion.span aria-hidden className="pointer-events-none fixed left-0 top-0 z-50"   // physical left: viewport pixels
      initial={{ x: flight.x, y: flight.y, scale: 1, opacity: 1 }}
      animate={{ x: flight.x + flight.dx, y: flight.y + flight.dy, scale: 0.6, opacity: [1, 1, 0] }}
      transition={{ duration: 0.6, ease: ease.inOut, opacity: { duration: 0.6, times: [0, 0.8, 1] } }}
      onAnimationComplete={onArrive}>
      {flight.node}
    </motion.span>
  );
}
```

```tsx
// Sheet: every dialog except the advisor panel. Bottom sheet on phones, centred on desktop, same motion.
<Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-black/30 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
    <Dialog.Viewport className="fixed inset-0 grid place-items-end lg:place-items-center">
      <Dialog.Popup className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-(--color-surface) p-5
        transition-[opacity,translate] duration-200 ease-out
        data-starting-style:translate-y-4 data-starting-style:opacity-0
        data-ending-style:translate-y-4 data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-in
        lg:w-[480px] lg:rounded-2xl">
        <Dialog.Title>{title}</Dialog.Title>
        {children}
      </Dialog.Popup>
    </Dialog.Viewport>
  </Dialog.Portal>
</Dialog.Root>
```

- **Toasts:** Base UI `Toast`, with the manager created at module level so the action dispatcher can raise one from outside React (STACK-NOTES 4.1, 4.3). **One position for the whole app: top centre, under the top bar**, on desktop and phone, so a toast is never under the advisor panel. Stack at most three with Base UI's `--toast-index` and `--toast-offset-y`. Enter: 8 px down and fade, 200 ms. XP toast 3.5 s, badge toast 5 s.
- **Queue:** one blocking overlay at a time (daily reward, then level-up); toasts wait while a show is running (the hold rule of spec 3.15). The motion side only needs one flag from the shows: `useShow` playing means hold.
- Popovers, menus and tooltips use the Base UI CSS route with `origin-(--transform-origin)`, `scale 0.96`, 150 ms in, 100 ms out. Anything a phone user must read is a `Popover`, never a `Tooltip`.

**Pitfalls.**

- RTL: `FlyToken` works in physical viewport pixels by design. Use `side="inline-end"` on Base UI positioners. A toast's swipe direction should be up.
- Phone: toasts sit under the top bar; level-up and daily reward are centred `Sheet`s.
- Performance: one `FlyToken` at a time; merged XP gains fly once with the sum.
- Hydration: whether the daily reward is due is date arithmetic: do it in an effect after the store has hydrated, with an explicit time zone. Portals take fonts and direction from `<html>`, so the font variable and `dir` must be set there.
- Accessibility: the toast viewport exists from first load with `aria-live`; announce a status once, not per change.

---

## 4. What we deliberately do not use, and why

| Not used | Why |
|---|---|
| React `<ViewTransition>` and Motion `AnimateView` for route changes | Nobody has run them in this app. The snapshots are painted above the whole document, so every fixed or sticky piece of the shell (top bar, tab bar, launcher, toasts, and above all the open advisor panel) would need its own pinned transition name or be covered for 380 ms, exactly while «دليل» is opening a page. They cannot be interrupted. The CSS route in 1.5 gives the same "old out first" read with none of that, and degrades to the transition he already approved. |
| A cross-route shared element (job card grows into the job page) | It needs the mechanism above. `layoutId` does not survive a route change in the App Router. Replaced by the matched cut of 3.7. **If the whole flow is green and time is left, this is the single stretch item**: `<ViewTransition name={"job-" + id} share="morph" default="none">` on both ends, with the root's default cross-fade switched off in CSS. Do not start it before QA has passed. |
| `AnimatePresence` around a layout's `children` | The layout receives the new page at once, so the "exiting" page re-renders with the new route's content. The known workaround imports a Next internal. |
| `LazyMotion` | The saving is invisible on localhost, and with the smaller feature set `layout` and `layoutId` silently do nothing. |
| New packages: `canvas-confetti`, `@number-flow/react`, `sonner`, `use-stick-to-bottom`, `react-use-measure`, `rough-notation`, `react-dropzone`, `vaul` | Each has a small in-house equivalent above (`Burst`, `NumberTicker`/`Roll`, Base UI Toast, the pinned-scroll sketch, `ResizeObserver`, `.evidence`, native drag events, `Sheet`). NumberFlow also lists RTL locales as unsupported. Fewer installs on a memory-starved laptop, fewer unknowns on stage. |
| Per-digit drum rollers (Sliding Number) | A flex row of digits reverses in RTL, the drums need measuring, and 9 to 0 rolls the wrong way without extra work. `Roll` on the whole number does the job for small values; `NumberTicker` for large ones. |
| Marquee, 3D marquee, hero parallax | The spec stages six real pieces in turn; an endless drift has no cause (P8). A horizontal marquee also breaks in RTL without a `dir="ltr"` island. `SweepRows` covers the one place tiles pass by. |
| The scrolling multi-step list and its full-screen blurred overlay | The spec gives each show one status line and a stage. A step list would compete with the stage, and `backdrop-blur` is on the rejected list. Its good idea (real stages with a minimum dwell) lives in `useShow`. |
| One long `useAnimate` timeline for a show | Untested in a browser, awkward under Strict Mode, opaque to QA. Steps in state give `data-value` hooks and a trivial reduced-motion form. `useAnimate` is fine inside one small scene. |
| Hold-to-confirm buttons | The spec's consent is a chip or a clear request. A hold gesture cannot be performed by «دليل» in front of the user, and it is unfamiliar on a stage. |
| Typing dots, typewriter answers, per-token fades | Rejected look (dots), and per-token animation is unbounded work on long answers. Blocks come into focus instead. |
| Per-character text effects, scramble, split-flap, text morph | Arabic letters join; isolated spans render as disconnected forms. |
| Dock magnification, tilt, magnetic buttons, spotlight and cursor effects | Pointer-only tricks with no phone equivalent, and no meaning in this product. |
| Animated or patterned backgrounds as motion (aurora, beams, particles, flickering grid, background paths) | Rejected look, and most run a frame loop forever. Any static pattern is the design system's call and must be one paint. |
| Glass (`backdrop-filter`), gradient text, border beams, shimmer on buttons, glow shadows | Rejected look. The shimmer exists once, on the status label, in one neutral hue. |
| Orb, blob or aurora as the "AI" mark | Rejected look. «دليل» has its own glyph with states. |
| Direction-aware tab pushes (300 px, both panels visible), 3D tab stacks | The cross-fade and the push he rejected. Tab panels use `mode="wait"` with `rise`; lists reorder in place. |
| Base UI `Drawer` (swipe to dismiss) | One dialog primitive (`Dialog`) for everything keeps behaviour identical on both widths. Swipe-to-dismiss is not needed for the walkthrough and was not tested. |
| Scroll-driven animation (`useScroll`, tracing beams, scroll-filled rails) | Progress in Dalilak comes from state (a course completed), not from scrolling. |
| A pan-and-zoom canvas for the skill tree | Fails at 390 px; see 3.5. |
| Skeletons and spinners | Screens are local and render at once (spec 3). The only waits are shows. |

---

## 5. Not verified, and what to look at first

Nothing here was run in a browser. In this order, the first builder to have a running page should record and look at:

1. **The route transition** (1.5) in the built app (`npm run demo`, not `next dev`): the 120 ms leave, the enter, no flash of the new page before `page-in`, and that `/jobs` to `/jobs/[id]` and back both animate.
2. **The advisor panel** (3.12): the Motion-composed Base UI popup opens and closes cleanly; the glyph travels correctly, including on a scrolled page; the panel stays open while the page behind it navigates.
3. **Two dialogs at once** (3.8): the non-modal advisor panel with the modal apply sheet over the page.
4. **`Roll` with real Arabic text**: the clipped line (`h-[1.75em] overflow-hidden`) must not cut descenders or diacritics; raise the height if it does.
5. **`chip-to-bubble`** (3.2) and **`SkillTag`** (3.6): the two `layoutId` flights between different containers.
6. **`Sheet`** on phone and desktop, and that it reverses cleanly when closed mid-open.
7. **The sign-in split** with `flex-col-reverse lg:flex-row-reverse`: form on the physical left at 1440, band on top at 390.
8. **`HereMarker`** staying on the line at 390 and 1440, and after the Arabic font loads.
9. **`[field-sizing:content]`** growing the composer in the browser used for the demo (Chromium does; if the demo browser does not, add the three-line layout-effect autosize from research 21st-dev 2.1).
10. **A full pass with `--reduced`** and with `?still=1`.

Also unchecked here, and noted where they appear: `StatusMark`, `DaleelGlyph`, `ChatThread`, `PressButton` and the toast stack have no compiled sketch in this file (their recipes are in the research files cited in the table of section 2); the phone keyboard behaviour of the composer on a real device; whether the viewport needs `interactiveWidget: "resizes-content"` for that.
