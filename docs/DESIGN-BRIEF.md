# Dalilak «دليلك» design brief (the lead's decisions for the design foundation)

The product is called «دليلك» (Dalilak); «مساري» is only the name of the roadmap page. See docs/TEAM-BRIEF.md section 0.

Read after `BRIEF.md`, `HANDOFF-1-IDEA.md`, `docs/TEAM-BRIEF.md`. For product facts use `docs/PRODUCT-SPEC.md`; for motion use
`docs/COMPONENT-PLAYBOOK.md`; for library facts use `docs/STACK-NOTES.md`. Where this file disagrees with the playbook's
placeholder names or with the Darb exploration page, this file wins.

## 1. What Mohammed has decided (18 Nov 2026)

1. **Direction: Darb** ("the first design"): the cartographer's direction. Light paper working surfaces, a deep "stage" for
   set pieces, one accent, a gold for XP, map language (trail, waypoint, contour). Source of truth for the look:
   `design/explore/darb/index.html`, rendered in the chosen font in `design/explore/darb/fonts/option-1.html`, screenshots in
   `design/explore/darb/shots/` and `design/explore/darb/fonts/option-1*.png`. Read the header comment of the HTML: it states
   the idea and the signature ("the waypoint in the opening").
2. **Font: IBM Plex Sans Arabic** for everything (headlines 700, heavy text 600, text 400/500). It is installed and loaded
   in `src/app/layout.tsx`. He rejected Fustat. He notices type first: Arabic typography must be clean everywhere
   (no letter-spacing on Arabic, generous line-height, nothing clipped).
3. **The map (the roadmap) is the centrepiece.** His words: "something impressive and easy to trace and have a good looking
   transition when you open it ... impress me". He leans to layout option 1 (the straight climb, start at the bottom, summit
   at the top) with a gentle sway and a little living motion on the line, the rest of the home at the ORIGINAL Darb
   proportions (left widget column about 340 px), and a 3D-style camera flight to a station when it is pressed (his
   references: the ROSHN and RER maps), with a card showing what the station holds and his progress there. A dedicated
   designer is building it in `design/explore/darb/map/final-home.html`. The roadmap screen is NOT part of the design
   foundation: do not build it now.
4. **Palette: "navy"** (his pick, 18 Nov 01:3x: "I liked the first one which is blue"): ice-blue paper `#EBF0F6`, white
   sheets, deep navy ink `#0E1E3D`, a midnight-navy stage `#0B1B38`, a coral-red accent `#F54D38` whose button label is dark
   navy, and gold `#EDAA1A` for XP. The full scheme is in `design/explore/darb/colors/option-1.html` (screenshots
   `option-1-signin.png`, `option-1-home.png`: this is the look to match) and is already in `src/app/globals.css`. The older
   Darb drafts (`design/explore/darb/shots/`, `fonts/`) show the SAME design in its first palette (cream, green-black,
   vermilion): take drawing, layout and ideas from them, and colours only from the tokens. He may still adjust the palette,
   so **every colour in the product comes from a token** (section 4): no hex values in components, icons, the logo or the
   avatars' brand-coloured parts. A palette swap must be a change of token values only.

## 2. What carries over from Darb unchanged

- The signature: **the waypoint in the opening**. A line is never closed all the way round; it opens once and one accent dot
  sits in or at that opening. The logo is that sentence; every icon carries exactly one waypoint dot; progress is always
  "solid line, waypoint, dotted line".
- Paper and ink discipline; the stage (dark surface) only for set pieces; flat colour; hairline contours as quiet texture.
- The kit ideas: the card whose label sits in its border line; the ghost button as a dotted trail that turns solid on hover;
  the XP bar drawn as a map scale bar; the streak as a campfire with a week trail; the match ring as an open ring ending in
  the waypoint.
- Motion: things are drawn, not popped. Details in the playbook, which is binding.

