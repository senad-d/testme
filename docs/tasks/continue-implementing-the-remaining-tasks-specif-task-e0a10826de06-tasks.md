### 1. Add optional adventure practice without changing mission progress

- [ ] Add a six-card, replayable Croatian practice deck to Pustolovina while preserving the existing four-mission adventure and all three persisted records.

#### Why
Tasks 1–6 in `docs/tasks/game-improvement-tasks.md` are already represented in the current working tree, including the savings-goal planner, but Pustolovina still ends with the four one-time missions and six read-only `MONEY_SCHOOL` topics. A session-only practice deck adds retryable coverage for the same six concepts without creating spendable rewards or changing the strict `AdventureStateV1` contract.

#### How
Depends on: none. Preserve all existing completed implementation, including the current uncommitted changes in `src/content/hr.ts` and `src/main.ts`. In `src/content/hr.ts`, define one typed ordered practice card for each existing `GlossaryId` in this exact order: `wallet`/Novčanik, `savings`/Kasica, `earning`/Zarada, `price`/Cijena, `loan`/Zajam, and `debt`/Dug. Each card must contain one natural Croatian scenario, exactly two Croatian answer choices, one correct choice, and supportive correct and wrong explanations that enforce the current rules respectively: purchases charge wallet coins; savings can later be withdrawn; chore rewards arrive only after parent approval; price is the required wallet amount; borrowing increases debt; repayment reduces debt. In `src/main.ts`, render one practice card at a time in Pustolovina with previous/next controls and retryable answers; hold the current card, feedback, and set of correctly answered cards only in `createApp` controller memory. Allow practice before, during, and after the four missions, count each card at most once per controller session, and keep it replayable after completion. Do not call adventure or game domain mutations from practice handlers and do not add fields, IDs, result codes, evidence, stars, badges, storage writes, or qualifying adventure events. In `src/app.test.ts`, cover ordered navigation, wrong-answer retry, first-correct counting, replay, availability at incomplete and completed journey states, controller recreation reset, and byte-for-byte non-mutation of game, adventure, and parent-access storage.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- Exactly six practice cards render one at a time in the ordered family Novčanik, Kasica, Zarada, Cijena, Zajam, and Dug; every card has one Croatian scenario, two Croatian answers, exactly one correct answer, and correct/wrong explanations consistent with the six named current rules.
- A wrong answer shows supportive Croatian feedback without advancing or marking the card; a first correct answer marks that card once for the controller session; replaying the correct answer does not duplicate progress; previous/next controls traverse all six cards without skipping or duplicating one.
- Practice is available with the first mission active, between missions, and after all four missions and badges are complete.
- Answering and replaying all practice cards leaves `AdventureStateV1`, the four-star maximum, four badges, mission answers/evidence, `AppStateV1`, parent-access state, and the bytes under all three storage keys unchanged.
- Navigation within one controller retains practice state, while destroying and recreating the controller resets the current card, feedback, and correct-card set without changing persisted mission progress.
- Every new visible label, scenario, answer, feedback message, status, and accessible name is Croatian and keyboard-operable.
- `npm test -- src/app.test.ts src/game/adventure.test.ts`, `npm test`, `npm run check`, and `npm run build` pass with the existing Tasks 1–6 behavior preserved.

### 2. Define named house areas over the existing V1 slots

- [ ] Replace duplicated anonymous house-slot inventories with one exported four-area domain contract while retaining every current slot key, result code, and persisted operation.

#### Why
`src/game/house.ts` and `src/game/store.ts` each maintain separate anonymous `pet-N` and `item-N` families. The requested named house needs stable room membership, but existing V1 layouts must retain the same ten keys and meanings rather than being migrated or reinterpreted.

