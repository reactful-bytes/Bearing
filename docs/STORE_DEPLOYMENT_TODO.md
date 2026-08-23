# Apple App Store and Google Play Deployment To-Do

## Purpose

Complete this list from top to bottom for the first production release. Do not advance past a gate
with an unchecked blocker. `Programmatic` means a repository code or configuration change;
`Manual` means owner work in a vendor console, on a physical device, or with a reviewer. Attach the
named evidence without storing credentials, tokens, receipts, or personal test data in the
repository.

Detailed acceptance criteria remain in `LEGAL_RELEASE_CHECKLIST.md`, `MONETIZATION_RELEASE.md`,
`RELEASE_HANDOFF.md`, `OBSERVABILITY.md`, `BACKUP_RECOVERY.md`, `PERFORMANCE.md`, and
`LAUNCH_OPERATIONS.md`.

## 1. Assign Release Ownership and Scope

- [ ] **Manual - Both:** Name the launch commander, mobile release, Firebase/reliability, billing,
      privacy/security, and support owners, including backups, timezones, and escalation channels in
      `LAUNCH_OPERATIONS.md`.
- [ ] **Manual - Both:** Create a restricted release-evidence location for approvals, command logs,
      build IDs, screenshots, console exports, defects, and go/no-go decisions.
- [ ] **Manual - Both:** Confirm launch countries, languages, support hours, minimum OS versions,
      supported devices, and whether the release is public or initially limited.
- [ ] **Manual - Apple:** Decide whether iPad is supported. It is currently enabled by
      `ios.supportsTablet` and therefore requires iPad acceptance and listing assets.
- [ ] **Programmatic - Apple:** If iPad is not supported, set `ios.supportsTablet` to `false` in
      `mobile/app.config.ts`, regenerate native configuration, and rerun the quality and build gates.

**Gate 1 evidence:** named owners, launch scope, platform/device matrix, and evidence location.

## 2. Complete the Prebuild Company-Partner Walkthrough

- [ ] **Manual - Both:** Schedule an in-person or shared-screen walkthrough with company partners
      before creating preview or production builds. Use the latest development build on
      representative iOS and Android devices.
- [ ] **Manual - Both:** Walk through the complete user experience together: first launch,
      authentication, Calendar, Focus Mode, Goals, Tasks, Notes, Profile, device calendars, Premium,
      AI planning, export, account deletion, support, privacy, and error/recovery states.
- [ ] **Manual - Both:** Review the UI, navigation, copy, feature scope, accessibility, store-facing
      claims, and overall product experience. Record what should remain, change, or be removed before
      release.
- [ ] **Manual - Both:** Log every bug, usability problem, visual issue, missing state, and company
      concern with severity, owner, expected outcome, and due date.
- [ ] **Manual - Both:** Decide and record company-owned launch choices, including Premium features,
      monthly and annual pricing, trial/intro strategy, launch markets, supported devices, iPad
      support, brand/listing direction, support commitments, and accepted product limitations.
- [ ] **Manual - Both:** Approve or replace the proposed USD 7.99 monthly, USD 59.99 annual, no-trial
      pricing and the one-purchase/one-Bearing-account restore-transfer policy.

### UI Fixes

- [ ] **Programmatic - Both:** Improve the Calendar view FABs so they have a cleaner, more polished
      appearance and interaction design.
- [x] **Programmatic - Both:** Change the Calendar refresh button so it automatically focuses or
      scrolls the view to the current time after refreshing.
- [ ] **Programmatic - Both:** Change the Calendar navigation button into a FAB menu that lets the
      user open either Calendar view or Focus Mode.
- [x] **Programmatic - Both:** Add a Profile preference for selecting 12-hour or 24-hour time.
- [ ] **Programmatic - Both:** Change the Calendar screen time-zone field to a selector input.
- [x] **Programmatic - Both:** Replace Event Alarms with two separate selector inputs and rename the
      feature from Alarms to Alerts.
