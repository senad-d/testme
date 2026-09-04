# Mobey Repository Guidance

**Scope:** Repository-wide guidance for coding agents  
**Current phase:** Planning baseline; no application, test, Docker, CI/CD, or Terraform implementation exists  
**Product release:** Family-loop MVP private pilot

## 1. Start here

Mobey is a child-friendly website game for children ages 7–9. Children answer whole-number money-learning questions, earn fictional Game Money, save toward parent-defined screen-time rewards, and request rewards for a parent to approve or reject. Parents fulfil approved screen time outside Mobey. Mobey does not process real money or control another application or device.

Before changing anything:

1. Read the issue and the applicable authoritative documents in section 2.
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

These are **intended future paths**, not current files:

```text
apps/web/                         React/Vite UI
apps/api/                         NestJS modular API and migrations
packages/shared/                  generated API client/types and small safe primitives
packages/content/                 reviewed learning, instruction, theme, and avatar content
tests/e2e/                        critical Playwright journeys
infra/terraform/bootstrap/        remote-state prerequisites
infra/terraform/modules/          AWS modules
infra/terraform/environments/     nonprod and prod roots
.github/                          future templates and workflows
compose.yaml                      future local stack
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

No verified local-development command exists today because `package.json`, lockfile, Dockerfiles, and `compose.yaml` have not been created. Do not document or claim a command works until it is committed and tested from a clean checkout.

The future Compose stack must provide one documented command for `web`, `api`, `db`, and one-shot `migrate` services. It must support web/API source hot reload, wait for database health and successful migration, use a persistent local database volume, and use explicit synthetic development-only secrets and allowlist data. It must not implicitly read the ignored root `.env`, use real participant data, or select insecure local cookie/development-secret behavior outside development. Production image stages must use frozen dependencies and non-root containers where compatible.

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

The intended pull-request gate blocks on format, lint, type-check, unit/component tests, affected API/database integration tests, generated-contract diff, critical browser smoke tests, image build, affected Terraform format/validate/plan, security scans, and SonarCloud. No such workflow exists yet. The current `sonar-project.properties` is stale: it has JavaScript-only test patterns, omits web/E2E test roots, and excludes CDK rather than Terraform. Retain SonarCloud and correct it when the real TypeScript/test paths are established.

Never weaken, skip, mock away, quarantine, or relabel a required check to obtain a pass. Do not claim that automation proves educational suitability, child usability, accessibility conformance, legal approval, or release readiness. Attach evidence from the exact commit and environment under review.

## 9. GitHub delivery workflow

The intended workflow is issue → branch → focused commits → pull request → independent review → squash merge. GitHub templates, branch protection, CODEOWNERS, and workflows do not exist yet; do not claim repository settings are enforced until verified. Do not invent maintainer or team handles for ownership rules.

- **Issue:** one approved implementation-plan task per issue, titled `[MVP][P<phase>] <task outcome>`. Include task number, `REQ-*`/`OQ-*` trace, dependencies, complete exact-file manifest, acceptance criteria, privacy/security impact, migration/rollback effect, and required evidence.
- **Branch:** after the issue is ready, update from `main` and create `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `infra/<issue>-<slug>`, `test/<issue>-<slug>`, or `docs/<issue>-<slug>`. Branch protection is intended but must be verified separately.
- **Commit:** use a Conventional Commit subject, for example `feat(learning): persist placement outcome`, and include `Refs #<issue>` in the body. Keep commits reviewable and truthful about evidence.
- **Pull request:** use a Conventional Commit title and `Closes #<issue>`. List requirement traces, exact changed paths, evidence, migrations/rollback, and threat/privacy effects. UI evidence uses synthetic data; concurrency evidence includes database assertions.
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

The repository currently contains planning documentation, a minimal `.gitignore`, an ignored root `.env`, and stale SonarCloud configuration. It has no application source, dependency manifests, lockfile, tests, Docker/Compose files, Terraform, GitHub templates/workflows, or verified development commands.

The technical and implementation baselines are conditional. Reversible repository/tooling work may proceed only through an approved issue; feature work must obey its Phase 0 dependencies. The project is **not ready for feature implementation commitment or pilot release**. No running-code, test, legal/privacy, educational-content, target-age usability, cost, AWS deployment, or independent release-audit evidence exists yet.
