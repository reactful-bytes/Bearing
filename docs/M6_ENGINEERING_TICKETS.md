# M6 Native Device Calendar Engineering Tickets

## Scope

Replace direct Google, Microsoft, and iCloud integrations with native iOS/Android calendar access through Expo SDK 57 `expo-calendar`. Device accounts remain owned and synchronized by the operating system. Bearing never receives provider credentials, calls provider APIs, or mirrors device-originated events into Firestore.

## Approved Product Contract

- System-calendar access is free core functionality.
- Bearing-owned events remain canonical in Firestore and editable from every signed-in device.
- Device-originated events are queried live for the visible range and are not persisted in Bearing cloud data.
- Each device selects visible calendars and one writable default calendar locally.
- Calendar permission denial leaves the complete Firestore-only experience usable.
- A default-off checkbox may publish a new Bearing event to the configured writable calendar.
- Linked copies use an opaque marker and last-common-state hash in event notes plus a local device-ID cache.
- System-only edits update the Bearing record. Simultaneous edits use the system-calendar version.
- Confirmed deletion of a linked system copy marks the Bearing event unpublished; it does not delete Firestore data.
- Writable ordinary and recurring device events are edited in Bearing when the native API supports the operation.
- Invitations, attendees, RSVP/organizer actions, conference links, and reminders are excluded from v1.
- ICS import is removed. Bearing-owned JSON and ICS export remain available generally and before account deletion.
- Production web calendar support is excluded. `expo-calendar` requires native development builds and is unavailable in Expo Go.

## Architecture Boundaries

1. `deviceCalendarAdapter` is the only module that imports `expo-calendar`.
2. `deviceCalendarStorage` namespaces preferences and native ID caches by Firebase UID in AsyncStorage.
3. Firestore stores Bearing events only. Native calendar IDs are never portable Firestore identifiers.
4. `calendarReconciliation` is pure, deterministic logic tested without native APIs.
5. `useCalendarEvents` aggregates a Firestore subscription with bounded native range queries.
6. Calendar provider OAuth, secrets, tokens, Cloud Functions, schedulers, webhooks, mirrors, and provider diagnostics do not exist in the active architecture.

## Execution Order

1. M6.6 remove obsolete provider and ICS-import code.
2. M6.7 install/configure native dependencies and build the adapter.
3. M6.8 add per-device settings.
4. M6.9 add event models and live aggregation.
5. M6.10 add complete event editing.
6. M6.11 add optional publishing and reconciliation.
7. M6.12 finish general ICS export.
8. M6.13 complete native and cross-device validation.

## M6.6 Obsolete Integration Removal

| Ticket | Deliverable                                                                                                 | Acceptance                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| M6.6a  | Remove provider connection types, hooks, Firebase services, environment checks, Profile controls, and tests | No runtime code or environment variable references Google/Microsoft calendar connectivity |
| M6.6b  | Remove ICS parser, file picker/import UI, and mirrored-event creation                                       | No import action remains; existing export entry remains available                         |
| M6.6c  | Normalize legacy `ics_import` records as Bearing-owned events and retire provider-only fields               | Existing imported events remain readable/editable; migration is idempotent                |
| M6.6d  | Remove calendar premium gates and paywall copy                                                              | Free and anonymous users may request device calendar access                               |

## M6.7 Module, Permissions, And Adapter

| Ticket | Deliverable                                                                           | Acceptance                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| M6.7a  | Install `expo-calendar` and AsyncStorage; configure plugin and native permission copy | Prebuild/config inspection contains iOS full access and Android read/write permissions                                         |
| M6.7b  | Wrap SDK 57 object APIs                                                               | Adapter uses `getCalendars`, `listEvents`, calendar `createEvent`, and event `update`/`delete`; no deprecated `*Async` methods |
| M6.7c  | Add platform guard and injectable fake                                                | Jest/web return explicit unavailable state without importing an unsupported implementation                                     |
| M6.7d  | Model permission lifecycle and settings recovery                                      | Undetermined, granted, denied, blocked, and unavailable states have deterministic UI/actions                                   |
| M6.7e  | Document development-build workflow                                                   | iOS and Android development builds install and reach the permission prompt outside Expo Go                                     |

## M6.8 Per-Device Calendar Settings

| Ticket | Deliverable                                       | Acceptance                                                                                                             |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| M6.8a  | Normalize discovered calendars                    | ID, title, color, source label, visibility, primary/sync/access state, and modification capability are available       |
| M6.8b  | Persist account-scoped preferences                | Selected IDs, default writable ID, and link mappings do not leak across Firebase accounts                              |
| M6.8c  | Replace provider UI with system calendar settings | Profile supports permission request, visible-calendar selection, writable default, refresh, and open-settings recovery |
| M6.8d  | Validate stored choices                           | Missing/read-only destinations disable publication without blocking Bearing event creation                             |
| M6.8e  | Handle auth lifecycle                             | Sign-out/account switch isolates state; account deletion purges that UID's local calendar data                         |

## M6.9 Event Model And Aggregation

