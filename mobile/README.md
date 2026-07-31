# Bearing Mobile App

Expo React Native mobile application for Bearing.

## Prerequisites

- Node.js 20+
- npm 10+
- Expo Go app on device or Android emulator
- macOS + Xcode only if running local iOS simulator

## Setup

1. Install dependencies:
   - npm install
2. Start dev server:
   - npx expo start
3. Run Android:
   - npx expo start --android
4. Run iOS (macOS only):
   - npx expo start --ios

## Project Structure

- app.config.ts: environment-aware Expo config and app extras
- App.tsx: temporary app entry for M1 baseline
- src/screens: screen-level views
- src/components: shared UI primitives
- src/features: feature modules
- src/services: service and integration layer
- docs: mobile app-specific docs
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
- `npm run test:coverage`: run tests with coverage output.

Required variables:

- EXPO_PUBLIC_APP_ENV (development, staging, production)
- EXPO_PUBLIC_FIREBASE_API_KEY
- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- EXPO_PUBLIC_FIREBASE_PROJECT_ID
- EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- EXPO_PUBLIC_FIREBASE_APP_ID

Environment strategy:

- Development: local `.env`
- Staging: CI/EAS managed secrets
- Production: CI/EAS managed secrets

Do not commit `.env` files with real values.
