import "./styles.css";
import { ACTIVITY_CODES, LOAD_CODES, RESULT_CODES, loadState, saveState, type AppStateV1, type ResultCode, type StorageLike } from "./game/store";
import { ADVENTURE_BADGES, ADVENTURE_MESSAGES, ADVENTURE_MISSIONS, CHORES, CONFIG, EARNINGS_CHALLENGE, HR, ITEMS, LOAD_MESSAGES, MONEY_SCHOOL, PARENT_ACCESS_MESSAGES, PETS, RESULT_MESSAGES, THEMES, activityMessage, adventureMessageForCode, messageForCode } from "./content/hr";
import { inspectParentAccess, unlockParentAccess } from "./game/parent-access";
import { borrowCoins, grantCoins, repayDebt, saveCoins, withdrawSavings } from "./game/money";
import { approveChore, requestChore, returnChore } from "./game/chores";
import { buyItem, buyPet } from "./game/shop";
import { moveAsset, placeAsset, removeAsset, selectTheme } from "./game/house";
import { ADVENTURE_LOAD_CODES, ADVENTURE_RESULT_CODES, ANSWER_IDS, BADGE_IDS, GLOSSARY_IDS, MISSION_IDS, answerMission, loadAdventureState, nextAdventureEventSequence, recordAdventureEvent, saveAdventureState, type AdventureEvent, type AdventureResultCode, type AdventureStateV1, type MissionId } from "./game/adventure";

export { ACTIVITY_CODES, LOAD_CODES, RESULT_CODES, ADVENTURE_LOAD_CODES, ADVENTURE_RESULT_CODES, MISSION_IDS, ANSWER_IDS, BADGE_IDS, GLOSSARY_IDS, activityMessage, adventureMessageForCode, messageForCode };

type View = "adventure" | "money" | "chores" | "shop" | "house" | "parent";
const views: Array<{ id: View; label: string }> = [
  { id: "adventure", label: HR.navAdventure },
  { id: "money", label: HR.navMoney },
  { id: "chores", label: HR.navChores },
  { id: "shop", label: HR.navShop },
  { id: "house", label: HR.navHouse },
  { id: "parent", label: HR.navParent },
];

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function balanceCard(label: string, amount: number, id: string): string {
  return `<article class="balance-card" aria-describedby="balance-help"><h2>${escapeHtml(label)}</h2><strong id="${id}" role="meter" aria-valuemin="0" aria-valuemax="${Math.max(CONFIG.debtLimit, amount)}" aria-valuenow="${amount}" aria-label="${escapeHtml(HR.balanceAccessible(label, amount))}" aria-valuetext="${escapeHtml(HR.balanceValue(amount))}">${escapeHtml(HR.balanceValue(amount))}</strong></article>`;
}

function amountForm(action: string, button: string, helpId?: string): string {
  const describedBy = helpId ? ` aria-describedby="${helpId}"` : "";
  return `<form class="amount-form" data-form="${action}" novalidate>
    <label for="amount-${action}">${escapeHtml(HR.amountLabel)}</label>
    <input id="amount-${action}" name="amount" type="number" inputmode="numeric" min="1" step="1" placeholder="${escapeHtml(HR.amountPlaceholder)}"${describedBy} />
    <div class="quick-amounts" role="group" aria-label="${escapeHtml(HR.quickAmountsLabel)}">${CONFIG.quickAmounts.map((amount) => `<button type="button" data-quick="${amount}" aria-label="${escapeHtml(HR.balanceValue(amount))}">${escapeHtml(HR.balanceValue(amount))}</button>`).join("")}</div>
    <button class="primary" type="submit">${escapeHtml(button)}</button>
  </form>`;
}

function statusForChore(state: AppStateV1, choreId: string): string {
  const latest = [...state.choreRequests].reverse().find((request) => request.choreId === choreId);
  if (!latest || latest.status === "returned") return HR.statusTodo;
  return latest.status === "pending" ? HR.statusPending : HR.statusApproved;
}

function missionTarget(mission: MissionId): Exclude<View, "adventure" | "house" | "parent"> {
  if (mission === "earning") return "chores";
  if (mission === "purchase") return "shop";
  return "money";
}

