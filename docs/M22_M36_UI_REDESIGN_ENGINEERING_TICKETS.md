# M22-M36 Bearing UI Redesign Engineering Tickets

## Scope

Deliver the Bearing UI redesign in dependency order while preserving Firebase,
calendar, premium, privacy, telemetry, and Focus behavior. The supplied design
references are visual input only; production screens must use live hook data and
existing persistence services.

## Status and Update Protocol

1. Before implementation, set one leaf ticket to `in-progress` in this file.
2. Complete one ticket only when its stated acceptance check passes. Record the
   exact command, test, screenshot review, or owner evidence in the validation
   log on the same change.
3. Mark external console, native-device, branding, or store work as
   `manual-handoff`; name the required evidence.
4. Update the parent milestone status in `ROADMAP.md` and `PROJECT_PLAN.md`
   when its first ticket starts and when all its tickets close.
5. A blocked ticket must name the blocking dependency and may not be bypassed
   by starting a dependent ticket.

## Milestone Dependencies

`M22 -> M23 -> M24 -> M25 -> M26 -> M27 -> M28 -> M29 -> M30 -> M31 -> M32 -> M33 -> M34 -> M35 -> M36`.

M27 data deployment must finish before M30-M32 write the new fields. M28 must
finish before M29-M35 replace a legacy route or modal. M25 is a hard gate: no
auth, navigation, or feature-screen redesign begins before it passes.

## M22 - Theme and Icon Infrastructure

| Ticket | Status      | Deliverable                                     | Acceptance                                                                           |
| ------ | ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| M22.1  | not-started | Persist design-reference images                 | Three supplied images exist under `docs/mockups/` with documented source purpose     |
| M22.2  | not-started | Install compatible navigation and icon packages | Lockfile and typecheck prove SDK-compatible packages resolve                         |
| M22.3  | not-started | Define semantic dark and light tokens           | Tokens cover color, type, spacing, radius, layout, and compatibility aliases         |
| M22.4  | not-started | Add persisted theme provider                    | Dark default, AsyncStorage restore, hydration, and provider-free fallback are tested |
| M22.5  | not-started | Add themed stylesheet helper                    | A component creates styles from active semantic tokens without raw colors            |
| M22.6  | not-started | Create icon inventory and assets                | Registry decision table identifies vector versus custom assets at target size        |
| M22.7  | not-started | Add typed icon registry and AppIcon             | Every semantic icon renders at requested size with tint and accessible labeling      |
| M22.8  | not-started | Apply theme to app shell                        | Provider, status bar, and existing token consumers resolve in both themes            |

## M23 - Shared UI Primitives

| Ticket | Status      | Deliverable                       | Acceptance                                                                      |
| ------ | ----------- | --------------------------------- | ------------------------------------------------------------------------------- |
| M23.1  | not-started | Build AppScreen                   | Safe areas, keyboard behavior, scroll mode, and unmanaged list mode are tested  |
| M23.2  | not-started | Build AppHeader and SectionHeader | Slots retain fixed 44px actions and stable title geometry                       |
| M23.3  | not-started | Build Card and AppCard wrapper    | Standard, elevated, outlined, and press behavior render without nested-card use |
| M23.4  | not-started | Build ProgressBar and EmptyState  | Values clamp, semantics announce correctly, and optional action works           |
| M23.5  | not-started | Build BottomSheet                 | Dismissal, back handling, safe area, keyboard, and modal accessibility pass     |
| M23.6  | not-started | Adapt legacy primitive APIs       | ScreenHeader, SectionHeading, FAB, and FormField callers remain compatible      |

## M24 - Reusable Domain Presentation

| Ticket | Status      | Deliverable                         | Acceptance                                                                      |
| ------ | ----------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| M24.1  | not-started | Build goal presentation components  | Goal progress, cards, status tabs, timeline, and milestones use fixtures only   |
| M24.2  | not-started | Build TaskRow                       | Row press and completion toggle are independent and optional context renders    |
| M24.3  | not-started | Build event presentation components | Event row/card/source chip use caller-provided locale and timezone strings      |
| M24.4  | not-started | Build BottomNavigation              | Five destinations, Create interception contract, safe areas, and wide rail pass |
| M24.5  | not-started | Build create-sheet presentation     | Goal, task, note, and event callbacks have no navigation or Firebase dependency |
| M24.6  | not-started | Test domain components              | Rendering, callbacks, accessibility, geometry, and both themes pass             |

