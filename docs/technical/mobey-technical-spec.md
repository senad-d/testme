# Mobey Family-loop MVP — Technical Specification

**Status:** v1.0 planning baseline; approval is conditional on the decision gates in section 18  
**Independent-review amendment:** Source and repository review corrected domain ownership, credential/key-rotation ambiguity, transaction/concurrency rules, local cookie behavior, CloudFront/ALB feasibility, open-gate fidelity, repository-guidance traceability, and plan integration dependencies.  
**Scope:** Family-loop MVP private pilot only  
**Authoritative product inputs:** [`../discovery/mobey-initial-product-discovery.md`](../discovery/mobey-initial-product-discovery.md), [`../product/mobey-prd.md`](../product/mobey-prd.md)  
**Companion plan:** [`../plans/mobey-mvp-implementation-plan.md`](../plans/mobey-mvp-implementation-plan.md)

## 1. Purpose, authority, and current state

This specification translates the discovery and PRD into an implementable architecture. Discovery requirement IDs (`REQ-*`), interview IDs (`U-*`), and open questions (`OQ-*`) retain their source meanings. A technical choice below does not close a product open question unless it is explicitly labelled a proposed decision and approved at that question's gate.

The repository is greenfield. At specification time it contains the two authoritative documents, a three-entry `.gitignore`, and `sonar-project.properties`; it contains no application, tests, Docker setup, Terraform, `.github` workflows, `AGENTS.md`, or existing domain implementation. The Sonar file currently names the intended app/package source roots but has stale JavaScript-only tests, no web test root, and a CDK exclusion despite the Terraform decision. These facts are verified in discovery section 12 and the current root files. Every implementation path in this document is therefore an intended path, not a description of existing code.

### 1.1 Normative language

- **Required** means necessary to satisfy an approved `REQ-*` or delivery constraint.
- **Selected** means this specification chooses an implementation approach within the approved product boundary.
- **Proposed pending approval** means implementation must not rely on it until its named `OQ-*` gate is closed.
- **Later** means excluded from the Family-loop MVP and requires separate discovery/approval.

### 1.2 Architectural outcomes

The system must keep four concepts separate in code, storage, API names, UI copy, and telemetry:

1. Practice Amounts are temporary challenge values.
2. Game Money is fictional value awarded by learning or adjusted by a parent.
3. Reward Balance is the child's durable available plus reserved Game Money.
4. Reward Shop items are parent-defined screen-time vouchers fulfilled outside Mobey.

No component performs real-money payment, conversion, device control, or screen-time usage verification. [REQ-PROD-02–03, REQ-GAME-13, REQ-CUR-02–04]

## 2. Technology decisions and trade-offs

| Area | Selected approach | Justification | Rejected/retained alternative |
|---|---|---|---|
| Language/runtime | TypeScript on a pinned, supported Node.js LTS release | One language across web, API, contracts, content, and tooling is decided in `U-19`; pinning an LTS patch makes local/CI/container builds reproducible. The exact patch is selected and recorded during bootstrap after compatibility/security verification. | A TypeScript/Python split adds contract and operations overhead without an MVP need. |
| Web | React SPA built with Vite | Decided in `U-19`; suits a responsive, interaction-heavy child game and static S3/CloudFront delivery. | Next.js adds server rendering/runtime complexity not needed for an authenticated private SPA. |
| API | NestJS modular monolith using its Fastify adapter, REST/JSON under `/api/v1` | NestJS is decided; a modular monolith gives explicit bounded contexts without distributed transactions. Fastify reduces per-request overhead while retaining Nest guards, validation, and OpenAPI support. | Express adapter is more familiar but offers no MVP advantage. Separate services make financial consistency and private-pilot operations harder. |
| API contracts | Nest-generated OpenAPI plus a generated TypeScript client/types in `packages/shared` | Gives runtime validation at the API boundary, a reviewable REST artifact, and compile-time web usage without hand-maintained duplicate DTOs. CI fails on an uncommitted generated diff. | GraphQL is not selected. A hand-written shared DTO package can drift. Contract-first OpenAPI is viable but duplicates Nest implementation wiring for this small team. |
| Database | PostgreSQL with `bigint` money columns, Drizzle ORM/query builder, `pg`, and checked-in SQL migrations | PostgreSQL and transactional semantics are decided. Drizzle keeps SQL constraints, partial unique indexes, row locks, and conditional updates visible for concurrency-critical flows. | Prisma has strong ergonomics but row-lock/conditional financial workflows tend to require raw SQL. TypeORM has broader runtime metadata and migration-drift risks. DynamoDB complicates multi-row reservation and resolution. |
| Workspace | `pnpm` workspaces plus Turborepo | Content-addressed installs and strict dependency boundaries are useful in a TypeScript monorepo; Turborepo provides a small task graph/cache layer. Exact versions are lockfile-pinned. | npm workspaces are simpler but less strict/storage-efficient. Nx is capable but heavier than the greenfield four-package workspace needs. |
| Tests | Vitest for unit/component tests, Supertest against Nest for API tests, Testcontainers PostgreSQL for integration, Playwright for browser journeys | One fast TypeScript test runner plus real-PostgreSQL concurrency tests covers the highest-risk rules. Browser tests verify role and responsive journeys. | SQLite substitutes cannot verify PostgreSQL locks, partial indexes, or types. Mock-only financial tests are insufficient. |
| Authentication | Application-owned opaque parent, Authorized Browser, and child-session tokens; Argon2id password hashes and secret-peppered Argon2id PIN verifiers; PostgreSQL-backed sessions and lock records | The product has unusual browser authorization and family-local child PIN semantics. Opaque, revocable, server-side state supports revocation and one-active-session enforcement without exposing claims. PostgreSQL avoids a Redis service for pilot scale. | Cognito could authenticate parents but would not model child PINs/browser grants and would split revocation state. Self-contained JWTs make immediate revocation and role transition harder. |
| Content | Versioned `packages/content` schemas, templates, generators, hints, explanations, and presentation references | Decided in `U-21`; content is reviewed and deployed like code, with deterministic schema/property tests. | A CMS is out of scope. Runtime AI/generated remote content introduces safety and repeatability risk. |
| AWS | Private S3 origin + CloudFront; Nest container on ECS Fargate behind an ALB; encrypted RDS PostgreSQL; Terraform | This shape is decided in `U-20`. Section 17 adapts it for a low-volume private pilot while preserving a route to hardening. | App Runner reduces infrastructure but gives less network/control consistency with the selected baseline. Lambda/Aurora Serverless changes the runtime and transaction profile. |

The exact Node.js, TypeScript, framework, database-engine minor, and tool versions are not product requirements. The bootstrap pull request must choose mutually supported, non-EOL versions, pin them in the lockfile/container images, and record the choice rather than copying possibly stale version numbers from this document.

## 3. System shape and design principles

Mobey is one web deployable, one API deployable, one PostgreSQL database, and one versioned content package. Bounded contexts are modules inside the API, not network services. This keeps family-scoped and financial operations in one ACID boundary.

Principles:

- Derive `familyId`, `parentId`, and `childProfileId` from an authenticated server-side principal; never authorize from a request-supplied family identifier.
- Put validation at API and database boundaries; the client may improve feedback but is not authoritative.
- Use database constraints and transactions for invariants, not read-then-write checks alone.
- Use integer arithmetic only for Practice Amounts, prices, balances, and rewards.
- Treat API retries, concurrent devices, stale browser state, and duplicate clicks as normal inputs.
- Keep temporary challenge detail separate from retained Session Summaries and financial evidence.
- Do not send secrets, credentials, child nickname, parent email, PIN, or submitted answers to logs or optional analytics.
- Prefer managed AWS services and a small operational surface over premature service decomposition.

