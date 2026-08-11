# Educational Jobs, Animals, and 2D House

**Status:** implementation-ready proposal — not adopted, published, or implemented; this gap-analysis refresh is not independently validated  
**Goal:** Extend the existing Croatian game with a short age-appropriate earnings lesson, five additional household jobs with distinct rewards, four additional animals including a horse, cow, and bird, and a recognizable responsive 2D house whose existing placement positions belong to named rooms and animal areas.

## Producer receipt — current revision

- **Producer:** gorgonna-planner, assignment `task-4557baa8ba85`, run `run-65b72eeafda7`.
- **Revision basis:** the request to investigate unfinished specifications and begin with the easiest implementation item; the product requirements in `../prd/prd-igra-financijske-vjestine.md`; current repository source; investigator evidence `handoff-772c1fd782ed0a21aaf09673372afbb0`; remediation evidence `handoff-863704c96829e859bec59c66f99f23c9`; and the prior independent PASS of this five-task implementation body in `handoff-1a2e4f5a12b9f444399db3fc26c09a82`.
- **Produced scope:** one five-item gap inventory whose bounded task records each change no more than three exact files. Under the current request, only Task 1 is eligible for execution or adoption, and current execution ends at Task 1's acceptance boundary. Tasks 2–5 are deferred, non-adopted gap records that require separate user authorization before execution or adoption. The task body, dependency graph, paths, and acceptance criteria are retained from the prior PASS revision. This refresh is not self-approved and requires a fresh independent validation receipt before Task 1 may be adopted.

## Current gap inventory and easiest-first selection

- Source inspection confirms the foundational money/pet game, protected-parent behavior, local persistence, playful presentation, four learning missions, and six Croatian money topics are present in `src/`, despite stale proposal status labels in the related proposal documents.
- Human playtesting requires a consented child-and-parent session rather than an application implementation slice. It is deliberately excluded from this source plan and remains a separate evidence-gathering recommendation.
- All five source slices in this file remain unimplemented: `CHORES` still has only the original five jobs; `PETS` still has only Ribica, Kunić, Mačka, and Pas; `src/game/store.ts` still hard-codes those chore/pet IDs and activity values; no `Izazov zarade` exists; and `src/game/house.ts` plus `src/main.ts` still use anonymous `pet-N`/`item-N` grids rather than named 2D areas.
- Task 1 is the easiest valid starting slice. Existing chore request, approval, rendering, and payout behavior already consumes `CHORES`; Task 1 therefore adds data and strict persistence coverage without introducing a new UI flow or storage schema. Task 2 cannot safely precede it because the current hard-coded pet validator rejects added catalog members, and Tasks 3–5 depend on the expanded catalogs or area contract.

## Evidence basis

- The application already provides four sequential learn-by-doing money missions and six Croatian money topics in `src/content/hr.ts`, rendered by `src/main.ts`. This plan extends that educational loop instead of replacing it.
- `CHORES` currently contains exactly five parent-approved household jobs worth 5, 8, 6, 10, and 12 zlatnika. `src/game/chores.ts` already derives requests and approved payouts from that catalog.
- `PETS` currently contains only Ribica, Kunić, Mačka, and Pas. Purchases are data-driven in `src/game/shop.ts`, but persisted validation duplicates the allowed catalog IDs and activity name/price pairs in `src/game/store.ts`.
- The current house domain has four stable `pet-N` positions and six stable `item-N` positions in `src/game/house.ts`. `src/main.ts` renders them as two generic card grids, and `src/styles.css` styles cards rather than a floorplan.
- The existing game record is `AppStateV1`. Its balances, chore requests, owned animals, item quantities, theme, placement keys, IDs, and activity history are consumed by the domain modules, `src/main.ts`, tests, and browser-local persistence. This plan preserves that record and every existing position identifier rather than silently changing saved placement meaning.
- All player-facing content, feedback, validation, and accessibility text must remain Croatian, as required by `../prd/prd-igra-financijske-vjestine.md` and the existing `<html lang="hr">` contract.

