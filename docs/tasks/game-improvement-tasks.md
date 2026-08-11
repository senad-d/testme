### 1. Centralize catalog-backed V1 validation

- [ ] Make the persisted game-state validator derive every current content catalog contract from the authoritative Croatian catalogs before any catalog is expanded.

#### Why
`src/game/store.ts` duplicates the chore, pet, item, and theme IDs plus activity name/value pairs declared in `src/content/hr.ts`. That duplication would make later additions easy to render but invalid after reload. This slice removes that divergence without changing the three browser-local records or accepting malformed data.

#### How
Depends on: none. Import the runtime `CHORES`, `PETS`, `ITEMS`, `THEMES`, and `CONFIG` values into `src/game/store.ts`; the existing imports from store into Croatian content are type-only and must remain erased at runtime. Derive the valid ID sets, chore/pet/item activity name-value maps, maximum distinct owned-pet count, and debt limit from those catalogs. Preserve the exact `AppStateV1` shape, `croatian-money-pet-game:v1` key, four `pet-N` keys, six `item-N` keys, all result/load codes, strict cross-field checks, and fail-safe handling that leaves unreadable stored records untouched. Extend persistence tests to enumerate the closed starting families: five chores, four pets, six items, three themes, four pet positions, and six item positions. Deliberately do not derive position keys in this task; Task 8 owns that contract.

#### Where
`src/game/store.ts`

`src/game/store.test.ts`

#### Acceptance criteria
- The V1 validator accepts the exact current five chore IDs, four pet IDs, six item IDs, and three theme IDs from `src/content/hr.ts` without a second hand-maintained ID list in `src/game/store.ts`.
- Chore, pet, and item purchase activity validation derives the exact Croatian name and positive whole reward/price from the matching catalog, while altered names, altered amounts, unknown IDs, duplicate pets, impossible placements, and invalid quantities remain rejected.
- The maximum distinct owned-pet count equals `PETS.length`, and the debt ceiling equals `CONFIG.debtLimit`; neither change alters a valid current record.
- The storage key, V1 fields, existing slot keys, recovery codes, and behavior for malformed, unknown-version, invalid, and unavailable storage remain unchanged.
- `npm test -- src/game/store.test.ts`, `npm test`, and `npm run check` pass.

### 2. Expand the parent-approved job catalog

- [ ] Add five age-appropriate Croatian household jobs with distinct rewards to the existing child request and parent approval flow.

#### Why
The Poslovi section currently offers only five jobs. The existing catalog-driven request and approval flow can provide more choice without weakening the rule that only a parent-approved completed job changes the wallet.

#### How
Depends on: Task 1. Treat the following exact catalog as a bounded implementation default proposed under the request to “figure something,” not as a previously fixed product requirement: append `pack-school-supplies` / **Složi školski pribor** / 4, `feed-pets` / **Nahrani ljubimce** / 7, `sweep-kitchen` / **Pometi kuhinju** / 9, `help-garden` / **Pomozi u vrtu** / 11, and `sort-recycling` / **Razvrstaj otpad** / 14 zlatnika to `CHORES`. Preserve the existing five IDs, names, and rewards. Update the closed-family persistence coverage in `src/game/store.test.ts` from the original five entries to all ten, and assert each new entry through request, return, approval, matching activity history, save, and reload there. Keep `src/game/chores.test.ts` unchanged and run it only as a focused regression command. Parent approval remains the only job-payout path; no streak, automatic payout, real-money wording, or recurring schedule is introduced.

#### Where
`src/content/hr.ts`

`src/game/store.test.ts`

`src/app.test.ts`

#### Acceptance criteria
- `CHORES` contains exactly the original five entries plus the five named additions; all ten IDs are unique and all rewards are positive whole numbers with the distinct values 4, 5, 6, 7, 8, 9, 10, 11, 12, and 14.
- Each new Croatian job and reward renders in Poslovi with a Croatian accessible action name and can create at most one pending request for that job.
- Returning a new-job request pays nothing, while approving it exactly once adds its catalog reward to the wallet and records the matching Croatian `chore-reward-paid` activity.
- Pending, returned, and approved requests for all five new IDs survive V1 save/load, and records with unknown or altered catalog data remain rejected.
- `npm test -- src/game/chores.test.ts src/game/store.test.ts src/app.test.ts`, `npm test`, and `npm run build` pass.

