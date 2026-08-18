# Firebase Setup (M1.2)

This guide wires the Bearing mobile app to Firebase Authentication for local development.

## 1) Create or select a Firebase project

1. Go to Firebase Console: https://console.firebase.google.com/
2. Create a project or pick an existing one.
3. Open Project settings.

## 2) Register app for web config values

1. In Project settings, under Your apps, click Add app.
2. Choose Web app.
3. Give it a name like `bearing-mobile-dev`.
4. Skip Firebase Hosting unless you need it.
5. Copy the Firebase SDK config values.

## 3) Enable Authentication

1. In Firebase Console, open Build > Authentication.
2. Click Get started.
3. Enable Anonymous, Email/Password, and Google for the complete Bearing account lifecycle.
4. Open Authentication settings and confirm the project uses one account per email address. Bearing does not support Firebase's multiple-accounts-per-email mode.
5. Keep Google enabled in every development, staging, and production Firebase project used by a Google-enabled build.

## 4) Configure Google OAuth clients

1. Register Android package `com.reactfulbytes.bearing` and iOS bundle ID `com.reactfulbytes.bearing` in the Firebase project.
2. Add Android SHA-1 and SHA-256 fingerprints for each development and release signing certificate.
3. Create or select Web, iOS, and Android OAuth client IDs for those registered apps.
4. Add every development or release web origin used by Expo AuthSession to the web OAuth client.
5. Put the client IDs in local or EAS environment configuration:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
6. Treat these client IDs as public configuration, but keep environment-specific values out of committed `.env` files.
7. Rebuild native clients after changing OAuth, signing, package, bundle, scheme, or config-plugin settings.

## 5) Create local environment file

1. In `mobile/`, copy `.env.example` to `.env`.
2. Replace placeholder values with your Firebase config.
3. Confirm `EXPO_PUBLIC_APP_ENV=development`.

## 6) Install dependencies and run app

1. From `mobile/`, run `npm install`.
2. Start the installed development client with `npm start` for native testing, or use `npm run web` for a registered development web origin.
3. Verify app startup does not show a Firebase config error.

## 7) Validate auth behavior

1. Launch app on device or emulator.
2. Confirm the signed-out screen offers Google and email/password without a Firebase configuration error.
3. Complete a fresh Google sign-in and record the Firebase UID.
4. Sign out, use the alternate linked provider, and confirm the same Firebase UID and Firestore data return.
5. Link an anonymous test session from Profile and confirm its UID does not change.
6. Validate password-first same-email recovery and an already-owned credential collision in staging; neither case may copy or delete Firestore data.
7. Confirm Google-only account deletion requires fresh Google verification and cancellation leaves the account intact.
8. If config is missing, the app should show an actionable Google configuration message without exposing client ID values.

## Environment Strategy

- Development: local `.env` values for your dev Firebase project.
- Staging: `.env.staging` values loaded in CI/EAS profile.
- Production: `.env.production` values in secure CI/EAS secrets, not committed.
- Keep Firebase API keys out of git-tracked env files even though API keys are not private credentials.

## Security Notes

- Never commit `.env`, `.env.development`, `.env.staging`, or `.env.production`.
- Do not place service account keys in client code.
- Restrict Firebase auth providers and security rules per environment.
- Never merge Firestore account data based only on an email address.
- Never persist pending Google credentials in client storage, logs, telemetry, or Firestore.
