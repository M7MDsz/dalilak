// Owner: store. Accounts by normalised name (spec 3.1): signing in twice with the same name, resume, restart, sign-out,
// reset, the saved-account chips, and reading back what localStorage holds.
import { describe, expect, it } from "vitest";

import type { Clock, PersistedState } from "@/lib/types";
import { makeClock } from "@/lib/engine";

import {
  EMPTY_STATE,
  accountChips,
  createAccountIn,
  currentUserOf,
  findAccountIn,
  resetCurrentAccountIn,
  restartAccountIn,
  resumeAccountIn,
  sanitizePersisted,
  signOutIn,
  withUser,
} from "./accounts";
import { buildSeed, demoAnswers } from "./seeds";
import { completeOnboarding, setTarget } from "./transitions";

function at(minute: number): Clock {
  return makeClock(new Date(2026, 10, 18, 21, minute));
}

function created(state: PersistedState, name: string, clock: Clock): PersistedState {
  const out = createAccountIn(state, name, clock);
  if (!out.result.ok) throw new Error(`could not create ${name}`);
  return out.state;
}

describe("createAccount (3.1)", () => {
  it("creates and signs in a new account, then /welcome", () => {
    const out = createAccountIn(EMPTY_STATE, "خالد", at(0));
    expect(out.result).toEqual({ ok: true, userId: "خالد", to: "/welcome" });
    expect(out.state.currentUserId).toBe("خالد");
    expect(currentUserOf(out.state)?.name).toBe("خالد");
  });

  it("refuses a name already used in this browser and signs nobody in (signing in twice with the same name)", () => {
    const first = signOutIn(created(EMPTY_STATE, "خالد", at(0)));
    for (const name of ["خالد", "  خالد ", "خالد"]) {
      const again = createAccountIn(first, name, at(1));
      expect(again.result).toEqual({ ok: false, reason: "exists", userId: "خالد" });
      expect(again.state).toBe(first);
    }
    expect(findAccountIn(first, "خالد")).toBe("خالد");
  });

  it("compares names after normalisation: «سارة» = «ساره», «أحمد» = «احمد», Sara = sara", () => {
    let state = created(EMPTY_STATE, "سارة", at(0));
    state = created(state, "أحمد", at(1));
    state = created(state, "Sara Ali", at(2));
    expect(createAccountIn(state, "ساره", at(3)).result).toMatchObject({ ok: false, reason: "exists" });
    expect(createAccountIn(state, "احمد", at(3)).result).toMatchObject({ ok: false, reason: "exists" });
    expect(createAccountIn(state, "sara  ali", at(3)).result).toMatchObject({ ok: false, reason: "exists" });
    expect(findAccountIn(state, "ساره")).toBe(findAccountIn(state, "سارة"));
    expect(findAccountIn(state, "نورة")).toBeNull();
    expect(findAccountIn(state, "   ")).toBeNull();
  });

  it("returns the 3.1 error for an invalid name and changes nothing", () => {
    const out = createAccountIn(EMPTY_STATE, "خ", at(0));
    expect(out.result).toEqual({ ok: false, reason: "invalid", error: "short" });
    expect(out.state).toBe(EMPTY_STATE);
    expect(createAccountIn(EMPTY_STATE, "خالد".repeat(6), at(0)).result).toMatchObject({ reason: "invalid", error: "long" });
    expect(createAccountIn(EMPTY_STATE, "خالد!", at(0)).result).toMatchObject({ reason: "invalid", error: "letters" });
  });
});

