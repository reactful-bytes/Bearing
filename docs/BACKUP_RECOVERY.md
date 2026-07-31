# Backup, Migration, and Recovery

## Objectives

- Recovery point objective (RPO): 24 hours for Firestore account data.
- Recovery time objective (RTO): 4 hours after incident declaration.
- Retention: 30 daily exports, 12 monthly exports, and one pre-migration export per production schema change.
- Scope: `users`, `events`, `goals`, `goalSteps`, `notes`, `tasks`, and `subscriptions`.
- Device calendar IDs and linked-copy caches are device-local and are not recoverable from Firestore exports.

## Required Cloud Setup

1. Create a regional Google Cloud Storage bucket in the same location boundary as Firestore.
2. Enable object versioning and a lifecycle policy that retains daily exports for 30 days and monthly exports for 12 months.
3. Create a least-privilege backup service account with Firestore export and backup-bucket write permissions.
4. Configure GitHub Workload Identity Federation. Do not create a downloadable service-account key.
5. Set repository variables `FIREBASE_PROJECT_ID` and `FIRESTORE_BACKUP_BUCKET`.
6. Set secrets `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_BACKUP_SERVICE_ACCOUNT`.

The `Firestore Backup` workflow skips safely until the required variables exist. Once configured, it exports daily at 05:30 UTC and supports owner-triggered pre-migration exports.

## Migration Rules

- Firestore documents remain backward-readable for at least one released mobile version.
- Additive fields must have decoder defaults before writes begin.
- Destructive renames require dual-read, dual-write, backfill, verification, then removal in a later release.
- Record every migration with owner, affected collections, estimated document count, rollback trigger, and verification query.
- Run a named pre-migration export and record its path in the release checklist.

## Restore Drill

Run quarterly and before the first production release:

1. Create or select an isolated staging Firebase project. Never restore drills into production.
2. Choose the newest completed export older than 15 minutes and record its object path and completion time.
3. Import it with `gcloud firestore import gs://BUCKET/PATH --project=STAGING_PROJECT`.
4. Validate collection counts and sample one owner-scoped document from every collection.
5. Run the Firestore rules emulator suite and mobile smoke tests against staging configuration.
6. Verify missing optional fields decode with safe defaults and subscription documents remain client read-only.
7. Record achieved RPO/RTO, discrepancies, cleanup confirmation, and follow-up owner.

## Incident Recovery

1. Declare the incident, freeze writes if continued mutation increases loss, and record the detection timestamp.
2. Preserve current production state with an incident export before any import or backfill.
3. Prefer forward repair for isolated documents. Use full import only when the incident commander approves the blast radius.
4. Restore into staging first, validate, then execute the approved production repair/import.
5. Reconcile Auth separately; Firestore exports do not contain Firebase Authentication users.
6. Revalidate subscription authority with the billing source after any entitlement restore.
7. Publish an incident summary with actual RPO/RTO and prevention actions.

## Rollback Triggers

Rollback or halt a migration when owner-read failures, authorization denials, decode failures, or document-count variance exceed 1%. The rollback owner must use the recorded pre-migration export or reversible backfill, then rerun authorization and critical journey tests.