## 4. Intended monorepo structure

The implementation plan may add files beneath these roots, but must preserve their ownership.

```text
/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── common/                 # HTTP errors, auth guards, logging, validation
│   │   │   ├── database/               # Drizzle client, schemas, checked-in migrations
│   │   │   └── modules/
│   │   │       ├── identity/           # parent, family, Authorized Browser, child access
│   │   │       ├── learning/           # placement, Game Sessions, challenges, progression
│   │   │       ├── economy/            # balances, immutable ledger, adjustments
│   │   │       ├── rewards/            # Reward Shop, Saving Goal, Voucher Request
│   │   │       ├── reporting/          # Session Summaries and parent projections
│   │   │       ├── privacy/            # consent, analytics gate, deletion
│   │   │       └── operations/         # health/readiness and operational metrics
│   │   └── test/                        # PostgreSQL-backed API/integration tests
│   └── web/
│       └── src/
│           ├── app/                     # router, providers, generated-client adapter
│           ├── features/child/          # profile, placement, game, shop, history
│           ├── features/parent/         # onboarding, dashboard, controls
│           ├── components/              # semantic reusable UI
│           └── accessibility/           # speech and input/focus helpers
├── packages/
│   ├── shared/                          # generated API contract/client and safe shared primitives
│   └── content/                         # reviewed schemas, generators, hints, instructions, themes
├── tests/e2e/                           # Playwright critical journeys
├── infra/terraform/
│   ├── bootstrap/                       # remote-state prerequisites
│   ├── modules/                         # edge, network, compute, data, observability
│   └── environments/{nonprod,prod}/     # isolated root modules and variables
├── .github/                             # issue/PR templates and CI/CD workflows
├── AGENTS.md                            # repository-wide delivery and safety guidance [U-23]
├── compose.yaml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

`packages/shared` must not become a dumping ground for database entities or business services. API modules own domain behavior; shared exports are generated REST types/client code plus deliberately small primitives such as enums and branded decimal-string types. `packages/content` may be consumed by API generation and web rendering, but correct answers and unrevealed explanations are sent only when the server-side challenge transition permits them.

## 5. Bounded contexts and ownership

| Context | Owns | May expose | Must not own |
|---|---|---|---|
| Identity & Family | Family settings, one Parent Account, credential verification, parent sessions, Authorized Browsers, Child Profiles, child access sessions, access locks | Authenticated principals and family/profile lifecycle commands | Learning progress or balances |
| Learning | Placement Rounds, current Stage, Game Sessions, temporary challenges, daily-start use, progression transitions | Reward-award command with opaque challenge source; Session Summary facts | Reward Balance arithmetic or shop items |
| Economy | Balance row, immutable ledger entries, parent adjustments, available/reserved invariants | Transaction functions used by Learning and Rewards; sanitized history | Practice Amounts or catalog definition |
| Rewards | Reward Shop items/order, Saving Goal, Voucher Request snapshots and states | Reservation/resolution commands and views | Parent authentication or challenge answers |
| Reporting | Read projections for parent/child; retained Session Summaries | Family-scoped dashboards | A second source of truth for balances or requests |
| Privacy & Consent | Consent state/version, optional event acceptance, deletion orchestration | Consent-gated typed event intake; erasure command | Essential learning summaries disguised as analytics |
| Content | Versioned templates, difficulty metadata, hints, explanations, English instruction text, themes, avatar manifest | Validated content artifacts and deterministic generators | Mutable production authoring or family data |
| Operations | Health/readiness, request correlation, metrics emission | Non-sensitive operational signals | Product analytics or raw credentials |

Cross-context work stays synchronous inside the modular API when it must share a transaction. For example, Learning calls Economy to award a challenge inside one transaction; Rewards calls Economy to reserve or release funds. Reporting reads owned tables through query services and does not write domain state.

## 6. Data model, invariants, and lifecycle

All identifiers are non-sequential UUIDs. Every family-owned table carries `family_id` even where it is derivable; foreign keys include or are checked against that tenant so accidental cross-family joins fail. Timestamps are UTC `timestamptz`.

Input canonicalization is shared, versioned, and covered by boundary fixtures rather than left to database collation or JavaScript coercion. Nicknames, labels, and reasons are normalized to Unicode NFC, trimmed of surrounding Unicode whitespace, counted by Unicode code point, and rejected if they contain C0/C1 controls or bidirectional formatting controls; their accepted display form is preserved and React renders it only as text. Nickname uniqueness uses a locale-independent case-folded key. A PIN is exactly 4–6 ASCII digits (`^[0-9]{4,6}$`), is retained as a string so leading zeroes survive, and is never parsed as a number. Passwords are not trimmed or Unicode-normalized and their 12–128 limit is counted by Unicode code point. Parent-email matching and uniqueness use one canonical function: trim, NFC-normalize, case-fold the mailbox, and convert the domain through IDNA; the original accepted form is display-only. The allowlist operator and registration path use that same function.

### 6.1 Core records

| Record | Essential fields and constraints | Owner / retention |
|---|---|---|
| `families` | `id`, IANA `timezone`, currency skin enum, timestamps; one family per parent in MVP | Identity; delete with family |
| `parent_accounts` | `family_id` unique, normalized email unique, original display email, Argon2id password hash | Identity; delete with family, subject to unresolved backup/legal rules `OQ-06` |
| `pilot_acceptances` | authority confirmation and terms/privacy version accepted at registration | Identity/Privacy; active-store retention follows approved `OQ-06` policy |
| `authorized_browsers` | family, user label/last-used metadata, hash of high-entropy opaque token, created/revoked timestamps | Identity; parent can list/revoke; no raw token stored |
| `parent_sessions` | parent, token hash, expiry, last activity, revocation, reauthentication/mode data | Identity; short-lived operational record |
| `auth_attempt_buckets` | HMAC/pseudonymous subject keys, scope, window/counter/lock-until | Identity; exact scope/threshold/retention awaits `OQ-04` approval |
| `child_profiles` | family, trimmed nickname plus case-folded key unique within family, app avatar ID, secret-peppered Argon2id PIN verifier/key version, separately keyed PIN blind index/key version | Identity; hard-delete active data on profile deletion |
| `child_access_sessions` | child, Authorized Browser, token hash, active/ended status, activity/expiry, end reason; partial unique index for one active row per child | Identity; expires after 15 minutes inactivity; delete with child/family |
| `child_progressions` | child unique, `PLACEMENT_REQUIRED`/assigned stage/reset-pending state, completed-session count within captured stage, version | Learning; the sole current-progression source of truth, deleted with child |
| `placement_rounds` | child, content version, state, aggregate result by skill, assigned stage, timestamps | Learning; challenge details temporary, round summary retained until child deletion |
| `game_sessions` | child, captured stage/theme/content version/family calendar date, state, started/last-active/ended times, aggregate counters | Learning; retained until child deletion |
| `daily_game_starts` | child, family calendar date, count constrained 0–3 | Learning; retained as session-limit evidence until child deletion |
| `session_challenges` | session, ordinal, generator/template version, generated operands/correct result, attempt count, state, opaque reward source ID | Learning; operational only while active/resumable, then purged after summary/abandon finalization |
| `session_summaries` | session, stage, completion state, per-skill aggregate totals/correctness, attempt bands, units earned, timestamps; no individual questions/answers | Reporting; retained until profile deletion [REQ-PARENT-02–03] |
| `child_balances` | child unique, `available_units bigint`, `reserved_units bigint`, version; nonnegative and sum cannot exceed technical ceiling | Economy; delete with child |
| `balance_ledger_entries` | child, kind, available/reserved deltas, resulting balances, actor class, source type and opaque source ID, optional adjustment reason; unique source for retry-prone writes | Economy; retained until child deletion; challenge rows reveal no question or answer |
| `reward_items` | family, stable ID, trimmed label, duration, price, order, active/deleted marker; no uniqueness on label; active count ≤20 transactionally | Rewards; deleted items retained only as needed for family history, then family deletion |
| `saving_goals` | child unique and active reward item; absent means no goal | Rewards; clear atomically when item is deleted |
| `voucher_requests` | child, item ID if present, label/duration/price snapshot, pending/approved-completed/rejected/cancelled state, optional rejection reason, timestamps/version; partial unique pending-per-child index | Rewards; retained until child deletion |
| `command_receipts` | tenant, actor, operation, idempotency key, non-secret request digest, result reference/status; unique operation scope | Owning context; retention follows referenced child/family aggregate; never stores PIN/password/answer payload |
| `analytics_consents` | family, notice/schema version, state and timestamps | Privacy; exact legal retention after withdrawal/deletion is `OQ-06` |
| `analytics_events` | only fields in an approved typed event contract, pseudonymous family/child IDs where approved, event/schema version, time | Privacy; table is not implemented/populated until `OQ-09`; delete on withdrawal/profile/family deletion as applicable |

### 6.2 Credential representation

Parent passwords and child PINs are never encrypted for recovery and never logged. Argon2id parameters are benchmarked and centrally configured. Because a 4–6 digit PIN is cheap to brute-force from a database-only leak, PIN verification first derives a value with a server-held HMAC pepper and then stores an Argon2id verifier of that value. Child PIN uniqueness cannot be checked by comparing salted verifiers, so the service stores both:

- a secret-peppered Argon2id verifier plus pepper key version; and
- a separately keyed HMAC blind index over `(family_id, normalized PIN)`, protected by a family-scoped unique index.

The verifier pepper and blind-index key are distinct Secrets Manager values and never enter source, images, logs, Terraform variable values, or the database. Supporting overlapping key versions permits controlled rotation. While more than one blind-index key is active, create/change verifies the candidate index under **every** active key while holding the Family row lock, then stores it under the current key; this preserves sibling uniqueness across versions and serializes concurrent changes. Successful PIN verification may rehash/reindex under the current keys in the same locked transaction. An old key cannot be retired until every profile using it has been reindexed after successful verification or has completed a parent-driven PIN reset; rotation reports the remaining count and fails closed if a required key is unavailable. The verifier pepper and blind-index key rotate independently.

A database-only compromise does not provide the keys needed for a direct 10^4–10^6 PIN search or blind-index calculation. Display email is never exposed outside parent mode.

### 6.3 Data lifecycle and deletion

Profile deletion authenticates a parent, confirms the target, ends active access, and removes child-owned rows and child-associated raw analytics in a database transaction where all data is in PostgreSQL. Family deletion requires fresh password verification, revokes all sessions/browser grants, and removes all active database records for the family. The API returns success only after the active-store transaction commits. Cached local challenge data is cleared when the client receives revocation/deletion and is bounded by session expiry if it does not.

Backups cannot be selectively edited in place. Backup retention, deletion completion SLA, consent/audit exceptions, export, and restored-backup re-deletion remain `OQ-06`; this specification makes no legal erasure-time claim until that policy is approved. [REQ-CHILD-07, REQ-PRIV-04–06]

## 7. Roles, credentials, and authorization

### 7.1 Principals

- **Unauthenticated visitor:** can read health-independent public bootstrap data and attempt allowlisted registration or parent login.
- **Parent principal:** created only by parent-password verification; can act only within its family.
- **Authorized Browser principal:** proves that a parent authorized this browser; it is not a parent and can only list that family's child choices and attempt child PIN access.
- **Child principal:** bound to one Child Profile and one Authorized Browser through one active child access session.
- **Pilot operator/deployer:** changes allowlist/configuration through deployment controls; it is not an in-product family role.

There is no caregiver invitation or second parent role in MVP. [REQ-AUTH-03; non-goals]

### 7.2 Server-side authorization matrix

| Capability | Visitor | Authorized Browser | Child | Parent |
|---|---:|---:|---:|---:|
| Register allowlisted parent / parent login | Yes | Yes | No | N/A |
| List family child selectors | No | Yes | Yes (own family) | Yes |
| Verify a Child PIN / start Child Session | No | Yes | N/A | No direct bypass |
| Placement, game, shop browse, goal/request/cancel | No | No | Own profile only | View/control only where explicitly required |
| Parent dashboard, catalog, adjustments, reset, resolve request | No | No | No | Own family only |
| Enter parent mode from child UI | No | No | Password re-entry required | Password re-entry required for the transition |
| Manage/revoke Authorized Browsers and delete data | No | No | No | Own family with required confirmation/reauthentication |

Every state-changing parent or child command rechecks session validity **inside the same database transaction** as the mutation. Child commands lock the access-session row before domain rows; revocation, PIN change, parent-ended access, profile deletion, and timeout take the same lock. Thus a race has a defined order: a command committed before revocation may stand, while one serialized after revocation fails without a domain write. Cookie presence alone is insufficient.

### 7.3 Cookies and request protections

In deployed environments use independent random 256-bit opaque tokens in `Secure`, `HttpOnly`, `SameSite=Strict` cookies named `__Host-mobey-parent`, `__Host-mobey-browser`, and `__Host-mobey-child`, with `Path=/` and no `Domain`. Store only token hashes server-side. Each route consumes only its declared credential class; coexistence of browser, child, and parent cookies never upgrades authority. Parent logout revokes/deletes only the parent credential; it does not revoke the separate Authorized Browser grant. Browser revocation invalidates its grant and all associated active child sessions.

Parent-session inactivity/absolute lifetimes, parent-mode reauthentication lifetime, and Authorized Browser persistence/reauthorization lifetime are security-policy inputs recorded and approved in implementation-plan Task 3; production configuration has no permissive fallback while they are unset. Local Compose uses explicit development-only, unprefixed cookie names over `http://localhost`; startup rejects that cookie mode outside the development environment. This exception does not weaken deployed cookie settings.

