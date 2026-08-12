### 1. Set the product contract for an installable, repeatable browser game

- [x] Record the product-owner decisions that turn the current finite educational journey into a bounded game-release target.

#### Why
The repository is already a browser-local game: it has four ordered adventure missions, a fictional-money economy, parent-approved chores, a store, and house placement (`src/game/adventure.ts`, `src/game/store.ts`, `src/main.ts`). It still ends progression after `saving`, `earning`, `purchase`, and `loan`, and owned pets and items have no ongoing state (`src/game/adventure.ts`, `src/game/shop.ts`, `src/game/house.ts`). The requested meaning of “real game” is therefore a product decision, not a missing framework package. The current PRD explicitly leaves platform, persistence, economy, content scope, and success measures undecided (`docs/prd/prd-igra-financijske-vjestine.md` §6).

#### How
Depends on: none. Run one product decision session and update the PRD with the approved release target. This plan is executable only if that target is the recommended, lowest-disruption installable offline-capable browser game (PWA), one browser-local child profile, Croatian-only player-facing content, fictional zlatnici, and no accounts, payments, advertising, analytics, social features, or cloud sync. If another platform is selected, stop Tasks 2–9 before implementation and require a separately reviewed replacement plan; Tasks 3, 4, and 9 are not completed as no-ops. For this PWA release, select the proposed local guardian enrollment flow with its non-security limitation; externally provisioned access is not a releasable option because this distribution has no external provisioning mechanism. In the technical specification, define one repeatable pet-care-and-quest loop: session trigger/cadence, the allowed care actions and outcomes, care-only quest generation/completion/evidence/reward rules, XP/level or other progression rule, loss/decay policy, content quantities and release cadence, economy limits, supported devices/browsers, and measurable child/parent success thresholds. Select progression as the sole reward and evidence record: accepted care action, idempotency event ID, completion evidence, and any XP/cosmetic reward are committed atomically in that one record; quests must not award zlatnici or mutate game, adventure, or parent records. This decision record is the source of truth for every selected field, catalog size, reward, and threshold in Tasks 2–9.

#### Where
`docs/prd/prd-igra-financijske-vjestine.md`
`docs/specs/repeatable-browser-game.md`

#### Acceptance criteria
- The PRD names the PWA browser-game release target; selecting any other platform explicitly stops Tasks 2–9 and requires a separately reviewed replacement plan rather than completing PWA work as a no-op.
- The specification defines the selected repeatable loop with an observable start condition, permitted player choices, feedback/reward, repeat condition, session cadence, progression cap/reset policy, and the Croatian content-production quantities for its first release.
- The record defines an audience, target session length, difficulty/economy policy, child/parent success measures, supported device/browser evidence, and an explicit child-safety/privacy boundary.
- The record selects the local fresh-profile guardian enrollment model, its recovery and non-authentication limitation, and a persistence compatibility policy for all new progression fields.
- The record defines a single-record quest commit contract: every accepted care event has a stable idempotency ID and atomically stores its care transition, evidence, completion, and XP/cosmetic reward in progression; no quest writes zlatnici or another persisted record.
- The selected scope explicitly preserves fictional money and excludes real payments, ads, analytics, social features, external purchases, accounts, and cloud synchronization unless a separately approved replacement plan changes those boundaries.

### 2. Make the selected fresh-profile parent setup path usable without overstating its security

- [x] Implement the approved local guardian enrollment flow with its explicit browser-local limitation.

#### Why
On a fresh profile, `setupParentAccess` exists but `createApp` imports only inspection and unlock functions, so no ordinary interface can provision the parent controls needed for grants and chore approvals (`src/game/parent-access.ts`, `src/main.ts`). The README calls this intentional and accurately states that the PIN is only browser-local child deterrence, not account-grade authentication. The product decision must control whether that limitation is acceptable.

#### How
Depends on: Task 1. Expose a Croatian, guardian-labeled first-use local setup form only in the separate parent utility, reuse `setupParentAccess` for six-digit PIN and confirmation validation, and render success, invalid-format, mismatch, Web-Crypto, storage, locked, and relocked states with the existing fail-closed authority model. Make no claim that the form authenticates an adult, prevents device-owner bypass, supports recovery, or supplies accounts; preserve session-only unlock and require the existing destructive reset disclosure for recovery. Preserve every current consumer of parent state: grants, chore approvals/returns, the read-only learning overview, and their absence while unprovisioned, locked, unavailable, or relocked.

