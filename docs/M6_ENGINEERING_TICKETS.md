# M6 Engineering Tickets

## Scope
Implementation-ready planning for M6 Calendar Integrations and ICS Interop.

## Current Baseline
- Mobile events are currently Firestore-backed local records created through `useCalendarEvents` and `firebaseEvents`.
- Profile already contains placeholder integration rows for Google Calendar, Microsoft Calendar, and Apple Calendar.
- The data model already reserves `calendarConnections`, `externalEventId`, `calendarConnectionId`, and provider-specific event `source` values.
- The repository does not yet contain a backend integration runtime for provider token exchange, token refresh, or scheduled sync.
- Expo config does not yet define a custom URL scheme required for production-grade OAuth redirect handling.

## Approved Product And Sync Decisions
- External providers are canonical. Bearing mirrors provider calendars into Firestore and syncs local changes outward automatically.
- Users can select and view multiple calendars per provider connection.
- Two-way sync is automatic once a connection is active.
- The first implementation slice may exclude recurring events, all-day events, attendees, conference links, and reminders.
- Event deletion must prompt the user before propagating to a provider.
- When a conflict exists, the provider version wins.
- Background sync is required.
- Only secured non-anonymous accounts can connect providers.
- Web support is required alongside native support.
- Apple support is limited to `.ics` interoperability for this milestone.
- Microsoft support is multi-tenant.
- Firebase Cloud Functions are approved for secure token exchange and sync orchestration.

## Recommended Implementation Approach
- Keep Firestore `events` as the app-visible mirrored store so existing calendar UI and tests remain the primary integration surface while providers remain canonical.
- Add a server-owned sync broker for provider token exchange, token refresh, revocation, and sync orchestration. Firebase Cloud Functions is the repository-aligned default because the project already uses Firebase and the data model assumes server-owned token handling.
- Treat `calendarConnections` as connection metadata only. Never store raw provider tokens in Firestore documents.
- Use Expo AuthSession with PKCE for Google and Microsoft connection initiation from mobile.
- Define the `.ics` import/export contract before provider-specific write-back expands, because Apple interoperability and manual sharing depend on the same mapping rules.
- Build Google first, then Microsoft, then Apple pathway, then conflict/diagnostics UI.

## Recommended Execution Order
1. M6.P1 source-of-truth and sync policy decisions.
2. M6.P2 provider console setup, secrets, and backend prerequisites.
3. M6.P3 backend runtime, secure token storage path, Firestore schema/index updates.
4. M6.4 `.ics` contract and validation fixtures.
5. M6.1 Google first read/write slice.
6. M6.2 Microsoft first read/write slice.
7. M6.3 Apple interoperability path using approved constraints.
8. M6.5 conflict handling and sync diagnostics.

## Shared Prerequisites

| Ticket ID | Status | Summary | Depends On |
| --- | --- | --- | --- |
| M6.P1 | completed | Finalize event sync contract, conflict policy, and supported provider scope | Approved on 2026-07-26 |
| M6.P2 | in-progress | Provision provider apps, redirect model, server secrets, and test accounts | M6.P1 |
| M6.P3 | in-progress | Establish backend integration runtime and secure token storage approach | M6.P1, M6.P2 |

### M6.P1 Finalize Event Sync Contract

#### Objective
Decide how Bearing events relate to external calendars before code is written.

#### Approved Decisions
- Provider calendars are canonical and mirrored into Firestore.
- The first release supports multiple selected and visible calendars per provider connection.
- Write-back is automatic for active connections.
- The first implementation slice excludes recurring events, all-day events, attendees, conference links, and reminders.
- Delete semantics require a prompt before propagating deletion.
- Conflict policy is provider-wins.
- Background sync is required.
- Provider connection requires a secured non-anonymous account.
- Web and native are both in scope.
- Apple support is `.ics` interoperability only.
- Microsoft is multi-tenant.
- Firebase Cloud Functions are approved.

#### Exit Criteria
- One approved sync contract for create, edit, delete, import, and disconnect flows.
- One approved conflict policy for simultaneous edits.
- One approved scope boundary for v1 provider support.

### M6.P2 Provider And Environment Prerequisites

#### Objective
Prepare the external provider and Firebase environments needed to build and test integrations.

#### Deliverables
- Google OAuth app and Calendar API enabled.
- Microsoft Entra app registration and Graph calendar permissions configured.
- Firebase project plan for backend secrets and scheduled sync support.
- Approved redirect URI strategy for Expo development builds, production mobile builds, and optional web support.

#### Exit Criteria
- All required provider IDs, tenant IDs, and secrets exist in the correct environment.
- Test accounts are available for Google and Microsoft.
- Firebase project is ready for backend deployment and secret storage.

### M6.P3 Backend Integration Runtime

#### Objective
Add the server-side surface required to handle privileged provider work safely.

