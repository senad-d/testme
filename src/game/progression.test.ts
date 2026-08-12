import { describe, expect, it } from "vitest";
import type { StorageLike } from "./store";
import { CARE_COOLDOWN_MS, COSMETIC_TITLES, MAX_XP, PROGRESSION_KEY, isValidProgression, loadProgression, performCare, progressionLevel } from "./progression";
import { DAILY_QUESTS, type CareActionId } from "./quests";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  mode: "ok" | "before" | "after" = "ok";
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.mode === "before") throw new Error("before");
    this.data.set(key, value);
    if (this.mode === "after") throw new Error("after");
  }
}
const DAY = 86_400_000;
const NOW = 20_000 * DAY + 1_000;
const event = (suffix: string) => `care_event_${suffix.padEnd(16, "x")}`;

function actionForDifferentQuest(questAction: CareActionId): CareActionId {
  return (["feed", "play", "groom"] as CareActionId[]).find((action) => action !== questAction)!;
}

describe("versioned pet progression", () => {
  it("loads safe defaults, each approved action, cooldown, duplicate, and exact reload", () => {
    for (const actionId of ["feed", "play", "groom"] as const) {
      const storage = new MemoryStorage();
      const loaded = loadProgression(storage, ["cat"], NOW);
      expect(loaded.code).toBe("progression-load-empty");
      expect(storage.getItem(PROGRESSION_KEY)).toBeNull();
      const questAction = DAILY_QUESTS.find(({ id }) => id === loaded.state.currentQuest?.id)!.actionId;
      const chosen = actionId === questAction ? actionForDifferentQuest(questAction) : actionId;
      const accepted = performCare(storage, loaded.state, ["cat"], { eventId: event(chosen), petId: "cat", actionId: chosen, now: NOW });
      expect(accepted.code).toBe("care-accepted");
      expect(accepted.receipt?.actionXp).toBe(5);
      expect(accepted.receipt?.questXp).toBe(0);
      expect(accepted.state.totalXp).toBe(5);
      expect(loadProgression(storage, ["cat"], NOW)).toEqual({ state: accepted.state, code: null });
      expect(performCare(storage, accepted.state, ["cat"], { eventId: event(chosen), petId: "cat", actionId: chosen, now: NOW }).code).toBe("care-duplicate");
      expect(performCare(storage, accepted.state, ["cat"], { eventId: event(`${chosen}2`), petId: "cat", actionId: chosen, now: NOW + CARE_COOLDOWN_MS - 1 }).code).toBe("care-cooldown");
    }
  });

  it("commits care, quest evidence, reward, and receipt atomically without touching legacy records", () => {
    const storage = new MemoryStorage();
    const legacy = {
      "croatian-money-pet-game:v1": "game-bytes",
      "croatian-money-pet-game:adventure:v1": "adventure-bytes",
      "croatian-money-pet-game:parent-access:v1": "parent-bytes",
    };
    for (const [key, value] of Object.entries(legacy)) storage.data.set(key, value);
    const loaded = loadProgression(storage, ["cat"], NOW).state;
    const actionId = DAILY_QUESTS.find(({ id }) => id === loaded.currentQuest?.id)!.actionId;
    const result = performCare(storage, loaded, ["cat"], { eventId: event("quest"), petId: "cat", actionId, now: NOW });
    expect(result.code).toBe("care-accepted");
    expect(result.receipt).toMatchObject({ actionXp: 5, questXp: 15, totalXp: 20, questCompleted: true });
    expect(result.state.currentQuest?.evidence).toMatchObject({ eventId: event("quest"), actionId, awardedXp: 15 });
    expect(result.state.receipts).toHaveLength(1);
    for (const [key, value] of Object.entries(legacy)) expect(storage.getItem(key)).toBe(value);
  });

  it("reconciles throw-before and persist-then-throw and never rewards a retry twice", () => {
    const before = new MemoryStorage();
    const beforeState = loadProgression(before, ["cat"], NOW).state;
    const actionId = DAILY_QUESTS.find(({ id }) => id === beforeState.currentQuest?.id)!.actionId;
    before.mode = "before";
    const rejected = performCare(before, beforeState, ["cat"], { eventId: event("failure"), petId: "cat", actionId, now: NOW });
    expect(rejected).toEqual({ state: beforeState, code: "care-storage-unavailable", receipt: null });
    expect(before.getItem(PROGRESSION_KEY)).toBeNull();
    before.mode = "ok";
    const retried = performCare(before, rejected.state, ["cat"], { eventId: event("failure"), petId: "cat", actionId, now: NOW });
    expect(retried.state.totalXp).toBe(20);

    const after = new MemoryStorage();
    const afterState = loadProgression(after, ["cat"], NOW).state;
    const afterAction = DAILY_QUESTS.find(({ id }) => id === afterState.currentQuest?.id)!.actionId;
    after.mode = "after";
    const reconciled = performCare(after, afterState, ["cat"], { eventId: event("persisted"), petId: "cat", actionId: afterAction, now: NOW });
    expect(reconciled.code).toBe("care-accepted");
    expect(reconciled.state.totalXp).toBe(20);
    after.mode = "ok";
    const duplicate = performCare(after, loadProgression(after, ["cat"], NOW).state, ["cat"], { eventId: event("persisted"), petId: "cat", actionId: afterAction, now: NOW });
    expect(duplicate.code).toBe("care-duplicate");
    expect(duplicate.state.totalXp).toBe(20);
  });

  it("applies bounded daily decay, freezes rollback, rejects stale pets, full needs, and bad IDs", () => {
    const storage = new MemoryStorage();
    const initial = loadProgression(storage, ["cat"], NOW).state;
    const action = actionForDifferentQuest(DAILY_QUESTS.find(({ id }) => id === initial.currentQuest?.id)!.actionId);
    const first = performCare(storage, initial, ["cat"], { eventId: event("first"), petId: "cat", actionId: action, now: NOW }).state;
    const weekLater = loadProgression(storage, ["cat"], NOW + 20 * DAY).state;
    expect(weekLater.pets[0]).toMatchObject({ fullness: 40, happiness: 40, cleanliness: 40 });
    expect(loadProgression(storage, ["cat"], NOW - DAY).state.lastWindow).toBe(first.lastWindow);
    expect(loadProgression(storage, ["dog"], NOW).code).toBe("progression-load-invalid");
    expect(performCare(storage, initial, ["cat"], { eventId: "bad", petId: "cat", actionId: "feed", now: NOW }).code).toBe("care-invalid-event");
    expect(performCare(storage, initial, ["cat"], { eventId: event("dog"), petId: "dog", actionId: "feed", now: NOW }).code).toBe("care-unknown-pet");

    const full = structuredClone(initial);
    full.pets[0].fullness = 100;
    expect(performCare(storage, full, ["cat"], { eventId: event("full"), petId: "cat", actionId: "feed", now: NOW }).code).toBe("care-need-full");
  });

  it("fails closed without overwriting malformed, unknown-version, invalid, or unavailable records", () => {
    for (const [raw, code] of [
      ["bad json", "progression-load-malformed"],
      [JSON.stringify({ version: 2 }), "progression-load-unknown-version"],
      [JSON.stringify({ version: 1 }), "progression-load-invalid"],
    ] as const) {
      const storage = new MemoryStorage();
      storage.data.set(PROGRESSION_KEY, raw);
      const recovered = loadProgression(storage, ["cat"], NOW);
      expect(recovered.code).toBe(code);
      expect(performCare(storage, recovered.state, ["cat"], { eventId: event("blocked"), petId: "cat", actionId: "feed", now: NOW }).code).toBe("care-storage-unavailable");
      expect(storage.getItem(PROGRESSION_KEY)).toBe(raw);
    }
    const unavailable: StorageLike = { getItem() { throw new Error("read"); }, setItem() { throw new Error("write"); } };
    expect(loadProgression(unavailable, ["cat"], NOW).code).toBe("progression-load-unavailable");
  });

  it("strictly validates bounds and derives capped levels and cosmetics", () => {
    const state = loadProgression(new MemoryStorage(), ["cat"], NOW).state;
    expect(isValidProgression(state, ["cat"])).toBe(true);
    expect(isValidProgression({ ...state, totalXp: MAX_XP + 1 }, ["cat"])).toBe(false);
    expect(isValidProgression({ ...state, extra: true }, ["cat"])).toBe(false);
    expect([0, 99, 100, 899, 999, 1000].map(progressionLevel)).toEqual([1, 1, 2, 9, 10, 10]);
    expect(COSMETIC_TITLES.map(({ level }) => level)).toEqual([2, 4, 6, 8, 10]);
  });
});