#### How
Depends on: none. Preserve the implemented eight-pet and ten-item catalogs from the completed work. In `src/game/house.ts`, export a typed ordered area contract containing exactly: `living-room` with `item-1`, `item-2`; `pet-room` with `pet-1`, `pet-2`, `item-3`; `storage` with `item-4`, `item-5`, `item-6`; and `yard-stable` with `pet-3`, `pet-4`. Derive and export the pet-slot and item-slot sets from that contract, with compile-time exhaustive typing that prevents omission, duplication, or assignment to the wrong slot kind. Use the derived sets in `placeAsset`, `moveAsset`, and `removeAsset`. In `src/game/store.ts`, replace the local slot lists with the derived contract for `initialState` and strict persisted validation while keeping the house-to-store state import type-only so the runtime import direction remains cycle-safe. Preserve `AppStateV1`, `STORAGE_KEY`, four `pet-N` keys, six `item-N` keys, unrestricted catalog-animal placement in any pet slot, exact result/load codes, and atomic rejection behavior. In `src/game/house.test.ts`, enumerate every area/member once, load and round-trip a fully occupied legacy-compatible V1 layout, move a pet and item across their named areas, exercise all eight catalog animals against the four pet slots, and retain unknown/occupied/unowned/exhausted rejection coverage. Do not add Croatian copy, UI sections, new capacity, species restrictions, drag-and-drop, schema fields, or migration in this slice.

#### Where
`src/game/house.ts`

`src/game/store.ts`

`src/game/house.test.ts`

#### Acceptance criteria
- The exported ordered area contract contains exactly `living-room`, `pet-room`, `storage`, and `yard-stable` with the specified members, and assigns each of `pet-1` through `pet-4` and `item-1` through `item-6` once and only once to a slot of the correct kind.
- `initialState`, strict V1 validation, `placeAsset`, `moveAsset`, and `removeAsset` derive valid position keys from that one contract; neither `src/game/house.ts` nor `src/game/store.ts` retains a second hand-maintained slot family.
- A fully populated pre-change V1 layout loads with identical keys and values, moves one pet and one item between their respective areas, removes them with the existing result codes, and saves the same V1 shape.
- All eight catalog animal types can occupy any free `pet-N` slot; four placed animals fill capacity while additional owned animals remain valid and unplaced.
- Unknown area/slot values, wrong-kind slots, occupied slots, unowned assets, duplicate pet placement, and exhausted item quantities retain their current atomic rejection codes and state identity.
- No state field, stored slot, storage key, schema version, species rule, capacity, or migration is added or changed, and the house/store runtime dependency remains cycle-safe.
- `npm test -- src/game/house.test.ts src/game/store.test.ts`, `npm test`, and `npm run check` pass.

### 3. Render the four house areas with Croatian labels

- [ ] Replace the two global house grids with four semantic Croatian area sections that consume the domain contract and preserve every house interaction.

#### Why
Task 2 establishes stable room membership, but `src/main.ts` currently renders separate global pet and item grids with numeric slot labels. The UI needs recognizable Croatian areas and area-aware controls before responsive floorplan styling can be applied safely.

