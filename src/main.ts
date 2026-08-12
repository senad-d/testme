import "./styles.css";
import { ACTIVITY_CODES, LOAD_CODES, RESULT_CODES, loadState, saveState, type AppStateV1, type ResultCode, type StorageLike } from "./game/store";
import { ADVENTURE_BADGES, ADVENTURE_MESSAGES, ADVENTURE_MISSIONS, ADVENTURE_PRACTICE, CHORES, CONFIG, EARNINGS_CHALLENGE, HR, ITEMS, LOAD_MESSAGES, MONEY_SCHOOL, PARENT_ACCESS_MESSAGES, PETS, RESULT_MESSAGES, THEMES, activityMessage, adventureMessageForCode, houseAreaContent, messageForCode } from "./content/hr";
import { inspectParentAccess, setupParentAccess, unlockParentAccess } from "./game/parent-access";
import { CARE_ACTION_IDS, questById, type CareActionId } from "./game/quests";
import { loadProgression, performCare, prepareProgression, progressionLevel, type CareResultCode, type ProgressionStateV1 } from "./game/progression";
import { borrowCoins, grantCoins, repayDebt, saveCoins, withdrawSavings } from "./game/money";
import { approveChore, requestChore, returnChore } from "./game/chores";
import { buyItem, buyPet } from "./game/shop";
import { HOUSE_AREAS, moveAsset, placeAsset, removeAsset, selectTheme, type HouseSlot, type SlotKind } from "./game/house";
import { ADVENTURE_LOAD_CODES, ADVENTURE_RESULT_CODES, ANSWER_IDS, BADGE_IDS, CORRECT_ANSWERS, GLOSSARY_IDS, MISSION_IDS, answerMission, loadAdventureState, nextAdventureEventSequence, recordAdventureEvent, saveAdventureState, type AdventureEvent, type AdventureResultCode, type AdventureStateV1, type GlossaryId, type MissionId } from "./game/adventure";

export { ACTIVITY_CODES, LOAD_CODES, RESULT_CODES, ADVENTURE_LOAD_CODES, ADVENTURE_RESULT_CODES, MISSION_IDS, ANSWER_IDS, BADGE_IDS, GLOSSARY_IDS, activityMessage, adventureMessageForCode, messageForCode };

type View = "adventure" | "care" | "money" | "chores" | "shop" | "house" | "parent";
const childViews: Array<{ id: Exclude<View, "parent">; label: string; icon: string }> = [
  { id: "adventure", label: HR.navAdventure, icon: "🗺️" },
  { id: "care", label: HR.navCare, icon: "🐾" },
  { id: "money", label: HR.navMoney, icon: "🐷" },
  { id: "chores", label: HR.navChores, icon: "🌻" },
  { id: "shop", label: HR.navShop, icon: "🎪" },
  { id: "house", label: HR.navHouse, icon: "🏡" },
];

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function balanceCard(label: string, amount: number, id: string): string {
  return `<article class="balance-card" aria-describedby="balance-help"><h2>${escapeHtml(label)}</h2><strong id="${id}" role="meter" aria-valuemin="0" aria-valuemax="${Math.max(CONFIG.debtLimit, amount)}" aria-valuenow="${amount}" aria-label="${escapeHtml(HR.balanceAccessible(label, amount))}" aria-valuetext="${escapeHtml(HR.balanceValue(amount))}">${escapeHtml(HR.balanceValue(amount))}</strong></article>`;
}

function amountForm(action: string, button: string, helpId?: string, invalid = false): string {
  const describedBy = helpId ? ` aria-describedby="${helpId}"` : "";
  return `<form class="amount-form" data-form="${action}" novalidate>
    <label for="amount-${action}">${escapeHtml(HR.amountLabel)}</label>
    <input id="amount-${action}" name="amount" type="number" inputmode="numeric" min="1" step="1" placeholder="${escapeHtml(HR.amountPlaceholder)}"${describedBy}${invalid ? " aria-invalid=\"true\"" : ""} />
    <div class="quick-amounts" role="group" aria-label="${escapeHtml(HR.quickAmountsLabel)}">${CONFIG.quickAmounts.map((amount) => `<button type="button" data-quick="${amount}" aria-label="${escapeHtml(HR.balanceValue(amount))}">${escapeHtml(HR.balanceValue(amount))}</button>`).join("")}</div>
    <button class="primary" type="submit">${escapeHtml(button)}</button>
  </form>`;
}

function statusForChore(state: AppStateV1, choreId: string): string {
  const latest = [...state.choreRequests].reverse().find((request) => request.choreId === choreId);
  if (!latest || latest.status === "returned") return HR.statusTodo;
  return latest.status === "pending" ? HR.statusPending : HR.statusApproved;
}

function missionTarget(mission: MissionId): Exclude<View, "adventure" | "care" | "house" | "parent"> {
  if (mission === "earning") return "chores";
  if (mission === "purchase") return "shop";
  return "money";
}

function adventureScene(view: Exclude<View, "parent">): string {
  const symbol: Record<Exclude<View, "parent">, string> = { adventure: "🗺️", care: "🐾", money: "🐷", chores: "🌻", shop: "🎪", house: "🏡" };
  return `<div class="adventure-scene scene-${view}" aria-hidden="true"><span class="scene-sun">☀️</span><span class="scene-cloud">☁️</span><span class="scene-guide">🐶</span><span class="scene-symbol">${symbol[view]}</span></div>`;
}

function actionStepDone(adventure: AdventureStateV1, mission: MissionId, index: number): boolean {
  if (mission === "loan") {
    const evidence = adventure.evidence.loan;
    return index === 0 ? Boolean(evidence) : Boolean(evidence && evidence.repaidAmount >= evidence.borrowedAmount);
  }
  return Boolean(adventure.evidence[mission]);
}

function currentMissionPanel(adventure: AdventureStateV1): string {
  if (!adventure.activeMission) return `<aside class="mission-panel journey-done"><strong>${escapeHtml(HR.journeyCompleted)}</strong><button data-nav="adventure">${escapeHtml(HR.returnAdventure)}</button></aside>`;
  const content = ADVENTURE_MISSIONS[adventure.activeMission];
  return `<aside class="mission-panel"><div aria-hidden="true" class="guide-mini">🐶⭐</div><div><strong>${escapeHtml(HR.currentMissionHeading)}</strong><h2>${escapeHtml(content.title)}</h2><p>${escapeHtml(content.instruction)}</p></div><button data-nav="adventure">${escapeHtml(HR.returnAdventure)}</button></aside>`;
}

function renderPractice(cardIndex: number, practiceFeedback: string, correctCards: ReadonlySet<GlossaryId>): string {
  const card = ADVENTURE_PRACTICE[cardIndex];
  const completed = correctCards.has(card.id);
  return `<section class="panel practice-deck" aria-labelledby="practice-heading">
    <h2 id="practice-heading">${escapeHtml(HR.practiceHeading)}</h2>
    <p id="practice-intro">${escapeHtml(HR.practiceIntro)}</p>
    <p><strong data-practice-progress>${escapeHtml(HR.practiceProgress(cardIndex + 1, ADVENTURE_PRACTICE.length))}</strong> — <span data-practice-score>${escapeHtml(HR.practiceScore(correctCards.size, ADVENTURE_PRACTICE.length))}</span></p>
    <article class="question-card" data-practice-card="${card.id}" aria-labelledby="practice-card-title" aria-describedby="practice-intro practice-card-status">
      <p class="eyebrow">${escapeHtml(HR.practiceCardLabel)}</p>
      <h3 id="practice-card-title">${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.scenario)}</p>
      <div class="answer-grid">${card.choices.map((choice) => `<button type="button" data-action="answer-practice" data-card="${card.id}" data-answer="${choice.id}" aria-label="${escapeHtml(HR.practiceAnswerAccessible(card.title, choice.label))}">${escapeHtml(choice.label)}</button>`).join("")}</div>
      <p id="practice-card-status">${escapeHtml(completed ? HR.practiceCompleted : HR.practicePending)}</p>
      <p data-practice-feedback role="status" aria-live="polite" aria-atomic="true">${escapeHtml(practiceFeedback)}</p>
    </article>
    <div class="slot-actions" role="group" aria-label="${escapeHtml(HR.practiceNavigationLabel)}">
      <button type="button" data-action="previous-practice" ${cardIndex === 0 ? "disabled" : ""}>${escapeHtml(HR.practicePrevious)}</button>
      <button type="button" data-action="next-practice" ${cardIndex === ADVENTURE_PRACTICE.length - 1 ? "disabled" : ""}>${escapeHtml(HR.practiceNext)}</button>
    </div>
  </section>`;
}

interface MissionFeedback {
  mission: MissionId;
  outcome: "correct" | "wrong";
  message: string;
}

interface LocalResult {
  view: View;
  message: string;
  completion?: boolean;
}

function localResultMarkup(view: View, result: LocalResult | null): string {
  if (!result || result.view !== view) return "";
  const heading = result.completion ? `<h2 id="local-completion-${view}" tabindex="-1">${escapeHtml(HR.missionCompletedHeading)}</h2>` : "";
  return `<section class="local-result${result.completion ? " is-completion" : ""}" aria-labelledby="local-result-${view}">${heading}<p id="local-result-${view}" data-local-result tabindex="-1" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(result.message)}</p></section>`;
}

