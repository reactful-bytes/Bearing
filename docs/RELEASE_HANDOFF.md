# Release, Store, and Beta Handoff

## Status

EAS profiles, identifiers, source metadata, asset inventory, quality gates, and beta evidence
templates are repository-ready. EAS project linking, credentials, signed builds, store-console
packages, beta execution, and submission remain owner-operated because they require trusted accounts
and physical devices.

## Build Profiles and Versioning

`mobile/eas.json` defines:

- `development`: internal development client for native integration work.
- `preview`: internal staging candidate for acceptance and beta preparation.
- `production`: store candidate with remote auto-incremented build numbers.

The public marketing version remains in `mobile/app.config.ts`. Increment it only for a user-visible
release. EAS remote versioning owns iOS build numbers and Android version codes; never reuse a store
build number. Tag accepted source with the marketing version and both generated store build numbers.

## Release Setup

- [ ] Run `eas init` from `mobile/` and review the generated project link before committing it.
- [ ] Restrict Expo organization access and require MFA for release owners.
- [ ] Approve EAS terms, credential storage, artifact retention, and production processor use.
- [ ] Create development, preview, and production EAS environments.
- [ ] Add Firebase public client config, support email, and platform RevenueCat public SDK keys to
      each required environment. Keep server and store secrets out of mobile environments.
- [ ] Configure Apple distribution certificate/provisioning and Google Play upload key using the
      approved custody and recovery process.
- [ ] Record application ownership, team IDs, Play service account scope, certificate expiry, and
      emergency credential owner in restricted release evidence.
- [ ] Produce one preview build per platform and complete native M6, M9, and M10 acceptance.
- [ ] Run all repository quality gates before producing production candidates.
- [ ] Produce signed production candidates from the exact reviewed commit and record checksums.

## Required Quality Gate

From `mobile/` on Node 24/npm 11:

```text
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run test:rules
npx expo-doctor
npx expo install --check
```

From `functions/` on Node 24/npm 11:

```text
npm ci
npm run quality
```

Attach command logs, commit SHA, dependency lock hashes, Node/npm versions, and any approved exception.

## Store Metadata Source

| Field                      | Candidate copy or action                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| App name                   | Bearing                                                                                             |
| Category                   | Productivity                                                                                        |
| Subtitle/short description | Plan days, goals, tasks, and notes in one focused workspace.                                        |
| Promotional line           | Turn plans into scheduled action with goals, tasks, Focus Mode, and optional Premium AI assistance. |
| Support URL                | `[REQUIRED PUBLIC HTTPS URL]`                                                                       |
| Privacy URL                | `[REQUIRED PUBLIC HTTPS URL]`                                                                       |
| Terms URL                  | `[REQUIRED PUBLIC HTTPS URL]`                                                                       |
| Account deletion URL       | `[REQUIRED PUBLIC HTTPS URL]`                                                                       |
| Contact email              | `EXPO_PUBLIC_SUPPORT_EMAIL` release value                                                           |

Long description source:

> Bearing brings your calendar, goals, tasks, and notes into one practical planning flow. Schedule
> Bearing events, view selected device calendars, turn tasks and goal steps into time, use Focus
> Mode during active events, and capture ideas without leaving the moment. Your Bearing data syncs
> through your secured account. Optional calendar access stays under your control, and Premium adds
> an editable AI-assisted goal-planning draft. Subscriptions are available monthly or annually and
> can be restored or managed through your store account.

Do not add unsupported claims such as guaranteed productivity, medical outcomes, anonymous
analytics, full calendar-provider synchronization, offline-first operation, or cross-platform web
availability.

## Asset Checklist

Existing source assets include the app icon, Android adaptive layers, monochrome icon, favicon,
logos, and splash source under `mobile/assets/`. They are source inputs, not a finished listing.

- [ ] Validate the production icon and adaptive icon on light/dark launchers and required masks.
- [ ] Export Apple and Google icon assets from the approved source without transparency violations.
- [ ] Capture current iPhone and Android phone screenshots from signed candidates.
- [ ] Include Calendar day/month, Goals, Tasks, Focus Mode, Notes, and Premium paywall without user
      content, account identifiers, debug chrome, or draft legal placeholders.
- [ ] Produce required tablet screenshots only if tablet support remains enabled for submission.
- [ ] Create the Google Play feature graphic and verify safe areas at console preview sizes.
- [ ] Add captions/localizations only for languages whose app and support path are launch-ready.
- [ ] Complete Apple App Privacy and Google Play Data Safety from `DATA_PROCESSORS.md` and observed
      signed-build traffic.
- [ ] Verify content rating, age rating, calendar permission explanation, AI disclosure, subscription
      disclosure, export/deletion paths, and support contact.
- [ ] Have the product owner approve every rendered listing before upload.

## Beta Cycle Evidence

Run at least one internal cycle on each platform and one release-candidate cycle after all blocker
fixes. Duplicate this template per cycle:

```text
Cycle:
Commit / version / iOS build / Android version code:
Distribution groups and tester count:
Devices and OS versions:
Start/end dates:
Native M6/M9/M10 checklist links:
M11 sandbox evidence link:
Accessibility and performance evidence links:
New defects by severity:
Resolved defects and verification build:
Known issues accepted by owner:
Crash-free/vitals summary:
Support and privacy-path test result:
Go/no-go decision, owner, and timestamp:
```

Release blockers are any open severity-1 or severity-2 defect, entitlement authorization failure,
data loss/cross-account access, broken deletion/export, store rejection, unavailable support/legal
URL, or missed native acceptance budget. M12.1-M12.4 remain manual handoffs until signed candidates,
store packages, and completed beta evidence exist. M12.5 remains manual through publication.
