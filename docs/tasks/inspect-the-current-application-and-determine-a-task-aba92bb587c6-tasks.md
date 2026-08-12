### 1. Reattach the parent utility to an intentional navigation shell and stabilize tablet navigation

- [x] Correct the parent-entry shell and the child-navigation responsive breakpoint without returning the parent entry to the child navigation.

#### Why
Visual-regression report `docs/design/visual-regressions-after-ui-ux-implementation-task-dad031133ff2.md` identifies VR-1 (high) and VR-3 (medium): the parent utility is rendered after the white navigation shell, leaving a blank band and a detached right-aligned control, and the five-column rule begins at 768 px where **Pustolovina** wraps differently from the other controls. This fixes presentation only while preserving the mission-first information architecture recorded by the same report and the Croatian, cross-device requirements in PRD `docs/prd/prd-igra-financijske-vjestine.md` FR-5 and FR-6.

#### How
Depends on: none. In the root header/navigation markup, retain the five `childViews` controls as the only members of the child `<nav>` and retain **Kutak za roditelje** as a separately labeled parent control, but place that control in a bounded, shared utility/header region aligned to the existing 1180 px content shell. Remove the layout relationship that leaves the utility outside `.app-navigation`. Define responsive utility and child-grid rules so 320 px has no unanchored blank intermediary band, 768 px uses a consistent icon/text arrangement and row height, and five equal columns are used only at a width where the Croatian labels fit without accidental icon-only wrapping. Preserve `data-nav`, `aria-current="page"`, decorative `aria-hidden` nav icons, the 44 px minimum target rule, focus styling, all view routing, and the existing parent lock behavior; do not modify game, persistence, or parent-access modules.

#### Where
`src/main.ts`
`src/styles.css`

#### Acceptance criteria
- At 320, 768, and 1440 CSS px, the parent entry is outside the child `<nav>` but visibly belongs to an intentional bounded utility/header region aligned with the application shell; it does not create a blank intermediary navigation band or appear as an unanchored control.
- The child `<nav>` contains exactly **Pustolovina**, **Moj novac**, **Poslovi**, **Trgovina**, and **Moja kuća**, and the parent entry remains a separate Croatian control with its current routing and lock semantics.
- At 320 px the five child controls occupy no more than three rows; at 768 px every child control has a consistent icon/text arrangement and row height, and **Pustolovina** does not place its emoji on a line by itself.
- At 320, 768, and 1440 CSS px, no enabled navigation or parent-utility control is clipped or horizontally overflows after finite animation settles, and the existing visible focus treatment and at-least-44-by-44-CSS-px target contract remain available.

### 2. Complete the compact adventure composition

- [x] Rework the compact Luna introduction, journey stepper, and optional disclosures into a coherent responsive adventure surface without restoring the former tall hero.

#### Why
VR-2 (high), VR-4 (medium), and VR-5 (low) in `docs/design/visual-regressions-after-ui-ux-implementation-task-dad031133ff2.md` identify one incomplete adventure composition: the fixed 72 px Luna emoji crowds the heading at 320 px and leaves a purposeless wide field at 768 and 1440 px; `.journey-overview-list` is forced into one column while CSS styles obsolete `.journey-path`; and `.adventure-disclosure` has no card-system rule. The report confirms that the current mission-first order and first-answer placement are improvements that must be preserved. The design source `docs/design/review-the-current-application-ui-and-ux-and-pro-task-28cfed35ce5d-ui-ux.md` §6.3 and §7 supplies the intended compact content, 760 px mission measure, stepper, and native disclosures; PRD FR-5 and FR-6 require usable cross-device Croatian UI.

#### How
Depends on: none. In `renderAdventure`, keep the compact intro immediately before the active mission and retain the exact Croatian heading **Pustolovina sa šapicama**, the two orientation messages, and Luna as decorative `aria-hidden` content. Replace inline presentation geometry with named styling hooks. In CSS, constrain the card to the same 760 px readable measure as the mission or give it an intentional low-contrast decorative background; add 4–8 px breathing room after the heading and suppress or replace the global `h1` underline only within this compact intro. At widths up to 360 px, allow Luna and the text to form clean rows when the heading and two orientation lines cannot fit beside the 72 px illustration. Remove the inline journey grid layout and style `.journey-overview-list` directly as two equal columns through 767 px and four equal columns from 768 px, without horizontal overflow. Keep all four `MISSION_IDS` in order, their textual states, and locked-step story omission. Add one shared `.adventure-disclosure` card treatment using existing border, surface, radius, spacing, and low-elevation conventions while retaining native `<details>/<summary>` behavior and 44 px summaries. Do not add remote art, alter player-facing copy, reorder the mission/progress/disclosures, replace disclosures with custom icon-only controls, or change adventure state, game rules, persistence, or focus behavior.

