import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CODES,
  LOAD_CODES,
  RESULT_CODES,
  STORAGE_KEY,
  initialState,
  isValidState,
  loadState,
  saveState,
  type AppStateV1,
  type StorageLike,
} from "./store";
import { CHORES, CONFIG, ITEMS, LOAD_MESSAGES, PETS, RESULT_MESSAGES, THEMES, activityMessage } from "../content/hr";
import { approveChore, requestChore, returnChore } from "./chores";
import { buyItem, buyPet } from "./shop";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const EXPECTED_CHORES = [
  ["make-bed", "Posloži krevet", 5],
  ["tidy-toys", "Pospremi igračke", 8],
  ["water-plants", "Zalij biljke", 6],
  ["set-table", "Postavi stol", 10],
  ["fold-laundry", "Pomozi složiti rublje", 12],
  ["pack-school-supplies", "Složi školski pribor", 4],
  ["feed-pets", "Nahrani ljubimce", 7],
  ["sweep-kitchen", "Pometi kuhinju", 9],
  ["help-garden", "Pomozi u vrtu", 11],
  ["sort-recycling", "Razvrstaj otpad", 14],
  ["wipe-table", "Obriši stol", 6],
  ["organize-books", "Složi knjige", 7],
  ["dust-shelves", "Obriši prašinu s polica", 8],
  ["collect-mail", "Donesi poštu", 5],
];
const EXPECTED_PETS = [
  ["fish", "Ribica", 30, "🐟"],
  ["rabbit", "Kunić", 50, "🐰"],
  ["cat", "Mačka", 60, "🐱"],
  ["dog", "Pas", 80, "🐶"],
  ["bird", "Ptičica", 40, "🐦"],
  ["goat", "Koza", 70, "🐐"],
  ["horse", "Konj", 100, "🐴"],
  ["cow", "Krava", 110, "🐄"],
  ["hamster", "Hrčak", 45, "🐹"],
  ["turtle", "Kornjača", 55, "🐢"],
  ["hedgehog", "Ježić", 65, "🦔"],
  ["alpaca", "Alpaka", 90, "🦙"],
];
const EXPECTED_ITEMS = [
  ["bowl", "Zdjelica", 10, "🥣", "pet"],
  ["toy", "Igračka", 15, "🧶", "pet"],
  ["pet-bed", "Krevetić", 20, "🛏️", "pet"],
  ["plant", "Biljka", 12, "🪴", "house"],
  ["rug", "Tepih", 18, "🟫", "house"],
  ["wall-picture", "Zidna slika", 22, "🖼️", "house"],
  ["bird-perch", "Stajalica za ptice", 16, "🪵", "pet"],
  ["pet-brush", "Četka za ljubimce", 14, "🪮", "pet"],
  ["lamp", "Svjetiljka", 16, "🏮", "house"],
  ["bookshelf", "Polica za knjige", 24, "📚", "house"],
  ["water-bottle", "Bočica za vodu", 12, "🍼", "pet"],
  ["play-ball", "Loptica za igru", 13, "⚽", "pet"],
  ["grooming-glove", "Rukavica za četkanje", 15, "🧤", "pet"],
  ["pet-blanket", "Dekica za ljubimca", 19, "🧣", "pet"],
  ["wall-clock", "Zidni sat", 20, "🕰️", "house"],
  ["flower-basket", "Košara s cvijećem", 18, "💐", "house"],
];
const EXPECTED_THEMES = [
  ["sun", "Sunce"],
  ["sea", "More"],
  ["forest", "Šuma"],
];

function namedCatalogActivities() {
  return [
    ...CHORES.map(({ name, reward }) => ({ code: "chore-reward-paid" as const, name, amount: reward })),
    ...PETS.map(({ name, price }) => ({ code: "pet-purchased" as const, name, amount: price })),
    ...ITEMS.map(({ name, price }) => ({ code: "item-purchased" as const, name, amount: price })),
  ];
}

