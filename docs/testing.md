# Test check registry

## Task 14 blocking PR quality (#23)

Trace: implementation-plan Task 14; U-20; technical specification §14.2 and §17.1.
Scope expansion was user-approved on 2026-10-06 (objective 277). Historical dated
Task 11/13 evidence below describes those revisions, not present CI activation.
No domain behavior, AWS resources, OQ approval or repository settings are added.

| Check                              | Command                                                                   | Evidence scope                                                                                                                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository formatting              | `pnpm format:check`                                                       | Authored source/config/docs and generated contracts; excludes private/output state and IssueMe-generated snapshots. Four planning documents receive formatting-only normalization.                                                                                                                                  |
| Strict lint                        | `pnpm lint --force`                                                       | Five workspace lint tasks plus root CI scripts; typed tests/configs included, zero warnings allowed.                                                                                                                                                                                                                |
| Source/test types                  | `pnpm type-check --force && pnpm exec turbo run type-check:tests --force` | Production projects plus API/web/shared test/config projects, without skipping library checks. E2E is in its normal project.                                                                                                                                                                                        |
| Workflow regression                | `pnpm test:ci-policy`                                                     | Pinned actions/read-only permissions, required gates, bypass mutations, aggregate shell for 25 result combinations, Terraform HCL/JSON rejection, hygiene, LCOV path/record negatives and installer symlink confinement.                                                                                            |
| Unit/component/PostgreSQL coverage | `pnpm test:coverage`                                                      | Shared unit tests, real React DOM readiness checks (including malformed response shapes and non-200 success statuses) and all API tests including Testcontainers PostgreSQL. Requires explicit local Docker. No absent-test success for these suites. Content remains an empty seam, not approved learning content. |
| Coverage normalization             | `node scripts/prepare-coverage.mjs`                                       | Requires three nonempty LCOV reports and existing workspace TS paths; maps them to root-relative paths for Sonar. Never use partial API selections as full CI coverage evidence.                                                                                                                                    |
| Browser and production images      | `pnpm --filter @mobey/e2e test`                                           | Compose Watch regression mutates the extracted app heading and API route, fails immediately on missing anchors and restores sources; production-built platform smoke. Chromium and local Docker required. `pnpm test:platform` selects just the new smoke.                                                          |
| Contract drift                     | `pnpm contract --force`                                                   | Generator-owned bytes checked without rewriting reviewed output.                                                                                                                                                                                                                                                    |
| Dependency security                | `pnpm audit`                                                              | All locked dependencies/severities, no advisory exclusions.                                                                                                                                                                                                                                                         |
| Clean-checkout hygiene             | `node scripts/check-hygiene.mjs`                                          | Run before install/build only on clean source. Rejects private/generated paths and symlinks without reading their contents; reviewed env templates, migration SQL, contracts and lockfiles remain allowed. Not a command to run on an ordinary installed/private local checkout.                                    |

`.github/workflows/ci.yml` additionally runs checksum-pinned actionlint, Gitleaks
(redacted), Trivy configuration checks and all-severity scans of both production
images. Tools live under runner/system temporary storage; pins and installer are
in `scripts/ci-tools.json` and `scripts/install-ci-tool.mjs`. No unfixed findings,
scanner failures or missing coverage are ignored. Gitleaks excludes dependency,
Git/agent/cache trees, not authored source. An exact-match regex allowlist accepts
only the public `OpenAPI SHA-256` integrity marker, not its entire generated file.
`scripts/test-gitleaks.mjs` proves a fabricated credential in that same file still
fails scanning; never replace the regex with a whole-file path allowlist.
Trivy configuration excludes those
same non-source dependency/cache trees. The early hygiene gate rejects such paths
if accidentally included in a clean source checkout.

The workflow checks the runner's local Unix Docker socket before database/browser
commands. The new smoke uses a whitelisted temporary source copy, UUID-namespaced
images/project/volume and random loopback port; it removes only its own resources.
It runs real migrations and verifies browser-observed readiness through a test-only
Nginx routing layer over the same production-built SPA assets and unchanged API image.
The routing layer uses its own image rather than a host bind mount, so macOS VM
mount assumptions cannot change the target. Cleanup failure preserves the owned
project's recovery files and fails the suite rather than hiding orphaned resources.
`NODE_ENV=test` is explicit for synthetic PostgreSQL without TLS. Neither that proxy
nor image liveness probes constitute deployed CloudFront/TLS/rollout-policy evidence.
No participant data or implicit `.env` is used.

Security remediation pins the Fastify adapter/runtime patch releases and narrow
transitive overrides for esbuild, undici, fast-uri, brace-expansion, grpc-js and
source-map-js. A PostCSS patch-level override fixes the missing `NodeProps` declaration
exposed when type-checking Vitest configs; no `skipLibCheck` workaround is used.
Existing API/contract and exact-money tests protect these compatibility boundaries.

Sonar includes actual TypeScript web/API/shared/content/E2E tests, excludes generated,
vendor, build and Terraform state/plan output, and imports normalized LCOV.
`SONAR_TOKEN` must be an analysis-scoped repository secret reference; it is never
written to files. Missing token, failed quality gate or timeout fails the job,
including on fork PRs. Do not introduce `pull_request_target` to bypass that boundary.
`CI required` uses `always()` and fails unless both quality and Sonar jobs succeeded.
An administrator must separately require that check and establish live PR/Sonar
results; file presence and local negative probes do not prove protected-main behavior.
Intentional format/type/test/contract/Sonar failures still require a disposable live
PR for GitHub-level acceptance evidence.

Terraform does not exist. No region/account/backend/OQ default or cloud plan is
invented. A fail-closed surface guard rejects newly introduced Terraform until its
owner adds approved isolated format/validate/security/plan checks, using the local
emulator required by agent guidance. There are no apply/deploy jobs or AWS permissions.

### Local implementation verification — 2026-10-06

Node 24.20.0 / pnpm 11.25.0 verification passed frozen install, repository format,
five-workspace/root-script typed lint, uncached build/source/test type-checks,
uncached contract drift, peer compatibility and all-severity audit (zero advisories).
Shared tests passed 172 cases; web component tests passed six; three non-database
API suites passed 108; the focused database-tooling selection passed six while
excluding the ten real-PostgreSQL cases. Nine CI-policy tests passed, including
25 aggregate-result combinations and actual missing-token failure. These are
working-tree results, not a tested publication revision.

