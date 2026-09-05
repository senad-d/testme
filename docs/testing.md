# Test check registry

Run checks with Node 24.20.0 and pnpm 11.25.0. PostgreSQL checks require a reachable
Docker daemon; a tooling-only pass is **not** migration acceptance. API tests build
first so CLI checks execute current compiled output.

| Check                                  | Command                                                                                                                                                                                                                                                                                                                                                                         | What it proves                                                                                                                                                                                                                                                                                                          | Scope                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Shared package type-check              | `pnpm --filter @mobey/shared type-check`                                                                                                                                                                                                                                                                                                                                        | Checks the shared package's public TypeScript seam under its strict compiler policy.                                                                                                                                                                                                                                    | Focused package check                                |
| Shared package unit tests              | `pnpm --filter @mobey/shared test`                                                                                                                                                                                                                                                                                                                                              | Runs `packages/shared/src/index.test.ts`, covering the root accessor's non-empty, current-value, and repeatable application-version contract.                                                                                                                                                                           | Focused package suite                                |
| API database type-check                | `pnpm --filter @mobey/api type-check`                                                                                                                                                                                                                                                                                                                                           | Checks the Drizzle/pg connection boundary, migration runner, and readiness wiring under the strict API compiler policy.                                                                                                                                                                                                 | Focused package check                                |
| Drizzle configuration check            | `NODE_ENV=test DATABASE_URL=postgresql://mobey:synthetic@127.0.0.1:5432/mobey pnpm --filter @mobey/api exec node --no-warnings --experimental-strip-types --input-type=module --eval "const { default: config } = await import('./drizzle.config.ts'); if (config.dialect !== 'postgresql') process.exit(1); if (config.out !== './src/database/migrations') process.exit(1);"` | Loads the PostgreSQL-only Drizzle configuration and verifies its checked-migration path without connecting to a database or generating artifacts.                                                                                                                                                                       | Focused configuration check                          |
| API declaration/runtime/CLI regression | `pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/platform-migration.integration.spec.ts -t 'platform tooling'`                                                                                                                                                                                                                                  | Compiles positive and negative typed-client fixtures with the API's strict settings; checks query construction, patched declarations against runtime, explicit bounds/TLS configuration, unreachable-DB readiness, and generic CLI failure output. No database substitute.                                              | Focused tooling selection; excludes PostgreSQL cases |
| PostgreSQL platform migration          | `pnpm --filter @mobey/api test -- platform-migration.integration.spec.ts`                                                                                                                                                                                                                                                                                                       | Runs the Task 12 migration/readiness suite against a real PostgreSQL Testcontainers instance, including apply-once/concurrent ledger assertions, compatible migration-before-rollout/readiness, transactional failure rollback, checksum/order rejection, missing dependency readiness, TLS, and bounded pool settings. | Focused PostgreSQL integration                       |
| Patched install determinism            | `before=$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml); pnpm install && pnpm install --frozen-lockfile && test "$before" = "$(shasum -a 256 pnpm-lock.yaml pnpm-workspace.yaml)"`                                                                                                                                                                                          | Ordinary and frozen installs apply the registered patch without changing the lockfile or lifecycle policy.                                                                                                                                                                                                              | Workspace install check                              |

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
