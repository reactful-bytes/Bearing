# M18 RevenueCat Virtual Currency Foundation Engineering Tickets

## Scope

Make RevenueCat Virtual Currencies the only AI-credit grant and balance authority. Grant amounts remain dashboard configuration; source code contains no recurring, trial, or pack grant amount.

## API Boundary

- RevenueCat API V2 owns virtual-currency balances, transactions, and product-grant configuration.
- The existing V1 API remains limited to subscriber reconciliation and customer deletion.
- V1 keys cannot authenticate V2 requests; the V2 key must be separate and least privilege.

## Tickets

| Ticket | Status      | Deliverable                              | Acceptance                                                                                         |
| ------ | ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| M18.1  | completed   | Establish milestone tracking             | M18-M21 ticket files, roadmap entries, project-plan entries, dependencies, and update rules agree |
| M18.2  | not-started | Configure the `AIC` virtual currency     | Non-expiring currency uses dashboard-selected paid grants and a separately configured trial grant |
| M18.3  | in-progress | Provision V2 access and parameters       | Separate least-privilege V2 key, project ID, and configurable currency code are documented/wired  |
| M18.4  | not-started | Add the V2 balance adapter               | Authenticated UID balance reads validate non-negative integers and do not cache customer balances  |
| M18.5  | not-started | Add the V2 transaction adapter           | One-unit debit/refund supports idempotency and typed retry/exhaustion errors                       |
| M18.6  | not-started | Add the dynamic product-grant catalog    | Product grants join to store IDs and expose only safe client fields without fallback amounts       |
| M18.7  | not-started | Validate the V2 foundation               | Parsing, errors, retries, pagination, caching, joins, auth, and redaction tests pass                |

## Execution Order

M18.1 first. M18.2 and M18.3 may proceed in parallel. M18.4-M18.6 depend on M18.3. M18.7 closes the milestone.

## Tracking Protocol

1. Set a leaf ticket to `in-progress` here and in `PROJECT_PLAN.md` before implementation.
2. Run focused validation after every leaf ticket and add the result to the project-plan validation log.
3. Mark a ticket complete only after its acceptance criteria pass. Use `manual-handoff` for owner-console work until evidence is recorded.
4. Synchronize this file, `PROJECT_PLAN.md`, and `ROADMAP.md` at every parent or milestone transition.

## Validation Gates

1. `npm --prefix functions run quality`
2. Focused compiled Node tests for V2 balance, transaction, catalog, and callable behavior.
3. Active source contains no recurring, trial, or pack grant amount.