describe("versioned store", () => {
  it("round trips a complete current V1 record under the unchanged storage contract", () => {
    const storage = new MemoryStorage();
    expect(loadState(storage)).toEqual({ state: initialState(), code: "load-empty" });

    const state: AppStateV1 = {
      ...initialState(),
      wallet: 25,
      savings: 15,
      debt: CONFIG.debtLimit,
      choreRequests: CHORES.map(({ id }, index) => ({ id: index + 1, choreId: id, status: "approved" })),
      ownedPets: PETS.map(({ id }, index) => ({ id: CHORES.length + index + 1, catalogId: id })),
      itemQuantities: Object.fromEntries(ITEMS.map(({ id }) => [id, 1])),
      selectedTheme: THEMES[2].id,
      petPlacements: Object.fromEntries(PETS.slice(0, 4).map((_, index) => [`pet-${index + 1}`, CHORES.length + index + 1])),
      itemPlacements: Object.fromEntries(ITEMS.slice(0, 6).map(({ id }, index) => [`item-${index + 1}`, id])),
      nextId: CHORES.length + PETS.length + 1,
      activities: namedCatalogActivities(),
    };

    expect(Object.keys(state)).toEqual([
      "version", "wallet", "savings", "debt", "choreRequests", "ownedPets", "itemQuantities",
      "selectedTheme", "petPlacements", "itemPlacements", "nextId", "activities",
    ]);
    expect(Object.keys(state.petPlacements)).toEqual(["pet-1", "pet-2", "pet-3", "pet-4"]);
    expect(Object.keys(state.itemPlacements)).toEqual(["item-1", "item-2", "item-3", "item-4", "item-5", "item-6"]);
    expect(saveState(storage, state)).toBeNull();
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY]);
    expect(loadState(storage)).toEqual({ state, code: null });
  });

  it("retains fail-safe load and save behavior without overwriting unreadable bytes", () => {
    const cases = [
      { raw: "not json", code: "load-malformed" },
      { raw: JSON.stringify({ version: 2 }), code: "load-unknown-version" },
      { raw: JSON.stringify({ ...initialState(), wallet: -1 }), code: "load-invalid-state" },
    ] as const;

    for (const { raw, code } of cases) {
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, raw);
      expect(loadState(storage)).toEqual({ state: initialState(), code });
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    }

    const unavailable: StorageLike = {
      getItem() { throw new Error("read unavailable"); },
      setItem() { throw new Error("write unavailable"); },
    };
    expect(loadState(unavailable)).toEqual({ state: initialState(), code: "load-unavailable" });
    expect(saveState(unavailable, initialState())).toBe("save-unavailable");
  });

  it("enumerates and accepts exactly the current Croatian catalog families", () => {
    expect(CHORES.map(({ id, name, reward }) => [id, name, reward])).toEqual(EXPECTED_CHORES);
    expect(PETS.map(({ id, name, price, emoji }) => [id, name, price, emoji])).toEqual(EXPECTED_PETS);
    expect(ITEMS.map(({ id, name, price, emoji, category }) => [id, name, price, emoji, category])).toEqual(EXPECTED_ITEMS);
    expect(ITEMS.filter((item) => "careAssociation" in item).map(({ id, careAssociation }) => [id, careAssociation])).toEqual([
      ["water-bottle", "feed"], ["play-ball", "play"], ["grooming-glove", "groom"],
    ]);
    expect(THEMES.map(({ id, name }) => [id, name])).toEqual(EXPECTED_THEMES);
    expect(new Set(CHORES.map(({ id }) => id)).size).toBe(14);
    expect([...CHORES.map(({ reward }) => reward)].sort((a, b) => a - b)).toEqual([4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 12, 14]);
    expect(CHORES.every(({ reward }) => Number.isSafeInteger(reward) && reward > 0)).toBe(true);

    for (const { id } of CHORES) {
      expect(isValidState({ ...initialState(), choreRequests: [{ id: 1, choreId: id, status: "pending" }], nextId: 2 })).toBe(true);
    }
    for (const { id } of PETS) {
      expect(isValidState({ ...initialState(), ownedPets: [{ id: 1, catalogId: id }], nextId: 2 })).toBe(true);
    }
    for (const { id } of ITEMS) {
      expect(isValidState({ ...initialState(), itemQuantities: { [id]: 1 } })).toBe(true);
    }
    for (const { id } of THEMES) {
      expect(isValidState({ ...initialState(), selectedTheme: id })).toBe(true);
    }
  });

  it("round trips every added job through pending, return, and one exact approval", () => {
    const addedChores = CHORES.slice(5);
    expect(addedChores.map(({ id, name, reward }) => [id, name, reward])).toEqual(EXPECTED_CHORES.slice(5));

    for (const chore of addedChores) {
      const storage = new MemoryStorage();
      const pending = requestChore(initialState(), chore.id);
      expect(pending.code).toBe("chore-request-ok");
      expect(pending.state.wallet).toBe(0);
      expect(pending.state.choreRequests).toEqual([{ id: 1, choreId: chore.id, status: "pending" }]);
      const duplicate = requestChore(pending.state, chore.id);
      expect(duplicate.code).toBe("chore-already-pending");
      expect(duplicate.state).toBe(pending.state);
      expect(saveState(storage, pending.state)).toBeNull();
      expect(loadState(storage)).toEqual({ state: pending.state, code: null });

      const returned = returnChore(loadState(storage).state, 1);
      expect(returned.code).toBe("chore-return-ok");
      expect(returned.state.wallet).toBe(0);
      expect(returned.state.activities).toEqual([]);
      expect(saveState(storage, returned.state)).toBeNull();
      expect(loadState(storage)).toEqual({ state: returned.state, code: null });

      const requestedAgain = requestChore(loadState(storage).state, chore.id);
      const approved = approveChore(requestedAgain.state, 2);
      expect(approved.code).toBe("chore-approve-ok");
      expect(approved.state.wallet).toBe(chore.reward);
      expect(approved.state.choreRequests).toEqual([
        { id: 1, choreId: chore.id, status: "returned" },
        { id: 2, choreId: chore.id, status: "approved" },
      ]);
      expect(approved.state.activities).toEqual([
        { code: "chore-reward-paid", name: chore.name, amount: chore.reward },
      ]);
      const duplicateApproval = approveChore(approved.state, 2);
      expect(duplicateApproval.code).toBe("chore-request-already-resolved");
      expect(duplicateApproval.state).toBe(approved.state);
      expect(saveState(storage, approved.state)).toBeNull();
      expect(loadState(storage)).toEqual({ state: approved.state, code: null });

      expect(isValidState({
        ...approved.state,
        choreRequests: [...approved.state.choreRequests, { id: 3, choreId: `${chore.id}-altered`, status: "pending" }],
        nextId: 4,
      })).toBe(false);
      expect(isValidState({
        ...approved.state,
        activities: [{ code: "chore-reward-paid", name: `${chore.name}!`, amount: chore.reward }],
      })).toBe(false);
      expect(isValidState({
        ...approved.state,
        activities: [{ code: "chore-reward-paid", name: chore.name, amount: chore.reward + 1 }],
      })).toBe(false);
    }
  });

  it("round trips accepted purchases for every added animal and item under V1", () => {
    const addedPets = PETS.slice(4);
    const addedItems = ITEMS.slice(6);
    const totalPrice = addedPets.reduce((sum, { price }) => sum + price, 0)
      + addedItems.reduce((sum, { price }) => sum + price * 2, 0);
    let state = { ...initialState(), wallet: totalPrice, savings: 300, debt: 80 };

    for (const pet of addedPets) {
      const result = buyPet(state, pet.id);
      expect(result.code).toBe("pet-purchase-ok");
      state = result.state;
    }
    for (const item of addedItems) {
      for (let purchase = 0; purchase < 2; purchase += 1) {
        const result = buyItem(state, item.id);
        expect(result.code).toBe("item-purchase-ok");
        state = result.state;
      }
    }

    expect(state.wallet).toBe(0);
    expect(state.savings).toBe(300);
    expect(state.debt).toBe(80);
    expect(state.ownedPets.map(({ catalogId }) => catalogId)).toEqual(addedPets.map(({ id }) => id));
    expect(state.itemQuantities).toEqual(Object.fromEntries(addedItems.map(({ id }) => [id, 2])));
    expect(state.activities).toEqual([
      ...addedPets.map(({ name, price }) => ({ code: "pet-purchased" as const, name, amount: price })),
      ...addedItems.flatMap(({ name, price }) => [
        { code: "item-purchased" as const, name, amount: price },
        { code: "item-purchased" as const, name, amount: price },
      ]),
    ]);

    const storage = new MemoryStorage();
    expect(saveState(storage, state)).toBeNull();
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY]);
    expect(loadState(storage)).toEqual({ state, code: null });

    for (const activity of state.activities) {
      expect("name" in activity).toBe(true);
      if ("name" in activity) expect(isValidState({ ...state, activities: [{ ...activity, name: `${activity.name}!` }] })).toBe(false);
      expect(isValidState({ ...state, activities: [{ ...activity, amount: activity.amount + 1 }] })).toBe(false);
    }
    expect(isValidState({
      ...state,
      ownedPets: [...state.ownedPets, { id: state.nextId, catalogId: "future-pet" }],
      nextId: state.nextId + 1,
    })).toBe(false);
    expect(isValidState({ ...state, itemQuantities: { ...state.itemQuantities, "future-item": 1 } })).toBe(false);
  });

  it("accepts every exact positive whole Croatian catalog activity pair", () => {
    const activities = namedCatalogActivities();
    expect(activities).toHaveLength(CHORES.length + PETS.length + ITEMS.length);
    for (const { amount } of activities) {
      expect(Number.isSafeInteger(amount) && amount > 0).toBe(true);
    }
    expect(isValidState({ ...initialState(), activities })).toBe(true);
  });

  it("rejects unknown IDs from every catalog family", () => {
    const unknownCatalogStates = [
      { ...initialState(), choreRequests: [{ id: 1, choreId: "unknown-chore", status: "pending" }], nextId: 2 },
      { ...initialState(), ownedPets: [{ id: 1, catalogId: "unknown-pet" }], nextId: 2 },
      { ...initialState(), itemQuantities: { "unknown-item": 1 } },
      { ...initialState(), selectedTheme: "unknown-theme" },
    ];
    for (const state of unknownCatalogStates) expect(isValidState(state)).toBe(false);
  });

  it("rejects altered names and amounts for every catalog-bound activity type", () => {
    const exactActivities = [
      { code: "chore-reward-paid", name: CHORES[0].name, amount: CHORES[0].reward },
      { code: "pet-purchased", name: PETS[0].name, amount: PETS[0].price },
      { code: "item-purchased", name: ITEMS[0].name, amount: ITEMS[0].price },
    ] as const;

    for (const activity of exactActivities) {
      expect(isValidState({ ...initialState(), activities: [{ ...activity, name: `${activity.name}!` }] })).toBe(false);
      expect(isValidState({ ...initialState(), activities: [{ ...activity, amount: activity.amount + 1 }] })).toBe(false);
    }
  });

  it("rejects duplicate pets and impossible placements or quantities", () => {
    expect(isValidState({
      ...initialState(),
      ownedPets: [{ id: 1, catalogId: PETS[0].id }, { id: 2, catalogId: PETS[0].id }],
      nextId: 3,
    })).toBe(false);
    expect(isValidState({
      ...initialState(),
      petPlacements: { ...initialState().petPlacements, "pet-1": 1 },
    })).toBe(false);
    expect(isValidState({
      ...initialState(),
      itemPlacements: { ...initialState().itemPlacements, "item-1": ITEMS[0].id },
    })).toBe(false);
    expect(isValidState({
      ...initialState(),
      itemQuantities: { [ITEMS[0].id]: 1 },
      itemPlacements: { ...initialState().itemPlacements, "item-1": ITEMS[0].id, "item-2": ITEMS[0].id },
    })).toBe(false);
    for (const quantity of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(isValidState({ ...initialState(), itemQuantities: { [ITEMS[0].id]: quantity } })).toBe(false);
    }
  });

  it("rejects more owned pets than the catalog and debt above the configured limit", () => {
    const tooManyDistinctPets = [
      ...PETS.map(({ id }, index) => ({ id: index + 1, catalogId: id })),
      { id: PETS.length + 1, catalogId: "future-pet" },
    ];
    expect(isValidState({ ...initialState(), ownedPets: tooManyDistinctPets, nextId: tooManyDistinctPets.length + 1 })).toBe(false);
    expect(isValidState({ ...initialState(), debt: CONFIG.debtLimit + 1 })).toBe(false);
    expect(isValidState({ ...initialState(), debt: CONFIG.debtLimit })).toBe(true);
  });

  it("rejects invalid money and generic activity shapes", () => {
    expect(isValidState({ ...initialState(), wallet: -1 })).toBe(false);
    expect(isValidState({ ...initialState(), savings: 1.5 })).toBe(false);
    expect(isValidState({ ...initialState(), activities: [{ code: "unknown", amount: 1 }] })).toBe(false);
    expect(isValidState({ ...initialState(), activities: [{ code: "pet-purchased", amount: 1 }] })).toBe(false);
  });

  it("has exhaustive non-empty Croatian-facing mappings for unchanged codes", () => {
    expect(Object.keys(LOAD_MESSAGES).sort()).toEqual([...LOAD_CODES].sort());
    expect(Object.keys(RESULT_MESSAGES).sort()).toEqual([...RESULT_CODES].sort());
    for (const value of Object.values({ ...LOAD_MESSAGES, ...RESULT_MESSAGES })) expect(value.trim()).not.toBe("");
    for (const code of ACTIVITY_CODES) {
      const named = ["chore-reward-paid", "pet-purchased", "item-purchased"].includes(code);
      const entry = named ? { code, amount: 5, name: "Primjer" } : { code, amount: 5 };
      expect(activityMessage(entry as Parameters<typeof activityMessage>[0])).toContain("5");
    }
  });
});
