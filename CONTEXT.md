# Canonical Mobey domain glossary

This glossary is a concise entry point for Mobey’s decided Family-loop MVP language. The linked discovery document remains the provenance authority, and the PRD remains the product-scope authority. The open questions cited below are unresolved; this summary does not choose an answer for them.

## Family

The MVP tenancy boundary for exactly one parent login and up to ten Child Profiles. A Family owns the parent-ordered Reward Shop shared by those profiles, its selected Currency Skin and stored timezone, and its Authorized Browsers. When initial settings are established and how empty-profile or empty-shop onboarding works remain open under `OQ-08`; timezone refresh across a calendar-day boundary remains open under `OQ-14`.

**Trace:** `U-04`, `U-06`, `U-08`, `U-11`, `U-12`; `REQ-AUTH-03`, `REQ-AUTH-06–08`, `REQ-CHILD-01`, `REQ-CUR-01`, `REQ-GAME-02`, `REQ-SHOP-01`, `REQ-SHOP-09`, `REQ-PARENT-04`; [discovery §§4–5](docs/discovery/mobey-initial-product-discovery.md#4-glossary), [PRD §§4.1–4.2 and §§6.3, 8.2](docs/product/mobey-prd.md#41-core-loop).

## Child Profile

A privacy-minimized, family-owned play identity using a family-local nickname, an app-provided avatar, and a parent-chosen PIN—not a child’s real name, email, age, birth date, or uploaded image. Progression, Reward Balance, Saving Goal, request history, and Session Summaries are associated with the profile. Confirmed deletion ends its active access and removes its associated child data; backup and deletion timing remains outside this definition under unresolved `OQ-06`.

**Trace:** `U-06`, `U-11`, `U-12`, `U-14`, `U-15`; `REQ-CHILD-01–07`; [discovery §§4–5 and §6.3](docs/discovery/mobey-initial-product-discovery.md#63-child-profiles), [PRD §§4.1–4.2 and §6.3](docs/product/mobey-prd.md#63-child-profiles).

## Child Session

Authenticated child-mode access for one Child Profile on an Authorized Browser. At most one is active for a profile; it expires after 15 minutes of inactivity or can be ended by a parent, and PIN change, browser revocation, or profile deletion invalidates affected access. Which authenticated activity refreshes the fixed timeout remains unresolved under `OQ-04`. A Child Session does not grant parent authority and is not a scored learning run: that is a Game Session. Whether one Child Session may contain more than one active Game Session, and what duplicate or concurrent Game Session starts do, remains unresolved under `OQ-15`.

**Trace:** `U-06`, `U-12`, `U-13`; `REQ-AUTH-09`, `REQ-CHILD-06–07`, `REQ-GAME-06–07`; [discovery §§4–5 and §6.5](docs/discovery/mobey-initial-product-discovery.md#65-game-sessions-and-challenge-mechanics), [PRD §§4.1–4.2 and §7.2](docs/product/mobey-prd.md#72-sessions-and-challenges).

## Placement

The concise name here for the source’s Placement Round: six unscored, one-answer questions, two for each skill. Each answer is followed by an explanation, and prerequisite results assign the starting Stage. Placement grants no Game Money and consumes no daily Game Session slot. A parent reset requires Placement again while preserving economic and history data; a reset during active play applies before the next Game Session.

**Trace:** `U-05`, `U-06`; `REQ-LEARN-01–04`, `REQ-LEARN-08–10`; [discovery §§4–5 and §6.4](docs/discovery/mobey-initial-product-discovery.md#64-placement-and-progression), [PRD §§4.1–4.2 and §7.1](docs/product/mobey-prd.md#71-placement-and-progression).

## Game Session

A scored run of exactly ten learning challenges in the Child Profile’s current Stage, targeted at about ten minutes and distinct from the authenticated Child Session that permits access. Starting one consumes one of at most three daily starts measured by the stored Family timezone; abandonment does not restore the slot, while already saved rewards survive interruption. Ten completed Game Sessions advance Exact Amounts or Affordability regardless of accuracy, and Change continues indefinitely. Challenge Practice Amounts never debit Reward Balance. Timezone-refresh effects remain unresolved under `OQ-14`, and duplicate or concurrent start behavior remains unresolved under `OQ-15`.

**Trace:** `U-02`, `U-05`, `U-06`; `REQ-LEARN-05–07`, `REQ-LEARN-10`, `REQ-GAME-01–05`, `REQ-GAME-13`; [discovery §§4–5 and §§6.4–6.5](docs/discovery/mobey-initial-product-discovery.md#64-placement-and-progression), [PRD §§4.1–4.2 and §§7.1–7.2](docs/product/mobey-prd.md#71-placement-and-progression).

## Reward Balance

A Child Profile’s persistent fictional Game Money, comprising the amount available to request or adjust and the amount reserved by a pending Voucher Request. It is distinct from a temporary Practice Amount, which exists only for a learning challenge and never spends the balance; Game Money is the fictional whole-number value held in the balance; and the Reward Shop is the Family’s shared catalog, not money or a learning Theme. Reward, reservation, resolution, and adjustment changes must be atomic and retry-safe. The exact durable ledger/idempotency records and retention remain unresolved under `OQ-07`, and the safe technical ceiling and overflow response remain unresolved under `OQ-11`.

**Trace:** `U-02`, `U-03`, `U-04`, `U-08`, `U-09`, `U-10`, `U-13`; `REQ-GAME-13`, `REQ-SHOP-01`, `REQ-BAL-01–05`; [discovery §§4–5, §6.7, and §6.10](docs/discovery/mobey-initial-product-discovery.md#610-balance-and-parent-adjustments), [PRD §§4.1–4.2 and §8.4](docs/product/mobey-prd.md#84-balance-management).

## Saving Goal

A Child Profile’s optional selection of zero or one active Reward Shop item for showing progress toward that item’s current price. Selecting another item replaces the goal; edits update its displayed duration and price, and deletion clears it. A Saving Goal does not determine request eligibility: the child may request any affordable active item, whether or not it is the goal.

**Trace:** `U-08`, `U-09`; `REQ-SHOP-06–08`; [discovery §§4–5 and §6.8](docs/discovery/mobey-initial-product-discovery.md#68-reward-shop-and-saving-goals), [PRD §§4.1–4.2 and §8.2](docs/product/mobey-prd.md#82-reward-shop-and-saving-goal).

## Voucher Request

A child’s request to exchange fictional Game Money for an affordable active Reward Shop item. A Child Profile may have at most one pending request; creation reserves the authoritative current price and snapshots the item’s label, duration, and price. Pending requests do not expire. Child cancellation or parent rejection refunds the reservation; parent approval spends it and immediately completes the voucher, with the first terminal action winning exactly once. Completion records the parent’s decision—not later screen-time use: the parent fulfils approved screen time outside Mobey, which performs no payment or device/app control. Pending requests are surfaced to the parent only in the dashboard.

**Trace:** `U-02`, `U-04`, `U-09`, `U-13`, `U-15`; `REQ-PROD-03`, `REQ-CUR-04`, `REQ-REQ-01–10`; [discovery §§4–5 and §6.9](docs/discovery/mobey-initial-product-discovery.md#69-voucher-requests), [PRD §§4.1–4.2 and §8.3](docs/product/mobey-prd.md#83-voucher-requests).
