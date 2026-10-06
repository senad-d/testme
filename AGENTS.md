# Mobey Repository Guidance

**Scope:** Repository-wide guidance for coding agents  
**Current phase:** Phase 1 platform baseline with a runnable health slice, migrations, generated REST contracts and local Compose; domain features and pilot release remain gated

**Product release:** Family-loop MVP private pilot

## 1. Start here

Mobey is a child-friendly website game for children ages 7–9. Children answer whole-number money-learning questions, earn fictional Game Money, save toward parent-defined screen-time rewards, and request rewards for a parent to approve or reject. Parents fulfil approved screen time outside Mobey. Mobey does not process real money or control another application or device.

Before changing anything:

1. Read the issue. From the section 2 documents, read only the sections the issue cites (its `REQ-*`, `OQ-*`, plan task, and source-section references), located by identifier with a search tool; never read those documents whole. Branch, commit, pull-request, and issue-tracking steps need the issue alone.
2. Confirm that every unresolved `OQ-*` needed by the work is approved; do not choose a value in code.
3. Check the repository itself. Paths and commands described as intended below do not exist yet unless the current tree proves otherwise.
4. Keep the issue, requirements, exact changed-file manifest, tests, documentation, and pull request evidence aligned.
5. Stop and amend the issue or plan if the work reaches a new product behavior, domain owner, migration, infrastructure surface, or unresolved decision.

## 2. Authority and traceability

Use each source for the concern it owns:

1. [`docs/discovery/mobey-initial-product-discovery.md`](docs/discovery/mobey-initial-product-discovery.md) preserves validated user decisions, source IDs (`U-*`), delivery constraint `[A]`, requirement IDs (`REQ-*`), terminology, and open questions (`OQ-*`). It is the provenance authority.
2. [`docs/product/mobey-prd.md`](docs/product/mobey-prd.md) defines MVP product behavior, acceptance criteria, scope, and non-goals. It is the product-scope authority and must not silently change discovery identifiers.
3. [`docs/technical/mobey-technical-spec.md`](docs/technical/mobey-technical-spec.md) defines the selected architecture, ownership boundaries, data and API rules, and technical proposals. It may not override product scope or close an `OQ-*` by itself.
4. [`docs/plans/mobey-mvp-implementation-plan.md`](docs/plans/mobey-mvp-implementation-plan.md) defines task order, dependencies, phase gates, intended paths, and delivery evidence. It does not authorize work whose decision gate remains open.
5. This file governs agent conduct. It summarizes rather than replaces the sources above.

An approved, dated decision record for a named `OQ-*` controls that decision after approval. Update affected discovery/PRD/specification/plan references in the same documentation change; do not leave contradictory guidance. For implemented behavior, code, migrations, tests, and deployment configuration are evidence of current state, but they are not permission to depart from approved requirements. Escalate conflicts rather than guessing.

Every issue and pull request must cite applicable `REQ-*`, `U-*`, `OQ-*`, plan task numbers, and source sections. Preserve identifiers. Never reuse an identifier for changed behavior or mark an open question resolved merely because an implementation assumes an answer.

## 3. Product vocabulary and boundaries

Keep these concepts separate in code, storage, APIs, UI copy, tests, and telemetry:

- **Practice Amount:** a temporary challenge value; it never spends Reward Balance.
- **Game Money:** fictional whole-number units earned in learning or changed by an audited parent adjustment.
- **Reward Balance:** a child's durable available plus reserved Game Money.
- **Reward Shop:** the family's parent-defined catalog of screen-time vouchers, not a learning Theme.
- **Child Session:** authenticated child access; **Game Session:** a 10-challenge learning run.
- **Currency Skin:** USD, EUR, GBP, JPY, or CNY presentation applied 1:1; it never converts value or represents a transaction.

Do not add real payments or exchange rates, virtual inventory, device/app control, multiple caregivers, credential recovery or third-party authentication, native apps, additional languages, chat, social features, leaderboards, ads, uploads, notifications, a CMS, automated moderation, a formal WCAG claim, or public-launch behavior. These are outside the Family-loop MVP.

## 4. Selected architecture and intended layout

The selected design is a TypeScript modular monolith:

- React/Vite single-page web application;
- NestJS API using the Fastify adapter and REST/JSON under `/api/v1`;
- PostgreSQL with Drizzle and checked-in SQL migrations;
- generated OpenAPI TypeScript client/contracts;
- `pnpm` workspaces with Turborepo;
- Vitest, Supertest, Testcontainers PostgreSQL, and Playwright;
- version-controlled content with no CMS; and
- Docker/Compose locally and Terraform-managed AWS deployment.

