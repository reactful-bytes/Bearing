# Product Roadmap

## Objective

Deliver Bearing from initial setup to production release on iOS App Store and Google Play, including premium monetization and AI-assisted goal planning.

## Delivery Principles

- Build in small validated increments.
- Prioritize public behavior and user outcomes.
- Gate advanced functionality behind observability and testing.
- Keep architecture consistent with Expo + Firebase best practices.

## Milestone Plan

### M0 - Product Definition and Planning

| Task ID | Status    | Description                                               | Exit Criteria                                                           |
| ------- | --------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| M0.1    | completed | Create custom delivery agent rules and operating workflow | Agent in place and usable                                               |
| M0.2    | completed | Produce concise product brief                             | Product scope and requirements documented                               |
| M0.3    | completed | Produce implementation roadmap                            | Ordered milestones and dependencies documented                          |
| M0.7    | completed | Reconcile launch scope and implementation plans           | Native calendar, mobile release, and M11-M13 ownership boundaries agree |

### M1 - App Foundation and Tooling

| Task ID | Status         | Description                                      | Exit Criteria                                                                                                                                 |
| ------- | -------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M1.1    | completed      | Initialize Expo app and folder structure         | Expo TypeScript app scaffolded in mobile/ with baseline structure and config; platform runtime validation deferred per user environment setup |
| M1.2    | completed      | Configure Firebase project, auth, env management | Firebase init/auth bootstrap and env strategy validated in development                                                                        |
| M1.3    | completed      | Add lint, formatter, tests, and CI baseline      | CI validates lint and tests on PR                                                                                                             |
| M1.4    | completed      | Set up navigation shell with bottom tabs         | Calendar, Goals, Notes, Profile tabs routable                                                                                                 |
| M1.5    | in-progress    | Restore reproducible engineering baseline        | Node 24/npm 11 fresh install and every required quality command pass locally and in CI                                                        |
| M1.6    | manual-handoff | Add shared Firebase Functions foundation         | Repository and CI conventions pass; owner deploys and invokes authenticated staging services                                                  |

### M2 - Design System and UX Foundation

| Task ID | Status    | Description                                                         | Exit Criteria                                                                                                                    |
| ------- | --------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| M2.1    | completed | Define visual language, typography, spacing, and component tokens   | Design tokens committed and documented                                                                                           |
| M2.2    | completed | Build reusable primitives (cards, modals, FAB, list items, headers) | Core UI primitives integrated across tabs                                                                                        |
| M2.3    | completed | Define interaction states (loading, empty, error, completed/past)   | Calendar state patterns implemented and consistent with event-first language; progress tracking intentionally reserved for Goals |

### M3 - Calendar and Focus Mode

| Task ID | Status    | Description                                    | Exit Criteria                                      |
| ------- | --------- | ---------------------------------------------- | -------------------------------------------------- |
| M3.1    | completed | Build calendar screen interaction model        | Calendar day and month views stable and performant |
| M3.2    | completed | Add calendar event CRUD baseline               | Local app event lifecycle functional               |
| M3.3    | completed | Implement Idea Dump capture to Notes pipeline  | Idea Dump creates note records reliably            |
| M3.4    | completed | Implement Focus Mode UI and active event timer | Focus Mode usable from FAB and event state         |

### M4 - Goals Core Experience

| Task ID | Status    | Description                                                 | Exit Criteria                                  |
| ------- | --------- | ----------------------------------------------------------- | ---------------------------------------------- |
| M4.1    | completed | Implement goals list cards with required fields             | Cards show goal name, date, next task          |
| M4.2    | completed | Build SMART onboarding + goal creation wizard (manual path) | User can create goal and steps without AI      |
| M4.3    | completed | Implement Goal Details modal with edit capabilities         | Goal edit/save/close behavior validated        |
| M4.4    | completed | Implement step list interactions (add, complete, reorder)   | Reorder and completion state persist correctly |
| M4.5    | completed | Implement Step Details modal with schedule action           | Step details and linked event list functional  |

### M5 - Notes and Profile

| Task ID | Status    | Description                                            | Exit Criteria                                |
| ------- | --------- | ------------------------------------------------------ | -------------------------------------------- |
| M5.1    | completed | Build notes list and note CRUD                         | Notes can be created, edited, deleted        |
| M5.2    | completed | Merge Idea Dump and standard notes flows               | Captured notes are discoverable and editable |
| M5.3    | completed | Build profile account settings and password reset flow | Account actions verified end-to-end          |
| M5.4    | completed | Add tips/life wisdom alert and sound settings          | Profile utilities functional and saved       |

