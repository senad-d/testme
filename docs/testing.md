# Test check registry

Run checks with Node 24.20.0 and pnpm 11.25.0. PostgreSQL checks require a reachable
Docker daemon; a tooling-only pass is **not** migration acceptance. API build and
type-check commands build the shared runtime dependency first, including direct package
runs without prior build output. API tests and contract commands use that build path so
package-entrypoint and CLI checks execute current compiled output.

| Check                                  | Command                                                                                                                                                                                                                                                                                                                                                                         | What it proves                                                                                                                                                                                                                                                                                                          | Scope                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Shared package type-check              | `pnpm --filter @mobey/shared type-check`                                                                                                                                                                                                                                                                                                                                        | Checks the shared package's public TypeScript seam under its strict compiler policy.                                                                                                                                                                                                                                    | Focused package check                                |
| Shared package unit tests              | `pnpm --filter @mobey/shared test`                                                                                                                                                                                                                                                                                                                                              | Runs `packages/shared/src/index.test.ts`, covering the exact application name plus the root version accessor's non-empty, current-value, and repeatable contract.                                                                                                                                                       | Focused package suite                                |
| API database type-check                | `pnpm --filter @mobey/api type-check`                                                                                                                                                                                                                                                                                                                                           | Checks the Drizzle/pg connection boundary, migration runner, and readiness wiring under the strict API compiler policy.                                                                                                                                                                                                 | Focused package check                                |
| Drizzle configuration check            | `NODE_ENV=test DATABASE_URL=postgresql://mobey:synthetic@127.0.0.1:5432/mobey pnpm --filter @mobey/api exec node --no-warnings --experimental-strip-types --input-type=module --eval "const { default: config } = await import('./drizzle.config.ts'); if (config.dialect !== 'postgresql') process.exit(1); if (config.out !== './src/database/migrations') process.exit(1);"` | Loads the PostgreSQL-only Drizzle configuration and verifies its checked-migration path without connecting to a database or generating artifacts.                                                                                                                                                                       | Focused configuration check                          |
| API declaration/runtime/CLI regression | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/platform-migration.integration.spec.ts -t 'platform tooling'`                                                                                                                                                                                                                                  | Compiles positive and negative typed-client fixtures with the API's strict settings; checks query construction, patched declarations against runtime, explicit bounds/TLS configuration, unreachable-DB readiness, and generic CLI failure output. No database substitute.                                              | Focused tooling selection; excludes PostgreSQL cases |
| PostgreSQL platform migration          | `pnpm --filter @mobey/api test -- platform-migration.integration.spec.ts`                                                                                                                                                                                                                                                                                                       | Runs the Task 12 migration/readiness suite against a real PostgreSQL Testcontainers instance, including apply-once/concurrent ledger assertions, compatible migration-before-rollout/readiness, transactional failure rollback, checksum/order rejection, missing dependency readiness, TLS, and bounded pool settings. | Focused PostgreSQL integration                       |
| Patched install determinism            | `before=$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml); pnpm install && pnpm install --frozen-lockfile && test "$before" = "$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml)"`                                                                                                                                                                                          | Ordinary and frozen installs apply the registered patch without changing the lockfile or lifecycle policy.                                                                                                                                                                                                              | Workspace install check                              |

## Task 13 REST contract (#22)

Trace: implementation plan Task 13; technical specification §11.1–11.3;
REQ-BAL-05 (U-10), with exact-integer transport supporting REQ-BAL-06.
This is platform scaffolding, not implementation of the domain routes in §11.2.
OQ-04 lockout durations and OQ-11 balance ceilings remain explicit decision gates.

| Check                                  | Command                                                                                                                                                                                                                                                                                                                                            | What it proves                                                                                                                                                                                                                                                                                                                                                                                                 | Scope                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Version route regression               | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/health-version.spec.ts`                                                                                                                                                                                                                                           | Runs `apps/api/test/health-version.spec.ts` against the real Fastify/Nest application, proving the exact shared application identity response, HTTP 200 status, and `Cache-Control: no-store`.                                                                                                                                                                                                                 | Focused API route suite; no database required                 |
| HTTP and generated contract regression | `pnpm --filter @mobey/shared build && pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/http-contract.spec.ts`                                                                                                                                                                                                       | Runs `apps/api/test/http-contract.spec.ts`: real Fastify/Nest validation, the exact shared application identity response, every stable error code against its schema, redaction, parser/size errors, request IDs, exact decimal strings, required generated type/package-root consumer constraints, compiled production identity/runtime wiring, deterministic generation, and missing/stale output rejection. | Focused API contract suite; no database required              |
| Regenerate reviewed contract           | `pnpm --filter @mobey/api contract:generate`                                                                                                                                                                                                                                                                                                       | Builds the API and replaces only the generator-owned `packages/shared/src/generated/api.ts` from current Nest OpenAPI metadata.                                                                                                                                                                                                                                                                                | Generation command; review the diff, not a correctness gate   |
| Generated contract drift               | `pnpm --filter @mobey/api contract`                                                                                                                                                                                                                                                                                                                | Builds the API, generates into an isolated temporary directory, and fails if the reviewed artifact is absent or byte-different; never overwrites reviewed output.                                                                                                                                                                                                                                              | Database-independent contract gate for Task 14 CI integration |
| Workspace contract entrypoint          | `pnpm contract --force`                                                                                                                                                                                                                                                                                                                            | Runs the API contract check through the existing Turbo task without using its cache.                                                                                                                                                                                                                                                                                                                           | Workspace contract gate                                       |
| Workspace build                        | `pnpm build`                                                                                                                                                                                                                                                                                                                                       | Builds all implemented workspace packages, including generated TypeScript.                                                                                                                                                                                                                                                                                                                                     | Workspace suite                                               |
| Workspace type-check                   | `pnpm type-check`                                                                                                                                                                                                                                                                                                                                  | Runs declared package checks with their upstream build dependencies.                                                                                                                                                                                                                                                                                                                                           | Workspace suite                                               |
| Workspace tests                        | `pnpm test --env-mode=loose`                                                                                                                                                                                                                                                                                                                       | Runs declared suites, including real PostgreSQL migration/readiness tests and the HTTP contract suite. Docker is required.                                                                                                                                                                                                                                                                                     | Workspace suite; not browser-journey or release evidence      |
| Workspace lint graph                   | `pnpm lint`                                                                                                                                                                                                                                                                                                                                        | Executes the declared lint graph; currently **no package lint tasks exist**, so success is not lint coverage.                                                                                                                                                                                                                                                                                                  | Known Task 14/#23 limitation                                  |
| Contract-change formatting             | `pnpm --filter @mobey/api exec prettier --check src/main.ts src/app.module.ts src/common/http/problem-details.filter.ts src/openapi.ts test/http-contract.spec.ts package.json ../../packages/shared/src/generated/api.ts ../../packages/shared/src/index.ts ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ../../docs/testing.md ../../AGENTS.md` | Checks every changed source, generated artifact, manifest, and document using the pinned formatter and repository configuration.                                                                                                                                                                                                                                                                               | Exact Task 13 manifest                                        |