The application/package roots and local Compose stack below now exist. E2E includes
local Compose and production-built platform smoke coverage, not domain journeys.
The PR quality workflow exists; Terraform and deployment remain future surfaces:

```text
apps/web/                         React/Vite UI
apps/api/                         NestJS modular API and migrations
packages/shared/                  generated API client/types and small safe primitives
packages/content/                 reviewed learning, instruction, theme, and avatar content
tests/e2e/                        critical Playwright journeys
infra/terraform/bootstrap/        remote-state prerequisites
infra/terraform/modules/          AWS modules
infra/terraform/environments/     nonprod and prod roots
.github/                          issue/PR templates, CODEOWNERS, PR quality workflow
compose.yaml                      local development stack
```

API bounded contexts are Identity & Family, Learning, Economy, Rewards, Reporting, Privacy & Consent, and Operations. Domain behavior belongs to its API module. `packages/shared` must not contain database entities or business services. Content must be deterministic and reviewed; do not introduce network content generation, runtime AI generation, or mutable production authoring.

When routes are implemented, a public controller/DTO/error change must regenerate and commit the generated contract. Never hand-edit generated contract output. Database changes require a reviewed migration and real-PostgreSQL migration evidence; do not substitute SQLite or in-memory behavior for transaction tests.

## 5. Non-negotiable engineering invariants

### Child safety, privacy, and data minimization

- Do not collect or persist a child's real name, email, age, birth date, uploaded image, social identity, chat, or unrelated behavioral data.
- Use only family-local nickname, app-provided avatar, and parent-chosen PIN for a Child Profile.
- Never place parent email, child nickname, password, PIN, raw token, submitted answer, secret, or participant data in logs, analytics, fixtures, screenshots, errors, issue text, commits, or pull requests.
- Use deterministic synthetic data for development and tests. Never copy production or pilot data between environments.
- Treat parent labels and reasons as private plain text. Render them as text and enforce the specified validation; do not add public sharing or infer that deferred moderation permits unsafe rendering.
- Optional analytics is off without explicit parent consent and an approved `OQ-09` event contract. Declining or withdrawing consent must not reduce product functionality. Do not add a third-party analytics destination or arbitrary event payload.
- Keep essential Session Summaries separate from optional analytics. Do not create permanent question-by-question or answer history.
- Profile and family deletion must follow `REQ-CHILD-07` and `REQ-PRIV-04`–`REQ-PRIV-06`. Do not claim legal or backup erasure timing while `OQ-01` and `OQ-06` remain unresolved.
- Do not claim COPPA, GDPR, UK GDPR, Children's Code, WCAG, or other legal/accessibility compliance without an approved jurisdictional review and evidence.

### Accessibility and child-facing behavior

- Every instruction must have visible English text, browser speech, and a child-accessible replay control.
- Speech being missing, muted, rejected, or failed must never block progress; visible text is the functional fallback.
- Use semantic controls, visible focus, keyboard-operable critical journeys, associated labels/errors, non-color-only states, usable zoom/reflow, generous touch targets, and reduced-motion behavior.
- Preserve responsive critical journeys on the eventually approved desktop/tablet/phone browser matrix. Automated accessibility checks do not prove target-age usability or formal conformance.
- Do not imply mastery from stage completion, real value from Currency Skins, guaranteed parent approval, or in-product enforcement of screen time.

### Authentication and authorization

- Derive family, parent, and child ownership from the authenticated server-side principal, never from an untrusted request-supplied family ID.
- Enforce tenant scope in services and PostgreSQL constraints; test denial with at least two families.
- An Authorized Browser is not a parent principal. A Child principal may act only for its own profile. Entering parent mode from child mode always requires the parent password.
- Child PIN access works only on an Authorized Browser. Enforce one active Child Session per profile. PIN change, browser revocation, parent end, timeout, and deletion invalidate affected access.
- Recheck and lock session validity in the same transaction as state-changing commands so revocation races have a defined order.
- Store only hashes/verifiers of opaque credentials. Passwords and PINs are never recoverably encrypted or logged. Preserve PINs as 4–6 ASCII-digit strings, including leading zeroes.
- Authentication failures must be generic and rate-limited. Do not invent lockout thresholds, scopes, or session/browser lifetimes; these await `OQ-04` approval.
- Use server-side authorization, validation, Origin/CSRF protections, and secure deployed-cookie rules. Client routes and cookie presence alone never grant authority.

