# Web Development and Deployment Options

## Status and Scope

Bearing's first web release optimizes authenticated navigation and Calendar for desktop screens.
The same Expo codebase, Firebase Authentication project, Firestore collections, rules, and indexes
continue to serve mobile and web users. This document is a decision guide and future deployment
runbook. It does not authorize or configure Firebase Hosting, a domain, or automated deployment.

Current web boundaries:

- Bearing events, goals, tasks, notes, profile data, and entitlements use the same Firebase UID and
  Firestore storage as mobile.
- Device calendar access remains native-only because browsers cannot use `expo-calendar`.
- Web users cannot start, restore, or change subscription purchases.
- Premium users can open the Apple or Google Play subscription page associated with their recorded
  entitlement to cancel auto-renewal.
- Calendar Week view starts on Sunday and is the default on desktop web widths.

## Local Web Development

### Prerequisites

- Node.js 24.x LTS
- npm 11.x
- A populated `mobile/.env` containing public Firebase web configuration
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` when Google sign-in is being tested

Never put service-account credentials, private keys, RevenueCat secrets, or Gemini secrets in an
`EXPO_PUBLIC_*` variable. Expo embeds those variables in the browser bundle.

### Start the development server

From `mobile/`:

```powershell
npm ci
npm run start:web
```

The direct Expo command is:

```powershell
npx expo start --web
```

`npx expo start web` is not valid because `web` must be passed as the `--web` flag. The existing
`npm run web` script is also equivalent.

### Build the static bundle

```powershell
npm run build:web
```

Expo writes the static site to `mobile/dist/`. Treat this as generated output: do not manually edit
it and do not use it as the source of truth.

### Required pre-deployment quality gate

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
npx expo-doctor
npx expo install --check
npm run build:web
```

Manually verify at minimum:

1. Email/password and Google authentication in a clean browser profile.
2. Calendar Week view at 1024x768, 1440x900, and 1920x1080.
3. Compact web layout below 1024px retains bottom navigation and Day view.
4. Create, edit, and delete a Bearing event, then confirm it appears on mobile for the same account.
5. Goals, tasks, notes, profile, export, and sign-out still read the same account data.
6. Device-calendar controls clearly remain unavailable on web.
7. Premium checkout and restore remain unavailable on web.
8. Premium management opens the originating Apple or Google Play subscription page.
9. Refresh the browser on the deployed URL and confirm the app still loads.

## Hosting Product Decision

### Option A: Firebase Hosting (Classic)

Serve the static Expo export from Firebase's CDN.

Pros:

- Best match for Expo's static `dist/` output.
- Simple preview channels, release history, rollback, SSL, and custom-domain support.
- Uses the existing Firebase project and CLI already present in this repository.
- Low operational overhead; no server process or container is required.
- SPA rewrites and cache headers are explicit and reviewable in `firebase.json`.

Cons:

- The build must happen before deployment.
- Runtime environment variables are not available; public values are compiled into the bundle.
- Server-side rendering and request-time personalization are unavailable.
- A careless `firebase init hosting` run can overwrite the existing Hosting section later.

Recommendation: use Firebase Hosting Classic for Bearing's Expo static web bundle.

### Option B: Firebase App Hosting

Use Firebase's framework-aware full-stack hosting product.

Pros:

- Managed build and rollout pipeline.
- Better fit if Bearing later moves to a supported server-rendered web framework.
- Supports request-time server behavior that a static export cannot provide.

Cons:

- Adds complexity without benefiting the current static Expo application.
- Framework and runtime assumptions are less aligned with React Native Web output.
- Greater deployment surface, cost considerations, and operational ownership.
- A future migration to a web-specific framework would need separate architecture approval.

Recommendation: do not use App Hosting for the first web release.

## Firebase Project and Site Decision

### Option A: Existing production project and default Hosting site

Pros:

- Fastest setup and fewest Firebase resources.
- Web and mobile naturally share Auth, Firestore, Functions, rules, indexes, and entitlements.
- Default URLs are immediately available before a custom domain is selected.

Cons:

- A mistaken production deploy is immediately public.
- Preview testing still touches production backend data unless test accounts are carefully isolated.
- Environment mistakes have a larger blast radius.

### Option B: Existing project with a separate Hosting site

Pros:

- Separates preview/staging URLs from the default production site.
- Still shares the same Firebase backend and user data when that is intentional.
- Supports staged domain migration later.

Cons:

- It is not backend isolation; both sites still reach production Auth and Firestore.
- Requires Firebase Hosting target aliases and additional site management.
- OAuth origins and authorized domains must include each site.

### Option C: Separate staging Firebase project

Pros:

- Strongest isolation for test users, Firestore writes, Functions, and Auth configuration.
- Safest place to test rules, indexes, OAuth, and destructive account flows.
- Supports realistic release promotion and rollback drills.

Cons:

- Requires duplicate Firebase, Google OAuth, Functions, rules, indexes, App Check, and environment
  configuration.
- Test data does not automatically match production mobile data.
- Higher maintenance and greater risk of staging/production configuration drift.

Recommendation: begin with Firebase preview channels on the existing project using dedicated test
accounts. Add a separate staging project before broader external beta testing if operational effort
allows it.

## Deployment Workflow Decision

### Option A: Manual CLI deployment

Pros:

- Best first step while Hosting, OAuth, domain, and acceptance requirements are still settling.
- A release owner can inspect the exact bundle and preview URL before production.
- No long-lived CI deployment credential is required.
- Easy to stop without modifying repository automation.

Cons:

- Depends on the operator's local Node, npm, Firebase CLI, environment variables, and login state.
- Evidence collection and command ordering can be inconsistent.
- Easier to deploy from an unreviewed or dirty working tree.
- Does not automatically create a preview for every pull request.

