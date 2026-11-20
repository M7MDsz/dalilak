# How Dalilak «دليل» is drawn (DESIGN.md)

For every screen builder. Read it before you build any screen, then keep `/dev/kit` open beside you: it shows every piece
below in every state, on paper and on the stage. The decisions behind this file are in `docs/DESIGN-BRIEF.md`; motion is in
`docs/COMPONENT-PLAYBOOK.md` (binding). Where this file and the playbook's placeholder colour names disagree, this file wins.

Everything here is importable from one place:

```tsx
import { Button, Card, Chip, Stage, TextField, XpBar, toast, cn } from "@/components/ui";
```

---

## 1. The idea of Darb, in ten lines

1. Your skills are a terrain and Dalilak is its map. The match with your target job is altitude; the roadmap is a trail.
2. **The waypoint in the opening:** a line never closes all the way round; it opens once, and one dot sits in the opening.
   The logo, every icon, the card label, the stamp and the medal all say this one sentence.
3. Progress is always **solid line, waypoint, dotted line**: covered, you, ahead (StreakWeek, the ghost button, the trail).
4. **Paper and ink.** Light ice-blue paper, white sheets, deep navy ink in three strengths. Flat colour, hairline borders.
5. **One accent** (coral) means one thing: your position and your next action.
6. **Brass is XP** and rewards, nothing else.
7. **The stage** (deep navy) is reserved for set pieces: moments, not pages.
8. **Contours** are quiet texture: hairlines that never carry meaning and never compete with content.
9. Things are **drawn, not popped**: lines draw, numbers count, values roll, earned things land once. Nothing loops at rest.
10. Calm in colour, rich in type, spacing and motion. It must read as crafted, and as a game that rewards real progress.

---

## 2. Tokens

All colours live in `src/app/globals.css` as tokens. **No hex value in any component, icon, avatar or logo**: a palette
swap must be a change of token values only. Contrast of every text token on every surface it may sit on is checked by
`node artifacts/foundation/ds/contrast.mjs` (all pairs pass; output in `artifacts/foundation/ds/contrast.txt`).

### 2.1 The palette (raw tokens)

| Token | Value | Role |
|---|---|---|
| `paper` | #ebf0f6 | the page |
| `sheet` | #ffffff | raised: cards, inputs, the map sheet, toasts |
| `sunk` | #d5dfeb | wells, disabled fills |
| `line` | #c9d3e2 | hairlines (decoration) |
| `line-strong` | #7b8aa3 | control borders (3:1 on paper and sheet) |
| `contour`, `contour-2` | #bccbe3, #9db2d4 | map contour lines, index contours |
| `contour-ink` | #4e6a96 | small labels that sit on a contour (4.8:1) |
| `ink`, `ink-2`, `ink-3` | #0e1e3d, #34435d, #505e77 | text, three strengths (all ≥ 4.5:1 on paper, sheet, sunk) |
| `ink-4` | #8492a9 | **never text**: decoration and disabled marks only |
| `stage`, `stage-2`, `stage-3` | #0b1b38, #142748, #2e4a7a | the dark surface, its raised tone, its lines |
| `stage-contour`, `stage-contour-2` | #1a3058, #254477 | contours on the stage |
| `on-stage`, `on-stage-2`, `on-stage-3` | #f4f7fc, #b7c4d9, #8597b4 | text on the stage, three strengths |
| `accent` | #f54d38 | the waypoint, the current station, the one primary action |
| `accent-hover`, `accent-press` | #f0462f, #ec4129 | the primary button's hover and pressed fills |
| `accent-ink` | #bd301c | accent-coloured **text** on light |
| `accent-on-stage` | #ff6b57 | accent-coloured **text** on the stage (added by the design system) |
| `accent-soft` | #ffe0d9 | a soft tint for the user's own small marks on paper (the «أنت هنا» tag on the map); never a card, row or page wash |
| `on-accent` | #08152f | the label on an accent fill (5.2:1; white fails on this coral) |
| `xp`, `xp-line` | #edaa1a, #b27b00 | XP fills, medal disks; gold marks that must be seen (3:1) |
| `xp-ink`, `xp-on-stage` | #926000, #ffc548 | XP numerals on light, on the stage |
| `xp-soft` | #fbecc2 | reward tint, the evidence marker |
| `ok`, `ok-soft` | #0a7550, #d6efe4 | success only |
| `warn`, `warn-soft` | #b2410e, #fde8cd | warnings **and errors** (the accent is never an error colour). A burnt orange: apart from the olive-gold of XP and the red of the accent |
| `warn-on-stage` | #ff9e66 | warning **text** on the stage (added by the design system) |

Values tuned by the design system against the contrast floor: `accent-ink`, `ok`, `warn` one shade darker so they pass on
their own soft tints; `line-strong` and `xp-line` darker so control borders and gold marks reach 3:1; `warn` moved to a burnt
orange so an error never shares the brass of XP; `accent-on-stage` and `warn-on-stage` new.

### 2.2 Semantic aliases: use these for anything that can sit on paper OR on the stage

Every element inside `data-surface="stage"` (which `<Stage>` sets) sees these flip. Inside `data-surface="paper"` they flip
back (a white card floating on the stage). **Kit components use only aliases**, so they work on both surfaces with no props.

