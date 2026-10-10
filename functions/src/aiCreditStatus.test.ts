import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { getAiCreditStatus } from "./aiCreditStatus";

describe("getAiCreditStatus", () => {
  it("uses authenticated identity and returns the live RevenueCat balance", async () => {
    let balanceUserId = "";
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" }, data: { userId: "other-user" } } as {
        auth: { uid: string };
      },
      async (userId) => {
        balanceUserId = userId;
        return 17;
      },
    );

    assert.equal(balanceUserId, "user-1");
    assert.deepEqual(result, {
      eligible: true,
      availableCredits: 17,
      welcomeMessageEligible: false,
    });
  });

  it("uses only a positive live balance for eligibility without a subscription lookup", async () => {
    for (const availableCredits of [0, 1, 6]) {
      assert.deepEqual(
        await getAiCreditStatus(
          { auth: { uid: "user-1" } },
          async () => availableCredits,
        ),
        {
          eligible: availableCredits > 0,
          availableCredits,
          welcomeMessageEligible: false,
        },
      );
    }
  });

  it("identifies welcome-message eligibility from the grant marker", async () => {
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" } },
      async () => 1,
      async (userId) => ({
        granted: userId === "user-1",
        messageDismissed: false,
      }),
    );

    assert.deepEqual(result, {
      eligible: true,
      availableCredits: 1,
      welcomeMessageEligible: true,
    });
  });

  it("returns permanent welcome-message dismissal state", async () => {
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" } },
      async () => 4,
      async () => ({ granted: true, messageDismissed: true }),
    );

    assert.deepEqual(result, {
      eligible: true,
      availableCredits: 4,
      welcomeMessageEligible: false,
    });
  });

  it("keeps live credit status available when the welcome marker cannot be read", async () => {
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" } },
      async () => 1,
      async () => {
        throw new Error("profile unavailable");
      },
    );

    assert.deepEqual(result, {
      eligible: true,
      availableCredits: 1,
      welcomeMessageEligible: false,
    });
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
