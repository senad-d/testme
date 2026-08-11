# Product Requirements Document: Game for Learning About Money

**Status:** Product requirements record. It describes requested product behavior; it does not approve an implementation, technical architecture, catalog, economy values, or release.

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
- a prescribed technical stack, data-storage method, animal catalog, item catalog, reward values, prices, loan limit, interest policy, or release platform.

## 6. Requirements still needing product decisions

The request does not define the following. They must be decided before they are treated as fixed product behavior:

- specific chores, animals, items, rewards, prices, borrowing limit, and repayment rules;
- whether borrowing has any limits or other constraints;
- how a parent grants money and approves chores in the interface;
- the exact house-customization interactions and available themes or layouts;
- supported browser versions, hosting, persistence behavior, and offline behavior; and
- product success measures and acceptance-test thresholds.

## 7. Acceptance checklist

The product requirements are met when the delivered game demonstrates all of the following:

- an eight-year-old can use an age-appropriate fictional-money game;
- a parent can grant fictional money and approve rewards for household chores;
- the child can spend, save, borrow, and repay fictional money;
- the child can buy different fictional animals and items, retain purchases, and use purchases to customize a house;
- the game works across phone, tablet, and computer-sized devices; and
- all player-facing text and accessibility labels are Croatian, while development materials may remain English.

## 8. Source grounding

This PRD is grounded solely in the user’s stated product request and clarification that all user-facing game content—including buttons, instructions, errors, and accessibility labels—must be Croatian. It deliberately does not adopt the unvalidated technical proposal in `../specs/hrvatska-igra-o-novcu.md` as product requirements.
