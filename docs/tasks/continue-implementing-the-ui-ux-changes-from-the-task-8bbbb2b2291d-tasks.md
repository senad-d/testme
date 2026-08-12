### 1. Repair the completed child-navigation regression test

- [ ] Update the navigation test to query the post-rerender DOM rather than retaining the initial detached navigation element.

#### Why
The confirmed originating plan is `docs/tasks/start-implementing-the-changes-specified-in-docs-task-ed715d30e9ec-tasks.md` from OrcMe task `task-ed715d30e9ec`. Its Task 1 source changes are present: `childViews` has five destinations and `render()` emits a separate `.parent-utility`. The corresponding test currently captures `childNavigation` before navigation clicks, but each click calls `render()` and replaces `root.innerHTML`, so its final assertion reads a detached element.

#### How
Depends on: none. In the existing child-navigation test, retain assertions about the initial five-child structure, then re-query from `root` after each navigation that causes a rerender. Do not alter child navigation behavior, parent access behavior, or the test's Croatian-copy assertions.

#### Where
`src/app.test.ts`

#### Acceptance criteria
- The test that verifies five Croatian child destinations and the separate parent utility passes after navigating to Moj novac and Kutak za roditelje.
- Its final assertion reads the currently rendered child navigation and proves it has no active child button while the current parent utility has `aria-current="page"`.
- The test continues to verify the five child IDs in order, decorative hidden icons, the parent control outside the child `<nav>`, and the exact fictional-money notice.
- No application source, styles, content, game rule, or persistence file is changed by this task.

### 2. Make Pustolovina mission-first and collapse optional learning

- [ ] Rebuild the adventure view around the compact Luna introduction, active mission, compact progress, and initially closed supporting disclosures.

#### Why
The confirmed plan’s remaining Task 2 is unimplemented: current `renderAdventure` still renders scenery, the large guide, progress, and full journey stories before the mission, and renders practice, badges, and money school expanded. This conflicts with the approved design specification’s mission-first hierarchy while `ADVENTURE_MISSIONS`, `MISSION_IDS`, practice, badges, and school already supply the existing content to preserve.

#### How
Depends on: Task 1. In `renderAdventure`, render a compact decorative Luna introduction with the specified Croatian heading and two orientation lines, then the active mission card, compact four-step textual progress, and native closed `<details>` sections for practice, badges, and school. Preserve all four mission IDs and ordering, action/game-state calculations, two-choice limit, and local-only practice state. Use a semantic question group and responsive mission/answer/stepper styles; add only required Croatian labels and statuses. Do not change `src/game/*` or any persistence schema.

#### Where
`src/main.ts`
`src/styles.css`
`src/content/hr.ts`

#### Acceptance criteria
- Fresh Pustolovina places the active mission before progress, practice, badges, and school in DOM and visual order at 320 × 800, 768 × 900, and 1440 × 900, with the first answer’s top edge at or above y=900 after finite animation settles.
- The compact introduction contains **Pustolovina sa šapicama**, **Luna ti pokazuje sljedeći korak.**, and **Nova pustolovina je spremna.**; its decorative Luna illustration is hidden from assistive technology and is 72 CSS px on phone.
- The mission card exposes mission count, title, story, instruction, a semantically associated question group, no more than two answers, and existing checklist/CTA behavior; at ≥768 px its centered readable inner measure is no wider than 760 CSS px.
- Progress lists all four mission titles in order with textual **Trenutačna**, **Dovršeno**, or **Zaključano** state and textual `N od 4 zvjezdice`; locked overview steps omit stories.
- **Vježbaj pravila**, **Moje značke**, and **Mala škola novca** are keyboard-reachable native `<details>` sections closed on first load, with ≥44 px summaries and opening them changes no game, adventure, or parent storage record.

### 3. Localize feedback and restore focus across rerenders

- [ ] Add local Croatian result states and explicit focus intents for navigation, validation, mission answers, and accepted child actions.

#### Why
Current action handlers call `render()`, which replaces focused controls, and ordinary messages are emitted through the distant global `#feedback`. The design requires retryable local mission feedback, one appropriate live announcement, and predictable focus after the replacement DOM exists without changing game rules or persistence.