The SPA and API are same-origin through CloudFront. Mutating requests require an allowed `Origin` plus a CSRF token bound to the server-side session; SameSite cookies are defense in depth, not the sole CSRF control. Parent-mode transition always posts the password to a dedicated reauthentication endpoint; an Authorized Browser or Child Session cannot be upgraded. Parent routes require a current password-authenticated parent-mode session. Authentication failures use generic messages and are excluded from access logs.

`REQ-AUTH-10` requires throttling and temporary lockout, but count, duration, and subject scopes are open. The implementation must consume an approved, environment-configured policy from `OQ-04`; it must not bake an invented threshold into UI copy or acceptance tests.

## 8. Private-pilot invitation and onboarding

### 8.1 Pilot invitation/allowlist

“Invitation” in MVP means an operator adds a normalized parent email to controlled deployment configuration. Mobey sends no invitation email and uses no invitation token because email verification and notifications are out of scope.

1. Terraform creates the Secrets Manager container and grants the API read access, but does not place participant emails in Git, a Terraform variable, plan output, or state.
2. An authorized pilot operator updates the environment's allowlist secret through an audited operational procedure.
3. The API loads/refreshes a normalized allowlist representation without logging values.
4. Registration returns a non-enumerating `REGISTRATION_NOT_AVAILABLE` response when the address is not eligible or cannot create another account.
5. Removing an unregistered email prevents registration. Removing a registered email does not silently delete or lock the family; participant offboarding uses the approved operations/deletion procedure.

