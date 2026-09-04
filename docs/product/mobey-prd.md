# Mobey — Product Requirements Document

**Product:** Mobey (working name)  
**Release:** Family-loop MVP private pilot  
**Primary audience:** Product, design, content, engineering, quality, privacy, and pilot-operations teams  
**Status:** Draft; validated discovery decisions are ready for specification, while the open decisions in section 13 remain unresolved  
**Authoritative source:** [`../discovery/mobey-initial-product-discovery.md`](../discovery/mobey-initial-product-discovery.md)

## 1. Purpose and decision language

This PRD defines the product behavior and release boundary for Mobey’s Family-loop MVP. It is intended to feed a separate technical specification and GitHub backlog. It does not select implementation details that discovery left open.

The following labels distinguish evidence from proposals:

- **Decided** — validated in discovery and required for the MVP.
- **Recommended** — a proposed way to plan or evaluate the product; it is not approved scope until accepted.
- **Open** — unresolved and must not be treated as a requirement or default.

Requirement identifiers from discovery are preserved unchanged. Each requirement links to its discovery interview source (for example, `[U-03]`) and has testable product acceptance criteria. Those identifiers must remain stable when requirements are copied into the technical specification or backlog. If a requirement changes, update the discovery-to-PRD trace rather than silently reusing its identifier for different behavior.

## 2. Product vision and promise

**Decided.** Mobey is a child-friendly website game for children ages 7–9. It connects a money-learning loop to a private family reward loop:

1. the child solves money questions using temporary Practice Amounts;
2. correct answers earn fictional Game Money in a persistent Reward Balance;
3. the child saves toward or requests a parent-defined screen-time reward; and
4. the parent approves or rejects the request and grants any approved screen time outside Mobey.

Mobey teaches exact amounts, affordability, and change with whole numbers. It does not teach real-money exchange, conduct payments, or control another application or device. Practice Amounts, Reward Balance, and Reward Shop are separate concepts and must remain separate in product language and behavior. [Discovery: REQ-PROD-01–03; U-01, U-02, U-04]

The MVP is a private, allowlisted family/user-testing pilot rather than a public release. It must be evaluated across learning improvement, child motivation, and parent utility. The thresholds for those outcomes are open. [Discovery: REQ-PROD-04–05; U-16, U-18]

## 3. Target users, problems, and outcomes

### 3.1 Target users

| User | Decided need and context | Intended outcome | Source |
|---|---|---|---|
| Child player | A child ages 7–9 needs short, understandable practice with money concepts and a motivating reason to return. No age, birth date, real name, or child email is collected. | Practise exact amounts, affordability, and change; understand feedback; earn and save fictional value toward a family reward. | REQ-PROD-01, REQ-CHILD-04, REQ-LEARN-04; U-01, U-05, U-14 |
| Parent/guardian | The sole MVP account holder needs to configure private family access and rewards, oversee learning, and resolve requests. | Set up profiles and rewards, understand child activity at summary level, and manage rewards and balances without Mobey controlling devices. | REQ-AUTH-03, REQ-PARENT-01–04; U-11, U-15 |
| Pilot team | The team needs evidence about learning, motivation, parent utility, safety, and usability before considering broader access. | Make an evidence-based continue/change/stop decision without requiring optional analytics consent. | REQ-PROD-04–05, REQ-PRIV-02; U-14, U-16, U-18 |

### 3.2 Problems to address

**Decided problem framing.**

- Children need age-appropriate practice in composing exact amounts, judging affordability, and calculating change. [U-03, U-05]
- The selected concept must connect learning performance to saving and spending choices through family-defined rewards; discovery records no comparative rationale for that selection. [U-02, U-17]
- Parents need control over profile access, reward definitions, balance corrections, and request decisions, plus useful summaries without permanent question-by-question surveillance. [U-08–U-15]

### 3.3 Learning and behavior outcomes

| Outcome | Product evidence available in MVP | Claim boundary | Status |
|---|---|---|---|
| Skill development | Accuracy by skill and retained Session Summaries; six-question placement selects a starting stage. | Stage advancement is completion-based, not mastery-based. Mobey must not claim mastery from completion alone. | Decided [REQ-LEARN-01–07, REQ-PARENT-01–03] |
| Productive persistence | Attempt number, progressive hints, explanation after the third error, completed sessions, and return behavior if measured with consent. | A wrong answer is supported, not punished beyond the defined 3/2/1/0 reward schedule. | Decided [REQ-GAME-09–10]; measurement method recommended |
| Saving and choice | Goal progress, affordability, request, cancellation, and resolution behavior. | A saving goal does not prevent requesting another affordable item. Screen time is fulfilled by the parent outside Mobey. | Decided [REQ-SHOP-06–08, REQ-REQ-01–09] |
| Parent utility | Ability to configure rewards, review summaries, and resolve requests; pilot feedback. | Dashboard presence alone does not establish usefulness. | Decided capabilities; evaluation method recommended [REQ-PARENT-01–04, U-18] |

## 4. Family-loop MVP experience

### 4.1 Core loop

**Decided.**