## 3. What must change (accepted from the jury and from Mohammed; all are requirements)

1. **Contrast floor.** Every text at least 4.5:1 on its surface (large headlines 3:1). `ink-4` is never used for text.
   Locked things are shown with `ink-2`/`ink-3` plus the lock icon, not by fading. The primary button label passes 4.5:1.
2. **Projector sizes.** Nothing a presenter points at is under 14 px. Body 16 px. Captions 13-14 px. Station and card titles
   16 px or more. No monospace captions in the product.
3. **The accent has one meaning: your position and your next action.** It marks the waypoint dot, the current station, the
   one primary action on a screen, and «أنت». It is not a tier colour, not a decoration, not an error colour.
4. **XP is brass and has its own glyph** (the spot height: a small peak with the waypoint dot). A solid triangle never stands
   before a total (it reads as "up"). Gains are written `+200 XP`.
5. **Skill level marks are STARS, as the idea file and the spec say («نجمة»)**: a five-point star drawn in Dalilak's line
   language, 14 px or larger, solid fill for an earned star and a solid outline for an empty slot (1 to 3 slots per skill).
   Never a four-point sparkle, never dotted hairlines. (Darb's peaks are dropped for skills; the peak stays as the XP glyph.)
6. **Game payoff.** Darb reads as a calm trail journal; he asked for a game. Within Darb's own language (ink, stamp, flag,
   contour ripple, drawn lines; no confetti rain, no glow) the kit must give rewards weight: a completion **stamp** («تمّ»
   as an inked survey seal that lands with one press frame), an XP landing that fills the scale bar in counted steps while
   the number counts, richer **badges** (each badge has its own drawn emblem inside one common medal frame; locked ones are
   visible but unlit), tactile buttons (2 px sink on press), a level device on avatars that reads at 32 px.
7. **Avatars:** 12, ids `av-01`..`av-12` (spec 9.6): `av-01`..`av-04` four NEUTRAL figures (the default of every new account),
   `av-05`..`av-08` four women, `av-09`..`av-12` four men. Friendly faces for everyone (the old moustache line read as a frown),
   one consistent hand across all twelve, and they must read at 32 px. The level device is a ring of seven contour segments
   (one lit per level), with no numeral hanging below. Tier colours never use the accent.
8. **Icons:** redraw the ones that misread (skill tree read as a cocktail glass, path as the digit 2, city as a bar chart;
   trophy handles as horns) and give the stock-looking ones (briefcase, lock, search, trophy, upload) Dalilak's own character.
   Stroke 2 px at 24 px. The navigation item «مساري» (the roadmap page, "my path") uses a cut of the logo mark.
9. **Logo:** keep the arch-and-waypoint mark. Add a 16 px favicon cut, centre it optically in the app tile, and set the
   wordmark «دليلك» in IBM Plex Sans Arabic with one custom detail (for example one dot of the ي as the accent waypoint).
   The mark was drawn when the product was called «مساري»; the brand designer checks that it still suits «دليلك» ("your guide":
   a trail and a waypoint fit a guide well) and keeps it unless something is clearly better.
10. **Home leaderboard preview** shows who is first (top three), not only the user's row. (Screen builders will do this.)
11. **Phone:** CV and leaderboard must not be buried. The spec's phone shell (2.4) is the rule.

## 4. Tokens (names are a contract; values may change)

Defined in `src/app/globals.css` under `@theme`, used as Tailwind utilities (`bg-paper`, `text-ink-2`, `border-line`,
`stroke-accent`, ...).

