# Data Processors and Retention Inventory

## Purpose

This inventory grounds privacy disclosures and store questionnaires in the implemented system. The
release owner must verify contracts, data regions, retention controls, and production configuration
before launch and after every processor or feature change.

| Provider/system                             | Purpose                                                   | Data categories                                                                                                                 | Current retention/control                                                                                   | Release action                                                                       |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Google Firebase Authentication              | Account identity and sessions                             | UID, email, display name, auth metadata, credential verifier                                                                    | Until account deletion plus provider security records                                                       | Approve region/terms; enable supported sign-in and abuse controls                    |
| Cloud Firestore                             | Canonical app data                                        | Profile, Bearing events, goals, steps, tasks, notes, subscription entitlement, AI credit account/grants, temporary retry drafts | Account data deleted by callable; temporary AI retry records target 24-hour TTL                             | Verify production region, rules, indexes, TTL, deletion, and DPA                     |
| Cloud Functions                             | Trusted API, authorization, quota, privacy actions        | Auth context and request fields required by each callable                                                                       | Request metadata follows Google Cloud logging controls                                                      | Restrict IAM; document region and transfer basis; defer App Check to M17             |
| Google Cloud Logging                        | Reliability, security, optional product outcomes          | Service metadata; allowlisted product outcomes after opt-in                                                                     | Product-event target 30 days; other log classes require owner policy                                        | Configure buckets, exclusions, 30-day product retention, and access review           |
| Google Cloud Storage/Firestore export       | Disaster recovery                                         | Firestore collections in encrypted exports                                                                                      | 30 daily, 12 monthly, plus approved pre-migration/incident copies                                           | Configure WIF, lifecycle, region, restore drill, and deletion handling               |
| Google Gemini API                           | User-requested AI goal planning                           | Goal title, description, target date; generated draft                                                                           | Successful Bearing retry record targets 24-hour TTL; provider handling must be verified                     | Approve Gemini terms/DPA, data-use setting, region, retention, and safety review     |
| RevenueCat                                  | Cross-platform purchase and entitlement reconciliation    | Firebase UID as App User ID, store product, transaction, renewal, entitlement state                                             | Customer record removed before Bearing account deletion; store transaction retention remains provider-owned | Approve DPA/region/retention; configure security, transfer policy, and deletion test |
| Apple App Store / StoreKit                  | Distribution and iOS billing                              | Store account, purchase/transaction and entitlement data                                                                        | Controlled by Apple and approved reconciliation records                                                     | M11 product setup; privacy labels; subscription/refund disclosures                   |
| Google Play / Play Billing                  | Distribution and Android billing                          | Store account, purchase token/transaction and entitlement data                                                                  | Controlled by Google and approved reconciliation records                                                    | M11 product setup; Data Safety; subscription/refund disclosures                      |
| GitHub Actions                              | Source, CI, release and backup automation                 | Source/test data; cloud workload identity metadata; no intended production user content                                         | Workflow logs/artifacts per repository settings                                                             | Set least privilege, artifact retention, WIF, branch protection, and access review   |
| Expo development/build services             | Development clients and any future hosted builds/updates  | Build metadata, source/assets, signing or update metadata depending on configuration                                            | Not approved as a production processor until release setup is chosen                                        | M12 review of EAS terms, credentials, retention, access, and update policy           |
| Device OS and configured calendar providers | User-controlled local calendar access and synchronization | Selected live events, calendar IDs, published copies                                                                            | Native IDs/settings remain local until account purge/app-data removal; provider copies follow user account  | Match permission/store disclosures; never treat provider as Bearing cloud storage    |

## Data Not Collected by Current v1

- Advertising identifiers, contact lists, precise location, health records, microphones, cameras,
  photos, and third-party calendar OAuth credentials.
- Full payment-card details.
- Device-originated calendar events in Firestore.
- Separate rejected or failed AI draft records.
- User content in custom product telemetry payloads.

## Review Triggers

Update this inventory before adding a processor, analytics SDK, crash reporter, attachment storage,
notification provider, support platform, billing service, or new AI model. Reconcile changes with
the Privacy Policy, Terms, App Store privacy labels, Google Play Data Safety form, security review,
and account deletion/export behavior.