1. An allowlisted adult self-registers, confirms adult/guardian authority, accepts pilot terms/privacy, and authorizes the browser.
2. The parent creates up to 10 nickname/avatar/PIN child profiles, selects the family Currency Skin and timezone, and defines the shared Reward Shop.
3. On an Authorized Browser, a child selects a profile, enters its PIN, and completes Placement when no stage is assigned.
4. The child starts one of at most three daily Game Sessions, chooses a Theme, and answers 10 challenges in the current Stage.
5. Each challenge gives up to three attempts. Progressive hints follow the first two wrong answers; the third wrong answer reveals and explains the solution. A correct answer earns 3, 2, or 1 units by attempt; reveal earns 0.
6. Saved rewards increase the child’s Reward Balance. The child can select one Saving Goal and can request any affordable active shop item.
7. A request reserves the item price. The child can cancel it; the parent can approve or reject it. Approval spends the reservation and immediately completes the voucher; cancellation or rejection refunds it.
8. The parent uses the dashboard to review summaries, manage the family, and resolve pending requests. Approved screen time is granted and managed outside Mobey.

Sources: REQ-AUTH-01–09, REQ-CHILD-01–06, REQ-LEARN-01–09, REQ-GAME-01–13, REQ-SHOP-01–09, REQ-REQ-01–10, REQ-PARENT-01–04.

### 4.2 Product journeys

#### Parent onboarding and family setup

**Precondition:** the parent email is on the deployment allowlist.  
**Journey:** register → confirm authority and accept terms/privacy → authorize browser → create child profile(s) → configure shop, Currency Skin, and family timezone → hand the Authorized Browser to a child.  
**Completion state:** at least one child can use a unique PIN on that browser; configured rewards are shared by all profiles.  
**Unresolved edge:** discovery did not decide the guided experience when a family has no profiles or no reward items. [OQ-08]

#### Child learning journey

**Precondition:** the child is on an Authorized Browser and no other Child Session is active for that profile.  
**Journey:** select profile → enter PIN → complete Placement if required → select Theme → start a 10-challenge session → answer with hints/explanations → receive saved Game Money → see stage and balance progress.  
**Interruption state:** before 15 minutes of inactivity the session can resume; after that it is abandoned, previously saved rewards remain, and its daily slot is not restored.

#### Child saving and request journey

**Precondition:** the parent has created an active reward item.  
**Journey:** browse items in parent-defined order → optionally choose one Saving Goal → view affordability/progress → request any affordable item → see price reserved → wait, or cancel for a refund.  
**Completion state:** parent approval spends the reservation and completes the voucher; rejection/cancellation refunds it. No in-product usage state follows approval.

#### Parent oversight journey

**Precondition:** the parent enters parent mode using the password.  
**Journey:** review balances, stages, goals, redemption activity, pending requests, accuracy by skill, and Session Summaries → approve/reject requests → optionally adjust balances with a reason → manage profiles, PINs, sessions, shop, timezone, and Authorized Browsers.

## 5. Scope and non-goals

### 5.1 In scope for the Family-loop MVP

**Decided.**

- Private allowlisted parent self-registration and exactly one parent account per family.
- Up to 10 child profiles using nickname, app-provided avatar, and PIN on Authorized Browsers.
- Placement; Exact Amounts, Affordability, and Change stages; scored sessions, limits, hints, progression, interruption, and concurrency rules.
- English visible instructions, browser text-to-speech and replay, responsive web layouts, and three cosmetic Themes.
- One family-shared custom Reward Shop, one optional Saving Goal per child, Reward Balances, parent adjustments, and request lifecycle.
- USD, EUR, GBP, JPY, and CNY as 1:1 cosmetic Currency Skins.
- Parent dashboard summaries and dashboard-only pending-request visibility.
- Optional first-party pseudonymous analytics, consent withdrawal, and profile/family deletion controls.

Sources: discovery section 10; REQ-AUTH through REQ-PRIV.

### 5.2 Explicit non-goals

**Decided.** The MVP does not include:

- real-money payments, conversion, exchange rates, or authentic currency denomination teaching;
- virtual-item collection or inventory;
- unlocking, blocking, timing, or verifying use of devices or other applications;
- multiple caregivers, social play, chat, leaderboards, ads, or child image uploads;
- email verification, password recovery, parent credential changes, or third-party authentication;
- languages other than English or native mobile applications;
- a CMS or administrative content-authoring product;
- email or push notifications;
- automated moderation of private parent-entered labels or reasons;
- formal WCAG conformance; or
- an expanded public launch.

The absence of formal WCAG conformance is not permission to omit the accessibility expectations in section 9. [Discovery section 10; U-17]

## 6. Product and access requirements

All requirements in sections 6–9 are **Decided** unless explicitly marked otherwise. “Accepted when” states product acceptance and is not a prescribed test implementation.

### 6.1 Product promise

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-PROD-01 | Primary MVP players are children ages 7–9. | Product copy, content review, and pilot recruitment identify ages 7–9 as the child audience; no feature requires storing age. | U-01 |
| REQ-PROD-02 | Core loop is challenge → earn → save/request parent-defined screen time. | A child can complete the full loop with earned Game Money and a configured item. | U-02 |
| REQ-PROD-03 | Parents grant rewards outside Mobey; Mobey does not control devices/apps. | Approval completes the in-product voucher immediately and no control, timer, or usage-verification step exists. | U-02, U-09 |
| REQ-PROD-04 | Release is a private pilot. | Only allowlisted parent emails can self-register; the deployment is not presented as public signup. | U-16 |
| REQ-PROD-05 | Validation covers learning, motivation, and parent utility. | The approved pilot plan contains a measure and decision threshold for each dimension; thresholds remain open until approved. | U-18, OQ-02 |