#### How
Depends on: Task 2. Add render-time focus and local-result intent state inside `createApp`; consume an intent only after `root.innerHTML` is replaced. Keep navigation focus on a destination heading or main landmark, validation/wrong-answer focus on the equivalent control, successful child-action focus on a nearby local result, and completed-mission focus on a completion heading with `tabindex="-1"`. Render correct/wrong mission states with Croatian text, non-color cues, explanation association, and only the other answer disabled after a correct answer. Reserve global feedback for recovery or cases without a local result, and extend styles and Croatian content without modifying game modules or storage schemas.

#### Where
`src/main.ts`
`src/styles.css`
`src/content/hr.ts`

#### Acceptance criteria
- A wrong mission answer stays enabled and retryable, shows adjacent Croatian **Pokušaj ponovno** in one polite atomic local status, and restores focus to its rendered equivalent answer.
- A correct answer displays visible **Točno** text/icon and non-color state styling, exposes its explanation through text or `aria-describedby`, disables only the other answer, and moves focus to the next checklist/completion target rather than a detached node.
- Child navigation focuses the destination `h1[tabindex="-1"]` or main landmark; invalid amount input focuses its invalid control; accepted save, purchase, chore, and placement actions focus a nearby local result without changing scroll for local feedback.
- Ordinary clean load presents **Nova pustolovina je spremna.** in the Luna introduction and does not present the persistent global **Nova igra je spremna!** celebration; each action result is announced by only one live region.
- Reduced-motion mode exposes the same text, progress, state, and focus outcomes with no keyframe or nonessential transform transition, while normal-motion entrance/success animation completes within 450 ms and success does not loop.

### 4. Clarify money and chore actions at the point of use

- [ ] Reorder Moj novac and Poslovi and add non-mutating loan previews, chore state badges, and local confirmations.

#### Why
Current money rendering groups saving and loan forms together and offers no entered-amount consequence preview. Current chores render the earnings challenge before chores and merely disable **Gotovo!** when a request is pending. Existing `borrowCoins`, `repayDebt`, `requestChore`, and their result codes define rules that the redesign must retain.

#### How
Depends on: Task 3. Reorder money to current mission, balances, savings, planner, activities, and a distinct **Zajam u igri** panel; use amount-entry events to calculate a non-persisted borrow/repay wallet-and-debt preview before submit. Reorder chores to current mission, chore list, then a closed native earnings-challenge disclosure. Render each known state with icon-plus-text and replace an accepted chore’s actionable control with disabled **Čeka potvrdu roditelja**, using the local-result/focus mechanism from Task 3. Add responsive one-column form/action styles and Croatian copy only; leave money/chore functions, approval requirements, and persistence unchanged.

#### Where
`src/main.ts`
`src/styles.css`
`src/content/hr.ts`

#### Acceptance criteria
- Moj novac renders current mission, the three existing balances, savings actions, goal planner, activities, then a visibly distinct **Zajam u igri** panel that keeps **Zajam je samo dio igre** visible.
- Entering 10 before borrowing shows **Ako posudiš 10: Novčanik +10, Dug +10.** and entering 10 before repayment shows **Ako vratiš 10: Novčanik −10, Dug −10.**; previews change neither in-memory state, activity history, nor persisted records.
- Money submissions continue to use existing money functions and result codes, and phone-width money forms/actions are one column with full-width primary actions.
- Poslovi renders its current mission before the chore list and **Izazov zarade** in an initially closed optional disclosure.
- Every chore card has an icon-plus-text **Za napraviti**, **Čeka potvrdu**, or **Potvrđeno** state; an accepted chore replaces **Gotovo!** with disabled **Čeka potvrdu roditelja** and a nearby local confirmation without changing parent approval requirements.

### 5. Keep shop and house consequences visible

- [ ] Add in-view wallet/filter results to Trgovina and two-step local placement feedback to Moja kuća.

#### Why
The current shop omits the wallet amount and a filter result count, while its disabled unaffordable reason is generic. The house retains select placement but gives no two-step instruction or nearby destination outcome. Existing catalog order, affordability checks, select controls, and parent fail-closed rendering are the contracts to preserve.

