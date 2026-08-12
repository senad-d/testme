# Repeatable browser game release specification

**Status:** Approved product contract for the first installable release  
**Applies to:** `docs/tasks/i-need-you-to-review-the-code-and-tell-me-how-ca-tch-0763c59ed0ceede6-tasks.md`, Tasks 2–9  
**Product target:** Croatian, installable, offline-capable progressive web application (PWA)

## 1. Release target and boundaries

The first release remains a static browser game and becomes an installable PWA. It supports one browser-local child profile, Croatian player-facing content, and fictional zlatnici. The existing four-mission money adventure remains the onboarding journey; the new repeatable activity is pet care with one daily care quest.

The approved PWA identity is:

| Field | Value |
| --- | --- |
| Name | `Moja trgovina ljubimaca` |
| Short name | `Moji ljubimci` |
| Language | `hr` |
| Start URL | `/` |
| Scope | `/` |
| Display | `standalone` |
| Theme color | `#214e45` |
| Background color | `#fffaf0` |
| Orientation | `any` |

All manifest, icon, application-shell, and offline resources are same-origin. Production requires HTTPS; local development may use `localhost`. An unavailable manifest, service worker, or install prompt must not block ordinary online gameplay.

This release does **not** include real money, payments, banking, interest, advertising, analytics, tracking, social features, chat, external purchases, accounts, remote authentication, cloud storage, device synchronization, push notifications, or background sync. It does not claim to be a native game. Any choice to replace the PWA target with a native or another platform stops Tasks 2–9 and requires a separately reviewed replacement plan.

## 2. Audience, session, and first-release success measures

- **Primary player:** a child around eight years old who can read short Croatian instructions.
- **Supporting user:** a parent or guardian using the same browser and device.
- **Target repeat session:** 5–8 minutes, with one visible daily quest and optional care actions.
- **Difficulty:** no timing pressure, random penalty, pet loss, purchase pressure, or irreversible failure. A rejected action explains when or how the child can try again.
- **Economy:** existing fictional-money rules remain unchanged: positive whole-number zlatnik values, interest-free borrowing capped at 100 zlatnika, and parent approval before chore rewards. Care and quests never add, spend, borrow, repay, or transfer zlatnici.

Before release, run a consented moderated test with at least **five child/parent pairs**. Record only aggregate counts and no names, recordings, account identifiers, precise birth dates, analytics identifiers, or free-text personal details. The release thresholds are:

1. At least 4 of 5 children independently find the pet-care surface, identify the daily goal, complete an eligible care action, and recognize its textual result within 8 minutes, with no facilitator action beyond reading the opening instruction.
2. At least 4 of 5 children correctly explain that zlatnici are fictional and that a daily care quest awards XP or a cosmetic—not money.
3. At least 4 of 5 children answer yes to a simple, non-leading “Would you like to care for your pet again another day?” question.
4. At least 4 of 5 parents complete local PIN enrollment and correctly identify both that the PIN protects only this browser session and that forgotten-PIN recovery deletes browser-local progress.
5. At least 4 of 5 parents can locate the lock control and confirm that leaving the parent section or reloading requires the PIN again.

A result below a threshold is a failed release gate, not evidence to change the denominator. An unexecuted playtest remains explicitly blocked and cannot be reported as a pass.

## 3. Repeatable play loop

### Start condition

After the four-mission adventure is available, any child who owns at least one known pet can open the child-facing care surface. Finishing all four missions is encouraged but is not required for care. A child without a pet sees a Croatian empty state leading only to the existing fictional store; the game never borrows or purchases automatically.

At the first care load in a UTC calendar day, the progression domain advances to that day’s window, applies the bounded need change in section 4, and creates one daily quest. It never moves the stored window backward when the device clock moves backward. If the clock advances by more than seven days, it applies at most seven days of need change and starts the current window; pets are never lost or made unusable.

### Player choices and feedback

The player sees one selected owned pet, its three need values, the daily quest, current XP/level, and these Croatian-labeled actions:

| Action ID | Croatian label | Need transition | Action XP | Cooldown |
| --- | --- | --- | ---: | --- |
| `feed` | `Nahrani` | sitost +25, maximum 100 | 5 | 4 hours |
| `play` | `Igraj se` | veselje +20, maximum 100 | 5 | 4 hours |
| `groom` | `Očetkaj` | urednost +20, maximum 100 | 5 | 4 hours |

An action is accepted only for a currently owned known pet, with a valid event ID, after that pet/action cooldown, and while its affected need is below 100. The UI shows adjacent Croatian text for the changed need, XP, quest progress, and next eligible time. A cooldown, full need, stale/unknown pet, duplicate event, expired quest, unavailable storage, or rejected write changes nothing and returns a controlled Croatian result.

### Repeat condition and cadence

- One quest is available per UTC calendar day.
- Optional eligible care actions may be repeated after their four-hour cooldown.
- On each forward daily-window transition, each need decreases by 10, never below 40. At most seven missed windows are applied at once.
- There is no pet death, sickness, removal, loss of purchases, negative XP, level loss, streak, or punishment for not returning.
- The UI always states the next care time or that a new daily goal arrives the next day.

