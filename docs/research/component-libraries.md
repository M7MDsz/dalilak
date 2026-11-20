# Component libraries: what to take for Dalilak

Researched 17-18 Nov 2026 by reading component source code. Written for the builders: every ADOPT and ADAPT entry names the source file and gives the technique in a form you can retype. Nothing here is a recommendation to install a library wholesale.

Verdicts:

- **ADOPT**: the motion or structure is worth taking nearly as written.
- **ADAPT**: the idea is good and the decoration is wrong. The entry says what to strip.
- **AVOID**: with the reason. Mostly the glow, gradient and sparkle looks that TEAM-BRIEF section 2 rejects.

## 0. What was actually read, and the limits

I read source files, not rendered demos. No animation in this document was watched running. Verdicts on motion come from the values in the code; verdicts on decoration come from the class names and colours in the code. Sketches marked "sketch" are my adaptations and have not been run or typechecked.

| Library | How it was read | Path pattern |
|---|---|---|
| Magic UI | GitHub raw, `magicuidesign/magicui` | `apps/www/registry/magicui/<name>.tsx`, registry JSON in `apps/www/public/r/<name>.json` |
| Aceternity UI | Registry JSON endpoint | `https://ui.aceternity.com/registry/<name>.json` (index of 321 items at `/registry/index.json`) |
| shadcn/ui | GitHub raw, `shadcn-ui/ui` | `apps/v4/registry/new-york-v4/ui/<name>.tsx`, blocks in `.../blocks/<name>/`, utilities in `packages/shadcn/src/tailwind.css` |
| Motion Primitives | GitHub raw, `ibelick/motion-primitives` | `components/core/<name>.tsx` |
| Animate UI | GitHub raw, `imskyleen/animate-ui` | v2 in `apps/v2/registry/...`, v1 in `apps/v1/apps/www/registry/...` |
| React Bits | GitHub raw, `DavidHDev/react-bits` | `src/ts-tailwind/<Category>/<Name>/<Name>.tsx` |
| Origin UI | GitHub raw, `origin-space/originui` | `apps/origin/registry/default/ui/` and `.../hooks/` |
| Cult UI | GitHub raw, `nolly-studio/cult-ui` | `apps/www/registry/default/ui/<name>.tsx` |
| Kokonut UI | GitHub raw, `kokonut-labs/kokonutui` | `components/kokonutui/<name>.tsx` |
| prompt-kit | GitHub raw, `ibelick/prompt-kit` | `components/prompt-kit/<name>.tsx` |
| AI Elements (Vercel) | GitHub raw, `vercel/ai-elements` | `packages/elements/src/<name>.tsx` (component list, and `shimmer.tsx` in full) |
| SmoothUI | GitHub raw, `educlopez/smoothui` | `packages/smoothui/components/<name>/index.tsx` (three files) |
| NumberFlow, canvas-confetti, Sonner | GitHub raw | props, README options, `src/styles.css` |
| Motion docs | `motion.dev/docs/react-animate-view` | `AnimateView` |
| This project's `node_modules` | local, read-only | `motion` 14.14.0, `@base-ui/react` 1.9.0 type declarations |

Could not open:

- **Aceternity, HTTP 401 (paid or gated):** `expandable-card-on-click`, `chat-conversation`, `paper-plane-send`, `animated-beam-path-illustration`, `speed-counter`. Nothing below relies on them.
- **21st.dev:** only the home page loaded as text. It describes itself as a community catalogue of React and Tailwind components, templates and themes. No individual component page was read, so 21st.dev contributes nothing specific here. Much of what it lists is published from the libraries above.
- **Kibo UI** (`haydenbleasel/kibo`) and **Dice UI** (`sadmann7/diceui`): component names only, no source.
- Section 16 lists every component judged by name alone.

## 1. Stack facts that decide what can be copied

Installed (`package.json`): `motion` 14.14.0, `react` 19.3.1, `next` 16.4.6, `@base-ui/react` 1.9.0, `tailwindcss` 4.3.5, `clsx`, `tailwind-merge`, `zustand`.

Not installed, and builders may not install. Almost every library component imports at least one of these, so nothing can be pasted unchanged:

| Missing import | Who uses it | Replacement |
|---|---|---|
| `lucide-react`, `@tabler/icons-react`, `@radix-ui/react-icons`, `@hugeicons/*` | nearly all | Dalilak's own icon set (team rule) |
| `class-variance-authority` | shadcn, Magic UI dock | a plain object map of class strings |
| `radix-ui` (`Slot`, `Direction`) | shadcn, Origin UI | Base UI `useRender` or just render the element |
| `react-use-measure` | Motion Primitives, Cult UI | a 10-line `ResizeObserver` hook, or `em`/`%` units that need no measuring |
| `react-dropzone` | Aceternity file upload | native drag events (section 9) |
| `canvas-confetti` | Magic UI confetti | ask the lead for the package, or a small canvas burst (section 15) |
| `@number-flow/react` | best number ticker | ask the lead, or the two zero-dependency tickers in section 6 |
| `use-stick-to-bottom`, `@shadcn/react` | prompt-kit, shadcn chat scroller | the scroll sketch in section 14 |
| `vaul`, `sonner` | Cult UI drawer, toasts | Base UI already ships `drawer` and `toast` (below) |
| `rough-notation` | Magic UI highlighter | CSS `background-size` highlight (section 11) |

Two things already installed that the libraries re-implement:

- **Base UI 1.9.0** has `drawer`, `toast`, `tabs`, `dialog`, `popover`, `progress`, `meter`, `scroll-area`, `direction-provider`. Its parts expose `data-starting-style` and `data-ending-style` for CSS enter and exit transitions, and CSS variables for the hard cases: `--active-tab-left`, `--active-tab-width` (also `-right`, `-top`, `-bottom`, `-height`) on the tabs indicator; `data-activation-direction` on tab panels; `--toast-index`, `--toast-offset-y`, `--toast-height`, `--toast-swipe-movement-x/y` on toasts; `--drawer-swipe-movement-y`, `--drawer-snap-point-offset`, `--drawer-height` on the drawer. Names confirmed in the installed `.d.ts` files.
- **`AnimateView`** is in the installed Motion: `import { AnimateView } from "motion/react-animate-view"`. The Motion docs say it needs React and React DOM 19.3 or later, which this project has. Details in section 13.

## 2. Three rules for every borrowed component

### 2.1 Arabic and RTL

1. **Never split Arabic into per-character spans.** Arabic letters join; each letter in its own `inline-block` renders in its isolated form and the word falls apart. This rules out, for Arabic strings: Magic UI `text-animate` with `by="character"`, Motion Primitives `text-effect` with `per="char"`, `text-morph`, `text-scramble`, React Bits `SplitText` by character, Kokonut `ai-text-loading` (a per-letter wave). Animate Arabic by **word or line**. Latin strings and digits can still be animated per character.
2. **Split words with `Intl.Segmenter`**, as prompt-kit's `response-stream.tsx` does, with a whitespace fallback:
   ```ts
   const seg = new Intl.Segmenter("ar", { granularity: "word" });
   const parts = Array.from(seg.segment(text), (s) => s.segment); // words and the spaces between them
   ```
3. **A flex row of digits reverses in RTL.** Motion Primitives `sliding-number` renders `<div className="flex">` with one child per digit; under `dir="rtl"` 123 displays as 321. Isolate every number widget. React Bits `Counter` does it on its root with `[direction:ltr] [unicode-bidi:isolate]`. Do the same.
4. **A horizontal marquee breaks in RTL.** The copies are laid out from the right, but the keyframe moves them left, so a gap opens on the right and the loop jumps. Reversing the animation does not fix it. Put `dir="ltr"` on the track and `dir="rtl"` on each card. Vertical marquees are unaffected.
5. **Transform origins and physical offsets do not flip.** `origin-left` on a progress bar, `left-8` on a timeline rail, `x: 300 * direction` on a tab panel are all physical. Use `rtl:origin-right`, `start-8`, and multiply slide direction by `-1` in RTL.
6. **A text shimmer should travel in reading direction.** The Motion Primitives shimmer animates `background-position` from `100%` to `0%`, which sweeps left to right. For Arabic animate `0%` to `100%`.
7. **SVG coordinates never flip.** Author roadmap paths in the direction you want them drawn, and keep labels in HTML.
8. **Sign-in page:** the brief wants the form physically on the left. shadcn's `login-04` block is `grid md:grid-cols-2` with the form first; in RTL the first column is on the right. Put `dir="ltr"` on the two-column wrapper and `dir="rtl"` inside each half.

### 2.2 Stripping the decoration

