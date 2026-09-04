# Mobey — Initial Product-Discovery Findings

**Stage:** 1 — initial live product discovery  
**Status at stage completion:** Interview complete; ready for PRD and specification work  
**Working product name:** Mobey  
**Repository snapshot captured:** greenfield application repository before this document was added  
**Document scope:** Interview decisions, explicitly identified derived safeguards, and repository evidence are preserved as a discovery-time snapshot. Present repository state and later-stage completion must be verified separately before acting on historical inventory or next-step statements.

## 1. Purpose and context

Mobey is a child-friendly website game for children ages 7–9. A child answers money-learning questions, earns game money, saves toward parent-defined screen-time rewards, and requests a reward from the parent. The parent approves or rejects the request and grants approved screen time outside Mobey. Mobey does not control another app or device. [U-01, U-02]

This stage only validates product requirements and the domain model. It does not implement the product, prepare the PRD/specifications, create repository guidance, or open a pull request. [A]

Starting delivery constraints are fixed: frontend and backend live in one repository; Docker and Docker Compose support local development; AWS infrastructure is defined with Terraform; and work is managed through GitHub issues, branches, commits, and pull requests. [A]

At the discovery-time snapshot, the repository contained no application, tests, Docker setup, Terraform, or prior product documentation. The only product-adjacent configuration was a stale SonarCloud file. [C-01, C-02]

## 2. Source and traceability key

Requirements and model statements cite one or more of these sources.

### Assignment source

- **[A] Mission assignment:** greenfield money-learning website; monorepo, Docker/Compose, AWS/Terraform, and GitHub delivery constraints; discovery-only stage; later PRD/specification, repository guidance, review/remediation, and documentation PR stages.

### User interview sources

- **[U-01] Audience and identity:** working name “Mobey”; primary child audience ages 7–9.
- **[U-02] Product concept:** hybrid earn/save progression; children earn by solving questions; the actual shop contains parent-predefined screen-time items such as “Nintendo — 30 minutes gameplay — 10 units”; no virtual-item inventory; learning-question amounts are temporary and do not spend the persistent balance.
- **[U-03] Question mechanics:** exact amount, affordability, and change; three attempts; progressive hints after the first two mistakes; reveal/explain after the third mistake; rewards of 3/2/1/0 units.
- **[U-04] Numeric and currency model:** whole-number amounts from 0–100; denominations 1, 2, 5, 10, 20, 50, and 100; USD/EUR/GBP/JPY/CNY are 1:1 display skins only; no exchange rates, authentic denomination sets, or real transactions; a skin change restyles historical and current values.
- **[U-05] Placement and progression:** six unscored placement questions, two per skill, one answer each; prerequisite-based placement; three ordered stages; 10 completed sessions per stage; gradually increasing difficulty; final change stage continues indefinitely; parents can reset for a new placement but cannot directly select a stage; reset keeps economic/history data; placement does not consume a daily slot.
- **[U-06] Session lifecycle:** 10 challenges/about 10 minutes; up to three Game Session starts per child per calendar day in a stored family timezone; the parent may refresh that timezone from browser detection; starting consumes a slot; save rewards after each question; one active Child Session per child; simultaneous or later second-browser access is blocked; a Child Session has a 15-minute inactivity timeout; an interrupted Game Session resumes while that access remains active and is abandoned afterward; a parent may end a Child Session; connection loss pauses play and preserves the current question locally; challenge order is randomized within the current Stage without an exact repeat in one Game Session; a progression reset during active play applies after that play ends and before the next Game Session.
- **[U-07] Presentation and access:** English-only MVP; browser text-to-speech for every instruction, visible instruction text, and a replay button; audio failure/mute never blocks play; responsive modern desktop, tablet, and phone browsers; three child-selected themes (everyday market, fantasy shop, space station); basic child usability without formal WCAG conformance.
- **[U-08] Reward shop:** one family-shared catalog; custom trimmed nonblank label, duration, and price; labels 1–40 characters; duration 1–240 whole minutes; price 1–10,000 whole units; no more than 20 active items; duplicate labels allowed; parent-defined ordering; invalid or oversized input is rejected with an explanatory message.
- **[U-09] Saving and request lifecycle:** one active saving goal per child with progress against the current item price; editing a goal item updates it and deleting one clears the goal; every item remains visible but only an affordable item may be requested; one pending request per child; reserve cost on request; child cancellation and parent rejection refund it; approval spends it and immediately completes the voucher; requests do not expire; pending requests snapshot one coherent version of label, duration, and price; optional visible trimmed rejection reason of 1–100 characters; first resolution wins exactly once.
- **[U-10] Balance management:** balance belongs to a child; parents may apply signed whole-number adjustments of −10,000 through +10,000 with a required trimmed 1–100 character reason; adjustments cannot make available balance negative or consume reserved funds and appear in parent/child history; no product-level total-balance cap.
- **[U-11] Family and child profiles:** exactly one parent login per MVP family; up to 10 child profiles; no child age or birth date; trimmed 1–20 character nickname unique case-insensitively among siblings; app-provided avatar only; parent-chosen 4–6 digit PIN unique among siblings.
- **[U-12] Authentication and Authorized Browsers:** parent email/password; unique email; password length 12–128; no email verification, password recovery, email change, or password change in MVP; child PIN works only on a parent-authorized browser; authorization survives parent logout; parent can list/revoke Authorized Browsers; PIN change/revocation ends affected Child Sessions.
- **[U-13] Access control and concurrency:** entering parent mode from child mode always requires the parent password; login attempts are rate-limited and temporarily locked after repeated failures; exact thresholds open; repeated reward-save requests are idempotent; concurrent voucher resolutions are first-action-wins.
- **[U-14] Privacy and analytics:** no child real name, child email, age/birth date, chat, social features, ads, image uploads, or unrelated behavioral tracking; optional first-party pseudonymous analytics in the project AWS environment; no nickname, parent email, PIN, or answer text in analytics; declining analytics does not reduce functionality; raw events remain until consent withdrawal or relevant account/profile deletion.
- **[U-15] Parent visibility:** parent dashboard shows balances, stage, saving/redemption activity, pending requests, accuracy by skill, and session summaries; all summaries remain until profile deletion; no permanent question/answer history; pending requests use dashboard-only notification.
- **[U-16] Pilot and consent:** private family/user-testing pilot; allowlisted parent emails in deployment configuration; parent self-registration; adult/guardian authority confirmation and terms/privacy acceptance; launch country/jurisdiction open.
- **[U-17] MVP boundary:** Family-loop MVP selected; the complete exclusion list in section 10 was explicitly approved.
- **[U-18] Validation:** success must cover learning improvement, child motivation, and parent utility; numeric thresholds intentionally remain for the PRD.
- **[U-19] Application technology:** TypeScript throughout; React/Vite SPA; NestJS backend; PostgreSQL; REST/JSON with shared/generated TypeScript contracts; version-controlled content package; approved monorepo paths.
- **[U-20] Runtime and delivery:** S3/CloudFront, ECS Fargate behind ALB, RDS PostgreSQL, Terraform; one non-production and one production AWS environment; full-stack hot-reloading Docker Compose locally; PR plans/checks, automatic non-production deployment after merge, manual production approval; full blocking quality suite; retain and update SonarCloud.
- **[U-21] Content management:** content is version-controlled in the monorepo and changed by pull request/deployment; no CMS.
- **[U-22] Capacity constraints:** expected family count, peak concurrency, and AWS budget are open.
- **[U-23] Repository guidance:** later guidance file must use conventional plural filename `AGENTS.md`.
- **[U-24] Final scope check:** user reported no additional must-have or prohibition.
- **[U-25] Explicitly accepted presentation/content risks:** no explicit child-facing “game money / parent approval” disclosure; automated moderation of private parent labels is deferred until after MVP.
- **[U-26] Deletion:** child deletion removes the child from active product and analytics stores; family deletion requires password re-entry and removes the entire family from active product and analytics stores. Backup/audit propagation and completion timing remain subject to later legal rules under OQ-06.