| Token | Role |
|---|---|
| `paper`, `sheet`, `sunk` | page background, raised surface (cards, inputs, the map sheet), wells |
| `line`, `line-strong` | hairlines, control borders |
| `contour`, `contour-2`, `contour-ink` | the quiet map contour line, index contours, small labels sitting on a contour |
| `ink`, `ink-2`, `ink-3` | text in three strengths (all pass 4.5:1 on paper and sheet) |
| `ink-4` | decoration and disabled marks only, never text |
| `stage`, `stage-2`, `stage-3`, `stage-contour`, `stage-contour-2` | the dark surface, its raised tone, its line tone, contour lines on it |
| `on-stage`, `on-stage-2`, `on-stage-3` | text on the stage, three strengths |
| `accent`, `accent-hover`, `accent-press`, `accent-soft`, `on-accent`, `accent-ink` | the one accent, hover, pressed, soft tint, the (dark) label on it, accent-coloured text on light |
| `xp`, `xp-line`, `xp-ink`, `xp-soft`, `xp-on-stage` | XP and rewards only; `xp-ink` for numerals on light |
| `ok`, `ok-soft`, `warn`, `warn-soft` | success and warning only |

A component placed inside an element with `data-surface="stage"` must look right without extra props: the design-system
agent provides semantic aliases that flip there (for example `fg`, `fg-2`, `fg-3`, `surface`, `border`) and documents them
in `docs/DESIGN.md`. Screen builders use the semantic aliases for anything that can sit on both surfaces.

## 5. Who owns which files in the design foundation

