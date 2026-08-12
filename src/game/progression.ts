import { PETS } from "../content/hr";
import { CARE_ACTION_IDS, QUEST_IDS, acceptsQuestEvidence, questById, selectDailyQuest, type CareActionId, type QuestId } from "./quests";
import type { StorageLike } from "./store";

export const PROGRESSION_KEY = "croatian-money-pet-game:progression:v1";
export const CARE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const MAX_XP = 1_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECEIPTS = 2_048;
const PROFILE_SEED = "lokalni-profil-v1";
const KNOWN_PET_IDS = new Set<string>(PETS.map(({ id }) => id));
const BLOCKED_STATES = new WeakSet<object>();
function knownOwnedPetIds(ids: readonly string[]): string[] { return [...new Set(ids.filter((id) => KNOWN_PET_IDS.has(id)))]; }

export const COSMETIC_TITLES = [
  { id: "caring-paw", level: 2, name: "Brižna šapica" },
  { id: "happy-friend", level: 4, name: "Veseli prijatelj" },
  { id: "pet-guardian", level: 6, name: "Čuvar ljubimaca" },
  { id: "care-master", level: 8, name: "Majstor njege" },
  { id: "pet-star", level: 10, name: "Zvijezda ljubimaca" },
] as const;
export type CosmeticTitleId = (typeof COSMETIC_TITLES)[number]["id"];

export interface PetProgressV1 {
  petId: string;
  fullness: number;
  happiness: number;
  cleanliness: number;
  lastCareAt: Record<CareActionId, number | null>;
}

export interface QuestEvidenceV1 {
  questId: QuestId;
  window: number;
  petId: string;
  actionId: CareActionId;
  eventId: string;
  completedAt: number;
  awardedXp: number;
  cosmeticTitleIds: CosmeticTitleId[];
}

export interface CurrentQuestV1 {
  id: QuestId;
  window: number;
  petId: string;
  completed: boolean;
  evidence: QuestEvidenceV1 | null;
}

export interface CareReceiptV1 {
  eventId: string;
  window: number;
  petId: string;
  actionId: CareActionId;
  acceptedAt: number;
  needAfter: number;
  actionXp: number;
  questXp: number;
  totalXp: number;
  level: number;
  cosmeticTitleIds: CosmeticTitleId[];
  questCompleted: boolean;
}

export interface ProgressionStateV1 {
  version: 1;
  profileSeed: string;
  lastWindow: number;
  totalXp: number;
  cosmeticTitleIds: CosmeticTitleId[];
  pets: PetProgressV1[];
  currentQuest: CurrentQuestV1 | null;
  receipts: CareReceiptV1[];
}

export type ProgressionLoadCode = "progression-load-empty" | "progression-load-malformed" | "progression-load-unknown-version" | "progression-load-invalid" | "progression-load-unavailable";
export type CareResultCode = "care-accepted" | "care-duplicate" | "care-invalid-event" | "care-unknown-pet" | "care-cooldown" | "care-need-full" | "care-storage-unavailable";
export interface ProgressionLoadResult { state: ProgressionStateV1; code: ProgressionLoadCode | null }
export interface CareResult { state: ProgressionStateV1; code: CareResultCode; receipt: CareReceiptV1 | null }

function utcWindow(timestamp: number): number {
  return Math.floor(timestamp / DAY_MS);
}

function initialPet(petId: string): PetProgressV1 {
  return { petId, fullness: 70, happiness: 70, cleanliness: 70, lastCareAt: { feed: null, play: null, groom: null } };
}

