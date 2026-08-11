# UI/UX review and improvement specification — Moja trgovina ljubimaca

**Assignment:** `task-28cfed35ce5d`  
**Author:** `griselda-ui-ux-designer`  
**Status:** implementation-ready design specification; application source was not modified

## 1. Decision summary

Adopt a **mission-first “Luna vodi moj sljedeći korak” layout**. Keep the existing colorful pet-adventure identity, Croatian language, large controls, fictional-money boundary, and positive feedback. Reorder and compress the interface so the current mission is the first substantive task, turn the long journey overview into a compact progress component, collapse optional learning collections, and separate the adult entry from child play navigation.

This direction is tailored to a primary user who is eight years old by reducing simultaneous choices, keeping one clear next action, using familiar icon-plus-text cues, and showing consequences immediately. The direction does **not** assume all girls prefer pink: retain the existing yellow, sky, mint, coral, pink, purple, and blue palette rather than making gender stereotypes the design system.

## 2. Scope, requirements, and assumptions

### Explicit requirements

- Primary user: an eight-year-old child; the user specifically described girls.
- The experience is a Croatian fictional-money and pet game across phone, tablet, and desktop.
- All player-facing and assistive text remains Croatian.
- This artifact is read-only guidance; implementation and independent acceptance happen later.

### Product/source constraints preserved

- Preserve the six functional views and their behavior: **Pustolovina**, **Moj novac**, **Poslovi**, **Trgovina**, **Moja kuća**, and **Kutak za roditelje**.
- Preserve versioned local persistence, game rules, catalog values, parent-access security boundaries, mission ordering, badges, and the fact that no real money is used.
- Do not add accounts, advertising, analytics, real payments, external links, audio, precision drag-and-drop, or child-accessible parent provisioning.
- Keep the existing Trebuchet/system typography unless product ownership later supplies a licensed brand typeface.

### Assumptions (not research findings)

- Age appropriateness is based on interface heuristics and source/product requirements; no child usability research or playtest was performed.
- Feminine Croatian success language already used by the product (for example, **“osvojila si”**) may remain. Avoid gendered visual stereotypes or excluding other children.
- “Improvement” means clearer hierarchy and interaction feedback, not replacing the established pet-adventure identity.

## 3. Inspection evidence

### Live inspection method

Credential-free Vite development UI at `http://127.0.0.1:4173/`, isolated **Chrome/151.0.7922.76**, DPR 1. The fresh **Pustolovina** state was inspected at all required widths.

| Ref | Route / state | Viewport | Evidence |
|---|---|---:|---|
| E1 | `/` / fresh Pustolovina | 320 × 800 | screenshot SHA-256 `b7dfeb5b175b1196e146dccfbea52f483881f0c4fe6e783596dc12572abb0a81`; DOM snapshot |
| E2 | `/` / fresh Pustolovina | 768 × 900 | screenshot SHA-256 `d9ae4439b5f463ba5f8e70f9a8552be48d93e1e20599feab94afe91025f69591`; DOM snapshot |
| E3 | `/` / fresh Pustolovina | 1440 × 900 | screenshot SHA-256 `d60f68ee09944283713bc6ca46ebe11683fd0c3801a7aa07408a7e33315d8098`; DOM snapshot |

Reproduction: start `npm run dev` on port 4173, open the URL in a clean profile, set each viewport, and do not mutate storage.

The inspection runtime blocked the generic navigation buttons as potentially mutating controls. Therefore other views and post-action states were reviewed from source and existing tests, not claimed as live visual evidence. The console contained one unqualified 404 resource entry at all widths; it was not tied to a visible defect and is not treated as a design finding. No authenticated state, external resource, form submission, browser-family comparison, or screen-reader session was inspected.

### Source evidence

