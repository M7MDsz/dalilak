# Handoff 1 of 2 — The Idea

**Project:** «مساري» (Masari, "my path") — a gamified skill-matching platform
**For:** Maharah's «مهاراثون / حلّها» HR hackathon
**Companion file:** `HANDOFF-2-IMPLEMENTATION.md` (how it is built)

This file covers what the product is and why. It says nothing about code.

---

## 1. Hackathon context

| | |
|---|---|
| Organizer | Maharah (مهارة) HR company |
| Slogan | «حلّها» ("solve it") |
| Format | In-person, Riyadh, **19–21 Nov 2026**; registration closes **5 Nov 2026** |
| Size / prize | 100 participants, 350,000 SAR total prizes |
| Who can enter | Saudi students, graduates and professionals aged 18+, solo or in teams |
| Structure | 10 challenges in 3 tracks: **(1) National talent & the future of work**, **(2) A more efficient, compliant labor market**, **(3) An experience that builds trust** |
| Stated challenge questions | How do jobs become more attractive and sustainable for national talent? How is technology used to raise operating efficiency and compliance? How do customer experiences become easier and more reliable? |
| After the event | Promising solutions are shown to the relevant parties to consider taking them further |

**Not published in the announcement:** the text of the 10 challenges, the judging criteria, and any partners. The idea below was matched to the track and questions above, not to a specific official challenge. Check it against the real challenge list once it is available.

Source: Maharah's announcement news page (published 15 Oct 2026).

## 2. How this idea was chosen

Three ideas were pitched in a 3-slide-each deck, all in the same HR space:

1. **Smart skill matcher**: reads a CV, suggests jobs, shows the skill gap with courses that close it. **← chosen and built.**
2. Compliance radar: a dashboard that warns before contracts, residencies, licences or wage rules are breached.
3. Contract automation: reads contracts, extracts clauses, flags risks against Saudi labour law.

The user chose idea 1 and added a requirement: it must feel like a game (XP, levels, streak, skill tree), with accounts, job search and a visual path.

## 3. The problem

- A graduate applies to jobs that don't fit their skills, and recruiters drown in applications.
- The gap between "what I have" and "what this job needs" is invisible to the job seeker. They don't know what to learn or in what order.
- Learning content is scattered and unconnected to a concrete career goal, so motivation fades.
- Recruiters screen CVs by hand, which is slow and loses good national candidates.

Track fit: **track 1** (attractive, sustainable careers for national talent) directly. It also touches track 3, because it makes the job-seeking experience clearer and more trustworthy.

## 4. The solution in one paragraph

The user creates a profile, uploads a CV, and the platform extracts their real skills (with the sentence from the CV that proves each one). It matches those skills against jobs, the user picks a target job, and the platform draws a **roadmap** from "you are here" to that job: finished stages, the stage available now, locked stages, and optional branches. Finishing a course earns XP, raises the skill level, and visibly increases the match percentage with the target job. Levels, a daily streak, badges and a skill tree keep the user coming back.

## 5. Who it is for

- **Primary:** Saudi graduates and early-career job seekers who don't know their next step.
- **Secondary (pitch angle, not built):** HR teams and training providers who want a ready-made view of candidate skill gaps.

## 6. The user journey (the story to tell)

1. **Enter** with just a name (no email or password, deliberately, to remove friction in a demo).
2. **Tell us about you:** city, education, major, years of experience. Reward: +50 XP.
3. **Upload your CV** (PDF, Word, or pasted text). The platform shows the skills it found, each with 1–3 stars and evidence from the CV. Reward: +100 XP.
4. **Pick a goal:** the top 3 matching jobs are shown with a match ring. Reward: +30 XP.
5. **Follow your path:** a map from "you are here" to a trophy. The next step glows. Below it, **branches** show other jobs that open up once the path is finished (for example "after this you match 90% of Data Analyst").
6. **Search opportunities:** a search box plus city and field filters, ranked by how well each job matches the user.
7. **Learn:** recommended courses for the path, plus "widen your horizons" ones. Completing one triggers a celebration: XP, skill stars up, match % up.
8. **Come back tomorrow:** streak, daily reward, level-ups, badges, skill tree.

## 7. The game layer

| Element | Purpose |
|---|---|
| **XP** | Every meaningful action pays out; course XP scales with hours. Makes progress feel immediate. |
| **Levels** (7 titles, مبتدئ → أسطورة) | A long-term identity that rises as XP grows. |
| **Streak 🔥 + daily reward** | Habit loop. Reward grows with the streak (capped). |
| **10 badges** | Milestones: first steps, CV scanned, goal set, first course, five courses, 3- and 7-day streaks, 10 skills, level 5, "job ready" (100% match). |
| **Skill tree** | 7 fields, each skill with prerequisites and 0–3 stars. Locked until prerequisites are done. Shows the whole landscape, not just the user's own path. |
| **Roadmap** | The personal path to one target job, with optional branches. |

Design principle: **the game must reflect real progress.** XP and stars change the match percentage with a real job, so the points are not decoration.

## 8. What makes it different

- **Evidence-based:** every discovered skill carries the CV sentence that justifies it, so the user can see why.
- **Gap, not just match:** it answers "what do I do next", not only "which jobs fit".
- **Connected:** CV → jobs → path → courses → updated match, in one loop.
- **Branching path:** shows follow-on careers, not a single line.
- **Arabic-first, RTL, mobile-friendly.**
- **Honest AI use:** Claude reads the CV when a key is available. The platform still works without it, using a local keyword analyzer.

## 9. Suggested demo (2 minutes)

1. Enter a name → fill the profile → click **"جرّب بسيرة ذاتية تجريبية"** (try a sample CV) → **Analyze**. Skills appear with a level-up celebration.
2. Pick **"محلل بيانات"** (Data Analyst). The roadmap appears with the next stage glowing.
3. **Start → Complete** the next course: +200 XP, the skill gains a star, match goes **70% → 90%** with confetti.
4. Open the **skill tree**, then search jobs, then show badges in the profile.

Spoken one-liner: *"Upload your CV, and in seconds you know where you stand, where you're going, and the next step. Every step you take is real progress toward a real job."*

## 10. Scope: what is and isn't claimed

**In scope (built):** accounts-by-name, profile, CV analysis, job matching and search, roadmap with branches, courses with XP, levels, streak, badges, skill tree.

**Deliberately simulated (say so honestly if asked):**
- Jobs and courses are **sample data**: 20 jobs, 59 courses, 38 skills. No real employers or training providers.
- "Complete course" is a **button**, not a link to a real learning platform.
- No real authentication (name-only).

**Not built, possible pitch extensions:** real job feeds and course providers, an employer/recruiter view, verification of completed courses, notifications, Arabic CV parsing tuned for real-world CV layouts.

## 11. Open questions for whoever continues

1. Which of the **10 official challenges** does this answer best? Align the pitch wording to it once known.
2. What are the **judging criteria**? Emphasis (impact, technical depth, UX, feasibility) should shape the pitch.
3. Is a **recruiter/employer view** worth adding for track 2 or 3, given that the platform already holds skill data?
4. Should name-only entry stay for the demo, or move to a simple PIN so that nobody can open another person's profile?
5. Real data sources: is there a public job or course feed the team can show as a roadmap item?

## 12. Claims to avoid

No statistics have been collected for this project. Do not quote figures about unemployment, hiring time or learning outcomes unless they come from a cited source. Placeholders such as `[__]` in earlier pitch slides were left for exactly this reason.
