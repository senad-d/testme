# Mobey Family-loop MVP — Phased Implementation Plan

**Status:** v1.0 planning baseline; executable after the applicable decision gates close  
**Independent-review amendment:** Source/repository review corrected missing repository guidance, issue-scope rules, platform dependency cycles, package/test scaffolding, security policy inputs, content/avatar ordering, module/router/generated-contract wiring, concurrency evidence, Terraform edge feasibility, and pilot-evaluation traceability.  
**Planning scope:** Family-loop MVP private pilot; this document does not authorize implementation  
**Authoritative inputs:** [`../discovery/mobey-initial-product-discovery.md`](../discovery/mobey-initial-product-discovery.md), [`../product/mobey-prd.md`](../product/mobey-prd.md), [`../technical/mobey-technical-spec.md`](../technical/mobey-technical-spec.md)

## Current-state evidence and plan boundary

At planning time the repository has no `apps/`, `packages/`, `tests/`, `infra/terraform/`, `.github/`, Docker setup, or application tests. It has the discovery and PRD, a minimal `.gitignore`, and a stale `sonar-project.properties` whose JavaScript-only test patterns and CDK exclusion conflict with the selected TypeScript/Terraform direction. Therefore every implementation file below is an exact intended path, not an existing file. This stage writes only this plan and its companion technical specification.

Each numbered task is intended to become one approved GitHub issue and one focused pull request. A task's `Where` section lists mandatory primary paths, not an artificial three-file ceiling. At issue creation, expand it into the complete exact changed-file manifest before marking the issue ready; keep the pull request focused on the stated outcome. A newly discovered ownership root, product behavior, migration, or deployment surface requires issue/plan amendment before coding—do not hide scope in a commit.

The following exact companion-path rules are part of every applicable `Where` section and must appear in the GitHub issue manifest:

- A public API route/DTO/error change regenerates `packages/shared/src/generated/api.ts`. The first endpoint in a bounded context adds its `<context>.module.ts` under `apps/api/src/modules/<context>/` and registers it in `apps/api/src/app.module.ts`; later endpoint tasks list modifications to that module explicitly.
- A routable web page or panel lists `apps/web/src/app/router.tsx` and every existing page into which it is mounted; the first routing task also updates `apps/web/src/main.tsx`. No component is accepted solely because an isolated test can render it.
- A task that adds or changes any user-facing instructional copy lists `packages/content/src/instruction-inventory.ts` after Task 24 establishes it, preserving the visible-text/narration mapping.
- Tests may list only the exact helpers/fixtures they actually add under `apps/api/test/support/` or `tests/e2e/support/`; real participant data remains prohibited.
- Terraform Task 49 lists and updates both `infra/terraform/environments/nonprod/main.tf` and `infra/terraform/environments/prod/main.tf` when it composes the modules. Generated plans/state are evidence artifacts, never committed paths.

These rules repair the cross-cutting wiring that the short primary lists would otherwise omit while retaining exact-path review at issue readiness.

## Phase order and evidence gates

| Phase | Tasks | Incremental outcome | Required gate evidence |
|---|---:|---|---|
| 0 — Approve unresolved inputs | 1–4 | Product, content, security/economy, privacy/cloud, and session-boundary decisions are explicit instead of embedded in code | Approved decision records identify owner/date/status for `OQ-01`–`OQ-15`; deferred blockers prevent dependent tasks from starting |
| 1 — Establish a reproducible platform | 5–15 | Pinned monorepo, runnable health slice, PostgreSQL migration path, local Compose, REST contract, CI and GitHub workflow | Clean clone runs frozen install/build/test; one Compose command reaches web/API/DB health; CI and Sonar pass; Terraform remains untouched |
| 2 — Secure a family and child | 16–23 | Allowlisted registration, parent sessions, Authorized Browsers, profiles, PIN child access, role boundary | Real-PostgreSQL API evidence for two-family isolation/revocation/lock policy plus browser evidence for registration → profile → child entry |
| 3 — Deliver the learning/earning loop | 24–33 | Approved content, Placement, daily/session lifecycle, 3/2/1/0 scoring, retry-safe Game Money, progression, summaries | Content approval; unit/property/integration evidence; browser run for Placement and a 10-challenge session including disconnect/retry/TTS fallback |
| 4 — Deliver the family reward loop | 34–42 | Shared catalog, Saving Goal, reserve/resolve requests, adjustments/history, concurrency safety | Browser evidence for earn → save/request → parent resolve and real-PostgreSQL race tests with a balanced ledger |
| 5 — Complete privacy and pilot experience | 43–46 | Consent-gated analytics if approved, profile/family deletion, responsive/access checks, complete critical journeys | Privacy approval, deletion proof, no-event-without-consent proof, approved browser matrix results, all `REQ-*` traced |
| 6 — Deploy the private pilot | 47–51 | Isolated Terraform environments, selected AWS baseline, automated nonprod/manual prod, operations and release verdict | Reviewed plans/cost estimate, nonprod deployment/smoke, restore/deletion/allowlist runbooks, manual production approval, signed readiness report |

Task numbers are stable trace identifiers; the `Depends on` graph is the executable order within each phase. In particular, Task 12 intentionally precedes Task 11 so the migration service has a runner. Tasks may run in parallel only when their dependency closure and applicable phase gates permit it. Phase evidence is attached to the final pull request or release report; command output must identify the commit SHA and environment rather than being copied from an unrelated run.

## GitHub issue, branch, commit, and pull-request conventions

- **Issue:** create from `.github/ISSUE_TEMPLATE/mvp-task.yml` with title `[MVP][P<phase>] <task outcome>`. Include the task number, `REQ-*`/`OQ-*` trace, exact paths, dependencies, acceptance criteria, privacy/security impact, and required evidence. A blocked open decision stays visible and is not replaced with an engineering assumption.
- **Branch:** branch from current protected `main` only after the issue is ready. Use `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `infra/<issue>-<slug>`, `test/<issue>-<slug>`, or `docs/<issue>-<slug>`. Never combine independent issues merely to reduce pull-request count.
- **Commits:** use Conventional Commit subjects such as `feat(learning): persist placement outcome`; include `Refs #<issue>` in the body. Do not include participant data, secrets, generated credentials, or misleading “passes” claims.
- **Pull request:** use the repository template; title is a Conventional Commit summary; link `Closes #<issue>`; list requirement traces, exact changed paths, migration/rollback effect, threat/privacy review, and reproducible evidence. UI work includes desktop/tablet/phone screenshots or recordings with synthetic data. Concurrency work includes database assertions, not screenshots.
- **Review/merge:** no direct pushes to `main`; require an independent reviewer and all status checks. Resolve generated-contract/migration/Terraform-plan diffs in the PR. Squash-merge so the issue/trace remains in one mainline commit. Production uses the protected GitHub `production` Environment and a separate manual approver.
- **Scope:** “MVP” labels only tasks 1–51. Later candidates are not pre-approved issues and cannot be slipped into an MVP pull request.

## Traceability overview

| Requirement group | Primary tasks |
|---|---|
| REQ-PROD | 1, 17, 24–33, 50–51 |
| REQ-AUTH | 3, 16–23, 42, 46 |
| REQ-CHILD | 16, 20–23, 44, 46 |
| REQ-LEARN / REQ-GAME | 2–3, 24–33, 42, 46 |
| REQ-UX / REQ-CUR | 1–2, 21, 24, 27, 31, 45–46 |
| REQ-SHOP / REQ-REQ / REQ-BAL | 3, 28, 34–42, 46 |
| REQ-PARENT | 21, 33, 35–41, 44, 46 |
| REQ-PRIV | 1, 4, 43–46, 50–51 |
| Delivery `[A]`, `U-19`–`U-21`, repository guidance `U-23` | 5–15, 47–51 (Task 15 owns `U-23`) |
| OQ-01–OQ-15 | 1–4; dependent tasks name the relevant gate |

## MVP versus later work

Tasks 1–51 cover only the decided Family-loop MVP. Explicitly later and absent from these tasks are real payments/conversion, virtual inventory, device/app control, additional caregivers, verification/recovery/credential changes, third-party auth, multilingual/native apps, chat/social/leaderboards/ads/uploads, CMS, notifications, automated text moderation, a formal WCAG claim, and public launch. Potential post-pilot hardening—multi-AZ/stronger recovery beyond the approved pilot target, richer telemetry, credential recovery, moderation, extra roles/languages, and accessibility conformance—requires separate discovery and GitHub issues after Task 51's verdict.

## Phase 0 — Approve unresolved inputs

### 1. Approve pilot product, legal, measurement, onboarding, browser, and session gates

- [ ] Record approved or explicitly deferred answers for jurisdiction, pilot success/usability thresholds, empty-family/catalog behavior, family-timezone refresh and day-boundary behavior, duplicate/concurrent Game Session start behavior, and the supported browser/TTS matrix, tracing `OQ-01`, `OQ-02`, `OQ-08`, `OQ-10`, `OQ-14`, and `OQ-15` without converting recommendations into requirements.

#### Why

Registration/privacy cannot claim legal readiness, onboarding cannot be accepted, and browser/usability evidence cannot pass while these product decisions are open. [REQ-PROD-04–05, REQ-UX-02–06, REQ-PRIV-06]

#### How

Depends on: none. Kind: specification. Obtain named product, privacy/legal, design, and QA owners; document decision, rationale, rejected alternative, effective environment, approval date, and any release blocker. A deferral must state why private-pilot work remains safe and which later task is stopped.

