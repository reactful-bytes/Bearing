# M14 Google Authentication Engineering Tickets

## Scope

Add Google as a Firebase Authentication provider on Android, iOS, and development web while preserving the Firebase UID that owns a user's Bearing data. Complete sign-in, anonymous and password-account linking, sign-out cleanup, recent-login verification for deletion, provider-aware password reset, and non-destructive collision handling.

## Approved Product Contract

- Google is an additional authentication method, not a separate Bearing data account.
- Linking an anonymous session must preserve its Firebase UID and all UID-owned Firestore data.
- Adding Google to a password account must preserve the password account UID.
- A credential already owned by another Firebase user stops with an explanation. Bearing never signs into the other user, merges Firestore documents, or deletes either account automatically.
- Same-email password/Google recovery verifies the existing password first, then links the pending Google credential in memory.
- Pending OAuth credentials are never persisted to Firestore, AsyncStorage, logs, or telemetry.
- Password reset appears only when the current user has the Firebase password provider.
- Google-only deletion requires a fresh Google credential. Password accounts continue to use password reauthentication.
- Firebase sign-out completes before best-effort native Google session cleanup.
- Android, iOS, and web share one Firebase credential boundary while using platform-appropriate token acquisition.

## Architecture Boundaries

1. `googleNativeAuth` owns Android Google Sign-In SDK calls and native session cleanup.
2. `useGoogleAuth` owns browser-based Expo AuthSession acquisition for iOS and web and normalizes all platforms to an ID token plus optional access token.
3. `firebaseAuthActions` converts Google tokens to Firebase credentials and owns sign-in, link, collision, reauthentication, and sign-out semantics.
4. `SignedOutAuth` owns signed-out screen state. A password-conflict credential exists only in that component's memory until verification succeeds or the view is abandoned.
5. `useUserProfile` derives provider state from Firebase `providerData` and exposes authenticated linking and deletion-verification operations.
6. Firestore remains keyed by Firebase UID. No client code copies or merges records by email address.

## M14.1 OAuth Foundation

| Ticket | Status    | Deliverable                                                      | Acceptance                                                                                    |
| ------ | --------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| M14.1a | completed | Install Expo AuthSession, WebBrowser, Crypto, and Google Sign-In | Expo SDK 57-compatible packages resolve and native plugins appear in public config            |
| M14.1b | completed | Add non-secret client ID configuration                           | Web, iOS, and Android public client IDs validate without exposing values                      |
| M14.1c | completed | Normalize Android, iOS, and web token acquisition                | Success, cancellation, missing ID token, and missing configuration have deterministic results |

## M14.2 Firebase Identity Operations

| Ticket | Status    | Deliverable                                       | Acceptance                                                                                              |
| ------ | --------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| M14.2a | completed | Add Firebase Google sign-in                       | Google tokens create a Firebase credential and return the authenticated user                            |
| M14.2b | completed | Preserve anonymous and secured UIDs while linking | Expected UID checks reject account switches; successful links retain the canonical UID                  |
| M14.2c | completed | Recover password-first same-email accounts        | Existing password is verified before the in-memory pending Google credential is linked                  |
| M14.2d | completed | Stop credential ownership collisions              | Collision errors are typed and no fallback sign-in, Firestore merge, or destructive action is attempted |
| M14.2e | completed | Clean up provider session on sign-out             | Firebase signs out first; native Google cleanup is best effort                                          |

## M14.3 Signed-Out Experience

| Ticket | Status    | Deliverable                                | Acceptance                                                                                        |
| ------ | --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| M14.3a | completed | Redesign the Bearing auth shell            | Logo, clear heading, Google entry, email divider, and account-mode links render accessibly        |
| M14.3b | completed | Add dedicated password reset view          | Reset has its own view, back action, resend state, and account-enumeration-resistant confirmation |
| M14.3c | completed | Add password/Google conflict recovery view | Email is fixed, password is required, and cancellation discards the pending credential            |
| M14.3d | completed | Cover signed-out behavior                  | Email sign-in, reset, Google entry, and conflict linking pass focused smoke tests                 |

## M14.4 Authenticated Provider Lifecycle

| Ticket | Status    | Deliverable                                     | Acceptance                                                                                       |
| ------ | --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M14.4a | completed | Expose provider-aware Profile state             | Password and Google controls are derived from Firebase provider IDs                              |
| M14.4b | completed | Link Google from anonymous or password accounts | Linking preserves the current UID and reports non-destructive collisions                         |
| M14.4c | completed | Make reset controls provider-aware              | Google-only users do not receive an inapplicable password-reset action                           |
| M14.4d | completed | Reauthenticate Google-only deletion             | Cancellation stops before cleanup; success permits deletion and best-effort native access revoke |
| M14.4e | completed | Cover provider lifecycle behavior               | Profile linking, password deletion, Google deletion, cancellation, and revocation pass tests     |

## M14.5 Validation And Release Handoff

| Ticket | Status         | Deliverable                              | Acceptance                                                                                                  |
| ------ | -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| M14.5a | completed      | Run repository automated gates           | Focused auth/Profile tests, typecheck, lint, formatting, Expo config, and package checks pass               |
| M14.5b | manual-handoff | Verify Firebase project account settings | Google enabled and one-account-per-email mode confirmed in each release Firebase project                    |
| M14.5c | manual-handoff | Verify signed Android and iOS builds     | Real OAuth clients, signing fingerprints, redirects, link flows, sign-out, and deletion pass                |
| M14.5d | manual-handoff | Verify registered web origin             | Development or release web origin completes Google sign-in and callback without redirect errors             |
| M14.5e | manual-handoff | Exercise collision matrix in staging     | Password-first, anonymous-first, Google-first, same-email, and already-owned credential cases preserve data |

## Firebase And Google Prerequisites

1. Enable Google in Firebase Console under Authentication > Sign-in method.
2. In Authentication settings, keep one account per email address enabled. Do not use multiple accounts per email address for Bearing.
3. Register the Android package `com.reactfulbytes.bearing` and add SHA-1 and SHA-256 fingerprints for every development and release signing certificate used to test Google Sign-In.
4. Register the iOS bundle ID `com.reactfulbytes.bearing` and configure its iOS OAuth client.
5. Configure the web OAuth client with every allowed development or release origin and callback used by Expo AuthSession.
6. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in the environment used for the build.
7. Rebuild the native development client after changing OAuth clients, plugins, bundle identifiers, package names, or signing configuration.

## Manual Acceptance Matrix

- Fresh Google sign-in on Android, iOS, and registered web.
- User cancellation returns to the current view without an error or account switch.
- Anonymous session with existing Firestore data links Google and retains the same Firebase UID and records.
- Password account adds Google from Profile and can subsequently use either provider with the same UID.
- Password-first same-email Google sign-in asks for the existing password and links only after verification.
- Google credential already attached to another Firebase UID stops and leaves both accounts unchanged.
- Sign-out clears Firebase state and does not silently reuse an unintended Android Google account.
- Password-only deletion requires the current password.
- Google-only deletion opens Google verification; cancellation leaves all data intact.
- Successful deletion removes Firebase Auth and Bearing data, then performs local/provider cleanup.

## Deferred Scope

- Automatic Firestore account merging or migration by email address.
- Persisted pending OAuth credentials or server-side credential escrow.
- Account recovery without proving control of an existing provider.
- Android Credential Manager migration. Reassess when the selected Expo SDK and Google Sign-In package provide a stable migration path that preserves the current Firebase credential contract.
