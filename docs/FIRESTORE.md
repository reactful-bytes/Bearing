# Firestore Setup

## Purpose

Enable Cloud Firestore for Bearing and configure the minimum rules, indexes, and verification steps required for calendar event storage now and Idea Dump to Notes storage next.

## When To Do This

- Do this before treating M3.2 as fully validated in a live Firebase project.
- Do this before starting end-to-end validation for M3.3, because Idea Dump will write note records to Firestore.

## Prerequisites

- Firebase project exists and is selected in Firebase Console.
- The app already has working Firebase config in `mobile/.env`.
- Anonymous auth is enabled, or another sign-in provider is enabled for development.
- The app can already boot without Firebase config errors.

Related setup guide: `mobile/docs/FIREBASE_SETUP.md`

Repository config:

- `firebase.json` points Firebase CLI at the committed Firestore config.
- `firestore.rules` contains the published rule set.
- `firestore.indexes.json` contains the committed composite indexes.

## 1. Enable Firestore Database

1. Open Firebase Console: https://console.firebase.google.com/
2. Select the Bearing Firebase project.
3. Open `Build > Firestore Database`.
4. Click `Create database`.
5. Choose a region close to your expected users.
6. For development, start in `test mode` only if you need a temporary unblock.
7. Prefer publishing explicit security rules immediately after creation.

Recommended regions:

- US: `us-central1` or `us-east1`
- Europe: `europe-west1`
- Match future Cloud Functions region when possible to avoid cross-region latency.

## 2. Publish Firestore Security Rules

Use rules that scope reads and writes to the signed-in user's own documents. Replace the default rules with this baseline:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /events/{eventId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;

      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    match /notes/{noteId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;

      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    match /goals/{goalId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;

      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    match /goalSteps/{stepId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;

      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    match /tasks/{taskId} {
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;

      allow read, update, delete: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null
        && request.auth.uid == resource.data.userId;

      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Why this baseline is enough now:

- M3.2 needs user-scoped event CRUD.
- M3.3 will need user-scoped note creation and reads.
- M7 needs user-scoped task CRUD and task completion writes.
- Everything else remains explicitly denied unless a collection is known.

## 3. Create Required Composite Indexes

The current calendar event subscription uses a query filtered by `userId` and a date range on `startAt`, then ordered by `startAt`. That requires a composite index.

Create this index first:

### Events Index Required Now

1. Go to `Build > Firestore Database > Indexes`.
2. Click `Create index`.
3. Configure:
   - Collection ID: `events`
   - Field: `userId` ascending
   - Field: `startAt` ascending
   - Query scope: `Collection`
4. Save and wait for the build to finish.

Expected use:

- Calendar month subscription
- Calendar day rendering sourced from month data

### Notes Indexes Recommended Before M3.3/M5.1

You can create these now to avoid another setup step when the notes list lands.

#### Notes by recent update

- Collection ID: `notes`
- Field: `userId` ascending
- Field: `updatedAt` descending or ascending based on final query choice

#### Notes by source and creation time

- Collection ID: `notes`
- Field: `userId` ascending
- Field: `source` ascending
- Field: `createdAt` descending or ascending based on final query choice

Notes:

- The data model spec currently plans `userId + updatedAt` and `userId + source + createdAt`.
- If the final implementation sorts descending for newest-first display, match the index direction to the query.

### Tasks Index Required For M7

The task subscription uses `where('userId', '==', userId)` and `orderBy('updatedAt', 'desc')`.

Create this index:

- Collection ID: `tasks`
- Field: `userId` ascending
- Field: `updatedAt` descending

### Goal Step Events Index Required For M4.5+

The linked-step event subscription uses `userId`, `stepId`, and `startAt`.

Create this index:

- Collection ID: `events`
- Field: `userId` ascending
- Field: `stepId` ascending
- Field: `startAt` ascending

## 4. Verify Authentication Before Testing Firestore

Firestore writes will fail if the app is not authenticated.

1. Start the app from `mobile/`.
2. Sign in through the existing auth entry flow.
3. Confirm the app reports an authenticated session.
4. Confirm there is a current Firebase user before testing calendar or notes writes.

## 5. Validate Event CRUD End To End

This confirms M3.2 is live against Firebase rather than only against tests.

1. Open the `Calendar` tab.
2. Create a test event with today's date.
3. Verify it appears in day view.
4. Switch to month view and verify the day marker appears.
5. Open the event details modal.
6. Delete the event.
7. Verify it disappears from the UI.

Then verify in Firebase Console:

1. Open `Build > Firestore Database > Data`.
2. Open the `events` collection.
3. Confirm created documents contain the fields defined in `docs/DATA_MODEL_SPEC.md`.
4. Confirm `userId` matches the signed-in Firebase auth user.

## 6. Validate Note Writes Before Or During M3.3

Once note creation exists, validate the same way:

1. Trigger the Idea Dump flow.
2. Save a note.
3. Verify the note appears in Firestore under `notes`.
4. Confirm these fields are correct:
   - `userId`
   - `title`
   - `body`
   - `source` set to `idea_dump`
   - `sourceEventId` when created from an active event
   - `processed`
   - `archived`
   - `createdAt`
   - `updatedAt`

## 7. Expected Collections For Current Roadmap Work

You do not need to manually create collections in advance. Firestore will create them when the first document is written. For the current roadmap, these are the expected collections:

- `events`
- `notes`
- `goals`
- `goalSteps`
- `tasks`
- `users`
- `subscriptions`

## 8. Common Failures And Fixes

### Missing index error

Symptoms:

- Calendar load fails.
- Firebase console or runtime error mentions creating an index.

Fix:

- Create the exact index requested by the error, or the `events userId + startAt` index above if it is the existing month query.
- For Tasks load failures, ensure the `tasks userId + updatedAt` index is enabled.
- Wait for index status to become enabled.

### Permission denied

Symptoms:

- Create, read, update, or delete calls fail immediately.

Fix:

- Confirm the user is signed in.
- Confirm rules were published to the correct Firebase project.
- Confirm written documents include the correct `userId`.

### Firestore not initialized

Symptoms:

- The app throws an initialization error when event or note services run.

Fix:

- Confirm Firebase config values exist in `mobile/.env`.
- Confirm the app boots successfully through the existing Firebase auth flow.
- Confirm the selected Firebase project is the same one whose config is in the app.

### Data written but not visible in UI

Symptoms:

- Firestore contains a document but the app does not show it.

Fix:

- Confirm the date falls within the current query range.
- Confirm the document's `userId` matches the active user.
- Confirm timestamps are valid Firestore timestamps, not strings.
- Confirm the UI is subscribed to the correct month or list query.

## 9. Production Notes

- Do not keep permissive test rules in place for production.
- Do not store native calendar IDs, calendar content, auth credentials, or payment secrets in Firestore documents that do not explicitly own that data.
- Device-originated events remain on-device and are queried live through `expo-calendar`.
- Keep writes user-scoped in client code and enforce that again in rules.
- Add server-owned write paths through Cloud Functions for premium billing, AI usage, exports, and account deletion only.

## 10. Recommended Order For You Right Now

1. Enable Firestore database.
2. Publish the security rules above.
3. Create the `events` composite index.
4. Optionally pre-create the two `notes` indexes.
5. Sign in and verify M3.2 event CRUD against live Firestore.
6. Move into M3.3 implementation and live validation.