## Bounded product decisions and uncertainties

The request does not prescribe the complete catalogs, values, rooms, capacity, or educational exercise. To make the work implementable without treating guesses as user-established requirements, this proposal chooses these bounded defaults:

- Add exactly five jobs: `pack-school-supplies` / **Složi školski pribor** / 4, `feed-pets` / **Nahrani ljubimce** / 7, `sweep-kitchen` / **Pometi kuhinju** / 9, `help-garden` / **Pomozi u vrtu** / 11, and `sort-recycling` / **Razvrstaj otpad** / 14 zlatnika. Together with the existing five jobs, all ten rewards are distinct: 4, 5, 6, 7, 8, 9, 10, 11, 12, and 14.
- Add exactly four animals: `bird` / **Ptičica** / 40, `goat` / **Koza** / 70, `horse` / **Konj** / 100, and `cow` / **Krava** / 110 zlatnika. The deliberate animal family is therefore Ribica, Kunić, Mačka, Pas, Ptičica, Koza, Konj, and Krava; no animal-care simulation, breeding, feeding cost, or real-animal ownership lesson is inferred.
- Add one three-round, retryable **Izazov zarade** that asks which of two displayed jobs earns more. It awards no zlatnik, star, badge, purchase, or persisted progress; parent approval remains the only path by which a job changes the wallet.
- Group the unchanged stored positions into exactly four visual/semantic areas: **Dnevna soba** (`item-1`, `item-2`), **Soba za ljubimce** (`pet-1`, `pet-2`, `item-3`), **Spremište** (`item-4`, `item-5`, `item-6`), and **Dvorište i staja** (`pet-3`, `pet-4`). Existing placements therefore retain their exact stored position and meaning within the new layout.
- Keep capacity at four displayed animals and six displayed items. Any other owned animal remains visibly available outside the house and can be swapped into a free position with the existing select/place/move/remove interaction. Species-specific habitat restrictions, drag-and-drop, a new storage schema, and additional position capacity are deliberately excluded because the request does not define those rules.

### 1. Start the easiest source slice: expand jobs and centralize chore/pet validation

- [ ] Add the five decided Croatian household jobs and make persisted chore and pet validation derive from the two requested content catalogs.

#### Why
The current jobs already pay different rewards, but there are only five choices. Adding the requested variety must keep parent approval, activity history, and saved-state validation synchronized; today `src/game/store.ts` duplicates the catalog IDs and name/value pairs and would reject newly approved jobs unless updated separately.

#### How
Depends on: none. Append the five decided jobs to `CHORES` without renaming or repricing `make-bed`, `tidy-toys`, `water-plants`, `set-table`, or `fold-laundry`. In `src/game/store.ts`, replace only the duplicated chore and pet ID sets and their activity name/value maps with values derived from the exported `CHORES` and `PETS` catalogs; retain the current item and theme validators unchanged. Use type-only boundaries where necessary so the existing type imports in Croatian content do not create a runtime cycle. Make the maximum number of distinct owned animals derive from `PETS.length` rather than the current literal four, preparing validation for Task 2 without changing the V1 shape or storage key. Preserve strict rejection of unknown IDs, duplicate animals, invalid activity name/amount pairs, and every malformed cross-field state. Extend validation tests to enumerate the exact ten-job family and prove a request and approved activity for each new job round-trips through `saveState`/`loadState`; existing jobs, pending/returned requests, parent approval, balances, activity messages, and unreadable-record recovery remain consumers to preserve.

#### Where
`src/content/hr.ts`

`src/game/store.ts`

`src/game/store.test.ts`

