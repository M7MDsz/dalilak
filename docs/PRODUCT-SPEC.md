# «دليلك» (Dalilak) product spec

Version 3 · 18 Nov 2026 · written by the product agent, revised against two critic reviews (coverage and reliability), then brought up to date with the owner's late choices (see "Changes on 18 Nov" below). Designers, builders and QA build from this file and test against it.
Read `BRIEF.md`, `HANDOFF-1-IDEA.md` and `docs/TEAM-BRIEF.md` first (older documents call the product «مساري» / Masari: TEAM-BRIEF section 0). Where this file and Mohammed's words disagree, his words win.

## Changes on 18 Nov (version 3)

If you read version 2, these are the only changes. Every number, the data of section 9, the arithmetic tables 8.8 and 10.4, and every test id not named below are unchanged.

1. **Name.** The product is «دليلك» (Latin: Dalilak). The advisor keeps his name «دليل» and introduces himself as «أنا دليل، دليلك إلى وظيفتك.» «مساري» survives only as the name of the roadmap page (the navigation label, «افتح مساري», «رجوع لمساري», «اذهب إلى مساري», «في مساري», «دورات مساري»: all kept). Where «دليلك» alone could be read as the ordinary words "your guide", the copy says «منصة دليلك». Strings rewritten:

   | Where | Was | Now |
   |---|---|---|
   | Browser tab (2.2) | «مساري · {page heading}», «مساري» | «دليلك · {page heading}», «دليلك» |
   | Wordmark: sign-in (3.1), side navigation (2.3), logo (9.9) | «مساري» | «دليلك» |
   | Advisor panel header line (3.14) | «مستشارك في مساري» | «دليلك إلى وظيفتك» |
   | Onboarding greeting (4.1, 10.2 step 1) | «أهلاً {name}، أنا دليل. سأكون معك من أول خطوة إلى الوظيفة.» | «أهلاً {name}، أنا دليل، دليلك إلى وظيفتك. سأكون معك من أول خطوة إلى آخرها.» |
   | «من أنت؟» during onboarding (4.5) | «أنا دليل، مستشارك في مساري. أسألك الآن…» | «أنا دليل، دليلك إلى وظيفتك. أسألك الآن…» |
   | «من أنت؟» after onboarding (5.6 example 19, 5.9) | «أنا دليل، مستشارك في مساري. أشرح لك…» | «أنا دليل، دليلك إلى وظيفتك. أشرح لك…» |
   | The fallback (5.6 example 10, 5.9) | «…أنا مستشارك في مساري: أدلّك على…» | «…أنا دليلك إلى وظيفتك: أدلّك على…» |
   | Honesty sentence after applying (5.6 example 4, 5.9, 5.5 rule 16, 7.4) | «…هذا تقديم تجريبي داخل مساري ولم يصل…» | «…هذا تقديم تجريبي داخل منصة دليلك ولم يصل…» |
   | Profile, «عن هذا العرض» (3.13) | «مساري عرض تجريبي. …» | «منصة دليلك عرض تجريبي. …» |

2. **Application numbers** use the prefix DL: `DL-{year}-{sequence}`, in the demo «DL-2026-0001» (was MS-2026-0001) in 3.8, 3.9, 5.6, 7.4, 10.2 and 10.3.
3. **Look.** Darb, IBM Plex Sans Arabic and the navy palette, as decided in `docs/DESIGN-BRIEF.md`. Skill levels stay stars («نجمة»), 1 to 3 slots per skill; avatars stay twelve, `av-01` to `av-12`. New bullet "Look" in "How to read".
4. **The map is the centrepiece (3.4).** New tier-1 motion moment `map-open`, which replaces `path-draw-in`: in full the first time the map appears after the path reveal (the reveal hands over to it without a cut, 3.3 and 3.4), short (1.2 s or less) on every later visit to `/path` and when «دليل» opens the map, never blocking, reduced motion honoured. New "reading rules" that hold for any layout; the roadmap section now describes the path as data and behaviour only (the phone paragraph no longer fixes a top-to-bottom column), and states that a path holds up to 11 stages (9.3). The full form holds toasts and the nudge until it ends (3.15). New test id `path-map` (`data-open`). Seeds mark the full form as played (10.3).
5. **Home leaderboard preview (3.4).** `/path` shows the top three of the week and the user's own row, with the link «عرض الترتيب». It is not a visit to the leaderboard, so the `row-climb` baseline of 8.7 is unchanged and the demo's climb from 18 to 10 still plays on `/leaderboard`. New test ids `path-leaderboard`, `path-leaderboard-row-{userId}`, `path-leaderboard-me`, `path-leaderboard-open`; new sample-data label in 7.6.
6. **No API key on this laptop yet.** Everything runs on the local brain. The Gemini and Anthropic paths are built behind the provider switch and cannot be tested until a key is pasted into `.env.local`; no AI client is ever constructed without an explicit non-empty key (5.5 rule 18). The keyed QA runs are owed, not passed (5.7, 10.1).
7. The demo script (10.2) is updated for items 1, 2, 4 and 5 only; its clock and its numbers are unchanged.

## How to read this document

- **Order.** Sections 1-2 frame the product. Section 3 specifies every screen. Sections 4-8 hold the rules the screens refer to (onboarding, advisor, CV, jobs, game). Section 9 is the data and the artwork inventory. Section 10 is the demo script, the saved states and the arithmetic check. Section 11 is the honest list. Section 12 records how ambiguous requests were read.
- **Copy.** Every Arabic string in «…» or in a table is final copy and appears exactly as written. `{name}`, `{match}` and similar are placeholders filled at run time. Digits are Latin (0-9). «XP» stays in Latin letters, after the number: «420 XP». Percentages are written «70%».
- **Counted nouns.** Arabic changes the noun with the number: 1 → singular (مهارة واحدة), 2 → dual (مهارتان), 3-10 → plural (8 مهارات), 11 and above → singular (11 مهارة). Strings with counts are written here for the demo number; one shared helper applies the rule. The helper takes a **case**, because the dual changes with it: as a subject «بقيت لك مرحلتان»; as an object or after a preposition «صعدت مركزين», «وجدت وظيفتين», «عدت يومين»; one as an object is «مركزاً واحداً». Forms (singular / dual as subject / dual as object / plural): مهارة/مهارتان/مهارتين/مهارات · مرحلة/مرحلتان/مرحلتين/مراحل · دورة/دورتان/دورتين/دورات · ساعة/ساعتان/ساعتين/ساعات · درس/درسان/درسين/دروس · وظيفة/وظيفتان/وظيفتين/وظائف · نجمة/نجمتان/نجمتين/نجوم · مركز/مركزان/مركزين/مراكز · يوم/يومان/يومين/أيام · طلب/طلبان/طلبين/طلبات · شارة/شارتان/شارتين/شارات.
- **Form of address.** The interface speaks in the masculine generic form, as Arabic interfaces do: buttons, labels, level titles, and «دليل»'s imperatives («اسألني»). One place is different: in onboarding the person has just given their name and is asked about themselves, so the questions (4.2) and their acknowledgements (4.4) are worded to carry no gender. Lines the user "says" (chips, the sample CV) are in first person, which is not gendered. Other people (the leaderboard) show a level number without a title, so nobody is given a title in the wrong gender.
- **Voice.** Lines spoken by «دليل» (chat, status lines, the CV empty state) are first person singular («وجدت», «أقرأ»). Page text is impersonal («في سيرتك 8 مهارات», «المقبول: PDF و Word»). The product never speaks as a company "we" («وجدنا», «نقبل», «بياناتنا»); «دليل» says "we" only for something it does together with the user («نبدأ», «نكمل»).
- **Three words with one meaning each.** «الهدف» and «هدفك» mean the target job only; the sixth onboarding answer is «الأولوية». The evidence for a skill is never called «الدليل» (that word is the advisor's name, and «دليلك» is the product's): it is «من سيرتك» or «مصدر النجوم». «نقاط» means XP only; a change in the match is written with its two percentages («من 70% إلى 90%»), never as "points".
- **"From X to Y".** Sentences use words: «من 70% إلى 90%». Compact displays show the old value first in reading order (on the right), an arrow pointing left, then the new value.
- **Time.** Relative: «الآن» (under a minute) · «قبل 5 دقائق» · «قبل ساعتين» · «أمس»; older than that, the date as «18 نوفمبر». Clock times as «21:14». A time today reads «اليوم 21:14».
- **Course titles.** A course has a full title («أساسيات Power BI: من البيانات إلى لوحة المعلومات») and a short title, which is the part before the colon («أساسيات Power BI»; the whole title when there is no colon). Headings use the full title (course page, catalogue card, celebration, gap rows). Sentences, pills, the roadmap card and «دليل» use the short title.
- **Test ids.** Every element a QA script must click or read has `data-testid="area-thing"`. List items add the id: `jobs-card-data-analyst-riyadh`. Elements whose number animates carry the final value in `data-value` (so a script can assert during a count-up). Elements with states carry `data-state`. Job, course, skill, badge and sample-user ids are listed in section 9.
- **Motion moments** are named in `code style`. Each names what moves and why; the design team decides how it looks. **None blocks input.** `data-state` and `data-value` hold the final state from the first frame, and a click during a moment acts on that final state. Lengths, where a moment is not part of a timed show: `map-open` 2.6 to 3.8 s in full and 1.2 s or less in its short form (3.4) · `catch-up` 2.4 s · `tree-grow` 1.0 s · `podium-rise` 0.8 s · `row-climb` 1.2 s. The three timed shows (the path reveal 7.8 s, the CV analysis 7.0 s, the celebration 5.0 s) have no skip button, but Space jumps each to its end state, for a presenter who needs the second.
- **Motion tiers.** He asked for rich motion in four places: the sign-in showcase, the path reveal, the CV analysis and the chat. Those, the map's opening (he asked for the map to impress, 3.4), and the three moments that carry the demo's story (the roadmap catching up, the course celebration, the leaderboard climb), are **tier 1**: crafted one by one and reviewed frame by frame. Tier 1: `showcase-loop` · `answers-gather`, `jobs-sweep`, `skills-map`, `narrow-to-three`, `path-draw`, `reveal-landing`, `status-roll` · `scan-line`, `phrase-highlight`, `tag-pop`, `star-fill`, `results-rise` · `panel-open`, `composer-expand`, `bubble-pop`, `thinking-glyph`, `answer-focus`, `send-stop-morph`, `page-handoff`, `self-typing` · `map-open`, `catch-up`, `current-pulse` · `celebration-open`, `xp-count-up`, `star-award`, `match-rise` · `row-climb`. Every other named moment is **tier 2**: one shared enter (fade and an 8 px rise, 260 ms) or a plain state change, and it is upgraded only after tier 1 is signed off.
- **Look.** How everything looks is decided in `docs/DESIGN-BRIEF.md`: the Darb direction, the font IBM Plex Sans Arabic, the navy palette, every colour from a token. Skill levels are drawn as stars («نجمة»), 1 to 3 slots per skill (9.2); the avatars are the twelve of 9.6. Where this file says "the design team decides", that brief and the design team decide.
- **Reduced motion.** One global rule: with the reduced-motion setting on, every duration is 0 and every moment shows its end state; loops stand still. The path reveal and the CV analysis then open directly on their results. No moment has a special reduced-motion sequence.
- **Demo numbers.** Examples use the demo persona «خالد» and the numbers of section 10. Those numbers are forced by the data in section 9 and the rules in section 8; if a builder sees a different number on screen, the data or a rule is wrong.

---

## 1. Product in five lines, and the principles

1. «دليلك» tells a job seeker three things: where they stand, where they are going, and the next step.
2. A short conversation with the advisor «دليل» picks a target job; a CV analysis finds the skills the user really has, each with the CV sentence that proves it.
3. The gap between those skills and the target job becomes a roadmap: one stage per missing star, one course per stage.
4. Completing a course adds a star to a skill and visibly raises the match with the job; XP, levels, a daily streak, badges, a skill tree and a leaderboard make that progress feel like a game.
5. «دليل» stays as an advisor who answers at once, opens any page on request, and applies to a job when asked.

**Principles that settle arguments.** These decide what the product *does*. They do not rank against the team brief's first priority, look and feel, which decides how it is drawn. When two product ideas conflict, the lower number wins.

| # | Principle | What it rules out |
|---|---|---|
| P1 | **The flow works every time.** The whole demo runs with no key and no internet, and gives the same numbers on every run. AI improves answers; nothing depends on it. | Any step whose result depends on a model's mood or on Wi-Fi. |
| P2 | **The game reflects real progress.** XP is paid only for actions that move the user toward a job. Stars change the match percentage with the job's requirement list. | XP for clicks, page visits or chat messages; rewards with no cause. |
| P3 | **Every screen answers "what do I do next".** One rule (section 2.8) computes one next step, and every screen shows that same step (on phones the top bar has no room for it: it is the card at the top of `/path`, one tap away on the «مساري» tab). | Dead ends; screens that only display. |
| P4 | **Evidence over assertion.** A skill always shows where it came from (the CV sentence or the course). A match percentage can always be explained to the last point. | Unexplained scores; "AI says so". |
| P5 | **One number tells the story: the match percentage.** It is the same number on the roadmap, the job page, the advisor's answers and the celebration. | A second competing score (the onboarding fit score is never shown as a number). |
| P6 | **Honest sample data.** Jobs, companies, courses and other leaderboard users are labelled «بيانات تجريبية»; applying is labelled a simulation; «دليل» says so when it matters. | Real employer or provider names; real-world statistics; salaries. |
| P7 | **«دليل» acts only when asked.** It suggests freely, but it changes the user's state (apply, start a course, change the target) only on the user's request, and it cannot do the learning for them. | An advisor that applies, enrols or "completes" on its own initiative. |
| P8 | **Motion shows cause and effect.** A course completes, so a star lands, so the ring rises. Motion without a cause is cut. | Decoration that moves for its own sake. |
| P9 | **Arabic first, right to left, and whole at 390 px.** | Features that exist only on desktop. |

**What P1 means in the build.**
- At run time no request leaves this laptop except the call to the AI provider, and that call exists only when a key is configured. Fonts are files bundled at build time (no font CDN). The PDF and Word readers run inside the app's own server process: no worker, script, style or image is fetched from the network. Icons, avatars and the logo are local files.
- Everything the demo script asks for is decided in code, never by a model: onboarding chips, the sample CV, and the one request to «دليل» (5.5 rule 1).
- The stage run uses a production build with every route opened once (10.1), so the promise "no loading state" in section 3 holds.

---

## 2. Information architecture

### 2.1 Routes

| Route | Screen | Shell | Section |
|---|---|---|---|
| `/` | Sign-in | none | 3.1 |
| `/welcome` | Onboarding conversation, then path-reveal sequence, then reveal result | none | 3.2, 3.3, 4 |
| `/path` | Roadmap (home of the app) | app shell | 3.4 |
| `/skills` | Skill tree | app shell | 3.5 |
| `/cv` | CV upload, analysis show, results | app shell | 3.6, 6 |
| `/jobs` | Jobs search and list | app shell | 3.7, 7 |
| `/jobs/[id]` | Job detail with the gap; the apply sheet opens over it | app shell | 3.8, 7 |
| `/applications` | Applications tracker | app shell | 3.9, 7 |
| `/learn` | Courses catalogue | app shell | 3.10 |
| `/learn/[id]` | Course detail and the completion celebration | app shell | 3.11 |
| `/leaderboard` | Leaderboard | app shell | 3.12 |
| `/profile` | Profile | app shell | 3.13 |

The advisor «دليل» is not a route. It is a panel that opens beside any app-shell page on a wide desktop, and over it on smaller screens (section 3.14).

### 2.2 Guards and URL state