### 6.2 Registration and authentication

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-AUTH-01 | Registration is limited to a deployment-configured parent-email allowlist. | An allowlisted email can proceed and a non-allowlisted email cannot create an account. | U-16 |
| REQ-AUTH-02 | Registration records authority confirmation and terms/privacy acceptance. | Account creation cannot finish without both affirmative actions. | U-16 |
| REQ-AUTH-03 | A family has exactly one parent login and email is unique. | A second account cannot be created with an existing email; no second caregiver can be added. | U-11, U-12 |
| REQ-AUTH-04 | Password length is 12–128 characters. | Values inside the inclusive range are accepted and values outside it are rejected with an explanation. | U-12, U-13 |
| REQ-AUTH-05 | MVP omits email verification, recovery, and email/password changes. | No user flow offers these functions. | U-12 |
| REQ-AUTH-06 | Parent sign-in can authorize a browser beyond logout. | After parent logout, child profile selection/PIN entry remains available on that Authorized Browser. | U-12 |
| REQ-AUTH-07 | Parent can list and revoke Authorized Browsers. | Revocation removes later child PIN access and ends child access active through that browser. | U-12 |
| REQ-AUTH-08 | A child PIN works only on an Authorized Browser. | The same valid PIN is rejected on an unauthorized browser and accepted on an authorized one when no other rule blocks it. | U-12 |
| REQ-AUTH-09 | Parent mode always requires the parent password from child mode. | Browser authorization or child PIN alone never opens parent mode. | U-13 |
| REQ-AUTH-10 | Parent-password and child-PIN attempts are rate-limited and temporarily locked. | Repeated failures trigger a temporary lock under an approved threshold/scope policy and a locked attempt cannot authenticate; exact policy is open. | U-13, OQ-04 |

### 6.3 Child profiles

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-CHILD-01 | A family can have at most 10 child profiles. | Profiles 1–10 can be created and creation of an 11th is rejected with an explanation. | U-11 |
| REQ-CHILD-02 | Nickname is trimmed, 1–20 characters, and sibling-unique case-insensitively. | Boundary values pass; blank/oversized values and whitespace/case-equivalent sibling duplicates fail. | U-11 |
| REQ-CHILD-03 | Avatar comes only from app-provided illustrations. | A child can choose an available avatar and cannot upload an image. | U-11, U-14 |
| REQ-CHILD-04 | No child age, birth date, real name, or email is stored. | Profile and child journeys do not request these fields, and a data review finds none in child records. | U-11, U-14 |
| REQ-CHILD-05 | Parent chooses a sibling-unique 4–6 digit PIN. | Only 4–6 ASCII-digit strings pass and a PIN used by a sibling is rejected. | U-11 |
| REQ-CHILD-06 | PIN change ends active access and invalidates the old PIN everywhere. | On change, the active Child Session ends and the prior PIN fails on every Authorized Browser. | U-12 |
| REQ-CHILD-07 | Confirmed profile deletion is irreversible and removes all child data. | Deletion ends play and removes balance, progression, sessions/summaries, goals, request/history data, and associated raw analytics without deleting sibling data. | U-06, U-26 |

## 7. Learning and game requirements

### 7.1 Placement and progression

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-LEARN-01 | Initial/reset progression starts with six unscored questions, two per skill. | Placement presents exactly six questions covering each of the three skills twice and records no score reward. | U-05 |
| REQ-LEARN-02 | Placement permits one answer, explains, advances, and uses no money/daily slot. | Each answer immediately leads to explanation/next question; balance and daily starts are unchanged. | U-05 |
| REQ-LEARN-03 | Placement applies prerequisite-based stage assignment. | Missing either Exact Amounts answer assigns Exact Amounts; passing both Exact but missing either Affordability assigns Affordability; passing both earlier skills assigns Change. | U-05 |
| REQ-LEARN-04 | Stage order is Exact Amounts → Affordability → Change. | Every assigned/advanced stage follows this order. | U-05 |
| REQ-LEARN-05 | Ten completed Game Sessions advance a stage, independent of accuracy. | Sessions 1–9 do not advance; completion 10 advances Exact/Affordability and no accuracy gate is applied. | U-05 |
| REQ-LEARN-06 | Difficulty rises across each stage’s 10 sessions within whole-number 0–100 scope. | Approved content mapping shows increasing difficulty and contains no value outside 0–100; exact curve remains open. | U-04, U-05, OQ-03 |
| REQ-LEARN-07 | Change continues indefinitely after its first 10 sessions. | Completing the tenth Change session leaves Change active and permits another Change session. | U-05 |
| REQ-LEARN-08 | Parent may reset to Placement but cannot assign a stage. | Dashboard offers reset and no direct stage selection. | U-05 |
| REQ-LEARN-09 | Reset clears current stage/count but preserves economic/history data. | After reset, Placement is required while balance, goal, request/history, and prior summaries remain unchanged. | U-05 |
| REQ-LEARN-10 | Reset during active play applies to the next Game Session. | Current play finishes or is abandoned under its original stage; the next start requires Placement. | U-06 |

