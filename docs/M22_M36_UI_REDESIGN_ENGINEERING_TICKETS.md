# M22-M36 Bearing UI Redesign Engineering Tickets

## Scope

Deliver the Bearing UI redesign in dependency order while preserving Firebase,
calendar, premium, privacy, telemetry, and Focus behavior. The supplied design
references are visual input only; production screens must use live hook data and
existing persistence services.

## Phase 1-9 Plan Reconciliation

The completed phase records map to the architecture plan as follows:

- Phase 1 / M22, Theme and Icon Infrastructure: completed. The implemented icon system uses
  `react-native-svg`, supplied Bearing PNG assets, and the semantic `AppIcon` registry. The plan's
  earlier `@expo/vector-icons` and MaterialIcons direction was not adopted; do not reintroduce it
  without a new architecture decision.
- Phase 2 / M23, Shared UI Primitives: completed. `AppScreen`, `AppHeader`, `SectionHeader`,
  `Card`, `ProgressBar`, `EmptyState`, `BottomSheet`, and compatibility wrappers are implemented
  and tested.
- Phase 3 / M24, Reusable Domain Presentation: completed. Goal, event, navigation, and create
  presentation are consolidated into domain modules where that preserves the callback-only and
  data-source-agnostic contracts; a one-file-per-prompt-component layout is not required.
- Phase 4 / M25, Foundation Validation: completed. Automated gates and the two-theme foundation
  gallery review passed; native-device evidence remains an explicit manual handoff where recorded.
- Phase 5 / M26, Authentication and Splash: M26.1-M26.7 completed; M26.8 remains
  `manual-handoff` for signed iOS/Android cold and warm starts and native Google rendering.
- Phase 6 / M27, Data Contracts and Persistence: completed, including legacy-safe decoding,
  rules/index compatibility, export/delete coverage, and the process-local Focus decision.
- Phase 7 / M28, Navigation Architecture: completed as an architecture boundary. Typed placeholder
  routes intentionally remain for later feature milestones; their registration is not feature parity.
- Phase 8 / M29, Plan Dashboard: completed with live hook data, state coverage, typed routes, and
  process-local Focus integration.
- Phase 9 / M30, Goals and Tasks: completed with routed Goal Detail, linked task mutations,
  operational timeline rendering, standalone task access, and focused/full validation.

The post-M30 visual alignment commits refine shared presentation surfaces; M31 Calendar and M32
routed creation are complete. Full Focus Mode, Note Editor, and Profile subsection work remain
governed by their later milestones.

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

| Ticket | Status    | Deliverable                                     | Acceptance                                                                                       |
| ------ | --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M22.1  | completed | Persist design-reference images                 | Verified the three supplied PNGs at the required `docs/mockups/` paths                           |
| M22.2  | completed | Install compatible navigation and icon packages | Expo installer added native-stack 7.18.10 and `react-native-svg`; typecheck passes               |
| M22.3  | completed | Define semantic dark and light tokens           | Semantic color/type/spacing/radius/layout/component themes plus dark compatibility aliases       |
| M22.4  | completed | Add persisted theme provider                    | Focused tests cover dark fallback, AsyncStorage restore, hydration, and persistence              |
| M22.5  | completed | Add themed stylesheet helper                    | `useThemedStyles` powers the root and navigation shell without raw colors                        |
| M22.6  | completed | Create icon inventory and assets                | Approved Plan, Goals, Focus, and Notes artwork is extracted as transparent navigation assets     |
| M22.7  | completed | Add typed icon registry and AppIcon             | Custom SVG registry replaces third-party icon fonts; tests cover paths, assets, size, and labels |
| M22.8  | completed | Apply theme to app shell                        | Root, tab shell, and all 45 production former dark-alias consumers use active theme tokens       |

## M23 - Shared UI Primitives

