# Croatian Money and Pet Game

**Status:** implementation-ready draft — not adopted, published, validated, or implemented  
**Goal:** Build a simple responsive web game that teaches an eight-year-old child basic money decisions through household chores, saving, spending, and interest-free fictional borrowing. All user-facing game content must be in Croatian; engineering artifacts and documentation are in English.

## Producer receipt — current revision

- **Producer:** garrosh-planner, assignment `task-d80625079570`, run `run-dc9ab2abdd77`.
- **Revision basis:** original product request and Croatian-only clarification; current PRD at `../prd/prd-igra-financijske-vjestine.md`; durable requirement `m156`; read-only repository reassessment `handoff-f6810d1cdca2b6ac334068a362338625`; the two independent PASS critiques of the preceding exact functional plan, `handoff-85a6dba14fe2dea29b85294d30321753` and `handoff-cb9a5bc836c0bf95a405066843edf28b`; and the repeated claimless developer stops recorded in shared context, including `handoff-8cbdeb5398a957040d7474e73d78e6de`, `handoff-5c901a76cce4fd6827ac54cd008a0d91`, and `handoff-5adb716c4299b99635055ed4c2f840af`.
- **Produced scope:** one eight-slice implementation proposal, with explicit dependencies and no more than three files per slice. The functional scope and ordering are unchanged from the independently reviewed revision; this recalculation refreshes its evidence, resolves the reviewers' optional Task 7 wording advisory, and makes the execution gate explicit. This exact refreshed revision is not self-approved: it remains to be independently reviewed before adoption. It is not adopted, published, validated, or implemented.

## Evidence and boundaries

### Evidence

- The original request requires: parent-granted fictional money; earnings from household chores; spending, saving, borrowing, and repayment; a store with different animals; a customizable house that holds purchased animals and items; age-appropriate design; Croatian game content; common-device support; and easy maintenance.
- Current repository inspection confirms there is still no application scaffold, package manifest, source, tests, CI, or established technology convention; the repository contains Pi harness files, this plan, and the product requirements record at `../prd/prd-igra-financijske-vjestine.md`. The plan therefore includes a minimal new scaffold.
- The PRD confirms the complete requested behavior and keeps the technical stack, persistence, detailed catalogs, economy values, borrowing rules, hosting, and browser baseline as product decisions rather than user-established requirements.
- The latest user clarification permits engineering work and internal documentation to remain in English while requiring the application itself to remain in Croatian, including errors and accessibility labels.
- Five developer attempts stopped without implementation because their authoritative assignments granted `Claims: none`; shared context also identifies an invalid workflow dependency on unknown step `s5`. The absence of application progress is therefore an orchestration and write-authorization failure, not evidence that source implementation was attempted or that the eight slices were completed.

### Recalculated execution gate

1. Keep implementation stopped while an independent plan critic reviews this exact refreshed revision and the product owner decides whether to adopt its disclosed defaults.
2. If the plan and defaults are accepted, repair the managed workflow so every dependency names an existing step and each implementation assignment has explicit exclusive claims for every path in that task's **Where** section. This plan deliberately retains no npm lockfile: `package.json` must pin every dependency to an exact version, installation must use `npm install --no-package-lock`, and `package-lock.json` must not be created or retained and is therefore excluded from the claimed path inventory. Any other retained artifact must first be added to a bounded plan task; `Claims: none` is not authorization to create it.
3. Implement Tasks 1–8 in their declared dependency order, validating each slice before its consumers begin. Do not treat the prior claimless developer runs as completed implementation work.

This execution gate is orchestration guidance, not an additional implementation slice. OrcMe alone adopts the plan and issues assignments.

### Working decisions required for an implementation-ready plan

The PRD deliberately leaves the following details open. This draft chooses bounded, maintainable defaults so its slices are implementable; they remain explicit product decisions to confirm before the plan is adopted.