### Repository evidence

- **[C-01] Root repository inventory:** `.DS_Store`, `.env`, `.git/`, `.gitignore`, `.pi/`, and `sonar-project.properties`; `docs/` and all proposed application/infrastructure paths were absent before this document.
- **[C-02] `sonar-project.properties:1-6` at the discovery-time snapshot:** referenced `apps/api/src`, `apps/web/src`, `packages/content/src`, `packages/shared/src`, absent test paths, `infra/cdk/**`, and JavaScript-only test patterns.
- **[C-03] `.gitignore:1-3` at the discovery-time snapshot:** ignored only `.env`, `.pi`, and `.DS_Store`.

## 3. Options compared and outcome

The user selected an option but did not state a comparative rationale; no rationale is inferred here. [U-02, U-17]

### Product concepts

| Concept considered | Main value presented in interview | Main trade-off presented | Outcome |
|---|---|---|---|
| Shop & Change | Concrete arithmetic and immediate feedback | Narrower life-money lesson | Not selected |
| Saving Goal | Delayed gratification and spending trade-offs | More reading/explanation | Not selected alone |
| Budget Adventure | Broader budgets, needs/wants, and surprises | More complex for a simple ages 7–9 MVP | Not selected |
| Hybrid progression | Practice money questions, then save/spend earned game money | Larger scope than a single mechanic | **Selected**, later sharpened into learning challenges plus a parent-defined reward shop |

Source: [U-01, U-02].

### Release slices

| Slice considered | Boundary | Outcome |
|---|---|---|
| Learning-loop pilot | One parent/child, question skills, scoring, balance, small fixed rewards | Not selected |
| Family-loop MVP | Full parent/profile/PIN, placement, progression, custom reward, request, dashboard, currencies, analytics, narration, failure/security flow | **Selected** |
| Expanded launch | Family-loop plus multilingual, multiple auth methods/caregivers, device enforcement, richer reporting | Explicitly future/out of scope |

Source: [U-17].

### Technical options

| Decision | Selected | Alternatives compared |
|---|---|---|
| Ecosystem | TypeScript across web/API/packages | Split TypeScript/Python; open choice |
| Web | React + Vite SPA | Next.js |
| API | NestJS | Fastify; Express |
| Persistence | PostgreSQL | DynamoDB |
| API style | REST/JSON contracts | GraphQL |
| AWS shape | S3/CloudFront + ECS Fargate/ALB + RDS PostgreSQL | App Runner; Lambda/API Gateway + Aurora Serverless |
| Narration | Browser text-to-speech | Pre-generated assets; runtime Polly; hybrid |
| Content | Version-controlled package | Internal CMS; headless CMS |

Source: [U-07, U-19, U-20, U-21].

## 4. Glossary

| Term | Definition used in this baseline | Source |
|---|---|---|
| **Mobey** | Working name for the product described by this document. | [U-01] |
| **Family** | The MVP tenancy boundary: one parent login, zero to ten child profiles, a shared reward shop, one currency skin during play, one timezone, and zero or more authorized browsers. | [U-04, U-08, U-11, U-12] |
| **Parent** | The adult/guardian who owns the sole family login, defines rewards, manages profiles/progression, reviews learning summaries, and resolves requests. | [U-11, U-15, U-16] |
| **Child** | The intended ages 7–9 player represented by a nickname/avatar profile; no age, real name, or email is stored. | [U-01, U-11, U-14] |
| **Child profile** | A family-owned play identity with nickname, predefined avatar, PIN, progression, balance, goal, request history, and summaries. | [U-11, U-15] |
| **Authorized browser** | A browser previously authorized through a parent sign-in where children may later select a profile and use its PIN. Authorization is browser-scoped and does not itself confer parent authority. | [U-12, U-13] |
| **Child PIN** | A parent-chosen 4–6 ASCII-digit string, preserving leading zeroes; it is family-local and unique among siblings, not an internet-wide credential. | [U-11, U-12] |
| **Child session** | An authenticated child-mode session for one profile; at most one may be active, and concurrent second-browser access is blocked. | [U-06, U-13] |
| **Game session** | A run of 10 scored learning challenges, targeted at about 10 minutes; starting it consumes a daily slot. | [U-06] |
| **Daily session slot** | One of three game-session starts allowed to a child on a family-calendar day; abandonment does not restore it. | [U-06] |
| **Placement round** | Six unscored one-answer questions, two per skill; prerequisite results select the starting stage. It consumes no daily slot and grants no money. | [U-05] |
| **Stage** | One of three ordered learning phases: exact amounts, affordability, then change. Ten completed sessions advance a stage. | [U-05] |
| **Learning challenge** | A themed, scored question inside a game session. Challenge values are temporary practice values. | [U-02, U-03] |
| **Practice amount/budget** | Temporary money shown only to solve a learning challenge; it never changes the child’s persistent reward balance. | [U-02] |
| **Attempt** | One submitted answer to a scored challenge; up to three are permitted. | [U-03] |
| **Progressive hint** | Additional help shown after the first or second incorrect attempt without revealing the answer. | [U-03] |
| **Game money / reward unit** | Fictional whole-number value earned from scored challenges or parent adjustments and spent only in the reward shop. It is never real currency. | [U-02, U-03, U-04, U-10] |
| **Reward balance** | The child’s persistent game-money ledger, comprising money currently available plus money reserved by a pending request. | [U-09, U-10] |
| **Available balance** | Reward balance not reserved and therefore available for a new reward request or negative adjustment. | [U-09, U-10] |
| **Reserved amount** | The item price made unavailable while a request is pending; it is spent on approval or refunded on rejection/cancellation. | [U-09] |
| **Reward shop** | The family-shared, parent-ordered catalog of real-world screen-time rewards; it is not the illustrated setting of learning questions. | [U-02, U-08] |
| **Reward-shop item / screen-time voucher** | A parent-defined label, duration in minutes, and game-money price, such as “Nintendo — 30 minutes gameplay — 10 units.” It promises no device control by Mobey. | [U-02, U-08, U-09] |
| **Media time** | The user’s example of a screen-time reward for watching videos. It is a custom label/use, not a fixed system category. | [U-02, U-08] |
| **Gaming time** | The user’s example of a higher-value screen-time reward for playing games. It is a custom label/use, not a fixed system category. | [U-02, U-08] |
| **Active saving goal** | The one reward-shop item a child selects for a progress display; it does not prevent requesting another affordable item. | [U-09] |
| **Voucher request / redemption request** | A child’s request to exchange game money for a reward-shop item; it is pending until child cancellation or parent approval/rejection. | [U-09] |
| **Approval** | The parent action that spends reserved money and immediately marks the voucher completed; Mobey does not track later consumption of screen time. | [U-09] |
| **Parent adjustment** | An auditable, reasoned parent addition to or subtraction from one child’s reward balance. | [U-10] |
| **Currency skin** | One of USD, EUR, GBP, JPY, or CNY used only to restyle the same numbers and game denominations 1:1. | [U-04] |
| **Family timezone** | Browser-detected timezone stored on the family and refreshable only from the parent dashboard; it defines daily-cap reset. | [U-06] |
| **Session summary** | Retained per-session aggregate results used for parent accuracy/progress views; it is not an individual question/answer log. | [U-15] |
| **Product analytics** | Optional pseudonymous first-party events used to assess aggregate learning, motivation, and workflow behavior; they are distinct from essential session summaries. | [U-14, U-18] |
| **Theme / learning scene** | Cosmetic setting chosen for a game session: everyday market, fantasy shop, or space station. It does not identify a purchased reward. | [U-07] |

