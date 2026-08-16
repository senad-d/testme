# Slice 1 safe-family-game implementation contract

Status: adopted implementation contract for Discovery Slice 1

## Purpose and sources

This contract defines the first dependency-free product slice: one Parent establishes one Parent Account and one Child Account, then the Child Player can return to a protected Closed Play Experience across supported devices.

The normative product inputs are:

- [Discovery Slice 1](../discovery/children-money-learning-game.md#slice-1--establish-one-safe-family-game), including acceptance signals P1–P5 below.
- [GitHub issue #1](https://github.com/senad-d/testme/issues/1), with the repository snapshot at [`issues/1-ship-v0-1-mvp.json`](../../issues/1-ship-v0-1-mvp.json).
- [ADR-0002](../adr/0002-deploy-static-web-and-container-api-on-aws.md), which selects Cognito for Parent identity, an API-owned opaque session, a static web client, a versioned same-origin API, and PostgreSQL persistence.
- [`CONTEXT.md`](../../CONTEXT.md), whose domain terms are used throughout this contract.

The source acceptance signals are:

| ID | Discovery Slice 1 acceptance signal |
| --- | --- |
| P1 | The Parent can establish one Parent Account and one Child Account with a parent-chosen display name and child PIN. |
| P2 | On a new supported device, the Parent must authenticate before the Child Account can be opened. |
| P3 | After Parent authentication, the child can use their PIN to resume saved progress and Learning Rewards. |
| P4 | The child cannot enter or alter the Parent Area. |
| P5 | The child-facing identity does not request the child's real name, location, or photo. |

## Scope and adopted defaults

The following defaults close implementation questions for Slice 1 without claiming to resolve release-policy questions:

1. Cognito verifies, enrolls, and recovers the Parent credential. When `PARENT_SELF_ENROLLMENT_ENABLED=true`, a first-time Parent uses Cognito User Pool self-service sign-up and Cognito-owned contact verification through the managed sign-up page. The application never accepts, verifies, stores, or recovers that credential and persists only the verified Cognito subject as the Parent's external identity. Disabled, unconfirmed, rejected, or administratively disabled enrollment cannot create an application Parent Account.
2. The Child Account has one Parent-chosen display name and a six-digit numeric PIN. The PIN is persisted only as a slow salted one-way hash suitable for password/PIN verification; plaintext, reversible encryption, logs, analytics, and response payloads are prohibited.
3. A successful child unlock rotates the active opaque application session into child scope. It does not retain Parent authority.
4. `PARENT_REAUTH_MAX_AGE_SECONDS` defaults to `300`. Entering the Parent Area and resetting or changing the child PIN require a new Cognito authorization request with `prompt=login` and `max_age=300`, followed by server verification that the returned `auth_time` is within the configured maximum. An existing application session, an IdP SSO session, or route visibility is not authorization.
5. PIN recovery means freshly Parent-authenticated reset/change only. It never reveals the previous PIN or verifier. Success replaces the verifier, revokes all child-scoped sessions for the Child Account, and clears the Child Account throttle record plus every Child Account/source association for that Child Account in the same database transaction. It never clears the separately scoped global source-spray record.
6. Local and test environments use fictional data only.

This slice does not add Lesson content, multiple Child Accounts, payments or real money, advertising, chat, social sharing, external child-facing links, leaderboards, daily-streak pressure, or Parent- or child-authored content.

## Traceability ledger

| Specification | Product signal | API obligation | UI obligation | Persistence obligation | Automated evidence obligation |
| --- | --- | --- | --- | --- | --- |
| S1.1 One family relationship | P1 | A server-owned enrollment flow can create or retrieve a Parent Account from a verified Cognito subject. Child provisioning uses explicit retrieval plus an idempotency key for creation and rejects a second Child Account. Inputs are only `displayName`, `pin`, and `pinConfirmation`; confirmation is never persisted. | Before setup, the browser offers Cognito-managed Parent enrollment as well as sign-in. Only Parent scope renders setup. The form calls the versioned API and labels the value as a display name, not a real name. | A unique Parent Cognito subject and a unique Child-to-Parent relationship enforce exactly one Child Account. A durable provisioning-idempotency record contains no PIN or display name. Only the PIN hash is stored. | Prove enabled enrollment from no identity, explicit disabled/unapproved enrollment failure, verified-subject Parent creation, deterministic create replay, explicit retrieval, second-child rejection at API and database boundaries, six-digit validation, and absence of credentials or plaintext PIN storage. |
| S1.2 Parent-gated child access | P2 | A server-owned Cognito authorization-code/PKCE flow creates Parent scope after sign-in or completed enrollment. Child unlock requires that scope plus a valid PIN, then rotates into child scope. | On a new device, the browser offers Parent enrollment or sign-in before PIN entry. It never receives Parent credentials, Cognito tokens, or PKCE material. | Single-use authorization transactions and expiring opaque sessions are server-side records. | Prove required ordering, invalid/replayed authorization denial, invalid PIN denial, and opaque session rotation. |
| S1.3 Resumable child state | P3 | Child scope may read only its Child Account's display name, generic progress, and Learning Rewards. | After unlock, render only the returned child state. A second browser context follows S1.2 before showing the same saved state. | Progress and Learning Rewards belong to an opaque Child Account identifier and survive application-session expiry. | Prove cross-context resume and denial before Parent authentication plus PIN verification. |
| S1.4 Parent Area separation | P4 | Parent Area and PIN reset/change require fresh Parent scope. A CSRF-protected command consumes the Parent Area fresh grant idempotently before a read-only Parent Area `GET`. Child scope receives a generic `403` and no Parent data or mutation capability. | Child routes contain no Parent Area or PIN recovery control. Parent entry starts a fresh Cognito request rather than trusting the route or SSO session. | Session role, Parent Area authority, and freshness are persisted server-side; successful PIN reset/change revokes child sessions atomically. | Prove child-to-Parent denial, stale/missing `auth_time` denial, forced login parameters, cross-site/speculative GET safety, lost-response command retry, CSRF denial, and child-session revocation after reset/change. |
| S1.5 Child-data minimization | P5 | Payload schemas contain no child real-name, location, or photo field; unknown fields are rejected. | Child-facing and setup interfaces never request those fields and preserve the Closed Play Experience. | No schema column exists for child real name, location, or photo. | Assert request rejection, response/schema absence, forbidden UI-surface absence, and non-sensitive logs/fixtures. |
| G1 Production child-data policy gate | P1–P5, Discovery open questions | Production startup and all child-data routes fail closed until the gate described below is satisfied. | No UI state may present an unresolved production environment as ready to collect child data. | Production migrations or data use are not authorization to collect child data. | Prove production startup rejects every missing gate reference and local/test fixtures are fictional. |

## API contract

All JSON routes are under same-origin `/api/v1`. JSON request bodies reject unknown fields. Errors use the common shape below, include a request correlation ID, and never disclose whether a Parent Account, Child Account, PIN, throttle key, authorization transaction, or Cognito subject exists.

```json
{
  "error": {
    "code": "REQUEST_DENIED",
    "message": "The request could not be completed.",
    "correlationId": "opaque-request-id"
  }
}
```

Authentication routes use browser navigation and secure cookies; Cognito codes, tokens, state, nonce, and the PKCE verifier never appear in application JSON or browser storage.

| Route | Request | Required authority | Success contract | Denial notes |
| --- | --- | --- | --- | --- |
| `GET /api/v1/parent-auth/enroll?intent=child-access` | Navigation only; the only allowed intent is `child-access`. | None | When `PARENT_SELF_ENROLLMENT_ENABLED=true`, creates the same short-lived authorization transaction used for sign-in and redirects to the configured Cognito managed sign-up endpoint. Cognito owns credential entry, confirmation, and recovery. | When enrollment is disabled, return `403` with code `PARENT_ENROLLMENT_UNAVAILABLE` and the common generic message. Cognito keeps an unconfirmed identity on its managed confirmation flow and issues no callback code. Rejected or administratively disabled enrollment is shown by the managed page or, when Cognito returns an authorization error, mapped by the callback to `403`, code `PARENT_ENROLLMENT_DENIED`, and the common generic message. No denial creates a Parent Account. |
| `GET /api/v1/parent-auth/login?intent=child-access` | Navigation only; return intent is selected from a server allowlist. | None | Creates a short-lived, single-use authorization transaction and redirects to Cognito managed sign-in. | Reject unknown intent/return location. |
| `GET /api/v1/parent-auth/login?intent=parent-area` | Navigation only. | Any current application session may be replaced. | Starts a new Cognito request with `prompt=login` and configured `max_age`. | Existing IdP SSO state cannot complete this intent without fresh credentials and acceptable `auth_time`. |
| `GET /api/v1/parent-auth/login?intent=pin-change` | Navigation only. | Any current application session may be replaced. | Same fresh-authentication contract as `parent-area`. | Same as above. |
| `GET /api/v1/parent-auth/callback` | Exact registered callback; Cognito `code` and `state`, or a Cognito authorization error and matching `state`. | Matching opaque transaction cookie and unconsumed server record. | For a code response, atomically consumes the transaction/code; validates the identity response; creates or retrieves exactly one application Parent Account by verified Cognito subject; rotates the transaction cookie away; and creates the appropriate opaque Parent session. Cognito is configured not to issue the code until self-sign-up confirmation is complete and not to authenticate disabled identities. Parent Account creation and session creation are one transaction. | Missing, expired, mismatched, replayed, unconfirmed, rejected, or disabled transaction/code/state/nonce/verifier/identity—or a Cognito authorization error—fails generically and clears the transaction cookie. It cannot create a Parent Account or application session. |
| `POST /api/v1/parent-auth/logout` | CSRF token. | Active application session. | Revokes the application session, clears cookies and authorization transaction state, then redirects only to the configured Cognito logout URL. | Invalid origin or CSRF token is rejected. |
| `GET /api/v1/session` | No body. | None | Returns exactly one discriminated view: `{"role":"none"}`, `{"role":"parent","fresh":boolean,"intent":"one allowed intent","csrfToken":"opaque-token"}`, or `{"role":"child","childAccountId":"opaque-id","csrfToken":"opaque-token"}`. | It returns no Cognito subject/token, PIN material, or Parent Area data. The CSRF token is held in memory by the client and bound to the opaque server session. |
| `GET /api/v1/parent-account/child-account` | No body. | Parent scope. | `200` returns `{"childAccountId":"opaque-id","displayName":"fictional display name"}` for this Parent Account's existing Child Account. | When none exists, return the common generic `404`; no PIN field is returned. |
| `POST /api/v1/parent-account/child-account` | Header `Idempotency-Key: <unpredictable opaque value>` plus `{"displayName":"fictional display name","pin":"123456","pinConfirmation":"123456"}`. | Parent scope; same-origin CSRF token. | The first valid key creates exactly one Child Account and returns `200` with `{"childAccountId":"opaque-id","displayName":"fictional display name"}`. Repeating the same key and the same canonical normalized validated input after any outcome returns that original unchanged account and status. | A reused key with different normalized input, or a new key after a Child Account exists, returns `409`, code `PROVISIONING_CONFLICT`, and the common generic message. Mismatched/non-six-digit PIN or unknown fields is rejected. No PIN field is returned. |
| `POST /api/v1/child-access/unlock` | `{"pin":"123456"}` | Parent scope established on this device; same-origin CSRF token. | Verifies the PIN, clears only the success state specified under throttling, rotates the session to child scope, and returns `{"role":"child"}`. | Invalid and throttled attempts both return `403`, code `CHILD_ACCESS_DENIED`, message `Child access could not be unlocked.`, and the common error shape. |
| `GET /api/v1/child-state` | No body. | Child scope. | `{"childAccountId":"opaque-id","displayName":"fictional display name","progress":[],"learningRewards":[]}`. Progress and reward elements use shared versioned types added by the implementation task that owns them. | No Parent Account, Parent Area, Cognito, PIN, or prohibited child-data field is returned. |
| `POST /api/v1/child-access/exit` | CSRF token. | Child scope. | Revokes the child session, clears its cookie, and returns `204`. The next access is unauthenticated. | The prior session identifier cannot be reused. |
| `PUT /api/v1/parent-account/child-account/pin` | `{"pin":"654321","pinConfirmation":"654321"}` | Fresh Parent scope whose intent is `pin-change`; same-origin CSRF token. | Atomically replaces the PIN hash, revokes every child session for the Child Account, clears the Child Account record and every Child Account/source association, consumes the fresh authorization, and returns `204`. Global source-spray records are unchanged. | It never accepts or returns the previous PIN/verifier. A stale, wrong-intent, or already-consumed fresh authorization is rejected. A still-active global source-spray lock remains effective after reset. |
| `POST /api/v1/parent-area/enter` | CSRF token; no body. | Fresh Parent scope whose intent is `parent-area`, or the same session already holding Parent Area authority after this command. | Atomically consumes an unconsumed fresh grant and marks the same opaque session as holding Parent Area authority, then returns `204`. A retry from that already-authorized session after a lost response returns the same `204` without another transition. | Invalid Origin/CSRF, child, ordinary Parent, stale, or wrong-intent authority receives `403` and no Parent data. |
| `GET /api/v1/parent-area` | No body. | Parent session holding Parent Area authority. | Read-only and idempotent; returns only the minimal Slice 1 Parent Area view and does not change session or authorization state. | Child, ordinary Parent, fresh-but-not-entered, stale, wrong-intent, and route-only access receive `403` and no Parent data. Cross-site navigation, prefetch, repetition, or a lost response cannot consume authority. |

Child Account provisioning may hash a matching `pin` only after validating `pinConfirmation`; neither value may be retained after the request. The PIN is exactly six ASCII digits (`^[0-9]{6}$`). The display name is trimmed, contains 1–30 Unicode grapheme clusters, and is rendered only as text; UI and API enforce the same versioned shared schema. These limits do not turn the display name into a real-name field.

For provisioning, the API validates the `Idempotency-Key` format and request schema before opening one database transaction. It stores only a server-HMAC of the key, a server-HMAC fingerprint of the canonical normalized validated input, the Child Account identifier, and the original status. A replay reconstructs the response from that unchanged Child Account. The idempotency record never stores the key, display name, PIN, confirmation, canonical request, or response body. The transaction locks the Parent Account, checks an existing key first, and then inserts the Child Account under the unique Parent relationship. Thus the same key and fingerprint is a retry, the same key with a different fingerprint is a conflict, and any new key after the relationship exists is an explicit second-child conflict. A database uniqueness race is mapped to the same documented `409`.

## Authorization-code/PKCE and fresh Parent authentication

The API/BFF owns the complete Cognito choreography:

1. Enrollment start first checks the server-side `PARENT_SELF_ENROLLMENT_ENABLED` flag. If enabled, it creates an authorization transaction and navigates to the configured Cognito managed sign-up endpoint; the user-pool app client has self-service sign-up enabled and requires Cognito-owned contact confirmation before issuing an authorization code. The application UI/API never accepts a Parent credential or confirmation code. If the flag is disabled, the API fails explicitly as specified in the API table. If the Cognito app client rejects sign-up, its managed page or authorization-error callback presents the failure and the application still creates no state.
2. Enrollment and login start create unpredictable `state` and `nonce`, an S256 PKCE verifier/challenge, a server-allowlisted local return intent, creation/expiry times, and the requested freshness mode. The browser receives only an opaque HttpOnly transaction cookie and the Cognito redirect. The transaction records whether its start mode was enrollment or login.
3. The exact callback URL is configured; caller-provided redirect URLs are not accepted. The callback atomically consumes the persisted transaction before creating an account or session.
4. The server exchanges the one-time code with the stored verifier. It validates ID-token signature using the configured JWKS, issuer, audience, expiry, nonce, and `auth_time`. Cognito pool configuration permits a code only after confirmation and prevents disabled identities from authenticating. The application then uses only the verified subject to transactionally create-or-retrieve one Parent Account and create the Parent application session. A failed or unapproved enrollment leaves neither record.
5. Parent Area and PIN-change intents include `prompt=login` and `max_age=PARENT_REAUTH_MAX_AGE_SECONDS`. Their callbacks additionally require `now - auth_time <= PARENT_REAUTH_MAX_AGE_SECONDS`; missing or future/invalid `auth_time` fails closed.
6. Cognito access, refresh, and ID tokens are not returned to the browser, placed in cookies, or persisted as application-session authority. Enrollment, confirmation, and credential recovery stay entirely with Cognito.
7. Identity-changing transitions rotate the opaque identifier. The prior transaction/session identifier is revoked and unusable. The CSRF-protected Parent Area entry command is the deliberate exception: it retains the callback-created session identifier while atomically consuming freshness and adding Parent Area authority so a lost command response is safely retryable.

Unsafe same-origin API requests require both an allowed configured `Origin` and a per-session CSRF token. Cookies are HttpOnly, SameSite, and Secure outside local development. CORS does not grant cross-origin credentialed access.

## Application session state machine

The only active roles are `none`, `parent`, and `child`.

```text
none
  -> parent(child-access)       verified Cognito login or completed-enrollment callback; create-or-retrieve Parent Account
  -> parent(fresh,parent-area)  verified prompt=login callback + fresh auth_time
  -> parent(fresh,pin-change)   verified prompt=login callback + fresh auth_time

parent(child-access)
  -> child                      successful, non-throttled PIN verification; rotate
  -> none                       logout/expiry/revocation

parent(fresh,parent-area)
  -> parent(parent-area)        CSRF-protected entry command; consume freshness atomically without identifier rotation
  -> none                       logout/expiry/revocation

parent(parent-area)
  -> parent(parent-area)        read-only Parent Area GET or idempotent entry-command retry
  -> none                       logout/expiry/revocation

parent(fresh,pin-change)
  -> parent(non-fresh)          successful PIN replacement; consume freshness
  -> none                       logout/expiry/revocation

child
  -> none                       child exit/logout/expiry/revocation
```

A session contains an opaque identifier, role, Parent Account identifier, optional Child Account identifier, creation/expiry/revocation times, CSRF binding, and—only for a Parent session—the verified `auth_time`, intent, whether its fresh grant is unconsumed, and whether Parent Area authority is active. Parent Area authority can become active only through the entry command and expires with that session. A child session cannot represent Parent Area capabilities. The browser cookie contains only opaque session material.

## Child PIN and shared throttle contract

`PIN_MAX_FAILURES` defaults to `5`, `PIN_WINDOW_SECONDS` to `900`, and `PIN_LOCK_BASE_SECONDS` to `900`. Production configuration may strengthen but must not silently weaken these values.

For every unlock attempt, the API derives and names three server-side keys: the opaque Child Account identifier; a Child Account/source association made from that identifier plus an HMAC of the normalized request-source value; and a separately scoped global source-spray key made from that source HMAC alone. A source is accepted only from configured trusted-proxy metadata; otherwise the connection source is used. Raw source addresses are not persisted. The HMAC secret is server-only and versioned for controlled rotation.

The API performs one PostgreSQL transaction that locks and evaluates all three throttle records before PIN verification:

- A non-expired lock on the Child Account, its current Child Account/source association, or the global source-spray key denies the attempt without verifying the PIN.
- A failed verification increments all three records in the current window atomically. The fifth failure on any record creates at least a 900-second lock. The global record therefore limits one source spraying attempts across different Child Accounts.
- Reaching the limit again after a prior lock uses an increasing server-configured backoff; it may never be shorter than `PIN_LOCK_BASE_SECONDS`.
- A window with no active lock expires after `PIN_WINDOW_SECONDS`; the next failure begins a new window.
- A successful unlock clears the Child Account record and its current Child Account/source association in the same transaction before session rotation. It never clears the global source-spray record or another Child Account's association.
- A freshly Parent-authenticated PIN reset/change clears the Child Account record and every Child Account/source association for that Child Account in the same transaction as verifier replacement and child-session revocation. It never clears a global source-spray record, because that record protects other accounts.
- Consequently, reset makes the Child Account immediately eligible from a source with no global lock. A source with an active global spray lock remains denied until that lock expires; another source may proceed. This behavior is deterministic and reset of one Child Account cannot weaken throttle state protecting another.

Invalid and throttled attempts have indistinguishable public status, body, timing policy, and logging sensitivity. Child Account/association/global-source state, PIN digits, hash material, and whether verification ran are not disclosed.

## Persisted-state contract

PostgreSQL is authoritative for all cross-device and multi-instance state. Opaque identifiers, timestamps, and foreign-key/unique constraints—not browser state—link records.

| Record | Required state and constraints |
| --- | --- |
| Parent Account | Opaque ID; unique verified Cognito subject; timestamps. No Parent credential or Cognito token. |
| Child Account | Opaque ID; unique Parent Account foreign key; parent-chosen display name; slow salted PIN hash; timestamps. No real name, location, or photo. |
| Authorization transaction | Opaque cookie lookup value/hash; enrollment-or-login start mode; state, nonce, PKCE verifier, exact intent/callback data, timestamps, expiry, and atomic consumed marker. Single use across instances/restarts. |
| Application session | Opaque cookie lookup value/hash; Parent Account ID; optional Child Account ID; exactly one role; CSRF binding; Parent intent/freshness/Parent-Area-authority metadata where applicable; expiry/revocation timestamps. |
| Child progress | Opaque Child Account ID; versioned generic progress identifier/state; timestamps. No Lesson content is introduced by this slice. |
| Learning Reward | Opaque Child Account ID; versioned reward identifier/state; timestamps; no real-world value. |
| Provisioning idempotency | Parent Account ID; server-HMAC of idempotency key; server-HMAC request fingerprint; Child Account ID; original status; timestamps. Unique by Parent Account and key HMAC. No raw key, request/response body, display name, PIN, or confirmation. |
| PIN throttle | Exactly one named scope: Child Account key, Child Account/source association, or global source-spray key; window start; failure count; lock expiry; repeated-lock/backoff state; timestamps. Association records carry a Child Account foreign key; global records do not. Updated with row locks/serializable equivalent. |

The verified callback's create-or-retrieve Parent Account and Parent session operation is transactional. Child Account creation and its idempotency receipt are a separate transaction after setup input, with database constraints—not a read-then-write convention—rejecting a second Child Account. Authorization consumption, Parent Area entry, PIN attempt updates, PIN replacement/session revocation/precisely scoped throttle clearing, and successful unlock/session rotation are atomic operations that remain correct across API instances and restarts.

Responses and operational logs use correlation IDs but omit Parent credentials, Cognito tokens/codes, authorization state/nonce/verifier, cookies, CSRF tokens, idempotency keys/fingerprints, PINs/hashes, source values/HMACs, child display names, and saved state.

## G1 — production child-data policy gate

Consent, applicable privacy jurisdiction, retention, and deletion remain unresolved product/legal inputs. They are not Cognito features, and successful Parent identity verification does not constitute consent or define lifecycle rules.

Therefore the safe default is mandatory:

- No production child data may be collected.
- No production deployment may be applied.
- Production API startup and child-data routes must fail closed.

The gate remains closed until all four inputs are recorded in one referenced, versioned policy artifact and corresponding consent, retention, and deletion lifecycle controls are specified and supplied as explicit production configuration references. A non-empty reference alone is not proof of legal or release approval; independent release review remains required. The policy artifact is deliberately not invented by this implementation contract.

Local and test environments may operate only with conspicuously fictional Parent/Child fixtures and dedicated non-production Cognito configuration. They must not be presented as satisfying G1.

## Unresolved release inputs

The following remain explicit release inputs and are not asserted here:

- supported browser/device baseline and offline support;
- applicable privacy jurisdiction and consent rule;
- retention period;
- deletion timing, scope, and recovery behavior;
- production AWS region and data residency;
- any Parent-only external help-link policy.

No implementation may claim browser support or choose a production AWS region/data residency until those inputs are recorded by their owning decision process.

## Alternatives considered and rejected for this slice

| Alternative | Reason not selected |
| --- | --- |
| Application-managed Parent credentials | Cognito is the Parent identity provider selected by ADR-0002; duplicating credentials expands sensitive storage and recovery scope. |
| Invitation-only or application/admin-provisioned first Parent identity | Cognito User Pool self-service sign-up with Cognito-owned verification is the adopted first-Parent enrollment path. Invitation or pre-provisioning would make P1 depend on an undefined operator workflow. |
| IdP SSO re-entry as fresh Parent authorization | An existing SSO session could silently restore Parent authority. `prompt=login`, `max_age`, and verified recent `auth_time` are required instead. |
| A child PIN rule other than six numeric digits | Six digits is the adopted Slice 1 implementation default; changing it requires an explicit contract revision and corresponding usability/security evidence. |
| No PIN recovery | It would strand the single Child Account. Freshly Parent-authenticated replacement provides recovery without disclosing the prior PIN. |
| Production enabled only by configuration/environment name | Configuration alone cannot resolve consent, jurisdiction, retention, or deletion. G1 requires a versioned policy artifact and specified controls before any production apply or child-data use. |

## Closed Play Experience invariant

Every child-scoped API response and UI state remains inside the Closed Play Experience. It contains no real-money purchase or balance, advertising, chat, social sharing, external link, leaderboard, daily-streak pressure, real name, location, or photo. Practice Money and Learning Rewards have no real-world value. This contract adds no multi-child, teacher/classroom, social, payment, real-bank, real-money, currency-exchange, or Lesson-authoring behavior.