#### Where
`src/main.ts`
`src/content/hr.ts`
`src/app.test.ts`

#### Acceptance criteria
- The fresh-profile parent view provides usable end-to-end Croatian local guardian enrollment before the grant, approval, and return controls can be reached.
- Invalid or mismatched six-digit PIN values, unavailable Web Crypto, and unavailable storage each show a controlled Croatian result and never unlock parent actions.
- After successful local enrollment, grant, approve, return, and read-only overview behavior retains its existing authorization rules; leaving the section, selecting lock, and reloading relock it.
- Tests prove that unprovisioned, locked, unavailable, and relocked states expose no grant, approval, or return controls, and that the setup flow does not store a raw PIN or an unlocked flag.
- The player-facing copy states the browser-local boundary and destructive-reset recovery consequence without claiming account-grade parent authentication, remote recovery, or cross-device protection.

### 3. Declare the approved PWA identity and installability metadata

- [x] Add the selected Croatian application manifest to the static entry point without changing game storage or introducing remote services.

#### Why
The current deliverable is a static Vite build loaded from `index.html`, with no manifest, service worker, backend, account, or API (`package.json`, `index.html`, `README.md`). The manifest is the bounded metadata prerequisite for an installable browser-game target while retaining static deployment.

#### How
Depends on: Task 1. Add a Croatian web-app manifest and link it from production HTML for the Task 1-approved PWA target. Use Task 1-approved name, short name, icon references, display mode, colors, and start URL; all referenced assets must be same-origin and present in the production build. Do not register a worker in this task, add a server, account, analytics, push notification, remote content, or native packaging. A non-PWA decision stops this plan under Task 1 and does not make this task a no-op completion.

#### Where
`index.html`
`public/manifest.webmanifest`
`public/icon.svg`

#### Acceptance criteria
- When the PWA target is selected, production HTML links one valid same-origin manifest and browser inspection reports no manifest parsing or referenced-asset error.
- The manifest has the Task 1-approved Croatian identity, start URL, display mode, colors, and same-origin icon references.
- The manifest and HTML add no remote endpoint, account, analytics, payment, social, or push-notification integration and do not read, write, or delete browser-local game data.
- A non-PWA decision is recorded as a stop condition for this plan, requiring a separately reviewed replacement plan before any platform implementation.

### 4. Add the approved PWA offline shell and update policy

- [x] Register a same-origin service worker that safely serves the selected static game shell offline.

#### Why
A manifest alone does not supply offline behavior. The current app has no service worker and stores its game, adventure, and parent state in three independent localStorage V1 records (`README.md`, `src/game/store.ts`, `src/game/adventure.ts`, `src/game/parent-access.ts`). Offline/update behavior must therefore avoid treating browser storage as cache data or damaging those records.

#### How
Depends on: Task 3. Register a same-origin worker from the application entry in a supported secure context for the Task 1-approved PWA target. Implement a versioned shell/runtime caching policy for same-origin static asset and navigation requests only; it must provide an explicit Croatian offline fallback for an uncached navigation and activate updates without deleting, rewriting, or precaching localStorage, PIN material, or user progression. Document the cache/update/offline behavior and the HTTPS requirement. Do not add background sync, push, analytics, remote APIs, accounts, or native packaging. A non-PWA decision stops this plan under Task 1 and does not make this task a no-op completion.

#### Where
`src/main.ts`
`public/service-worker.js`
`README.md`

#### Acceptance criteria
- On a supported HTTPS context for the selected PWA target, the production app registers only the same-origin worker; unsupported or insecure contexts fail without breaking normal gameplay.
- After one successful online load, an offline reload serves the cached application shell or a controlled Croatian offline fallback, with no login prompt, stale remote content, analytics, or payment UI.
- The worker caches only selected same-origin static/navigation resources and has a documented cache-version/update policy; it never reads, serializes, caches, deletes, or rewrites localStorage values, PIN material, or progression data.
- Installing, updating, or using the offline shell leaves `croatian-money-pet-game:v1`, `croatian-money-pet-game:adventure:v1`, and `croatian-money-pet-game:parent-access:v1` byte-for-byte unchanged.
- A non-PWA decision is recorded as a stop condition for this plan, requiring a separately reviewed replacement plan before any platform implementation.

### 5. Add a versioned, compatible progression and pet-care domain model

- [x] Implement the selected persistent pet-care state and pure repeatable-care rules behind a separately validated browser-local record.