Isolated probes proved format/lint/type checks reject broken TS and component
checks reject broken readiness. The redacted scanner control accepts the public
schema hash but rejects a fabricated credential in the same generated file.
Actionlint passed; the rendered production-smoke Compose model passed explicit
`--env-file /dev/null` validation. A sanitized source copy passed clean-source
hygiene and Gitleaks (zero findings). Trivy found the two pre-existing missing-image
HEALTHCHECKs before correction and zero findings in both Dockerfiles afterwards.
The source copy is not clean-clone or tracked-file evidence.

The explicitly selected local Colima socket was unavailable. No PostgreSQL,
Compose/browser runtime, production image build/health or image vulnerability-scan
pass is claimed. Eight Playwright cases were discovered but not executed. Live
GitHub/Sonar runs, intentional-failure PR evidence and repository-settings
verification also remain required before issue acceptance; no cloud target was used.

### Exact implementation manifest

- `.github/workflows/ci.yml`, `sonar-project.properties`, `.gitignore`,
  `.prettierignore`, `.gitleaks.toml`, `eslint.config.mjs`, `package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`.
- `scripts/check-hygiene.mjs`, `scripts/ci-policy.test.mjs`, `scripts/ci-tools.json`,
  `scripts/install-ci-tool.mjs`, `scripts/prepare-coverage.mjs`, `scripts/test-gitleaks.mjs`.
- `apps/api/package.json`, `apps/api/Dockerfile`, `apps/api/tsconfig.eslint.json`,
  `apps/api/vitest.config.ts`, `apps/api/src/openapi.ts`,
  `apps/api/test/health-version.spec.ts`, `apps/api/test/http-contract.spec.ts`,
  `apps/api/test/local-runtime.spec.ts` (typed lint/cleanup companions, not public API changes).
- `apps/web/package.json`, `apps/web/Dockerfile`, `apps/web/tsconfig.eslint.json`,
  `apps/web/vitest.config.ts`, `apps/web/src/main.tsx`, `apps/web/src/app.tsx`,
  `apps/web/src/app.test.tsx` (extract existing readiness view without changing behavior).
- `packages/shared/package.json`, `packages/shared/tsconfig.eslint.json`,
  `packages/shared/vitest.config.ts`, `packages/shared/src/money.ts` (lint-equivalent
  split exact-match guards and explicit BigInt string formatting, no money-boundary change).
- `packages/content/package.json`, `packages/content/tsconfig.eslint.json`.
- `tests/e2e/package.json`, `tests/e2e/platform-smoke.spec.ts`,
  `tests/e2e/local-compose.spec.ts` (remove unnecessary async only).
- `README.md`, `AGENTS.md`, `docs/testing.md`,
  `docs/plans/mobey-mvp-implementation-plan.md` (scope alignment and formatting),
  `docs/discovery/mobey-initial-product-discovery.md`, `docs/product/mobey-prd.md`,
  `docs/technical/mobey-technical-spec.md` (last three formatting only).

Synchronize the live issue/PR manifest with these user-approved companions before
publication. Foundational ignore rules from #71 remain intact; additions cover
credential files, plan JSON/captured outputs, scanner cache and local volume paths.
Ignore rules and scanners prevent accidents, not deliberate force-adds or credentials
whose format no scanner recognizes; templates remain subject to redacted scanning.

Run checks with Node 24.20.0 and pnpm 11.25.0. PostgreSQL checks require a reachable
Docker daemon; a tooling-only pass is **not** migration acceptance. API build and
type-check commands build the shared runtime dependency first, including direct package
runs without prior build output. API tests and contract commands use that build path so
package-entrypoint and CLI checks execute current compiled output.