## M25 - Foundation Validation

| Ticket | Status      | Deliverable                             | Acceptance                                                                           |
| ------ | ----------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| M25.1  | not-started | Test theme infrastructure               | Preference, persistence, hydration, and isolated fallback coverage passes            |
| M25.2  | not-started | Test icon infrastructure                | Registry entries, assets, tint, density, sizes, and accessibility pass               |
| M25.3  | not-started | Test shared primitives                  | Compatibility, interactions, keyboard, busy states, and target sizes pass            |
| M25.4  | not-started | Remove foundation raw-color regressions | Token-consumer audit finds no new component raw colors                               |
| M25.5  | not-started | Run foundation quality gate             | Typecheck, focused/full Jest, lint, format, rules, and web export pass               |
| M25.6  | not-started | Review two-theme primitive gallery      | Phone, tablet, and web screenshots show no clipping, contrast, or asset-edge defects |

## M26 - Authentication and Splash

| Ticket | Status      | Deliverable                                  | Acceptance                                                                                 |
| ------ | ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M26.1  | not-started | Audit and export launch artwork              | Transparent launch mark uses sharp approved source, not a square or grid crop              |
| M26.2  | not-started | Configure deterministic native splash        | Dark background and transparent mark are configured in Expo and native rebuild is recorded |
| M26.3  | not-started | Match React bootstrap frame                  | Loading and startup-error surfaces match splash background, mark, and status bar           |
| M26.4  | not-started | Recompose responsive auth shell              | Shared screen, tokens, safe areas, keyboard, and constrained web layout work               |
| M26.5  | not-started | Restyle all auth states                      | Sign-in, registration, reset, conflict, loading, and retry retain current Firebase actions |
| M26.6  | not-started | Replace handmade Google mark                 | Official unmodified Google mark or compliant provider button passes platform checks        |
| M26.7  | not-started | Add password visibility and feedback styling | FormField trailing action and accessible validation/busy feedback work                     |
| M26.8  | not-started | Validate auth and splash                     | Focused auth tests, web check, and iOS/Android cold/warm-start evidence pass               |

## M27 - Data Contracts and Persistence

| Ticket | Status      | Deliverable                             | Acceptance                                                                          |
| ------ | ----------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| M27.1  | not-started | Extend task contracts                   | Nullable links, due/schedule/all-day fields decode legacy documents and round-trip  |
| M27.2  | not-started | Expose event sourceTaskId               | Event serialization and decoding retain nullable task provenance                    |
| M27.3  | not-started | Add note pinned field                   | Missing legacy value is false; mutations and sorting preserve pinned behavior       |
| M27.4  | not-started | Confirm operational goal-step timeline  | One GoalStepRecord source is used; no parallel editable milestone tree remains      |
| M27.5  | not-started | Decide Focus persistence                | Persist smallest required session model or document process-local decision          |
| M27.6  | not-started | Deploy-compatible backend updates       | Services, export/delete, rules, indexes, docs, and emulator tests cover all fields  |
| M27.7  | not-started | Validate compatibility and deploy order | Round trips pass and rules/indexes deployment precedes field-writing client release |

## M28 - Navigation Architecture

| Ticket | Status      | Deliverable                             | Acceptance                                                                  |
| ------ | ----------- | --------------------------------------- | --------------------------------------------------------------------------- |
| M28.1  | not-started | Define typed navigation contracts       | Tab, stack, and modal parameter lists compile                               |
| M28.2  | not-started | Add nested native stacks                | Plan, Calendar, Notes, and Profile retain stack state where supported       |
| M28.3  | not-started | Intercept Create destination            | Create opens the global sheet and is never selected as a content tab        |
| M28.4  | not-started | Add typed detail and settings routes    | Every named detail, editor, settings, and Focus route has explicit params   |
| M28.5  | not-started | Preserve responsive and legacy behavior | Wide rail, return targets, deep-link-ready params, and legacy parity remain |
| M28.6  | not-started | Test navigation contracts               | Selection, interception, nested state, modal routes, and web rail pass      |

