import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  AiCreditLock,
  AiCreditOperation,
  AiCreditOperationRepository,
  getAiCreditOperationIdentity,
  runAiCreditOperation,
} from "./aiCreditOperations";
import {
  RevenueCatV2RetryableError,
  RevenueCatVirtualCurrencyExhaustedError,
} from "./revenueCatV2";

function memoryRepository(): {
  repository: AiCreditOperationRepository;
  operations: Map<string, AiCreditOperation>;
  locks: Map<string, AiCreditLock>;
} {
  const operations = new Map<string, AiCreditOperation>();
  const locks = new Map<string, AiCreditLock>();
  let queue = Promise.resolve();
  const repository: AiCreditOperationRepository = {
    transact: async (operationId, userId, update) => {
      const previous = queue;
      let release = (): void => undefined;
      queue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        const { result, mutation } = update(
          operations.get(operationId) ?? null,
          locks.get(userId) ?? null,
        );
        if (mutation?.operation)
          operations.set(operationId, mutation.operation);
        if (mutation?.lock === null) locks.delete(userId);
        else if (mutation?.lock) locks.set(userId, mutation.lock);
        return result;
      } finally {
        release();
      }
    },
  };
  return { repository, operations, locks };
}

const now = new Date("2026-08-26T12:00:00.000Z");

describe("AI credit operation coordinator", () => {
  it("persists SHA-256 debit intent before the network call and replays completion", async () => {
    const memory = memoryRepository();
    let generated = 0;
    const transactionKeys: string[] = [];
    const execute = () =>
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => {
          generated += 1;
          return { plan: "draft" };
        },
        {
          debit: async (_userId, key) => {
            const operation = memory.operations.get(
              getAiCreditOperationIdentity("user-1", "request-1").operationId,
            );
            assert.equal(operation?.state, "debit_pending");
            transactionKeys.push(key);
          },
          refund: async () => undefined,
        },
        memory.repository,
        now,
      );

    assert.equal((await execute()).kind, "completed");
    assert.equal((await execute()).kind, "replay");
    assert.equal(generated, 1);
    assert.equal(transactionKeys.length, 1);
    assert.match(transactionKeys[0], /^[a-f0-9]{64}$/);
    const operation = [...memory.operations.values()][0];
    assert.equal(operation.state, "completed");
    assert.equal(operation.expiresAt.toISOString(), "2026-08-27T12:00:00.000Z");
  });

  it("rejects request-ID mismatch and concurrent spending", async () => {
    const memory = memoryRepository();
    let releaseDebit = (): void => undefined;
    const debitBlocked = new Promise<void>((resolve) => {
      releaseDebit = resolve;
    });
    const first = runAiCreditOperation(
      "user-1",
      "request-1",
      "fingerprint-1",
      async () => ({ plan: 1 }),
      { debit: async () => debitBlocked, refund: async () => undefined },
      memory.repository,
      now,
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-2",
        "fingerprint-2",
        async () => ({ plan: 2 }),
        { debit: async () => undefined, refund: async () => undefined },
        memory.repository,
        now,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "aborted",
    );
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "different",
        async () => ({ plan: 2 }),
        { debit: async () => undefined, refund: async () => undefined },
        memory.repository,
        now,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "invalid-argument",
    );
    releaseDebit();
    await first;
  });

  it("persists ambiguous debit and retries with the same key after the lease", async () => {
    const memory = memoryRepository();
    const keys: string[] = [];
    const transactions = {
      debit: async (_userId: string, key: string) => {
        keys.push(key);
        if (keys.length === 1) throw new RevenueCatV2RetryableError(null);
      },
      refund: async () => undefined,
    };
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => ({ plan: 1 }),
        transactions,
        memory.repository,
        now,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unavailable",
    );
    assert.equal([...memory.operations.values()][0].state, "debit_pending");
    await runAiCreditOperation(
      "user-1",
      "request-1",
      "fingerprint-1",
      async () => ({ plan: 1 }),
      transactions,
      memory.repository,
      new Date(now.getTime() + 121_000),
    );
    assert.equal(keys.length, 2);
    assert.equal(keys[0], keys[1]);
  });

  it("maps exhaustion and refunds generation failures once", async () => {
    const exhausted = memoryRepository();
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => ({ plan: 1 }),
        {
          debit: async () => {
            throw new RevenueCatVirtualCurrencyExhaustedError();
          },
          refund: async () => undefined,
        },
        exhausted.repository,
        now,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "resource-exhausted",
    );
    assert.equal([...exhausted.operations.values()][0].state, "exhausted");

    const failed = memoryRepository();
    let refunds = 0;
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => {
          throw new Error("generation failed");
        },
        {
          debit: async () => undefined,
          refund: async () => {
            refunds += 1;
          },
        },
        failed.repository,
        now,
      ),
      /generation failed/,
    );
    assert.equal(refunds, 1);
    assert.equal([...failed.operations.values()][0].state, "refunded");
  });

  it("recovers a stale debited operation by refunding without generation", async () => {
    const memory = memoryRepository();
    const identity = getAiCreditOperationIdentity("user-1", "request-1");
    memory.operations.set(identity.operationId, {
      id: identity.operationId,
      userId: "user-1",
      requestId: "request-1",
      inputFingerprint: "fingerprint-1",
      state: "debited",
      debitIdempotencyKey: identity.debitIdempotencyKey,
      refundIdempotencyKey: identity.refundIdempotencyKey,
      draft: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 86_400_000),
    });
    memory.locks.set("user-1", {
      operationId: identity.operationId,
      leaseExpiresAt: new Date(now.getTime() - 1),
    });
    let generated = false;
    let refundKey = "";
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => {
          generated = true;
          return { plan: 1 };
        },
        {
          debit: async () => undefined,
          refund: async (_userId, key) => {
            refundKey = key;
          },
        },
        memory.repository,
        new Date(now.getTime() + 121_000),
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "internal",
    );
    assert.equal(generated, false);
    assert.equal(refundKey, identity.refundIdempotencyKey);
    assert.equal(
      memory.operations.get(identity.operationId)?.state,
      "refunded",
    );
  });

  it("persists an ambiguous refund and retries the same key after the lease", async () => {
    const memory = memoryRepository();
    const refundKeys: string[] = [];
    const transactions = {
      debit: async () => undefined,
      refund: async (_userId: string, key: string) => {
        refundKeys.push(key);
        if (refundKeys.length === 1) throw new RevenueCatV2RetryableError(503);
      },
    };
    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => {
          throw new Error("generation failed");
        },
        transactions,
        memory.repository,
        now,
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "unavailable",
    );
    assert.equal([...memory.operations.values()][0].state, "refund_pending");

    await assert.rejects(
      runAiCreditOperation(
        "user-1",
        "request-1",
        "fingerprint-1",
        async () => ({ plan: 1 }),
        transactions,
        memory.repository,
        new Date(now.getTime() + 121_000),
      ),
      (error: unknown) =>
        error instanceof HttpsError && error.code === "internal",
    );
    assert.equal(refundKeys.length, 2);
    assert.equal(refundKeys[0], refundKeys[1]);
    assert.equal([...memory.operations.values()][0].state, "refunded");
  });
});
