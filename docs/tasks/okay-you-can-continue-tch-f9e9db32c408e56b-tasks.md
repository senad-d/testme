### 1. Record MVP decisions, requirements traceability, and the delivery-history limitation

- [x] Create a decision record that resolves or explicitly defers the MVP choices required by Issue #26 and maps the accepted scope to `R1`–`R5`.

#### Why
Issue #26 requires product, safety, accessibility, platform, and technical decisions before implementation; the repository has no application stack or game behavior to extend. `AGENTS.md` now supplies suitable product guidance, but Issue #26 and its issue-linked branch were created before that update, so the historical AGENTS-first ordering requirement was not met and must not be represented as satisfied.

#### How
Depends on: none. In `docs/design/children-ai-workflow-mvp-decisions.md`, cite Issue #26 and establish a ledger: `R1` is the now-satisfied `AGENTS.md` content prerequisite plus the disclosed historical ordering deviation; `R2` is the observable learning loop; `R3` is local, safe interaction; `R4` is issue-linked delivery evidence; and `R5` is automated, manual, and independent validation. Record an outcome, owner-needed blocker, or approved deferral for target age/reading level, learning objectives and vocabulary, session length, solo/collaborative mode, mission/content volume, success/failure and incomplete/repeated-retry behavior, visual/accessibility requirements, device/browser/localization support, sound/animation, privacy jurisdiction/data handling, static/offline-first status, architecture, test tooling, hosting, and merge/release authority. Recommend—but do not silently select—the static local HTML/CSS/JavaScript architecture. Tasks 2–3 may use their stated paths only if this record selects that architecture; another selection requires a revised implementation plan. Preserve the conceptual-only OrcMe boundary: no OrcMe source, assets, names, or other material may be reused without explicit permission.

#### Where
`docs/design/children-ai-workflow-mvp-decisions.md`

#### Acceptance criteria
- The record identifies Issue #26 and maps every requirement and acceptance check to `R1`–`R5`.
- Every decision listed in Issue #26’s “Decisions/questions required before implementation planning” section has an outcome, owner-needed blocker, or approved deferral.
- `R1` accurately distinguishes the satisfactory current `AGENTS.md` content from the irreversible issue/branch-before-AGENTS ordering deviation; it does not claim full AGENTS-first compliance.
- The record excludes unapproved live model calls, accounts, free-text/chat input, saved progress, analytics, personal-data collection, teacher/parent features, deployment, and external network integrations.
- The record states whether Tasks 2–3’s static local architecture and exact paths are selected; any different selection requires a revised implementation plan.

### 2. Build the local playable workflow-loop MVP with stable presentation and test seams

- [x] Implement the approved static local MVP so one child can complete one mission by ordering understandable helpers and see goal, work, handoff, and validation feedback.

#### Why
This task implements `R2` and `R3` from Task 1 and the core end-to-end loop required by Issue #26: a child selects or receives a mission, sequences or assigns helpers, sees progress plus a handoff/checkpoint, and receives clear success feedback tied to the chosen workflow.

#### How
Depends on: Task 1. Proceed only if Task 1 selects the static local HTML/CSS/JavaScript architecture and records the mission, helper, sequencing, success/failure, retry, child-vocabulary, and accessible-interaction rules needed here; otherwise stop and obtain a revised plan. Create the smallest dependency set needed to run the selected local app and its selected test command. Link `src/styles.css` from `index.html`, and establish stable DOM selectors and an importable module or equivalent deterministic test seam in `src/app.js` plus the selected package test configuration so Task 3 can test the loop without editing these files. Make the four concepts visibly child-facing using product-specific, approved terminology rather than OrcMe names or internals. Keep all interaction deterministic and in-browser: no network requests, accounts, persistence, free-text/chat, analytics, or collection of personal data. Represent incorrect ordering and incomplete/repeated attempts using the approved retry feedback, and a correct ordering with visible progress, a handoff/checkpoint, validation, and success.

#### Where
`package.json`
`index.html`
`src/app.js`

#### Acceptance criteria
- The selected local start command renders a playable single-mission loop without a backend or external network dependency.
- A child can select or receive the approved mission, order or assign the approved helper steps, and observe a distinct handoff/checkpoint before validation.
- Correct, incorrect, incomplete, and repeated workflow choices produce the approved clear success or retry feedback.
- `index.html` loads `src/styles.css`, and the selected test configuration plus stable DOM/module seam permits Task 3 to test the loop without modifying Task 2 files.
- The rendered experience makes goal, specialized work, dependency/handoff, and validation/result observable at the recorded target reading level without referring to OrcMe agent names or internals.
- The implementation follows the privacy and interaction limits recorded in Task 1.