### Terminology distinctions

- **“Shop” is ambiguous.** Use **reward shop** for parent-defined screen-time items and **theme/learning scene** for the illustrated setting around practice questions. The user explicitly rejected a virtual-item shop. [U-02, U-07]
- **“Money” is ambiguous.** Use **practice amount** for temporary question values and **reward balance/game money** for persistent spendable units. Neither is real money. [U-02, U-04]
- **“Session” is ambiguous.** Use **child session** for authenticated access and **game session** for a 10-question run. [U-06]
- No application code existed at the discovery-time snapshot, so there were no source identifiers to map to these terms. [C-01, C-02]

## 5. Entities and relationships

### Family and access

- A **Family** has exactly one **Parent Account** in the MVP. Multiple caregiver logins are out of scope. [U-11, U-17]
- A Parent Account is identified by a unique email and a 12–128 character password. Both credentials are fixed after registration in MVP. [U-12]
- A Family has at most 10 Child Profiles. Whether a registered family may remain indefinitely with zero profiles is not explicitly decided. [U-11; OQ-08]
- A Family has zero or more Authorized Browsers. Each authorization can be revoked independently. [U-12]
- A Child Profile belongs to exactly one Family and uses one predefined avatar, one nickname, and one PIN. [U-11]
- A Child Profile has at most one active Child Session. A Child Session runs on one Authorized Browser. [U-06, U-12]
- A Family has one stored Family Timezone and one current Currency Skin during play. Initial setup is unresolved under OQ-08, and timezone-change effects are unresolved under OQ-14. [U-04, U-06]

### Learning

- A Child Profile has zero or more Placement Rounds over its lifetime because a parent may reset it. [U-05]
- A completed Placement Round assigns exactly one current Stage. [U-05]
- A Child Profile has one current Stage after placement and one completed-session count within that stage. [U-05]
- Stages are ordered exactly: Exact Amounts (1) → Affordability (2) → Change (3). [U-05]
- A Child Profile has zero or more Game Sessions; each started session consumes one of three daily slots. [U-06]
- A Game Session contains exactly 10 Learning Challenges, belongs to one Stage, and uses one child-selected Theme. [U-05, U-06, U-07]
- A Placement Round contains exactly six unscored questions: two per Stage skill. [U-05]
- A completed Game Session produces one Session Summary. All summaries are retained until profile deletion. [U-15]
- Individual question and answer records are not part of permanent parent-visible history. The minimal persistence needed for idempotency remains a technical-design detail. [U-13, U-15; OQ-07]

### Rewards and balances

- A Child Profile has exactly one Reward Balance, logically divided into available and reserved amounts. [U-09, U-10]
- A Family owns one Reward Shop shared by every Child Profile. [U-08]
- A Reward Shop has at most 20 active Reward-Shop Items. Deleted items may still be represented by snapshots in request/history records. [U-08, U-09]
- Each Reward-Shop Item has a stable identity, custom label, duration, price, and parent-defined order. Stable identity is required because duplicate labels are allowed. [U-08]
- A Child Profile has zero or one Active Saving Goal, referencing an active Reward-Shop Item. [U-09]
- A Child Profile has zero or more historical Voucher Requests but at most one Pending Voucher Request. [U-09]
- A Pending Voucher Request snapshots one coherent item version—label, duration, and price—and reserves that snapshot price. [U-09]
- Once resolved, a Voucher Request has exactly one terminal outcome: approved/completed, rejected, or child-cancelled. The first terminal action wins. [U-09, U-13]
- A Child Profile has zero or more balance-ledger changes from challenge rewards, request reservation/resolution, and Parent Adjustments. Exact ledger retention/storage structure is not yet specified. [U-03, U-09, U-10; OQ-07]

### Analytics and consent

- A Family has an optional analytics-consent state. Essential product storage is independent of that consent. [U-14]
- An opted-in Family may produce many first-party pseudonymous analytics events. Events must not contain nickname, email, PIN, or answer text. [U-14]
- Child deletion removes associated events from active analytics storage; consent withdrawal or family deletion removes the applicable raw events from active analytics storage. Backup/audit propagation and completion timing remain governed by OQ-06. [U-14, U-26]

## 6. Validated requirements

The outcomes below are user-validated unless explicitly marked as a **derived safeguard**. Derived safeguards make a validated tenancy, safety, accessibility, or transaction invariant implementable; they do not claim verbatim interview wording, close an open question, or authorize additional product scope.

### 6.1 Audience and product promise

- **REQ-PROD-01:** Mobey’s primary MVP player is a child ages 7–9. [U-01]
- **REQ-PROD-02:** The core loop is answer learning challenges → earn game money → save or request a parent-defined screen-time reward. [U-02]
- **REQ-PROD-03:** Parent approval grants the reward outside Mobey; Mobey neither unlocks, blocks, times, nor verifies use of other media/game apps. [U-02, U-09]
- **REQ-PROD-04:** The MVP is a private family/user-testing pilot, not a public launch. [U-16]
- **REQ-PROD-05:** MVP validation must examine learning improvement, child motivation, and parent utility; targets are open. [U-18]

### 6.2 Registration, authentication, and roles

- **REQ-AUTH-01:** Pilot self-registration accepts only parent emails in a deployment-configured allowlist. [U-16]
- **REQ-AUTH-02:** Registration requires confirmation of adult/guardian authority and acceptance of pilot terms/privacy notice. [U-16]
- **REQ-AUTH-03:** Each family has one parent login and each email may identify only one account. [U-11, U-12]
- **REQ-AUTH-04:** Parent passwords are 12–128 characters. [U-12, U-13]
- **REQ-AUTH-05:** The MVP does not verify email, recover forgotten passwords, or allow parent email/password changes. [U-12]
- **REQ-AUTH-06:** A parent-authenticated browser can be retained as an Authorized Browser after parent logout. [U-12]
- **REQ-AUTH-07:** Parent dashboard lists Authorized Browsers and permits revocation; revocation ends affected active child access. [U-12]
- **REQ-AUTH-08:** Child PIN access works only on an Authorized Browser. [U-12]
- **REQ-AUTH-09:** Entering parent mode from child mode always requires the parent password. [U-13]
- **REQ-AUTH-10:** Parent-password and child-PIN attempts are rate-limited and temporarily locked after repeated failures; thresholds are open. **Derived safeguard:** external failures are generic and do not disclose whether an account, profile, or PIN exists. [U-13]
- **REQ-AUTH-11:** **Derived safeguard:** Every parent and child action is authorized from the authenticated server-side principal and scoped to that principal’s Family and, for a child, its own Child Profile. Request-supplied family/profile identifiers and Authorized Browser status never grant parent or cross-profile authority. [U-11, U-12, U-13]
- **REQ-AUTH-12:** **Derived safeguard:** Passwords, PINs, session credentials, and Authorized Browser credentials are stored only as appropriate one-way hashes/verifiers; raw credentials are neither recoverably encrypted nor logged. [U-11, U-12, U-14]

