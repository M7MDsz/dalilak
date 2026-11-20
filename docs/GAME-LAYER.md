# The game layer of Dalilak «دليلك» (GAME-LAYER.md)

For every screen builder. Written 18 Nov 2026 by the game-layer design lead, after Mohammed looked at the running app and
wrote: "And for دليلك I want to keep the gaming UI so if you wanted to change to it so you have the choice". His first brief
asked for "a game like Laracast … BUT with a great UI". Several screens read like a calm dashboard. This file says how every
screen becomes a game without leaving Darb: the same paper and navy ink, the same map, the same font and palette.

Read it with `docs/DESIGN.md` (tokens, primitives, the three colour rules) and keep **`/dev/game`** open beside you: it shows
every piece below in every state, on paper and on the stage, plus two mocks (the jobs page and the CV results) built only
from these pieces. Before screenshots of every screen are in `artifacts/gaming/before-*.png`.

```tsx
import { DestinationCard, QuestCard, PlayerChip, RewardChip, Tile, StateRibbon } from "@/components/game";
```

Every piece is data-agnostic (props in, no store reads), a client component, tokens only, logical properties only, Latin
digits through `@/lib/format`.

---

## 1. The idea in ten lines

1. **You are the player.** Your avatar, your level token, your XP track, your streak and your rank travel with you (the HUD).
2. **The path is the board.** The map on `/path` is the board you play on (it is approved and does not change).
3. **Courses are quests.** Each one says what you do, what it costs (hours, lessons) and what you get (its XP, the star it
   grants, the match it adds). The current one is the quest you are on.
4. **Jobs are destinations you unlock.** A job's five requirements are the five segments of its unlock meter; the skills still
   missing are locked gems; the lock at the end opens at 100%.
5. **Skills are pieces you collect.** The CV analysis ends in a haul: every skill found is a card with its stars and its proof.
6. **Rewards are real and visible.** Course XP, the star, the match gain, +40 XP for applying at 60% or more, the daily
   reward, the next level: shown where they are earned, never invented (spec P2).
7. **Everything is a piece.** Pressable things are tactile tiles with an ink outline on a flat ink plinth; they sink when pressed.
8. **One state language.** Locked, available, next, in progress, done: drawn the same way on every screen.
9. **Feedback lands.** Meters fill in counted steps, numbers count, stars and stamps land once, states roll. Each with a cause.
10. **Calm in colour, rich in shape.** Navy ink and paper; coral only for your position and your next action; brass only for XP.

---

## 2. Vocabulary (the pieces and where each lives)

| Piece | What it is | Used on |
|---|---|---|
| `Tile` | The tactile base: ink outline face on a flat plinth, five states, sinks when pressed | everything pressable below; flat (`interactive={false}`) for read-only cards |
| `StateRibbon` | The tag hung on a tile's top edge: «التالية», «مقفلة», «مكتملة», «جارية · 2 من 5», «هدفك», «قدّمت», «مثبتة» | every tile with a state |
| `RewardChip`, `RewardRow`, `XpCoin` | A real reward: XP (brass), star (ink), match gain (ink), badge; offer / earned / locked | quests, destinations, the jobs banner, CV header, celebration, daily reward |
| `QuestCard`, `QuestNumber` | A course as a quest, with its station number from the map | `/learn`, the course page header, the home column, the skill panel, the job page's «كيف تسدّ الفجوة» |
| `DestinationCard` | A job as a destination: ring, unlock meter, locked gems, apply reward | `/jobs`, the CV results, the path's branches, the reveal's alternatives |
| `UnlockMeter` | Five requirement segments (spec 7.2) and the lock | inside DestinationCard; on the job page under the ring (with `labels`) |
| `SkillGem`, `LockedGem` | One skill as a collectible: met / partial / locked, with its stars | destination cards, the job page's gap, the apply sheet's skills, the skill panel |
| `LootCard`, `LootReveal`, `CollectionMeter` | A skill found, with its proof; the cards landing; «مجموعتك: 8 من 38 مهارة» | the CV results; the skills page header |
| `PlayerChip` | The top-bar chip (spec 2.7) as a HUD plate; `compact` for phones | the shell's top bar |
| `PlayerCard` | The player plate: avatar, level token, XP track with what is left, streak, badges, tomorrow's reward, rank | top of the home column; the profile hero |
| `XpTrack`, `LevelToken`, `StreakCount`, `StatTile` | HUD parts: brass segments that fill in steps; the level as an ink token; the campfire count; one stat | chip, cards, profile stats row, level-up |
| `DailyTrack`, `dailyDays()` | The daily reward (spec 8.4) as a track of brass coins: claimed, today, ahead with amounts | the home column (under the player card), the daily-reward sheet, the profile streak card |
| `AnswerTile`, `StepTrail` | Quick replies as pressable pieces; the six questions as a trail of six stops | `/welcome` |
| `Segments`, `LessonMeter` | The segmented bar under every meter; «2 من 5 دروس» | quests in progress, the course page |
| helpers | `dailyRewardFor(day)`, `requirementFill(have, need)`, `matchOf(skills)`, `hoursLabel`, `lessonsLabel`, `GAME_STATES`, `STATE_LABEL` | anywhere |

