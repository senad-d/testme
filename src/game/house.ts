import { ITEMS, THEMES } from "../content/hr";
import type { AppStateV1, ResultCode } from "./store";

export type Asset = { kind: "pet"; id: number } | { kind: "item"; id: string };
export type SlotKind = "pet" | "item";
export interface HouseResult { state: AppStateV1; code: ResultCode }

const PET_SLOTS = ["pet-1", "pet-2", "pet-3", "pet-4"];
const ITEM_SLOTS = ["item-1", "item-2", "item-3", "item-4", "item-5", "item-6"];

export function selectTheme(state: AppStateV1, themeId: string): HouseResult {
  if (!THEMES.some(({ id }) => id === themeId)) return { state, code: "unknown-theme" };
  return { state: { ...state, selectedTheme: themeId }, code: "theme-select-ok" };
}

export function placeAsset(state: AppStateV1, asset: Asset, slot: string): HouseResult {
  if (asset.kind === "pet") {
    if (!PET_SLOTS.includes(slot)) return { state, code: "unknown-house-slot" };
    if (!(asset.id && state.ownedPets.some(({ id }) => id === asset.id))) return { state, code: "asset-not-owned" };
    if (Object.values(state.petPlacements).includes(asset.id)) return { state, code: "asset-already-placed" };
    if (state.petPlacements[slot] !== null) return { state, code: "house-slot-occupied" };
    return { state: { ...state, petPlacements: { ...state.petPlacements, [slot]: asset.id } }, code: "house-place-ok" };
  }
  if (!ITEM_SLOTS.includes(slot)) return { state, code: "unknown-house-slot" };
  if (!ITEMS.some(({ id }) => id === asset.id)) return { state, code: "unknown-asset" };
  const quantity = state.itemQuantities[asset.id] ?? 0;
  if (quantity === 0) return { state, code: "asset-not-owned" };
  const placed = Object.values(state.itemPlacements).filter((id) => id === asset.id).length;
  if (placed >= quantity) return { state, code: "item-quantity-exhausted" };
  if (state.itemPlacements[slot] !== null) return { state, code: "house-slot-occupied" };
  return { state: { ...state, itemPlacements: { ...state.itemPlacements, [slot]: asset.id } }, code: "house-place-ok" };
}

export function moveAsset(state: AppStateV1, kind: SlotKind, from: string, to: string): HouseResult {
  const validSlots = kind === "pet" ? PET_SLOTS : ITEM_SLOTS;
  const placements = kind === "pet" ? state.petPlacements : state.itemPlacements;
  if (!validSlots.includes(from) || !validSlots.includes(to)) return { state, code: "unknown-house-slot" };
  if (placements[from] === null) return { state, code: "house-slot-empty" };
  if (placements[to] !== null) return { state, code: "house-slot-occupied" };
  const next = { ...placements, [to]: placements[from], [from]: null };
  return kind === "pet"
    ? { state: { ...state, petPlacements: next as Record<string, number | null> }, code: "house-move-ok" }
    : { state: { ...state, itemPlacements: next as Record<string, string | null> }, code: "house-move-ok" };
}

export function removeAsset(state: AppStateV1, kind: SlotKind, slot: string): HouseResult {
  const validSlots = kind === "pet" ? PET_SLOTS : ITEM_SLOTS;
  const placements = kind === "pet" ? state.petPlacements : state.itemPlacements;
  if (!validSlots.includes(slot)) return { state, code: "unknown-house-slot" };
  if (placements[slot] === null) return { state, code: "house-slot-empty" };
  const next = { ...placements, [slot]: null };
  return kind === "pet"
    ? { state: { ...state, petPlacements: next as Record<string, number | null> }, code: "house-remove-ok" }
    : { state: { ...state, itemPlacements: next as Record<string, string | null> }, code: "house-remove-ok" };
}
