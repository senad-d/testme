# Mobey

Private Family-loop MVP platform baseline: React/Vite, NestJS/Fastify, PostgreSQL,
Drizzle migrations and pnpm workspaces. The current UI is a health slice, not a
working family/learning game or a pilot-ready release.

## Local Docker development — Task 11 / issue #20

Requirements: Docker Engine and **Docker Compose 2.32+** (including Watch and
`initial_sync`), with ports 3000 and 5173 free. Docker Desktop or a running Colima
works on macOS; on Colima, start it with `colima start` and select its Docker
context. No host Node installation, dependency install, `.env`, or credentials are
needed for this command from a clean source checkout:

```sh
docker compose --env-file /dev/null up --build --watch
```

Open **http://localhost:5173**. The page should show `API readiness: ready`.
The one-shot `migrate` service waits for healthy PostgreSQL and applies the existing
checked migration runner; `api` waits for migration exit code 0 and `web` waits for
API readiness. `migrate` exiting successfully is expected, not an unhealthy service.
The API also exposes http://localhost:3000/api/v1/health/live and `/health/ready`.
All published ports bind to loopback; PostgreSQL has no host port.

Compose Watch synchronizes web source for Vite HMR. API source changes synchronize
and restart the API, recompiling TypeScript **without rebuilding the image**.
Vite config and `index.html` changes are also watched. Keep the command running
for reloads. Workspace dependencies live inside the image and are never hidden by
host mounts. Dependency manifests, shared-package changes, Dockerfiles, and SQL
migration changes require stopping and rerunning the command with `--build`;
readiness rejects unapplied migrations rather than applying them inside the API.
Only the documented source paths are synchronized, not the entire checkout.

The root `pnpm dev` alias runs the same command (requires Node **24.20.0** and pnpm
**11.25.0**). The database volume persists across normal shutdown/recreation:

```sh
docker compose --env-file /dev/null down
# DESTRUCTIVE: delete only this project's synthetic local database when intentionally resetting:
docker compose --env-file /dev/null down --volumes
```

Use `--env-file /dev/null` on **every** Compose invocation (POSIX/macOS/Linux;
Windows users can use WSL). Plain `docker compose` implicitly reads root `.env`.
No `env_file`, host variable interpolation, whole-checkout mount, or real
participant configuration is used. `.dockerignore` allowlists build inputs and
excludes `.env`, `.pi`, credential directories/files, private keys and generated
artifacts even within source.
Compose's inline `mobey-development-only-*` values are intentionally public,
synthetic local configuration, **not production secrets**. Never replace them with
participant data or deploy this stack. The API rejects these values and
`COOKIE_MODE=localhost-development` unless `NODE_ENV=development`, including when
an individual local value is transplanted into a deployed environment.

The startup guard does **not** implement sessions, cookies, allowlist registration,
CSRF or PIN authentication. Those remain with their domain owners and approved
OQ-04 decisions; there are no invented lifetimes, lockouts or production defaults.
Database pool/timeouts are explicit local settings, not approved deployed sizing.
Local PostgreSQL matches Task 12's pinned PostgreSQL 17 integration image; no AWS
region, database sizing, retention or other OQ decision is implied.

### Seed status — deferred, not complete