When a component is marked ADAPT, remove these in order. What is left is usually the part worth having.

1. Gradient stops (`bg-gradient-*`, `from-*`, `via-*`, SVG `linearGradient`): replace with one solid token colour.
2. Coloured or large shadows (`shadow-[0_0_...]`, `shadow-2xl`, `drop-shadow`, inset glows): replace with a hairline border and at most one small neutral shadow.
3. `backdrop-blur-*` and translucent washes: replace with a solid surface.
4. `mask-image: radial-gradient(...)` vignettes and spotlight layers: delete. Keep only linear edge fades on scrollers.
5. `mix-blend-*`, `brightness` hovers, pattern backgrounds (grids, dots, noise): delete.
6. Icon imports: swap for Dalilak icons. `cn` from `@/lib/utils`: use the project's own helper.
7. Physical `left`/`right`/`pl`/`ml` classes: convert to logical ones.

### 2.3 Motion constants worth standardising

These recur across the best-made sources. Pick one set and use it everywhere so the app moves as one thing.

| Use | Value | Seen in |
|---|---|---|
| Ease out (default for entrances) | `cubic-bezier(0.23, 1, 0.32, 1)` | React Bits Micro, Kokonut UI, shadcn `message-scroller` |
| Ease in-out (breathing, morphs) | `cubic-bezier(0.77, 0, 0.175, 1)` | React Bits Micro |
| Ease for leaving | `cubic-bezier(0.7, 0, 0.84, 0)` | shadcn `message-scroller` |
| Enter and exit durations | enter 0.3-0.4 s, exit 0.15-0.2 s | Animate UI `page-transition` (fade 0.3/0.15, slide 0.4/0.2) |
| List item spring | `stiffness 350, damping 40` | Magic UI `animated-list` |
| Count-up spring | `stiffness 100, damping 60` | Magic UI `number-ticker` |
| Auto-height spring | `stiffness 300, damping 30, bounce 0` | Animate UI `auto-height` |
| Sliding pill spring | `type "spring", bounce 0.19, duration 0.4` | Cult UI `direction-aware-tabs` |
| Surface morph spring | `stiffness 550, damping 45` | Cult UI `morph-surface` |
| Swipe settle spring | `stiffness 420, damping 38` | Kokonut UI `smooth-tab` |
| Blur on entering text | 2-6 px | Kokonut (2-4), Magic UI `blur-fade` (6) |

Exit faster than you enter. It is what makes "old page out first" feel quick instead of slow. Keep blur at 6 px or less on anything larger than a line of text; several sources use 10-12 px, which is expensive on this laptop and reads as an effect.

Reduced motion: Kokonut wraps animated subtrees in `<MotionConfig reducedMotion="user">`; React Bits and SmoothUI branch on `useReducedMotion()`. Do one of the two in the app shell.

## 3. Marquees (sign-in showcase)

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Magic UI `marquee` | Pure CSS, runs on the compositor, 40 lines |
| ADAPT | Motion Primitives `infinite-slider` | Speed in px/s and a slow-down on hover instead of a hard stop; needs `react-use-measure` |
| AVOID | Aceternity `infinite-moving-cards` | Duplicates children with `cloneNode(true)` in an effect, outside React; clones lose handlers. Card background is a gradient |
| AVOID | Magic UI `scroll-based-velocity` | Speed tied to page scroll; the sign-in page does not scroll |
| not opened | Aceternity `3d-marquee`, Kibo UI `marquee`, Dice UI `marquee` | |

**Technique (Magic UI).** Render the group of items N times side by side. Each copy animates by exactly its own size plus the gap, so when the loop restarts the next copy is where the first one began.

```css
/* globals.css, Tailwind v4. Values from Magic UI's registry JSON. */
@theme {
  --animate-marquee: marquee var(--duration) infinite linear;
  --animate-marquee-vertical: marquee-vertical var(--duration) linear infinite;
  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(calc(-100% - var(--gap))); }
  }
  @keyframes marquee-vertical {
    from { transform: translateY(0); }
    to { transform: translateY(calc(-100% - var(--gap))); }
  }
}
```

```tsx
// Sketch: one vertical column of the showcase. Magic UI's classes, plus the fixes listed below.
<div className="group flex flex-col gap-(--gap) overflow-hidden [--duration:44s] [--gap:1rem]
                [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
  {[0, 1, 2].map((copy) => (
    <div key={copy} aria-hidden={copy > 0}
         className="flex shrink-0 flex-col gap-(--gap) animate-marquee-vertical
                    group-hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]">
      {pieces}
    </div>
  ))}
</div>
```

What to change from the source:

- Magic UI defaults to `repeat = 4`. You need enough copies that the copies together are longer than the viewport plus one copy. Two is enough only when one copy already fills the container.
- Add `aria-hidden` on the duplicates and `motion-reduce` pausing; the source has neither.
- Alternate direction per column with `[animation-direction:reverse]` and give each column a different `--duration` (for example 38 s, 46 s, 42 s) so the columns never line up.
- Horizontal use: `dir="ltr"` on the track (rule 2.1.4).
- The edge fade is a `mask-image` linear gradient. It is a mask, not a tint, and is fine.

**If you want the slow-down on hover** (Motion Primitives `infinite-slider`): render children twice inside one `motion.div`, drive `x` or `y` from a `useMotionValue`, and run `animate(translation, [from, to], { ease: "linear", duration: distance / speed, repeat: Infinity })`. On hover, restart from the current position with `duration = remainingDistance / speedOnHover`, then resume the loop. Replace `useMeasure` with a `ResizeObserver`.

What goes in the marquee matters more than the marquee. See section 4.

## 4. Bento showcases

| Verdict | Component | Reason |
|---|---|---|
| ADAPT | Magic UI `bento-grid` | Good grid and hover structure; the dark-mode card has an inset white glow |
| AVOID | React Bits `MagicBento` | Judged by name and category neighbours (`BorderGlow`, `SpotlightCard`); source not opened |
| not opened | Aceternity `bento-grid`, Kokonut `bento-grid`, Aceternity bento blocks | |

**Structure (Magic UI).** Grid: `grid w-full auto-rows-[22rem] grid-cols-3 gap-4`; each card takes a `col-span-*` class. A card is three layers: a `background` slot that fills the card, a text block at the bottom, and a call to action that is hidden until hover. On hover the text block lifts (`lg:group-hover:-translate-y-10`), the icon shrinks (`group-hover:scale-75`), and the action rises from `translate-y-10 opacity-0` into place, all at `duration-300`.

**Strip:** the dark card style `box-shadow: 0 -20px 80px -20px #ffffff1f inset`, the three-layer light shadow, and the Radix arrow icon. Keep a hairline border.

**The idea worth keeping** is the `background` slot. Its type is `ReactNode`, so a cell can hold a running component instead of a picture. For the sign-in showcase, fill cells with the real Dalilak components at small size on a scripted loop: a list that gains one skill chip per second (section 5), a match ring going from 70 to 90 (section 6), a path drawing itself (section 11). That reads as the product, where screenshots would read as a brochure.

Loop hygiene, from Aceternity's `placeholders-and-vanish-input`: clear the interval on `visibilitychange` when the tab is hidden and restart it when visible. Also gate each vignette on `useInView`.

## 5. Animated lists

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Magic UI `animated-list` | The standard pattern: `AnimatePresence` plus `layout` plus one spring |
| ADOPT (technique) | Kokonut UI `notification-stack` | Stacked cards with peek, swipe to dismiss with a velocity test |
| ADOPT (technique) | Sonner stack CSS | The maths for a collapsed stack |
| ADAPT | Motion Primitives `animated-group` | Simple stagger on mount; presets `bounce`, `swing`, `rotate`, `flip` are too playful |
| not opened | Animate UI `pinned-list`, `notification-list`; React Bits `AnimatedList` | |

**Technique (Magic UI).** A timer reveals one more child every `delay` ms (default 1000); the visible slice is reversed so the newest is on top; each item is a `motion.div` with `layout`, so older items slide down when a new one arrives.

```tsx
// Source values: initial { scale: 0, opacity: 0 }, animate { scale: 1, opacity: 1, originY: 0 },
// exit { scale: 0, opacity: 0 }, spring stiffness 350 damping 40.
<AnimatePresence initial={false}>
  {visible.map((item) => (
    <motion.div key={item.id} layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}   // adapted: scale from 0 is a cartoon pop
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 350, damping: 40 }}>
      {item.node}
    </motion.div>
  ))}
</AnimatePresence>
```

Uses in Dalilak: skills appearing during CV analysis, the advisor's tool-call rows, matched jobs arriving, the showcase vignettes.