### Money arithmetic and concurrency

- Use integer arithmetic only. Never use JavaScript floating point for durable balances, ledger totals, prices, reservations, or adjustments.
- Keep durable money in PostgreSQL `bigint` and transport it as validated base-10 strings; parse with `BigInt` in the web application. The exact technical ceiling remains gated by `OQ-11` until approved.
- Available and reserved balances cannot be negative. A negative parent adjustment may use available funds only and cannot touch a reservation.
- Challenge awards, request reservation/resolution, refunds, and adjustments are atomic and retry-safe. Use immutable ledger evidence and idempotency/source uniqueness approved under `OQ-07`.
- Voucher creation atomically reserves the snapshot price. Approval spends it; rejection or child cancellation refunds it. Concurrent approve/reject/cancel is first-action-wins exactly once.
- Treat retries, duplicate clicks, stale clients, concurrent devices, and uncertain network responses as normal cases. Use database constraints, transactions, row locks, conditional transitions, and real-PostgreSQL concurrency tests—not read-then-write checks alone.
- Family timezone refresh across a day boundary and duplicate/concurrent Game Session starts remain gated by `OQ-14` and `OQ-15`; do not assume those behaviors in code, tests, or documentation until approved.
- Fail overflow or invariant violations with no partial domain, balance, or ledger write.

## 6. Local development expectations

The local health slice runs with `docker compose --env-file /dev/null up --build --watch` from the repository root (Docker Compose 2.32+). See [README.md](README.md) for verified commands, image checks, shutdown/reset instructions and limitations. Keep command evidence tied to the source revision under review.

Use the pinned Node 24.20.0 and pnpm 11.25.0 toolchain. Install dependencies with
`pnpm install --frozen-lockfile`; do not use the default Node 26 runtime as verification
evidence. The workspace has build, type-check, test, and contract commands. Exact
commands and their evidence scope live in [`docs/testing.md`](docs/testing.md).
Run `pnpm format:check`, `pnpm lint --force`, `pnpm test:ci-policy` and
`pnpm exec turbo run type-check:tests --force` for the quality tooling. With an
explicit runner-local Docker target, run `pnpm test:coverage` and
`pnpm --filter @mobey/e2e test` (install Chromium first). `pnpm test:platform`
selects just the production-built browser smoke. See the registry for isolated
resources and the same-origin test proxy, which is not AWS routing.
Clean-checkout and publication evidence must be established by the delivery workflow;
a working-tree check alone is not clean-clone or release evidence.

For public controller/DTO/error changes, run
`pnpm --filter @mobey/api contract:generate`, review the generator-owned
`packages/shared/src/generated/api.ts`, then run `pnpm --filter @mobey/api contract`.
The latter fails on missing/stale output without rewriting it. Use
`pnpm contract --force` to run the workspace contract gate without a Turbo cache hit.
Generation uses Nest OpenAPI metadata without a database query or listening server.
The generated file's schema digest also tracks constraints not expressible as
TypeScript types. Never hand-edit generated output. See the registry's Task 13
section for safe problem details, request IDs, decimal-string transport, and the
preserved health-report contract.

The Compose stack provides `web`, `api`, `db`, and one-shot `migrate`, web HMR/API source sync-and-restart, health/migration ordering and persistent local DB storage. Use only its explicit synthetic development configuration. Always supply `--env-file /dev/null`; never implicitly read the ignored root `.env`, synchronize `.pi`, use participant data, or select local development-secret/cookie modes outside development. Production stages use frozen dependencies and non-root runtime users. The rejection guard is not authentication implementation or OQ approval.

No family/content seed exists yet: the requirement and evidence remain with Tasks 16/#25 and 24/#33 after their schema/content approvals, as recorded in Task 11/#20 and the authoritative plan/specification. Do not claim migrations or a no-op command satisfy seed acceptance. Tests and commands are registered in [docs/testing.md](docs/testing.md). Browser binaries can be installed under ignored `node_modules/.playwright-browsers`; use the same absolute `PLAYWRIGHT_BROWSERS_PATH` for installation and verification, as shown in the README.

When runnable commands are added, update this file and the relevant README in the same pull request using commands verified against the changed repository.

## 7. Terraform and AWS boundaries

All AWS infrastructure belongs under the future `infra/terraform/`; do not introduce CDK or hand-created, undocumented application infrastructure. The selected deployment shape is:

- private S3 origin through CloudFront for the SPA;
- the API on ECS Fargate behind an ALB;
- private encrypted RDS PostgreSQL;
- separate `nonprod` and `prod` Terraform root modules; and
- GitHub OIDC, automatic nonprod deployment after merge, and manual production approval.

Do not place participant emails, secret values, credentials, Terraform state, or generated plan files in Git. Terraform creates secret containers and references; operators supply values through an approved process. Plans must never apply from a pull request. Production must promote the same tested immutable artifacts rather than rebuild them.

Region, account isolation, sizing, network-egress choice, origin DNS/certificates/proof rotation, Terraform backend details, retention, backups, observability, RTO/RPO, and budget remain gated by `OQ-05`, `OQ-06`, and `OQ-13`. Do not encode proposed defaults as approved facts. If the approved budget cannot support the selected AWS baseline, return to architecture approval rather than silently replacing it.

## 8. Testing and quality gates

Tests must follow the risk:

- unit/property tests for progression, scoring, content constraints, timezones, validation, and checked arithmetic;
- component tests for role-specific UI, visible-text/speech fallback, errors, retries, affordability, and cache clearing;
- API integration tests against real PostgreSQL for migrations, tenant isolation, access revocation, daily limits, deletion, consent, and transaction behavior;
- synchronized concurrency tests for Child Session creation, duplicate rewards, request races, reservation versus adjustment, and item edit/delete races;
- Playwright tests for critical parent/child Family-loop journeys and approved responsive/accessibility cases;
- deterministic generated-contract checks, security/redaction checks, production image builds, and affected Terraform checks.

`.github/workflows/ci.yml` runs frozen install, clean-checkout hygiene, format, typed source/test lint, source/test type-checks, unit/component and real-PostgreSQL tests, contract drift, Compose and production-built browser smoke, production image builds, dependency/secret/configuration/image security scans and SonarCloud quality-gate waiting. `CI required` fails on any failed, skipped or cancelled dependency. Sonar includes TypeScript web/API/package/E2E tests and normalized LCOV; generated/vendor/build/state output is excluded. Missing `SONAR_TOKEN`, including on fork PRs, fails closed; never use `pull_request_target` to expose secrets to untrusted code. Terraform is absent: the workflow rejects newly introduced Terraform until its owner adds approved isolated format/validate/security/plan checks. No cloud credentials or plans run here. File configuration is not evidence of active GitHub checks, branch protection or a passing Sonar gate; establish those separately. See `docs/testing.md` for commands, scope and limitations.

Never weaken, skip, mock away, quarantine, or relabel a required check to obtain a pass. Do not claim that automation proves educational suitability, child usability, accessibility conformance, legal approval, or release readiness. Attach evidence from the exact commit and environment under review.

## 9. GitHub delivery workflow