#### Where

`docs/decisions/mobey-pilot-product-gates.md`

`docs/research/mobey-pilot-evaluation-plan.md`

#### Acceptance criteria

- The decision file covers all six named OQs and links the exact PRD/discovery sections.
- The evaluation plan gives each `REQ-PROD-05` dimension an approved measure, pre-pilot decision threshold, consent-inclusive evidence method, owner, and analysis timing; it also covers the approximate 10-minute session target, target-age recruitment without storing age in product data, currency/reward comprehension, and acceptability of a screen-time incentive.
- No numeric threshold, jurisdictional claim, setup flow, browser version, or TTS expectation remains implicit in dependent acceptance.
- Required approvers mark each item approved or blocking-deferred; unresolved blocking items visibly stop Tasks 17, 21, 29, 31, 42, 45, 50, or 51 as applicable.

### 2. Approve the educational curve and child-facing content brief

- [ ] Define and approve the exact stage/session amount bands, templates, progressive hints, explanations, English instruction scripts, avatar/theme assets, and review process for `OQ-03` and `OQ-12`.

#### Why

The mechanics are decided, but implementation cannot invent educational difficulty or final child-facing assets. [REQ-LEARN-06, REQ-GAME-08–12, REQ-UX-01–04, REQ-UX-07]

#### How

Depends on: none. Kind: specification. Use educator/content and child-design review to define schema-ready examples for all three stages and Placement, while preserving whole-number 0–100 values and approved denominations. Record rejected content alternatives and licensing/provenance for assets.

#### Where

`docs/content/mobey-learning-and-content-brief.md`

#### Acceptance criteria

- Two Placement items per skill and the sessions 1–10 difficulty progression have reviewable definitions without requiring code interpretation.
- Hint levels one/two, reveal/explanation, visible instruction, narration text, exact-repeat signature, themes, and avatar manifest acceptance are specified.
- Product/content owners approve the brief; automated schema tests are not treated as educator or child-safety approval.

### 3. Approve credential/session defense, idempotency retention, and balance bounds

- [ ] Close `OQ-04`, `OQ-07`, and `OQ-11` with an approved authentication/session-defense policy and economy data decision consistent with the technical specification.

#### Why

Lockout tests need real thresholds/scopes, and financial schema/code must not guess retention or overflow behavior. [REQ-AUTH-10, REQ-GAME-11, REQ-REQ-09, REQ-BAL-01–05]

#### How

Depends on: none. Kind: specification. Security approves parent/PIN attempt count, window, lock duration, family/device/IP or other scopes, parent-session inactivity/absolute lifetimes, parent-mode reauthentication lifetime, Authorized Browser persistence/reauthorization lifetime, and the PIN verifier/blind-index key-rotation procedure. Architecture/privacy approves opaque challenge-source ledger evidence, command receipts, retention, decimal-string transport, and the proposed PostgreSQL signed-bigint ceiling or documents a safer replacement.

#### Where

`docs/decisions/mobey-auth-and-economy-policy.md`

#### Acceptance criteria

- Authentication values and scope are testable, configurable, non-enumerating, and separately justified for password and low-entropy PIN threats; no production session/browser lifetime falls back to an implicit default.
- Rotation defines overlap, candidate uniqueness checks under every active blind-index key, reindex/reset completion evidence, retirement criteria, and failure behavior for a missing key.
- Ledger/receipt fields and retention deduplicate retries without permanent question/answer history.
- Maximum checked value and exact no-write error behavior are approved; no JavaScript floating-point arithmetic is permitted for durable balances.

### 4. Approve privacy lifecycle, analytics, scale/cost, and cloud operations

- [ ] Close or explicitly block on `OQ-05`, `OQ-06`, `OQ-09`, and `OQ-13`, including capacity/budget/region, legal data lifecycle, typed optional-event contract, AWS isolation/sizing/recovery/secrets/observability.

#### Why

Optional analytics, deletion acceptance, retention, and production Terraform cannot safely be inferred from the selected high-level AWS shape. [REQ-PRIV-02–06, `U-20`, `U-22`]

#### How

Depends on: none. Kind: specification. Obtain privacy/legal, product research, security, operations, and budget-owner approval. Include event-by-event purpose/fields/access/deletion or explicitly choose no optional analytics for the pilot. Compare public-IP Fargate tasks restricted by security groups against private tasks with NAT/endpoints and record the selected cost/security trade-off. Identify AWS account ownership, controlled origin DNS names, certificate regions, and the CloudFront-to-ALB distribution-proof/state/rotation approach required for end-to-end TLS.

#### Where

`docs/decisions/mobey-privacy-analytics-cloud-policy.md`

#### Acceptance criteria

- Registered families, peak sessions/data, AWS region, monthly ceiling, environment accounts, controlled origin DNS/certificates, sizes/scaling, backup/log/audit retention, deletion SLA, RTO/RPO, restore test, alert routing, CloudFront origin-proof rotation/state treatment, and Terraform state approach have owners/status.
- Any approved analytics event has a fixed schema excluding nickname, email, PIN, and answer text; “no analytics” remains a valid full-function path.
- The decision distinguishes active-store deletion from backups/restores and contains no unsupported legal compliance claim.

## Phase 1 — Establish a reproducible platform

### 5. Create the pinned workspace and task graph

- [ ] Create the pnpm/Turborepo workspace with reproducible install, build, type-check, lint, test, contract, and infrastructure script entry points.

#### Why

All selected applications/packages need one deterministic command surface before vertical slices can be built. [`U-19`, `U-20`]

#### How

Depends on: none. Kind: code. Pin the package manager and compatible supported Node.js LTS policy, declare only the approved workspace roots, and make task dependencies/cache outputs explicit; do not add an application feature.

#### Where

`package.json`

`pnpm-workspace.yaml`

`turbo.json`

`.node-version`

`.terraform-version`

#### Acceptance criteria

- A clean checkout can invoke every declared root task without an undeclared workspace root.
- Package manager, Node.js patch, and Terraform CLI pins are defined once; Tasks 11, 14, 47, and 50 must consume them, and the Phase 1/6 gates reject drift rather than requiring not-yet-created paths in this task.
- Build/test outputs and non-cacheable migration/deployment tasks are distinguished in the task graph.

### 6. Add shared TypeScript, lint, and format policy

- [ ] Establish strict TypeScript, ESLint, and Prettier configuration for browser, Node, tests, generated files, and Terraform-adjacent repository content.

#### Why

A single TypeScript codebase needs consistent safety and review output before package scaffolding. [`U-19`, `U-20`]

#### How

Depends on: Task 5. Kind: code. Enable strict null/index/catch handling, prohibit unsafe money coercion patterns where lint can, and exclude generated output without excluding source or tests from quality analysis.

#### Where

`tsconfig.base.json`

`eslint.config.mjs`

`.prettierrc.json`

#### Acceptance criteria

- Deliberate unsafe TypeScript and formatting fixtures fail the intended command during PR review and are removed before merge.
- Browser and Node globals are scoped to their packages instead of enabled globally.
- Generated API code is formatted/checked according to a documented non-edit policy.

### 7. Declare web, API, and shared package manifests

- [ ] Add package manifests and scripts for React/Vite, NestJS/Fastify, and generated shared contracts using mutually compatible pinned dependency ranges.

#### Why

The main deployables and contract package need explicit dependency ownership. [`U-19`]

#### How

Depends on: Tasks 5, 6. Kind: code. Keep runtime dependencies local to their package, expose only generated/safe shared exports, and provide build/type/test scripts consumed by the root graph.

#### Where

`apps/web/package.json`

`apps/api/package.json`

`packages/shared/package.json`

`packages/shared/tsconfig.json`

`packages/shared/src/index.ts`

#### Acceptance criteria

- Workspace dependency resolution has no undeclared cross-package import.
- The API selects Nest's Fastify adapter and the web selects React/Vite; no second server or UI framework is introduced.
- Shared contracts build without importing API database/domain services.

### 8. Declare content/E2E packages and freeze dependency resolution

- [ ] Add manifests for versioned content and Playwright E2E, then commit the frozen pnpm lockfile.

#### Why

Content and browser acceptance are release artifacts, and dependency resolution must be reproducible before CI/Docker evidence is trusted. [REQ-UX-07, `U-20`]

#### How

Depends on: Task 7. Kind: code. Content dependencies remain deterministic/offline; E2E receives Playwright and accessibility helpers only; generate the lockfile with the selected package-manager version.

#### Where

`packages/content/package.json`

`packages/content/tsconfig.json`

`packages/content/src/index.ts`

`tests/e2e/package.json`

`tests/e2e/tsconfig.json`

`pnpm-lock.yaml`

#### Acceptance criteria

- Frozen installation succeeds from a clean package-store state.
- No CMS, remote content generator, analytics SDK, or real participant fixture enters the dependency graph.
- Dependency/license/security review output is attached to the pull request.

### 9. Add application compiler and bundler configuration

- [ ] Configure strict API/web TypeScript compilation and Vite's development/build behavior, including same-origin `/api` proxying locally.

#### Why

The runtime slice and generated client need explicit browser/server boundaries and reproducible builds.

#### How

Depends on: Tasks 6, 7. Kind: code. Extend the shared TypeScript baseline, emit no browser secrets, and configure Vite to proxy only local API traffic without changing production routing assumptions.

