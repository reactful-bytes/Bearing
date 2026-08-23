# M16 Authenticated AI Usage Credits Engineering Tickets

## Scope

Keep the shared Firebase JavaScript SDK on Android, iOS, and web. Remove the unusable App Check requirement, retain Firebase Auth as the authoritative caller identity, ensure every privileged operation targets only `request.auth.uid`, and enforce a server-owned rolling AI-credit balance.

## Approved Product Contract

- New or existing active Premium users receive 10 initial credits with no historical backfill.
- Active subscribers receive 10 more credits on each paid billing anniversary.
- Credits never expire and have no balance cap.
- Active and grace-period users may spend retained credits.
- Grace-period, expired, and canceled accounts receive no new credits.
- Expired and canceled balances remain stored but locked until Premium access resumes.
- Only a schema-valid Gemini draft consumes one credit; provider and validation failures refund it.
- One user may have only one active generation reservation.
- No callable accepts a client-selected authoritative UID.
- Account deletion continues to require recent Firebase reauthentication.
- Native and web use the same callable names, region, request shape, and quota policy.

## Architecture Boundaries

1. Firebase Auth is the caller identity boundary for callable Functions.
2. Handlers derive all user IDs from `request.auth.uid`; request payload user IDs are never authoritative.
3. `aiCreditAccounts`, `aiCreditGrants`, and temporary `aiPlans` are server-owned.
4. RevenueCat subscription records determine Premium eligibility and paid billing periods.
5. Firestore transactions own grants, reservations, finalization, refunds, and retry idempotency.
6. The existing Firebase JavaScript Auth and Functions adapters remain shared by native and web.
7. App Check is deferred to M17 and is not partially enforced during M16.

## Execution Order

M16.1 -> M16.2 -> M16.3 -> M16.4 -> M16.5. M16.6 and M16.7 may proceed after M16.3. M16.8 depends on M16.4-M16.5. M16.9 follows all implementation work.

## M16.1 Authenticated Callable Boundary

| Ticket | Status    | Deliverable                                                | Acceptance                                                                               |
| ------ | --------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| M16.1a | completed | Replace the App Check caller guard with an Auth-only guard | Missing Auth is rejected and the guard returns only `request.auth.uid`                   |
| M16.1b | completed | Remove callable App Check enforcement                      | Protected callables omit `enforceAppCheck`; RevenueCat webhook verification is unchanged |
| M16.1c | completed | Migrate protected handlers to Auth identity                | Status, telemetry, entitlement, AI, export, and deletion use only the authenticated UID  |
| M16.1d | completed | Prove caller ownership and unauthenticated rejection       | Tests show forged payload UIDs are ignored and unauthenticated calls fail                |

## M16.2 Credit Contract and Billing Arithmetic

| Ticket | Status    | Deliverable                                                 | Acceptance                                                                   |
| ------ | --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| M16.2a | completed | Define credit account, grant, reservation, and status types | Fields, integer invariants, states, constants, and responses are explicit    |
| M16.2b | completed | Implement UTC billing anniversaries                         | Anniversaries preserve the purchase day and clamp to month end               |
| M16.2c | completed | Compute due paid-period anniversaries                       | Only dates after the last grant and before `now`/period end are returned     |
| M16.2d | completed | Cover billing arithmetic                                    | Tests cover days 1 and 28-31, leap years, annual catch-up, and invalid dates |

## M16.3 Atomic Credit Reconciliation

| Ticket | Status    | Deliverable                               | Acceptance                                                                                    |
| ------ | --------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| M16.3a | completed | Add the Firestore credit repository       | Transactions preserve non-negative integer totals in `aiCreditAccounts/{uid}`                 |
| M16.3b | completed | Bootstrap active accounts                 | A missing active account receives exactly 10 credits without historical backfill              |
| M16.3c | completed | Reconcile active anniversaries            | Each due anniversary adds exactly 10 and advances the cursor atomically                       |
| M16.3d | completed | Add deterministic grant receipts          | Repeated and concurrent reconciliation cannot double-grant                                    |
| M16.3e | completed | Enforce inactive and grace accrual policy | Non-active states receive no grants and retain their balances                                 |
| M16.3f | completed | Cover reconciliation behavior             | Tests prove bootstrap, rollover, catch-up, idempotency, grace, cancellation, and reactivation |

## M16.4 Authenticated Credit Status

| Ticket | Status    | Deliverable                           | Acceptance                                                                    |
| ------ | --------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| M16.4a | completed | Implement the credit-status handler   | Auth UID is reconciled and returns eligibility, balance, and next anniversary |
| M16.4b | completed | Export `getAiCreditStatus`            | Callable uses `us-central1`, a bounded timeout, and no target UID input       |
| M16.4c | completed | Cover status authorization and states | Tests cover forged UID, active, grace, inactive, and zero-balance responses   |

## M16.5 Metered and Idempotent Generation