- **S1 — `src/main.ts`:** render order, navigation, mission/answer states, global feedback, money forms, chore cards, shop filters/cards, house controls, and parent states.
- **S2 — `src/styles.css`:** established colors, 17 px base type, 44 px minimum controls, focus outline, responsive rules, animation, and reduced-motion handling.
- **S3 — `src/content/hr.ts`:** Croatian product language, missions, education content, catalogs, and positive/feminine feedback.
- **S4 — `docs/prd/prd-igra-financijske-vjestine.md`:** primary user, fictional-money boundary, functional views, Croatian and cross-device requirements.
- **S5 — `src/app.test.ts`:** integrated flows and currently asserted semantic/localization behavior.

## 4. Observed problems

Each finding separates observation from the proposed solution.

| ID | Context → observation → impact | Severity | Evidence |
|---|---|---|---|
| F1 | Fresh Pustolovina → the current mission question starts far below the viewport: first mission answer begins around y=2530 at 320, y=1822 at 768, and y=1554 at 1440 → a child sees decoration, navigation, guide, progress, and four story cards before the task she is meant to do. | High | E1–E3 DOM geometry; S1 `renderAdventure` order |
| F2 | 320 fresh state → six navigation buttons occupy y≈234–540, all stacked one per row → the navigation consumes about 306 px before play begins and makes the experience feel like a menu rather than a game. | High | E1 |
| F3 | Fresh adventure document → the main region is about 4916 px tall at 320, 3325 px at 768, and 2880 px at 1440 because map stories, mission, practice, badges, and school are all expanded → optional learning content competes with the current goal and increases memory/scroll burden. | High | E1–E3 DOM geometry; S1 |
| F4 | Mission overview → all four long story cards appear before the active mission and locked cards repeat content a child cannot act on → progress and instruction are conflated, while “what do I do now?” is visually secondary. | Medium | E1–E3; S1 `renderAdventure` |
| F5 | Adventure action → answer and money-action handlers rebuild the entire app and place result text in a global status above the main region; answer buttons become disabled after success without a selected/correct visual label → a sighted child acting far down the page can lose context, and keyboard focus has no specified restoration target. | High | S1 `render`, `clickHandler`, `commit`; E1 answer geometry versus feedback geometry |
| F6 | Primary navigation → **Kutak za roditelje** has the same weight as child play destinations → the adult utility adds a child-facing choice and weakens the distinction between play and protected adult controls, even though the protected state itself correctly fails closed. | Medium | E1–E3; S1 `views`, `renderParent` |
| F7 | Money/loan area → borrowing is presented as one of several similarly styled forms and only a paragraph explains the consequence → an eight-year-old has to infer how wallet and debt will change before submitting. | Medium | S1 `renderMoney`; S3 loan copy |
| F8 | Shop → catalog prices and affordability are shown, but the wallet amount is not visible in the shop view → the child must remember a number from another screen while comparing purchases. | Medium | S1 `renderShop` |

### Existing strengths to preserve

- Friendly Croatian copy, pet theme, Luna guide, varied cheerful palette, and fictional-money notice are appropriate foundations.
- Body text is already 17 px with comfortable line height.
- Live snapshots show enabled controls at least 45.59 px high in the inspected fresh state; CSS sets a 44 px minimum.
- Current navigation includes visible text and `aria-current`; states generally include textual explanations instead of color alone.
- A 4 px visible focus outline, skip link, semantic forms, local live regions in practice/challenge, and reduced-motion CSS already exist.
- Parent controls are absent in unprovisioned/locked states by source design.

## 5. Alternatives considered

### A. Palette-only “more girly” reskin — rejected

More pink, sparkles, and illustration would not solve F1–F8 and would stereotype the audience. The app is already visually playful.

### B. Persistent mobile bottom navigation with a dashboard — not selected

A bottom bar would make sections easy to reach, but six destinations plus long Croatian labels do not fit responsibly at 320 px. It also risks covering content and complicating safe-area/focus behavior.

### C. Mission-first hierarchy with compact child navigation — selected

This retains the current rendering model and design tokens while bringing the task forward, reducing choices, and making feedback local. It has lower implementation risk than a new routing shell and directly addresses observed geometry.

## 6. Selected design specification

### 6.1 Global information architecture

Use this order on child views:

1. Compact app header and fictional-money notice.
2. Primary child navigation: **Pustolovina**, **Moj novac**, **Poslovi**, **Trgovina**, **Moja kuća**.
3. Adult utility entry: **Kutak za roditelje 🔒**, outside the child navigation but always discoverable and at least 44 × 44 px.
4. View heading plus one short orientation sentence.
5. Current mission/primary task.
6. Supporting content.

On Pustolovina specifically, render:

1. Compact Luna introduction.
2. Active mission card.
3. Compact journey progress.
4. Three collapsed optional sections: **Vježbaj pravila**, **Moje značke**, **Mala škola novca**.

Do not show the persistent global “Nova igra je spremna!” celebration on an ordinary clean load. Put the calm one-line state **“Nova pustolovina je spremna.”** in the Luna introduction. Reserve the global status bar for an actual recovery warning or accepted/rejected action.

### 6.2 Header and navigation

- Keep the paw logo and **Moja trgovina ljubimaca**.
- Replace the long safety block with exact child copy: **“Ovo je igra s izmišljenim zlatnicima — bez pravog novca.”** Preserve longer adult/security explanations inside the parent area.
- Use icon plus text, never icon alone, for the five child destinations:
  - 🗺️ Pustolovina
  - 🐷 Moj novac
  - 🌻 Poslovi
  - 🎪 Trgovina
  - 🏡 Moja kuća
- Icons are decorative (`aria-hidden="true"`); accessible names remain the Croatian text.
- **320–700 px:** child nav is a two-column grid with 8 px gaps; the fifth item spans both columns. Do not exceed three rows. Adult entry sits in the header utility row, not this grid.
- **701–767 px:** allow a 3+2 child-nav grid if needed, with equal row heights.
- **≥768 px:** five equal-width child items in one row; adult entry is a separate compact header utility.
- Current state uses dark blue fill, white text, `aria-current="page"`, and a visible non-color cue (check mark or 3 px inset underline). Do not animate layout position.

### 6.3 Pustolovina: mission-first layout

#### Compact Luna introduction

- One card, not a separate tall landscape plus guide card.
- Phone: 72 px Luna illustration/emoji at left, heading **“Pustolovina sa šapicama”**, and at most two short lines: **“Luna ti pokazuje sljedeći korak. Nova pustolovina je spremna.”**
- Tablet/desktop: maximum height 152 px. The existing landscape may remain as a low-contrast card background, but it must not push the mission down.
- Decorative scenery stays `aria-hidden="true"`.

#### Active mission card

- Place directly after Luna.
- Header: eyebrow **“Misija 1 od 4”**, mission title, one-sentence story, and instruction.
- Question uses a `<fieldset>` and `<legend>` or an equivalent heading-associated group. Do not label it only with `aria-label`.
- Answer buttons:
  - one column through 699 px;
  - two equal columns at 700 px and above;
  - minimum 44 px high, 12 px internal vertical padding, left-aligned multi-line text;
  - no more than the existing two choices.
- Checklist follows the answers. Keep explicit **Gotovo / Još treba napraviti** text and icons.
- Primary CTA **Kreni na zadatak** is full width on phone and content width on larger screens.

#### Journey progress

- Replace the four story cards with an ordered compact stepper.
- Each step shows number/star, short mission title, and one of **Trenutačna / Dovršeno / Zaključano**.
- Locked steps omit their story. The active mission card is the only place for the current story and instruction.
- Phone: 2 × 2 grid; tablet/desktop: one row of four.
- Keep **“0 od 4 zvjezdice”** as text; stars are supplementary, not the only progress signal.

#### Optional learning sections

Use three `<details>` components, collapsed on first load:

1. **Vježbaj pravila** — contains the existing practice deck.
2. **Moje značke** — contains the badge shelf.
3. **Mala škola novca** — contains the existing glossary details.

Their `<summary>` targets are at least 44 px high, include a text label and CSS disclosure marker, and expose native `open` state. Opening one does not alter saved game/adventure state. Do not auto-open or auto-scroll them after a mission action.

### 6.4 Interaction and feedback states

#### Mission answer

