<!-- Use a Conventional Commit title. Complete every section; use "None — <reason>" where inapplicable. Do not delete required prompts. Markdown prompts are not automated enforcement. Never include participant data, secrets, credentials, raw tokens or submitted answers. -->

## Issue and outcome

Closes #<issue>

<!-- Name the one approved task and phase; summarize why and what changed. -->

## Requirement trace and decision gates

- Plan task/phase and authoritative source sections:
- Applicable REQ-* and U-* identifiers (or reason inapplicable):
- Applicable OQ-* identifiers, approved dated decision-record links and owners (or reason none are needed):
- Unresolved decisions/blockers; no implicit approvals:

## Dependencies

- Depends on: <!-- issue links or none with reason; include readiness evidence and parent issue -->

## Complete exact-file manifest

<!-- List every added/modified/deleted path, including tests, docs and companion paths; no directory globs. Explain any amendment from the issue before proceeding. -->

- Paths and actions:
- Companion-path review: <!-- generated API contract; API module registration; router/page mounting; instruction inventory; exact helpers/fixtures; both Terraform environment roots where applicable. Explain inapplicable companions. -->

## Out of scope and later work

<!-- Identify independent tasks, deferred/post-pilot work and unresolved decisions not implemented here; link their owners/issues where applicable. -->

## Acceptance criteria and evidence

<!-- Map EACH issue criterion to a result and reproducible command/assertion. Report failures, exclusions and limitations honestly; no cache-only or unrelated-run "pass" claims. -->

| Issue criterion / requirement | Command or assertion | Result and evidence link | Limitations / unverified behavior       |
| ----------------------------- | -------------------- | ------------------------ | --------------------------------------- |
| <!-- criterion -->            | <!-- command -->     | <!-- result -->          | <!-- limitation or none with reason --> |

- Tested commit SHA:
- Isolated environment / effective targets / pinned Node and pnpm versions:
- Affected tests and quality checks; reasons for inapplicable checks:
- UI work: synthetic desktop/tablet/phone screenshots or recordings, visible-text/speech fallback and accessibility checks (or reason inapplicable):
- Concurrency work: real-PostgreSQL race assertions and final database invariants, not screenshots (or reason inapplicable):
- Generated-contract, migration, image and Terraform evidence (or reason each is inapplicable); state/plans are never committed:

## Migration, compatibility and rollback

<!-- State schema/data/API/infra changes or explain none. Include safe migration/deployment ordering, compatibility, checked SQL migrations and rollback/recovery. Never rewrite applied migrations. -->

## Privacy and child safety

<!-- Describe collection/retention/deletion/consent/logging impact or explain unchanged. Synthetic evidence only; no participant data or submitted answers. No unapproved compliance claims. -->

## Security and authorization

<!-- Describe tenant/role/session boundaries, permissions, secret references, threat/denial tests and residual risks or explain unchanged. No invented OQ security policy. -->

## Delivery and independent review

Follow the [plan conventions](https://github.com/senad-d/testme/blob/main/docs/plans/mobey-mvp-implementation-plan.md#github-issue-branch-commit-and-pull-request-conventions) and [AGENTS.md](https://github.com/senad-d/testme/blob/main/AGENTS.md#9-github-delivery-workflow): prescribed issue branch from current main after readiness; Conventional Commits with `Refs #<issue>`; no direct push to main; independent review and applicable checks before squash merge. Production approval is separate. Protected-main, required CODEOWNERS review and required status checks need external repository-settings evidence; these files do not establish enforcement.

- Independent reviewer and review evidence: <!-- pending until obtained; never self-certify independent approval -->
- Repository-settings evidence or explicit unverified status: <!-- separate from this change; no settings changes implied -->
- [ ] One approved task only; exact-file manifest matches the issue, including companions.
- [ ] Applicable decisions have approved dated records; unresolved gates and later work remain explicit.
- [ ] Every acceptance criterion has evidence or a clearly stated blocker; no required check was weakened or skipped to obtain a pass.
- [ ] Contract/migration/Terraform diffs and threat/privacy effects are presented for independent review where applicable.
- [ ] Evidence is synthetic and contains no participant data, secrets, credentials, raw tokens or submitted answers.
- [ ] Independent review and applicable checks are required before squash merge; file presence is not proof of protection enforcement.