function renderAdventure(adventure: AdventureStateV1, practiceCardIndex: number, practiceFeedback: string, correctPracticeCards: ReadonlySet<GlossaryId>, missionFeedback: MissionFeedback | null): string {
  const active = adventure.activeMission;
  const stops = MISSION_IDS.map((mission, index) => {
    const content = ADVENTURE_MISSIONS[mission];
    const completed = adventure.completedMissions.includes(mission);
    const current = active === mission;
    const status = completed ? "Dovršeno" : current ? "Trenutačna" : "Zaključano";
    return `<li class="journey-stop ${completed ? "is-completed" : current ? "is-current" : "is-locked"}" data-mission-stop="${mission}"><span class="stop-number" aria-hidden="true">${completed ? "⭐" : index + 1}</span><div><h3>${escapeHtml(content.title)}</h3>${current || completed ? `<p>${escapeHtml(content.story)}</p>` : ""}<strong>${escapeHtml(status)}</strong></div></li>`;
  }).join("");
  const badgeShelf = MISSION_IDS.map((mission) => {
    const badge = ADVENTURE_BADGES[{ saving: "piggy-bank", earning: "helping-paw", purchase: "smart-shopper", loan: "debt-expert" }[mission] as keyof typeof ADVENTURE_BADGES];
    const earned = adventure.completedMissions.includes(mission);
    return `<article class="badge ${earned ? "is-earned" : "is-locked"}" data-badge="${mission}"><span aria-hidden="true">${earned ? badge.emoji : "🔒"}</span><strong>${escapeHtml(badge.name)}</strong><p>${escapeHtml(earned ? badge.description : HR.badgeLocked)}</p></article>`;
  }).join("");
  const completedAnswerFeedback = missionFeedback?.outcome === "correct" && adventure.completedMissions.includes(missionFeedback.mission)
    ? `<section class="mission-completion mission-answer-status is-correct" aria-labelledby="mission-completion-${missionFeedback.mission}"><h2 id="mission-completion-${missionFeedback.mission}" tabindex="-1"><span aria-hidden="true">✓</span> ${escapeHtml(HR.correctAnswer)}</h2><p id="mission-correct-${missionFeedback.mission}">${escapeHtml(missionFeedback.message)}</p></section>`
    : "";
  let missionCard = `<section class="mission-card journey-complete"><h2>${escapeHtml(HR.journeyCompleted)}</h2><p>${escapeHtml(ADVENTURE_MESSAGES["adventure-journey-completed"])}</p></section>`;
  if (active) {
    const content = ADVENTURE_MISSIONS[active];
    const answered = adventure.correctAnswers.includes(active);
    const correctAnswer = CORRECT_ANSWERS[active];
    const currentFeedback = missionFeedback?.mission === active ? missionFeedback : null;
    const missionNumber = MISSION_IDS.indexOf(active) + 1;
    const answerStatus = answered
      ? `<p id="mission-correct-${active}" class="mission-answer-status is-correct" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true">✓</span> <strong>${escapeHtml(HR.correctAnswer)}</strong> ${escapeHtml(content.correctExplanation)}</p>`
      : currentFeedback?.outcome === "wrong"
        ? `<p id="mission-wrong-${active}" class="mission-answer-status is-wrong" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(currentFeedback.message)}</p>`
        : "";
    missionCard = `<section class="mission-card active-mission-card" data-active-mission="${active}"><p class="eyebrow">Misija ${missionNumber} od ${MISSION_IDS.length}</p><h2>${escapeHtml(content.title)}</h2><p class="mission-story">${escapeHtml(content.story)}</p><p id="mission-instruction-${active}" class="mission-instruction"><strong>${escapeHtml(content.instruction)}</strong></p>
      <fieldset class="question-card mission-question" aria-describedby="mission-instruction-${active}"><legend><strong>${escapeHtml(HR.questionHeading)}</strong></legend><p style="margin:.35rem 0 .5rem">${escapeHtml(content.question)}</p><div class="answer-grid">${content.choices.slice(0, 2).map((choice) => { const correct = choice.id === correctAnswer; return `<button type="button" class="${answered && correct ? "is-correct" : ""}" data-action="answer-adventure" data-mission="${active}" data-answer="${choice.id}" aria-label="${escapeHtml(`${HR.answerButton}: ${choice.label}`)}" ${answered && !correct ? "disabled" : ""}${answered && correct ? ` aria-describedby="mission-correct-${active}"` : ""}>${answered && correct ? `<span aria-hidden="true">✓</span> <span>${escapeHtml(HR.correctAnswer)}</span>: ` : ""}${escapeHtml(choice.label)}</button>`; }).join("")}</div>${answerStatus}</fieldset>
      <section class="checklist"><h3 id="mission-checklist-${active}" tabindex="-1">${escapeHtml(HR.checklistHeading)}</h3><ul><li class="${answered ? "done" : "todo"}"><span aria-hidden="true">${answered ? "✅" : "⬜"}</span> ${escapeHtml(HR.knowledgeStep)} — ${escapeHtml(answered ? HR.stepDone : HR.stepTodo)}</li>${content.actionSteps.map((step, index) => { const done = actionStepDone(adventure, active, index); return `<li class="${done ? "done" : "todo"}"><span aria-hidden="true">${done ? "✅" : "⬜"}</span> ${escapeHtml(step)} — ${escapeHtml(done ? HR.stepDone : HR.stepTodo)}</li>`; }).join("")}</ul><button class="primary" data-action="adventure-go" data-view="${missionTarget(active)}">${escapeHtml(HR.goToAction)}</button></section></section>`;
  }
  const school = GLOSSARY_IDS.map((id) => { const topic = MONEY_SCHOOL[id]; return `<details class="school-topic"><summary>${escapeHtml(topic.title)}</summary><p>${escapeHtml(topic.definition)}</p><p><strong>${escapeHtml(HR.exampleLabel)}:</strong> ${escapeHtml(topic.example)}</p></details>`; }).join("");
  return `<section id="view-adventure" class="view" data-view="adventure"><div class="adventure-scene" aria-hidden="true" hidden></div><section class="guide-card adventure-intro" aria-labelledby="adventure-heading"><span class="adventure-luna" aria-hidden="true" style="width:72px">🐶</span><div class="adventure-intro-copy"><h1 id="adventure-heading" tabindex="-1">${escapeHtml(HR.adventureHeading)}</h1><p class="adventure-orientation"><strong>Luna ti pokazuje sljedeći korak.</strong></p><p class="adventure-ready">${escapeHtml(HR.adventureReady)}</p></div></section>
    ${missionCard}${completedAnswerFeedback}
    <section class="progress-banner" aria-label="${escapeHtml(HR.starsLabel)}"><span aria-hidden="true">${"⭐".repeat(adventure.stars)}${"☆".repeat(4 - adventure.stars)}</span><strong>${escapeHtml(HR.starsValue(adventure.stars))}</strong></section>
    <section class="journey-overview" aria-label="${escapeHtml(HR.adventureMapLabel)}"><ol class="journey-overview-list">${stops}</ol></section>
    <details class="adventure-disclosure"><summary>Vježbaj pravila</summary>${renderPractice(practiceCardIndex, practiceFeedback, correctPracticeCards)}</details>
    <details class="adventure-disclosure"><summary>${escapeHtml(HR.badgesHeading)}</summary><section><div class="badge-shelf">${badgeShelf}</div></section></details>
    <details class="adventure-disclosure money-school"><summary>${escapeHtml(HR.moneySchoolHeading)}</summary><section><p>${escapeHtml(HR.moneySchoolIntro)}</p><div class="school-grid">${school}</div></section></details></section>`;
}

interface GoalPlanResult {
  target: number;
  choreId: (typeof CHORES)[number]["id"];
  missing: number;
  approvals: number;
}

function renderGoalPlanner(plan: GoalPlanResult | null): string {
  const selectedChoreId = plan?.choreId ?? CHORES[0].id;
  const selectedChore = CHORES.find(({ id }) => id === plan?.choreId);
  const result = plan && selectedChore
    ? plan.missing === 0
      ? HR.goalCovered(plan.target)
      : HR.goalMissing(plan.target, plan.missing, selectedChore.name, selectedChore.reward, plan.approvals)
    : "";
  return `<section class="panel goal-planner" aria-labelledby="goal-heading">
    <h2 id="goal-heading">${escapeHtml(HR.goalHeading)}</h2>
    <p id="goal-intro">${escapeHtml(HR.goalIntro)}</p>
    <form class="amount-form" data-form="goal-plan" novalidate>
      <label for="goal-target">${escapeHtml(HR.goalTargetLabel)}</label>
      <input id="goal-target" name="target" type="number" inputmode="numeric" min="1" max="${Number.MAX_SAFE_INTEGER}" step="1" required value="${plan?.target ?? ""}" aria-describedby="goal-intro goal-disclaimer" />
      <label for="goal-chore">${escapeHtml(HR.goalChoreLabel)}</label>
      <select id="goal-chore" name="chore">${CHORES.map((chore) => `<option value="${chore.id}" ${chore.id === selectedChoreId ? "selected" : ""}>${escapeHtml(HR.choreDetails(chore.name, chore.reward))}</option>`).join("")}</select>
      <button class="primary" type="submit">${escapeHtml(HR.goalButton)}</button>
    </form>
    <p id="goal-disclaimer">${escapeHtml(HR.goalDisclaimer)}</p>
    <p data-goal-result role="status" aria-live="polite" aria-atomic="true">${escapeHtml(result)}</p>
  </section>`;
}

