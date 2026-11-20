// Owner: store. The shape and the action signatures are the architect's contract; the bodies are the store agent's.
// ONE persisted zustand store under ONE localStorage key (A1). Import only from client components and client code.
//
// Implementation contract (STACK-NOTES 3): create<AppStore>()(persist(…, { name: STORAGE_KEY, version: 1,
// storage: createJSONStorage(() => localStorage), partialize: ({ currentUserId, users }) => ({ currentUserId, users }) }))
// WITHOUT skipHydration: localStorage hydrates synchronously when the module loads in the browser, and
// getInitialState() stays the empty state, so the server render and the hydration render both see "signed out".
// `useHydrated()` (hooks.ts) is the flag every decision waits for. Each action: read the current user, call the pure
// transition with makeClock(), write the new user, return the result. Actions never throw for user errors.
// Every account action (createAccount, resumeAccount, restartAccount, signOut, resetCurrentAccount) and applySeed also
// call `useUi.getState().resetUi()`. Account actions never navigate: the screen that called them does (the Guard
// decides once per mount, so it does not react to them).
// Game rules live in the pure transitions (transitions.ts) and the engine; account rules in accounts.ts. This file only
// adds the Clock (makeClock), the write, and the UI reset.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  AdvisorMessage,
  AvatarId,
  BadgeId,
  Clock,
  CompanyId,
  CompleteCourseResult,
  Consequence,
  CourseId,
  CreateAccountResult,
  CvAnalysis,
  JobId,
  PersistedState,
  RecordCvResult,
  SeedName,
  SeenMarkers,
  StartCourseResult,
  SubmitApplicationResult,
  TouchDayResult,
  UserId,
  UserState,
} from "@/lib/types";
import type { OnboardingTurn } from "@/lib/brain/protocol";
import { applyInterruptedLine } from "@/lib/brain/advisor/templates";
import { applicationStatus, makeClock } from "@/lib/engine";

import {
  EMPTY_STATE,
  createAccountIn,
  findAccountIn,
  resetCurrentAccountIn,
  restartAccountIn,
  resumeAccountIn,
  sanitizePersisted,
  signOutIn,
} from "./accounts";
import { readSeedParam, withoutSeedParam } from "./seed-url";
import { buildSeed } from "./seeds";
import * as T from "./transitions";
import type { Transition } from "./transitions";
import { useUi } from "./ui";

/** The one localStorage key (internal identifiers keep "masari": TEAM-BRIEF section 0). */
export const STORAGE_KEY = "masari:state";
export const STORAGE_VERSION = 1;

export interface AppActions {
  // ── Accounts (spec 3.1, 3.13) ──────────────────────────────────────────────────────────────────────────────────
  /** The saved account whose normalised name equals this one (4.3), or null. */
  findAccount(name: string): UserId | null;
  /** Validates the name (3.1 errors) and creates a new account; refuses when the normalised name already exists. Signs in. */
  createAccount(name: string): CreateAccountResult;
  /** Signs in as a saved account. → "/path" when onboarded (target set), else "/welcome". */
  resumeAccount(userId: UserId): { readonly to: "/path" | "/welcome" };
  /** «ابدأ من جديد»: deletes the account with the same normalised name, creates a new one with the typed name, signs in. */
  restartAccount(name: string): CreateAccountResult;
  /** Sign-out keeps the account (3.13). The profile then calls go("/"); the app Guard renders nothing once no user is signed in. */
  signOut(): void;
  /** «إعادة ضبط العرض»: deletes the current account and signs out (3.13). The profile then calls go("/"). */
  resetCurrentAccount(): void;
  setAvatar(avatar: AvatarId): void;
  /** «الشركة اللي في بالك» on «ملفي» (20 Nov 2026): change it, or "none" to clear it. Pays nothing; the target stays. */
  setDreamCompany(company: CompanyId | "none"): void;

  // ── Onboarding (spec 3.2, 3.3, 4) ──────────────────────────────────────────────────────────────────────────────
  /**
   * Appends «دليلك»'s lines to the onboarding thread (greeting when empty; the re-ask on resume). The pending question is
   * derived (brain/onboarding `pendingQuestion`), so nothing else is written.
   */
  appendOnboardingMessages(texts: readonly string[]): void;
  /** The greeting of a fresh account with the CV offer (docs/ONBOARDING-FLOW.md): sets `onboarding.cv` "offered". */
  openOnboardingWithCv(texts: readonly string[]): void;
  /**
   * The CV read inside onboarding: records the analysis (+100 the first time), the bubble and the CV card, and the
   * answers the CV states (waiting for the user's yes). `{ ok: false }` when it found no skill (nothing saved).
   */
  recordOnboardingCv(input: Parameters<typeof T.recordOnboardingCv>[1]): RecordCvResult;
  /** Applies an interpreted turn; when it completes onboarding, pays +50 and unlocks first-steps (news held until /path). */
  applyOnboardingTurn(turn: OnboardingTurn): Consequence | null;
  /** Saved when reveal step 6 starts. */
  markRevealPlayed(): void;