- [x] **Programmatic - Both:** Display all-day events in a dedicated header instead of blocking the
      entire day on the Calendar.
- [x] **Programmatic - Both:** Replace the Event date and time fields with proper platform-appropriate
      date and time selectors.

- [ ] **Programmatic - Both:** Fix all walkthrough release blockers and approved UI, copy, behavior,
      configuration, and test changes. Run focused validation after each fix and the full quality gate
      after the walkthrough issue set is complete.
- [ ] **Manual - Both:** Repeat affected walkthrough paths on both platforms, verify every blocker is
      resolved, disposition any deferred non-blockers, and obtain company-partner prebuild signoff.

**Gate 2 evidence:** attendees/date, walkthrough recording or notes, decision log, approved pricing
and scope, issue tracker with dispositions, validation results, and partner signoff.

## 3. Establish Store and Vendor Accounts

- [ ] **Manual - Apple:** Enroll the legal operator in the Apple Developer Program, complete
      organization verification if applicable, require MFA, and grant least-privilege team roles.
- [ ] **Manual - Apple:** Create or verify the App Store Connect app for bundle ID
      `com.reactfulbytes.bearing`; record the Apple team ID, SKU, and application owner.
- [ ] **Manual - Apple:** Accept current developer and paid-app agreements and complete tax and
      banking setup before configuring paid subscriptions.
- [ ] **Manual - Google:** Create and verify the Play Console developer account, require MFA, and
      complete identity, organization, contact, and payments-profile verification.
- [ ] **Manual - Google:** Create the Play app for package `com.reactfulbytes.bearing`; complete any
      required app-access, organization, or production-access declarations.
- [ ] **Manual - Google:** Determine whether the account must complete a closed-test duration or
      tester-count requirement before production access, and schedule that lead time if applicable.
- [ ] **Manual - Both:** Create operator-owned production projects or organizations in Expo/EAS,
      Firebase/Google Cloud, RevenueCat, and Gemini rather than relying on personal credentials.
- [ ] **Manual - Both:** Approve vendor terms, DPAs, data regions, retention, credential custody,
      emergency access, and processor use from `DATA_PROCESSORS.md`.

**Gate 3 evidence:** verified accounts, accepted agreements, app records, role list, and documented
production-access constraints.

## 4. Finalize Legal, Privacy, and Support

- [ ] **Manual - Both:** Supply the operator legal name, address, country, monitored support/privacy
      email, minimum age, governing law, venue, consumer notices, liability terms, lawful bases,
      international-transfer basis, and child-privacy process.
- [ ] **Manual - Both:** Obtain qualified legal review of `PRIVACY_POLICY.md` and
      `TERMS_OF_SERVICE.md`; record approved versions, effective date, reviewer, and approval.
- [ ] **Programmatic - Both:** Replace every `[REQUIRED]`, `[OWNER APPROVAL REQUIRED]`, and draft
      notice in approved repository and in-app legal copy.
- [ ] **Manual - Both:** Decide whether account creation requires linked notice, affirmative
      acceptance, or versioned consent records.
- [ ] **Programmatic - Both:** Implement and test the approved account-creation consent behavior if
      legal review requires it.
- [ ] **Manual - Both:** Host the approved Privacy Policy, Terms, support page, and account-deletion
      instructions at stable public HTTPS URLs without authentication.
- [ ] **Programmatic - Both:** Set `EXPO_PUBLIC_SUPPORT_EMAIL` in preview and production EAS
      environments and add approved legal URLs to app configuration or UI wherever final review
      requires live links.
- [ ] **Manual - Both:** Test every hosted URL and support-email action from signed iOS and Android
      builds; confirm in-app copy matches the hosted versions.
- [ ] **Manual - Apple:** Draft App Privacy answers from actual signed-build traffic and
      `DATA_PROCESSORS.md`.