| Ticket | Status    | Deliverable                       | Acceptance                                                                                   |
| ------ | --------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| M23.1  | completed | Build AppScreen                   | Safe areas, keyboard behavior, static/scroll/unmanaged modes, and list boundaries are tested |
| M23.2  | completed | Build AppHeader and SectionHeader | Slots retain fixed 44px actions and stable title geometry                                    |
| M23.3  | completed | Build Card and AppCard wrapper    | Standard, elevated, outlined, and press behavior render without nested-card use              |
| M23.4  | completed | Build ProgressBar and EmptyState  | Values clamp, semantics announce correctly, and optional action works                        |
| M23.5  | completed | Build BottomSheet                 | Dismissal, back handling, safe area, keyboard, and modal accessibility pass                  |
| M23.6  | completed | Adapt legacy primitive APIs       | ScreenHeader, SectionHeading, FAB, and FormField callers remain compatible                   |

## M24 - Reusable Domain Presentation

| Ticket | Status    | Deliverable                         | Acceptance                                                                         |
| ------ | --------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| M24.1  | completed | Build goal presentation components  | Fixture-driven goal progress, cards, status tabs, timeline, and milestones pass    |
| M24.2  | completed | Build TaskRow                       | Row press and completion toggle are independent; optional context renders          |
| M24.3  | completed | Build event presentation components | Event row/card/source chip use caller-provided formatted date/time strings         |
| M24.4  | completed | Build BottomNavigation              | Four content destinations plus Create, safe areas, and wide rail pass              |
| M24.5  | completed | Build create-sheet presentation     | Goal, task, note, and event callbacks have no navigation or Firebase dependency    |
| M24.6  | completed | Test domain components              | Rendering, callbacks, accessibility, geometry, dark fallback, and light theme pass |

## M25 - Foundation Validation

| Ticket | Status    | Deliverable                             | Acceptance                                                                       |
| ------ | --------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| M25.1  | completed | Test theme infrastructure               | Preference, persistence, hydration, and isolated fallback coverage pass          |
| M25.2  | completed | Test icon infrastructure                | Registry, alpha-mask tint, target sizes, and accessibility coverage pass         |
| M25.3  | completed | Test shared primitives                  | Compatibility, interactions, keyboard, busy states, and target sizes pass        |
| M25.4  | completed | Remove foundation raw-color regressions | Foundation audit moved AppModal scrim to a semantic theme token                  |
| M25.5  | completed | Run foundation quality gate             | Typecheck, focused/full Jest, lint, format, rules, and web export pass           |
| M25.6  | completed | Review two-theme primitive gallery      | Dark/light phone, tablet, and wide-web review found and repaired header clipping |

## M26 - Authentication and Splash

**Status:** in-progress

| Ticket | Status         | Deliverable                                  | Acceptance                                                                                 |
| ------ | -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M26.1  | completed      | Audit and export launch artwork              | Transparent launch mark uses sharp approved source, not a square or grid crop              |
| M26.2  | completed      | Configure deterministic native splash        | Dark background and transparent mark are configured in Expo and native rebuild is recorded |
| M26.3  | completed      | Match React bootstrap frame                  | Loading and startup-error surfaces match splash background, mark, and status bar           |
| M26.4  | completed      | Recompose responsive auth shell              | Shared screen, tokens, safe areas, keyboard, and constrained web layout work               |
| M26.5  | completed      | Restyle all auth states                      | Sign-in, registration, reset, conflict, loading, and retry retain current Firebase actions |
| M26.6  | completed      | Replace handmade Google mark                 | Official unmodified Google mark or compliant provider button passes platform checks        |
| M26.7  | completed      | Add password visibility and feedback styling | FormField trailing action and accessible validation/busy feedback work                     |
| M26.8  | manual-handoff | Validate auth and splash                     | Focused auth tests, web check, and iOS/Android cold/warm-start evidence pass               |

## M27 - Data Contracts and Persistence

| Ticket | Status    | Deliverable                             | Acceptance                                                                          |
| ------ | --------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| M27.1  | completed | Extend task contracts                   | Nullable links, due/schedule/all-day fields decode legacy documents and round-trip  |
| M27.2  | completed | Expose event sourceTaskId               | Event serialization and decoding retain nullable task provenance                    |
| M27.3  | completed | Add note pinned field                   | Missing legacy value is false; mutations and sorting preserve pinned behavior       |
| M27.4  | completed | Confirm operational goal-step timeline  | One GoalStepRecord source is used; no parallel editable milestone tree remains      |
| M27.5  | completed | Decide Focus persistence                | Persist smallest required session model or document process-local decision          |
| M27.6  | completed | Deploy-compatible backend updates       | Services, export/delete, rules, indexes, docs, and emulator tests cover all fields  |
| M27.7  | completed | Validate compatibility and deploy order | Round trips pass and rules/indexes deployment precedes field-writing client release |

