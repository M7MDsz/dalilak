# 21st.dev survey: what is best there now, and how each piece is built

Researcher note for the builders. Fetched 2026-11-18. Read section 0 once, then jump to the section you are building.

## 0. What was opened, what was not

**Opened (all public, no account):**
- 21st.dev markdown twins: 40 category listings (`/community/components/s/<tag>.md`, each shows the first 60 entries of its tag), about 250 component pages (`/@author/components/<slug>.md`: title, description, author, licence, npm dependencies), author and library index pages, and 37 of 21st's own blog guides (dated 2026-08-19 to 2026-08-21), which name the most-bookmarked component per category and criticise the category honestly.
- The embedded data of `/community/components/popular` (60 records with bookmark, like, download and view counts).

**Not available:**
- **Source code on 21st.dev itself.** `https://21st.dev/r/<author>/<slug>` answers `403 authentication_required` without an API key; a free account gets 2 code retrievals a day. No account or key was used. The REST API (`/api/v1/components/search`) also needs a key.
- **Live previews.** They are JavaScript iframes; nothing was watched in motion. Every statement below about how something feels is derived from the values in its source (durations, easings, spring constants, what is animated) or from the author's description. Treat them as a recipe, then look at the result yourself.

**Where the quoted code comes from.** Most strong components on 21st.dev are mirrors of open-source libraries. Code below is quoted from those upstream public sources, named on each quote, as they stood on 2026-11-18:

| Prefix used below | Upstream source | Read from |
|---|---|---|
| Motion Primitives (Julien Thibeaut, `@ibelick`) | `github.com/ibelick/motion-primitives`, `components/core/*.tsx` | raw GitHub |
| prompt-kit (same author) | `github.com/ibelick/prompt-kit`, `components/prompt-kit/*.tsx` | raw GitHub |
| Magic UI (Dillion Verma, `@dillionverma`) | `magicui.design/r/<name>.json` | public registry JSON |
| Aceternity UI (Manu Arora, `@manuarora700`) | `ui.aceternity.com/registry/<name>.json` | public registry JSON |
| Kokonut UI (Dorian Baffier, `@kokonutd`) | `github.com/kokonut-labs/kokonutui`, `components/kokonutui/*.tsx` | raw GitHub |
| cult/ui (`@cult-ui`) | `github.com/nolly-studio/cult-ui`, `apps/www/registry/default/ui/*.tsx` | raw GitHub |
| SmoothUI (Edu Calvo, `@educalvolpz`) | `github.com/educlopez/smoothui`, `packages/smoothui/components/*/index.tsx` | raw GitHub |
| shadcn-chat (Jakob Hoeg Mørk, `@jakobhoeg`) | `github.com/jakobhoeg/shadcn-chat`, `packages/ui/src/components/ui/chat/` | raw GitHub |
| AI Elements (Vercel, `@vercel-crawled`) | `github.com/vercel/ai-elements`, `packages/elements/src/*.tsx` | raw GitHub |
| ElevenLabs UI (`@ElevenLabs-crawled`) | `github.com/elevenlabs/ui` | raw GitHub |
| Agent Elements (21st, `@serafimcloud`) | `github.com/21st-dev/agent-elements` | raw GitHub |
| Trophy UI (`@trophyso`) | `github.com/trophyso/ui`, `apps/www/registry/trophy/ui/*.tsx` | raw GitHub |
| Fancy Components (Daniel Petho, `@danielpetho`) | `github.com/danielpetho/fancy` | raw GitHub |
| Prism UI (`@Codehagen`) | `github.com/Codehagen/prismui` | raw GitHub |
| Origin UI (`@originui`) | `github.com/origin-space/originui` | raw GitHub |
| Sonner (Emil Kowalski) | `github.com/emilkowalski/sonner`, `src/styles.css` | raw GitHub |

Two cautions. (1) The copy on 21st.dev can lag upstream: Kokonut UI rewrote most of its set in October 2026 ("version 2.0.0" headers), and 21st's description of *AI Text Loading* still says "shimmering gradient sweep" while upstream now does a per-letter opacity wave. (2) Where **no upstream source was located** for a component (DHxWhy, Jatin Yadav, Anurag Mishra, Victor Welander, dqnamo, Louis Studios and others), only the author's public description on 21st is reported and it is marked *description only*. Those descriptions are quoted, not verified against code.

**Licences.** 21st lists MIT for most of what is quoted here. It lists "unknown" or "no-license" for some (Trophy's pages, several cult/ui pages, cnippet, soralabs). Quotes are short excerpts to carry a technique; rebuild in Dalilak's own shapes, do not paste files.

**Every URL below is `https://21st.dev/` + the path shown**, and every path was fetched with a 200 unless it says otherwise.

## 1. Filters to apply before copying anything

### 1.1 Taste filter (TEAM-BRIEF section 2)

A large share of what is most bookmarked on 21st is exactly what Mohammed rejects. Named so nobody reaches for them:

| Popular on 21st | Why it fails the brief |
|---|---|
| Animated AI Chat (`@jatin-yadav05/components/animated-ai-chat`), "most saved" AI chat per 21st's guide | "glass-morphism design" in its own description |
| Spotlight Card (`@jahed/components/spotlight-card`), "most-bookmarked card" | "spotlight glow effect ... configurable hue" |
| Liquid Glass Button, Rainbow Button, Shimmer Button, Button Colorful | animated gradient or glow on the control |
| Thinking Pill (`@louisstudios/components/thinking-pill`), Thinking Orbs, AI Orb, Siri Orb | aurora or orb as the "AI" mark: the purple-gradient AI look |
| cult/ui "Halo" set (dropzone, notification, toast), Border Beam, Glow Effect, Magic Card | glowing rim or coloured glow follows the pointer |
| Aurora Background, Background Gradient Animation, Beams, Lamp, much of the `background` tag | tinted gradient or glow washes (16 of the 60 entries shown for that tag have "gradient", "glow", "aurora" or "nebula" in the name, and more are colour washes under other names) |
| Bounce Dots, Typing Indicator, Message loading | bouncing dots |
| Sparkles Text, any default `Sparkles` icon (Prism UI's Display Cards ships one as its default icon) | sparkle icons |

What survives the filter, and is used in the rest of this file: motion on position, size, blur-to-focus, shared-element morphs, drawn strokes, rolling digits, and flat patterns.

### 1.2 Arabic and RTL traps in these components

1. **Per-character text effects break Arabic.** Text Roll, Text Morph, Soft Blur In, Blur Reveal, Hyper Text, Text Scramble, Split Flap Text, Kokonut's AI Text Loading (per-letter wave) and Text Effect with `per="char"` wrap each character in its own `inline-block` span. Arabic letters join; isolated spans render as disconnected letter forms. **Split by word or by line only.** Safe as written: Text Effect `per="word"`/`per="line"`, Text Generate Effect, Per Word Crossfade, Vertical Cut Reveal `splitBy="words"`, prompt-kit Response Stream `mode="fade"` (it uses `Intl.Segmenter` with `granularity: "word"`), and every `background-clip: text` shimmer (no splitting at all).
2. **Split Flap and scramble effects carry a Latin character set** (`CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/&!?"` in Kokonut's Split Flap Text). Usable only for Latin digits.
3. **NumberFlow does not support RTL locales or non-Latin digits** (listed under limitations on `number-flow.barvian.me`). Dalilak uses Latin digits, so it works if the number sits in its own `dir="ltr"` inline box with `locales="en-US"`. Same wrapper for every digit roller in section 12.
4. **Horizontal direction is hard-coded in several places.** Flip these in RTL:
   - Shimmer: `backgroundPosition` runs `100% -> 0%`, so the light travels left to right. Reading direction in Arabic is right to left: animate `0% -> 100%`.
   - Hold-to-confirm fill: `clipPath: inset(0 ${(1 - p) * 100}% 0 0)` fills from the left. Use `inset(0 0 0 ${(1 - p) * 100}%)`.
   - Direction Aware Tabs: `x: 300 * direction`. Multiply by `-1`.
   - Horizontal Marquee: `translateX(calc(-100% - var(--gap)))` inside an RTL flex row scrolls content off into blank space. Put `dir="ltr"` on the marquee wrapper, or use the vertical variant (direction-neutral).
   - Progress fills and rails that use `origin-left` with `scaleX`: use `origin-right`, or animate `inline-size`.
5. **Direction-neutral as written:** anything driven by `layoutId` or `layout` (it measures boxes), the Dock (uses `pageX` and `getBoundingClientRect`), vertical marquees, Number Ticker.
6. **Avatar initials:** `name[0]` is wrong for Arabic with diacritics. 21st's avatar guide gives the fix: `new Intl.Segmenter("ar", { granularity: "grapheme" })` and take the first segment.

### 1.3 Mapping to Dalilak's stack

- Imports: upstream files that say `framer-motion` are older copies. Current upstream for every library above already imports from `motion/react`. Use that.
- Headless parts: prompt-kit, Origin UI and Aceternity lean on Radix (`@radix-ui/react-*`) and shadcn primitives (`@/components/ui/textarea`, `tooltip`, `collapsible`). Dalilak has Base UI; take the motion and the logic, wire them to Base UI or plain elements.
- Icons: every library imports `lucide-react` or `@tabler/icons-react`. Replace with Dalilak's own set. The useful icon *techniques* (a check that draws itself, an icon that cross-fades with blur) are in sections 6 and 7.
- Tailwind v4: Magic UI's registry already ships v4-style tokens. Example for Marquee: `--animate-marquee: marquee var(--duration) infinite linear;` goes in `@theme`, the `@keyframes` in the same CSS file.
- **Packages some recipes assume. None is required; each has a zero-dependency route named in its section.** If wanted, ask the lead: `@number-flow/react` (section 12), `canvas-confetti` + `@types/canvas-confetti` (section 16), `sonner` (section 17), `use-stick-to-bottom` (section 2), `react-use-measure` (sections 12, 13), `react-dropzone` (section 9, not needed).

### 1.4 The motion vocabulary the best sources share

The libraries that read as most crafted (Kokonut UI v2, SmoothUI, Motion Primitives, cult/ui) converge on a small set of values. Use these as Dalilak's tokens instead of inventing new ones per component.

| Use | Value | Seen in |
|---|---|---|
| Default ease-out | `cubic-bezier(0.23, 1, 0.32, 1)` | Kokonut UI (every v2 file: `EASE_OUT = [0.23, 1, 0.32, 1]`) |
| Softer hero ease-out | `cubic-bezier(0.22, 1, 0.36, 1)`, 900 ms | SmoothUI Soft Blur In ("Apple's signature ease-out") |
| Enter / exit asymmetry | enter 420 ms `[0.2, 0, 0, 1]`, exit 260 ms `[0.4, 0, 1, 1]` | SmoothUI Fade Through |
| Label swap inside a control | 200 ms, `y: 10 -> 0 -> -10`, `blur(2px) -> 0 -> blur(2px)`, `AnimatePresence mode="popLayout"` | Kokonut Hold Button, Particle Button |
| State icon swap | 180 ms opacity + `blur(2px)` | Kokonut AI Loading State |
| Drawn check | `pathLength 0 -> 1`, 300 ms, delay 50-100 ms | Kokonut (Hold Button, AI Loading) |
| Size change of a control | `{ type: "spring", duration: 0.35, bounce: 0 }` | Kokonut Particle Button (`WIDTH_TRANSITION`), File Upload |
| Morph pill to card | `{ type: "spring", duration: 0.45, bounce: 0.18 }` | Kokonut Status Island (`MORPH`) |
| Stiffer morph | `stiffness: 400, damping: 30` | cult/ui Dynamic Island |
| Sliding selection pill | `{ type: "spring", bounce: 0.19, duration: 0.4 }` | cult/ui Direction Aware Tabs |
| Digit roll | `{ type: "spring", stiffness: 280, damping: 18, mass: 0.3 }` | Motion Primitives Sliding Number, Text Morph |
| Count-up without overshoot | `useSpring(v, { damping: 60, stiffness: 100 })` | Magic UI Number Ticker |
| Dock magnify | `{ mass: 0.1, stiffness: 150, damping: 12 }` | Motion Primitives Dock |
| List item pop-in | `{ type: "spring", stiffness: 350, damping: 40 }`, `scale 0 -> 1` | Magic UI Animated List |
| Word stagger | 50 ms per word, 100 ms per line, 300 ms each | Motion Primitives Text Effect |
| Blur-in block | `y: 6px`, `blur(6px)`, 400 ms ease-out | Magic UI Blur Fade |

These sit comfortably next to the values the lead already recorded from a reference assistant (440 ms bubble pop on `cubic-bezier(0.34, 1.32, 0.64, 1)`, 560 ms blur-into-focus, 80 ms stagger).

Every Kokonut v2 and SmoothUI component also wraps itself in `<MotionConfig reducedMotion="user">` or branches on `useReducedMotion()`. Do the same once at the app shell.

## 2. AI chat interfaces and prompt inputs

21st's own guide (`/blog/ai-chat-ui-components-react`) says it plainly: of the public "ai chat" components "most of them are the input", and the hard part (streaming, autoscroll, stop) is not shipped by any of them. The components worth studying:

| Component | Author | Path | What it is |
|---|---|---|---|
| Prompt Input | Julien Thibeaut (prompt-kit) | `@ibelick/components/prompt-input` | compound composer: context + autosizing textarea + action slots |
| Response Stream | same | `@ibelick/components/response-stream` | typewriter or per-word fade for arriving text |
| Chat Container | same | `@ibelick/components/chat-container` | stick-to-bottom scroll area with `role="log"` |
| Steps | same | `@ibelick/components/steps` | collapsible list of operations with a connector bar |
| Loader | same | `@ibelick/components/loader` | 12 loader variants, including text shimmer and blinking text |
| Prompt Suggestion | same | `@ibelick/components/prompt-suggestion` | suggestion pills; a "highlight" mode bolds the typed part |
| AI Input With Loading, v0 AI Chat, AI Input | Kokonut UI | `@kokonutd/components/ai-input-with-loading`, `.../v0-ai-chat`, `.../ai-input` | composers; upstream `ai-prompt.tsx` is the current reference |
| AI Loading State | Kokonut UI | `@kokonutd/components/ai-loading` | agent step list with rail and rolling log (section 7) |
| Send Button, Input Bar, Agent Chat, Thinking Tool | 21st (Agent Elements) | `@serafimcloud/components/send-button`, `.../input-bar`, `.../agent-chat`, `.../thinking-tool` | plain, state-driven chat shell (idle / typing / streaming) |
| Chat Bubble, Chat Message List, Expandable Chat | Jakob Hoeg Mørk | `@jakobhoeg/components/chat-bubble`, `.../chat-message-list`, `.../expandable-chat` | transcript, auto-scroll hook, floating chat launcher |
| Message, Suggestion | Vercel (AI Elements) | `@vercel-crawled/components/message`, `.../suggestion` | upstream also has `reasoning`, `task`, `plan`, `shimmer`, `conversation` |
| Shimmering Text | ElevenLabs | `@ElevenLabs-crawled/components/shimmering-text` | shimmer with repeat delay and start-on-view |
| AI Task List, AI Response | Edu Calvo (SmoothUI) | `@educalvolpz/components/ai-task-list`, `.../ai-response` | plan checklist; streaming body with citations |
| Morph Surface | cult/ui | `@cult-ui/components/morph-surface` | pill that springs open into a textarea card |
| Agent Dock | dqnamo | `@dqnamo/components/agent-dock` | *description only*: dock with agent avatar, name, animated status line; "Clicking Chat expands an inline composer that springs open; submitting a message flips the status to a working state" |
| Thinking Prompt Input | DHxWhy | `@dhxwhy/components/thinking-prompt-input` | *description only*: "upward question-bubble transition, a Think toggle, Stop control, collapsible progress steps, elapsed time, and a streaming answer above the composer" |
| Streaming Caret | Aadi | `@aadixc0de/components/streaming-caret` | *description only*: "solid while tokens flow, a slow blink while it pauses, gone when the answer is done" |
| Questionnaire | Aadi | `@aadixc0de/components/questionnaire` | *description only*: "one question at a time with options and hints, number keys to pick, Skip and Skip all, and a step bar for how many are left". Relevant to Daleel's onboarding questions |

### 2.1 Autosizing composer (prompt-kit Prompt Input)

Why it feels right: the field never jumps a frame behind the keystroke, because the height is set in a layout effect, and the whole rounded container is a click target that focuses the textarea.

```tsx
// prompt-kit, components/prompt-kit/prompt-input.tsx (excerpt)
const adjustHeight = (el: HTMLTextAreaElement | null) => {
  if (!el || disableAutosize) return
  el.style.height = "auto"
  if (typeof maxHeight === "number") {
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  } else {
    el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`
  }
}
useLayoutEffect(() => { /* same three lines, on [value, maxHeight] */ }, [value, maxHeight, disableAutosize])

const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    onSubmit?.()
  }
  onKeyDown?.(e)
}
// container: "cursor-text rounded-3xl border p-2 shadow-xs", onClick -> textareaRef.current?.focus()
// textarea: rows={1}, "min-h-[44px] resize-none border-none bg-transparent", default maxHeight 240
```

Add what 21st's guide warns about and prompt-kit omits: check `e.nativeEvent.isComposing` before sending (IME input), and note that Chromium now does the growth in CSS with `field-sizing: content` plus a max height.

### 2.2 One button, two faces: Send becomes Stop (Kokonut UI `ai-prompt.tsx`)

The lead's notes describe the reference demo's button morphing between Send and Stop. Kokonut's version is the cheapest correct one: both glyphs are always mounted and cross-fade with 2 px of blur, so it reads as one control changing state. No `AnimatePresence`, pure CSS.

```tsx
// Kokonut UI, components/kokonutui/ai-prompt.tsx (excerpt)
const face =
  "absolute inset-0 flex items-center justify-center transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]";