### 3. Add a retryable earnings comparison challenge

- [ ] Add a three-round Croatian challenge to Poslovi that teaches the child to compare job rewards without awarding or persisting money.

#### Why
The current earning mission explains when a reward arrives but does not ask the child to compare two earning choices. The ten-job catalog provides a bounded way to practise that decision while preserving parental approval.

#### How
Depends on: Task 2. Render **Izazov zarade** before the job cards with exactly these ordered pairs: Postavi stol (10) versus Posloži krevet (5), Pomozi u vrtu (11) versus Pospremi igračke (8), and Razvrstaj otpad (14) versus Pomozi složiti rublje (12). Show one pair and `1 od 3` through `3 od 3` at a time. A wrong answer gives supportive Croatian feedback and stays on the round; the higher-reward answer advances once; the third correct answer shows completion. Keep challenge progress only in the current app controller so navigation retains it and reload resets it. It must not create a chore request, activity, balance change, adventure event, star, badge, or stored field.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- The exact three comparisons render in order with both Croatian names and both rewards visible; only set-table, help-garden, and sort-recycling are accepted as the respective higher-reward answers.
- A wrong or repeated answer does not advance, while each first correct answer advances exactly one round and the third displays a Croatian completion message without a fourth round.
- Completing the challenge leaves wallet, savings, debt, chore requests, activities, inventory, placements, game storage, parent-access storage, and adventure storage unchanged.
- Navigating away and back retains the in-memory round; destroying and recreating the controller starts at round one.
- New headings, instructions, progress, answer names, feedback, and accessible names are Croatian, keyboard-operable, and do not imply real wages.
- `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 4. Expand animals and purchasable items

- [ ] Add four animals and four useful decorations while preserving wallet-only purchases and V1 compatibility.

#### Why
Trgovina currently contains four animals and six items. More catalog variety directly improves the shop and gives the house more customization choices, but every addition must remain compatible with strict persistence and existing purchase rules.

#### How
Depends on: Task 1. Treat the following exact catalog as a bounded implementation default proposed under the request to add more content, not as a previously fixed product requirement: append `bird` / **Ptičica** / 40 / 🐦, `goat` / **Koza** / 70 / 🐐, `horse` / **Konj** / 100 / 🐴, and `cow` / **Krava** / 110 / 🐄 to `PETS`. Append `bird-perch` / **Stajalica za ptice** / 16 / 🪵 / pet, `pet-brush` / **Četka za ljubimce** / 14 / 🪮 / pet, `lamp` / **Svjetiljka** / 16 / 🏮 / house, and `bookshelf` / **Polica za knjige** / 24 / 📚 / house to `ITEMS`. Preserve every existing entry. Tests must cover each added purchase, duplicate-pet rejection, repeatable item quantities, insufficient wallet, activities, strict reload, and the deliberate exclusion of care costs, breeding, consumables, real-animal advice, and automatic placement.

#### Where
`src/content/hr.ts`

`src/game/shop.test.ts`

`src/game/store.test.ts`

#### Acceptance criteria
- `PETS` contains exactly the existing four animals plus Ptičica/40, Koza/70, Konj/100, and Krava/110; `ITEMS` contains exactly the existing six items plus the four named additions with the specified IDs, prices, emoji, and categories.
- Buying an added animal charges its exact price once, creates one owned record and one Croatian purchase activity, and rejects a duplicate atomically; buying an added item increments its quantity and exact charge once per accepted purchase.
- Wallet insufficiency and unknown IDs leave the same state object unchanged, and neither savings nor debt is automatically used.
- Valid added catalog purchases survive V1 save/load without a schema or storage-key change; altered activity names/prices and unknown catalog members remain rejected.
- Existing animal/item IDs, prices, stored records, and purchase behavior remain compatible.
- `npm test -- src/game/shop.test.ts src/game/store.test.ts`, `npm test`, and `npm run check` pass.

### 5. Make the expanded shop easier to browse and compare

- [ ] Add in-memory category and affordability controls to Trgovina without hiding owned inventory or changing purchase semantics.

#### Why
After Task 4, a single page will contain eight animals and ten items. The section needs a child-readable way to focus on animals, pet items, or house items and compare what the current wallet can afford.

#### How
Depends on: Task 4. Add a semantic Croatian filter group with **Sve**, **Ljubimci**, **Stvari za ljubimce**, and **Ukrasi za kuću**, plus an **Mogu kupiti** toggle. Default to Sve with affordability filtering off. Filtering is controller-memory presentation state only: it survives navigation during one controller lifetime and resets on reload. Within the visible category preserve catalog order, prices, disabled owned/unaffordable states, Croatian accessible purchase names, the complete owned-inventory summary, and wallet-only charging. When no card matches, show a Croatian empty result with a control to restore Sve; never remove owned entries from the inventory summary.

#### Where
`src/main.ts`

`src/styles.css`

`src/app.test.ts`

#### Acceptance criteria
- The four Croatian category controls expose pressed/selected state, and each shows exactly its closed family: eight pets, five pet-category items, five house-category items, or all 18 catalog entries after Task 4.
- Enabling Mogu kupiti shows only entries priced at or below the current wallet and not already-owned pets; accepted purchases immediately update the visible filtered results.
- A zero-result filter state has a Croatian message and a keyboard-operable reset to Sve; the owned-inventory summary remains complete under every filter.
- Filter changes do not mutate any of the three storage records, balances, adventure progress, activities, or catalog order, and controller recreation restores the default view.
- Controls have visible focus, at least 44×44 px targets, no color-only state, and natural Croatian labels at 320, 768, and 1440 px.
- `npm test -- src/app.test.ts`, `npm test`, and `npm run build` pass.

### 6. Add a fictional savings-goal planner

- [ ] Add a non-transactional Croatian goal calculator to Moj novac that connects current coins and job rewards to a future fictional purchase.

#### Why
Moj novac supports atomic saving, withdrawal, borrowing, and repayment, but it does not help the child plan how many approved jobs could close a gap to a chosen fictional goal.

#### How
Depends on: Tasks 3, 5. Render **Plan mog cilja** after the balance cards. Let the child enter a positive whole target price and choose one of the ten catalog jobs. Calculate available coins as wallet plus savings, explicitly exclude borrowed capacity, calculate `missing = max(0, target - available)`, and calculate required approvals as `ceil(missing / selected reward)`. Report either that the goal is already covered or the missing zlatnici and number of completed-and-parent-approved jobs. Keep the last valid calculation only in controller memory across navigation and clear it on reload. Invalid input uses Croatian validation. The calculator must not move money, request/approve a job, write storage, or progress the adventure.

#### Where
`src/main.ts`

`src/content/hr.ts`

`src/app.test.ts`

#### Acceptance criteria
- The form lists all ten Croatian jobs with exact rewards and accepts only a positive safe whole-number target.
- For target 50, wallet 10, savings 5, and a 7-zlatnik job, the result reports 35 missing zlatnici and 5 required parent-approved completions; debt and remaining borrowing capacity are not included.
- When wallet plus savings meets or exceeds the target, the result reports that no additional approved job is needed and never displays a negative gap.
- Valid and invalid calculations leave balances, activities, requests, inventory, placements, adventure state, and all three storage records unchanged.
- The result survives navigation within one controller, resets on controller recreation, is announced accessibly in Croatian, and never describes zlatnici as real money or guaranteed income.
- Existing save, withdraw, borrow, repay, quick-amount, activity-history, and adventure-event behavior remains unchanged.
- `npm test -- src/app.test.ts src/game/money.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 7. Add optional adventure practice after and between missions