- [ ] **Manual - Google:** Draft Data Safety, account-deletion, retention, ads, content-rating, and
      target-audience answers from actual signed-build traffic and `DATA_PROCESSORS.md`.

**Gate 4 evidence:** approved legal source, public URLs, support test, consent decision, and draft
store privacy questionnaires.

## 5. Close Repository and Security Blockers

- [ ] **Programmatic - Both:** Complete M17's coordinated native/web App Check implementation only
      after M16 is stable. Ship token-capable clients and review metrics before enabling callable
      enforcement; Auth, ownership, and quota checks remain mandatory.
- [ ] **Programmatic - Both:** Add bounded staging probes for `backendStatus`, AI credit status and
      generation, telemetry, export, and account deletion on native and web.
- [ ] **Programmatic - Both:** Run `eas init` from `mobile/`, review the generated EAS project link in
      `mobile/app.config.ts`, and keep app slug, owner, bundle ID, and package consistent.
- [ ] **Programmatic - Both:** Confirm `mobile/app.config.ts` contains the approved marketing
      version. Keep EAS remote auto-incrementing build numbers/version codes and never reuse one.
- [ ] **Programmatic - Both:** Review dependency advisories and Expo SDK compatibility; apply
      compatible security updates and document explicitly accepted residual findings.
- [ ] **Programmatic - Both:** Verify release configuration contains no debug endpoints, draft
      claims, test product IDs, test Firebase project IDs, secrets, or unsupported permissions.
- [ ] **Programmatic - Apple:** Inspect the generated signed app for calendar usage text, privacy
      manifests, encryption/export-compliance answers, orientations, and supported devices; correct
      `app.config.ts` or plugins and rebuild if needed.
- [ ] **Programmatic - Google:** Inspect the generated AAB manifest for calendar permissions, target
      API compliance, billing library compatibility, backup behavior, launcher icons, and unsupported
      permissions; correct configuration and rebuild if needed.
- [ ] **Programmatic - Both:** Run the full quality gate on Node 24/npm 11 and Java 21 where needed:

  ```text
  cd mobile
  npm ci
  npm run typecheck
  npm run lint
  npm run format:check
  npm test -- --runInBand
  npm run test:coverage -- --runInBand
  npm run test:rules
  npx expo-doctor
  npx expo install --check

  cd ../functions
  npm ci
  npm run quality
  ```

- [ ] **Manual - Both:** Confirm the same quality workflow passes in CI from the exact candidate
      commit, closing M1.5.

**Gate 5 evidence:** reviewed diff, green local and CI logs, dependency decision, App Check tests,
manifest review, commit SHA, and lockfile hashes.

## 6. Configure Production Firebase and Operations

- [ ] **Manual - Both:** Select and record production Firebase, Firestore, Functions, logging, and
      backup regions before creating data; reconcile them with legal and processor approvals.
- [ ] **Manual - Both:** Enable only approved Firebase Authentication providers and configure abuse
      controls, authorized domains, support email, password policy, and account-email templates.
- [ ] **Manual - Both:** Register signed Apple and Android apps with Firebase App Check using the
      approved platform providers; validate tokens before enabling enforcement.
- [ ] **Manual - Both:** Set production Functions environment values for `GEMINI_API_KEY`,
      `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTHORIZATION`, and
      `REVENUECAT_WEBHOOK_SIGNING_SECRET` in the ignored deployment environment. Use separate
      staging and production values and migrate to managed secrets only as a separately reviewed
      change.
- [ ] **Programmatic - Both:** Deploy reviewed Firestore rules, indexes, and Functions from the
      candidate source. Wait for every required index to become enabled.
- [ ] **Manual - Both:** Keep App Check enforcement disabled until M17's native/web token and metric
      gates pass, and restrict Firebase/Google Cloud IAM to named operators.