**Leaderboard reorder.** The same `layout` prop does it: keep stable keys, sort the array, and rows glide to their new rank. Use `layout="position"` on rows so text does not stretch while moving. Highlight the signed-in user's row with a border, not a glow.

**Stacked notifications (Kokonut `notification-stack` constants):** `PEEK = 10` px of each card behind the front one, `VISIBLE_BEHIND = 2`, `GAP = 8` when expanded, dismiss when dragged 100 px or flicked faster than 0.11 px/ms, a 6 px axis lock before deciding between swipe and scroll, exit in 200 ms. Sonner's collapsed stack: each toast behind the front is lifted by `gap * toastsBefore` and scaled by `1 - toastsBefore * 0.05`, and forced to the front toast's height. Base UI's toast exposes `--toast-index` and `--toast-offset-y` so the same maths can be written in CSS without either library.

## 6. Number tickers, digits and rings

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Magic UI `number-ticker` | Spring count-up that writes `textContent`; no re-render per frame |
| ADAPT | Motion Primitives `sliding-number` | Rolling digit columns; needs `react-use-measure`; reverses in RTL; rolls backward on carry |
| ADOPT (study) | React Bits `Counter` | The most complete: `Intl.NumberFormat.formatToParts` slots, roll direction, LTR isolation. Large file; take ideas, not code |
| ADOPT if the lead adds it | NumberFlow (`@number-flow/react`) | Best ready-made ticker. Props confirmed in source: `value`, `locales`, `format`, `prefix`, `suffix`, `trend`, `plugins`, `animated`, `respectMotionPreference`, `transformTiming`, `spinTiming`, `opacityTiming`, `willChange`, `isolate`; plus `NumberFlowGroup` |
| ADAPT | Magic UI `animated-circular-progress-bar` | Good CSS-only ring; more machinery than needed |
| not opened | Animate UI `sliding-number`, `counting-number`; Cult UI `rolling-number`; SmoothUI `digit-roll`, `number-flow`; Aceternity `speed-counter` (401) | |

**Count-up (Magic UI).** Use for large totals such as XP.

```tsx
// Sketch. Spring values from Magic UI number-ticker.
const ref = useRef<HTMLSpanElement>(null);
const target = useMotionValue(from);
const spring = useSpring(target, { damping: 60, stiffness: 100 });
const fmt = useMemo(() => new Intl.NumberFormat("en-US"), []);   // Latin digits

useEffect(() => { target.set(value); }, [target, value]);
useEffect(() => spring.on("change", (v) => {
  if (ref.current) ref.current.textContent = fmt.format(Math.round(v));
}), [spring, fmt]);

return <span ref={ref} dir="ltr" className="inline-block tabular-nums">{fmt.format(from)}</span>;
```

`tabular-nums` stops the width jittering. The source also waits for `useInView(ref, { once: true })` before starting.

**Rolling digits.** Use for small numbers that change by small steps: level, streak, rank, match percent. The Motion Primitives technique: one spring per decimal place; all ten numerals are absolutely stacked in a `1ch` box; each numeral's offset is `(10 + n - placeValue) % 10`, and offsets above 5 wrap to the other side so the numeral arrives from the nearer edge. Their spring: `stiffness 280, damping 18, mass 0.3`.

```tsx
// Sketch: same maths in em units, so no measuring hook is needed.
function Numeral({ mv, n }: { mv: MotionValue<number>; n: number }) {
  const transform = useTransform(mv, (latest) => {
    const offset = (10 + n - (latest % 10)) % 10;
    return `translateY(${offset > 5 ? offset - 10 : offset}em)`;
  });
  return <motion.span style={{ transform }} className="absolute inset-0 text-center">{n}</motion.span>;
}
function Digit({ value, place }: { value: number; place: number }) {
  const placeValue = Math.floor(value / place);          // see note on % 10 below
  const mv = useSpring(placeValue, { stiffness: 280, damping: 28, mass: 0.3 });
  useEffect(() => { mv.set(placeValue); }, [mv, placeValue]);
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden leading-none tabular-nums">
      {[0,1,2,3,4,5,6,7,8,9].map((n) => <Numeral key={n} mv={mv} n={n} />)}
    </span>
  );
}
// Root: <span dir="ltr" className="inline-flex [unicode-bidi:isolate]">…one Digit per place…</span>
```

Note on `% 10`: the source feeds the spring `Math.floor(value / place) % 10`, so a digit going from 9 to 0 rolls backward through eight numerals. Feeding the un-wrapped place value, as above, makes it roll forward; the cost is that a large jump spins the low digits many times. That is why rolling digits suit small steps and the count-up suits XP.

**Match ring.** Magic UI builds the arc from `stroke-dasharray: calc(var(--stroke-percent) * var(--percent-to-px)) var(--circumference)` with a 1 s CSS transition. The shorter equivalent normalises the circle's length to 100:

```tsx
<svg viewBox="0 0 100 100" className="-rotate-90">
  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" className="stroke-(--color-track)" />
  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" strokeLinecap="round"
          pathLength={100} strokeDasharray={`${percent} 100`}
          className="stroke-(--color-brand) transition-[stroke-dasharray] duration-1000 ease-out" />
</svg>
```

Token names are placeholders. Put the ticking percent in the centre. When the percent changes (70 to 90 in the demo script), the arc and the digits move together; that pairing is the celebration (section 15).

## 7. Text animation

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Magic UI `blur-fade` | Exactly "an answer that blurs into focus", at block level |
| ADOPT | Motion Primitives `text-effect`, Magic UI `text-animate` (by word or line) | Staggered word reveal via parent and child variants |
| ADOPT | prompt-kit `response-stream` (fade mode) | Streams words in with a CSS fade; segments with `Intl.Segmenter` |
| ADOPT | Motion Primitives `text-loop`, SmoothUI `shared-axis-x` | Rotating phrase; the basis of a rolling status line |
| ADAPT | Motion Primitives `text-shimmer` (same code as AI Elements `shimmer`) | "A light passing over the label". Keep it one neutral colour |
| ADAPT | Aceternity `text-generate-effect` | Same result as `text-effect` using `useAnimate` and `stagger(0.2)`; 0.2 s per word is slow, blur 10 px is heavy |
| AVOID for Arabic | Motion Primitives `text-morph`, `text-scramble`; Magic UI `hyper-text`, `morphing-text`; Kokonut `ai-text-loading` | Per-character (rule 2.1.1) |
| AVOID | Magic UI `animated-gradient-text`, `aurora-text`, `sparkles-text`, `dia-text-reveal`, `line-shadow-text`; Aceternity `colourful-text`; React Bits `GradientText`, `GlitchText`; Animate UI `texts/gradient` | Gradient, sparkle or glitch text. `dia-text-reveal` opened: a five-colour band sweeping through the text. The others judged by name |

**Block blur-in (Magic UI `blur-fade`).** Hidden: `{ y: 6, opacity: 0, filter: "blur(6px)" }`. Visible: `{ y: 0, opacity: 1, filter: "blur(0px)" }`. Duration 0.4 s, `easeOut`, delay `0.04 + delay`, triggered by `useInView(ref, { once: true, margin: "-50px" })`. For an advisor reply, wrap each block (paragraph, card, list) and stagger the delay by 80 ms.

**Word stagger (Motion Primitives `text-effect`).** The parent variant carries `staggerChildren`; each word is a `motion.span` with `inline-block whitespace-pre`. Source defaults: stagger 0.05 s per word, 0.03 per character, 0.1 per line; item duration 0.3 s; preset `fade-in-blur` is `{ opacity: 0, y: 20, filter: "blur(12px)" }` to rest. Both libraries put the full string in a `sr-only` span and mark the animated spans `aria-hidden`, which is the correct accessibility pattern. For Dalilak: split with `Intl.Segmenter`, reduce to `y: 8` and `blur(4px)`.

**Streamed reply (prompt-kit).** Fade mode keeps the text received so far, segments it into words, and renders each word as a span whose CSS animation is `fadeIn <duration> ease-out forwards` with `animation-delay: index * segmentDelay`. No Motion involved, so a long answer costs nothing per frame. It accepts either a full string (revealed by a `requestAnimationFrame` loop) or an `AsyncIterable<string>`, which fits both the local brain and a streaming provider.