### 6.3 Child profiles

- **REQ-CHILD-01:** A family may have at most 10 child profiles. [U-11]
- **REQ-CHILD-02:** Nicknames are trimmed, 1–20 characters, and unique case-insensitively among siblings. [U-11]
- **REQ-CHILD-03:** A child chooses an avatar only from app-provided illustrations; uploads are prohibited. [U-11, U-14]
- **REQ-CHILD-04:** No child age, birth date, real name, or email is stored. [U-11, U-14]
- **REQ-CHILD-05:** A parent chooses a 4–6 digit PIN and sibling PINs must be unique. **Derived safeguard:** interpret “digit” as ASCII `0`–`9` and represent the PIN as a string so leading zeroes are preserved. [U-11]
- **REQ-CHILD-06:** Changing a PIN ends the child’s active session immediately and invalidates the old PIN on every Authorized Browser. [U-12]
- **REQ-CHILD-07:** Confirmed profile deletion is irreversible, immediately ends active play, and removes balance, progression, sessions/summaries, goals, request/history data, and child-associated raw analytics from active stores. Backup/audit propagation and deletion-completion timing remain unresolved under OQ-06. [U-06, U-26]

### 6.4 Placement and progression

- **REQ-LEARN-01:** Initial and parent-reset progression begins with a six-question unscored Placement Round, two questions per skill. [U-05]
- **REQ-LEARN-02:** Each placement question allows one answer, then shows a child-friendly explanation and advances. Placement earns no game money and consumes no daily slot. [U-05]
- **REQ-LEARN-03:** Placement is prerequisite-based: failure to answer both exact-amount questions correctly starts Exact Amounts; passing Exact Amounts but not both Affordability questions starts Affordability; passing both earlier skills starts Change. [U-05]
- **REQ-LEARN-04:** Fixed Stage order is Exact Amounts → Affordability → Change. [U-05]
- **REQ-LEARN-05:** A child advances after completing 10 Game Sessions in a Stage; advancement is completion-based, not mastery-based. [U-05]
- **REQ-LEARN-06:** Difficulty rises gradually across the 10 sessions of each Stage while staying within whole-number 0–100 scope. [U-04, U-05]
- **REQ-LEARN-07:** After 10 Change sessions, ongoing Game Sessions continue the Change stage indefinitely. [U-05]
- **REQ-LEARN-08:** A parent cannot assign a Stage directly; a parent may only reset the child to retake Placement. [U-05]
- **REQ-LEARN-09:** Reset clears current Stage and within-Stage completed-session count, while preserving balance, goal, request/history data, and prior summaries. [U-05]
- **REQ-LEARN-10:** An active Game Session finishes or is abandoned under its current Stage; the reset then requires a new Placement Round before another scored Game Session starts. [U-05, U-06]

### 6.5 Game sessions and challenge mechanics

- **REQ-GAME-01:** A scored Game Session contains 10 challenges and targets approximately 10 minutes. [U-06]
- **REQ-GAME-02:** A child may start at most three Game Sessions per stored Family Timezone calendar day. Starting consumes a slot even if the session is abandoned; the effect of a parent timezone refresh is gated by OQ-14. **Derived safeguard:** concurrent start attempts enforce the limit atomically and cannot create a fourth slot. [U-06]
- **REQ-GAME-03:** A Game Session interrupted by a closed browser is resumable while its Child Session remains active; after 15 minutes of inactivity, the Child Session expires and the Game Session is abandoned without restoring the daily slot. [U-06]
- **REQ-GAME-04:** Rewards from completed questions are saved immediately and retained when a session is interrupted or abandoned. [U-06]
- **REQ-GAME-05:** A connection failure before save pauses the game, preserves the current question locally, and requires reconnection; no further reward-bearing play occurs offline. [U-06]
- **REQ-GAME-06:** Only one active Child Session is permitted per profile; any later second-browser entry is blocked until the first ends. **Derived safeguard:** simultaneous valid PIN entries are resolved atomically so at most one session is created. [U-06]
- **REQ-GAME-07:** Child sessions expire after 15 minutes of inactivity; parents can end them manually. [U-06]
- **REQ-GAME-08:** Challenge order is randomized within the current Stage, but an exact challenge cannot repeat inside one Game Session. [U-06]
- **REQ-GAME-09:** Scored challenges allow three attempts. The first two wrong answers reduce reward and provide progressive hints. A third wrong answer reveals/explains the solution and advances. [U-03]
- **REQ-GAME-10:** Correct-answer reward is 3 units on attempt one, 2 on attempt two, 1 on attempt three, and 0 after answer reveal. [U-03]
- **REQ-GAME-11:** Retrying a timed-out challenge-completion save grants its reward at most once. **Derived safeguard:** a retried final challenge also completes the Game Session, creates its Session Summary, increments progression, and performs any Stage transition at most once. [U-05, U-13, U-15]
- **REQ-GAME-12:** Learning values use whole numbers from 0 through 100 and shared denominations 1, 2, 5, 10, 20, 50, and 100; decimals/cents are excluded. [U-04]
- **REQ-GAME-13:** Learning-question values are Practice Amounts only; they never debit Reward Balance. [U-02]
- **REQ-GAME-14:** **Derived safeguard:** The server, not the client, owns the current Stage, daily count, challenge state, correctness decision, and reward. It validates submitted answers and does not disclose the correct answer before REQ-GAME-09 permits reveal. [U-02, U-03, U-05, U-06, U-13]

### 6.6 Presentation and content

- **REQ-UX-01:** MVP language is English only. [U-07]
- **REQ-UX-02:** Every instruction has visible text, browser-generated narration, and a child-accessible replay button. [U-07]
- **REQ-UX-03:** Missing, failed, or muted audio never blocks play. [U-07]
- **REQ-UX-04:** At Game Session start, the child chooses everyday market, fantasy shop, or space station; themes are cosmetic and use the same learning rules. [U-07]
- **REQ-UX-05:** The website is responsive across modern desktop, tablet, and mobile browsers; native applications are excluded. [U-07, U-17]
- **REQ-UX-06:** MVP targets basic child usability without claiming formal WCAG conformance. **Derived safeguard:** this requires semantic controls, visible focus, keyboard-operable critical journeys, associated labels/errors, non-color-only states, usable zoom/reflow, generous touch targets, and reduced-motion behavior. [U-07]
- **REQ-UX-07:** Content resides in a version-controlled monorepo package and changes only through the normal pull-request/deployment workflow. [U-21]
- **REQ-UX-08:** The child UI is not required to add an explicit disclaimer that currency symbols represent game money or that requests require parent approval; this accepted omission does not permit copy or presentation that implies real monetary value, guaranteed approval, or in-product screen-time enforcement. [U-04, U-09, U-25]

