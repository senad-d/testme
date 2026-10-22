# Plan for objective 661

Ship issue #220. Lookup: objective 660.

Each task ran as its own chain on its agent; tasks without a dependency ran in parallel.

## Task median-helper: Implement and verify the shared median export

Agent: backend. Depends on: none.

- `packages/shared/src/median.ts`
- `packages/shared/src/median.test.ts`
- `packages/shared/src/index.ts`

Deliver issue #220's shared numeric helper, without adopting it anywhere else. The issue has no References section or Bug reproduction steps. Read packages/shared/src/truncate-text.ts and truncate-text.test.ts for pure-function/JSDoc/error/public-export test conventions, packages/shared/src/index.ts, packages/shared/package.json, the shared TypeScript/Vitest configuration, and the shared-check and Task 14 quality sections of docs/testing.md. Follow AGENTS.md and the pinned toolchain.

Create packages/shared/src/median.ts with the exact named signature median(values: number[]): number. Reject an empty array with RangeError and a fixed input-independent message. Sort a copy numerically, not lexicographically, preserving the caller's array. Return the central value for odd lengths and the arithmetic mean of the two central values for even lengths. Narrow indexed operands safely under strict/noUncheckedIndexedAccess; do not weaken TypeScript or lint rules. Add the named export through './median.js' in packages/shared/src/index.ts. The existing compiled-root package export and Vitest discovery suffice: do not change manifests, dependencies, configuration, generated contracts or existing consumers. This is an ordinary JavaScript-number utility, not a money-arithmetic change. Do not add validation rules for NaN/infinity or claim overflow/precision guarantees not specified by the issue.

Create packages/shared/src/median.test.ts using Vitest describe/expect/it and importing median through './index.js' to exercise the public seam. Prove the exact acceptance examples: median([3, 1, 2]) is 2; median([4, 1, 2, 3]) is 2.5; median([]) throws RangeError. Also cover singleton input, duplicates, negative/fractional values, numeric-versus-lexicographic ordering with multiple-digit numbers, and unchanged input after invocation. Keep fixtures synthetic and tests deterministic.

Done when the new suite is visibly included and passing in pnpm --filter @mobey/shared test, shared source checking passes with pnpm --filter @mobey/shared type-check, and pnpm --filter @mobey/shared build exposes the function in compiled root output/declarations without committing dist. Use the documented pnpm lint --force, pnpm exec turbo run type-check:tests --force and pnpm format:check for strict lint/test typing/format evidence. Use the repository-pinned Node/pnpm and pnpm install --frozen-lockfile if dependencies are missing. Record actual results; do not claim full CI or release verification. README and registry updates belong to the dependent documentation task.

## Task median-documentation: Document median usage and register its test coverage

Agent: document. Depends on: median-helper.

- `packages/shared/README.md`
- `docs/testing.md`

Complete issue #220's documentation acceptance after the backend median task. The issue has no References section. Read the implemented packages/shared/src/median.ts, median.test.ts and index.ts, packages/shared/package.json for the public package name/export, and only the shared-package check registry and toolchain/quality guidance in docs/testing.md. This task owns documentation only; do not change implementation or adopt median in an application.

Create the currently absent packages/shared/README.md with a short median usage section. Show exactly one concise TypeScript example importing { median } from '@mobey/shared' and calling median([3, 1, 2]) with result 2. Describe the number[] input and number result, odd/even behavior, empty-array RangeError and preservation of the supplied array, matching the implementation. Do not claim special handling of nonfinite numbers or extreme-value precision, or characterize this helper as approved durable-money arithmetic. Keep usage detail owned by this README.

Update only the shared package unit-tests registry entry in docs/testing.md to include packages/shared/src/median.test.ts and a brief description of its verified coverage. Link to the shared README for usage rather than duplicating it. This is the plan's documentation-only companion to the issue's four requested files, necessary because that row currently enumerates the existing suites; do not rewrite historical evidence, unrelated registry sections or product/architecture documents. No new commands are needed.

Done when the README contains the requested public-import example, documentation agrees with the implementation/tests, the registry lists the new suite and the relative README link resolves. Run the documented pnpm format:check and pnpm --filter @mobey/shared test using the repository-pinned toolchain; confirm that the latter includes median.test.ts and passes. Report only evidence actually obtained.