**Rolling status line.** Motion Primitives `text-loop`: one keyed `motion.div` inside `AnimatePresence mode="popLayout"`, entering from `y: 20, opacity: 0` and leaving to `y: -20, opacity: 0` in 0.3 s. TEAM-BRIEF section 5 already fixes Dalilak's numbers (`translateY(100%)` and 2 px blur, 420 ms) in a 24 px line with `overflow: hidden`; use this structure with those numbers. Here `popLayout` is right, because the old step should leave as the new one arrives. Kokonut's `ai-tool-calls` swaps status text the same way: `{ opacity: 0, y: 4, filter: "blur(2px)" }` in, `y: -4` out, 0.18-0.2 s.

**Shimmer over a label (Motion Primitives `text-shimmer`).** Two stacked backgrounds clipped to the text: a flat base colour, and on top a narrow band of a brighter colour that slides across.

```tsx
// Source technique. Band half-width = characters * 2 px.
className="inline-block bg-clip-text text-transparent bg-[length:250%_100%,auto] [background-repeat:no-repeat,padding-box]"
style={{
  "--spread": `${text.length * 2}px`,
  backgroundImage:
    "linear-gradient(90deg, #0000 calc(50% - var(--spread)), var(--shine), #0000 calc(50% + var(--spread))), " +
    "linear-gradient(var(--base), var(--base))",
}}
// animate backgroundPosition "100% center" to "0% center", linear, repeat (2 s in source; TEAM-BRIEF says 2.4 s).
```

Set `--base` to the muted text colour and `--shine` to the normal text colour: one hue, two lightness steps. That is a light passing over text, which he liked; it becomes "AI slop" only when the band is coloured. For Arabic run `0%` to `100%` (rule 2.1.6). A CSS keyframe on `background-position` does the same job without Motion.

Kokonut's `ai-text-loading` deliberately replaces the gradient shimmer with an opacity wave (`@keyframes { 50% { opacity: 0.3 } }`, 1.6 s, each unit delayed 0.07 s). Applied per word it is a usable alternative for Arabic.

## 8. Multi-step loaders (path reveal, CV analysis)

| Verdict | Component | Reason |
|---|---|---|
| ADAPT | Aceternity `multi-step-loader` | The scrolling step list is right; the overlay is `backdrop-blur-2xl` with a radial mask and a lime accent, and it advances on a blind timer |
| ADOPT | React Bits Micro `StatusMark` | One mark for pending, running, done, failed, with a drawn check. The best single piece found in this survey |
| ADOPT | React Bits Micro `ThoughtLine` | A complete "thinking" line: breathing glyph, shimmer, live timer, settles to "Thought for 4.2s", collapsible step trace |
| ADOPT (technique) | Kokonut UI `ai-tool-calls` | Blur-swap of status text; rows that open with `height: auto` |
| ADAPT | Aceternity `stateful-button` | Button that grows a spinner then a check with `useAnimate` sequences; spinner turns every 0.3 s, too fast |
| AVOID | Aceternity `loader` (`LoaderOne`, `LoaderTwo`); prompt-kit `DotsLoader`, `TypingLoader`, `TextDotsLoader` | Bouncing or sliding dots: on the rejected list |
| not opened | Cult UI `loading-carousel`, `onboarding`; SmoothUI `animated-stepper`; Kokonut `ai-loading` | |

**The scrolling list (Aceternity).** All steps are rendered in a column. The whole column shifts up by one row per step, so the current step stays at the same height, and opacity falls with distance from the current step.

```tsx
// Source: row pitch 40 px, fade 0.2 per row, 0.5 s per move.
{steps.map((step, i) => {
  const distance = Math.abs(i - current);
  return (
    <motion.div key={i} className="mb-4 flex gap-2"
      animate={{ opacity: Math.max(1 - distance * 0.2, 0), y: -(current * 40) }}
      transition={{ duration: 0.5 }}>
      <StatusMark status={i < current ? "done" : i === current ? "running" : "pending"} />
      <span>{step.text}</span>
    </motion.div>
  );
})}
```

Changes for Dalilak:

- Remove the full-screen `backdrop-blur-2xl` layer and the radial mask. Use a solid page; let the list be the page.
- The source advances every `duration` ms (default 2000) and loops. Advance on real stage completion with a minimum dwell, so the show neither outruns the work nor stalls behind it:
  ```ts
  for (const stage of stages) {
    await Promise.all([stage.run(), sleep(700)]);   // 700 ms is a starting point; tune by eye
    setCurrent((c) => c + 1);
  }
  ```
  With the local brain the work is instant, so the dwell alone sets the pace and the sequence is the same every time.
- Row pitch must equal row height plus gap (40 px in the source). Derive it from one constant.

**StatusMark (React Bits `src/ts-tailwind/Micro/StatusMark`).** One 24 px SVG with a ring and a check path:

- *Pending* is a ring of 8 short dashes. *Running* morphs the dash pattern into one solid arc covering 0.68 of the circle and spins it by animating `stroke-dashoffset` linearly (1100 ms per turn). A `progress` prop makes the arc determinate. *Done* closes the arc to a full ring.
- The check and the cross are paths with `pathLength="1"`, drawn by a `stroke-dashoffset` transition: 240 ms, `cubic-bezier(0.23, 1, 0.32, 1)`, after a 120 ms delay so the ring closes first. The cross path's classes show the values: `stroke-dasharray: 1 2`, offset from 1.05 to 0. The start of the check path's class list was cut off in what I read; its visible transition is the same.
- The label gets a strike-through: an absolutely positioned 1 px line going from `scale-x-0` to `scale-x-100` in 280 ms, 180 ms after the status changes (`origin-left`; use `rtl:origin-right`).
- Colour changes with a 200 ms transition. Defaults are green `#22c55e` and red `#ef4444`; use Dalilak tokens.

Take the technique and draw Dalilak's own check in the icon set's stroke style. `pathLength="1"` is the part to remember: it makes any path drawable with a dash offset from 1 to 0, with no length measuring.

**ThoughtLine (React Bits `Micro/ThoughtLine`).** Everything the advisor's status line needs is here:

- The glyph breathes: opacity loops between `1 - breathDepth` (0.55) and 1 over 1.6 s, in-out easing.
- A timer shows tenths of a second, updated by `setInterval(…, 100)` writing `textContent` into a `tabular-nums` span.
- On finish the working label cross-fades to a done label ("Thought for") through a 2 px blur in 350 ms. Both labels sit in the same grid cell, so the width does not jump, and the timer slides to its new position.
- The step trace opens with `grid-template-rows: 0fr` to `1fr` on a transition, with `min-h-0 overflow-y-clip` on the inner wrapper. That animates height with no measuring and no JavaScript.
- New trace rows fade in with Tailwind's `starting:` variant (`starting:-translate-y-1 starting:opacity-0`), which compiles to `@starting-style`: an entrance animation in pure CSS.
- Unfinished rows show a small pulsing dot; finished rows show a check and drop to 55% opacity.

**Strip:** the default glyph is a sparkle icon (`glyph = 'sparkle'`). Pass Dalilak's own advisor glyph. The rest is clean.

## 9. File upload (CV)

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Kokonut UI `file-upload` | No dropzone library; a real state machine; window-level drag; hairline progress |
| ADOPT | Origin UI hook `use-file-upload` | Small dependency-free hook: validation, drag state, previews |
| ADAPT | Aceternity `file-upload` | One excellent idea (the drop tile morphs into the file row); wrapped in a grid-pattern background with a radial mask, `shadow-2xl`, a sky-blue dashed ghost, and `react-dropzone` |
| ADOPT (structure) | shadcn/ui `attachment` | Chip for a file in chat with `data-state`: `idle`, `uploading`, `processing`, `error`, `done` |
| AVOID | Cult UI `halo-dropzone` | Judged by name (the `halo-*` family); source not opened |
| not opened | prompt-kit `file-upload`; SmoothUI `animated-file-upload`; Kibo UI `dropzone`; Dice UI `file-upload` | |

**Window-level drag (Kokonut).** The drop zone wakes as soon as a file enters the browser window, and a drop that misses the zone does not make the browser navigate to the file.

```ts
// From Kokonut file-upload, condensed. `depth` handles enter/leave firing for every child element.
const isFileDrag = (e: DragEvent) => Boolean(e.dataTransfer?.types.includes("Files"));
useEffect(() => {
  let depth = 0;
  const onEnter = (e: DragEvent) => { if (isFileDrag(e)) { depth += 1; setWindowDrag(true); } };
  const onLeave = (e: DragEvent) => { if (isFileDrag(e)) { depth = Math.max(0, depth - 1); if (!depth) setWindowDrag(false); } };
  const onOver  = (e: DragEvent) => { if (isFileDrag(e)) e.preventDefault(); };
  const onEnd   = (e: DragEvent) => { if (isFileDrag(e)) e.preventDefault(); depth = 0; setWindowDrag(false); };
  window.addEventListener("dragenter", onEnter); window.addEventListener("dragleave", onLeave);
  window.addEventListener("dragover", onOver);   window.addEventListener("drop", onEnd);
  window.addEventListener("dragend", onEnd);
  return () => { /* remove all five */ };
}, []);
```