| State | Visual and text behavior | Accessibility behavior |
|---|---|---|
| Default | Purple border, pale neutral surface | Button has Croatian accessible name |
| Hover/pointer | Slight darker surface; no movement required | No information only on hover |
| Keyboard focus | Existing 4 px purple outline or an equally visible replacement | `:focus-visible` |
| Wrong | Keep both choices enabled; selected choice gets coral border plus **“Pokušaj ponovno”** below the group | Local `role="status"`, polite, atomic; keep/restore focus on the selected equivalent button |
| Correct | Selected choice gets mint/dark-green border, check icon, and visible **“Točno”**; other choice becomes disabled | Local status announces explanation; selected button exposes selected/correct state through text or `aria-describedby`, not color |
| Completed mission | Show star/badge text beside the checklist; CTA changes to the next mission destination | Focus moves to a `tabindex="-1"` completion heading only after the triggering action |

Do not use a timer to remove learning feedback. Global and local live regions must not announce the same sentence twice.

#### Navigation and rerender focus

- After a child chooses a view, focus its `<h1 tabindex="-1">` or the main landmark; do not leave focus on a detached button.
- After wrong answers or form validation, keep/restore focus to the equivalent invalid/action control and associate the message with `aria-describedby`.
- After successful save/buy/chore actions, focus a local result heading/status near the changed balance/card unless the next explicit step is a mission completion heading.
- Preserve scroll position for local feedback. Only navigation may intentionally move to the new view heading.

#### Motion

- Retain gentle decorative motion only under `prefers-reduced-motion: no-preference`.
- Entrance animations must not delay hit testing or focus and must finish within 450 ms.
- Success animation may run once, not loop. Luna/decorative float may loop but must stop under reduced motion.
- Reduced-motion mode receives identical text, states, progress, badges, and focus movement without animation.

### 6.5 Supporting child views

#### Moj novac

- Order: current mission panel → three balance cards → **Kasica** actions → goal planner → activities → **Zajam u igri**.
- Separate savings and borrowing visually; do not present four amount forms as one undifferentiated block.
- Put borrowing/repayment in a clearly labeled panel with a short inline consequence preview after entering an amount:
  - **“Ako posudiš 10: Novčanik +10, Dug +10.”**
  - **“Ako vratiš 10: Novčanik −10, Dug −10.”**
- Preview is explanatory only and does not mutate state. Keep **“Zajam je samo dio igre”** visible in that panel.
- On phone, each form is one column and its primary action is full width.

#### Poslovi

- Order: current mission panel → chore list → optional **Izazov zarade** disclosure.
- On each chore card put the state directly under the name as a badge with both icon and text: **Za napraviti**, **Čeka potvrdu**, or **Potvrđeno**.
- When **Gotovo!** is accepted, replace it with a disabled **Čeka potvrdu roditelja** state and a local confirmation. Do not rely on the distant global banner.

#### Trgovina

- Add a compact, persistent-in-view wallet summary immediately below the heading: **“U novčaniku imaš: N zlatnika.”** It is a text value, not a sticky overlay.
- Keep category/affordability filters, but identify the results count after each change: **“Prikazano N ponuda.”** Announce this politely once.
- Card order stays illustration → name → price → reason → action.
- Unaffordable/owned buttons retain visible reasons and disabled semantics. Use **“Treba ti još N zlatnika”** when the arithmetic is available; never imply using savings or a real loan automatically.

#### Moja kuća

- Keep select-based placement; it is more age-appropriate and accessible than precision dragging.
- Introduce a two-step instruction above unplaced purchases: **“1. Odaberi mjesto. 2. Odaberi Postavi.”**
- Keep area name and item/pet name visible together. After placement, show local text **“Postavljeno u: [područje].”**
- On phone all select/action groups are one column. On tablet/desktop keep the existing house composition only if labels and controls do not clip.

#### Kutak za roditelje

- Move only its entry point out of child primary navigation; do not weaken access controls.
- Retain the existing heading **Kutak za roditelje**, lock states, fail-closed content, local-device notice, and destructive reset warning.
- Give the adult view a calmer version of the existing purple treatment. Do not carry child success confetti into PIN errors or administrative actions.
- No parent grant/approve/return control may render while unprovisioned, locked, unavailable, or relocked.