  // ── Target (spec 3.3, 3.8) ─────────────────────────────────────────────────────────────────────────────────────
  /** First target: +30 and goal-set; later changes pay nothing (the caller shows «هدفك الآن: {title}»). */
  setTarget(jobId: JobId): Consequence | null;

  // ── CV (spec 3.6, 6) ───────────────────────────────────────────────────────────────────────────────────────────
  /** Saves an analysis with ≥ 1 skill BEFORE the show starts; first such analysis pays +100 (cv-scanned). */
  recordCvAnalysis(input: { readonly analysis: CvAnalysis; readonly fileName: string | null }): RecordCvResult;
  /** «ابدأ بدون سيرة». */
  skipCv(): void;

  // ── Courses (spec 3.10, 3.11) ──────────────────────────────────────────────────────────────────────────────────
  startCourse(courseId: CourseId): StartCourseResult;
  tickLesson(courseId: CourseId, lesson: number, ticked: boolean): void;
  /** The certificate link pasted on «خلّصتها» (optional; an empty string removes it). Pays nothing. */
  setCertificate(courseId: CourseId, url: string): void;
  /**
   * One write before the celebration's first beat. Its XP event and badges are written announced: false like every other
   * gain; the learn page holds `celebration` (useUi.getState().hold, synchronously, BEFORE calling this) and calls
   * markAnnounced({ xp: [the event id], badges }) when beat 1 shows, so the celebration absorbs its own news (3.11, 3.15)
   * and a reload before beat 1 loses nothing.
   */
  completeCourse(courseId: CourseId): CompleteCourseResult;

  // ── Applications (spec 3.8, 3.9, 7.4, 7.5) ─────────────────────────────────────────────────────────────────────
  /** Called by the apply sheet: on «أرسل الطلب» (by user) or at the START of step 5 (by advisor). */
  submitApplication(input: { readonly jobId: JobId; readonly note: string; readonly by: "user" | "advisor" }): SubmitApplicationResult;
  /** «انقل للخطوة التالية». */
  advanceApplication(jobId: JobId): void;
  /** The persisted in-flight marker of «دليلك» applying (set by the dispatcher at start, cleared at sent / stopped). */
  setApplyInFlight(jobId: JobId | null): void;
  /**
   * Called once after hydration by the advisor root: turns a leftover marker into «لم يكتمل التقديم…» in the thread. This
   * wrapper passes `applyInterruptedLine()` (brain/advisor/templates) to the pure transition, so transitions.ts imports
   * nothing from src/lib/brain.
   */
  resolveInterruptedApply(): boolean;

  // ── Days (spec 8.4) ────────────────────────────────────────────────────────────────────────────────────────────
  /** Called by the shell on every app-shell mount (idempotent per day). */
  touchDay(): TouchDayResult | null;
  /** «استلم +60 XP». Null when nothing was due. */
  claimDailyReward(): Consequence | null;

  // ── Overlay queue and replays ──────────────────────────────────────────────────────────────────────────────────
  markAnnounced(ids: { readonly xp?: readonly string[]; readonly badges?: readonly BadgeId[] }): void;
  markSeen<K extends keyof SeenMarkers>(key: K, value: SeenMarkers[K]): void;

  // ── Advisor thread (spec 3.14) ─────────────────────────────────────────────────────────────────────────────────
  appendAdvisorMessages(messages: readonly AdvisorMessage[]): void;
  clearAdvisorThread(): void;

  // ── Seeds (spec 10.3, A6) ──────────────────────────────────────────────────────────────────────────────────────
  /** Replaces EVERYTHING saved with the seed's state (buildSeed). Called by the shell's Guard before any redirect. */
  applySeed(name: SeedName): void;
}

export type AppStore = PersistedState & AppActions;

/** What one action computed on the signed-in user: the user to write (the same reference = nothing to write) and its result. */
interface UserStep<R> {
  readonly user: UserState;
  readonly result: R;
}

