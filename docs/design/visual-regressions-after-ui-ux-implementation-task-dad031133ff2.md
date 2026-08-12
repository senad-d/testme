# Visual-regression report — current UI versus the pre-redesign UI

**Assessment:** `task-dad031133ff2`  
**Author:** dranosh-ui-ux-designer  
**Scope:** Fresh, credential-free **Pustolovina** only. Application source was not changed.

## Evidence and comparison boundary

The direct pre-redesign screenshots are represented by the three evidence hashes and geometry recorded in `docs/design/review-the-current-application-ui-and-ux-and-pro-task-28cfed35ce5d-ui-ux.md` (E1–E3). The raw prior PNGs are not available in this workspace, so this is not a pixel-overlay comparison. The prior report does establish the former hierarchy: decorative/scenic introduction, guide, progress, and story cards preceded the mission; the parent entry was one of the primary navigation choices; and the first mission answer was far below the fold.

I inspected the current Vite UI in an isolated, clean Chrome profile at `http://127.0.0.1:4173/` after finite entrance animation settling.

| Current ref | Viewport / state | Screenshot SHA-256 |
|---|---|---|
| C1 | 320 × 800 / fresh Pustolovina | `ccf2bfe6a1b66b6ffc3aae41d5ed5fcd81225528774b1a4c2e4e3c715c122d98` |
| C2 | 768 × 900 / fresh Pustolovina | `15bfdfb66f85931b7850b9fa2c8b66e4669fab4dac87f15cc85d94f0d74cd270` |
| C3 | 1440 × 900 / fresh Pustolovina | `6b76c7276c43e8c5e2873dbbd5362896bed71cfeb8b6ba08b351090a327716d7` |

Reproduction: `npm run dev`, open the URL in a clean profile, then set the listed CSS-pixel viewport. Generic navigation buttons could not be activated by the guarded browser, so other views and below-the-fold disclosure presentation are source-inspected rather than claimed as live screenshots. Chrome console contained one Vite-session `404` resource error; no visible regression is attributed to it.

## What improved and should not be reverted

The central mission is now materially earlier than in the pre-redesign evidence: the first answer top is **890.53 px at 320**, **763.39 px at 768**, and **670.80 px at 1440**, compared with the historical approximate **2530**, **1822**, and **1554 px**. The five child controls are also within three rows at 320. Preserve that mission-first information order; the issues below are presentation regressions in its implementation, not a reason to restore the former long adventure opening.

## Regressions

### VR-1 — The parent utility is visually detached from its navigation shell

**Severity: high**

- **Context:** fresh Pustolovina at 320, 768, and 1440 (C1–C3).
- **Observation:** The five child controls are inside the white `.app-navigation` bar, but **Kutak za roditelje** renders as a separate right-aligned row beneath it. At 1440 it is stranded at x=1237.75, y=204.31 while the child row occupies x=130–1298.94, y=145.08–193.27; at 768 it forms a second row at y=301.39–349.58; at 320 it appears below the full-width fifth child control at y=400.67–446.27. The result is a thick, mostly empty white band with a lone control at its far edge.
- **Comparison/impact:** The former parent control had the wrong information weight (it was in the child navigation), but it was geometrically part of that navigation. The current intended separation reads as an accidental layout break rather than an intentional adult utility, adding top-of-page height and weakening scanability.
- **Source cause:** `src/main.ts` renders `</div>${parentUtility}` after `.app-navigation`, while the ≥768 grid rule in `src/styles.css` expects the utility to participate in that shell.
- **Recommended visual correction:** Keep the parent entry outside the child `<nav>`, but place it in a deliberate header utility region (or inside a shared utility container) with the same 1180 px alignment as the header. At tablet widths, use a defined second utility row spanning/aligned to the content rather than a floating right-only button. Do not put it back into the child navigation.
- **Acceptance check:** At 320, 768, and 1440, the parent utility has a visibly bounded utility region; it does not create a blank intermediary bar or appear as an unanchored control. The five child controls remain the only items in the child nav.

### VR-2 — The compact Luna card is cramped at small widths and conspicuously empty at desktop

**Severity: high**

- **Context:** fresh Pustolovina at 320, 768, and 1440 (C1–C3).
- **Observation:** At 320, **Pustolovina sa šapicama** wraps to two lines beside the fixed 72 px Luna emoji; the two orientation lines are packed directly beneath it. At 768 and 1440, the same card expands almost the full content width but retains only the 72 px emoji and two short lines, leaving a large blank white expanse. In C2/C3, the orange `h1` underline is immediately adjacent to the bold first orientation line, producing a crowded, almost-colliding text stack.
- **Comparison/impact:** The prior scenic/guide opening had too much vertical weight, but it supplied a coherent adventure scene. The current replacement loses that visual payoff while looking mechanically compressed on phone and unfinished on wider screens. This is a visual-identity regression, not a request to restore the old tall hero.
- **Source cause:** `renderAdventure` uses a full-width `.guide-card` with inline `grid-template-columns:72px minmax(0,1fr)`, zero paragraph margins, and a reduced inline heading size. The global `h1` underline remains active (`src/styles.css`).
- **Recommended visual correction:** Constrain the intro to the mission measure (maximum 760 px) or deliberately give it an illustrated low-contrast background. Add 4–8 px space after the heading and remove/replace the global underline in this compact intro only. At ≤360, allow the text to occupy its own row below Luna if its two-line heading plus copy cannot fit cleanly.
- **Acceptance check:** At 320, no heading, underline, or orientation line visually touches another line; at ≥768, the card has no large purposeless blank field and aligns with the 760 px mission measure or contains intentional decorative background.