### 7.2 Sessions and challenges

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-GAME-01 | A scored session contains 10 challenges and targets about 10 minutes. | Normal completion requires exactly 10 challenges; pilot usability work assesses observed duration against the approximate 10-minute target. | U-06 |
| REQ-GAME-02 | Child may start three sessions per Family Timezone calendar day; start consumes a slot. | Starts 1–3 succeed, a fourth is blocked, abandonment does not refund a start, and reset occurs at the next stored-timezone day; the effect of a parent timezone refresh across a day boundary remains open (OQ-14), and duplicate/concurrent starts within one Child Session remain open (OQ-15). | U-06 |
| REQ-GAME-03 | Closed-browser play resumes before 15 minutes inactivity and is abandoned afterward. | Reopening before the boundary resumes; after 15 minutes the run cannot resume and its daily slot remains consumed. | U-06 |
| REQ-GAME-04 | Each completed-question reward is saved immediately and survives interruption. | After a saved answer, closing/abandoning the session leaves that reward in balance. | U-06 |
| REQ-GAME-05 | Connection loss before save pauses play and preserves the question locally. | The same current question remains available; reward-bearing progress is blocked until reconnection and save. | U-06 |
| REQ-GAME-06 | Only one active Child Session exists per profile. | Correct PIN on a second device is blocked while the first session is active. | U-06 |
| REQ-GAME-07 | Child access expires after 15 minutes inactivity; parent can end it. | Either timeout or parent action ends access and releases the active-session lock. | U-06 |
| REQ-GAME-08 | Challenges are randomized within stage without exact repeat in a session. | A session uses only current-stage content and contains no exact duplicate challenge. | U-06 |
| REQ-GAME-09 | Scored challenge allows three attempts with progressive support. | Wrong attempts one and two show different progressive help; wrong attempt three reveals/explains and advances. | U-03 |
| REQ-GAME-10 | Rewards are 3/2/1/0 by successful attempt or reveal. | Correct on attempts 1/2/3 adds exactly 3/2/1 units; three wrong answers add 0. | U-03 |
| REQ-GAME-11 | Retried completion saves award at most once. | Repeating the same completion after timeout does not increase balance twice. | U-13 |
| REQ-GAME-12 | Values are whole numbers 0–100 using denominations 1, 2, 5, 10, 20, 50, 100. | Approved challenges contain no decimal/out-of-range value or other denomination. | U-04 |
| REQ-GAME-13 | Practice Amounts never debit Reward Balance. | Submitting any challenge answer changes balance only by its earned reward, never by the displayed budget/price/change. | U-02 |

## 8. Rewards, balances, and parent requirements

### 8.1 Currency presentation

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-CUR-01 | Parent selects one family-wide USD/EUR/GBP/JPY/CNY skin. | Each listed skin can be selected and applies to all family profiles. | U-04 |
| REQ-CUR-02 | Skins change presentation only at 1:1 value. | Switching skins changes symbol/name but not balances, prices, values, or denominations. | U-04 |
| REQ-CUR-03 | A skin change restyles current, pending, and historical values. | All such views show the newly selected skin with unchanged numbers immediately after change. | U-04 |
| REQ-CUR-04 | No payment, real transaction, or exchange calculation occurs. | No user flow takes payment details, transfers value, or applies an exchange rate. | U-04 |

### 8.2 Reward Shop and Saving Goal

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-SHOP-01 | One parent-defined shop is shared by all family profiles. | An active item created once is visible to each child in that family and not to another family. | U-08 |
| REQ-SHOP-02 | Item has label, whole-minute duration, whole-unit price, and parent order. | Parent can create/edit each field and reorder items. | U-08 |
| REQ-SHOP-03 | Item limits are label 1–40, duration 1–240, price 1–10,000, and 20 active items. | Inclusive boundaries pass; blank/non-whole/out-of-range values and item 21 fail with the violated limit explained. | U-08 |
| REQ-SHOP-04 | Duplicate active labels are allowed. | Two distinct items with the same label can coexist and retain their own duration, price, and identity. | U-08 |
| REQ-SHOP-05 | Automated label moderation is excluded. | No automated moderation dependency blocks create/edit in the trusted pilot. | U-25 |
| REQ-SHOP-06 | Child can have zero or one active-item goal and see current-price progress. | Selecting a goal replaces any prior goal; clearing leaves none; progress toward the item’s current price is shown. | U-09 |
| REQ-SHOP-07 | Goal follows edits; deleting its item clears it and prompts reselection. | Edit updates displayed duration/price; deletion leaves no goal and presents a choose-another prompt. | U-09 |
| REQ-SHOP-08 | Goal does not restrict requests. | Child can request any affordable active item, whether or not it is the goal. | U-09 |
| REQ-SHOP-09 | Child sees parent-defined item order. | Reordering in parent mode is reflected in child shop order. | U-08 |