### 3. Add accessible presentation and repeatable child-facing MVP checks

- [x] Add the approved child-facing styling, automated workflow-loop test, and manual playthrough/accessibility check for the local MVP.

#### Why
Issue #26 requires automated tests appropriate to the selected stack and a documented manual check of the child-visible game loop and accessible interaction behavior (`R5`). This task makes Task 2’s observable loop independently testable while applying the visual, accessibility, and child-learning decisions from Task 1.

#### How
Depends on: Tasks 1, 2. Implement only the styling and interaction affordances selected in Task 1, including keyboard operation and the approved readable visual treatment; do not add sound, animation, localization, or device support that the record does not select. Use Task 2’s stable test seam and configured test command to add deterministic coverage of the approved correct path, incorrect/retry path, incomplete/repeated-retry behavior, handoff/checkpoint visibility, and validation/success state. Document a manual local playthrough that verifies the same states, keyboard behavior, selected accessibility checks, target age/reading-level vocabulary, and learning-objective mapping. The check must not require personal data, external services, or OrcMe materials.

#### Where
`src/styles.css`
`tests/game-loop.test.js`
`docs/validation/children-ai-workflow-mvp-playthrough.md`

#### Acceptance criteria
- The local MVP has the approved accessible visual presentation and can complete the selected primary interaction using the documented keyboard behavior.
- The selected automated test command passes and covers correct, incorrect, incomplete, and repeated-retry workflow sequences plus handoff and validation/success states.
- The manual check document gives reproducible local steps, expected observations, and the selected accessibility, target-age/reading-level, vocabulary, and learning-objective checks for the child-visible loop.
- No styling, test, or manual check introduces an unapproved external service, personal-data flow, or OrcMe source, asset, or name reuse.

### 4. Gate delivery on independently passing validation and record accurate Issue #26 evidence

- [ ] Obtain independent review and testing of the exact completed MVP content, remediate any failed gate, and record only passing delivery evidence for Issue #26.

#### Why
`R4` requires normal issue-based delivery evidence, while `R5` requires independent review and test results. A completion PR must not proceed on stale, failing, or blocker-bearing validation, and the receipt must truthfully preserve the known historical issue/branch-before-AGENTS sequencing deviation without creating a duplicate issue to conceal it.

#### How
Depends on: Tasks 1, 2, 3. Before any additional tracker mutation, reconfirm that Issue #26 remains the applicable accepted scope and that open issues #1 and #6 are not duplicates; do not create a duplicate issue. Create an immutable implementation receipt identifying the exact commit/content submitted for independent review and independent test execution. Require a review pass with zero blockers and an independent test pass, including Task 3’s automated command and manual playthrough, both bound to that same receipt. If either gate fails, stop delivery: perform only the bounded remediation required by the finding, create a new exact-content receipt, and repeat every affected validation; do not open a completion PR or use `Closes #26` until all gates pass for the final receipt. Once passed, record the issue URL, issue-linked branch, final commit/push receipt, exact test command/result, review result, pull-request URL, the reconciliation result, and the historical chronology limitation. Do not merge, deploy, publish, or release without separately documented authority.

#### Where
`docs/validation/children-ai-workflow-mvp-delivery-receipt.md`

#### Acceptance criteria
- The receipt links the completed work to Issue #26, the issue-linked branch, final commit/push evidence, a zero-blocker independent review pass, an independent test pass, and a pull request.
- Review and test evidence each identify the same exact final implementation receipt or commit as the delivered content.
- The receipt records the automated command from Task 3 and the manual playthrough result, both passing for the final delivered content.
- Failed review or test evidence is not treated as delivery completion: the receipt records the stop, bounded remediation, and affected revalidation before a completion PR or `Closes #26` is used.
- The receipt records a fresh non-duplicate reconciliation of open issues #1 and #6 before any tracker change, or records why no tracker change was needed.
- The receipt discloses that Issue #26 and its branch predated the `AGENTS.md` update, makes no claim that full AGENTS-first ordering was met, and makes no unsupported claim that work was merged, deployed, published, or released.
