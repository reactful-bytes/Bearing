# Bearing Privacy Policy

**Draft for owner and legal review. Not approved for publication.**

Effective date: July 31, 2026

Release placeholders that must be replaced before publication:

- Operator legal name: `[REQUIRED]`
- Operator mailing address and country: `[REQUIRED]`
- Privacy/support email: `[REQUIRED]`
- Public policy URL: `[REQUIRED]`
- Minimum user age and any regional child-privacy language: `[REQUIRED]`

## Scope

This policy explains how Bearing handles information in the iOS and Android app, Firebase backend,
and related support and operational systems. The approved operator identified above is the data
controller or business responsible for this handling where applicable.

## Information Bearing Handles

Account information includes Firebase UID, email address, display name, authentication state,
timezone, locale, and account timestamps. Firebase Authentication handles password credentials;
passwords are not stored in Bearing application documents.

User content includes Bearing calendar events, goals, SMART goal fields, milestones, steps, tasks,
notes, completion history, links among those records, and accepted AI-assisted plan fields.

Subscription records include platform, product identifier, entitlement state, period dates, and
server reconciliation timestamps after store billing is implemented. Bearing does not store full
payment-card details.

Device-local information includes selected calendar IDs, a writable default calendar ID, opaque
links to published system-calendar copies, and the account-scoped diagnostics preference. Exported
JSON and ICS files may remain in app cache, downloads, or destinations chosen by the user.

Operational data includes App Check and authentication results, function request metadata,
security and reliability logs, and, only after opt-in, finite product outcome events. Standard
cloud request logs may contain IP address, user agent, timestamps, trace identifiers, and service
metadata.

## Purposes and Legal Bases

Bearing processes information to provide requested account, synchronization, planning, scheduling,
export, AI, and support features; secure and troubleshoot the service; prevent abuse; maintain
backups and recover from incidents; administer future subscriptions; comply with law; and enforce
the Terms of Service.

The release owner must map applicable legal bases for each launch market. Depending on location,
these may include performing the user agreement, consent for optional calendar access and product
diagnostics, legitimate interests in service security and reliability, and legal obligations.

## Device Calendars

Calendar permission is optional. Bearing reads device-originated events live only from calendars
the user selects. It does not copy those events into Firestore. Calendar IDs and native event IDs
remain device-local. Bearing writes or updates a system-calendar copy only when the user requests
publication or edits a writable device event. An opaque marker in published event notes supports
reconciliation without containing a Firebase UID or provider credential. Revoking permission leaves
Bearing-only scheduling available.

Calendar account providers and the device operating system process calendar information under the
user's separate relationship with them. Removing a Bearing account cannot guarantee deletion of a
copy that is no longer reachable on the device or in an external calendar account.

## AI Goal Planning

For an eligible user who requests AI assistance, Bearing sends the goal title, description, and
target date through an App Check-protected Firebase Function to Google Gemini. Bearing validates the
response and presents an editable draft. No generated fields are saved until the user approves the
plan. Bearing does not create a separate database of rejected or failed drafts. Users should avoid
including sensitive information that is unnecessary for planning.

AI output can be inaccurate and is not medical, legal, financial, emergency, or other professional
advice.

## Optional Product Diagnostics

Product diagnostics are off by default and scoped to the signed-in account on an installation.
When enabled, Bearing submits only allowlisted event names and fixed result categories. Custom
payloads exclude UID, email, user content, calendar names and IDs, locations, link keys, tokens, and
raw errors. The authenticated transport and standard request logs are not anonymous.

Bearing does not sell personal information, use planning content for advertising, or send product
events to advertising or data-broker systems.

## Sharing and Processors

Bearing uses Google Firebase for authentication, Firestore, Functions, App Check, backups, and
operational logging; Google Gemini for requested AI generation; Apple and Google for distribution
and future in-app billing; and GitHub for source and release automation. The authoritative purpose,
data, configuration, retention, and approval inventory is in `docs/DATA_PROCESSORS.md`.

Information may also be disclosed when required by law, to protect users or the service, during an
approved business transaction, or with the user's direction. The operator must publish applicable
international-transfer mechanisms and processor agreements before launch.

## Retention

- Active account content remains until the user deletes it or the service applies an approved
  inactivity policy.
- After recent verification, a successful deletion request removes active Firestore records and
  Firebase Authentication. The current installation then attempts to purge account-scoped calendar
  settings and diagnostics consent; settings on other installations remain local until app data is
  removed there.
- Product outcome logs have a target retention of 30 days.
- Daily Firestore backups have a target retention of 30 days; monthly backups may remain for 12
  months; pre-migration and incident exports follow the documented recovery lifecycle.
- Security, billing, fraud, and legal records may remain only as long as required for their stated
  purpose or applicable law.
- User-created export files remain where the user saved or shared them until the user or operating
  system removes them.

The release owner must verify actual provider settings match these periods before publication.

## User Choices and Rights

Users can deny or revoke calendar access, disable product diagnostics, export account data as JSON,
export Bearing events as ICS, edit saved content, and request account deletion from Profile.
Deletion of an email account requires recent password verification. Users may optionally remove
reachable linked system-calendar copies first. If backend deletion does not complete, the account
remains available for an idempotent retry. If current-device cleanup fails after server confirmation,
the app instructs the user to clear its local data in device settings.

Depending on location, users may have rights to access, correct, delete, restrict, object, withdraw
consent, receive portable data, or complain to a regulator. Requests are made through Support in
Profile or the approved privacy email. Identity verification may be required. Withdrawing consent
does not affect earlier lawful processing.

## Security and Children

Bearing uses Firebase Authentication, App Check, owner-scoped Firestore rules, server-owned
entitlements, least-privilege access, secret management, validation, and encrypted provider
transport. No system is completely secure; users should use a unique password and protect their
device.

Bearing is not directed to children below the release-approved minimum age and does not knowingly
seek child data. The owner must define that age for every launch market and establish a deletion and
parental-request process before release.

## Changes and Contact

Material changes will receive a new effective date and any notice or renewed consent required by
law. Privacy questions and requests go to the approved contact listed at the top of the published
policy and through Support in the app.