#### Where
`src/main.ts`
`src/styles.css`

#### Acceptance criteria
- On fresh Pustolovina at 320 CSS px, the compact introduction retains a decorative 72 CSS px Luna treatment, **Pustolovina sa šapicama**, **Luna ti pokazuje sljedeći korak.**, and **Nova pustolovina je spremna.**, with no heading, underline, or orientation line visually touching another line.
- At 768 and 1440 CSS px, the intro aligns to a maximum 760 CSS px mission measure or has an intentional decorative background; it has no large purposeless blank field and preserves a clear separation between its heading and orientation copy.
- The active mission remains directly after the Luna introduction and before journey progress and all three optional disclosures; the existing mission content, answer count, action CTA, and Croatian text remain unchanged.
- At 320 CSS px, the four journey stops form a 2×2 grid; at 768 and 1440 CSS px, they form one four-step row, with no horizontal overflow after finite animations settle.
- Every step preserves the existing `MISSION_IDS` order, short mission title, and textual **Trenutačna**, **Dovršeno**, or **Zaključano** state; locked overview steps do not render story text.
- **Vježbaj pravila**, **Moje značke**, and **Mala škola novca** remain initially closed native `<details>` elements with Croatian text labels and at-least-44-CSS-px summaries; both closed and open states visibly use the surrounding adventure card system.
- Opening or closing any disclosure does not change game, adventure, or parent-access storage records, and no progress, badge, practice, glossary, or accessibility semantics are removed.
- Luna remains hidden from assistive technology, and the change adds no external resource, game-state mutation, persistence-schema change, or replacement of the mission-first layout with the superseded tall scene.

### 3. Prove the visual-regression repair without weakening existing behavior

- [x] Add focused DOM/source regression coverage and execute the repository’s declared automated checks plus the bounded fresh-browser inspection.

#### Why
The report’s C1–C3 inspection was limited to fresh Pustolovina and source-confirmed below-fold findings; the prior continued-UI task plan warns that rerender-sensitive assertions must query current DOM. The affected UI is rendered by `src/main.ts` and styled by `src/styles.css`, while `src/app.test.ts` is the integrated application regression suite. This task provides repeatable evidence for VR-1 through VR-5 while preserving PRD `docs/prd/prd-igra-financijske-vjestine.md` FR-1 through FR-6 behavior that the visual-only correction must not change.

#### How
Depends on: Tasks 1, 2. Extend the integrated tests to assert the repaired DOM contracts: five child controls in the child nav with a separately placed parent utility; the compact Luna heading/orientation copy and decorative accessibility treatment; four ordered journey steps with locked stories absent; and three initially closed native disclosures whose toggling leaves the three V1 localStorage values byte-for-byte unchanged. Add source-level assertions only where JSDOM cannot establish viewport layout, covering the named responsive utility, breakpoint, stepper, and disclosure rules rather than brittle incidental formatting. Run `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` as declared in `README.md`. Then, on a clean profile, run the report’s documented `npm run dev` visual procedure at 320 × 800, 768 × 900, and 1440 × 900 after finite animations settle; record only actually observed Chrome evidence and explicitly leave browser, zoom, screen-reader, or interaction states unclaimed when not executed.

#### Where
`src/app.test.ts`

#### Acceptance criteria
- Integrated tests prove that child navigation contains the five ordered child destinations only, that the parent control is separate, and that navigation continues to render the existing Croatian destinations with `aria-current` behavior.
- Integrated tests prove the compact Luna heading and both orientation messages are present, Luna is decorative, all four ordered journey steps expose textual state, locked steps omit story text, and practice/badge/school disclosures are initially closed native `<details>` elements.
- Tests prove toggling each optional disclosure leaves `croatian-money-pet-game:v1`, `croatian-money-pet-game:adventure:v1`, and `croatian-money-pet-game:parent-access:v1` byte-for-byte unchanged.
- Source-level assertions cover the responsive utility shell, the tested navigation breakpoint treatment, `.journey-overview-list` responsive grid, and `.adventure-disclosure` card styling without depending on obsolete `.journey-path` as the active stepper selector.
- `npm test -- src/app.test.ts`, `npm test`, `npm run check`, and `npm run build` pass; fresh Chrome inspection at 320 × 800, 768 × 900, and 1440 × 900 records the VR-1 through VR-5 layout outcomes or documents any unexecuted check without claiming unsupported browser or assistive-technology coverage.
