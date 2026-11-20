# Onboarding flow: CV first, then only the questions left (20 Nov 2026)

Owner's ask: the CV upload belongs at the start of the questionnaire; «دليلك» suggests the path from the CV and the
answers; what happens to the CV is visible in the chat; Gemini makes the replies feel human. This file is the flow as
built. Code: `src/features/welcome/conversation.tsx` (screen), `src/features/welcome/cv-step.tsx` (the CV step in the
chat), `src/lib/brain/onboarding/cv.ts` (pure CV-step script), `src/lib/brain/onboarding/phrase.ts` +
`src/lib/brain/server/run-onboarding.ts` + `POST /api/onboarding/phrase` and `POST /api/onboarding/understand` (the
Gemini layer: «دليلك» reads every typed message and words every reply; section 4).

## 1. States

The pending question stays derived from the answers (`pendingQuestion`). Two CV phases sit in front of it, stored on
`user.onboarding` (both optional: an account saved before this change has neither and keeps the old seven questions):

| Phase | Stored as | «دليلك» is waiting for | Chips under the thread |
|---|---|---|---|
| `offer` | `onboarding.cv === "offered"` | the CV, or «ما عندي» | ارفع ملف سيرتك · الصق نص سيرتك · جرّب بسيرة جاهزة · ما عندي سيرة الحين |
| `paste` | screen state only | pasted text (80+ characters) | the paste box replaces the chips: «حلّل سيرتي» · «رجوع» |
| `reading` | screen state only (the card in the thread) | the analysis | none (the composer is disabled) |
| `confirm` | `onboarding.cvPrefill.confirmed === false` | yes / change | إيه، صح · لا، بعدّل |
| questions | `onboarding.cv` is `"analysed"` / `"skipped"` (or absent) | `pendingQuestion(answers)` | that question's tiles |
| done | every step answered | — (the reveal) | — |

`onboarding.cv`: `"offered"` → `"analysed"` (a CV with at least one skill was recorded) or `"skipped"`.
`onboarding.cvPrefill`: `{ slots, confirmed }`. The CV's values are written into `answers` at once (so the profile card
shows them filled, tagged «من سيرتك», and `pendingQuestion` skips them); «لا، بعدّل» takes them out again.

## 2. The script

**Greeting (fresh account).** The greeting line as before, then:
> عندك سيرة ذاتية؟ ارفعها وأختصر عليك نص الأسئلة.

**Offer → upload.** «ارفع ملف سيرتك» opens the file picker (PDF or Word). The checks of /cv run first in the browser
(`precheckCvFile`), then `/api/cv/extract`. The user's bubble is the file name («سيرتي: name.pdf»).
**Offer → paste.** The paste box opens under the thread (same 80-character minimum as /cv). Bubble: «لصقت نص سيرتي».
**Offer → sample.** Bubble «جرّب بسيرة جاهزة»; the sample CV with the user's name (`sampleCvText`).
**Offer → none.** Bubble «ما عندي سيرة الحين»; «دليلك»: «ولا يهمك، نمشي بالأسئلة، وتقدر ترفعها بعدين من خريطتك.» then
«بسألك سبع أسئلة قصيرة…» and question 1. From here it is today's seven questions, unchanged.
**Offer → typed text.** An answer to question 1 («الرياض») skips the CV and is recorded. Otherwise «دليلك» reads it with
the model: a question about the CV («وش فايدة السيرة؟») gets a one- or two-line Najdi answer and the offer again; a yes gets
«حلو! اختر «ارفع ملف سيرتك» تحت، أو الصق نصها.»; a no skips like «ما عندي». Offline the local reader decides the same way.

**Reading (the card in the chat).** «دليلك»'s turn is a live card: the CV show of /cv in its compact form, its status
line in his Najdi voice, saying what he is doing: «أقرا سيرتك سطر سطر…» → the marker on each proving sentence and its skill
tags → «أربط كل مهارة بالجملة اللي تثبتها…» → stars land → «أقارن مهاراتك مع … وظيفة…» (the rings) → «خلصت: لقيت 8
مهارات.». The page
does not move. When it ends: the +100 XP toast (cv_analysed is then marked announced, so the map's toast is +80 with the
level-up), and the card settles into its summary (the skills with their stars). After a reload the summary is drawn at
rest from `user.cv`.

**Reaction (grounded).** Template, then rephrased by Gemini when online (section 4):
> ما شاء الله يا خالد، لقيت في سيرتك 8 مهارات، أقواها Excel و SQL.

Only skill names and stars from the analysis; nothing else.

