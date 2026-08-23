# M17 Cross-Platform App Check Engineering Tickets

## Scope

Add App Check only after M16 is stable and as one coordinated native and web rollout. App Check remains defense in depth and does not replace Firebase Auth, caller-UID ownership, Premium checks, recent deletion reauthentication, or AI credits. Enforcement must not begin until every supported production client sends valid tokens and acceptance metrics are reviewed.

## Execution Order

M17.1 -> M17.2 and M17.3 in parallel -> M17.4 -> M17.5 -> M17.6.

## M17.1 Architecture and Compatibility

| Ticket | Status      | Deliverable                                   | Acceptance                                                                                                                   |
| ------ | ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| M17.1a | not-started | Verify current Expo/RN/Firebase compatibility | Supported versions, architecture requirements, plugins, native files, and rebuild impact are documented from current sources |
| M17.1b | not-started | Select the native migration boundary          | Decision names the native Auth/Functions/App Check adapters and preserves Firebase JS on web                                 |
| M17.1c | not-started | Define rollout and rollback                   | Clients ship tokens before enforcement and rollback requires no client release                                               |

## M17.2 Web App Check

| Ticket | Status      | Deliverable                     | Acceptance                                                                               |
| ------ | ----------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| M17.2a | not-started | Register reCAPTCHA Enterprise   | Production domains and the Firebase web app share one score-based key                    |
| M17.2b | not-started | Add a web-only initializer      | App Check initializes before protected Firebase services and stays out of native bundles |
| M17.2c | not-started | Add localhost and CI debug flow | Allow-listed debug tokens remain outside source and production bundles                   |
| M17.2d | not-started | Validate web tokens             | Debug and production requests show valid Auth and App Check; static build remains green  |

## M17.3 Native Firebase and App Check

| Ticket | Status      | Deliverable                         | Acceptance                                                                                     |
| ------ | ----------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| M17.3a | not-started | Add native Firebase configuration   | Android/iOS files, plugins, and build properties resolve without private credentials in source |
| M17.3b | not-started | Add native App Check initialization | Debug builds use debug providers; releases use Apple attestation and Play Integrity            |
| M17.3c | not-started | Migrate native Auth                 | Persistence, sign-in, linking, reauthentication, deletion, and UID guarantees pass             |
| M17.3d | not-started | Migrate native Functions            | Names, region, payloads, timeouts, errors, and M16 quota behavior remain identical             |
| M17.3e | not-started | Preserve web adapters               | Web does not import unsupported native Firebase modules                                        |
| M17.3f | not-started | Rebuild development clients         | Clean Android/iOS builds obtain allow-listed debug App Check tokens                            |

## M17.4 Production Providers

| Ticket | Status      | Deliverable                        | Acceptance                                                                      |
| ------ | ----------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| M17.4a | not-started | Configure Apple attestation        | App Attest, DeviceCheck fallback, signing, and physical-device validation pass  |
| M17.4b | not-started | Configure Play Integrity           | Firebase/Play linkage, release SHA-256, distribution, and token validation pass |
| M17.4c | not-started | Separate debug/release credentials | No debug token ships in preview/production and revocation is tested             |

## M17.5 Staged Enforcement

| Ticket | Status      | Deliverable                                    | Acceptance                                                                                    |
| ------ | ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| M17.5a | not-started | Ship token-capable clients without enforcement | Native/web telemetry shows valid tokens while Auth/quota remains authoritative                |
| M17.5b | not-started | Review acceptance metrics                      | Supported versions meet the approved valid-token threshold and missing sources are understood |
| M17.5c | not-started | Restore server enforcement                     | `enforceAppCheck` and caller app verification return only after the gate passes               |
| M17.5d | not-started | Validate rejection and rollback                | Official clients pass, unregistered clients fail, and enforcement can be disabled promptly    |

## M17.6 Documentation and Evidence

| Ticket | Status      | Deliverable                        | Acceptance                                                                                      |
| ------ | ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| M17.6a | not-started | Update security/build/web runbooks | Registration, debug, rebuild, enforcement, monitoring, and rollback steps are current           |
| M17.6b | not-started | Run the release matrix             | Signed iOS, Play Android, production web, debug, CI, old, and unregistered clients are recorded |
| M17.6c | not-started | Record residual risk               | App Check limits, quota protection, replay decision, and operational ownership are explicit     |

## Validation Gates

1. All M16 Functions, rules, native, and web gates remain green.
2. Clean native prebuild/build succeeds for Android and iOS.
3. Auth, linking, reauthentication, privacy, and AI quota regression suites pass.
4. Cloud logs show valid Auth and App Check on supported signed/debug clients.
5. Unregistered clients are rejected only after staged enforcement; rollback is demonstrated.

## Tracking Protocol

1. M17 remains `not-started` until explicitly authorized.
2. Before changing code for a leaf ticket, set it to `in-progress` here and in `PROJECT_PLAN.md`.
3. Update scope and dependencies before expanding a ticket.
4. Mark tickets complete only after listed validation passes and record evidence in `PROJECT_PLAN.md`.
5. Update the roadmap and validation log at every parent-task transition.

## Out of Scope

- Changing M16 credit economics.
- Weakening Firebase Auth or caller-UID ownership.
- Enabling enforcement before supported clients prove valid tokens.