function loanForm(action: "borrow" | "repay", button: string, invalid: boolean): string {
  const previewId = `loan-preview-${action}`;
  return `${amountForm(action, button, "loan-help", invalid)}<p id="${previewId}" class="loan-preview" data-loan-preview="${action}" aria-live="polite" aria-atomic="true"></p>`;
}

function renderMoney(state: AppStateV1, adventure: AdventureStateV1, goalPlan: GoalPlanResult | null, localResult: LocalResult | null, invalidAmountForm: string | null): string {
  const activities = state.activities.slice(-5).reverse();
  return `<section id="view-money" class="view" data-view="money">${adventureScene("money")}
    <h1 tabindex="-1">${escapeHtml(HR.moneyHeading)}</h1><p>${escapeHtml(HR.moneyIntro)}</p>${currentMissionPanel(adventure)}
    <p id="balance-help" class="sr-only">${escapeHtml(HR.balanceDescription)}</p>
    <div class="balances">${balanceCard(HR.wallet, state.wallet, "wallet-value")}${balanceCard(HR.savings, state.savings, "savings-value")}${balanceCard(HR.debt, state.debt, "debt-value")}</div>
    <section class="panel money-actions saving-actions" aria-labelledby="saving-actions-heading"><h2 id="saving-actions-heading">Štednja</h2><p id="saving-help">${escapeHtml(HR.savingHelp)}</p>${amountForm("save", HR.saveButton, "saving-help", invalidAmountForm === "save")}${amountForm("withdraw", HR.withdrawButton, "saving-help", invalidAmountForm === "withdraw")}</section>
    ${renderGoalPlanner(goalPlan)}
    ${localResultMarkup("money", localResult)}
    <section class="panel"><h2>${escapeHtml(HR.activityHeading)}</h2>${activities.length ? `<ol class="activity-list">${activities.map((activity) => `<li>${escapeHtml(activityMessage(activity))}</li>`).join("")}</ol>` : `<p data-empty="activity">${escapeHtml(RESULT_MESSAGES["activity-empty"])}</p>`}</section>
    <section class="panel loan-panel" aria-labelledby="loan-heading" style="border-color:var(--purple);background:#f7f1ff"><h2 id="loan-heading">Zajam u igri</h2><p id="loan-help"><strong>${escapeHtml(HR.loanHelp)}</strong></p><div class="money-actions loan-actions">${loanForm("borrow", HR.borrowButton, invalidAmountForm === "borrow")}${loanForm("repay", HR.repayButton, invalidAmountForm === "repay")}</div></section>
  </section>`;
}

function renderEarningsChallenge(roundIndex: number, feedback: string): string {
  const total = EARNINGS_CHALLENGE.length;
  const progress = HR.earningsChallengeProgress(Math.min(roundIndex + 1, total), total);
  if (roundIndex >= total) {
    return `<section class="panel earnings-challenge" aria-labelledby="earnings-challenge-heading">
      <h2 id="earnings-challenge-heading">${escapeHtml(HR.earningsChallengeHeading)}</h2>
      <p><strong data-challenge-progress>${escapeHtml(progress)}</strong></p>
      <p data-challenge-complete role="status" aria-live="polite">${escapeHtml(HR.earningsChallengeComplete)}</p>
    </section>`;
  }
  const comparison = EARNINGS_CHALLENGE[roundIndex];
  return `<section class="panel earnings-challenge" aria-labelledby="earnings-challenge-heading" aria-describedby="earnings-challenge-intro earnings-challenge-question">
    <h2 id="earnings-challenge-heading">${escapeHtml(HR.earningsChallengeHeading)}</h2>
    <p id="earnings-challenge-intro">${escapeHtml(HR.earningsChallengeIntro)}</p>
    <p><strong data-challenge-progress>${escapeHtml(progress)}</strong></p>
    <p id="earnings-challenge-question">${escapeHtml(HR.earningsChallengeQuestion)}</p>
    <div class="answer-grid">${comparison.choices.map((choreId) => {
      const chore = CHORES.find(({ id }) => id === choreId);
      if (!chore) return "";
      return `<button type="button" data-action="answer-earnings-challenge" data-id="${chore.id}" data-round="${roundIndex}" aria-label="${escapeHtml(HR.earningsChallengeAnswerAccessible(chore.name, chore.reward))}"><strong>${escapeHtml(chore.name)}</strong><span>${escapeHtml(HR.labeledValue(HR.rewardLabel, HR.rewardValue(chore.reward)))}</span></button>`;
    }).join("")}</div>
    <p data-challenge-feedback role="status" aria-live="polite">${escapeHtml(feedback)}</p>
  </section>`;
}

function renderChores(state: AppStateV1, adventure: AdventureStateV1, challengeRound: number, challengeFeedback: string, localResult: LocalResult | null): string {
  return `<section id="view-chores" class="view" data-view="chores">${adventureScene("chores")}
    <h1 tabindex="-1">${escapeHtml(HR.choresHeading)}</h1><p>${escapeHtml(HR.choresIntro)}</p>${currentMissionPanel(adventure)}
    <div class="card-grid">${CHORES.map((chore) => {
      const pending = state.choreRequests.some((request) => request.choreId === chore.id && request.status === "pending");
      const status = statusForChore(state, chore.id);
      const stateIcon = pending ? "⏳" : status === HR.statusApproved ? "✓" : "○";
      const action = pending
        ? `<button class="primary" disabled aria-disabled="true">Čeka potvrdu roditelja</button>`
        : `<button class="primary" data-action="request-chore" data-id="${chore.id}" aria-label="${escapeHtml(HR.choreAccessible(chore.name))}">${escapeHtml(HR.doneButton)}</button>`;
      return `<article class="catalog-card" data-chore="${chore.id}"><h2>${escapeHtml(chore.name)}</h2><p>${escapeHtml(HR.labeledValue(HR.rewardLabel, HR.rewardValue(chore.reward)))}</p><p class="chore-state" data-chore-state="${chore.id}"><span aria-hidden="true">${stateIcon}</span> <strong>${escapeHtml(status)}</strong></p>${action}</article>`;
    }).join("")}</div>${localResultMarkup("chores", localResult)}
    <details class="panel earnings-challenge-disclosure"><summary>Izazov zarade</summary>${renderEarningsChallenge(challengeRound, challengeFeedback)}</details>
  </section>`;
}

const SHOP_CATEGORY_IDS = ["all", "pets", "pet-items", "house-items"] as const;
type ShopCategory = (typeof SHOP_CATEGORY_IDS)[number];
const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  all: "Sve",
  pets: "Ljubimci",
  "pet-items": "Stvari za ljubimce",
  "house-items": "Ukrasi za kuću",
};

type ShopCatalogEntry =
  | { kind: "pet"; category: "pets"; entry: (typeof PETS)[number] }
  | { kind: "item"; category: "pet-items" | "house-items"; entry: (typeof ITEMS)[number] };

function shopCatalogEntries(): ShopCatalogEntry[] {
  return [
    ...PETS.map((entry) => ({ kind: "pet" as const, category: "pets" as const, entry })),
    ...ITEMS.map((entry) => ({ kind: "item" as const, category: entry.category === "pet" ? "pet-items" as const : "house-items" as const, entry })),
  ];
}

function renderCatalogCard(kind: "pet" | "item", entry: (typeof PETS)[number] | (typeof ITEMS)[number], state: AppStateV1, category: Exclude<ShopCategory, "all">): string {
  const owned = kind === "pet" && state.ownedPets.some(({ catalogId }) => catalogId === entry.id);
  const affordable = state.wallet >= entry.price;
  const reason = owned ? HR.ownedLabel : !affordable ? `Treba ti još ${entry.price - state.wallet} zlatnika` : "";
  const alt = kind === "pet" ? HR.petImageAlt(entry.name) : HR.itemImageAlt(entry.name);
  const association = kind === "item" && "careAssociation" in entry && entry.careAssociation ? HR.careAssociation(entry.careAssociation) : "";
  return `<article class="catalog-card" data-shop-entry="${entry.id}" data-shop-family="${category}">
    <span class="catalog-emoji" role="img" aria-label="${escapeHtml(alt)}">${entry.emoji}</span>
    <h3>${escapeHtml(entry.name)}</h3><p><strong>${escapeHtml(HR.labeledValue(HR.priceLabel, HR.priceValue(entry.price)))}</strong></p>${association ? `<p>${escapeHtml(association)} — nema mehanički učinak na njegu ni XP.</p>` : ""}
    ${reason ? `<p class="reason">${escapeHtml(reason)}</p>` : ""}
    <button class="primary" data-action="buy-${kind}" data-id="${entry.id}" aria-label="${escapeHtml(HR.buyAccessible(entry.name, entry.price))}" ${owned || !affordable ? "disabled" : ""}>${escapeHtml(HR.buyButton)}</button>
  </article>`;
}

