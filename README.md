# Croatian Money and Pet Game

A responsive, browser-local educational game for practising fictional money choices. Engineering documentation is in English; every player-facing string is Croatian. See the [documentation index](docs/README.md) for product requirements, specifications, and tasks.

## Prerequisites

- A current Node.js LTS release (Node.js 20 or newer recommended)
- npm

## Install and run

```sh
npm ci
npm run dev
```

The committed lockfile keeps the tested toolchain, including Vitest V8 coverage support, reproducible. Open the local address printed by Vite. No server, account, or external service is required.

## Tests and production build

Focused integration commands:

```sh
npm test -- src/app.test.ts src/game/adventure.test.ts
npm test -- src/game/house.test.ts src/game/store.test.ts
npm test -- src/app.test.ts src/game/house.test.ts
npm test -- src/app.test.ts
npm test -- src/app.test.ts src/game/parent-access.test.ts
```

Full project commands:

```sh
npm test
npm run check
npm run build
npm run coverage:parent
```

The build command creates a static installable PWA in `dist/`. Production hosting must serve `dist/` over HTTPS in a secure browser context because parent PIN unlock depends on Web Crypto and the offline shell depends on a service worker. `localhost` is a development-only secure-context exception. In an insecure or Web-Crypto-unavailable context, the Croatian fail-closed unavailable state is shown and all parent controls remain inaccessible. The application does not require server-side routing. `service-worker.js` uses the versioned cache `moja-trgovina-ljubimaca-shell-v1`, caches only same-origin navigation/static responses, removes only older caches with that prefix on activation, and shows a controlled Croatian fallback for an uncached offline navigation. Updating the worker cache version refreshes the shell without reading or changing localStorage. No background sync, push, analytics, or remote content is used.

## Player navigation

The primary child navigation contains six Croatian destinations: **Pustolovina**, **Briga o ljubimcu**, **Moj novac**, **Poslovi**, **Trgovina**, and **Moja kuća**. **Kutak za roditelje** is a separate parent utility, not a child-navigation destination. The header identifies the game boundary with: **Ovo je igra s izmišljenim zlatnicima — bez pravog novca.**

## Maintaining content and rules

Frequently changed values and all Croatian display copy live in `src/content/hr.ts`. The final closed catalogs are:

- `CHORES` (14): the ten original entries plus **Obriši stol**, **Složi knjige**, **Obriši prašinu s polica**, and **Donesi poštu**.
- `PETS` (12): the eight original entries plus **Hrčak**, **Kornjača**, **Ježić**, and **Alpaka**.
- `ITEMS` (16): the ten original entries plus **Bočica za vodu**, **Loptica za igru**, **Rukavica za četkanje**, **Dekica za ljubimca**, **Zidni sat**, and **Košara s cvijećem**.
- `HOUSE_AREAS` in `src/game/house.ts` (4): **Dnevna soba**, **Soba za ljubimce**, **Spremište**, and **Dvorište i staja**. This ordered contract owns all four `pet-N` and six `item-N` V1 slots; Croatian names and descriptions are in `HOUSE_AREA_CONTENT`.
- `THEMES`: free house themes.
- `CONFIG.debtLimit`: maximum fictional debt
- `HR`, `LOAD_MESSAGES`, `RESULT_MESSAGES`, and `activityMessage`: Croatian interface and feedback text
- `ADVENTURE_MISSIONS`: Croatian stories, instructions, questions, the eight answer mappings, and action steps for the closed `saving`, `earning`, `purchase`, and `loan` mission IDs
- `ADVENTURE_BADGES`: Croatian names and explanations for the four cosmetic badges
- `MONEY_SCHOOL`: the six Croatian topics **Novčanik**, **Kasica**, **Zarada**, **Cijena**, **Zajam**, and **Dug**.
- `ADVENTURE_PRACTICE`: the replayable six-card practice deck for those same ordered topics.

When changing or adding one chore or shop entry:

1. Keep its stable ID unchanged for an existing entry, or choose a new unique stable ID.
2. Provide a natural Croatian display name.
3. Use a positive whole-number reward or price.
4. Update persisted-state validation in `src/game/store.ts` if the set of allowed IDs changes.
5. Extend the appropriate domain and UI tests, then run `npm test` and `npm run build`.

