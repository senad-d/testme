# Test check registry

Run checks with Node 24.20.0 and pnpm 11.25.0. PostgreSQL checks require a reachable
Docker daemon; a tooling-only pass is **not** migration acceptance. API tests build
first so CLI checks execute current compiled output.

| Check                                  | Command                                                                                                                                                                                                                                                                                                                                                                         | What it proves                                                                                                                                                                                                                                                                                                          | Scope                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Shared package type-check              | `pnpm --filter @mobey/shared type-check`                                                                                                                                                                                                                                                                                                                                        | Checks the shared package's public TypeScript seam under its strict compiler policy.                                                                                                                                                                                                                                    | Focused package check                                |
| Shared package unit tests              | `pnpm --filter @mobey/shared test`                                                                                                                                                                                                                                                                                                                                              | Runs `packages/shared/src/index.test.ts`, covering the root accessor's non-empty, current-value, and repeatable application-version contract.                                                                                                                                                                           | Focused package suite                                |
| API database type-check                | `pnpm --filter @mobey/api type-check`                                                                                                                                                                                                                                                                                                                                           | Checks the Drizzle/pg connection boundary, migration runner, and readiness wiring under the strict API compiler policy.                                                                                                                                                                                                 | Focused package check                                |
| API health version                     | `pnpm --filter @mobey/api test health-version.spec.ts`                                                                                                                                                                                                                                                                                                                          | Runs `apps/api/test/health-version.spec.ts`, covering the API package semantic version, repeated controller reads, the uncached `GET /api/v1/health/version` response, and existing health-route behavior without requiring PostgreSQL.                                                                                 | Focused API unit/HTTP suite                          |
| Drizzle configuration check            | `NODE_ENV=test DATABASE_URL=postgresql://mobey:synthetic@127.0.0.1:5432/mobey pnpm --filter @mobey/api exec node --no-warnings --experimental-strip-types --input-type=module --eval "const { default: config } = await import('./drizzle.config.ts'); if (config.dialect !== 'postgresql') process.exit(1); if (config.out !== './src/database/migrations') process.exit(1);"` | Loads the PostgreSQL-only Drizzle configuration and verifies its checked-migration path without connecting to a database or generating artifacts.                                                                                                                                                                       | Focused configuration check                          |
| API declaration/runtime/CLI regression | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/platform-migration.integration.spec.ts -t 'platform tooling'`                                                                                                                                                                                                                                  | Compiles positive and negative typed-client fixtures with the API's strict settings; checks query construction, patched declarations against runtime, explicit bounds/TLS configuration, unreachable-DB readiness, and generic CLI failure output. No database substitute.                                              | Focused tooling selection; excludes PostgreSQL cases |
| PostgreSQL platform migration          | `pnpm --filter @mobey/api test -- platform-migration.integration.spec.ts`                                                                                                                                                                                                                                                                                                       | Runs the Task 12 migration/readiness suite against a real PostgreSQL Testcontainers instance, including apply-once/concurrent ledger assertions, compatible migration-before-rollout/readiness, transactional failure rollback, checksum/order rejection, missing dependency readiness, TLS, and bounded pool settings. | Focused PostgreSQL integration                       |
| Patched install determinism            | `before=$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml); pnpm install && pnpm install --frozen-lockfile && test "$before" = "$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml)"`                                                                                                                                                                                          | Ordinary and frozen installs apply the registered patch without changing the lockfile or lifecycle policy.                                                                                                                                                                                                              | Workspace install check                              |

## Web build version footer

| Check                | Command                                                              | What it proves                                                                                                                                                                                                   | Scope                                                                 |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Web footer rendering | `pnpm --filter @mobey/shared build && pnpm --filter @mobey/web test` | `apps/web/src/main.test.tsx`: semantic footer with `data-testid="build-version"`, configured web build override, shared-version fallback for missing/empty configuration, and retained heading/readiness markup. | Focused React rendering; browser mounting/effects verified separately |

## Task 11 local Compose checks

| Check                                      | Command                                                                                                 | What it proves                                                                                                                                                                                                                                                                                                                             | Scope                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Local API runtime boundary                 | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/local-runtime.spec.ts` | `apps/api/test/local-runtime.spec.ts`: each synthetic local setting and insecure cookie mode is rejected outside development, malformed URL encoding produces a generic error, generic CLI failure, explicit container host and safe loopback default. Not authentication implementation.                                                                                                   | Focused runtime suite                                                        |
| Compose and production-image browser smoke | `pnpm test:compose`                                                                                     | `tests/e2e/local-compose.spec.ts`: clean source-copy startup through the documented Watch command, API image shared-package prerequisite build, real PostgreSQL apply-once ledger, browser readiness, HMR/API restart with unchanged images, new credential/output files excluded during active Watch, persisted ledger across recreation, failed migration blocks API, synthetic context canaries excluded, non-root runnable production images. | Focused Docker/Chromium integration; not full product E2E or seed acceptance |
| Compose model validation                   | `docker compose --env-file /dev/null config --quiet`                                                    | Resolves the four-service model without implicit root `.env` loading.                                                                                                                                                                                                                                                                      | Configuration smoke                                                          |
| Workspace build and types                  | `pnpm build && pnpm type-check`                                                                         | Builds the current packages and validates their existing strict TypeScript projects, including the Compose Playwright suite.                                                                                                                                                                                                               | Workspace checks                                                             |
| Workspace lint entrypoint                  | `pnpm lint`                                                                                             | Invokes the existing root graph; currently runs **zero lint tasks**, not source lint evidence. Task 14/#23 owns the missing wiring.                                                                                                                                                                                                        | Known-limited workspace command                                              |
| Uncached local workspace tests             | `pnpm test --env-mode=loose --force`                                                                    | Runs existing package tests plus the runtime and Compose suites, without Turbo cache reuse; local Docker/browser environment variables are explicitly passed through. Does not load `.env`.                                                                                                                                                | Workspace tests; requires Docker and Chromium                                |

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

### Task 11 implementation refresh — 2026-10-05

The existing Compose implementation was reused within issue #20's 15-path manifest.
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
