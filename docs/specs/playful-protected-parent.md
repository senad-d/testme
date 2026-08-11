# Playful Redesign, Protected Parent Area, and Local Persistence

**Status:** implementation-ready proposal — not adopted, published, validated, or implemented  
**Goal:** Make the existing Croatian financial-education game visibly more playful and animated, put all parent-only actions behind a browser-local access gate, and retain the existing simple browser-local persistence. Every user-facing string, including access errors and accessibility text, remains Croatian.

## Evidence basis

- `src/main.ts` already implements the five views **Moj novac**, **Poslovi**, **Trgovina**, **Moja kuća**, and **Kutak za roditelje**, plus the child money, chore, shop, and house journeys.
- The parent navigation currently changes `activeView` without authorization, and `renderParent` exposes the grant and chore-review controls (`src/main.ts`). The current Croatian introduction explicitly says that the parent area is not locked (`src/content/hr.ts`).
- The current visual layer has a small color palette, gradients, cards, emoji, and only button press/transition motion. `src/styles.css` has no keyframe animation and already limits its existing transition to `prefers-reduced-motion: no-preference`.
- Simple persistent game storage is already implemented. `src/game/store.ts` uses the versioned key `croatian-money-pet-game:v1`, validates loaded state, recovers from absent/malformed/unknown/unavailable data, and saves accepted changes. `src/game/store.test.ts` and `src/app.test.ts` cover round trips, recovery, and reload restoration.
- `index.html` declares Croatian, and runtime copy is centralized in `src/content/hr.ts`. Existing tests audit Croatian visual and accessibility channels.
- `README.md` accurately describes the current browser-local game key but currently says that there is no authentication or secure parent area; implementation must update that consumer when the gate exists.

## Product decision and security boundary

The request does not specify an account system, protection strength, credential recovery, or a server. This plan uses the smallest implementation compatible with the existing static, browser-local app:

- a parent creates a **six-digit local PIN** on first entry, entering it twice;
- the PIN record is persisted in a separate versioned browser-local key, while the existing game-state key and V1 schema remain unchanged;
- the raw PIN is never stored; Web Crypto derives a salted PBKDF2-HMAC-SHA-256 value, and verification compares derived bytes without rendering or logging credential material;
- successful entry unlocks parent controls only in memory; navigating away, reloading, destroying the app controller, or selecting **Zaključaj** locks them again;
- missing, malformed, unknown-version, unavailable, or unverifiable credential storage fails closed: grant and approval controls are absent and their mutation handlers reject the action;
- there is no unauthenticated in-app PIN reset. A forgotten PIN requires clearing this app's local data, which also resets game data and must be stated before the user follows the documented reset procedure.

This is a local child-deterrence boundary, not an authenticated account or protection against someone who controls the browser profile or device. The product owner must confirm that boundary before adoption. Accounts, server authentication, remote recovery, biometrics, cloud synchronization, multi-device shared state, analytics, external animation libraries, audio, and new game mechanics are deliberately excluded.

## Cross-cutting contracts

- All visible text, form validation, errors, status/live-region output, accessible names/descriptions, and PIN instructions are Croatian. Internal identifiers, tests, and engineering documentation may be English. No raw internal code or browser/crypto exception reaches the UI.
- Decorative animation and emoji are `aria-hidden="true"`; informative visuals have Croatian alternatives. Motion never conveys the only indication of state.
- Every animation and nonessential transition is disabled by `prefers-reduced-motion: reduce`; the reduced-motion presentation remains complete and understandable.
- Parent authorization is enforced at both rendering and mutation boundaries. Hiding controls alone is not acceptance.
- The existing game key `croatian-money-pet-game:v1`, state shape, validation, recovery behavior, and save-after-accepted-change flow remain consumers that must be preserved. No task replaces them or silently migrates them.

## Implementation plan

### 1. Add a fail-closed local parent-access primitive

**Depends on:** nothing  
**Where:** `src/game/parent-access.ts`, `src/game/parent-access.test.ts`, `package.json`

**Work:**

- Add a DOM-independent parent-access module with a dedicated key such as `croatian-money-pet-game:parent-access:v1`, a validated V1 record, and closed result codes for setup-required, setup-success, unlock-success, invalid-format, mismatch, wrong-PIN, malformed-record, unknown-version, crypto-unavailable, and storage-unavailable outcomes.
- Accept only exactly six ASCII digits. Generate a fresh random salt with Web Crypto and derive the stored verifier with PBKDF2-HMAC-SHA-256. Keep algorithm parameters in the versioned record so a future change requires an explicit version/migration decision.
- Inject storage and crypto dependencies so tests do not require the DOM. Catch storage and Web Crypto failures, return a closed code, and never return, persist, log, or interpolate the raw PIN or native exception.
- Validate a record before verification. Unknown, malformed, or unavailable records must remain untouched and must never produce an unlocked result.
- Update the explicit TypeScript `check` path list in `package.json` to include the new production module.

