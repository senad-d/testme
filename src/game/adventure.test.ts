import { describe, expect, it } from "vitest";
import {
  ADVENTURE_LOAD_CODES, ADVENTURE_RESULT_CODES, ADVENTURE_STORAGE_KEY, ANSWER_IDS, BADGE_IDS,
  CORRECT_ANSWERS, GLOSSARY_IDS, MAX_EVIDENCE_AMOUNT, MISSION_BADGES, MISSION_IDS,
  answerMission, initialAdventureState, isValidAdventureState, loadAdventureState,
  nextAdventureEventSequence, recordAdventureEvent, saveAdventureState,
  type AdventureChange, type AdventureEvent, type AdventureStateV1,
} from "./adventure";
import {
  ADVENTURE_BADGES, ADVENTURE_MESSAGES, ADVENTURE_MISSIONS, HR, MONEY_SCHOOL,
  adventureMessageForCode,
} from "../content/hr";
import { STORAGE_KEY, initialState, type StorageLike } from "./store";
import { PARENT_ACCESS_KEY } from "./parent-access";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

function event(missionId: AdventureEvent["missionId"], kind: AdventureEvent["kind"], amount: number, eventSequence: number, accepted = true): AdventureEvent {
  return { missionId, kind, amount, eventSequence, accepted } as AdventureEvent;
}

function accepted(change: AdventureChange): AdventureStateV1 {
  expect(isValidAdventureState(change.state)).toBe(true);
  return change.state;
}

function answerCurrent(state = initialAdventureState()): AdventureStateV1 {
  const mission = state.activeMission!;
  return accepted(answerMission(state, mission, CORRECT_ANSWERS[mission]));
}

function completeFirstThree(sequences = [1, 2, 3]): AdventureStateV1 {
  let state = answerCurrent();
  state = accepted(recordAdventureEvent(state, event("saving", "save", 5, sequences[0])));
  state = accepted(recordAdventureEvent(state, event("earning", "chore-approval", 5, sequences[1])));
  state = accepted(answerMission(state, "earning", CORRECT_ANSWERS.earning));
  state = answerCurrent(state);
  return accepted(recordAdventureEvent(state, event("purchase", "purchase", 10, sequences[2])));
}

function fullJourney(sequences = [1, 2, 3, 4, 5, 6]): AdventureStateV1 {
  let state = completeFirstThree(sequences);
  state = answerCurrent(state);
  state = accepted(recordAdventureEvent(state, event("loan", "borrow", 20, sequences[3])));
  state = accepted(recordAdventureEvent(state, event("loan", "repay", 5, sequences[4])));
  return accepted(recordAdventureEvent(state, event("loan", "repay", 15, sequences[5])));
}

function expectPreserved(state: AdventureStateV1, change: AdventureChange, code?: AdventureChange["code"]) {
  expect(change.state).toBe(state);
  if (code) expect(change.code).toBe(code);
}

