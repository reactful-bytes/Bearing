import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import { AiCreditAccount, AiCreditSubscription } from "./aiCredits";
import { getAiCreditStatus } from "./aiCreditStatus";

const utc = (value: string): Date => new Date(value);

function account(availableCredits: number): AiCreditAccount {
  const createdAt = utc("2026-01-01T00:00:00.000Z");
  return {
    userId: "user-1",
    availableCredits,
    reservedCredits: 0,
    totalGranted: availableCredits,
    totalConsumed: 0,
    accrualStartedAt: createdAt,
    lastGrantedBillingAt: utc("2026-02-01T00:00:00.000Z"),
    activeReservationId: null,
    reservationExpiresAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

const subscription: AiCreditSubscription = {
  status: "active",
  periodStartAt: utc("2026-01-01T00:00:00.000Z"),
  periodEndAt: utc("2026-05-01T00:00:00.000Z"),
};

describe("getAiCreditStatus", () => {
  it("uses authenticated identity and returns active balance and next grant", async () => {
    let lookedUpUserId = "";
    let reconciledUserId = "";
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" }, data: { userId: "other-user" } } as {
        auth: { uid: string };
      },
      async (userId) => {
        lookedUpUserId = userId;
        return subscription;
      },
      async (userId) => {
        reconciledUserId = userId;
        return account(17);
      },
      utc("2026-02-15T00:00:00.000Z"),
    );

    assert.equal(lookedUpUserId, "user-1");
    assert.equal(reconciledUserId, "user-1");
    assert.deepEqual(result, {
      eligible: true,
      availableCredits: 17,
      nextGrantAt: "2026-03-01T00:00:00.000Z",
    });
  });

  it("allows grace spending but does not advertise a grant", async () => {
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" } },
      async () => ({ ...subscription, status: "in_grace_period" }),
      async () => account(4),
    );

    assert.deepEqual(result, {
      eligible: true,
      availableCredits: 4,
      nextGrantAt: null,
    });
  });

  it("retains an inactive balance while locking eligibility", async () => {
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" } },
      async () => ({ ...subscription, status: "expired" }),
      async () => account(6),
    );

    assert.deepEqual(result, {
      eligible: false,
      availableCredits: 6,
      nextGrantAt: null,
    });
  });

  it("returns zero when no credit account exists", async () => {
    const result = await getAiCreditStatus(
      { auth: { uid: "user-1" } },
      async () => ({ status: null, periodStartAt: null, periodEndAt: null }),
      async () => null,
    );

    assert.deepEqual(result, {
      eligible: false,
      availableCredits: 0,
      nextGrantAt: null,
    });
  });

  it("rejects unauthenticated callers", async () => {
    await assert.rejects(
      getAiCreditStatus(
        {},
        async () => subscription,
        async () => account(10),
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unauthenticated",
    );
  });
});