- Use a static npm-managed Vite + TypeScript web application with no server, a vanilla DOM/CSS UI, and Vitest plus jsdom for tests. One codebase will run in current browsers on phones, tablets, and computers.
- Store game data in the current browser's `localStorage`. “Any device” means responsive operation on common device types, not synchronization of one profile between devices.
- The parent area and child area share one local profile. The parent area is a clear UX separation, not a security boundary; a PIN, accounts, and remote approval were not requested.
- Use fictional **zlatnici** (gold coins), never euros. Loans are interest-free, limited by configuration, and always show outstanding debt. There are no penalties or real financial products.
- Saving moves coins between the spendable wallet and piggy bank. Purchases and repayments use the wallet, which can never become negative.
- All user-facing application text is Croatian. English remains allowed for source identifiers, comments, test descriptions, commit messages, tool output, and internal documentation because those are not rendered application content.

### Mandatory localization contract for every slice

- Croatian is required for every rendered page title, heading, label, placeholder, button, navigation item, instruction, confirmation, validation/error message, empty/loading/recovery state, activity entry, currency/rule explanation, and game-content string or description shown to either child or parent.
- Every user-perceivable accessibility string is also Croatian: accessible names and descriptions, `aria-label`, `aria-description`/`aria-describedby` source text, `aria-valuetext`, image alternative text, native/custom validation text, live-region/status/alert announcements, and screen-reader-only instructions. Informative visuals have Croatian alternatives; purely decorative visuals are hidden from assistive technology. `index.html` declares `lang="hr"` and uses a Croatian `<title>`.
- There is no user-visible or assistive-technology-visible English fallback. Domain code may return only the closed English-named internal code inventories established in Task 2. Typed, exhaustive maps in `src/content/hr.ts` convert every result, error, view-state, load/recovery, and activity code to Croatian; `src/main.ts` must never interpolate a raw code into the DOM.
- Every slice that adds UI validates its new success, rejection, empty, and unavailable states against this contract. Task 7 exhaustively exercises the full code inventories and audits every user-visible output channel, rather than sampling representative states, and retains a manual Croatian-language review for naturalness.

### Deliberately out of scope

User accounts, authentication, cloud storage, cross-device synchronization, real money or payments, interest, advertising, analytics, social features, multiple child profiles, a server API, app-store packaging, and offline PWA installation are not requested. Cross-device shared state would require a separate decision about identity, privacy, hosting, and backend design.

## Proposed structure

- After Task 7, `src/content/hr.ts` is the single runtime source for starter values, rules, and Croatian display copy: labels, messages, instructions, activity templates, and catalogs that maintainers will update most often. The static Croatian `<title>` in `index.html`, needed before the application loads, is the only audited exception; all Task 1 literals remaining in `src/main.ts`, including welcome and startup-failure copy, are migrated to `hr.ts` in Task 7.
- `src/game/*.ts` contains pure domain operations. Each operation returns new state or a member of the closed internal code inventories from Task 2 without a partial update; the UI maps that code to Croatian display copy and fails closed with a generic Croatian error for an unexpected runtime value.
- `src/main.ts` renders a small DOM UI and connects the domain to persistence; `src/styles.css` contains the responsive presentation.
- State uses whole-number coins and a versioned JSON schema. Every successful money change creates an activity entry that explains the result to the child.
- Vitest covers domain rules, persistence, and critical user journeys. Vite produces the static `dist/` deployment directory.

## Implementation plan

### 1. Scaffold an executable Croatian web application

**Depends on:** nothing  
**Where:** `package.json`, `index.html`, `src/main.ts`

**Work:**

- Configure Vite, TypeScript, Vitest, and jsdom with `dev`, `build`, and `test` scripts. Pin every dependency and development dependency in `package.json` to an exact version with no range prefix. The initial test command may allow no tests until Task 2.
- Deliberately retain no npm lockfile: install with `npm install --no-package-lock`, and do not create or keep `package-lock.json`.
- Add `lang="hr"`, UTF-8, mobile viewport metadata, a Croatian page title, and the root application element to `index.html`.
- Render a Croatian welcome screen with the game name, a short explanation that the coins are fictional, and a safe Croatian fallback message if startup fails.
- Keep package metadata, source identifiers, comments, and development messages in English.

