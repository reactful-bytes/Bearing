# Legal and Store Disclosure Release Checklist

## Status

Repository copy and in-app access are implemented. M9.4 remains a manual handoff until every
release blocker below has named evidence and approval. These documents are implementation-aligned
drafts, not legal advice.

## Owner and Legal Approval

- [ ] Replace every `[REQUIRED]` placeholder in the Privacy Policy and Terms.
- [ ] Confirm contracting/operator legal name, address, country, and business contact.
- [ ] Set `EXPO_PUBLIC_SUPPORT_EMAIL` to a monitored address in release builds.
- [ ] Approve minimum age and child-privacy process for every launch market.
- [ ] Approve governing law, venue, consumer notices, liability cap, and dispute process.
- [ ] Approve lawful bases, international transfers, processor agreements, and data regions.
- [ ] Obtain qualified legal review and record reviewer, version, date, and approval.
- [ ] Replace the in-app draft notice only after the hosted and in-app copy is approved.
- [ ] Decide whether account creation requires linked terms/privacy notice, affirmative acceptance,
      and versioned consent records; implement the approved flow before release.

## Public Access

- [ ] Host approved Privacy Policy and Terms at stable public HTTPS URLs without authentication.
- [ ] Add the Privacy URL to App Store Connect and Google Play Console.
- [ ] Add the Terms URL where store metadata and subscription purchase UI require it.
- [ ] Verify in-app documents match the hosted approved versions and effective date.
- [ ] Publish a public account-deletion help page describing the in-app path and retained data.
- [ ] Test Support email and legal links in signed release builds on iOS and Android.

## Store Questionnaires

- [ ] Complete Apple App Privacy labels from `docs/DATA_PROCESSORS.md` and observed production use.
- [ ] Complete Google Play Data Safety, account deletion, and data-retention declarations.
- [ ] Disclose optional calendar permission and explain Firestore-only fallback.
- [ ] Disclose AI input sharing with Gemini, editable output, limitations, and safety boundaries.
- [ ] Do not declare advertising, tracking, precise location, contacts, health, camera, or microphone
      collection unless implementation changes and review is repeated.
- [ ] Recheck SDK manifests and network behavior against both store submissions.

## Subscriptions

- [x] Implement entitlement reconciliation, purchase, restore, store-management, deletion cleanup,
      and failure UX in the repository.
- [ ] Configure and approve M11 products, RevenueCat project, restore transfer policy, secrets, and
      webhook in staging and production.
- [ ] Show live localized price, billing period, trial/intro terms, auto-renewal, and included features
      before purchase.
- [ ] Verify Bearing 360 naming, remotely configured non-expiring subscription/trial grants,
      `credit_packs` consumables, one-credit generation debit/refund, and non-transferability copy.
- [ ] Link approved Privacy and Terms from the paywall.
- [ ] State that store settings control cancellation/refunds and account deletion does not cancel.
- [ ] Verify Apple and Google subscription disclosures in sandbox and signed release builds.
- [ ] Approve the regional monthly/annual pricing matrix and current trial/intro strategy.
- [ ] Verify web and Expo Go explain that native checkout is unavailable without exposing a broken
      subscription or credit-pack action.

## Privacy Request Procedure

1. Receive requests through the monitored support/privacy address; never request passwords or API
   secrets.
2. Record request type and deadline without copying unnecessary user content.
3. Verify identity proportionately through the authenticated account or approved support process.
4. Direct self-service export/deletion through Profile when possible; use server procedures only
   with documented authorization.
5. Account for Firestore, Auth, RevenueCat balances/transactions and customer deletion, local
   settings, linked calendar copies, logs, backups, and store billing authority. Explain data that
   cannot be reached or must be retained by law.
6. Confirm completion through the verified channel and retain only the minimum compliance record.
7. Escalate missed deadlines, child requests, regulator contacts, security incidents, or disputed
   identity to the named privacy owner and legal reviewer.

## Deletion Recovery Procedure

1. A failed callable leaves authentication available for the user to retry the idempotent deletion
   request; support must not claim completion from a client error.
2. If Firestore cleanup completed but Authentication deletion failed, retry the same callable after
   resolving the provider error. Empty collection queries and missing documents are valid on retry.
3. If the server confirms deletion but current-device cleanup reports a failure, direct the user to
   clear Bearing's app data or uninstall it on that installation.
4. Explain that other installations, exported files, unreachable calendar copies, provider logs,
   and backups require their documented lifecycle and are not cleared by the current client.
5. Reconcile exceptional cases through approved Firebase administrative procedures, record only
   minimum evidence, and never restore a deleted account merely to complete local cleanup.

## Release Evidence

Record public URLs, SHA/version of approved source copy, screenshots of Profile access, support test,
store questionnaire exports, processor/DPA approvals, retention settings, and reviewer signoff in
the release evidence package. Any material feature, processor, retention, region, or monetization
change reopens this checklist.
