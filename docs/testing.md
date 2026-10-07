# Check registry

| Command | Scope |
| --- | --- |
| `node --test --test-reporter=dot test/util.test.js` | `src/util.js`: unchanged 200-item page size; page counts for zero, first-page boundaries, exact multiples, and partial pages. |
| `node --test --test-reporter=dot` | All tests under `test/`. |
| `node --check src/app.js` | Existing CI syntax check for the stock-listing entry point; does not execute tests. |

Target runtime: Node 22 LTS. Local verification on Node 26 does not establish Node 22 compatibility.
