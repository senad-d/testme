import { ITEMS, PETS } from "../content/hr";
import type { AppStateV1, ResultCode } from "./store";

export interface ShopResult {
  state: AppStateV1;
  code: ResultCode;
}

export function buyPet(state: AppStateV1, catalogId: string): ShopResult {
  const pet = PETS.find((entry) => entry.id === catalogId);
  if (!pet) return { state, code: "unknown-shop-entry" };
  if (state.ownedPets.some((owned) => owned.catalogId === catalogId)) return { state, code: "pet-already-owned" };
  if (state.wallet < pet.price) return { state, code: "insufficient-wallet" };
  return {
    state: {
      ...state,
      wallet: state.wallet - pet.price,
      nextId: state.nextId + 1,
      ownedPets: [...state.ownedPets, { id: state.nextId, catalogId }],
      activities: [...state.activities, { code: "pet-purchased", amount: pet.price, name: pet.name }],
    },
    code: "pet-purchase-ok",
  };
}

export function buyItem(state: AppStateV1, catalogId: string): ShopResult {
  const item = ITEMS.find((entry) => entry.id === catalogId);
  if (!item) return { state, code: "unknown-shop-entry" };
  if (state.wallet < item.price) return { state, code: "insufficient-wallet" };
  return {
    state: {
      ...state,
      wallet: state.wallet - item.price,
      itemQuantities: { ...state.itemQuantities, [catalogId]: (state.itemQuantities[catalogId] ?? 0) + 1 },
      activities: [...state.activities, { code: "item-purchased", amount: item.price, name: item.name }],
    },
    code: "item-purchase-ok",
  };
}