| Alias (Tailwind) | On paper | On the stage | Use for |
|---|---|---|---|
| `bg-bg` | paper | stage | the surface itself |
| `bg-surface` | sheet | stage-2 | cards, inputs, raised things |
| `bg-surface-2` | sunk | stage darkened (a well below the stage) | wells, disabled fills, locked medal disks |
| `bg-hover` | sunk/sheet mix | stage-2/stage-3 mix | row and icon-button hover |
| `border-border` | line | stage-3 | hairlines |
| `border-border-strong` | line-strong | on-stage-3 | control borders, dashed tags, dotted trails |
| `text-fg`, `text-fg-2`, `text-fg-3` | ink, ink-2, ink-3 | on-stage, on-stage-2, on-stage-3 | text in three strengths |
| `fg-4` (`bg-fg-4`, `stroke-fg-4`) | ink-4 | stage-3 | decoration only, never text |
| `bg-solid` / `text-on-solid` | ink / sheet | on-stage / stage | inverse: selected chip, secondary hover, tooltip (the «أنت» row is a stage row: 4.8) |
| `text-accent-fg` | accent-ink | accent-on-stage | accent-coloured text («الخطوة التالية») |
| `text-xp-fg` | xp-ink | xp-on-stage | XP numerals |
| `text-ok-fg`, `text-warn-fg` | ok, warn | ok-soft, warn-on-stage | success and warning text and icons |
| `bg-mark` | xp-soft | xp 30% | the evidence highlight |
| `bg-track` | line | stage-3 | the unfilled part of rings and bars |
| `stroke-contour-line`, `-2`, `text-contour-label` | contour, contour-2, contour-ink | stage-contour, stage-contour-2, on-stage-3 | map texture; `border-contour-line-2` is the border of a labelled card |
| `ring-halo` | contour-2 | stage-3 | the 3 px focus halo of fields |
| `outline-focus` | ink | on-stage | the focus ring |

**When to use which.** Use an alias (`text-fg-2`, `bg-surface`) whenever the element could ever appear on the stage. Use a
raw token only for something that is the same on both surfaces by meaning: `bg-accent` (the primary button), `bg-xp` (a
gold fill), `text-ink` on a gold disk, `bg-stage` for the stage itself. Never `text-ink-*` inside something that may sit on
the stage: it disappears there.

`stage:` is also a Tailwind variant (`stage:bg-transparent`) for the rare case where a component must change shape, not
colour, on the stage. `dark:` is bound to the same thing, so pasted library classes never follow the laptop's dark mode.

### 2.3 Type scale (IBM Plex Sans Arabic, 400 / 500 / 600 / 700)

| Class | Size / line-height / weight | Use |
|---|---|---|
| `text-display` | 52 / 1.3 / 700 | the sign-in headline, the reveal headline. Desktop only: on a phone use `text-h1` |
| `text-h1` | 34 / 1.4 / 700 | the page heading |
| `text-h2` | 24 / 1.5 / 700 | a section heading, a sheet title |
| `text-h3` | 20 / 1.55 / 700 | a card title, a station name, an empty state title |
| `text-title` | 17 / 1.6 / 600 | a list-row title, a station title, a large button |
| `text-body` | 16 / 1.85 / 400 | running text (the floor for paragraphs) |
| `text-small` | 14 / 1.7 / 400 | meta, hints, labels, secondary lines (the floor for anything a presenter points at) |
| `text-caption` | 13 / 1.6 / 500 | the smallest text there is: tags, day letters, scale ticks |

- **Never** letter-spacing on Arabic (`tracking-*`), never `uppercase`, never italic. No monospace anywhere in the product.
- Nothing a presenter points at is under 14 px. Station and card titles 16 px or more. Body 16 px.
- Latin digits everywhere, through `formatNumber` / `formatPercent` / `formatGain` from `@/lib/format`. Counters, XP and
  percentages get `tabular-nums`.
- A Latin run inside Arabic (SQL, Power BI, `70%`, `+200 XP`, a file name) goes in `<bdi>` (or `<bdi dir="ltr">` when it
  starts with `+` or a digit), or the sign jumps to the wrong side: «XP 40+» instead of «+40 XP».
- Weights: headlines 700, labels and buttons 600, emphasis 500, text 400.

### 2.4 Space, radii, shadow, layers, focus

| | |
|---|---|
| Spacing | the 4 px grid in steps of 4, 8, 12, 16, 20, 24, 32, 40, 56, 72. Named: `px-gutter` (page edges: 16 / 24 / 32 px at phone / tablet / desktop), `gap-section` (between page sections: 32 / 40 px), `p-card` (inside a card: 20 px) |
| Radii | `rounded-tag` 6 (tags, keys) · `rounded-control` 12 (buttons, inputs) · `rounded-card` 16 · `rounded-sheet` 20 (sheets, panels, toasts) · `rounded-full` (chips, icon buttons, avatars) |
| Shadow | **one**: `shadow-float`, neutral, for things that float above the page (sheets, the advisor panel, toasts, popovers). Never on a card in the page, never coloured, never growing on hover. All other Tailwind shadows are switched off |
| Layers | `z-raised` 10 · `z-sticky` 20 (top bar, tab bar) · `z-launcher` 30 · `z-panel` 40 (advisor) · `z-overlay` 50 (sheets, dialogs) · `z-popover` 60 (select, tooltip, menu) · `z-toast` 70 · `z-fly` 80 (FlyToken) |
| Focus | every focusable element shows a 2 px ring in the surface's ink (`--focus`), 2 px away, on keyboard focus. Fields show an ink border and a 3 px halo (contour-2 on paper, stage-3 on the stage) instead. Nobody removes focus styles |
| Selection | contour blue on paper, stage-3 on the stage |
| Scrollbars | thin, in the surface's decoration tone |
| Toast position | top centre, `--shell-top` + 12 px. **The shell sets `--shell-top`** to its top bar height (default 64 px) |