<button
  aria-label={responding ? "Stop response" : "Send message"}
  className={cn("relative size-8 shrink-0 rounded-full",
    "transition-[background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
    // Fills in once there is something to send, so the button says "ready" before it is pressed.
    responding || canSend ? "bg-black text-white hover:bg-black/80" : "bg-black/5 text-black/30")}
  disabled={!(responding || canSend)}
  onClick={responding ? onStop : onSend}
>
  <span aria-hidden className={cn(face, responding ? "opacity-0 blur-[2px]" : "opacity-100 blur-0")}>
    <ArrowUp className="size-4" strokeWidth={2.25} />
  </span>
  <span aria-hidden className={cn(face, responding ? "opacity-100 blur-0" : "opacity-0 blur-[2px]")}>
    <span className="size-2.5 rounded-[2px] bg-current" />
  </span>
</button>
```

21st's own Agent Elements Send Button (`lib/agent-ui/components/input/send-button.tsx`) confirms the state model, three states `"idle" | "typing" | "streaming"`: muted with a grey arrow when empty, filled when there is text, a filled stop square while streaming. It swaps nodes with no transition; Kokonut's cross-fade is the better feel.

### 2.3 Pill that springs open into a card (cult/ui Morph Surface)

This is the closest published match to "a 48 px pill that springs open into a card when focused". One `motion.div` animates `width`, `height` and `borderRadius` together on a stiff, well-damped spring, and the inner content fades in after.

```tsx
// cult/ui, registry/default/ui/morph-surface.tsx (values, excerpt)
// collapsedHeight = 44, expanded 360 x 200
animate={{
  width: showFeedback ? hookExpandedWidth : collapsedWidth,
  height: showFeedback ? hookExpandedHeight : hookCollapsedHeight,
  borderRadius: showFeedback ? 14 : 20,
}}
transition={{ type: "spring", stiffness: 550 / animationSpeed, damping: 45, mass: 0.7,
              delay: showFeedback ? 0 : 0.08 }}                 // animationSpeed = 1; closing waits 80 ms
// the trigger's mark uses a softer spring (stiffness 350, damping 35); the success check a livelier one (stiffness 500, damping 22)
```

Stiffness 550 with damping 45 and mass 0.7 is overdamped: it lands fast with no overshoot. That is the right register for a composer; keep the bounce for celebration moments. The 80 ms delay on closing lets the inner content fade first, so the card never shrinks around visible text.

### 2.4 Text that arrives: per-word fade (prompt-kit Response Stream)

Two modes. `typewriter` slices the string on `requestAnimationFrame`. `fade` is the one that matches "an answer that blurs into focus": each word is its own span with a CSS fade and an increasing delay. Works for Arabic because it splits by word with `Intl.Segmenter`.

```tsx
// prompt-kit, components/prompt-kit/response-stream.tsx (excerpt)
const segmenter = new Intl.Segmenter(navigator.language, { granularity: "word" })
const newSegments = Array.from(segmenter.segment(text)).map((s, index) => ({ text: s.segment, index }))

// speed 1..100 maps to: fade duration = round(1000 / sqrt(speed)) ms, delay per segment = round(100 / sqrt(speed)) ms
const fadeStyle = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-segment { display: inline-block; opacity: 0; animation: fadeIn ${getFadeDuration()}ms ease-out forwards; }
  .fade-segment-space { white-space: pre; }
`
{segments.map((segment, idx) => (
  <span key={`${segment.text}-${idx}`}
        className={cn("fade-segment", /^\s+$/.test(segment.text) && "fade-segment-space")}
        style={{ animationDelay: `${idx * getSegmentDelay()}ms` }}>
    {segment.text}
  </span>
))}
```

At the default `speed = 20` that is a 224 ms fade with 22 ms between words. For Dalilak add `filter: blur(4px)` and `translateY(4px)` to the `from` frame. Two cautions from the code: the key includes the index, so a re-segmented stream re-mounts nothing that already appeared (good); but `animationDelay: idx * delay` grows without bound on a long answer, so apply the staggered delay per block (paragraph, card), not across the whole message.

### 2.5 The shimmer status label (one technique, three copies)

Motion Primitives Text Shimmer (`@ibelick/components/text-shimmer`), AI Elements `shimmer.tsx` and ElevenLabs Shimmering Text are the same idea: two stacked backgrounds clipped to the text. The bottom layer is the flat base colour, the top layer is a narrow highlight band in a `250%`-wide box whose `backgroundPosition` slides. The band width scales with the text length so short and long labels sweep at the same visual width.

```tsx
// Motion Primitives, components/core/text-shimmer.tsx (excerpt)
const dynamicSpread = useMemo(() => children.length * spread, [children, spread]) // spread = 2
<MotionComponent
  className={cn(
    "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
    "[--base-color:#a1a1aa] [--base-gradient-color:#000] [background-repeat:no-repeat,padding-box]",
    "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]")}
  initial={{ backgroundPosition: "100% center" }}
  animate={{ backgroundPosition: "0% center" }}
  transition={{ repeat: Infinity, duration, ease: "linear" }}   // duration = 2
  style={{ "--spread": `${dynamicSpread}px`,
           backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))` }}
>
```

Variations worth taking: ElevenLabs adds `repeatDelay: 0.5` (a pause between sweeps reads calmer than a continuous one) and fades the label in over 300 ms. AI Elements uses `duration={1}` for "Thinking...". prompt-kit has a CSS-only version (`animate-[shimmer_4s_infinite_linear]` on `bg-size-[200%_auto]`, with the band clamped between 5% and 45%). This is neutral light on neutral text, not a colour wash, and it does not split characters, so it is safe for Arabic. Reverse the direction for RTL (1.2). The lead's notes ask for a 2.4 s sweep in step with Daleel's glyph: set `duration: 2.4`.

AI Elements' `reasoning.tsx` adds the behaviour around it: open while streaming, measure the duration, then auto-close 1000 ms after streaming ends (`AUTO_CLOSE_DELAY = 1000`) and replace the shimmer with "Thought for N seconds". Kokonut's AI Text Loading has an optional `showElapsed` that prints seconds in `tabular-nums` beside the label, updated every 500 ms.

### 2.6 Autoscroll that respects the reader

prompt-kit delegates to a package; shadcn-chat hand-rolls it. Both encode the rule from 21st's guide: follow the stream only while pinned to the bottom.

```tsx
// prompt-kit, components/prompt-kit/chat-container.tsx (excerpt). Needs the `use-stick-to-bottom` package.
<StickToBottom className={cn("flex overflow-y-auto", className)} resize="smooth" initial="instant" role="log">
```

```tsx
// shadcn-chat, packages/ui/src/components/ui/chat/hooks/useAutoScroll.tsx (excerpt). Zero dependencies.
const checkIsAtBottom = (element: HTMLElement) => {
  const { scrollTop, scrollHeight, clientHeight } = element
  return Math.abs(scrollHeight - scrollTop - clientHeight) <= offset   // offset = 20
}
// on scroll: isAtBottom = check(); autoScrollEnabled = atBottom ? true : prev
// on new content height: if (autoScrollEnabled) requestAnimationFrame(() => scrollToBottom(firstRender))
// a ResizeObserver on the container re-pins when the composer grows
```

From 21st's guide, the bug everyone ships first: programmatic scrolling fires the same `scroll` event a person does. Guard the programmatic call with a flag, or treat `wheel` and `touchmove` as the signal of real intent (shadcn-chat exposes `disableAutoScroll` for exactly those handlers). Also from the guide: keep the in-flight message in its own component, memoise finished messages by id, and batch chunks on an animation frame.

### 2.7 Opening the chat

- **Expandable Chat** (`@jakobhoeg/components/expandable-chat`): the baseline launcher. Closed is `opacity-0 invisible sm:translate-y-5 pointer-events-none`, open is `opacity-100 visible translate-y-0`, on `transition-all duration-250 ease-out`; on phones the panel is `fixed inset-0`. That is the same register as the the reference demo panel in the lead's notes (opacity plus a short slide). It transitions `all`, which also animates `visibility`; list the properties instead.
- **Shared-element morph** (cult/ui Expandable Screen, upstream only; Motion Primitives Morphing Dialog `@ibelick/components/morphing-dialog`; cult/ui Floating Panel `@cult-ui/components/floating-panel`): the launcher and the panel share a `layoutId`, so the button itself grows into the panel. This is the richer option if the lead wants the chat to open *out of* Daleel's button.

```tsx
// cult/ui, registry/default/ui/expandable-screen.tsx (excerpt)
// trigger: a background layer that carries the layoutId, content above it that fades
{!isExpanded && (
  <motion.div className="relative inline-block">
    <motion.div style={{ borderRadius: triggerRadius }} layout layoutId={layoutId}
                className="absolute inset-0 transform-gpu will-change-transform" />
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }} exit={{ opacity: 0, scale: 0.8 }} layout={false} onClick={expand}>
      {children}
    </motion.div>
  </motion.div>
)}
// content: the same layoutId on the big surface, its children fade in late
<motion.div layoutId={layoutId} transition={{ duration: animationDuration }}   // 0.3
            style={{ borderRadius: contentRadius }} layout>
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}>
```

The trick that keeps it clean: **only an empty background layer morphs**; the label and the panel content are separate layers that fade (`layout={false}`), so text never stretches. `borderRadius` is set through `style`, which lets Motion correct the radius during the scale. Floating Panel uses `{ type: "spring", bounce: 0.1, duration: 0.4 }` for the same morph, radius 8 to 12.

### 2.8 Rules lifted from 21st's guides (chat)

- The waiting indicator belongs "in the transcript, in the position the message will occupy", so nothing jumps when the message lands (`/blog/react-typing-indicator-components`).
- Cap it: "Ten to fifteen seconds, then fall back to a neutral state or an error."
- Honesty: "If the model has not started, say queued. If a tool is running, say which." This matches the rolling status line the lead wants: name the real step (reading the CV, matching jobs, opening the roadmap).
- Announce once in a polite live region, on appearance and disappearance; `role="log"` on the transcript; never announce per token.
- Stop keeps the partial text and marks it stopped.

## 3. Sign-in showcase and hero sections with moving product pieces

21st's guide on looking generated (`/blog/website-not-look-ai-generated`) names the first tell as "The gradient hero. Purple to blue, centred headline, two buttons, a soft glow behind" and the first fix as "Show the product ... A page that shows the interface cannot look generic". That is the brief for Dalilak's right-hand panel: real Dalilak pieces in motion, not artwork.

Split-screen rules from `/blog/split-screen-layout-components`, all relevant to the sign-in page:
- "The form half owns the heading": the `h1` goes with the form.
- "`100vh` includes the browser chrome ... `100dvh` is the fix, with `min-height` rather than `height`."
- On a phone the message comes first; write the markup in reading order (CSS `order` does not change tab order). The login guide adds that on a phone the showcase panel "has to disappear entirely rather than stack".
- The decorative half is `aria-hidden` with empty alts.

Sign-in layouts found (all read as *description only*; none has moving product pieces, they use an image, a testimonial or a gradient panel): Sign In Split Screen `@felipemenezes098/components/sign-in-6` ("branded gradient panel"), Split Sign In Form `@diarmuradi/components/sign-in-3` (testimonial panel), Split Login `@mohammadshehadeh/components/login-03` ("decorative animated-paths aside ... token-based radial glows"), Auth Page `@efferd/components/auth-page` ("floating animated background"), Travel Connect Signin `@coderislive07/components/travel-connect-signin-1` (dot world map with route lines). **No sign-in on 21st does what Mohammed asked for.** Build the right half from the showcase mechanisms below.

| Mechanism | Component | Author | Path |
|---|---|---|---|
| Endless columns of cards | Marquee | Dillion Verma (Magic UI) | `@dillionverma/components/marquee` |
| Tilted plane of drifting columns | 3D Marquee | Manu Arora (Aceternity) | `@manuarora700/components/3d-marquee` |
| Rows of product shots moving with scroll | Hero Parallax | Manu Arora | `@manuarora700/components/hero-parallax` |
| Items popping into a feed | Animated List | Dillion Verma | `@dillionverma/components/animated-list` |
| Deck that cycles its front card | Card Stack | Manu Arora | `@manuarora700/components/card-stack` |
| Three skewed cards fanned on one grid cell | Display Cards | Prism UI | `@Codehagen/components/display-cards` |
| Feed where each item acts out its news | Live Notification Feed | DHxWhy | `@dhxwhy/components/live-notification-feed` (*description only*) |
| Line of light between nodes | Animated Beam | Dillion Verma | `@dillionverma/components/animated-beam` (section 10) |

### 3.1 Marquee: two CSS keyframes, no frame loop

```tsx
// Magic UI, registry/magicui/marquee.tsx (excerpt)
<div className={cn("group flex gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
                   { "flex-row": !vertical, "flex-col": vertical }, className)}>
  {Array(repeat).fill(0).map((_, i) => (            // repeat = 4 copies of the children
    <div key={i} className={cn("flex shrink-0 justify-around gap-(--gap)", {
      "animate-marquee flex-row": !vertical,
      "animate-marquee-vertical flex-col": vertical,
      "group-hover:[animation-play-state:paused]": pauseOnHover,
      "[animation-direction:reverse]": reverse,
    })}>{children}</div>
  ))}
