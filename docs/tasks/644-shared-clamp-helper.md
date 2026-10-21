# Issue #217: shared clamp helper

Content version: 1.

Source: [issue #217](https://github.com/senad-d/testme/issues/217), its complete body supplied by the issue step, and objective 644's investigation checked against this working tree. This is a feature issue, not a Bug or ci-fix issue. It has no References section and cites no product/specification documents; none are invented here.

This plan covers only the standalone helper, its public export and unit tests, and its documentation. Using `clamp` anywhere else is explicitly out of scope. Backend owns code; document owns the README and test inventory. No frontend, devops or diagram work is warranted. The planner creates this artifact; implementers need not edit it. All commands below are planned checks, not claimed results.

## Verified current state

- `packages/shared/src/index.ts` explicitly exports safe primitives using `.js` specifiers. Existing `index.test.ts` and `money.test.ts` import through `./index.js` and use Vitest. Neither a clamp helper nor its test exists.
- `packages/shared/package.json` already maps the package root to `dist/index.js` and `dist/index.d.ts`. Its build, lint, source/test type-check, test and coverage scripts suffice; no manifest, lockfile, dependency or configuration change is needed.
- `packages/shared/tsconfig.json` builds source and declarations under NodeNext and excludes tests from production output. `tsconfig.eslint.json` includes tests; `vitest.config.ts` discovers source coverage without enumerating helper files. `tsconfig.base.json` and `eslint.config.mjs` require strict typed checks.
- `packages/shared/README.md` does not exist. The shared unit-suite row in `docs/testing.md` lists application-identity and Game Money tests but not clamp coverage.
- `.node-version`, root `package.json` and `docs/testing.md` specify Node 24.20.0 / pnpm 11.25.0. Focused shared checks do not require Docker or PostgreSQL. They do not replace the repository's existing delivery gates.

## Decisions and scope reconciliation

- Use a small synchronous, explicitly number-typed function with a reversed-bounds guard and ordinary numeric clamping. Reject a new dependency, subpath export, coercion layer or domain-money integration: none is needed for the issue's contract.
- Keep implementation/export/tests together as one backend slice, and user-facing usage/test-inventory documentation together as one document slice. Do not split the helper from its tests or create work for unrelated agents.
- The issue still names `docs/tasks/641-shared-clamp-helper.md`. Objective 641 is abandoned. This assignment explicitly authorizes `docs/tasks/644-shared-clamp-helper.md`; the next issue-alignment step must reconcile that single obsolete manifest entry. Do not recreate the 641 artifact. This plan does not mutate the tracker.
- Total delivery manifest: the five implementation/documentation paths below plus this planner-owned artifact. No deletions, consumers, API routes, generated contracts, money implementation, migrations, infrastructure or broader documentation changes are planned.

## Open questions

None prevents implementing the specified behavior. Equal bounds, NaN, infinities and invalid runtime types are unspecified by #217: do not add validation requirements, documentation guarantees or acceptance cases for them in this change. The generic helper neither changes Game Money rules nor resolves any product OQ. There are no physical-device, real-user or human-walkthrough acceptance criteria.

## Tasks

### 1. Implement and verify the root-exported clamp helper

- [ ] Add the standalone helper, public export and unit tests for issue #217. Task ID: `shared-clamp`; agent: `backend`.

#### Why

The shared package has no clamp primitive. The issue requires in-range values to remain unchanged, lower/upper outliers to clamp to their respective bounds, and reversed bounds to throw `RangeError`, without adopting the helper in any consumer.

#### References

`https://github.com/senad-d/testme/issues/217` — Summary, Where, Acceptance criteria and Out of scope; no References section exists.

`AGENTS.md` — safe shared primitives, strict verification and scope discipline.

`docs/testing.md` — shared package check registry and pinned-toolchain/evidence boundaries.

#### How

Depends on: none.

Read the referenced issue and repository guidance, the shared-check registry in `docs/testing.md`, and the local examples `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`, `packages/shared/src/money.test.ts`, plus `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/tsconfig.eslint.json` and `packages/shared/vitest.config.ts`. Issue #217 supplies no additional reference documents.

Create `packages/shared/src/clamp.ts` with a named `clamp(value: number, min: number, max: number): number` export. Check `min > max` before computing the result and throw a native `RangeError` with a static diagnostic that does not interpolate inputs. Otherwise clamp with ordinary numeric operations, such as `Math.min(Math.max(value, min), max)`. No coercion, dependency, BigInt overload or additional input-validation policy is required.

Modify `packages/shared/src/index.ts` to explicitly re-export `clamp` from `./clamp.js`, retaining existing exports unchanged. Create `packages/shared/src/clamp.test.ts` using Vitest `describe`/`it`/`expect` and importing `clamp` from `./index.js` so the tests also exercise the public export seam. Assert the three exact issue examples and a reversed-bounds call such as `clamp(5, 10, 0)` throwing `RangeError`; do not pin the message text. This is not a Bug issue, so no issue reproduction procedure exists to translate.

Use the repository-pinned Node/pnpm toolchain. Run the following from the repository root and record actual results:

```bash
pnpm --filter @mobey/shared test
pnpm --filter @mobey/shared test:coverage
pnpm --filter @mobey/shared build
pnpm --filter @mobey/shared type-check
pnpm --filter @mobey/shared type-check:tests
pnpm --filter @mobey/shared lint
pnpm exec prettier --check packages/shared/src/clamp.ts packages/shared/src/clamp.test.ts packages/shared/src/index.ts
```

Only the three listed files change. Using `clamp` elsewhere is excluded: no application integration, money changes, API/generated-contract edits, migrations, manifest/lockfile/configuration changes, or documentation edits belong to this backend task. Equal bounds, NaN, infinities and invalid runtime types remain outside the added contract. The focused checks need no database and do not establish full workspace or CI acceptance.

#### Where

`packages/shared/src/clamp.ts`

`packages/shared/src/clamp.test.ts`

`packages/shared/src/index.ts`

#### Acceptance criteria

- Root-export tests prove `clamp(5, 0, 10) === 5`, `clamp(-1, 0, 10) === 0`, and `clamp(11, 0, 10) === 10`.
- The reversed-bounds test proves a native `RangeError` when `min > max`; the guard precedes clamping.
- Existing shared tests still pass. Coverage includes the new helper and both valid/reversed-bound paths; build, source/test type-checks, zero-warning lint and changed-file formatting pass under the pinned toolchain.
- The explicit `.js` root export is present and build produces its runtime/declaration output without committing generated build files. Existing exports remain intact.
- No consumer adopts `clamp`, no unsupported edge-case contract is introduced, and only the three listed source/test files change.

### 2. Document clamp usage and its registered test coverage

- [ ] Add the package usage documentation and update the shared test inventory for issue #217. Task ID: `document-clamp`; agent: `document`.

#### Why

The issue requires one README usage example, and its Where section names `docs/testing.md` as the shared unit-suite inventory companion. A short, accurate package-root example and inventory entry make the new utility discoverable without implying application adoption or broader verification.

#### References

`https://github.com/senad-d/testme/issues/217` — README acceptance, documentation manifest and prohibition on consumer adoption; no References section exists.

`AGENTS.md` — documentation, verification and evidence discipline.

`docs/testing.md` — existing shared unit-suite inventory and command scope to preserve.

#### How

Depends on: Task 1.

Read the referenced issue, repository guidance and shared-check registry, plus `packages/shared/package.json`, `packages/shared/src/clamp.ts`, `packages/shared/src/clamp.test.ts` and `packages/shared/src/index.ts`. Issue #217 supplies no additional reference documents. Validate the documentation against the implemented export and tests, not an assumed interface.

Create `packages/shared/README.md` with a short clamp usage section. Describe the numeric arguments, unchanged in-range result, lower/upper limiting behavior and native `RangeError` for `min > max`. Include exactly one concise TypeScript usage example importing from `@mobey/shared`, for example:

```typescript
import { clamp } from '@mobey/shared';

clamp(11, 0, 10); // 10
```

Modify only the shared unit-suite inventory entry in `docs/testing.md` to include `packages/shared/src/clamp.test.ts` and its public-export, in-range/lower/upper and reversed-bounds coverage, while retaining the existing application-identity/Game Money inventory and registered command. Do not rewrite historical evidence or claim new passes before running checks. Keep the README focused on this generic utility; do not add guarantees for equal bounds, NaN, infinities or invalid runtime types, or suggest it for durable Game Money arithmetic.

Use the repository-pinned Node 24.20.0 / pnpm 11.25.0 toolchain. Run the following from the repository root; the package-context smoke check exercises the documented import through the compiled package root:

```bash
pnpm --filter @mobey/shared build
pnpm --filter @mobey/shared exec node --input-type=module --eval "import assert from 'node:assert/strict'; import { clamp } from '@mobey/shared'; assert.equal(clamp(11, 0, 10), 10);"
pnpm --filter @mobey/shared test
pnpm exec prettier --check packages/shared/README.md docs/testing.md docs/tasks/644-shared-clamp-helper.md
```

Only the two documentation files below change. The plan is a planner-owned formatting input, not an additional document-task edit. Do not implement or modify source/tests, add commands/dependencies, change product/architecture documents, or use `clamp` in an application. The required README example is not consumer adoption. These local checks do not establish full CI acceptance; record actual results and any unverified evidence honestly.

#### Where

`packages/shared/README.md`

`docs/testing.md`

#### Acceptance criteria

- The new package README documents `clamp` with one package-root import example whose expected result is verified against the compiled export.
- README behavior agrees with all three required examples and the reversed-bounds `RangeError` contract; it makes no additional input-policy or domain-money promises.
- The shared unit-suite inventory names the clamp test and accurately summarizes its coverage without removing existing coverage, changing the registered suite command or rewriting historical results.
- Package build, documented-import smoke assertion, full shared unit suite and formatting of both documentation files plus this plan pass under the pinned toolchain.
- Only the two listed documentation files change; application usage and unrelated documentation remain untouched.