The zone's text follows three states: idle ("drop here or browse"), file over the window ("drop here"), file over the zone ("release to add 1 file").

**Other details from Kokonut worth copying:**

- Item status: `queued | uploading | done | error | rejected`. Rejected files (wrong type, too large) appear in the list with the reason; they do not vanish.
- "The row's hairline divider doubles as its progress bar": a 1 px line at the row's bottom edge whose fill is `transform: scaleX(progress / 100)` with `origin-left` and a 200 ms linear transition. On done it turns green and fades out after 300 ms. A retry sets `transition-none` at 0 so it does not rewind. In RTL use `rtl:origin-right`.
- The done check is a `motion.path` from `pathLength: 0` to `1` in 0.32 s.
- Simulated progress "advances in uneven steps, like a real network would". Use that for the demo's fake upload.
- The component imports the `ClipboardEvent` type, so it appears to accept pasted files; I did not read the handler. Paste matters for Dalilak because the idea file allows pasted CV text.

**Origin UI `use-file-upload`** returns state `{ files, isDragging, errors }` and actions including `addFiles`, `removeFile`, `clearFiles`, `clearErrors`, `handleDragEnter`, `handleDragLeave`, `handleDragOver`, `handleDrop`, `getInputProps`. Options seen: `maxSize` in bytes, `accept` (a comma-separated list), `maxFiles`. It checks each file's size and type, collects readable error strings, and builds preview URLs. I read its outline, not every line. It is the right size to retype.

**The morph (Aceternity).** The empty state is a small tile with `layoutId="file-upload"`. When a file is chosen the tile unmounts and the file row mounts with the same `layoutId`, so Motion animates one into the other. For Dalilak, carry it one step further: tile, then a document page with the CV's name, and that page is what the analysis show scans (TEAM-BRIEF section 5, the reading show). One shared `layoutId` ties upload and analysis into a single continuous motion.

## 10. Timelines

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Origin UI `timeline` | Clean compound structure driven by one `activeStep` |
| ADAPT | Aceternity `timeline` | Scroll-filled rail with sticky headings; fill is a purple-to-blue gradient; physical `left-*` classes; demo copy hard-coded in the component |
| not opened | Dice UI `timeline`, `stepper`; Origin UI `stepper`; React Bits `Stepper` (only its motion calls) | |

**Origin UI structure.** A context holds `activeStep`. Each `TimelineItem step={n}` sets `data-completed` when `n <= activeStep`. The indicator dot and the separator line are styled from that attribute alone; the separator of an item is coloured when the *next* item is completed, using `has-[+[data-completed]]:[&_[data-slot=timeline-separator]]:bg-primary`. It supports `orientation="horizontal" | "vertical"` through `group-data-[orientation=…]` classes. It mixes `ms-8` with physical `-left-6`; convert to `-start-6`.

Use for the application record: applied, viewed, shortlisted, interview. Animate the separator fill with a `scaleY` transition from `origin-top` so advancing a step draws the line.

**Aceternity scroll fill.** Measure the list height once, then:

```tsx
const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 10%", "end 50%"] });
const fill = useTransform(scrollYProgress, [0, 1], [0, height]);
const fade = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
// rail: absolute, 2 px wide, full height, neutral colour
// fill: <motion.div style={{ height: fill, opacity: fade }} className="absolute inset-x-0 top-0 bg-(--color-brand)" />
```

Each heading is `sticky top-40 self-start`, so it stays put while its content scrolls past. Replace the gradient fill with a solid colour, drop the rail's fade mask, and use `start-8`.

React Bits `Stepper` animates step changes with the Web Animations API directly: the viewport's height animates from the old content height to the new, and the pane slides in from `direction * shift`. Same idea as the direction-aware tabs in section 12.

## 11. Tracing and drawn paths (roadmap, skill tree, CV evidence)

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | SmoothUI `svg-draw-on-scroll` | Draws paths by progress and moves a marker along them correctly |
| ADOPT (geometry) | Magic UI `animated-beam` | Computes a curve between two DOM elements; right for skill-tree connectors |
| ADAPT | Aceternity `tracing-beam` | A gradient that follows scroll along a rail; three-colour gradient (cyan, indigo, purple) |
| ADAPT | Aceternity `google-gemini-effect` | Several paths drawn in sequence from scroll; paths and copy are theirs |
| ADAPT | Magic UI `highlighter` | Hand-drawn underline or box around text; needs `rough-notation` |
| ADOPT (technique) | Animate UI animated icons | Per-part variants for icon micro-motion |
| not opened | Aceternity `animated-beam-path-illustration` (401), `svg-mask-effect`; Kokonut `background-paths` | |

**Draw a path by progress.** Motion animates `pathLength` from 0 to 1 on any `motion.path`. For the roadmap the progress comes from state, not scroll:

```tsx
<path d={d} fill="none" strokeWidth={3} className="stroke-(--color-track)" />        {/* whole route, muted */}
<motion.path d={d} fill="none" strokeWidth={3} strokeLinecap="round" pathLength={1}
  className="stroke-(--color-brand)"
  initial={{ pathLength: 0 }} animate={{ pathLength: completed / total }}
  transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }} />
```

When a course is completed, `completed / total` changes and the brand-coloured line extends to the next node. That single motion says "real progress" better than any badge.

**A marker that rides the path (SmoothUI).** Their source comment explains why CSS `offset-path` fails: it measures in the element's pixel space while `d` is in viewBox units, so the marker drifts whenever the SVG is scaled. The fix resolves the point through the same transform the browser painted with:

```ts
const total = pathEl.getTotalLength();
const p = pathEl.getPointAtLength(progress * total);
const screen = new DOMPoint(p.x, p.y).matrixTransform(pathEl.getScreenCTM()!);
const box = wrapper.getBoundingClientRect();
markerX.set(screen.x - box.left);   // motion values bound to an HTML marker's x and y
markerY.set(screen.y - box.top);
```

Re-run it on a `ResizeObserver`. Use the same call to place each roadmap node and its HTML label, so labels stay crisp, selectable and correctly shaped in Arabic. SmoothUI also keeps progress monotonic (`Math.max` of the values seen) when the drawing should not undo, and smooths it with `useSpring`.

**Connector between two elements (Magic UI `animated-beam`).** Inside an effect with a `ResizeObserver` on the container, read the bounding boxes of the container and both nodes, take each node's centre relative to the container, and build one quadratic curve:

```ts
const d = `M ${sx},${sy} Q ${(sx + ex) / 2},${sy - curvature} ${ex},${ey}`;
```

Render it in an absolutely positioned SVG sized to the container with `pointer-events-none`. **Strip** the second path whose stroke is an animated `linearGradient` (default `#ffaa40` to `#9c40ff`, travelling forever). For the skill tree draw each connector once with `pathLength` when its skill unlocks, in a solid colour; leave locked connectors muted.

**Tracing beam.** The mechanism: two springs (`stiffness 500, damping 90`) follow scroll progress and set the `y1` and `y2` of a `linearGradient`, so a lit segment travels down a rail. Replace it with the `pathLength` fill above; the result is the same line of progress without the gradient.

**Highlighting CV evidence.** Magic UI's `highlighter` wraps `rough-notation`: `annotate(el, { type: "highlight" | "underline" | "box" | …, animationDuration: 600, iterations: 2, multiline: true })`, re-shown on resize. Without the package, the side-panel marker is two lines of CSS and wraps across lines correctly:

```css
.evidence { background: linear-gradient(var(--mark), var(--mark)) no-repeat 0 100% / 0% 40%;
            transition: background-size 600ms cubic-bezier(0.23, 1, 0.32, 1);
            box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.evidence[data-on] { background-size: 100% 40%; }
[dir="rtl"] .evidence { background-position: 100% 100%; }   /* grow from the right */
```

Sketch, not run. The gradient here is a single flat colour used as a sized background, which is the standard way to draw a marker stroke; it is not a visible gradient.

**Animated icons (Animate UI v2, `apps/v2/registry/hugeicons/<name>/index.tsx`).** Each icon is a `motion.svg`; each part has `initial` and `animate` variants and all parts share one `controls` object, so a parent (a button on hover, or code on an event) plays the whole icon. Two examples from source: the flame flickers with `scaleY: [1, 1.05, 0.95, 1.03, 1]` and `skewX: [0, 3, -3, 1.5, 0]` about `transformOrigin: "50% 100%"` in 0.8 s; a badge check redraws with `pathLength: [0, 1]` in 0.6 s. The artwork is Hugeicons and must not be copied. The pattern applies directly to Dalilak's own streak flame, badges and level icons.