## M28 - Navigation Architecture

| Ticket | Status    | Deliverable                             | Acceptance                                                                  |
| ------ | --------- | --------------------------------------- | --------------------------------------------------------------------------- |
| M28.1  | completed | Define typed navigation contracts       | Tab, stack, and modal parameter lists compile                               |
| M28.2  | completed | Add nested native stacks                | Plan, Calendar, Notes, and Profile retain stack state where supported       |
| M28.3  | completed | Intercept Create destination            | Create opens the global sheet and is never selected as a content tab        |
| M28.4  | completed | Add typed detail and settings routes    | Every named detail, editor, settings, and Focus route has explicit params   |
| M28.5  | completed | Preserve responsive and legacy behavior | Wide rail, return targets, deep-link-ready params, and legacy parity remain |
| M28.6  | completed | Test navigation contracts               | Selection, interception, nested state, modal routes, and web rail pass      |

## M29 - Plan Dashboard

| Ticket | Status    | Deliverable                    | Acceptance                                                                         |
| ------ | --------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| M29.1  | completed | Add Plan route and composition | Plan uses shared components and real hooks only                                    |
| M29.2  | completed | Add contextual Plan header     | Greeting boundary and profile/overflow action are tested                           |
| M29.3  | completed | Add today events preview       | Chronological live events are limited to three through five with More Events route |
| M29.4  | completed | Add Focus card states          | Inactive, contextual, and active session actions route correctly                   |
| M29.5  | completed | Add active-goal preview        | Up to three live goals, View All, and all data states work                         |
| M29.6  | completed | Add Idea Dump count/action     | Existing note data supplies count and direct capture route                         |
| M29.7  | completed | Validate Plan states           | Composition, ordering, routes, and responsive layouts pass                         |

## M30 - Goals and Tasks

**Status:** completed

| Ticket | Status    | Deliverable                      | Acceptance                                                                       |
| ------ | --------- | -------------------------------- | -------------------------------------------------------------------------------- |
| M30.1  | completed | Restyle Goals List               | Current maps to persisted active and all three filters have deterministic states |
| M30.2  | completed | Add goal list actions and states | Goal cards, Create Goal, and loading/empty/error states use shared components    |
| M30.3  | completed | Route Goal Detail                | Tasks and Timeline tabs replace modal only after mutation parity                 |
| M30.4  | completed | Link tasks to goals and steps    | Next Up/task lists support all required mutations and display context            |
| M30.5  | completed | Render operational timeline      | Ordered steps show state and linked tasks without duplicate milestone data       |
| M30.6  | completed | Preserve standalone task access  | Plan and Create can open unlinked task flows                                     |
| M30.7  | completed | Validate goals and tasks         | Filters, mutations, ordering, and navigation tests pass                          |

## M31 - Calendar

| Ticket | Status    | Deliverable                 | Acceptance                                                                          |
| ------ | --------- | --------------------------- | ----------------------------------------------------------------------------------- |
| M31.1  | completed | Restyle Calendar modes      | Day/month share components; week remains wide-web-only                              |
| M31.2  | completed | Distinguish event sources   | Bearing, device, task, and milestone indicators have non-color labels               |
| M31.3  | completed | Preserve calendar semantics | Date, recurrence, alarm, timezone, availability, location, and URL behavior remains |
| M31.4  | completed | Add month agenda            | Selected date agenda uses EventRow and preserves selection behavior                 |
| M31.5  | completed | Route Calendar Sources      | Source controls move from main Calendar into typed route                            |
| M31.6  | completed | Migrate event presentation  | Detail/create preserve publication, reconciliation, retry, and permission behavior  |
| M31.7  | completed | Validate Calendar           | Transitions, sources, publication, and responsive tests pass                        |

