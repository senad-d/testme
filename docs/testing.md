# Check registry

| Command | Scope | Behaviors |
| --- | --- | --- |
| `node --test test/util.test.js` | `src/util.js`, `test/util.test.js` | Exported pageCount: zero, full page, exact multiples, partial pages, adjacent boundaries (199, 201, 399), and 8641 → 44. |
| `node --test test/` | All tests under `test/` | Full regression suite; required by issue #89. |

No external services or test dependencies are required for these utility checks.
