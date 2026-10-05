# Check registry

Run with Node 22 LTS. Tests use `node:test` and `node:assert/strict`; no dependencies or database are needed for these checks.

| Command | Scope | Behavior |
| --- | --- | --- |
| `node --test test/util.test.js` | `src/util.js`, `test/util.test.js` | Page counts for zero, first-item and below-page boundaries, a full page, exact multiples, and partial pages (including 8641 → 44). |
| `node --test` | `test/` | Discover and run the full unit suite. |
| `node --test test/` | Issue #91 acceptance command | Passes on Node 26; Node 22 rejects the directory with `MODULE_NOT_FOUND`. Use default discovery on Node 22 pending resolution of the acceptance-command mismatch. |

Only nonnegative integer item totals are covered: issue #91 defines no invalid-input policy. API and UI changes are explicitly out of scope.

Sensitivity was verified inline against the base utility (missing export) and a rounding-down mutant (both new first-page boundary tests fail), without changing production files or creating scratch files.