### 8.2 Parent registration and setup

1. Parent supplies unique email and a 12–128-character password.
2. Parent affirmatively confirms adult/guardian authority and accepts versioned pilot terms/privacy.
3. API checks allowlist eligibility, validates input, hashes the password, and atomically creates the Parent Account, Family, acceptance record, no Child Profiles, and a parent session.
4. Parent explicitly authorizes the current browser; the raw browser token is shown only as its cookie and the database stores its hash.
5. Parent can set/refresh the browser-detected IANA Family Timezone and choose the family Currency Skin; OQ-14 still controls what happens if a refresh crosses a calendar-day boundary.
6. Parent can create up to 10 Child Profiles and up to 20 active Reward Shop items.

The database and API permit a newly registered family with zero children and zero items so registration can commit safely. `OQ-08` still governs the required empty-state copy, setup order, skip behavior, and whether a family may remain empty indefinitely; those user-facing facts are not selected here.

### 8.3 Child entry and parent-mode return

On an Authorized Browser, profile selection reveals only app avatar and family-local nickname. The child submits the selected profile ID and PIN. The server locks the guaranteed Family/Child Profile rows, validates browser-family membership, approved lockout policy, PIN hash, and absence of an active Child Session, and creates access in one transaction. The guaranteed-row lock makes simultaneous starts safe even when no active-session row exists. A valid second-device attempt returns `CHILD_SESSION_ALREADY_ACTIVE` without disclosing device details. Inactivity is measured by server time; authenticated activity updates are throttled, and 15 minutes ends access and makes an active game resumable only if its own inactivity rule still permits it.

Entering parent mode from child mode posts the parent password and obtains a password-authenticated parent-mode session. The UI cannot infer parent authority from the Authorized Browser grant. PIN change, browser revocation, parent end-session, profile deletion, and timeout revoke affected child access. [REQ-AUTH-06–10, REQ-CHILD-06–07, REQ-GAME-06–07]

## 9. Learning and activity state machines

State transitions are server-authoritative. Each command validates expected state and returns the current resource on a stale/concurrent conflict where safe.

### 9.1 Progression

```text
PLACEMENT_REQUIRED
  -> PLACEMENT_IN_PROGRESS
  -> EXACT_AMOUNTS | AFFORDABILITY | CHANGE

EXACT_AMOUNTS --10 completed sessions--> AFFORDABILITY
AFFORDABILITY --10 completed sessions--> CHANGE
CHANGE --10+ completed sessions--> CHANGE

any assigned stage --parent reset, no active game--> PLACEMENT_REQUIRED
any assigned stage --parent reset, active game--> RESET_PENDING
RESET_PENDING --current game completes/abandons--> PLACEMENT_REQUIRED
```

Placement has six one-answer challenges, two per skill, no Game Money, and no daily slot. Assignment is prerequisite-based exactly as `REQ-LEARN-03` defines. A reset preserves balances, goals, requests/history, and Session Summaries. The active Game Session captures its stage/content version so a pending reset cannot mutate it. [REQ-LEARN-01–10]

### 9.2 Child access and Game Session

```text
Child access: ACTIVE -> ENDED | TIMED_OUT | REVOKED
Game Session: ACTIVE -> COMPLETED
                         -> ABANDONED_TIMEOUT
                         -> ABANDONED_PARENT_END
                         -> ABANDONED_PROFILE_DELETE
```

Starting a Game Session:

- requires a current Child Session and assigned stage;
- locks the guaranteed Child Profile/progression row before upserting and locking the possibly absent daily-usage row;
- computes the calendar date from the stored Family Timezone, never the child device timezone;
- increments/creates that date's start count if below three;
- captures stage, theme, content version, and the date in the session;
- applies the approved OQ-15 session-start policy for duplicate or concurrent start attempts; until that policy is approved, the spec does not assume a second active Game Session, a resume-in-place, or a distinct additional daily slot.

A 15-minute server-side inactivity boundary controls resume/abandon. On the boundary, “before 15 minutes” resumes and “at or after 15 minutes” abandons, avoiding overlap. Already committed challenge rewards remain. A parent end action ends child access and finalizes active play as parent-ended. [REQ-GAME-01–08]

### 9.3 Challenge

```text
AWAITING_ANSWER (attempts 0)
  --wrong #1--> AWAITING_ANSWER (attempts 1, hint level 1, potential 2)
  --wrong #2--> AWAITING_ANSWER (attempts 2, hint level 2, potential 1)
  --wrong #3--> REVEALED (reward 0, explanation)
  --correct #1/#2/#3--> CORRECT (reward 3/2/1, explanation as content defines)
```

The API generates from the approved current-stage content curve, persists the generated instance while active, and excludes an exact challenge signature already used in that session. The client sends a structured whole-number answer; the server evaluates it. Submitted answers are not logged, sent to analytics, or retained after transition. Attempt count/outcome is aggregated into the Game Session. A terminal transition and Economy award occur in one database transaction.

The browser stores only the current non-secret rendered challenge envelope, session/challenge IDs, and pending command ID in a namespaced IndexedDB record. It stores no PIN, password, session token, nickname, submitted answer history, or correct answer before reveal. If save/reply is uncertain, the UI pauses and retries the same command after reconnection. It cannot request another reward-bearing challenge offline. On terminal response, session end, logout/revocation signal, or expiry, it clears the cache. [REQ-GAME-04–05, REQ-GAME-08–13]

`OQ-03` must supply the exact templates, bands, and progressive hint sequence before content acceptance. The mechanics above do not invent that educational curve.

## 10. Money arithmetic and transactional rules

### 10.1 Representation

- Practice values: PostgreSQL `smallint`/TypeScript safe integer, inclusive 0–100.
- Reward price/duration and parent adjustment input: JSON integer, validated against the PRD ranges.
- Durable available/reserved balances and ledger deltas: PostgreSQL signed `bigint`.
- API balance and ledger aggregate values: base-10 strings matching `^-?(0|[1-9][0-9]*)$`; the web parses them with `BigInt` and never converts them to floating point.
- Currency Skin is a family enum used only at formatting time. Stored amounts never carry or convert a real currency code.

**Proposed `OQ-11` decision:** use PostgreSQL's positive signed-`bigint` ceiling, `9,223,372,036,854,775,807`, as the technical storage bound, while retaining no ordinary product-level cap. Before every write, checked application arithmetic verifies `available >= 0`, `reserved >= 0`, and `available + reserved <= ceiling`. The database check uses the overflow-safe equivalent `available <= ceiling - reserved`, not a potentially overflowing `available + reserved` expression. Exceeding the bound returns `BALANCE_LIMIT_EXCEEDED` with no ledger or balance write. This choice maximizes exact range, avoids JavaScript number loss through string transport, and fails explicitly; it requires approval at the `OQ-11` gate.

### 10.2 Ledger transaction pattern

Every balance-changing command executes in one PostgreSQL transaction:

