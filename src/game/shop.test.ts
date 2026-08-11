import { describe, expect, it } from "vitest";
import { ITEMS, PETS } from "../content/hr";
import { initialState } from "./store";
import { buyItem, buyPet } from "./shop";

const ADDED_PETS = PETS.slice(4);
const ADDED_ITEMS = ITEMS.slice(6);

describe("shop", () => {
  it("preserves purchases of the original four distinct pet types", () => {
    let state = { ...initialState(), wallet: 500 };
    for (const id of ["fish", "rabbit", "cat", "dog"]) state = buyPet(state, id).state;
    expect(state.ownedPets.map(({ catalogId }) => catalogId)).toEqual(["fish", "rabbit", "cat", "dog"]);
    expect(state.wallet).toBe(280);
    const duplicate = buyPet(state, "fish");
    expect(duplicate.code).toBe("pet-already-owned");
    expect(duplicate.state).toBe(state);
  });

  it("buys each added animal once for its exact wallet price and rejects a duplicate atomically", () => {
    for (const pet of ADDED_PETS) {
      const start = { ...initialState(), wallet: pet.price, savings: 200, debt: 50 };
      const purchased = buyPet(start, pet.id);
      expect(purchased.code).toBe("pet-purchase-ok");
      expect(purchased.state).toEqual({
        ...start,
        wallet: 0,
        nextId: 2,
        ownedPets: [{ id: 1, catalogId: pet.id }],
        activities: [{ code: "pet-purchased", name: pet.name, amount: pet.price }],
      });

      const duplicate = buyPet(purchased.state, pet.id);
      expect(duplicate.code).toBe("pet-already-owned");
      expect(duplicate.state).toBe(purchased.state);
    }
  });

  it("increments every added item quantity and charges its exact wallet price per purchase", () => {
    for (const item of ADDED_ITEMS) {
      const start = { ...initialState(), wallet: item.price * 2, savings: 200, debt: 50 };
      const first = buyItem(start, item.id);
      expect(first.code).toBe("item-purchase-ok");
      expect(first.state.wallet).toBe(item.price);
      expect(first.state.itemQuantities[item.id]).toBe(1);
      expect(first.state.activities).toEqual([{ code: "item-purchased", name: item.name, amount: item.price }]);

      const second = buyItem(first.state, item.id);
      expect(second.code).toBe("item-purchase-ok");
      expect(second.state.wallet).toBe(0);
      expect(second.state.savings).toBe(200);
      expect(second.state.debt).toBe(50);
      expect(second.state.itemQuantities[item.id]).toBe(2);
      expect(second.state.activities).toEqual([
        { code: "item-purchased", name: item.name, amount: item.price },
        { code: "item-purchased", name: item.name, amount: item.price },
      ]);
    }
  });

  it("preserves repeatable purchases of an original item", () => {
    const start = { ...initialState(), wallet: 100 };
    const first = buyItem(start, "bowl").state;
    const second = buyItem(first, "bowl").state;
    expect(second.itemQuantities.bowl).toBe(2);
    expect(second.wallet).toBe(80);
    expect(second.activities).toHaveLength(2);
  });

  it("leaves the same state unchanged for insufficient wallet and unknown entries", () => {
    const state = { ...initialState(), savings: 1_000, debt: 75 };
    for (const result of [buyPet(state, "cow"), buyItem(state, "bookshelf")]) {
      expect(result.code).toBe("insufficient-wallet");
      expect(result.state).toBe(state);
    }
    expect(buyPet(state, "dragon")).toEqual({ state, code: "unknown-shop-entry" });
    expect(buyItem(state, "missing")).toEqual({ state, code: "unknown-shop-entry" });
  });
});