#### Where

`apps/api/tsconfig.json`

`apps/web/tsconfig.json`

`apps/web/vite.config.ts`

#### Acceptance criteria

- API and web type-check under their correct platform libraries.
- A browser build contains no server-only module or environment secret.
- Local `/api/v1` requests route to the API while production remains CloudFront-configured.

### 10. Create the minimal runnable web/API health slice

- [ ] Bootstrap the Nest application and React root with liveness/readiness behavior and no domain feature assumptions.

#### Why

A minimal end-to-end process proves the chosen runtime before identity and financial work builds on it.

#### How

Depends on: Tasks 8, 9. Kind: code. Configure Fastify validation/body limits and graceful shutdown, expose non-sensitive live/ready endpoints through the application module, and render web build/version plus API readiness status for smoke testing.

#### Where

`apps/api/src/main.ts`

`apps/api/src/app.module.ts`

`apps/web/src/main.tsx`

#### Acceptance criteria

- API liveness succeeds without database access; readiness fails safely when required dependencies/configuration are absent.
- The web loads and calls readiness without exposing stack traces or environment secrets.
- API and web build/type-check through root tasks.

### 11. Add hot-reloading local Docker Compose

- [ ] Provide web, API, PostgreSQL, and one-shot migration services with health ordering, source hot reload, persistent local DB storage, development-only auth secrets/cookies, and non-root production stages.

#### Why

One full-stack Docker Compose command is a validated delivery constraint. [`A`, `U-20`]

#### How

Depends on: Tasks 10, 12. Kind: code. Use development image targets/bind mounts without masking workspace dependencies; use only inline/generated synthetic local database, allowlist, CSRF, PIN-pepper, blind-index, and token configuration; select the explicit localhost cookie policy; make API readiness depend on migration success and DB health. Do not read the ignored host `.env` implicitly.

#### Where

`compose.yaml`

`apps/api/Dockerfile`

`apps/web/Dockerfile`

`package.json`

`README.md`

#### Acceptance criteria

- The documented Compose up command starts all four services from a clean checkout and the web reaches API readiness.
- Editing web/API source triggers reload without rebuilding the full image.
- No host `.env`, participant data, root container, or production secret is copied into an image layer; startup rejects development secrets/insecure cookie mode outside development.
- A documented explicit seed command creates only deterministic synthetic family/content data and never runs automatically in production.

### 12. Establish PostgreSQL access and migration discipline

- [ ] Configure Drizzle/`pg`, bounded connection management, checked SQL migrations, and the initial platform migration ledger.

#### Why

All domain slices depend on real PostgreSQL behavior, and migrations need a deployment-safe baseline before schemas appear.

#### How

Depends on: Tasks 7, 10. Kind: code. Use a real PostgreSQL test container before Compose exists, require TLS outside local development, parameterize pool/timeouts, record applied migration checksums, and make migration failure stop readiness/deployment.

#### Where

`apps/api/drizzle.config.ts`

`apps/api/src/database/client.ts`

`apps/api/src/database/migrate.ts`

`apps/api/src/database/migrations/0001_platform.sql`

`apps/api/src/app.module.ts`

`apps/api/test/platform-migration.integration.spec.ts`

#### Acceptance criteria

- Migration from an empty real-PostgreSQL integration database succeeds once and a checksum/order mismatch fails explicitly.
- API readiness reports unavailable when the database or required migration is absent.
- Integration setup uses PostgreSQL, not an SQLite or in-memory substitute.

### 13. Generate the REST contract and stable problem details

- [ ] Implement OpenAPI generation, RFC 9457 errors, request IDs, strict validation, decimal-string money schema, and committed generated TypeScript contracts.

#### Why

Web/API work needs one drift-checked contract and safe, stable retry/conflict errors. [REQ-BAL-05; technical specification section 11]

#### How

Depends on: Tasks 10, 12. Kind: code. Centralize redaction and error mapping, reject unknown fields, define stable code extensions, and generate the client/types without hand edits.

#### Where

`apps/api/src/common/http/problem-details.filter.ts`

`apps/api/src/openapi.ts`

`packages/shared/src/generated/api.ts`

`apps/api/test/http-contract.spec.ts`

#### Acceptance criteria

- Representative validation, auth, state conflict, lock, resolved-request, and overflow responses validate as `application/problem+json` without sensitive echo.
- Two consecutive generations are byte-identical; CI detects stale generated output.
- Durable money is represented as validated decimal strings, not JSON floating-point numbers.

### 14. Make CI, SonarCloud, and repository hygiene blocking

- [ ] Add the full pull-request quality workflow, update SonarCloud for actual TypeScript/web/API/package/E2E paths and Terraform, and ignore generated local/build/state/secret artifacts.

#### Why

`U-20` requires blocking quality checks and retained SonarCloud; current Sonar and ignore rules are stale/incomplete.

#### How

Depends on: Tasks 11, 13. Kind: code. Run frozen install, format/lint/type-check, unit/component, PostgreSQL integration, critical E2E smoke, contract diff, image build, Terraform checks when present, security scans, and Sonar quality gate. Grant pull-request jobs read-only/minimal permissions.

#### Where

`.github/workflows/ci.yml`

`sonar-project.properties`

`.gitignore`

`tests/e2e/platform-smoke.spec.ts`

#### Acceptance criteria

- A TypeScript test in web/API/packages is included; build/generated/vendor output and `infra/terraform` state are excluded without a CDK assumption.
- The committed platform Playwright smoke proves the production-built web reaches API readiness; intentional format/type/test/contract/Sonar failures block a test pull request.
- Secrets, `.env*` exceptions, Terraform state/plan files, dependency/build/test output, and local volumes cannot be accidentally committed under the documented policy.

### 15. Install repository guidance plus GitHub issue, review, and ownership templates

- [ ] Add the required `AGENTS.md` and encode this plan's issue/PR evidence fields and code ownership so every later slice is traceable and independently reviewed.

#### Why

The assignment requires issue/branch/commit/PR delivery; conventions only in prose are easy to bypass.

#### How

Depends on: none. Kind: documentation. Before the issue is ready, the repository owner supplies real maintainer/team handles. Make requirement/OQ trace, dependencies, complete exact-file manifest (including companion paths above), acceptance evidence, migration/privacy/security impact, and later-work exclusion mandatory template prompts. Assign domain/infrastructure/privacy review groups only from verified handles; if none are available, keep Task 15 blocked rather than committing invalid CODEOWNERS.

#### Where

`.github/ISSUE_TEMPLATE/mvp-task.yml`

`.github/pull_request_template.md`

`.github/CODEOWNERS`

`AGENTS.md`

#### Acceptance criteria

- A sample MVP issue and pull request can represent every section required by this plan without free-form omission.
- CODEOWNERS uses verified handles and requires review for application, content, privacy, workflow, and Terraform paths; branch protection is configured/verified outside the file rather than merely claimed by it.
- `AGENTS.md` records repository commands, architecture/domain vocabulary, requirement/OQ discipline, child-data/logging prohibitions, generated-contract/migration/Terraform rules, and issue/branch/commit/PR expectations without inventing an open decision.
- Branch/commit/squash/protected-main conventions in this plan are linked from the templates.

## Phase 2 — Secure a family and child

### 16. Create the identity and family schema

- [ ] Add family, parent/acceptance, parent session, Authorized Browser, auth-attempt, Child Profile, and child access-session records with tenant and uniqueness constraints.

#### Why

Identity invariants must exist in PostgreSQL before access endpoints can be trusted. [REQ-AUTH-01–10, REQ-CHILD-01–06]

#### How

Depends on: Tasks 3, 12. Kind: code. Include normalized-email uniqueness, one parent per family, sibling case-folded nickname and PIN-blind-index uniqueness, ten-profile transactional enforcement, hashed-token records, and a partial unique active Child Session index.

#### Where

`apps/api/src/database/schema/identity.ts`

`apps/api/src/database/migrations/0002_identity.sql`

`apps/api/test/identity-schema.integration.spec.ts`

#### Acceptance criteria

- Real-PostgreSQL tests reject duplicate email, second parent, sibling nickname/PIN equivalents, profile 11, cross-family foreign references, and two active child sessions.
- No schema field requests child real name, email, age/birth date, or upload.
- Raw passwords, PINs, and opaque tokens have no persistence column.

### 17. Deliver allowlisted registration and parent sessions

- [ ] Implement non-enumerating allowlist registration, authority/terms/privacy acceptance, Argon2id parent password verification, parent login/logout, and family Currency Skin/timezone settings.

#### Why

The sole parent must securely create and enter a Family before authorizing browsers or managing children. [REQ-AUTH-01–06, REQ-CUR-01–04]

#### How

Depends on: Tasks 1, 3, 13, 16. Kind: code. Apply the technical specification's single email/password canonicalization rules in both allowlist ingestion and registration, read participant values from a secret-backed provider, atomically create the Family/Parent/acceptance, issue only hashed opaque sessions with approved lifetimes in the declared independent cookies, and persist one presentation skin while keeping every stored numeric amount unchanged. Allowlist load/refresh failure is fail-closed without logging values.

#### Where

`apps/api/src/modules/identity/identity.controller.ts`

`apps/api/src/modules/identity/identity.service.ts`

`apps/api/test/parent-registration.integration.spec.ts`

#### Acceptance criteria