Internal result codes are closed typed inventories in `src/game/store.ts`. Adventure mission order, evidence validation, completion rules, answer IDs, badge IDs, and persistence live in `src/game/adventure.ts`; Croatian learning copy lives in `src/content/hr.ts`. If a closed ID or rule changes, update the rule, Croatian mapping, validation, and exhaustive tests together. Run `npm test -- src/game/adventure.test.ts`, then `npm test`, `npm run check`, and `npm run build`. Never render an internal code directly.

## Browser-local saved data and parent access

Four separate versioned records are stored in `localStorage`:

```text
croatian-money-pet-game:v1
croatian-money-pet-game:parent-access:v1
croatian-money-pet-game:adventure:v1
croatian-money-pet-game:progression:v1
```

The first record contains persistent game balances, chores, purchases, house choices, and activity history. The second contains the versioned PBKDF2 parameters, random salt, and derived verifier for the six-digit local parent PIN; it never intentionally stores the raw PIN. The third contains only validated mission progress: the active/completed missions, correct-answer and qualifying-action evidence, four-star count, and four badge IDs. Adventure stars and badges are cosmetic and cannot be spent or change a balance. The fourth record contains pet needs, daily care quest/evidence, stable event receipts, XP, levels, and cosmetic titles. Care and quests never mutate zlatnici or any of the three legacy records. Existing valid game, adventure, and parent records remain compatible because the progression loader never migrates, reinterprets, rewrites, or removes them. Each loader reads only its own V1 record, has an independent recovery boundary, never silently migrates or reinterprets another record, and preserves its unreadable stored record until a later accepted change in that subsystem.

Persistence boundaries are intentionally narrow:

- **Persistent game V1:** fictional wallet, savings and debt balances; chore requests and accepted parent decisions; purchased animals/items; selected house theme and placements; and existing activity history.
- **Persistent adventure V1:** the four main missions' validated answers, action evidence, completion, four cosmetic stars, and four badges.
- **Persistent parent-access V1:** only the local PBKDF2 credential record; never the raw PIN and never an unlocked flag.
- **Persistent progression V1:** bounded pet needs, care cooldowns, one daily quest, atomic care evidence/event receipts, XP, levels, and cosmetic titles. Malformed or unknown progression bytes fail closed to safe memory and remain untouched. With informed guardian consent, remove only `croatian-money-pet-game:progression:v1` to restart pet-care progress independently.
- **Controller-memory-only:** earnings-challenge round/feedback, shop category and affordability filters, savings-goal calculation/form result, and practice card/feedback/correct-card progress. Navigation retains these tools only while the current controller exists; reload or controller recreation resets them without changing persisted records.

A successful parent unlock is also session-only: it is lost when the parent leaves the section, selects **Zaključaj**, reloads, or starts a new app controller. The Croatian learning overview is rendered **only while successfully unlocked**. It is read-only, derives seven values and up to five recent existing activities from current game/adventure memory, grants no additional authority, and is absent while unprovisioned, locked, unavailable, relocked, or reloaded.

A fresh profile offers first-use local guardian PIN enrollment only inside the separately labeled **Kutak za roditelje** utility. It requires matching six-digit values and Web Crypto, then unlocks only the current controller session. Grant, chore decision, and overview controls remain absent until setup succeeds. This is a local guardian-labeled deterrence flow, not proof that the person is an adult.

This PIN gate is a local child-deterrence boundary for the current browser profile, not an account or server-grade authentication. It does not protect against somebody who controls the device, browser profile, developer tools, or local storage. There is no cloud backup, remote recovery, secure remote access, or synchronization between devices.

**Destructive reset:** there is no in-app forgotten-PIN recovery. The following procedure permanently removes the parent credential, all game progress, and all adventure progress. Explain that consequence before proceeding. Open the browser developer console for the game and run:

```js
localStorage.removeItem("croatian-money-pet-game:parent-access:v1")
localStorage.removeItem("croatian-money-pet-game:v1")
localStorage.removeItem("croatian-money-pet-game:adventure:v1")
localStorage.removeItem("croatian-money-pet-game:progression:v1")
location.reload()
```

Changing any stored schema requires an explicit migration and a new version strategy. Do not silently reinterpret or overwrite unreadable data; the current loaders fail closed, and the game-state loader starts a safe new in-memory game while preserving unreadable stored data until a later accepted game action.

## Pre-release checklist