- [ ] Add a six-card, replayable Croatian practice deck to Pustolovina without changing the four-mission progression or persisted adventure schema.

#### Why
Pustolovina currently has a one-time four-mission path and six read-only glossary topics. Optional practice adds repeatable learning content for every money concept without turning cosmetic progress into spendable rewards.

#### How
Depends on: Task 6. Define six fixed practice cards for Novčanik, Kasica, Zarada, Cijena, Zajam, and Dug. Each card has one Croatian scenario, two Croatian answers, one correct answer, and supportive correct/wrong explanations grounded in the existing rules: purchases use wallet coins, savings remain available for later withdrawal, job rewards require parent approval, price is the required wallet amount, borrowing raises debt, and repayment lowers debt. Render one card at a time with previous/next controls and a retryable answer. Track only current card and per-session correct cards in controller memory; allow practice before, during, and after the main journey. Do not change `AdventureStateV1`, mission order, answers, evidence, stars, badges, storage key, or qualifying event logic.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- Exactly six practice cards exist and appear in the ordered family Novčanik, Kasica, Zarada, Cijena, Zajam, and Dug, with two answers and one source-grounded correct answer each.
- Wrong answers show supportive Croatian feedback and remain retryable; a correct answer marks that card once for the current session; previous/next navigation never skips or duplicates a card.
- Practice is available regardless of active/completed mission state and remains replayable after all four badges are earned.
- Answering every practice card leaves `AdventureStateV1`, four-star maximum, four badges, mission evidence, balances, and all storage bytes unchanged; recreation clears practice-only progress.
- Existing mission questions, ordered action evidence, accepted-event sequencing, and journey completion remain unchanged.
- Every practice label, scenario, answer, status, explanation, and accessible name is Croatian and keyboard-operable.
- `npm test -- src/app.test.ts src/game/adventure.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 8. Define named house areas over the compatible slot contract

- [ ] Replace anonymous house slot inventories with one exported four-area domain contract while retaining every stored V1 slot key and operation.

#### Why
Moja kuća renders four `pet-N` and six `item-N` positions as generic grids. A recognizable house needs stable room membership, but changing stored position keys would reinterpret existing layouts.

#### How
Depends on: Task 4. In the house domain define exactly `living-room` with `item-1`, `item-2`; `pet-room` with `pet-1`, `pet-2`, `item-3`; `storage` with `item-4`, `item-5`, `item-6`; and `yard-stable` with `pet-3`, `pet-4`. Export a typed ordered area inventory plus derived pet/item slot sets, and consume those sets in initial state, persisted validation, place, move, and remove. The import boundary between house and store must remain runtime-cycle-safe by keeping state-only imports type-only. Preserve the ten exact stored slot IDs, four-animal/six-item displayed capacity, unrestricted animal-to-pet-slot rule, V1 fields, and all existing result codes. Croatian area copy belongs to Task 9. Species restrictions, new capacity, drag-and-drop, and migration are deliberate exclusions.

#### Where
`src/game/house.ts`

`src/game/store.ts`

`src/game/house.test.ts`

#### Acceptance criteria
- The ordered area contract contains exactly the four internal area IDs and assigns each of `pet-1` through `pet-4` and `item-1` through `item-6` once and only once to the specified area.
- Initial state, persisted validation, `placeAsset`, `moveAsset`, and `removeAsset` derive their valid slot family from the area contract while retaining current success/rejection codes and atomic behavior.
- A fully populated pre-change V1 layout loads with identical keys and values, can move one pet and one item across areas, and saves the same V1 shape.
- All eight catalog animals may use any free pet slot; when four are placed, additional owned animals remain valid and unplaced.
- Unknown areas and positions remain invalid, and a compile-time exhaustive check prevents a slot from being omitted or assigned to the wrong kind.
- No stored slot, state field, storage key, schema version, species rule, or automatic migration is added or changed.
- `npm test -- src/game/house.test.ts src/game/store.test.ts`, `npm test`, and `npm run check` pass.

### 9. Render the four named house areas in Croatian

- [ ] Replace the two global slot grids with four semantic area sections that consume the domain contract and preserve every house control.

#### Why
The domain contract from Task 8 gives positions stable membership, but the player still needs Croatian room names, descriptions, and area-aware controls before visual floorplan styling can be added safely.

#### How
Depends on: Tasks 7, 8. Map the four internal IDs exhaustively to **Dnevna soba**, **Soba za ljubimce**, **Spremište**, and **Dvorište i staja**, with one short child-readable Croatian description each. Refactor the house renderer to iterate the ordered contract, place each occupied or empty slot inside its owning semantic section, and replace numeric-only visible option text with Croatian area-aware labels while retaining unchanged option values. Preserve theme selection, unplaced animal/item inventory, select/place/move/remove controls, result messages, unrestricted animal placement, and existing persistence. Structural decoration and responsive geometry belong to Task 10.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- The DOM renders exactly the four Croatian area headings and descriptions, with each unchanged slot once inside its assigned area and no duplicate global pet/item grid.
- A populated legacy-compatible V1 record shows the same assets at the same stored slot values; place, move, remove, theme change, save, and controller recreation preserve exact domain results and keys.
- Visible labels and accessible names expose Croatian area and asset names but no `living-room`, `pet-room`, `storage`, `yard-stable`, `pet-N`, or `item-N` identifiers.
- All eight owned animal types remain visible in placed or unplaced inventory; with all four pet slots occupied, extra animals receive Croatian full-house guidance and do not disappear.
- Every area ID has exactly one Croatian name and description, and no English fallback is rendered for an unknown internal ID.
- `npm test -- src/app.test.ts src/game/house.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 10. Style the house as a responsive 2D floorplan and yard

