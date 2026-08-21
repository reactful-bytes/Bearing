# Monetization Release Handoff

## Status

The mobile purchase flow, RevenueCat adapter, server reconciliation, entitlement listener, account
deletion cleanup, and strict funnel telemetry are repository-complete. Store products, RevenueCat
project settings, managed secrets, deployment, regional approval, and sandbox evidence remain
release-owner handoffs.

## Launch Contract

| Setting                 | Launch value                                 |
| ----------------------- | -------------------------------------------- |
| RevenueCat entitlement  | `premium` (configured by `REVENUECAT_ENTITLEMENT_IDENTIFIER`) |
| RevenueCat offering     | `default`, set as current                    |
| Monthly product ID      | `bearing_premium_monthly`                    |
| Annual product ID       | `bearing_premium_annual`                     |
| Monthly reference price | USD 7.99                                     |
| Annual reference price  | USD 59.99                                    |
| Trial/intro offer       | None at launch                               |
| iOS app ID              | `com.reactfulbytes.bearing`                  |
| Android app ID          | `com.reactfulbytes.bearing`                  |
| Entitlement authority   | Firestore `subscriptions/{firebaseUid}` only |

Store-localized price and billing period always override reference-price copy in the app. Do not
hard-code either price into the purchase UI.

## Authority Flow

1. A secured Firebase account opens the custom paywall; anonymous accounts cannot purchase.
2. The app configures RevenueCat with the Firebase UID as the App User ID.
3. StoreKit or Play Billing owns checkout, payment, cancellation, and refund handling.
4. RevenueCat sends an authenticated webhook to the deployed `revenueCatWebhook` Function.
5. The Function validates authorization, raw-body HMAC, and timestamp, then fetches the canonical
   subscriber from RevenueCat instead of trusting the event type.
6. The Function writes the UID-keyed subscription and an idempotent event receipt. Only `active`
   and `in_grace_period` unlock Premium.
7. The client waits for the Firestore listener to activate; RevenueCat `CustomerInfo` never grants
   app access directly.

Cancellation keeps access through the paid-through date with `autoRenew: false`. Billing issues map
to grace-period access while RevenueCat reports an active entitlement. Expired or missing
entitlements fail closed.

## Console Setup

- [ ] Create the matching auto-renewing monthly and annual products in App Store Connect.
- [ ] Create the matching base plans/subscriptions in Google Play Console.
- [ ] Set USD reference prices to 7.99 monthly and 59.99 annual; do not add a trial or intro offer.
- [ ] Connect both store apps to one RevenueCat project.
- [ ] Create entitlement `premium` and attach both products. If it is renamed, set
      `REVENUECAT_ENTITLEMENT_IDENTIFIER` to the new identifier before deploying; the default is
      `premium`.
- [ ] Create offering `default`, make it current, and add monthly and annual packages.
- [ ] Configure RevenueCat restore behavior to transfer a purchase to the currently authenticated
      Firebase UID. Record and approve the collision/support policy before enabling production.
- [ ] Add the iOS and Android public SDK keys to the corresponding EAS environments as
      `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
- [ ] Set `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTHORIZATION`,
      `REVENUECAT_WEBHOOK_SIGNING_SECRET`, and (when different from `premium`)
      `REVENUECAT_ENTITLEMENT_IDENTIFIER` as Firebase Functions parameters.
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

| Platform | Scenario                   | Required observation                                                        | Status |
| -------- | -------------------------- | --------------------------------------------------------------------------- | ------ |
| iOS      | Monthly purchase           | Store success, webhook receipt, active UID entitlement                      | [ ]    |
| iOS      | Annual purchase            | Localized annual terms and active UID entitlement                           | [ ]    |
| iOS      | Cancel renewal             | Access remains through paid-through date; auto-renew false                  | [ ]    |
| iOS      | Restore on second install  | Approved UID transfer and Firestore activation                              | [ ]    |
| Android  | Monthly purchase           | Store success, webhook receipt, active UID entitlement                      | [ ]    |
| Android  | Annual purchase            | Localized annual terms and active UID entitlement                           | [ ]    |
| Android  | Cancel renewal             | Access remains through paid-through date; auto-renew false                  | [ ]    |
| Android  | Restore on second install  | Approved UID transfer and Firestore activation                              | [ ]    |
| Both     | User cancels checkout      | No entitlement; cancellation telemetry only                                 | [ ]    |
| Both     | Billing issue/grace period | Premium remains available only while canonical entitlement is active        | [ ]    |
| Both     | Expiration/refund          | Premium fails closed after canonical reconciliation                         | [ ]    |
| Both     | Delayed webhook            | UI reports delayed activation and later recovers without repurchase         | [ ]    |
| Both     | Duplicate webhook          | One receipt and stable subscription state                                   | [ ]    |
| Both     | Account deletion           | RevenueCat customer removed; store subscription still independently managed | [ ]    |

## Regional Pricing Approval

Export Apple and Google price matrices and attach them to release evidence. For every launch market,
record currency, monthly price, annual price, annual discount, tax treatment, proceeds, local
subscription disclosure requirements, reviewer, and approval date. Confirm the annual discount is
intentional and that no store-created intro offer appears in the live product response.

M11.1-M11.3 remain manual handoffs until the console checklist, both-platform sandbox matrix, and
regional pricing approval have named evidence.