### 6.7 Currency skins

- **REQ-CUR-01:** Parent selects one family-wide skin from USD, EUR, GBP, JPY, and CNY. [U-04]
- **REQ-CUR-02:** Skins alter symbol/name presentation only; all use the same numbers, prices, balances, and denominations at 1:1 value. [U-04]
- **REQ-CUR-03:** Changing skin immediately restyles current balances/items, pending requests, and historical amounts without numeric conversion. [U-04]
- **REQ-CUR-04:** Mobey performs no payment, real-currency transaction, or exchange-rate calculation. [U-04]

### 6.8 Reward shop and saving goals

- **REQ-SHOP-01:** One parent-defined Reward Shop is shared by all family child profiles. [U-08]
- **REQ-SHOP-02:** An item has a custom label, whole-minute duration, whole-unit price, and parent-controlled order. [U-08]
- **REQ-SHOP-03:** Item validation is: trimmed nonblank label up to 40 characters; duration 1–240; price 1–10,000; maximum 20 active items; invalid/oversized input is rejected with an explanatory message. [U-08]
- **REQ-SHOP-04:** Active item labels need not be unique. [U-08]
- **REQ-SHOP-05:** Automated moderation of parent-entered labels is excluded from MVP. [U-25]
- **REQ-SHOP-06:** A child may select zero or one active item as a Saving Goal and see progress toward its current price. [U-09]
- **REQ-SHOP-07:** Editing a goal item updates its goal duration/price. Deleting it clears the goal and prompts the child to choose another. [U-09]
- **REQ-SHOP-08:** A Saving Goal does not restrict purchase; a child may request any affordable item. [U-09]
- **REQ-SHOP-09:** Items are presented in parent-defined order. [U-08]

### 6.9 Voucher requests

- **REQ-REQ-01:** A child may have at most one Pending Voucher Request. [U-09]
- **REQ-REQ-02:** An unaffordable item remains visible but cannot be requested. [U-09]
- **REQ-REQ-03:** Creating a request atomically reserves the server-owned item’s current price and snapshots one coherent version of its label, duration, and price. **Derived safeguard:** a client-supplied price is never authoritative, and duplicate/retried creation cannot reserve twice. [U-09, U-13]
- **REQ-REQ-04:** A committed Pending snapshot does not change after an item edit/deletion. **Derived safeguard:** request creation and concurrent item edit/deletion have one defined transactional order—creation uses either the complete pre-edit or complete post-edit version and fails if deletion wins. [U-09, U-13]
- **REQ-REQ-05:** The child may cancel Pending and receive a full reserved-amount refund. [U-09]
- **REQ-REQ-06:** Parent rejection refunds the reserved amount. A rejection reason is optional, child-visible when present, trimmed, and 1–100 characters. [U-09]
- **REQ-REQ-07:** Parent approval spends the reservation and immediately completes the voucher; there is no “approved but unused” state. [U-09]
- **REQ-REQ-08:** Pending requests do not expire automatically. [U-09]
- **REQ-REQ-09:** Concurrent approve/reject/cancel actions use first-action-wins resolution and change the balance exactly once; later actions report the already-resolved state. [U-09, U-13]
- **REQ-REQ-10:** Parents discover pending requests only in the dashboard; email and push notifications are excluded. [U-15]

### 6.10 Balance and parent adjustments

- **REQ-BAL-01:** Challenge reward, reservation, approval, refund, cancellation, and manual adjustment operations update balance atomically and idempotently where retries are possible. **Derived safeguard:** concurrent operations are serialized or conditionally committed so available and reserved balances remain valid and no operation is applied twice. [U-03, U-09, U-10, U-13]
- **REQ-BAL-02:** A parent adjustment is a signed whole number from −10,000 through +10,000 and requires a trimmed 1–100 character reason. [U-10]
- **REQ-BAL-03:** A negative adjustment cannot reduce Available Balance below zero and cannot consume a Pending Request’s Reserved Amount. [U-10]
- **REQ-BAL-04:** Adjustment amount and reason are visible in parent and child balance history. [U-10]
- **REQ-BAL-05:** There is no product-level maximum total balance; technical overflow must fail safely rather than wrap or lose value. [U-10]
- **REQ-BAL-06:** **Derived safeguard:** Durable balances, prices, reservations, ledger values, rewards, and adjustments use exact integer arithmetic; JavaScript floating-point arithmetic is not authoritative for those values. The supported ceiling and boundary response remain OQ-11. [U-03, U-08, U-09, U-10]

### 6.11 Parent dashboard and records

- **REQ-PARENT-01:** Dashboard shows every child’s balance, current Stage/progress, Saving Goal and redemption activity, pending request, accuracy by skill, and retained Session Summaries. [U-15]
- **REQ-PARENT-02:** All Session Summaries remain until profile deletion. [U-15]
- **REQ-PARENT-03:** Parent-visible summaries do not retain every individual question, answer, attempt, and timestamp. [U-15]
- **REQ-PARENT-04:** Parent can reset progression, manage/reorder shared rewards, resolve requests, adjust balance, end Child Sessions, refresh stored timezone from browser detection, manage profiles/PINs, and revoke Authorized Browsers. [U-05, U-06, U-08, U-09, U-10, U-12]

### 6.12 Safety, privacy, analytics, and deletion

- **REQ-PRIV-01:** Prohibited child-facing/data features are real child names, child emails, ages/birth dates, chat, social play, ads, image uploads, and unrelated behavioral tracking. [U-14]
- **REQ-PRIV-02:** Optional product analytics require parent notice/consent; refusal leaves all game functionality available. [U-14]
- **REQ-PRIV-03:** Optional analytics are first-party and pseudonymous in the project AWS environment and exclude nickname, parent email, PIN, and answer text. [U-14]
- **REQ-PRIV-04:** Raw optional events remain in active analytics storage only while consent remains and the relevant profile/family exists. Withdrawal stops collection and removes that family’s prior raw events from active analytics storage; backup/audit propagation and completion timing remain unresolved under OQ-06. [U-14, U-26]
- **REQ-PRIV-05:** Deleting one child removes that child’s raw events from active analytics storage without deleting other profiles’ active data; backup/audit propagation remains unresolved under OQ-06. [U-26]
- **REQ-PRIV-06:** Full family deletion requires parent password re-entry and irreversibly removes the account, profiles, balances, shop, requests/history, summaries, and associated raw analytics from active stores. Backup/audit propagation, legal retention, and completion timing remain unresolved under OQ-06. [U-26]
- **REQ-PRIV-07:** **Derived safeguard:** Parent-entered nicknames, reward labels, adjustment reasons, and rejection reasons are family-scoped untrusted text. Product surfaces render them as text rather than executable markup and never expose them publicly or to another family. [U-11, U-14, U-25]
- **REQ-PRIV-08:** **Derived safeguard:** Passwords, PINs, raw tokens, and submitted answers never appear in operational logs, errors, optional analytics, screenshots, or delivery evidence. Real participant emails, nicknames, labels, reasons, or other participant data never appear in logs, analytics, fixtures, screenshots, or delivery artifacts; development and test evidence uses deterministic synthetic identities and content. [U-11, U-12, U-14, U-25]