#### How
Depends on: Tasks 1, 2. In `src/content/hr.ts`, exhaustively map the four area IDs to the exact names **Dnevna soba**, **Soba za ljubimce**, **Spremište**, and **Dvorište i staja**, each with one short child-readable Croatian description, plus Croatian area-aware slot labels and full-house guidance. In `src/main.ts`, import and iterate the ordered area contract, render each occupied or empty stored slot exactly once inside its owning semantic section, and replace numeric-only visible option text and accessible names with Croatian area-aware labels while retaining the unchanged `pet-N`/`item-N` option values. Preserve theme selection, unplaced animal/item inventory, place/move/remove controls, result messages, controller behavior, unrestricted animal placement, all existing persistence, and the practice deck from Task 1. In `src/app.test.ts`, seed a populated legacy-compatible record and assert exact area membership, copy, absence of leaked internal IDs, complete inventory/full-capacity behavior for all eight animals, and unchanged place/move/remove/theme/save/recreate flows. Do not add floorplan geometry, external assets, new slots, storage changes, or species rules in this slice.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- The house DOM renders exactly the four Croatian headings and descriptions in contract order, with every unchanged `pet-N` and `item-N` slot once inside its assigned area and no duplicate global pet/item grid.
- A populated legacy-compatible V1 record displays the same assets at the same stored slot values; place, move, remove, theme change, save, and controller recreation retain the exact existing domain results and keys.
- Visible labels and accessible names expose Croatian area and asset names but do not expose `living-room`, `pet-room`, `storage`, `yard-stable`, `pet-N`, or `item-N` identifiers.
- All eight owned animal types remain visible either placed or in unplaced inventory; when all four pet slots are occupied, extra animals remain visible with Croatian full-house guidance.
- Every area ID has exactly one Croatian name and description, and an unknown internal ID cannot render an English or raw-ID fallback.
- Practice from Task 1 and the completed Tasks 1–6 interfaces retain their state, behavior, and persistence boundaries after the house renderer changes.
- `npm test -- src/app.test.ts src/game/house.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 4. Style the named house as a responsive floorplan and yard

- [ ] Add accessible CSS-only architecture and responsive geometry to the four semantic house areas without changing controls or stored data.

#### Why
The semantic areas from Task 3 make the layout understandable, but they still need a recognizable house, storage room, pet room, and attached animal yard across phone, tablet, and desktop widths.

#### How
Depends on: Task 3. In `src/main.ts`, add only the structural classes and `aria-hidden` decorative elements needed to style the existing semantic area sections as one composition. In `src/styles.css`, add visible roof, wall, door, window, storage, and fenced-yard cues using CSS and those non-semantic decorations; use a logical single-column area order at 320 px and a spatial floorplan at 768 and 1440 px. Preserve all three existing `sun`, `sea`, and `forest` theme IDs, non-color-only occupancy meaning, visible focus, 44×44 px minimum interactive targets, and working theme/place/move/remove flows. Put every new nonessential transition or animation inside the current motion preference strategy and include its selector in the `prefers-reduced-motion: reduce` override. In `src/app.test.ts`, assert that decorations are hidden from the accessibility tree, semantic content and DOM order remain intact, all three theme classes retain area identity, and the new selectors are covered by the existing stylesheet accessibility checks. Do not add external images, drag-and-drop, canvas, stored fields, new controls, or new placement rules.

#### Where
`src/styles.css`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- At 768 and 1440 px, visible roof, wall, door, window, storage, and fence cues form one house with an attached yard rather than four unrelated cards.
- At 320 px, Dnevna soba, Soba za ljubimce, Spremište, and Dvorište i staja retain their logical DOM and visual order without clipping, overlap, or horizontal scrolling.
- Decorative architecture is `aria-hidden` or CSS-generated and absent from the accessibility tree, while area headings, descriptions, occupancy, and every action remain available without reliance on color or decoration.
- Sunce, More, and Šuma remain visually distinguishable under their unchanged stored IDs without hiding area identity or occupancy.
- Keyboard-only theme/place/move/remove flows retain visible focus and controls at least 44×44 px; reduced-motion mode removes every new nonessential transition or animation while preserving equivalent information.
- No external asset, storage field, slot, result code, interaction mode, or placement rule is introduced.
- `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 5. Add an unlocked parent learning overview

- [ ] Add a concise Croatian learning overview only inside the successfully unlocked parent section, without giving it new authority or leaking protected data while locked.

#### Why
The parent section currently renders grant and pending-job controls after unlock but gives no consolidated view of fictional balances, mission progress, owned content, or recent approved learning actions. The overview must reuse current state while preserving the fail-closed local PIN boundary.

#### How
Depends on: Task 4. In `src/content/hr.ts`, add Croatian headings and labels for exactly seven summary values: wallet, savings, debt, pending chore requests, completed main missions out of four, owned animals out of eight, and total owned item quantity; also add copy for at most five recent existing activity messages. In `src/main.ts`, pass the current `AdventureStateV1` to the parent renderer and render the overview only in `unlocked` mode, deriving values from current in-memory game/adventure state and using the existing `activityMessage` mapping for the five most recent activities. Refresh the overview after accepted grant, approval, purchase, and main-mission completion through the existing render flow. Keep unprovisioned, locked, Web-Crypto-unavailable, malformed-record, post-navigation, explicit-lock, and post-reload modes free of every overview value and all protected controls as they are today. In `src/app.test.ts`, cover each gate mode, relocking transition, live summary updates, recent-activity truncation/order, Croatian/no-raw-ID output, and proof that overview rendering itself changes no state or storage. Do not add analytics, timestamps, profiles, recommendations, exports, storage fields, result/activity codes, or control authority.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- An externally provisioned and successfully unlocked parent section displays the seven exact summary values and no more than the five most recent existing activity messages, all derived from current in-memory game/adventure state in natural Croatian.
- Approving a pending job, granting coins, buying an animal or item, and completing a main mission update the applicable summary or recent activity through the existing accepted action flow without a new state field or activity code.
- Unprovisioned, wrong-PIN, locked, Web-Crypto-unavailable, malformed-record, post-navigation, explicit-lock, and post-reload views contain none of the overview values, recent activities, grant controls, or approval/return controls.
- The overview cannot grant, approve, return, purchase, alter mission/practice progress, or mutate any storage record; existing protected controls retain their authorization checks.
- No raw catalog ID, house-area ID, result/activity code, storage key, PIN material, or English fallback is rendered.
- The practice deck, named house, and completed Tasks 1–6 retain their existing behavior and persistence boundaries.
- `npm test -- src/app.test.ts src/game/parent-access.test.ts`, `npm run coverage:parent`, `npm test`, `npm run check`, and `npm run build` pass.