#### Why
Pets currently have only ownership, price, and house-placement behavior; no needs, health, happiness, growth, XP, level, streak, or quest state is stored (`src/game/shop.ts`, `src/game/house.ts`, `src/game/store.ts`). The existing game, adventure, and parent records are independently strict V1 schemas whose unreadable values must not be silently reinterpreted (`src/game/store.ts`, `src/game/adventure.ts`, `README.md`). A separate progression record avoids breaking their current consumers while providing the durable decisions missing from the game loop.

#### How
Depends on: Task 1. Create a `croatian-money-pet-game:progression:v1` domain module that implements exactly the pet fields, selected quest-state fields, care actions, cooldown/decay behavior, XP/level (if selected), and XP/cosmetic rewards defined in Task 1. Each accepted care action must first validate its stable idempotency event ID and then atomically commit its care transition, event ID, quest evidence/completion, and selected reward in the sole progression record. After a storage-write exception, reread that record: return the stored result only when that same event ID has the complete committed transition/evidence/reward; otherwise report no accepted event. A retry after a successful or reconciled write returns the stored result without a second transition or reward; no care/quest event writes another record. Validate the record strictly; malformed, unavailable, and unknown-version values must fail closed to safe in-memory progression without overwriting the unreadable source record. Associate pet progression only with currently owned pet IDs and define the selected deterministic handling for removed/unknown pets, duplicate care submissions, and clock changes. Keep the current `AppStateV1`, adventure V1, and parent-access V1 schemas and their keys unmodified and byte-for-byte compatible. Keep Croatian names, instructions, action labels, and rule-driven feedback in the content catalog rather than rendering internal IDs.

#### Where
`src/game/progression.ts`
`src/game/progression.test.ts`
`src/content/hr.ts`

#### Acceptance criteria
- The new module owns one explicitly versioned progression storage key and accepts only the exact selected V1 pet and quest-state shape, bounded values, known action IDs, and known owned-pet references.
- Every selected care action has deterministic preconditions, state transition, feedback/result code, cooldown/decay behavior, and XP/cosmetic reward or no-reward outcome; duplicate or out-of-window submissions cannot award twice.
- The stable event ID, care transition, quest evidence/completion, and selected reward are one atomic progression-record commit: after every storage-write exception the module rereads and reconciles that event, returning a complete stored result or accepting nothing; retries cannot cause a partial or duplicate reward.
- Valid progression reloads exactly, while malformed, unknown-version, unavailable, and unknown-pet records recover according to the selected policy without overwriting unreadable data.
- Existing game, adventure, and parent records remain readable and byte-for-byte unchanged through progression loads, saves, failed progression writes, invalid-data recovery, and care actions.
- Unit tests cover each selected care action, boundary/cooldown/clock behavior, duplicate prevention, valid reload, every write-failure order (throw before persistence, persist-then-throw, and retry/reload reconciliation), malformed/unknown-version/unavailable recovery, and stale owned-pet handling.

### 6. Add a deterministic repeatable quest layer and its first Croatian content set

- [x] Implement the selected care-only quests that convert repeatable pet care into a replayable session goal.

#### Why
The current adventure is a closed sequence of four missions and ends with `activeMission: null`; its four stars and badges are cosmetic (`src/game/adventure.ts`). The six-card practice deck and three-round earnings challenge reset with controller recreation (`src/main.ts`, `README.md`). A quest layer provides a repeatable objective without replacing the existing educational journey or inventing an unbounded simulation.

#### How
Depends on: Task 5. Implement only the quest cadence, selection seed/window, objective types, completion evidence, XP/cosmetic reward, expiry/reset, and replay limits selected in Task 1. The first content set must use Croatian copy and stable IDs; it may reference only care actions produced by Task 5. For each accepted care event, use its stable idempotency ID and the atomic progression-record commit defined in Task 5; never observe or write saving, chore, shop-purchase, borrowing, repayment, game, adventure, or parent records. Treat the current four adventure missions (`saving`, `earning`, `purchase`, `loan`) as preserved onboarding, not quest replacements. Reject unknown, expired, duplicated, or unsupported evidence without reward; never turn fictional rewards into real money, bypass parent approval, or make parent PIN unlock persistent. Cover every selected initial quest ID in tests and explicitly exclude money-action and all other unselected quest categories from this release.

#### Where
`src/game/quests.ts`
`src/game/quests.test.ts`
`src/content/hr.ts`