## 7. Edge-case scenarios

### Input and capacity

1. **Blank/oversized reward input:** When the parent submits a blank label, label over 40 characters, non-whole/out-of-range duration or price, or a 21st active item, reject it and explain the violated limit. [U-08]
2. **Duplicate reward label:** Two active items may both be called “Gaming”; stable item identity, duration, and price distinguish them. [U-08]
3. **Duplicate nickname:** Reject a sibling nickname that differs only by case or surrounding whitespace from an existing nickname. [U-11]
4. **Duplicate PIN:** Reject a child PIN already used by a sibling. [U-11]
5. **Oversized adjustment:** Reject an adjustment outside ±10,000 or a reason outside 1–100 characters. [U-10]
6. **Very large accumulated balance:** Do not impose a product cap, but never wrap, truncate, or silently lose value at the technical storage boundary. [U-10]

### Learning and session lifecycle

7. **Three wrong answers:** Give hints after errors one and two, reduce potential reward from 3 to 2 to 1, then reveal/explain after error three and award 0. [U-03]
8. **Audio unavailable:** Keep visible text and allow normal play; replay may be attempted but failed/muted speech does not block. [U-07]
9. **Exact duplicate generation:** Regenerate/reselect rather than show the exact same challenge twice in one session. [U-06]
10. **Connection loss before save:** Pause on the current challenge, preserve it locally, and require reconnection before more reward-bearing play. [U-06]
11. **Connection loss after save request timeout:** A retry returns/recognizes the original completion and must not award twice. [U-13]
12. **Browser closed mid-Game Session:** Permit Game Session resumption while the Child Session remains active; after 15 minutes of inactivity expire access and abandon the Game Session, keep prior saved rewards, and do not restore its daily slot. [U-06]
13. **Fourth session start today:** Block it until the next day in the stored Family Timezone. Changing a child browser timezone does not change the reset; parent refresh behavior across a date boundary remains unresolved under OQ-14. [U-06]
14. **Placement reset:** Clear Stage/session-count progress only; do not grant rewards, consume a daily slot, or erase balance/history/goals. [U-05]
15. **Reset during play:** Finish or abandon the active Game Session under its current Stage, then require Placement before another scored Game Session. [U-05, U-06]
16. **Final progression complete:** Continue Change sessions rather than mixed review or path restart. [U-05]

### Concurrent and unauthorized access

17. **Same child in a second browser:** Even with the correct PIN, block the second Child Session while the first is active. [U-06]
18. **Stale first browser:** Release the Child Session lock after 15 minutes of inactivity, or let the parent end that Child Session manually. [U-06]
19. **Child opens parent area:** Require the parent password; prior browser authorization alone is insufficient. [U-13]
20. **PIN changed:** End the current Child Session and reject the old PIN on every Authorized Browser. [U-12]
21. **Browser revoked:** End active child access associated with it and reject later PIN use until parent reauthorization. [U-12]
22. **Repeated login failures:** Rate-limit and temporarily lock attempts; exact attempt count/duration is open. [U-13; OQ-04]

### Reward and balance lifecycle

23. **Insufficient available balance:** Keep the item visible but disable/reject request creation. [U-09]
24. **Already has pending request:** Reject another request even if enough Available Balance remains. [U-09]
25. **Child cancels:** Resolve as cancelled and atomically restore the full reservation. [U-09]
26. **Parent rejects:** Resolve as rejected, atomically refund, and show the optional supplied reason to the child. [U-09]
27. **Parent approves:** Spend the reservation and immediately complete; do not create a separate usage-tracking state. [U-09]
28. **Request ignored:** Keep it Pending indefinitely until parent action or child cancellation. [U-09]
29. **Concurrent resolution:** Commit only the first approve/reject/cancel action and apply spend/refund once; subsequent actions see resolved state. [U-09, U-13]
30. **Catalog item edited/deleted while pending:** Continue to show and resolve the request using its original label, duration, and price. [U-09]
31. **Active goal item edited:** Update the goal’s current duration/price. [U-09]
32. **Active goal item deleted:** Clear the goal and prompt the child to choose another. [U-09]
33. **Negative parent adjustment with reservation:** Reject any amount that would use Reserved Amount or make Available Balance negative. [U-10]
34. **Currency skin changed:** Preserve every number and restyle current/pending/historical values with the new symbol. [U-04]

### Deletion and consent

35. **Profile deleted during play:** End play immediately and irreversibly remove the profile and associated raw analytics from active stores; apply OQ-06 to backup/audit propagation and completion timing. [U-06, U-26]
36. **Family deleted:** Require password re-entry, terminate access, and remove all family product/raw analytics data from active stores; apply OQ-06 to legal retention, backups, and completion timing. [U-26]
37. **Analytics declined:** Store essential account/progress/request/session-summary data but no optional analytics; keep full functionality. [U-14]
38. **Analytics consent withdrawn:** Stop future collection and remove that family’s prior raw optional events from active analytics storage; apply OQ-06 to backup/audit propagation and completion timing. [U-14, U-26]

### Cross-operation race and stale-state cases

The following are derived safeguards that make the validated first-action, revocation, tenant, and balance invariants hold under simultaneous or stale requests.

39. **Simultaneous valid child sign-ins:** Atomically create at most one Child Session; the other attempt sees the active-session conflict rather than creating a second session. [U-06, U-13]
40. **Session invalidated during a child command:** PIN change, browser revocation, parent end, timeout, or deletion and a state-changing child command have a defined order. Commit the command only if the Child Session is still valid at that command’s authorization point; after invalidation, reject stale retries and discard client-cached play state. [U-06, U-12, U-13, U-26]
41. **Duplicate request creation:** A duplicate click, retry, or uncertain response creates at most one Pending Voucher Request and one reservation. [U-09, U-13]
42. **Request races with item edit/deletion:** Commit one coherent order. If request creation wins, retain the complete snapshot; if edit wins, snapshot the complete edited item; if deletion wins, reject creation. Never combine fields from different item versions. [U-09, U-13]
43. **Reservation races with a negative adjustment:** Commit only an order that leaves Available Balance nonnegative and never lets both commands consume the same available units; reject the command that no longer has sufficient Available Balance. [U-09, U-10, U-13]
44. **Markup in family text:** Display nicknames, labels, and reasons as plain text, not executable HTML/script or a cross-family/public value; still enforce the applicable trimmed length rule. [U-11, U-14, U-25]
45. **Tampered or stale client state:** Derive family/profile authority from the authenticated principal and load Stage, daily count, challenge state, correctness, reward, item price, and balances from authoritative server state; reject client attempts to choose or alter them. Do not expose the correct answer before reveal is permitted. [U-02, U-03, U-05, U-09, U-13]
46. **Concurrent daily starts:** Atomically admit no more than three starts for the stored family-calendar day even when start requests arrive together. Whether duplicate starts resume one active Game Session or produce another allowed run remains blocked on OQ-15. [U-06]
47. **Final-challenge retry:** A timeout/retry around challenge 10 awards, completes the Game Session, writes its Session Summary, increments the Stage count, and advances Stage at most once. [U-05, U-13, U-15]
48. **Consent withdrawal races with event ingestion:** Establish one authoritative withdrawal order, stop accepting optional events after that point, and ensure an in-flight event cannot survive in active analytics storage after withdrawal processing completes. [U-14]