**Acceptance criteria:**

- From a clean checkout, `npm install --no-package-lock` requires no manual setup and leaves no `package-lock.json`; `npm run build` creates `dist/`, and `npm test` passes.
- Opening the application displays only Croatian user-facing product text and produces no console error.
- The document declares Croatian as its language and has a valid mobile viewport.

**Validation:** From a clean checkout, run `npm install --no-package-lock`, assert that `package-lock.json` does not exist, then run `npm run build` and `npm test`; open the development application in a browser.

### 2. Add centralized Croatian content and versioned local state

**Depends on:** 1  
**Where:** `src/content/hr.ts`, `src/game/store.ts`, `src/game/store.test.ts`

**Work:**

- Define maintainable configuration in `hr.ts`: the fictional currency label, a maximum outstanding debt of 100 coins, quick amounts 5/10/20, every Croatian UI label, message, instruction, and activity template—including keys for Task 1's welcome and startup-failure copy for Task 7 to reuse—and these starter catalogs:
  - chores: **Posloži krevet (5)**, **Pospremi igračke (8)**, **Zalij biljke (6)**, **Postavi stol (10)**, and **Pomozi složiti rublje (12)**;
  - animals: **Ribica (30)**, **Kunić (50)**, **Mačka (60)**, and **Pas (80)**;
  - items: pet items **Zdjelica (10)**, **Igračka (15)**, and **Krevetić (20)**; house decorations **Biljka (12)**, **Tepih (18)**, and **Zidna slika (22)**;
  - free house themes: **Sunce**, **More**, and **Šuma**.
- In `store.ts`, define exported `as const` inventories and derived closed union types that Tasks 3–6 must reuse without ad hoc strings:
  - load/recovery codes: `load-empty`, `load-malformed`, `load-unknown-version`, `load-invalid-state`, `load-unavailable`, and `save-unavailable`;
  - view/action result codes: `activity-empty`, `chore-requests-empty`, `pet-inventory-empty`, `item-inventory-empty`, `purchase-unavailable`, `grant-ok`, `save-ok`, `withdraw-ok`, `borrow-ok`, `repay-ok`, `chore-request-ok`, `chore-approve-ok`, `chore-return-ok`, `pet-purchase-ok`, `item-purchase-ok`, `theme-select-ok`, `house-place-ok`, `house-move-ok`, `house-remove-ok`, `invalid-amount`, `insufficient-wallet`, `insufficient-savings`, `debt-limit-exceeded`, `repayment-exceeds-debt`, `unknown-chore`, `chore-already-pending`, `unknown-chore-request`, `chore-request-already-resolved`, `unknown-shop-entry`, `pet-already-owned`, `unknown-theme`, `unknown-house-slot`, `house-slot-occupied`, `house-slot-empty`, `unknown-asset`, `asset-not-owned`, `asset-already-placed`, and `item-quantity-exhausted`;
  - activity codes: `coins-granted`, `coins-saved`, `savings-withdrawn`, `coins-borrowed`, `debt-repaid`, `chore-reward-paid`, `pet-purchased`, and `item-purchased`.
- In `hr.ts`, provide a non-empty Croatian string or parameterized template for every member of those inventories using exhaustive typed `Record`/discriminated-union mappings. Activity entries pair each activity code with its required parameters, such as amount or catalog name; V1 validation rejects unknown codes or invalid parameters. A later task that truly needs another user-visible code must extend the appropriate inventory, Croatian mapping, and exhaustive test together.
- Define `AppStateV1` with wallet, savings, debt, chore requests, owned pet instances, item quantities, selected house theme, pet/item placements, the next local ID, and typed activity entries. Initial state uses zero balances and empty collections. V1 permits at most one owned pet instance for each of the four animal catalog IDs so every valid owned-pet set fits the four house pet slots.
- Implement safe load, V1 shape validation, save-after-accepted-change, and fallback to initial state with the mapped Croatian notice when stored JSON is absent or unreadable. Do not overwrite unreadable data until the user performs a later accepted change.

