# Bearing Firebase Functions

This package owns trusted server operations for entitlement, AI, export, and account deletion. It
must not contain native calendar provider OAuth, sync, or mirroring code.

## Runtime

- Development and CI: Node 24 LTS/npm 11.
- Compatibility CI: Node 22.
- Firebase deployment: `nodejs22`, the newest runtime Firebase currently supports.

## Commands

```bash
npm ci
npm run quality
```

The quality gate runs strict TypeScript checks, ESLint, Prettier, a production build, and Node tests.

To inspect exports locally, build this package and start the Functions emulator from `mobile/`, where
the pinned Firebase CLI is installed:

```bash
cd functions
npm run build
cd ../mobile
npx firebase emulators:start --config ../firebase.json --project bearing-functions-test --only functions
```

## Callable Convention

Every client callable must:

1. use the v2 `onCall` API;
2. set `enforceAppCheck: true`;
3. call `requireVerifiedCaller` before processing data;
4. validate all request payloads;
5. return `HttpsError` failures without sensitive details; and
6. read secrets only from managed server configuration.

`backendStatus` is the minimal convention probe. It returns no user or environment data. Deploying
or invoking it in staging requires an authenticated Firebase CLI session and an App Check-enabled
client.