---

## 3. The three colour rules

### 3.1 The accent rule: your position and your next action

The coral marks exactly: **the waypoint dot** (in icons, the trailhead, a selected chip, today in the week), **the current
station** on the map, **the one primary action of a screen**, and **«أنت»** (the user on the leaderboard, «أنت هنا»).

- One `variant="primary"` button per screen. Everything else is `secondary` or `ghost`.
- **An icon's dot is coral only when the icon is your position or your next action.** Everywhere else the dot takes the
  icon's own colour. The kit does this for you: secondary and ghost buttons, plain and outline icon buttons, field and
  select adornments and chips carry the class `wp-quiet`, which mutes the dot of every icon inside them; disabled controls
  mute it too. The coral dot stays on the primary button's icon, a solid icon button (send), the active navigation item,
  position markers («أنت هنا», the current station, the trailhead) and «دليلك»'s glyph.
  - Your own control outside the kit: add `wp-quiet` to it, or pass `waypoint="muted"` to the icon.
  - A quiet control that IS the user's next action or position (the active nav item, the advisor launcher): add
    `data-wp-live` to it and the coral comes back.
  - A close button never carries a dot (`waypoint="off"`): a coral dot on a close button reads as a notification.
- A card label's dot is muted by default; `dot="accent"` only on the card that holds the user's next step.
- Accent **text** uses `text-accent-fg` (never `text-accent` on light: it fails contrast).
- **Never** the accent for: an error (use `warn`), a tier or rank colour, a heading, a link, a badge, a «جديد» label,
  a decorative stripe, a hover state, the XP colour.

```tsx
<Card dot="accent" label="الخطوة التالية">…<Button icon={<IconArrowForward size={20} />}>ابدأ الدورة</Button></Card>   // ✓
<p className="text-accent-fg">لم نتمكن من قراءة الملف</p>                                                           // ✗ an error: text-warn-fg
```

### 3.2 The XP rule: brass is XP and rewards, nothing else

Brass marks: XP numbers (gains and totals), the XP glyph, the XpBar fill, an earned medal's disk, the daily-reward amounts.

- Write gains as `+200 XP` (sign, Latin digits, a space, «XP» after the number). Use `<XpValue value={200} gain />`; it adds
  the glyph, the colour, the isolation and tabular digits. A solid triangle never stands before a total.
