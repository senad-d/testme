import { describe, expect, it } from "vitest";
import { initialState } from "./store";
import { buyItem, buyPet } from "./shop";
import { moveAsset, placeAsset, removeAsset, selectTheme } from "./house";

describe("house customization", () => {
  it("selects a theme and places all four pets", () => {
    let state = { ...initialState(), wallet: 500 };
    for (const id of ["fish", "rabbit", "cat", "dog"]) state = buyPet(state, id).state;
    state = selectTheme(state, "forest").state;
    state.ownedPets.forEach((pet, index) => { state = placeAsset(state, { kind: "pet", id: pet.id }, `pet-${index + 1}`).state; });
    expect(state.selectedTheme).toBe("forest");
    expect(Object.values(state.petPlacements).filter(Boolean)).toHaveLength(4);
  });

  it("places, moves, and removes owned items", () => {
    let state = buyItem({ ...initialState(), wallet: 50 }, "plant").state;
    state = placeAsset(state, { kind: "item", id: "plant" }, "item-1").state;
    state = moveAsset(state, "item", "item-1", "item-2").state;
    expect(state.itemPlacements["item-2"]).toBe("plant");
    state = removeAsset(state, "item", "item-2").state;
    expect(state.itemPlacements["item-2"]).toBeNull();
  });

  it("rejects invalid and occupied changes atomically", () => {
    let state = buyItem({ ...initialState(), wallet: 50 }, "bowl").state;
    state = placeAsset(state, { kind: "item", id: "bowl" }, "item-1").state;
    for (const result of [
      placeAsset(state, { kind: "item", id: "bowl" }, "item-2"),
      placeAsset(state, { kind: "item", id: "missing" }, "item-2"),
      placeAsset(state, { kind: "item", id: "toy" }, "item-2"),
      moveAsset(state, "item", "item-1", "item-1"),
      removeAsset(state, "item", "missing"),
      removeAsset(state, "item", "item-2"),
    ]) expect(result.state).toBe(state);
    expect(placeAsset(state, { kind: "item", id: "bowl" }, "item-2").code).toBe("item-quantity-exhausted");
    expect(selectTheme(state, "space").code).toBe("unknown-theme");
  });
});