#### Acceptance criteria
- `CHORES` contains exactly the existing five jobs plus `pack-school-supplies` at 4, `feed-pets` at 7, `sweep-kitchen` at 9, `help-garden` at 11, and `sort-recycling` at 14 zlatnika, with the exact Croatian labels recorded above; all ten IDs are unique and all ten rewards are positive, whole, and mutually distinct.
- For each new job, a valid pending request and its approved `chore-reward-paid` activity survive a V1 save/load round trip with the exact ID, Croatian name, and reward; an altered name, altered amount, or unknown job ID is still rejected.
- Persisted validation derives only the two requested closed catalog families—chore and pet IDs plus their activity name/value pairs—from `CHORES` and `PETS` in `src/content/hr.ts`; adding a valid chore or pet no longer requires a second hand-maintained ID or value literal in `src/game/store.ts`, while the current item and theme validators remain unchanged.
- The V1 storage key and state fields do not change, and existing valid saved states containing only the original jobs, pets, items, themes, positions, and activities still load identically.
- `npm test -- src/game/store.test.ts src/game/chores.test.ts` and `npm test` pass.

### 2. Add horses, cows, birds, and a similar animal to the shop

- [ ] Expand the purchasable and persistable animal family from four to eight while preserving the existing purchase rules.

#### Why
The current shop lacks the specifically requested horses, cows, and birds. Task 1 makes the catalog the authoritative validation source, allowing this slice to add animals without another divergent persisted-ID map.

#### How
Depends on: Task 1. Append the decided Ptičica, Koza, Konj, and Krava entries to `PETS`, using their stable IDs, exact prices, and animal emoji, while leaving Ribica, Kunić, Mačka, and Pas unchanged. Keep one purchase per animal catalog ID, wallet-only charging, insufficient-wallet rejection, Croatian activity history, and the existing adventure purchase event unchanged. Update the shop domain test to enumerate all eight animals, buy each exactly once, verify the sum of the eight exact prices, and reject duplicate or unknown purchases atomically. Extend the rendered integration test to show Croatian names/prices/accessibility labels for all four additions, buy and reload at least Konj and Ptičica, and prove no raw ID is exposed. Deliberately do not add care costs, consumables, animal statistics, or automatic house placement.

#### Where
`src/content/hr.ts`

`src/game/shop.test.ts`

`src/app.test.ts`

#### Acceptance criteria
- `PETS` contains exactly Ribica/30, Kunić/50, Mačka/60, Pas/80, Ptičica/40, Koza/70, Konj/100, and Krava/110, with unique stable IDs and non-empty animal emoji.
- Buying each of the eight animal IDs once charges the wallet exactly once, creates one owned-animal record and one Croatian `pet-purchased` activity, and remains valid after V1 save/load; buying any owned animal again or an unknown ID leaves the same state object unchanged with the existing rejection code.
- The shop renders all eight Croatian names and exact prices, including Croatian accessible purchase names. An accepted Konj purchase and an accepted Ptičica purchase remain owned after controller destruction/recreation without advancing the adventure unless the active purchase mission legitimately consumes that accepted purchase.
- The existing four animal IDs, prices, saved owned-animal records, activity messages, and purchase behavior remain compatible.
- `npm test -- src/game/shop.test.ts src/game/store.test.ts src/app.test.ts`, `npm test`, and `npm run check` pass.

### 3. Add a three-round earnings comparison game

- [ ] Add an age-appropriate, retryable Croatian challenge that teaches the child to compare job rewards without awarding money.

#### Why
The existing adventure explains when a job reward arrives, but it does not ask the child to compare different earnings. The expanded reward range provides a direct, bounded learning opportunity connected to the requested additional jobs.

