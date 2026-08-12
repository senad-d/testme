// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { createApp, messageForCode, ACTIVITY_CODES, LOAD_CODES, RESULT_CODES, ADVENTURE_LOAD_CODES, ADVENTURE_RESULT_CODES, activityMessage, adventureMessageForCode } from "./main";
import { ADVENTURE_MESSAGES, ADVENTURE_PRACTICE, CHORES, EARNINGS_CHALLENGE, HOUSE_AREA_CONTENT, HR, ITEMS, PARENT_ACCESS_MESSAGES, PETS, THEMES, houseAreaContent } from "./content/hr";
import { STORAGE_KEY, initialState, type StorageLike } from "./game/store";
import { PARENT_ACCESS_CODES, PARENT_ACCESS_KEY, setupParentAccess } from "./game/parent-access";
import { ADVENTURE_STORAGE_KEY, initialAdventureState } from "./game/adventure";
import { HOUSE_AREAS } from "./game/house";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

let root: HTMLElement;
let storage: MemoryStorage;

beforeEach(() => {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  Object.defineProperty(globalThis, "isSecureContext", { value: true, configurable: true });
  document.documentElement.lang = "hr";
  document.body.innerHTML = '<div id="app"></div>';
  root = document.querySelector("#app")!;
  storage = new MemoryStorage();
});

function click(selector: string): void {
  const element = root.querySelector<HTMLButtonElement>(selector);
  expect(element, selector).not.toBeNull();
  element!.click();
}