</div>
```
```css
/* same registry item: Tailwind v4 tokens */
@theme { --animate-marquee-vertical: marquee-vertical var(--duration) linear infinite; }
@keyframes marquee-vertical { from { transform: translateY(0); } to { transform: translateY(calc(-100% - var(--gap))); } }
```

Why it is seamless: each copy travels exactly its own height plus one gap, so when it wraps, the next copy sits where it started. Why it is right for a live demo: the compositor runs it, so it keeps moving while the main thread is busy, and it costs nothing when the laptop is under memory pressure. For the sign-in panel: three vertical columns at different `--duration` values (for example 38 s, 52 s, 44 s), the middle one with `reverse`, each holding small real Dalilak pieces (a job card with a match ring, a skill row with stars, a roadmap node, a badge, a leaderboard row). Mask the top and bottom edges with `mask-image: linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)`.

### 3.2 3D Marquee: the same columns on a tilted plane

```tsx
// Aceternity UI, components/ui/3d-marquee.tsx (excerpt)
<div className="size-[1720px] shrink-0 scale-50 sm:scale-75 lg:scale-100">
  <div style={{ transform: "rotateX(55deg) rotateY(0deg) rotateZ(-45deg)" }}
       className="relative top-96 right-[50%] grid size-full origin-top-left grid-cols-4 gap-8 transform-3d">
    {chunks.map((subarray, colIndex) => (
      <motion.div key={colIndex + "marquee"}
        animate={{ y: colIndex % 2 === 0 ? 100 : -100 }}
        transition={{ duration: colIndex % 2 === 0 ? 10 : 15, repeat: Infinity, repeatType: "reverse" }}
        className="flex flex-col items-start gap-8">
```

It is not an endless scroll: each column drifts 100 px and back (`repeatType: "reverse"`), alternate columns in opposite directions at 10 s and 15 s. So it needs only about a dozen tiles, and tiles hover up 10 px. The isometric tilt (`rotateX(55deg) rotateZ(-45deg)`) is what gives depth without any glow. It takes images upstream; in Dalilak feed it live components or screenshots made with `npm run shot`.

Hero Parallax (same author) is the scroll-driven cousin: three rows on springs (`stiffness: 300, damping: 30`), `translateX` 0 to +/-1000 px across the scroll, and the plane un-tilts in the first 20% of the scroll (`rotateX 15 -> 0`, `rotateZ 20 -> 0`, `opacity 0.2 -> 1`, `translateY -700 -> 500`). 21st's guide warns it "wants a lot of images, ideally a dozen or more". A sign-in page does not scroll, so prefer 3.1 or 3.2 there.

### 3.3 Animated List: a feed that fills itself

```tsx
// Magic UI, registry/magicui/animated-list.tsx (excerpt)
const animations: MotionProps = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, originY: 0 },
  exit: { scale: 0, opacity: 0 },
  transition: { type: "spring", stiffness: 350, damping: 40 },
}
// <motion.div {...animations} layout> per item
// every `delay` ms (default 1000) index++ ; itemsToShow = childrenArray.slice(0, index + 1).reverse()
```

The newest item scales in at the top from its top edge (`originY: 0`) and `layout` pushes the older ones down. Use it for "what Dalilak does" told as events: +100 XP, skill found in the CV with its evidence sentence, match 70% to 90%, application sent. It stops at the last item (no loop); for a sign-in page that stays open, restart it or loop the data.

### 3.4 Card Stack and Display Cards

```tsx
// Aceternity UI, components/ui/card-stack.tsx (excerpt). CARD_OFFSET = 10, SCALE_FACTOR = 0.06, every 5000 ms
setCards((prev) => { const next = [...prev]; next.unshift(next.pop()!); return next })
<motion.div key={card.id} style={{ transformOrigin: "top center" }}
  animate={{ top: index * -CARD_OFFSET, scale: 1 - index * SCALE_FACTOR, zIndex: cards.length - index }} />
```

The array rotates; because each card keeps its `key`, Motion animates every card to its new slot. Note it animates `top` (layout); use `y` instead. Display Cards is pure CSS: all cards share one grid cell (`grid [grid-template-areas:'stack']`, each `[grid-area:stack]`), are skewed `-skew-y-[8deg]`, offset `translate-x-12 translate-y-10` then `translate-x-24 translate-y-20`, the back ones greyscale with a `before:` veil, and each lifts on hover (`hover:-translate-y-10`, `duration-700`). Its default icon is a sparkle: replace it.

## 4. Backgrounds that are not glow or gradient washes

21st's two guides (`/blog/react-background-pattern-components`, `/blog/react-animated-background-components`) are the best material here. Their audit of all 155 "background" components: "67 run a continuous frame loop, and 6 of those stop when the tab is hidden or the element scrolls out of view. Five check `prefers-reduced-motion`", and of the 41 canvas ones "14 scale for `devicePixelRatio` and none of them cap it". Their conclusion fits Dalilak and a memory-starved laptop: "A pattern is one paint and no frame loop ... the correct amount of visual interest for a place nobody should be looking."

| Component | Author | Path | Kind |
|---|---|---|---|
| Tailwind CSS Background Snippet (dark), Light theme ... Snippet | Julien Thibeaut | `@ibelick/components/tailwind-css-background-snippet`, `@ibelick/components/light-theme-tailwind-css-background-snippet` | one-declaration CSS grids and dots |
| Grid Pattern, Dot Pattern, Striped Pattern | Dillion Verma | `@dillionverma/components/grid-pattern`, `.../dot-pattern`, `.../striped-pattern` | SVG `<pattern>`, static |
| Animated Grid Pattern, Flickering Grid | Dillion Verma | `@dillionverma/components/animated-grid-pattern`, `.../flickering-grid` | cells that light up (SVG + Motion; canvas) |
| Dot Grid | halaska-studio | `@halaska-studio/components/dot-grid` | static dots filling the nearest positioned parent |
| Dot Matrix | bagherifarzad | `@bagherifarzad/components/dot-matrix` | "radial-gradient dot grid background with an optional radial fade mask" |
| Background Paths | Kokonut UI | `@kokonutd/components/background-paths` | "most bookmarked background" per 21st; animated SVG lines |
| Floating paths | Bundui.io | `@bundui/components/floating-paths` | minimal animated paths |
| Sonar Grid | NIMA MZ | `@n1m4mz/components/sonar-grid` | *description only*: canvas dot grid, "sonar rings expand where you tap ... still under reduced motion" |
| Kinetic Grid | satoriui | `@satoriui/components/kinetic-grid` | *description only*: dot grid that bends toward the cursor |

### 4.1 The CSS versions (use these first)

```html
<!-- ibelick/background-snippets, app/components/background.tsx (three of its entries) -->
<!-- dots, faded to the edges -->
<div class="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]
            [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
<!-- fine line grid, 14 x 24, almost invisible -->
<div class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
<!-- large editorial grid -->
<div class="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
```

The two refinements 21st's guide names: "Mask the pattern with a radial gradient so it fades out toward the edges", and "keep the contrast very low - a pattern you notice is a pattern competing with the text". The same repository also contains radial colour washes (`#63e`, violet blobs with `blur-[80px]`): skip those entries. Mark the layer `aria-hidden` and check text contrast on the busiest part of the pattern.

### 4.2 SVG pattern with highlighted cells (Magic UI Grid Pattern)

```tsx
// Magic UI, registry/magicui/grid-pattern.tsx (excerpt)
<svg aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30", className)}>
  <defs>
    <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
      <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
    </pattern>
  </defs>
  <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
  {squares && <svg x={x} y={y} className="overflow-visible">
    {squares.map(([x, y]) => <rect strokeWidth="0" key={`${x}-${y}`} width={width - 1} height={height - 1} x={x * width + 1} y={y * height + 1} />)}
  </svg>}
</svg>
```

One `<pattern>` cell (an L-shaped path) tiles the whole area; `squares` fills chosen cells. This gives a designed, map-like ground for the roadmap and skill tree: fill the cells under the user's path. `strokeDasharray="4 2"` gives a dashed grid. Animated Grid Pattern is the same grid with a handful of cells fading in and out via Motion; if used, keep it to one screen and pause it off-screen.

### 4.3 If a background must move

Rules from 21st's audit, in its words: pause off-screen ("An `IntersectionObserver` around the loop is six lines"), respect reduced motion by painting one frame and stopping, start after first paint, and clamp the canvas backing store with `Math.min(window.devicePixelRatio, 1.5)`. Kokonut's v2 Background Paths exposes `count`, `spread`, `angle`, `speed` ("0 holds it still") and parts the lines around the cursor; its `ai-loading.tsx` shows the pause pattern in a few lines (`new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting))`).

## 5. Cards

From `/blog/react-card-components`: "Almost all of the variety is in the surface treatment. Almost all of the failures are in the content." The rules to apply to job, course and skill cards: fix the media aspect ratio, clamp the title to 2 lines and the body to 3, decide the no-image state in advance, and make the whole card clickable with the stretched link:

```css
/* 21st blog, /blog/react-card-components */
.card { position: relative; }
.card a::after { content: ""; position: absolute; inset: 0; }
/* a real button inside needs position: relative and a higher z-index */
```

| Component | Author | Path | Take |
|---|---|---|---|
| Tilt | Julien Thibeaut | `@ibelick/components/tilt` | pointer-driven 3D tilt on springs; no glow involved |
| Card Stack, Display Cards | Manu Arora, Prism UI | section 3.4 | depth for a sequence |
| Morphing Dialog | Julien Thibeaut | `@ibelick/components/morphing-dialog` | card expands into a detail view via shared `layoutId`s (card, title, subtitle, image each have one) |
| Expandable | cult/ui | `@cult-ui/components/expandable` | card that grows in place (uses `react-use-measure`) |
| Shift Card | cult/ui | `@cult-ui/components/shift-card` | content shifts to reveal a second layer on hover |
| Texture Card | cult/ui | upstream only (`texture-card.tsx`); no 21st page found | nested 1 px borders that fake a machined edge |
| Course Design Cards | kristen17 | `@kristen17/components/course-design-cards` | first item in the `card` listing; *description only* ("Here is Course Design Cards component"), licence unknown |
| Achievement badge, Achievement Card | Trophy | `@trophyso/components/achievement-badge`, `.../achievement-card` | locked / earned / progress / rarity states (section 11) |
| Job Listing | Edu Calvo | `@educalvolpz/components/job-listing` | *description only* (deps: `motion`, `usehooks-ts`); upstream example exists at `apps/docs/examples/job-listing-component.tsx`, not read |

### 5.1 Tilt

```tsx
// Motion Primitives, components/core/tilt.tsx (excerpt)
const x = useMotionValue(0), y = useMotionValue(0)
const xSpring = useSpring(x, springOptions), ySpring = useSpring(y, springOptions)
const rotateX = useTransform(ySpring, [-0.5, 0.5], [-rotationFactor, rotationFactor])   // rotationFactor = 15
const rotateY = useTransform(xSpring, [-0.5, 0.5], [rotationFactor, -rotationFactor])
const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
const handleMouseMove = (e) => {
  const rect = ref.current.getBoundingClientRect()
  x.set((e.clientX - rect.left) / rect.width - 0.5)
  y.set((e.clientY - rect.top) / rect.height - 0.5)
}
// onMouseLeave: x.set(0); y.set(0)   style={{ transformStyle: "preserve-3d", transform }}
```

For Dalilak use a small factor (4 to 6 degrees) on the path-reveal card and on badges; 15 is a toy. 21st's guide adds two limits: pointer effects do not exist on touch ("the phone version has to be designed, not inherited"), and in a grid "track on the container instead and pass the coordinates down" rather than one listener per card.

### 5.2 Nested-border surface (cult/ui)

cult/ui's Family Button and Texture Card build a "machined" edge from concentric 1 px borders with radii stepping down by one: `rounded-[24px] border border-black/10` > `rounded-[23px] border border-black/10` > `rounded-[22px] border border-white/50` > `rounded-[21px] border border-neutral-950/20`. A light line between two dark lines reads as a bevel. It is decoration by line, not by glow, and fits "restraint in colour, richness in detail" for hero cards (path reveal, level-up).

## 6. Buttons with tactile press

From `/blog/react-button-components`: one primary per view; six states of which most components ship three; "press feedback belongs on `:active`, and a transform is the cheapest honest signal"; a loading state must not change the width; `backdrop-filter` is "the single most expensive common CSS property".

| Component | Author | Path | What makes the press |
|---|---|---|---|
| Texture Button | cult/ui | `@cult-ui/components/texture-button` | two layers: a 1 px gradient rim (outer, `p-[1px]`) and a vertical-gradient face (inner); `:active` flattens the face gradient |
| Neumorph Button | cult/ui | upstream only (`neumorph-button.tsx`) | an inset bottom shadow that shrinks on press |
| Button Retro | Serafim | `@serafimcloud/components/button-retro` | *description only*; licence unknown |
| Hold and Release Button | Kokonut UI | `@kokonutd/components/hold-and-release-button` | press-and-hold fill, then a drawn check |
| Particle Button | Kokonut UI | `@kokonutd/components/particle-button` | async status: label to spinner to drawn check plus a small chip burst, or shake on error |
| Ripple Button | Dillion Verma | `@dillionverma/components/ripple-button` | ripple from the click point |
| Stateful Button | Manu Arora | Aceternity registry only (`stateful-button`); not found under that name in the Aceternity index on 21st | loader then check slide in beside the label |
| Morph Confirm | sidiora-labs | `@sidiora-labs/components/morph-confirm` | *description only*: "morphs in place into an inline confirmation card" |
| Undo Countdown Button | DHxWhy | `@dhxwhy/components/undo-countdown-button` | *description only*: turns into "Undo - 5s" with a shrinking bar; commits when the window closes |
| Family Button | cult/ui | `@cult-ui/components/family-button` | 64 px tile springs open to 200 x 250 (`damping: 25, stiffness: 400`), toggle icon rotates 360 in 400 ms |

### 6.1 The pressed-shadow recipe (cult/ui Neumorph Button)

```ts
// cult/ui, registry/default/ui/neumorph-button.tsx (the "default" intent, excerpt)
"transition-[box-shadow,background-color] active:transition-none",
"bg-[#36322F] text-[#fff] hover:enabled:bg-[#4a4542]",
"[box-shadow:inset_0px_-2.108px_0px_0px_#171310,_0px_1.204px_6.325px_0px_rgba(58,_33,_8,_58%)]",
"hover:enabled:[box-shadow:inset_0px_-2.53px_0px_0px_#171310,_0px_1.445px_7.59px_0px_rgba(58,_33,_8,_64%)]",
"active:bg-[#2A2724]",
"active:[box-shadow:inset_0px_-1.5px_0px_0px_#171310,_0px_0.5px_2px_0px_rgba(58,_33,_8,_70%)]",
```

Three details carry the feel. The button has a dark inset line along its bottom edge (its "thickness"); hover makes it 0.4 px thicker and lifts the drop shadow; press makes it thinner and collapses the drop shadow from 6.3 px blur to 2 px, so the key visibly travels down. And **`active:transition-none`**: the press is instant, only the release is eased. That asymmetry is what makes it feel mechanical. The drop shadow here is a tinted brown; in Dalilak keep the structure and use a neutral shadow (coloured glow shadows are on the rejected list). Add `active:translate-y-px` for a clearer travel.

### 6.2 Hold to confirm (Kokonut UI Hold Button)

A strong fit for "let Daleel apply for me": a deliberate gesture for a consequential action, with no dialog.

```tsx
// Kokonut UI, components/kokonutui/hold-button.tsx (excerpt). holdDuration = 1200, DRAIN_MS = 300, LABEL_DELAY_MS = 150
const progress = useMotionValue(0)
const clipPath = useTransform(progress, (p) => `inset(0 ${(1 - p) * 100}% 0 0)`)

const startHold = () => {
  updatePhase("holding")
  const remaining = (1 - progress.get()) * holdDuration            // picks up from wherever a drain left the fill
  animationRef.current = animate(progress, 1, { duration: remaining / 1000, ease: "linear",
    onComplete: () => { if (phaseRef.current === "holding") complete() } })
}
const endHold = () => {
  updatePhase("idle")
  animationRef.current = animate(progress, 0, {                    // a near miss visibly unwinds; a short tap barely moves
    duration: shouldReduceMotion ? 0 : (progress.get() * DRAIN_MS) / 1000, ease: EASE_OUT })
}
// fill layer: <motion.span className="absolute inset-0 bg-current/15" style={{ clipPath }} />
// label: AnimatePresence mode="popLayout"; y 10 -> 0 -> -10 with blur(2px), 200 ms; "complete" shows a check drawn with pathLength
```

What makes it feel good: the fill is the button's own ink at 15%, revealed by `clip-path` (no layout, no extra colour); the drain time is proportional to how far the fill got; the "Keep holding" label waits 150 ms so a quick tap does not flicker it; on completion the whole button turns solid and the label rolls to a check that draws itself. It also handles Space and Enter (`e.repeat` ignored), releases implicit touch pointer capture so sliding off cancels, and announces completion in a polite live region. Flip the inset for RTL (1.2).

### 6.3 Async status with a small burst (Kokonut UI Particle Button)

Return a promise from `onClick`; the label cross-fades to a spinner, then to a drawn check with a burst, or shakes on error (`SHAKE = { x: [0, -5, 5, -3, 3, 0] }`). The width follows each label on `{ type: "spring", duration: 0.35, bounce: 0 }`. The burst is 18 chips of the button's own colour on one canvas that unmounts when done:

```ts
// Kokonut UI, components/kokonutui/particle-button.tsx (excerpt)
const PARTICLE_COUNT = 18, GRAVITY = 0.0016 /* px per ms^2 */, DRAG = 0.0022, LIFETIME = 650, BLEED = 64
// create: spread across the top edge, biased toward the press point; every third is a 5x2 chip, the rest 3x3
const speed = 0.18 + Math.random() * 0.22
const angle = -Math.PI / 2 + side * Math.random() * 0.9
// tick, per frame (dt clamped to 32 ms):
ctx.globalAlpha = 1 - t * t                              // t = elapsed / LIFETIME
p.vx *= 1 - DRAG * dt
p.vy = p.vy * (1 - DRAG * dt) + GRAVITY * dt
p.x += p.vx * dt;  p.y += p.vy * dt;  p.angle += p.spin * dt
ctx.translate(p.x + BLEED, p.y + BLEED); ctx.rotate(p.angle); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
```

This is the right scale of celebration for frequent wins (course step done, +XP): local, 650 ms, one colour, no library. Keep full-screen confetti for the two or three real moments (section 16).

### 6.4 Ripple (Magic UI) and loader-in-button (Aceternity)

Ripple: on click compute `size = max(width, height)`, `x = clientX - rect.left - size / 2`, append a span `scale(0) -> scale(2)` with `opacity 1 -> 0` over 600 ms (`rippling var(--duration) ease-out`), remove it on a timeout. Stateful Button: the spinner and the check start at `width: 0, scale: 0, display: none` inside a `layout` container and animate to `width: 20px, scale: 1` in 200 ms, so the label slides aside instead of jumping; the check leaves after a 2 s delay. Both are fine; the Kokonut pair above is more finished.

## 7. Loaders and multi-step loading sequences

This is the section that matters most for the path-reveal loading and the CV analysis. From `/blog/react-loader-components`: "A loader is an apology for time you could not remove"; under a second show nothing ("Render nothing for the first 200 to 400ms"); "Past roughly ten seconds you owe the reader one of two things: a real percentage, or a sentence about what is happening"; and a fake bar that "sits at 90% is the fastest way to lose the trust the rest of the page earned". For a staged reveal that Dalilak controls, this means: name real steps, show real intermediate findings (skills found, jobs compared), and end on a clear done state.

| Component | Author | Path | Shape |
|---|---|---|---|
| Multi Step Loader | Manu Arora | Aceternity registry only (`multi-step-loader`); **not on 21st** (404, and absent from the 89-item Aceternity index there) | full-screen list of steps that scrolls up one row per step |
| AI Loading State | Kokonut UI | `@kokonutd/components/ai-loading` | step list with status icons, a rail that fills, a rolling log under the running step |
| AI Task List | Edu Calvo | `@educalvolpz/components/ai-task-list` | nested plan checklist; a travelling underline marks the running row |
| AI Text Loading | Kokonut UI | `@kokonutd/components/ai-text-loading` | cycling status words (per-letter upstream: not for Arabic) |
| Steps | Julien Thibeaut | `@ibelick/components/steps` | collapsible trace with a 2 px connector bar |
| Loader | Julien Thibeaut | `@ibelick/components/loader` | `text-shimmer`, `text-blink` (2 s ease-in-out), `terminal` (blinking caret), plus dot variants to avoid |
| Staged Progress Bar | DHxWhy | `@dhxwhy/components/staged-progress-bar` | *description only*, see 7.4 |
| Progress Indicator | Anurag Mishra | `@anurag-mishra22/components/progress-indicator` | *description only* ("fluid steps animation"); 1,398 bookmarks on the popular page |
| Animated Progress Stepper | ShadcnSpace | `@shadcnspace/components/stepper-03` | *description only*: "spring-animated progress line, a traveling dot ... icon-to-checkmark morphing" |
| Analyzing Image | loading-ui | `@loading-ui/components/analyzing-image` | *description only*: "sweeps a highlight bar across a picture icon". The scan-line idea for a CV page |
| Loading Carousel | cult/ui | upstream only (`loading-carousel.tsx`), not read in detail | tips carousel shown while waiting |
| Outcome Spinner Loader | DHxWhy | `@dhxwhy/components/outcome-spinner-loader` | *description only*: one SVG ring that "starts as an indeterminate rotating ring, switches to a determinate progress ring when a percentage is known, and resolves into a drawn check or cross", driven by a status prop (idle, pending, progress, success, error). The right end state for every loader in Dalilak |

### 7.1 The scrolling step list (Aceternity Multi Step Loader)

```tsx
// Aceternity UI, components/ui/multi-step-loader.tsx (excerpt)
{loadingStates.map((loadingState, index) => {
  const distance = Math.abs(index - value)
  const opacity = Math.max(1 - distance * 0.2, 0)
  return (
    <motion.div key={index} className="text-left flex gap-2 mb-4"
      initial={{ opacity: 0, y: -(value * 40) }}
      animate={{ opacity: opacity, y: -(value * 40) }}
      transition={{ duration: 0.5 }}>
      {index > value ? <CheckIcon /> : <CheckFilled className={cn(value === index && "text-lime-500")} />}
      <span className={cn(value === index && "text-lime-500")}>{loadingState.text}</span>
    </motion.div>
  )
})}
// driver: setTimeout(() => setCurrentState(prev => loop ? (prev === last ? 0 : prev + 1) : Math.min(prev + 1, last)), duration) // 2000 ms
// overlay: fixed inset-0 z-[100] backdrop-blur-2xl, plus a layer masked with radial-gradient(900px at center, transparent 30%, white)
```

The whole trick is two numbers: every row is translated up by `value * 40px`, and each row's opacity is `1 - 0.2 * distance` from the current step. So the current step holds the centre line, finished steps drift up and dim, coming steps wait dimmer below. It is the published form of "a status line whose steps roll", extended to a visible queue. Adaptations for Dalilak: drive `value` from real progress events instead of a fixed 2 s timer (keep a minimum dwell of about 700 ms per step so each can be read); replace `backdrop-blur-2xl` with an opaque surface (blur is expensive and reads as glass); replace the lime text with Dalilak's ink plus the drawn check from 7.2.

### 7.2 Status icon, rail and rolling log (Kokonut UI AI Loading State)

Four statuses per step (`pending | running | done | error`), three small mechanisms.

```tsx
// Kokonut UI, components/kokonutui/ai-loading.tsx (excerpts). EASE_OUT = [0.23, 1, 0.32, 1], LINE_HEIGHT = 24, VISIBLE_LINES = 3

// (a) the status icon swaps in place with a short blur
<AnimatePresence initial={false} mode="popLayout">
  <motion.span key={status} initial={{ opacity: 0, filter: "blur(2px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
               exit={{ opacity: 0, filter: "blur(2px)" }} transition={{ duration: 0.18, ease: EASE_OUT }}>
    {/* pending: a 6 px dot. running: a 0.8 s spinning arc. done: */}
    <motion.path d="M3.5 8.5 6.5 11.5 12.5 4.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                 transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 }} />
  </motion.span>
</AnimatePresence>

// (b) the rail between icons fills when the step completes
<span className="absolute top-[34px] bottom-[-10px] left-[7.5px] w-px overflow-hidden bg-zinc-200">
  <span className={cn("block h-full w-full origin-top bg-emerald-500/60 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      step.status === "done" ? "scale-y-100" : "scale-y-0")} />
</span>

// (c) the running step shows its last 3 log lines; older ones scroll up and fade through a mask
const offset = Math.max(0, lines.length - VISIBLE_LINES)
<div style={{ height: LINE_HEIGHT * Math.min(lines.length, VISIBLE_LINES),
              maskImage: "linear-gradient(to bottom, rgb(0 0 0 / 0.25), black 70%)",
              transition: "height 240ms cubic-bezier(0.23, 1, 0.32, 1)" }}>
  <div className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
       style={{ transform: `translateY(${-offset * LINE_HEIGHT}px)` }}>
    {lines.map((line, index) => <motion.div key={`${index}-${line}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                           transition={{ duration: 0.2, ease: EASE_OUT }} style={{ height: LINE_HEIGHT }} />)}
