import { CHORES, CONFIG, ITEMS, PETS, THEMES } from "../content/hr";

export const STORAGE_KEY = "croatian-money-pet-game:v1";

export const LOAD_CODES = [
  "load-empty",
  "load-malformed",
  "load-unknown-version",
  "load-invalid-state",
  "load-unavailable",
  "save-unavailable",
] as const;

export const RESULT_CODES = [
  "activity-empty",
  "chore-requests-empty",
  "pet-inventory-empty",
  "item-inventory-empty",
  "purchase-unavailable",
  "grant-ok",
  "save-ok",
  "withdraw-ok",
  "borrow-ok",
  "repay-ok",
  "chore-request-ok",
  "chore-approve-ok",
  "chore-return-ok",
  "pet-purchase-ok",
  "item-purchase-ok",
  "theme-select-ok",
  "house-place-ok",
  "house-move-ok",
  "house-remove-ok",
  "invalid-amount",
  "insufficient-wallet",
  "insufficient-savings",
  "debt-limit-exceeded",
  "repayment-exceeds-debt",
  "unknown-chore",
  "chore-already-pending",
  "unknown-chore-request",
  "chore-request-already-resolved",
  "unknown-shop-entry",
  "pet-already-owned",
  "unknown-theme",
  "unknown-house-slot",
  "house-slot-occupied",
  "house-slot-empty",
  "unknown-asset",
  "asset-not-owned",
  "asset-already-placed",
  "item-quantity-exhausted",
] as const;

export const ACTIVITY_CODES = [
  "coins-granted",
  "coins-saved",
  "savings-withdrawn",
  "coins-borrowed",
  "debt-repaid",
  "chore-reward-paid",
  "pet-purchased",
  "item-purchased",
] as const;

export type LoadCode = (typeof LOAD_CODES)[number];
export type ResultCode = (typeof RESULT_CODES)[number];
export type ActivityCode = (typeof ACTIVITY_CODES)[number];

export type ActivityEntry =
  | { code: "coins-granted" | "coins-saved" | "savings-withdrawn" | "coins-borrowed" | "debt-repaid"; amount: number }
  | { code: "chore-reward-paid" | "pet-purchased" | "item-purchased"; amount: number; name: string };

export type ChoreRequestStatus = "pending" | "approved" | "returned";
export interface ChoreRequest {
  id: number;
  choreId: string;
  status: ChoreRequestStatus;
}

export interface OwnedPet {
  id: number;
  catalogId: string;
}

