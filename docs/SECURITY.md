# Security Baseline

Last reviewed: 2026-08-22

## Firestore Authorization

The repository-root `firestore.rules` file is authoritative. It enforces authenticated ownership for
events, notes, goals, goal steps, and tasks; prevents ownership transfer during updates; limits user
profile updates to client-owned preferences; keeps premium entitlement and subscription writes
server-owned; explicitly denies client access to AI credit authority; and denies unknown
collections by default.

Run the authorization suite from `mobile/` with Node 24, npm 11, and Java 21:

```bash
npm run test:rules
```

CI runs the same 17-case suite whenever mobile or Firestore configuration changes.

## Secrets

- Local `.env` variants, private keys, signing files, and native credentials are ignored.
- The tracked `.env.example` contains placeholders only.
- Firebase web configuration and other `EXPO_PUBLIC_*` values are client-visible identifiers, not a
  secret-storage mechanism.
- Service-account keys, billing secrets, AI provider keys, webhook secrets, and private API tokens
  must remain in ignored server environment files or approved server/CI secret storage and must
  never use an `EXPO_PUBLIC_*` name.
- Functions currently bind `GEMINI_API_KEY` and RevenueCat values with `defineString`; Firebase CLI
  loads them from ignored `functions/.env` files during deployment. Do not add these values to
  mobile configuration, tracked files, or CI logs.
- The 2026-07-31 tracked-file scan found no private-key, client-secret, refresh-token, Stripe-key, or
  Firebase-key patterns.

## Dependency Audit

After `npm audit fix` applied all compatible remediations, `npm audit --omit=dev` reports 21
transitive findings (11 moderate, 10 high), and the full development tree reports 59 (13 moderate,
46 high), with no critical findings. npm's suggested fixes replace supported Expo, React Native,
Jest, or Firebase CLI versions with incompatible versions, so they were not forced.

Review these findings during each Expo SDK upgrade. Keep `npx expo install --check` and
`npx expo-doctor` green, and adopt patched framework releases as they become compatible.

## Server Controls

Firebase Functions require Firebase Auth and derive every target user from `request.auth.uid`.
Premium authorization comes from `subscriptions/{uid}`. AI generation additionally uses
server-owned rolling credits, one active reservation per user, idempotent request IDs, bounded
structured output, success-only charging, and sanitized provider failures. Billing reconciliation,
export, and account deletion use the same Admin SDK ownership boundary.

App Check is not currently enforced. It is deferred to M17 as defense in depth and must not be
partially enabled until native and web clients can both send valid tokens and rollout metrics have
been reviewed. Auth, ownership checks, Premium authorization, recent deletion reauthentication,
and quotas remain mandatory regardless of future App Check deployment.

Functions and the repository quality gates use Node 24. The authoritative deployment runtime is
`nodejs24` in `firebase.json`.
