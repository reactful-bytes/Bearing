import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { AiCreditSubscription, getAiCreditStatus } from "./aiCreditStatus";

const subscription: AiCreditSubscription = {
  status: "active",
  periodStartAt: new Date("2026-01-01T00:00:00.000Z"),
  periodEndAt: new Date("2026-05-01T00:00:00.000Z"),
};

describe("getAiCreditStatus", () => {
  it("uses authenticated identity and returns the live RevenueCat balance", async () => {
    let balanceUserId = "";
    let subscriptionUserId = "";
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" }, data: { userId: "other-user" } } as {
        auth: { uid: string };
      },
      async (userId) => {
        balanceUserId = userId;
        return 17;
      },
      async (userId) => {
        subscriptionUserId = userId;
        return subscription;
      },
    );

    assert.equal(balanceUserId, "user-1");
    assert.equal(subscriptionUserId, "user-1");
    assert.deepEqual(result, { eligible: true, availableCredits: 17 });
  });

  it("allows grace spending and locks inactive subscribers", async () => {
    assert.deepEqual(
      await getAiCreditStatus(
        { auth: { uid: "user-1" } },
        async () => 4,
        async () => ({ ...subscription, status: "in_grace_period" }),
      ),
      { eligible: true, availableCredits: 4 },
    );
    assert.deepEqual(
      await getAiCreditStatus(
        { auth: { uid: "user-1" } },
        async () => 6,
        async () => ({ ...subscription, status: "expired" }),
      ),
      { eligible: false, availableCredits: 6 },
    );
  });

  it("rejects unauthenticated callers before looking up balance", async () => {
    let lookedUp = false;
    await assert.rejects(
      getAiCreditStatus({}, async () => {
        lookedUp = true;
        return 10;
      }),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unauthenticated",
    );
    assert.equal(lookedUp, false);
  });
});