**Acceptance criteria:**

- Tests prove V1 round-trip, initial state when no saved data exists, and controlled recovery from malformed or unknown-version JSON.
- Tests iterate every exported load/recovery, view/action result, and activity code and prove that `hr.ts` has exactly one non-empty Croatian mapping/template for each member; unknown persisted activity codes and malformed activity parameters fail V1 validation.
- All money fields accept only non-negative whole coins; persisted state that violates invariants does not enter the game.
- Catalogs have stable IDs, Croatian names, and exactly the members listed above. No other chores, animals, items, or themes are included in this iteration.
- `store.ts` has no DOM dependency and can be tested with an in-memory Web Storage substitute.
- Code, test descriptions, and comments are English; values displayed to the player are Croatian.

**Validation:** Run `npm test -- src/game/store.test.ts` and `npm run build`.

### 3. Deliver wallet, parent grants, savings, and loans

**Depends on:** 2  
**Where:** `src/game/money.ts`, `src/game/money.test.ts`, `src/main.ts`

**Work:**

- Add atomic pure operations for parent coin grants, saving to the piggy bank, withdrawing from savings, interest-free borrowing, and repayment.
- In the child area, show large **Novčanik**, **Kasica**, and **Dug** cards, 5/10/20 quick amounts, short Croatian explanations, and the five latest activity entries.
- Put positive whole-number grants in a separately labeled **Kutak za roditelje**. Do not represent it as locked or secure.
- Borrowing may increase total debt only up to the configured 100-coin limit. Repayment cannot exceed either debt or wallet balance. Saving and withdrawal cannot exceed their source balance.

**Acceptance criteria:**

- Tests cover every successful operation, zero, negative/decimal input, insufficient source balance, debt-limit overflow, and excessive repayment.
- A rejected operation leaves all state unchanged and returns an internal code that the UI renders as a clear Croatian message. A successful operation persists state and adds an activity code/parameters that the UI renders as the correct Croatian entry.
- The UI can grant, save, withdraw, borrow, and repay, and all three displayed balances immediately match persisted state.
- The UI states that coins and loans are part of a game and never displays a real currency name or symbol.

**Validation:** Run `npm test -- src/game/money.test.ts`; manually execute all five flows and reload.

### 4. Connect household chores to parent-approved earnings

**Depends on:** 2, 3  
**Where:** `src/game/chores.ts`, `src/game/chores.test.ts`, `src/main.ts`

**Work:**

- List the five chores and rewards in the child view. **Gotovo!** creates at most one pending request per chore.
- Show pending requests in the parent area with **Potvrdi** and **Vrati na doradu** actions. Approval adds the exact reward to the wallet and creates an activity entry; returning it adds no money.
- Allow another request for the same chore after resolution, but never pay the same request ID twice.

**Acceptance criteria:**

- Tests prove request–approval–payment, return-without-payment, prevention of parallel requests for one chore, and idempotent handling of the same request.
- A child cannot earn the reward merely by marking the chore complete; the reward enters the wallet only after parent approval.
- The UI uses the Croatian statuses **Za napraviti**, **Čeka potvrdu**, and **Potvrđeno**, showing the reward and feedback after every action.
- Reload preserves pending requests and completed payouts.

**Validation:** Run `npm test -- src/game/chores.test.ts`; manually test approval and return, then reload.

### 5. Deliver the pet and item shop

**Depends on:** 2, 3  
**Where:** `src/game/shop.ts`, `src/game/shop.test.ts`, `src/main.ts`

**Work:**

- Show two Croatian shop categories containing the four animal types and six item types from the content catalog, each with a simple emoji/illustration, name, and price.
- Buying an animal creates an owned instance with a stable local ID. Allow at most one owned animal per catalog ID; a duplicate attempt returns `pet-already-owned`, charges nothing, and is mapped to clear Croatian feedback. Buying an item increases its inventory quantity.
- Charge only the wallet, never savings or a newly created loan. Every accepted purchase is atomic and creates an activity entry.

**Acceptance criteria:**

