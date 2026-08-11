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

```sh
npm test
npm run build
```

The build command creates a static `dist/` directory. Production hosting must serve `dist/` over HTTPS in a secure browser context because parent PIN unlock depends on Web Crypto. `localhost` is a development-only secure-context exception. In an insecure or Web-Crypto-unavailable context, the Croatian fail-closed unavailable state is shown and all parent controls remain inaccessible. The application does not require server-side routing.

## Maintaining content and rules

Frequently changed values and all Croatian display copy live in `src/content/hr.ts`:

- `CHORES`: chore names and rewards
- `PETS`: animal names, prices, and emoji
- `ITEMS`: pet-item and house-decoration names, prices, and emoji
- `THEMES`: free house themes
- `CONFIG.debtLimit`: maximum fictional debt
- `HR`, `LOAD_MESSAGES`, `RESULT_MESSAGES`, and `activityMessage`: Croatian interface and feedback text
- `ADVENTURE_MISSIONS`: Croatian stories, instructions, questions, the eight answer mappings, and action steps for the closed `saving`, `earning`, `purchase`, and `loan` mission IDs
- `ADVENTURE_BADGES`: Croatian names and explanations for the four cosmetic badges
- `MONEY_SCHOOL`: the six Croatian topics **Novčanik**, **Kasica**, **Zarada**, **Cijena**, **Zajam**, and **Dug**

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

The first record contains persistent game balances, chores, purchases, house choices, and activity history. The second contains the versioned PBKDF2 parameters, random salt, and derived verifier for the six-digit local parent PIN; it never intentionally stores the raw PIN. The third contains only validated mission progress: the active/completed missions, correct-answer and qualifying-action evidence, four-star count, and four badge IDs. Adventure stars and badges are cosmetic and cannot be spent or change a balance. Existing valid game and parent records remain compatible because the adventure loader never migrates, reinterprets, rewrites, or removes them. Each loader reads only its own V1 record, has an independent recovery boundary, never silently migrates or reinterprets another record, and preserves its unreadable stored record until a later accepted change in that subsystem. A successful parent unlock is held only in memory and is lost when the parent leaves the section, selects **Zaključaj**, reloads, or starts a new app controller.

The public game does not offer first-use PIN enrollment: a child using the ordinary interface must not be able to become the first parent. A fresh profile therefore remains locked and visibly unprovisioned until its credential is established through a separate parent-authenticated provisioning boundary. This static distribution does not implement such a boundary, so fresh-profile self-service enrollment is intentionally unsupported. The test suite uses `setupParentAccess` only as an external fixture to verify compatibility, locking, and unlocking; `createApp` neither imports nor calls it.

This PIN gate is a local child-deterrence boundary for the current browser profile, not an account or server-grade authentication. It does not protect against somebody who controls the device, browser profile, developer tools, or local storage. There is no cloud backup, remote recovery, secure remote access, or synchronization between devices.

**Destructive reset:** there is no in-app forgotten-PIN recovery. The following procedure permanently removes the parent credential, all game progress, and all adventure progress. Explain that consequence before proceeding. Open the browser developer console for the game and run:

```js
localStorage.removeItem("croatian-money-pet-game:parent-access:v1")
localStorage.removeItem("croatian-money-pet-game:v1")
localStorage.removeItem("croatian-money-pet-game:adventure:v1")
location.reload()
```

Changing either stored schema requires an explicit migration and a new version strategy. Do not silently reinterpret or overwrite unreadable data; the current loaders fail closed, and the game-state loader starts a safe new in-memory game while preserving unreadable stored data until a later accepted game action.

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
- [ ] Smoke-test current Chrome, Safari, Firefox, and Edge.

The game uses only fictional **zlatnici**. It contains no real payments, real loans, advertising, analytics, or external purchase links.