function renderShop(state: AppStateV1, adventure: AdventureStateV1, category: ShopCategory, affordableOnly: boolean, localResult: LocalResult | null): string {
  const entries = shopCatalogEntries();
  const visibleEntries = entries.filter(({ kind, category: entryCategory, entry }) => {
    if (category !== "all" && entryCategory !== category) return false;
    if (!affordableOnly) return true;
    return entry.price <= state.wallet && (kind !== "pet" || !state.ownedPets.some(({ catalogId }) => catalogId === entry.id));
  });
  const inventoryItems = ITEMS.filter(({ id }) => (state.itemQuantities[id] ?? 0) > 0);
  const categoryControls = SHOP_CATEGORY_IDS.map((id) => {
    const selected = category === id;
    return `<button type="button" data-action="set-shop-category" data-category="${id}" aria-controls="shop-results" aria-pressed="${selected}"><span>${escapeHtml(SHOP_CATEGORY_LABELS[id])}</span>${selected ? `<span class="filter-check" aria-hidden="true">✓</span><span class="sr-only">Odabrano</span>` : ""}</button>`;
  }).join("");
  return `<section id="view-shop" class="view" data-view="shop">${adventureScene("shop")}
    <h1 tabindex="-1">${escapeHtml(HR.shopHeading)}</h1><p data-shop-wallet><strong>U novčaniku imaš: ${escapeHtml(state.wallet)} zlatnika.</strong></p><p>${escapeHtml(HR.shopIntro)}</p>${currentMissionPanel(adventure)}
    <fieldset class="panel shop-filters"><legend>Filtriraj ponudu</legend>
      <div class="shop-category-controls" role="group" aria-label="Kategorije ponude">${categoryControls}</div>
      <button type="button" class="affordability-filter" data-action="toggle-shop-affordability" aria-controls="shop-results" aria-pressed="${affordableOnly}"><span>Mogu kupiti</span>${affordableOnly ? `<span class="filter-check" aria-hidden="true">✓</span><span class="sr-only">Uključeno</span>` : ""}</button>
    </fieldset>
    <section aria-labelledby="shop-results-heading"><h2 id="shop-results-heading">${escapeHtml(SHOP_CATEGORY_LABELS[category])}</h2>
      <p data-shop-result-count role="status" aria-live="polite" aria-atomic="true">Prikazano ${escapeHtml(visibleEntries.length)} ponuda.</p>
      <div id="shop-results" class="card-grid shop-results">${visibleEntries.map(({ kind, entry, category: entryCategory }) => renderCatalogCard(kind, entry, state, entryCategory)).join("")}</div>
      ${visibleEntries.length ? "" : `<div class="panel shop-empty"><p>Nema ponuda koje odgovaraju odabranim filtrima.</p><button type="button" data-action="reset-shop-filters" aria-controls="shop-results">Prikaži sve</button></div>`}
    </section>
    ${localResultMarkup("shop", localResult)}<section class="panel" data-shop-inventory><h2>${escapeHtml(HR.inventoryHeading)}</h2>
      ${state.ownedPets.length ? `<ul>${state.ownedPets.map((owned) => `<li>${escapeHtml(PETS.find(({ id }) => id === owned.catalogId)?.name ?? HR.genericError)}</li>`).join("")}</ul>` : `<p>${escapeHtml(RESULT_MESSAGES["pet-inventory-empty"])}</p>`}
      ${inventoryItems.length ? `<ul>${inventoryItems.map((item) => `<li>${escapeHtml(HR.inventoryDetails(item.name, state.itemQuantities[item.id]))}</li>`).join("")}</ul>` : `<p>${escapeHtml(RESULT_MESSAGES["item-inventory-empty"])}</p>`}
    </section>
  </section>`;
}

function petName(state: AppStateV1, petId: number): string {
  const owned = state.ownedPets.find(({ id }) => id === petId);
  return PETS.find(({ id }) => id === owned?.catalogId)?.name ?? HR.genericError;
}

function itemName(id: string): string {
  return ITEMS.find((item) => item.id === id)?.name ?? HR.genericError;
}

interface HouseSlotPresentation {
  areaName: string;
  kind: SlotKind;
  position: number;
  label: string;
  optionLabel: string;
}

function houseSlotPresentation(slot: HouseSlot): HouseSlotPresentation | null {
  for (const area of HOUSE_AREAS) {
    const position = area.slots.findIndex((areaSlot) => areaSlot === slot) + 1;
    if (position > 0) {
      const content = houseAreaContent(area.id);
      if (!content) return null;
      const kind: SlotKind = slot.startsWith("pet-") ? "pet" : "item";
      return {
        areaName: content.name,
        kind,
        position,
        label: HR.houseSlotName(kind, position),
        optionLabel: HR.houseSlotOption(content.name, kind, position),
      };
    }
  }
  return null;
}

function slotsForKind(kind: SlotKind): HouseSlot[] {
  return HOUSE_AREAS.flatMap(({ slots }) => slots).filter((slot) => slot.startsWith(`${kind}-`));
}

function slotOptions(slots: readonly HouseSlot[], kind: SlotKind, state: AppStateV1, exclude?: string): string {
  const placements = kind === "pet" ? state.petPlacements : state.itemPlacements;
  return slots.filter((slot) => slot !== exclude && placements[slot] === null).map((slot) => {
    const presentation = houseSlotPresentation(slot);
    if (!presentation) return "";
    return `<option value="${slot}">${escapeHtml(presentation.optionLabel)}</option>`;
  }).join("");
}

function renderPlacedSlot(slot: HouseSlot, state: AppStateV1): string {
  const presentation = houseSlotPresentation(slot);
  if (!presentation) return "";
  const placements = presentation.kind === "pet" ? state.petPlacements : state.itemPlacements;
  const value = placements[slot];
  const accessibleSlotName = `${presentation.areaName}: ${presentation.label}`;
  if (value === null) return `<article class="house-slot" data-house-slot="${slot}" aria-label="${escapeHtml(accessibleSlotName)}"><h3>${escapeHtml(presentation.label)}</h3><p>${escapeHtml(HR.emptySlot)}</p></article>`;
  const name = presentation.kind === "pet" ? petName(state, value as number) : itemName(value as string);
  const slots = slotsForKind(presentation.kind);
  return `<article class="house-slot" data-house-slot="${slot}" aria-label="${escapeHtml(`${accessibleSlotName}: ${name}`)}"><h3>${escapeHtml(presentation.label)}</h3><p><strong>${escapeHtml(name)}</strong></p>
    <label for="move-${slot}">${escapeHtml(`${HR.moveLabel}: ${name}`)}</label><select id="move-${slot}" data-move-select="${slot}" aria-label="${escapeHtml(`${HR.moveAccessible(name)} — ${accessibleSlotName}`)}">${slotOptions(slots, presentation.kind, state, slot)}</select>
    <div class="slot-actions"><button data-action="move-${presentation.kind}" data-slot="${slot}" aria-label="${escapeHtml(HR.moveAccessible(name))}">${escapeHtml(HR.moveButton)}</button><button data-action="remove-${presentation.kind}" data-slot="${slot}" aria-label="${escapeHtml(HR.removeAccessible(name, presentation.areaName))}">${escapeHtml(HR.removeButton)}</button></div>
  </article>`;
}

