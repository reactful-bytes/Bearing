# Observability and Telemetry

## Scope

Bearing emits optional product outcome events through the authenticated `recordTelemetryEvent`
callable. Consent is device-local, defaults off, and can be changed under
Profile > Privacy. Consent is scoped to the signed-in account on that installation. The client and
server independently enforce the same event and property allowlist.

The callable writes structured `telemetry_event` entries to Cloud Logging. The custom payload does
not contain a Firebase UID, email, user content, calendar names or IDs, native event IDs, locations,
tokens, link keys, or raw errors. Telemetry delivery is best effort and never blocks a product
action. The callable is authenticated, so standard Cloud Run request logs can still contain
platform request metadata; the custom `telemetry_event` payload is identity-free, not anonymous
transport.

## Event Catalog

| Event                         | Properties                    | Product question                              |
| ----------------------------- | ----------------------------- | --------------------------------------------- |
| `premium_paywall_viewed`      | `feature`                     | Which fixed premium entry point is reached?   |
| `ai_goal_plan_result`         | `outcome`                     | Does AI planning complete successfully?       |
| `auth_result`                 | `operation`, `outcome`        | Do signed-in account link/reset actions work? |
| `calendar_permission_result`  | `outcome`                     | Can users grant native calendar access?       |
| `calendar_publication_result` | `operation`, `outcome`        | Are requested native publications succeeding? |
| `calendar_export_result`      | `action`, `format`, `outcome` | Are portability workflows succeeding?         |
| `premium_purchase_started`    | `period`                      | Which fixed billing period reaches checkout?  |
| `premium_purchase_result`     | `period`, `outcome`           | Does store checkout succeed or get canceled?  |
| `premium_restore_result`      | `outcome`                     | Do store restores complete?                   |
| `premium_activation_result`   | `source`, `outcome`           | Does Firestore entitlement activate in time?  |

Unknown names, extra keys, arbitrary strings, and unsupported enum values are rejected. Changes to
this catalog require matching client and Functions validators, tests for forbidden properties, and
this document.

## Cloud Logging Queries

The Functions v2 service runs on Cloud Run. Start all product-event queries with:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="recordtelemetryevent"
jsonPayload.message="telemetry_event"
```

Append one of these filters for a dashboard panel:

```text
jsonPayload.name="premium_paywall_viewed"
jsonPayload.name="ai_goal_plan_result"
jsonPayload.name="calendar_publication_result"
jsonPayload.name="calendar_export_result"
jsonPayload.name="premium_purchase_started"
jsonPayload.name="premium_purchase_result"
jsonPayload.name="premium_restore_result"
jsonPayload.name="premium_activation_result"
```

For failures, append:

```text
jsonPayload.properties.outcome="failure"
```

Create log-based counter metrics grouped only by the allowlisted properties. Do not add UID,
request IP, device advertising ID, email, free text, or raw exception labels.

Account deletion is a server-owned operational event because a successfully deleted client can no
longer authenticate a telemetry request. Query it separately:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="deleteuseraccount"
jsonPayload.message="account_deletion_result"
```

AI-credit reliability logging covers V2 balance reads, one-unit debits/refunds, and temporary
operation recovery. RevenueCat remains the balance, grant, and transaction authority. Logs must
not add UID, request ID, idempotency key, fingerprint, prompt, draft, product ID, token, provider
body, or raw error fields.

## Dashboards

Create one product dashboard and one reliability dashboard in the production project.

Product dashboard:

1. Premium entry views by `feature`.
2. Purchase starts and results by `period`, excluding canceled outcomes from failures.
3. Firestore activation success/delay by purchase or restore source.
4. Restore success rate.
5. AI goal-plan success rate: successes divided by all AI outcomes.
6. Calendar permission outcomes by result.
7. Calendar publication success rate by operation.
8. Export outcomes by format and action.

Reliability dashboard:

1. Cloud Run request count, 5xx rate, and p50/p95 latency for every callable service.
2. Function instance count, cold starts, and max-instance saturation.
3. AI outcome failures and `generateGoalPlanDraft` latency.
4. Firestore read/write/error metrics and quota utilization.
5. AI-credit debit/refund outcomes, exhaustion, and stale-operation/lock recovery.
6. Backup workflow recency and billing-budget status.
7. Account deletion success rate from the server operational event.
8. RevenueCat webhook 4xx/5xx, latency, and duplicate-delivery trend.

Purchase telemetry reports client workflow outcomes, while Firestore activation confirms the
server-owned entitlement became visible. Do not infer authorization from client telemetry or
RevenueCat `CustomerInfo`.

## Alerts

Use at least two notification channels and route warnings to the launch operator. Page only when a
minimum volume protects against noisy percentages.

| Signal                            | Threshold                        | Window     | Minimum volume | Severity     |
| --------------------------------- | -------------------------------- | ---------- | -------------- | ------------ |
| Callable 5xx rate                 | greater than 5%                  | 10 minutes | 20 requests    | page         |
| Callable p95 latency              | greater than 8 seconds           | 15 minutes | 20 requests    | warning      |
| AI failure rate                   | at least 20%                     | 30 minutes | 10 outcomes    | warning      |
| Calendar publication failure rate | at least 10%                     | 30 minutes | 20 outcomes    | warning      |
| Premium activation delayed        | at least 5%                      | 30 minutes | 20 outcomes    | page         |
| RevenueCat webhook 5xx            | greater than 2%                  | 10 minutes | 10 requests    | page         |
| Account deletion failure          | at least 3 failures              | 60 minutes | 3 outcomes     | page         |
| AI credit exhaustion spike        | greater than 25 requests         | 10 minutes | 25 requests    | warning      |
| Firestore quota                   | at least 80%                     | 15 minutes | not applicable | warning      |
| Daily backup missing              | no successful export in 30 hours | rolling    | not applicable | page         |
| Monthly cloud spend               | 50%, 80%, 100% of budget         | monthly    | not applicable | warning/page |

Optional telemetry is consent-dependent. Never alert on an absence or decline of product events.

## Privacy and Operations

- Keep product-event logs for 30 days unless the published privacy policy states a shorter period.
- Restrict log and dashboard access to production operators with least-privilege IAM.
- Review access quarterly and after team changes.
- Do not export product-event logs to advertising, attribution, or data-broker systems.
- Treat any accidental sensitive property as a privacy incident: disable the producer, restrict
  access, delete affected log entries where supported, document scope, and update both validators.
- Reconcile this event inventory with store privacy disclosures before every release.

## Activation Handoff

Repository implementation is complete when mobile and Functions tests pass. The release owner must
still deploy Functions, migrate TTL to `aiCreditOperations.expiresAt`, create log-based metrics, dashboards, budget alerts,
and notification channels in staging first, then production. App Check remains deferred to M17 and
must not be enforced before coordinated native/web token acceptance. Record screenshots or exported
policies plus one synthetic alert delivery in the release evidence folder. Credentials and live
cloud-console acceptance are intentionally outside repository automation.
