# Monetization Release Handoff

## Status

The mobile purchase flow, RevenueCat adapter, server reconciliation, entitlement listener, account
deletion cleanup, and strict funnel telemetry are repository-complete. Store products, RevenueCat
project settings, managed secrets, deployment, regional approval, and sandbox evidence remain
release-owner handoffs.

## Launch Contract

| Setting                    | Launch value                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| Customer name              | Bearing 360                                                        |
| RevenueCat entitlement     | `premium` (stable internal identifier)                             |
| Subscription offering      | `default`, set as current                                          |
| Credit-pack offering       | `credit_packs`                                                     |
| Monthly product ID         | `bearing_premium_monthly`                                          |
| Annual product ID          | `bearing_premium_annual`                                           |
| Price and trial terms      | Current localized StoreKit/Play Billing values                     |
| Credit grants and balances | RevenueCat V2 virtual-currency configuration and customer balances |
| iOS app ID                 | `com.reactfulbytes.bearing`                                        |
| Android app ID             | `com.reactfulbytes.bearing`                                        |
| Feature entitlement        | Firestore `subscriptions/{firebaseUid}` read model                 |

Store-localized price, billing period, and introductory terms are the only customer-facing source.
Subscription, trial, and pack grant amounts come from RevenueCat's V2 product-grant catalog. Do not
hard-code prices or grant amounts in source, docs, or the purchase UI.

## Authority Flow

1. A secured Firebase account opens the custom paywall; anonymous accounts cannot purchase.
2. The app configures RevenueCat with the Firebase UID as the App User ID.
3. StoreKit or Play Billing owns checkout, payment, cancellation, and refund handling.
4. RevenueCat sends an authenticated webhook to the deployed `revenueCatWebhook` Function.
5. The Function validates authorization, raw-body HMAC, and timestamp, then fetches the canonical
   subscriber from RevenueCat instead of trusting the event type.
6. The Function writes the UID-keyed subscription and an idempotent event receipt. Only `active`
   and `in_grace_period` unlock Bearing 360.
7. The client waits for the Firestore listener to activate; RevenueCat `CustomerInfo` never grants
   app access directly.
8. RevenueCat V2 is the sole balance, grant, debit, and refund authority. One AI generation costs
   one credit; a failed generation is refunded with a distinct deterministic transaction key.

Cancellation keeps access through the paid-through date with `autoRenew: false`. Billing issues map
to grace-period access while RevenueCat reports an active entitlement. Expired or missing
entitlements fail closed.

## Console Setup

- [ ] Create the matching auto-renewing monthly and annual products in App Store Connect.
- [ ] Create the matching base plans/subscriptions in Google Play Console.
- [ ] Configure approved localized prices and trial/intro terms in each store; record the rendered
      terms without copying them into runtime source.
- [ ] Connect both store apps to one RevenueCat project.
- [ ] Create entitlement `premium` and attach both products. If it is renamed, set
      `REVENUECAT_ENTITLEMENT_IDENTIFIER` to the new identifier before deploying; the default is
      `premium`.
- [ ] Create offering `default`, make it current, and add monthly and annual packages.
- [ ] Create active virtual currency `AIC`; configure approved non-expiring paid and trial grants
      remotely for the applicable products without placing amounts or an assumed cadence in source.
- [ ] Create offering `credit_packs`; attach only approved consumable products with non-expiring
      `AIC` grants. Packs are non-transferable, member-only, and have no Restore action.
- [ ] Configure RevenueCat restore behavior to transfer a purchase to the currently authenticated
      Firebase UID. Record and approve the collision/support policy before enabling production.
- [ ] Add the iOS and Android public SDK keys to the corresponding EAS environments as
      `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
- [ ] Set `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTHORIZATION`,
      `REVENUECAT_WEBHOOK_SIGNING_SECRET`, `REVENUECAT_V2_SECRET_API_KEY`,
      `REVENUECAT_PROJECT_ID`, `REVENUECAT_AI_CURRENCY_CODE`, and (when different from `premium`)
      `REVENUECAT_ENTITLEMENT_IDENTIFIER` as Firebase Functions parameters. Keep V1 and V2 keys
      separate and grant the V2 key only required customer-currency transaction and catalog reads.
- [ ] Set `REVENUECAT_TEST_STORE_PLATFORM=android` while validating Android RevenueCat Test Store
      purchases. This setting applies only to RevenueCat `TEST_STORE` events, which do not identify
      an App Store or Play Store platform; use `ios` for isolated iOS Test Store validation, or
      leave it as the fail-closed default `web` outside that testing window.
- [ ] For temporary webhook diagnostics, set `REVENUECAT_WEBHOOK_DEBUG_LOGGING=true`, deploy,
      inspect the redacted `revenuecat_webhook_event` Cloud Log entry, then set it back to `false`
      and redeploy.
- [ ] Deploy `revenueCatWebhook` and `deleteUserAccount` after secrets are available.
- [ ] Configure the webhook URL as
      `https://us-central1-<firebase-project-id>.cloudfunctions.net/revenueCatWebhook`.