| Ticket | Deliverable                                                                           | Acceptance                                                                                                         |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| M6.9a  | Discriminated `BearingEvent`, `DeviceCalendarEvent`, and `CalendarDisplayEvent` types | Ownership controls available actions without provider source strings                                               |
| M6.9b  | Add full event fields                                                                 | Existing records receive safe defaults for all-day, location, recurrence, alarms, availability, and URL            |
| M6.9c  | Query selected calendars for visible range                                            | Timed, all-day, recurring, canceled, read-only, color, and source data normalize correctly                         |
| M6.9d  | Merge and deduplicate                                                                 | Linked copies render once; unrelated same-title/time events remain distinct                                        |
| M6.9e  | Refresh deterministically                                                             | Range, foreground, preferences, mutations, and manual refresh trigger one current query; stale results are ignored |
| M6.9f  | Use device events in Focus Mode                                                       | Focus Mode works without creating a Firestore mirror or persisting native IDs in notes                             |

## M6.10 Complete Event Editor

| Ticket | Deliverable               | Acceptance                                                                                                               |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| M6.10a | Reusable create/edit form | Supports title, notes, start/end, all-day, timezone, location, recurrence, alarms, availability, and URL where supported |
| M6.10b | Cross-platform validation | Invalid date, DST, recurrence, and alarm combinations are rejected before writes                                         |
| M6.10c | Direct device mutations   | Only writable calendars expose update/delete; deletion always confirms                                                   |
| M6.10d | Recurrence scope UI       | Occurrence, future, and entire-series options appear only when validated on that platform                                |
| M6.10e | Explicit exclusions       | No attendee, invitation, RSVP, organizer, conference, or reminder controls ship                                          |

## M6.11 Publication And Reconciliation

| Ticket | Deliverable                                                       | Acceptance                                                                                                                             |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| M6.11a | Optional publication checkbox on manual/task/goal/Start Now flows | Checkbox defaults off and targets the configured writable calendar only                                                                |
| M6.11b | Firestore-first publication sequence                              | Native failure retains the Bearing event with retryable unpublished status                                                             |
| M6.11c | Versioned notes marker and common-state hash                      | User notes round-trip without exposing Firebase UID or sensitive content in marker metadata                                            |
| M6.11d | Cross-device rediscovery                                          | A second device can identify an OS-synchronized copy and rebuild its local mapping                                                     |
| M6.11e | Deterministic edit reconciliation                                 | One-sided changes propagate; system version wins verified simultaneous changes                                                         |
| M6.11f | Confirm external deletion safely                                  | Cached-ID lookup confirms deletion; range absence alone never deletes or unpublishes                                                   |
| M6.11g | Coordinate linked deletion                                        | Unreachable copies create retryable deletion intent and honest status                                                                  |
| M6.11h | Idempotency and interruption recovery                             | Duplicate taps, restarts, retries, stale IDs, moved events, removed markers, and account removal do not duplicate or lose Bearing data |

## M6.12 General ICS Export

| Ticket | Deliverable                               | Acceptance                                                                                                        |
| ------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| M6.12a | Bearing-owned export filtering            | Device-originated events and linked duplicate copies are excluded                                                 |
| M6.12b | Expanded serializer and fixtures          | Timed/all-day, timezone/DST, location, recurrence, representable alarms, stable UID, escaped and folded text pass |
| M6.12c | Native share and development web download | iOS/Android share succeeds; web remains a non-release convenience                                                 |

## M6.13 Validation Matrix

### Automated

- Permission state reducer and adapter fake.
- Calendar/event normalization and capability mapping.
- Per-account storage isolation and stale preference cleanup.
- Range refresh cancellation, sorting, merging, and exact link deduplication.
- Marker serialization/parsing, last-common hashes, conflict outcomes, and deletion confirmation.
- Full event validation and supported recurrence scopes.
- ICS export fixtures and legacy event migration.

### Native Devices

- Current iPhone and agreed mid-tier Android device.
- Grant, deny, block, revoke, and settings recovery.
- Multiple selected calendars and one writable default.
- Writable, read-only, hidden, removed, and account-synchronized calendars.
- Timed, all-day, recurring, alarm, location, availability, and timezone/DST behavior.
- Create, update, delete, Focus Mode, foreground refresh, manual refresh, and Firestore-only fallback.

### Cross-Device

- Same Bearing account with the same OS calendar account: Firestore edits are immediate and marked copies reconcile after OS sync.
- Same Bearing account with different OS calendar accounts: Firestore remains editable and inaccessible native copies report limited status.
- External edit wins, confirmed external deletion unpublishes, and ordinary range absence has no destructive effect.

## Manual Prerequisites

1. Installable iOS and Android development builds.
2. At least one writable and one read-only/test calendar on each platform.
3. Two devices for cross-device validation, with one shared calendar account and one intentionally unmatched setup.
4. Human review of permission purpose strings and store privacy disclosures.

## Deferred Scope

- Direct Google Calendar API, Microsoft Graph, or iCloud API access.
- OAuth, provider tokens, provider webhooks, polling, and background synchronization.
- Firestore mirrors of device-originated events.
- Invitations, attendees, RSVP, organizer actions, conference links, and reminders.
- ICS import and production web deployment.
- Guaranteed cleanup of system copies unavailable on the current device.
