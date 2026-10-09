# Bearing Firebase Functions

This package owns trusted server operations for entitlement, AI, export, account deletion and push reminders. It
must not contain native calendar provider OAuth, sync, or mirroring code.

## Runtime

- Development and CI: Node 24 LTS/npm 11.
- Compatibility CI: Node 22.
- Firebase deployment: `nodejs24` as configured in `firebase.json`.

## Commands

```bash
npm ci
npm run quality
```

The quality gate runs strict TypeScript checks, ESLint, Prettier, a production build, and Node tests.

To inspect exports locally, build this package and start the Functions emulator from `mobile/`, where
the pinned Firebase CLI is installed:

```bash
cd functions
npm run build
cd ../mobile
npx firebase emulators:start --config ../firebase.json --project bearing-functions-test --only functions
```

## Callable Convention

Every protected client callable must use the v2 `onCall` API, require Firebase Auth, derive the
target UID from `request.auth.uid`, validate request payloads, return sanitized `HttpsError`
failures, and read private configuration only on the server. App Check remains deferred to M17 and
must not be partially enforced.

`backendStatus` is the minimal convention probe. It returns no user or environment data.

## RevenueCat APIs

`revenueCatWebhook` validates the configured Authorization header and timestamped raw-body HMAC,
then fetches the canonical RevenueCat subscriber by Firebase UID. It writes the server-owned
`subscriptions/{uid}` record and an idempotent webhook receipt in one transaction. The account
deletion callable removes the RevenueCat customer before Firestore and Firebase Authentication.
V1 is used only for that subscriber lookup and customer deletion.

RevenueCat V2 is the sole AI-credit balance, debit, refund, and product-grant authority. Configure
the non-expiring virtual currency and all paid, trial, and pack grant amounts in RevenueCat; no
grant amount belongs in Functions configuration or source. Create a separate least-privilege V2
secret key that can read customer virtual-currency balances and project products/product grants,
and can create customer virtual-currency transactions.

Required managed secrets:

- `REVENUECAT_SECRET_API_KEY`
- `REVENUECAT_WEBHOOK_AUTHORIZATION`
- `REVENUECAT_WEBHOOK_SIGNING_SECRET`
- `REVENUECAT_SECRET_API_KEY_V2` (separate V2 key; never reuse the V1 key)
- `REVENUECAT_PROJECT_ID`
- `REVENUECAT_AI_CURRENCY_CODE` (defaults to `AIC`)

The deployed V2 integration expects balance lists with `items`, product pagination in `next_page`,
product fields `id` and `store_identifier`, virtual-currency `product_grants` with `product_id` and
`amount`, and transaction bodies using `adjustments`. Confirm the nested `product_grants` schema
against a non-production response before production deployment because the rendered API reference
does not expose those nested fields in its static text.

Configure Firestore TTL on `aiCreditOperations.expiresAt` and remove the retired
`aiPlans.expiresAt` TTL policy after deployment. Operation documents carry a 24-hour expiry value;
locks are deleted during normal completion/recovery and account deletion. `leaseExpiresAt` supports
recovery and is not balance state or a grant-expiry field.

Use separate non-production and production values. See `../docs/MONETIZATION_RELEASE.md` for console
configuration, deployment order, restore policy, and sandbox evidence.

## Push Reminder Setup and Operations

Exports:

- `registerPushDevice`: authenticated Expo token/installation registration and device timezone refresh.
- `disablePushDevice`: authenticated owner-only disablement, used by settings and sign-out.
- `sendScheduledReminders`: UTC minute cron with a durable Firestore outbox and scheduler lease.

Owner deployment checklist (do not commit credentials):

1. Configure Android **FCM V1** credentials and iOS **APNs** credentials for the existing EAS project.
   Use native development/preview builds on physical devices; Expo Go and web are unsupported.