describe("resume, restart, sign-out, reset (3.1, 3.13)", () => {
  it("resumes to /welcome before a target, to /path after, and stamps lastSignInAt", () => {
    let state = signOutIn(created(EMPTY_STATE, "خالد", at(0)));
    const early = resumeAccountIn(state, "خالد", at(1));
    expect(early.to).toBe("/welcome");
    expect(early.state.currentUserId).toBe("خالد");
    expect(currentUserOf(early.state)?.lastSignInAt).toBe(at(1).now);

    const user = currentUserOf(early.state);
    if (!user) throw new Error("no user");
    const onboarded = setTarget(completeOnboarding(user, demoAnswers(), at(2)).user, "data-analyst-riyadh", at(3)).user;
    state = signOutIn(withUser(early.state, onboarded));
    expect(state.users["خالد"]?.targetJobId).toBe("data-analyst-riyadh");
    expect(resumeAccountIn(state, "خالد", at(4)).to).toBe("/path");
  });

  it("an unknown id changes nothing", () => {
    const out = resumeAccountIn(EMPTY_STATE, "nobody", at(0));
    expect(out).toEqual({ state: EMPTY_STATE, to: "/welcome" });
  });

  it("restart deletes the saved progress and starts again with the typed name", () => {
    const seeded = signOutIn(buildSeed("onboarded", at(0)));
    expect(seeded.users["خالد"]?.xpEvents.length).toBeGreaterThan(0);
    const out = restartAccountIn(seeded, "  خالد  ", at(1));
    expect(out.result).toEqual({ ok: true, userId: "خالد", to: "/welcome" });
    const fresh = currentUserOf(out.state);
    expect(fresh?.xpEvents).toEqual([]);
    expect(fresh?.targetJobId).toBeNull();
    expect(fresh?.createdAt).toBe(at(1).now);
    expect(Object.keys(out.state.users)).toEqual(["خالد"]);
  });

  it("restart with a different spelling keeps one account, named as typed", () => {
    const state = signOutIn(created(EMPTY_STATE, "سارة", at(0)));
    const out = restartAccountIn(state, "ساره", at(1));
    expect(Object.keys(out.state.users)).toHaveLength(1);
    expect(currentUserOf(out.state)?.name).toBe("ساره");
  });

  it("restart refuses an invalid name", () => {
    const state = created(EMPTY_STATE, "خالد", at(0));
    const out = restartAccountIn(state, "1", at(1));
    expect(out.result).toMatchObject({ ok: false, reason: "invalid" });
    expect(out.state).toBe(state);
  });

  it("sign-out keeps the account; reset deletes only the signed-in one", () => {
    let state = created(EMPTY_STATE, "نورة", at(0));
    state = created(state, "خالد", at(1));
    const out = signOutIn(state);
    expect(out.currentUserId).toBeNull();
    expect(Object.keys(out.users).sort()).toEqual(["خالد", "نوره"].sort());
    const reset = resetCurrentAccountIn(state);
    expect(reset.currentUserId).toBeNull();
    expect(Object.keys(reset.users)).toEqual(["نوره"]);
    expect(resetCurrentAccountIn(reset)).toBe(reset);
  });

  it("lists the saved accounts most recent sign-in first, with their level", () => {
    let state = created(EMPTY_STATE, "نورة", at(0));
    state = created(state, "خالد", at(1));
    state = { ...state, users: { ...state.users, ...buildSeed("onboarded", at(2)).users } };
    state = resumeAccountIn(state, "نوره", at(5)).state;
    expect(accountChips(state)).toEqual([
      { userId: "نوره", name: "نورة", avatar: state.users["نوره"]?.avatar, level: 1 },
      { userId: "خالد", name: "خالد", avatar: "av-01", level: 1 },
    ]);
  });
});

describe("reading back localStorage", () => {
  it("accepts a saved state and signs out a missing current user", () => {
    const saved = buildSeed("onboarded", at(0));
    expect(sanitizePersisted(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(sanitizePersisted({ currentUserId: "nobody", users: saved.users })?.currentUserId).toBeNull();
  });

  it("drops what is not a saved state, and accounts of the wrong shape", () => {
    expect(sanitizePersisted(null)).toBeNull();
    expect(sanitizePersisted("x")).toBeNull();
    expect(sanitizePersisted({ users: [] })).toBeNull();
    const saved = buildSeed("onboarded", at(0));
    const broken = { currentUserId: "خالد", users: { ...saved.users, bad: { id: "bad" } } };
    expect(sanitizePersisted(broken)).toEqual(saved);
  });

  it("fills missing seen markers with their initial values", () => {
    const saved = buildSeed("onboarded", at(0));
    const user = saved.users["خالد"];
    if (!user) throw new Error("no user");
    const { nudge: _nudge, ...partialSeen } = user.seen;
    void _nudge;
    const out = sanitizePersisted({ currentUserId: "خالد", users: { خالد: { ...user, seen: partialSeen } } });
    expect(out?.users["خالد"]?.seen.nudge).toBe(false);
  });
});