### 8.3 Voucher requests

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-REQ-01 | Child has at most one Pending request. | A second request is rejected until the first reaches a terminal state. | U-09 |
| REQ-REQ-02 | Unaffordable items stay visible but cannot be requested. | Item remains in the shop with request action unavailable/rejected when price exceeds Available Balance. | U-09 |
| REQ-REQ-03 | Request atomically reserves price and snapshots item fields. | One successful action reduces Available Balance by price, increases Reserved Amount by price, and stores label/duration/price together. | U-09 |
| REQ-REQ-04 | Later item edits/deletion do not alter pending snapshot. | Pending detail and resolution retain original label, duration, and price. | U-09 |
| REQ-REQ-05 | Child cancellation refunds the full reservation. | Pending becomes cancelled once and Available Balance increases by exactly the reserved amount. | U-09 |
| REQ-REQ-06 | Rejection refunds; optional reason is visible and 1–100 trimmed characters. | Rejection refunds exactly once; absent reason is accepted; valid reason is shown; blank/oversized supplied reason is rejected. | U-09 |
| REQ-REQ-07 | Approval spends reservation and immediately completes voucher. | Reserved Amount decreases by price without increasing Available Balance, status becomes completed, and no unused state follows. | U-09 |
| REQ-REQ-08 | Pending requests do not expire. | Passage of time alone does not resolve or refund a request. | U-09 |
| REQ-REQ-09 | First approve/reject/cancel action wins exactly once. | Under concurrent actions, one terminal result and one matching balance effect persist; later actions report that state. | U-09, U-13 |
| REQ-REQ-10 | Pending requests are notified only in dashboard. | Dashboard exposes pending status; no email or push is generated. | U-15 |

### 8.4 Balance management

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-BAL-01 | Reward, reservation, resolution, and adjustment writes are atomic and retry-safe. | Each operation produces its complete expected balance effect or none; retry-capable operations cannot duplicate value. | U-03, U-09, U-10, U-13 |
| REQ-BAL-02 | Adjustment is a whole number −10,000…+10,000 with a trimmed 1–100 character reason. | Any whole-number amount in the inclusive range and a valid reason pass; out-of-range/non-whole amounts and blank/oversized reasons fail. | U-10 |
| REQ-BAL-03 | Negative adjustment cannot use reserved money or make Available Balance negative. | Any violating subtraction is rejected with balances unchanged. | U-10 |
| REQ-BAL-04 | Adjustment amount and reason appear in parent and child history. | Both views show the same signed amount and reason after success. | U-10 |
| REQ-BAL-05 | No product total-balance cap; overflow fails safely. | No ordinary product maximum is imposed, and exceeding the specified technical safe bound returns failure without wrap, truncation, or partial write; bound is open. | U-10, OQ-11 |

### 8.5 Parent dashboard and controls

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-PARENT-01 | Dashboard shows balance, stage/progress, goal/redemption, pending request, skill accuracy, and Session Summaries per child. | Parent can find each listed datum for each existing child. | U-15 |
| REQ-PARENT-02 | Session Summaries remain until profile deletion. | All prior summaries remain retrievable before deletion and are gone after confirmed profile deletion. | U-15 |
| REQ-PARENT-03 | Summary history omits permanent question/answer-level records. | Parent history shows aggregates and does not expose every question, answer, attempt, and timestamp. | U-15 |
| REQ-PARENT-04 | Parent controls progression reset, shop, requests, balance, sessions, timezone, profiles/PINs, and browsers. | Authenticated parent can perform every listed action, including refreshing stored timezone from browser detection. | U-05, U-06, U-08–U-10, U-12 |

## 9. Non-functional, safety, privacy, and accessibility requirements

### 9.1 Presentation, accessibility, and content

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-UX-01 | MVP is English-only. | All shipped instructions and product content needed to complete journeys are available in English; no other locale is required. | U-07 |
| REQ-UX-02 | Every instruction has visible text, browser narration, and replay. | Each instruction remains readable and has a child-accessible control that requests browser speech again. | U-07 |
| REQ-UX-03 | Failed/missing/muted audio never blocks play. | Every journey can continue using visible text when speech is unavailable or muted. | U-07 |
| REQ-UX-04 | Child chooses market, fantasy shop, or space station per Game Session. | All three choices are offered at start; choice changes presentation but not rules or challenge eligibility. | U-07 |
| REQ-UX-05 | Responsive website supports modern desktop, tablet, and phone browsers. | Critical parent and child journeys complete at representative desktop/tablet/phone viewport sizes in the approved browser matrix; matrix is open. | U-07, U-17, OQ-10 |
| REQ-UX-06 | MVP targets basic child usability without claiming WCAG conformance. | Pilot usability review includes children in the target range; public/product copy makes no formal conformance claim. | U-07 |
| REQ-UX-07 | Content is version-controlled and released through pull request/deployment. | Shipped challenge/theme/instruction content is traceable to a repository revision; no CMS edit path exists. | U-21 |
| REQ-UX-08 | Explicit game-money/parent-approval disclosure is not required in child UI. | Absence of such disclosure does not fail MVP acceptance; comprehension is assessed as a pilot risk. | U-25 |

**Accessibility expectations — Decided.** Visible instructions are the functional fallback for speech; replay must be reachable from the child experience; audio state cannot gate an answer or advance action; and responsive layouts must preserve complete critical journeys. Formal WCAG conformance and exact browser/TTS matrices remain outside the commitment. [REQ-UX-02–06, OQ-10]

**Recommended, not yet approved.** Before pilot release, run task-based usability sessions with target-age children that cover independent instruction comprehension, replay discovery, touch/desktop interaction, error recovery, and understanding of Practice Amount versus Reward Balance. Discovery requires basic child usability but provides no numeric pass threshold. [U-07, U-25]

### 9.2 Privacy, consent, and deletion

