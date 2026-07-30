# Project Plan

## Purpose
Track implementation work for the Expo + Firebase day and life-goals app using stable milestone task IDs.

## Status Legend
- not-started
- in-progress
- blocked
- completed

## Active Milestones

### M0 - Product Planning and Documentation
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M0.2 | completed | Create product brief document | docs/PRODUCT_BRIEF.md added |
| M0.3 | completed | Create milestone roadmap document | docs/ROADMAP.md added |
| M0.4 | completed | Break M1 into implementation-ready engineering tickets | docs/M1_ENGINEERING_TICKETS.md added |
| M0.5 | completed | Create first-pass Firebase-aligned data model spec | docs/DATA_MODEL_SPEC.md added |
| M0.6 | completed | Create UX flow map for tab and modal transitions | docs/UX_FLOW_MAP.md added |

### M1 - Foundation Setup
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M1.1 | completed | Initialize Expo application workspace structure | Expo scaffold implemented in mobile/; iOS/Android runtime validation deferred per user environment setup |
| M1.2 | completed | Configure Firebase project and environment wiring | Firebase init/auth/env setup complete with manual signed-in/signed-out verification in web dev runtime |
| M1.3 | completed | Set up linting, test runner, and baseline CI checks | ESLint + Prettier config + Jest smoke test + PR CI workflow added |
| M1.4 | completed | Implement bottom tab navigation shell and screen placeholders | Authenticated tab shell implemented; manual iOS/Android tap-through validation confirmed |

### M2 - Design System and UX Foundation
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M2.1 | completed | Define visual language, typography, spacing, and component tokens | Shared design tokens committed and applied to the current UI shell |
| M2.2 | completed | Build reusable primitives (cards, modals, FAB, list items, headers) | Reusable UI primitives now support Calendar, Goals, Notes, and Profile surfaces |
| M2.3 | completed | Define interaction states (loading, empty, error, completed/past) | Calendar state patterns implemented and progress tracking intentionally deferred to Goals |

### M3 - Calendar and Focus Mode
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M3.1 | completed | Build calendar screen interaction model | Day view (hourly timeline) + month view (horizontally scrollable grid); no week view |
| M3.2 | completed | Add calendar event CRUD baseline | Firestore-backed; fields aligned to DATA_MODEL_SPEC; service layer + React hooks + modals |
| M3.3 | completed | Implement Idea Dump capture to Notes pipeline | Notes can be created only from Focus Mode Idea Dump or the Notes screen FAB; Firestore connectivity verified live on 2026-07-20 |
| M3.4 | completed | Implement Focus Mode UI and active event timer | Calendar exposes two bottom-right FABs: Add Event and Focus Mode; Focus Mode exits via 3-second press-and-hold control |

### M4 - Life Goals Core
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M4.1 | completed | Implement goals list cards with required fields | Goal cards show title, estimated completion date, derived next step, and progress text |
| M4.2 | completed | Build SMART onboarding + goal creation wizard (manual path) | Manual wizard creates goals and steps with SMART framing; AI planning remains clearly disabled |
| M4.3 | completed | Implement Goal Details modal with edit capabilities | Goal details support editing, scrolling, and manual completion from edit mode |
| M4.4 | completed | Implement step list interactions (add, complete, reorder) | Steps support add, complete, delete, and arrow-based reorder with persisted goal rollups |
| M4.5 | completed | Implement Step Details modal with schedule action | Step details support edit, delete, linked events, and prefilled schedule-to-calendar flow |

### M5 - Notes and Profile
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M5.1 | completed | Build notes list and note CRUD | Notes support create, detail, edit, and delete with automated validation and accepted UX |
| M5.2 | completed | Merge Idea Dump and standard notes flows | Manual and Idea Dump notes share one editable detail flow while retaining source metadata for display |
| M5.3 | completed | Build profile account settings and password reset flow | Email/password auth entry, anonymous-account linking, profile fields, timezone/locale selectors, and reset-password actions implemented and accepted |
| M5.4 | completed | Add tips/life wisdom alert and sound settings | Tips & Wisdom modal plus previewable generated timer/reminder sounds implemented and accepted |

