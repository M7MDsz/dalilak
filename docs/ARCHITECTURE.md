# «دليل» architecture contract

Written 18 Nov 2026 by the architect, against `docs/PRODUCT-SPEC.md` **version 3** (the «دليل» rename, `map-open`, the
home leaderboard preview, DL numbers), `docs/COMPONENT-PLAYBOOK.md`, `docs/STACK-NOTES.md` and `docs/DESIGN-BRIEF.md`.
About twenty agents build in parallel from this file. Read it before writing a line; it tells you **which files are yours,
what you may import, the exact names you code against, and what you must test**.

The code is the source of truth for names and shapes. This document explains it and must agree with it:

| File | What it is | Status |
|---|---|---|
| `src/lib/ids.ts` | every spec id as a runtime list, its union type and a guard | **frozen** (change only through the lead) |
| `src/lib/types.ts` | every shared domain type: catalogue, facts, derived values, consequences, UI-store types | **frozen** |
| `src/lib/brain/protocol.ts` | the wire contract: advisor request, events, actions, tools, onboarding, CV, limits, timeouts | **frozen** |
| `src/lib/testids.ts` | every `data-testid` of the spec, as constants (`TID`) | **frozen** |
| `src/lib/routes.ts` | every URL (`hrefFor`), path parsing, tab titles | written in full; maintained by `shell` |
| `src/lib/data/game.ts` | every number of spec 7-9 (XP, thresholds, timings) | written in full; maintained by `data` |
| `src/lib/store/snapshot.ts` | `factsOf(user)`: the advisor snapshot | written in full; maintained by `store` |
| every other file under `src/lib`, `src/app/api`, `src/features/shared`, `src/features/advisor` | **stubs**: signatures fixed, bodies `throw new Error("not built yet: <owner>")` (components render `null`) | owner fills the body; **keeps the signature** |

"Frozen" means: if you believe a frozen name or shape is wrong, say so in your report; do not change it. A stub's
**signature** is frozen the same way; its body is yours. You may add files and exports inside the folders you own.

**Revision 2 (18 Nov, after two verifiers walked the demo against it).** What changed, so nobody codes against the
first draft: the Guard decides once per mount (§11.1) · nothing in the UI store is read destructively, because Strict
Mode runs effects twice on the dev server (§5.3: `takeMapHandover` and `takeAdvisorRequest` are gone, `mapHandover` has
an id) · `advisorBusy` and `resetUi()` added (§5.3) · the apply sheet is portaled into `#app-content` and never dims the
advisor panel; the level-up is not a `Sheet` (§9.2, §10, §11.1) · the apply run survives the jobs page unmounting
(`interrupted`, a watchdog; §9.2) · the overlay host and the nudge read holds inside their effect after one frame;
holds are set in a layout effect (§5.4, §10) · the map computes its opening on its first render, holds from that render
and waits for a due daily reward (§11.3) · `RoadmapStage.matchAt` (the match at each station) and the 6-11 stage range
(§11.3) · the onboarding pending question is derived, not stored (`pendingQuestion`, §8.5) · `stateFromFacts`,
`nextApplicationNumber`, `fitReasons`, `startCourseRefusedLine`, `blockedActionReply`, `ToolCourse.prep/prepares` added ·
course news is written un-announced and marked at celebration beat 1 (§11.5) · the next-step card carries no step ·
`useViewport` and `useClock` are right on the first render (§5.4, §11.1) · keyboard and reduced-motion rules (§13) · the
chat kit must land before phase B and the advisor builds the panel (§3.3, §15) · screens may import
`@/lib/brain/protocol` (§3.2).

---

## 0. Decisions in one page (what every builder must know)

1. **All state is in the browser**, in ONE persisted zustand store under ONE localStorage key `masari:state`:
   `{ currentUserId, users: Record<UserId, UserState> }` (A1). The store keeps **facts only**; level, stars, match,
   roadmap, next step, ranks, streak, statuses are **derived** by `src/lib/engine` from `(UserFacts, data, Clock)`.
2. **Game rules mutate facts in exactly one place**: the pure transitions in `src/lib/store/transitions.ts`
   (`(UserState, input, Clock) → { user, consequence }`). The zustand store is a thin wrapper; seeds and tests run the same
   transitions. Badges are checked in one function, `finalize`, after every game transition (A2, spec 8.6).
3. **Every state-changing action returns a `Consequence`** (XP before/after, level, target match, star changes, weekly
   rank, badges, streak) so the caller plays the right celebration (A2).
4. **Engine functions never call `Date.now()`**: they take a `Clock` (`makeClock()` in handlers and effects,
   `useClock()` in components). The browser sends its Clock to the server, so weekly numbers agree.
5. **The server is stateless** (A3). `POST /api/advisor` streams NDJSON `AdvisorEvent`s; read-only tools run on the
   server against data + engine; state changes come back as **`action` events** that ONE client dispatcher (owner
   `advisor`) applies. The browser is the only writer of user state.
6. **The router decides every action in code, in every mode** (spec 5.5 rule 1). A model only answers rows 9-21 of 5.7,
   and only when a key is configured and answering. **There is no key on this machine** (D5): the local brain must
   produce every reply of spec 5.6 exactly.
7. **The onboarding conversation is a pure script that runs in the browser** (spec 4.1). `POST /api/onboarding` exists
   only for the one model-assisted step (classify an unmapped answer, 2.5 s). *(Deviation from A3: see §1.)*
8. **Every URL comes from `hrefFor(NavTarget)`**; every test id from `TID`; every number from `src/lib/format.ts`;
   every counted Arabic noun from `countNoun`; every spec number from `src/lib/data/game.ts`.
9. **No decision on saved state before `useHydrated()` is true.** The `Guard` (owner `shell`) waits, applies `?seed=`,
   redirects **once per mount**; screens render inside it and navigate themselves after they change state (§11.1).
10. **The map is layout-free in the contract** (D3): `buildRoadmap()` returns an ordered list of 6-11 stages (each with
    its `matchAt`), the gate, the goal and two branches; the `map` agent draws whatever design Mohammed picks, with
    `map-open` (full / short / catch-up) driven by the facts in §11.3.
11. **Dev runs in React Strict Mode** (`reactStrictMode: true`; Mohammed tests on the dev server): every effect runs
    mount → cleanup → mount. Nothing one-time is read destructively, no effect cleanup aborts an advisor turn, and values
    a first frame depends on are read in a `useState` initializer or through `useSyncExternalStore` (§5.3, §5.4).

---

## 1. The lead's decisions, as kept or adjusted