## 4. Progression and pet state

### Levels and rewards

XP is the only mechanical reward from care and quests.

- Each accepted care action awards 5 XP.
- Completing the current daily quest in that same atomic care event awards 15 additional XP.
- `totalXp` is capped at 1,000.
- Level is `min(10, 1 + floor(totalXp / 100))`.
- Level never resets and no seasonal reset exists in this release.
- Levels 2, 4, 6, 8, and 10 unlock the cosmetic titles `Brižna šapica`, `Veseli prijatelj`, `Čuvar ljubimaca`, `Majstor njege`, and `Zvijezda ljubimaca` respectively. Titles have no economic effect.
- At level 10, accepted care still gives feedback and quest evidence but awards no XP above the cap.

### Need initialization and daily change

A newly owned pet is initialized on first care load with `sitost`, `veselje`, and `urednost` all at 70, zero care timestamps, and no event history. Daily change is computed only when the progression module is loaded or an action is attempted; no background timer is required.

All need values are whole numbers from 40 through 100 after recovery or transition. The domain uses a supplied timestamp and does not trust the clock for authentication. Clock rollback freezes the last accepted window and cooldown clocks until time catches up. Clock movement never grants another quest, transition, or reward for an already stored event or window.

### Ownership and stale data

The progression domain receives the current owned-pet IDs from the validated game record. It may create progression only for known, currently owned catalog IDs. A newly purchased known pet is added lazily with the initial state above. A progression record containing an unknown or no-longer-owned pet reference fails closed to safe in-memory progression and is not silently overwritten. The current release has no pet-sale/removal feature; if one is introduced later, it requires an explicit migration policy first.

## 5. Daily quests

The initial release contains exactly three care-only quests:

| Quest ID | Croatian title | Instruction | Required accepted care action | Reward |
| --- | --- | --- | --- | ---: |
| `daily-feed` | `Vrijeme za obrok` | `Nahrani odabranog ljubimca.` | `feed` | 15 XP |
| `daily-play` | `Vrijeme za igru` | `Poigraj se s odabranim ljubimcem.` | `play` | 15 XP |
| `daily-groom` | `Sjajna dlaka i perje` | `Očetkaj odabranog ljubimca.` | `groom` | 15 XP |

The current quest is selected deterministically from the three IDs using the stored non-security profile seed plus the UTC day ordinal. The quest pet is the first owned pet, by catalog order, that can perform the selected action; if none can, the selected owned pet remains visible and the UI explains the next eligible time. Selection is stable for the whole stored window.

Only the accepted care event named by the quest can complete it. Completion evidence consists of quest ID, window, pet ID, action ID, stable care-event ID, completion timestamp, and awarded XP/cosmetic result. Unknown, duplicated, rejected, out-of-window, money, purchase, chore, saving, borrowing, repayment, adventure, and parent events are unsupported evidence and cannot complete or reward a quest. A quest expires when the next forward window is committed and never pays after expiry.

The four existing missions (`saving`, `earning`, `purchase`, and `loan`) remain separate ordered onboarding with their current evidence, stars, badges, and storage record.

## 6. Atomic persistence and compatibility contract

### Records

The new module exclusively owns:

`croatian-money-pet-game:progression:v1`

It does not change the schema or bytes of:

- `croatian-money-pet-game:v1`
- `croatian-money-pet-game:adventure:v1`
- `croatian-money-pet-game:parent-access:v1`

Progression V1 is a strict object containing only: version `1`; a non-security profile seed; last UTC window; total XP; cosmetic-title IDs; currently owned known-pet state; current quest state; and accepted care-event receipts. Numeric values, arrays, IDs, timestamps, and record counts are bounded and validated. The first release retains at most 31 completed daily windows and at most 2,048 event receipts. Receipts older than the current and previous 31 windows may be pruned only during a successful atomic progression write. Events outside that retained window are invalid and cannot be replayed.

A valid event ID is a caller-generated 16–64 character ASCII token containing only letters, digits, `_`, or `-`. It identifies one attempted pet/action/window transition and is not a credential. The UI reuses the same ID when retrying an uncertain submission.

For an accepted care action, one candidate progression value atomically contains:

1. the care need transition and cooldown timestamp;
2. the event ID and complete result receipt;
3. quest completion evidence when applicable; and
4. all action XP, quest XP, and cosmetic unlocks.

The module serializes that one candidate and performs one `setItem` on the progression key. It never writes a legacy record. If `setItem` throws, it rereads progression:

- when the reread contains the same event ID with the complete matching transition, evidence, and reward, return that stored accepted result;
- otherwise return `storage-unavailable` with no accepted event and no in-memory reward.

A retry or reload with an already committed event ID returns its stored result without another need change, quest completion, XP award, or cosmetic unlock. Throw-before-persistence, persist-then-throw, retry, and reload use this same rule.

### Failure and recovery