| Ticket | Status    | Deliverable                            | Acceptance                                                                                         |
| ------ | --------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| M16.5a | completed | Add request IDs and input fingerprints | Valid client UUIDs work; old clients receive server IDs; raw prompts are not stored                |
| M16.5b | completed | Reserve one credit                     | Transaction rejects zero/concurrency and moves one available credit to reserved                    |
| M16.5c | completed | Finalize successful generation         | Valid output consumes the reservation and returns the updated balance                              |
| M16.5d | completed | Refund failed generation               | Provider, JSON, and schema failures restore the reservation before returning                       |
| M16.5e | completed | Recover expired reservations           | Expired leases refund once; active leases cannot be stolen                                         |
| M16.5f | completed | Make retries idempotent                | Matching replay returns cached success without another charge; mismatch is rejected                |
| M16.5g | completed | Add temporary plan expiry              | Temporary request records receive a 24-hour `expiresAt` value                                      |
| M16.5h | completed | Cover generation accounting            | Tests cover success, zero, concurrency, refunds, stale lease, replay, compatibility, and isolation |

## M16.6 RevenueCat Accrual Integration

| Ticket | Status      | Deliverable                            | Acceptance                                                                           |
| ------ | ----------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| M16.6a | not-started | Expose canonical paid-period data      | Server lookup returns UID, status, period start, and period end                      |
| M16.6b | not-started | Reconcile after active webhook updates | Active updates grant due credits; other states preserve without granting             |
| M16.6c | not-started | Preserve webhook idempotency           | Duplicate receipts and reconciliation cannot double-grant                            |
| M16.6d | not-started | Cover subscription transitions         | Tests cover renewal, annual accrual, grace, recovery, cancellation, and reactivation |

## M16.7 Privacy and Rules

| Ticket | Status      | Deliverable                      | Acceptance                                                                            |
| ------ | ----------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| M16.7a | not-started | Export caller AI credit data     | Export includes only the caller's account, grants, and temporary plans                |
| M16.7b | not-started | Delete caller AI credit data     | Account, grants, and plans are removed before Auth deletion; other users remain       |
| M16.7c | not-started | Add explicit server-only rules   | Clients cannot read or write quota authority collections                              |
| M16.7d | not-started | Cover privacy and rule isolation | Tests prove forged targets and owner/other-user direct access cannot escape isolation |

## M16.8 Shared Native and Web Client

| Ticket | Status      | Deliverable                     | Acceptance                                                                                  |
| ------ | ----------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| M16.8a | not-started | Add shared credit/request types | Types cover status, anniversary, request ID, balance, and errors                            |
| M16.8b | not-started | Add the credit-status service   | Shared JS SDK calls `getAiCreditStatus` in `us-central1`                                    |
| M16.8c | not-started | Add stable request-ID lifecycle | Unknown network retries reuse an ID; definitive outcomes create a new ID                    |
| M16.8d | not-started | Display credit status           | AI Planning shows loading, balance, next grant, and zero state without blocking manual work |
| M16.8e | not-started | Map quota/concurrency errors    | Exhaustion and active generation receive specific messages                                  |
| M16.8f | not-started | Update balance after generation | Success uses returned balance; refunded failures refresh status                             |
| M16.8g | not-started | Cover client behavior           | Jest covers balance, decrement, rollover, zero, refund, retry, concurrency, and fallback    |
| M16.8h | not-started | Validate web parity             | Static web build and authenticated browser flow use the same quota policy                   |

## M16.9 Observability, Documentation, and Rollout

| Ticket | Status      | Deliverable                             | Acceptance                                                                            |
| ------ | ----------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| M16.9a | not-started | Add quota-safe operational events       | Grant/reserve/finalize/refund/exhaustion outcomes exclude sensitive content           |
| M16.9b | not-started | Reconcile architecture and privacy docs | Current docs accurately describe Auth, quota, retention, web, and App Check deferral  |
| M16.9c | not-started | Deploy Functions before clients         | Quota-enforced compatible Functions are deployed first                                |
| M16.9d | not-started | Configure Firestore TTL                 | Only temporary `aiPlans.expiresAt` records use TTL                                    |
| M16.9e | not-started | Run staging native/web acceptance       | Ownership, quota, retries, subscription states, privacy, and web parity are evidenced |

## Validation Gates

1. `npm --prefix functions run quality`
2. `npm --prefix mobile run test:rules`
3. `npm --prefix mobile test -- --runInBand src/__tests__/GoalsScreen.test.tsx src/__tests__/telemetry.test.ts`
4. `npm --prefix mobile run typecheck`
5. `npm --prefix mobile run lint`
6. `npm --prefix mobile run format:check`
7. `npm --prefix mobile run build:web`
8. Staging native/web acceptance for concurrency, refunds, retries, ownership, RevenueCat transitions, export, and deletion.

## Tracking Protocol

1. Before changing code for a leaf ticket, set it to `in-progress` here and in `PROJECT_PLAN.md`.
2. Update scope and dependencies before expanding a ticket.
3. Mark a leaf ticket `completed` only after its focused validation passes; record the command and result in `PROJECT_PLAN.md`.
4. Complete a parent only after every leaf ticket is complete. Use `manual-handoff` for owner-only deployment or console work.
5. Update the roadmap and validation log at every parent-task transition.
6. M16 completes only after M16.1-M16.8 complete and M16.9 is complete or explicitly handed off.

## Deferred Scope

- Native Firebase migration.
- App Attest, DeviceCheck, Play Integrity, reCAPTCHA Enterprise, and App Check replay protection.
- Subscription price/product changes.
- Quotas for non-AI callables.