function initialState(ownedPetIds: readonly string[], now: number): ProgressionStateV1 {
  const window = utcWindow(now);
  const pets = knownOwnedPetIds(ownedPetIds).map(initialPet);
  const definition = pets.length ? selectDailyQuest(PROFILE_SEED, window) : null;
  return {
    version: 1,
    profileSeed: PROFILE_SEED,
    lastWindow: window,
    totalXp: 0,
    cosmeticTitleIds: [],
    pets,
    currentQuest: definition ? { id: definition.id, window, petId: pets[0].petId, completed: false, evidence: null } : null,
    receipts: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function whole(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}
function timestamp(value: unknown): value is number { return whole(value, 0, 8_640_000_000_000_000); }
function eventId(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value); }
function validTitles(value: unknown): value is CosmeticTitleId[] {
  return Array.isArray(value) && value.length <= COSMETIC_TITLES.length && new Set(value).size === value.length && value.every((id) => COSMETIC_TITLES.some((title) => title.id === id));
}
function validPet(value: unknown, owned: ReadonlySet<string>): value is PetProgressV1 {
  if (!isRecord(value) || !exactKeys(value, ["petId", "fullness", "happiness", "cleanliness", "lastCareAt"]) || typeof value.petId !== "string" || !owned.has(value.petId)) return false;
  if (![value.fullness, value.happiness, value.cleanliness].every((need) => whole(need, 40, 100))) return false;
  if (!isRecord(value.lastCareAt) || !exactKeys(value.lastCareAt, CARE_ACTION_IDS)) return false;
  const careTimes = value.lastCareAt;
  return CARE_ACTION_IDS.every((action) => careTimes[action] === null || timestamp(careTimes[action]));
}
function validEvidence(value: unknown, quest: CurrentQuestV1): value is QuestEvidenceV1 {
  if (!isRecord(value) || !exactKeys(value, ["questId", "window", "petId", "actionId", "eventId", "completedAt", "awardedXp", "cosmeticTitleIds"])) return false;
  return value.questId === quest.id && value.window === quest.window && value.petId === quest.petId && questById(quest.id)?.actionId === value.actionId && CARE_ACTION_IDS.includes(value.actionId as CareActionId) &&
    eventId(value.eventId) && timestamp(value.completedAt) && whole(value.awardedXp, 0, 15) && validTitles(value.cosmeticTitleIds);
}
function validQuest(value: unknown, owned: ReadonlySet<string>, lastWindow: number): value is CurrentQuestV1 {
  if (!isRecord(value) || !exactKeys(value, ["id", "window", "petId", "completed", "evidence"]) || !QUEST_IDS.includes(value.id as QuestId) || value.window !== lastWindow || typeof value.petId !== "string" || !owned.has(value.petId) || typeof value.completed !== "boolean") return false;
  const quest = value as unknown as CurrentQuestV1;
  return value.completed ? validEvidence(value.evidence, quest) : value.evidence === null;
}
function validReceipt(value: unknown, owned: ReadonlySet<string>, lastWindow: number): value is CareReceiptV1 {
  if (!isRecord(value) || !exactKeys(value, ["eventId", "window", "petId", "actionId", "acceptedAt", "needAfter", "actionXp", "questXp", "totalXp", "level", "cosmeticTitleIds", "questCompleted"])) return false;
  return eventId(value.eventId) && whole(value.window, Math.max(0, lastWindow - 31), lastWindow) && typeof value.petId === "string" && owned.has(value.petId) && CARE_ACTION_IDS.includes(value.actionId as CareActionId) && timestamp(value.acceptedAt) && whole(value.needAfter, 40, 100) && whole(value.actionXp, 0, 5) && whole(value.questXp, 0, 15) && whole(value.totalXp, 0, MAX_XP) && whole(value.level, 1, 10) && validTitles(value.cosmeticTitleIds) && typeof value.questCompleted === "boolean";
}

export function isValidProgression(value: unknown, ownedPetIds: readonly string[]): value is ProgressionStateV1 {
  const owned = new Set(knownOwnedPetIds(ownedPetIds));
  if (!isRecord(value) || !exactKeys(value, ["version", "profileSeed", "lastWindow", "totalXp", "cosmeticTitleIds", "pets", "currentQuest", "receipts"]) || value.version !== 1 || typeof value.profileSeed !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(value.profileSeed) || !whole(value.lastWindow) || !whole(value.totalXp, 0, MAX_XP) || !validTitles(value.cosmeticTitleIds)) return false;
  if (!Array.isArray(value.pets) || value.pets.length > owned.size || !value.pets.every((pet) => validPet(pet, owned))) return false;
  const pets = value.pets as PetProgressV1[];
  if (new Set(pets.map(({ petId }) => petId)).size !== pets.length) return false;
  if (value.currentQuest !== null && !validQuest(value.currentQuest, owned, value.lastWindow as number)) return false;
  if (!Array.isArray(value.receipts) || value.receipts.length > MAX_RECEIPTS || !value.receipts.every((receipt) => validReceipt(receipt, owned, value.lastWindow as number))) return false;
  const receipts = value.receipts as CareReceiptV1[];
  if (new Set(receipts.map(({ eventId: id }) => id)).size !== receipts.length) return false;
  if (value.currentQuest?.evidence) {
    const evidence = value.currentQuest.evidence;
    const matching = receipts.find((receipt) => receipt.eventId === evidence.eventId);
    if (!matching || matching.window !== evidence.window || matching.petId !== evidence.petId || matching.actionId !== evidence.actionId || matching.acceptedAt !== evidence.completedAt || matching.questXp !== evidence.awardedXp || !matching.questCompleted) return false;
  }
  return true;
}

function clone(state: ProgressionStateV1): ProgressionStateV1 {
  return structuredClone(state);
}

export function prepareProgression(state: ProgressionStateV1, ownedPetIds: readonly string[], now: number): ProgressionStateV1 {
  const next = clone(state);
  const currentWindow = utcWindow(now);
  for (const petId of knownOwnedPetIds(ownedPetIds)) if (!next.pets.some((pet) => pet.petId === petId)) next.pets.push(initialPet(petId));
  if (currentWindow > next.lastWindow) {
    const elapsed = Math.min(7, currentWindow - next.lastWindow);
    for (const pet of next.pets) {
      pet.fullness = Math.max(40, pet.fullness - elapsed * 10);
      pet.happiness = Math.max(40, pet.happiness - elapsed * 10);
      pet.cleanliness = Math.max(40, pet.cleanliness - elapsed * 10);
    }
    next.lastWindow = currentWindow;
    const definition = next.pets.length ? selectDailyQuest(next.profileSeed, currentWindow) : null;
    next.currentQuest = definition ? { id: definition.id, window: currentWindow, petId: next.pets[0].petId, completed: false, evidence: null } : null;
    next.receipts = next.receipts.filter((receipt) => receipt.window >= currentWindow - 31).slice(-MAX_RECEIPTS);
  } else if (!next.currentQuest && next.pets.length) {
    const definition = selectDailyQuest(next.profileSeed, next.lastWindow);
    next.currentQuest = { id: definition.id, window: next.lastWindow, petId: next.pets[0].petId, completed: false, evidence: null };
  }
  if (BLOCKED_STATES.has(state)) BLOCKED_STATES.add(next);
  return next;
}

function blockedLoad(ownedPetIds: readonly string[], now: number, code: Exclude<ProgressionLoadCode, "progression-load-empty">): ProgressionLoadResult {
  const state = initialState(ownedPetIds, now);
  BLOCKED_STATES.add(state);
  return { state, code };
}

export function loadProgression(storage: StorageLike, ownedPetIds: readonly string[], now = Date.now()): ProgressionLoadResult {
  let raw: string | null;
  try { raw = storage.getItem(PROGRESSION_KEY); }
  catch { return blockedLoad(ownedPetIds, now, "progression-load-unavailable"); }
  if (raw === null) return { state: initialState(ownedPetIds, now), code: "progression-load-empty" };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return blockedLoad(ownedPetIds, now, "progression-load-malformed"); }
  if (!isRecord(parsed) || parsed.version !== 1) return blockedLoad(ownedPetIds, now, "progression-load-unknown-version");
  if (!isValidProgression(parsed, ownedPetIds)) return blockedLoad(ownedPetIds, now, "progression-load-invalid");
  return { state: prepareProgression(parsed, ownedPetIds, now), code: null };
}

