### 1. Record the approved MVP decisions and traceability ledger

- [ ] Create a decision record that resolves the MVP choices needed to implement Issue #26 and maps its requirements to `R1`–`R5`.

#### Why
Issue #26 and its specification require product, privacy, accessibility, platform, and technical decisions before implementation; the repository has no existing application stack or game behavior to extend. `R1` is the already-completed AGENTS-first prerequisite; `R2` is the observable learning loop; `R3` is local, safe interaction; `R4` is issue-linked delivery evidence; and `R5` is automated and manual validation.

#### How
Depends on: none. In `docs/design/children-ai-workflow-mvp-decisions.md`, record the decision owner and outcome for target age/reading level, learning objectives, session length, solo/collaborative mode, missions/content volume, success/failure rules, accessibility and visual requirements, supported devices/browsers/localization, sound/animation, privacy jurisdiction and data handling, static/offline-first status, architecture, test tooling, hosting, and merge/release authority. Cite Issue #26 and map each selected requirement and acceptance check to `R1`–`R5`; explicitly mark any decision that remains unresolved as a blocker rather than assuming it. Document the proposed static, local HTML/CSS/JavaScript MVP as a recommendation only; it may be used by Tasks 2–3 only when the decision record selects it. Preserve the conceptual-only OrcMe boundary: no OrcMe source, assets, names, or other material may be reused without explicit permission.

#### Where
`docs/design/children-ai-workflow-mvp-decisions.md`

#### Acceptance criteria
- The record identifies Issue #26 and contains a traceability ledger for `R1`–`R5`.
- Every decision named in Issue #26’s “Decisions/questions required before implementation planning” section has a documented outcome, owner-needed blocker, or approved deferral.
- The selected MVP excludes unapproved live model calls, accounts, free-text/chat input, saved progress, analytics, personal-data collection, teacher/parent features, deployment, and external network integrations.
- The record states whether Tasks 2–3’s static local architecture and their exact paths are selected; a different selection requires a revised implementation plan rather than an unrecorded substitution.

### 2. Build the local playable workflow-loop MVP

- [ ] Implement the approved static local MVP so one child can complete one mission by ordering understandable helpers and see goal, work, handoff, and validation feedback.

#### Why
This task implements `R2` and `R3` from Task 1 and the core end-to-end loop required by Issue #26: a child selects or receives a mission, sequences or assigns helpers, sees progress plus a handoff/checkpoint, and receives clear success feedback tied to the chosen workflow.

#### How
Depends on: Task 1. Proceed only if Task 1 selects the static local HTML/CSS/JavaScript architecture and the exact mission, helper, sequencing, success/failure, and accessible-interaction rules needed here; otherwise stop and obtain a revised plan. Create the smallest dependency set needed to run the selected local app and its selected test command. Make the four concepts visibly child-facing using product-specific, approved terminology rather than OrcMe names or internals. Keep all interaction deterministic and in-browser: no network requests, accounts, persistence, free-text/chat, analytics, or collection of personal data. Represent an incorrect ordering with the approved retry/failure feedback and a correct ordering with visible progress, a handoff/checkpoint, validation, and success.

#### Where
`package.json`
`index.html`
`src/app.js`

#### Acceptance criteria
- The selected local start command renders a playable single-mission loop without a backend or external network dependency.
- A child can select or receive the approved mission, order or assign the approved helper steps, and observe a distinct handoff/checkpoint before validation.
- Correct and incorrect workflow choices produce the approved, clear success and retry/failure feedback.
- The rendered experience makes the goal, specialized work, dependency/handoff, and validation/result concepts observable without referring to OrcMe agent names or internals.
- The implementation follows the approved privacy and interaction limits recorded in Task 1.

### 3. Add accessible presentation and repeatable MVP checks

- [ ] Add the approved child-facing styling, an automated workflow-loop test, and a manual playthrough/accessibility check for the local MVP.

#### Why
Issue #26 requires automated tests appropriate to the selected stack and a documented manual check of the child-visible game loop and accessible interaction behavior (`R5`). This task makes Task 2’s observable loop independently testable while applying the visual and accessibility decisions from Task 1.

#### How
Depends on: Tasks 1, 2. Implement only the styling and interaction affordances selected in Task 1, including keyboard operation and the approved readable visual treatment; do not add sound, animation, localization, or device support that the record does not select. Add deterministic automated coverage of the approved correct path, incorrect/retry path, handoff/checkpoint visibility, and validation/success state using the test tooling selected in Task 1. Document a manual local playthrough that verifies the same states and the selected accessibility checks, including the command and expected observations; it must not require personal data, external services, or OrcMe materials.

#### Where
`src/styles.css`
`tests/game-loop.test.js`
`docs/validation/children-ai-workflow-mvp-playthrough.md`

#### Acceptance criteria
- The local MVP has the approved accessible visual presentation and can complete the selected primary interaction using the documented keyboard behavior.
- The selected automated test command passes and covers both correct and incorrect workflow sequences plus handoff and validation/success states.
- The manual check document gives reproducible local steps, expected observations, and the selected accessibility checks for the child-visible loop.
- No styling, test, or manual check introduces an unapproved external service, personal-data flow, or OrcMe source, asset, or name reuse.

### 4. Produce independent validation and Issue #26 delivery evidence

- [ ] Obtain independent review and testing of the completed MVP, then record the authorized Issue #26 branch, commit/push, review, test, and pull-request receipts.

#### Why
`R4` requires normal issue-based delivery evidence, while `R5` requires independent review and test results. The predecessor handoff establishes that Issue #26 is the non-duplicate tracking issue and that an issue-linked branch already exists; this task must preserve that traceability without claiming unapproved merge, deploy, publish, or release actions.

#### How
Depends on: Tasks 1, 2, 3. Request independent review and test execution against the selected decisions and completed local MVP. Before any additional tracker mutation, reconfirm that Issue #26 remains the applicable accepted scope and that open issues #1 and #6 are not duplicates; do not create a duplicate issue. Record the exact issue URL, branch name, commit and push receipts, test command/result, reviewer result, and pull-request URL. Use `Closes #26` only if the pull request completes Issue #26’s accepted scope. Do not merge, deploy, publish, or release without separately documented authority.

#### Where
`docs/validation/children-ai-workflow-mvp-delivery-receipt.md`

#### Acceptance criteria
- The receipt links the completed work to Issue #26, the issue-linked branch, exact commit/push evidence, independent review, independent test result, and pull request.
- The receipt records a fresh non-duplicate reconciliation of open issues #1 and #6 before any tracker change, or records why no tracker change was needed.
- The recorded test evidence includes the automated command from Task 3 and the manual playthrough result.
- The receipt makes no unsupported claim that work was merged, deployed, published, or released, and `Closes #26` is used only when accurate.
