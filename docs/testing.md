# Test check registry

| Check                     | Command                                  | What it proves                                                                                                                                | Scope                 |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Shared package type-check | `pnpm --filter @mobey/shared type-check` | Checks the shared package's public TypeScript seam under its strict compiler policy.                                                          | Focused package check |
| Shared package unit tests | `pnpm --filter @mobey/shared test`       | Runs `packages/shared/src/index.test.ts`, covering the root accessor's non-empty, current-value, and repeatable application-version contract. | Focused package suite |
