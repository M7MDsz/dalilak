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

«دليلك» leads the onboarding with Gemini when `GEMINI_API_KEY` is set (in `.env.local`, and on the Vercel project): he
reads every typed answer, answers side questions («وش فايدة السيرة؟»، «ليش تسأل عن المدينة؟») and words his replies himself,
each checked against the facts and replaced by the built-in line if it is slow (3.5 s) or adds anything
(`docs/ONBOARDING-FLOW.md`). The tiles, the sample CV, the XP and the recommended job never depend on the model, so the
numbers never change. With no internet, or once the free daily allowance is used up, he falls back to the built-in brain by
himself. An Anthropic key can go in `ANTHROPIC_API_KEY=` the same way.

## The 2-minute walk (about 75 seconds of clicks, the rest is talking)

The CV now comes first, inside the conversation (owner, 20 Nov 2026; the flow is `docs/ONBOARDING-FLOW.md`).

| # | Clock | You do | The audience sees |
|---|---|---|---|
| 1 | 0:00 | Type «خالد», press «ابدأ رحلتك» | Sign-in: the name box on the right, the moving showcase on the left; «دليلك» greets Khalid and asks «عندك سيرة ذاتية؟ ارفعها وأختصر عليك نص الأسئلة» |
| 2 | 0:06 | Tap «جرّب بسيرة جاهزة» (or upload a PDF / Word file, or paste the text) | The analysis plays INSIDE the chat as «دليلك»'s card: «أقرا سيرتك سطر سطر…», each proving sentence lights up and its skills fly out, the stars land, «أقارن مهاراتك مع … وظيفة» (the rings), «خلصت: لقيت 8 مهارات»; the +100 XP toast; the profile card fills الرياض · بكالوريوس · نظم معلومات إدارية · أقل من سنة, each tagged «من سيرتك» |
| 3 | 0:16 | Read «دليلك»'s reaction, tap «إيه، صح» | He names what he found («لقيت في سيرتك 8 مهارات، أقواها Excel و SQL») and confirms what the CV says («فهمت من سيرتك إنك خريج نظم معلومات إدارية (بكالوريوس) من الرياض…. صح؟»); then only the questions left, starting with «من سيرتك أشوف إن الأرقام والبيانات أقرب لك…» |
| 4 | 0:20 | Tap «الأرقام والبيانات» · «لا، مو الحين» · «أول وظيفة بأسرع وقت» | He answers each one in his own words; his last line proposes the path himself: «محلل بيانات», why, and «مطابقتك له الحين 70%» |
| 5 | 0:30 | Watch | The path-reveal show: jobs sweep, skills light up, the path draws itself to «محلل بيانات» |
| 6 | 0:40 | Press «ابدأ هذا المسار» | The map opens already caught up with the CV: six stations done, «أنت هنا» at 70%; +80 XP (onboarding + target) and the level-up to level 2; XP 180, weekly rank 18; beside it the real jobs with «باقي لك X%» |
| 7 | 0:50 | Press station 7 (Power BI), then «افتح الدليل» on its card | The 3D camera flight to the station and its card; the Power BI guide opens: «ليش ذي الخطوة» (70% → 90% مع «محلل بيانات», +200 XP), the plan ① تعلّم → ② طبّق → ③ خلّصتها, the top pick, who to follow |
| 8 | 0:55 | Press «خلّصتها» (step ③) | The celebration: +200 XP, the stamp, the star, the match rises 70% → 90%, level 3, up 8 places to rank 10 (XP 380) |
| 9 | 1:03 | Press «رجوع لمساري» | The map at 90%; on the job cards «باقي لك» counts down |
| 10 | 1:07 | Open «اسأل دليلك» (or Ctrl+K), type «قدّم لي على وظيفة محلل بيانات», Enter | «دليلك» opens the job page beside the chat, fills the form himself and saves it in «طلباتي»: «تم حفظ طلبك», DL-2026-0001, +40 XP (XP 420) |
| 11 | 1:27 | Press «المتصدرون» | The leaderboard: you climb from 18 to 10 |
| 12 | 1:34 | If time allows: «المهارات», then «ملفي» | The skill tree (wait ~3 s for it to settle on 9 of 93); badges 6 of 12 |

Without a CV: tap «ما عندي سيرة الحين» at step 2 and the seven questions follow as before (+50 XP, the reveal, the map);
the map's first station «اكتشف مهاراتك» still opens /cv, which also re-analyses for anyone.

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
since (no screen shows the collection date or a "may have closed" note any more). On a real job «دليلك» never sends anything: he fills and saves the application (+40 XP), then
the user opens the original posting with the cover note copied.

Not real: «محلل بيانات» (data-analyst-riyadh), the one practice job (fictional company, kept so the demo numbers stay);
the 24 other leaderboard users. Since 21 Nov 2026 nothing on screen labels them (no «تجريبي» / «تدريبية» / «محاكاة»
tags, no collection dates), and nothing says the practice application was sent, received or reviewed: it is saved in
«طلباتي» («تم حفظ طلبك»; «دليلك»: «حفظت طلبك على «محلل بيانات» في «طلباتي» برقم DL-2026-0001…») and its card tracks
the user's own steps «محفوظ» → «جاهز» → «الاستعداد».
finishing a step is self-reported («خلّصتها», with an optional certificate link); sign-in is by name only.
