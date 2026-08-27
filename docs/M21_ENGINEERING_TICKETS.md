# M21 Privacy, Cleanup, Documentation, and Release Engineering Tickets

## Scope

Remove every retired ledger surface, align privacy and operating contracts with RevenueCat authority, and prepare the implementation for owner console and release acceptance.

## Tickets

| Ticket | Status      | Deliverable                                  | Acceptance                                                                                       |
| ------ | ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M21.1  | not-started | Update privacy export and deletion           | Live external balance and caller operations replace account/grant/plan ledger branches            |
| M21.2  | not-started | Replace rules, TTL, and staging data         | New operation state is server-only; old TTL and non-production ledger data have cleanup steps     |
| M21.3  | not-started | Reconcile architecture and operations docs   | Active docs name RevenueCat as balance/grant authority and Firestore as operation-only state       |
| M21.4  | not-started | Reconcile monetization and legal docs        | Bearing 360, trials, dynamic grants, packs, locks, refunds, and non-transferability are current    |
| M21.5  | not-started | Complete store and RevenueCat setup          | Owner records trial, grant, offering, product, webhook, and sandbox evidence                       |
| M21.6  | not-started | Run backend failure and security acceptance  | Retry injection, exactly-once adjustment, auth, privacy, rules, and redaction pass                  |
| M21.7  | not-started | Run release acceptance and close tracking    | Native/web matrix and no-deployment grant change are evidenced; all trackers agree                 |

## Execution Order

M21.1-M21.2 depend on M19. M21.3-M21.4 follow their implementation owners. M21.5 depends on M18 and M20. M21.6 depends on M19. M21.7 follows all prior tickets. M17 remains separately deferred.

## Tracking Protocol

1. Set each leaf ticket to `in-progress` here and in `PROJECT_PLAN.md` before implementation.
2. Validate and log every leaf ticket before completion or manual handoff.
3. Synchronize this file, `PROJECT_PLAN.md`, and `ROADMAP.md` at every transition.

## Validation Gates

1. Complete Functions and mobile quality gates.
2. Rules emulator tests and active-reference searches pass.
3. Owner records RevenueCat/store/native acceptance evidence before manual handoffs close.