```

For the CV analysis this maps one to one: steps are "reading the file", "finding skills", "weighing evidence", "matching jobs"; the log lines under the running step are the real findings as they come (a skill name with its evidence sentence). The upstream demo advances one log line every 750 ms and rests 3.2 s at the end; it also fades in a per-step elapsed time in `tabular-nums`, and collapses the list when everything is done (`collapseWhenDone`). The rail position uses `left-[7.5px]`: in RTL use `start-[7.5px]`.

### 7.3 One moving thing at a time (SmoothUI AI Task List)

```tsx
// SmoothUI, packages/smoothui/components/ai-task-list/index.tsx (excerpt)
// Completed rows settle down a pixel and lose a little contrast: they go quiet so whatever is running is the only thing asking for attention.
<motion.li animate={{ opacity: isDone ? 0.65 : 1, y: isDone && !shouldReduceMotion ? 1 : 0 }}
           transition={{ type: "spring", bounce: 0.1, duration: 0.25 }}>
  {isRunning && !shouldReduceMotion && (
    // A travelling underline under the active row only.
    <motion.span className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
      animate={{ backgroundPositionX: ["0%", "200%"] }}
      style={{ backgroundImage: "linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%)",
               backgroundSize: "50% 100%", opacity: 0.5 }}
      transition={{ duration: 1.4, ease: [0.645, 0.045, 0.355, 1], repeat: Number.POSITIVE_INFINITY }} />
  )}
