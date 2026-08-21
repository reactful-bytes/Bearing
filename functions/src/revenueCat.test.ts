import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import {
  deleteRevenueCatCustomer,
  fetchRevenueCatSubscriber,
  mapRevenueCatSubscription,
  parseRevenueCatWebhookEvent,
  redactRevenueCatWebhookBody,
  verifyRevenueCatWebhook,
} from "./revenueCat";

describe("RevenueCat reconciliation", () => {
  it("keeps canceled paid-through access active without auto renewal", () => {
    const record = mapRevenueCatSubscription(
      "user-1",
      {
        entitlements: {
          premium: {
            product_identifier: "bearing_premium_monthly",
            purchase_date: "2026-07-01T00:00:00Z",
            expires_date: "2026-08-01T00:00:00Z",
          },
        },
        subscriptions: {
          bearing_premium_monthly: {
            store: "app_store",
            purchase_date: "2026-07-01T00:00:00Z",
            expires_date: "2026-08-01T00:00:00Z",
            unsubscribe_detected_at: "2026-07-20T00:00:00Z",
          },
        },
      },
      new Date("2026-07-31T00:00:00Z"),
    );

    assert.equal(record.status, "active");
    assert.equal(record.autoRenew, false);
    assert.equal(record.platform, "ios");
    assert.equal(
      record.createdAt.toDate().toISOString(),
      "2026-07-31T00:00:00.000Z",
    );
  });

  it("maps billing issues to grace-period access", () => {
    const record = mapRevenueCatSubscription(
      "user-1",
      {
        entitlements: {
          premium: {
            product_identifier: "bearing_premium_annual",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
        subscriptions: {
          bearing_premium_annual: {
            store: "play_store",
            expires_date: "2027-01-01T00:00:00Z",
            billing_issues_detected_at: "2026-07-30T00:00:00Z",
          },
        },
      },
      new Date("2026-07-31T00:00:00Z"),
    );

    assert.equal(record.status, "in_grace_period");
    assert.equal(record.platform, "android");
  });

  it("uses the verified webhook store when the entitlement product has no subscription key", () => {
    const record = mapRevenueCatSubscription(
      "user-1",
      {
        entitlements: {
          premium: {
            product_identifier: "bearing_premium_monthly:monthly-base-plan",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
        subscriptions: {
          bearing_premium_monthly: {
            store: "play_store",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
      },
      new Date("2026-07-31T00:00:00Z"),
      "premium",
      "PLAY_STORE",
    );

    assert.equal(record.platform, "android");
  });

  it("maps RevenueCat Test Store events to the configured development platform", () => {
    const record = mapRevenueCatSubscription(
      "user-1",
      {
        entitlements: {
          premium: {
            product_identifier: "rc_monthly",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
        subscriptions: {
          rc_monthly: {
            store: "test_store",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
      },
      new Date("2026-07-31T00:00:00Z"),
      "premium",
      undefined,
      "android",
    );

    assert.equal(record.platform, "android");
    assert.equal(record.revenueCatStore, "test_store");
  });

  it("fails closed for an invalid RevenueCat Test Store platform", () => {
    const record = mapRevenueCatSubscription(
      "user-1",
      {
        entitlements: {
          premium: {
            product_identifier: "rc_monthly",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
        subscriptions: {
          rc_monthly: { store: "test_store" },
        },
      },
      new Date("2026-07-31T00:00:00Z"),
      "premium",
      undefined,
      "android-development",
    );

    assert.equal(record.platform, "web");
  });

  it("uses the configured entitlement identifier and ignores other grants", () => {
    const record = mapRevenueCatSubscription(
      "user-1",
      {
        entitlements: {
          old_premium: {
            product_identifier: "old_product",
            expires_date: "2027-01-01T00:00:00Z",
          },
          membership: {
            product_identifier: "bearing_membership_monthly",
            expires_date: "2027-01-01T00:00:00Z",
          },
        },
      },
      new Date("2026-07-31T00:00:00Z"),
      "membership",
    );

    assert.equal(record.status, "active");
    assert.equal(record.productId, "bearing_membership_monthly");
  });

  it("fails closed when RevenueCat does not return the premium entitlement", () => {
    const record = mapRevenueCatSubscription("user-1", {});

    assert.equal(record.status, "expired");
    assert.equal(record.productId, "");
  });

  it("verifies authorization, raw-body HMAC, and timestamp", () => {
    const rawBody = Buffer.from('{"event":{"id":"event-1"}}');
    const timestamp = 1_785_456_000;
    const signature = createHmac("sha256", "signing-secret")
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest("hex");

    assert.equal(
      verifyRevenueCatWebhook(
        {
          method: "POST",
          headers: {
            authorization: "Bearer webhook-secret",
            "x-revenuecat-webhook-signature": `t=${timestamp},v1=${signature}`,
          },
          rawBody,
        },
        "Bearer webhook-secret",
        "signing-secret",
        timestamp,
      ),
      true,
    );
  });

  it("rejects RevenueCat anonymous customer IDs", () => {
    assert.throws(() =>
      parseRevenueCatWebhookEvent({
        event: { id: "event-1", app_user_id: "$RCAnonymousID:value" },
      }),
    );
  });

  it("redacts customer and transaction values from webhook diagnostics", () => {
    assert.deepEqual(
      redactRevenueCatWebhookBody({
        event: {
          app_user_id: "user-1",
          store: "PLAY_STORE",
          product_id: "bearing_premium_monthly",
          transaction_id: "transaction-1",
          entitlement_ids: ["premium"],
        },
      }),
      {
        event: {
          app_user_id: "[redacted]",
          store: "PLAY_STORE",
          product_id: "bearing_premium_monthly",
          transaction_id: "[redacted]",
          entitlement_ids: ["premium"],
        },
      },
    );
  });

  it("identifies a forbidden RevenueCat subscriber lookup without exposing the key", async () => {
    await assert.rejects(
      fetchRevenueCatSubscriber(
        "user-1",
        "secret-key",
        async () => new Response(null, { status: 403 }),
      ),
      (error: unknown) =>
        error instanceof Error &&
        error.message ===
          "RevenueCat subscriber lookup was forbidden. Verify REVENUECAT_SECRET_API_KEY is a valid secret API key for this RevenueCat project, then redeploy the webhook.",
    );
  });

  it("treats an already-deleted RevenueCat customer as success", async () => {
    let requestedUrl = "";
    let requestedMethod = "";
    await deleteRevenueCatCustomer(
      "user/1",
      "secret-key",
      async (input, init) => {
        requestedUrl = input.toString();
        requestedMethod = init?.method ?? "";
        return new Response(null, { status: 404 });
      },
    );

    assert.equal(requestedUrl.endsWith("/subscribers/user%2F1"), true);
    assert.equal(requestedMethod, "DELETE");
  });
});