## M32 - Global Creation Flows

| Ticket | Status    | Deliverable                          | Acceptance                                                                        |
| ------ | --------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| M32.1  | completed | Route global create choices          | Every sheet choice opens a typed modal and returns context after success          |
| M32.2  | completed | Rebuild goal creation steps          | SMART, definition, target, AI/manual, review, and create are separately navigable |
| M32.3  | completed | Preserve optional AI planning drafts | Draft survives paywall outcomes and uses current AI/premium services              |
| M32.4  | completed | Extend task creation                 | Optional links and progressively disclosed date/schedule/all-day fields persist   |
| M32.5  | completed | Optimize note creation               | Quick capture supports title, body, and source metadata                           |
| M32.6  | completed | Align event creation                 | Event fields and source behavior retain Calendar semantics                        |
| M32.7  | completed | Validate creation routes             | Unsaved changes, validation, keyboard, success, error, and cancel tests pass      |

## M33 - Focus Mode

| Ticket | Status      | Deliverable                          | Acceptance                                                                |
| ------ | ----------- | ------------------------------------ | ------------------------------------------------------------------------- |
| M33.1  | not-started | Extract Focus behavior to route      | Timer, Idea Dump, hold exit, audio, and DND retain tested semantics       |
| M33.1  | completed | Extract Focus behavior to route      | Plan-owned FocusMode route reuses the tested timer, Idea Dump, hold exit, audio, and DND overlay behavior |
| M33.2  | completed | Add contextual Focus start state     | Plan, Calendar, and Tasks hand off typed event/task context with title and planned end before Start |
| M33.3  | completed | Build active Focus hierarchy         | Full-screen active overlay shows countdown, end time, Idea Dump, utility actions, and truthful DND state |
| M33.4  | completed | Remove bypass controls               | Native modal dismissal is suppressed and active route removal is prevented; hold exit is the only in-app exit |
| M33.5  | completed | Save Idea Dump in place              | Existing `idea_dump` note metadata is preserved; saves clear input and show Saved/count feedback in place |
| M33.6  | completed | Add details and supported settings   | Session Details and Focus Settings expose only informational/profile/Android DND behavior already supported |
| M33.7  | completed | Implement hold-only exit and summary | Three-second hold progress cancels on release/interruption and completion shows duration, ideas, and applicable DND status |
| M33.8  | completed | Validate Focus                       | 62 mobile suites and 432 tests pass with typecheck, lint, touched-file Prettier, and diff checks |

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