#### Deliverables
- Backend location approved in this repository or an external companion repository.
- Callable or HTTP endpoints for connect, refresh, disconnect, sync-now, and provider webhook or scheduled sync entry points.
- Token storage design approved and documented.
- Firestore write ownership boundaries defined for client versus server sync paths.

#### Exit Criteria
- Provider tokens are never persisted in client-visible documents.
- Server can exchange auth codes, refresh access, and write synchronized event deltas safely.
- Deployment workflow is clear enough to support local validation and production rollout.

## Ticket Breakdown

### M6.1 Google Calendar Connectivity

| Ticket ID | Status | Summary | Depends On |
| --- | --- | --- | --- |
| M6.1a | blocked | Replace Google placeholder with connect state, account label, and sync actions in Profile | M6.P1 |
| M6.1b | blocked | Implement Google OAuth initiation and server-side code exchange | M6.P2, M6.P3 |
| M6.1c | blocked | Pull Google calendar events into Firestore event records using approved mapping rules | M6.4, M6.1b |
| M6.1d | blocked | Write Bearing event create, update, and delete changes back to the connected Google calendar | M6.1c |
| M6.1e | blocked | Add disconnect, token revocation, manual sync, and validation coverage | M6.1d |

#### Deliverables
- Connect Google action from Profile.
- Connected account state with last sync indicator.
- User-approved first sync slice for inbound and outbound event changes.
- Automated tests for connection states and event mapping helpers.
- Manual validation script for connect, sync, edit, delete, disconnect.

#### Open Scope Risks
- Google recurring event support adds substantial mapping complexity.
- Multiple calendars per account changes both connection UX and data model shape.
- Expo Go is not enough for production-grade mobile redirect validation once a custom scheme is introduced.

### M6.2 Microsoft Calendar Connectivity

| Ticket ID | Status | Summary | Depends On |
| --- | --- | --- | --- |
| M6.2a | blocked | Replace Microsoft placeholder with connection state and sync actions in Profile | M6.P1 |
| M6.2b | blocked | Implement Microsoft OAuth initiation and server-side code exchange | M6.P2, M6.P3 |
| M6.2c | blocked | Pull Microsoft calendar events into Firestore event records using shared mapping rules | M6.4, M6.2b |
| M6.2d | blocked | Write Bearing event create, update, and delete changes back to the connected Microsoft calendar | M6.2c |
| M6.2e | blocked | Add disconnect, token revocation, tenant edge cases, and validation coverage | M6.2d |

#### Deliverables
- Connect Microsoft action from Profile.
- Tenant-aware OAuth flow that matches approved audience model.
- Shared sync engine extended for Microsoft Graph-specific payloads.
- Automated tests for provider-specific normalization and error handling.

#### Open Scope Risks
- Single-tenant versus multi-tenant choice changes app registration and consent behavior.
- Admin-consent requirements may block some real user accounts.
- Graph recurrence semantics differ from Google and need explicit first-slice boundaries.

### M6.3 Apple Calendar Pathway And Constraints Handling

| Ticket ID | Status | Summary | Depends On |
| --- | --- | --- | --- |
| M6.3a | blocked | Finalize what “Apple calendar support” means for v1: ICS-only, device-calendar access, or another path | M6.P1 |
| M6.3b | blocked | Implement approved Apple path and matching UX language in Profile and Calendar | M6.3a, M6.4 |
| M6.3c | blocked | Add explicit constraint messaging for unsupported Apple capabilities | M6.3b |

#### Approved Scope
M6.3 is Apple interoperability through `.ics` import/export/share only, with explicit copy explaining that direct iCloud account sync is out of scope for this milestone.

#### Reasoning
- Apple does not offer a straightforward Google/Microsoft-style public cloud calendar integration path for Expo-managed apps.
- `.ics` already appears in the product brief and roadmap, and it satisfies cross-platform Apple Calendar compatibility without inventing a separate backend surface.
- This keeps the first Apple slice reliable and consistent with the repository’s current scope.

### M6.4 `.ics` Import, Export, And Share Support

| Ticket ID | Status | Summary | Depends On |
| --- | --- | --- | --- |
| M6.4a | blocked | Define `.ics` field mapping contract, timezone rules, and validation fixtures | M6.P1 |
| M6.4b | blocked | Implement event-to-ICS serialization and export/share flow | M6.4a |
| M6.4c | blocked | Implement ICS import parsing, duplicate detection, and event creation flow | M6.4a |
| M6.4d | blocked | Add round-trip tests and platform-specific sharing/import validation | M6.4b, M6.4c |

#### Deliverables
- One `.ics` serializer for exported Bearing events.
- One `.ics` parser path for imported files.
- Validation fixtures that cover timezone, description escaping, and duplicate external IDs.
- Share/export UX on iOS and Android using Expo-supported APIs.

#### Technical Notes
- Expo SDK 57 already supports local file creation with `expo-file-system`.
- Expo SDK 57 supports file sharing with `expo-sharing`, but web cannot share local files by URI and requires HTTPS.
- Import can use the Expo file picker from `expo-file-system` in SDK 57.

