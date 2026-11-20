// Owner: store. PURE account operations on the whole persisted state (spec 3.1, 3.13): accounts by normalised name, the
// signed-in account, sign-in with a name already used, restart, sign-out, reset. The zustand store (store.ts) is a thin
// wrapper around these (it adds makeClock() and resetUi()); tests run them directly. No zustand, no storage, no React.
import type { AvatarId, Clock, CreateAccountResult, LevelNumber, PersistedState, UserId, UserState } from "@/lib/types";
import { isAvatarId } from "@/lib/ids";
import { levelFor, totalXp } from "@/lib/engine";
import { normalizeName, validateName } from "@/lib/text/normalize";

import { INITIAL_SEEN } from "./snapshot";
import { newUser } from "./transitions";

/** Signed out, no account: the initial state (server render and hydration render) and seed `fresh`. */
export const EMPTY_STATE: PersistedState = { currentUserId: null, users: {} };

/** One saved-account chip on sign-in (3.1). */
export interface AccountChip {
  readonly userId: UserId;
  readonly name: string;
  readonly avatar: AvatarId;
  readonly level: LevelNumber;
}

/** The signed-in user, or null. */
export function currentUserOf(state: PersistedState): UserState | null {
  const id = state.currentUserId;
  if (id === null) return null;
  return state.users[id] ?? null;
}

/** Writes one account (by its id) into the state. */
export function withUser(state: PersistedState, user: UserState): PersistedState {
  return { ...state, users: { ...state.users, [user.id]: user } };
}

function withoutUser(users: PersistedState["users"], id: UserId): PersistedState["users"] {
  return Object.fromEntries(Object.entries(users).filter(([key]) => key !== id));
}

/** The saved account whose normalised name equals this one (4.3: «سارة» = «ساره», "Sara" = "sara"), or null. */
export function findAccountIn(state: PersistedState, name: string): UserId | null {
  const key = normalizeName(name);
  if (key === "") return null;
  return state.users[key] ? key : null;
}

/**
 * Creates and signs in a new account (3.1). Invalid name → the 3.1 error, nothing changes. A name already used in this
 * browser (after normalisation) → `exists` with that account's id, nothing changes: the form then offers «أكمل من حيث
 * توقفت» (resume) and «ابدأ من جديد» (restart). It never signs in to someone else's progress.
 */
export function createAccountIn(
  state: PersistedState,
  name: string,
  clock: Clock,
): { readonly state: PersistedState; readonly result: CreateAccountResult } {
  const check = validateName(name);
  if (!check.ok) return { state, result: { ok: false, reason: "invalid", error: check.error } };
  if (state.users[check.key]) return { state, result: { ok: false, reason: "exists", userId: check.key } };
  const user = newUser(check.name, clock);
  return {
    state: { currentUserId: user.id, users: { ...state.users, [user.id]: user } },
    result: { ok: true, userId: user.id, to: "/welcome" },
  };
}

/**
 * Signs in as a saved account and stamps `lastSignInAt` (chip order). → "/path" when onboarded (target set), else
 * "/welcome". An id that is not saved (an outdated chip) changes nothing and answers "/welcome", where the Guard, finding
 * nobody signed in, goes back to "/".
 */
export function resumeAccountIn(
  state: PersistedState,
  userId: UserId,
  clock: Clock,
): { readonly state: PersistedState; readonly to: "/path" | "/welcome" } {
  const user = state.users[userId];
  if (!user) return { state, to: "/welcome" };
  const signedIn: UserState = { ...user, lastSignInAt: clock.now };
  return {
    state: { currentUserId: userId, users: { ...state.users, [userId]: signedIn } },
    to: user.targetJobId !== null ? "/path" : "/welcome",
  };
}

/**
 * «ابدأ من جديد» (3.1): deletes the account with the same normalised name (if any), creates a new one with the typed name,
 * signs in. Invalid name → the 3.1 error, nothing changes.
 */
export function restartAccountIn(
  state: PersistedState,
  name: string,
  clock: Clock,
): { readonly state: PersistedState; readonly result: CreateAccountResult } {
  const check = validateName(name);
  if (!check.ok) return { state, result: { ok: false, reason: "invalid", error: check.error } };
  const user = newUser(check.name, clock);
  const users = withoutUser(state.users, check.key);
  return {
    state: { currentUserId: user.id, users: { ...users, [user.id]: user } },
    result: { ok: true, userId: user.id, to: "/welcome" },
  };
}

/** Sign-out keeps the account (3.13). */
export function signOutIn(state: PersistedState): PersistedState {
  return state.currentUserId === null ? state : { ...state, currentUserId: null };
}

/** «إعادة ضبط العرض» (3.13): deletes the signed-in account and signs out. Other accounts stay. */
export function resetCurrentAccountIn(state: PersistedState): PersistedState {
  const id = state.currentUserId;
  if (id === null) return state;
  return { currentUserId: null, users: withoutUser(state.users, id) };
}

/** Saved accounts for the sign-in chips (3.1), most recent sign-in first. */
export function accountChips(state: PersistedState): readonly AccountChip[] {
  return Object.values(state.users)
    .slice()
    .sort((a, b) => b.lastSignInAt - a.lastSignInAt)
    .map((user) => ({ userId: user.id, name: user.name, avatar: user.avatar, level: levelFor(totalXp(user)).level }));
}

// ── Reading what localStorage gave back ──────────────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeUser(id: string, value: unknown): value is UserState {
  if (!isRecord(value)) return false;
  return (
    value.id === id &&
    typeof value.name === "string" &&
    isAvatarId(value.avatar) &&
    typeof value.createdAt === "number" &&
    typeof value.createdDay === "string" &&
    typeof value.lastSignInAt === "number" &&
    isRecord(value.answers) &&
    isRecord(value.courses) &&
    Array.isArray(value.xpEvents) &&
    Array.isArray(value.applications) &&
    Array.isArray(value.activeDays) &&
    Array.isArray(value.badges) &&
    isRecord(value.onboarding) &&
    Array.isArray(value.onboarding.thread) &&
    isRecord(value.advisor) &&
    Array.isArray(value.advisor.messages) &&
    isRecord(value.seen)
  );
}

/**
 * The persisted value as read back from localStorage, checked (STACK-NOTES 9.2: never trust parsed JSON): an account
 * whose shape is wrong is dropped, a signed-in id that is no longer saved signs out, and missing "seen" markers take
 * their initial values. Null when the value is not a saved state at all (then the store stays signed out).
 */
export function sanitizePersisted(value: unknown): PersistedState | null {
  if (!isRecord(value) || !isRecord(value.users)) return null;
  const users: Record<UserId, UserState> = {};
  for (const [id, user] of Object.entries(value.users)) {
    if (!looksLikeUser(id, user)) continue;
    users[id] = { ...user, seen: { ...INITIAL_SEEN, ...user.seen } };
  }
  const current = value.currentUserId;
  const currentUserId = typeof current === "string" && users[current] ? current : null;
  return { currentUserId, users };
}
