# Product Requirements Document: Game for Learning About Money

**Status:** Approved first-release product contract. The original requirements below remain authoritative; the selected installable PWA target, repeatable loop, persistence, catalog, evidence, and release values are fixed in `../specs/repeatable-browser-game.md`.

## 1. Product summary

Create an age-appropriate game that helps an eight-year-old child practise basic decisions about fictional money. A parent can give the child fictional money and approve rewards for completed household chores. The child can spend, save, borrow, and repay fictional money; buy animals and items in a fictional pet store; and keep purchased animals and items in a customizable house.

The game must be usable on common device types. Development materials may be in English, but every player-facing part of the game must be in Croatian.

## 2. Users and roles

### Child player

The primary user is an eight-year-old child. The experience must use age-appropriate game interactions and explain that the money, loans, purchases, animals, and house are fictional.

The child must be able to:

- view their fictional-money situation;
- choose to spend, save, borrow, and repay fictional money;
- view and mark household chores as completed;
- browse and buy fictional animals and other available items;
- view owned animals and items; and
- customize a house with purchased animals and items.

### Parent

The parent supplies the child’s fictional money and confirms chore-based rewards. The requested parent role is for granting and approving game actions; no requirement establishes it as an authenticated or secure account.

## 3. Functional requirements

### FR-1 — Fictional money

- The game must use fictional money only.
- A parent must be able to give the child a specified amount of fictional money.
- The child must be able to spend fictional money, move it into savings, borrow more fictional money, and repay borrowed fictional money.
- The game must communicate the child’s available money, savings, and borrowed amount in an understandable way.
- The product must not represent game actions as real financial products, payments, or real money.

### FR-2 — Chores and earnings

- The game must present household chores that the child can complete.
- Completing a chore must support earning fictional money.
- A parent must be able to approve the chore-based reward before it is granted.

### FR-3 — Pet store and ownership

- The game must provide a fictional pet store with different animals available for purchase with fictional money.
- The child must be able to purchase and keep animals.
- The game must provide items that can be purchased for animals and for the house.
- The child must be able to view owned animals and purchased items.

### FR-4 — Customizable house

- The game must include a house associated with the child’s purchased animals.
- The child must be able to customize the house using purchased items and animals.

### FR-5 — Cross-device experience

- The game must be designed to run on common device types, including phone, tablet, and computer-sized screens.
- This requirement concerns usability across device types. Shared profiles, synchronization, accounts, and transfer of game data between devices are not requested requirements.

### FR-6 — Croatian player-facing experience

Every player-facing game element must be in Croatian, including:

- buttons and navigation;
- instructions and explanatory text;
- labels, prompts, validation feedback, confirmations, and errors;
- game content such as chores, animal and item names, and money-related explanations; and
- accessibility labels and other text intended for assistive technologies.

Development source code, engineering documentation, tests, comments, and other non-rendered development materials may be in English.

## 4. Experience requirements

- The experience must be appropriate for an eight-year-old child.
- Money choices and their outcomes must be understandable without presenting real-world financial risk as part of the game.
- The child-facing experience must support clear reading and interaction across the required device types.
- Croatian accessibility text is part of the player-facing language requirement, not optional translated supplementary content.

## 5. Scope boundaries

The following are not requested and must not be assumed to be part of this product:

- real money, payments, banking products, or real debt;
- user accounts, authentication, or a secure parent-control system;
- cloud storage, device-to-device synchronization, or shared profiles;
- social features, advertising, analytics, or external purchases; and
- any release platform, catalog, economy, or persistence behavior other than the bounded first-release selections approved below.

## 6. Approved first-release decisions

The product owner selects the lowest-disruption release branch defined in `../specs/repeatable-browser-game.md`:

- an installable, offline-capable static PWA for one browser-local child profile, with Croatian player-facing content and fictional zlatnici;
- the existing interest-free 100-zlatnik debt limit and existing money, approval, store, adventure, and house rules;
- a repeatable owned-pet loop with one daily care quest, three deterministic care actions, bounded daily need changes, XP levels capped at 10, cosmetic milestones, no pet loss, and no zlatnik quest rewards;
- one strict, independently recoverable `croatian-money-pet-game:progression:v1` record whose stable care-event IDs atomically commit care, quest evidence/completion, and XP/cosmetic reward without mutating the three legacy records;
- local six-digit guardian enrollment as browser-local deterrence only, with session-only unlock and disclosed consented destructive-reset recovery;
- exactly four additional chores, four pets, six items, and three care-only daily quests in the first bundled content release, with all IDs, Croatian copy, associations, prices, and rewards fixed by the specification;
- phone, tablet, and desktop evidence at 320 × 568, 768 × 1024, and 1440 × 900 CSS px, plus current/previous stable Chromium, Firefox, and Safari gameplay targets subject to the installability limits recorded in the specification; and
- a 5–8 minute target session and a consented, non-identifying moderated release test with at least five child/parent pairs and explicit 4-of-5 child and parent success thresholds.

This approval preserves the exclusions for real money, payments, accounts, advertising, analytics, social features, external purchases, cloud synchronization, remote parent authentication, and cross-device protection. Selecting a native or any non-PWA platform stops dependent implementation Tasks 2–9 and requires a separately reviewed replacement plan rather than treating those tasks as no-ops.

## 7. Acceptance checklist

The product requirements are met when the delivered game demonstrates all of the following:

- an eight-year-old can use an age-appropriate fictional-money game;
- a parent can grant fictional money and approve rewards for household chores;
- the child can spend, save, borrow, and repay fictional money;
- the child can buy different fictional animals and items, retain purchases, and use purchases to customize a house;
- the game works across phone, tablet, and computer-sized devices; and
- all player-facing text and accessibility labels are Croatian, while development materials may remain English.

## 8. Source grounding

The original requirements are grounded in the user’s stated product request and clarification that all user-facing game content—including buttons, instructions, errors, and accessibility labels—must be Croatian. The approved first-release decisions use the user-authorized existing task bundle and are fully enumerated in `../specs/repeatable-browser-game.md`; they do not adopt the earlier unvalidated technical proposal in `../specs/hrvatska-igra-o-novcu.md`.