### M6 - Calendar Integrations and ICS Interop
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M6.1 | in-progress | Integrate Google Calendar connectivity | Client-side connection state, secured-account gating, provider env readiness messaging, and connection management modal implemented; live OAuth and sync remain blocked on provider credentials and Functions deployment |
| M6.2 | in-progress | Integrate Microsoft calendar connectivity | Client-side connection state, secured-account gating, provider env readiness messaging, multi-tenant assumptions, and connection management modal implemented; live OAuth and sync remain blocked on provider credentials and Functions deployment |
| M6.3 | in-progress | Integrate Apple calendar pathway and constraints handling | Apple `.ics` import/export/share UI implemented in Profile; direct iCloud sync remains intentionally out of scope |
| M6.4 | in-progress | Add .ics import/export/share support | ICS serializer/parser, native share, web download fallback, and Firestore import path implemented for timed events; recurrence, all-day, attendees, conference links, and reminders remain deferred by approved scope |
| M6.5 | in-progress | Build conflict resolution and sync diagnostics UI | Profile now surfaces sync status, last-sync timing, calendar selection, and disconnect controls; provider delete propagation and background-sync execution still depend on live provider integration |

### M7 - To-Do List and Task Conversion
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M7.1 | completed | Add to-do list screen and unscheduled task model | Fifth bottom tab named Tasks implemented with order Goals, Tasks, Calendar, Notes, Profile; task fields limited to title + description in v1 |
| M7.2 | completed | Implement task create, edit, and delete flows | Task list, create modal, detail/edit modal, manual completion, and delete confirmation implemented and accepted |
| M7.3 | completed | Add convert-to-event flow from the task modal | Schedule prefill and Start Now flow implemented with immediate event creation, Calendar tab switch, and Focus Mode launch |
| M7.4 | completed | Add soft-delete completion handling and completed toggle | Schedule and Start Now auto-complete tasks; completed items hidden by default and visible through the completed toggle |

### M8 - Premium and AI Goal Assistant
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M8.1 | in-progress | Implement premium entitlement model and feature gates | Internal app slice in progress: client-side premium gate/paywall shell for AI goal builder and external calendar integrations, plus stable iOS/Android identifiers; store billing and server enforcement remain pending |
| M8.2 | not-started | Build AI-assisted goal planning service integration | AI returns editable milestones and steps |
| M8.3 | not-started | Add AI safety, fallback, and failure UX | Users receive clear recovery paths on failure |
| M8.4 | not-started | Instrument premium funnel from upgrade to activation | Conversion analytics captured end-to-end |

### M9 - Quality, Security, and Compliance
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M9.1 | not-started | Expand automated tests for critical user journeys | Core flows covered by stable tests |
| M9.2 | not-started | Perform security hardening and secret management audit | No secrets exposed and auth flows validated |
| M9.3 | not-started | Add analytics dashboards and operational alerts | Product and reliability telemetry available |
| M9.4 | not-started | Finalize legal copy (privacy policy, terms, disclosures) | Store-compliant legal docs available |

### M10 - Final UI Fixes and Operability Fixes
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M10.1 | not-started | Polish UI interactions and accessibility | All screens pass WCAG AA accessibility audit |
| M10.2 | not-started | Fix operability edge cases and error recovery | Edge cases in critical flows handled gracefully |
| M10.3 | not-started | Optimize app performance and startup time | App launch and transitions meet performance targets |
| M10.4 | not-started | Run end-to-end user acceptance testing | UAT signoff from stakeholders |

### M11 - Monetization Readiness
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M11.1 | not-started | Configure subscription products for iOS and Android | Products testable in sandbox environments |
| M11.2 | not-started | Build paywall UX and entitlement restoration flows | Purchase, restore, and cancel paths validated |
| M11.3 | not-started | Validate regional pricing and trial strategy | Pricing matrix approved for launch markets |

### M12 - Release and Store Deployment
| Task ID | Status | Description | Notes |
| --- | --- | --- | --- |
| M12.1 | not-started | Prepare release build pipelines and signing setup | Signed release candidates generated |
| M12.2 | not-started | Complete App Store listing assets and metadata | Apple submission package ready |
| M12.3 | not-started | Complete Google Play listing assets and metadata | Play submission package ready |
| M12.4 | not-started | Run beta testing cycles (TestFlight/Internal Testing) | Critical launch blockers resolved |
| M12.5 | not-started | Submit and publish to both stores | App live in both stores |

## Update Rules
- Read this file before starting a task.
- Update status, scope, dependencies, and notes when work changes.
- Do not mark tasks completed until acceptance criteria are met and validation has passed.
- Preserve completed tasks as progress history.
- Do not rewrite unrelated plan sections.