Recommendation: use manual deployment for the initial release.

### Option B: GitHub Actions using Firebase service-account credentials

Pros:

- Repeatable builds from reviewed commits.
- Can create pull-request preview channels and retain logs as release evidence.
- Removes local workstation differences from production releases.

Cons:

- Requires storing and rotating a powerful credential in GitHub Secrets.
- Forked pull requests and secret exposure boundaries need careful workflow design.
- Static `EXPO_PUBLIC_*` production values must be securely supplied during the build.
- Workflow mistakes can deploy unintended commits or projects.

Recommendation: avoid long-lived service-account JSON when a stronger option is available.

### Option C: GitHub Actions using Workload Identity Federation

Pros:

- Uses short-lived credentials instead of a stored service-account key.
- Supports repository, branch, environment, and approval restrictions.
- Best long-term security posture for automated production deployment.
- Produces repeatable preview and live deployments from reviewed source.

Cons:

- More initial Google Cloud IAM and identity-pool setup.
- Misconfigured claims or roles can block releases or grant excessive access.
- Requires documented break-glass and credential recovery procedures.

Recommendation: migrate from manual deployment to GitHub Actions with Workload Identity Federation
after the manual process and acceptance checklist are stable.

## Environment Strategy Decision

### Compile production values during export

Pros:

- Matches Expo's supported static-export model.
- Simple code path with no runtime configuration request.
- Each artifact is immutable and can be tied to a commit and environment.

Cons:

- A different Firebase project requires a separate build.
- Incorrect values require a rebuild and redeploy.
- Public values are visible in browser JavaScript by design.

Recommendation: compile public production Firebase and OAuth values during `npm run build:web`.
Store no secrets in those values.

### Fetch public runtime configuration after page load

Pros:

- One bundle can be promoted between environments.
- Public configuration can change without rebuilding JavaScript.

Cons:

- Adds startup latency, error handling, validation, and another hosted artifact.
- Does not make browser configuration secret.
- Diverges from the current app configuration pattern.

Recommendation: defer runtime configuration unless multi-environment artifact promotion becomes a
firm requirement.

## Future Manual Firebase Hosting Setup

Do not execute this section until Hosting work is explicitly approved.

1. Confirm the Firebase project and site option above.
2. Upgrade or install the Firebase CLI and authenticate the release owner:

   ```powershell
   npm install --global firebase-tools
   firebase login
   firebase projects:list
   ```

3. Build from a clean reviewed commit with production public environment values:

   ```powershell
   Set-Location mobile
   npm ci
   npm run typecheck
   npm run lint
   npm run format:check
   npm test -- --runInBand
   npm run build:web
   Set-Location ..
   ```

4. Add a reviewed `hosting` section to the existing root `firebase.json`. Do not replace its
   Functions or Firestore sections. The future configuration should:
   - use `mobile/dist` as `public`;
   - ignore hidden files and `node_modules`;
   - rewrite unmatched paths to `/index.html` for SPA refreshes;
   - prevent long caching of `index.html`;
   - allow long immutable caching for fingerprinted JS, CSS, fonts, and images;
   - add reviewed browser security headers after verifying Firebase Auth and Expo compatibility.
5. Test the generated site locally with the Firebase Hosting emulator.
6. Deploy a temporary preview channel, never live first:

   ```powershell
   firebase hosting:channel:deploy web-acceptance --expires 7d
   ```

7. Add the preview origin to Firebase Authentication authorized domains and Google OAuth authorized
   JavaScript origins only if required for the acceptance test. Remove expired temporary origins.
8. Complete the manual verification checklist above against the preview URL.
9. Record the commit SHA, lockfile hash, command output, preview URL, browser matrix, and approval.
10. Deploy Hosting only so Functions, rules, and indexes are not changed accidentally:

    ```powershell
    firebase deploy --only hosting
    ```

11. Verify both Firebase-provided URLs, authentication, Firestore CRUD, browser refresh, cache
    behavior, subscription cancellation links, and mobile data visibility.
12. Use Firebase Hosting release history to roll back immediately if authentication, data access,
    routing, or startup fails. Reproduce and fix the issue in a preview channel before redeploying.

## Domain Decision Deferred

No domain-specific steps should be executed until the domain is selected and ownership is approved.
At that point, decide whether production will use the Firebase-provided domain or a custom domain.
A custom domain improves product identity but adds DNS ownership, certificate validation, redirect,
OAuth origin, Firebase Auth `authDomain`, email action URL, cookie/storage, and renewal ownership.

Before custom-domain launch:

1. Connect and verify the domain in Firebase Hosting.
2. Add the exact origin to Firebase Authentication authorized domains.
3. Add the exact origin to Google OAuth authorized JavaScript origins.
4. Review whether Firebase Auth should use the custom domain as `authDomain` to avoid browser
   third-party storage restrictions.
5. Add the matching `https://DOMAIN/__/auth/handler` redirect URI when required.
6. Validate Google sign-in in current Chrome, Edge, Firefox, and Safari.
7. Choose one canonical hostname and redirect alternatives to it.
8. Revalidate privacy, terms, support, and account-deletion public URLs.

## Release and Rollback Evidence

Record this for each preview and production release:

```text
Release date and owner:
Commit SHA and branch:
Node, npm, Expo, and Firebase CLI versions:
mobile/package-lock.json hash:
Environment name and Firebase project/site:
Quality-gate command results:
Expo export result and bundle size:
Preview URL and acceptance approver:
Production URL:
Authentication providers tested:
Desktop and compact viewport results:
Cross-platform Firestore data test result:
Subscription cancellation test result:
Known limitations:
Rollback release/version:
Final go/no-go decision:
```
