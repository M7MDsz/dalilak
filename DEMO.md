# دليل (Dalilak): how to run it and the 2-minute demo

## Run it

From the project folder:

- **Stage (fast, the one to present):** `npm run demo` (builds, then serves at http://localhost:3040). Then open each page
  once before presenting so nothing loads for the first time on stage.
- **Working copy (hot reload, slower):** `npm run dev` (also http://localhost:3040). Use one or the other, not both.

Two designs: the calm one (default) and the game board («لعبة»). Switch at the foot of the side menu («التصميم: هادئ · لعبة») or on «ملفي» («شكل التطبيق»), or open any page with `?theme=lawha` (back: `?theme=darb`); the choice is remembered.

Start from a clean state with **http://localhost:3040/?seed=fresh**. Any page also opens in a saved demo state with
`?seed=onboarded`, `cv-analysed`, `course-done`, `mid-path`, `job-ready` or `returning`. Useful if a step goes wrong on
stage: jump straight to the state you need.

«دليلك» answers free questions with Gemini when `GEMINI_API_KEY` is set in `.env.local` (see `.env.example`). The scripted lines below, the answer tiles and the sample CV always use the built-in brain, so the numbers
never change. With no internet, or once the free daily allowance is used up, he falls back to the built-in brain by himself.
An Anthropic key can go in `ANTHROPIC_API_KEY=` the same way.

## The 2-minute walk (about 85 seconds of clicks, the rest is talking)

| # | Clock | You do | The audience sees |
|---|---|---|---|
| 1 | 0:00 | Type «خالد», press «ابدأ رحلتك» | Sign-in: the name box on the right, the moving showcase on the left; «دليلك» greets Khalid |
| 2 | 0:06 | Tap the seven answers (الرياض · بكالوريوس · نظم معلومات إدارية · بدون خبرة بعد · البيانات · **لا، مو الحين** · أول وظيفة). The sixth asks «وفيه شركة أو وظيفة معيّنة في بالك؟» with real employers of the field (مهارة first, then أرامكو، stc، سابك، القدية، سلة); for the demo tap «لا، مو الحين» so the path stays «محلل بيانات» | «دليلك» answers each one at once; the player card fills (7 slots). Optional to show: type a company instead (e.g. «سلة»): he names its real job and the reveal ends on it; change or clear it later on «ملفي» («الشركة اللي في بالك») |
| 3 | 0:27 | Watch | The path-reveal show: jobs sweep, skills light up, the path draws itself to «محلل بيانات» |
| 4 | 0:37 | Press «ابدأ هذا المسار» | The map opens: the winding road draws, the flag rises; beside it the real jobs that suit you, each with «باقي لك X%» and the skills you are missing; +80 XP; level 1 |
| 5 | 0:43 | Press the first station «اكتشف مهاراتك» (ارفع سيرتك الذاتية) | The CV page |
| 6 | 0:46 | Press «جرّب بسيرة ذاتية تجريبية», then «حلّل سيرتي» | The analysis show: sentences light up, 8 skills fly out with their stars; +100 XP; level 2; match 70% |
| 7 | 0:58 | Press «اذهب إلى مساري» | The map catches up: six stations done from the CV; «أنت هنا» at 70%; the real-job cards now show what is left for each |
| 8 | 1:04 | Press station 7 (Power BI), then «افتح الدليل» on its card | The 3D camera flight to the station and its card; the Power BI guide opens: «ليش ذي الخطوة» (70% → 90% مع «محلل بيانات», +200 XP), the plan ① تعلّم → ② طبّق → ③ خلّصتها, the real top pick («ابدأ بهذا»: Microsoft Learn, بالعربي، مجاني), who to follow and what to read beside it |
| 9 | 1:09 | Press «خلّصتها» (step ③; no need to open the course: it opens a new tab and needs the internet) | The celebration: +200 XP, the stamp, the star, the match rises 70% → 90%, level 3, up 8 places to rank 10 |
| 10 | 1:17 | Press «رجوع لمساري» | The map at 90%; on the real-job cards «باقي لك» counts down (a card's «وش ناقصني؟» opens that job's missing skills) |
| 11 | 1:21 | Open «اسأل دليلك» (or Ctrl+K), type «قدّم لي على وظيفة محلل بيانات», Enter | «دليلك» opens the job page beside the chat, fills the form himself, sends it: DL-2026-0001, +40 XP; «محلل بيانات» is the one practice job («وظيفة تدريبية»), so the receipt ends with his honest line «وظيفة تدريبية: في الوظائف الحقيقية أفتح لك الإعلان الأصلي عشان ترسله» (on a real job he prepares the application and hands over «افتح الإعلان الأصلي وقدّم») |
| 12 | 1:41 | Press «المتصدرون» | The leaderboard: you climb from 18 to 10 |
| 13 | 1:48 | If time allows: «المهارات», then «ملفي» | The skill tree (wait ~3 s for it to settle on 9 of 93); badges 6 of 12 |

Spoken one-liner (from the idea file): "Upload your CV, and in seconds you know where you stand, where you're going, and
the next step. Every step you take is measured progress toward the job you chose."

## What is real and what is simulated (say so if asked)

Real: the conversation and its scoring that picks the target job; reading the CV (PDF, Word or pasted text) and finding
skills with the sentence that proves each; the match formula; the roadmap; XP, levels, streak, badges, the leaderboard
ranking; «دليلك» opening pages and acting when asked, with the rules enforced in code.

Real: the learning guides (for each of the 93 skills a real top pick course, alternatives and people to follow; for the
5 demo skills and the 16 skills added on 20 Nov (product management, cyber security and cloud, AI, sales, procurement and
supply chain) also articles, a proof task and the recognised certificate; every link opened on 20 Nov 2026, kept in
`src/lib/data/guides.ts` and `src/lib/data/expansion/guides.ts` with the page where it was found recommended, so they
work offline). The career knowledge base (16 career families: what the job is, its path and the guideline it follows,
employers, Saudi entry routes such as Tamheer and Doroob, certificates, a Hays 2026 salary range with its page, interview
questions) is in `src/lib/data/expansion/knowledge.ts`, reviewed in `research/expansion/review.html`.

Real: the jobs (20 Nov 2026): 83 open postings in Saudi Arabia from public job pages (Workable, Greenhouse and
SmartRecruiters boards and the company career pages of Salla, Lucidya, Foodics, Ninja, Tamara, Delivery Hero, Maharah,
PetroApp, Mozn, Qiddiya and others), each with its company, source site,
posting date, link (opens in a new tab) and, for every requirement, the posting's own sentence
(`research/jobs/jobs-snapshot.json`, `research/jobs/maharah.json`, `src/lib/data/jobs.ts`). A posting may have closed
since; the job page says so. On a real job «دليلك» never sends anything: he fills and saves the application (+40 XP), then
the user opens the original posting with the cover note copied.

Simulated: «محلل بيانات» (data-analyst-riyadh), the one practice job («وظيفة تدريبية», fictional company, kept so the
demo numbers stay), and its simulated status track in «طلباتي»; the 24 other leaderboard users («بيانات تجريبية»);
finishing a step is self-reported («خلّصتها», with an optional certificate link); sign-in is by name only.