1. lock and validate the authenticated session as required by section 7.2, then derive family/child ownership;
2. acquire guaranteed aggregate rows before optional rows, using the documented context lock order; request creation locks the Reward Item before checking `active` and taking its snapshot, and catalog edit/delete takes the same item lock;
3. lock the child's balance and relevant challenge/request row in the same order used by every competing command;
4. claim/check a business-source uniqueness key or command receipt; a concurrent duplicate that loses the unique insert rolls back all domain/ledger writes and reloads the committed receipt;
5. calculate checked available/reserved deltas using integer arithmetic;
6. insert one immutable ledger entry with resulting balances;
7. update the balance and domain aggregate/status;
8. commit, then return the committed representation.

The implementation records one cross-context lock-order table beside the transaction helpers and concurrency tests exercise every competing pair. In particular, item edit/delete racing request creation serializes to either (a) a committed snapshot followed by edit/delete, or (b) a rejection because the item is no longer active; it can never snapshot mixed fields.

There is no API to edit/delete a ledger entry independently. Corrections are new parent adjustments. Database constraints provide a final nonnegative/sum check.

### 10.3 Operation rules

| Operation | Available delta | Reserved delta | Additional invariant |
|---|---:|---:|---|
| Correct challenge | `+3`, `+2`, or `+1` | `0` | Unique opaque challenge reward source; reveal is no entry or an explicit zero outcome outside ledger |
| Create Voucher Request | `-price` | `+price` | Item active; affordable; no pending request; snapshot and reservation in same transaction |
| Child cancel | `+snapshot price` | `-snapshot price` | Request still pending; first terminal action wins |
| Parent reject | `+snapshot price` | `-snapshot price` | Pending; optional valid reason; first terminal action wins |
| Parent approve/complete | `0` | `-snapshot price` | Pending; no later “unused” state |
| Positive adjustment | `+amount` | `0` | Amount ≤10,000, valid reason, no overflow |
| Negative adjustment | `-absolute amount` | `0` | Available remains nonnegative; reserved is untouched |
| Zero adjustment | `0` | `0` | Accepted within the decided inclusive range; records the required reason/history without changing either balance |

Voucher resolution uses a conditional pending-state update while holding the request/balance locks. Exactly one concurrent approve/reject/cancel commits; followers return `REQUEST_ALREADY_RESOLVED` and the sanitized current request without another balance effect. Partial unique indexes enforce one pending request and one active Child Session per child. [REQ-REQ-01–09, REQ-BAL-01–05]

### 10.4 Retry evidence without answer surveillance

Challenge reward deduplication is durable through the ledger's unique opaque challenge source ID. The retained entry has session/source IDs and reward amount, not question operands, submitted answer, or answer text. Temporary challenge rows hold only what resume/scoring needs and are purged after finalization. Other retryable financial commands use `Idempotency-Key` receipts whose digests exclude credentials and challenge answers. This is the selected technical resolution proposed for `OQ-07`; retention remains bounded by child/family deletion and the legal backup policy in `OQ-06`.

## 11. REST API and contracts

### 11.1 Conventions

- Base path: `/api/v1`; HTTPS only outside local development.
- Media type: `application/json`; errors: `application/problem+json` following RFC 9457.
- JSON uses camelCase; UTC timestamps are RFC 3339 strings; durable money values are decimal strings.
- Unknown request fields are rejected. Body/query/path input receives runtime validation and size limits.
- Collection pagination is opaque cursor-based with a bounded `limit`; stable sort order is part of each endpoint contract.
- Commands that can be retried after an uncertain result require a UUID `Idempotency-Key`. Reuse with the same semantic request returns the original result; reuse with a different digest returns `IDEMPOTENCY_KEY_REUSED`.
- Every response carries `X-Request-Id`; a client value is accepted only after strict format validation, otherwise replaced.
- Generated OpenAPI is the contract authority for client generation. Every pull request that changes a public controller/DTO/error regenerates and commits `packages/shared/src/generated/api.ts`; CI runs generation in a database-independent application bootstrap and fails on any diff.

### 11.2 Resource surface

The exact DTO fields are generated from implementation schemas, but this route and authority surface is normative.

| Area | Routes | Principal / behavior |
|---|---|---|
| Registration/auth | `POST /registrations`, `POST /auth/parent-sessions`, `DELETE /auth/parent-sessions/current`, `POST /auth/parent-mode` | Visitor/password; register records consent; parent-mode always verifies password |
| Browser authorization | `POST /authorized-browsers`, `GET /authorized-browsers`, `DELETE /authorized-browsers/{id}` | Parent; deletion revokes related child access |
| Family settings/deletion | `GET/PATCH /family`, `DELETE /family` | Parent; patch supports currency/timezone; delete requires password re-entry |
| Child selector/access | `GET /child-options`, `POST /auth/child-sessions`, `POST /auth/child-sessions/current/activity`, `DELETE /auth/child-sessions/current` | Authorized Browser or Child as applicable; PIN only in create body |
| Child management | `GET/POST /children`, `PATCH/DELETE /children/{id}`, `POST /children/{id}/end-session`, `POST /children/{id}/reset-progression` | Parent; PIN is write-only; delete confirmed |
| Placement | `POST /placements`, `GET /placements/current`, `POST /placements/{id}/answers` | Child; one answer each, no reward/daily slot |
| Game Sessions | `POST /game-sessions`, `GET /game-sessions/current`, `GET /game-sessions/{id}`, `POST /game-sessions/{id}/activity` | Child; start chooses theme and applies the approved OQ-15 duplicate/concurrent-start and slot policy |
| Challenges | `GET /game-sessions/{id}/challenge`, `POST /game-sessions/{id}/challenges/{challengeId}/attempts` | Child; terminal attempt/reward command is retry-safe |
| Child shop/goal | `GET /shop-items`, `GET/PUT/DELETE /saving-goal` | Child; unaffordable remains represented but request capability false |
| Parent catalog | `GET/POST /parent/shop-items`, `PATCH/DELETE /parent/shop-items/{id}`, `PUT /parent/shop-item-order` | Parent; order command validates complete active set/version |
| Voucher requests | `GET/POST /voucher-requests`, `POST /voucher-requests/{id}/cancel`, `GET /parent/voucher-requests`, `POST /parent/voucher-requests/{id}/approve`, `POST /parent/voucher-requests/{id}/reject` | Child create/cancel; parent resolve; snapshot returned |
| Balances/history | `GET /balance`, `GET /balance-history`, `POST /parent/children/{id}/adjustments` | Child own / parent family; cursor pagination; reason visible only inside family |
| Reporting | `GET /parent/dashboard`, `GET /parent/children/{id}/session-summaries` | Parent; aggregates only |
| Consent/analytics | `GET/PUT /parent/analytics-consent`, typed event routes only after `OQ-09` approval | Parent changes consent; collection refuses without active consent |
| Profile deletion | `DELETE /children/{id}` | Parent; confirms irreversible child deletion and does not affect siblings |
| Operations | `GET /health/live`, `GET /health/ready` | Load balancer/operations; readiness checks DB; no family data |

State-changing catalog reorder, session start, challenge attempt, goal change, request creation/resolution/cancel, adjustment, reset, consent change, and deletion commands use idempotency where a retry could duplicate or ambiguously repeat an effect.

### 11.3 Error contract

```json
{
  "type": "urn:mobey:problem:request-already-resolved",
  "title": "The request was already resolved",
  "status": 409,
  "code": "REQUEST_ALREADY_RESOLVED",
  "detail": "Refresh to see the current request state.",
  "instance": "/api/v1/parent/voucher-requests/…/approve",
  "requestId": "01…",
  "errors": [{ "field": "reason", "code": "TOO_LONG" }],
  "current": { "status": "rejected" }
}
```

