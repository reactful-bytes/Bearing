import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";
import {
  AI_CREDITS_PER_BILLING_MONTH,
  AI_PLAN_TTL_MS,
  AiCreditAccount,
  AiCreditGrant,
  AiCreditTransactionRunner,
  AiPlanReservation,
  getBillingAnniversary,
  getDueBillingAnniversaries,
  getLatestBillingAnniversary,
  getNextBillingAnniversary,
  finalizeAiCredit,
  reconcileAiCredits,
  refundAiCredit,
  reserveAiCredit,
} from "./aiCredits";

const utc = (value: string): Date => new Date(value);
const iso = (dates: Date[]): string[] =>
  dates.map((date) => date.toISOString());

function createMemoryRunner(initialAccount?: AiCreditAccount): {
  run: AiCreditTransactionRunner;
  accounts: Map<string, AiCreditAccount>;
  grants: Map<string, AiCreditGrant>;
  plans: Map<string, AiPlanReservation>;
} {
  const accounts = new Map<string, AiCreditAccount>();
  const grants = new Map<string, AiCreditGrant>();
  const plans = new Map<string, AiPlanReservation>();
  if (initialAccount) accounts.set(initialAccount.userId, initialAccount);
  let queue = Promise.resolve();

  const run: AiCreditTransactionRunner = async (userId, operation) => {
    const previous = queue;
    let release = (): void => undefined;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    let stagedAccount: AiCreditAccount | undefined;
    const stagedGrants = new Map<string, AiCreditGrant>();
    const stagedPlans = new Map<string, AiPlanReservation>();
    try {
      const result = await operation({
        getAccount: async () => accounts.get(userId) ?? null,
        hasGrant: async (grantId) =>
          grants.has(grantId) || stagedGrants.has(grantId),
        getPlan: async (requestId) =>
          stagedPlans.get(`${userId}:${requestId}`) ??
          plans.get(`${userId}:${requestId}`) ??
          null,
        setAccount: (account) => {
          stagedAccount = account;
        },
        setGrant: (grantId, grant) => {
          stagedGrants.set(grantId, grant);
        },
        setPlan: (requestId, plan) => {
          stagedPlans.set(`${userId}:${requestId}`, plan);
        },
      });
      if (stagedAccount) accounts.set(userId, stagedAccount);
      for (const [grantId, grant] of stagedGrants) grants.set(grantId, grant);
      for (const [requestId, plan] of stagedPlans) plans.set(requestId, plan);
      return result;
    } finally {
      release();
    }
  };

  return { run, accounts, grants, plans };
}