### M6.5 Conflict Resolution And Sync Diagnostics UI

| Ticket ID | Status | Summary | Depends On |
| --- | --- | --- | --- |
| M6.5a | blocked | Define sync run log and actionable error model | M6.P1, M6.P3 |
| M6.5b | blocked | Add Profile or Calendar diagnostics UI for connection status, last sync, and failure details | M6.5a, M6.1c |
| M6.5c | blocked | Add conflict resolution UI for approved conflict policy | M6.5a, M6.1d, M6.2d |

#### Deliverables
- Per-connection last sync state.
- Human-readable failure reasons and retry actions.
- Conflict surfacing for the approved local-versus-provider decision model.

#### Recommended First Policy
Prefer simple, explicit behavior first: surface the conflict, preserve both versions when possible, and require user choice instead of silently overwriting cross-system edits.

## Remaining Manual Inputs
1. Google OAuth client IDs, authorized redirect URIs, and Calendar API enablement.
2. Microsoft Entra client ID, tenant configuration, redirect URIs, and Graph permission consent.
3. Firebase and Google Cloud project billing and API enablement for Functions, Secret Manager, and Scheduler.
4. Dedicated Google and Microsoft test accounts for destructive sync validation.

## Manual Prerequisites

### Confirmed Preconditions
1. Firebase may be upgraded to the Blaze plan if required.
2. Web support remains in scope.
3. Provider connectivity must be blocked for anonymous accounts.
4. The secure server-owned integration path is approved.

### Manual Steps That Depend On Architecture Approval

#### A. Firebase Project And Backend Preparation
1. Open Firebase Console and select the Bearing project.
2. Confirm the project region you want backend services to use. Match Firestore region when possible.
3. If you approve the server-owned integration path, upgrade the project to Blaze if billing is not already enabled.
4. In Google Cloud Console for the same project, enable these APIs as needed:
   - Cloud Functions API
   - Cloud Build API
   - Secret Manager API
   - Cloud Scheduler API if scheduled sync is approved
5. Decide whether backend code should live in this repository as a new Firebase functions workspace or in a separate repository.

#### B. Google Calendar Provider Setup
1. Open Google Cloud Console for the project that will own the OAuth credentials.
2. Open APIs and Services.
3. Enable Google Calendar API.
4. Open OAuth consent screen.
5. Configure app name, support email, and developer contact email.
6. Choose the correct audience type for your use case.
7. Add test users if the app will remain in testing during development.
8. Add the scopes required for the approved first slice. The expected minimum is Google Calendar read/write scope if two-way sync is approved.
9. Stop before creating final OAuth client credentials until we confirm whether the approved flow uses native installed-app clients only, web clients plus backend exchange, or both.

#### C. Microsoft Calendar Provider Setup
1. Open Microsoft Entra admin center.
2. Open App registrations.
3. Create a new app registration in the tenant that should own the integration.
4. Record the Application client ID and Directory tenant ID.
5. Choose whether the app is single-tenant or multi-tenant. This changes the authority URL and consent behavior.
6. Open API permissions.
7. Add Microsoft Graph delegated permissions for the approved first slice. The expected minimum is a calendar read/write permission if two-way sync is approved.
8. Add offline access if refresh tokens are required.
9. Grant admin consent if your tenant requires it.
10. Stop before final redirect platform configuration until we confirm the approved Expo redirect model.

#### D. Apple Path Preparation
1. Decide whether Apple support means `.ics` interoperability or direct device-calendar access.
2. If the answer is `.ics` interoperability, there are no Apple console prerequisites.
3. If the answer is device-calendar access, we will need to add iOS permission copy and test on a real iPhone or simulator with an existing calendar account.
4. If the answer is true iCloud cloud sync, approve a separate design pass first because that is not a straightforward continuation of the Google and Microsoft pattern.

#### E. `.ics` Validation Assets
1. Gather a small set of real sample events you are comfortable using as fixtures:
   - one timed event in your home timezone
   - one timed event in a different timezone
   - one event with a multiline description
   - one event linked to a goal step
2. Decide whether recurring and all-day fixtures are required in the first pass.
3. Confirm whether imported `.ics` events should always create new local events or try to merge into existing events when identifiers match.

## Validation Plan Once Implementation Starts
- `npm run test -- --watch=false`
- `npm run lint`
- `npx tsc --noEmit`
- Provider-specific focused Jest suites for event mapping and connection state
- Manual validation on at least one native platform for OAuth redirect handling
- Manual end-to-end validation for connect, sync, edit, delete, disconnect, export, and import

## Assumptions To Avoid Making Without Approval
- Do not assume recurring-event support in the first slice.
- Do not assume direct iCloud sync is required for Apple support.
- Do not assume web support is required for provider OAuth or `.ics` sharing.
- Do not assume anonymous users can safely connect provider calendars.
- Do not assume silent last-write-wins conflict handling is acceptable.