## 12. Navigation, docks and animated tabs

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Motion Primitives `animated-background` | A highlight that slides between items; unique `layoutId` per instance |
| ADOPT | Base UI `Tabs.Indicator` (already installed) | The same sliding pill from CSS variables, no Motion |
| ADAPT | Cult UI `direction-aware-tabs` | Panels slide in from the side you moved toward; 300 px travel, both panels visible at once, `mix-blend-difference` pill |
| ADOPT (phone) | Kokonut UI `smooth-tab` | Swipeable panels with rubber-banding; indicator follows the finger |
| ADAPT, desktop only | Magic UI `dock`, Aceternity `floating-dock`, Motion Primitives `dock` | Identical magnification maths; a recognisable macOS gimmick, useless on touch; Magic UI's has `backdrop-blur-md` |
| ADOPT (study) | shadcn/ui `sidebar` and blocks `sidebar-01` to `sidebar-16` | Shell layouts. Names confirmed, source not opened |
| AVOID | Aceternity `tabs` (content part) | Panels are a 3D stack that bounces `y: [0, 40, 0]` and fans out on hover |
| AVOID | React Bits `GooeyNav`, `GlassIcons`, `BubbleMenu`; Aceternity `floating-navbar`, `lamp` | Judged by name; gooey, glass and glow effects |

**Sliding pill with Motion.** Render the pill inside the active item only; because it has a `layoutId`, Motion animates it from the old item to the new one.

```tsx
const id = useId();
{items.map((item) => (
  <button key={item.id} className="relative px-4 py-2" onClick={() => setActive(item.id)}>
    {active === item.id && (
      <motion.span layoutId={`pill-${id}`} className="absolute inset-0 rounded-full bg-(--color-surface-2)"
        transition={{ type: "spring", bounce: 0.19, duration: 0.4 }} />
    )}
    <span className="relative">{item.label}</span>
  </button>
))}
```

Aceternity hard-codes `layoutId="clickedbutton"` and Cult UI hard-codes `"bubble"`. Two such bars on one page share the id and the pill flies between them. Motion Primitives uses `useId()`; always do that. Their version also takes `enableHover` for a hover-follow highlight on menus.

**Sliding pill with Base UI.** `Tabs.Indicator` receives `--active-tab-left` and `--active-tab-width`. Position it at the list's physical left edge and transition `translate` and `width`:

```tsx
<Tabs.Indicator className="absolute left-0 top-1/2 h-8 -translate-y-1/2 rounded-full bg-(--color-surface-2)
  w-(--active-tab-width) translate-x-(--active-tab-left)
  transition-[translate,width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]" />
```

Sketch; variable names confirmed in the installed types, behaviour not run. `left-0` is deliberately physical here because the variable is a physical offset.

**Direction-aware panels (Cult UI).** Store `direction = newIndex > oldIndex ? 1 : -1` and pass it as `custom` to both `AnimatePresence` and the panel, so the leaving panel reads the new direction. Source variants: enter from `x: 300 * direction` with `blur(4px)`, leave to `x: -300 * direction`; the wrapper animates its height to the measured content.

Changes for Dalilak, which make it the "short slide and fade, old page out first" he accepted:

```tsx
const sign = (isRtl ? -1 : 1) * direction;
<AnimatePresence mode="wait" custom={sign} initial={false}>
  <motion.div key={active} custom={sign}
    variants={{
      enter: (s: number) => ({ x: 24 * s, opacity: 0 }),
      center: { x: 0, opacity: 1, transition: { duration: 0.26, ease: [0.23, 1, 0.32, 1] } },
      exit: (s: number) => ({ x: -16 * s, opacity: 0, transition: { duration: 0.14 } }),
    }}
    initial="enter" animate="center" exit="exit" />
</AnimatePresence>
```

`mode="wait"` is the important change. The source uses `popLayout`, which shows both panels at once, and that is the cross-fade he rejected. Base UI tab panels also carry `data-activation-direction`, so the same effect can be done in CSS with `data-starting-style`.

**Height that follows content.** Animate UI `auto-height`: an outer `motion.div` with `overflow: hidden` animates `height` to the value measured from an inner div by a `ResizeObserver`, spring `stiffness 300, damping 30, bounce 0`. Their hook rounds to device pixels (`Math.ceil(h * dpr) / dpr`) to avoid a one-pixel shimmer. Use it for the chat composer and any card whose content changes.

**Dock magnification, if used on desktop.** One `mouseX` motion value on the bar (`onMouseMove` sets `e.pageX`, `onMouseLeave` sets `Infinity`). Each icon computes `distance = mouseX - (rect.x + rect.width / 2)`, maps `[-140, 0, 140]` to `[40, 60, 40]` px with `useTransform`, and smooths with `useSpring({ mass: 0.1, stiffness: 150, damping: 12 })`. For a learning product a rail with a sliding pill is the better choice; the dock adds a trick without adding meaning, and it has no phone equivalent.

**Phone tab bar (Kokonut `smooth-tab`).** The indicator's rectangle is interpolated between measured tab rectangles by a fractional `progress`, so it tracks the finger during a swipe. Constants: 6 px axis lock, change tab on a flick faster than 0.11 px/ms, rubber-band at 0.35 past the ends, neighbour panel at 0.35 opacity while dragging, settle spring `stiffness 420, damping 38`. Swipe direction must be mirrored in RTL.

## 13. Shared-element transitions and the chat opening

| Verdict | Component | Reason |
|---|---|---|
| ADOPT | Motion Primitives `morphing-dialog` | The complete `layoutId` recipe: trigger, portal, inner shared parts, focus handling |
| ADOPT | Cult UI `expandable-screen` | Solves text distortion: a background layer morphs, the content fades |
| ADOPT (study) | Cult UI `morph-surface` | A pill that grows into a panel; relevant to the chat launcher |
| ADOPT (study) | SmoothUI `job-listing-component` | A job card that expands in place with `layoutId`. Only its motion calls were read |
| ADOPT, optional | Animate UI v2 `page-transition` and Motion `AnimateView` | Route-level and shared transitions on the browser's View Transition API. Available on this stack |
| not opened | Aceternity `expandable-card-on-click` (401); Cult UI `expandable-card`, `floating-panel`, `side-panel`, `dynamic-island`; Motion Primitives `morphing-popover` | |

**`layoutId` recipe (Motion Primitives).**

```tsx
// Trigger, in the page:
<motion.button layoutId={`card-${id}`} onClick={open} style={{ borderRadius: 16 }}>
  <motion.div layoutId={`card-title-${id}`}>{title}</motion.div>
</motion.button>

// Expanded, in a portal:
<AnimatePresence initial={false} mode="sync">
  {isOpen && (
    <>
      <motion.div key="backdrop" className="fixed inset-0 bg-black/40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <div className="fixed inset-0 z-50 grid place-items-center">
        <motion.div layoutId={`card-${id}`} role="dialog" aria-modal="true" style={{ borderRadius: 24 }}>
          <motion.div layoutId={`card-title-${id}`}>{title}</motion.div>
          {/* body fades in on its own, no layoutId */}
        </motion.div>
      </div>
    </>
  )}
</AnimatePresence>
```

The source wraps everything in `<MotionConfig transition={…}>` so every shared part uses one spring, and it handles Escape, a Tab focus trap, body scroll lock, click-outside, and returning focus to the trigger. In Dalilak let Base UI `Dialog` do those and keep only the `layoutId` parts. Strip the source backdrop's `backdrop-blur-xs`.

Rules that make it look right:

- Set `borderRadius` in `style`, not a class. Motion corrects the stretching of radius and shadow during a layout animation only for values it can read from `style`.
- Give only the frame and one or two anchors (title, avatar, logo) a `layoutId`. Everything else fades in after about 150 ms.
- Text inside a morphing box stretches. Cult UI's `expandable-screen` avoids it: the `layoutId` is on an empty absolutely positioned background layer; the trigger's content fades out with `layout={false}`; the expanded content fades in with `delay: 0.15, duration: 0.4`. Use that whenever the two states hold different text.
- Keep both ends in one mounted client tree (an overlay over the page). A `layoutId` pair split across two routes is unreliable, because the old page unmounts.

Uses in Dalilak: job card to job detail, course card to course detail, a badge to its detail sheet, the avatar on the leaderboard to the profile header.

