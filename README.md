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

The build command creates a static `dist/` directory. Production hosting must serve `dist/` over HTTPS in a secure browser context because parent PIN unlock depends on Web Crypto. `localhost` is a development-only secure-context exception. In an insecure or Web-Crypto-unavailable context, the Croatian fail-closed unavailable state is shown and all parent controls remain inaccessible. The application does not require server-side routing.

## Player navigation

The primary child navigation contains five Croatian destinations: **Pustolovina**, **Moj novac**, **Poslovi**, **Trgovina**, and **Moja kuća**. **Kutak za roditelje** is a separate parent utility, not a child-navigation destination. The header identifies the game boundary with: **Ovo je igra s izmišljenim zlatnicima — bez pravog novca.**

## Maintaining content and rules

Frequently changed values and all Croatian display copy live in `src/content/hr.ts`. The final closed catalogs are:

- `CHORES` (10): **Posloži krevet**, **Pospremi igračke**, **Zalij biljke**, **Postavi stol**, **Pomozi složiti rublje**, **Složi školski pribor**, **Nahrani ljubimce**, **Pometi kuhinju**, **Pomozi u vrtu**, and **Razvrstaj otpad**.
- `PETS` (8): **Ribica**, **Kunić**, **Mačka**, **Pas**, **Ptičica**, **Koza**, **Konj**, and **Krava**.
- `ITEMS` (10): **Zdjelica**, **Igračka**, **Krevetić**, **Biljka**, **Tepih**, **Zidna slika**, **Stajalica za ptice**, **Četka za ljubimce**, **Svjetiljka**, and **Polica za knjige**.
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

Three separate versioned records are stored in `localStorage`:

```text
croatian-money-pet-game:v1
croatian-money-pet-game:parent-access:v1
croatian-money-pet-game:adventure:v1
```

The first record contains persistent game balances, chores, purchases, house choices, and activity history. The second contains the versioned PBKDF2 parameters, random salt, and derived verifier for the six-digit local parent PIN; it never intentionally stores the raw PIN. The third contains only validated mission progress: the active/completed missions, correct-answer and qualifying-action evidence, four-star count, and four badge IDs. Adventure stars and badges are cosmetic and cannot be spent or change a balance. Existing valid game and parent records remain compatible because the adventure loader never migrates, reinterprets, rewrites, or removes them. Each loader reads only its own V1 record, has an independent recovery boundary, never silently migrates or reinterprets another record, and preserves its unreadable stored record until a later accepted change in that subsystem.

Persistence boundaries are intentionally narrow:

- **Persistent game V1:** fictional wallet, savings and debt balances; chore requests and accepted parent decisions; purchased animals/items; selected house theme and placements; and existing activity history.
- **Persistent adventure V1:** the four main missions' validated answers, action evidence, completion, four cosmetic stars, and four badges.
- **Persistent parent-access V1:** only the local PBKDF2 credential record; never the raw PIN and never an unlocked flag.
- **Controller-memory-only:** earnings-challenge round/feedback, shop category and affordability filters, savings-goal calculation/form result, and practice card/feedback/correct-card progress. Navigation retains these tools only while the current controller exists; reload or controller recreation resets them without changing persisted records.

A successful parent unlock is also session-only: it is lost when the parent leaves the section, selects **Zaključaj**, reloads, or starts a new app controller. The Croatian learning overview is rendered **only while successfully unlocked**. It is read-only, derives seven values and up to five recent existing activities from current game/adventure memory, grants no additional authority, and is absent while unprovisioned, locked, unavailable, relocked, or reloaded.

The public game does not offer first-use PIN enrollment: a child using the ordinary interface must not be able to become the first parent. A fresh profile therefore remains locked and visibly unprovisioned until its credential is established through a separate parent-authenticated provisioning boundary. This static distribution does not implement such a boundary, so fresh-profile self-service enrollment is intentionally unsupported. The test suite uses `setupParentAccess` only as an external fixture to verify compatibility, locking, and unlocking; `createApp` neither imports nor calls it.

This PIN gate is a local child-deterrence boundary for the current browser profile, not an account or server-grade authentication. It does not protect against somebody who controls the device, browser profile, developer tools, or local storage. There is no cloud backup, remote recovery, secure remote access, or synchronization between devices.

**Destructive reset:** there is no in-app forgotten-PIN recovery. The following procedure permanently removes the parent credential, all game progress, and all adventure progress. Explain that consequence before proceeding. Open the browser developer console for the game and run:

```js
localStorage.removeItem("croatian-money-pet-game:parent-access:v1")
localStorage.removeItem("croatian-money-pet-game:v1")
localStorage.removeItem("croatian-money-pet-game:adventure:v1")
location.reload()
```

Changing any stored schema requires an explicit migration and a new version strategy. Do not silently reinterpret or overwrite unreadable data; the current loaders fail closed, and the game-state loader starts a safe new in-memory game while preserving unreadable stored data until a later accepted game action.

## Pre-release checklist

- [ ] Run `npm test`, `npm run check`, `npm run build`, and `npm run coverage:parent`.
- [ ] On a fresh profile, confirm the Croatian unprovisioned state appears with no setup, unlock, grant, approval, or return controls.
- [ ] With an externally provisioned compatible parent record, serve the production `dist/` build over HTTPS in a secure context and complete unlock and **Zaključaj**.
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
- [ ] Run the destructive-reset console procedure, confirm none of the three keys remains, reload, and confirm a fresh game, first adventure mission, zero stars, and no parent credential.

### Final post-fix release receipt — 2026-08-11

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