export interface AppStateV1 {
  version: 1;
  wallet: number;
  savings: number;
  debt: number;
  choreRequests: ChoreRequest[];
  ownedPets: OwnedPet[];
  itemQuantities: Record<string, number>;
  selectedTheme: string;
  petPlacements: Record<string, number | null>;
  itemPlacements: Record<string, string | null>;
  nextId: number;
  activities: ActivityEntry[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const PET_SLOTS = ["pet-1", "pet-2", "pet-3", "pet-4"];
const ITEM_SLOTS = ["item-1", "item-2", "item-3", "item-4", "item-5", "item-6"];
const PET_IDS = new Set<string>(PETS.map(({ id }) => id));
const ITEM_IDS = new Set<string>(ITEMS.map(({ id }) => id));
const CHORE_IDS = new Set<string>(CHORES.map(({ id }) => id));
const THEME_IDS = new Set<string>(THEMES.map(({ id }) => id));
const CHORE_ACTIVITY_REWARDS = new Map<string, number>(CHORES.map(({ name, reward }) => [name, reward]));
const PET_ACTIVITY_PRICES = new Map<string, number>(PETS.map(({ name, price }) => [name, price]));
const ITEM_ACTIVITY_PRICES = new Map<string, number>(ITEMS.map(({ name, price }) => [name, price]));

export function initialState(): AppStateV1 {
  return {
    version: 1,
    wallet: 0,
    savings: 0,
    debt: 0,
    choreRequests: [],
    ownedPets: [],
    itemQuantities: {},
    selectedTheme: "sun",
    petPlacements: Object.fromEntries(PET_SLOTS.map((slot) => [slot, null])),
    itemPlacements: Object.fromEntries(ITEM_SLOTS.map((slot) => [slot, null])),
    nextId: 1,
    activities: [],
  };
}

function isWholeNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validActivity(value: unknown): value is ActivityEntry {
  if (!isRecord(value) || !ACTIVITY_CODES.includes(value.code as ActivityCode) || !isWholeNonNegative(value.amount) || value.amount === 0) return false;
  if (value.code === "chore-reward-paid") return typeof value.name === "string" && CHORE_ACTIVITY_REWARDS.get(value.name) === value.amount;
  if (value.code === "pet-purchased") return typeof value.name === "string" && PET_ACTIVITY_PRICES.get(value.name) === value.amount;
  if (value.code === "item-purchased") return typeof value.name === "string" && ITEM_ACTIVITY_PRICES.get(value.name) === value.amount;
  return !("name" in value);
}

export function isValidState(value: unknown): value is AppStateV1 {
  if (!isRecord(value) || value.version !== 1) return false;
  if (![value.wallet, value.savings, value.debt].every(isWholeNonNegative) || (value.debt as number) > CONFIG.debtLimit) return false;
  if (!Number.isSafeInteger(value.nextId) || (value.nextId as number) < 1) return false;
  if (!THEME_IDS.has(value.selectedTheme as string)) return false;
  if (!Array.isArray(value.activities) || !value.activities.every(validActivity)) return false;

  if (!Array.isArray(value.choreRequests) || !value.choreRequests.every((request) =>
    isRecord(request) && Number.isSafeInteger(request.id) && (request.id as number) > 0 &&
    CHORE_IDS.has(request.choreId as string) && ["pending", "approved", "returned"].includes(request.status as string)
  )) return false;
  const requestIds = new Set((value.choreRequests as ChoreRequest[]).map(({ id }) => id));
  if (requestIds.size !== value.choreRequests.length) return false;

  if (!Array.isArray(value.ownedPets) || value.ownedPets.length > PETS.length || !value.ownedPets.every((pet) =>
    isRecord(pet) && Number.isSafeInteger(pet.id) && (pet.id as number) > 0 && PET_IDS.has(pet.catalogId as string)
  )) return false;
  const pets = value.ownedPets as OwnedPet[];
  if (new Set(pets.map(({ id }) => id)).size !== pets.length || new Set(pets.map(({ catalogId }) => catalogId)).size !== pets.length) return false;
  const usedIds = [...(value.choreRequests as ChoreRequest[]).map(({ id }) => id), ...pets.map(({ id }) => id)];
  if (usedIds.some((id) => id >= (value.nextId as number))) return false;

  if (!isRecord(value.itemQuantities) || Object.entries(value.itemQuantities).some(([id, quantity]) => !ITEM_IDS.has(id) || !isWholeNonNegative(quantity))) return false;
  if (!isRecord(value.petPlacements) || Object.keys(value.petPlacements).length !== PET_SLOTS.length) return false;
  const petPlacements = value.petPlacements;
  if (!PET_SLOTS.every((slot) => slot in petPlacements && (petPlacements[slot] === null || Number.isInteger(petPlacements[slot])))) return false;
  const placedPets = PET_SLOTS.map((slot) => petPlacements[slot]).filter((id): id is number => typeof id === "number");
  if (new Set(placedPets).size !== placedPets.length || placedPets.some((id) => !pets.some((pet) => pet.id === id))) return false;

  if (!isRecord(value.itemPlacements) || Object.keys(value.itemPlacements).length !== ITEM_SLOTS.length) return false;
  const itemPlacements = value.itemPlacements;
  if (!ITEM_SLOTS.every((slot) => slot in itemPlacements && (itemPlacements[slot] === null || ITEM_IDS.has(itemPlacements[slot] as string)))) return false;
  const placedItems = ITEM_SLOTS.map((slot) => itemPlacements[slot]).filter((id): id is string => typeof id === "string");
  for (const id of ITEM_IDS) {
    if (placedItems.filter((placed) => placed === id).length > ((value.itemQuantities as Record<string, number>)[id] ?? 0)) return false;
  }
  return true;
}

export interface LoadResult {
  state: AppStateV1;
  code: LoadCode | null;
}

export function loadState(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: initialState(), code: "load-unavailable" };
  }
  if (raw === null) return { state: initialState(), code: "load-empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: initialState(), code: "load-malformed" };
  }
  if (!isRecord(parsed) || parsed.version !== 1) return { state: initialState(), code: "load-unknown-version" };
  if (!isValidState(parsed)) return { state: initialState(), code: "load-invalid-state" };
  return { state: parsed, code: null };
}

export function saveState(storage: StorageLike, state: AppStateV1): LoadCode | null {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return "save-unavailable";
  }
}