- Allowlisted registration with both affirmations succeeds once; ineligible/existing/invalid attempts do not enumerate eligibility or persist partial records.
- Password Unicode-code-point boundaries 12/128 pass and 11/129 fail without trimming/normalization; canonical-equivalent/case/domain email fixtures produce the documented unique allowlist/account behavior; logs/errors contain no email/password/secret value.
- Parent logout revokes the parent session without revoking an independent Authorized Browser; Currency Skin changes no stored amount.

### 18. Enforce parent-mode, CSRF, and approved authentication defenses

- [ ] Add principal guards, password-required parent-mode transition, CSRF/origin checks, generic auth errors, and the approved password/PIN throttling and temporary-lock policy.

#### Why

Client routing and browser authorization must never grant parent authority, and low-entropy PIN/password guessing is an explicit risk. [REQ-AUTH-09–10]

#### How

Depends on: Tasks 3, 16, 17. Kind: code. Derive family/principal server-side, bind CSRF to sessions, enforce the approved parent/session/browser lifetimes without defaults, store pseudonymous lock buckets in PostgreSQL, use `Retry-After` only from approved policy, and prevent parent/child credentials or request bodies from entering logs. Every state-changing guard locks/rechecks the session within the domain transaction so revocation and mutation serialize.

#### Where

`apps/api/src/common/auth/principal.guard.ts`

`apps/api/src/modules/identity/auth-defense.service.ts`

`apps/api/test/auth-defense.integration.spec.ts`

#### Acceptance criteria

- Authorized Browser and Child Session credentials fail every parent-only endpoint; entering parent mode requires a correct password each transition.
- Missing/foreign Origin or CSRF proof blocks mutation while valid same-origin use succeeds.
- Approved threshold/window/scope and parent/session/browser lifetime tests expire deterministically with a fake clock and generic responses; no invented default remains.
- A mutation racing logout, browser revocation, PIN change, parent end, or timeout has a deterministic database order and cannot commit after the revocation-side transaction wins.

### 19. Deliver Authorized Browser lifecycle

- [ ] Let a parent authorize/list/revoke browser grants that survive parent logout, and immediately end child access associated with a revoked browser.

#### Why

Child PINs are valid only on a parent-authorized browser, and revocation is the parent's device control. [REQ-AUTH-06–08]

#### How

Depends on: Tasks 16, 17, 18. Kind: code. Store token hashes only, return safe user-recognizable last-used metadata, rotate on reauthorization, and revoke grant plus related Child Sessions transactionally.

#### Where

`apps/api/src/modules/identity/browser-authorization.controller.ts`

`apps/api/src/modules/identity/browser-authorization.service.ts`

`apps/api/test/browser-authorization.integration.spec.ts`

#### Acceptance criteria

- A grant permits family child options after parent logout but cannot call a parent endpoint.
- Revocation rejects later PIN entry and invalidates active child access through that browser without affecting another family's grant.
- Listing never returns token/hash or unnecessary fingerprint data.

### 20. Deliver parent-managed Child Profiles

- [ ] Implement profile create/list/update, app-avatar validation, sibling nickname/PIN uniqueness, PIN change invalidation, and ten-profile limits.

#### Why

Profiles are the child tenancy/access unit and must enforce minimization and sibling-local identity rules. [REQ-CHILD-01–06]

#### How

Depends on: Tasks 1, 2, 3, 16, 17, 18. Kind: code. Implement the approved avatar manifest as the first runtime content artifact, validate NFC/case-folded nicknames and ASCII 4–6 digit PIN strings without losing leading zeroes, create a secret-peppered Argon2id PIN verifier plus separately keyed blind index, check candidate uniqueness under every active blind-index key while holding the Family lock, and revoke the child's active session on PIN change. Task 24 extends rather than replaces this manifest.

#### Where

`apps/api/src/modules/identity/child-profile.controller.ts`

`apps/api/src/modules/identity/child-profile.service.ts`

`apps/api/test/child-profile.integration.spec.ts`

`packages/content/src/avatar-manifest.ts`

`packages/content/src/index.ts`

#### Acceptance criteria

- Boundary and duplicate cases from REQ-CHILD-01–05 pass/fail with stable safe errors and no partial profile.
- Old PIN and active child token fail immediately after PIN change on every Authorized Browser; leading-zero PINs round-trip as strings.
- Duplicate detection works across overlapping blind-index key versions and concurrent profile create/change; a key cannot retire until all dependent profiles are reindexed or reset.
- Two-family tests cannot list or mutate another family's profile; responses never expose PIN hash/blind index.

### 21. Deliver parent onboarding and family management UI

- [ ] Build registration/login, authority/terms acceptance, explicit browser authorization, family timezone/Currency Skin, Child Profile, and Authorized Browser management against the generated client.

#### Why

The parent needs a usable setup/control path before a child can enter; empty behavior must follow approved `OQ-08`, and the family-timezone refresh/day-boundary rule must follow approved `OQ-14`. [REQ-AUTH-01–09, REQ-CHILD-01–06, REQ-CUR-01–04, REQ-PARENT-04]

#### How

Depends on: Tasks 1, 17, 19, 20. Kind: code. Use accessible labelled fields, server problem details, password-manager-safe credential inputs, browser-detected IANA timezone refresh under `OQ-14`, approved empty-state flow, and text-only participant fixtures.

#### Where

`apps/web/src/features/parent/ParentOnboardingPage.tsx`

`apps/web/src/features/parent/FamilyAccessSettings.tsx`

`apps/web/src/features/parent/parent-onboarding.component.spec.tsx`

#### Acceptance criteria

- Component/browser evidence covers eligible registration through browser authorization and first profile plus zero-profile/zero-item behavior exactly as approved.
- Password/PIN values are not persisted in web storage, replayed in errors, or shown after submission.
- Currency changes restyle synthetic displayed amounts 1:1; timezone changes use an explicit parent action, and the refresh/day-boundary behavior stays gated by `OQ-14`.

### 22. Deliver one-active Child Session and PIN entry API

- [ ] Implement family child options on Authorized Browsers, PIN verification, one-active-session locking, server activity timeout, manual parent end, and revocation outcomes.

#### Why

The Child Session is distinct from a Game Session and is the server authority for child-only actions. [REQ-AUTH-08, REQ-GAME-06–07]

#### How

Depends on: Tasks 3, 18, 19, 20. Kind: code. Lock the guaranteed Family/Child Profile row before checking/inserting the possibly absent active-session row, create/reject access in one transaction, bind it to the browser grant, update activity through throttled server endpoints, use the approved PIN defense policy, and make the 15-minute boundary deterministic.

#### Where

`apps/api/src/modules/identity/child-access.controller.ts`

`apps/api/src/modules/identity/child-access.service.ts`

`apps/api/src/modules/identity/child-profile.controller.ts`

`apps/api/src/modules/identity/identity.module.ts`

`apps/api/test/child-access.integration.spec.ts`

#### Acceptance criteria

- Correct PIN works only with the matching family Authorized Browser; wrong/locked/cross-family cases are non-enumerating.
- Simultaneous valid starts yield exactly one active session and one `CHILD_SESSION_ALREADY_ACTIVE`; timeout/manual end release the lock.
- Parent end, browser revoke, PIN change, and profile deletion hooks all make the token unusable.

### 23. Deliver child selection, PIN, and role-transition UI

- [ ] Build the child profile selector/PIN flow, blocked-second-device/timeout states, child logout, and password-required return to parent mode.

#### Why

The child must enter independently on an Authorized Browser without gaining parent authority or receiving confusing credential errors. [REQ-AUTH-08–10, REQ-GAME-06–07]

#### How

Depends on: Tasks 21, 22. Kind: code. Use the generated client, numeric PIN input that does not store/display prior values, visible safe error recovery, server-time expiry handling, and parent-mode password reauthentication rather than a client-only route switch.

#### Where

`apps/web/src/features/child/ChildEntryPage.tsx`

`apps/web/src/features/child/ChildSessionBoundary.tsx`

`apps/web/src/features/child/child-entry.component.spec.tsx`

#### Acceptance criteria

- Authorized child can enter; unauthorized browser, wrong/locked PIN, active second device, timeout, and revocation have distinct child-safe recovery without identity leakage.
- Opening or typing a parent route cannot render protected data; parent transition submits a fresh password.
- No credential/token/nickname is written to local/session storage by this flow.

## Phase 3 — Deliver the learning and earning loop

### 24. Build the approved versioned content engine

- [ ] Encode approved Placement/session templates, 0–100/denomination constraints, hints/explanations/instructions, exact-repeat signatures, themes, and avatar manifest as deterministic versioned content.

#### Why

Learning and presentation must be reviewable, reproducible, server-authoritative, and deploy only through pull requests. [REQ-LEARN-01–07, REQ-GAME-08–12, REQ-UX-01–04, REQ-UX-07]

#### How

Depends on: Tasks 2, 8, 20. Kind: code. Extend the approved avatar manifest introduced by Task 20; generate challenge instances from explicit schema/version/seed inputs; separate unrevealed answer data from render-safe content; maintain a versioned inventory of every shipped user-facing instruction and its visible/narrated text; prohibit network/CMS/runtime-AI dependencies.

#### Where

`packages/content/src/content.ts`

`packages/content/src/content.schema.ts`

`packages/content/src/avatar-manifest.ts`

`packages/content/src/instruction-inventory.ts`

