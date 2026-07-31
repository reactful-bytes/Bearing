# Data Model Spec (First Pass)

## Purpose

Define an initial Firebase-aligned data model for Bearing that supports Calendar, Goals, Notes, Profile, premium entitlements, and AI-assisted goal planning.

## Architecture Assumptions

- Firebase Authentication for identity.
- Cloud Firestore as primary app datastore.
- Cloud Functions for privileged operations and integrations.
- Optional Cloud Storage for future attachments (not required in v1).

## Entity Relationship Overview

- One user owns many goals, notes, tasks, and Bearing calendar events.
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
- premiumStatus: enum (free, premium, grace_period, canceled), legacy server-owned mirror only
- premiumSource: enum (ios, android, stripe, none), legacy server-owned mirror only
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
- aiMilestones: array of editable accepted milestone objects
  - title: string
  - description: string
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
- ownership: enum (bearing)
- isAllDay: boolean
- location: string | null
- recurrenceRule: map | null
- alarms: array
- availability: enum (busy, free, tentative, unavailable) | null
- url: string | null
- publicationStatus: enum (unpublished, publishing, published, diverged, delete_pending)
- publicationLinkKey: string | null
- publicationBaselineHash: string | null
- sourceTaskId: string | null
- goalId: string | null
- stepId: string | null
- status: enum (scheduled, completed, canceled)
- createdAt: timestamp
- updatedAt: timestamp

Indexes (planned):

- userId + startAt
- userId + stepId + startAt
- userId + publicationStatus + updatedAt

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

### Device Calendar Data (Not Firestore)

- Device-originated events are loaded live through `expo-calendar` and remain ephemeral.
- Visible calendar IDs, one writable destination ID, and native event-ID caches are stored in AsyncStorage under a Firebase-UID-scoped key.
- Native calendar/event IDs are device-local and must not be stored as portable identifiers in Firestore.
- A published system copy contains an opaque Bearing link marker and last-common-state hash in its notes. The stable link key is not a provider credential and does not contain the Firebase UID.

### subscriptions

Document ID: userId

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

Notes:

- This UID-keyed server-owned document is the authoritative premium entitlement read model.
- A missing document means free access. Clients must fail closed on missing, malformed, loading, or error states.
- Only `active` and `in_grace_period` unlock premium features.
- Clients may read only their own document and may not write subscription state.

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
- Deny client writes to subscription, AI usage, export-job, and deletion-job authority fields.
- Validate required fields and allowed enum values on write.

## Data Integrity Rules

- Deleting a goal should soft-delete by default to preserve history.
- Step order must be unique per goal and normalized after drag reorder.
- Events tied to steps retain their Bearing linkage regardless of optional system-calendar publication.
- Firestore creation succeeds before native publication is attempted; publication failure never removes the Bearing event.
- A confirmed external deletion marks a linked Bearing event unpublished rather than deleting it.
- Tasks converted into events should keep the linked event ID for traceability and stay hidden from the default active list.
- Task conversion uses deterministic event ID `task-{taskId}` and one Firestore transaction to create the event and complete the task. Retries reuse the same event, while optional system-calendar publication runs only after the transaction commits.
- Idea Dump notes should preserve source metadata for traceability.

## Error Handling Requirements

- Return actionable errors for missing relationships (goal not found, step not found).
- Preserve causal context in Cloud Function failures.
- Never log auth credentials, payment payload secrets, calendar content, native calendar IDs, or publication link keys.

## Migration and Versioning Strategy (Initial)

- Add schemaVersion field to mutable entities if structure changes become frequent.
- Use additive migrations first; avoid destructive field replacement.
- Keep one migration note section in docs for each release.

## Open Questions

- Final definition and downstream behavior of starter field on goal steps.
- Retention policy for AI plan generations and rejected drafts.
