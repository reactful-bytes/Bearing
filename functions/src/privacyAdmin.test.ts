import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_CREDIT_QUERY_COLLECTIONS,
  createUserDataAdminReader,
  deleteUserDataWithProcessorCleanup,
} from "./privacyAdmin";

describe("admin privacy deletion", () => {
  it("includes temporary credit operations in caller-scoped lifecycle queries", () => {
    assert.deepEqual(AI_CREDIT_QUERY_COLLECTIONS, ["aiCreditOperations"]);
  });

  it("adds the live RevenueCat balance to local lifecycle data", async () => {
    const requestedUserIds: string[] = [];
    const reader = createUserDataAdminReader(
      { apiKey: "v2-key", projectId: "project", currencyCode: "AIC" },
      async (userId) => {
        requestedUserIds.push(userId);
        return {
          userId,
          profile: null,
          subscription: null,
          aiCreditLock: null,
          aiCreditOperations: [],
          events: [],
          goals: [],
          goalSteps: [],
          notes: [],
          tasks: [],
        };
      },
      async (userId) => {
        requestedUserIds.push(userId);
        return { code: "AIC", balance: 7 };
      },
    );

    assert.equal((await reader("user-1")).aiCreditBalance, 7);
    assert.deepEqual(requestedUserIds, ["user-1", "user-1"]);
  });

  it("deletes processor data before local account data", async () => {
    const operations: string[] = [];

    await deleteUserDataWithProcessorCleanup(
      "user-1",
      async () => {
        operations.push("processor");
      },
      async () => {
        operations.push("local");
      },
    );

    assert.deepEqual(operations, ["processor", "local"]);
  });

  it("preserves local account data when processor deletion fails", async () => {
    let localDeletionStarted = false;

    await assert.rejects(
      deleteUserDataWithProcessorCleanup(
        "user-1",
        async () => {
          throw new Error("processor unavailable");
        },
        async () => {
          localDeletionStarted = true;
        },
      ),
      /processor unavailable/,
    );

    assert.equal(localDeletionStarted, false);
  });
});