- [ ] **Manual - Both:** Set Functions quotas/max-instance expectations, Gemini quota and safety
      settings, cloud budgets, billing alerts, and emergency spend thresholds.
- [ ] **Manual - Both:** Create product and reliability dashboards, log-based metrics, two
      notification channels, and alerts from `OBSERVABILITY.md`; deliver a synthetic alert.
- [ ] **Manual - Both:** Configure product-event retention to 30 days and approve retention for
      request, security, billing, and audit logs.
- [ ] **Manual - Both:** Create the regional backup bucket, lifecycle policy, least-privilege service
      account, GitHub Workload Identity Federation, and repository variables/secrets from
      `BACKUP_RECOVERY.md`.
- [ ] **Manual - Both:** Run a successful production export and isolated staging restore drill;
      record RPO/RTO, collection checks, authorization tests, and cleanup.
- [ ] **Manual - Both:** Invoke each authenticated production or production-equivalent callable from
      a signed test build and verify clients cannot write subscriptions or another user's data.

**Gate 6 evidence:** deployment logs, enabled indexes, secret names only, App Check results,
dashboard/alert proof, budget policy, latest backup, and restore-drill report.

## 7. Configure Subscriptions and RevenueCat

- [ ] **Manual - Apple:** Create monthly and annual auto-renewing subscriptions using
      `bearing_premium_monthly` and `bearing_premium_annual`, place them in the approved subscription
      group, add review/localization details, and set prices with no trial or intro offer.
- [ ] **Manual - Google:** Create matching subscriptions/base plans using the same product IDs, set
      prices and availability, and add no trial or introductory offer.
- [ ] **Manual - Both:** Export and approve regional price matrices, taxes, proceeds, annual
      discount, local disclosure requirements, and launch-market availability.
- [ ] **Manual - Both:** Connect both store apps to one RevenueCat project; create entitlement
      `premium`, current offering `default`, and monthly/annual packages attached to matching
      products.
- [ ] **Manual - Both:** Configure and approve RevenueCat purchase-transfer behavior and document
      support handling for ownership collisions.