| ID | Requirement | Accepted when | Discovery source |
|---|---|---|---|
| REQ-PRIV-01 | Prohibit child real names/emails/ages, chat, social play, ads, uploads, and unrelated tracking. | Product/data-surface review finds none of the prohibited fields or features. | U-14 |
| REQ-PRIV-02 | Optional analytics requires parent notice/consent; refusal preserves game functionality. | No optional event is collected before opt-in; decline still permits every Family-loop feature. | U-14 |
| REQ-PRIV-03 | Analytics is first-party, pseudonymous, in project AWS, and excludes nickname, email, PIN, answer text. | Event-schema and destination review confirms all four exclusions and no third-party analytics destination. | U-14 |
| REQ-PRIV-04 | Raw optional events persist until withdrawal or relevant deletion; withdrawal stops and removes them. | After withdrawal, no new optional event is accepted and prior raw family events are deleted. | U-14, U-26 |
| REQ-PRIV-05 | Child deletion removes only that child’s raw events. | Associated raw events are gone while sibling data remains. | U-26 |
| REQ-PRIV-06 | Password-confirmed family deletion irreversibly removes family product/raw analytics data, subject to legal backup rules. | Wrong/missing password blocks deletion; correct confirmation removes account, profiles, balances, shop, requests/history, summaries, and raw analytics under the approved deletion/backup policy. | U-26, OQ-06 |

### 9.3 Security, integrity, availability, and performance boundaries

These product qualities are already expressed by functional identifiers and remain **Decided**:

- **Access control:** Authorized Browser restriction, password-gated parent mode, one active Child Session, revocation/PIN invalidation, and rate limiting. [REQ-AUTH-06–10, REQ-CHILD-06, REQ-GAME-06–07]
- **Integrity:** immediate reward persistence, retry idempotency, atomic reservation/balance changes, first-action-wins resolution, and safe overflow failure. [REQ-GAME-04, REQ-GAME-11, REQ-REQ-03, REQ-REQ-09, REQ-BAL-01, REQ-BAL-05]
- **Recoverability:** interrupted play preserves the current question locally before save and retains already saved rewards; no offline reward-bearing play is allowed. [REQ-GAME-03–05]
- **Session timing:** the only decided time targets are approximately 10 minutes per Game Session and 15 minutes for inactivity behavior. No response-time, uptime, recovery-time, or scale target was discovered and none is introduced here. [REQ-GAME-01, REQ-GAME-03, REQ-GAME-07, OQ-05]

## 10. Analytics and evaluation constraints

### 10.1 Measurement guardrails

**Decided.** Product analytics is optional, first-party, pseudonymous, and hosted in the project AWS environment. It must not contain nickname, parent email, PIN, or answer text. Consent refusal cannot reduce product functionality. Raw events remain until consent withdrawal or relevant child/family deletion. Essential Session Summaries are distinct from optional analytics and remain until profile deletion. [REQ-PRIV-02–05, REQ-PARENT-02–03]

The exact event contract, fields, aggregation, access controls, and reporting are **Open**. No backlog item may infer an event merely from the measures below; the event contract requires separate approval and privacy review. [OQ-09]

### 10.2 Pilot success framework

The three success dimensions are **Decided**; measures and thresholds below are **Recommended** unless marked open. Thresholds must be approved before the pilot begins so results are not judged retrospectively. [REQ-PROD-05, OQ-02]

| Dimension | Recommended measure | Constraint | Success threshold |
|---|---|---|---|
| Learning improvement | Change in skill accuracy between a child’s earlier and later comparable Session Summaries within a stage; report stage and exposure count. | Do not equate stage completion with mastery; define comparable content after the difficulty curve is approved. | **Open — OQ-02/OQ-03** |
| Child motivation | Started-to-completed Game Session rate and return for another session/day, supplemented by child/parent research. | Optional event-based measures include only consented families; avoid unrelated behavior tracking. | **Open — OQ-02/OQ-09** |
| Parent utility | Share of pending requests resolved in the dashboard plus parent-reported ability to configure rewards, understand summaries, and resolve requests. | No email/push notification is available; “time to resolution” is not yet an approved event or target. | **Open — OQ-02/OQ-09** |
| Child comprehension | Observed understanding that learning values are temporary, Game Money is fictional, and reward approval/fulfilment belongs to the parent. | Required as risk research because explicit child-facing disclosure is not required. | **Open — OQ-02** |
| Child usability/access | Successful completion of core child tasks with visible text when audio is unavailable, across the approved browser/device sample. | No formal WCAG claim; browser matrix is open. | **Open — OQ-02/OQ-10** |
| Reliability/integrity | No confirmed duplicate reward, double request resolution, reserved-fund loss, or cross-family access defect in release-blocking scenarios. | This is a recommended release gate grounded in decided integrity requirements, not a production-rate target. | **Recommended: zero known release-blocking integrity defects** |

### 10.3 Release readiness versus pilot success

- **Release readiness — Recommended gate:** every in-scope requirement has an approved technical trace and passing acceptance evidence; privacy/legal blockers applicable to the chosen jurisdiction are resolved; pilot operations and deletion behavior are ready.
- **Pilot success — Open thresholds:** the product owner must approve numeric or qualitative gates for learning, motivation, parent utility, comprehension, and usability before recruitment. Without those gates, the pilot may gather evidence but cannot make a pre-agreed success claim.
- **Analytics consent is never a release or participant eligibility condition.** Pilot research must accommodate families who decline optional analytics. [REQ-PRIV-02]

## 11. Assumptions and dependencies

