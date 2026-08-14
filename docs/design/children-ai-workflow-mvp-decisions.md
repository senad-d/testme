# Children’s AI-workflow learning MVP decision record

## Status and authority

- **Tracking scope:** GitHub Issue [#26](https://github.com/senad-d/testme/issues/26), “I would like to create a simple webapp for a children learning plaform and game for learning about AI workflows…”
- **Record status:** selected MVP scope for Tasks 2–3 of `docs/tasks/okay-you-can-continue-tch-f9e9db32c408e56b-tasks.md`.
- **Interpretation:** OrcMe is only a conceptual reference for goal, specialized work, dependency/handoff, and independent validation. The MVP must not copy or display OrcMe source, assets, names, agent names, graph internals, or other protected material without explicit reuse permission.

This record resolves the choices needed to implement a bounded, local MVP. “Approved deferral” below means excluded from this MVP under Issue #26’s accepted local-by-default boundary; adding a deferred capability requires a new documented decision and owner approval.

## Requirements ledger

| ID | Accepted requirement | MVP meaning |
| --- | --- | --- |
| `R1` | Product guidance and honest delivery history | The current `AGENTS.md` is satisfactory product guidance: it states the children’s learning purpose, conceptual-only/no-copy boundary, issue process, greenfield status, unresolved-decision rule, and `.env` protection. It was updated before application implementation. However, Issue #26 and its issue-named branch already existed before that update. That issue/branch-before-AGENTS ordering deviation is irreversible, so this record **does not claim full AGENTS-first compliance**. |
| `R2` | Observable learning loop | One child can complete one short mission and see the mapping **goal → specialized work → dependency/handoff → validation/result** in child-facing language. |
| `R3` | Local, safe interaction | The MVP is deterministic, static, local/offline-first, privacy-minimizing, accessible, and contains only fixed-choice interaction. The exclusions in this record are mandatory. |
| `R4` | Issue-linked delivery evidence | Work remains traceable to Issue #26 and its issue-linked branch. Existing issues #1 and #6 must be freshly inspected for duplication before any tracker change. Delivery evidence may report only actions actually completed and authorized. |
| `R5` | Repeatable validation | The chosen stack has deterministic automated checks plus a documented manual child-visible and accessibility playthrough. Independent review must pass with zero blockers and independent tests must pass against the exact final content before completion delivery evidence is recorded. |

### Issue #26 requirement traceability

This inventory maps every normative item in Issue #26’s “Required sequence and scope” and “Boundaries and constraints” sections.

| Issue item | Requirement mapping | Disposition |
| --- | --- | --- |
| Required sequence 1: update `AGENTS.md` first; describe the product and conceptual reference; preserve `.env`; do not turn unknowns into requirements. | `R1` | Current content is satisfactory and preceded application implementation, but not issue/branch creation. The historical deviation is disclosed above rather than rewritten as compliance. |
| Required sequence 2: build a greenfield, playable, observable, age-appropriate loop showing a mission, understandable helpers, progress, handoff/checkpoint, and success tied to the workflow. | `R2`, `R3` | Selected in the product decisions below; Tasks 2–3 implement it. |
| Required sequence 3: use non-duplicate issue-based delivery with an issue-linked branch, independent review/test, commit/push/PR evidence, and an accurate `Closes` reference. | `R4`, `R5` | Issue #26 is the tracking scope. Task 4 owns final reconciliation and evidence; no completion or authority is presumed here. |
| Boundary 1: treat the repository as greenfield and select architecture only after product decisions; do not imply an existing implementation. | `R1`, `R3` | This record makes the selection before Tasks 2–3. It does not claim the app already exists. |
| Boundary 2: concepts only; do not copy OrcMe source, assets, names, or protected material without permission. | `R3` | Mandatory content boundary. The selected mission and helper names are original and generic. |
| Boundary 3: local/simple by default; no unapproved model, account, chat/free-text, persistence, analytics, personal-data, teacher/parent, deployment, or network capability. | `R3` | All listed capabilities are explicitly excluded below. |
| Boundary 4: preserve Git hygiene; do not read/commit `.env` or add generated output; do not assume merge/deploy/publish/release authority. | `R1`, `R4` | Mandatory delivery boundary; merge and release remain owner-blocked. |
| Boundary 5: inspect open issues #1 and #6 before changing the backlog. | `R4` | Required fresh reconciliation in Task 4 before any tracker mutation; no duplicate issue is selected. |

### Issue #26 observable-acceptance traceability

| Issue acceptance check | Requirement mapping | Planned evidence |
| --- | --- | --- |
| `AGENTS.md` is updated first, is product-accurate, preserves `.env`, and avoids unsupported claims. | `R1` | Content is satisfactory and was in place before application implementation. Full AGENTS-first chronology is **not** satisfied because issue/branch creation came first; the limitation must remain in delivery evidence. |
| A child completes a session visibly teaching goal, specialized steps, handoff/dependency, and validation/result. | `R2` | Task 2’s selected mission and states; Task 3 automated and manual checks. |
| Only approved local/safe interactions; no unapproved personal-data, live-AI, or network behavior. | `R3` | Static implementation inspection plus automated/manual checks against the exclusions. |
| Accepted scope is traceable to non-duplicate issue(s), issue-linked branch, review/test results, and PR/commit receipt; no unauthorized delivery claim. | `R4`, `R5` | Task 4 receipt, after fresh #1/#6 reconciliation and passing exact-content gates. |
| Stack-appropriate automated tests and a documented manual check cover the visible loop and accessibility. | `R5` | `npm test` and the Task 3 playthrough document, followed by independent validation. |

## Product and learning decisions

| Decision required by Issue #26 | Outcome | Maps to |
| --- | --- | --- |
| Target age and reading level | **Selected:** ages 8–10; short, concrete English sentences; familiar words; one instruction per sentence; avoid technical workflow terms unless immediately explained. Aim at roughly a US grade-3 reading level and verify the child-visible copy manually rather than claiming a formal reading certification. | `R2`, `R5` |
| Learning objectives and curriculum scope | **Selected:** after one play, the child can (1) point to the goal, (2) explain that helpers have different jobs, (3) place dependent jobs in order and recognize a handoff, and (4) recognize that a checker validates the result. Broader AI theory, model behavior, coding, and curriculum progression are outside this MVP. | `R2`, `R5` |
| Vocabulary | **Selected:** child-facing terms are “Goal,” “Helper,” “Job,” “Handoff,” “Check,” and “Result.” “Handoff” is explained as “one helper gives finished work to the next helper.” Do not use OrcMe names, agent names, graph terminology, or orchestration internals. | `R2`, `R3` |
| Session length | **Selected:** one self-paced mission intended to take about 5–10 minutes, with no timer or time-based failure. | `R2`, `R3` |
| Solo or collaborative mode | **Selected:** solo play only. Multiplayer, classroom collaboration, teacher, and parent modes are approved deferrals outside this MVP. | `R2`, `R3` |
| Exact pages and content volume | **Selected:** one responsive page and one mission, with no route changes, account screens, or content library. The mission is **“Make a plan for a class garden.”** | `R2`, `R3` |
| Exact game loop and helpers | **Selected:** show the fixed goal; let the child add each of three fixed helper cards to a workflow; permit undo/reset; then let the child check the sequence. Correct order: (1) **Seed Helper** — “chooses three plants”; (2) **Garden Helper** — “uses the plant list to make the garden plan”; (3) **Check Helper** — “checks that the plan has three plants and is ready.” All input is fixed choice, not typed text. | `R2`, `R3` |
| Dependency and handoff | **Selected:** after the correct work order is checked, visibly show the Seed Helper’s plant list being handed to the Garden Helper before the Check Helper validates it. Label the state “Handoff” and include its plain-language explanation. | `R2`, `R5` |
| Success, failure, and retry rules | **Selected:** checking all three helpers in the correct order shows step progress, the distinct handoff, the check, and a positive success result. An incomplete sequence says to add the missing helper(s). A complete incorrect sequence says that a helper needs earlier work and invites another order. Feedback must not shame, score, or punish. Undo/reset remains available. | `R2`, `R3`, `R5` |
| Incomplete and repeated-retry behavior | **Selected:** incomplete checks never count as success. Every repeated incomplete or incorrect check gives the same useful category of guidance, remains deterministic, and never locks the child out or escalates negativity. No attempt count is persisted; success occurs only on the correct complete order. | `R2`, `R3`, `R5` |

## Experience, accessibility, and platform decisions

| Decision required by Issue #26 | Outcome | Maps to |
| --- | --- | --- |
| Visual treatment | **Selected:** friendly but uncluttered cards, readable spacing, large text, and a clear ordered workflow. Meaning must use text and structure, never color alone. | `R2`, `R3` |
| Accessibility | **Selected:** semantic headings/landmarks and native buttons; complete keyboard operation with a logical focus order; visible focus; status feedback in an appropriate live region; labels/instructions associated with controls; minimum 44-by-44 CSS-pixel targets; normal text contrast of at least 4.5:1; zoom/reflow at 320 CSS pixels without loss of controls or content. There is no drag-only interaction. | `R3`, `R5` |
| Device and browser support | **Selected:** responsive keyboard and pointer use at 320 CSS pixels and wider on phones, tablets, laptops, and desktops. Target the latest two stable major versions available at implementation time of Chrome, Edge, Firefox, and Safari. Internet Explorer and embedded legacy webviews are unsupported. | `R3`, `R5` |
| Localization | **Selected for MVP:** English only. Additional locales and translation infrastructure are approved deferrals; child-visible language remains isolated in the small static experience so a later plan can revisit localization. | `R2`, `R3` |
| Sound and animation | **Selected:** no sound, autoplay, animation, or flashing effects in the MVP. State changes are immediate and announced textually. Any later motion must honor reduced-motion preferences and requires a revised decision. | `R3`, `R5` |

## Privacy, safety, and scope exclusions

The MVP processes only transient clicks on fixed controls in the current browser page. It collects, sends, or saves no data.

| Decision required by Issue #26 | Outcome | Maps to |
| --- | --- | --- |
| Privacy jurisdiction and data handling | **Selected for this MVP:** data-minimizing local interaction with no account, identifier, user-entered content, storage, telemetry, or transmission. A jurisdiction-specific privacy regime determination is an **approved deferral** because the MVP collects no personal data. The product owner and appropriate privacy/legal reviewer must approve a jurisdiction and handling policy before any future personal-data, account, persistence, analytics, or network feature is planned. | `R3`, `R4` |
| Live AI and external services | **Excluded:** no live model calls, AI API, backend, remote font, CDN, analytics, advertising, external network request, or other integration. | `R3` |
| Input and identity | **Excluded:** no account, login, free-text input, chat, child name, email, identifier, upload, or other personal-data collection. | `R3` |
| Persistence | **Excluded:** no cookies, local storage, saved progress, cross-session attempt history, or cloud storage. Reloading starts the one mission again. | `R3` |
| Adult and expanded product features | **Excluded:** no teacher/parent dashboard or feature, classroom administration, collaboration, content authoring, or deployment. | `R3`, `R4` |

## Technical and delivery decisions

| Decision required by Issue #26 | Outcome | Maps to |
| --- | --- | --- |
| Static/offline-first status | **Selected:** static and offline-first after local files are present. There is no backend and no runtime network dependency. Serve the files only from the documented local start command. | `R3` |
| Frontend architecture | **Selected:** semantic HTML, local CSS, and browser-native vanilla JavaScript. Application behavior is deterministic and separated into importable pure state/sequence functions plus a small DOM binding layer. No framework and no runtime third-party dependency are selected. | `R2`, `R3`, `R5` |
| Local start tooling | **Selected:** `npm start` invokes a repository-local script that serves the static files on a documented loopback URL without downloading anything. Node.js is the development runtime; the implementation must not depend on an external CDN or hosted service. | `R3`, `R5` |
| Automated test tooling | **Selected:** Node’s built-in test runner, invoked by `npm test`, tests the importable deterministic game-loop seam without live network access. It must cover correct, incorrect, incomplete, repeated-retry, handoff, validation, and success behavior. | `R5` |
| Manual validation | **Selected:** a reproducible local playthrough checks the same states, keyboard-only use, focus, text feedback, reflow, contrast, vocabulary, target reading level, and learning-objective mapping. | `R2`, `R3`, `R5` |
| Hosting and deployment | **Approved deferral:** none for this MVP. Local execution is selected; hosting, deployment, domains, production configuration, and publication require a revised plan and explicit owner authority. | `R3`, `R4` |
| GitHub merge/release authority | **Owner-needed blocker for those actions:** no authority is established to merge, deploy, publish, or release. Task 4 may gather authorized branch/commit/push/PR and validation receipts only. Merge, release, deployment, and publication must not occur or be claimed without separately documented owner authorization. | `R4`, `R5` |

## Tasks 2–3 architecture and path gate

**Selected:** Tasks 2–3 may proceed with the static local HTML/CSS/JavaScript architecture above and exactly these planned paths:

- Task 2: `package.json`, `index.html`, `src/app.js`
- Task 3: `src/styles.css`, `tests/game-loop.test.js`, `docs/validation/children-ai-workflow-mvp-playthrough.md`

`index.html` must load `src/styles.css`; `src/app.js` must expose the deterministic test seam selected above; and `package.json` must define the selected local `npm start` and `npm test` commands. Tests and the manual check must not require personal data, an external service, or protected OrcMe material.

Any different architecture, runtime/network model, test tool, gameplay/content selection, or file-path selection invalidates this gate and **requires a revised implementation plan before Tasks 2–3 proceed**.

## Delivery limitations that remain in force

1. This decision record authorizes only the bounded local MVP in Tasks 2–3; it grants no tracker, merge, deployment, publication, or release authority.
2. Issue #26 and its issue-named branch predated the satisfactory `AGENTS.md` update. That sequence cannot be repaired retroactively and must be repeated accurately in the final receipt.
3. Independent review and testing—not this record—determine whether the implemented result passes `R5`. A failure stops completion delivery until bounded remediation and affected revalidation pass against the new exact content.