**Chat launcher to chat panel.** Cult UI `morph-surface` animates the launcher's `width`, `height` and `borderRadius` (20 collapsed, 14 expanded) on a spring of `stiffness 550, damping 45`, with a small dot carrying a `layoutId` so one element visibly travels from the pill into the panel header, on its own softer spring (`350 / 35`). For Dalilak that travelling element should be the advisor's glyph. The plain route, using what is installed: a Base UI `Dialog` or `Popover` popup styled with CSS on `data-starting-style` and `data-ending-style`, with TEAM-BRIEF's numbers:

```tsx
className="transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]
  data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-150
  data-[starting-style]:-translate-x-4 data-[ending-style]:-translate-x-4"   // inline-end is the left edge in RTL
```

Sketch, not run. On phones use Base UI `Drawer`, which exposes `--drawer-swipe-movement-y` for drag-to-dismiss.

**`AnimateView` (Motion).** From the Motion docs and the installed types:

```tsx
import { AnimateView } from "motion/react-animate-view";

<AnimateView name={`job-${id}`}><div className="card" onClick={() => startTransition(() => select(id))} /></AnimateView>
// …and in the other view, the same name:
<AnimateView name={`job-${id}`}><div className="detail" /></AnimateView>
```

Props: `name`, `enter`, `exit`, `share`, `update`, `transition`, `onAnimationStart`, `onAnimationComplete`. `enter`, `exit`, `share` and `update` take a target or a function of the transition types. State changes must run inside `startTransition`. Limits stated in the docs: a `name` must be unique within each view or the animation fails; view transitions cannot be interrupted; they are recommended for page-level changes, with layout animations preferred for small interactions.

Animate UI's `page-transition` wraps the page in `<AnimateView key={pathname} enter={…} exit={…}>` and offers `fade` (enter 0.3 s, exit 0.15 s, with blur), `slide` (60 px; 0.4 s and 0.2 s), `zoom` (from 0.94), `iris` (a `clip-path` circle growing from the pointer position), `wipe`, `push` and others. Its `PageTransitionShared name` morphs an element across routes and animates border radius separately on `::view-transition-group(name)`.

For route changes the safe default is simpler: a `template.tsx` that plays an enter-only animation (fade and rise 6 px in 260 ms, as TEAM-BRIEF specifies). A template remounts on navigation, there is no exit, so two pages are never visible together. Treat `AnimateView` as an upgrade to try only if time allows. Not verified: whether Next 16.4 needs a config flag for route navigations to run as view transitions.

## 14. Chat UI

| Verdict | Component | Reason |
|---|---|---|
| ADOPT (structure) | shadcn/ui `message`, `bubble`, `marker`, `attachment` | New chat primitives in the current registry; plain, logical-property friendly |
| ADOPT (technique) | shadcn/ui `message-scroller` | Scroll behaviour and long-thread performance; depends on `@shadcn/react` |
| ADOPT (technique) | prompt-kit `response-stream`, `chat-container` | Streaming (section 7) and stick-to-bottom |
| ADOPT | React Bits Micro `ThoughtLine`, `StatusMark` | Status line and tool rows (section 8) |
| ADOPT (technique) | Kokonut UI `ai-tool-calls` | Tool-call rows that open and settle |
| names only | AI Elements: `conversation`, `message`, `prompt-input`, `reasoning`, `tool`, `task`, `plan`, `suggestion`, `sources`, `confirmation`, `queue`; prompt-kit: `prompt-input`, `prompt-suggestion`, `reasoning`, `steps`, `tool`, `thinking-bar`, `scroll-button`; Kokonut: `ai-prompt`, `ai-input-search`, `ai-send`, `ai-attachment`, `ai-citations`; Cult UI `prompt-composer`; React Bits Micro `PromptBar` | Useful as a checklist of parts a chat needs. Sources not opened |
| AVOID | Aceternity `placeholders-and-vanish-input` | Draws the typed text on a canvas with `fillText(value, 16, 40)` and dissolves it into particles. Left-anchored canvas text will misplace Arabic, and it is a particle effect |
| AVOID | Cult UI `ai-blob-warp`; SmoothUI `siri-orb`, `ai-orb-face`; AI Elements `persona` | Judged by name: orb and blob "AI" avatars |

**Message structure (shadcn).** `Message` is a flex row with `data-align="start" | "end"`; `end` applies `flex-row-reverse`. `MessageContent` is a column whose children align to the end for the user's side. `Bubble` is `w-fit max-w-[80%]` and its `BubbleContent` is `rounded-xl px-3 py-2 text-sm leading-relaxed wrap-break-word`. Variants are colour only: `default`, `secondary`, `muted`, `tinted`, `outline`, `ghost`, `destructive`. `ghost` removes the bubble entirely, which is the usual choice for assistant replies: the user's messages sit in bubbles and the advisor's are plain text on the page. `Marker` is a small row for system notes with a `separator` variant (a line each side of centred text), right for "the advisor opened your roadmap". Because alignment is done with flex and `start`/`end`, it follows `dir="rtl"`. `BubbleReactions` uses physical `left-3`/`right-3`; not needed here.

**Scrolling (shadcn `message-scroller`).** Worth copying even without the package:

- Each message wrapper has `[content-visibility:auto] [contain-intrinsic-size:auto_10rem]`, so off-screen messages cost nothing to lay out.
- The viewport has `overscroll-contain` and a bottom edge fade from the `scroll-fade-b` utility, a `mask-image` linear gradient defined in `packages/shadcn/src/tailwind.css`.
- The scroll-to-end button toggles on `data-active`: hidden is `translate-y-full scale-95 opacity-0` over 400 ms with `cubic-bezier(0.7, 0, 0.84, 0)`; shown uses `cubic-bezier(0.23, 1, 0.32, 1)` over 200 ms.

**Stick to bottom.** prompt-kit delegates to `use-stick-to-bottom` (`resize="smooth" initial="instant" role="log"`). The behaviour to reproduce: stay pinned while the user is at the bottom, stop the moment they scroll up, show the button.

```ts
// Sketch.
const pinned = useRef(true);
const onScroll = () => {
  const el = viewport.current!;
  pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  setShowJump(!pinned.current);
};
useEffect(() => {
  const ro = new ResizeObserver(() => {
    if (pinned.current) viewport.current!.scrollTop = viewport.current!.scrollHeight;
  });
  ro.observe(content.current!);          // fires as streamed text grows
  return () => ro.disconnect();
}, []);
```

Give the scroll container `role="log"`.

**Tool-call rows ("he opens it for you").** Kokonut `ai-tool-calls`: the list of calls opens with `height: 0` to `"auto"` plus opacity in 0.3 s; each row's status text swaps with the 2 px blur exchange from section 7; a later block (I read the motion calls, not the surrounding markup, so I take it to be the answer) arrives from opacity 0 with blur and a small `y` offset in 0.4 s after a 0.1 s delay. Combine with `StatusMark`: a row shows a running arc while the navigation happens and a drawn check when the page has opened.

**Attachment chip (shadcn).** `data-state` of `idle` gives a dashed border, `error` a red border, and the media thumbnail sits at 60% opacity until `done`. Use it for the CV inside the chat thread.

The composer (a pill that springs open into a card) and the send bubble are already specified in TEAM-BRIEF section 5 from his own approved demos. None of the libraries read here does those better, so follow the brief.

## 15. Celebration

| Verdict | Component | Reason |
|---|---|---|
| ADAPT | Magic UI `confetti` (wrapper around `canvas-confetti`) | Right mechanism; defaults are a multicolour shower |
| ADOPT (study) | React Bits `ClickSpark` | A self-contained canvas spark burst, no dependency. Has a `glow` prop: leave it at 0 |
| AVOID | Magic UI `cool-mode`, `sparkles-text`, `meteors`, `particles`; Animate UI `backgrounds/fireworks`, `effects/particles`; Kokonut `particle-button` | Judged by name: emoji or particle showers and sparkles |

**Burst from the element that earned it (Magic UI `ConfettiButton`).**

```ts
const r = button.getBoundingClientRect();
confetti({
  origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
  particleCount: 60, spread: 70, startVelocity: 32, scalar: 0.9,
  colors: [BRAND, INK, ACCENT],              // two or three Dalilak tokens, not the default rainbow
  disableForReducedMotion: true,
});
```

`canvas-confetti` is not installed; ask the lead. Confirmed in its README: `shapes` (built-in `square`, `circle`, `star`), `disableForReducedMotion`, `useWorker`, `confetti.shapeFromPath({ path })`, `confetti.shapeFromText`. `particleCount`, `spread`, `startVelocity`, `scalar` and `colors` are long-standing options that I did not re-check line by line. Magic UI's wrapper creates the instance with `confetti.create(canvas, { resize: true, useWorker: true })` and exposes `fire()` through a ref.

