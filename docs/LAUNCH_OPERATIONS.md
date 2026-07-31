# Launch Operations

## Ownership

Fill these before production rollout. One person may hold multiple roles, but every role needs a
primary, backup, timezone, and reachable escalation channel.

| Role                  | Primary      | Backup       | Escalation channel |
| --------------------- | ------------ | ------------ | ------------------ |
| Launch commander      | `[REQUIRED]` | `[REQUIRED]` | `[REQUIRED]`       |
| Mobile release        | `[REQUIRED]` | `[REQUIRED]` | `[REQUIRED]`       |
| Firebase/reliability  | `[REQUIRED]` | `[REQUIRED]` | `[REQUIRED]`       |
| Billing/subscriptions | `[REQUIRED]` | `[REQUIRED]` | `[REQUIRED]`       |
| Privacy/security      | `[REQUIRED]` | `[REQUIRED]` | `[REQUIRED]`       |
| Customer support      | `[REQUIRED]` | `[REQUIRED]` | `[REQUIRED]`       |

## Staged Rollout

Advance through 5%, 25%, 50%, and 100%. Hold each gate for at least 24 hours and cover one daily
backup plus the operator's daily check. Apple release controls may not expose identical percentages;
use the closest supported phased-release stage and record the actual audience.

At each gate record version/builds, start/end time, install/update count, crash and ANR metrics,
callable 5xx/p95, purchase and activation outcomes, RevenueCat webhook failures, AI failures,
Firestore quota, backup recency, cloud spend, support volume, privacy requests, known incidents, and
the named advance/hold/rollback decision.

Halt immediately for any of these conditions:

- confirmed cross-account access, secret exposure, unauthorized Premium access, data loss, or
  deletion of the wrong account;
- any severity-1 incident or an unresolved severity-2 incident affecting a core path;
- callable 5xx above 5% for 10 minutes with at least 20 requests;
- purchase succeeds but Firestore activation is delayed in at least 5% of 20 purchase/restore
  outcomes, or canonical webhook processing repeatedly fails;
- account deletion fails at least three times in 60 minutes;
- crash-free users below 99.5%, an Android user-perceived ANR above the current Play bad-behavior
  threshold, or a material regression from beta evidence;
- no successful Firestore export within 30 hours, Firestore quota at 80%, or cloud spend reaching
  the approved hard escalation threshold;
- store, legal, privacy, security, or support owner requests a hold.

Do not average away platform-specific failures. A failed platform holds that platform even if the
other remains healthy.

## Daily Launch Check

- [ ] Review Apple and Google crashes, ANRs, install failures, ratings, and review alerts.
- [ ] Review Cloud Run request count, 5xx, p95, saturation, App Check rejection, and Firestore quota.
- [ ] Reconcile purchase starts/results, activation delay, restore results, RevenueCat webhook
      delivery, and a sample of canonical subscription documents without copying identifiers.
- [ ] Review AI outcome failures, latency, quota, safety reports, and Gemini cost.
- [ ] Confirm latest backup, workflow result, retention, and absence of unresolved restore alerts.
- [ ] Review cloud budget, store proceeds anomalies, and unexpected instance growth.
- [ ] Triage support volume, ratings, subscription issues, privacy requests, and accessibility reports.
- [ ] Review open incidents and prior-day actions, then record advance/hold decision.

## Incident Runbook

1. Declare severity, start an incident record, assign commander, operations lead, communications
   lead, and scribe. Use timestamps in UTC.
2. Protect users first: halt rollout, disable affected backend entry points or product configuration
   where approved, preserve evidence, and avoid destructive recovery guesses.
3. Establish scope by platform, version, account cohort, service, region, and first known occurrence.
   Do not place user content, tokens, receipts, or secrets in the incident channel.
4. Apply the smallest reversible mitigation, validate it in staging or a bounded production probe,
   and monitor the original signal.
5. Notify privacy/security, stores, processors, users, or regulators according to the approved legal
   decision. Support copy must state known facts and avoid promising recovery or refunds prematurely.
6. Close only after metrics recover, affected records are reconciled, user remediation exists, and
   the commander assigns a blameless follow-up with owner and due date.