### 6.6 Visual system

Reuse and normalize the current system instead of adding a new brand:

- **Text:** `#24324a`; large headings `#173f7a`.
- **Primary action/current:** `#173f7a` with white text.
- **Learning/answer accent:** existing purple family, but use dark `#352568` for filled surfaces.
- **Success:** mint surface with dark green text/border.
- **Try again/error:** pale coral surface with dark red/brown text.
- **Decorative accents:** yellow, sky, coral, pink, mint, and purple; never use pink as a requirement for the girls audience.
- **Spacing scale:** 4, 8, 12, 16, 24, 32 px.
- **Corner radii:** 12 px controls, 20 px cards, 24 px hero/mission surfaces.
- **Shadows:** one existing low-elevation card shadow; avoid stacking multiple heavy shadows.
- **Measure:** explanatory text maximum 62 characters per line on desktop; form/help text maximum 52 characters per line where practical.
- **Type:** body 17 px (16 px only at ≤360 as currently), labels/buttons at least 16 px, h1 responsive 30–43 px, h2 24–32 px. Do not use all caps for instructions.

## 7. Responsive rules

| Width | Required layout |
|---:|---|
| 320–360 | 8 px outer minimum gutter; two-column child nav with fifth item spanning both; single-column mission answers/forms/cards; progress 2 × 2; adult utility outside child nav. No horizontal scroll. |
| 361–700 | 12–16 px gutter; same information order; answer/form groups remain one column; card grids may use two columns only when each card remains ≥160 px. |
| 701–767 | 16 px gutter; child nav may use 3+2 layout; mission answers two columns; optional content remains collapsed. |
| 768–1199 | 16–24 px gutter; five child nav items in one row; mission card uses a maximum 760 px readable inner measure; progress one row. |
| ≥1200 | Existing 1180 px content maximum; header/nav align to it; do not stretch paragraphs or answer copy across the full width. |

At every width, no fixed-position element may cover content, no control/text pair may overlap, and `document.documentElement.scrollWidth` must equal the viewport width after finite animations settle.

## 8. Accessibility requirements

- Retain `lang="hr"`, skip link, semantic landmarks, and visible `:focus-visible` styling.
- Every enabled interactive target is at least 44 × 44 CSS px after animations settle.
- Text contrast: at least 4.5:1 for normal text and 3:1 for large text; component boundaries/focus indicators at least 3:1 against adjacent colors. Validate final computed colors rather than assuming token names pass.
- Do not use color, emoji, stars, or animation as the only state indicator.
- Decorative emoji/scenery are hidden from assistive technology; informative catalog emoji keep natural Croatian accessible labels.
- Dynamic feedback is local, concise, Croatian, `aria-live="polite"` by default, and not duplicated in multiple live regions. Security/unavailable failures may remain `role="alert"`.
- Collapsed optional sections use native `<details>/<summary>` or an equivalent button with accurate `aria-expanded` and `aria-controls`.
- Disabled controls have a visible text reason. Do not use opacity below the point where label/reason contrast fails.
- Keyboard order follows visual order; no positive `tabindex`; Escape is not required because this design adds no modal.
- Zoom/reflow at 200% must not cause two-dimensional scrolling at a 320 CSS px layout.
- No claim of WCAG conformance is made until implementation is independently audited.

## 9. Likely implementation locations

Application source remains read-only for this assignment. A developer will likely change:

- `src/main.ts`
  - `views` and root header/nav rendering for child versus adult information architecture;
  - `renderAdventure`, `renderPractice`, `currentMissionPanel` for mission-first order and disclosures;
  - action/submit handlers and `render()` for focus restoration/local feedback;
  - `renderMoney`, `renderChores`, `renderShop`, `renderHouse` for the supporting-view rules.
- `src/content/hr.ts`
  - exact Croatian compact header, progress, preview, result-count, local confirmation, and state copy.
- `src/styles.css`
  - compact navigation, mission layout, stepper, disclosures, state styles, responsive grid, and motion rules.