## Validation Log
| Date | Task ID | Validation | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-17 | M0.1 | Custom agent created and project plan initialized | completed | Initial setup complete |
| 2026-07-17 | M0.2 | Product brief document created | completed | docs/PRODUCT_BRIEF.md |
| 2026-07-17 | M0.3 | Roadmap document created | completed | docs/ROADMAP.md |
| 2026-07-17 | M0.4 | M1 engineering ticket breakdown created | completed | docs/M1_ENGINEERING_TICKETS.md |
| 2026-07-17 | M0.5 | Firebase-aligned data model spec created | completed | docs/DATA_MODEL_SPEC.md |
| 2026-07-17 | M0.6 | UX flow map created | completed | docs/UX_FLOW_MAP.md |
| 2026-07-17 | M1.1 | Expo app foundation scaffolded and config validated | completed | mobile/ created, expo-doctor 20/20, platform runtime checks deferred by user |
| 2026-07-17 | M1.2 | Firebase/auth/env implementation started | in-progress | Wiring runtime initialization and startup auth bootstrap |
| 2026-07-17 | M1.2 | Firebase/auth/env implementation and runtime verification complete | completed | .env configured, Firebase auth bootstrap verified by user, anonymous sign-in/sign-out flow validated |
| 2026-07-17 | M1.3 | Tooling baseline implementation started | in-progress | Adding lint, formatting, tests, and CI checks |
| 2026-07-17 | M1.3 | Tooling baseline implementation and validation complete | completed | npm run lint passed, npm run test -- --watch=false passed, npm run test:coverage passed, CI workflow added; npm run format:check reports existing formatting drift |
| 2026-07-17 | M1.4 | Bottom tab navigation shell implementation started | in-progress | Adding authenticated bottom-tab shell with Calendar, Goals, Notes, and Profile placeholders |
| 2026-07-17 | M1.4 | Bottom tab navigation shell implemented and automated validation passed | in-progress | Calendar initial route documented in code; npm run test -- --watch=false, npx tsc --noEmit, and npm run lint passed; awaiting manual iOS/Android tap-through confirmation |
| 2026-07-17 | M1.4 | Bottom tab navigation shell fully validated | completed | Manual iOS/Android tab tap-through confirmed by user; M1.4 acceptance criteria met |
| 2026-07-17 | M2.1 | Design token foundation started | in-progress | Centralizing colors, spacing, and typography into shared mobile/src/design tokens |
| 2026-07-17 | M2.1 | Design token foundation implemented and approved | completed | `npx tsc --noEmit` passed; manual verification approved by user |
| 2026-07-17 | M2.2 | Reusable UI primitives implementation started | in-progress | Adding card, modal, FAB, list item, and header primitives to support day-management UI |
| 2026-07-17 | M2.2 | Reusable UI primitives implementation and validation complete | completed | `npx tsc --noEmit`, `npm run lint`, and `npm test -- --runInBand` passed |
| 2026-07-17 | M2.3 | Daily overview and progress indicators implementation started | in-progress | Building Calendar daily overview with consistent loading, empty, error, completed/past interaction states |
| 2026-07-17 | M2.3 | Daily overview and progress indicators implementation and validation complete | completed | `npx tsc --noEmit`, `npm run lint`, and `npm test` passed with new Calendar state coverage |
| 2026-07-17 | M2.3 | Calendar copy and behavior aligned to event-first product direction | completed | Removed Calendar progress bar/progress copy; retained event state patterns and reserved progress tracking for Goals |
| 2026-07-17 | M3.1 | Calendar screen interaction model implementation started | in-progress | Day view (hourly timeline) + month view (horizontally scrollable grid) |
| 2026-07-17 | M3.1 | Calendar screen interaction model implementation and validation complete | completed | npm test (4 suites, 19 tests), npx tsc --noEmit, npm run lint all passed |
| 2026-07-17 | M3.2 | Calendar event CRUD baseline implementation and validation complete | completed | firebaseEvents service + useCalendarEvents hook + AddEventModal + EventDetailModal; npm test (19 tests), npx tsc, npm run lint passed |
| 2026-07-20 | M3.2 | Live Firestore connectivity probe executed | completed | Anonymous auth plus Firestore event create/query/delete and note create/query/delete succeeded against project `bearing-b848e` |
| 2026-07-20 | M3.3 | Idea Dump to Notes implementation started | in-progress | Scope clarified: dual Calendar FABs, Focus Mode hold-to-exit, note creation limited to Focus Mode and Notes screen FAB |
| 2026-07-20 | M3.4 | Focus Mode implementation started | in-progress | Implementing full-screen Focus Mode overlay with active-event countdown and 3-second press-and-hold exit |
| 2026-07-20 | M3.3 | Idea Dump to Notes implementation and validation complete | completed | Notes Firestore service + Notes screen create/list flow + Focus Mode Idea Dump save path; npm test, npx tsc --noEmit, and npm run lint passed |
| 2026-07-20 | M3.4 | Focus Mode implementation and validation complete | completed | Dual Calendar FABs, full-screen Focus Mode, active-event countdown, and 3-second hold-to-exit behavior verified by tests; npm test, npx tsc --noEmit, and npm run lint passed |
| 2026-07-20 | M4.1 | Goals milestone implementation started | in-progress | Roadmap-aligned scope approved: derived next step, disabled AI branch, drag-and-drop reorder, prefilled step scheduling, auto/manual goal completion |
| 2026-07-21 | M4.1-M4.5 | Life Goals core implementation and validation complete | completed | Goals list, manual wizard, goal details, step interactions, and step details validated with npm test (7 suites, 40 tests), goal-specific Jest suites, npx tsc --noEmit, and npm run lint after generated export output was ignored |
| 2026-07-22 | M5.1-M5.4 | Notes and Profile milestone implementation started | in-progress | Approved scope: note edit/delete, unified note detail flow, email/password auth entry with reset password, persisted profile settings, random tips alert, and sound preview via Expo-supported audio APIs |
| 2026-07-22 | M5.1-M5.4 | Notes and Profile automated validation pass | completed | npm test (8 suites, 47 tests), targeted M5 Jest suites, npx tsc --noEmit, npm run lint, and npx expo export --platform web passed |
| 2026-07-22 | M5.1-M5.4 | Notes and Profile milestone accepted | completed | User accepted the implemented Notes/Profile UX including note CRUD, email/password account flows, timezone/locale selectors, Tips & Wisdom modal, and sound preview/settings |
| 2026-07-22 | M6.1-M6.5 | Calendar integrations planning started | in-progress | Added docs/M6_ENGINEERING_TICKETS.md with proposed architecture, ticket breakdown, open questions, and manual prerequisite checklist; implementation remains blocked pending user answers and provider/environment setup decisions |
| 2026-07-26 | M6.1-M6.5 | Calendar integrations implementation authorized | in-progress | User approved provider-canonical mirror model, multi-calendar visibility, automatic two-way sync, provider-wins conflicts, background sync, secured-account-only connections, web + native support, Apple `.ics`-only scope, multi-tenant Microsoft, and Firebase Cloud Functions |
| 2026-07-26 | M6.1-M6.5 | Calendar integrations client foundation and ICS slice validated | in-progress | Added calendar connection types/services/hooks, secured-account-only Profile connection management, provider env readiness messaging, Apple `.ics` import/export/share UI, mirrored ICS import path, and focused Jest coverage; `npx tsc --noEmit`, `npm run lint`, `npx jest src/__tests__/icsInterop.test.ts src/__tests__/ProfileScreen.test.tsx --runInBand` passed |
| 2026-07-28 | M7.1-M7.4 | Tasks milestone implementation started | in-progress | Approved scope: fifth Tasks tab, title + description task model, schedule-to-event prefill, Start Now duration prompt with 30-minute default, auto-complete on conversion, and Calendar Focus Mode handoff |
| 2026-07-28 | M7.1-M7.4 | Tasks milestone initial implementation and automated validation | in-progress | Added Firestore-backed Tasks tab, task CRUD/detail flows, schedule/start-now conversion, completed toggle, Calendar logo tab icon, and Start Now Focus Mode handoff; focused Jest suites, full `npm test`, `npx tsc --noEmit`, and `npm run lint` passed |
| 2026-07-28 | M7.1-M7.4 | Tasks Firestore config and FAB refinement | in-progress | Added committed Firebase CLI config files for Firestore rules and composite indexes, including task access and task list indexing; changed the Tasks FAB to a plus-only button while preserving accessibility |
| 2026-07-28 | M7.1-M7.4 | Tasks milestone accepted and complete | completed | User confirmed live Firestore-backed task creation, scheduling, Start Now, and completed-task behavior are working |
| 2026-07-30 | M8.1 | Premium gate implementation started | in-progress | Scope approved: app identifiers, internal premium paywall shell, and client-side gating for AI goal builder assistant plus Google/Microsoft calendar integrations |
