import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  EntitlementLookup,
  SubscriptionStatus,
  requirePremiumCaller,
} from "./entitlement";

const verifiedRequest = {
  auth: { uid: "user-1" },
};

function lookupReturning(status: SubscriptionStatus | null): EntitlementLookup {
  return async () => status;
}

describe("requirePremiumCaller", () => {
  it("allows active subscriptions", async () => {
    const caller = await requirePremiumCaller(
      verifiedRequest,
      lookupReturning("active"),
    );

    assert.deepEqual(caller, {
      uid: "user-1",
      subscriptionStatus: "active",
    });
  });

  it("allows subscriptions in a grace period", async () => {
    const caller = await requirePremiumCaller(
      verifiedRequest,
      lookupReturning("in_grace_period"),
    );

    assert.equal(caller.subscriptionStatus, "in_grace_period");
  });

  it("rejects expired, canceled, and missing subscriptions", async () => {
    for (const status of ["expired", "canceled", null] as const) {
      await assert.rejects(
        requirePremiumCaller(verifiedRequest, lookupReturning(status)),
        (error: unknown) =>
          error instanceof HttpsError && error.code === "permission-denied",
      );
    }
  });

  it("always looks up the verified caller instead of request data", async () => {
    let lookedUpUserId: string | null = null;
    const requestWithForgedTarget = {
      ...verifiedRequest,
      data: { userId: "other-user" },
    };

    await requirePremiumCaller(requestWithForgedTarget, async (userId) => {
      lookedUpUserId = userId;
      return "active";
    });

    assert.equal(lookedUpUserId, "user-1");
  });
});