| Date       | Tickets             | Result         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | M22-M36             | planned        | Ticket decomposition created from the approved UI redesign architecture. No implementation has started.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-05 | M22.2-M22.7         | passed         | `npm run typecheck`; focused ThemeProvider, AppIcon, and AppTabs Jest tests pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-05 | M22.1, M22.8        | open           | Reference PNG binaries require attachment handoff; remaining legacy token consumers use compatibility aliases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-05 | M22.1, M22.6, M22.8 | passed         | Mockups persisted; six transparent density assets generated; no production dark-alias imports; full Jest, typecheck, and lint pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-05 | M23.1-M23.6         | passed         | `npm test -- --runInBand src/components/ui/AppScreen.test.tsx src/components/ui/M23Primitives.test.tsx src/__tests__/uiPrimitives.test.tsx` (20 tests); `npm run typecheck`; `npm run lint`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-05 | M24.1-M24.6         | passed         | `npm test -- --runInBand src/components/presentation/DomainPresentation.test.tsx` (6 tests); `npm run typecheck`; `npm run lint`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-05 | M25.1-M25.6         | passed         | Focused foundation Jest suites (40 tests), Firestore rules (16 tests), web export, and dark/light gallery review at 390x844, 768x1024, and 1440x900 pass; empty AppHeader slot clipping was repaired.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-06 | M26.1               | passed         | `file mobile/assets/launch-mark.png`; alpha range `0` to `1`; 1024x1024 dark-background composite review passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-06 | M26.2               | passed         | `mobile/node_modules/.bin/expo config --type public`; `mobile/node_modules/.bin/expo prebuild --no-install`; splash resolves to `launch-mark.png` on `#0B162E`; device cold/warm-start proof remains manual handoff.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-06 | M26.3               | passed         | `npm test -- --runInBand src/__tests__/App.smoke.test.tsx` (6 tests); `npx eslint src/components/auth/AuthShell.tsx`; `get_errors` reports no errors; loading and startup-error states use the transparent mark.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-06 | M26.4               | passed         | Existing `App.tsx` shell uses safe areas, keyboard avoidance, scroll boundaries, and a centered `maxWidth: 560`; auth smoke suite passed across signed-out and startup states.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-06 | M26.6               | passed         | The themed app-owned button now uses the supplied `assets/icons/google.png` mark on native, web, and loading states; dark-mode label contrast is theme-controlled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-06 | M26.7               | passed         | `npm test -- --runInBand src/__tests__/App.smoke.test.tsx` (7 tests); `npx eslint src/design/icons.ts src/components/auth/SignedOutAuth.tsx src/__tests__/App.smoke.test.tsx`; `npm run typecheck`; accessible password visibility works through `FormField`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-06 | M26.5               | passed         | `npm test -- --runInBand src/__tests__/App.smoke.test.tsx` (8 tests) covers sign-in, registration, reset, conflict recovery, loading, startup retry, and preserved Firebase actions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-06 | M26.8               | manual-handoff | Repository auth tests, lint, typecheck, Expo config/prebuild, and web export pass; owner must record signed Android/iOS cold and warm starts plus native Google button rendering.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-06 | M27.1               | passed         | `npm --prefix mobile test -- --runInBand src/features/tasks/taskDecoder.test.ts src/features/tasks/taskPersistence.test.ts`; `npm --prefix mobile test -- --runInBand src/__tests__/TasksScreen.test.tsx src/components/presentation/DomainPresentation.test.tsx`; `npm --prefix mobile run typecheck`; touched-file ESLint passed with two pre-existing import-duplication warnings in `FoundationGallery.tsx`. References: `docs/UX_V2_FLOW_MAP_AND_SPEC.md`, `docs/mockups/`, and `docs/DATA_MODEL_SPEC.md`.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-06 | M27.2               | passed         | `npm test -- --runInBand src/__tests__/firebaseEvents.legacy.test.ts src/__tests__/taskConversionService.test.ts` (9 tests); event provenance is typed, serialized, atomically written during task conversion, and legacy-safe decoded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-09-06 | M27.3               | passed         | `npm test -- --runInBand src/features/notes/noteDecoder.test.ts src/features/notes/noteSorting.test.ts src/__tests__/NotesScreen.test.tsx` (9 tests); legacy notes default `pinned` to `false`, writes preserve explicit pin state, and subscription ordering is deterministic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-06 | M27.4               | passed         | `npm test -- --runInBand src/features/goals/goalHelpers.test.ts`; `GoalStepRecord` remains the only operational timeline. `aiMilestones` are retained as read-only accepted AI-plan metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-06 | M27.5               | passed         | Focus remains process-local: the UX spec requires an active overlay countdown and in-session Idea Dump, but does not require restart restoration or a persisted session identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-06 | M27.6-M27.7         | passed         | `npm run test:rules` (16 emulator tests); full mobile Jest (57 suites, 410 tests); mobile typecheck; touched-slice lint (0 errors, 2 pre-existing `FoundationGallery.tsx` warnings); Functions build/tests and format check; existing privacy/export/deletion collection coverage and ownership rules remain compatible. Deployment handoff: deploy `firestore.rules` and `firestore.indexes.json` before releasing clients that write the additive fields; no speculative index was added because no new query requires one.                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-07 | M28.1-M28.6         | passed         | `npm run typecheck`; full mobile Jest (57 suites, 411 tests); focused AppTabs, CalendarNavigation, GoalsScreen, TasksScreen, NotesScreen, and CalendarScreen suites; `npm run lint` (0 errors, 2 pre-existing `FoundationGallery.tsx` warnings). Nested Plan, Calendar, Notes, and Profile native stacks, typed detail/settings/Focus params, Create-sheet interception, responsive rail behavior, and legacy Focus/modal flows are covered.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-07 | M29.1-M29.7         | passed         | Plan uses live profile, calendar, goals, and notes hooks; chronological five-event preview, contextual and active process-local Focus states, goal preview, Idea Dump count, recovery states, and typed routes are covered by `src/__tests__/PlanScreen.test.tsx`. Focus overlay timer/DND suites remain green. Full mobile Jest (58 suites, 416 tests), `npm run typecheck`, `npm run lint`, targeted Prettier check, and `git diff --check` pass. Focus remains process-local per M27.5; the dashboard reads the active session while the app is running and does not promise restart restoration.                                                                                                                                                                                                                                                                                                                            |
| 2026-09-07 | M30.1-M30.7         | passed         | `npm --prefix mobile test -- --runInBand` (59 suites, 420 tests); `npm --prefix mobile run typecheck`; `npm --prefix mobile run lint`; focused Goal Detail, Goals, Tasks, Plan, and presentation suites (30 tests). Current maps to persisted `active`, Completed and Archived are deterministic, Goal Detail owns Tasks/Timeline tabs, linked task mutations preserve `goalId`/`stepId`, operational steps remain the timeline source, and Plan/Create retain standalone task entry points. Implementation follows `docs/UX_V2_FLOW_MAP_AND_SPEC.md` Goals List and Goal Detail sections plus the supplied references in `docs/mockups/`.                                                                                                                                                                                                                                                                                      |
| 2026-09-07 | M31.1-M31.7         | passed         | Calendar month selection now keeps the selected-date agenda visible; EventRow and timeline blocks expose Task, Milestone, Event, and Imported event labels; Calendar Sources is a live typed route backed by `useDeviceCalendars`; existing publication, reconciliation, retry, recurrence, alarm, timezone, availability, location, and URL behavior remains intact. Full mobile Jest (60 suites, 423 tests), focused Calendar/Sources suites, `npm --prefix mobile run typecheck`, `npm --prefix mobile run lint`, touched-file Prettier check, and `git diff --check` pass. References: `docs/UX_V2_FLOW_MAP_AND_SPEC.md` Calendar section and `docs/mockups/bearing-ui-overview.png`, `docs/mockups/bearing-ui-screen-flows.png`.                                                                                                                                                                                           |
| 2026-09-08 | M32.1-M32.7         | passed         | Global Create now routes Goal, Task, Note, and Event actions to typed route-owned screens while contextual list modals remain intact. Existing goal SMART/AI/premium wizard and EventForm semantics are reused; task links plus optional due date, scheduled range, and all-day fields persist through existing task mutations; notes retain explicit source metadata. Focused route/sheet tests pass (2 suites, 13 tests); full mobile Jest passes (61 suites, 431 tests); `npm --prefix mobile run typecheck`; project-local ESLint; touched-file Prettier; and `git diff --check` pass. References: `docs/UX_V2_FLOW_MAP_AND_SPEC.md` Global Create, Goals, Tasks, Notes, and Calendar sections; `docs/mockups/bearing-ui-overview.png`, `docs/mockups/bearing-ui-screen-flows.png`, and `docs/mockups/bearing-ui-icon-library.png`. Commit subject follows `docs/COMMIT_CONVENTIONS.md`: `type(scope): imperative message`. |
| 2026-09-08 | M33.1-M33.8         | passed         | Plan-owned FocusMode route now owns contextual start, active timer hierarchy, Idea Dump confirmation/count, truthful DND status, Session Details/Focus Settings, hold-only exit, interruption cancellation, and completion summary; Calendar and Tasks handoffs use typed context while Firebase, audio, and note source semantics remain intact. Focused M33 validation passes (7 suites, 38 tests); full mobile Jest passes (62 suites, 432 tests); `npm --prefix mobile run typecheck`; `npm --prefix mobile run lint`; touched-file `npx prettier --check`; and `git diff --check` pass. References: Focus Mode sections 17-20 and Idea Dump source guidance in `docs/UX_V2_FLOW_MAP_AND_SPEC.md`; panels 14A-14E in `docs/mockups/bearing-ui-screen-flows.png`; commit format in `docs/COMMIT_CONVENTIONS.md`: `type(scope): imperative message`. |