function renderHouse(state: AppStateV1, adventure: AdventureStateV1, localResult: LocalResult | null): string {
  const petSlots = slotsForKind("pet");
  const itemSlots = slotsForKind("item");
  const unplacedPets = state.ownedPets.filter(({ id }) => !Object.values(state.petPlacements).includes(id));
  const unplacedItems = ITEMS.filter(({ id }) => (state.itemQuantities[id] ?? 0) > Object.values(state.itemPlacements).filter((placed) => placed === id).length);
  const hasFreePetSlot = Object.values(state.petPlacements).includes(null);
  const hasFreeItemSlot = Object.values(state.itemPlacements).includes(null);
  const areas = HOUSE_AREAS.map((area) => {
    const content = houseAreaContent(area.id);
    if (!content) return "";
    return `<section class="house-area house-area-${area.id}" data-house-area="${area.id}" aria-labelledby="house-area-${area.id}" aria-describedby="house-area-description-${area.id}">
      <span class="house-area-cue" aria-hidden="true"></span>
      <h2 id="house-area-${area.id}">${escapeHtml(content.name)}</h2>
      <p id="house-area-description-${area.id}">${escapeHtml(content.description)}</p>
      <div class="house-grid house-area-slots" role="group" aria-label="${escapeHtml(HR.areaSlotsLabel(content.name))}">${area.slots.map((slot) => renderPlacedSlot(slot, state)).join("")}</div>
    </section>`;
  }).join("");
  return `<section id="view-house" class="view theme-${state.selectedTheme}" data-view="house">${adventureScene("house")}
    <h1 tabindex="-1">${escapeHtml(HR.houseHeading)}</h1><p>${escapeHtml(HR.houseIntro)}</p><span class="decoration" aria-hidden="true">✨</span>${currentMissionPanel(adventure)}
    <form data-form="theme" class="panel inline-form"><label for="theme">${escapeHtml(HR.themeLabel)}</label><select id="theme" name="theme">${THEMES.map((theme) => `<option value="${theme.id}" ${theme.id === state.selectedTheme ? "selected" : ""}>${escapeHtml(theme.name)}</option>`).join("")}</select><button class="primary" type="submit">${escapeHtml(HR.selectThemeButton)}</button></form>
    <div class="house-composition"><div class="house-areas">${areas}</div></div>${localResultMarkup("house", localResult)}
    <section class="panel"><p class="placement-steps"><strong>1. Odaberi mjesto. 2. Odaberi Postavi.</strong></p><h2>${escapeHtml(HR.unplacedPets)}</h2>${!hasFreePetSlot && unplacedPets.length ? `<p data-house-full="pets">${escapeHtml(HR.petHouseFullGuidance)}</p>` : ""}${unplacedPets.length ? unplacedPets.map((pet) => {
      const name = petName(state, pet.id); return `<form data-form="place-pet" data-id="${pet.id}" class="inline-form"><label for="pet-slot-${pet.id}">${escapeHtml(name)}</label><select id="pet-slot-${pet.id}" name="slot" aria-label="${escapeHtml(HR.placeSlotAccessible(name))}">${slotOptions(petSlots, "pet", state)}</select><button class="primary" type="submit" aria-label="${escapeHtml(HR.placeAccessible(name, HR.houseHeading))}" ${hasFreePetSlot ? "" : "disabled"}>${escapeHtml(HR.placeButton)}</button></form>`;
    }).join("") : `<p>${escapeHtml(RESULT_MESSAGES["pet-inventory-empty"])}</p>`}
    <h2>${escapeHtml(HR.unplacedItems)}</h2>${unplacedItems.length ? unplacedItems.map((item) => `<form data-form="place-item" data-id="${item.id}" class="inline-form"><label for="item-slot-${item.id}">${escapeHtml(HR.inventoryDetails(item.name, state.itemQuantities[item.id] - Object.values(state.itemPlacements).filter((placed) => placed === item.id).length))}</label><select id="item-slot-${item.id}" name="slot" aria-label="${escapeHtml(HR.placeSlotAccessible(item.name))}">${slotOptions(itemSlots, "item", state)}</select><button class="primary" type="submit" aria-label="${escapeHtml(HR.placeAccessible(item.name, HR.houseHeading))}" ${hasFreeItemSlot ? "" : "disabled"}>${escapeHtml(HR.placeButton)}</button>${hasFreeItemSlot ? "" : `<p>${escapeHtml(HR.houseFull)}</p>`}</form>`).join("") : `<p>${escapeHtml(RESULT_MESSAGES["item-inventory-empty"])}</p>`}</section>
  </section>`;
}

const CARE_RESULT_MESSAGES: Record<CareResultCode, string> = {
  "care-accepted": "Njega je spremljena. Ljubimac se osjeća bolje, a osvojeni XP je zabilježen.",
  "care-duplicate": "Ova je njega već spremljena pa XP nije dodijeljen drugi put.",
  "care-invalid-event": "Ovaj pokušaj njege nije valjan. Pokušaj ponovno.",
  "care-unknown-pet": "Odabrani ljubimac nije dostupan za njegu.",
  "care-cooldown": "Ljubimac je nedavno primio ovu njegu. Pričekaj četiri sata prije ponavljanja.",
  "care-need-full": "Ta je potreba već potpuno ispunjena. Odaberi drugu njegu ili se vrati poslije.",
  "care-storage-unavailable": "Njegu nije moguće sigurno spremiti. Ni potreba ni XP nisu promijenjeni; možeš pokušati ponovno.",
};

function renderCare(state: AppStateV1, progression: ProgressionStateV1, careFeedback: string): string {
  const owned = state.ownedPets.map(({ catalogId }) => catalogId);
  const pet = progression.pets.find(({ petId }) => owned.includes(petId));
  if (!pet) return `<section id="view-care" class="view" data-view="care">${adventureScene("care")}<h1 tabindex="-1">${escapeHtml(HR.careHeading)}</h1><p>${escapeHtml(HR.careIntro)}</p><section class="panel care-empty"><p>${escapeHtml(HR.careNoPet)}</p><button data-nav="shop">${escapeHtml(HR.navShop)}</button></section></section>`;
  const petContent = PETS.find(({ id }) => id === pet.petId);
  const petName = petContent?.name ?? HR.genericError;
  const quest = progression.currentQuest ? questById(progression.currentQuest.id) : null;
  const actionLabels: Record<CareActionId, string> = { feed: HR.careActionFeed, play: HR.careActionPlay, groom: HR.careActionGroom };
  const needs = [[HR.careFullness, pet.fullness], [HR.careHappiness, pet.happiness], [HR.careCleanliness, pet.cleanliness]] as const;
  return `<section id="view-care" class="view" data-view="care">${adventureScene("care")}<h1 tabindex="-1">${escapeHtml(HR.careHeading)}</h1><p>${escapeHtml(HR.careIntro)}</p>
    <section class="panel care-progress" aria-labelledby="care-progress-heading"><h2 id="care-progress-heading">${escapeHtml(petName)} ${petContent?.emoji ?? "🐾"}</h2><p><strong>${escapeHtml(HR.careProgress(progression.totalXp, progressionLevel(progression.totalXp)))}</strong></p>${progression.cosmeticTitleIds.length ? `<p>Ukrasni naslovi: ${escapeHtml(progression.cosmeticTitleIds.map((id) => ({ "caring-paw": "Brižna šapica", "happy-friend": "Veseli prijatelj", "pet-guardian": "Čuvar ljubimaca", "care-master": "Majstor njege", "pet-star": "Zvijezda ljubimaca" }[id])).join(", "))}</p>` : ""}</section>
    <section class="panel care-quest" aria-labelledby="care-quest-heading"><h2 id="care-quest-heading">${escapeHtml(HR.careQuestHeading)}</h2>${quest ? `<h3>${escapeHtml(quest.title)}</h3><p>${escapeHtml(progression.currentQuest?.completed ? HR.careQuestDone : quest.instruction)}</p>` : `<p>${escapeHtml(HR.careNextSession)}</p>`}</section>
    <section class="panel" aria-labelledby="care-needs-heading"><h2 id="care-needs-heading">${escapeHtml(HR.careNeedsHeading)}</h2><dl class="care-needs">${needs.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd><meter min="40" max="100" value="${value}">${value}</meter> <strong>${value} od 100</strong></dd></div>`).join("")}</dl><div class="care-actions">${CARE_ACTION_IDS.map((action) => `<button class="primary" data-action="care-pet" data-care-action="${action}" data-pet-id="${escapeHtml(pet.petId)}" aria-label="${escapeHtml(HR.careActionAccessible(actionLabels[action], petName))}">${escapeHtml(actionLabels[action])}</button>`).join("")}</div><p id="care-result" tabindex="-1" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(careFeedback)}</p><p>${escapeHtml(HR.careNextSession)}</p></section>
  </section>`;
}

type ParentMode = "unprovisioned" | "locked" | "unavailable" | "unlocked";

function pinInput(id: string, name: string, label: string, autocomplete: "new-password" | "current-password"): string {
  return `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" name="${name}" type="password" inputmode="numeric" autocomplete="${autocomplete}" pattern="[0-9]{6}" minlength="6" maxlength="6" aria-describedby="parent-pin-help" required />`;
}

