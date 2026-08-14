# Children’s AI-workflow MVP manual playthrough

## Purpose and pass rule

Use this check on the local one-page MVP after `npm test` passes. A pass requires every expected observation below. Record the date, browser and version, viewport or device size, keyboard result, and any failed step. Do not enter personal information: the game has fixed buttons and does not need it.

## Local setup

1. From the repository root, use Node.js 20 or newer.
2. Run `npm test`. Expect five passing workflow-loop tests and no failures.
3. Run `npm start`. Expect the terminal to show `Garden Workflow Game: http://127.0.0.1:4173`.
4. Open `http://127.0.0.1:4173` in a supported browser. Keep the browser developer tools Network panel open and reload once.
5. Expect one page titled **Garden Workflow Game**. Confirm the document, `src/styles.css`, and `src/app.js` load successfully from `127.0.0.1:4173`, with no request to an external origin. A browser-generated request for an unspecified icon is not an app dependency; record it separately if the browser makes one. Stop the local server with Control-C after the check.

Repeat the keyboard and reflow sections in the latest two stable major versions of Chrome, Edge, Firefox, and Safari when those versions are available. Record any browser version that was not available rather than marking it passed.

## Keyboard-only primary playthrough

Do not use a pointer during this section.

1. Reload the page, press Tab, and continue pressing Tab through the controls.
   - Expect focus to move in reading order through **Add as next job** for Seed Helper, Garden Helper, and Check Helper, then the enabled plan actions and **Check my work**.
   - Expect the focused button to have a thick, high-contrast outline that is not hidden by a card edge.
   - **Undo last** and **Reset plan** begin disabled and are skipped by normal browser keyboard navigation. After a helper is added, those two actions become reachable in their reading order, while the added helper’s disabled button reads **Added to the plan** and is skipped.
2. Focus Seed Helper’s **Add as next job** button and press Enter. Focus Garden Helper’s button and press Space. Focus Check Helper’s button and press Enter.
   - Expect each native button to work with its standard Enter or Space key.
   - Expect progress to change from 0 to 3 helper jobs and the ordered list to show Seed Helper, Garden Helper, then Check Helper.
3. Focus **Check my work** and press Enter.
   - Expect positive status text beginning **You did it!**.
   - Expect a new ordered story with the visible text headings **Work**, **Handoff**, **Check**, and **Result**.
   - Expect Handoff to explain that one helper gives finished work to the next helper, Check to say the plan was checked, and Result to say the garden plan is ready.

## Retry-state playthrough

Reload before each case so observations do not depend on an earlier case.

| Case | Steps | Expected observation |
| --- | --- | --- |
| Empty/incomplete | Activate **Check my work** twice. | Both checks say the plan needs 3 more helpers. Neither succeeds or disables play. |
| Partly complete | Add Seed Helper, then check twice. | Both checks say the plan needs 2 more helpers. The child can still add the other helpers. |
| Repeated helper | Add Seed Helper, then inspect its card and continue. | Its add button is disabled and says **Added to the plan**, so it cannot be duplicated. The other helpers remain available. |
| Incorrect order | Add Garden Helper, Seed Helper, then Check Helper; check twice. | Both checks give the same calm guidance that a helper needs earlier work and invite another order. No score, shame, timer, or lockout appears. |
| Recover from retry | After the incorrect case, use **Undo last** and **Reset plan**. Add Seed Helper, Garden Helper, Check Helper; then check. | Undo removes the last helper, reset clears the order, and the correct retry reaches the Work → Handoff → Check → Result story. |

For every case, expect the nearby status message to update in the existing `role="status"` polite live region. With a screen reader available, confirm the changed message is announced once without moving focus. Record the screen reader and version used, or record that this optional assistive-technology observation was not available; DOM inspection must still confirm the status role and `aria-live="polite"`.

## Presentation and accessibility checks

### Structure, controls, and meaning

- Inspect the accessibility tree or page structure. Expect one header, one main landmark, one footer, a single level-one heading, logical level-two and level-three headings, named sections, native buttons, an ordered workflow list, and a labeled progress element.
- Expect every action to be available by native button; there is no drag-only action.
- Expect each available button’s computed target box to be at least 44 by 44 CSS pixels.
- Expect instructions and button labels to state what to add, undo, reset, or check. State meaning is always written in text; color is decoration, not the only signal.
- Expect no sound, autoplay, motion, flashing, or timer.

### Contrast and visible focus

Inspect computed colors or use a contrast checker. Normal text must be at least 4.5:1 against its background. The selected core pairs are:

| Use | Foreground | Background | Expected ratio |
| --- | --- | --- | ---: |
| Main text | `#17351f` | `#f7fbf4` | at least 12:1 |
| Main text on cards | `#17351f` | `#ffffff` | at least 12:1 |
| Primary button text | `#ffffff` | `#1f603d` | at least 7:1 |
| Disabled button text | `#505a53` | `#edf0ed` | at least 6:1 |

Tab through every enabled control on both narrow and wide layouts. Expect the visible `#9a3f00` four-pixel focus outline with a three-pixel offset. Do not pass based on the table alone: verify the browser’s computed styles and record the contrast tool/result.

### 320 CSS-pixel reflow and zoom

1. Set the viewport to 320 CSS pixels wide at 100% zoom. Reload and complete the correct sequence.
2. Expect a single readable column, wrapped text, reachable controls, and no horizontal page scrolling, clipping, overlap, or missing content.
3. At a wider desktop viewport, zoom to 200% and repeat the keyboard path.
4. Expect text and controls to reflow without loss of content or function. Record the viewport, zoom, and result.

## Child-facing content check

### Target age and reading level

The selected audience is ages 8–10, with copy aimed roughly at US grade 3; this is a manual target, not a formal reading certification.

- Read every child-visible sentence aloud. Expect short, concrete English, one main instruction per sentence, familiar garden examples, and no unexplained technical workflow language.
- Expect one mission only, no timer, and a self-paced play length of about 5–10 minutes.
- Flag any sentence that needs specialist knowledge or combines multiple hard instructions.

### Approved vocabulary

Expect the visible learning words **Goal**, **Helper**, **Job**, **Handoff**, **Check**, and **Result**. Confirm that **Handoff** is immediately explained as one helper giving finished work to the next helper. Expect no internal product, agent, graph, or orchestration terminology and no outside source names or assets.

### Learning-objective observations

After the successful playthrough, use the visible page to answer each prompt:

1. **Goal:** Can the child point to “Make a plan for a class garden” as the goal?
2. **Specialized work:** Can the child identify that Seed, Garden, and Check Helpers have different jobs?
3. **Dependency and handoff:** Can the child show that the plant list must be made before it is used, and explain that the finished list moves to the next helper?
4. **Validation and result:** Can the child identify that the Check Helper checks the plan before the ready result appears?

Pass when the page supplies clear visible evidence for all four prompts. This is a content observation, not a request to collect or save a child’s name, voice, answers, or other data.

## Privacy and local-boundary check

- Expect no login, account, name field, free text, chat, upload, cookie, saved progress, analytics, advertising, remote font, live AI call, or external request.
- In browser storage tools, expect no cookies, local storage, or session storage created by the app.
- Reload after a successful run. Expect a fresh empty workflow, showing that attempts are not persisted.
- Expect all child-visible text, styles, and behavior to come from the three local files listed in setup; no outside service, source, name, or asset is needed.