The delivery convention is issue → branch → focused commits → pull request → independent review → squash merge. Use [the MVP issue form](.github/ISSUE_TEMPLATE/mvp-task.yml) and [the pull-request template](.github/pull_request_template.md), following the [plan conventions](docs/plans/mobey-mvp-implementation-plan.md#github-issue-branch-commit-and-pull-request-conventions) and Task 15 (`U-23`). The issue form requires each evidence/scope field; PR Markdown supplies mandatory completion prompts, not automated validation. Complete every section or explain why it is inapplicable.

[CODEOWNERS](.github/CODEOWNERS) assigns every path—including application, content, privacy, workflow, and Terraform paths—to `@senad-d`. The repository owner approved this single owner and confirmed repository write access in issue #24 (objective 240). Do not invent additional maintainer/team handles. Ownership files do not establish required-review, status-check, or protected-main enforcement: obtain external repository-settings evidence separately. This task does not configure settings or supply CI workflows.

- **Issue:** one approved implementation-plan task per issue, titled `[MVP][P<phase>] <task outcome>`. Include task/phase, applicable `REQ-*`/`U-*`/`OQ-*` trace and source sections, dated decision-record links or explicit unresolved blockers, dependencies and readiness, complete exact-file manifest including companion paths, acceptance criteria and required evidence, privacy/security impact, migration/rollback effect, and later-work exclusion. Amend the issue before expanding scope.
- **Branch:** after the issue is ready, update from `main` and create `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `infra/<issue>-<slug>`, `test/<issue>-<slug>`, or `docs/<issue>-<slug>`. Branch protection is intended but must be verified separately.
- **Commit:** use a Conventional Commit subject, for example `feat(learning): persist placement outcome`, and include `Refs #<issue>` in the body. Keep commits reviewable and truthful about evidence.
- **Publication safety (#62):** before publication run `pnpm publication:preflight origin HEAD:refs/heads/<current-feature-branch>`. Reject any differently named upstream, especially `origin/main`; use only the explicit push command it reports, never bare/force/mirror publication. After pushing, run `pnpm publication:verify origin HEAD:refs/heads/<current-feature-branch>` immediately before opening the PR; it must confirm the live feature commit matches HEAD. These commands inspect Git and are run by an authorized Git agent. `pnpm test:publication` uses synthetic transcripts only and is included in the existing CI-policy gate. See [delivery safety](docs/delivery-safety.md) for exact target/credential handling and external protected-main acceptance evidence; local guards do not configure server rules.
- **Pull request:** use a Conventional Commit title and `Closes #<issue>`. Complete the template's trace, decisions, dependencies, exact changed paths and companion review, exclusions, criterion-to-evidence mapping, migrations/rollback, and threat/privacy fields. Record the tested commit, pinned toolchain, isolated effective targets, failures and limitations. UI evidence uses synthetic data; concurrency evidence includes real-PostgreSQL assertions. Record independent-review evidence honestly; pending review is not approval.
- **Review and merge:** no direct push to `main`; require independent review and all applicable checks. Resolve generated contract, migration, and Terraform plan changes in review. Squash merge. Production requires a separate manual approver through the protected `production` Environment once that environment exists.

Do not combine independent issues to reduce pull-request count. Tasks outside plan items 1–51 are not approved as MVP merely because they seem useful.

## 10. Documentation and change discipline

- Update documentation in the same pull request when behavior, architecture, commands, paths, contracts, migrations, operations, or decisions change.
- Link to existing detail rather than duplicating it. Keep product vocabulary and heading/link anchors stable.
- Mark future paths and proposed behavior explicitly until implementation or approval exists.
- User-facing instructional content belongs in the future versioned content inventory and follows the same pull-request/release process as code.
- Public API changes must include generated contract changes. Schema changes must include migration and compatibility/rollback analysis. Terraform changes must include reviewed plans for each affected environment, never committed state/plan artifacts.
- A pull request cannot close an `OQ-*` implicitly. Add the approved decision record, owner, date, rationale, alternatives, and affected-document updates first.
- If source and documentation conflict, report the contradiction and correct the authoritative set; do not preserve convenient stale text.

## 11. Prohibited shortcuts

Do not:

- implement behind an unresolved decision gate or turn a recommendation/proposal into a default;
- add unrequested MVP scope, dependencies, services, remote content, analytics, or AWS resources;
- bypass domain ownership through shared-package business logic or direct cross-context table mutation;
- trust client-calculated answers, rewards, stages, daily counts, balances, roles, or family identifiers;
- use floating-point money, mock-only financial tests, or SQLite as PostgreSQL evidence;
- award twice on retry, resolve a request twice, consume reserved funds through adjustment, or persist mixed item snapshots;
- expose correct answers before the server permits reveal, or continue reward-bearing play offline;
- log request/response bodies by default or put sensitive/participant data in any development or delivery artifact;
- hand-edit generated contracts, rewrite applied migrations, commit secrets/state/plans, or make manual cloud changes the undocumented source of truth;
- weaken tests, authorization, privacy, accessibility fallback, security headers, or quality gates to finish a task; or
- claim implementation, deployment, compliance, usability, educational, cost, or release evidence that has not been produced.

## 12. Current repository phase

The repository contains the platform health slice, migrations, generated REST contract tooling, Docker/Compose, platform component/browser tests and PR quality automation. The ignored root `.env` and `.pi` are local state, never inputs. Domain schemas/content, Terraform and deployment remain unimplemented. Task 14 adds real typed lint and security gates; dependency overrides remove the disclosed Drizzle Kit/esbuild advisory and currently identified transitive advisories without suppressing scans. Live GitHub/Sonar/required-check evidence must still be established externally. See `docs/testing.md` for exact commands, evidence and limitations; passing local checks do not establish release readiness.

The technical and implementation baselines are conditional. Reversible repository/tooling work may proceed only through an approved issue; feature work must obey its Phase 0 dependencies. The project is **not ready for feature implementation commitment or pilot release**. Local platform code/test evidence does not establish legal/privacy approval, educational-content approval, target-age usability, cost, AWS deployment or independent release-audit evidence.