### 2.1 Props at a glance

| Piece | Props (all optional unless marked *) |
|---|---|
| `Tile` | `state` (`GameState`, default `available`) · `depth` `sm`/`md`/`lg` (3/4/6 px) · `radius` `control`/`card`/`sheet`/`full` · `interactive` (default true; false = flat div) · `selected` · `pressed` · `ribbon` (node hung on the top edge) · `className` (outer box) · `faceClassName` (face) · `render` (`<NavLink href />`) · every `<button>` prop |
| `StateRibbon` | `state` · `tone` `accent`/`ink`/`ok`/`quiet`/`locked` · `icon` (node or `null`) · `children` (label) · `rollId` · `size` `sm`/`md` · `testId` |
| `RewardChip` | `kind` `xp`/`star`/`match`/`badge` · `value` · `label` · `status` `offer`/`earned`/`locked` · `size` `sm`/`md`/`lg` · `land` (pop on mount and on status change) · `delay` · `testId` |
| `RewardRow` | `label` (default «تكسب») · `children`* |
| `XpCoin` | `size` (px) |
| `SkillGem` | `name`* · `have`* · `need` (a requirement) or `slots` (a collection) · `size` `sm`/`md` · `icon` · `fresh` · `freshDelay` · `testId` |
| `LockedGem` | `name`* · `need` · `size` · `testId` |
| `UnlockMeter` | `skills`* (`{ name, have, need }[]`) · `value`* (the match) · `labels` (names under the segments, from 640 px) · `caption` (node, `null` hides) · `size` `sm`/`md` · `delay` · `testId` |
| `Segments` | `fills`* (0..1 each) · `tone` `ink`/`xp` · `height` `xs`/`sm`/`md`/`lg` · `gap` · `variant` `boxed`/`ticks` · `delay` · `label` |
| `LessonMeter` | `done`* · `total`* · `testId` |
| `CollectionMeter` | `have`* · `total`* · `label` · `unit` |
| `QuestCard` | `title`* · `skill`* · `star`* · `hours`* · `lessons`* · `xp`* · `state`* · `matchGain` · `stageNumber` · `icon` (off the path) · `progress` (lessons ticked) · `lockedReason` · `note` · `credited` · `preparatory` · `ribbonLabel` · `action` (makes the card flat) · `stampPlay` · `testId` · Tile props (`render`, `className` …) |
| `QuestNumber` | `n`* · `state`* · `size` |
| `DestinationCard` | `title`* · `company`* · `city`* · `match`* · `skills`* · `experience` · `matchFrom` · `icon` (field emblem) · `target` · `applied` (`{ status, xp }`) · `applyReward` (`{ xp: 40, threshold: 60 }` default, `null` hides) · `featured` · `maxGems` (3) · `action` (makes the card flat) · `testId` · `matchTestId` · Tile props |
| `PlayerChip` | `name`* · `avatar`* · `level`* · `title`* · `total`* · `from`* · `to`* (null at 7) · `streak`* · `compact` · `testIds` (`{ chip, level, xp, streak }`) · Tile props (`render`, `onClick`) |
| `PlayerCard` | as PlayerChip (no `compact`, `testIds`) + `nextTitle` · `rank` · `badges` (`{ have, total }`) · `nextReward` · `interactive` (default false) |
| `XpTrack` | `total`* · `from`* · `to`* · `level` · `title` · `nextTitle` · `showRemaining` · `segments` (10) · `size` `sm`/`md` · `testId` |
| `LevelToken` | `level`* · `size` `sm`/`md`/`lg` · `testId` · `value` (data-value when the shown level lags) |
| `StreakCount` | `days`* · `size` · `label` · `testId` |
| `StatTile` | `icon`* · `label`* · `value`* · `tone` `ink`/`xp` · `count` · `testId` |
| `DailyTrack` | `days`* (`{ amount, label, state: claimed/today/ahead/missed }[]`; build it with `dailyDays(streak, claimedToday)`) · `testId` |
| `LootCard` | `name`* · `stars`* · `slots`* · `evidence` · `source` («من سيرتك:») · `icon` · `fresh` · `delay` · `testId` · `evidenceTestId` |
| `LootReveal` | `children`* · `play` (false on a returning visit) · `delay` (change its `key` to replay) |
| `AnswerTile` | `selected` · `icon` · `size` · Tile props (`onClick`, `data-testid` …) |
| `StepTrail` | `total`* · `current`* (1-based; `total + 1` = all done) · `label` · `testId` |
| `useShownLevel(value, level, segments)` | holds `{ level, title }` back on a level-up until the old XP sheet has filled (spec 2.7); PlayerChip and PlayerCard use it |