2. Enable enhanced push security in the Expo project, create an Expo access token and store it as the
   Firebase managed secret `EXPO_ACCESS_TOKEN` using `firebase functions:secrets:set EXPO_ACCESS_TOKEN`.
   This is not a mobile environment variable.
3. Deploy Firestore rules/indexes and the three notification Functions to staging, then production
   after acceptance. Cloud Scheduler/Functions require billing and the associated Google APIs.
4. Deploy the TTL field overrides in `firestore.indexes.json` and verify TTL is active on
   `pushDevices.expireAt` (90-day inactive device expiry) and `notificationDeliveries.expireAt`
   (30-day delivery retention). Do not TTL the scheduler lease.
5. Configure alerts for `push_planning_failed`, `push_delivery_processing_failed`,
   `push_delivery_ambiguous`, `push_send_failed`, `push_ticket_error`, `push_receipt_error`,
   `push_receipt_request_failed` and `push_receipt_unavailable`. Never log tokens or notification text.

Behavior:

- Timed events: two independent optional offsets from each occurrence start.
- All-day events: whole-day offsets, delivered at the Profile morning time in each device timezone.
- Due dates: unfinished tasks linked to active goals only; one grouped summary per device/local
  morning, with a single-task tap opening that task and multi-task taps opening Tasks.
- Device-local delivery uses the last timezone reported on launch/resume, not the editable profile
  timezone. A closed app cannot report travel. Date-only keys prevent new due dates shifting when traveling.
  Legacy timestamps without keys are interpreted in the profile timezone.
- DST: keep local morning wall time. A custom time inside a spring-forward gap moves to the first
  valid minute afterwards. Repeated fall-back morning times produce only one summary.
- Source deletion, completion, cancellation, rescheduling, changed preferences, expired devices,
  and disabled push are rechecked before sends/retries. Already accepted OS notifications cannot be
  recalled. Already-sent summaries are not resent after the task list changes that morning.
- Definitive rate limits retry at bounded exponential intervals, up to three attempts. Ambiguous
  sends/crashes are marked `unknown`, not blindly retried; Expo does not offer an exactly-once send key.
- Receipts are checked after 15 minutes, then hourly for up to 24 checks. `DeviceNotRegistered`
  removes the stale device token. Receipt success means provider acceptance, not user-visible delivery.
- A ten-minute catch-up window covers short scheduler delays; stale reminders are dropped. Minute
  scheduling, network connectivity, battery policy, permissions and OS settings mean exact arrival
  times cannot be guaranteed. Morning time is shared by all-day reminders and optional due summaries.

The first implementation paginates enabled devices and owned source records. Measure Firestore
reads and scheduler duration as usage grows; introduce indexed/materialized future work before the
nine-minute lease/timeout or read budget becomes a constraint. Do not truncate pages silently.

Local checks (PowerShell, from the repository root):

```powershell
Set-Location functions
npm run build
Set-Location ..\mobile
npx firebase emulators:exec --config ..\firebase.json --project bearing-rules-test --only firestore "npx jest --config jest.rules.config.js --runInBand && node --test ..\functions\lib\notificationAdmin.integration.test.js"
```

The delivery integration tests stub Expo requests and refuse to run without the Firestore emulator;
they do not send real pushes or access production data.

Physical-device acceptance before marking M40 complete:

- Allow, deny, and revoke permissions; enable/disable push in Profile; sign out and switch accounts.
- Schedule two timed reminders and verify arrival while foregrounded, backgrounded and terminated.
- Verify notification taps on cold/warm starts, including deleted tasks/events and wrong-account payloads.
- Verify recurring overrides/exclusions, rescheduling, completed/deleted tasks, canceled/deleted events,
  zero-day and multi-task summaries, and all-day morning reminders.
- Change morning time, device timezone and reminder sound; reopen Bearing and verify new behavior.
- Confirm no duplicate native calendar alerts, correct Android channels/iOS sounds, and DND/Focus
  behavior. Neither platform's DND settings are bypassed by this feature.