### M6 - Native Device Calendar Integration

| Task ID   | Status         | Description                                          | Exit Criteria                                                                                  |
| --------- | -------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| M6.1-M6.5 | superseded     | Provider connection, mirror, and ICS-import approach | Historical implementation retained; no active provider dependency remains                      |
| M6.6      | completed      | Remove provider integration and migrate legacy data  | Provider UI/services/gates and ICS import are gone without losing imported Bearing events      |
| M6.7      | completed      | Add `expo-calendar`, permissions, and adapter        | Adapter, permissions, dev client, clean Android generation, and debug APK build pass           |
| M6.8      | completed      | Add per-device calendar settings                     | Users select visible calendars and one writable default independently on each device           |
| M6.9      | completed      | Aggregate live device and Firestore events           | Selected system events display without Firestore mirrors or duplicate linked copies            |
| M6.10     | completed      | Build complete Bearing event editor                  | Supported ordinary and recurring event fields can be created and edited with capability checks |
| M6.11     | completed      | Publish and reconcile linked Bearing events          | Optional copies rediscover across devices and recover honestly from partial writes/deletions   |
| M6.12     | completed      | Retain general Bearing ICS export                    | Timed, all-day, timezone, location, recurrence, alarm, and text fixtures pass                  |
| M6.13     | manual-handoff | Complete native and cross-device validation          | Owner runs current-device and two-device acceptance checklists                                 |

### M7 - To-Do List and Task Conversion

| Task ID | Status    | Description                                              | Exit Criteria                                                                      |
| ------- | --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| M7.1    | completed | Add to-do list screen and unscheduled task model         | Users can access a dedicated task list for unscheduled work                        |
| M7.2    | completed | Implement task create, edit, and delete flows            | Simple task CRUD works reliably from the list and modal views                      |
| M7.3    | completed | Add convert-to-event flow from the task modal            | Task can create a calendar event from its detail view                              |
| M7.4    | completed | Add soft-delete completion handling and completed toggle | Converted tasks are hidden by default and visible when completed filter is enabled |
| M7.5    | completed | Make task conversion atomic and idempotent               | Failure/retry/concurrency tests prove one event per completed conversion           |

### M8 - Premium and AI Goal Assistant

| Task ID | Status    | Description                                           | Exit Criteria                                                                                           |
| ------- | --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| M8.1    | completed | Implement premium entitlement model and feature gates | Premium gates enforced client and server side                                                           |
| M8.2    | completed | Build AI-assisted goal planning service integration   | AI returns editable milestones and steps                                                                |
| M8.3    | completed | Add AI safety, fallback, and failure UX               | Users receive clear recovery paths on failure                                                           |
| M8.4    | completed | Instrument premium funnel from upgrade to activation  | Strict paywall, purchase, restore, Firestore activation, and AI outcome events pass client/server tests |

### M9 - Quality, Security, and Compliance

| Task ID | Status         | Description                                              | Exit Criteria                                                                                                        |
| ------- | -------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| M9.1    | manual-handoff | Expand automated tests for critical user journeys        | Jest and Maestro coverage are repository-ready; owner runs native flows on installed Android and iOS builds          |
| M9.2    | completed      | Perform security hardening and secret management audit   | No secrets exposed and auth flows validated                                                                          |
| M9.3    | manual-handoff | Add analytics dashboards and operational alerts          | Consent-aware events, queries, and alert thresholds are repository-ready; owner activates cloud resources            |
| M9.4    | manual-handoff | Finalize legal copy (privacy policy, terms, disclosures) | Draft copy, in-app access, and release checklist are ready; owner/legal approval and public hosting remain           |
| M9.5    | completed      | Add general export and account deletion                  | JSON/ICS export and reauthenticated cleanup pass automated validation; staging/native acceptance is an owner handoff |
| M9.6    | manual-handoff | Establish backup, migration, and recovery readiness      | Workflow/runbook are ready; owner configures cloud retention and records the staging restore drill                   |

### M10 - Final UI Fixes and Operability Fixes