export function progressionLevel(totalXp: number): number { return Math.min(10, 1 + Math.floor(totalXp / 100)); }
function titlesForLevel(level: number): CosmeticTitleId[] { return COSMETIC_TITLES.filter((title) => level >= title.level).map((title) => title.id); }
function needKey(actionId: CareActionId): "fullness" | "happiness" | "cleanliness" { return actionId === "feed" ? "fullness" : actionId === "play" ? "happiness" : "cleanliness"; }
function increase(actionId: CareActionId): number { return actionId === "feed" ? 25 : 20; }

export function performCare(
  storage: StorageLike,
  source: ProgressionStateV1,
  ownedPetIds: readonly string[],
  input: { eventId: string; petId: string; actionId: CareActionId; now: number },
): CareResult {
  if (!eventId(input.eventId)) return { state: source, code: "care-invalid-event", receipt: null };
  if (BLOCKED_STATES.has(source)) return { state: source, code: "care-storage-unavailable", receipt: null };
  const existing = source.receipts.find((receipt) => receipt.eventId === input.eventId);
  if (existing) return { state: source, code: "care-duplicate", receipt: existing };
  const state = prepareProgression(source, ownedPetIds, input.now);
  const pet = state.pets.find(({ petId }) => petId === input.petId);
  if (!pet || !ownedPetIds.includes(input.petId) || !CARE_ACTION_IDS.includes(input.actionId)) return { state: source, code: "care-unknown-pet", receipt: null };
  const previous = pet.lastCareAt[input.actionId];
  if (previous !== null && input.now - previous < CARE_COOLDOWN_MS) return { state: source, code: "care-cooldown", receipt: null };
  const key = needKey(input.actionId);
  if (pet[key] >= 100) return { state: source, code: "care-need-full", receipt: null };

  const candidate = clone(state);
  const candidatePet = candidate.pets.find(({ petId }) => petId === input.petId)!;
  candidatePet[key] = Math.min(100, candidatePet[key] + increase(input.actionId));
  candidatePet.lastCareAt[input.actionId] = input.now;
  const completesQuest = Boolean(candidate.currentQuest && !candidate.currentQuest.completed && acceptsQuestEvidence(candidate.currentQuest.id, candidate.currentQuest.window, candidate.currentQuest.petId, input.actionId, candidate.lastWindow, input.petId));
  const oldXp = candidate.totalXp;
  candidate.totalXp = Math.min(MAX_XP, oldXp + 5 + (completesQuest ? (questById(candidate.currentQuest?.id)?.rewardXp ?? 0) : 0));
  const actionXp = Math.min(5, candidate.totalXp - oldXp);
  const questXp = Math.max(0, candidate.totalXp - oldXp - actionXp);
  const level = progressionLevel(candidate.totalXp);
  candidate.cosmeticTitleIds = titlesForLevel(level);
  const receipt: CareReceiptV1 = { eventId: input.eventId, window: candidate.lastWindow, petId: input.petId, actionId: input.actionId, acceptedAt: input.now, needAfter: candidatePet[key], actionXp, questXp, totalXp: candidate.totalXp, level, cosmeticTitleIds: [...candidate.cosmeticTitleIds], questCompleted: completesQuest };
  candidate.receipts.push(receipt);
  if (completesQuest && candidate.currentQuest) {
    candidate.currentQuest.completed = true;
    candidate.currentQuest.evidence = { questId: candidate.currentQuest.id, window: candidate.currentQuest.window, petId: input.petId, actionId: input.actionId, eventId: input.eventId, completedAt: input.now, awardedXp: questXp, cosmeticTitleIds: [...candidate.cosmeticTitleIds] };
  }
  candidate.receipts = candidate.receipts.filter((entry) => entry.window >= candidate.lastWindow - 31).slice(-MAX_RECEIPTS);
  const serialized = JSON.stringify(candidate);
  try {
    storage.setItem(PROGRESSION_KEY, serialized);
    return { state: candidate, code: "care-accepted", receipt };
  } catch {
    try {
      const persisted = storage.getItem(PROGRESSION_KEY);
      if (persisted === serialized) return { state: candidate, code: "care-accepted", receipt };
    } catch { /* fail closed */ }
    return { state: source, code: "care-storage-unavailable", receipt: null };
  }
}