## M29 - Plan Dashboard

| Ticket | Status      | Deliverable                    | Acceptance                                                                         |
| ------ | ----------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| M29.1  | not-started | Add Plan route and composition | Plan uses shared components and real hooks only                                    |
| M29.2  | not-started | Add contextual Plan header     | Greeting boundary and profile/overflow action are tested                           |
| M29.3  | not-started | Add today events preview       | Chronological live events are limited to three through five with More Events route |
| M29.4  | not-started | Add Focus card states          | Inactive, contextual, and active session actions route correctly                   |
| M29.5  | not-started | Add active-goal preview        | Up to three live goals, View All, and all data states work                         |
| M29.6  | not-started | Add Idea Dump count/action     | Existing note data supplies count and direct capture route                         |
| M29.7  | not-started | Validate Plan states           | Composition, ordering, routes, and responsive layouts pass                         |

## M30 - Goals and Tasks

| Ticket | Status      | Deliverable                      | Acceptance                                                                       |
| ------ | ----------- | -------------------------------- | -------------------------------------------------------------------------------- |
| M30.1  | not-started | Restyle Goals List               | Current maps to persisted active and all three filters have deterministic states |
| M30.2  | not-started | Add goal list actions and states | Goal cards, Create Goal, and loading/empty/error states use shared components    |
| M30.3  | not-started | Route Goal Detail                | Tasks and Timeline tabs replace modal only after mutation parity                 |
| M30.4  | not-started | Link tasks to goals and steps    | Next Up/task lists support all required mutations and display context            |
| M30.5  | not-started | Render operational timeline      | Ordered steps show state and linked tasks without duplicate milestone data       |
| M30.6  | not-started | Preserve standalone task access  | Plan and Create can open unlinked task flows                                     |
| M30.7  | not-started | Validate goals and tasks         | Filters, mutations, ordering, and navigation tests pass                          |

## M31 - Calendar

| Ticket | Status      | Deliverable                 | Acceptance                                                                          |
| ------ | ----------- | --------------------------- | ----------------------------------------------------------------------------------- |
| M31.1  | not-started | Restyle Calendar modes      | Day/month share components; week remains wide-web-only                              |
| M31.2  | not-started | Distinguish event sources   | Bearing, device, task, and milestone indicators have non-color labels               |
| M31.3  | not-started | Preserve calendar semantics | Date, recurrence, alarm, timezone, availability, location, and URL behavior remains |
| M31.4  | not-started | Add month agenda            | Selected date agenda uses EventRow and preserves selection behavior                 |
| M31.5  | not-started | Route Calendar Sources      | Source controls move from main Calendar into typed route                            |
| M31.6  | not-started | Migrate event presentation  | Detail/create preserve publication, reconciliation, retry, and permission behavior  |
| M31.7  | not-started | Validate Calendar           | Transitions, sources, publication, and responsive tests pass                        |

## M32 - Global Creation Flows

| Ticket | Status      | Deliverable                          | Acceptance                                                                        |
| ------ | ----------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| M32.1  | not-started | Route global create choices          | Every sheet choice opens a typed modal and returns context after success          |
| M32.2  | not-started | Rebuild goal creation steps          | SMART, definition, target, AI/manual, review, and create are separately navigable |
| M32.3  | not-started | Preserve optional AI planning drafts | Draft survives paywall outcomes and uses current AI/premium services              |
| M32.4  | not-started | Extend task creation                 | Optional links and progressively disclosed date/schedule/all-day fields persist   |
| M32.5  | not-started | Optimize note creation               | Quick capture supports title, body, and source metadata                           |
| M32.6  | not-started | Align event creation                 | Event fields and source behavior retain Calendar semantics                        |
| M32.7  | not-started | Validate creation routes             | Unsaved changes, validation, keyboard, success, error, and cancel tests pass      |