| Task ID | Status         | Description                                        | Exit Criteria                                                                     |
| ------- | -------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| M10.0   | completed      | Review and unify the complete mobile UI            | Shared sizing, typography, forms, cards, filters, and states pass focused tests   |
| M10.0a  | completed      | Add shared control and layout foundations          | Reusable controls replace major one-off visual patterns                           |
| M10.0b  | completed      | Modernize and categorize Profile                   | Profile is grouped into scannable functional sections                             |
| M10.0c  | completed      | Improve Goals presentation and filtering           | Goal cards, progress, counts, and Active/Completed/All filtering are clear        |
| M10.0d  | completed      | Improve Tasks presentation and filtering           | Task cards, counts, and Active/Completed/All filtering are clear                  |
| M10.0e  | completed      | Normalize forms, modals, sizing, and accessibility | Screens avoid clipping and expose consistent control semantics                    |
| M10.1   | manual-handoff | Polish UI interactions and accessibility           | Automated accessibility checks pass; native assistive-tech review remains manual  |
| M10.2   | completed      | Fix operability edge cases and error recovery      | Core startup and Firestore failures expose tested executable retry                |
| M10.3   | manual-handoff | Optimize app performance and startup time          | Repository controls pass; release-device launch, FPS, and memory evidence remains |
| M10.4   | manual-handoff | Run end-to-end user acceptance testing             | Owner completes native UAT signoff                                                |

### M11 - Monetization Readiness

| Task ID | Status         | Description                                         | Exit Criteria                                                                                |
| ------- | -------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| M11.1   | manual-handoff | Configure subscription products for iOS and Android | Repository contract is ready; owner configures stores/RevenueCat and proves sandbox products |
| M11.2   | manual-handoff | Build paywall UX and entitlement restoration flows  | Purchase, restore, management, webhook, and cleanup pass; native store paths remain          |
| M11.3   | manual-handoff | Validate regional pricing and trial strategy        | Reference prices/no-trial plan documented; owner approves regional matrix                    |

### M12 - Release and Store Deployment

| Task ID | Status         | Description                                           | Exit Criteria                                                              |
| ------- | -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| M12.1   | manual-handoff | Prepare release build pipelines and signing setup     | EAS profiles/checklist ready; owner generates signed candidates            |
| M12.2   | manual-handoff | Complete App Store listing assets and metadata        | Source copy/checklist ready; owner assembles and approves Apple package    |
| M12.3   | manual-handoff | Complete Google Play listing assets and metadata      | Source copy/checklist ready; owner assembles and approves Play package     |
| M12.4   | manual-handoff | Run beta testing cycles (TestFlight/Internal Testing) | Evidence template/blocker policy ready; owner runs and records beta cycles |
| M12.5   | manual-handoff | Submit and publish to both stores                     | Owner completes store-console submission and release                       |

### M13 - Launch Operations

| Task ID | Status         | Description                   | Exit Criteria                                                              |
| ------- | -------------- | ----------------------------- | -------------------------------------------------------------------------- |
| M13.1   | manual-handoff | Run staged rollout            | Gates and halt thresholds ready; owner records live rollout decisions      |
| M13.2   | manual-handoff | Operate launch monitoring     | Daily checklist ready; owner activates dashboards and records daily checks |
| M13.3   | manual-handoff | Publish operational runbooks  | Runbooks ready; owner assigns people/routes and validates a drill          |
| M13.4   | manual-handoff | Complete launch reviews       | Templates ready; live 7-day and 30-day findings remain                     |
| M13.5   | manual-handoff | Establish maintenance cadence | Schedule ready; owner creates recurring calendar and evidence              |

## Dependency Order Summary

1. M0 Product definition
2. M1 Foundation and tooling
3. M2 UX foundations
4. M3-M5 Core feature pillars (Calendar, Goals, Notes/Profile)
5. M1.5 Engineering recovery and M1.6 backend foundation
6. M6 Native device calendars and M7.5 atomic conversion
7. M11 entitlement authority and M8 premium AI
8. M9 Quality, security, privacy, export, and recovery
9. M10 Final UI, resilience, performance, and UAT
10. M12 Native build, beta, and store release
11. M13 Staged rollout and operations

## Validation Gates Per Milestone

- Functional gate: Acceptance criteria met for milestone exit.
- Quality gate: Required automated and manual checks pass.
- Security gate: No sensitive logging, secrets, or unsafe error handling.
- Product gate: UX and copy align with product brief.

## Immediate Next Steps

1. Run native M6.13, M9.1, M10.1, M10.3, and M10.4 acceptance on installed release candidates.
2. Execute M11 store/RevenueCat setup, deployment, sandbox, and regional pricing handoffs.
3. Link EAS, sign candidates, assemble store packages, run beta cycles, and complete legal approval.
4. Execute M9.3-M9.6 and M13 owner handoffs, then record rollout and launch evidence.