`detail` is safe, localized English copy and never echoes a password, PIN, submitted answer, allowlist membership, internal SQL, or another tenant's identifier. `errors` and `current` are optional and endpoint-schema controlled.

Required stable codes include `VALIDATION_FAILED` (400), `AUTHENTICATION_REQUIRED` (401), `FORBIDDEN` (403), `REGISTRATION_NOT_AVAILABLE` (403), `RATE_LIMITED`/`AUTH_TEMPORARILY_LOCKED` (429 with `Retry-After` after `OQ-04`), `NOT_FOUND` (404, also used to prevent cross-family discovery), `STATE_CONFLICT` (409), `CHILD_SESSION_ALREADY_ACTIVE` (409), `DAILY_SESSION_LIMIT_REACHED` (409), `IDEMPOTENCY_KEY_REUSED` (409), `REQUEST_ALREADY_RESOLVED` (409), `INSUFFICIENT_AVAILABLE_BALANCE` (409), `BALANCE_LIMIT_EXCEEDED` (409), and `SERVICE_UNAVAILABLE` (503). Unexpected errors return a generic 500 and correlation ID.

## 12. Privacy, child safety, and accessibility controls

### 12.1 Data minimization and safety

- No child real name, email, age/birth date, image upload, chat, social identity, ad identifier, or unrelated behavior field exists in UI DTOs, database schemas, analytics, fixtures, or logs. [REQ-PRIV-01]
- App-provided avatar IDs are content references, not biometric/user media.
- Parent labels and rejection/adjustment reasons are private family text. They are length-limited, escaped by React, rejected if control-character policy fails, and covered by a strict Content Security Policy. No automated moderation is added in MVP. [REQ-SHOP-05]
- Optional analytics is off until explicit parent consent and an approved event contract. The API uses an allowlist of event schemas rather than arbitrary client event names/JSON. Decline leaves all game behavior intact. [REQ-PRIV-02–05, `OQ-09`]
- Operational telemetry is necessary service data, not a backdoor analytics stream; it contains pseudonymous technical identifiers only when needed for incident diagnosis and follows the approved lifecycle policy.
- Terms/privacy versions and adult-authority confirmation are recorded at registration. Jurisdictional adequacy is not claimed while `OQ-01`/`OQ-06` remain open.
- Mobey uses the browser Web Speech API and makes no direct Polly or other speech-provider call. Browser/OS speech processing may be local or vendor-operated and must be covered by the approved browser/privacy review; instruction text contains no child data. Speech failure never gates controls. [REQ-UX-02–03]

### 12.2 Child-accessible engineering baseline

Without claiming WCAG conformance, implementation must provide semantic controls, visible focus, keyboard operation for critical journeys, programmatic labels, error text associated with fields, non-color-only state, zoom/reflow without loss in supported viewports, generous touch targets, reduced-motion behavior, and visible instruction text adjacent to replay. Automated accessibility tests are regression evidence, not a conformance certificate. Target-age usability, exact browser versions, TTS voices, and acceptance thresholds remain `OQ-02`/`OQ-10` gates. [REQ-UX-02–06]

Currency formatting uses the selected skin consistently but never changes numeric values. Product copy must not make real-currency or mastery claims. An explicit child-facing Game Money/approval disclaimer remains not required by `REQ-UX-08`; pilot comprehension testing remains a recorded risk, not a silently added feature.

## 13. Threat boundaries and security controls

### 13.1 Trust boundaries

1. **Browser ↔ CloudFront:** an untrusted child/parent device and network cross TLS into the public edge.
2. **CloudFront ↔ ALB/API:** CloudFront forwards uncached `/api/*` with required cookies/headers/query strings; the ALB admits the AWS CloudFront origin-facing prefix list and rejects requests missing the distribution-specific origin proof.
3. **API ↔ PostgreSQL/Secrets:** only the ECS task role/security group reaches private data; SQL input is parameterized.
4. **GitHub Actions ↔ AWS:** deployments cross an OIDC trust policy restricted by repository, branch, workflow, and GitHub Environment.
5. **Operator ↔ allowlist/configuration:** privileged operational changes are outside family roles and must be audited.
6. **Essential records ↔ optional analytics:** consent and a typed server gate separate them even if both use PostgreSQL for pilot cost.

### 13.2 Threat/control table

| Threat | Controls and verification |
|---|---|
| Cross-family object access / IDOR | Principal-derived tenant filters, family-qualified foreign keys, centralized guards, negative integration tests using two families, non-enumerating 404 |
| Parent credential stuffing / low-entropy PIN guessing | Argon2id, blind index secrecy, generic failures, approved multi-scope rate/lock policy, CloudFront/ALB rate protections as justified; exact thresholds blocked on `OQ-04` |
| Stolen browser/child token | Opaque hashed tokens, Secure/HttpOnly cookies, expiry/activity checks, browser list/revocation, one active child session, PIN-change invalidation |
| Child reaching parent controls | Dedicated password reauthentication, parent-mode server session, no authority in browser grant or client route state, authorization tests |
| CSRF | Same-origin deployment, Strict cookies, Origin check, session-bound CSRF token, no state-changing GET |
| XSS through private parent text/content | React text rendering, no unsafe HTML, CSP, output tests, dependency scanning; no user uploads |
| Replay/double award/double resolution | Idempotency keys/source constraints, row locks, conditional transitions, ledger invariants, real-PostgreSQL concurrent tests |
| Offline/client tampering | Server owns answer, state, stage, daily count, reward, and balances; local cache is non-authoritative; no offline reward progression |
| SQL/integer corruption | Parameterized Drizzle/SQL, runtime schemas, bigint checked arithmetic, DB checks/FKs, transactional writes |
| Sensitive telemetry | Central redaction, body logging disabled, allowlisted structured fields, fixtures scan, no credentials/answers/nickname/email |
| Database or secret compromise | RDS/KMS encryption, TLS, least-privilege task role/security groups, Secrets Manager, rotation-capable opaque hashes; no raw tokens |
| Supply-chain/deployment compromise | Lockfile, protected branch, dependency/container/IaC scans, signed/provenance-capable immutable artifacts, GitHub OIDC, manual prod approval |
| Denial of service/cost exhaustion | Request/body limits, timeouts, DB pool bounds, rate controls, ECS scaling caps, AWS Budgets/alarms; capacities await `OQ-05` |
| Incomplete deletion/restored backup | Transactional active-store erase, deletion integration tests, backup policy/restore runbook and re-deletion control after `OQ-06` |

A formal compliance claim, penetration-test threshold, incident response SLA, and disaster-recovery target are not established by the PRD. They remain approval inputs where jurisdiction/scale requires them.

## 14. Testing and acceptance strategy

### 14.1 Test layers