**Acceptance criteria:**

- Tests prove first-run detection, successful setup and verification, wrong-PIN rejection, format rejection, and a new random salt for independent setups.
- Persisted JSON contains a version, algorithm parameters, salt, and derived verifier but contains neither the raw PIN nor the test PIN as a substring.
- Malformed, unknown-version, read-failing, write-failing, random-source-failing, and derivation-failing cases return a controlled fail-closed code and do not overwrite either the access record or `croatian-money-pet-game:v1`.
- Only successful verification can return an unlocked result; failure objects and logs contain no PIN or native error text.
- `npm test -- src/game/parent-access.test.ts`, `npm run check`, and `npm run build` pass.

**Validation:** Run the three commands above and inspect a test record to confirm that credential material is not stored verbatim.

### 2. Gate every parent view and mutation while preserving saved game data

**Depends on:** 1  
**Where:** `src/main.ts`, `src/content/hr.ts`, `src/app.test.ts`

**Work:**

- Add exhaustive Croatian copy for initial PIN setup, PIN confirmation, unlock, wrong/malformed/unavailable states, the local-only limitation, the destructive forgotten-PIN guidance, and the explicit **Zaključaj** action. Include Croatian labels, input descriptions, validation, live feedback, and accessible names.
- Replace direct parent rendering with three exclusive states: setup form when no credential exists, unlock form while locked, and the existing grant/approval controls only while unlocked. Use password inputs with numeric input mode and suitable autocomplete attributes; do not echo the PIN in feedback or activity history.
- Keep authorization state only in the `createApp` controller. Lock it on navigation away from the parent view, explicit lock, reload/new controller, and destroy.
- Guard `grant`, `approve-chore`, and `return-chore` at their event-handler/mutation boundary. A forged submit/click while locked must leave state and both storage keys unchanged and return only Croatian denied feedback.
- Retain the existing `loadState`/`saveState` flow and key without schema changes. Extend the real-UI journey so it sets up/unlocks the gate before granting or approving, then completes a saved child action and proves reload restores the game but not the unlocked session.

**Acceptance criteria:**

- Before successful setup or unlock, no grant, approval, or return control is present in the DOM; only the Croatian setup/unlock experience is exposed.
- Matching valid setup values create the credential and unlock the controls. Mismatched, invalid, or wrong values show Croatian feedback, keep controls absent, and disclose neither the PIN nor native errors.
- Tests dispatch forged parent mutation events while locked and prove wallet, chore requests, activity, next ID, game storage, and parent-access storage do not change.
- Leaving the parent view, selecting **Zaključaj**, reloading, or creating a new controller requires the PIN again. Successful unlock does not alter game state.
- The existing game-persistence cases still pass: accepted child/game changes survive reload; missing data starts a new game; malformed, unknown-version, and unavailable game storage produce controlled Croatian recovery without exposing or eagerly overwriting stored data.
- Tests inventory all new visible/accessibility channels and prove they use `src/content/hr.ts`, contain non-empty Croatian copy, and never render raw result codes or English fallback/errors.
- `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

**Validation:** Run the four commands; manually test first setup, wrong PIN, unlock, grant, chore approval, navigation-away relock, and reload relock.

### 3. Apply a playful animated visual system across the complete interface

**Depends on:** 2  
**Where:** `src/styles.css`, `src/main.ts`, `src/app.test.ts`

**Work:**

- Expand the palette and visual hierarchy with cheerful layered backgrounds, high-contrast section colors, rounded cards, playful borders/shadows, view-specific accents, larger pet/shop imagery, reward/status badges, and a friendly mascot/header treatment. Cover the closed family of money, chores, shop, house, locked/setup parent, and unlocked parent states; deliberately do not add new catalog entries or mechanics.
- Add lightweight CSS-only motion: a gentle mascot float, staggered card entrance, pet/decoration bob, active-navigation emphasis, and brief success-feedback celebration. Use stable transforms/opacity rather than layout-changing properties and keep interactions usable while motion runs.
- Add only decorative markup/classes needed by the visual system. Mark it hidden from assistive technology, keep actionable state in Croatian text, and do not fetch fonts, images, scripts, trackers, or other remote assets.
- Preserve the existing responsive and keyboard contracts: no horizontal scroll from 320 px, 44×44 px targets, visible focus, semantic forms/buttons, and non-color status cues.
- Add structural tests for the decorative accessibility contract and reduced-motion stylesheet. Retain manual visual review because jsdom cannot establish whether the redesign is fun, attractive, or free of visual overlap.

**Acceptance criteria:**

- All six named UI states have a deliberate, consistent playful treatment; the redesign is visibly more than a palette swap and uses animation in normal-motion mode.
- With normal motion, the mascot, cards, decorative pet/house elements, active navigation, and success feedback use the planned CSS motion without changing application state or blocking controls.
- With `prefers-reduced-motion: reduce`, all keyframe animation, nonessential transition, and transform-based motion is disabled; no information or feedback disappears.
- Decorative elements are absent from the accessibility tree. Focus remains clearly visible, status is not communicated only by color/motion, and all non-decorative user-facing/accessibility strings remain Croatian.
- Manual checks at 320, 768, and 1440 px show no clipping, overlap, or horizontal scrolling and confirm usable phone, tablet, and desktop layouts.
- `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass.