```

The design idea is worth more than the code: only the running row moves, finished rows drop to 65% and sink 1 px. Its author also left a useful warning in a comment: Motion's `pathLength` did not animate reliably on these small check paths, so the check is drawn with a CSS keyframe on `stroke-dashoffset` (`pathLength={1}`, `strokeDasharray="1 1"`). If a drawn check ever renders as a stub, switch to the CSS route.

### 7.4 Staged bar (DHxWhy, description only)

The author's description is specific enough to rebuild: one bar split into "named, weighted stages", it "rides the current stage label on the fill head as it advances", "rolls the label at each stage boundary", ends by collapsing "into a Done pill", a failed stage turns destructive with a Retry pill, unknown progress falls back to an indeterminate shimmer, and it exposes `role="progressbar"` with `aria-valuetext` per stage. Built with the Web Animations API, no library. This is a compact alternative to the step list for the phone layout.

### 7.5 A wait that is the show

For the path reveal, compose rather than pick one: (1) the step list from 7.1/7.2 on a quiet patterned ground (4.1); (2) as each step completes, a real artefact rises into view (Blur Fade, section 8): a skill chip, a job card with its ring filling (section 12), a roadmap node; (3) the final state is not a full bar but a transition: the last step's row morphs into the roadmap header (shared `layoutId`, 2.7). Keep an escape: 21st's preloader guide insists on "A hard ceiling" and "Exit fast. The lift should take 200 to 400ms."

## 8. Text reveal animations

From `/blog/react-animated-text-components`: the reveal family "is the safest family, because the end state is normal text and the animation happens once"; typewriters belong in "a terminal, a chat" and not in headlines; reserve the width of a cycling word; and "Put the real sentence in an `aria-label` on the heading and mark the animated spans `aria-hidden`".

| Component | Author | Path | Arabic-safe |
|---|---|---|---|
| Text Effect | Julien Thibeaut | `@ibelick/components/text-effect` | yes with `per="word"` or `"line"` |
| Text Generate Effect | Manu Arora | `@manuarora700/components/text-generate-effect` | yes (words) |
| Blur Fade | Dillion Verma | `@dillionverma/components/blur-fade` | yes (wraps any block) |
| Per Word Crossfade | Edu Calvo | `@educalvolpz/components/per-word-crossfade` | yes (words) |
| Fade Through | Edu Calvo | `@educalvolpz/components/fade-through` | yes (whole phrase) |
| Vertical Cut Reveal | Daniel Petho | `@danielpetho/components/vertical-cut-reveal` | yes with `splitBy="words"` or `"lines"` |
| Animated Group, In View | Julien Thibeaut | `@ibelick/components/animated-group`, `.../in-view` | yes (stagger any children) |
| Text Shimmer | Julien Thibeaut | `@ibelick/components/text-shimmer` | yes (section 2.5) |
| Soft Blur In | Edu Calvo | `@educalvolpz/components/soft-blur-in` | **no** (per character); take the timing only |
| Text Roll, Text Morph | Julien Thibeaut | `@ibelick/components/text-roll`, `.../text-morph` | **no** (per character) |
| Hyper Text | Dillion Verma | `@dillionverma/components/hyper-text` | **no** (Latin scramble) |
| Text Rotate | Daniel Petho | `@danielpetho/components/text-rotate` | only with word-level splitting |

### 8.1 Presets and timings (Motion Primitives Text Effect)

```ts
// Motion Primitives, components/core/text-effect.tsx (excerpt)
const defaultStaggerTimes = { char: 0.03, word: 0.05, line: 0.1 }
const presetVariants = {
  "fade-in-blur": { item: {
    hidden:  { opacity: 0, y: 20, filter: "blur(12px)" },
    visible: { opacity: 1, y: 0,  filter: "blur(0px)" },
    exit:    { opacity: 0, y: 20, filter: "blur(12px)" } } },
  blur:  { item: { hidden: { opacity: 0, filter: "blur(12px)" }, visible: { opacity: 1, filter: "blur(0px)" } } },
  slide: { item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } } },
}
const stagger = defaultStaggerTimes[per] / speedReveal     // container: staggerChildren
const baseDuration = 0.3 / speedSegment                    // each segment
const splitText = (text, per) => per === "line" ? text.split("\n") : text.split(/(\s+)/)
// renders <span className="sr-only">{children}</span> once, and every animated segment is aria-hidden;
// words are "inline-block whitespace-pre"; wrapped in <AnimatePresence mode="popLayout"> with a `trigger` prop
```

Good defaults to copy: 50 ms per word, 300 ms each, the real sentence once for screen readers, exit staggered in reverse (`staggerDirection: -1`). For Dalilak soften the preset: `y: 8`, `blur(4px)` (the lead's the reference assistant values) reads calmer than `y: 20, blur(12px)` at body size; keep the large values for the path-reveal headline.

### 8.2 Imperative version in ten lines (Aceternity Text Generate Effect)

```tsx
// Aceternity UI, components/ui/text-generate-effect.tsx (excerpt)
const [scope, animate] = useAnimate()
useEffect(() => {
  animate("span", { opacity: 1, filter: filter ? "blur(0px)" : "none" },
          { duration: duration ? duration : 1, delay: stagger(0.2) })       // duration prop default 0.5
}, [scope.current])
// markup: <motion.div ref={scope}> {words.split(" ").map(word => <motion.span className="opacity-0" style={{ filter: "blur(10px)" }}>{word} </motion.span>)}
```

`useAnimate` + `stagger()` needs no variants and no per-word component. 200 ms between words is slow and deliberate: right for one headline (the reveal of the user's path), wrong for a paragraph.

### 8.3 Blocks, not words (Magic UI Blur Fade)

Defaults: `duration = 0.4`, `offset = 6` px, `blur = "6px"`, `ease: "easeOut"`, `delay: 0.04 + delay`, optional `inView` with margin `-50px` and `once: true`. Hidden state is `{ y: 6 (or -6), opacity: 0, filter: "blur(6px)" }`. Wrap each card or answer block and pass `delay={i * 0.08}` for the staggered "blurs into focus" the lead recorded. Motion Primitives' Animated Group does the same through variants for a whole list.

### 8.4 Line mask reveal (Fancy Components Vertical Cut Reveal)

```tsx
// Fancy Components, src/fancy/components/text/vertical-cut-reveal.tsx (excerpt)
transition = { type: "spring", stiffness: 190, damping: 22 }, staggerDuration = 0.2, staggerFrom = "first"
const variants = {
  hidden: { y: reverse ? "-100%" : "100%" },
  visible: (i: number) => ({ y: 0, transition: { ...transition, delay: (transition?.delay || 0) + getStaggerDelay(i) } }),
}
// each word: <span className="inline-flex overflow-hidden"> <motion.span custom={i} variants={variants} .../> </span>
// staggerFrom "center": delay = Math.abs(Math.floor(total / 2) - index) * staggerDuration
```

Each word sits in an `overflow-hidden` box and rises from below its own baseline: a wipe with no opacity change, which looks typographic rather than "effect". Arabic note: `overflow-hidden` on the word box clips descenders and diacritics that fall outside the line box. Add block padding to the box and pull it back with a negative margin, then check a line with letters such as ج and ي and with tashkeel.

### 8.5 Phrase swap (SmoothUI Fade Through)

Old text out first (260 ms, `[0.4, 0, 1, 1]`, `y: -4`), then new text in (420 ms, `[0.2, 0, 0, 1]`, from `y: 6, scale: 0.99, blur(2px)`), under `AnimatePresence mode="wait"`. This is exactly Mohammed's accepted transition shape ("old out first", never two half-visible) at phrase scale; the same numbers work for the rolling status line and for route changes.

## 9. File upload and dropzones

From `/blog/react-file-upload-components`: "a drop zone must also be a button" (a real `<input type="file">` behind a label, focusable); "Highlight on `dragover` and clear it on `dragleave` and `drop`, because a zone that stays highlighted reads as stuck"; accept paste; validate type and size before any request because `accept` "does not stop a drag"; errors must say what to do ("Too large, wrong type, network dropped and try again are four different sentences").

| Component | Author | Path | Take |
|---|---|---|---|
| File Upload | Manu Arora | `@manuarora700/components/file-upload` | the tile under the cursor becomes the file row (shared `layoutId`) |
| Animated File Upload | Edu Calvo | `@educalvolpz/components/animated-file-upload` | clean state table for drag, drop, list |
| File Upload (v2) | Kokonut UI | upstream `file-upload.tsx`; 21st lists the hook `@kokonutd/components/use-file-input` | paste support, per-file progress, 3 uploads at a time |
| `useFileUpload` | Origin UI | upstream hook; 21st lists `@originui/components/use-image-upload` (949 bookmarks) | headless: state + drag handlers + `getInputProps` |
| Dropzone | Hayden Bleasel | `@haydenbleasel/components/dropzone` | `react-dropzone` wrapper |
| Attachment States | uiable | `@uiable/components/attachment-states` | *description only*: idle, uploading, processing, error, done per file |
| File Upload Progress List | Sean Hello | `@sean0205/components/c-progress-5` | *description only*: rows with thin progress bar and time left |
| Video Upload Card | Isaiah | `@isaiahbjork/components/video-upload-card` | *description only*: "vending machine-style animation where the uploaded video appears to drop in from above" |
| Halo Dropzone | cult/ui | `@cult-ui/components/halo-dropzone` | glowing rim: skip |

### 9.1 The tile that becomes the file (Aceternity File Upload)

```tsx
// Aceternity UI, components/ui/file-upload.tsx (excerpt)
const mainVariant = { initial: { x: 0, y: 0 }, animate: { x: 20, y: -20, opacity: 0.9 } }
const secondaryVariant = { initial: { opacity: 0 }, animate: { opacity: 1 } }