function submit(formSelector: string, amount?: number): void {
  const form = root.querySelector<HTMLFormElement>(formSelector);
  expect(form, formSelector).not.toBeNull();
  if (amount !== undefined) (form!.elements.namedItem("amount") as HTMLInputElement).value = String(amount);
  form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function submitGoal(target: string, choreId: string): void {
  const form = root.querySelector<HTMLFormElement>('[data-form="goal-plan"]');
  expect(form).not.toBeNull();
  (form!.elements.namedItem("target") as HTMLInputElement).value = target;
  (form!.elements.namedItem("chore") as HTMLSelectElement).value = choreId;
  form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

async function waitForText(text: string): Promise<void> {
  const started = Date.now();
  while (!(root.textContent ?? "").includes(text) && Date.now() - started < 3000) await new Promise((resolve) => setTimeout(resolve, 10));
  expect(root.textContent).toContain(text);
}

async function submitPin(formSelector: string, pin: string): Promise<void> {
  const form = root.querySelector<HTMLFormElement>(formSelector);
  expect(form, formSelector).not.toBeNull();
  (form!.elements.namedItem("pin") as HTMLInputElement).value = pin;
  form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  const started = Date.now();
  while (root.querySelector(formSelector) && Date.now() - started < 3000) await new Promise((resolve) => setTimeout(resolve, 10));
}

async function provisionParentAccess(pin = "246810"): Promise<void> {
  expect(await setupParentAccess(storage, webcrypto as unknown as Crypto, pin, pin)).toEqual({ code: "setup-success", unlocked: true });
}

function expectParentProtectedContentAbsent(): void {
  expect(root.querySelector("[data-parent-overview]")).toBeNull();
  expect(root.querySelector("[data-parent-recent]")).toBeNull();
  expect(root.querySelector('[data-form="grant"]')).toBeNull();
  expect(root.querySelector('[data-action="approve-chore"]')).toBeNull();
  expect(root.querySelector('[data-action="return-chore"]')).toBeNull();
}

function expectParentProtectedContentPresent(): void {
  expect(root.querySelector("[data-parent-overview]")).not.toBeNull();
  expect(root.querySelector("[data-parent-recent]")).not.toBeNull();
  expect(root.querySelector('[data-form="grant"]')).not.toBeNull();
  expect(root.querySelector('[data-action="approve-chore"]')).not.toBeNull();
  expect(root.querySelector('[data-action="return-chore"]')).not.toBeNull();
}

interface DeferredDerivation {
  resolve(value: ArrayBuffer): void;
}

class DeferredCrypto {
  readonly crypto: Crypto;
  calls = 0;
  private readonly requests: DeferredDerivation[] = [];
  private readonly waiters: Array<() => void> = [];

  constructor() {
    const deriveBits = (): Promise<ArrayBuffer> => {
      this.calls += 1;
      return new Promise<ArrayBuffer>((resolve) => {
        this.requests.push({ resolve });
        this.waiters.shift()?.();
      });
    };
    this.crypto = {
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
      subtle: { importKey: async () => ({} as CryptoKey), deriveBits },
    } as unknown as Crypto;
  }

  async next(): Promise<DeferredDerivation> {
    if (this.requests.length === 0) await new Promise<void>((resolve) => this.waiters.push(resolve));
    return this.requests.shift()!;
  }
}

function parentVerifierBytes(source: MemoryStorage): Uint8Array {
  const verifier = JSON.parse(source.getItem(PARENT_ACCESS_KEY)!).verifier as string;
  return Uint8Array.from(atob(verifier), (character) => character.charCodeAt(0));
}

async function settleDerivation(request: DeferredDerivation, bytes: Uint8Array): Promise<void> {
  request.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
}

describe("integrated Croatian application", () => {
  it("completes and restores the planned journey through the real UI", async () => {
    await provisionParentAccess();
    let app = createApp(root, storage);
    click('[data-nav="parent"]');
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
    await submitPin('[data-form="parent-unlock"]', "246810");
    submit('[data-form="grant"]', 100);

    click('[data-nav="adventure"]');
    click('[data-action="answer-adventure"][data-answer="saving-disappears"]');
    expect(app.getAdventureState().stars).toBe(0);
    click('[data-action="answer-adventure"][data-answer="saving-later"]');
    click('[data-action="adventure-go"]');
    submit('[data-form="save"]', 10);
    expect(app.getAdventureState()).toMatchObject({ activeMission: "earning", stars: 1, badges: ["piggy-bank"] });

    click('[data-nav="adventure"]');
    click('[data-action="answer-adventure"][data-answer="earning-after-approval"]');
    click('[data-action="adventure-go"]');
    click('[data-action="request-chore"][data-id="make-bed"]');
    click('[data-nav="parent"]');
    expect(root.querySelector('[data-action="approve-chore"]')).toBeNull();
    await submitPin('[data-form="parent-unlock"]', "246810");
    click('[data-action="approve-chore"]');
    expect(app.getAdventureState()).toMatchObject({ activeMission: "purchase", stars: 2, badges: ["piggy-bank", "helping-paw"] });

    click('[data-nav="adventure"]');
    click('[data-action="answer-adventure"][data-answer="purchase-wallet"]');
    click('[data-action="adventure-go"]');
    click('[data-action="buy-item"][data-id="bowl"]');
    expect(app.getAdventureState()).toMatchObject({ activeMission: "loan", stars: 3, badges: ["piggy-bank", "helping-paw", "smart-shopper"] });

    click('[data-nav="adventure"]');
    click('[data-action="answer-adventure"][data-answer="loan-debt-changes"]');
    click('[data-action="adventure-go"]');
    submit('[data-form="borrow"]', 20);
    expect(app.getAdventureState()).toMatchObject({ activeMission: "loan", stars: 3, evidence: { loan: { borrowedAmount: 20, repaidAmount: 0 } } });
    submit('[data-form="repay"]', 20);

    const expected = {
      ...initialState(),
      wallet: 85,
      savings: 10,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "approved" as const }],
      itemQuantities: { bowl: 1 },
      nextId: 2,
      activities: [
        { code: "coins-granted" as const, amount: 100 },
        { code: "coins-saved" as const, amount: 10 },
        { code: "chore-reward-paid" as const, amount: 5, name: "Posloži krevet" },
        { code: "item-purchased" as const, amount: 10, name: "Zdjelica" },
        { code: "coins-borrowed" as const, amount: 20 },
        { code: "debt-repaid" as const, amount: 20 },
      ],
    };
    expect(app.getState()).toEqual(expected);
    expect(app.getAdventureState()).toMatchObject({ activeMission: null, stars: 4, completedMissions: ["saving", "earning", "purchase", "loan"], badges: ["piggy-bank", "helping-paw", "smart-shopper", "debt-expert"] });
    const expectedAdventure = structuredClone(app.getAdventureState());
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(expected);
    expect(JSON.parse(storage.getItem(ADVENTURE_STORAGE_KEY)!)).toEqual(expectedAdventure);
    app.destroy();
    app = createApp(root, storage);
    expect(app.getState()).toEqual(expected);
    expect(app.getAdventureState()).toEqual(expectedAdventure);
    click('[data-nav="parent"]');
    expect(root.querySelector('[data-form="parent-unlock"]')).not.toBeNull();
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
  });

  it("completes one aggregate six-section journey and resets every controller-memory-only tool on recreation", async () => {
    await provisionParentAccess();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), wallet: 200 }));
    let app = createApp(root, storage);
    const visited: string[] = [];
    const renderedSurfaces: string[] = [];
    const visit = (view: "adventure" | "money" | "chores" | "shop" | "house" | "parent", heading: string): void => {
      click(`[data-nav="${view}"]`);
      visited.push(view);
      expect(root.querySelector("h1")?.textContent).toBe(heading);
      renderedSurfaces.push(root.textContent ?? "");
    };

    visit("adventure", HR.adventureHeading);
    click('[data-action="answer-practice"][data-answer="first"]');
    expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe(ADVENTURE_PRACTICE[0].correctExplanation);
    expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(1, 6));
    click('[data-action="answer-adventure"][data-answer="saving-later"]');

    visit("money", HR.moneyHeading);
    submitGoal("250", "sort-recycling");
    expect(root.querySelector("[data-goal-result]")?.textContent).toContain("Za izmišljeni cilj od 250 zlatnika nedostaje ti 50 zlatnika.");
    expect(root.querySelector("[data-goal-result]")?.textContent).toContain("Razvrstaj otpad donosi 14 zlatnika tek nakon potvrde roditelja.");
    submit('[data-form="save"]', 5);
    expect(app.getAdventureState()).toMatchObject({ activeMission: "earning", completedMissions: ["saving"], stars: 1 });

    visit("chores", HR.choresHeading);
    expect([...root.querySelectorAll<HTMLElement>(".card-grid .catalog-card h2")].map(({ textContent }) => textContent)).toEqual(CHORES.map(({ name }) => name));
    click('[data-action="answer-earnings-challenge"][data-id="set-table"]');
    expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe("2 od 3");
    click('[data-action="request-chore"][data-id="pack-school-supplies"]');
    expect(app.getState().choreRequests).toEqual([{ id: 1, choreId: "pack-school-supplies", status: "pending" }]);

    visit("shop", HR.shopHeading);
    expect(root.querySelectorAll("[data-shop-entry]")).toHaveLength(PETS.length + ITEMS.length);
    click('[data-action="set-shop-category"][data-category="pets"]');
    click('[data-action="toggle-shop-affordability"]');
    expect([...root.querySelectorAll<HTMLElement>("[data-shop-entry]")].map(({ dataset }) => dataset.shopEntry)).toEqual(PETS.map(({ id }) => id));
    click('[data-action="buy-pet"][data-id="fish"]');
    click('[data-action="set-shop-category"][data-category="house-items"]');
    expect([...root.querySelectorAll<HTMLElement>("[data-shop-entry]")].map(({ dataset }) => dataset.shopEntry)).toEqual(
      ITEMS.filter(({ category, price }) => category === "house" && price <= app.getState().wallet).map(({ id }) => id),
    );
    click('[data-action="buy-item"][data-id="bookshelf"]');
    expect(root.querySelector('[data-category="house-items"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector('[data-action="toggle-shop-affordability"]')?.getAttribute("aria-pressed")).toBe("true");

    visit("house", HR.houseHeading);
    expect([...root.querySelectorAll<HTMLElement>("[data-house-area] h2")].map(({ textContent }) => textContent)).toEqual(
      HOUSE_AREAS.map(({ id }) => HOUSE_AREA_CONTENT[id].name),
    );
    const purchasedPetId = app.getState().ownedPets[0].id;
    const petPlacement = root.querySelector<HTMLFormElement>(`[data-form="place-pet"][data-id="${purchasedPetId}"]`)!;
    (petPlacement.elements.namedItem("slot") as HTMLSelectElement).value = "pet-1";
    petPlacement.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const itemPlacement = root.querySelector<HTMLFormElement>('[data-form="place-item"][data-id="bookshelf"]')!;
    (itemPlacement.elements.namedItem("slot") as HTMLSelectElement).value = "item-1";
    itemPlacement.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(app.getState().petPlacements["pet-1"]).toBe(purchasedPetId);
    expect(app.getState().itemPlacements["item-1"]).toBe("bookshelf");

    visit("parent", HR.parentHeading);
    expectParentProtectedContentAbsent();
    await submitPin('[data-form="parent-unlock"]', "246810");
    click('[data-action="approve-chore"][data-id="1"]');
    expect([...root.querySelectorAll("[data-parent-summary-value]")].map(({ textContent }) => textContent)).toEqual([
      "145 zlatnika", "5 zlatnika", "0 zlatnika", "0", "1 od 4", "1 od 8", "1",
    ]);
    expect(root.querySelector("[data-parent-recent]")?.textContent).toContain("Za posao Složi školski pribor zarađeno je 4 zlatnika.");
    expect(visited).toEqual(["adventure", "money", "chores", "shop", "house", "parent"]);

    const croatianSurface = [...renderedSurfaces, root.textContent ?? ""].join(" ");
    expect(croatianSurface).toContain("izmišljenog cilja");
    expect(croatianSurface).toContain("zlatnika");
    expect(croatianSurface).toContain("Dnevna soba");
    expect(croatianSurface).toContain("Pregled učenja");
    for (const forbidden of ["real payment", "advertising", "analytics", "cloud account", "social account"]) {
      expect(croatianSurface.toLocaleLowerCase("hr")).not.toContain(forbidden);
    }
    expect(root.querySelectorAll('a[href^="http"], form[action], [data-advertisement], [data-analytics]')).toHaveLength(0);

    const persistedGame = structuredClone(app.getState());
    const persistedAdventure = structuredClone(app.getAdventureState());
    const recordBytes = [STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key));
    expect(persistedGame).toMatchObject({
      wallet: 145,
      savings: 5,
      choreRequests: [{ id: 1, choreId: "pack-school-supplies", status: "approved" }],
      ownedPets: [{ id: 2, catalogId: "fish" }],
      itemQuantities: { bookshelf: 1 },
      petPlacements: { "pet-1": 2 },
      itemPlacements: { "item-1": "bookshelf" },
    });
    expect(persistedAdventure).toMatchObject({ activeMission: "earning", completedMissions: ["saving"], stars: 1 });

    app.destroy();
    app = createApp(root, storage);
    expect(root.querySelector("#view-adventure")).not.toBeNull();
    expect(app.getState()).toEqual(persistedGame);
    expect(app.getAdventureState()).toEqual(persistedAdventure);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordBytes);
    expect(root.querySelector<HTMLElement>("[data-practice-card]")?.dataset.practiceCard).toBe("wallet");
    expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe("");
    expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(0, 6));

    click('[data-nav="money"]');
    expect((root.querySelector("#goal-target") as HTMLInputElement).value).toBe("");
    expect(root.querySelector("[data-goal-result]")?.textContent).toBe("");
    click('[data-nav="chores"]');
    expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe("1 od 3");
    expect(root.querySelector("[data-challenge-feedback]")?.textContent).toBe("");
    click('[data-nav="shop"]');
    expect(root.querySelector('[data-category="all"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector('[data-action="toggle-shop-affordability"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(root.querySelectorAll("[data-shop-entry]")).toHaveLength(PETS.length + ITEMS.length);
    click('[data-nav="parent"]');
    expect(root.querySelector('[data-form="parent-unlock"]')).not.toBeNull();
    expectParentProtectedContentAbsent();
  });

  it("keeps malformed and unknown-version game, parent-access, and adventure records independently fail-safe", async () => {
    const validGame = {
      ...initialState(),
      wallet: 42,
      activities: [{ code: "coins-granted" as const, amount: 42 }],
    };
    const validAdventure = {
      version: 1,
      activeMission: "earning" as const,
      correctAnswers: ["saving" as const],
      evidence: { saving: { amount: 5, eventSequence: 1 } },
      completedMissions: ["saving" as const],
      stars: 1,
      badges: ["piggy-bank" as const],
    };
    const targets = [STORAGE_KEY, PARENT_ACCESS_KEY, ADVENTURE_STORAGE_KEY] as const;

    for (const target of targets) {
      for (const raw of [`malformed-${target}`, JSON.stringify({ version: 99 })]) {
        const isolated = new MemoryStorage();
        expect(await setupParentAccess(isolated, webcrypto as unknown as Crypto, "246810", "246810")).toEqual({ code: "setup-success", unlocked: true });
        isolated.setItem(STORAGE_KEY, JSON.stringify(validGame));
        isolated.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(validAdventure));
        isolated.setItem(target, raw);
        const bytesBefore = targets.map((key) => isolated.getItem(key));
        const app = createApp(root, isolated);

        expect(app.getState()).toEqual(target === STORAGE_KEY ? initialState() : validGame);
        expect(app.getAdventureState()).toEqual(target === ADVENTURE_STORAGE_KEY ? initialAdventureState() : validAdventure);
        click('[data-nav="parent"]');
        if (target === PARENT_ACCESS_KEY) {
          expect(root.textContent).toContain(HR.parentUnavailable);
          expectParentProtectedContentAbsent();
        } else {
          expect(root.querySelector('[data-form="parent-unlock"]')).not.toBeNull();
        }
        expect(root.textContent).not.toContain(raw);
        expect(targets.map((key) => isolated.getItem(key))).toEqual(bytesBefore);
        app.destroy();
      }
    }
  });

  it("renders and resolves every added Croatian job through the protected UI exactly once", async () => {
    await provisionParentAccess();
    let app = createApp(root, storage);
    const addedChores = CHORES.slice(5);

    click('[data-nav="chores"]');
    for (const chore of addedChores) {
      const selector = `[data-action="request-chore"][data-id="${chore.id}"]`;
      const action = root.querySelector<HTMLButtonElement>(selector);
      expect(action?.getAttribute("aria-label")).toBe(HR.choreAccessible(chore.name));
      expect(action?.closest("article")?.textContent).toContain(chore.name);
      expect(action?.closest("article")?.textContent).toContain(HR.rewardValue(chore.reward));
      click(selector);
      click(selector);
      expect(app.getState().choreRequests.filter(({ choreId, status }) => choreId === chore.id && status === "pending")).toHaveLength(1);
    }
    expect(app.getState().wallet).toBe(0);

    click('[data-nav="parent"]');
    await submitPin('[data-form="parent-unlock"]', "246810");
    for (let requestId = 1; requestId <= addedChores.length; requestId += 1) {
      click(`[data-action="return-chore"][data-id="${requestId}"]`);
    }
    expect(app.getState().wallet).toBe(0);
    expect(app.getState().activities).toEqual([]);
    expect(app.getState().choreRequests.every(({ status }) => status === "returned")).toBe(true);

    click('[data-nav="chores"]');
    for (const chore of addedChores) click(`[data-action="request-chore"][data-id="${chore.id}"]`);
    click('[data-nav="parent"]');
    await submitPin('[data-form="parent-unlock"]', "246810");
    for (let requestId = addedChores.length + 1; requestId <= addedChores.length * 2; requestId += 1) {
      click(`[data-action="approve-chore"][data-id="${requestId}"]`);
    }

    const expectedActivities = addedChores.map(({ name, reward }) => ({ code: "chore-reward-paid" as const, name, amount: reward }));
    expect(app.getState().wallet).toBe(addedChores.reduce((total, { reward }) => total + reward, 0));
    expect(app.getState().activities).toEqual(expectedActivities);
    expect(app.getState().choreRequests.slice(5).every(({ status }) => status === "approved")).toBe(true);

    const settledState = structuredClone(app.getState());
    for (let requestId = addedChores.length + 1; requestId <= addedChores.length * 2; requestId += 1) {
      const replay = document.createElement("button");
      replay.dataset.action = "approve-chore";
      replay.dataset.id = String(requestId);
      root.append(replay);
      replay.click();
    }
    expect(app.getState()).toEqual(settledState);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(settledState);

    app.destroy();
    app = createApp(root, storage);
    expect(app.getState()).toEqual(settledState);
    expect(app.getState().activities.map(activityMessage)).toEqual(
      addedChores.map(({ name, reward }) => `Za posao ${name} zarađeno je ${reward} zlatnika.`),
    );
  });

  it("plans a fictional savings goal from wallet, savings, and every exact job reward without mutation", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 10,
      savings: 5,
      debt: 95,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "pending" as const }],
      ownedPets: [{ id: 2, catalogId: "fish" }],
      itemQuantities: { bowl: 1 },
      petPlacements: { ...initialState().petPlacements, "pet-1": 2 },
      itemPlacements: { ...initialState().itemPlacements, "item-1": "bowl" },
      nextId: 3,
      activities: [{ code: "coins-borrowed" as const, amount: 5 }],
    };
    const adventure = initialAdventureState();
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(adventure));
    let app = createApp(root, storage);
    const gameBefore = structuredClone(app.getState());
    const adventureBefore = structuredClone(app.getAdventureState());
    const recordsBefore = [...storage.data.entries()];

    click('[data-nav="money"]');
    expect(root.querySelector(".balances")?.nextElementSibling?.classList.contains("goal-planner")).toBe(true);
    expect(root.querySelector("#goal-heading")?.textContent).toBe(HR.goalHeading);
    const options = [...root.querySelectorAll<HTMLOptionElement>('#goal-chore option')];
    expect(options.map(({ value, textContent }) => ({ value, label: textContent }))).toEqual(
      CHORES.map(({ id, name, reward }) => ({ value: id, label: `${name} — nagrada ${reward} zlatnika` })),
    );
    const targetInput = root.querySelector<HTMLInputElement>("#goal-target")!;
    expect(targetInput.min).toBe("1");
    expect(targetInput.step).toBe("1");
    expect(targetInput.max).toBe(String(Number.MAX_SAFE_INTEGER));

    submitGoal("50", "feed-pets");
    const result = root.querySelector<HTMLElement>("[data-goal-result]")!;
    expect(result.textContent).toContain("Za izmišljeni cilj od 50 zlatnika nedostaje ti 35 zlatnika.");
    expect(result.textContent).toContain("Nahrani ljubimce donosi 7 zlatnika tek nakon potvrde roditelja.");
    expect(result.textContent).toContain("Potrebno je 5 dovršenih i od roditelja potvrđenih poslova.");
    expect(result.textContent?.toLocaleLowerCase("hr")).not.toContain("dug");
    expect(result.textContent?.toLocaleLowerCase("hr")).not.toContain("zajam");
    expect(result.getAttribute("role")).toBe("status");
    expect(result.getAttribute("aria-live")).toBe("polite");
    expect(root.querySelector("#goal-disclaimer")?.textContent).toBe(HR.goalDisclaimer);

    for (const invalid of ["", "0", "-1", "1.5", String(Number.MAX_SAFE_INTEGER + 1)]) {
      submitGoal(invalid, "feed-pets");
      expect(root.querySelector("#feedback")?.textContent).toContain(HR.goalTargetError);
      expect(root.querySelector("[data-goal-result]")?.textContent).toContain("nedostaje ti 35 zlatnika");
    }
    expect(app.getState()).toEqual(gameBefore);
    expect(app.getAdventureState()).toEqual(adventureBefore);
    expect([...storage.data.entries()]).toEqual(recordsBefore);

    click('[data-nav="shop"]');
    click('[data-nav="money"]');
    expect(root.querySelector("[data-goal-result]")?.textContent).toContain("Potrebno je 5 dovršenih i od roditelja potvrđenih poslova.");
    expect((root.querySelector("#goal-target") as HTMLInputElement).value).toBe("50");
    expect((root.querySelector("#goal-chore") as HTMLSelectElement).value).toBe("feed-pets");

    app.destroy();
    app = createApp(root, storage);
    click('[data-nav="money"]');
    expect(root.querySelector("[data-goal-result]")?.textContent).toBe("");
    expect((root.querySelector("#goal-target") as HTMLInputElement).value).toBe("");
    expect(app.getState()).toEqual(gameBefore);
    expect(app.getAdventureState()).toEqual(adventureBefore);
    expect([...storage.data.entries()]).toEqual(recordsBefore);
  });

  it("reports a covered fictional goal without an additional job or negative gap", () => {
    const game = { ...initialState(), wallet: 45, savings: 5, debt: 100 };
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    const app = createApp(root, storage);
    const recordsBefore = [...storage.data.entries()];

    click('[data-nav="money"]');
    submitGoal("50", "feed-pets");
    const result = root.querySelector<HTMLElement>("[data-goal-result]")!;
    expect(result.textContent).toBe(HR.goalCovered(50));
    expect(result.textContent).toContain("Nije potreban nijedan dodatni dovršeni posao s potvrdom roditelja.");
    expect(result.textContent).not.toContain("-");
    expect(result.textContent).not.toContain("nedostaje");
    expect(app.getState()).toEqual(game);
    expect(app.getAdventureState()).toEqual(initialAdventureState());
    expect([...storage.data.entries()]).toEqual(recordsBefore);
  });

  it("runs the ordered retryable earnings challenge without mutating or persisting game data", async () => {
    await provisionParentAccess();
    const app = createApp(root, storage);
    const initialGameState = structuredClone(app.getState());
    const initialStorage = [...storage.data.entries()];
    const expectedComparisons = [
      [{ id: "set-table", name: "Postavi stol", reward: 10 }, { id: "make-bed", name: "Posloži krevet", reward: 5 }],
      [{ id: "help-garden", name: "Pomozi u vrtu", reward: 11 }, { id: "tidy-toys", name: "Pospremi igračke", reward: 8 }],
      [{ id: "sort-recycling", name: "Razvrstaj otpad", reward: 14 }, { id: "fold-laundry", name: "Pomozi složiti rublje", reward: 12 }],
    ] as const;
    expect(EARNINGS_CHALLENGE).toEqual(expectedComparisons.map(([correct, wrong]) => ({ choices: [correct.id, wrong.id], correctId: correct.id })));

    click('[data-nav="chores"]');
    expect(root.querySelector(".earnings-challenge")?.nextElementSibling?.classList.contains("card-grid")).toBe(true);
    expect(root.querySelector("#earnings-challenge-heading")?.textContent).toBe(HR.earningsChallengeHeading);
    expect(root.querySelector("#earnings-challenge-intro")?.textContent).toBe(HR.earningsChallengeIntro);
    expect(root.querySelector("#earnings-challenge-question")?.textContent).toBe(HR.earningsChallengeQuestion);

    expectedComparisons.forEach((comparison, roundIndex) => {
      const challenge = root.querySelector<HTMLElement>(".earnings-challenge")!;
      expect(challenge.querySelector("[data-challenge-progress]")?.textContent).toBe(`${roundIndex + 1} od 3`);
      const answers = [...challenge.querySelectorAll<HTMLButtonElement>('[data-action="answer-earnings-challenge"]')];
      expect(answers).toHaveLength(2);
      comparison.forEach((choice, choiceIndex) => {
        expect(answers[choiceIndex].dataset.id).toBe(choice.id);
        expect(answers[choiceIndex].textContent).toContain(choice.name);
        expect(answers[choiceIndex].textContent).toContain(`${choice.reward} zlatnika`);
        expect(answers[choiceIndex].getAttribute("aria-label")).toBe(HR.earningsChallengeAnswerAccessible(choice.name, choice.reward));
      });

      answers[1].click();
      expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe(`${roundIndex + 1} od 3`);
      expect(root.querySelector("[data-challenge-feedback]")?.textContent).toBe(HR.earningsChallengeWrong);
      click(`[data-action="answer-earnings-challenge"][data-id="${comparison[0].id}"]`);

      const repeated = document.createElement("button");
      repeated.dataset.action = "answer-earnings-challenge";
      repeated.dataset.id = comparison[0].id;
      repeated.dataset.round = String(roundIndex);
      root.append(repeated);
      repeated.click();
      repeated.remove();
      if (roundIndex < expectedComparisons.length - 1) {
        expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe(`${roundIndex + 2} od 3`);
        expect(root.querySelector("[data-challenge-feedback]")?.textContent).toBe(HR.earningsChallengeCorrect);
      }
    });

    expect(root.querySelector("[data-challenge-complete]")?.textContent).toBe(HR.earningsChallengeComplete);
    expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe("3 od 3");
    expect(root.querySelectorAll('[data-action="answer-earnings-challenge"]')).toHaveLength(0);
    expect(app.getState()).toEqual(initialGameState);
    expect([...storage.data.entries()]).toEqual(initialStorage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PARENT_ACCESS_KEY)).not.toBeNull();
  });

  it("retains the earnings challenge round across navigation and resets it with the controller", () => {
    let app = createApp(root, storage);
    click('[data-nav="chores"]');
    click('[data-action="answer-earnings-challenge"][data-id="set-table"]');
    expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe("2 od 3");

    click('[data-nav="shop"]');
    click('[data-nav="chores"]');
    expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe("2 od 3");

    app.destroy();
    app = createApp(root, storage);
    click('[data-nav="chores"]');
    expect(root.querySelector("[data-challenge-progress]")?.textContent).toBe("1 od 3");
    expect(root.querySelector('[data-action="answer-earnings-challenge"][data-id="set-table"]')).not.toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PARENT_ACCESS_KEY)).toBeNull();
  });

  it("filters every closed shop family in catalog order without mutating game records", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 55,
      savings: 9,
      debt: 4,
      ownedPets: [{ id: 1, catalogId: "fish" }],
      itemQuantities: { bowl: 2 },
      nextId: 2,
      activities: [{ code: "pet-purchased" as const, name: "Ribica", amount: 30 }],
    };
    const adventure = initialAdventureState();
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(adventure));
    let app = createApp(root, storage);
    const stateBefore = structuredClone(app.getState());
    const adventureBefore = structuredClone(app.getAdventureState());
    const recordsBefore = [...storage.data.entries()];
    const catalogOrder = [...PETS.map(({ id }) => id), ...ITEMS.map(({ id }) => id)];
    const visibleIds = () => [...root.querySelectorAll<HTMLElement>("[data-shop-entry]")].map(({ dataset }) => dataset.shopEntry);

    click('[data-nav="shop"]');
    const categories = [...root.querySelectorAll<HTMLButtonElement>('[data-action="set-shop-category"]')];
    expect(categories.map(({ textContent }) => textContent?.replace("✓", "").replace("Odabrano", "").trim())).toEqual(["Sve", "Ljubimci", "Stvari za ljubimce", "Ukrasi za kuću"]);
    expect(categories.map(({ ariaPressed }) => ariaPressed)).toEqual(["true", "false", "false", "false"]);
    expect(visibleIds()).toEqual(catalogOrder);

    const expectedFamilies = [
      { category: "pets", ids: PETS.map(({ id }) => id) },
      { category: "pet-items", ids: ITEMS.filter(({ category }) => category === "pet").map(({ id }) => id) },
      { category: "house-items", ids: ITEMS.filter(({ category }) => category === "house").map(({ id }) => id) },
      { category: "all", ids: catalogOrder },
    ];
    for (const expected of expectedFamilies) {
      click(`[data-action="set-shop-category"][data-category="${expected.category}"]`);
      expect(visibleIds()).toEqual(expected.ids);
      expect(root.querySelector(`[data-action="set-shop-category"][data-category="${expected.category}"]`)?.getAttribute("aria-pressed")).toBe("true");
      expect(root.querySelector("[data-shop-inventory]")?.textContent).toContain("Ribica");
      expect(root.querySelector("[data-shop-inventory]")?.textContent).toContain("Zdjelica — količina 2");
    }

    click('[data-action="set-shop-category"][data-category="house-items"]');
    click('[data-nav="money"]');
    click('[data-nav="shop"]');
    expect(visibleIds()).toEqual(expectedFamilies[2].ids);
    expect(app.getState()).toEqual(stateBefore);
    expect(app.getAdventureState()).toEqual(adventureBefore);
    expect([...storage.data.entries()]).toEqual(recordsBefore);
    expect([...PETS.map(({ id }) => id), ...ITEMS.map(({ id }) => id)]).toEqual(catalogOrder);

    app.destroy();
    app = createApp(root, storage);
    click('[data-nav="shop"]');
    expect(visibleIds()).toEqual(catalogOrder);
    expect(root.querySelector('[data-category="all"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector('[data-action="toggle-shop-affordability"]')?.getAttribute("aria-pressed")).toBe("false");
    const css = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
    expect(css).toContain("button, input, select { min-height: 44px; }");
    expect(css).toContain("button:focus-visible");
    expect(css).toContain(".shop-category-controls { grid-template-columns: 1fr; }");
  });

  it("updates affordable shop results after purchases and offers a Croatian reset from an empty result", () => {
    const game = {
      ...initialState(),
      wallet: 55,
      savings: 17,
      debt: 6,
      ownedPets: [{ id: 1, catalogId: "fish" }],
      itemQuantities: { bowl: 2 },
      nextId: 2,
      activities: [{ code: "pet-purchased" as const, name: "Ribica", amount: 30 }],
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    const app = createApp(root, storage);
    const adventureBefore = structuredClone(app.getAdventureState());
    const visibleIds = () => [...root.querySelectorAll<HTMLElement>("[data-shop-entry]")].map(({ dataset }) => dataset.shopEntry);

    click('[data-nav="shop"]');
    click('[data-action="toggle-shop-affordability"]');
    expect(root.querySelector('[data-action="toggle-shop-affordability"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(visibleIds()).toEqual([
      ...PETS.filter(({ id, price }) => id !== "fish" && price <= 55).map(({ id }) => id),
      ...ITEMS.filter(({ price }) => price <= 55).map(({ id }) => id),
    ]);
    expect(visibleIds()).not.toContain("fish");

    click('[data-action="buy-pet"][data-id="bird"]');
    expect(app.getState()).toMatchObject({ wallet: 15, savings: 17, debt: 6 });
    expect(visibleIds()).toEqual(["bowl", "toy", "plant", "pet-brush"]);
    expect(root.querySelector("[data-shop-inventory]")?.textContent).toContain("Ribica");
    expect(root.querySelector("[data-shop-inventory]")?.textContent).toContain("Ptičica");

    click('[data-action="buy-item"][data-id="bowl"]');
    expect(app.getState()).toMatchObject({ wallet: 5, savings: 17, debt: 6, itemQuantities: { bowl: 3 } });
    expect(visibleIds()).toEqual([]);
    expect(root.querySelector(".shop-empty")?.textContent).toContain("Nema ponuda koje odgovaraju odabranim filtrima.");
    expect(root.querySelector<HTMLButtonElement>('[data-action="reset-shop-filters"]')?.textContent).toBe("Prikaži sve");
    expect(root.querySelector("[data-shop-inventory]")?.textContent).toContain("Zdjelica — količina 3");
    expect(app.getAdventureState()).toEqual(adventureBefore);

    click('[data-action="reset-shop-filters"]');
    expect(visibleIds()).toEqual([...PETS.map(({ id }) => id), ...ITEMS.map(({ id }) => id)]);
    expect(root.querySelector('[data-category="all"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector('[data-action="toggle-shop-affordability"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(app.getState());
  });

  it("continues adventure sequencing after independent malformed-game recovery", async () => {
    await provisionParentAccess();
    const earlierAdventure = {
      version: 1,
      activeMission: "earning",
      correctAnswers: ["saving", "earning"],
      evidence: { saving: { amount: 5, eventSequence: 5 } },
      completedMissions: ["saving"],
      stars: 1,
      badges: ["piggy-bank"],
    };
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(earlierAdventure));
    storage.setItem(STORAGE_KEY, "malformed-game-record");

    const app = createApp(root, storage);
    expect(app.getState()).toEqual(initialState());
    expect(app.getAdventureState()).toEqual(earlierAdventure);
    click('[data-nav="chores"]');
    click('[data-action="request-chore"][data-id="make-bed"]');
    click('[data-nav="parent"]');
    expect(root.querySelector('[data-action="approve-chore"]')).toBeNull();
    await submitPin('[data-form="parent-unlock"]', "246810");
    click('[data-action="approve-chore"]');

    expect(app.getAdventureState()).toEqual({
      version: 1,
      activeMission: "purchase",
      correctAnswers: ["saving", "earning"],
      evidence: {
        saving: { amount: 5, eventSequence: 5 },
        earning: { rewardAmount: 5, eventSequence: 6 },
      },
      completedMissions: ["saving", "earning"],
      stars: 2,
      badges: ["piggy-bank", "helping-paw"],
    });
    expect(app.getState().activities).toEqual([{ code: "chore-reward-paid", amount: 5, name: "Posloži krevet" }]);
    expect(JSON.parse(storage.getItem(ADVENTURE_STORAGE_KEY)!)).toEqual(app.getAdventureState());
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(app.getState());
  });

  it("runs all six Croatian practice cards in order without changing any persisted record", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 37,
      savings: 12,
      debt: 4,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "pending" as const }],
      ownedPets: [{ id: 2, catalogId: "fish" }],
      itemQuantities: { bowl: 1 },
      petPlacements: { ...initialState().petPlacements, "pet-1": 2 },
      itemPlacements: { ...initialState().itemPlacements, "item-1": "bowl" },
      nextId: 3,
      activities: [{ code: "coins-borrowed" as const, amount: 4 }],
    };
    const firstMission = initialAdventureState();
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(firstMission));
    let app = createApp(root, storage);
    const gameBefore = structuredClone(app.getState());
    const adventureBefore = structuredClone(app.getAdventureState());
    const recordBytesBefore = [STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key));

    expect(ADVENTURE_PRACTICE.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: "wallet", title: "Novčanik" },
      { id: "savings", title: "Kasica" },
      { id: "earning", title: "Zarada" },
      { id: "price", title: "Cijena" },
      { id: "loan", title: "Zajam" },
      { id: "debt", title: "Dug" },
    ]);
    expect(ADVENTURE_PRACTICE.map(({ scenario, choices, correctAnswer, correctExplanation, wrongExplanation }) => ({
      scenario,
      answerCount: choices.length,
      distinctAnswerCount: new Set(choices.map(({ id }) => id)).size,
      correctCount: choices.filter(({ id }) => id === correctAnswer).length,
      correctExplanation,
      wrongExplanation,
    }))).toEqual(ADVENTURE_PRACTICE.map((card) => ({
      scenario: card.scenario,
      answerCount: 2,
      distinctAnswerCount: 2,
      correctCount: 1,
      correctExplanation: card.correctExplanation,
      wrongExplanation: card.wrongExplanation,
    })));
    expect(root.querySelector('.practice-deck [role="group"]')?.getAttribute("aria-label")).toBe(HR.practiceNavigationLabel);
    expect(ADVENTURE_PRACTICE.map(({ correctExplanation }) => correctExplanation)).toEqual([
      expect.stringContaining("naplaćuje zlatnike iz novčanika"),
      expect.stringContaining("vratiti u novčanik"),
      expect.stringContaining("nakon potvrde roditelja"),
      expect.stringContaining("najmanje 16 zlatnika"),
      expect.stringContaining("povećava dug"),
      expect.stringContaining("Vraćanje smanjuje dug"),
    ]);

    const forwardIds: string[] = [];
    for (let index = 0; index < ADVENTURE_PRACTICE.length; index += 1) {
      const card = ADVENTURE_PRACTICE[index];
      const rendered = root.querySelector<HTMLElement>("[data-practice-card]");
      expect(root.querySelectorAll("[data-practice-card]")).toHaveLength(1);
      expect(rendered?.dataset.practiceCard).toBe(card.id);
      expect(rendered?.querySelector("h3")?.textContent).toBe(card.title);
      expect(rendered?.textContent).toContain(card.scenario);
      const answers = [...root.querySelectorAll<HTMLButtonElement>('[data-action="answer-practice"]')];
      expect(answers).toHaveLength(2);
      expect(answers.map(({ textContent }) => textContent)).toEqual(card.choices.map(({ label }) => label));
      expect(answers.every(({ type, ariaLabel }) => type === "button" && ariaLabel?.startsWith("Odaberi odgovor za karticu "))).toBe(true);
      forwardIds.push(rendered!.dataset.practiceCard!);

      if (index === 0) {
        const wrong = card.choices.find(({ id }) => id !== card.correctAnswer)!;
        click(`[data-action="answer-practice"][data-answer="${wrong.id}"]`);
        expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe(card.wrongExplanation);
        expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(0, 6));
        expect(root.querySelector<HTMLElement>("[data-practice-card]")?.dataset.practiceCard).toBe(card.id);
      }

      click(`[data-action="answer-practice"][data-answer="${card.correctAnswer}"]`);
      expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe(card.correctExplanation);
      expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(index + 1, 6));
      click(`[data-action="answer-practice"][data-answer="${card.correctAnswer}"]`);
      expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(index + 1, 6));

      if (index === 0) {
        click('[data-nav="shop"]');
        click('[data-nav="adventure"]');
        expect(root.querySelector<HTMLElement>("[data-practice-card]")?.dataset.practiceCard).toBe("wallet");
        expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe(card.correctExplanation);
        expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(1, 6));
      }
      if (index < ADVENTURE_PRACTICE.length - 1) click('[data-action="next-practice"]');
    }
    expect(forwardIds).toEqual(["wallet", "savings", "earning", "price", "loan", "debt"]);
    expect(root.querySelector<HTMLButtonElement>('[data-action="next-practice"]')?.disabled).toBe(true);

    const backwardIds: string[] = [];
    for (let index = ADVENTURE_PRACTICE.length - 1; index >= 0; index -= 1) {
      backwardIds.push(root.querySelector<HTMLElement>("[data-practice-card]")!.dataset.practiceCard!);
      if (index > 0) click('[data-action="previous-practice"]');
    }
    expect(backwardIds).toEqual(["debt", "loan", "price", "earning", "savings", "wallet"]);
    expect(root.querySelector<HTMLButtonElement>('[data-action="previous-practice"]')?.disabled).toBe(true);
    expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(6, 6));
    click('[data-action="answer-practice"][data-answer="first"]');
    expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe(ADVENTURE_PRACTICE[0].correctExplanation);

    expect(app.getState()).toEqual(gameBefore);
    expect(app.getAdventureState()).toEqual(adventureBefore);
    expect(app.getAdventureState()).toMatchObject({ stars: 0, badges: [], correctAnswers: [], evidence: {} });
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordBytesBefore);

    app.destroy();
    app = createApp(root, storage);
    expect(root.querySelector<HTMLElement>("[data-practice-card]")?.dataset.practiceCard).toBe("wallet");
    expect(root.querySelector("[data-practice-feedback]")?.textContent).toBe("");
    expect(root.querySelector("[data-practice-score]")?.textContent).toBe(HR.practiceScore(0, 6));
    expect(app.getState()).toEqual(gameBefore);
    expect(app.getAdventureState()).toEqual(adventureBefore);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordBytesBefore);
  });

  it("renders the exact Croatian house areas and every legacy slot once without leaking internal identifiers", () => {
    const legacyState = {
      ...initialState(),
      wallet: 25,
      ownedPets: PETS.map(({ id }, index) => ({ id: index + 1, catalogId: id })),
      itemQuantities: Object.fromEntries(ITEMS.slice(0, 6).map(({ id }) => [id, 1])),
      selectedTheme: "forest",
      petPlacements: { "pet-1": 1, "pet-2": 2, "pet-3": 3, "pet-4": 4 },
      itemPlacements: {
        "item-1": ITEMS[0].id,
        "item-2": ITEMS[1].id,
        "item-3": ITEMS[2].id,
        "item-4": ITEMS[3].id,
        "item-5": ITEMS[4].id,
        "item-6": ITEMS[5].id,
      },
      nextId: PETS.length + 1,
    };
    const originalBytes = JSON.stringify(legacyState);
    storage.setItem(STORAGE_KEY, originalBytes);
    const app = createApp(root, storage);
    click('[data-nav="house"]');

    expect(Object.keys(HOUSE_AREA_CONTENT)).toEqual(HOUSE_AREAS.map(({ id }) => id));
    expect(Object.values(HOUSE_AREA_CONTENT).map(({ name }) => name)).toEqual([
      "Dnevna soba",
      "Soba za ljubimce",
      "Spremište",
      "Dvorište i staja",
    ]);
    expect(new Set(Object.values(HOUSE_AREA_CONTENT).map(({ name }) => name)).size).toBe(4);
    expect(new Set(Object.values(HOUSE_AREA_CONTENT).map(({ description }) => description)).size).toBe(4);
    expect(houseAreaContent("unknown-house-area")).toBeNull();
    expect(houseAreaContent(null)).toBeNull();

    const areas = [...root.querySelectorAll<HTMLElement>("[data-house-area]")];
    expect(areas.map(({ dataset }) => dataset.houseArea)).toEqual(HOUSE_AREAS.map(({ id }) => id));
    expect(areas.map((area) => area.querySelector(":scope > h2")?.textContent)).toEqual(
      HOUSE_AREAS.map(({ id }) => HOUSE_AREA_CONTENT[id].name),
    );
    expect(areas.map((area) => area.querySelector(":scope > p")?.textContent)).toEqual(
      HOUSE_AREAS.map(({ id }) => HOUSE_AREA_CONTENT[id].description),
    );
    areas.forEach((area, index) => {
      expect([...area.querySelectorAll<HTMLElement>("[data-house-slot]")].map(({ dataset }) => dataset.houseSlot)).toEqual(HOUSE_AREAS[index].slots);
      expect(area.querySelectorAll(":scope > .house-area-slots")).toHaveLength(1);
    });
    const renderedSlots = [...root.querySelectorAll<HTMLElement>("[data-house-slot]")];
    expect(renderedSlots.map(({ dataset }) => dataset.houseSlot)).toEqual(HOUSE_AREAS.flatMap(({ slots }) => slots));
    expect(new Set(renderedSlots.map(({ dataset }) => dataset.houseSlot)).size).toBe(10);
    expect(root.querySelectorAll(".house-grid")).toHaveLength(4);
    expect([...root.querySelectorAll(".house-grid")].every((grid) => grid.closest("[data-house-area]"))).toBe(true);
    expect(root.textContent).not.toContain(HR.petSlotsHeading);
    expect(root.textContent).not.toContain(HR.itemSlotsHeading);

    expect(areas[0].textContent).toContain(ITEMS[0].name);
    expect(areas[0].textContent).toContain(ITEMS[1].name);
    expect(areas[1].textContent).toContain(PETS[0].name);
    expect(areas[1].textContent).toContain(PETS[1].name);
    expect(areas[1].textContent).toContain(ITEMS[2].name);
    expect(areas[2].textContent).toContain(ITEMS[3].name);
    expect(areas[2].textContent).toContain(ITEMS[4].name);
    expect(areas[2].textContent).toContain(ITEMS[5].name);
    expect(areas[3].textContent).toContain(PETS[2].name);
    expect(areas[3].textContent).toContain(PETS[3].name);
    for (const pet of PETS) expect(root.textContent).toContain(pet.name);
    expect(root.querySelectorAll('[data-form="place-pet"]')).toHaveLength(4);
    expect(root.querySelector('[data-house-full="pets"]')?.textContent).toBe(HR.petHouseFullGuidance);
    expect(root.querySelectorAll('[data-form="place-pet"] button:disabled')).toHaveLength(4);

    const playerChannels = [
      root.textContent ?? "",
      ...[...root.querySelectorAll<HTMLElement>("[aria-label], [aria-valuetext], [placeholder]")].flatMap((element) =>
        ["aria-label", "aria-valuetext", "placeholder"].map((attribute) => element.getAttribute(attribute) ?? ""),
      ),
    ].join(" ");
    for (const internalId of [...HOUSE_AREAS.map(({ id }) => id), ...HOUSE_AREAS.flatMap(({ slots }) => slots)]) {
      expect(playerChannels).not.toContain(internalId);
    }
    expect(playerChannels).toContain("Dnevna soba");
    expect(playerChannels).toContain("Ribica");
    expect(app.getState()).toEqual(legacyState);
    expect(storage.getItem(STORAGE_KEY)).toBe(originalBytes);
  });

  it("wraps the ordered semantic house areas in aria-hidden responsive architecture", () => {
    const app = createApp(root, storage);
    click('[data-nav="house"]');

    const composition = root.querySelector<HTMLElement>(".house-composition");
    const areas = [...composition!.querySelectorAll<HTMLElement>(":scope > .house-areas > .house-area")];
    expect(composition).not.toBeNull();
    expect(areas.map(({ dataset }) => dataset.houseArea)).toEqual(HOUSE_AREAS.map(({ id }) => id));
    expect(areas.map(({ classList }) => [...classList].find((name) => name.startsWith("house-area-") && name !== "house-area-slots"))).toEqual([
      "house-area-living-room",
      "house-area-pet-room",
      "house-area-storage",
      "house-area-yard-stable",
    ]);
    for (const [index, area] of areas.entries()) {
      const cue = area.querySelector<HTMLElement>(":scope > .house-area-cue");
      expect(cue?.getAttribute("aria-hidden")).toBe("true");
      expect(cue?.textContent).toBe("");
      expect(area.querySelector(":scope > h2")?.closest('[aria-hidden="true"]')).toBeNull();
      expect(area.querySelector(":scope > p")?.closest('[aria-hidden="true"]')).toBeNull();
      expect(area.querySelector(":scope > h2")?.textContent).toBe(HOUSE_AREA_CONTENT[HOUSE_AREAS[index].id].name);
      expect(area.querySelector(":scope > .house-area-slots")?.getAttribute("aria-label")).toContain(HOUSE_AREA_CONTENT[HOUSE_AREAS[index].id].name);
    }
    expect(root.querySelectorAll(".house-area-cue")).toHaveLength(4);
    expect(root.querySelectorAll('[data-house-slot][aria-label]')).toHaveLength(10);

    const themeOptions = [...root.querySelectorAll<HTMLOptionElement>("#theme option")];
    expect(themeOptions.map(({ value, textContent }) => ({ id: value, name: textContent }))).toEqual(
      THEMES.map(({ id, name }) => ({ id, name })),
    );
    for (const theme of THEMES) {
      const select = root.querySelector<HTMLSelectElement>("#theme")!;
      select.value = theme.id;
      submit('[data-form="theme"]');
      expect(root.querySelector("#view-house")?.classList.contains(`theme-${theme.id}`)).toBe(true);
      expect([...root.querySelectorAll<HTMLElement>("[data-house-area]")].map(({ dataset }) => dataset.houseArea)).toEqual(HOUSE_AREAS.map(({ id }) => id));
      expect(root.textContent).toContain(HR.emptySlot);
    }
    expect(app.getState().selectedTheme).toBe(THEMES.at(-1)?.id);

    const css = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
    expect(css).toContain("button { min-inline-size: 44px; }");
    expect(css).toContain(".house-areas { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain(".house-areas::before");
    expect(css).toContain('"living pet yard"');
    expect(css).toContain('"storage storage yard"');
    for (const selector of [".house-area-living-room .house-area-cue", ".house-area-pet-room .house-area-cue", ".house-area-storage .house-area-cue", ".house-area-yard-stable .house-area-cue"]) {
      expect(css).toContain(selector);
    }
    const reducedMotion = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reducedMotion).toContain(".house-area");
    expect(reducedMotion).toContain("animation: none !important");
    expect(reducedMotion).toContain("transition: none !important");
    expect(css).not.toContain("url(");
  });

  it("preserves house theme, place, move, remove, save, and recreation behavior over named areas", () => {
    const legacyState = {
      ...initialState(),
      wallet: 25,
      ownedPets: PETS.map(({ id }, index) => ({ id: index + 1, catalogId: id })),
      itemQuantities: Object.fromEntries(ITEMS.slice(0, 6).map(({ id }) => [id, 1])),
      selectedTheme: "forest",
      petPlacements: { "pet-1": 1, "pet-2": 2, "pet-3": 3, "pet-4": 4 },
      itemPlacements: {
        "item-1": ITEMS[0].id,
        "item-2": ITEMS[1].id,
        "item-3": ITEMS[2].id,
        "item-4": ITEMS[3].id,
        "item-5": ITEMS[4].id,
        "item-6": ITEMS[5].id,
      },
      nextId: PETS.length + 1,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(legacyState));
    let app = createApp(root, storage);
    click('[data-nav="house"]');

    const theme = root.querySelector<HTMLSelectElement>('#theme')!;
    theme.value = "sea";
    submit('[data-form="theme"]');
    expect(app.getState().selectedTheme).toBe("sea");
    expect(root.querySelector("#view-house")?.classList.contains("theme-sea")).toBe(true);

    click('[data-action="remove-pet"][data-slot="pet-1"]');
    expect(app.getState().petPlacements["pet-1"]).toBeNull();
    const placePet = root.querySelector<HTMLFormElement>('[data-form="place-pet"][data-id="5"]')!;
    (placePet.elements.namedItem("slot") as HTMLSelectElement).value = "pet-1";
    placePet.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(app.getState().petPlacements["pet-1"]).toBe(5);

    click('[data-action="remove-pet"][data-slot="pet-2"]');
    const petMove = root.querySelector<HTMLSelectElement>('[data-move-select="pet-1"]')!;
    expect([...petMove.options].find(({ value }) => value === "pet-2")?.textContent).toContain("Soba za ljubimce");
    petMove.value = "pet-2";
    click('[data-action="move-pet"][data-slot="pet-1"]');
    expect(app.getState().petPlacements).toEqual({ "pet-1": null, "pet-2": 5, "pet-3": 3, "pet-4": 4 });

    click('[data-action="remove-item"][data-slot="item-4"]');
    const itemMove = root.querySelector<HTMLSelectElement>('[data-move-select="item-1"]')!;
    expect([...itemMove.options].find(({ value }) => value === "item-4")?.textContent).toContain("Spremište");
    itemMove.value = "item-4";
    click('[data-action="move-item"][data-slot="item-1"]');
    expect(app.getState().itemPlacements["item-1"]).toBeNull();
    expect(app.getState().itemPlacements["item-4"]).toBe(ITEMS[0].id);

    const settled = structuredClone(app.getState());
    expect(Object.keys(settled.petPlacements)).toEqual(Object.keys(legacyState.petPlacements));
    expect(Object.keys(settled.itemPlacements)).toEqual(Object.keys(legacyState.itemPlacements));
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(settled);
    app.destroy();
    app = createApp(root, storage);
    expect(app.getState()).toEqual(settled);
    click('[data-nav="house"]');
    expect(root.querySelector('[data-house-area="pet-room"]')?.textContent).toContain(PETS[4].name);
    expect(root.querySelector('[data-house-area="storage"]')?.textContent).toContain(ITEMS[0].name);
    expect((root.querySelector("#theme") as HTMLSelectElement).value).toBe("sea");
  });

  it("keeps practice available between missions and after all missions and badges are complete", () => {
    const betweenMissions = {
      version: 1,
      activeMission: "earning" as const,
      correctAnswers: ["saving" as const],
      evidence: { saving: { amount: 5, eventSequence: 1 } },
      completedMissions: ["saving" as const],
      stars: 1,
      badges: ["piggy-bank" as const],
    };
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(betweenMissions));
    let app = createApp(root, storage);
    expect(app.getAdventureState()).toEqual(betweenMissions);
    expect(root.querySelector("[data-practice-card]")).not.toBeNull();
    expect(root.querySelector("[data-active-mission]")?.getAttribute("data-active-mission")).toBe("earning");
    expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBe(JSON.stringify(betweenMissions));

    app.destroy();
    const completedJourney = {
      version: 1,
      activeMission: null,
      correctAnswers: ["saving", "earning", "purchase", "loan"] as const,
      evidence: {
        saving: { amount: 5, eventSequence: 1 },
        earning: { rewardAmount: 5, eventSequence: 2 },
        purchase: { price: 10, eventSequence: 3 },
        loan: { borrowedAmount: 10, repaidAmount: 10, eventSequences: [4, 5] },
      },
      completedMissions: ["saving", "earning", "purchase", "loan"] as const,
      stars: 4,
      badges: ["piggy-bank", "helping-paw", "smart-shopper", "debt-expert"] as const,
    };
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(completedJourney));
    app = createApp(root, storage);
    expect(app.getAdventureState()).toEqual(completedJourney);
    expect(root.querySelector("[data-practice-card]")).not.toBeNull();
    expect(root.querySelectorAll("[data-badge]")).toHaveLength(4);
    expect(root.textContent).toContain(HR.journeyCompleted);
    expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBe(JSON.stringify(completedJourney));
  });

  it("shows the complete Croatian hub and rejects out-of-order, duplicate, rejected, and replayed progress", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), wallet: 50 }));
    const app = createApp(root, storage);
    expect(root.querySelectorAll("[data-mission-stop]")).toHaveLength(4);
    expect(root.querySelectorAll("[data-badge]")).toHaveLength(4);
    expect(root.querySelectorAll(".school-topic")).toHaveLength(6);
    expect(root.querySelectorAll("[data-active-mission]")).toHaveLength(1);
    expect(root.textContent).toContain(HR.starsValue(0));

    click('[data-nav="shop"]');
    click('[data-action="buy-item"][data-id="bowl"]');
    expect(app.getAdventureState().evidence.purchase).toBeUndefined();

    click('[data-nav="money"]');
    submit('[data-form="save"]', 5);
    const afterFirstSave = structuredClone(app.getAdventureState());
    submit('[data-form="save"]', 5);
    expect(app.getAdventureState()).toEqual(afterFirstSave);
    submit('[data-form="save"]', 100);
    expect(app.getAdventureState()).toEqual(afterFirstSave);

    const future = document.createElement("button");
    future.dataset.action = "answer-adventure";
    future.dataset.mission = "earning";
    future.dataset.answer = "earning-after-approval";
    root.append(future);
    future.click();
    expect(app.getAdventureState()).toEqual(afterFirstSave);

    click('[data-nav="adventure"]');
    click('[data-action="answer-adventure"][data-answer="saving-later"]');
    expect(app.getAdventureState().stars).toBe(1);
    const replay = document.createElement("button");
    replay.dataset.action = "answer-adventure";
    replay.dataset.mission = "saving";
    replay.dataset.answer = "saving-later";
    root.append(replay);
    replay.click();
    expect(app.getAdventureState().stars).toBe(1);
  });

  it("renders exactly seven derived Croatian parent summaries and only the five newest existing activities without mutation", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 44,
      savings: 12,
      debt: 1,
      choreRequests: [
        { id: 1, choreId: "make-bed", status: "pending" as const },
        { id: 2, choreId: "tidy-toys", status: "approved" as const },
      ],
      ownedPets: [{ id: 3, catalogId: "fish" }, { id: 4, catalogId: "rabbit" }],
      itemQuantities: { bowl: 2, toy: 3 },
      nextId: 5,
      activities: [
        { code: "coins-saved" as const, amount: 2 },
        { code: "savings-withdrawn" as const, amount: 1 },
        { code: "coins-borrowed" as const, amount: 3 },
        { code: "debt-repaid" as const, amount: 1 },
        { code: "coins-granted" as const, amount: 5 },
        { code: "pet-purchased" as const, amount: 30, name: "Ribica" },
        { code: "item-purchased" as const, amount: 10, name: "Zdjelica" },
      ],
    };
    const adventure = {
      version: 1,
      activeMission: "purchase",
      correctAnswers: ["saving", "earning"],
      evidence: {
        saving: { amount: 5, eventSequence: 1 },
        earning: { rewardAmount: 5, eventSequence: 2 },
      },
      completedMissions: ["saving", "earning"],
      stars: 2,
      badges: ["piggy-bank", "helping-paw"],
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(adventure));
    const app = createApp(root, storage);
    const recordsBefore = [STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key));

    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();
    await submitPin('[data-form="parent-unlock"]', "246810");

    const overview = root.querySelector<HTMLElement>("[data-parent-overview]")!;
    expect(overview.querySelector("h2")?.textContent).toBe(HR.parentOverviewHeading);
    expect([...overview.querySelectorAll("dt")].map(({ textContent }) => textContent)).toEqual([
      HR.parentWalletSummary,
      HR.parentSavingsSummary,
      HR.parentDebtSummary,
      HR.parentPendingSummary,
      HR.parentMissionsSummary,
      HR.parentPetsSummary,
      HR.parentItemsSummary,
    ]);
    expect([...overview.querySelectorAll("[data-parent-summary-value]")].map(({ textContent }) => textContent)).toEqual([
      "44 zlatnika", "12 zlatnika", "1 zlatnik", "1", "2 od 4", "2 od 8", "5",
    ]);
    const recent = [...overview.querySelectorAll<HTMLLIElement>("[data-parent-recent] li")].map(({ textContent }) => textContent);
    expect(recent).toEqual([
      "Kupljena je stvar Zdjelica za 10 zlatnika.",
      "Kupljen je ljubimac Ribica za 30 zlatnika.",
      "Roditelj je dodao 5 zlatnika.",
      "Vraćen je 1 zlatnik duga.",
      "Posuđeno je 3 zlatnika u igri.",
    ]);
    expect(recent).toHaveLength(5);
    expect(overview.textContent).not.toContain("Iz kasice je uzet 1 zlatnik.");
    expect(overview.querySelectorAll("button, form, input, select")).toHaveLength(0);

    const playerChannels = [overview.textContent ?? "", ...[...overview.querySelectorAll<HTMLElement>("[aria-label], [aria-valuetext], [placeholder]")].flatMap((element) =>
      ["aria-label", "aria-valuetext", "placeholder"].map((attribute) => element.getAttribute(attribute) ?? ""),
    )].join(" ");
    for (const internal of ["fish", "rabbit", "bowl", "toy", "living-room", "pet-room", "storage", "yard-stable", ...ACTIVITY_CODES, STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY, "246810"]) {
      expect(playerChannels).not.toContain(internal);
    }
    expect(app.getState()).toEqual(game);
    expect(app.getAdventureState()).toEqual(adventure);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordsBefore);
  });

  it("refreshes the unlocked overview through accepted grant, approval, mission, pet, and item flows", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 150,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "pending" as const }],
      nextId: 2,
    };
    const adventure = {
      version: 1,
      activeMission: "earning",
      correctAnswers: ["saving", "earning"],
      evidence: { saving: { amount: 5, eventSequence: 1 } },
      completedMissions: ["saving"],
      stars: 1,
      badges: ["piggy-bank"],
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(adventure));
    const app = createApp(root, storage);

    click('[data-nav="parent"]');
    await submitPin('[data-form="parent-unlock"]', "246810");
    const summaryValues = () => [...root.querySelectorAll<HTMLElement>("[data-parent-summary-value]")].map(({ textContent }) => textContent);
    expect(summaryValues()).toEqual(["150 zlatnika", "0 zlatnika", "0 zlatnika", "1", "1 od 4", "0 od 8", "0"]);

    submit('[data-form="grant"]', 20);
    expect(summaryValues()[0]).toBe("170 zlatnika");
    expect(root.querySelector("[data-parent-recent] li")?.textContent).toBe("Roditelj je dodao 20 zlatnika.");

    click('[data-action="approve-chore"]');
    expect(summaryValues()).toEqual(["175 zlatnika", "0 zlatnika", "0 zlatnika", "0", "2 od 4", "0 od 8", "0"]);
    expect(app.getAdventureState()).toMatchObject({ activeMission: "purchase", completedMissions: ["saving", "earning"], stars: 2 });
    expect([...root.querySelectorAll("[data-parent-recent] li")].map(({ textContent }) => textContent)).toEqual([
      "Za posao Posloži krevet zarađeno je 5 zlatnika.",
      "Roditelj je dodao 20 zlatnika.",
    ]);

    click('[data-nav="shop"]');
    click('[data-action="buy-pet"][data-id="fish"]');
    click('[data-action="buy-item"][data-id="bowl"]');
    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();
    await submitPin('[data-form="parent-unlock"]', "246810");
    expect(summaryValues()).toEqual(["135 zlatnika", "0 zlatnika", "0 zlatnika", "0", "2 od 4", "1 od 8", "1"]);
    expect([...root.querySelectorAll("[data-parent-recent] li")].map(({ textContent }) => textContent)).toEqual([
      "Kupljena je stvar Zdjelica za 10 zlatnika.",
      "Kupljen je ljubimac Ribica za 30 zlatnika.",
      "Za posao Posloži krevet zarađeno je 5 zlatnika.",
      "Roditelj je dodao 20 zlatnika.",
    ]);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(app.getState());
    expect(JSON.parse(storage.getItem(ADVENTURE_STORAGE_KEY)!)).toEqual(app.getAdventureState());
  });

  it("keeps only the newest overlapping parent unlock authoritative and ignores repeated pending submission", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 27,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "pending" as const }],
      nextId: 2,
      activities: [{ code: "coins-granted" as const, amount: 27 }],
    };
    const adventure = initialAdventureState();
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(adventure));
    const verifier = parentVerifierBytes(storage);
    const deferred = new DeferredCrypto();
    const app = createApp(root, storage, deferred.crypto, true);

    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();
    const oldForm = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (oldForm.elements.namedItem("pin") as HTMLInputElement).value = "246810";
    oldForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    oldForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const oldRequest = await deferred.next();
    expect(deferred.calls).toBe(1);
    expectParentProtectedContentAbsent();

    click('[data-nav="money"]');
    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();
    const newForm = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    expect(newForm).not.toBe(oldForm);
    (newForm.elements.namedItem("pin") as HTMLInputElement).value = "246810";
    newForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const newRequest = await deferred.next();
    expect(deferred.calls).toBe(2);

    await settleDerivation(newRequest, verifier);
    expectParentProtectedContentPresent();
    expect([...root.querySelectorAll("[data-parent-summary-value]")].map(({ textContent }) => textContent)).toEqual([
      "27 zlatnika", "0 zlatnika", "0 zlatnika", "1", "0 od 4", "0 od 8", "0",
    ]);
    const stateBeforeStale = structuredClone(app.getState());
    const adventureBeforeStale = structuredClone(app.getAdventureState());
    const domBeforeStale = root.innerHTML;
    const recordsBeforeStale = [STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key));

    await settleDerivation(oldRequest, verifier);
    expect(app.getState()).toEqual(stateBeforeStale);
    expect(app.getAdventureState()).toEqual(adventureBeforeStale);
    expect(root.innerHTML).toBe(domBeforeStale);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordsBeforeStale);
    expectParentProtectedContentPresent();

    submit('[data-form="grant"]', 3);
    expect(app.getState().wallet).toBe(30);
    expect(root.querySelector("[data-parent-summary-value]")?.textContent).toBe("30 zlatnika");
  });

  it("keeps a newer failed unlock closed when an older successful verification settles later", async () => {
    await provisionParentAccess();
    const game = {
      ...initialState(),
      wallet: 41,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "pending" as const }],
      nextId: 2,
    };
    const adventure = initialAdventureState();
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(adventure));
    const verifier = parentVerifierBytes(storage);
    const wrongVerifier = verifier.slice();
    wrongVerifier[0] ^= 0xff;
    const deferred = new DeferredCrypto();
    const app = createApp(root, storage, deferred.crypto, true);

    click('[data-nav="parent"]');
    const oldForm = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (oldForm.elements.namedItem("pin") as HTMLInputElement).value = "246810";
    oldForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const oldRequest = await deferred.next();
    click('[data-nav="shop"]');
    click('[data-nav="parent"]');
    const newForm = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (newForm.elements.namedItem("pin") as HTMLInputElement).value = "111111";
    newForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const newRequest = await deferred.next();

    await settleDerivation(newRequest, wrongVerifier);
    expect(root.querySelector("#feedback")?.textContent).toContain(PARENT_ACCESS_MESSAGES["wrong-pin"]);
    expectParentProtectedContentAbsent();
    expect(root.textContent).not.toContain("41 zlatnika");
    const stateBeforeStale = structuredClone(app.getState());
    const adventureBeforeStale = structuredClone(app.getAdventureState());
    const domBeforeStale = root.innerHTML;
    const recordsBeforeStale = [STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key));

    await settleDerivation(oldRequest, verifier);
    expect(app.getState()).toEqual(stateBeforeStale);
    expect(app.getAdventureState()).toEqual(adventureBeforeStale);
    expect(root.innerHTML).toBe(domBeforeStale);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordsBeforeStale);
    expectParentProtectedContentAbsent();

    const forged = [
      '<form data-form="grant"><input name="amount" value="50"></form>',
      '<button data-action="approve-chore" data-id="1"></button>',
      '<button data-action="return-chore" data-id="1"></button>',
    ];
    for (const markup of forged) {
      root.insertAdjacentHTML("beforeend", markup);
      const injected = root.lastElementChild!;
      injected.dispatchEvent(new Event(injected.tagName === "FORM" ? "submit" : "click", { bubbles: true, cancelable: true }));
      expect(app.getState()).toEqual(stateBeforeStale);
      expect(app.getAdventureState()).toEqual(adventureBeforeStale);
      expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(recordsBeforeStale);
      expectParentProtectedContentAbsent();
    }
  });

  it("invalidates pending parent unlocks on explicit lock and controller destruction", async () => {
    await provisionParentAccess();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState(), wallet: 19 }));
    storage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(initialAdventureState()));
    const verifier = parentVerifierBytes(storage);
    const deferred = new DeferredCrypto();
    const app = createApp(root, storage, deferred.crypto, true);

    click('[data-nav="parent"]');
    const lockInvalidatedForm = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (lockInvalidatedForm.elements.namedItem("pin") as HTMLInputElement).value = "246810";
    lockInvalidatedForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const lockInvalidatedRequest = await deferred.next();
    root.insertAdjacentHTML("beforeend", '<button data-action="lock-parent"></button>');
    (root.lastElementChild as HTMLButtonElement).click();
    expectParentProtectedContentAbsent();
    const lockedDom = root.innerHTML;
    const lockedRecords = [STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key));
    await settleDerivation(lockInvalidatedRequest, verifier);
    expect(root.innerHTML).toBe(lockedDom);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(lockedRecords);
    expectParentProtectedContentAbsent();

    const destroyedForm = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (destroyedForm.elements.namedItem("pin") as HTMLInputElement).value = "246810";
    destroyedForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    const destroyedRequest = await deferred.next();
    const stateBeforeDestroy = structuredClone(app.getState());
    const adventureBeforeDestroy = structuredClone(app.getAdventureState());
    app.destroy();
    expect(root.innerHTML).toBe("");
    await settleDerivation(destroyedRequest, verifier);
    expect(root.innerHTML).toBe("");
    expect(app.getState()).toEqual(stateBeforeDestroy);
    expect(app.getAdventureState()).toEqual(adventureBeforeDestroy);
    expect([STORAGE_KEY, ADVENTURE_STORAGE_KEY, PARENT_ACCESS_KEY].map((key) => storage.getItem(key))).toEqual(lockedRecords);
  });

  it("keeps every overview and protected control absent across all closed parent modes and transitions", async () => {
    await provisionParentAccess("123456");
    storage.setItem(STORAGE_KEY, JSON.stringify({
      ...initialState(),
      wallet: 987,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "pending" as const }],
      nextId: 2,
      activities: [{ code: "coins-granted" as const, amount: 987 }],
    }));
    let app = createApp(root, storage);
    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();

    const unlock = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (unlock.elements.namedItem("pin") as HTMLInputElement).value = "111111";
    unlock.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitForText(PARENT_ACCESS_MESSAGES["wrong-pin"]);
    expectParentProtectedContentAbsent();
    expect(root.textContent).not.toContain("987 zlatnika");

    await submitPin('[data-form="parent-unlock"]', "123456");
    expect(root.querySelector("[data-parent-overview]")).not.toBeNull();
    click('[data-nav="money"]');
    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();

    await submitPin('[data-form="parent-unlock"]', "123456");
    click('[data-action="lock-parent"]');
    expectParentProtectedContentAbsent();

    app.destroy();
    app = createApp(root, storage);
    click('[data-nav="parent"]');
    expectParentProtectedContentAbsent();

    app.destroy();
    storage.setItem(PARENT_ACCESS_KEY, '{"version":1,"algorithm":"PBKDF2"}');
    app = createApp(root, storage);
    click('[data-nav="parent"]');
    expect(root.textContent).toContain(HR.parentUnavailable);
    expectParentProtectedContentAbsent();

    app.destroy();
    storage = new MemoryStorage();
    app = createApp(root, storage);
    click('[data-nav="parent"]');
    expect(root.textContent).toContain(HR.parentUnprovisioned);
    expectParentProtectedContentAbsent();

    app.destroy();
    storage = new MemoryStorage();
    expect(await setupParentAccess(storage, webcrypto as unknown as Crypto, "654321", "654321")).toEqual({ code: "setup-success", unlocked: true });
    app = createApp(root, storage, null, true);
    click('[data-nav="parent"]');
    expect(root.textContent).toContain(HR.parentUnavailable);
    expectParentProtectedContentAbsent();
  });

  it("keeps protected controls and mutations closed until a valid unlock", async () => {
    await provisionParentAccess("135790");
    const app = createApp(root, storage);
    click('[data-nav="parent"]');
    await submitPin('[data-form="parent-unlock"]', "135790");
    click('[data-nav="money"]');
    click('[data-nav="parent"]');

    expect(root.querySelector('[data-form="grant"]')).toBeNull();
    expect(root.querySelector('[data-action="approve-chore"]')).toBeNull();
    const stateBefore = structuredClone(app.getState());
    const gameBefore = storage.getItem(STORAGE_KEY);
    const adventureBefore = storage.getItem(ADVENTURE_STORAGE_KEY);
    const accessBefore = storage.getItem(PARENT_ACCESS_KEY);

    const forgedForm = document.createElement("form");
    forgedForm.dataset.form = "grant";
    forgedForm.innerHTML = '<input name="amount" value="50">';
    root.append(forgedForm);
    forgedForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(root.textContent).toContain(HR.parentDenied);

    const forgedButton = document.createElement("button");
    forgedButton.dataset.action = "approve-chore";
    forgedButton.dataset.id = "1";
    root.append(forgedButton);
    forgedButton.click();
    expect(app.getState()).toEqual(stateBefore);
    expect(storage.getItem(STORAGE_KEY)).toBe(gameBefore);
    expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBe(adventureBefore);
    expect(storage.getItem(PARENT_ACCESS_KEY)).toBe(accessBefore);
  });

  it("rejects wrong PIN values in Croatian and relocks explicitly", async () => {
    await provisionParentAccess("123456");
    createApp(root, storage);
    click('[data-nav="parent"]');
    await submitPin('[data-form="parent-unlock"]', "123456");
    click('[data-action="lock-parent"]');
    const unlock = root.querySelector<HTMLFormElement>('[data-form="parent-unlock"]')!;
    (unlock.elements.namedItem("pin") as HTMLInputElement).value = "111111";
    unlock.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitForText("PIN nije točan");
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
    expect(root.textContent).not.toContain("111111");
  });

  it("keeps a fresh profile unprovisioned and rejects forged enrollment and protected actions", () => {
    const app = createApp(root, storage);
    click('[data-nav="parent"]');
    expect(root.textContent).toContain(HR.parentUnprovisioned);
    expect(root.querySelector('[data-form="parent-setup"]')).toBeNull();
    expect(root.querySelector('[data-form="parent-unlock"]')).toBeNull();
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
    expect(root.querySelector('[data-action="approve-chore"]')).toBeNull();
    expect(root.querySelector('[data-action="return-chore"]')).toBeNull();

    const stateBefore = structuredClone(app.getState());
    const forged = [
      '<form data-form="parent-setup"><input name="pin" value="123456"><input name="confirmation" value="123456"></form>',
      '<form data-form="grant"><input name="amount" value="50"></form>',
      '<button data-action="approve-chore" data-id="1"></button>',
      '<button data-action="return-chore" data-id="1"></button>',
    ];
    for (const markup of forged) {
      root.insertAdjacentHTML("beforeend", markup);
      const injected = root.lastElementChild!;
      injected.dispatchEvent(new Event(injected.tagName === "FORM" ? "submit" : "click", { bubbles: true, cancelable: true }));
      injected.remove();
      expect(app.getState()).toEqual(stateBefore);
      expect(storage.getItem(PARENT_ACCESS_KEY)).toBeNull();
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBeNull();
    }
  });

  it("fails closed outside a secure Web Crypto context and keeps parent controls absent", () => {
    createApp(root, storage, webcrypto as unknown as Crypto, false);
    click('[data-nav="parent"]');
    expect(root.textContent).toContain(HR.parentUnavailable);
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
    expect(root.querySelector('[data-action="approve-chore"]')).toBeNull();
    const forgedSetup = document.createElement("form");
    forgedSetup.dataset.form = "parent-setup";
    forgedSetup.innerHTML = '<input name="pin" value="123456"><input name="confirmation" value="123456">';
    root.append(forgedSetup);
    forgedSetup.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(storage.getItem(PARENT_ACCESS_KEY)).toBeNull();
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
  });

  it("fails closed when Web Crypto is unavailable even in a secure context", () => {
    createApp(root, storage, null, true);
    click('[data-nav="parent"]');
    expect(root.textContent).toContain(HR.parentUnavailable);
    expect(root.querySelector('[data-form="parent-setup"]')).toBeNull();
    expect(root.querySelector('[data-form="parent-unlock"]')).toBeNull();
    expect(root.querySelector('[data-form="grant"]')).toBeNull();
    expect(storage.getItem(PARENT_ACCESS_KEY)).toBeNull();
  });

  it("rejects every forged protected mutation while relocked", async () => {
    await provisionParentAccess();
    const app = createApp(root, storage);
    click('[data-nav="parent"]');
    await submitPin('[data-form="parent-unlock"]', "246810");
    click('[data-nav="chores"]');
    click('[data-action="request-chore"][data-id="make-bed"]');
    click('[data-nav="parent"]');

    const stateBefore = structuredClone(app.getState());
    const gameBefore = storage.getItem(STORAGE_KEY);
    const adventureBefore = storage.getItem(ADVENTURE_STORAGE_KEY);
    const accessBefore = storage.getItem(PARENT_ACCESS_KEY);
    const forged = [
      '<form data-form="grant"><input name="amount" value="50"></form>',
      '<button data-action="approve-chore" data-id="1"></button>',
      '<button data-action="return-chore" data-id="1"></button>',
    ];
    for (const markup of forged) {
      root.insertAdjacentHTML("beforeend", markup);
      const injected = root.lastElementChild!;
      injected.dispatchEvent(new Event(injected.tagName === "FORM" ? "submit" : "click", { bubbles: true, cancelable: true }));
      expect(app.getState()).toEqual(stateBefore);
      expect(storage.getItem(STORAGE_KEY)).toBe(gameBefore);
      expect(storage.getItem(ADVENTURE_STORAGE_KEY)).toBe(adventureBefore);
      expect(storage.getItem(PARENT_ACCESS_KEY)).toBe(accessBefore);
      expect(root.textContent).toContain(HR.parentDenied);
    }
  });

  it("maps every closed runtime code and hides an unknown English code", () => {
    for (const code of [...LOAD_CODES, ...RESULT_CODES]) {
      const rendered = messageForCode(code);
      expect(rendered.trim()).not.toBe("");
      expect(rendered).not.toContain(code);
    }
    for (const code of PARENT_ACCESS_CODES) {
      const rendered = PARENT_ACCESS_MESSAGES[code];
      expect(rendered.trim()).not.toBe("");
      expect(rendered).not.toContain(code);
    }
    for (const code of ACTIVITY_CODES) {
      const needsName = ["chore-reward-paid", "pet-purchased", "item-purchased"].includes(code);
      const activity = needsName ? { code, amount: 7, name: "Primjer" } : { code, amount: 7 };
      const rendered = activityMessage(activity as Parameters<typeof activityMessage>[0]);
      expect(rendered).toContain("7");
      expect(rendered).not.toContain(code);
    }
    expect(messageForCode("unexpected-english-error")).toBe(HR.genericError);
    expect(messageForCode("unexpected-english-error")).not.toContain("unexpected-english-error");
    expect(messageForCode("toString")).toBe(HR.genericError);
    for (const code of [...ADVENTURE_LOAD_CODES, ...ADVENTURE_RESULT_CODES]) {
      const rendered = adventureMessageForCode(code);
      expect(rendered.trim()).not.toBe("");
      expect(rendered).not.toContain(code);
      expect(ADVENTURE_MESSAGES[code]).toBe(rendered);
    }
    expect(adventureMessageForCode("unexpected-english-error")).toBe(HR.genericError);
  });

  it("renders five Croatian child destinations separately from the parent utility", () => {
    createApp(root, storage);
    const childNavigation = root.querySelector<HTMLElement>("nav.child-navigation");
    expect(childNavigation).not.toBeNull();
    expect(childNavigation?.getAttribute("aria-label")).toBe(HR.navigationLabel);
    const expectedChildren = [
      ["adventure", "🗺️", HR.navAdventure],
      ["money", "🐷", HR.navMoney],
      ["chores", "🌻", HR.navChores],
      ["shop", "🎪", HR.navShop],
      ["house", "🏡", HR.navHouse],
    ] as const;
    const childButtons = [...childNavigation!.querySelectorAll<HTMLButtonElement>("button[data-nav]")];
    expect(childButtons).toHaveLength(5);
    expect(childButtons.map(({ dataset }) => dataset.nav)).toEqual(expectedChildren.map(([id]) => id));
    expectedChildren.forEach(([id, icon, label], index) => {
      const button = childButtons[index];
      expect(button.querySelector(".nav-icon")?.textContent).toBe(icon);
      expect(button.querySelector(".nav-icon")?.getAttribute("aria-hidden")).toBe("true");
      expect(button.querySelector("span:not(.nav-icon):not(.sr-only)")?.textContent).toBe(label);
    });
    expect(childButtons[0].classList.contains("active")).toBe(true);
    expect(childButtons[0].getAttribute("aria-current")).toBe("page");
    expect(childButtons[0].querySelector(".sr-only")?.textContent).toBe(HR.currentView);
    expect(childNavigation?.querySelector('[data-nav="parent"]')).toBeNull();

    const parentUtility = root.querySelector<HTMLElement>(".parent-utility");
    const parentButton = parentUtility?.querySelector<HTMLButtonElement>('[data-nav="parent"]');
    expect(parentUtility?.getAttribute("aria-label")).toBe(HR.parentUtilityLabel);
    expect(parentButton?.closest("nav")).toBeNull();
    expect(parentButton?.querySelector(".nav-icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(parentButton?.textContent).toContain(HR.navParent);
    expect(root.querySelector(".fictional-notice")?.textContent).toBe("Ovo je igra s izmišljenim zlatnicima — bez pravog novca.");

    click('[data-nav="money"]');
    expect(root.querySelector('[data-nav="money"]')?.getAttribute("aria-current")).toBe("page");
    expect(root.querySelector('[data-nav="adventure"]')?.getAttribute("aria-current")).toBeNull();
    click('[data-nav="parent"]');
    expect(root.querySelector('[data-nav="parent"]')?.getAttribute("aria-current")).toBe("page");
    expect(childNavigation?.querySelectorAll("button.active")).toHaveLength(0);
  });

  it("accounts for visual and accessibility channels in all six views", () => {
    createApp(root, storage);
    const inventory = [
      { nav: "adventure", selector: "h1", value: HR.adventureHeading },
      { nav: "money", selector: "h1", value: HR.moneyHeading },
      { nav: "chores", selector: "h1", value: HR.choresHeading },
      { nav: "shop", selector: "h1", value: HR.shopHeading },
      { nav: "house", selector: "h1", value: HR.houseHeading },
      { nav: "parent", selector: "h1", value: HR.parentHeading },
    ];
    for (const row of inventory) {
      click(`[data-nav="${row.nav}"]`);
      expect(root.querySelector(row.selector)?.textContent).toContain(row.value);
      expect(root.querySelector("nav")?.getAttribute("aria-label")).toBe(HR.navigationLabel);
      expect(root.querySelector('[role="status"]')?.getAttribute("aria-live")).toBe("polite");
      for (const element of root.querySelectorAll<HTMLElement>("[aria-label], [aria-valuetext], [placeholder]")) {
        for (const attribute of ["aria-label", "aria-valuetext", "placeholder"]) {
          const value = element.getAttribute(attribute);
          if (value !== null) expect(value.trim(), `${row.nav} ${attribute}`).not.toBe("");
        }
      }
    }
    click('[data-nav="adventure"]');
    expect(root.querySelector(".adventure-scene")?.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector(".guide-card > span")?.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector(".badge > span")?.getAttribute("aria-hidden")).toBe("true");
    click('[data-nav="shop"]');
    expect(root.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("Sličica");
    click('[data-nav="house"]');
    expect(root.querySelector(".decoration")?.getAttribute("aria-hidden")).toBe("true");
    click('[data-nav="parent"]');
    expect(root.querySelector(".parent-decoration")?.getAttribute("aria-hidden")).toBe("true");
    expect(document.documentElement.lang).toBe("hr");
    const css = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
    expect(css).toContain("transition: none !important");
    for (const reaction of ["correct-choice", "action-step", "star-award", "journey-finale"]) expect(css).toContain(`@keyframes ${reaction}`);
    const index = readFileSync(`${process.cwd()}/index.html`, "utf8");
    expect(index).toContain("<title>Moja trgovina ljubimaca</title>");
    expect(index).toContain('<html lang="hr">');
  });

  it("shows Croatian validation and recovery feedback without exposing raw data", async () => {
    storage.setItem(STORAGE_KEY, "broken-json");
    await provisionParentAccess();
    createApp(root, storage);
    expect(root.textContent).toContain("Spremljeni podaci nisu čitljivi");
    expect(root.textContent).not.toContain("broken-json");
    click('[data-nav="parent"]');
    submit('[data-form="parent-unlock"]');
    await waitForText("PIN mora sadržavati točno šest znamenki");
  });

  it("keeps corrupt-state recovery Croatian and never exposes persisted internals", () => {
    const cases = [
      { raw: "{not-json", message: "Spremljeni podaci nisu čitljivi" },
      { raw: JSON.stringify({ version: 99 }), message: "Spremljena igra je iz nepoznate inačice" },
      { raw: JSON.stringify({ ...initialState(), wallet: -1 }), message: "Spremljena igra nije valjana" },
    ];
    for (const { raw, message } of cases) {
      storage.setItem(STORAGE_KEY, raw);
      const app = createApp(root, storage);
      expect(root.textContent).toContain(message);
      expect(root.textContent).not.toContain(raw);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
      app.destroy();
    }

    const unavailable: StorageLike = {
      getItem: () => { throw new Error("English storage failure"); },
      setItem: () => { throw new Error("English storage failure"); },
    };
    createApp(root, unavailable);
    expect(root.textContent).toContain("Spremanje u ovom pregledniku nije dostupno");
    expect(root.textContent).not.toContain("English storage failure");
  });

  it("renders populated normal and empty views with Croatian labels, not runtime IDs", () => {
    const populated = {
      ...initialState(),
      wallet: 40,
      savings: 10,
      debt: 5,
      choreRequests: [{ id: 1, choreId: "make-bed", status: "approved" as const }],
      ownedPets: [{ id: 2, catalogId: "fish" }],
      itemQuantities: { bowl: 1 },
      selectedTheme: "forest",
      petPlacements: { "pet-1": 2, "pet-2": null, "pet-3": null, "pet-4": null },
      itemPlacements: { "item-1": "bowl", "item-2": null, "item-3": null, "item-4": null, "item-5": null, "item-6": null },
      nextId: 3,
      activities: [{ code: "pet-purchased" as const, name: "Ribica", amount: 30 }],
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(populated));
    createApp(root, storage);

    const leakedCodes = ["make-bed", "fish", "bowl", "forest", ...ACTIVITY_CODES, ...LOAD_CODES, ...RESULT_CODES];
    for (const view of ["adventure", "money", "chores", "shop", "house", "parent"]) {
      click(`[data-nav="${view}"]`);
      const playerChannels = [
        root.textContent ?? "",
        ...[...root.querySelectorAll<HTMLElement>("[aria-label], [aria-valuetext], [placeholder]")].flatMap((element) =>
          ["aria-label", "aria-valuetext", "placeholder"].map((attribute) => element.getAttribute(attribute) ?? ""),
        ),
      ].join(" ");
      expect(playerChannels.trim()).not.toBe("");
      for (const code of leakedCodes) expect(playerChannels).not.toContain(code);
    }
  });
});