- **Unit/property tests:** progression prerequisites, 3/2/1/0 scoring, no-repeat challenge signatures, date calculation by IANA timezone, money checked arithmetic, content ranges/denominations, and DTO validation.
- **Component tests:** parent and child views, visible text/TTS fallback, loading/error/retry states, affordability, resolved-request state, and local cache clearing.
- **API integration tests:** real PostgreSQL migrations and transactions, two-family authorization isolation, session revocation, daily cap, placement/reset, item limits, deletion, consent gate, and error contracts.
- **Concurrency tests:** simultaneous Child Session creation, duplicate challenge completion, request creation, approve/reject/cancel races, negative adjustment versus reservation, and item deletion/goal clearing. Tests assert one terminal state and a balanced ledger.
- **Contract tests:** OpenAPI generation is deterministic; generated shared client is current; every documented stable error code has schema coverage.
- **Browser E2E:** critical parent registration/onboarding, child placement/session/resume, reward request and parent resolution, deletion, viewport/focus/TTS-failure behavior. A versioned inventory maps every shipped user-facing instruction to visible text and replayable speech evidence, so “every instruction” is auditable rather than sampled. Final browser/version matrix, including `BigInt` and Web Speech support/fallback expectations, waits for `OQ-10`.
- **Security/IaC tests:** secret/PII log tests, dependency/container scanning, Terraform format/validate/lint/security checks and plans, authorization negatives, cookie/header checks.
- **Content acceptance:** schema/property tests plus educator/content review against approved `OQ-03`; automation cannot approve educational suitability.
- **Usability/access review:** target-age task study and parent pilot review against approved `OQ-02`; axe and keyboard checks do not replace it.

### 14.2 Pull-request quality gate

Every pull request blocks on formatting, lint, type-check, unit/component tests, affected API/database integration tests, generated-contract diff, critical Playwright smoke tests, production image build, Terraform format/validate/plan where affected, security scans, and SonarCloud quality gate. The stale Sonar configuration must be amended for TypeScript tests, web/E2E roots, and `infra/terraform`; SonarCloud is retained. [U-20]

Release acceptance maps each `REQ-*` to an automated test, review record, research evidence, or approved manual check. An open gate cannot be marked pass by an implementation test that assumes a value.

## 15. Observability and operations

The API emits one-line structured JSON with timestamp, severity, service/version/environment, request ID, route template, status, latency, and a pseudonymous actor class/ID only where needed. It never records request/response bodies by default. Security-relevant parent actions (browser revoke, PIN change, balance adjustment, request resolution, consent change, deletion) emit sanitized audit events; retention and legal treatment await `OQ-06`.

Cost-conscious pilot signals use CloudWatch and AWS-native service metrics:

- CloudFront/ALB request rate, latency, 4xx/5xx;
- ECS desired/running task count, CPU/memory, deployment failure/restart;
- API readiness, unhandled errors, DB pool saturation, lock/conflict and idempotency replay counts;
- RDS CPU, connections, free storage, latency, backup status;
- registration denial/rate-lock counts without email/PIN/IP values;
- financial invariant violation attempts, failed deletions, and optional-event rejection without payloads.

Alerts route to an approved pilot-operator channel for sustained 5xx/readiness failure, no running task, database/storage risk, backup failure, deletion failure, and financial-invariant errors. Exact thresholds, on-call coverage, log/audit retention, SLOs, RTO, and RPO are not invented; `OQ-05`, `OQ-06`, and `OQ-13` must set them. OpenTelemetry traces/X-Ray and a separate analytics warehouse are deferred unless pilot diagnosis/scale justifies their cost.

Health endpoints distinguish liveness from readiness. Readiness checks a bounded database query and required configuration presence but never exposes secret or participant values.

## 16. Local Docker and Docker Compose topology

`compose.yaml` provides one documented command that starts:

| Service | Purpose | Development behavior |
|---|---|---|
| `db` | PostgreSQL matching the selected production major | Named volume, health check, local-only credentials, host port optional |
| `migrate` | One-shot checked-in migration runner | Waits for healthy DB; must succeed before API readiness |
| `api` | NestJS/Fastify API | Source bind mount or workspace volume, watch/hot reload, API port exposed locally |
| `web` | Vite development server | Source hot reload, browser port, `/api` proxy preserving same-origin behavior |

There is no local Redis, mail service, CMS, or analytics vendor. Seed data is deterministic, clearly synthetic, contains no real child/parent data, and is an explicit development command rather than automatic production behavior. Compose supplies synthetic development-only allowlist, CSRF, PIN-pepper, blind-index, and session-token configuration without reading the ignored host `.env`; API startup fails if those development values or insecure local cookie mode are selected outside development. Containers run as non-root where compatible, use lockfile-frozen installs in CI/production stages, and have separate development targets so bind mounts do not overwrite container dependencies.

The migration job is also the deployment model: CI tests migrations from empty and prior supported schema, and ECS runs a one-off migration task before a compatible API rollout. Destructive migrations use expand/migrate/contract steps and cannot be coupled to an unrecoverable application deploy.

## 17. CI/CD and Terraform AWS architecture

### 17.1 Environments and artifact promotion

- `nonprod` and `prod` are separate Terraform root modules. Separate AWS accounts are the **proposed** stronger-isolation default, not an approved fact; `OQ-13`/implementation-plan Task 4 must approve account IDs/ownership or explicitly accept and mitigate a same-account alternative before environment implementation.
- Each approved environment boundary has its own backend key, IAM roles, VPC, database, secrets, logs, allowlist, and data; state buckets/KMS keys and AWS accounts follow the approved isolation decision. No participant data is copied between environments.
- Pull requests run checks and Terraform plans with no apply.
- Merge to protected `main` builds the API image and immutable web artifact once, identifies both by commit SHA/digest, applies nonprod infrastructure changes, migrates, deploys, and runs smoke tests automatically.
- Production promotes the same tested artifact versions through a protected GitHub `production` Environment with manual approval. It applies reviewed Terraform, runs backup/preflight and migration, deploys with ECS health rollback, then executes smoke tests.
- GitHub uses short-lived AWS OIDC roles; there are no long-lived AWS keys in repository secrets.

Database migration rollback is not assumed. Deployments use backward-compatible schema changes and API rollback to the previous image where safe; data repair/restoration follows the approved runbook and `OQ-13` recovery objectives.

### 17.2 Network and request path

```text
Browser
  -> CloudFront (TLS, SPA assets, uncached /api behavior)
       -> private S3 bucket through Origin Access Control
       -> public ALB restricted to CloudFront origin-facing traffic plus distribution proof
            -> ECS Fargate task security group
                 -> private RDS PostgreSQL security group
                 -> Secrets Manager / ECR / CloudWatch AWS endpoints over controlled egress
```

The VPC spans at least two Availability Zones for ALB compatibility and DB subnet placement. RDS has no public address. For the private-pilot cost baseline, ECS tasks may run with public IPs in public subnets but accept inbound traffic only from the ALB security group; this avoids a standing NAT Gateway/interface-endpoint fleet. This is an explicit cost/security trade-off: task addresses are internet-routable but not ingress-reachable under security-group policy. Private application subnets with NAT or required VPC endpoints are the stronger alternative and must be selected if the `OQ-05` budget and `OQ-13` threat review support it.

CloudFront provides same-origin web/API access. Its `/api/*` behavior disables caching, forwards the allowlisted cookies, CSRF/Origin/content headers, query strings, and methods required by the REST contract, and never applies the SPA HTML fallback to API errors. Static-asset caching is immutable by content hash; only navigation misses use the SPA fallback.

S3 blocks public access and uses OAC. A public ALB cannot be made specific to one distribution by the CloudFront managed prefix list alone, so origin ingress uses both that prefix list and a rotated distribution-specific custom header checked by an ALB listener rule or WAF; direct ALB requests and requests through another distribution are negative-tested. The proof value is treated as sensitive deployment configuration and its Terraform-state exposure/rotation is approved under `OQ-13`.