<motion.div onClick={handleClick} whileHover="animate" className="group/file relative ...">
  {!files.length && (
    <motion.div layoutId="file-upload" variants={mainVariant}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative z-40 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center rounded-md bg-white">
      {isDragActive ? <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Drop it</motion.p> : <IconUpload />}
    </motion.div>
  )}
  {!files.length && <motion.div variants={secondaryVariant} className="absolute inset-0 z-30 ... border border-dashed opacity-0" />}
  {files.map((file, idx) => (
    <motion.div key={"file" + idx} layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx} className="... md:h-24"> ...
```

Two ideas. On hover the white tile lifts up and to the side (`x: 20, y: -20`) and a dashed outline fades in *where it was*: the empty slot says "drop here" without a word. And the idle tile and the first file row share `layoutId="file-upload"`, so when a file lands the 128 px tile morphs into the full-width file row and the name, size and type fade in on `layout`. For Dalilak: the tile is a CV page glyph from the custom set; after the morph, the file row is the top of the analysis view, so the upload flows straight into section 7 without a page change. Mirror the hover offset for RTL (`x: -20`). The component uses `react-dropzone` only for `getRootProps` and `isDragActive`; native drag events do the same (see 9.3).

### 9.2 State table (SmoothUI Animated File Upload)

The header comment of the file states the choreography: "drag: zone scales 1.02, border goes primary, icon floats up / drop: icon bounces back, file rows slide in staggered / layout: remaining files reorder with layout animation". Values: zone `scale: 1.02` on `{ type: "spring", bounce: 0.1, duration: 0.25 }`; icon `scale: 1.15, y: -4` on `{ bounce: 0.2, duration: 0.3 }`; rows enter from `{ opacity: 0, scale: 0.95, x: -16 }`, leave with `scale: 0.95` in 150 ms, and have `layout`. Flip the `x` for RTL.

### 9.3 Headless hook shape (Origin UI `useFileUpload`)

Options `{ maxFiles, maxSize, accept, multiple, initialFiles, onFilesChange, onFilesAdded }`; state `{ files, isDragging, errors }`; actions include `handleDragEnter / handleDragLeave / handleDragOver / handleDrop`, `openFileDialog`, `removeFile`, `clearFiles` and `getInputProps()`. It validates size and type against the `accept` string (MIME, wildcard or extension) and returns messages such as `File "x" exceeds the maximum size of ...`. Dalilak needs Arabic messages and three inputs (PDF, Word, pasted text), so write the hook fresh in this shape. Kokonut's v2 adds paste handling (`ClipboardEvent`), a default limit of 5 MB and a queue (`CONCURRENCY = 3`).

## 10. Timelines, steppers and roadmaps

From `/blog/react-timeline-components`: "A process timeline has states - done, current, upcoming - and the current one has to be visually obvious, because that is the only thing the reader is looking for"; markup is an `<ol>`, "The line is decoration. Draw it with a pseudo-element". From `/blog/react-onboarding-stepper-components`: the current step carries `aria-current="step"`; "Show the total up front".

| Component | Author | Path | Take |
|---|---|---|---|
| Timeline | Manu Arora | `@manuarora700/components/timeline` | sticky titles and a beam that fills with scroll |
| Tracing Beam | Manu Arora | `@manuarora700/components/tracing-beam` | a beam follows an SVG path as you scroll |
| Animated Beam | Dillion Verma | `@dillionverma/components/animated-beam` | a light travels along a curve between two DOM nodes |
| Stepper | Origin UI | `@originui/components/stepper` | state via `data-state`; number scales out, check scales in |
| Timeline | cubby-ui | `@cubby-ui/components/timeline` | *description only*: composable on Base UI (`@base-ui/react`), "usable ... as a controlled step progress indicator" |
| Points levels timeline | Trophy | upstream only (`points-levels-timeline.tsx`) | level ladder with a fill up to the current level |
| Radial Orbital Timeline | Jatin Yadav | `@jatin-yadav05/components/radial-orbital-timeline` | *description only*; "most-bookmarked" timeline. 21st's own verdict: "excellent at 'this is a system with parts' and poor at 'here is what happened in order'" |
| Metro Map ... Roadmap Timeline | DHxWhy | `@dhxwhy/components/metro-map-gallery` | *description only*, see 10.4 |
| Thread Stepper | ham7a311 | `@ham7a311/components/thread-stepper` | *description only*: "a thread running through beads", click back to a completed step |
| Milestone Timeline, Status Roadmap Board, Quarterly Roadmap Columns | 7Ovr - Oliver | `@olewandowski1/components/timeline-1`, `.../roadmap-1`, `.../roadmap-4` | plain, well-labelled status layouts (Shipped / In Progress / Planned) |
| Product Tour | Kiki | `@laziekiki/components/product-tour` | *description only*: spotlight that glides across real elements; relevant to "Daleel opens it for you" |

### 10.1 A rail that fills as you move (Aceternity Timeline)

```tsx
// Aceternity UI, components/ui/timeline.tsx (excerpt)
const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 10%", "end 50%"] })
const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])     // height = measured list height
const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])
// rail: absolute, w-[2px], faded at both ends with
//   [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]
<motion.div style={{ height: heightTransform, opacity: opacityTransform }} className="absolute inset-x-0 top-0 w-[2px] rounded-full ..." />
// each entry: a sticky column (sticky top-40 self-start) holding the dot and the big title, content beside it
```

Take the structure: sticky stage title, masked rail, fill bound to a motion value. For Dalilak's roadmap bind the fill to **progress** (`completedStages / total`, animated with a spring when a course completes) rather than to scroll, and replace the purple-to-blue gradient fill with a solid ink. The fill animates `height`; prefer `scaleY` with `origin-top`.

### 10.2 Connectors between nodes (Magic UI Animated Beam)

```tsx
// Magic UI, registry/magicui/animated-beam.tsx (excerpt)
const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset
const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset
const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset
const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset
const controlY = startY - curvature
const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`
// recomputed by a ResizeObserver on the container. Two <path d={d}>: a faint base, and one stroked with a
// <motion.linearGradient gradientUnits="userSpaceOnUse"> whose x1/x2 animate ["10%" -> "110%"] and ["0%" -> "100%"],
// ease [0.16, 1, 0.3, 1], repeating with a delay
```

Reusable part for the skill tree and for roadmap branches: measure two node elements against a shared container and draw one quadratic curve between their centres, redrawn on resize. This is how to get correct connectors in RTL and at 390 px without hand-placing SVG. For "unlocking" a node, animate `pathLength` 0 to 1 on the connector (a drawn line) instead of the travelling light; keep the travelling light, in one neutral colour, for the single "next step" edge only.

### 10.3 Step state without JavaScript (Origin UI Stepper)

```tsx
// Origin UI, registry/default/ui/stepper.tsx (class excerpts)
// item:      data-state={"active" | "completed" | "inactive"}  (+ data-loading)
// indicator: "size-6 rounded-full bg-muted data-[state=active]:bg-primary data-[state=completed]:bg-primary"
// number:    "transition-all group-data-[state=completed]/step:scale-0 group-data-[state=completed]/step:opacity-0"
// check:     "absolute scale-0 opacity-0 transition-all group-data-[state=completed]/step:scale-100 group-data-[state=completed]/step:opacity-100"
// separator: "bg-muted ... group-data-[state=completed]/step:bg-primary"
```

The number scales out while the check scales in, both absolutely stacked, driven only by a `data-state` attribute on the parent. Cheap and robust for the small steppers (onboarding progress, application status: sent, viewed, interview).

### 10.4 Roadmap as a map (DHxWhy, description only)

The description of the Metro Map component is a design brief in itself: milestones are stations on up to five coloured lines; "small trains run the lines", they "brake into each stop"; "hovering a station grows the photo into a card and fades the other lines"; "Stations are buttons with one tab stop and arrow keys along and across lines"; "reduced motion parks the trains"; "a portrait phone layout" is built in. For Dalilak's branching path (the main line to the target job, branches to follow-on careers) the transit-map metaphor is the strongest idea found on the site for making branches legible: one line per career, interchange stations where a skill is shared, and the other lines fade when one is focused. Source not readable; build it from 10.2.

### 10.5 Level ladder (Trophy)

`points-levels-timeline.tsx` computes the fill from points: progress inside the current level is `(points - currentThreshold) / (nextThreshold - currentThreshold)`, and the rail height is `((completedSegments + currentSegmentFraction) / segmentCount) * 100` percent, applied as `height: calc((100% - 4rem) * fraction)` with `transition-all duration-300`. Use the same arithmetic for Dalilak's seven level titles.

## 11. Leaderboards and ranked lists

The `leaderboard` tag has 11 entries. No guide exists for it.

| Component | Author | Path | Take |
|---|---|---|---|
| Leaderboard Podium, Leaderboard Rankings, Leaderboard Card | Trophy | `@trophyso/components/leaderboard-podium`, `.../leaderboard-rankings`, `.../leaderboard-card` | data shape, podium order, own-row marker. **Static: no motion in the source** |
| Achievement badge (+ `/rarity`, `/series-progress`, `/locked`), Achievement List, Achievement Unlocked, Streak Badge | Trophy | `@trophyso/components/achievement-badge`, `.../achievement-list`, `.../achievement-unlocked`, `.../streak-badge` | state model for badges and streaks |
| Bar Race Chart | DHxWhy | `@dhxwhy/components/bar-race-chart` | *description only*: rows overtake each other with FLIP |
| Leaderboard Table | Arihant jain | `@arihantcodes_1f7b8c4d/components/leaderboard-table` | *description only*: "medal badges for the top three, avatars, scores, day streaks, and weekly rank movement" (Apache-2.0) |
| Rank Bars | Evgeny Shilov | `@eugeneshilow/components/rank-bars` | *description only*: "label, zero-based bar, value - with an accent-highlighted hero row" |
| Bump Chart | Saurabh | `@starc007/components/bump-chart` | *description only*: rank over time with curved paths |
| First Place Leaderboard | nayan_radadiya6 | `@nayan_radadiya6/components/first-place-leaderboard` | *description only* |
| Delta Number Ticker | DHxWhy | `@dhxwhy/components/delta-number-ticker` | section 12 |

### 11.1 Structure (Trophy UI)

```tsx
// Trophy UI, apps/www/registry/trophy/ui/leaderboard-podium.tsx (excerpt)
interface LeaderboardRanking { userId: string; userName: string | null; rank: number; value: number; avatarUrl?: string | null }
// Get top 3, reorder for podium display: 2nd, 1st, 3rd
const podiumOrder = [top3.find((r) => r.rank === 2), top3.find((r) => r.rank === 1), top3.find((r) => r.rank === 3)].filter(Boolean)
const PODIUM_CONFIG = { 1: { height: "h-32" }, 2: { height: "h-24" }, 3: { height: "h-20" } }   // sm: 24 / 20 / 16, lg: 40 / 32 / 28
// container: "flex items-end justify-center gap-4", role="list"; each column: avatar + small rank badge, name (max-w-20 truncate),
// value in tabular-nums, then the block "mt-2 w-22 rounded-t-lg" with the rank number in its top 32 px
```

Rankings takes a `currentUserId` and marks that row; the badge component models `achievedAt: string | null` (locked renders at `opacity-50` with the art in `grayscale`), an optional progress ring, and `rarity` shown as "N% of users". Two things to change for Dalilak: Trophy falls back to `i.pravatar.cc` photos (Dalilak uses its own avatar set and labelled sample users), and "N% of users" is a statistic about a population, so with sample data either drop it or label it clearly as demo data (HANDOFF section 12).

### 11.2 The motion to add

Trophy ships none; the motion ideas come from DHxWhy's Bar Race Chart description: rows re-sort "with motion whenever the data changes, so bars overtake each other instead of snapping", using "FLIP translate animations", animated bar widths, rolling numbers, "small rank-change chips (up, down, new) that fade on their own", new entrants slide "in from below the fold", and "a visually hidden table for screen readers". In Dalilak's stack FLIP is one prop. A sketch (mine, not from any source above):

```tsx
// Adaptation sketch for Dalilak, not quoted from a source
<ol>
  {rows.map((r) => (
    <motion.li key={r.userId} layout="position"
               transition={{ type: "spring", stiffness: 350, damping: 40 }}   // Magic UI Animated List values
               style={{ zIndex: r.isMe ? 1 : 0 }}>
      {/* rank number: digit roller from section 12; bar: scaleX from the inline-start edge; delta chip: fades after ~2 s */}
    </motion.li>
  ))}
</ol>
```

The moment worth staging: the user earns XP, their row lifts slightly (scale 1.02, neutral shadow), slides past the rows above while those shift down, the rank number rolls, a "+2" chip appears and fades. Podium entrance: blocks grow from the baseline in the order 3rd, 2nd, 1st (`scaleY` from `origin-bottom`, 80 ms apart), then avatars drop in. Keep the list an `<ol>` and the user's row reachable by a "jump to me" control if it is off-screen.

## 12. Number tickers

From `/blog/react-progress-stats-components` and `/blog/react-stats-section-components`: "the final value must be in the DOM from the start"; do not re-run every time it scrolls into view; under reduced motion render the final number; "use tabular figures. A row of animating numbers with proportional digits jitters horizontally".