describe("bounded Croatian money-learning adventure", () => {
  it("uses the exact ordered closed families and completes each mission only after knowledge and action", () => {
    expect(MISSION_IDS).toEqual(["saving", "earning", "purchase", "loan"]);
    expect(ANSWER_IDS).toEqual([
      "saving-later", "saving-disappears", "earning-after-approval", "earning-before-work",
      "purchase-wallet", "purchase-savings", "loan-debt-changes", "loan-free-coins",
    ]);
    expect(BADGE_IDS).toEqual(["piggy-bank", "helping-paw", "smart-shopper", "debt-expert"]);
    expect(GLOSSARY_IDS).toEqual(["wallet", "savings", "earning", "price", "loan", "debt"]);
    expect(Object.keys(CORRECT_ANSWERS)).toEqual([...MISSION_IDS]);
    expect(MISSION_BADGES).toEqual({ saving: "piggy-bank", earning: "helping-paw", purchase: "smart-shopper", loan: "debt-expert" });

    let state = initialAdventureState();
    expect(state).toEqual({ version: 1, activeMission: "saving", correctAnswers: [], evidence: {}, completedMissions: [], stars: 0, badges: [] });

    const wrong = answerMission(state, "saving", "saving-disappears");
    expect(wrong).toEqual({ state, code: "adventure-answer-wrong" });
    expect(answerMission(state, "saving", CORRECT_ANSWERS.saving).state.stars).toBe(0);
    expectPreserved(state, answerMission(state, "earning", CORRECT_ANSWERS.earning), "adventure-answer-locked");

    state = answerCurrent(state);
    expect(state.stars).toBe(0);
    state = accepted(recordAdventureEvent(state, event("saving", "save", 5, 1)));
    expect(state).toMatchObject({ activeMission: "earning", stars: 1, badges: ["piggy-bank"] });

    state = accepted(recordAdventureEvent(state, event("earning", "chore-approval", 5, 2)));
    expect(state.stars).toBe(1);
    state = accepted(answerMission(state, "earning", CORRECT_ANSWERS.earning));
    expect(state).toMatchObject({ activeMission: "purchase", stars: 2, badges: ["piggy-bank", "helping-paw"] });

    state = answerCurrent(state);
    expect(state.stars).toBe(2);
    state = accepted(recordAdventureEvent(state, event("purchase", "purchase", 10, 3)));
    expect(state).toMatchObject({ activeMission: "loan", stars: 3 });

    state = answerCurrent(state);
    expect(state.stars).toBe(3);
    state = accepted(recordAdventureEvent(state, event("loan", "borrow", 20, 4)));
    expect(state.stars).toBe(3);
    state = accepted(recordAdventureEvent(state, event("loan", "repay", 5, 5)));
    expect(state).toMatchObject({ activeMission: "loan", stars: 3, evidence: { loan: { borrowedAmount: 20, repaidAmount: 5 } } });
    const done = recordAdventureEvent(state, event("loan", "repay", 15, 6));
    expect(done.code).toBe("adventure-journey-completed");
    state = accepted(done);
    expect(state).toMatchObject({ activeMission: null, stars: 4, completedMissions: [...MISSION_IDS], badges: [...BADGE_IDS] });
    expectPreserved(state, recordAdventureEvent(state, event("loan", "repay", 20, 7)), "adventure-event-rejected");
  });

  it("preserves progress for rejected, future, mismatched, out-of-range, duplicate, replayed, and invalid-sequence events", () => {
    const unanswered = initialAdventureState();
    const rejectedEvents: AdventureEvent[] = [
      event("saving", "save", 5, 1, false),
      event("earning", "chore-approval", 5, 1),
      event("saving", "save", 4, 1),
      event("saving", "save", 0, 1),
      event("saving", "save", MAX_EVIDENCE_AMOUNT + 1, 1),
      event("saving", "save", 5, 0),
      event("saving", "save", 5, Number.MAX_SAFE_INTEGER + 1),
      event("saving", "purchase", 5, 1) as AdventureEvent,
    ];
    for (const rejected of rejectedEvents) expectPreserved(unanswered, recordAdventureEvent(unanswered, rejected), "adventure-event-rejected");

    let state = accepted(recordAdventureEvent(unanswered, event("saving", "save", 5, 10)));
    expect(state.stars).toBe(0);
    expectPreserved(state, recordAdventureEvent(state, event("saving", "save", 5, 10)), "adventure-event-duplicate");
    expectPreserved(state, recordAdventureEvent(state, event("saving", "save", 5, 11)), "adventure-event-duplicate");
    state = accepted(answerMission(state, "saving", CORRECT_ANSWERS.saving));
    state = answerCurrent(state);
    expectPreserved(state, recordAdventureEvent(state, event("earning", "chore-approval", 5, 9)), "adventure-event-rejected");
    expectPreserved(state, recordAdventureEvent(state, event("earning", "chore-approval", 5, 10)), "adventure-event-duplicate");
  });

  it("requires borrowing before repayment and rejects invalid loan accumulation without changing state", () => {
    let state = answerCurrent(completeFirstThree());
    expectPreserved(state, recordAdventureEvent(state, event("loan", "repay", 5, 4)), "adventure-event-rejected");
    state = accepted(recordAdventureEvent(state, event("loan", "borrow", MAX_EVIDENCE_AMOUNT, 4)));
    expectPreserved(state, recordAdventureEvent(state, event("loan", "borrow", 1, 5)), "adventure-event-duplicate");
    state = accepted(recordAdventureEvent(state, event("loan", "repay", MAX_EVIDENCE_AMOUNT - 1, 5)));
    expect(state).toMatchObject({ activeMission: "loan", stars: 3 });
    expectPreserved(state, recordAdventureEvent(state, event("loan", "repay", 2, 6)), "adventure-event-rejected");
    const done = recordAdventureEvent(state, event("loan", "repay", 1, 6));
    expect(done.code).toBe("adventure-journey-completed");
    expect(accepted(done).stars).toBe(4);
  });

  it("round trips only the V1 adventure record and returns controlled recovery codes without overwriting unreadable data", () => {
    const storage = new MemoryStorage();
    const gameRaw = JSON.stringify({ untouched: "game" });
    const parentRaw = JSON.stringify({ untouched: "parent" });
    storage.setItem(STORAGE_KEY, gameRaw);
    storage.setItem(PARENT_ACCESS_KEY, parentRaw);

    expect(loadAdventureState(storage)).toEqual({ state: initialAdventureState(), code: "adventure-load-empty" });
    const state = fullJourney();
    expect(saveAdventureState(storage, state)).toBeNull();
    expect(loadAdventureState(storage)).toEqual({ state, code: null });
    expect(storage.getItem(STORAGE_KEY)).toBe(gameRaw);
    expect(storage.getItem(PARENT_ACCESS_KEY)).toBe(parentRaw);

    const recoveryCases: Array<[string, string]> = [
      ["not-json", "adventure-load-malformed"],
      [JSON.stringify({ version: 2 }), "adventure-load-unknown-version"],
      [JSON.stringify({ ...initialAdventureState(), stars: 2 }), "adventure-load-invalid-state"],
    ];
    for (const [raw, code] of recoveryCases) {
      storage.setItem(ADVENTURE_STORAGE_KEY, raw);
      expect(loadAdventureState(storage)).toEqual({ state: initialAdventureState(), code });
      expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBe(raw);
      expect(storage.getItem(STORAGE_KEY)).toBe(gameRaw);
      expect(storage.getItem(PARENT_ACCESS_KEY)).toBe(parentRaw);
    }

    const unavailableRead: StorageLike = { getItem: () => { throw new Error("read"); }, setItem: () => { throw new Error("unexpected write"); } };
    expect(loadAdventureState(unavailableRead)).toEqual({ state: initialAdventureState(), code: "adventure-load-unavailable" });
    let preserved = "old-adventure";
    const unavailableWrite: StorageLike = { getItem: () => preserved, setItem: () => { throw new Error("write"); } };
    expect(saveAdventureState(unavailableWrite, initialAdventureState())).toBe("adventure-save-unavailable");
    expect(preserved).toBe("old-adventure");
  });

  it("rejects every invalid completion, answer, evidence, sequence, reward, and personal-data cross-field shape", () => {
    const initial = initialAdventureState();
    let earning = accepted(recordAdventureEvent(answerCurrent(), event("saving", "save", 5, 1)));
    const earningAnswered = answerCurrent(earning);
    const firstThree = completeFirstThree();
    const loanAnswered = answerCurrent(firstThree);
    const validLoanBorrowed = accepted(recordAdventureEvent(loanAnswered, event("loan", "borrow", 20, 4)));

    const invalidCases: unknown[] = [
      { ...initial, activeMission: "earning" },
      { ...initial, completedMissions: ["earning"], activeMission: "earning", correctAnswers: ["earning"], evidence: { earning: { rewardAmount: 5, eventSequence: 1 } }, stars: 1, badges: ["helping-paw"] },
      { ...initial, completedMissions: ["saving", "saving"], activeMission: "purchase", correctAnswers: ["saving", "saving"], stars: 2, badges: ["piggy-bank", "piggy-bank"] },
      { ...earning, correctAnswers: [] },
      { ...earning, correctAnswers: ["earning"] },
      { ...earning, correctAnswers: ["saving", "earning", "purchase"] },
      { ...initial, correctAnswers: ["saving", "earning"] },
      { ...initial, evidence: { earning: { rewardAmount: 5, eventSequence: 1 } } },
      { ...earningAnswered, evidence: { ...earningAnswered.evidence, earning: { rewardAmount: 5, eventSequence: 2 } } },
      { ...loanAnswered, evidence: { ...loanAnswered.evidence, loan: { borrowedAmount: 20, repaidAmount: 5, eventSequences: [4] } } },
      { ...loanAnswered, evidence: { ...loanAnswered.evidence, loan: { borrowedAmount: 20, repaidAmount: 0, eventSequences: [4, 5] } } },
      { ...loanAnswered, evidence: { ...loanAnswered.evidence, loan: { borrowedAmount: 20, repaidAmount: 5, eventSequences: [4, 4] } } },
      { ...loanAnswered, evidence: { ...loanAnswered.evidence, loan: { borrowedAmount: 20, repaidAmount: 5, eventSequences: [5, 4] } } },
      { ...firstThree, evidence: { ...firstThree.evidence, saving: { amount: 5, eventSequence: 2 }, earning: { rewardAmount: 5, eventSequence: 1 } } },
      { ...initial, evidence: { saving: { amount: 4, eventSequence: 1 } } },
      { ...initial, evidence: { saving: { amount: MAX_EVIDENCE_AMOUNT + 1, eventSequence: 1 } } },
      { ...initial, evidence: { saving: { amount: 5, eventSequence: Number.MAX_SAFE_INTEGER + 1 } } },
      { ...validLoanBorrowed, evidence: { ...validLoanBorrowed.evidence, loan: { borrowedAmount: 20, repaidAmount: -1, eventSequences: [4] } } },
      { ...initial, stars: 1 },
      { ...earning, badges: [] },
      { ...initial, pin: "123456" },
      { ...initial, playerName: "Dijete" },
      { ...initial, wallet: 100 },
      { ...initial, evidence: { saving: { amount: 5, eventSequence: 1, credential: "secret" } } },
    ];
    for (const value of invalidCases) expect(isValidAdventureState(value), JSON.stringify(value)).toBe(false);
    expect(isValidAdventureState(initial)).toBe(true);
    expect(isValidAdventureState(earning)).toBe(true);
    expect(isValidAdventureState(validLoanBorrowed)).toBe(true);
  });

  it("requires exact completed evidence and rejects an active mission that is already fully ready", () => {
    const complete = fullJourney();
    expect(isValidAdventureState({ ...complete, correctAnswers: complete.correctAnswers.slice(0, -1) })).toBe(false);
    expect(isValidAdventureState({ ...complete, evidence: { ...complete.evidence, purchase: undefined } })).toBe(false);

    const firstThree = completeFirstThree();
    const activeReady = {
      ...firstThree,
      correctAnswers: [...firstThree.correctAnswers, "loan"],
      evidence: { ...firstThree.evidence, loan: { borrowedAmount: 5, repaidAmount: 5, eventSequences: [4, 5] } },
    };
    expect(isValidAdventureState(activeReady)).toBe(false);
  });

  it("owns monotonic evidence sequencing across persisted scalar and loan-array evidence", () => {
    expect(nextAdventureEventSequence(initialAdventureState())).toBe(1);
    const storage = new MemoryStorage();
    const complete = fullJourney([5, 8, 13, 21, 34, 55]);
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), activities: Array.from({ length: 200 }, () => ({ code: "coins-granted", amount: 1 })) }));
    expect(saveAdventureState(storage, complete)).toBeNull();
    const reloaded = loadAdventureState(storage);
    expect(reloaded.code).toBeNull();
    expect(nextAdventureEventSequence(reloaded.state)).toBe(56);

    storage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), activities: [] }));
    expect(nextAdventureEventSequence(reloaded.state)).toBe(56);
    storage.setItem(STORAGE_KEY, "malformed-resettable-game-history");
    expect(nextAdventureEventSequence(reloaded.state)).toBe(56);

    let exhausted = accepted(recordAdventureEvent(initialAdventureState(), event("saving", "save", 5, Number.MAX_SAFE_INTEGER)));
    exhausted = accepted(answerMission(exhausted, "saving", CORRECT_ANSWERS.saving));
    expect(nextAdventureEventSequence(exhausted)).toBeNull();
    expectPreserved(exhausted, recordAdventureEvent(exhausted, event("earning", "chore-approval", 5, Number.MAX_SAFE_INTEGER)), "adventure-event-duplicate");
    expectPreserved(exhausted, recordAdventureEvent(exhausted, event("earning", "chore-approval", 5, Number.MAX_SAFE_INTEGER + 1)), "adventure-event-rejected");
  });

  it("keeps AppStateV1, wallet economy, house, ownership, parent access, and existing records outside every transition", () => {
    const game = initialState();
    game.wallet = 99;
    game.savings = 12;
    game.debt = 7;
    game.itemQuantities = { bowl: 1 };
    const beforeGame = structuredClone(game);
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(PARENT_ACCESS_KEY, JSON.stringify({ version: 1, credential: "untouched" }));
    const gameRaw = storage.getItem(STORAGE_KEY);
    const parentRaw = storage.getItem(PARENT_ACCESS_KEY);

    let adventure = initialAdventureState();
    answerMission(adventure, "saving", "saving-disappears");
    adventure = answerCurrent(adventure);
    adventure = accepted(recordAdventureEvent(adventure, event("saving", "save", 5, 1)));
    adventure = completeFirstThree();
    adventure = fullJourney();

    expect(game).toEqual(beforeGame);
    expect(storage.getItem(STORAGE_KEY)).toBe(gameRaw);
    expect(storage.getItem(PARENT_ACCESS_KEY)).toBe(parentRaw);
    expect(adventure).not.toHaveProperty("wallet");
    expect(adventure).not.toHaveProperty("savings");
    expect(adventure).not.toHaveProperty("debt");
    expect(adventure).not.toHaveProperty("ownedPets");
    expect(adventure).not.toHaveProperty("itemQuantities");
    expect(adventure).not.toHaveProperty("petPlacements");
    expect(adventure).not.toHaveProperty("parentAccess");
  });

  it("has exhaustive non-empty Croatian mission, answer, badge, glossary, status, and recovery copy", () => {
    expect(Object.keys(ADVENTURE_MISSIONS).sort()).toEqual([...MISSION_IDS].sort());
    expect(Object.keys(ADVENTURE_BADGES).sort()).toEqual([...BADGE_IDS].sort());
    expect(Object.keys(MONEY_SCHOOL).sort()).toEqual([...GLOSSARY_IDS].sort());
    expect(Object.keys(ADVENTURE_MESSAGES).sort()).toEqual([...ADVENTURE_LOAD_CODES, ...ADVENTURE_RESULT_CODES].sort());
    const mappedAnswers = Object.values(ADVENTURE_MISSIONS).flatMap(({ choices }) => choices.map(({ id }) => id));
    expect(mappedAnswers.sort()).toEqual([...ANSWER_IDS].sort());

    for (const mission of Object.values(ADVENTURE_MISSIONS)) {
      const copy = [mission.title, mission.story, mission.instruction, mission.question, mission.correctExplanation, mission.wrongExplanation, ...mission.actionSteps, ...mission.choices.map(({ label }) => label)];
      for (const value of copy) expect(value.trim()).not.toBe("");
    }
    for (const value of Object.values(ADVENTURE_MESSAGES)) expect(value.trim()).not.toBe("");
    for (const value of Object.values(ADVENTURE_BADGES)) {
      expect(value.name.trim()).not.toBe("");
      expect(value.description.trim()).not.toBe("");
      expect(value.emoji.trim()).not.toBe("");
    }
    for (const value of Object.values(MONEY_SCHOOL)) {
      expect(value.title.trim()).not.toBe("");
      expect(value.definition.trim()).not.toBe("");
      expect(value.example.trim()).not.toBe("");
      expect(`${value.definition} ${value.example}`.toLocaleLowerCase("hr")).toContain("zlatnik");
    }
    expect(adventureMessageForCode("unexpected-english-code")).toBe(HR.genericError);
    expect(adventureMessageForCode(undefined)).toBe(HR.genericError);
  });
});