| # | Decision | Kept? | Note |
|---|---|---|---|
| A1 | One persisted store, facts only, derived values computed | kept | The "hydrated flag kept out of persistence" is the hook `useHydrated()` (persist's own `hasHydrated` through `useSyncExternalStore`), not a state field: with synchronous `localStorage` hydration a `set()` from `onRehydrateStorage` is easy to lose. Same meaning, no trap. |
| A2 | Actions return consequences; one XP function; badges in one place | kept | The "one place" is `finalize` in the pure transitions. |
| A3 | Stateless routes; NDJSON events; one client dispatcher; `/api/cv/extract`, `/api/cv/analyse` | kept, two adjustments | (a) **Onboarding runs in the browser** and `/api/onboarding` only classifies: spec 4.1 says the script "runs in the browser" so it is instant and identical on every run, and 4.5 allows the model in exactly one place. A server round trip per answer would add a failure point the spec rules out. (b) **A fifth route, `GET /api/brain`**: the browser cannot see server env (STACK-NOTES 1.7), and three screens must know whether a key is configured before any message is sent (3.6, 3.13, 3.14). |
| A4 | One provider switch; short timeouts; local fallback | kept | `src/lib/brain/server/provider.ts`, shared by the advisor and the CV model analyser. |
| A5 | Routes per spec 2.1; one route folder + one feature folder per screen; `src/features/shared` with one owner | kept | Owner of `src/features/shared` is `shell`. |
| A6 | `?seed=` replaces state; seeds from real actions | kept | `buildSeed()` runs the pure transitions (and brain-cv's local analyser for the sample CV). |
| A7 | format.ts, spec ids, test ids as constants, `data-value` raw numbers | kept | `TID` in `src/lib/testids.ts`. |
| A8 | strict, no `any`, no enums, `satisfies` | kept | Lists are annotated `readonly T[]`; keyed maps use `satisfies Record<K, V>`. |

---

## 2. Folder map

```
src/
  app/
    layout.tsx, globals.css, icon.svg          design-system / brand (do not touch)
    page.tsx                                   signin      /            (replaces the lead's placeholder)
    welcome/page.tsx                           welcome     /welcome
    (app)/layout.tsx                           shell       the app shell around every route below
    (app)/path/page.tsx                        map         /path
    (app)/skills/page.tsx                      skills      /skills
    (app)/cv/page.tsx                          cv          /cv
    (app)/jobs/page.tsx, (app)/jobs/[id]/page.tsx          jobs
    (app)/applications/page.tsx                applications
    (app)/learn/page.tsx, (app)/learn/[id]/page.tsx        learn
    (app)/leaderboard/page.tsx                 leaderboard
    (app)/profile/page.tsx                     profile
    not-found.tsx                              shell (optional; Next's default otherwise)
    api/advisor/route.ts                       brain-advisor   POST, NDJSON
    api/onboarding/route.ts                    brain-advisor   POST, NDJSON
    api/brain/route.ts                         brain-advisor   GET, JSON
    api/cv/extract/route.ts                    brain-cv        POST multipart, JSON
    api/cv/analyse/route.ts                    brain-cv        POST JSON, JSON
    dev/**                                     design galleries (theirs); dev/page.tsx is the lead's
  features/
    shared/        shell     Guard, NotFoundBlock, useNextStepAction, ConfirmTargetDialog, useViewport
    shell/         shell     AppShell, side nav, top bar, tab bar, «المزيد» sheet, user chip, next-step pill, OverlayHost
    signin/ welcome/ map/ skills/ cv/ jobs/ applications/ learn/ leaderboard/ profile/   one screen agent each
    advisor/       advisor   AdvisorRoot, the panel and the desktop launcher (from chat-kit parts), nudge, thread, dispatcher
  lib/
    ids.ts types.ts testids.ts                 architect (frozen)
    routes.ts                                  architect → shell
    format.ts cn.ts motion.ts                  lead / design (do not touch)
    text/normalize.ts                          engine   (spec 4.3 normalisation, keyword matching, names)
    data/                                      data     catalogue of spec 9 + game.ts constants
    copy/                                      data     shared Arabic copy and copy helpers (countNoun, time, phrases)
    engine/                                    engine   pure derivations (§7)
    store/                                     store    persisted store, UI store, hooks, pure transitions, seeds, snapshot
    brain/protocol.ts                          architect (frozen)
    brain/ndjson.ts client.ts schemas.ts       brain-advisor
    brain/onboarding/                          brain-advisor  pure onboarding interpreter (browser)
    brain/advisor/                             brain-advisor  pure: chips, templates (client-safe); router, tools, rules (server/tests)
    brain/server/                              brain-advisor  SERVER-ONLY: provider switch, model tool loops, turn runners
    brain/cv/                                  brain-cv       pure: clean, local analyser, sample test; client.ts (browser)
    brain/cv/server/                           brain-cv       SERVER-ONLY: extract (unpdf, mammoth), analyse, model
  components/**                                design foundation (ui, motion, icons, avatars, brand, emblems, chat); do not touch
                                               (chat/index.ts is the chat kit's, delivered before phase B: §3.3)
public/samples/                                brain-cv   one Arabic text PDF, one English .docx (spec 6.1 acceptance)
vitest.config.ts                               architect
```

---

## 3. Ownership table

Every file has exactly one owner. "May import" lists module paths; anything not listed is off limits. Nobody edits a file
outside their "Owns" column; to need something from another agent, use its contract and say so in your report.

### 3.1 Foundation logic (phase A, in parallel right now)

| Agent | Owns (creates and edits) | May import | Must not touch / import |
|---|---|---|---|
| **data** | `src/lib/data/**` (fill every stub; keep `game.ts`), `src/lib/copy/**`, their `*.test.ts` | `@/lib/types`, `@/lib/ids`, `@/lib/format`, `@/lib/text/normalize`; in `copy/` only: `@/lib/engine`, `@/lib/data` | store, brain, features, components; `data/` must not import `engine` or `copy` (engine imports data) |
| **engine** | `src/lib/engine/**`, `src/lib/text/**`, their `*.test.ts` | `@/lib/types`, `@/lib/ids`, `@/lib/data` | copy, store, brain, features, components, React, `Date.now()` |
| **store** | `src/lib/store/**` (`store.ts`, `ui.ts`, `hooks.ts`, `transitions.ts`, `seeds.ts`, `snapshot.ts`, `index.ts`), their `*.test.ts` | types, ids, data, engine, text, copy, `@/lib/brain/protocol` (types), `@/lib/brain/cv` (pure: `analyseCvLocal`, in `seeds.ts` only), `@/lib/brain/advisor/templates` (`applyInterruptedLine`, in `store.ts` only), `@/lib/brain/client` (`fetchBrainStatus`, in `hooks.ts` only), `zustand` | `transitions.ts` and `snapshot.ts` import nothing from `src/lib/brain` except protocol types (brain-advisor imports them: no cycle); `brain/server`, `brain/cv/server`, `brain/advisor/{router,tools,rules,chips}`, features, components |
| **brain-advisor** | `src/lib/brain/ndjson.ts`, `client.ts`, `schemas.ts`, `src/lib/brain/onboarding/**`, `src/lib/brain/advisor/**`, `src/lib/brain/server/**`, `src/app/api/{advisor,onboarding,brain}/route.ts`, their `*.test.ts` | types, ids, data, engine, text, copy, protocol, `@/lib/store/transitions` + `@/lib/store/seeds` + `@/lib/store/snapshot` (pure; from `advisor/{router,tools}`, `server/**` and tests only), `zod`, `@google/genai` and `@anthropic-ai/sdk` (server folder only) | `@/lib/store` index (zustand); `templates.ts`, `chips.ts`, `client.ts` and `onboarding/**` import nothing from `@/lib/store/**`; features, components |
| **brain-cv** | `src/lib/brain/cv/**`, `src/app/api/cv/**`, `public/samples/**`, their `*.test.ts` | types, ids, data, text, protocol, `@/lib/brain/server/provider` (from `cv/server/**` only), `unpdf`, `mammoth` (server folder only) | store, engine, features, components |
| **chat-kit** (design foundation, DESIGN-BRIEF §5; listed because phase B depends on it, §3.3) | `src/components/chat/**` | the design foundation's own rules | features, lib/store, lib/brain |
| **shell** | `src/app/(app)/layout.tsx`, `src/features/shell/**`, `src/features/shared/**` (`viewport.ts` is written in full: keep it), `src/app/not-found.tsx`, `src/lib/routes.ts` (maintenance) | everything client-side: `@/lib/store`, engine, copy, data, routes, testids, format, `@/lib/brain/protocol` (types), `@/components/**`, `@/features/advisor` (`AdvisorRoot` only), `@/lib/brain/client` | brain server folders, transitions/seeds, other screens' features |

### 3.2 Screens (phase B, after phase A is merged and `npm test` is green)

Each screen agent owns its route file(s) and `src/features/<name>/**` (create anything inside). Screens **may import**:
`@/lib/{types,ids,routes,testids,format,cn,motion}`, `@/lib/store` (index only), `@/lib/engine`, `@/lib/copy`,
`@/lib/data`, `@/lib/brain/protocol` (types, `LIMITS`, `TIMEOUTS_MS`, `PROTOCOL_VERSION`), `@/features/shared`,
`@/components/**` (design foundation, the chat kit included), plus the extra column below. Screens **must
not import**: `@/lib/store/transitions` or `seeds` (call store actions), `@/lib/brain/server/**`, `@/lib/brain/cv/server/**`,
`@/lib/brain/advisor/{router,tools,rules}`, or another screen's `src/features/<x>`. Screens coordinate only through the
stores (§5.3), never by importing each other.

| Agent | Owns | Extra imports | Coordinates with (via the UI store) |
|---|---|---|---|
| **signin** | `src/app/page.tsx`, `src/features/signin/**` | — | — |
| **welcome** | `src/app/welcome/page.tsx`, `src/features/welcome/**` (the conversation from chat-kit parts, the reveal, the result) | `@/lib/brain/onboarding`, `@/lib/brain/client` (`classifyOnboarding`) | `map` (`mapHandover`) |
| **map** | `src/app/(app)/path/page.tsx`, `src/features/map/**` | — | `welcome` (`mapHandover`), `advisor` (`mapOpenRequest`, `askAdvisor`, `advisorBusy`), `shell` (`blocking`) |
| **skills** | `src/app/(app)/skills/page.tsx`, `src/features/skills/**` | — | — |
| **cv** | `src/app/(app)/cv/page.tsx`, `src/features/cv/**` | `@/lib/brain/cv/client`, `@/lib/brain/cv` (`cleanCvLines` only) | `advisor` (`askAdvisor`, `advisorBusy`) |
| **jobs** | `src/app/(app)/jobs/page.tsx`, `src/app/(app)/jobs/[id]/page.tsx`, `src/features/jobs/**` (the apply sheet included; `TypedField` from the chat kit) | — | `advisor` (`applyRun`, `applySheetOpen`, `askAdvisor`, `advisorBusy`) |
| **applications** | `src/app/(app)/applications/page.tsx`, `src/features/applications/**` | — | — |
| **learn** | `src/app/(app)/learn/page.tsx`, `src/app/(app)/learn/[id]/page.tsx`, `src/features/learn/**` (the celebration included) | — | — |
| **leaderboard** | `src/app/(app)/leaderboard/page.tsx`, `src/features/leaderboard/**` | — | — |
| **profile** | `src/app/(app)/profile/page.tsx`, `src/features/profile/**` | — | — |
| **advisor** | `src/features/advisor/**` (`AdvisorPanel` and `AdvisorLauncher` built here from chat-kit parts, the nudge, the thread, the dispatcher) | `@/lib/brain/advisor` (chips, templates), `@/lib/brain/client` (`streamAdvisor`) | `jobs` (`applyRun`), `map` (`mapOpenRequest`), every page button (`advisorRequest`, `advisorBusy`) |

### 3.3 Not yours (already built or being built)

Design foundation (DESIGN-BRIEF §5-6): `src/app/globals.css`, `src/app/layout.tsx`, `src/components/providers.tsx`,
`src/components/{ui,motion,icons,avatars,brand,emblems,chat}/**`, `src/lib/motion.ts`, `src/lib/cn.ts`,
`src/lib/format.ts`. Architect (frozen): `src/lib/{ids,types,testids}.ts`, `src/lib/brain/protocol.ts`,
`vitest.config.ts`, `src/lib/contract.test.ts`, this document. The lead: `src/app/dev/page.tsx`, tools, `.env*`.

Two id unions are also defined by the design team (`AvatarId` in `@/components/avatars`, `BadgeId` in
`@/components/emblems`); they are the same literal unions as `@/lib/ids`, so values pass between them freely.

**The chat kit is a prerequisite of phase B.** Today `src/components/chat/` holds only `seed.tsx` (sketches handed over
by the motion team) and no `index.ts`, so `@/components/chat` does not resolve. Before phase B starts, the chat-kit agent
(DESIGN-BRIEF §5) delivers `src/components/chat/index.ts` exporting at least `DaleelGlyph` (`state="idle" | "listening" |
"thinking" | "working" | "done"`), `RollingStatus`, `SentBubble`, `Composer` (with the send / stop morph), `ChatThread`,
`ChipToBubble` and `TypedField`. welcome, advisor and jobs import these and draw no glyph, composer or bubble of their
own (spec 5.1: one character). `AdvisorPanel` and `AdvisorLauncher` are NOT chat-kit exports: `advisor` builds them in
`src/features/advisor` (DESIGN-BRIEF §6 already says "the advisor panel itself is built in stage 3"; the comment in
`src/components/motion/index.ts` and the two sketches in `seed.tsx` that say otherwise are for their owners to correct).

**Design-foundation notes this contract overrides** (their owners should update them; until then this document wins):
the level-up is not a `Sheet` (§10) and the apply sheet is not the stock modal `Sheet` (§9.2), although `sheet.tsx`'s
header and playbook block 23 list both; `REVEAL_STEPS_REDUCED` and the "pass the shortened list" advice in `show.ts`
are not used (§13: under reduced motion a show opens on its result).

---

## 4. Imports, client and server

```
ids ─► types ─► data ─► engine ─► copy
                 │        │         │
                 │        ▼         ▼
                 └──► store/transitions, store/seeds, store/snapshot (pure) ◄── brain/cv (pure: local analyser)
                                │
          ┌─────────────────────┼──────────────────────────────┐
          ▼                     ▼                              ▼
   store (zustand: store.ts, ui.ts, hooks.ts)     brain/advisor/{router,tools,rules} (pure, server + tests)
          │                                                    │
          ▼                                                    ▼
   features/** (client)                         brain/server/** (SERVER-ONLY) ─► app/api/** routes
```

- **Pure modules** (no React, no storage, no network, no `"use client"`): `ids`, `types`, `routes`, `testids`, `data`,
  `copy`, `text`, `engine`, `store/{transitions,seeds,snapshot}`, `brain/protocol`, `brain/onboarding`,
  `brain/advisor/*`, `brain/cv/{clean,local-analyser,sample}`, `brain/ndjson`. Tests import only these.
- **Client-only modules**: `store/{store,ui,hooks}` (zustand hooks), `brain/client.ts`, `brain/cv/client.ts`,
  `features/**`. A component file that uses hooks, state, events or `motion/react` starts with `"use client"`.
- **Server-only modules**: `brain/server/**`, `brain/cv/server/**`, `app/api/**`. They alone import `@google/genai`,
  `@anthropic-ai/sdk`, `unpdf`, `mammoth`. `server-only` is not installed (vitest could not resolve it), so the rule is
  enforced by review: `grep -r "brain/server\|cv/server" src/features src/lib/store` must find nothing.
- **Pages** (`page.tsx`, `layout.tsx`): thin Server Components (no `"use client"`), exporting only the default component
  and Next's names (`metadata`, `generateMetadata`). Each renders one client screen. `params` is a Promise (STACK 1.3).
- A file under `src/features/<x>` imports another feature only through `@/features/shared` (and the shell imports
  `AdvisorRoot` from `@/features/advisor`). No cycles: `shared` never imports a screen.
- **The one two-way edge between owners is cut on purpose.** brain-advisor imports `store/{transitions,seeds,snapshot}`;
  therefore `transitions.ts` and `snapshot.ts` import nothing from `src/lib/brain` except types from the pure
  `protocol.ts` (which imports nothing back), and `brain/advisor/{templates,chips}`,
  `brain/client.ts` and `brain/onboarding/**` import nothing from `src/lib/store`. Text the transitions need from «دليلك»
  is passed in (`resolveInterruptedApply(user, clock, line)`; the zustand wrapper passes `applyInterruptedLine()`).
  `seeds.ts` imports the pure `@/lib/brain/cv` (which imports no store module).

---

## 5. State

### 5.1 The persisted store (`src/lib/store/store.ts`, owner `store`)

```ts
PersistedState = { currentUserId: UserId | null; users: Record<UserId, UserState> }   // key "masari:state", version 1
UserState      = UserFacts & { lastSignInAt; onboarding; cvDocument; advisor; seen }
```

`UserFacts` (the facts the engine needs, **and exactly the advisor snapshot**, spec 5.2):

| Fact | Type | Written by | Spec |
|---|---|---|---|
| `id` | normalised name (4.3) | `createAccount` | 3.1 |
| `name`, `avatar`, `createdAt`, `createdDay` | | `createAccount`, `setAvatar` | 3.1, 9.6, 8.4 |
| `answers` | `OnboardingAnswers` (neutral values: city "none", education "unknown", interest ["unsure"], …) | `applyOnboardingTurn` | 4.2-4.3 |
| `onboardingCompletedAt` | number \| null | sixth answer | 8.1 |
| `targetJobId` | JobId \| null; **onboarded ⇔ non-null** | `setTarget` | 2.2, 3.3 |
| `cv` | `CvRecord` (fileName, isSample, engine, analysedAt, skills with stars + evidence + line) | `recordCvAnalysis` | 6.4 |
| `cvSkipped` | boolean | `skipCv` | 2.8 rule 1 |
| `courses` | `Partial<Record<CourseId, { startedAt, ticked[], completedAt }>>` | start / tick / complete | 3.11 |
| `xpEvents` | `XpEvent[]` with `announced` | every paying action | 8.1, 3.15 |
| `applications` | `Application[]` (number, sentAt, matchAtSend, note, cvLine, xpPaid, by, manualStatus, pinned) | `submitApplication`, `advanceApplication` | 7.4, 7.5 |
| `activeDays` | `DayKey[]` ascending | `newUser` (today), `touchDay` | 8.4 |
| `badges` | `UnlockedBadge[]` with `announced` | `finalize` only | 8.6 |

Other per-account state (not sent to the server): `lastSignInAt` (sign-in chip order); `onboarding` (thread, misses
per question, `revealPlayed`; the pending question is derived by `pendingQuestion`, §8.5); `cvDocument` (the cleaned CV
lines shown again on `/cv`); `advisor` (the last 40 messages, `jobsDisclosed`, `applyInFlight`); `seen` (replay
markers, §11.7; a new account's values are `INITIAL_SEEN` in `snapshot.ts`).

**Not stored, ever** (derived): level, stars, match, roadmap, stage numbers, next step, course states, weekly XP and rank,
streak, daily-reward due, application status, news queue, the onboarding pending question.

**A new account's values** are listed field by field on `newUser` in `transitions.ts` (streak 1 = `activeDays: [today]`;
every `seen` marker false / null; empty threads). Ids: onboarding messages `o-{index}` (deterministic, set by the
transition); advisor messages get their id from the panel when it creates them (a handler, so `Date.now()` is allowed).

**Replacing the stubs.** `useAppStore` and `useUi` are typed narrowly in the stubs. Replace each declaration with the
real `create(...)` and drop the annotation: zustand's own type is a superset, so code written against the stub compiles.

**Hydration.** `create<AppStore>()(persist(…, { name: "masari:state", version: 1, storage: createJSONStorage(() =>
localStorage), partialize: ({ currentUserId, users }) => ({ currentUserId, users }) }))`, **no `skipHydration`**:
`localStorage` hydrates synchronously when the module loads in the browser, while `getInitialState()` stays signed-out,
so the server render and the hydration render agree. `useHydrated()` = `useSyncExternalStore(subscribe to
onFinishHydration, () => persist.hasHydrated(), () => false)`. `persist` is undefined on the server: touch it only inside
those callbacks. A version mismatch drops the saved state (no migration in a demo).

**Accounts** (spec 3.1). `UserId = normalizeName(name)`, so «سارة»/«ساره», «أحمد»/«احمد», "Sara"/"sara" are one
account. The sign-in form calls `findAccount(name)`: no match → `createAccount`; match → the form shows
«أكمل من حيث توقفت» (`resumeAccount`) and «ابدأ من جديد» (`restartAccount`). Sign-out keeps the account; «إعادة ضبط
العرض» deletes it (`resetCurrentAccount`).

### 5.2 Store actions and what they return

All actions act on the signed-in user (except the account ones), call one pure transition with `makeClock()`, write, and
return. They never throw for a user error. "News" = XP events and badges, ALL written with `announced: false` and
marked by whoever shows them: the overlay queue (§10) or the celebration at beat 1 (§11.5). Every account action and
`applySeed` also call `useUi.getState().resetUi()`. No action navigates: the screen that called it does (§11.1).

| Action (store.ts) | Pure transition | Returns | Called by | What the caller plays |
|---|---|---|---|---|
| `findAccount(name)` | — | `UserId \| null` | signin | resume / restart choice |
| `createAccount(name)` | `newUser` | `CreateAccountResult` (`invalid` carries the 3.1 error) | signin | go `/welcome` |
| `resumeAccount(id)` | — | `{ to: "/path" \| "/welcome" }` | signin (chips, «أكمل…») | go there |
| `restartAccount(name)` | delete + `newUser` | `CreateAccountResult` | signin | go `/welcome` |
| `signOut()` / `resetCurrentAccount()` | — | void | profile | then `go("/")` (the app Guard renders nothing meanwhile) |
| `setAvatar(id)` | — | void | profile | toast «تم تحديث صورتك.» |
| `appendOnboardingMessages(texts)` | `appendOnboardingMessages` | void | welcome (greeting when the thread is empty; re-ask on resume; check the thread inside the handler so Strict Mode's second effect run appends nothing) | — |
| `applyOnboardingTurn(turn)` | `applyOnboardingTurn` → `completeOnboarding` on the 6th | `Consequence \| null` (+50, first-steps on the 6th) | welcome | slot fill; news held until `/path` |
| `markRevealPlayed()` | `markRevealPlayed` | void | welcome, when reveal step 6 starts | — |
| `setTarget(jobId)` | `setTarget` | `Consequence \| null` (+30 + goal-set the first time only) | welcome (reveal), shared `ConfirmTargetDialog`, dispatcher | first: map-open full; later: toast «هدفك الآن: …» |
| `recordCvAnalysis({analysis, fileName})` | `recordCvAnalysis` | `RecordCvResult` (`empty` when no skill: nothing saved) | cv, **before** the show plays the result | the show; news held by `cv-show` |
| `skipCv()` | `skipCv` | void | map (form 1 «ابدأ بدون سيرة») | gate clears |
| `startCourse(id)` | `startCourse` | `StartCourseResult` | learn, `useNextStepAction` (rule 3), dispatcher | toast «بدأت الدورة. بالتوفيق.» (course page) |
| `tickLesson(id, n, on)` | `tickLesson` | void | learn | `lesson-tick` |
| `completeCourse(id)` | `completeCourse` (news written un-announced like every gain) | `CompleteCourseResult` (with `onPath` computed before) | learn (holding `celebration` first) | the celebration's beats from the consequence; `markAnnounced` at beat 1 (§11.5) |
| `submitApplication({jobId, note, by})` | `submitApplication` (number from engine `nextApplicationNumber`) | `SubmitApplicationResult` (+40 when match ≥ 60; first-application) | jobs apply sheet (user: on send; advisor: at the START of step 5) | confirmation; news after the hold |
| `advanceApplication(jobId)` | `advanceApplication` | void | applications | `status-advance` |
| `setApplyInFlight(jobId \| null)` | `setApplyInFlight` | void | dispatcher (start / end of an advisor apply) | — |
| `resolveInterruptedApply()` | `resolveInterruptedApply(user, clock, applyInterruptedLine())` | boolean | advisor root, once after hydration | «لم يكتمل التقديم…» appears in the thread |
| `touchDay()` | `touchDay` | `TouchDayResult \| null` (streak badges) | shell, on every app-shell mount | daily reward if `daily.due` |
| `claimDailyReward()` | `claimDailyReward` | `Consequence \| null` | shell (daily overlay «استلم») | XP toast |
| `markAnnounced({xp, badges})` | `markAnnounced` | void | shell overlay host | — |
| `markSeen(key, value)` | `markSeen` | void | the screens of §11.7 | — |
| `appendAdvisorMessages(msgs)` / `clearAdvisorThread()` | | void | advisor | — |
| `applySeed(name)` | `buildSeed` | void | shell `Guard` | — |

`Consequence` (types.ts): `xp {gained, before, after, events}` · `level {before, after}` · `match {before, after}`
(target `{jobId, value}` or null) · `stars[] {skill, before, after}` · `rank {before, after, weeklyXpBefore,
weeklyXpAfter}` · `badges[]` (8.6 order) · `streak {before, after}`.

### 5.3 The UI store (`src/lib/store/ui.ts`, owner `store`, not persisted)

Cross-screen UI state several owners must agree on (exact names in `UiState` / `UiActions`):

| Field | Set by | Read by | Purpose |
|---|---|---|---|
| `advisorOpen` + `openAdvisor/closeAdvisor/toggleAdvisor` | advisor (Ctrl+K, close), shell (phone centre tab) | advisor, shell (docking padding) | 3.14 |
| `advisorBusy` + `setAdvisorBusy` | advisor (each turn, each apply run) | every page button that calls `askAdvisor` (`disabled={advisorBusy}`) | 5.5 rule 13 |
| `advisorRequest` (`{id, outgoing}`) + `askAdvisor(outgoing)` | map (form 4), cv (result cards), jobs («دع دليلك يقدّم عنك») | advisor: a `useUi.subscribe` listener sends the request whose id is newer than the last handled id (a ref); never cleared, never taken | a page button asks «دليلك» (text + chip payload); ignored while `advisorBusy` |
| `holds` + `hold/release` (hook `useOverlayHold(key, active)`, layout effect) | welcome `reveal`, cv `cv-show`, learn `celebration`, advisor `advisor-apply`, map `map-open-full` | shell overlay host, advisor (nudge, rule 7) | 3.15 hold rule |
| `blocking` + `setBlocking` | shell overlay host (`daily` blocks input; `levelup` never does, it is listed for the nudge) | map (opening waits for daily), advisor (nudge) | 2.6, 3.4 |
| `applySheetOpen` + `setApplySheetOpen` | jobs (either mode) | advisor (rule 7), `startApplyRun` | 5.5 rule 7 |
| `applyRun` + `startApplyRun / setApplyStep / requestApplyStop / finishApplyRun / clearApplyRun` | advisor (start, stop, watchdog, clear), jobs (steps, finish, unmount) | both | 7.4 (§9.2) |
| `mapHandover` (`MapHandover & {id}`) + `setMapHandover` | welcome sets; map clears (end of the full form, or unmount) | map and shell, in a `useState` initializer on their first render (never destructive) | v3 3.3/3.4 |
| `mapOpenRequest` + `requestMapOpen()` | advisor dispatcher | map | v3 3.4 situation 3 |
| `brain` + `setBrainStatus` (hook `useBrainStatus()`) | the hook (GET /api/brain once) | advisor (mode line), cv (privacy line), profile, welcome | 3.6, 3.13, 3.14 |
| `resetUi()` | every account action of the persisted store, `applySeed` | — | keeps `brain` and the id counters; clears everything else |

**Reading rules (Strict Mode).** Ids only increase. One-time values are never consumed: readers remember the id they
handled, or read the value in a `useState` initializer on their first render. Code that must see the latest holds or
`blocking` reads `useUi.getState()` inside its effect or listener, never a render-time copy.

### 5.4 Hooks (`src/lib/store/hooks.ts`)

`useHydrated()` · `useCurrentUser()` · `useAccounts()` · `useClock(intervalMs?)` (stable between ticks; 60 s default,
5 s on `/applications`) · `useDerived(compute)` (memoised on user and clock; pass a stable function) ·
`useOverlayHold(key, active)` · `useBrainStatus()`. Plus `useAppStore(selector)` / `useUi(selector)` with **stable**
selections only (`selectCurrentUser`); never return a new object from a selector (STACK 3.1 infinite loop).

Two of them must be right on the FIRST render of a component mounted after hydration (every screen):
- `useClock` = `useSyncExternalStore(subscribeTick(intervalMs), getCachedClock(intervalMs), () => EPOCH_CLOCK)`;
  `getCachedClock` replaces its cached Clock (`makeClock()`) only when it is older than `intervalMs`. So the first frame
  already has today, weekly XP, rank, streak and daily-reward-due (`data-value` from the first frame).
- `useViewport` (`@/features/shared`, written in full) = `useSyncExternalStore` over the two `matchMedia` lists.

`useOverlayHold` sets its hold in a **layout** effect, so a hold active on a component's first render is in the store
before any passive effect of that commit runs.

---

## 6. Data and copy (owner `data`)

`src/lib/data`: `FIELDS`, `JOB_CITIES`, `SKILLS`, `JOBS`, `COURSES`, `LEADERBOARD_USERS`, `LEVELS`, `BADGES`,
`ONBOARDING_QUESTIONS`, `SAMPLE_CV_BODY` / `sampleCvText(name)`, lookups `getSkill/getJob/getCourse/getField/getJobCity/
getLeaderboardUser/getLevel/getBadge/getQuestion/optionLabel` (throw on an unknown id: ids are typed, so that is a bug),
and `game.ts` (XP, `MATCH_LINE`, thresholds, timings, show step lists, `APPLICATION_PREFIX = "DL"`). Every list in spec
order. All copy exactly as the spec writes it.

`src/lib/copy`: only strings used by **more than one** owner, and helpers that combine copy with values. A string used by
one screen stays in that screen, copied verbatim from the spec.

| Export | Spec |
|---|---|
| `countNoun(n, noun, case)` (nouns: skill stage course hour lesson job star place day application badge minute) | How to read → Counted nouns |
| `relativeTime`, `clockTime`, `dayMonth`, `historyStamp` | How to read → Time |
| `SAMPLE_COPY`, `XP_REASON`, `XP_REASON_ONBOARDING_AND_TARGET`, `STAGE_STATE_LABEL`, `COURSE_STATE_LABEL`, `APPLICATION_STATUS_COPY`, `BAND_LABEL`, `NAV_LABEL`, `NEUTRAL_PRINT`, `SOURCE_LABEL`, `TOAST_COPY`, `ASK_ADVISOR_APPLY_TEXT` | 7.6, 3.15, 3.4, 3.10, 3.9, 9.3, 2.5, 4.3 |
| `starsOf`, `starsOfRequired`, `courseStateLabel`, `lockReasonText`, `nextStepLabel`, `revealReasonText`, `answerText`, `educationAndMajorText`, `applicationNote` (7.4 template), `cvAttachmentLine`, `xpHistoryText`, `xpNewsReason`, `hoursText`, `targetChangedToast`, `appliedChip` | 3.5, 3.8, 3.10, 2.8, 4.6, 4.3, 7.4, 3.13, 3.15 |

The onboarding acknowledgements and replies (4.4, 4.5) and «دليلك»'s reply templates (5.9) are NOT copy: they belong
to brain-advisor (`src/lib/brain/onboarding`, `src/lib/brain/advisor/templates.ts`).

---

## 7. Engine (owner `engine`): every function, its signature and its rule

All pure; inputs `UserFacts` (UserState satisfies it), the catalogue (imported from `@/lib/data`), and a `Clock` where
time matters. Names and signatures are in the stub files; this table is the map.

| Module | Function | Rule |
|---|---|---|
| `text/normalize` | `normalizeText(text)`, `cleanName(raw)`, `normalizeName(name)`, `validateName(raw)`, `tokenize`, `findKeyword(norm, kw)`, `findKeywords(norm, kws)`, `containsAny` | 4.3 normalisation (NFKC, marks, digits, أإآ→ا, ى→ي, ة→ه, lower-case); whole words with optional «ال» and one-letter prefix; earliest-then-longest tie rule; 3.1 name checks |
| `clock` | `makeClock(date?)`, `dayKey(date)`, `addDays(day, n)`, `weekStartOf(date)` | 8.4 calendar day, 8.7 week from Sunday 00:00 local |
| `stars` | `emptyStars()`, `cvStars`, `courseStars`, `skillStars(facts)`, `starSources(facts, skill)`, `totalStars`, `skillsHeld`, `starsBeforeLatestStar`, `skillNode`, `skillNodes`, `skillTreeSummary` | 8.5 stars = max(CV, highest completed course); 3.5 node states, sources, first-visit baseline |
| `match` | `matchPercent(reqs, stars)`, `matchBreakdown(job, stars)`, `jobMatch(jobId, facts)`, `targetMatch(facts)`, `starGain(required)`, `jobGap(jobId, facts)`, `projectedMatch(jobId, raisedTo, facts)` | 7.2 formula; 3.8 explainer; 7.3 gap rows (prep rows +0%); 3.4 projection |
| `roadmap` | `canonicalStages(jobId)`, `pathSummary(jobId)`, `roadmapFor(jobId, facts)`, `buildRoadmap(facts)`, `branchJobs(jobId, facts)` | 3.4 stages (prep, canonical order, displayed order, states, gate, numbers kept), per stage `matchAfter` and `matchAt`, 9.3 counts (6-11), branches |
| `courses` | `courseXp`, `shortTitle`, `courseState(id, facts)`, `courseOnPath(id, facts)`, `unlockerCourse(id, facts)`, `learnList(facts, tab, field)` | 8.2, "Course titles", 3.10 states and tabs, 8.5 credited, 3.11 «افتح المتطلب» |
| `jobs` | `rankJobs(facts)`, `searchJobs(facts, query)`, `jobsRequiringSkill(skill)` | 7.2 ranking and ties (fit score while no star), 7.1 search AND filters, 3.5 «تطلبها 3 وظائف» |
| `onboarding-fit` | `fitBreakdown(jobId, answers)`, `rankByFit(answers)`, `fitReasons(jobId, answers)`, `recommend(answers)` | 4.6 terms, education gate, ties, recommended + two alternatives; reasons for any job (`recommend` uses `fitReasons(recommended)`; the chip `why-path` uses `fitReasons(target)`) |
| `next-step` | `nextStep(facts)`, `nextStepTarget(step)` | 2.8 rules 1-5 |
| `levels` | `levelFor(totalXp)` | 8.3 + the 2.7 bar ratio |
| `xp` | `totalXp(facts)`, `weeklyXp(facts, clock)`, `xpEventId(type, ref)` | 8.1, 8.7 |
| `streak` | `streakInfo(facts, clock)`, `dailyRewardAmount(day)`, `dailyReward(facts, clock)` | 8.4 |
| `badges` | `badgesEarned(facts, clock)`, `badgeProgress(facts, clock)` | 8.6 rules |
| `leaderboard` | `weeklyRankFor(weeklyXp)`, `gapToNext(weeklyXp)`, `leaderboard(facts, clock)`, `rankBeforeLatestImprovement(facts, clock)` | 8.7 (ties go to the user), 9.5, 3.12 |
| `applications` | `applicationStatus(app, now)`, `nextApplicationStatus(app, now)`, `applicationNumber(seq, year)`, `nextApplicationNumber(facts, clock)` | 7.5 time + match + control + pinned; 7.4 «DL-2026-0001»; the ONE derivation of sequence (`applications.length + 1`) and year (`clock.today`), shared by `submitApplication` and the `apply_to_job` tool |
| `news` | `pendingNews(facts, clock)` | 3.15 merged toast, rank line (none when weekly XP was 0), level-up, badge toasts |
| `avatar` | `defaultAvatar(name)` | 9.6 code-point sum mod 4 + 1 |

Four definitions builders always ask about:
- **Displayed stage order** (3.4): CV-proven stages in canonical order, then course-completed stages in completion
  order, then the rest in canonical order. A prep stage done by implication (the prepared skill already has a star) joins
  the group of the star that implied it. `n` = 1-based displayed position = `path-stage-{n}` = «المرحلة {n}».
- **`matchAfter` vs `matchAt`** on a stage: `matchAfter` = the match after completing THIS one stage's course from the
  current state (stage sheet «أثرها على المطابقة», next-step card). `matchAt` = the match with stages 1..n held and none
  after: the match "at this station", for a drawing that shows the match along the path (altitude, the rising line).
  It equals `Roadmap.match` at the last done stage and 100 at the last stage; the start is 0. Data analyst after the
  sample CV, stages 1-8: 10, 20, 30, 50, 60, 70, 90, 100.
- **`rankBeforeLatestImprovement`**: walk this week's XP events in order, ranking the running weekly sum; return the
  rank just before the last event that improved it. Demo: after the application it is 18 (the course moved 18 → 10;
  the +40 moved nothing). Seeds: onboarded 23, cv-analysed 22, course-done / mid-path 18, job-ready 10, returning 10.
- **Daily reward due**: today ≠ `createdDay` and no `daily_reward` event dated today; amount `min(100, 20 × streak day)`
  where the streak day is today's streak after `touchDay`.

---

## 8. The brain protocols (owner `brain-advisor` unless noted)

### 8.1 Brain status — `GET /api/brain` → `BrainStatus { configured, provider, mode }`

`configured` = a provider resolves (AI_PROVIDER + a non-empty key). `mode` = "online" when configured and not cooling
down, else "local". Fetched once per page load by `useBrainStatus()`. The advisor's `done.mode` updates it.

### 8.2 Advisor — `POST /api/advisor`

**Request** (`AdvisorRequest`): `{ v: 1, message: { text ≤ 500, chip? }, history (last 12, oldest first), facts
(UserSnapshot = factsOf(user)), clock (makeClock()), page: PageContext, thread: { jobsDisclosed, lastJobIds,
lastCourseIds } }`. `PageContext = { route, jobId?, courseId?, skillId?, applySheetOpen, showRunning }` — built by the
advisor from `parsePathname(usePathname())` (ids validated with `asJobId` / `asCourseId`), `?skill=`, and the UI store.

**What «دليلك» may know** = `UserFacts` + the last 12 messages + the page. Not the CV text, not the other thread, not the
markers. The server derives every number (match, rank, next step) from the facts with the same engine as the browser.

**Response**: NDJSON, `AdvisorEvent` per line, in this order within a turn: `status*` → `action?` → `text+` → `card*` →
`chips?` → `done` (or `error`). Event union and fields: `protocol.ts`. A stream that ends without `done`/`error` is a
failure.

| Event | Meaning for the panel |
|---|---|
| `status {tool, text}` | roll the status line to `text` (`THINKING_LINE` before any tool; `TOOL_STATUS[tool]` while one runs); during an apply run the line follows `applyStatusLine(applyRun.step)` |
| `action {action}` | hand to the dispatcher; **hold every later event of this turn** until it reports (rule 12, `page-handoff`) |
| `text {text}` | one complete paragraph; reveal block by block (`answer-focus`, 80 ms apart) |
| `card {card}` | draw from data by id (titles, company + «جهة تجريبية», live match / status); the `next-step` card carries nothing and is drawn and performed with the live `nextStep(facts)` (`useNextStepAction`) |
| `chips {chips}` | the reply's chips (role yes/no/chip → test ids); they replace the page chips while shown; only the newest «دليلك» message shows chips |
| `done {mode, source}` | end; update the mode line |
| `error {code}` | «تعذّر الرد الآن. جرّب مرة أخرى.» + «أعد المحاولة» (`advisor-retry`) |

**Actions** (`AdvisorAction`) and how the dispatcher applies them (§9). For EVERY action, first: if `applySheetOpen` or
any hold is set (rule 7), resolve `{ok: false, reason: "blocked"}` and change nothing (the router already avoids this
when it can see it in `page`; the client re-checks for the race). Then, on phones (`!useViewport().desktop`),
`closeAdvisor()`; the panel calls `openAdvisor()` when it reveals the held reply (3.14 "Acting on the page").

| Action | Dispatcher |
|---|---|
| `navigate {to: NavTarget}` | for `to.screen === "path"` first `requestMapOpen()` (short `map-open`, also when already there), then `go(hrefFor(to))`; resolve `{ok: true}` about 400 ms later, when the new page has entered (`page-handoff`: the page changes first, the reply follows) |
| `start_course {courseId}` | `startCourse` (refused → `{ok: false, reason}` = locked / credited / completed) → toast «بدأت الدورة. بالتوفيق.» → `go(/learn/{id})` |
| `set_target {jobId}` | `setTarget` → toast `targetChangedToast(jobId)` → `requestMapOpen()` + `go(/path)` |
| `apply {jobId, expect}` | the visible application of 7.4 (§9.2) |

**Tools** (spec 5.3; params `ToolParams`, results `ToolResults`, failure `ToolError` in protocol.ts): `navigate`,
`search_jobs` (default limit 5, show false), `get_job_gap`, `explain_match`, `recommend_next_step` (its `badges` are
simulated with the pure transitions on a copy of the facts), `list_courses` (limit 5), `get_course`, `start_course`,
`apply_to_job`, `list_applications`, `set_target_job`, `get_leaderboard` (`plus_xp`), `list_badges`. Every tool that
returns a gain returns its match after (flat shapes spell it `match_after`; embedded engine types such as `Gap` and
`NextStep` keep `matchAfter`: both accepted, stated in protocol.ts). `ToolCourse` carries `prep` and `prepares`, so a
model turn can give the preparatory wording of 5.9. Executed by `runTool(name, params, {facts, clock, page})`
(`brain/advisor/tools.ts`, pure); simulations run the transitions on `stateFromFacts(facts)` (`store/snapshot.ts`);
`apply_to_job`'s number is `nextApplicationNumber(facts, clock)`. The three state-changing tools return what WOULD
happen; the router turns that into an `action`, a model turn turns it into an offer with chips (5.4).

**Chips and buttons** carry a `ChipPayload` (types.ts) — never parsed as text: `page {slug}` · `start_course {courseId}` ·
`apply {jobId, anyway?}` · `set_target {jobId}` · `open {to}` · `not_now`. Page chips come from `pageChips(page, facts,
clock)` (pure, client-side). Every «دع دليلك يقدّم عنك» button calls `askAdvisor({ text: ASK_ADVISOR_APPLY_TEXT, chip: {
intent: "apply", jobId } })` and renders `disabled={useUi((s) => s.advisorBusy)}`; «اسأل دليلك عن هذه الوظيفة» calls
`openAdvisor()` only (the page chips do the rest).

**Chip roles and test ids.** A reply that offers one action with two chips (the action, then «ليس الآن» or «شاهد
الفجوة») sends them as role `"yes"` then `"no"` → `advisor-confirm-yes` / `advisor-confirm-no`. Every other reply chip is
role `"chip"` with a slug → `advisor-chip-{slug}`: the 5.8 slug for page intents (the fallback's «ماذا أفعل الآن؟» is
`next-step`, «لماذا هذه المطابقة؟» is `why-match`) and `open-{screen}` for «افتح…» chips (`open-path`,
`open-applications`, `open-jobs`). Reply chips replace the page chips while shown, so a slug is never on screen twice.
A chip on a card renders as `advisor-card-action-{id}`.

### 8.3 The rules of spec 5.5, and where each is enforced in code

| Rule | Where | How |
|---|---|---|
| 1 router first | `server/run-advisor.ts` → `advisor/router.ts` | `routeAdvisorMessage` runs on every message; `kind: "router"` (rows 1-8, chips, 5.8 fixed answers) is emitted as is in every mode |
| 2 ids are real | `schemas.ts` (request), `advisor/tools.ts` | ids checked with the `is*Id` guards; unknown → `ToolError` → «لم أجدها» template |
| 3 consent | `advisor/router.ts` (5.4 typed-request detection), `run-advisor.ts` | state-changing tools execute only in router turns; at most one per message |
| 4 one id | `advisor/router.ts` | page id, or the only full title in the message, or the chip's id; else «على أي وظيفة؟» with up to three cards carrying chips |
| 5 low match needs a second yes | router `apply` | match < 60 → `low_match` template + chips «قدّم على أي حال» (`apply {anyway: true}`) · «شاهد الفجوة» (`open job #missing`); no action |
| 6 no completion | router row 1 | fixed refusal; no such tool exists |
| 7 navigation asked | `run-advisor.ts` (model turns: `asksToOpen`), `advisor/router.ts` (router turns: no action at all while `page.applySheetOpen \|\| page.showRunning`), dispatcher (client re-check: holds / sheet open → `blocked`) | a model's unasked navigation is dropped and the reply carries «افتح {page}»; a blocked action is answered with `blockedActionReply(action, facts)` |
| 8 numbers from data | `advisor/rules.ts numbersAreGrounded` | a failing model reply is replaced by the tool's 5.9 template |
| 9 no done-claim | `rules.ts claimsUndoneDeed` | replaced by the offer template |
| 10 cards from data | events carry ids only | the panel draws from data |
| 11 always an answer, soon | `run-advisor.ts`, `server/provider.ts` | 2.5 s to the first provider event, else the local events; 60 s cooldown (`markProviderFailure`); after a sent `action` / `text` / `card` / `chips` event, finish with the called tool's template (a `status` line does not count: «دليلك يفكّر…» may be sent before the provider answers) |
| 12 reply waits for the deed | advisor panel | events after `action` are held until the dispatcher resolves; not ok → the template for the reason (§9.1) |
| 13 one thing at a time | advisor panel (`advisorBusy`), `askAdvisor` (ignored while busy), `startApplyRun` (null while a run is unfinished or a sheet is open) | send, chips and every «دع دليلك يقدّم عنك» button disabled while in flight |
| 14 bounded | `run-advisor.ts` | ≤ 4 tool rounds, ≤ 1 navigation |
| 15 scope | router fallback, prompt | no web/file tools |
| 16 honesty on applying | apply template | the trial sentence is always in the template |
| 17 length | `rules.ts capReplyLength` | cut at the last full sentence before 600 |
| 18 keys | `server/provider.ts` | clients only with an explicit non-empty key; never `NEXT_PUBLIC_` |

### 8.4 Timeouts and fallback (`TIMEOUTS_MS` in protocol.ts)

| Call | Limit | On failure (except a user abort) |
|---|---|---|
| Advisor model, first event | 2.5 s | local brain answers the same message; cooldown 60 s; mode line local |
| Onboarding classification | 2.5 s (server and client) | `unclassified` → the local "not mapped" path |
| CV model | 12 s | the local analyser's result stands alone (engine "local") |
| CV analyse, client | 15 s | «تعذّر التحليل الآن. جرّب مرة أخرى.» |

Gemini: `httpOptions.timeout` in ms, no retries by default. Anthropic: `maxRetries: 0`, `timeout` in ms. Pass
`request.signal`. Classify errors (STACK 5.6, 6.6) into `BrainFailure`; only `"aborted"` skips the fallback.

### 8.5 Onboarding

Browser: `openingMessages(name)` on first visit → `appendOnboardingMessages`; each answer → `onboardingTurn(
onboardingContext(user), input)` → `applyOnboardingTurn(turn)`. **The pending question is derived, never stored**:
`pendingQuestion(answers)` = the first of the six (4.1 order) with no answer, null when all six are set;
`onboardingContext(user).pending` = null while the thread is empty, else `pendingQuestion(user.answers)` (both written
in full in `brain/onboarding/index.ts`). So right after the greeting it is `city`: welcome shows question 1's chips
(`questionChips(pending, answers)`), a typed first answer is read against it (4.3 step 3), and `resumeMessages`
re-asks it after a reload. If `turn.unmapped` and `useBrainStatus()?.mode ===
"online"`: `classifyOnboarding({v:1, question, text})` (2.5 s); on `classified`, run `onboardingTurn` again with a
`classified` input and apply that turn instead. The «مدينة أخرى» chip is not sent: it focuses the composer with the
placeholder «اكتب اسم مدينتك». Thinking delay 350-600 ms (`ONBOARDING_TIMING`), from a deterministic value (no
`Math.random` in render). `POST /api/onboarding`: `OnboardingClassifyRequest` → NDJSON `OnboardingEvent`.

### 8.6 CV (owner `brain-cv`)

`POST /api/cv/extract` (multipart `cv`) → `CvExtractResponse` (`wrong_type | too_large | too_many_pages | unreadable |
no_text`). `POST /api/cv/analyse` (`CvAnalyseRequest {v, text, fileName}`) → `CvAnalyseResponse` (`analysis:
CvAnalysis {skills, lines, engine, isSample}`; skills may be empty). `analysis.lines` is ALWAYS
`cleanCvLines(text).map((l) => l.text)`, for both analysers (tested), so the screen can show the same document before
the analysis returns. The client pre-checks type and size (`precheckCvFile`), and maps a failed fetch to
`request_failed`; the screen shows the 3.6 request-failed line («تعذّر التحليل الآن. جرّب مرة أخرى.» + «أعد المحاولة»)
for `request_failed` and also for the server's `too_short` / `bad_request` (unreachable in normal use: the screen checks
80 characters first). The sample CV is always read locally; the model never sets stars (6.6).

---

## 9. The dispatcher and «دليلك» applying (owner `advisor`, with `jobs`)

### 9.1 Turn handling in the panel

1. A turn starts from an event handler (send, chip, card chip, retry) or from the `advisorRequest` subscribe listener
   (§5.3), never from a mount effect. Build the request (§8.2), append the user bubble (`appendAdvisorMessages`),
   `setAdvisorBusy(true)` (send, chips and page buttons disabled).
2. The turn runner is a plain async function holding its `AbortController` in a ref; it writes to the stores and keeps
   going if components re-mount. **No effect cleanup aborts it** (Strict Mode runs cleanups on mount); only «إيقاف»
   does.
3. Read events. `status` → status line. On `action`: call `dispatchAction(action, { go, pathname, isPhone })` →
   `Promise<DispatchResult>`; queue every later event. On resolution: `ok` → reveal the queued events; not ok → discard
   them and reveal the client template for the reason (templates.ts):

   | `reason` | Shown instead |
   |---|---|
   | `stopped` | `applyStoppedLine()` |
   | `interrupted` | `applyInterruptedLine()` |
   | `blocked` | `blockedActionReply(action, facts)` (text + its «افتح {page}» chip) |
   | `already_applied` | `applyAlreadyReply(applicationStatus(app, clock.now))` + chip «افتح طلباتي» |
   | `locked` / `credited` / `completed` | `startCourseRefusedLine(reason, courseId, facts)` |
   | `no_user` | `replyFailedLine()` |

4. On `done`, append «دليلك»'s message (blocks, cards, chips) to the thread; `setAdvisorBusy(false)`; on phones
   `openAdvisor()` if an action had closed the panel.
5. «إيقاف» aborts the fetch (what arrived stays) — or, during an apply run, calls `requestApplyStop()`.

### 9.2 The apply run (spec 7.4), step by step

| Who | What |
|---|---|
| dispatcher | `startApplyRun(jobId)`: null (a run unfinished, or an apply sheet already open, rules 13 / 7) → resolve `blocked`. Else `hold("advisor-apply")`; `setApplyInFlight(jobId)`; on phones `closeAdvisor()`; if not on `/jobs/{jobId}`, `go(hrefFor({screen:"job", jobId}))`; start the **watchdog**: if `applyRun.step` is still 0 three seconds after `usePathname()` became `/jobs/{jobId}` (or after the start, when already there), or 15 s after the start in any case (a first dev-server compile of the route can take seconds), `finishApplyRun(runId, {kind: "interrupted"})` |
| jobs page | sees `applyRun.jobId === id` and `applyRun.result === null`: opens the apply sheet in advisor mode (`setApplySheetOpen(true)`), runs steps 1-6 with `useShow` and `ADVISOR_APPLY_STEPS`, calling `setApplyStep(runId, n)`; fields type themselves (the chat kit's `TypedField` / `useTypeOn`), the note is `applicationNote(jobId, facts)` |
| jobs page, start of step 5 | `submitApplication({ jobId, note, by: "advisor" })`, result kept in a ref; the stop control disappears |
| jobs page, during 1-4 | if `applyRun.stopRequested`: stop, leave the sheet open and editable with what was written, `finishApplyRun(runId, {kind: "stopped"})` |
| jobs page, end of step 6 | confirmation shown 1.2 s, sheet closes itself, `finishApplyRun(runId, {kind: "sent", application, consequence})` (or `failed` if the store refused) |
| jobs page, **unmounted mid-run** (a nav item, the logo, Back) | reported from a **deferred cleanup** (§13): before step 5 → `finishApplyRun(runId, {kind: "interrupted"})` (no record exists); from step 5 → `finishApplyRun(runId, {kind: "sent", …})` from the ref (the record exists). Strict Mode's simulated unmount reports nothing, because the component is mounted again before the deferred check runs. The show starts once per run id (`startedRef`), so the second mount effect does not restart it |
| dispatcher | on `result`: `release("advisor-apply")`, `setApplyInFlight(null)`, `clearApplyRun()`, resolve `{ok: true}` for `sent`, else `{ok: false, reason}` (`stopped`, `interrupted`, `already_applied`, `no_user`); the panel reopens on phones with the reply; if `expect.number` ≠ the record's number, the panel shows `applySentReply(record)` instead of the held text |

Reload before step 5: no application; `resolveInterruptedApply()` on the next load adds «لم يكتمل التقديم…». Reload
after: the application exists; its news shows once. The apply sheet's own «إيقاف» calls `requestApplyStop()` too.

**The apply sheet's DOM and layering** (spec 3.8: "its backdrop covers the content area only, so the advisor panel that
is narrating it stays visible, undimmed and above it"; 7.4: the composer's «إيقاف» is the sheet's «إيقاف»):
- It is a Base UI `Dialog` built by `jobs`, **not** the stock modal `Sheet` (whose full-viewport scrim blocks pointer
  events and would dim the panel). `Dialog.Portal container` = the shell's `#app-content` element (§11.1), so it renders
  inside the content's stacking context, below the advisor panel, the toasts and the level-up.
- Backdrop and popup are `position: fixed` and limited to the content area with the shell's custom properties:
  `inset-block: 0; inset-inline-start: var(--content-inset-start); inset-inline-end: var(--content-inset-end)`; the
  popup is centred inside that box (phone: full screen; both insets are 0 below 1024 px).
- Advisor mode: `modal={false}` (the composer's «إيقاف» stays reachable by pointer and keyboard). User mode:
  `modal="trap-focus"` (focus stays in the sheet; pointer use of the docked panel stays possible). Both:
  `disablePointerDismissal` (a click on the panel never closes the sheet or loses an edited note); it closes on
  «إلغاء», «إغلاق», Esc (§13) or by itself after the advisor's step 6.

### 9.3 Navigation from chips and cards

Cards are clickable (`go(hrefFor(...))`). A card chip and a reply chip send a new message with its payload (the router
answers). «ليس الآن» is a message too («تمام، متى ما أحببت.»).

---

## 10. The overlay queue (owner `shell`)

`OverlayHost` lives in the app shell (never on `/` or `/welcome`). It runs **passes**: the first one
requestAnimationFrame after its mount (so every hold that a page set on its first render, in a layout effect, is
already in the store, whatever the order of sibling effects), then one on every change of the current user or of the
UI store (`useUi.subscribe` / `useAppStore.subscribe`). Each pass reads `useUi.getState()` and
`useAppStore.getState()` **inside** the pass, never a render-time copy:

1. **Daily reward first, alone** (blocks): `touchDay()` ran on mount; if `dailyReward(facts, clock).due`, show the
   daily overlay (`setBlocking("daily")`; this one IS the design system's modal `Sheet`), «استلم +{amount} XP» →
   `claimDailyReward()`; then continue. Holds do not delay it.
2. **If any hold is set, wait.** (Holds: `reveal`, `cv-show`, `celebration`, `advisor-apply`, `map-open-full`.)
3. `news = pendingNews(facts, clock)`. `news.xp` → `toast.xp({ amount, reason: xpNewsReason(news.xp), rank:
   news.xp.rankLine })` (design system `toast` from `@/components/ui`), then `markAnnounced({ xp: news.xp.eventIds })`;
   `xp-fly` to `shell-xp`; if `news.xp.levelUp`, the level-up card 600 ms later (`setBlocking("levelup")` while open).
   **The level-up is NOT a `Sheet`** (whatever `sheet.tsx` and playbook block 23 say): a non-modal card at `z-toast`
   with no backdrop and no focus trap, beside the toasts (a centred card on phones, still with no scrim). It closes on
   «متابعة», on Esc (§13), after 4 s, or on any pointer press outside it, caught by a `document` `pointerdown` listener
   in the capture phase that neither calls `preventDefault` nor `stopPropagation`, so the press also reaches its target
   (spec 3.15; demo step 7 presses `cv-go-path` while it is open).
4. `news.badges` → one `toast.badge({ badgeId, name, description, emblem: <BadgeEmblem id/> })` each, then
   `markAnnounced({ badges })`.

The celebration absorbs its own course's news: `completeCourse` writes it un-announced like everything else, the learn
page holds `celebration` before calling it and marks the news announced at beat 1 (§11.5). A reload never loses or
repeats news: the queue is rebuilt from the `announced` flags.

---

## 11. Screen contracts that cross owners

### 11.1 Guard and shell (owner `shell`)

- `Guard` (`src/features/shared/guard.tsx`) **decides once per mount**, for the URL it was mounted on: logo only until
  hydrated → `?seed=` (read from `window.location` in an effect; apply, then `router.replace` without it; unknown names
  are just removed) → the redirects of spec 2.2 (logo while redirecting) → children. From then on it never redirects
  during that mount: the screen that changes the state navigates itself (signin → `go("/welcome")` or `go(to)` after
  `createAccount` / `resumeAccount` / `restartAccount`, the ordinary page transition with no logo frame; welcome → the
  hand-over of §11.2; profile → `go("/")` after `signOut` / `resetCurrentAccount`). One exception: in `welcome` and
  `app`, once no user is signed in any more, it renders nothing until that navigation lands (children may always assume
  a user). The `(app)` layout's Guard stays mounted while the user moves between app pages; a client navigation into a
  new area (welcome → `/path`) mounts a fresh Guard on a hydrated store, which shows its children on the first frame.
  Placement: `src/app/page.tsx` renders `<Guard area="signin"><SigninScreen /></Guard>`, `src/app/welcome/page.tsx`
  `<Guard area="welcome"><WelcomeScreen /></Guard>`, and `src/app/(app)/layout.tsx` `<Guard area="app"><AppShell>
  {children}</AppShell></Guard>`. Each screen's outermost element is still `<PageTransition>`.
- The app shell: side nav (≥ 1024 px) or phone top bar + tab bar (< 1024), the user chip, the next-step pill (hidden on
  the page it would open), `OverlayHost`, `<AdvisorRoot />`, the docking padding (`padding-inline-end: 436px` on
  ≥ 1280 px while `advisorOpen`), `touchDay()` on mount, `useBrainStatus()` once.
- **The shell's DOM contract** (jobs, advisor and the overlay host depend on it):
  - The page is rendered inside `<div id="app-content" className="@container/content relative isolate">`. `isolate`
    makes it a stacking context, so nothing portaled into it (the apply sheet, §9.2) can rise above the advisor panel,
    the toasts or the level-up, which are rendered OUTSIDE it, as its siblings (`<AdvisorRoot />`, `OverlayHost`,
    the toaster). `#app-content` itself has no `transform`, so `position: fixed` inside it is relative to the viewport.
  - The docking padding sits on a wrapper AROUND `#app-content` and the desktop top bar, never on `#app-content`
    itself, so the container query width is the visible content width.
  - The shell root sets two CSS custom properties: `--content-inset-start` (the side nav's width from 1024 px, else
    `0px`) and `--content-inset-end` (`436px` while the panel docks at ≥ 1280 px, else `0px`). Fixed layers that must
    cover "the content area only" use them (the apply sheet).
- **Page layout follows the content width**: screens switch to two columns with `@min-[900px]/content:` (never with
  viewport `lg:`), so they reflow beside the docked panel.
- **Headings**: on desktop the top bar shows `PAGE_HEADINGS[route]` (for `/jobs/[id]` and `/learn/[id]` the section
  heading «الوظائف» / «الدورات», because the detail page has its own title header). Each list page renders its own
  `<h1>` with `lg:sr-only` (visible on phones, where the top bar has no heading). The top-bar copy is `aria-hidden`.
- **Titles**: every `page.tsx` exports `metadata = { title: { absolute: pageTitle(PAGE_HEADINGS.x) } }`; `[id]` pages use
  `generateMetadata` with the job title / short course title; `/` and `/welcome` use `pageTitle()` («دليل»).
- Only one of the desktop nav / phone tab bar is **rendered** (`useViewport()`, right on the first render), so test ids
  stay unique; the same holds for the desktop launcher (AdvisorRoot renders it only when `useViewport().desktop`, never
  hidden with CSS).
- The shell reads `useState(() => useUi.getState().mapHandover)` on its first render; when it is present (coming from the
  reveal), the shell's chrome arrives around the map (a short rise after ~300 ms) instead of being there from frame one.
  The shell never clears it.

### 11.2 Welcome → map hand-over (v3 3.3, 3.4)

On a choice in the reveal result, in this order: the rest of the result leaves (150 ms) → `setMapHandover({ jobId,
stripStays: jobId === recommended, stripRect, nodeRects })` (measured at that moment) → `setTarget(jobId)` →
`router.push("/path")` directly (not `useGo`, whose leave fade would hide the strip). The welcome Guard does not react to
`setTarget` (it decided at mount, §11.1). On `/path` the (app) Guard mounts on a hydrated store and shows the page on the
first frame (no logo flash).

The map reads the hand-over **on its first render**, `useState(() => useUi.getState().mapHandover)` (non-destructive,
so Strict Mode's double effects lose nothing, and the first frame already knows it), renders
`<PageTransition className="[animation:none]">` for that visit (the strip is already on screen, so no page-in rise), and
opens the full `map-open` out of the strip's geometry (`nodeRects`: start, stages in canonical order, goal). When
`stripStays` is false (an alternative was chosen) the full form plays from its first beat. The map clears it
(`setMapHandover(null)`) when the full form ends, or when it unmounts before that.

### 11.3 The map (owner `map`)

Inputs: `useDerived(buildRoadmap)`, `nextStep`, `leaderboard(facts, clock)` (top three + `me` for the preview, D4),
`user.seen`, `useUi` (`mapHandover`, `mapOpenRequest`, `blocking`).

**Stages: 6 to 11**, plus the start gate, the start and the goal (spec 3.4, 9.3). Any of the 20 jobs can become the
target through «اجعلها هدفي», and `bi-analyst-riyadh` has 11 stages, `web-app-developer-remote`,
`product-designer-jeddah` and `financial-analyst-riyadh` 10. D3's "4 to 8 stations" is the range the chosen drawing
was first tried at, not the data's: the drawing must lay out 11 at 390 px and at 1440 px and keep the five reading rules.
QA: `?seed=cv-analysed`, make `bi-analyst-riyadh` the target, check the reading rules at both widths. A drawing that
shows the match along the path (altitude, the rising line) uses `stage.matchAt` and 0 at the start, never its own
arithmetic, so the line ends on the ring's number (P5).

**The opening** is computed ONCE, in a `useState` initializer on the map's first render, so `data-open` on `path-map`
is right from the first frame:

```
!seen.mapOpenPlayed                              → "full"   (then catch-up if a CV is waiting for it)
cv && seen.catchUpForCv !== cv.analysedAt        → "catch-up"
otherwise                                        → "short"
```

- **Hold from the first render.** The map calls `useOverlayHold("map-open-full", opening === "full" && !ended)` from that
  first render (a layout effect), so the hold covers the first commit and the wait for the daily reward; the overlay
  host's first pass comes one frame later and finds it (§10). The +80 toast, the two badge toasts and the nudge therefore
  appear only when the full form ends (3.15, 2.6, demo step 4).
- **Wait for the daily reward.** Start the opening only when `!dailyReward(facts, clock).due && blocking !== "daily"`.
  `due` is known before `touchDay` runs (not the creation day, no `daily_reward` event dated today), so the map waits
  even though the shell's effect that opens the daily overlay runs after the map's own effects.
- When the full form starts: `markSeen("mapOpenPlayed", true)`. It holds until it ends. When catch-up starts:
  `markSeen("catchUpForCv", cv.analysedAt)`. Catch-up is the opening after a CV analysis, `data-open="catch-up"`, at
  most `MAP_OPEN.catchUpMs`; it may reuse the full form's beats but not its length (the design notes in
  `design/explore/darb/map/final-home.notes.txt` that play the full 3.5 s form after a CV are overruled by spec 3.4).
  The full form plays only while `!seen.mapOpenPlayed`.
- `mapOpenRequest`: remember its value at mount; a CHANGE after mount replays the short form (the dispatcher bumps it
  before navigating, so arriving from «دليلك» plays the opening once, not twice).
- Ring baseline: `seen.pathMatch` (write after showing). The map reads data only through the engine (`buildRoadmap`, `nextStep`, `leaderboard`, `jobMatch`) and labels
through data and copy (`getSkill(stage.skill).name`, `STAGE_STATE_LABEL`, `SOURCE_LABEL`, `lockReasonText`,
`hoursText`, `countNoun`); stage-sheet strings are copied from spec 3.4. The preview's user row is `leaderboard().me` with
the user's first name and «أنت»; sample rows use `TID.path.leaderboardRow(row.id)` for `row.id !== "me"`.
Never blocks input; reduced motion shows the end state. Next-step card: `useNextStepAction()`; form 4's «دع دليلك يقدّم
عنك» → `askAdvisor(...)` (disabled while `advisorBusy`), «قدّم بنفسك» → `/jobs/{id}?apply=1`; form 1's «ابدأ بدون
سيرة» → `skipCv()`. Branch cards at 100% → `ConfirmTargetDialog`.

### 11.4 CV (owner `cv`)

File → `precheckCvFile` → `extractCvFile` (errors in the input state) → start the show (`useOverlayHold("cv-show",
true)`) with `cleanCvLines(text).map((l) => l.text)` as the document during `read` (identical to the `analysis.lines`
that come back, so nothing re-flows) → `analyseCvText` → empty skills: the empty state, nothing saved → else
`recordCvAnalysis({analysis, fileName})` **before** `extract` begins, then the show plays the real evidence
(`analysis.skills[i].line` indexes `analysis.lines`). Errors: the 3.6 lines for the extract codes; `request_failed`,
`too_short` and `bad_request` all show «تعذّر التحليل الآن. جرّب مرة أخرى.» with «أعد المحاولة». Result cards:
`rankJobs` top three, «دع دليلك يقدّم عنك» → `askAdvisor` (disabled while `advisorBusy`), «اجعلها هدفي» →
`ConfirmTargetDialog`. Privacy line extension when `useBrainStatus()?.configured`.

### 11.5 Learn (owner `learn`)

«ابدأ الدورة» → `startCourse`; «أكمل الدورة» → `lessons-cascade`, then, in one handler:
`useUi.getState().hold("celebration")` FIRST (synchronously, so the overlay host never sees the news without the hold)
→ `completeCourse(id)` → the celebration from the consequence (beats: course, xp, star, match only if `onPath`, level
only if changed, badges only if any, rank only if improved; `CELEBRATION_BEATS` timings), kept held with
`useOverlayHold("celebration", open)` while open. **When beat 1 shows**: `markAnnounced({ xp: consequence.xp.events.map(
(e) => e.id), badges: consequence.badges })`: the celebration absorbs its own news (3.11, 3.15), and a reload before
beat 1 still shows it later as toasts. If `completeCourse` refuses, release the hold. «الخطوة التالية» →
`useNextStepAction()(nextStep(facts))`.

### 11.6 Leaderboard, applications, skills, profile

- Leaderboard: `leaderboard(facts, clock)`; climb from `seen.leaderboardRank ?? rankBeforeLatestImprovement(...)`; then
  `markSeen("leaderboardRank", rank)`. The home preview never writes this marker.
- Applications: `useClock(APPLICATION_TIMING.refreshMs)`, `applicationStatus(app, clock.now)`, «محاكاة: انقل للحالة
  التالية» → `advanceApplication`; `seen.applicationStatus` for `status-advance`.
- Skills: `skillNodes`, `starSources`, baseline `seen.skillStars ?? starsBeforeLatestStar(facts)`; `/skills?skill=` opens
  that panel; «ابدأ الدورة» → `startCourse` + open; «عرضها» → `hrefFor({screen:"jobs", skill})`.
- Profile: `levelFor`, `streakInfo`, `badgeProgress`, XP history from `xpEvents` (newest first, `xpHistoryText`,
  `historyStamp`), answers via `answerText`; `badge-reveal` from `seen.profileBadges` (null = every unlocked badge once).

### 11.7 Replay markers (`seen`) and who writes them

| Marker | Writer | When |
|---|---|---|
| `mapOpenPlayed` | map | the full `map-open` starts |
| `catchUpForCv` | map | `catch-up` starts |
| `pathMatch` | map | after the ring has counted |
| `skillStars` | skills | after `star-fill` / `node-unlock` |
| `leaderboardRank` | leaderboard | after `row-climb` |
| `profileBadges` | profile | after `badge-reveal` |
| `jobsMatch` | jobs | after `ring-count` / `list-reorder` on `/jobs` |
| `applicationStatus` | applications | after `status-advance` |
| `nudge` | advisor | when the nudge shows |

Use the motion block `useSeen(read, write, current)` with `read = () => user.seen.x ?? undefined` and `write = (v) =>
useAppStore.getState().markSeen("x", v)`.

---

## 12. Seeds (owner `store`, spec 10.3)

`buildSeed(name, clock): PersistedState` runs the pure transitions; `applySeed(name)` replaces everything saved.

| Seed | Built by |
|---|---|
| `fresh` | `{ currentUserId: null, users: {} }` |
| `onboarded` | `newUser("خالد")` (av-01) → `completeOnboarding(4.6 answers)` → `setTarget("data-analyst-riyadh")` |
| `cv-analysed` | + `recordCvAnalysis({ analysis: analyseCvLocal(sampleCvText("خالد")), fileName: null })`; `seen.catchUpForCv = null` |
| `course-done` | + `startCourse("c-powerbi-1")` → `completeCourse("c-powerbi-1")` |
| `mid-path` | + `submitApplication({ jobId: "data-analyst-riyadh", note: applicationNote(...), by: "advisor" })` with the record pinned at `review` (manualStatus "review", pinned true) → `startCourse("c-statistics-2")` → `tickLesson` 1, 2 |
| `job-ready` | `course-done` + `startCourse` / `completeCourse("c-statistics-2")` (no application) |
| `returning` | `mid-path` built at a clock two days back for creation and the first events, active the day before yesterday and yesterday, newest events dated yesterday; today not active yet (the first app-shell load offers day 3) |

Then quiet: every XP event and badge `announced: true`; advisor thread empty; `seen.nudge = true`;
`seen.mapOpenPlayed = true`; `seen.leaderboardRank = null`. Expected numbers: the 10.3 table (tested, §14).

---

## 13. Conventions

- **Files** kebab-case; components PascalCase; hooks `useX`; one component per file where it is large.
- **Imports** through the `@/` alias and module indexes (`@/lib/engine`, `@/lib/data`, `@/lib/copy`, `@/lib/store`,
  `@/features/shared`); `import type` for types (isolatedModules).
- **"use client"** first line of every component file with hooks/state/events/motion; never in `src/lib/{ids,types,data,
  copy,text,engine,routes,testids}` or the pure brain/store modules. `page.tsx` / `layout.tsx` stay Server Components.
- **Time** is read only in `makeClock()` (handlers, effects) and inside `useClock` (§5.4); never `Date.now()` in render.
- **Every `page.tsx`** renders one client screen whose outermost element is `<PageTransition>` (playbook 1.5; the map
  skips the animation after a hand-over). Components that call `useSearchParams()` sit under `<Suspense>` (STACK 1.3).
- **Navigation** with `useGo()` / `NavLink` from `@/components/motion` and URLs from `hrefFor`. Filters and tabs write
  the URL with `router.replace(url, { scroll: false })` (no page transition).
- **Errors**: actions return result unions; routes never throw to the client (JSON error or an `error` event); a
  component never throws in render; unknown `[id]` → `NotFoundBlock`.
- **Test ids** from `TID` (`src/lib/testids.ts`). `data-value` = the raw final number (no %, no commas) from the first
  frame; `data-state` = the spec's state words. Ids marked "architect" in testids.ts are additions QA may rely on.
- **Numbers** via `formatNumber` / `formatPercent` / `formatGain`; never `toLocaleString`. Latin digits everywhere.
- **No `Date.now()` / `Math.random()` in render**; time comes from `useClock()` or `makeClock()` in handlers.
- **Applying from a page button while «دليلك» is busy**: every button that calls `askAdvisor` renders
  `disabled={useUi((s) => s.advisorBusy)}` (rule 13; `askAdvisor` ignores it anyway).
- **Arabic** stays in source files (never in shell arguments). RTL logical classes only (STACK 2.4).
- **Colours** from design tokens only (DESIGN-BRIEF §4).
- **Reduced motion** (spec "How to read": one global rule, no special sequences): under `useInstant()` pass `[]` to
  `useShow` so a show ends at once on its result (the reveal on its result, the CV show on its results, the celebration
  on its end state, `map-open` on the map at rest). Never use `REVEAL_STEPS_REDUCED` (if `RevealStage` picks it on its
  own, do not use `RevealStage` under reduced motion, and say so in your report).
- **Keyboard** (spec 2.9, 3.3, 3.6, 3.11, 3.14, 3.15), so one key press does one thing:
  - Show keys (Space, and Esc as "skip") are ignored when `event.target` is an `input`, a `textarea` or
    `contenteditable`, or when focus is inside the advisor panel; a show also ignores Esc while `advisorOpen`.
  - Esc goes to exactly one layer, the topmost of: an open dialog or sheet (Base UI handles its own) → the level-up →
    the advisor panel (always first when focus is inside it) → skipping a running show (the celebration: = «رجوع
    لمساري»). Every Esc handler returns early when `event.defaultPrevented` and calls `preventDefault()` when it acts.
- **Strict Mode patterns** (dev runs every effect mount → cleanup → mount):
  - Never consume a one-time value in an effect; read it in a `useState` initializer or remember its id in a ref.
  - Work that must survive re-mounts (an advisor turn, an apply run) is not owned by an effect cleanup.
  - "On real unmount" logic uses a **deferred cleanup**: the cleanup sets `mountedRef.current = false` and schedules
    `setTimeout(check, 0)`; the mount effect sets it back to true; `check` acts only if it is still false. Strict Mode's
    simulated unmount is followed by a re-mount before the timer fires, so it does nothing.
  - Appends guarded by state (the onboarding greeting) check the store inside the handler, not a render-time copy.

---

## 14. What each foundation agent must unit-test (vitest; the lead runs `npm test`)

Tests are `*.test.ts` next to the module, import pure modules only, and use `makeClock(new Date("2026-11-18T21:00:00"))`
style fixed clocks (vitest fake timers allowed).

**data** (`src/lib/data/data.test.ts`): spec 9.8 checks **1** (7 fields; 38 skills split 7/6/5/5/5/5/5; 59 slots),
**2** (59 courses `c-{skill}-{star}` one per slot; hours as listed; 566 hours; lessons per 8.2), **3** (20 jobs × 5
requirements; no requirement above the skill's slots; every skill required by ≥ 1 job), **7** (24 users; totals all
different; weekly all different and ≤ total; levels match 8.3; no weekly neighbours share an avatar; none uses
av-01..04), **8** (no forbidden company words of 9.7, no «ريال»/salary); the demo aliases of 9.2 exactly;
prerequisites inside their field. `copy/*.test.ts`: `countNoun` for every noun form listed in "How to read" (1, 2 subject,
2 object, 3, 10, 11), `relativeTime` boundaries, `applicationNote` = the 7.4 demo text at 90%.

**engine**: `text/normalize.test.ts` (4.3 examples: «بالرياض»/«الرياض», «لطلباتي», سارة/ساره, Latin case, Arabic-Indic
digits, presentation forms via NFKC); `match.test.ts` (the 7.2 table 70/90/100; thirds 43/53/57; stars above the
requirement add nothing; `starGain` 20/10/7); `roadmap.test.ts` (data-analyst stages and order after the sample CV,
stage 7 current, stage 8 upcoming, «6 من 8 · 22 ساعة», after Power BI «7 من 8 · 12»; `matchAt` for stages 1-8 =
10, 20, 30, 50, 60, 70, 90, 100 and stage 6's `matchAt` = `match` = 70; `matchAfter` of stage 7 = 90; branches 50→80
and 43→60; `bi-analyst-riyadh` gives 11 stages;
**9.8 check 9**: 8/74, 7/60, 7/64; every job's stage count and prep count = the 9.3 column); `jobs.test.ts` (after the
sample CV, the first eight of 3.7 in order; «محلل بيانات» + riyadh search returns exactly two; **9.8 check 5**: every
job's match = the 9.3 column, only data-analyst ≥ 70); `onboarding-fit.test.ts` (**9.8 check 6**: the 4.6 worked
example scores 100/90/82/78/47, recommended + alternatives + three reasons; `fitReasons(recommended)` = those reasons;
`fitReasons` of another job gives that job's reasons); `levels.test.ts` (8.3 table; 180 → 2 with
170 to go; 420 → ratio 0.28); `leaderboard.test.ts` (ranks for 0, 50, 80, 180, 380, 420, 480, 660 = 25, 23, 22, 18,
10, 10, 8, 6; tie goes to the user; gap at 420 = 20); `streak.test.ts` (8.4 with fixed clocks: +1, same day, reset,
reward 20…100 cap, no reward on the creation day; `dailyReward().due` is right before `touchDay`); `next-step.test.ts`
(each rule); `applications.test.ts` (7.5 timing, pinned, manual advance; «DL-2026-0001»; `nextApplicationNumber` with
no application at a 2026 clock = «DL-2026-0001», with one = «DL-2026-0002»); `news.test.ts` (the +80 merged toast without rank line; +100 with rank 18 and
level-up 2; +40 with no rank line); `avatar.test.ts` («خالد» → av-01, «محمد» → av-03).

**store** (`transitions.test.ts`, `seeds.test.ts`): **the spec 8.8 / 10.4 walk** on pure transitions with fixed clocks —
after each step assert XP total, level, target match, weekly rank and badges held: 50/1/–/23/1 · 80/1/0/22/2 ·
180/2/70/18/3 · 380/3/90/10/5 · 420/3/90/10/6 · 660/4/100/6 (job-ready); the consequences the screens play (CV: +100,
level 1→2, match 0→70, rank 22→18, [cv-scanned]; course: +200, 2→3, 70→90, Power BI 0→1, 18→10, [first-course,
top-ten]; apply: +40, rank 10→10, [first-application]); the two alternative orders of 8.8 (skip the application →
620, level 4, rank 7; apply at 70% first → 220 rank 16, then 420 rank 10); every gain (the course's included) written
`announced: false`, and `markAnnounced` with the consequence's ids clears exactly those; a second application refused;
the application number equals `nextApplicationNumber` before the call; a second CV analysis keeps course stars;
`resolveInterruptedApply(user, clock, line)` appends `line` once and clears the marker; `stateFromFacts(factsOf(u))`
round-trips the facts; account normalisation (سارة/ساره); every seed row of 10.3
(XP, level, stars, skills, match, courses, applications, badges, rank, next-step rule) and the first-visit leaderboard
baselines of 10.3 notes (23, 22, 18, 18, 10, and 10 → 8 after the `returning` claim).

**brain-cv** (`local-analyser.test.ts`): **9.8 check 4** — the sample CV returns exactly the eight skills of 6.2 with
those stars and evidence lines and nothing else; `isSampleCv` (whitespace and first line ignored; an edited sample is not
the sample); heading detection («Work Experience», «خبرات العمل», «مهارات»); line rejoin; NFKC presentation forms; the
160-character cut; `analyseCvLocal(t).lines` equals `cleanCvLines(t).map((l) => l.text)` (the model analyser keeps the
same lines).

**brain-advisor** (`onboarding/*.test.ts`, `advisor/router.test.ts`, `advisor/rules.test.ts`): the six demo chips give
exactly the acknowledgements of 10.2 step 2 (variant rule for «خالد») and the closing line; 4.3 free-text examples
(«أنا من جدة وتخصصي تسويق وما عندي خبرة» fills three; «بكالوريوس 2024» does not fill experience; «السلام عليكم، أنا من
الرياض»); the second miss accepted as typed (city, major) or neutral; questions and greetings; **the 5.7 acceptance
test**: every user line of 5.6 (examples 1-22), with the persona facts from `buildSeed("cv-analysed")` (and
`course-done` / `mid-path` where the example says so) and no key, gives exactly that reply text, tool calls, cards and
chips; every 5.8 chip answers; the 5.4 never-a-request examples send nothing; rules 8, 9, 17 on crafted replies;
`pendingQuestion` ({} → city; city + major filled → education; all six → null) and `onboardingContext` (empty thread
→ null; after the greeting → city); rule 7 in router turns: with `page.applySheetOpen` or `page.showRunning` an apply,
start or open request emits no action and answers `blockedActionReply`; `apply_to_job`'s number is
`nextApplicationNumber`; `why-path` uses `fitReasons(target)`.

---

## 15. Build order, and what can be mocked meanwhile

1. **Now, in parallel (phase A):** data, engine, store, brain-advisor, brain-cv, shell. Each codes against the stubs.
   - engine writes formula tests with inline fixtures (`matchPercent`, `levelFor`, `weeklyRankFor` take plain inputs);
     data-backed tests pass once data lands.
   - store writes transitions against engine signatures; its tests run once engine and data land.
   - brain-advisor writes the router and templates against engine + store/seeds signatures; the acceptance test runs
     once those land. The provider code cannot be run live (no key): keep it behind `resolveProvider() === null`.
   - brain-cv is independent except data (`SAMPLE_CV_BODY`, aliases).
   - shell builds the chrome from props and the design system first, wires the store last (the stubs throw at runtime).
   - **chat-kit** (design foundation, in parallel with phase A): `src/components/chat/index.ts` with the exports of
     §3.3. Phase B does not start without it (welcome, advisor and jobs need it).
2. **Lead:** `npm run typecheck`, `npm test` until green, `@/components/chat` resolves; then phase B.
3. **Phase B, in parallel:** the eleven screen agents. Each can open its route in the dev server with `?seed=` states
   (onboarded, cv-analysed, course-done, mid-path, job-ready, returning) instead of clicking through the flow.
4. **QA** walks spec 10.2 three times.

---

## 16. The demo script against the contract (spec 10.2)

| Step | Action called | Consequence / data | Screen that plays it |
|---|---|---|---|
| 1 | `findAccount("خالد")` → null → `createAccount` → signin calls `go("/welcome")` | new user, av-01, activeDays [today] | signin → `/welcome` |
| 2 | greeting (`pendingQuestion` → city) · ×6 `onboardingTurn` (chips) → `applyOnboardingTurn` | 6th: +50 (announced false), first-steps | welcome (slots, acks) |
| 3 | `markRevealPlayed()` at step 6 | — | welcome reveal (7.8 s) |
| 4 | result leaves → `setMapHandover` → `setTarget("data-analyst-riyadh")` → `router.push("/path")` | +30, goal-set; `data-open="full"` from the first frame, hold from the first render; when it ends: toast «+80 XP · التعارف واختيار الهدف» (no rank line) + 2 badge toasts, then the nudge | welcome → map; shell overlay host |
| 5 | next-step rule 1 → `go(/cv)` | — | map → cv |
| 6 | `analyseCvText` (sample, local) → `recordCvAnalysis` | +100 → 180, level 2, match 0→70, rank 22→18, cv-scanned; news held by `cv-show` then toast with rank 18 + level-up (non-modal card) + badge | cv |
| 7 | `cv-go-path` pressed while the level-up is open (the press closes it AND navigates) → `go(/path)` | catch-up (`data-open="catch-up"`), 0→70 | map |
| 8 | `startCourse("c-powerbi-1")` from the stage sheet | started | map → learn |
| 9 | `hold("celebration")` → `completeCourse("c-powerbi-1")` → beat 1 → `markAnnounced` | +200 → 380, 2→3, 70→90, Power BI 0→1, 18→10, [first-course, top-ten], absorbed | learn celebration |
| 10 | `go(/path)` | short map-open, 90%, stage 8 current | map |
| 11 | advisor: router row 4 → `action apply` (expect DL-2026-0001 from `nextApplicationNumber`) → apply run (sheet portaled into `#app-content`, panel undimmed, «إيقاف» live in steps 1-4) → `submitApplication(by advisor)` at step 5 | +40 → 420, rank 10, first-application; DL-2026-0001; then the held reply + toasts | advisor + jobs sheet; overlay host |
| 12 | `go(/leaderboard)` | climb from `rankBeforeLatestImprovement` = 18 to 10, gap 20 | leaderboard |
| 13 | skills / profile | 9 skills, 12 stars, Power BI star fills; 6 of 12 badges | skills, profile |

---

## 17. Open questions (decided provisionally; the lead may overrule)

1. **CV line for pasted text** (3.8 field 6 lists only file / sample / none). Provisional: `cvAttachmentLine` prints
   «مرفقة: نص السيرة» for pasted text. Needs the product agent's or lead's word.
2. **Merged XP toasts other than onboarding + target** (after a reload several gains can wait together): provisional
   reason = the most recent event's reason (`xpNewsReason`).
3. **Profile badges on the first visit** (`seen.profileBadges` null): provisional = every unlocked badge turns over once,
   staggered within 480 ms.
4. **Desktop top-bar heading on detail pages**: provisional = the section heading («الوظائف», «الدورات»), because the
   detail page's own header already carries the job or course title.
5. **Claude model ids** default to `claude-haiku-5-5` for chat and CV (STACK-NOTES 6.2), overridable with
   `ANTHROPIC_MODEL`; untestable until a key exists (D5).
6. **The reply when an action is blocked by rule 7** (a sheet open or a show running): spec 5.9 has no line.
   Provisional copy in `blockedActionReply`: «أكمل ما أمامك أولاً، ثم أفتح لك {page}.» with the chip «افتح {page}».
   Needs the product agent's or the lead's word.
7. **Design-foundation files that contradict this contract** (not mine to edit; this document wins until their owners
   fix them): `src/components/motion/sheet.tsx` header and COMPONENT-PLAYBOOK block 23 / §1162 list the level-up (and the
   apply sheet) as a modal `Sheet`; `src/components/motion/index.ts` gives `AdvisorPanel` / `AdvisorLauncher` to the chat
   kit; `RevealStage` plays `REVEAL_STEPS_REDUCED` under reduced motion and `show.ts` advises shortened lists.
8. **The chat kit has no owner in the current build plan.** Phase B needs `src/components/chat/index.ts` (§3.3); the lead
   must start the chat-kit agent alongside phase A.