| Component | Author | Path | Mechanism |
|---|---|---|---|
| Number Flow | Maxwell Barvian | `@barvian/components/number-flow` | per-digit spin on the Web Animations API, `Intl.NumberFormat` formatting, custom element |
| Number Ticker | Dillion Verma | `@dillionverma/components/number-ticker` | one spring, writes `textContent` |
| Sliding Number | Julien Thibeaut | `@ibelick/components/sliding-number` | a 0-9 column per digit, each on a spring |
| Rolling Number | cult/ui | upstream only (`rolling-number.tsx`) | `useSpring` + `useTransform` to a formatted string, 20 lines |
| Animated Circular Progress Bar | Dillion Verma | `@dillionverma/components/animated-circular-progress-bar` | ring gauge via `stroke-dasharray` transition |
| Delta Number Ticker | DHxWhy | `@dhxwhy/components/delta-number-ticker` | *description only*: "a chip with the absolute and percent change lifts off the number and settles beside it, and the old value lingers below as a ghost"; "Columns roll with a 20 ms stagger" |
| Animated Blur Number | Serafim | `@serafimcloud/components/animated-blur-number` | *description only*: "blurring only the digits that change" |
| Animate Digits, Count Up | unlumen | `@unlumen/components/animate-digits`, `.../count-up` | *description only*: only changed digits blur-slide (Animate Digits has no licence) |
| Mechanical Odometer | Ciprian Titire | `@cipriantitire/components/mechanical-odometer` | *description only*: "only the last drum is driven and the rest carry, so 1,099 to 1,100 rolls three drums over together" |

### 12.1 Count to a value (Magic UI Number Ticker)

```tsx
// Magic UI, registry/magicui/number-ticker.tsx (excerpt)
const motionValue = useMotionValue(direction === "down" ? value : startValue)
const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
const isInView = useInView(ref, { once: true, margin: "0px" })
useEffect(() => { if (isInView) setTimeout(() => motionValue.set(direction === "down" ? startValue : value), delay * 1000) }, [/* ... */])
useEffect(() => springValue.on("change", (latest) => {
  if (ref.current) ref.current.textContent = Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }).format(Number(latest.toFixed(decimalPlaces)))
}), [springValue, decimalPlaces])
// <span ref={ref} className="inline-block tabular-nums">{startValue}</span>
```

Damping 60 on stiffness 100 is overdamped: it decelerates into the value and never overshoots, which matters for a number (an XP total must not briefly read too high). It writes `textContent` directly, so React does not re-render per frame. Two fixes: it renders `startValue` first, which breaks the "final value in the DOM" rule (render the final value on the server and animate from the previous value on change); and it only fires once in view, so for live values call `motionValue.set(newValue)` on every change. cult/ui's Rolling Number is the same idea with `mass: 0.8, stiffness: 75, damping: 15` (slightly livelier) and a `format` prop.

### 12.2 Digits that roll (Motion Primitives Sliding Number)

```tsx
// Motion Primitives, components/core/sliding-number.tsx (excerpt). Needs react-use-measure (or any height measure).
const TRANSITION = { type: "spring", stiffness: 280, damping: 18, mass: 0.3 }
function Digit({ value, place }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10
  const animatedValue = useSpring(motionValue(valueRoundedToPlace), TRANSITION)
  useEffect(() => { animatedValue.set(valueRoundedToPlace) }, [animatedValue, valueRoundedToPlace])
  return (
    <div className="relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none tabular-nums">
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => <Number key={i} mv={animatedValue} number={i} />)}
    </div>
  )
}
// each of the ten numerals is absolutely placed with:
const y = useTransform(mv, (latest) => {
  const offset = (10 + number - (latest % 10)) % 10
  let memo = offset * bounds.height
  if (offset > 5) memo -= 10 * bounds.height          // take the short way round the drum
  return memo
})
```