function adventureScene(view: Exclude<View, "parent">): string {
  const symbol: Record<Exclude<View, "parent">, string> = { adventure: "🗺️", money: "🐷", chores: "🌻", shop: "🎪", house: "🏡" };
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

function renderAdventure(adventure: AdventureStateV1): string {
  const active = adventure.activeMission;
  const stops = MISSION_IDS.map((mission, index) => {
    const content = ADVENTURE_MISSIONS[mission];
    const completed = adventure.completedMissions.includes(mission);
    const current = active === mission;
    const status = completed ? HR.missionCompleted : current ? HR.missionCurrent : HR.missionLocked;
    return `<article class="journey-stop ${completed ? "is-completed" : current ? "is-current" : "is-locked"}" data-mission-stop="${mission}"><span class="stop-number" aria-hidden="true">${completed ? "⭐" : index + 1}</span><h2>${escapeHtml(content.title)}</h2><p>${escapeHtml(content.story)}</p><strong>${escapeHtml(status)}</strong></article>`;
  }).join("");
  const badgeShelf = MISSION_IDS.map((mission) => {
    const badge = ADVENTURE_BADGES[{ saving: "piggy-bank", earning: "helping-paw", purchase: "smart-shopper", loan: "debt-expert" }[mission] as keyof typeof ADVENTURE_BADGES];
    const earned = adventure.completedMissions.includes(mission);
    return `<article class="badge ${earned ? "is-earned" : "is-locked"}" data-badge="${mission}"><span aria-hidden="true">${earned ? badge.emoji : "🔒"}</span><strong>${escapeHtml(badge.name)}</strong><p>${escapeHtml(earned ? badge.description : HR.badgeLocked)}</p></article>`;
  }).join("");
  let missionCard = `<section class="mission-card journey-complete"><h2>${escapeHtml(HR.journeyCompleted)}</h2><p>${escapeHtml(ADVENTURE_MESSAGES["adventure-journey-completed"])}</p></section>`;
  if (active) {
    const content = ADVENTURE_MISSIONS[active];
    const answered = adventure.correctAnswers.includes(active);
    missionCard = `<section class="mission-card" data-active-mission="${active}"><p class="eyebrow">${escapeHtml(HR.missionCurrent)}</p><h2>${escapeHtml(content.title)}</h2><p class="mission-story">${escapeHtml(content.story)}</p><p><strong>${escapeHtml(content.instruction)}</strong></p>
      <section class="question-card"><h3>${escapeHtml(HR.questionHeading)}</h3><p>${escapeHtml(content.question)}</p><div class="answer-grid">${content.choices.map((choice) => `<button data-action="answer-adventure" data-mission="${active}" data-answer="${choice.id}" aria-label="${escapeHtml(`${HR.answerButton}: ${choice.label}`)}" ${answered ? "disabled" : ""}>${escapeHtml(choice.label)}</button>`).join("")}</div></section>
      <section class="checklist"><h3>${escapeHtml(HR.checklistHeading)}</h3><ul><li class="${answered ? "done" : "todo"}"><span aria-hidden="true">${answered ? "✅" : "⬜"}</span> ${escapeHtml(HR.knowledgeStep)} — ${escapeHtml(answered ? HR.stepDone : HR.stepTodo)}</li>${content.actionSteps.map((step, index) => { const done = actionStepDone(adventure, active, index); return `<li class="${done ? "done" : "todo"}"><span aria-hidden="true">${done ? "✅" : "⬜"}</span> ${escapeHtml(step)} — ${escapeHtml(done ? HR.stepDone : HR.stepTodo)}</li>`; }).join("")}</ul><button class="primary" data-action="adventure-go" data-view="${missionTarget(active)}">${escapeHtml(HR.goToAction)}</button></section></section>`;
  }
  const school = GLOSSARY_IDS.map((id) => { const topic = MONEY_SCHOOL[id]; return `<details class="school-topic"><summary>${escapeHtml(topic.title)}</summary><p>${escapeHtml(topic.definition)}</p><p><strong>${escapeHtml(HR.exampleLabel)}:</strong> ${escapeHtml(topic.example)}</p></details>`; }).join("");
  return `<section id="view-adventure" class="view" data-view="adventure">${adventureScene("adventure")}<div class="guide-card"><span aria-hidden="true">🐶</span><div><h1>${escapeHtml(HR.adventureHeading)}</h1><p><strong>${escapeHtml(HR.adventureGuide)}</strong> — ${escapeHtml(HR.adventureGuideText)}</p><p>${escapeHtml(HR.adventureIntro)}</p></div></div>
    <section class="progress-banner" aria-label="${escapeHtml(HR.starsLabel)}"><span aria-hidden="true">${"⭐".repeat(adventure.stars)}${"☆".repeat(4 - adventure.stars)}</span><strong>${escapeHtml(HR.starsValue(adventure.stars))}</strong></section>
    <section aria-label="${escapeHtml(HR.adventureMapLabel)}"><div class="journey-path">${stops}</div></section>${missionCard}
    <section><h2>${escapeHtml(HR.badgesHeading)}</h2><div class="badge-shelf">${badgeShelf}</div></section>
    <section class="money-school"><h2>${escapeHtml(HR.moneySchoolHeading)}</h2><p>${escapeHtml(HR.moneySchoolIntro)}</p><div class="school-grid">${school}</div></section></section>`;
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

function renderMoney(state: AppStateV1, adventure: AdventureStateV1, goalPlan: GoalPlanResult | null): string {
  const activities = state.activities.slice(-5).reverse();
  return `<section id="view-money" class="view" data-view="money">${adventureScene("money")}
    <h1>${escapeHtml(HR.moneyHeading)}</h1><p>${escapeHtml(HR.moneyIntro)}</p>${currentMissionPanel(adventure)}
    <p id="balance-help" class="sr-only">${escapeHtml(HR.balanceDescription)}</p>
    <div class="balances">${balanceCard(HR.wallet, state.wallet, "wallet-value")}${balanceCard(HR.savings, state.savings, "savings-value")}${balanceCard(HR.debt, state.debt, "debt-value")}</div>
    ${renderGoalPlanner(goalPlan)}
    <div class="money-actions">
      <article class="panel"><p id="saving-help">${escapeHtml(HR.savingHelp)}</p>${amountForm("save", HR.saveButton, "saving-help")}${amountForm("withdraw", HR.withdrawButton, "saving-help")}</article>
      <article class="panel"><p id="loan-help">${escapeHtml(HR.loanHelp)}</p>${amountForm("borrow", HR.borrowButton, "loan-help")}${amountForm("repay", HR.repayButton, "loan-help")}</article>
    </div>
    <section class="panel"><h2>${escapeHtml(HR.activityHeading)}</h2>${activities.length ? `<ol class="activity-list">${activities.map((activity) => `<li>${escapeHtml(activityMessage(activity))}</li>`).join("")}</ol>` : `<p data-empty="activity">${escapeHtml(RESULT_MESSAGES["activity-empty"])}</p>`}</section>
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

function renderChores(state: AppStateV1, adventure: AdventureStateV1, challengeRound: number, challengeFeedback: string): string {
  return `<section id="view-chores" class="view" data-view="chores">${adventureScene("chores")}
    <h1>${escapeHtml(HR.choresHeading)}</h1><p>${escapeHtml(HR.choresIntro)}</p>${currentMissionPanel(adventure)}
    ${renderEarningsChallenge(challengeRound, challengeFeedback)}
    <div class="card-grid">${CHORES.map((chore) => {
      const pending = state.choreRequests.some((request) => request.choreId === chore.id && request.status === "pending");
      const status = statusForChore(state, chore.id);
      return `<article class="catalog-card"><h2>${escapeHtml(chore.name)}</h2><p>${escapeHtml(HR.labeledValue(HR.rewardLabel, HR.rewardValue(chore.reward)))}</p><p><strong>${escapeHtml(HR.labeledValue(HR.statusLabel, status))}</strong></p><button class="primary" data-action="request-chore" data-id="${chore.id}" aria-label="${escapeHtml(HR.choreAccessible(chore.name))}" ${pending ? "disabled" : ""}>${escapeHtml(HR.doneButton)}</button></article>`;
    }).join("")}</div>
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
  const reason = owned ? HR.ownedLabel : !affordable ? HR.unaffordableLabel : "";
  const alt = kind === "pet" ? HR.petImageAlt(entry.name) : HR.itemImageAlt(entry.name);
  return `<article class="catalog-card" data-shop-entry="${entry.id}" data-shop-family="${category}">
    <span class="catalog-emoji" role="img" aria-label="${escapeHtml(alt)}">${entry.emoji}</span>
    <h3>${escapeHtml(entry.name)}</h3><p><strong>${escapeHtml(HR.labeledValue(HR.priceLabel, HR.priceValue(entry.price)))}</strong></p>
    ${reason ? `<p class="reason">${escapeHtml(reason)}</p>` : ""}
    <button class="primary" data-action="buy-${kind}" data-id="${entry.id}" aria-label="${escapeHtml(HR.buyAccessible(entry.name, entry.price))}" ${owned || !affordable ? "disabled" : ""}>${escapeHtml(HR.buyButton)}</button>
  </article>`;
}

function renderShop(state: AppStateV1, adventure: AdventureStateV1, category: ShopCategory, affordableOnly: boolean): string {
  const entries = shopCatalogEntries();
  const visibleEntries = entries.filter(({ kind, category: entryCategory, entry }) => {
    if (category !== "all" && entryCategory !== category) return false;
    if (!affordableOnly) return true;
    return entry.price <= state.wallet && (kind !== "pet" || !state.ownedPets.some(({ catalogId }) => catalogId === entry.id));
  });
  const inventoryItems = ITEMS.filter(({ id }) => (state.itemQuantities[id] ?? 0) > 0);
  const categoryControls = SHOP_CATEGORY_IDS.map((id) => {
    const selected = category === id;
    return `<button type="button" data-action="set-shop-category" data-category="${id}" aria-pressed="${selected}"><span>${escapeHtml(SHOP_CATEGORY_LABELS[id])}</span>${selected ? `<span class="filter-check" aria-hidden="true">✓</span><span class="sr-only">Odabrano</span>` : ""}</button>`;
  }).join("");
  return `<section id="view-shop" class="view" data-view="shop">${adventureScene("shop")}
    <h1>${escapeHtml(HR.shopHeading)}</h1><p>${escapeHtml(HR.shopIntro)}</p>${currentMissionPanel(adventure)}
    <fieldset class="panel shop-filters"><legend>Filtriraj ponudu</legend>
      <div class="shop-category-controls" role="group" aria-label="Kategorije ponude">${categoryControls}</div>
      <button type="button" class="affordability-filter" data-action="toggle-shop-affordability" aria-pressed="${affordableOnly}"><span>Mogu kupiti</span>${affordableOnly ? `<span class="filter-check" aria-hidden="true">✓</span><span class="sr-only">Uključeno</span>` : ""}</button>
    </fieldset>
    <section aria-labelledby="shop-results-heading"><h2 id="shop-results-heading">${escapeHtml(SHOP_CATEGORY_LABELS[category])}</h2>
      <div id="shop-results" class="card-grid shop-results">${visibleEntries.map(({ kind, entry, category: entryCategory }) => renderCatalogCard(kind, entry, state, entryCategory)).join("")}</div>
      ${visibleEntries.length ? "" : `<div class="panel shop-empty" role="status"><p>Nema ponuda koje odgovaraju odabranim filtrima.</p><button type="button" data-action="reset-shop-filters">Prikaži sve</button></div>`}
    </section>
    <section class="panel" data-shop-inventory><h2>${escapeHtml(HR.inventoryHeading)}</h2>
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

function slotOptions(slots: string[], prefix: "pet" | "item", state: AppStateV1, exclude?: string): string {
  const placements = prefix === "pet" ? state.petPlacements : state.itemPlacements;
  return slots.filter((slot) => slot !== exclude && placements[slot] === null).map((slot) => `<option value="${slot}">${escapeHtml(HR.slotName(Number(slot.split("-")[1])))}</option>`).join("");
}

function renderPlacedSlot(kind: "pet" | "item", slot: string, value: number | string | null, state: AppStateV1): string {
  const number = Number(slot.split("-")[1]);
  if (value === null) return `<article class="house-slot"><h3>${escapeHtml(HR.slotName(number))}</h3><p>${escapeHtml(HR.emptySlot)}</p></article>`;
  const name = kind === "pet" ? petName(state, value as number) : itemName(value as string);
  const slots = kind === "pet" ? Object.keys(state.petPlacements) : Object.keys(state.itemPlacements);
  return `<article class="house-slot"><h3>${escapeHtml(HR.slotName(number))}</h3><p><strong>${escapeHtml(name)}</strong></p>
    <label for="move-${slot}">${escapeHtml(HR.moveLabel)}</label><select id="move-${slot}" data-move-select="${slot}">${slotOptions(slots, kind, state, slot)}</select>
    <div class="slot-actions"><button data-action="move-${kind}" data-slot="${slot}" aria-label="${escapeHtml(HR.moveAccessible(name))}">${escapeHtml(HR.moveButton)}</button><button data-action="remove-${kind}" data-slot="${slot}" aria-label="${escapeHtml(HR.removeAccessible(name))}">${escapeHtml(HR.removeButton)}</button></div>
  </article>`;
}

function renderHouse(state: AppStateV1, adventure: AdventureStateV1): string {
  const petSlots = Object.keys(state.petPlacements);
  const itemSlots = Object.keys(state.itemPlacements);
  const unplacedPets = state.ownedPets.filter(({ id }) => !Object.values(state.petPlacements).includes(id));
  const unplacedItems = ITEMS.filter(({ id }) => (state.itemQuantities[id] ?? 0) > Object.values(state.itemPlacements).filter((placed) => placed === id).length);
  const hasFreePetSlot = Object.values(state.petPlacements).includes(null);
  const hasFreeItemSlot = Object.values(state.itemPlacements).includes(null);
  return `<section id="view-house" class="view theme-${state.selectedTheme}" data-view="house">${adventureScene("house")}
    <h1>${escapeHtml(HR.houseHeading)}</h1><p>${escapeHtml(HR.houseIntro)}</p><span class="decoration" aria-hidden="true">✨</span>${currentMissionPanel(adventure)}
    <form data-form="theme" class="panel inline-form"><label for="theme">${escapeHtml(HR.themeLabel)}</label><select id="theme" name="theme">${THEMES.map((theme) => `<option value="${theme.id}" ${theme.id === state.selectedTheme ? "selected" : ""}>${escapeHtml(theme.name)}</option>`).join("")}</select><button class="primary" type="submit">${escapeHtml(HR.selectThemeButton)}</button></form>
    <h2>${escapeHtml(HR.petSlotsHeading)}</h2><div class="house-grid">${petSlots.map((slot) => renderPlacedSlot("pet", slot, state.petPlacements[slot], state)).join("")}</div>
    <h2>${escapeHtml(HR.itemSlotsHeading)}</h2><div class="house-grid">${itemSlots.map((slot) => renderPlacedSlot("item", slot, state.itemPlacements[slot], state)).join("")}</div>
    <section class="panel"><h2>${escapeHtml(HR.unplacedPets)}</h2>${unplacedPets.length ? unplacedPets.map((pet) => {
      const name = petName(state, pet.id); return `<form data-form="place-pet" data-id="${pet.id}" class="inline-form"><label for="pet-slot-${pet.id}">${escapeHtml(name)}</label><select id="pet-slot-${pet.id}" name="slot" aria-label="${escapeHtml(HR.slotLabel)}">${slotOptions(petSlots, "pet", state)}</select><button class="primary" type="submit" aria-label="${escapeHtml(HR.placeAccessible(name, HR.houseHeading))}" ${hasFreePetSlot ? "" : "disabled"}>${escapeHtml(HR.placeButton)}</button>${hasFreePetSlot ? "" : `<p>${escapeHtml(HR.houseFull)}</p>`}</form>`;
    }).join("") : `<p>${escapeHtml(RESULT_MESSAGES["pet-inventory-empty"])}</p>`}
    <h2>${escapeHtml(HR.unplacedItems)}</h2>${unplacedItems.length ? unplacedItems.map((item) => `<form data-form="place-item" data-id="${item.id}" class="inline-form"><label for="item-slot-${item.id}">${escapeHtml(HR.inventoryDetails(item.name, state.itemQuantities[item.id] - Object.values(state.itemPlacements).filter((placed) => placed === item.id).length))}</label><select id="item-slot-${item.id}" name="slot" aria-label="${escapeHtml(HR.slotLabel)}">${slotOptions(itemSlots, "item", state)}</select><button class="primary" type="submit" aria-label="${escapeHtml(HR.placeAccessible(item.name, HR.houseHeading))}" ${hasFreeItemSlot ? "" : "disabled"}>${escapeHtml(HR.placeButton)}</button>${hasFreeItemSlot ? "" : `<p>${escapeHtml(HR.houseFull)}</p>`}</form>`).join("") : `<p>${escapeHtml(RESULT_MESSAGES["item-inventory-empty"])}</p>`}</section>
  </section>`;
}

type ParentMode = "unprovisioned" | "locked" | "unavailable" | "unlocked";

function pinInput(id: string, name: string, label: string, autocomplete: "new-password" | "current-password"): string {
  return `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" name="${name}" type="password" inputmode="numeric" autocomplete="${autocomplete}" pattern="[0-9]{6}" minlength="6" maxlength="6" aria-describedby="parent-pin-help" required />`;
}

function renderParent(state: AppStateV1, mode: ParentMode): string {
  const heading = `<h1>${escapeHtml(HR.parentHeading)}</h1><p>${escapeHtml(HR.parentIntro)}</p><span class="parent-decoration" aria-hidden="true">🔐✨</span>`;
  if (mode === "unavailable") return `<section id="view-parent" class="view parent-view parent-locked" data-view="parent">${heading}<section class="panel access-panel"><h2>${escapeHtml(HR.parentUnavailableHeading)}</h2><p role="alert">${escapeHtml(HR.parentUnavailable)}</p><p>${escapeHtml(HR.parentLocalNotice)}</p></section></section>`;
  if (mode === "unprovisioned") return `<section id="view-parent" class="view parent-view parent-locked" data-view="parent">${heading}<section class="panel access-panel"><h2>${escapeHtml(HR.parentUnprovisionedHeading)}</h2><p role="alert">${escapeHtml(HR.parentUnprovisioned)}</p><p>${escapeHtml(HR.parentLocalNotice)}</p></section></section>`;
  if (mode === "locked") return `<section id="view-parent" class="view parent-view parent-locked" data-view="parent">${heading}<section class="panel access-panel"><h2>${escapeHtml(HR.parentUnlockHeading)}</h2><p>${escapeHtml(HR.parentUnlockIntro)}</p><p id="parent-pin-help">${escapeHtml(HR.parentPinDescription)}</p><form class="pin-form" data-form="parent-unlock" novalidate>${pinInput("parent-pin", "pin", HR.parentPinLabel, "current-password")}<button class="primary" type="submit">${escapeHtml(HR.parentUnlockButton)}</button></form><p class="local-notice">${escapeHtml(HR.parentLocalNotice)}</p><p>${escapeHtml(HR.parentForgotten)}</p></section></section>`;

  const pending = state.choreRequests.filter(({ status }) => status === "pending");
  return `<section id="view-parent" class="view parent-view parent-unlocked" data-view="parent">${heading}<button class="lock-button" data-action="lock-parent" aria-label="${escapeHtml(HR.parentLockAccessible)}">${escapeHtml(HR.parentLockButton)}</button>
    <section class="panel"><h2>${escapeHtml(HR.grantHeading)}</h2>${amountForm("grant", HR.grantButton)}</section>
    <section class="panel"><h2>${escapeHtml(HR.pendingHeading)}</h2>${pending.length ? pending.map((request) => {
      const chore = CHORES.find(({ id }) => id === request.choreId); const name = chore?.name ?? HR.genericError;
      return `<article class="request"><p><strong>${escapeHtml(chore ? HR.choreDetails(chore.name, chore.reward) : HR.genericError)}</strong></p><div><button class="primary" data-action="approve-chore" data-id="${request.id}" aria-label="${escapeHtml(HR.approveAccessible(name))}">${escapeHtml(HR.approveButton)}</button><button data-action="return-chore" data-id="${request.id}" aria-label="${escapeHtml(HR.returnAccessible(name))}">${escapeHtml(HR.returnButton)}</button></div></article>`;
    }).join("") : `<p data-empty="requests">${escapeHtml(RESULT_MESSAGES["chore-requests-empty"])}</p>`}</section>
  </section>`;
}

export interface AppController { getState(): AppStateV1; getAdventureState(): AdventureStateV1; destroy(): void }

export function createApp(
  root: HTMLElement,
  storage: StorageLike,
  crypto: Crypto | null = globalThis.crypto,
  secureContext: boolean = globalThis.isSecureContext === true,
): AppController {
  const loaded = loadState(storage);
  const loadedAdventure = loadAdventureState(storage);
  const access = inspectParentAccess(storage);
  const cryptoAvailable = Boolean(secureContext && crypto?.subtle && typeof crypto.getRandomValues === "function");
  let state = loaded.state;
  let adventure = loadedAdventure.state;
  let activeView: View = "adventure";
  let parentMode: ParentMode = !cryptoAvailable ? "unavailable" : access.code === "setup-required" ? "unprovisioned" : access.code === "credential-present" ? "locked" : "unavailable";
  let parentUnlocked = false;
  let accessAttempt = 0;
  let earningsChallengeRound = 0;
  let earningsChallengeFeedback = "";
  let goalPlan: GoalPlanResult | null = null;
  let shopCategory: ShopCategory = "all";
  let shopAffordableOnly = false;
  const adventureLoadFeedback = loadedAdventure.code && loadedAdventure.code !== "adventure-load-empty" ? ADVENTURE_MESSAGES[loadedAdventure.code] : "";
  let feedback = loaded.code && loaded.code !== "load-empty" ? LOAD_MESSAGES[loaded.code] : adventureLoadFeedback || (loaded.code ? LOAD_MESSAGES[loaded.code] : "");
  let reaction: "correct" | "step" | "star" | "complete" | "" = "";

  function render(): void {
    const sections: Record<View, string> = { adventure: renderAdventure(adventure), money: renderMoney(state, adventure, goalPlan), chores: renderChores(state, adventure, earningsChallengeRound, earningsChallengeFeedback), shop: renderShop(state, adventure, shopCategory, shopAffordableOnly), house: renderHouse(state, adventure), parent: renderParent(state, parentMode) };
    root.innerHTML = `<a class="skip-link" href="#main-content">${escapeHtml(HR.skipLink)}</a><header class="app-header"><div><span class="logo" aria-hidden="true">🐾</span><strong>${escapeHtml(HR.appName)}</strong><p>${escapeHtml(HR.welcome)}</p></div><p class="fictional-notice">${escapeHtml(HR.fictionalNotice)}</p></header>
      <nav aria-label="${escapeHtml(HR.navigationLabel)}">${views.map((view) => `<button data-nav="${view.id}" ${view.id === activeView ? `class="active" aria-current="page"` : ""}><span>${escapeHtml(view.label)}</span>${view.id === activeView ? `<span class="sr-only">${escapeHtml(HR.currentView)}</span>` : ""}</button>`).join("")}</nav>
      <div id="feedback" class="feedback${feedback ? " has-feedback" : ""}${reaction ? ` reaction-${reaction}` : ""}" role="status" aria-live="polite" aria-label="${escapeHtml(HR.feedbackLabel)}">${feedback ? `<span aria-hidden="true">🎉</span> ` : ""}${escapeHtml(feedback)}</div>
      <main id="main-content" tabindex="-1">${sections[activeView]}</main>`;
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

  function commit(result: { state: AppStateV1; code: ResultCode }): void {
    reaction = "";
    if (result.state !== state) {
      state = result.state;
      const saveCode = saveState(storage, state);
      feedback = saveCode ? LOAD_MESSAGES[saveCode] : messageForCode(result.code);
      const event = adventureEventFor(result);
      if (event) {
        const progress = recordAdventureEvent(adventure, event);
        if (progress.state !== adventure) {
          adventure = progress.state;
          const adventureSaveCode = saveAdventureState(storage, adventure);
          const progressFeedback = adventureSaveCode ? ADVENTURE_MESSAGES[adventureSaveCode] : adventureMessageForCode(progress.code);
          feedback = saveCode ? `${LOAD_MESSAGES[saveCode]} ${progressFeedback}` : progressFeedback;
          reaction = progress.code === "adventure-journey-completed" ? "complete" : progress.code === "adventure-mission-completed" ? "star" : "step";
        } else if (progress.code === "adventure-event-duplicate") feedback = adventureMessageForCode(progress.code);
      }
    } else feedback = messageForCode(result.code);
    render();
  }

  function numberFrom(form: HTMLFormElement): number | null {
    const input = form.elements.namedItem("amount") as HTMLInputElement;
    const amount = Number(input.value);
    if (!input.value || !Number.isInteger(amount) || amount <= 0) {
      input.setCustomValidity(HR.formError);
      feedback = HR.formError;
      input.reportValidity();
      render();
      return null;
    }
    input.setCustomValidity("");
    return amount;
  }

  const clickHandler = (event: Event): void => {
    const target = (event.target as Element).closest<HTMLButtonElement>("button");
    if (!target) return;
    if (target.dataset.nav) {
      const nextView = target.dataset.nav as View;
      if (activeView === "parent" && nextView !== "parent") {
        accessAttempt += 1;
        parentUnlocked = false;
        const currentAccess = inspectParentAccess(storage);
        parentMode = !cryptoAvailable ? "unavailable" : currentAccess.code === "setup-required" ? "unprovisioned" : currentAccess.code === "credential-present" ? "locked" : "unavailable";
      }
      activeView = nextView;
      reaction = "";
      feedback = parentMode === "unavailable" && activeView === "parent" ? HR.parentUnavailable : "";
      render(); return;
    }
    if (target.dataset.quick) {
      const form = target.closest("form"); const input = form?.querySelector<HTMLInputElement>('input[name="amount"]');
      if (input) { input.value = target.dataset.quick; input.focus(); }
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === "adventure-go" && target.dataset.view && ["money", "chores", "shop"].includes(target.dataset.view)) {
      activeView = target.dataset.view as View; feedback = ""; reaction = ""; render(); return;
    }
    if (action === "answer-adventure" && target.dataset.mission && target.dataset.answer && MISSION_IDS.includes(target.dataset.mission as MissionId) && ANSWER_IDS.includes(target.dataset.answer as (typeof ANSWER_IDS)[number])) {
      const mission = target.dataset.mission as MissionId;
      const progress = answerMission(adventure, mission, target.dataset.answer as (typeof ANSWER_IDS)[number]);
      if (progress.state !== adventure) {
        adventure = progress.state;
        const saveCode = saveAdventureState(storage, adventure);
        feedback = saveCode ? ADVENTURE_MESSAGES[saveCode] : progress.code === "adventure-answer-correct" ? ADVENTURE_MISSIONS[mission].correctExplanation : adventureMessageForCode(progress.code);
        reaction = progress.code === "adventure-journey-completed" ? "complete" : progress.code === "adventure-mission-completed" ? "star" : "correct";
      } else {
        feedback = progress.code === "adventure-answer-wrong" ? ADVENTURE_MISSIONS[mission].wrongExplanation : adventureMessageForCode(progress.code);
        reaction = "";
      }
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
    if (action === "lock-parent") { accessAttempt += 1; parentUnlocked = false; parentMode = "locked"; feedback = HR.parentLocked; reaction = ""; render(); return; }
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

  const submitHandler = async (event: Event): Promise<void> => {
    const form = event.target as HTMLFormElement;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const action = form.dataset.form;
    if (action === "parent-unlock") {
      if (!cryptoAvailable) { parentUnlocked = false; parentMode = "unavailable"; feedback = PARENT_ACCESS_MESSAGES["crypto-unavailable"]; render(); return; }
      const attempt = ++accessAttempt;
      const pin = (form.elements.namedItem("pin") as HTMLInputElement | null)?.value ?? "";
      const result = await unlockParentAccess(storage, crypto ?? undefined, pin);
      if (attempt !== accessAttempt || activeView !== "parent") {
        parentUnlocked = false;
        if (result.unlocked) parentMode = "locked";
        return;
      }
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
      if (slot) commit(placeAsset(state, action === "place-pet" ? { kind: "pet", id: Number(form.dataset.id) } : { kind: "item", id: form.dataset.id }, slot));
    }
  };

  root.addEventListener("click", clickHandler);
  root.addEventListener("submit", submitHandler);
  render();
  return { getState: () => state, getAdventureState: () => adventure, destroy: () => { accessAttempt += 1; parentUnlocked = false; root.removeEventListener("click", clickHandler); root.removeEventListener("submit", submitHandler); root.replaceChildren(); } };
}

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  try { createApp(root, window.localStorage); }
  catch { root.innerHTML = `<p role="alert">${escapeHtml(HR.startupError)}</p>`; }
}
