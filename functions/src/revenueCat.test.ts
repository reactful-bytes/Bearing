import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import {
  deleteRevenueCatCustomer,
  mapRevenueCatSubscription,
  parseRevenueCatWebhookEvent,
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
            store: "APP_STORE",
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
            store: "PLAY_STORE",
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
