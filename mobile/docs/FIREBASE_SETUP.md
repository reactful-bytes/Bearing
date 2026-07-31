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
3. Enable at least one sign-in provider for testing.
4. Recommended for M1.2 validation: Anonymous (quick) or Email/Password.

## 4) Create local environment file

1. In `mobile/`, copy `.env.example` to `.env`.
2. Replace placeholder values with your Firebase config.
3. Confirm `EXPO_PUBLIC_APP_ENV=development`.

## 5) Install dependencies and run app

1. From `mobile/`, run `npm install`.
2. Start Expo with `npx expo start`.
3. Verify app startup does not show a Firebase config error.

## 6) Validate auth bootstrap behavior

1. Launch app on device or emulator.
2. Confirm one of these appears:
   - `Session detected.` when a session exists.
   - `No active session found.` when no session exists.
3. Tap `Open Sign-In Entry` to run anonymous sign-in and verify session changes to `Session detected.`.
4. Tap `Sign Out` to verify the app returns to `No active session found.`.
5. If config is missing, app should show an actionable startup error listing missing env keys.

## Environment Strategy

- Development: local `.env` values for your dev Firebase project.
- Staging: `.env.staging` values loaded in CI/EAS profile.
- Production: `.env.production` values in secure CI/EAS secrets, not committed.
- Keep Firebase API keys out of git-tracked env files even though API keys are not private credentials.

## Security Notes

- Never commit `.env`, `.env.development`, `.env.staging`, or `.env.production`.
- Do not place service account keys in client code.
- Restrict Firebase auth providers and security rules per environment.
