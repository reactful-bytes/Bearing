# M19 Authoritative Spending and Ledger Removal Engineering Tickets

## Scope

Spend and refund one RevenueCat virtual-currency unit around AI generation while retaining only short-lived Firestore operation, lock, and replay state. Delete the former Firestore balance and grant ledger completely.

## Tickets

| Ticket | Status      | Deliverable                                  | Acceptance                                                                                       |
| ------ | ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M19.1  | completed | Add minimal operation persistence            | Operations and per-user locks store no authoritative balance or grant history                    |
| M19.2  | completed | Coordinate one idempotent debit              | Debit state is durable before the V2 call and ambiguous outcomes resume with the same key         |
| M19.3  | completed | Finalize and replay successful plans         | Valid drafts complete and replay without another debit or generation                              |
| M19.4  | completed | Refund and recover interrupted operations    | Failed generation refunds once and stale operations converge safely                               |
| M19.5  | completed | Rewire AI generation                         | Active/grace authorization, debit-before-generation, refund, and request-ID behavior pass          |
| M19.6  | completed | Replace credit status behavior               | Live RevenueCat balance is returned and `nextGrantAt` is removed                                  |
| M19.7  | completed | Remove webhook-driven credit accrual         | Subscription reconciliation remains while every local credit-reconciliation path is gone          |
| M19.8  | completed | Delete the Firestore ledger completely       | Account/grant modules, tests, math, imports, generated output, and runtime references are absent    |
| M19.9  | completed | Prove the backend migration                  | Concurrency, replay, zero, retries, refunds, recovery, authorization, and quality gates pass        |

## Execution Order

M19.1 -> M19.2 -> M19.3 and M19.4 -> M19.5 and M19.6. M19.7 follows M18.4. M19.8 waits for all old dependencies to be removed. M19.9 closes the milestone.

## Tracking Protocol

1. Set a leaf ticket to `in-progress` here and in `PROJECT_PLAN.md` before implementation.
2. Validate and log every leaf ticket before marking it complete.
3. Keep M16 as historical evidence, but use only M19 as the active spending architecture.
4. Synchronize roadmap and project-plan status at every parent or milestone transition.

## Validation Gates

1. `npm --prefix functions run quality`
2. `npm --prefix mobile run test:rules`
3. Search source, tests, rules, and active docs for retired ledger symbols and collections.