Each place is a drum of ten numerals in a `1ch` window clipped on the block axis; one spring per place. The `offset > 5` line makes 9 to 0 roll one step forward instead of nine back. This is the look for match percentage (70 to 90), XP, streak and rank. It lays digits out with a flex row, so wrap it in `dir="ltr"`. Stagger the places by 20 ms (DHxWhy's value) so the roll ripples from the units.

### 12.3 NumberFlow

Usage is one line (`import NumberFlow from '@number-flow/react'`; `<NumberFlow value={123} />`), with `format` (`Intl.NumberFormatOptions`), `prefix`, `suffix`, a `trend` function (`+1` digits always roll up, `-1` down, `0` each digit its own way), the `continuous` plugin (passes through in-between numbers), `NumberFlowGroup` to keep neighbours in sync, `respectMotionPreference` (default true) and timing props (`transformTiming`, `spinTiming`, `opacityTiming`; the docs' example uses `{ duration: 350, easing: 'ease-out' }` for opacity). The docs say `font-variant-numeric: tabular-nums` prevents shifting. It is the most complete option and the one with the caveat: **"RTL locales" and "Non-Latin digits" are listed as unsupported** on `number-flow.barvian.me`. In Dalilak it must live inside a `dir="ltr"` inline box with `locales="en-US"`; verify a percent sign and a thousands separator render where expected next to Arabic text before relying on it. If in doubt use 12.2.

### 12.4 Ring gauge (Magic UI Animated Circular Progress Bar)

An SVG circle of radius 45 in a 100-unit viewBox; `circumference = 2 * Math.PI * 45`; the primary arc is `strokeDasharray: calc(var(--stroke-percent) * var(--percent-to-px)) var(--circumference)` with `transition: 1s ease`, rotated `-90deg` to start at 12 o'clock; a secondary arc draws the remainder with a 5% gap between the two; `strokeLinecap="round"`, stroke width 10. Changing the percent variable is enough to animate. This is the match ring; put a rolling number (12.2) in the centre and drive both from the same value.

## 13. Tabs

From `/blog/react-tabs-components`: "The sliding indicator ... should animate its position and width, not fade out and in, and it should be measured from the active label rather than assumed to be equal-width"; roving tabindex (one tab stop, arrows move); a filter is a `radiogroup`, not tabs; put the active tab in the URL when the panels are content.

| Component | Author | Path | Take |
|---|---|---|---|
| Animated Background | Julien Thibeaut | `@ibelick/components/animated-background` | the sliding pill as a reusable wrapper (click or hover) |
| Direction Aware Tabs | cult/ui | upstream only (`direction-aware-tabs.tsx`) | panel slides in from the side you moved toward; container height animates |
| Transition Panel | Julien Thibeaut | `@ibelick/components/transition-panel` | minimal `AnimatePresence mode="popLayout"` panel switch with `custom` direction |
| Expandable Tabs | Victor Welander | `@victorwelander/components/expandable-tabs` | *description only*; "most-bookmarked" in the family: icons that expand to show the label when selected |
| Vercel Tabs | Yadwinder Singh | `@yadwinder/components/vercel-tabs` | *description only*: underline with sliding indicator, no dependencies |
| Segmented Control | Özer | `@ddoemonn/components/segmented-control` | *description only*: radio group with sliding thumb and arrow keys |
| Animated Tabs | Preet Suthar | `@preetsuthar17/components/animated-tabs` | *description only*: "animated using clip path" |
| Swipe Tabs | Kokonut UI | upstream `smooth-tab.tsx` (v2 header "Swipe Tabs"); not read in detail | drag between panels |

### 13.1 The sliding pill (Motion Primitives Animated Background)

```tsx
// Motion Primitives, components/core/animated-background.tsx (excerpt)
return Children.map(children, (child, index) => {
  const id = child.props["data-id"]
  return cloneElement(child, {
    className: cn("relative inline-flex", child.props.className),
    "data-checked": activeId === id ? "true" : "false",
    ...(enableHover ? { onMouseEnter: () => set(id), onMouseLeave: () => set(null) } : { onClick: () => set(id) }),
  }, <>
    <AnimatePresence initial={false}>
      {activeId === id && (
        <motion.div layoutId={`background-${uniqueId}`} className={cn("absolute inset-0", className)} transition={transition}
                    initial={{ opacity: defaultValue ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      )}
    </AnimatePresence>
    <div className="z-10">{child.props.children}</div>
  </>)
})
```

One `motion.div` with a shared `layoutId` is rendered inside whichever item is active; Motion animates it from the old item's box to the new one, so position **and width** follow the label and it is direction-neutral. `useId()` scopes the `layoutId`, so several groups can coexist. Use it for the top navigation, filter chips, the leaderboard period switch and, with `enableHover`, for list rows. Recommended transition from cult/ui: `{ type: "spring", bounce: 0.19, duration: 0.4 }`.

### 13.2 Panels that know where they came from (cult/ui Direction Aware Tabs)

```tsx
// cult/ui, registry/default/ui/direction-aware-tabs.tsx (excerpt)
const newDirection = newTabId > activeTab ? 1 : -1
const variants = {
  initial: (direction: number) => ({ x: 300 * direction, opacity: 0, filter: "blur(4px)" }),
  active: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (direction: number) => ({ x: -300 * direction, opacity: 0, filter: "blur(4px)" }),
}
<MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
  <motion.div initial={false} animate={{ height: bounds.height }} className="relative overflow-hidden">   {/* bounds from useMeasure */}
    <div ref={ref}>
      <AnimatePresence custom={direction} mode="popLayout" onExitComplete={() => setIsAnimating(false)}>
        <motion.div key={activeTab} variants={variants} initial="initial" animate="active" exit="exit" custom={direction} />
```

Two caveats for Dalilak. `mode="popLayout"` runs enter and exit together, which is the "two pages half-visible at once" Mohammed rejected at page level; inside a small panel it is usually fine, but for anything page-sized use `mode="wait"` with the Fade Through timings (8.5). And 300 px of travel is a push; 24 px with the same blur keeps the directional hint without the shove. The animated container height (measure the inner box, animate the outer) is the part to always keep: it stops the content below from jumping.

## 14. Docks and navigation

From `/blog/react-dock-components`: the magnification is "a function of its distance from the pointer, falling off smoothly"; "Track the pointer on the container ... rather than attaching a listener per icon"; "spring the scale rather than easing it". And where it fails: touch ("the dock degrades into a row of small icons"; a bottom bar needs "real targets of at least 44 by 44 points"), icon-only labels, and count ("Six to ten is where it works"). Its conclusion: a dock belongs "As a secondary surface rather than as primary navigation".

| Component | Author | Path | Take |
|---|---|---|---|
| Dock | Julien Thibeaut | `@ibelick/components/dock` | "most-taken"; reference implementation below |
| Dock | Dillion Verma | `@dillionverma/components/dock` | same model, `cva` variants |
| Floating Dock | Manu Arora | `@manuarora700/components/floating-dock` | "a separate collapsible menu on mobile" |
| Dock (Anurag Mishra) | Anurag Mishra | `@anurag-mishra22/components/dock-two` | *description only*; highest bookmark count on the popular page (2,322) |
| Live Activity Dock | DHxWhy | `@dhxwhy/components/live-activity-dock` | *description only*: tiles carry "progress ring, rolling badge, running dot, error shake" and "grow a live card out of the tile" |
| Agent Dock | dqnamo | `@dqnamo/components/agent-dock` | *description only* (section 2) |
| Bottom Menu | 0xUrvish | `@0xUrvish/components/bottom-menu` | *description only*: animated bottom navigation |
| Toolbar Dynamic | Julien Thibeaut | `@ibelick/components/toolbar-dynamic` | a bar that changes height to show more content (measured) |
| Expandable Tabs | Victor Welander | section 13 | compact nav for 390 px |

```tsx
// Motion Primitives, components/core/dock.tsx (excerpt). DEFAULT_MAGNIFICATION = 80, DEFAULT_DISTANCE = 150, panel 64 px
// container: const mouseX = useMotionValue(Infinity)
//   onMouseMove={({ pageX }) => { isHovered.set(1); mouseX.set(pageX) }}   onMouseLeave={() => { isHovered.set(0); mouseX.set(Infinity) }}
// item:
const mouseDistance = useTransform(mouseX, (val) => {
  const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
  return val - domRect.x - domRect.width / 2
})
const widthTransform = useTransform(mouseDistance, [-distance, 0, distance], [40, magnification, 40])
const width = useSpring(widthTransform, spring)          // spring = { mass: 0.1, stiffness: 150, damping: 12 }
// <motion.div style={{ width }} tabIndex={0} role="button" onFocus={() => isHovered.set(1)} onBlur={() => isHovered.set(0)}>
// icon width = width / 2 ; label tooltip: opacity 0 -> 1, y 0 -> -10, 200 ms
```

One shared motion value (`mouseX`) and a three-point interpolation per item is the whole effect; `Infinity` on leave maps every item to its resting width. It animates `width`, so the row reflows (that is the macOS behaviour). For Dalilak, given the guide's limits and a phone-first audience: use the *idea* at low amplitude on the desktop shell (40 to 52 px, not 80) or skip it, and put the effort into the Live Activity idea instead: the nav item for "My path" carries a small progress ring, the jobs item a rolling count of new matches, the item for an application in progress a running dot. On the phone, a bottom bar with labels and the sliding pill from 13.1.

## 15. Avatars

From `/blog/react-avatar-components`: "the fallback chain ... should be three deep: the image, then initials from the name, then a neutral mark", with "a background derived deterministically from the name so the same person is the same colour everywhere"; "Initials must be centred optically"; an avatar next to the person's name takes `alt=""`; the overflow "+12" must be reachable.

| Component | Author | Path | Take |
|---|---|---|---|
| Avatar Picker | Kokonut UI | `@kokonutd/components/avatar-picker` | "Animated avatar picker": choose from a set, no uploads. Upstream v2 uses `LayoutGroup`, springs and reduced-motion handling (not read in detail) |
| Avatar Circles | Dillion Verma | `@dillionverma/components/avatar-circles` | overlapping stack with a count |
| Avatar | Origin UI | `@originui/components/avatar` | fallback chain, status badge variants |
| Avatar Status Ring | DHxWhy | `@dhxwhy/components/avatar-status-ring` | *description only*: "presence drawn as a ring instead of a dot ... filling clockwise while uploading" |
| Agent Avatar | Edu Calvo | `@educalvolpz/components/agent-avatar` | *description only*: "generative pixel avatar ... deterministic per seed and gently breathing while the agent works" |
| AI Agent Mascot States | carolina | `@carolinaraulino/components/ai-agent-mascot` | *description only*: a mascot with "idle, thinking, working, done and at-limit states". Uses `three`: too heavy; take the state list |
| AI Mascot Input | Alex Reino | `@alexperezcedeno/components/ai-mascot-input` | *description only*: a mascot that "tracks typing length, blinks, and enters thinking mode on submit" |

Nothing on 21st is an illustrated avatar set; that is Dalilak's designer's job. What transfers:
- **Avatar Picker as the sign-in moment.** Entry is by name only, so picking an avatar is the one personal act at the door. A row or grid of Dalilak's avatars with a sliding selection ring (13.1 technique with `layoutId`) and the chosen one scaling up into the header.
- **A ring that means something.** DHxWhy's idea, applied: the user's avatar ring is their level progress (12.4 arc), and it fills when XP lands.
- **Daleel has states, not a spinner.** The mascot components list the states worth drawing for Daleel's glyph: idle, listening (reacts to typing), thinking, working (a tool is running), done. The lead's notes already ask for a living glyph that settles into the still brand mark; these give the state list.
- **Deterministic sample users.** Derive each leaderboard user's avatar and tint from a hash of the id, so the same sample user looks the same everywhere.

## 16. Confetti and celebrations

From `/blog/react-confetti-components`: "The test: would the reader tell someone about this?"; "fire it once per achievement rather than once per render. A celebration that replays when the reader navigates back is a bug that reads as mockery"; the canvas has `pointer-events: none`; the loop must stop and the element be removed; "Reduced motion means no confetti ... Show the message and skip the animation." And the alternative: "A number that counts up, a checkmark that draws itself, a card that settles into place, a single line of copy that acknowledges what happened by name."

| Component | Author | Path | Take |
|---|---|---|---|
| Confetti | Dillion Verma | `@dillionverma/components/confetti` | thin wrapper over `canvas-confetti`, with a button that fires from its own position |
| Confetti | Motion | `@motiondotdev/components/motion-confetti` | *description only*: particle explosion with "spring-driven button feedback and randomised particle physics", `motion` only |
| Burst | tinkerers-labs | `@tinkerers-labs/components/burst` | *description only*: "canvas-based burst of confetti-like pieces that fires on demand", no dependencies |
| Particle Button burst | Kokonut UI | section 6.3 | 18 chips, 650 ms, zero dependencies |
| Achievement Unlocked | Trophy | `@trophyso/components/achievement-unlocked` | a dialog with the badge and a share action; no motion in the source |
| Mission Success Dialog | Ravi Katiyar | `@ravikatiyar162/components/mission-success-dialog` | *description only*: celebration dialog with a next step |
| Balloons | Serafim | `@serafimcloud/components/balloons` | `balloons-js` wrapper: skip |
| Cell Count | Louis Studios | `@louisstudios/components/cell-count` | *description only*: dots burst and "your milestone number springs out": pastel burst, skip the look, keep "the number is the hero" |

```tsx
// Magic UI, registry/magicui/confetti.tsx (excerpt)
// instance bound to one canvas: confetti.create(canvasNodeRef.current, { resize: true, useWorker: true }); cleanup: instance.reset()
const handleClick = async (event) => {
  onClick?.(event)
  if (event?.defaultPrevented) return
  const rect = event.currentTarget.getBoundingClientRect()
  const origin = { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
  await confetti({ zIndex: 9999, ...options, origin })
}
```

Two things make this version better than a screen-wide rain: `useWorker: true` moves the physics off the main thread (the canvas is transferred to a worker), and the **origin is the control the user pressed**, expressed as a fraction of the viewport, so the celebration comes out of the action. For Dalilak: ladder the celebrations. Small and frequent (XP, a step done): drawn check plus the 18-chip burst (6.3) plus a rolling number. Medium (course complete, skill star): the star draws in, the match ring advances, the number rolls 70 to 90. Rare (level up, "job ready", first application sent): one confetti burst from the button, in Dalilak's own two or three colours via `colors`, shown once per achievement (store the id in the persisted state). Under reduced motion show the message only.

## 17. Toasts

From `/blog/react-toast-notification-components`: toast for "something happened, carry on", inline alert for "something is wrong, here"; "one position for the whole app"; "stack rather than replace, and cap the stack at three; pause the timer on hover and on focus"; 3 to 4 s for a plain confirmation, 6 to 10 s with a button, no timer for errors; the container must exist in the DOM at load with `aria-live`.

| Component | Author | Path | Take |
|---|---|---|---|
| Sonner | shadcn (wrapper), Emil Kowalski (library) | `@shadcn/components/sonner` | the default; the stacking is pure CSS variables |
| Notification Stack | Kokonut UI | `@kokonutd/components/notification-stack` | peeking stack that fans out; swipe physics worth copying |
| Dynamic Island | cult/ui; Edu Calvo | `@cult-ui/components/dynamic-island`, `@educalvolpz/components/dynamic-island` | a pill that morphs between sizes for status |
| Status Island | Kokonut UI | upstream only (`status-island.tsx`) | island for background tasks, with rolling digits and peeking tasks |
| Achievement Unlocked | Trophy | section 16 | content model |
| Dialog to Toast | DHxWhy | `@dhxwhy/components/dialog-to-toast` | *description only*: on confirm the dialog "shrinks into a corner toast showing the action's progress, result and an undo window" |
| Live Notification Feed | DHxWhy | `@dhxwhy/components/live-notification-feed` | *description only*: each alert "acts out its news as it lands" |
| Save Changes Toast | Yadwinder Singh | `@yadwinder/components/toast-save` | *description only* |

```css
/* Sonner, src/styles.css (excerpts) */
[data-sonner-toast] {
  --y: translateY(100%);
  --lift-amount: calc(var(--lift) * var(--gap));
  z-index: var(--z-index);
  transform: var(--y);
  transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms;
}
[data-sonner-toast][data-mounted='true'] { --y: translateY(0); }
[data-sonner-toast][data-expanded='false'][data-front='false'] {
  --scale: var(--toasts-before) * 0.05 + 1;
  --y: translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));
}
[data-sonner-toast][data-mounted='true'][data-expanded='true'] {
  --y: translateY(calc(var(--lift) * var(--offset)));
  height: var(--initial-height);
}
```

How it works: React only sets data attributes and three numbers per toast (`--toasts-before`, `--offset`, `--initial-height`); every position is computed in CSS and animated by one 400 ms transform transition. Collapsed, each toast behind the front one is lifted by one gap and scaled by 5% per position (the negative scale is flipped by the `--lift` sign), so the stack reads as depth; on hover `data-expanded` spreads them to their measured offsets. Sonner also has a `dir` prop and swipe-to-dismiss. If the lead prefers no new package, the same three-variable scheme is about 60 lines.

Kokonut's Notification Stack documents its gesture constants, useful for any swipeable card: dismiss at 100 px travel **or** 0.11 px/ms release velocity ("A flick shouldn't need to go far"), lock the axis after 6 px, read velocity from the last 80 ms of the gesture, snap back on a critically damped spring (`stiffness 520`, `damping = 2 * sqrt(520)`), fly out at no less than 1400 px/s, show 2 cards peeking 10 px behind the front one.

For Dalilak: XP toasts are the frequent case and should be small and consistent (one position, top-centre on phone). Put the amount in a rolling number and let the toast's XP chip fly to the header counter with a shared `layoutId` so the reward visibly lands in the total. An island (morphing pill at the top) is a good home for the long-running case "Daleel is applying for you": it holds the status line while the user keeps browsing, which is the pattern DHxWhy and Kokonut both build.

## 18. Engagement signal from the popular page

Top of the 60 records embedded in `/community/components/popular`, by bookmarks. The page looks like an early featured set (its records were created between October 2024 and April 2025, and it does not contain the items 21st's guides call "most saved"), so read it as a taste signal, not a ranking.

| Bookmarks | Views | Component | Author | Path |
|---|---|---|---|---|
| 2,322 | 508,525 | Dock | Anurag Mishra | `@anurag-mishra22/components/dock-two` |
| 2,130 | 569,870 | Interactive Bento Gallery | Anurag Mishra | `@anurag-mishra22/components/interactive-bento-gallery` |
| 1,793 | 470,749 | Canvas | Ali Imam | `@designali-in/components/canvas` |
| 1,478 | 549,856 | Hero Section Dark | KinfeMichael Tariku | `@kinfe123/components/hero-section-dark` |
| 1,440 | 564,970 | Pricing Interaction (uses `@number-flow/react`) | LN | `@ln-dev7/components/pricing-interaction` |
| 1,398 | 264,373 | Progress Indicator | Anurag Mishra | `@anurag-mishra22/components/progress-indicator` |
| 1,333 | 532,104 | Hand Writing Text | Kokonut UI | `@kokonutd/components/hand-writing-text` |
| 949 | 209,167 | useImageUpload | Origin UI | `@originui/components/use-image-upload` |
| 767 | 361,646 | Magnetize Button | Kokonut UI | `@kokonutd/components/magnetize-button` |
| 764 | 190,790 | Interactive Checkout (uses `@number-flow/react`) | Kokonut UI | `@kokonutd/components/interactive-checkout` |

What the list says: people save **interactions** (a dock, a stepper, a pricing toggle with rolling numbers, a stroke that draws itself) far more than surfaces. Hand Writing Text (an SVG signature drawn stroke by stroke with `pathLength`) is the technique to borrow for Dalilak's logo reveal on the sign-in page and for the path line drawing itself on the reveal screen.

## The 10 things most worth using in Dalilak

1. **The step-list loader for the path reveal and the CV analysis.** Rows that scroll up 40 px per step and dim by 0.2 per step of distance (Aceternity Multi Step Loader), each with a status icon that swaps with 2 px of blur in 180 ms, a check that draws itself, a rail that fills on completion and a three-line rolling log of real findings under the running step (Kokonut AI Loading State), and only the running row moving (SmoothUI AI Task List). Drive it from real events, with a minimum dwell per step. Sections 7.1 to 7.3.
2. **One shimmer for every "working" label.** Two stacked backgrounds clipped to the text, band width proportional to text length, 2.4 s linear sweep with a short pause, direction reversed for RTL. Neutral, cheap, and safe for Arabic because nothing is split. Section 2.5.
3. **Word-level blur-into-focus for Daleel's answers and for headings.** Split by word with `Intl.Segmenter`, each word an `inline-block` span, 50 ms stagger, 300 ms each, `y 8px` and `blur(4px)`; stagger per block, not across a whole message; the real sentence once for screen readers. Never per character in Arabic. Sections 2.4, 8.1 to 8.3.
4. **The composer trio.** Layout-effect autosize with a max height and an IME check (prompt-kit), one round button whose Send and Stop faces cross-fade with blur in 200 ms and which fills only when there is something to send (Kokonut), and the pill-to-card spring `stiffness 550, damping 45` on width, height and radius (cult/ui Morph Surface). Plus stick-to-bottom scrolling with a 20 px threshold and a user-intent guard. Sections 2.1 to 2.3, 2.6.
5. **Shared-element morphs with only the background layer moving.** One empty `layoutId` layer grows from A to B while labels and content fade on separate layers; `{ type: "spring", bounce: 0.1, duration: 0.4 }`. Use it three times: Daleel's launcher into the chat panel, the dropped CV tile into the file row that heads the analysis, the last loader row into the roadmap header. Sections 2.7, 9.1.
6. **The sliding pill and measured-height panels for all navigation and tabs.** A single `motion.div` with a scoped `layoutId` rendered inside the active item (direction-neutral, width follows the label), `bounce 0.19, duration 0.4`; panels change with old out first, and the container animates to the measured height. Section 13.
7. **A sign-in showcase made of real Dalilak pieces on CSS-only motion.** Three vertical marquee columns at different durations with masked edges, optionally on the isometric plane (`rotateX(55deg) rotateZ(-45deg)`), plus a self-filling event feed (`scale 0 -> 1` from the top edge, spring 350/40, `layout`). No sign-in on 21st does this; these mechanisms do, and they keep running when the main thread is busy. Section 3.
8. **Tactile controls.** The pressed-shadow recipe (inset bottom line that thins, drop shadow that collapses, `active:transition-none` so only the release is eased), hold-to-confirm with a clip-path fill that drains proportionally for "let Daleel apply for me", and the async status button whose label rolls to a spinner, then a drawn check with an 18-chip burst in the button's own colour. Section 6.
9. **Numbers that roll, in a `dir="ltr"` box with tabular figures.** Per-digit drums on `stiffness 280, damping 18, mass 0.3` for match percentage, XP, streak and rank; an overdamped spring (`damping 60, stiffness 100`) when a plain count-up is enough; the `stroke-dasharray` ring for the match gauge with the rolling number in its centre. NumberFlow only with its RTL limitation handled. Section 12.
10. **A leaderboard that moves, and celebrations on a ladder.** Trophy's data shape and podium order (2nd, 1st, 3rd; heights 24/32/20), plus the motion Trophy lacks: `layout="position"` rows so the user's row overtakes others when XP lands, a rolling rank, a fading delta chip. Celebrate small wins locally (drawn check, chip burst, rolling number) and keep one confetti burst, fired from the pressed control and stored as shown, for level-ups and "job ready". Sections 11, 16.

Also worth a line: the one-declaration dot or line grid with a radial mask as the only background treatment (section 4.1), and the stretched-link card with clamped text for every job and course card (section 5).