- [ ] Configure the exact Authorization value and signing secret used by the Function.
- [ ] Subscribe the webhook to all production events so canonical state is reconciled after any
      purchase, renewal, cancellation, billing issue, expiration, transfer, or refund.
- [ ] Confirm Firestore clients can read only their own subscription and cannot write any.

Public SDK keys are client identifiers and may be embedded in builds. The RevenueCat secret API key,
webhook authorization value, signing secret, and store credentials must never use `EXPO_PUBLIC_*`.

## Restore and Account Deletion Policy

- Restore is available only after the anonymous session is secured.
- The launch policy is one active Bearing account per store purchase. A restore transfers the
  purchase to the currently authenticated Firebase UID under the approved RevenueCat setting.
- Support must verify the store transaction through approved consoles before resolving ownership
  disputes. Never ask for passwords, API keys, or full payment-card details.
- Bearing account deletion removes the RevenueCat customer record before Firestore and Firebase
  Authentication. A RevenueCat 404 is an idempotent success.
- Deleting the app or Bearing account does not cancel the Apple or Google subscription. Users must
  cancel in store account settings; the paywall and Profile surface this distinction.

## Sandbox Acceptance Matrix

Record build ID, store account, Firebase UID suffix, timestamp, expected state, observed state,
screenshots, RevenueCat event ID, and Firestore result for every row. Use disposable accounts and
redact tokens and receipts.

| Platform    | Scenario                   | Required observation                                                        | Status |
| ----------- | -------------------------- | --------------------------------------------------------------------------- | ------ |
| iOS         | Monthly purchase/trial     | Localized terms, webhook, entitlement, configured grant, live balance       | [ ]    |
| iOS         | Annual purchase/trial      | Localized terms, webhook, entitlement, configured grant, live balance       | [ ]    |
| iOS         | Credit-pack purchase       | Consumable checkout, configured grant, refreshed balance, no Restore        | [ ]    |
| iOS         | Cancel renewal             | Access remains through paid-through date; auto-renew false                  | [ ]    |
| iOS         | Restore on second install  | Approved UID transfer and Firestore activation                              | [ ]    |
| Android     | Monthly purchase/trial     | Localized terms, webhook, entitlement, configured grant, live balance       | [ ]    |
| Android     | Annual purchase/trial      | Localized terms, webhook, entitlement, configured grant, live balance       | [ ]    |
| Android     | Credit-pack purchase       | Consumable checkout, configured grant, refreshed balance, no Restore        | [ ]    |
| Android     | Cancel renewal             | Access remains through paid-through date; auto-renew false                  | [ ]    |
| Android     | Restore on second install  | Approved UID transfer and Firestore activation                              | [ ]    |
| Both        | User cancels checkout      | No entitlement; cancellation telemetry only                                 | [ ]    |
| Both        | Billing issue/grace period | Bearing 360 remains available only while canonical entitlement is active    | [ ]    |
| Both        | Expiration/refund          | Bearing 360 fails closed after canonical reconciliation                     | [ ]    |
| Both        | AI success/failure         | Success debits one credit; failed generation refunds one credit once        | [ ]    |
| Both        | Grant config change        | Future grant/catalog copy changes without an app or Functions deployment    | [ ]    |
| Web/Expo Go | Unsupported checkout       | Clear native-app guidance; no broken subscription or pack purchase action   | [ ]    |
| Both        | Delayed webhook            | UI reports delayed activation and later recovers without repurchase         | [ ]    |
| Both        | Duplicate webhook          | One receipt and stable subscription state                                   | [ ]    |
| Both        | Account deletion           | RevenueCat customer removed; store subscription still independently managed | [ ]    |

## Regional Pricing Approval

Export Apple and Google price matrices and attach them to release evidence. For every launch market,
record currency, monthly price, annual price, annual discount, tax treatment, proceeds, current
trial/intro terms, local subscription disclosure requirements, reviewer, and approval date. Confirm
the live product response and signed UI match the approved store configuration.

M11.1-M11.3 remain manual handoffs until the console checklist, both-platform sandbox matrix, and
regional pricing approval have named evidence.
