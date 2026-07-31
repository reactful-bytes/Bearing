# Development Builds

Bearing uses `expo-calendar`, so native calendar work must run in the Bearing development build,
not Expo Go. Local builds use Expo Continuous Native Generation: `ios/` and `android/` are generated
from `app.config.ts` and remain gitignored.

## Shared Setup

1. Use Node.js 24.x LTS and npm 11.x.
2. From `mobile/`, run `npm install`.
3. Copy `.env.example` to `.env` and set the development Firebase values.

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