To make it Dalilak's own: one burst, about 60 pieces, brand colours only, launched from the "complete" button or the ring. `shapeFromPath` can turn the logo mark or a path-node shape into the confetti piece. Do not use `shapeFromText` with emoji.

**The celebration is mostly not confetti.** The idea file's principle is that the game reflects real progress. So the sequence on completing a course should be the product's own numbers moving, in order: the `StatusMark` check draws; XP counts up (section 6); a skill star fills; the match ring and its digits go from 70 to 90; the roadmap line extends to the next node (section 11); then one small burst. Each step is about 300-600 ms and they overlap slightly. Restraint in colour, richness in motion.

If the package is refused, `ClickSpark` shows the size of a hand-written version: an array of sparks with angle, speed and start time, drawn each frame on one canvas with an ease-out curve and optional gravity, capped at `MAX_BURSTS = 32`, with a short fallback under reduced motion.

## 16. AVOID index by library

Entries marked (name) were judged from the component's name in the repository listing without opening its source. The rest were opened.

| Library | Avoid |
|---|---|
| Magic UI | `animated-beam` moving gradient (keep the geometry), `bento-grid` dark inset glow, `dia-text-reveal`; (name) `animated-gradient-text`, `aurora-text`, `sparkles-text`, `animated-shiny-text`, `shimmer-button`, `shiny-button`, `rainbow-button`, `pulsating-button`, `shine-border`, `border-beam`, `neon-gradient-card`, `magic-card`, `meteors`, `particles`, `light-rays`, `backlight`, `ripple`, `retro-grid`, `warp-background`, `cool-mode`, `glare-hover` |
| Aceternity UI | `multi-step-loader` overlay, `timeline` gradient, `tracing-beam` gradient, `file-upload` background, `tabs` 3D stack, `placeholders-and-vanish-input`, `loader` dots; (name) `sparkles`, `spotlight`, `spotlight-new`, `glowing-stars`, `glowing-effect`, `background-beams`, `background-gradient`, `background-gradient-animation`, `aurora-background`, `wavy-background`, `meteors`, `moving-border`, `hover-border-gradient`, `lamp`, `vortex`, `glare-card`, `card-spotlight`, `shooting-stars`, `stars-background`, `dotted-glow-background`, `colourful-text`, `evervault-card`, `liquid-glass` |
| Motion Primitives | (name) `glow-effect`, `border-trail`, `spotlight`; for Arabic `text-morph`, `text-scramble` |
| Animate UI | (name) all `backgrounds/*` (`stars`, `gravity-stars`, `bubble`, `gradient`, `fireworks`, `hole`, `hexagon`), `texts/gradient`, `effects/shine`, `effects/particles`, `buttons/liquid` |
| React Bits | (name) the whole `Backgrounds` category (65 animated backgrounds such as `Aurora`, `Galaxy`, `Plasma`, `LiquidChrome`, `Iridescence`), `ElectricBorder`, `StarBorder`, `BorderGlow`, `GlowCursor`, `SplashCursor`, `MagicBento`, `SpotlightCard`, `HoloCard`, `GlassSurface`, `FluidGlass`, `GradientText`, `ShinyText`, `GlitchText`; `ThoughtLine` default sparkle glyph |
| Cult UI | (name) the `halo-*` family, `glow-button`, `border-beam-*`, `cosmic-button`, `bg-animated-gradient`, `gradient-heading`, `ai-blob-warp`, `hero-liquid-metal`, `distorted-glass`; `direction-aware-tabs` `mix-blend-difference` pill |
| Kokonut UI | for Arabic `ai-text-loading` per-letter wave; (name) `liquid-glass-card`, `gradient-button`, `particle-button`, `glitch-text`, the `*-background` components |
| prompt-kit | `DotsLoader`, `TypingLoader`, `TextDotsLoader` |
| SmoothUI | (name) `siri-orb`, `orb`, `ai-orb-face`, `glow-hover-card`, `holographic-foil`, `liquid-metal`, `border-beam`, `shine-text`, the shader transitions |

Overall impression by library, for where to look first when something new is needed:

- **Kokonut UI** and **React Bits `Micro`**: the most restrained and best-commented current work. Constants are named and explained, reduced motion is handled, and gesture code uses velocity. Look here first.
- **Motion Primitives**: small, readable, single-purpose. The best source for learning a technique.
- **shadcn/ui** and **Origin UI**: structure and accessibility with no decoration. Use for anatomy, not motion.
- **Animate UI**: strong primitives (`auto-height`, the icon pattern, `page-transition`); its backgrounds are decoration.
- **Cult UI**: good morphing work (`expandable-screen`, `morph-surface`, `family-drawer`); also a large glow family.
- **Magic UI**: a handful of durable basics (`marquee`, `animated-list`, `number-ticker`, `blur-fade`, `bento-grid`); most of the rest is the look he rejects.
- **Aceternity UI**: the highest share of rejected looks. Three ideas worth taking: the multi-step list, the upload morph, the scroll-filled timeline.

## 17. Not verified

- No demo was watched; no sketch in this file was run or typechecked. Check each on screen at 1440 and 390 px in RTL before relying on it.
- The RTL failure of horizontal marquees and of flex digit rows is reasoned from how flex layout works. The fixes are standard but were not rendered here.
- Whether Next 16.4 runs route navigations as view transitions without extra configuration.
- That `--active-tab-left` is measured from the tab list's left edge in RTL as well. The variable exists; its behaviour under `dir="rtl"` was not tested.
- Unopened sources that may be worth ten minutes: Cult UI `side-panel`, `floating-panel`, `loading-carousel`, `prompt-composer`; Motion Primitives `toolbar-expandable`, `morphing-popover`; Kokonut `ai-prompt`, `status-island`, `save-status`; React Bits Micro `PromptBar`, `HoldButton`, `SpringCheck`; SmoothUI `animated-stepper`, `fade-through`; shadcn/ui `sidebar` and the `apps/v4/registry/bases/base` variants built on Base UI.

## The 10 things most worth using in Dalilak

1. **Vertical CSS marquee columns of live product pieces** for the sign-in showcase (Magic UI `marquee`, section 3; cell contents from section 4). Three columns, alternating direction, different durations, each card a real Dalilak component running a small loop.
2. **`StatusMark` and `ThoughtLine`** (React Bits Micro, section 8) as the single visual language for anything in progress: the advisor's status line, tool-call rows, loader steps, upload state. Dashed ring, spinning arc, drawn check, strike-through, timer in tenths. Swap the sparkle glyph for the advisor's own.
3. **The scrolling step list driven by real stages with a minimum dwell** (Aceternity `multi-step-loader` with the overlay removed, section 8) for the path-reveal loading and the CV analysis.
4. **Blur into focus by block and by word, never by letter** (Magic UI `blur-fade`, Motion Primitives `text-effect`, prompt-kit `response-stream` with `Intl.Segmenter`, section 7) for every advisor reply and every reveal.
5. **Numbers that move: spring count-up for XP, rolling digits for level, streak, rank and match percent, and the ring** (section 6), all isolated with `dir="ltr"`.
6. **The drawn roadmap line with nodes and a marker placed by `getPointAtLength`** (SmoothUI `svg-draw-on-scroll`, section 11), and curved connectors computed between DOM nodes for the skill tree (Magic UI `animated-beam` geometry, gradient removed).
7. **Shared-element morph with the background-layer trick** (Motion Primitives `morphing-dialog`, Cult UI `expandable-screen`, section 13) for job, course and badge cards, and for the chat launcher growing into the chat panel with the advisor's glyph travelling across.
8. **CV upload that wakes on window drag, shows a hairline progress, and morphs into the document the analysis scans** (Kokonut `file-upload`, Origin UI `use-file-upload`, Aceternity's `layoutId` idea, section 9).
9. **`AnimatePresence` plus `layout` lists** (Magic UI `animated-list`, section 5) for skills appearing during analysis, matched jobs arriving, and leaderboard rows gliding to a new rank.
10. **A celebration made of the product's own numbers, ending in one small brand-coloured burst from the element that earned it** (section 15): check draws, XP counts, star fills, ring goes 70 to 90, the path extends, then confetti.

Next in line if time allows: the sliding active pill with `useId` and direction-aware panels using `mode="wait"` (section 12), the chat thread's `content-visibility` and stick-to-bottom behaviour (section 14), and `AnimateView` for route-level transitions (section 13).