| Agent | Owns (creates and edits) | Gallery route |
|---|---|---|
| Design system | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/**`, `docs/DESIGN.md` | `/dev/kit` |
| Motion blocks | `src/lib/motion.ts`, `src/components/motion/**` | `/dev/motion` |
| Signature icons | `src/components/icons/signature.tsx` | `/dev/icons` (top section) |
| Utility icons | `src/components/icons/utility.tsx` | `/dev/icons-utility` |
| Avatars | `src/components/avatars/**` | `/dev/avatars` |
| Brand (and emblems) | `src/components/brand/**`, `src/components/emblems/**`, `src/app/icon.svg`, `public/brand/**` | `/dev/brand`, `/dev/emblems` |
| Chat kit (second wave) | `src/components/chat/**` | `/dev/chat` |

Each gallery is `src/app/dev/<name>/page.tsx`, owned by that agent. Nobody edits another agent's files; if you need
something from another agent, use its contract below and say so in your report. The lead already wrote
`src/lib/cn.ts`, `src/lib/format.ts`, `src/components/icons/icon-base.tsx` and `src/components/icons/index.ts`: do not edit
those four.

## 6. Contracts between the agents (export names and props are fixed)

**Icons** (`import { IconSearch } from "@/components/icons"`). Every icon is
`export function IconName(props: IconProps) { return <IconBase {...props}>…paths…</IconBase>; }` (see `icon-base.tsx`).

- `signature.tsx` (31, including `IconGate` and `IconHereMarker`): navigation `IconPath` (the roadmap page «مساري»: a cut of the logo mark), `IconSkills` (المهارات), `IconCourses`
  (الدورات), `IconCv` (سيرتي), `IconJobs` (الوظائف), `IconApplications` (طلباتي), `IconLeaderboard` (المتصدرون),
  `IconProfile` (ملفي), `IconAdvisor` (دليل: the compass), `IconMore` (المزيد); game `IconXp` (spot height), `IconLevel`,
  `IconStreak` (campfire), `IconBadge`, `IconTrophy`, `IconFlag` (the goal), `IconStar`, `IconStarFilled`, `IconGift`
  (daily reward), `IconTarget` (target job), `IconRankUp`, `IconRankDown`; fields `IconFieldData`, `IconFieldSoftware`,
  `IconFieldDesign`, `IconFieldMarketing`, `IconFieldBusiness`, `IconFieldHr`, `IconFieldProfessional`.
- `utility.tsx` (42, including `IconNewChat`, `IconReset`, `IconRemote`, `IconLessons`, `IconExperience`): `IconSearch`, `IconFilter`, `IconUpload`, `IconSend` (تقديم), `IconArrowForward` (points LEFT: forward
  in Arabic), `IconArrowBack` (points right), `IconArrowUp`, `IconArrowDown`, `IconChevronDown`, `IconChevronUp`,
  `IconChevronForward` (left), `IconChevronBack` (right), `IconPlus`, `IconClose`, `IconCheck`, `IconCheckCircle` (تمّ),
  `IconLock`, `IconUnlock`, `IconEdit`, `IconTrash`, `IconRetry`, `IconStop`, `IconPlay`, `IconLogout`, `IconInfo`,
  `IconWarning`, `IconCopy`, `IconClock`, `IconLocation` (المدينة), `IconCompany` (جهة), `IconCalendar`, `IconFile`,
  `IconPaste`, `IconEvidence` (the CV sentence that proves a skill), `IconBranch`, `IconMapView`, `IconListView`.

**Avatars** (`import { Avatar, AVATARS, type AvatarId } from "@/components/avatars"`):
`type AvatarId = "av-01" | … | "av-12"`; `AVATARS: readonly { id: AvatarId; label: string; kind: "f" | "m" | "n" }[]` ("n" for 01-04, "f" for 05-08, "m" for 09-12);
`<Avatar id size={40} level={3} className title />`: `level` (1..7) draws the seven-segment level ring; without it, no ring.

**Emblems** (`import { BadgeEmblem, LevelEmblem, type BadgeId } from "@/components/emblems"`): `<BadgeEmblem id locked size />` for the twelve
badges of spec 8.6, `<LevelEmblem level size />` for the seven levels of 8.3. They go inside the design system's `BadgeMedal`.

**Brand** (`import { LogoMark, Wordmark, Logo } from "@/components/brand"`): `<LogoMark size className />` (ink from
`currentColor`, waypoint in the accent token), `<Wordmark height className />`, `<Logo layout="horizontal" | "stacked" size />`.

**Motion blocks**: the export names in playbook section 2 (`MotionProvider`, `useInstant`, `PageTransition`, `NavLink`,
`useGo`, `FocusInGroup`, `WordsIn`, `Roll`, `NumberTicker`, `Ring`, `Edge`, `HereMarker`, `useShow`, `SkillTag`, `useTypeOn`,
`FlyToken`, `ReorderList`, `PillTabs`, `useSeen`, `Burst`, `StatusMark`, `Sheet`, `Collapse`) from `@/components/motion`,
tokens from `@/lib/motion`.

**Design system** (`@/components/ui`): at least `Button` (`variant="primary" | "secondary" | "ghost"`, `size`, `icon`),
`IconButton`, `Chip` (selectable), `Card` (`label` sits in the border line), `TextField`, `TextArea`, `Tooltip`, `Stage`
(sets `data-surface="stage"`), `SampleTag` («بيانات تجريبية» / «جهة تجريبية»), `XpBar` (the scale bar), `SkillStars`
(1-3 slots), `Stamp` («تمّ»), `BadgeMedal` (earned / locked, takes an emblem), `StreakFlame` and `StreakWeek`,
`EmptyState`, `ContourBackdrop` (the quiet contour texture), `Toaster` + `toast()` (Base UI Toast), `Kbd`.

**Chat kit** (`@/components/chat`, second wave): `DaleelGlyph` (`state="idle" | "listening" | "thinking" | "working" | "done"`),
`RollingStatus`, `SentBubble`, `Composer`, `ChatThread`, message parts. The advisor panel itself is built in stage 3.

## 7. How the work is checked

Every agent screenshots its gallery (desktop and `--phone`), reads the PNGs and fixes what it sees, then an independent
reviewer who did not build it reviews the screenshots against this brief, and the builder fixes the findings. The dev server
is running on port 3040 (the lead runs it; never start or stop it). Use `npm run shot`, `npm run clip` (motion as an MP4 plus
a contact sheet you can read) and `npm run typecheck -- <your paths>`.
