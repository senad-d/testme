import { describe, expect, it } from "vitest";
import { ITEMS, PETS } from "../content/hr";
import {
  initialState,
  isValidState,
  loadState,
  saveState,
  type AppStateV1,
  type StorageLike,
} from "./store";
import { buyItem } from "./shop";
import {
  HOUSE_AREAS,
  ITEM_SLOTS,
  PET_SLOTS,
  moveAsset,
  placeAsset,
  removeAsset,
  selectTheme,
} from "./house";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe("house customization", () => {
  it("defines every compatible slot exactly once in the ordered four-area contract", () => {
    expect(HOUSE_AREAS).toEqual([
      { id: "living-room", slots: ["item-1", "item-2"] },
      { id: "pet-room", slots: ["pet-1", "pet-2", "item-3"] },
      { id: "storage", slots: ["item-4", "item-5", "item-6"] },
      { id: "yard-stable", slots: ["pet-3", "pet-4"] },
    ]);

    const slots = HOUSE_AREAS.flatMap(({ slots: areaSlots }) => areaSlots);
    expect(slots).toHaveLength(10);
    expect(new Set(slots).size).toBe(slots.length);
    expect([...PET_SLOTS]).toEqual(["pet-1", "pet-2", "pet-3", "pet-4"]);
    expect([...ITEM_SLOTS]).toEqual(["item-1", "item-2", "item-3", "item-4", "item-5", "item-6"]);
    expect(HOUSE_AREAS.find(({ id }) => id === ("unknown-area" as typeof HOUSE_AREAS[number]["id"]))).toBeUndefined();
  });

  it("loads, moves across areas, removes, and saves a fully populated V1 layout without changing its shape", () => {
    const legacyState: AppStateV1 = {
      ...initialState(),
      ownedPets: PETS.map(({ id }, index) => ({ id: index + 1, catalogId: id })),
      itemQuantities: Object.fromEntries(ITEMS.map(({ id }) => [id, 1])),
      petPlacements: { "pet-1": 1, "pet-2": 2, "pet-3": 3, "pet-4": 4 },
      itemPlacements: {
        "item-1": ITEMS[0].id,
        "item-2": ITEMS[1].id,
        "item-3": ITEMS[2].id,
        "item-4": ITEMS[3].id,
        "item-5": ITEMS[4].id,
        "item-6": ITEMS[5].id,
      },
      nextId: PETS.length + 1,
    };
    expect(isValidState(legacyState)).toBe(true);

    const storage = new MemoryStorage();
    expect(saveState(storage, legacyState)).toBeNull();
    const loaded = loadState(storage);
    expect(loaded).toEqual({ state: legacyState, code: null });

    const petDestinationRemoved = removeAsset(loaded.state, "pet", "pet-3");
    expect(petDestinationRemoved.code).toBe("house-remove-ok");
    const petMoved = moveAsset(petDestinationRemoved.state, "pet", "pet-1", "pet-3");
    expect(petMoved.code).toBe("house-move-ok");
    const petRemoved = removeAsset(petMoved.state, "pet", "pet-3");
    expect(petRemoved.code).toBe("house-remove-ok");

    const itemDestinationRemoved = removeAsset(petRemoved.state, "item", "item-4");
    expect(itemDestinationRemoved.code).toBe("house-remove-ok");
    const itemMoved = moveAsset(itemDestinationRemoved.state, "item", "item-1", "item-4");
    expect(itemMoved.code).toBe("house-move-ok");
    const itemRemoved = removeAsset(itemMoved.state, "item", "item-4");
    expect(itemRemoved.code).toBe("house-remove-ok");

    expect(Object.keys(itemRemoved.state)).toEqual(Object.keys(legacyState));
    expect(Object.keys(itemRemoved.state.petPlacements)).toEqual(Object.keys(legacyState.petPlacements));
    expect(Object.keys(itemRemoved.state.itemPlacements)).toEqual(Object.keys(legacyState.itemPlacements));
    expect(saveState(storage, itemRemoved.state)).toBeNull();
    expect(loadState(storage)).toEqual({ state: itemRemoved.state, code: null });
  });

  it("allows every catalog animal in every pet slot and keeps excess owned animals valid and unplaced", () => {
    for (const [petIndex, pet] of PETS.entries()) {
      for (const slot of PET_SLOTS) {
        const state: AppStateV1 = {
          ...initialState(),
          ownedPets: [{ id: petIndex + 1, catalogId: pet.id }],
          nextId: petIndex + 2,
        };
        const result = placeAsset(state, { kind: "pet", id: petIndex + 1 }, slot);
        expect(result.code).toBe("house-place-ok");
        expect(result.state.petPlacements[slot]).toBe(petIndex + 1);
        expect(isValidState(result.state)).toBe(true);
      }
    }

    let fullState: AppStateV1 = {
      ...initialState(),
      ownedPets: PETS.map(({ id }, index) => ({ id: index + 1, catalogId: id })),
      nextId: PETS.length + 1,
    };
    [...PET_SLOTS].forEach((slot, index) => {
      fullState = placeAsset(fullState, { kind: "pet", id: index + 1 }, slot).state;
    });
    expect(Object.values(fullState.petPlacements).filter((id) => id !== null)).toHaveLength(4);
    expect(fullState.ownedPets.filter(({ id }) => !Object.values(fullState.petPlacements).includes(id))).toHaveLength(PETS.length - 4);
    expect(isValidState(fullState)).toBe(true);
    const fullResult = placeAsset(fullState, { kind: "pet", id: 5 }, "pet-1");
    expect(fullResult.code).toBe("house-slot-occupied");
    expect(fullResult.state).toBe(fullState);
  });

  it("retains exact rejection codes and state identity for invalid atomic changes", () => {
    const state: AppStateV1 = {
      ...initialState(),
      ownedPets: [
        { id: 1, catalogId: PETS[0].id },
        { id: 2, catalogId: PETS[1].id },
      ],
      itemQuantities: { [ITEMS[0].id]: 1 },
      petPlacements: { ...initialState().petPlacements, "pet-1": 1 },
      itemPlacements: { ...initialState().itemPlacements, "item-1": ITEMS[0].id },
      nextId: 3,
    };
    expect(isValidState(state)).toBe(true);

    const rejections = [
      [placeAsset(state, { kind: "pet" as const, id: 2 }, "living-room"), "unknown-house-slot"],
      [placeAsset(state, { kind: "pet" as const, id: 2 }, "item-2"), "unknown-house-slot"],
      [placeAsset(state, { kind: "item" as const, id: ITEMS[0].id }, "pet-2"), "unknown-house-slot"],
      [placeAsset(state, { kind: "pet" as const, id: 2 }, "pet-1"), "house-slot-occupied"],
      [placeAsset(state, { kind: "pet" as const, id: 999 }, "pet-2"), "asset-not-owned"],
      [placeAsset(state, { kind: "pet" as const, id: 1 }, "pet-2"), "asset-already-placed"],
      [placeAsset(state, { kind: "item" as const, id: ITEMS[1].id }, "item-2"), "asset-not-owned"],
      [placeAsset(state, { kind: "item" as const, id: ITEMS[0].id }, "item-2"), "item-quantity-exhausted"],
      [moveAsset(state, "pet", "pet-1", "item-2"), "unknown-house-slot"],
      [moveAsset(state, "item", "item-1", "item-1"), "house-slot-occupied"],
      [removeAsset(state, "pet", "item-1"), "unknown-house-slot"],
      [removeAsset(state, "item", "item-2"), "house-slot-empty"],
    ] as const;

    for (const [result, code] of rejections) {
      expect(result.code).toBe(code);
      expect(result.state).toBe(state);
    }
    expect(selectTheme(state, "space")).toEqual({ state, code: "unknown-theme" });
  });

  it("strictly rejects unknown, wrong-kind, extra, and incomplete persisted slot families", () => {
    const base = initialState();
    const invalidPlacements = [
      { ...base.petPlacements, "pet-4": undefined },
      { "pet-1": null, "pet-2": null, "pet-3": null, "pet-5": null },
      { "pet-1": null, "pet-2": null, "pet-3": null, "item-6": null },
      { ...base.petPlacements, "pet-5": null },
    ];
    for (const petPlacements of invalidPlacements) {
      expect(isValidState({ ...base, petPlacements })).toBe(false);
    }
  });

  it("still places, moves, and removes owned items", () => {
    let state = buyItem({ ...initialState(), wallet: 50 }, "plant").state;
    state = placeAsset(state, { kind: "item", id: "plant" }, "item-1").state;
    state = moveAsset(state, "item", "item-1", "item-2").state;
    expect(state.itemPlacements["item-2"]).toBe("plant");
    state = removeAsset(state, "item", "item-2").state;
    expect(state.itemPlacements["item-2"]).toBeNull();
  });
});