- `src/app.test.ts`
  - semantics, focus restoration, collapsed-state, Croatian-copy, and integrated-flow regression tests.

Do not change `src/game/*` rules or any persistence schema for this visual/interaction redesign unless a separately approved product change requires it.

## 10. Developer acceptance criteria

Independent validation should treat each item as pass/fail.

### Fresh adventure and hierarchy

1. At 320 × 800, 768 × 900, and 1440 × 900, the active mission appears before journey progress, practice, badges, and school in DOM and visual order.
2. At 320 px, the top edge of the first active-mission answer is at or above y=900 after finite animations settle; at 768 and 1440 it is at or above y=900. Baseline evidence was approximately 2530, 1822, and 1554 respectively.
3. At 320 px, five child navigation controls occupy no more than three rows, and **Kutak za roditelje** is outside that primary child navigation.
4. Fresh practice, badges, and school groups are collapsed, keyboard reachable, and opening them does not change any of the three localStorage records.
5. The compact progress component exposes four ordered steps, short titles, and textual states; locked step stories are not rendered in the overview.

### Interaction and feedback

6. Wrong mission answers remain retryable and show a local Croatian try-again message adjacent to the answer group; focus remains on the equivalent selected answer.
7. A correct mission answer visibly identifies the selected correct choice with text/icon plus style, associates its explanation programmatically, and focuses the next meaningful checklist/completion target without leaving focus on a detached node.
8. View navigation focuses the destination h1/main landmark. Save, buy, chore, house, validation, and mission results are visible adjacent to their controls and are announced once.
9. Normal-motion and reduced-motion modes expose identical task, progress, result, and badge information; reduced motion has no keyframe or nonessential transform transition.
10. No feedback, disabled, selected, current, locked, affordable, or completed state relies on color or animation alone.

### Supporting views

11. The shop shows the current wallet amount without navigating away and updates it immediately after a purchase.
12. Borrow/repay amount entry shows a non-mutating wallet/debt consequence preview before submission; submitting remains governed by existing rules and fictional-money copy.
13. Chore pending state replaces the actionable completion control with a visible **Čeka potvrdu roditelja** state and local confirmation.
14. House placement remains usable without drag-and-drop and reports the destination area locally after success.
15. Locked, unprovisioned, unavailable, relocked, and reloaded parent states contain no grant, approval, or return controls.

### Responsive, language, and accessibility

16. At 320, 768, and 1440 CSS px, every inspected state has `scrollWidth === innerWidth`, no clipped text/control, no overlapping enabled controls, and all enabled controls are at least 44 × 44 px after animation settles.
17. Keyboard-only traversal reaches every visible action in visual order with a clearly visible focus indicator; the skip link still moves to the main content.
18. Final computed colors meet the contrast thresholds in section 8, including disabled labels, state text, focus indicators, and text over gradients.
19. Every new visible string, accessible name/description, validation string, and live announcement is natural Croatian; internal codes and English fallbacks never render.
20. The shortened header still explicitly says the money is fictional and no real money is used.
21. Existing game, adventure, and parent records remain byte-for-byte compatible; reload retains game/adventure progress and relocks parent access as before.
22. `npm test`, `npm run check`, and `npm run build` pass. Updated tests cover the changed DOM/state/focus contracts; fresh Chrome screenshots are recorded at the three required widths. Safari/Firefox or screen-reader claims require separate execution evidence.

## 11. Open decisions and unexamined scope

- **Open product decision, non-blocking:** no custom illustration/brand reference was supplied. Default to existing emoji and CSS scenery; do not source external art.
- **Open product decision, non-blocking:** no child playtest success threshold exists. A later moderated test could measure whether a child finds the current mission without prompting, but this specification does not claim that outcome.
- Post-action screens, parent unlock, populated house, filtered/empty shop, and all money/chores flows were not live-inspected because the guarded browser would not activate generic buttons or forms. They are source-grounded proposals and require implementation-time visual validation.
- No Safari, Firefox, Edge, screen reader, forced-colors, high zoom, or cross-browser inspection was performed.