In an isolated worktree, set `TURBO_CACHE_DIR="$PWD/.turbo/cache"` before workspace
commands to keep Turbo's cache inside that checkout rather than its shared worktree
cache.

Additional tooling checks for this manifest:

| Check                         | Command                                                                                                                                                                                                                                                                                                                                                                                       | What it proves                                                                                                                                                                                                                            | Scope                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Contract test TypeScript      | `pnpm --filter @mobey/api exec tsc --ignoreConfig --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --experimentalDecorators --emitDecoratorMetadata --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noImplicitOverride --noUnusedLocals --noUnusedParameters --noPropertyAccessFromIndexSignature --verbatimModuleSyntax test/http-contract.spec.ts` | Type-checks the focused spec and imported production code without skipping library checks. Explicit options are needed because test files are excluded from the application tsconfig; production still receives its normal project check. | Focused test compiler check                    |
| Dependency peer compatibility | `pnpm peers check`                                                                                                                                                                                                                                                                                                                                                                            | Verifies declared dependency peer ranges, including Nest 12 and TypeScript 6 compatibility.                                                                                                                                               | Workspace dependency check                     |
| Dependency advisory inventory | `pnpm audit`                                                                                                                                                                                                                                                                                                                                                                                  | Reports vulnerabilities in the locked graph. The new YAML-parser advisories are remediated; the pre-existing moderate Drizzle Kit/esbuild advisory still makes this command exit nonzero.                                                 | Inventory, not a passing security/release gate |

For local Colima PostgreSQL verification, export
`DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` and
`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` before the database
or workspace suites. The workspace command uses Turbo's loose environment mode
because the current task configuration does not forward these variables in strict
mode; otherwise Ryuk receives a host-only socket path and container startup fails.
This changes environment forwarding, not test selection or assertions. No `.env`
file is loaded. CI environment allowlisting remains Task 14/#23 work.

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
  name and version and disables caching; it adds no authentication or other build metadata. No
  documentation/UI or test-fixture route is served.
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
- Task 14/#23 owns CI workflow wiring, blocking lint, and Sonar correction. The
  local contract check does not establish branch protection or a passing release
  gate. Use the direct API command or `pnpm contract --force` for explicit uncached
  evidence. The shared workspace dependency puts generated-file changes in the API
  contract task's upstream build hash; this repairs the earlier artifact-only cache
  gap. CI must still define all relevant inputs/environment explicitly, including
  the web compiler configuration consumed by the package-entrypoint test. Root lint
  remains a no-op; the separately disclosed Drizzle Kit advisory remains unrelated
  to this work.

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