function renderParentOverview(state: AppStateV1, adventure: AdventureStateV1): string {
  const pendingChores = state.choreRequests.filter(({ status }) => status === "pending").length;
  const itemQuantity = Object.values(state.itemQuantities).reduce((total, quantity) => total + quantity, 0);
  const summaries = [
    [HR.parentWalletSummary, HR.coinValue(state.wallet)],
    [HR.parentSavingsSummary, HR.coinValue(state.savings)],
    [HR.parentDebtSummary, HR.coinValue(state.debt)],
    [HR.parentPendingSummary, HR.parentCountValue(pendingChores)],
    [HR.parentMissionsSummary, HR.parentMissionsValue(adventure.completedMissions.length)],
    [HR.parentPetsSummary, HR.parentPetsValue(state.ownedPets.length)],
    [HR.parentItemsSummary, HR.parentCountValue(itemQuantity)],
  ] as const;
  const recentActivities = state.activities.slice(-5).reverse();
  return `<section class="panel parent-overview" data-parent-overview aria-labelledby="parent-overview-heading">
    <h2 id="parent-overview-heading">${escapeHtml(HR.parentOverviewHeading)}</h2>
    <dl class="parent-summary">${summaries.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd data-parent-summary-value>${escapeHtml(value)}</dd></div>`).join("")}</dl>
    <section data-parent-recent aria-labelledby="parent-recent-heading"><h3 id="parent-recent-heading">${escapeHtml(HR.parentRecentHeading)}</h3>${recentActivities.length ? `<ol class="activity-list">${recentActivities.map((activity) => `<li>${escapeHtml(activityMessage(activity))}</li>`).join("")}</ol>` : `<p>${escapeHtml(HR.parentRecentEmpty)}</p>`}</section>
  </section>`;
}

function renderParent(state: AppStateV1, adventure: AdventureStateV1, mode: ParentMode, localResult: LocalResult | null, invalidAmountForm: string | null): string {
  const heading = `<h1 tabindex="-1">${escapeHtml(HR.parentHeading)}</h1><p>${escapeHtml(HR.parentIntro)}</p><span class="parent-decoration" aria-hidden="true">🔐✨</span>`;
  if (mode === "unavailable") return `<section id="view-parent" class="view parent-view parent-locked" data-view="parent">${heading}${localResultMarkup("parent", localResult)}<section class="panel access-panel"><h2>${escapeHtml(HR.parentUnavailableHeading)}</h2><p role="alert">${escapeHtml(HR.parentUnavailable)}</p><p>${escapeHtml(HR.parentLocalNotice)}</p></section></section>`;
  if (mode === "unprovisioned") return `<section id="view-parent" class="view parent-view parent-locked" data-view="parent">${heading}${localResultMarkup("parent", localResult)}<section class="panel access-panel"><h2>${escapeHtml(HR.parentSetupHeading)}</h2><p role="status">${escapeHtml(HR.parentUnprovisioned)}</p><p>${escapeHtml(HR.parentSetupIntro)}</p><p id="parent-pin-help">${escapeHtml(HR.parentPinDescription)}</p><form class="pin-form" data-form="parent-setup" novalidate>${pinInput("parent-setup-pin", "pin", HR.parentPinLabel, "new-password")}${pinInput("parent-setup-confirmation", "confirmation", HR.parentPinConfirmLabel, "new-password")}<button class="primary" type="submit">${escapeHtml(HR.parentSetupButton)}</button></form><p class="local-notice">${escapeHtml(HR.parentLocalNotice)}</p><p>${escapeHtml(HR.parentForgotten)}</p></section></section>`;
  if (mode === "locked") return `<section id="view-parent" class="view parent-view parent-locked" data-view="parent">${heading}${localResultMarkup("parent", localResult)}<section class="panel access-panel"><h2>${escapeHtml(HR.parentUnlockHeading)}</h2><p>${escapeHtml(HR.parentUnlockIntro)}</p><p id="parent-pin-help">${escapeHtml(HR.parentPinDescription)}</p><form class="pin-form" data-form="parent-unlock" novalidate>${pinInput("parent-pin", "pin", HR.parentPinLabel, "current-password")}<button class="primary" type="submit">${escapeHtml(HR.parentUnlockButton)}</button></form><p class="local-notice">${escapeHtml(HR.parentLocalNotice)}</p><p>${escapeHtml(HR.parentForgotten)}</p></section></section>`;

  const pending = state.choreRequests.filter(({ status }) => status === "pending");
  return `<section id="view-parent" class="view parent-view parent-unlocked" data-view="parent">${heading}<button class="lock-button" data-action="lock-parent" aria-label="${escapeHtml(HR.parentLockAccessible)}">${escapeHtml(HR.parentLockButton)}</button>
    ${renderParentOverview(state, adventure)}
    <section class="panel"><h2>${escapeHtml(HR.grantHeading)}</h2>${amountForm("grant", HR.grantButton, undefined, invalidAmountForm === "grant")}</section>${localResultMarkup("parent", localResult)}
    <section class="panel"><h2>${escapeHtml(HR.pendingHeading)}</h2>${pending.length ? pending.map((request) => {
      const chore = CHORES.find(({ id }) => id === request.choreId); const name = chore?.name ?? HR.genericError;
      return `<article class="request"><p><strong>${escapeHtml(chore ? HR.choreDetails(chore.name, chore.reward) : HR.genericError)}</strong></p><div><button class="primary" data-action="approve-chore" data-id="${request.id}" aria-label="${escapeHtml(HR.approveAccessible(name))}">${escapeHtml(HR.approveButton)}</button><button data-action="return-chore" data-id="${request.id}" aria-label="${escapeHtml(HR.returnAccessible(name))}">${escapeHtml(HR.returnButton)}</button></div></article>`;
    }).join("") : `<p data-empty="requests">${escapeHtml(RESULT_MESSAGES["chore-requests-empty"])}</p>`}</section>
  </section>`;
}

export interface AppController { getState(): AppStateV1; getAdventureState(): AdventureStateV1; getProgressionState(): ProgressionStateV1; destroy(): void }

export function createApp(
  root: HTMLElement,
  storage: StorageLike,
  crypto: Crypto | null = globalThis.crypto,
  secureContext: boolean = globalThis.isSecureContext === true,
): AppController {
  const loaded = loadState(storage);
  const loadedAdventure = loadAdventureState(storage);
  const access = inspectParentAccess(storage);
  let state = loaded.state;
  const ownedPetIds = () => PETS.filter(({ id }) => state.ownedPets.some(({ catalogId }) => catalogId === id)).map(({ id }) => id);
  let progression = loadProgression(storage, ownedPetIds()).state;
  const cryptoAvailable = Boolean(secureContext && crypto?.subtle && typeof crypto.getRandomValues === "function");
  let adventure = loadedAdventure.state;
  let activeView: View = "adventure";
  let parentMode: ParentMode = !cryptoAvailable ? "unavailable" : access.code === "setup-required" ? "unprovisioned" : access.code === "credential-present" ? "locked" : "unavailable";
  let parentUnlocked = false;
  let accessAttempt = 0;
  let pendingParentUnlock: { attempt: number; form: HTMLFormElement } | null = null;
  let earningsChallengeRound = 0;
  let earningsChallengeFeedback = "";
  let goalPlan: GoalPlanResult | null = null;
  let shopCategory: ShopCategory = "all";
  let shopAffordableOnly = false;
  let practiceCardIndex = 0;
  let practiceFeedback = "";
  const correctPracticeCards = new Set<GlossaryId>();
  const adventureLoadFeedback = loadedAdventure.code && loadedAdventure.code !== "adventure-load-empty" ? ADVENTURE_MESSAGES[loadedAdventure.code] : "";
  let feedback = loaded.code && loaded.code !== "load-empty" ? LOAD_MESSAGES[loaded.code] : adventureLoadFeedback;
  let localResult: LocalResult | null = null;
  let missionFeedback: MissionFeedback | null = null;
  let focusIntent: string | null = null;
  let invalidAmountForm: string | null = null;
  let reaction: "correct" | "step" | "star" | "complete" | "" = "";
  let careFeedback = "";
  let careEventSequence = 0;
  const uncertainCareEvents = new Map<string, string>();

  function invalidateParentUnlock(): void {
    if (!pendingParentUnlock) return;
    accessAttempt += 1;
    pendingParentUnlock = null;
  }

  function render(): void {
    invalidateParentUnlock();
    progression = prepareProgression(progression, ownedPetIds(), Date.now());
    const sections: Record<View, string> = { adventure: renderAdventure(adventure, practiceCardIndex, practiceFeedback, correctPracticeCards, missionFeedback), care: renderCare(state, progression, careFeedback), money: renderMoney(state, adventure, goalPlan, localResult, invalidAmountForm), chores: renderChores(state, adventure, earningsChallengeRound, earningsChallengeFeedback, localResult), shop: renderShop(state, adventure, shopCategory, shopAffordableOnly, localResult), house: renderHouse(state, adventure, localResult), parent: renderParent(state, adventure, parentMode, localResult, invalidAmountForm) };
    const childNavigation = childViews.map((view) => `<button data-nav="${view.id}" ${view.id === activeView ? `class="active" aria-current="page"` : ""}><span class="nav-icon" aria-hidden="true">${view.icon}</span><span>${escapeHtml(view.label)}</span>${view.id === activeView ? `<span class="sr-only">${escapeHtml(HR.currentView)}</span>` : ""}</button>`).join("");
    const parentUtility = `<aside class="parent-utility" aria-label="${escapeHtml(HR.parentUtilityLabel)}"><button data-nav="parent" ${activeView === "parent" ? `class="active" aria-current="page"` : ""}><span class="nav-icon" aria-hidden="true">🔐</span><span>${escapeHtml(HR.navParent)}</span>${activeView === "parent" ? `<span class="sr-only">${escapeHtml(HR.currentView)}</span>` : ""}</button></aside>`;
    root.innerHTML = `<a class="skip-link" href="#main-content">${escapeHtml(HR.skipLink)}</a><header class="app-header"><div><span class="logo" aria-hidden="true">🐾</span><strong>${escapeHtml(HR.appName)}</strong><p>${escapeHtml(HR.welcome)}</p></div><p class="fictional-notice">${escapeHtml(HR.fictionalNotice)}</p></header>
      <div class="app-navigation"><div class="navigation-shell"><nav class="child-navigation" aria-label="${escapeHtml(HR.navigationLabel)}">${childNavigation}</nav>${parentUtility}</div></div>
      <div id="feedback" class="feedback${feedback ? " has-feedback" : ""}${reaction ? ` reaction-${reaction}` : ""}" role="status" aria-live="polite" aria-label="${escapeHtml(HR.feedbackLabel)}">${feedback ? `<span aria-hidden="true">🎉</span> ` : ""}${escapeHtml(feedback)}</div>
      <main id="main-content" tabindex="-1">${sections[activeView]}</main>`;
    if (focusIntent) {
      const target = root.querySelector<HTMLElement>(focusIntent) ?? root.querySelector<HTMLElement>("main");
      focusIntent = null;
      target?.focus({ preventScroll: true });
    }
  }

  function adventureEventFor(result: { state: AppStateV1; code: ResultCode }): AdventureEvent | null {
    const latest = result.state.activities.at(-1);
    const eventSequence = nextAdventureEventSequence(adventure);
    if (!latest || eventSequence === null) return null;
    if (result.code === "save-ok" && latest.code === "coins-saved") return { missionId: "saving", kind: "save", amount: latest.amount, eventSequence, accepted: true };
    if (result.code === "chore-approve-ok" && latest.code === "chore-reward-paid") return { missionId: "earning", kind: "chore-approval", amount: latest.amount, eventSequence, accepted: true };
    if ((result.code === "pet-purchase-ok" || result.code === "item-purchase-ok") && (latest.code === "pet-purchased" || latest.code === "item-purchased")) return { missionId: "purchase", kind: "purchase", amount: latest.amount, eventSequence, accepted: true };
    if (result.code === "borrow-ok" && latest.code === "coins-borrowed") return { missionId: "loan", kind: "borrow", amount: latest.amount, eventSequence, accepted: true };
    if (result.code === "repay-ok" && latest.code === "debt-repaid") return { missionId: "loan", kind: "repay", amount: latest.amount, eventSequence, accepted: true };
    return null;
  }

  function commit(result: { state: AppStateV1; code: ResultCode }, localMessage?: string): void {
    reaction = "";
    let resultMessage = localMessage ?? messageForCode(result.code);
    let completedMission = false;
    if (result.state !== state) {
      state = result.state;
      const saveCode = saveState(storage, state);
      resultMessage = saveCode ? LOAD_MESSAGES[saveCode] : resultMessage;
      const event = adventureEventFor(result);
      if (event) {
        const progress = recordAdventureEvent(adventure, event);
        if (progress.state !== adventure) {
          adventure = progress.state;
          const adventureSaveCode = saveAdventureState(storage, adventure);
          const progressFeedback = adventureSaveCode ? ADVENTURE_MESSAGES[adventureSaveCode] : adventureMessageForCode(progress.code);
          resultMessage = saveCode ? `${LOAD_MESSAGES[saveCode]} ${progressFeedback}` : progressFeedback;
          completedMission = progress.code === "adventure-mission-completed" || progress.code === "adventure-journey-completed";
          reaction = progress.code === "adventure-journey-completed" ? "complete" : completedMission ? "star" : "step";
        } else if (progress.code === "adventure-event-duplicate") resultMessage = adventureMessageForCode(progress.code);
      }
    }
    feedback = "";
    localResult = { view: activeView, message: resultMessage, completion: completedMission };
    focusIntent = completedMission ? `#local-completion-${activeView}` : `#local-result-${activeView}`;
    render();
  }

  function updateLoanPreview(input: HTMLInputElement): void {
    const action = input.closest<HTMLFormElement>("[data-form]")?.dataset.form;
    if (action !== "borrow" && action !== "repay") return;
    const amount = Number(input.value);
    const preview = root.querySelector<HTMLElement>(`[data-loan-preview="${action}"]`);
    if (!preview) return;
    preview.textContent = Number.isInteger(amount) && amount > 0
      ? action === "borrow"
        ? `Ako posudiš ${amount}: Novčanik +${amount}, Dug +${amount}.`
        : `Ako vratiš ${amount}: Novčanik −${amount}, Dug −${amount}.`
      : "";
  }

  function numberFrom(form: HTMLFormElement): number | null {
    const input = form.elements.namedItem("amount") as HTMLInputElement;
    const amount = Number(input.value);
    if (!input.value || !Number.isInteger(amount) || amount <= 0) {
      input.setCustomValidity(HR.formError);
      feedback = "";
      localResult = { view: activeView, message: HR.formError };
      invalidAmountForm = form.dataset.form ?? null;
      focusIntent = `[data-form="${form.dataset.form}"] input[name="amount"]`;
      render();
      return null;
    }
    input.setCustomValidity("");
    invalidAmountForm = null;
    return amount;
  }

  const clickHandler = (event: Event): void => {
    const target = (event.target as Element).closest<HTMLButtonElement>("button");
    if (!target) return;
    if (target.dataset.nav) {
      const nextView = target.dataset.nav as View;
      invalidateParentUnlock();
      if (activeView === "parent" && nextView !== "parent") {
        parentUnlocked = false;
        const currentAccess = inspectParentAccess(storage);
        parentMode = !cryptoAvailable ? "unavailable" : currentAccess.code === "setup-required" ? "unprovisioned" : currentAccess.code === "credential-present" ? "locked" : "unavailable";
      }
      activeView = nextView;
      localResult = null;
      reaction = "";
      feedback = parentMode === "unavailable" && activeView === "parent" ? HR.parentUnavailable : "";
      focusIntent = "h1[tabindex=\"-1\"]";
      render(); return;
    }
    if (target.dataset.quick) {
      const form = target.closest("form"); const input = form?.querySelector<HTMLInputElement>('input[name="amount"]');
      if (input) { input.value = target.dataset.quick; updateLoanPreview(input); input.focus(); }
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === "adventure-go" && target.dataset.view && ["money", "chores", "shop"].includes(target.dataset.view)) {
      activeView = target.dataset.view as View; localResult = null; feedback = ""; reaction = ""; focusIntent = "h1[tabindex=\"-1\"]"; render(); return;
    }
    if (action === "answer-adventure" && target.dataset.mission && target.dataset.answer && MISSION_IDS.includes(target.dataset.mission as MissionId) && ANSWER_IDS.includes(target.dataset.answer as (typeof ANSWER_IDS)[number])) {
      const mission = target.dataset.mission as MissionId;
      const progress = answerMission(adventure, mission, target.dataset.answer as (typeof ANSWER_IDS)[number]);
      if (progress.state !== adventure) {
        adventure = progress.state;
        const saveCode = saveAdventureState(storage, adventure);
        feedback = "";
        missionFeedback = { mission, outcome: "correct", message: saveCode ? ADVENTURE_MESSAGES[saveCode] : ADVENTURE_MISSIONS[mission].correctExplanation };
        const completedMission = progress.code === "adventure-mission-completed" || progress.code === "adventure-journey-completed";
        focusIntent = completedMission ? `#mission-completion-${mission}` : `#mission-checklist-${mission}`;
        reaction = progress.code === "adventure-journey-completed" ? "complete" : progress.code === "adventure-mission-completed" ? "star" : "correct";
      } else {
        feedback = "";
        missionFeedback = { mission, outcome: "wrong", message: progress.code === "adventure-answer-wrong" ? ADVENTURE_MISSIONS[mission].wrongExplanation : adventureMessageForCode(progress.code) };
        focusIntent = `[data-action="answer-adventure"][data-mission="${mission}"][data-answer="${target.dataset.answer}"]`;
        reaction = "";
      }
      render(); return;
    }
    if (action === "answer-practice") {
      const card = ADVENTURE_PRACTICE[practiceCardIndex];
      const answer = card.choices.find((choice) => choice.id === target.dataset.answer);
      if (!answer || target.dataset.card !== card.id) return;
      if (answer.id === card.correctAnswer) {
        correctPracticeCards.add(card.id);
        practiceFeedback = card.correctExplanation;
      } else practiceFeedback = card.wrongExplanation;
      render(); return;
    }
    if (action === "previous-practice" || action === "next-practice") {
      const nextIndex = practiceCardIndex + (action === "previous-practice" ? -1 : 1);
      if (nextIndex < 0 || nextIndex >= ADVENTURE_PRACTICE.length) return;
      practiceCardIndex = nextIndex;
      practiceFeedback = "";
      render(); return;
    }
    if (action === "answer-earnings-challenge") {
      const answeredRound = Number(target.dataset.round);
      if (!Number.isInteger(answeredRound) || answeredRound !== earningsChallengeRound || earningsChallengeRound >= EARNINGS_CHALLENGE.length) return;
      if (id === EARNINGS_CHALLENGE[earningsChallengeRound].correctId) {
        earningsChallengeRound += 1;
        earningsChallengeFeedback = earningsChallengeRound === EARNINGS_CHALLENGE.length ? HR.earningsChallengeComplete : HR.earningsChallengeCorrect;
      } else earningsChallengeFeedback = HR.earningsChallengeWrong;
      render(); return;
    }
    if (action === "set-shop-category" && SHOP_CATEGORY_IDS.includes(target.dataset.category as ShopCategory)) {
      shopCategory = target.dataset.category as ShopCategory;
      render(); return;
    }
    if (action === "toggle-shop-affordability") {
      shopAffordableOnly = !shopAffordableOnly;
      render(); return;
    }
    if (action === "reset-shop-filters") {
      shopCategory = "all";
      shopAffordableOnly = false;
      render(); return;
    }
    if (action === "care-pet" && target.dataset.petId && CARE_ACTION_IDS.includes(target.dataset.careAction as CareActionId)) {
      const actionId = target.dataset.careAction as CareActionId;
      const petId = target.dataset.petId;
      const retryKey = `${petId}:${actionId}`;
      const now = Date.now();
      const careEventId = uncertainCareEvents.get(retryKey) ?? `care_${now}_${String(careEventSequence++).padStart(4, "0")}`;
      const result = performCare(storage, progression, ownedPetIds(), { eventId: careEventId, petId, actionId, now });
      if (result.code === "care-storage-unavailable") uncertainCareEvents.set(retryKey, careEventId); else uncertainCareEvents.delete(retryKey);
      progression = result.state;
      careFeedback = `${CARE_RESULT_MESSAGES[result.code]}${result.receipt?.questCompleted ? ` ${HR.careQuestDone}` : ""}`;
      feedback = "";
      focusIntent = "#care-result";
      render(); return;
    }
    if (action === "lock-parent") { invalidateParentUnlock(); parentUnlocked = false; parentMode = "locked"; feedback = HR.parentLocked; reaction = ""; render(); return; }
    if ((action === "approve-chore" || action === "return-chore") && !parentUnlocked) { feedback = HR.parentDenied; render(); return; }
    if (action === "request-chore" && id) commit(requestChore(state, id));
    else if (action === "approve-chore" && id) commit(approveChore(state, Number(id)));
    else if (action === "return-chore" && id) commit(returnChore(state, Number(id)));
    else if (action === "buy-pet" && id) commit(buyPet(state, id));
    else if (action === "buy-item" && id) commit(buyItem(state, id));
    else if ((action === "move-pet" || action === "move-item") && target.dataset.slot) {
      const select = root.querySelector<HTMLSelectElement>(`[data-move-select="${target.dataset.slot}"]`);
      if (select?.value) commit(moveAsset(state, action === "move-pet" ? "pet" : "item", target.dataset.slot, select.value));
    } else if ((action === "remove-pet" || action === "remove-item") && target.dataset.slot) {
      commit(removeAsset(state, action === "remove-pet" ? "pet" : "item", target.dataset.slot));
    }
  };

  const inputHandler = (event: Event): void => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.name === "amount") updateLoanPreview(input);
  };

  const submitHandler = async (event: Event): Promise<void> => {
    const form = event.target as HTMLFormElement;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const action = form.dataset.form;
    if (action === "parent-setup") {
      if (pendingParentUnlock?.form === form) return;
      if (activeView !== "parent" || parentMode !== "unprovisioned" || root.querySelector('[data-form="parent-setup"]') !== form) return;
      if (!cryptoAvailable) { parentUnlocked = false; parentMode = "unavailable"; feedback = PARENT_ACCESS_MESSAGES["crypto-unavailable"]; render(); return; }
      const attempt = ++accessAttempt;
      pendingParentUnlock = { attempt, form };
      const pin = (form.elements.namedItem("pin") as HTMLInputElement | null)?.value ?? "";
      const confirmation = (form.elements.namedItem("confirmation") as HTMLInputElement | null)?.value ?? "";
      const result = await setupParentAccess(storage, crypto ?? undefined, pin, confirmation);
      if (pendingParentUnlock?.attempt !== attempt || pendingParentUnlock.form !== form || attempt !== accessAttempt || activeView !== "parent" || parentMode !== "unprovisioned" || root.querySelector('[data-form="parent-setup"]') !== form) return;
      pendingParentUnlock = null;
      parentUnlocked = result.unlocked;
      if (result.unlocked) parentMode = "unlocked";
      else if (["malformed-record", "unknown-version", "crypto-unavailable", "storage-unavailable"].includes(result.code)) parentMode = "unavailable";
      feedback = PARENT_ACCESS_MESSAGES[result.code];
      render();
      return;
    }
    if (action === "parent-unlock") {
      if (pendingParentUnlock?.form === form) return;
      if (activeView !== "parent" || parentMode !== "locked" || root.querySelector('[data-form="parent-unlock"]') !== form) return;
      if (!cryptoAvailable) { parentUnlocked = false; parentMode = "unavailable"; feedback = PARENT_ACCESS_MESSAGES["crypto-unavailable"]; render(); return; }
      const attempt = ++accessAttempt;
      pendingParentUnlock = { attempt, form };
      const pin = (form.elements.namedItem("pin") as HTMLInputElement | null)?.value ?? "";
      const result = await unlockParentAccess(storage, crypto ?? undefined, pin);
      if (
        pendingParentUnlock?.attempt !== attempt || pendingParentUnlock.form !== form ||
        attempt !== accessAttempt || activeView !== "parent" || parentMode !== "locked" ||
        root.querySelector('[data-form="parent-unlock"]') !== form
      ) return;
      pendingParentUnlock = null;
      parentUnlocked = result.unlocked;
      if (result.unlocked) parentMode = "unlocked";
      else if (result.code === "setup-required") parentMode = "unprovisioned";
      else if (["malformed-record", "unknown-version", "crypto-unavailable", "storage-unavailable"].includes(result.code)) parentMode = "unavailable";
      feedback = PARENT_ACCESS_MESSAGES[result.code];
      render();
      return;
    }
    if (action === "goal-plan") {
      const input = form.elements.namedItem("target") as HTMLInputElement | null;
      const target = Number(input?.value);
      if (!input?.value || !Number.isSafeInteger(target) || target <= 0) {
        input?.setCustomValidity(HR.goalTargetError);
        feedback = HR.goalTargetError;
        reaction = "";
        render();
        return;
      }
      const choreId = (form.elements.namedItem("chore") as HTMLSelectElement | null)?.value;
      const chore = CHORES.find(({ id }) => id === choreId);
      if (!chore) {
        feedback = HR.goalChoreError;
        reaction = "";
        render();
        return;
      }
      const available = Math.min(Number.MAX_SAFE_INTEGER, state.wallet + state.savings);
      const missing = Math.max(0, target - available);
      goalPlan = { target, choreId: chore.id, missing, approvals: Math.ceil(missing / chore.reward) };
      feedback = "";
      reaction = "";
      render();
      return;
    }
    if (action === "grant" && !parentUnlocked) { feedback = HR.parentDenied; render(); return; }
    if (["grant", "save", "withdraw", "borrow", "repay"].includes(action ?? "")) {
      const amount = numberFrom(form); if (amount === null) return;
      if (action === "grant") commit(grantCoins(state, amount));
      else if (action === "save") commit(saveCoins(state, amount));
      else if (action === "withdraw") commit(withdrawSavings(state, amount));
      else if (action === "borrow") commit(borrowCoins(state, amount));
      else commit(repayDebt(state, amount));
    } else if (action === "theme") {
      commit(selectTheme(state, (form.elements.namedItem("theme") as HTMLSelectElement).value));
    } else if ((action === "place-pet" || action === "place-item") && form.dataset.id) {
      const slot = (form.elements.namedItem("slot") as HTMLSelectElement).value;
      const placement = houseSlotPresentation(slot as HouseSlot);
      const isPet = action === "place-pet";
      const asset = isPet ? { kind: "pet" as const, id: Number(form.dataset.id) } : { kind: "item" as const, id: form.dataset.id };
      const result = slot ? placeAsset(state, asset, slot) : null;
      if (result) {
        const name = isPet ? petName(state, Number(form.dataset.id)) : itemName(form.dataset.id);
        const message = result.code === "house-place-ok" && placement ? `${name}. Postavljeno u: ${placement.areaName}.` : undefined;
        commit(result, message);
      }
    }
  };

  root.addEventListener("click", clickHandler);
  root.addEventListener("input", inputHandler);
  root.addEventListener("submit", submitHandler);
  render();
  return { getState: () => state, getAdventureState: () => adventure, getProgressionState: () => progression, destroy: () => { invalidateParentUnlock(); parentUnlocked = false; root.removeEventListener("click", clickHandler); root.removeEventListener("input", inputHandler); root.removeEventListener("submit", submitHandler); root.replaceChildren(); } };
}

export async function registerServiceWorker(locationUrl = globalThis.location?.href): Promise<"registered" | "unsupported" | "insecure" | "failed"> {
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!globalThis.isSecureContext && !locationUrl?.startsWith("http://localhost")) return "insecure";
  try {
    const workerUrl = new URL("/service-worker.js", locationUrl);
    if (workerUrl.origin !== new URL(locationUrl).origin) return "failed";
    await navigator.serviceWorker.register(workerUrl.pathname, { scope: "/" });
    return "registered";
  } catch { return "failed"; }
}

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  try {
    createApp(root, window.localStorage);
    void registerServiceWorker();
  } catch { root.innerHTML = `<p role="alert">${escapeHtml(HR.startupError)}</p>`; }
}