/**
 * The store hook: `useAppStore(selector)` in components (stable selections only, e.g. `selectCurrentUser`),
 * `useAppStore.getState()` in handlers, the dispatcher and the Guard. Persisted under STORAGE_KEY (version 1); only
 * `{ currentUserId, users }` is written. No skipHydration: in the browser it hydrates synchronously when this module
 * loads; `useHydrated()` (hooks.ts) says when. `useAppStore.persist` is undefined on the server.
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      /**
       * Runs `step` on the signed-in user with a fresh Clock (makeClock: actions run in handlers and effects), writes
       * the user it returns when it changed, and gives back its result. Null when nobody is signed in.
       */
      function onUser<R>(step: (user: UserState, clock: Clock) => UserStep<R>): { readonly result: R } | null {
        const state = get();
        const user = selectCurrentUser(state);
        if (user === null) return null;
        const out = step(user, makeClock());
        if (out.user !== user) set({ users: { ...state.users, [user.id]: out.user } });
        return { result: out.result };
      }

      /** Writes a user-only change (no result). */
      function write(change: (user: UserState, clock: Clock) => UserState): void {
        onUser((user, clock) => ({ user: change(user, clock), result: undefined }));
      }

      /** Account actions and seeds replace the persisted part, then clear the UI store (nothing of the previous user leaks). */
      function replace(next: PersistedState): void {
        set({ currentUserId: next.currentUserId, users: next.users });
        useUi.getState().resetUi();
      }

      function transition(run: (user: UserState, clock: Clock) => Transition | null): Consequence | null {
        const out = onUser((user, clock) => {
          const done = run(user, clock);
          return done === null ? { user, result: null } : { user: done.user, result: done.consequence };
        });
        return out === null ? null : out.result;
      }

      return {
        ...EMPTY_STATE,

        // ── Accounts ──────────────────────────────────────────────────────────────────────────────────────────────
        findAccount: (name) => findAccountIn(get(), name),
        createAccount: (name) => {
          const out = createAccountIn(get(), name, makeClock());
          if (out.result.ok) replace(out.state);
          return out.result;
        },
        resumeAccount: (userId) => {
          const out = resumeAccountIn(get(), userId, makeClock());
          replace(out.state);
          return { to: out.to };
        },
        restartAccount: (name) => {
          const out = restartAccountIn(get(), name, makeClock());
          if (out.result.ok) replace(out.state);
          return out.result;
        },
        signOut: () => replace(signOutIn(get())),
        resetCurrentAccount: () => replace(resetCurrentAccountIn(get())),
        setAvatar: (avatar) => write((user) => T.setAvatar(user, avatar)),
        setDreamCompany: (company) =>
          write((user) => (user.answers.company === company ? user : { ...user, answers: { ...user.answers, company } })),

        // ── Onboarding ────────────────────────────────────────────────────────────────────────────────────────────
        appendOnboardingMessages: (texts) => write((user, clock) => T.appendOnboardingMessages(user, texts, clock)),
        openOnboardingWithCv: (texts) => write((user, clock) => T.openOnboardingWithCv(user, texts, clock)),
        recordOnboardingCv: (input) => {
          const out = onUser((user, clock) => {
            const done = T.recordOnboardingCv(user, input, clock);
            return done === null ? { user, result: null } : { user: done.user, result: done.consequence };
          });
          if (out === null) return { ok: false, reason: "no_user" };
          if (out.result === null) return { ok: false, reason: "empty" };
          return { ok: true, consequence: out.result };
        },
        applyOnboardingTurn: (turn) => transition((user, clock) => T.applyOnboardingTurn(user, turn, clock)),
        markRevealPlayed: () => write((user) => T.markRevealPlayed(user)),

        // ── Target ────────────────────────────────────────────────────────────────────────────────────────────────
        setTarget: (jobId) => transition((user, clock) => T.setTarget(user, jobId, clock)),

        // ── CV ────────────────────────────────────────────────────────────────────────────────────────────────────
        recordCvAnalysis: (input) => {
          const out = onUser((user, clock) => {
            const done = T.recordCvAnalysis(user, input, clock);
            return done === null ? { user, result: null } : { user: done.user, result: done.consequence };
          });
          if (out === null) return { ok: false, reason: "no_user" };
          if (out.result === null) return { ok: false, reason: "empty" };
          return { ok: true, consequence: out.result };
        },
        skipCv: () => {
          transition((user, clock) => T.skipCv(user, clock));
        },

        // ── Courses ───────────────────────────────────────────────────────────────────────────────────────────────
        startCourse: (courseId) => {
          const out = onUser((user, clock): UserStep<StartCourseResult> => {
            const started = T.startCourse(user, courseId, clock);
            if (!started.ok) return { user, result: started };
            return {
              user: started.transition.user,
              result: { ok: true, already: started.already, consequence: started.transition.consequence },
            };
          });
          return out === null ? { ok: false, reason: "no_user" } : out.result;
        },
        tickLesson: (courseId, lesson, ticked) => write((user) => T.tickLesson(user, courseId, lesson, ticked)),
        setCertificate: (courseId, url) => write((user) => T.setCertificate(user, courseId, url)),
        completeCourse: (courseId) => {
          const out = onUser((user, clock): UserStep<CompleteCourseResult> => {
            const done = T.completeCourse(user, courseId, clock);
            if (!done.ok) return { user, result: done };
            return {
              user: done.transition.user,
              result: { ok: true, courseId, onPath: done.onPath, consequence: done.transition.consequence },
            };
          });
          return out === null ? { ok: false, reason: "no_user" } : out.result;
        },

        // ── Applications ──────────────────────────────────────────────────────────────────────────────────────────
        submitApplication: (input) => {
          const out = onUser((user, clock): UserStep<SubmitApplicationResult> => {
            const sent = T.submitApplication(user, input, clock);
            if (sent.ok) {
              return {
                user: sent.transition.user,
                result: { ok: true, application: sent.application, consequence: sent.transition.consequence },
              };
            }
            const existing = user.applications.find((app) => app.jobId === input.jobId);
            const status = existing ? applicationStatus(existing, clock.now) : "sent";
            return { user, result: { ok: false, reason: "already_applied", status } };
          });
          return out === null ? { ok: false, reason: "no_user" } : out.result;
        },
        advanceApplication: (jobId) => write((user, clock) => T.advanceApplication(user, jobId, clock)),
        setApplyInFlight: (jobId) => write((user, clock) => T.setApplyInFlight(user, jobId, clock)),
        resolveInterruptedApply: () => {
          const out = onUser((user, clock) => {
            // The template is read only when there is a marker to resolve (most loads have none).
            if (user.advisor.applyInFlight === null) return { user, result: false };
            const resolved = T.resolveInterruptedApply(user, clock, applyInterruptedLine());
            return { user: resolved.user, result: resolved.interrupted };
          });
          return out === null ? false : out.result;
        },

        // ── Days ──────────────────────────────────────────────────────────────────────────────────────────────────
        touchDay: () => {
          const out = onUser((user, clock): UserStep<TouchDayResult> => {
            const touched = T.touchDay(user, clock);
            return {
              user: touched.transition.user,
              result: { firstLoadToday: touched.firstLoadToday, daily: touched.daily, consequence: touched.transition.consequence },
            };
          });
          return out === null ? null : out.result;
        },
        claimDailyReward: () => transition((user, clock) => T.claimDailyReward(user, clock)),

        // ── Overlay queue and replays ─────────────────────────────────────────────────────────────────────────────
        markAnnounced: (ids) => write((user) => T.markAnnounced(user, ids)),
        markSeen: (key, value) => write((user) => T.markSeen(user, key, value)),

        // ── Advisor thread ────────────────────────────────────────────────────────────────────────────────────────
        appendAdvisorMessages: (messages) => write((user) => T.appendAdvisorMessages(user, messages)),
        clearAdvisorThread: () => write((user) => T.clearAdvisorThread(user)),

        // ── Seeds ─────────────────────────────────────────────────────────────────────────────────────────────────
        applySeed: (name) => replace(buildSeed(name, makeClock())),
      };
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ currentUserId, users }): PersistedState => ({ currentUserId, users }),
      // A saved value of another version is dropped by persist itself (no migrate in a demo). A value of this version is
      // checked before use: never trust parsed JSON (STACK-NOTES 9.2).
      merge: (persisted, current) => {
        const saved = sanitizePersisted(persisted);
        return saved === null ? current : { ...current, currentUserId: saved.currentUserId, users: saved.users };
      },
    },
  ),
);