| Check                                  | Command                                                                                                                                                                                                                                                                                                                                                                         | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Scope                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Shared package type-check              | `pnpm --filter @mobey/shared type-check`                                                                                                                                                                                                                                                                                                                                        | Checks the shared package's public TypeScript seam under its strict compiler policy.                                                                                                                                                                                                                                                                                                                                                                                                    | Focused package check                                |
| Shared package unit tests              | `pnpm --filter @mobey/shared test`                                                                                                                                                                                                                                                                                                                                              | Runs `packages/shared/src/index.test.ts` and `money.test.ts`, covering application identity and root-exported Game Money conversion and checked addition/subtraction/multiplication/sum: operand bounds, factor validation, full-list validation before accumulation, empty/readonly lists, failure-path input preservation, overflow, insufficient funds, exact large values, boundary-pair arithmetic inverses, error codes, safe diagnostics, canonical formatting, and round trips. | Focused package suite                                |
| API database type-check                | `pnpm --filter @mobey/api type-check`                                                                                                                                                                                                                                                                                                                                           | Checks the Drizzle/pg connection boundary, migration runner, and readiness wiring under the strict API compiler policy.                                                                                                                                                                                                                                                                                                                                                                 | Focused package check                                |
| Drizzle configuration check            | `NODE_ENV=test DATABASE_URL=postgresql://mobey:synthetic@127.0.0.1:5432/mobey pnpm --filter @mobey/api exec node --no-warnings --experimental-strip-types --input-type=module --eval "const { default: config } = await import('./drizzle.config.ts'); if (config.dialect !== 'postgresql') process.exit(1); if (config.out !== './src/database/migrations') process.exit(1);"` | Loads the PostgreSQL-only Drizzle configuration and verifies its checked-migration path without connecting to a database or generating artifacts.                                                                                                                                                                                                                                                                                                                                       | Focused configuration check                          |
| API declaration/runtime/CLI regression | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/platform-migration.integration.spec.ts -t 'platform tooling'`                                                                                                                                                                                                                                  | Compiles positive and negative typed-client fixtures with the API's strict settings; checks query construction, patched declarations against runtime, explicit bounds/TLS configuration, unreachable-DB readiness, and generic CLI failure output. No database substitute.                                                                                                                                                                                                              | Focused tooling selection; excludes PostgreSQL cases |
| PostgreSQL platform migration          | `pnpm --filter @mobey/api test -- platform-migration.integration.spec.ts`                                                                                                                                                                                                                                                                                                       | Runs the Task 12 migration/readiness suite against a real PostgreSQL Testcontainers instance, including apply-once/concurrent ledger assertions, compatible migration-before-rollout/readiness, transactional failure rollback, checksum/order rejection, missing dependency readiness, TLS, and bounded pool settings.                                                                                                                                                                 | Focused PostgreSQL integration                       |
| Patched install determinism            | `before=$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml); pnpm install && pnpm install --frozen-lockfile && test "$before" = "$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml)"`                                                                                                                                                                                          | Ordinary and frozen installs apply the registered patch without changing the lockfile or lifecycle policy.                                                                                                                                                                                                                                                                                                                                                                              | Workspace install check                              |

## Shared Game Money conversion (#85)

Trace: #85 (depends on #68), #87 (depends on #85); REQ-BAL-01–05 and the
exact-arithmetic safeguard REQ-BAL-06 (U-10). Run only this suite with
`pnpm --filter @mobey/shared exec vitest run src/money.test.ts`.

`parseGameMoney` and `formatGameMoney` are standalone, exact two-decimal-to-minor-unit
conversions exposed through the shared package root. Their 15-integer-digit bound
is specific to the standalone #85/#87/#95/#97 utility contract. They are **not** the existing API's
signed integer-string transport, do not introduce fractional Game Money into domain
behavior, and do not approve a durable balance ceiling or close OQ-11. No API route,
generated contract, database schema, or migration changes here.

The shared suite also guards against echoing rejected synthetic amounts in error
messages. The existing API HTTP-contract suite verifies all four conversion exports
through the **compiled** `@mobey/shared` package root in Node, plus their declaration
compatibility with the real web compiler configuration. Negative compiler fixtures
reject numeric parser inputs, non-BigInt formatter inputs, and unknown error codes.
Run the registered HTTP and generated contract regression command for this seam;
no browser, API money endpoint, or PostgreSQL is needed for these checks.

The diagnostic guards were confirmed to fail for both malformed and oversized
inputs when an isolated temporary source copy echoed inputs in error messages.
The compiled-root guard failed when a temporary Node loader removed the money
exports. All temporary probes were deleted; repository production code was not
modified during these sensitivity checks.

## Shared Game Money sum (#97)

Trace: #97 (depends on #87); REQ-BAL-06 (U-10). Use the registered shared unit
suite or its focused money-file command above. The standalone utility boundary
and unresolved OQ-11 gate described above apply; no domain totals are introduced.

`sumGameMoney(amounts: readonly bigint[]): bigint` validates every element before
any arithmetic (`NEGATIVE` below zero, `TOO_LARGE` above
`GAME_MONEY_MAX_MINOR`), then accumulates with `addGameMoney`. An empty list
returns `0n`; a running total above the utility maximum throws `TOO_LARGE`.
The input is not modified, and amounts never pass through `Number`.

The money suite checks empty/single/multiple/zero/maximum totals, exact sums above
JavaScript's safe-integer range, oversized and negative elements, overflow at
multiple positions, full-list validation before an overflowing prefix is added,
frozen readonly input, mutable-input preservation after validation or accumulation
failure, and the parse/sum/format pipeline `0.10 + 0.20 = 0.30`.
The public readonly-array/bigint signature is checked by the registered test
TypeScript command. Before implementation, all 22 new runtime cases failed against
the absent root export while the existing money cases passed.
Independent QA guards input preservation after both operand-validation failure
and running-total overflow. Each guard invokes the sum once and checks the original
list; both failed when an isolated temporary source copy reversed the input on
error. Temporary probes were deleted; repository production code was not modified.

## Shared Game Money multiplication (#95)

Trace: #95 (depends on #87); REQ-BAL-06 (U-10). Use the registered shared unit
suite or its focused money-file command above. The standalone utility boundary
and unresolved OQ-11 gate described above apply; no reward rules are introduced.

`multiplyGameMoney(amount, factor)` takes and returns bigint minor units. It first
validates the amount (`NEGATIVE` below zero, `TOO_LARGE` above
`GAME_MONEY_MAX_MINOR`), then rejects negative factors with `NEGATIVE`. The factor
is dimensionless and has no independent upper bound. Products above the utility
maximum throw `TOO_LARGE`; successful results stay within the inclusive bounds.
All arithmetic uses bigint without conversion through `Number`.

The money suite checks zero/unit/maximum cases, exact products above JavaScript's
safe-integer range, factors beyond the amount bound, overflow boundaries, amount
validation before factor validation or zero multiplication, and the parse/multiply/
format pipeline `0.25 * 4 = 1.00`. All 26 implementation cases failed against the
absent root export before implementation, while the 113 existing money cases passed.
Independent QA adds last-valid/first-overflow amount checks across varied bigint
factors, including factors around the safe-integer boundary, plus a public
bigint-only signature assertion checked by the registered test TypeScript command.
These guards detect Number-based rounding, a missing product overflow guard, and
a widened result type in isolated temporary source copies. Temporary probes were
deleted; repository production code was not modified.

## Shared Game Money arithmetic (#87)

Trace: #87 (depends on #85); REQ-BAL-03, REQ-BAL-05–06 (U-10).
Use the registered shared unit suite or its focused money-file command above.
The standalone utility boundary and unresolved OQ-11 gate described above apply.

`addGameMoney(a, b)` and `subtractGameMoney(a, b)` take and return bigint minor
units. Each validates both operands before arithmetic: below zero is `NEGATIVE`,
above `GAME_MONEY_MAX_MINOR` is `TOO_LARGE`. Addition rejects an oversized sum with
`TOO_LARGE`; subtraction rejects `b > a` with `INSUFFICIENT`. Successful results
stay in the inclusive utility bounds, without conversion through `Number`.
`GameMoneyError` preserves the constructor's literal code type while its default
code union includes `INSUFFICIENT`; the existing web conversion consumer fixture
continues to compile without changing or weakening its checks.
The money suite checks both operand positions, zero/equal/maximum boundaries,
exact results above the JavaScript safe-integer range, and the parse/add/format
pipeline `0.10 + 0.20 = 0.30`. Before implementation, all 44 new arithmetic cases
failed against the absent root exports while the 66 conversion cases passed.

The boundary-pair sweep covers 81 ordered pairs around decimal carries, JavaScript's
safe-integer boundary, and the utility ceiling: 65 exact sums recover both operands
via subtraction, while 16 oversized sums reject with `TOO_LARGE` even though neither
operand reaches the maximum. The two sweep tests were sensitivity-checked using
isolated temporary source copies: Number-rounded addition, Number-rounded
subtraction, and wrapped overflow each caused the relevant new test to fail.
Temporary copies were cleaned up; production source was not modified.

## Task 13 REST contract (#22)

Trace: implementation plan Task 13; technical specification §11.1–11.3;
REQ-BAL-05 (U-10), with exact-integer transport supporting REQ-BAL-06.
This is platform scaffolding, not implementation of the domain routes in §11.2.
OQ-04 lockout durations and OQ-11 balance ceilings remain explicit decision gates.

| Check                                  | Command                                                                                                                                                                                                                                                                                                                                            | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                          | Scope                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Version route regression               | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/health-version.spec.ts`                                                                                                                                                                                                                                           | Runs `apps/api/test/health-version.spec.ts` against compiled Fastify/Nest output, proving the shared identity at `/api/v1/version`, the API package version and repeated reads at `/api/v1/health/version`, no-store JSON, and unchanged liveness/unavailable readiness without a database.                                                                                                                                             | Focused API route suite; no database required                 |
| HTTP and generated contract regression | `pnpm --filter @mobey/shared build && pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/http-contract.spec.ts`                                                                                                                                                                                                       | Runs `apps/api/test/http-contract.spec.ts`: real Fastify/Nest validation, the exact shared application identity response, every stable error code against its schema, redaction, parser/size errors, request IDs, exact decimal strings, required generated type/package-root consumer constraints, compiled shared money exports and production identity/runtime wiring, deterministic generation, and missing/stale output rejection. | Focused API contract suite; no database required              |
| Regenerate reviewed contract           | `pnpm --filter @mobey/api contract:generate`                                                                                                                                                                                                                                                                                                       | Builds the API and replaces only the generator-owned `packages/shared/src/generated/api.ts` from current Nest OpenAPI metadata.                                                                                                                                                                                                                                                                                                         | Generation command; review the diff, not a correctness gate   |
| Generated contract drift               | `pnpm --filter @mobey/api contract`                                                                                                                                                                                                                                                                                                                | Builds the API, generates into an isolated temporary directory, and fails if the reviewed artifact is absent or byte-different; never overwrites reviewed output.                                                                                                                                                                                                                                                                       | Database-independent contract gate for Task 14 CI integration |
| Workspace contract entrypoint          | `pnpm contract --force`                                                                                                                                                                                                                                                                                                                            | Runs the API contract check through the existing Turbo task without using its cache.                                                                                                                                                                                                                                                                                                                                                    | Workspace contract gate                                       |
| Workspace build                        | `pnpm build`                                                                                                                                                                                                                                                                                                                                       | Builds all implemented workspace packages, including generated TypeScript.                                                                                                                                                                                                                                                                                                                                                              | Workspace suite                                               |
| Workspace type-check                   | `pnpm type-check`                                                                                                                                                                                                                                                                                                                                  | Runs declared package checks with their upstream build dependencies.                                                                                                                                                                                                                                                                                                                                                                    | Workspace suite                                               |
| Workspace tests                        | `pnpm test --env-mode=loose`                                                                                                                                                                                                                                                                                                                       | Runs declared suites, including real PostgreSQL migration/readiness tests and the HTTP contract suite. Docker is required.                                                                                                                                                                                                                                                                                                              | Workspace suite; not browser-journey or release evidence      |
| Workspace lint graph                   | `pnpm lint`                                                                                                                                                                                                                                                                                                                                        | Runs strict typed lint over five implemented workspaces plus root CI scripts; rejects warnings. Task 14 wires the previously empty graph.                                                                                                                                                                                                                                                                                               | Known Task 14/#23 limitation                                  |
| Contract-change formatting             | `pnpm --filter @mobey/api exec prettier --check src/main.ts src/app.module.ts src/common/http/problem-details.filter.ts src/openapi.ts test/http-contract.spec.ts package.json ../../packages/shared/src/generated/api.ts ../../packages/shared/src/index.ts ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ../../docs/testing.md ../../AGENTS.md` | Checks every changed source, generated artifact, manifest, and document using the pinned formatter and repository configuration.                                                                                                                                                                                                                                                                                                        | Exact Task 13 manifest                                        |