- Tests cover both purchase categories, all four distinct pet types, duplicate-pet rejection without charge, item quantity increments, insufficient funds, and unknown catalog IDs.
- A successful purchase deducts once and adds the purchase once. Failure—including a duplicate animal—changes neither balances, inventory, ID counter, nor activity.
- The UI disables an unaffordable or already-owned animal purchase, explains the reason in Croatian, and immediately shows a successful purchase in inventory.
- The shop contains exactly the 4 animal types and 6 item types enumerated in Task 2. Food consumption, effects, sales, and resale are deliberately excluded.

**Validation:** Run `npm test -- src/game/shop.test.ts`; manually buy an animal and item with sufficient and insufficient funds.

### 6. Place pets and purchased items in a customizable house

**Depends on:** 2, 5  
**Where:** `src/game/house.ts`, `src/game/house.test.ts`, `src/main.ts`

**Work:**

- Add a **Moja kuća** view with four pet slots and six item slots, usable through simple selection controls rather than precision drag-and-drop.
- Allow selection of the Sunce/More/Šuma theme, placement of a purchased pet instance or one purchased item in a free slot, movement between slots, and removal back to inventory.
- Display all placed pets and items in the house and all unplaced purchases in inventory. Placement has no extra cost.

**Acceptance criteria:**

- Tests cover theme selection, place/move/remove, occupied or unknown slots, nonexistent/unowned assets, and attempts to place more item copies than the inventory contains.
- A rejected change is atomic; an accepted layout and theme survive reload.
- Each purchased pet can occupy at most one slot, each placed item consumes one owned quantity, and removing it makes it available again. Tests prove that all four distinct catalog pets can occupy the four pet slots simultaneously.
- Every valid owned-pet set fits in the house, while repeated item purchases remain swappable inventory subject to the six item-slot capacity. The child can customize the house using owned assets only, with clear Croatian instructions and no precision dragging.

**Validation:** Run `npm test -- src/game/house.test.ts`; customize by keyboard and touch, then reload.

### 7. Complete the responsive, age-appropriate UI and integrated journeys

**Depends on:** 3, 4, 5, 6  
**Where:** `src/styles.css`, `src/app.test.ts`, `src/main.ts`

**Work:**

- Organize Croatian navigation as **Moj novac**, **Poslovi**, **Trgovina**, **Moja kuća**, and **Kutak za roditelje**. Use short sentences, large readable values, friendly colors, and consistent feedback.
- Support layouts without horizontal scrolling from 320 px upward, targets of at least 44×44 px, visible focus, semantic buttons/forms, Croatian accessible names, and keyboard-only operation. Color must not be the sole state indicator.
- Add a jsdom journey using the actual UI and a fresh store: parent grants coins; child submits a chore; parent approves it; child saves, borrows, and repays; child buys a pet and item; child places both in the house; reload restores state.
- Replace every user-visible literal remaining in `src/main.ts`—including the welcome and startup-failure copy from Task 1—with the corresponding keys already defined in `src/content/hr.ts` by Task 2. Route all runtime text through typed copy lookups or the exhaustive code/template mappings; never render, interpolate, or use an internal code as fallback copy. An unexpected runtime code produces only a generic Croatian error from `hr.ts`.
- Add a localization test that iterates every exported load/recovery, view/action result, and activity code, renders it through the same UI mapping path used by the application, and asserts non-empty Croatian output with all required parameters, no raw code, and no English fallback. Inject an unknown English runtime code and assert that it is not rendered and the Croatian generic error appears.
- In `src/app.test.ts`, maintain an explicit user-visible-channel inventory for all five views. Every row names a selector/action and its expected `hr.ts` copy key, except `document.title`, whose row names the exact static Croatian `index.html` literal. Cover `document.title`, DOM text, navigation, labels, instructions, buttons, placeholders, custom/native validation feedback, confirmations, empty/unavailable states, startup and persistence-recovery states, catalog/game content, activity entries, informative image `alt`, accessible names and descriptions (including text referenced by `aria-describedby`), `aria-label`, `aria-valuetext`, live-region/status/alert announcements, and screen-reader-only text; verify decorative visuals are excluded from the accessibility tree. The test traverses every row and all populated text-bearing DOM/ARIA attributes, fails for a missing selector or source reference, asserts that every populated user-visible or assistive-technology-visible channel is accounted for by a row, and asserts `lang="hr"`; retain a manual language checklist because automated coverage cannot prove natural Croatian. Engineering-only English is allowed.