#### Acceptance criteria
- Each initial quest has a stable ID, natural Croatian title/instruction/feedback, one selected objective, deterministic availability window, completion evidence, reward, and repeat/reset rule.
- Quest creation and completion accept only selected care events using the Task 5 stable event ID; duplicate, rejected, unavailable-write, expired, and unsupported evidence do not complete or reward a quest, and chores, purchases, and money actions are deliberately excluded.
- The four existing adventure missions remain ordered onboarding with their current answer/evidence rules, stars, badges, and separate V1 persistence behavior unchanged.
- Tests enumerate every initial quest ID, verify valid completion and every selected rejection/reset boundary, including failed-write/retry ordering, and prove rewards remain fictional XP/cosmetic progression that cannot bypass parent approval requirements.
- No quest implementation introduces accounts, cloud synchronization, social interaction, advertising, real-money language, or unapproved content categories.

### 7. Integrate the care-and-quest loop into an accessible Croatian play session

- [x] Render a child-facing repeatable gameplay surface that makes pet state, one actionable goal, consequences, and next session clear.

#### Why
`createApp` currently rebuilds page-oriented DOM using `root.innerHTML` and controller-memory state (`src/main.ts`), which plausibly contributes to a website feel; this is a hypothesis, not child-playtest evidence. The project already supplies Croatian player-facing strings, responsive styles, 44 px controls, focus styling, and reduced-motion rules (`src/content/hr.ts`, `src/styles.css`). The new domain mechanics need a visible loop rather than an isolated data model.

#### How
Depends on: Task 6. In the existing child navigation and view architecture, add the selected care-and-quest gameplay surface using only Task 5 and Task 6 contracts. Show owned-pet state, a single current quest or selected empty-state, permitted care actions and cooldown/reward feedback, progress toward the selected level/collection goal, and a clear Croatian next-session cue. Preserve all current destinations and consumers: the four-mission adventure, fictional wallet/savings/debt actions, parent-approved chores, store ownership/filter behavior, named-house placement, parent fail-closed states, local focus management, 44 px controls, and reduced-motion equivalence. Keep controller-only UI state non-persistent unless Task 1 selected it for progression; save only through the new progression module and never render internal IDs or non-Croatian player-facing text.

#### Where
`src/main.ts`
`src/styles.css`
`src/app.test.ts`

#### Acceptance criteria
- A player with an owned pet can reach the selected gameplay surface, understand the current pet state and one available quest, perform only currently permitted Croatian-labeled care actions, and receive an adjacent textual consequence.
- Care and quest completion use the single atomic progression-record commit selected in Task 1 and survive controller recreation/reload; rejected, cooldown, expired, duplicate, or failed-write actions show an understandable Croatian result without a duplicate reward or mutation of game, adventure, or parent records.
- A player with no eligible pet or no available quest receives a Croatian next-step state that directs them only to existing fictional-game actions; it does not imply real purchases, automatic borrowing, or parental approval.
- The existing five child destinations, separate parent utility, four ordered adventure missions, money/chore/shop/house rules, and fail-closed parent states remain reachable and retain their current storage contracts.
- DOM tests cover a successful care-to-quest loop, rejected/cooldown/failed-write paths, reload persistence, the no-eligible-pet state, Croatian visible/accessibility text, keyboard focus after rerender, and reduced-motion-equivalent information.

### 8. Expand the closed Croatian chore, pet, and item catalogs through the approved content pipeline

- [x] Add the first approved content release without breaking stable inventory IDs, validation, or existing catalog consumers.

#### Why
The current content ceiling is small and closed: 10 chores, 8 pets, 10 items, 3 themes, four missions/badges, and six money-school/practice topics (`src/content/hr.ts`, `src/game/adventure.ts`). `src/game/store.ts` derives strict known-ID validation from the catalog, and the README requires Croatian mappings and exhaustive tests to move together when a catalog changes. More meaningful choices and collectible/care variety require a bounded authored content release rather than random entries.