- **The XP glyph is `XpGlyph`** (the spot height: a rounded hill whose line opens at the summit, with the dot standing in
  the opening, in the glyph's own colour). It has no straight legs and no base line, so it never closes into a triangle:
  a triangle with a dot is the warning sign, and XP must never look like a warning. XpValue and the XP toast use it; use it
  alone (`<XpGlyph size={20} className="text-xp-fg" />`) only where a label needs the XP mark without a number.
- Numerals use `text-xp-fg` (it flips on the stage); fills use `bg-xp`.
- **Never** brass for stars (stars are ink), levels, ranks (first place is not gold), buttons, headings or warnings.

### 3.3 The stage rule: the dark surface is for set pieces only

`<Stage>` (deep navy, `data-surface="stage"`) appears only where something is being shown to the user, not where they work:

| Where | What is on the stage |
|---|---|
| `/` sign-in | the moving showcase half (the form half is paper) |
| `/path` | the one next-step card (`<Card variant="stage">`) |
| `/welcome` phase 2 | the path-reveal sequence |
| `/cv` | the analysis show (the input and the results are paper) |
| `/learn/[id]` | the completion celebration |

- At most **one** stage region per screen. Never for a list, a form, a table, reading text or the advisor panel.
- On the stage everything flips by itself: put kit components inside and do not pass colour props.
- A white card floating on the stage takes `data-surface="paper"` (its label then sits inside it, not in the border).
- Popups opened from inside a stage (Select, Tooltip) read the surface of their trigger and follow it.

### 3.4 Success and warning

`ok` for success only (completed, sent, a check mark, «صعدت إلى المركز …»). `warn` for warnings and errors, always with
`IconWarning` and words: colour is never the only signal. Their soft tints are backgrounds for whole banners only. Write
warning text as `text-warn-fg` (warn on paper, warn-on-stage on the stage).

---

## 4. Page anatomy (recipes)

Every `page.tsx` is wrapped in `PageTransition` from `@/components/motion` (playbook 1.5). Use logical classes only:
`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `border-s`, `rounded-s-*`.

### 4.0 Page widths and columns

The shell owns the navigation and the top bar; a page lays out inside the content area the shell gives it.

| | |
|---|---|
| Content width | `mx-auto w-full max-w-[72rem] px-gutter` (1152 px at most). Running text at most `max-w-2xl` (42rem) |
| The home (lg, 1024 px and up) | two columns, the Darb proportions: the map, then the widget column of 340 px. `grid gap-6 lg:grid-cols-[minmax(0,1fr)_21.25rem]`. The map comes first in the source, so in Arabic it sits on the right (where reading starts) and the widget column on the left |
| A detail page (a job, a course) | the same grid: the content, then the action card (apply, start) in the 340 px column, `lg:sticky lg:top-[calc(var(--shell-top)+1.5rem)]` |
| A list page (jobs, courses, leaderboard) | one column at the content width; cards in a grid go `md:grid-cols-2`, never three columns under `xl` |
| Under lg | one column in reading order: the next step first, then the map, then the widgets |
| Phone (390 px) | `px-gutter` is 16 px; cards run full width; nothing has a fixed width over 358 px; no sideways scroll |

The advisor panel floats over the page; pages do not reflow when it opens.

### 4.1 Page header

On desktop the shell's top bar carries the page heading (spec 2.3); on a phone the heading is the first line of the page
(2.4). Follow the shell's decision for the `h1`; the subline and the honest tag stay in the page.

```tsx
<header className="flex flex-col gap-1">
  <h1 className="text-h1">الوظائف</h1>
  <p className="text-body text-fg-2">كل وظيفة ومعها نسبة مطابقتك لها.</p>
</header>
```

### 4.2 Section

```tsx
<section className="flex flex-col gap-4" aria-labelledby="best">
  <div className="flex items-baseline justify-between gap-3">
    <h2 className="text-h2" id="best">أفضل الوظائف لمهاراتك</h2>
    <NavLink href="/jobs" className={buttonStyles({ variant: "ghost", size: "sm" })}>كل الوظائف</NavLink>
  </div>
  {/* content */}
</section>
```

Sections are separated by `gap-section` on the page container: `<main className="flex flex-col gap-section px-gutter py-8">`.

### 4.3 Card with a label

```tsx
<Card label="سيرتك الذاتية">
  <h3 className="text-h3">في سيرتك 8 مهارات</h3>
  <p className="mt-1 text-small text-fg-2">كل مهارة معها الجملة التي تثبتها من سيرتك.</p>
  <Button className="mt-3" size="sm" variant="ghost">اعرض المهارات</Button>
</Card>
```

### 4.4 List row

```tsx
<ul className="divide-y divide-border rounded-card border border-border bg-surface">
  <li className="flex items-center gap-3 px-card py-3.5">
    <div className="min-w-0 flex-1">
      <p className="truncate text-title">Excel</p>
      <p className="text-small text-fg-3">من سيرتك: «حلّلتُ بيانات المبيعات الشهرية…»</p>
    </div>
    <SkillStars value={2} size="sm" />
  </li>
</ul>
```

A clickable row: the whole row is the link (`NavLink`), hover = `hover:bg-hover`, never a lift. `SkillStars size="sm"`
draws a 15 px star (never smaller); use `md` in cards and panels.

### 4.5 Filters row

```tsx
<div className="flex flex-col gap-3 md:flex-row md:items-end">
  <TextField className="md:flex-1" hideLabel label="ابحث" icon={<IconSearch size={20} />}
    placeholder="ابحث بالمسمى أو المهارة أو الجهة" data-testid="jobs-search" />
  <div className="grid grid-cols-2 gap-3 md:flex">
    <SelectField hideLabel label="المدينة" size="sm" icon={<IconLocation size={20} />} items={CITIES}
      value={city} onValueChange={setCity} itemTestIdPrefix="jobs-filter-city" />
    <SelectField hideLabel label="المجال" size="sm" icon={<IconFilter size={20} />} items={FIELDS}
      value={field} onValueChange={setField} itemTestIdPrefix="jobs-filter-field" />
  </div>
</div>
```

Filters write the URL with `router.replace(url, { scroll: false })` (playbook 1.5) and do not transition; the list reorders.

### 4.6 Empty state

```tsx
<Card padding="none">
  <EmptyState testId="jobs-empty" title="لا توجد وظائف بهذه المواصفات."
    action={<Button variant="secondary" onClick={clear} data-testid="jobs-clear">امسح التصفية</Button>} />
</Card>
```

### 4.7 A set piece on the stage

```tsx
<Stage as="section" contour className="rounded-sheet px-gutter py-10">
  <p className="text-small font-semibold text-accent-fg">أقرأ سيرتك</p>
  <h2 className="text-h2">وجدت 8 مهارات</h2>
  <XpBar total={180} from={150} to={350} level={2} title="مستكشف" />
  <Button>اذهب إلى مساري</Button>   {/* everything inside flips by itself */}
</Stage>
```

### 4.8 Leaderboard row (and «أنت»)

```tsx
import { Avatar } from "@/components/avatars";

<Card padding="none">
  <ol className="flex flex-col gap-1 p-2">
    <li className="flex h-14 items-center gap-3 rounded-control px-3">
      <span dir="ltr" className="w-7 shrink-0 text-center text-title font-bold text-fg-3 tabular-nums">2</span>
      <Avatar id="av-10" size={40} level={5} />
      <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">فيصل الدوسري</span>
      <XpValue size="sm" value={1980} />
    </li>
    <li className="px-3 py-1"><Divider variant="trail" label="المراتب 4 إلى 6" /></li>
    {/* the user's own row: an ink row (data-surface="stage" flips everything inside), «أنت» in the accent */}
    <li data-surface="stage" className="flex h-14 items-center gap-3 rounded-control bg-bg px-3">
      <span dir="ltr" className="w-7 shrink-0 text-center text-title font-bold text-fg-3 tabular-nums">7</span>
      <Avatar id={user.avatar} size={40} level={user.level} />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-body font-medium text-fg">{user.name}</span>
        <span className="shrink-0 text-small font-semibold text-accent-fg">أنت</span>
      </span>
      <XpValue size="sm" value={user.xp} />
    </li>
  </ol>
</Card>
<p className="flex items-center gap-2 text-small text-fg-3"><SampleTag />المستخدمون الآخرون هنا للعرض فقط.</p>
```

- **«أنت» has one recipe:** the ink row (`data-surface="stage"` + `bg-bg`, as the Darb drafts draw it) with the word «أنت»
  in `text-accent-fg`. Not an accent-soft tint, not a coral row. The ink row is an inverse row, not a set piece: it does
  not count against the one-stage rule. The same row works in the home preview (top three, then the gap, then «أنت»).
- Rank: Latin tabular digits in `text-fg-3`, the same for every place. First place is never gold, silver or bronze (brass
  is XP only); the podium («Podium» in `@/components/motion`) is what marks the top three.
- Avatar 40 with its level ring in rows; 32 in the home preview (the ring still reads there). The name truncates; the XP
  never wraps.
- A gap in the ranking is a trail `Divider` with its label, never «...».

---

## 5. The primitives

Every interactive primitive has the playbook press (down at once to `scale 0.97` with a 2 px sink, back in 200 ms), a
visible keyboard focus, a disabled state, and works on paper, on the stage, in RTL and at 390 px. Hover changes colour or
border only.

### Button
`variant` `"primary" | "secondary" | "ghost"` (default primary) · `size` `"sm" | "md" | "lg"` (40 / 48 / 56 px; sm only
inside cards and rows) · `icon` (20 px md/lg, 18 px sm) · `iconPosition` `"start" | "end"` (default end, the inline-end) ·
`pressed` (shows the press frame: «دليلك» pressing it) · `loading` (keeps label and width, the icon becomes the running arc,
presses stop) · `render` (another element: `render={<a href="/samples/cv.pdf" />}`) · every `<button>` prop.
```tsx
<Button icon={<IconArrowForward size={20} />} data-testid="path-next-start">ابدأ الدورة</Button>
<NavLink href="/jobs" className={buttonStyles({ variant: "secondary" })}>كل الوظائف</NavLink>
```
`buttonStyles({ variant, size, className })` gives the same classes to an element that cannot be a Button: use it for
in-app links (`NavLink` from `@/components/motion`, so the route transition plays). The ghost is the dotted trail; hover
walks it solid from the inline-start; pressed, the trail turns accent.

The primary is a key: a 3 px edge in `accent-ink` under the coral face (a border, not a shadow). Pressed, the face sinks
2 px and the edge collapses to 1 px, so the key visibly goes down. On hover its colour stays; the forward icon at the
inline-end steps 2 px toward where it points. Secondary and ghost carry `wp-quiet` (their icon's dot is not coral, 3.1).

### IconButton
`label` (required, Arabic: «إغلاق», «إرسال», «إيقاف») · `icon` (required) · `variant` `"plain" | "outline" | "solid"` ·
`size` `"sm" | "md" | "lg"` (36 / 44 / 52) · `tip` (also show the label as a tooltip on desktop) · `pressed` · `render`.
Plain and outline are quiet (`wp-quiet`); solid keeps the coral dot because it is the action itself (send). Close buttons
pass `waypoint="off"` to their icon.
```tsx
<IconButton label="إغلاق" icon={<IconClose size={20} />} onClick={close} />
```

### Chip and SkillChip
Chip: `selected` · `size` `"sm" | "md"` (32 / 40) · `icon` · `pressed` · every `<button>` prop. It carries `aria-pressed`
and `data-state="selected" | "idle"`. Selected = ink fill with the waypoint dot at its start.
```tsx
<Chip selected={city === "riyadh"} onClick={() => pick("riyadh")} data-testid="welcome-chip-riyadh">الرياض</Chip>
```
SkillChip (not interactive): `state` `"has" | "missing" | "plain"`. `<SkillChip state="missing">Power BI</SkillChip>`

### Card
`label` (cut into the top border; inside the card on a stage card) · `dot` `"accent" | "muted" | "none"` (default muted) ·
`variant` `"sheet" | "plain" | "stage"` · `interactive` (border darkens on hover, a 0.99 press) · `padding` `"card" | "none"`.
```tsx
<Card label="مطابقتك">…</Card>
<Card variant="stage" dot="accent" label="الخطوة التالية">…</Card>
```
A labelled card is a `<fieldset>` with a `<legend>` (the only element whose border opens for its label on any background).
The label is 14 px semibold (a presenter points at it); the border of a labelled card is the index contour
(`border-contour-line-2`), strong enough to survive a projector; unlabelled cards keep the hairline.

### Stage
`as` (`"div" | "section" | "aside" | "main" | "article" | "header"`) · `contour` (`true` or `"faint" | "quiet" | "present"`)
· `contourSummit` (`{ x, y }` fractions) · every `<div>` prop. Sets `data-surface="stage"`, `relative isolate`.
```tsx
<Stage as="section" contour="present" className="min-h-dvh">…</Stage>
```

### TextField and TextArea
TextField: `label` (required) · `hideLabel` · `hint` · `error` (replaces the hint; warn colour, warning icon,
`aria-invalid`) · `size` `"md" | "lg"` (52 / 58 px) · `icon` (inline-start) · `end` (inline-end adornment) ·
`fieldClassName` (the box) · every `<input>` prop. TextArea: the same minus `size`/`icon`/`end`, plus `rows` (minimum
lines; it grows with its text up to 16 lines).
```tsx
<TextField label="اسمك" size="lg" placeholder="اكتب اسمك الأول" data-testid="signin-name" />
<TextArea label="أو الصق نص السيرة" placeholder="الصق هنا نص سيرتك الذاتية…" hint="80 حرفاً على الأقل." />
```

### SelectField
`label` · `hideLabel` · `items` (`{ value, label }[]`) · `value` / `defaultValue` / `onValueChange(value | null)` ·
`placeholder` · `size` `"md" | "sm"` (52 / 44) · `icon` · `hint` · `disabled` · `name` · `testId` (trigger) ·
`itemTestIdPrefix` (items get `{prefix}-{value}`). Base UI Select: keyboard, typeahead, a normal dropdown under the trigger.
```tsx
<SelectField label="المدينة" items={CITIES} value={city} onValueChange={setCity} itemTestIdPrefix="jobs-filter-city" />
```

### Tooltip
`content` · `children` (one element that receives the trigger props) · `side` `"top" | "bottom" | "inline-start" |
"inline-end"`. Desktop hover and focus only: never the only way to learn something (phones have no hover).
```tsx
<Tooltip content="افتح مساري"><IconButton label="مساري" icon={<IconPath size={20} />} /></Tooltip>
```

### SampleTag
`kind` `"data" | "company" | "cv"` → «بيانات تجريبية» · «جهة تجريبية» · «سيرة تجريبية»; or children for other wording.
`<SampleTag kind="company" />`

### XpValue
`value` · `gain` (writes `+`) · `size` `"sm" | "md" | "lg"` (text 14 / 15 / 20 px, glyph 18 / 20 / 26 px) · `count`
(counts when the value changes). `<XpValue value={200} gain />` → «+200 XP» in brass with the XP glyph (`XpGlyph`, 3.2).

### XpBar (the map scale bar)
`total` · `from` (this level's threshold) · `to` (next threshold, `null` at level 7) · `level` · `title` ·
`variant` `"full" | "compact"` (compact = one line and a thin bar, for the user chip) · `segments` (5) · `showRemaining`
and `nextTitle` («بقي 180 XP للمستوى 4 «متمكّن»») · `testId`. Carries `data-value` (total) and `data-level`.
```tsx
<XpBar total={420} from={350} to={600} level={3} title="مجتهد" testId="profile-xp" />
```
When `total` rises, the segments fill one after another (160 ms each) while the number counts; on a level-up the old
sheet fills to its end, then the new level's sheet starts empty (a cut, never an un-draw) and the title rolls.

### SkillStars
`value` (0..slots) · `slots` `1 | 2 | 3` · `size` `"sm" | "md" | "lg"` (the drawn star is 15 / 18 / 23 px, in boxes of
18 / 22 / 28; never smaller: sm in rows, md in cards and panels, lg in celebrations and CV results) · `fresh` (the
1-based slot that was just earned: it lands with a pop) · `freshDelay` (s) · `testId`. Earned = solid ink star, empty =
solid outline in ink-3; `role="img"` with an Arabic label («نجمتان من 3»), `data-value`.
`<SkillStars value={2} slots={3} fresh={2} freshDelay={0.4} testId="cv-skill-sql" />`

### Stamp
`label` (default «تمّ»; up to five letters: a longer word moves the side ticks out) · `size` `"sm" | "md" | "lg"` (64 / 96 /
128; sm draws a heavier ring with less grain) · `tone` `"ok" | "ink"` · `play` (lands now: comes down, one 0.95 press frame,
one contour ripple) · `delay` (s) · `testId`.
`<Stamp play delay={0.3} testId="course-done-stamp" />`

### BadgeMedal
`emblem` (the badge's drawn emblem node; or `(locked) => node` from a client component only) · `lockedEmblem` (node, for
server components) · `state` `"earned" | "locked" | "new"` · `name` · `description` (earned) · `hint` (locked) · `size`
`"sm" | "md" | "lg"` (56 / 80 / 112) · `bare` (medal only) · `delay` · `testId`. Locked = visible but unlit, with the lock
pip and the hint; `new` = the lit medal wipes up over its locked form (500 ms), lands with one pop and one ripple.
The earned disk is struck brass: an `xp-line` rim and one inner ink hairline. **The emblem is sized for you:** whatever
you pass fills a box of 54% of the medal (30 / 43 / 60 px), so pass `<BadgeEmblem id />` with no `size`.
The emblem's waypoint is coral only while the medal is `new` (unlocking in front of the user); on an earned medal the
medal draws it in ink (a badge won is a place you passed, not your position).
```tsx
<BadgeMedal emblem={<BadgeEmblem id="first-course" />} lockedEmblem={<BadgeEmblem id="first-course" locked />}
  state={earned ? "earned" : "locked"} name="أول دورة" description="أكملت أول دورة." hint="أكمل دورة واحدة." />
```

### Ring (the match ring, from `@/components/motion`)
`import { Ring } from "@/components/motion";` · `value` (0..100) · `size` (40..160 px; 56 in a list row, 96 to 120 on a
card or a job page; under 56 the % sign drops) · `preview` (a projected value: the next leg in accent dots and an open tick,
for «what this course adds») · `from` (draw from this value on first paint) · `delay` · `hideNumber` · `onDrawn`.
One **open** ring that ends in the waypoint, never a closed donut: the covered arc in `fg` (solid, from 12 o'clock,
clockwise), the way ahead as a dotted track in `border-strong`, the end dot in `accent` with a cut around it in
`--ring-cut` (the surface colour by default: on the page background add `className="[--ring-cut:var(--color-bg)]"`). The
number is Latin, tabular, and counts with the arc. It flips on the stage by itself.
```tsx
<Ring value={job.match} size={56} />                                   // a job row
<Ring value={70} preview={hovered ? 90 : undefined} size={120} />       // the target job card
```

### StreakFlame and StreakWeek
StreakFlame: `days` · `size` `"sm" | "md"` (sm is one line for the user chip) · `testId`. The number rolls and the fire
answers once when `days` changes. `<StreakFlame days={4} size="sm" testId="shell-streak" />`
StreakWeek: `days` (seven `"done" | "today" | "ahead" | "missed"`, Sunday first) · `letters` (default ح ن ث ر خ ج س).
`<StreakWeek days={["done", "done", "done", "today", "ahead", "ahead", "ahead"]} />`

### EmptyState
`title` · `body` · `action` (one) · `art` (default: the trailhead drawing) · `testId`. Calm, drawn, one action; never an
apology, never a big grey icon.

### ContourBackdrop
`intensity` `"faint" | "quiet" | "present"` · `summit` `{ x, y }` · `rings` · `seed`. One static SVG paint, deterministic,
colours from the surface. Place it as the first child of a `relative isolate` box (or use `<Stage contour>`).

### Divider and Kbd
Divider: `variant` `"line" | "trail"` · `label` (text in the middle: «المراتب 4 و5») · `orientation`.
Kbd: `keys` (`["Ctrl", "K"]`, kept left to right inside Arabic) or one key as children.

### Toasts
The `Toaster` is already mounted by `src/components/providers.tsx`. Raise toasts from anywhere (also outside React):

```tsx
toast.xp({ amount: 100, reason: "حلّلت سيرتك", rank: 18 });       // data-testid="toast-xp", data-value=100; toast-xp-rank
toast.badge({ badgeId: "cv-scanned", name: "سيرة مقروءة", description: "حلّلت سيرتك واكتشفت مهاراتك.", emblem: <BadgeEmblem id="cv-scanned" /> }); // sized by the medal
toast({ title: "تعذّر التحليل الآن.", description: "جرّب مرة أخرى.", tone: "warn" });
```

XP toast 3.5 s, badge toast 5 s, newest on top, three at most, top centre under the top bar. The XP toast's coin (a brass
disk with an `xp-line` rim and the `XpGlyph` in ink) carries
`data-xp-token` for the `xp-fly` FlyToken. Holding toasts while a show runs (spec 3.15) is the queue's job, not the toast's.

### Also exported
`XpGlyph` (the XP mark, 3.2) · `press` (the press classes, for a custom control) · `RunningArc` · `FieldShell` and `fieldBox` (to build another field) ·
`TrailheadArt` · `surfaceOf(el)` · `toastManager` · `cn` (see 7).

---

## 6. A plain list page still looks like Dalilak

A list page has no stage and no show. It still reads as Dalilak because of five things, all free:

1. **Paper and sheets.** The page is `bg-bg`; the list sits on one `bg-surface` sheet with hairline dividers, not on
   twenty floating cards with shadows.
2. **Type does the hierarchy.** `text-h1` heading, `text-body text-fg-2` subline, `text-title` row titles, `text-small
   text-fg-3` meta. No bold everywhere, no colour for emphasis.
3. **One waypoint.** The single accent on the page is the user's own thing (their row, their target's tag, the one
   primary action). Everything else is ink.
4. **The trail language in small places.** The «more» link is a ghost (dotted trail), the honest tag is dashed, a gap in a
   ranked list is a dotted Divider with its label, skills are stars, XP is brass with its glyph.
5. **Motion with a cause.** The page rises in with the route; filters reorder rows in place; nothing else moves.

```tsx
<PageTransition>
  <main className="flex flex-col gap-section px-gutter py-8">
    <header className="flex flex-col gap-1">
      <h1 className="text-h1">الوظائف</h1>
      <p className="text-body text-fg-2">كل وظيفة ومعها نسبة مطابقتك لها.</p>
    </header>
    <p className="flex items-center gap-2 text-small text-fg-3"><SampleTag />الوظائف والجهات هنا للعرض فقط.</p>
    {/* filters row: 4.5 */}
    <p className="text-small text-fg-2" data-testid="jobs-count" data-value={20}>20 وظيفة · مرتّبة حسب المطابقة</p>
    <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {jobs.map((job) => (
        <li key={job.id}>
          <NavLink href={`/jobs/${job.id}`} className="flex items-center gap-4 px-card py-4 transition-colors duration-200 hover:bg-hover">
            <div className="min-w-0 flex-1">
              <p className="text-title">{job.title}</p>
              <p className="text-small text-fg-2">{job.company} · {job.city} <SampleTag kind="company" className="ms-1" /></p>
              <p className="text-small text-fg-3">ينقصك: <bdi>Power BI</bdi>، الإحصاء</p>
            </div>
            <Ring value={job.match} size={56} />  {/* import { NavLink, PageTransition, Ring } from "@/components/motion" */}
          </NavLink>
        </li>
      ))}
    </ol>
  </main>
</PageTransition>
```

---

## 7. Engineering notes

- **`cn`: use the one from `@/components/ui`.** Plain `tailwind-merge` does not know Dalilak's type names: `cn("text-h1",
  "text-fg")` silently drops `text-h1` (it takes `h1` for a colour), the same for `text-small`, `text-caption`, `rounded-card`,
  `shadow-float`. The kit's `cn` is configured (`dalilakMergeConfig`). Until `src/lib/cn.ts` adopts the same config, import
  `cn` from `@/components/ui`. Also: a `text-*` size after a `leading-*` in one `cn()` removes the leading; put `leading-*`
  last.
- **Server and client.** Kit components with state or motion are client components; they render fine inside server
  pages. Do not pass functions as props from a server component (`BadgeMedal`'s function `emblem`): pass nodes.
- **Programmatic press.** When «دليلك» acts on a control, set `pressed` for about 160 ms, then call the action. The press is
  seen; the action follows it.
- **Test ids** come from the spec: pass `data-testid` to any kit component (it reaches the element), or `testId` where the
  component renders several elements (XpBar, SkillStars, Stamp, BadgeMedal, StreakFlame, EmptyState, SelectField). Numbers
  that animate carry `data-value` with the final value from the first frame.
- **Portals** (Select, Tooltip, toasts) render in `<body>`: they read their surface from the trigger. A Dialog/Sheet popup
  opened from a stage must repeat `data-surface="stage"` on its popup if it should be dark.
- `?still=1` sets `html[data-still]`: every CSS animation and transition jumps to its end, Motion skips. Use it for QA
  screenshots of settled screens. Reduced motion is honoured by the playbook's global rule.
- Colours inside SVG: `className="stroke-fg-3"`, `className="fill-accent"`, never a hex attribute.

---

## 8. Do and never

**Do**
- Build from the kit; if a piece is missing, compose it from tokens and the recipes, and tell the design system.
- Use semantic aliases for anything that can sit on the stage.
- Keep one primary action per screen and one stage region at most.
- Write XP as `<XpValue>`, skills as `<SkillStars>`, honesty as `<SampleTag>`.
- Let type, spacing and the trail language carry the hierarchy.

**Never** (Mohammed's rejected list and what leads to it)
- Gradient or glow washes on cards, headers or backgrounds · coloured or glowing shadows · glass or `backdrop-blur` ·
  sparkle / ✦ icons · emoji as icons · a purple-gradient "AI" look · an orb or blob for «دليلك».
- Bouncing or pulsing dots next to a spinner (waiting is «دليلك»'s glyph and a rolling status line) · a spinner for a page.
- Hover lift, scale or shadow growth · a loop at rest outside the five allowed (playbook 1.7).
- Heavy spring page pushes, dimming, two pages visible at once.
- A coral dot on a quiet control (close, search, filters, secondary actions): see the waypoint rule, 3.1.
- A hex colour in a component · `left`/`right`/`pl`/`pr`/`ml`/`mr`/`text-left` · letter-spacing on Arabic · text under
  13 px · `ink-4` (`fg-4`) as text · the accent as an error or decoration · brass for anything that is not XP or a reward.
- A second shadow · a stock icon pack · Arabic-Indic digits · a bare `toLocaleString()`.

---

## 9. Pre-flight checklist (before you hand a screen over)

1. **Contrast:** every text uses `fg`, `fg-2`, `fg-3` (or a `*-fg` alias) on its own surface; nothing uses `fg-4`/`ink-4`
   as text; accent text is `text-accent-fg`. Run the contrast script if you touched a token.
2. **Sizes:** body 16, nothing a presenter points at under 14, captions 13 at the least, titles 16+.
3. **RTL:** logical classes only; directional icons point the Arabic way (forward = left); Latin runs in `<bdi>`.
4. **390 px:** no sideways scroll (`document.documentElement.scrollWidth === 390`); rows wrap; buttons do not truncate
   their meaning.
5. **Focus:** Tab reaches every control in reading order, the ring is visible on paper and on the stage, dialogs return
   focus on close.
6. **Reduced motion and `?still=1`:** the screen shows its end state; nothing is stuck mid-animation.
7. **Test ids and `data-value`** exactly as the spec names them.
8. **Colours:** no hex in your files (`grep -n "#[0-9a-fA-F]\{3,6\}" yourfile`), one primary, one stage at most, brass only
   for XP. Count the coral dots on the screen: each one must be the user's position or next action (3.1).
9. **Honesty:** sample data carries its `SampleTag`; no invented statistics.
10. **Screenshot** desktop (1440) and `--phone`, read the PNGs, compare with `/dev/kit`.