**Acceptance criteria:**

- The integration journey passes without directly mutating state; final balances, debt, ownership, and layout equal the sum of the performed actions and persisted data.
- At 320, 768, and 1440 px there is no overlap or horizontal scrolling; phone, tablet, and desktop layouts work in current Chrome, Safari, Firefox, and Edge.
- Every action is keyboard-accessible, focus is visible, active states include text, and controls have Croatian accessible names.
- Every user-facing label, message, instruction, navigation item, state, accessible name, accessible description, validation string, live announcement, alternative text, and game-content string satisfies the mandatory localization contract. The exhaustive inventory test covers every code introduced by Tasks 2–6 and every named visual and accessibility output channel; the static Croatian `<title>` is the only runtime-copy-source exception, and no user-visible or assistive-technology-visible literal remains hard-coded in `src/main.ts`.
- There are no raw internal codes, English fallbacks, euros, ads, real-money purchases, or external links in rendered output.
- `npm test` and `npm run build` pass from a clean checkout.

**Validation:** Run `npm test -- src/app.test.ts`, then `npm test` and `npm run build`; manually complete the Croatian language checklist and test 320/768/1440 px plus keyboard use in the four browser families.

### 8. Document maintenance and safe content updates in English

**Depends on:** 1–7  
**Where:** `README.md`

**Work:**

- In English, document prerequisites, the deliberate no-lockfile policy, clean installation with `npm install --no-package-lock`, development, tests, production build, and static deployment of `dist/`. Explain that exact dependency versions are pinned in `package.json` and that `package-lock.json` must not be created or retained.
- Explain how to change rewards, prices, the debt limit, Croatian labels, and catalogs in `src/content/hr.ts` without changing domain rules.
- Document the V1 `localStorage` key, browser-local data limitation, safe demo-data reset, and the need for migration when the schema changes. State clearly that there is no authentication or synchronization.
- Add a pre-release checklist: `npm test`, `npm run build`, Croatian UI review, and manual 320/768/1440 px checks.

**Acceptance criteria:**

- A new maintainer can use the README from a clean checkout to run `npm install --no-package-lock` without creating `package-lock.json`, start development, run tests, and build production.
- The README points to existing scripts and paths and does not promise accounts, parent-area security, synchronization, or unsupported platforms.
- The procedure for changing one chore or shop entry covers a stable ID, Croatian display name, positive whole-number value, and tests to rerun.
- Documentation is English while every example of literal player-facing copy remains Croatian.

**Validation:** Follow the README from a clean checkout, confirm its installation command leaves no `package-lock.json`, and execute its checklist.

## Dependency order and definition of done

Tasks 1 and 2 establish the executable base and contracts. Task 3 provides the money foundation used by Tasks 4 and 5. Task 6 depends on shop ownership. Task 7 validates the complete player journey after all features exist, and Task 8 documents the completed structure and UI contract.

The plan is complete when all eight tasks satisfy their criteria, the full test/build checks pass, and the manual matrix confirms Croatian player-facing content and responsive operation. This document only proposes implementation; it is not adopted, published, validated, or implemented.

## Remaining uncertainties

- Hosting and minimum browser versions were not specified. The plan therefore targets current releases of the four major browser families and static hosting.
- The request does not state whether one profile must move between devices. This plan deliberately uses local persistence; synchronization would substantially change scope and privacy requirements.
- Prices, rewards, the debt limit, interest policy, exact catalogs, and detailed repayment rules were not supplied. This plan chooses small whole-number values, an interest-free 100-coin limit, wallet-only repayment, and the enumerated starter catalogs as maintainable defaults, but they remain product decisions to confirm before adoption.