### VR-3 — The 768 px navigation breakpoint breaks the active label into a mismatched two-line control

**Severity: medium**

- **Context:** 768 × 900 fresh Pustolovina (C2).
- **Observation:** All five child controls switch to five columns at exactly 768 px. Each is only about 139 px wide and 73.69 px high; the active **🗺️ Pustolovina** breaks with the icon above the label while the other labels remain one line. The result is a lopsided first nav item and a much taller navigation row immediately before the detached parent row.
- **Impact:** This boundary is a common tablet width. The navigation looks less polished than both the 320 two-column layout and the 1440 one-line layout, and the extra height pushes mission content lower.
- **Source cause:** `@media (min-width: 768px)` forces `repeat(5, minmax(0,1fr))`; the 701–767 three-column layout ends one pixel earlier. There is no intermediate treatment for the actual Croatian labels.
- **Recommended visual correction:** Keep the 3+2 layout through the width at which all five labels fit one line, or retain the five columns but reduce the nav label/icon layout intentionally (for example, fixed icon/text inline and a tested minimum item width). Do not rely on accidental wrapping.
- **Acceptance check:** At 768, each nav item has a consistent text/icon arrangement and row height; **Pustolovina** does not isolate its emoji on a different line.

### VR-4 — The journey "stepper" has regressed to a permanent one-column stack

**Severity: medium (source-confirmed; not live-scrolled)**

- **Context:** fresh Pustolovina after the mission card, all widths.
- **Observation:** The current markup sets `style="display:grid;grid-template-columns:1fr"` directly on `.journey-overview-list`. No CSS rule targets that new class. The only responsive stepper rules target the obsolete `.journey-path` selector. Therefore the four stops are vertically stacked at 320, 768, and 1440 instead of 2×2 on phone and a four-step row on tablet/desktop.
- **Comparison/impact:** This does remove the old long story-card sequence from ahead of the task, which is good. However, it fails to deliver the intended compact visual progress model and reintroduces unnecessary vertical rhythm below the mission. C1–C3 DOM snapshots confirm all four stops are present, with current/locked textual states.
- **Source evidence:** `src/main.ts`, `renderAdventure` (`journey-overview-list` inline grid); `src/styles.css` (`.journey-path` and `@media (max-width:800px) .journey-path` only).
- **Recommended visual correction:** Move journey layout out of inline styles, style `.journey-overview-list` directly, use two columns through 767 px, and four equal columns from 768 px. Keep story text out of locked stops and preserve textual state labels.
- **Acceptance check:** At 320 the four steps form a 2×2 grid; at 768 and 1440 they form one four-step row, with no horizontal overflow and no story text in locked steps.

### VR-5 — The new optional-disclosure entry points lack the card-system finish of the surrounding UI

**Severity: low (source-confirmed; below-the-fold presentation not live-scrolled)**

- **Context:** fresh Pustolovina, after progress.
- **Observation:** The three new `<details class="adventure-disclosure">` groups receive only inline summary height/flex/weight. There is no `.adventure-disclosure` rule in `src/styles.css`; they inherit browser-default details presentation rather than the existing panel/card border, surface, radius, and spacing system. Their content may be correctly collapsed, but their closed controls will visually read as bare text rows after heavily styled mission and progress surfaces.
- **Impact:** The abrupt style change makes the redesigned lower page feel partially implemented and removes the clear grouping that the former expanded sections supplied.
- **Recommended visual correction:** Give closed disclosures a single low-elevation panel treatment using existing card radius, border, surface, and spacing tokens; retain native details marker/state. When open, apply the same inset content spacing to all three.
- **Acceptance check:** Closed and open disclosure controls are visibly grouped with the adventure page, have a 44 px minimum summary target, and preserve native `open` state without introducing a custom icon-only control.

## Residual issue worth resolving, but not a before/after regression

At C1 (320 × 800), the first answer begins at y=890.53: it meets the earlier implementation threshold (≤900) but is still just outside the initial 800 px viewport, and the first explicit action CTA is at y=1355.94. This is substantially better than the former y≈2530 answer position, so it should not be used to justify reverting the hierarchy. If the product expects the question itself to be visible without a scroll on a 320 × 800 phone, reduce header/utility/intro height only after VR-1 through VR-3 are corrected.

## Bounded implementation surfaces

- `src/main.ts`: move the parent utility into a deliberate shared shell; revise the compact Luna markup; remove journey inline layout; retain child nav semantics and all game behavior.
- `src/styles.css`: add the utility-shell, compact-intro, responsive journey, and disclosure styles; revise the 768 px navigation breakpoint.

No behavioral, persistence, security, copy, catalog, or game-rule changes are needed for these visual corrections.

## Unexamined scope

The guarded browser could not activate generic navigation/actions, so I did not live-inspect money, chores, shop, house, parent unlock, post-action feedback, populated house, or filtered/empty shop visual states. No cross-browser, screen-reader, high-zoom, or forced-colors claim is made.
