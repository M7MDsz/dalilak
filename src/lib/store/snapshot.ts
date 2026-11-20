// Owner: store (written in full by the architect: it IS the snapshot contract of spec 5.2). Pure.
// The facts of a user (UserFacts = UserSnapshot): what the engine needs and what «دليل» may know. The CV document,
// both threads and the "seen" markers stay in the browser.
import type { SeenMarkers, UserFacts, UserState } from "@/lib/types";

export function factsOf(user: UserState): UserFacts {
  const {
    id,
    name,
    avatar,
    createdAt,
    createdDay,
    answers,
    onboardingCompletedAt,
    targetJobId,
    cv,
    cvSkipped,
    courses,
    xpEvents,
    applications,
    activeDays,
    badges,
  } = user;
  return {
    id,
    name,
    avatar,
    createdAt,
    createdDay,
    answers,
    onboardingCompletedAt,
    targetJobId,
    cv,
    cvSkipped,
    courses,
    xpEvents,
    applications,
    activeDays,
    badges,
  };
}

/** The "seen" markers of a new account (spec 3.4, 3.5, 3.12, 3.13, 2.6): nothing shown yet. */
export const INITIAL_SEEN: SeenMarkers = {
  mapOpenPlayed: false,
  catchUpForCv: null,
  pathMatch: null,
  skillStars: null,
  leaderboardRank: null,
  profileBadges: null,
  jobsMatch: null,
  applicationStatus: {},
  nudge: false,
};

/**
 * A full UserState around a snapshot, with every non-fact field as on a new account (empty threads, INITIAL_SEEN, no CV
 * document). For SIMULATIONS on the server and in tests only: the advisor's `recommend_next_step` runs the pure
 * transitions on `stateFromFacts(facts)` to learn which badges a step would unlock. Never written to the store.
 */
export function stateFromFacts(facts: UserFacts): UserState {
  return {
    ...facts,
    lastSignInAt: facts.createdAt,
    onboarding: { thread: [], misses: {}, revealPlayed: facts.onboardingCompletedAt !== null },
    cvDocument: null,
    advisor: { messages: [], jobsDisclosed: false, applyInFlight: null },
    seen: INITIAL_SEEN,
  };
}
