# Bearing Mobile App

Expo React Native mobile application for Bearing.

## Prerequisites

- Node.js 24.x LTS
- npm 11.x
- Android Studio, Android SDK, and a running emulator or USB-debuggable device for Android
- macOS, Xcode, and an iOS simulator or registered device for iOS

## Setup

1. Install dependencies:
   - npm install
2. Compile, install, and launch the Android development build:
   - npm run android
3. Or, on macOS, compile, install, and launch the iOS development build:
   - npm run ios
4. For later JavaScript-only sessions, start Metro and open the installed Bearing development build:
   - npm start
5. Start the browser development environment:
   - npm run start:web
   - Direct Expo equivalent: npx expo start --web

`npx expo start web` is not valid Expo CLI syntax; the `--web` flag is required. The existing
`npm run web` command remains available as a shorter alias.

Calendar access requires the Bearing development build and is unavailable in Expo Go. See
[Development Builds](docs/DEVELOPMENT_BUILDS.md) for physical-device commands, native rebuilds, and
the permission smoke test.

## Project Structure

- app.config.ts: environment-aware Expo config and app extras
- App.tsx: temporary app entry for M1 baseline
- src/screens: screen-level views
- src/components: shared UI primitives
- src/features: feature modules
- src/services: service and integration layer
- docs: mobile app-specific docs
- docs/DEVELOPMENT_BUILDS.md: local iOS and Android development-build workflow
- docs/FIREBASE_SETUP.md: Firebase console and local env setup for M1.2

## Environment Variables

1. Copy `.env.example` to `.env`.
2. Replace placeholder values with your Firebase project config.
3. Start Expo after env values are set.

## Quality Commands (M1.3)

- `npm run lint`: run ESLint checks.
- `npm run format:check`: verify Prettier formatting.
- `npm run format`: apply Prettier formatting.
- `npm run test -- --watch=false`: run Jest tests once.
- `npm run test:rules`: run Firestore authorization tests in the local emulator (Java 21 required).
- `npm run test:coverage`: run tests with coverage output.
- `npm run start:web`: run the Expo web development environment.
- `npm run build:web`: export the static production web bundle to `dist/`.

Required variables:

- EXPO_PUBLIC_APP_ENV (development, staging, production)
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID

Optional release variable:

- EXPO_PUBLIC_SUPPORT_EMAIL (monitored support and privacy-request address)
- EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (public iOS SDK key)
- EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (public Android SDK key)

Development-only premium testing:

- Set `EXPO_PUBLIC_DEVELOPER_MODE=profile` to show a Developer section in Profile with an
  `Enable premium plan` toggle. The toggle directly controls the local Bearing 360 entitlement.
  The `Enable local premium plans` toggle replaces RevenueCat offerings with synthesized plans so
  the complete paywall and purchase flow can be tested without RevenueCat. `Reset premium plan`
  returns the account to free access while leaving local plans available for another test.
- Leave it as `off` for the normal RevenueCat flow.

The override is honored only when `__DEV__` is true and `EXPO_PUBLIC_APP_ENV` is not
`production`. It is client-side only: backend premium authorization and AI credit accounting
still use the real Firebase and RevenueCat state.

Other useful debug switches to consider as the app flow grows:

- Seed a deterministic account with expired, grace-period, and active entitlement states.
- Simulate delayed RevenueCat activation and failed restore responses.
- Seed zero, low, and exhausted AI credit balances for the goal-builder states.
- Inject calendar permission denial and partial calendar-sync failures.
- Add a network/offline mode for loading, retry, and stale-data UI.

Environment strategy:

- Development: local `.env`
- Staging: CI/EAS managed secrets
- Production: CI/EAS managed secrets

Do not commit `.env` files with real values. `EXPO_PUBLIC_*` values are embedded in the client and
must never contain private keys, service-account credentials, billing secrets, or API secrets.

## Release Builds

`eas.json` defines development, preview, and production profiles. See
`../docs/RELEASE_HANDOFF.md` for EAS linking, signing, versioning, store metadata, and beta evidence,
and `../docs/MONETIZATION_RELEASE.md` for RevenueCat/store setup and sandbox acceptance.