- [ ] Run `npm test`, `npm run check`, `npm run build`, and `npm run coverage:parent`.
- [ ] On a fresh profile, complete Croatian local guardian enrollment and confirm no grant, approval, return, or overview control appears before successful setup.
- [ ] Serve the production `dist/` build over HTTPS in a clean profile; inspect the manifest, install the PWA where supported, complete setup/unlock/**Zaključaj**, load once online, and verify offline reload.
- [ ] Simulate unavailable Web Crypto and confirm the controlled Croatian unavailable message appears with no grant, approval, or return controls.
- [ ] Confirm leaving the parent section and reloading both relock it.
- [ ] Complete the four missions in order: correct answer plus save at least 5; correct answer plus parent-approved chore; correct answer plus wallet-funded purchase; correct answer plus borrow and repay at least the borrowed amount.
- [ ] Try a wrong answer and retry it; try a rejected or out-of-order action and confirm neither awards progress.
- [ ] Confirm each first completion awards exactly one named badge and one cosmetic star, the total stops at four, and no balance changes because of an adventure reward.
- [ ] Reload and confirm exact game and separate adventure progress persist while parent access relocks.
- [ ] Review every visible message, error, live announcement, and accessibility string for natural Croatian; confirm decorative scenery, guide, stars, badges, and celebrations are hidden from assistive technology.
- [ ] Complete keyboard-only and touch flows; confirm visible keyboard focus and 44×44 px touch targets.
- [ ] Test the correct-answer, action-step, new-star/badge, and journey-completion reactions in normal motion and with `prefers-reduced-motion: reduce`; confirm the same progress information remains available in the checklist, text, stars, and badges with animation disabled.
- [ ] Check layouts manually at 320, 768, and 1440 px with no clipping, overlap, or horizontal scrolling.
- [ ] Run the destructive-reset console procedure, confirm none of the four keys remains, reload, and confirm a fresh game, first adventure mission, zero stars, no care XP, and no parent credential.

### PWA/repeatable-game implementation receipt — 2026-08-12

- **Automated commands executed:** `npm test` passed **96/96 tests in 10 files**; `npm run check` passed and `--listFiles` explicitly listed `src/game/progression.ts`, `src/game/quests.ts`, and every other `src/**/*.ts` source and test module; `npm run build` passed; `npm run coverage:parent` passed **47/47 tests** with 97.47% statements/lines, 89.68% branches, and 100% functions across its bounded target.
- **Production output:** Vite 6.0.3 produced `dist/index.html`, `dist/assets/index-BQuyvm8Q.js`, `dist/assets/index-CVzpuecg.css`, `dist/manifest.webmanifest`, `dist/icon.svg`, and `dist/service-worker.js`. The four PWA shell SHA-256 values were `77cc7f61…4a726` (HTML), `23068410…e5213` (manifest), `c63e2dac…a8c0` (icon), and `9cbc6363…b94d` (worker). `node --check public/service-worker.js` passed.
- **Chrome HTTPS method/result:** installed **Google Chrome 151.0.7922.109** ran headless with a new clean profile against the fresh `dist/` over local HTTPS (`https://localhost:8446`) using a one-run self-signed certificate and Chrome’s certificate-error override. Chrome reported the same-origin worker activated at `/service-worker.js`, a same-origin `/manifest.webmanifest`, Croatian document language/title, and an active service-worker controller after online reload.
- **Responsive/accessibility observations in that Chrome run:** at **320×568**, **768×1024**, and **1440×900** CSS px, `documentElement.scrollWidth === innerWidth`; all 13 enabled controls in the initial rendered state were at least 44×44 CSS px; a keyboard Tab focused the skip link with a computed 4 px solid outline; and `prefers-reduced-motion: reduce` was active while the equivalent textual Pustolovina information remained present. Conditional states beyond the initial surface were automated in Vitest but were not exhaustively remeasured in this installed-browser run.
- **Offline/update/persistence observation:** after an online controlled reload, Chrome network emulation was set fully offline and the production app reloaded under the active worker. The Croatian application title/body remained available. Sentinel bytes placed in all four localStorage keys before reload returned exactly `sentinel-0` through `sentinel-3` afterward, proving this install/activate/offline path did not rewrite those records. A multi-version worker update was not staged, so update migration remains unexecuted beyond the source-tested cache-version cleanup policy.
- **Install UI boundary:** the headless Chrome run proved manifest parsing/linkage and an activated offline worker, but did **not** exercise Chrome’s visible installation UI or launch an installed standalone window. No installed-window claim is made.
- **Other installed browsers:** Safari **26.5** and Firefox **153.0.3** version metadata was readable, but their production gameplay, offline, viewport, installation, keyboard, target-size, reduced-motion, and persistence checks were **not executed**. Edge was not installed. These gates remain unclaimed rather than passed.
- **Moderated playtest:** no consented group of five child/parent pairs was available or tested. All five 4-of-5 comprehension, completion, return-intent, enrollment-boundary, and relock thresholds therefore remain **blocked/unmeasured**. No participant data was collected.
- **Release conclusion:** implementation and automated checks pass, and the bounded Chrome HTTPS/offline evidence above passes. The assembled game is **not release-validated or claimed shipped** because installed-window, Safari, Firefox, update-cycle, and moderated playtest gates remain open.

