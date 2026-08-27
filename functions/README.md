# Bearing Firebase Functions

This package owns trusted server operations for entitlement, AI, export, and account deletion. It
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
- `REVENUECAT_V2_SECRET_API_KEY` (separate V2 key; never reuse the V1 key)
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