---

## 3. The state language (every game piece shares it)

| State | Meaning | Drawn as | Ribbon | Where it comes from |
|---|---|---|---|---|
| `locked` | not reachable yet | **sunk into the board**: a dashed `border-strong` well on `surface-2`, flat, the lock icon, text still `fg`/`fg-2` (never faded) | «مقفلة» dashed, with the lock | course `locked` (3.10), stage `locked` (3.4), a missing skill |
| `available` | you may start it | **raised**: white face, 2 px ink outline, 4 px ink plinth; sinks onto it when pressed | «متاحة» quiet | course `available`, stage `upcoming`, any job |
| `next` | the one thing to do now (2.8) | raised on the **accent key** (a coral-ink plinth, like the primary button's edge); its station token is coral | «التالية» on coral | the current stage, the started course of rule 2, the target job |
| `progress` | started, not finished | raised (ink plinth) with the lesson meter | «جارية · 2 من 5» ink | course `started` that is not the next step |
| `done` | finished or proven | **pressed home**: flat, sitting where a pressed face sits, `border-strong` outline, the check or the «تمّ» stamp, rewards shown earned | «مكتملة» with the check; «مثبتة» quiet for credited | course `completed` / `credited`, stage `done`, an application sent |

Rules that make it one language:
- **Depth means "there is something to do here".** Raised pieces can be pressed and lead somewhere; done pieces lie flat because
  nothing is left to do; locked pieces are wells because they cannot be reached yet. A list of mixed states keeps one height:
  flat pieces sit lower by exactly the plinth (they read as pushed into the board).
- **At most one `next` per screen.** It is the one accent piece. The target job on `/jobs` uses it because it is your destination.
- `selected` (a chosen answer, a set filter) is pressed home and filled with ink, with the waypoint dot at its start.
- Hover changes the face colour only (`bg-hover`) or the border of a flat piece; never a lift, never a shadow.
- Press: the face goes down onto its plinth at once and comes back in 200 ms. `pressed` shows the same frame when «دليل»
  presses a piece for the user.

## 4. The reward language

| Reward | Piece | Drawn | Real source (spec) |
|---|---|---|---|
| XP to earn | `RewardChip value={200}` | a brass chip with ink type and the XP glyph: «+200 XP» | course XP (8.2), apply +40 at ≥60% (8.1), daily reward (8.4), CV +100, onboarding +50, target +30 |
| XP earned | `status="earned"` | brass outline, a check, XP-coloured numerals | the same, once paid |
| XP not yet available | `status="locked"` | dashed, the lock, the condition («من 60% مطابقة») | apply under 60% pays 0 |
| The star | `kind="star"` | ink outline, a filled ink star, «النجمة 1 في Power BI»; earned = ink fill | the star a course grants (8.5) |
| The match gain | `kind="match"` | ink outline, the target glyph, «+20% مطابقة» | the star's share (7.3) |
| A badge | `kind="badge"` | a small brass disk and the badge name | the twelve badges (8.6) |
| The XP landing | `XpTrack` / `PlayerChip` | brass segments fill one after another (70 ms apart) while the number counts; on a level-up the old sheet fills to its end, then a fresh sheet starts (a cut, never an un-draw) and the level token's numeral rolls | every XP event |
| Level | `LevelToken` | an ink token with the numeral (levels are ink, never brass) + «المستوى 2 · مستكشف»; «بقي 170 XP للمستوى 3 «مجتهد»» | 8.3 |
| Streak | `StreakCount`, `DailyTrack` | the campfire and the number; the track of coins: claimed (struck brass with a check, solid line between), today (brass coin with an ink outline, label in `accent-fg`: your position), ahead (dashed with their amounts) | 8.4 |
| Completion | `QuestCard state="done" stampPlay` | the face presses home, the «تمّ» stamp lands, the reward chips turn earned | 3.11 |

Nothing in the layer pays XP. Pieces show rewards; the store pays them, exactly as spec 8.1 says. No new XP source, no coins
other than XP, no lives, no gems as a currency (a "gem" here is a skill, not money).

## 5. Screen by screen (before → after)

The before screenshots are `artifacts/gaming/before-*.png` (1440 × 900, `-full` for the whole page). The screen builders own
their files; this section says what to change.

### 5.1 Top-bar user chip (`src/features/shell/user-chip.tsx`)
**Before:** a white rounded box: avatar, name, «المستوى 2 · مستكشف», a thin scale bar «180 / 350 XP», the streak. Correct but
reads like an account menu.
**After:** `PlayerChip` (desktop) and `PlayerChip compact` (phone): a HUD plate on a 3 px plinth (it is pressable: it opens
`/profile`), the avatar with its ring, the name over the **level token** and title, a brass **XpTrack** (8 segments) with
«180 / 350 XP», the campfire count. Pass the spec's test ids through `testIds` (`shell-user-chip`, `shell-level`, `shell-xp`,
`shell-streak`); each carries `data-value`. When XP is earned, pass the new `total`: the segments fill in steps and the number
counts (spec `xp-chip-fill`); the FlyToken target stays the chip.

