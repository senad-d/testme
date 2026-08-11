import type { StorageLike } from "./store";

export const ADVENTURE_STORAGE_KEY = "croatian-money-pet-game:adventure:v1";
export const MAX_EVIDENCE_AMOUNT = 1_000_000;

export const MISSION_IDS = ["saving", "earning", "purchase", "loan"] as const;
export const ANSWER_IDS = [
  "saving-later", "saving-disappears",
  "earning-after-approval", "earning-before-work",
  "purchase-wallet", "purchase-savings",
  "loan-debt-changes", "loan-free-coins",
] as const;
export const BADGE_IDS = ["piggy-bank", "helping-paw", "smart-shopper", "debt-expert"] as const;
export const GLOSSARY_IDS = ["wallet", "savings", "earning", "price", "loan", "debt"] as const;
export const ADVENTURE_LOAD_CODES = [
  "adventure-load-empty", "adventure-load-malformed", "adventure-load-unknown-version",
  "adventure-load-invalid-state", "adventure-load-unavailable", "adventure-save-unavailable",
] as const;
export const ADVENTURE_RESULT_CODES = [
  "adventure-answer-correct", "adventure-answer-wrong", "adventure-answer-locked",
  "adventure-event-recorded", "adventure-event-rejected", "adventure-event-duplicate",
  "adventure-mission-completed", "adventure-journey-completed",
] as const;

export type MissionId = (typeof MISSION_IDS)[number];
export type AnswerId = (typeof ANSWER_IDS)[number];
export type BadgeId = (typeof BADGE_IDS)[number];
export type GlossaryId = (typeof GLOSSARY_IDS)[number];
export type AdventureLoadCode = (typeof ADVENTURE_LOAD_CODES)[number];
export type AdventureResultCode = (typeof ADVENTURE_RESULT_CODES)[number];

export const CORRECT_ANSWERS: Record<MissionId, AnswerId> = {
  saving: "saving-later",
  earning: "earning-after-approval",
  purchase: "purchase-wallet",
  loan: "loan-debt-changes",
};

export const MISSION_BADGES: Record<MissionId, BadgeId> = {
  saving: "piggy-bank",
  earning: "helping-paw",
  purchase: "smart-shopper",
  loan: "debt-expert",
};

interface SavingEvidence { amount: number; eventSequence: number }
interface EarningEvidence { rewardAmount: number; eventSequence: number }
interface PurchaseEvidence { price: number; eventSequence: number }
interface LoanEvidence { borrowedAmount: number; repaidAmount: number; eventSequences: number[] }

export interface AdventureEvidence {
  saving?: SavingEvidence;
  earning?: EarningEvidence;
  purchase?: PurchaseEvidence;
  loan?: LoanEvidence;
}

export interface AdventureStateV1 {
  version: 1;
  activeMission: MissionId | null;
  correctAnswers: MissionId[];
  evidence: AdventureEvidence;
  completedMissions: MissionId[];
  stars: number;
  badges: BadgeId[];
}

export type AdventureEvent =
  | { missionId: "saving"; kind: "save"; amount: number; eventSequence: number; accepted: boolean }
  | { missionId: "earning"; kind: "chore-approval"; amount: number; eventSequence: number; accepted: boolean }
  | { missionId: "purchase"; kind: "purchase"; amount: number; eventSequence: number; accepted: boolean }
  | { missionId: "loan"; kind: "borrow" | "repay"; amount: number; eventSequence: number; accepted: boolean };

export interface AdventureChange {
  state: AdventureStateV1;
  code: AdventureResultCode;
}

export interface AdventureLoadResult {
  state: AdventureStateV1;
  code: AdventureLoadCode | null;
}

export function initialAdventureState(): AdventureStateV1 {
  return { version: 1, activeMission: "saving", correctAnswers: [], evidence: {}, completedMissions: [], stars: 0, badges: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedAmount(value: unknown, allowZero = false): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1) && value <= MAX_EVIDENCE_AMOUNT;
}

