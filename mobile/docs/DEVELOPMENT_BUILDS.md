# Development Builds

Bearing uses `expo-calendar`, so native calendar work must run in the Bearing development build,
not Expo Go. Local builds use Expo Continuous Native Generation: `ios/` and `android/` are generated
from `app.config.ts` and remain gitignored.

## Shared Setup

1. Use Node.js 24.x LTS and npm 11.x.
2. From `mobile/`, run `npm install`.
3. Copy `.env.example` to `.env` and set the development Firebase and Google OAuth client IDs.

Google authentication also requires a rebuilt development client. Expo Go cannot load the Android native Google Sign-In module or validate the app-specific OAuth configuration.

## Android

Install Android Studio, a current Android SDK, and JDK 17. Start an emulator with a calendar-capable
system image or connect a device with USB debugging enabled, then run:

```sh
npm run android
```

To select among connected devices, run `npm run android -- --device`. The command generates the
native project when needed, compiles it, installs the Bearing development build, and starts Metro.

## iOS

On macOS, install the current Xcode command-line tools and an iOS simulator, then run:

```sh
npm run ios
```

For a connected physical device, run `npm run ios -- --device` and select the device. Xcode may ask
for the Apple development team used to sign the local build.

## Daily Development

After the development build is installed, JavaScript and asset changes only require Metro:

```sh
npm start
```

Open the installed Bearing app if it does not reconnect automatically. Rebuild with
`npm run android` or `npm run ios` after adding or upgrading a native module or changing a config
plugin, permission, bundle identifier, or package name. If generated native configuration is stale,
regenerate it with `npm run prebuild:clean` before rebuilding.

## Google Authentication Smoke Test

1. Confirm the Firebase project has Google enabled and one account per email address selected.
2. Run `./android/gradlew -p android signingReport` and confirm the `:app` SHA-1/SHA-256 and package `com.reactfulbytes.bearing` match an Android OAuth client in the same project as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Launch the signed-out screen and complete Google Sign-In.
4. Record the Firebase UID, sign out, sign back in, and confirm the same UID and Bearing data return.
5. From Profile, add Google to a disposable password account and confirm both providers return the same UID.
6. Link Google to a disposable anonymous session containing test data and confirm its UID and data remain unchanged.
7. Try a Google credential already owned by another disposable Firebase user. Confirm Bearing stops without switching accounts, merging records, or deleting either user.
8. Open deletion for a Google-only disposable account. Cancel Google verification once and confirm nothing is deleted, then repeat and complete deletion.

Record platform, OS version, build profile, signing identity, Firebase project, OAuth client type, starting UID, ending UID, and outcome. Do not record ID tokens, access tokens, passwords, or client secrets.

## Calendar Permission Smoke Test

1. Sign in to Bearing and open Profile.
2. Open Device Calendars and request calendar access.
3. Confirm the native calendar permission prompt names Bearing and explains selected-calendar access
   and optional event publication.
4. Grant access and confirm device calendars load, including at least one writable destination.
5. Revoke access in system settings, return to Bearing, and confirm the unavailable state offers a
   settings recovery action without blocking Bearing-only event creation.

Record the OS version, device or simulator model, permission result, and discovered writable/read-only
calendar types. Full CRUD, recurrence, refresh, Focus Mode, fallback, and two-device reconciliation
remain in the M6.13 acceptance matrix.

## Android Focus Mode Do Not Disturb Smoke Test

1. Install a development build on an Android device and open Focus Mode.
2. Choose **Open Settings**, grant Bearing Do Not Disturb access, and return to the app.
3. Confirm Android enters priority-only Do Not Disturb while Focus Mode remains open.
4. Exit Focus Mode with the hold control and confirm Bearing restores the prior Do Not Disturb state.
5. Repeat with Do Not Disturb already enabled and confirm Bearing does not disable a pre-existing state.
6. Revoke access and confirm Focus Mode still works without changing Android Do Not Disturb.
7. Confirm iOS Focus Mode behavior remains unchanged and does not request system Focus access.

Record the Android version, device model, prior Do Not Disturb state, grant result, active state,
restored state, and outcome.