TLS is required end to end. Because an ALB origin needs a publicly trusted certificate for a hostname CloudFront can validate, Task 4 must identify controlled DNS/origin hostname and certificate regions before edge implementation; a CloudFront default viewer hostname does not remove that origin prerequisite. Security headers include a restrictive CSP, HSTS after domain validation, nosniff, referrer policy, and frame restrictions. ALB and task security groups use least privilege. RDS enforces encrypted storage and TLS connections.

### 17.3 Services and cost posture

Terraform defines:

- S3 web bucket, versioning/lifecycle as approved, CloudFront distribution/OAC and access logging policy;
- ECR repository with scan-on-push and lifecycle limits;
- ECS cluster/service/task definition, one-off migration task, ALB/target group, bounded autoscaling;
- RDS PostgreSQL subnet/parameter groups, KMS encryption, Secrets Manager credentials, backups and deletion protection appropriate to environment;
- CloudWatch log groups, dashboards/alarms, SNS/operator routing, AWS Budget alerts;
- IAM task execution/application/deployment roles with least privilege;
- environment-specific origin DNS/ACM required for CloudFront-to-ALB TLS, plus viewer DNS/ACM when a custom pilot-facing domain is approved.

For a low-volume private pilot, start with one small API task and a smallest benchmark-adequate Graviton/burstable single-AZ database, short but legally approved log retention, no NAT Gateway, no cache, no multi-AZ database, and bounded autoscaling. These are **proposed cost defaults**, not locked facts: exact region, task/database sizes, desired counts, storage, Multi-AZ, backup retention, limits, and monthly budget require `OQ-05`/`OQ-06`/`OQ-13` approval before a production plan can pass. Production deletion protection and restore testing are required; HA/RTO/RPO levels remain open.

Likely standing-cost drivers are ALB, RDS, ECS task runtime, CloudFront/log storage, and optional NAT/endpoints. Terraform must tag resources by product/environment/owner, expose cost-relevant variables, create budget alarms, and produce an estimated monthly cost review before apply. A serverless redesign is not silently introduced to save cost because it conflicts with the selected baseline; if budget cannot support the baseline, return to architecture approval.

### 17.4 Terraform state and secrets

A small bootstrap stack creates a versioned, encrypted S3 state bucket with native state locking where supported and tightly scoped CI roles; bootstrap state handling is documented separately. Each environment has an independent backend key/account. Plans are artifacts with controlled retention and are reviewed for sensitive output.

Terraform creates secret containers and IAM references, not participant emails, password/PIN secrets, or production credential values. RDS credentials are generated/stored in Secrets Manager. Application secret rotation must support overlapping token/blind-index key versions where immediate rotation would otherwise lock out all profiles.

## 18. Open decisions, alternatives, and implementation gates

| Gate | Unresolved input | What this specification does / does not decide | Blocks |
|---|---|---|---|
| `OQ-01` | Jurisdiction | Makes no COPPA/GDPR/other compliance claim | Privacy approval and any availability legal review requires |
| `OQ-02` | Success/usability thresholds | Defines evidence dimensions only | Pilot measurement start and success verdict |
| `OQ-03` | Educational curve/hints | Defines schemas/mechanics, not content values | Content acceptance and learning implementation fixture approval |
| `OQ-04` | Rate/lock threshold and scopes | Defines configurable PostgreSQL-backed control, no numbers; the companion security policy must also approve otherwise-unspecified parent session/reauthentication and Authorized Browser lifetimes | Authentication specification approval and release tests |
| `OQ-05` | Families, concurrency, region, budget | Defines scalable baseline and explicit low-cost options, no approved size | Production Terraform plan/cost approval |
| `OQ-06` | Legal lifecycle/backups/audit/export | Defines active-store ownership and deletion mechanics only | Privacy approval, retention/backup configuration, deletion acceptance |
| `OQ-07` | Ledger/idempotency retention | Proposes opaque-source ledger plus non-secret command receipts until child/family deletion | Economy data-design approval |
| `OQ-08` | Empty-family/shop UX | Allows zero-state technically; does not select journey copy/order | Onboarding design acceptance |
| `OQ-09` | Analytics contract | Defines consent gate and first-party boundary; no events are inferred | Any optional analytics code/event collection |
| `OQ-10` | Browser/TTS matrix | Defines standards/fallback strategy, no versions/voices | Release browser test plan |
| `OQ-11` | Technical balance ceiling | Proposes PostgreSQL bigint ceiling and decimal-string API | Economy data-design approval |
| `OQ-12` | Brand/assets/scripts | Defines content locations/interfaces only | Design/content production acceptance |
| `OQ-13` | Cloud details | Proposes account isolation and a cost-aware topology; account ownership, origin DNS/TLS proof, exact sizing, retention, recovery, and alerts remain unapproved | Infrastructure implementation and production approval |
| `OQ-14` | Family Timezone refresh behavior | Defines the stored-timezone day-count baseline but does not decide what happens when a refresh crosses a calendar-day boundary | Session-start/day-boundary approval and release tests |
| `OQ-15` | Duplicate/concurrent Game Session starts | Does not decide whether a second start resumes an existing run, fails, or consumes a distinct daily slot | Session-start concurrency approval and release tests |

No gate may be “closed” solely by merging code that assumes an answer. Approval belongs in the decision records named by the implementation plan and must update this table if it changes the architecture.

## 19. Traceability summary

| Specification area | Primary PRD/discovery trace |
|---|---|
| Product and architecture boundary | REQ-PROD-01–05, `U-19`–`U-21` |
| Identity, onboarding, roles | REQ-AUTH-01–10, REQ-CHILD-01–07 |
| Placement/progression/sessions | REQ-LEARN-01–10, REQ-GAME-01–13 |
| Currency/content/presentation | REQ-CUR-01–04, REQ-UX-01–08 |
| Shop, goal, request | REQ-SHOP-01–09, REQ-REQ-01–10 |
| Economy/dashboard | REQ-BAL-01–05, REQ-PARENT-01–04 |
| Privacy/deletion/analytics | REQ-PRIV-01–06 |
| Local/cloud/delivery and repository guidance | Assignment `[A]`, `U-20`, `U-23`, discovery sections 9 and 12 |

Detailed implementation-task traceability and phase acceptance evidence are in the companion plan.

## 20. Readiness and risk verdict

**Planning-review verdict: CONDITIONALLY READY FOR BACKLOG BREAKDOWN; NOT READY FOR IMPLEMENTATION COMMITMENT OR PILOT RELEASE.**

The architecture is coherent for a private Family-loop MVP: a modular NestJS/PostgreSQL transaction boundary directly addresses the highest integrity risks, opaque revocable credentials fit the Authorized Browser/Child PIN model, and the selected AWS shape honors the discovery decision. The principal residual risks are not coding unknowns: jurisdiction/data lifecycle (`OQ-01`, `OQ-06`), credential-defense policy (`OQ-04`), educational content (`OQ-03`), numeric/idempotency approval (`OQ-07`, `OQ-11`), browser/usability criteria (`OQ-02`, `OQ-10`), timezone and session-start behavior (`OQ-14`, `OQ-15`), analytics scope (`OQ-09`), and cost/scale/recovery (`OQ-05`, `OQ-13`).

Safe work may begin on reversible repository/tooling scaffolding in parallel with decision closure. Authentication acceptance, content acceptance, economy schema approval, optional analytics, production infrastructure, and pilot release must stop at their named gates. There is no evidence yet from running code, tests, cost plans, legal review, content review, or child usability work; this verdict must be replaced by evidence at the implementation plan's phase gates.