function isSequence(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validEvidenceFor(mission: MissionId, value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (mission === "saving") return hasOnlyKeys(value, ["amount", "eventSequence"]) && isBoundedAmount(value.amount) && value.amount >= 5 && isSequence(value.eventSequence);
  if (mission === "earning") return hasOnlyKeys(value, ["rewardAmount", "eventSequence"]) && isBoundedAmount(value.rewardAmount) && isSequence(value.eventSequence);
  if (mission === "purchase") return hasOnlyKeys(value, ["price", "eventSequence"]) && isBoundedAmount(value.price) && isSequence(value.eventSequence);
  if (!hasOnlyKeys(value, ["borrowedAmount", "repaidAmount", "eventSequences"]) ||
      !isBoundedAmount(value.borrowedAmount) || !isBoundedAmount(value.repaidAmount, true) ||
      !Array.isArray(value.eventSequences) || !value.eventSequences.every(isSequence) ||
      !value.eventSequences.every((sequence, index, all) => index === 0 || sequence > all[index - 1])) return false;
  return value.repaidAmount === 0 ? value.eventSequences.length === 1 : value.eventSequences.length >= 2;
}

function missionEvidenceComplete(state: AdventureStateV1, mission: MissionId): boolean {
  const evidence = state.evidence[mission];
  if (!evidence) return false;
  if (mission === "loan") return (evidence as LoanEvidence).repaidAmount >= (evidence as LoanEvidence).borrowedAmount;
  return true;
}

export function isValidAdventureState(value: unknown): value is AdventureStateV1 {
  if (!isRecord(value) || value.version !== 1 || !hasOnlyKeys(value, ["version", "activeMission", "correctAnswers", "evidence", "completedMissions", "stars", "badges"])) return false;
  if (!Array.isArray(value.completedMissions) || !Array.isArray(value.correctAnswers) || !Array.isArray(value.badges) || !isRecord(value.evidence)) return false;
  const completed = value.completedMissions as unknown[];
  const answers = value.correctAnswers as unknown[];
  const badges = value.badges as unknown[];
  if (completed.length > MISSION_IDS.length || completed.some((id, index) => id !== MISSION_IDS[index])) return false;
  const expectedActive = completed.length === MISSION_IDS.length ? null : MISSION_IDS[completed.length];
  if (value.activeMission !== expectedActive || !Number.isSafeInteger(value.stars) || value.stars !== completed.length) return false;

  const expectedBadges = completed.map((id) => MISSION_BADGES[id as MissionId]);
  if (badges.length !== expectedBadges.length || badges.some((badge, index) => badge !== expectedBadges[index])) return false;

  const maximumAnswerCount = completed.length + (expectedActive === null ? 0 : 1);
  if ((answers.length !== completed.length && answers.length !== maximumAnswerCount) ||
      answers.some((id, index) => id !== MISSION_IDS[index])) return false;

  const allowedMissions = new Set<MissionId>([...(completed as MissionId[]), ...(expectedActive ? [expectedActive] : [])]);
  const evidenceEntries = Object.entries(value.evidence);
  if (evidenceEntries.some(([id, evidence]) => !MISSION_IDS.includes(id as MissionId) || !allowedMissions.has(id as MissionId) || !validEvidenceFor(id as MissionId, evidence))) return false;

  const state = value as unknown as AdventureStateV1;
  for (const mission of completed as MissionId[]) {
    if (!missionEvidenceComplete(state, mission)) return false;
  }
  if (expectedActive && answers.includes(expectedActive) && missionEvidenceComplete(state, expectedActive)) return false;

  const sequenceValues = MISSION_IDS.flatMap((mission) => {
    const evidence = state.evidence[mission];
    if (!evidence) return [];
    return mission === "loan" ? (evidence as LoanEvidence).eventSequences : [(evidence as SavingEvidence).eventSequence];
  });
  return sequenceValues.every((sequence, index) => index === 0 || sequence > sequenceValues[index - 1]);
}

export function loadAdventureState(storage: StorageLike): AdventureLoadResult {
  let raw: string | null;
  try { raw = storage.getItem(ADVENTURE_STORAGE_KEY); }
  catch { return { state: initialAdventureState(), code: "adventure-load-unavailable" }; }
  if (raw === null) return { state: initialAdventureState(), code: "adventure-load-empty" };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { state: initialAdventureState(), code: "adventure-load-malformed" }; }
  if (!isRecord(parsed) || parsed.version !== 1) return { state: initialAdventureState(), code: "adventure-load-unknown-version" };
  if (!isValidAdventureState(parsed)) return { state: initialAdventureState(), code: "adventure-load-invalid-state" };
  return { state: parsed, code: null };
}

export function saveAdventureState(storage: StorageLike, state: AdventureStateV1): AdventureLoadCode | null {
  try { storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(state)); return null; }
  catch { return "adventure-save-unavailable"; }
}

