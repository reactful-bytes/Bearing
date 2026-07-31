# Security Baseline

Last reviewed: 2026-07-31

## Firestore Authorization

The repository-root `firestore.rules` file is authoritative. It enforces authenticated ownership for
events, notes, goals, goal steps, and tasks; prevents ownership transfer during updates; limits user
profile updates to client-owned preferences; keeps premium entitlement and subscription writes
server-owned; and denies unknown collections by default.

Run the authorization suite from `mobile/` with Node 24, npm 11, and Java 21:

```bash
npm run test:rules
```

CI runs the same 14-case suite whenever mobile or Firestore configuration changes.

## Secrets

- Local `.env` variants, private keys, signing files, and native credentials are ignored.
- The tracked `.env.example` contains placeholders only.
- Firebase web configuration and other `EXPO_PUBLIC_*` values are client-visible identifiers, not a
  secret-storage mechanism.
- Service-account keys, billing secrets, AI provider keys, webhook secrets, and private API tokens
  must live in managed server/CI secret storage and must never use an `EXPO_PUBLIC_*` name.
- The 2026-07-31 tracked-file scan found no private-key, client-secret, refresh-token, Stripe-key, or
  Firebase-key patterns.

## Dependency Audit

After `npm audit fix` applied all compatible remediations, `npm audit --omit=dev` reports 21
transitive findings (11 moderate, 10 high), and the full development tree reports 59 (13 moderate,
46 high), with no critical findings. npm's suggested fixes replace supported Expo, React Native,
Jest, or Firebase CLI versions with incompatible versions, so they were not forced.

Review these findings during each Expo SDK upgrade. Keep `npx expo install --check` and
`npx expo-doctor` green, and adopt patched framework releases as they become compatible.

## Remaining Server Controls

Firebase Functions must perform premium entitlement, billing, AI, export, and account-deletion
operations with managed secrets and Admin SDK authorization. Enable and enforce App Check for those
callable/HTTP endpoints before production rollout.

Firebase currently supports Node 22 as its newest Functions deployment runtime. The Functions
package is therefore deployed with `nodejs22` while its local and CI quality gate also runs on the
repository's Node 24 LTS baseline. Do not change the deployment runtime to Node 24 until Firebase
lists it as supported.
