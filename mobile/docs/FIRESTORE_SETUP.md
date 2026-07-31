# Firestore Setup (M3.2)

This guide enables Cloud Firestore for the Bearing mobile app and configures the required indexes and security rules for calendar event storage.

Committed Firebase CLI config now lives at the workspace root in `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.

## Prerequisites

- Firebase project created and configured (see FIREBASE_SETUP.md for initial setup)
- Anonymous authentication enabled
- Bearinig app running locally or in Expo

## 1) Enable Cloud Firestore

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your Bearing project.
3. In the left sidebar, go to **Build > Firestore Database**.
4. Click **Create database**.
5. Choose location (typically closest to your users):
   - **US**: `us-central1` or `us-east1`
   - **EU**: `europe-west1`
   - **Other**: Select region appropriate for your deployment
6. Choose security rules:
   - **Start in test mode** (for development; allows all reads/writes — NOT for production)
   - Click **Enable**

> **⚠️ Production Note**: Test mode expires after 30 days. Use security rules (Step 3) for production.

## 2) Create Firestore Security Rules

1. In Firebase Console, go to **Build > Firestore Database**.
2. Click the **Rules** tab.
3. Confirm the displayed policy matches the authoritative `firestore.rules` file at the repository
   root.
4. Deploy from the repository root with `firebase deploy --only firestore:rules`, or paste that exact
   committed file and click **Publish**.
5. From `mobile/`, run `npm run test:rules` with Java 21 before deployment. The suite verifies
   ownership isolation, immutable owner IDs, server-owned premium fields and subscriptions, default
   denial, and atomic task conversion.

## 3) Create Composite Index for Calendar Events

The calendar event query requires a composite index on `userId` + `startAt`:

1. In Firebase Console, go to **Build > Firestore Database**.
2. Click the **Indexes** tab.
3. Click **Create Index**.
4. Fill in the index details:
   - **Collection ID**: `events`
   - **Fields**:
     - Field 1: `userId` (Ascending)
     - Field 2: `startAt` (Ascending)
   - **Query scope**: Collection
5. Click **Create Index**.

> The index will take 5–10 minutes to build. You can track progress in the Indexes tab.

### Optional: Additional Indexes for Future Queries

For M4+ milestones, consider creating these indexes preemptively:

| Collection  | Fields                                    | Purpose                                   |
| ----------- | ----------------------------------------- | ----------------------------------------- |
| `events`    | userId + stepId + startAt                 | Filter events by goal step                |
| `events`    | userId + publicationStatus + updatedAt    | Recover pending linked-event operations   |
| `goals`     | userId + status + estimatedCompletionDate | List active goals by target date          |
| `goals`     | userId + updatedAt                        | Sort goals by recent update               |
| `goalSteps` | goalId + order                            | List steps within a goal                  |
| `goalSteps` | userId + goalId + status                  | Filter goal steps by status               |
| `notes`     | userId + updatedAt                        | Sort notes by recent update               |
| `notes`     | userId + source + createdAt               | Filter notes by source (manual/idea_dump) |
| `tasks`     | userId + updatedAt                        | Sort tasks by recent update               |

## 4) Test Firestore Connectivity

1. Start the Expo app:

   ```bash
   cd mobile
   npm run web
   # or
   npx expo start
   ```

2. Sign in anonymously:
   - Tap **Open Sign-In Entry** button
   - Tap **Sign In Anonymously**
   - Verify app displays "Session detected."

3. Navigate to **Calendar** tab.

4. Tap the **+** (floating action button) to create an event:
   - Enter a title (e.g., "Test Event")
   - Set a date and time
   - Tap **Save**

5. Verify the event appears in the calendar view:
   - **Day view**: Event should appear as a block in the hourly timeline
   - **Month view**: A dot should appear under the event date
   - Tap the event to open the event detail modal

6. Test delete:
   - Open an event
   - Tap **Delete**
   - Confirm deletion
   - Verify event disappears from calendar

7. Monitor Firestore in Firebase Console:
   - Go to **Build > Firestore Database**
   - Click the **Data** tab
   - Expand the `events` collection
   - Verify documents are created with fields matching `CalendarEvent` type

## 5) Verify Security Rules in Development

Once events are created:

1. Open Firebase Console → **Build > Firestore Database** → **Data** tab.
2. Expand the `events` collection and view a document.
3. Verify the document has a `userId` field matching your signed-in user's UID.
4. Try accessing Firestore from a different signed-in user account:
   - Sign out and sign in as a new anonymous user
   - Navigate to Calendar
   - Verify you cannot see the first user's events (security rule validation)

## Troubleshooting

### Error: "Composite index missing" during Calendar load

**Cause**: The `userId + startAt` composite index is still building.

**Solution**:

1. Check Firebase Console → **Build > Firestore Database** → **Indexes** tab
2. Wait for index status to show ✅ **Enabled**
3. Reload the app

### Error: "Permission denied" when creating/reading events

**Cause**: Security rules or user authentication is not configured correctly.

**Solution**:

1. Verify user is signed in:
   - Check ProfileScreen shows "Signed in as [UID]"
   - If not, sign in anonymously first
2. Verify security rules allow operations:
   - Go to Firebase Console → **Build > Firestore Database** → **Rules**
   - Check rules match the configuration in Step 2 above
3. Test rules in Firebase Console:
   - Click the **Rules** tab
   - Click **Edit Rules** and then **Test** to run test cases

### No events appearing in Calendar

**Cause**: Events may not be saved to Firestore, or date range query is filtering them out.

**Solution**:

1. Create a test event with today's date/time (Step 4 above)
2. Check Firestore Console → **Data** tab → `events` collection
3. Verify the document exists with:
   - `userId` matching your UID (visible in ProfileScreen)
   - `startAt` timestamp within the current month
4. If document missing: Check browser console for errors (F12 → Console tab)
5. If document exists but not showing: Calendar may be querying wrong date range; manually tap next/prev month buttons to expand visible range

### Performance issues or slow queries

**Cause**: Missing or incomplete composite indexes.

**Solution**:

1. Go to Firebase Console → **Build > Firestore Database** → **Indexes**
2. Verify the `userId + startAt` index shows ✅ **Enabled**
3. If grayed out or "Building": Index is still being created; wait 5–10 minutes
4. If missing: Follow Step 3 above to create it

## Next Steps

- **M3.3**: Integrate Idea Dump modal to create notes from Focus Mode
- **M3.4**: Implement Focus Mode timer and active event tracking
- **M4**: Add Goals collection with goal CRUD and progress tracking
- **Production**: Set up Cloud Functions for server-side validations and automated backups

## Security Best Practices

1. **Never commit private keys**: Keep service account keys out of mobile app.
2. **Test mode expiration**: Test mode rules expire after 30 days; set a calendar reminder to enable production rules.
3. **Sensitive data**: Do not store passwords, tokens, or payment info in Firestore (use Cloud Functions or backend services).
4. **Device calendar privacy**: Device-originated events stay outside Firestore; never persist native calendar IDs as portable cloud identifiers.

## References

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Bearing Data Model Spec](../DATA_MODEL_SPEC.md)
