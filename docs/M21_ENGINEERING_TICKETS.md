# M21 Privacy, Cleanup, Documentation, and Release Engineering Tickets

## Scope

Remove every retired ledger surface, align privacy and operating contracts with RevenueCat authority, and prepare the implementation for owner console and release acceptance.

## Tickets

| Ticket | Status         | Deliverable                                 | Acceptance                                                                                      |
| ------ | -------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| M21.1  | completed      | Update privacy export and deletion          | Live external balance and caller operations replace account/grant/plan ledger branches          |
| M21.2  | completed      | Replace rules, TTL, and staging data        | Rules and owner-safe migration/cleanup instructions are complete; execution is a manual handoff |
| M21.3  | completed      | Reconcile architecture and operations docs  | Active docs name RevenueCat as balance/grant authority and Firestore as operation-only state    |
| M21.4  | completed      | Reconcile monetization and legal docs       | Bearing 360, trials, dynamic grants, packs, locks, refunds, and non-transferability are current |
| M21.5  | manual-handoff | Complete store and RevenueCat setup         | Owner records trial, grant, offering, product, webhook, native purchase, and sandbox evidence   |
| M21.6  | completed      | Run backend failure and security acceptance | Parent focused failure/security tests plus privacy and rules acceptance pass                    |
| M21.7  | manual-handoff | Run release acceptance and close tracking   | Native purchases and no-deployment grant change still require owner evidence                    |

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

## Validation Log

| Date       | Tickets      | Result         | Evidence                                                                                                                              |
| ---------- | ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-27 | M21.1, M21.6 | completed      | Functions quality and 68 explicit tests; mobile typecheck/lint/format and 273 tests; 16 Firestore rules tests pass                    |
| 2026-08-27 | M21.2        | completed      | Server-only rules pass; exact project-guarded TTL/count/backup/cleanup commands documented; console execution remains manual evidence |
| 2026-08-27 | M21.3, M21.4 | completed      | Active-doc/source stale scans, direct Prettier formatting, and `git diff --check` pass                                                |
| 2026-08-27 | M21.5, M21.7 | manual-handoff | RevenueCat/store configuration, native purchases, dynamic no-deployment change, TTL, and cleanup evidence are not repository-owned    |