In an isolated worktree, set `TURBO_CACHE_DIR="$PWD/.turbo/cache"` before workspace
commands to keep Turbo's cache inside that checkout rather than its shared worktree
cache.

Additional tooling checks for this manifest:

| Check                         | Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | What it proves                                                                                                                                                                                                                                                    | Scope                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Contract test TypeScript      | `pnpm --filter @mobey/api exec tsc --ignoreConfig --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --experimentalDecorators --emitDecoratorMetadata --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noImplicitOverride --noUnusedLocals --noUnusedParameters --noPropertyAccessFromIndexSignature --verbatimModuleSyntax test/http-contract.spec.ts ../../packages/shared/src/money.test.ts ../../packages/shared/src/index.test.ts` | Type-checks the HTTP contract and shared test files plus imported production code without skipping library checks. Explicit options are needed because test files are excluded from the application tsconfig; production still receives its normal project check. | Focused test compiler check                    |
| Dependency peer compatibility | `pnpm peers check`                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Verifies declared dependency peer ranges, including Nest 12 and TypeScript 6 compatibility.                                                                                                                                                                       | Workspace dependency check                     |
| Dependency advisory inventory | `pnpm audit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Scans the locked graph at all severities. Task 14 remediates identified direct/transitive advisories; any new advisory remains blocking.                                                                                                                          | Inventory, not a passing security/release gate |

For local Colima PostgreSQL verification, export
`DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and
`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` before the database
or workspace suites. The workspace command uses Turbo's loose environment mode
because the current task configuration does not forward these variables in strict
mode; otherwise Ryuk receives a host-only socket path and container startup fails.
This changes environment forwarding, not test selection or assertions. No `.env`
file is loaded. Task 14 CI invokes coverage/E2E package scripts directly with explicit runner-local Docker/browser configuration, not loose Turbo forwarding.

### Runtime and generation boundaries

- `configureHttp` is shared by the production bootstrap and synthetic test-only
  controllers. Global validation rejects unknown fields without reporting targets,
  values, or private field names, including prototype-related keys that Nest would
  otherwise silently strip before whitelist validation. `@DecimalMoney()` combines runtime validation and
  OpenAPI string metadata; it accepts canonical signed base-10 integer strings,
  rejects JSON numbers, and performs no coercion or arithmetic. Endpoints must later
  constrain signs and enforce their approved bounds; accepting a large transport
  string is not approval to store it in PostgreSQL or apply it to a balance.