A missing progression record creates safe in-memory V1 defaults and is written only by the next accepted action. Valid V1 reloads exactly. Malformed JSON, an unknown version, invalid shape/value/reference, unavailable storage, or a read exception produces a controlled safe in-memory state and leaves the unreadable source bytes untouched. It must never be reinterpreted as an older or newer schema and must not cause deletion or rewriting of any legacy record.

Recovery is independent: with informed guardian consent, only the progression key may be removed to restart pet-care progress while leaving the three legacy records intact. Forgotten parent PIN recovery is a separate destructive reset that clearly discloses and removes all four records. Browser storage deletion by a device owner remains possible.

## 7. Local guardian enrollment

A fresh browser profile shows a guardian-labeled Croatian setup form only in the separate parent utility. It uses the existing six-digit PIN setup contract and requires matching entries. Until setup succeeds and the current session is unlocked, grant, chore approve/return, and parent overview controls remain absent.

The PIN is browser-local deterrence, not adult identity verification or account authentication. It does not prevent a device owner from inspecting or clearing storage and has no remote or cross-device recovery. Web Crypto or storage failure must fail closed. Successful setup does not store the raw PIN or a persistent unlocked flag. Unlock is memory-only; explicit lock, leaving the parent section, controller recreation, or reload relocks it.

Forgotten-PIN recovery requires a clearly described, consented destructive reset of all four local records. No recovery question, backdoor PIN, account, email, or remote service is approved.

## 8. Approved first content expansion

The release keeps all existing IDs and values unchanged and adds exactly these entries.

### Chores

| Stable ID | Croatian name | Reward |
| --- | --- | ---: |
| `wipe-table` | `Obriši stol` | 6 |
| `organize-books` | `Složi knjige` | 7 |
| `dust-shelves` | `Obriši prašinu s polica` | 8 |
| `collect-mail` | `Donesi poštu` | 5 |

### Pets

| Stable ID | Croatian name | Price | Emoji |
| --- | --- | ---: | --- |
| `hamster` | `Hrčak` | 45 | `🐹` |
| `turtle` | `Kornjača` | 55 | `🐢` |
| `hedgehog` | `Ježić` | 65 | `🦔` |
| `alpaca` | `Alpaka` | 90 | `🦙` |

All known owned pets support the three selected care actions and the three daily quest types.

### Items

| Stable ID | Croatian name | Price | Category | Association |
| --- | --- | ---: | --- | --- |
| `water-bottle` | `Bočica za vodu` | 12 | pet | decorative `feed` association |
| `play-ball` | `Loptica za igru` | 13 | pet | decorative `play` association |
| `grooming-glove` | `Rukavica za četkanje` | 15 | pet | decorative `groom` association |
| `pet-blanket` | `Dekica za ljubimca` | 19 | pet | no mechanical care effect |
| `wall-clock` | `Zidni sat` | 20 | house | no care association |
| `flower-basket` | `Košara s cvijećem` | 18 | house | no care association |

Associations support Croatian content and filtering only; owning an item never bypasses cooldown, changes a need transition, or multiplies XP. Existing house capacity remains exactly four pet slots and six item slots.

This is a closed first-release catalog: 14 chores, 12 pets, 16 items, and 3 daily quests in total. There is no remote or scheduled content feed. Later content requires an authored, reviewed release and compatible validation updates; the first release cadence is therefore “one bundled set at release, no automatic additions.” Existing themes, missions, badges, glossary topics, practice cards, prices, rewards, stable IDs, and house slots remain unchanged.

## 9. Supported device and browser evidence

The responsive evidence viewports are:

- phone: 320 × 568 CSS px;
- tablet: 768 × 1024 CSS px;
- desktop: 1440 × 900 CSS px.

The supported gameplay/offline target is the current and immediately previous stable release, at validation time, of Chromium Chrome or Edge, Firefox, and Safari on a vendor-supported operating system, with localStorage, Web Crypto, and service workers enabled. Installation evidence is required only where that browser/OS exposes standards-based PWA installation: Chromium desktop/Android and Safari on iOS/iPadOS or macOS. Firefox gameplay/offline remains supported, but no installability claim is made where Firefox provides no installation UI.

The release receipt records exact browser and OS versions actually exercised. It must inspect HTTPS production output in clean profiles for manifest parsing, same-origin service-worker registration, first online load, offline reload, update behavior, no horizontal overflow, visible keyboard focus, enabled 44 × 44 CSS-pixel targets, reduced-motion-equivalent information, and persistence across reload/update. An unexecuted browser, installation mode, viewport, accessibility technology, or playtest remains unclaimed.

The offline worker may cache only versioned same-origin navigation and static shell resources. An uncached navigation receives a controlled Croatian offline fallback. Worker installation, activation, cache cleanup, update, and offline use never read, serialize, cache, remove, or rewrite localStorage or any of the four saved records.

## 10. Acceptance trace

Tasks 2–9 must implement and verify this contract without silently choosing different values. If an implementation needs a different action, cadence, progression rule, catalog entry, reward, browser target, privacy boundary, or threshold, update and re-approve this contract before dependent work proceeds. Automated tests do not replace the installed-browser checks or consented playtest, and neither the task plan nor this specification is evidence that the release has shipped.