**Confirm.** The CV facts that are clearly written (`cvFacts`): city (the header lines only), the highest degree, the
major (from a degree line), the experience band (years written with «خبرة», or a co-op / months → «أقل من سنة», or «خريج
جديد» → none). The sample CV gives الرياض · بكالوريوس · نظم معلومات إدارية · أقل من سنة.
> فهمت من سيرتك إنك خريج نظم معلومات إدارية (بكالوريوس) من الرياض، ومعك تدريب تعاوني أربعة أشهر. صح؟

- «إيه، صح» (or a typed yes) → confirmed; the next question.
- «لا، بعدّل» (or a typed no) → the CV values leave the card; «ولا يهمك، نمر عليها بسرعة.» and the first of them is asked.
- A typed correction («لا، أنا من جدة») → read by the interpreter against the CV slots: what it names replaces the CV
  value, the rest stay, confirmed.
- Nothing clearly written in the CV → no confirm; the reaction is followed by the first open question.

**The questions left, built on the CV (the owner's order).** The CV comes FIRST, before any question (city included).
After the confirm, only what the CV does not settle is asked, in this order (`CV_QUESTION_ORDER`):
1. the interest, asked from the CV's real skills (its strongest skills in the field its stars lean to; that tile comes
   first, and a plain «إيه» records it):
   > عندك Excel و SQL قوية، تبي تكمل في الأرقام والبيانات ولا تفكر بمجال ثاني؟
2. whatever the CV did not state: city, education, major, experience (each only if missing);
3. the company (tiles for the field the interest points to), then the priority.

Every question still fills the same seven answer slots, so the engine and the reveal are unchanged; nothing is said beyond
the CV text (the confirm uses its own words for a short experience: «ومعك تدريب تعاوني أربعة أشهر»). After «لا، بعدّل» the
usual order comes back (the CV facts are asked one by one). The step indicator keeps «السؤال n من 7» (the CV's slots count as
answered). Without a CV: today's seven questions in today's order.

**Typed answers and side questions (owner, 20 Nov 2026: «دليلك» leads).** Every typed message goes to the model first
(`/api/onboarding/understand`, ≤ 3.5 s): an answer in any words («ساكن بالعاصمة» → الرياض, «أحب أسوي داشبوردات» → البيانات;
the ids are checked against the question's options), or a side question («ليش تسأل عن المدينة؟», «وش الفرق بين البيانات
وتنظيم الأعمال؟») that he answers in one or two Najdi lines from a fixed list of onboarding facts (`ONBOARDING_FACTS`), then
asks the pending question again. The local reader is the guard (a message that answers several questions at once, and a
typed place with its distance, stay its reading) and the fallback (offline, slow, or an invalid decision).

**Path suggestion (the closing line).** «دليلك» proposes the path himself: the engine's job, why (its first two fit
reasons, in his words) and, with a CV, the real match:
> على سيرتك وإجاباتك، أقرب مسار لك «محلل بيانات»، لأنك تحب الأرقام والبيانات، وتخصصك نظم معلومات إدارية قريب منها،
> ومطابقتك له الحين 70%. لحظات وأرسمه لك.

