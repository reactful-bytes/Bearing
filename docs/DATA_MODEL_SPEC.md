# Data Model Spec (First Pass)

## Purpose
Define an initial Firebase-aligned data model for Bearing that supports Calendar, Goals, Notes, Profile, premium entitlements, and AI-assisted goal planning.

## Architecture Assumptions
- Firebase Authentication for identity.
- Cloud Firestore as primary app datastore.
- Cloud Functions for privileged operations and integrations.
- Optional Cloud Storage for future attachments (not required in v1).

## Entity Relationship Overview
- One user owns many goals, notes, calendar events, and integrations.
- One goal has many steps.
- One step can link to many scheduled events.
- One user owns many tasks for unscheduled work.
- Focus Mode Idea Dump creates notes linked to optional source event.
- Premium entitlement controls AI planning availability.

## Collection Layout

### users
Document ID: userId

Fields:
- displayName: string
- email: string
- timezone: string
- locale: string
- premiumStatus: enum (free, premium, grace_period, canceled)
- premiumSource: enum (ios, android, stripe, none)
- tipsEnabled: boolean
- reminderSoundId: string
- alarmSoundId: string
- createdAt: timestamp
- updatedAt: timestamp

### goals
Document ID: goalId

Fields:
- userId: string
- title: string
- description: string
- smartMeta:
  - specific: string
  - measurable: string
  - achievable: string
  - relevant: string
  - timeBound: string
- estimatedCompletionDate: timestamp
- nextStepId: string | null
- status: enum (active, completed, archived)
- isAiAssisted: boolean
- aiPlanVersion: number | null
- createdAt: timestamp
- updatedAt: timestamp

Indexes (planned):
- userId + status + estimatedCompletionDate
- userId + updatedAt

### goalSteps
Document ID: stepId

Fields:
- userId: string
- goalId: string
- title: string
- description: string
- starter: string
- estimatedFinishDate: timestamp | null
- order: number
- status: enum (pending, in_progress, completed)
- completedAt: timestamp | null
- createdAt: timestamp
- updatedAt: timestamp

Indexes (planned):
- goalId + order
- userId + goalId + status

### events
Document ID: eventId

Fields:
- userId: string
- title: string
- description: string
- startAt: timestamp
- endAt: timestamp
- timezone: string
- source: enum (local, google, microsoft, apple, ics_import)
- externalEventId: string | null
- calendarConnectionId: string | null
- goalId: string | null
- stepId: string | null
- status: enum (scheduled, completed, canceled)
- createdAt: timestamp
- updatedAt: timestamp

Indexes (planned):
- userId + startAt
- userId + stepId + startAt
- userId + source + updatedAt

### tasks
Document ID: taskId

Fields:
- userId: string
- title: string
- description: string
- status: enum (active, completed)
- completionSource: enum (manual, scheduled, start_now) | null
- completedAt: timestamp | null
- completedEventId: string | null
- createdAt: timestamp
- updatedAt: timestamp

Indexes (planned):
- userId + status + updatedAt
- userId + updatedAt

### notes
Document ID: noteId

Fields:
- userId: string
- title: string
- body: string
- source: enum (manual, idea_dump)
- sourceEventId: string | null
- sourceStepId: string | null
- processed: boolean
- archived: boolean
- createdAt: timestamp
- updatedAt: timestamp

Indexes (planned):
- userId + updatedAt
- userId + source + createdAt

### calendarConnections
Document ID: connectionId

Fields:
- userId: string
- provider: enum (google, microsoft, apple)
- status: enum (connected, disconnected, error)
- accountLabel: string
- tokenRef: string
- lastSyncAt: timestamp | null
- lastSyncStatus: enum (ok, warning, failed, never)
- createdAt: timestamp
- updatedAt: timestamp

Notes:
- tokenRef points to secure token storage; never store raw tokens in Firestore.

### subscriptions
Document ID: subscriptionId

Fields:
- userId: string
- platform: enum (ios, android, web)
- productId: string
- status: enum (active, in_grace_period, expired, canceled)
- periodStartAt: timestamp
- periodEndAt: timestamp
- autoRenew: boolean
- lastValidatedAt: timestamp
- createdAt: timestamp
- updatedAt: timestamp

### aiPlans
Document ID: aiPlanId

Fields:
- userId: string
- goalId: string
- promptVersion: number
- modelId: string
- inputGoalText: string
- outputPlan:
  - milestones: array
  - steps: array
  - timelineSummary: string
- status: enum (generated, accepted, rejected, failed)
- errorCode: string | null
- createdAt: timestamp

Notes:
- Keep output editable by user before final commit to goals and steps.

## Suggested Firestore Security Rules (High Level)
- Users can only read/write documents where userId equals request.auth.uid.
- Disallow client-side writes for privileged subscription validation state.
- Restrict calendar connection token references to server-owned processes.
- Validate required fields and allowed enum values on write.

## Data Integrity Rules
- Deleting a goal should soft-delete by default to preserve history.
- Step order must be unique per goal and normalized after drag reorder.
- Events tied to steps should retain linkage even if calendar source changes.
- Tasks converted into events should keep the linked event ID for traceability and stay hidden from the default active list.
- Idea Dump notes should preserve source metadata for traceability.

## Error Handling Requirements
- Return actionable errors for missing relationships (goal not found, step not found).
- Preserve causal context in Cloud Function failures.
- Never log tokens, auth credentials, or payment payload secrets.

## Migration and Versioning Strategy (Initial)
- Add schemaVersion field to mutable entities if structure changes become frequent.
- Use additive migrations first; avoid destructive field replacement.
- Keep one migration note section in docs for each release.

## Open Questions
- Final definition and downstream behavior of starter field on goal steps.
- Whether events are canonical in app and synced outward, or provider calendars are canonical and mirrored inward.
- Retention policy for AI plan generations and rejected drafts.