function account(overrides: Partial<AiCreditAccount> = {}): AiCreditAccount {
  const createdAt = utc("2026-01-01T00:00:00.000Z");
  return {
    userId: "user-1",
    availableCredits: 10,
    reservedCredits: 0,
    totalGranted: 10,
    totalConsumed: 0,
    accrualStartedAt: createdAt,
    lastGrantedBillingAt: createdAt,
    activeReservationId: null,
    reservationExpiresAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("getBillingAnniversary", () => {
  const fixtures: Array<[string, number, string]> = [
    ["2026-01-01T12:34:56.789Z", 1, "2026-02-01T12:34:56.789Z"],
    ["2026-01-28T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2026-01-29T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2024-01-29T00:00:00.000Z", 1, "2024-02-29T00:00:00.000Z"],
    ["2026-01-30T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2026-01-31T00:00:00.000Z", 1, "2026-02-28T00:00:00.000Z"],
    ["2026-01-31T00:00:00.000Z", 2, "2026-03-31T00:00:00.000Z"],
    ["2024-02-29T00:00:00.000Z", 12, "2025-02-28T00:00:00.000Z"],
  ];

  for (const [start, offset, expected] of fixtures) {
    it(`anchors ${start} plus ${offset} month(s)`, () => {
      assert.equal(
        getBillingAnniversary(utc(start), offset)?.toISOString(),
        expected,
      );
    });
  }

  it("rejects invalid dates and offsets", () => {
    assert.equal(getBillingAnniversary(new Date("invalid"), 1), null);
    assert.equal(
      getBillingAnniversary(utc("2026-01-01T00:00:00.000Z"), -1),
      null,
    );
    assert.equal(
      getBillingAnniversary(utc("2026-01-01T00:00:00.000Z"), 1.5),
      null,
    );
  });
});

describe("getDueBillingAnniversaries", () => {
  it("returns every ungranted monthly anniversary in an annual paid period", () => {
    assert.deepEqual(
      iso(
        getDueBillingAnniversaries(
          utc("2026-01-31T00:00:00.000Z"),
          utc("2027-01-31T00:00:00.000Z"),
          utc("2026-01-31T00:00:00.000Z"),
          utc("2026-05-31T00:00:00.000Z"),
        ),
      ),
      [
        "2026-02-28T00:00:00.000Z",
        "2026-03-31T00:00:00.000Z",
        "2026-04-30T00:00:00.000Z",
        "2026-05-31T00:00:00.000Z",
      ],
    );
  });

  it("excludes the period-end boundary and future anniversaries", () => {
    assert.deepEqual(
      iso(
        getDueBillingAnniversaries(
          utc("2026-01-01T00:00:00.000Z"),
          utc("2026-04-01T00:00:00.000Z"),
          utc("2026-01-01T00:00:00.000Z"),
          utc("2027-01-01T00:00:00.000Z"),
        ),
      ),
      ["2026-02-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z"],
    );
  });

  it("returns no dates for missing, invalid, or reversed periods", () => {
    const valid = utc("2026-01-01T00:00:00.000Z");
    assert.deepEqual(getDueBillingAnniversaries(null, valid, valid, valid), []);
    assert.deepEqual(
      getDueBillingAnniversaries(new Date("invalid"), valid, valid, valid),
      [],
    );
    assert.deepEqual(
      getDueBillingAnniversaries(
        utc("2026-02-01T00:00:00.000Z"),
        valid,
        valid,
        valid,
      ),
      [],
    );
  });
});

describe("billing cursor helpers", () => {
  it("finds the latest anniversary without historical backfill", () => {
    assert.equal(
      getLatestBillingAnniversary(
        utc("2026-01-31T00:00:00.000Z"),
        utc("2027-01-31T00:00:00.000Z"),
        utc("2026-04-15T00:00:00.000Z"),
      ).toISOString(),
      "2026-03-31T00:00:00.000Z",
    );
  });

  it("finds the next anniversary strictly after the grant cursor", () => {
    assert.equal(
      getNextBillingAnniversary(
        utc("2026-01-31T00:00:00.000Z"),
        utc("2026-05-31T00:00:00.000Z"),
        utc("2026-02-28T00:00:00.000Z"),
      )?.toISOString(),
      "2026-03-31T00:00:00.000Z",
    );
  });
});

describe("reconcileAiCredits", () => {
  const activeSubscription = {
    status: "active" as const,
    periodStartAt: utc("2026-01-31T00:00:00.000Z"),
    periodEndAt: utc("2027-01-31T00:00:00.000Z"),
  };

  it("bootstraps exactly ten credits at rollout without historical backfill", async () => {
    const memory = createMemoryRunner();
    const result = await reconcileAiCredits(
      "user-1",
      activeSubscription,
      utc("2026-04-15T00:00:00.000Z"),
      memory.run,
    );

    assert.equal(result?.availableCredits, AI_CREDITS_PER_BILLING_MONTH);
    assert.equal(result?.totalGranted, AI_CREDITS_PER_BILLING_MONTH);
    assert.equal(
      result?.lastGrantedBillingAt.toISOString(),
      "2026-03-31T00:00:00.000Z",
    );
    assert.equal(memory.grants.size, 1);
  });

  it("adds every due anniversary and preserves rollover", async () => {
    const memory = createMemoryRunner(
      account({
        availableCredits: 7,
        totalGranted: 10,
        totalConsumed: 3,
        lastGrantedBillingAt: utc("2026-01-31T00:00:00.000Z"),
      }),
    );
    const result = await reconcileAiCredits(
      "user-1",
      activeSubscription,
      utc("2026-04-30T00:00:00.000Z"),
      memory.run,
    );

    assert.equal(result?.availableCredits, 37);
    assert.equal(result?.totalGranted, 40);
    assert.equal(memory.grants.size, 3);
  });

  it("is idempotent across repeated and concurrent reconciliation", async () => {
    const memory = createMemoryRunner(
      account({ lastGrantedBillingAt: utc("2026-01-31T00:00:00.000Z") }),
    );
    const reconcile = () =>
      reconcileAiCredits(
        "user-1",
        activeSubscription,
        utc("2026-02-28T00:00:00.000Z"),
        memory.run,
      );

    await Promise.all([reconcile(), reconcile(), reconcile()]);
    const repeated = await reconcile();

    assert.equal(repeated?.availableCredits, 20);
    assert.equal(repeated?.totalGranted, 20);
    assert.equal(memory.grants.size, 1);
  });

  it("does not bootstrap or accrue in grace or inactive states", async () => {
    const missing = createMemoryRunner();
    assert.equal(
      await reconcileAiCredits(
        "user-1",
        { ...activeSubscription, status: "in_grace_period" },
        utc("2026-02-28T00:00:00.000Z"),
        missing.run,
      ),
      null,
    );

    for (const status of ["in_grace_period", "expired", "canceled"] as const) {
      const memory = createMemoryRunner(account());
      const result = await reconcileAiCredits(
        "user-1",
        { ...activeSubscription, status },
        utc("2026-04-30T00:00:00.000Z"),
        memory.run,
      );
      assert.equal(result?.availableCredits, 10);
      assert.equal(memory.grants.size, 0);
    }
  });

  it("catches up when an inactive account becomes active again", async () => {
    const memory = createMemoryRunner(account());
    const result = await reconcileAiCredits(
      "user-1",
      {
        status: "active",
        periodStartAt: utc("2026-02-01T00:00:00.000Z"),
        periodEndAt: utc("2026-05-01T00:00:00.000Z"),
      },
      utc("2026-03-01T00:00:00.000Z"),
      memory.run,
    );

    assert.equal(result?.availableCredits, 30);
    assert.equal(memory.grants.size, 2);
  });

  it("rejects malformed stored counters", async () => {
    const memory = createMemoryRunner(account({ availableCredits: -1 }));
    await assert.rejects(
      reconcileAiCredits(
        "user-1",
        activeSubscription,
        utc("2026-02-01T00:00:00.000Z"),
        memory.run,
      ),
      /account is invalid/,
    );
  });
});

describe("AI credit reservations", () => {
  const now = utc("2026-02-15T00:00:00.000Z");

  it("reserves and consumes exactly one credit after finalization", async () => {
    const memory = createMemoryRunner(account());
    const reserved = await reserveAiCredit(
      "user-1",
      "request-1",
      "fingerprint-1",
      now,
      memory.run,
    );
    assert.deepEqual(reserved, { kind: "reserved", availableCredits: 9 });
    assert.equal(memory.accounts.get("user-1")?.reservedCredits, 1);

    const balance = await finalizeAiCredit(
      "user-1",
      "request-1",
      { promptVersion: 1 },
      now,
      memory.run,
    );
    assert.equal(balance, 9);
    assert.equal(memory.accounts.get("user-1")?.totalConsumed, 1);
    assert.equal(memory.accounts.get("user-1")?.reservedCredits, 0);
  });

  it("rejects zero balance and an active concurrent reservation", async () => {
    const empty = createMemoryRunner(
      account({ availableCredits: 0, totalGranted: 1, totalConsumed: 1 }),
    );
    await assert.rejects(
      reserveAiCredit("user-1", "request-1", "fingerprint", now, empty.run),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "resource-exhausted",
    );

    const memory = createMemoryRunner(account());
    await reserveAiCredit(
      "user-1",
      "request-1",
      "fingerprint-1",
      now,
      memory.run,
    );
    await assert.rejects(
      reserveAiCredit("user-1", "request-2", "fingerprint-2", now, memory.run),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "aborted",
    );
  });

  it("refunds failures once", async () => {
    const memory = createMemoryRunner(account());
    await reserveAiCredit(
      "user-1",
      "request-1",
      "fingerprint",
      now,
      memory.run,
    );
    await refundAiCredit("user-1", "request-1", now, memory.run);
    await refundAiCredit("user-1", "request-1", now, memory.run);

    assert.equal(memory.accounts.get("user-1")?.availableCredits, 10);
    assert.equal(memory.accounts.get("user-1")?.reservedCredits, 0);
    assert.equal(memory.plans.get("user-1:request-1")?.state, "refunded");
  });

  it("recovers an expired lease before reserving a new request", async () => {
    const memory = createMemoryRunner(account());
    await reserveAiCredit(
      "user-1",
      "stale-request",
      "stale-fingerprint",
      now,
      memory.run,
    );
    const later = new Date(now.getTime() + 3 * 60 * 1000);
    const result = await reserveAiCredit(
      "user-1",
      "new-request",
      "new-fingerprint",
      later,
      memory.run,
    );

    assert.deepEqual(result, { kind: "reserved", availableCredits: 9 });
    assert.equal(memory.plans.get("user-1:stale-request")?.state, "refunded");
  });

  it("replays completed matching requests and rejects mismatches", async () => {
    const memory = createMemoryRunner(account());
    await reserveAiCredit(
      "user-1",
      "request-1",
      "fingerprint",
      now,
      memory.run,
    );
    await finalizeAiCredit(
      "user-1",
      "request-1",
      { promptVersion: 1 },
      now,
      memory.run,
    );
    assert.deepEqual(
      await reserveAiCredit(
        "user-1",
        "request-1",
        "fingerprint",
        now,
        memory.run,
      ),
      {
        kind: "replay",
        availableCredits: 9,
        draft: { promptVersion: 1 },
        reservedAt: now,
      },
    );
    await assert.rejects(
      reserveAiCredit("user-1", "request-1", "different", now, memory.run),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument",
    );
  });

  it("sets 24-hour expiry and isolates matching request IDs by user", async () => {
    const memory = createMemoryRunner(account());
    memory.accounts.set("user-2", account({ userId: "user-2" }));
    await Promise.all([
      reserveAiCredit("user-1", "same", "first", now, memory.run),
      reserveAiCredit("user-2", "same", "second", now, memory.run),
    ]);

    assert.equal(memory.plans.size, 2);
    assert.equal(
      memory.plans.get("user-1:same")?.expiresAt.getTime(),
      now.getTime() + AI_PLAN_TTL_MS,
    );
  });
});