`packages/content/src/index.ts`

`packages/content/test/content.property.spec.ts`

#### Acceptance criteria

- Property tests prove whole integers 0–100, only 1/2/5/10/20/50/100 denominations, two Placement questions per skill, approved stage curve, stable no-repeat signatures, and at least 10 eligible unique signatures for every stage/session band or a specified fail-closed generation error.
- Hint one/two and explanation/instruction text exist for every generated case and validate against the approved brief.
- A content reviewer can map each content version to the approving pull request; answer material is not exported in a child render DTO before reveal.

### 25. Create learning, Placement, session, and summary schema

- [ ] Persist child progression/reset state, Placement aggregate, daily starts, Game Sessions, temporary challenges, and retained aggregate Session Summaries.

#### Why

Session limits, resume, reset, and no-surveillance retention need database invariants before behavior is added. [REQ-LEARN-01–10, REQ-GAME-01–08, REQ-PARENT-02–03]

#### How

Depends on: Tasks 2, 3, 12, 24. Kind: code. Add a dedicated `child_progressions` record as the sole current-stage/count/reset source (Identity does not own progression), captured stage/theme/content version/date, partial unique active Game Session, child/date-unique daily count constraint, temporary challenge state, and summary fields with no permanent submitted-answer/question payload.

#### Where

`apps/api/src/database/schema/learning.ts`

`apps/api/src/database/migrations/0003_learning.sql`

`apps/api/test/learning-schema.integration.spec.ts`

#### Acceptance criteria

- PostgreSQL rejects a fourth daily count, duplicate active game, invalid states/ordinals, and cross-child/family links.
- Session Summary can represent required skill accuracy/session outcome without individual question/answer history.
- Migration up from Task 16's schema and fresh migration both pass with no participant fixture.

### 26. Deliver Placement and prerequisite assignment

- [ ] Implement initial/reset six-question Placement, one answer/explanation each, no reward/daily slot, and exact prerequisite-based Stage assignment.

#### Why

Placement is the only allowed way to assign a child's starting Stage. [REQ-LEARN-01–04, REQ-LEARN-08–09]

#### How

Depends on: Tasks 20, 22, 24, 25. Kind: code. Generate two approved questions per skill, process one server-authoritative answer, persist only aggregate skill result after completion, and make retries state-safe without a balance dependency.

#### Where

`apps/api/src/modules/learning/placement.controller.ts`

`apps/api/src/modules/learning/placement.service.ts`

`apps/api/test/placement.integration.spec.ts`

#### Acceptance criteria

- All prerequisite pass/fail combinations assign Exact Amounts, Affordability, or Change exactly as REQ-LEARN-03 states.
- Six answers produce explanations, zero Game Money, zero daily starts, and no second answer per challenge.
- Initial and post-reset Placement work only for the authenticated child; permanent storage contains aggregates, not submitted answers.

### 27. Deliver the child Placement experience

- [ ] Render Placement instructions, one-answer questions, explanations, progress, visible text, and replayable non-blocking browser speech.

#### Why

The child must complete Placement accessibly before scored play. [REQ-LEARN-01–03, REQ-UX-01–03]

#### How

Depends on: Tasks 23, 26. Kind: code. Use semantic controls and a shared speech adapter that treats unsupported/rejected/muted speech as non-blocking; never expose reward UI or retry after a Placement answer.

#### Where

`apps/web/src/features/child/placement/PlacementPage.tsx`

`apps/web/src/accessibility/speech.ts`

`apps/web/src/features/child/placement/placement.component.spec.tsx`

#### Acceptance criteria

- Six-question flow shows each approved explanation and final assigned-stage transition without balance change.
- Visible text and controls remain usable when speech API is missing, throws, is muted, or is replayed repeatedly.
- Focus and progress move predictably after each one-answer transition.

### 28. Create checked Reward Balance and immutable ledger schema

- [ ] Add available/reserved bigint balances, immutable ledger, approved command receipts, source uniqueness, and safe-bound constraints.

#### Why

Scored learning cannot award value safely until exact arithmetic and retry evidence are approved and enforced. [REQ-GAME-04, REQ-GAME-11, REQ-BAL-01–05]

#### How

Depends on: Tasks 3, 12. Kind: code. Implement the approved `OQ-07`/`OQ-11` decisions, family-qualified ownership, nonnegative/sum checks, decimal-string mapping, and no update/delete pathway for ledger entries.

#### Where

`apps/api/src/database/schema/economy.ts`

`apps/api/src/database/migrations/0004_economy.sql`

`apps/api/test/economy-schema.integration.spec.ts`

#### Acceptance criteria

- PostgreSQL rejects negative available/reserved, sum overflow, duplicate business source, and cross-family child links.
- Boundary mapping round-trips exact values without JavaScript `number`; one over-bound write fails with no row/ledger change.
- Migration backfills an exact zero balance for Child Profiles created before this schema and is retry-safe.
- Retained challenge ledger evidence has opaque source and reward only, not question, submitted answer, PIN, nickname, or email.

### 29. Deliver Game Session start, daily cap, resume, and end lifecycle

- [ ] Implement theme-selected 10-challenge Game Session start, three-start Family Timezone cap, approved `OQ-14` timezone-refresh behavior, approved `OQ-15` duplicate/concurrent-start behavior, 15-minute resume/abandon, and parent-end/reset-pending behavior.

#### Why

Starting—not completing—consumes the daily slot, active play must be deterministic across devices/timeouts, and the family-timezone refresh/day-boundary and concurrent-start outcomes remain gated by `OQ-14`/`OQ-15`. [REQ-LEARN-10, REQ-GAME-01–08]

#### How

Depends on: Tasks 1, 3, 22, 25, 28. Kind: code. Lock the guaranteed Child Profile/progression row before upserting the possibly absent daily row, calculate date from stored family timezone, apply the approved `OQ-14` timezone-refresh semantics and `OQ-15` session-start policy, capture stage/theme/content version, define before-versus-at timeout boundary, and apply a parent reset only after current game finalization.

#### Where

`apps/api/src/modules/learning/game-session.controller.ts`

`apps/api/src/modules/learning/game-session.service.ts`

`apps/api/src/modules/learning/learning.module.ts`

`apps/api/src/modules/identity/child-profile.controller.ts`

`apps/api/src/modules/identity/identity.module.ts`

`apps/api/test/game-session-lifecycle.integration.spec.ts`

#### Acceptance criteria

- Starts 1–3 succeed and start 4 fails for the stored-timezone date; abandonment never decrements usage; device timezone is irrelevant; `OQ-14` governs timezone refresh timing and day-boundary effects.
- Before 15 minutes resumes the same generated state; at/after 15 minutes finalizes abandonment and retains prior rewards.
- Concurrent starts follow the approved `OQ-15` policy and keep active-game accounting consistent with that decision; parent end and reset-during-play produce the specified terminal/next-Placement state.

### 30. Deliver challenge attempts and retry-safe Game Money awards

- [ ] Implement randomized no-repeat server challenges, progressive attempts, 3/2/1/0 outcomes, atomic immediate ledger awards, and idempotent retry responses.

#### Why

This is the learning-to-Game-Money integrity boundary and must not double-award on connection uncertainty. [REQ-GAME-04–05, REQ-GAME-08–13, REQ-BAL-01]

#### How

Depends on: Tasks 3, 24, 25, 28, 29. Kind: code. Evaluate structured integer answers server-side, update terminal challenge/session aggregates and Economy ledger in one transaction, key rewards by opaque challenge source, purge submitted answer data, and pause rather than issue a new challenge on uncertain save.

#### Where

`apps/api/src/modules/learning/game-session.controller.ts`

`apps/api/src/modules/learning/challenge.service.ts`

`apps/api/src/modules/learning/learning.module.ts`

`apps/api/src/modules/economy/economy.service.ts`

`apps/api/src/modules/economy/economy.module.ts`

`apps/api/test/challenge-reward.integration.spec.ts`

#### Acceptance criteria

- Correct attempts award exactly 3/2/1; three wrong answers reveal/explain and award 0; Practice Amounts never debit balance.
- Repeating the same completion command before/after a simulated timeout yields one terminal challenge and one ledger award.
- Ten generated challenges are current-stage and exact-signature unique; logs, summaries, analytics boundary, and retained rows contain no submitted answer.

### 31. Deliver resilient themed child Game Session UI

- [ ] Build theme choice, challenge/attempt/hint/explanation UI, reward feedback, 10-step progress, browser speech, and minimal IndexedDB reconnect/resume behavior.

#### Why

The child needs a responsive, understandable flow that stops reward-bearing progress offline and safely resumes an uncertain save. [REQ-GAME-01, REQ-GAME-03–05, REQ-GAME-09–10, REQ-UX-02–05]

#### How

Depends on: Tasks 2, 13, 23, 27, 29, 30. Kind: code. Cache only render-safe current challenge IDs/content and pending command ID, clear it on terminal/end/revocation, disable next progress offline, and keep visible text authoritative when speech fails.

#### Where

`apps/web/src/features/child/game/GameSessionPage.tsx`

`apps/web/src/features/child/game/current-challenge-cache.ts`

`apps/web/src/features/child/game/game-session.component.spec.tsx`

#### Acceptance criteria

- Each theme changes presentation only; equivalent challenge/state/reward behavior is demonstrated.
- Offline before save preserves the current question, blocks next reward-bearing action, then retries the same command and awards once after reconnect.
- Cache inspection finds no PIN/password/token/nickname/submitted/correct answer before reveal and is empty after all required terminal paths.

