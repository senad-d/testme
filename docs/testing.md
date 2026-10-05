# Check registry

| Command | Scope |
| --- | --- |
| `node --test test/util.test.js` | `src/util.js`: page counts for zero, full pages, exact multiples, partial pages (8641 → 44), and immediately adjacent page boundaries (199, 201, 399). |
| `node --check src/app.js` | Existing CI syntax check for the stock-listing module; not behavioral coverage. |

Use Node 22 LTS for target-runtime validation. The current CI workflow (`.github/workflows/ci.yml`) runs only the syntax check, not the unit tests; run the unit-test command explicitly.