#### How
Depends on: Task 1. Define exactly three Croatian challenge rounds from catalog IDs: Postavi stol (10) versus Posloži krevet (5), Pomozi u vrtu (11) versus Pospremi igračke (8), and Razvrstaj otpad (14) versus Pomozi složiti rublje (12). Render **Izazov zarade** above the job catalog with one question at a time, both names and rewards visible, large semantic buttons, a `1 od 3` through `3 od 3` progress label, supportive Croatian wrong/correct explanations, and a completion message. Keep progress only in the current app-controller memory so navigation away and back preserves the current round but reload starts round one; wrong and repeated answers do not advance, while the correct higher-reward choice advances once. Do not mutate or save `AppStateV1` or adventure state, create a chore request, grant coins, award an adventure star/badge, or bypass parent approval. Keep the existing earning mission question and accepted chore-approval progression unchanged.

#### Where
`src/content/hr.ts`

`src/main.ts`

`src/app.test.ts`

#### Acceptance criteria
- The rendered challenge presents the exact three pairings in order, displays both Croatian job names and reward amounts, and accepts only set-table, help-garden, and sort-recycling as the respective higher-reward answers.
- A wrong choice shows a non-punitive Croatian explanation and leaves the same round active; a correct choice advances exactly once, and after the third correct choice the UI announces completion without offering a fourth round.
- Completing the challenge leaves wallet, savings, debt, chore requests, activities, owned inventory, house placements, the game-storage record, and adventure-storage record byte-for-byte unchanged.
- Navigating to another view and back retains in-memory round progress, while recreating the app starts at round one; neither behavior changes the persisted V1 contract.
- Every new heading, instruction, progress value, answer label, feedback message, and accessible name is non-empty Croatian, and keyboard activation works with 44×44 px or larger controls.
- `npm test -- src/app.test.ts`, `npm test`, and `npm run build` pass.

### 4. Define named house areas over the compatible placement contract

- [ ] Replace the domain's anonymous position inventory with one exported, exhaustive area definition while retaining every stored V1 position key and operation.

#### Why
The house currently knows only private `pet-N` and `item-N` arrays, so the UI cannot reliably render meaningful rooms or animal areas. The new area definition must cover the closed slot family exactly once without invalidating saved layouts or removing the current place, move, remove, theme, ownership, quantity, and rejection consumers.

#### How
Depends on: Task 2. In the house domain, define the exact four area IDs `living-room`, `pet-room`, `storage`, and `yard-stable` and associate them with the decided unchanged position keys: Dnevna soba with `item-1` and `item-2`; Soba za ljubimce with `pet-1`, `pet-2`, and `item-3`; Spremište with `item-4`, `item-5`, and `item-6`; Dvorište i staja with `pet-3` and `pet-4`. Export a typed ordered area inventory and position lookup for the renderer, and derive the valid pet/item position sets used by place, move, and remove operations from that single definition. Add Croatian names and short child-readable area descriptions in content, keyed exhaustively by the four internal area IDs. Preserve the stored position IDs, V1 record, capacities, and all result codes. Test every area member and deliberate exclusion: each of the four pet keys and six item keys occurs exactly once, no area accepts a position of the wrong kind, and no unknown area/position becomes valid.

#### Where
`src/game/house.ts`

`src/game/house.test.ts`

`src/content/hr.ts`

#### Acceptance criteria
- The exported ordered contract contains exactly Dnevna soba (`item-1`, `item-2`), Soba za ljubimce (`pet-1`, `pet-2`, `item-3`), Spremište (`item-4`, `item-5`, `item-6`), and Dvorište i staja (`pet-3`, `pet-4`), with every stored position assigned once and only once.
- `placeAsset`, `moveAsset`, and `removeAsset` derive validity from the area contract and retain the existing success/rejection codes, ownership checks, duplicate-animal prevention, item-quantity limits, and atomic rejection behavior.
- Tests load or construct a populated existing V1 layout, exercise place/move/remove across two named areas, and prove the final `petPlacements` and `itemPlacements` keys and values are still the original V1 keys and values.
- Each area ID has one non-empty Croatian name and child-readable description; unknown internal IDs are not rendered through an English fallback.
- No species restriction, new position, state field, storage key, record version, drag-and-drop rule, or automatic migration is introduced.
- `npm test -- src/game/house.test.ts src/game/store.test.ts` and `npm test` pass.