There is **no seed command yet**. The only schema is the platform migration ledger
and content is an empty package seam. A migration is not a family/content seed.
The requirement for an explicit, deterministic synthetic family/content seed and
proof it never runs automatically in production remains open with **Task 16/#25
(identity schema/family fixtures)** and **Task 24/#33 (approved content inventory)**.
They must coordinate the command after their decision gates are satisfied. This
user-authorized evidence reassignment is recorded in issue #20, those owner issues,
[plan Tasks 11/16/24](docs/plans/mobey-mvp-implementation-plan.md#11-add-hot-reloading-local-docker-compose)
and [technical specification section 16](docs/technical/mobey-technical-spec.md#16-local-docker-and-docker-compose-topology).
Task 11 neither creates domain data nor claims this deferred evidence passed.

## Production image checks (not deployment)

```sh
docker build --target production -f apps/api/Dockerfile -t mobey-api:production .
docker build --target production -f apps/web/Dockerfile -t mobey-web:production .
docker image inspect --format '{{.Config.User}}' mobey-api:production mobey-web:production
```

Both builds use frozen dependency installs and pinned base-image digests. Runtime
users are `node` (API) and `101` (static web); local services, including PostgreSQL,
also run non-root. The API image contains production dependencies, compiled output
and checked SQL. Its default liveness can run without DB configuration; readiness
remains unavailable until real validated DB configuration and migrations exist.
For later controlled migration jobs its existing entrypoint is
`node dist/database/migrate.js`. No production image automatically seeds or migrates.

The production images include liveness probes (API `/health/live`, static web `/`).
These are not deployed readiness, scaling or rollout-policy decisions.
The web production image serves static assets on port 8080 solely for image smoke
evidence. It does not proxy `/api`; actual same-origin CloudFront routing,
production configuration and AWS deployment belong to later tasks. No deployment,
security certification or release readiness is claimed.

## Tests

With the pinned host Node/pnpm versions and Docker running:

```sh
pnpm install --frozen-lockfile
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" pnpm --filter @mobey/e2e exec playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.playwright-browsers" pnpm test:compose
pnpm --filter @mobey/api build && pnpm --filter @mobey/api exec vitest run test/local-runtime.spec.ts
```

`test:compose` uses Playwright Chromium against a disposable clean-source copy
under ignored `node_modules`, installs dependencies only inside its images, uses
random loopback ports and a unique Compose project, and deletes only its own
containers, images, volume and copy. It never copies the host `.env` or `.pi`:
canaries are generated synthetic test data. The suite proves browser readiness,
web/API reload with unchanged image IDs, persistent migration ledger, failed
migration ordering, build-context exclusion and runnable non-root production stages.

See [the check registry](docs/testing.md) for exact focused/full commands, Docker
Testcontainers setup and known limitations. Passing this local stack does not
establish cloud deployment, live GitHub/Sonar enforcement or the deferred seed.

## PR quality automation — Task 14 / issue #23

With Node 24.20.0 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint --force
pnpm build --force
pnpm type-check --force
pnpm exec turbo run type-check:tests --force
pnpm test:ci-policy
pnpm contract --force
pnpm audit
```

With an explicitly selected local Docker daemon and Chromium installed using the
browser path above, run `pnpm test:coverage` and `pnpm --filter @mobey/e2e test`.
`pnpm test:platform` selects the new production-built browser smoke: unique images,
project/volume, random loopback port and a disposable source copy. Its test-only
Nginx proxy joins the unchanged production-built SPA to the migrated API; the API
uses `NODE_ENV=test` solely for synthetic local PostgreSQL, not deployed TLS proof.
The existing Compose suite still proves Watch behavior and development guards.

The workflow runs on PRs and main pushes with read-only permissions and pinned
actions/tools. It rejects secrets/generated paths in the clean checkout before
installing dependencies. Every quality/security check remains blocking, including
all-severity dependency/image scans; unfixed findings are not ignored. SonarCloud
waits for its quality gate using the analysis-scoped `SONAR_TOKEN` secret reference.
A missing token (including on fork PRs) fails closed. Never use `pull_request_target`
or a privileged checkout to work around missing secrets.

A repository administrator must establish live workflow/Sonar evidence and require
`CI required` through repository settings; this source change does not configure
protection, reviews or bypass actors. Terraform is absent and no cloud plan runs.
The workflow fails if Terraform is introduced until its approved owner adds
isolated format/validate/security/plan checks. There is no deployment job.

## Safe feature publication (#62)

An authorized Git agent must run the preflight, use an explicit feature ref, then
verify the live remote commit before opening a PR (substitute the current branch):

```sh
pnpm publication:preflight origin HEAD:refs/heads/feat/62
git -c push.followTags=false push -- origin HEAD:refs/heads/feat/62
pnpm publication:verify origin HEAD:refs/heads/feat/62
```

The guard rejects `origin/main` or any differently named upstream, ambiguous
refspecs, mismatched/fan-out fetch/push destinations and mirror remotes. It never
pushes, repairs configuration or prints remote URLs. `pnpm test:publication`
uses synthetic transcripts without Git/network access; the existing CI-policy gate
also runs it. See [delivery safety](docs/delivery-safety.md) for failure recovery,
exact evidence scope and the administrator-owned protected-main acceptance gate.
Local guards do not establish live branch protection.