Without a CV: the same line without the match («على إجاباتك، أقرب مسار لك …»). The job is `recommend(answers, jobsAt, stars)` (the CV adds a sixth fit term, the
match with the user's real stars / 10, 0-10 points); the match is `jobMatch`. With the sample CV and the demo answers it is
«محلل بيانات» (data-analyst-riyadh) at 70%, alternatives qiddiya-hr-analytics and syarah-financial (unchanged).

Then 1.2 s later the reveal, handed the answer rects exactly as before.

## 3. Timings

| Moment | Time |
|---|---|
| Greeting → offer chips | 620 ms thinking, words in, chips at +900 ms (as before) |
| Chip tap → «دليلك» answers | at least 350-600 ms (as before); with Gemini until it answers, at most 3.5 s, then the template |
| CV card | read ≥ 1.2 s (and until the analysis is back) · extract 1.6 · evidence 1.2 · stars 1.2 · match 1.2 · done 0.6 ≈ 7 s |
| Card done → toast + reaction | 300 ms |
| Closing line → reveal | 1.2 s hold (as before) |

The 2-minute demo: the CV now plays inside onboarding (≈ 7 s) instead of on /cv after the map (≈ 15 s of clicks and the
show), and five of the seven questions are skipped by the CV, so the walk is shorter, not longer.

## 4. Gemini rephrase layer

The interpreter stays the source of truth for the STATE: answers, slots, chips, XP, the next question and the job are
decided locally. Online, «دليلك»'s WORDS are the model's: it reads every typed message (above) and writes every reply of the
questionnaire (each acknowledgement + next question, the CV reaction + confirm, the path line); the template is only the
fallback for a slow (3.5 s), failed or refused reply, and the whole flow works offline on the templates.

- **Request** (`POST /api/onboarding/phrase`): the moment, the user's first name, the template lines, and ONLY the facts
  that line may use (the answer just recorded, the next question's text, the CV skills with stars and their count, the
  recommended job title, the match and the fit reasons). No history, no other user data.
- **Prompt:** Najdi voice (the advisor's VOICE rules), warm, short (≤ 2 sentences per line), «same meaning as the
  template», no new facts, numbers, companies, jobs, skills or promises; JSON `{"lines": [...]}` with as many lines as
  the template.
- **Checks** (any failure → the template): same number of lines; each ≤ 220 characters; the question line ends with
  «؟»; every number is in the facts (`numbersAreGrounded`); no money words; no skill, job title or company name that is not
  in the facts; no Fusha / Hijazi giveaway words; no promise words; no markdown, no emoji.
- **Budget:** the server chain gets 3.0 s (gemini-1 then gemini-2 with what is left; the SDK's own timeout stays ≥ 10 s,
  the chain's AbortSignal cuts it), the browser aborts at 3.5 s. Not streamed: a reply is one or two short lines, and a
  line must pass the checks whole before it is shown. «دليلك»'s thinking dots show while waiting.
- **Fallback:** offline, no key, a timeout or a failed check → the template at once. Every template has 2-3 natural
  variants (picked by a stable hash of the name and the step, so a run looks the same twice), so the fallback does not
  read as a form.
- **Demo safety:** the chips, answers, XP, recommendation and match never depend on Gemini.
- **Who wrote what:** the browser logs one line per reply («[dalil] onboarding ack: model in 812 ms» / «template») and
  keeps them in `window.__dalilOnb` for QA; the server logs `[brain] onboarding reply by gemini-1 … in … ms`.

## 5. Failure paths

| What | What the user sees | Then |
|---|---|---|
| Wrong type / too large (browser check) | «دليلك»: the /cv sentence («المقبول: PDF و Word (docx) فقط. أو الصق نص سيرتك.» / «الملف أكبر من 5 ميغابايت…») | the offer chips again (upload, paste, sample, none) |
| Unreadable / no text / too many pages (server) | the /cv sentence for it | the offer chips again |
| Extract or analyse request fails | «تعذّر التحليل الآن. جرّب مرة أخرى.» | the offer chips again |
| No skill found | «ما لقطت مهارات واضحة في ذي السيرة.» + the /cv hint | the offer chips again; nothing saved, no XP |
| Paste under 80 characters | the /cv hint under the box | «حلّل سيرتي» stays disabled |
| Reload during the card | the analysis was recorded before the show: the card is drawn at rest, then the reaction and the confirm are asked | — |
| Reload in confirm / questions | the pending line is asked again (as before) | — |
| Gemini slow / down / off | the template | — |

## 6. Without a CV

«ما عندي سيرة الحين» → today's seven questions, unchanged behaviour (+50 XP, the reveal, the map). The map's first
station «اكتشف مهاراتك» still opens /cv, and /cv still re-analyses for everyone.

## 7. The demo numbers

name → «جرّب بسيرة جاهزة» in the chat (+100) → «إيه، صح» → interest «الأرقام والبيانات» (asked from Excel and SQL) → company «لا، مو الحين» → priority
«أول وظيفة» (+50) → the reveal recommends «محلل بيانات» → «ابدأ هذا المسار» (+30): XP 180, level 2, match 70%, weekly rank 18
→ guide «خلّصتها» on Power BI: 380, level 3, 90%, rank 10 → apply via «دليلك»: DL-2026-0001, 420.

## 8. Hand-off to the reveal (owned by the reveal-transition agent)

Unchanged contract: `Conversation` calls `onDone(rects)` with the measured `[data-welcome-answer]` rects 1.2 s after the
closing line; `WelcomeScreen` renders `RevealFlow` with them (`AnimatePresence mode="popLayout"`, the reveal agent's ask,
so no empty paper frame shows between them).

Open request for `src/features/welcome/reveal-data.ts`: rank with the CV's stars, `recommend(answers, undefined, stars)`
and `rankByFit(answers, stars)`, where `stars = skillStars(user)` when `user.onboarding.cv === "analysed"`. Until then
the chat names the same job the reveal lands on (`REVEAL_USES_CV_STARS = false` in conversation.tsx; flip it with that
change); the CV still gives the real match in «دليلك»'s line. For the demo both give «محلل بيانات».

## 9. «دليلك»'s messages are easy to see (owner, 21 Nov 2026)

Each of his turns is a calm bubble (`welcome-daleel-bubble`): a light card in the surface colour with a visible border,
16 px text, the question line in semibold; his name and glyph head each group (a CV card and the reaction under it are
one group); the waiting state reads «دليلك يكتب…» beside his thinking glyph. No gradient, no wash.