function completeIfReady(state: AdventureStateV1): AdventureChange {
  const mission = state.activeMission;
  if (!mission || !state.correctAnswers.includes(mission) || !missionEvidenceComplete(state, mission)) return { state, code: "adventure-event-recorded" };
  const completedMissions = [...state.completedMissions, mission];
  const next: AdventureStateV1 = {
    ...state,
    completedMissions,
    activeMission: completedMissions.length === MISSION_IDS.length ? null : MISSION_IDS[completedMissions.length],
    stars: completedMissions.length,
    badges: completedMissions.map((id) => MISSION_BADGES[id]),
  };
  return { state: next, code: next.activeMission ? "adventure-mission-completed" : "adventure-journey-completed" };
}

export function answerMission(state: AdventureStateV1, missionId: MissionId, answerId: AnswerId): AdventureChange {
  if (!isValidAdventureState(state) || state.activeMission !== missionId) return { state, code: "adventure-answer-locked" };
  if (CORRECT_ANSWERS[missionId] !== answerId) return { state, code: "adventure-answer-wrong" };
  if (state.correctAnswers.includes(missionId)) return { state, code: "adventure-event-duplicate" };
  const answered: AdventureStateV1 = { ...state, correctAnswers: [...state.correctAnswers, missionId] };
  const completed = completeIfReady(answered);
  if (!isValidAdventureState(completed.state)) return { state, code: "adventure-answer-locked" };
  return completed.code === "adventure-event-recorded" ? { state: completed.state, code: "adventure-answer-correct" } : completed;
}

function knownSequences(state: AdventureStateV1): number[] {
  return MISSION_IDS.flatMap((mission) => {
    const evidence = state.evidence[mission];
    if (!evidence) return [];
    return mission === "loan" ? (evidence as LoanEvidence).eventSequences : [(evidence as SavingEvidence).eventSequence];
  });
}

export function nextAdventureEventSequence(state: AdventureStateV1): number | null {
  const sequences = knownSequences(state);
  if (sequences.some((sequence) => !isSequence(sequence))) return null;
  const maximum = sequences.length === 0 ? 0 : Math.max(...sequences);
  return maximum < Number.MAX_SAFE_INTEGER ? maximum + 1 : null;
}

function eventMatchesMission(event: AdventureEvent): boolean {
  return (event.missionId === "saving" && event.kind === "save") ||
    (event.missionId === "earning" && event.kind === "chore-approval") ||
    (event.missionId === "purchase" && event.kind === "purchase") ||
    (event.missionId === "loan" && (event.kind === "borrow" || event.kind === "repay"));
}

export function recordAdventureEvent(state: AdventureStateV1, event: AdventureEvent): AdventureChange {
  if (!isValidAdventureState(state) || !event.accepted || state.activeMission !== event.missionId ||
      !eventMatchesMission(event) || !isSequence(event.eventSequence) || !isBoundedAmount(event.amount)) {
    return { state, code: "adventure-event-rejected" };
  }
  const sequences = knownSequences(state);
  if (sequences.includes(event.eventSequence)) return { state, code: "adventure-event-duplicate" };
  if (sequences.length > 0 && event.eventSequence <= sequences[sequences.length - 1]) return { state, code: "adventure-event-rejected" };

  let evidence: AdventureEvidence;
  if (event.kind === "save") {
    if (event.amount < 5 || state.evidence.saving) return { state, code: state.evidence.saving ? "adventure-event-duplicate" : "adventure-event-rejected" };
    evidence = { ...state.evidence, saving: { amount: event.amount, eventSequence: event.eventSequence } };
  } else if (event.kind === "chore-approval") {
    if (state.evidence.earning) return { state, code: "adventure-event-duplicate" };
    evidence = { ...state.evidence, earning: { rewardAmount: event.amount, eventSequence: event.eventSequence } };
  } else if (event.kind === "purchase") {
    if (state.evidence.purchase) return { state, code: "adventure-event-duplicate" };
    evidence = { ...state.evidence, purchase: { price: event.amount, eventSequence: event.eventSequence } };
  } else {
    const current = state.evidence.loan;
    if (event.kind === "borrow") {
      if (current) return { state, code: "adventure-event-duplicate" };
      evidence = { ...state.evidence, loan: { borrowedAmount: event.amount, repaidAmount: 0, eventSequences: [event.eventSequence] } };
    } else {
      if (!current || current.repaidAmount + event.amount > MAX_EVIDENCE_AMOUNT) return { state, code: "adventure-event-rejected" };
      evidence = { ...state.evidence, loan: { ...current, repaidAmount: current.repaidAmount + event.amount, eventSequences: [...current.eventSequences, event.eventSequence] } };
    }
  }

  const changed = completeIfReady({ ...state, evidence });
  return isValidAdventureState(changed.state) ? changed : { state, code: "adventure-event-rejected" };
}