### 32. Deliver progression and retained Session Summaries

- [ ] Finalize exactly 10-challenge summaries, advance after ten completed sessions independent of accuracy, continue Change indefinitely, and expose aggregate reporting queries.

#### Why

Parents need durable skill/session summaries while progression remains completion-based and avoids permanent answer surveillance. [REQ-LEARN-04–07, REQ-PARENT-01–03]

#### How

Depends on: Tasks 25, 29, 30. Kind: code. Update summary/progression transactionally on completion, retain captured stage/content version and aggregate counts, preserve old summaries on reset, and expose family-scoped cursor queries.

#### Where

`apps/api/src/modules/reporting/reporting.controller.ts`

`apps/api/src/modules/reporting/reporting.service.ts`

`apps/api/src/modules/reporting/reporting.module.ts`

`apps/api/src/modules/learning/progression.service.ts`

`apps/api/src/modules/learning/challenge.service.ts`

`apps/api/src/modules/learning/learning.module.ts`

`apps/api/test/progression-reporting.integration.spec.ts`

#### Acceptance criteria

- Session 10 advances Exact/Affordability regardless of accuracy; Change remains Change after 10 and later sessions.
- Reset preserves prior summaries/economy/history and requires Placement before next game.
- Reports compute required skill accuracy and session totals without returning every question, answer, attempt timestamp, or hidden content answer.

### 33. Deliver parent learning and balance dashboard slice

- [ ] Show each child's exact decimal-string balance, Stage/progress, accuracy by skill, active/session state, and retained Session Summaries in parent mode.

#### Why

The learning slice is not vertically complete until a parent can understand progress and safely end/reset play. [REQ-PARENT-01–04]

#### How

Depends on: Tasks 21, 28, 32. Kind: code. Use generated family-scoped reporting contracts, current Currency Skin formatting over `BigInt`, explicit completion-not-mastery copy, parent end/reset confirmations, and cursor pagination.

#### Where

`apps/web/src/features/parent/ParentDashboardPage.tsx`

`apps/web/src/features/parent/ChildLearningSummary.tsx`

`apps/web/src/features/parent/parent-dashboard.component.spec.tsx`

#### Acceptance criteria

- Parent sees every required learning datum for each own-family child and no other-family data.
- Very large synthetic balances render exactly under all five skins with no conversion or precision loss.
- Reset/end controls show their effect, preserve required records, and never imply Stage completion is mastery.

## Phase 4 — Deliver the family reward loop

### 34. Create Reward Shop, Saving Goal, and Voucher Request schema

- [ ] Add ordered family Reward Shop items, one child Saving Goal, request snapshots/states, and database constraints for one pending request.

#### Why

Stable identity/snapshots and pending uniqueness are prerequisites for safe reservation/resolution. [REQ-SHOP-01–09, REQ-REQ-01–09]

#### How

Depends on: Tasks 3, 12, 28. Kind: code. Allow duplicate labels, enforce validated field domains and family ownership, retain item snapshots, clear goals transactionally on item deletion, and use a partial pending-per-child unique index.

#### Where

`apps/api/src/database/schema/rewards.ts`

`apps/api/src/database/migrations/0005_rewards.sql`

`apps/api/test/rewards-schema.integration.spec.ts`

#### Acceptance criteria

- Schema supports duplicate-label distinct IDs and immutable label/duration/price request snapshots.
- Invalid ranges, cross-family goal/item/request links, and second pending request fail atomically.
- Fresh and sequential migrations pass against real PostgreSQL.

### 35. Deliver parent Reward Shop catalog API

- [ ] Implement parent create/edit/delete/reorder for one family-shared catalog with field validation, 20-active-item limit, and goal clearing.

#### Why

Parents define the only real-world rewards visible to all family children. [REQ-SHOP-01–05, REQ-SHOP-07, REQ-SHOP-09]

#### How

Depends on: Tasks 20, 34. Kind: code. Serialize active-count and reorder operations, use stable IDs/version checks, treat labels as plain text, preserve pending snapshots, and clear affected goals when deleting.

#### Where

`apps/api/src/modules/rewards/catalog.controller.ts`

`apps/api/src/modules/rewards/catalog.service.ts`

`apps/api/test/reward-catalog.integration.spec.ts`

#### Acceptance criteria

- Inclusive label/duration/price boundaries and items 1–20 pass; blank/oversized/non-whole/out-of-range/item 21 fail with explanatory stable errors.
- Duplicate labels and parent order work; all family children see the same active order.
- Edit updates active goals, delete clears goals, and neither changes an existing request snapshot.

### 36. Deliver parent Reward Shop UI

- [ ] Build catalog empty state, create/edit/delete/reorder controls, limits, duplicate-label handling, and current Currency Skin formatting.

#### Why

The parent needs a usable, safe way to configure the shared reward loop. [REQ-SHOP-01–05, REQ-SHOP-09, `OQ-08`]

#### How

Depends on: Tasks 1, 21, 35. Kind: code. Follow the approved empty-catalog flow, render private text safely, preserve server ordering/version conflicts, and do not add moderation, fixed reward categories, or device-control promises.

#### Where

`apps/web/src/features/parent/RewardCatalogPanel.tsx`

`apps/web/src/features/parent/RewardItemForm.tsx`

`apps/web/src/features/parent/reward-catalog.component.spec.tsx`

#### Acceptance criteria

- Parent can manage/reorder 20 items; boundary and concurrent-version errors preserve entered safe data and explain recovery.
- Duplicate labels remain separately editable by identity; changing Currency Skin never changes numeric price.
- Empty state matches Task 1 approval and no unapproved automated moderation/notification path exists.

### 37. Deliver child shop browsing and Saving Goal API

- [ ] Expose ordered active items with affordability/progress and implement zero-or-one current-item Saving Goal selection/clear/update behavior.

#### Why

A child can save toward one item while remaining free to request any affordable item. [REQ-SHOP-06–09, REQ-REQ-02]

#### How

Depends on: Tasks 22, 28, 34, 35. Kind: code. Compute affordability/progress from locked authoritative decimal balances and current item price, make goal replacement idempotent, and return a cleared-goal reason after catalog deletion.

#### Where

`apps/api/src/modules/rewards/child-shop.controller.ts`

`apps/api/src/modules/rewards/saving-goal.service.ts`

`apps/api/test/saving-goal.integration.spec.ts`

#### Acceptance criteria

- Child sees all active items in parent order; unaffordable items remain visible and marked non-requestable.
- Selecting replaces, clearing removes, editing updates current goal display, and deletion clears/prompts; another family's item is never selectable.
- Goal choice does not alter balance or restrict another affordable request.

### 38. Deliver child Reward Shop and goal UI

- [ ] Render exact balance, ordered affordable/unaffordable items, one Saving Goal/progress, and choose-another recovery after deletion.

#### Why

The saving experience must clearly use persistent Game Money rather than temporary Practice Amounts. [REQ-PROD-02, REQ-SHOP-06–09]

#### How

Depends on: Tasks 23, 33, 36, 37. Kind: code. Format decimal strings with the current skin, label progress and affordability in child-friendly visible text, and preserve duplicate-item identity without implying real payment or guaranteed approval.

#### Where

`apps/web/src/features/child/shop/ChildShopPage.tsx`

`apps/web/src/features/child/shop/SavingGoalCard.tsx`

`apps/web/src/features/child/shop/child-shop.component.spec.tsx`

#### Acceptance criteria

- Child can set/replace/clear a goal and request affordance is independent of goal selection.
- Item edit/deletion and Currency Skin change update presentation without stale numeric conversion.
- Practice Amount copy/data is absent from Reward Balance arithmetic and no real-money checkout/device-control UI exists.

### 39. Deliver atomic Voucher Request create/cancel/approve/reject

- [ ] Implement affordable request snapshot/reservation, one pending request, child cancel refund, parent approve-complete spend, parent reject/refund/reason, no expiry, and first-action-wins.

#### Why

This is the highest-risk family financial workflow and must preserve reservations exactly once under retries/concurrency. [REQ-REQ-01–10, REQ-BAL-01]

#### How

Depends on: Tasks 3, 22, 28, 34, 37. Kind: code. Follow the shared lock order; request creation locks the Reward Item before validating `active` and taking all snapshot fields, while catalog edit/delete takes the same lock. Lock balance/request rows, use checked Economy commands and idempotency receipts, condition terminal writes on pending, and return sanitized current state to losing actions.

#### Where

`apps/api/src/modules/rewards/voucher-request.controller.ts`

`apps/api/src/modules/rewards/voucher-request.service.ts`

`apps/api/test/voucher-request.integration.spec.ts`

#### Acceptance criteria

- Create atomically moves exact price available→reserved and stores snapshot; insufficient funds/second pending leave all rows unchanged.
- Cancel/reject move reservation back exactly once; approve removes reserved exactly once and immediately completes with no unused state.
- Snapshot survives edit/delete, pending survives time passage, reason boundaries work, and retries return one result.
- An item edit/delete racing request creation produces either one internally consistent committed snapshot or a no-write inactive/not-found rejection, never mixed old/new fields.

### 40. Deliver child/parent Voucher Request UI

- [ ] Add child request/pending/cancel/history and parent dashboard pending/approve/reject controls with snapshots, optional child-visible rejection reason, and stale-action recovery.