#### How
Depends on: Tasks 2, 7. Add only the Task 1-approved first-release entries and their Croatian player-facing names, descriptions, prices/rewards, care/quest associations, and accessibility text. This task covers the current closed families exactly: chores **make-bed**, **tidy-toys**, **water-plants**, **set-table**, **fold-laundry**, **pack-school-supplies**, **feed-pets**, **sweep-kitchen**, **help-garden**, **sort-recycling**; pets **fish**, **rabbit**, **cat**, **dog**, **bird**, **goat**, **horse**, **cow**; and items **bowl**, **toy**, **pet-bed**, **plant**, **rug**, **wall-picture**, **bird-perch**, **pet-brush**, **lamp**, **bookshelf**. Preserve every listed ID and its existing economic semantics; assign unique stable IDs to additions and do not alter unselected themes, missions, badges, glossary topics, practice cards, or house-slot capacity. Update persistence validation tests for the whole expanded family and update integrated catalog rendering assertions; no new catalog may use real-money language or bypass ownership/parent approval rules.

#### Where
`src/content/hr.ts`
`src/game/store.test.ts`
`src/app.test.ts`

#### Acceptance criteria
- The rendered chores, pets, and items contain every current listed stable ID unchanged plus exactly the approved additions; all new player-facing and accessibility copy is natural Croatian.
- Each added chore has a positive whole-number fictional reward, and each added pet/item has a positive whole-number fictional price, stable unique ID, selected care/quest association where applicable, and no real-money implication.
- State validation accepts valid inventories and activities using every approved expanded catalog entry and rejects unknown, duplicate, malformed, or economically invalid references.
- The store and house continue to render and operate all prior catalog entries, preserve ownership/quantity rules, and do not increase the exact four pet and six item house slots in this task.
- Focused store and integrated application tests enumerate the expanded catalogs and prove existing purchase, activity-history, placement, and reload behavior remains compatible.

### 9. Verify the assembled game release with automated, installed-browser, and playtest evidence

- [x] Add release regression coverage and record only evidence actually observed for the selected platform and game-success thresholds.

#### Why
The repository declares `npm test`, `npm run check`, and `npm run build`, and has substantial unit/integration coverage (`package.json`, `src/game/*.test.ts`, `src/app.test.ts`). The latest README receipt says final installed Chrome, Safari, and Firefox checks were not executed, and no child playtest has been performed. Automated source evidence cannot prove that the selected loop feels like a game or meets the product outcomes in Task 1.

#### How
Depends on: Tasks 4, 8. Extend regression coverage for the approved PWA shell, local guardian enrollment, progression, care-only quests, and expanded catalogs while retaining the current complete four-mission journey and all three legacy V1-record recovery cases. Update `package.json` so `npm run check` includes `src/game/progression.ts` and `src/game/quests.ts` (or an equivalent project configuration that includes every `src/**/*.ts` module), then make that inclusion observable in its command output or configuration. Update the README saved-data inventory and consented destructive-reset instructions for the fourth progression record: it may be recovered independently under its no-silent-overwrite policy, and the documented destructive reset removes it along with the three legacy records. Run the declared automated commands, then serve the production build over HTTPS in clean profiles at the Task 1-approved phone, tablet, and desktop viewports. Perform the Task 1-defined moderated child/parent playtest with consent and no analytics collection; capture only aggregated, non-identifying results. Document exact commands, browser/version, viewport, install/offline method, pass/fail outcome, unexecuted gates, and any remediation needed. Do not claim native, account, cloud-sync, accessibility-technology, browser, or child-learning success evidence that was not executed.

#### Where
`src/app.test.ts`
`README.md`
`package.json`

#### Acceptance criteria
- Automated regression tests cover the selected PWA registration/offline boundary, local guardian enrollment, a persisted care-and-quest session including failed-write/retry behavior, expanded catalog validation, and the unchanged complete four-mission journey with existing V1 recovery behavior.
- `npm test`, `npm run check`, and `npm run build` pass, with command output and any failure recorded honestly in the release receipt; the `check` configuration or output demonstrably includes both new core modules (and no `src/**/*.ts` module is omitted).
- The README lists all four saved-data records, defines independent unreadable-progression recovery without silent overwrite, and makes the consented destructive-reset procedure remove the progression record together with the three legacy records.
- On the selected installed browsers and clean profiles, the production HTTPS build is inspected at the approved phone, tablet, and desktop viewports for installability, offline reload, no horizontal overflow, visible focus, enabled 44×44 CSS-px targets, reduced-motion-equivalent information, and persistence across update/reload; each unexecuted browser or check remains explicitly unclaimed.
- The moderated playtest uses the Task 1-defined, consented, non-identifying method and reports the selected session-completion, comprehension, and return-intent measures separately for child and parent participants.
- The release receipt states whether the selected success thresholds passed, failed, or remain blocked; it never represents this plan, an unexecuted test, or an unapproved platform as a shipped or validated game.