**Validation:** Run the four commands. In a browser, exercise every named state at 320/768/1440 px, keyboard-only, normal motion, and emulated reduced motion; record screenshots for implementation review.

### 4. Align maintenance guidance with the gate and persistence boundary

**Depends on:** 1–3  
**Where:** `README.md`

**Work:**

- Replace the obsolete statement that no parent protection exists with an accurate description of the local PIN gate and its local-device threat boundary; do not call it an account or server-grade authentication.
- Document both versioned storage keys, that game progress remains browser-local, that unlock state does not persist, and that there is no cloud backup or cross-device synchronization.
- Document the full local-data reset/forgotten-PIN consequence before the reset steps: both credential and game progress are removed. Keep commands and engineering prose in English while literal UI examples remain Croatian.
- Replace the current promise that `dist/` can be deployed to any static web host with the requirement that production hosting provide HTTPS and a secure browser context, because parent PIN setup and unlock depend on Web Crypto. Localhost may be documented as the development exception. State that an insecure or otherwise Web-Crypto-unavailable context is unsupported and retains the Croatian fail-closed unavailable state with parent controls inaccessible.
- Add parent setup/unlock/relock, reduced-motion, Croatian-copy, persistence reload, and three-viewport checks to the pre-release checklist. Require the production `dist/` build to be served from an HTTPS secure context and verify setup plus unlock there; also verify that Web Crypto unavailability shows the controlled Croatian unavailable state and exposes no parent controls.

**Acceptance criteria:**

- README statements match implemented keys and behavior and contain no remaining claim that the parent area is unprotected.
- README no longer promises deployment to any static host: it requires HTTPS/a secure context for production, identifies localhost only as a development exception, and explains the Web Crypto dependency and Croatian fail-closed unavailable behavior.
- A maintainer can distinguish persistent game data, persistent credential verifier, and non-persistent unlocked session without inspecting source.
- Reset guidance names its destructive effect before the command and does not promise credential recovery, accounts, secure remote access, cloud storage, or synchronization.
- A deployed production build served over HTTPS completes parent PIN setup, relock, and unlock; when Web Crypto is unavailable, the same build shows only controlled Croatian unavailable feedback and no grant, approval, or return controls.
- `npm test`, `npm run check`, and `npm run build` still pass after following the documented workflow.

**Validation:** Review every README security/storage claim against the implemented constants, then manually follow the pre-release checklist against a production `dist/` build served over HTTPS. Complete setup, relock, and unlock in that secure context, and separately confirm the Croatian fail-closed state when Web Crypto is unavailable.

## Dependency order and definition of done

Task 1 creates the access contract. Task 2 is the independently testable protected-parent vertical slice and preserves the already-working game storage. Task 3 redesigns every resulting locked/unlocked and child state. Task 4 updates the existing documentation consumer after behavior is final.

The work is complete only when all four tasks pass their automated checks, manual viewport/motion/keyboard review is recorded, parent mutations cannot execute while locked, unlock never survives a reload/navigation-away lock event, and existing game progress still survives reload with controlled Croatian recovery behavior.

## Remaining uncertainties

- The user has not confirmed that a six-digit browser-local PIN is a sufficient protection model. If protection against a device owner, browser developer tools, copied local storage, or remote attackers is required, this plan must not be adopted; account/server identity and recovery need a separate investigation and product decision.
- No visual references, brand palette, character direction, or quantitative animation target were supplied. The implementation review must therefore judge the bounded visual language against the requested “more animated and fun looking” outcome while retaining accessibility and Croatian-only output.
- Minimum browser versions are not specified. The implementation should retain the repository's documented current-browser target; an explicit compatibility baseline is a separate product decision.

This document is one local implementation proposal only. It is not adopted, published, validated, or implemented.