## 8. Safety and privacy decisions

- The MVP uses data minimization for child profiles and has no child communication, advertising, behavioral-marketing, or upload surface. [U-11, U-14]
- Parent-created labels/reasons are family-scoped untrusted text. Render them as plain text; automated moderation is deferred, but executable rendering, public sharing, and cross-family disclosure are prohibited. [U-14, U-25]
- Screen-time rewards are defined and fulfilled by parents. Mobey does not integrate with video/game providers or enforce device access. [U-02]
- Parent consent gates optional analytics but not essential product data or game access. [U-14]
- Launch jurisdiction is intentionally open, so this document does not claim COPPA, UK Children’s Code, GDPR/UK GDPR, or another regime is satisfied. Jurisdictional review is required before collecting pilot participant data. [U-16]
- Formal WCAG conformance is not an MVP commitment; that exclusion does not waive the accessible interaction requirements in REQ-UX-02, REQ-UX-03, REQ-UX-05, and REQ-UX-06 or the need for target-age usability evidence. [U-07]

## 9. Technical and delivery constraints

### Selected discovery baseline (implementation remains conditional on open questions and later evidence)

- TypeScript monorepo with:
  - `apps/web` — React + Vite SPA
  - `apps/api` — NestJS REST/JSON API
  - `packages/shared` — shared/generated contracts and cross-application types
  - `packages/content` — version-controlled challenge/theme/instruction content
  - `infra/terraform` — AWS infrastructure
  - root Docker/Compose and shared tooling as appropriate. [U-19]
- PostgreSQL is the durable store; request reservation/resolution and balance writes require transactional semantics. [U-09, U-10, U-19]
- One full-stack Docker Compose command must run web, API, and PostgreSQL locally with migrations/development data and source hot reload. [A, U-20]
- AWS baseline is static web assets on S3/CloudFront, NestJS container on ECS Fargate behind ALB, and RDS PostgreSQL. Terraform defines one non-production and one production environment. [A, U-20]
- Pull requests must block on format/lint, type-check, unit tests, API/database integration tests, critical browser end-to-end tests, Terraform validation/plan, and SonarCloud quality gate. [U-20]
- Merge deploys non-production automatically; production requires manual approval. [U-20]
- Work remains issue/branch/commit/pull-request based; no source implementation is authorized in this stage. [A]

### Technical decisions intentionally not made

- ORM/database migration library, monorepo task runner/package manager, API contract generator, and exact auth/session library. [A, U-19]
- AWS region, network topology detail, secret manager, Terraform state/locking arrangement, backup policy, observability stack, and disaster-recovery objectives. [U-20, U-22]
- Exact supported browser/version matrix, text-to-speech voice policy, and measurable accessibility/usability acceptance thresholds. [U-07]

## 10. Scope boundaries

### In Family-loop MVP

- Private allowlisted parent registration and one parent account per family. [U-11, U-16]
- Up to 10 nickname/avatar/PIN child profiles on Authorized Browsers. [U-11, U-12]
- Placement, three ordered learning stages, daily/session boundaries, scoring/hints, and all three money skills. [U-03, U-05, U-06]
- English visible text plus browser narration/replay across responsive web layouts. [U-07]
- Shared custom Reward Shop, Saving Goal, balance ledger/adjustments, and atomic request approval/rejection/cancellation. [U-08, U-09, U-10]
- Five 1:1 cosmetic Currency Skins. [U-04]
- Parent learning summary and dashboard-only pending-request visibility. [U-15]
- Optional first-party pseudonymous analytics and deletion controls. [U-14, U-26]
- Full monorepo/local/AWS/Terraform/GitHub quality baseline. [A, U-19, U-20]

### Explicitly outside Family-loop MVP

- Real-money payments, currency exchange/conversion, or authentic currency denomination teaching. [U-04, U-17]
- Virtual-item collection/inventory. [U-02, U-17]
- Device/app unlocking, blocking, timing, or usage verification. [U-02, U-17]
- Multiple caregiver logins. [U-11, U-17]
- Email verification, forgotten-password recovery, credential changes, or Google/Apple/other auth methods. [U-12, U-17]
- Languages other than English. [U-07, U-17]
- Native mobile applications. [U-07, U-17]
- Chat, social/leaderboard play, advertising, or child image uploads. [U-14, U-17]
- CMS/admin authoring product. [U-17, U-21]
- Email and push notifications. [U-15, U-17]
- Automated moderation of parent-entered labels/reasons. [U-17, U-25]
- Formal WCAG conformance. [U-07, U-17]
- Expanded public launch. [U-16]

## 11. Risks and trade-offs

| Risk/trade-off | Evidence and consequence | Required follow-up |
|---|---|---|
| Launch jurisdiction unknown | Child privacy, guardian consent, retention, disclosures, and currency presentation vary by country. [U-16] | Resolve before collecting pilot participant data, before any public availability, and before claiming compliance. |
| Unverified, unrecoverable, immutable parent credentials | Typo/squatting of an allowlisted email or password loss can permanently strand an account; parent cannot change credentials. [U-12, U-16] | Define a safe pilot support, access-removal, and deletion runbook before participant onboarding; revisit verification/recovery for later scope. |
| Currency skins may misteach real money | JPY/CNY/etc. share USD-like 1/2/5/10/20/50/100 values and switch 1:1; no explicit game-money disclosure is required. [U-04, U-25] | Test child/parent comprehension; PRD should state the educational claim narrowly. |
| Reward is more screen time | The motivating reward is media/gaming time; the learning game itself also consumes screen time. [U-02, U-06] | Parent research and safeguarding review; assess whether three-session cap is acceptable. |
| Completion is not mastery | A child advances after 10 completed sessions regardless of accuracy and stays in Change forever. [U-05] | Validate learning outcomes and watch accuracy trends; do not claim mastery without evidence. |
| TTS inconsistency | Browser voices and availability differ by platform; text fallback prevents blocking but does not make narration equivalent. [U-07] | Browser/device user testing, especially with ages 7–9. |
| No formal accessibility-conformance claim | Required accessible interaction practices do not by themselves prove target-age usability or formal conformance. [U-07] | Define browser/accessibility acceptance under OQ-10 and obtain target-age usability evidence before pilot use; revisit a formal conformance target before public launch. |
| Raw analytics retention | Raw optional events remain in active storage until withdrawal/deletion, while backup/audit propagation and timing are unresolved. [U-14, U-26] | Resolve jurisdiction, retention schedule, deletion propagation, and evidence under OQ-01/OQ-06 before enabling analytics for pilot participants. |
| Parent-entered content unmoderated | Private labels and reasons can contain inappropriate text visible to children. [U-25] | Accept for trusted pilot; define post-MVP moderation behavior before broader access. |
| No product balance cap | Long-running or adjusted balances can exceed ordinary numeric types. [U-10] | Specify an exact safe storage type and explicit overflow response. |
| Cost and scale unknown | ECS Fargate + ALB + RDS has standing cost; no expected users, peak concurrency, or ceiling is known. [U-20, U-22] | Cost model and load assumptions before architecture is locked in the technical specification. |
| Private pilot allowlist is configuration-driven | Every participant addition requires controlled configuration/deployment work; unverified email means weak ownership proof. [U-12, U-16] | Document pilot operations and access-removal procedure. |
| No explicit reward disclosure | Child may read a currency symbol as real value or interpret a request as guaranteed approval. [U-25] | Observe comprehension during pilot; revisit if confusion occurs. |