- **Guards wait for the saved state.** User state lives in the browser, so the first render knows nothing about the user. Guards run only after the saved state has loaded; until then only the logo is drawn. A reload of any URL re-renders that URL with its query: it never bounces through `/`.
- Not signed in → any route redirects to `/`.
- Signed in, onboarding not finished (no target job chosen yet) → any route redirects to `/welcome`.
- Onboarded → `/` and `/welcome` redirect to `/path`.
- Unknown `[id]` → a not-found block inside the shell: «هذه الصفحة غير موجودة.» with the button «رجوع لمساري» (`shell-notfound-home`).
- Filters and tabs live in the URL so that the advisor and QA can open an exact view: `/jobs?q=&city=&field=&skill=`, `/learn?tab=path|explore|done&field=`, `/skills?skill={skillId}` (opens that skill's panel), `/jobs/[id]?apply=1` (opens the apply sheet).
- `?seed={name}` on any URL loads a named saved state (section 10.3). It is applied before any guard or redirect, and is then removed from the URL.
- Browser tab title: «دليلك · {page heading}» (for `/path`: «دليلك · مسارك»). Exceptions: `/` and `/welcome` are «دليلك» alone; `/jobs/[id]` is «دليلك · {job title}»; `/learn/[id]` is «دليلك · {short course title}».

### 2.3 App shell on desktop (1024 px and wider)

- **Side navigation** on the inline-start side (the right side in RTL): the logo and wordmark «دليلك» at the top (links to `/path`), then eight navigation items in three groups (2.5), then at the bottom one quiet line: «عرض تجريبي · بيانات تجريبية».
- **Top bar** across the content area: the page heading at the inline-start; the **next-step pill** (2.8) in the middle; the **user chip** (2.7) at the inline-end.
- **Content area**: the page. Page changes use one short transition, old page out first, never two pages visible at once. The one exception is the reveal handing over to the map (3.4), and even there no two pages are half-visible.
- **Advisor launcher** (2.6) floats at the bottom inline-end corner (bottom left in RTL), above the content.
- **When the advisor panel is open** the content area gives it room (3.14). Pages lay out by the width of the content area, not of the window: under 900 px of content width a page uses its one-column order, which is the phone order given in its section.
- **Overlay layer** above everything: toasts, level-up, badge unlock, daily reward, celebration (3.15). Toasts sit inside the content area and are never covered by the advisor panel.

### 2.4 App shell on a 390 px phone (anything narrower than 1024 px)

- **Top bar**: the logo mark at the inline-start; the compact user chip at the inline-end. No page heading in the bar (the heading is the first line of the page). No next-step pill in the bar (the next step is the card at the top of `/path`).
- **Bottom tab bar** with five slots: «مساري» · «الدورات» · «دليل» (centre, larger, opens the advisor) · «الوظائف» · «المزيد».
- «المزيد» opens a bottom sheet listing: «المهارات» · «سيرتي» · «طلباتي» · «المتصدرون» · «ملفي».
- The advisor opens as a full-screen sheet, and so does the apply sheet. The other dialogs (skill panel, stage sheet, avatar picker) are full-width bottom sheets.
- The page never scrolls sideways. The only things that do are rows of field chips (skill tree, courses), which say so in their sections; the roadmap never does.
- Anything "pinned to the bottom" on a phone sits directly above the tab bar.

### 2.5 Navigation labels

| Group | Label | Route | Test id (same id on desktop nav, phone tab bar and the «المزيد» sheet; only one is rendered) |
|---|---|---|---|
| Learning | «مساري» | `/path` | `shell-nav-path` |
| Learning | «المهارات» | `/skills` | `shell-nav-skills` |
| Learning | «الدورات» | `/learn` | `shell-nav-learn` |
| Work | «سيرتي» | `/cv` | `shell-nav-cv` |
| Work | «الوظائف» | `/jobs` | `shell-nav-jobs` |
| Work | «طلباتي» | `/applications` | `shell-nav-applications` |
| Me | «المتصدرون» | `/leaderboard` | `shell-nav-leaderboard` |
| Me | «ملفي» | `/profile` | `shell-nav-profile` |

Group headings are not shown as text; the groups are separated by space. The active item is marked. No item carries a dot or a counter: news reaches the user through toasts (3.15) and on the pages themselves. Phone only: `shell-more` opens the «المزيد» sheet.

### 2.6 Where the advisor launcher lives

- Desktop: a floating button at the bottom inline-end corner of every app-shell page, with the «دليل» glyph and the label «اسأل دليل» (`shell-advisor-launcher`). Keyboard: `Ctrl+K` opens and closes the panel; `Esc` closes it.
- Phone: the centre tab «دليل» (`shell-advisor-launcher`, same id).
- It is absent on `/` and `/welcome` (there «دليل» is the page itself).
- **Nudge**: one line in a bubble beside the launcher, shown once per account, on the first arrival at `/path`: «مسارك جاهز. اسألني: ماذا أفعل الآن؟» (`shell-advisor-nudge`). It hides after 8 s or on any click; clicking it opens the panel. Toasts do not hold it back; the level-up, the daily reward, a running show (the list in 3.15, which includes the full `map-open`) or the open panel do. If `/path` is left before it could show, it shows on the next visit to `/path`. There is no other nudge.

### 2.7 The user chip

Shows, in this order: the avatar · the first name · the level as «المستوى 3 · مجتهد» · a thin bar of progress toward the next level with «420 / 600 XP» · the streak as the streak icon and the number of days. Clicking it opens `/profile`.
Compact form on phones: avatar · level number · XP total · streak number.
Test ids: `shell-user-chip`, `shell-level` (`data-value` = level number), `shell-xp` (`data-value` = total XP), `shell-streak` (`data-value` = days).
When XP is earned, the number counts up and the bar fills (`xp-chip-fill`); on a level change the title swaps after the bar reaches the end.

### 2.8 The next-step rule (used by the roadmap card, the top-bar pill, the advisor, the celebration and the leaderboard)

Evaluated top to bottom; the first rule that matches is the user's one next step.

| # | Condition | Label (pill and card button) | Opens |
|---|---|---|---|
| 1 | No CV analysed and the user has not pressed «ابدأ بدون سيرة» | «ارفع سيرتك الذاتية» | `/cv` |
| 2 | A course is started and not completed (the most recently started one) | «أكمل دورة «{course}»» | `/learn/{id}` |
| 3 | The roadmap has a current stage (match below 100%) | «ابدأ دورة «{course}»» | starts the course and opens `/learn/{id}` |
| 4 | Match with the target is 100% and the user has not applied to it | «قدّم على «{target}»» | `/jobs/{id}`, where both ways to apply are offered (3.8) |
| 5 | Otherwise | «اختر هدفك التالي» | `/jobs` |

The pill reads «الخطوة التالية: {label}» (`shell-next-step`) and is hidden on the page it would open. `{course}` is the course's short title. One rule for the whole product: a button that says «ابدأ الدورة» (roadmap card, stage sheet, skill panel, the pill) starts the course and opens it already started; a button that says «افتح الدورة» only opens it.

### 2.9 Keyboard and access basics

`Tab` reaches every control in reading order. Dialogs and the phone advisor sheet trap focus and return it on close; the desktop advisor panel does not trap focus, because the page beside it stays usable. Toasts are announced politely (`aria-live`). Every icon-only button has an Arabic label: every close control is «إغلاق», send buttons are «إرسال», the stop button is «إيقاف». All motion honours the reduced-motion setting by the one rule in "How to read".

---

## 3. Screen-by-screen spec

Screens whose data is local (everything except the CV analysis and the advisor's replies) render at once: they have **no loading state**, and the page transition is the only wait (true on the production build of 10.1, not on a dev server compiling a route for the first time). Where a state is not listed for a screen, it cannot occur there.

### 3.1 Sign-in `/`

**Purpose.** Enter with a name in one step, and see in ten seconds what the product is.

**Layout.** Two halves on physical sides (this page ignores the RTL mirror for the split): the **sign-in column on the LEFT**, the **moving showcase on the RIGHT**. Text inside both halves is RTL as everywhere.

**Sign-in column (left), top to bottom.**

| Element | Copy |
|---|---|
| Logo and wordmark | «دليلك» |
| Headline | «مسارك المهني يبدأ بخطوة.» |
| Supporting line | «اكتب اسمك وابدأ. دليل يتعرّف عليك، يقرأ سيرتك، ويرسم لك الطريق إلى وظيفتك.» |
| Saved accounts (only if this browser has any; under the supporting line, above the field label) | Heading «أكمل بحساب محفوظ», then one chip per saved account: avatar, name, «المستوى {n}» |
| Field label | «اسمك» |
| Field placeholder | «مثال: خالد» |
| Button | «ابدأ رحلتك» |
| Helper under the button | «بدون بريد ولا كلمة مرور. تقدّمك يُحفظ في هذا المتصفح.» |
| Footer line | «عرض تجريبي: الوظائف والدورات والمتسابقون بيانات تجريبية.» |

**Showcase (right).** A stage of six **real product components** fed with the fixed demo numbers, so the showcase cannot promise what the product does not do. The six are **kit primitives, delivered with the design system before any screen is built**: the match ring, the stage node with its «أنت هنا» marker, the skill card with stars, the chat bubble pair, the XP bar with its level title, the leaderboard row. The screens and the showcase both import them, so the sign-in builder does not wait for six other builders. The pieces take turns in a loop of about 20 s; each has one moment:

| # | Piece | Its moment | Caption shown with it |
|---|---|---|---|
| 1 | Roadmap strip: stages 6, 7, 8 of the «محلل بيانات» path and the trophy | the «أنت هنا» marker travels from stage 6 to stage 7, which lights up | «مسار واضح: الخطوة التالية أمامك» |
| 2 | Match ring for «محلل بيانات» | rises from 70% to 90% | «مطابقتك ترتفع مع كل دورة» |
| 3 | Two skill cards: Excel with its evidence line «تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel…», and Power BI | Power BI receives its first star | «كل مهارة ومعها الجملة التي تثبتها» |
| 4 | Advisor exchange | the user bubble «ماذا أفعل الآن؟» pops, «دليل» answers «خطوتك التالية: دورة أساسيات Power BI» | «دليل يجيبك ويفتح لك الصفحات» |
| 5 | XP and level | «+200 XP» lands, the level bar fills, the title becomes «المستوى 3 · مجتهد» | «نقاط ومستويات وسلسلة أيام» |
| 6 | Leaderboard mini with three rows, one of them «أنت» | the «أنت» row climbs one place | «ترتيبك بين المتسابقين» |

**States.**
- First visit: empty field, focus in the field, button disabled until 2 characters.
- Returning: the saved-account chips show; clicking one signs in as that account.
- The typed name matches a saved account. Names are compared after the normalisation of 4.3, so «سارة» and «ساره», «أحمد» and «احمد», "Sara" and "sara" are the same name. The form does **not** sign in. Under the field: «يوجد تقدّم محفوظ بهذا الاسم في هذا المتصفح.» with two buttons: «أكمل من حيث توقفت» (signs in as that account) and «ابدأ من جديد» (deletes that account, creates a new one with the typed name, and goes to `/welcome`). This is what stops a presenter who forgot `?seed=fresh`, or a judge who types a name already used on this laptop, from landing in someone else's progress.
- Error (shown under the field on submit): fewer than 2 letters → «اكتب اسمك (حرفان على الأقل).»; more than 20 → «الاسم طويل. اختصره إلى 20 حرفاً.»; characters other than Arabic or Latin letters and spaces → «استخدم الحروف فقط.»
- No loading and no empty state.

**Interactions.** `Enter` submits. The name is trimmed and inner spaces collapsed. A new name creates an account (a neutral default avatar by the rule in 9.6, level 1, 0 XP, streak 1) and goes to `/welcome`. Signing in to a saved account goes to `/path`, or to `/welcome` if its onboarding is unfinished.

**XP events.** None.

**Motion moments.** `showcase-loop` (tier 1: the six pieces take their turns; it pauses when the tab is hidden). The move to `/welcome` is the ordinary page transition.

**Phone.** The showcase becomes a band about 240 px high at the top, showing one piece at a time with its caption; the sign-in column sits below it and the name field is visible without scrolling.

**Test ids.** `signin-form` · `signin-name` · `signin-submit` · `signin-error` · `signin-account-{index}` (0-based) · `signin-resume` · `signin-restart` · `signin-showcase` · `signin-showcase-piece` (`data-value` = 1-6, the piece on stage).

### 3.2 Onboarding conversation `/welcome` (phase 1)

**Purpose.** «دليل» learns six things in six turns and makes the user feel heard. Full conversation design: section 4.

**Layout.**
- Top: logo; a step indicator «السؤال 2 من 6».
- Centre: the conversation thread («دليل»'s messages with its glyph, the user's answers as bubbles).
- Beside the thread on desktop: the card «ملفك يتكوّن» with six slots that fill as answers arrive: «المدينة» · «المؤهل» · «التخصص» · «الخبرة» · «الاهتمام» · «الأولوية».
- Bottom: quick-reply chips for the pending question, and under them the composer with the placeholder «اكتب إجابتك أو اختر من الخيارات…».

**States.**
- First visit: «دليل»'s greeting, then question 1 with its chips.
- Waiting for «دليل»: its glyph is "thinking" for 350-600 ms before each reply (never longer than 3 s; section 4.5).
- Resumed (the page was left midway, or reloaded): the thread is restored and the pending question is asked again.
- Done: after the sixth answer «دليل» says its closing line and the page moves to phase 2 by itself after 1.2 s.
- Error: none is shown. The conversation is a local script; the one optional model call falls back to the local rule silently (section 4.5).

**Interactions.** Tap a chip or type and send (`Enter`). Sending an empty or whitespace-only message is impossible (the send button, labelled «إرسال», is disabled). Answers are not edited in place: the reveal offers three jobs and the target can be changed at any time, so a wrong answer costs nothing.

**XP events.** `onboarding_completed` +50 when the sixth answer is accepted. The toast is held until the user reaches `/path` (3.15).

**Motion moments.** `greeting-arrival` («دليل» appears and its first lines come into focus) · `chip-to-bubble` (the tapped chip travels up and becomes the user's bubble; the other chips leave) · `bubble-pop` (a typed answer pops from the composer) · `answer-focus` («دليل»'s reply comes into focus) · `slot-fill` (the matching slot of «ملفك يتكوّن» fills when an answer is accepted) · `step-tick` (the step indicator advances).

**Phone.** The card «ملفك يتكوّن» becomes a row of six small slots under the step indicator. Chips wrap onto at most three lines; the composer stays above the keyboard.

**Test ids.** `welcome-thread` · `welcome-step` (`data-value` = 1-6) · `welcome-chip-{question}-{option}` (ids in section 4.2, for example `welcome-chip-city-riyadh`) · `welcome-input` · `welcome-send` · `welcome-slot-{question}` · `welcome-message-last` (the newest «دليل» message).

### 3.3 Path-reveal sequence and reveal result `/welcome` (phases 2 and 3)

**Purpose.** Turn the wait into the product's first show, then present the recommended target job and two alternatives. Steps, lines and timing: section 4.7. Scoring: section 4.6.

**Layout of the sequence (phase 2).** Full screen, no navigation. One stage in the centre where the pieces of the story move; one status line under it showing the current step's Arabic line; no progress bar and no skip button (Space or `Esc` jumps to the result; it is for the presenter and is not advertised).

**Layout of the result (phase 3).**

| Region | Content |
|---|---|
| Heading | «مسارك يا {name}» |
| Recommended job card | label «الأنسب لك» · the job title · «{company} · {city}» with the tag «جهة تجريبية» · the field |
| Why this path | heading «لماذا هذا المسار؟» and up to three reason chips (section 4.6) |
| Path strip | The show ends on a path, as he asked. The line drawn in step 5 of the sequence stays on screen: it runs from «البداية» through the target's stages as named nodes in canonical order (for «محلل بيانات»: Excel ★ · SQL ★ · Power BI ★ · الإحصاء ★ · التواصل الفعّال ★ · Excel ★★ · SQL ★★ · الإحصاء ★★) to a trophy carrying the job title. Under it: «8 مراحل · 74 ساعة تعلّم» and the line «بعد قراءة سيرتك قد تجد أنك قطعت جزءاً منها.» It is drawn in the map's own visual language, because it becomes the map when the recommended job is chosen (3.4) |
| Primary button | «ابدأ هذا المسار» |
| Alternatives | heading «أو اختر اتجاهاً آخر», two smaller cards (title, company with «جهة تجريبية», city, field, and the card's own count: for «أخصائي تقارير وبيانات» «7 مراحل · 60 ساعة تعلّم»; for «محلل أعمال» «7 مراحل · 64 ساعة تعلّم»), each with the button «اختر هذا المسار» |
| Footer line | «تستطيع تغيير هدفك في أي وقت من صفحة الوظائف.» |

**States.** Sequence playing → result. `revealPlayed` is saved when step 6 starts: a reload before that replays the sequence from step 1; a reload after it shows the result directly. There is no error state: the scoring is local.

**Interactions.** Choosing any of the three jobs sets it as the target and goes to `/path`, where the map opens with the full `map-open` (3.4). This move is not the ordinary page transition: the rest of the result leaves first and, when the recommended job was chosen, the path strip stays and hands over to the map without a cut (for an alternative the strip leaves too: 3.4).

**XP events.** `target_set` +30 on the choice. On arrival at `/path` one merged toast shows «+80 XP» with the reason «التعارف واختيار الهدف», and the badge toasts «الخطوة الأولى» and «صاحب هدف» stack with it (3.15).

**Motion moments.** `answers-gather` · `jobs-sweep` · `skills-map` · `narrow-to-three` · `path-draw` · `reveal-landing` (each described in 4.7) · `status-roll` (the status line changes by rolling: the new line arrives as the old one leaves). On a choice, the hand-over to `map-open` (3.4).

**Phone.** Same sequence, composed for a tall screen. In the result, the recommended card comes first, the nodes of the path strip wrap onto two rows, the primary button stays visible without scrolling, and the alternatives follow below.

**Test ids.** `reveal-sequence` · `reveal-step` (`data-value` = 1-6) · `reveal-result` · `reveal-recommended` (`data-value` = job id) · `reveal-reason-{index}` · `reveal-path` (`data-value` = stage count) · `reveal-path-node-{n}` (1-based) · `reveal-accept` · `reveal-alt-{index}` (0 or 1, `data-value` = job id) · `reveal-alt-choose-{index}`.

### 3.4 Roadmap `/path` (home)

**Purpose.** Show the personal path from where the user stands to the target job, with exactly one step lit. The map is the product's centrepiece: Mohammed asked for it to be "impressive and easy to trace" and to have "a good looking transition when you open it".

**Which drawing.** He is choosing the map's visual treatment from three drawn options (`design/explore/darb/map/`); until he picks, the lead is finishing option 2, the rising match line. So this section fixes no layout. To the map, the path is data: an ordered list of stages, the start gate before a CV, the goal, and two branch jobs. What each holds and how it behaves is specified below; where and how it is drawn is the chosen design's.

**How the path is built** (rules; the drawing is the design team's).
- A **stage** is one star of one skill that the target job needs: a job that needs Excel at 2 stars has the stages «Excel ★» and «Excel ★★». If a needed skill has a prerequisite skill that the job does not list, that prerequisite's first star is added as a stage tagged «تمهيدية», placed right before the skill it prepares. The set of stages is fixed per job (the count is in 9.3). A preparatory stage counts as done when the user holds that star, or already holds a star in the skill it prepares.
- **Canonical order**: skills in the order of the job's requirement list, each prerequisite placed before the skill that needs it; first every skill's ★ stage in that order, then the ★★ stages, then the ★★★ stages.
- **Displayed order**: the stages the CV proves (in canonical order), then the stages completed by a course (in the order they were completed), then the remaining stages (in canonical order). So the path always reads: done … done → current → later stages → trophy, and **a stage keeps its number when it is completed** (Power BI is stage 7 before its course and after it).
- A stage is **done** when the user holds that star (from the CV or from a course). The first stage that is not done is **current**. Each stage after the current one is in one of two states, and the roadmap never contradicts the catalogue: **upcoming** when its course can already be started under 8.5 (the user may take it early; the stage then counts as done), or **locked** when its course is itself locked under 8.5 (a prerequisite skill, or the previous star, is missing).
- Each unfinished stage maps to exactly one course: the course that grants that star (section 9.4).
- Before a CV is analysed, a **start gate** «اكتشف مهاراتك» sits before stage 1 and is the current step; while it stands no skill stage is current (each is upcoming or locked by the rule above). It is cleared by analysing a CV or by pressing «ابدأ بدون سيرة».
- **Branches**: the two other jobs with the highest *projected* match, where projected means the match the user would have with their skills raised to the target job's requirements. Ties: same field as the target first, then data order. Each shows the match now and after the path.
- **How many stages.** The data gives 6 to 11 per job (9.3): 8 for the demo target, 7 for each of the two alternatives, 11 for «محلل ذكاء الأعمال». Any of the 20 jobs can become the target, so the map holds up to 11 stages plus the start gate, the start and the goal, at 390 px as well as on a desktop.

For the target «محلل بيانات» the stages are: Excel ★ · SQL ★ · Power BI ★ · الإحصاء ★ · التواصل الفعّال ★ · Excel ★★ · SQL ★★ · الإحصاء ★★ (8 stages, 74 hours). After the sample CV the displayed order is: Excel ★ · SQL ★ · الإحصاء ★ · التواصل الفعّال ★ · Excel ★★ · SQL ★★ (six done, all from the CV) → **Power BI ★** (stage 7, current) → الإحصاء ★★ (stage 8, **upcoming**: the user holds الإحصاء ★, so its course can be started) → trophy. After the Power BI course: seven done, and stage 8 is current. Branches: «أخصائي تقارير وبيانات» 50% now, 80% after the path; «محلل ذكاء الأعمال» 43% now, 60% after.

**Reading rules** ("easy to trace"; they hold for any drawing, and QA checks them on desktop and at 390 px).
1. One glance gives, in reading order: where the user started («البداية»), where they are (the marker «أنت هنا» on the current stage, or on the start gate before a CV), what is next, and where it ends (the goal «جاهز للوظيفة» with the job title).
2. Every stage is big enough to point at on a projector (DESIGN-BRIEF 3.2), shows its number (its displayed position: the same number as the stage sheet's «المرحلة 7» and the test id `path-stage-7`) and its label (skill and star), and the label sits in the same place relative to its stage for every stage.
3. The states are told apart at once, never by colour alone: done (with its source), current (the one lit step: the current stage, or the start gate before a CV; it carries the accent, DESIGN-BRIEF 3.3), upcoming, locked (with the lock icon, and still readable: locked is not faded out).
4. The branch jobs are clearly secondary: after the goal in reading order, and smaller and quieter than the path.
5. The path fits the width of its area at every width from 390 px and never scrolls sideways (2.4).

**Layout regions** (what the page holds; the arrangement is the design's).

| Region | Content and copy |
|---|---|
| Page heading | «مسارك» |
| Target header | label «هدفك» · job title (opens the job's page) · «{company} · {city}» + tag «جهة تجريبية» · the match ring with the caption «مطابقتك» · the link «غيّر الهدف» (opens `/jobs`) |
| Summary line | «6 من 8 مراحل · بقي 22 ساعة تعلّم»; at 100%: «8 من 8 مراحل · اكتمل المسار» |
| Next-step card | one of the five forms below |
| The path | start «البداية» → (start gate) → stages in displayed order → the goal «جاهز للوظيفة» with the job title (a trophy or a flag, as the chosen design draws it); the marker «أنت هنا» sits on the current stage. If the drawing also shows the match along the path, it is the same number as the ring (P5) |
| Branches | heading «فروع تُفتح بعد هذا المسار»; two cards: job title · «الآن 50%» · «بعد المسار 80%» · the button «عرض الوظيفة» |
| Leaderboard preview | heading «المتصدرون» with the tag «بيانات تجريبية» · the top three of this week, one row each: rank · avatar · name · «{xp} XP» (this week's XP) · then the user's own row: rank · avatar · first name · the tag «أنت» · «{xp} XP». When the user is in the top three, their row is one of the three (with «أنت») and no row is added · the link «عرض الترتيب» (opens `/leaderboard`). In the demo, after onboarding: «فيصل ق.» 980 XP · «سلطان م.» 910 XP · «مشعل ر.» 860 XP, then rank 22, «خالد», «أنت», 80 XP |

**Next-step card, by rule of 2.8.**

| Rule | Title | Body | Button |
|---|---|---|---|
| 1 | «اكتشف نقطة بدايتك» | «ارفع سيرتك الذاتية ليحدّد دليل المراحل التي أنجزتها فعلاً.» | «ارفع سيرتك الذاتية» and the text button «ابدأ بدون سيرة» |
| 2 | «أكمل ما بدأته» | «دورة «{course}»: {x} من {y} دروس.» | «أكمل الدورة» |
| 3 | «خطوتك التالية» | «دورة «أساسيات Power BI» · 10 ساعات · +200 XP · ترفع مطابقتك إلى 90%» | «ابدأ الدورة» |
| 4 | «أنت جاهز لهذه الوظيفة» | «مطابقتك 100% مع «{target}».» | «دع دليل يقدّم عنك» (runs the advisor's application, 7.4) and the text button «قدّم بنفسك» (opens `/jobs/{id}?apply=1`) |
| 5 | «اختر هدفك التالي» | «أنجزت هذا المسار. هذه وظائف صارت أقرب إليك.» | «استعرض الوظائف» |

**Stage labels.** Each stage shows its number, the skill name and the star it stands for, a state label («مكتملة» · «الآن» · «لاحقاً» · «مقفلة»), and for done stages the source («من سيرتك» or «من دورة»).

**Stage sheet** (opens on clicking a stage): title «المرحلة 7: Power BI»; rows «الدورة: أساسيات Power BI» · «المدة: 10 ساعات» · «النقاط: +200 XP» · «أثرها على المطابقة: +20%».
- Current stage: button «ابدأ الدورة» (starts the course and opens it), or «أكمل الدورة» if already started.
- Upcoming stage: the same rows and the button «افتح الدورة» (the course page offers «ابدأ الدورة»).
- Done by a course: «أكملتها بدورة «{course}».» and the button «افتح الدورة».
- Done by the CV: «أثبتتها سيرتك:» followed by the sentence from the CV in quotes.
- Locked stage: «مقفلة: {reason}» with the catalogue's reason text (3.10), for example «مقفلة: تتطلب النجمة 1 في Excel»; no button.
- Preparatory stage: the extra line «تمهيدية: لا ترفع المطابقة، لكنها تفتح المهارة التالية.»

**States.**
- First visit after onboarding, no CV: match 0%; summary «0 من 8 مراحل · 74 ساعة تعلّم»; the start gate is current; next-step card in form 1.
- First visit after a CV analysis: the `catch-up` moment plays once, then the page rests in the normal state.
- Normal: as in the layout above.
- Done (match 100%): the trophy is lit, the card is in form 4 (or 5 after applying), and each branch card's button becomes «اجعلها هدفي».
- Empty (no target job, only reachable through damaged state): «لم تختر هدفاً بعد.» with the button «اختر وظيفة» (opens `/jobs`).

**Interactions.** Click a stage → stage sheet. Click the start gate → `/cv`. Click the job title in the target header → that job's page. Click the next-step button → the action. «ابدأ بدون سيرة» clears the start gate and makes stage 1 current. A branch card opens that job. «عرض الترتيب» in the leaderboard preview opens `/leaderboard`; its rows are not clickable (as on 3.12).

**Leaderboard preview.** It answers "who is first" on the home page (item 5 of "Changes on 18 Nov"). It is part of this page, not a visit to the leaderboard: it plays no `row-climb` and does not move the baseline of 8.7, so the first visit to `/leaderboard` still climbs from the old rank. Its numbers simply show the current rank and this week's XP.

**XP events.** None fire here (courses pay on their own page).

**The opening transition `map-open`** (tier 1). It presents the path in the order it is read, so the transition itself teaches how to read the map: the start «البداية», the stages already done, the marker «أنت هنا» arriving on the current stage (or on the start gate), the next step answering, the stages ahead up to the goal, and the branch jobs last and quietly; the match reaches its value as the marker arrives. The rest of the page is in place from the first frame or within 300 ms, so the map is the only thing performing. How it looks and its exact beats are the chosen design's. Three situations:
1. **In full** (2.6 to 3.8 s, the design's own timing) the first time the map appears after the path reveal. The reveal hands over to it without a cut: when a job is chosen on the reveal result (3.3), the rest of the result leaves first, the path strip stays, and the map opens out of it (the strip's start and named stages become the map's start and stages; the shell arrives around it). At no moment are two pages half-visible. If an alternative was chosen, the strip shows another job's stages, so it leaves with the rest of the result and the full form plays from its first beat. `mapOpenPlayed` is saved when the full form starts; a reload after that gets the short form.
2. **Short** (1.2 s or less: the same story with fewer beats) on every later visit to `/path`. On the first visit after a CV analysis `catch-up` takes its place: it is that visit's opening (should the full form still be unplayed on that visit, the full form plays and `catch-up` follows it). If the daily reward opens on arrival, the opening waits until it is claimed.
3. **When «دليل» opens the map** (`navigate` to `path`, example 2 of 5.6): the short form, also when `/path` was already on screen, so the request visibly lands (`page-handoff`: the map opens first, the reply follows).

It never blocks input: `data-state` and `data-value` hold the final state from the first frame, and a click on a stage or a button during it acts at once. With reduced motion the map shows its end state (the one global rule). For the hold rule of 3.15 the full form counts as a running show: toasts and the nudge (2.6) appear when it ends. The short form holds nothing.

**Motion moments.** `map-open` (above) · `catch-up` (tier 1, 2.4 s; first visit after a CV analysis, in place of the short `map-open`: the stages the CV proves turn done one after another, the marker «أنت هنا» travels along the path to the current stage, and the ring counts from 0% to 70%) · `current-pulse` (tier 1: the current stage breathes quietly so the eye lands on it) · `ring-count` (whenever the match changes) · `stage-sheet-open` · `trophy-light` (the goal lights at 100%). None blocks input: a click during `map-open` or `catch-up` acts on the final state.

**Phone.** Order: target header, next-step card, the path, the branches (stacked), the leaderboard preview. The chosen design draws the path for the phone width (it may differ from the desktop drawing) and keeps the five reading rules; the stage sheet is a bottom sheet.

**Test ids.** `path-target-title` · `path-match` (`data-value`) · `path-summary` · `path-change-target` · `path-next-step` (`data-state` = rule number) · `path-next-step-action` (the card's main button) · `path-next-step-secondary` («قدّم بنفسك» in form 4) · `path-skip-cv` · `path-map` (the map; `data-open` = the opening this visit chose: `full` / `short` / `catch-up`, set from the first frame, also with reduced motion) · `path-gate` · `path-stage-{n}` (1-based displayed position; `data-state` = done / current / upcoming / locked; `data-skill`; `data-level`) · `path-stage-sheet` · `path-stage-start` (the sheet's button, whatever its label) · `path-stage-sheet-close` · `path-trophy` (the goal, whatever its drawing) · `path-branch-{jobId}` (`data-value` = projected match) · `path-leaderboard` · `path-leaderboard-row-{userId}` (a top-three row of a sample user; `data-value` = rank) · `path-leaderboard-me` (the user's row, also when it is in the top three; `data-value` = rank) · `path-leaderboard-open` («عرض الترتيب»).

### 3.5 Skill tree `/skills`

**Purpose.** Show the whole landscape: 38 skills in 7 fields, what the user holds, what is open, what is locked, and how each skill connects to courses and jobs.

**Layout regions.**

| Region | Content and copy |
|---|---|
| Heading | «شجرة المهارات» with the line «38 مهارة في 7 مجالات. كل نجمة تقرّبك من وظيفة.» |
| Summary | «8 من 38 مهارة · 11 من 59 نجمة» |
| Field selector | «كل المجالات» and the seven field names (9.1) |
| The tree | seven clusters, one per field; a node per skill; a line from each prerequisite to the skill it opens |
| Legend | «مكتسبة» · «متاحة» · «مقفلة» · «في مسارك» |
| Skill panel | opens when a node is clicked |

**Node states.** `earned` (1 star or more; shows its stars out of its own maximum: a skill has 1, 2 or 3 star slots, see 9.2) · `maxed` (all its stars) · `available` (0 stars and every prerequisite skill has at least 1 star) · `locked` (a prerequisite has 0 stars). A skill with a star is never locked, even if the CV proved it without its prerequisite. Skills needed by the target job also carry the mark «في مسارك».

**Skill panel copy.**
- Skill name, field name, «نجمتان من 3».
- «مصدر النجوم»: for each star, «من سيرتك:» + the sentence in quotes, or «من دورة: {course}».
- Prerequisites: «تتطلب: Excel».
- Next star: «النجمة التالية: دورة «{course}» · {hours} ساعات · +{xp} XP» with the button «ابدأ الدورة» (starts and opens the course).
- Maxed: «أتممت كل نجوم هذه المهارة.»
- Locked: «مقفلة. اكتسب أولاً: {prerequisite}.» with the button «افتح {prerequisite}» (selects that node).
- Jobs: «تطلبها 3 وظائف» with the link «عرضها» (opens `/jobs?skill={skillId}`, which lists exactly the jobs that require this skill, so the count and the list always agree).

**States.**
- Before a CV and before any course: every node is available or locked; a banner reads «شجرتك لم تُضئ بعد. ارفع سيرتك لتُظهر ما تملكه.» with the button «ارفع سيرتك الذاتية».
- Normal: as above.
- No empty and no error state.

**Interactions.** Click a node → panel. Choose a field → the tree focuses on that cluster. The advisor can open a specific skill (`/skills?skill=powerbi`).

**XP events.** None.

**Motion moments.** `tree-grow` (first visit: clusters and lines grow outward from the roots; 1.0 s) · `star-fill` (on arriving after a star was earned elsewhere, the new star fills on its node) · `node-unlock` (a node that became available since the last visit opens) · `field-focus` (choosing a field brings its cluster forward). The baseline for `star-fill` and `node-unlock` is the state this page last showed. On the first visit it is the state before the user's latest star, so `tree-grow` plays and then that star fills and the node it opened unlocks (in the demo: Power BI's first star, and «تصوير البيانات» opening).

**Phone.** One field at a time: the field selector is a row that scrolls sideways; the chosen field's skills are drawn as a vertical tree; the panel is a bottom sheet.

**Test ids.** `skills-summary` (`data-value` = stars held) · `skills-field-{fieldId}` · `skills-node-{skillId}` (`data-state`; `data-value` = stars) · `skills-panel` · `skills-panel-start` · `skills-panel-jobs` · `skills-panel-close` · `skills-banner-cv`.

### 3.6 CV `/cv`: upload, analysis show, results

**Purpose.** Take a CV in, make the analysis a show worth watching, and end with proven skills and the jobs they fit. Inputs, stages, analyser rules and the sample CV: section 6.

**Layout, input state.**

| Region | Copy |
|---|---|
| Heading | «سيرتي الذاتية» |
| Intro | «ارفع سيرتك، ودليل يستخرج مهاراتك ويريك الجملة التي تثبت كل واحدة.» |
| Drop zone | «اسحب ملف سيرتك هنا أو اختره من جهازك» · «PDF أو Word (docx) · حتى 5 ميغابايت و15 صفحة» · button «اختر ملفاً» |
| Paste area | label «أو الصق نص السيرة» · placeholder «الصق هنا نص سيرتك الذاتية…» · helper while the text has 1 to 79 characters: «النص قصير. أضف خبراتك ومهاراتك (80 حرفاً على الأقل).» |
| Sample button | «جرّب بسيرة ذاتية تجريبية» |
| Analyse button | «حلّل سيرتي» (enabled when a file is chosen or the text has 80 characters or more) |
| Privacy line | «تُقرأ سيرتك لاستخراج المهارات فقط، ويُحفظ نصها ونتيجتها في متصفحك.» When an AI key is configured the line continues: «يُرسل نص السيرة إلى مزوّد نموذج الذكاء الاصطناعي لقراءته فقط.» |

A chosen file shows as a chip «{file name} · {size}» with «إزالة». The sample button fills the paste area with the sample CV (its first line is the user's name) and enables the analyse button; it does not start the analysis by itself.

**Layout, analysis show.** The page becomes a stage: the CV text as a document, a status line with the current stage's Arabic line, and a tray where found skills collect. Stages and lines: section 6.3. Total 7.0 s with the local analyser. Space or `Esc` jumps to the results.

**Layout, results.**

| Region | Copy |
|---|---|
| Heading | «في سيرتك 8 مهارات» and the reward «+100 XP» (first analysis only). When the sample CV was the one analysed: «في السيرة التجريبية 8 مهارات», with the tag «سيرة تجريبية» beside it |
| Engine label | «القراءة: محلّل محلي بالكلمات المفتاحية» or «القراءة: نموذج ذكاء اصطناعي» |
| Skills list, grouped by field | per skill: name · stars out of its maximum · «من سيرتك:» + the sentence in quotes |
| Target line | «مطابقتك مع هدفك «محلل بيانات»: 70%» |
| Matched jobs | heading «أفضل الوظائف لمهاراتك» · the top three as cards with match rings: «محلل بيانات» 70% (tag «هدفك») · «محلل أعمال» 60% · «محلل مالي» 53%. Every card opens its job when clicked and carries the button «دع دليل يقدّم عنك»; cards other than the target also carry «اجعلها هدفي» |
| Buttons | «اذهب إلى مساري» (primary) · «كل الوظائف» |
| Footer | «آخر تحليل: {date}» · the button «حلّل سيرة أخرى» |

**States.**
- First visit: input state.
- Loading: the analysis show (never a spinner).
- Done: results. Returning to `/cv` later shows the saved results.
- Reload: the result, the `cv_analysed` XP and the badge are saved when the analysis returns, before the show starts. A reload during the show opens the results, and the waiting news (XP toast, level-up, badge toast) shows there once (3.15).
- Empty result (no skill found), in «دليل»'s voice: «لم ألتقط مهارات واضحة في هذا النص.» · «أضف خبراتك ودوراتك ومهاراتك بأسمائها، أو جرّب السيرة التجريبية لترى كيف يعمل التحليل.» · buttons «عدّل النص» and «جرّب بسيرة ذاتية تجريبية». No XP is paid.
- Errors (shown in the input state, under the drop zone; which one applies is defined in 6.1):
  - wrong type → «المقبول: PDF و Word (docx) فقط. أو الصق نص سيرتك.»
  - larger than 5 MB → «الملف أكبر من 5 ميغابايت. جرّب ملفاً أصغر أو الصق النص.»
  - more than 15 pages → «الملف طويل (أكثر من 15 صفحة). ارفع سيرة أقصر أو الصق نصها.»
  - the file cannot be opened (damaged or password-protected) → «تعذّر فتح الملف. الصق نص سيرتك هنا.» Retrying cannot help, so no retry button.
  - no readable text (a scanned image) → «لا يوجد نص مقروء في الملف، وقد يكون صورة ممسوحة. الصق نص سيرتك هنا.»
  - the request itself failed → «تعذّر التحليل الآن. جرّب مرة أخرى.» with «أعد المحاولة».

**Interactions.** Drag a file, pick a file, paste, or press the sample button; then «حلّل سيرتي». Clicking a matched-job card opens that job. «دع دليل يقدّم عنك» runs the advisor's application for that job (7.4); pressing it is the user asking (5.4). «اجعلها هدفي» asks for confirmation as in 3.8. A second analysis replaces the CV-proven stars but never removes a star earned by a course.

**XP events.** `cv_analysed` +100, first successful analysis that finds at least one skill. For the demo this lifts 80 XP to 180 XP: the toast «+100 XP · حلّلت سيرتك · صعدت إلى المركز 18 هذا الأسبوع», the level-up «المستوى 2 · مستكشف» 0.6 s after it, and the badge toast «سيرة مقروءة». They are held until the results have settled and then appear together (3.15). None of them catches a click.

**Motion moments.** `drop-accept` (the zone takes the file) · `sample-type-on` (the sample text writes itself into the paste area in under a second) · tier 1: `scan-line` (a line passes down the document while it is read), `phrase-highlight` (each evidence sentence is marked in the document), `tag-pop` (a skill tag pops out of its sentence and flies to the tray), `star-fill` (stars fill on each tag), `results-rise` (the result cards rise in a short stagger) · `ring-count` (the target ring counts from 0% to 70%).

**Phone.** One column. The drop zone becomes the button «اختر ملفاً»; the paste area and the sample button follow. In the show the document fills the width and the tray is a row under it.

**Test ids.** `cv-dropzone` · `cv-file-input` · `cv-file-chip` · `cv-paste` · `cv-paste-hint` · `cv-sample` · `cv-analyse` · `cv-error` · `cv-show` · `cv-show-stage` (`data-value` = stage id) · `cv-results` (`data-value` = number of skills) · `cv-sample-tag` · `cv-engine` · `cv-skill-{skillId}` (`data-value` = stars) · `cv-evidence-{skillId}` · `cv-target-match` (`data-value`) · `cv-job-{jobId}` (`data-value` = match) · `cv-job-apply-advisor-{jobId}` · `cv-job-set-target-{jobId}` · `cv-go-path` · `cv-go-jobs` · `cv-reanalyse`.

### 3.7 Jobs `/jobs`: search and list

**Purpose.** Find opportunities ranked by how well each one fits the user. Rules: section 7.

**Layout regions.**

| Region | Copy |
|---|---|
| Heading | «الوظائف» with the line «كل وظيفة ومعها نسبة مطابقتك لها.» |
| Sample banner | «بيانات تجريبية: الوظائف والجهات هنا للعرض فقط.» |
| Search box | placeholder «ابحث بالمسمى أو المهارة أو الجهة» |
| City filter | label «المدينة»: «كل المدن» · «الرياض» · «جدة» · «الدمام» · «عن بُعد» |
| Field filter | label «المجال»: «كل المجالات» and the six fields that have jobs (9.1) |
| Skill filter (only when the URL carries `skill`) | a removable chip «المهارة: {name}» |
| Count line | «20 وظيفة · مرتّبة حسب المطابقة»; while the user holds no star: «20 وظيفة · مرتّبة حسب إجاباتك» |
| List | job cards |

**Job card.** Job title · «{company} · {city}» with the tag «جهة تجريبية» · the experience label (9.3) · the match ring · one gap line: «ينقصك: Power BI، الإحصاء» (the unmet skills, at most three) or «تستوفي المتطلبات كلها» · flags when true: «هدفك», «قدّمت».

**States.**
- While the user holds no star: every match is 0% and the list is ordered by the onboarding fit score (4.6).
- Until a CV is analysed (even if a course has already given a star): a banner reads «ارفع سيرتك لتُرتَّب الوظائف حسب مطابقتك الفعلية.» with the button «ارفع سيرتك الذاتية».
- Normal (the user holds at least one star): ranked by match (7.2). After the sample CV the first eight are: محلل بيانات 70% · محلل أعمال 60% · محلل مالي 53% · أخصائي تقارير وبيانات 50% · مختبِر برمجيات 50% · منسّق مشاريع 50% · أخصائي استقطاب وتوظيف 50% · محلل ذكاء الأعمال 43%.
- Empty (filters or search match nothing): «لا توجد وظائف بهذه المواصفات.» with the button «امسح التصفية».
- No loading and no error state.

**Interactions.** Typing filters as you type. Filters combine (search AND city AND field AND skill) and are written to the URL. Removing the skill chip clears that filter. Clicking a card opens the job.

**XP events.** None.

**Motion moments.** `list-reorder` (when the filters change, or when the user returns with a higher match, cards move to their new places instead of jumping) · `ring-count` (a ring whose value changed since the last visit counts to the new value).

**Phone.** The search box on top; the two filters as two compact selectors on one row; cards in one column with the ring at the inline-end.

**Test ids.** `jobs-search` · `jobs-filter-city-{cityId}` (`all`, `riyadh`, `jeddah`, `dammam`, `remote`) · `jobs-filter-field-{fieldId}` (`all` and the field ids) · `jobs-filter-skill` (`data-value` = skill id) · `jobs-filter-skill-clear` · `jobs-count` (`data-value`) · `jobs-card-{jobId}` · `jobs-match-{jobId}` (`data-value`) · `jobs-empty` · `jobs-clear` · `jobs-banner-cv`.

### 3.8 Job detail `/jobs/[id]` and the apply sheet

**Purpose.** Show the gap for one job in three plain parts (what you have, what is missing, which courses close it), and let «دليل» apply for the user, which is what he asked for; applying by hand is the second way.

**Layout regions.**

| Region | Content and copy |
|---|---|
| Back link | «الوظائف» |
| Header | job title · «{company} · {city}» · tags: the field, the experience label, «جهة تجريبية» |
| Match | the ring with the caption «مطابقتك» · the line «كل مهارة من الخمس تساوي 20% من المطابقة.» · the link «كيف تُحسب؟» |
| About | heading «عن الوظيفة»: one summary sentence; heading «المهام»: three lines |
| The gap, block 1 | heading «ما لديك»: each fully met skill as «Excel · نجمتان من نجمتين» with its source («من سيرتك» or «من دورة») |
| The gap, block 2 | heading «ما ينقصك»: each unmet skill as «الإحصاء: لديك نجمة من نجمتين» or, with no star yet, «Power BI: لا نجوم بعد، والمطلوب نجمة» («والمطلوب نجمتان», «والمطلوب 3 نجوم») |
| The gap, block 3 | heading «كيف تسدّ الفجوة»: one row per missing star: course title · hours · «+200 XP» · «+20% مطابقة» · the button «افتح الدورة» |
| Actions | «دع دليل يقدّم عنك» (primary) · «قدّم بنفسك» (text button) · «اجعلها هدفي» (or the label «هدفك الحالي») · «اسأل دليل عن هذه الوظيفة» |

For «محلل بيانات» after the sample CV: ring 70%. **ما لديك**: Excel (2 of 2), SQL (2 of 2), التواصل الفعّال (1 of 1). **ما ينقصك**: Power BI (no star, 1 required), الإحصاء (1 of 2). **كيف تسدّ الفجوة**: «أساسيات Power BI: من البيانات إلى لوحة المعلومات» · 10 ساعات · +200 XP · +20% مطابقة; «الإحصاء التطبيقي للمحللين» · 12 ساعة · +240 XP · +10% مطابقة.
After the Power BI course (the state the demo shows): ring 90%. **ما لديك**: Excel, SQL, Power BI (1 of 1), التواصل الفعّال. **ما ينقصك**: الإحصاء (1 of 2). **كيف تسدّ الفجوة**: «الإحصاء التطبيقي للمحللين» · 12 ساعة · +240 XP · +10% مطابقة.

**«كيف تُحسب؟»** opens a small explainer listing the five skills with what each contributes: «Excel: 20 من 20» · «SQL: 20 من 20» · «Power BI: 0 من 20» · «الإحصاء: 10 من 20» · «التواصل الفعّال: 20 من 20» · «المجموع: 70%».

**States.**
- While the user holds no star: match 0%, block 1 reads «لم تُحلَّل سيرتك بعد، لذلك تظهر كل المتطلبات ناقصة.» with the button «ارفع سيرتك الذاتية».
- Normal: as above.
- Ready (100%): block 2 reads «لا شيء ينقصك. أنت جاهز لهذه الوظيفة.» and block 3 is hidden.
- Applied: the two apply buttons are replaced by the chip «قدّمت · {status} · محاكاة» and the button «تابع الطلب» (opens `/applications`).
- Not found: the shell's not-found block (2.2).

**Interactions.**
- «دع دليل يقدّم عنك» opens the advisor panel, posts the user bubble «قدّم لي على هذه الوظيفة» and runs the advisor's application of 7.4. Pressing the button is the user asking (5.4).
- «قدّم بنفسك» opens the apply sheet already filled.
- «اجعلها هدفي» opens a confirmation: title «تغيير الهدف؟», body «سيُعاد رسم مسارك نحو «{title}». تقدّمك في المهارات محفوظ.», buttons «غيّر الهدف» and «إلغاء». After it: the toast «هدفك الآن: {title}». Changing the target pays no XP.
- «اسأل دليل عن هذه الوظيفة» opens the advisor with the page chips of 5.8.

**The apply sheet.** A dialog centred in the content area. Its backdrop covers the content area only, so the advisor panel that is narrating it stays visible, undimmed and above it. On phones it is a full-screen sheet.

| Element | Copy and content |
|---|---|
| Title | «التقديم على {title}» · «{company} · جهة تجريبية» |
| Low-match warning (match under 60%; a block above the form) | «مطابقتك {match}%، أقل من 60%. الأفضل أن تسدّ الفجوة أولاً.» with the button «شاهد الفجوة», which closes the sheet and scrolls to the block «ما ينقصك» |
| Field 1 | «الاسم»: the user's name |
| Field 2 | «المدينة»: from onboarding (a neutral answer prints «غير محدّدة», 4.3) |
| Field 3 | «المؤهل والتخصص»: «بكالوريوس · نظم معلومات إدارية» (neutral answers print as in 4.3) |
| Field 4 | «مهاراتك المطابقة»: chips of the job's skills the user holds at the required stars or more (the «ما لديك» list), with their stars |
| Field 5 | «رسالة التقديم»: drafted from the template in 7.4, editable |
| Field 6 | «السيرة الذاتية»: «مرفقة: {file name}» · «مرفقة: السيرة التجريبية» · «لا توجد سيرة مرفقة» |
| Sample note | «تقديم تجريبي: لن يُرسل شيء إلى جهة حقيقية.» |
| Buttons | «أرسل الطلب» (under 60% the same button reads «قدّم على أي حال») · «إلغاء» |
| While «دليل» fills it | the line «دليل يملأ الطلب…» and the button «إيقاف» |
| Sending | «جارٍ الإرسال…» (1.2 s) |
| Confirmation | «تم إرسال طلبك» · «رقم الطلب: DL-2026-0001» · «مطابقتك عند التقديم: 90%» · «+40 XP · تقديم مدروس» (or «بدون نقاط: المطابقة أقل من 60%») · buttons «تابع طلباتي» and «إغلاق» |

The two ways to apply, and what the user sees in each, are specified in 7.4.

**XP events.** `job_applied` +40 when the application is sent with a match of 60% or more (once per job). First application ever: the badge «أول تقديم».

**Motion moments.** `gap-settle` (the three blocks arrive in order: have, missing, courses) · `sheet-open` · `self-typing` (tier 1; when «دليل» applies: each field writes itself, one after another, with a small «دليل» mark on the field being written) · `chips-pop` (the matching skills pop in) · `submit-press` (the button is visibly pressed) · `sent-mark` (the confirmation lands).

**Phone.** The header and ring first, then the actions, then the three gap blocks stacked, then «عن الوظيفة». «دع دليل يقدّم عنك» stays pinned to the bottom (above the tab bar) while scrolling. The apply sheet is full screen.

**Test ids.** `job-back` · `job-title` · `job-match` (`data-value`) · `job-explain` · `job-explain-panel` · `job-have` · `job-missing` · `job-courses` · `job-course-{courseId}` · `job-apply-advisor` · `job-apply` («قدّم بنفسك») · `job-set-target` · `job-set-target-confirm` · `job-ask-advisor` · `job-applied-status` · `job-banner-cv` · `apply-sheet` · `apply-name` · `apply-city` · `apply-education` · `apply-skills` · `apply-note` · `apply-cv` · `apply-warning` · `apply-warning-gap` · `apply-submit` · `apply-cancel` · `apply-stop` · `apply-confirmation` · `apply-number` · `apply-go-applications` · `apply-close`.

### 3.9 Applications `/applications`

**Purpose.** Follow each application like a real one, while saying plainly that it is a simulation.

**Layout regions.**

| Region | Copy |
|---|---|
| Heading | «طلباتي» with the line «تابع كل طلب قدّمته.» |
| Simulation banner | «محاكاة: لا توجد جهة حقيقية تراجع طلبك. الحالات تتقدّم تلقائياً لتجربة المتابعة.» |
| List | one card per application, newest first |

**Application card.** Job title · «{company} · جهة تجريبية» · «رقم الطلب DL-2026-0001» · «قدّمت {relative time}» · a three-step track: «أُرسل» → «قيد المراجعة» → «النتيجة» · the status note · «مطابقتك عند التقديم 90%» · «مطابقتك الآن 90%» and, when it rose (here, after the statistics course), «ارتفعت من 90% إلى 100% منذ التقديم» · on an application the advisor sent, «قدّم عنك دليل» · the button «عرض الوظيفة» · the labelled control «محاكاة: انقل للحالة التالية» (hidden once the status is `shortlisted` or `closed`).

| Status id | Label | Note under the track |
|---|---|---|
| `sent` | «أُرسل الطلب» | «وصل طلبك وينتظر المراجعة.» |
| `review` | «قيد المراجعة» | «طلبك قيد المراجعة.» |
| `shortlisted` | «مرشّح للمقابلة» | «رُشّحت للمقابلة. راجع مهارات الوظيفة واستعدّ.» |
| `closed` | «لم يُرشّح هذه المرة» | «لم يُرشّح طلبك هذه المرة. سدّ الفجوة لتقوى فرصك في الوظائف القادمة.» with the button «شاهد الفجوة» (the product does not invite a second try: an application to the same job cannot be sent twice) |

How statuses advance: section 7.5.

**States.**
- Empty: «لم تقدّم على أي وظيفة بعد.» · «ابدأ بالوظائف الأقرب لمهاراتك، أو اطلب من دليل أن يقدّم عنك.» · the button «استعرض الوظائف».
- Normal: the list.
- No loading and no error state.

**XP events.** None (the XP was paid when applying).

**Motion moments.** `status-advance` (when a status changes while the page is open, or on arrival after a change, the track's marker moves to the next step and the note rolls to the new text).

**Phone.** Cards in one column; the track stays horizontal.

**Test ids.** `applications-list` · `applications-item-{jobId}` · `applications-status-{jobId}` (`data-state` = status id) · `applications-number-{jobId}` · `applications-match-then-{jobId}` · `applications-match-now-{jobId}` · `applications-advance-{jobId}` · `applications-open-job-{jobId}` · `applications-empty` · `applications-go-jobs`.

### 3.10 Courses catalogue `/learn`

**Purpose.** All 59 courses, with the ones on the user's path first, and every card saying what star it grants.

**Layout regions.**

| Region | Copy |
|---|---|
| Heading | «الدورات» with the line «كل دورة تمنحك نجمة في مهارة.» |
| Sample banner | «دورات تجريبية: عناوين الدروس فقط، والإكمال بضغطة زر.» |
| Tabs | «في مساري» · «وسّع آفاقك» · «مكتملة» |
| Field filter | «كل المجالات» and the seven fields (three tabs and one filter are enough for 59 courses: there is no search box here) |
| List | course cards |

**Course card.** Title · «Power BI · النجمة 1» · «10 ساعات» · «+200 XP» · for courses on the path, «+20% مطابقة» (a preparatory stage's course shows the tag «تمهيدية» instead) · the state label.

| Course state | Label | Meaning |
|---|---|---|
| `available` | «متاحة» | prerequisites met, not started |
| `started` | «بدأتها · 2 من 5» | lessons ticked so far |
| `completed` | «مكتملة» | completed by the user |
| `credited` | «مثبتة» | the user holds this star without having completed this course (the CV proved it, or a higher course of the same skill was completed, 8.5); the course cannot be started and pays nothing |
| `locked` | «مقفلة» | with the reason: «تتطلب: {skill}» (a prerequisite skill has no star) or «تتطلب النجمة {n} في {skill}» (the previous star is missing) |

**Tabs.**
- «في مساري»: the courses of the unfinished roadmap stages, current stage first, in stage order. Each shows its own state, which is the same state the roadmap shows for its stage: «متاحة» for the current and upcoming stages, «مقفلة» with its reason for locked ones (3.4). Under them a collapsed group «أنجزتها (6)» with the path's done stages (completed or credited).
- «وسّع آفاقك»: every course not on the path: available first, then started, then credited, then locked.
- «مكتملة»: the courses the user completed, newest first.

**States.**
- Normal: as above, opening on «في مساري».
- «في مساري» empty (path finished): «أنجزت كل دورات مسارك.» with the button «وسّع آفاقك».
- «مكتملة» empty: «لم تكمل أي دورة بعد. أول دورة تمنحك شارة.» with the button «دورات مساري».
- A field with no course in the open tab: «لا توجد دورات في هذا المجال هنا.» with the button «كل المجالات».

**Interactions.** A card opens the course. The tab and the field live in the URL.

**XP events.** None.

**Motion moments.** `list-reorder` only.

**Phone.** Tabs as a row at the top; field filter as a row that scrolls sideways; cards in one column.

**Test ids.** `learn-tab-path` · `learn-tab-explore` · `learn-tab-done` · `learn-filter-{fieldId}` · `learn-card-{courseId}` (`data-state`) · `learn-done-group` · `learn-empty` · `learn-empty-action`.

### 3.11 Course detail `/learn/[id]` and the completion celebration

**Purpose.** Start a course, complete it, and feel the effect: this is where the headline moment happens.

**Layout regions.**

| Region | Content and copy |
|---|---|
| Back link | «الدورات» |
| Header | title · «تمنحك: النجمة 1 في Power BI» · «10 ساعات · 5 دروس · +200 XP» · for a course on the path: «ترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%» |
| Sample note | «دورة تجريبية: عناوين فقط، والإكمال بضغطة زر.» |
| About | heading «عن الدورة»: two sentences |
| Lessons | heading «الدروس»: 3-6 lesson titles, numbered |
| Action area | by state, below |

**States and the action area.**

| State | What shows |
|---|---|
| `available` | the button «ابدأ الدورة» |
| `started` | the progress line «2 من 5 دروس» · each lesson has a tick box · the button «أكمل الدورة» (the page's sample note already says that completing is one press) |
| `completed` | «أكملتها {date} · +200 XP» · the next-step card (2.8) under it |
| `credited` | «هذه النجمة مثبتة عندك. لا تحتاج هذه الدورة.» · then its source: «من سيرتك:» + the CV sentence in quotes, or «من دورة: {the higher course}» |
| `locked` | «مقفلة: {reason}» · the button «افتح المتطلب» (opens the course that removes the lock) |
| not found | the shell's not-found block |

**Interactions.**
- «ابدأ الدورة» sets the state to started (toast: «بدأت الدورة. بالتوفيق.»). It pays no XP.
- Lessons can be ticked one by one; ticking is progress only and pays no XP.
- «أكمل الدورة» is enabled from the moment the course is started. Pressing it ticks every remaining lesson in a quick run (`lessons-cascade`), then opens the celebration. There is no confirmation dialog.

**The completion celebration** (one overlay, one sequence, one dismiss; other overlays are held while it plays and what they would have shown is folded into it).

| Beat | Shows when | Copy for the demo |
|---|---|---|
| 1 Course | always | «أكملت الدورة» · «أساسيات Power BI: من البيانات إلى لوحة المعلومات» |
| 2 XP | always | «+200 XP», the total counting from 180 to 380 |
| 3 Star | always | «Power BI: النجمة 1 من 3» |
| 4 Match | the course is on the target's path | «مطابقتك مع «محلل بيانات»» and the ring rising from 70% to 90%; at 100% also «أنت جاهز لهذه الوظيفة» |
| 5 Level | the level changed | «مستوى جديد: 3 · مجتهد» (a gain that crosses two levels shows the final level only) |
| 6 Badges | any badge unlocked | «شارات جديدة»: «أول دورة» · «ضمن العشرة الأوائل» |
| 7 Rank | the weekly rank improved | «صعدت 8 مراكز: المركز 10 هذا الأسبوع» |
| Buttons | always | «الخطوة التالية» (performs the next step of 2.8) · «رجوع لمساري» |

- **Lengths.** Course 0.5 s · XP 0.7 s · star 0.7 s · match 1.6 s · level 0.6 s · badges 0.5 s · rank 0.4 s: 5.0 s when all seven show. The match beat has the longest share because it is the headline. A beat that does not apply is left out and its time is not spent.
- **Never a wait.** The buttons are usable from the first beat, and pressing one acts at once on the final state. Space jumps to the end state. `Esc` equals «رجوع لمساري».
- **Reload.** Completion, XP, the star, the level and the badges are saved in one write before beat 1. A reload during the celebration shows the course as `completed`; nothing is replayed, lost or repeated (3.15).

**XP events.** `course_completed`: 20 XP per course hour (8.2). Badges checked: «أول دورة», «خمس دورات», «عشر مهارات», «المستوى الخامس», «جاهز للوظيفة», «ضمن العشرة الأوائل».

**Motion moments.** Tier 1: `celebration-open`, `xp-count-up`, `star-award` (the star travels to the skill and lands), `match-rise` (the ring climbs from the old value to the new one: the headline moment, give it room). Tier 2: `lesson-tick` · `lessons-cascade` · `level-up-beat` · `badge-drop` · `rank-climb` (the user's row passes the rows it overtook) · `confetti-burst` (once, on the match beat; the idea file asks for it, the design team decides its restraint).

**Phone.** The header, then the lessons; the action area is pinned to the bottom (above the tab bar). The celebration is full screen with the beats stacked.

**Test ids.** `course-back` · `course-title` · `course-state` (`data-state`) · `course-start` · `course-complete` · `course-progress` (`data-value` = lessons ticked) · `course-lesson-{n}` (1-based) · `course-locked-open` · `course-next-step` · `celebration-overlay` · `celebration-xp` (`data-value` = XP gained) · `celebration-star` · `celebration-match` (`data-value` = new match; `data-from` = old match) · `celebration-level` (`data-value`) · `celebration-badges` · `celebration-rank` (`data-value` = new rank) · `celebration-next` · `celebration-close`.

### 3.12 Leaderboard `/leaderboard`

**Purpose.** Show who is first, where the user stands, and how to climb. Rules and the sample users: sections 8.7 and 9.5.

**Layout regions.** One board, this week's. There are no tabs.

| Region | Copy |
|---|---|
| Heading | «المتصدرون» with the line «ترتيب هذا الأسبوع حسب XP.» |
| Sample note | «المتسابقون الآخرون بيانات تجريبية. ترتيبك يُحسب من نقاطك أنت.» |
| My card | «مركزك 10 من 25» · «420 XP» (this week's XP, like every XP number on this page; in the demo it equals the total) · «يفصلك 20 XP عن المركز 9» · when the rank improved since the last visit: «صعدت 8 مراكز» · «أسرع طريق للصعود: {next-step label}» with a button that performs the next step |
| Podium | ranks 1, 2 and 3: avatar, name, XP |
| List | all 25 rows in rank order: rank · avatar · name · city · «المستوى 5» · XP this week; the user's row carries the tag «أنت» |
| Footer note | «يُحتسب XP أسبوعك من يوم الأحد.» |

Rows show the level as a number only («المستوى 5»). Level titles appear only for the signed-in user (the user chip, the profile, the level-up).

**States.**
- Normal: as above. The list is never empty.
- First place: the gap line reads «أنت في الصدارة. حافظ عليها.»
- The user is in the top three: they appear on the podium and in the list.
- No loading and no error state.

**Interactions.** The button in my card performs the next step of 2.8. Rows are not clickable (there are no public profiles).

**XP events.** None. The badge «ضمن العشرة الأوائل» is checked whenever XP is earned, wherever the user is.

**Motion moments.** `podium-rise` (on arrival the three places rise to their heights; 0.8 s) · `row-climb` (tier 1, 1.2 s: if the rank improved since the page last showed it, the user's row starts at the old position and climbs to the new one, passing the rows it overtook; which old position, when the page was never opened: 8.7). Neither blocks input.

**Phone.** My card first, then the podium, then the list with city and level on a second line of each row.

**Test ids.** `leaderboard-my-rank` (`data-value`) · `leaderboard-my-xp` (`data-value`) · `leaderboard-gap` (`data-value` = XP to the next rank) · `leaderboard-climb` (`data-value` = places gained) · `leaderboard-next-step` · `leaderboard-podium-{1|2|3}` · `leaderboard-row-{userId}` (`data-value` = rank) · `leaderboard-row-me` (`data-value` = rank).

### 3.13 Profile `/profile`

**Purpose.** The user's identity in the game: avatar, level, XP history, streak, badges.

**Layout regions.**

| Region | Content and copy |
|---|---|
| Page heading | «ملفي» |
| Identity | avatar with the button «غيّر الصورة» · name · «المستوى 3 · مجتهد» · bar with «420 من 600 XP» (at level 7: «بلغت أعلى مستوى») · the note «XP = نقاط الخبرة» |
| Stats row | «XP» 420 · «الدورات المكتملة» 1 · «النجوم» 12 · «سلسلة الأيام» 1 · «ترتيب الأسبوع» 10 |
| Badges | heading «الشارات» with «6 من 12»; a grid of all twelve (8.6). Unlocked: name, description, date. Locked: name, the tag «مقفلة», and its hint (8.6) |
| Streak | heading «سلسلة الأيام»: «يوم واحد» · «أطول سلسلة: 1» · a strip of the last 7 days · «مكافأة الغد: +40 XP» |
| XP history | heading «سجل النقاط»: newest first, each row «+200 XP · أكملت دورة أساسيات Power BI · اليوم 21:14» |
| My answers | heading «معلوماتي»: «المدينة» · «المؤهل» · «التخصص» · «الخبرة» · «الاهتمام» · «الأولوية» (neutral answers print as in 4.3) · «الوظيفة المستهدفة» with the link «غيّر الهدف» |
| About | heading «عن هذا العرض»: «منصة دليلك عرض تجريبي. الوظائف والجهات والدورات والمتسابقون بيانات تجريبية، والتقديم على الوظائف محاكاة. تحليل السيرة وحساب المطابقة ورسم المسار حقيقي ويُحسب من بياناتك. بياناتك محفوظة في هذا المتصفح، لا في حساب على خادم.» When an AI key is configured one sentence is added: «عند تفعيل نموذج الذكاء الاصطناعي تُرسل رسائلك وملخص ملفك إلى مزوّد النموذج للرد فقط.» |
| Account | «تسجيل الخروج» · «إعادة ضبط العرض» |

**Avatar picker** (dialog): title «اختر صورتك» · the twelve avatars · buttons «حفظ» and «إلغاء» · toast after saving: «تم تحديث صورتك.» The new avatar appears at once in the user chip, the leaderboard and the advisor thread.

**States.** Normal only. The XP history always has at least the onboarding rows. Sign-out returns to `/` and keeps the account. «إعادة ضبط العرض» asks: title «حذف بيانات {name}؟», body «سيُحذف تقدّمك ونقاطك من هذا المتصفح.», buttons «احذف وابدأ من جديد» and «إلغاء»; it deletes this account and returns to `/`.

**XP events.** None.

**Motion moments.** `badge-reveal` (a badge unlocked since the last visit turns over once).

**Phone.** One column in the order of the table; the badges grid has three per row.

**Test ids.** `profile-avatar` (`data-value` = avatar id) · `profile-avatar-open` · `profile-avatar-option-{avatarId}` · `profile-avatar-save` · `profile-avatar-cancel` · `profile-level` (`data-value`) · `profile-xp` (`data-value`) · `profile-stat-{courses|stars|streak|rank}` (`data-value`) · `profile-badge-{badgeId}` (`data-state` = unlocked / locked) · `profile-badges-count` (`data-value`) · `profile-streak` · `profile-history` · `profile-history-row-{index}` · `profile-answers` · `profile-change-target` · `profile-signout` · `profile-reset` · `profile-reset-confirm`.

### 3.14 Advisor panel «دليل»

**Purpose.** One conversation that follows the user across the app: it answers, it opens pages, and on request it acts. Persona, tools, rules and examples: section 5.

**Layout.**
- **Desktop, 1280 px and wider: the panel docks.** It sits on the inline-end side (the left side in RTL), 420 px wide, inset 8 px from the viewport edge. While it is open the content area, top bar included, takes `padding-inline-end: 436px`. So nothing is covered: the user chip stays visible, a path that ends on that side stays whole, and XP still flies to a chip the user can see. Pages lay out by the content width (2.3), so beside the panel they use their one-column order.
- **Desktop, 1024 to 1279 px:** the panel overlays the page, with no scrim.
- On desktop the panel never traps focus: the page beside it stays usable.
- **Phone:** a full-screen sheet, which traps focus.
- Inside, top to bottom: header («دليل», the line «دليلك إلى وظيفتك», the buttons «محادثة جديدة» and «إغلاق») · the mode line · the thread · the tool status line (only while working) · the suggestion chips for the current page (5.8) · the composer with the placeholder «اسأل دليل أو اطلب منه أن يفتح لك صفحة…» and one round button that is «إرسال» or, while a reply or an action is on its way, «إيقاف».

**Mode line** (one quiet line under the header; exactly one of the two shows).
- No key is configured, or the provider failed its last call within the past 60 s (5.5 rule 11): «وضع محلي: دليل يعمل دون اتصال.» Everything still works (5.7).
- A key is configured and answering: «متصل: رسائلك وملخص ملفك تُرسل إلى مزوّد نموذج الذكاء الاصطناعي للرد فقط.»

**Thread content.** The user's bubbles; «دليل»'s text replies (plain text, no headings or lists); and **cards drawn by the app from tool results**, never from the model's text: job card (title, company with «جهة تجريبية», city, match), course card (title, star, hours, XP, match gain), gap card (have / missing), application card (job, number, status), next-step card (label and button). Cards are clickable and open their page. Replies that offer an action carry **confirmation chips** (for example «ابدأ الدورة» / «ليس الآن»).

**States.**
- First open after onboarding: one message from «دليل», who does not introduce itself again (the same character has just run the onboarding): «أهلاً من جديد يا {name}. مسارك نحو «{target}» جاهز، وأنا معك في كل خطوة. اسألني عن مسارك أو الدورات أو الوظائف، أو قل لي: ماذا أفعل الآن؟», and the page chips.
- Thinking: «دليل»'s glyph is alive beside a status line. Before any tool runs it reads «دليل يفكّر…»; while a tool runs it shows that tool's line (5.3); after 4 s the elapsed seconds appear beside it.
- Answering: the reply comes into focus block by block; cards rise after the text.
- Acting on the page: the page beside the panel changes while the status line says what is happening. On phones the sheet closes while the action runs, so the page is visible, and opens again with the reply when the action is finished.
- One thing at a time: while a reply or an action is in flight, the send button and every chip are disabled (5.5 rule 13).
- After a reload that interrupted an application «دليل» was filling: on the next open «دليل» adds «لم يكتمل التقديم. اطلبه مرة أخرى إن أحببت.» (7.4).
- Error (both the provider and the local brain failed, which only a bug can cause): «تعذّر الرد الآن. جرّب مرة أخرى.» with «أعد المحاولة».
- Empty thread after «محادثة جديدة»: the first-open message again, preceded by the toast «بدأنا محادثة جديدة.»

**Interactions.**
- `Enter` sends, `Shift+Enter` makes a new line. Send is disabled for empty or whitespace-only text. Only the first 500 characters of a message are sent.
- A chip does not send free text to a model. It carries its intent and its ids, and the router executes it in code (5.5 rule 1), the same way in every mode.
- The thread is the same on every page and is saved per account (the last 40 messages).
- «إيقاف» stops a reply and keeps what has arrived. While «دليل» is filling an application it is the same control as the sheet's «إيقاف»: it cancels the application during steps 1-4 (7.4).
- Closing the panel never cancels an action already under way.

**XP events.** None. Talking to «دليل» pays nothing (P2). Actions it performs on request pay exactly what the same action pays by hand.

**Motion moments.** Tier 1: `panel-open` (the panel arrives from its edge; this is "the chat-opening transition" in Dalilak's own form), `composer-expand` (the composer opens from a pill into a card when focused), `bubble-pop` (the sent message pops out of the composer), `thinking-glyph` («دليل»'s glyph is alive while it works and settles when the first words arrive), `status-roll` (tool lines roll one into the next), `answer-focus` (the reply comes into focus), `send-stop-morph` (the round button changes between send and stop), `page-handoff` (when a tool opens a page, the page changes first and the reply follows, so the user sees the site respond to the chat). Tier 2: `card-rise`.

**Test ids.** `advisor-panel` (`data-state` = open / closed) · `advisor-close` · `advisor-clear` · `advisor-mode` (`data-state` = local / online) · `advisor-thread` · `advisor-message-last` (the newest reply from «دليل») · `advisor-status` · `advisor-input` · `advisor-send` · `advisor-stop` · `advisor-chip-{slug}` (page chips; the slugs are in 5.8, so an id means the same chip whichever chips are shown) · `advisor-confirm-yes` · `advisor-confirm-no` · `advisor-card-job-{jobId}` · `advisor-card-course-{courseId}` · `advisor-card-application-{jobId}` · `advisor-card-next-step` · `advisor-retry`.

### 3.15 Global overlays

One queue serves the whole app.

- **What is in it.** Every XP event and every badge is saved with a flag `announced: false`. The queue is rebuilt from those entries on every load, and an entry is marked announced when its toast, its level-up or its celebration beat has shown. A reload therefore never loses news and never repeats it.
- **Hold rule.** Nothing from the queue appears on `/` or `/welcome`, or while a show is running (the path reveal, the CV analysis show, the celebration, «دليل» filling the apply sheet, the full form of `map-open`). It is released on the next app-shell page or when the show ends. Several XP gains waiting together are merged into one toast with the sum. The celebration (3.11) absorbs the XP, level, badge and rank news of its own course.
- **Nothing waits for anything else.** Toasts stack, newest on top, at most three visible, each on its own timer. The level-up opens 0.6 s after its XP toast (when `xp-fly` lands) and stays beside the toasts. Toasts and the level-up survive a page change.
- **Nothing here swallows a click.** The level-up has no scrim: a click outside it closes it **and** is delivered to whatever was clicked. A presenter never has to dismiss anything to go on.
- **The daily reward** is the one overlay that blocks. It shows alone, on a page load, before anything else in the queue.

| Overlay | Blocks the page? | Copy | Leaves |
|---|---|---|---|
| **XP toast** | no | «+100 XP» · the reason (below) · when the weekly rank improved: «صعدت إلى المركز 18 هذا الأسبوع» (with the one exception in 8.7) | after 3.5 s |
| **Level-up** | no | «مستوى جديد» · «المستوى 2» · «مستكشف» · «بقي 170 XP للمستوى 3» · button «متابعة». At level 7: «بلغت القمة: أسطورة». A gain that crosses two levels shows the final level only | on the button, on any click outside (which also reaches its target), on `Esc`, or by itself after 4 s |
| **Badge toast** | no | «شارة جديدة» · the badge name · its description · the link «عرض الشارات» | after 5 s |
| **Daily reward** | yes | «مكافأة اليوم» · «اليوم 3 على التوالي» · a strip of seven days with their rewards · button «استلم +60 XP» · «عد غداً لتأخذ +80 XP». After a broken streak: «أهلاً بعودتك. نبدأ سلسلة جديدة.» | on the button (the XP is paid when it is pressed; if the page is closed first, it is offered again on the next load that day) |

**XP toast reasons.** `onboarding_completed`: «أكملت التعارف» · `target_set`: «اخترت هدفك» · the two merged: «التعارف واختيار الهدف» · `cv_analysed`: «حلّلت سيرتك» · `course_completed`: «أكملت دورة» · `job_applied`: «تقديم مدروس» · `daily_reward`: «مكافأة يومية».

**Motion moments.** `xp-fly` (the gained XP travels from the toast to the user chip, whose number counts up and whose bar fills) · `level-reveal` (the old title gives way to the new one) · `badge-unlock` (the badge opens from its locked form) · `daily-claim` (the day's cell is taken and the streak number ticks up) · `streak-tick` (the streak icon in the user chip reacts when the number changes).

**Phone.** Toasts appear at the top under the top bar; level-up and daily reward are centred sheets.

**Test ids.** `toast-xp` (`data-value` = XP shown) · `toast-xp-rank` · `overlay-levelup` (`data-value` = new level) · `overlay-levelup-close` · `toast-badge-{badgeId}` · `overlay-daily` (`data-value` = XP offered) · `overlay-daily-claim`.

---

## 4. The onboarding conversation and the path reveal

### 4.1 Shape of the conversation

- «دليل» opens with two messages: «أهلاً {name}، أنا دليل، دليلك إلى وظيفتك. سأكون معك من أول خطوة إلى آخرها.» then «أسألك ستة أسئلة قصيرة لأرسم لك مساراً يناسبك أنت. نبدأ: في أي مدينة أنت الآن؟»
- There are **six questions, always in this order**: city → education → major → experience → interest → priority. The name is already known from sign-in.
- Every turn of «دليل» after an answer has two parts: an **acknowledgement** of what the user just said (one sentence that repeats the answer back, 4.4), then the **next question** with its chips.
- A question whose answer the user already gave in an earlier free-text message is skipped (4.3).
- After the sixth answer «دليل» closes: «شكراً يا {name}، اكتملت الصورة. لحظات وأرسم لك مسارك.» and the path reveal starts by itself.
- The questions, their order, the chips and the acknowledgement bank are a fixed script that runs in the browser. The AI model, when a key is present, helps in exactly one place and writes none of the words (4.5). This is what makes the conversation instant and identical on every run.

### 4.2 The six questions and their chips

| # | Question id | «دليل» asks | Chips (`option id` label) |
|---|---|---|---|
| 1 | `city` | «في أي مدينة أنت الآن؟» | `riyadh` «الرياض» · `jeddah` «جدة» · `dammam` «الدمام» · `makkah` «مكة المكرمة» · `madinah` «المدينة المنورة» · `other` «مدينة أخرى» |
| 2 | `education` | «ما آخر مؤهل دراسي حصلت عليه؟» | `secondary` «ثانوي» · `diploma` «دبلوم» · `bachelor` «بكالوريوس» · `postgrad` «ماجستير أو أعلى» · `student` «ما زلت أدرس» |
| 3 | `major` | «وما تخصصك؟» (after `secondary`: «وما المجال الأقرب إليك دراسةً أو تدريباً؟») | `cs` «حاسب وتقنية معلومات» · `mis` «نظم معلومات إدارية» · `business` «إدارة أعمال» · `finance` «مالية ومحاسبة» · `marketing` «تسويق» · `hr` «موارد بشرية» · `design` «تصميم وإعلام» · `engineering` «هندسة» · `science` «علوم ورياضيات» · `other` «تخصص آخر» |
| 4 | `experience` | «كم سنة خبرة عملية لديك؟» | `none` «بدون خبرة بعد» · `under1` «أقل من سنة» · `1to3` «من سنة إلى 3 سنوات» · `over3` «أكثر من 3 سنوات» |
| 5 | `interest` | «أي نوع من العمل يشدّك أكثر؟» | `data` «الأرقام والبيانات» · `software` «بناء المواقع والتطبيقات» · `design` «التصميم والإبداع» · `marketing` «التسويق والمحتوى» · `business` «تنظيم الأعمال والمشاريع» · `hr` «العمل مع الناس وتطويرهم» · `unsure` «لم أحدّد بعد» |
| 6 | `priority` | «وأخيراً، ما أولويتك الآن؟» | `first-job` «أول وظيفة بأسرع وقت» · `switch` «أغيّر مجالي» · `grow` «أتطوّر في مجالي» · `explore` «أستكشف خياراتي» |

Tapping a chip shows its label as the user's bubble and **records its option id directly: a chip is never parsed as text** (so «أقل من سنة» cannot be misread as one year). Questions 1 and 6 are worded with no verb addressed to the user, and the words in the other four («حصلت», «لديك», «يشدّك») are written the same for a man and a woman, so all six read correctly whoever answers. One exception to the chip rule: «مدينة أخرى» does not send; it puts the cursor in the composer with the placeholder «اكتب اسم مدينتك». A chip answer for `interest` records one interest; a second interest can only come from free text («أحب البيانات والتسويق»).

### 4.3 How a free-text answer is understood

**Normalisation** (applied to a copy of the text before any matching, here and wherever this section is cited): Unicode NFKC; the direction marks U+200C-U+200F and U+202A-U+202E, diacritics and the stretching mark removed; ٠-٩ → 0-9; أ إ آ → ا; ى → ي; ة → ه; Latin lower-cased. Keywords match whole words, with or without «ال» and with or without a one-letter prefix (و، ف، ب، ل، ك): «بالرياض» matches «الرياض», «لطلباتي» matches «طلباتي».

**Order of reading a typed message.** The steps run in this order and each has one test, so no two rules compete.
1. **Question.** If it starts with a question word (لماذا، ليش، كيف، هل، كم، ماذا، وش) or ends with «؟» or «?», it is a question to «دليل» (4.5), not an answer. («من» and «ما» are not in this list: «من الرياض» and «ما عندي خبرة» are answers.)
2. **Greeting and thanks.** Greeting and thanks words are set aside. If nothing else is left, the message is a greeting or thanks (4.5). «السلام عليكم، أنا من الرياض» carries on as «أنا من الرياض».
3. **The pending question.** The rest is read against the pending question's keywords; the words that matched are used up.
4. **The other unanswered questions.** What is left is read against them, so «أنا من جدة وتخصصي تسويق وما عندي خبرة» fills city, major and experience at once. Two limits. `interest` and `priority` are filled ahead of their turn only when the message carries a wish word (أحب، أهوى، أميل، أهتم، يشدّني، أريد، أبغى، أبي، هدفي، طموحي), because their keywords overlap with majors («تسويق» as a major is not yet an interest). `experience` is filled ahead of its turn only when the message contains «خبرة» or a year word (سنة، سنتين، سنوات، سنين), so «وما عندي خبرة» fills it, while «بكالوريوس 2024» and «ما عندي تخصص» do not.
5. **Could not be mapped.** If nothing was filled, the message could not be mapped (4.5). There is no "off-topic" class and no "rude" class: a keyword table cannot tell them apart, so every unrecognised message that is not a question is treated the same way.

When a message fills more than the pending question, «دليل» confirms the extra ones in its acknowledgement («وسجّلت أيضاً: تخصصك تسويق، وبدون خبرة بعد.») and skips those questions.

**When two values of one question match** («طالب ماجستير», «إدارة مالية»): the keyword that starts earliest in the message wins; at the same position the longer keyword wins. `interest` is the exception: it keeps up to two, in the order they appear.

| Question | Keywords → value |
|---|---|
| `city` | الرياض، رياض، riyadh → `riyadh` · جدة، جده، jeddah → `jeddah` · الدمام، دمام، الخبر، الظهران، dammam، khobar → `dammam` (the profile keeps the word the user typed) · مكة → `makkah` · المدينة المنورة، المدينه → `madinah` · another known city → `other`, shown by its name: الطائف، أبها، خميس مشيط، تبوك، بريدة، عنيزة، حائل، جازان، نجران، الباحة، سكاكا، عرعر، ينبع، الجبيل، الأحساء، الهفوف، القطيف، الخرج، حفر الباطن · a place not in this list is "not mapped" the first time, and the second time is accepted as typed (value `other`) if it is 2-30 letters |
| `education` | ثانوي، ثانوية → `secondary` · دبلوم → `diploma` · بكالوريوس، بكالريوس، جامعي، جامعة، bachelor → `bachelor` · ماجستير، دكتوراه، دراسات عليا، master → `postgrad` · طالب، طالبة، أدرس، ما زلت → `student` («خريج» is not a keyword here: «خريج ثانوي» is `secondary`) |
| `major` | حاسب، حاسوب، تقنية معلومات، هندسة برمجيات، برمجة، أمن سيبراني، ذكاء اصطناعي، cs، it → `cs` · نظم معلومات، mis → `mis` · إدارة أعمال، إدارة → `business` · محاسبة، مالية، تمويل، اقتصاد → `finance` · تسويق → `marketing` · موارد بشرية، hr → `hr` · تصميم، جرافيك، إعلام، فنون → `design` · هندسة (when no `cs` keyword matched) → `engineering` · رياضيات، إحصاء، فيزياء، كيمياء، أحياء، علوم → `science` · a major not in this list is "not mapped" the first time, and the second time is accepted as typed (value `other`, the typed words kept as its label) if it is 2-30 letters |
| `experience` | tested in this order: «أقل من سنة»، نص سنة، نصف سنة → `under1` · a month or training word (أشهر، شهر، تدريب، تعاوني) → `under1`, whatever number is beside it («6 أشهر» is `under1`) · «أكثر من N» or «فوق N» with N of 3 or more → `over3` · بدون، ما عندي، لا يوجد، حديث تخرج، خريج جديد → `none` · otherwise a number, in digits or words (سنة، سنتين، ثلاث …): 0 → `none`; 1 to 3 → `1to3`; above 3 → `over3`. As the pending question a bare number from 0 to 50 is accepted |
| `interest` | بيانات، أرقام، تحليل، إحصاء → `data` · برمجة، تطبيقات، مواقع، تطوير → `software` · تصميم، إبداع، رسم → `design` · تسويق، محتوى، إعلانات، كتابة → `marketing` · مشاريع، أعمال، إدارة، تنظيم، مالية → `business` · الناس، توظيف، موارد بشرية، تدريب → `hr` · لا أعرف، ما أدري، مو متأكد → `unsure`. Up to two interests are kept, in the order they appear |
| `priority` | أول وظيفة، أتوظف، وظيفة بسرعة → `first-job` · أغيّر، تغيير مجال، مجال جديد → `switch` · أتطوّر، ترقية، أتقدّم في مجالي → `grow` · أستكشف، أشوف الخيارات، لا أعرف → `explore` |

**Neutral values.** For the pending question, «لا أعرف» / «ما أدري» / «تخطَّ» is itself an answer: the question takes its neutral value and the conversation moves on. The neutral values, and what they print wherever the answer is shown (the slot card, the profile, the apply sheet):

| Question | Neutral value | Prints as |
|---|---|---|
| `city` | none | «غير محدّدة» |
| `education` | unknown | «غير محدّد» |
| `major` | `other` | the typed words, or «تخصص آخر» when none were kept |
| `experience` | `none` | «بدون خبرة بعد» |
| `interest` | `unsure` | «لم أحدّد بعد» |
| `priority` | `explore` | «أستكشف خياراتي» |

### 4.4 Acknowledgements

Each acknowledgement names the answer. Where three general variants are listed, the variant is picked by `(characters in the user's name, spaces not counted + question number) mod 3`: remainder 0 → variant 1, 1 → variant 2, 2 → variant 3. A given user therefore always sees the same one (QA can assert it; «خالد», four letters, gets city variant 3, education variant 1, major variant 2). The special cases listed under a question take precedence over the three variants. Where variants are per option, the option decides.

**City**
1. «{city}، حيّاك الله. سأقدّم لك فرصها أولاً.»
2. «جميل، {city}. سجّلتها لأرتّب لك الوظائف القريبة منك.»
3. «تمام، {city}. وهناك أيضاً فرص عن بُعد إن أحببت.»
- A city with no jobs in the data: «{city}، حيّاك الله. الفرص القريبة منك قليلة في البيانات التجريبية، فسأضيف لك الوظائف عن بُعد.»

**Education**
1. «{education}، ممتاز. أساس نبني عليه.»
2. «{education}، تمام. والمهم الآن ما تضيفه فوقه من مهارات.»
3. «جميل، سجّلت: {education}.»
- `student`: «على مقاعد الدراسة؟ هذا أفضل وقت لبدء مسارك.»

**Major**
1. «{major}، تخصص يفتح أكثر من باب. سأريك أقربها إليك.»
2. «جميل، {major}. فيه مهارات كثيرة تُحسب لك من الآن.»
3. «{major}، تمام. سأربطه بالوظائف الأقرب له.»
- `other`: «تمام. لن يقيّدنا التخصص، وسأعتمد أكثر على ما تحب.»

**Experience** (per option)
- `none`: «ولا يهمّك، كلنا بدأنا من هنا. سأختار لك وظائف تناسب البدايات.»
- `under1`: «بداية طيبة، وكل شهر خبرة يُحسب لك.»
- `1to3`: «خبرة جيدة. سأبحث لك عن خطوة أعلى، لا عن بداية جديدة.»
- `over3`: «ما شاء الله، خبرة تستحق مساراً يليق بها.»

**Interest** (per option)
- `data`: «الأرقام والبيانات، اختيار جميل. من يقرأ الأرقام يُسمع رأيه.»
- `software`: «بناء المواقع والتطبيقات، ممتاز. أن تبني شيئاً يستخدمه الناس متعة.»
- `design`: «التصميم والإبداع، جميل. العين التي ترى التفاصيل مطلوبة.»
- `marketing`: «التسويق والمحتوى، تمام. الكلمة المناسبة تفتح أبواباً.»
- `business`: «تنظيم الأعمال والمشاريع، ممتاز. كل فريق يحتاج من يرتّب الطريق.»
- `hr`: «العمل مع الناس وتطويرهم، جميل. هذا أثر يبقى.»
- `unsure`: «طبيعي جداً. سأعتمد على تخصصك وخبرتك، وتغيير الاتجاه متاح متى شئت.»

**Priority** (per option)
- `first-job`: «أول وظيفة، أولوية واضحة. سأختار لك أقصر طريق إليها.»
- `switch`: «تغيير المجال شجاعة. سأرسم لك جسراً من مهاراتك الحالية.»
- `grow`: «التطوّر في مجالك قرار ناضج. سنبني على ما عندك.»
- `explore`: «الاستكشاف بداية ذكية. سأريك ثلاثة اتجاهات والاختيار لك.»

### 4.5 Every other message, and how fast «دليل» answers

«دليل» answers **every** message, at once, and always ends by returning to the pending question with its chips.

| The user sends | «دليل» replies (then repeats the pending question) |
|---|---|
| A greeting alone («السلام عليكم»، «هلا»، «مرحبا») | «وعليكم السلام، حيّاك الله.» / «هلا بك.» |
| Thanks alone («شكراً»، «يعطيك العافية») | «العفو.» |
| «من أنت؟» / «هل أنت ذكاء اصطناعي؟» | «أنا دليل، دليلك إلى وظيفتك. أسألك الآن لأرسم مسارك، ثم أبقى معك في كل خطوة.» |
| «لماذا تسأل؟» / «ماذا ستفعل بإجاباتي؟» | «أسأل لأختار لك من 20 وظيفة ما يناسب مدينتك وتخصصك وخبرتك وما تحب. وإجاباتك تُحفظ في متصفحك.» |
| «كم سؤالاً بقي؟» | «بقي {n} فقط.» |
| Any other question (step 1 of 4.3), a salary or a real-company question included | «سؤال لطيف، نعود إليه بعد أن نرسم مسارك.» |
| A message that could not be mapped (step 5 of 4.3), first time | «لم ألتقطها جيداً. اختر من الخيارات أو اكتبها بطريقة أخرى.» |
| The same again, second time | `city` and `major`: the text is accepted as typed (4.3) and gets that question's own acknowledgement. The other four questions take their neutral value: «تمام، سأعتبرها «{neutral value label}» ونكمل.» Either way the conversation moves on: it never loops |
| Empty or spaces only | cannot be sent |
| More than 300 characters | only the first 300 are read |

The rows «من أنت», «لماذا تسأل» and «كم سؤالاً بقي» match by their keywords, with or without a question mark.

**Speed.** Every reply comes from this section and the bank of 4.4: «دليل»'s glyph "thinks" for 350-600 ms, then the reply comes into focus. No network is involved.

**Where the AI model helps, when a key is present: one place.** A typed answer that reached step 5 (the keywords could not map it) is given to the model to classify into that question's option ids, with a 2.5 s limit. On a timeout, an error, or an id outside the list, the behaviour above is used, silently. The model writes none of the conversation and answers no question during onboarding: a free answer there could name a salary or a company with nothing in code to check it, and a network wait would break the promise that «دليل» answers at once.

### 4.6 How the answers choose the target job and two alternatives

Every job gets a **fit score** out of 100. It is used to choose and to order; it is never shown as a number (P5).

| Term | Points | Rule |
|---|---|---|
| Interest | 40 / 30 / 0 | the job's field is the user's first interest: 40; the second interest: 30; otherwise 0 (`unsure`: 0 for all) |
| Major | 25 / 12 / 0 | the job's field is the major's primary field: 25; its secondary field: 12 (table below) |
| Experience | 15 / 7 / 0 | experience band = the job's band: 15; one band apart: 7; two apart: 0. Bands: `none` and `under1` → entry; `1to3` → junior; `over3` → mid |
| City | 10 / 6 / 0 | the job is in the user's city: 10; the job is «عن بُعد»: 6; otherwise 0 |
| Priority | 10 / 0 | `first-job`: 10 if the job is entry level · `switch`: 10 if the job's field is one of the interests and is not the major's primary field · `grow`: 10 if the job's field is the major's primary field · `explore`: 0 |

**Major → fields.** `cs`: software, then data · `mis`: data, then business · `business`: business, then hr · `finance`: business, then data · `marketing`: marketing, then design · `hr`: hr, then business · `design`: design, then marketing · `engineering`: data, then business · `science`: data, then software · `other`: none.

**Education gate.** With `secondary`, `diploma` or `student`, mid-level jobs are left out of the ranking. Education has no other effect on the score.

**Ranking.** Highest score first. Ties: higher interest term, then the lower experience band, then the order of the jobs in the data file.

- **Recommended** = rank 1.
- **Alternative 1** = rank 2.
- **Alternative 2** = the highest-ranked remaining job whose field differs from the recommended job's field (a genuinely different direction).

**Reasons shown on the reveal** («لماذا هذا المسار؟»): the first three of these that scored for the recommended job, in this order:
1. Interest: «يوافق اهتمامك: {interest label}»
2. Major: primary «قريب من تخصصك: {major label}» · secondary «يستفيد من تخصصك: {major label}»
3. Experience (same band): entry «مناسب للبدايات» · junior «يناسب خبرتك: من سنة إلى 3 سنوات» · mid «يناسب خبرتك: أكثر من 3 سنوات»
4. City: «في مدينتك: {city}» · remote «عن بُعد: يناسب أي مدينة»
5. Priority: `first-job` «طريق قصير إلى أول وظيفة» · `switch` «انتقال من مجالك إلى ما تحب» · `grow` «تطوّر داخل مجالك»

If nothing scored: one reason, «بداية مناسبة لاستكشاف خياراتك».

**Worked example (the demo persona).** Answers: الرياض · بكالوريوس · نظم معلومات إدارية · بدون خبرة بعد · الأرقام والبيانات · أول وظيفة بأسرع وقت.

| Job | Interest | Major | Experience | City | Priority | Score |
|---|---|---|---|---|---|---|
| محلل بيانات (الرياض, entry, data) | 40 | 25 | 15 | 10 | 10 | **100** |
| أخصائي تقارير وبيانات (جدة, entry, data) | 40 | 25 | 15 | 0 | 10 | 90 |
| محلل ذكاء الأعمال (الرياض, junior, data) | 40 | 25 | 7 | 10 | 0 | 82 |
| عالِم بيانات مبتدئ (عن بُعد, junior, data) | 40 | 25 | 7 | 6 | 0 | 78 |
| محلل أعمال (الرياض, entry, business) | 0 | 12 | 15 | 10 | 10 | 47 |

Recommended: «محلل بيانات». Alternative 1: «أخصائي تقارير وبيانات». Alternative 2 (best job outside the data field): «محلل أعمال». Reasons: «يوافق اهتمامك: الأرقام والبيانات» · «قريب من تخصصك: نظم معلومات إدارية» · «مناسب للبدايات».

### 4.7 The path-reveal sequence

Six steps, **7.8 s** in total. The scoring itself takes no time; the sequence presents what was computed, and every step shows the user's real data (their answers, the real 20 jobs, the three chosen).

| # | Motion moment | Duration | Status line | What the stage shows |
|---|---|---|---|---|
| 1 | `answers-gather` | 1.2 s | «أجمع إجاباتك يا {name}…» | the six answers from «ملفك يتكوّن» come together in the centre |
| 2 | `jobs-sweep` | 1.5 s | «أقارن ملفك مع 20 وظيفة…» | twenty job tiles pass by; the ones that fit the answers stay stronger |
| 3 | `skills-map` | 1.5 s | «أراجع 38 مهارة في 7 مجالات…» | the skill landscape appears and the seven fields light in turn |
| 4 | `narrow-to-three` | 1.3 s | «أختار أنسب ثلاث وظائف لك…» | the twenty reduce to three |
| 5 | `path-draw` | 1.5 s | «أرسم مسارك خطوة بخطوة…» | a line draws from «البداية» through the recommended job's stages, each named as it is reached, to a trophy (eight stages in the demo) |
| 6 | `reveal-landing` | 0.8 s | «مسارك جاهز.» | the job title lands on the trophy end of the drawn path; the path stays on screen and the rest of the result forms around it |

1.2 + 1.5 + 1.5 + 1.3 + 1.5 + 0.8 = 7.8 s. Space or `Esc` jumps to the result. All six moments are tier 1. With reduced motion the result opens directly (the one global rule).

**What the reveal shows** is the result layout of 3.3: the recommended job with its reasons, the path strip (the eight named stages and «8 مراحل · 74 ساعة تعلّم» for «محلل بيانات»), the primary button «ابدأ هذا المسار», and the two alternatives with their own counts. No match percentage is shown here: nothing is known about the user's skills until the CV is read, and the line under the strip says so.

---

## 5. The advisor after onboarding

### 5.1 Persona and voice

«دليل» ("guide") is the same character that ran the onboarding. It is an advisor inside «دليلك» (the product is "your guide", and «دليل» is the guide's name: he introduces himself as «أنا دليل، دليلك إلى وظيفتك.»), not a general assistant.

- **Language.** Modern Standard Arabic that sounds Saudi and friendly. The Gulf touch is light and comes from a short list of expressions: «أبشر» · «حيّاك الله» · «يعطيك العافية» · «تمام» · «ولا يهمّك» · «خلّنا» · «ما شاء الله» · «للأمانة». It understands common Saudi dialect and simple English requests («وش أسوي الحين؟», «ودّني لطلباتي», "open my path") and always answers in Arabic. The word lists that make this true without a key are in 5.7; with a key the model covers the rest.
- **Length.** One to three sentences, under 60 words. One idea and at most one suggested next step per reply. Plain text: no headings, no lists, no emoji.
- **Specific.** It answers with the user's own numbers (match, XP, rank, hours) rather than general advice.
- **Warm, not flattering.** It uses the user's name in greetings and at milestones, not in every message. It never says "as an AI model".
- **Honest.** The first time jobs or companies come up in a conversation, whenever it applies on the user's behalf, and whenever it is asked whether something is real, it says the data is «بيانات تجريبية». It says "I do not know" when it does not.
- **It never:** names a real employer or training provider · gives statistics, salaries or market claims · promises a job or an interview · says an application reached a real party · completes a course, or grants XP, stars or badges · gives medical, legal or financial advice · asks for something the snapshot already holds. Where code can check these, it does (5.5): the answers to "is this real?" and to salary questions run before any model is called, and digits and money words in a model's reply are checked against the data.

### 5.2 What it knows (the user snapshot)

The browser builds a snapshot from the saved state and sends it with every message (the server keeps nothing). It contains:

- Identity: name, avatar id, and the six onboarding answers.
- Game: total XP, level number and title, XP to the next level, streak, unlocked badge ids, weekly rank and weekly XP.
- Skills: every skill with a star (id, stars, source: CV or course, and the evidence sentence).
- Target: the target job id, the match, the roadmap stages with their states, the current stage's course.
- Courses: started (with lessons ticked) and completed ids.
- Applications: job id, number, status, match when applied.
- Flags: whether a CV has been analysed, whether it was skipped.
- Where the user is: the current route and the id on screen (the job on `/jobs/[id]`, the course on `/learn/[id]`). "This job" and "this course" resolve from here.
- The last 12 messages of the thread.

The static data (jobs, courses, skills, sample leaderboard users) is available to the tools on the server. With a key configured, the snapshot travels to the model provider with each message that reaches a model; the product says so where the user can see it (3.13, 3.14).

### 5.3 The tool list

| Tool | Parameters | Returns | What the user sees | Status line while it runs |
|---|---|---|---|---|
| `navigate` | `screen`: `path` · `skills` · `cv` · `jobs` · `job` · `applications` · `learn` · `course` · `leaderboard` · `profile`; `params`: `job_id` (for `job`), `course_id` (for `course`), `skill_id` (for `skills`), `q`, `city`, `field`, `skill` (for `jobs`), `tab` (for `learn`), `apply` (for `job`) | the opened route | the page opens | «أفتح الصفحة…» |
| `search_jobs` | `query?`, `city?`, `field?`, `skill?`, `min_match?`, `limit` (default 5), `show` (default **false**) | jobs ranked by match: id, title, company, city, field, match, missing skills | job cards in the chat; with `show`, `/jobs` also opens with those filters | «أبحث في الوظائف…» |
| `get_job_gap` | `job_id` | match; skills held; skills missing (have, need); for each missing star the course, its hours, XP, match gain and `match_after` | a gap card in the chat | «أقارن مهاراتك بالمتطلبات…» |
| `explain_match` | `job_id` | the five skills with required stars, stars held and points earned out of 20; the total; `met_points` (the sum for the fully met skills); `next_course` {id, `match_after`} | nothing moves | «أحسب المطابقة…» |
| `recommend_next_step` | none | the next step of 2.8: rule number, label, route; for a course its hours, lessons, XP, the match now and `match_after`; the badges that step would unlock | a next-step card in the chat | «أراجع مسارك…» |
| `list_courses` | `skill?`, `field?`, `status?`, `on_path?`, `max_hours?`, `limit` (default 5) | courses: id, title, skill, star, hours, XP, state, match gain, `match_after` | course cards in the chat | «أراجع الدورات…» |
| `get_course` | `course_id` | title, description, lessons, skill, star, hours, XP, state, lock reason, match gain, `match_after` | a course card in the chat | «أراجع الدورات…» |
| `start_course` | `course_id` | the new state with hours, lessons, XP and `match_after`; or why it cannot start: `locked` with its reason, `credited`, `completed` | the course page opens in the started state | «أبدأ الدورة…» |
| `apply_to_job` | `job_id` | the application: number, match when applied, XP paid; or `already_applied` with the status; or `low_match` with the match | the job page opens, the apply sheet opens, the fields write themselves, the request is sent (7.4) | «أفتح نموذج التقديم…» → «أكتب بياناتك…» → «أرسل الطلب…» |
| `list_applications` | none | applications: job, number, status, match then and now | application cards in the chat | «أراجع طلباتك…» |
| `set_target_job` | `job_id` | the new target, its match, the remaining stages, the first remaining course | the toast «هدفك الآن: {title}»; `/path` opens with the new path | «أعيد رسم مسارك…» |
| `get_leaderboard` | `plus_xp?` | rank, weekly XP, the XP gap to the place above, the top three, and with `plus_xp` the rank that many more XP would give | nothing moves | «أراجع الترتيب…» |
| `list_badges` | none | each badge: unlocked or not, its hint, progress toward it | nothing moves | «أراجع شاراتك…» |

Thirteen tools. Every tool that returns a match gain also returns `match_after`, so no reply has to compute a percentage. `apply_to_job` takes no note: the application note is always the template of 7.4, built in the browser from the user's own data, so a model can never write words in the user's name. There is no separate tool for the CV page: `navigate(screen: "cv")` opens it.

**Contract.** The server validates each call and answers; anything that touches the screen or the state is returned to the browser as an event (`navigate`, `start_course`, `apply`, `set_target`), and one dispatcher in the browser applies it. The browser is the only writer of user state. The server answers `apply_to_job` from the snapshot (the number, the match, the XP that will be paid), but the application exists only when the browser has run the visible steps of 7.4, and the reply text is held until then (5.5 rule 12).

### 5.4 Which tools change state, and what counts as the user asking

Three tools change the user's state: **`start_course`**, **`apply_to_job`**, **`set_target_job`**. They run only when the current user message asks for that action. The server decides that in code, in the router (5.7); a model never decides it. A message asks when it is one of these two things.

**1. A button or chip that carries the action and the id.** The confirmation chips («ابدأ الدورة», «قدّم على هذه», «قدّم على أي حال», «اجعلها هدفي»); the page chips «قدّم لي على هذه الوظيفة», «ابدأ هذه الدورة» and «اجعلها هدفي»; and the button «دع دليل يقدّم عنك» (3.4, 3.6, 3.8). Pressing one is the user asking.

**2. A typed request.** After the normalisation of 4.3, matching **whole words only**:

| Action | The message must contain | Never a request |
|---|---|---|
| Apply | an apply verb **and** a job reference, **and** no course word. Apply verbs: the imperative قدّم · قدّمي · قدّملي (alone or with لي، عني) · سجّلني · apply; or a wish word (أريد، أبغى، أبي، ودّي، ممكن) followed within three words by أقدّم، تقدّم، تقديم or التقديم. Job references: وظيفة · الوظيفة · عليها · a job title · «هذه» or «هذي» while a job page is open. Course words: دورة · الدورة · دورات | «تقديم» on its own; «قدّمت»، «أتقدّم»، «متقدّم»، «التقديم المدروس». So «قدّمت على وظيفة أمس», «اشرح لي التقديم المدروس», «ابدأ دورة العرض والتقديم» and «أبغى أتقدّم في الترتيب» send nothing |
| Start a course | ابدأ · ابدئي · سجّلني في الدورة · start, **and** a course title, a skill name (meaning the course for the user's next star in that skill), or «هذه» / «الدورة» while a course page is open | «من أين أبدأ؟»، «أي دورة أبدأ بها؟» (questions) |
| Set the target | اجعل · اجعلها · غيّر, **and** «هدفي», **and** a job title, or «هذه» / «ها» while a job page is open | «لماذا هذا هدفي؟» (a question) |

A message that opens with an information question word (لماذا، ليش، كيف، متى، أين، وين، أي، ماذا، ما، وش، كم، هل) is never a request, whatever words follow: «كيف أقدّم على وظيفة؟» and «من أين أبدأ؟» are questions. A polite request is a request: «ممكن تقدّم لي على هذه الوظيفة؟». A job title in a message is matched whole, with or without «ال»; when two titles match, the longer one is meant.

**In a model turn the three tools never execute.** A message that asks, in the sense above, was already handled by the router before any model was called (5.5 rule 1). So when a model calls one of them, it has understood a request the word lists did not: the call becomes an offer with confirmation chips («أقدّم لك على «{title}»؟» with «قدّم على هذه» / «ليس الآن»), and one tap confirms it.

`navigate` and `search_jobs` with `show` move the screen but change nothing the user owns; they run when the user asks to open or see something (5.5 rule 7). A plain question («لماذا مطابقتي 70%؟») is answered in the chat without moving the page.

There is **no tool** that completes a course, ticks a lesson, grants XP, stars or badges, edits the profile, writes an application note, or deletes anything.

### 5.5 Rules enforced in server code

1. **The router runs first, in every mode.** Every message goes through the router of 5.7 in server code before any provider is called. Rows 1-8 (both refusals, buttons and chips, apply, start, set target, job search, open a page) and every page chip of 5.8 are executed by the router and answered from the templates of 5.9, with or without a key. A provider is called only for a typed message that reaches rows 9-21. Everything the demo script asks of «دليل» is therefore decided in code, and costs no network wait.
2. **Ids are real.** Every `job_id`, `course_id` and `skill_id` in a tool call must exist in the data; an unknown id fails the call and «دليل» says it could not find it. The model cannot invent a job, a company or a course.
3. **Consent for state changes** as in 5.4; at most one state-changing call per user message.
4. **One job, one course.** A state-changing call needs exactly one id: the job or course on screen, or the only one whose full title (for a course, also its skill name) is in the message, or the one carried by a button or chip. Otherwise nothing runs and «دليل» asks which one, with up to three cards that each carry the chip («قدّم على هذه», «ابدأ الدورة», «اجعلها هدفي»). A second application to the same job creates nothing and returns `already_applied`.
5. **A low match needs a second yes.** `apply_to_job` on a match under 60% returns `low_match` and emits no event, unless the message is the chip «قدّم على أي حال» carrying that job id.
6. **No course completion.** The tool does not exist; a request for it gets the fixed refusal (router row 1).
7. **Navigation is asked for.** In a model turn, `navigate` and `show: true` are honoured only when the user's message contains an open word (افتح، ورّني، أرني، اعرض، روح، خذني، ودّني، وين، open، show، go to); otherwise the event is dropped and the reply carries the chip «افتح {page}». No navigation event is applied while the apply sheet is open or a show is running (so typed text in the paste area or in an edited note is never pulled away). A state-changing event is its message's one navigation; any other navigation in that message is dropped.
8. **Numbers and money come from data.** Every digit sequence in a model's reply, and any of the words ريال، ر.س، SAR، ألف، مليون, must appear in this turn's tool results, in the snapshot, or in the product constants (20 jobs, 59 courses, 38 skills, 7 fields, 12 badges, 25 on the leaderboard, 20 XP per course hour, the 60% line, the level thresholds). A reply that fails is not regenerated: the template of 5.9 for that tool is sent at once.
9. **No done-claim without the deed.** A model reply containing تم، أرسلت، قدّمت، بدأنا، بدأت، فتحت or غيّرت in a turn that produced no matching event is replaced by the offer template with its confirmation chips.
10. **Cards come from data.** Job, course, gap and application cards are drawn by the browser from tool results, with their «جهة تجريبية» tags. The model's text never becomes a card.
11. **Always an answer, and soon.** The provider has 2.5 s to send its first event. On a timeout, an error or an empty reply the local brain answers the same message, and the server does not call the provider again for 60 s (a timestamp in the server process; it is not user state), during which the panel shows the local mode line. Once any event of a turn has reached the browser, that turn is never re-run by the local brain: the template for the tool already called is sent. The user never sees a provider error.
12. **The reply waits for the deed.** The reply text of a turn that emitted `apply`, `start_course` or `set_target` is held by the browser until the dispatcher reports the action finished. If the user stopped it, the held text is discarded and the fixed line of 7.4 is shown instead. «دليل» never says an application was sent that was cancelled.
13. **One thing at a time.** While a reply or an action is in flight, the send button and all chips are disabled, and the dispatcher ignores a second `apply`. During an application the composer's «إيقاف» is the sheet's «إيقاف».
14. **Bounded work.** At most four tool rounds per message; at most one navigation per message.
15. **Scope.** There is no tool for the web, for files, or for anything outside «دليلك»; out-of-scope requests get the fallback of 5.9 (example 10).
16. **Honesty on applying.** The reply after `apply_to_job` always contains the sentence that it is a trial application inside the platform («وللأمانة: هذا تقديم تجريبي داخل منصة دليلك ولم يصل إلى جهة حقيقية.»); the server appends it if a model left it out.
17. **Length.** A reply longer than 600 characters is cut at the last full sentence before that limit.
18. **Keys and privacy.** The provider key stays on the server. **No AI client (Gemini or Anthropic) is ever constructed without an explicit, non-empty key**: with a missing or empty key the provider switch is in local mode, no client exists and no request is made. There is no key on this laptop yet (18 Nov): everything runs on the local brain, and both provider paths are built behind the switch and stay untested until a key is pasted into `.env.local`. The snapshot is sent to the provider only for the reply; nothing is stored on the server. The product tells the user so where it applies (3.6, 3.13, 3.14).

### 5.6 Example exchanges

Context for all of them unless stated: the demo persona «خالد» after the sample CV (180 XP, level 2, match 70% with «محلل بيانات», weekly rank 18). U is the user, D is «دليل».

**How to read the replies.** Each D line is the template of 5.9 filled with these numbers, so with no key the reply is exactly the text shown. With a key, rows 1-8 of the router and all chips still give exactly this text; for the other rows the model's wording is free and the test is: the same tool calls, the same numbers, the same cards and chips.

**1. What should I do now** (also «وش أسوي الحين؟» and the chip)
U: «ماذا أفعل الآن؟»
Tools: `recommend_next_step()`
D: «خطوتك التالية دورة «أساسيات Power BI»: 10 ساعات، تعطيك 200 XP وترفع مطابقتك مع «محلل بيانات» من 70% إلى 90%. أفتحها لك؟»
Chips: «افتح الدورة» · «ليس الآن»

**2. Open my roadmap** (also «ودّني لمساري», "open my path")
U: «افتح مساري»
Tools: `navigate(screen: "path")`
D: «تفضّل، هذا مسارك. أنت عند المرحلة 7 من 8، والتالية Power BI.»

**3. Show me data analyst jobs in Riyadh**
U: «اعرض لي وظائف محلل بيانات في الرياض»
Tools: `search_jobs(query: "محلل بيانات", city: "riyadh", show: true)`
D: «وجدت وظيفتين. الأقرب لمهاراتك «محلل بيانات» بمطابقة 70%. فتحت لك القائمة، وللعلم: كل الوظائف هنا بيانات تجريبية.»
Cards: the two jobs («محلل بيانات» 70%, «محلل ذكاء الأعمال» 43%).

**4. Apply for me: the demo script's line** (context: after the Power BI course, 380 XP, match 90%; the user is on `/path`)
U: «قدّم لي على وظيفة محلل بيانات»
Tools: `apply_to_job(job_id: "data-analyst-riyadh")`. The job page opens, the apply sheet fills itself and is sent (7.4); the reply is shown when that has finished.
D: «تم. أرسلت طلبك على «محلل بيانات» برقم DL-2026-0001 وأنت بمطابقة 90%، وأخذت 40 XP. وللأمانة: هذا تقديم تجريبي داخل منصة دليلك ولم يصل إلى جهة حقيقية. تابعه من «طلباتي».»
Card: the application. Chips: «افتح طلباتي» · «افتح مساري»
The same happens with «قدّم لي على هذه الوظيفة» typed on the job page, with the page chip, and with the button «دع دليل يقدّم عنك».

**5. Why is my match 70%**
U: «لماذا مطابقتي 70%؟»
Tools: `explain_match(job_id: "data-analyst-riyadh")`
D: «الوظيفة تطلب خمس مهارات، وكل واحدة تساوي 20%. المكتملة عندك: Excel و SQL والتواصل الفعّال (60%). الإحصاء: عندك نجمة من نجمتين (10%). ولا نجوم بعد في: Power BI (0%). المجموع 70%، ودورة «أساسيات Power BI» توصلك إلى 90%.»

**6. What is this course** (the user is on `/learn/c-powerbi-1`)
U: «ما هذه الدورة؟»
Tools: `get_course(course_id: "c-powerbi-1")`
D: «دورة «أساسيات Power BI»: 10 ساعات، 5 دروس، من «التعرّف على واجهة Power BI» إلى «نشر لوحة المعلومات ومشاركتها». تمنحك النجمة 1 في Power BI و200 XP، وترفع مطابقتك مع هدفك إلى 90%. وهي دورة تجريبية: عناوين دروس فقط.»

**7. How do I move up the leaderboard**
U: «كيف أتقدّم في الترتيب؟»
Tools: `recommend_next_step()`, then `get_leaderboard(plus_xp: 200)`
D: «أنت في المركز 18 هذا الأسبوع بـ 180 XP، ويفصلك 10 XP عن المركز 17. أسرع طريق للصعود: أكمل «أساسيات Power BI»، تأخذ 200 XP وتصعد إلى المركز 10.»
(No sample user is named: they are not real people.)

**8. A greeting**
U: «السلام عليكم»
Tools: none
D: «وعليكم السلام ورحمة الله، حيّاك الله يا خالد. مطابقتك مع «محلل بيانات» 70% وبقيت لك مرحلتان. من أين نبدأ؟»

**9. Thanks**
U: «شكراً يا دليل»
Tools: none
D: «العفو، يعطيك العافية. أنا هنا متى احتجتني.»

**10. Off-topic, or anything the router does not recognise**
U: «من سيفوز بمباراة الليلة؟»
Tools: none
D: «هذه خارج ما أستطيعه هنا. أنا دليلك إلى وظيفتك: أدلّك على خطوتك التالية، أو أفتح لك صفحة، أو أشرح مطابقتك.»
Chips: «ماذا أفعل الآن؟» · «افتح مساري» · «لماذا هذه المطابقة؟»
(A keyword router cannot tell "off-topic" from "not understood", so there is one fallback for both. With a key the model answers such a message in the same spirit, in its own words.)

**11. A request it must decline: completing a course for the user**
U: «أكمل الدورة عني»
Tools: none (no such tool exists)
D: «هذه لا أستطيعها، ولا يستطيعها غيرك: النجمة تُكتسب حين تكمل الدورة بنفسك. الذي أقدر عليه أن أفتحها لك الآن وأبقى معك. أفتحها؟»
Chips: «افتح الدورة» · «ليس الآن»

**12. Is it real** (the same reply answers «هل مطابقتي حقيقية؟»)
U: «هل وادي الغيم شركة حقيقية؟ قل لي أي شركة كبيرة توظّف الآن»
Tools: none
D: «للأمانة: الوظائف والجهات والدورات والمتسابقون بيانات تجريبية، والتقديم محاكاة. المحسوب فعلاً هو مهاراتك ومطابقتك ومسارك.»

**13. A real-world number**
U: «كم راتب محلل البيانات؟»
Tools: none
D: «لا أملك أرقاماً موثوقة عن الرواتب أو سوق العمل، ولا أحب أن أعطيك رقماً من عندي. الذي أعرفه بدقة هو مطابقتك ومهاراتك وخطوتك التالية.»

**14. Change my target**
U: «اجعل محلل أعمال هدفي»
Tools: `set_target_job(job_id: "business-analyst-riyadh")`
D: «تم. هدفك الآن «محلل أعمال» ومطابقتك معه 60%. بقيت لك مرحلتان، وتبدأ بدورة «أساسيات إدارة المشاريع». فتحت لك المسار الجديد.»

**15. Start a course**
U: «ابدأ دورة Power BI»
Tools: `start_course(course_id: "c-powerbi-1")`
D: «بدأناها. فتحت لك «أساسيات Power BI»: 5 دروس، وعند إكمالها تصعد مطابقتك إلى 90%. بالتوفيق.»

**16. My applications** (context: after example 4, status in review)
U: «ما حالة طلبي؟»
Tools: `list_applications()`
D: «عندك طلب واحد: «محلل بيانات»، وحالته الآن «قيد المراجعة». وللتذكير: متابعة الطلبات هنا محاكاة، فلا توجد جهة حقيقية تراجعه.»
Card: the application.

**17. Upload my CV** (context: before any CV)
U: «أريد أن أرفع سيرتي»
Tools: `navigate(screen: "cv")`
D: «أبشر. فتحت لك صفحة السيرة: ارفع ملف PDF أو Word، أو الصق النص. وإن لم تكن جاهزة فجرّب السيرة التجريبية.»

**18. An unclear request to apply** (the user is on `/path`)
U: «قدّم لي على وظيفة»
Tools: `search_jobs(limit: 3)` (no application is made, and the page does not move)
D: «أبشر. على أي وظيفة؟ هذه أقرب ثلاث لمهاراتك.»
Cards: محلل بيانات 70% · محلل أعمال 60% · محلل مالي 53%, each with the chip «قدّم على هذه».

**19. Who are you**
U: «من أنت؟»
Tools: none
D: «أنا دليل، دليلك إلى وظيفتك. أشرح لك مسارك، أفتح لك الصفحات، وأقدّم على الوظائف حين تطلب. أما الدورات فإكمالها لك أنت.»

**20. Badges**
U: «كيف أحصل على شارة جديدة؟»
Tools: `recommend_next_step()`, `list_badges()`
D: «أقرب شارة إليك «أول دورة»: أكمل دورة واحدة. ومعها تأخذ «ضمن العشرة الأوائل».»

**21. My points and level**
U: «كم نقاطي؟»
Tools: none (the snapshot holds them)
D: «عندك 180 XP وأنت في المستوى 2 · مستكشف. بقي 170 XP للمستوى 3، وسلسلتك يوم واحد.»

**22. Dialect**
U: «ودّني لطلباتي»
Tools: `navigate(screen: "applications")`
D: «تفضّل، فتحت لك طلباتك.»

### 5.7 The router, and the local brain behind it

The router is server code. It runs on every message in every mode (5.5 rule 1). Rows 1-8 are always answered by it. Rows 9-21 are answered by it when there is no key or no connection (that is "the local brain"), and by the model when a key is present and answering. Recognition is by whole words after the normalisation of 4.3; the first row that matches wins.

| Row | Intent | Recognised by | Does |
|---|---|---|---|
| 1 | Refuse: complete for me | أكمل / كمّل / خلّص / أنهِ + الدورة / الدرس + عني / لي / بدالي؛ أعطني / عطني + XP / نقاط / شارة / نجمة | example 11 |
| 2 | Is it real; real-world numbers | حقيقي، حقيقية، وهمي، وهمية، real → example 12 · راتب، رواتب، الراتب، كم يدفعون، إحصائية، إحصائيات، بطالة، سوق العمل، salary → example 13 | the fixed reply; no tool |
| 3 | Button or chip | its payload (the intent and the ids) | runs it. «ليس الآن» → «تمام، متى ما أحببت.» |
| 4 | Apply | the typed request for applying (5.4) | example 4; with no single job, example 18; under 60%, already applied, stopped: the templates of 5.9 |
| 5 | Start a course | the typed request for starting (5.4) | example 15 |
| 6 | Set the target | the typed request for the target (5.4) | example 14 |
| 7 | Job search | وظائف / وظيفة / jobs + a field word, a job title, a city or «عن بُعد» / remote, in Arabic or English (data، software، design، marketing، business، hr؛ riyadh، jeddah، dammam)؛ also أنسب / أفضل / أقرب + وظيفة؛ also وظائف + في / لدى / عند + any other word, which is searched as a query (so «وظائف في {a real company}» answers "nothing found, the data is sample data") | `search_jobs` with the filters found (example 3). `show` is true only when the message has an open word of row 8 or is the chip. «أنسب وظيفة»: the top three, and the page does not move |
| 8 | Open a page | an open word: افتح، ورّني، أرني، اعرض، روح، خذني، ودّني، ودني، وديني، أبغى أشوف، أبي أشوف، خلني أشوف، وين، open، show، go to; **and** a page word: مساري / المسار / path / roadmap · المهارات / الشجرة / skills / tree · سيرتي / السيرة / cv / resume · الوظائف / jobs · طلباتي / applications · الدورات / courses · المتصدرون / المتصدرين / الترتيب / leaderboard / rank · ملفي / الشارات / profile / badges. Also «أرفع / ارفع + سيرتي / السيرة» (example 17). An open word with a job title or a course title opens that job or course | `navigate` (examples 2, 17, 22) |
| 9 | Explain the match | لماذا / ليش / كيف / وش سبب / why + مطابقة / مطابقتي / المطابقة / نسبة / % | example 5, for the job on screen, else the target |
| 10 | The gap | ينقصني، تنقصني، ناقصني، الفجوة، المطلوب | `get_job_gap` for the job on screen, else the target |
| 11 | Next step | ماذا أفعل، وش أسوي، ايش أسوي، إيش اسوي، شنو أسوي، الخطوة التالية، وش التالي، وش بعدين، وش الخطوة الجاية، من أين أبدأ، من وين أبدأ، أبدأ بها، ماذا بعد، what next، what should i do | example 1 |
| 12 | A course | الدورة، دورة + a name؛ «هذه الدورة» or «ترفع مطابقتي» on a course page؛ دورات مساري؛ دورات قصيرة (8 hours or less) | `get_course` or `list_courses` |
| 13 | Leaderboard | الترتيب، المتصدرين، مركزي، المركز، يفصلني، أتقدّم، أصعد | example 7 |
| 14 | XP, level, streak | نقاطي، كم XP، مستواي، المستوى، سلسلتي، السلسلة | example 21 |
| 15 | Badges and stars | شارة، شارات، الشارات، النجوم | example 20, or the fixed answer on stars (5.8) |
| 16 | Applications | طلبي، طلباتي، حالة، الرد | example 16 |
| 17 | The CV | سيرتي، السيرة (with no open word) | the fixed answers of 5.8 |
| 18 | Greeting | السلام، مرحبا، هلا، أهلاً، صباح، مساء | example 8 |
| 19 | Thanks | شكراً، مشكور، يعطيك العافية، تسلم | example 9 |
| 20 | Who are you | من أنت، ما اسمك، هل أنت | example 19 |
| 21 | Anything else | none of the above | the fallback (example 10) |

The fixed answers of 5.8 are matched before the general intents (so «كم بقي على هدفي؟» gets its own answer, not the next-step one).

**Acceptance test.** With no key and no network: every user line of 5.6 gets exactly the reply, tool calls, cards and chips shown for it, and every chip of 5.8 gets its answer. The same test with a provider configured and the network adapter off must pass identically, with no reply slower than 2.5 s plus the local time. (That keyed half is owed until a key exists on this laptop: 10.1.)

**Limits, to state honestly.** With no key «دليل» recognises wording close to these lists (Modern Standard Arabic, the Saudi dialect words above, and a few English words). It does not hold a free conversation: anything else gets the fallback, which offers three things it can do. It remembers nothing beyond "this job / this course" on screen and the last cards it showed.

### 5.8 Suggestion chips per page

Each chip has a slug; its test id is `advisor-chip-{slug}`, and the slug is also the intent the chip carries to the router.

| Page | Chips (`slug` label) |
|---|---|
| `/path` | `next-step` «ماذا أفعل الآن؟» · `why-path` «لماذا هذا المسار؟» · `remaining` «كم بقي على هدفي؟» |
| `/skills` | `skill-start` «أي مهارة أبدأ بها؟» · `gap` «ما المهارات التي تنقصني؟» · `stars-how` «كيف تُحسب النجوم؟» |
| `/cv` | `cv-what` «ماذا تقرأ في سيرتي؟» · `cv-none` «ليست عندي سيرة جاهزة» · `stars-how` «كيف تُحدَّد مستويات المهارات؟» |
| `/jobs` | `jobs-data-riyadh` «اعرض وظائف البيانات في الرياض» · `best-job` «ما أنسب وظيفة لي؟» · `jobs-remote` «وظائف عن بُعد» |
| `/jobs/[id]` | `why-match` «لماذا مطابقتي {match}%؟» · `apply` «قدّم لي على هذه الوظيفة» · `gap` «كيف أسدّ الفجوة؟» · `set-target` «اجعلها هدفي» |
| `/applications` | `applications-status` «ما حالة طلباتي؟» · `next-step` «ماذا أفعل حتى يصل الرد؟» |
| `/learn` | `course-start` «أي دورة أبدأ بها؟» · `courses-path` «دورات مساري» · `courses-short` «دورات قصيرة» |
| `/learn/[id]` | `course-what` «ما هذه الدورة؟» · `start-course` «ابدأ هذه الدورة» · `course-gain` «كم ترفع مطابقتي؟» |
| `/leaderboard` | `rank-how` «كيف أتقدّم في الترتيب؟» · `rank-gap` «كم يفصلني عن المركز التالي؟» |
| `/profile` | `badge-next` «كيف أحصل على شارة جديدة؟» · `level-how` «كيف أرفع مستواي؟» |

A chip that would do nothing is left out (for example `apply` after applying, `set-target` on the target job, `start-course` on a course that cannot be started). Because ids are slugs, leaving one out does not rename the others.

Fixed answers for the chips that need no tool:
- `why-path`: the reasons of 4.6 as one sentence: «اخترته لأنه يوافق اهتمامك بالأرقام والبيانات، وقريب من تخصصك، ومناسب للبدايات. وتستطيع تغييره من صفحة الوظائف.»
- `remaining`: «بقيت لك مرحلتان و22 ساعة تعلّم لتصل إلى 100% مع «محلل بيانات».» At 100%: «اكتمل مسارك: مطابقتك 100% مع «{target}».»
- `stars-how` (both labels): «النجمة الأولى لمهارة ذُكرت في سيرتك، والثانية حين تظهر في خبرة أو مشروع، والثالثة حين توصف بأنها متقدمة. وبعدها كل دورة تكملها تضيف نجمة.» (True in every mode: 6.6.)
- `cv-what`: «أبحث عن 38 مهارة بأسمائها، وأحتفظ لكل مهارة بالجملة التي تثبتها حتى تراها بنفسك.»
- `cv-none`: «ولا يهمّك. الصق أي نص يصف دراستك وخبرتك، أو جرّب السيرة التجريبية، أو ابدأ مسارك بدون سيرة.»
- `level-how`: «المستوى يرتفع بالـ XP، وأكبر مصدر له الدورات: 20 XP عن كل ساعة. بقي لك {x} XP للمستوى {n}.»

The other chips use the templates of 5.9: `next-step`, `skill-start` and `course-start` → next step · `gap` → gap · `jobs-data-riyadh` and `jobs-remote` → search (with `show`) · `best-job` → best job · `why-match` → explain · `apply`, `start-course`, `set-target` → the action · `applications-status` → applications · `courses-path`, `courses-short` → course lists · `course-what` → course · `course-gain` → gain · `rank-how`, `rank-gap` → rank · `badge-next` → badges.

### 5.9 Reply templates (what «دليل» says without a model)

These are the words of the router and the local brain. Slots are filled from tool results and the snapshot; counted nouns go through the shared helper with the right case. They are final copy, like every other Arabic string in this file. Without them a builder would have to invent the advisor's Arabic, and with no key on this laptop this is the advisor Mohammed will talk to.

**Next step** (`recommend_next_step`; chips «افتح الدورة» · «ليس الآن» unless stated)

| Rule of 2.8 | Reply |
|---|---|
| 1 | «خطوتك التالية أن ترفع سيرتك الذاتية، لأعرف أي مراحل مسارك أنجزتها فعلاً. أفتح لك صفحة السيرة؟» Chips: «افتح صفحة السيرة» · «ليس الآن» |
| 2 | «أكمل ما بدأته: دورة «{course}»، أنجزت {x} من {y} دروس. أفتحها لك؟» |
| 3 | «خطوتك التالية دورة «{course}»: {hours}، تعطيك {xp} XP وترفع مطابقتك مع «{target}» من {match}% إلى {after}%. أفتحها لك؟» For a preparatory course: «خطوتك التالية دورة «{course}»: {hours}، تعطيك {xp} XP. وهي تمهيدية: تفتح لك مهارة {skill} في مسارك. أفتحها لك؟» |
| 4 | «مطابقتك مع «{target}» 100%. خطوتك التالية أن تقدّم عليها. أقدّم عنك؟» Chips: «قدّم على هذه» · «ليس الآن» |
| 5 | «أنجزت مسارك وقدّمت على «{target}». اختر هدفك التالي من الوظائف الأقرب إليك.» Chip: «افتح الوظائف» |

**Opening a page** (`navigate`)

| Page | Reply |
|---|---|
| `path` | «تفضّل، هذا مسارك. أنت عند المرحلة {n} من {total}، والتالية {skill}.» Before a CV: «تفضّل، هذا مسارك. يبدأ برفع سيرتك الذاتية.» At 100%: «تفضّل، هذا مسارك، وقد اكتمل.» |
| `cv` | «أبشر. فتحت لك صفحة السيرة: ارفع ملف PDF أو Word، أو الصق النص. وإن لم تكن جاهزة فجرّب السيرة التجريبية.» |
| any other | «تفضّل، فتحت لك {page}.» with {page} = شجرة المهارات · الوظائف · طلباتك · الدورات · المتصدرين · ملفك · «{job title}» · «{short course title}» |

**Jobs**

| Case | Reply |
|---|---|
| Search, several found | «وجدت {n jobs, as an object}. الأقرب لمهاراتك «{title}» بمطابقة {match}%.» (2 → «وجدت وظيفتين.»; 5 → «وجدت 5 وظائف.») |
| Search, one found | «وجدت وظيفة واحدة: «{title}»، ومطابقتك معها {match}%.» |
| Search, none | «لم أجد وظائف بهذه المواصفات. كل الوظائف والجهات هنا بيانات تجريبية، وهذه أقرب ثلاث لمهاراتك.» with three job cards |
| Added when `show` moved the page | «فتحت لك القائمة.» |
| Added the first time jobs come up in a thread | «وللعلم: كل الوظائف هنا بيانات تجريبية.» (when both additions apply they are joined: «فتحت لك القائمة، وللعلم: كل الوظائف هنا بيانات تجريبية.») |
| Best job | «أنسب وظيفة لمهاراتك الآن «{title}» بمطابقة {match}%، وبعدها «{t2}» و«{t3}».» While the user holds no star: «لم أقرأ سيرتك بعد، فكل المطابقات 0%. حسب إجاباتك، الأقرب إليك «{title}». ارفع سيرتك لأرتّبها بمهاراتك.» |
| Explain the match | «الوظيفة تطلب خمس مهارات، وكل واحدة تساوي 20%.» + when any is fully met: «المكتملة عندك: {met list} ({met_points}%).» + for each skill held below the requirement: «{skill}: عندك {held} من {need} ({points}%).» + when any has no star: «ولا نجوم بعد في: {list} (0%).» + «المجموع {match}%، ودورة «{course}» توصلك إلى {after}%.» At 100% the last part is «المجموع 100%: تستوفي المتطلبات كلها.» |
| The gap | «ينقصك لوظيفة «{title}»: {missing list}. أقرب خطوة دورة «{course}»: {hours}، وترفع مطابقتك من {match}% إلى {after}%.» with the gap card. Nothing missing: «لا شيء ينقصك لوظيفة «{title}». مطابقتك 100%.» |

**Applying** (`apply_to_job`)

| Case | Reply |
|---|---|
| Sent | «تم. أرسلت طلبك على «{title}» برقم {number} وأنت بمطابقة {match}%، وأخذت {xp} XP. وللأمانة: هذا تقديم تجريبي داخل منصة دليلك ولم يصل إلى جهة حقيقية. تابعه من «طلباتي».» Chips: «افتح طلباتي» · «افتح مساري». Sent under 60%: «…وأنت بمطابقة {match}%، وبدون نقاط لأن المطابقة أقل من 60%. وللأمانة: …» |
| Which job? | «أبشر. على أي وظيفة؟ هذه أقرب ثلاث لمهاراتك.» with three job cards, each with «قدّم على هذه» |
| Under 60% | «مطابقتك مع هذه الوظيفة {match}% فقط، أقل من 60%. الأفضل أن نسدّ الفجوة أولاً. هل أقدّم على أي حال؟» Chips: «قدّم على أي حال» · «شاهد الفجوة» |
| Already applied | «قدّمت على هذه الوظيفة من قبل، وحالة طلبك «{status}».» Chip: «افتح طلباتي» |
| Stopped by the user | «أوقفت التقديم. الطلب أمامك إن أحببت أن تكمله بنفسك.» |
| Interrupted by a reload | «لم يكتمل التقديم. اطلبه مرة أخرى إن أحببت.» |
| A model asked to apply (5.4) | «أقدّم لك على «{title}»؟» Chips: «قدّم على هذه» · «ليس الآن» |

**Courses** (`start_course`, `get_course`, `list_courses`)

| Case | Reply |
|---|---|
| Started | «بدأناها. فتحت لك «{course}»: {lessons}، وعند إكمالها تصعد مطابقتك إلى {after}%. بالتوفيق.» Off the path: «بدأناها. فتحت لك «{course}»: {lessons}. بالتوفيق.» |
| Already started | «بدأتها من قبل، وأنجزت {x} من {y} دروس. فتحتها لك.» |
| Cannot start | locked: «لا أستطيع بدءها الآن: {reason}.» · credited: «هذه النجمة مثبتة عندك، فلا تحتاج هذه الدورة.» · completed: «أكملت هذه الدورة من قبل.» |
| Which course? | «أبشر. أي دورة؟ هذه دورات مسارك.» with course cards, each with «ابدأ الدورة» |
| What is this course | «دورة «{short}»: {hours}، {lessons}، من «{first lesson}» إلى «{last lesson}». تمنحك النجمة {n} في {skill} و{xp} XP، وترفع مطابقتك مع هدفك إلى {after}%. وهي دورة تجريبية: عناوين دروس فقط.» Off the path, the clause about the match is left out |
| How much does it raise my match | «إكمال «{course}» يرفع مطابقتك مع «{target}» من {match}% إلى {after}%.» · off the path: «هذه الدورة خارج مسارك الحالي، فلا تغيّر مطابقتك مع «{target}».» · preparatory: «هذه دورة تمهيدية: لا ترفع المطابقة مباشرة، لكنها تفتح مهارة {skill} في مسارك.» |
| My path's courses | «الباقي في مسارك: {n courses}. ابدأ بدورة «{course}»: {hours}.» with course cards. None left: «أنجزت كل دورات مسارك.» |
| Short courses | «هذه أقصر الدورات المتاحة لك الآن، وكلها 8 ساعات أو أقل.» with course cards |

**Target** (`set_target_job`)

| Case | Reply |
|---|---|
| Changed | «تم. هدفك الآن «{title}» ومطابقتك معه {match}%. بقيت لك {n stages}، وتبدأ بدورة «{course}». فتحت لك المسار الجديد.» One stage left: «…بقيت لك مرحلة واحدة: دورة «{course}». …» None: «…وتستوفي متطلباته كلها. …» |
| Which job? | «أبشر. أي وظيفة تريدها هدفاً؟ هذه أقرب ثلاث لمهاراتك.» with three job cards, each with «اجعلها هدفي» |
| It is already the target | «هذه هي هدفك الحالي فعلاً.» |

**Game**

| Case | Reply |
|---|---|
| How do I climb | «أنت في المركز {rank} هذا الأسبوع بـ {xp} XP، ويفصلك {x} XP عن المركز {rank-1}. أسرع طريق للصعود: أكمل «{course}»، تأخذ {course xp} XP وتصعد إلى المركز {new rank}.» When the next step is not a course, the second sentence is «أسرع طريق للصعود: {next-step label}.» |
| The gap to the next place | «يفصلك {x} XP عن المركز {rank-1}.» In first place: «أنت في الصدارة. حافظ عليها.» |
| My points and level | «عندك {xp} XP وأنت في المستوى {n} · {title}. بقي {x} XP للمستوى {n+1}، وسلسلتك {streak days}.» At level 7: «عندك {xp} XP وبلغت أعلى مستوى: أسطورة. وسلسلتك {streak days}.» |
| My streak | «سلسلتك الآن {streak days}. ادخل كل يوم لتكبر مكافأتك: 20 XP عن كل يوم، حتى 100.» |
| A new badge | Take the badges the next step of 2.8 would unlock, in the order of 8.6. If there are any: «أقرب شارة إليك «{first}»: {its hint}» and, when there are more, « ومعها تأخذ «{second}».» If there are none: the first locked badge of 8.6, «أقرب شارة إليك «{badge}»: {its hint}». All unlocked: «جمعت الشارات كلها. ما شاء الله.» |
| My applications | none: «لم تقدّم على أي وظيفة بعد. إن أحببت قدّمت عنك.» · one: «عندك طلب واحد: «{title}»، وحالته الآن «{status}». وللتذكير: متابعة الطلبات هنا محاكاة، فلا توجد جهة حقيقية تراجعه.» · more: «عندك {n applications}، وأحدثها «{title}» وحالته «{status}». وللتذكير: متابعة الطلبات هنا محاكاة.» |

**Conversation**

| Case | Reply |
|---|---|
| Greeting | «وعليكم السلام ورحمة الله، حيّاك الله يا {name}. مطابقتك مع «{target}» {match}% وبقيت لك {n stages}. من أين نبدأ؟» For «هلا» or «مرحبا» the opening is «هلا بك يا {name}.» Before a CV the middle sentence is «مسارك نحو «{target}» ينتظر سيرتك الذاتية.» At 100% it is «مطابقتك مع «{target}» 100%.» |
| Thanks | «العفو، يعطيك العافية. أنا هنا متى احتجتني.» |
| Who are you | «أنا دليل، دليلك إلى وظيفتك. أشرح لك مسارك، أفتح لك الصفحات، وأقدّم على الوظائف حين تطلب. أما الدورات فإكمالها لك أنت.» |
| «ليس الآن» | «تمام، متى ما أحببت.» |
| Is it real | «للأمانة: الوظائف والجهات والدورات والمتسابقون بيانات تجريبية، والتقديم محاكاة. المحسوب فعلاً هو مهاراتك ومطابقتك ومسارك.» |
| A real-world number | «لا أملك أرقاماً موثوقة عن الرواتب أو سوق العمل، ولا أحب أن أعطيك رقماً من عندي. الذي أعرفه بدقة هو مطابقتك ومهاراتك وخطوتك التالية.» |
| Complete it for me | «هذه لا أستطيعها، ولا يستطيعها غيرك: النجمة تُكتسب حين تكمل الدورة بنفسك. الذي أقدر عليه أن أفتحها لك الآن وأبقى معك. أفتحها؟» Chips: «افتح الدورة» · «ليس الآن» |
| The fallback | «هذه خارج ما أستطيعه هنا. أنا دليلك إلى وظيفتك: أدلّك على خطوتك التالية، أو أفتح لك صفحة، أو أشرح مطابقتك.» Chips: «ماذا أفعل الآن؟» · «افتح مساري» · «لماذا هذه المطابقة؟» |

---

## 6. CV

### 6.1 Accepted inputs

| Input | Rule |
|---|---|
| PDF | text-based PDF, up to 5 MB and 15 pages. A scanned image has no text and gets the "no readable text" error (3.6). |
| Word | `.docx`, up to 5 MB. The old `.doc` format is not accepted (wrong-type error). |
| Pasted text | at least 80 characters. |
| Sample CV | the button «جرّب بسيرة ذاتية تجريبية» fills the paste area with the text of 6.2. |

- **Where the text is extracted.** A file is read by the app's own server route on this laptop (STACK-NOTES 1.6): the route returns the text and keeps nothing. Nothing is fetched from the network to do it (no worker, no font, no script), so it works with the network adapter off. The file itself never leaves the machine; its extracted text does only when an AI key is configured, and the privacy line of 3.6 says so.
- **Which error.** More than 15 pages → the too-long error. A file the reader cannot open (damaged, password-protected, or not really a PDF or docx) → the cannot-open error. A file whose extracted text has fewer than 80 non-space characters → the no-readable-text error. A failed request → the try-again error.
- Whatever the input, the analysis works on plain text, cleaned by step 1 of 6.5.
- **The sample CV is always analysed by the local analyser**, with or without a key, so the demo numbers never move. The test: with whitespace collapsed and its first line ignored, the text equals the sample of 6.2. Then no provider call is made. An edited sample is an ordinary pasted CV.
- **Acceptance.** One Arabic text PDF and one English `.docx`, kept in the project under `public/samples/`, each return at least one skill with the network adapter off. (STACK-NOTES 7.1 marks Arabic PDF extraction as unverified; this test is what verifies it.)

### 6.2 The sample CV (full text)

A fictional recent graduate. The first line is the signed-in user's name, so the CV belongs to whoever is presenting; everything else is fixed. It is written in first person and in verbal nouns, so it suits any name. Store it exactly as below, one line per line.

```text
{name}
الرياض

نبذة
تخرّجت حديثاً في نظم المعلومات الإدارية، وأحب تحويل الأرقام إلى قرارات واضحة. أبحث عن فرصتي الأولى في مجال البيانات.

التعليم
بكالوريوس نظم المعلومات الإدارية، جامعة التلال السبع (جهة تجريبية)، 2026.
من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.

الخبرة العملية
تدريب تعاوني في قسم المبيعات، متجر الفانوس النحاسي (جهة تجريبية)، أربعة أشهر.
- تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.
- كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.
- تجهيز ملخص أسبوعي لمدير القسم بأهم التغيّرات.

المشاريع
مشروع التخرج: نظام لمتابعة مخزون متجر صغير.
- بناء قاعدة البيانات وكتابة استعلامات SQL لتقارير المخزون.
- مراجعة حركة الأصناف في Excel لتحديد الأصناف الراكدة.

المهارات
التواصل، العمل الجماعي، العرض والتقديم.

اللغات
العربية: اللغة الأم.
الإنجليزية: جيد جداً.
```

**What the sample CV must produce** (an acceptance test for the data builder and the analyser builder: exactly these eight skills, these stars, these evidence lines, and nothing else):

| Skill | Stars | Why that level | Evidence line shown |
|---|---|---|---|
| Excel | 2 of 3 | named in the experience section | «تنظيف بيانات المبيعات الأسبوعية وتلخيصها في Excel باستخدام الجداول المحورية.» |
| SQL | 2 of 3 | named in the experience section | «كتابة استعلامات SQL لاستخراج أرقام الفروع من قاعدة بيانات المبيعات.» |
| الإحصاء | 1 of 2 | named only under education | «من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.» |
| أساسيات البرمجة | 1 of 2 | named only under education | «من المقررات: مبادئ الإحصاء، أساسيات البرمجة بلغة Python.» |
| الإنجليزية المهنية | 2 of 2 | level word «جيد جداً» | «الإنجليزية: جيد جداً.» |
| التواصل الفعّال | 1 of 2 | named only under skills | «التواصل، العمل الجماعي، العرض والتقديم.» |
| العرض والتقديم | 1 of 1 | named only under skills | «التواصل، العمل الجماعي، العرض والتقديم.» |
| العمل الجماعي | 1 of 1 | named only under skills | «التواصل، العمل الجماعي، العرض والتقديم.» |

Eight skills, eleven stars. Power BI is absent on purpose: it is the gap the demo closes. With these stars the match with «محلل بيانات» is exactly 70% (7.2).

### 6.3 The analysis show

The analysis runs first (the local analyser is instant) and the show is played over the real result: the sentences that light up are the actual evidence lines, and the tags are the skills actually found.

| Stage id | Duration | Status line | What happens on the stage |
|---|---|---|---|
| `read` | 1.2 s | «أقرأ سيرتك سطراً سطراً…» | the CV appears as a document and a line passes down it (`scan-line`) |
| `extract` | 1.6 s | «ألتقط المهارات من كلامك…» | each evidence sentence is marked in the document (`phrase-highlight`) and a skill tag pops out of it into the tray (`tag-pop`) |
| `evidence` | 1.2 s | «أربط كل مهارة بالجملة التي تثبتها…» | each tag shows its sentence beside it |
| `level` | 1.2 s | «أقدّر مستوى كل مهارة بالنجوم…» | stars fill on each tag (`star-fill`) |
| `match` | 1.2 s | «أقارن مهاراتك مع 20 وظيفة…» | job rings appear and fill; the best three stay |
| `done` | 0.6 s | «انتهيت: وجدت 8 مهارات.» | the results layout forms (`results-rise`) |

Total **7.0 s** (1.2 + 1.6 + 1.2 + 1.2 + 1.2 + 0.6). With an AI model, `read` lasts until the model's result arrives (at least 1.2 s); if it has not arrived after 12 s the local analyser's result is used and the show continues. Space or `Esc` jumps to the results. The result is saved before the show starts (3.6), so a reload mid-show loses nothing. With reduced motion the results open directly (the one global rule).

### 6.4 The result, then the matched jobs

- Each skill found: its stars out of that skill's maximum, and the CV sentence that proves it, quoted. Skills are grouped by field in the order of 9.1; inside a field, more stars first.
- The star levels mean: 1 = the CV names the skill · 2 = the CV shows it used in work, training or a project, or gives it a middle level word · 3 = the CV calls it advanced.
- Then the match with the target job, then the three best jobs for these skills, each with its ring (ranking of 7.2). The target carries «هدفك»; the others offer «اجعلها هدفي».
- Saved with the account: the CV text, the file name, whether it was the sample, the engine used, the date, and per skill the stars and the evidence line.

### 6.5 What the local analyser (no key) must do

1. **Clean.** On the whole text: Unicode NFKC (many PDFs give Arabic as presentation-form letters, and this folds them back into ordinary letters; without it no Arabic alias matches); remove the direction marks U+200C-U+200F and U+202A-U+202E and the stretching mark; convert ٠-٩ to 0-9. These cleaned lines are what is displayed. For matching, a further normalised copy is made by the rules of 4.3.
2. **Split into lines.** A leading list mark (-, •, *, a number with a dot) is removed and remembered. A line longer than 200 characters is split at «.» and «؛».
3. **Rejoin wrapped lines.** PDF text arrives wrapped at page width, which would cut "the sentence that proves it" in half. A line is joined to the previous one when all of these hold: the previous line is longer than 40 characters and does not end with . : ؛ ! ؟; the line did not start with a list mark; neither line is a heading (step 4); no blank line separates them.
4. **Find the zones.** A heading is a line of at most 40 characters, with no list mark, no «.» and no «،», that contains a heading word (with or without «ال», any letter case). *Applied* words: الخبرة، الخبرات، خبرات، التدريب، المشاريع، الأعمال التطوعية، العمل التطوعي، experience، employment، work history، career، projects، internship، volunteer. *Listed* words: نبذة، الملخص، ملخص، الهدف، التعليم، المؤهلات، الدورات، الشهادات، المهارات، اللغات، الاهتمامات، summary، profile، objective، about، education، courses، certifications، skills، languages. When a heading holds words of both kinds, its first word decides. Every line belongs to the zone of the nearest heading above it; lines before the first heading are *listed*. («Work Experience», «Professional Experience», «Employment History», «خبرات العمل» and «مهارات» are all headings under this rule.)
5. **Find the skills.** Each of the 38 skills has a list of aliases (9.2). Latin aliases match whole words, ignoring case. Arabic aliases match after normalisation, with or without «ال». When two aliases overlap, the longer one wins and the words are used once (so «التواصل الاجتماعي» counts for social media, not for communication).
6. **Set the stars** for each skill found:
   - **3** if, on a line that names the skill, an advanced word follows the alias with no other skill's alias between them: متقدم، متقدمة، خبير، خبيرة، احتراف، احترافي، ممتاز، طلاقة، advanced، expert، fluent.
   - otherwise **2** if a line that names the skill is in an *applied* zone, or a middle word follows the alias in the same way: متوسط، متوسطة، جيد جداً، intermediate.
   - otherwise **1**.
   - Then lower the result to the skill's maximum stars (9.2).
7. **Pick the evidence**: the first line, in document order, that justifies the level given (the applied-zone line, or the line with the level word, or for 1 star the first line naming the skill). Show the cleaned line of step 1 (rejoined by step 3), trimmed, cut at 160 characters on a word boundary with «…».
8. **Return** every skill with at least one star, with its stars and its evidence line. The same text always gives the same result.

The sample CV was read against these rules by hand: its six headings are found, no content line is taken for a heading (each ends with «.»), no line is rejoined, and it still returns exactly the eight skills of 6.2.

### 6.6 With an AI model (a key is present)

For an uploaded or pasted CV that is not the sample, the local analyser runs first. The model is then asked for one thing only: skills it can see that the alias lists missed, each as a skill id with a quoted evidence sentence. The server enforces, in code:
- the skill id must be one of the 38; others are dropped;
- the evidence must be a sentence that really occurs in the CV text; otherwise that skill is dropped;
- **the model never sets stars.** A skill the local analyser found keeps its local stars and evidence. A skill only the model found gets its stars from the zone of its evidence line (step 4 of 6.5): 2 in an *applied* zone, otherwise 1, then lowered to the skill's maximum. So the star rules «دليل» explains (5.8) are true in every mode, and a match can always be explained to the last point (P4);
- on a timeout (12 s), an error or an empty list, the local analyser's result stands alone.

The results page says which engine read the CV (3.6): «نموذج ذكاء اصطناعي» when the model's call succeeded, otherwise the local label.

### 6.7 Limits of the local analyser (say so if asked)

- It recognises a skill only by the names in its alias list; a skill described without its name is missed.
- It does not understand meaning: «لا أجيد Excel» still counts as Excel.
- Levels come from where a skill is written and from level words, not from judging the work described.
- It needs line-based text. Tables, two-column layouts and scanned pages may come out in the wrong order or not at all.
- It reads Arabic and English skill names; it does not read other languages.
- With a key, a model may add skills that are described without their names. Two readings of the same CV can then differ by a skill, and so can the match. The sample CV never goes to a model, so the demo numbers cannot move.

---

## 7. Jobs and applications

### 7.1 Search and filters

- **Search** looks in each job's title, company, city, field name and the names of its five skills. The query is normalised (4.3), «ال» is ignored, and every word of the query must be found. «محلل بيانات» with the city الرياض returns exactly «محلل بيانات» and «محلل ذكاء الأعمال».
- **City filter**: «كل المدن» · «الرياض» · «جدة» · «الدمام» · «عن بُعد».
- **Field filter**: «كل المجالات» and the six fields that have jobs. The seventh field, «المهارات المهنية», has skills and courses but no jobs of its own; its skills appear inside the other jobs.
- **Skill filter** (`/jobs?skill={skillId}`): exactly the jobs that require that skill, shown as the removable chip «المهارة: {name}». The skill panel's «عرضها» link opens the list this way (3.5), because a text search for a skill's name can match other jobs through their titles or fields.
- Search, city, field and skill combine with AND.

### 7.2 The match formula and the ranking

**Every job requires exactly five skills, each at 1, 2 or 3 stars. Each skill is worth 20 points. A skill earns its 20 points in proportion to the stars held out of the stars required, never more than 20. The match is the sum, rounded to a whole number.**

`match = round( Σ over the five skills of 20 × min(stars held, stars required) ÷ stars required )`

| «محلل بيانات» requires | After the sample CV | Points | After «أساسيات Power BI» | Points | After «الإحصاء التطبيقي للمحللين» | Points |
|---|---|---|---|---|---|---|
| Excel ★★ | ★★ | 20 | ★★ | 20 | ★★ | 20 |
| SQL ★★ | ★★ | 20 | ★★ | 20 | ★★ | 20 |
| Power BI ★ | none | 0 | ★ | 20 | ★ | 20 |
| الإحصاء ★★ | ★ | 10 | ★ | 10 | ★★ | 20 |
| التواصل الفعّال ★ | ★ | 20 | ★ | 20 | ★ | 20 |
| **Match** | | **70%** | | **90%** | | **100%** |

One star in a skill required at 1 star is worth 20 points; at 2 stars, 10 points; at 3 stars, 6.67 points (so thirds appear: 43%, 53%, 57%). Stars above the requirement add nothing. Stars in skills the job does not list add nothing.

**Ranking** on `/jobs`, in the CV results and in the advisor's lists: higher match first. Ties, in order: the target job · a job in the user's city · a job whose field is one of the user's interests · the order of the data file. While the user holds no star, every match is 0% and the order is the onboarding fit score (4.6); with any star, from a CV or from a course, the order is the match.

### 7.3 The gap view

- **ما لديك**: the required skills the user holds at the required stars or more.
- **ما ينقصك**: the required skills held below the requirement, with stars held and stars required.
- **كيف تسدّ الفجوة**: one row per missing star, in roadmap order, with the course that grants it, its hours and XP, and its match gain. The gain shown is that star's share: 20 points ÷ stars required, rounded (20, 10 or 7). Where thirds are involved the rows can differ from the ring by one point; the ring is the truth.
- A missing prerequisite skill that the job does not list appears as an extra row marked «تمهيدية» with «+0%».

### 7.4 Applying

**The application record.** Job id · number `DL-{year}-{sequence}` (four digits, counted per account from 0001) · time sent · match when sent · the note · the CV line · XP paid (40 or 0) · who sent it (`user` or `advisor`; an application sent by «دليل» shows «قدّم عنك دليل» on its card) · status.

**The note template.** «أتقدّم لوظيفة {title} لدى {company}. مطابقتي الحالية مع متطلبات الوظيفة {match}%، وأبرز ما لديّ: {held}. وأعمل الآن على استكمال: {missing}.» `{held}` = up to three fully met skills in the job's order; `{missing}` = up to two unmet skills. With nothing missing the last sentence is dropped; with nothing held the middle part becomes «وأبدأ الآن ببناء المهارات المطلوبة». The note is always built in the browser from this template; no model writes it (5.3).
Demo text (the demo applies after the Power BI course, at 90%): «أتقدّم لوظيفة محلل بيانات لدى وادي الغيم للبيانات. مطابقتي الحالية مع متطلبات الوظيفة 90%، وأبرز ما لديّ: Excel و SQL و Power BI. وأعمل الآن على استكمال: الإحصاء.»

**Two ways to apply.** The first one everywhere is «دع دليل يقدّم عنك» (the button, the chip, or a typed request): it is what he asked for. The second is «قدّم بنفسك».

**When the user presses «قدّم بنفسك».** The apply sheet opens already filled. The user may edit the note. «أرسل الطلب» → «جارٍ الإرسال…» for 1.2 s → the confirmation. Under 60% the warning block sits above the form and the send button reads «قدّم على أي حال».

**When «دليل» applies** (the user asked: 5.4). 7.2 s, and the user watches every step:

| Step | Status line in the chat | On the page | Time |
|---|---|---|---|
| 1 | «أفتح نموذج التقديم…» | if needed the job page opens; the apply sheet opens with empty fields and the line «دليل يملأ الطلب…» | 0.5 s |
| 2 | «أكتب بياناتك…» | the name writes itself, then the city, then the qualification and major | 1.2 s |
| 3 | «أكتب بياناتك…» | the matching skills pop in one by one | 0.7 s |
| 4 | «أكتب بياناتك…» | the note types itself; the CV line appears | 2.0 s |
| 5 | «أرسل الطلب…» | the send button is visibly pressed; «جارٍ الإرسال…» | 1.6 s |
| 6 | (the reply arrives) | the confirmation shows for 1.2 s, then the sheet closes by itself | 1.2 s |

- **Stop.** The sheet's stop and the composer's stop are both labelled «إيقاف» and are the same control. During steps 1-4 it cancels: the sheet stays open with what was written, now editable, and «دليل» says «أوقفت التقديم. الطلب أمامك إن أحببت أن تكمله بنفسك.» From step 5 the control is gone: a pressed send cannot be stopped.
- **When the record is written.** At the start of step 5. A reload before that leaves no application, and on the next load «دليل» adds «لم يكتمل التقديم. اطلبه مرة أخرى إن أحببت.» A reload after it finds the application sent; its XP and badge news shows once (3.15).
- **The reply waits.** «دليل»'s «تم. أرسلت طلبك…» is shown only when step 6 ends (5.5 rule 12), so it can never describe an application that was stopped.
- **A second request while one is running** is ignored (5.5 rule 13).
- **Phones.** The advisor sheet closes for steps 1-6, so the page is visible, and opens again with the reply.
- **Under 60%** «دليل» does not fill anything (5.5 rule 5). It answers: «مطابقتك مع هذه الوظيفة {match}% فقط، أقل من 60%. الأفضل أن نسدّ الفجوة أولاً. هل أقدّم على أي حال؟» with the chips «قدّم على أي حال» and «شاهد الفجوة» (which opens the job page at the block «ما ينقصك»).
- **Already applied**: «قدّمت على هذه الوظيفة من قبل، وحالة طلبك «{status}».» with the chip «افتح طلباتي».
- The reply always states that the application is a trial inside the platform: «…هذا تقديم تجريبي داخل منصة دليلك ولم يصل إلى جهة حقيقية.» (5.5 rule 16).

### 7.5 Application statuses and how they advance in a demo

Stated honestly: **nobody reviews an application. The status is a function of time and of the match when the application was sent.**

| Time since sending | Status |
|---|---|
| 0 to 30 s | `sent` «أُرسل الطلب» |
| 30 s to 2 min | `review` «قيد المراجعة» |
| after 2 min | match when sent 60% or more → `shortlisted` «مرشّح للمقابلة»; under 60% → `closed` «لم يُرشّح هذه المرة» |

- The control «محاكاة: انقل للحالة التالية» on each card moves that application to its next status at once, so a presenter does not wait. It is hidden once the status is `shortlisted` or `closed`: there is no next status.
- The status is recomputed when any page loads and every 5 s while `/applications` is open.
- Applications that come from a seed (10.3) keep the status the seed gives them until the control is pressed.
- The page banner, the advisor and the profile's «عن هذا العرض» all say this is a simulation.

### 7.6 Where the sample-data label appears

| Place | Label |
|---|---|
| Sign-in footer | «عرض تجريبي: الوظائف والدورات والمتسابقون بيانات تجريبية.» |
| Side navigation footer | «عرض تجريبي · بيانات تجريبية» |
| Every company name (job cards, job page, reveal, roadmap header, apply sheet, application cards, chat cards) | the tag «جهة تجريبية» |
| `/jobs` banner | «بيانات تجريبية: الوظائف والجهات هنا للعرض فقط.» |
| Apply sheet | «تقديم تجريبي: لن يُرسل شيء إلى جهة حقيقية.» |
| Job page, after applying | the chip «قدّمت · {status} · محاكاة» |
| `/applications` banner | «محاكاة: لا توجد جهة حقيقية تراجع طلبك. الحالات تتقدّم تلقائياً لتجربة المتابعة.» |
| `/learn` banner and course pages | «دورات تجريبية: عناوين الدروس فقط، والإكمال بضغطة زر.» · «دورة تجريبية: عناوين فقط، والإكمال بضغطة زر.» |
| `/leaderboard` | «المتسابقون الآخرون بيانات تجريبية. ترتيبك يُحسب من نقاطك أنت.» |
| Leaderboard preview on `/path` | the tag «بيانات تجريبية» beside its heading (3.4) |
| Sample CV | «(جهة تجريبية)» after the university and the employer inside the text; on the results, the tag «سيرة تجريبية» |
| Profile | the section «عن هذا العرض» |
| «دليل» | says it in words (5.1), and after every application (5.5 rule 16) |

One label per place is enough. He asked that applying "look and feel real": so the word «تجريبي» is not repeated inside a confirmation, or under a button on a page that already carries the label. During the advisor's application it is read three times, each doing a different job: the tag on the company, the note on the sheet, and «دليل»'s sentence.

---

## 8. Game rules

### 8.1 XP per action

| Event id | When | XP | Limit |
|---|---|---|---|
| `onboarding_completed` | the sixth onboarding answer is accepted | +50 | once per account |
| `target_set` | the first target job is chosen at the reveal | +30 | once per account; changing the target later pays 0 |
| `cv_analysed` | the first CV analysis that finds at least one skill | +100 | once per account; later analyses pay 0 |
| `course_completed` | a course is completed | 20 × the course's hours | once per course; `credited` courses cannot be completed |
| `job_applied` | an application is sent while the match is 60% or more | +40 | once per job; under 60% pays 0 |
| `daily_reward` | the daily reward is claimed | 20 × streak day, at most 100 | once per calendar day |

Nothing else pays XP: not starting a course, ticking a lesson, chatting with «دليل», opening a page, changing the avatar or unlocking a badge. Every XP event is written to the XP history with its reason and time.

### 8.2 Course XP by hours

| Hours | 6 | 8 | 10 | 12 | 14 | 16 |
|---|---|---|---|---|---|---|
| XP | 120 | 160 | 200 | 240 | 280 | 320 |
| Lessons | 3 | 4 | 5 | 5 | 6 | 6 |

All 59 courses together are 566 hours and 11,320 XP.

### 8.3 Levels

| Level | Title | From (total XP) | To reach the next |
|---|---|---|---|
| 1 | «مبتدئ» | 0 | 150 |
| 2 | «مستكشف» | 150 | 200 |
| 3 | «مجتهد» | 350 | 250 |
| 4 | «متمكّن» | 600 | 400 |
| 5 | «محترف» | 1000 | 600 |
| 6 | «خبير» | 1600 | 900 |
| 7 | «أسطورة» | 2500 | (top level) |

The level is always derived from total XP. The bar in the user chip fills from the current level's threshold to the next one, and its label gives the total and the next threshold: «420 / 600 XP» means total 420, level 4 at 600 (the bar is 28% full: 70 of the 250 XP between 350 and 600).

### 8.4 Streak and daily reward

- A **day** is a calendar day on the device's clock. An **active day** is a day on which the signed-in user opened any app-shell page.
- On the first app-shell load of a day: if the last active day was yesterday, streak + 1; if it was today, no change; otherwise the streak becomes 1. The longest streak is kept.
- The **daily reward** is offered on the first app-shell load of every day except the day the account was created (that day the streak is 1 and onboarding is the event).
- Reward = 20 XP × the streak day, **capped at 100**: day 1 (a restart after a break) 20 · day 2 40 · day 3 60 · day 4 80 · day 5 and every day after 100.
- The XP is paid when the user presses «استلم». If the day ends unclaimed, that day's reward is lost; the streak is not.

### 8.5 Skill stars

- Each skill has a fixed number of star slots, 1, 2 or 3 (9.2). The 38 skills have 59 slots in total, and each slot has exactly one course: **59 courses, 59 stars.**
- A star is earned in two ways: the CV proves it (6.5), or the user completes the course for it.
- A course for star *n* of a skill can be started when the user holds star *n-1* of that skill (for *n* = 1: when every prerequisite skill has at least one star). Completing it gives star *n*.
- A skill's stars = the higher of what the CV proved and what courses granted, where "what courses granted" is the highest *n* among the completed courses `c-{skill}-n`. A new CV analysis replaces the CV-proven stars and never removes a star granted by a course.
- A course is `credited` when the user holds its star and did not complete that course (the CV proved the star, or a higher course of the same skill was completed). It cannot be started, pays no XP, and does not count as a completed course. Its label is «مثبتة», shown with its source (3.11).
- A skill is `locked` in the tree while it has no star and one of its prerequisites has none.

### 8.6 Badges

Twelve badges: the ten from the idea file and two that the leaderboard and the applications earn. A badge, once unlocked, stays. Badges pay no XP.

| Badge id | Name | Description (when unlocked) | Hint (when locked) | Exact unlock rule |
|---|---|---|---|---|
| `first-steps` | «الخطوة الأولى» | «أكملت التعارف مع دليل.» | «أكمل التعارف مع دليل.» | `onboarding_completed` has fired |
| `goal-set` | «صاحب هدف» | «اخترت وظيفتك المستهدفة.» | «اختر وظيفتك المستهدفة.» | a target job is set for the first time |
| `cv-scanned` | «سيرة مقروءة» | «حلّلت سيرتك واكتشفت مهاراتك.» | «حلّل سيرتك الذاتية.» | `cv_analysed` has fired |
| `first-application` | «أول تقديم» | «قدّمت على أول وظيفة.» | «قدّم على وظيفة.» | applications sent ≥ 1 (any match) |
| `first-course` | «أول دورة» | «أكملت أول دورة.» | «أكمل دورة واحدة.» | courses completed ≥ 1 |
| `five-courses` | «خمس دورات» | «أكملت خمس دورات.» | «أكمل خمس دورات.» | courses completed ≥ 5 |
| `streak-3` | «ثلاثة أيام» | «عدت ثلاثة أيام متتالية.» | «عد ثلاثة أيام متتالية.» | streak ≥ 3 |
| `streak-7` | «أسبوع كامل» | «عدت سبعة أيام متتالية.» | «عد سبعة أيام متتالية.» | streak ≥ 7 |
| `ten-skills` | «عشر مهارات» | «لديك نجمة على الأقل في عشر مهارات.» | «اكسب نجمة في عشر مهارات.» | skills with at least 1 star ≥ 10 |
| `level-5` | «المستوى الخامس» | «بلغت المستوى 5: محترف.» | «اجمع 1000 XP.» | level ≥ 5 |
| `job-ready` | «جاهز للوظيفة» | «بلغت مطابقة 100% مع وظيفتك المستهدفة.» | «ابلغ 100% مع وظيفتك المستهدفة.» | match with the current target = 100 |
| `top-ten` | «ضمن العشرة الأوائل» | «دخلت العشرة الأوائل في ترتيب الأسبوع.» | «ادخل العشرة الأوائل هذا الأسبوع.» | weekly rank ≤ 10 after any XP gain |

Badges are checked after every XP event, every star change and every streak change.

### 8.7 The leaderboard

- **Who is on it.** 24 sample users (9.5) and the signed-in user: 25 rows. Other accounts saved in the same browser are not shown.
- **One board: this week.** It ranks by XP earned since Sunday 00:00 on the device's clock (for the user, the sum of their XP history since then). There is no all-time board: nobody new could climb it during a demo, and one board answers "who is first".
- **Ranking.** Higher weekly XP first. The sample users' numbers are fixed and all different, so they never tie with each other. **If the user's XP equals a sample user's, the user ranks above** (they reached it now).
- **Stated honestly:** the sample users do not move. Only the signed-in user's rank changes, and it changes because their XP did. On a new week the user's weekly XP starts again from 0; the sample values stay as they are. That is why the page says «يُحتسب XP أسبوعك من يوم الأحد» and does not say the board is renewed.
- **What the user sees as their rank changes:**
  1. Anywhere in the app, an XP toast adds «صعدت إلى المركز {n} هذا الأسبوع» when the gain improved the weekly rank. One exception: a gain made while the user's weekly XP was 0 shows no rank line (a first toast that announces rank 22 of 25 is not good news).
  2. The celebration has the rank beat (3.11).
  3. On the leaderboard, the first view after an improvement plays `row-climb` from the old place to the new one and shows «صعدت {n} مراكز». The old place is the rank the page last showed (the `/leaderboard` page itself: the preview on `/path` does not count, 3.4). If the page has never been opened, it is the rank before the user's most recent gain that improved the rank. So in the demo the first visit climbs from 18 to 10, the same eight places the celebration announced, even though the application's +40 came in between and changed no rank.
  4. The gap line always tells the distance to the next place: «يفصلك {x} XP عن المركز {n-1}», where x = that person's XP minus the user's (reaching it is enough, because ties go to the user).

### 8.8 The arithmetic, checked

The thresholds, the XP table, the match formula, the leaderboard data and the demo script agree. The walk, in the order of the demo script (10.2), then one course further:

| After | XP gained | Total XP | Level | Match with «محلل بيانات» | Weekly rank (of 25) | Badges unlocked here |
|---|---|---|---|---|---|---|
| Onboarding finished | +50 | 50 | 1 مبتدئ | (none yet) | 23 | الخطوة الأولى |
| Target chosen | +30 | 80 | 1 مبتدئ | 0% | 22 | صاحب هدف |
| Sample CV analysed | +100 | 180 | **2 مستكشف** | **70%** | 18 | سيرة مقروءة |
| «أساسيات Power BI» completed (10 h) | +200 | 380 | **3 مجتهد** | **90%** | **10** | أول دورة · ضمن العشرة الأوائل |
| Application sent at 90% | +40 | 420 | 3 مجتهد | 90% | 10 | أول تقديم |
| «الإحصاء التطبيقي للمحللين» completed (12 h) | +240 | 660 | **4 متمكّن** | **100%** | 6 | جاهز للوظيفة |

How each number is forced:
- **Levels** (8.3): 150 ≤ 180 < 350 → level 2, with 350 − 180 = 170 XP to level 3. 350 ≤ 380 and 420 < 600 → level 3. 600 ≤ 660 < 1000 → level 4. The chip at 420 reads «420 / 600 XP» and is 28% full.
- **Match** (7.2): 20 + 20 + 0 + 10 + 20 = 70. Power BI ★ adds 20 → 90. الإحصاء ★★ adds 10 → 100.
- **Weekly rank** (9.5): one more than the number of sample users with more weekly XP. More than 50: 22 → rank 23. More than 80: 21 → 22. More than 180: 17 (the lowest of them has 190) → 18. More than 380: 9 (the lowest has 440; 370 is below) → 10. More than 420: the same 9 → 10. More than 660: 5 → 6.
- So the course lifts the rank from 18 to 10, eight places, and at 420 XP the gap to rank 9 is 440 − 420 = 20 XP.

Other orders also work. Skipping the application: 180 → 380 → 620 (level 4, rank 7). Applying before the course, at 70%, which is still 60% or more: 180 → 220 (rank 16) → 420 (level 3, rank 10, six places). Both level-ups and the top-ten badge are safe in every order.

---

## 9. Data requirements (for the data builder)

Ids are lowercase Latin with hyphens and never change once written: seeds, test ids and the advisor's tools use them.

### 9.1 The seven fields

| Field id | Name | Skills | Star slots = courses | Has jobs |
|---|---|---|---|---|
| `data` | «البيانات والتحليل» | 7 | 14 | 4 jobs |
| `software` | «تطوير البرمجيات» | 6 | 9 | 4 jobs |
| `design` | «التصميم وتجربة المستخدم» | 5 | 8 | 3 jobs |
| `marketing` | «التسويق الرقمي» | 5 | 7 | 3 jobs |
| `business` | «الأعمال والمشاريع» | 5 | 7 | 3 jobs |
| `hr` | «الموارد البشرية» | 5 | 7 | 3 jobs |
| `professional` | «المهارات المهنية» | 5 | 7 | none: a foundation field whose skills appear inside the other jobs |
| **Total** | | **38** | **59** | **20** |

This order is the display order everywhere (tree, filters, CV results).

### 9.2 The 38 skills

"Stars" is the number of star slots the skill has (and so the number of courses for it). Prerequisites are always inside the same field. A prerequisite is satisfied by one star.

| Skill id | Name | Field | Stars | Prerequisites |
|---|---|---|---|---|
| `excel` | Excel | data | 3 | none |
| `sql` | SQL | data | 3 | `excel` |
| `statistics` | الإحصاء | data | 2 | `excel` |
| `powerbi` | Power BI | data | 3 | `excel` |
| `dataviz` | تصوير البيانات | data | 1 | `powerbi` |
| `python-data` | تحليل البيانات بـ Python | data | 1 | `sql`, `statistics` |
| `ml` | تعلّم الآلة | data | 1 | `python-data` |
| `programming` | أساسيات البرمجة | software | 2 | none |
| `html-css` | HTML و CSS | software | 1 | none |
| `git` | Git | software | 1 | `programming` |
| `javascript` | JavaScript | software | 3 | `html-css`, `programming` |
| `react` | React | software | 1 | `javascript` |
| `apis` | واجهات API | software | 1 | `programming`, `git` |
| `design-basics` | أساسيات التصميم | design | 1 | none |
| `figma` | Figma | design | 3 | `design-basics` |
| `ux-research` | بحث المستخدم | design | 1 | `design-basics` |
| `ui-design` | تصميم الواجهات | design | 2 | `figma` |
| `prototyping` | النماذج التفاعلية | design | 1 | `ui-design` |
| `marketing-basics` | أساسيات التسويق | marketing | 1 | none |
| `content` | كتابة المحتوى | marketing | 2 | `marketing-basics` |
| `social-media` | إدارة وسائل التواصل | marketing | 2 | `marketing-basics` |
| `seo` | تحسين محركات البحث (SEO) | marketing | 1 | `content` |
| `ads` | الإعلانات المدفوعة | marketing | 1 | `social-media` |
| `project-management` | إدارة المشاريع | business | 2 | none |
| `accounting` | المحاسبة | business | 1 | none |
| `agile` | Agile | business | 1 | `project-management` |
| `business-analysis` | تحليل الأعمال | business | 1 | `project-management` |
| `financial-analysis` | التحليل المالي | business | 2 | `accounting` |
| `hr-basics` | أساسيات الموارد البشرية | hr | 2 | none |
| `recruitment` | الاستقطاب والتوظيف | hr | 2 | `hr-basics` |
| `labor-law` | أنظمة العمل | hr | 1 | `hr-basics` |
| `training-dev` | التدريب والتطوير | hr | 1 | `hr-basics` |
| `payroll` | الرواتب والمزايا | hr | 1 | `labor-law` |
| `communication` | التواصل الفعّال | professional | 2 | none |
| `english` | الإنجليزية المهنية | professional | 2 | none |
| `problem-solving` | حل المشكلات | professional | 1 | none |
| `presentation` | العرض والتقديم | professional | 1 | `communication` |
| `teamwork` | العمل الجماعي | professional | 1 | `communication` |

Three stars: `excel`, `sql`, `powerbi`, `javascript`, `figma` (5 skills, 15 slots). Two stars: `statistics`, `programming`, `ui-design`, `content`, `social-media`, `project-management`, `financial-analysis`, `hr-basics`, `recruitment`, `communication`, `english` (11 skills, 22 slots). One star: the other 22. Total 59.

Each skill also needs a one-line description (what it is, in under 15 words) for the skill panel.

**Aliases** (the names the CV analyser looks for). Every skill has an alias list in Arabic and English. Rules:
- An alias is a distinctive name or phrase. These bare words are **never** an alias on their own: تحليل · بيانات · تصميم · مشروع · إدارة · كتابة · تقارير · تطوير · تدريب · مبيعات · نظام · عرض · تقديم · عمل · فريق.
- Aliases the demo depends on, to be used exactly:

| Skill | Aliases |
|---|---|
| `excel` | Excel · إكسل · اكسل · الجداول المحورية · Pivot |
| `sql` | SQL · MySQL · PostgreSQL · قاعدة بيانات · قواعد البيانات · استعلامات |
| `statistics` | الإحصاء · إحصاء · إحصائي · statistics · SPSS |
| `programming` | البرمجة · برمجة · Python · بايثون · Java · C++ · C# |
| `english` | الإنجليزية · الانجليزية · English · IELTS · TOEFL |
| `communication` | التواصل · مهارات الاتصال · communication |
| `presentation` | العرض والتقديم · مهارات العرض · الإلقاء · عروض تقديمية · PowerPoint |
| `teamwork` | العمل الجماعي · العمل ضمن فريق · روح الفريق · teamwork |
| `powerbi` | Power BI · PowerBI · باور بي آي |
| `dataviz` | تصوير البيانات · لوحة معلومات · لوحات المعلومات · رسوم بيانية · dashboard · Tableau |
| `python-data` | pandas · NumPy · تحليل البيانات بـ Python |
| `social-media` | التواصل الاجتماعي · وسائل التواصل · social media |
| `training-dev` | التدريب والتطوير · البرامج التدريبية · تطوير الموظفين |
| `content` | كتابة المحتوى · صناعة المحتوى · copywriting |
| `project-management` | إدارة المشاريع · إدارة مشروع · PMP |

- For the other skills the builder writes aliases in the same spirit, and then runs the acceptance test of 6.2: the sample CV must return exactly its eight skills.

### 9.3 The 20 jobs

Every job has: id, title, field, city, experience band, a fictional company (9.7), exactly five required skills with stars, one summary sentence and three task lines. No salary, no posting date, no applicant counts. The order below is the data order (it breaks ties).

Experience bands and their labels: `entry` «حتى سنة خبرة» · `junior` «خبرة 1-3 سنوات» · `mid` «خبرة 3 سنوات فأكثر». City ids: `riyadh` «الرياض» · `jeddah` «جدة» · `dammam` «الدمام» · `remote` «عن بُعد».

The last two columns are checks: the number of roadmap stages before any CV (with preparatory stages in brackets), and the match the sample CV must give.

| # | Job id | Title | Field | City | Band | Company | Required skills (id:stars, in roadmap order) | Stages | Sample-CV match |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `data-analyst-riyadh` | محلل بيانات | data | riyadh | entry | وادي الغيم للبيانات | excel:2 · sql:2 · powerbi:1 · statistics:2 · communication:1 | 8 | 70% |
| 2 | `bi-analyst-riyadh` | محلل ذكاء الأعمال | data | riyadh | junior | عدسة الشفق الأزرق للتحليلات | excel:2 · sql:3 · powerbi:3 · dataviz:1 · statistics:2 | 11 | 43% |
| 3 | `reporting-specialist-jeddah` | أخصائي تقارير وبيانات | data | jeddah | entry | مرفأ الحوت الأبيض للخدمات اللوجستية | excel:2 · powerbi:1 · statistics:2 · dataviz:1 · communication:1 | 7 | 50% |
| 4 | `junior-data-scientist-remote` | عالِم بيانات مبتدئ | data | remote | junior | مختبر النجم الثامن | sql:2 · statistics:2 · python-data:1 · ml:1 · problem-solving:1 | 8 (1) | 30% |
| 5 | `frontend-developer-riyadh` | مطوّر واجهات أمامية | software | riyadh | entry | سحابة اللوز للتقنية | html-css:1 · javascript:2 · react:1 · git:1 · english:1 | 7 (1) | 20% |
| 6 | `backend-developer-riyadh` | مطوّر واجهات خلفية | software | riyadh | junior | ورشة الخيط الفضي للبرمجيات | programming:2 · git:1 · apis:1 · sql:2 · problem-solving:1 | 8 (1) | 30% |
| 7 | `web-app-developer-remote` | مطوّر تطبيقات ويب | software | remote | mid | شرفة الياسمين الرقمية | javascript:3 · react:1 · git:1 · apis:1 · teamwork:1 | 10 (3) | 20% |
| 8 | `qa-tester-dammam` | مختبِر برمجيات | software | dammam | entry | قلعة الموج الهادئ للأنظمة | programming:2 · git:1 · problem-solving:1 · english:1 · teamwork:1 | 7 (1) | 50% |
| 9 | `ui-ux-designer-riyadh` | مصمّم واجهات وتجربة مستخدم | design | riyadh | entry | استوديو ظل النخلة | design-basics:1 · figma:2 · ui-design:1 · ux-research:1 · presentation:1 | 7 (1) | 20% |
| 10 | `product-designer-jeddah` | مصمّم منتجات رقمية | design | jeddah | mid | دار الطاووس للمنتجات الرقمية | figma:3 · ui-design:2 · prototyping:1 · ux-research:1 · communication:2 | 10 (1) | 10% |
| 11 | `ux-researcher-remote` | باحث تجربة المستخدم | design | remote | entry | خيمة البوصلة للأبحاث | design-basics:1 · ux-research:1 · figma:1 · statistics:1 · presentation:1 | 7 (2) | 40% |
| 12 | `digital-marketing-specialist-riyadh` | أخصائي تسويق رقمي | marketing | riyadh | entry | قنديل البحر للتسويق | marketing-basics:1 · social-media:2 · content:1 · ads:1 · excel:1 | 6 | 20% |
| 13 | `content-writer-jeddah` | كاتب محتوى | marketing | jeddah | entry | محبرة الغروب للمحتوى | marketing-basics:1 · content:2 · seo:1 · english:2 · communication:1 | 7 | 40% |
| 14 | `digital-ads-specialist-dammam` | أخصائي إعلانات رقمية | marketing | dammam | junior | سوق الطائرة الورقية للتجارة الإلكترونية | marketing-basics:1 · social-media:2 · ads:1 · seo:1 · excel:2 | 8 (1) | 20% |
| 15 | `business-analyst-riyadh` | محلل أعمال | business | riyadh | entry | ركن الحبر الأخضر للاستشارات | project-management:1 · business-analysis:1 · excel:2 · sql:1 · english:2 | 7 | 60% |
| 16 | `project-coordinator-jeddah` | منسّق مشاريع | business | jeddah | entry | قافلة الفجر للمشاريع | project-management:2 · agile:1 · communication:2 · teamwork:1 · excel:1 | 7 | 50% |
| 17 | `financial-analyst-riyadh` | محلل مالي | business | riyadh | junior | دفاتر الزمرد للمحاسبة | accounting:1 · financial-analysis:2 · excel:3 · presentation:1 · english:2 | 10 (1) | 53% |
| 18 | `hr-specialist-riyadh` | أخصائي موارد بشرية | hr | riyadh | entry | مظلة الريحان للخدمات | hr-basics:2 · labor-law:1 · payroll:1 · communication:2 · excel:1 | 7 | 30% |
| 19 | `recruiter-jeddah` | أخصائي استقطاب وتوظيف | hr | jeddah | junior | بوابة الحصان الأزرق للمواهب | hr-basics:1 · recruitment:2 · communication:2 · english:2 · teamwork:1 | 8 | 50% |
| 20 | `training-coordinator-dammam` | منسّق تدريب وتطوير | hr | dammam | entry | بيت القمر السابع للتدريب | hr-basics:1 · training-dev:1 · recruitment:1 · communication:2 · presentation:1 | 6 | 30% |

Job titles are written in the masculine generic form, as job titles are advertised. Cities: 9 jobs in الرياض, 5 in جدة, 3 in الدمام, 3 «عن بُعد». Bands: 12 entry, 6 junior, 2 mid.

**Job text rules.** The summary is one sentence of at most 25 words saying what the person does. Each task line is at most 10 words and uses the job's own skills. No real product or company names beyond the skill names themselves, no numbers about the market. The demo job's text, to be used as written:
- Summary: «تحوّل بيانات المبيعات والعمليات إلى تقارير ولوحات معلومات تساعد الفرق على اتخاذ القرار.»
- Tasks: «استخراج البيانات بـ SQL وتنظيفها في Excel» · «بناء لوحات معلومات بـ Power BI ومتابعتها أسبوعياً» · «عرض النتائج على الفرق بلغة واضحة»

### 9.4 The 59 courses

**Rules.**
- Exactly one course per star slot. Course id: `c-{skill id}-{star}`. It grants that star of that skill and nothing else.
- Hours: one of 6, 8, 10, 12, 14, 16, as listed below. XP = 20 × hours (8.2). The number of lessons follows from the hours (8.2).
- Each course has: a title (its short title is the part before the colon), a two-sentence description (what you learn; what you can do afterwards), and its lesson titles. Lesson titles are short noun phrases, in learning order, the last one a small result the learner produces.
- No provider, instructor, rating, price or enrolment count: none of that is real.

| Course id | Title | Hours |
|---|---|---|
| `c-excel-1` | Excel من الصفر: الجداول والمعادلات | 8 |
| `c-excel-2` | Excel للتحليل: الجداول المحورية والدوال | 10 |
| `c-excel-3` | Excel الاحترافي: النمذجة و Power Query | 14 |
| `c-sql-1` | أساسيات SQL: الاستعلام عن البيانات | 8 |
| `c-sql-2` | SQL للتحليل: الربط والتجميع | 12 |
| `c-sql-3` | SQL المتقدم: دوال النوافذ وتحسين الاستعلامات | 16 |
| `c-statistics-1` | مبادئ الإحصاء الوصفي | 8 |
| `c-statistics-2` | الإحصاء التطبيقي للمحللين | 12 |
| `c-powerbi-1` | أساسيات Power BI: من البيانات إلى لوحة المعلومات | 10 |
| `c-powerbi-2` | Power BI المتوسط: نمذجة البيانات و DAX | 12 |
| `c-powerbi-3` | Power BI الاحترافي: لوحات تنفيذية متكاملة | 16 |
| `c-dataviz-1` | تصوير البيانات: اختيار الرسم المناسب | 6 |
| `c-python-data-1` | تحليل البيانات بـ Python و pandas | 10 |
| `c-ml-1` | مدخل إلى تعلّم الآلة | 10 |
| `c-programming-1` | أساسيات البرمجة بـ Python | 10 |
| `c-programming-2` | البرمجة الكائنية وهياكل البيانات | 12 |
| `c-html-css-1` | بناء صفحات الويب بـ HTML و CSS | 8 |
| `c-git-1` | إدارة النسخ بـ Git | 6 |
| `c-javascript-1` | أساسيات JavaScript | 10 |
| `c-javascript-2` | JavaScript الحديثة والتعامل مع البيانات | 12 |
| `c-javascript-3` | JavaScript المتقدمة: الأداء والأنماط | 16 |
| `c-react-1` | بناء الواجهات بـ React | 10 |
| `c-apis-1` | تصميم واجهات API وربطها بقواعد البيانات | 10 |
| `c-design-basics-1` | أساسيات التصميم: اللون والخط والتكوين | 8 |
| `c-figma-1` | Figma من الصفر | 8 |
| `c-figma-2` | Figma المتوسط: المكوّنات والأنماط | 10 |
| `c-figma-3` | Figma الاحترافي: أنظمة التصميم | 14 |
| `c-ux-research-1` | بحث المستخدم: المقابلات واختبارات الاستخدام | 8 |
| `c-ui-design-1` | تصميم واجهات التطبيقات | 10 |
| `c-ui-design-2` | تصميم الواجهات المتقدم: الحالات والتجاوب | 12 |
| `c-prototyping-1` | النماذج التفاعلية واختبارها | 8 |
| `c-marketing-basics-1` | أساسيات التسويق الرقمي | 8 |
| `c-content-1` | كتابة المحتوى التسويقي | 8 |
| `c-content-2` | استراتيجية المحتوى وسرد القصص | 10 |
| `c-social-media-1` | إدارة حسابات التواصل الاجتماعي | 8 |
| `c-social-media-2` | حملات التواصل الاجتماعي وقياس أدائها | 10 |
| `c-seo-1` | تحسين محركات البحث من الأساس | 8 |
| `c-ads-1` | الإعلانات المدفوعة: من الإعداد إلى القياس | 10 |
| `c-project-management-1` | أساسيات إدارة المشاريع | 8 |
| `c-project-management-2` | إدارة المشاريع التطبيقية: التخطيط والمخاطر | 12 |
| `c-agile-1` | العمل بمنهجية Agile | 6 |
| `c-business-analysis-1` | تحليل الأعمال وجمع المتطلبات | 8 |
| `c-accounting-1` | المحاسبة لغير المحاسبين | 8 |
| `c-financial-analysis-1` | مدخل إلى التحليل المالي | 10 |
| `c-financial-analysis-2` | التحليل المالي التطبيقي: القوائم والنسب | 12 |
| `c-hr-basics-1` | أساسيات الموارد البشرية | 8 |
| `c-hr-basics-2` | إدارة عمليات الموارد البشرية | 10 |
| `c-recruitment-1` | الاستقطاب والتوظيف: من الإعلان إلى العرض | 8 |
| `c-recruitment-2` | المقابلات المبنية على الكفاءات | 10 |
| `c-labor-law-1` | مدخل إلى أنظمة العمل | 8 |
| `c-payroll-1` | الرواتب والمزايا | 8 |
| `c-training-dev-1` | تصميم برامج التدريب والتطوير | 8 |
| `c-communication-1` | التواصل الفعّال في بيئة العمل | 6 |
| `c-communication-2` | التواصل المتقدم: الإقناع وإدارة الحوار | 10 |
| `c-english-1` | الإنجليزية المهنية: المراسلات والاجتماعات | 10 |
| `c-english-2` | الإنجليزية المهنية المتقدمة: التقارير والعروض | 12 |
| `c-presentation-1` | العرض والتقديم بثقة | 6 |
| `c-teamwork-1` | العمل الجماعي وإدارة الوقت | 6 |
| `c-problem-solving-1` | حل المشكلات واتخاذ القرار | 6 |

Total: 59 courses, 566 hours.

**The two demo courses, in full.**

`c-powerbi-1` · 10 hours · 200 XP · grants Power BI star 1.
Description: «تتعلّم ربط البيانات وتنظيفها وبناء تقارير تفاعلية في Power BI. تخرج منها بلوحة معلومات كاملة تستطيع عرضها.»
Lessons: 1 «التعرّف على واجهة Power BI» · 2 «ربط مصادر البيانات وتنظيفها» · 3 «بناء أول تقرير تفاعلي» · 4 «المقاييس والحسابات الأساسية» · 5 «نشر لوحة المعلومات ومشاركتها»

`c-statistics-2` · 12 hours · 240 XP · grants الإحصاء star 2.
Description: «تنتقل من وصف البيانات إلى الاستنتاج منها بثقة. تخرج منها قادراً على اختبار فرضية وشرح نتيجتها.»
Lessons: 1 «التوزيعات ومقاييس التشتت» · 2 «العيّنات وفترات الثقة» · 3 «اختبار الفرضيات» · 4 «الارتباط والانحدار البسيط» · 5 «عرض النتائج لغير المختصين»

### 9.5 The sample leaderboard users

24 fictional people, twelve women and twelve men, shown as a first name and one family initial. Fixed values. The board ranks by XP this week; the total is kept only to derive the level shown in the row (8.3). Avatar ids are from 9.6.

| Id | Name | City | Avatar | Total XP | Level | XP this week | Weekly rank |
|---|---|---|---|---|---|---|---|
| `u01` | نورة ع. | الرياض | `av-05` | 3120 | 7 | 560 | 7 |
| `u02` | فيصل ق. | جدة | `av-09` | 2740 | 7 | 980 | 1 |
| `u03` | ريم ح. | الدمام | `av-06` | 2380 | 6 | 440 | 9 |
| `u04` | عبدالله ش. | الرياض | `av-12` | 2150 | 6 | 790 | 4 |
| `u05` | لمى د. | المدينة المنورة | `av-05` | 1890 | 6 | 250 | 14 |
| `u06` | سلطان م. | الرياض | `av-10` | 1720 | 6 | 910 | 2 |
| `u07` | جود ز. | جدة | `av-07` | 1540 | 5 | 340 | 11 |
| `u08` | تركي غ. | أبها | `av-10` | 1410 | 5 | 640 | 6 |
| `u09` | هيفاء ب. | الخبر | `av-07` | 1280 | 5 | 190 | 17 |
| `u10` | مشعل ر. | الرياض | `av-11` | 1150 | 5 | 860 | 3 |
| `u11` | دانة ف. | مكة المكرمة | `av-06` | 1040 | 5 | 120 | 20 |
| `u12` | راكان س. | الدمام | `av-09` | 960 | 4 | 720 | 5 |
| `u13` | شهد ن. | الرياض | `av-08` | 880 | 4 | 310 | 12 |
| `u14` | بندر ط. | تبوك | `av-11` | 810 | 4 | 480 | 8 |
| `u15` | غادة ي. | جدة | `av-07` | 740 | 4 | 70 | 22 |
| `u16` | ماجد ك. | بريدة | `av-12` | 670 | 4 | 370 | 10 |
| `u17` | أسيل ج. | الرياض | `av-06` | 590 | 3 | 230 | 15 |
| `u18` | نواف ه. | الطائف | `av-09` | 520 | 3 | 280 | 13 |
| `u19` | رغد ص. | الدمام | `av-08` | 460 | 3 | 160 | 18 |
| `u20` | يزيد ل. | الرياض | `av-10` | 390 | 3 | 210 | 16 |
| `u21` | ملاك و. | جدة | `av-05` | 330 | 2 | 140 | 19 |
| `u22` | سعود ت. | حائل | `av-11` | 260 | 2 | 90 | 21 |
| `u23` | لين أ. | الرياض | `av-08` | 190 | 2 | 40 | 23 |
| `u24` | عمر خ. | جازان | `av-12` | 120 | 1 | 20 | 24 |

- The rank column is the rank among the 24 before the signed-in user is placed. Top three: فيصل ق. 980 · سلطان م. 910 · مشعل ر. 860.
- **Avatars.** The twelve women use `av-05` to `av-08` and the twelve men `av-09` to `av-12`, three people each, dealt in weekly-rank order, so no two neighbours on the board share an avatar. No sample user uses `av-01` to `av-04`: those are the neutral defaults of new accounts (9.6), so the signed-in user's default never repeats a sample row.
- A row shows «المستوى {n}» with no title (3.12).

### 9.6 Avatars

- The design team draws **12 avatars**, ids `av-01` to `av-12`, in one visual language with the logo and the icons. (The design exploration was briefed for 8; the product needs 12.)
- **Which is which.** `av-01` to `av-04` are neutral figures with no gender cues; `av-05` to `av-08` are women; `av-09` to `av-12` are men. As a set they let any user find one that suits them.
- **The default is always neutral.** For a new account: add the Unicode code points of the characters of the name, take the remainder of dividing by 4, add 1. «خالد»: 1582 + 1575 + 1604 + 1583 = 6344, remainder 0 → `av-01`. «محمد»: 1605 + 1581 + 1605 + 1583 = 6374, remainder 2 → `av-03`. So nobody is handed an avatar of the wrong gender on first sign-in; the user picks any of the twelve in the profile.
- The avatar shows in: the user chip, the profile, the leaderboard (podium, rows, my card), the sign-in account chips, the user's side of the advisor thread, and the application sent by «دليل».
- «دليل» has its own glyph, which is not one of the twelve.

### 9.7 Fictional company naming rules

- Every company is invented for this demo. A name is an image (a place or a thing, with something from nature, a colour or a number: «وادي الغيم», «قنديل البحر», «مرفأ الحوت الأبيض») followed by its activity («للبيانات», «للتسويق»). The poetic image makes it read as plainly fictional. Names written from now on use a three-word image, which collides with real names far less often.
- Never in a company name: «السعودية», «الوطنية», «العربية», «الخليج», «المملكة»; a word that reads as a public body (ديوان، مجلس، مرصد، هيئة، وزارة، صندوق، أمانة); a bank or telecom word; a family name; the name of the organiser of the hackathon; any employer brand; a word that is by itself the trading name of a company or group a judge would know.
- Words removed in version 2 for that last reason: السنبلة، المرجان، سدرة (found by a critic's web search to be a food group, a Jeddah group and a Riyadh housing community) and جسر، فنار، البرق، السديم، النيزك (from memory, not searched). Not used in the replacements for the same reason: رواق، ندى، السنديان.
- Wherever a company name is shown it carries the tag «جهة تجريبية».
- The same rule covers the two organisations inside the sample CV («جامعة التلال السبع», «متجر الفانوس النحاسي»), which carry «(جهة تجريبية)» in the text itself.
- **State of checking, stated honestly.** One general web search each, on the exact phrase, found no organisation for: «وادي الغيم», «مرفأ الحوت الأبيض», «ركن الحبر الأخضر», «الفانوس النحاسي» as a shop, «عدسة الشفق». That is weak evidence, not a check against a company register. The other names in 9.3 and «جامعة التلال السبع» were not searched. Before any screenshot leaves the laptop, the lead searches each remaining name once; any that turns out to belong to a real organisation is replaced under the same rule.

### 9.8 Checks the data must pass

1. 7 fields; 38 skills split 7 / 6 / 5 / 5 / 5 / 5 / 5; star slots total 59.
2. 59 courses, one per star slot, ids `c-{skill}-{star}`; hours as listed; 566 hours in total.
3. 20 jobs, five skills each; no job asks for more stars than the skill has; every one of the 38 skills is required by at least one job.
4. The sample CV, read by the local analyser, returns exactly the eight skills of 6.2 with those stars and evidence lines.
5. With those eight skills, the match of every job equals the last column of 9.3, and «محلل بيانات» is the only job at 70% or more.
6. The onboarding answers of 4.6 give «محلل بيانات» (100), then «أخصائي تقارير وبيانات» (90) and «محلل أعمال» (47) as alternatives.
7. Leaderboard: 24 users; totals all different; weekly values all different and never above the total; levels match 8.3; no two weekly neighbours share an avatar; no sample user uses `av-01` to `av-04`.
8. No real organisation, no statistic, no salary, and no employer brand anywhere in the data.
9. The three jobs of the demo reveal: «محلل بيانات» 8 stages and 74 hours (8 + 8 + 10 + 8 + 6 + 10 + 12 + 12); «أخصائي تقارير وبيانات» 7 stages and 60 hours; «محلل أعمال» 7 stages and 64 hours.

### 9.9 Brand and icon inventory (for the design team)

He asked for a logo, custom icons and designed avatars. This is everything the screens need; the ids are final. No stock icon pack is used anywhere, and no emoji stands in for an icon.

| Group | Count | Items |
|---|---|---|
| Logo | 4 forms | the mark alone · the mark with the wordmark «دليلك» on one line · `icon.svg` for the browser tab · a one-colour form |
| «دليل» glyph | 2 states, 2 sizes | still, and thinking (a loop: `thinking-glyph`, 3.14), each at 20 px and 40 px |
| Avatars | 12 | `av-01` to `av-12`: four neutral, four women, four men (9.6) |
| Navigation icons | 9 | `path` · `skills` · `learn` · `cv` · `jobs` · `applications` · `leaderboard` · `profile` · `more` |
| Field icons | 7 | one per field id (9.1). A skill node shows its field's icon: there are no per-skill icons |
| Game icons | 12 | `xp` · `level` · `streak` · `star-empty` · `star-full` · `trophy` · `lock` · `done` · `here-marker` · `gate` · `branch` · `rank-up` |
| Action icons | 14 | `send` · `stop` · `close` · `back` · `search` · `filter` · `upload` · `file` · `edit` · `retry` · `new-chat` · `sign-out` · `reset` · `chevron` |
| Meta icons | 9 | `city` · `remote` · `hours` · `lessons` · `experience` · `company` · `quote` · `sample-tag` · `warning` |
| Badge emblems | 12 | one per badge id (8.6), each with a locked form |
| Level emblems | 7 | one per level title (8.3) |

In all: 51 icons, 19 emblems, 12 avatars, the glyph and the logo. The design exploration was briefed for 20 icons and 8 avatars; this list replaces that brief. If time runs short, the order of need is: logo and glyph, navigation, game, avatars, action, field, meta, then the emblems (badges and levels can share one emblem shape with a game icon inside until their own art is ready).

---

## 10. The 2-minute demo script

### 10.1 Before starting

- **Build.** The stage run uses a production build (`npm run demo`: build, then start on port 3040), never the dev server. Each of the 12 routes is opened once beforehand, so nothing is compiled or fetched for the first time on stage.
- **Mode.** The script makes no call to an AI provider in any mode: onboarding chips are local (4.5), the sample CV is always read locally (6.1), and the one request to «دليل» is executed by the router (5.5 rule 1). On stage, run with `AI_PROVIDER=local` unless the key was tested on the venue's network the same day; the panel then shows «وضع محلي: دليل يعمل دون اتصال.» With a key, free questions after the script go to the model, and if the network is down the local brain answers within 2.5 s.
- **Browser.** Desktop window, 1440 px wide. Keyboard layout on Arabic before starting (steps 1 and 11 are typed; on a Latin layout the name comes out as Latin letters and is still accepted). The six recovery links of 10.2 are in the bookmarks bar.
- **Start.** Open `http://localhost:3040/?seed=fresh`. It clears every earlier run in this browser.
- **Acceptance for QA.** The whole script passes three times with the same screens and numbers: in local mode; with a key and the network on; with a key and the network adapter off. In the offline runs the console shows no failed request. Every number below is forced by sections 8 and 9, and checked in 10.4. **There is no key on this laptop yet (18 Nov):** until one is pasted into `.env.local`, only the local-mode run can be done; the two keyed runs are reported as "not run", never as passed.

### 10.2 The script

| # | Clock | Do (test id) | What appears, with the numbers |
|---|---|---|---|
| 1 | 0:00 | Type «خالد» in `signin-name`, press `signin-submit` («ابدأ رحلتك») | The showcase was moving on the right. `/welcome` opens: «أهلاً خالد، أنا دليل، دليلك إلى وظيفتك. سأكون معك من أول خطوة إلى آخرها.» then «…نبدأ: في أي مدينة أنت الآن؟» |
| 2 | 0:06 | Tap six chips: `welcome-chip-city-riyadh` · `welcome-chip-education-bachelor` · `welcome-chip-major-mis` · `welcome-chip-experience-none` · `welcome-chip-interest-data` · `welcome-chip-priority-first-job` | After each tap an acknowledgement and the next question. In order: «تمام، الرياض. وهناك أيضاً فرص عن بُعد إن أحببت.» · «بكالوريوس، ممتاز. أساس نبني عليه.» · «جميل، نظم معلومات إدارية. فيه مهارات كثيرة تُحسب لك من الآن.» · «ولا يهمّك، كلنا بدأنا من هنا. سأختار لك وظائف تناسب البدايات.» · «الأرقام والبيانات، اختيار جميل. من يقرأ الأرقام يُسمع رأيه.» · «أول وظيفة، أولوية واضحة. سأختار لك أقصر طريق إليها.» Then «شكراً يا خالد، اكتملت الصورة. لحظات وأرسم لك مسارك.» The slots of «ملفك يتكوّن» fill one by one |
| 3 | 0:27 | Watch | The closing line holds 1.2 s, then the path-reveal sequence, 7.8 s, six lines ending «مسارك جاهز.» The drawn path stays on screen: Excel ★ · SQL ★ · Power BI ★ · الإحصاء ★ · التواصل الفعّال ★ · Excel ★★ · SQL ★★ · الإحصاء ★★ → the trophy «محلل بيانات» |
| 4 | 0:37 | Press `reveal-accept` («ابدأ هذا المسار») | The result showed «محلل بيانات» · «وادي الغيم للبيانات · الرياض» · reasons «يوافق اهتمامك: الأرقام والبيانات», «قريب من تخصصك: نظم معلومات إدارية», «مناسب للبدايات» · «8 مراحل · 74 ساعة تعلّم» · alternatives «أخصائي تقارير وبيانات» (7 مراحل · 60 ساعة تعلّم) and «محلل أعمال» (7 مراحل · 64 ساعة تعلّم). Now `/path`: the rest of the result leaves, the path strip stays and the map opens out of it (`map-open` in full). When it ends: toast «+80 XP · التعارف واختيار الهدف» (no rank line: 8.7) with the badge toasts «الخطوة الأولى» and «صاحب هدف» stacked under it. User chip: «المستوى 1 · مبتدئ», 80 / 150 XP, streak 1. Match 0%. «0 من 8 مراحل · 74 ساعة تعلّم». The start gate «اكتشف مهاراتك» is lit. Leaderboard preview: فيصل ق. 980 · سلطان م. 910 · مشعل ر. 860, then «خالد · أنت» at rank 22 with 80 XP |
| 5 | 0:43 | Press `path-next-step-action` («ارفع سيرتك الذاتية») | `/cv` in the input state |
| 6 | 0:46 | Press `cv-sample`, then `cv-analyse` | The sample CV writes itself in; then the analysis show, 7.0 s: the Excel and SQL sentences light up, eight tags collect, stars fill. Results: «في السيرة التجريبية 8 مهارات» (Excel 2 stars, SQL 2, الإحصاء 1, أساسيات البرمجة 1, الإنجليزية المهنية 2, التواصل الفعّال 1, العرض والتقديم 1, العمل الجماعي 1, each with its sentence). «مطابقتك مع هدفك «محلل بيانات»: 70%». Jobs: محلل بيانات 70% · محلل أعمال 60% · محلل مالي 53%. Then, together: toast «+100 XP · حلّلت سيرتك · صعدت إلى المركز 18 هذا الأسبوع» (total **180 XP**), level-up «المستوى 2 · مستكشف · بقي 170 XP للمستوى 3», badge toast «سيرة مقروءة» |
| 7 | 0:58 | Press `cv-go-path` («اذهب إلى مساري») | The level-up, if still open, closes on this click and the click goes through. `/path` plays `catch-up` (2.4 s, in place of the short `map-open`): six stages turn done one after another, the marker «أنت هنا» travels to stage 7, the ring counts from 0% to **70%**. «6 من 8 مراحل · بقي 22 ساعة تعلّم». Card: «خطوتك التالية» · «دورة «أساسيات Power BI» · 10 ساعات · +200 XP · ترفع مطابقتك إلى 90%» |
| 8 | 1:04 | Click `path-stage-7` (Power BI), press `path-stage-start` («ابدأ الدورة») | The stage sheet: «المرحلة 7: Power BI» · «أساسيات Power BI» · 10 ساعات · +200 XP · +20%. The course page opens already started |
| 9 | 1:09 | Press `course-complete` («أكمل الدورة») | The five lessons tick in a run; then the **celebration** (5.0 s): «أكملت الدورة» · «+200 XP» (180 → **380**) · «Power BI: النجمة 1 من 3» · the ring rises **from 70% to 90%** · «مستوى جديد: 3 · مجتهد» · «شارات جديدة: أول دورة · ضمن العشرة الأوائل» · «صعدت 8 مراكز: المركز 10 هذا الأسبوع» |
| 10 | 1:17 | Press `celebration-close` («رجوع لمساري») | `/path` with the short `map-open`: ring 90%, «7 من 8 مراحل · بقي 12 ساعة تعلّم», stage 7 done «من دورة», stage 8 «الإحصاء ★★» is now the lit one. User chip: «المستوى 3 · مجتهد», 380 / 600 XP. Leaderboard preview: the same top three, then «خالد · أنت» at rank 10 with 380 XP |
| 11 | 1:21 | Press `shell-advisor-launcher`; type «قدّم لي على وظيفة محلل بيانات» in `advisor-input`, press Enter | The panel docks beside the page (`panel-open`) and the sent bubble pops out of the composer. «دليل» opens the job page (ring 90%; «ما ينقصك»: الإحصاء), the apply sheet opens and fills itself while the status lines roll («أفتح نموذج التقديم…» → «أكتب بياناتك…» → «أرسل الطلب…»): خالد · الرياض · بكالوريوس · نظم معلومات إدارية · Excel, SQL, Power BI, التواصل الفعّال · the note of 7.4. Confirmation: «رقم الطلب: DL-2026-0001» · «مطابقتك عند التقديم: 90%» · «+40 XP · تقديم مدروس». Then «دليل» replies as in example 4 of 5.6, with the application card. Toast «+40 XP · تقديم مدروس» (total **420 XP**; the rank stays 10, so no rank line), badge toast «أول تقديم» |
| 12 | 1:41 | Press `shell-nav-leaderboard` | The row «خالد · أنت» climbs from 18 to 10 (`row-climb`, 1.2 s). «مركزك 10 من 25» · «420 XP» · «يفصلك 20 XP عن المركز 9» · «صعدت 8 مراكز». Podium: فيصل ق. 980 · سلطان م. 910 · مشعل ر. 860 |
| 13 | 1:48 | If time allows: `shell-nav-skills`, then `shell-nav-profile` | Skill tree: «9 من 38 مهارة · 12 من 59 نجمة»; Power BI's first star fills and «تصوير البيانات» opens. Profile: «المستوى 3 · مجتهد» · «420 من 600 XP» · «الشارات 6 من 12»: الخطوة الأولى، صاحب هدف، سيرة مقروءة، أول دورة، ضمن العشرة الأوائل، أول تقديم · «سجل النقاط»: +40, +200, +100, +30, +50 |
| | 1:56 | Say the closing line | *"Upload your CV, and in seconds you know where you stand, where you're going, and the next step. Every step you take is real progress toward a real job."* (His line from the idea file, kept as he wrote it. Because every job in the demo is sample data, an alternative ending is offered for him to choose: *"…every step is measured progress toward the job you chose."*) |

**Where the time goes.** Waits the presenter cannot shorten except with Space: six onboarding replies (about 1 s each), the closing line and the reveal (9.0 s), the CV show (7.0 s), the celebration (5.0 s), the advisor's application (7.2 s). That is about 34 s of the 120; `map-open`, `catch-up` and `row-climb` do not block.

**The order protects what matters.** The headline (70% → 90%) lands at about 1:13, and the advisor's application is over by 1:41. A slip of fifteen seconds still leaves both inside two minutes. Step 13 is optional from the start. If the presenter falls behind the clock, cut in this order: step 13, then step 12, then the stage sheet in step 8 (press the card's «ابدأ الدورة», `path-next-step-action`, instead of opening the stage).

**If typing is a problem in step 11** (the keyboard is on the wrong layout): click the job title in the target header (`path-target-title`), then press «دع دليل يقدّم عنك» (`job-apply-advisor`). The same application runs with no typing.

**If a step goes wrong on stage**, open the next state from the bookmarks bar:

| To redo from | Open |
|---|---|
| step 5 (the CV) | `/cv?seed=onboarded` |
| steps 7 to 9 (the roadmap and the course) | `/path?seed=cv-analysed` |
| step 11 (the advisor applies) | `/path?seed=course-done` |
| step 12 | `/leaderboard?seed=mid-path` |
| step 13 | `/skills?seed=mid-path` · `/profile?seed=mid-path` |

Each link gives the numbers the presenter is about to say. One difference: in `mid-path` the statistics course is already started, so the next step reads «أكمل دورة…» where the live run reads «ابدأ دورة…».

### 10.3 Saved states ("seeds")

- `?seed={name}` on any URL **first deletes everything Dalilak saved in this browser** (every account, every thread, every flag), then writes exactly the row below, and removes the parameter from the URL. Nothing of a rehearsal survives a seed.
- It is applied before any guard or redirect: `/cv?seed=onboarded` opens `/cv`, also in a signed-out browser.
- An unknown seed name is ignored and removed from the URL.
- Except for `fresh`, every seed is the account «خالد» with avatar `av-01`, the onboarding answers of 4.6, the target `data-analyst-riyadh`, created today, streak 1, active today, all XP events dated now (so weekly XP equals total XP).
- Seeds are quiet unless the table says otherwise: every XP and badge entry is already marked announced, the advisor thread is empty, the nudge is marked shown, the full `map-open` is marked played (so a seed's first visit to `/path` plays the short form, or `catch-up` in `cv-analysed`), and the leaderboard has not been visited.

| Seed | XP · level | Stars · skills | Match | Courses | Applications | Badges | Weekly rank | Next step (2.8) | Waiting on load |
|---|---|---|---|---|---|---|---|---|---|
| `fresh` | no account, signed out | | | | | | | | opens `/` |
| `onboarded` | 80 · 1 مبتدئ | 0 · 0 | 0% | none | none | first-steps, goal-set (2) | 22 | rule 1: «ارفع سيرتك الذاتية» | nothing |
| `cv-analysed` | 180 · 2 مستكشف | 11 · 8 (the sample CV, marked as the sample) | 70% | none | none | + cv-scanned (3) | 18 | rule 3: «ابدأ دورة «أساسيات Power BI»» | `catch-up` has not played yet: the first visit to `/path` plays it |
| `course-done` | 380 · 3 مجتهد | 12 · 9 | 90% | `c-powerbi-1` completed | none | + first-course, top-ten (5) | 10 | rule 3: «ابدأ دورة «الإحصاء التطبيقي للمحللين»» | nothing |
| `mid-path` | 420 · 3 مجتهد | 12 · 9 | 90% | `c-powerbi-1` completed; `c-statistics-2` started, lessons 1-2 ticked | `data-analyst-riyadh`: DL-2026-0001, sent by «دليل», match then 90%, status `review` (fixed) | + first-application (6) | 10 | rule 2: «أكمل دورة «الإحصاء التطبيقي للمحللين»» | nothing |
| `job-ready` | 620 · 4 متمكّن | 13 · 9 | 100% | `c-powerbi-1` and `c-statistics-2` completed | none (so the 100% apply can be tested: it pays +40 → 660 XP) | first-steps, goal-set, cv-scanned, first-course, top-ten, job-ready (6) | 7 | rule 4: «قدّم على «محلل بيانات»» | nothing |
| `returning` | 420 · 3 مجتهد | as `mid-path` | 90% | as `mid-path` | as `mid-path` | as `mid-path` (6) | 10 | rule 2 | account created two days ago, streak 2, last active yesterday: the first app-shell load offers the **daily reward**, day 3, «استلم +60 XP» → 480 XP, streak 3, badge «ثلاثة أيام» (7), weekly rank 8 |

Notes for QA:
- In `returning` the older XP events are dated one and two days ago; if one of those days falls before Sunday, the weekly numbers are lower than shown (weekly XP counts this week only). After the claim the user's 480 XP equals بندر ط.'s 480: the user ranks above him (the tie rule of 8.7), which is why the rank is 8.
- The first visit to `/leaderboard` in a seed climbs from the rank before the most recent gain that improved the rank (8.7): `onboarded` 23 → 22 («صعدت مركزاً واحداً») · `cv-analysed` 22 → 18 · `course-done` and `mid-path` 18 → 10 · `job-ready` 10 → 7 · `returning`, after the claim, 10 → 8 («صعدت مركزين»).

### 10.4 The arithmetic of the script, checked

One row per step of 10.2. Each number was recomputed from sections 8 and 9 for this order.

| Step | Action | XP (gain → total) | Level | Match % | Weekly rank | Badges held |
|---|---|---|---|---|---|---|
| 1 | Sign in as «خالد» | 0 | 1 مبتدئ | (no target) | 25 | 0 |
| 2 | Six answers: `onboarding_completed` | +50 → 50 | 1 | (no target) | 23 | 1 |
| 3 | The reveal plays | 50 | 1 | (no target) | 23 | 1 |
| 4 | Target chosen: `target_set` (the toast shows the merged +80) | +30 → 80 | 1 | 0 | 22 | 2 |
| 5 | Open `/cv` | 80 | 1 | 0 | 22 | 2 |
| 6 | Sample CV analysed: `cv_analysed` | +100 → 180 | **2 مستكشف** | **70** | 18 | 3 |
| 7 | `catch-up` on `/path` | 180 | 2 | 70 | 18 | 3 |
| 8 | Course started (pays nothing) | 180 | 2 | 70 | 18 | 3 |
| 9 | «أساسيات Power BI» completed: 10 h × 20 | +200 → 380 | **3 مجتهد** | **90** | **10** | 5 |
| 10 | Back on `/path` | 380 | 3 | 90 | 10 | 5 |
| 11 | «دليل» applies at 90%: `job_applied` | +40 → 420 | 3 | 90 | 10 | 6 |
| 12 | Leaderboard | 420 | 3 | 90 | 10 | 6 |
| 13 | Skill tree, profile | 420 | 3 | 90 | 10 | 6 |

- **XP:** 50 + 30 + 100 + 200 + 40 = 420.
- **Levels** (8.3): 80 < 150 → 1. 150 ≤ 180 < 350 → 2, and 350 − 180 = 170 to level 3. 350 ≤ 380 ≤ 420 < 600 → 3.
- **Match** (7.2): after the CV 20 + 20 + 0 + 10 + 20 = 70; Power BI ★ adds 20 → 90. The application changes no star, so 90 stays.
- **Rank** (9.5): sample users with more weekly XP, plus one: 24 at 0 XP → 25; 22 → 23; 21 → 22; 17 → 18; 9 → 10 at both 380 and 420. The climb the celebration and the leaderboard announce is 18 − 10 = 8 places; the gap at 420 is 440 − 420 = 20 XP.
- **Badges:** 1 + 1 + 1 + 2 + 1 = 6 of 12. **Stars:** 11 after the CV, 12 after the course. **Skills with a star:** 8, then 9. **Hours left:** 74 before the CV, 22 after it (10 + 12), 12 after the course.
- **Forced waits:** reveal 1.2 + 7.8 = 9.0 s · CV show 7.0 s · celebration 5.0 s · application 7.2 s.

---

## 11. What is real, what is simulated, what is out of scope

### 11.1 Real (it actually computes)

- Reading a PDF, a Word file or pasted text and extracting its text, on this laptop, with nothing fetched from the network.
- Finding skills in that text, each with the sentence that proves it: by the local analyser always. With a key, a model may add skills the name lists missed; each is checked in code against the text, and stars are always set by the rule, never by the model.
- The match percentage, the gap, and the ranking of jobs: computed from the user's stars and each job's requirements by the formula of 7.2.
- The onboarding recommendation: computed from the six answers by the scoring rule of 4.6.
- The roadmap: built from the target job, the user's stars and the skill prerequisites.
- XP, levels, streak, daily reward, badges and the user's own leaderboard rank: computed by the rules of section 8 from what the user did.
- «دليل»: a router in code that executes requests (open a page, search jobs, apply, start a course, change the target) the same way in every mode. Behind it, a tool loop on an AI model answers free questions when a key is present, and fixed templates answer the common ones when it is not. Its page-opening and form-filling really drive the app.
- Everything the user does is saved in their browser and survives a reload, including a reload in the middle of a show.
- Privacy as it really is: with no key, nothing leaves this laptop. With a key, chat messages, a summary of the profile and the CV text go to the model provider for the reply, and the product says so (3.6, 3.13, 3.14).

### 11.2 Simulated (say so plainly if asked)

| What | The truth |
|---|---|
| Jobs and companies | 20 sample jobs at invented companies. No real employer is involved. |
| Courses | 59 sample courses with lesson titles only: no videos, no content. |
| Completing a course | A button. Nothing verifies that anything was learned. |
| Applying to a job | Creates a record inside the browser. Nothing is sent to anyone. |
| Application status | Advances by a timer and the match when sent (7.5). Nobody reviews anything. |
| Other leaderboard users | 24 invented people with fixed numbers. They never move. |
| Accounts | A name, saved in this browser only. No password, no server account, nothing shared between devices. |
| The path-reveal and CV-analysis shows | They present real results, but their length is choreography: the local computation is instant. |
| Streak and week | Follow the device's clock. |
| The sample CV | A fictional graduate's CV with invented organisations. |

### 11.3 Out of scope (not built; pitch extensions at most)

Real job feeds and real course providers · an employer or recruiter view · verifying that a course was completed · real authentication, passwords or a PIN · server-side accounts and syncing between devices · notifications outside the app (email, SMS, push) · editing the skills list by hand after an analysis · reading scanned CVs (image text recognition) · an English interface · public profiles, friends, following or comments · payments · an admin panel · analytics about real users · any statistic about the real labour market.

Cut in version 2 to protect the build time, none of them asked for: an all-time leaderboard tab · a search box in the courses catalogue · editing an onboarding answer after giving it · notification dots on the navigation · a second advisor nudge · model-written lines in onboarding · a preview of a course's effect on the job ring.

---

## 12. Readings: how ambiguous items in the request were read

| # | His words (or the gap) | How it was read |
|---|---|---|
| 1 | "login page that on the left be the sign in… and on right some moving things or pages about our website" | Physical left and right, even though the product is RTL. The moving things are the product's own components fed with the demo numbers, not illustrations, so the page shows what is really inside. |
| 2 | "sign in or log in or whatever" | Name only, as the idea file says. Typing a name that already has saved progress in this browser asks whether to continue or to start again; it never resumes silently. |
| 3 | "a chatbot asking you question to help decide the best path" | Six questions in a fixed order with quick-reply chips and free text. The idea file's four (city, education, major, experience) plus two that the choice needs: what kind of work attracts the user, and their priority now (called «الأولوية», because «الهدف» means the target job). |
| 4 | "responible and so good to you" | Read as *responsive* and warm: every message is answered at once (greetings, questions and off-topic remarks included), each answer is acknowledged by name, and nothing depends on the network. |
| 5 | "a great looking loading to show you the best path" | A 7.8-second sequence of six steps that shows the real answers, jobs and skills being narrowed down. It ends on a path, not on a job card: the line it draws stays on screen with the recommended job's stages named from «البداية» to the trophy, and two alternatives beside it. |
| 6 | The idea file picks the goal after the CV; the lead's journey picks it in onboarding | The lead's order is kept. The target comes from the conversation; the CV then shows how far along that path the user already is, and offers to change the target if another job fits better. The idea file's rewards are kept: +50 profile, +30 goal, +100 CV. |
| 7 | "like a game like Laracast" | A learning-paths product where progress is the game: a path of stages, courses that grant stars, XP, levels, streak, badges. Nothing of that product's look, name or text is used. |
| 8 | "he should help through the website like if you ask him anything in the website he open it to you" | «دليل» has a `navigate` tool for every page, and the page really opens while the chat stays. It also fills the application form in view of the user. |
| 9 | "you can let him apply jobs for you" | Every job offers «دع دليل يقدّم عنك» as its first button (job page, CV results, the roadmap card at 100%), and the same can be typed or tapped in the chat. «دليل» applies only when the user asks for one specific job. It fills the form visibly and sends it; the record is a simulation and the reply says so every time. Applying by hand is the second way. |
| 10 | "like a great ui like motions… when he analysis the cv" | The analysis is a 7-second show played over the real result: the real evidence sentences light up and become skill tags. |
| 11 | "the transition when you click chat" | Both candidate moments are used: the panel that opens over any page (`panel-open`) for the chat, and the document-reading show for the CV analysis. |
| 12 | "there should be a leadrboard show who is first… so everyone view it" | A page every signed-in user can open, with a podium and a full list. One board, this week's (no all-time tab: nobody new could climb it during a demo). Other people are sample users and are labelled so; only the signed-in user's rank is computed from what they did. "Everyone" cannot mean several real users, because accounts live in one browser. |
| 13 | "great design avatars" | Twelve avatars from the design team: four neutral, four women, four men. A neutral one is assigned at sign-in, so the first step stays one field and nobody gets an avatar of the wrong gender; it is changeable in the profile. |
| 14 | "38 skills… 0-3 stars" (idea file) with 59 courses | Each skill has 1, 2 or 3 star slots, 59 in total, one course per slot. That keeps the idea file's numbers exact and means every star can actually be earned. A uniform three stars per skill would need 114 courses. |
| 15 | "7 fields" | Six fields with jobs and one foundation field, «المهارات المهنية», whose skills appear in every other field's jobs. |
| 16 | "7 titles, مبتدئ → أسطورة" | The first and last titles are his; the five between are new: مستكشف، مجتهد، متمكّن، محترف، خبير. |
| 17 | "10 badges" | His ten, plus two that the new features earn: «أول تقديم» and «ضمن العشرة الأوائل». |
| 18 | "+200 XP, the skill gains a star, match goes 70% → 90%" | Forced by the data: the match formula gives each of five skills 20 points; the sample CV lacks Power BI, which the target needs at one star; the Power BI course is 10 hours at 20 XP an hour. |
| 19 | XP for applying (not in the idea file) | +40, and only when the match is 60% or more, so the game rewards a considered application and not a blind one (principle P2). |
| 20 | "Skills appear with a level-up celebration" (idea file, demo step 1) | The level thresholds are set so the CV analysis lifts the user to level 2 and the first course to level 3, with or without the application, in either order (8.8). |
| 21 | XP, or an Arabic word for it | «XP» in Latin letters, as game players say it, explained once in the profile as «نقاط الخبرة». |
| 22 | Address form | Masculine generic for buttons, labels and level titles, first person for the user's own lines and the sample CV. The onboarding questions and acknowledgements, which sit next to the person's name, are worded without gender. The demo persona is «خالد». Sample users on the leaderboard show a level number without a title, so no woman carries a masculine title. |
| 23 | Voice of «دليل» | Modern Standard Arabic with a short list of Gulf expressions. Heavier dialect is understood on input and not used on output, so every judge reads it easily. |
| 24 | Route name for the roadmap | `/path`, the lead's default. (The header of `tools/shot.mjs` uses `/roadmap` in an example; the spec does not.) |
| 25 | The idea file's demo never applies; the journey in the brief applies before the course | The demo closes the gap first (70% → 90%) and then asks «دليل» to apply at 90%. That is the product's own story (gap, learn, apply); it puts the headline moment before 1:15; and one typed request shows both "he opens it for you" and "he applies for you". Applying first, at 70%, still works (8.8). |
| 26 | His closing line says "a real job", while every job in the demo is sample data | Kept exactly as he wrote it: it is his line. A wording that claims nothing untrue is offered beside it in 10.2, for him to choose. |
| 27 | "he open it to you like what we do in our demos", with a key that may or may not be there | Requests that act (open, search, apply, start, change the target) are executed by a router in code in every mode; the model, when present, answers free questions. So the part he will show behaves the same with no key and no internet. |
| 28 | "The name of the project actullay دليلك not masari" (18 Nov) | The product is «دليلك» (Dalilak). The advisor keeps the name «دليل» and introduces himself as «أنا دليل، دليلك إلى وظيفتك.» «مساري» stays only as the roadmap page's name. Where «دليلك» alone could be read as "your guide", the copy says «منصة دليلك». (TEAM-BRIEF section 0.) |
| 29 | "For the map I want something impressive And easy to trace and have a good looking transition when you open it" (18 Nov) | A named opening, `map-open`: in full the first time the map appears after the reveal, which hands over to it without a cut; short (1.2 s or less) on every later visit and when «دليل» opens the map, so it never becomes a wait. "Easy to trace" became the five reading rules of 3.4, which hold whichever drawing he picks. |