#### Why

The family loop is complete only when child and parent can understand and resolve the same reserved state without notifications. [REQ-REQ-01–10, REQ-PARENT-01]

#### How

Depends on: Tasks 21, 38, 39. Kind: code. Disable duplicate submission while still relying on server idempotency, show available/reserved separately, use dashboard-only discovery, and replace stale optimistic state with the server's first-action-wins result.

#### Where

`apps/web/src/features/child/shop/VoucherRequestPanel.tsx`

`apps/web/src/features/parent/PendingRequestsPanel.tsx`

`apps/web/src/features/parent/voucher-request.component.spec.tsx`

#### Acceptance criteria

- Affordable create visibly reserves; child cancellation and parent rejection visibly refund; approval visibly spends/completes.
- Optional valid rejection reason appears to that child; blank supplied/oversized reason is rejected safely.
- Concurrent/stale actions show the committed state without a second balance animation; no email/push/usage tracking exists.

### 41. Deliver parent adjustments and family balance history

- [ ] Implement signed whole-unit parent adjustments with required reason, reserved-fund protection, immutable history, and exact parent/child views.

#### Why

Parents need auditable corrections that cannot consume a pending reservation. [REQ-BAL-02–05]

#### How

Depends on: Tasks 3, 21, 28, 33. Kind: code. Lock the balance, validate −10,000…+10,000 and trimmed reason, apply only to available, use idempotency/checked bounds, and expose family-scoped cursor history with adjustment reasons.

#### Where

`apps/api/src/modules/economy/adjustment.controller.ts`

`apps/api/src/modules/economy/economy.service.ts`

`apps/api/src/modules/economy/economy.module.ts`

`apps/web/src/components/BalanceHistoryAndAdjustment.tsx`

`apps/api/test/balance-adjustment.integration.spec.ts`

#### Acceptance criteria

- Inclusive boundaries and zero pass; a zero adjustment records its required reason/history without changing balances; non-whole/out-of-range and blank/oversized reasons fail; retries create one ledger entry.
- A subtraction that exceeds available but not total-with-reserved is rejected with no change; reserved never moves.
- Parent and child history show the same exact signed value/reason under current Currency Skin and no cross-family entry.

### 42. Prove financial and session concurrency invariants

- [ ] Add adversarial real-PostgreSQL race/property tests for one Child Session, daily starts, challenge reward retry, request creation/resolution, item deletion, and adjustment-versus-reservation.

#### Why

Happy-path tests cannot prove first-action-wins or conservation under actual PostgreSQL scheduling. [REQ-GAME-06, REQ-GAME-11, REQ-REQ-03, REQ-REQ-09, REQ-BAL-01–03]

#### How

Depends on: Tasks 18, 20, 22, 29, 30, 35, 37, 39, 41. Kind: tests. Use independent connections and synchronized barriers, repeat races enough to exercise the documented cross-context lock order, and assert final domain row, balance, reserved amount, ledger deltas/source uniqueness, and absence of deadlock/timeouts. Include revocation/PIN-change/timeout versus a child mutation, `OQ-14` timezone-refresh versus daily-start accounting, `OQ-15` duplicate/concurrent-start behavior, and overlapping blind-index-key profile changes.

#### Where

`apps/api/test/concurrency/session-races.integration.spec.ts`

`apps/api/test/concurrency/reward-races.integration.spec.ts`

`apps/api/test/concurrency/ledger-invariants.property.spec.ts`

#### Acceptance criteria

- Simultaneous valid child/session starts commit only the allowed `OQ-15` outcome and never exceed unique constraints.
- Every approve/reject/cancel and reserve/adjust/delete race yields one allowed terminal result and algebraically balanced ledger.
- Duplicate challenge completion under uncertain responses produces one award; revocation-side winners prevent later child mutations; cross-version PIN uniqueness survives races; `OQ-14` timezone-refresh races remain consistent; the suite runs against the production PostgreSQL major in CI.

## Phase 5 — Complete privacy and pilot experience

### 43. Deliver approved consent and first-party analytics boundary

- [ ] Implement versioned parent analytics consent, no-event-before/after-withdrawal enforcement, and only the typed events approved in Task 4—or explicitly ship no optional event collection.

#### Why

Analytics is optional and must not reduce functionality or become arbitrary tracking. [REQ-PRIV-02–05, REQ-PROD-05]

#### How

Depends on: Tasks 4, 13, 16, 32. Kind: code. Keep consent/events in project PostgreSQL for the cost baseline, accept only server-derived approved fields, prohibit raw arbitrary JSON/client names, and synchronously stop/delete applicable raw events on withdrawal. If Task 4 approves no events, implement/test consent state without an event sink.

#### Where

`apps/api/src/modules/privacy/analytics-consent.controller.ts`

`apps/api/src/modules/privacy/analytics-consent.service.ts`

`apps/api/src/modules/privacy/privacy.module.ts`

`apps/api/src/database/migrations/0006_privacy.sql`

`apps/api/test/analytics-consent.integration.spec.ts`

#### Acceptance criteria

- Decline and withdrawal preserve every game/parent feature; no raw optional event exists before opt-in or after withdrawal completion.
- Schema/fixture/log review finds no nickname, parent email, PIN, answer text, or third-party destination.
- Child/family event associations support selective deletion and only approved event names/fields can persist.

### 44. Deliver irreversible profile and family deletion

- [ ] Implement password-confirmed family deletion and confirmed Child Profile deletion, ending access and removing all applicable domain/raw analytics data without harming siblings.

#### Why

Deletion is a decided child-safety/privacy capability, while backup timing must follow Task 4 policy. [REQ-CHILD-07, REQ-PRIV-04–06]

#### How

Depends on: Tasks 4, 16, 19, 20, 22, 25, 28, 34, 43. Kind: code. Reauthenticate family deletion, use family-qualified transactional cascades/service order, revoke sessions first, delete child-associated events selectively, show irreversible confirmation, and record active-store completion without claiming backup erasure early.

#### Where

`apps/api/src/modules/privacy/deletion.service.ts`

`apps/api/src/modules/privacy/privacy.module.ts`

`apps/api/src/modules/identity/identity.controller.ts`

`apps/api/src/modules/identity/child-profile.controller.ts`

`apps/web/src/features/parent/DataDeletionControls.tsx`

`apps/api/test/deletion.integration.spec.ts`

#### Acceptance criteria

- Profile deletion during play immediately blocks the child and removes progression, sessions/summaries, balance/ledger, goal, requests/history, and only that child's events; sibling data remains.
- Wrong/missing family password changes nothing; correct password removes all active family/account/browser/domain/raw-event rows and invalidates tokens.
- Test/report distinguishes active-store completion from approved backup/restore lifecycle and verifies restored data re-enters the deletion control if required.

### 45. Verify responsive, speech-fallback, and basic accessibility behavior

- [ ] Add approved-browser/viewport E2E checks for visible instructions, replay, keyboard/focus, touch layout, non-color errors, reduced motion, and speech unavailability across critical child/parent tasks.

#### Why

Responsive child usability and non-blocking narration are required even though formal WCAG conformance is not claimed. [REQ-UX-02–06]

#### How

Depends on: Tasks 1, 2, 21, 23, 24, 27, 31, 33, 36, 38, 40, 41. Kind: tests. Use Task 1's exact matrix (including `BigInt` and Web Speech/fallback support), automated axe only as regression evidence, deterministic speech stubs, representative viewport projects, keyboard-only paths, and synthetic labels/reasons. Test the versioned all-instruction inventory rather than sampling screens. Record issues for human target-age testing rather than asserting automation proves usability.

#### Where

`tests/e2e/accessibility.spec.ts`

`tests/e2e/responsive-and-speech.spec.ts`

`tests/e2e/playwright.config.ts`

#### Acceptance criteria

- Approved desktop/tablet/phone browser projects complete critical tasks without clipped/unreachable controls.
- Every inventoried instruction has matching visible text and a reachable replay action (child controls remain child-accessible); missing/rejected/muted speech and repeated replay never block visible-text progression; focus/errors are observable without color alone.
- Automated results make no WCAG or child-usability claim and link the required target-age/manual evidence from Task 1.

### 46. Prove complete private Family-loop journeys and requirement trace

- [ ] Add critical browser journeys for registration/access, Placement/game/reconnect, earn/save/request/resolve, history, revocation, and deletion, then map all MVP requirements to evidence.

#### Why

Unit slices do not prove the selected Family-loop outcome or expose missing cross-context behavior. [REQ-PROD-02–04; PRD sections 4 and 15]

#### How

Depends on: Tasks 26, 30, 32, 35, 39, 40, 41, 42, 43, 44, 45. Kind: tests. Run against production-built web/API and real PostgreSQL with synthetic two-family fixtures, control clocks/network failures, assert non-goals remain absent, and emit a machine-readable test report linked from the trace matrix.

#### Where

`tests/e2e/family-learning-loop.spec.ts`

`tests/e2e/family-reward-loop.spec.ts`

`docs/quality/mobey-mvp-requirement-trace.md`

#### Acceptance criteria

- One journey proves allowlisted parent → Authorized Browser/profile/PIN → Placement → 10 challenges/retry-safe rewards → goal/request → parent approval-complete.
- Separate paths prove reject/cancel refund, timeout/resume, daily cap, revocation, reset preservation, analytics decline, child/family deletion, and two-family isolation.
- Every `REQ-PROD-01` through `REQ-PRIV-06` links to passing automated evidence or a named approved manual/content/legal/usability check; open evidence is not marked pass.