### 6. Add aggregate regression evidence and maintenance guidance

- [ ] Validate the completed cross-section journey and document the final catalogs, areas, session-only tools, parent boundary, commands, and manual release checks.

#### Why
The remaining slices share authoritative catalogs, one renderer, one house contract, and three independent browser-local records. Aggregate coverage and accurate maintenance guidance are required to demonstrate that the new practice, house, and parent features coexist with the already completed jobs, earnings challenge, shop filters, and savings planner without broadening persistence or browser claims.

#### How
Depends on: Task 5. In `src/app.test.ts`, add one aggregate browser-local journey that visits Pustolovina, Moj novac, Poslovi, Trgovina, Moja kuća, and Kutak za roditelje; exercises one accepted representative flow for the ten-job catalog, earnings challenge, expanded shop/filter, savings-goal planner, six-card practice, named house placement, and unlocked parent overview; then recreates the controller and verifies only established game/adventure actions persist while earnings challenge, shop filters, goal calculation, practice progress, and parent unlock reset. Retain independent fail-safe assertions for malformed and unknown-version game, parent-access, and adventure records and add localization assertions for every newly rendered player-facing string from Tasks 1–5. In `README.md`, document the closed ten-chore, eight-animal, ten-item, and four-area families; distinguish persistent state from controller-memory-only challenge/filter/planner/practice state; explain the unlocked-only overview boundary; retain the destructive three-key reset warning; and list the focused commands `npm test -- src/app.test.ts src/game/adventure.test.ts`, `npm test -- src/game/house.test.ts src/game/store.test.ts`, `npm test -- src/app.test.ts src/game/house.test.ts`, `npm test -- src/app.test.ts`, and `npm test -- src/app.test.ts src/game/parent-access.test.ts` alongside the full commands `npm test`, `npm run check`, `npm run build`, and `npm run coverage:parent`. Record release evidence for manual checks at 320, 768, and 1440 px, keyboard-only use, 44×44 px targets, reduced motion, and the currently installed Chrome, Safari, and Firefox. Leave Edge as an unchecked item explicitly marked not executed with no support claim; do not make it an implementation gate. Do not claim a measured child-learning outcome because no playtest threshold was supplied.

#### Where
`src/app.test.ts`

`README.md`

#### Acceptance criteria
- The aggregate test visits all six navigation sections and proves one representative accepted flow for the expanded jobs, earnings challenge, expanded shop/filter, savings planner, practice deck, named house, and unlocked parent overview.
- Controller recreation preserves only accepted V1 game actions and existing adventure mission progress, relocks parent access, and resets earnings challenge, shop filters, goal calculation, practice progress, and every other feature explicitly defined as controller-memory-only.
- Tests prove malformed or unknown-version game, parent-access, and adventure records remain independently fail-safe and are not silently migrated, reinterpreted, overwritten, or merged.
- Every new visible, feedback, validation, live-region, form, and accessibility string asserted by the integration suite is Croatian; fictional-money wording remains explicit and no real payment, advertising, analytics, cloud, account, or social behavior appears.
- `README.md` accurately lists all ten chores, eight animals, ten items, and four house areas; distinguishes persistent from session-only features; documents the unlocked-only parent overview; preserves the destructive three-key reset warning; and names the five exact focused commands and four full commands prescribed in `How`.
- Manual receipts confirm no clipping, overlap, or horizontal scroll at 320, 768, and 1440 px; visible focus and 44×44 px controls for new flows; equivalent information under reduced motion; and smoke checks in the currently installed Chrome, Safari, and Firefox. Edge remains unchecked, explicitly not executed, and carries no support claim.
- `npm test`, `npm run check`, `npm run build`, and `npm run coverage:parent` all pass from a clean install, without claiming product or learning-outcome validation.
