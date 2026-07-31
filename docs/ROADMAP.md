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

| Task ID | Status    | Description                                               | Exit Criteria                                  |
| ------- | --------- | --------------------------------------------------------- | ---------------------------------------------- |
| M0.1    | completed | Create custom delivery agent rules and operating workflow | Agent in place and usable                      |
| M0.2    | completed | Produce concise product brief                             | Product scope and requirements documented      |
| M0.3    | completed | Produce implementation roadmap                            | Ordered milestones and dependencies documented |

### M1 - App Foundation and Tooling

| Task ID | Status      | Description                                      | Exit Criteria                                                                                                                                 |
| ------- | ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M1.1    | completed   | Initialize Expo app and folder structure         | Expo TypeScript app scaffolded in mobile/ with baseline structure and config; platform runtime validation deferred per user environment setup |
| M1.2    | completed   | Configure Firebase project, auth, env management | Firebase init/auth bootstrap and env strategy validated in development                                                                        |
| M1.3    | completed   | Add lint, formatter, tests, and CI baseline      | CI validates lint and tests on PR                                                                                                             |
| M1.4    | completed   | Set up navigation shell with bottom tabs         | Calendar, Goals, Notes, Profile tabs routable                                                                                                 |
| M1.5    | in-progress | Restore reproducible engineering baseline        | Node 24/npm 11 fresh install and every required quality command pass locally and in CI                                                        |
| M1.6    | not-started | Add shared Firebase Functions foundation         | Secure staging callable validates backend conventions without calendar-provider code                                                          |

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

| Task ID | Status      | Description                                           | Exit Criteria                                 |
| ------- | ----------- | ----------------------------------------------------- | --------------------------------------------- |
| M8.1    | not-started | Implement premium entitlement model and feature gates | Premium gates enforced client and server side |
| M8.2    | not-started | Build AI-assisted goal planning service integration   | AI returns editable milestones and steps      |
| M8.3    | not-started | Add AI safety, fallback, and failure UX               | Users receive clear recovery paths on failure |
| M8.4    | not-started | Instrument premium funnel from upgrade to activation  | Conversion analytics captured end-to-end      |

### M9 - Quality, Security, and Compliance

| Task ID | Status      | Description                                              | Exit Criteria                                                                             |
| ------- | ----------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| M9.1    | not-started | Expand automated tests for critical user journeys        | Core flows covered by stable tests                                                        |
| M9.2    | not-started | Perform security hardening and secret management audit   | No secrets exposed and auth flows validated                                               |
| M9.3    | not-started | Add analytics dashboards and operational alerts          | Product and reliability telemetry available                                               |
| M9.4    | not-started | Finalize legal copy (privacy policy, terms, disclosures) | Store-compliant legal docs available                                                      |
| M9.5    | not-started | Add general export and account deletion                  | JSON/ICS export and reauthenticated cleanup pass emulator, staging, and native validation |
| M9.6    | not-started | Establish backup, migration, and recovery readiness      | Backup retention and staging restore drill meet approved RPO/RTO                          |

### M10 - Final UI Fixes and Operability Fixes

| Task ID | Status         | Description                                        | Exit Criteria                                                                    |
| ------- | -------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| M10.0   | not-started    | Review and unify the complete mobile UI            | Shared sizing, typography, forms, cards, filters, and states pass focused tests  |
| M10.0a  | not-started    | Add shared control and layout foundations          | Reusable controls replace major one-off visual patterns                          |
| M10.0b  | not-started    | Modernize and categorize Profile                   | Profile is grouped into scannable functional sections                            |
| M10.0c  | not-started    | Improve Goals presentation and filtering           | Goal cards, progress, counts, and Active/Completed/All filtering are clear       |
| M10.0d  | not-started    | Improve Tasks presentation and filtering           | Task cards, counts, and Active/Completed/All filtering are clear                 |
| M10.0e  | not-started    | Normalize forms, modals, sizing, and accessibility | Screens avoid clipping and expose consistent control semantics                   |
| M10.1   | not-started    | Polish UI interactions and accessibility           | Automated accessibility checks pass; native assistive-tech review remains manual |
| M10.2   | not-started    | Fix operability edge cases and error recovery      | Edge cases in critical flows handled gracefully                                  |
| M10.3   | not-started    | Optimize app performance and startup time          | App launch and transitions meet performance targets                              |
| M10.4   | manual-handoff | Run end-to-end user acceptance testing             | Owner completes native UAT signoff                                               |

### M11 - Monetization Readiness

| Task ID | Status      | Description                                         | Exit Criteria                                 |
| ------- | ----------- | --------------------------------------------------- | --------------------------------------------- |
| M11.1   | not-started | Configure subscription products for iOS and Android | Products testable in sandbox environments     |
| M11.2   | not-started | Build paywall UX and entitlement restoration flows  | Purchase, restore, and cancel paths validated |
| M11.3   | not-started | Validate regional pricing and trial strategy        | Pricing matrix approved for launch markets    |

### M12 - Release and Store Deployment

| Task ID | Status         | Description                                           | Exit Criteria                                        |
| ------- | -------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| M12.1   | not-started    | Prepare release build pipelines and signing setup     | Signed release candidates generated                  |
| M12.2   | not-started    | Complete App Store listing assets and metadata        | Apple submission package ready                       |
| M12.3   | not-started    | Complete Google Play listing assets and metadata      | Play submission package ready                        |
| M12.4   | not-started    | Run beta testing cycles (TestFlight/Internal Testing) | Critical launch blockers resolved                    |
| M12.5   | manual-handoff | Submit and publish to both stores                     | Owner completes store-console submission and release |

### M13 - Launch Operations

| Task ID | Status      | Description                   | Exit Criteria                                                                    |
| ------- | ----------- | ----------------------------- | -------------------------------------------------------------------------------- |
| M13.1   | not-started | Run staged rollout            | 5%, 25%, 50%, and 100% gates pass documented halt thresholds                     |
| M13.2   | not-started | Operate launch monitoring     | Daily checks cover reliability, billing, AI, backups, costs, and support         |
| M13.3   | not-started | Publish operational runbooks  | Incident, rollback, privacy, subscription, and support procedures have owners    |
| M13.4   | not-started | Complete launch reviews       | 7-day and 30-day findings produce owned follow-up work                           |
| M13.5   | not-started | Establish maintenance cadence | SDK, dependency, secret, restore, legal, store, and OS reviews recur on schedule |

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

1. Complete and validate the Node 24/npm 11 engineering baseline.
2. Implement M7.5 atomic and idempotent task conversion with failure/concurrency coverage.
3. Implement M10.0 shared UI foundations, Profile categories, and Goals/Tasks filtering.