- The catch-all filter maps framework/parser failures and explicit stable codes to
  fixed safe RFC 9457 copy. Fastify's pre-routing error handler uses the same mapper
  and request-ID validation for malformed encoded URLs, which bypass Nest filters
  and `onRequest` hooks. Arbitrary exception messages, bodies, extension objects,
  URLs, and query strings are never serialized. `instance` is a request correlation
  URN, not a potentially private URL. Optional endpoint-specific `errors`/`current`
  extensions are not implemented. No authentication, rate limiter, money write,
  migration, logging destination, or participant fixture is introduced.
- Every application response carries `X-Request-Id`. Only canonical lowercase
  UUID-v4 client values are reused; absent/invalid values receive a fresh UUID.
  Explicit positive `Retry-After` durations are supported only for rate-limit codes;
  there is no default duration or implemented OQ-04 policy. Tests use a synthetic
  duration solely to prove header serialization.
- Existing `/api/v1/health/live` and `/api/v1/health/ready` JSON reports are preserved,
  including readiness's `503 {"status":"unavailable"}` operational report. OpenAPI
  documents this separately from controller exceptions, which use
  `application/problem+json`. `GET /api/v1/version` returns the shared package's application
  name, version, and description and disables caching; it adds no authentication or other build metadata.
  The separate `GET /api/v1/health/version` retains the API package version used by
  local Compose reload checks; both version routes have generated OpenAPI contracts.
  No documentation/UI or test-fixture route is served.
- Generation bootstraps the real application without listening or querying the
  database, and never loads `.env`. Nest Swagger is the schema authority;
  `@hey-api/openapi-ts` runs through its supported CLI with only the TypeScript
  plugin. Its declared peer range supports the pinned TypeScript 6 toolchain. CLI
  isolation avoids loading unused SDK/plugin library declarations into the API.
  Temporary generator files are removed in `finally`, and output is formatted with
  pinned Prettier. The artifact includes a complete OpenAPI SHA-256 digest so changes
  to patterns, headers, and other constraints invisible to TypeScript also trigger
  drift detection. Never hand-edit the artifact; regenerate and review it.
- Generated types are exported with a type-only re-export from the `@mobey/shared`
  package root; the existing runtime version accessor is unchanged. The contract
  suite compiles a consumer using the actual web configuration and built package
  export map, without source aliases or writing web source. It checks money,
  discriminated problem status and health types, plus negative numeric/status
  assignments. The API declares the existing shared workspace package as a runtime
  dependency for the version accessor, so Turbo's `^build` prerequisite and cache
  inputs include it. Direct API build and type-check commands also build shared first;
  API test and contract scripts use that build path. No external dependency or
  generated subpath is added for this seam.
- Swagger's transitive `@scarf/scarf` install script is explicitly denied in
  `pnpm-workspace.yaml`. No new lifecycle script is permitted. Frozen installation
  and generation work with this telemetry script denied. A targeted
  `@hey-api/json-schema-ref-parser>js-yaml` override pins patched `4.3.2`, removing
  GHSA-52cp-r559-cp3m and GHSA-5p4m-2wfm-xmqj from the generator's dependency chain.
  This leaves Swagger's separate YAML dependency and unrelated tooling unchanged.
- Task 14/#23 supplies CI workflow wiring, typed lint and Sonar correction. The
  local contract check does not establish branch protection or a passing release
  gate. Use the direct API command or `pnpm contract --force` for explicit uncached
  evidence. The shared workspace dependency puts generated-file changes in the API
  contract task's upstream build hash; this repairs the earlier artifact-only cache
  gap. CI must still define all relevant inputs/environment explicitly, including
  the web compiler configuration consumed by the package-entrypoint test. Task 14
  uses uncached CI checks, real typed lint and all-severity dependency scanning;
  its targeted esbuild override removes the earlier Drizzle Kit advisory.

The contract test was confirmed to fail when global error mapping, unknown-field
rejection, request-ID headers, or stale-output detection was disabled (four focused
failures), and when decimal syntax validation was relaxed (eleven failures).
The strict DTO schema test also failed before unknown-field rejection was reflected
in OpenAPI. All mutations were restored before the final verification run.
Independent review added body/query rejection of prototype-related unknown fields
and pre-routing malformed-URL redaction/correlation checks, including the compiled
production bootstrap. These produced seven expected failing cases before correction;
the complete focused suite passed all 89 cases at that point. The subsequently
approved package-entrypoint regression failed with three missing-export diagnostics
before the root type-only re-export was added. The suite passed all 90 cases at
that point, including positive package imports and independent negative assignments.
Issue #69 adds the public version response regression and extends the existing
OpenAPI route check, bringing the focused suite to 91 cases.

## Task 11 local Compose checks

| Check                                      | Command                                                                                                 | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Scope                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Local API runtime boundary                 | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/local-runtime.spec.ts` | `apps/api/test/local-runtime.spec.ts`: each synthetic local setting and insecure cookie mode is rejected outside development, malformed URL encoding produces a generic error, generic CLI failure, explicit container host and safe loopback default. Not authentication implementation.                                                                                                                                                                                                                                                                                                                                      | Focused runtime suite                                                        |
| Compose and production-image browser smoke | `pnpm test:compose`                                                                                     | `tests/e2e/local-compose.spec.ts`: clean source-copy startup through the documented Watch command, API image shared-package prerequisite build, real PostgreSQL apply-once ledger, browser readiness, distinct API/shared version identities and safe correlated problem details through the web proxy, HMR/API restart with unchanged images, new credential/output files excluded during active Watch, persisted ledger across recreation, failed migration blocks API, visible unavailable/ready browser states across database failure/recovery, synthetic context canaries excluded, non-root runnable production images. | Focused Docker/Chromium integration; not full product E2E or seed acceptance |
| Compose model validation                   | `docker compose --env-file /dev/null config --quiet`                                                    | Resolves the four-service model without implicit root `.env` loading.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Configuration smoke                                                          |
| Workspace build and types                  | `pnpm build && pnpm type-check`                                                                         | Builds the current packages and validates their existing strict TypeScript projects, including the Compose Playwright suite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Workspace checks                                                             |
| Workspace lint entrypoint                  | `pnpm lint`                                                                                             | Runs strict typed source/test lint for all five workspaces and root CI scripts; Task 14 replaces the formerly empty graph.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Known-limited workspace command                                              |
| Uncached local workspace tests             | `pnpm test --env-mode=loose --force`                                                                    | Runs existing package tests plus the runtime and Compose suites, without Turbo cache reuse; local Docker/browser environment variables are explicitly passed through. Does not load `.env`.                                                                                                                                                                                                                                                                                                                                                                                                                                    | Workspace tests; requires Docker and Chromium                                |

Install dependencies with `pnpm install --frozen-lockfile` using the versions above.
Install the existing browser dependency before Compose tests. To keep browser
binaries inside ignored checkout output, use the same absolute path for both commands:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" pnpm --filter @mobey/e2e exec playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" pnpm test:compose
```

