# Dependency Audit Exceptions

## Policy

Production dependency audits run from `mobile/` with:

```sh
npm audit --omit=dev --audit-level=high
```

High-severity findings block release unless they are upgraded or recorded below with a constrained exposure analysis, owner, and review date. Do not use `npm audit fix --force` when it replaces Expo SDK-managed packages with incompatible versions.

## Active Exceptions

### GHSA-mh99-v99m-4gvg: `brace-expansion`

- **Severity:** High
- **Path:** `react-native` -> `@react-native/jest-preset` -> Jest coverage tooling -> `minimatch` -> `brace-expansion`
- **Exposure:** The affected glob expansion is used by bundled test/coverage tooling. Bearing does not pass user-controlled calendar, goal, note, task, or profile data into glob patterns at runtime.
- **Why not forced:** npm proposes replacing Expo SDK 57's React Native 0.86.2 with React Native 0.84.1.
- **Mitigation:** CI and developer tooling operate only on trusted repository paths. Production application code does not expose a glob-evaluation endpoint.
- **Owner:** Mobile engineering
- **Review by:** 2026-08-31 or the next Expo SDK 57 patch, whichever comes first

### GHSA-w5hq-g745-h8pq: `uuid`

- **Severity:** Moderate
- **Path:** Expo config plugins -> `xcode` -> `uuid`
- **Exposure:** The affected buffer-writing API is in native project generation/build tooling. Bearing does not invoke UUID v3/v5/v6 with caller-provided buffers in the shipped application.
- **Why not forced:** npm proposes downgrading Expo from SDK 57 to Expo 46.
- **Mitigation:** Native builds use trusted repository configuration and controlled CI/EAS inputs.
- **Owner:** Release engineering
- **Review by:** 2026-08-31 or the next Expo SDK 57 patch, whichever comes first