#### How
Depends on: Task 3. In `renderShop`, add a textual wallet summary below the heading and one polite result count that changes with category/affordability filters; retain pets, pet items, then house items order and derive **Treba ti još N zlatnika** only from wallet arithmetic. In `renderHouse`, retain select-based placement, put the two numbered instructions before unplaced assets, and route successful placement through the local-result/focus mechanism from Task 3. Add only matching Croatian content and responsive layout/state styles; do not change `src/game/*`, stored schemas, or parent lock/unprovisioned/unavailable/relocked behavior.

#### Where
`src/main.ts`
`src/styles.css`
`src/content/hr.ts`

#### Acceptance criteria
- Trgovina shows **U novčaniku imaš: N zlatnika.** directly below its heading, without a sticky overlay, and updates it immediately after a successful purchase.
- Each category or affordability-filter change exposes exactly one polite Croatian **Prikazano N ponuda.** result count while existing filters, catalog family order, inventory display, and `aria-pressed` behavior continue to work.
- Owned and unaffordable controls remain disabled with visible Croatian reasons; calculable shortages say **Treba ti još N zlatnika** and do not suggest savings, real money, or automatic borrowing.
- Moja kuća keeps select-only placement and shows **1. Odaberi mjesto. 2. Odaberi Postavi.** before unplaced assets; successful placement keeps item and area names visible and reports **Postavljeno u: [područje].** locally.
- At phone width placement select/action groups are one column, and parent grant, approval, and return controls remain absent in locked, unprovisioned, unavailable, and relocked states.

### 6. Cover the continued UI/UX DOM, focus, and persistence contracts

- [ ] Extend integrated tests for the completed redesign and execute the defined automated and fresh-browser validation.

#### Why
`src/app.test.ts` already exercises integrated rendering, storage, and parent fail-closed states, while Task 1 demonstrated that rerender-sensitive DOM assertions need to query current elements. The design specification requires regression evidence for hierarchy, local feedback, focus, Croatian language, persistence, responsive layout, and accessibility after Tasks 2–5.

#### How
Depends on: Tasks 4, 5. Add DOM-driven tests for the redesigned header/navigation, mission-first disclosures and stepper, retryable/correct mission answer focus, localized local results, money previews, pending chores, shop wallet/filter count/affordability text, and house placement result. Assert that non-mutating previews/disclosures retain the three V1 localStorage records byte-for-byte and that parent fail-closed states remain absent across reload. Then run the declared automated checks and perform the specified fresh-Chrome viewport, zoom, keyboard, reduced-motion, target-size, overflow, and contrast inspections. Do not add browser-family or screen-reader claims not actually executed.

#### Where
`src/app.test.ts`

#### Acceptance criteria
- Automated tests cover all five child controls, the separate parent utility, mission-before-supporting-content order, four textual progress states, the exact Luna heading/orientation copy, and initially closed practice/badge/school disclosures without storage mutation.
- Tests cover wrong-answer retry/focus, correct-answer text/association/focus, destination-heading navigation focus, and a single nearby local result for save, buy, chore, house, and validation outcomes.
- Tests cover non-mutating borrow/repay previews, disabled pending chores, shop wallet/count/immediate purchase update and unaffordable reason, plus select-only house placement result.
- Tests prove existing game, adventure, and parent records remain byte-for-byte compatible through reload and prove no parent grant, approval, or return controls render in locked, unprovisioned, unavailable, or relocked states.
- `npm test`, `npm run check`, and `npm run build` pass; fresh Chrome evidence at 320 × 800, 768 × 900, and 1440 × 900 shows `scrollWidth === innerWidth`, no clipped/overlapping enabled controls, ≥44 × 44 CSS px enabled targets, and a centered active-mission readable measure no wider than 760 CSS px at ≥768 px.
- At 320 CSS px and 200% browser zoom, fresh Chrome evidence shows reflow without two-dimensional scrolling; keyboard-only evidence shows the skip link moves to main content and Tab/Shift+Tab reach visible actions in visual order with a visible focus indicator. Safari, Firefox, and screen-reader validation remain unclaimed unless separately executed.
