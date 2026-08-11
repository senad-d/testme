import { ITEMS, THEMES } from "../content/hr";
import type { AppStateV1, ResultCode } from "./store";

export type Asset = { kind: "pet"; id: number } | { kind: "item"; id: string };
export type SlotKind = "pet" | "item";
export type HouseAreaId = "living-room" | "pet-room" | "storage" | "yard-stable";
export type PetSlot = `pet-${1 | 2 | 3 | 4}`;
export type ItemSlot = `item-${1 | 2 | 3 | 4 | 5 | 6}`;
export type HouseSlot = PetSlot | ItemSlot;
export interface HouseArea { readonly id: HouseAreaId; readonly slots: readonly HouseSlot[] }
export interface HouseResult { state: AppStateV1; code: ResultCode }

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Includes<Values extends readonly unknown[], Value> =
  Values extends readonly [infer First, ...infer Rest]
    ? Equal<First, Value> extends true ? true : Includes<Rest, Value>
    : false;
type HasDuplicates<Values extends readonly unknown[], Seen extends readonly unknown[] = []> =
  Values extends readonly [infer First, ...infer Rest]
    ? Includes<Seen, First> extends true ? true : HasDuplicates<Rest, [...Seen, First]>
    : false;
type AreaSlots<Areas extends readonly HouseArea[], Slots extends readonly HouseSlot[] = []> =
  Areas extends readonly [infer Area extends HouseArea, ...infer Rest extends readonly HouseArea[]]
    ? AreaSlots<Rest, [...Slots, ...Area["slots"]]>
    : Slots;
type AreaIds<Areas extends readonly HouseArea[], Ids extends readonly HouseAreaId[] = []> =
  Areas extends readonly [infer Area extends HouseArea, ...infer Rest extends readonly HouseArea[]]
    ? AreaIds<Rest, [...Ids, Area["id"]]>
    : Ids;
type CompleteHouseAreas<Areas extends readonly HouseArea[]> =
  Equal<AreaSlots<Areas>[number], HouseSlot> extends true
    ? HasDuplicates<AreaSlots<Areas>> extends false
      ? Equal<AreaIds<Areas>[number], HouseAreaId> extends true
        ? HasDuplicates<AreaIds<Areas>> extends false ? Areas : never
        : never
      : never
    : never;

function defineHouseAreas<const Areas extends readonly HouseArea[]>(areas: Areas & CompleteHouseAreas<Areas>): Areas {
  return areas;
}

export const HOUSE_AREAS = defineHouseAreas([
  { id: "living-room", slots: ["item-1", "item-2"] },
  { id: "pet-room", slots: ["pet-1", "pet-2", "item-3"] },
  { id: "storage", slots: ["item-4", "item-5", "item-6"] },
  { id: "yard-stable", slots: ["pet-3", "pet-4"] },
] as const);

const houseSlots = HOUSE_AREAS.flatMap(({ slots }) => slots);
const hasPetKind = (slot: HouseSlot): slot is PetSlot => slot.startsWith("pet-");
const hasItemKind = (slot: HouseSlot): slot is ItemSlot => slot.startsWith("item-");

export const PET_SLOTS: ReadonlySet<PetSlot> = new Set(houseSlots.filter(hasPetKind));
export const ITEM_SLOTS: ReadonlySet<ItemSlot> = new Set(houseSlots.filter(hasItemKind));

function isSlotOfKind(slot: string, kind: SlotKind): boolean {
  return kind === "pet" ? PET_SLOTS.has(slot as PetSlot) : ITEM_SLOTS.has(slot as ItemSlot);
}

export function selectTheme(state: AppStateV1, themeId: string): HouseResult {
  if (!THEMES.some(({ id }) => id === themeId)) return { state, code: "unknown-theme" };
  return { state: { ...state, selectedTheme: themeId }, code: "theme-select-ok" };
}

export function placeAsset(state: AppStateV1, asset: Asset, slot: string): HouseResult {
  if (asset.kind === "pet") {
    if (!isSlotOfKind(slot, "pet")) return { state, code: "unknown-house-slot" };
    if (!(asset.id && state.ownedPets.some(({ id }) => id === asset.id))) return { state, code: "asset-not-owned" };
    if (Object.values(state.petPlacements).includes(asset.id)) return { state, code: "asset-already-placed" };
    if (state.petPlacements[slot] !== null) return { state, code: "house-slot-occupied" };
    return { state: { ...state, petPlacements: { ...state.petPlacements, [slot]: asset.id } }, code: "house-place-ok" };
  }
  if (!isSlotOfKind(slot, "item")) return { state, code: "unknown-house-slot" };
  if (!ITEMS.some(({ id }) => id === asset.id)) return { state, code: "unknown-asset" };
  const quantity = state.itemQuantities[asset.id] ?? 0;
  if (quantity === 0) return { state, code: "asset-not-owned" };
  const placed = Object.values(state.itemPlacements).filter((id) => id === asset.id).length;
  if (placed >= quantity) return { state, code: "item-quantity-exhausted" };
  if (state.itemPlacements[slot] !== null) return { state, code: "house-slot-occupied" };
  return { state: { ...state, itemPlacements: { ...state.itemPlacements, [slot]: asset.id } }, code: "house-place-ok" };
}

export function moveAsset(state: AppStateV1, kind: SlotKind, from: string, to: string): HouseResult {
  const placements = kind === "pet" ? state.petPlacements : state.itemPlacements;
  if (!isSlotOfKind(from, kind) || !isSlotOfKind(to, kind)) return { state, code: "unknown-house-slot" };
  if (placements[from] === null) return { state, code: "house-slot-empty" };
  if (placements[to] !== null) return { state, code: "house-slot-occupied" };
  const next = { ...placements, [to]: placements[from], [from]: null };
  return kind === "pet"
    ? { state: { ...state, petPlacements: next as Record<string, number | null> }, code: "house-move-ok" }
    : { state: { ...state, itemPlacements: next as Record<string, string | null> }, code: "house-move-ok" };
}

export function removeAsset(state: AppStateV1, kind: SlotKind, slot: string): HouseResult {
  const placements = kind === "pet" ? state.petPlacements : state.itemPlacements;
  if (!isSlotOfKind(slot, kind)) return { state, code: "unknown-house-slot" };
  if (placements[slot] === null) return { state, code: "house-slot-empty" };
  const next = { ...placements, [slot]: null };
  return kind === "pet"
    ? { state: { ...state, petPlacements: next as Record<string, number | null> }, code: "house-remove-ok" }
    : { state: { ...state, itemPlacements: next as Record<string, string | null> }, code: "house-remove-ok" };
}