## 12. Discovery-time code and repository mismatches

This section records the repository snapshot taken during discovery; it is not a current inventory.

| Finding | Evidence | Mismatch/impact |
|---|---|---|
| No product code existed | The root inventory contained no `apps/`, `packages/`, `infra/`, tests, Docker files, or prior docs. [C-01] | Every domain term and requirement was greenfield; there was no existing implementation behavior to rely on. |
| Sonar source/test paths did not exist | `sonar-project.properties:3-4` at the snapshot. [C-02] | The discovery-time analysis could not describe a real source tree. The selected future paths mostly matched the intended monorepo but were deferred to a later implementation stage. |
| CDK contradicted Terraform | `sonar-project.properties:5` excluded `infra/cdk/**`; assignment and interview required `infra/terraform`. [A, C-02, U-19] | Sonar configuration encoded a stale infrastructure assumption. User explicitly said to retain SonarCloud and update the old file later. |
| Test patterns were JavaScript-only | `sonar-project.properties:6` included only `*.test.js` and `*.spec.js`; the selected stack was TypeScript. [C-02, U-19] | Future TypeScript tests would not have matched the snapshot’s inclusion rule. |
| Sonar test paths omitted web tests | `sonar-project.properties:4` named API/package/root tests but no `apps/web` tests. [C-02] | This conflicted with the required critical browser end-to-end test coverage. [U-20] |
| Ignore rules were greenfield-incomplete | `.gitignore` contained only `.env`, `.pi`, and `.DS_Store` at the snapshot. [C-03] | Later stack artifacts (dependencies, builds, Terraform local/state files, test output) were not addressed; the snapshot was not an approved final policy. |
| No `AGENT.md` or `AGENTS.md` existed at the snapshot | Discovery-time root inventory. [C-01] | The required conventional name for the later guidance artifact was `AGENTS.md`. [U-23] |

No source-code naming conflict could be mapped at the discovery-time snapshot because there were no domain identifiers in code. [C-01, C-02]

## 13. Open questions

- **OQ-01 — Launch jurisdiction:** Which country/region governs the pilot and later public launch? This gates privacy/legal review. [U-16]
- **OQ-02 — Success thresholds:** What accuracy improvement, return/completion behavior, and parent workflow rate constitute success? [U-18]
- **OQ-03 — Educational content curve:** What exact 0–100 amount bands, question templates, canonical duplicate identity, hint sequence, and complexity increments apply to sessions 1–10 of each Stage and to ongoing Change sessions? Are the two Change questions in Placement retained as a diagnostic signal or discarded after they cannot alter the highest-stage placement? [U-03, U-05, U-06]
- **OQ-04 — Credential defenses:** How many failed parent-password or child-PIN attempts trigger lock, for how long, and at what family/browser/network scope? What parent-session and Authorized Browser lifetimes apply, and which authenticated activity refreshes the fixed 15-minute Child Session timeout? [U-06, U-12, U-13]
- **OQ-05 — Capacity and cost:** Expected registered families, peak active sessions, data volume, AWS region, and monthly budget are unknown. [U-22]
- **OQ-06 — Legal data lifecycle:** Backup retention, deletion completion SLA, audit retention, parent data export, consent record retention, and policy/version re-consent await jurisdiction review. The deletion path when the sole parent has lost the unrecoverable password is also unresolved. [U-12, U-14, U-16, U-26]
- **OQ-07 — Ledger/idempotency retention:** The exact durable ledger/event records needed to explain balances and deduplicate saves are not specified; parent UI must not become a permanent per-answer history. [U-10, U-13, U-15]
- **OQ-08 — Initial and empty-family/catalog UX:** The interview set profile/catalog limits and invalid-input behavior but did not specify the initial Reward Balance, when the initial Currency Skin and Family Timezone are established, or the onboarding behavior before the first child or first reward item exists. [U-04, U-06, U-08, U-10, U-11]
- **OQ-09 — Analytics event contract:** Exact optional events, fields, aggregation, access control, and reporting are open, subject to strict excluded fields. [U-14, U-18]
- **OQ-10 — Browser and accessibility acceptance:** Minimum browser versions, TTS voice/language availability, keyboard/focus, zoom/reflow, contrast/non-color, touch-target, reduced-motion, responsive-layout criteria, and the target-age usability protocol are open; automation cannot establish formal conformance or child usability by itself. [U-07]
- **OQ-11 — Technical bounds:** A safe numeric storage ceiling/error response is needed despite no product balance cap. [U-10]
- **OQ-12 — Product/content and private-text details:** Final brand identity, predefined avatar set, visual art direction, exact item illustrations, and instruction script are open, as are Unicode normalization/length-counting and allowed control/newline rules for nicknames, labels, and reasons. [U-01, U-07, U-08, U-09, U-10, U-11]
- **OQ-13 — Cloud specification:** RDS sizing/HA, ECS scaling, disaster recovery, observability, secrets, Terraform state, and environment isolation remain technical-specification work. [U-20, U-22]
- **OQ-14 — Family timezone changes:** When may the parent refresh the stored timezone, and how do daily-slot accounting and active play behave if the refresh crosses a calendar-day boundary? [U-06]
- **OQ-15 — Active Game Session start behavior:** May one Child Profile have more than one active Game Session within its single Child Session? Define whether duplicate/concurrent starts resume an existing run, fail, or consume distinct daily slots; no implementation may choose implicitly. [U-06, U-13]

## 14. Recommended next steps

These are workflow handoffs recorded at discovery completion, not a current implementation plan. Verify whether each handoff has since occurred before acting on it.

1. **Produce the PRD and linked specifications** from the numbered requirements and domain model. Keep OQ-01 through OQ-15 explicit; do not silently decide them. [A]
2. **Prioritize resolution before architecture lock or affected implementation:** jurisdiction/privacy obligations, success measures, educational difficulty curve, expected scale/budget, credential/session policy, family-timezone lifecycle, and balance storage bound. [U-06, U-12, U-13, U-16, U-18, U-22]
3. **Specify the critical transactional scenarios**—challenge idempotency, balance ledger, reservation, first-action-wins resolution, and deletion—before any implementation plan. [U-09, U-10, U-13, U-26]
4. **Specify the pilot research protocol** for child comprehension, learning trend, return behavior, parent request handling, browser TTS quality, and possible confusion about currency/reward approval. [U-07, U-18, U-25]
5. **Create repository guidance later as `AGENTS.md`**, not `AGENT.md`, after product/technical documents stabilize. [A, U-23]
6. **Independently review and remediate the documentation**, including the stale Sonar assumptions, before committing it and opening the first documentation pull request. [A, C-02, U-20]