### 11.1 Validated assumptions and constraints

| Item | Status | Product implication | Source |
|---|---|---|---|
| Trusted private family setting | Decided pilot boundary | Parent-entered labels/reasons are private; automated moderation is deferred, not generalized to public use. | U-16, U-25 |
| Parent fulfils screen time | Decided | Voucher completion records approval, not actual use or device control. | U-02, U-09 |
| One parent account | Decided | No caregiver invitation, shared ownership, or role matrix is needed in MVP. | U-11, U-17 |
| Browser speech availability varies | Decided risk | Visible text is authoritative fallback and speech cannot block play. | U-07 |
| Content is shipped with application releases | Decided | Content readiness and review are release dependencies; no runtime CMS workflow exists. | U-21 |
| Family timezone controls daily limit | Decided | Parent can refresh browser-detected timezone; a child device timezone does not independently reset starts. | U-06 |

### 11.2 Delivery dependencies

These are validated constraints from discovery, included only where they affect product delivery:

- The separate technical specification must support a TypeScript monorepo, React/Vite web app, NestJS REST API, PostgreSQL, version-controlled content, Docker Compose local development, and AWS infrastructure defined with Terraform. [U-19, U-20]
- Transactional design is required for balance reservation/resolution and idempotent reward saves. [U-09, U-10, U-13]
- The pilot needs controlled allowlist operations, terms/privacy content, a consent record, and support for credential loss because MVP has no verification/recovery/change flow. [U-12, U-16]
- Release depends on approved learning content for three stages, progressive hints/explanations, three Themes, English instructions, and app-provided avatars. Exact content curve and assets are open. [U-03, U-05, U-07, OQ-03, OQ-12]
- Browser/device validation depends on an approved support and text-to-speech matrix. [U-07, OQ-10]
- Legal review depends on choosing a jurisdiction and defining backup/deletion obligations. [U-16, U-26, OQ-01, OQ-06]
- Capacity and cost validation depend on expected family count, peak sessions, AWS region, data volume, and budget. [U-22, OQ-05]

## 12. Risks and mitigations

| Risk | Product consequence | Required or recommended response | Status/source |
|---|---|---|---|
| Jurisdiction is unknown | Consent, disclosure, deletion, retention, and currency treatment cannot be declared compliant. | **Required before a compliance claim or public availability:** legal/privacy review and approved lifecycle policy; determine separately whether private-pilot access is permissible. | Open; U-16, OQ-01/OQ-06 |
| Credentials are unverified, immutable, and unrecoverable | Typo, password loss, or email ownership issue can strand a family. | **Recommended:** pilot support/runbook; do not expand publicly without revisiting verification/recovery. | Decided trade-off; U-12 |
| Currency skins resemble real money but are 1:1 cosmetic | Children may infer exchange or authentic denominations. | **Recommended:** test comprehension and keep educational claims limited to whole-number skills. | U-04, U-25 |
| Reward is additional screen time | The incentive and Mobey itself both consume screen time. | **Recommended:** assess acceptability with parents and monitor the three-start limit in research. | U-02, U-06 |
| Advancement measures completion, not mastery | Low-accuracy children still advance and Change repeats indefinitely. | **Required:** do not claim mastery; **recommended:** review skill trends in pilot. | U-05 |
| Browser text-to-speech is inconsistent | Narration quality and availability vary by platform. | **Required:** visible fallback; **recommended:** target-device testing after matrix approval. | U-07, OQ-10 |
| No formal accessibility target | Some children may be unable to complete core journeys. | **Recommended:** basic target-age usability/access review and explicit pre-public-launch reassessment. | U-07 |
| Indefinite raw-event retention until withdrawal/deletion | Retention may exceed later legal/data-minimization expectations. | **Required before jurisdictional launch:** approve retention and backup policy. | U-14, OQ-06 |
| Private parent text is unmoderated | Inappropriate text may be shown to a child. | Accept only for trusted pilot; decide moderation before wider access. | U-25 |
| No product balance cap | Storage overflow could corrupt value. | **Required in technical specification:** safe bound/type and explicit no-write failure. | U-10, OQ-11 |
| Scale and cost are unknown | Chosen hosting shape may be disproportionate or undersized. | **Required before architecture lock:** capacity and cost assumptions. | U-20, U-22, OQ-05 |
| Allowlist requires controlled updates | Participant onboarding/removal has operational overhead. | **Recommended:** documented allowlist and access-removal procedure. | U-16 |
| No explicit child-facing disclosure is required | A child may mistake Game Money for real value or a request for guaranteed approval. | **Recommended:** observe comprehension and reconsider disclosure if confusion appears. | U-25 |

## 13. Open decisions

These questions are not defaults. The named decision gate indicates when each must be resolved.