- [ ] **Manual - Both:** Add `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and
      `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` to the corresponding EAS environments.
- [ ] **Manual - Both:** Configure the production RevenueCat webhook URL, exact Authorization value,
      signing secret, and all production event types after Functions secrets and deployment exist.
- [ ] **Manual - Both:** Execute every row in the sandbox acceptance matrix in
      `MONETIZATION_RELEASE.md`, including purchase, cancellation, restore/transfer, billing issue,
      expiration/refund, delayed and duplicate webhook, and account deletion.
- [ ] **Programmatic - Both:** Fix incorrect localized-price, disclosure, purchase, restore,
      entitlement, webhook, or deletion behavior found in sandbox; rerun focused tests and the full
      quality gate before rebuilding.

**Gate 7 evidence:** product exports, approved regional matrix, RevenueCat configuration, redacted
sandbox matrix, webhook receipts, and canonical Firestore results.

## 8. Configure EAS Credentials and Build Candidates

- [ ] **Manual - Both:** Restrict Expo organization access, require MFA, and approve EAS terms,
      credential storage, artifact retention, and processor use.
- [ ] **Manual - Both:** Create development, preview, and production EAS environments with correct
      Firebase public client configuration, support email, RevenueCat public SDK keys, and
      `EXPO_PUBLIC_APP_ENV`. Never place server/store secrets in mobile environments.
- [ ] **Manual - Apple:** Configure the distribution certificate, provisioning profile, App Store
      Connect API access, registered development devices, and credential recovery ownership.
- [ ] **Manual - Google:** Create or register the Play App Signing/upload key and a least-privilege
      Play service account; store recovery material under the approved custody process.
- [ ] **Manual - Both:** Produce one preview build per platform from the reviewed commit and record
      artifact URLs, checksums, version, build number/version code, environment, and source SHA.
- [ ] **Manual - Both:** Install preview builds through their intended distribution paths and confirm
      they connect only to intended staging or production-equivalent services.

**Gate 8 evidence:** credential custody record, redacted EAS environment inventory, installable iOS
and Android preview artifacts, checksums, and source/build mapping.

## 9. Complete Native Acceptance and Beta

- [ ] **Manual - Both:** Run critical Maestro journeys on installed builds with disposable accounts:
      authentication, manual goals, task conversion, listener recovery, premium gating, export, and
      deletion.
- [ ] **Manual - Both:** Complete M6.13 calendar permission, discovery, CRUD, recurrence, refresh,
      Focus Mode, Bearing-only fallback, linked publication, deletion, interruption, and two-device
      reconciliation tests.
- [ ] **Manual - Apple:** Test supported iPhone and, if enabled, iPad models with relevant iOS
      versions, VoiceOver, Dynamic Type, launcher presentation, and interrupted flows.
- [ ] **Manual - Google:** Test representative low/mid/high Android devices and supported OS versions
      with TalkBack, font/display scaling, back navigation, launcher masks, and interrupted flows.
- [ ] **Manual - Both:** Run `PERFORMANCE.md` with representative data and meet cold-start, tab,
      scrolling, query-scope, and 20-minute memory budgets.
- [ ] **Manual - Both:** Verify offline/error recovery, account isolation, password reset, support,
      legal links, JSON/ICS sharing, deletion retry, and absence of sensitive content in logs.
- [ ] **Manual - Apple:** Run an internal TestFlight cycle, then an external or release-candidate
      cycle if required by the release plan.
- [ ] **Manual - Google:** Run Internal Testing, then any required closed test and the final
      release-candidate cycle.
- [ ] **Programmatic - Both:** Triage every beta defect. Fix all severity-1/severity-2,
      authorization, entitlement, data loss, deletion/export, accessibility blocker, and store-policy
      defects; rerun focused tests, the full gate, and affected native acceptance.
- [ ] **Manual - Both:** Record crash-free/vitals results, tester/device coverage, resolved defects,
      accepted lower-severity issues, and named go/no-go approval.

**Gate 9 evidence:** native matrices, performance/accessibility results, beta reports, defect
disposition, vitals, and release-candidate approval.

## 10. Produce and Freeze Production Builds

- [ ] **Programmatic - Both:** Update the marketing version if required, ensure release notes match
      shipped behavior, and freeze the reviewed commit after the final quality gate.
- [ ] **Manual - Both:** Build signed production candidates with the `production` EAS profile from
      the exact approved commit; record immutable iOS build number and Android version code.
- [ ] **Manual - Both:** Verify production environment, legal copy, public URLs, permissions,
      products, App Check, purchases, restore, export, deletion, support, and telemetry consent in
      the exact production artifacts.
- [ ] **Manual - Both:** Record artifact checksums and tag accepted source with marketing version
      plus platform build identifiers under the repository's approved Git process.
- [ ] **Manual - Both:** Do not modify the binary, configuration, listing claims, products, or
      backend contract after signoff without reopening affected gates and generating a new build
      number/version code.

**Gate 10 evidence:** production artifacts, final smoke results, checksums, source tag, and signed
go/no-go record.

## 11. Assemble Store Listings

- [ ] **Manual - Both:** Use the approved name, category, descriptions, promotional copy, support
      URL, Privacy URL, Terms URL, deletion URL, contact details, copyright, and release notes from
      `RELEASE_HANDOFF.md`.
- [ ] **Manual - Both:** Validate icons on required masks/backgrounds; capture clean screenshots of
      Calendar day/month, Goals, Tasks, Focus Mode, Notes, and Premium without user data, draft copy,
      debug UI, or account identifiers.
- [ ] **Manual - Apple:** Upload required iPhone and, if supported, iPad screenshots; complete age
      rating, App Privacy, review contact, demo instructions, encryption/export compliance, content
      rights, and subscription review details.
- [ ] **Manual - Google:** Upload phone and any supported tablet screenshots plus feature graphic;
      complete Data Safety, app access, ads, content rating, target audience, account deletion, and
      other applicable policy declarations.
- [ ] **Manual - Both:** Verify calendar and AI disclosures, localized subscription price/period,
      auto-renewal, Premium features, cancellation/refund ownership, restore, and legal links in both
      the listing and signed paywall.
- [ ] **Manual - Both:** Have product, legal/privacy, billing, and release owners preview and approve
      each localized listing exactly as reviewers and customers will see it.

**Gate 11 evidence:** listing exports/previews, final assets, questionnaire copies, and
cross-functional approval.

## 12. Upload and Submit for Review

- [ ] **Manual - Apple:** Upload the accepted iOS build, wait for processing, attach it to the app
      version and subscriptions, complete compliance questions, and submit for App Review using
      manual or phased release rather than immediate uncontrolled publication.
- [ ] **Manual - Google:** Upload the accepted AAB to the required testing track, resolve pre-launch
      report/policy warnings, promote the exact artifact to production, and submit with a staged
      rollout percentage.
- [ ] **Manual - Both:** Provide accurate reviewer instructions and a disposable secured account
      that can exercise calendar-denied fallback, Premium paywall, AI, restore, export, and account
      deletion without exposing production user data.
- [ ] **Manual - Both:** Monitor review messages daily. Answer factually, preserve correspondence,
      and route privacy, billing, security, or legal questions to the named owner.
- [ ] **Programmatic - Both:** For a binary rejection, fix the root cause, rerun affected gates,
      increment the platform build identifier, upload a new artifact, and update evidence.
- [ ] **Manual - Both:** For metadata-only feedback, update only approved metadata, recheck parity
      between stores and the binary, and record the change and approval.

**Gate 12 evidence:** uploaded build IDs, pre-launch results, submission timestamps, reviewer access
test, correspondence, and both store approvals.

## 13. Release, Monitor, and Complete Launch

- [ ] **Manual - Both:** Confirm a successful backup, green dashboards, working alerts, staffed
      support, current runbooks, and no open release blocker immediately before publication.
- [ ] **Manual - Both:** Start at the closest supported 5% staged/phased release. Record actual
      audience, time, installs, crashes/ANRs, 5xx/p95, purchase activation, webhook failures, AI
      failures, quota, backup recency, spend, support, privacy requests, and incidents.
- [ ] **Manual - Both:** Hold each 5%, 25%, 50%, and 100% gate for at least 24 hours and complete the
      daily launch check before advancing each platform independently.
- [ ] **Manual - Both:** Halt or roll back the affected platform immediately when a threshold in
      `LAUNCH_OPERATIONS.md` is met; preserve source, artifacts, logs, and the decision record.
- [ ] **Programmatic - Both:** For a production defect, use the smallest reviewed backend repair or
      a new higher-numbered native build. Bearing has no approved emergency OTA release path.
- [ ] **Manual - Both:** Reconcile subscriptions, refunds, delayed activations, deletion failures,
      support reports, store reviews, and privacy requests throughout rollout.
- [ ] **Manual - Both:** Complete and approve day-7 and day-30 launch reviews, including owned
      follow-ups and verification dates.
- [ ] **Manual - Both:** Schedule weekly first-month checks plus monthly, quarterly, every-release,
      and annual maintenance from `LAUNCH_OPERATIONS.md`.

**Completion evidence:** 100% rollout decisions for both platforms, daily records, day-7/day-30
reviews, incident follow-ups, and recurring maintenance ownership. M12.5 and M13 remain
`manual-handoff` until this live evidence exists.

## 14. Celebrate

- [ ] **Manual - Company:** Hold a company pizza party to celebrate shipping Bearing to both app
      stores and recognize everyone who helped complete the launch.