## M33 - Focus Mode

| Ticket | Status      | Deliverable                          | Acceptance                                                                |
| ------ | ----------- | ------------------------------------ | ------------------------------------------------------------------------- |
| M33.1  | not-started | Extract Focus behavior to route      | Timer, Idea Dump, hold exit, audio, and DND retain tested semantics       |
| M33.2  | not-started | Add contextual Focus start state     | Event/task context and planned end time are explicit before start         |
| M33.3  | not-started | Build active Focus hierarchy         | Countdown, end time, Idea Dump, and truthful distraction state render     |
| M33.4  | not-started | Remove bypass controls               | No UI, back, gesture, or modal dismiss bypasses hold-to-exit              |
| M33.5  | not-started | Save Idea Dump in place              | Note saves, confirmation, count, clear, and focus return work             |
| M33.6  | not-started | Add details and supported settings   | Informational details and truthful supported preferences are labeled      |
| M33.7  | not-started | Implement hold-only exit and summary | Three-second progress/cancel/completion and summary route work            |
| M33.8  | not-started | Validate Focus                       | Timer, lifecycle, DND, audio, exit, summary, and accessibility tests pass |

## M34 - Notes

| Ticket | Status      | Deliverable                     | Acceptance                                                                        |
| ------ | ----------- | ------------------------------- | --------------------------------------------------------------------------------- |
| M34.1  | not-started | Restyle Notes List              | Search/filter controls and compact NoteCard layout work                           |
| M34.2  | not-started | Define note section ordering    | Pinned, Recent, and All membership avoids unintended duplicates                   |
| M34.3  | not-started | Route Note Editor               | Create, update, archive, and delete parity replaces detail modal                  |
| M34.4  | not-started | Confirm editor formatting scope | Plain text remains unless existing editor supports formatting without a new model |
| M34.5  | not-started | Add note conversion drafts      | Task, goal, and event drafts are editable before commit                           |
| M34.6  | not-started | Validate Notes                  | Search, pins, drafts, conversion, confirmation, and data states pass              |

## M35 - Profile and Settings

| Ticket | Status      | Deliverable                             | Acceptance                                                                         |
| ------ | ----------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| M35.1  | not-started | Recompose Profile groups                | Account, services, preferences, billing, legal, and actions use shared primitives  |
| M35.2  | not-started | Route profile subsections               | Dense controls move to typed routes while status remains visible                   |
| M35.3  | not-started | Preserve all profile behavior           | Account, calendar, purchase, credits, privacy, legal, and logout remain reachable  |
| M35.4  | not-started | Wire appearance preference              | ThemeProvider is the only theme state and persistence is visible                   |
| M35.5  | not-started | Add truthful status and danger handling | Connection/subscription status and destructive actions are accurate and restrained |
| M35.6  | not-started | Validate Profile                        | Navigation, persistence, status, errors, and responsive tests pass                 |

## M36 - Responsive, Accessibility, and Release Polish

| Ticket | Status      | Deliverable                       | Acceptance                                                                                            |
| ------ | ----------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| M36.1  | not-started | Audit required UI states          | Redesigned screens cover loading, empty, error, offline, permission, disabled, and destructive states |
| M36.2  | not-started | Complete accessibility audit      | Dynamic Type, targets, names, focus, live regions, keyboard, motion, and contrast pass                |
| M36.3  | not-started | Complete responsive visual review | Both themes are reviewed on phones, tablet, and wide web                                              |
| M36.4  | not-started | Profile expensive rendering       | List/timeline jank is measured and only demonstrated regressions are fixed                            |
| M36.5  | not-started | Run complete release quality gate | Mobile tests, typecheck, lint, format, rules, web export, and representative native builds pass       |
| M36.6  | not-started | Reconcile release documents       | Model, deployment, release, and platform-limit documentation is current                               |

## Validation Log

| Date       | Tickets | Result  | Evidence                                                                                                |
| ---------- | ------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | M22-M36 | planned | Ticket decomposition created from the approved UI redesign architecture. No implementation has started. |