Severity 1 includes active security/privacy compromise, cross-account access, broad data loss, or
unusable launch. Severity 2 includes major core-path or billing failure without a workaround.
Severity 3 includes bounded degradation with a documented workaround.

## Rollback Runbook

1. Halt the store rollout and preserve the affected build, source SHA, logs, and decision record.
2. For backend regressions, redeploy the last verified Functions/Rules/index bundle from its tagged
   source and rerun authorization plus critical callable probes.
3. For native regressions, choose the store-supported stop/phased rollback path or submit a higher
   version built from the last verified source. Store build numbers are never reused.
4. Bearing does not currently ship an approved over-the-air update channel. Do not introduce an OTA
   emergency path during an incident without security, privacy, and release review.
5. Reconcile writes made by the affected version before resuming. Never restore a broad backup over
   healthy production data without the recovery runbook and explicit incident approval.
6. Resume from the 5% gate after a fixed candidate passes the full quality, sandbox, native, and
   regression checks.

## Privacy Runbook

Use the request and deletion-recovery procedures in `LEGAL_RELEASE_CHECKLIST.md`. Escalate suspected
sensitive logging, unauthorized data access, processor deletion failure, child-data requests,
regulator contact, or deadline risk immediately. Freeze deletion only when legally approved; do not
restore a deleted Firebase account to simplify support. Record minimum request metadata and retain
it only under the approved compliance schedule.

## Subscription Runbook

1. Confirm platform, product, approximate purchase time, Firebase account email, and store-provided
   transaction reference through an approved channel. Never request passwords, full card details,
   API keys, signed receipts in chat, or screenshots containing unrelated purchases.
2. Check store transaction state, RevenueCat canonical subscriber, webhook delivery, event receipt,
   and Firestore subscription in that order.
3. If store payment succeeded but reconciliation failed, retry the RevenueCat webhook or deploy the
   backend correction; never grant access by client mutation.
4. Direct cancellation and refund requests to Apple or Google policy paths. Explain paid-through
   access and that deleting Bearing does not cancel the store subscription.
5. For restore ownership conflicts, follow the approved one-purchase/one-Bearing-account transfer
   policy and document the decision without exposing another account's identity.

## Support Runbook

Triage as account/auth, data/export/deletion, calendar/device, billing, AI, reliability, accessibility,
or feedback. Capture app version, platform/OS, reproducible steps, expected/observed behavior, time,
and consent for diagnostic follow-up. Remove unnecessary personal content. Severity-1/2 reports,
privacy deadlines, payment-without-access, and accessibility blockers receive immediate owner
escalation; all others receive an owner and target response time from the approved support policy.

## Launch Reviews

Complete the same template at day 7 and day 30:

```text
Review date and participants:
Versions and rollout stages covered:
Reliability, crashes, ANRs, latency, and quota:
Premium funnel, activation delay, restores, refunds, and revenue:
AI success, latency, safety, and cost:
Backup/restore health and security/privacy events:
Support volume, ratings, feedback themes, and accessibility:
Store listing and regional pricing accuracy:
What worked / what failed / accepted risk:
Follow-up item, severity, owner, due date, and verification:
Go-forward decision and approver:
```

## Maintenance Cadence

| Cadence                   | Required review                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Weekly during first month | Store vitals/reviews, support, billing reconciliation, AI and cloud cost, open incidents                                         |
| Monthly                   | Dependencies/security advisories, SDK compatibility, budgets, backup recency, restore sample, store policy changes               |
| Quarterly                 | Secret rotation/access, processor inventory and DPAs, legal/store disclosures, disaster-recovery drill, accessibility regression |
| Every native release      | Full quality gate, current iOS/Android matrix, subscriptions sandbox, export/deletion, performance, legal links and listing      |
| Annually                  | Terms/privacy approval, retention and rights process, threat model, credential custody, pricing/market strategy                  |

M13 remains a manual handoff until live rollout records, daily checks, named owners, 7/30-day reviews,
and recurring calendar evidence exist. This runbook is the executable template, not evidence that a
launch occurred.
