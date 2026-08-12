import { describe, expect, it } from "vitest";
import { CARE_ACTION_IDS, DAILY_QUESTS, QUEST_IDS, acceptsQuestEvidence, questById, selectDailyQuest } from "./quests";

describe("daily care quests", () => {
  it("enumerates exactly the approved Croatian care-only content", () => {
    expect(DAILY_QUESTS.map(({ id, title, instruction, actionId, rewardXp }) => ({ id, title, instruction, actionId, rewardXp }))).toEqual([
      { id: "daily-feed", title: "Vrijeme za obrok", instruction: "Nahrani odabranog ljubimca.", actionId: "feed", rewardXp: 15 },
      { id: "daily-play", title: "Vrijeme za igru", instruction: "Poigraj se s odabranim ljubimcem.", actionId: "play", rewardXp: 15 },
      { id: "daily-groom", title: "Sjajna dlaka i perje", instruction: "Očetkaj odabranog ljubimca.", actionId: "groom", rewardXp: 15 },
    ]);
    expect(QUEST_IDS).toEqual(["daily-feed", "daily-play", "daily-groom"]);
    expect(CARE_ACTION_IDS).toEqual(["feed", "play", "groom"]);
    expect(questById("money")).toBeNull();
  });

  it("selects one stable quest from seed and UTC window", () => {
    expect(selectDailyQuest("lokalni-profil-v1", 20_000)).toBe(selectDailyQuest("lokalni-profil-v1", 20_000));
    const selected = Array.from({ length: 12 }, (_, day) => selectDailyQuest("lokalni-profil-v1", 20_000 + day).id);
    expect(new Set(selected)).toEqual(new Set(QUEST_IDS));
  });

  it("accepts only matching care evidence in the exact quest window", () => {
    for (const quest of DAILY_QUESTS) {
      expect(acceptsQuestEvidence(quest.id, 100, "cat", quest.actionId, 100, "cat")).toBe(true);
      expect(acceptsQuestEvidence(quest.id, 100, "cat", quest.actionId, 101, "cat")).toBe(false);
      expect(acceptsQuestEvidence(quest.id, 100, "cat", quest.actionId, 100, "dog")).toBe(false);
      for (const unsupported of ["saving", "purchase", "chore", "borrow", "repay", "parent", "unknown"]) {
        expect(acceptsQuestEvidence(quest.id, 100, "cat", unsupported, 100, "cat")).toBe(false);
      }
    }
  });
});
