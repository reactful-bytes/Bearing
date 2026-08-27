# M20 Bearing 360 and Credit Pack Experience Engineering Tickets

## Scope

Present Premium as Bearing 360 to customers, show RevenueCat-configured grants dynamically, and sell consumable credit packs to secured active/grace members from AI Planning and Profile.

## Compatibility Boundary

The user-facing name changes to Bearing 360. Internal `premium` code names, entitlement/product identifiers, persisted fields, and `premium_*` telemetry identifiers remain stable.

## Tickets

| Ticket | Status    | Deliverable                                  | Acceptance                                                                                       |
| ------ | --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M20.1  | completed | Add mobile grant-catalog transport and types | SDK packages join to server-derived grants by store product identifier                           |
| M20.2  | completed | Rename all customer-facing Premium copy      | Rendered app and accessibility copy use Bearing 360; stable technical identifiers remain         |
| M20.3  | completed | Show dynamic subscription grants             | Paid and trial grant copy comes from RevenueCat without numeric fallback                         |
| M20.4  | completed | Use authoritative balance UI                 | Live balances refresh after purchases and generation; `nextGrantAt` is absent                    |
| M20.5  | completed | Add a dedicated credit-pack offering client  | Consumables load from `credit_packs` and cannot enter subscription activation                    |
| M20.6  | completed | Build the credit-pack purchase flow          | Dynamic amount/price, confirmation, cancel/failure/sync, and balance refresh work                |
| M20.7  | completed | Add the AI Planning pack entry               | Eligible members can buy credits from AI Planning, including at zero balance                     |
| M20.8  | completed | Add Profile pack and unsupported states      | Profile shows balance/pack action; unsupported clients receive accurate guidance                 |
| M20.9  | completed | Add strict credit-pack telemetry             | Allowlisted fields exclude product IDs, package IDs, titles, prices, customer IDs, and free text |
| M20.10 | completed | Validate the mobile experience               | Focused/full tests, typecheck, lint, format, rules, and web build pass                           |

## Execution Order

M20.1 depends on M18.6. M20.2 may proceed in parallel. M20.3-M20.4 depend on M20.1 and M19.6. M20.5 -> M20.6 -> M20.7 and M20.8. M20.9 may proceed in parallel. M20.10 closes the milestone.

## Tracking Protocol

1. Set each leaf ticket to `in-progress` here and in `PROJECT_PLAN.md` before implementation.
2. Validate and log each ticket before completion.
3. Synchronize roadmap and project-plan status at every parent or milestone transition.

## Validation Gates

1. Focused Jest suites for subscriptions, paywall, credits, Goals, Profile, and telemetry.
2. `npm --prefix mobile run typecheck`
3. `npm --prefix mobile run lint`
4. `npm --prefix mobile run format:check`
5. `npm --prefix mobile run build:web`

## Validation Log

| Date       | Tickets      | Result    | Evidence                                                                                                                                                                                                                                  |
| ---------- | ------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-27 | M20.1-M20.10 | completed | 10 focused mobile suites/94 tests; full mobile 46 suites/273 tests; typecheck, lint, format, and web export pass; Functions quality plus 12 explicit suites/67 tests pass; 16 rules tests pass; native/store setup remains M21.5 manual-handoff |
