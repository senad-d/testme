export const CARE_ACTION_IDS = ["feed", "play", "groom"] as const;
export type CareActionId = (typeof CARE_ACTION_IDS)[number];

export const QUEST_IDS = ["daily-feed", "daily-play", "daily-groom"] as const;
export type QuestId = (typeof QUEST_IDS)[number];

export interface QuestDefinition {
  id: QuestId;
  title: string;
  instruction: string;
  actionId: CareActionId;
  rewardXp: 15;
  completedFeedback: string;
}

export const DAILY_QUESTS: readonly QuestDefinition[] = [
  {
    id: "daily-feed",
    title: "Vrijeme za obrok",
    instruction: "Nahrani odabranog ljubimca.",
    actionId: "feed",
    rewardXp: 15,
    completedFeedback: "Dnevni zadatak je dovršen: ljubimac je nahranjen.",
  },
  {
    id: "daily-play",
    title: "Vrijeme za igru",
    instruction: "Poigraj se s odabranim ljubimcem.",
    actionId: "play",
    rewardXp: 15,
    completedFeedback: "Dnevni zadatak je dovršen: ljubimac se razveselio igrom.",
  },
  {
    id: "daily-groom",
    title: "Sjajna dlaka i perje",
    instruction: "Očetkaj odabranog ljubimca.",
    actionId: "groom",
    rewardXp: 15,
    completedFeedback: "Dnevni zadatak je dovršen: ljubimac je uredan i sjajan.",
  },
] as const;

export function questById(id: unknown): QuestDefinition | null {
  return DAILY_QUESTS.find((quest) => quest.id === id) ?? null;
}

function seedNumber(seed: string): number {
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function selectDailyQuest(seed: string, utcWindow: number): QuestDefinition {
  return DAILY_QUESTS[(seedNumber(seed) + utcWindow) % DAILY_QUESTS.length];
}

export function acceptsQuestEvidence(
  questId: unknown,
  questWindow: number,
  petId: string,
  actionId: unknown,
  eventWindow: number,
  eventPetId: string,
): boolean {
  const quest = questById(questId);
  return Boolean(
    quest && CARE_ACTION_IDS.includes(actionId as CareActionId) &&
    quest.actionId === actionId && questWindow === eventWindow && petId === eventPetId,
  );
}
