### 1. Derive persisted V1 catalog validation from Croatian content

- [x] Replace the persisted-state validator’s duplicated catalog constants with contracts derived from the authoritative Croatian catalogs, and prove the complete current catalog family remains strictly validated.

#### Why
`src/game/store.ts` currently repeats the chore, pet, item, and theme IDs and the Croatian activity name/value pairs defined by `src/content/hr.ts`. It also hard-codes the maximum owned-pet count and debt ceiling represented by those catalogs and `CONFIG`. A later catalog addition could therefore work in the game domain but be rejected after save and reload. The validator must have one runtime source of truth before any catalog expansion, without broadening the V1 schema or weakening its cross-field checks.

#### How
Depends on: none. In `src/game/store.ts`, runtime-import `CHORES`, `PETS`, `ITEMS`, `THEMES`, and `CONFIG` from `src/content/hr.ts`; the reverse `ActivityEntry`, `LoadCode`, and `ResultCode` imports in `src/content/hr.ts` are type-only and must remain erased at runtime. Derive the accepted chore, pet, item, and theme ID sets from the corresponding catalogs; derive the chore-reward, pet-price, and item-price activity name/value lookups from those same entries; use `PETS.length` as the maximum distinct owned-pet count and `CONFIG.debtLimit` as the debt ceiling. Keep `PET_SLOTS` and `ITEM_SLOTS` local and unchanged because position-key derivation belongs to Task 8 of `game-improvement-tasks.md`. Preserve `AppStateV1`, `STORAGE_KEY`, all load/result/activity codes, and every existing structural and cross-field rejection: positive unique entity IDs below `nextId`, unique pet catalog ownership, catalog-only item quantities, exact placement key families, placements referencing owned assets, placement uniqueness/capacity, positive safe whole activity amounts, and exact catalog-bound Croatian activity names and values. In `src/game/store.test.ts`, add table-driven validator coverage that enumerates the closed current families—five chores (`make-bed`, `tidy-toys`, `water-plants`, `set-table`, `fold-laundry`), four pets (`fish`, `rabbit`, `cat`, `dog`), six items (`bowl`, `toy`, `pet-bed`, `plant`, `rug`, `wall-picture`), and three themes (`sun`, `sea`, `forest`)—and exercises the matching activity name/value entries. Assert rejection for an unknown ID, altered activity name, altered reward/price, duplicate pet, impossible placement, invalid item quantity, a fifth distinct pet, and debt above `CONFIG.debtLimit`; retain the existing malformed/unknown-version checks that verify unreadable storage bytes are not overwritten. Do not edit any catalog entry, slot key, storage schema, or storage behavior in this slice.

#### Where
`src/game/store.ts`

`src/game/store.test.ts`

#### Acceptance criteria
- `src/game/store.ts` contains no second hand-maintained chore, pet, item, or theme ID list and no hand-maintained Croatian activity name/value table; validator membership and activity validation are derived from `CHORES`, `PETS`, `ITEMS`, and `THEMES` in `src/content/hr.ts`.
- Validator tests enumerate and accept exactly the current five chore IDs, four pet IDs, six item IDs, and three theme IDs, and accept each catalog’s exact Croatian activity name paired with its positive whole reward or price.
- Tests reject unknown catalog IDs, altered activity names or amounts, duplicate owned pets, placements of unowned or over-quantity assets, invalid quantities, more than `PETS.length` distinct owned pets, and debt above `CONFIG.debtLimit`.
- A valid current V1 record still round-trips under `croatian-money-pet-game:v1` with the same fields, four `pet-N` keys, six `item-N` keys, and unchanged load/result codes; malformed, unknown-version, invalid, and unavailable storage paths retain their current fail-safe behavior, including leaving unreadable stored bytes untouched.
- No entry in `src/content/hr.ts`, no V1 field or version, no storage key, and no position-key contract is added, removed, renamed, or expanded.
- `npm test -- src/game/store.test.ts`, `npm test`, and `npm run check` pass.