| ID | Decision needed | Decision gate |
|---|---|---|
| OQ-01 | Pilot and later-launch country/region. | Before any jurisdictional compliance claim or public availability; legal/privacy review must determine whether it blocks private-pilot access. |
| OQ-02 | Success thresholds for learning, motivation, parent utility, comprehension, and usability. | Before pilot measurement begins. |
| OQ-03 | Exact amount bands, templates, canonical duplicate identity, hint sequence, and complexity increments for sessions 1–10 in each stage and ongoing Change sessions; whether the two Change questions in Placement are retained as a diagnostic signal or discarded after they cannot alter the highest-stage placement. | Before content acceptance and comparable learning measurement. |
| OQ-04 | Failed-attempt threshold, lock duration, and family/device/IP scope for password and PIN defenses; parent-session and Authorized Browser lifetimes; and which authenticated activity refreshes the fixed 15-minute Child Session timeout. | Before authentication specification is approved. |
| OQ-05 | Registered families, peak active sessions, data volume, AWS region, and monthly budget. | Before architecture/cost approval. |
| OQ-06 | Backup retention, deletion SLA, audit/consent retention, export, policy re-consent rules, and the deletion path when the sole parent has lost the unrecoverable password. | Before privacy approval and deletion implementation acceptance. |
| OQ-07 | Durable ledger/idempotency records and retention without creating permanent parent-visible per-answer history. | Before balance/session data design is approved. |
| OQ-08 | Initial Reward Balance, when the initial Currency Skin and Family Timezone are established, and onboarding/empty-state behavior before the first child or first reward item exists. | Before onboarding design acceptance. |
| OQ-09 | Optional analytics event names, fields, aggregation, access, and reporting. | Before analytics implementation; requires privacy review. |
| OQ-10 | Supported browser versions, TTS criteria, fallback test matrix, keyboard/focus, zoom/reflow, contrast/non-color, touch-target, reduced-motion, responsive-layout criteria, and target-age usability protocol. | Before release test plan is approved. |
| OQ-11 | Safe numeric storage ceiling and overflow response. | Before balance technical specification is approved. |
| OQ-12 | Final brand, avatar set, art direction, item illustrations, instruction script, and Unicode normalization/length-counting plus allowed control/newline rules for text inputs. | Before design/content production is accepted. |
| OQ-13 | Cloud sizing/HA, scaling, recovery, observability, secrets, Terraform state, and environment isolation. | In the technical specification before infrastructure delivery. |
| OQ-14 | When the parent may refresh the stored Family Timezone and how daily-slot accounting and active play behave if the refresh crosses a calendar-day boundary. | Before timezone behavior is approved. |
| OQ-15 | Whether one Child Profile may have more than one active Game Session within its single Child Session, and whether duplicate/concurrent starts resume an existing run, fail, or consume distinct daily slots. | Before active Game Session start behavior is approved. |

## 14. Phased product roadmap

The Family-loop MVP boundary is **Decided**. Sequencing within it and any post-pilot work below are **Recommended planning**, not additional approved scope.

| Phase | Status | Product outcome | Exit evidence |
|---|---|---|---|
| 0 — Resolve release blockers | Recommended next phase | Decisions needed for safe specification and measurable pilot: jurisdiction, success gates, learning curve, credential defenses, data lifecycle, analytics contract, browser matrix, numeric bound, scale/cost, family timezone lifecycle, active Game Session start behavior, and key content/assets. | Owners approve applicable OQ-01–OQ-15 decisions; unresolved items are explicitly deferred only if they do not block participant safety or requirement acceptance. |
| 1 — Prove the learning loop | Recommended implementation slice within MVP | Parent/child access, profiles, Placement, stages, 10-challenge sessions, hints/scoring, resilient saves, Currency Skins, Themes, and Session Summaries. | REQ-PROD, REQ-AUTH, REQ-CHILD, REQ-LEARN, REQ-GAME, applicable REQ-UX/CUR/PARENT acceptance evidence. |
| 2 — Complete the family reward loop | Recommended implementation slice within MVP | Shared Reward Shop, Saving Goal, Reward Balance/adjustments, atomic request lifecycle, dashboard controls, and required history. | REQ-SHOP, REQ-REQ, REQ-BAL, and remaining REQ-PARENT acceptance evidence, including concurrency cases. |
| 3 — Pilot readiness and private release | Decided MVP release boundary; recommended sequencing | Safety/privacy/deletion behavior, optional consented analytics, responsive/TTS validation, allowlist operations, content readiness, and approved pilot research plan. | All in-scope requirement evidence; jurisdiction/privacy disposition and thresholds approved for the pilot; private allowlisted deployment ready. |
| 4 — Pilot evaluation | Recommended | Evaluate learning, motivation, parent utility, comprehension, accessibility/usability, integrity, and operating cost. | Pre-agreed measures reported with consent limitations and a documented continue/change/stop decision. |
| 5 — Post-pilot hardening or expansion | Open; not MVP scope | Candidate work may address findings such as credential recovery, additional caregivers/languages/auth methods, moderation, accessibility conformance, or broader launch. | Separate discovery and approval; no item is committed by this roadmap. |

## 15. Traceability and handoff rules

- Sections 6–9 preserve every validated discovery requirement identifier from `REQ-PROD-01` through `REQ-PRIV-06`; section 13 preserves `OQ-01` through `OQ-15`.
- Backlog items should cite one or more requirement IDs and their acceptance criteria. Technical tasks must not replace the user-visible outcome with an implementation detail.
- A requirement that depends on an open decision may be specified only up to the validated boundary. For example, rate limiting is required by `REQ-AUTH-10`, but no attempt count or lock duration is approved until `OQ-04` is resolved.
- Recommendations in this PRD do not become requirements merely by being copied into a plan. Record approval and change the status explicitly.
- The technical specification must define architecture, persistence, APIs, concurrency, security controls, and operational behavior needed to satisfy this PRD; it must not alter product scope without a traced product decision.