### Superseded pre-PWA release receipt — 2026-08-11

- **Executed:** clean `npm ci` and all nine prescribed commands ran on 2026-08-11 from 20:42 CEST (18:42 UTC).
- **Production build:** `npm run build` produced `assets/index-BhN2ah8p.js`, `assets/index-C9M97U2J.css`, and `index.html`. The SHA-256 manifest digest is `10914ffd0c1e9d7e0713b4eedc82e27e29732fe7d5b61883fd4ee74d003cdc65`, calculated over each sorted `dist/` relative path, a NUL separator, its file bytes, and a trailing NUL.
- **Automated result:** the five focused commands passed (43, 18, 40, 34, and 38 tests respectively); the full suite passed all 78 tests in eight files; TypeScript check and production build passed; parent coverage passed all 38 tests with 96.46% statements, 91.06% branches, 100% functions, and 96.46% lines. The aggregate test visited all six navigation sections, exercised each prescribed representative flow, and verified recreation/persistence boundaries. Independent malformed and unknown-version record coverage also passed.
- **Installed-browser method/result:** final-build execution in the installed browser applications was requested, but this run's guarded environment denied read/execute access to the installed Chrome, Safari, Firefox, and Safari WebDriver paths. No installed-browser version was independently read and no final-build viewport, clipping/overlap/horizontal-scroll, keyboard-focus, 44×44-target, or reduced-motion check was executed. This is an explicit blocked release gate, not a pass.
- [ ] Google Chrome — **final post-fix build not executed; no Chrome support claim is made**.
- [ ] Safari — **final post-fix build not executed; no Safari support claim is made**.
- [ ] Firefox — **final post-fix build not executed; no Firefox support claim is made**.
- [ ] Microsoft Edge — **not executed; no Edge support claim is made**. Edge is not an implementation gate.

The browser gate must be rerun at 320, 768, and 1440 CSS px in each installed Chrome, Safari, and Firefox after browser execution is authorized. Any failure must remain explicit. Until then, the historical receipt below must not be treated as evidence for the final post-fix build.

### Superseded pre-fix Chrome-only receipt — 2026-08-11

#### Historical fresh Chrome 44×44 target audit

- **Executed:** 2026-08-11T14:50:03.503Z with installed **Google Chrome 151.0.7922.76**.
- **Production build:** fresh `npm run build`; SHA-256 manifest digest `24e0636b496e447a1a322924dfd301ece2906584c552e0c09eaa4c78ae239e3f`, calculated over each sorted `dist/` relative path, a NUL separator, its file bytes, and a trailing NUL. Files: `assets/index-B8foKdX5.js`, `assets/index-DcjItMfX.css`, and `index.html`.
- **Method:** the production `dist/` was served from `127.0.0.1`; installed Chrome ran with a clean profile and was driven through the Chrome DevTools Protocol. `Emulation.setDeviceMetricsOverride` set 320, 768, and 1440 CSS px at DPR 1. After each scripted state transition, the audit awaited every finite Web Animation and two animation frames, selected every visible enabled in-scope `button`, `input`, and `select`, and recorded `getBoundingClientRect()` width and height. A row fails only when width **or** height is below 44 CSS px.
- **Coverage:** 61 distinct control/state rows at each viewport (183 measurements total): planner input/select/submit; both `data-id` answers in all three `data-round` challenge states; four shop categories, affordability, and conditional reset; both `data-answer` choices on all six ordered `data-card` practice states plus every enabled first/intermediate/final previous/next state; named-house theme, populated pet/item move/remove, and unplaced pet/item placement controls; and locked/unlocked parent PIN, unlock, lock, grant input, all three quick amounts, grant submit, approve, and return.
- **Final undersized list:** **empty (0 of 183)**. Every dimension below is at least 44 CSS px.
- **Layout result:** all 13 audited conditional states at each viewport had `scrollWidth === innerWidth` (320, 768, and 1440 respectively), zero horizontally clipped controls, and zero overlapping control pairs.
- **Persistence result:** byte-for-byte values for `croatian-money-pet-game:v1`, `croatian-money-pet-game:adventure:v1`, and `croatian-money-pet-game:parent-access:v1` were identical before and after each viewport audit. The traversal used only controller-local challenge, filter, practice, navigation, and parent-unlock state.
- **CSS decision:** `src/styles.css` is unchanged. The previous contradictory result was an immediate-render sampling fault: it measured descendants during the finite `card-arrive` animation's initial `scale(.98)` transform (for example, a declared 44 px target transiently appeared near 43.12 px). The final baseline waits for finite entrance animations to settle before measuring the interactive target, and it passes without a CSS correction.