For a non-default Docker socket (for example Colima), set
`DOCKER_HOST="$(docker context inspect --format '{{.Endpoints.docker.Host}}')"`
and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` in the test shell.
The normal strict Turbo graph does not forward arbitrary local Docker/browser
variables; `--env-mode=loose` above is an explicit local test invocation, not a CI
policy change. No host environment file is sourced. Optional
`PLAYWRIGHT_BROWSERS_PATH` can locate an existing browser installation.

The Compose test copies only required source inputs into a unique ignored
`node_modules/.compose-test-*` directory, with no host dependency tree or credential/
agent-state material. It creates its own synthetic `.env`/`.pi` exclusion canaries,
random loopback ports, UUID-namespaced containers, images and database volume,
then removes only those resources. Nested cloud/SSH credentials, certificate files
and build/coverage output are excluded from both the source copy and image context;
the suite creates synthetic canaries to check these exclusions. Persistence checks
retain the original ledger `applied_at`, not just a reproducible checksum/count.
Builds install frozen dependencies in images; dependency layers may reuse Docker's
content-addressed cache. Startup guards first reproduced failures
against the unmodified API; the image test also detected the initial production
packaging failure caused by pnpm's root `deploy` script shadowing its built-in
command (the image now uses `pnpm pm ... deploy` with frozen-lockfile configuration).
Restoring Vite's old loopback-only proxy also reproduced a 502 instead of the
required 200 in the clean Compose readiness check; the container proxy setting was
then restored and the suite rerun.

The explicit deterministic family/content seed is **not implemented or verified**:
Task 16/#25 owns the family/schema portion and Task 24/#33 owns approved content,
as traced by Task 11/#20 and the plan/specification. No schema/content/OQ behavior
is inferred from passing local platform tests. No Task 14 CI/Sonar correction,
full security gate or AWS/release evidence is claimed here.

### PR #101 scope reconciliation — 2026-10-06

Task 11 retains its 15 originally declared paths plus four API companions:
`apps/api/src/app.module.ts`, `apps/api/test/health-version.spec.ts`,
`apps/api/test/http-contract.spec.ts`, and generator-owned
`packages/shared/src/generated/api.ts`. The API-package version probe supports local
reload diagnostics; its compiled route regression and schema/drift checks preserve
both that probe and main's separate shared application identity endpoint.

The unrelated `.github/workflows/ci.yml` belongs to Task 14/#23, not Task 11.
The web footer, shared-version fallback, styling and rendering test are separate
presentation work; Compose uses main's existing heading/build/readiness markup.
Those four paths are removed from this PR's scope with their contents preserved
for separate delivery, not discarded. No CI, footer, style or web-unit coverage is
claimed by this PR. The retained browser suite still asserts build/readiness, HMR,
API restart, migration persistence/failure ordering and image safety without those
presentation changes. The authoritative Task 11 path list is in the implementation
plan; the live issue and exhaustive published PR manifest must match it before ready.

After removing the unrelated paths, Node 24.20.0 / pnpm 11.25.0 verification passed:
workspace build (four tasks, two cached), type-check (six tasks, three cached),
direct API contract drift check, Compose model validation, 124 API tests in four
files (including real PostgreSQL), and all seven Compose/browser/image tests.
The latter ran against a unique synthetic source copy, random loopback ports and
UUID-namespaced resources on the confirmed local Colima daemon; test-owned resources
were cleaned by the suite. Commands after selecting the pinned toolchain on `PATH`:

```sh
pnpm build
pnpm type-check
pnpm --filter @mobey/api contract
DOCKER_HOST=unix:///Users/senad/.colima/default/docker.sock docker compose --env-file /dev/null config --quiet
(cd apps/api && DOCKER_HOST=unix:///Users/senad/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock /Users/senad/Documents/Code/Moj_git/testing-orcme/node_modules/.ci-tools/node24/bin/node node_modules/vitest/vitest.mjs run --reporter=dot)
DOCKER_HOST=unix:///Users/senad/.colima/default/docker.sock PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" node_modules/.ci-tools/node24/bin/node tests/e2e/node_modules/@playwright/test/cli.js test tests/e2e/local-compose.spec.ts --workers=1 --reporter=line
```

The API test command uses the absolute in-checkout Node path because the harness
rejected the equivalent relative path during script inspection. No test, policy or
assertion was changed to pass. Changed source/registry formatting also passes;
the plan retains its surrounding style and the previously disclosed base-wide
formatting limitation.

Independent test verification (2026-10-06) extended the existing database
persistence test in `tests/e2e/local-compose.spec.ts` to assert the restored page's
visible `API readiness: unavailable` after a real migration-ledger mismatch and
`API readiness: ready` after stack recovery. A temporary browser-route fault
injection falsely returning healthy JSON failed the new unavailable assertion
(expected unavailable, received ready); the injection was removed before all
seven Compose tests passed. The API suite separately passed 124 tests in four
files, including real PostgreSQL. Type-check passed six tasks (five cached),
build passed four tasks (four cached), and direct contract/model checks passed.
The pinned Node 24.20.0 and pnpm 11.25.0 toolchain was used throughout.

An isolated local Compose browser inspection also confirmed the base-restored
heading/build/readiness markup, visible unavailable state on the disposable DB
mismatch, and ready state after recovery. `agent-browser` snapshot, console,
axe and read-back screenshots were checked: ready-state console had no errors;
axe reported zero violations/incomplete checks in both states (24 passes each).
This is a platform smoke check, not accessibility conformance. The browser and
all test-owned Compose services, volumes and images were stopped/removed.

Reconciliation verification is working-tree evidence only. Subsequent delivery
must attach test results and final independent review to the published revision.

### Task 11 implementation refresh — 2026-10-05

The existing Compose implementation was reused against issue #20's then-declared
15-path manifest. PR #101's later exhaustive scope reconciliation is recorded above;
this historical refresh was not proof that all earlier commits matched that manifest.
Context exclusions and synthetic canaries now cover nested credential directories,
certificate files and generated output. The persistence assertion also checks the
original migration timestamp, so rebuilding an empty database cannot masquerade
as retained storage. Compose model assertions no longer dump the inherited process
environment on failure.

Using the cached Node 24.20.0 binary with the pnpm 11.25.0 CLI directly, frozen
installation passes. Direct pinned-Node TypeScript builds for API/shared/content,
type-checks for web/E2E, and the Vite production build pass. Runtime and health-version
regressions pass (12 tests); Playwright lists all four Compose cases. The root
`pnpm` launcher selects Node 26.10.0 and is correctly rejected by engine enforcement;
no policy was weakened. Focused commands used after installation, from the root:

```sh
node_modules/.ci-tools/node24/bin/node apps/api/node_modules/typescript/bin/tsc --project apps/api/tsconfig.json
node_modules/.ci-tools/node24/bin/node apps/api/node_modules/vitest/vitest.mjs run --root apps/api test/local-runtime.spec.ts test/health-version.spec.ts
node_modules/.ci-tools/node24/bin/node tests/e2e/node_modules/typescript/bin/tsc --project tests/e2e/tsconfig.json --noEmit
node_modules/.ci-tools/node24/bin/node apps/web/node_modules/vite/bin/vite.js build apps/web
node_modules/.ci-tools/node24/bin/node tests/e2e/node_modules/@playwright/test/cli.js test tests/e2e/local-compose.spec.ts --list
docker compose --env-file /dev/null config --quiet
```

Compose 5.6.0 model validation passes. Neither configured local Docker socket
(default or Docker Desktop) is reachable, so the changed Compose/browser/image
suite has **not** been executed in this refresh. The prior results below do not
verify these changes. After Git-worker integration with current main, rerun
`pnpm test:compose` on a confirmed local Docker daemon and attach evidence to the
publication revision. Integration, independent review and PR publication evidence
remain outstanding; no clean-checkout runtime pass is claimed for that initial refresh.

### Docker-backed continuation — 2026-10-05

The user started local Colima. Docker context inspection and daemon information
confirmed `unix:///Users/senad/.colima/default/docker.sock`, Docker Engine 29.2.1
and Compose 5.6.0. The first clean-source attempt timed out during startup; a direct
pinned-image pull also timed out. Added bounded synthetic-stack startup diagnostics.
The retry reached readiness and passed database/image cases, but browser cases
failed because the matching Chromium binary was missing. Installing that pinned
browser under ignored `node_modules/.playwright-browsers` resolved the limitation.
The subsequent full Compose suite passed **all four tests** with Node 24.20.0:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" node_modules/.ci-tools/node24/bin/node tests/e2e/node_modules/@playwright/test/cli.js install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" node_modules/.ci-tools/node24/bin/node tests/e2e/node_modules/@playwright/test/cli.js test tests/e2e/local-compose.spec.ts --workers=1
```

This proves clean-source-copy startup without host dependencies/environment files,
browser readiness, web/API reload without image rebuilds, original ledger timestamp
persistence, failed-migration ordering, context canary exclusions and runnable
non-root production stages. Only the test's UUID-namespaced resources are removed;
other running local projects are preserved.

The API's full suite also passes **28 tests in three files**, including real
PostgreSQL migration regressions. Its initial root-directory invocation failed
fixture type resolution; rerunning from the package directory, as the registered
pnpm command does, passed without changing any tests or compiler configuration:

```sh
cd apps/api
DOCKER_HOST=unix:///Users/senad/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock ../../node_modules/.ci-tools/node24/bin/node node_modules/vitest/vitest.mjs run
```

These are preserved-working-tree results, **not evidence for a current-main-integrated
commit**. Integration remains unresolved because this worker cannot perform Git
operations. A Git-capable worker must integrate current main and rerun affected
checks before independent review and PR publication. Seed/CI/security exclusions
remain unchanged; no merge or release readiness is claimed.

### Current-main conflict-resolution verification — 2026-10-05

The five conflicted files preserve both the Compose/runtime work and main's REST
contract work. `GET /api/v1/health/version` still returns the API package version;
`GET /api/v1/version` still returns the shared application identity. Both disable
caching. Production HTTP validation, redacted problem details and correlation
headers remain enabled alongside the development-configuration rejection guard.

Required companion paths beyond the five conflicts are
`apps/api/test/http-contract.spec.ts` (the exact shipped-route inventory and health
version schema) and generator-owned `packages/shared/src/generated/api.ts`.
Preserving the existing health-version route initially produced three expected
contract failures: route inventory, stale generated output, and compiled drift
check. Updating the inventory/schema assertion and regenerating the artifact
resolved them; no generated output was hand-edited. Include both companion paths
in the issue/PR manifest before publication.

Verification used Node 24.20.0, pnpm 11.25.0, the confirmed local Colima socket
`unix:///Users/senad/.colima/default/docker.sock`, Docker Engine 29.2.1,
Compose 5.6.0 and the installed Playwright Chromium. Frozen installation, API
contract generation/check, workspace build (four tasks), workspace type-check
(six tasks including shared build), and Compose model validation passed.
The API suite passed **124 tests in four files**, including real-PostgreSQL
migration and HTTP-contract checks. The clean-source-copy Compose suite passed
**all six tests**, including the newly committed shared-build and active-Watch
exclusion regressions, HMR/restart, retained migration timestamp, failed-migration
ordering, context exclusions and non-root runnable production images.
Only UUID-namespaced test resources were changed and removed.

A separate strict compiler check initially reported missing declaration files for
the health test's compiled imports. The test now uses matching source-module types
for dynamically loaded compiled modules; it still exercises emitted Nest metadata.
The compiler check and all 124 API tests then passed without suppressions or changed
compiler policy. After selecting the pinned Node/pnpm binaries on `PATH`, commands
were:

```sh
pnpm install --frozen-lockfile
pnpm --filter @mobey/api contract:generate
pnpm --filter @mobey/api contract
pnpm build
pnpm type-check
pnpm --filter @mobey/api exec tsc --ignoreConfig --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --experimentalDecorators --emitDecoratorMetadata --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noImplicitOverride --noUnusedLocals --noUnusedParameters --noPropertyAccessFromIndexSignature --verbatimModuleSyntax test/health-version.spec.ts test/local-runtime.spec.ts test/http-contract.spec.ts
(cd apps/api && DOCKER_HOST=unix:///Users/senad/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock ../../node_modules/.ci-tools/node24/bin/node node_modules/vitest/vitest.mjs run)
DOCKER_HOST=unix:///Users/senad/.colima/default/docker.sock PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" node_modules/.ci-tools/node24/bin/node tests/e2e/node_modules/@playwright/test/cli.js test tests/e2e/local-compose.spec.ts --workers=1
docker compose --env-file /dev/null config --quiet
```

These are conflict-resolved **working-tree** results, not a concluded merge,
clean-clone/publication-revision evidence, or independent-review approval. A Git
worker must conclude the merge; subsequent verification/review/publication must
attach evidence to that resulting revision. No merge of the PR is authorized.
Deferred seed, Task 14 CI/Sonar/lint and the previously disclosed Drizzle Kit
security limitation remain unchanged; no new security/release gate is claimed.

### Previous Task 11 implementation verification — 2026-09-05

Environment: macOS arm64, Node 24.20.0, pnpm 11.25.0, Colima Docker Engine 29.2.1,
Compose 5.1.4 and Playwright Chromium. Colima was initially stopped; `colima start`
restored the daemon without changing repository credentials or separate worktrees.

- Frozen/ordinary/frozen installs preserve the lockfile and lifecycle policy;
  workspace build/type-check and the existing Drizzle configuration check pass.
- Runtime suite: 9 passing tests. API suites together: 25 passing tests, including
  16 existing migration/tooling cases against real PostgreSQL. Shared suite: 3
  passing tests. Compose/browser/image suite: 4 passing tests. Uncached workspace
  run: 6 successful tasks; existing web/content unit suites still contain no tests.
- A workspace test attempt without the documented Colima socket variables failed
  Docker discovery and interrupted its concurrent browser run. The configured
  uncached workspace rerun passed; the initial attempt is not counted as a pass.
- Source/local-command documentation formatting passes. The authoritative plan
  and technical specification already fail whole-file Prettier on the unchanged
  base revision; they retain surrounding style rather than receiving unrelated
  whole-document reformatting here. This is not a passing repository-wide format gate.
- Root lint remains a zero-task no-op. Focused strict ESLint using the existing
  configuration and cached tooling checks the changed API source and Compose
  Playwright test; API test/Vite config project-service lint is not wired by the
  existing tsconfigs. No compiler, lint rule or gate was weakened.
- `pnpm audit` still reports one moderate advisory, GHSA-67mh-4wv8-2f99 via
  Drizzle Kit's transitive esbuild (no high/critical advisories). It is not fixed,
  hidden or treated as a passing full security gate.

Evidence is for the Task 11 implementation working tree, not a published commit,
independent review, merged policy change or release. Review/publication must attach
results to the exact eventual commit and keep the deferred seed explicit.

## Task 12 declaration patch

`patches/drizzle-orm@0.45.2.patch` is deliberately limited to the ESM declarations
used by the NodeNext API. It changes no JavaScript, package versions, compiler
settings, or database behavior; it does not claim to repair other database drivers
or the CommonJS declaration entrypoints.

- Narrow `column-builder` imports to the existing column definitions. Isolate the
  unchanged Gel, SingleStore, and SQLite table class declarations from their
  table-factory declarations, retaining exports from the original table modules.
  Narrow the necessary type-only dependency edges as well. This stops PostgreSQL
  compilation from loading unrelated optional drivers and their broken declarations;
  no types are replaced with stubs, `any`, or `unknown`.
- Restore the runtime's PostgreSQL relational-query `getSQL()` method and role
  fields omitted by upstream declaration generation. Optional policy/role properties
  explicitly admit `undefined`, matching the constructor and field behavior under
  `exactOptionalPropertyTypes`.
- Express the shared decoder as `InstanceType<typeof TextDecoder>` so both Node's
  constructor declaration and DOM's instance type are supported.

The declaration regression compiles the normal static application client, requires
inferred string results, and expects errors for invalid columns and insert values.
Removing the patch reproduces all 73 upstream diagnostics in this test. The fixture
is compiler-only synthetic data, not a domain schema or migration.

`allowBuilds` continues to allow only esbuild and deny protobufjs, cpu-features,
and ssh2 scripts. The separate moderate esbuild advisory through Drizzle Kit
(`GHSA-67mh-4wv8-2f99`) is not remediated by this declaration patch.

## Migration operation and rollback

After `pnpm --filter @mobey/api build`, run `pnpm --filter @mobey/api migrate` with
explicit `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_CONNECTION_TIMEOUT_MS`,
`DATABASE_IDLE_TIMEOUT_MS`, `DATABASE_QUERY_TIMEOUT_MS`, and
`DATABASE_STATEMENT_TIMEOUT_MS`. Numeric settings must be positive safe integers;
timeouts must also be at most 2,147,483,647 milliseconds (the Node timer/PostgreSQL
signed 32-bit limit). Larger values are rejected rather than becoming 1 ms Node
timeouts. There are no deployed capacity defaults. TLS certificate/hostname verification is
required unless `NODE_ENV` is explicitly `development` or `test`. Commands do not
load the root `.env`.

The runner loads checked SQL from `apps/api/src/database/migrations`, serializes
runners with a transaction-scoped advisory lock, validates the overlapping applied
checksum/name/position prefix, and commits pending SQL plus ledger entries in one
transaction. A structurally valid newer ledger suffix remains accepted so a migration
can precede a compatible API rollout and the previous API can remain ready for safe
rollback. Failure rolls back that transaction and exits nonzero with generic output.
Readiness requires every migration known to the running API; it never applies
migrations itself.
`0001_platform.sql` adds only the platform migration ledger. There is no automatic
down migration or destructive rollback; applied SQL remains immutable, and later
schema changes must use reviewed forward migrations. This is not an OQ recovery or
retention decision.