## Phase 6 — Deploy and operate the private pilot

### 47. Bootstrap isolated Terraform state and environment roots

- [ ] Create the approved remote-state/OIDC bootstrap and independent nonprod/prod root modules without placing participant data or application credential values in Git/state.

#### Why

Terraform deployments need isolated, locked state and environment boundaries before shared modules can be safely planned. [`A`, `U-20`, `OQ-13`]

#### How

Depends on: Task 4. Kind: code. Follow—not pre-empt—the approved account/region/state decision, encrypt/version state, restrict GitHub OIDC by repository/workflow/environment, always use separate backend keys and use separate accounts only if approved, and expose secret containers rather than secret values.

#### Where

`infra/terraform/bootstrap/main.tf`

`infra/terraform/environments/nonprod/main.tf`

`infra/terraform/environments/prod/main.tf`

`infra/terraform/bootstrap/.terraform.lock.hcl`

`infra/terraform/environments/nonprod/.terraform.lock.hcl`

`infra/terraform/environments/prod/.terraform.lock.hcl`

#### Acceptance criteria

- Pinned Terraform/provider versions format/validate and pass policy checks; backend/key separation and the Task 4-approved account-isolation disposition are visible in reviewed plans.
- Pull-request identity cannot apply production and no long-lived AWS key or allowlist email appears in source, variables, outputs, plan, or state.
- Bootstrap/recovery ownership is documented by the approved Task 4 policy rather than circularly depending on application state.

### 48. Define cost-aware network and PostgreSQL modules

- [ ] Implement the approved multi-AZ VPC/ALB subnet shape, ECS ingress/egress boundaries, private encrypted RDS PostgreSQL, Secrets Manager integration, backups, and parameterized pilot sizing.

#### Why

The API's threat and transaction model depends on network isolation and production-compatible PostgreSQL, while standing pilot cost must be explicit. [`U-20`, `OQ-05`, `OQ-06`, `OQ-13`]

#### How

Depends on: Tasks 4, 47. Kind: code. Encode the approved public-IP-task/no-NAT or private-task egress choice, keep RDS non-public, allow DB only from task security group, require TLS/KMS, expose HA/storage/backup/deletion parameters, and test destructive/overly public plans.

#### Where

`infra/terraform/modules/network/main.tf`

`infra/terraform/modules/data/main.tf`

`infra/terraform/tests/network-data.tftest.hcl`

#### Acceptance criteria

- Plan shows no public RDS route/address or broad database ingress and uses at least two AZs where ALB/subnet groups require them.
- Approved backup retention/deletion protection/restore settings differ intentionally by environment and pass policy tests.
- Cost estimate identifies RDS, ALB, NAT/endpoints if any, storage/backups, and data transfer against Task 4's ceiling.

### 49. Define edge, compute, and observability modules

- [ ] Implement private S3/OAC + CloudFront same-origin routing, ECR/ECS Fargate/ALB/migration task, least-privilege roles, bounded scaling, logs/metrics/alarms/budgets.

#### Why

This completes the selected AWS architecture and operational evidence path for a private pilot. [`U-20`, technical specification sections 15 and 17]

#### How

Depends on: Tasks 4, 47, 48. Kind: code. Compose both environment roots; restrict ALB ingress to the CloudFront origin-facing prefix list plus the approved rotated distribution proof; configure a publicly trusted origin hostname/certificate and TLS; disable `/api/*` caching while forwarding required cookies/headers/query strings/methods; keep SPA fallback out of API responses; use immutable image/artifact versions, inject Secrets Manager references, set approved log retention/alerts, emit security headers, cap scaling/cost, and avoid optional NAT/cache/analytics services unless Task 4 approved them.

#### Where

`infra/terraform/modules/edge/main.tf`

`infra/terraform/modules/compute/main.tf`

`infra/terraform/modules/observability/main.tf`

`infra/terraform/environments/nonprod/main.tf`

`infra/terraform/environments/prod/main.tf`

#### Acceptance criteria

- S3 is non-public through OAC; `/api/*` is uncached and forwards the contract inputs to ALB while only navigation misses receive SPA fallback; static assets use immutable caching; viewer and origin TLS/security headers pass smoke inspection.
- Direct ALB calls, a request missing/wrong origin proof, and a request through an unrelated CloudFront distribution are rejected; proof rotation and sensitive-state handling match Task 4.
- ECS accepts traffic only through ALB, uses least-privilege roles/secrets, runs readiness and one-off migrations, and rolls back unhealthy deployment.
- Dashboard/alarms/budget cover approved API/ECS/RDS/financial/deletion risks without logging product analytics or sensitive values.

### 50. Automate nonprod deployment and approval-gated production promotion

- [ ] Add GitHub OIDC workflows that build once, automatically apply/migrate/deploy/smoke nonprod after merge, and promote the same artifacts to production only after manual approval.

#### Why

Automatic nonprod and manual production approval are decided delivery requirements. [`U-20`]

#### How

Depends on: Tasks 11, 14, 47, 49. Kind: code. Record image digest/web artifact/commit, apply reviewed Terraform, run backward-compatible migrations before service rollout, deploy API/web in a compatibility-safe order, invalidate only mutable navigation assets, attach smoke/plan evidence, and restrict production workflow to the protected GitHub Environment with a separate approver. If Graviton is approved, build/test the matching image architecture or multi-architecture manifest.

#### Where

`.github/workflows/deploy-nonprod.yml`

`.github/workflows/deploy-production.yml`

`infra/terraform/README.md`

#### Acceptance criteria

- Merge of a synthetic release deploys nonprod automatically and records commit/artifact/plan/migration/smoke evidence; failure stops promotion.
- Production cannot start without manual Environment approval and promotes identical digests rather than rebuilding; failed smoke restores the prior compatible API task definition and web release while never pretending to roll back an irreversible migration.
- OIDC permissions are environment/repository/workflow restricted; rollback/forward-fix and non-reversible migration behavior are documented/tested.

### 51. Produce pilot operations evidence and an independent release verdict

- [ ] Exercise allowlist onboarding/removal, monitoring/alerts, backup restore, active-store deletion/re-deletion, incident/credential-loss handling, full acceptance trace, and issue an independent continue/block release verdict.

#### Why

Passing code and infrastructure checks do not resolve pilot safety, content/usability, legal, cost, or operational risk. [REQ-PROD-04–05, PRD sections 10–14]

#### How

Depends on: Tasks 1, 2, 3, 4, 42, 43, 44, 45, 46, 50. Kind: documentation. A reviewer who did not author the implementation samples requirement evidence and threat controls, verifies decision approvals and non-goals, reconciles cost/restore/deletion/alert drills, records residual risks and owners, and blocks release for any unmet gate.

#### Where

`docs/operations/mobey-private-pilot-runbook.md`

`docs/quality/mobey-mvp-acceptance-report.md`

`docs/reviews/mobey-mvp-release-readiness-review.md`

#### Acceptance criteria

- Runbook gives reproducible, least-privilege allowlist, credential-loss, revoke, origin-proof rotation, incident, rollback, restore, deletion, and restored-data re-deletion steps without exposing participant values.
- The approved Task 1 evaluation plan is executable before recruitment and the release evidence includes the approximately 10-minute session observation, target-age usability, screen-time-incentive safeguarding, and currency/reward comprehension checks without misrepresenting optional-analytics coverage.
- Repository settings evidence confirms protected `main`, required independent review/status checks, valid CODEOWNERS handles, and protected production Environment approval; repository files alone are not treated as proof.
- Acceptance report ties the exact release commit/artifacts/environments to every requirement and approved manual/content/legal/usability check, including consent-declined families.
- Independent review states `READY`, `CONDITIONALLY READY`, or `NOT READY`, lists evidence/risk/owner/decision deadline for every condition, and production remains blocked unless all release blockers are closed.

## Planning readiness/risk verdict

**Independent planning-review verdict: CONDITIONALLY READY FOR ISSUE CREATION; NOT READY FOR FEATURE EXECUTION OR PILOT RELEASE.**

After the issue creator expands each `Where` section with the exact companion-file manifest, the plan is dependency-ordered and can create the GitHub backlog now. Tasks 5–15 are reversible platform/repository work and may proceed while decision owners work in parallel, except Task 15 remains blocked until valid owner/team handles are supplied. Tasks 16 onward must obey their explicit Phase 0 dependencies. The critical blockers are `OQ-01`/`OQ-06` (jurisdiction and lifecycle), `OQ-03` (content), `OQ-04` (credential defenses), `OQ-07`/`OQ-11` (financial evidence/bounds), `OQ-09` (analytics), `OQ-10` (release browser evidence), `OQ-14`/`OQ-15` (timezone/day-cap and duplicate concurrent game-start behavior), and `OQ-05`/`OQ-13` (cost/cloud/recovery). `OQ-02`, `OQ-08`, and `OQ-12` block pilot measurement, onboarding/content acceptance, or design production as named.

No implementation, test run, cost plan, legal approval, educational review, target-age usability evidence, AWS deployment, or independent release audit exists today. Accordingly, this plan does not claim implementation readiness merely because each task has acceptance criteria. Task 51 is the release-level independent verdict; until then the current verdict remains conditional.