| Family / state | Control identity | 320 px (W × H) | 768 px (W × H) | 1440 px (W × H) |
|---|---|---:|---:|---:|
| planner / default | `#goal-target` | 253.219 × 44.000 | 663.281 × 46.500 | 1106.000 × 46.500 |
| planner / default | `#goal-chore` | 253.219 × 44.000 | 663.281 × 44.000 | 1106.000 × 44.000 |
| planner / default | `button[form=goal-plan;type=submit]` | 253.219 × 45.594 | 663.281 × 48.188 | 1106.000 × 48.188 |
| earnings-challenge / round-0 | `button[data-action=answer-earnings-challenge;data-id=set-table;data-round=0]` | 253.219 × 69.594 | 325.688 × 68.000 | 547.047 × 68.000 |
| earnings-challenge / round-0 | `button[data-action=answer-earnings-challenge;data-id=make-bed;data-round=0]` | 253.219 × 69.594 | 325.703 × 68.000 | 547.063 × 68.000 |
| earnings-challenge / round-1 | `button[data-action=answer-earnings-challenge;data-id=help-garden;data-round=1]` | 253.219 × 69.594 | 325.688 × 68.000 | 547.047 × 68.000 |
| earnings-challenge / round-1 | `button[data-action=answer-earnings-challenge;data-id=tidy-toys;data-round=1]` | 253.219 × 69.594 | 325.703 × 68.000 | 547.063 × 68.000 |
| earnings-challenge / round-2 | `button[data-action=answer-earnings-challenge;data-id=sort-recycling;data-round=2]` | 253.219 × 69.594 | 325.688 × 73.688 | 547.047 × 68.000 |
| earnings-challenge / round-2 | `button[data-action=answer-earnings-challenge;data-id=fold-laundry;data-round=2]` | 253.219 × 69.594 | 325.703 × 73.688 | 547.063 × 68.000 |
| shop-filter / default | `button[data-action=set-shop-category;data-category=all]` | 249.219 × 53.203 | 158.438 × 73.688 | 269.125 × 56.000 |
| shop-filter / default | `button[data-action=set-shop-category;data-category=pets]` | 249.219 × 45.594 | 158.453 × 73.688 | 269.125 × 56.000 |
| shop-filter / default | `button[data-action=set-shop-category;data-category=pet-items]` | 249.219 × 45.594 | 158.438 × 73.688 | 269.125 × 56.000 |
| shop-filter / default | `button[data-action=set-shop-category;data-category=house-items]` | 249.219 × 45.594 | 158.453 × 73.688 | 269.125 × 56.000 |
| shop-filter / default | `button[data-action=toggle-shop-affordability]` | 249.219 × 45.594 | 125.016 × 48.188 | 125.016 × 48.188 |
| shop-filter / empty | `button[data-action=reset-shop-filters]` | 111.547 × 45.594 | 118.266 × 48.188 | 118.266 × 48.188 |
| practice / card-1-wallet | `button[data-action=answer-practice;data-card=wallet;data-answer=first]` | 217.219 × 64.000 | 306.688 × 73.688 | 528.047 × 68.000 |
| practice / card-1-wallet | `button[data-action=answer-practice;data-card=wallet;data-answer=second]` | 217.219 × 69.594 | 306.703 × 73.688 | 528.063 × 68.000 |
| practice-navigation / card-1-wallet | `button[data-action=next-practice]` | 123.422 × 69.594 | 328.250 × 48.188 | 549.609 × 48.188 |
| practice / card-2-savings | `button[data-action=answer-practice;data-card=savings;data-answer=first]` | 217.219 × 69.594 | 306.688 × 73.688 | 528.047 × 68.000 |
| practice / card-2-savings | `button[data-action=answer-practice;data-card=savings;data-answer=second]` | 217.219 × 69.594 | 306.703 × 73.688 | 528.063 × 68.000 |
| practice-navigation / card-2-savings | `button[data-action=previous-practice]` | 123.406 × 69.594 | 328.234 × 48.188 | 549.594 × 48.188 |
| practice-navigation / card-2-savings | `button[data-action=next-practice]` | 123.422 × 69.594 | 328.250 × 48.188 | 549.609 × 48.188 |
| practice / card-3-earning | `button[data-action=answer-practice;data-card=earning;data-answer=first]` | 217.219 × 69.594 | 306.688 × 73.688 | 528.047 × 68.000 |
| practice / card-3-earning | `button[data-action=answer-practice;data-card=earning;data-answer=second]` | 217.219 × 93.594 | 306.703 × 73.688 | 528.063 × 68.000 |
| practice-navigation / card-3-earning | `button[data-action=previous-practice]` | 123.406 × 69.594 | 328.234 × 48.188 | 549.594 × 48.188 |
| practice-navigation / card-3-earning | `button[data-action=next-practice]` | 123.422 × 69.594 | 328.250 × 48.188 | 549.609 × 48.188 |
| practice / card-4-price | `button[data-action=answer-practice;data-card=price;data-answer=first]` | 217.219 × 64.000 | 306.688 × 68.000 | 528.047 × 68.000 |
| practice / card-4-price | `button[data-action=answer-practice;data-card=price;data-answer=second]` | 217.219 × 69.594 | 306.703 × 68.000 | 528.063 × 68.000 |
| practice-navigation / card-4-price | `button[data-action=previous-practice]` | 123.406 × 69.594 | 328.234 × 48.188 | 549.594 × 48.188 |
| practice-navigation / card-4-price | `button[data-action=next-practice]` | 123.422 × 69.594 | 328.250 × 48.188 | 549.609 × 48.188 |
| practice / card-5-loan | `button[data-action=answer-practice;data-card=loan;data-answer=first]` | 217.219 × 69.594 | 306.688 × 73.688 | 528.047 × 68.000 |
| practice / card-5-loan | `button[data-action=answer-practice;data-card=loan;data-answer=second]` | 217.219 × 69.594 | 306.703 × 73.688 | 528.063 × 68.000 |
| practice-navigation / card-5-loan | `button[data-action=previous-practice]` | 123.406 × 69.594 | 328.234 × 48.188 | 549.594 × 48.188 |
| practice-navigation / card-5-loan | `button[data-action=next-practice]` | 123.422 × 69.594 | 328.250 × 48.188 | 549.609 × 48.188 |
| practice / card-6-debt | `button[data-action=answer-practice;data-card=debt;data-answer=first]` | 217.219 × 69.594 | 306.688 × 68.000 | 528.047 × 68.000 |
| practice / card-6-debt | `button[data-action=answer-practice;data-card=debt;data-answer=second]` | 217.219 × 64.000 | 306.703 × 68.000 | 528.063 × 68.000 |
| practice-navigation / card-6-debt | `button[data-action=previous-practice]` | 123.406 × 69.594 | 328.234 × 48.188 | 549.594 × 48.188 |
| named-house / theme | `#theme` | 253.219 × 44.000 | 250.438 × 44.000 | 471.797 × 44.000 |
| named-house / theme | `button[form=theme;type=submit]` | 253.219 × 45.594 | 142.031 × 48.188 | 142.031 × 48.188 |
| named-house / populated-pet-slot | `#move-pet-1` | 213.219 × 44.000 | 152.594 × 44.000 | 297.734 × 44.000 |
| named-house / populated-pet-slot | `button[data-action=move-pet;data-slot=pet-1]` | 213.219 × 45.594 | 152.594 × 48.188 | 145.469 × 48.188 |
| named-house / populated-pet-slot | `button[data-action=remove-pet;data-slot=pet-1]` | 213.219 × 45.594 | 152.594 × 48.188 | 145.469 × 48.188 |
| named-house / populated-item-slot | `#move-item-1` | 213.219 × 44.000 | 183.156 × 44.000 | 350.094 × 44.000 |
| named-house / populated-item-slot | `button[data-action=move-item;data-slot=item-1]` | 213.219 × 45.594 | 183.156 × 48.188 | 171.641 × 48.188 |
| named-house / populated-item-slot | `button[data-action=remove-item;data-slot=item-1]` | 213.219 × 45.594 | 183.156 × 48.188 | 171.656 × 48.188 |
| named-house / unplaced-pet | `#pet-slot-3` | 253.219 × 44.000 | 276.766 × 44.000 | 498.125 × 44.000 |
| named-house / unplaced-pet | `button[form=place-pet;form-id=3;type=submit]` | 253.219 × 45.594 | 89.375 × 48.188 | 89.375 × 48.188 |
| named-house / unplaced-item | `#item-slot-bowl` | 253.219 × 44.000 | 276.766 × 44.000 | 498.125 × 44.000 |
| named-house / unplaced-item | `button[form=place-item;form-id=bowl;type=submit]` | 253.219 × 45.594 | 89.375 × 48.188 | 89.375 × 48.188 |
| named-house / unplaced-item | `#item-slot-toy` | 253.219 × 44.000 | 276.766 × 44.000 | 498.125 × 44.000 |
| named-house / unplaced-item | `button[form=place-item;form-id=toy;type=submit]` | 253.219 × 45.594 | 89.375 × 48.188 | 89.375 × 48.188 |
| parent / locked | `#parent-pin` | 247.219 × 44.000 | 606.000 × 46.500 | 606.000 × 46.500 |
| parent / locked | `button[form=parent-unlock;type=submit]` | 247.219 × 45.594 | 606.000 × 48.188 | 606.000 × 48.188 |
| parent / unlocked-lock | `button[data-action=lock-parent]` | 100.063 × 45.594 | 106.047 × 48.188 | 106.047 × 48.188 |
| parent / unlocked-grant | `#amount-grant` | 247.219 × 44.000 | 657.281 × 46.500 | 1100.000 × 46.500 |
| parent / unlocked-grant | `button[data-quick=5]` | 78.141 × 69.594 | 214.563 × 48.188 | 362.125 × 48.188 |
| parent / unlocked-grant | `button[data-quick=10]` | 78.156 × 69.594 | 214.563 × 48.188 | 362.141 × 48.188 |
| parent / unlocked-grant | `button[data-quick=20]` | 78.141 × 69.594 | 214.563 × 48.188 | 362.141 × 48.188 |
| parent / unlocked-grant | `button[form=grant;type=submit]` | 247.219 × 45.594 | 657.281 × 48.188 | 1100.000 × 48.188 |
| parent / unlocked-request | `button[data-action=approve-chore;data-id=1]` | 209.219 × 45.594 | 89.594 × 48.188 | 89.594 × 48.188 |
| parent / unlocked-request | `button[data-action=return-chore;data-id=1]` | 209.219 × 45.594 | 154.734 × 48.188 | 154.734 × 48.188 |

#### Scope of the superseded receipt

- [x] The required focused and full automated commands listed above passed after the final unchanged CSS state.
- [x] The fresh Chrome audit found no clipping, overlap, or horizontal scrolling at 320, 768, and 1440 px.
- [x] Existing keyboard-focus styling and reduced-motion behavior remain unchanged; no CSS rule was edited by this reconciliation.
- [ ] Safari 26.5 (21624.2.5.11.4) — the prior installed-version smoke receipt was not rerun for this target audit; no fresh 44×44 result is claimed for Safari.
- [ ] Firefox 153.0.3 — the prior installed-version smoke receipt was not rerun for this target audit; no fresh 44×44 result is claimed for Firefox.
- [ ] Microsoft Edge — **not executed; no Edge support claim is made**. Edge is not installed and is not an implementation gate.

This receipt covers engineering behavior and release presentation only. No child playtest threshold was supplied, so it does not claim product validation or a measured learning outcome.

The game uses only fictional **zlatnici**. It contains no real payments, real loans, advertising, analytics, cloud storage, accounts, social features, or external purchase links.