/**
 * Spec 2.2 / 10.3, for the shell's Guard (in an effect, after hydration, before any redirect): reads `?seed=` from the
 * current URL. No parameter → null (nothing done). Otherwise applies the seed when the name is known (EVERYTHING saved is
 * replaced: every account, thread and flag) and returns the same URL without the parameter, for `router.replace`; an
 * unknown name changes nothing and is only removed. Browser only (reads window.location).
 */
export function applySeedFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  const { present, seed } = readSeedParam(search);
  if (!present) return null;
  if (seed !== null) useAppStore.getState().applySeed(seed);
  return withoutSeedParam(pathname, search, hash);
}

/** The signed-in user's state, or null. Use inside selectors: `useAppStore(selectCurrentUser)` (stable reference). */
export function selectCurrentUser(state: PersistedState): UserState | null {
  const id = state.currentUserId;
  if (id === null) return null;
  return state.users[id] ?? null;
}

/**
 * The company the signed-in user has in mind (onboarding step 7, «ملفي»), as its id: a stable primitive, so it is safe in
 * `useAppStore(selectDreamCompanyId)`. Null for «لا، مو الحين», an account saved before the question, or nobody signed in.
 * For the company itself, its jobs (pin them first) and the one the path aimed at: engine `dreamCompany(user)`.
 */
export function selectDreamCompanyId(state: PersistedState): CompanyId | null {
  const company = selectCurrentUser(state)?.answers.company;
  return company === undefined || company === "none" ? null : company;
}