### 5. Render the named areas as a responsive 2D house and animal yard

- [ ] Replace the two generic house card grids with a recognizable, accessible floorplan that consumes the named area contract.

#### Why
Even with named domain areas, the current rendering would still look like unrelated cards. The request specifically asks for a 2D house with distinct places for storing items and housing animals, while existing selection controls and persisted layouts must remain usable.

#### How
Depends on: Tasks 3, 4. Refactor only the house view to iterate the ordered area contract and render one coherent floorplan: a visible roof/house outline, internal wall separation for Dnevna soba, Soba za ljubimce, and Spremište, and an attached fenced Dvorište i staja. Each area must have its Croatian heading/description and render its assigned occupied or empty animal/item positions inside the area rather than in global pet/item grids. Replace numeric-only visible option text with Croatian area-aware labels such as `Soba za ljubimce — mjesto 1`, while keeping the stored option values unchanged. Keep the theme selector, unplaced animal/item inventory, select/place/move/remove buttons, forms, result messages, and current mission panel. Add CSS geometry, wall/door/window/storage/stable cues, and theme variants without external assets; use a readable single-column house order at 320 px and a spatial floorplan at tablet/desktop widths. Treat structural decoration as `aria-hidden`, use semantic area headings for assistive technology, preserve visible focus and 44×44 px controls, avoid color-only meaning and horizontal scroll, and include any new nonessential transition in the reduced-motion override.

#### Where
`src/main.ts`

`src/styles.css`

`src/app.test.ts`

#### Acceptance criteria
- The house DOM renders exactly four semantic area sections with the Croatian names Dnevna soba, Soba za ljubimce, Spremište, and Dvorište i staja; each of the ten unchanged stored positions appears once inside its assigned area and no duplicate global position grid remains.
- A populated legacy-compatible V1 state renders the same animal/item in the area that owns its unchanged position key; placing, moving, removing, switching themes, saving, and recreating the controller preserve the exact domain result and stored placement values.
- All eight owned animal types can appear in the unplaced inventory and any one can use an available pet position under the deliberately unrestricted rule; when four animal positions are occupied, additional owned animals remain visibly unplaced and receive the existing Croatian full-house guidance rather than disappearing.
- At 768 and 1440 px, visible roof/wall/door/window and fenced-stable cues form one coherent 2D house/yard composition rather than four unrelated catalog cards. At 320 px, the same four areas follow a logical single-column reading order with no clipping, overlap, or horizontal scrolling.
- Visible position labels and all form, feedback, live-region, empty/full, and accessibility strings are Croatian and expose no `living-room`, `pet-room`, `yard-stable`, `pet-N`, or `item-N` value. Decorative architecture is absent from the accessibility tree, while every occupied position has its Croatian area, asset name, and available actions.
- Keyboard-only place/move/remove/theme flows remain operable with visible focus and targets at least 44×44 px. Reduced motion removes every new nonessential transition or animation without hiding area identity, occupancy, or controls.
- The full four-mission educational journey, protected parent approval, earnings challenge, expanded job and animal catalogs, and all three local-storage records retain their existing boundaries; `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

## Implementation recommendation

Adopt and implement only Task 1 as the easiest source slice, then end current execution at its acceptance boundary after its focused and full tests pass. Tasks 2–5 remain deferred, non-adopted gap records and must not be continued under this request; each requires separate user authorization before execution or adoption. For Task 1, the highest-risk boundary is keeping catalog-derived persisted validation strict while preserving every existing V1 consumer. After Task 1 implementation, independently test its exact catalog families, accepted/rejected persisted-validation paths, V1 reload compatibility, and Croatian player-facing job content.

This is one local proposal only. It is not adopted, published, independently validated, or implemented.