- [ ] Add accessible CSS-only architecture and responsive geometry to the semantic house areas.

#### Why
Named semantic sections improve meaning, but Moja kuća still needs a recognizable house, storage room, pet room, and attached animal yard on phone, tablet, and computer screens.

#### How
Depends on: Task 9. Style the existing four semantic areas as one coherent composition with visible roof, wall, door, window, storage, and fenced-yard cues. Add decoration through CSS or `aria-hidden` markup only; do not add external assets or alter stored data and controls. Use a logical single-column area order at 320 px and a spatial floorplan at 768 and 1440 px. Preserve all three themes, visible focus, at least 44×44 px controls, non-color-only occupancy meaning, and add every new nonessential transition or animation to the existing reduced-motion override.

#### Where
`src/styles.css`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- At 768 and 1440 px, roof/wall/door/window/storage/fence cues visually form one house and attached yard rather than four unrelated cards.
- At 320 px, Dnevna soba, Soba za ljubimce, Spremište, and Dvorište i staja retain logical DOM/visual order without clipping, overlap, or horizontal scrolling.
- Decorative architecture is absent from the accessibility tree, while headings, descriptions, occupancy, and actions remain available without color or decoration.
- Sunce, More, and Šuma themes remain visually distinguishable without changing their stored IDs or hiding area identity and occupancy.
- Keyboard-only theme/place/move/remove flows retain visible focus and at least 44×44 px controls, and reduced motion removes every new nonessential transition.
- `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

### 11. Add a parent-only learning overview

- [ ] Add a concise Croatian overview inside the unlocked parent section without exposing controls or child data while the gate is locked.

#### Why
Kutak za roditelje currently supports granting coins and reviewing pending jobs but gives no summary of the child’s fictional balances, progress, purchases, or recent approved learning actions.

#### How
Depends on: Task 10. Pass adventure state into the parent renderer and, only in unlocked mode, show wallet, savings, debt, pending-job count, completed main missions out of four, owned animals out of eight, total item quantity, and the five most recent existing activity messages. Use existing state and content mappings only; do not add analytics, timestamps, profiling, recommendations, storage, exports, or new authority. The unprovisioned, locked, unavailable, relocked-after-navigation, and relocked-after-reload modes must render none of the overview values or grant/approval controls. Locking or leaving the section must immediately discard access as today.

#### Where
`src/main.ts`

`src/content/hr.ts`

`src/app.test.ts`

#### Acceptance criteria
- An externally provisioned, successfully unlocked parent section displays the seven exact summary values and at most five recent activities, all in natural Croatian and derived from current in-memory game/adventure state.
- Approving a pending job, granting coins, buying an animal/item, and completing a main mission are reflected after the relevant accepted action without a new storage field or activity code.
- Unprovisioned, wrong-PIN, locked, Web-Crypto-unavailable, malformed-record, post-navigation, post-lock, and post-reload views contain none of the overview values or protected controls.
- The overview cannot grant, approve, return, purchase, alter mission progress, or mutate any storage record; existing protected controls retain their current authorization checks.
- No raw catalog ID, result code, storage key, PIN material, or English fallback is rendered.
- `npm test -- src/app.test.ts src/game/parent-access.test.ts`, `npm run coverage:parent`, `npm test`, `npm run check`, and `npm run build` pass.

### 12. Validate and document the complete cross-section improvement

- [ ] Add aggregate regression evidence and maintenance guidance for all six improved sections before treating the implementation as complete.

#### Why
The slices share catalogs, one main renderer, three independent stored records, and responsive Croatian UI. A final cross-section check is needed to catch integration regressions without silently broadening browser or persistence support.

#### How
Depends on: Task 11. Extend the rendered integration suite with one end-to-end browser-local journey that visits Pustolovina, Moj novac, Poslovi, Trgovina, Moja kuća, and Kutak za roditelje; exercises one accepted feature from Tasks 2–11; reloads; and verifies only the established persistent actions survived while filters, calculators, challenges, and practice reset as specified. Add localization assertions for every newly rendered player-facing string and preserve the three-record fail-closed boundaries. Update README maintenance and pre-release instructions with the final ten chores, eight animals, ten items, four house areas, non-persistent learning tools, parent overview boundary, and exact focused/full commands. Record manual checks at 320, 768, and 1440 px, keyboard-only use, reduced motion, and the currently installed Chrome, Safari, and Firefox as release evidence rather than automated browser-version guarantees. Keep Edge as an unchecked README pre-release item explicitly marked not executed with no support claim; it is not an implementation-completion gate. Because the request supplies no child-playtest success threshold, this task establishes engineering completion only and must not claim a measured learning outcome or product validation.

#### Where
`src/app.test.ts`

`README.md`

#### Acceptance criteria
- The aggregate test visits all six named navigation sections and proves one representative accepted flow for the expanded jobs, earnings challenge, expanded shop/filter, savings planner, practice deck, named house, and unlocked parent overview.
- Reload preserves only accepted V1 game actions and existing adventure progress, relocks parent access, and resets every feature explicitly defined as controller-memory-only.
- Tests prove malformed or unknown-version game, parent, and adventure records remain independently fail-safe and are not silently migrated, reinterpreted, overwritten, or merged.
- Every new visible, feedback, validation, live-region, form, and accessibility string asserted by the integration suite is Croatian; fictional-money copy remains explicit and no real payment, advertising, analytics, cloud, account, or social behavior appears.
- README accurately lists the closed catalogs and areas, distinguishes persistent from session-only features, preserves the destructive three-key reset warning, and names `npm test`, `npm run check`, `npm run build`, and `npm run coverage:parent`.
- Manual receipts confirm no clipping, overlap, or horizontal scroll at 320/768/1440 px; visible focus and 44×44 px controls for the new flows; equivalent information under reduced motion; and smoke checks in the currently installed Chrome, Safari, and Firefox. README leaves Edge unchecked and explicitly records it as not executed with no support claim; Edge is not required for implementation completion.
- `npm test`, `npm run check`, `npm run build`, and `npm run coverage:parent` all pass from a clean install.