### 5.2 Home column on `/path` (`src/features/map/side-cards.tsx`; the map itself does not change)
**Before:** the stage next-step card, the target card with the ring, the leaderboard preview. The player is only in the chip.
**After**, top to bottom:
1. The next-step card stays as it is (the stage card is approved), but its rewards line becomes a `RewardRow`
   (`+200 XP` brass chip, `النجمة 1 في Power BI`, `+20% مطابقة`). Its button stays the one primary.
2. The target card becomes a `DestinationCard target` (its apply reward shows locked under 60% and open from 60%) — or keep
   the ring card and add an `UnlockMeter` under the ring. Either way the five segments explain the 70%.
3. Add `PlayerCard` (rank, badges «3 من 12», tomorrow's reward «+40 XP») and under it a `DailyTrack days={dailyDays(streak, claimedToday)}`.
   If the column gets too long at 900 px, drop the DailyTrack first (the PlayerCard already names tomorrow's reward).
4. The leaderboard preview keeps its rows; the user's row stays the ink row of DESIGN.md 4.8.

### 5.3 Jobs `/jobs` (`src/features/jobs/jobs-screen.tsx`, `job-row.tsx`) — the biggest change
**Before:** a plain table of rows: title, company, «ينقصك: …», a ring. A dashboard.
**After** (see the mock in `/dev/game` section 11): a **board of destinations**.
1. Under the header, one flat banner tile with the brass `XpCoin`: «قدّم حين تبلغ مطابقتك 60% أو أكثر، وتكسب +40 XP عن كل تقديم
   مدروس. مفتوحة لك الآن: وظيفتان.» (count = jobs with match ≥ 60 not yet applied to). Real rule, 8.1.
2. Filters stay (search, city, field, skill chip), the count line stays.
3. The target first as `DestinationCard target featured` (ring 88, the meter with the five skills written under it from
   640 px; on a phone it shows the missing gems instead, and the emblem token hides so the title stays whole). Pass the
   field icon as `icon` on every card (`IconFieldData`, `IconFieldBusiness`, …, 22 px): it is the destination's emblem.
4. Every other job as a `DestinationCard` in `md:grid-cols-2` (cards keep `jobs-card-{id}` on the tile via `data-testid`,
   `jobs-match-{id}` via `matchTestId`). Each shows the ring, the five-segment meter, up to three locked gems «ينقصك», the
   apply reward (open at ≥60%, locked under), the experience label. Applied jobs lie flat with «قدّمت». Wrap the list in
   `ReorderList` as now (`list-reorder`).
5. While no star is held (match 0% everywhere), keep the CV banner; the meters are all empty and every reward is locked —
   that is the honest picture and a good reason to upload the CV.
6. On the job detail page, put `UnlockMeter labels` under the ring, turn «ما لديك» / «ما ينقصك» into `SkillGem`s (met /
   partial / locked) and «كيف تسدّ الفجوة» into `QuestCard`s (state from the catalogue, `+XP`, `+% مطابقة`, «افتح الدورة»).
   The apply buttons stay; next to «أرسل الطلب» show `RewardChip value={40} label="عند التقديم"` (locked under 60%).

### 5.4 CV results (`src/features/cv/cv-results.tsx`, `match-rings.tsx`)
**Before:** a heading, a list of skills with stars and quotes, a side card with the ring and buttons, three job cards.
**After** (see the mock in `/dev/game` section 12): **the haul**.
1. Header: «في السيرة التجريبية 8 مهارات» + «سيرة تجريبية» + the engine label; under it a flat results tile (a
   `Tile interactive={false}`): «8 مهارات اكتشفتها» · «11 نجمة في رصيدك» · `XpCoin` + «+100 XP» in brass «كسبتها بتحليل
   سيرتك» (first analysis only; otherwise drop that cell), then `CollectionMeter have={8} total={38}`. All three numbers are real.
2. Skills grouped by field, each a `LootCard` (name, `SkillStars md`, «من سيرتك: «…»» with the evidence mark). Keep the test
   ids: `testId` → `cv-skill-{id}` (with `data-value` = stars), `evidenceTestId` → `cv-evidence-{id}`. Wrap each group in
   `LootReveal` when the show hands over (`results-rise`), `play={false}` on a returning visit.
3. Side column: «هدفك بعد التحليل» = `DestinationCard target` with `matchFrom={0}` (the ring counts 0 → 70%, `ring-count`), then
   the one primary «اذهب إلى مساري» and the line «التالي: دورة «أساسيات Power BI» ترفعك إلى 90%». Then «أفضل الوظائف
   لمهاراتك»: the next two as `DestinationCard`, each with its two buttons UNDER the card (a button never sits inside a
   pressable card): «دع دليل يقدّم عنك» (secondary sm) and «اجعلها هدفي» (ghost sm).

### 5.5 Courses `/learn` (`src/features/learn/learn-screen.tsx`, `course-card.tsx`, `state-tag.tsx`)
**Before:** two cards with a small state pill, title, hours, XP, match; a collapsed «أنجزتها (6)».
**After:** every course is a `QuestCard` (pass `render={<NavLink href=… />}`, `testId="learn-card-{id}"`, its `state`):
- «في مساري»: the current stage's course is `state="next"` with `stageNumber` (the accent key, the coral station token), the
  upcoming ones `available` with their numbers, locked ones `locked` with `lockedReason`. The six done stages in «أنجزتها (6)»
  are `done` cards (credited ones with `credited` and their source), pressed home with their checks.
- «وسّع آفاقك»: the same cards without stage numbers.
- The course states map: `available`→`available` · `started`→`next` with `progress` (rule 2) · `completed`→`done` ·
  `credited`→`done credited` · `locked`→`locked`. The card's face carries `data-state` = the game state unless you pass
  your own: pass `data-state={course.state}` so `learn-card-{id}` keeps the catalogue's words that QA reads (yours wins).

### 5.6 Course page `/learn/[id]` (`course-screen.tsx`, `action-area.tsx`, `lessons.tsx`)
**Before:** a header with lines of meta, a side card with ring and button, a list of lessons.
**After:** the header becomes the quest's briefing: `QuestNumber` (if on the path) + title + `RewardRow` («تكسب»: +200 XP,
النجمة 1 في Power BI, +20% مطابقة) instead of the plain meta lines. The side card keeps the ring and the one primary; add
`RewardChip value={200}` next to «ابدأ الدورة». Started: the `LessonMeter` (5 segments) above the lessons, and each ticked
lesson's number token turns to the ink check. Completed: «أكملتها اليوم» + earned chips + the stamp at rest. The celebration
overlay is unchanged.

### 5.7 Onboarding conversation `/welcome` (`conversation.tsx`, `profile-trail.tsx`)
**Before:** a chat with outline chips and a profile card with a vertical trail.
**After:** the step indicator «السؤال 3 من 6» becomes `StepTrail` (six stops: solid behind, the coral waypoint where you are,
dotted ahead; the current stop pops when it moves: `step-tick`). The quick replies become `AnswerTile`s (pressable pieces;
keep the ids `welcome-chip-{q}-{option}`); the tapped one shows `selected` for the moment before `chip-to-bubble` carries it
up. The «ملفك يتكوّن» card reads as a character sheet: each filled slot gets the ink check (it already does), and the card's
header shows the player (avatar + name) and «3 من 6». Interest options may carry their field icons.

### 5.8 Profile `/profile` (`identity.tsx`, `streak.tsx`, `badges.tsx`)
**Before:** a white hero with avatar and a scale bar, a stats strip, the badge grid, history, streak.
**After:** the hero is `PlayerCard` (or its parts: avatar 64, `LevelToken`, `XpTrack showRemaining`); the stats strip is five
`StatTile`s (XP in brass, النجوم, الدورات المكتملة, سلسلة الأيام, ترتيب الأسبوع, with their `profile-stat-*` ids on the value
via `testId`); the streak card adds the `DailyTrack`. The badge grid is already the game's best part: keep it.

### 5.9 Leaderboard (`src/features/leaderboard/*`)
Already the most game-like screen (podium, ink «أنت» row). Only: the «أسرع طريق للصعود» line carries a `RewardChip` of the
next step's XP («+240 XP»), and the user's row shows `LevelToken sm` instead of «المستوى 3» text. Optional.

### 5.10 Sign-in
Unchanged (approved showcase). Its showcase cards may later show `QuestCard`/`DestinationCard` instead of their current mini
cards, so the game is visible before signing in.

## 6. Rules (in addition to DESIGN.md 3 and 8)

1. **The accent still means only your position and your next action.** In the layer: the `next` piece's key and its
   «التالية» ribbon, its coral station token, «هدفك», today in the DailyTrack, the current stop of the StepTrail, the selected
   answer's waypoint, the one primary button. Count them per screen; each must be "you" or "your next action".
2. **Gold (brass) only for XP and rewards:** reward chips, the XP track, coins, the brass badge disk. Never for a level, a rank,
   a star or a heading.
3. **Tactile depth only on things you can press.** Read-only cards (loot, stats, banners) are flat `interactive={false}`. A
   button never sits inside a pressable card: give the card an `action` (it becomes flat) or put the buttons under it.
4. **Motion with a cause.** Press = you pressed. Segments fill = XP or a star arrived. A stamp lands = a course was completed in
   front of you. Loot pops = the analysis just ended. A label rolls = a state changed. Nothing loops at rest; no confetti
   here (the course celebration owns the one Burst).
5. **No shadows.** The plinth is a drawn layer under the face (flat colour, zero blur, straight down). The only shadow in the
   product stays `shadow-float`.
6. **Honest rewards (P2).** Show only XP the spec pays; show a locked reward with its real condition; never a fake currency,
   lives, chests or loot boxes. Sample data keeps its `SampleTag` (every destination card shows «جهة تجريبية»).
7. **Readable at a glance.** Titles ≥ 16 px, rewards and ribbons 14 px, captions 13 px at the least; locked text stays `fg-2`.
8. **One `next` piece per screen**; on `/jobs` it is the target.

## 7. Engineering notes

- `Tile`'s `className` lays out the outer box (grid placement, width); `faceClassName` pads the face. Render a link with
  `render={<NavLink href="/jobs/x" />}` (the route transition plays). `data-testid` and other props reach the face.
- A Tile always reserves its plinth height (3 / 4 / 6 px) below the face so mixed states align; `interactive={false}` reserves none.
- The face carries `data-state` = the game state (`next`, `done` …); a `data-state` you pass wins (keep the spec's values
  where QA reads them). QuestCard and DestinationCard pass your `testId` to the face.
- Meters and tracks animate only when their value changes after mount (`initial={false}`); `?still=1` and reduced motion jump
  to the end (`useInstant`).
- Arabic text lives in props (files), never in shell arguments. Latin names inside Arabic are isolated by the pieces.
- Phone (390 px): every piece wraps; DestinationCard and QuestCard fit 358 px; the PlayerChip has a `compact` form; the
  featured DestinationCard's labelled meter still fits five columns at 358 px (names truncate with an ellipsis).

## 8. What was checked

- `npm run typecheck -- src/components/game src/app/dev/game`: clean.
- `/dev/game` screenshotted in four rounds at 1440 px (full page) and at 390 px (section by section: a full-page capture at
  390 px wraps after 16384 device pixels): `artifacts/gaming/design/r1..r4-*.png`, `phone/r3-*`, `phone/r4-*`, and
  standalone shots `mock-jobs-desktop.png`, `mock-cv-desktop.png`, `pieces-*.png`. No horizontal scroll at 390 px
  (`scrollWidth = 390`), no console errors.
- Motion recorded in real time (`npm run clip`), read as cropped frame sheets: `clips/xp-landing.mp4` + `xp-frames.png`
  (old sheet fills, cut, new sheet; the level swaps after), `clips/quest-unlock.mp4` + `quest-frames.png`,
  `unlock-frames.png` (stamp, the meter segment fills, the ring counts 70 → 90 → 100, the lock rolls open, the ribbon
  rolls to «هدفك · جاهز للتقديم»), `clips/answer-loot.mp4` + `answer-frames.png`, `loot-frames.png`.

## 9. Files

- `src/components/game/` — `state.ts`, `tile.tsx`, `ribbon.tsx`, `reward.tsx`, `gem.tsx`, `meter.tsx`, `quest.tsx`,
  `destination.tsx`, `hud.tsx`, `daily.tsx`, `loot.tsx`, `answer.tsx`, `index.ts`
- `src/app/dev/game/page.tsx` — the gallery and the two mocks
- `artifacts/gaming/before-*.png` — the screens before; `artifacts/gaming/design/` — the gallery screenshots and clips
