# دليلك (Dalilak): how to run it and the 2-minute demo

## Run it

From the project folder:

- **Stage (fast, the one to present):** `npm run demo` (builds, then serves at http://localhost:3040). Then open each page
  once before presenting so nothing loads for the first time on stage.
- **Working copy (hot reload, slower):** `npm run dev` (also http://localhost:3040). Use one or the other, not both.

Two designs: the calm one (default) and the game board («لعبة»). Switch at the foot of the side menu («التصميم: هادئ · لعبة») or on «ملفي» («شكل التطبيق»), or open any page with `?theme=lawha` (back: `?theme=darb`); the choice is remembered.

Start from a clean state with **http://localhost:3040/?seed=fresh**. Any page also opens in a saved demo state with
`?seed=onboarded`, `cv-analysed`, `course-done`, `mid-path`, `job-ready` or `returning`. Useful if a step goes wrong on
stage: jump straight to the state you need.

«دليل» answers free questions with Gemini when `GEMINI_API_KEY` is set in `.env.local` (see `.env.example`). The scripted lines below, the answer tiles and the sample CV always use the built-in brain, so the numbers
never change. With no internet, or once the free daily allowance is used up, he falls back to the built-in brain by himself.
An Anthropic key can go in `ANTHROPIC_API_KEY=` the same way.

## The 2-minute walk (about 85 seconds of clicks, the rest is talking)

| # | Clock | You do | The audience sees |
|---|---|---|---|
| 1 | 0:00 | Type «خالد», press «ابدأ رحلتك» | Sign-in: the moving showcase on the right; «دليل» greets Khalid |
| 2 | 0:06 | Tap the six answers (الرياض · بكالوريوس · نظم معلومات إدارية · بدون خبرة بعد · البيانات · أول وظيفة) | «دليل» answers each one at once; the player card fills |
| 3 | 0:27 | Watch | The path-reveal show: jobs sweep, skills light up, the path draws itself to «محلل بيانات» |
| 4 | 0:37 | Press «ابدأ هذا المسار» | The map opens (the road draws, the flag rises); +80 XP; level 1 |
| 5 | 0:43 | Press «ارفع سيرتك الذاتية» | The CV page |
| 6 | 0:46 | Press «جرّب بسيرة ذاتية تجريبية», then «حلّل سيرتي» | The analysis show: sentences light up, 8 skills fly out with their stars; +100 XP; level 2; match 70% |
| 7 | 0:58 | Press «اذهب إلى مساري» | The map catches up: six stations done from the CV; «أنت هنا» at 70% |
| 8 | 1:04 | Press station 7 (Power BI), then «ابدأ الدورة» | The 3D camera flight to the station and its card; the course opens |
| 9 | 1:09 | Press «أكمل الدورة» | The celebration: +200 XP, the stamp, the star, the match rises 70% → 90%, level 3, up 8 places to rank 10 |
| 10 | 1:17 | Press «رجوع لمساري» | The map at 90% |
| 11 | 1:21 | Open «اسأل دليل» (or Ctrl+K), type «قدّم لي على وظيفة محلل بيانات», Enter | «دليل» opens the job page beside the chat, fills the form himself, sends it: DL-2026-0001, +40 XP; then he applies on LinkedIn, بيت.كوم, Indeed and the company site one after another (a simulation, and it says so) |
| 12 | 1:41 | Press «المتصدرون» | The leaderboard: you climb from 18 to 10 |
| 13 | 1:48 | If time allows: «المهارات», then «ملفي» | The skill tree (wait ~3 s for it to settle on 9 of 38); badges 6 of 12 |

Spoken one-liner (from the idea file): "Upload your CV, and in seconds you know where you stand, where you're going, and
the next step. Every step you take is measured progress toward the job you chose."

## What is real and what is simulated (say so if asked)

Real: the conversation and its scoring that picks the target job; reading the CV (PDF, Word or pasted text) and finding
skills with the sentence that proves each; the match formula; the roadmap; XP, levels, streak, badges, the leaderboard
ranking; «دليل» opening pages and acting when asked, with the rules enforced in code.

Simulated: the 20 jobs, 59 courses, companies (all invented, marked «جهة تجريبية») and the 24 other leaderboard users
(«بيانات تجريبية»); "complete course" is a button; applying sends nothing to anyone (it says so); sign-in is by name only.
